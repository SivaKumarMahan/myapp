import { KQL_NOW, kqlTables } from './schema'

/**
 * Generates the simulator's ~2,000 rows as SQL, from a seeded random number
 * generator so the data - and every challenge answer - is identical on every
 * device. The story in the data is deliberate:
 *
 * - vm-batch-01 stopped sending heartbeats 40 minutes ago, vm-api-02 two
 *   hours ago (the "VMs with no heartbeat" questions).
 * - vm-sql-01 runs hot on CPU, vm-web-02 is low on disk.
 * - POST /api/checkout is slow and fails more than anything else, and each
 *   failed request with a 5xx code has a matching exception - except some.
 * - One IP address is password-spraying several accounts.
 * - A handful of resource deletions and failed deployments in the activity log.
 */

const NOW = Date.parse(`${KQL_NOW.replace(' ', 'T')}Z`)
const MINUTE = 60_000

let seed = 1_234_567
const random = () => {
  seed = (seed * 16807) % 2147483647
  return seed / 2147483647
}
const pick = <T>(items: readonly T[]): T => items[Math.floor(random() * items.length)]
const chance = (p: number) => random() < p
const stamp = (time: number) => new Date(time).toISOString().slice(0, 19).replace('T', ' ')
const guid = () =>
  Array.from({ length: 4 }, () =>
    Math.floor(random() * 0xffffffff)
      .toString(16)
      .padStart(8, '0'),
  ).join('')

type Row = (string | number | null)[]

const vms = [
  { name: 'vm-web-01', os: 'Linux', rg: 'rg-shop-prod', ip: '10.1.0.4' },
  { name: 'vm-web-02', os: 'Linux', rg: 'rg-shop-prod', ip: '10.1.0.5' },
  { name: 'vm-api-01', os: 'Linux', rg: 'rg-shop-prod', ip: '10.1.1.4' },
  { name: 'vm-api-02', os: 'Linux', rg: 'rg-shop-prod', ip: '10.1.1.5' },
  { name: 'vm-sql-01', os: 'Windows', rg: 'rg-data-prod', ip: '10.1.2.4' },
  { name: 'vm-batch-01', os: 'Linux', rg: 'rg-batch', ip: '10.1.3.4' },
  { name: 'vm-jump-01', os: 'Windows', rg: 'rg-mgmt', ip: '10.1.9.4' },
  { name: 'vm-build-01', os: 'Linux', rg: 'rg-devops', ip: '10.1.8.4' },
]
const lastHeartbeat: Record<string, number> = {
  'vm-batch-01': NOW - 40 * MINUTE,
  'vm-api-02': NOW - 120 * MINUTE,
}

function heartbeat(): Row[] {
  const rows: Row[] = []
  for (const vm of vms) {
    const stop = lastHeartbeat[vm.name] ?? NOW
    for (let t = NOW - 6 * 60 * MINUTE; t <= stop; t += 5 * MINUTE) {
      // A little jitter, as real agents have.
      rows.push([
        stamp(t - Math.floor(random() * 50_000)),
        vm.name,
        vm.os,
        vm.rg,
        'Direct Agent',
        vm.ip,
      ])
    }
  }
  return rows
}

function perf(): Row[] {
  const rows: Row[] = []
  for (const vm of vms) {
    const stop = lastHeartbeat[vm.name] ?? NOW
    for (let t = NOW - 6 * 60 * MINUTE + 15 * MINUTE; t <= stop; t += 15 * MINUTE) {
      const hot = vm.name === 'vm-sql-01'
      const cpu = hot ? 78 + random() * 20 : 8 + random() * 45
      const memory = vm.os === 'Windows' ? 1200 + random() * 3000 : 900 + random() * 6000
      const disk = vm.name === 'vm-web-02' ? 6 + random() * 6 : 35 + random() * 50
      const time = stamp(t)
      rows.push([time, vm.name, 'Processor', '% Processor Time', '_Total', round(cpu)])
      rows.push([time, vm.name, 'Memory', 'Available MBytes', '', Math.round(memory)])
      rows.push([
        time,
        vm.name,
        'LogicalDisk',
        '% Free Space',
        vm.os === 'Windows' ? 'C:' : '/',
        round(disk),
      ])
    }
  }
  return rows
}

const round = (value: number) => Math.round(value * 100) / 100

const endpoints = [
  { name: 'GET /', role: 'shop-web', weight: 30, ms: 60, fail: 0.01 },
  { name: 'GET /products', role: 'shop-web', weight: 22, ms: 140, fail: 0.02 },
  { name: 'GET /api/products/{id}', role: 'shop-api', weight: 18, ms: 90, fail: 0.03 },
  { name: 'GET /api/search', role: 'shop-api', weight: 12, ms: 420, fail: 0.04 },
  { name: 'POST /api/cart', role: 'shop-api', weight: 8, ms: 180, fail: 0.05 },
  { name: 'POST /api/checkout', role: 'shop-api', weight: 6, ms: 1400, fail: 0.22 },
  { name: 'GET /api/recommendations', role: 'shop-api', weight: 4, ms: 900, fail: 0.12 },
]
const cities = ['London', 'Dublin', 'Manchester', 'Paris', 'Berlin', 'Amsterdam']
const exceptionTypes: Record<string, [string, string][]> = {
  'POST /api/checkout': [
    ['System.TimeoutException', 'Payment gateway did not respond within 30s'],
    ['System.Data.SqlClient.SqlException', 'Transaction (Process ID 61) was deadlocked'],
  ],
  'GET /api/recommendations': [
    ['System.Net.Http.HttpRequestException', 'Recommendations service returned 503'],
  ],
  default: [
    ['System.NullReferenceException', 'Object reference not set to an instance of an object'],
  ],
}

