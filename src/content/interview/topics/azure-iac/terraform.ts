import type { InterviewQuestion } from '../../../types'

/** Terraform on Azure: backend and locking, providers, auth, imports and stuck locks. */
export const azureIacTerraformQuestions: InterviewQuestion[] = [
  {
    id: 'itv-aziac-12',
    level: 'intermediate',
    kind: 'open',
    prompt:
      'How do you set up a Terraform backend in Azure Storage, and how does state locking work there?',
    probing:
      'Practical Terraform-on-Azure. They want the storage account hardening, Entra auth instead of keys, and blob leases as the lock.',
    answer: [
      'The `azurerm` backend stores each state file as a **blob** in a container. I create a dedicated storage account for state, in its own resource group and ideally its own subscription, with versioning and soft delete on, public access off, shared key access disabled, and a private endpoint or firewall rules if the runners are inside the network.',
      'Authentication should use **Entra ID**, not account keys: `use_azuread_auth = true` makes the backend use the caller’s identity, which needs **Storage Blob Data Contributor** on the container. In a pipeline that identity comes from OIDC (`use_oidc = true`), so there is no secret anywhere.',
      '**Locking** is built in and needs nothing extra: before any operation that writes state, Terraform takes a **lease** on the state blob. A second `plan` or `apply` finds the blob leased and fails with a lock error showing who holds it. When the operation finishes, the lease is released.',
      'Each configuration and environment gets its own **key** - `orders/prod.tfstate`, `orders/dev.tfstate` - and I lock down who can read the container, because state contains every attribute Terraform manages, including secrets, in plain text.',
    ],
    diagrams: [
      {
        kind: 'sequence',
        title: 'State locking with a blob lease',
        caption: 'The lease is the lock: a second run cannot write until the first releases it.',
        participants: [
          { id: 'a', label: 'Pipeline run A' },
          { id: 'blob', label: 'State blob' },
          { id: 'b', label: 'Pipeline run B' },
        ],
        messages: [
          { from: 'a', to: 'blob', label: 'acquire lease' },
          { from: 'blob', to: 'a', label: 'lease granted', kind: 'return' },
          { from: 'b', to: 'blob', label: 'acquire lease' },
          { from: 'blob', to: 'b', label: 'already leased: lock error', kind: 'return' },
          { from: 'a', to: 'blob', label: 'write new state' },
          { from: 'a', to: 'blob', label: 'release lease' },
        ],
      },
    ],
    code: [
      {
        title: 'Backend with Entra auth and OIDC',
        language: 'hcl',
        code: `terraform {
  required_version = ">= 1.9"
  required_providers {
    azurerm = { source = "hashicorp/azurerm", version = "~> 4.0" }
  }
  backend "azurerm" {
    resource_group_name  = "rg-tfstate"
    storage_account_name = "sttfstateprod001"
    container_name       = "tfstate"
    key                  = "orders/prod.tfstate"
    use_azuread_auth     = true   # no account keys
    use_oidc             = true   # federated identity in CI
  }
}

provider "azurerm" {
  features {}
  subscription_id = var.subscription_id   # required from azurerm 4.x
  use_oidc        = true
}`,
      },
      {
        title: 'Hardened state storage',
        language: 'bash',
        code: `az storage account create -n sttfstateprod001 -g rg-tfstate -l westeurope \\
  --sku Standard_ZRS --kind StorageV2 --min-tls-version TLS1_2 \\
  --allow-blob-public-access false --allow-shared-key-access false

az storage account blob-service-properties update -n sttfstateprod001 -g rg-tfstate \\
  --enable-versioning true --enable-delete-retention true --delete-retention-days 30

az storage container create -n tfstate --account-name sttfstateprod001 --auth-mode login`,
      },
    ],
    traps: [
      'Using the storage account key in `ARM_ACCESS_KEY` in CI, so the key is a long-lived secret with full account access.',
      'One key for every environment, so a dev run can lock or overwrite production state.',
      'No versioning on the state container, so a bad write cannot be rolled back.',
    ],
    followUps: [
      'What role does the pipeline identity need on the state container?',
      'How would you recover a corrupted state file?',
    ],
    tags: ['terraform', 'backend', 'state', 'locking', 'azure storage'],
  },
  {
    id: 'itv-aziac-13',
    level: 'intermediate',
    kind: 'open',
    prompt:
      'What is the difference between the azurerm and azapi providers, and when do you use azapi?',
    probing: 'Whether the candidate can work with new Azure features in Terraform without waiting.',
    answer: [
      '**azurerm** is the main provider, with hand-written resources such as `azurerm_storage_account` that have curated arguments, validation, sensible defaults and good documentation. For the vast majority of resources it is the right choice.',
      '**azapi** is a thin layer over the ARM REST API. `azapi_resource` takes the resource **type and API version** - `Microsoft.App/containerApps@2024-03-01` - and a body that mirrors the ARM JSON. So anything ARM supports, including preview API versions and brand-new properties, is usable on day one.',
      'I use azapi for three things: a **new resource type** that azurerm does not have yet; a **new property** on an existing resource, using `azapi_update_resource` to patch just that property on an azurerm-managed resource; and **preview features** that azurerm will not implement until GA.',
      'The trade-off is that azapi has less validation and the body is only as good as your reading of the ARM reference. When azurerm catches up, I migrate back with a `moved` block or an import, because curated resources are easier to review.',
    ],
    code: [
      {
        title: 'A resource azurerm does not cover yet, and a single-property patch',
        language: 'hcl',
        code: `terraform {
  required_providers {
    azapi = { source = "Azure/azapi", version = "~> 2.0" }
  }
}

resource "azapi_resource" "env" {
  type      = "Microsoft.App/managedEnvironments@2024-03-01"
  name      = "cae-orders-prod"
  parent_id = azurerm_resource_group.app.id
  location  = "westeurope"
  body = {
    properties = {
      zoneRedundant = true
      workloadProfiles = [{ name = "Consumption", workloadProfileType = "Consumption" }]
    }
  }
  response_export_values = ["properties.defaultDomain"]
}

# Patch a property azurerm does not expose on a resource azurerm manages
resource "azapi_update_resource" "sa_feature" {
  type        = "Microsoft.Storage/storageAccounts@2023-05-01"
  resource_id = azurerm_storage_account.sa.id
  body = {
    properties = { allowedCopyScope = "PrivateLink" }
  }
}`,
      },
    ],
    traps: [
      'Using azapi for everything, losing validation and readable plans.',
      'Setting the same property with azurerm and azapi_update_resource, so the two providers fight.',
    ],
    followUps: ['How would you move a resource from azapi to azurerm without recreating it?'],
    tags: ['terraform', 'azurerm', 'azapi', 'providers'],
  },
  {
    id: 'itv-aziac-14',
    level: 'basic',
    kind: 'open',
    prompt: 'How does Terraform authenticate to Azure, locally and in a pipeline?',
    probing:
      'The identity basics. Good answers move from az login to OIDC and never mention committing secrets.',
    answer: [
      'Locally, the azurerm provider picks up your **Azure CLI login**: `az login`, select the subscription, and Terraform uses that token. That is fine for experimenting, but it means your own permissions are what Terraform has.',
      'In automation there are three options, in increasing order of preference. A **service principal with a client secret** (`ARM_CLIENT_ID`, `ARM_CLIENT_SECRET`, `ARM_TENANT_ID`) works but the secret expires and can leak. A **managed identity** (`ARM_USE_MSI=true`) works when the runner is itself an Azure resource, such as a self-hosted agent VM. **OIDC workload identity federation** (`ARM_USE_OIDC=true`) exchanges the pipeline’s own token for an Azure token, with no stored secret, and works on hosted agents in Azure Pipelines and GitHub Actions.',
      'Whatever the method, the identity should have the **least privilege** needed for the configuration it deploys, and plan and apply can even use different identities - read-only for plans on pull requests, write for applies from main.',
    ],
    code: [
      {
        title: 'OIDC in GitHub Actions',
        language: 'yaml',
        code: `permissions:
  id-token: write
  contents: read

env:
  ARM_CLIENT_ID: \${{ vars.AZURE_CLIENT_ID }}
  ARM_TENANT_ID: \${{ vars.AZURE_TENANT_ID }}
  ARM_SUBSCRIPTION_ID: \${{ vars.AZURE_SUBSCRIPTION_ID }}
  ARM_USE_OIDC: true

jobs:
  plan:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: hashicorp/setup-terraform@v3
      - run: terraform init
      - run: terraform plan -out=tfplan`,
      },
      {
        title: 'Locally',
        language: 'bash',
        code: `az login
az account set --subscription <subscription-id>
export ARM_SUBSCRIPTION_ID=$(az account show --query id -o tsv)
terraform init && terraform plan`,
        placeholders: ['<subscription-id>'],
      },
    ],
    traps: [
      'A client secret in a committed `.tfvars` or provider block.',
      'Running production applies with a personal account.',
    ],
    followUps: ['Why might you use different identities for plan and apply?'],
    tags: ['terraform', 'authentication', 'oidc', 'managed identity'],
  },
  {
    id: 'itv-aziac-15',
    level: 'advanced',
    kind: 'open',
    prompt:
      'You inherit a subscription full of resources created in the portal. How do you bring them under IaC with Terraform or Bicep?',
    probing:
      'Brownfield adoption. They want a safe, incremental process that ends with a clean plan, not a big-bang rewrite.',
    answer: [
      'The goal is to end with code and state that describe what exists **without changing anything**. I would go workload by workload, starting with the least risky, and the success criterion for each is a **plan or what-if that shows no changes**.',
      'With **Terraform**: declare `import` blocks for the resources - the Azure resource ID is the import ID - and run `terraform plan -generate-config-out=generated.tf` to have Terraform write a first draft of the configuration. Or use **aztfexport**, Microsoft’s tool that exports a whole resource group into HCL plus import blocks. Either way the generated code is a starting point: I rename things, replace hard-coded IDs with references, extract variables and modules, and re-plan until it is clean.',
      'With **Bicep** there is no import step, because there is no state. I export the resource group (portal or `az group export`), `az bicep decompile` it, clean it up, and iterate with **what-if** until it reports no changes. Then I deploy it as a **deployment stack** so the resources become managed from then on.',
      'Whichever tool, I also lock the door behind me: once a workload is in code, remove people’s write access in the portal or use stack deny settings, otherwise it drifts straight back.',
    ],
    diagrams: [
      {
        kind: 'flow',
        title: 'Adopting existing resources into Terraform',
        caption: 'The finish line is a plan with no changes; generated code is only a draft.',
        nodes: [
          { label: 'Pick one workload', detail: 'Lowest risk first', tone: 'accent' },
          { label: 'import blocks or aztfexport', detail: 'Resource IDs as import IDs' },
          { label: 'Generate config', detail: 'plan -generate-config-out' },
          {
            label: 'Refactor the draft',
            detail: 'References, variables, modules',
            branch: { label: 'Plan shows changes', detail: 'Adjust code until it matches reality' },
          },
          { label: 'Clean plan, then apply', detail: 'Imports recorded in state', tone: 'success' },
          { label: 'Remove portal write access', detail: 'Or drift returns immediately' },
        ],
      },
    ],
    code: [
      {
        title: 'Terraform import blocks with config generation',
        language: 'hcl',
        code: `import {
  to = azurerm_resource_group.orders
  id = "/subscriptions/<sub>/resourceGroups/rg-orders-prod"
}

import {
  to = azurerm_storage_account.orders
  id = "/subscriptions/<sub>/resourceGroups/rg-orders-prod/providers/Microsoft.Storage/storageAccounts/stordersprod"
}

# terraform plan -generate-config-out=generated.tf
# Review generated.tf, refactor, and re-plan until "No changes".`,
        placeholders: ['<sub>'],
      },
      {
        title: 'aztfexport for a whole resource group',
        language: 'bash',
        code: `# Writes HCL plus import blocks; does not touch the resources
aztfexport resource-group --non-interactive --hcl-only \\
  --generate-import-block --output-dir ./orders rg-orders-prod

cd orders && terraform init && terraform plan   # expect imports, zero changes`,
      },
    ],
    deeper: [
      'Some properties cannot be read back from Azure - secrets, some write-only settings - so generated code will be missing them and the first plan will want to change them. Those need `lifecycle { ignore_changes = [...] }` or the real value from Key Vault, decided case by case.',
      'Terraform 1.5+ `import` blocks are reviewable in a pull request and run in the pipeline, which beats someone running `terraform import` on a laptop against production state.',
    ],
    traps: [
      'Applying generated code before the plan is clean, which modifies production.',
      'A big-bang import of an entire subscription in one state file.',
      'Importing and then letting people keep editing in the portal.',
    ],
    followUps: [
      'What do you do with properties Azure will not return?',
      'How would you split the imported estate into state files?',
    ],
    tags: ['terraform', 'bicep', 'import', 'brownfield', 'aztfexport'],
  },
  {
    id: 'itv-aziac-16',
    level: 'advanced',
    kind: 'scenario',
    prompt:
      'Every Terraform run fails with "Error acquiring the state lock" on the azurerm backend. Someone says to just break the lease. What do you do?',
    probing:
      'Operational care with state. The right answer confirms nothing is running before breaking the lock.',
    answer: [
      'The lock error shows the **lock ID, who took it, when, and the operation**. That is the first thing to read. A lock from a pipeline run twenty minutes ago that is still in progress is working exactly as designed - the fix is to wait.',
      'If the holder is a run that **crashed** or was cancelled - an agent that died mid-apply, a laptop that went to sleep - the lease was never released. Before breaking it I would **confirm that nothing is still running**: check the pipeline runs, ask the named person, and look at the blob’s lease state. Breaking a live lock lets two processes write state at once, which is one of the few ways to genuinely corrupt it.',
      'Once confirmed stale, I would take a **backup** of the current state (versioning should already have one), then use `terraform force-unlock <lock-id>`, which is the supported route. If that fails, breaking the blob lease directly with the CLI does the same thing at the storage level.',
      'Then run a `plan` to check state is coherent - an apply that died midway will show the remaining work, which is normal. And fix the cause: pipeline cancellation that kills Terraform abruptly, or people running applies from laptops against shared state.',
    ],
    diagrams: [
      {
        kind: 'flow',
        title: 'Handling a stuck state lock',
        caption: 'Breaking a live lock is how state gets corrupted. Confirm first.',
        nodes: [
          { label: 'Error acquiring the state lock', tone: 'danger' },
          {
            label: 'Read lock info',
            detail: 'Who, when, which operation',
            branch: { label: 'Run still in progress', detail: 'Wait - the lock is working' },
          },
          { label: 'Confirm the holder is dead', detail: 'Pipeline runs, ask the person' },
          {
            label: 'Back up state, force-unlock',
            detail: 'terraform force-unlock LOCK_ID',
            tone: 'accent',
          },
          { label: 'Plan to verify state', detail: 'Remaining work is normal', tone: 'success' },
        ],
      },
    ],
    code: [
      {
        title: 'Inspect the lease, then unlock the supported way',
        language: 'bash',
        code: `# Is the state blob leased, and since when?
az storage blob show --auth-mode login --account-name sttfstateprod001 \\
  -c tfstate -n orders/prod.tfstate \\
  --query "{state:properties.lease.state, status:properties.lease.status, modified:properties.lastModified}"

# Back up the current state
terraform state pull > state-backup-$(date +%Y%m%d-%H%M%S).json

# Supported route: use the lock ID from the error message
terraform force-unlock <lock-id>

# Last resort at the storage level
az storage blob lease break --auth-mode login --account-name sttfstateprod001 \\
  -c tfstate -b orders/prod.tfstate`,
        placeholders: ['<lock-id>'],
      },
    ],
    deeper: [
      'In Azure Pipelines, a cancelled job sends a signal and then kills the process after a timeout. Giving the Terraform step a sensible cancel timeout (`cancelTimeoutInMinutes`) lets Terraform release the lease itself.',
    ],
    traps: [
      'Breaking the lease while another apply is running.',
      'Deleting the state blob to "clear" the lock.',
      'Unlocking and applying without a plan to verify state first.',
    ],
    followUps: [
      'What happens if two applies write state at the same time?',
      'How do you restore a previous state version from blob versioning?',
    ],
    tags: ['scenario', 'terraform', 'state', 'locking', 'troubleshooting'],
  },
]
