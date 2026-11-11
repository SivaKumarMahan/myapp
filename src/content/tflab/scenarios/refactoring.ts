import type { TfScenario } from '../types'
import { backendResources, providersTf } from './common'

const shopLocals = `locals {
  tags = {
    app = "shop"
    env = "prod"
  }
}
`

const renameMain = `resource "azurerm_resource_group" "shop" {
  name     = "rg-shop-prod"
  location = "westeurope"

  tags = local.tags
}

# PR #212: renamed from "logs" - the account now holds diagnostics too.
resource "azurerm_storage_account" "diagnostics" {
  name                     = "stshopdiagprod01"
  resource_group_name      = azurerm_resource_group.shop.name
  location                 = azurerm_resource_group.shop.location
  account_tier             = "Standard"
  account_replication_type = "GRS"
  min_tls_version          = "TLS1_2"

  tags = local.tags
}
`

const renameMoved = `moved {
  from = azurerm_storage_account.logs
  to   = azurerm_storage_account.diagnostics
}
`

const rename: TfScenario = {
  id: 'rename-moved',
  title: 'A rename that wants to delete production',
  category: 'Refactoring',
  level: 'simple',
  story:
    'A teammate renamed `azurerm_storage_account.logs` to `azurerm_storage_account.diagnostics` because the account now holds diagnostics as well as app logs. Nothing about the account itself changed. The pull request pipeline posted the plan, and a reviewer spotted **1 to add, 1 to destroy** on a storage account with three years of audit logs in it.',
  task: 'Get the rename merged without destroying the account: the code must use the new name, the plan must show no changes, and the storage account must be the same object it was this morning. Then explain why the plan looked like that.',
  seed: {
    files: {
      'providers.tf': providersTf('shop-prod.terraform.tfstate'),
      'locals.tf': shopLocals,
      'main.tf': renameMain,
    },
    cloud: [
      ...backendResources(),
      {
        key: 'rg',
        type: 'azurerm_resource_group',
        attrs: { name: 'rg-shop-prod', location: 'westeurope', tags: { app: 'shop', env: 'prod' } },
        createdAt: '2023-05-02T08:14:10Z',
      },
      {
        key: 'sa',
        type: 'azurerm_storage_account',
        attrs: {
          name: 'stshopdiagprod01',
          resource_group_name: 'rg-shop-prod',
          location: 'westeurope',
          account_tier: 'Standard',
          account_replication_type: 'GRS',
          tags: { app: 'shop', env: 'prod' },
        },
        createdAt: '2023-05-02T08:16:55Z',
      },
    ],
    state: [
      { addr: 'azurerm_resource_group.shop', key: 'rg' },
      { addr: 'azurerm_storage_account.logs', key: 'sa' },
    ],
    stateKey: 'shop-prod.terraform.tfstate',
  },
  lookAt: ['terraform plan', 'terraform state list', 'cat main.tf'],
  hints: [
    'Compare `terraform state list` with the resource blocks in main.tf. Which address does state know, and which does the code declare?',
    'Terraform matches code to real objects **by address**, not by Azure resource ID. A new address with no state means "create"; a state entry with no code means "destroy".',
    'Tell Terraform the old address and the new one are the same object: a `moved` block with `from = azurerm_storage_account.logs` and `to = azurerm_storage_account.diagnostics` (or `terraform state mv`).',
  ],
  solution: [
    { kind: 'write', path: 'moved.tf', content: renameMoved },
    { kind: 'run', command: 'terraform plan' },
    { kind: 'run', command: 'terraform apply -auto-approve' },
  ],
  alternative: {
    label: 'Imperative alternative: move it in state yourself',
    steps: [
      {
        kind: 'run',
        command:
          'terraform state mv azurerm_storage_account.logs azurerm_storage_account.diagnostics',
      },
      { kind: 'run', command: 'terraform plan' },
    ],
  },
  explanation: [
    {
      code: 'moved { from = ...logs  to = ...diagnostics }',
      note: 'Declares the rename in code. On the next plan Terraform rewrites the state address before diffing, so it sees one object with a new name instead of a delete and a create.',
    },
    {
      code: 'terraform plan',
      note: 'Now shows `# azurerm_storage_account.logs has moved to azurerm_storage_account.diagnostics` and **0 to add, 0 to change, 0 to destroy**.',
    },
    {
      code: 'terraform apply -auto-approve',
      note: 'Records the new address in state. The moved block can stay for a while (other workspaces and environments still need it) and be removed in a later release.',
    },
    {
      code: 'terraform state mv A B',
      note: 'Does the same thing directly in state - but it is a manual, unreviewed change to one state file. Every other environment (dev, test, other workspaces) needs the same command, and the pipeline knows nothing about it. Prefer `moved` (Terraform 1.1+).',
    },
  ],
  wrongFixes: [
    {
      label: 'Apply the plan as it is',
      steps: [{ kind: 'run', command: 'terraform apply -auto-approve' }],
    },
    {
      label: 'Drop the old address from state and apply',
      steps: [
        { kind: 'run', command: 'terraform state rm azurerm_storage_account.logs' },
        { kind: 'run', command: 'terraform apply -auto-approve' },
      ],
    },
  ],
  expect: {
    state: ['azurerm_resource_group.shop', 'azurerm_storage_account.diagnostics'],
    config: [
      {
        kind: 'declares',
        addr: 'azurerm_storage_account.diagnostics',
        label: 'The code should keep the new name, azurerm_storage_account.diagnostics.',
      },
      {
        kind: 'not-declares',
        addr: 'azurerm_storage_account.logs',
        label:
          'Reverting the rename avoids the problem but does not do the task - keep the new name.',
      },
    ],
  },
  question: {
    prompt: 'Why did the plan want to destroy and recreate the storage account?',
    options: [
      {
        text: 'Terraform tracks objects by resource address. The state had `...logs` with no matching code (destroy) and the code had `...diagnostics` with no state (create).',
        correct: true,
        why: 'Right - the Azure resource never changed. Only its address in Terraform did, and Terraform cannot guess two addresses are one object unless a `moved` block (or `state mv`) says so.',
      },
      {
        text: 'Renaming the resource block changes the storage account name, which forces replacement.',
        why: 'The `name` argument stayed "stshopdiagprod01". The block label is a Terraform-only name; Azure never sees it.',
      },
      {
        text: 'The state file was stale; running `terraform refresh` first would have fixed it.',
        why: 'Refresh updates attribute values for addresses already in state. It never renames addresses, so the plan would be the same.',
      },
      {
        text: 'The azurerm provider treats tags as ForceNew, and the tags were re-read during the rename.',
        why: 'Tags are updated in place on every azurerm resource, and they did not change here.',
      },
    ],
  },
  followUp:
    "How would you rename 40 resources across dev, test and prod states safely? (Answer: `moved` blocks in the same PR, reviewed in every environment's plan; remove them a release or two later once all states have been applied.)",
  tags: ['terraform', 'moved', 'refactoring', 'state', 'rename'],
  related: ['itv-tf-36', 'itv-repm3-10', 'itv-mytf-62'],
}

