import { parseAllDocuments, stringify } from 'yaml'
import {
  claimState,
  createdAt,
  deploymentPods,
  deploymentStatus,
  findObject,
  listObjects,
  namespaces,
  newPod,
  podView,
  reconcile,
} from './cluster'
import { jsonpath } from './jsonpath'
import { curl, nslookup, wget, type Origin, type Output } from './net'
import {
  allEvents,
  describeClaim,
  describeConfig,
  describeDeployment,
  describeGeneric,
  describeIngress,
  describeNode,
  describePod,
  describeReplicaSet,
  describeService,
  endpointsItem,
  nodeItem,
  objectItem,
  podItem,
  rsItem,
  sliceItem,
  type ClusterEvent,
  type Item,
} from './printers'
import {
  KINDS,
  applyObject,
  jsonPatch,
  kindInfo,
  mergePatch,
  qualified,
  revisions,
  strategicMerge,
  updateObject,
  type KindInfo,
} from './resources'
import type {
  Cluster,
  Container,
  Deployment,
  EnvVar,
  Ingress,
  Labels,
  PodRecord,
  Resource,
  ResourceKind,
  Secret,
} from './types'
import { clone, cpuMillis, humanAge, isoAt, labelText, memoryMi, table, toBase64 } from './util'
import { CLUSTER_NAME } from './world'

/**
 * kubectl for the pretend cluster. Output follows real kubectl 1.35 against
 * an AKS 1.34 API server as closely as the lab needs: tables, describe text,
 * the API server's error messages and exit codes.
 */

export interface ShellContext {
  cluster: Cluster
  files: Record<string, string>
}

export interface KubectlResult extends Output {
  /** The command changed desired state - the controllers must run. */
  mutated?: boolean
}

const ok = (stdout: string, mutated = false): KubectlResult => ({
  stdout: stdout && !stdout.endsWith('\n') ? `${stdout}\n` : stdout,
  stderr: '',
  exitCode: 0,
  mutated,
})
const fail = (stderr: string, exitCode = 1, stdout = ''): KubectlResult => ({
  stdout,
  stderr,
  exitCode,
})

/* ---------- argument parsing ---------- */

const VALUE_FLAGS = new Set([
  'n',
  'namespace',
  'o',
  'output',
  'l',
  'selector',
  'f',
  'filename',
  'c',
  'container',
  'image',
  'replicas',
  'type',
  'to-revision',
  'revision',
  'sort-by',
  'field-selector',
  'tail',
  'since',
  'limits',
  'requests',
  'from',
  'keys',
  'port',
  'target-port',
  'name',
  'restart',
  'docker-server',
  'docker-username',
  'docker-password',
  'docker-email',
  'from-literal',
  'from-file',
  'timeout',
  'for',
  'labels',
  'env',
  'class',
  'rule',
  'tcp',
  'context',
  'cluster',
  'user',
  'grace-period',
  'patch',
  'protocol',
  'containers',
  'resource-version',
  'cascade',
  'kubeconfig',
])

interface Args {
  pos: string[]
  values: Map<string, string[]>
  bools: Set<string>
  after: string[] | null
}

function parseArgs(args: string[], extraValue: string[] = []): Args {
  const valueFlags = new Set([...VALUE_FLAGS, ...extraValue])
  const out: Args = { pos: [], values: new Map(), bools: new Set(), after: null }
  const put = (name: string, value: string) =>
    out.values.set(name, [...(out.values.get(name) ?? []), value])
  for (let index = 0; index < args.length; index++) {
    const arg = args[index]
    if (arg === '--') {
      out.after = args.slice(index + 1)
      break
    }
    if (arg.startsWith('--') && arg.length > 2) {
      const eq = arg.indexOf('=')
      if (eq > 0) put(arg.slice(2, eq), arg.slice(eq + 1))
      else if (valueFlags.has(arg.slice(2)) && index + 1 < args.length)
        put(arg.slice(2), args[++index])
      else out.bools.add(arg.slice(2))
    } else if (arg.startsWith('-') && arg.length > 1 && !/^-\d/.test(arg)) {
      const letters = arg.slice(1)
      if (valueFlags.has(letters[0])) {
        if (letters.length > 1) put(letters[0], letters.slice(1).replace(/^=/, ''))
        else if (index + 1 < args.length) put(letters[0], args[++index])
        else out.bools.add(letters[0])
      } else for (const letter of letters) out.bools.add(letter)
    } else out.pos.push(arg)
  }
  return out
}

const value = (args: Args, ...names: string[]) => {
  for (const name of names) {
    const list = args.values.get(name)
    if (list?.length) return list[list.length - 1]
  }
  return undefined
}
const values = (args: Args, name: string) => args.values.get(name) ?? []
const has = (args: Args, ...names: string[]) => names.some((name) => args.bools.has(name))

const nsOf = (ctx: ShellContext, args: Args) =>
  value(args, 'n', 'namespace') ?? ctx.cluster.namespace
const allNs = (args: Args) => has(args, 'A', 'all-namespaces')

/* ---------- selectors ---------- */

type Requirement = (labels: Labels) => boolean

function parseSelector(text: string | undefined): Requirement | null {
  if (!text) return null
  const parts = text.match(/[^,()]+(?:\([^)]*\))?/g) ?? []
  const checks: Requirement[] = parts.map((raw) => {
    const part = raw.trim()
    let match = /^([\w./-]+)\s+(in|notin)\s+\(([^)]*)\)$/.exec(part)
    if (match) {
      const options = match[3].split(',').map((entry) => entry.trim())
      const key = match[1]
      return match[2] === 'in'
        ? (labels) => options.includes(labels[key])
        : (labels) => !options.includes(labels[key])
    }
    match = /^([\w./-]+)\s*(==|=|!=)\s*([\w./-]*)$/.exec(part)
    if (match) {
      const [, key, op, wanted] = match
      return op === '!=' ? (labels) => labels[key] !== wanted : (labels) => labels[key] === wanted
    }
    if (part.startsWith('!')) return (labels) => !(part.slice(1) in labels)
    return (labels) => part in labels
  })
  return (labels) => checks.every((check) => check(labels))
}

/* ---------- items ---------- */

function itemsOf(ctx: ShellContext, info: KindInfo, namespace: string | null): Item[] {
  const { cluster } = ctx
  const inNs = (ns: string | undefined) => namespace === null || ns === namespace
  switch (info.kind) {
    case 'Pod':
      return cluster.pods.filter((pod) => inNs(pod.namespace)).map((pod) => podItem(cluster, pod))
    case 'ReplicaSet':
      return cluster.replicaSets.filter((rs) => inNs(rs.namespace)).map((rs) => rsItem(cluster, rs))
    case 'Endpoints':
      return listObjects(cluster, 'Service', namespace).map((service) =>
        endpointsItem(cluster, service),
      )
    case 'EndpointSlice':
      return listObjects(cluster, 'Service', namespace)
        .filter((service) => service.spec.selector)
        .map((service) => sliceItem(cluster, service))
    case 'Node':
      return cluster.nodes.map((node) => nodeItem(cluster, node))
    case 'PersistentVolume':
      return listObjects(cluster, 'PersistentVolumeClaim')
        .map((claim) => ({ claim, state: claimState(cluster, claim) }))
        .filter(({ state }) => state.phase === 'Bound')
        .map(({ claim, state }) => ({
          info,
          name: state.volumeName ?? '',
          labels: {},
          created: createdAt(claim),
          header: () => [
            'NAME',
            'CAPACITY',
            'ACCESS MODES',
            'RECLAIM POLICY',
            'STATUS',
            'CLAIM',
            'STORAGECLASS',
            'VOLUMEATTRIBUTESCLASS',
            'REASON',
            'AGE',
          ],
          row: () => [
            state.volumeName ?? '',
            claim.spec.resources?.requests?.storage ?? '',
            'RWO',
            'Delete',
            'Bound',
            `${claim.metadata.namespace}/${claim.metadata.name}`,
            state.storageClass?.metadata.name ?? '',
            '<unset>',
            '',
            humanAge(cluster.now - createdAt(claim)),
          ],
          manifest: () => ({
            apiVersion: 'v1',
            kind: 'PersistentVolume',
            metadata: { name: state.volumeName },
            spec: {
              capacity: { storage: claim.spec.resources?.requests?.storage },
              claimRef: { name: claim.metadata.name, namespace: claim.metadata.namespace },
              storageClassName: state.storageClass?.metadata.name,
            },
            status: { phase: 'Bound' },
          }),
        }))
    case 'Event':
    case 'HorizontalPodAutoscaler':
      return []
    default:
      return listObjects(cluster, info.kind as ResourceKind, namespace).map((object) =>
        objectItem(cluster, object),
      )
  }
}

interface Target {
  info: KindInfo
  names: string[]
}

function parseTargets(pos: string[]): Target[] | string {
  if (pos.length === 0) return 'none'
  if (pos[0].includes('/')) {
    const out: Target[] = []
    for (const entry of pos) {
      const [kind, name] = entry.split('/')
      const info = kindInfo(kind)
      if (!info) return `error: the server doesn't have a resource type "${kind}"`
      const existing = out.find((target) => target.info === info)
      if (existing) existing.names.push(name)
      else out.push({ info, names: [name] })
    }
    return out
  }
  const kinds = pos[0].split(',').filter(Boolean)
  const expanded = kinds.flatMap((kind) =>
    kind === 'all' ? ['pods', 'services', 'deployments', 'replicasets'] : [kind],
  )
  const out: Target[] = []
  for (const kind of expanded) {
    const info = kindInfo(kind)
    if (!info) return `error: the server doesn't have a resource type "${kind}"`
    out.push({ info, names: pos.slice(1) })
  }
  if (out.length > 1 && pos.length > 1) return 'error: you may only specify a single resource type'
  return out
}

const noResources = (namespace: string | null) =>
  namespace === null ? 'No resources found' : `No resources found in ${namespace} namespace.`

const notFound = (info: KindInfo, name: string) =>
  `Error from server (NotFound): ${info.group ? `${info.plural}.${info.group}` : info.plural} "${name}" not found`

const toYaml = (value: unknown) => stringify(value, { lineWidth: 0 })

function listManifest(items: Record<string, unknown>[]) {
  return { apiVersion: 'v1', items, kind: 'List', metadata: { resourceVersion: '' } }
}

/* ---------- get ---------- */

function eventObjects(cluster: Cluster, events: ClusterEvent[]) {
  return events
    .map((event, index) => ({
      apiVersion: 'v1',
      kind: 'Event',
      count: event.count,
      firstTimestamp: isoAt(event.firstAt),
      lastTimestamp: isoAt(event.lastAt),
      involvedObject: {
        kind: kindInfo(event.object.split('/')[0])?.kind ?? 'Pod',
        name: event.object.split('/')[1],
        namespace: event.namespace,
      },
      message: event.message,
      metadata: {
        name: `${event.object.split('/')[1]}.${(1870000000 + index * 7919 + Math.round(event.firstAt)).toString(16)}`,
        namespace: event.namespace,
      },
      reason: event.reason,
      source: { component: event.source },
      type: event.type,
      _now: cluster.now,
    }))
    .map(({ _now, ...rest }) => (void _now, rest))
}

