import type { EnvSeed } from '../../../lib/tflab/engine'
import type { TfScenario } from '../types'
import { backendResources, providersTf } from './common'

const backupMain = (name: string) => `resource "azurerm_resource_group" "backup" {
  name     = "rg-shop-backup-prod"
  location = "westeurope"
}

# New: nightly database exports land here.
resource "azurerm_storage_account" "backup" {
  name                            = "${name}"
  resource_group_name             = azurerm_resource_group.backup.name
  location                        = azurerm_resource_group.backup.location
  account_tier                    = "Standard"
  account_replication_type        = "GRS"
  access_tier                     = "Cool"
  allow_nested_items_to_be_public = false
}

output "backup_endpoint" {
  value = azurerm_storage_account.backup.primary_blob_endpoint
}
`

const nameTaken: TfScenario = {
  id: 'name-taken',
  title: 'Clean plan, failed apply: the name is taken',
  category: 'Apply errors',
  level: 'simple',
  story:
    'You are adding a storage account for nightly database exports. Validate passed, the plan was clean - **1 to add** - and the apply failed after a few seconds. Your subscription has no account called `stbackup01`, and the reviewer asks how a clean plan can fail.',
  task: 'Get the backup account created and the plan clean. Find out why the apply failed before you change anything.',
  seed: {
    files: {
      'providers.tf': providersTf('shop-backup.terraform.tfstate'),
      'main.tf': backupMain('stbackup01'),
    },
    cloud: [
      ...backendResources(),
      {
        key: 'rg',
        type: 'azurerm_resource_group',
        attrs: { name: 'rg-shop-backup-prod', location: 'westeurope' },
        createdAt: '2025-01-15T10:00:00Z',
      },
    ],
    state: [{ addr: 'azurerm_resource_group.backup', key: 'rg' }],
    takenNames: ['stbackup01', 'stshopbackup', 'stbackupprod'],
    stateKey: 'shop-backup.terraform.tfstate',
  },
  lookAt: [
    'terraform plan',
    'terraform apply -auto-approve',
    'az storage account check-name -n stbackup01',
  ],
  hints: [
    'Read the error after "with error:" - the code is `StorageAccountAlreadyTaken`. Is the account in your subscription? `az resource list -o table` says no.',
    'Storage account names become DNS names (`<name>.blob.core.windows.net`), so they are unique across **all of Azure**, not just your subscription. `az storage account check-name -n <name>` tells you if one is free.',
    'Pick a more specific name (3-24 lowercase letters and digits, e.g. `stshopbackupprod01`), check it, plan and apply.',
  ],
  solution: [
    { kind: 'run', command: 'az storage account check-name -n stbackup01' },
    { kind: 'run', command: 'az storage account check-name -n stshopbackupprod01' },
    { kind: 'write', path: 'main.tf', content: backupMain('stshopbackupprod01') },
    { kind: 'run', command: 'terraform plan' },
    { kind: 'run', command: 'terraform apply -auto-approve' },
  ],
  explanation: [
    {
      code: 'az storage account check-name -n stbackup01',
      note: '`"nameAvailable": false, "reason": "AlreadyExists"` - someone, somewhere in Azure, owns it.',
    },
    {
      code: 'name = "stshopbackupprod01"',
      note: 'Use a naming convention with app, purpose, environment and an instance number (or a short random suffix from the random provider) for global names.',
    },
    {
      code: 'terraform plan / apply',
      note: 'Plan is clean, apply creates the account and prints the `backup_endpoint` output.',
    },
    {
      code: 'Why plan could not catch it',
      note: 'Plan only compares code, state and refreshed state. Name availability is checked by Azure when the provider sends the create request.',
    },
  ],
  wrongFixes: [
    {
      label: 'Retry the apply',
      steps: [{ kind: 'run', command: 'terraform apply -auto-approve' }],
    },
    {
      label: 'Use a name with dashes',
      steps: [
        { kind: 'write', path: 'main.tf', content: backupMain('st-shop-backup-prod') },
        { kind: 'run', command: 'terraform apply -auto-approve' },
      ],
    },
  ],
  expect: {
    newResources: 1,
    state: ['azurerm_resource_group.backup', 'azurerm_storage_account.backup'],
    config: [
      {
        kind: 'attr',
        addr: 'azurerm_storage_account.backup',
        attr: 'name',
        notEquals: 'stbackup01',
        label: 'The code still asks for stbackup01, which belongs to someone else.',
      },
    ],
  },
  question: {
    prompt: 'Why did a clean plan still fail on apply?',
    options: [
      {
        text: 'Storage account names are global DNS names. Plan never asks Azure whether a new name is free; only the create call finds out it is taken in another tenant.',
        correct: true,
        why: 'Right. The same applies to key vaults, web apps, SQL servers and other resources with public DNS names.',
      },
      {
        text: 'The plan was not saved with -out, so apply used a different plan.',
        why: 'Both plans were identical; the failure came from Azure on create.',
      },
      {
        text: 'The resource group was locked.',
        why: 'A lock would fail with ScopeLocked, not StorageAccountAlreadyTaken.',
      },
      {
        text: 'The account exists in your subscription and needs importing.',
        why: 'Your subscription has no such account - an import would fail with "Cannot import non-existent remote object".',
      },
    ],
  },
  followUp:
    'Name some other reasons a clean plan can fail on apply. (Answers: quota or SKU not available in the region, missing RBAC on the service principal, Azure Policy deny, a resource lock, a soft-deleted key vault holding the name, API throttling.)',
  tags: ['terraform', 'apply', 'storage', 'naming', 'global names'],
  related: ['itv-rglb1-16', 'itv-rglb3-10', 'itv-rglb3-9'],
}

