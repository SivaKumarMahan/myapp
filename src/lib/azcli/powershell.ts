import type { Args } from './commands'
import { CliError, similar } from './errors'
import type { OutputLine, Session, ShellResult } from './shell'
import { LOCATIONS, SUBSCRIPTION_ID, SUBSCRIPTION_NAME, TENANT_ID, USER } from './state'

/**
 * PowerShell (Az module) mode: the same simulated cloud, driven by the Az
 * cmdlets the course notes mention. Each cmdlet maps onto the az command that
 * does the same thing, so both modes always agree about what exists.
 *
 * Supported PowerShell: `-Param value`, `-Switch`, `-Switch:$false`, `$true`
 * and `$false`, `@{ key = 'value' }` hashtables, `$name = <cmdlet>` variables
 * holding objects, and pipelines into Set-AzVirtualNetwork,
 * Set-AzNetworkSecurityGroup, Format-Table, Format-List, Select-Object and
 * ConvertTo-Json.
 */

type PsValue = string | boolean | number | Record<string, string> | PsObject | PsObject[] | null
interface PsObject {
  __type: string
  [key: string]: unknown
}

interface PsSession extends Session {
  psVars?: Record<string, PsValue>
}

interface CmdletParam {
  name: string
  required?: boolean
  switch?: boolean
  aliases?: string[]
}

interface Cmdlet {
  name: string
  summary: string
  params: CmdletParam[]
  run: (params: Record<string, PsValue>, session: PsSession, input: PsValue) => PsValue | undefined
  /** The default display, as Az's format files choose it. */
  view?: 'list' | 'table'
  confirm?: (params: Record<string, PsValue>) => string | null
}

const err = (text: string): OutputLine => ({ text, kind: 'err' })
const out = (text: string): OutputLine => ({ text, kind: 'out' })
const info = (text: string): OutputLine => ({ text, kind: 'info' })

/* ------------------------------------------------------------- az bridge */

function az(session: Session, path: string, args: Args): unknown {
  const spec = session.catalog.commands.get(path)
  if (!spec?.run) throw new CliError(`internal: az ${path} is not modelled`)
  return spec.run(args, session)
}

const text = (value: PsValue | undefined) =>
  value === undefined || value === null ? undefined : String(value)
const hashToTags = (value: PsValue | undefined) =>
  value && typeof value === 'object' && !Array.isArray(value) && !('__type' in value)
    ? Object.entries(value as Record<string, string>).map(([key, item]) => `${key}=${item}`)
    : undefined
const tagsText = (tags: unknown) =>
  tags && typeof tags === 'object'
    ? Object.entries(tags as Record<string, string>)
        .map(([k, v]) => `${k}=${v}`)
        .join('; ')
    : ''

/* --------------------------------------------------------- object shapes */

type Json = Record<string, unknown>
const asGroup = (rg: Json): PsObject => ({
  __type: 'PSResourceGroup',
  ResourceGroupName: rg.name,
  Location: rg.location,
  ProvisioningState: 'Succeeded',
  Tags: tagsText(rg.tags),
  ResourceId: rg.id,
})
const asVnet = (vnet: Json): PsObject => ({
  __type: 'PSVirtualNetwork',
  Name: vnet.name,
  ResourceGroupName: vnet.resourceGroup,
  Location: vnet.location,
  AddressSpace: (vnet.addressSpace as { addressPrefixes: string[] }).addressPrefixes.join(', '),
  Subnets: (vnet.subnets as Json[])
    .map((subnet) => `${subnet.name} (${subnet.addressPrefix})`)
    .join(', '),
  ProvisioningState: 'Succeeded',
  Id: vnet.id,
  __pendingSubnets: [] as { name: string; prefix: string }[],
})
const asNsg = (nsg: Json): PsObject => ({
  __type: 'PSNetworkSecurityGroup',
  Name: nsg.name,
  ResourceGroupName: nsg.resourceGroup,
  Location: nsg.location,
  SecurityRules: (nsg.securityRules as Json[])
    .map(
      (rule) =>
        `${rule.name} (${rule.priority} ${rule.direction} ${rule.access} ${rule.destinationPortRange ?? (rule.destinationPortRanges as string[]).join(',')})`,
    )
    .join(', '),
  ProvisioningState: 'Succeeded',
  Id: nsg.id,
  __pendingRules: [] as Args[],
})
const asStorage = (account: Json): PsObject => ({
  __type: 'PSStorageAccount',
  StorageAccountName: account.name,
  ResourceGroupName: account.resourceGroup,
  PrimaryLocation: account.location,
  SkuName: (account.sku as { name: string }).name,
  Kind: account.kind,
  AccessTier: account.accessTier,
  MinimumTlsVersion: account.minimumTlsVersion,
  AllowBlobPublicAccess: account.allowBlobPublicAccess,
  EnableHttpsTrafficOnly: account.enableHttpsTrafficOnly,
  ProvisioningState: 'Succeeded',
})
const asVm = (vm: Json, status: boolean): PsObject => ({
  __type: 'PSVirtualMachine',
  ResourceGroupName: vm.resourceGroup,
  Name: vm.name,
  Location: vm.location,
  VmSize: (vm.hardwareProfile as { vmSize: string }).vmSize,
  OsType: (vm.storageProfile as { osDisk: { osType: string } }).osDisk.osType,
  ...(status ? { PowerState: vm.powerState } : {}),
  ProvisioningState: 'Succeeded',
})
const asLock = (lock: Json): PsObject => ({
  __type: 'PSResourceLock',
  Name: lock.name,
  ResourceGroupName: lock.resourceGroup,
  Properties: `@{level=${lock.level}${lock.notes ? `; notes=${lock.notes}` : ''}}`,
  LockId: lock.id,
})
const asResource = (resource: Json): PsObject => ({
  __type: 'PSResource',
  Name: resource.name,
  ResourceGroupName: resource.resourceGroup,
  ResourceType: resource.type,
  Location: resource.location,
  ResourceId: resource.id,
})