/* ---------- moving into a module ---------- */

const moduleRoot = `resource "azurerm_resource_group" "core" {
  name     = "rg-core-network-prod"
  location = "westeurope"
}

# Refactor: the VNet and its subnets now come from a reusable module.
module "network" {
  source = "./modules/network"

  name                = "vnet-core-prod"
  resource_group_name = azurerm_resource_group.core.name
  location            = azurerm_resource_group.core.location
  address_space       = ["10.20.0.0/16"]

  subnets = {
    web  = "10.20.1.0/24"
    data = "10.20.2.0/24"
  }
}

output "subnet_ids" {
  value = module.network.subnet_ids
}
`

const moduleMain = `resource "azurerm_virtual_network" "this" {
  name                = var.name
  resource_group_name = var.resource_group_name
  location            = var.location
  address_space       = var.address_space
}

resource "azurerm_subnet" "this" {
  for_each = var.subnets

  name                 = "snet-\${each.key}"
  resource_group_name  = var.resource_group_name
  virtual_network_name = azurerm_virtual_network.this.name
  address_prefixes     = [each.value]
}
`

const moduleVars = `variable "name" {
  type = string
}

variable "resource_group_name" {
  type = string
}

variable "location" {
  type = string
}

variable "address_space" {
  type = list(string)
}

variable "subnets" {
  description = "Subnet name => address prefix"
  type        = map(string)
}
`

