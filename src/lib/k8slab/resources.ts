import {
  claimState,
  deploymentReplicaSets,
  deploymentStatus,
  findObject,
  ingressClassOf,
  podView,
  podsOf,
  rsSelector,
  serviceEndpoints,
  stamp,
} from './cluster'
import type {
  Cluster,
  Deployment,
  Ingress,
  NodeRecord,
  PersistentVolumeClaim,
  PodRecord,
  ReplicaSetRecord,
  Resource,
  ResourceKind,
  Service,
} from './types'
import { clone, isoAt, matchesSelector, secondsOf, stableJson } from './util'

/**
 * Resource types (names, short names, API groups), apply/patch with the
 * API server's validation, and the JSON a `get -o yaml` prints.
 */

export interface KindInfo {
  kind: string
  plural: string
  singular: string
  short: string[]
  group: string
  version: string
  namespaced: boolean
  /** The learner can create / change it. */
  stored: boolean
}

export const KINDS: KindInfo[] = [
  {
    kind: 'Pod',
    plural: 'pods',
    singular: 'pod',
    short: ['po'],
    group: '',
    version: 'v1',
    namespaced: true,
    stored: false,
  },
  {
    kind: 'Deployment',
    plural: 'deployments',
    singular: 'deployment',
    short: ['deploy'],
    group: 'apps',
    version: 'v1',
    namespaced: true,
    stored: true,
  },
  {
    kind: 'ReplicaSet',
    plural: 'replicasets',
    singular: 'replicaset',
    short: ['rs'],
    group: 'apps',
    version: 'v1',
    namespaced: true,
    stored: false,
  },
  {
    kind: 'Service',
    plural: 'services',
    singular: 'service',
    short: ['svc'],
    group: '',
    version: 'v1',
    namespaced: true,
    stored: true,
  },
  {
    kind: 'Endpoints',
    plural: 'endpoints',
    singular: 'endpoints',
    short: ['ep'],
    group: '',
    version: 'v1',
    namespaced: true,
    stored: false,
  },
  {
    kind: 'EndpointSlice',
    plural: 'endpointslices',
    singular: 'endpointslice',
    short: [],
    group: 'discovery.k8s.io',
    version: 'v1',
    namespaced: true,
    stored: false,
  },
  {
    kind: 'Ingress',
    plural: 'ingresses',
    singular: 'ingress',
    short: ['ing'],
    group: 'networking.k8s.io',
    version: 'v1',
    namespaced: true,
    stored: true,
  },
  {
    kind: 'IngressClass',
    plural: 'ingressclasses',
    singular: 'ingressclass',
    short: [],
    group: 'networking.k8s.io',
    version: 'v1',
    namespaced: false,
    stored: true,
  },
  {
    kind: 'ConfigMap',
    plural: 'configmaps',
    singular: 'configmap',
    short: ['cm'],
    group: '',
    version: 'v1',
    namespaced: true,
    stored: true,
  },
  {
    kind: 'Secret',
    plural: 'secrets',
    singular: 'secret',
    short: [],
    group: '',
    version: 'v1',
    namespaced: true,
    stored: true,
  },
  {
    kind: 'PersistentVolumeClaim',
    plural: 'persistentvolumeclaims',
    singular: 'persistentvolumeclaim',
    short: ['pvc'],
    group: '',
    version: 'v1',
    namespaced: true,
    stored: true,
  },
  {
    kind: 'PersistentVolume',
    plural: 'persistentvolumes',
    singular: 'persistentvolume',
    short: ['pv'],
    group: '',
    version: 'v1',
    namespaced: false,
    stored: false,
  },
  {
    kind: 'StorageClass',
    plural: 'storageclasses',
    singular: 'storageclass',
    short: ['sc'],
    group: 'storage.k8s.io',
    version: 'v1',
    namespaced: false,
    stored: true,
  },
  {
    kind: 'ServiceAccount',
    plural: 'serviceaccounts',
    singular: 'serviceaccount',
    short: ['sa'],
    group: '',
    version: 'v1',
    namespaced: true,
    stored: true,
  },
  {
    kind: 'Namespace',
    plural: 'namespaces',
    singular: 'namespace',
    short: ['ns'],
    group: '',
    version: 'v1',
    namespaced: false,
    stored: true,
  },
  {
    kind: 'Node',
    plural: 'nodes',
    singular: 'node',
    short: ['no'],
    group: '',
    version: 'v1',
    namespaced: false,
    stored: false,
  },
  {
    kind: 'Event',
    plural: 'events',
    singular: 'event',
    short: ['ev'],
    group: '',
    version: 'v1',
    namespaced: true,
    stored: false,
  },
  {
    kind: 'HorizontalPodAutoscaler',
    plural: 'horizontalpodautoscalers',
    singular: 'horizontalpodautoscaler',
    short: ['hpa'],
    group: 'autoscaling',
    version: 'v2',
    namespaced: true,
    stored: false,
  },
]

