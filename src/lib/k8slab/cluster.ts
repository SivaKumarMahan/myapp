import type {
  AppProfile,
  Cluster,
  Container,
  Deployment,
  EventRecord,
  ImageFact,
  Ingress,
  IngressClass,
  Labels,
  NodeRecord,
  PersistentVolumeClaim,
  PodRecord,
  PodSpec,
  PodTemplate,
  Probe,
  ReplicaSetRecord,
  Resource,
  ResourceKind,
  Secret,
  Service,
  StorageClass,
} from './types'
import {
  clone,
  cpuMillis,
  fnv,
  fromBase64,
  isoAt,
  matchesSelector,
  memoryMi,
  nameSuffix,
  secondsOf,
  stableJson,
  uidFor,
} from './util'

/**
 * The pretend cluster. Desired state lives in `cluster.objects` (real
 * manifest shapes); `reconcile()` plays the controllers - Deployment →
 * ReplicaSet → Pods, the scheduler - and `podView()` plays the kubelet: it
 * derives each container's state from its spec plus the scenario's "world
 * facts" (which image tags exist, what the app really listens on, how much
 * memory it really needs). Everything is deterministic for a given clock.
 */

/* ---------- lookups ---------- */

export function findObject<K extends ResourceKind>(
  cluster: Cluster,
  kind: K,
  name: string,
  namespace?: string,
): Extract<Resource, { kind: K }> | undefined {
  return cluster.objects.find(
    (object) =>
      object.kind === kind &&
      object.metadata.name === name &&
      (namespace === undefined || !isNamespaced(kind) || object.metadata.namespace === namespace),
  ) as Extract<Resource, { kind: K }> | undefined
}

export function listObjects<K extends ResourceKind>(
  cluster: Cluster,
  kind: K,
  namespace?: string | null,
): Extract<Resource, { kind: K }>[] {
  return cluster.objects.filter(
    (object) =>
      object.kind === kind &&
      (namespace == null || !isNamespaced(kind) || object.metadata.namespace === namespace),
  ) as Extract<Resource, { kind: K }>[]
}

export const isNamespaced = (kind: string) =>
  !['Namespace', 'Node', 'StorageClass', 'IngressClass', 'PersistentVolume'].includes(kind)

export const namespaces = (cluster: Cluster) =>
  listObjects(cluster, 'Namespace').map((entry) => entry.metadata.name)

export const createdAt = (object: { metadata: { creationTimestamp?: string } }, fallback = 0) =>
  secondsOf(object.metadata.creationTimestamp, fallback)

export function nextSeq(cluster: Cluster): number {
  cluster.seq += 1
  return cluster.seq
}

/** Fills in uid, creationTimestamp and generation for a new object. */
export function stamp<T extends Resource>(cluster: Cluster, object: T): T {
  const seq = nextSeq(cluster)
  object.metadata.uid ??= uidFor(`${object.kind}/${object.metadata.name}/${seq}`)
  object.metadata.creationTimestamp ??= isoAt(cluster.now)
  object.metadata.resourceVersion = String(1000 + seq * 7)
  if (object.kind === 'Deployment') object.metadata.generation = 1
  if (object.kind === 'Ingress') {
    const ingress = object as Ingress
    if (
      !ingress.spec.ingressClassName &&
      !ingress.metadata.annotations?.['kubernetes.io/ingress.class']
    ) {
      const fallback = listObjects(cluster, 'IngressClass').find(
        (entry) =>
          entry.metadata.annotations?.['ingressclass.kubernetes.io/is-default-class'] === 'true',
      )
      if (fallback) ingress.spec.ingressClassName = fallback.metadata.name
    }
  }
  if (object.kind === 'Service') {
    const service = object as Service
    service.spec.type ??= 'ClusterIP'
    if (!service.spec.clusterIP) service.spec.clusterIP = clusterIpFor(service)
    for (const port of service.spec.ports ?? []) {
      port.protocol ??= 'TCP'
      port.targetPort ??= port.port
      if (
        (service.spec.type === 'NodePort' || service.spec.type === 'LoadBalancer') &&
        !port.nodePort
      )
        port.nodePort = 30000 + (fnv(`${service.metadata.name}:${port.port}`) % 2767)
    }
  }
  return object
}

export const clusterIpFor = (service: Service) => {
  const hash = fnv(`${service.metadata.namespace}/${service.metadata.name}`)
  return `10.0.${(hash >>> 8) % 250}.${(hash % 250) + 2}`
}

/* ---------- images and registries ---------- */

export interface ImageRef {
  host: string
  repo: string
  tag: string
  /** As containerd prints it (docker.io/library/nginx:1.27). */
  full: string
}

const REFERENCE =
  /^(?:[a-z0-9]+(?:[._-][a-z0-9]+)*(?::\d+)?\/)?[a-z0-9]+(?:[._-][a-z0-9]+)*(?:\/[a-z0-9]+(?:[._-][a-z0-9]+)*)*(?::[\w][\w.-]{0,127})?(?:@sha256:[a-f0-9]{64})?$/

/** Parses an image reference; null for an invalid one (InvalidImageName). */
export function parseImage(image: string): ImageRef | null {
  if (!image || !REFERENCE.test(image)) return null
  const withoutDigest = image.split('@')[0]
  const slash = withoutDigest.indexOf('/')
  const first = slash > 0 ? withoutDigest.slice(0, slash) : ''
  const hasHost = slash > 0 && (first.includes('.') || first.includes(':') || first === 'localhost')
  const host = hasHost ? first : 'docker.io'
  let path = hasHost ? withoutDigest.slice(slash + 1) : withoutDigest
  const colon = path.lastIndexOf(':')
  const tag = colon > 0 ? path.slice(colon + 1) : 'latest'
  if (colon > 0) path = path.slice(0, colon)
  if (host === 'docker.io' && !path.includes('/')) path = `library/${path}`
  return { host, repo: `${host}/${path}`, tag, full: `${host}/${path}:${tag}` }
}

export function imageFact(cluster: Cluster, image: string): ImageFact | undefined {
  const ref = parseImage(image)
  return ref ? cluster.images.find((entry) => entry.repo === ref.repo) : undefined
}

/** The app an image runs, with any per-tag differences applied. */
export function appFor(cluster: Cluster, image: string): AppProfile | null {
  const ref = parseImage(image)
  const fact = imageFact(cluster, image)
  if (!ref || !fact || !fact.tags.includes(ref.tag)) return null
  return { ...fact.app, ...(fact.tagApps?.[ref.tag] ?? {}) }
}

export type PullResult =
  | { ok: true; digest: string; bytes: number }
  | { ok: false; reason: 'InvalidImageName' | 'ErrImagePull'; message: string }

function dockerConfigAuth(secret: Secret, host: string) {
  const raw = secret.data?.['.dockerconfigjson']
  if (!raw) return null
  try {
    const parsed = JSON.parse(fromBase64(raw)) as {
      auths?: Record<string, { username?: string; password?: string; auth?: string }>
    }
    const entry = parsed.auths?.[host] ?? parsed.auths?.[`https://${host}`]
    if (!entry) return null
    if (entry.username !== undefined) return { username: entry.username, password: entry.password }
    const [username, ...rest] = fromBase64(entry.auth ?? '').split(':')
    return { username, password: rest.join(':') }
  } catch {
    return null
  }
}

