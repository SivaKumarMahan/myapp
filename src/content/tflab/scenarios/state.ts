import type { TfScenario } from '../types'
import { backendResources, providersTf, rgId } from './common'

/* ---------- stop managing without deleting ---------- */

const rule = (name: string, priority: number, port: string) => `
  security_rule {
    name                       = "${name}"
    priority                   = ${priority}
    direction                  = "Inbound"
    access                     = "Allow"
    protocol                   = "Tcp"
    source_port_range          = "*"
    destination_port_range     = "${port}"
    source_address_prefix      = "VirtualNetwork"
    destination_address_prefix = "*"
  }
`

const sharedRg = `resource "azurerm_resource_group" "shop" {
  name     = "rg-shop-prod"
  location = "westeurope"
}
`

const sharedNsg = `
# Shared by every app subnet. The security team takes it over in their own repo.
resource "azurerm_network_security_group" "shared" {
  name                = "nsg-shared-prod"
  resource_group_name = azurerm_resource_group.shop.name
  location            = azurerm_resource_group.shop.location
${rule('allow-https', 100, '443')}${rule('allow-app', 110, '8080')}}
`

const removedTf = `removed {
  from = azurerm_network_security_group.shared

  lifecycle {
    destroy = false
  }
}
`

const sharedRule = (name: string, priority: number, port: string) => ({
  name,
  priority,
  direction: 'Inbound',
  access: 'Allow',
  protocol: 'Tcp',
  source_port_range: '*',
  destination_port_range: port,
  source_address_prefix: 'VirtualNetwork',
  destination_address_prefix: '*',
})