export function kindInfo(word: string): KindInfo | undefined {
  const text = word.toLowerCase()
  const bare = text.split('.')[0]
  return KINDS.find(
    (entry) =>
      entry.plural === bare ||
      entry.singular === bare ||
      entry.short.includes(bare) ||
      entry.kind.toLowerCase() === bare,
  )
}

/** `deployment.apps`, `service`, `ingress.networking.k8s.io` - as kubectl prints it. */
export const qualified = (info: KindInfo) =>
  info.group ? `${info.singular}.${info.group}` : info.singular

export const apiVersionOf = (info: KindInfo) =>
  info.group ? `${info.group}/${info.version}` : info.version

/* ---------- patches ---------- */

type Json = null | boolean | number | string | Json[] | { [key: string]: Json }
const isObject = (value: unknown): value is Record<string, Json> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

const MERGE_KEYS: Record<string, string> = {
  containers: 'name',
  initContainers: 'name',
  env: 'name',
  volumes: 'name',
  volumeMounts: 'mountPath',
  imagePullSecrets: 'name',
  ports: 'port',
}

/** kubectl's default patch type: lists of containers, env, ports, volumes merge by key. */
export function strategicMerge(target: unknown, patch: unknown, field = ''): unknown {
  if (Array.isArray(patch)) {
    const key = MERGE_KEYS[field]
    if (!key || !Array.isArray(target)) return clone(patch)
    const out = clone(target) as Json[]
    for (const item of patch as Json[]) {
      if (!isObject(item)) {
        out.push(item)
        continue
      }
      const id = (entry: Json) =>
        isObject(entry) ? (entry[key] ?? entry.containerPort ?? entry.name) : undefined
      const wanted = id(item)
      const index = out.findIndex((entry) => wanted !== undefined && id(entry) === wanted)
      if (item.$patch === 'delete') {
        if (index >= 0) out.splice(index, 1)
      } else if (index >= 0) out[index] = strategicMerge(out[index], item, '') as Json
      else out.push(clone(item))
    }
    return out
  }
  if (isObject(patch)) {
    const out: Record<string, unknown> = isObject(target) ? clone(target) : {}
    for (const [key, value] of Object.entries(patch)) {
      if (value === null) delete out[key]
      else out[key] = strategicMerge(out[key], value, key)
    }
    return out
  }
  return patch
}

/** RFC 7386 JSON merge patch: lists are replaced whole. */
export function mergePatch(target: unknown, patch: unknown): unknown {
  if (!isObject(patch)) return clone(patch)
  const out: Record<string, unknown> = isObject(target) ? clone(target) : {}
  for (const [key, value] of Object.entries(patch)) {
    if (value === null) delete out[key]
    else out[key] = mergePatch(out[key], value)
  }
  return out
}