export function pullImage(
  cluster: Cluster,
  namespace: string,
  image: string,
  pullSecrets: string[],
): PullResult {
  const ref = parseImage(image)
  if (!ref)
    return {
      ok: false,
      reason: 'InvalidImageName',
      message: `Failed to apply default image tag "${image}": couldn't parse image name "${image}": invalid reference format`,
    }
  const registry = cluster.registries.find((entry) => entry.host === ref.host)
  const prefix = `Failed to pull image "${image}": `
  const unpack = `failed to pull and unpack image "${ref.full}": failed to resolve reference "${ref.full}"`
  if (!registry)
    return {
      ok: false,
      reason: 'ErrImagePull',
      message: `${prefix}rpc error: code = Unknown desc = ${unpack}: failed to do request: Head "https://${ref.host}/v2/${ref.repo.slice(ref.host.length + 1)}/manifests/${ref.tag}": dial tcp: lookup ${ref.host} on 168.63.129.16:53: no such host`,
    }
  let authorised = registry.anonymous || registry.kubeletAccess
  if (!authorised) {
    for (const name of pullSecrets) {
      const secret = findObject(cluster, 'Secret', name, namespace)
      if (!secret || secret.type !== 'kubernetes.io/dockerconfigjson') continue
      const auth = dockerConfigAuth(secret, ref.host)
      if (auth && auth.username === registry.username && auth.password === registry.password)
        authorised = true
    }
  }
  const scope = encodeURIComponent(`repository:${ref.repo.slice(ref.host.length + 1)}:pull`)
  if (!authorised)
    return {
      ok: false,
      reason: 'ErrImagePull',
      message: `${prefix}rpc error: code = Unknown desc = ${unpack}: failed to authorize: failed to fetch anonymous token: unexpected status from GET request to https://${ref.host}/oauth2/token?scope=${scope}&service=${ref.host}: 401 Unauthorized`,
    }
  const fact = cluster.images.find((entry) => entry.repo === ref.repo)
  if (!fact || !fact.tags.includes(ref.tag))
    return {
      ok: false,
      reason: 'ErrImagePull',
      message: `${prefix}rpc error: code = NotFound desc = ${unpack}: ${ref.full}: not found`,
    }
  const digest = `sha256:${fnv(ref.full).toString(16).padStart(8, '0')}${fnv(`${ref.full}#`).toString(16).padStart(8, '0')}${'0'.repeat(48)}`
  return { ok: true, digest, bytes: 20_000_000 + (fnv(ref.full) % 90_000_000) }
}

/* ---------- containers: config, command, probes ---------- */

export type ConfigProblem = { message: string } | null

/** CreateContainerConfigError causes: env from a missing ConfigMap / Secret / key. */
export function configProblem(
  cluster: Cluster,
  namespace: string,
  container: Container,
): ConfigProblem {
  for (const source of container.envFrom ?? []) {
    if (source.configMapRef && !source.configMapRef.optional) {
      if (!findObject(cluster, 'ConfigMap', source.configMapRef.name, namespace))
        return { message: `configmap "${source.configMapRef.name}" not found` }
    }
    if (source.secretRef && !source.secretRef.optional) {
      if (!findObject(cluster, 'Secret', source.secretRef.name, namespace))
        return { message: `secret "${source.secretRef.name}" not found` }
    }
  }
  for (const entry of container.env ?? []) {
    const configRef = entry.valueFrom?.configMapKeyRef
    if (configRef && !configRef.optional) {
      const map = findObject(cluster, 'ConfigMap', configRef.name, namespace)
      if (!map) return { message: `configmap "${configRef.name}" not found` }
      if (map.data?.[configRef.key] === undefined)
        return {
          message: `couldn't find key ${configRef.key} in ConfigMap ${namespace}/${configRef.name}`,
        }
    }
    const secretRef = entry.valueFrom?.secretKeyRef
    if (secretRef && !secretRef.optional) {
      const secret = findObject(cluster, 'Secret', secretRef.name, namespace)
      if (!secret) return { message: `secret "${secretRef.name}" not found` }
      if (secret.data?.[secretRef.key] === undefined)
        return {
          message: `couldn't find key ${secretRef.key} in Secret ${namespace}/${secretRef.name}`,
        }
    }
  }
  return null
}

/** The environment a container would see (resolved values). */
export function resolvedEnv(
  cluster: Cluster,
  namespace: string,
  container: Container,
  pod?: PodRecord,
): [string, string][] {
  const out = new Map<string, string>()
  for (const source of container.envFrom ?? []) {
    const prefix = source.prefix ?? ''
    if (source.configMapRef) {
      const map = findObject(cluster, 'ConfigMap', source.configMapRef.name, namespace)
      for (const [key, value] of Object.entries(map?.data ?? {})) out.set(prefix + key, value)
    }
    if (source.secretRef) {
      const secret = findObject(cluster, 'Secret', source.secretRef.name, namespace)
      for (const [key, value] of Object.entries(secret?.data ?? {}))
        out.set(prefix + key, fromBase64(value))
    }
  }
  for (const entry of container.env ?? []) {
    if (entry.value !== undefined) out.set(entry.name, entry.value)
    else if (entry.valueFrom?.configMapKeyRef) {
      const ref = entry.valueFrom.configMapKeyRef
      const value = findObject(cluster, 'ConfigMap', ref.name, namespace)?.data?.[ref.key]
      if (value !== undefined) out.set(entry.name, value)
    } else if (entry.valueFrom?.secretKeyRef) {
      const ref = entry.valueFrom.secretKeyRef
      const value = findObject(cluster, 'Secret', ref.name, namespace)?.data?.[ref.key]
      if (value !== undefined) out.set(entry.name, fromBase64(value))
    } else if (entry.valueFrom?.fieldRef) {
      const path = entry.valueFrom.fieldRef.fieldPath
      const value =
        path === 'metadata.name'
          ? pod?.name
          : path === 'metadata.namespace'
            ? namespace
            : path === 'status.podIP'
              ? (pod?.ip ?? '')
              : path === 'spec.nodeName'
                ? (pod?.nodeName ?? '')
                : ''
      out.set(entry.name, value ?? '')
    } else out.set(entry.name, '')
  }
  return [...out.entries()]
}

/** How a container's process ends, if it does: the cause of a CrashLoopBackOff. */
export interface CrashCause {
  kind: 'exit' | 'oom' | 'start'
  exitCode: number
  reason: 'Error' | 'OOMKilled' | 'Completed' | 'StartError'
  logs: string[]
  /** For StartError: the runtime's message. */
  message?: string
  /** Seconds the process runs before it dies. */
  runFor: number
}

const NODE_NOT_FOUND = (path: string) => [
  'node:internal/modules/cjs/loader:1386',
  '  throw err;',
  '  ^',
  '',
  `Error: Cannot find module '${path}'`,
  '    at Function._resolveFilename (node:internal/modules/cjs/loader:1383:15)',
  '    at defaultResolveImpl (node:internal/modules/cjs/loader:1025:19)',
  '    at resolveForCJSWithHooks (node:internal/modules/cjs/loader:1030:22)',
  '    at Function._load (node:internal/modules/cjs/loader:1192:37)',
  '    at TracingChannel.traceSync (node:diagnostics_channel:322:14)',
  '    at wrapModuleLoad (node:internal/modules/cjs/loader:237:24)',
  '    at Function.executeUserEntryPoint [as runMain] (node:internal/modules/run_main:171:5)',
  '    at node:internal/main/run_main_module:36:49 {',
  "  code: 'MODULE_NOT_FOUND',",
  '  requireStack: []',
  '}',
  '',
  'Node.js v22.21.1',
]

export function effectiveCommand(container: Container, app: AppProfile): string[] {
  if (container.command) return [...container.command, ...(container.args ?? [])]
  if (container.args) return [app.command[0], ...container.args]
  return app.command
}

/** Why this container would exit (bad command, missing env, too little memory) - or null. */
export function crashCause(
  cluster: Cluster,
  namespace: string,
  container: Container,
  app: AppProfile,
): CrashCause | null {
  const command = effectiveCommand(container, app)
  const isDefault = stableJson(command) === stableJson(app.command)
  if (!isDefault) {
    const binary = command[0] ?? ''
    const bins = app.bins ?? []
    const name = binary.split('/').pop() ?? binary
    if (!bins.includes(name))
      return {
        kind: 'start',
        exitCode: 128,
        reason: 'StartError',
        runFor: 0,
        logs: [],
        message: `failed to create containerd task: failed to create shim task: OCI runtime create failed: runc create failed: unable to start container process: error during container init: exec: "${binary}": executable file not found in $PATH: unknown`,
      }
    if (app.runtime === 'node' || app.runtime === 'python') {
      const script = command.slice(1).find((part) => !part.startsWith('-'))
      if (script) {
        const path = script.startsWith('/') ? script : `/app/${script.replace(/^\.\//, '')}`
        if (!(app.files ?? []).includes(path))
          return {
            kind: 'exit',
            exitCode: app.runtime === 'node' ? 1 : 2,
            reason: 'Error',
            runFor: 1,
            logs:
              app.runtime === 'node'
                ? NODE_NOT_FOUND(path)
                : [`${binary}: can't open file '${path}': [Errno 2] No such file or directory`],
          }
      }
    }
  }
  if (app.exits !== undefined)
    return {
      kind: 'exit',
      exitCode: app.exits,
      reason: app.exits === 0 ? 'Completed' : 'Error',
      runFor: 1,
      logs: app.logs,
    }
  const env = new Map(resolvedEnv(cluster, namespace, container))
  for (const name of app.requiredEnv ?? []) {
    if (!env.get(name))
      return {
        kind: 'exit',
        exitCode: 1,
        reason: 'Error',
        runFor: 2,
        logs: [
          ...app.logs.slice(0, 1),
          `{"level":"fatal","msg":"missing required environment variable ${name}","exit":1}`,
        ],
      }
  }
  const limit = memoryMi(container.resources?.limits?.memory)
  if (limit > 0 && app.memory > limit)
    return {
      kind: 'oom',
      exitCode: 137,
      reason: 'OOMKilled',
      runFor: 8,
      logs: app.logs.slice(0, Math.max(1, app.logs.length - 1)),
    }
  return null
}

