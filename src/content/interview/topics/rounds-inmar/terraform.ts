import type { InterviewQuestion } from '../../../types'

/** Inmar round: Terraform and Bicep questions. */
export const roundsInmarTerraformQuestions: InterviewQuestion[] = [
  {
    id: 'itv-rinm-18',
    level: 'intermediate',
    kind: 'open',
    prompt: 'What are Azure providers in Terraform, and how do you use them?',
    probing:
      'Which Azure providers exist, how to pin and configure azurerm, the features block, and aliases for several subscriptions.',
    answer: [
      "A **provider** is a plugin that lets Terraform talk to a platform's API. Terraform itself knows nothing about Azure; the provider translates your `.tf` code into Azure API calls.",
      '**Azure-related providers**\n- **Provider**: **azurerm** (`hashicorp/azurerm`); **Manages**: Azure resources through Azure Resource Manager; **Example resources**: Resource groups, VNets, AKS, Key Vault, Storage\n- **Provider**: **azuread** (`hashicorp/azuread`); **Manages**: Microsoft Entra ID objects; **Example resources**: App registrations, service principals, groups\n- **Provider**: **azapi** (`azure/azapi`); **Manages**: Any Azure resource directly through the ARM REST API; **Example resources**: New or preview features not yet in azurerm\n- **Provider**: **azuredevops** (`microsoft/azuredevops`); **Manages**: Azure DevOps; **Example resources**: Projects, repos, service connections, pipelines',
      'Helper providers often used with them: `random` (unique names, passwords), `tls`, `kubernetes`, `helm`.',
      '**How to use it:** **1. Declare and pin the provider version** (usually in `providers.tf` or `versions.tf`):',
      'The `features` block changes provider behaviour, for example:',
      '**3. Run `terraform init`.** Terraform downloads the provider from the Terraform Registry and records the exact version in `.terraform.lock.hcl`. Commit this lock file so everyone and every pipeline uses the same version.',
      '**Multiple subscriptions: provider aliases:** Example: the spoke VNet is in the app subscription, and the hub VNet is in the network subscription.',
      '**Interview answer:** "A provider is the plugin that lets Terraform call a platform\'s API. For Azure, I mainly use `azurerm` for Azure resources, `azuread` for Entra ID objects like app registrations, and `azapi` for features not yet in azurerm. I declare them in `required_providers` with a pinned version, configure azurerm with the `features` block and subscription ID, and commit the `.terraform.lock.hcl` file. When I deploy to multiple subscriptions, for example hub and spoke, I use provider aliases."',
    ],
    code: [
      {
        title: 'Declare and pin providers',
        language: 'hcl',
        code: `terraform {
  required_version = ">= 1.6"

  required_providers {
    azurerm = {
      source  = "hashicorp/azurerm"
      version = "~> 4.0"   # any 4.x, but not 5.0
    }
    azuread = {
      source  = "hashicorp/azuread"
      version = "~> 3.0"
    }
  }
}`,
      },
      {
        title: 'Configure the azurerm provider',
        language: 'hcl',
        code: `provider "azurerm" {
  features {}                           # required block, can be empty
  subscription_id = var.subscription_id # required in azurerm 4.x
}`,
      },
      {
        title: 'Provider features block',
        language: 'hcl',
        code: `provider "azurerm" {
  features {
    key_vault {
      purge_soft_delete_on_destroy = false
    }
    resource_group {
      prevent_deletion_if_contains_resources = true
    }
  }
  subscription_id = var.subscription_id
}`,
      },
      {
        title: 'Provider aliases for multiple subscriptions',
        language: 'hcl',
        code: `provider "azurerm" {
  features {}
  subscription_id = var.app_subscription_id
}

provider "azurerm" {
  alias           = "hub"
  features {}
  subscription_id = var.hub_subscription_id
}

resource "azurerm_virtual_network_peering" "hub_to_spoke" {
  provider                  = azurerm.hub
  name                      = "hub-to-spoke"
  resource_group_name       = "rg-hub-network"
  virtual_network_name      = "vnet-hub"
  remote_virtual_network_id = azurerm_virtual_network.spoke.id
}`,
      },
    ],
    tags: ['terraform', 'providers', 'azurerm', 'azure'],
  },
  {
    id: 'itv-rinm-19',
    level: 'intermediate',
    kind: 'open',
    prompt: 'How do you integrate Terraform with Azure?',
    probing:
      'The full Terraform-on-Azure setup: how it authenticates, where remote state lives, and how a pipeline runs plan and apply.',
    answer: [
      'Integration has three parts: **authentication**, a **remote backend for state**, and a **pipeline** to run it.',
      '**1. Authentication options**\n- **Where Terraform runs**: Your laptop; **Recommended authentication**: **Azure CLI**: `az login`, and Terraform uses that session\n- **Where Terraform runs**: Azure DevOps / GitHub Actions; **Recommended authentication**: **Service principal or managed identity with OIDC** (workload identity federation, no secret)\n- **Where Terraform runs**: Self-hosted agent VM in Azure; **Recommended authentication**: **Managed identity** of the VM\n- **Where Terraform runs**: Last resort; **Recommended authentication**: Service principal with client secret (must be rotated)',
      'The provider reads these environment variables:',
      'The identity gets only the RBAC roles it needs, for example `Contributor` on the target resource group, plus `Storage Blob Data Contributor` on the state storage account.',
      '**2. Remote state in Azure Storage**',
      '(See Q20 for locking.)',
      '**3. Azure DevOps pipeline**',
      'Flow: PR → `fmt`, `validate`, `plan` (and a security scan such as Checkov) → review the plan → approval → `apply` the **saved plan**, so exactly what was reviewed is applied.',
      '**Interview answer:** "I integrate Terraform with Azure in three parts. For authentication, locally I use the Azure CLI login, and in pipelines I use an Azure DevOps service connection with workload identity federation, passing the client ID, tenant ID, and OIDC token to the azurerm provider through `ARM_` environment variables, so there is no secret. The state is stored in an Azure Storage backend with Entra ID authentication and blob locking. The pipeline runs fmt, validate, and plan on the PR, saves the plan, and after approval applies exactly that plan."',
    ],
    code: [
      {
        title: 'Authenticate with ARM_ environment variables',
        language: 'bash',
        code: `export ARM_CLIENT_ID="<app-or-identity-client-id>"
export ARM_TENANT_ID="<tenant-id>"
export ARM_SUBSCRIPTION_ID="<subscription-id>"
export ARM_USE_OIDC=true        # for workload identity federation
# export ARM_USE_MSI=true       # for a managed identity`,
      },
      {
        title: 'Remote state in Azure Storage',
        language: 'hcl',
        code: `terraform {
  backend "azurerm" {
    resource_group_name  = "rg-tfstate"
    storage_account_name = "sttfstate001"
    container_name       = "tfstate"
    key                  = "dev/app.tfstate"
    use_azuread_auth     = true   # use Entra ID instead of storage keys
    use_oidc             = true
  }
}`,
      },
      {
        title: 'Azure DevOps pipeline for Terraform',
        language: 'yaml',
        code: `stages:
  - stage: Plan
    jobs:
      - job: Plan
        steps:
          - task: AzureCLI@2
            displayName: Terraform init and plan
            inputs:
              azureSubscription: sc-azure-dev      # workload identity federation
              scriptType: bash
              scriptLocation: inlineScript
              addSpnToEnvironment: true            # exposes servicePrincipalId, tenantId, idToken
              inlineScript: |
                export ARM_CLIENT_ID="$servicePrincipalId"
                export ARM_TENANT_ID="$tenantId"
                export ARM_SUBSCRIPTION_ID="$(az account show --query id -o tsv)"
                export ARM_OIDC_TOKEN="$idToken"
                export ARM_USE_OIDC=true
                terraform init
                terraform plan -out=tfplan
          - publish: tfplan
            artifact: tfplan

  - stage: Apply
    dependsOn: Plan
    jobs:
      - deployment: Apply
        environment: dev        # add an approval check on this environment
        strategy:
          runOnce:
            deploy:
              steps:
                - checkout: self
                - download: current
                  artifact: tfplan
                # same AzureCLI@2 login as above, then:
                # terraform init && terraform apply $(Pipeline.Workspace)/tfplan/tfplan`,
      },
    ],
    tags: ['terraform', 'azure', 'authentication', 'remote state', 'azure devops'],
  },
  {
    id: 'itv-rinm-20',
    level: 'advanced',
    kind: 'open',
    prompt: 'How do you enable the lock mechanism in a storage account for the state file?',
    probing:
      'That locking comes from the blob lease in the azurerm backend, the difference between a state lock and an Azure resource lock, and safe unlocking.',
    answer: [
      'Good news: with the **azurerm backend**, state locking is **built in and automatic**. Terraform takes a **blob lease** on the state file during operations that write state. You do not need a separate lock table (unlike the older AWS S3 + DynamoDB setup).',
      '**Step 3: Protect the storage account itself with an Azure resource lock:** The blob lease protects the **state file from concurrent runs**. An Azure **resource lock** protects the **storage account from being deleted**:',
      'Use `CanNotDelete`, not `ReadOnly`. A `ReadOnly` lock blocks operations Terraform needs on the account.',
      '**Check and release a lock**',
      'A lock gets "stuck" when a pipeline is cancelled or an agent crashes in the middle of an apply.',
      '**Interview answer:** "With the azurerm backend, locking is automatic: Terraform takes a blob lease on the state file, so a second run fails with \'Error acquiring the state lock\' until the first one finishes. My part is to configure the backend and secure the storage account: no public access, Entra ID authentication, versioning, and soft delete for recovery, and a `CanNotDelete` resource lock on the account. If a lock gets stuck after a cancelled pipeline, I confirm nothing is running and then use `terraform force-unlock` with the lock ID."',
    ],
    code: [
      {
        title: 'How blob lease locking works',
        language: 'text',
        code: `terraform apply (User A)  --> acquires lease on dev/app.tfstate --> runs
terraform apply (User B)  --> lease already taken --> "Error acquiring the state lock"
User A finishes           --> lease released --> User B can run`,
      },
      {
        title: 'Step 1: secure storage account for state',
        language: 'bash',
        code: `az group create -n rg-tfstate -l eastus

az storage account create -n sttfstate001 -g rg-tfstate -l eastus \\
  --sku Standard_GRS \\
  --min-tls-version TLS1_2 \\
  --allow-blob-public-access false

# Recover from accidental overwrite or deletion
az storage account blob-service-properties update \\
  --account-name sttfstate001 -g rg-tfstate \\
  --enable-versioning true \\
  --enable-delete-retention true --delete-retention-days 30

az storage container create -n tfstate --account-name sttfstate001 --auth-mode login`,
      },
      {
        title: 'Step 2: azurerm backend',
        language: 'hcl',
        code: `terraform {
  backend "azurerm" {
    resource_group_name  = "rg-tfstate"
    storage_account_name = "sttfstate001"
    container_name       = "tfstate"
    key                  = "dev/app.tfstate"
    use_azuread_auth     = true
  }
}`,
      },
      {
        title: 'Step 3: resource lock on the storage account',
        language: 'bash',
        code: `az lock create \\
  --name lock-tfstate \\
  --lock-type CanNotDelete \\
  --resource-group rg-tfstate \\
  --resource-name sttfstate001 \\
  --resource-type Microsoft.Storage/storageAccounts`,
      },
      {
        title: 'Check and release a lock',
        language: 'bash',
        code: `# Is the state file locked?
az storage blob show --account-name sttfstate001 -c tfstate -n dev/app.tfstate \\
  --auth-mode login --query properties.lease

# Release a stuck lock (only after confirming nobody is running Terraform)
terraform force-unlock <LOCK_ID>

# If force-unlock does not work, break the blob lease
az storage blob lease break --account-name sttfstate001 -c tfstate \\
  -b dev/app.tfstate --auth-mode login`,
      },
    ],
    followUps: [
      'What is the difference between a Terraform state lock and an Azure CanNotDelete lock?',
      'How do you protect the state file from accidental overwrite or deletion?',
      'When is it safe to run terraform force-unlock?',
    ],
    tags: ['terraform', 'state', 'locking', 'azure storage', 'backend'],
  },
  {
    id: 'itv-rinm-21',
    level: 'advanced',
    kind: 'scenario',
    prompt:
      'If the state file is locked, where will you get the lock details: in terraform plan, apply, or both?',
    probing:
      'Whether you know both plan and apply take the lock, can read the lock ID and owner from the error, and unlock safely.',
    answer: [
      '**Both.** By default, `terraform plan` and `terraform apply` both try to acquire the state lock, so if another operation holds it, **both** fail and show the lock details.',
      "Other commands that also take the lock: `destroy`, `refresh`, `import`, `state mv`, `state rm`, and `taint`. Commands that only read or don't touch state, like `fmt`, `validate`, `output`, and `show`, don't need it.",
      '**What the error looks like**',
      '- **Field**: **ID**; **Tells you**: The lock ID, needed for `terraform force-unlock`\n- **Field**: **Operation**; **Tells you**: What the other run is doing (plan, apply)\n- **Field**: **Who**; **Tells you**: User and machine (for example a pipeline agent)\n- **Field**: **Created**; **Tells you**: When it started: an old timestamp suggests a stuck lock',
      '**What to do**\n1. Use **Who** and **Created** to find the other run: is a pipeline still running?\n2. If it is running, **wait**, or use `-lock-timeout=10m` so Terraform retries instead of failing immediately:\n3. If the run was cancelled or crashed, release it:',
      '`terraform plan -lock=false` skips locking. It is acceptable only for a quick read-only check, and **never** for apply.',
      "**Interview answer:** \"Both. Plan and apply both acquire the lock by default, so either one shows 'Error acquiring the state lock' with the lock info: the lock ID, the operation, who holds it, and when it was created. I use 'Who' and 'Created' to find the other run. If it's still running, I wait or use `-lock-timeout`. If it was a cancelled pipeline, I use `terraform force-unlock` with the lock ID. I never disable locking for apply.\"",
    ],
    code: [
      {
        title: 'State lock error output',
        language: 'text',
        code: `Error: Error acquiring the state lock

Error message: state blob is already locked
Lock Info:
  ID:        3f1c2a9e-7b4d-4c1e-9a2f-6d8e5b0c1a77
  Path:      tfstate/dev/app.tfstate
  Operation: OperationTypeApply
  Who:       azureuser@build-agent-01
  Version:   1.9.5
  Created:   2026-10-20 09:15:42.123 +0000 UTC
  Info:

Terraform acquires a state lock to protect the state from being written
by multiple users at the same time.`,
      },
      {
        title: 'Wait for the lock instead of failing',
        language: 'bash',
        code: `terraform apply -lock-timeout=10m`,
      },
      {
        title: 'Force-unlock a stuck lock',
        language: 'bash',
        code: `terraform force-unlock 3f1c2a9e-7b4d-4c1e-9a2f-6d8e5b0c1a77`,
      },
    ],
    followUps: [
      'Why does terraform plan take a lock at all, and when would you use -lock=false?',
      'How do you stop two pipeline runs from fighting over the same state?',
      'What do you check before releasing a lock someone else holds?',
    ],
    tags: ['terraform', 'state', 'locking', 'troubleshooting'],
  },
  {
    id: 'itv-rinm-22',
    level: 'intermediate',
    kind: 'open',
    prompt: 'What are workspaces and data sources in Terraform?',
    probing:
      'That you know what workspaces are and their limits, and how data sources read existing resources without managing them.',
    answer: [
      "**Workspaces:** A **workspace** lets you use the **same code with separate state files**. Each workspace has its own state, so `dev` and `qa` don't overwrite each other.",
      'With the azurerm backend, each workspace gets its own state blob in the same container.',
      '**Limitation:** all workspaces share the same backend and the same credentials, and it is easy to apply to the wrong one. For **production**, many teams prefer **separate folders or separate backend keys per environment** (with separate service connections), and use workspaces for short-lived or similar environments.',
      '(In HCP Terraform / Terraform Cloud, a "workspace" means something bigger: a separate unit with its own state, variables, and runs.)',
      '**Data sources:** A **data source** **reads** information about something that **already exists** (created manually or by another Terraform project). It never creates or changes it.',
      '- **`resource`**: Creates, updates, deletes; **`data`**: Only reads\n- **`resource`**: `resource "azurerm_resource_group" "rg"`; **`data`**: `data "azurerm_resource_group" "shared"`',
      'Note: values read by data sources, including secrets, are stored in the state file, so the state must be secured.',
      '**Interview answer:** "A workspace lets me use the same Terraform code with separate state files, for example dev and qa, and I can use `terraform.workspace` in names. For production, I prefer separate backend keys or folders per environment for stronger isolation. A data source reads existing resources without managing them, for example a subnet created by the network team, the current tenant with `azurerm_client_config`, or a secret from Key Vault, so I can reference them in my resources."',
    ],
    code: [
      {
        title: 'Workspace commands',
        language: 'bash',
        code: `terraform workspace new dev
terraform workspace new qa
terraform workspace list
#   default
# * qa
#   dev
terraform workspace select dev
terraform apply -var-file=dev.tfvars`,
      },
      {
        title: 'Use the workspace name in code',
        language: 'hcl',
        code: `resource "azurerm_resource_group" "rg" {
  name     = "rg-app-\${terraform.workspace}"   # rg-app-dev, rg-app-qa
  location = "eastus"
}`,
      },
      {
        title: 'Data source examples',
        language: 'hcl',
        code: `# Current login details (tenant ID, object ID of the pipeline identity)
data "azurerm_client_config" "current" {}

# A VNet created by the network team
data "azurerm_subnet" "aks" {
  name                 = "snet-aks"
  virtual_network_name = "vnet-hub"
  resource_group_name  = "rg-network"
}

# A secret already in Key Vault
data "azurerm_key_vault" "kv" {
  name                = "kv-shared-dev"
  resource_group_name = "rg-shared"
}

data "azurerm_key_vault_secret" "db_password" {
  name         = "db-password"
  key_vault_id = data.azurerm_key_vault.kv.id
}

resource "azurerm_kubernetes_cluster" "aks" {
  # ...
  default_node_pool {
    name           = "system"
    vm_size        = "Standard_D4s_v5"
    vnet_subnet_id = data.azurerm_subnet.aks.id
  }
}`,
      },
    ],
    tags: ['terraform', 'workspaces', 'data sources'],
  },
  {
    id: 'itv-rinm-23',
    level: 'basic',
    kind: 'open',
    prompt: 'What are input variables in Terraform?',
    probing:
      'How variables are declared, typed and validated, and every way a value can be passed in.',
    answer: [
      '**Input variables** are the **parameters** of your Terraform code. Instead of hardcoding values like the location or VM size, you declare variables and pass different values per environment, so the same code works for dev, qa, and prod.',
      '**Variable types**\n- **Type**: `string`; **Example**: `"eastus"`\n- **Type**: `number`; **Example**: `3`\n- **Type**: `bool`; **Example**: `true`\n- **Type**: `list(string)`; **Example**: `["10.10.1.0/24", "10.10.2.0/24"]`\n- **Type**: `map(string)`; **Example**: `{ owner = "devops", env = "dev" }`\n- **Type**: `object({...})`; **Example**: `{ name = "web", size = "Standard_B2s" }`',
      '**Variable arguments**\n- **Argument**: `description`; **Purpose**: Documents what it is for\n- **Argument**: `type`; **Purpose**: Rejects wrong values early\n- **Argument**: `default`; **Purpose**: Makes it optional; without it, the variable is required\n- **Argument**: `validation`; **Purpose**: Custom rules with a clear error message\n- **Argument**: `sensitive`; **Purpose**: Hides the value in plan/apply output (Q25)\n- **Argument**: `nullable`; **Purpose**: Whether `null` is allowed',
      '**Ways to pass values**',
      'If a required variable has no value, Terraform asks for it interactively (and fails in a pipeline, which is good).',
      '**Interview answer:** "Input variables are the parameters of the Terraform code, so the same code can deploy different environments. I declare them with a description, type, and default if they\'re optional, and add validation rules, for example allowing only dev, qa, or prod. Values come from tfvars files per environment, `-var` on the command line, or `TF_VAR_` environment variables in the pipeline, and I mark secrets as sensitive."',
    ],
    code: [
      {
        title: 'Declaring a variable',
        language: 'hcl',
        code: `variable "location" {
  description = "Azure region for all resources"
  type        = string
  default     = "eastus"
}

variable "environment" {
  description = "Environment name"
  type        = string

  validation {
    condition     = contains(["dev", "qa", "prod"], var.environment)
    error_message = "environment must be dev, qa, or prod."
  }
}

variable "node_count" {
  type    = number
  default = 3
}

variable "tags" {
  type = map(string)
  default = {
    owner = "devops"
  }
}`,
      },
      {
        title: 'Use a variable with var.<name>',
        language: 'hcl',
        code: `resource "azurerm_resource_group" "rg" {
  name     = "rg-app-\${var.environment}"
  location = var.location
  tags     = var.tags
}`,
      },
      {
        title: 'Ways to pass values',
        language: 'bash',
        code: `terraform apply -var="environment=dev"            # command line
terraform apply -var-file="dev.tfvars"            # tfvars file
export TF_VAR_environment=dev                     # environment variable
# or terraform.tfvars / *.auto.tfvars, which load automatically`,
      },
    ],
    tags: ['terraform', 'variables', 'tfvars'],
  },
  {
    id: 'itv-rinm-24',
    level: 'intermediate',
    kind: 'open',
    prompt: 'What is the difference between local values and tfvars in Terraform?',
    probing:
      'The difference between values supplied from outside (tfvars) and values computed inside (locals), and variable precedence.',
    answer: [
      '- **Locals** are **internal helper values** calculated **inside** the code. They cannot be changed from outside.\n- **tfvars files** are **value files** that **supply inputs** to variables from outside, usually one file per environment.',
      'Simple analogy: variables are the **form fields**, tfvars is **how you fill in the form** for each environment, and locals are **calculations the code does** with what you filled in.',
      '- **Purpose** — **`locals`**: Avoid repetition, compute values; **`.tfvars`**: Provide values for input variables\n- **Defined in** — **`locals`**: `locals { }` block in `.tf` files; **`.tfvars`**: `dev.tfvars`, `prod.tfvars`, `terraform.tfvars`\n- **Can be overridden from outside?** — **`locals`**: No; **`.tfvars`**: Yes, it is the outside input\n- **Can use expressions and functions?** — **`locals`**: Yes; **`.tfvars`**: No, only literal values\n- **Referenced as** — **`locals`**: `local.name`; **`.tfvars`**: Fills `var.name`',
      '**Variable value precedence (lowest to highest)**\n1. `default` in the variable block\n2. `TF_VAR_` environment variables\n3. `terraform.tfvars`\n4. `terraform.tfvars.json`\n5. `*.auto.tfvars` (alphabetical order)\n6. `-var` and `-var-file` on the command line (the last one wins)',
      '**Tip:** never commit secrets in tfvars files. Pass them from Key Vault or pipeline secret variables as `TF_VAR_` environment variables.',
      '**Interview answer:** "Locals are internal values computed inside the code, like a name prefix or a common tags map, to avoid repetition. They can\'t be overridden from outside. A tfvars file supplies values for input variables from outside, usually one per environment, like `dev.tfvars` and `prod.tfvars`. So tfvars change what goes in, and locals compute values from it. I keep secrets out of tfvars and pass them as `TF_VAR_` environment variables from Key Vault."',
    ],
    code: [
      {
        title: 'variables.tf',
        language: 'hcl',
        code: `variable "environment" { type = string }
variable "location"    { type = string }
variable "owner"       { type = string }`,
      },
      {
        title: 'dev.tfvars',
        language: 'hcl',
        code: `environment = "dev"
location    = "eastus"
owner       = "devops-team"`,
      },
      {
        title: 'prod.tfvars',
        language: 'hcl',
        code: `environment = "prod"
location    = "westeurope"
owner       = "platform-team"`,
      },
      {
        title: 'main.tf with locals',
        language: 'hcl',
        code: `locals {
  name_prefix = "app-\${var.environment}-\${var.location}"

  common_tags = {
    environment = var.environment
    owner       = var.owner
    managed_by  = "terraform"
  }
}

resource "azurerm_resource_group" "rg" {
  name     = "rg-\${local.name_prefix}"
  location = var.location
  tags     = local.common_tags
}

resource "azurerm_storage_account" "sa" {
  name                     = "st\${var.environment}app001"
  resource_group_name      = azurerm_resource_group.rg.name
  location                 = var.location
  account_tier             = "Standard"
  account_replication_type = "LRS"
  tags                     = local.common_tags   # same tags reused
}`,
      },
      {
        title: 'Apply per environment',
        language: 'bash',
        code: `terraform apply -var-file=dev.tfvars
terraform apply -var-file=prod.tfvars`,
      },
    ],
    tags: ['terraform', 'locals', 'tfvars', 'variables'],
  },
  {
    id: 'itv-rinm-25',
    level: 'intermediate',
    kind: 'open',
    prompt: 'Explain variables.tf, outputs.tf, and sensitive variables in Terraform.',
    probing:
      'Standard file layout, how outputs are consumed, and what sensitive really hides (and that it is still in state).',
    answer: [
      'Terraform reads **all `.tf` files in a folder together**. The file names are a **convention** for readability, not a requirement.',
      '**variables.tf:** Declares the **inputs** of the configuration or module (see Q23):',
      '**outputs.tf:** Exposes **values after apply**: to show them, to pass them to a pipeline, or to give them to a parent module.',
      'Real use: the infra pipeline outputs the AKS name and ACR login server, and the app deployment pipeline uses them. In modules, the parent reads outputs as `module.network.subnet_id`.',
      '**Sensitive variables:** `sensitive = true` **hides the value in the plan, apply, and output display**:',
      '**Important limitations:**',
      "1. The value is **still stored in plain text in the state file**. So the state must be protected (private storage account, RBAC, encryption).\n2. `terraform output -raw sql_connection_string` **still shows it**. `sensitive` only hides it from normal logs.\n3. Don't put the value in tfvars committed to Git. Pass it in safely: Or in Azure DevOps, map a secret pipeline variable (linked to Key Vault) to `TF_VAR_sql_admin_password`.",
      'Newer Terraform versions (1.10+) add **ephemeral** variables and (1.11+) **write-only** arguments, which keep secrets out of the state entirely, for providers that support them.',
      'Even better: let Azure generate and manage the secret, or use Entra ID authentication for Azure SQL instead of passwords.',
      '**Interview answer:** "`variables.tf` declares the inputs with their types, descriptions, defaults, and validation. `outputs.tf` exposes values after apply, like the AKS name or resource IDs, which I use in pipelines or pass between modules. Marking a variable or output as `sensitive` hides it in plan and apply logs, but it\'s still stored in plain text in the state file, so I secure the state backend and pass secrets from Key Vault through `TF_VAR_` environment variables instead of committing them in tfvars."',
    ],
    code: [
      {
        title: 'Standard file layout',
        language: 'text',
        code: `app/
 ├── providers.tf      # terraform {}, required_providers, provider config, backend
 ├── main.tf           # resources and modules
 ├── variables.tf      # input variable declarations
 ├── outputs.tf        # output values
 ├── locals.tf         # local values (optional)
 ├── dev.tfvars        # values for dev
 └── prod.tfvars       # values for prod`,
      },
      {
        title: 'variables.tf',
        language: 'hcl',
        code: `variable "environment" {
  description = "Environment name"
  type        = string
}

variable "sql_admin_password" {
  description = "Admin password for Azure SQL"
  type        = string
  sensitive   = true
}`,
      },
      {
        title: 'outputs.tf',
        language: 'hcl',
        code: `output "resource_group_name" {
  description = "Name of the resource group"
  value       = azurerm_resource_group.rg.name
}

output "aks_cluster_name" {
  value = azurerm_kubernetes_cluster.aks.name
}

output "sql_connection_string" {
  value     = "Server=tcp:\${azurerm_mssql_server.sql.fully_qualified_domain_name},1433;"
  sensitive = true
}`,
      },
      {
        title: 'Read outputs',
        language: 'bash',
        code: `terraform output                          # list all outputs
terraform output -raw aks_cluster_name    # use in a script or pipeline
terraform output -json                    # machine-readable`,
      },
      {
        title: 'Sensitive value in plan output',
        language: 'text',
        code: `  + administrator_login_password = (sensitive value)`,
      },
      {
        title: 'Pass a sensitive value from Key Vault',
        language: 'bash',
        code: `export TF_VAR_sql_admin_password="$(az keyvault secret show \\
  --vault-name kv-shared-dev -n sql-admin-password --query value -o tsv)"
terraform apply -var-file=dev.tfvars`,
      },
    ],
    tags: ['terraform', 'variables', 'outputs', 'sensitive', 'secrets'],
  },
  {
    id: 'itv-rinm-26',
    level: 'basic',
    kind: 'open',
    prompt: 'What is the Terraform Registry?',
    probing:
      'That you know where providers and modules come from, the provider tiers, private registries, and version pinning.',
    answer: [
      'The **Terraform Registry** (registry.terraform.io) is the public place where you find **providers** and **modules**, with their documentation and versions.',
      "- **It hosts**: **Providers**; **Example**: `hashicorp/azurerm`, `hashicorp/azuread`, `azure/azapi`; **Used for**: Talking to platform APIs (Q18)\n- **It hosts**: **Modules**; **Example**: Azure Verified Modules (`Azure/avm-res-...`); **Used for**: Reusable, tested building blocks (VNet, AKS, Key Vault)\n- **It hosts**: **Documentation**; **Example**: Every resource's arguments, attributes, and examples; **Used for**: Daily reference when writing code",
      '**How Terraform uses it:** When you run `terraform init`, Terraform downloads providers and modules from the registry using the **source address**:\n**Provider tiers**\n- **Official:** maintained by HashiCorp (`hashicorp/azurerm`).\n- **Partner:** maintained by the vendor (`azure/azapi`, `microsoft/azuredevops`).\n- **Community:** maintained by individuals; review them carefully before use.',
      '**Private registry:** Companies publish their **own approved modules** (for example, a standard AKS module with security settings built in) to a **private registry** in HCP Terraform / Terraform Enterprise, or reference them from a Git repo:',
      "**Good practices**\n- Always **pin versions** for providers and modules.\n- Read the module's inputs and outputs, and check how recently it was updated.\n- Commit `.terraform.lock.hcl` for provider versions.",
      '**Interview answer:** "The Terraform Registry is the public catalogue of providers and modules, with documentation for every resource. When I run `terraform init`, Terraform downloads the providers like `hashicorp/azurerm` and any registry modules, such as Azure Verified Modules, based on their source address and version. I always pin versions. In companies, we also keep our own standard modules in a private registry or a Git repo with version tags, so every team builds resources the same approved way."',
    ],
    code: [
      {
        title: 'Providers and modules from the registry',
        language: 'hcl',
        code: `terraform {
  required_providers {
    azurerm = {
      source  = "hashicorp/azurerm"    # registry.terraform.io/hashicorp/azurerm
      version = "~> 4.0"
    }
  }
}

module "vnet" {
  source  = "Azure/avm-res-network-virtualnetwork/azurerm"
  version = "x.y.z"   # pin the exact version shown on the registry page

  name                = "vnet-app-dev"
  resource_group_name = azurerm_resource_group.rg.name
  location            = azurerm_resource_group.rg.location
  address_space       = ["10.10.0.0/16"]
}`,
      },
      {
        title: 'Module from a Git repo',
        language: 'hcl',
        code: `module "aks" {
  source = "git::https://dev.azure.com/myorg/infra/_git/tf-modules//aks?ref=v1.4.0"
}`,
      },
    ],
    tags: ['terraform', 'registry', 'modules', 'providers'],
  },
  {
    id: 'itv-rinm-27',
    level: 'advanced',
    kind: 'open',
    prompt: 'Terraform has a state file. How is state managed in Bicep?',
    probing:
      'That Bicep has no state file because Azure Resource Manager is the state, how what-if previews, deployment modes and deployment stacks handle removed resources and drift.',
    answer: [
      '**Bicep has no state file.** Azure itself is the source of truth.',
      'When you deploy a Bicep file, it is converted to an ARM template and sent to **Azure Resource Manager (ARM)**. ARM compares the template with the resources that **currently exist in Azure** and creates or updates whatever is different. Running the same deployment again makes no changes: deployments are **idempotent**.',
      '- **Where state is kept** — **Terraform**: `terraform.tfstate` (remote backend); **Bicep**: No state file; Azure (ARM) is the state\n- **Must store and lock state?** — **Terraform**: Yes (storage account, blob lease); **Bicep**: No\n- **Preview changes** — **Terraform**: `terraform plan`; **Bicep**: `az deployment group what-if`\n- **Deleting removed resources** — **Terraform**: Automatic (resource removed from code → destroyed); **Bicep**: Not by default (incremental mode); use **deployment stacks**\n- **Deployment history** — **Terraform**: Your pipeline logs; **Bicep**: Stored in Azure: resource group → **Deployments**\n- **Clouds** — **Terraform**: Multi-cloud; **Bicep**: Azure only',
      '**What happens to resources you remove from the code?**\n- **Incremental mode (default):** resources not in the template are **left alone**. Removing a resource from Bicep does **not** delete it in Azure.\n- **Complete mode:** deletes resources in the resource group that are not in the template. Risky, use with care.\n- **Deployment stacks (recommended):** Azure tracks the set of resources the deployment manages, which is the closest thing to Terraform state. You choose what happens to removed resources and can block manual changes:',
      '**Drift:** With no state file, there is no "state drift" problem. Each deployment compares against the real Azure resources. Manual changes in the portal are **overwritten** for properties defined in the template the next time the deployment runs, so `what-if` in the pipeline is how you detect them.',
      '**Interview answer:** "Bicep doesn\'t use a state file. It compiles to an ARM template, and Azure Resource Manager compares it with the actual resources in Azure and applies only the differences, so Azure itself is the state. That means there\'s no state storage or locking to manage. I use `what-if` to preview changes, like `terraform plan`. By default, Bicep runs in incremental mode, so resources removed from the code are not deleted. To manage the full lifecycle, including deletion, I use deployment stacks, which track the managed resources and can also deny manual changes."',
    ],
    code: [
      {
        title: 'Preview changes with what-if',
        language: 'bash',
        code: `az deployment group what-if \\
  --resource-group rg-app-dev \\
  --template-file main.bicep \\
  --parameters main.dev.bicepparam`,
      },
      {
        title: 'What-if output',
        language: 'text',
        code: `Resource changes: 1 to create, 1 to modify.
  + Microsoft.Storage/storageAccounts/stappdev001
  ~ Microsoft.Network/virtualNetworks/vnet-app-dev`,
      },
      {
        title: 'Deploy the Bicep file',
        language: 'bash',
        code: `az deployment group create \\
  --resource-group rg-app-dev \\
  --template-file main.bicep \\
  --parameters main.dev.bicepparam`,
      },
      {
        title: 'Deployment stack that deletes unmanaged resources',
        language: 'bash',
        code: `az stack group create \\
  --name stack-app-dev \\
  --resource-group rg-app-dev \\
  --template-file main.bicep \\
  --parameters main.dev.bicepparam \\
  --action-on-unmanage deleteResources \\
  --deny-settings-mode denyDelete`,
      },
    ],
    followUps: [
      'What is the risk of Complete deployment mode compared with deployment stacks?',
      'How would you detect drift for Bicep-managed resources?',
      'When would you choose Terraform over Bicep for an Azure-only team?',
    ],
    tags: ['bicep', 'terraform', 'state', 'arm', 'deployment stacks'],
  },
]
