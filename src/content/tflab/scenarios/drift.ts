import type { TfScenario } from '../types'
import { backendResources, providersTf, rgId, storageId } from './common'

/* ---------- revert a risky portal change ---------- */

const paymentsMain = `resource "azurerm_resource_group" "payments" {
  name     = "rg-payments-prod"
  location = "westeurope"
}

resource "azurerm_storage_account" "receipts" {
  name                            = "stpayreceiptsprod01"
  resource_group_name             = azurerm_resource_group.payments.name
  location                        = azurerm_resource_group.payments.location
  account_tier                    = "Standard"
  account_replication_type        = "ZRS"
  min_tls_version                 = "TLS1_2"
  public_network_access_enabled   = false
  allow_nested_items_to_be_public = false

  tags = {
    data_classification = "confidential"
  }
}
`

const RECEIPTS_ID = storageId('rg-payments-prod', 'stpayreceiptsprod01')

const driftRevert: TfScenario = {
  id: 'drift-revert',
  title: 'Drift: someone weakened TLS in the portal',
  category: 'Drift',
  level: 'simple',
  story:
    'Yesterday afternoon a legacy partner could not upload receipts. To unblock them, on-call opened the receipts storage account in the portal, dropped the minimum TLS version to 1.0 and enabled public network access. The partner has since upgraded. Security wants the account back to the baseline in code.',
  task: 'Put Azure back to what the code says, without changing the code. Finish with a clean plan.',
  seed: {
    files: { 'providers.tf': providersTf('payments.terraform.tfstate'), 'main.tf': paymentsMain },
    cloud: [
      ...backendResources(),
      {
        key: 'rg',
        type: 'azurerm_resource_group',
        attrs: { name: 'rg-payments-prod', location: 'westeurope' },
        createdAt: '2024-03-01T10:00:00Z',
      },
      {
        key: 'receipts',
        type: 'azurerm_storage_account',
        attrs: {
          name: 'stpayreceiptsprod01',
          resource_group_name: 'rg-payments-prod',
          location: 'westeurope',
          account_tier: 'Standard',
          account_replication_type: 'ZRS',
          min_tls_version: 'TLS1_0',
          public_network_access_enabled: true,
          allow_nested_items_to_be_public: false,
          tags: { data_classification: 'confidential' },
        },
        createdAt: '2024-03-01T10:02:51Z',
        modifiedAt: '2026-11-10T16:42:13Z',
        modifiedBy: 'oncall.sam@contoso.com',
      },
    ],
    state: [
      { addr: 'azurerm_resource_group.payments', key: 'rg' },
      {
        addr: 'azurerm_storage_account.receipts',
        key: 'receipts',
        drift: { min_tls_version: 'TLS1_2', public_network_access_enabled: false },
      },
    ],
    activity: [
      {
        time: '2026-11-10T16:42:13Z',
        caller: 'oncall.sam@contoso.com',
        operation: 'Microsoft.Storage/storageAccounts/write',
        resource: RECEIPTS_ID,
        status: 'Succeeded',
      },
      {
        time: '2026-11-10T16:39:02Z',
        caller: 'oncall.sam@contoso.com',
        operation: 'Microsoft.Storage/storageAccounts/listKeys/action',
        resource: RECEIPTS_ID,
        status: 'Succeeded',
      },
    ],
    stateKey: 'payments.terraform.tfstate',
  },
  lookAt: [
    'terraform plan',
    'az monitor activity-log list -g rg-payments-prod -o table',
    'az storage account show -n stpayreceiptsprod01',
  ],
  hints: [
    'The plan starts with "Objects have changed outside of Terraform". That section is the **drift** - what Azure looks like now versus what state recorded.',
    "Below the drift note, the planned action is an in-place update back to the code's values. That is exactly what you want here - no replacement, no code change.",
    'Apply it: `terraform apply -auto-approve` (or `terraform plan -out=tfplan` and `terraform apply tfplan`). Then plan again to confirm "No changes".',
  ],
  solution: [
    { kind: 'run', command: 'az monitor activity-log list -g rg-payments-prod -o table' },
    { kind: 'run', command: 'terraform plan -out=tfplan' },
    { kind: 'run', command: 'terraform apply tfplan' },
    { kind: 'run', command: 'terraform plan' },
  ],
  explanation: [
    {
      code: 'az monitor activity-log list -g rg-payments-prod -o table',
      note: 'Who changed what, and when - before you undo anything, make sure the reason for the change is gone (the partner upgraded).',
    },
    {
      code: 'terraform plan -out=tfplan',
      note: 'The drift note shows TLS1_2 → TLS1_0 and public access false → true; the plan updates both back **in place** (`~`).',
    },
    {
      code: 'terraform apply tfplan',
      note: 'Applies exactly the reviewed plan. A saved plan refuses to apply if the state changed in between ("Saved plan is stale").',
    },
    {
      code: 'Prevention',
      note: 'Deny or audit the setting with Azure Policy (e.g. minimum TLS), restrict portal write access in production, and run a scheduled `terraform plan -detailed-exitcode` to catch drift early.',
    },
  ],
  wrongFixes: [
    {
      label: 'Change the code to match the portal',
      steps: [
        {
          kind: 'write',
          path: 'main.tf',
          content: paymentsMain
            .replace('"TLS1_2"', '"TLS1_0"')
            .replace(
              'public_network_access_enabled   = false',
              'public_network_access_enabled   = true',
            ),
        },
        { kind: 'run', command: 'terraform apply -auto-approve' },
      ],
    },
    {
      label: 'Accept the drift with a refresh-only apply',
      steps: [{ kind: 'run', command: 'terraform apply -refresh-only -auto-approve' }],
    },
  ],
  expect: {
    state: ['azurerm_resource_group.payments', 'azurerm_storage_account.receipts'],
    config: [
      {
        kind: 'attr',
        addr: 'azurerm_storage_account.receipts',
        attr: 'min_tls_version',
        equals: 'TLS1_2',
        label:
          'The code should still require TLS1_2 - security asked for the baseline, not for the code to follow the portal.',
      },
      {
        kind: 'attr',
        addr: 'azurerm_storage_account.receipts',
        attr: 'public_network_access_enabled',
        equals: false,
        label: 'The code should still disable public network access.',
      },
    ],
    cloud: [
      {
        key: 'receipts',
        path: 'min_tls_version',
        equals: 'TLS1_2',
        label: 'In Azure the account still allows TLS 1.0.',
      },
      {
        key: 'receipts',
        path: 'public_network_access_enabled',
        equals: false,
        label: 'In Azure the account still allows public network access.',
      },
    ],
  },
  question: {
    prompt: 'What does `terraform apply -refresh-only` do, and why was it wrong here?',
    options: [
      {
        text: 'It writes the drifted values into state without changing Azure - accepting the change. Here the change was the problem, so it had to be reverted, not accepted.',
        correct: true,
        why: 'Right. Refresh-only is for drift you want to keep (and you would update the code to match). For a security regression, apply the configuration.',
      },
      {
        text: 'It reverts Azure to match state, without looking at the code.',
        why: 'It never changes Azure. It only updates state from Azure.',
      },
      {
        text: 'It is the same as `terraform refresh`, which reverts drift automatically.',
        why: '`terraform refresh` is the deprecated form of refresh-only - and it also only updates state.',
      },
      {
        text: 'It only works with a saved plan file.',
        why: 'It works with or without a saved plan.',
      },
    ],
  },
  followUp:
    'How would you detect this drift within an hour instead of a day? (Answer: a scheduled pipeline running `terraform plan -detailed-exitcode` - exit code 2 means changes - alerting the team, plus Azure Policy in audit/deny mode for the security baseline.)',
  tags: ['terraform', 'drift', 'refresh-only', 'storage', 'tls', 'security'],
  related: ['itv-tf-12', 'itv-mytf-10', 'itv-mytf-95', 'itv-aziac-17'],
}

