/**
 * The Linux & Bash lab's seeded world: a filesystem with realistic logs,
 * data and configs, plus the state the mock tools read (hosts, services,
 * processes, disks, containers, cloud resources).
 *
 * There are two variants of the same world. `main` is what you explore;
 * `hidden` has the same layout but different names, dates, numbers and broken
 * hosts, and is used only when checking answers - so an answer that
 * hard-codes what it saw in `main` fails.
 *
 * Everything is generated from the variant and a "now" timestamp, so a
 * world can be rebuilt identically at any time.
 */

import { dayStart, localClock, localDay, offsetText } from './time'

export type Variant = 'main' | 'hidden'

export const DAY = 86_400_000
const MB = 1024 ** 2
const GB = 1024 ** 3

export interface SeedFile {
  path: string
  /** Text content. Omitted for sparse files, which are a single byte on disk. */
  content?: string
  /** Declared size for sparse files (what ls, find -size and du report). */
  size?: number
  mtime: number
  mode?: number
}

export interface Host {
  name: string
  ip: string
  /** Answers ping. */
  up: boolean
  /** What happens on port 22. */
  ssh: 'ok' | 'timeout' | 'refused' | 'auth'
  /** Root filesystem use %. */
  disk: number
  /** Memory use %. */
  mem: number
  nginx: 'active' | 'inactive'
  /** Files on the remote host (for ssh / scp). */
  files?: { path: string; content: string; mtime: number }[]
}

export interface Domain {
  name: string
  ip: string | null
  /** Days until the TLS certificate expires (negative: expired), or null for no TLS. */
  certDays: number | null
  /** HTTP status the health URL returns; 0 means the connection times out. */
  status: number
}

export interface Service {
  state: 'active' | 'inactive' | 'failed'
  /** Whether `systemctl restart` brings it back. */
  restartWorks: boolean
}

export interface Proc {
  pid: number
  user: string
  cpu: number
  mem: number
  rssKb: number
  command: string
  /** TCP port it listens on. */
  port?: number
  /** Files it holds open (for lsof). */
  openFiles?: string[]
  /** Service it belongs to (stopping the service removes it). */
  service?: string
}

export interface Mount {
  fs: string
  sizeKb: number
  usedKb: number
  mount: string
}

export interface DockerImage {
  repository: string
  tag: string
  id: string
  ageDays: number
  sizeMb: number
  /** Used by a running container (cannot be removed). */
  inUse?: boolean
}

export interface Deployment {
  name: string
  namespace: string
  /** Whether the rollout completes. */
  healthy: boolean
  replicas: number
}

export interface AzResource {
  name: string
  type: string
  resourceGroup: string
  location: string
  tags: Record<string, string>
}

export interface OutboxMessage {
  channel: 'mail' | 'slack' | 'webhook'
  to: string
  subject: string
  body: string
  at: number
}

export interface World {
  variant: Variant
  now: number
  files: SeedFile[]
  hosts: Host[]
  domains: Domain[]
  services: Record<string, Service>
  processes: Proc[]
  mounts: Mount[]
  memory: {
    totalMb: number
    usedMb: number
    buffMb: number
    swapTotalMb: number
    swapUsedMb: number
  }
  load: [number, number, number]
  cpus: number
  uptimeDays: number
  images: DockerImage[]
  deployments: Deployment[]
  resources: AzResource[]
  crontab: string
  outbox: OutboxMessage[]
}

/* ---------- deterministic randomness ---------- */

function rng(seed: number) {
  let state = seed >>> 0 || 1
  return () => {
    state ^= state << 13
    state ^= state >>> 17
    state ^= state << 5
    return ((state >>> 0) % 1_000_000) / 1_000_000
  }
}

const pad = (n: number, width = 2) => String(n).padStart(width, '0')
const isoDay = localDay
const clock = localClock

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const nginxTime = (t: number) => {
  const d = new Date(t)
  return `${pad(d.getDate())}/${MONTHS[d.getMonth()]}/${d.getFullYear()}:${clock(t)} ${offsetText(t)}`
}

/* ---------- the two variants ---------- */

interface Params {
  seed: number
  logDays: number
  /** ERROR weight per service log (picks the "noisiest log"). */
  serviceErrors: Record<string, number>
  topIps: [string, number][]
  hosts: Host[]
  domains: Domain[]
  memUsedMb: number
  load: [number, number, number]
  cpus: number
  mounts: [string, number, string][]
  nginx: 'active' | 'inactive'
  payments: Service
  port443: boolean
  deployUser: boolean
  backupDir: 'ok' | 'missing'
  configValid: boolean
  bigFiles: [string, number, number][]
  varDirs: [string, number][]
  notesFile: boolean
  javaPort: number
  hiddenSuffix: string
}