/** RFC 6902 JSON patch (add / remove / replace / test). Throws a kubectl-style message. */
export function jsonPatch(target: unknown, operations: unknown): unknown {
  if (!Array.isArray(operations))
    throw new Error('json: cannot unmarshal object into Go value of type jsonpatch.Patch')
  let doc = clone(target) as Json
  for (const raw of operations) {
    if (!isObject(raw) || typeof raw.op !== 'string' || typeof raw.path !== 'string')
      throw new Error('the server rejected our request due to an error in our request')
    const parts = raw.path
      .split('/')
      .slice(1)
      .map((part) => part.replace(/~1/g, '/').replace(/~0/g, '~'))
    if (parts.length === 0) {
      if (raw.op === 'replace' || raw.op === 'add') doc = clone(raw.value ?? null)
      continue
    }
    let parent: Json = doc
    for (const part of parts.slice(0, -1)) {
      const next: Json | undefined = Array.isArray(parent)
        ? parent[Number(part)]
        : isObject(parent)
          ? parent[part]
          : undefined
      if (next === undefined || next === null)
        throw new Error(`the server rejected our request due to an error in our request`)
      parent = next
    }
    const last = parts[parts.length - 1]
    if (Array.isArray(parent)) {
      const index = last === '-' ? parent.length : Number(last)
      if (Number.isNaN(index) || index < 0 || index > parent.length)
        throw new Error(`the server rejected our request due to an error in our request`)
      if (raw.op === 'add') parent.splice(index, 0, clone(raw.value ?? null))
      else if (raw.op === 'remove' || raw.op === 'replace') {
        if (index >= parent.length)
          throw new Error(`the server rejected our request due to an error in our request`)
        if (raw.op === 'remove') parent.splice(index, 1)
        else parent[index] = clone(raw.value ?? null)
      } else if (raw.op === 'test') {
        if (stableJson(parent[index]) !== stableJson(raw.value))
          throw new Error('testing value failed')
      }
    } else if (isObject(parent)) {
      if (raw.op === 'add') parent[last] = clone(raw.value ?? null)
      else if (raw.op === 'replace' || raw.op === 'remove') {
        if (!(last in parent))
          throw new Error(`the server rejected our request due to an error in our request`)
        if (raw.op === 'remove') delete parent[last]
        else parent[last] = clone(raw.value ?? null)
      } else if (raw.op === 'test') {
        if (stableJson(parent[last]) !== stableJson(raw.value))
          throw new Error('testing value failed')
      }
    } else throw new Error(`the server rejected our request due to an error in our request`)
  }
  return doc
}

/* ---------- validation (the API server's answers) ---------- */

const goMap = (labels: Record<string, string> | undefined) =>
  `map[string]string{${Object.entries(labels ?? {})
    .map(([key, value]) => `"${key}":"${value}"`)
    .join(', ')}}`