function requestsAndExceptions(): { requests: Row[]; exceptions: Row[] } {
  const requests: Row[] = []
  const exceptions: Row[] = []
  const total = endpoints.reduce((sum, endpoint) => sum + endpoint.weight, 0)
  for (let i = 0; i < 520; i += 1) {
    let roll = random() * total
    const endpoint = endpoints.find((candidate) => (roll -= candidate.weight) <= 0) ?? endpoints[0]
    // Busier in the working day; a little quieter overnight.
    const offset = Math.floor(random() * 24 * 60 * MINUTE)
    const time = NOW - offset
    const failed = chance(endpoint.fail)
    const code = failed ? pick(['500', '500', '503', '502', '404']) : chance(0.03) ? '304' : '200'
    const duration = round(
      endpoint.ms * (0.4 + random() * 1.4) + (failed && code !== '404' ? 2000 * random() : 0),
    )
    const id = guid()
    const path = endpoint.name.split(' ')[1].replace('{id}', String(1 + Math.floor(random() * 200)))
    requests.push([
      stamp(time),
      endpoint.name,
      `https://shop.example.com${path}`,
      code,
      failed ? 0 : 1,
      duration,
      id,
      endpoint.role,
      pick(cities),
    ])
    // Most server errors leave an exception behind; some do not.
    if (failed && code.startsWith('5') && chance(0.8)) {
      const [type, message] = pick(exceptionTypes[endpoint.name] ?? exceptionTypes.default)
      exceptions.push([stamp(time + 50), type, message, id, endpoint.role, 3])
    }
  }
  // Background exceptions not tied to a failed request.
  for (let i = 0; i < 18; i += 1) {
    exceptions.push([
      stamp(NOW - Math.floor(random() * 24 * 60 * MINUTE)),
      'System.InvalidOperationException',
      'Cache entry was evicted during read',
      guid(),
      pick(['shop-web', 'shop-api']),
      2,
    ])
  }
  return { requests, exceptions }
}

const users = [
  'alice@contoso.com',
  'bob@contoso.com',
  'carol@contoso.com',
  'dave@contoso.com',
  'erin@contoso.com',
  'frank@contoso.com',
  'grace@contoso.com',
  'heidi@contoso.com',
  'svc-deploy@contoso.com',
]
const apps = ['Azure Portal', 'Microsoft Teams', 'Office 365 Exchange Online', 'Azure DevOps']
const failures: [string, string][] = [
  ['50126', 'Invalid username or password'],
  ['50074', 'Strong authentication (MFA) is required'],
  ['50053', 'Account is locked because of too many failed attempts'],
]

function signins(): Row[] {
  const rows: Row[] = []
  for (let i = 0; i < 260; i += 1) {
    const user = pick(users)
    const failed = chance(0.12)
    const [code, text] = failed ? pick(failures) : ['0', 'Success']
    const home =
      users.indexOf(user) % 2 === 0 ? ['London, GB', '81.2.69.'] : ['Dublin, IE', '87.32.10.']
    rows.push([
      stamp(NOW - Math.floor(random() * 24 * 60 * MINUTE)),
      user,
      pick(apps),
      `${home[1]}${10 + Math.floor(random() * 40)}`,
      home[0],
      code,
      text,
      failed ? 'notApplied' : 'success',
    ])
  }
  // A password spray: one IP, many accounts, almost all failing.
  for (let i = 0; i < 42; i += 1) {
    const failed = i % 14 !== 13
    rows.push([
      stamp(NOW - 3 * 60 * MINUTE + i * 2 * MINUTE),
      users[i % 8],
      'Azure Portal',
      '203.0.113.66',
      'Unknown',
      failed ? '50126' : '50053',
      failed
        ? 'Invalid username or password'
        : 'Account is locked because of too many failed attempts',
      'notApplied',
    ])
  }
  // Two sign-ins for bob from a country he has never signed in from.
  for (const hours of [5, 4]) {
    rows.push([
      stamp(NOW - hours * 60 * MINUTE),
      'bob@contoso.com',
      'Azure Portal',
      '45.155.204.3',
      'Lagos, NG',
      '0',
      'Success',
      'success',
    ])
  }
  return rows
}

