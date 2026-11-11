import {
  claimState,
  createdAt,
  defaultStorageClass,
  deploymentReplicaSets,
  deploymentStatus,
  findObject,
  ingressClassOf,
  listObjects,
  nodeUsage,
  podRequests,
  podView,
  podsOf,
  rsSelector,
  serviceEndpoints,
  type EventLine,
  type PodView,
} from './cluster'
import {
  endpointsManifest,
  ingressAddress,
  kindInfo,
  loadBalancerIp,
  nodeManifest,
  objectManifest,
  podManifest,
  qosClass,
  replicaSetManifest,
  type KindInfo,
} from './resources'
import type {
  Cluster,
  Container,
  Deployment,
  Ingress,
  Labels,
  NodeRecord,
  PersistentVolumeClaim,
  PodRecord,
  PodTemplate,
  Probe,
  ReplicaSetRecord,
  Resource,
  Service,
} from './types'
import { CLOCK_ORIGIN, cpuMillis, humanAge, labelText, memoryMi, nameSuffix, table } from './util'

/**
 * What kubectl prints: one `Item` per object (its table row, its manifest
 * for -o yaml/json), the event stream, and `describe` text.
 */

export interface Item {
  info: KindInfo
  name: string
  namespace?: string
  labels: Labels
  created: number
  header: (wide: boolean) => string[]
  row: (wide: boolean) => string[]
  manifest: () => Record<string, unknown>
}

const age = (cluster: Cluster, at: number) => humanAge(cluster.now - at)

export const restartsText = (cluster: Cluster, view: PodView) =>
  view.restarts > 0 && view.lastRestartAt !== undefined
    ? `${view.restarts} (${age(cluster, view.lastRestartAt)} ago)`
    : String(view.restarts)

const portsText = (service: Service) =>
  (service.spec.ports ?? [])
    .map(
      (port) =>
        `${port.port}${port.nodePort && service.spec.type !== 'ClusterIP' ? `:${port.nodePort}` : ''}/${port.protocol ?? 'TCP'}`,
    )
    .join(',') || '<none>'

export function podItem(cluster: Cluster, pod: PodRecord): Item {
  const info = kindInfo('pod') as KindInfo
  return {
    info,
    name: pod.name,
    namespace: pod.namespace,
    labels: pod.labels,
    created: pod.createdAt,
    header: (wide) =>
      ['NAME', 'READY', 'STATUS', 'RESTARTS', 'AGE'].concat(
        wide ? ['IP', 'NODE', 'NOMINATED NODE', 'READINESS GATES'] : [],
      ),
    row: (wide) => {
      const view = podView(cluster, pod)
      return [
        pod.name,
        `${view.readyCount}/${view.total}`,
        view.status,
        restartsText(cluster, view),
        age(cluster, pod.createdAt),
      ].concat(wide ? [pod.ip ?? '<none>', pod.nodeName ?? '<none>', '<none>', '<none>'] : [])
    },
    manifest: () => podManifest(cluster, pod),
  }
}

const containersOf = (template: PodTemplate) =>
  template.spec.containers.map((entry) => entry.name).join(',')
const imagesOf = (template: PodTemplate) =>
  template.spec.containers.map((entry) => entry.image).join(',')

export function rsItem(cluster: Cluster, rs: ReplicaSetRecord): Item {
  return {
    info: kindInfo('rs') as KindInfo,
    name: rs.name,
    namespace: rs.namespace,
    labels: rsSelector(rs),
    created: rs.createdAt,
    header: (wide) =>
      ['NAME', 'DESIRED', 'CURRENT', 'READY', 'AGE'].concat(
        wide ? ['CONTAINERS', 'IMAGES', 'SELECTOR'] : [],
      ),
    row: (wide) => {
      const pods = podsOf(cluster, rs)
      const ready = pods.filter((pod) => podView(cluster, pod).ready).length
      return [
        rs.name,
        String(rs.replicas),
        String(pods.length),
        String(ready),
        age(cluster, rs.createdAt),
      ].concat(
        wide ? [containersOf(rs.template), imagesOf(rs.template), labelText(rsSelector(rs))] : [],
      )
    },
    manifest: () => replicaSetManifest(cluster, rs),
  }
}

export function nodeItem(cluster: Cluster, node: NodeRecord): Item {
  return {
    info: kindInfo('node') as KindInfo,
    name: node.name,
    labels: node.labels,
    created: node.createdAt,
    header: (wide) =>
      ['NAME', 'STATUS', 'ROLES', 'AGE', 'VERSION'].concat(
        wide
          ? ['INTERNAL-IP', 'EXTERNAL-IP', 'OS-IMAGE', 'KERNEL-VERSION', 'CONTAINER-RUNTIME']
          : [],
      ),
    row: (wide) =>
      [
        node.name,
        node.unschedulable ? 'Ready,SchedulingDisabled' : 'Ready',
        '<none>',
        age(cluster, node.createdAt),
        'v1.34.4',
      ].concat(
        wide
          ? [node.ip, '<none>', 'Ubuntu 24.04.3 LTS', '6.8.0-1041-azure', 'containerd://2.1.4-1']
          : [],
      ),
    manifest: () => nodeManifest(cluster, node),
  }
}

function endpointsText(cluster: Cluster, service: Service) {
  const ready = serviceEndpoints(cluster, service).filter((entry) => entry.ready)
  const pairs = ready.flatMap((entry) =>
    entry.ports.filter((port) => port !== null).map((port) => `${entry.ip}:${port}`),
  )
  if (pairs.length === 0) return '<none>'
  return pairs.length > 3
    ? `${pairs.slice(0, 3).join(',')} + ${pairs.length - 3} more...`
    : pairs.join(',')
}

