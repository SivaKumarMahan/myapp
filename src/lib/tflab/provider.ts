import type { Value } from './hcl'
import { deepEqual } from './eval'

/**
 * A small, offline stand-in for the hashicorp/azurerm v4 provider: which
 * arguments each resource type takes, which are required, which have
 * defaults, which are set by Azure (computed), and - the part that matters
 * most in interviews - which ones force a replacement when changed.
 *
 * ForceNew flags follow the real provider: names, locations and resource
 * groups always force a new resource; storage `account_tier` and `is_hns_enabled`
 * do; VM `size` and storage `min_tls_version` are updated in place.
 */

export type Attrs = Record<string, Value>

export type AttrKind = 'string' | 'number' | 'bool' | 'list' | 'map'

export interface AttrSchema {
  kind: AttrKind
  required?: boolean
  forceNew?: boolean
  /** Set by Azure only; cannot be configured. */
  computed?: boolean
  /** Optional, and Azure fills it in when omitted (no diff when left out). */
  optionalComputed?: boolean
  default?: Value
  /** Returns an error message when the value is invalid (checked at plan time). */
  validate?: (value: Value) => string | null
  /** Property name in `az ... show` output (defaults to camelCase). */
  arm?: string
}

export interface BlockSchema {
  required?: boolean
  max?: number
  forceNew?: boolean
  attrs: Record<string, AttrSchema>
}

export interface ResourceSchema {
  type: string
  /** The Azure resource type, e.g. Microsoft.Storage/storageAccounts. */
  armType: string
  attrs: Record<string, AttrSchema>
  blocks: Record<string, BlockSchema>
  /** The Azure resource ID for these arguments. */
  id: (attrs: Attrs, subscriptionId: string) => string
  /** Pattern a valid import ID must match. */
  idPattern: RegExp
  /** Extra arguments read back from an import ID (name, resource group...). */
  fromId: (id: string) => Attrs
  /** Values Azure sets on create. */
  computed: (attrs: Attrs, id: string) => Attrs
  /** Provider-specific rules that force replacement (CustomizeDiff). */
  forceNewIf?: (before: Attrs, after: Attrs) => string[]
  /** The name is a global DNS name (storage accounts, key vaults, web apps). */
  globalName?: string
  /** Seconds the fake apply "takes" (shown as "Creation complete after ..."). */
  seconds: number
}

const NAME = { kind: 'string', required: true, forceNew: true } as const
const RG = { kind: 'string', required: true, forceNew: true } as const
const LOCATION = { kind: 'string', required: true, forceNew: true } as const
const TAGS = { kind: 'map' } as const
const ID = { kind: 'string', computed: true } as const

const rgPath = (sub: string, rg: Value) => `/subscriptions/${sub}/resourceGroups/${String(rg)}`
const provider = (sub: string, rg: Value, namespace: string, name: Value) =>
  `${rgPath(sub, rg)}/providers/${namespace}/${String(name)}`

const segment = (id: string, key: string) => {
  const parts = id.split('/')
  const index = parts.findIndex((part) => part.toLowerCase() === key.toLowerCase())
  return index >= 0 ? (parts[index + 1] ?? '') : ''
}
const lastSegment = (id: string) => id.split('/').pop() ?? ''