function validate(object: Resource, existing: Resource | undefined): string[] {
  const errors: string[] = []
  const name = object.metadata?.name
  if (!name) return ['metadata.name: Required value: name or generateName is required']
  if (!/^[a-z0-9]([-a-z0-9.]*[a-z0-9])?$/.test(name) || name.length > 253)
    errors.push(
      `metadata.name: Invalid value: "${name}": a lowercase RFC 1123 subdomain must consist of lower case alphanumeric characters, '-' or '.', and must start and end with an alphanumeric character`,
    )
  if (object.kind === 'Deployment') {
    const spec = object.spec
    if (!spec?.selector?.matchLabels || Object.keys(spec.selector.matchLabels).length === 0)
      errors.push('spec.selector: Required value')
    else if (!matchesSelector(spec.selector.matchLabels, spec.template?.metadata?.labels))
      errors.push(
        `spec.template.metadata.labels: Invalid value: ${goMap(spec.template?.metadata?.labels)}: \`selector\` does not match template \`labels\``,
      )
    if (!spec?.template?.spec?.containers?.length)
      errors.push('spec.template.spec.containers: Required value')
    spec?.template?.spec?.containers?.forEach((container, index) => {
      if (!container.name)
        errors.push(`spec.template.spec.containers[${index}].name: Required value`)
      if (!container.image)
        errors.push(`spec.template.spec.containers[${index}].image: Required value`)
      for (const [key, quantity] of Object.entries({
        ...container.resources?.requests,
        ...container.resources?.limits,
      }))
        if (!/^\d+(\.\d+)?(m|[KMGT]i?|k)?$/.test(String(quantity)))
          errors.push(
            `spec.template.spec.containers[${index}].resources.requests[${key}]: Invalid value: "${quantity}": must match the regex ^([+-]?[0-9.]+)([eEinumkKMGTP]*[-+]?[0-9]*)$`,
          )
    })
    if (
      existing?.kind === 'Deployment' &&
      stableJson(existing.spec.selector) !== stableJson(spec?.selector)
    )
      errors.push(
        `spec.selector: Invalid value: v1.LabelSelector{MatchLabels:${goMap(spec?.selector?.matchLabels)}, MatchExpressions:[]v1.LabelSelectorRequirement(nil)}: field is immutable`,
      )
    if (spec?.replicas !== undefined && (!Number.isInteger(spec.replicas) || spec.replicas < 0))
      errors.push(
        `spec.replicas: Invalid value: ${spec.replicas}: must be greater than or equal to 0`,
      )
  }
  if (object.kind === 'Service') {
    if (!object.spec?.ports?.length && object.spec?.type !== 'ExternalName')
      errors.push('spec.ports: Required value')
    if (
      existing?.kind === 'Service' &&
      object.spec?.clusterIP &&
      existing.spec.clusterIP !== object.spec.clusterIP
    )
      errors.push(
        `spec.clusterIPs[0]: Invalid value: []string{"${object.spec.clusterIP}"}: may not change once set`,
      )
  }
  if (object.kind === 'Ingress') {
    object.spec?.rules?.forEach((rule, ruleIndex) =>
      rule.http?.paths?.forEach((entry, index) => {
        const at = `spec.rules[${ruleIndex}].http.paths[${index}]`
        if (!entry.pathType)
          errors.push(`${at}.pathType: Required value: pathType must be specified`)
        else if (!['Exact', 'Prefix', 'ImplementationSpecific'].includes(entry.pathType))
          errors.push(
            `${at}.pathType: Unsupported value: "${entry.pathType}": supported values: "Exact", "ImplementationSpecific", "Prefix"`,
          )
        if (
          entry.backend?.service &&
          !entry.backend.service.port?.number &&
          !entry.backend.service.port?.name
        )
          errors.push(
            `${at}.backend.service.port: Invalid value: "": port name or number is required`,
          )
      }),
    )
  }
  if (object.kind === 'PersistentVolumeClaim' && existing?.kind === 'PersistentVolumeClaim') {
    const strip = (claim: PersistentVolumeClaim) => ({
      ...claim.spec,
      resources: undefined,
      volumeName: undefined,
    })
    if (stableJson(strip(existing)) !== stableJson(strip(object)))
      errors.push(
        'spec: Forbidden: spec is immutable after creation except resources.requests and volumeAttributesClassName for bound claims',
      )
  }
  return errors
}

export type ApplyResult =
  | { ok: true; verb: 'created' | 'configured' | 'unchanged'; label: string }
  | { ok: false; message: string }