function getEvents(ctx: ShellContext, args: Args): KubectlResult {
  const namespace = allNs(args) ? null : nsOf(ctx, args)
  let events = allEvents(ctx.cluster, namespace)
  const field = value(args, 'field-selector')
  if (field) {
    for (const condition of field.split(',')) {
      const match = /^([\w.]+)(!=|==|=)(.*)$/.exec(condition)
      if (!match)
        return fail(
          `Error from server (BadRequest): Unable to find "/v1, Resource=events" that match label selector "", field selector "${field}": field label not supported`,
        )
      const [, key, op, wanted] = match
      const read = (event: ClusterEvent) =>
        key === 'type'
          ? event.type
          : key === 'reason'
            ? event.reason
            : key === 'involvedObject.name'
              ? event.object.split('/')[1]
              : key === 'involvedObject.kind'
                ? (kindInfo(event.object.split('/')[0])?.kind ?? '')
                : null
      events = events.filter((event) => {
        const got = read(event)
        if (got === null) return true
        return op === '!=' ? got !== wanted : got === wanted
      })
    }
  }
  const sortBy = value(args, 'sort-by')
  if (sortBy) {
    if (/lastTimestamp|eventTime|creationTimestamp/.test(sortBy))
      events.sort((a, b) => a.lastAt - b.lastAt)
    else if (/firstTimestamp/.test(sortBy)) events.sort((a, b) => a.firstAt - b.firstAt)
    else if (/count/.test(sortBy)) events.sort((a, b) => a.count - b.count)
  } else events.sort((a, b) => a.object.localeCompare(b.object) || a.firstAt - b.firstAt)
  const output = value(args, 'o', 'output')
  if (events.length === 0) return fail(noResources(namespace), 0)
  if (output === 'yaml' || output === 'json') {
    const list = listManifest(eventObjects(ctx.cluster, events))
    return ok(output === 'yaml' ? toYaml(list) : JSON.stringify(list, null, 4))
  }
  const rows = events.map((event) => [
    ...(namespace === null ? [event.namespace] : []),
    humanAge(ctx.cluster.now - event.lastAt),
    event.type,
    event.reason,
    event.object,
    event.message,
  ])
  return ok(
    table([
      [
        ...(namespace === null ? ['NAMESPACE'] : []),
        'LAST SEEN',
        'TYPE',
        'REASON',
        'OBJECT',
        'MESSAGE',
      ],
      ...rows,
    ]),
  )
}

function customColumns(spec: string, manifests: Record<string, unknown>[]) {
  const columns = spec.split(',').map((entry) => {
    const [title, ...rest] = entry.split(':')
    return { title, path: rest.join(':') }
  })
  const rows = manifests.map((manifest) =>
    columns.map((column) => {
      try {
        const text = jsonpath(
          manifest,
          `{${column.path.startsWith('.') ? column.path : `.${column.path}`}}`,
        )
        return text === '' ? '<none>' : text.replace(/ /g, ',')
      } catch {
        return '<none>'
      }
    }),
  )
  return table([columns.map((column) => column.title), ...rows])
}

function get(ctx: ShellContext, args: Args): KubectlResult {
  const targets = parseTargets(args.pos)
  if (targets === 'none')
    return fail(
      'You must specify the type of resource to get. Use "kubectl api-resources" for a complete list of supported resources.\n\nerror: Required resource not specified.\nUse "kubectl explain <resource>" for a detailed description of that resource (e.g. kubectl explain pods).\nSee \'kubectl get -h\' for help and examples',
    )
  if (typeof targets === 'string') return fail(targets)
  if (targets.length === 1 && targets[0].info.kind === 'Event' && targets[0].names.length === 0) {
    const result = getEvents(ctx, args)
    return has(args, 'w', 'watch')
      ? {
          ...result,
          stderr: `${result.stderr}${result.stderr ? '\n' : ''}(lab) --watch prints once here; run the command again to see changes.`,
        }
      : result
  }
  const namespace = allNs(args) ? null : nsOf(ctx, args)
  if (
    namespace !== null &&
    !namespaces(ctx.cluster).includes(namespace) &&
    targets.some((target) => target.info.namespaced)
  )
    return fail(noResources(namespace), 0)
  const selector = parseSelector(value(args, 'l', 'selector'))
  const field = value(args, 'field-selector')
  const output = value(args, 'o', 'output') ?? ''
  const wide = output === 'wide'
  const errors: string[] = []
  const warnings: string[] = []
  const blocks: { target: Target; items: Item[] }[] = []
  for (const target of targets) {
    if (target.info.kind === 'Endpoints')
      warnings.push(
        'Warning: v1 Endpoints is deprecated in v1.33+; use discovery.k8s.io/v1 EndpointSlice',
      )
    let items = itemsOf(ctx, target.info, target.info.namespaced ? namespace : null)
    if (selector) items = items.filter((item) => selector(item.labels))
    if (field) {
      for (const condition of field.split(',')) {
        const match = /^([\w.]+)(!=|==|=)(.*)$/.exec(condition)
        if (!match) continue
        const [, key, op, wanted] = match
        items = items.filter((item) => {
          const manifest = item.manifest() as {
            metadata?: { name?: string; namespace?: string }
            spec?: { nodeName?: string }
            status?: { phase?: string }
          }
          const got =
            key === 'metadata.name'
              ? manifest.metadata?.name
              : key === 'metadata.namespace'
                ? manifest.metadata?.namespace
                : key === 'spec.nodeName'
                  ? manifest.spec?.nodeName
                  : key === 'status.phase'
                    ? manifest.status?.phase
                    : undefined
          return op === '!=' ? got !== wanted : got === wanted
        })
      }
    }
    if (target.names.length) {
      const picked: Item[] = []
      for (const name of target.names) {
        const found = items.find((item) => item.name === name)
        if (found) picked.push(found)
        else errors.push(notFound(target.info, name))
      }
      items = picked
    }
    const sortBy = value(args, 'sort-by')
    if (sortBy) {
      items = [...items].sort((a, b) => {
        try {
          const left = jsonpath(a.manifest(), `{${sortBy}}`)
          const right = jsonpath(b.manifest(), `{${sortBy}}`)
          return left.localeCompare(right, undefined, { numeric: true })
        } catch {
          return 0
        }
      })
    } else
      items = [...items].sort(
        (a, b) =>
          (a.namespace ?? '').localeCompare(b.namespace ?? '') || a.name.localeCompare(b.name),
      )
    blocks.push({ target, items })
  }
  const all = blocks.flatMap((block) => block.items)
  const named = targets.some((target) => target.names.length > 0)
  let stdout = ''
  if (all.length === 0) {
    const stderr = [...warnings, ...errors]
    if (!named)
      stderr.push(noResources(targets.every((target) => target.info.namespaced) ? namespace : null))
    return { stdout: '', stderr: stderr.join('\n'), exitCode: errors.length ? 1 : 0 }
  }
  if (
    output === 'yaml' ||
    output === 'json' ||
    output.startsWith('jsonpath') ||
    output.startsWith('custom-columns')
  ) {
    const manifests = all.map((item) => item.manifest())
    const single =
      named && all.length === 1 && targets.length === 1 && targets[0].names.length === 1
    const root = single ? manifests[0] : listManifest(manifests)
    if (output === 'yaml') stdout = toYaml(root)
    else if (output === 'json') stdout = `${JSON.stringify(root, null, 4)}\n`
    else if (output.startsWith('custom-columns='))
      stdout = `${customColumns(output.slice('custom-columns='.length), manifests)}\n`
    else {
      const template = output.replace(/^jsonpath=/, '').replace(/^jsonpath/, '')
      try {
        stdout = jsonpath(root, template)
      } catch (error) {
        return fail(error instanceof Error ? error.message : String(error))
      }
    }
  } else if (output === 'name') {
    stdout = `${all.map((item) => `${qualified(item.info)}/${item.name}`).join('\n')}\n`
  } else if (output && output !== 'wide') {
    return fail(
      `error: unable to match a printer suitable for the output format "${output}", allowed formats are: custom-columns,custom-columns-file,go-template,go-template-file,json,jsonpath,jsonpath-as-json,jsonpath-file,name,template,templatefile,wide,yaml`,
    )
  } else {
    const multiple = blocks.filter((block) => block.items.length).length > 1 || targets.length > 1
    const tables = blocks
      .filter((block) => block.items.length)
      .map((block) => {
        const prefix = multiple ? `${qualified(block.target.info)}/` : ''
        const header = [
          ...(namespace === null && block.target.info.namespaced ? ['NAMESPACE'] : []),
          ...block.items[0].header(wide),
          ...(has(args, 'show-labels') ? ['LABELS'] : []),
        ]
        const rows = block.items.map((item) => {
          const row = item.row(wide)
          row[0] = prefix + row[0]
          return [
            ...(namespace === null && block.target.info.namespaced ? [item.namespace ?? ''] : []),
            ...row,
            ...(has(args, 'show-labels') ? [labelText(item.labels)] : []),
          ]
        })
        return table([header, ...rows])
      })
    stdout = `${tables.join('\n\n')}\n`
  }
  const stderr = [...warnings, ...errors]
  if (has(args, 'w', 'watch'))
    stderr.push('(lab) --watch prints once here; run the command again to see changes.')
  return { stdout, stderr: stderr.join('\n'), exitCode: errors.length ? 1 : 0 }
}

/* ---------- describe ---------- */

function describe(ctx: ShellContext, args: Args): KubectlResult {
  const targets = parseTargets(args.pos)
  if (targets === 'none')
    return fail(
      'error: You must specify the type of resource to describe. Use "kubectl api-resources" for a complete list of supported resources.',
    )
  if (typeof targets === 'string') return fail(targets)
  const namespace = allNs(args) ? null : nsOf(ctx, args)
  const selector = parseSelector(value(args, 'l', 'selector'))
  const { cluster } = ctx
  const texts: string[] = []
  const errors: string[] = []
  for (const target of targets) {
    const ns = target.info.namespaced ? namespace : null
    let items = itemsOf(ctx, target.info, ns)
    if (selector) items = items.filter((item) => selector(item.labels))
    if (target.names.length) {
      const picked: Item[] = []
      for (const name of target.names) {
        const exact = items.filter((item) => item.name === name)
        const prefix = exact.length ? exact : items.filter((item) => item.name.startsWith(name))
        if (prefix.length) picked.push(...prefix)
        else errors.push(notFound(target.info, name))
      }
      items = picked
    }
    for (const item of items) {
      const nsName = item.namespace ?? 'default'
      switch (target.info.kind) {
        case 'Pod': {
          const pod = cluster.pods.find(
            (entry) => entry.name === item.name && entry.namespace === nsName,
          )
          if (pod) texts.push(describePod(cluster, pod))
          break
        }
        case 'ReplicaSet': {
          const rs = cluster.replicaSets.find(
            (entry) => entry.name === item.name && entry.namespace === nsName,
          )
          if (rs) texts.push(describeReplicaSet(cluster, rs))
          break
        }
        case 'Node': {
          const node = cluster.nodes.find((entry) => entry.name === item.name)
          if (node) texts.push(describeNode(cluster, node))
          break
        }
        case 'Endpoints':
        case 'EndpointSlice':
        case 'PersistentVolume':
        case 'Event':
          texts.push(toYaml(item.manifest()).trimEnd())
          break
        default: {
          const object = findObject(
            cluster,
            target.info.kind as ResourceKind,
            item.name,
            item.namespace,
          )
          if (!object) break
          if (object.kind === 'Deployment') texts.push(describeDeployment(cluster, object))
          else if (object.kind === 'Service') texts.push(describeService(cluster, object))
          else if (object.kind === 'Ingress') texts.push(describeIngress(cluster, object))
          else if (object.kind === 'PersistentVolumeClaim')
            texts.push(describeClaim(cluster, object))
          else if (object.kind === 'ConfigMap' || object.kind === 'Secret')
            texts.push(describeConfig(object))
          else texts.push(describeGeneric(object))
        }
      }
    }
  }
  if (texts.length === 0 && errors.length === 0) return fail(noResources(namespace), 0)
  return {
    stdout: texts.length ? `${texts.join('\n\n\n')}\n` : '',
    stderr: errors.join('\n'),
    exitCode: errors.length ? 1 : 0,
  }
}