const context = (): PsObject => ({
  __type: 'PSAzureContext',
  Name: `${SUBSCRIPTION_NAME} (${SUBSCRIPTION_ID}) - ${USER}`,
  Account: USER,
  SubscriptionName: SUBSCRIPTION_NAME,
  Environment: 'AzureCloud',
  TenantId: TENANT_ID,
})

/* ---------------------------------------------------------------- cmdlets */

const RGN: CmdletParam = { name: 'ResourceGroupName', required: true }
const NAME: CmdletParam = { name: 'Name', required: true }
const LOC: CmdletParam = { name: 'Location' }
const FORCE: CmdletParam = { name: 'Force', switch: true }

const many = (value: unknown) => (Array.isArray(value) ? value : [value]) as Json[]

const CMDLETS: Cmdlet[] = [
  {
    name: 'Connect-AzAccount',
    summary: 'Sign in (the simulator is always signed in).',
    params: [{ name: 'UseDeviceAuthentication', switch: true }, { name: 'Tenant' }],
    view: 'table',
    run: () => context(),
  },
  {
    name: 'Get-AzContext',
    summary: 'The current account and subscription.',
    params: [],
    view: 'table',
    run: () => context(),
  },
  {
    name: 'Get-AzSubscription',
    summary: 'List subscriptions.',
    params: [],
    view: 'table',
    run: () => ({
      __type: 'PSAzureSubscription',
      Name: SUBSCRIPTION_NAME,
      Id: SUBSCRIPTION_ID,
      TenantId: TENANT_ID,
      State: 'Enabled',
    }),
  },
  {
    name: 'Set-AzContext',
    summary: 'Select a subscription.',
    params: [{ name: 'Subscription', required: true }],
    view: 'table',
    run: (p, s) => (az(s, 'account set', { subscription: text(p.Subscription) }), context()),
  },
  {
    name: 'Get-AzLocation',
    summary: 'List regions.',
    params: [],
    view: 'table',
    run: () =>
      Object.entries(LOCATIONS).map(([Location, DisplayName]) => ({
        __type: 'PSResourceProviderLocation',
        Location,
        DisplayName,
      })),
  },
  {
    name: 'New-AzResourceGroup',
    summary: 'Create a resource group.',
    params: [NAME, { ...LOC, required: true }, { name: 'Tag' }, FORCE],
    view: 'list',
    run: (p, s) =>
      asGroup(
        az(s, 'group create', {
          name: text(p.Name),
          location: text(p.Location),
          tags: hashToTags(p.Tag),
        }) as Json,
      ),
  },
  {
    name: 'Get-AzResourceGroup',
    summary: 'Get resource groups (all, or one with -Name).',
    params: [{ name: 'Name' }, { name: 'Location' }],
    view: 'list',
    run: (p, s) => {
      if (p.Name) return asGroup(az(s, 'group show', { name: text(p.Name) }) as Json)
      return many(az(s, 'group list', {}))
        .filter((rg) => !p.Location || rg.location === text(p.Location))
        .map(asGroup)
    },
  },
  {
    name: 'Set-AzResourceGroup',
    summary: "Replace a resource group's tags.",
    params: [NAME, { name: 'Tag', required: true }],
    view: 'list',
    run: (p, s) =>
      asGroup(az(s, 'group update', { name: text(p.Name), tags: hashToTags(p.Tag) ?? [] }) as Json),
  },
  {
    name: 'Remove-AzResourceGroup',
    summary: 'Delete a resource group and everything in it.',
    params: [NAME, FORCE],
    confirm: (p) =>
      p.Force
        ? null
        : `Are you sure you want to remove resource group '${text(p.Name)}'\n[Y] Yes  [N] No (default is "N"): `,
    run: (p, s) => (az(s, 'group delete', { name: text(p.Name), yes: true }), true),
  },
  {
    name: 'Update-AzTag',
    summary: 'Merge or replace the tags on a resource group (by -ResourceId).',
    params: [
      { name: 'ResourceId', required: true },
      { name: 'Tag', required: true },
      { name: 'Operation', required: true },
    ],
    view: 'list',
    run: (p, s) => {
      const name = /\/resourceGroups\/([^/]+)$/i.exec(text(p.ResourceId) ?? '')?.[1]
      if (!name)
        throw new CliError(
          'Update-AzTag: the simulator supports resource group IDs (/subscriptions/.../resourceGroups/<name>).',
        )
      const current = (az(s, 'group show', { name }) as Json).tags as Record<string, string> | null
      const incoming = Object.fromEntries((hashToTags(p.Tag) ?? []).map((pair) => pair.split('=')))
      const operation = text(p.Operation)?.toLowerCase()
      const next =
        operation === 'merge'
          ? { ...(current ?? {}), ...incoming }
          : operation === 'delete'
            ? Object.fromEntries(
                Object.entries(current ?? {}).filter(([key]) => !(key in incoming)),
              )
            : incoming
      return asGroup(
        az(s, 'group update', {
          name,
          tags: Object.entries(next).map(([k, v]) => `${k}=${v}`),
        }) as Json,
      )
    },
  },
  {
    name: 'Get-AzResource',
    summary: 'List resources.',
    params: [{ name: 'ResourceGroupName' }, { name: 'Name' }],
    view: 'list',
    run: (p, s) =>
      many(
        az(s, 'resource list', { 'resource-group': text(p.ResourceGroupName), name: text(p.Name) }),
      ).map(asResource),
  },

  /* networking */
  {
    name: 'New-AzVirtualNetwork',
    summary: 'Create a virtual network.',
    params: [NAME, RGN, { ...LOC, required: true }, { name: 'AddressPrefix', required: true }],
    view: 'list',
    run: (p, s) =>
      asVnet(
        (
          az(s, 'network vnet create', {
            name: text(p.Name),
            'resource-group': text(p.ResourceGroupName),
            location: text(p.Location),
            'address-prefixes': String(p.AddressPrefix).split(','),
          }) as { newVNet: Json }
        ).newVNet,
      ),
  },
  {
    name: 'Get-AzVirtualNetwork',
    summary: 'Get virtual networks.',
    params: [{ name: 'Name' }, { name: 'ResourceGroupName' }],
    view: 'list',
    run: (p, s) =>
      p.Name
        ? asVnet(
            az(s, 'network vnet show', {
              name: text(p.Name),
              'resource-group': text(p.ResourceGroupName),
            }) as Json,
          )
        : many(az(s, 'network vnet list', { 'resource-group': text(p.ResourceGroupName) })).map(
            asVnet,
          ),
  },
  {
    name: 'Add-AzVirtualNetworkSubnetConfig',
    summary:
      'Add a subnet to a virtual network object. Pipe it to Set-AzVirtualNetwork to save it.',
    params: [
      NAME,
      { name: 'AddressPrefix', required: true },
      { name: 'VirtualNetwork', required: true },
    ],
    view: 'list',
    run: (p) => {
      const vnet = p.VirtualNetwork as PsObject
      if (!vnet || vnet.__type !== 'PSVirtualNetwork')
        throw new CliError(
          'Add-AzVirtualNetworkSubnetConfig: -VirtualNetwork must be a virtual network object, for example $vnet = Get-AzVirtualNetwork -Name ... -ResourceGroupName ...',
        )
      ;(vnet.__pendingSubnets as { name: string; prefix: string }[]).push({
        name: text(p.Name) as string,
        prefix: text(p.AddressPrefix) as string,
      })
      return vnet
    },
  },
  {
    name: 'Set-AzVirtualNetwork',
    summary: 'Save changes made to a virtual network object.',
    params: [{ name: 'VirtualNetwork' }],
    view: 'list',
    run: (p, s, input) => {
      const vnet = (p.VirtualNetwork ?? input) as PsObject
      if (!vnet || vnet.__type !== 'PSVirtualNetwork')
        throw new CliError(
          'Set-AzVirtualNetwork: pipe a virtual network object into it, or pass -VirtualNetwork $vnet.',
        )
      for (const subnet of vnet.__pendingSubnets as { name: string; prefix: string }[]) {
        az(s, 'network vnet subnet create', {
          name: subnet.name,
          'resource-group': String(vnet.ResourceGroupName),
          'vnet-name': String(vnet.Name),
          'address-prefixes': [subnet.prefix],
        })
      }
      return asVnet(
        az(s, 'network vnet show', {
          name: String(vnet.Name),
          'resource-group': String(vnet.ResourceGroupName),
        }) as Json,
      )
    },
  },
  {
    name: 'New-AzNetworkSecurityGroup',
    summary: 'Create a network security group.',
    params: [NAME, RGN, { ...LOC, required: true }],
    view: 'list',
    run: (p, s) =>
      asNsg(
        (
          az(s, 'network nsg create', {
            name: text(p.Name),
            'resource-group': text(p.ResourceGroupName),
            location: text(p.Location),
          }) as { NewNSG: Json }
        ).NewNSG,
      ),
  },
  {
    name: 'Get-AzNetworkSecurityGroup',
    summary: 'Get network security groups.',
    params: [{ name: 'Name' }, { name: 'ResourceGroupName' }],
    view: 'list',
    run: (p, s) =>
      p.Name
        ? asNsg(
            az(s, 'network nsg show', {
              name: text(p.Name),
              'resource-group': text(p.ResourceGroupName),
            }) as Json,
          )
        : many(az(s, 'network nsg list', { 'resource-group': text(p.ResourceGroupName) })).map(
            asNsg,
          ),
  },
  {
    name: 'Add-AzNetworkSecurityRuleConfig',
    summary: 'Add a rule to an NSG object. Pipe it to Set-AzNetworkSecurityGroup to save it.',
    params: [
      NAME,
      { name: 'NetworkSecurityGroup', required: true },
      { name: 'Priority', required: true },
      { name: 'Direction', required: true },
      { name: 'Access', required: true },
      { name: 'Protocol', required: true },
      { name: 'SourceAddressPrefix', required: true },
      { name: 'SourcePortRange', required: true },
      { name: 'DestinationAddressPrefix', required: true },
      { name: 'DestinationPortRange', required: true },
    ],
    view: 'list',
    run: (p) => {
      const nsg = p.NetworkSecurityGroup as PsObject
      if (!nsg || nsg.__type !== 'PSNetworkSecurityGroup')
        throw new CliError(
          'Add-AzNetworkSecurityRuleConfig: -NetworkSecurityGroup must be an NSG object, for example $nsg = Get-AzNetworkSecurityGroup -Name ... -ResourceGroupName ...',
        )
      ;(nsg.__pendingRules as Args[]).push({
        name: text(p.Name),
        priority: text(p.Priority),
        direction: text(p.Direction),
        access: text(p.Access),
        protocol: text(p.Protocol) === '*' ? '*' : text(p.Protocol),
        'source-address-prefixes': [text(p.SourceAddressPrefix) as string],
        'source-port-ranges': [text(p.SourcePortRange) as string],
        'destination-address-prefixes': [text(p.DestinationAddressPrefix) as string],
        'destination-port-ranges': String(p.DestinationPortRange).split(','),
      })
      return nsg
    },
  },
  {
    name: 'Set-AzNetworkSecurityGroup',
    summary: 'Save changes made to an NSG object.',
    params: [{ name: 'NetworkSecurityGroup' }],
    view: 'list',
    run: (p, s, input) => {
      const nsg = (p.NetworkSecurityGroup ?? input) as PsObject
      if (!nsg || nsg.__type !== 'PSNetworkSecurityGroup')
        throw new CliError(
          'Set-AzNetworkSecurityGroup: pipe an NSG object into it, or pass -NetworkSecurityGroup $nsg.',
        )
      for (const rule of nsg.__pendingRules as Args[]) {
        az(s, 'network nsg rule create', {
          ...rule,
          'resource-group': String(nsg.ResourceGroupName),
          'nsg-name': String(nsg.Name),
        })
      }
      return asNsg(
        az(s, 'network nsg show', {
          name: String(nsg.Name),
          'resource-group': String(nsg.ResourceGroupName),
        }) as Json,
      )
    },
  },

  /* storage */
  {
    name: 'New-AzStorageAccount',
    summary: 'Create a storage account.',
    params: [
      RGN,
      NAME,
      { ...LOC, required: true },
      { name: 'SkuName', required: true },
      { name: 'Kind' },
      { name: 'MinimumTlsVersion' },
      { name: 'AllowBlobPublicAccess' },
      { name: 'EnableHttpsTrafficOnly' },
      { name: 'Tag' },
    ],
    view: 'table',
    run: (p, s) =>
      asStorage(
        az(s, 'storage account create', {
          name: text(p.Name),
          'resource-group': text(p.ResourceGroupName),
          location: text(p.Location),
          sku: text(p.SkuName),
          kind: text(p.Kind),
          'min-tls-version': text(p.MinimumTlsVersion),
          'allow-blob-public-access': text(p.AllowBlobPublicAccess),
          'https-only': text(p.EnableHttpsTrafficOnly),
          tags: hashToTags(p.Tag),
        }) as Json,
      ),
  },
  {
    name: 'Get-AzStorageAccount',
    summary: 'Get storage accounts.',
    params: [{ name: 'ResourceGroupName' }, { name: 'Name' }],
    view: 'table',
    run: (p, s) =>
      p.Name
        ? asStorage(
            az(s, 'storage account show', {
              name: text(p.Name),
              'resource-group': text(p.ResourceGroupName),
            }) as Json,
          )
        : many(az(s, 'storage account list', { 'resource-group': text(p.ResourceGroupName) })).map(
            asStorage,
          ),
  },
  {
    name: 'Set-AzStorageAccount',
    summary: "Change a storage account's settings.",
    params: [
      RGN,
      NAME,
      { name: 'SkuName' },
      { name: 'MinimumTlsVersion' },
      { name: 'AllowBlobPublicAccess' },
      { name: 'EnableHttpsTrafficOnly' },
      { name: 'Tag' },
    ],
    view: 'table',
    run: (p, s) =>
      asStorage(
        az(s, 'storage account update', {
          name: text(p.Name),
          'resource-group': text(p.ResourceGroupName),
          sku: text(p.SkuName),
          'min-tls-version': text(p.MinimumTlsVersion),
          'allow-blob-public-access': text(p.AllowBlobPublicAccess),
          'https-only': text(p.EnableHttpsTrafficOnly),
          tags: hashToTags(p.Tag),
        }) as Json,
      ),
  },
  {
    name: 'Remove-AzStorageAccount',
    summary: 'Delete a storage account.',
    params: [RGN, NAME, FORCE],
    confirm: (p) =>
      p.Force
        ? null
        : `Remove storage account '${text(p.Name)}' and all content in it\n[Y] Yes  [N] No (default is "N"): `,
    run: (p, s) => (
      az(s, 'storage account delete', {
        name: text(p.Name),
        'resource-group': text(p.ResourceGroupName),
        yes: true,
      }),
      undefined
    ),
  },

  /* compute */
  {
    name: 'New-AzVM',
    summary: 'Create a VM (simplified parameter set; the simulator skips -Credential).',
    params: [
      RGN,
      NAME,
      { ...LOC },
      { name: 'Image', required: true },
      { name: 'Size' },
      { name: 'VirtualNetworkName' },
      { name: 'SubnetName' },
      { name: 'SecurityGroupName' },
      { name: 'PublicIpAddressName' },
      { name: 'OpenPorts' },
      { name: 'Credential' },
    ],
    view: 'table',
    run: (p, s) => {
      const windows = /^win/i.test(text(p.Image) ?? '')
      az(s, 'vm create', {
        name: text(p.Name),
        'resource-group': text(p.ResourceGroupName),
        location: text(p.Location),
        image: text(p.Image),
        size: text(p.Size) ?? 'Standard_D2s_v5',
        'vnet-name': text(p.VirtualNetworkName),
        subnet: text(p.SubnetName),
        ...(windows ? { 'admin-password': 'simulated' } : { 'generate-ssh-keys': true }),
      })
      return asVm(
        az(s, 'vm show', {
          name: text(p.Name),
          'resource-group': text(p.ResourceGroupName),
          'show-details': true,
        }) as Json,
        false,
      )
    },
  },
  {
    name: 'Get-AzVM',
    summary: 'Get VMs. -Status adds the power state.',
    params: [{ name: 'ResourceGroupName' }, { name: 'Name' }, { name: 'Status', switch: true }],
    view: 'table',
    run: (p, s) =>
      p.Name
        ? asVm(
            az(s, 'vm show', {
              name: text(p.Name),
              'resource-group': text(p.ResourceGroupName),
              'show-details': true,
            }) as Json,
            Boolean(p.Status),
          )
        : many(
            az(s, 'vm list', { 'resource-group': text(p.ResourceGroupName), 'show-details': true }),
          ).map((vm) => asVm(vm, Boolean(p.Status))),
  },
  ...(['Start', 'Stop', 'Restart'] as const).map((verb): Cmdlet => ({
    name: `${verb}-AzVM`,
    summary:
      verb === 'Stop'
        ? 'Stop a VM. By default this DEALLOCATES it; -StayProvisioned only powers it off.'
        : `${verb} a VM.`,
    params: [
      RGN,
      NAME,
      FORCE,
      ...(verb === 'Stop' ? [{ name: 'StayProvisioned', switch: true }] : []),
    ],
    confirm: (p) =>
      verb === 'Stop' && !p.Force
        ? `Virtual machine stopping operation\nThis cmdlet will stop the specified virtual machine. Do you want to continue?\n[Y] Yes  [N] No (default is "Y"): `
        : null,
    run: (p, s) => {
      const action =
        verb === 'Stop' ? (p.StayProvisioned ? 'stop' : 'deallocate') : verb.toLowerCase()
      az(s, `vm ${action}`, { name: text(p.Name), 'resource-group': text(p.ResourceGroupName) })
      return {
        __type: 'PSComputeLongRunningOperation',
        OperationId: '',
        Status: 'Succeeded',
        StartTime: '',
        EndTime: '',
      }
    },
    view: 'table',
  })),
  {
    name: 'Remove-AzVM',
    summary: 'Delete a VM.',
    params: [RGN, NAME, FORCE],
    confirm: (p) =>
      p.Force
        ? null
        : `Virtual machine removal operation\nThis cmdlet will remove the specified virtual machine. Do you want to continue?\n[Y] Yes  [N] No (default is "Y"): `,
    run: (p, s) => (
      az(s, 'vm delete', {
        name: text(p.Name),
        'resource-group': text(p.ResourceGroupName),
        yes: true,
      }),
      undefined
    ),
  },

  /* locks */
  {
    name: 'New-AzResourceLock',
    summary: 'Create a resource lock (CanNotDelete or ReadOnly) on a resource group.',
    params: [
      { name: 'LockName', required: true },
      { name: 'LockLevel', required: true },
      RGN,
      { name: 'LockNotes' },
      FORCE,
    ],
    view: 'list',
    run: (p, s) =>
      asLock(
        az(s, 'lock create', {
          name: text(p.LockName),
          'lock-type': text(p.LockLevel),
          'resource-group': text(p.ResourceGroupName),
          notes: text(p.LockNotes),
        }) as Json,
      ),
  },
  {
    name: 'Get-AzResourceLock',
    summary: 'Get resource locks.',
    params: [{ name: 'ResourceGroupName' }],
    view: 'list',
    run: (p, s) =>
      many(az(s, 'lock list', { 'resource-group': text(p.ResourceGroupName) })).map(asLock),
  },
  {
    name: 'Remove-AzResourceLock',
    summary: 'Delete a resource lock.',
    params: [{ name: 'LockName', required: true }, RGN, FORCE],
    run: (p, s) => (
      az(s, 'lock delete', { name: text(p.LockName), 'resource-group': text(p.ResourceGroupName) }),
      true
    ),
  },
]

