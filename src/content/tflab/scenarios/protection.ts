import type { TfScenario } from '../types'
import { backendResources, providersTf } from './common'

/* ---------- a ForceNew change hidden in a PR ---------- */

const analyticsMain = (location: string) => `resource "azurerm_resource_group" "analytics" {
  name     = "rg-analytics-prod"
  location = "westeurope"
}

resource "azurerm_storage_account" "lake" {
  name                     = "stanalyticslake01"
  resource_group_name      = azurerm_resource_group.analytics.name
  location                 = ${location}
  account_tier             = "Standard"
  account_replication_type = "GRS"
  is_hns_enabled           = true

  tags = {
    owner = "data-platform"
  }
}
`

const forceNew: TfScenario = {
  id: 'force-new-location',
  title: 'A one-line PR that replaces the data lake',
  category: 'Protection',
  level: 'simple',
  story:
    'A pull request titled "tag the lake with its owner" adds `owner = "data-platform"`. While in there, the author also "fixed" the location to northeurope because most analysts sit in Dublin. The plan says **1 to add, 0 to change, 1 to destroy** for a data lake with 40 TB in it.',
  task: 'Ship the owner tag only. The data lake must stay in westeurope and must not be replaced; finish with a clean plan.',
  seed: {
    files: {
      'providers.tf': providersTf('analytics.terraform.tfstate'),
      'main.tf': analyticsMain('"northeurope"'),
    },
    cloud: [
      ...backendResources(),
      {
        key: 'rg',
        type: 'azurerm_resource_group',
        attrs: { name: 'rg-analytics-prod', location: 'westeurope' },
        createdAt: '2023-10-03T12:00:00Z',
      },
      {
        key: 'lake',
        type: 'azurerm_storage_account',
        attrs: {
          name: 'stanalyticslake01',
          resource_group_name: 'rg-analytics-prod',
          location: 'westeurope',
          account_tier: 'Standard',
          account_replication_type: 'GRS',
          is_hns_enabled: true,
        },
        createdAt: '2023-10-03T12:04:18Z',
      },
    ],
    state: [
      { addr: 'azurerm_resource_group.analytics', key: 'rg' },
      { addr: 'azurerm_storage_account.lake', key: 'lake' },
    ],
    stateKey: 'analytics.terraform.tfstate',
  },
  lookAt: ['terraform plan', 'cat main.tf'],
  hints: [
    'Find the line in the plan ending `# forces replacement`. That attribute cannot be changed on an existing resource - the provider can only delete and recreate it.',
    'A storage account cannot move region. The tag, on the other hand, is an in-place update (`~`).',
    'Put `location` back to `azurerm_resource_group.analytics.location` (westeurope), plan - it should show only `~ tags` - and apply.',
  ],
  solution: [
    {
      kind: 'write',
      path: 'main.tf',
      content: analyticsMain('azurerm_resource_group.analytics.location'),
    },
    { kind: 'run', command: 'terraform plan -out=tfplan' },
    { kind: 'run', command: 'terraform apply tfplan' },
  ],
  explanation: [
    {
      code: '~ location = "westeurope" -> "northeurope" # forces replacement',
      note: 'Location, name, resource group, `account_tier` and `is_hns_enabled` are ForceNew on storage accounts. A replacement is a delete: the 40 TB would be gone.',
    },
    {
      code: 'location = azurerm_resource_group.analytics.location',
      note: 'Revert the risky part. Moving data between regions is a migration project (new account, copy with AzCopy or object replication, cut over), not a one-line change.',
    },
    {
      code: 'terraform plan -out=tfplan',
      note: 'Now **0 to add, 1 to change, 0 to destroy** - only the tag.',
    },
    {
      code: 'create_before_destroy?',
      note: 'Would not help: the new account needs the same globally unique name, so creating it first fails with "already exists". It suits resources with generated names.',
    },
  ],
  wrongFixes: [
    {
      label: 'Apply the PR as it is',
      steps: [{ kind: 'run', command: 'terraform apply -auto-approve' }],
    },
    {
      label: 'Add create_before_destroy and apply',
      steps: [
        {
          kind: 'write',
          path: 'main.tf',
          content: analyticsMain('"northeurope"').replace(
            '  tags = {\n    owner',
            '  lifecycle {\n    create_before_destroy = true\n  }\n\n  tags = {\n    owner',
          ),
        },
        { kind: 'run', command: 'terraform apply -auto-approve' },
      ],
    },
  ],
  expect: {
    state: ['azurerm_resource_group.analytics', 'azurerm_storage_account.lake'],
    config: [
      {
        kind: 'attr',
        addr: 'azurerm_storage_account.lake',
        attr: 'location',
        equals: 'westeurope',
        label: 'The code still puts the lake in another region.',
      },
    ],
    cloud: [
      {
        key: 'lake',
        path: 'tags.owner',
        equals: 'data-platform',
        label: 'The owner tag has not been applied to the data lake yet.',
      },
      {
        key: 'lake',
        path: 'location',
        equals: 'westeurope',
        label: 'The data lake is no longer in westeurope.',
      },
    ],
  },
  question: {
    prompt: 'Which statement about "forces replacement" is right?',
    options: [
      {
        text: 'The provider marks some arguments ForceNew because Azure cannot change them on an existing resource; changing one means delete and create, with any data lost.',
        correct: true,
        why: 'Right. Always scan a plan for `-/+` and `# forces replacement` before approving, especially on stateful resources.',
      },
      {
        text: 'Terraform replaces a resource whenever more than one attribute changes in the same plan.',
        why: 'Any number of in-place changes stay in place. Only ForceNew attributes trigger replacement.',
      },
      {
        text: 'Replacement keeps the data, because Azure copies it to the new resource.',
        why: 'Nothing is copied. The old resource is deleted.',
      },
      {
        text: '`create_before_destroy` makes any replacement safe.',
        why: 'It only changes the order. With a fixed, globally unique name the new resource cannot even be created.',
      },
    ],
  },
  followUp:
    'How would you stop a PR like this being approved by accident? (Answer: post the plan on the PR, fail the pipeline on any delete/replace of protected types via `terraform show -json` + a policy check (OPA/Conftest/Sentinel), and use `prevent_destroy` on stateful resources.)',
  tags: ['terraform', 'forcenew', 'replacement', 'storage', 'plan review'],
  related: ['itv-tf-29', 'itv-rglb1-18', 'itv-mytf-45', 'itv-racc-9'],
}