/** A predictable pseudo-GUID, so seeded scenarios stay stable. */
export function fakeGuid(seed: string): string {
  let h1 = 0x811c9dc5
  let h2 = 0x01000193
  for (const ch of seed) {
    h1 = Math.imul(h1 ^ ch.charCodeAt(0), 16777619) >>> 0
    h2 = Math.imul(h2 + ch.charCodeAt(0), 2246822519) >>> 0
  }
  const hex = (h1.toString(16).padStart(8, '0') + h2.toString(16).padStart(8, '0')).repeat(2)
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-4${hex.slice(13, 16)}-a${hex.slice(17, 20)}-${hex.slice(20, 32)}`
}

const storageName = (value: Value) =>
  typeof value === 'string' && /^[a-z0-9]{3,24}$/.test(value)
    ? null
    : `name (${JSON.stringify(value)}) can only consist of lowercase letters and numbers, and must be between 3 and 24 characters long`

const vaultName = (value: Value) =>
  typeof value === 'string' &&
  /^[a-zA-Z][a-zA-Z0-9-]{1,22}[a-zA-Z0-9]$/.test(value) &&
  !value.includes('--')
    ? null
    : `name (${JSON.stringify(value)}) may only contain alphanumeric characters and dashes, must start with a letter, end with a letter or number, and be between 3 and 24 characters long`

const oneOf =
  (...allowed: string[]) =>
  (value: Value) =>
    typeof value === 'string' && allowed.includes(value)
      ? null
      : `expected value to be one of [${allowed.map((item) => `"${item}"`).join(' ')}], got ${JSON.stringify(value)}`

const LOCAL_REPLICATION = ['LRS', 'GRS', 'RAGRS']
const ZONE_REPLICATION = ['ZRS', 'GZRS', 'RAGZRS']

export const schemas: Record<string, ResourceSchema> = {
  azurerm_resource_group: {
    type: 'azurerm_resource_group',
    armType: 'Microsoft.Resources/resourceGroups',
    attrs: {
      id: ID,
      name: NAME,
      location: LOCATION,
      managed_by: { kind: 'string', forceNew: true },
      tags: TAGS,
    },
    blocks: {},
    id: (attrs, sub) => rgPath(sub, attrs.name),
    idPattern: /^\/subscriptions\/[^/]+\/resourceGroups\/[^/]+$/i,
    fromId: (id) => ({ name: lastSegment(id) }),
    computed: () => ({}),
    seconds: 1,
  },

  azurerm_storage_account: {
    type: 'azurerm_storage_account',
    armType: 'Microsoft.Storage/storageAccounts',
    attrs: {
      id: ID,
      name: { ...NAME, validate: storageName },
      resource_group_name: RG,
      location: LOCATION,
      account_tier: {
        kind: 'string',
        required: true,
        forceNew: true,
        validate: oneOf('Standard', 'Premium'),
      },
      account_replication_type: {
        kind: 'string',
        required: true,
        validate: oneOf('LRS', 'GRS', 'RAGRS', 'ZRS', 'GZRS', 'RAGZRS'),
      },
      account_kind: {
        kind: 'string',
        default: 'StorageV2',
        validate: oneOf('BlobStorage', 'BlockBlobStorage', 'FileStorage', 'Storage', 'StorageV2'),
      },
      access_tier: {
        kind: 'string',
        default: 'Hot',
        validate: oneOf('Hot', 'Cool', 'Cold', 'Premium'),
      },
      min_tls_version: {
        kind: 'string',
        default: 'TLS1_2',
        validate: oneOf('TLS1_0', 'TLS1_1', 'TLS1_2', 'TLS1_3'),
        arm: 'minimumTlsVersion',
      },
      https_traffic_only_enabled: { kind: 'bool', default: true, arm: 'supportsHttpsTrafficOnly' },
      public_network_access_enabled: { kind: 'bool', default: true, arm: 'publicNetworkAccess' },
      allow_nested_items_to_be_public: {
        kind: 'bool',
        default: true,
        arm: 'allowBlobPublicAccess',
      },
      shared_access_key_enabled: { kind: 'bool', default: true, arm: 'allowSharedKeyAccess' },
      is_hns_enabled: { kind: 'bool', default: false, forceNew: true },
      primary_blob_endpoint: { kind: 'string', computed: true },
      tags: TAGS,
    },
    blocks: {},
    id: (attrs, sub) =>
      provider(sub, attrs.resource_group_name, 'Microsoft.Storage/storageAccounts', attrs.name),
    idPattern:
      /^\/subscriptions\/[^/]+\/resourceGroups\/[^/]+\/providers\/Microsoft\.Storage\/storageAccounts\/[^/]+$/i,
    fromId: (id) => ({ name: lastSegment(id), resource_group_name: segment(id, 'resourceGroups') }),
    computed: (attrs) => ({
      primary_blob_endpoint: `https://${String(attrs.name)}.blob.core.windows.net/`,
    }),
    forceNewIf: (before, after) => {
      const out: string[] = []
      const was = String(before.account_replication_type)
      const now = String(after.account_replication_type)
      if (
        was !== now &&
        ((LOCAL_REPLICATION.includes(was) && ZONE_REPLICATION.includes(now)) ||
          (ZONE_REPLICATION.includes(was) && LOCAL_REPLICATION.includes(now)))
      )
        out.push('account_replication_type')
      if (
        before.account_kind !== after.account_kind &&
        !(before.account_kind === 'Storage' && after.account_kind === 'StorageV2')
      )
        out.push('account_kind')
      return out
    },
    globalName: 'storage account',
    seconds: 23,
  },

  azurerm_virtual_network: {
    type: 'azurerm_virtual_network',
    armType: 'Microsoft.Network/virtualNetworks',
    attrs: {
      id: ID,
      name: NAME,
      resource_group_name: RG,
      location: LOCATION,
      address_space: { kind: 'list', required: true },
      dns_servers: { kind: 'list', optionalComputed: true },
      guid: { kind: 'string', computed: true },
      tags: TAGS,
    },
    blocks: {},
    id: (attrs, sub) =>
      provider(sub, attrs.resource_group_name, 'Microsoft.Network/virtualNetworks', attrs.name),
    idPattern:
      /^\/subscriptions\/[^/]+\/resourceGroups\/[^/]+\/providers\/Microsoft\.Network\/virtualNetworks\/[^/]+$/i,
    fromId: (id) => ({ name: lastSegment(id), resource_group_name: segment(id, 'resourceGroups') }),
    computed: (_attrs, id) => ({ guid: fakeGuid(`vnet:${id}`) }),
    seconds: 5,
  },

  azurerm_subnet: {
    type: 'azurerm_subnet',
    armType: 'Microsoft.Network/virtualNetworks/subnets',
    attrs: {
      id: ID,
      name: NAME,
      resource_group_name: RG,
      virtual_network_name: { kind: 'string', required: true, forceNew: true },
      address_prefixes: { kind: 'list', required: true },
      service_endpoints: { kind: 'list' },
      default_outbound_access_enabled: { kind: 'bool', default: true },
    },
    blocks: {},
    id: (attrs, sub) =>
      `${provider(sub, attrs.resource_group_name, 'Microsoft.Network/virtualNetworks', attrs.virtual_network_name)}/subnets/${String(attrs.name)}`,
    idPattern:
      /^\/subscriptions\/[^/]+\/resourceGroups\/[^/]+\/providers\/Microsoft\.Network\/virtualNetworks\/[^/]+\/subnets\/[^/]+$/i,
    fromId: (id) => ({
      name: lastSegment(id),
      resource_group_name: segment(id, 'resourceGroups'),
      virtual_network_name: segment(id, 'virtualNetworks'),
    }),
    computed: () => ({}),
    seconds: 4,
  },

  azurerm_network_security_group: {
    type: 'azurerm_network_security_group',
    armType: 'Microsoft.Network/networkSecurityGroups',
    attrs: { id: ID, name: NAME, resource_group_name: RG, location: LOCATION, tags: TAGS },
    blocks: {
      security_rule: {
        attrs: {
          name: { kind: 'string', required: true },
          priority: { kind: 'number', required: true },
          direction: { kind: 'string', required: true, validate: oneOf('Inbound', 'Outbound') },
          access: { kind: 'string', required: true, validate: oneOf('Allow', 'Deny') },
          protocol: { kind: 'string', required: true },
          source_port_range: { kind: 'string' },
          destination_port_range: { kind: 'string' },
          source_address_prefix: { kind: 'string' },
          destination_address_prefix: { kind: 'string' },
        },
      },
    },
    id: (attrs, sub) =>
      provider(
        sub,
        attrs.resource_group_name,
        'Microsoft.Network/networkSecurityGroups',
        attrs.name,
      ),
    idPattern:
      /^\/subscriptions\/[^/]+\/resourceGroups\/[^/]+\/providers\/Microsoft\.Network\/networkSecurityGroups\/[^/]+$/i,
    fromId: (id) => ({ name: lastSegment(id), resource_group_name: segment(id, 'resourceGroups') }),
    computed: () => ({}),
    seconds: 3,
  },

  azurerm_key_vault: {
    type: 'azurerm_key_vault',
    armType: 'Microsoft.KeyVault/vaults',
    attrs: {
      id: ID,
      name: { ...NAME, validate: vaultName },
      resource_group_name: RG,
      location: LOCATION,
      tenant_id: { kind: 'string', required: true },
      sku_name: { kind: 'string', required: true, validate: oneOf('standard', 'premium') },
      soft_delete_retention_days: { kind: 'number', default: 90 },
      purge_protection_enabled: { kind: 'bool', default: false },
      enabled_for_disk_encryption: { kind: 'bool', default: false },
      public_network_access_enabled: { kind: 'bool', default: true, arm: 'publicNetworkAccess' },
      vault_uri: { kind: 'string', computed: true },
      tags: TAGS,
    },
    blocks: {},
    id: (attrs, sub) =>
      provider(sub, attrs.resource_group_name, 'Microsoft.KeyVault/vaults', attrs.name),
    idPattern:
      /^\/subscriptions\/[^/]+\/resourceGroups\/[^/]+\/providers\/Microsoft\.KeyVault\/vaults\/[^/]+$/i,
    fromId: (id) => ({ name: lastSegment(id), resource_group_name: segment(id, 'resourceGroups') }),
    computed: (attrs) => ({ vault_uri: `https://${String(attrs.name)}.vault.azure.net/` }),
    globalName: 'key vault',
    seconds: 184,
  },

  azurerm_service_plan: {
    type: 'azurerm_service_plan',
    armType: 'Microsoft.Web/serverFarms',
    attrs: {
      id: ID,
      name: NAME,
      resource_group_name: RG,
      location: LOCATION,
      os_type: {
        kind: 'string',
        required: true,
        forceNew: true,
        validate: oneOf('Linux', 'Windows', 'WindowsContainer'),
      },
      sku_name: { kind: 'string', required: true },
      worker_count: { kind: 'number', optionalComputed: true },
      tags: TAGS,
    },
    blocks: {},
    id: (attrs, sub) =>
      provider(sub, attrs.resource_group_name, 'Microsoft.Web/serverFarms', attrs.name),
    idPattern:
      /^\/subscriptions\/[^/]+\/resourceGroups\/[^/]+\/providers\/Microsoft\.Web\/serverFarms\/[^/]+$/i,
    fromId: (id) => ({ name: lastSegment(id), resource_group_name: segment(id, 'resourceGroups') }),
    computed: (attrs): Attrs => (attrs.worker_count == null ? { worker_count: 1 } : {}),
    seconds: 12,
  },

  azurerm_linux_web_app: {
    type: 'azurerm_linux_web_app',
    armType: 'Microsoft.Web/sites',
    attrs: {
      id: ID,
      name: NAME,
      resource_group_name: RG,
      location: LOCATION,
      service_plan_id: { kind: 'string', required: true },
      https_only: { kind: 'bool', default: false },
      enabled: { kind: 'bool', default: true },
      app_settings: { kind: 'map' },
      default_hostname: { kind: 'string', computed: true },
      tags: TAGS,
    },
    blocks: {
      site_config: {
        required: true,
        max: 1,
        attrs: {
          always_on: { kind: 'bool', default: true },
          minimum_tls_version: { kind: 'string', default: '1.2' },
          ftps_state: { kind: 'string', default: 'Disabled' },
          http2_enabled: { kind: 'bool', default: false },
          health_check_path: { kind: 'string' },
        },
      },
    },
    id: (attrs, sub) => provider(sub, attrs.resource_group_name, 'Microsoft.Web/sites', attrs.name),
    idPattern:
      /^\/subscriptions\/[^/]+\/resourceGroups\/[^/]+\/providers\/Microsoft\.Web\/sites\/[^/]+$/i,
    fromId: (id) => ({ name: lastSegment(id), resource_group_name: segment(id, 'resourceGroups') }),
    computed: (attrs) => ({ default_hostname: `${String(attrs.name)}.azurewebsites.net` }),
    globalName: 'web app',
    seconds: 41,
  },

  azurerm_network_interface: {
    type: 'azurerm_network_interface',
    armType: 'Microsoft.Network/networkInterfaces',
    attrs: {
      id: ID,
      name: NAME,
      resource_group_name: RG,
      location: LOCATION,
      private_ip_address: { kind: 'string', computed: true },
      tags: TAGS,
    },
    blocks: {
      ip_configuration: {
        required: true,
        attrs: {
          name: { kind: 'string', required: true },
          subnet_id: { kind: 'string' },
          private_ip_address_allocation: {
            kind: 'string',
            required: true,
            validate: oneOf('Dynamic', 'Static'),
          },
        },
      },
    },
    id: (attrs, sub) =>
      provider(sub, attrs.resource_group_name, 'Microsoft.Network/networkInterfaces', attrs.name),
    idPattern:
      /^\/subscriptions\/[^/]+\/resourceGroups\/[^/]+\/providers\/Microsoft\.Network\/networkInterfaces\/[^/]+$/i,
    fromId: (id) => ({ name: lastSegment(id), resource_group_name: segment(id, 'resourceGroups') }),
    computed: () => ({ private_ip_address: '10.0.1.4' }),
    seconds: 3,
  },

  azurerm_linux_virtual_machine: {
    type: 'azurerm_linux_virtual_machine',
    armType: 'Microsoft.Compute/virtualMachines',
    attrs: {
      id: ID,
      name: NAME,
      resource_group_name: RG,
      location: LOCATION,
      size: { kind: 'string', required: true, arm: 'vmSize' },
      admin_username: { kind: 'string', required: true, forceNew: true },
      network_interface_ids: { kind: 'list', required: true },
      disable_password_authentication: { kind: 'bool', default: true, forceNew: true },
      zone: { kind: 'string', forceNew: true },
      virtual_machine_id: { kind: 'string', computed: true, arm: 'vmId' },
      tags: TAGS,
    },
    blocks: {
      os_disk: {
        required: true,
        max: 1,
        attrs: {
          caching: { kind: 'string', required: true },
          storage_account_type: { kind: 'string', required: true },
          disk_size_gb: { kind: 'number', optionalComputed: true },
          name: { kind: 'string', optionalComputed: true, forceNew: true },
        },
      },
      source_image_reference: {
        max: 1,
        forceNew: true,
        attrs: {
          publisher: { kind: 'string', required: true },
          offer: { kind: 'string', required: true },
          sku: { kind: 'string', required: true },
          version: { kind: 'string', required: true },
        },
      },
      admin_ssh_key: {
        forceNew: true,
        attrs: {
          username: { kind: 'string', required: true },
          public_key: { kind: 'string', required: true },
        },
      },
    },
    id: (attrs, sub) =>
      provider(sub, attrs.resource_group_name, 'Microsoft.Compute/virtualMachines', attrs.name),
    idPattern:
      /^\/subscriptions\/[^/]+\/resourceGroups\/[^/]+\/providers\/Microsoft\.Compute\/virtualMachines\/[^/]+$/i,
    fromId: (id) => ({ name: lastSegment(id), resource_group_name: segment(id, 'resourceGroups') }),
    computed: (_attrs, id) => ({ virtual_machine_id: fakeGuid(`vm:${id}`) }),
    seconds: 52,
  },
}