/** Resolves a probe or Service port (number or a named container port). */
export function resolvePort(container: Container, port: number | string | undefined) {
  if (port === undefined) return null
  if (typeof port === 'number') return port
  if (/^\d+$/.test(port)) return Number(port)
  return container.ports?.find((entry) => entry.name === port)?.containerPort ?? null
}

/** A probe's result against the running app; null = success. */
export function probeFailure(
  container: Container,
  app: AppProfile,
  probe: Probe,
  ip: string,
  kind: 'Liveness' | 'Readiness' | 'Startup',
): string | null {
  if (probe.httpGet) {
    const port = resolvePort(container, probe.httpGet.port)
    const path = probe.httpGet.path ?? '/'
    const scheme = (probe.httpGet.scheme ?? 'HTTP').toLowerCase()
    if (port === null || port !== app.port)
      return `${kind} probe failed: Get "${scheme}://${ip}:${port ?? probe.httpGet.port}${path}": dial tcp ${ip}:${port ?? 0}: connect: connection refused`
    if (!app.routes || app.routes[path.split('?')[0]] === undefined)
      return `${kind} probe failed: HTTP probe failed with statuscode: 404`
    return null
  }
  if (probe.tcpSocket) {
    const port = resolvePort(container, probe.tcpSocket.port)
    if (port === null || port !== app.port)
      return `${kind} probe failed: dial tcp ${ip}:${port ?? 0}: connect: connection refused`
  }
  return null
}

const probeRunFor = (probe: Probe) =>
  (probe.initialDelaySeconds ?? 0) + (probe.periodSeconds ?? 10) * (probe.failureThreshold ?? 3)

/* ---------- restart cycles ---------- */

const BACKOFF = [10, 20, 40, 80, 160, 300]
const backoff = (attempt: number) => BACKOFF[Math.min(attempt, BACKOFF.length - 1)]

export interface Cycle {
  running: boolean
  /** When the current (or waiting-to-restart) attempt started. */
  startedAt: number
  restarts: number
  /** The last finished run. */
  last?: { startedAt: number; finishedAt: number }
}

/** A process that dies after `runFor` seconds, restarted with kubelet's back-off. */
export function crashCycle(start: number, now: number, runFor: number): Cycle {
  let time = start
  let restarts = 0
  let last: Cycle['last']
  for (let guard = 0; guard < 100_000; guard++) {
    const end = time + Math.max(runFor, 0.5)
    if (end > now) return { running: true, startedAt: time, restarts, last }
    last = { startedAt: time, finishedAt: end }
    const next = end + backoff(restarts)
    if (next > now) return { running: false, startedAt: time, restarts, last }
    restarts += 1
    time = next
  }
  return { running: false, startedAt: time, restarts, last }
}

/** Image pull attempts so far, with back-off; and whether one just failed. */
export function pullAttempts(start: number, now: number) {
  let time = start
  let attempts = 0
  let lastAt = start
  for (let guard = 0; guard < 100_000 && time <= now; guard++) {
    attempts += 1
    lastAt = time
    time += backoff(attempts - 1) + 1
  }
  return { attempts: Math.max(1, attempts), lastAt, recent: now - lastAt < 8 }
}

/* ---------- the kubelet's view of a Pod ---------- */

export interface ContainerView {
  name: string
  image: string
  imageId?: string
  state: 'waiting' | 'running' | 'terminated'
  reason?: string
  message?: string
  startedAt?: number
  exitCode?: number
  last?: { reason: string; exitCode: number; startedAt: number; finishedAt: number }
  ready: boolean
  started: boolean
  restarts: number
  lastRestartAt?: number
  /** What `kubectl logs` shows; null when there is no container to read from. */
  logs: string[] | null
  previousLogs: string[] | null
  waitingFor?: string
  memory: number
  cpu: number
  app: AppProfile | null
}

export interface EventLine {
  type: 'Normal' | 'Warning'
  reason: string
  source: string
  message: string
  firstAt: number
  lastAt: number
  count: number
}

export interface PodView {
  pod: PodRecord
  phase: 'Pending' | 'Running' | 'Succeeded' | 'Failed'
  /** The STATUS column. */
  status: string
  ready: boolean
  readyCount: number
  total: number
  restarts: number
  lastRestartAt?: number
  containers: ContainerView[]
  events: EventLine[]
  scheduled: boolean
  conditions: { type: string; status: 'True' | 'False' }[]
}

export function podPullSecrets(pod: PodRecord): string[] {
  return [...(pod.spec.imagePullSecrets ?? []).map((entry) => entry.name), ...pod.saPullSecrets]
}

function volumeProblem(cluster: Cluster, pod: PodRecord): string | null {
  for (const volume of pod.spec.volumes ?? []) {
    if (volume.configMap && !volume.configMap.optional) {
      if (!findObject(cluster, 'ConfigMap', volume.configMap.name, pod.namespace))
        return `MountVolume.SetUp failed for volume "${volume.name}" : configmap "${volume.configMap.name}" not found`
    }
    if (volume.secret && !volume.secret.optional) {
      if (!findObject(cluster, 'Secret', volume.secret.secretName, pod.namespace))
        return `MountVolume.SetUp failed for volume "${volume.name}" : secret "${volume.secret.secretName}" not found`
    }
  }
  return null
}

