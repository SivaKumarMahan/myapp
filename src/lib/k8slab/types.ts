/**
 * The Kubernetes lab's object shapes. Stored objects keep the real manifest
 * layout (apiVersion / kind / metadata / spec), so `kubectl get -o yaml`,
 * `apply -f` and `patch` all work on the same plain JSON. Everything here is
 * serialisable: a cluster can be cloned with JSON and replayed.
 */

export type Labels = Record<string, string>

export interface Meta {
  name: string
  namespace?: string
  labels?: Labels
  annotations?: Labels
  uid?: string
  creationTimestamp?: string
  generation?: number
  resourceVersion?: string
}

export interface Toleration {
  key?: string
  operator?: string
  value?: string
  effect?: string
  tolerationSeconds?: number
}

export interface Probe {
  httpGet?: { path?: string; port: number | string; scheme?: string }
  tcpSocket?: { port: number | string }
  exec?: { command: string[] }
  initialDelaySeconds?: number
  periodSeconds?: number
  timeoutSeconds?: number
  failureThreshold?: number
  successThreshold?: number
}

export interface KeyRef {
  name: string
  key: string
  optional?: boolean
}

export interface EnvVar {
  name: string
  value?: string
  valueFrom?: {
    configMapKeyRef?: KeyRef
    secretKeyRef?: KeyRef
    fieldRef?: { fieldPath: string }
  }
}

export interface EnvFrom {
  prefix?: string
  configMapRef?: { name: string; optional?: boolean }
  secretRef?: { name: string; optional?: boolean }
}

export interface ContainerPort {
  name?: string
  containerPort: number
  protocol?: string
}

export interface Resources {
  requests?: Labels
  limits?: Labels
}

export interface Container {
  name: string
  image: string
  imagePullPolicy?: string
  command?: string[]
  args?: string[]
  ports?: ContainerPort[]
  env?: EnvVar[]
  envFrom?: EnvFrom[]
  resources?: Resources
  livenessProbe?: Probe
  readinessProbe?: Probe
  startupProbe?: Probe
  volumeMounts?: { name: string; mountPath: string; readOnly?: boolean }[]
}

export interface Volume {
  name: string
  persistentVolumeClaim?: { claimName: string }
  configMap?: { name: string; optional?: boolean }
  secret?: { secretName: string; optional?: boolean }
  emptyDir?: Record<string, unknown>
}

export interface PodSpec {
  containers: Container[]
  nodeSelector?: Labels
  tolerations?: Toleration[]
  volumes?: Volume[]
  imagePullSecrets?: { name: string }[]
  serviceAccountName?: string
  restartPolicy?: string
  terminationGracePeriodSeconds?: number
}

export interface PodTemplate {
  metadata?: { labels?: Labels; annotations?: Labels }
  spec: PodSpec
}

export interface Deployment {
  apiVersion: string
  kind: 'Deployment'
  metadata: Meta
  spec: {
    replicas?: number
    selector: { matchLabels?: Labels }
    template: PodTemplate
    strategy?: Record<string, unknown>
    revisionHistoryLimit?: number
    progressDeadlineSeconds?: number
    paused?: boolean
  }
}

export interface ServicePort {
  name?: string
  port: number
  targetPort?: number | string
  protocol?: string
  nodePort?: number
}

export interface Service {
  apiVersion: string
  kind: 'Service'
  metadata: Meta
  spec: {
    type?: string
    selector?: Labels
    ports?: ServicePort[]
    clusterIP?: string
  }
}

export interface IngressBackend {
  service?: { name: string; port?: { number?: number; name?: string } }
}

export interface IngressPath {
  path?: string
  pathType?: string
  backend: IngressBackend
}

export interface Ingress {
  apiVersion: string
  kind: 'Ingress'
  metadata: Meta
  spec: {
    ingressClassName?: string
    defaultBackend?: IngressBackend
    rules?: { host?: string; http?: { paths: IngressPath[] } }[]
    tls?: { hosts?: string[]; secretName?: string }[]
  }
}

export interface ConfigMap {
  apiVersion: string
  kind: 'ConfigMap'
  metadata: Meta
  data?: Labels
}

export interface Secret {
  apiVersion: string
  kind: 'Secret'
  metadata: Meta
  type?: string
  data?: Labels
}

export interface PersistentVolumeClaim {
  apiVersion: string
  kind: 'PersistentVolumeClaim'
  metadata: Meta
  spec: {
    accessModes?: string[]
    storageClassName?: string
    resources?: { requests?: Labels }
    volumeName?: string
    volumeMode?: string
  }
}