/** What `kubectl apply` does with one object: create it, or replace its desired state. */
export function applyObject(
  cluster: Cluster,
  raw: unknown,
  defaultNamespace: string,
  source = '-',
): ApplyResult {
  if (!isObject(raw))
    return { ok: false, message: 'error: error validating data: expected a Kubernetes object' }
  const kind = typeof raw.kind === 'string' ? raw.kind : ''
  const apiVersion = typeof raw.apiVersion === 'string' ? raw.apiVersion : ''
  if (!kind || !apiVersion)
    return {
      ok: false,
      message: `error: error validating "${source}": error validating data: [${!apiVersion ? 'apiVersion not set' : ''}${!apiVersion && !kind ? ', ' : ''}${!kind ? 'kind not set' : ''}]; if you choose to ignore these errors, turn validation off with --validate=false`,
    }
  const info = kindInfo(kind)
  const metaName =
    isObject(raw.metadata) && typeof raw.metadata.name === 'string' ? raw.metadata.name : ''
  if (!info || info.kind !== kind || apiVersionOf(info) !== apiVersion) {
    return {
      ok: false,
      message: `error: resource mapping not found for name: "${metaName}" namespace: "" from "${source}": no matches for kind "${kind}" in version "${apiVersion}"\nensure CRDs are installed first`,
    }
  }
  if (!info.stored)
    return {
      ok: false,
      message: `Error from server (Forbidden): ${info.plural} "${metaName}" is forbidden: the lab does not let you create ${info.plural} directly - change the Deployment (or use kubectl run in the Sandbox).`,
    }
  const object = clone(raw) as unknown as Resource
  object.metadata ??= { name: '' }
  delete (object as unknown as Record<string, unknown>).status
  const namespace = info.namespaced ? (object.metadata.namespace ?? defaultNamespace) : undefined
  if (info.namespaced) {
    object.metadata.namespace = namespace
    if (!findObject(cluster, 'Namespace', namespace as string))
      return {
        ok: false,
        message: `Error from server (NotFound): error when creating "${source}": namespaces "${namespace}" not found`,
      }
  } else delete object.metadata.namespace
  const existing = findObject(cluster, info.kind as ResourceKind, object.metadata.name, namespace)
  const errors = validate(object, existing)
  if (errors.length)
    return {
      ok: false,
      message: `The ${info.kind} "${object.metadata.name}" is invalid: ${errors.length === 1 ? errors[0] : `\n* ${errors.join('\n* ')}`}`,
    }
  const label = `${qualified(info)}/${object.metadata.name}`
  if (!existing) {
    for (const key of ['uid', 'resourceVersion', 'creationTimestamp', 'generation'] as const)
      delete object.metadata[key]
    cluster.objects.push(stamp(cluster, object))
    return { ok: true, verb: 'created', label }
  }
  const before = desiredState(existing)
  // Server-owned fields carry over.
  object.metadata.uid = existing.metadata.uid
  object.metadata.creationTimestamp = existing.metadata.creationTimestamp
  object.metadata.resourceVersion = existing.metadata.resourceVersion
  object.metadata.generation = existing.metadata.generation
  if (object.kind === 'Service' && existing.kind === 'Service') {
    object.spec.clusterIP = existing.spec.clusterIP
    object.spec.type ??= 'ClusterIP'
    for (const port of object.spec.ports ?? []) {
      port.protocol ??= 'TCP'
      port.targetPort ??= port.port
      port.nodePort ??= existing.spec.ports?.find((entry) => entry.port === port.port)?.nodePort
    }
  }
  if (stableJson(before) === stableJson(desiredState(object)))
    return { ok: true, verb: 'unchanged', label }
  replaceObject(cluster, existing, object)
  return { ok: true, verb: 'configured', label }
}

/** The parts of an object a change can touch (not status, not server metadata). */
export function desiredState(object: Resource) {
  const { metadata, ...rest } = object as Resource & Record<string, unknown>
  return { labels: metadata.labels ?? {}, annotations: metadata.annotations ?? {}, ...rest }
}

export function replaceObject(cluster: Cluster, existing: Resource, next: Resource) {
  if (
    next.kind === 'Deployment' &&
    stableJson(desiredState(existing)) !== stableJson(desiredState(next))
  )
    next.metadata.generation = (existing.metadata.generation ?? 1) + 1
  next.metadata.resourceVersion = String(Number(existing.metadata.resourceVersion ?? 1000) + 13)
  cluster.objects = cluster.objects.map((entry) => (entry === existing ? next : entry))
}