export function podView(cluster: Cluster, pod: PodRecord, at = cluster.now): PodView {
  const events: EventLine[] = []
  const event = (
    type: EventLine['type'],
    reason: string,
    message: string,
    firstAt: number,
    lastAt = firstAt,
    count = 1,
    source = 'kubelet',
  ) => events.push({ type, reason, message, firstAt, lastAt, count, source })

  const containers: ContainerView[] = []
  const total = pod.spec.containers.length
  if (!pod.nodeName || pod.scheduledAt === undefined) {
    const age = at - pod.createdAt
    const tries = Math.max(1, Math.min(Math.floor(age / 60) + 1, 30))
    if (pod.unschedulable)
      event(
        'Warning',
        'FailedScheduling',
        pod.unschedulable,
        pod.createdAt,
        pod.createdAt + Math.floor(age * 0.9),
        tries,
        'default-scheduler',
      )
    for (const container of pod.spec.containers)
      containers.push({
        name: container.name,
        image: container.image,
        state: 'waiting',
        ready: false,
        started: false,
        restarts: 0,
        logs: null,
        previousLogs: null,
        waitingFor: 'ContainerCreating',
        memory: 0,
        cpu: 0,
        app: null,
      })
    return {
      pod,
      phase: 'Pending',
      status: 'Pending',
      ready: false,
      readyCount: 0,
      total,
      restarts: 0,
      containers,
      events,
      scheduled: false,
      conditions: [{ type: 'PodScheduled', status: 'False' }],
    }
  }

  const start = pod.scheduledAt
  event(
    'Normal',
    'Scheduled',
    `Successfully assigned ${pod.namespace}/${pod.name} to ${pod.nodeName}`,
    start,
    start,
    1,
    'default-scheduler',
  )
  const mount = volumeProblem(cluster, pod)
  if (mount) {
    const age = at - start
    event(
      'Warning',
      'FailedMount',
      mount,
      start + 1,
      at - (age % 120),
      Math.max(1, Math.floor(age / 120) + 1),
    )
    for (const container of pod.spec.containers)
      containers.push({
        name: container.name,
        image: container.image,
        state: 'waiting',
        reason: 'ContainerCreating',
        ready: false,
        started: false,
        restarts: 0,
        logs: null,
        previousLogs: null,
        waitingFor: 'ContainerCreating',
        memory: 0,
        cpu: 0,
        app: null,
      })
    return {
      pod,
      phase: 'Pending',
      status: 'ContainerCreating',
      ready: false,
      readyCount: 0,
      total,
      restarts: 0,
      containers,
      events,
      scheduled: true,
      conditions: [
        { type: 'PodReadyToStartContainers', status: 'False' },
        { type: 'Initialized', status: 'True' },
        { type: 'Ready', status: 'False' },
        { type: 'ContainersReady', status: 'False' },
        { type: 'PodScheduled', status: 'True' },
      ],
    }
  }

  const ip = pod.ip ?? '10.244.0.1'
  for (const container of pod.spec.containers) {
    const base = {
      name: container.name,
      image: container.image,
      ready: false,
      started: false,
      restarts: 0,
      logs: null,
      previousLogs: null,
      memory: 0,
      cpu: 0,
      app: null,
    }
    const pulled = pullImage(cluster, pod.namespace, container.image, podPullSecrets(pod))
    if (!pulled.ok) {
      if (pulled.reason === 'InvalidImageName') {
        event('Warning', 'InspectFailed', pulled.message, start + 1, at, 1)
        event(
          'Warning',
          'Failed',
          'Error: InvalidImageName',
          start + 1,
          at,
          Math.max(1, Math.floor((at - start) / 10)),
        )
        containers.push({
          ...base,
          state: 'waiting',
          reason: 'InvalidImageName',
          message: pulled.message,
          waitingFor: 'InvalidImageName',
        })
        continue
      }
      const tries = pullAttempts(start + 1, at)
      const missing = podPullSecrets(pod).filter(
        (name) => !findObject(cluster, 'Secret', name, pod.namespace),
      )
      if (missing.length)
        event(
          'Warning',
          'FailedToRetrieveImagePullSecret',
          `Unable to retrieve some image pull secrets (${missing.join(', ')}); attempting to pull the image without them`,
          start + 1,
          tries.lastAt,
          tries.attempts,
        )
      event(
        'Normal',
        'Pulling',
        `Pulling image "${container.image}"`,
        start + 1,
        tries.lastAt,
        tries.attempts,
      )
      event('Warning', 'Failed', pulled.message, start + 2, tries.lastAt + 1, tries.attempts)
      event('Warning', 'Failed', 'Error: ErrImagePull', start + 2, tries.lastAt + 1, tries.attempts)
      if (tries.attempts > 1 || !tries.recent) {
        event(
          'Normal',
          'BackOff',
          `Back-off pulling image "${container.image}"`,
          start + 3,
          at - 2,
          Math.max(1, tries.attempts * 2 - 1),
        )
        event(
          'Warning',
          'Failed',
          'Error: ImagePullBackOff',
          start + 3,
          at - 2,
          Math.max(1, tries.attempts * 2 - 1),
        )
      }
      const reason = tries.recent ? 'ErrImagePull' : 'ImagePullBackOff'
      containers.push({
        ...base,
        state: 'waiting',
        reason,
        message: tries.recent
          ? pulled.message.replace(/^Failed to pull image "[^"]*": /, '')
          : `Back-off pulling image "${container.image}"`,
        waitingFor: 'trying and failing to pull image',
      })
      continue
    }
    const pulledMessage = `Successfully pulled image "${container.image}" in 1.204s (1.204s including waiting). Image size: ${pulled.bytes} bytes.`
    const app = appFor(cluster, container.image) as AppProfile
    const config = configProblem(cluster, pod.namespace, container)
    if (config) {
      const age = at - start
      const count = Math.max(1, Math.floor(age / 15) + 1)
      event('Normal', 'Pulling', `Pulling image "${container.image}"`, start + 1)
      event('Normal', 'Pulled', pulledMessage, start + 2)
      if (count > 1)
        event(
          'Normal',
          'Pulled',
          `Container image "${container.image}" already present on machine`,
          start + 15,
          at,
          count - 1,
        )
      event('Warning', 'Failed', `Error: ${config.message}`, start + 2, at, count)
      containers.push({
        ...base,
        imageId: pulled.digest,
        state: 'waiting',
        reason: 'CreateContainerConfigError',
        message: config.message,
        waitingFor: 'CreateContainerConfigError',
        app,
      })
      continue
    }
    event('Normal', 'Pulling', `Pulling image "${container.image}"`, start + 1)
    event('Normal', 'Pulled', pulledMessage, start + 2)
    const runStart = start + 3
    const crash = crashCause(cluster, pod.namespace, container, app)
    const liveness = container.livenessProbe
      ? probeFailure(container, app, container.livenessProbe, ip, 'Liveness')
      : null
    const startup = container.startupProbe
      ? probeFailure(container, app, container.startupProbe, ip, 'Startup')
      : null
    const readiness = container.readinessProbe
      ? probeFailure(container, app, container.readinessProbe, ip, 'Readiness')
      : null
    const imageId = pulled.digest
    if (crash) {
      const cycle = crashCycle(runStart, at, crash.runFor)
      const attempts = cycle.restarts + 1
      if (cycle.restarts > 0 || !cycle.running)
        event(
          'Normal',
          'Pulled',
          `Container image "${container.image}" already present on machine`,
          runStart + 10,
          cycle.startedAt,
          Math.max(1, cycle.restarts),
        )
      if (crash.kind === 'start') {
        event(
          'Warning',
          'Failed',
          `Error: ${crash.message}`,
          runStart,
          cycle.last?.finishedAt ?? runStart,
          attempts,
        )
      } else {
        event(
          'Normal',
          'Created',
          `Created container: ${container.name}`,
          runStart,
          cycle.startedAt,
          attempts,
        )
        event(
          'Normal',
          'Started',
          `Started container ${container.name}`,
          runStart,
          cycle.startedAt,
          attempts,
        )
      }
      if (cycle.last)
        event(
          'Warning',
          'BackOff',
          `Back-off restarting failed container ${container.name} in pod ${pod.name}_${pod.namespace}(${pod.uid})`,
          cycle.last.finishedAt + 1,
          at - 1,
          Math.max(1, cycle.restarts * 2 + (cycle.running ? 0 : 1)),
        )
      const last = cycle.last
        ? {
            reason: crash.reason,
            exitCode: crash.exitCode,
            startedAt: cycle.last.startedAt,
            finishedAt: cycle.last.finishedAt,
          }
        : undefined
      const crashLogs = crash.logs
      if (cycle.running) {
        containers.push({
          ...base,
          imageId,
          state: 'running',
          startedAt: cycle.startedAt,
          started: true,
          ready: !readiness && !container.readinessProbe ? true : !readiness,
          restarts: cycle.restarts,
          lastRestartAt: cycle.restarts ? cycle.startedAt : undefined,
          last,
          logs: crashLogs.slice(0, Math.max(1, Math.ceil(crashLogs.length / 2))),
          previousLogs: cycle.restarts ? crashLogs : null,
          memory:
            crash.kind === 'oom'
              ? Math.round(memoryMi(container.resources?.limits?.memory) * 0.96)
              : Math.min(app.memory, 40),
          cpu: Math.max(1, Math.round(app.cpu / 3)),
          app,
        })
      } else {
        const fresh = at - (cycle.last?.finishedAt ?? at) < 5
        containers.push({
          ...base,
          imageId,
          state: 'waiting',
          reason: fresh ? crash.reason : 'CrashLoopBackOff',
          message: fresh
            ? crash.message
            : `back-off ${backoff(cycle.restarts)}s restarting failed container=${container.name} pod=${pod.name}_${pod.namespace}(${pod.uid})`,
          restarts: cycle.restarts,
          lastRestartAt: cycle.restarts ? cycle.startedAt : undefined,
          last,
          logs: crashLogs,
          previousLogs: cycle.restarts ? crashLogs : null,
          waitingFor: 'CrashLoopBackOff',
          app,
        })
      }
      continue
    }
    const killer = startup ?? liveness
    if (killer) {
      const probe = (startup ? container.startupProbe : container.livenessProbe) as Probe
      const kind = startup ? 'startup' : 'liveness'
      const runFor = probeRunFor(probe) + 1
      const cycle = crashCycle(runStart, at, runFor)
      const period = probe.periodSeconds ?? 10
      const failures = Math.max(
        1,
        Math.floor((at - runStart - (probe.initialDelaySeconds ?? 0)) / period),
      )
      event(
        'Normal',
        'Created',
        `Created container: ${container.name}`,
        runStart,
        cycle.startedAt,
        cycle.restarts + 1,
      )
      event(
        'Normal',
        'Started',
        `Started container ${container.name}`,
        runStart,
        cycle.startedAt,
        cycle.restarts + 1,
      )
      if (at - runStart > (probe.initialDelaySeconds ?? 0) + period) {
        event(
          'Warning',
          'Unhealthy',
          killer,
          runStart + (probe.initialDelaySeconds ?? 0) + period,
          at - 1,
          failures,
        )
      }
      if (cycle.restarts > 0 || cycle.last) {
        event(
          'Normal',
          'Killing',
          `Container ${container.name} failed ${kind} probe, will be restarted`,
          runStart + runFor - 1,
          (cycle.last?.finishedAt ?? at) - 1,
          cycle.restarts + (cycle.running ? 0 : 1),
        )
        event(
          'Normal',
          'Pulled',
          `Container image "${container.image}" already present on machine`,
          runStart + runFor + 10,
          cycle.startedAt,
          Math.max(1, cycle.restarts),
        )
      }
      if (cycle.last && !cycle.running)
        event(
          'Warning',
          'BackOff',
          `Back-off restarting failed container ${container.name} in pod ${pod.name}_${pod.namespace}(${pod.uid})`,
          cycle.last.finishedAt + 1,
          at - 1,
          Math.max(1, cycle.restarts),
        )
      const killedLogs = [
        ...app.logs,
        '{"level":"info","msg":"SIGTERM received, closing HTTP server"}',
        '{"level":"info","msg":"shutdown complete"}',
      ]
      const last = cycle.last
        ? {
            reason: 'Completed',
            exitCode: 0,
            startedAt: cycle.last.startedAt,
            finishedAt: cycle.last.finishedAt,
          }
        : undefined
      containers.push({
        ...base,
        imageId,
        state: cycle.running ? 'running' : 'waiting',
        reason: cycle.running ? undefined : 'CrashLoopBackOff',
        message: cycle.running
          ? undefined
          : `back-off ${backoff(cycle.restarts)}s restarting failed container=${container.name} pod=${pod.name}_${pod.namespace}(${pod.uid})`,
        startedAt: cycle.running ? cycle.startedAt : undefined,
        started: cycle.running && !startup,
        ready: cycle.running && !startup && !readiness,
        restarts: cycle.restarts,
        lastRestartAt: cycle.restarts ? cycle.startedAt : undefined,
        last,
        logs: cycle.running ? app.logs : killedLogs,
        previousLogs: cycle.last ? killedLogs : null,
        waitingFor: cycle.running ? undefined : 'CrashLoopBackOff',
        memory: cycle.running ? app.memory : 0,
        cpu: cycle.running ? app.cpu : 0,
        app,
      })
      continue
    }
    event('Normal', 'Created', `Created container: ${container.name}`, runStart)
    event('Normal', 'Started', `Started container ${container.name}`, runStart)
    if (readiness) {
      const period = container.readinessProbe?.periodSeconds ?? 10
      const delay = container.readinessProbe?.initialDelaySeconds ?? 0
      if (at - runStart >= delay)
        event(
          'Warning',
          'Unhealthy',
          readiness,
          runStart + delay + 1,
          at - 1,
          Math.max(1, Math.floor((at - runStart - delay) / period) + 1),
        )
    }
    containers.push({
      ...base,
      imageId,
      state: 'running',
      startedAt: runStart,
      started: true,
      ready: !readiness,
      logs: app.logs,
      memory: app.memory,
      cpu: app.cpu,
      app,
    })
  }

  const readyCount = containers.filter((entry) => entry.ready).length
  const restarts = containers.reduce((sum, entry) => sum + entry.restarts, 0)
  const lastRestartAt = containers
    .map((entry) => entry.lastRestartAt)
    .filter((value): value is number => value !== undefined)
    .sort((a, b) => b - a)[0]
  const waiting = containers.find((entry) => entry.state === 'waiting')
  const running = containers.some((entry) => entry.state === 'running')
  const status = waiting?.reason ?? (running ? 'Running' : 'Pending')
  const ready = readyCount === total
  return {
    pod,
    phase:
      running || containers.some((entry) => entry.restarts > 0 || entry.last)
        ? 'Running'
        : 'Pending',
    status,
    ready,
    readyCount,
    total,
    restarts,
    lastRestartAt,
    containers,
    events: events.sort((a, b) => a.firstAt - b.firstAt),
    scheduled: true,
    conditions: [
      { type: 'PodReadyToStartContainers', status: 'True' },
      { type: 'Initialized', status: 'True' },
      { type: 'Ready', status: ready ? 'True' : 'False' },
      { type: 'ContainersReady', status: ready ? 'True' : 'False' },
      { type: 'PodScheduled', status: 'True' },
    ],
  }
}

