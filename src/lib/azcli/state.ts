/**
 * The simulated Azure subscription: everything the CLI simulator's commands
 * read and change. Plain JSON, so it can be saved in the browser, reset, and
 * queried with JMESPath by the missions.
 */

export const SUBSCRIPTION_ID = '00000000-1111-2222-3333-444444444444'
export const TENANT_ID = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee'
export const SUBSCRIPTION_NAME = 'Azure Learning Hub (simulated)'
export const USER = 'learner@contoso.onmicrosoft.com'

export interface ResourceGroup {
  name: string
  location: string
  tags: Record<string, string>
}

export interface Subnet {
  name: string
  addressPrefix: string
  nsg: string | null
}

export interface VirtualNetwork {
  name: string
  resourceGroup: string
  location: string
  addressPrefixes: string[]
  subnets: Subnet[]
  tags: Record<string, string>
}

export interface NsgRule {
  name: string
  priority: number
  direction: 'Inbound' | 'Outbound'
  access: 'Allow' | 'Deny'
  protocol: string
  sourceAddressPrefix: string
  sourcePortRange: string
  destinationAddressPrefix: string
  destinationPortRanges: string[]
}

export interface NetworkSecurityGroup {
  name: string
  resourceGroup: string
  location: string
  rules: NsgRule[]
  tags: Record<string, string>
}

export interface VirtualMachine {
  name: string
  resourceGroup: string
  location: string
  size: string
  image: string
  osType: 'Linux' | 'Windows'
  adminUsername: string
  powerState: 'VM running' | 'VM stopped' | 'VM deallocated'
  vnet: string
  subnet: string
  privateIp: string
  publicIp: string | null
  tags: Record<string, string>
}

export interface StorageAccount {
  name: string
  resourceGroup: string
  location: string
  sku: string
  kind: string
  minimumTlsVersion: string
  enableHttpsTrafficOnly: boolean
  allowBlobPublicAccess: boolean
  tags: Record<string, string>
}

export interface Lock {
  name: string
  resourceGroup: string
  level: 'CanNotDelete' | 'ReadOnly'
  notes: string | null
}

export interface CloudState {
  resourceGroups: ResourceGroup[]
  vnets: VirtualNetwork[]
  nsgs: NetworkSecurityGroup[]
  vms: VirtualMachine[]
  storageAccounts: StorageAccount[]
  locks: Lock[]
  /** Commands that ran successfully, oldest first. Missions can look at it. */
  history: string[]
}

export const emptyCloud = (): CloudState => ({
  resourceGroups: [],
  vnets: [],
  nsgs: [],
  vms: [],
  storageAccounts: [],
  locks: [],
  history: [],
})

/** Regions the simulator accepts, as `az account list-locations` would name them. */
export const LOCATIONS: Record<string, string> = {
  uksouth: 'UK South',
  ukwest: 'UK West',
  northeurope: 'North Europe',
  westeurope: 'West Europe',
  eastus: 'East US',
  eastus2: 'East US 2',
  westus2: 'West US 2',
  centralindia: 'Central India',
  southeastasia: 'Southeast Asia',
  australiaeast: 'Australia East',
}

export const resourceId = (group: string, provider: string, type: string, name: string) =>
  `/subscriptions/${SUBSCRIPTION_ID}/resourceGroups/${group}/providers/${provider}/${type}/${name}`

export const groupId = (name: string) => `/subscriptions/${SUBSCRIPTION_ID}/resourceGroups/${name}`

/* ------------------------------------------------------------ persistence */

export const CLOUD_KEY = 'azure-learning-hub.azcli-cloud'

export function loadCloud(): CloudState {
  try {
    const raw = window.localStorage.getItem(CLOUD_KEY)
    if (!raw) return emptyCloud()
    return { ...emptyCloud(), ...(JSON.parse(raw) as Partial<CloudState>) }
  } catch {
    return emptyCloud()
  }
}

export function saveCloud(state: CloudState) {
  try {
    window.localStorage.setItem(CLOUD_KEY, JSON.stringify(state))
  } catch {
    /* The simulated cloud just will not survive a reload. */
  }
}