export const resourceTypes = Object.keys(schemas)

/** Data sources the lab supports. */
export const dataSources: Record<string, { attrs: string[] }> = {
  azurerm_client_config: { attrs: [] },
  azurerm_resource_group: { attrs: ['name'] },
  azurerm_subscription: { attrs: [] },
}

/** Fills in defaults and computed values, as Azure would after a create. */
export function completeAttrs(type: string, attrs: Attrs, subscriptionId: string): Attrs {
  const schema = schemas[type]
  const out: Attrs = {}
  for (const [name, attr] of Object.entries(schema.attrs)) {
    if (name in attrs && attrs[name] !== undefined) out[name] = attrs[name]
    else if (attr.default !== undefined) out[name] = attr.default
    else out[name] = attr.kind === 'map' ? null : null
  }
  for (const [name, block] of Object.entries(schema.blocks)) {
    const items = Array.isArray(attrs[name]) ? (attrs[name] as Attrs[]) : []
    out[name] = items.map((item) => {
      const full: Attrs = {}
      for (const [inner, attr] of Object.entries(block.attrs))
        full[inner] = inner in item ? item[inner] : (attr.default ?? null)
      return full
    })
  }
  const id = schema.id(out, subscriptionId)
  out.id = id
  Object.assign(out, schema.computed(out, id))
  return out
}