/** Applies a patched copy through the same validation as apply. */
export function updateObject(
  cluster: Cluster,
  existing: Resource,
  next: unknown,
): { ok: true; changed: boolean } | { ok: false; message: string } {
  const object = next as Resource
  if (!isObject(next) || object.kind !== existing.kind)
    return { ok: false, message: `error: the patch changed the object's kind` }
  object.metadata = {
    ...object.metadata,
    name: existing.metadata.name,
    namespace: existing.metadata.namespace,
  }
  const errors = validate(object, existing)
  if (errors.length)
    return {
      ok: false,
      message: `The ${existing.kind} "${existing.metadata.name}" is invalid: ${errors.length === 1 ? errors[0] : `\n* ${errors.join('\n* ')}`}`,
    }
  if (stableJson(desiredState(existing)) === stableJson(desiredState(object)))
    return { ok: true, changed: false }
  replaceObject(cluster, existing, object)
  return { ok: true, changed: true }
}

/* ---------- serialisation for get -o yaml / json ---------- */

const meta = (
  name: string,
  namespace: string | undefined,
  created: number,
  extra: Record<string, unknown> = {},
) => ({
  name,
  ...(namespace ? { namespace } : {}),
  ...extra,
  creationTimestamp: isoAt(created),
})

export function podManifest(cluster: Cluster, pod: PodRecord) {
  const view = podView(cluster, pod)
  const rs = cluster.replicaSets.find(
    (entry) => entry.name === pod.owner && entry.namespace === pod.namespace,
  )
  const state = (container: (typeof view.containers)[number]) => {
    if (container.state === 'running')
      return { running: { startedAt: isoAt(container.startedAt ?? pod.createdAt) } }
    if (container.state === 'terminated')
      return {
        terminated: { exitCode: container.exitCode ?? 0, reason: container.reason ?? 'Completed' },
      }
    return {
      waiting: {
        ...(container.reason ? { reason: container.reason } : {}),
        ...(container.message ? { message: container.message } : {}),
      },
    }
  }
  return {
    apiVersion: 'v1',
    kind: 'Pod',
    metadata: meta(pod.name, pod.namespace, pod.createdAt, {
      ...(rs ? { generateName: `${rs.name}-` } : {}),
      labels: pod.labels,
      ...(pod.annotations ? { annotations: pod.annotations } : {}),
      ...(rs
        ? {
            ownerReferences: [
              {
                apiVersion: 'apps/v1',
                blockOwnerDeletion: true,
                controller: true,
                kind: 'ReplicaSet',
                name: rs.name,
                uid: rs.uid,
              },
            ],
          }
        : {}),
      uid: pod.uid,
    }),
    spec: {
      ...clone(pod.spec),
      ...(pod.nodeName ? { nodeName: pod.nodeName } : {}),
      restartPolicy: pod.spec.restartPolicy ?? 'Always',
      schedulerName: 'default-scheduler',
      serviceAccountName: pod.spec.serviceAccountName ?? 'default',
      terminationGracePeriodSeconds: pod.spec.terminationGracePeriodSeconds ?? 30,
    },
    status: {
      conditions: view.conditions.map((condition) => ({
        type: condition.type,
        status: condition.status,
        ...(condition.type === 'PodScheduled' && condition.status === 'False'
          ? { reason: 'Unschedulable', message: pod.unschedulable ?? '' }
          : {}),
        ...((condition.type === 'Ready' || condition.type === 'ContainersReady') &&
        condition.status === 'False'
          ? {
              reason: 'ContainersNotReady',
              message: `containers with unready status: [${view.containers
                .filter((entry) => !entry.ready)
                .map((entry) => entry.name)
                .join(' ')}]`,
            }
          : {}),
      })),
      ...(view.scheduled
        ? {
            containerStatuses: view.containers.map((container) => ({
              name: container.name,
              image: container.image,
              ...(container.imageId
                ? { imageID: `${container.image.split(':')[0]}@${container.imageId}` }
                : {}),
              ready: container.ready,
              restartCount: container.restarts,
              started: container.started,
              state: state(container),
              ...(container.last
                ? {
                    lastState: {
                      terminated: {
                        exitCode: container.last.exitCode,
                        reason: container.last.reason,
                        startedAt: isoAt(container.last.startedAt),
                        finishedAt: isoAt(container.last.finishedAt),
                      },
                    },
                  }
                : { lastState: {} }),
            })),
            hostIP: cluster.nodes.find((node) => node.name === pod.nodeName)?.ip,
            podIP: pod.ip,
            podIPs: [{ ip: pod.ip }],
            startTime: isoAt(pod.scheduledAt ?? pod.createdAt),
          }
        : {}),
      phase: view.phase,
      qosClass: qosClass(pod),
    },
  }
}

