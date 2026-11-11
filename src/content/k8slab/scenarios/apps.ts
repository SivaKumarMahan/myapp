import type { AppProfile, ImageFact, Registry } from '../../../lib/k8slab/types'
import { toBase64 } from '../../../lib/k8slab/util'

/**
 * Building blocks for scenario "world facts": what an image really does
 * when it runs. The cluster cannot see these - just as a real cluster
 * cannot see which port your code binds to.
 */

const NODE_BINS = [
  'node',
  'sh',
  'curl',
  'wget',
  'env',
  'printenv',
  'cat',
  'ls',
  'nslookup',
  'sleep',
  'echo',
  'hostname',
]
const PYTHON_BINS = [
  'python',
  'python3',
  'sh',
  'curl',
  'env',
  'printenv',
  'cat',
  'ls',
  'sleep',
  'echo',
  'hostname',
]

export interface AppOptions {
  port: number | null
  version: string
  memory?: number
  cpu?: number
  requiredEnv?: string[]
  /** Extra paths that answer 200, with their bodies. */
  routes?: Record<string, string>
  /** Extra start-up log lines (after "starting"). */
  logs?: string[]
}

/** A Node.js service: `node dist/server.js`, JSON logs, /healthz and /ready. */
export function nodeService(name: string, options: AppOptions): AppProfile {
  const port = options.port
  return {
    command: ['node', 'dist/server.js'],
    port,
    memory: options.memory ?? 118,
    cpu: options.cpu ?? 6,
    requiredEnv: options.requiredEnv,
    routes: port
      ? {
          '/': `{"service":"${name}","version":"${options.version}","status":"ok"}`,
          '/healthz': '{"status":"ok"}',
          '/ready': '{"ready":true}',
          '/version': `{"version":"${options.version}"}`,
          ...options.routes,
        }
      : undefined,
    notFound: '{"error":"not found"}',
    logs: [
      `{"level":"info","msg":"${name} ${options.version} starting","node":"v22.21.1"}`,
      ...(options.logs ?? []),
      ...(port ? [`{"level":"info","msg":"HTTP server listening","port":${port}}`] : []),
    ],
    bins: NODE_BINS,
    files: ['/app/dist/server.js'],
    runtime: 'node',
  }
}

/** A Python worker or API: `python -m <module>`. */
export function pythonService(name: string, module: string, options: AppOptions): AppProfile {
  const port = options.port
  return {
    command: ['python', '-m', module],
    port,
    memory: options.memory ?? 160,
    cpu: options.cpu ?? 8,
    requiredEnv: options.requiredEnv,
    routes: port
      ? {
          '/': `{"service":"${name}","version":"${options.version}"}`,
          '/healthz': '{"status":"ok"}',
          '/ready': '{"ready":true}',
          ...options.routes,
        }
      : undefined,
    notFound: '{"detail":"Not Found"}',
    logs: [
      `INFO:${module}:${name} ${options.version} starting (Python 3.13.9)`,
      ...(options.logs ?? []),
      ...(port
        ? [`INFO:     Uvicorn running on http://0.0.0.0:${port} (Press CTRL+C to quit)`]
        : []),
    ],
    bins: PYTHON_BINS,
    files: [`/app/${module.replace(/\./g, '/')}/__main__.py`],
    runtime: 'python',
  }
}

/** The shop's registry: the AKS kubelet identity has AcrPull on it (`az aks update --attach-acr`). */
export const SHOP_ACR: Registry = {
  host: 'acrshoplab.azurecr.io',
  anonymous: false,
  kubeletAccess: true,
}

export function image(
  repo: string,
  tags: string[],
  app: AppProfile,
  tagApps?: ImageFact['tagApps'],
): ImageFact {
  return { repo, tags, app, ...(tagApps ? { tagApps } : {}) }
}

/** The base64 `.dockerconfigjson` for a registry login, as `kubectl create secret docker-registry` makes it. */
export function dockerConfig(server: string, username: string, password: string) {
  return toBase64(
    JSON.stringify({
      auths: { [server]: { username, password, auth: toBase64(`${username}:${password}`) } },
    }),
  )
}