const MAIN: Params = {
  seed: 20261004,
  logDays: 10,
  serviceErrors: { api: 9, worker: 4, billing: 14, auth: 6 },
  topIps: [
    ['203.0.113.7', 61],
    ['198.51.100.23', 47],
    ['192.0.2.150', 38],
    ['203.0.113.88', 29],
    ['198.51.100.4', 22],
  ],
  hosts: [
    { name: 'web-01', ip: '10.0.1.11', up: true, ssh: 'ok', disk: 45, mem: 61, nginx: 'active' },
    { name: 'web-02', ip: '10.0.1.12', up: true, ssh: 'ok', disk: 52, mem: 70, nginx: 'inactive' },
    { name: 'app-01', ip: '10.0.1.21', up: true, ssh: 'ok', disk: 97, mem: 84, nginx: 'active' },
    {
      name: 'app-02',
      ip: '10.0.1.22',
      up: false,
      ssh: 'timeout',
      disk: 0,
      mem: 0,
      nginx: 'inactive',
    },
    { name: 'db-01', ip: '10.0.1.31', up: true, ssh: 'auth', disk: 66, mem: 75, nginx: 'inactive' },
    {
      name: 'db-02',
      ip: '10.0.1.32',
      up: true,
      ssh: 'refused',
      disk: 58,
      mem: 70,
      nginx: 'inactive',
    },
    { name: 'cache-01', ip: '10.0.1.41', up: true, ssh: 'ok', disk: 31, mem: 93, nginx: 'active' },
    {
      name: 'mon-01',
      ip: '10.0.1.51',
      up: false,
      ssh: 'timeout',
      disk: 0,
      mem: 0,
      nginx: 'inactive',
    },
    { name: 'bkp-01', ip: '10.0.1.71', up: true, ssh: 'ok', disk: 71, mem: 40, nginx: 'inactive' },
    { name: 'lb-01', ip: '10.0.1.5', up: true, ssh: 'ok', disk: 22, mem: 35, nginx: 'active' },
  ],
  domains: [
    { name: 'shop.example.com', ip: '93.184.216.10', certDays: 120, status: 200 },
    { name: 'api.example.com', ip: '93.184.216.11', certDays: 12, status: 503 },
    { name: 'old.example.com', ip: '93.184.216.12', certDays: -3, status: 200 },
    { name: 'cdn.example.com', ip: '93.184.216.13', certDays: 45, status: 200 },
    { name: 'status.example.com', ip: '93.184.216.14', certDays: 80, status: 404 },
    { name: 'ghost.example.internal', ip: null, certDays: null, status: 0 },
  ],
  memUsedMb: 7380,
  load: [3.42, 2.81, 1.95],
  cpus: 2,
  mounts: [
    ['/dev/sda1', 91, '/'],
    ['/dev/sda2', 35, '/boot'],
    ['/dev/sdb1', 84, '/var'],
    ['/dev/sdc1', 62, '/data'],
    ['/dev/sdd1', 81, '/mnt/backup'],
  ],
  nginx: 'inactive',
  payments: { state: 'failed', restartWorks: true },
  port443: true,
  deployUser: false,
  backupDir: 'ok',
  configValid: true,
  bigFiles: [
    ['/data/backups/db-full.bak', 2.4 * GB, 6],
    ['/data/iso/ubuntu-24.04.iso', 1.1 * GB, 40],
    ['/data/media/training.mp4', 350 * MB, 12],
    ['/data/tmp/cache.bin', 120 * MB, 1],
    ['/data/exports/report.csv', 95 * MB, 2],
    ['/data/notes.txt', 0, 3],
  ],
  varDirs: [
    ['/var/lib/docker', 9.5 * GB],
    ['/var/log', 3.2 * GB],
    ['/var/cache/apt', 1.8 * GB],
    ['/var/lib/mysql', 6.1 * GB],
    ['/var/backups', 900 * MB],
    ['/var/tmp', 300 * MB],
    ['/var/www', 120 * MB],
  ],
  notesFile: false,
  javaPort: 8080,
  hiddenSuffix: '',
}