/* ---------- finding one workload ---------- */

function findPod(ctx: ShellContext, namespace: string, ref: string): PodRecord | string {
  const { cluster } = ctx
  if (ref.includes('/')) {
    const [kind, name] = ref.split('/')
    const info = kindInfo(kind)
    if (!info) return `error: the server doesn't have a resource type "${kind}"`
    if (info.kind === 'Pod') return findPod(ctx, namespace, name)
    if (info.kind === 'Deployment' || info.kind === 'ReplicaSet' || info.kind === 'Service') {
      let pods: PodRecord[] = []
      if (info.kind === 'Deployment') {
        const deployment = findObject(cluster, 'Deployment', name, namespace)
        if (!deployment) return notFound(info, name)
        pods = deploymentPods(cluster, deployment)
      } else if (info.kind === 'ReplicaSet') {
        const rs = cluster.replicaSets.find(
          (entry) => entry.name === name && entry.namespace === namespace,
        )
        if (!rs) return notFound(info, name)
        pods = cluster.pods.filter((pod) => pod.owner === rs.name && pod.namespace === namespace)
      } else {
        const service = findObject(cluster, 'Service', name, namespace)
        if (!service) return notFound(info, name)
        pods = cluster.pods.filter(
          (pod) =>
            pod.namespace === namespace &&
            Object.entries(service.spec.selector ?? { '': '' }).every(
              ([key, wanted]) => pod.labels[key] === wanted,
            ),
        )
      }
      const sorted = [...pods].sort(
        (a, b) =>
          Number(podView(cluster, b).ready) - Number(podView(cluster, a).ready) ||
          a.createdAt - b.createdAt,
      )
      if (sorted.length === 0) return `error: timed out waiting for the condition`
      return sorted[0]
    }
    return `error: cannot attach to *v1.${info.kind}: selector for *v1.${info.kind} not implemented`
  }
  const pod = cluster.pods.find((entry) => entry.name === ref && entry.namespace === namespace)
  return pod ?? `Error from server (NotFound): pods "${ref}" not found`
}

function pickContainer(
  pod: PodRecord,
  name: string | undefined,
): { container: Container; note: string } | string {
  if (name) {
    const container = pod.spec.containers.find((entry) => entry.name === name)
    return container
      ? { container, note: '' }
      : `error: container ${name} is not valid for pod ${pod.name}`
  }
  const container = pod.spec.containers[0]
  return {
    container,
    note:
      pod.spec.containers.length > 1
        ? `Defaulted container "${container.name}" out of: ${pod.spec.containers.map((entry) => entry.name).join(', ')}`
        : '',
  }
}

/* ---------- logs ---------- */

function logs(ctx: ShellContext, args: Args): KubectlResult {
  const namespace = nsOf(ctx, args)
  const selector = value(args, 'l', 'selector')
  let pods: PodRecord[] = []
  const notes: string[] = []
  if (selector) {
    const match = parseSelector(selector) as Requirement
    pods = ctx.cluster.pods.filter((pod) => pod.namespace === namespace && match(pod.labels))
    if (pods.length === 0) return fail(noResources(namespace), 0)
  } else {
    const ref = args.pos[0]
    if (!ref)
      return fail(
        "error: expected 'logs [-f] [-p] (POD | TYPE/NAME) [-c CONTAINER]'.\nPOD or TYPE/NAME is a required argument for the logs command\nSee 'kubectl logs -h' for help and examples",
      )
    const found = findPod(ctx, namespace, ref)
    if (typeof found === 'string') return fail(found)
    if (ref.includes('/') && !ref.startsWith('pod/') && !ref.startsWith('po/')) {
      const count = ref.startsWith('deploy')
        ? deploymentPods(
            ctx.cluster,
            findObject(ctx.cluster, 'Deployment', ref.split('/')[1], namespace) as Deployment,
          ).length
        : 1
      if (count > 1) notes.push(`Found ${count} pods, using pod/${found.name}`)
    }
    pods = [found]
  }
  const previous = has(args, 'p', 'previous')
  const tail = value(args, 'tail')
  const out: string[] = []
  for (const pod of pods) {
    const picked = pickContainer(pod, value(args, 'c', 'container'))
    if (typeof picked === 'string') return fail(picked)
    if (picked.note) notes.push(picked.note)
    const view = podView(ctx.cluster, pod)
    const state = view.containers.find((entry) => entry.name === picked.container.name)
    if (!state) continue
    if (previous) {
      if (!state.previousLogs)
        return fail(
          `Error from server (BadRequest): previous terminated container "${state.name}" in pod "${pod.name}" not found`,
          1,
          out.join(''),
        )
      out.push(...state.previousLogs.map((line) => (selector ? `${line}` : line)))
      continue
    }
    if (!state.logs) {
      return fail(
        `${notes.length ? `${notes.join('\n')}\n` : ''}Error from server (BadRequest): container "${state.name}" in pod "${pod.name}" is waiting to start: ${state.waitingFor ?? 'ContainerCreating'}`,
        1,
        out.join(''),
      )
    }
    out.push(...state.logs)
  }
  if (has(args, 'f', 'follow'))
    notes.push('(lab) -f prints what is there now; run it again to see new lines.')
  const lines = tail !== undefined && Number(tail) >= 0 ? out.slice(-Number(tail)) : out
  return {
    stdout: lines.length ? `${lines.join('\n')}\n` : '',
    stderr: notes.join('\n'),
    exitCode: 0,
  }
}

/* ---------- exec / run: commands inside a Pod ---------- */

function inPod(
  ctx: ShellContext,
  pod: PodRecord,
  container: Container,
  command: string[],
): KubectlResult {
  const view = podView(ctx.cluster, pod)
  const state = view.containers.find((entry) => entry.name === container.name)
  if (!state || state.state !== 'running' || !state.app)
    return fail(
      `error: Internal error occurred: unable to upgrade connection: container not found ("${container.name}")`,
    )
  let words = [...command]
  if (
    (words[0] === 'sh' ||
      words[0] === 'bash' ||
      words[0] === '/bin/sh' ||
      words[0] === '/bin/bash') &&
    words[1] === '-c' &&
    words[2]
  )
    words =
      words[2].match(/"[^"]*"|'[^']*'|\S+/g)?.map((word) => word.replace(/^["']|["']$/g, '')) ?? []
  const binary = (words[0] ?? '').split('/').pop() ?? ''
  const bins = state.app.bins ?? []
  const origin: Origin = { kind: 'pod', pod }
  const exitNote = (result: Output): KubectlResult =>
    result.exitCode
      ? {
          ...result,
          stderr: `${result.stderr}${result.stderr ? '\n' : ''}command terminated with exit code ${result.exitCode}`,
        }
      : result
  if (!bins.includes(binary) || !binary) {
    if (['sh', 'bash'].includes(binary) && words.length === 1)
      return fail(
        '(lab) interactive shells are not simulated - run one command at a time, e.g. kubectl exec POD -- env',
      )
    return fail(
      `error: Internal error occurred: Internal error occurred: error executing command in container: failed to exec in container: failed to start exec "${'0'.repeat(12)}": OCI runtime exec failed: exec failed: unable to start container process: exec: "${binary || words[0] || ''}": executable file not found in $PATH: unknown`,
      126,
    )
  }
  if (['sh', 'bash'].includes(binary))
    return fail(
      '(lab) interactive shells are not simulated - run one command at a time, e.g. kubectl exec POD -- env',
    )
  switch (binary) {
    case 'curl':
      return exitNote(curl(ctx.cluster, words.slice(1), origin))
    case 'wget':
      return exitNote(wget(ctx.cluster, words.slice(1), origin))
    case 'nslookup':
      return exitNote(nslookup(ctx.cluster, words.slice(1), origin))
    case 'env':
    case 'printenv': {
      const env = [
        ['PATH', '/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin'],
        ['HOSTNAME', pod.name],
        ...podEnv(ctx, pod, container),
        ['KUBERNETES_SERVICE_HOST', '10.0.0.1'],
        ['KUBERNETES_SERVICE_PORT', '443'],
        ['HOME', '/root'],
      ]
      if (binary === 'printenv' && words[1]) {
        const found = env.find(([key]) => key === words[1])
        return found ? ok(found[1]) : fail('', 1)
      }
      return ok(env.map(([key, val]) => `${key}=${val}`).join('\n'))
    }
    case 'hostname':
      return ok(pod.name)
    case 'cat': {
      const file = words[1]
      if (file === '/etc/resolv.conf')
        return ok(
          `search ${pod.namespace}.svc.cluster.local svc.cluster.local cluster.local\nnameserver 10.0.0.10\noptions ndots:5`,
        )
      if (file === '/etc/hostname') return ok(pod.name)
      return fail(`cat: ${file ?? ''}: No such file or directory`, 1)
    }
    case 'ls':
      return ok('app\nbin\ndev\netc\nhome\nproc\nroot\nsys\ntmp\nusr\nvar')
    case 'echo':
      return ok(words.slice(1).join(' '))
    case 'sleep':
      return ok('')
    default:
      return fail(
        `(lab) "${binary}" is installed in this image but not simulated - try curl, wget, nslookup, env or cat /etc/resolv.conf.`,
      )
  }
}

function podEnv(ctx: ShellContext, pod: PodRecord, container: Container): [string, string][] {
  const env: [string, string][] = []
  for (const entry of container.envFrom ?? []) {
    const map = entry.configMapRef
      ? findObject(ctx.cluster, 'ConfigMap', entry.configMapRef.name, pod.namespace)
      : undefined
    for (const [key, val] of Object.entries(map?.data ?? {}))
      env.push([`${entry.prefix ?? ''}${key}`, val])
  }
  for (const entry of container.env ?? []) {
    if (entry.value !== undefined) env.push([entry.name, entry.value])
    else if (entry.valueFrom?.configMapKeyRef) {
      const ref = entry.valueFrom.configMapKeyRef
      const val = findObject(ctx.cluster, 'ConfigMap', ref.name, pod.namespace)?.data?.[ref.key]
      if (val !== undefined) env.push([entry.name, val])
    } else if (entry.valueFrom?.secretKeyRef) env.push([entry.name, '********'])
  }
  return env
}

function exec(ctx: ShellContext, args: Args): KubectlResult {
  const namespace = nsOf(ctx, args)
  const ref = args.pos[0]
  if (!ref) return fail('error: pod, type/name or --filename must be specified')
  const command = args.after ?? args.pos.slice(1)
  if (!args.after && args.pos.length > 1)
    return fail(
      `error: exec [POD] [COMMAND] is not supported anymore. Use exec [POD] -- [COMMAND] instead\nSee 'kubectl exec -h' for help and examples`,
    )
  if (command.length === 0)
    return fail('error: you must specify at least one command for the container')
  const found = findPod(ctx, namespace, ref)
  if (typeof found === 'string') return fail(found)
  const picked = pickContainer(found, value(args, 'c', 'container'))
  if (typeof picked === 'string') return fail(picked)
  const view = podView(ctx.cluster, found)
  if (!view.scheduled) return fail(`error: unable to upgrade connection: pod does not exist`)
  const result = inPod(ctx, found, picked.container, command)
  return picked.note ? { ...result, stderr: `${picked.note}\n${result.stderr}`.trim() } : result
}