/* ---------- storage ---------- */

export function defaultStorageClass(cluster: Cluster): StorageClass | undefined {
  return listObjects(cluster, 'StorageClass').find(
    (entry) =>
      entry.metadata.annotations?.['storageclass.kubernetes.io/is-default-class'] === 'true',
  )
}

export interface ClaimState {
  phase: 'Bound' | 'Pending'
  storageClass?: StorageClass
  volumeName?: string
  problem?: string
  waitingForConsumer?: boolean
}

export function claimState(cluster: Cluster, claim: PersistentVolumeClaim): ClaimState {
  const className = claim.spec.storageClassName ?? defaultStorageClass(cluster)?.metadata.name
  if (!className)
    return {
      phase: 'Pending',
      problem: 'no persistent volumes available for this claim and no storage class is set',
    }
  const storageClass = findObject(cluster, 'StorageClass', className)
  if (!storageClass)
    return { phase: 'Pending', problem: `storageclass.storage.k8s.io "${className}" not found` }
  const volumeName = `pvc-${claim.metadata.uid ?? uidFor(claim.metadata.name)}`
  if (storageClass.volumeBindingMode === 'WaitForFirstConsumer') {
    const used = cluster.pods.some(
      (pod) =>
        pod.namespace === claim.metadata.namespace &&
        pod.nodeName &&
        (pod.spec.volumes ?? []).some(
          (volume) => volume.persistentVolumeClaim?.claimName === claim.metadata.name,
        ),
    )
    if (!used) return { phase: 'Pending', storageClass, waitingForConsumer: true }
  }
  return { phase: 'Bound', storageClass, volumeName }
}

/* ---------- the scheduler ---------- */

export const podRequests = (spec: PodSpec) =>
  spec.containers.reduce(
    (sum, container) => ({
      cpu:
        sum.cpu +
        (cpuMillis(container.resources?.requests?.cpu ?? container.resources?.limits?.cpu) || 0),
      memory:
        sum.memory +
        (memoryMi(container.resources?.requests?.memory ?? container.resources?.limits?.memory) ||
          0),
    }),
    { cpu: 0, memory: 0 },
  )

export function nodeUsage(cluster: Cluster, node: NodeRecord, except?: PodRecord) {
  return cluster.pods
    .filter((pod) => pod.nodeName === node.name && pod !== except)
    .reduce(
      (sum, pod) => {
        const requests = podRequests(pod.spec)
        return {
          cpu: sum.cpu + requests.cpu,
          memory: sum.memory + requests.memory,
          pods: sum.pods + 1,
        }
      },
      { cpu: 0, memory: 0, pods: 0 },
    )
}

const tolerates = (spec: PodSpec, taint: { key: string; value?: string; effect: string }) =>
  (spec.tolerations ?? []).some((toleration) => {
    if (toleration.effect && toleration.effect !== taint.effect) return false
    if (!toleration.key) return toleration.operator === 'Exists'
    if (toleration.key !== taint.key) return false
    if (toleration.operator === 'Exists') return true
    return (toleration.value ?? '') === (taint.value ?? '')
  })