const removed: TfScenario = {
  id: 'removed-block',
  title: 'Hand over a resource without deleting it',
  category: 'State',
  level: 'medium',
  story:
    'The shared network security group `nsg-shared-prod` is used by every app subnet. The security team will manage it from their own repository from Monday and will import it there. Your configuration must let go of it. If your pipeline destroys it on the way out, every subnet loses its rules at once.',
  task: 'Remove the NSG from your configuration and your state, leaving it running in Azure untouched. Finish with a clean plan.',
  seed: {
    files: {
      'providers.tf': providersTf('shop-prod.terraform.tfstate'),
      'main.tf': sharedRg + sharedNsg,
    },
    cloud: [
      ...backendResources(),
      {
        key: 'rg',
        type: 'azurerm_resource_group',
        attrs: { name: 'rg-shop-prod', location: 'westeurope' },
        createdAt: '2023-05-02T08:14:10Z',
      },
      {
        key: 'nsg',
        type: 'azurerm_network_security_group',
        attrs: {
          name: 'nsg-shared-prod',
          resource_group_name: 'rg-shop-prod',
          location: 'westeurope',
          security_rule: [
            sharedRule('allow-https', 100, '443'),
            sharedRule('allow-app', 110, '8080'),
          ],
        },
        createdAt: '2023-05-04T13:10:00Z',
      },
    ],
    state: [
      { addr: 'azurerm_network_security_group.shared', key: 'nsg' },
      { addr: 'azurerm_resource_group.shop', key: 'rg' },
    ],
    stateKey: 'shop-prod.terraform.tfstate',
  },
  lookAt: [
    'terraform state list',
    'cat main.tf',
    'terraform state show azurerm_network_security_group.shared',
  ],
  hints: [
    'If you just delete the resource block, the plan shows `- destroy` "(because azurerm_network_security_group.shared is not in configuration)". Terraform assumes code you removed means infrastructure you want gone.',
    'Terraform 1.7 added a block that says "forget this, do not destroy it": `removed { from = ... lifecycle { destroy = false } }`.',
    'Delete the NSG resource block, add the `removed` block (e.g. in removed.tf), plan - it should say "will no longer be managed by Terraform" - and apply.',
  ],
  solution: [
    { kind: 'write', path: 'main.tf', content: sharedRg },
    { kind: 'write', path: 'removed.tf', content: removedTf },
    { kind: 'run', command: 'terraform plan' },
    { kind: 'run', command: 'terraform apply -auto-approve' },
  ],
  alternative: {
    label: 'Imperative alternative: delete the block, then terraform state rm',
    steps: [
      { kind: 'write', path: 'main.tf', content: sharedRg },
      { kind: 'run', command: 'terraform state rm azurerm_network_security_group.shared' },
      { kind: 'run', command: 'terraform plan' },
    ],
  },
  explanation: [
    {
      code: 'removed { from = azurerm_network_security_group.shared ... }',
      note: 'The `from` is a resource address without instance keys. The resource block itself must be gone - Terraform errors if both exist.',
    },
    {
      code: 'lifecycle { destroy = false }',
      note: 'The important line. With `destroy = true` (the default) a removed block is just an explicit, reviewable destroy.',
    },
    {
      code: 'terraform plan',
      note: '`# azurerm_network_security_group.shared will no longer be managed by Terraform` and a warning listing the objects to forget. Nothing is destroyed.',
    },
    {
      code: 'terraform state rm',
      note: 'Does the same in one state immediately, with no plan to review. Fine for a one-off, but the removed block works in every environment through the normal pipeline.',
    },
  ],
  wrongFixes: [
    {
      label: 'Delete the block and apply',
      steps: [
        { kind: 'write', path: 'main.tf', content: sharedRg },
        { kind: 'run', command: 'terraform apply -auto-approve' },
      ],
    },
    {
      label: 'Only remove it from state (block kept)',
      steps: [{ kind: 'run', command: 'terraform state rm azurerm_network_security_group.shared' }],
    },
  ],
  expect: {
    state: ['azurerm_resource_group.shop'],
    config: [
      {
        kind: 'not-declares',
        addr: 'azurerm_network_security_group.shared',
        label: 'The NSG is still declared in your code - the security team owns it now.',
      },
    ],
  },
  question: {
    prompt: 'What happens if you delete a resource block and apply, with no removed block?',
    options: [
      {
        text: 'Terraform destroys the real resource, because state still tracks it and the configuration no longer wants it.',
        correct: true,
        why: 'Right - removing code means "delete this" to Terraform. To stop managing without deleting, use `removed` with `destroy = false` or `terraform state rm`.',
      },
      {
        text: 'Nothing: Terraform ignores resources that are not in the code.',
        why: 'Terraform only ignores objects it has never tracked. Anything in state but not in code is planned for destruction.',
      },
      {
        text: 'Terraform moves it to an "unmanaged" section of the state.',
        why: 'There is no such section. It is destroyed, then removed from state.',
      },
      {
        text: 'The apply fails until you run `terraform import`.',
        why: 'Import is for adopting objects, not for letting go of them.',
      },
    ],
  },
  followUp:
    'After the hand-over, how does the security team adopt the NSG in their repo? (Answer: an `import` block with the NSG\'s resource ID and matching code, then a plan that shows only "will be imported".)',
  tags: ['terraform', 'removed', 'state rm', 'state', 'nsg'],
  related: ['itv-tf-2', 'itv-tf-45'],
}

/* ---------- stuck state lock ---------- */

const releaseMain = (flag: string) => `resource "azurerm_resource_group" "checkout" {
  name     = "rg-checkout-prod"
  location = "westeurope"
}

resource "azurerm_service_plan" "checkout" {
  name                = "asp-checkout-prod"
  resource_group_name = azurerm_resource_group.checkout.name
  location            = azurerm_resource_group.checkout.location
  os_type             = "Linux"
  sku_name            = "P2v3"
  worker_count        = 3
}

resource "azurerm_linux_web_app" "checkout" {
  name                = "app-checkout-prod-weu"
  resource_group_name = azurerm_resource_group.checkout.name
  location            = azurerm_resource_group.checkout.location
  service_plan_id     = azurerm_service_plan.checkout.id
  https_only          = true

  app_settings = {
    FEATURE_CHECKOUT_V2 = "${flag}"
  }

  site_config {
    always_on         = true
    health_check_path = "/healthz"
  }
}
`

const LOCK_ID = 'b2f6c0a4-7d1e-4c3b-9a58-3e2f1d0c9b8a'
const PLAN_ID = `${rgId('rg-checkout-prod')}/providers/Microsoft.Web/serverFarms/asp-checkout-prod`