function run(ctx: ShellContext, args: Args): KubectlResult {
  const namespace = nsOf(ctx, args)
  const name = args.pos[0]
  const image = value(args, 'image')
  if (!name)
    return fail("error: NAME is required for run\nSee 'kubectl run -h' for help and examples")
  if (!image) return fail('error: required flag(s) "image" not set')
  const command = args.after ?? []
  const spec = {
    containers: [
      {
        name,
        image,
        ...(command.length ? (has(args, 'command') ? { command } : { args: command }) : {}),
        ...(value(args, 'port') ? { ports: [{ containerPort: Number(value(args, 'port')) }] } : {}),
        ...(values(args, 'env').length
          ? {
              env: values(args, 'env').map((entry) => ({
                name: entry.split('=')[0],
                value: entry.split('=').slice(1).join('='),
              })),
            }
          : {}),
      },
    ],
    restartPolicy: value(args, 'restart') ?? 'Always',
  }
  if (ctx.cluster.pods.some((pod) => pod.name === name && pod.namespace === namespace))
    return fail(`Error from server (AlreadyExists): pods "${name}" already exists`)
  const labels: Labels = value(args, 'labels')
    ? Object.fromEntries(
        (value(args, 'labels') as string)
          .split(',')
          .map((pair) => pair.split('=') as [string, string]),
      )
    : { run: name }
  if (has(args, 'rm')) {
    if (!(has(args, 'i') || has(args, 'stdin') || has(args, 'it')))
      return fail('error: --rm should only be used for attached containers')
    const pod = newPod(ctx.cluster, namespace, name, spec, labels, null)
    pod.annotations = { 'lab/bare': 'true' }
    reconcile(ctx.cluster)
    pod.scheduledAt = (pod.scheduledAt ?? ctx.cluster.now) - 5
    const view = podView(ctx.cluster, pod)
    let result: KubectlResult
    const binary = (command[0] ?? '').split('/').pop() ?? ''
    if (!view.scheduled) result = fail(`error: timed out waiting for the condition`)
    else if (
      view.containers[0]?.state === 'waiting' &&
      view.containers[0].reason !== 'CrashLoopBackOff' &&
      view.containers[0].reason !== 'Completed' &&
      view.containers[0].reason !== 'Error'
    )
      result = fail(`error: timed out waiting for the condition`)
    else if (command.length === 0)
      result = fail(
        "If you don't see a command prompt, try pressing enter.\n(lab) interactive shells are not simulated - add a command after --, e.g. -- curl http://web",
      )
    else {
      const app = view.containers[0]?.app
      const fakePod = { ...pod }
      fakePod.spec = { ...pod.spec, containers: [{ ...pod.spec.containers[0] }] }
      // The image's entrypoint takes the arguments (curlimages/curl: ENTRYPOINT curl).
      const words =
        has(args, 'command') ||
        !app ||
        app.command[0] === 'sh' ||
        (app.bins ?? []).includes(command[0])
          ? command
          : [app.command[0], ...command]
      const temp = inPodRaw(ctx, pod, words, binary)
      result = temp
    }
    ctx.cluster.pods = ctx.cluster.pods.filter((entry) => entry !== pod)
    return {
      ...result,
      stdout: `${result.stdout}pod "${name}" deleted from ${namespace} namespace\n`,
      mutated: true,
    }
  }
  const pod = newPod(ctx.cluster, namespace, name, spec, labels, null)
  pod.annotations = { 'lab/bare': 'true' }
  return ok(`pod/${name} created`, true)
}

function inPodRaw(
  ctx: ShellContext,
  pod: PodRecord,
  words: string[],
  _binary: string,
): KubectlResult {
  const origin: Origin = { kind: 'pod', pod }
  const binary = (words[0] ?? '').split('/').pop() ?? ''
  if (binary === 'curl') return curl(ctx.cluster, words.slice(1), origin)
  if (binary === 'wget') return wget(ctx.cluster, words.slice(1), origin)
  if (binary === 'nslookup') return nslookup(ctx.cluster, words.slice(1), origin)
  if (binary === 'env' || binary === 'printenv')
    return ok(`HOSTNAME=${pod.name}\nKUBERNETES_SERVICE_HOST=10.0.0.1`)
  if (binary === 'echo') return ok(words.slice(1).join(' '))
  return fail(`(lab) "${binary}" is not simulated in a temporary Pod - try curl, wget or nslookup.`)
}

/* ---------- mutating helpers ---------- */

function resolveObject(
  ctx: ShellContext,
  args: Args,
  allowed?: string[],
): { object: Resource; info: KindInfo } | string {
  let kind: string | undefined
  let name: string | undefined
  if (args.pos[0]?.includes('/')) [kind, name] = args.pos[0].split('/')
  else [kind, name] = args.pos
  if (!kind) return 'error: you must specify a resource type and name'
  const info = kindInfo(kind)
  if (!info) return `error: the server doesn't have a resource type "${kind}"`
  if (allowed && !allowed.includes(info.kind))
    return `error: ${info.plural} are not supported by this command in the lab - try a Deployment`
  if (!name) return `error: resource name may not be empty`
  if (!info.stored)
    return `error: ${info.plural} are managed by their controllers; change the Deployment instead`
  const object = findObject(
    ctx.cluster,
    info.kind as ResourceKind,
    name,
    info.namespaced ? nsOf(ctx, args) : undefined,
  )
  if (!object) return notFound(info, name)
  return { object, info }
}

function deploymentFrom(ctx: ShellContext, args: Args): Deployment | string {
  const found = resolveObject(ctx, args, ['Deployment'])
  if (typeof found === 'string') return found
  return found.object as Deployment
}

function withDeployment(
  ctx: ShellContext,
  args: Args,
  change: (draft: Deployment) => string | void,
  verb: string,
): KubectlResult {
  const deployment = deploymentFrom(ctx, args)
  if (typeof deployment === 'string') return fail(deployment)
  const draft = clone(deployment)
  const problem = change(draft)
  if (problem) return fail(problem)
  const result = updateObject(ctx.cluster, deployment, draft)
  if (!result.ok) return fail(result.message)
  return ok(`deployment.apps/${deployment.metadata.name} ${verb}`, result.changed)
}

/* ---------- set ---------- */

function setImage(ctx: ShellContext, args: Args): KubectlResult {
  const pairs = args.pos.filter((entry) => entry.includes('='))
  const refs = args.pos.filter((entry) => !pairs.includes(entry))
  if (pairs.length === 0) return fail('error: at least one image update is required')
  return withDeployment(
    ctx,
    { ...args, pos: refs },
    (draft) => {
      for (const pair of pairs) {
        const [name, ...rest] = pair.split('=')
        const image = rest.join('=')
        const containers = draft.spec.template.spec.containers.filter(
          (container) => name === '*' || container.name === name,
        )
        if (containers.length === 0) return `error: unable to find container named "${name}"`
        for (const container of containers) container.image = image
      }
    },
    'image updated',
  )
}

function setResources(ctx: ShellContext, args: Args): KubectlResult {
  const limits = value(args, 'limits')
  const requests = value(args, 'requests')
  if (!limits && !requests)
    return fail(
      'error: you must specify an update to requests or limits (in the form of --requests/--limits)',
    )
  const parse = (text: string | undefined) =>
    Object.fromEntries(
      (text ?? '')
        .split(',')
        .filter(Boolean)
        .map((pair) => pair.split('=') as [string, string]),
    )
  const container = value(args, 'c', 'containers', 'container')
  return withDeployment(
    ctx,
    args,
    (draft) => {
      const targets = draft.spec.template.spec.containers.filter(
        (entry) => !container || container === '*' || entry.name === container,
      )
      if (targets.length === 0) return `error: unable to find container named ${container}`
      for (const target of targets) {
        target.resources ??= {}
        if (limits) target.resources.limits = { ...target.resources.limits, ...parse(limits) }
        if (requests)
          target.resources.requests = { ...target.resources.requests, ...parse(requests) }
        for (const [key, val] of Object.entries({
          ...target.resources.limits,
          ...target.resources.requests,
        }))
          if (
            (key === 'cpu' && Number.isNaN(cpuMillis(val))) ||
            (key === 'memory' && Number.isNaN(memoryMi(val)))
          )
            return `error: failed to parse quantity "${val}": quantities must match the regular expression '^([+-]?[0-9.]+)([eEinumkKMGTP]*[-+]?[0-9]*)$'`
      }
    },
    'resource requirements updated',
  )
}

function setEnv(ctx: ShellContext, args: Args): KubectlResult {
  const pairs = args.pos.filter((entry) => /^[A-Za-z_][\w.-]*(=.*|-)$/.test(entry))
  const refs = args.pos.filter((entry) => !pairs.includes(entry))
  const deployment = deploymentFrom(ctx, { ...args, pos: refs })
  if (typeof deployment === 'string') return fail(deployment)
  const container = value(args, 'c', 'containers', 'container')
  if (has(args, 'list')) {
    const lines: string[] = []
    for (const entry of deployment.spec.template.spec.containers) {
      if (container && entry.name !== container) continue
      lines.push(`# Deployment ${deployment.metadata.name}, container ${entry.name}`)
      for (const source of entry.envFrom ?? [])
        lines.push(
          `# ${source.configMapRef ? `ConfigMap ${source.configMapRef.name}` : `Secret ${source.secretRef?.name}`} (all keys)`,
        )
      for (const env of entry.env ?? []) {
        if (env.value !== undefined) lines.push(`${env.name}=${env.value}`)
        else if (env.valueFrom?.configMapKeyRef)
          lines.push(
            `# ${env.name} from configmap ${env.valueFrom.configMapKeyRef.name}, key ${env.valueFrom.configMapKeyRef.key}`,
          )
        else if (env.valueFrom?.secretKeyRef)
          lines.push(
            `# ${env.name} from secret ${env.valueFrom.secretKeyRef.name}, key ${env.valueFrom.secretKeyRef.key}`,
          )
        else if (env.valueFrom?.fieldRef)
          lines.push(`# ${env.name} from field path ${env.valueFrom.fieldRef.fieldPath}`)
      }
    }
    return ok(lines.join('\n'))
  }
  const from = value(args, 'from')
  if (pairs.length === 0 && !from)
    return fail('error: at least one environment variable must be provided')
  return withDeployment(
    ctx,
    { ...args, pos: refs },
    (draft) => {
      const targets = draft.spec.template.spec.containers.filter(
        (entry) => !container || container === '*' || entry.name === container,
      )
      if (targets.length === 0) return `error: unable to find container named ${container}`
      let fromEnv: EnvVar[] = []
      if (from) {
        const [kind, name] = from.split('/')
        const info = kindInfo(kind)
        if (info?.kind === 'ConfigMap') {
          const map = findObject(ctx.cluster, 'ConfigMap', name, nsOf(ctx, args))
          if (!map) return `error: configmaps "${name}" not found`
          fromEnv = Object.keys(map.data ?? {}).map((key) => ({
            name: key.toUpperCase().replace(/[^A-Z0-9_]/g, '_'),
            valueFrom: { configMapKeyRef: { name, key } },
          }))
        } else if (info?.kind === 'Secret') {
          const secret = findObject(ctx.cluster, 'Secret', name, nsOf(ctx, args))
          if (!secret) return `error: secrets "${name}" not found`
          fromEnv = Object.keys(secret.data ?? {}).map((key) => ({
            name: key.toUpperCase().replace(/[^A-Z0-9_]/g, '_'),
            valueFrom: { secretKeyRef: { name, key } },
          }))
        } else return `error: from must be a configmap or secret`
      }
      for (const target of targets) {
        let env = [...(target.env ?? [])]
        const upsert = (entry: EnvVar) => {
          const index = env.findIndex((existing) => existing.name === entry.name)
          if (index >= 0) env[index] = entry
          else env.push(entry)
        }
        fromEnv.forEach(upsert)
        for (const pair of pairs) {
          if (pair.endsWith('-') && !pair.includes('='))
            env = env.filter((entry) => entry.name !== pair.slice(0, -1))
          else {
            const [name, ...rest] = pair.split('=')
            upsert({ name, value: rest.join('=') })
          }
        }
        target.env = env
        if (target.env.length === 0) delete target.env
      }
    },
    'env updated',
  )
}