const moduleOutputs = `output "vnet_id" {
  value = azurerm_virtual_network.this.id
}

output "subnet_ids" {
  value = { for name, subnet in azurerm_subnet.this : name => subnet.id }
}
`

const moduleMoved = `moved {
  from = azurerm_virtual_network.main
  to   = module.network.azurerm_virtual_network.this
}

moved {
  from = azurerm_subnet.web
  to   = module.network.azurerm_subnet.this["web"]
}

moved {
  from = azurerm_subnet.data
  to   = module.network.azurerm_subnet.this["data"]
}
`

const vnet = (key: string, name: string, rg: string, space: string) => ({
  key,
  type: 'azurerm_virtual_network',
  attrs: { name, resource_group_name: rg, location: 'westeurope', address_space: [space] },
  createdAt: '2024-02-19T11:03:12Z',
})

const subnet = (key: string, name: string, rg: string, vnetName: string, prefix: string) => ({
  key,
  type: 'azurerm_subnet',
  attrs: {
    name,
    resource_group_name: rg,
    virtual_network_name: vnetName,
    address_prefixes: [prefix],
  },
  createdAt: '2024-02-19T11:04:40Z',
})

const intoModule: TfScenario = {
  id: 'module-move',
  title: 'Refactor into a module without a rebuild',
  category: 'Refactoring',
  level: 'medium',
  story:
    'The core network was three flat resources in the root module. You moved them into `modules/network` so other teams can reuse it, with subnets driven by a map. The values are identical - same names, same prefixes. But the plan wants to tear down the VNet that every app in the subscription is peered to.',
  task: 'Finish the refactor: the code must use the module, `terraform plan` must show no changes, and the VNet and both subnets must be the same objects as before.',
  seed: {
    files: {
      'providers.tf': providersTf('core-network.terraform.tfstate'),
      'main.tf': moduleRoot,
      'modules/network/main.tf': moduleMain,
      'modules/network/variables.tf': moduleVars,
      'modules/network/outputs.tf': moduleOutputs,
    },
    cloud: [
      ...backendResources(),
      {
        key: 'rg',
        type: 'azurerm_resource_group',
        attrs: { name: 'rg-core-network-prod', location: 'westeurope' },
        createdAt: '2024-02-19T11:01:02Z',
      },
      vnet('vnet', 'vnet-core-prod', 'rg-core-network-prod', '10.20.0.0/16'),
      subnet('web', 'snet-web', 'rg-core-network-prod', 'vnet-core-prod', '10.20.1.0/24'),
      subnet('data', 'snet-data', 'rg-core-network-prod', 'vnet-core-prod', '10.20.2.0/24'),
    ],
    state: [
      { addr: 'azurerm_resource_group.core', key: 'rg' },
      { addr: 'azurerm_virtual_network.main', key: 'vnet' },
      { addr: 'azurerm_subnet.web', key: 'web' },
      { addr: 'azurerm_subnet.data', key: 'data' },
    ],
    modules: [],
    stateKey: 'core-network.terraform.tfstate',
  },
  lookAt: [
    'terraform plan',
    'terraform init',
    'terraform state list',
    'cat modules/network/main.tf',
  ],
  hints: [
    'The first plan complains the module is not installed. A new `module` block always needs `terraform init` - then plan again and read the addresses.',
    'Resources inside a module have addresses like `module.network.azurerm_subnet.this["web"]`. State still has `azurerm_subnet.web`. Same object, different address.',
    'Write one `moved` block per object: the VNet, and each subnet to its for_each key, e.g. `from = azurerm_subnet.web` / `to = module.network.azurerm_subnet.this["web"]`.',
  ],
  solution: [
    { kind: 'run', command: 'terraform init' },
    { kind: 'write', path: 'moved.tf', content: moduleMoved },
    { kind: 'run', command: 'terraform plan' },
    { kind: 'run', command: 'terraform apply -auto-approve' },
  ],
  alternative: {
    label: 'Imperative alternative: terraform state mv for each object',
    steps: [
      { kind: 'run', command: 'terraform init' },
      {
        kind: 'run',
        command:
          'terraform state mv azurerm_virtual_network.main module.network.azurerm_virtual_network.this',
      },
      {
        kind: 'run',
        command: `terraform state mv azurerm_subnet.web 'module.network.azurerm_subnet.this["web"]'`,
      },
      {
        kind: 'run',
        command: `terraform state mv azurerm_subnet.data 'module.network.azurerm_subnet.this["data"]'`,
      },
      { kind: 'run', command: 'terraform plan' },
    ],
  },
  explanation: [
    {
      code: 'terraform init',
      note: 'Installs the new local module. Plan refuses to run until it has.',
    },
    {
      code: 'moved { from = azurerm_virtual_network.main  to = module.network.azurerm_virtual_network.this }',
      note: 'The `to` address includes the module path. Moves into (and out of) modules have been supported since Terraform 1.1.',
    },
    {
      code: 'to = module.network.azurerm_subnet.this["web"]',
      note: 'The subnets now use `for_each`, so each one moves to its map key. Quote string keys exactly as the for_each map spells them.',
    },
    {
      code: 'terraform plan',
      note: 'Three "has moved to" notes and **0 to add, 0 to change, 0 to destroy**. Apply to record the new addresses.',
    },
  ],
  wrongFixes: [
    {
      label: 'Init and apply the destroy/create plan',
      steps: [
        { kind: 'run', command: 'terraform init' },
        { kind: 'run', command: 'terraform apply -auto-approve' },
      ],
    },
    {
      label: 'Move only the VNet',
      steps: [
        { kind: 'run', command: 'terraform init' },
        {
          kind: 'write',
          path: 'moved.tf',
          content:
            'moved {\n  from = azurerm_virtual_network.main\n  to   = module.network.azurerm_virtual_network.this\n}\n',
        },
        { kind: 'run', command: 'terraform apply -auto-approve' },
      ],
    },
  ],
  expect: {
    state: [
      'azurerm_resource_group.core',
      'module.network.azurerm_subnet.this["data"]',
      'module.network.azurerm_subnet.this["web"]',
      'module.network.azurerm_virtual_network.this',
    ],
    config: [
      {
        kind: 'declares',
        addr: 'module.network.azurerm_virtual_network.this',
        label: 'The code should keep using the network module.',
      },
      {
        kind: 'not-declares',
        addr: 'azurerm_virtual_network.main',
        label: 'Undoing the refactor is not the task - keep the module.',
      },
    ],
  },
  question: {
    prompt: 'Why is a `moved` block usually better than `terraform state mv` for this refactor?',
    options: [
      {
        text: "It is code: reviewed in the PR, shown in every environment's plan, and applied by the pipeline to every state that needs it.",
        correct: true,
        why: 'Right. `state mv` edits one state file by hand, outside review, and has to be repeated for dev, test and prod (and any workspace) - miss one and that environment gets rebuilt.',
      },
      {
        text: '`terraform state mv` cannot move resources into a module.',
        why: 'It can (`state mv azurerm_x.a module.m.azurerm_x.a`) - it is just manual and unreviewed.',
      },
      {
        text: '`moved` blocks also rename the resources in Azure to match.',
        why: 'Neither option touches Azure. Both only change the address Terraform tracks the object under.',
      },
      {
        text: '`moved` blocks skip the refresh, so the plan is faster.',
        why: 'Moves are processed alongside a normal refresh; speed is not the point.',
      },
    ],
  },
  followUp:
    'A module is published to a registry and used by 30 teams. You rename a resource inside it. Where do the `moved` blocks go? (Answer: inside the module itself, so every caller gets the move automatically on upgrade.)',
  tags: ['terraform', 'modules', 'moved', 'refactoring', 'state'],
  related: ['itv-tf-36', 'itv-tf-15', 'itv-mytf-62'],
}