export function qosClass(pod: PodRecord) {
  const containers = pod.spec.containers
  const none = containers.every(
    (container) => !container.resources?.requests && !container.resources?.limits,
  )
  if (none) return 'BestEffort'
  const guaranteed = containers.every((container) => {
    const limits = container.resources?.limits
    const requests = container.resources?.requests ?? limits
    return (
      limits?.cpu &&
      limits.memory &&
      requests?.cpu === limits.cpu &&
      requests?.memory === limits.memory
    )
  })
  return guaranteed ? 'Guaranteed' : 'Burstable'
}

export function replicaSetManifest(cluster: Cluster, rs: ReplicaSetRecord) {
  const pods = podsOf(cluster, rs)
  const ready = pods.filter((pod) => podView(cluster, pod).ready).length
  return {
    apiVersion: 'apps/v1',
    kind: 'ReplicaSet',
    metadata: meta(rs.name, rs.namespace, rs.createdAt, {
      annotations: {
        'deployment.kubernetes.io/desired-replicas': String(rs.replicas),
        'deployment.kubernetes.io/revision': String(rs.revision),
        ...(rs.changeCause ? { 'kubernetes.io/change-cause': rs.changeCause } : {}),
      },
      labels: rsSelector(rs),
      ownerReferences: [
        { apiVersion: 'apps/v1', kind: 'Deployment', name: rs.deployment, controller: true },
      ],
      uid: rs.uid,
    }),
    spec: {
      replicas: rs.replicas,
      selector: { matchLabels: rsSelector(rs) },
      template: clone(rs.template),
    },
    status: {
      replicas: pods.length,
      readyReplicas: ready,
      availableReplicas: ready,
      fullyLabeledReplicas: pods.length,
    },
  }
}

export function objectManifest(cluster: Cluster, object: Resource) {
  const out = clone(object) as Resource & { status?: unknown }
  if (object.kind === 'Deployment') {
    const status = deploymentStatus(cluster, object)
    out.status = {
      availableReplicas: status.available,
      conditions: [
        {
          type: 'Available',
          status: status.availableCondition.status,
          reason: status.availableCondition.reason,
          message: status.availableCondition.message,
        },
        {
          type: 'Progressing',
          status: status.progressing.status,
          reason: status.progressing.reason,
          message: status.progressing.message,
        },
      ],
      observedGeneration: object.metadata.generation ?? 1,
      readyReplicas: status.ready,
      replicas: status.replicas,
      ...(status.unavailable ? { unavailableReplicas: status.unavailable } : {}),
      updatedReplicas: status.updated,
    }
    out.metadata.annotations = {
      'deployment.kubernetes.io/revision': String(status.current?.revision ?? 1),
      ...object.metadata.annotations,
    }
  }
  if (object.kind === 'Service')
    out.status = {
      loadBalancer:
        object.spec.type === 'LoadBalancer'
          ? { ingress: [{ ip: loadBalancerIp(cluster, object) }] }
          : {},
    }
  if (object.kind === 'PersistentVolumeClaim') {
    const state = claimState(cluster, object)
    out.status =
      state.phase === 'Bound'
        ? {
            phase: 'Bound',
            accessModes: object.spec.accessModes,
            capacity: { storage: object.spec.resources?.requests?.storage },
          }
        : { phase: 'Pending' }
    if (state.phase === 'Bound') (out as PersistentVolumeClaim).spec.volumeName = state.volumeName
  }
  if (object.kind === 'Ingress')
    out.status = {
      loadBalancer: ingressAddress(cluster, object) ? { ingress: [{ ip: cluster.lbIp }] } : {},
    }
  return out
}

export const ingressAddress = (cluster: Cluster, ingress: Ingress) =>
  ingressClassOf(cluster, ingress)?.spec.controller === 'k8s.io/ingress-nginx' ? cluster.lbIp : ''

