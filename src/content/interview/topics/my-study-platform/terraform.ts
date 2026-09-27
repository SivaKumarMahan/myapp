import type { InterviewQuestion } from '../../../types'

/** Terraform fundamentals: workspaces, project layout, TFLint, toset/for_each, OpenTofu, locking and CI/CD integrations. */
export const myStudyPlatformTerraformQuestions: InterviewQuestion[] = [
  {
    id: 'itv-mystpl-45',
    level: 'intermediate',
    kind: 'open',
    prompt: 'How do you manage multiple Terraform workspaces across environments?',
    probing:
      'Whether you prefer separate directories and state for real environments and know where workspaces still fit.',
    answer: [
      'In most production environments, I prefer separate state files and separate directories for each environment rather than relying only on Terraform workspaces.',
      'Each environment has:',
      '- Its own remote backend (separate state file)\n- Its own `terraform.tfvars`\n- Its own pipeline\n- Separate access permissions',
      'This reduces the risk of accidentally applying changes to the wrong environment.',
      'I use Terraform workspaces only when the infrastructure is almost identical and the only difference is configuration values, such as creating temporary environments or feature branches.',
      'When using workspaces, I create and switch them like this:',
      'I can also reference the current workspace inside the code:',
      '**Best practices I follow**',
      '- Keep a separate remote state for each environment.\n- Use modules so infrastructure code is reusable.\n- Store environment-specific values in `.tfvars` files.\n- Protect production with approval gates in the CI/CD pipeline.\n- Lock the state using the Azure Storage backend to prevent concurrent updates.\n- Use the same Terraform version and provider versions across environments.',
      '**Short interview conclusion**\n"For production environments, I prefer separate directories and separate remote state files for dev, test, and prod because it\'s safer and provides better isolation. I use Terraform workspaces only for nearly identical environments or temporary deployments where only configuration values change."',
    ],
    code: [
      {
        title: 'Workspaces: For example',
        language: 'text',
        code: `terraform/
├── envs/
│   ├── dev/
│   ├── test/
│   └── prod/
└── modules/
    ├── network/
    ├── aks/
    └── sql/`,
      },
      {
        title: 'When using workspaces, I create and switch them like this',
        language: 'bash',
        code: `terraform workspace new dev
terraform workspace new test
terraform workspace new prod

terraform workspace select dev
terraform plan
terraform apply`,
      },
      {
        title: 'I can also reference the current workspace inside the code',
        language: 'hcl',
        code: `resource "azurerm_resource_group" "rg" {
  name = "rg-\${terraform.workspace}"
}`,
      },
    ],
    tags: ['terraform', 'workspaces', 'environments'],
  },
  {
    id: 'itv-mystpl-46',
    level: 'advanced',
    kind: 'open',
    prompt: 'How do you organise a Terraform project for multiple environments?',
    probing:
      'Whether you combine versioned modules, per-environment state, layered state and a PR-driven pipeline.',
    answer: [
      '**Modules**\nA module is a reusable collection of Terraform resources. Instead of writing the same code multiple times, we create modules and reuse them.\n**Benefits**',
      '- Reusable code\n- Easier maintenance\n- Consistent deployments\n- Smaller and cleaner root configuration',
      'In production, modules are usually versioned using Git tags or a Terraform Registry, so teams can safely upgrade versions.',
      '**Environments**\nDifferent environments should have separate state files.',
      'Each environment has its own backend, its own state and its own variables. This prevents accidental changes across environments.',
      '**Why not use Workspaces?**\nTerraform Workspaces let you manage multiple environments from the same configuration.',
      'The active workspace is selected with: `terraform workspace select prod`',
      'Although convenient, many teams avoid workspaces for production because:',
      "- It's easy to select the wrong workspace.\n- All workspaces share the same backend configuration.\n- Environment differences become hidden in code using `terraform.workspace`.\n- Access control and permissions are harder to separate.",
      'For production, separate directories and separate state files are usually safer and easier to manage.',
      '**Layer the state**\nInstead of storing everything in one state file, split infrastructure into layers.\n**Benefits:**',
      '- Smaller blast radius if something goes wrong.\n- Faster Terraform operations.\n- Teams can work independently.\n- Reduced merge conflicts.',
      '**Remote state**\nEach environment should have its own remote backend.',
      'In Azure, these state files are typically stored in an Azure Storage Account with blob leases providing state locking.',
      "**CI/CD pipeline**\nAvoid running `terraform apply` directly from a developer's laptop.",
      'This ensures code is reviewed, plans are visible before deployment, and changes are applied consistently.',
      '**Additional best practices**',
      '- Use remote state with state locking.\n- Keep root modules thin; put most logic into reusable modules.\n- Pin provider and module versions to avoid unexpected upgrades.\n- Run `terraform fmt`, `terraform validate`, and `tflint` in CI.\n- Split infrastructure into multiple state files for better isolation.\n- Use pull requests with `terraform plan`, and only run `terraform apply` after approval and merge.',
      '**Interview answer (1-2 minutes)**\n"I organize Terraform using reusable modules for components like networking, AKS, ACR, and monitoring. The root configuration simply composes these modules and passes environment-specific variables. For environments such as development, staging, and production, I prefer separate directories with their own backend configuration, state file, and terraform.tfvars rather than relying on workspaces. This provides better isolation, clearer permissions, and reduces the risk of deploying to the wrong environment. I also split infrastructure into multiple state files, such as networking, AKS, and applications, to reduce the impact of changes and allow teams to work independently. Finally, all Terraform changes go through a CI/CD pipeline that runs terraform fmt, terraform validate, tflint, and terraform plan during pull requests, with terraform apply executed only after review and approval."',
    ],
    code: [
      {
        title: 'Modules',
        language: 'text',
        code: `modules/
├── network/
├── aks/
├── acr/
├── keyvault/
└── monitoring/`,
      },
      {
        title: 'Each module has',
        language: 'text',
        code: `main.tf
variables.tf
outputs.tf`,
      },
      {
        title: 'Example root configuration',
        language: 'hcl',
        code: `module "network" {
  source = "./modules/network"

  vnet_name = "prod-vnet"
}`,
      },
      {
        title: 'Environments',
        language: 'text',
        code: `terraform/

modules/

envs/
├── dev/
│   ├── main.tf
│   ├── backend.tf
│   └── terraform.tfvars
│
├── staging/
│   ├── main.tf
│   ├── backend.tf
│   └── terraform.tfvars
│
└── prod/
    ├── main.tf
    ├── backend.tf
    └── terraform.tfvars`,
      },
      {
        title: 'Why not use Workspaces?',
        language: 'bash',
        code: `terraform workspace new dev
terraform workspace new prod`,
      },
      {
        title: 'Layer the state',
        language: 'text',
        code: `State 1
Network
- Resource Group
- VNet
- Subnets

State 2
AKS
- Cluster
- Node Pools

State 3
Applications
- Helm Releases
- Kubernetes Resources

State 4
Monitoring
- Log Analytics
- Alerts`,
      },
      {
        title: 'Remote state',
        language: 'text',
        code: `Development
dev.tfstate

Staging
staging.tfstate

Production
prod.tfstate`,
      },
      {
        title: 'Typical workflow',
        language: 'text',
        code: `Developer
      |
      v
Git Feature Branch
      |
      v
Pull Request
      |
      v
Pipeline
   |
   +-- terraform fmt
   +-- terraform validate
   +-- tflint
   +-- terraform plan
      |
Code Review
      |
Merge
      |
      v
Pipeline
      |
terraform apply`,
      },
    ],
    followUps: [
      'How do you version and release shared modules?',
      "How would layered states read each other's outputs?",
    ],
    tags: ['terraform', 'modules', 'state', 'ci/cd'],
  },
  {
    id: 'itv-mystpl-47',
    level: 'basic',
    kind: 'open',
    prompt: 'What is TFLint, and how is it different from `terraform validate`?',
    probing: 'Whether you know what linting adds beyond validate and where it runs in CI.',
    answer: [
      '**What is TFLint?**\nTFLint is a static analysis and linting tool for Terraform. It analyzes Terraform code before deployment and identifies issues such as configuration mistakes, best practice violations, deprecated syntax, and cloud provider-specific problems.',
      'It helps catch errors early, before you run `terraform apply`.',
      '**Why do we use TFLint?**\nTerraform itself checks syntax with: `terraform validate`',
      'But `terraform validate` does not detect many best practice issues.',
      'TFLint provides additional checks, such as:',
      '- Unused variables\n- Unused data sources\n- Invalid instance types (AWS) or SKUs (Azure)\n- Deprecated arguments\n- Naming convention issues\n- Missing required tags (with custom rules)',
      '**Example**\n`terraform validate` may pass because the syntax is correct.',
      'When you run: `tflint`',
      'TFLint can detect that `Standard_XYZ` is not a valid Azure VM size (with the Azure plugin enabled).',
      '**Installation**\n`brew install tflint      # macOS` or',
      '`choco install tflint     # Windows`',
      '**Common commands**\nInitialize plugins: `tflint --init`',
      'Run lint checks: `tflint`',
      'Lint a specific directory: `tflint ./terraform`',
      '**CI/CD pipeline integration**\nIf TFLint finds issues, the pipeline fails, preventing low-quality Terraform code from being deployed.',
      '**terraform validate vs TFLint**',
      '- **Syntax validation**: terraform validate: Yes; TFLint: No\n- **Checks resource configuration**: terraform validate: Basic; TFLint: Advanced\n- **Finds best practice issues**: terraform validate: No; TFLint: Yes\n- **Provider-specific validation**: terraform validate: Limited; TFLint: Yes\n- **CI/CD integration**: terraform validate: Yes; TFLint: Yes',
      '**Interview answer (30 seconds)**\n"TFLint is a linting tool for Terraform that performs static analysis on Terraform code. While `terraform validate` checks syntax and configuration validity, TFLint goes further by identifying best practice violations, deprecated arguments, unused variables, and provider-specific configuration issues. We typically run TFLint in our CI/CD pipeline before `terraform plan` so that configuration problems are caught early and only high-quality Infrastructure as Code is deployed."',
    ],
    code: [
      {
        title: 'Suppose you write',
        language: 'hcl',
        code: `resource "azurerm_linux_virtual_machine" "vm" {
  size = "Standard_XYZ"
}`,
      },
      {
        title: 'A typical pipeline includes',
        language: 'text',
        code: `Git Push
    |
    v
terraform fmt -check
    |
terraform validate
    |
tflint
    |
terraform plan
    |
Approval
    |
terraform apply`,
      },
    ],
    tags: ['terraform', 'tflint', 'ci/cd'],
  },
  {
    id: 'itv-mystpl-48',
    level: 'basic',
    kind: 'open',
    prompt:
      'Why does Terraform use `toset()`, and what is the difference between a list and a set?',
    probing: 'Whether you know sets remove duplicates and give stable `for_each` keys.',
    answer: [
      '`toset()` converts a collection into a set. A set contains unique values and does not preserve a meaningful order.',
      'The resulting set contains `web`, `app`, and `db` only once.',
      '**Using a set with `for_each`**\nTerraform creates one resource instance for each unique string. The string is also used as the stable resource key. Choose values that will remain stable because renaming a key can make Terraform plan a destroy and create unless the state address is moved.',
      '**List compared with set**',
      '- **List**: Ordered; **Set**: Unordered\n- **List**: Allows duplicates; **Set**: Contains unique values\n- **List**: Supports index access; **Set**: Does not support index access\n- **List**: Use when position or order matters; **Set**: Use when unique membership matters',
    ],
    code: [
      {
        title: 'toset',
        language: 'hcl',
        code: `locals {
  unique_servers = toset(["web", "app", "web", "db"])
}`,
      },
      {
        title: 'Using a set with for_each',
        language: 'hcl',
        code: `resource "azurerm_resource_group" "example" {
  for_each = toset(["development", "test", "production"])

  name     = "rg-\${each.value}"
  location = "Central India"
}`,
      },
    ],
    tags: ['terraform', 'for_each', 'toset'],
  },
  {
    id: 'itv-mystpl-49',
    level: 'basic',
    kind: 'open',
    prompt: 'What are `each.key` and `each.value` in Terraform?',
    probing: 'Whether you can explain `for_each` iteration over maps and sets.',
    answer: [
      'Inside a resource or module that uses `for_each`:',
      '- `each.key` is the current instance key.\n- `each.value` is the value associated with that key.',
      '**Map example**\nFor the `web` instance, `each.key` is `web` and `each.value` is `Standard_B2s`.',
      'When `for_each` uses a set of strings, `each.key` and `each.value` are the same string.',
      "**Short interview answer**\n`each.value` gives the value of the current item in a `for_each` loop. It is especially useful with maps, where `each.key` identifies the resource instance and `each.value` contains that instance's configuration.",
    ],
    code: [
      {
        title: 'Map example',
        language: 'hcl',
        code: `variable "instances" {
  default = {
    web = "Standard_B2s"
    app = "Standard_B4ms"
    db  = "Standard_D2s_v3"
  }
}

resource "azurerm_linux_virtual_machine" "vm" {
  for_each = var.instances

  name = each.key
  size = each.value
  # Other required VM arguments are omitted.
}`,
      },
    ],
    tags: ['terraform', 'for_each'],
  },
  {
    id: 'itv-mystpl-50',
    level: 'basic',
    kind: 'open',
    prompt: 'What is the difference between Terraform and OpenTofu?',
    probing:
      'Whether you know the licensing split and that compatibility should be tested before switching.',
    answer: [
      "Terraform and OpenTofu are Infrastructure as Code tools with very similar configuration language and workflows. OpenTofu began as a fork after HashiCorp changed Terraform's license.",
      "- **Developed by HashiCorp**: Community-governed under the Linux Foundation\n- **Uses HashiCorp's source-available Business Source License for current releases**: Uses the open-source Mozilla Public License 2.0\n- **Integrates with HCP Terraform and HashiCorp products**: Focuses on an open, vendor-neutral ecosystem\n- **Uses the `terraform` command**: Uses the `tofu` command",
      'Many configurations and providers work with both, but they are developed independently and compatibility should be tested before switching an existing project. Terraform can be practical for teams that use HashiCorp support and HCP Terraform. OpenTofu is attractive to teams that require an open-source, community-governed tool.',
    ],
    code: [
      {
        title: 'The main commands are similar',
        language: 'bash',
        code: `terraform init
terraform plan
terraform apply`,
      },
      {
        title: 'Commands',
        language: 'bash',
        code: `tofu init
tofu plan
tofu apply`,
      },
    ],
    tags: ['terraform', 'opentofu'],
  },
  {
    id: 'itv-mystpl-51',
    level: 'intermediate',
    kind: 'open',
    prompt: 'How do you prevent concurrent Terraform changes to the same state?',
    probing: 'Whether you know backend locking per cloud and the team controls that go with it.',
    answer: [
      'Two users applying changes to the same state at the same time can cause conflicts or unsafe infrastructure changes. Use a remote backend that supports state locking.',
      '**Azure**\nAzure Blob Storage uses a blob lease to lock the state while Terraform is changing it.',
      'When one operation holds the lock, another operation against the same state receives a lock error and must wait or stop.',
      '**AWS and Google Cloud**',
      '- The S3 backend supports state locking. Current Terraform versions can use S3 lockfiles; older configurations commonly use DynamoDB-based locking.\n- The Google Cloud Storage backend protects state updates using object generation checks.',
      'Always confirm the locking method supported by the Terraform or OpenTofu version and backend used by the project.\n**Team controls**',
      '- Run production applies only through CI/CD.\n- Allow one apply job per environment at a time.\n- Use pull requests, a reviewed plan, and approval before apply.\n- Give each environment its own state instead of sharing one state across development, test, and production.\n- Use RBAC so only approved identities can apply production changes.\n- Do not store state in Git or pass state files between team members manually.\n- Do not use `-lock=false` for normal applies.\n- Do not force-unlock until confirming that no operation still owns the lock.',
      '**Short interview answer**\nStore Terraform state in a remote backend with locking. When one apply acquires the lock, another apply against the same state is blocked. In production, also serialize apply jobs through CI/CD, use separate state for each environment, and restrict apply permission with RBAC.',
    ],
    code: [
      {
        title: 'Azure',
        language: 'hcl',
        code: `terraform {
  backend "azurerm" {
    resource_group_name  = "rg-terraform"
    storage_account_name = "tfstateprod"
    container_name       = "tfstate"
    key                  = "production.tfstate"
  }
}`,
      },
    ],
    tags: ['terraform', 'state locking', 'backend'],
  },
  {
    id: 'itv-mystpl-52',
    level: 'intermediate',
    kind: 'open',
    prompt: 'What is Terraform used for beyond creating infrastructure?',
    probing:
      'Whether you see Terraform as lifecycle management - drift, import, lifecycle rules, non-infra providers - and not a replacement for Ansible.',
    answer: [
      'Terraform is used for the broader lifecycle of resources, not just the initial `terraform apply`:',
      "1. **Modify existing infrastructure** - change resource attributes and reconcile them via plan/apply.\n2. **Manage infrastructure configuration** over time as requirements change.\n3. **Detect configuration drift** with `terraform plan` - compares real infrastructure against the state file.\n4. **Import existing manually created infrastructure** with `terraform import`, bringing resources that were created by hand under Terraform management.\n5. **Lifecycle management** using resource-level meta-arguments: `create_before_destroy` - creates the replacement resource before destroying the old one, avoiding downtime on replacement; `prevent_destroy` - blocks `terraform destroy`/replacement of a resource entirely, as a safety rail for critical resources (e.g. a production database); `ignore_changes` - tells Terraform to ignore drift on specific attributes (e.g. ones modified outside Terraform, like autoscaler-adjusted replica counts).\n6. **Manage multiple environments** with reusable modules and variables (dev/staging/prod from the same module, different variable values).\n7. **Create reusable Terraform modules** so common patterns aren't copy-pasted across projects.\n8. **Automate infrastructure changes through CI/CD** rather than running `terraform apply` from a laptop.\n9. **Manage non-infrastructure resources** - Terraform providers exist for Kubernetes objects, GitHub (repos, teams, branch protection), and Azure DevOps (projects, pipelines, permissions), so Terraform can manage more than just cloud infrastructure.\n10. **Standardization and compliance** - enforcing consistent resource configuration (tags, naming, network rules) across an organization through shared modules and policy checks.\n11. **Disaster recovery** - recreating infrastructure from code in a new region/subscription if the original is lost, since the desired state already exists as code.",
      'Terraform is primarily Infrastructure as Code / resource lifecycle management. It is **not** a replacement for Ansible - Ansible is generally better for configuring software inside already-running servers (packages, config files, services), while Terraform is better at creating/managing the resources themselves.',
    ],
    tags: ['terraform', 'lifecycle'],
  },
  {
    id: 'itv-mystpl-53',
    level: 'intermediate',
    kind: 'open',
    prompt: 'How do you integrate Terraform with Jenkins?',
    probing:
      'Whether you apply the exact saved plan after approval and authenticate without long-lived secrets.',
    answer: [
      'The Jenkins agent needs Terraform CLI, Azure CLI (where required), and Git installed.',
      'Note that `plan` writes to a saved plan file (`tfplan`) and `apply` applies that exact saved plan - this guarantees what gets approved is exactly what gets applied, with no drift between the two steps. Azure authentication should be handled securely using Jenkins credentials or a suitable federated/workload identity approach, not long-lived secrets pasted into the pipeline.',
    ],
    code: [
      {
        title: 'Terraform with Jenkins',
        language: 'text',
        code: `Developer
  |
  v
Git
  |
  v
Jenkins
  |
  v
terraform fmt
  |
  v
terraform init
  |
  v
terraform validate
  |
  v
terraform plan
  |
  v
Approval
  |
  v
terraform apply
  |
  v
Azure`,
      },
      {
        title: 'Terraform with Jenkins (2)',
        language: 'text',
        code: `pipeline {
    agent any

    stages {
        stage('Checkout') {
            steps {
                checkout scm
            }
        }

        stage('Terraform Init') {
            steps {
                sh 'terraform init'
            }
        }

        stage('Validate') {
            steps {
                sh 'terraform fmt -check'
                sh 'terraform validate'
            }
        }

        stage('Plan') {
            steps {
                sh 'terraform plan -out=tfplan'
            }
        }

        stage('Approval') {
            steps {
                input message: 'Approve Terraform Apply?'
            }
        }

        stage('Apply') {
            steps {
                sh 'terraform apply -auto-approve tfplan'
            }
        }
    }
}`,
      },
    ],
    tags: ['terraform', 'jenkins', 'ci/cd'],
  },
  {
    id: 'itv-mystpl-54',
    level: 'intermediate',
    kind: 'open',
    prompt: 'How do you integrate Terraform with Azure DevOps?',
    probing:
      'Whether you know the installer task, service connections and gating apply in a separate stage.',
    answer: [
      '`TerraformInstaller@1` installs the Terraform CLI onto the pipeline agent - this is the Azure DevOps-specific piece compared to the Jenkins version above.',
      '**Production recommendation:** separate the plan and apply into distinct stages and gate `apply` behind an approval/environment gate, rather than running both in the same script block as shown above.',
      '**Azure authentication:** use an Azure Resource Manager Service Connection, preferably backed by a secure/federated identity rather than a long-lived client secret.',
    ],
    code: [
      {
        title: 'Terraform with Azure DevOps',
        language: 'text',
        code: `Azure Repos
  |
  v
Azure Pipeline
  |
  v
Terraform
  |
  v
Azure`,
      },
      {
        title: 'Terraform with Azure DevOps (2)',
        language: 'yaml',
        code: `trigger:
- main

pool:
  vmImage: ubuntu-latest

steps:

- task: TerraformInstaller@1
  inputs:
    terraformVersion: 'latest'

- script: |
    terraform init
  displayName: Terraform Init

- script: |
    terraform fmt -check
    terraform validate
  displayName: Terraform Validate

- script: |
    terraform plan -out=tfplan
  displayName: Terraform Plan

- script: |
    terraform apply -auto-approve tfplan
  displayName: Terraform Apply`,
      },
      {
        title: 'Azure authentication',
        language: 'text',
        code: `Azure DevOps
  |
  v
Service Connection
  |
  v
Azure authentication
  |
  v
Terraform
  |
  v
Azure resources`,
      },
    ],
    tags: ['terraform', 'azure devops', 'ci/cd'],
  },
  {
    id: 'itv-mystpl-55',
    level: 'intermediate',
    kind: 'open',
    prompt: 'How do you integrate Terraform with GitHub Actions?',
    probing: 'Whether you plan on PRs, apply only on main, and authenticate to Azure with OIDC.',
    answer: [
      'Workflow file: `.github/workflows/terraform.yml`',
      "Note the `if: github.ref == 'refs/heads/main'` guard on the apply step - a PR triggers `init`/`validate`/`plan` (so reviewers see the plan output) but only a push to `main` actually applies.",
      'For Azure authentication, prefer **GitHub OIDC / federated credentials** with Azure rather than storing a long-lived client secret as a GitHub secret:',
      'The workflow requests a short-lived OIDC token from GitHub, Entra ID validates it against a configured federated credential, and Azure grants access without any long-lived secret ever being stored in GitHub.',
    ],
    code: [
      {
        title: 'Terraform with GitHub Actions',
        language: 'yaml',
        code: `name: Terraform

on:
  pull_request:
  push:
    branches:
      - main

jobs:
  terraform:
    runs-on: ubuntu-latest

    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Setup Terraform
        uses: hashicorp/setup-terraform@v3

      - name: Terraform Init
        run: terraform init

      - name: Terraform Format
        run: terraform fmt -check

      - name: Terraform Validate
        run: terraform validate

      - name: Terraform Plan
        run: terraform plan -out=tfplan

      - name: Terraform Apply
        if: github.ref == 'refs/heads/main'
        run: terraform apply -auto-approve tfplan`,
      },
      {
        title: 'Terraform with GitHub Actions (2)',
        language: 'text',
        code: `GitHub Actions
  |
  v
OIDC token
  |
  v
Azure Entra ID
  |
  v
Federated identity
  |
  v
Azure`,
      },
    ],
    tags: ['terraform', 'github actions', 'oidc'],
  },
  {
    id: 'itv-mystpl-56',
    level: 'advanced',
    kind: 'open',
    prompt: 'Compare running Terraform from Jenkins, Azure DevOps and GitHub Actions.',
    probing:
      'Whether you see that state stays the same and the differences are in install, trigger, auth and approval.',
    answer: [
      '- **Terraform CLI**: Jenkins: Installed on the agent manually; Azure DevOps: `TerraformInstaller@1` task; GitHub Actions: `hashicorp/setup-terraform` action\n- **Trigger**: Jenkins: Webhook / SCM polling; Azure DevOps: Repository trigger; GitHub Actions: Push / PR\n- **Azure auth**: Jenkins: Credentials or OIDC; Azure DevOps: Service Connection; GitHub Actions: OIDC (federated credentials)\n- **State storage**: Jenkins: Azure Storage (`azurerm` backend); Azure DevOps: Azure Storage (`azurerm` backend); GitHub Actions: Azure Storage (`azurerm` backend)\n- **Approval**: Jenkins: `input` step in the Jenkinsfile; Azure DevOps: Environment approvals; GitHub Actions: Environments / required reviewers\n- **Pipeline file**: Jenkins: `Jenkinsfile`; Azure DevOps: `azure-pipelines.yml`; GitHub Actions: `.github/workflows/*.yml`',
      'The state backend is the same everywhere (Azure Storage) regardless of which CI/CD tool drives the pipeline - the differences are all in how each tool triggers, authenticates, and gates the apply step.',
    ],
    followUps: [
      'How would you migrate a Terraform pipeline from Jenkins to GitHub Actions?',
      'How do you make sure the applied plan is exactly the approved plan in each tool?',
    ],
    tags: ['terraform', 'ci/cd', 'comparison'],
  },
]