const cmdletByName = new Map(CMDLETS.map((cmdlet) => [cmdlet.name.toLowerCase(), cmdlet]))
export const POWERSHELL_CMDLETS = CMDLETS.map((cmdlet) => cmdlet.name)

/** Cmdlets the course notes mention that the simulator recognises but does not model. */
const RECOGNISED = [
  'New-AzResourceGroupDeployment',
  'Update-AzVM',
  'New-AzPolicyAssignment',
  'New-AzConsumptionBudget',
  'Get-AzActivityLog',
  'Update-AzVmss',
  'New-AzVmss',
  'New-AzRoleAssignment',
  'Get-AzRoleAssignment',
  'New-AzRoleDefinition',
  'Get-AzRoleDefinition',
  'New-AzWebApp',
  'New-AzWebAppSlot',
  'New-AzAppServicePlan',
  'Set-AzAppServicePlan',
  'New-AzContainerRegistry',
  'New-AzContainerGroup',
  'New-AzLoadBalancer',
  'New-AzRecoveryServicesVault',
  'New-AzRmStorageShare',
  'Move-AzResource',
  'Invoke-AzVMRunCommand',
  'Invoke-AzOperationalInsightsQuery',
  'Get-AzMetric',
  'Get-AzAdvisorRecommendation',
  'Get-AzPolicyStateSummary',
  'Add-AzVMDataDisk',
  'Add-AzVirtualNetworkPeering',
  'New-AzVirtualNetworkSubnetConfig',
]