export function loadBalancerIp(cluster: Cluster, service: Service) {
  if (service.metadata.namespace === 'ingress-nginx') return cluster.lbIp
  const hash =
    stableJson(service.metadata.name).length * 7 + (service.metadata.name.charCodeAt(0) % 50)
  return `20.73.${100 + (hash % 50)}.${(hash * 13) % 250}`
}

export function endpointsManifest(cluster: Cluster, service: Service) {
  const addresses = serviceEndpoints(cluster, service)
  const toAddress = (entry: (typeof addresses)[number]) => ({
    ip: entry.ip,
    nodeName: entry.pod.nodeName,
    targetRef: {
      kind: 'Pod',
      name: entry.pod.name,
      namespace: entry.pod.namespace,
      uid: entry.pod.uid,
    },
  })
  const ready = addresses.filter((entry) => entry.ready)
  const notReady = addresses.filter((entry) => !entry.ready)
  return {
    apiVersion: 'v1',
    kind: 'Endpoints',
    metadata: meta(
      service.metadata.name,
      service.metadata.namespace,
      secondsOf(service.metadata.creationTimestamp),
      {
        labels: service.metadata.labels ?? {},
      },
    ),
    ...(addresses.length
      ? {
          subsets: [
            {
              ...(ready.length ? { addresses: ready.map(toAddress) } : {}),
              ...(notReady.length ? { notReadyAddresses: notReady.map(toAddress) } : {}),
              ports: (service.spec.ports ?? []).map((port, index) => ({
                ...(port.name ? { name: port.name } : {}),
                port: addresses[0].ports[index] ?? 0,
                protocol: port.protocol ?? 'TCP',
              })),
            },
          ],
        }
      : {}),
  }
}

export function nodeManifest(_cluster: Cluster, node: NodeRecord) {
  return {
    apiVersion: 'v1',
    kind: 'Node',
    metadata: meta(node.name, undefined, node.createdAt, { labels: node.labels }),
    spec: {
      ...(node.taints.length ? { taints: node.taints } : {}),
      ...(node.unschedulable ? { unschedulable: true } : {}),
      providerID: `azure:///subscriptions/<subscription-id>/resourceGroups/mc_rg-lab_aks-lab_westeurope/providers/Microsoft.Compute/virtualMachineScaleSets/${node.name.replace(/\d{6}$/, '')}/virtualMachines/${Number(node.name.slice(-1))}`,
    },
    status: {
      addresses: [
        { type: 'InternalIP', address: node.ip },
        { type: 'Hostname', address: node.name },
      ],
      allocatable: { cpu: `${node.cpu}m`, memory: `${node.memory * 1024}Ki`, pods: '110' },
      capacity: {
        cpu: String(Math.ceil(node.cpu / 1000)),
        memory: `${Math.round(node.memory * 1.18) * 1024}Ki`,
        pods: '110',
      },
      conditions: [
        { type: 'MemoryPressure', status: 'False', reason: 'KubeletHasSufficientMemory' },
        { type: 'DiskPressure', status: 'False', reason: 'KubeletHasNoDiskPressure' },
        { type: 'PIDPressure', status: 'False', reason: 'KubeletHasSufficientPID' },
        {
          type: 'Ready',
          status: 'True',
          reason: 'KubeletReady',
          message: 'kubelet is posting ready status',
        },
      ],
      nodeInfo: {
        architecture: 'amd64',
        containerRuntimeVersion: 'containerd://2.1.4-1',
        kernelVersion: '6.8.0-1041-azure',
        kubeletVersion: 'v1.34.4',
        operatingSystem: 'linux',
        osImage: 'Ubuntu 24.04.3 LTS',
      },
    },
  }
}

/** The ReplicaSets a Deployment owns, newest revision first. */
export const revisions = (cluster: Cluster, deployment: Deployment) =>
  [...deploymentReplicaSets(cluster, deployment)].sort((a, b) => a.revision - b.revision)