export function endpointsItem(cluster: Cluster, service: Service): Item {
  return {
    info: kindInfo('endpoints') as KindInfo,
    name: service.metadata.name,
    namespace: service.metadata.namespace,
    labels: service.metadata.labels ?? {},
    created: createdAt(service),
    header: () => ['NAME', 'ENDPOINTS', 'AGE'],
    row: () => [
      service.metadata.name,
      endpointsText(cluster, service),
      age(cluster, createdAt(service)),
    ],
    manifest: () => endpointsManifest(cluster, service),
  }
}

export function sliceItem(cluster: Cluster, service: Service): Item {
  const name = `${service.metadata.name}-${nameSuffix(service.metadata.name, 5)}`
  return {
    info: kindInfo('endpointslices') as KindInfo,
    name,
    namespace: service.metadata.namespace,
    labels: { 'kubernetes.io/service-name': service.metadata.name },
    created: createdAt(service),
    header: () => ['NAME', 'ADDRESSTYPE', 'PORTS', 'ENDPOINTS', 'AGE'],
    row: () => {
      const all = serviceEndpoints(cluster, service)
      const ports = [
        ...new Set(all.flatMap((entry) => entry.ports.filter((port) => port !== null))),
      ]
      const ips = all.map((entry) => entry.ip)
      return [
        name,
        'IPv4',
        ports.length ? ports.join(',') : '<unset>',
        ips.length
          ? ips.length > 3
            ? `${ips.slice(0, 3).join(',')} + ${ips.length - 3} more...`
            : ips.join(',')
          : '<unset>',
        age(cluster, createdAt(service)),
      ]
    },
    manifest: () => ({
      apiVersion: 'discovery.k8s.io/v1',
      kind: 'EndpointSlice',
      metadata: {
        name,
        namespace: service.metadata.namespace,
        labels: { 'kubernetes.io/service-name': service.metadata.name },
      },
      addressType: 'IPv4',
      endpoints: serviceEndpoints(cluster, service).map((entry) => ({
        addresses: [entry.ip],
        conditions: { ready: entry.ready, serving: entry.ready, terminating: false },
        nodeName: entry.pod.nodeName,
        targetRef: { kind: 'Pod', name: entry.pod.name, namespace: entry.pod.namespace },
      })),
      ports: (service.spec.ports ?? []).map((port, index) => ({
        ...(port.name ? { name: port.name } : {}),
        port: serviceEndpoints(cluster, service)[0]?.ports[index] ?? null,
        protocol: port.protocol ?? 'TCP',
      })),
    }),
  }
}

function claimRow(cluster: Cluster, claim: PersistentVolumeClaim) {
  const state = claimState(cluster, claim)
  const bound = state.phase === 'Bound'
  return [
    claim.metadata.name,
    state.phase,
    bound ? (state.volumeName ?? '') : '',
    bound ? (claim.spec.resources?.requests?.storage ?? '') : '',
    bound
      ? (claim.spec.accessModes ?? [])
          .map(
            (mode) =>
              ({
                ReadWriteOnce: 'RWO',
                ReadWriteMany: 'RWX',
                ReadOnlyMany: 'ROX',
                ReadWriteOncePod: 'RWOP',
              })[mode] ?? mode,
          )
          .join(',')
      : '',
    claim.spec.storageClassName ?? defaultStorageClass(cluster)?.metadata.name ?? '<unset>',
    '<unset>',
    age(cluster, createdAt(claim)),
  ]
}

export function objectItem(cluster: Cluster, object: Resource): Item {
  const info = kindInfo(object.kind) as KindInfo
  const created = createdAt(object)
  const base = {
    info,
    name: object.metadata.name,
    namespace: object.metadata.namespace,
    labels: object.metadata.labels ?? {},
    created,
    manifest: () => objectManifest(cluster, object) as unknown as Record<string, unknown>,
  }
  const ago = age(cluster, created)
  switch (object.kind) {
    case 'Deployment':
      return {
        ...base,
        header: (wide) =>
          ['NAME', 'READY', 'UP-TO-DATE', 'AVAILABLE', 'AGE'].concat(
            wide ? ['CONTAINERS', 'IMAGES', 'SELECTOR'] : [],
          ),
        row: (wide) => {
          const status = deploymentStatus(cluster, object)
          return [
            object.metadata.name,
            `${status.ready}/${object.spec.replicas ?? 1}`,
            String(status.updated),
            String(status.available),
            ago,
          ].concat(
            wide
              ? [
                  containersOf(object.spec.template),
                  imagesOf(object.spec.template),
                  labelText(object.spec.selector.matchLabels),
                ]
              : [],
          )
        },
      }
    case 'Service':
      return {
        ...base,
        header: (wide) =>
          ['NAME', 'TYPE', 'CLUSTER-IP', 'EXTERNAL-IP', 'PORT(S)', 'AGE'].concat(
            wide ? ['SELECTOR'] : [],
          ),
        row: (wide) =>
          [
            object.metadata.name,
            object.spec.type ?? 'ClusterIP',
            object.spec.clusterIP ?? '<none>',
            object.spec.type === 'LoadBalancer' ? loadBalancerIp(cluster, object) : '<none>',
            portsText(object),
            ago,
          ].concat(wide ? [labelText(object.spec.selector)] : []),
      }
    case 'Ingress':
      return {
        ...base,
        header: () => ['NAME', 'CLASS', 'HOSTS', 'ADDRESS', 'PORTS', 'AGE'],
        row: () => [
          object.metadata.name,
          object.spec.ingressClassName ?? '<none>',
          (object.spec.rules ?? []).map((rule) => rule.host ?? '*').join(',') || '*',
          ingressAddress(cluster, object),
          object.spec.tls?.length ? '80, 443' : '80',
          ago,
        ],
      }
    case 'IngressClass':
      return {
        ...base,
        header: () => ['NAME', 'CONTROLLER', 'PARAMETERS', 'AGE'],
        row: () => [object.metadata.name, object.spec.controller, '<none>', ago],
      }
    case 'ConfigMap':
      return {
        ...base,
        header: () => ['NAME', 'DATA', 'AGE'],
        row: () => [object.metadata.name, String(Object.keys(object.data ?? {}).length), ago],
      }
    case 'Secret':
      return {
        ...base,
        header: () => ['NAME', 'TYPE', 'DATA', 'AGE'],
        row: () => [
          object.metadata.name,
          object.type ?? 'Opaque',
          String(Object.keys(object.data ?? {}).length),
          ago,
        ],
      }
    case 'PersistentVolumeClaim':
      return {
        ...base,
        header: () => [
          'NAME',
          'STATUS',
          'VOLUME',
          'CAPACITY',
          'ACCESS MODES',
          'STORAGECLASS',
          'VOLUMEATTRIBUTESCLASS',
          'AGE',
        ],
        row: () => claimRow(cluster, object),
      }
    case 'StorageClass':
      return {
        ...base,
        header: () => [
          'NAME',
          'PROVISIONER',
          'RECLAIMPOLICY',
          'VOLUMEBINDINGMODE',
          'ALLOWVOLUMEEXPANSION',
          'AGE',
        ],
        row: () => [
          `${object.metadata.name}${object.metadata.annotations?.['storageclass.kubernetes.io/is-default-class'] === 'true' ? ' (default)' : ''}`,
          object.provisioner,
          object.reclaimPolicy ?? 'Delete',
          object.volumeBindingMode ?? 'Immediate',
          String(object.allowVolumeExpansion ?? false),
          ago,
        ],
      }
    case 'ServiceAccount':
      return {
        ...base,
        header: () => ['NAME', 'SECRETS', 'AGE'],
        row: () => [object.metadata.name, '0', ago],
      }
    case 'Namespace':
      return {
        ...base,
        header: () => ['NAME', 'STATUS', 'AGE'],
        row: () => [object.metadata.name, 'Active', ago],
      }
  }
}

