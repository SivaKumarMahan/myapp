import type { InterviewQuestion } from '../../../types'

/** Terraform and Azure IaC scenarios: credentials, unexpected plans, locking, drift, state secrets, policy-as-code and failed Azure deployments. */
export const myStudyScenariosTerraformQuestions: InterviewQuestion[] = [
  {
    id: 'itv-mystsc-35',
    level: 'intermediate',
    kind: 'scenario',
    prompt:
      'Terraform hardcoded credentials: what is wrong with this provider block, and how should Terraform authenticate instead?',
    promptCode: [
      {
        title: 'The code',
        language: 'hcl',
        code: `provider "azurerm" {
  features {}

  client_id       = "12345678"
  client_secret   = "<hardcoded-client-secret>"
  subscription_id = "abcdef"
  tenant_id       = "xyz"
}`,
      },
    ],
    probing:
      'Whether you know secrets leak into Git and state, and prefer OIDC/workload identity over environment-variable secrets.',
    answer: [
      "**What is wrong**\nHardcoding a service principal's `client_id`/`client_secret` directly in `.tf` files means the credentials end up in source control (and in Terraform state, which is even more sensitive). Anyone with repo access — or access to old commits — has standing production credentials.",
      '**How to authenticate securely instead**',
      '**Option A — Environment variables (simplest, works locally and in CI):**\nIn Azure DevOps, these are supplied via a **Service Connection** (Azure Resource Manager), and the pipeline uses `AzureCLI@2` or the Terraform task, which injects credentials automatically without ever exposing them in the YAML.',
      '**Option B — Workload Identity Federation / OIDC (preferred, no stored secret at all):**\nAzure DevOps issues a short-lived OIDC token that Azure trusts via a federated credential, so there is no long-lived client secret to leak or rotate.',
      '**Option C — Managed Identity** if running from an Azure agent (e.g., a self-hosted agent VM with a system-assigned identity).',
      '**Short interview answer**\n"Hardcoded client secrets in Terraform files are a serious risk since they land in source control and in state. I\'d remove them from the provider block entirely and authenticate through an Azure DevOps service connection using Workload Identity Federation (OIDC) where possible, or environment variables (`ARM_*`) backed by a Key Vault–stored secret otherwise — never committed to the repo."',
    ],
    code: [
      {
        title: 'Option A — Environment variables (simplest, works locally and in CI)',
        language: 'hcl',
        code: `provider "azurerm" {
  features {}
}`,
      },
      {
        title: 'Option A — Environment variables (simplest, works locally and in CI) (2)',
        language: 'bash',
        code: `export ARM_CLIENT_ID="..."
export ARM_CLIENT_SECRET="..."
export ARM_SUBSCRIPTION_ID="..."
export ARM_TENANT_ID="..."`,
      },
    ],
    tags: ['terraform', 'security', 'authentication'],
  },
  {
    id: 'itv-mystsc-36',
    level: 'advanced',
    kind: 'scenario',
    prompt:
      'A PR contains only one change (for example `sku = "Standard"` changed to `sku = "Premium"`), but `terraform plan` shows many (say 15) resources changing. How would you troubleshoot it?',
    promptCode: [
      {
        title: 'The situation',
        language: 'hcl',
        code: `sku = "Standard"`,
      },
      {
        title: 'The situation (2)',
        language: 'hcl',
        code: `sku = "Premium"`,
      },
    ],
    probing:
      'Whether you classify the plan and check drift, state, provider/module versions, dependencies and the target environment before applying.',
    answer: [
      'First, I would not assume Terraform is wrong. I would check whether the additional changes are caused by state drift, provider changes, dependencies, or the Terraform configuration itself.',
      '**Check the PR diff**\nFirst I verify exactly what changed: `git diff main...HEAD`',
      "I want to confirm there isn't an indirect change in a module, variable, `.tfvars` file, or shared configuration.",
      '**Check the Terraform plan**\n`terraform plan`',
      'Then I identify which resources are changing unexpectedly.',
      '**Check for Terraform state drift**\nSomeone may have manually changed the Azure resource outside Terraform.',
      'I would refresh the state and compare: `terraform plan -refresh-only`',
      'If this shows unexpected changes, I know there is likely infrastructure drift.',
      "**Check Terraform state**\nI verify whether Terraform's state matches the actual resources:",
      'I also check whether resources were renamed, moved, imported, or deleted outside Terraform.',
      '**Check provider and module versions**\nA provider upgrade can change how Terraform interprets a resource.',
      '`terraform providers`',
      'I would also check `.terraform.lock.hcl` and recent changes to modules.',
      '**Check dependencies**\nOne small change can legitimately affect multiple resources.',
      'So I check the dependency relationship before assuming the extra changes are unexpected.',
      '**Check variables and environment**\nI verify that the PR pipeline is using the correct:',
      '- `.tfvars`\n- Environment variables\n- Backend\n- Workspace / state\n- Terraform version\n- Provider version',
      'A very common issue is running the plan against the wrong state or environment.',
      '**Check the plan again**\nAfter finding and fixing the root cause: `terraform plan`',
      'I expect the plan to contain only the intended change.',
      '**Strong interview answer**\n"If one PR change produces multiple Terraform changes, I first review the plan and classify the unexpected changes. Then I check the Git diff, state drift using `terraform plan -refresh-only`, Terraform state, provider and module versions, dependencies, and whether the pipeline is using the correct backend and variables. A common reason is infrastructure drift or a provider/module change. I don\'t blindly apply the plan until I understand why every unexpected resource is changing."',
      '**Terraform Plan Shows Unexpected Changes for a One-Line Edit**\n**Possible reasons**',
      "1. **The SKU change forces replacement of a dependent resource**, and other resources reference attributes of that resource (e.g., an ID that changes when it's recreated), cascading the diff outward.\n2. **State drift** — someone changed resources manually in the Azure portal/CLI, so Terraform's state no longer matches real infrastructure, and `plan` is now reconciling many unrelated differences at once, not just the SKU change.\n3. **A module or provider version was upgraded** around the same time, changing default values or attribute names it manages, so `plan` shows changes across all resources built from that module.\n4. **Someone else merged unrelated changes** into the same branch/state that hadn't been applied yet.\n5. **A shared variable or `for_each`/`count` value changed indirectly** (e.g., a computed variable used across many resources), so a \"small\" edit ripples widely.",
      '**Troubleshooting approach**\nCompare the plan\'s "before/after" values resource by resource to see whether the extra changes are genuinely caused by the SKU change (cascading dependency) or are unrelated drift.',
      "**Short interview answer**\n\"A one-line SKU change causing 15 resources to change usually means either that SKU forces a resource replacement whose ID/attributes other resources depend on, or there's state drift from manual changes outside Terraform. I'd run `terraform plan -out` and inspect the JSON output per resource to see exactly what's changing and why, and use `-target` to isolate whether it's a real dependency chain or unrelated drift that needs a `terraform refresh`/import to reconcile.\"",
    ],
    code: [
      {
        title: 'I carefully classify the changes',
        language: 'text',
        code: `+     -> resource creation
-     -> resource destruction
~     -> resource modification
-/+   -> resource replacement`,
      },
      {
        title: 'Check Terraform state',
        language: 'bash',
        code: `terraform state list
terraform state show <resource>`,
      },
      {
        title: 'Check dependencies: For example',
        language: 'text',
        code: `VNet change
   |
Subnet
   |
Private Endpoint
   |
AKS configuration`,
      },
      {
        title: 'Troubleshooting approach',
        language: 'bash',
        code: `terraform plan -out=tfplan
terraform show -json tfplan | jq '.resource_changes[] | {address, change: .change.actions}'
git log -p <file>              # confirm only the intended line changed
terraform state list
terraform plan -target=<resource>   # isolate the change to just the SKU resource`,
      },
    ],
    followUps: [
      'How would you use `terraform show -json` to find out why a resource is being replaced?',
      'What would you do if the extra changes turn out to be drift someone made in the portal?',
    ],
    tags: ['terraform', 'plan', 'drift', 'troubleshooting'],
  },
  {
    id: 'itv-mystsc-37',
    level: 'advanced',
    kind: 'scenario',
    prompt:
      'Pipeline A and Pipeline B both run `terraform apply` against the same Azure infrastructure at the same time. What can go wrong, and how do you prevent it?',
    probing:
      'Whether you know state locking with the azurerm backend and add pipeline-level concurrency control on top.',
    answer: [
      '**What can go wrong**',
      '- **State corruption** — both pipelines try to write to the same state file at once, and whichever writes last can overwrite the other\'s changes, silently losing work.\n- **Conflicting real-world changes** — both plans were calculated against the same "before" state, so both may try to create/modify/delete the same resource, causing Azure API errors or duplicate resources.\n- **Partial applies** — if Pipeline A is mid-apply (some resources changed, others not) when Pipeline B starts planning, B\'s plan is based on an inconsistent, half-updated state.',
      '**How to prevent it**',
      '1. **Use a remote backend with state locking** — Azure Storage backend supports locking via blob leases automatically:',
      'With this, the second `apply` will block/fail with a "state locked" error until the first finishes, instead of running concurrently.',
      "2. **Serialize pipeline runs** — in Azure DevOps, use `resources.pipelines` triggers or a pipeline-level lock (e.g., an exclusive lock resource / environment approval gate) so only one Terraform pipeline can run against a given environment at a time.\n3. **Separate state per environment/component** so unrelated pipelines aren't even touching the same state file.",
      '**Short interview answer**\n"Running two `terraform apply`s against the same state at the same time risks state corruption and conflicting resource changes. The fix is to use a remote backend that supports locking — like the `azurerm` backend on Azure Storage, which uses blob leases — so the second pipeline is blocked until the first finishes, combined with pipeline-level concurrency control so only one deployment can run per environment at a time."',
    ],
    code: [
      {
        title: 'How to prevent it',
        language: 'hcl',
        code: `terraform {
  backend "azurerm" {
    resource_group_name  = "rg-terraform-state"
    storage_account_name = "tfstateacct"
    container_name       = "tfstate"
    key                  = "payment-api.tfstate"
  }
}`,
      },
    ],
    followUps: [
      'What would you do if a crashed pipeline left the state locked?',
      'How would you split state so unrelated pipelines never contend?',
    ],
    tags: ['terraform', 'state locking', 'ci/cd'],
  },
  {
    id: 'itv-mystsc-38',
    level: 'basic',
    kind: 'open',
    prompt: 'What is Terraform drift, and how do you detect and fix it?',
    probing:
      'Whether you can define drift and name the three ways to resolve it: update code, re-apply, or import.',
    answer: [
      'Terraform drift occurs when the actual infrastructure is different from what is stored in the Terraform state file because someone or something changed the infrastructure outside Terraform.',
      '**Example**\nSuppose Terraform creates an Azure VM with:',
      'Later, an administrator logs into the Azure Portal and changes the VM size to `Standard_D2s_v3`.',
      'This difference is called Terraform drift.',
      '**How do you detect drift?**\n`terraform plan` Terraform compares:',
      '- Configuration (`.tf` files)\n- State file\n- Actual cloud infrastructure',
      'If differences exist, Terraform shows them in the plan.',
      '**How do you fix drift?**\nThere are three options:',
      '1. **Accept the manual change** - update the Terraform code to match the actual infrastructure.\n2. **Revert the manual change** - run `terraform apply`. Terraform changes the infrastructure back to the desired state.\n3. **Import unmanaged resources** - if a resource was created manually, run `terraform import` to add it to Terraform state.',
      '**Best practices to avoid drift**',
      '- Never make manual changes in production.\n- Use Terraform as the single source of truth.\n- Store the state remotely.\n- Review `terraform plan` before every deployment.',
      '**Interview summary (30-second answer)**\n"Terraform drift occurs when the actual infrastructure differs from Terraform\'s state because of manual or external changes. We usually detect it using `terraform plan` and either update the code or run `terraform apply` to bring the infrastructure back to the desired state.',
    ],
    code: [
      {
        title: 'Suppose Terraform creates an Azure VM with',
        language: 'text',
        code: `VM Size: Standard_B2s
Public IP: Enabled`,
      },
      {
        title: 'Example: Now',
        language: 'text',
        code: `Terraform state  -> Standard_B2s
Actual Azure resource -> Standard_D2s_v3`,
      },
    ],
    tags: ['terraform', 'drift'],
  },
  {
    id: 'itv-mystsc-39',
    level: 'intermediate',
    kind: 'scenario',
    prompt:
      'What is a "Terraform anomaly", and how would you investigate one such as a partial deployment?',
    probing:
      'Whether you admit it is not an official term and can still reason about state corruption, partial applies and provider errors.',
    answer: [
      'Terraform does not have an official concept called "Terraform anomaly."',
      'In interviews, "anomaly" usually means unexpected or abnormal behaviour during Terraform execution. Examples include:',
      '**State file corruption** - the state file becomes inconsistent or damaged.',
      '**Partial deployment** - Terraform creates some resources but fails before completing all resources.',
      '**State drift** - infrastructure changes outside Terraform.',
      '**Dependency issues** - Terraform tries to create resources in the wrong order because dependencies are missing.',
      '**Provider / API issues** - cloud provider returns errors such as rate limiting, timeout, authentication failure or network interruption.',
      '**Real-world example**\nNow the deployment is incomplete. This is an anomalous situation because the infrastructure is only partially provisioned.',
      '**Interview summary (30-second answer)**\nTerraform anomaly is not an official Terraform term. It generally refers to unexpected situations such as state corruption, partial deployments, provider failures, dependency issues, or infrastructure inconsistencies that require investigation and correction."',
    ],
    code: [
      {
        title: 'Partial deployment',
        language: 'text',
        code: `VM created
NSG created
Load Balancer creation failed`,
      },
      {
        title: 'Suppose Terraform creates',
        language: 'text',
        code: `Resource Group  ok
ACR             ok
Key Vault       ok
AKS             failed (Quota exceeded)`,
      },
      {
        title: 'You would investigate using',
        language: 'bash',
        code: `terraform plan
terraform state list
terraform state show <resource>
terraform refresh   # older versions
terraform apply`,
      },
    ],
    tags: ['terraform', 'troubleshooting', 'state'],
  },
  {
    id: 'itv-mystsc-40',
    level: 'intermediate',
    kind: 'open',
    prompt: 'How do you prevent accidental deletion of critical resources in Terraform?',
    probing:
      'Whether you layer `prevent_destroy`, plan review, RBAC and approval gates rather than relying on one control.',
    answer: [
      'Four layers, used together rather than any single one alone:',
      '1. **`lifecycle.prevent_destroy`** on genuinely critical resources - blocks `terraform destroy` and any replacement that would destroy the resource.',
      '2. **Always review `terraform plan` before apply** - a plan showing `-` (destroy) or `-/+` (destroy and recreate) against a critical resource should stop the pipeline for human review, not sail through on `-auto-approve`.\n3. **RBAC** - restrict who/what can run `terraform apply` against production state to begin with; most accidental deletions come from someone running the wrong command against the wrong workspace, not from a code review that let anything sneaky through.\n4. **CI/CD approvals** - require an explicit approval gate before `apply` runs in a production environment, so the plan output is a real checkpoint, not a formality.',
      "Avoid unnecessary destructive changes in the first place - renaming a resource block without a `moved` block, or changing an immutable attribute, can trigger a destroy/recreate you didn't intend.",
      "**Short interview answer**\nI use `lifecycle.prevent_destroy` on resources that must never be destroyed by Terraform, review every `plan` before `apply` - especially anything showing `-` or `-/+` - and back that with RBAC restricting who can apply against production, plus a CI/CD approval gate so a human sees the plan before it's applied.",
    ],
    code: [
      {
        title: 'prevent_destroy',
        language: 'hcl',
        code: `resource "azurerm_key_vault" "kv" {
  name = "prod-kv"

  lifecycle {
    prevent_destroy = true
  }
}`,
      },
    ],
    tags: ['terraform', 'lifecycle', 'governance'],
  },
  {
    id: 'itv-mystsc-41',
    level: 'advanced',
    kind: 'scenario',
    prompt:
      'How do you migrate Terraform-managed infrastructure (and its state) across clouds, for example AWS to Azure?',
    probing:
      'Whether you know state cannot be reused across providers and plan a build-validate-cutover-decommission migration instead.',
    answer: [
      'When migrating infrastructure across providers - for example AWS to Azure - don\'t try to reuse the old state. The resources and providers are fundamentally different; there\'s nothing to "migrate" at the resource level, only at the process level.',
      '1. **Back up the old state** before touching anything:',
      '2. **Create/import the target resources** on the new cloud. New resources get created normally through `terraform apply`; resources that already exist for some other reason get brought under management with `terraform import`:',
      '3. **Validate with `terraform plan`** against the new state until it shows no unexpected changes.\n4. **Migrate application traffic** to the new infrastructure - DNS cutover, connection string changes, whatever the application needs - only once the new infrastructure is confirmed healthy.\n5. **Decommission the old infrastructure** last, after traffic has been running successfully on the new cloud for a safe period.',
      "**Narrower case:** if only the backend is changing (e.g. moving state storage from one Azure Storage account to another, still within Terraform/Azure) rather than the cloud provider itself, that's much simpler: `terraform init -migrate-state`",
      'This copies existing state into the new backend configuration - no resource recreation involved.',
      "**Short interview answer**\nI don't try to reuse state across providers - the resource types are different, so there's nothing to carry over directly. I back up the old state with `terraform state pull`, stand up the new infrastructure (importing anything that needs to be brought under management), validate with `plan` until it's clean, cut traffic over once the new side is verified healthy, and only then decommission the old infrastructure. If it's just a backend change within the same provider, `terraform init -migrate-state` handles that without any of this.",
    ],
    code: [
      {
        title: 'State migration',
        language: 'bash',
        code: `terraform state pull > terraform.tfstate.backup`,
      },
      {
        title: 'State migration (2)',
        language: 'bash',
        code: `terraform import azurerm_resource_group.rg /subscriptions/<sub-id>/resourceGroups/prod-rg`,
      },
    ],
    followUps: [
      'How would you minimise downtime during the traffic cutover?',
      'What is the difference between `terraform init -migrate-state` and `-reconfigure`?',
    ],
    tags: ['terraform', 'state', 'migration'],
  },
  {
    id: 'itv-mystsc-42',
    level: 'advanced',
    kind: 'scenario',
    prompt: 'How do you debug remote backend locking issues in Terraform?',
    probing:
      'Whether you confirm a lock is truly stale before `force-unlock` and investigate why it went stale.',
    answer: [
      '1. **Check whether another `plan`/`apply` is actually running** - the most common cause of a "stuck" lock is simply that another operation legitimately holds it.\n2. **Read the lock details** - Terraform\'s lock error includes the lock ID, who holds it, and when it was created.\n3. **Inspect the backend directly**, which differs by backend: **Azure Storage** - check active pipelines/users, and look for a stale blob lease on the state blob; **S3 + DynamoDB** - inspect the DynamoDB lock table for a stale entry; **Terraform Cloud** - inspect workspace runs to see if one is genuinely in progress or stuck.\n4. **Only once the lock is confirmed stale** (the process that created it is verifiably gone - a crashed CI agent, a killed pipeline, a network partition that never released the lock):',
      '`terraform force-unlock <LOCK_ID>`',
      '5. **Validate afterward:**',
      '`terraform plan` **Prevent recurrence** by avoiding concurrent applies in the first place (serialize CI/CD deployments per environment/state file), and investigate why the lock went stale - an interrupted agent, a network failure, or an operation that genuinely hung - rather than just force-unlocking and moving on.',
      "**Short interview answer**\nFirst I confirm no other plan/apply is genuinely running, then inspect the backend-specific lock details - a stale blob lease for Azure Storage, the DynamoDB lock table for S3, or workspace runs for Terraform Cloud. Only once I've confirmed the lock is stale do I run `terraform force-unlock`, then validate with `plan`. To prevent recurrence, I serialize CI/CD deployments per environment and investigate why the lock went stale in the first place - usually an interrupted agent or network failure.",
    ],
    followUps: [
      'What can go wrong if you force-unlock while another apply is still running?',
      'How do you find the stale blob lease on an Azure Storage backend?',
    ],
    tags: ['terraform', 'state locking', 'troubleshooting'],
  },
  {
    id: 'itv-mystsc-43',
    level: 'intermediate',
    kind: 'open',
    prompt: 'How do you prevent drift from manually modified resources?',
    probing:
      'Whether you put prevention (RBAC, Policy, CI/CD-only changes) before detection, and use `ignore_changes` narrowly.',
    answer: [
      "- **Restrict manual changes with RBAC** - the strongest prevention is simply not letting people have portal/CLI write access to resources Terraform manages.\n- **Run `terraform plan` regularly** (e.g. on a schedule, not just on code changes) to detect drift that RBAC didn't prevent.\n- **Use remote state**, so drift detection is checking against a shared, authoritative source rather than a stale local file.\n- **Import manually created resources** that should be Terraform-managed, rather than leaving them unmanaged forever:",
      '- **Use `lifecycle.ignore_changes` only for expected system-managed changes** - for example an autoscaler adjusting replica counts, or a platform auto-assigning a value Terraform shouldn\'t fight over. Using it broadly just hides real drift instead of preventing it.\n- **Enforce code review and CI/CD** as the only path to production changes, so "manual" changes become the exception requiring explicit justification, not the norm.\n- **Use Azure Policy and governance** as a backstop - even with RBAC in place, policy can block out-of-band changes that violate organizational rules regardless of who made them.',
      '**Short interview answer**\nPrevention comes first: RBAC that restricts who can make manual changes at all, backed by Azure Policy as a governance backstop. Detection comes second: regular `terraform plan` runs against remote state, not just plans triggered by code changes. When drift is found, I either import the resource into management or, for genuinely expected system-managed changes, scope `ignore_changes` narrowly rather than broadly.',
    ],
    code: [
      {
        title: 'Drift prevention',
        language: 'bash',
        code: `terraform import azurerm_storage_account.sa /subscriptions/<sub-id>/resourceGroups/rg/providers/Microsoft.Storage/storageAccounts/mystorage`,
      },
    ],
    tags: ['terraform', 'drift', 'governance'],
  },
  {
    id: 'itv-mystsc-44',
    level: 'advanced',
    kind: 'open',
    prompt: 'How do you protect secrets that end up in Terraform state?',
    probing:
      'Whether you know `sensitive = true` only hides output and state protection comes from the backend storage itself.',
    answer: [
      "- Store production state **remotely** (e.g. Azure Storage), never locally.\n- Use **encryption at rest** on the state storage.\n- Restrict access with **RBAC**, and **private endpoints/firewalls** so the storage account isn't reachable from the open internet.\n- Enable **versioning** on the state storage, so a bad or corrupted state write can be recovered.\n- Optionally use **customer-managed keys** through Azure Key Vault for an extra layer of control over the encryption key itself.\n- **Do not hardcode secrets** in Terraform configuration - retrieve them from Azure Key Vault instead.\n- **Mark sensitive variables** so their values are hidden in CLI output:",
      "**The trap:** `sensitive = true` only hides the value from CLI/plan output. It does **not** encrypt the value inside the state file itself - the plaintext value still ends up in `terraform.tfstate` (or the remote state file) whenever that resource's attributes are recorded. State-file protection has to come from encrypting and restricting access to the state storage itself, not from the `sensitive` flag.",
      "**Short interview answer**\nI keep production state remote with encryption at rest, RBAC, and private network access, and I enable versioning so a bad state write is recoverable. Secrets themselves come from Azure Key Vault rather than being hardcoded, and I mark sensitive variables - but I'm careful to explain that `sensitive = true` only hides the value in CLI output; it does not encrypt it inside the state file, so protecting the state storage itself is what actually matters.",
    ],
    code: [
      {
        title: 'Sensitive variables',
        language: 'hcl',
        code: `variable "db_password" {
  type      = string
  sensitive = true
}`,
      },
    ],
    followUps: [
      'Which resources typically write secrets into state?',
      'How would you audit who has read access to the state storage account?',
    ],
    tags: ['terraform', 'state', 'secrets'],
  },
  {
    id: 'itv-mystsc-45',
    level: 'advanced',
    kind: 'open',
    prompt: 'How do you implement policy-as-code for Terraform and Kubernetes?',
    probing:
      'Whether you know the scanning tools for Terraform and the admission-control engines for Kubernetes, and what policies to enforce.',
    answer: [
      '**Terraform pipeline:**\nTerraform-side policies can enforce things like: approved regions only, mandatory tags, encryption required, no public storage access, and restricted network rules - checked automatically before anything reaches `apply`.',
      '**Kubernetes policy tools:**',
      '- **OPA Gatekeeper**\n- **Kyverno**\n- **Azure Policy for AKS**',
      'Kubernetes-side policies can enforce: non-root containers, only approved registries, required resource requests/limits, required labels, no privileged containers, and restricted `hostPath` volume use.',
      'The two ecosystems are structurally similar - a policy engine evaluates a desired configuration (a Terraform plan, or a Kubernetes admission request) against rules and blocks anything that violates them, before the change ever takes effect.',
      '**Short interview answer**\nFor Terraform, I run `tfsec`/`Checkov`/`Trivy` plus `TFLint` in the pipeline before `plan`, enforcing things like approved regions, mandatory tags, encryption, and no public storage exposure. For Kubernetes, I use an admission-control policy engine - OPA Gatekeeper, Kyverno, or Azure Policy for AKS - to enforce non-root containers, approved registries, required resource limits, and no privileged containers at the point resources are created, not after the fact.',
    ],
    code: [
      {
        title: 'Terraform pipeline',
        language: 'text',
        code: `terraform fmt
terraform validate
TFLint
tfsec / Checkov / Trivy
terraform plan
approval
terraform apply`,
      },
    ],
    followUps: [
      'What is the difference between OPA Gatekeeper and Kyverno?',
      'How would you roll out a new policy without breaking existing workloads?',
    ],
    tags: ['policy as code', 'terraform', 'kubernetes'],
  },
  {
    id: 'itv-mystsc-46',
    level: 'intermediate',
    kind: 'open',
    prompt: 'How do you pass dependencies between Terraform modules?',
    probing:
      'Whether you use outputs and input variables to keep modules loosely coupled and dependencies explicit.',
    answer: [
      'Enterprise Terraform projects split infrastructure into modules (network, AKS, Key Vault, SQL, storage). Those modules usually depend on each other - AKS needs the subnet ID from the network module, for example. The pattern is to expose what a downstream module needs as an **output**, and pass it in as an **input variable** to the module that needs it, rather than hardcoding values or duplicating resource lookups.',
      "This keeps modules independently reusable - the AKS module doesn't need to know how the subnet was created, only that it receives a valid subnet ID - and it makes the dependency graph explicit in code rather than implicit through naming conventions or manual lookups.",
      '**Short interview answer**\nEach module exposes what other modules need through `outputs.tf`, and the consuming module takes it as an input variable - `subnet_id = module.network.subnet_id`, for example. That keeps modules loosely coupled and reusable, and makes cross-module dependencies explicit in code instead of relying on naming conventions or manual data lookups.',
    ],
    code: [
      {
        title: 'Module outputs',
        language: 'hcl',
        code: `# modules/network/outputs.tf
output "subnet_id" {
  value = azurerm_subnet.aks.id
}`,
      },
      {
        title: 'Module outputs (2)',
        language: 'hcl',
        code: `# envs/prod/main.tf
module "network" {
  source = "../../modules/network"
  # ...
}

module "aks" {
  source    = "../../modules/aks"
  subnet_id = module.network.subnet_id
}`,
      },
    ],
    tags: ['terraform', 'modules', 'outputs'],
  },
  {
    id: 'itv-mystsc-47',
    level: 'advanced',
    kind: 'open',
    prompt: 'How do you optimise Terraform state locking performance?',
    probing:
      'Whether you reduce lock contention by splitting state and serialising runs, instead of disabling locking.',
    answer: [
      'The goal is reducing **lock contention**, not disabling locking - locking is what prevents two concurrent applies from corrupting state.',
      "- **Split large state files by logical component** - Network, AKS, Database, Storage, Monitoring - so an apply to one component doesn't hold a lock that blocks an unrelated apply to another.\n- **Separate state per environment** - dev/test/prod each get their own state and lock, so environments never contend with each other.\n- **Keep applies small** - the longer an apply runs, the longer it holds the lock; smaller, more targeted applies reduce that window.\n- **Serialize CI/CD deployments per environment** - even with split state, two pipeline runs targeting the same state/environment should queue rather than race.\n- **Use remote backends with locking** in the first place (Azure Storage with blob leases, S3+DynamoDB, Terraform Cloud) rather than a backend without native locking support.\n- **Investigate long-running operations and stale locks** rather than routinely force-unlocking - a pattern of frequent stale locks usually points to a pipeline that's timing out or crashing mid-apply, which is the actual problem to fix.",
      "**Short interview answer**\nI reduce lock contention rather than touch locking itself - splitting state by component and by environment so unrelated applies don't block each other, keeping individual applies small, and serializing CI/CD runs against the same state so they queue instead of race. If stale locks keep showing up, that's a signal to investigate why applies are dying mid-run, not a reason to routinely force-unlock.",
    ],
    followUps: [
      'How would you decide where to split a large state file?',
      'How do you share outputs between split states safely?',
    ],
    tags: ['terraform', 'state locking', 'performance'],
  },
  {
    id: 'itv-mystsc-48',
    level: 'advanced',
    kind: 'open',
    prompt: 'How do you prevent Terraform from accidentally replacing resources?',
    probing:
      'Whether you read `-/+` in the plan, know immutable attributes, and prefer `for_each` over `count` for stable identity.',
    answer: [
      "- **Always review `terraform plan`.** A plan showing `-/+` means destroy-and-recreate, not an in-place update - that's the single most important thing to catch before `apply`.\n- **Use `lifecycle.prevent_destroy`** for resources that must never be destroyed:",
      "- **Avoid unnecessary changes to immutable properties** - some resource attributes force replacement when changed (e.g. certain Azure resource name/region/SKU-family fields); changing them without realizing they're immutable is a common accidental-replacement cause.\n- **Use `ignore_changes` only where appropriate** - see the drift-prevention question for the same caution against overusing it.\n- **Import existing resources** rather than letting Terraform \"adopt\" them by recreating them under a new identity.\n- **Prefer `for_each` over `count`** when the resources have a stable identity that matters. With `count`, removing an item from the middle of a list shifts every subsequent resource's index - and Terraform destroys/recreates everything after that index to realign. `for_each` keys resources by a stable value (like a name), so removing one item only affects that one resource.\n- **Version modules**, so a module update doesn't silently change resource configuration for every consumer at once.\n- **Require production plan review and approval** before `apply` runs against production state.",
      '**Short interview answer**\nThe plan is the safety net - `-/+` always means destroy-and-recreate, and I review every plan against production for that specifically. `lifecycle.prevent_destroy` backs that up for resources that must never go away. For collections of similar resources, I use `for_each` over `count` specifically because `count` reindexes and can trigger cascading replacement when an item is removed from the middle of the list, while `for_each` only touches the one resource whose key actually changed.',
    ],
    code: [
      {
        title: 'prevent_destroy',
        language: 'hcl',
        code: `resource "azurerm_key_vault" "kv" {
  name = "prod-kv"

  lifecycle {
    prevent_destroy = true
  }
}`,
      },
    ],
    followUps: [
      'How does a `moved` block help when you rename a resource?',
      'What is `create_before_destroy`, and when can it fail?',
    ],
    tags: ['terraform', 'lifecycle', 'for_each'],
  },
  {
    id: 'itv-mystsc-49',
    level: 'advanced',
    kind: 'scenario',
    prompt:
      'An Azure resource deployment (ARM, Bicep or Terraform) has failed. How do you troubleshoot it?',
    probing:
      'Whether you follow a structured path - error and operations, code validation, RBAC/Policy/locks, Azure constraints, Activity Log - instead of guessing.',
    answer: [
      'Use a structured process to find the resource and reason that caused the failure.',
      '**Check the deployment error**\nReview the failed deployment in the Azure portal or with the Azure CLI:',
      'Look for the error code, detailed message, and failed resource.',
      '**Inspect deployment operations**\nThe operation history helps identify the exact step that failed.',
      '**Validate the deployment code**\nFor ARM templates, Bicep, or Terraform, check for:',
      '- Syntax and type errors\n- Missing or incorrect parameters\n- Invalid resource references\n- Incorrect dependency order\n- Unsupported or outdated API versions',
      'Validate the deployment before applying it when the tool supports validation or a preview operation.',
      '**Check access and governance**\nConfirm that the user, service principal, or managed identity has the required RBAC role at the correct scope. Also check whether an Azure Policy or resource lock is blocking the operation.',
      'Use least privilege: assign only the permissions required by the deployment instead of automatically granting `Owner`.',
      '**Check Azure constraints**\nCommon causes include:',
      '- A globally unique resource name is already in use.\n- The selected SKU is unavailable in the region.\n- A subscription or regional quota has been reached.\n- The resource type is not registered for the subscription.\n- Network, subnet, DNS, or private endpoint settings are invalid.\n- A dependent resource does not exist or is in another scope.',
      '**Review the Activity Log**\nThe Azure Activity Log can show authorization failures, policy denials, and control-plane errors. If a deployment runs in a CI/CD pipeline, inspect the pipeline logs as well.',
      '**Fix, redeploy, and verify**\nCorrect the template, parameters, access, or Azure configuration. Run validation or a preview, redeploy, and then confirm that every expected resource is healthy.',
      '**Short interview answer**\nStart with the deployment error and operation history to identify the failed resource. Then validate the infrastructure code and parameters, verify RBAC and Azure Policy, and check names, regions, SKUs, quotas, API versions, dependencies, and networking. Review the Activity Log for more detail, fix the root cause, redeploy, and verify the result.',
      '**Worked example: AuthorizationFailed**\nAn ACR deployment fails with `AuthorizationFailed` because the deploying service principal only has the `Reader` role on the resource group. The "Check access and governance" step above catches this immediately: `az deployment operation group list` shows the exact operation that was denied, and the fix is to assign the role the deployment actually needs (e.g. `Contributor` scoped to that resource group, or a narrower custom role) rather than reaching for `Owner`. Reassign the role and rerun the pipeline.',
    ],
    code: [
      {
        title: 'Check the deployment error',
        language: 'bash',
        code: `az deployment group show \\
  --resource-group <resource-group> \\
  --name <deployment-name>`,
      },
      {
        title: 'Inspect deployment operations',
        language: 'bash',
        code: `az deployment operation group list \\
  --resource-group <resource-group> \\
  --name <deployment-name>`,
      },
    ],
    followUps: [
      'How would you use `az deployment group what-if` before redeploying?',
      'Why should you avoid granting Owner just to get a pipeline deployment working?',
    ],
    tags: ['azure', 'deployment', 'troubleshooting', 'rbac'],
  },
]