export const applyErrorScenarios: TfScenario[] = [nameTaken]

/* ---------- the free-play sandbox ---------- */

const sandboxMain = `data "azurerm_client_config" "current" {}

locals {
  tags = {
    env   = "sandbox"
    owner = "you"
  }
}

resource "azurerm_resource_group" "lab" {
  name     = "rg-tflab-sandbox"
  location = "westeurope"
  tags     = local.tags
}

resource "azurerm_virtual_network" "lab" {
  name                = "vnet-tflab"
  resource_group_name = azurerm_resource_group.lab.name
  location            = azurerm_resource_group.lab.location
  address_space       = ["10.50.0.0/16"]
}

resource "azurerm_subnet" "lab" {
  for_each = {
    web  = "10.50.1.0/24"
    data = "10.50.2.0/24"
  }

  name                 = "snet-\${each.key}"
  resource_group_name  = azurerm_resource_group.lab.name
  virtual_network_name = azurerm_virtual_network.lab.name
  address_prefixes     = [each.value]
}

resource "azurerm_storage_account" "lab" {
  name                     = "sttflabsandbox01"
  resource_group_name      = azurerm_resource_group.lab.name
  location                 = azurerm_resource_group.lab.location
  account_tier             = "Standard"
  account_replication_type = "LRS"
  tags                     = local.tags
}

output "storage_endpoint" {
  value = azurerm_storage_account.lab.primary_blob_endpoint
}
`

/** The sandbox: a small working environment, already applied. */
export const sandboxSeed: EnvSeed = {
  files: { 'providers.tf': providersTf('sandbox.terraform.tfstate'), 'main.tf': sandboxMain },
  cloud: [
    ...backendResources(),
    {
      key: 'rg',
      type: 'azurerm_resource_group',
      attrs: {
        name: 'rg-tflab-sandbox',
        location: 'westeurope',
        tags: { env: 'sandbox', owner: 'you' },
      },
    },
    {
      key: 'vnet',
      type: 'azurerm_virtual_network',
      attrs: {
        name: 'vnet-tflab',
        resource_group_name: 'rg-tflab-sandbox',
        location: 'westeurope',
        address_space: ['10.50.0.0/16'],
      },
    },
    {
      key: 'web',
      type: 'azurerm_subnet',
      attrs: {
        name: 'snet-web',
        resource_group_name: 'rg-tflab-sandbox',
        virtual_network_name: 'vnet-tflab',
        address_prefixes: ['10.50.1.0/24'],
      },
    },
    {
      key: 'data',
      type: 'azurerm_subnet',
      attrs: {
        name: 'snet-data',
        resource_group_name: 'rg-tflab-sandbox',
        virtual_network_name: 'vnet-tflab',
        address_prefixes: ['10.50.2.0/24'],
      },
    },
    {
      key: 'sa',
      type: 'azurerm_storage_account',
      attrs: {
        name: 'sttflabsandbox01',
        resource_group_name: 'rg-tflab-sandbox',
        location: 'westeurope',
        account_tier: 'Standard',
        account_replication_type: 'LRS',
        tags: { env: 'sandbox', owner: 'you' },
      },
    },
    {
      key: 'portal-kv',
      type: 'azurerm_key_vault',
      attrs: {
        name: 'kv-tflab-portal',
        resource_group_name: 'rg-tflab-sandbox',
        location: 'westeurope',
        tenant_id: '9b8a7c6d-2e1f-4a3b-8c5d-6e7f8a9b0c1d',
        sku_name: 'standard',
      },
      createdBy: 'you@contoso.com',
    },
  ],
  state: [
    { addr: 'azurerm_resource_group.lab', key: 'rg' },
    { addr: 'azurerm_storage_account.lab', key: 'sa' },
    { addr: 'azurerm_subnet.lab["data"]', key: 'data' },
    { addr: 'azurerm_subnet.lab["web"]', key: 'web' },
    { addr: 'azurerm_virtual_network.lab', key: 'vnet' },
  ],
  takenNames: ['stbackup01', 'stdata', 'kv-prod'],
  stateKey: 'sandbox.terraform.tfstate',
}