/* ---------- count -> for_each ---------- */

const teamsVars = `variable "teams" {
  description = "One resource group per product team."
  type        = list(string)
  default     = ["payments", "search", "identity"]
}
`

const teamsMain = `# Was: count = length(var.teams), name = "rg-\${var.teams[count.index]}-prod"
resource "azurerm_resource_group" "team" {
  for_each = toset(var.teams)

  name     = "rg-\${each.key}-prod"
  location = "westeurope"

  tags = {
    team = each.key
  }
}
`

const teamsMoved = `moved {
  from = azurerm_resource_group.team[0]
  to   = azurerm_resource_group.team["payments"]
}

moved {
  from = azurerm_resource_group.team[1]
  to   = azurerm_resource_group.team["search"]
}

moved {
  from = azurerm_resource_group.team[2]
  to   = azurerm_resource_group.team["identity"]
}
`

const teamRg = (key: string, team: string) => ({
  key,
  type: 'azurerm_resource_group',
  attrs: { name: `rg-${team}-prod`, location: 'westeurope', tags: { team } },
  createdAt: '2024-06-03T10:20:00Z',
})

const countToForEach: TfScenario = {
  id: 'count-to-foreach',
  title: 'count → for_each: an index shift',
  category: 'Refactoring',
  level: 'medium',
  story:
    'Team resource groups were created with `count = length(var.teams)`. Everyone knows that removing a team from the middle of the list would shuffle the indexes, so you switched to `for_each = toset(var.teams)` - the right call. The plan for this "harmless" change shows 3 to add and 3 to destroy. The payments team keeps their ledger storage account in `rg-payments-prod`.',
  task: 'Land the switch to `for_each` with no resource group destroyed or recreated, and a clean plan.',
  seed: {
    files: {
      'providers.tf': providersTf('teams.terraform.tfstate'),
      'variables.tf': teamsVars,
      'main.tf': teamsMain,
    },
    cloud: [
      ...backendResources(),
      teamRg('payments', 'payments'),
      teamRg('search', 'search'),
      teamRg('identity', 'identity'),
      {
        key: 'ledger',
        type: 'azurerm_storage_account',
        attrs: {
          name: 'stpaymentsledger01',
          resource_group_name: 'rg-payments-prod',
          location: 'westeurope',
          account_tier: 'Standard',
          account_replication_type: 'RAGRS',
        },
        createdAt: '2024-06-04T15:44:31Z',
        createdBy: 'payments-pipeline',
      },
    ],
    state: [
      { addr: 'azurerm_resource_group.team[0]', key: 'payments' },
      { addr: 'azurerm_resource_group.team[1]', key: 'search' },
      { addr: 'azurerm_resource_group.team[2]', key: 'identity' },
    ],
    stateKey: 'teams.terraform.tfstate',
  },
  lookAt: [
    'terraform plan',
    'terraform state list',
    'az resource list -g rg-payments-prod -o table',
  ],
  hints: [
    'Look at the addresses in the plan: `team[0]` is destroyed and `team["payments"]` is created. With count the instance key is a number; with for_each it is the map/set key.',
    "Same objects, new keys. You need to map each old index to its new string key - check `terraform state show 'azurerm_resource_group.team[0]'` to see which team each index is.",
    'Three `moved` blocks: `from = azurerm_resource_group.team[0]` → `to = azurerm_resource_group.team["payments"]`, `[1]` → `"search"`, `[2]` → `"identity"`.',
  ],
  solution: [
    { kind: 'run', command: "terraform state show 'azurerm_resource_group.team[0]'" },
    { kind: 'write', path: 'moved.tf', content: teamsMoved },
    { kind: 'run', command: 'terraform plan' },
    { kind: 'run', command: 'terraform apply -auto-approve' },
  ],
  alternative: {
    label: 'Imperative alternative: terraform state mv per instance',
    steps: [
      {
        kind: 'run',
        command: `terraform state mv 'azurerm_resource_group.team[0]' 'azurerm_resource_group.team["payments"]'`,
      },
      {
        kind: 'run',
        command: `terraform state mv 'azurerm_resource_group.team[1]' 'azurerm_resource_group.team["search"]'`,
      },
      {
        kind: 'run',
        command: `terraform state mv 'azurerm_resource_group.team[2]' 'azurerm_resource_group.team["identity"]'`,
      },
      { kind: 'run', command: 'terraform plan' },
    ],
  },
  explanation: [
    {
      code: "terraform state show 'azurerm_resource_group.team[0]'",
      note: 'Confirms which team sits at which index before you map it - never guess. Quote addresses with brackets in the shell.',
    },
    {
      code: 'from = azurerm_resource_group.team[0]  to = ...team["payments"]',
      note: 'A moved block can rename a single instance key. One block per instance.',
    },
    { code: 'terraform plan', note: 'Three moves, **0 to add, 0 to change, 0 to destroy**.' },
    {
      code: 'Why not just apply?',
      note: "Destroying `rg-search-prod` would delete everything inside it. Here azurerm's default `prevent_deletion_if_contains_resources` would stop the payments group (it holds the ledger account) - but the other two groups would already be gone and recreated empty, with new role assignments and locks needed.",
    },
  ],
  wrongFixes: [
    {
      label: 'Apply the plan as it is',
      steps: [{ kind: 'run', command: 'terraform apply -auto-approve' }],
    },
    {
      label: 'Map the indexes in the wrong order',
      steps: [
        {
          kind: 'write',
          path: 'moved.tf',
          content: teamsMoved
            .replace('team["payments"]', 'team["tmp"]')
            .replace('team["identity"]', 'team["payments"]')
            .replace('team["tmp"]', 'team["identity"]'),
        },
        { kind: 'run', command: 'terraform apply -auto-approve' },
      ],
    },
  ],
  expect: {
    state: [
      'azurerm_resource_group.team["identity"]',
      'azurerm_resource_group.team["payments"]',
      'azurerm_resource_group.team["search"]',
    ],
    config: [
      {
        kind: 'uses-for-each',
        addr: 'azurerm_resource_group.team',
        label: 'Keep the for_each version - going back to count is not the task.',
      },
    ],
  },
  question: {
    prompt: 'What is the root cause of the 3-to-destroy plan?',
    options: [
      {
        text: 'Instance keys changed from numbers (`[0]`) to strings (`["payments"]`), so Terraform saw three old instances to delete and three new ones to create.',
        correct: true,
        why: 'Right - for_each instances are identified by key. Without a move, the old index-keyed instances have no configuration left.',
      },
      {
        text: '`toset()` sorts the teams alphabetically, which changes the resource group names.',
        why: 'The names are built from `each.key`, which is the same team name as before - they do not change.',
      },
      {
        text: 'for_each always replaces resources on first use; it cannot be adopted without recreation.',
        why: 'It can be adopted with moved blocks (or state mv), as you just did.',
      },
      {
        text: 'The tags block changed, and tags force replacement on resource groups.',
        why: 'Tags are in-place on resource groups, and they are identical here.',
      },
    ],
  },
  followUp:
    'When is `count` still the right choice? (Answer: for "zero or one" toggles like `count = var.enable_bastion ? 1 : 0`, or truly identical, interchangeable copies.)',
  tags: ['terraform', 'count', 'for_each', 'moved', 'refactoring'],
  related: ['itv-tf-14', 'itv-tf-4', 'itv-mytf-13', 'itv-rglb2-1'],
}