/** Arguments whose change forces a new resource, given before / after values. */
export function forcesNew(type: string, before: Attrs, after: Attrs, changed: string[]): string[] {
  const schema = schemas[type]
  const out = new Set<string>()
  for (const name of changed) {
    if (schema.attrs[name]?.forceNew) out.add(name)
    const block = schema.blocks[name]
    if (block) {
      if (block.forceNew) out.add(name)
      const a = (before[name] as Attrs[] | null) ?? []
      const b = (after[name] as Attrs[] | null) ?? []
      for (const [inner, attr] of Object.entries(block.attrs))
        if (attr.forceNew && a.length && b.length && !deepEqual(a[0]?.[inner], b[0]?.[inner]))
          out.add(name)
    }
  }
  for (const name of schema.forceNewIf?.(before, after) ?? []) out.add(name)
  return [...out]
}

const camel = (name: string) =>
  name.replace(/_([a-z])/g, (_, letter: string) => letter.toUpperCase())

/** The resource as `az resource show` would print it (ARM JSON, simplified). */
export function armView(
  type: string,
  attrs: Attrs,
  meta: { createdAt: string; createdBy: string; modifiedAt: string; modifiedBy: string },
): Record<string, Value> {
  const schema = schemas[type]
  const properties: Record<string, Value> = {}
  for (const [name, attr] of Object.entries(schema.attrs)) {
    if (['id', 'name', 'location', 'tags', 'resource_group_name'].includes(name)) continue
    const value = attrs[name]
    if (value === null || value === undefined) continue
    const key = attr.arm ?? camel(name)
    properties[key] =
      key === 'publicNetworkAccess' && typeof value === 'boolean'
        ? value
          ? 'Enabled'
          : 'Disabled'
        : value
  }
  for (const name of Object.keys(schema.blocks)) {
    const value = attrs[name]
    if (Array.isArray(value) && value.length)
      properties[camel(name)] = value.length === 1 ? value[0] : value
  }
  const view: Record<string, Value> = {
    id: String(attrs.id),
    name: String(attrs.name),
    type: schema.armType,
  }
  if (type !== 'azurerm_subnet') view.location = (attrs.location as Value) ?? null
  if (attrs.resource_group_name) view.resourceGroup = attrs.resource_group_name
  if (type === 'azurerm_storage_account') {
    view.kind = attrs.account_kind
    view.sku = {
      name: `${String(attrs.account_tier)}_${String(attrs.account_replication_type)}`,
      tier: attrs.account_tier,
    }
    delete properties.accountKind
    delete properties.accountTier
    delete properties.accountReplicationType
  }
  if (type === 'azurerm_service_plan') {
    view.sku = { name: attrs.sku_name, capacity: attrs.worker_count ?? 1 }
    delete properties.skuName
    delete properties.workerCount
  }
  view.properties =
    type === 'azurerm_resource_group'
      ? { provisioningState: 'Succeeded' }
      : { ...properties, provisioningState: 'Succeeded' }
  view.tags = (attrs.tags as Value) ?? {}
  view.systemData = {
    createdAt: meta.createdAt,
    createdBy: meta.createdBy,
    lastModifiedAt: meta.modifiedAt,
    lastModifiedBy: meta.modifiedBy,
  }
  return view
}

/** The resource type a given Azure ID belongs to, if the lab knows it. */
export function typeForId(id: string): string | null {
  const match = resourceTypes.filter((type) => schemas[type].idPattern.test(id))
  // A subnet ID also matches nothing else; a VNet ID only the VNet pattern.
  return match[0] ?? null
}