/* ---------- accept a deliberate portal change ---------- */

const webMain = (sku: string) => `resource "azurerm_resource_group" "checkout" {
  name     = "rg-checkout-prod"
  location = "westeurope"
}

resource "azurerm_service_plan" "checkout" {
  name                = "asp-checkout-prod"
  resource_group_name = azurerm_resource_group.checkout.name
  location            = azurerm_resource_group.checkout.location
  os_type             = "Linux"
  sku_name            = "${sku}"
  worker_count        = 3
}

resource "azurerm_linux_web_app" "checkout" {
  name                = "app-checkout-prod-weu"
  resource_group_name = azurerm_resource_group.checkout.name
  location            = azurerm_resource_group.checkout.location
  service_plan_id     = azurerm_service_plan.checkout.id
  https_only          = true

  site_config {
    always_on         = true
    health_check_path = "/healthz"
  }
}
`

const PLAN_ID = `${rgId('rg-checkout-prod')}/providers/Microsoft.Web/serverFarms/asp-checkout-prod`

const driftAccept: TfScenario = {
  id: 'drift-accept',
  title: 'Drift you want to keep',
  category: 'Drift',
  level: 'medium',
  story:
    'During Black Friday incident INC-4821, on-call scaled the checkout App Service plan up from P1v3 to P2v3 in the portal, and response times recovered. The capacity review this morning agreed: **P2v3 stays**. Tonight the pipeline will run `terraform apply` on this repo as usual.',
  task: "Make sure tonight's run keeps P2v3: the code and the state must both say P2v3, Azure must not be touched, and the plan must be clean.",
  seed: {
    files: {
      'providers.tf': providersTf('checkout.terraform.tfstate'),
      'main.tf': webMain('P1v3'),
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
        modifiedAt: '2026-11-08T19:12:40Z',
        modifiedBy: 'oncall.priya@contoso.com',
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
          site_config: [{ always_on: true, health_check_path: '/healthz' }],
        },
        createdAt: '2024-08-20T09:03:12Z',
      },
    ],
    state: [
      { addr: 'azurerm_resource_group.checkout', key: 'rg' },
      { addr: 'azurerm_service_plan.checkout', key: 'plan', drift: { sku_name: 'P1v3' } },
      { addr: 'azurerm_linux_web_app.checkout', key: 'app' },
    ],
    activity: [
      {
        time: '2026-11-08T19:12:40Z',
        caller: 'oncall.priya@contoso.com',
        operation: 'Microsoft.Web/serverFarms/write',
        resource: PLAN_ID,
        status: 'Succeeded',
      },
    ],
    stateKey: 'checkout.terraform.tfstate',
  },
  lookAt: [
    'terraform plan',
    'terraform plan -refresh-only',
    'az appservice plan show -n asp-checkout-prod -g rg-checkout-prod',
  ],
  hints: [
    'Run the plan the pipeline will run: it wants to change `sku_name` from "P2v3" back to "P1v3". Scaling down a busy plan in production is exactly what nobody wants tonight.',
    'Decide which side is right. Here Azure is right, so the **code** has to change: set `sku_name = "P2v3"` in main.tf and plan again.',
    'The plan is now clean, but state still records P1v3. `terraform apply -refresh-only -auto-approve` writes what Azure has into state without touching Azure.',
  ],
  solution: [
    { kind: 'run', command: 'terraform plan -refresh-only' },
    { kind: 'write', path: 'main.tf', content: webMain('P2v3') },
    { kind: 'run', command: 'terraform plan' },
    { kind: 'run', command: 'terraform apply -refresh-only -auto-approve' },
  ],
  alternative: {
    label:
      'Also fine: update the code, then a normal apply (it changes nothing, but saves the refreshed state)',
    steps: [
      { kind: 'write', path: 'main.tf', content: webMain('P2v3') },
      { kind: 'run', command: 'terraform apply -auto-approve' },
    ],
  },
  explanation: [
    {
      code: 'terraform plan -refresh-only',
      note: 'Shows only the drift (sku_name P1v3 → P2v3) with no proposed actions - a safe way to see what changed.',
    },
    {
      code: 'sku_name = "P2v3"',
      note: 'The code is the source of truth, so the decision is recorded in Git, reviewed, and survives the next apply.',
    },
    {
      code: 'terraform plan',
      note: '**No changes.** Code and Azure agree, so nothing will be scaled down tonight.',
    },
    {
      code: 'terraform apply -refresh-only -auto-approve',
      note: 'Updates state to P2v3 without calling any write API. State and reality agree again.',
    },
  ],
  wrongFixes: [
    {
      label: 'Apply the plan (scales it back down)',
      steps: [{ kind: 'run', command: 'terraform apply -auto-approve' }],
    },
    {
      label: 'Only accept the drift into state',
      steps: [{ kind: 'run', command: 'terraform apply -refresh-only -auto-approve' }],
    },
  ],
  expect: {
    state: [
      'azurerm_linux_web_app.checkout',
      'azurerm_resource_group.checkout',
      'azurerm_service_plan.checkout',
    ],
    config: [
      {
        kind: 'attr',
        addr: 'azurerm_service_plan.checkout',
        attr: 'sku_name',
        equals: 'P2v3',
        label:
          'The code still says P1v3, so the next normal apply would scale the plan down again.',
      },
    ],
    cloud: [
      {
        key: 'plan',
        path: 'sku_name',
        equals: 'P2v3',
        label:
          'The App Service plan was scaled back to P1v3 - the capacity review said P2v3 stays.',
      },
    ],
    stateAttrs: [
      {
        addr: 'azurerm_service_plan.checkout',
        path: 'sku_name',
        equals: 'P2v3',
        label:
          'State still records P1v3 - refresh it into state (apply -refresh-only, or an apply with no changes).',
      },
    ],
  },
  question: {
    prompt: 'Drift is found. What decides whether you apply (revert) or update the code (accept)?',
    options: [
      {
        text: 'Which value is correct for the business. If the manual change should stay, change the code (and refresh state); if not, apply the code to revert it.',
        correct: true,
        why: 'Right - Terraform does not know which side is right. You decide, then make code, state and Azure agree.',
      },
      {
        text: 'Always apply: the code is the source of truth, so manual changes must be reverted.',
        why: 'Reverting a deliberate, approved change (here, capacity during peak) can cause an outage. Update the code first.',
      },
      {
        text: 'Always use -refresh-only: it accepts the change everywhere.',
        why: 'It only updates state. The code still says P1v3, so the next normal apply scales it down.',
      },
      {
        text: 'Use `ignore_changes = [sku_name]` so drift is never reported.',
        why: 'That hides every future change to the size - including mistakes. Use ignore_changes only for attributes something else legitimately owns (e.g. autoscale).',
      },
    ],
  },
  followUp:
    "The plan's worker_count is changed by an autoscale rule several times a day. How do you stop that showing as drift? (Answer: that one really is owned by something else - use `lifecycle { ignore_changes = [worker_count] }`.)",
  tags: ['terraform', 'drift', 'refresh-only', 'app service', 'scale'],
  related: ['itv-mytf-9', 'itv-mytf-107', 'itv-mytf-43'],
}