/* ---------- events ---------- */

export interface ClusterEvent extends EventLine {
  namespace: string
  object: string
}

export function allEvents(cluster: Cluster, namespace: string | null): ClusterEvent[] {
  const out: ClusterEvent[] = []
  const recent = (event: { lastAt: number }) => cluster.now - event.lastAt <= 3600
  for (const event of cluster.events)
    if ((namespace === null || event.namespace === namespace) && recent(event))
      out.push({ ...event })
  for (const pod of cluster.pods) {
    if (namespace !== null && pod.namespace !== namespace) continue
    for (const event of podView(cluster, pod).events)
      if (recent(event)) out.push({ ...event, namespace: pod.namespace, object: `pod/${pod.name}` })
  }
  for (const claim of listObjects(cluster, 'PersistentVolumeClaim', namespace)) {
    const state = claimState(cluster, claim)
    const start = createdAt(claim)
    const count = Math.max(1, Math.min(Math.floor((cluster.now - start) / 30) + 1, 60))
    const base = {
      namespace: claim.metadata.namespace ?? 'default',
      object: `persistentvolumeclaim/${claim.metadata.name}`,
      source: 'persistentvolume-controller',
      firstAt: start,
      lastAt: cluster.now - 5,
      count,
    }
    if (state.problem)
      out.push({ ...base, type: 'Warning', reason: 'ProvisioningFailed', message: state.problem })
    else if (state.waitingForConsumer)
      out.push({
        ...base,
        type: 'Normal',
        reason: 'WaitForFirstConsumer',
        message: 'waiting for first consumer to be created before binding',
      })
  }
  for (const ingress of listObjects(cluster, 'Ingress', namespace)) {
    if (!ingressAddress(cluster, ingress)) continue
    const at = createdAt(ingress)
    out.push({
      namespace: ingress.metadata.namespace ?? 'default',
      object: `ingress/${ingress.metadata.name}`,
      source: 'nginx-ingress-controller',
      type: 'Normal',
      reason: 'Sync',
      message: 'Scheduled for sync',
      firstAt: at,
      lastAt: Math.max(at, cluster.now - 600),
      count: 1,
    })
  }
  return out.filter(recent)
}

const eventAge = (cluster: Cluster, event: EventLine) =>
  event.count > 1
    ? `${age(cluster, event.lastAt)} (x${event.count} over ${age(cluster, event.firstAt)})`
    : age(cluster, event.firstAt)

function eventsTable(cluster: Cluster, events: EventLine[]) {
  if (events.length === 0) return 'Events:            <none>'
  const rows = [
    ['Type', 'Reason', 'Age', 'From', 'Message'],
    ['----', '------', '----', '----', '-------'],
    ...events
      .slice(-30)
      .sort((a, b) => a.firstAt - b.firstAt)
      .map((event) => [
        event.type,
        event.reason,
        eventAge(cluster, event),
        event.source,
        event.message,
      ]),
  ]
  return `Events:\n${table(rows)
    .split('\n')
    .map((line) => `  ${line}`)
    .join('\n')}`
}

/* ---------- describe ---------- */

const date = (seconds: number) =>
  new Date(CLOCK_ORIGIN + seconds * 1000).toUTCString().replace('GMT', '+0000')

const field = (label: string, value: string, width = 18) => `${`${label}:`.padEnd(width)}${value}`

function multi(label: string, values: string[], width = 18) {
  if (values.length === 0) return field(label, '<none>', width)
  return values
    .map((value, index) =>
      index === 0 ? field(label, value, width) : `${' '.repeat(width)}${value}`,
    )
    .join('\n')
}

const labelLines = (labels: Labels | undefined) =>
  Object.entries(labels ?? {}).map(([key, value]) => `${key}=${value}`)
const annotationLines = (labels: Labels | undefined) =>
  Object.entries(labels ?? {}).map(([key, value]) => `${key}: ${value}`)