const operations = [
  ['MICROSOFT.COMPUTE/VIRTUALMACHINES/WRITE', 'Microsoft.Compute', 'virtualMachines'],
  ['MICROSOFT.COMPUTE/VIRTUALMACHINES/START/ACTION', 'Microsoft.Compute', 'virtualMachines'],
  ['MICROSOFT.COMPUTE/VIRTUALMACHINES/DEALLOCATE/ACTION', 'Microsoft.Compute', 'virtualMachines'],
  [
    'MICROSOFT.NETWORK/NETWORKSECURITYGROUPS/SECURITYRULES/WRITE',
    'Microsoft.Network',
    'networkSecurityGroups',
  ],
  ['MICROSOFT.STORAGE/STORAGEACCOUNTS/WRITE', 'Microsoft.Storage', 'storageAccounts'],
  ['MICROSOFT.RESOURCES/DEPLOYMENTS/WRITE', 'Microsoft.Resources', 'deployments'],
  ['MICROSOFT.KEYVAULT/VAULTS/SECRETS/WRITE', 'Microsoft.KeyVault', 'vaults'],
] as const
const callers = [
  'alice@contoso.com',
  'carol@contoso.com',
  'svc-deploy@contoso.com',
  'erin@contoso.com',
]
const groups = ['rg-shop-prod', 'rg-data-prod', 'rg-devops', 'rg-mgmt']

function activity(): Row[] {
  const rows: Row[] = []
  const resource = (provider: string, kind: string, group: string) =>
    `/subscriptions/0000-1111/resourceGroups/${group}/providers/${provider}/${kind}/${kind.slice(0, 3)}-${Math.floor(random() * 9) + 1}`
  for (let i = 0; i < 175; i += 1) {
    const [operation, provider, kind] = pick(operations)
    const caller = operation.includes('DEPLOYMENTS') ? 'svc-deploy@contoso.com' : pick(callers)
    const group = pick(groups)
    const status =
      operation.includes('DEPLOYMENTS') && chance(0.25)
        ? 'Failure'
        : chance(0.04)
          ? 'Failure'
          : 'Success'
    rows.push([
      stamp(NOW - Math.floor(random() * 24 * 60 * MINUTE)),
      operation,
      status,
      caller,
      group,
      provider.toUpperCase(),
      resource(provider, kind, group),
      'Administrative',
    ])
  }
  // The deletions someone will be asked about.
  const deletions: [number, string, string, string, string][] = [
    [
      7,
      'MICROSOFT.COMPUTE/VIRTUALMACHINES/DELETE',
      'erin@contoso.com',
      'rg-batch',
      '/subscriptions/0000-1111/resourceGroups/rg-batch/providers/Microsoft.Compute/virtualMachines/vm-batch-02',
    ],
    [
      5,
      'MICROSOFT.STORAGE/STORAGEACCOUNTS/DELETE',
      'erin@contoso.com',
      'rg-data-prod',
      '/subscriptions/0000-1111/resourceGroups/rg-data-prod/providers/Microsoft.Storage/storageAccounts/stexports01',
    ],
    [
      2,
      'MICROSOFT.NETWORK/NETWORKSECURITYGROUPS/SECURITYRULES/DELETE',
      'carol@contoso.com',
      'rg-shop-prod',
      '/subscriptions/0000-1111/resourceGroups/rg-shop-prod/providers/Microsoft.Network/networkSecurityGroups/nsg-web/securityRules/allow-https',
    ],
  ]
  for (const [hours, operation, caller, group, id] of deletions) {
    rows.push([
      stamp(NOW - hours * 60 * MINUTE),
      operation,
      'Success',
      caller,
      group,
      operation.split('/')[0],
      id,
      'Administrative',
    ])
  }
  rows.push([
    stamp(NOW - 6 * 60 * MINUTE),
    'MICROSOFT.KEYVAULT/VAULTS/DELETE',
    'Failure',
    'frank@contoso.com',
    'rg-mgmt',
    'MICROSOFT.KEYVAULT',
    '/subscriptions/0000-1111/resourceGroups/rg-mgmt/providers/Microsoft.KeyVault/vaults/kv-prod',
    'Administrative',
  ])
  return rows
}

const quote = (value: string | number | null) =>
  value === null
    ? 'NULL'
    : typeof value === 'number'
      ? String(value)
      : `'${value.replace(/'/g, "''")}'`

const sqlType = {
  datetime: 'TEXT',
  string: 'TEXT',
  int: 'INTEGER',
  real: 'REAL',
  bool: 'INTEGER',
} as const

/** Every table's CREATE and INSERT statements, ready for SQLite. */
export function generateKqlDatasets(): string {
  seed = 1_234_567
  const { requests, exceptions } = requestsAndExceptions()
  const data: Record<string, Row[]> = {
    Heartbeat: heartbeat(),
    Perf: perf(),
    requests,
    exceptions,
    SigninLogs: signins(),
    AzureActivity: activity(),
  }
  return kqlTables
    .map((table) => {
      const create = `CREATE TABLE "${table.name}" (${table.columns
        .map((column) => `"${column.name}" ${sqlType[column.type]}`)
        .join(', ')});`
      const rows = [...data[table.name]].sort((a, b) => String(a[0]).localeCompare(String(b[0])))
      const insert = `INSERT INTO "${table.name}" VALUES\n${rows.map((row) => `(${row.map(quote).join(', ')})`).join(',\n')};`
      return `${create}\n${insert}`
    })
    .join('\n\n')
}