const RUNS = `Run ID    Pipeline          Build number  Status      Result    Queued (UTC)         Finished (UTC)       Agent
--------  ----------------  ------------  ----------  --------  -------------------  -------------------  ---------------------
48213     infra-prod-apply  20261111.1    completed   canceled  2026-11-11 06:00:02  2026-11-11 06:00:47  linux-pool-03
48201     infra-prod-apply  20261110.4    completed   failed    2026-11-10 23:13:41  2026-11-10 23:31:09  linux-pool-07
48190     infra-prod-apply  20261110.3    completed   succeeded 2026-11-10 17:02:10  2026-11-10 17:05:33  linux-pool-02

No runs are in progress or queued for infra-prod-apply.
Run 48201 log (tail):
  23:14:02  Acquiring state lock. This may take a few moments...
  23:14:09  azurerm_linux_web_app.checkout: Modifying...
  23:31:09  ##[error] The agent linux-pool-07 lost communication with the server. The job was abandoned.
Run 48213 log (tail):
  06:00:44  Error: Error acquiring the state lock`

const BLOB = `{
  "name": "checkout.terraform.tfstate",
  "properties": {
    "lastModified": "2026-11-10T23:14:02+00:00",
    "lease": {
      "duration": "infinite",
      "state": "leased",
      "status": "locked"
    }
  },
  "metadata": {
    "terraformlockid": "eyJJRCI6ImIyZjZjMGE0LTdkMWUtNGMzYi05YTU4LTNlMmYxZDBjOWI4YSIsIk9wZXJhdGlvbiI6Ik9wZXJhdGlvblR5cGVBcHBseSJ9"
  }
}`