function schedule(cluster: Cluster, pod: PodRecord) {
  const total = cluster.nodes.length
  for (const volume of pod.spec.volumes ?? []) {
    const claimName = volume.persistentVolumeClaim?.claimName
    if (!claimName) continue
    const claim = findObject(cluster, 'PersistentVolumeClaim', claimName, pod.namespace)
    if (!claim) {
      pod.unschedulable = `0/${total} nodes are available: persistentvolumeclaim "${claimName}" not found. preemption: 0/${total} nodes are available: ${total} Preemption is not helpful for scheduling.`
      return
    }
    const state = claimState(cluster, claim)
    if (state.phase !== 'Bound' && !state.waitingForConsumer) {
      pod.unschedulable = `0/${total} nodes are available: pod has unbound immediate PersistentVolumeClaims. preemption: 0/${total} nodes are available: ${total} Preemption is not helpful for scheduling.`
      return
    }
  }
  const requests = podRequests(pod.spec)
  const reasons = new Map<string, number>()
  const preemption = new Map<string, number>()
  const add = (map: Map<string, number>, reason: string) =>
    map.set(reason, (map.get(reason) ?? 0) + 1)
  const feasible: { node: NodeRecord; free: number }[] = []
  for (const node of cluster.nodes) {
    if (node.unschedulable) {
      add(reasons, 'node(s) were unschedulable')
      add(preemption, 'Preemption is not helpful for scheduling')
      continue
    }
    const selector = pod.spec.nodeSelector ?? {}
    if (Object.entries(selector).some(([key, value]) => node.labels[key] !== value)) {
      add(reasons, "node(s) didn't match Pod's node affinity/selector")
      add(preemption, 'Preemption is not helpful for scheduling')
      continue
    }
    const blocking = node.taints.find(
      (taint) =>
        (taint.effect === 'NoSchedule' || taint.effect === 'NoExecute') &&
        !tolerates(pod.spec, taint),
    )
    if (blocking) {
      add(reasons, `node(s) had untolerated taint {${blocking.key}: ${blocking.value ?? ''}}`)
      add(preemption, 'Preemption is not helpful for scheduling')
      continue
    }
    const used = nodeUsage(cluster, node, pod)
    let fits = true
    if (used.cpu + requests.cpu > node.cpu) {
      add(reasons, 'Insufficient cpu')
      fits = false
    }
    if (used.memory + requests.memory > node.memory) {
      add(reasons, 'Insufficient memory')
      fits = false
    }
    if (!fits) {
      add(preemption, 'No preemption victims found for incoming pod')
      continue
    }
    // Default topology spreading: prefer nodes with fewer Pods of the same owner.
    const siblings = cluster.pods.filter(
      (other) =>
        other !== pod &&
        other.nodeName === node.name &&
        other.owner !== null &&
        other.owner === pod.owner,
    ).length
    feasible.push({
      node,
      free:
        node.cpu -
        used.cpu -
        requests.cpu +
        (node.memory - used.memory - requests.memory) / 4 -
        siblings * 10_000,
    })
  }
  if (feasible.length === 0) {
    const list = (map: Map<string, number>) =>
      [...map.entries()]
        .map(([reason, count]) => `${count} ${reason}`)
        .sort()
        .join(', ')
    pod.unschedulable = `0/${total} nodes are available: ${list(reasons)}. preemption: 0/${total} nodes are available: ${list(preemption)}.`
    return
  }
  feasible.sort((a, b) => b.free - a.free || a.node.name.localeCompare(b.node.name))
  const node = feasible[0].node
  const index = cluster.nodes.indexOf(node)
  pod.nodeName = node.name
  pod.scheduledAt = cluster.now
  pod.unschedulable = undefined
  pod.ip = `10.244.${index}.${(nextSeq(cluster) % 240) + 10}`
}

/* ---------- the controllers ---------- */

export const templateHash = (template: PodTemplate) => nameSuffix(stableJson(template), 10)

export function deploymentReplicaSets(cluster: Cluster, deployment: Deployment) {
  return cluster.replicaSets.filter(
    (rs) =>
      rs.namespace === deployment.metadata.namespace && rs.deployment === deployment.metadata.name,
  )
}

export const rsSelector = (rs: ReplicaSetRecord) => rs.template.metadata?.labels ?? {}

export const podsOf = (cluster: Cluster, rs: ReplicaSetRecord) =>
  cluster.pods.filter((pod) => pod.namespace === rs.namespace && pod.owner === rs.name)

function event(
  cluster: Cluster,
  namespace: string,
  object: string,
  type: EventRecord['type'],
  reason: string,
  message: string,
  source: string,
) {
  const existing = cluster.events.find(
    (entry) =>
      entry.object === object && entry.namespace === namespace && entry.message === message,
  )
  if (existing) {
    existing.count += 1
    existing.lastAt = cluster.now
    return
  }
  cluster.events.push({
    type,
    reason,
    object,
    namespace,
    message,
    source,
    firstAt: cluster.now,
    lastAt: cluster.now,
    count: 1,
  })
}

export function newPod(
  cluster: Cluster,
  namespace: string,
  name: string,
  spec: PodSpec,
  labels: Labels,
  owner: string | null,
): PodRecord {
  const serviceAccount = findObject(
    cluster,
    'ServiceAccount',
    spec.serviceAccountName ?? 'default',
    namespace,
  )
  const pod: PodRecord = {
    name,
    namespace,
    uid: uidFor(`pod/${namespace}/${name}/${nextSeq(cluster)}`),
    labels: { ...labels },
    owner,
    spec: clone(spec),
    createdAt: cluster.now,
    nodeName: null,
    ip: null,
    saPullSecrets: (serviceAccount?.imagePullSecrets ?? []).map((entry) => entry.name),
  }
  cluster.pods.push(pod)
  return pod
}

function scaleReplicaSet(
  cluster: Cluster,
  rs: ReplicaSetRecord,
  deployment: Deployment,
  replicas: number,
) {
  if (rs.replicas === replicas) return
  const direction = replicas > rs.replicas ? 'up' : 'down'
  event(
    cluster,
    rs.namespace,
    `deployment/${deployment.metadata.name}`,
    'Normal',
    'ScalingReplicaSet',
    `Scaled ${direction} replica set ${rs.name} from ${rs.replicas} to ${replicas}`,
    'deployment-controller',
  )
  rs.replicas = replicas
}

function syncReplicaSet(cluster: Cluster, rs: ReplicaSetRecord) {
  const selector = rsSelector(rs)
  // Pods whose labels no longer match are released (orphaned) - the RS replaces them.
  for (const pod of cluster.pods)
    if (
      pod.owner === rs.name &&
      pod.namespace === rs.namespace &&
      !matchesSelector(selector, pod.labels)
    )
      pod.owner = null
  // ...and an ownerless Pod that matches is adopted.
  for (const pod of cluster.pods)
    if (
      pod.owner === null &&
      pod.namespace === rs.namespace &&
      pod.annotations?.['lab/bare'] !== 'true' &&
      matchesSelector(selector, pod.labels)
    )
      pod.owner = rs.name
  let owned = podsOf(cluster, rs)
  while (owned.length < rs.replicas) {
    const name = `${rs.name}-${nameSuffix(`${rs.name}/${nextSeq(cluster)}`, 5)}`
    newPod(cluster, rs.namespace, name, rs.template.spec, selector, rs.name)
    event(
      cluster,
      rs.namespace,
      `replicaset/${rs.name}`,
      'Normal',
      'SuccessfulCreate',
      `Created pod: ${name}`,
      'replicaset-controller',
    )
    owned = podsOf(cluster, rs)
  }
  if (owned.length > rs.replicas) {
    const ranked = owned
      .map((pod) => ({ pod, view: podView(cluster, pod) }))
      .sort(
        (a, b) =>
          Number(a.view.scheduled) - Number(b.view.scheduled) ||
          Number(a.view.ready) - Number(b.view.ready) ||
          b.pod.createdAt - a.pod.createdAt,
      )
    for (const { pod } of ranked.slice(0, owned.length - rs.replicas)) {
      cluster.pods = cluster.pods.filter((entry) => entry !== pod)
      event(
        cluster,
        rs.namespace,
        `replicaset/${rs.name}`,
        'Normal',
        'SuccessfulDelete',
        `Deleted pod: ${pod.name}`,
        'replicaset-controller',
      )
    }
  }
}

