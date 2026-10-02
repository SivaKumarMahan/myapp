import { CliError } from './errors'
import {
  LOCATIONS,
  SUBSCRIPTION_ID,
  SUBSCRIPTION_NAME,
  TENANT_ID,
  USER,
  groupId,
  resourceId,
  type CloudState,
  type NetworkSecurityGroup,
  type NsgRule,
  type ResourceGroup,
  type StorageAccount,
  type VirtualMachine,
  type VirtualNetwork,
} from './state'

/**
 * The commands the simulator models for real, on the in-memory cloud.
 *
 * Each declares its parameters the way `az <command> --help` lists them, so
 * missing or unknown arguments fail with the Azure CLI's own messages, and
 * returns the JSON az would print (trimmed to the useful fields).
 */

export interface ParamSpec {
  /** Long name, with dashes: '--resource-group'. */
  name: string
  aliases?: string[]
  required?: boolean
  /** Takes several space-separated values (--address-prefixes a b). */
  multiple?: boolean
  /** A switch with no value (--yes). */
  flag?: boolean
  choices?: string[]
  help?: string
}

export type Args = Record<string, string | string[] | boolean | undefined>

export interface CommandContext {
  state: CloudState
  /** Values from `az configure --defaults`. */
  defaults: Record<string, string>
}

export interface CommandSpec {
  path: string[]
  summary: string
  params: ParamSpec[]
  run?: (args: Args, context: CommandContext) => unknown
  /** Reshapes each item for `-o table`, as az's table transformers do. */
  table?: (item: Record<string, unknown>) => Record<string, unknown>
  /** Asked before running, unless --yes is given. */
  confirm?: (args: Args) => string
  /** Where the command comes from in the course command reference. */
  reference?: { course: string; template: string; description: string }
}

/* ------------------------------------------------------------ helpers */

const RG: ParamSpec = {
  name: '--resource-group',
  aliases: ['-g'],
  required: true,
  help: 'Name of resource group.',
}
const NAME: ParamSpec = { name: '--name', aliases: ['-n'], required: true }
const LOCATION: ParamSpec = {
  name: '--location',
  aliases: ['-l'],
  help: 'Location. Defaults to the resource group location.',
}
const TAGS: ParamSpec = {
  name: '--tags',
  multiple: true,
  help: 'Space-separated tags: key[=value].',
}
const YES: ParamSpec = {
  name: '--yes',
  aliases: ['-y'],
  flag: true,
  help: 'Do not prompt for confirmation.',
}
const NO_WAIT: ParamSpec = { name: '--no-wait', flag: true }

const str = (args: Args, key: string) => {
  const value = args[key]
  return Array.isArray(value) ? value.join(' ') : typeof value === 'string' ? value : undefined
}
const list = (args: Args, key: string) => {
  const value = args[key]
  return Array.isArray(value) ? value : typeof value === 'string' ? [value] : []
}
const bool = (args: Args, key: string, fallback: boolean) => {
  const value = str(args, key)
  if (value === undefined) return args[key] === true ? true : fallback
  if (/^(true|yes|1)$/i.test(value)) return true
  if (/^(false|no|0)$/i.test(value)) return false
  throw new CliError(`argument --${key}: invalid boolean value: '${value}'`)
}

function parseTags(values: string[]): Record<string, string> {
  const tags: Record<string, string> = {}
  for (const value of values) {
    if (value === '' || value === '""') continue
    const [key, ...rest] = value.split('=')
    tags[key] = rest.join('=')
  }
  return tags
}

const tagsOrNull = (tags: Record<string, string>) => (Object.keys(tags).length > 0 ? tags : null)

const azureError = (code: string, message: string) =>
  new CliError(`(${code}) ${message}\nCode: ${code}\nMessage: ${message}`)

function location(args: Args, context: CommandContext, fallback?: string): string {
  const value = (str(args, 'location') ?? context.defaults.location ?? fallback ?? '')
    .toLowerCase()
    .replace(/\s+/g, '')
  if (!value) throw new CliError('the following arguments are required: --location/-l')
  if (!LOCATIONS[value]) {
    throw azureError(
      'LocationNotAvailableForResourceGroup',
      `The provided location '${value}' is not available for resource group. List of available regions is '${Object.keys(LOCATIONS).join(',')}'.`,
    )
  }
  return value
}

function group(context: CommandContext, args: Args): ResourceGroup {
  const name = str(args, 'resource-group') ?? context.defaults.group
  if (!name) throw new CliError('the following arguments are required: --resource-group/-g')
  const found = context.state.resourceGroups.find(
    (candidate) => candidate.name.toLowerCase() === name.toLowerCase(),
  )
  if (!found)
    throw azureError('ResourceGroupNotFound', `Resource group '${name}' could not be found.`)
  return found
}

/** Locks on a resource group stop writes (ReadOnly) or deletes (both levels). */
function assertUnlocked(context: CommandContext, groupName: string, operation: 'write' | 'delete') {
  const locks = context.state.locks.filter(
    (lock) =>
      lock.resourceGroup.toLowerCase() === groupName.toLowerCase() &&
      (operation === 'delete' || lock.level === 'ReadOnly'),
  )
  if (locks.length === 0) return
  const scope = groupId(groupName)
  throw azureError(
    'ScopeLocked',
    `The scope '${scope}' cannot perform ${operation} operation because following scope(s) are locked: '${scope}/providers/Microsoft.Authorization/locks/${locks[0].name}'. Please remove the lock and try again.`,
  )
}

const same = (a: string, b: string) => a.toLowerCase() === b.toLowerCase()

/* --------------------------------------------------------- CIDR helpers */

function parseCidr(cidr: string): { start: number; end: number; prefix: number } {
  const match = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})\/(\d{1,2})$/.exec(cidr)
  if (!match)
    throw azureError('InvalidAddressPrefixFormat', `Address prefix ${cidr} has an invalid format.`)
  const octets = match.slice(1, 5).map(Number)
  const prefix = Number(match[5])
  if (octets.some((octet) => octet > 255) || prefix > 32) {
    throw azureError('InvalidAddressPrefixFormat', `Address prefix ${cidr} has an invalid format.`)
  }
  const address = octets.reduce((sum, octet) => sum * 256 + octet, 0)
  const size = 2 ** (32 - prefix)
  if (address % size !== 0) {
    throw azureError(
      'InvalidCIDRNotation',
      `The address prefix ${cidr} in resource ... has an invalid CIDR notation. For the given prefix length, the address prefix should be ${toIp(address - (address % size))}/${prefix}.`,
    )
  }
  return { start: address, end: address + size - 1, prefix }
}

const toIp = (value: number) =>
  [24, 16, 8, 0].map((shift) => Math.floor(value / 2 ** shift) % 256).join('.')
const within = (inner: string, outer: string) => {
  const a = parseCidr(inner)
  const b = parseCidr(outer)
  return a.start >= b.start && a.end <= b.end
}
const overlap = (x: string, y: string) => {
  const a = parseCidr(x)
  const b = parseCidr(y)
  return a.start <= b.end && b.start <= a.end
}

/* ------------------------------------------------------------- views */

const groupView = (rg: ResourceGroup) => ({
  id: groupId(rg.name),
  location: rg.location,
  managedBy: null,
  name: rg.name,
  properties: { provisioningState: 'Succeeded' },
  tags: tagsOrNull(rg.tags),
  type: 'Microsoft.Resources/resourceGroups',
})