const lock: TfScenario = {
  id: 'state-lock',
  title: 'The state lock that never let go',
  category: 'State',
  level: 'simple',
  story:
    'Last night\'s release pipeline was rolling out the `FEATURE_CHECKOUT_V2` flag when its build agent died halfway through. This morning every run fails with "Error acquiring the state lock", including the 06:00 scheduled one. Someone in the channel says "just break the blob lease in the portal".',
  task: 'Confirm nothing is really running, release the stale lock the proper way, then finish last night\'s change (the flag is already "true" in the code) so the plan is clean.',
  seed: {
    files: {
      'providers.tf': providersTf('checkout.terraform.tfstate'),
      'main.tf': releaseMain('true'),
    },
    cloud: [
      ...backendResources(),
      {
        key: 'rg',
        type: 'azurerm_resource_group',
        attrs: { name: 'rg-checkout-prod', location: 'westeurope' },
        createdAt: '2024-08-20T09:00:00Z',
      },
      {
        key: 'plan',
        type: 'azurerm_service_plan',
        attrs: {
          name: 'asp-checkout-prod',
          resource_group_name: 'rg-checkout-prod',
          location: 'westeurope',
          os_type: 'Linux',
          sku_name: 'P2v3',
          worker_count: 3,
        },
        createdAt: '2024-08-20T09:01:30Z',
      },
      {
        key: 'app',
        type: 'azurerm_linux_web_app',
        attrs: {
          name: 'app-checkout-prod-weu',
          resource_group_name: 'rg-checkout-prod',
          location: 'westeurope',
          service_plan_id: PLAN_ID,
          https_only: true,
          app_settings: { FEATURE_CHECKOUT_V2: 'false' },
          site_config: [{ always_on: true, health_check_path: '/healthz' }],
        },
        createdAt: '2024-08-20T09:03:12Z',
      },
    ],
    state: [
      { addr: 'azurerm_resource_group.checkout', key: 'rg' },
      { addr: 'azurerm_service_plan.checkout', key: 'plan' },
      { addr: 'azurerm_linux_web_app.checkout', key: 'app' },
    ],
    lock: {
      id: LOCK_ID,
      operation: 'OperationTypeApply',
      who: 'AzDevOps@linux-pool-07',
      version: '1.16.0',
      created: '2026-11-10 23:14:02.512 +0000 UTC',
      info: '',
    },
    canned: {
      'az pipelines runs list': RUNS,
      'az storage blob show': BLOB,
    },
    stateKey: 'checkout.terraform.tfstate',
  },
  lookAt: [
    'terraform plan',
    'az pipelines runs list --pipeline-name infra-prod-apply -o table',
    'az storage blob show --account-name sttfstatecontoso01 -c tfstate -n checkout.terraform.tfstate',
  ],
  hints: [
    'Read the lock info in the error: who holds it, since when, and the lock **ID**. Then check whether that run is really dead: `az pipelines runs list --pipeline-name infra-prod-apply -o table`.',
    'Run 48201 was abandoned when its agent died, and nothing is running now - so the lock is stale. Terraform has a command for exactly this, which takes the lock ID.',
    '`terraform force-unlock <LOCK_ID>` (answer `yes`, or add `-force`), then `terraform plan` - it shows the flag change the dead run never finished - and `terraform apply -auto-approve`.',
  ],
  solution: [
    { kind: 'run', command: 'terraform plan' },
    { kind: 'run', command: 'az pipelines runs list --pipeline-name infra-prod-apply -o table' },
    { kind: 'run', command: `terraform force-unlock -force ${LOCK_ID}` },
    { kind: 'run', command: 'terraform plan' },
    { kind: 'run', command: 'terraform apply -auto-approve' },
  ],
  explanation: [
    {
      code: 'terraform plan',
      note: 'Fails with **Error acquiring the state lock** and prints the Lock Info - ID, who, operation, when.',
    },
    {
      code: 'az pipelines runs list ...',
      note: 'Proves the holder is dead: run 48201 was abandoned at 23:31 and nothing is in progress. Never unlock while a run might still be writing - two writers corrupt state.',
    },
    {
      code: 'terraform force-unlock -force <LOCK_ID>',
      note: "Releases exactly that lock (on the azurerm backend it breaks the blob lease). The ID guards against unlocking someone else's newer lock.",
    },
    {
      code: 'terraform plan / apply',
      note: 'The interrupted run may have left work half done. A fresh plan shows what is left - here the app setting - and apply finishes it.',
    },
  ],
  wrongFixes: [
    {
      label: 'Bypass the lock with -lock=false',
      steps: [{ kind: 'run', command: 'terraform apply -lock=false -auto-approve' }],
    },
    {
      label: 'Unlock with the wrong ID',
      steps: [
        { kind: 'run', command: 'terraform force-unlock -force 48201' },
        { kind: 'run', command: 'terraform apply -auto-approve' },
      ],
    },
  ],
  expect: {
    state: [
      'azurerm_linux_web_app.checkout',
      'azurerm_resource_group.checkout',
      'azurerm_service_plan.checkout',
    ],
    cloud: [
      {
        key: 'app',
        path: 'app_settings.FEATURE_CHECKOUT_V2',
        equals: 'true',
        label: 'The feature flag the interrupted run was deploying has not been applied yet.',
      },
    ],
  },
  question: {
    prompt: 'What must you confirm before running `terraform force-unlock`?',
    options: [
      {
        text: 'That no Terraform run is still active against this state - the lock holder really is gone - and that you use the exact lock ID from the error.',
        correct: true,
        why: 'Right. Unlocking under a live run lets two processes write the same state, which can lose resources from state.',
      },
      {
        text: 'That the state file is backed up, because force-unlock rewrites it.',
        why: 'force-unlock does not touch the state contents, only the lock. (Versioning the state container is still a good idea.)',
      },
      {
        text: 'Nothing - force-unlock is always safe because Terraform re-checks the lock.',
        why: 'The command exists precisely because Terraform cannot tell whether the holder is alive. You have to.',
      },
      {
        text: 'That -lock=false is set on the next run.',
        why: 'Disabling locking removes the very protection the lock gives you. Release the stale lock instead.',
      },
    ],
  },
  followUp:
    'How do you make stale locks rarer in CI? (Answer: a pipeline concurrency limit per state, timeouts and `-lock-timeout`, smaller state files per component, and agents that are not killed mid-apply.)',
  tags: ['terraform', 'state lock', 'force-unlock', 'azurerm backend', 'ci/cd'],
  related: ['itv-mytf-69', 'itv-aziac-16', 'itv-rinm-21', 'itv-tf-10'],
}

export const stateScenarios: TfScenario[] = [removed, lock]