/* ---------- removing from the middle of a count list ---------- */

const ordersVars = `variable "subnets" {
  description = "Subnets in the orders VNet, in order."
  type = list(object({
    name   = string
    prefix = string
  }))

  # PR #87: the api subnet is retired - the API moved to Container Apps.
  default = [
    { name = "web", prefix = "10.30.1.0/24" },
    { name = "data", prefix = "10.30.3.0/24" },
  ]
}
`

const ordersNetwork = (subnetBlock: string) => `resource "azurerm_resource_group" "orders" {
  name     = "rg-orders-prod"
  location = "westeurope"
}

resource "azurerm_virtual_network" "orders" {
  name                = "vnet-orders-prod"
  resource_group_name = azurerm_resource_group.orders.name
  location            = azurerm_resource_group.orders.location
  address_space       = ["10.30.0.0/16"]
}

${subnetBlock}`

const ordersCount = `resource "azurerm_subnet" "app" {
  count = length(var.subnets)

  name                 = "snet-\${var.subnets[count.index].name}"
  resource_group_name  = azurerm_resource_group.orders.name
  virtual_network_name = azurerm_virtual_network.orders.name
  address_prefixes     = [var.subnets[count.index].prefix]
}
`

const ordersForEach = `resource "azurerm_subnet" "app" {
  for_each = { for subnet in var.subnets : subnet.name => subnet }

  name                 = "snet-\${each.key}"
  resource_group_name  = azurerm_resource_group.orders.name
  virtual_network_name = azurerm_virtual_network.orders.name
  address_prefixes     = [each.value.prefix]
}

moved {
  from = azurerm_subnet.app[0]
  to   = azurerm_subnet.app["web"]
}

moved {
  from = azurerm_subnet.app[2]
  to   = azurerm_subnet.app["data"]
}
`