/* ---------- patch / label / annotate / scale ---------- */

function patch(ctx: ShellContext, args: Args): KubectlResult {
  const raw = value(args, 'p', 'patch')
  if (!raw)
    return fail('error: must specify --patch or --patch-file containing the contents of the patch')
  if (args.pos[0] && kindInfo(args.pos[0].split('/')[0])?.kind === 'Node')
    return fail(
      '(lab) patching nodes is not simulated - use kubectl label, kubectl taint or kubectl cordon.',
    )
  const found = resolveObject(ctx, args)
  if (typeof found === 'string') return fail(found)
  let body: unknown
  try {
    body = JSON.parse(raw)
  } catch {
    try {
      body = parseAllDocuments(raw)[0]?.toJSON()
    } catch {
      body = undefined
    }
    if (body === undefined || typeof body === 'string')
      return fail(`error: unable to parse "${raw}": yaml: did not find expected node content`)
  }
  const type = value(args, 'type') ?? 'strategic'
  let next: unknown
  try {
    if (type === 'json') next = jsonPatch(found.object, body)
    else if (type === 'merge') next = mergePatch(found.object, body)
    else if (type === 'strategic') next = strategicMerge(found.object, body)
    else return fail(`error: --type must be one of [json merge strategic], not "${type}"`)
  } catch (error) {
    return fail(`The request is invalid: ${error instanceof Error ? error.message : String(error)}`)
  }
  const result = updateObject(ctx.cluster, found.object, next)
  if (!result.ok) return fail(result.message)
  const label = `${qualified(found.info)}/${found.object.metadata.name}`
  return ok(result.changed ? `${label} patched` : `${label} patched (no change)`, result.changed)
}

function labelOrAnnotate(
  ctx: ShellContext,
  args: Args,
  field: 'labels' | 'annotations',
): KubectlResult {
  const verb = field === 'labels' ? 'labeled' : 'annotated'
  const changes = args.pos.filter(
    (entry, index) => index > 0 && (entry.includes('=') || entry.endsWith('-')),
  )
  const refs = args.pos.filter((entry) => !changes.includes(entry))
  if (changes.length === 0)
    return fail(
      `error: at least one ${field === 'labels' ? 'label' : 'annotation'} update is required`,
    )
  const overwrite = has(args, 'overwrite')
  let kind: string
  let names: string[]
  if (refs[0]?.includes('/')) {
    kind = refs[0].split('/')[0]
    names = refs.map((entry) => entry.split('/')[1])
  } else {
    kind = refs[0] ?? ''
    names = refs.slice(1)
  }
  const info = kindInfo(kind)
  if (!info) return fail(`error: the server doesn't have a resource type "${kind}"`)
  const namespace = nsOf(ctx, args)
  const selector = parseSelector(value(args, 'l', 'selector'))
  const apply = (
    current: Labels | undefined,
    name: string,
  ): { next: Labels; changed: boolean } | string => {
    const next = { ...(current ?? {}) }
    let changed = false
    for (const change of changes) {
      if (change.endsWith('-') && !change.includes('=')) {
        const key = change.slice(0, -1)
        if (key in next) {
          delete next[key]
          changed = true
        }
      } else {
        const [key, ...rest] = change.split('=')
        const val = rest.join('=')
        if (key in next && next[key] !== val && !overwrite)
          return `error: '${key}' already has a value (${next[key]}), and --overwrite is false`
        if (next[key] !== val) changed = true
        next[key] = val
      }
    }
    void name
    return { next, changed }
  }
  const lines: string[] = []
  if (info.kind === 'Pod') {
    const pods = ctx.cluster.pods.filter(
      (pod) =>
        pod.namespace === namespace &&
        (names.length
          ? names.includes(pod.name)
          : selector
            ? selector(pod.labels)
            : has(args, 'all')),
    )
    if (names.length && pods.length < names.length)
      return fail(
        notFound(info, names.find((name) => !pods.some((pod) => pod.name === name)) as string),
      )
    if (pods.length === 0) return fail(noResources(namespace), 0)
    for (const pod of pods) {
      const result = apply(field === 'labels' ? pod.labels : pod.annotations, pod.name)
      if (typeof result === 'string') return fail(result)
      if (field === 'labels') pod.labels = result.next
      else pod.annotations = result.next
      lines.push(`pod/${pod.name} ${result.changed ? verb : `not ${verb}`}`)
    }
    return ok(lines.join('\n'), true)
  }
  if (info.kind === 'Node') {
    for (const name of names) {
      const node = ctx.cluster.nodes.find((entry) => entry.name === name)
      if (!node) return fail(notFound(info, name))
      if (field === 'annotations') {
        lines.push(`node/${name} annotated`)
        continue
      }
      const result = apply(node.labels, name)
      if (typeof result === 'string') return fail(result)
      node.labels = result.next
      lines.push(`node/${name} ${result.changed ? verb : `not ${verb}`}`)
    }
    return ok(lines.join('\n'), true)
  }
  if (!info.stored)
    return fail(
      `error: ${info.plural} are managed by their controllers; change the Deployment instead`,
    )
  const objects = names.length
    ? names.map(
        (name) =>
          findObject(
            ctx.cluster,
            info.kind as ResourceKind,
            name,
            info.namespaced ? namespace : undefined,
          ) ?? name,
      )
    : listObjects(
        ctx.cluster,
        info.kind as ResourceKind,
        info.namespaced ? namespace : null,
      ).filter((object) => (selector ? selector(object.metadata.labels ?? {}) : has(args, 'all')))
  for (const object of objects) {
    if (typeof object === 'string') return fail(notFound(info, object))
    const result = apply(object.metadata[field], object.metadata.name)
    if (typeof result === 'string') return fail(result)
    const draft = clone(object)
    draft.metadata[field] = result.next
    const update = updateObject(ctx.cluster, object, draft)
    if (!update.ok) return fail(update.message)
    lines.push(
      `${qualified(info)}/${object.metadata.name} ${result.changed ? verb : `not ${verb}`}`,
    )
  }
  return ok(lines.join('\n'), true)
}

function scale(ctx: ShellContext, args: Args): KubectlResult {
  const replicas = value(args, 'replicas')
  if (replicas === undefined) return fail('error: required flag(s) "replicas" not set')
  if (!/^\d+$/.test(replicas))
    return fail(
      `error: invalid argument "${replicas}" for "--replicas" flag: strconv.ParseInt: parsing "${replicas}": invalid syntax`,
    )
  const deployment = deploymentFrom(ctx, args)
  if (typeof deployment === 'string') return fail(deployment)
  const draft = clone(deployment)
  draft.spec.replicas = Number(replicas)
  const result = updateObject(ctx.cluster, deployment, draft)
  if (!result.ok) return fail(result.message)
  return ok(`deployment.apps/${deployment.metadata.name} scaled`, true)
}

function taint(ctx: ShellContext, args: Args): KubectlResult {
  const [kind, ...rest] = args.pos[0]?.includes('/')
    ? [args.pos[0].split('/')[0], args.pos[0].split('/')[1], ...args.pos.slice(1)]
    : args.pos
  if (kindInfo(kind ?? '')?.kind !== 'Node')
    return fail('error: taint only applies to nodes: kubectl taint nodes NODE KEY=VALUE:EFFECT')
  const [name, ...specs] = rest
  const node = ctx.cluster.nodes.find((entry) => entry.name === name)
  if (!node) return fail(`Error from server (NotFound): nodes "${name}" not found`)
  if (specs.length === 0) return fail('error: at least one taint update is required')
  let removed = false
  for (const spec of specs) {
    if (spec.endsWith('-')) {
      const [keyPart, effect] = spec.slice(0, -1).split(':')
      const key = keyPart.split('=')[0]
      const before = node.taints.length
      node.taints = node.taints.filter(
        (entry) => !(entry.key === key && (!effect || entry.effect === effect)),
      )
      if (node.taints.length === before)
        return fail(`error: taint "${spec.slice(0, -1)}" not found`)
      removed = true
    } else {
      const match = /^([\w./-]+)(?:=([\w.-]*))?:(NoSchedule|PreferNoSchedule|NoExecute)$/.exec(spec)
      if (!match) return fail(`error: invalid taint spec: ${spec}, unknown taint effect`)
      const [, key, val, effect] = match
      const existing = node.taints.find((entry) => entry.key === key && entry.effect === effect)
      if (existing && !has(args, 'overwrite'))
        return fail(
          `error: node ${name} already has ${key} taint(s) with same effect(s) and --overwrite is false`,
        )
      node.taints = [
        ...node.taints.filter((entry) => entry !== existing),
        { key, ...(val ? { value: val } : {}), effect },
      ]
    }
  }
  return ok(`node/${name} ${removed ? 'untainted' : 'tainted'}`, true)
}