const HIDDEN: Params = {
  seed: 7713,
  logDays: 12,
  serviceErrors: { api: 16, worker: 5, billing: 3, auth: 8 },
  topIps: [
    ['192.0.2.33', 52],
    ['203.0.113.140', 44],
    ['198.51.100.77', 41],
    ['192.0.2.9', 27],
    ['203.0.113.2', 19],
  ],
  hosts: [
    { name: 'web-11', ip: '10.20.4.11', up: true, ssh: 'ok', disk: 88, mem: 52, nginx: 'inactive' },
    {
      name: 'web-12',
      ip: '10.20.4.12',
      up: false,
      ssh: 'timeout',
      disk: 0,
      mem: 0,
      nginx: 'inactive',
    },
    {
      name: 'app-11',
      ip: '10.20.4.21',
      up: true,
      ssh: 'auth',
      disk: 40,
      mem: 60,
      nginx: 'inactive',
    },
    { name: 'app-12', ip: '10.20.4.22', up: true, ssh: 'ok', disk: 33, mem: 95, nginx: 'active' },
    {
      name: 'db-11',
      ip: '10.20.4.31',
      up: true,
      ssh: 'refused',
      disk: 70,
      mem: 72,
      nginx: 'inactive',
    },
    { name: 'db-12', ip: '10.20.4.32', up: true, ssh: 'ok', disk: 99, mem: 81, nginx: 'inactive' },
    {
      name: 'cache-11',
      ip: '10.20.4.41',
      up: false,
      ssh: 'timeout',
      disk: 0,
      mem: 0,
      nginx: 'inactive',
    },
    { name: 'bkp-11', ip: '10.20.4.71', up: true, ssh: 'ok', disk: 64, mem: 38, nginx: 'inactive' },
    { name: 'lb-11', ip: '10.20.4.5', up: true, ssh: 'ok', disk: 18, mem: 30, nginx: 'active' },
  ],
  domains: [
    { name: 'shop.example.org', ip: '192.0.2.200', certDays: 25, status: 200 },
    { name: 'api.example.org', ip: '192.0.2.201', certDays: 200, status: 200 },
    { name: 'pay.example.org', ip: '192.0.2.202', certDays: -40, status: 502 },
    { name: 'img.example.org', ip: null, certDays: null, status: 0 },
    { name: 'docs.example.org', ip: '192.0.2.204', certDays: 5, status: 200 },
  ],
  memUsedMb: 4980,
  load: [0.82, 0.95, 1.1],
  cpus: 4,
  mounts: [
    ['/dev/vda1', 72, '/'],
    ['/dev/vda15', 12, '/boot/efi'],
    ['/dev/vdb1', 95, '/data'],
    ['/dev/vdc1', 40, '/var'],
  ],
  nginx: 'active',
  payments: { state: 'failed', restartWorks: false },
  port443: false,
  deployUser: true,
  backupDir: 'missing',
  configValid: false,
  bigFiles: [
    ['/data/backups/mysql-weekly.bak', 3.7 * GB, 9],
    ['/data/iso/debian-12.iso', 650 * MB, 70],
    ['/data/media/recording.mkv', 101 * MB, 4],
    ['/data/exports/ledger.csv', 99 * MB, 1],
    ['/data/tmp/heap.dump', 1.3 * GB, 2],
    ['/data/readme.md', 0, 8],
  ],
  varDirs: [
    ['/var/lib/docker', 4.4 * GB],
    ['/var/log', 7.9 * GB],
    ['/var/cache/apt', 600 * MB],
    ['/var/lib/postgresql', 8.8 * GB],
    ['/var/backups', 2.2 * GB],
    ['/var/tmp', 50 * MB],
    ['/var/spool', 1.1 * GB],
  ],
  notesFile: true,
  javaPort: 8080,
  hiddenSuffix: '-v2',
}

/* ---------- generators ---------- */

const MESSAGES = {
  INFO: [
    'request completed',
    'user login ok',
    'cache refreshed',
    'job scheduled',
    'health check passed',
    'config reloaded',
  ],
  WARN: [
    'slow response 1840ms',
    'retrying connection to db',
    'disk usage above 75%',
    'deprecated API called',
  ],
  ERROR: [
    'database connection refused',
    'payment gateway timeout',
    'NullPointerException in OrderService',
    'failed to write to /var/log/app',
  ],
}

function appLogLines(
  random: () => number,
  start: number,
  length: number,
  count: number,
  errorRate: number,
) {
  const lines: string[] = []
  const times = Array.from(
    { length: count },
    () => start + Math.floor(random() * (length - 60_000)),
  )
  times.sort((a, b) => a - b)
  for (const t of times) {
    const r = random()
    const level = r < errorRate ? 'ERROR' : r < errorRate + 0.15 ? 'WARN' : 'INFO'
    const list = MESSAGES[level]
    lines.push(`${isoDay(t)} ${clock(t)} ${level} ${list[Math.floor(random() * list.length)]}`)
  }
  return { lines, last: times[times.length - 1] ?? start }
}

const PATHS = [
  '/',
  '/api/orders',
  '/api/cart',
  '/login',
  '/static/app.js',
  '/health',
  '/api/payments',
  '/search?q=shoes',
]
const AGENTS = [
  'Mozilla/5.0 (X11; Linux x86_64)',
  'curl/8.5.0',
  'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0)',
  'kube-probe/1.30',
]

function accessLog(random: () => number, now: number, params: Params) {
  const lines: { t: number; line: string }[] = []
  const pick = <T>(list: T[]) => list[Math.floor(random() * list.length)]
  const statuses = [200, 200, 200, 200, 200, 200, 304, 301, 404, 500, 502, 403]
  const add = (ip: string) => {
    const t = now - Math.floor(random() * 2 * DAY)
    const status = pick(statuses)
    const bytes = status === 304 ? 0 : 200 + Math.floor(random() * 9000)
    const method = random() < 0.8 ? 'GET' : 'POST'
    lines.push({
      t,
      line: `${ip} - - [${nginxTime(t)}] "${method} ${pick(PATHS)} HTTP/1.1" ${status} ${bytes} "-" "${pick(AGENTS)}"`,
    })
  }
  for (const [ip, count] of params.topIps) for (let i = 0; i < count; i += 1) add(ip)
  // A long tail of other clients, each seen only a few times.
  for (let i = 0; i < 160; i += 1)
    add(
      `10.${Math.floor(random() * 4)}.${Math.floor(random() * 250)}.${2 + Math.floor(random() * 250)}`,
    )
  lines.sort((a, b) => a.t - b.t)
  return lines.map((entry) => entry.line).join('\n') + '\n'
}