const countMiddle: TfScenario = {
  id: 'count-remove-middle',
  title: 'Remove one subnet, lose two',
  category: 'Refactoring',
  level: 'advanced',
  story:
    'The orders VNet has three subnets created with `count` over a list: web, api, data. The API moved to Container Apps, so PR #87 deletes "api" from the middle of the list. The plan says **1 to add, 2 to destroy**, and the database private endpoints live in `snet-data`.',
  task: 'Retire only `snet-api`. `snet-web` and `snet-data` must survive untouched, and the subnets should no longer depend on list order, so this cannot happen again. Finish with a clean plan.',
  seed: {
    files: {
      'providers.tf': providersTf('orders-network.terraform.tfstate'),
      'variables.tf': ordersVars,
      'main.tf': ordersNetwork(ordersCount),
    },
    cloud: [
      ...backendResources(),
      {
        key: 'rg',
        type: 'azurerm_resource_group',
        attrs: { name: 'rg-orders-prod', location: 'westeurope' },
        createdAt: '2024-09-12T07:55:00Z',
      },
      vnet('vnet', 'vnet-orders-prod', 'rg-orders-prod', '10.30.0.0/16'),
      subnet('web', 'snet-web', 'rg-orders-prod', 'vnet-orders-prod', '10.30.1.0/24'),
      subnet('api', 'snet-api', 'rg-orders-prod', 'vnet-orders-prod', '10.30.2.0/24'),
      subnet('data', 'snet-data', 'rg-orders-prod', 'vnet-orders-prod', '10.30.3.0/24'),
    ],
    state: [
      { addr: 'azurerm_resource_group.orders', key: 'rg' },
      { addr: 'azurerm_virtual_network.orders', key: 'vnet' },
      { addr: 'azurerm_subnet.app[0]', key: 'web' },
      { addr: 'azurerm_subnet.app[1]', key: 'api' },
      { addr: 'azurerm_subnet.app[2]', key: 'data' },
    ],
    stateKey: 'orders-network.terraform.tfstate',
  },
  lookAt: ['terraform plan', 'terraform state list', 'cat variables.tf'],
  hints: [
    'Read the plan carefully: `app[1]` must be replaced (its name goes from snet-api to snet-data) and `app[2]` is destroyed. With count, everything after the removed item shifts down one index.',
    'Switch the subnets to `for_each` over a map keyed by subnet name: `for_each = { for subnet in var.subnets : subnet.name => subnet }`, with `each.key` and `each.value.prefix`.',
    'Then move the survivors to their new keys: `app[0]` → `app["web"]` and `app[2]` → `app["data"]`. Leave `app[1]` (api) alone - Terraform will plan to destroy exactly that one.',
  ],
  solution: [
    { kind: 'write', path: 'main.tf', content: ordersNetwork(ordersForEach) },
    { kind: 'run', command: 'terraform plan' },
    { kind: 'run', command: 'terraform apply -auto-approve' },
  ],
  explanation: [
    {
      code: 'for_each = { for subnet in var.subnets : subnet.name => subnet }',
      note: 'A `for` expression turns the list of objects into a map keyed by name. Keys are stable, so removing one item never touches the others.',
    },
    {
      code: 'moved { from = azurerm_subnet.app[0]  to = azurerm_subnet.app["web"] }',
      note: 'Map each surviving index to its key. Note `[2]` → `"data"`: data was at index 2 in state, not index 1.',
    },
    {
      code: 'terraform plan',
      note: '`azurerm_subnet.app[1]` will be destroyed `(because resource does not use count)` - that is snet-api, the one you meant to remove. **0 to add, 0 to change, 1 to destroy**.',
    },
    {
      code: 'terraform apply -auto-approve',
      note: 'Removes snet-api only. In real Azure, deleting a subnet fails while NICs or private endpoints still use it - check first.',
    },
  ],
  wrongFixes: [
    {
      label: 'Apply the shifted plan',
      steps: [{ kind: 'run', command: 'terraform apply -auto-approve' }],
    },
    {
      label: 'Hide it with a state move (count kept)',
      steps: [
        { kind: 'run', command: "terraform state rm 'azurerm_subnet.app[1]'" },
        {
          kind: 'run',
          command: "terraform state mv 'azurerm_subnet.app[2]' 'azurerm_subnet.app[1]'",
        },
        { kind: 'run', command: 'terraform apply -auto-approve' },
      ],
    },
  ],
  expect: {
    gone: ['api'],
    state: [
      'azurerm_resource_group.orders',
      'azurerm_subnet.app["data"]',
      'azurerm_subnet.app["web"]',
      'azurerm_virtual_network.orders',
    ],
    config: [
      {
        kind: 'uses-for-each',
        addr: 'azurerm_subnet.app',
        label:
          'The subnets still use count, so the next removal will shift indexes again - switch to for_each.',
      },
    ],
  },
  question: {
    prompt: 'Why did removing "api" put "data" at risk?',
    options: [
      {
        text: 'With count, instances are identified by list position. Removing index 1 made "data" become index 1, which Terraform saw as renaming app[1] (a replacement) and deleting app[2].',
        correct: true,
        why: 'Right - count keys are positions, not identities. for_each keys are identities.',
      },
      {
        text: 'Subnet address prefixes are ForceNew, and the prefix list was re-sorted.',
        why: 'address_prefixes is updated in place. The replacement came from the name change at index 1, caused by the shift.',
      },
      {
        text: 'Terraform deletes resources in reverse order, so it always removes the last element first.',
        why: 'Order of deletion is not the issue - which addresses exist is.',
      },
      {
        text: 'Lists of objects are not allowed with count; a map variable was required.',
        why: 'count works with any list. It is just positional, which is the trap.',
      },
    ],
  },
  followUp:
    'You cannot change the code this sprint, but must remove "api" today. What is the least risky option? (Answer: leave "api" in the list and remove it later with the for_each change, or use moved blocks to re-key; never `state rm` the object - that orphans it in Azure.)',
  tags: ['terraform', 'count', 'for_each', 'moved', 'subnet', 'index shift'],
  related: ['itv-tf-14', 'itv-mytf-105', 'itv-mytf-75'],
}

export const refactoringScenarios: TfScenario[] = [rename, intoModule, countToForEach, countMiddle]