export interface StorageClass {
  apiVersion: string
  kind: 'StorageClass'
  metadata: Meta
  provisioner: string
  reclaimPolicy?: string
  volumeBindingMode?: string
  allowVolumeExpansion?: boolean
  parameters?: Labels
}

export interface IngressClass {
  apiVersion: string
  kind: 'IngressClass'
  metadata: Meta
  spec: { controller: string }
}

export interface ServiceAccount {
  apiVersion: string
  kind: 'ServiceAccount'
  metadata: Meta
  imagePullSecrets?: { name: string }[]
}

export interface NamespaceObject {
  apiVersion: string
  kind: 'Namespace'
  metadata: Meta
}

/** Everything the learner can create, change or delete. */
export type Resource =
  | Deployment
  | Service
  | Ingress
  | ConfigMap
  | Secret
  | PersistentVolumeClaim
  | StorageClass
  | IngressClass
  | ServiceAccount
  | NamespaceObject

export type ResourceKind = Resource['kind']

export interface Taint {
  key: string
  value?: string
  effect: string
}

export interface NodeRecord {
  name: string
  labels: Labels
  taints: Taint[]
  /** Allocatable CPU in millicores. */
  cpu: number
  /** Allocatable memory in MiB. */
  memory: number
  ip: string
  createdAt: number
  unschedulable?: boolean
}

export interface ReplicaSetRecord {
  name: string
  namespace: string
  uid: string
  deployment: string
  hash: string
  revision: number
  template: PodTemplate
  replicas: number
  createdAt: number
  changeCause?: string
}

export interface PodRecord {
  name: string
  namespace: string
  uid: string
  labels: Labels
  /** The ReplicaSet that owns it; null once orphaned or for a bare Pod. */
  owner: string | null
  spec: PodSpec
  annotations?: Labels
  createdAt: number
  nodeName: string | null
  ip: string | null
  /** When the scheduler placed it. */
  scheduledAt?: number
  /** The scheduler's last "0/3 nodes are available" message. */
  unschedulable?: string
  /** Image pull secrets inherited from the ServiceAccount when the Pod was created. */
  saPullSecrets: string[]
}

export interface EventRecord {
  type: 'Normal' | 'Warning'
  reason: string
  /** e.g. deployment/web */
  object: string
  namespace: string
  message: string
  source: string
  firstAt: number
  lastAt: number
  count: number
}

/* ---------- world facts: what the cluster cannot see but the apps do ---------- */

export interface AppProfile {
  /** The image's ENTRYPOINT + CMD, used when the Pod sets no command/args. */
  command: string[]
  /** TCP port the process actually listens on (null: a worker that listens nowhere). */
  port: number | null
  /** Real memory use (MiB) and CPU (millicores) once warmed up. */
  memory: number
  cpu: number
  /** Environment variables it refuses to start without. */
  requiredEnv?: string[]
  /** HTTP paths that answer 200, and their bodies. Anything else is a 404. */
  routes?: Record<string, string>
  /** What it prints on a normal start. */
  logs: string[]
  /** Executables in the image (for `exec` and command overrides). */
  bins?: string[]
  /** Files the runtime can load (`/app/dist/server.js`). */
  files?: string[]
  runtime?: 'node' | 'python' | 'go' | 'nginx' | 'shell'
  /** The process ends by itself with this exit code (busybox with no command). */
  exits?: number
  /** Body of a 404 from the app itself. */
  notFound?: string
}

export interface ImageFact {
  /** Full repository: `acrshoplab.azurecr.io/shop/storefront` or `docker.io/library/nginx`. */
  repo: string
  tags: string[]
  app: AppProfile
  /** Per-tag differences (a broken release). */
  tagApps?: Record<string, Partial<AppProfile>>
}

export interface Registry {
  host: string
  /** Anyone can pull (Docker Hub, MCR). */
  anonymous: boolean
  /** The cluster's kubelet identity can pull (AKS `--attach-acr`). */
  kubeletAccess: boolean
  username?: string
  password?: string
}

export interface Cluster {
  /** Seconds since the lab's clock origin; every command moves it on. */
  now: number
  /** The kubeconfig context's namespace. */
  namespace: string
  nodes: NodeRecord[]
  objects: Resource[]
  replicaSets: ReplicaSetRecord[]
  pods: PodRecord[]
  events: EventRecord[]
  images: ImageFact[]
  registries: Registry[]
  /** A counter for names, IPs and uids. */
  seq: number
  /** The ingress controller's public IP. */
  lbIp: string
  /** Every delete, as `Kind/namespace/name` - for the anti-cheat checks. */
  deleted: string[]
}