function probeText(probe: Probe) {
  const target = probe.httpGet
    ? `http-get ${(probe.httpGet.scheme ?? 'HTTP').toLowerCase()}://:${probe.httpGet.port}${probe.httpGet.path ?? '/'}`
    : probe.tcpSocket
      ? `tcp-socket :${probe.tcpSocket.port}`
      : `exec [${probe.exec?.command.join(' ')}]`
  return `${target} delay=${probe.initialDelaySeconds ?? 0}s timeout=${probe.timeoutSeconds ?? 1}s period=${probe.periodSeconds ?? 10}s #success=${probe.successThreshold ?? 1} #failure=${probe.failureThreshold ?? 3}`
}

function envLines(cluster: Cluster, namespace: string, container: Container) {
  const lines: string[] = []
  for (const entry of container.env ?? []) {
    if (entry.value !== undefined) lines.push(`${entry.name}:  ${entry.value}`)
    else if (entry.valueFrom?.configMapKeyRef)
      lines.push(
        `${entry.name}:  <set to the key '${entry.valueFrom.configMapKeyRef.key}' of config map '${entry.valueFrom.configMapKeyRef.name}'>  Optional: ${entry.valueFrom.configMapKeyRef.optional ?? false}`,
      )
    else if (entry.valueFrom?.secretKeyRef)
      lines.push(
        `${entry.name}:  <set to the key '${entry.valueFrom.secretKeyRef.key}' in secret '${entry.valueFrom.secretKeyRef.name}'>  Optional: ${entry.valueFrom.secretKeyRef.optional ?? false}`,
      )
    else if (entry.valueFrom?.fieldRef)
      lines.push(`${entry.name}:   (v1:${entry.valueFrom.fieldRef.fieldPath})`)
  }
  void cluster
  void namespace
  return lines
}

function containerBlock(
  cluster: Cluster,
  namespace: string,
  container: Container,
  indent: string,
  view?: PodView,
  pod?: PodRecord,
) {
  const state = view?.containers.find((entry) => entry.name === container.name)
  const out: string[] = [`${indent}${container.name}:`]
  const add = (label: string, value: string, extra = 4) =>
    out.push(`${' '.repeat(extra)}${`${label}:`.padEnd(16)}${value}`)
  if (view)
    add(
      'Container ID',
      state?.imageId && state.state !== 'waiting'
        ? `containerd://${state.imageId.slice(7, 23)}${'0'.repeat(48)}`
        : '',
    )
  add('Image', container.image)
  if (view)
    add('Image ID', state?.imageId ? `${container.image.split(':')[0]}@${state.imageId}` : '')
  const ports = container.ports ?? []
  add(
    'Port',
    ports.length
      ? ports.map((port) => `${port.containerPort}/${port.protocol ?? 'TCP'}`).join(', ')
      : '<none>',
  )
  add(
    'Host Port',
    ports.length ? ports.map((port) => `0/${port.protocol ?? 'TCP'}`).join(', ') : '<none>',
  )
  if (container.command)
    out.push(`    Command:\n${container.command.map((part) => `      ${part}`).join('\n')}`)
  if (container.args)
    out.push(`    Args:\n${container.args.map((part) => `      ${part}`).join('\n')}`)
  if (view && state) {
    if (state.state === 'running') {
      add('State', 'Running')
      out.push(`      Started:      ${date(state.startedAt ?? 0)}`)
    } else if (state.state === 'waiting') {
      add('State', 'Waiting')
      if (state.reason) out.push(`      Reason:       ${state.reason}`)
      if (
        state.message &&
        state.reason !== 'CrashLoopBackOff' &&
        state.reason !== 'ImagePullBackOff'
      )
        out.push(`      Message:      ${state.message}`)
    }
    if (state.last) {
      add('Last State', 'Terminated')
      out.push(`      Reason:       ${state.last.reason}`)
      if (state.last.reason === 'StartError' && state.message)
        out.push(`      Message:      ${state.message}`)
      out.push(`      Exit Code:    ${state.last.exitCode}`)
      out.push(`      Started:      ${date(state.last.startedAt)}`)
      out.push(`      Finished:     ${date(state.last.finishedAt)}`)
    }
    add('Ready', state.ready ? 'True' : 'False')
    add('Restart Count', String(state.restarts))
  }
  const limits = Object.entries(container.resources?.limits ?? {})
  const requests = Object.entries(container.resources?.requests ?? {})
  if (limits.length)
    out.push(
      `    Limits:\n${limits.map(([key, value]) => `      ${`${key}:`.padEnd(8)}${value}`).join('\n')}`,
    )
  if (requests.length || limits.length)
    out.push(
      `    Requests:\n${(requests.length ? requests : limits).map(([key, value]) => `      ${`${key}:`.padEnd(8)}${value}`).join('\n')}`,
    )
  if (container.livenessProbe) add('Liveness', probeText(container.livenessProbe))
  if (container.readinessProbe) add('Readiness', probeText(container.readinessProbe))
  if (container.startupProbe) add('Startup', probeText(container.startupProbe))
  const env = envLines(cluster, namespace, container)
  const fromLines = (container.envFrom ?? []).map((source) =>
    source.configMapRef
      ? `${source.configMapRef.name}  ConfigMap  Optional: ${source.configMapRef.optional ?? false}`
      : `${source.secretRef?.name}  Secret  Optional: ${source.secretRef?.optional ?? false}`,
  )
  if (fromLines.length)
    out.push(
      `    Environment Variables from:\n${fromLines.map((line) => `      ${line}`).join('\n')}`,
    )
  out.push(
    env.length
      ? `    Environment:\n${env.map((line) => `      ${line}`).join('\n')}`
      : `    Environment:    <none>`,
  )
  const mounts = (container.volumeMounts ?? []).map(
    (mount) => `${mount.mountPath} from ${mount.name} (${mount.readOnly ? 'ro' : 'rw'})`,
  )
  if (pod)
    mounts.push(
      `/var/run/secrets/kubernetes.io/serviceaccount from kube-api-access-${nameSuffix(pod.name, 5)} (ro)`,
    )
  out.push(
    mounts.length
      ? `    Mounts:\n${mounts.map((line) => `      ${line}`).join('\n')}`
      : `    Mounts:         <none>`,
  )
  return out.join('\n')
}