function resources(variant: Variant): AzResource[] {
  const rows: [string, string, string, string, Record<string, string>][] =
    variant === 'main'
      ? [
          [
            'vm-web-01',
            'Microsoft.Compute/virtualMachines',
            'rg-web-prod',
            'westeurope',
            { env: 'prod', owner: 'web-team', costcenter: 'CC100' },
          ],
          [
            'vm-web-02',
            'Microsoft.Compute/virtualMachines',
            'rg-web-prod',
            'westeurope',
            { env: 'prod', owner: 'web-team' },
          ],
          [
            'stwebprod01',
            'Microsoft.Storage/storageAccounts',
            'rg-web-prod',
            'westeurope',
            { env: 'prod' },
          ],
          [
            'kv-web-prod',
            'Microsoft.KeyVault/vaults',
            'rg-web-prod',
            'westeurope',
            { env: 'prod', owner: 'security', costcenter: 'CC100' },
          ],
          [
            'vm-api-01',
            'Microsoft.Compute/virtualMachines',
            'rg-api-prod',
            'northeurope',
            { env: 'prod', costcenter: 'CC200' },
          ],
          [
            'sql-api-prod',
            'Microsoft.Sql/servers',
            'rg-api-prod',
            'northeurope',
            { env: 'prod', owner: 'data-team', costcenter: 'CC200' },
          ],
          [
            'vnet-hub',
            'Microsoft.Network/virtualNetworks',
            'rg-network',
            'westeurope',
            { owner: 'platform' },
          ],
          ['nsg-web', 'Microsoft.Network/networkSecurityGroups', 'rg-network', 'westeurope', {}],
          [
            'vm-test-01',
            'Microsoft.Compute/virtualMachines',
            'rg-dev',
            'eastus',
            { env: 'dev', owner: 'alice' },
          ],
          ['stdevscratch', 'Microsoft.Storage/storageAccounts', 'rg-dev', 'eastus', { env: 'dev' }],
          [
            'aks-platform',
            'Microsoft.ContainerService/managedClusters',
            'rg-platform',
            'westeurope',
            { env: 'prod', owner: 'platform', costcenter: 'CC300' },
          ],
          [
            'acrplatform',
            'Microsoft.ContainerRegistry/registries',
            'rg-platform',
            'westeurope',
            { env: 'prod', owner: 'platform' },
          ],
          [
            'law-central',
            'Microsoft.OperationalInsights/workspaces',
            'rg-platform',
            'westeurope',
            { env: 'prod', Owner: 'ops' },
          ],
          [
            'pip-lb-01',
            'Microsoft.Network/publicIPAddresses',
            'rg-network',
            'westeurope',
            { env: 'prod', owner: 'platform', costcenter: 'CC300' },
          ],
          [
            'func-reports',
            'Microsoft.Web/sites',
            'rg-api-prod',
            'northeurope',
            { env: 'prod', owner: 'data-team' },
          ],
        ]
      : [
          [
            'vm-shop-11',
            'Microsoft.Compute/virtualMachines',
            'rg-shop',
            'uksouth',
            { env: 'prod', owner: 'shop', costcenter: 'CC9' },
          ],
          [
            'vm-shop-12',
            'Microsoft.Compute/virtualMachines',
            'rg-shop',
            'uksouth',
            { env: 'prod' },
          ],
          [
            'stshopdata',
            'Microsoft.Storage/storageAccounts',
            'rg-shop',
            'uksouth',
            { owner: 'shop', costcenter: 'CC9' },
          ],
          [
            'kv-shop',
            'Microsoft.KeyVault/vaults',
            'rg-shop',
            'uksouth',
            { env: 'prod', owner: 'security' },
          ],
          [
            'cosmos-orders',
            'Microsoft.DocumentDB/databaseAccounts',
            'rg-orders',
            'ukwest',
            { env: 'prod', owner: 'orders', costcenter: 'CC11' },
          ],
          [
            'vnet-shop',
            'Microsoft.Network/virtualNetworks',
            'rg-network',
            'uksouth',
            { env: 'prod', owner: 'net', costcenter: 'CC1' },
          ],
          ['vm-build-01', 'Microsoft.Compute/virtualMachines', 'rg-ci', 'uksouth', { env: 'dev' }],
          ['stbuildcache', 'Microsoft.Storage/storageAccounts', 'rg-ci', 'uksouth', {}],
          [
            'aks-shop',
            'Microsoft.ContainerService/managedClusters',
            'rg-shop',
            'uksouth',
            { env: 'prod', owner: 'platform', costcenter: 'CC1' },
          ],
          [
            'func-mailer',
            'Microsoft.Web/sites',
            'rg-orders',
            'ukwest',
            { env: 'test', owner: 'orders' },
          ],
          [
            'apim-gateway',
            'Microsoft.ApiManagement/service',
            'rg-shop',
            'uksouth',
            { env: 'prod', costcenter: 'CC9' },
          ],
          [
            'law-shop',
            'Microsoft.OperationalInsights/workspaces',
            'rg-shop',
            'uksouth',
            { env: 'prod', owner: 'ops', costcenter: 'CC1' },
          ],
        ]
  return rows.map(([name, type, resourceGroup, location, tags]) => ({
    name,
    type,
    resourceGroup,
    location,
    tags,
  }))
}

const HOURS = 3_600_000