/* ---------- tags added by Azure Policy ---------- */

const logsMain = (lifecycle: string) => `resource "azurerm_resource_group" "logging" {
  name     = "rg-logging-prod"
  location = "westeurope"

  tags = {
    app = "logging"
    env = "prod"
  }
${lifecycle}}

resource "azurerm_storage_account" "archive" {
  name                     = "stlogarchiveprod01"
  resource_group_name      = azurerm_resource_group.logging.name
  location                 = azurerm_resource_group.logging.location
  account_tier             = "Standard"
  account_replication_type = "GRS"
  access_tier              = "Cool"

  tags = {
    app = "logging"
    env = "prod"
  }
${lifecycle}}
`

const ignoreCostCenter = `
  lifecycle {
    # CostCenter is owned by the "Inherit CostCenter" Azure Policy.
    ignore_changes = [tags["CostCenter"]]
  }
`

const RG_ID = rgId('rg-logging-prod')
const ARCHIVE_ID = storageId('rg-logging-prod', 'stlogarchiveprod01')

const policyTags: TfScenario = {
  id: 'policy-tags',
  title: 'Tags that come back every night',
  category: 'Drift',
  level: 'medium',
  story:
    'Every night the pipeline plan shows the same two changes - remove the `CostCenter` tag from the resource group and the archive storage account - and every night it applies them. By morning the tag is back. FinOps owns an Azure Policy that adds `CostCenter` (inherited from the subscription) whenever it is missing, and they re-map cost centres every quarter.',
  task: 'Stop the endless diff without fighting the policy: the policy-managed tag must stay in Azure, Terraform must keep managing the other tags, and the plan must be clean.',
  seed: {
    files: { 'providers.tf': providersTf('logging.terraform.tfstate'), 'main.tf': logsMain('') },
    cloud: [
      ...backendResources(),
      {
        key: 'rg',
        type: 'azurerm_resource_group',
        attrs: {
          name: 'rg-logging-prod',
          location: 'westeurope',
          tags: { app: 'logging', env: 'prod', CostCenter: 'CC-4410' },
        },
        createdAt: '2024-04-11T08:00:00Z',
      },
      {
        key: 'archive',
        type: 'azurerm_storage_account',
        attrs: {
          name: 'stlogarchiveprod01',
          resource_group_name: 'rg-logging-prod',
          location: 'westeurope',
          account_tier: 'Standard',
          account_replication_type: 'GRS',
          access_tier: 'Cool',
          tags: { app: 'logging', env: 'prod', CostCenter: 'CC-4410' },
        },
        createdAt: '2024-04-11T08:02:10Z',
        modifiedBy: 'Azure Policy (inherit-costcenter-tag)',
        modifiedAt: '2026-11-11T02:00:41Z',
      },
    ],
    state: [
      { addr: 'azurerm_resource_group.logging', key: 'rg' },
      { addr: 'azurerm_storage_account.archive', key: 'archive' },
    ],
    policy: {
      name: 'inherit-costcenter-tag',
      displayName: 'Inherit the CostCenter tag from the subscription if missing',
      tags: { CostCenter: 'CC-4410' },
      types: ['azurerm_resource_group', 'azurerm_storage_account'],
    },
    activity: [
      {
        time: '2026-11-11T02:00:41Z',
        caller: 'Azure Policy (inherit-costcenter-tag)',
        operation: 'Microsoft.Storage/storageAccounts/write',
        resource: ARCHIVE_ID,
        status: 'Succeeded',
      },
      {
        time: '2026-11-11T02:00:39Z',
        caller: 'sp-terraform-prod',
        operation: 'Microsoft.Storage/storageAccounts/write',
        resource: ARCHIVE_ID,
        status: 'Succeeded',
      },
      {
        time: '2026-11-11T02:00:31Z',
        caller: 'Azure Policy (inherit-costcenter-tag)',
        operation: 'Microsoft.Resources/subscriptions/resourceGroups/write',
        resource: RG_ID,
        status: 'Succeeded',
      },
      {
        time: '2026-11-11T02:00:30Z',
        caller: 'sp-terraform-prod',
        operation: 'Microsoft.Resources/subscriptions/resourceGroups/write',
        resource: RG_ID,
        status: 'Succeeded',
      },
    ],
    stateKey: 'logging.terraform.tfstate',
  },
  lookAt: [
    'terraform plan',
    'az policy assignment list -o table',
    'az monitor activity-log list -g rg-logging-prod -o table',
  ],
  hints: [
    'Apply once and plan again - the diff comes straight back. The activity log shows why: Terraform writes, then Azure Policy writes the tag back seconds later.',
    'Something else legitimately owns that one tag. Terraform has a lifecycle setting for "this attribute is managed elsewhere, do not diff it".',
    'Add `lifecycle { ignore_changes = [tags["CostCenter"]] }` to both resources (`ignore_changes = [tags]` also works, but then Terraform stops managing your own tags too).',
  ],
  solution: [
    { kind: 'run', command: 'az policy assignment list -o table' },
    { kind: 'write', path: 'main.tf', content: logsMain(ignoreCostCenter) },
    { kind: 'run', command: 'terraform plan' },
  ],
  explanation: [
    {
      code: 'az policy assignment list -o table',
      note: 'Confirms a `modify` policy owns the tag - so removing it is pointless, and it will change value when FinOps re-maps cost centres.',
    },
    {
      code: 'ignore_changes = [tags["CostCenter"]]',
      note: 'Ignores only that key. Terraform still adds, changes and removes `app` and `env` as the code says.',
    },
    {
      code: 'terraform plan',
      note: '**No changes.** Nothing to apply - the fix is purely in how Terraform compares.',
    },
    {
      code: 'Trade-off',
      note: '`ignore_changes = [tags]` is simpler but hides every tag change, including mistakes. Ignore the narrowest path that solves the problem.',
    },
  ],
  wrongFixes: [
    {
      label: 'Keep applying',
      steps: [
        { kind: 'run', command: 'terraform apply -auto-approve' },
        { kind: 'run', command: 'terraform apply -auto-approve' },
      ],
    },
    {
      label: 'Ignore it on the resource group only',
      steps: [
        {
          kind: 'write',
          path: 'main.tf',
          content: logsMain('').replace(
            '    env = "prod"\n  }\n}',
            `    env = "prod"\n  }\n${ignoreCostCenter}}`,
          ),
        },
        { kind: 'run', command: 'terraform plan' },
      ],
    },
  ],
  expect: {
    state: ['azurerm_resource_group.logging', 'azurerm_storage_account.archive'],
    config: [
      {
        kind: 'ignores',
        addr: 'azurerm_resource_group.logging',
        attr: 'tags',
        label:
          'azurerm_resource_group.logging still diffs the policy-managed tag - add it to lifecycle.ignore_changes.',
      },
      {
        kind: 'ignores',
        addr: 'azurerm_storage_account.archive',
        attr: 'tags',
        label:
          'azurerm_storage_account.archive still diffs the policy-managed tag - add it to lifecycle.ignore_changes.',
      },
    ],
    cloud: [
      {
        key: 'rg',
        path: 'tags.CostCenter',
        equals: 'CC-4410',
        label: 'The resource group lost its CostCenter tag.',
      },
      {
        key: 'archive',
        path: 'tags.CostCenter',
        equals: 'CC-4410',
        label: 'The storage account lost its CostCenter tag.',
      },
    ],
  },
  question: {
    prompt: 'What is the root cause of the permanent diff?',
    options: [
      {
        text: 'Two owners for one attribute: the code says the tag should not exist, and an Azure Policy modify effect keeps adding it. Each run undoes the other.',
        correct: true,
        why: 'Right. The fix is to give one owner the attribute - here, tell Terraform to ignore that tag.',
      },
      {
        text: 'The azurerm provider cannot read tags added by policy, so it always thinks they are missing.',
        why: 'It reads them fine - that is why the plan wants to remove them.',
      },
      {
        text: 'The state file is corrupted; `terraform state rm` and re-import would fix it.',
        why: 'State is correct. Re-importing changes nothing; the next plan diffs again.',
      },
      {
        text: 'Tags are eventually consistent in Azure; waiting longer between runs fixes it.',
        why: 'The policy re-adds the tag on every write, however long you wait.',
      },
    ],
  },
  followUp:
    'Which other azurerm attributes commonly need ignore_changes? (Examples: an App Service `app_settings` key set by a deployment pipeline, a VMSS or App Service plan `worker_count`/`instances` driven by autoscale, `tags` managed by policy.)',
  tags: ['terraform', 'drift', 'ignore_changes', 'lifecycle', 'azure policy', 'tags'],
  related: ['itv-tf-21', 'itv-mytf-14', 'itv-aziac-18'],
}

export const driftScenarios: TfScenario[] = [driftRevert, driftAccept, policyTags]