const nsgId = (rg: string, name: string) =>
  resourceId(rg, 'Microsoft.Network', 'networkSecurityGroups', name)

const subnetView = (vnet: VirtualNetwork, subnet: VirtualNetwork['subnets'][number]) => ({
  addressPrefix: subnet.addressPrefix,
  id: `${resourceId(vnet.resourceGroup, 'Microsoft.Network', 'virtualNetworks', vnet.name)}/subnets/${subnet.name}`,
  name: subnet.name,
  networkSecurityGroup: subnet.nsg
    ? { id: nsgId(vnet.resourceGroup, subnet.nsg), resourceGroup: vnet.resourceGroup }
    : null,
  privateEndpointNetworkPolicies: 'Disabled',
  provisioningState: 'Succeeded',
  resourceGroup: vnet.resourceGroup,
  type: 'Microsoft.Network/virtualNetworks/subnets',
})

const vnetView = (vnet: VirtualNetwork) => ({
  addressSpace: { addressPrefixes: vnet.addressPrefixes },
  enableDdosProtection: false,
  id: resourceId(vnet.resourceGroup, 'Microsoft.Network', 'virtualNetworks', vnet.name),
  location: vnet.location,
  name: vnet.name,
  provisioningState: 'Succeeded',
  resourceGroup: vnet.resourceGroup,
  subnets: vnet.subnets.map((subnet) => subnetView(vnet, subnet)),
  tags: tagsOrNull(vnet.tags),
  type: 'Microsoft.Network/virtualNetworks',
  virtualNetworkPeerings: [],
})

const ruleView = (nsg: NetworkSecurityGroup, rule: NsgRule) => ({
  access: rule.access,
  destinationAddressPrefix: rule.destinationAddressPrefix,
  ...(rule.destinationPortRanges.length === 1
    ? { destinationPortRange: rule.destinationPortRanges[0], destinationPortRanges: [] }
    : { destinationPortRanges: rule.destinationPortRanges }),
  direction: rule.direction,
  id: `${nsgId(nsg.resourceGroup, nsg.name)}/securityRules/${rule.name}`,
  name: rule.name,
  priority: rule.priority,
  protocol: rule.protocol,
  provisioningState: 'Succeeded',
  resourceGroup: nsg.resourceGroup,
  sourceAddressPrefix: rule.sourceAddressPrefix,
  sourcePortRange: rule.sourcePortRange,
  type: 'Microsoft.Network/networkSecurityGroups/securityRules',
})

const DEFAULT_RULES = [
  'AllowVnetInBound',
  'AllowAzureLoadBalancerInBound',
  'DenyAllInBound',
  'AllowVnetOutBound',
  'AllowInternetOutBound',
  'DenyAllOutBound',
]

const nsgView = (state: CloudState, nsg: NetworkSecurityGroup) => ({
  defaultSecurityRules: DEFAULT_RULES.map((name, index) => ({
    access: name.startsWith('Deny') ? 'Deny' : 'Allow',
    direction: name.endsWith('InBound') ? 'Inbound' : 'Outbound',
    name,
    priority: [65000, 65001, 65500][index % 3],
  })),
  id: nsgId(nsg.resourceGroup, nsg.name),
  location: nsg.location,
  name: nsg.name,
  provisioningState: 'Succeeded',
  resourceGroup: nsg.resourceGroup,
  securityRules: nsg.rules.map((rule) => ruleView(nsg, rule)),
  subnets: state.vnets.flatMap((vnet) =>
    vnet.subnets
      .filter((subnet) => subnet.nsg === nsg.name && vnet.resourceGroup === nsg.resourceGroup)
      .map((subnet) => ({ id: subnetView(vnet, subnet).id })),
  ),
  tags: tagsOrNull(nsg.tags),
  type: 'Microsoft.Network/networkSecurityGroups',
})

const IMAGES: Record<
  string,
  { publisher: string; offer: string; sku: string; os: 'Linux' | 'Windows' }
> = {
  Ubuntu2204: {
    publisher: 'Canonical',
    offer: '0001-com-ubuntu-server-jammy',
    sku: '22_04-lts-gen2',
    os: 'Linux',
  },
  Ubuntu2404: { publisher: 'Canonical', offer: 'ubuntu-24_04-lts', sku: 'server', os: 'Linux' },
  Debian11: { publisher: 'Debian', offer: 'debian-11', sku: '11-backports-gen2', os: 'Linux' },
  RHELRaw8LVMGen2: { publisher: 'RedHat', offer: 'RHEL', sku: '8-lvm-gen2', os: 'Linux' },
  Win2022Datacenter: {
    publisher: 'MicrosoftWindowsServer',
    offer: 'WindowsServer',
    sku: '2022-datacenter-g2',
    os: 'Windows',
  },
  Win2019Datacenter: {
    publisher: 'MicrosoftWindowsServer',
    offer: 'WindowsServer',
    sku: '2019-datacenter-gensecond',
    os: 'Windows',
  },
}
const SIZES = [
  'Standard_B1s',
  'Standard_B1ms',
  'Standard_B2s',
  'Standard_B2ms',
  'Standard_D2s_v5',
  'Standard_D4s_v5',
  'Standard_DS1_v2',
  'Standard_DS2_v2',
  'Standard_E2s_v5',
  'Standard_F2s_v2',
]

const vmView = (vm: VirtualMachine, details: boolean) => {
  const image = IMAGES[vm.image]
  return {
    hardwareProfile: { vmSize: vm.size },
    id: resourceId(vm.resourceGroup, 'Microsoft.Compute', 'virtualMachines', vm.name),
    location: vm.location,
    name: vm.name,
    osProfile: { adminUsername: vm.adminUsername, computerName: vm.name },
    ...(details
      ? { powerState: vm.powerState, privateIps: vm.privateIp, publicIps: vm.publicIp ?? '' }
      : {}),
    provisioningState: 'Succeeded',
    resourceGroup: vm.resourceGroup,
    storageProfile: {
      imageReference: {
        offer: image?.offer,
        publisher: image?.publisher,
        sku: image?.sku,
        version: 'latest',
      },
      osDisk: { osType: vm.osType },
    },
    tags: tagsOrNull(vm.tags),
    type: 'Microsoft.Compute/virtualMachines',
  }
}

const SKUS = [
  'Standard_LRS',
  'Standard_GRS',
  'Standard_RAGRS',
  'Standard_ZRS',
  'Standard_GZRS',
  'Standard_RAGZRS',
  'Premium_LRS',
  'Premium_ZRS',
]
const KINDS = ['StorageV2', 'Storage', 'BlobStorage', 'BlockBlobStorage', 'FileStorage']
const TLS = ['TLS1_0', 'TLS1_1', 'TLS1_2']

const storageView = (account: StorageAccount) => ({
  accessTier: account.kind === 'StorageV2' || account.kind === 'BlobStorage' ? 'Hot' : null,
  allowBlobPublicAccess: account.allowBlobPublicAccess,
  enableHttpsTrafficOnly: account.enableHttpsTrafficOnly,
  id: resourceId(account.resourceGroup, 'Microsoft.Storage', 'storageAccounts', account.name),
  kind: account.kind,
  location: account.location,
  minimumTlsVersion: account.minimumTlsVersion,
  name: account.name,
  primaryEndpoints: {
    blob: `https://${account.name}.blob.core.windows.net/`,
    file: `https://${account.name}.file.core.windows.net/`,
    queue: `https://${account.name}.queue.core.windows.net/`,
    table: `https://${account.name}.table.core.windows.net/`,
  },
  primaryLocation: account.location,
  provisioningState: 'Succeeded',
  resourceGroup: account.resourceGroup,
  sku: { name: account.sku, tier: account.sku.split('_')[0] },
  statusOfPrimary: 'available',
  tags: tagsOrNull(account.tags),
  type: 'Microsoft.Storage/storageAccounts',
})