function volumesBlock(
  template: { spec: { volumes?: PodTemplate['spec']['volumes'] } },
  indent: string,
  pod?: PodRecord,
) {
  const lines: string[] = []
  for (const volume of template.spec.volumes ?? []) {
    lines.push(`${indent}  ${volume.name}:`)
    if (volume.persistentVolumeClaim)
      lines.push(
        `${indent}    Type:       PersistentVolumeClaim (a reference to a PersistentVolumeClaim in the same namespace)`,
        `${indent}    ClaimName:  ${volume.persistentVolumeClaim.claimName}`,
        `${indent}    ReadOnly:   false`,
      )
    else if (volume.configMap)
      lines.push(
        `${indent}    Type:      ConfigMap (a volume populated by a ConfigMap)`,
        `${indent}    Name:      ${volume.configMap.name}`,
        `${indent}    Optional:  ${volume.configMap.optional ?? false}`,
      )
    else if (volume.secret)
      lines.push(
        `${indent}    Type:        Secret (a volume populated by a Secret)`,
        `${indent}    SecretName:  ${volume.secret.secretName}`,
        `${indent}    Optional:    ${volume.secret.optional ?? false}`,
      )
    else
      lines.push(
        `${indent}    Type:       EmptyDir (a temporary directory that shares a pod's lifetime)`,
        `${indent}    Medium:     `,
      )
  }
  if (pod)
    lines.push(
      `${indent}  kube-api-access-${nameSuffix(pod.name, 5)}:`,
      `${indent}    Type:                    Projected (a volume that contains injected data from multiple sources)`,
      `${indent}    TokenExpirationSeconds:  3607`,
      `${indent}    ConfigMapName:           kube-root-ca.crt`,
      `${indent}    Optional:                false`,
      `${indent}    DownwardAPI:             true`,
    )
  return lines.length
    ? `${indent}Volumes:\n${lines.join('\n')}`
    : `${indent}Volumes:         <none>`
}

const tolerationLines = (template: PodTemplate['spec'], defaults: boolean) => [
  ...(template.tolerations ?? []).map(
    (entry) =>
      `${entry.key ?? ''}${entry.operator === 'Exists' ? '' : `=${entry.value ?? ''}`}${entry.effect ? `:${entry.effect}` : ''}${entry.operator === 'Exists' ? ' op=Exists' : ''}${entry.tolerationSeconds ? ` for ${entry.tolerationSeconds}s` : ''}`,
  ),
  ...(defaults
    ? [
        'node.kubernetes.io/memory-pressure:NoSchedule op=Exists',
        'node.kubernetes.io/not-ready:NoExecute op=Exists for 300s',
        'node.kubernetes.io/unreachable:NoExecute op=Exists for 300s',
      ]
    : []),
]

export function describePod(cluster: Cluster, pod: PodRecord): string {
  const view = podView(cluster, pod)
  const node = cluster.nodes.find((entry) => entry.name === pod.nodeName)
  const rs = cluster.replicaSets.find(
    (entry) => entry.name === pod.owner && entry.namespace === pod.namespace,
  )
  const lines = [
    field('Name', pod.name),
    field('Namespace', pod.namespace),
    field('Priority', '0'),
    field('Service Account', pod.spec.serviceAccountName ?? 'default'),
    field('Node', node ? `${node.name}/${node.ip}` : '<none>'),
    ...(view.scheduled ? [field('Start Time', date(pod.scheduledAt ?? pod.createdAt))] : []),
    multi('Labels', labelLines(pod.labels)),
    multi('Annotations', annotationLines(pod.annotations)),
    field('Status', view.phase),
    field('IP', pod.ip ?? ''),
    ...(pod.ip ? ['IPs:', `  IP:           ${pod.ip}`] : ['IPs:              <none>']),
    ...(rs ? [`Controlled By:  ReplicaSet/${rs.name}`] : []),
    'Containers:',
    ...pod.spec.containers.map((container) =>
      containerBlock(cluster, pod.namespace, container, '  ', view, pod),
    ),
    'Conditions:',
    table([
      ['  Type', 'Status'],
      ...view.conditions.map((condition) => [`  ${condition.type}`, condition.status]),
    ]),
    volumesBlock({ spec: pod.spec }, '', pod),
    field('QoS Class', qosClass(pod), 29),
    multi('Node-Selectors', labelLines(pod.spec.nodeSelector), 29),
    multi('Tolerations', tolerationLines(pod.spec, true), 29),
    eventsTable(cluster, view.events),
  ]
  return lines.join('\n')
}

function templateBlock(cluster: Cluster, namespace: string, template: PodTemplate) {
  return [
    'Pod Template:',
    `  ${multi('Labels', labelLines(template.metadata?.labels), 9).replace(/\n/g, '\n  ')}`,
    ...(template.metadata?.annotations
      ? [
          `  ${multi('Annotations', annotationLines(template.metadata.annotations), 14).replace(/\n/g, '\n  ')}`,
        ]
      : []),
    '  Containers:',
    ...template.spec.containers.map((container) =>
      containerBlock(cluster, namespace, container, '   '),
    ),
    volumesBlock(template, '  '),
    `  ${multi('Node-Selectors', labelLines(template.spec.nodeSelector), 16).replace(/\n/g, '\n  ')}`,
    `  ${multi('Tolerations', tolerationLines(template.spec, false), 16).replace(/\n/g, '\n  ')}`,
  ].join('\n')
}