/* ---------- prevent_destroy on a key vault ---------- */

const vaultMain = (name: string, lifecycle: string) => `data "azurerm_client_config" "current" {}

resource "azurerm_resource_group" "security" {
  name     = "rg-shop-security-prod"
  location = "westeurope"
}

resource "azurerm_key_vault" "shop" {
  name                       = "${name}"
  resource_group_name        = azurerm_resource_group.security.name
  location                   = azurerm_resource_group.security.location
  tenant_id                  = data.azurerm_client_config.current.tenant_id
  sku_name                   = "premium"
  soft_delete_retention_days = 90
  purge_protection_enabled   = true

  tags = {
    data_classification = "confidential"
  }
${lifecycle}}
`

const preventDestroy = `
  lifecycle {
    prevent_destroy = true
  }
`

const keyVault: TfScenario = {
  id: 'prevent-destroy-kv',
  title: 'Guard the production key vault',
  category: 'Protection',
  level: 'medium',
  story:
    "The production key vault holds the payment provider keys and the TLS certificates. A naming-standards PR renames it to `kv-shop-prod-weu-01` and adds a data-classification tag. Nobody noticed that renaming a vault means a new, empty vault. After last quarter's near miss, the team agreed every stateful production resource gets a guard.",
  task: 'Add a guard so that no plan can ever destroy or replace this vault, keep its current name `kv-shop-prod-01`, ship the tag, and finish with a clean plan.',
  seed: {
    files: {
      'providers.tf': providersTf('shop-security.terraform.tfstate'),
      'main.tf': vaultMain('kv-shop-prod-weu-01', ''),
    },
    cloud: [
      ...backendResources(),
      {
        key: 'rg',
        type: 'azurerm_resource_group',
        attrs: { name: 'rg-shop-security-prod', location: 'westeurope' },
        createdAt: '2023-05-02T08:30:00Z',
      },
      {
        key: 'kv',
        type: 'azurerm_key_vault',
        attrs: {
          name: 'kv-shop-prod-01',
          resource_group_name: 'rg-shop-security-prod',
          location: 'westeurope',
          tenant_id: '9b8a7c6d-2e1f-4a3b-8c5d-6e7f8a9b0c1d',
          sku_name: 'premium',
          soft_delete_retention_days: 90,
          purge_protection_enabled: true,
        },
        createdAt: '2023-05-02T08:33:47Z',
      },
    ],
    state: [
      { addr: 'azurerm_resource_group.security', key: 'rg' },
      { addr: 'azurerm_key_vault.shop', key: 'kv' },
    ],
    stateKey: 'shop-security.terraform.tfstate',
  },
  lookAt: ['terraform plan', 'cat main.tf', 'az keyvault show -n kv-shop-prod-01'],
  hints: [
    'The plan shows `-/+` with `name ... # forces replacement`. A key vault name is part of its URI (`https://<name>.vault.azure.net/`), so it can never be renamed in place.',
    'The guard is a lifecycle setting: `lifecycle { prevent_destroy = true }` inside the key vault block. Add it first and plan - the plan should now **fail** with "Instance cannot be destroyed".',
    'Then put the name back to "kv-shop-prod-01" (keep the tag), plan - only `~ tags` - and apply.',
  ],
  solution: [
    { kind: 'write', path: 'main.tf', content: vaultMain('kv-shop-prod-weu-01', preventDestroy) },
    { kind: 'run', command: 'terraform plan' },
    { kind: 'write', path: 'main.tf', content: vaultMain('kv-shop-prod-01', preventDestroy) },
    { kind: 'run', command: 'terraform plan' },
    { kind: 'run', command: 'terraform apply -auto-approve' },
  ],
  explanation: [
    {
      code: 'lifecycle { prevent_destroy = true }',
      note: 'Makes any plan that would destroy this instance - including a replacement - fail with **Error: Instance cannot be destroyed**. It is a guard rail on the plan, not an Azure lock.',
    },
    {
      code: 'terraform plan (with the rename)',
      note: 'Fails, pointing at the key vault block. This is what you want a bad PR to hit in CI.',
    },
    {
      code: 'name = "kv-shop-prod-01"',
      note: 'Revert the rename. Naming standards apply to new vaults; existing ones keep their names (or get a planned migration).',
    },
    {
      code: 'Limits',
      note: 'prevent_destroy lives in the resource block: delete the whole block and the guard goes with it. Pair it with an Azure resource lock (CanNotDelete) and purge protection for real defence in depth.',
    },
  ],
  wrongFixes: [
    {
      label: 'Apply the rename',
      steps: [{ kind: 'run', command: 'terraform apply -auto-approve' }],
    },
    {
      label: 'Revert the name but add no guard',
      steps: [
        { kind: 'write', path: 'main.tf', content: vaultMain('kv-shop-prod-01', '') },
        { kind: 'run', command: 'terraform apply -auto-approve' },
      ],
    },
  ],
  expect: {
    state: ['azurerm_key_vault.shop', 'azurerm_resource_group.security'],
    config: [
      {
        kind: 'prevent-destroy',
        addr: 'azurerm_key_vault.shop',
        label:
          'The key vault has no guard: add lifecycle { prevent_destroy = true } so a future plan cannot destroy it.',
      },
      {
        kind: 'attr',
        addr: 'azurerm_key_vault.shop',
        attr: 'name',
        equals: 'kv-shop-prod-01',
        label: 'The vault must keep the name kv-shop-prod-01.',
      },
    ],
    cloud: [
      {
        key: 'kv',
        path: 'tags.data_classification',
        equals: 'confidential',
        label: 'The data_classification tag has not reached the vault yet.',
      },
    ],
  },
  question: {
    prompt: 'What does `prevent_destroy = true` protect against, and what does it not?',
    options: [
      {
        text: 'It fails any plan that would destroy or replace that resource while its block is in the code - but deleting the block (or `terraform state rm`) removes the guard.',
        correct: true,
        why: 'Right. It protects against accidental replacements and destroys in a plan. For protection outside Terraform, add an Azure lock and purge protection.',
      },
      {
        text: 'It creates an Azure CanNotDelete lock on the resource.',
        why: 'It is purely a Terraform plan-time check. Azure knows nothing about it.',
      },
      {
        text: 'It makes the provider rename the vault in place instead of replacing it.',
        why: 'Nothing can rename a key vault in place. The plan simply fails instead.',
      },
      {
        text: 'It stops anyone deleting the vault in the portal.',
        why: 'The portal (and az CLI) ignore Terraform settings entirely. Use RBAC and resource locks.',
      },
    ],
  },
  followUp:
    'Your vault has purge protection on and someone destroys it anyway. Can you recreate it with the same name? (Answer: not as a new vault - the name stays reserved by the soft-deleted vault until the retention period ends; you recover it instead.)',
  tags: ['terraform', 'prevent_destroy', 'lifecycle', 'key vault', 'protection'],
  related: ['itv-mytf-15', 'itv-mytf-39', 'itv-tf-32'],
}

export const protectionScenarios: TfScenario[] = [forceNew, keyVault]