const lockView = (lock: CloudState['locks'][number]) => ({
  id: `${groupId(lock.resourceGroup)}/providers/Microsoft.Authorization/locks/${lock.name}`,
  level: lock.level,
  name: lock.name,
  notes: lock.notes,
  owners: null,
  resourceGroup: lock.resourceGroup,
  type: 'Microsoft.Authorization/locks',
})

/** Every resource in a group, as `az resource list` shows them. */
function allResources(state: CloudState) {
  const entry = (
    id: string,
    name: string,
    type: string,
    rg: string,
    loc: string,
    tags: Record<string, string>,
  ) => ({
    id,
    location: loc,
    name,
    resourceGroup: rg,
    tags: tagsOrNull(tags),
    type,
  })
  return [
    ...state.vnets.map((v) =>
      entry(
        vnetView(v).id,
        v.name,
        'Microsoft.Network/virtualNetworks',
        v.resourceGroup,
        v.location,
        v.tags,
      ),
    ),
    ...state.nsgs.map((n) =>
      entry(
        nsgId(n.resourceGroup, n.name),
        n.name,
        'Microsoft.Network/networkSecurityGroups',
        n.resourceGroup,
        n.location,
        n.tags,
      ),
    ),
    ...state.vms.map((m) =>
      entry(
        vmView(m, false).id,
        m.name,
        'Microsoft.Compute/virtualMachines',
        m.resourceGroup,
        m.location,
        m.tags,
      ),
    ),
    ...state.vms
      .filter((m) => m.publicIp)
      .map((m) =>
        entry(
          resourceId(
            m.resourceGroup,
            'Microsoft.Network',
            'publicIPAddresses',
            `${m.name}PublicIP`,
          ),
          `${m.name}PublicIP`,
          'Microsoft.Network/publicIPAddresses',
          m.resourceGroup,
          m.location,
          {},
        ),
      ),
    ...state.storageAccounts.map((s) =>
      entry(
        storageView(s).id,
        s.name,
        'Microsoft.Storage/storageAccounts',
        s.resourceGroup,
        s.location,
        s.tags,
      ),
    ),
  ]
}

const inGroup = <T extends { resourceGroup: string }>(items: T[], rg: string | undefined) =>
  rg ? items.filter((item) => same(item.resourceGroup, rg)) : items

function findVnet(context: CommandContext, rg: string, name: string) {
  const vnet = context.state.vnets.find(
    (candidate) => same(candidate.resourceGroup, rg) && same(candidate.name, name),
  )
  if (!vnet)
    throw azureError(
      'ResourceNotFound',
      `The Resource 'Microsoft.Network/virtualNetworks/${name}' under resource group '${rg}' was not found.`,
    )
  return vnet
}

function findNsg(context: CommandContext, rg: string, name: string) {
  const nsg = context.state.nsgs.find(
    (candidate) => same(candidate.resourceGroup, rg) && same(candidate.name, name),
  )
  if (!nsg)
    throw azureError(
      'ResourceNotFound',
      `The Resource 'Microsoft.Network/networkSecurityGroups/${name}' under resource group '${rg}' was not found.`,
    )
  return nsg
}

function findVm(context: CommandContext, rg: string, name: string) {
  const vm = context.state.vms.find(
    (candidate) => same(candidate.resourceGroup, rg) && same(candidate.name, name),
  )
  if (!vm)
    throw azureError(
      'ResourceNotFound',
      `The Resource 'Microsoft.Compute/virtualMachines/${name}' under resource group '${rg}' was not found.`,
    )
  return vm
}

function findStorage(context: CommandContext, rg: string | undefined, name: string) {
  const account = context.state.storageAccounts.find(
    (candidate) => same(candidate.name, name) && (!rg || same(candidate.resourceGroup, rg)),
  )
  if (!account)
    throw azureError(
      'ResourceNotFound',
      `The Resource 'Microsoft.Storage/storageAccounts/${name}' under resource group '${rg ?? ''}' was not found.`,
    )
  return account
}

/** Applies `--set tags.key=value` the way generic update does. */
function applySet(target: { tags: Record<string, string> }, values: string[]) {
  for (const assignment of values) {
    const match = /^tags\.([^=]+)=(.*)$/.exec(assignment)
    if (!match)
      throw new CliError(
        `The simulator supports --set tags.<key>=<value> only, not '${assignment}'.`,
      )
    target.tags[match[1]] = match[2]
  }
}

function rule(nsg: NetworkSecurityGroup, args: Args): NsgRule {
  const priority = Number(str(args, 'priority'))
  if (!Number.isInteger(priority) || priority < 100 || priority > 4096) {
    throw azureError(
      'SecurityRuleInvalidPriority',
      'Security rule has invalid Priority. Value provided: ' +
        str(args, 'priority') +
        ' Allowed range 100-4096.',
    )
  }
  const direction = (str(args, 'direction') ?? 'Inbound') as NsgRule['direction']
  const clash = nsg.rules.find(
    (existing) =>
      existing.priority === priority &&
      existing.direction === direction &&
      !same(existing.name, str(args, 'name') ?? ''),
  )
  if (clash) {
    throw azureError(
      'SecurityRuleConflict',
      `Security rule ${str(args, 'name')} conflicts with rule ${clash.name}. Rules cannot have the same Priority and Direction. To learn more, see aka.ms/nsgrules.`,
    )
  }
  return {
    name: str(args, 'name') as string,
    priority,
    direction,
    access: (str(args, 'access') ?? 'Allow') as NsgRule['access'],
    protocol: str(args, 'protocol') ?? '*',
    sourceAddressPrefix: list(args, 'source-address-prefixes').join(',') || '*',
    sourcePortRange: list(args, 'source-port-ranges').join(',') || '*',
    destinationAddressPrefix: list(args, 'destination-address-prefixes').join(',') || '*',
    destinationPortRanges:
      list(args, 'destination-port-ranges').length > 0
        ? list(args, 'destination-port-ranges')
        : ['80'],
  }
}

/** A stable, plausible public IP for a VM, from its name. */
const publicIpFor = (name: string) => {
  let hash = 0
  for (const ch of name) hash = (hash * 31 + ch.charCodeAt(0)) % 65_536
  return `20.${68 + (hash % 50)}.${Math.floor(hash / 256) % 256}.${(hash % 250) + 4}`
}

const ruleTable = (item: Record<string, unknown>) => ({
  Name: item.name,
  ResourceGroup: item.resourceGroup,
  Priority: item.priority,
  SourcePortRanges: item.sourcePortRange,
  SourceAddressPrefixes: item.sourceAddressPrefix,
  Access: item.access,
  Protocol: item.protocol,
  Direction: item.direction,
  DestinationPortRanges:
    item.destinationPortRange ?? (item.destinationPortRanges as string[]).join(' '),
})

/* ----------------------------------------------------------- commands */

const groupTable = (item: Record<string, unknown>) => ({
  Name: item.name,
  Location: item.location,
  Status: (item.properties as { provisioningState?: string } | undefined)?.provisioningState,
})