export function describeDeployment(cluster: Cluster, deployment: Deployment): string {
  const status = deploymentStatus(cluster, deployment)
  const sets = deploymentReplicaSets(cluster, deployment)
  const current = status.current
  const olds = sets.filter((rs) => rs !== current && podsOf(cluster, rs).length > 0)
  const desired = deployment.spec.replicas ?? 1
  const namespace = deployment.metadata.namespace ?? 'default'
  const events = cluster.events.filter(
    (event) =>
      event.object === `deployment/${deployment.metadata.name}` &&
      event.namespace === namespace &&
      cluster.now - event.lastAt <= 3600,
  )
  const lines = [
    field('Name', deployment.metadata.name, 24),
    field('Namespace', namespace, 24),
    field('CreationTimestamp', date(createdAt(deployment)), 24),
    multi('Labels', labelLines(deployment.metadata.labels), 24),
    multi(
      'Annotations',
      annotationLines({
        'deployment.kubernetes.io/revision': String(current?.revision ?? 1),
        ...deployment.metadata.annotations,
      }),
      24,
    ),
    field('Selector', labelText(deployment.spec.selector.matchLabels), 24),
    field(
      'Replicas',
      `${desired} desired | ${status.updated} updated | ${status.replicas} total | ${status.available} available | ${status.unavailable} unavailable`,
      24,
    ),
    field('StrategyType', 'RollingUpdate', 24),
    field('MinReadySeconds', '0', 24),
    field('RollingUpdateStrategy', '25% max unavailable, 25% max surge', 24),
    templateBlock(cluster, namespace, deployment.spec.template),
    'Conditions:',
    table([
      ['  Type', 'Status', 'Reason'],
      ['  ----', '------', '------'],
      ['  Available', status.availableCondition.status, status.availableCondition.reason],
      ['  Progressing', status.progressing.status, status.progressing.reason],
    ]),
    field(
      'OldReplicaSets',
      olds.length
        ? olds
            .map(
              (rs) => `${rs.name} (${podsOf(cluster, rs).length}/${rs.replicas} replicas created)`,
            )
            .join(', ')
        : '<none>',
      17,
    ),
    field(
      'NewReplicaSet',
      current
        ? `${current.name} (${podsOf(cluster, current).length}/${current.replicas} replicas created)`
        : '<none>',
      17,
    ),
    eventsTable(cluster, events),
  ]
  return lines.join('\n')
}

export function describeReplicaSet(cluster: Cluster, rs: ReplicaSetRecord): string {
  const pods = podsOf(cluster, rs)
  const views = pods.map((pod) => podView(cluster, pod))
  const running = views.filter((view) => view.phase === 'Running').length
  const waiting = views.filter((view) => view.phase === 'Pending').length
  const events = cluster.events.filter(
    (event) =>
      event.object === `replicaset/${rs.name}` &&
      event.namespace === rs.namespace &&
      cluster.now - event.lastAt <= 3600,
  )
  return [
    field('Name', rs.name, 14),
    field('Namespace', rs.namespace, 14),
    field('Selector', labelText(rsSelector(rs)), 14),
    multi('Labels', labelLines(rsSelector(rs)), 14),
    multi(
      'Annotations',
      [
        `deployment.kubernetes.io/desired-replicas: ${rs.replicas}`,
        `deployment.kubernetes.io/revision: ${rs.revision}`,
      ],
      14,
    ),
    field('Controlled By', `Deployment/${rs.deployment}`, 14),
    field('Replicas', `${pods.length} current / ${rs.replicas} desired`, 14),
    field('Pods Status', `${running} Running / ${waiting} Waiting / 0 Succeeded / 0 Failed`, 14),
    templateBlock(cluster, rs.namespace, rs.template),
    eventsTable(cluster, events),
  ].join('\n')
}

export function describeService(cluster: Cluster, service: Service): string {
  const endpoints = endpointsText(cluster, service)
  const lines = [
    field('Name', service.metadata.name, 26),
    field('Namespace', service.metadata.namespace ?? 'default', 26),
    multi('Labels', labelLines(service.metadata.labels), 26),
    multi('Annotations', annotationLines(service.metadata.annotations), 26),
    field('Selector', labelText(service.spec.selector), 26),
    field('Type', service.spec.type ?? 'ClusterIP', 26),
    field('IP Family Policy', 'SingleStack', 26),
    field('IP Families', 'IPv4', 26),
    field('IP', service.spec.clusterIP ?? '', 26),
    field('IPs', service.spec.clusterIP ?? '', 26),
    ...(service.spec.type === 'LoadBalancer'
      ? [field('LoadBalancer Ingress', `${loadBalancerIp(cluster, service)} (VIP)`, 26)]
      : []),
  ]
  for (const [index, port] of (service.spec.ports ?? []).entries()) {
    lines.push(
      field('Port', `${port.name ?? '<unset>'}  ${port.port}/${port.protocol ?? 'TCP'}`, 26),
    )
    lines.push(field('TargetPort', `${port.targetPort ?? port.port}/${port.protocol ?? 'TCP'}`, 26))
    if (port.nodePort && service.spec.type !== 'ClusterIP')
      lines.push(
        field(
          'NodePort',
          `${port.name ?? '<unset>'}  ${port.nodePort}/${port.protocol ?? 'TCP'}`,
          26,
        ),
      )
    const ready = serviceEndpoints(cluster, service).filter(
      (entry) => entry.ready && entry.ports[index] !== null,
    )
    lines.push(
      field(
        'Endpoints',
        ready.map((entry) => `${entry.ip}:${entry.ports[index]}`).join(',') ||
          (endpoints === '<none>' ? '' : ''),
        26,
      ),
    )
  }
  lines.push(
    field('Session Affinity', 'None', 26),
    field('Internal Traffic Policy', 'Cluster', 26),
    'Events:                   <none>',
  )
  return lines.join('\n')
}

