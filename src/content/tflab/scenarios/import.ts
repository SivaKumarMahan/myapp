import type { TfScenario } from '../types'
import { backendResources, providersTf, storageId } from './common'

const exportsMain = `resource "azurerm_resource_group" "shop" {
  name     = "rg-shop-prod"
  location = "westeurope"
}

resource "azurerm_storage_account" "media" {
  name                     = "stshopmediaprod01"
  resource_group_name      = azurerm_resource_group.shop.name
  location                 = azurerm_resource_group.shop.location
  account_tier             = "Standard"
  account_replication_type = "GRS"

  tags = {
    app = "shop"
  }
}

# PR #301: bring the nightly-exports account under Terraform.
resource "azurerm_storage_account" "exports" {
  name                            = "stshopexports01"
  resource_group_name             = azurerm_resource_group.shop.name
  location                        = azurerm_resource_group.shop.location
  account_tier                    = "Standard"
  account_replication_type        = "LRS"
  allow_nested_items_to_be_public = false

  tags = {
    app = "shop"
  }
}
`

const EXPORTS_ID = storageId('rg-shop-prod', 'stshopexports01')

const importTf = `import {
  to = azurerm_storage_account.exports
  id = "${EXPORTS_ID}"
}
`

const importPortal: TfScenario = {
  id: 'import-portal',
  title: '"Already exists": adopt a portal-made resource',
  category: 'Import & adoption',
  level: 'medium',
  story:
    'During last night\'s incident, Jane created `stshopexports01` in the portal so the nightly export job had somewhere to write. Today PR #301 adds it to Terraform. The plan looked perfectly clean - **1 to add** - so the pipeline applied it and failed with "A resource with the ID ... already exists". The export job is writing to that account right now.',
  task: 'Bring the existing account under Terraform at `azurerm_storage_account.exports` - without deleting it, creating a second account or renaming it - and finish with a clean plan.',
  seed: {
    files: { 'providers.tf': providersTf('shop-prod.terraform.tfstate'), 'main.tf': exportsMain },
    cloud: [
      ...backendResources(),
      {
        key: 'rg',
        type: 'azurerm_resource_group',
        attrs: { name: 'rg-shop-prod', location: 'westeurope' },
        createdAt: '2023-05-02T08:14:10Z',
      },
      {
        key: 'media',
        type: 'azurerm_storage_account',
        attrs: {
          name: 'stshopmediaprod01',
          resource_group_name: 'rg-shop-prod',
          location: 'westeurope',
          account_tier: 'Standard',
          account_replication_type: 'GRS',
          tags: { app: 'shop' },
        },
        createdAt: '2023-05-02T08:20:31Z',
      },
      {
        key: 'exports',
        type: 'azurerm_storage_account',
        attrs: {
          name: 'stshopexports01',
          resource_group_name: 'rg-shop-prod',
          location: 'westeurope',
          account_tier: 'Standard',
          account_replication_type: 'LRS',
          allow_nested_items_to_be_public: false,
        },
        createdAt: '2026-11-10T22:41:07Z',
        createdBy: 'jane.doe@contoso.com',
      },
    ],
    state: [
      { addr: 'azurerm_resource_group.shop', key: 'rg' },
      { addr: 'azurerm_storage_account.media', key: 'media' },
    ],
    activity: [
      {
        time: '2026-11-10T22:41:07Z',
        caller: 'jane.doe@contoso.com',
        operation: 'Microsoft.Storage/storageAccounts/write',
        resource: EXPORTS_ID,
        status: 'Succeeded',
      },
    ],
    stateKey: 'shop-prod.terraform.tfstate',
  },
  lookAt: [
    'terraform plan',
    'terraform apply -auto-approve',
    'az resource list -g rg-shop-prod -o table',
  ],
  hints: [
    'Plan cannot know the account exists - it only compares code with **state**, and state has never heard of it. The provider finds out during apply, when it checks before creating.',
    'You need the resource ID. `az resource list -g rg-shop-prod -o table` shows the account; `az storage account show -n stshopexports01 --query id -o tsv` prints its ID.',
    'Add an `import` block (`to = azurerm_storage_account.exports`, `id = "<the ID>"`), then plan: it should say **1 to import**. Or run `terraform import azurerm_storage_account.exports <ID>`.',
  ],
  solution: [
    { kind: 'run', command: 'az storage account show -n stshopexports01 --query id -o tsv' },
    { kind: 'write', path: 'imports.tf', content: importTf },
    { kind: 'run', command: 'terraform plan' },
    { kind: 'run', command: 'terraform apply -auto-approve' },
  ],
  alternative: {
    label: 'CLI alternative: terraform import',
    steps: [
      { kind: 'run', command: `terraform import azurerm_storage_account.exports ${EXPORTS_ID}` },
      { kind: 'run', command: 'terraform apply -auto-approve' },
    ],
  },
  explanation: [
    {
      code: 'az storage account show ... --query id -o tsv',
      note: 'Gets the exact ARM ID. Import IDs are case-sensitive in places and must be the full ID, not just the name.',
    },
    {
      code: 'import { to = ...exports  id = "/subscriptions/.../stshopexports01" }',
      note: 'Config-driven import (Terraform 1.5+). It is reviewed in the PR and shown in the plan as `will be imported`, then `will be updated in-place` for the tag the portal version lacks.',
    },
    {
      code: 'terraform apply -auto-approve',
      note: '**Apply complete! Resources: 1 imported, 0 added, 1 changed, 0 destroyed.** The import block can be deleted afterwards - it is a no-op once the object is in state.',
    },
    {
      code: 'terraform import ADDR ID',
      note: 'The older CLI way writes straight to state with no plan to review first. Fine in an emergency; prefer the block in a team.',
    },
  ],
  wrongFixes: [
    {
      label: 'Retry the apply',
      steps: [{ kind: 'run', command: 'terraform apply -auto-approve' }],
    },
    {
      label: 'Rename it in code to dodge the clash',
      steps: [
        {
          kind: 'write',
          path: 'main.tf',
          content: exportsMain.replace('"stshopexports01"', '"stshopexports02"'),
        },
        { kind: 'run', command: 'terraform apply -auto-approve' },
      ],
    },
  ],
  expect: {
    state: [
      'azurerm_resource_group.shop',
      'azurerm_storage_account.exports',
      'azurerm_storage_account.media',
    ],
    stateAttrs: [
      {
        addr: 'azurerm_storage_account.exports',
        path: 'name',
        equals: 'stshopexports01',
        label:
          'azurerm_storage_account.exports should track the account Jane created (stshopexports01).',
      },
    ],
    cloud: [
      {
        key: 'exports',
        path: 'tags.app',
        equals: 'shop',
        label: 'After import, Terraform should have added the app tag to the account.',
      },
    ],
  },
  question: {
    prompt: 'Why was the plan clean when the apply was always going to fail?',
    options: [
      {
        text: 'Plan compares configuration with state (plus a refresh of objects already in state). An object that is not in state is invisible until the provider tries to create it.',
        correct: true,
        why: 'Right. azurerm checks for an existing resource during create and refuses, telling you to import it.',
      },
      {
        text: 'The plan was stale because it was not saved with -out.',
        why: 'A saved plan would have been just as clean - state still did not know the account.',
      },
      {
        text: 'Storage account names are global, so plan cannot check them.',
        why: "This account is in your own subscription; the issue is that Terraform's state has no record of it.",
      },
      {
        text: 'The provider skips refresh for storage accounts to save time.',
        why: 'Refresh only covers addresses already in state; there is nothing to skip here.',
      },
    ],
  },
  followUp:
    'You inherit 200 portal-built resources. How do you import them efficiently? (Answer: generate `import` blocks, run `terraform plan -generate-config-out=generated.tf` to draft the code, then clean it up and review the plan until it shows only imports.)',
  tags: ['terraform', 'import', 'already exists', 'adoption', 'portal'],
  related: ['itv-tf-13', 'itv-rglb2-7', 'itv-aziac-15', 'itv-mytf-92'],
}

export const importScenarios: TfScenario[] = [importPortal]