function reconcileDeployment(cluster: Cluster, deployment: Deployment) {
  const namespace = deployment.metadata.namespace ?? 'default'
  const name = deployment.metadata.name
  const template = deployment.spec.template
  const hash = templateHash(template)
  const owned = deploymentReplicaSets(cluster, deployment)
  const maxRevision = owned.reduce((max, rs) => Math.max(max, rs.revision), 0)
  let current = owned.find((rs) => rs.hash === hash)
  const changeCause = deployment.metadata.annotations?.['kubernetes.io/change-cause']
  if (!current) {
    const rsTemplate = clone(template)
    rsTemplate.metadata = {
      ...rsTemplate.metadata,
      labels: { ...(rsTemplate.metadata?.labels ?? {}), 'pod-template-hash': hash },
    }
    current = {
      name: `${name}-${hash}`,
      namespace,
      uid: uidFor(`rs/${namespace}/${name}/${hash}`),
      deployment: name,
      hash,
      revision: maxRevision + 1,
      template: rsTemplate,
      replicas: 0,
      createdAt: cluster.now,
      changeCause,
    }
    cluster.replicaSets.push(current)
  } else if (current.revision !== maxRevision) {
    current.revision = maxRevision + 1
    current.changeCause = changeCause
  }
  if (deployment.spec.paused) {
    for (const rs of deploymentReplicaSets(cluster, deployment)) syncReplicaSet(cluster, rs)
    return
  }
  const desired = deployment.spec.replicas ?? 1
  const olds = deploymentReplicaSets(cluster, deployment).filter((rs) => rs !== current)
  const oldReady = olds
    .flatMap((rs) => podsOf(cluster, rs))
    .filter((pod) => podView(cluster, pod).ready)
  const settle = () => {
    for (const rs of deploymentReplicaSets(cluster, deployment)) syncReplicaSet(cluster, rs)
    for (const pod of cluster.pods) if (!pod.nodeName) schedule(cluster, pod)
  }
  const currentRs = current
  const allNewReady = () => {
    const pods = podsOf(cluster, currentRs)
    // Judged a little ahead: a brand-new Pod that will crash looks fine for a second.
    return (
      pods.length >= currentRs.replicas &&
      pods.every((pod) => podView(cluster, pod, cluster.now + 45).ready)
    )
  }

  if (oldReady.length === 0) {
    scaleReplicaSet(cluster, current, deployment, desired)
    for (const rs of olds) scaleReplicaSet(cluster, rs, deployment, 0)
    settle()
    return
  }
  // A rolling update: 25% max surge (rounded up), 25% max unavailable (rounded down).
  const surge = Math.max(1, Math.ceil(desired * 0.25))
  const unavailable = Math.floor(desired * 0.25)
  if (current.replicas < desired) {
    scaleReplicaSet(
      cluster,
      current,
      deployment,
      Math.min(desired, Math.max(current.replicas, surge + unavailable)),
    )
    const keep = desired - unavailable
    let left = keep
    for (const rs of [...olds].sort((a, b) => b.revision - a.revision)) {
      const next = Math.min(rs.replicas, left)
      scaleReplicaSet(cluster, rs, deployment, next)
      left -= next
    }
    settle()
  }
  if (allNewReady()) {
    scaleReplicaSet(cluster, current, deployment, desired)
    settle()
    if (allNewReady()) {
      for (const rs of olds) scaleReplicaSet(cluster, rs, deployment, 0)
      settle()
    }
  } else if (current.replicas > desired) {
    scaleReplicaSet(cluster, current, deployment, desired)
    settle()
  }
}

/** Runs the controllers and the scheduler until the cluster settles. */
export function reconcile(cluster: Cluster) {
  const live = new Set(
    listObjects(cluster, 'Deployment').map(
      (entry) => `${entry.metadata.namespace}/${entry.metadata.name}`,
    ),
  )
  // Deleting a Deployment cascades to its ReplicaSets and Pods.
  const gone = cluster.replicaSets.filter((rs) => !live.has(`${rs.namespace}/${rs.deployment}`))
  for (const rs of gone)
    cluster.pods = cluster.pods.filter(
      (pod) => !(pod.owner === rs.name && pod.namespace === rs.namespace),
    )
  cluster.replicaSets = cluster.replicaSets.filter((rs) =>
    live.has(`${rs.namespace}/${rs.deployment}`),
  )
  for (const deployment of listObjects(cluster, 'Deployment'))
    reconcileDeployment(cluster, deployment)
  for (const pod of cluster.pods) if (!pod.nodeName) schedule(cluster, pod)
  // Keep at most revisionHistoryLimit (10) old ReplicaSets.
  for (const deployment of listObjects(cluster, 'Deployment')) {
    const old = deploymentReplicaSets(cluster, deployment)
      .filter((rs) => rs.replicas === 0)
      .sort((a, b) => b.revision - a.revision)
    for (const rs of old.slice(deployment.spec.revisionHistoryLimit ?? 10))
      cluster.replicaSets = cluster.replicaSets.filter((entry) => entry !== rs)
  }
}

/** Moves the clock on and lets the controllers react. */
export function tick(cluster: Cluster, seconds: number) {
  cluster.now += seconds
  reconcile(cluster)
}

/* ---------- Deployment status ---------- */

export interface DeploymentStatus {
  replicas: number
  updated: number
  ready: number
  available: number
  unavailable: number
  current?: ReplicaSetRecord
  complete: boolean
  progressing: { status: 'True' | 'False'; reason: string; message: string }
  availableCondition: { status: 'True' | 'False'; reason: string; message: string }
}

export function deploymentStatus(cluster: Cluster, deployment: Deployment): DeploymentStatus {
  const sets = deploymentReplicaSets(cluster, deployment)
  const hash = templateHash(deployment.spec.template)
  const current = sets.find((rs) => rs.hash === hash)
  const desired = deployment.spec.replicas ?? 1
  const pods = sets.flatMap((rs) => podsOf(cluster, rs))
  const views = pods.map((pod) => podView(cluster, pod))
  const ready = views.filter((view) => view.ready).length
  const updated = current ? podsOf(cluster, current).length : 0
  const updatedReady = current
    ? podsOf(cluster, current).filter((pod) => podView(cluster, pod).ready).length
    : 0
  const complete = updated === desired && updatedReady === desired && pods.length === desired
  const minAvailable = desired - Math.floor(desired * 0.25)
  const stalled =
    !complete &&
    current !== undefined &&
    cluster.now - current.createdAt > (deployment.spec.progressDeadlineSeconds ?? 600)
  return {
    replicas: pods.length,
    updated,
    ready,
    available: ready,
    unavailable: Math.max(0, desired - ready),
    current,
    complete,
    progressing: complete
      ? {
          status: 'True',
          reason: 'NewReplicaSetAvailable',
          message: `ReplicaSet "${current?.name}" has successfully progressed.`,
        }
      : stalled
        ? {
            status: 'False',
            reason: 'ProgressDeadlineExceeded',
            message: `ReplicaSet "${current?.name}" has timed out progressing.`,
          }
        : {
            status: 'True',
            reason: 'ReplicaSetUpdated',
            message: `ReplicaSet "${current?.name}" is progressing.`,
          },
    availableCondition:
      ready >= minAvailable && desired > 0
        ? {
            status: 'True',
            reason: 'MinimumReplicasAvailable',
            message: 'Deployment has minimum availability.',
          }
        : desired === 0
          ? {
              status: 'True',
              reason: 'MinimumReplicasAvailable',
              message: 'Deployment has minimum availability.',
            }
          : {
              status: 'False',
              reason: 'MinimumReplicasUnavailable',
              message: `Deployment does not have minimum availability.`,
            },
  }
}

/* ---------- Services and endpoints ---------- */

export interface EndpointAddress {
  pod: PodRecord
  ip: string
  ready: boolean
  /** Per Service port: the resolved target port, or null when a named port is missing. */
  ports: (number | null)[]
}