export function describeIngress(cluster: Cluster, ingress: Ingress): string {
  const namespace = ingress.metadata.namespace ?? 'default'
  const backendText = (
    backend: { service?: { name: string; port?: { number?: number; name?: string } } } | undefined,
  ) => {
    if (!backend?.service) return '<default>'
    const port = backend.service.port?.number ?? backend.service.port?.name ?? ''
    const service = findObject(cluster, 'Service', backend.service.name, namespace)
    if (!service)
      return `${backend.service.name}:${port} (<error: services "${backend.service.name}" not found>)`
    const index = (service.spec.ports ?? []).findIndex((entry) =>
      backend.service?.port?.name
        ? entry.name === backend.service.port.name
        : entry.port === backend.service?.port?.number,
    )
    if (index < 0) return `${backend.service.name}:${port} ()`
    const ready = serviceEndpoints(cluster, service).filter(
      (entry) => entry.ready && entry.ports[index] !== null,
    )
    return `${backend.service.name}:${port} (${ready.map((entry) => `${entry.ip}:${entry.ports[index]}`).join(',')})`
  }
  const rows: string[][] = [
    ['  Host', 'Path', 'Backends'],
    ['  ----', '----', '--------'],
  ]
  for (const rule of ingress.spec.rules ?? []) {
    rows.push([`  ${rule.host ?? '*'}`, '', ''])
    for (const entry of rule.http?.paths ?? [])
      rows.push(['  ', entry.path ?? '/', backendText(entry.backend)])
  }
  const events = allEvents(cluster, namespace).filter(
    (event) => event.object === `ingress/${ingress.metadata.name}`,
  )
  const className =
    ingress.spec.ingressClassName ?? ingress.metadata.annotations?.['kubernetes.io/ingress.class']
  return [
    field('Name', ingress.metadata.name),
    multi('Labels', labelLines(ingress.metadata.labels)),
    field('Namespace', namespace),
    field('Address', ingressAddress(cluster, ingress)),
    field(
      'Ingress Class',
      className ??
        (ingressClassOf(cluster, ingress)
          ? (ingressClassOf(cluster, ingress)?.metadata.name ?? '<none>')
          : '<none>'),
    ),
    field(
      'Default backend',
      ingress.spec.defaultBackend ? backendText(ingress.spec.defaultBackend) : '<default>',
    ),
    ...(ingress.spec.tls?.length
      ? [
          'TLS:',
          ...ingress.spec.tls.map(
            (tls) => `  ${tls.secretName ?? ''} terminates ${(tls.hosts ?? []).join(',')}`,
          ),
        ]
      : []),
    'Rules:',
    table(rows),
    multi('Annotations', annotationLines(ingress.metadata.annotations)),
    eventsTable(cluster, events),
  ].join('\n')
}

export function describeNode(cluster: Cluster, node: NodeRecord): string {
  const pods = cluster.pods.filter((pod) => pod.nodeName === node.name)
  const used = nodeUsage(cluster, node)
  const limits = pods.reduce(
    (sum, pod) => ({
      cpu:
        sum.cpu +
        pod.spec.containers.reduce(
          (total, container) => total + (cpuMillis(container.resources?.limits?.cpu) || 0),
          0,
        ),
      memory:
        sum.memory +
        pod.spec.containers.reduce(
          (total, container) => total + (memoryMi(container.resources?.limits?.memory) || 0),
          0,
        ),
    }),
    { cpu: 0, memory: 0 },
  )
  const percent = (value: number, total: number) => `${Math.round((value / total) * 100)}%`
  const podRows = [
    [
      '  Namespace',
      'Name',
      'CPU Requests',
      'CPU Limits',
      'Memory Requests',
      'Memory Limits',
      'Age',
    ],
    [
      '  ---------',
      '----',
      '------------',
      '----------',
      '---------------',
      '-------------',
      '---',
    ],
    ...pods.map((pod) => {
      const requests = podRequests(pod.spec)
      const cpuLimit = pod.spec.containers.reduce(
        (total, container) => total + (cpuMillis(container.resources?.limits?.cpu) || 0),
        0,
      )
      const memLimit = pod.spec.containers.reduce(
        (total, container) => total + (memoryMi(container.resources?.limits?.memory) || 0),
        0,
      )
      return [
        `  ${pod.namespace}`,
        pod.name,
        `${requests.cpu}m (${percent(requests.cpu, node.cpu)})`,
        `${cpuLimit}m (${percent(cpuLimit, node.cpu)})`,
        `${Math.round(requests.memory)}Mi (${percent(requests.memory, node.memory)})`,
        `${Math.round(memLimit)}Mi (${percent(memLimit, node.memory)})`,
        age(cluster, pod.createdAt),
      ]
    }),
  ]
  const manifest = nodeManifest(cluster, node)
  return [
    field('Name', node.name),
    field('Roles', '<none>'),
    multi('Labels', labelLines(node.labels)),
    multi('Annotations', [
      'node.alpha.kubernetes.io/ttl: 0',
      'volumes.kubernetes.io/controller-managed-attach-detach: true',
    ]),
    field('CreationTimestamp', date(node.createdAt)),
    multi(
      'Taints',
      node.taints.map(
        (taint) => `${taint.key}${taint.value ? `=${taint.value}` : ''}:${taint.effect}`,
      ),
    ),
    field('Unschedulable', String(Boolean(node.unschedulable))),
    'Conditions:',
    table([
      ['  Type', 'Status', 'Reason', 'Message'],
      ['  ----', '------', '------', '-------'],
      ...manifest.status.conditions.map((condition) => [
        `  ${condition.type}`,
        condition.status,
        condition.reason,
        condition.message ??
          `kubelet has ${condition.reason
            .replace(/^KubeletHas/, '')
            .replace(/([A-Z])/g, ' $1')
            .trim()
            .toLowerCase()}`,
      ]),
    ]),
    'Addresses:',
    `  InternalIP:  ${node.ip}`,
    `  Hostname:    ${node.name}`,
    'Capacity:',
    `  cpu:     ${manifest.status.capacity.cpu}`,
    `  memory:  ${manifest.status.capacity.memory}`,
    `  pods:    110`,
    'Allocatable:',
    `  cpu:     ${node.cpu}m`,
    `  memory:  ${node.memory * 1024}Ki`,
    `  pods:    110`,
    'System Info:',
    '  Kernel Version:             6.8.0-1041-azure',
    '  OS Image:                   Ubuntu 24.04.3 LTS',
    '  Operating System:           linux',
    '  Architecture:               amd64',
    '  Container Runtime Version:  containerd://2.1.4-1',
    '  Kubelet Version:            v1.34.4',
    `ProviderID:                   ${manifest.spec.providerID}`,
    `Non-terminated Pods:          (${pods.length} in total)`,
    table(podRows),
    'Allocated resources:',
    '  (Total limits may be over 100 percent, i.e., overcommitted.)',
    table([
      ['  Resource', 'Requests', 'Limits'],
      ['  --------', '--------', '------'],
      [
        '  cpu',
        `${used.cpu}m (${percent(used.cpu, node.cpu)})`,
        `${limits.cpu}m (${percent(limits.cpu, node.cpu)})`,
      ],
      [
        '  memory',
        `${Math.round(used.memory)}Mi (${percent(used.memory, node.memory)})`,
        `${Math.round(limits.memory)}Mi (${percent(limits.memory, node.memory)})`,
      ],
    ]),
    'Events:                       <none>',
  ].join('\n')
}