function cordon(ctx: ShellContext, args: Args, on: boolean): KubectlResult {
  const name = args.pos[0]?.replace(/^nodes?\//, '')
  const node = ctx.cluster.nodes.find((entry) => entry.name === name)
  if (!node) return fail(`Error from server (NotFound): nodes "${name ?? ''}" not found`)
  const was = Boolean(node.unschedulable)
  node.unschedulable = on
  return ok(`node/${name} ${was === on ? 'already ' : ''}${on ? 'cordoned' : 'uncordoned'}`, true)
}

/* ---------- create / expose / apply / delete ---------- */

function parseManifests(text: string, source: string): unknown[] | string {
  try {
    const docs = parseAllDocuments(text)
    const list = Array.isArray(docs) ? docs : [docs]
    const out: unknown[] = []
    for (const doc of list) {
      if (doc.errors?.length)
        return `error: error parsing ${source}: error converting YAML to JSON: yaml: ${doc.errors[0].message.split('\n')[0]}`
      const json = doc.toJSON() as unknown
      if (json === null || json === undefined) continue
      if (typeof json === 'object' && (json as { kind?: string }).kind === 'List')
        out.push(...((json as { items?: unknown[] }).items ?? []))
      else out.push(json)
    }
    return out
  } catch (error) {
    return `error: error parsing ${source}: ${error instanceof Error ? error.message : String(error)}`
  }
}

function fileArg(ctx: ShellContext, args: Args): { name: string; text: string } | string {
  const name = value(args, 'f', 'filename')
  if (!name) return 'error: must specify one of -f and -k'
  if (name === '-')
    return '(lab) reading from stdin is not simulated - write the manifest in the Files tab and apply it with -f <name>'
  if (/^https?:\/\//.test(name))
    return `error: unable to read URL "${name}": the lab has no internet access - paste it into the Files tab`
  const key = name.replace(/^\.\//, '')
  const text = ctx.files[key]
  if (text === undefined) return `error: the path "${name}" does not exist`
  return { name: key, text }
}

function apply(ctx: ShellContext, args: Args, createOnly = false): KubectlResult {
  if (value(args, 'k')) return fail('(lab) kustomize (-k) is not simulated')
  const file = fileArg(ctx, args)
  if (typeof file === 'string') return fail(file)
  const docs = parseManifests(file.text, file.name)
  if (typeof docs === 'string') return fail(docs)
  if (docs.length === 0)
    return fail(`error: no objects passed to ${createOnly ? 'create' : 'apply'}`)
  const lines: string[] = []
  const errors: string[] = []
  let mutated = false
  const namespace = nsOf(ctx, args)
  for (const doc of docs) {
    if (createOnly) {
      const kind = (doc as { kind?: string }).kind ?? ''
      const name = (doc as { metadata?: { name?: string } }).metadata?.name ?? ''
      const info = kindInfo(kind)
      const docNs = (doc as { metadata?: { namespace?: string } }).metadata?.namespace ?? namespace
      if (
        info &&
        findObject(
          ctx.cluster,
          info.kind as ResourceKind,
          name,
          info.namespaced ? docNs : undefined,
        )
      ) {
        errors.push(
          `Error from server (AlreadyExists): error when creating "${file.name}": ${info.group ? `${info.plural}.${info.group}` : info.plural} "${name}" already exists`,
        )
        continue
      }
    }
    const result = applyObject(ctx.cluster, doc, namespace, file.name)
    if (!result.ok) errors.push(result.message)
    else {
      lines.push(`${result.label} ${result.verb}`)
      if (result.verb !== 'unchanged') mutated = true
    }
  }
  return {
    stdout: lines.length ? `${lines.join('\n')}\n` : '',
    stderr: errors.join('\n'),
    exitCode: errors.length ? 1 : 0,
    mutated,
  }
}

const dryRun = (args: Args) =>
  (value(args, 'dry-run') ?? (has(args, 'dry-run') ? 'client' : '')) !== '' &&
  value(args, 'dry-run') !== 'none'

function createResult(ctx: ShellContext, args: Args, object: Resource): KubectlResult {
  const info = kindInfo(object.kind) as KindInfo
  if (dryRun(args)) {
    const output = value(args, 'o', 'output')
    if (output === 'yaml') return ok(toYaml(object))
    if (output === 'json') return ok(JSON.stringify(object, null, 4))
    return ok(`${qualified(info)}/${object.metadata.name} created (dry run)`)
  }
  const result = applyObject(ctx.cluster, object, nsOf(ctx, args))
  if (!result.ok) return fail(result.message)
  if (result.verb !== 'created')
    return fail(
      `error: failed to create ${info.singular}: ${info.group ? `${info.plural}.${info.group}` : info.plural} "${object.metadata.name}" already exists`,
    )
  return ok(`${result.label} created`, true)
}

function create(ctx: ShellContext, args: Args): KubectlResult {
  if (value(args, 'f', 'filename')) return apply(ctx, args, true)
  const [what, ...rest] = args.pos
  const namespace = nsOf(ctx, args)
  const meta = (name: string, labels?: Labels) => ({
    name,
    namespace,
    ...(labels ? { labels } : {}),
  })
  switch (kindInfo(what ?? '')?.kind ?? what) {
    case 'Namespace': {
      const name = rest[0]
      if (!name) return fail('error: exactly one NAME is required, got 0')
      return createResult(ctx, args, { apiVersion: 'v1', kind: 'Namespace', metadata: { name } })
    }
    case 'Deployment': {
      const name = rest[0]
      const image = values(args, 'image')
      if (!name) return fail('error: exactly one NAME is required, got 0')
      if (image.length === 0) return fail('error: required flag(s) "image" not set')
      const labels = { app: name }
      const port = value(args, 'port')
      const deployment: Deployment = {
        apiVersion: 'apps/v1',
        kind: 'Deployment',
        metadata: meta(name, labels),
        spec: {
          replicas: Number(value(args, 'replicas') ?? 1),
          selector: { matchLabels: labels },
          template: {
            metadata: { labels },
            spec: {
              containers: image.map((entry) => ({
                name: (entry.split('/').pop() ?? entry).split(':')[0].replace(/[^a-z0-9-]/g, '-'),
                image: entry,
                ...(port ? { ports: [{ containerPort: Number(port) }] } : {}),
                ...(args.after?.length ? { command: args.after } : {}),
              })),
            },
          },
        },
      }
      return createResult(ctx, args, deployment)
    }
    case 'ConfigMap': {
      const name = rest[0]
      if (!name) return fail('error: exactly one NAME is required, got 0')
      const data: Labels = {}
      for (const literal of values(args, 'from-literal')) {
        const [key, ...val] = literal.split('=')
        data[key] = val.join('=')
      }
      for (const source of values(args, 'from-file')) {
        const [key, path] = source.includes('=')
          ? source.split('=')
          : [source.split('/').pop() as string, source]
        const text = ctx.files[path.replace(/^\.\//, '')]
        if (text === undefined)
          return fail(`error: error reading ${path}: no such file or directory`)
        data[key] = text
      }
      return createResult(ctx, args, {
        apiVersion: 'v1',
        kind: 'ConfigMap',
        metadata: meta(name),
        data,
      })
    }
    case 'Secret': {
      const [type, name] = rest
      if (!name) return fail('error: exactly one NAME is required, got 0')
      if (type === 'docker-registry') {
        const server = value(args, 'docker-server') ?? 'https://index.docker.io/v1/'
        const username = value(args, 'docker-username')
        const password = value(args, 'docker-password')
        if (!username || !password)
          return fail(
            'error: either --from-file or the combination of --docker-username, --docker-password and --docker-server is required',
          )
        const config = {
          auths: {
            [server]: {
              username,
              password,
              ...(value(args, 'docker-email') ? { email: value(args, 'docker-email') } : {}),
              auth: toBase64(`${username}:${password}`),
            },
          },
        }
        const secret: Secret = {
          apiVersion: 'v1',
          kind: 'Secret',
          metadata: meta(name),
          type: 'kubernetes.io/dockerconfigjson',
          data: { '.dockerconfigjson': toBase64(JSON.stringify(config)) },
        }
        return createResult(ctx, args, secret)
      }
      if (type === 'generic') {
        const data: Labels = {}
        for (const literal of values(args, 'from-literal')) {
          const [key, ...val] = literal.split('=')
          data[key] = toBase64(val.join('='))
        }
        return createResult(ctx, args, {
          apiVersion: 'v1',
          kind: 'Secret',
          metadata: meta(name),
          type: 'Opaque',
          data,
        })
      }
      return fail(
        `error: unknown secret type "${type ?? ''}" - the lab supports generic and docker-registry`,
      )
    }
    case 'Ingress': {
      const name = rest[0]
      if (!name) return fail('error: exactly one NAME is required, got 0')
      const rules: NonNullable<Ingress['spec']['rules']> = []
      for (const rule of values(args, 'rule')) {
        const match = /^([^/]*)(\/[^=]*)=([\w-]+):(\w+)$/.exec(rule)
        if (!match)
          return fail(
            `error: rule ${rule} is invalid and should be in format host/path=svcname:svcport[,tls[=secret]]`,
          )
        const [, host, rawPath, service, port] = match
        const prefix = rawPath.endsWith('*')
        const entry = {
          path: prefix ? rawPath.slice(0, -1) || '/' : rawPath,
          pathType: prefix ? 'Prefix' : 'Exact',
          backend: {
            service: {
              name: service,
              port: /^\d+$/.test(port) ? { number: Number(port) } : { name: port },
            },
          },
        }
        const existing = rules.find((item) => (item.host ?? '') === host)
        if (existing) existing.http?.paths.push(entry)
        else rules.push({ ...(host ? { host } : {}), http: { paths: [entry] } })
      }
      return createResult(ctx, args, {
        apiVersion: 'networking.k8s.io/v1',
        kind: 'Ingress',
        metadata: meta(name),
        spec: {
          ...(value(args, 'class') ? { ingressClassName: value(args, 'class') } : {}),
          rules,
        },
      })
    }
    case 'Service': {
      const [type, name] = rest
      if (!name) return fail('error: exactly one NAME is required, got 0')
      const ports = values(args, 'tcp').map((pair) => {
        const [port, target] = pair.split(':')
        return {
          name: `${port}-${target ?? port}`,
          port: Number(port),
          targetPort: Number(target ?? port),
          protocol: 'TCP',
        }
      })
      const kindType =
        type === 'nodeport' ? 'NodePort' : type === 'loadbalancer' ? 'LoadBalancer' : 'ClusterIP'
      return createResult(ctx, args, {
        apiVersion: 'v1',
        kind: 'Service',
        metadata: meta(name, { app: name }),
        spec: { type: kindType, selector: { app: name }, ports },
      })
    }
    default:
      return fail(
        `error: unknown or unsupported create command "${what ?? ''}" - the lab supports deployment, configmap, secret generic|docker-registry, namespace, ingress, service and -f FILE`,
      )
  }
}

function expose(ctx: ShellContext, args: Args): KubectlResult {
  const deployment = deploymentFrom(ctx, args)
  if (typeof deployment === 'string') return fail(deployment)
  const port =
    value(args, 'port') ??
    String(deployment.spec.template.spec.containers[0]?.ports?.[0]?.containerPort ?? '')
  if (!port)
    return fail(
      "error: couldn't find port via --port flag or introspection\nSee 'kubectl expose -h' for help and examples",
    )
  const target = value(args, 'target-port') ?? port
  const name = value(args, 'name') ?? deployment.metadata.name
  const service = {
    apiVersion: 'v1',
    kind: 'Service' as const,
    metadata: {
      name,
      namespace: deployment.metadata.namespace,
      labels: deployment.metadata.labels ?? {},
    },
    spec: {
      type: value(args, 'type') ?? 'ClusterIP',
      selector: deployment.spec.selector.matchLabels ?? {},
      ports: [
        {
          port: Number(port),
          protocol: 'TCP',
          targetPort: /^\d+$/.test(target) ? Number(target) : target,
        },
      ],
    },
  }
  if (dryRun(args)) return createResult(ctx, args, service)
  const result = applyObject(ctx.cluster, service, deployment.metadata.namespace ?? 'default')
  if (!result.ok) return fail(result.message)
  if (result.verb !== 'created')
    return fail(`Error from server (AlreadyExists): services "${name}" already exists`)
  return ok(`service/${name} exposed`, true)
}

function remove(ctx: ShellContext, args: Args): KubectlResult {
  const namespace = nsOf(ctx, args)
  const lines: string[] = []
  const errors: string[] = []
  const deleted = (info: KindInfo, name: string, ns?: string) => {
    lines.push(
      `${qualified(info)} "${name}" deleted${info.namespaced ? ` from ${ns ?? namespace} namespace` : ''}`,
    )
    ctx.cluster.deleted.push(`${info.kind}/${ns ?? (info.namespaced ? namespace : '')}/${name}`)
  }
  const deleteOne = (info: KindInfo, name: string, ns = namespace) => {
    if (info.kind === 'Pod') {
      const pod = ctx.cluster.pods.find((entry) => entry.name === name && entry.namespace === ns)
      if (!pod) return errors.push(notFound(info, name))
      ctx.cluster.pods = ctx.cluster.pods.filter((entry) => entry !== pod)
      return deleted(info, name, ns)
    }
    if (info.kind === 'ReplicaSet') {
      const rs = ctx.cluster.replicaSets.find(
        (entry) => entry.name === name && entry.namespace === ns,
      )
      if (!rs) return errors.push(notFound(info, name))
      ctx.cluster.replicaSets = ctx.cluster.replicaSets.filter((entry) => entry !== rs)
      ctx.cluster.pods = ctx.cluster.pods.filter(
        (pod) => !(pod.owner === rs.name && pod.namespace === ns),
      )
      return deleted(info, name, ns)
    }
    if (info.kind === 'Node') {
      if (!ctx.cluster.nodes.some((node) => node.name === name))
        return errors.push(notFound(info, name))
      return errors.push(
        `(lab) deleting nodes is not simulated - AKS manages node pools (az aks nodepool).`,
      )
    }
    if (!info.stored)
      return errors.push(`error: ${info.plural} are managed by their controllers in the lab`)
    const object = findObject(
      ctx.cluster,
      info.kind as ResourceKind,
      name,
      info.namespaced ? ns : undefined,
    )
    if (!object) return errors.push(notFound(info, name))
    if (
      object.kind === 'Namespace' &&
      ['default', 'kube-system', 'kube-public', 'kube-node-lease'].includes(name)
    )
      return errors.push(
        `Error from server (Forbidden): namespaces "${name}" is forbidden: this namespace may not be deleted`,
      )
    ctx.cluster.objects = ctx.cluster.objects.filter((entry) => entry !== object)
    if (object.kind === 'Namespace') {
      ctx.cluster.objects = ctx.cluster.objects.filter((entry) => entry.metadata.namespace !== name)
      ctx.cluster.pods = ctx.cluster.pods.filter((pod) => pod.namespace !== name)
    }
    return deleted(info, name, ns)
  }
  if (value(args, 'f', 'filename')) {
    const file = fileArg(ctx, args)
    if (typeof file === 'string') return fail(file)
    const docs = parseManifests(file.text, file.name)
    if (typeof docs === 'string') return fail(docs)
    for (const doc of docs) {
      const object = doc as { kind?: string; metadata?: { name?: string; namespace?: string } }
      const info = kindInfo(object.kind ?? '')
      if (!info) continue
      deleteOne(info, object.metadata?.name ?? '', object.metadata?.namespace ?? namespace)
    }
  } else {
    const targets = parseTargets(args.pos)
    if (targets === 'none')
      return fail(
        "error: You must provide one or more resources by argument or filename.\nExample resource specifications include:\n   '-f rsrc.yaml'\n   '--filename=rsrc.json'\n   '<resource> <name>'\n   '<resource>'",
      )
    if (typeof targets === 'string') return fail(targets)
    const selector = parseSelector(value(args, 'l', 'selector'))
    for (const target of targets) {
      let names = target.names
      if (names.length === 0) {
        if (!selector && !has(args, 'all'))
          return fail('error: resource(s) were provided, but no name was specified')
        names = itemsOf(ctx, target.info, target.info.namespaced ? namespace : null)
          .filter((item) => !selector || selector(item.labels))
          .map((item) => item.name)
        if (names.length === 0) errors.push(noResources(namespace))
      }
      for (const name of names) deleteOne(target.info, name)
    }
  }
  if (has(args, 'force') && value(args, 'grace-period') === '0')
    lines.unshift(
      'Warning: Immediate deletion does not wait for confirmation that the running resource has been terminated. The resource may continue to run on the cluster indefinitely.',
    )
  return {
    stdout: lines.length ? `${lines.join('\n')}\n` : '',
    stderr: errors.join('\n'),
    exitCode: errors.length && !lines.length ? 1 : 0,
    mutated: lines.length > 0,
  }
}

/* ---------- rollout ---------- */

function templateSummary(template: Deployment['spec']['template']) {
  const lines = ['Pod Template:', `  Labels:\t${labelText(template.metadata?.labels)}`]
  if (template.metadata?.annotations)
    lines.push(
      `  Annotations:\t${Object.entries(template.metadata.annotations)
        .map(([key, val]) => `${key}: ${val}`)
        .join('\n\t\t')}`,
    )
  lines.push('  Containers:')
  for (const container of template.spec.containers) {
    lines.push(`   ${container.name}:`, `    Image:\t${container.image}`)
    lines.push(
      `    Port:\t${container.ports?.map((port) => `${port.containerPort}/${port.protocol ?? 'TCP'}`).join(', ') ?? '<none>'}`,
    )
    if (container.command)
      lines.push(`    Command:\n${container.command.map((part) => `      ${part}`).join('\n')}`)
    if (container.args)
      lines.push(`    Args:\n${container.args.map((part) => `      ${part}`).join('\n')}`)
    const env = container.env ?? []
    lines.push(
      env.length
        ? `    Environment:\n${env.map((entry) => `      ${entry.name}:\t${entry.value ?? '<set from a ConfigMap or Secret>'}`).join('\n')}`
        : '    Environment:\t<none>',
    )
    lines.push('    Mounts:\t<none>')
  }
  lines.push('  Volumes:\t<none>')
  return lines.join('\n')
}

function rollout(ctx: ShellContext, args: Args): KubectlResult {
  const [action, ...rest] = args.pos
  const sub = { ...args, pos: rest }
  const deployment = deploymentFrom(ctx, sub)
  if (!action)
    return fail('error: specify a rollout command: history, pause, restart, resume, status or undo')
  if (typeof deployment === 'string') return fail(deployment)
  const name = deployment.metadata.name
  const { cluster } = ctx
  switch (action) {
    case 'status': {
      const status = deploymentStatus(cluster, deployment)
      const desired = deployment.spec.replicas ?? 1
      if (status.complete) return ok(`deployment "${name}" successfully rolled out`)
      const lines: string[] = []
      if (status.updated < desired)
        lines.push(
          `Waiting for deployment "${name}" rollout to finish: ${status.updated} out of ${desired} new replicas have been updated...`,
        )
      else if (status.replicas > status.updated)
        lines.push(
          `Waiting for deployment "${name}" rollout to finish: ${status.replicas - status.updated} old replicas are pending termination...`,
        )
      else
        lines.push(
          `Waiting for deployment "${name}" rollout to finish: ${status.available} of ${desired} updated replicas are available...`,
        )
      if (status.progressing.reason === 'ProgressDeadlineExceeded')
        return fail(
          `error: deployment "${name}" exceeded its progress deadline`,
          1,
          `${lines.join('\n')}\n`,
        )
      return {
        stdout: `${lines.join('\n')}\n`,
        stderr:
          '(lab) a real terminal keeps waiting here. The new Pods are not becoming Ready - look at them with kubectl get pods / describe.',
        exitCode: 1,
      }
    }
    case 'history': {
      const sets = revisions(cluster, deployment)
      const wanted = value(sub, 'revision')
      if (wanted) {
        const rs = sets.find((entry) => String(entry.revision) === wanted)
        if (!rs) return fail(`error: unable to find the specified revision`)
        const template = clone(rs.template)
        return ok(`deployment.apps/${name} with revision #${wanted}\n${templateSummary(template)}`)
      }
      if (sets.length === 0) return ok(`No rollout history found in deployment "${name}"`)
      return ok(
        `deployment.apps/${name} \n${table([['REVISION', 'CHANGE-CAUSE'], ...sets.map((rs) => [String(rs.revision), rs.changeCause ?? '<none>'])])}\n`,
      )
    }
    case 'undo': {
      const sets = revisions(cluster, deployment)
      const current = deploymentStatus(cluster, deployment).current
      const wanted = value(sub, 'to-revision')
      let target =
        wanted && wanted !== '0'
          ? sets.find((entry) => String(entry.revision) === wanted)
          : sets.filter((entry) => entry !== current).pop()
      if (wanted && wanted !== '0' && !target)
        return fail(`error: unable to find specified revision ${wanted} in history`)
      if (!target) return fail(`error: no rollout history found for deployment "${name}"`)
      if (target === current)
        return ok(
          `deployment.apps/${name} skipped rollback (current template already matches revision ${target.revision})`,
        )
      target = clone(target)
      const template = clone(target.template)
      if (template.metadata?.labels) delete template.metadata.labels['pod-template-hash']
      const draft = clone(deployment)
      draft.spec.template = template
      if (target.changeCause)
        draft.metadata.annotations = {
          ...draft.metadata.annotations,
          'kubernetes.io/change-cause': target.changeCause,
        }
      const result = updateObject(cluster, deployment, draft)
      if (!result.ok) return fail(result.message)
      return ok(`deployment.apps/${name} rolled back`, true)
    }
    case 'restart': {
      const draft = clone(deployment)
      draft.spec.template.metadata = {
        ...draft.spec.template.metadata,
        annotations: {
          ...draft.spec.template.metadata?.annotations,
          'kubectl.kubernetes.io/restartedAt': isoAt(cluster.now),
        },
      }
      const result = updateObject(cluster, deployment, draft)
      if (!result.ok) return fail(result.message)
      return ok(`deployment.apps/${name} restarted`, true)
    }
    case 'pause':
    case 'resume': {
      const draft = clone(deployment)
      const paused = action === 'pause'
      if (Boolean(deployment.spec.paused) === paused)
        return fail(
          `error: deployments.apps "${name}" is ${paused ? 'already paused' : 'not paused'}`,
        )
      if (paused) draft.spec.paused = true
      else delete draft.spec.paused
      const result = updateObject(cluster, deployment, draft)
      if (!result.ok) return fail(result.message)
      return ok(`deployment.apps/${name} ${paused ? 'paused' : 'resumed'}`, true)
    }
    default:
      return fail(`error: unknown command "${action}" for "kubectl rollout"`)
  }
}

/* ---------- top / config / misc ---------- */

function top(ctx: ShellContext, args: Args): KubectlResult {
  const [what] = args.pos
  const { cluster } = ctx
  if (what === 'node' || what === 'nodes' || what === 'no') {
    const rows = cluster.nodes.map((node) => {
      const pods = cluster.pods
        .filter((pod) => pod.nodeName === node.name)
        .map((pod) => podView(cluster, pod))
      const cpu =
        140 +
        pods.reduce(
          (sum, view) => sum + view.containers.reduce((total, entry) => total + entry.cpu, 0),
          0,
        )
      const memory =
        1180 +
        pods.reduce(
          (sum, view) => sum + view.containers.reduce((total, entry) => total + entry.memory, 0),
          0,
        )
      return [
        node.name,
        `${cpu}m`,
        `${Math.round((cpu / node.cpu) * 100)}%`,
        `${Math.round(memory)}Mi`,
        `${Math.round((memory / node.memory) * 100)}%`,
      ]
    })
    return ok(table([['NAME', 'CPU(cores)', 'CPU(%)', 'MEMORY(bytes)', 'MEMORY(%)'], ...rows]))
  }
  if (what === 'pod' || what === 'pods' || what === 'po') {
    const namespace = allNs(args) ? null : nsOf(ctx, args)
    const selector = parseSelector(value(args, 'l', 'selector'))
    const name = args.pos[1]
    const pods = cluster.pods.filter(
      (pod) =>
        (namespace === null || pod.namespace === namespace) &&
        (!selector || selector(pod.labels)) &&
        (!name || pod.name === name),
    )
    const views = pods
      .map((pod) => podView(cluster, pod))
      .filter((view) => view.containers.some((entry) => entry.state === 'running'))
    if (name && views.length === 0) return fail(`error: metrics not available yet`)
    if (views.length === 0) return fail(noResources(namespace), 0)
    const containers = has(args, 'containers')
    const rows = views.flatMap((view) =>
      containers
        ? view.containers
            .filter((entry) => entry.state === 'running')
            .map((entry) => [
              ...(namespace === null ? [view.pod.namespace] : []),
              view.pod.name,
              entry.name,
              `${entry.cpu}m`,
              `${Math.round(entry.memory)}Mi`,
            ])
        : [
            [
              ...(namespace === null ? [view.pod.namespace] : []),
              view.pod.name,
              `${view.containers.reduce((sum, entry) => sum + entry.cpu, 0)}m`,
              `${Math.round(view.containers.reduce((sum, entry) => sum + entry.memory, 0))}Mi`,
            ],
          ],
    )
    const header = [
      ...(namespace === null ? ['NAMESPACE'] : []),
      ...(containers ? ['POD', 'NAME'] : ['NAME']),
      'CPU(cores)',
      'MEMORY(bytes)',
    ]
    return ok(table([header, ...rows]))
  }
  return fail('error: specify a resource: kubectl top pods | kubectl top nodes')
}

function config(ctx: ShellContext, args: Args): KubectlResult {
  const [action] = args.pos
  const { cluster } = ctx
  switch (action) {
    case 'set-context': {
      const ns = value(args, 'namespace')
      if (!has(args, 'current') && args.pos[1] !== CLUSTER_NAME)
        return fail(`error: you must specify a context name or --current`)
      if (ns !== undefined) cluster.namespace = ns
      return ok(`Context "${CLUSTER_NAME}" modified.`)
    }
    case 'current-context':
      return ok(CLUSTER_NAME)
    case 'get-contexts':
      return ok(
        table([
          ['CURRENT', 'NAME', 'CLUSTER', 'AUTHINFO', 'NAMESPACE'],
          [
            '*',
            CLUSTER_NAME,
            CLUSTER_NAME,
            `clusterUser_rg-lab_${CLUSTER_NAME}`,
            cluster.namespace,
          ],
        ]),
      )
    case 'use-context':
      return args.pos[1] === CLUSTER_NAME
        ? ok(`Switched to context "${CLUSTER_NAME}".`)
        : fail(`error: no context exists with the name: "${args.pos[1] ?? ''}"`)
    case 'view': {
      const output = value(args, 'o', 'output')
      const doc = {
        apiVersion: 'v1',
        clusters: [
          {
            cluster: {
              'certificate-authority-data': 'DATA+OMITTED',
              server: 'https://aks-lab-dns-4f2k9q.hcp.westeurope.azmk8s.io:443',
            },
            name: CLUSTER_NAME,
          },
        ],
        contexts: [
          {
            context: {
              cluster: CLUSTER_NAME,
              namespace: cluster.namespace,
              user: `clusterUser_rg-lab_${CLUSTER_NAME}`,
            },
            name: CLUSTER_NAME,
          },
        ],
        'current-context': CLUSTER_NAME,
        kind: 'Config',
        users: [
          {
            name: `clusterUser_rg-lab_${CLUSTER_NAME}`,
            user: {
              exec: {
                command: 'kubelogin',
                args: [
                  'get-token',
                  '--login',
                  'azurecli',
                  '--server-id',
                  '6dae42f8-4368-4678-94ff-3960e28e3630',
                ],
              },
            },
          },
        ],
      }
      if (output?.startsWith('jsonpath')) {
        try {
          return ok(jsonpath(doc, output.replace(/^jsonpath=?/, '')))
        } catch (error) {
          return fail(error instanceof Error ? error.message : String(error))
        }
      }
      return ok(toYaml(doc))
    }
    default:
      return fail(
        `error: unknown command "${action ?? ''}" for "kubectl config" - try set-context --current --namespace=NS, current-context, get-contexts or view`,
      )
  }
}

function wait(ctx: ShellContext, args: Args): KubectlResult {
  const condition = value(args, 'for') ?? ''
  const targets = parseTargets(args.pos)
  if (targets === 'none' || typeof targets === 'string')
    return fail('error: resource(s) were provided, but no name was specified')
  const lines: string[] = []
  for (const target of targets)
    for (const name of target.names) {
      let met = false
      if (target.info.kind === 'Deployment') {
        const deployment = findObject(ctx.cluster, 'Deployment', name, nsOf(ctx, args))
        if (!deployment) return fail(notFound(target.info, name))
        met = /available/i.test(condition)
          ? deploymentStatus(ctx.cluster, deployment).availableCondition.status === 'True'
          : deploymentStatus(ctx.cluster, deployment).complete
      } else if (target.info.kind === 'Pod') {
        const pod = ctx.cluster.pods.find(
          (entry) => entry.name === name && entry.namespace === nsOf(ctx, args),
        )
        if (!pod) return fail(notFound(target.info, name))
        met = podView(ctx.cluster, pod).ready
      }
      if (!met)
        return fail(`error: timed out waiting for the condition on ${target.info.plural}/${name}`)
      lines.push(`${qualified(target.info)}/${name} condition met`)
    }
  return ok(lines.join('\n'))
}

const VERBS = [
  'get',
  'describe',
  'logs',
  'exec',
  'run',
  'create',
  'expose',
  'apply',
  'delete',
  'edit',
  'patch',
  'label',
  'annotate',
  'scale',
  'set',
  'rollout',
  'top',
  'config',
  'taint',
  'cordon',
  'uncordon',
  'drain',
  'version',
  'cluster-info',
  'api-resources',
  'explain',
  'port-forward',
  'debug',
  'auth',
  'wait',
  'help',
  'replace',
]
export const KUBECTL_VERBS = VERBS

const HELP = `kubectl controls the Kubernetes cluster manager (lab edition).

 Basic Commands:
  create        Create a resource from a file or from stdin (deployment, configmap, secret, namespace, ingress)
  expose        Take a deployment and expose it as a new Kubernetes service
  run           Run a particular image on the cluster (with --rm -it: a throwaway debug Pod)
  set           Set specific features on objects (image, resources, env)
  get           Display one or many resources
  edit          (not interactive here - use get -o yaml > file, edit in Files, then apply)
  delete        Delete resources by file names, resource and names, or by label selector

 Deploy Commands:
  rollout       Manage the rollout of a resource (status, history, undo, restart, pause, resume)
  scale         Set a new size for a deployment

 Cluster Management Commands:
  top           Display resource (CPU/memory) usage
  cordon / uncordon / taint   Node scheduling

 Troubleshooting and Debugging Commands:
  describe      Show details of a specific resource or group of resources
  logs          Print the logs for a container in a pod (-p for the previous instance)
  exec          Execute a command in a container (kubectl exec POD -- curl ...)

 Advanced Commands:
  apply         Apply a configuration to a resource by file name
  patch         Update fields of a resource (--type strategic|merge|json)
  wait          Wait for a specific condition on one or many resources

 Settings Commands:
  label / annotate  Update the labels / annotations on a resource

 Other Commands:
  api-resources, config, version, cluster-info

Usage:
  kubectl [flags] [options]`

function editDistance(a: string, b: string) {
  const row = Array.from({ length: b.length + 1 }, (_, index) => index)
  for (let i = 1; i <= a.length; i++) {
    let previous = row[0]
    row[0] = i
    for (let j = 1; j <= b.length; j++) {
      const current = row[j]
      row[j] = Math.min(row[j] + 1, row[j - 1] + 1, previous + (a[i - 1] === b[j - 1] ? 0 : 1))
      previous = current
    }
  }
  return row[b.length]
}

/** Runs `kubectl <args>`. */
export function kubectl(ctx: ShellContext, argv: string[]): KubectlResult {
  const [verb, ...rest] = argv
  if (!verb || verb === 'help' || verb === '--help' || verb === '-h') return ok(HELP)
  if (rest.includes('--help') || rest.includes('-h'))
    return ok(
      `(lab) see the kubectl reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_${verb}/\nType "help" for what the lab supports.`,
    )
  const args = parseArgs(rest, verb === 'patch' ? ['p'] : [])
  switch (verb) {
    case 'get':
      return get(ctx, args)
    case 'describe':
      return describe(ctx, args)
    case 'logs':
    case 'log':
      return logs(ctx, args)
    case 'exec':
      return exec(ctx, args)
    case 'run':
      return run(ctx, args)
    case 'create':
      return create(ctx, args)
    case 'expose':
      return expose(ctx, args)
    case 'apply':
      return apply(ctx, args)
    case 'replace':
      return apply(ctx, args)
    case 'delete':
      return remove(ctx, args)
    case 'patch':
      return patch(ctx, args)
    case 'label':
      return labelOrAnnotate(ctx, args, 'labels')
    case 'annotate':
      return labelOrAnnotate(ctx, args, 'annotations')
    case 'scale':
      return scale(ctx, args)
    case 'set': {
      const [what, ...others] = args.pos
      const sub = { ...args, pos: others }
      if (what === 'image') return setImage(ctx, sub)
      if (what === 'resources') return setResources(ctx, sub)
      if (what === 'env') return setEnv(ctx, sub)
      return fail(
        `error: unknown command "${what ?? ''}" for "kubectl set" - the lab supports image, resources and env`,
      )
    }
    case 'rollout':
      return rollout(ctx, args)
    case 'top':
      return top(ctx, args)
    case 'config':
      return config(ctx, args)
    case 'taint':
      return taint(ctx, args)
    case 'cordon':
      return cordon(ctx, args, true)
    case 'uncordon':
      return cordon(ctx, args, false)
    case 'drain':
      return fail(
        '(lab) drain is not simulated - cordon the node, then delete its Pods so their controllers recreate them elsewhere.',
      )
    case 'wait':
      return wait(ctx, args)
    case 'edit':
      return fail(
        `(lab) kubectl edit opens an interactive editor, which this terminal does not have.\nDo it the GitOps way instead:\n  kubectl get ${args.pos.join(' ') || 'deployment NAME'} -o yaml > ${(args.pos[1] ?? args.pos[0]?.split('/')[1] ?? 'manifest').replace(/[^\w.-]/g, '')}.yaml\n  (edit it in the Files tab)\n  kubectl apply -f ${(args.pos[1] ?? args.pos[0]?.split('/')[1] ?? 'manifest').replace(/[^\w.-]/g, '')}.yaml\nOr change one field with kubectl patch / set image / set resources / set env.`,
      )
    case 'version':
      return ok(
        has(args, 'client')
          ? 'Client Version: v1.35.0\nKustomize Version: v5.7.1'
          : 'Client Version: v1.35.0\nKustomize Version: v5.7.1\nServer Version: v1.34.4',
      )
    case 'cluster-info':
      return ok(
        "Kubernetes control plane is running at https://aks-lab-dns-4f2k9q.hcp.westeurope.azmk8s.io:443\nCoreDNS is running at https://aks-lab-dns-4f2k9q.hcp.westeurope.azmk8s.io:443/api/v1/namespaces/kube-system/services/kube-dns:dns/proxy\nMetrics-server is running at https://aks-lab-dns-4f2k9q.hcp.westeurope.azmk8s.io:443/api/v1/namespaces/kube-system/services/https:metrics-server:/proxy\n\nTo further debug and diagnose cluster problems, use 'kubectl cluster-info dump'.",
      )
    case 'api-resources':
      return ok(
        table([
          ['NAME', 'SHORTNAMES', 'APIVERSION', 'NAMESPACED', 'KIND'],
          ...KINDS.map((info) => [
            info.plural,
            info.short.join(','),
            info.group ? `${info.group}/${info.version}` : info.version,
            String(info.namespaced),
            info.kind,
          ]),
        ]),
      )
    case 'explain':
      return fail(
        '(lab) kubectl explain is not simulated - the API reference is at https://kubernetes.io/docs/reference/kubernetes-api/',
      )
    case 'port-forward':
      return fail(
        '(lab) port-forward is not simulated. Test from inside the cluster instead:\n  kubectl exec POD -- curl -s http://SERVICE:PORT/path\nor from outside through the ingress: curl http://HOST/path',
      )
    case 'debug':
      return fail(
        '(lab) kubectl debug is not simulated. For a throwaway shell with tools, run:\n  kubectl run tmp --rm -it --image=curlimages/curl --restart=Never -- curl -s http://SERVICE:PORT/',
      )
    case 'auth':
      return args.pos[0] === 'can-i'
        ? ok('yes')
        : ok(`Username: learner@contoso.com\nGroups: [system:authenticated]`)
    default: {
      const close = VERBS.filter((entry) => editDistance(entry, verb) <= 2)
      return fail(
        `error: unknown command "${verb}" for "kubectl"${close.length ? `\n\nDid you mean this?\n\t${close.join('\n\t')}` : ''}\nRun 'kubectl --help' for usage.`,
      )
    }
  }
}

/** Names for tab completion. */
export function completionNames(ctx: ShellContext, kind: string, namespace: string): string[] {
  const info = kindInfo(kind)
  if (!info) return []
  return itemsOf(ctx, info, info.namespaced ? namespace : null).map((item) => item.name)
}