/* -------------------------------------------------------------- parsing */

interface PsToken {
  kind: 'word' | 'string' | 'var' | 'hash' | 'pipe' | 'assign'
  value: string
  hash?: Record<string, string>
}

function tokenizePs(line: string): PsToken[] {
  const tokens: PsToken[] = []
  let i = 0
  while (i < line.length) {
    const ch = line[i]
    if (/\s/.test(ch)) {
      i += 1
    } else if (ch === '#') {
      break
    } else if (ch === '|') {
      tokens.push({ kind: 'pipe', value: '|' })
      i += 1
    } else if (ch === '=' && tokens.length === 1 && tokens[0].kind === 'var') {
      tokens.push({ kind: 'assign', value: '=' })
      i += 1
    } else if (ch === '"' || ch === "'") {
      const end = line.indexOf(ch, i + 1)
      if (end < 0) throw new CliError('The string is missing the terminator: ' + ch + '.')
      tokens.push({ kind: 'string', value: line.slice(i + 1, end) })
      i = end + 1
    } else if (ch === '@' && line[i + 1] === '{') {
      const end = line.indexOf('}', i)
      if (end < 0) throw new CliError("Missing closing '}' in statement block or type definition.")
      const hash: Record<string, string> = {}
      for (const pair of line.slice(i + 2, end).split(/[;\n]/)) {
        if (!pair.trim()) continue
        const [key, ...rest] = pair.split('=')
        hash[key.trim().replace(/^["']|["']$/g, '')] = rest
          .join('=')
          .trim()
          .replace(/^["']|["']$/g, '')
      }
      tokens.push({ kind: 'hash', value: line.slice(i, end + 1), hash })
      i = end + 1
    } else if (ch === '$') {
      const match = /^\$(\w+)/.exec(line.slice(i))
      tokens.push({ kind: 'var', value: match ? match[1] : '' })
      i += match ? match[0].length : 1
    } else {
      let j = i
      while (j < line.length && !/[\s|]/.test(line[j])) j += 1
      tokens.push({ kind: 'word', value: line.slice(i, j) })
      i = j
    }
  }
  return tokens
}

function valueOf(token: PsToken, session: PsSession): PsValue {
  if (token.kind === 'hash') return token.hash ?? {}
  if (token.kind === 'var') {
    if (/^true$/i.test(token.value)) return true
    if (/^false$/i.test(token.value)) return false
    if (/^null$/i.test(token.value)) return null
    const value = session.psVars?.[token.value.toLowerCase()]
    if (value === undefined)
      throw new CliError(
        `The variable '$${token.value}' cannot be retrieved because it has not been set.`,
      )
    return value
  }
  return token.value
}

/* ---------------------------------------------------------------- output */

const visible = (object: PsObject) =>
  Object.entries(object).filter(([key]) => !key.startsWith('__'))
const cell = (value: unknown) =>
  value === null || value === undefined
    ? ''
    : typeof value === 'boolean'
      ? value
        ? 'True'
        : 'False'
      : String(value)

function formatList(objects: PsObject[], props?: string[]): string {
  return objects
    .map((object) => {
      const entries = visible(object).filter(
        ([key]) => !props || props.some((prop) => prop.toLowerCase() === key.toLowerCase()),
      )
      const width = Math.max(...entries.map(([key]) => key.length))
      return entries.map(([key, value]) => `${key.padEnd(width)} : ${cell(value)}`).join('\n')
    })
    .join('\n\n')
}

function formatTable(objects: PsObject[], props?: string[]): string {
  if (objects.length === 0) return ''
  const keys = props ?? visible(objects[0]).map(([key]) => key)
  const rows = objects.map((object) =>
    keys.map((key) =>
      cell(Object.entries(object).find(([k]) => k.toLowerCase() === key.toLowerCase())?.[1]),
    ),
  )
  const widths = keys.map((key, index) =>
    Math.max(key.length, ...rows.map((row) => Math.min(60, row[index].length))),
  )
  const line = (cells: string[]) =>
    cells
      .map((value, index) => value.slice(0, 60).padEnd(widths[index]))
      .join(' ')
      .trimEnd()
  return [line(keys), line(widths.map((width) => '-'.repeat(width))), ...rows.map(line)].join('\n')
}

function display(
  value: PsValue | undefined,
  view: 'list' | 'table' | undefined,
  format?: { kind: 'list' | 'table' | 'json'; props?: string[] },
): string {
  if (value === undefined || value === null) return ''
  if (typeof value !== 'object') return cell(value)
  const objects = (Array.isArray(value) ? value : [value]).filter(
    (item): item is PsObject => typeof item === 'object' && item !== null && '__type' in item,
  )
  if (objects.length === 0) return JSON.stringify(value)
  const kind = format?.kind ?? view ?? 'list'
  if (kind === 'json') {
    const plain = objects.map((object) => Object.fromEntries(visible(object)))
    return JSON.stringify(plain.length === 1 ? plain[0] : plain, null, 2)
  }
  return kind === 'table' ? formatTable(objects, format?.props) : formatList(objects, format?.props)
}

/* ---------------------------------------------------------------- running */

const FORMATTERS = new Set([
  'format-table',
  'ft',
  'format-list',
  'fl',
  'select-object',
  'select',
  'convertto-json',
])

export function runPowerShell(line: string, session: PsSession): ShellResult {
  const trimmed = line.trim()
  if (!trimmed) return { lines: [] }
  session.psVars ??= {}
  try {
    if (/^(clear|cls|clear-host)$/i.test(trimmed)) return { lines: [], clear: true }
    if (/^az\s/.test(trimmed))
      return {
        lines: [
          info(
            "PowerShell mode is on. Switch to Azure CLI mode to run 'az' commands - or use the Az cmdlet, e.g. Get-AzResourceGroup.",
          ),
        ],
      }
    const tokens = tokenizePs(trimmed)
    let assignTo: string | null = null
    if (tokens[0]?.kind === 'var' && tokens[1]?.kind === 'assign') {
      assignTo = tokens[0].value.toLowerCase()
      tokens.splice(0, 2)
      const first = tokens.at(0)
      if (first && first.kind !== 'word') {
        session.psVars[assignTo] = valueOf(first, session)
        return { lines: [] }
      }
    }
    if (tokens.length === 1 && tokens[0].kind === 'var') {
      const value = valueOf(tokens[0], session)
      return { lines: [out(display(value, 'list'))] }
    }

    // Split the pipeline.
    const stages: PsToken[][] = [[]]
    for (const token of tokens) {
      if (token.kind === 'pipe') stages.push([])
      else stages[stages.length - 1].push(token)
    }

    let value: PsValue | undefined
    let view: 'list' | 'table' | undefined
    let format: { kind: 'list' | 'table' | 'json'; props?: string[] } | undefined
    const recorded: string[] = []
    for (const stage of stages) {
      const [head, ...rest] = stage
      if (!head || head.kind !== 'word') throw new CliError('An empty pipe element is not allowed.')
      const name = head.value.toLowerCase()
      if (FORMATTERS.has(name)) {
        const props = rest
          .filter((token) => !token.value.startsWith('-'))
          .flatMap((token) => token.value.split(','))
          .map((prop) => prop.trim())
          .filter(Boolean)
        format = {
          kind:
            name === 'convertto-json'
              ? 'json'
              : name.startsWith('format-l') || name === 'fl'
                ? 'list'
                : name.startsWith('select')
                  ? format?.kind === 'table'
                    ? 'table'
                    : 'table'
                  : 'table',
          props: props.length > 0 ? props : undefined,
        }
        continue
      }
      if (name === 'get-command') {
        return {
          lines: [
            out(
              formatTable(
                CMDLETS.map((cmdlet) => ({
                  __type: 'CmdletInfo',
                  CommandType: 'Cmdlet',
                  Name: cmdlet.name,
                  Source: 'Az (simulated)',
                })),
              ),
            ),
          ],
        }
      }
      if (name === 'get-help') {
        const target = cmdletByName.get(String(rest[0]?.value ?? '').toLowerCase())
        if (!target)
          throw new CliError(
            `Get-Help: Get-Help could not find ${rest[0]?.value ?? ''} in a help file.`,
          )
        const syntax = target.params
          .map((param) =>
            param.required
              ? `-${param.name} <value>`
              : param.switch
                ? `[-${param.name}]`
                : `[-${param.name} <value>]`,
          )
          .join(' ')
        return {
          lines: [
            out(
              `NAME\n    ${target.name}\n\nSYNOPSIS\n    ${target.summary}\n\nSYNTAX\n    ${target.name} ${syntax}`,
            ),
          ],
        }
      }
      const cmdlet = cmdletByName.get(name)
      if (!cmdlet) {
        const recognised = RECOGNISED.find((candidate) => candidate.toLowerCase() === name)
        if (recognised)
          return {
            lines: [
              info(
                `ⓘ ${recognised} is a real Az cmdlet (it is in the course notes), but the simulator does not model it, so nothing changed.`,
              ),
            ],
          }
        const near = similar(name, [...cmdletByName.keys()]).map(
          (candidate) => cmdletByName.get(candidate)?.name,
        )
        throw new CliError(
          `${head.value}: The term '${head.value}' is not recognized as a name of a cmdlet, function, script file, or executable program.${near.length ? `\nSuggestion: did you mean ${near.join(', ')}?` : ''}`,
        )
      }
      // Parameters.
      const params: Record<string, PsValue> = {}
      for (let i = 0; i < rest.length; i += 1) {
        const token = rest[i]
        if (token.kind !== 'word' || !token.value.startsWith('-'))
          throw new CliError(
            `${cmdlet.name}: A positional parameter cannot be found that accepts argument '${token.value}'.`,
          )
        const [rawName, inline] = token.value.slice(1).split(':')
        const param =
          cmdlet.params.find(
            (candidate) => candidate.name.toLowerCase() === rawName.toLowerCase(),
          ) ??
          cmdlet.params.find((candidate) =>
            candidate.name.toLowerCase().startsWith(rawName.toLowerCase()),
          )
        if (!param) {
          throw new CliError(
            `${cmdlet.name}: A parameter cannot be found that matches parameter name '${rawName}'.`,
          )
        }
        if (param.switch) {
          params[param.name] = inline === undefined ? true : !/^\$?false$/i.test(inline)
          continue
        }
        const next = rest[i + 1]
        if (!next)
          throw new CliError(
            `${cmdlet.name}: Missing an argument for parameter '${param.name}'. Specify a parameter of type 'System.String' and try again.`,
          )
        params[param.name] = valueOf(next, session)
        i += 1
      }
      const input = value
      const missing = cmdlet.params.filter(
        (param) =>
          param.required &&
          params[param.name] === undefined &&
          !(input && param.name.match(/VirtualNetwork|NetworkSecurityGroup/)),
      )
      if (missing.length > 0) {
        throw new CliError(
          `${cmdlet.name}: Cannot process command because of one or more missing mandatory parameters: ${missing.map((param) => param.name).join(' ')}.`,
        )
      }
      const question = cmdlet.confirm?.(params)
      const execute = () => cmdlet.run(params, session, input ?? null)
      if (question) {
        session.pending = {
          question,
          run: () => {
            const result = execute()
            session.state.history.push(`[pwsh] ${trimmed}`)
            return {
              lines: result === undefined ? [] : [out(display(result, cmdlet.view, format))],
            }
          },
        }
        return { lines: [], prompt: question }
      }
      const snapshot = JSON.stringify(session.state)
      try {
        value = execute()
      } catch (error) {
        Object.assign(session.state, JSON.parse(snapshot))
        throw error
      }
      view = cmdlet.view
      recorded.push(cmdlet.name)
    }
    session.state.history.push(`[pwsh] ${trimmed}`)
    if (assignTo) {
      session.psVars[assignTo] = value ?? null
      return { lines: [] }
    }
    const text = display(value, view, format)
    return { lines: text ? [out(text)] : [] }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    return { lines: [err(message.replace(/^\(([A-Za-z]+)\) /, '$1: '))] }
  }
}

/** Tab completion for cmdlet names and their parameters. */
export function completePowerShell(line: string): { line: string; candidates: string[] } {
  const match = /(\S*)$/.exec(line)
  const partial = match ? match[1] : ''
  const head = line.slice(0, line.length - partial.length)
  const words = head.trim().split(/\s+/).filter(Boolean)
  const stageStart = words.lastIndexOf('|') + 1
  const stage = words.slice(stageStart)
  let options: string[]
  if (stage.length === 0) {
    options = [
      ...POWERSHELL_CMDLETS,
      'Format-Table',
      'Format-List',
      'Select-Object',
      'ConvertTo-Json',
      'Get-Command',
      'Get-Help',
    ].filter((name) => name.toLowerCase().startsWith(partial.toLowerCase()))
  } else {
    const cmdlet = cmdletByName.get(stage[0].toLowerCase())
    options = (cmdlet?.params ?? [])
      .map((param) => `-${param.name}`)
      .filter((name) => name.toLowerCase().startsWith(partial.toLowerCase() || '-'))
  }
  if (options.length === 0) return { line, candidates: [] }
  if (options.length === 1) return { line: `${head}${options[0]} `, candidates: [] }
  let prefix = options[0]
  for (const option of options)
    while (!option.toLowerCase().startsWith(prefix.toLowerCase())) prefix = prefix.slice(0, -1)
  return { line: head + (prefix.length > partial.length ? prefix : partial), candidates: options }
}