export function serviceEndpoints(cluster: Cluster, service: Service): EndpointAddress[] {
  const selector = service.spec.selector
  if (!selector || Object.keys(selector).length === 0) return []
  return cluster.pods
    .filter(
      (pod) =>
        pod.namespace === service.metadata.namespace &&
        pod.ip &&
        matchesSelector(selector, pod.labels),
    )
    .map((pod) => {
      const view = podView(cluster, pod)
      const container = pod.spec.containers[0]
      const ports = (service.spec.ports ?? []).map((port) =>
        typeof port.targetPort === 'string' && !/^\d+$/.test(port.targetPort)
          ? (pod.spec.containers
              .flatMap((entry) => entry.ports ?? [])
              .find((entry) => entry.name === port.targetPort)?.containerPort ?? null)
          : resolvePort(container, port.targetPort ?? port.port),
      )
      return { pod, ip: pod.ip as string, ready: view.ready, ports }
    })
    .filter((entry) => podView(cluster, entry.pod).phase !== 'Pending' || entry.ready)
    .sort((a, b) => a.ip.localeCompare(b.ip, undefined, { numeric: true }))
}

/* ---------- HTTP through the cluster ---------- */

export type HttpResult =
  | { ok: true; status: number; reason: string; headers: [string, string][]; body: string }
  | { ok: false; exitCode: number; message: string }

const REASONS: Record<number, string> = {
  200: 'OK',
  301: 'Moved Permanently',
  404: 'Not Found',
  502: 'Bad Gateway',
  503: 'Service Temporarily Unavailable',
  504: 'Gateway Time-out',
}

const nginxPage = (status: number) =>
  `<html>\n<head><title>${status} ${REASONS[status]}</title></head>\n<body>\n<center><h1>${status} ${REASONS[status]}</h1></center>\n<hr><center>nginx</center>\n</body>\n</html>`

const controllerResponse = (status: number): HttpResult => ({
  ok: true,
  status,
  reason: REASONS[status],
  headers: [
    ['Date', 'Wed, 11 Nov 2026 09:00:00 GMT'],
    ['Content-Type', 'text/html'],
    ['Content-Length', String(nginxPage(status).length + 1)],
    ['Connection', 'keep-alive'],
  ],
  body: nginxPage(status),
})

const refused = (host: string, port: number): HttpResult => ({
  ok: false,
  exitCode: 7,
  message: `curl: (7) Failed to connect to ${host} port ${port} after 2 ms: Couldn't connect to server`,
})

/** A request straight to a Pod's IP and port. */
export function podHttp(
  cluster: Cluster,
  pod: PodRecord,
  port: number,
  path: string,
  host: string,
): HttpResult {
  const view = podView(cluster, pod)
  const container = view.containers.find(
    (entry) => entry.state === 'running' && entry.app?.port === port,
  )
  if (!container || !container.app) return refused(host, port)
  const app = container.app
  const clean = path.split('?')[0] || '/'
  const body = app.routes?.[clean]
  if (body === undefined) {
    const notFound = app.notFound ?? '{"error":"not found"}'
    return {
      ok: true,
      status: 404,
      reason: 'Not Found',
      headers: [
        ['Content-Type', notFound.startsWith('{') ? 'application/json' : 'text/plain'],
        ['Content-Length', String(notFound.length)],
      ],
      body: notFound,
    }
  }
  return {
    ok: true,
    status: 200,
    reason: 'OK',
    headers: [
      [
        'Content-Type',
        body.startsWith('{')
          ? 'application/json'
          : body.startsWith('<')
            ? 'text/html'
            : 'text/plain',
      ],
      ['Content-Length', String(body.length)],
    ],
    body,
  }
}

/** Through a Service's ClusterIP (kube-proxy picks the first ready endpoint). */
export function serviceHttp(
  cluster: Cluster,
  service: Service,
  port: number,
  path: string,
  host: string,
): HttpResult {
  const index = (service.spec.ports ?? []).findIndex((entry) => entry.port === port)
  if (index < 0)
    return {
      ok: false,
      exitCode: 28,
      message: `curl: (28) Failed to connect to ${host} port ${port} after 10002 ms: Timeout was reached`,
    }
  const ready = serviceEndpoints(cluster, service).filter((entry) => entry.ready)
  if (ready.length === 0) return refused(host, port)
  const target = ready[0]
  const targetPort = target.ports[index]
  if (targetPort === null) return refused(host, port)
  return podHttp(cluster, target.pod, targetPort, path, host)
}

export function ingressClassOf(cluster: Cluster, ingress: Ingress): IngressClass | undefined {
  const name =
    ingress.spec.ingressClassName ?? ingress.metadata.annotations?.['kubernetes.io/ingress.class']
  // A default IngressClass is applied by admission when an Ingress is created,
  // never retroactively - a classless Ingress belongs to no controller.
  return name ? findObject(cluster, 'IngressClass', name) : undefined
}

/** The Ingresses the ingress-nginx controller serves. */
export const servedIngresses = (cluster: Cluster) =>
  listObjects(cluster, 'Ingress').filter(
    (ingress) => ingressClassOf(cluster, ingress)?.spec.controller === 'k8s.io/ingress-nginx',
  )

const hostMatches = (pattern: string | undefined, host: string) => {
  if (!pattern) return true
  if (pattern.startsWith('*.')) {
    const rest = host.slice(host.indexOf('.') + 1)
    return host.includes('.') && rest === pattern.slice(2)
  }
  return pattern.toLowerCase() === host.toLowerCase()
}

function pathMatches(entry: { path?: string; pathType?: string }, path: string) {
  const want = entry.path ?? '/'
  if (entry.pathType === 'Exact') return path === want
  if (want === '/') return true
  const trimmed = want.replace(/\/$/, '')
  return path === trimmed || path.startsWith(`${trimmed}/`)
}

/** A request to the ingress controller's public IP with a Host header. */
export function ingressHttp(cluster: Cluster, host: string, path: string): HttpResult {
  const clean = path.split('?')[0] || '/'
  let best: {
    ingress: Ingress
    backend: { service?: { name: string; port?: { number?: number; name?: string } } }
    length: number
  } | null = null
  for (const ingress of servedIngresses(cluster)) {
    for (const rule of ingress.spec.rules ?? []) {
      if (!hostMatches(rule.host, host)) continue
      for (const entry of rule.http?.paths ?? []) {
        if (!pathMatches(entry, clean)) continue
        const length =
          (entry.path ?? '/').length +
          (rule.host ? 1000 : 0) +
          (entry.pathType === 'Exact' ? 500 : 0)
        if (!best || length > best.length) best = { ingress, backend: entry.backend, length }
      }
    }
  }
  if (!best) {
    const fallback = servedIngresses(cluster).find((ingress) => ingress.spec.defaultBackend)
    if (fallback?.spec.defaultBackend)
      best = { ingress: fallback, backend: fallback.spec.defaultBackend, length: 0 }
  }
  if (!best) return controllerResponse(404)
  const backend = best.backend.service
  if (!backend) return controllerResponse(503)
  const service = findObject(cluster, 'Service', backend.name, best.ingress.metadata.namespace)
  if (!service) return controllerResponse(503)
  const servicePort = (service.spec.ports ?? []).find((entry) =>
    backend.port?.name ? entry.name === backend.port.name : entry.port === backend.port?.number,
  )
  if (!servicePort) return controllerResponse(503)
  const index = (service.spec.ports ?? []).indexOf(servicePort)
  const ready = serviceEndpoints(cluster, service).filter(
    (entry) => entry.ready && entry.ports[index] !== null,
  )
  if (ready.length === 0) return controllerResponse(503)
  const answer = podHttp(cluster, ready[0].pod, ready[0].ports[index] as number, path, host)
  if (!answer.ok) return controllerResponse(502)
  return answer
}

/** Names a Pod can resolve: svc, svc.ns, svc.ns.svc, svc.ns.svc.cluster.local. */
export function resolveService(
  cluster: Cluster,
  host: string,
  fromNamespace: string,
): Service | undefined {
  const parts = host.toLowerCase().replace(/\.$/, '').split('.')
  const suffix = parts.slice(2).join('.')
  if (parts.length > 2 && !['svc', 'svc.cluster.local'].includes(suffix)) return undefined
  const namespace = parts[1] ?? fromNamespace
  return findObject(cluster, 'Service', parts[0], namespace)
}

/* ---------- convenience ---------- */

export const deploymentPods = (cluster: Cluster, deployment: Deployment) =>
  deploymentReplicaSets(cluster, deployment).flatMap((rs) => podsOf(cluster, rs))

export const ownerDeployment = (cluster: Cluster, pod: PodRecord) =>
  cluster.replicaSets.find((rs) => rs.name === pod.owner && rs.namespace === pod.namespace)
    ?.deployment