/** Builds the world. Same variant + now always gives the same world. */
export function buildWorld(variant: Variant, now = Date.now()): World {
  const p = variant === 'main' ? MAIN : HIDDEN
  const random = rng(p.seed)
  const files: SeedFile[] = []
  const file = (path: string, content: string, mtime = now - 2 * DAY, mode?: number) =>
    files.push({ path, content, mtime, ...(mode !== undefined ? { mode } : {}) })
  const sparse = (path: string, size: number, mtime: number) => files.push({ path, size, mtime })

  /* --- users --- */
  const passwd = [
    'root:x:0:0:root:/root:/bin/bash',
    'daemon:x:1:1:daemon:/usr/sbin:/usr/sbin/nologin',
    'www-data:x:33:33:www-data:/var/www:/usr/sbin/nologin',
    'syslog:x:104:110::/home/syslog:/usr/sbin/nologin',
    variant === 'main'
      ? 'alice:x:1000:1000:Alice Admin:/home/alice:/bin/bash'
      : 'carol:x:1000:1000:Carol Ops:/home/carol:/bin/bash',
    variant === 'main'
      ? 'bob:x:1001:1001:Bob Dev:/home/bob:/bin/sh'
      : 'dave:x:1001:1001:Dave Dev:/home/dave:/bin/bash',
    'postgres:x:113:120:PostgreSQL administrator:/var/lib/postgresql:/bin/bash',
    'nobody:x:65534:65534:nobody:/nonexistent:/usr/sbin/nologin',
    ...(p.deployUser ? ['deploy:x:1002:1002:Deploy bot:/home/deploy:/bin/bash'] : []),
  ]
  file('/etc/passwd', passwd.join('\n') + '\n', now - 30 * DAY)
  file('/etc/hostname', 'lab-01\n', now - 90 * DAY)

  /* --- app logs: one file per day, mtime = end of that day's writes --- */
  for (let d = 0; d < p.logDays; d += 1) {
    const start = dayStart(now, d)
    const end = d === 0 ? now : dayStart(now, d - 1)
    const { lines, last } = appLogLines(
      random,
      start,
      Math.max(end - start, 120_000),
      24 + Math.floor(random() * 20),
      0.12,
    )
    file(`/var/log/app/app-${isoDay(start)}.log`, lines.join('\n') + '\n', d === 0 ? now : last)
  }
  // The live log: the last 3 days, ~300 lines.
  {
    const all: string[] = []
    for (let d = 2; d >= 0; d -= 1) {
      const start = dayStart(now, d)
      const end = (d === 0 ? now : dayStart(now, d - 1)) - start
      const count = 90 + Math.floor(random() * 30)
      const times = Array.from(
        { length: count },
        () => start + Math.floor(random() * Math.max(end - 60_000, 60_000)),
      )
      times.sort((a, b) => a - b)
      for (const t of times) {
        const r = random()
        const level = r < 0.11 ? 'ERROR' : r < 0.27 ? 'WARN' : 'INFO'
        const list = MESSAGES[level as keyof typeof MESSAGES]
        all.push(`${isoDay(t)} ${clock(t)} ${level} ${list[Math.floor(random() * list.length)]}`)
      }
    }
    // A guaranteed handful of lines around yesterday 10:00-10:30, including both edges.
    const y = dayStart(now, 1)
    const window =
      variant === 'main'
        ? [
            ['09:59:58', 'INFO', 'cache refreshed'],
            ['10:00:00', 'WARN', 'slow response 2210ms'],
            ['10:14:07', 'ERROR', 'payment gateway timeout'],
            ['10:30:00', 'INFO', 'job scheduled'],
            ['10:30:01', 'INFO', 'request completed'],
          ]
        : [
            ['10:05:11', 'ERROR', 'database connection refused'],
            ['10:21:40', 'INFO', 'user login ok'],
            ['10:29:59', 'WARN', 'retrying connection to db'],
            ['10:31:00', 'INFO', 'health check passed'],
          ]
    for (const [time, level, message] of window)
      all.push(`${isoDay(y)} ${time} ${level} ${message}`)
    all.sort()
    file('/var/log/app/app.log', all.join('\n') + '\n', now)
  }
  file(
    '/var/log/app/healthcheck.log',
    Array.from(
      { length: 12 },
      (_, i) => `${isoDay(now)} ${pad(i, 2)}:00:00 INFO health check passed`,
    ).join('\n') + '\n',
    now - HOURS,
  )
  sparse('/var/log/app/debug.log', (variant === 'main' ? 5.2 : 3.4) * GB, now - 5 * 60_000)

  /* --- per-service logs (which one is noisiest?) --- */
  for (const [service, errors] of Object.entries(p.serviceErrors)) {
    const lines: string[] = []
    for (let i = 0; i < 40; i += 1) {
      const t = now - DAY + i * 30 * 60_000
      const level = i < errors ? 'ERROR' : i % 5 === 0 ? 'WARN' : 'INFO'
      const list = MESSAGES[level as keyof typeof MESSAGES]
      lines.push(`${isoDay(t)} ${clock(t)} ${level} [${service}] ${list[i % list.length]}`)
    }
    // Shuffle so ERROR lines are spread out.
    lines.sort(() => random() - 0.5)
    file(`/var/log/services/${service}.log`, lines.join('\n') + '\n', now - HOURS)
  }

  /* --- nginx access log --- */
  file('/var/log/nginx/access.log', accessLog(random, now, p), now - 60_000)

  /* --- big files and directories with realistic sizes --- */
  for (const [path, size, days] of p.bigFiles) {
    if (size === 0) file(path, 'remember to rotate the logs\n', now - days * DAY)
    else sparse(path, size, now - days * DAY)
  }
  for (const [dir, size] of p.varDirs) {
    if (dir === '/var/log') continue
    sparse(`${dir}/data.img`, size * 0.7, now - 3 * DAY)
    sparse(`${dir}/extra.bin`, size * 0.3, now - 9 * DAY)
  }
  sparse('/var/log/old/app.log.1', variant === 'main' ? 1.2 * GB : 700 * MB, now - 8 * DAY)
  sparse('/var/log/old/app.log.2', variant === 'main' ? 900 * MB : 1.6 * GB, now - 15 * DAY)
  sparse('/tmp/huge-dump.hprof', (variant === 'main' ? 3.1 : 2.2) * GB, now - 2 * DAY)
  if (variant === 'hidden') sparse('/tmp/core.4411', 1.5 * GB, now - 6 * HOURS)
  sparse(
    '/home/dev/downloads/vm-image.qcow2',
    (variant === 'main' ? 4.4 : 0.8) * GB,
    now - 30 * DAY,
  )

  /* --- recently modified files (find -mmin) --- */
  file(`/etc/app/feature-flags${p.hiddenSuffix}.json`, '{"newCheckout": true}\n', now - 3 * 60_000)
  file(`/tmp/upload-${variant === 'main' ? '4471' : '9032'}.part`, 'partial\n', now - 60_000)
  file('/tmp/session.lock', 'pid=4321\n', now - 25 * 60_000)

  /* --- configs --- */
  file(
    '/etc/app/app.conf',
    `# application settings\nname=shop\nport=8080\nmetrics_port=${variant === 'main' ? 9100 : 8080}\nlog_level=info\n`,
    now - 5 * DAY,
  )
  file(
    '/etc/app/db.conf',
    `host=db-01\nport=5432\nuser=app\npool=${variant === 'main' ? 20 : 35}\n`,
    now - 5 * DAY,
  )
  file(
    '/etc/app/nginx/site.conf',
    'server {\n  listen 443 ssl;\n  server_name shop.example.com;\n}\n',
    now - 20 * DAY,
  )
  file(
    '/root/app.env',
    variant === 'main'
      ? 'APP_ENV=production\nAPP_PORT=8080\nDB_HOST=db-01\n# comment\nLOG_LEVEL=info\n'
      : 'APP_ENV=staging\nAPP_PORT=9000\nFEATURE_X=on\nDB_HOST=db-12\n\nCACHE_TTL=300\n',
  )
  file(
    '/root/config.json',
    p.configValid
      ? '{\n  "service": "shop",\n  "replicas": 3,\n  "features": ["checkout", "search"]\n}\n'
      : '{\n  "service": "shop",\n  "replicas": 3,\n  "features": ["checkout", "search",]\n}\n',
  )

  /* --- text processing inputs --- */
  file(
    '/root/hosts.txt',
    (variant === 'main'
      ? ['web-01', 'web-02', 'app-01', 'web-01', 'db-01', 'app-01', 'cache-01', 'web-02', 'lb-01']
      : ['db-12', 'lb-11', 'db-12', 'web-11', 'app-12', 'lb-11', 'bkp-11']
    ).join('\n') + '\n',
  )
  file(
    '/root/users.csv',
    variant === 'main'
      ? 'username,email,role\nalice,alice@example.com,admin\nbob,bob@example.com,developer\ncarol,carol@example.com,admin\ndan,dan@example.com,viewer\nerin,erin@example.com,developer\n'
      : 'username,email,role\nzoe,zoe@example.org,viewer\nyusuf,yusuf@example.org,admin\nxena,xena@example.org,developer\nwill,will@example.org,admin\nvik,vik@example.org,admin\n',
  )
  file(
    '/root/billing.csv',
    variant === 'main'
      ? 'service,month,cost\ncompute,2026-09,1240.50\nstorage,2026-09,310.25\nnetwork,2026-09,88.10\nmonitoring,2026-09,61.15\n'
      : 'service,month,cost\ncompute,2026-09,980.00\nstorage,2026-09,77.75\nnetwork,2026-09,12.40\nbackup,2026-09,45.85\nsupport,2026-09,100.00\n',
  )
  file('/root/inventory.txt', p.hosts.map((host) => host.name).join('\n') + '\n')
  file(
    '/root/monitored.txt',
    p.hosts
      .filter((_, i) => i % 3 !== 1)
      .map((host) => host.name)
      .join('\n') + '\n',
  )
  file(
    '/root/servers.txt',
    ['# production servers', ...p.hosts.map((host) => host.ip), ''].join('\n') + '\n',
  )
  file(
    '/root/endpoints.txt',
    p.domains.map((domain) => `https://${domain.name}/health`).join('\n') + '\n',
  )
  file('/root/domains.txt', p.domains.map((domain) => domain.name).join('\n') + '\n')
  file('/root/resources.json', JSON.stringify(resources(variant), null, 2) + '\n')

  /* --- project tree with mixed extensions --- */
  const exts =
    variant === 'main'
      ? { js: 7, ts: 4, json: 3, md: 2, css: 1 }
      : { py: 6, yaml: 5, md: 3, sh: 2, txt: 2 }
  for (const [ext, n] of Object.entries(exts)) {
    for (let i = 0; i < n; i += 1)
      file(
        `/home/dev/project/${i % 2 ? 'src/' : ''}file${i}.${ext}`,
        `// ${ext} ${i}\n`,
        now - (i + 1) * DAY,
      )
  }

  /* --- empty files and dirs to clean --- */
  file('/tmp/work/keep.txt', 'important\n')
  file('/tmp/work/empty1.log', '')
  file(`/tmp/work/nested/empty${p.hiddenSuffix}.tmp`, '')
  file('/tmp/work/nested/data.csv', 'a,b\n')
  file('/tmp/work/old/.placeholder', 'x\n')
  files.push({ path: '/tmp/work/empty-dir/', mtime: now - DAY })
  files.push({ path: `/tmp/work/cache${p.hiddenSuffix}/`, mtime: now - DAY })

  /* --- reports to rename --- */
  for (const name of variant === 'main'
    ? ['daily', 'weekly', 'sales q3']
    : ['jan', 'feb', 'mar', 'audit log'])
    file(`/tmp/reports/${name}.txt`, `${name}\n`)
  file('/tmp/reports/summary.csv', 'x\n')

  /* --- backup sources and targets --- */
  if (p.backupDir === 'ok') files.push({ path: '/backup/', mtime: now - DAY, mode: 0o755 })
  files.push({ path: '/srv/backups/', mtime: now - DAY })
  for (let i = 1; i <= (variant === 'main' ? 6 : 8); i += 1) {
    const t = now - i * DAY
    file(`/srv/backups/etc-app-${isoDay(t).replace(/-/g, '')}-020000.tar.gz`, 'old backup\n', t)
  }
  if (p.notesFile) file('/root/notes.txt', 'existing notes\n', now - DAY)
  files.push({ path: '/restore/', mtime: now - DAY })

  /* --- remote host files (bkp host keeps backups) --- */
  const hosts = p.hosts.map((host) => ({ ...host }))
  const bkp = hosts.find((host) => host.name.startsWith('bkp'))
  if (bkp) {
    bkp.files = [1, 2, 3, 4].map((i) => {
      const t = dayStart(now, i) + 2 * HOURS
      return {
        path: `/backups/app-${isoDay(t)}.tar.gz`,
        content: `backup of ${isoDay(t)}\n`,
        mtime: t,
      }
    })
  }

  /* --- processes --- */
  const processes: Proc[] = [
    { pid: 1, user: 'root', cpu: 0.0, mem: 0.1, rssKb: 11_000, command: '/sbin/init' },
    {
      pid: 812,
      user: 'root',
      cpu: 0.1,
      mem: 0.2,
      rssKb: 9_000,
      command: '/usr/sbin/sshd -D',
      port: 22,
      service: 'sshd',
    },
    {
      pid: 910,
      user: 'root',
      cpu: 0.0,
      mem: 0.1,
      rssKb: 4_000,
      command: '/usr/sbin/cron -f',
      service: 'cron',
    },
    {
      pid: 4321,
      user: 'app',
      cpu: variant === 'main' ? 38.5 : 12.0,
      mem: variant === 'main' ? 34.2 : 18.4,
      rssKb: 2_790_000,
      command: `java -jar /opt/app/app.jar --server.port=${p.javaPort}`,
      port: p.javaPort,
      openFiles: ['/var/log/app/debug.log', '/var/log/app/app.log'],
    },
    {
      pid: 5120,
      user: 'app',
      cpu: variant === 'main' ? 87.3 : 3.1,
      mem: 2.1,
      rssKb: 170_000,
      command: 'python3 /opt/jobs/report.py',
    },
    {
      pid: 5233,
      user: 'postgres',
      cpu: 6.4,
      mem: variant === 'main' ? 12.8 : 31.5,
      rssKb: 1_040_000,
      command: 'postgres: 16/main',
      port: 5432,
    },
    {
      pid: 6001,
      user: 'node',
      cpu: variant === 'main' ? 4.2 : 66.0,
      mem: 6.3,
      rssKb: 512_000,
      command: 'node /srv/web/server.js',
      port: 3000,
    },
    {
      pid: 6420,
      user: 'root',
      cpu: 2.0,
      mem: variant === 'main' ? 8.5 : 2.2,
      rssKb: 690_000,
      command: '/usr/bin/dockerd',
      service: 'docker',
    },
    {
      pid: 7001,
      user: 'redis',
      cpu: 1.1,
      mem: variant === 'main' ? 4.4 : 9.9,
      rssKb: 358_000,
      command: 'redis-server *:6379',
      port: 6379,
    },
    {
      pid: 7302,
      user: 'root',
      cpu: variant === 'main' ? 15.6 : 41.7,
      mem: 1.0,
      rssKb: 81_000,
      command: 'gzip -9 /var/log/old/app.log.3',
    },
  ]
  if (p.nginx === 'active') {
    processes.push({
      pid: 1501,
      user: 'root',
      cpu: 0.3,
      mem: 0.4,
      rssKb: 30_000,
      command: 'nginx: master process /usr/sbin/nginx',
      port: 80,
      service: 'nginx',
    })
  }
  if (p.port443)
    processes.push({
      pid: 1622,
      user: 'haproxy',
      cpu: 0.8,
      mem: 0.6,
      rssKb: 48_000,
      command: '/usr/sbin/haproxy -f /etc/haproxy/haproxy.cfg',
      port: 443,
      service: 'haproxy',
    })

  /* --- disks --- */
  const mounts = p.mounts.map(([fs, pct, mount], i) => {
    const sizeKb = [52_000_000, 1_000_000, 104_000_000, 520_000_000, 260_000_000][i % 5]
    return { fs, sizeKb, usedKb: Math.round((sizeKb * pct) / 100), mount }
  })

  /* --- containers and cloud --- */
  const images: DockerImage[] =
    variant === 'main'
      ? [
          {
            repository: 'shop/web',
            tag: '1.8.2',
            id: 'a1b2c3d4e5f6',
            ageDays: 2,
            sizeMb: 182,
            inUse: true,
          },
          { repository: 'shop/web', tag: '1.8.1', id: 'b2c3d4e5f6a1', ageDays: 9, sizeMb: 181 },
          { repository: 'shop/web', tag: '1.7.0', id: 'c3d4e5f6a1b2', ageDays: 41, sizeMb: 176 },
          {
            repository: 'shop/api',
            tag: '3.2.0',
            id: 'd4e5f6a1b2c3',
            ageDays: 1,
            sizeMb: 240,
            inUse: true,
          },
          { repository: 'shop/api', tag: '3.1.4', id: 'e5f6a1b2c3d4', ageDays: 33, sizeMb: 238 },
          { repository: '<none>', tag: '<none>', id: 'f6a1b2c3d4e5', ageDays: 15, sizeMb: 238 },
          { repository: '<none>', tag: '<none>', id: '0a1b2c3d4e5f', ageDays: 4, sizeMb: 181 },
          {
            repository: 'redis',
            tag: '7.2',
            id: '1b2c3d4e5f6a',
            ageDays: 60,
            sizeMb: 117,
            inUse: true,
          },
          { repository: 'postgres', tag: '15', id: '2c3d4e5f6a1b', ageDays: 90, sizeMb: 412 },
        ]
      : [
          {
            repository: 'ledger/svc',
            tag: '0.9.0',
            id: '9f8e7d6c5b4a',
            ageDays: 3,
            sizeMb: 95,
            inUse: true,
          },
          { repository: 'ledger/svc', tag: '0.8.0', id: '8e7d6c5b4a9f', ageDays: 25, sizeMb: 93 },
          { repository: '<none>', tag: '<none>', id: '7d6c5b4a9f8e', ageDays: 20, sizeMb: 93 },
          {
            repository: 'nginx',
            tag: '1.27',
            id: '6c5b4a9f8e7d',
            ageDays: 50,
            sizeMb: 188,
            inUse: true,
          },
          { repository: 'nginx', tag: '1.25', id: '5b4a9f8e7d6c', ageDays: 120, sizeMb: 187 },
          { repository: '<none>', tag: '<none>', id: '4a9f8e7d6c5b', ageDays: 1, sizeMb: 95 },
        ]
  const deployments: Deployment[] =
    variant === 'main'
      ? [
          { name: 'web', namespace: 'shop', healthy: true, replicas: 3 },
          { name: 'api', namespace: 'shop', healthy: false, replicas: 2 },
          { name: 'worker', namespace: 'shop', healthy: true, replicas: 1 },
        ]
      : [
          { name: 'web', namespace: 'shop', healthy: false, replicas: 4 },
          { name: 'api', namespace: 'shop', healthy: true, replicas: 2 },
          { name: 'ledger', namespace: 'finance', healthy: true, replicas: 2 },
        ]

  return {
    variant,
    now,
    files,
    hosts,
    domains: p.domains.map((domain) => ({ ...domain })),
    services: {
      nginx: { state: p.nginx, restartWorks: true },
      payments: { ...p.payments },
      sshd: { state: 'active', restartWorks: true },
      cron: { state: 'active', restartWorks: true },
      docker: { state: 'active', restartWorks: true },
      ...(p.port443 ? { haproxy: { state: 'active' as const, restartWorks: true } } : {}),
    },
    processes,
    mounts,
    memory: {
      totalMb: 7972,
      usedMb: p.memUsedMb,
      buffMb: 410,
      swapTotalMb: 2047,
      swapUsedMb: variant === 'main' ? 512 : 0,
    },
    load: p.load,
    cpus: p.cpus,
    uptimeDays: variant === 'main' ? 12 : 41,
    images,
    deployments,
    resources: resources(variant),
    crontab: '# m h dom mon dow command\n15 3 * * * /usr/local/bin/backup-db.sh\n',
    outbox: [],
  }
}

/** Human age of a file, for feedback ("only 4 days old"). */
export function ageText(mtime: number, now: number): string {
  const days = Math.floor((now - mtime) / DAY)
  if (days >= 1) return `${days} day${days === 1 ? '' : 's'} old`
  const hours = Math.floor((now - mtime) / HOURS)
  if (hours >= 1) return `${hours} hour${hours === 1 ? '' : 's'} old`
  return 'from the last hour'
}