export function describeClaim(cluster: Cluster, claim: PersistentVolumeClaim): string {
  const state = claimState(cluster, claim)
  const namespace = claim.metadata.namespace ?? 'default'
  const users = cluster.pods
    .filter(
      (pod) =>
        pod.namespace === namespace &&
        (pod.spec.volumes ?? []).some(
          (volume) => volume.persistentVolumeClaim?.claimName === claim.metadata.name,
        ),
    )
    .map((pod) => pod.name)
  const events = allEvents(cluster, namespace).filter(
    (event) => event.object === `persistentvolumeclaim/${claim.metadata.name}`,
  )
  const bound = state.phase === 'Bound'
  return [
    field('Name', claim.metadata.name, 15),
    field('Namespace', namespace, 15),
    field(
      'StorageClass',
      claim.spec.storageClassName ?? state.storageClass?.metadata.name ?? '',
      15,
    ),
    field('Status', state.phase, 15),
    field('Volume', bound ? (state.volumeName ?? '') : '', 15),
    multi('Labels', labelLines(claim.metadata.labels), 15),
    multi(
      'Annotations',
      bound
        ? [
            'pv.kubernetes.io/bind-completed: yes',
            'volume.kubernetes.io/storage-provisioner: disk.csi.azure.com',
          ]
        : annotationLines(claim.metadata.annotations),
      15,
    ),
    field('Finalizers', '[kubernetes.io/pvc-protection]', 15),
    field('Capacity', bound ? (claim.spec.resources?.requests?.storage ?? '') : '', 15),
    field(
      'Access Modes',
      bound
        ? (claim.spec.accessModes ?? [])
            .map((mode) => ({ ReadWriteOnce: 'RWO', ReadWriteMany: 'RWX' })[mode] ?? mode)
            .join(',')
        : '',
      15,
    ),
    field('VolumeMode', claim.spec.volumeMode ?? 'Filesystem', 15),
    multi('Used By', users, 15),
    eventsTable(cluster, events),
  ].join('\n')
}

export function describeConfig(object: Resource): string {
  const namespace = object.metadata.namespace ?? 'default'
  const lines = [
    field('Name', object.metadata.name, 14),
    field('Namespace', namespace, 14),
    multi('Labels', labelLines(object.metadata.labels), 14),
    multi('Annotations', annotationLines(object.metadata.annotations), 14),
    '',
  ]
  if (object.kind === 'ConfigMap') {
    lines.push('Data', '====')
    for (const [key, value] of Object.entries(object.data ?? {}))
      lines.push(`${key}:`, '----', value, '')
    lines.push('', 'BinaryData', '====', '', 'Events:  <none>')
  } else if (object.kind === 'Secret') {
    lines.push(field('Type', object.type ?? 'Opaque', 6), '', 'Data', '====')
    for (const [key, value] of Object.entries(object.data ?? {})) {
      const bytes =
        Math.floor((value.length * 3) / 4) -
        (value.endsWith('==') ? 2 : value.endsWith('=') ? 1 : 0)
      lines.push(`${key}:  ${bytes} bytes`)
    }
  }
  return lines.join('\n')
}

export function describeGeneric(object: Resource): string {
  return [
    field('Name', object.metadata.name, 14),
    ...(object.metadata.namespace ? [field('Namespace', object.metadata.namespace, 14)] : []),
    multi('Labels', labelLines(object.metadata.labels), 14),
    multi('Annotations', annotationLines(object.metadata.annotations), 14),
    ...(object.kind === 'StorageClass'
      ? [
          field('Provisioner', object.provisioner, 22),
          field(
            'Parameters',
            Object.entries(object.parameters ?? {})
              .map(([key, value]) => `${key}=${value}`)
              .join(',') || '<none>',
            22,
          ),
          field('AllowVolumeExpansion', String(object.allowVolumeExpansion ?? false), 22),
          field('ReclaimPolicy', object.reclaimPolicy ?? 'Delete', 22),
          field('VolumeBindingMode', object.volumeBindingMode ?? 'Immediate', 22),
        ]
      : []),
    ...(object.kind === 'IngressClass' ? [field('Controller', object.spec.controller, 14)] : []),
    ...(object.kind === 'Namespace'
      ? [field('Status', 'Active', 14), '', 'No resource quota.', '', 'No LimitRange resource.']
      : []),
    'Events:        <none>',
  ].join('\n')
}