export const COMMANDS: CommandSpec[] = [
  /* account */
  {
    path: ['login'],
    summary: 'Log in to Azure. (The simulator is always signed in.)',
    params: [
      { name: '--use-device-code', flag: true },
      { name: '--tenant', aliases: ['-t'] },
      { name: '--identity', flag: true },
    ],
    run: () => [accountView()],
  },
  {
    path: ['account', 'show'],
    summary: 'Get the details of the current subscription.',
    params: [{ name: '--subscription', aliases: ['-s'] }],
    run: () => accountView(),
  },
  {
    path: ['account', 'list'],
    summary: 'Get a list of subscriptions for the logged in account.',
    params: [{ name: '--all', flag: true }],
    run: () => [accountView()],
    table: (item) => ({
      Name: item.name,
      CloudName: 'AzureCloud',
      SubscriptionId: item.id,
      TenantId: item.tenantId,
      State: item.state,
      IsDefault: item.isDefault,
    }),
  },
  {
    path: ['account', 'set'],
    summary: 'Set a subscription to be the current active subscription.',
    params: [{ name: '--subscription', aliases: ['-s', '--name', '-n'], required: true }],
    run: (args) => {
      const wanted = str(args, 'subscription') ?? ''
      if (!same(wanted, SUBSCRIPTION_ID) && !same(wanted, SUBSCRIPTION_NAME)) {
        throw new CliError(`The subscription of '${wanted}' doesn't exist in cloud 'AzureCloud'.`)
      }
      return undefined
    },
  },
  {
    path: ['account', 'list-locations'],
    summary: 'List supported regions for the current subscription.',
    params: [],
    run: () =>
      Object.entries(LOCATIONS).map(([name, displayName]) => ({
        displayName,
        id: `/subscriptions/${SUBSCRIPTION_ID}/locations/${name}`,
        name,
        regionalDisplayName: `(${displayName.includes('US') ? 'US' : displayName.includes('UK') ? 'Europe' : 'Asia Pacific'}) ${displayName}`,
      })),
    table: (item) => ({
      DisplayName: item.displayName,
      Name: item.name,
      RegionalDisplayName: item.regionalDisplayName,
    }),
  },
  {
    path: ['configure'],
    summary:
      'Manage Azure CLI configuration, such as default values (--defaults group=<rg> location=<region>).',
    params: [
      { name: '--defaults', aliases: ['-d'], multiple: true },
      { name: '--list-defaults', aliases: ['-l'], flag: true },
    ],
    run: (args, context) => {
      for (const pair of list(args, 'defaults')) {
        const [key, value] = pair.split('=')
        if (!['group', 'location'].includes(key))
          throw new CliError(
            `The simulator supports the defaults group and location, not '${key}'.`,
          )
        if (value) context.defaults[key] = value
        else delete context.defaults[key]
      }
      if (args['list-defaults'])
        return Object.entries(context.defaults).map(([name, value]) => ({
          name,
          source: '~/.azure/config',
          value,
        }))
      return undefined
    },
  },

  /* resource groups */
  {
    path: ['group', 'create'],
    summary: 'Create a new resource group.',
    params: [
      { ...NAME, aliases: ['-n', '--resource-group', '-g'] },
      { ...LOCATION, required: true },
      TAGS,
      { name: '--managed-by' },
    ],
    run: (args, context) => {
      const name = str(args, 'name') as string
      if (!/^[-\w._()]{1,90}$/.test(name) || name.endsWith('.')) {
        throw azureError(
          'InvalidResourceGroup',
          `The provided resource group name '${name}' has these invalid characters: '...'. The name can only be a letter, digit, '-', '.', '(', ')' or '_'.`,
        )
      }
      const existing = context.state.resourceGroups.find((rg) => same(rg.name, name))
      const loc = location(args, context)
      if (existing) {
        if (existing.location !== loc) {
          throw azureError(
            'InvalidResourceGroupLocation',
            `Invalid resource group location '${loc}'. The Resource group already exists in location '${existing.location}'.`,
          )
        }
        if (args.tags !== undefined) existing.tags = parseTags(list(args, 'tags'))
        return groupView(existing)
      }
      const rg = { name, location: loc, tags: parseTags(list(args, 'tags')) }
      context.state.resourceGroups.push(rg)
      return groupView(rg)
    },
  },
  {
    path: ['group', 'list'],
    summary: 'List resource groups.',
    params: [{ name: '--tag', help: 'A single tag in key[=value] format.' }],
    run: (args, context) => {
      const tag = str(args, 'tag')
      const [key, value] = tag ? tag.split('=') : []
      return context.state.resourceGroups
        .filter((rg) => !key || (key in rg.tags && (value === undefined || rg.tags[key] === value)))
        .map(groupView)
    },
    table: groupTable,
  },
  {
    path: ['group', 'show'],
    summary: 'Gets a resource group.',
    params: [{ ...NAME, aliases: ['-n', '--resource-group', '-g'] }],
    run: (args, context) => groupView(group(context, { 'resource-group': str(args, 'name') })),
    table: groupTable,
  },
  {
    path: ['group', 'exists'],
    summary: 'Check if a resource group exists.',
    params: [{ ...NAME, aliases: ['-n', '--resource-group', '-g'] }],
    run: (args, context) =>
      context.state.resourceGroups.some((rg) => same(rg.name, str(args, 'name') as string)),
  },
  {
    path: ['group', 'update'],
    summary:
      "Update a resource group's tags (--tags replaces them; --set tags.key=value adds one).",
    params: [
      { ...NAME, aliases: ['-n', '--resource-group', '-g'] },
      TAGS,
      { name: '--set', multiple: true },
    ],
    run: (args, context) => {
      const rg = group(context, { 'resource-group': str(args, 'name') })
      assertUnlocked(context, rg.name, 'write')
      if (args.tags !== undefined) rg.tags = parseTags(list(args, 'tags'))
      if (args.set !== undefined) applySet(rg, list(args, 'set'))
      return groupView(rg)
    },
  },
  {
    path: ['group', 'delete'],
    summary: 'Delete a resource group and everything in it.',
    params: [{ ...NAME, aliases: ['-n', '--resource-group', '-g'] }, YES, NO_WAIT],
    confirm: () => 'Are you sure you want to perform this operation? (y/n): ',
    run: (args, context) => {
      const rg = group(context, { 'resource-group': str(args, 'name') })
      assertUnlocked(context, rg.name, 'delete')
      const keep = <T extends { resourceGroup: string }>(items: T[]) =>
        items.filter((item) => !same(item.resourceGroup, rg.name))
      const { state } = context
      state.resourceGroups = state.resourceGroups.filter((candidate) => candidate !== rg)
      state.vnets = keep(state.vnets)
      state.nsgs = keep(state.nsgs)
      state.vms = keep(state.vms)
      state.storageAccounts = keep(state.storageAccounts)
      state.locks = keep(state.locks)
      return undefined
    },
  },

  /* resources and tags */
  {
    path: ['resource', 'list'],
    summary: 'List resources, optionally in one resource group or with a tag.',
    params: [
      { ...RG, required: false },
      { name: '--tag' },
      { name: '--resource-type' },
      { name: '--name', aliases: ['-n'] },
    ],
    run: (args, context) => {
      const rg = str(args, 'resource-group')
      if (rg) group(context, args)
      const tag = str(args, 'tag')
      const [key, value] = tag ? tag.split('=') : []
      const type = str(args, 'resource-type')
      return inGroup(allResources(context.state), rg).filter(
        (resource) =>
          (!key ||
            (resource.tags &&
              key in resource.tags &&
              (value === undefined || resource.tags[key] === value))) &&
          (!type || same(resource.type, type)) &&
          (!str(args, 'name') || same(resource.name, str(args, 'name') as string)),
      )
    },
    table: (item) => ({
      Name: item.name,
      ResourceGroup: item.resourceGroup,
      Location: item.location,
      Type: item.type,
    }),
  },

  /* locks */
  {
    path: ['lock', 'create'],
    summary: 'Create a lock (CanNotDelete or ReadOnly) on a resource group.',
    params: [
      NAME,
      {
        name: '--lock-type',
        aliases: ['-t'],
        required: true,
        choices: ['CanNotDelete', 'ReadOnly'],
      },
      { ...RG },
      { name: '--notes' },
    ],
    run: (args, context) => {
      const rg = group(context, args)
      const name = str(args, 'name') as string
      const lock = {
        name,
        resourceGroup: rg.name,
        level: str(args, 'lock-type') as 'CanNotDelete' | 'ReadOnly',
        notes: str(args, 'notes') ?? null,
      }
      context.state.locks = [
        ...context.state.locks.filter(
          (existing) => !(same(existing.name, name) && same(existing.resourceGroup, rg.name)),
        ),
        lock,
      ]
      return lockView(lock)
    },
  },
  {
    path: ['lock', 'list'],
    summary: 'List locks.',
    params: [{ ...RG, required: false }],
    run: (args, context) => inGroup(context.state.locks, str(args, 'resource-group')).map(lockView),
    table: (item) => ({
      Name: item.name,
      ResourceGroup: item.resourceGroup,
      Level: item.level,
      Notes: item.notes,
    }),
  },
  {
    path: ['lock', 'delete'],
    summary: 'Delete a lock.',
    params: [NAME, RG],
    run: (args, context) => {
      const rg = group(context, args)
      const name = str(args, 'name') as string
      const before = context.state.locks.length
      context.state.locks = context.state.locks.filter(
        (lock) => !(same(lock.name, name) && same(lock.resourceGroup, rg.name)),
      )
      if (context.state.locks.length === before)
        throw azureError('LockNotFound', `The lock '${name}' could not be found.`)
      return undefined
    },
  },

  /* virtual networks */
  {
    path: ['network', 'vnet', 'create'],
    summary: 'Create a virtual network, optionally with a first subnet.',
    params: [
      NAME,
      RG,
      LOCATION,
      { name: '--address-prefixes', aliases: ['--address-prefix'], multiple: true },
      { name: '--subnet-name' },
      { name: '--subnet-prefixes', aliases: ['--subnet-prefix'], multiple: true },
      TAGS,
    ],
    run: (args, context) => {
      const rg = group(context, args)
      assertUnlocked(context, rg.name, 'write')
      const name = str(args, 'name') as string
      if (
        context.state.vnets.some(
          (vnet) => same(vnet.resourceGroup, rg.name) && same(vnet.name, name),
        )
      ) {
        throw azureError(
          'InUseVirtualNetwork',
          `A virtual network named '${name}' already exists in resource group '${rg.name}'.`,
        )
      }
      const prefixes =
        list(args, 'address-prefixes').length > 0 ? list(args, 'address-prefixes') : ['10.0.0.0/16']
      prefixes.forEach(parseCidr)
      const vnet: VirtualNetwork = {
        name,
        resourceGroup: rg.name,
        location: location(args, context, rg.location),
        addressPrefixes: prefixes,
        subnets: [],
        tags: parseTags(list(args, 'tags')),
      }
      const subnetName = str(args, 'subnet-name')
      if (subnetName) {
        const subnetPrefix =
          list(args, 'subnet-prefixes')[0] ?? prefixes[0].replace(/\/\d+$/, '/24')
        if (!prefixes.some((prefix) => within(subnetPrefix, prefix))) {
          throw azureError(
            'NetcfgInvalidSubnet',
            `Subnet '${subnetName}' is not valid in virtual network '${name}'.`,
          )
        }
        vnet.subnets.push({ name: subnetName, addressPrefix: subnetPrefix, nsg: null })
      }
      context.state.vnets.push(vnet)
      return { newVNet: vnetView(vnet) }
    },
  },
  {
    path: ['network', 'vnet', 'list'],
    summary: 'List virtual networks.',
    params: [{ ...RG, required: false }],
    run: (args, context) => inGroup(context.state.vnets, str(args, 'resource-group')).map(vnetView),
    table: (item) => ({
      Name: item.name,
      ResourceGroup: item.resourceGroup,
      Location: item.location,
      NumSubnets: (item.subnets as unknown[]).length,
      Prefixes: (item.addressSpace as { addressPrefixes: string[] }).addressPrefixes.join(', '),
    }),
  },
  {
    path: ['network', 'vnet', 'show'],
    summary: 'Get the details of a virtual network.',
    params: [NAME, RG],
    run: (args, context) =>
      vnetView(findVnet(context, group(context, args).name, str(args, 'name') as string)),
  },
  {
    path: ['network', 'vnet', 'delete'],
    summary: 'Delete a virtual network.',
    params: [NAME, RG, NO_WAIT],
    run: (args, context) => {
      const rg = group(context, args)
      assertUnlocked(context, rg.name, 'delete')
      const vnet = findVnet(context, rg.name, str(args, 'name') as string)
      if (
        context.state.vms.some((vm) => same(vm.vnet, vnet.name) && same(vm.resourceGroup, rg.name))
      ) {
        throw azureError(
          'InUseSubnetCannotBeDeleted',
          `Subnet in virtual network ${vnet.name} is in use by a network interface and cannot be deleted.`,
        )
      }
      context.state.vnets = context.state.vnets.filter((candidate) => candidate !== vnet)
      return undefined
    },
  },
  {
    path: ['network', 'vnet', 'subnet', 'create'],
    summary: 'Create a subnet in a virtual network.',
    params: [
      NAME,
      RG,
      { name: '--vnet-name', required: true },
      { name: '--address-prefixes', aliases: ['--address-prefix'], multiple: true, required: true },
      { name: '--network-security-group', aliases: ['--nsg'] },
    ],
    run: (args, context) => {
      const rg = group(context, args)
      assertUnlocked(context, rg.name, 'write')
      const vnet = findVnet(context, rg.name, str(args, 'vnet-name') as string)
      const name = str(args, 'name') as string
      const prefix = list(args, 'address-prefixes')[0]
      parseCidr(prefix)
      if (vnet.subnets.some((subnet) => same(subnet.name, name))) {
        throw azureError(
          'InUseSubnetCannotBeUpdated',
          `Subnet '${name}' already exists in virtual network '${vnet.name}'.`,
        )
      }
      if (!vnet.addressPrefixes.some((space) => within(prefix, space))) {
        throw azureError(
          'NetcfgSubnetRangeOutsideVnet',
          `Subnet '${name}' is not valid because its IP address range is outside the IP address range of virtual network '${vnet.name}'.`,
        )
      }
      const clash = vnet.subnets.find((subnet) => overlap(subnet.addressPrefix, prefix))
      if (clash) {
        throw azureError(
          'NetcfgSubnetRangesOverlap',
          `Subnet '${name}' is not valid because its IP address range overlaps with that of an existing subnet '${clash.name}' in virtual network '${vnet.name}'.`,
        )
      }
      const nsg = str(args, 'network-security-group')
      if (nsg) findNsg(context, rg.name, nsg)
      const subnet = { name, addressPrefix: prefix, nsg: nsg ?? null }
      vnet.subnets.push(subnet)
      return subnetView(vnet, subnet)
    },
  },
  {
    path: ['network', 'vnet', 'subnet', 'list'],
    summary: 'List the subnets in a virtual network.',
    params: [RG, { name: '--vnet-name', required: true }],
    run: (args, context) => {
      const vnet = findVnet(context, group(context, args).name, str(args, 'vnet-name') as string)
      return vnet.subnets.map((subnet) => subnetView(vnet, subnet))
    },
    table: (item) => ({
      Name: item.name,
      AddressPrefix: item.addressPrefix,
      ResourceGroup: item.resourceGroup,
      NSG: (item.networkSecurityGroup as { id: string } | null)?.id.split('/').pop() ?? '',
    }),
  },
  {
    path: ['network', 'vnet', 'subnet', 'update'],
    summary: 'Update a subnet - for example, associate a network security group with --nsg.',
    params: [
      NAME,
      RG,
      { name: '--vnet-name', required: true },
      { name: '--network-security-group', aliases: ['--nsg'] },
    ],
    run: (args, context) => {
      const rg = group(context, args)
      assertUnlocked(context, rg.name, 'write')
      const vnet = findVnet(context, rg.name, str(args, 'vnet-name') as string)
      const subnet = vnet.subnets.find((candidate) =>
        same(candidate.name, str(args, 'name') as string),
      )
      if (!subnet)
        throw azureError(
          'NotFound',
          `Resource '${str(args, 'name')}' not found in virtual network '${vnet.name}'.`,
        )
      const nsg = str(args, 'network-security-group')
      if (nsg !== undefined) {
        if (nsg && nsg !== '""') subnet.nsg = findNsg(context, rg.name, nsg).name
        else subnet.nsg = null
      }
      return subnetView(vnet, subnet)
    },
  },

  /* network security groups */
  {
    path: ['network', 'nsg', 'create'],
    summary: 'Create a network security group.',
    params: [NAME, RG, LOCATION, TAGS],
    run: (args, context) => {
      const rg = group(context, args)
      assertUnlocked(context, rg.name, 'write')
      const name = str(args, 'name') as string
      const existing = context.state.nsgs.find(
        (nsg) => same(nsg.resourceGroup, rg.name) && same(nsg.name, name),
      )
      if (existing) return { NewNSG: nsgView(context.state, existing) }
      const nsg: NetworkSecurityGroup = {
        name,
        resourceGroup: rg.name,
        location: location(args, context, rg.location),
        rules: [],
        tags: parseTags(list(args, 'tags')),
      }
      context.state.nsgs.push(nsg)
      return { NewNSG: nsgView(context.state, nsg) }
    },
  },
  {
    path: ['network', 'nsg', 'list'],
    summary: 'List network security groups.',
    params: [{ ...RG, required: false }],
    run: (args, context) =>
      inGroup(context.state.nsgs, str(args, 'resource-group')).map((nsg) =>
        nsgView(context.state, nsg),
      ),
  },
  {
    path: ['network', 'nsg', 'show'],
    summary: 'Get information about a network security group.',
    params: [NAME, RG],
    run: (args, context) =>
      nsgView(
        context.state,
        findNsg(context, group(context, args).name, str(args, 'name') as string),
      ),
  },
  {
    path: ['network', 'nsg', 'delete'],
    summary: 'Delete a network security group.',
    params: [NAME, RG, NO_WAIT],
    run: (args, context) => {
      const rg = group(context, args)
      assertUnlocked(context, rg.name, 'delete')
      const nsg = findNsg(context, rg.name, str(args, 'name') as string)
      if (
        context.state.vnets.some((vnet) => vnet.subnets.some((subnet) => subnet.nsg === nsg.name))
      ) {
        throw azureError(
          'InUseNetworkSecurityGroupCannotBeDeleted',
          `Network security group ${nsgId(rg.name, nsg.name)} cannot be deleted because it is in use by subnet(s).`,
        )
      }
      context.state.nsgs = context.state.nsgs.filter((candidate) => candidate !== nsg)
      return undefined
    },
  },
  {
    path: ['network', 'nsg', 'rule', 'create'],
    summary: 'Create a network security group rule.',
    params: [
      NAME,
      RG,
      { name: '--nsg-name', required: true },
      {
        name: '--priority',
        required: true,
        help: '100 (highest) to 4096 (lowest). Must be unique per direction.',
      },
      { name: '--direction', choices: ['Inbound', 'Outbound'] },
      { name: '--access', choices: ['Allow', 'Deny'] },
      { name: '--protocol', choices: ['*', 'Tcp', 'Udp', 'Icmp', 'Esp', 'Ah'] },
      { name: '--source-address-prefixes', multiple: true },
      { name: '--source-port-ranges', multiple: true },
      { name: '--destination-address-prefixes', multiple: true },
      { name: '--destination-port-ranges', multiple: true, help: 'Defaults to 80.' },
      { name: '--description' },
    ],
    run: (args, context) => {
      const rg = group(context, args)
      assertUnlocked(context, rg.name, 'write')
      const nsg = findNsg(context, rg.name, str(args, 'nsg-name') as string)
      const created = rule(nsg, args)
      nsg.rules = [...nsg.rules.filter((existing) => !same(existing.name, created.name)), created]
      return ruleView(nsg, created)
    },
    table: ruleTable,
  },
  {
    path: ['network', 'nsg', 'rule', 'list'],
    summary: 'List the rules in a network security group.',
    params: [RG, { name: '--nsg-name', required: true }],
    run: (args, context) => {
      const nsg = findNsg(context, group(context, args).name, str(args, 'nsg-name') as string)
      return nsg.rules.map((item) => ruleView(nsg, item))
    },
    table: ruleTable,
  },
  {
    path: ['network', 'nsg', 'rule', 'delete'],
    summary: 'Delete a network security group rule.',
    params: [NAME, RG, { name: '--nsg-name', required: true }],
    run: (args, context) => {
      const rg = group(context, args)
      assertUnlocked(context, rg.name, 'write')
      const nsg = findNsg(context, rg.name, str(args, 'nsg-name') as string)
      nsg.rules = nsg.rules.filter((existing) => !same(existing.name, str(args, 'name') as string))
      return undefined
    },
  },

  /* virtual machines */
  {
    path: ['vm', 'create'],
    summary:
      'Create a virtual machine (and, unless you name existing ones, a VNet, NSG and public IP for it).',
    params: [
      NAME,
      RG,
      { name: '--image', required: true, choices: Object.keys(IMAGES) },
      { name: '--size', help: 'Defaults to Standard_DS1_v2.' },
      LOCATION,
      { name: '--admin-username' },
      { name: '--admin-password' },
      { name: '--generate-ssh-keys', flag: true },
      { name: '--ssh-key-values', multiple: true },
      { name: '--authentication-type', choices: ['ssh', 'password', 'all'] },
      { name: '--vnet-name' },
      { name: '--subnet' },
      { name: '--nsg' },
      { name: '--public-ip-address' },
      { name: '--public-ip-sku', choices: ['Basic', 'Standard'] },
      { name: '--zone', aliases: ['-z'] },
      TAGS,
      NO_WAIT,
    ],
    run: (args, context) => {
      const rg = group(context, args)
      assertUnlocked(context, rg.name, 'write')
      const name = str(args, 'name') as string
      if (context.state.vms.some((vm) => same(vm.resourceGroup, rg.name) && same(vm.name, name))) {
        throw azureError(
          'Conflict',
          `A virtual machine named '${name}' already exists in resource group '${rg.name}'.`,
        )
      }
      const image = IMAGES[str(args, 'image') as string]
      const size = str(args, 'size') ?? 'Standard_DS1_v2'
      if (!SIZES.includes(size)) {
        throw azureError(
          'InvalidParameter',
          `The value ${size} provided for the VM size is not valid. The simulator knows: ${SIZES.join(', ')}.`,
        )
      }
      if (image.os === 'Windows' && !str(args, 'admin-password')) {
        throw new CliError(
          'usage error: --admin-password is required for Windows VMs (the simulator cannot prompt for it).',
        )
      }
      if (
        image.os === 'Linux' &&
        !args['generate-ssh-keys'] &&
        !str(args, 'admin-password') &&
        list(args, 'ssh-key-values').length === 0
      ) {
        throw new CliError(
          'An RSA key file or key value must be supplied to SSH Key Value. You can use --generate-ssh-keys to let CLI generate one for you',
        )
      }
      const loc = location(args, context, rg.location)

      // Like the real command: networking is created for you unless you say otherwise.
      let vnetName = str(args, 'vnet-name')
      let subnetName = str(args, 'subnet')
      if (!vnetName) {
        vnetName = `${name}VNET`
        subnetName = `${name}Subnet`
        if (
          !context.state.vnets.some(
            (vnet) => same(vnet.name, vnetName as string) && same(vnet.resourceGroup, rg.name),
          )
        ) {
          context.state.vnets.push({
            name: vnetName,
            resourceGroup: rg.name,
            location: loc,
            addressPrefixes: ['10.0.0.0/16'],
            subnets: [{ name: subnetName, addressPrefix: '10.0.0.0/24', nsg: null }],
            tags: {},
          })
        }
      }
      const vnet = findVnet(context, rg.name, vnetName)
      if (!subnetName) {
        if (vnet.subnets.length !== 1)
          throw new CliError(
            `usage error: --subnet is required when the virtual network '${vnet.name}' has ${vnet.subnets.length === 0 ? 'no' : 'several'} subnets.`,
          )
        subnetName = vnet.subnets[0].name
      }
      const subnet = vnet.subnets.find((candidate) => same(candidate.name, subnetName as string))
      if (!subnet)
        throw azureError(
          'NotFound',
          `Subnet '${subnetName}' was not found in virtual network '${vnet.name}'.`,
        )

      const nsgName = str(args, 'nsg')
      if (nsgName === undefined) {
        const created = `${name}NSG`
        if (
          !context.state.nsgs.some(
            (nsg) => same(nsg.name, created) && same(nsg.resourceGroup, rg.name),
          )
        ) {
          const port = image.os === 'Windows' ? '3389' : '22'
          context.state.nsgs.push({
            name: created,
            resourceGroup: rg.name,
            location: loc,
            rules: [
              {
                name: image.os === 'Windows' ? 'rdp' : 'default-allow-ssh',
                priority: 1000,
                direction: 'Inbound',
                access: 'Allow',
                protocol: 'Tcp',
                sourceAddressPrefix: '*',
                sourcePortRange: '*',
                destinationAddressPrefix: '*',
                destinationPortRanges: [port],
              },
            ],
            tags: {},
          })
        }
      }
      const inSubnet = context.state.vms.filter(
        (vm) => same(vm.vnet, vnet.name) && same(vm.subnet, subnet.name),
      ).length
      const base = parseCidr(subnet.addressPrefix).start
      const publicIp =
        str(args, 'public-ip-address') === '' || str(args, 'public-ip-address') === '""'
          ? null
          : publicIpFor(name)
      const vm: VirtualMachine = {
        name,
        resourceGroup: rg.name,
        location: loc,
        size,
        image: str(args, 'image') as string,
        osType: image.os,
        adminUsername: str(args, 'admin-username') ?? 'azureuser',
        powerState: 'VM running',
        vnet: vnet.name,
        subnet: subnet.name,
        privateIp: toIp(base + 4 + inSubnet),
        publicIp,
        tags: parseTags(list(args, 'tags')),
      }
      context.state.vms.push(vm)
      return {
        fqdns: '',
        id: vmView(vm, false).id,
        location: vm.location,
        macAddress:
          '00-0D-3A-' +
          publicIpFor(name)
            .split('.')
            .slice(1)
            .map((n) => Number(n).toString(16).padStart(2, '0').toUpperCase())
            .join('-'),
        powerState: vm.powerState,
        privateIpAddress: vm.privateIp,
        publicIpAddress: vm.publicIp ?? '',
        resourceGroup: vm.resourceGroup,
        zones: str(args, 'zone') ?? '',
      }
    },
  },
  {
    path: ['vm', 'list'],
    summary: 'List virtual machines. Add -d (--show-details) for power state and IPs.',
    params: [
      { ...RG, required: false },
      { name: '--show-details', aliases: ['-d'], flag: true },
    ],
    run: (args, context) =>
      inGroup(context.state.vms, str(args, 'resource-group')).map((vm) =>
        vmView(vm, args['show-details'] === true),
      ),
    table: (item) => ({
      Name: item.name,
      ResourceGroup: item.resourceGroup,
      Location: item.location,
      ...(item.powerState ? { PowerState: item.powerState, PublicIps: item.publicIps } : {}),
    }),
  },
  {
    path: ['vm', 'show'],
    summary: 'Get the details of a VM. Add -d for power state and IPs.',
    params: [NAME, RG, { name: '--show-details', aliases: ['-d'], flag: true }],
    run: (args, context) =>
      vmView(
        findVm(context, group(context, args).name, str(args, 'name') as string),
        args['show-details'] === true,
      ),
  },
  ...(['start', 'stop', 'deallocate', 'restart'] as const).map((action): CommandSpec => ({
    path: ['vm', action],
    summary: {
      start: 'Start a stopped VM.',
      stop: 'Power off (stop) a VM. It keeps its compute allocation - and you keep paying for it. Use deallocate to stop paying.',
      deallocate:
        'Deallocate a VM: shut it down and release the compute, so it stops costing money.',
      restart: 'Restart a VM.',
    }[action],
    params: [
      NAME,
      RG,
      NO_WAIT,
      ...(action === 'stop' ? [{ name: '--skip-shutdown', flag: true }] : []),
    ],
    run: (args, context) => {
      const rg = group(context, args)
      assertUnlocked(context, rg.name, 'write')
      const vm = findVm(context, rg.name, str(args, 'name') as string)
      vm.powerState =
        action === 'stop' ? 'VM stopped' : action === 'deallocate' ? 'VM deallocated' : 'VM running'
      return undefined
    },
  })),
  {
    path: ['vm', 'resize'],
    summary: 'Change the size of a VM.',
    params: [NAME, RG, { name: '--size', required: true }],
    run: (args, context) => {
      const rg = group(context, args)
      assertUnlocked(context, rg.name, 'write')
      const vm = findVm(context, rg.name, str(args, 'name') as string)
      const size = str(args, 'size') as string
      if (!SIZES.includes(size))
        throw azureError(
          'InvalidParameter',
          `The value ${size} provided for the VM size is not valid.`,
        )
      vm.size = size
      return vmView(vm, false)
    },
  },
  {
    path: ['vm', 'list-sizes'],
    summary: 'List the VM sizes available in a region.',
    params: [{ ...LOCATION, required: true }],
    run: () =>
      SIZES.map((name) => ({
        maxDataDiskCount: name.includes('B1') ? 2 : 4,
        memoryInMb: name.includes('B1s')
          ? 1024
          : name.includes('E2')
            ? 16384
            : name.includes('4s')
              ? 16384
              : 8192,
        name,
        numberOfCores: name.includes('4s')
          ? 4
          : name.includes('B1') || name === 'Standard_DS1_v2'
            ? 1
            : 2,
      })),
  },
  {
    path: ['vm', 'open-port'],
    summary: "Open a port to inbound traffic, by adding a rule to the VM's NSG.",
    params: [NAME, RG, { name: '--port', required: true }, { name: '--priority' }],
    run: (args, context) => {
      const rg = group(context, args)
      const vm = findVm(context, rg.name, str(args, 'name') as string)
      const nsg = context.state.nsgs.find(
        (candidate) =>
          same(candidate.name, `${vm.name}NSG`) && same(candidate.resourceGroup, rg.name),
      )
      if (!nsg) throw new CliError(`No network security group found for VM '${vm.name}'.`)
      const created = rule(nsg, {
        name: `open-port-${str(args, 'port')}`,
        priority: str(args, 'priority') ?? '900',
        'destination-port-ranges': [str(args, 'port') as string],
        protocol: '*',
      })
      nsg.rules.push(created)
      return nsgView(context.state, nsg)
    },
  },
  {
    path: ['vm', 'delete'],
    summary: 'Delete a VM (its disks, NIC and networking stay unless you delete them).',
    params: [NAME, RG, YES, NO_WAIT],
    confirm: () => 'Are you sure you want to perform this operation? (y/n): ',
    run: (args, context) => {
      const rg = group(context, args)
      assertUnlocked(context, rg.name, 'delete')
      const vm = findVm(context, rg.name, str(args, 'name') as string)
      context.state.vms = context.state.vms.filter((candidate) => candidate !== vm)
      return undefined
    },
  },

  /* storage */
  {
    path: ['storage', 'account', 'create'],
    summary: 'Create a storage account.',
    params: [
      NAME,
      RG,
      LOCATION,
      { name: '--sku', choices: SKUS, help: 'Defaults to Standard_RAGRS.' },
      { name: '--kind', choices: KINDS, help: 'Defaults to StorageV2.' },
      { name: '--min-tls-version', choices: TLS },
      { name: '--https-only' },
      { name: '--allow-blob-public-access' },
      { name: '--access-tier', choices: ['Hot', 'Cool', 'Cold'] },
      TAGS,
    ],
    run: (args, context) => {
      const rg = group(context, args)
      assertUnlocked(context, rg.name, 'write')
      const name = str(args, 'name') as string
      if (!/^[a-z0-9]{3,24}$/.test(name)) {
        throw azureError(
          'AccountNameInvalid',
          `${name} is not a valid storage account name. Storage account name must be between 3 and 24 characters in length and use numbers and lower-case letters only.`,
        )
      }
      const taken = context.state.storageAccounts.find((account) => account.name === name)
      if (taken && !same(taken.resourceGroup, rg.name)) {
        throw azureError(
          'StorageAccountAlreadyTaken',
          `The storage account named ${name} is already taken.`,
        )
      }
      const account: StorageAccount = {
        name,
        resourceGroup: rg.name,
        location: location(args, context, rg.location),
        sku: str(args, 'sku') ?? 'Standard_RAGRS',
        kind: str(args, 'kind') ?? 'StorageV2',
        minimumTlsVersion: str(args, 'min-tls-version') ?? 'TLS1_2',
        enableHttpsTrafficOnly: bool(args, 'https-only', true),
        allowBlobPublicAccess: bool(args, 'allow-blob-public-access', false),
        tags: parseTags(list(args, 'tags')),
      }
      context.state.storageAccounts = [
        ...context.state.storageAccounts.filter((existing) => existing !== taken),
        account,
      ]
      return storageView(account)
    },
  },
  {
    path: ['storage', 'account', 'list'],
    summary: 'List storage accounts.',
    params: [{ ...RG, required: false }],
    run: (args, context) =>
      inGroup(context.state.storageAccounts, str(args, 'resource-group')).map(storageView),
    table: (item) => ({
      Name: item.name,
      ResourceGroup: item.resourceGroup,
      Location: item.location,
      Kind: item.kind,
      Sku: (item.sku as { name: string }).name,
      MinTls: item.minimumTlsVersion,
      PublicBlobAccess: item.allowBlobPublicAccess,
    }),
  },
  {
    path: ['storage', 'account', 'show'],
    summary: 'Show storage account properties.',
    params: [NAME, { ...RG, required: false }],
    run: (args, context) =>
      storageView(findStorage(context, str(args, 'resource-group'), str(args, 'name') as string)),
  },
  {
    path: ['storage', 'account', 'update'],
    summary: 'Update the properties of a storage account.',
    params: [
      NAME,
      { ...RG, required: false },
      { name: '--sku', choices: SKUS },
      { name: '--min-tls-version', choices: TLS },
      { name: '--https-only' },
      { name: '--allow-blob-public-access' },
      { name: '--access-tier', choices: ['Hot', 'Cool', 'Cold'] },
      TAGS,
      { name: '--set', multiple: true },
    ],
    run: (args, context) => {
      const account = findStorage(context, str(args, 'resource-group'), str(args, 'name') as string)
      assertUnlocked(context, account.resourceGroup, 'write')
      if (str(args, 'sku')) account.sku = str(args, 'sku') as string
      if (str(args, 'min-tls-version'))
        account.minimumTlsVersion = str(args, 'min-tls-version') as string
      if (args['https-only'] !== undefined)
        account.enableHttpsTrafficOnly = bool(args, 'https-only', account.enableHttpsTrafficOnly)
      if (args['allow-blob-public-access'] !== undefined)
        account.allowBlobPublicAccess = bool(
          args,
          'allow-blob-public-access',
          account.allowBlobPublicAccess,
        )
      if (args.tags !== undefined) account.tags = parseTags(list(args, 'tags'))
      if (args.set !== undefined) applySet(account, list(args, 'set'))
      return storageView(account)
    },
  },
  {
    path: ['storage', 'account', 'delete'],
    summary: 'Delete a storage account.',
    params: [NAME, { ...RG, required: false }, YES],
    confirm: (args) =>
      `The storage account '${str(args, 'name')}' and all its contents will be removed. Are you sure you want to perform this operation? (y/n): `,
    run: (args, context) => {
      const account = findStorage(context, str(args, 'resource-group'), str(args, 'name') as string)
      assertUnlocked(context, account.resourceGroup, 'delete')
      context.state.storageAccounts = context.state.storageAccounts.filter(
        (candidate) => candidate !== account,
      )
      return undefined
    },
  },
]

function accountView() {
  return {
    environmentName: 'AzureCloud',
    homeTenantId: TENANT_ID,
    id: SUBSCRIPTION_ID,
    isDefault: true,
    managedByTenants: [],
    name: SUBSCRIPTION_NAME,
    state: 'Enabled',
    tenantId: TENANT_ID,
    user: { name: USER, type: 'user' },
  }
}

export const IMAGE_ALIASES = Object.keys(IMAGES)
export const VM_SIZES = SIZES
