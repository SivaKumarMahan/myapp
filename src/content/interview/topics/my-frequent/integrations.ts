import type { InterviewQuestion } from '../../../types'

/** Tool integrations: pipelines, Terraform, AKS, Key Vault, scanners and identity. */
export const myFrequentIntegrationQuestions: InterviewQuestion[] = [
  {
    id: 'itv-myfaq-200',
    level: 'basic',
    kind: 'open',
    prompt:
      'Interviewers often ask "How did you connect X with Y?" What is the one rule behind every integration?',
    probing:
      'Whether you answer with three things: the flow (what talks to what, in which order), the authentication (how one tool proves who it is to the other), and one real detail that shows you have done it.',
    answer: [
      'Interviewers want three things: **the flow** (what talks to what, in which order), **the authentication** (how one tool proves who it is to the other - the part most people forget), and **one real detail**: a task name, a command, or a setting that shows you have done it.',
      'The one rule behind every integration: Tool A wants to call Tool B, Tool A proves its identity (managed identity, OIDC token, service connection, or a token), Tool B checks the permission (RBAC role, scope), and Tool A gets only the access it needs.',
      'Prefer, in this order:',
      '- **Managed identity** when the tool runs inside Azure (VM, AKS, App Service, Functions).\n- **Workload identity federation (OIDC)** when the tool runs outside Azure (GitHub Actions, GitLab CI, Azure DevOps hosted agents). No secret is stored anywhere.\n- **Service principal with a secret** only when nothing else works. Store the secret in Key Vault and rotate it.',
      'The integrations I can talk about, by area:',
      '- **Pipelines and Azure login:** Azure DevOps, GitHub Actions, GitLab CI, Jenkins with Azure.\n- **Pipelines and IaC:** Terraform login to Azure; Azure DevOps, GitHub Actions, GitLab CI, Jenkins with Terraform/OpenTofu and Bicep.\n- **Pipelines and app hosting:** pipelines with Docker, ACR, Helm, and AKS; connecting to AKS (Entra ID, local accounts, private clusters); Jenkins with Kubernetes; App Service and Functions deploys.\n- **Security in pipelines:** SonarQube, Trivy, Checkov, commercial scanners, secret scanning, Azure Policy.\n- **Secrets and identity:** Key Vault with AKS, App Service, Functions, Azure DevOps, Jenkins, Terraform; Managed Identity.\n- **Kubernetes platform:** AKS with ACR, Application Gateway, Azure Policy, PostgreSQL.\n- **Monitoring:** Azure Monitor vs Application Insights vs Log Analytics; applications with Application Insights; AKS with Azure Monitor and Prometheus; Grafana; alerts to Teams; Splunk setup; Azure and AKS with Splunk.\n- **Serverless and messaging:** Functions with Service Bus, Storage, and Event Grid.\n- **Configuration and artifacts:** Terraform with Ansible; Ansible with Azure; pipelines with Nexus and Azure Artifacts; Git with pipelines.',
    ],
    code: [
      {
        title: 'The one rule behind every integration',
        language: 'text',
        code: `Tool A wants to call Tool B
-> Tool A proves its identity (managed identity, OIDC token, service connection, or a token)
-> Tool B checks the permission (RBAC role, scope)
-> Tool A gets only the access it needs`,
      },
    ],
    diagrams: [
      {
        kind: 'flow',
        title: 'The one rule behind every integration',
        caption: 'Identity first, then permission, then only the access that is needed.',
        nodes: [
          { label: 'Tool A wants to call Tool B' },
          {
            label: 'Tool A proves its identity',
            detail: 'Managed identity, OIDC token, or service connection',
            tone: 'accent',
          },
          { label: 'Tool B checks the permission', detail: 'RBAC role and scope' },
          { label: 'Least-privilege access', tone: 'success' },
        ],
      },
    ],
    traps: [
      'Describing only the flow and forgetting how the tools authenticate to each other.',
      'Reaching for a service principal secret first, when managed identity or OIDC would need no secret at all.',
    ],
    tags: ['integrations', 'identity', 'oidc', 'managed identity'],
  },
  {
    id: 'itv-myfaq-201',
    level: 'intermediate',
    kind: 'open',
    prompt:
      'How does Azure DevOps connect to Azure? How does your pipeline get permission to deploy?',
    probing:
      'An ARM service connection with workload identity federation, least-privilege scope, and approvals - not a stored client secret.',
    answer: [
      'Through an **Azure Resource Manager service connection** that uses **workload identity federation**. The pipeline gets a short-lived token from Entra ID at run time, so there is no client secret to store or rotate.',
      'Setup steps for the service connection:',
      '- Project settings -> Service connections -> New -> Azure Resource Manager -> **Workload identity federation**.\n- Choose the subscription and resource group scope.\n- Give the identity only the roles it needs, for example **Contributor** on the app resource group, not Owner on the subscription.\n- Add **approvals and checks** on the service connection or on the Production environment.',
      'Things to remember about service connections:',
      '- One service connection per environment (dev, prod). A dev pipeline should not be able to touch prod.\n- If a task fails with `AuthorizationFailed`, read the action and scope in the error and add only that role.\n- A service connection is just stored login details for an outside service. Azure is the most common type, but there are others: **Docker Registry** (ACR), **Kubernetes**, **GitHub**, **SonarQube**, **Generic** (URL and token), and marketplace ones like Snyk. The YAML only names the connection; the credential never appears in the pipeline.',
    ],
    code: [
      {
        title: 'Token flow',
        language: 'text',
        code: `Pipeline job starts
-> Azure DevOps issues an OIDC token for the service connection
-> Entra ID trusts that token (federated credential on the app registration or managed identity)
-> Entra ID returns an Azure access token
-> the task runs az / Terraform / Bicep with that token`,
      },
      {
        title: 'Show the identity the pipeline uses',
        language: 'yaml',
        code: `- task: AzureCLI@2
  displayName: Show the identity the pipeline uses
  inputs:
    azureSubscription: sc-azure-prod      # service connection name
    scriptType: bash
    scriptLocation: inlineScript
    inlineScript: |
      az account show --query "{subscription:name, user:user.name}" -o table`,
      },
    ],
    diagrams: [
      {
        kind: 'sequence',
        title: 'Azure DevOps login with workload identity federation',
        caption:
          'The pipeline trades a short-lived OIDC token for an Azure token. No secret is stored.',
        participants: [
          { id: 'job', label: 'Pipeline job' },
          { id: 'ado', label: 'Azure DevOps' },
          { id: 'entra', label: 'Entra ID' },
          { id: 'azure', label: 'Azure' },
        ],
        messages: [
          { from: 'ado', to: 'job', label: 'OIDC token for the connection' },
          { from: 'job', to: 'entra', label: 'Exchange OIDC token' },
          { from: 'entra', to: 'job', label: 'Azure access token', kind: 'return' },
          { from: 'job', to: 'azure', label: 'az, Terraform, or Bicep call' },
        ],
      },
    ],
    followUps: [
      'What do you check when a task fails with AuthorizationFailed?',
      'How do you stop a dev pipeline from deploying to prod?',
    ],
    tags: ['azure devops', 'service connection', 'oidc', 'workload identity federation'],
  },
  {
    id: 'itv-myfaq-202',
    level: 'intermediate',
    kind: 'open',
    prompt: 'How does GitHub Actions connect to Azure without storing a secret?',
    probing:
      'OIDC with a federated credential whose subject matches the repo and branch or environment, `id-token: write`, and `azure/login`.',
    answer: [
      'With **OpenID Connect (OIDC)**. I create an Entra ID app registration or a user-assigned managed identity, add a **federated credential** that trusts my repo and branch or environment, and use `azure/login`.',
      'The workflow runs, GitHub issues an OIDC token (repo, branch, environment are inside it), Entra ID checks the federated credential matches, Entra ID returns an Azure token, and az, Terraform, or Bicep commands run.',
      '- The federated credential **subject** must match exactly, for example `repo:my-org/my-repo:environment:production`. A mismatch gives `AADSTS70021: No matching federated identity record found`.\n- Client ID, tenant ID, and subscription ID are not secrets. They can be repository variables.',
    ],
    code: [
      {
        title: 'Token flow',
        language: 'text',
        code: `Workflow runs
-> GitHub issues an OIDC token (repo, branch, environment are inside it)
-> Entra ID checks the federated credential matches
-> Entra ID returns an Azure token
-> az, Terraform, or Bicep commands run`,
      },
      {
        title: 'azure/login with OIDC',
        language: 'yaml',
        code: `permissions:
  id-token: write     # needed to request the OIDC token
  contents: read

jobs:
  deploy:
    runs-on: ubuntu-latest
    environment: production
    steps:
      - uses: actions/checkout@v4
      - uses: azure/login@v2
        with:
          client-id: \${{ vars.AZURE_CLIENT_ID }}
          tenant-id: \${{ vars.AZURE_TENANT_ID }}
          subscription-id: \${{ vars.AZURE_SUBSCRIPTION_ID }}
      - run: az group list -o table`,
      },
    ],
    traps: [
      'Forgetting `permissions: id-token: write` - the workflow cannot request the OIDC token without it.',
      'Storing the client ID and tenant ID as secrets as if they were passwords. They are identifiers, not credentials.',
    ],
    tags: ['github actions', 'oidc', 'federated credential'],
  },
  {
    id: 'itv-myfaq-203',
    level: 'intermediate',
    kind: 'open',
    prompt: 'How does GitLab CI connect to Azure?',
    probing:
      'That the OIDC idea carries over: `id_tokens` with the right audience and a federated credential for the project and branch.',
    answer: [
      'The same OIDC idea. GitLab issues an ID token to the job with `id_tokens`. Entra ID trusts it through a federated credential whose subject is the GitLab project and branch.',
      'Federated credential subject example: `project_path:my-group/my-project:ref_type:branch:ref:main`. The job passes the token to `az login --federated-token`.',
    ],
    code: [
      {
        title: 'GitLab job logging in with an ID token',
        language: 'yaml',
        code: `deploy:
  image: mcr.microsoft.com/azure-cli
  id_tokens:
    AZURE_JWT:
      aud: api://AzureADTokenExchange
  script:
    - az login --service-principal -u "$AZURE_CLIENT_ID" --tenant "$AZURE_TENANT_ID" --federated-token "$AZURE_JWT"
    - az account set --subscription "$AZURE_SUBSCRIPTION_ID"
    - az group list -o table`,
      },
    ],
    tags: ['gitlab ci', 'oidc', 'federated credential'],
  },
  {
    id: 'itv-myfaq-204',
    level: 'intermediate',
    kind: 'open',
    prompt: 'Jenkins does not have a built-in Azure login. How does Jenkins connect to Azure?',
    probing:
      'That the answer depends on where Jenkins runs, and that you prefer managed identity over a stored service principal secret.',
    answer: [
      'It depends on where Jenkins runs:',
      "- **An Azure VM or VM Scale Set:** **managed identity** on the VM: `az login --identity`. No secret at all.\n- **AKS (agents as Pods):** **AKS Workload Identity** on the agent Pod's service account.\n- **Outside Azure:** service principal. The secret is stored in Jenkins Credentials (better: fetched from Key Vault) and never printed.",
      'With a service principal secret, I wrap the login in `withCredentials` so the values are masked in the console log and only exist for that block.',
    ],
    code: [
      {
        title: 'Jenkinsfile: agent VM with a user-assigned managed identity',
        language: 'text',
        code: `pipeline {
  agent { label 'azure-agent' }
  stages {
    stage('Azure login') {
      steps {
        // Agent VM has a user-assigned managed identity
        sh 'az login --identity --username "$AZURE_CLIENT_ID"'
        sh 'az account set --subscription "$AZURE_SUBSCRIPTION_ID"'
      }
    }
  }
}`,
      },
      {
        title: 'With a service principal secret instead',
        language: 'text',
        code: `withCredentials([usernamePassword(credentialsId: 'azure-sp',
                 usernameVariable: 'ARM_CLIENT_ID', passwordVariable: 'ARM_CLIENT_SECRET')]) {
  sh 'az login --service-principal -u "$ARM_CLIENT_ID" -p "$ARM_CLIENT_SECRET" --tenant "$ARM_TENANT_ID"'
}`,
      },
    ],
    tags: ['jenkins', 'managed identity', 'service principal'],
  },
  {
    id: 'itv-myfaq-205',
    level: 'intermediate',
    kind: 'open',
    prompt: 'How do you authenticate Terraform to Azure?',
    probing:
      'That the azurerm provider and backend read `ARM_*` variables, so code holds no credentials, and that the method changes with where Terraform runs.',
    answer: [
      'Through the **azurerm provider**. The provider and the backend both read `ARM_*` environment variables, so the `.tf` code has no credentials. The login method depends on where Terraform runs:',
      '- **My laptop:** Azure CLI session - `az login`, then `az account set`. Terraform uses the CLI token.\n- **Azure DevOps:** ARM service connection with **workload identity federation** - `ARM_USE_OIDC=true`, `ARM_OIDC_TOKEN`, `ARM_CLIENT_ID`, `ARM_TENANT_ID`.\n- **GitHub Actions / GitLab CI:** **OIDC** federated credential - `ARM_USE_OIDC=true` plus client, tenant, subscription IDs.\n- **Azure VM, VMSS, or AKS agent:** **managed identity** - `ARM_USE_MSI=true` (and `ARM_CLIENT_ID` for a user-assigned identity).\n- **Old setups only:** service principal + client secret - `ARM_CLIENT_SECRET` from Key Vault or the CI secret store.',
      'Things to remember about the Terraform identity:',
      '- Prefer OIDC or managed identity. A client secret is a long-lived password that can leak and must be rotated.\n- The identity needs a role on the target scope (for example **Contributor** on the resource group) and **Storage Blob Data Contributor** on the state container. If it creates role assignments, it also needs **Role Based Access Control Administrator** (or User Access Administrator), ideally with conditions.\n- Never put credentials in the `provider` block or in `.tfvars`. They end up in Git.',
    ],
    code: [
      {
        title: 'Provider block with no secrets',
        language: 'hcl',
        code: `provider "azurerm" {
  features {}
  # No secrets here. Login details come from ARM_* environment variables.
  # In azurerm 4.x the subscription ID is required: set it here or in ARM_SUBSCRIPTION_ID.
}`,
      },
    ],
    followUps: [
      'Which roles does the Terraform identity need if the code also creates role assignments?',
      'Why is a client secret the last resort?',
    ],
    tags: ['terraform', 'azurerm', 'oidc', 'managed identity'],
  },
  {
    id: 'itv-myfaq-206',
    level: 'basic',
    kind: 'open',
    prompt: 'How does Terraform keep its state in Azure?',
    probing:
      'The azurerm backend in a Storage account, blob-lease locking, Entra ID auth instead of the account key, and recovery options.',
    answer: [
      'Every pipeline uses the same **azurerm backend**. Learn this once.',
      '- State is a blob. **Locking** uses a blob lease, so two runs cannot change the same state at the same time.\n- The pipeline identity needs **Storage Blob Data Contributor** on the container.\n- Turn on blob versioning and soft delete so a broken state can be restored.\n- OpenTofu uses the same backend block. Replace `terraform` with `tofu` in the commands.',
    ],
    code: [
      {
        title: 'azurerm backend',
        language: 'hcl',
        code: `terraform {
  backend "azurerm" {
    resource_group_name  = "rg-tfstate"
    storage_account_name = "sttfstateprod01"
    container_name       = "tfstate"
    key                  = "app/prod.tfstate"
    use_azuread_auth     = true   # Entra ID login, no storage account key
  }
}`,
      },
    ],
    tags: ['terraform', 'state', 'storage'],
  },
  {
    id: 'itv-myfaq-207',
    level: 'advanced',
    kind: 'open',
    prompt:
      'How do you integrate Azure DevOps with Terraform? Walk me through your Terraform pipeline.',
    probing:
      'Plan on PRs, apply only on main after an approval, applying the exact saved plan file, and how the OIDC token reaches the provider.',
    answer: [
      'Two stages. **Plan** runs on every pull request and on main. **Apply** runs only on main, after a manual approval on the Production environment, and it applies the exact plan file that was reviewed.',
      'On a pull request: `terraform fmt -check`, validate, Checkov, then `terraform plan` shown in the PR. On merge to main: plan again, save `tfplan` as a pipeline artifact, wait for approval on the "prod" environment, then `terraform apply tfplan`.',
      '- `addSpnToEnvironment: true` gives `idToken` only when the service connection uses workload identity federation.\n- Apply the **saved plan file**, so what was approved is what runs.',
    ],
    deeper: [
      '`terraform plan -detailed-exitcode` returns exit code **2** when there are changes. A scheduled pipeline can use it for **drift detection** and alert when someone changed Azure by hand.',
      'Instead of a script, you can use the **Terraform marketplace extension** tasks (`TerraformInstaller@1` and `TerraformTask@5` with `command: init/plan/apply` and `backendServiceArm`). Same flow, less shell code. A deployment job does not check out code automatically, so add `checkout: self` before `init` in the apply stage.',
      'For dev, QA, and prod, I reuse **one stage template** with parameters. Each environment has its own state key (`dev.tfstate`, `prod.tfstate`), its own `.tfvars`, and its own service connection. Only prod has an approval.',
    ],
    code: [
      {
        title: 'Flow',
        language: 'text',
        code: `Pull request
-> terraform fmt -check, validate, Checkov
-> terraform plan (shown in the PR)
Merge to main
-> plan again, save tfplan as a pipeline artifact
-> approval on the "prod" environment
-> terraform apply tfplan`,
      },
      {
        title: 'Plan and Apply stages',
        language: 'yaml',
        code: `stages:
- stage: Plan
  jobs:
  - job: plan
    steps:
    - task: AzureCLI@2
      inputs:
        azureSubscription: sc-azure-prod
        scriptType: bash
        scriptLocation: inlineScript
        addSpnToEnvironment: true          # exposes servicePrincipalId, idToken, tenantId
        inlineScript: |
          export ARM_CLIENT_ID=$servicePrincipalId
          export ARM_TENANT_ID=$tenantId
          export ARM_OIDC_TOKEN=$idToken
          export ARM_USE_OIDC=true
          export ARM_SUBSCRIPTION_ID=$(az account show --query id -o tsv)
          terraform init -input=false
          terraform plan -input=false -out=tfplan
    - publish: tfplan
      artifact: tfplan

- stage: Apply
  dependsOn: Plan
  condition: and(succeeded(), eq(variables['Build.SourceBranch'], 'refs/heads/main'))
  jobs:
  - deployment: apply
    environment: prod                       # approval is set on this environment
    strategy:
      runOnce:
        deploy:
          steps:
          - checkout: self
          - download: current
            artifact: tfplan
          # same AzureCLI@2 login block as above, then:
          # terraform init -input=false
          # terraform apply -input=false $(Pipeline.Workspace)/tfplan/tfplan`,
      },
    ],
    diagrams: [
      {
        kind: 'flow',
        title: 'Terraform pipeline in Azure DevOps',
        caption: 'What the approver saw in the plan is exactly what apply runs.',
        nodes: [
          { label: 'Pull request', detail: 'fmt -check, validate, Checkov' },
          { label: 'terraform plan', detail: 'Shown in the PR' },
          { label: 'Merge to main', detail: 'Plan again, publish tfplan artifact' },
          { label: 'Approval on prod environment', tone: 'warning' },
          { label: 'terraform apply tfplan', tone: 'success' },
        ],
      },
    ],
    followUps: [
      'How would you detect drift between Terraform and what is really in Azure?',
      'How do you reuse one pipeline for dev, QA, and prod?',
    ],
    tags: ['azure devops', 'terraform', 'ci/cd'],
  },
  {
    id: 'itv-myfaq-208',
    level: 'advanced',
    kind: 'open',
    prompt: 'How do you integrate GitHub Actions with Terraform?',
    probing:
      'OIDC through `ARM_USE_OIDC`, a plan artifact, apply gated by an environment with required reviewers, and the subject scoped to that environment.',
    answer: [
      'OIDC login, then `hashicorp/setup-terraform`. The plan is posted to the pull request. Apply runs on main in a GitHub **environment** with required reviewers.',
      '- With `ARM_USE_OIDC=true`, the provider requests the token itself. You do not need `azure/login` for Terraform, only for `az` commands.\n- For OpenTofu, use `opentofu/setup-opentofu` and `tofu` commands.',
    ],
    deeper: [
      "The apply job's federated credential subject is the **environment** (`environment:production`), so only that environment can reach prod. A job that is not in the production environment gets a token with a different subject and Entra ID refuses it.",
    ],
    code: [
      {
        title: 'Plan and apply workflow',
        language: 'yaml',
        code: `permissions:
  id-token: write
  contents: read
  pull-requests: write

env:
  ARM_CLIENT_ID: \${{ vars.AZURE_CLIENT_ID }}
  ARM_TENANT_ID: \${{ vars.AZURE_TENANT_ID }}
  ARM_SUBSCRIPTION_ID: \${{ vars.AZURE_SUBSCRIPTION_ID }}
  ARM_USE_OIDC: true          # Terraform azurerm provider and backend read the GitHub token

jobs:
  plan:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: hashicorp/setup-terraform@v3
      - run: terraform init -input=false
      - run: terraform fmt -check
      - run: terraform validate
      - run: terraform plan -input=false -out=tfplan
      - uses: actions/upload-artifact@v4
        with: { name: tfplan, path: tfplan }

  apply:
    needs: plan
    if: github.ref == 'refs/heads/main'
    runs-on: ubuntu-latest
    environment: production      # required reviewers approve here
    steps:
      - uses: actions/checkout@v4
      - uses: hashicorp/setup-terraform@v3
      - uses: actions/download-artifact@v4
        with: { name: tfplan }
      - run: terraform init -input=false
      - run: terraform apply -input=false tfplan`,
      },
    ],
    followUps: [
      'Why is the federated credential subject set to the environment rather than the branch?',
    ],
    tags: ['github actions', 'terraform', 'oidc'],
  },
  {
    id: 'itv-myfaq-209',
    level: 'intermediate',
    kind: 'open',
    prompt: 'How do you integrate GitLab CI with Terraform or OpenTofu?',
    probing:
      'The same shape as other tools: `id_tokens` login, plan saved as an artifact, manual apply on the protected main branch.',
    answer: [
      'Same shape as the others: `id_tokens` for login, a plan job that saves the plan as an artifact, and a manual apply job on the protected main branch.',
      'GitLab also has a built-in Terraform state backend, but on Azure I keep state in the azurerm backend so all tools share one place.',
    ],
    code: [
      {
        title: '.gitlab-ci.yml with OpenTofu',
        language: 'yaml',
        code: `stages: [validate, plan, apply]

default:
  image:
    name: ghcr.io/opentofu/opentofu:1.9
    entrypoint: [""]      # the image's entrypoint is tofu; GitLab needs a shell
  id_tokens:
    AZURE_JWT:
      aud: api://AzureADTokenExchange

variables:
  ARM_USE_OIDC: "true"
  ARM_CLIENT_ID: $AZURE_CLIENT_ID
  ARM_TENANT_ID: $AZURE_TENANT_ID
  ARM_SUBSCRIPTION_ID: $AZURE_SUBSCRIPTION_ID

before_script:
  - export ARM_OIDC_TOKEN="$AZURE_JWT"
  - tofu init -input=false

validate:
  stage: validate
  script:
    - tofu fmt -check
    - tofu validate

plan:
  stage: plan
  script:
    - tofu plan -input=false -out=tfplan
  artifacts:
    paths: [tfplan]

apply:
  stage: apply
  script:
    - tofu apply -input=false tfplan
  rules:
    - if: $CI_COMMIT_BRANCH == "main"
      when: manual          # someone clicks to approve
  environment: production`,
      },
    ],
    tags: ['gitlab ci', 'terraform', 'opentofu'],
  },
  {
    id: 'itv-myfaq-210',
    level: 'intermediate',
    kind: 'open',
    prompt: 'How do you integrate Jenkins with Terraform?',
    probing:
      'A Declarative Pipeline with plan, an `input` approval limited to a submitter group, and apply; login through managed identity.',
    answer: [
      "A Declarative Pipeline with plan, an `input` approval step, and apply. Jenkins logs in to Azure with the agent VM's managed identity.",
      'For the backend with managed identity, add `use_msi = true` (and `client_id` for a user-assigned identity) in the azurerm backend block, or pass them with `-backend-config`.',
    ],
    code: [
      {
        title: 'Jenkinsfile: plan, approve, apply',
        language: 'text',
        code: `pipeline {
  agent { label 'terraform' }
  environment {
    ARM_USE_MSI         = 'true'                   // use the agent VM's managed identity
    ARM_CLIENT_ID       = credentials('tf-msi-client-id')
    ARM_SUBSCRIPTION_ID = credentials('azure-subscription-id')
    ARM_TENANT_ID       = credentials('azure-tenant-id')
  }
  stages {
    stage('Init and validate') {
      steps {
        sh 'terraform init -input=false'
        sh 'terraform fmt -check && terraform validate'
      }
    }
    stage('Plan') {
      steps {
        sh 'terraform plan -input=false -out=tfplan'
        sh 'terraform show -no-color tfplan > plan.txt'
        archiveArtifacts artifacts: 'plan.txt'
      }
    }
    stage('Approve') {
      when { branch 'main' }
      steps {
        timeout(time: 30, unit: 'MINUTES') {
          input message: 'Apply this plan to production?', submitter: 'platform-leads'
        }
      }
    }
    stage('Apply') {
      when { branch 'main' }
      steps { sh 'terraform apply -input=false tfplan' }
    }
  }
}`,
      },
    ],
    tags: ['jenkins', 'terraform', 'managed identity'],
  },
  {
    id: 'itv-myfaq-211',
    level: 'intermediate',
    kind: 'open',
    prompt: 'How do you integrate pipelines with Bicep? How do you deploy Bicep from a pipeline?',
    probing:
      'Lint and `what-if` on the PR, an approval, then `az deployment group create` with a `.bicepparam` per environment.',
    answer: [
      'With the Azure CLI. I run `what-if` first so reviewers see the changes, then `az deployment group create` with a `.bicepparam` file per environment.',
      'On a pull request: `az bicep build` (lint and compile) and `az deployment group what-if` (show changes). On merge to main: approval, then `az deployment group create`.',
      'Terraform vs Bicep in one line each:',
      '- **Bicep:** Azure only, no state file (Azure is the state), new Azure features on day one.\n- **Terraform/OpenTofu:** many providers, needs a state file, plan shows exact changes, bigger module ecosystem.',
    ],
    code: [
      {
        title: 'Flow',
        language: 'text',
        code: `Pull request
-> az bicep build (lint and compile)
-> az deployment group what-if (show changes)
Merge to main
-> approval
-> az deployment group create`,
      },
      {
        title: 'Azure DevOps example',
        language: 'yaml',
        code: `- task: AzureCLI@2
  displayName: Bicep what-if
  inputs:
    azureSubscription: sc-azure-prod
    scriptType: bash
    scriptLocation: inlineScript
    inlineScript: |
      az bicep build --file main.bicep
      az deployment group what-if \\
        --resource-group rg-app-prod \\
        --template-file main.bicep \\
        --parameters main.prod.bicepparam

- task: AzureCLI@2
  displayName: Bicep deploy
  inputs:
    azureSubscription: sc-azure-prod
    scriptType: bash
    scriptLocation: inlineScript
    inlineScript: |
      az deployment group create \\
        --name "app-$(Build.BuildId)" \\
        --resource-group rg-app-prod \\
        --template-file main.bicep \\
        --parameters main.prod.bicepparam`,
      },
      {
        title: 'GitHub Actions example',
        language: 'yaml',
        code: `- uses: azure/login@v2
  with:
    client-id: \${{ vars.AZURE_CLIENT_ID }}
    tenant-id: \${{ vars.AZURE_TENANT_ID }}
    subscription-id: \${{ vars.AZURE_SUBSCRIPTION_ID }}
- run: |
    az deployment group create \\
      --resource-group rg-app-prod \\
      --template-file main.bicep \\
      --parameters main.prod.bicepparam`,
      },
    ],
    tags: ['bicep', 'azure devops', 'github actions', 'what-if'],
  },
  {
    id: 'itv-myfaq-212',
    level: 'intermediate',
    kind: 'open',
    prompt: 'How do you integrate Terraform with Key Vault?',
    probing:
      'Reading secrets through a data source instead of `.tfvars`, the role needed, and knowing the value still lands in state.',
    answer: [
      'Terraform reads secrets from Key Vault with a data source instead of keeping them in `.tfvars` files.',
      'The pipeline identity needs the **Key Vault Secrets User** role. Remember that the value still ends up in the **state file**, so state access must be restricted.',
    ],
    code: [
      {
        title: 'Read a Key Vault secret in Terraform',
        language: 'hcl',
        code: `data "azurerm_key_vault" "kv" {
  name                = "kv-app-prod"
  resource_group_name = "rg-security-prod"
}

data "azurerm_key_vault_secret" "db_password" {
  name         = "postgres-admin-password"
  key_vault_id = data.azurerm_key_vault.kv.id
}

resource "azurerm_postgresql_flexible_server" "db" {
  # ...
  administrator_password = data.azurerm_key_vault_secret.db_password.value
}`,
      },
    ],
    traps: [
      'Assuming the secret is safe because it came from Key Vault. Terraform writes the value into the state file.',
    ],
    tags: ['terraform', 'key vault', 'secrets'],
  },
  {
    id: 'itv-myfaq-213',
    level: 'advanced',
    kind: 'open',
    prompt: 'How do you integrate Terraform with AKS and Helm?',
    probing:
      'Where you draw the line between Terraform and Helm, and why cluster and Helm releases in one state cause trouble.',
    answer: [
      'Terraform creates the AKS cluster. For what runs inside the cluster, I keep a clear line:',
      '- **Terraform:** AKS, node pools, ACR, networking, identities, role assignments.\n- **Helm in the pipeline:** applications and most cluster add-ons.',
    ],
    deeper: [
      'Putting the cluster and its Helm releases in the **same** Terraform state causes problems: the Kubernetes and Helm providers need the cluster to exist before plan, so a cluster replacement can break the whole plan.',
      'If Terraform must install something like an ingress controller, I put it in a separate state that reads the cluster with a data source.',
    ],
    code: [
      {
        title: 'AKS cluster and AcrPull role',
        language: 'hcl',
        code: `resource "azurerm_kubernetes_cluster" "aks" {
  name                = "aks-app-prod"
  location            = azurerm_resource_group.rg.location
  resource_group_name = azurerm_resource_group.rg.name
  dns_prefix          = "aksappprod"
  oidc_issuer_enabled       = true
  workload_identity_enabled = true

  default_node_pool {
    name                 = "system"
    vm_size              = "Standard_D4s_v5"
    auto_scaling_enabled = true
    min_count            = 2
    max_count            = 4
  }

  identity { type = "SystemAssigned" }
}

# Let the cluster pull images from ACR
resource "azurerm_role_assignment" "acr_pull" {
  scope                = azurerm_container_registry.acr.id
  role_definition_name = "AcrPull"
  principal_id         = azurerm_kubernetes_cluster.aks.kubelet_identity[0].object_id
}`,
      },
    ],
    followUps: [
      'If Terraform has to install an ingress controller, how do you structure the states?',
    ],
    tags: ['terraform', 'aks', 'helm'],
  },
  {
    id: 'itv-myfaq-214',
    level: 'basic',
    kind: 'open',
    prompt: 'What is the common container flow that every CI tool follows?',
    probing:
      'Build, scan, push with a unique tag, deploy with Helm, pull with AcrPull, check the rollout - and build once, promote the same image.',
    answer: [
      'Every CI tool follows the same flow. Only the syntax changes: build the image (Docker), scan it (Trivy), push it to ACR with a unique tag (Git commit SHA or build number), deploy to AKS with Helm using that tag, AKS pulls the image from ACR (AcrPull role on the kubelet identity), and check the rollout.',
      '**Build once, promote the same image.** The image tested in dev is the exact image that goes to prod. Only the Helm values change.',
    ],
    code: [
      {
        title: 'The common container flow',
        language: 'text',
        code: `Build the image (Docker)
-> scan it (Trivy)
-> push it to ACR with a unique tag (Git commit SHA or build number)
-> deploy to AKS with Helm, using that tag
-> AKS pulls the image from ACR (AcrPull role on the kubelet identity)
-> check the rollout`,
      },
    ],
    diagrams: [
      {
        kind: 'flow',
        title: 'The common container flow',
        caption: 'Build once, promote the same image. Only the Helm values change per environment.',
        nodes: [
          { label: 'Build the image', detail: 'Docker' },
          {
            label: 'Scan it',
            detail: 'Trivy',
            branch: { label: 'HIGH or CRITICAL: stop', tone: 'danger' },
          },
          { label: 'Push to ACR', detail: 'Unique tag: commit SHA or build number' },
          { label: 'Deploy to AKS with Helm', detail: 'Using that tag' },
          { label: 'AKS pulls from ACR', detail: 'AcrPull on the kubelet identity' },
          { label: 'Check the rollout', tone: 'success' },
        ],
      },
    ],
    tags: ['ci/cd', 'docker', 'acr', 'aks', 'helm'],
  },
  {
    id: 'itv-myfaq-215',
    level: 'basic',
    kind: 'open',
    prompt: 'How do you integrate Azure DevOps with Docker and ACR?',
    probing:
      'A Docker Registry service connection and the `Docker@2` task, and knowing `az acr build` as the no-Docker alternative.',
    answer: [
      'I create a **Docker Registry service connection** to ACR (it can use workload identity federation), then use the `Docker@2` task.',
      'Another option is `az acr build`, which builds the image inside ACR, so the agent does not need Docker.',
    ],
    code: [
      {
        title: 'Docker@2 build and push',
        language: 'yaml',
        code: `- task: Docker@2
  displayName: Build and push
  inputs:
    containerRegistry: sc-acr-prod          # Docker Registry service connection
    repository: orders-api
    command: buildAndPush
    Dockerfile: src/Dockerfile
    tags: |
      $(Build.SourceVersion)`,
      },
      {
        title: 'Build inside ACR',
        language: 'bash',
        code: `az acr build --registry myacrprod --image orders-api:$(Build.SourceVersion) src/`,
      },
    ],
    tags: ['azure devops', 'docker', 'acr'],
  },
  {
    id: 'itv-myfaq-216',
    level: 'basic',
    kind: 'open',
    prompt: 'How do you integrate GitHub Actions with ACR?',
    probing:
      'OIDC login, `az acr login`, a push tagged with the commit SHA, and the AcrPush role on the identity.',
    answer: [
      'I log in with `azure/login` (OIDC), run `az acr login`, then build and push the image tagged with `github.sha`.',
      'The login identity needs the **AcrPush** role on the registry.',
    ],
    code: [
      {
        title: 'Build and push to ACR',
        language: 'yaml',
        code: `- uses: azure/login@v2
  with:
    client-id: \${{ vars.AZURE_CLIENT_ID }}
    tenant-id: \${{ vars.AZURE_TENANT_ID }}
    subscription-id: \${{ vars.AZURE_SUBSCRIPTION_ID }}
- run: |
    az acr login --name myacrprod
    docker build -t myacrprod.azurecr.io/orders-api:\${{ github.sha }} src/
    docker push myacrprod.azurecr.io/orders-api:\${{ github.sha }}`,
      },
    ],
    tags: ['github actions', 'acr', 'docker'],
  },
  {
    id: 'itv-myfaq-217',
    level: 'advanced',
    kind: 'open',
    prompt: 'How do you connect to an AKS cluster, and how does it know who you are?',
    probing:
      'Entra ID login through kubelogin, the difference between authentication and authorization, why local accounts are disabled, and how to reach a private cluster.',
    answer: [
      'I log in to Azure, download the kubeconfig with `az aks get-credentials`, and use `kubectl`. On our clusters, login is through **Microsoft Entra ID**, so `kubectl` gets my Entra token through **kubelogin**.',
      'Authentication (who are you?) is the Entra ID token, checked by the AKS API server. Authorization (what can you do?) is Azure RBAC for Kubernetes, or Kubernetes RBAC (Role + RoleBinding to an Entra group).',
      '- Wrong or missing login gives `401 Unauthorized`.\n- Logged in but no role gives `Error from server (Forbidden)`. Then I fix the role, not the login.',
    ],
    deeper: [
      'Local accounts vs Entra ID:\n- **How:** local accounts are a certificate-based **cluster-admin** kubeconfig (`az aks get-credentials --admin`); Entra ID is your own Entra user, group, or managed identity.\n- **Who is it in the audit log:** with local accounts a shared admin, nobody in particular; with Entra ID the real person or pipeline identity.\n- **Access control:** local accounts are all or nothing; Entra ID is per namespace, through Azure RBAC or Kubernetes RBAC.',
      'In production I **disable local accounts**, so nobody can bypass Entra ID with a shared admin certificate. Keep one Entra **admin group** (`--aad-admin-group-object-ids`) for break-glass access, with Privileged Identity Management if possible.',
      'If the cluster is private, the API server has only a private IP, so `kubectl` from the internet does not work. Options: run `kubectl` from a machine in the VNet or a peered VNet (a jump box through **Azure Bastion**, a VPN or ExpressRoute connection, or a **self-hosted pipeline agent** in the VNet), or use **`az aks command invoke`** - Azure runs the command inside the cluster for you, so no network path is needed. Good for quick checks and emergencies, not for normal deploys.',
      "Pipelines connect the same way, but with their own identity (service connection or managed identity) and `kubelogin convert-kubeconfig -l azurecli` or `-l msi`, never with a person's account.",
      'The private DNS zone of a private cluster must resolve from wherever `kubectl` runs. Most "cannot connect" problems on private clusters are DNS.',
    ],
    code: [
      {
        title: 'Connect with Entra ID',
        language: 'bash',
        code: `az login
az account set --subscription "<subscription-id>"
az aks get-credentials -g rg-aks-prod -n aks-app-prod --overwrite-existing
kubelogin convert-kubeconfig -l azurecli      # reuse the az login token
kubectl get nodes`,
      },
      {
        title: 'Authentication vs authorization',
        language: 'text',
        code: `Authentication (who are you?)  -> Entra ID token, checked by the AKS API server
Authorization (what can you do?) -> Azure RBAC for Kubernetes, or Kubernetes RBAC (Role + RoleBinding to an Entra group)`,
      },
      {
        title: 'Disable local accounts',
        language: 'bash',
        code: `az aks update -g rg-aks-prod -n aks-app-prod --disable-local-accounts   # needs Entra ID integration turned on`,
      },
      {
        title: 'Run commands in a private cluster',
        language: 'bash',
        code: `az aks command invoke -g rg-aks-prod -n aks-app-prod --command "kubectl get pods -n orders"

# Send local files (for example manifests) with the command
az aks command invoke -g rg-aks-prod -n aks-app-prod \\
  --command "kubectl apply -f deployment.yaml -n orders" --file deployment.yaml`,
      },
    ],
    diagrams: [
      {
        kind: 'decision',
        title: 'Reading a kubectl access error',
        caption: '401 means fix the login; Forbidden means fix the role.',
        question: 'What does kubectl return?',
        branches: [
          {
            condition: '401 Unauthorized',
            result: 'Fix the login',
            detail: 'Entra token missing or wrong; rerun kubelogin',
            tone: 'warning',
          },
          {
            condition: 'Error from server (Forbidden)',
            result: 'Fix the role',
            detail: 'Azure RBAC or RoleBinding for the namespace',
            tone: 'accent',
          },
          {
            condition: 'Timeout on a private cluster',
            result: 'Fix the network path or DNS',
            detail: 'Run from the VNet or use command invoke',
            tone: 'muted',
          },
        ],
      },
    ],
    followUps: [
      'Why do you disable local accounts in production?',
      'How would a pipeline deploy to a private AKS cluster?',
    ],
    tags: ['aks', 'entra id', 'kubelogin', 'rbac', 'private cluster'],
  },
  {
    id: 'itv-myfaq-218',
    level: 'advanced',
    kind: 'open',
    prompt: 'How do you integrate pipelines with AKS? How does your pipeline deploy to AKS?',
    probing:
      'Entra-based login via kubelogin, `helm upgrade --install --atomic`, a namespace-scoped role for the pipeline, and the separate AKS-to-ACR pull identity.',
    answer: [
      'The pipeline logs in to Azure, gets the cluster credentials, converts them for Entra ID login with `kubelogin`, and runs `helm upgrade --install`.',
      '- `--atomic` rolls the release back automatically if the deploy fails or times out.\n- The pipeline identity needs a Kubernetes role on the cluster. With **Azure RBAC for Kubernetes**, give **Azure Kubernetes Service RBAC Writer** scoped to the namespace, not cluster admin.',
    ],
    deeper: [
      'Azure DevOps also has built-in tasks that take an ARM service connection plus the resource group and cluster name, and get the credentials for you: `KubernetesManifest@1` (plain YAML) and `HelmDeploy@1` (Helm). I use the CLI approach because it is the same in every CI tool, which makes it easy to explain and debug.',
      'Two separate logins are involved: **pipeline -> AKS** (service connection) to deploy, and **AKS -> ACR** (AcrPull on the kubelet identity) to pull the image. The pipeline being able to push to ACR does not mean the cluster can pull.',
    ],
    code: [
      {
        title: 'Flow',
        language: 'text',
        code: `az login (service connection or OIDC)
-> az aks get-credentials
-> kubelogin convert-kubeconfig -l azurecli
-> helm upgrade --install --wait --atomic
-> kubectl rollout status`,
      },
      {
        title: 'Azure DevOps: deploy to AKS with Helm',
        language: 'yaml',
        code: `- task: AzureCLI@2
  displayName: Deploy to AKS with Helm
  inputs:
    azureSubscription: sc-azure-prod
    scriptType: bash
    scriptLocation: inlineScript
    inlineScript: |
      az aks get-credentials -g rg-aks-prod -n aks-app-prod --overwrite-existing
      kubelogin convert-kubeconfig -l azurecli
      helm upgrade --install orders-api ./charts/orders-api \\
        --namespace orders --create-namespace \\
        -f ./charts/orders-api/values-prod.yaml \\
        --set image.repository=myacrprod.azurecr.io/orders-api \\
        --set image.tag=$(Build.SourceVersion) \\
        --wait --timeout 10m --atomic
      kubectl -n orders rollout status deploy/orders-api`,
      },
      {
        title: 'Built-in HelmDeploy@1 task',
        language: 'yaml',
        code: `- task: HelmDeploy@1
  inputs:
    connectionType: Azure Resource Manager
    azureSubscription: sc-azure-prod
    azureResourceGroup: rg-aks-prod
    kubernetesCluster: aks-app-prod
    namespace: orders
    command: upgrade
    chartType: FilePath
    chartPath: charts/orders-api
    releaseName: orders-api
    install: true
    overrideValues: image.tag=$(Build.SourceVersion)`,
      },
    ],
    diagrams: [
      {
        kind: 'flow',
        title: 'Pipeline deploy to AKS',
        caption:
          'The pipeline identity deploys; the kubelet identity pulls. They are two different logins.',
        nodes: [
          { label: 'az login', detail: 'Service connection or OIDC' },
          { label: 'az aks get-credentials' },
          { label: 'kubelogin convert-kubeconfig', detail: 'Entra ID token for kubectl' },
          {
            label: 'helm upgrade --install',
            detail: '--wait --atomic',
            branch: { label: 'Fails: automatic rollback', tone: 'danger' },
          },
          { label: 'kubectl rollout status', tone: 'success' },
        ],
      },
    ],
    followUps: [
      'Which role does the pipeline identity need on the cluster, and at what scope?',
      'The pipeline pushed the image fine, but Pods show ImagePullBackOff. Why?',
    ],
    tags: ['aks', 'helm', 'azure devops', 'kubelogin'],
  },
  {
    id: 'itv-myfaq-219',
    level: 'advanced',
    kind: 'open',
    prompt: 'How did you integrate Jenkins with Kubernetes?',
    probing:
      'Separating the two integrations - agents as Pods versus deploying to a cluster - and building images without a Docker daemon.',
    answer: [
      'There are two separate integrations, and interviewers often mix them up:',
      '- **Jenkins agents run as Pods in Kubernetes** (the Kubernetes plugin). Each build gets a fresh Pod and the Pod is deleted after the build. No idle agent VMs.\n- **Jenkins deploys applications to Kubernetes** (kubectl or Helm from a pipeline stage).',
      'Setup for agents as Pods:',
      "- Install the **Kubernetes** plugin.\n- Manage Jenkins -> Clouds -> New cloud -> Kubernetes. Add the cluster URL, the namespace (for example `jenkins-agents`), and credentials. If the controller runs inside the same cluster, it can use its own service account.\n- Give the controller's service account a Role that can create and delete Pods in the agents namespace only.",
      'If Jenkins runs on a VM, store a kubeconfig as a **Secret file** credential and use it only in the deploy stage.',
    ],
    deeper: [
      '`az acr build` builds the image inside ACR, so the agent Pod needs no Docker daemon, no privileged mode, and no host Docker socket. (Kaniko was the usual answer for this, but Google archived it in 2025.)',
      'The `AZURE_CLIENT_ID`, `AZURE_TENANT_ID`, and `AZURE_FEDERATED_TOKEN_FILE` variables are injected by AKS Workload Identity. The managed identity needs **AcrPush** on the registry.',
      "The `helm` container uses the Pod's Kubernetes service account, so `jenkins-agent` needs a RoleBinding in the `orders` namespace.",
      "On Azure, a better option than a kubeconfig file is the VM's managed identity: `az login --identity`, then `az aks get-credentials` and `kubelogin convert-kubeconfig -l msi`. Then there is no kubeconfig file to protect.",
    ],
    code: [
      {
        title: 'Agents as Pods: flow',
        language: 'text',
        code: `Build is triggered
-> Jenkins controller asks the Kubernetes API for a new Pod
-> the Pod starts with the containers the build needs (jnlp agent, azure-cli, helm)
-> the build runs inside the Pod
-> the Pod is deleted`,
      },
      {
        title: 'Jenkinsfile with a Kubernetes Pod agent',
        language: 'text',
        code: `pipeline {
  agent {
    kubernetes {
      yaml '''
        apiVersion: v1
        kind: Pod
        metadata:
          labels:
            azure.workload.identity/use: "true"   # AKS Workload Identity injects an Azure token
        spec:
          serviceAccountName: jenkins-agent       # annotated with the managed identity client ID
          containers:
          - name: azcli
            image: mcr.microsoft.com/azure-cli:2.67.0
            command: ["sleep"]
            args: ["infinity"]
          - name: helm
            image: alpine/helm:3.16.4
            command: ["sleep"]
            args: ["infinity"]
      '''
    }
  }
  stages {
    stage('Build and push image') {
      steps {
        container('azcli') {
          sh '''
            az login --service-principal -u "$AZURE_CLIENT_ID" -t "$AZURE_TENANT_ID" \\
              --federated-token "$(cat $AZURE_FEDERATED_TOKEN_FILE)"
            az acr build --registry myacrprod --image orders-api:$GIT_COMMIT .
          '''
        }
      }
    }
    stage('Deploy') {
      steps {
        container('helm') {
          sh '''
            helm upgrade --install orders-api ./charts/orders-api -n orders \\
              --set image.tag=$GIT_COMMIT --wait --atomic
          '''
        }
      }
    }
  }
}`,
      },
      {
        title: 'Jenkins deploying to a cluster from outside',
        language: 'text',
        code: `stage('Deploy to AKS') {
  steps {
    withCredentials([file(credentialsId: 'aks-prod-kubeconfig', variable: 'KUBECONFIG')]) {
      sh 'kubectl -n orders set image deploy/orders-api app=myacrprod.azurecr.io/orders-api:$GIT_COMMIT'
      sh 'kubectl -n orders rollout status deploy/orders-api --timeout=5m'
    }
  }
}`,
      },
    ],
    diagrams: [
      {
        kind: 'flow',
        title: 'Jenkins agents as Kubernetes Pods',
        caption: 'Each build gets a fresh Pod that is deleted afterwards. No idle agent VMs.',
        nodes: [
          { label: 'Build is triggered' },
          { label: 'Controller asks Kubernetes API', detail: 'Create a Pod in jenkins-agents' },
          { label: 'Pod starts', detail: 'jnlp agent, azure-cli, helm containers' },
          { label: 'Build runs inside the Pod', tone: 'accent' },
          { label: 'Pod is deleted', tone: 'muted' },
        ],
      },
    ],
    followUps: [
      'How do you build a container image inside a Pod agent without a Docker socket?',
      'What permissions does the Jenkins controller need in the cluster?',
    ],
    tags: ['jenkins', 'kubernetes', 'aks', 'workload identity'],
  },
  {
    id: 'itv-myfaq-220',
    level: 'intermediate',
    kind: 'open',
    prompt: 'How do you integrate Helm with ACR?',
    probing:
      'Charts as OCI artifacts in the same registry, a short-lived token login, and push/install by `oci://` URL.',
    answer: [
      'ACR stores Helm charts as **OCI artifacts**, so images and charts live in one registry with the same access control.',
      'The all-zeros user name is the fixed user name ACR expects when you log in with an access token.',
    ],
    code: [
      {
        title: 'Log in, push, and install a chart from ACR',
        language: 'bash',
        code: `# Log in to ACR for Helm with a short-lived token
TOKEN=$(az acr login --name myacrprod --expose-token --output tsv --query accessToken)
helm registry login myacrprod.azurecr.io \\
  --username 00000000-0000-0000-0000-000000000000 --password "$TOKEN"

# Package and push the chart
helm package ./charts/orders-api --version 1.4.0
helm push orders-api-1.4.0.tgz oci://myacrprod.azurecr.io/helm

# Install from ACR
helm upgrade --install orders-api oci://myacrprod.azurecr.io/helm/orders-api \\
  --version 1.4.0 -n orders -f values-prod.yaml`,
      },
    ],
    tags: ['helm', 'acr', 'oci'],
  },
  {
    id: 'itv-myfaq-221',
    level: 'advanced',
    kind: 'open',
    prompt:
      'How do you deploy to App Service and Azure Functions from a pipeline? How have you used Web Apps, App Service, and Azure Functions in your CI/CD?',
    probing:
      'Build once and promote the same package, config outside the package, deployment slots for zero downtime, and managed identity for container pulls.',
    answer: [
      'Same idea as AKS: **build once, deploy the same package everywhere**. CI builds and tests the code and publishes a zip or JAR as an artifact. CD deploys that artifact to each environment through an ARM service connection. Only the app settings change per environment.',
      'In GitHub Actions the same steps are `azure/login` (OIDC), then `azure/webapps-deploy@v3` or `Azure/functions-action@v1`.',
      '- **Config stays out of the package.** App settings per environment, secrets as Key Vault references, so the same zip works in dev and prod.\n- **Slots give zero downtime and easy rollback.** Warm up the staging slot, swap, and swap back if something breaks.',
    ],
    deeper: [
      "Mark settings that must not move (like the slot's own connection strings) as **deployment slot settings**.",
      'If the app runs as a **container** on App Service, the pipeline pushes the image to ACR and updates the image tag. The app pulls with its managed identity (AcrPull, `acrUseManagedIdentityCreds`), not with the ACR admin user.',
      "The Function's code deploy does not change its **triggers**. The trigger (HTTP, timer, Service Bus, Blob) starts each run; the pipeline only ships new code and settings.",
    ],
    code: [
      {
        title: 'Flow',
        language: 'text',
        code: `Push to main
-> CI: build, unit tests, SonarQube, package (zip/JAR), publish artifact
-> Deploy to Dev  -> Deploy to QA -> approval on "prod" environment
-> Prod: deploy to the "staging" slot -> health check -> swap with production
-> check Application Insights for errors after the swap`,
      },
      {
        title: 'Azure DevOps: Web App slot swap and Function App',
        language: 'yaml',
        code: `# Web App (App Service): deploy to the staging slot, then swap
- task: AzureWebApp@1
  inputs:
    azureSubscription: sc-azure-prod
    appType: webAppLinux
    appName: app-orders-prod
    deployToSlotOrASE: true
    resourceGroupName: rg-app-prod
    slotName: staging
    package: $(Pipeline.Workspace)/drop/orders-api.jar

- task: AzureAppServiceManage@0
  inputs:
    azureSubscription: sc-azure-prod
    Action: Swap Slots
    WebAppName: app-orders-prod
    ResourceGroupName: rg-app-prod
    SourceSlot: staging

# Function App
- task: AzureFunctionApp@2
  inputs:
    azureSubscription: sc-azure-prod
    appType: functionAppLinux
    appName: func-docs-prod
    package: $(Pipeline.Workspace)/drop/function.zip`,
      },
    ],
    diagrams: [
      {
        kind: 'flow',
        title: 'App Service release with a staging slot',
        caption:
          'The same package goes everywhere; the slot swap gives zero downtime and a quick swap back.',
        nodes: [
          { label: 'CI builds once', detail: 'Tests, SonarQube, zip or JAR artifact' },
          { label: 'Deploy to Dev, then QA' },
          { label: 'Approval on prod', tone: 'warning' },
          {
            label: 'Deploy to staging slot',
            detail: 'Health check before the swap',
            branch: { label: 'Unhealthy: do not swap', tone: 'danger' },
          },
          { label: 'Swap with production', tone: 'success' },
          { label: 'Check Application Insights' },
        ],
      },
    ],
    followUps: [
      'Which settings would you mark as deployment slot settings, and why?',
      'How does a containerized App Service pull from ACR without the admin user?',
    ],
    tags: ['app service', 'azure functions', 'deployment slots', 'ci/cd'],
  },
  {
    id: 'itv-myfaq-222',
    level: 'intermediate',
    kind: 'open',
    prompt: 'Where does each security scanner fit in your pipeline?',
    probing:
      'The order of the gates from pull request to deploy, and that every gate must fail the pipeline, not just write a report.',
    answer: [
      'On the pull request: a secret scan (no passwords or keys in the code), SonarQube (code quality, bugs, code vulnerabilities, coverage), a dependency scan (known CVEs in libraries), and Checkov (misconfigurations in Terraform, Bicep, Dockerfile, Kubernetes YAML).',
      'At build: Docker build, then a Trivy image scan (CVEs in the OS packages and libraries inside the image), and push to ACR only if all gates pass. At deploy: Azure Policy - Azure blocks non-compliant resources even if the pipeline missed them.',
      'Each tool **fails the pipeline** when its gate fails. A scan that only writes a report does not stop anything.',
    ],
    code: [
      {
        title: 'Where each scanner fits',
        language: 'text',
        code: `Pull request
-> secret scan            (no passwords or keys in the code)
-> SonarQube              (code quality, bugs, code vulnerabilities, coverage)
-> dependency scan        (known CVEs in libraries)
-> Checkov                (misconfigurations in Terraform, Bicep, Dockerfile, Kubernetes YAML)
Build
-> Docker build
-> Trivy image scan       (CVEs in the OS packages and libraries inside the image)
-> push to ACR only if all gates pass
Deploy
-> Azure Policy           (Azure blocks non-compliant resources even if the pipeline missed them)`,
      },
    ],
    diagrams: [
      {
        kind: 'flow',
        title: 'Security gates from PR to deploy',
        caption: 'Every gate fails the pipeline. A report nobody reads stops nothing.',
        nodes: [
          { label: 'Secret scan', detail: 'No passwords or keys in the code' },
          { label: 'SonarQube', detail: 'Quality, bugs, coverage' },
          { label: 'Dependency scan and Checkov', detail: 'Library CVEs, IaC misconfigurations' },
          { label: 'Docker build' },
          {
            label: 'Trivy image scan',
            branch: { label: 'Gate fails: no push', tone: 'danger' },
          },
          { label: 'Push to ACR', tone: 'success' },
          { label: 'Azure Policy at deploy', detail: 'Last safety net in Azure' },
        ],
      },
    ],
    tags: ['security', 'devsecops', 'scanning', 'ci/cd'],
  },
  {
    id: 'itv-myfaq-223',
    level: 'intermediate',
    kind: 'open',
    prompt: 'How did you integrate SonarQube, and how does the quality gate stop a bad build?',
    probing:
      'That the pipeline waits for the quality gate result and fails on it, the correct task order, and the Jenkins webhook.',
    answer: [
      'The pipeline runs the scanner, sends the results to the SonarQube server, then **waits for the quality gate** result. If the gate fails, the pipeline fails.',
      'In Azure DevOps I install the SonarQube extension and create a **SonarQube service connection** with a token. Order matters: **Prepare -> build and test -> Analyze -> Publish**. `SonarQubePrepare` must run **before** the build, because it sets up the scanner. For Maven or Gradle use `scannerMode: other` (the Maven/Gradle task runs the analysis); for .NET use `scannerMode: dotnet`; for everything else use `cli`. To block the pull request, add the SonarQube result as a **status check** in the branch policy.',
      'In Jenkins, add the server under Manage Jenkins -> System -> SonarQube servers, and add a **webhook** in SonarQube that points to `https://<jenkins>/sonarqube-webhook/`. Without the webhook, `waitForQualityGate` waits until the timeout.',
      'In GitHub Actions and GitLab CI, `sonar.qualitygate.wait=true` makes the scanner itself wait and fail when the gate fails.',
    ],
    code: [
      {
        title: 'Flow',
        language: 'text',
        code: `Pipeline runs tests with coverage
-> scanner sends code and coverage to SonarQube
-> SonarQube checks the quality gate (for example: no new critical issues, coverage on new code >= 80%)
-> pipeline waits for the result
-> gate failed = pipeline fails, pull request cannot merge`,
      },
      {
        title: 'Azure DevOps',
        language: 'yaml',
        code: `- task: SonarQubePrepare@7
  inputs:
    SonarQube: sc-sonarqube
    scannerMode: cli
    configMode: manual
    cliProjectKey: orders-api
    cliSources: src
- script: dotnet test --collect:"XPlat Code Coverage"
- task: SonarQubeAnalyze@7
- task: SonarQubePublish@7
  inputs:
    pollingTimeoutSec: '300'`,
      },
      {
        title: 'Jenkins',
        language: 'text',
        code: `stage('SonarQube') {
  steps {
    withSonarQubeEnv('sonarqube') {
      sh 'mvn -B verify sonar:sonar -Dsonar.projectKey=orders-api'
    }
  }
}
stage('Quality gate') {
  steps {
    timeout(time: 10, unit: 'MINUTES') {
      waitForQualityGate abortPipeline: true
    }
  }
}`,
      },
      {
        title: 'GitHub Actions',
        language: 'yaml',
        code: `# GitHub Actions
- uses: SonarSource/sonarqube-scan-action@v5
  env:
    SONAR_TOKEN: \${{ secrets.SONAR_TOKEN }}
    SONAR_HOST_URL: \${{ vars.SONAR_HOST_URL }}
  with:
    args: -Dsonar.qualitygate.wait=true`,
      },
      {
        title: 'GitLab CI',
        language: 'yaml',
        code: `# GitLab CI
sonarqube:
  image: sonarsource/sonar-scanner-cli:latest
  script:
    - sonar-scanner -Dsonar.qualitygate.wait=true
  variables:
    SONAR_TOKEN: $SONAR_TOKEN
    SONAR_HOST_URL: $SONAR_HOST_URL`,
      },
    ],
    traps: [
      'Running `SonarQubePrepare` after the build - the scanner is not set up, so the analysis misses the build output.',
      'Forgetting the SonarQube webhook to Jenkins, so `waitForQualityGate` hangs until the timeout.',
    ],
    followUps: ['How do you make a failed quality gate block the pull request merge?'],
    tags: ['sonarqube', 'quality gate', 'azure devops', 'jenkins'],
  },
  {
    id: 'itv-myfaq-224',
    level: 'intermediate',
    kind: 'open',
    prompt:
      'How do you integrate Trivy with pipelines? How does Trivy stop a vulnerable image from reaching production?',
    probing:
      'Scanning after build and before push with `--exit-code 1`, handling accepted risks, pinning the scanner, and rescanning what runs.',
    answer: [
      'Trivy scans the image after the build and **before the push**. `--exit-code 1` makes the step fail when it finds HIGH or CRITICAL issues, so the image never reaches ACR.',
      '- `--ignore-unfixed` skips CVEs that have no fixed version yet, so the team is not blocked by things they cannot fix.\n- Accepted risks go in a `.trivyignore` file with the CVE ID, a reason, and an expiry date, reviewed in a pull request.\n- Trivy can also scan the repository (`trivy fs .`) for vulnerable dependencies and secrets, and IaC files (`trivy config .`).\n- Write a report for the pipeline: `--format sarif -o trivy.sarif` (GitHub code scanning) or `--format template --template "@contrib/junit.tpl"` (Azure DevOps and GitLab test results).',
      'The same commands work in every CI tool. Only the step syntax changes. In Azure DevOps, Trivy runs from its official image (pinned version), so nothing is installed on the agent.',
      '- **Pin the Trivy version** (image tag or digest), never `latest`. Security tools are supply-chain targets too.\n- The Docker socket mount lets Trivy scan the image that was just built on the agent, before it is pushed.\n- To scan an image that is already in ACR, Trivy uses the Docker login, so run `az acr login` first.\n- Scanning at build time is not enough. New CVEs appear every day, so I also rescan what is running: **Defender for Containers** scans ACR and the cluster, or the **Trivy Operator** scans workloads inside AKS.',
    ],
    code: [
      {
        title: 'Scan before push',
        language: 'bash',
        code: `docker build -t myacrprod.azurecr.io/orders-api:$TAG .

trivy image \\
  --severity HIGH,CRITICAL \\
  --ignore-unfixed \\
  --exit-code 1 \\
  myacrprod.azurecr.io/orders-api:$TAG

docker push myacrprod.azurecr.io/orders-api:$TAG`,
      },
      {
        title: 'Azure DevOps example',
        language: 'yaml',
        code: `- task: Cache@2                       # reuse the vulnerability DB between runs
  inputs:
    key: trivy-db | "$(Agent.OS)"
    path: $(Pipeline.Workspace)/.trivycache

- script: |
    docker run --rm \\
      -v /var/run/docker.sock:/var/run/docker.sock \\
      -v $(Pipeline.Workspace)/.trivycache:/root/.cache/trivy \\
      -v $(Build.SourcesDirectory):/out \\
      aquasec/trivy:0.58.1 image \\
        --severity HIGH,CRITICAL --ignore-unfixed --exit-code 1 \\
        --format template --template "@contrib/junit.tpl" -o /out/trivy-junit.xml \\
        myacrprod.azurecr.io/orders-api:$(Build.SourceVersion)
  displayName: Trivy image scan (before push)

- task: PublishTestResults@2           # findings show in the Tests tab
  condition: always()
  inputs:
    testResultsFormat: JUnit
    testResultsFiles: trivy-junit.xml`,
      },
    ],
    tags: ['trivy', 'container security', 'azure devops'],
  },
  {
    id: 'itv-myfaq-225',
    level: 'intermediate',
    kind: 'open',
    prompt:
      'How do you integrate Checkov with Terraform and Bicep? How do you stop insecure infrastructure code from being deployed?',
    probing:
      'Scanning IaC in the PR and failing it, why the plan scan is more accurate, and skipping only with a written reason.',
    answer: [
      'Checkov scans the IaC in the pull request. It finds problems such as a public storage account, a missing NSG, or Key Vault without purge protection, and fails the pipeline.',
      '- Scanning the **plan** is more accurate than scanning the source, because values from variables and modules are resolved.\n- To accept a finding, add a comment with the reason next to the resource.\n- Output for the pipeline UI: `-o junitxml` or `-o sarif`.',
    ],
    code: [
      {
        title: 'Checkov scans',
        language: 'bash',
        code: `# Scan Terraform source
checkov -d infra/ --framework terraform --quiet --compact

# Scan the Terraform plan (sees the final values after variables and modules)
terraform plan -out=tfplan
terraform show -json tfplan > tfplan.json
checkov -f tfplan.json --framework terraform_plan

# Scan Bicep
checkov -d bicep/ --framework bicep

# Scan Dockerfiles and Kubernetes manifests
checkov -d . --framework dockerfile,kubernetes,helm`,
      },
      {
        title: 'Accept a finding with a reason',
        language: 'hcl',
        code: `resource "azurerm_storage_account" "logs" {
  #checkov:skip=CKV_AZURE_33:Queue logging not needed, this account has no queues
  # ...
}`,
      },
    ],
    tags: ['checkov', 'terraform', 'bicep', 'iac security'],
  },
  {
    id: 'itv-myfaq-226',
    level: 'advanced',
    kind: 'open',
    prompt:
      'Instead of SonarQube and Trivy, which commercial scanners could you use, and how do they plug into pipelines?',
    probing:
      'Grouping tools by type of check (SAST, SCA, image, IaC, DAST), the common integration pattern, and honesty about hands-on experience.',
    answer: [
      'I group them by the **type of check**, because that tells you where they go in the pipeline:',
      "- **SAST (our code):** open source I used - SonarQube; commercial - Checkmarx One, Veracode, Coverity, GitHub Advanced Security (CodeQL).\n- **SCA (libraries):** Trivy fs, OWASP Dependency-Check; commercial - Snyk Open Source, Mend.io, Black Duck, JFrog Xray.\n- **Container image:** Trivy; commercial - Snyk Container, Prisma Cloud, Aqua, JFrog Xray, Defender for Containers.\n- **IaC:** Checkov, Trivy config; commercial - Prisma Cloud (Checkov's commercial version), Snyk IaC, Wiz.\n- **DAST (running app):** OWASP ZAP; commercial - Veracode DAST, Invicti, Burp Suite Enterprise.",
      "The integration pattern is always the same: install the marketplace extension or CLI, create a service connection (or Key Vault secret) with the tool's API token, add the scan task in the right stage, set a severity threshold and fail the build when it is crossed, and results go to the tool's central dashboard.",
    ],
    deeper: [
      'These are not one-to-one swaps. SonarQube is mostly **code quality** (bugs, smells, coverage); Checkmarx and Veracode are mostly **security**. Many teams keep SonarQube and add a commercial security tool.',
      'What you pay for: one dashboard across all projects, central policies, support, and reports for audits.',
      'Only claim hands-on experience with the tools you really used. Say the others are tools you know how to plug in.',
    ],
    code: [
      {
        title: 'Integration pattern',
        language: 'text',
        code: `Install the marketplace extension or CLI
-> create a service connection (or Key Vault secret) with the tool's API token
-> add the scan task in the right stage
-> set a severity threshold and fail the build when it is crossed
-> results go to the tool's central dashboard`,
      },
      {
        title: 'Snyk and GitHub Advanced Security in Azure DevOps',
        language: 'yaml',
        code: `# Snyk in Azure DevOps
- task: SnykSecurityScan@1
  inputs:
    serviceConnectionEndpoint: sc-snyk
    testType: container
    dockerImageName: myacrprod.azurecr.io/orders-api:$(Build.SourceVersion)
    severityThreshold: high
    failOnIssues: true

# GitHub Advanced Security for Azure DevOps
- task: AdvancedSecurity-Codeql-Init@1
  inputs:
    languages: java
- task: AdvancedSecurity-Codeql-Autobuild@1
- task: AdvancedSecurity-Dependency-Scanning@1
- task: AdvancedSecurity-Codeql-Analyze@1`,
      },
    ],
    followUps: ['Would you replace SonarQube with Checkmarx, or run both? Why?'],
    tags: ['security', 'sast', 'sca', 'snyk', 'devsecops'],
  },
  {
    id: 'itv-myfaq-227',
    level: 'basic',
    kind: 'open',
    prompt: 'How do you integrate secret scanning with pipelines and Git?',
    probing:
      'Two layers - block the push and scan in the pipeline - and that a leaked secret must be rotated, not just deleted.',
    answer: [
      'Secret scanning works in two layers:',
      '- **Block the push:** GitHub push protection, GitLab secret push protection, or GitHub Advanced Security for Azure DevOps stop a commit that contains a secret.\n- **Scan in the pipeline:** a scanner such as Gitleaks or `trivy fs --scanners secret .` fails the build if a secret is found.',
      'If a secret does leak, deleting the commit is not enough. **Rotate the secret first**, because it is already in the Git history and maybe in clones and logs.',
    ],
    code: [
      {
        title: 'Gitleaks in the pipeline',
        language: 'bash',
        code: `gitleaks detect --source . --redact --exit-code 1`,
      },
    ],
    traps: [
      'Deleting the commit or rewriting history and calling it fixed, without rotating the leaked secret.',
    ],
    tags: ['secret scanning', 'git', 'security'],
  },
  {
    id: 'itv-myfaq-228',
    level: 'advanced',
    kind: 'open',
    prompt:
      'Your pipelines already have Checkov. Why also Azure Policy, and how do you integrate it with your pipelines?',
    probing:
      'That Checkov only sees pipeline code while Policy sees every ARM request, the policy effects, and an Audit-then-Deny rollout.',
    answer: [
      'Checkov checks code **before** deploy, only for code that goes through the pipeline. Azure Policy checks **every** request to Azure, including portal clicks and scripts. It is the last safety net.',
      'The pipeline deploys Terraform/Bicep, Azure Resource Manager receives the request, and Azure Policy evaluates it. The effect is Deny (request fails), Audit (allowed but marked non-compliant), or Modify or DeployIfNotExists (fixes it).',
      'Example: assign the built-in policy that denies storage accounts with public network access.',
    ],
    deeper: [
      'Roll out new policies with **Audit** first, fix what is non-compliant, then switch to **Deny**.',
      'When a deploy fails with `RequestDisallowedByPolicy`, the error names the policy assignment. Fix the code, or ask for an exemption with a reason and an expiry date.',
      'Policies can be kept as code (Bicep or Terraform) and deployed by a pipeline, like everything else.',
    ],
    code: [
      {
        title: 'Flow',
        language: 'text',
        code: `Pipeline deploys Terraform/Bicep
-> Azure Resource Manager receives the request
-> Azure Policy evaluates it
-> effect: Deny (request fails), Audit (allowed but marked non-compliant), Modify or DeployIfNotExists (fixes it)`,
      },
      {
        title: 'Assign a deny policy',
        language: 'bash',
        code: `az policy assignment create \\
  --name deny-public-storage \\
  --scope /subscriptions/<sub-id>/resourceGroups/rg-app-prod \\
  --policy "<policy-definition-id>" \\
  --params '{"effect": {"value": "Deny"}}'`,
      },
    ],
    diagrams: [
      {
        kind: 'decision',
        title: 'Azure Policy effects on a request',
        caption:
          'Policy evaluates every ARM request, from pipelines, portal clicks, and scripts alike.',
        question: 'Which policy effect applies?',
        branches: [
          {
            condition: 'Deny',
            result: 'Request fails',
            detail: 'RequestDisallowedByPolicy',
            tone: 'danger',
          },
          { condition: 'Audit', result: 'Allowed, marked non-compliant', tone: 'warning' },
          {
            condition: 'Modify or DeployIfNotExists',
            result: 'Azure fixes the resource',
            tone: 'success',
          },
        ],
      },
    ],
    followUps: [
      'A deploy fails with RequestDisallowedByPolicy. What do you do?',
      'How do you roll out a new Deny policy without breaking teams?',
    ],
    tags: ['azure policy', 'checkov', 'governance'],
  },
  {
    id: 'itv-myfaq-229',
    level: 'intermediate',
    kind: 'open',
    prompt:
      'How do your applications use a Managed Identity to connect to Storage, Key Vault, or Service Bus without a password?',
    probing:
      '`DefaultAzureCredential`, the right data-plane role per target, and knowing system- vs user-assigned identity.',
    answer: [
      "The app runs with a **managed identity**. I give that identity an RBAC role on the target resource. In code, the Azure SDK's `DefaultAzureCredential` finds the identity automatically.",
      'The common scenario "keep the database connection string safe" is the same flow with Key Vault in the middle. On App Service I do not even need this code: a Key Vault reference in the app settings does it. The best answer goes one step further: with **Entra ID login to PostgreSQL**, the managed identity\'s token is the password, so there is no connection-string secret left to protect.',
      'Common roles for the managed identity:',
      '- **Key Vault secrets:** Key Vault Secrets User.\n- **Blob Storage:** Storage Blob Data Reader / Contributor.\n- **Service Bus:** Azure Service Bus Data Sender / Receiver.\n- **ACR:** AcrPull / AcrPush.\n- **PostgreSQL:** Entra ID admin, or a database role mapped to the identity.',
      '- **System-assigned:** lives and dies with the resource. **User-assigned:** a separate resource that can be shared and created before the app.\n- Data-plane roles (like Storage Blob Data Reader) are different from management roles (like Contributor). Contributor alone cannot read blob data with Entra ID login.',
    ],
    code: [
      {
        title: 'Token flow',
        language: 'text',
        code: `App (App Service, Function, VM, or AKS Pod)
-> asks the local identity endpoint for a token
-> Entra ID returns a token for the managed identity
-> app calls Storage / Key Vault / Service Bus with the token
-> the service checks the RBAC role`,
      },
      {
        title: 'Blob Storage with DefaultAzureCredential',
        language: 'python',
        code: `from azure.identity import DefaultAzureCredential
from azure.storage.blob import BlobServiceClient

credential = DefaultAzureCredential()   # managed identity in Azure, az login on a laptop
blob = BlobServiceClient("https://stdocsprod.blob.core.windows.net", credential=credential)`,
      },
      {
        title: 'Read a connection string from Key Vault',
        language: 'python',
        code: `from azure.identity import DefaultAzureCredential
from azure.keyvault.secrets import SecretClient

kv = SecretClient("https://kv-app-prod.vault.azure.net", DefaultAzureCredential())
conn_str = kv.get_secret("postgres-connection-string").value   # read at startup, cached, refreshed on rotation`,
      },
    ],
    diagrams: [
      {
        kind: 'sequence',
        title: 'Managed identity token flow',
        caption:
          'No password in the app: the identity endpoint hands out a token and the target checks RBAC.',
        participants: [
          { id: 'app', label: 'App' },
          { id: 'imds', label: 'Identity endpoint' },
          { id: 'entra', label: 'Entra ID' },
          { id: 'svc', label: 'Storage or Key Vault' },
        ],
        messages: [
          { from: 'app', to: 'imds', label: 'Ask for a token' },
          { from: 'imds', to: 'entra', label: 'Token for managed identity' },
          { from: 'entra', to: 'app', label: 'Access token', kind: 'return' },
          { from: 'app', to: 'svc', label: 'Call with the token' },
          { from: 'svc', to: 'app', label: 'Allowed if RBAC role matches', kind: 'return' },
        ],
      },
    ],
    traps: [
      'Giving the identity Contributor and expecting it to read blob data. Data access needs a data-plane role.',
    ],
    tags: ['managed identity', 'rbac', 'key vault', 'storage', 'service bus'],
  },
  {
    id: 'itv-myfaq-230',
    level: 'advanced',
    kind: 'open',
    prompt:
      'How do you integrate AKS with Key Vault? How do Pods in AKS read secrets from Key Vault?',
    probing:
      'The Key Vault Secrets Provider add-on with Workload Identity, the federated credential subject, rotation behaviour, and how to debug a Pod stuck in ContainerCreating.',
    answer: [
      'With the **Key Vault Secrets Provider** add-on (Secrets Store CSI driver) and **AKS Workload Identity**. The secret is mounted into the Pod as a file, and can also be synced to a Kubernetes Secret for environment variables.',
      'In the Deployment: add the label `azure.workload.identity/use: "true"` to the Pod template, set `serviceAccountName: orders-api`, and mount a CSI volume with `secretProviderClass: orders-api-kv`.',
      'If the secret cannot be read, the Pod stays in **`ContainerCreating`** and `kubectl describe pod` shows the mount error. Check the role, the federated credential subject (namespace and service account name), and the Key Vault name.',
    ],
    deeper: [
      'The secret is read when the Pod **starts**. Turn on rotation (`--enable-secret-rotation`) and make the app re-read the file, or restart the Pods after a rotation.',
      'If the app needs an **environment variable**, add `secretObjects` to the `SecretProviderClass`. The driver then also creates a Kubernetes Secret (it exists only while a Pod mounts the volume). Environment variables change only after a Pod restart, and the value is now also in etcd, so the mounted file is better.',
      'If Key Vault has public access turned off, it needs a private endpoint and the `privatelink.vaultcore.azure.net` DNS zone linked to the AKS VNet.',
      'Workload Identity replaced the old **AAD Pod Identity**, which is retired.',
    ],
    code: [
      {
        title: 'Flow',
        language: 'text',
        code: `Pod starts with a service account
-> the service account is linked to a managed identity (federated credential)
-> the CSI driver gets a token for that identity
-> the CSI driver reads the secret from Key Vault
-> the secret is mounted as a file in the Pod`,
      },
      {
        title: 'Setup',
        language: 'bash',
        code: `# 1. Turn on the add-on, OIDC issuer, and Workload Identity
az aks enable-addons -g rg-aks-prod -n aks-app-prod --addons azure-keyvault-secrets-provider
az aks update -g rg-aks-prod -n aks-app-prod --enable-oidc-issuer --enable-workload-identity

# 2. Create an identity and let it read secrets
az identity create -g rg-aks-prod -n id-orders-api
az role assignment create --role "Key Vault Secrets User" \\
  --assignee "<identity-principal-id>" --scope "<key-vault-resource-id>"

# 3. Trust the Kubernetes service account
ISSUER=$(az aks show -g rg-aks-prod -n aks-app-prod --query oidcIssuerProfile.issuerUrl -o tsv)
az identity federated-credential create -g rg-aks-prod --identity-name id-orders-api \\
  --name orders-api-sa --issuer "$ISSUER" \\
  --subject system:serviceaccount:orders:orders-api \\
  --audience api://AzureADTokenExchange`,
      },
      {
        title: 'ServiceAccount and SecretProviderClass',
        language: 'yaml',
        code: `apiVersion: v1
kind: ServiceAccount
metadata:
  name: orders-api
  namespace: orders
  annotations:
    azure.workload.identity/client-id: "<identity-client-id>"
---
apiVersion: secrets-store.csi.x-k8s.io/v1
kind: SecretProviderClass
metadata:
  name: orders-api-kv
  namespace: orders
spec:
  provider: azure
  parameters:
    clientID: "<identity-client-id>"
    keyvaultName: kv-app-prod
    tenantId: "<tenant-id>"
    objects: |
      array:
        - |
          objectName: postgres-password
          objectType: secret`,
      },
    ],
    diagrams: [
      {
        kind: 'flow',
        title: 'Key Vault secret into an AKS Pod',
        caption:
          'Workload Identity gives the CSI driver a token; the secret arrives as a mounted file.',
        nodes: [
          { label: 'Pod starts with a service account' },
          { label: 'Service account linked to identity', detail: 'Federated credential' },
          { label: 'CSI driver gets a token' },
          {
            label: 'CSI driver reads Key Vault',
            branch: { label: 'Fails: Pod stuck in ContainerCreating', tone: 'danger' },
          },
          { label: 'Secret mounted as a file', tone: 'success' },
        ],
      },
    ],
    followUps: [
      'The Pod is stuck in ContainerCreating with a mount error. What do you check?',
      'Why prefer the mounted file over a synced environment variable?',
    ],
    tags: ['aks', 'key vault', 'workload identity', 'csi driver'],
  },
  {
    id: 'itv-myfaq-231',
    level: 'intermediate',
    kind: 'open',
    prompt: 'How do you integrate App Service and Azure Functions with Key Vault?',
    probing:
      'Key Vault references in app settings, the managed identity role, what a failed reference looks like, and version refresh.',
    answer: [
      "With **Key Vault references** in app settings. The app reads a normal environment variable; App Service fetches the value from Key Vault using the app's managed identity.",
      "- The app's managed identity needs **Key Vault Secrets User**.\n- If the reference fails, the portal shows the setting with a red error and the app gets the literal `@Microsoft.KeyVault(...)` text. Check the identity, the role, and Key Vault networking.\n- With no version in the URI, App Service picks up a new secret version within about a day, or right away after a restart.",
    ],
    code: [
      {
        title: 'App setting',
        language: 'text',
        code: `App setting:  DB_PASSWORD = @Microsoft.KeyVault(SecretUri=https://kv-app-prod.vault.azure.net/secrets/postgres-password/)`,
      },
      {
        title: 'Set a Key Vault reference',
        language: 'bash',
        code: `az webapp config appsettings set -g rg-app-prod -n app-orders-prod --settings \\
  "DB_PASSWORD=@Microsoft.KeyVault(VaultName=kv-app-prod;SecretName=postgres-password)"`,
      },
    ],
    tags: ['app service', 'azure functions', 'key vault'],
  },
  {
    id: 'itv-myfaq-232',
    level: 'basic',
    kind: 'open',
    prompt: 'How do you integrate Azure DevOps with Key Vault?',
    probing:
      'A Key Vault-linked variable group or the `AzureKeyVault@2` task, and mapping secret variables into `env` explicitly.',
    answer: [
      'There are two ways to do it:',
      '- **Variable group linked to Key Vault:** Library -> Variable group -> "Link secrets from an Azure key vault". Pipelines read the secrets as variables, and they are masked in logs.\n- **`AzureKeyVault@2` task:** fetches selected secrets at run time.',
      'Secret variables are not passed to scripts automatically. Map them with `env:`.',
      'In GitHub Actions, the same idea is `azure/login` followed by `az keyvault secret show`, and then `::add-mask::` so the value is hidden in logs.',
    ],
    code: [
      {
        title: 'AzureKeyVault@2 task',
        language: 'yaml',
        code: `- task: AzureKeyVault@2
  inputs:
    azureSubscription: sc-azure-prod
    KeyVaultName: kv-app-prod
    SecretsFilter: 'postgres-password,sonar-token'
    RunAsPreJob: false
- script: ./migrate.sh
  env:
    DB_PASSWORD: $(postgres-password)     # secrets must be mapped into env explicitly`,
      },
    ],
    tags: ['azure devops', 'key vault', 'secrets'],
  },
  {
    id: 'itv-myfaq-233',
    level: 'intermediate',
    kind: 'open',
    prompt:
      'How do you integrate Jenkins with Key Vault? Where do your Jenkins pipelines keep their secrets?',
    probing:
      'Jenkins Credentials for small secrets, Key Vault for production secrets read with the agent identity, and masking pitfalls.',
    answer: [
      'Never in the Jenkinsfile or Git. Small, Jenkins-only secrets go in the **Jenkins Credentials** store and are used with `withCredentials`, which masks them in the console log. Production secrets stay in **Key Vault**, and Jenkins reads them at run time with its own Azure identity.',
      '- With the plain CLI, Jenkins does not know the value, so it **cannot mask it**. Do not `echo` it and do not use `set -x`. The plugin masks values for you.\n- The Key Vault plugin can also show Key Vault secrets as normal Jenkins credentials, so existing `withCredentials` code keeps working.\n- Jenkins Credentials are encrypted with keys in `$JENKINS_HOME/secrets`. Anyone with admin access or a full backup of Jenkins home can decrypt them, which is one more reason to keep the important secrets in Key Vault.',
    ],
    code: [
      {
        title: 'Flow',
        language: 'text',
        code: `Jenkins agent (Azure VM with managed identity, or AKS Pod with Workload Identity)
-> gets an Azure token (no secret stored in Jenkins)
-> reads the secret from Key Vault (Key Vault Secrets User role)
-> uses it in one stage, masked in the log`,
      },
      {
        title: 'Two ways to read Key Vault from Jenkins',
        language: 'text',
        code: `// 1. Azure Key Vault plugin: Key Vault URL and an Azure credential (for example
//    a managed identity credential) are set once under Manage Jenkins
withAzureKeyvault([[secretType: 'Secret', name: 'postgres-password', envVariable: 'DB_PASSWORD']]) {
  sh './migrate.sh'
}

// 2. Plain Azure CLI with the agent's managed identity
sh '''
  az login --identity --username "$AZURE_CLIENT_ID" > /dev/null
  DB_PASSWORD=$(az keyvault secret show --vault-name kv-app-prod -n postgres-password --query value -o tsv)
  ./migrate.sh
'''`,
      },
    ],
    traps: [
      'Reading a secret with plain `az` and then running with `set -x` - Jenkins cannot mask a value it does not know.',
    ],
    tags: ['jenkins', 'key vault', 'secrets'],
  },
  {
    id: 'itv-myfaq-234',
    level: 'basic',
    kind: 'open',
    prompt: 'How do you integrate AKS with ACR? How does AKS pull images from a private ACR?',
    probing:
      '`--attach-acr` granting AcrPull to the kubelet identity, and telling a 401 from a network/403 pull error.',
    answer: [
      "I attach the registry to the cluster. That gives the cluster's **kubelet identity** the **AcrPull** role on the registry. No image pull secret is needed.",
      'If a Pod shows `ImagePullBackOff` with `401 Unauthorized`, check the AcrPull role. If it shows a network or `403` error, check ACR network rules or the private endpoint DNS (`privatelink.azurecr.io`).',
    ],
    code: [
      {
        title: 'Attach ACR and check the pull',
        language: 'bash',
        code: `az aks update -g rg-aks-prod -n aks-app-prod --attach-acr myacrprod

# Check that the cluster can pull
az aks check-acr -g rg-aks-prod -n aks-app-prod --acr myacrprod.azurecr.io`,
      },
    ],
    tags: ['aks', 'acr', 'acrpull'],
  },
  {
    id: 'itv-myfaq-235',
    level: 'advanced',
    kind: 'open',
    prompt:
      'How do you integrate AKS with Application Gateway? How does traffic from the internet reach your Pods?',
    probing:
      'AGIC turning Ingress objects into gateway config that targets Pod IPs, WAF rollout, and awareness of Application Gateway for Containers.',
    answer: [
      'Through **Application Gateway with WAF** in front of AKS. The **Application Gateway Ingress Controller (AGIC)** watches Kubernetes Ingress objects and updates the Application Gateway configuration to send traffic straight to Pod IPs.',
      'User -> Application Gateway (public IP, TLS, WAF rules) -> AGIC turned the Ingress rules into listeners, rules, and backend pools -> Pod IPs in AKS.',
    ],
    deeper: [
      'The Application Gateway needs a network path to the Pod IPs (same VNet or peered VNets).',
      "Microsoft's newer option is **Application Gateway for Containers**, which uses the Kubernetes Gateway API. Know the name, and that AGIC is the older, widely used option.",
      'WAF runs in **Detection** mode first, then **Prevention** after you tune false positives.',
    ],
    code: [
      {
        title: 'Traffic path',
        language: 'text',
        code: `User
-> Application Gateway (public IP, TLS, WAF rules)
-> AGIC turned the Ingress rules into listeners, rules, and backend pools
-> Pod IPs in AKS`,
      },
      {
        title: 'Enable the AGIC add-on',
        language: 'bash',
        code: `az aks enable-addons -g rg-aks-prod -n aks-app-prod \\
  --addons ingress-appgw --appgw-id "<application-gateway-resource-id>"`,
      },
      {
        title: 'Ingress for AGIC',
        language: 'yaml',
        code: `apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: orders-api
  namespace: orders
  annotations:
    appgw.ingress.kubernetes.io/ssl-redirect: "true"
    appgw.ingress.kubernetes.io/health-probe-path: /healthz
spec:
  ingressClassName: azure-application-gateway
  tls:
  - hosts: [api.example.com]
    secretName: api-tls
  rules:
  - host: api.example.com
    http:
      paths:
      - path: /orders
        pathType: Prefix
        backend:
          service:
            name: orders-api
            port:
              number: 80`,
      },
    ],
    diagrams: [
      {
        kind: 'sequence',
        title: 'Internet to Pod through Application Gateway',
        caption:
          'AGIC configures the gateway from Ingress objects; traffic goes straight to Pod IPs.',
        participants: [
          { id: 'user', label: 'User' },
          { id: 'agw', label: 'App Gateway + WAF' },
          { id: 'agic', label: 'AGIC' },
          { id: 'pod', label: 'Pod' },
        ],
        messages: [
          { from: 'agic', to: 'agw', label: 'Ingress -> listeners, rules, pools' },
          { from: 'user', to: 'agw', label: 'HTTPS request' },
          { from: 'agw', to: 'pod', label: 'Forward to Pod IP after WAF' },
          { from: 'pod', to: 'user', label: 'Response', kind: 'return' },
        ],
      },
    ],
    followUps: ['Why run WAF in Detection mode before Prevention?'],
    tags: ['aks', 'application gateway', 'agic', 'waf', 'ingress'],
  },
  {
    id: 'itv-myfaq-236',
    level: 'intermediate',
    kind: 'open',
    prompt: 'How do you integrate AKS with Azure Policy?',
    probing:
      'The add-on installs Gatekeeper so Azure policies become admission rules, with examples and an Audit-then-Deny rollout.',
    answer: [
      'The **Azure Policy add-on** installs Gatekeeper in the cluster. Policies assigned in Azure become admission rules in Kubernetes.',
      'Examples of what it blocks: privileged containers, images from registries other than my ACR, Pods without CPU and memory limits, and Services of type LoadBalancer with a public IP. Start with **Audit**, then move to **Deny**.',
    ],
    code: [
      {
        title: 'Enable the Azure Policy add-on',
        language: 'bash',
        code: `az aks enable-addons -g rg-aks-prod -n aks-app-prod --addons azure-policy`,
      },
    ],
    tags: ['aks', 'azure policy', 'gatekeeper'],
  },
  {
    id: 'itv-myfaq-237',
    level: 'advanced',
    kind: 'open',
    prompt: 'How do you connect AKS or App Service to Azure Database for PostgreSQL securely?',
    probing:
      'A private network path, the private DNS zone, Entra ID login with managed identity, and TLS - and that most failures are DNS.',
    answer: [
      'The app (AKS Pod or App Service) reaches the database through the VNet (App Service uses VNet integration), to a private endpoint or VNet-injected PostgreSQL Flexible Server with no public access.',
      'The Private DNS zone `privatelink.postgres.database.azure.com` resolves the name to a private IP. Login is with Entra ID (managed identity) or a password from Key Vault, and TLS is required (`sslmode=require`).',
    ],
    deeper: [
      "Most connection failures here are **DNS**: the Private DNS zone is not linked to the app's VNet, so the name resolves to a public IP.",
      'With Entra ID login, the app gets a token from its managed identity and uses it as the password. No database password is stored at all.',
    ],
    code: [
      {
        title: 'Secure connection path',
        language: 'text',
        code: `App (AKS Pod or App Service)
-> VNet (App Service uses VNet integration)
-> private endpoint or VNet-injected PostgreSQL Flexible Server (no public access)
-> Private DNS zone privatelink.postgres.database.azure.com resolves the name to a private IP
-> login with Entra ID (managed identity) or a password from Key Vault
-> TLS required (sslmode=require)`,
      },
    ],
    diagrams: [
      {
        kind: 'flow',
        title: 'App to PostgreSQL privately',
        caption:
          'If the name resolves to a public IP, the private DNS zone is not linked to the VNet.',
        nodes: [
          { label: 'App', detail: 'AKS Pod or App Service' },
          { label: 'VNet', detail: 'App Service uses VNet integration' },
          { label: 'Private DNS zone', detail: 'Name resolves to a private IP', tone: 'warning' },
          { label: 'PostgreSQL Flexible Server', detail: 'No public access' },
          {
            label: 'Entra ID login over TLS',
            detail: 'Managed identity token as password',
            tone: 'success',
          },
        ],
      },
    ],
    followUps: [
      'The app cannot connect and nslookup returns a public IP. What is wrong?',
      'How does Entra ID login remove the database password completely?',
    ],
    tags: ['postgresql', 'private endpoint', 'dns', 'managed identity'],
  },
  {
    id: 'itv-myfaq-238',
    level: 'intermediate',
    kind: 'open',
    prompt:
      'What is the difference between Azure Monitor, Application Insights, and Log Analytics, and how do they work together?',
    probing:
      'Azure Monitor as the umbrella, Application Insights as app telemetry, Log Analytics as the KQL store, and how an alert flows end to end.',
    answer: [
      'They are not three separate products. **Azure Monitor** is the umbrella. **Application Insights** is the part that collects telemetry from the application. The **Log Analytics workspace** is where the logs are stored and queried with KQL.',
      '- **Azure Monitor:** the whole platform - metrics, logs, alerts, action groups, workbooks. Example data: platform metrics, alert rules.\n- **Application Insights:** application performance monitoring (APM) inside Azure Monitor. Example data: requests, response times, dependencies, exceptions, traces, availability tests.\n- **Log Analytics workspace:** the log store with KQL. Example data: `AppRequests`, `AppExceptions`, `ContainerLogV2`, `AzureDiagnostics`.\n- **Azure Monitor workspace:** a different store, for Prometheus metrics. Example data: managed Prometheus time series.',
      'The big picture: applications send to Application Insights, Azure resources use diagnostic settings, and AKS logs go through Container Insights - all into a Log Analytics workspace, then KQL alerts, an Action Group, and email, Teams, or on-call. AKS metrics go through Managed Prometheus to an Azure Monitor workspace with Grafana dashboards and Prometheus alerts. Azure logs can also go through Event Hub to Splunk for the operations team.',
      'Example: an API starts returning HTTP 500. Application Insights records the failed request and the exception (same operation ID), stored in `AppRequests` and `AppExceptions`. A log alert "failed requests > 20 in 5 minutes" fires, the Action Group notifies the team, and the engineer follows the operation ID to the exception, the failing dependency, and the container logs.',
      '- "Which Azure Monitor component collects app telemetry automatically?" **Application Insights**, through auto-instrumentation (App Service, Functions, the Java agent) or the OpenTelemetry Distro.\n- Linking Application Insights to a workspace does **not** instrument the app. The app still needs the agent or SDK and the connection string.\n- One workspace per environment keeps app logs and infrastructure logs together, so one KQL query can join them.',
    ],
    code: [
      {
        title: 'The big picture',
        language: 'text',
        code: `Applications  -> Application Insights  -┐
Azure resources -> diagnostic settings  -┼-> Log Analytics workspace -> KQL alerts -> Action Group -> email, Teams, on-call
AKS (logs)    -> Container Insights     -┘
AKS (metrics) -> Managed Prometheus -> Azure Monitor workspace -> Grafana dashboards + Prometheus alerts
Azure logs    -> Event Hub -> Splunk (central logs and dashboards for the operations team)`,
      },
      {
        title: 'How they fit together',
        language: 'text',
        code: `App (instrumented)          -> Application Insights -┐
AKS (Azure Monitor Agent)   -> Container Insights   -┼-> one Log Analytics workspace
Azure resources             -> diagnostic settings  -┘        |
                                                      KQL, workbooks, alert rules
                                                              |
                                                      Action Group -> email / Teams / on-call`,
      },
      {
        title: 'Example: an API starts returning HTTP 500',
        language: 'text',
        code: `Application Insights records the failed request and the exception (same operation ID)
-> stored in AppRequests and AppExceptions in the workspace
-> log alert "failed requests > 20 in 5 minutes" fires
-> Action Group notifies the team
-> engineer follows the operation ID to the exception, the failing dependency, and the container logs`,
      },
    ],
    diagrams: [
      {
        kind: 'nested',
        title: 'Azure Monitor and its parts',
        caption:
          'Azure Monitor is the umbrella; Application Insights and the workspaces live inside it.',
        root: {
          label: 'Azure Monitor',
          detail: 'Metrics, logs, alerts, action groups, workbooks',
          children: [
            { label: 'Application Insights', detail: 'App telemetry (APM)', tone: 'accent' },
            { label: 'Log Analytics workspace', detail: 'Log store queried with KQL' },
            { label: 'Azure Monitor workspace', detail: 'Prometheus metrics', tone: 'muted' },
          ],
        },
      },
    ],
    tags: ['azure monitor', 'application insights', 'log analytics', 'monitoring'],
  },
  {
    id: 'itv-myfaq-239',
    level: 'intermediate',
    kind: 'open',
    prompt: 'How do you integrate an application with Azure Monitor (Application Insights)?',
    probing:
      'A workspace-based Application Insights resource, the connection string, the right instrumentation per hosting option, sampling, and availability tests.',
    answer: [
      'I create an **Application Insights** resource that stores its data in a **Log Analytics workspace**, and give the app the **connection string**. The app sends requests, dependencies (SQL, HTTP calls), exceptions, traces, and custom metrics.',
      'Three ways to turn it on:',
      '- **App Service / Functions:** turn on Application Insights in the portal or Bicep. For .NET, Java, Node.js, and Python on App Service, auto-instrumentation can work without code changes.\n- **AKS or VMs:** add the **Azure Monitor OpenTelemetry Distro** to the app and set the connection string as an environment variable.\n- **Java anywhere:** attach the Application Insights Java agent (`-javaagent:applicationinsights-agent.jar`). No code change.',
      '- Use the **connection string**, not the old instrumentation key. Instrumentation-key-only ingestion is no longer supported.\n- Turn on **sampling** for busy apps to control cost.\n- An **availability test** (standard test) calls a URL from several Azure regions and alerts when it fails. This catches problems even when nobody is using the app.',
    ],
    code: [
      {
        title: 'Flow',
        language: 'text',
        code: `App with the Azure Monitor OpenTelemetry Distro
-> sends telemetry using APPLICATIONINSIGHTS_CONNECTION_STRING
-> Application Insights (stored in Log Analytics)
-> Application Map, Failures, Performance, Live Metrics
-> KQL queries and alerts`,
      },
      {
        title: 'Python example',
        language: 'python',
        code: `# pip install azure-monitor-opentelemetry
from azure.monitor.opentelemetry import configure_azure_monitor

configure_azure_monitor()   # reads APPLICATIONINSIGHTS_CONNECTION_STRING from the environment`,
      },
      {
        title: 'Bicep example',
        language: 'bicep',
        code: `resource appInsights 'Microsoft.Insights/components@2020-02-02' = {
  name: 'appi-orders-prod'
  location: location
  kind: 'web'
  properties: {
    Application_Type: 'web'
    WorkspaceResourceId: logAnalytics.id
  }
}

// pass appInsights.properties.ConnectionString to the app as APPLICATIONINSIGHTS_CONNECTION_STRING`,
      },
      {
        title: 'Useful KQL: failed requests per operation',
        language: 'text',
        code: `// Failed requests per operation in the last hour
AppRequests
| where TimeGenerated > ago(1h)
| summarize total = count(), failed = countif(Success == false) by OperationName
| extend failurePercent = round(100.0 * failed / total, 2)
| order by failed desc`,
      },
    ],
    tags: ['application insights', 'opentelemetry', 'kql', 'monitoring'],
  },
  {
    id: 'itv-myfaq-240',
    level: 'advanced',
    kind: 'open',
    prompt:
      'How do you integrate AKS with Azure Monitor? How do application logs from AKS reach Azure Monitor?',
    probing:
      'Container Insights for logs and managed Prometheus for metrics, the stdout-to-ContainerLogV2 path through the agent and DCR, and cost control.',
    answer: [
      'The integration has two parts:',
      '- **Container Insights** for logs: container stdout/stderr, Kubernetes events, and node and Pod inventory go to Log Analytics.\n- **Azure Monitor managed service for Prometheus** for metrics, stored in an Azure Monitor workspace, with **Azure Managed Grafana** for dashboards.',
      'How the application logs get there: the app writes logs to stdout/stderr (JSON is best), the container runtime writes them to the node (`/var/log/containers`), the Azure Monitor Agent (DaemonSet, added by Container Insights) reads them, a data collection rule (DCR) decides what is kept, and they land in the `ContainerLogV2` table in Log Analytics.',
      'The app needs no logging library for this. Container logs show **what the app printed**.',
    ],
    deeper: [
      'For request timings, exceptions, and dependency calls, I also instrument the app with **Application Insights** (Java agent or OpenTelemetry Distro, connection string from a Secret). That telemetry lands in the same workspace.',
      'Container logs can be expensive. In the DCR I use the **ContainerLogV2** schema, exclude noisy namespaces like `kube-system`, and use the **Basic** logs plan for noisy, low-value tables. In Terraform this is the `oms_agent` block on the cluster plus a data collection rule.',
    ],
    code: [
      {
        title: 'Enable logs and metrics',
        language: 'bash',
        code: `# Logs: Container Insights
az aks enable-addons -g rg-aks-prod -n aks-app-prod --addons monitoring \\
  --workspace-resource-id "<log-analytics-workspace-id>"

# Metrics: managed Prometheus, linked to Managed Grafana
az aks update -g rg-aks-prod -n aks-app-prod \\
  --enable-azure-monitor-metrics \\
  --azure-monitor-workspace-resource-id "<azure-monitor-workspace-id>" \\
  --grafana-resource-id "<managed-grafana-id>"`,
      },
      {
        title: 'KQL: Pods that restarted in the last 24 hours',
        language: 'text',
        code: `// Pods that restarted in the last 24 hours
KubePodInventory
| where TimeGenerated > ago(24h)
| summarize restarts = max(PodRestartCount) by Namespace, Name
| where restarts > 0
| order by restarts desc`,
      },
      {
        title: 'How application logs get there',
        language: 'text',
        code: `App writes logs to stdout/stderr (JSON is best)
-> container runtime writes them to the node (/var/log/containers)
-> Azure Monitor Agent (DaemonSet, added by Container Insights) reads them
-> a data collection rule (DCR) decides what is kept
-> ContainerLogV2 table in Log Analytics`,
      },
      {
        title: 'KQL: errors from one namespace',
        language: 'text',
        code: `// Errors from one namespace in the last hour
ContainerLogV2
| where TimeGenerated > ago(1h)
| where PodNamespace == "orders" and LogMessage has "ERROR"
| project TimeGenerated, PodName, ContainerName, LogMessage
| order by TimeGenerated desc`,
      },
    ],
    diagrams: [
      {
        kind: 'flow',
        title: 'AKS application logs to Log Analytics',
        caption: 'The app only prints to stdout; the agent and the DCR do the rest.',
        nodes: [
          { label: 'App writes to stdout/stderr', detail: 'JSON is best' },
          { label: 'Node log files', detail: '/var/log/containers' },
          { label: 'Azure Monitor Agent', detail: 'DaemonSet from Container Insights' },
          { label: 'Data collection rule', detail: 'Decides what is kept', tone: 'warning' },
          { label: 'ContainerLogV2 table', tone: 'success' },
        ],
      },
    ],
    followUps: [
      'Container log ingestion costs are rising. What do you change?',
      'Where do request timings and dependency calls come from, if not container logs?',
    ],
    tags: ['aks', 'azure monitor', 'container insights', 'prometheus', 'kql'],
  },
  {
    id: 'itv-myfaq-241',
    level: 'advanced',
    kind: 'open',
    prompt:
      'You built Prometheus and Grafana dashboards. How did you integrate Prometheus and Grafana with AKS and the apps?',
    probing:
      'Managed vs self-hosted trade-offs, ServiceMonitor scraping, how Grafana authenticates to its data sources, and a useful PromQL query.',
    answer: [
      'There are two common setups:',
      '- **Managed** (Azure Monitor managed Prometheus + Azure Managed Grafana): Azure runs the storage and Grafana. AKS sends metrics with one setting. I pick it for less to operate, Entra ID login to Grafana, long retention.\n- **Self-hosted** (`kube-prometheus-stack` Helm chart): Prometheus Operator, Prometheus, Alertmanager, Grafana, node-exporter, and kube-state-metrics in the cluster. I pick it for full control; it works the same on any cluster.',
      "How an app's metrics get in: the app exposes `/metrics`. A **ServiceMonitor** tells Prometheus to scrape it.",
    ],
    deeper: [
      'How Grafana connects. Self-hosted: Grafana has Prometheus as a data source, set up by the chart. Managed: Azure Managed Grafana uses its managed identity with the **Monitoring Data Reader** role on the Azure Monitor workspace.',
      'Grafana can also add **Azure Monitor** and **Log Analytics** as data sources, so one dashboard can show Prometheus metrics and KQL logs together.',
      'The ServiceMonitor label `release: monitoring` must match the Prometheus selector of the chart, or Prometheus silently ignores it.',
    ],
    code: [
      {
        title: 'Self-hosted install',
        language: 'bash',
        code: `helm repo add prometheus-community https://prometheus-community.github.io/helm-charts
helm upgrade --install monitoring prometheus-community/kube-prometheus-stack \\
  -n monitoring --create-namespace -f monitoring-values.yaml`,
      },
      {
        title: 'ServiceMonitor',
        language: 'yaml',
        code: `apiVersion: monitoring.coreos.com/v1
kind: ServiceMonitor
metadata:
  name: orders-api
  namespace: orders
  labels:
    release: monitoring            # must match the Prometheus selector of the chart
spec:
  selector:
    matchLabels:
      app: orders-api
  endpoints:
  - port: http
    path: /metrics
    interval: 30s`,
      },
      {
        title: 'PromQL: CPU used by each Pod compared to its request',
        language: 'text',
        code: `# CPU used by each Pod compared to its request
sum by (namespace, pod) (rate(container_cpu_usage_seconds_total{container!=""}[5m]))
/
sum by (namespace, pod) (kube_pod_container_resource_requests{resource="cpu"})`,
      },
    ],
    diagrams: [
      {
        kind: 'decision',
        title: 'Managed or self-hosted Prometheus',
        caption: 'Pick by how much you want to operate yourself.',
        question: 'What matters more for this cluster?',
        branches: [
          {
            condition: 'Less to operate, long retention',
            result: 'Managed Prometheus + Managed Grafana',
            detail: 'Entra ID login to Grafana',
            tone: 'accent',
          },
          {
            condition: 'Full control, same on any cluster',
            result: 'kube-prometheus-stack Helm chart',
            tone: 'default',
          },
        ],
      },
    ],
    followUps: ['A new ServiceMonitor shows no targets in Prometheus. What do you check first?'],
    tags: ['prometheus', 'grafana', 'aks', 'monitoring'],
  },
  {
    id: 'itv-myfaq-242',
    level: 'basic',
    kind: 'open',
    prompt: 'How do you integrate Azure resources with Log Analytics?',
    probing:
      'Diagnostic settings and their three destinations, and enforcing them with IaC and DeployIfNotExists.',
    answer: [
      'With **diagnostic settings**. Every Azure resource (Key Vault, Application Gateway, PostgreSQL, Storage, AKS control plane) can send its logs and metrics to a Log Analytics workspace, a Storage account (cheap archive), or an Event Hub (to Splunk).',
      'Diagnostic settings are easy to forget on new resources. I set them in the Bicep or Terraform module, and use an Azure Policy with **DeployIfNotExists** to add them to anything created without them.',
    ],
    code: [
      {
        title: 'Create a diagnostic setting',
        language: 'bash',
        code: `az monitor diagnostic-settings create \\
  --name to-law \\
  --resource "<key-vault-resource-id>" \\
  --workspace "<log-analytics-workspace-id>" \\
  --logs '[{"categoryGroup":"allLogs","enabled":true}]' \\
  --metrics '[{"category":"AllMetrics","enabled":true}]'`,
      },
    ],
    tags: ['log analytics', 'diagnostic settings', 'monitoring'],
  },
  {
    id: 'itv-myfaq-243',
    level: 'intermediate',
    kind: 'open',
    prompt:
      'How do you integrate Azure Monitor alerts with email, Teams, and on-call? How does an alert reach the right person?',
    probing:
      'Alert rule -> severity -> Action Group, routing by severity, the Teams connector retirement, and alert hygiene.',
    answer: [
      'An **alert rule** watches a signal. When it fires, it calls an **Action Group**. The Action Group sends email or SMS, or calls a webhook that posts to Teams or creates an on-call incident.',
      'The alert rule (metric, KQL log query, activity log, or availability test) has a severity (Sev0 to Sev4), and each severity has its Action Group: Sev0-Sev1 go to the on-call tool (phone or page) + Teams + email, Sev2 to Teams + email, Sev3-Sev4 to email or a ticket only.',
      '- Teams **Office 365 connectors** (classic incoming webhooks) are being retired. Use a **Teams Workflows** webhook or a Logic App instead.\n- Use **alert processing rules** to mute alerts during planned maintenance.\n- Every paging alert should link to a **runbook**. An alert that nobody acts on is noise, so delete or tune it.',
    ],
    code: [
      {
        title: 'Routing by severity',
        language: 'text',
        code: `Alert rule (metric, KQL log query, activity log, or availability test)
-> severity (Sev0 to Sev4)
-> Action Group for that severity
   Sev0-Sev1 -> on-call tool (phone or page) + Teams + email
   Sev2      -> Teams + email
   Sev3-Sev4 -> email or a ticket only`,
      },
      {
        title: 'Action Group and metric alert',
        language: 'bash',
        code: `# Action Group with email and a webhook (for example a Teams Workflows webhook)
az monitor action-group create -g rg-monitoring -n ag-platform-sev1 --short-name platsev1 \\
  --action email oncall oncall@example.com \\
  --action webhook teams "https://<teams-workflow-webhook-url>"

# Metric alert: VM CPU above 85% for 15 minutes
az monitor metrics alert create -g rg-monitoring -n vm-cpu-high \\
  --scopes "<vm-resource-id>" \\
  --condition "avg Percentage CPU > 85" \\
  --window-size 15m --evaluation-frequency 5m --severity 2 \\
  --action ag-platform-sev1`,
      },
      {
        title: 'Log alert in KQL: failed backup jobs',
        language: 'text',
        code: `AddonAzureBackupJobs
| where TimeGenerated > ago(24h)
| where JobOperation == "Backup" and JobStatus == "Failed"
| project TimeGenerated, BackupItemUniqueId, JobFailureCode`,
      },
    ],
    diagrams: [
      {
        kind: 'decision',
        title: 'Which Action Group gets the alert',
        caption:
          'Only the most serious alerts page a person; the rest go to Teams, email, or a ticket.',
        question: 'What severity is the alert?',
        branches: [
          { condition: 'Sev0 - Sev1', result: 'On-call page + Teams + email', tone: 'danger' },
          { condition: 'Sev2', result: 'Teams + email', tone: 'warning' },
          { condition: 'Sev3 - Sev4', result: 'Email or a ticket only', tone: 'muted' },
        ],
      },
    ],
    tags: ['azure monitor', 'alerts', 'action group', 'teams'],
  },
  {
    id: 'itv-myfaq-244',
    level: 'advanced',
    kind: 'open',
    prompt: 'How do you integrate Prometheus Alertmanager with Teams or on-call?',
    probing:
      'PrometheusRule alerting rules, Alertmanager grouping and label-based routing, and the managed-Prometheus equivalent.',
    answer: [
      'Prometheus evaluates **alerting rules** and sends firing alerts to **Alertmanager**. Alertmanager groups them, removes duplicates, and routes them by labels such as `severity` and `team`.',
      'Alertmanager then sends `critical` alerts to the on-call tool and everything to a Teams channel through a webhook receiver. With managed Prometheus, the same rules are **Prometheus rule groups** in Azure, and they fire Azure Monitor Action Groups.',
    ],
    deeper: [
      'The `for: 10m` clause keeps a short spike from paging anyone: the condition has to hold for ten minutes before the alert fires.',
    ],
    code: [
      {
        title: 'PrometheusRule (kube-prometheus-stack)',
        language: 'yaml',
        code: `# PrometheusRule (kube-prometheus-stack)
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: orders-api
  namespace: orders
  labels:
    release: monitoring
spec:
  groups:
  - name: orders-api
    rules:
    - alert: OrdersApiHighErrorRate
      expr: |
        sum(rate(http_requests_total{app="orders-api",status=~"5.."}[5m]))
        / sum(rate(http_requests_total{app="orders-api"}[5m])) > 0.05
      for: 10m
      labels:
        severity: critical
      annotations:
        summary: "orders-api 5xx rate above 5% for 10 minutes"`,
      },
    ],
    followUps: ['How do you do the same with managed Prometheus in Azure?'],
    tags: ['prometheus', 'alertmanager', 'alerts', 'teams'],
  },
  {
    id: 'itv-myfaq-245',
    level: 'advanced',
    kind: 'open',
    prompt: 'How do you set up Splunk from scratch?',
    probing:
      'The components (forwarders, HEC, indexers, search head, deployment server), the build steps, security, licensing - and honesty about scope.',
    answer: [
      'Splunk is not built like an app; it is **deployed and configured**. At a high level: sources (VMs, apps, AKS, Azure) send through a Universal Forwarder (port 9997) or the HTTP Event Collector, HEC (port 8088), to the indexers that parse, index, and store the data, and the Search Head runs SPL searches, dashboards, and alerts that notify email, Teams, or ServiceNow.',
      '- **Universal Forwarder:** small agent on servers. Reads log files and Windows event logs, sends them to the indexers.\n- **Heavy Forwarder (optional):** filters or parses data before indexing; runs add-ons like the Microsoft Cloud Services add-on.\n- **HEC:** token-based HTTPS endpoint for apps and the Kubernetes collector.\n- **Indexer:** stores and indexes data. Clustered for high availability.\n- **Search Head:** the UI for searches, dashboards, and alerts.\n- **Deployment Server:** pushes input configs to all forwarders from one place.',
      'Steps to build it from scratch:',
      "- **Install:** one all-in-one Splunk Enterprise instance for a small setup, or separate indexers and search heads for production. Many companies use **Splunk Cloud**, where Splunk runs the indexers and search heads and we only onboard data.\n- **Create indexes** per environment or data type (`aks_prod`, `linux_os`, `azure_prod`) with a retention period (`frozenTimePeriodInSecs`). Separate indexes make access control and retention easy.\n- **Onboard data:** forwarder `inputs.conf` for servers, HEC tokens for apps and AKS, Event Hub add-on for Azure.\n- **Build dashboards and alerts:** error count, HTTP 5xx rate, latency, Pod restarts; scheduled searches that alert to Teams or ServiceNow.\n- **Secure it:** roles that see only their team's indexes, TLS between forwarders and indexers, HEC tokens in Key Vault, SSO with Entra ID (SAML).",
    ],
    deeper: [
      'Plan the **license** (daily ingest volume) and storage first. Filter noisy logs at the source.',
      'Be honest about scope. In my case Splunk already existed, so I say I **integrated** Azure workloads with Splunk and built the dashboards and alerts, and I explain how I would set it up from scratch.',
    ],
    code: [
      {
        title: 'High-level flow',
        language: 'text',
        code: `Sources (VMs, apps, AKS, Azure)
-> Universal Forwarder (port 9997) or HTTP Event Collector, HEC (port 8088)
-> Indexers: parse, index, and store the data
-> Search Head: SPL searches, dashboards, alerts
-> notifications: email, Teams, ServiceNow`,
      },
      {
        title: 'inputs.conf on a Universal Forwarder',
        language: 'text',
        code: `# inputs.conf on a Universal Forwarder
[monitor:///opt/orders/logs/app.log]
index = app_prod
sourcetype = orders:log`,
      },
    ],
    diagrams: [
      {
        kind: 'flow',
        title: 'Splunk data path',
        caption:
          'Forwarders and HEC bring data in; indexers store it; the search head turns it into dashboards and alerts.',
        nodes: [
          { label: 'Sources', detail: 'VMs, apps, AKS, Azure' },
          { label: 'Forwarder or HEC', detail: 'Port 9997 or 8088' },
          { label: 'Indexers', detail: 'Parse, index, store', tone: 'accent' },
          { label: 'Search Head', detail: 'SPL, dashboards, alerts' },
          { label: 'Notifications', detail: 'Email, Teams, ServiceNow', tone: 'success' },
        ],
      },
    ],
    followUps: [
      'How would you keep Splunk license usage under control?',
      'How do you restrict which team sees which data?',
    ],
    tags: ['splunk', 'logging', 'monitoring'],
  },
  {
    id: 'itv-myfaq-246',
    level: 'intermediate',
    kind: 'open',
    prompt: 'How do you integrate Azure with Splunk? How did you get Azure logs into Splunk?',
    probing:
      'Diagnostic settings to Event Hub and the Microsoft Cloud Services add-on, the receiver role, and the HEC and forwarder alternatives.',
    answer: [
      'Splunk does not read Log Analytics directly. The usual path is **diagnostic settings to Event Hub**, and Splunk pulls from the Event Hub.',
      'Steps to get Azure logs into Splunk:',
      '- Create an Event Hubs namespace and an event hub, for example `eh-splunk`.\n- Point diagnostic settings at it: `--event-hub eh-splunk --event-hub-rule <authorization-rule-id>`.\n- Create an app registration for Splunk with the **Azure Event Hubs Data Receiver** role.\n- Configure the add-on input with the namespace, event hub, and consumer group.\n- Build dashboards and alerts on the index.',
      'Other paths into Splunk:',
      '- **HTTP Event Collector (HEC):** the app or a Function pushes events to Splunk over HTTPS with a HEC token. Good for application events.\n- **Universal Forwarder** on VMs: reads log files from disk and sends them to Splunk.',
    ],
    code: [
      {
        title: 'Flow',
        language: 'text',
        code: `Azure resources (diagnostic settings), Activity Log, Entra ID logs
-> Azure Event Hub
-> Splunk Add-on for Microsoft Cloud Services (on a Splunk heavy forwarder) reads the Event Hub
-> Splunk index (for example azure_prod)
-> Splunk dashboards and alerts`,
      },
      {
        title: 'Example Splunk search',
        language: 'text',
        code: `index=azure_prod sourcetype="mscs:azure:eventhub" "properties.resultType"="Failed"
| stats count by "properties.operationName"
| sort - count`,
      },
    ],
    diagrams: [
      {
        kind: 'flow',
        title: 'Azure logs into Splunk',
        caption: 'Splunk pulls from Event Hub; it does not read Log Analytics directly.',
        nodes: [
          { label: 'Diagnostic settings', detail: 'Resources, Activity Log, Entra ID logs' },
          { label: 'Azure Event Hub', detail: 'eh-splunk' },
          { label: 'Microsoft Cloud Services add-on', detail: 'On a heavy forwarder' },
          { label: 'Splunk index', detail: 'azure_prod' },
          { label: 'Dashboards and alerts', tone: 'success' },
        ],
      },
    ],
    tags: ['splunk', 'event hub', 'diagnostic settings'],
  },
  {
    id: 'itv-myfaq-247',
    level: 'advanced',
    kind: 'open',
    prompt: 'How do you integrate AKS with Splunk?',
    probing:
      'The Splunk OpenTelemetry Collector DaemonSet sending to HEC, handling the HEC token properly, egress rules, and license control.',
    answer: [
      'With the **Splunk OpenTelemetry Collector for Kubernetes**, installed by Helm. It runs as a DaemonSet, reads container logs from every node, adds Kubernetes metadata (namespace, Pod, container), and sends them to Splunk through HEC.',
      'The older **Splunk Connect for Kubernetes** reached end of support. The OpenTelemetry collector is its replacement. **Fluent Bit** with its `splunk` output plugin is a common alternative.',
      'The app needs no Splunk library. It just logs to stdout.',
    ],
    deeper: [
      'In a real setup, the HEC token is not passed with `--set`. It comes from Key Vault into a Kubernetes Secret, and the chart uses it with `secret.create=false` and `secret.name=<secret>`.',
      'If AKS egress goes through Azure Firewall, allow outbound HTTPS to the HEC endpoint (8088, or 443 for Splunk Cloud).',
      "The HEC token should be allowed to write only to the cluster's indexes. Exclude noisy namespaces at the collector to save license.",
    ],
    code: [
      {
        title: 'Install the collector',
        language: 'bash',
        code: `helm repo add splunk-otel-collector-chart https://signalfx.github.io/splunk-otel-collector-chart
helm upgrade --install splunk-otel splunk-otel-collector-chart/splunk-otel-collector \\
  -n splunk --create-namespace \\
  --set clusterName=aks-app-prod \\
  --set splunkPlatform.endpoint=https://splunk.example.com:8088/services/collector \\
  --set splunkPlatform.token="$SPLUNK_HEC_TOKEN" \\
  --set splunkPlatform.index=k8s_prod`,
      },
      {
        title: 'Log path',
        language: 'text',
        code: `App writes JSON logs to stdout
-> node log files (/var/log/containers)
-> collector DaemonSet adds cluster, namespace, Pod, container
-> buffers and retries if Splunk is down
-> HTTPS + HEC token -> index aks_prod -> dashboards and alerts`,
      },
    ],
    followUps: [
      'How do you keep the HEC token out of the Helm command line?',
      'Logs stopped arriving in Splunk after a firewall change. Where do you look?',
    ],
    tags: ['splunk', 'aks', 'opentelemetry', 'hec'],
  },
  {
    id: 'itv-myfaq-248',
    level: 'advanced',
    kind: 'scenario',
    prompt:
      'You have Splunk, Grafana, and Prometheus. How do they work together, and how do you use them without watching three screens all day?',
    probing:
      'One job per tool, alerts that tell you where to look, shared labels and links, and the rule that metrics say what and logs say why.',
    answer: [
      'Each tool has one job, and **alerts** tell me where to look:',
      '- **Prometheus:** collects metrics and fires alerts - CPU, memory, Pod restarts, request rate, 5xx rate.\n- **Grafana:** shows the metrics on dashboards - AKS health, API latency per service.\n- **Splunk:** stores and searches logs - exceptions, stack traces, HTTP 500 details.',
      'Example: a Prometheus alert fires - orders-api latency went from 200 ms to 5 s and Pod restarts are rising. The Grafana dashboard shows which service, since when, and memory at 95%. In Splunk, `index=aks_prod service=orders-api "OutOfMemoryError"` finds the root cause: a memory leak in the new release. I roll back and confirm in Grafana that latency is normal again.',
      'Rule to remember: **metrics tell you that something is wrong, logs tell you why.**',
    ],
    deeper: [
      'How I connect them:\n- The same **labels** everywhere (cluster, namespace, service, version), so a Grafana panel and a Splunk search point at the same thing.\n- Grafana dashboards have **links** to a ready-made Splunk search for that service and time range. Grafana Enterprise can also add Splunk as a data source with a plugin.\n- Alertmanager and Splunk alerts go to the **same Teams channel and on-call tool**, with the severity in the alert.\n- **Saved searches** in Splunk for common problems (5xx, timeouts, OOM, auth failures).',
    ],
    code: [
      {
        title: 'Investigation path',
        language: 'text',
        code: `Prometheus alert: orders-api latency 200 ms -> 5 s, Pod restarts rising
-> Grafana dashboard: which service, since when, memory at 95%
-> Splunk: index=aks_prod service=orders-api "OutOfMemoryError"
-> root cause: memory leak in the new release -> roll back
-> confirm in Grafana that latency is normal again`,
      },
    ],
    diagrams: [
      {
        kind: 'flow',
        title: 'From alert to root cause',
        caption: 'Metrics tell you that something is wrong, logs tell you why.',
        nodes: [
          {
            label: 'Prometheus alert',
            detail: 'Latency 200 ms to 5 s, restarts rising',
            tone: 'danger',
          },
          { label: 'Grafana dashboard', detail: 'Which service, since when, memory 95%' },
          { label: 'Splunk search', detail: 'OutOfMemoryError in orders-api' },
          { label: 'Root cause: memory leak', detail: 'In the new release', tone: 'warning' },
          { label: 'Roll back, confirm in Grafana', tone: 'success' },
        ],
      },
    ],
    followUps: [
      'How do you make a Grafana panel and a Splunk search point at the same thing?',
      'How do you avoid duplicate pages from Alertmanager and Splunk for the same incident?',
    ],
    tags: ['prometheus', 'grafana', 'splunk', 'troubleshooting', 'monitoring'],
  },
  {
    id: 'itv-myfaq-249',
    level: 'intermediate',
    kind: 'open',
    prompt: 'How do you connect deployments with monitoring?',
    probing:
      'A post-deploy health check with automatic rollback, and deployment annotations on dashboards.',
    answer: [
      'After every deploy, the pipeline checks health instead of finishing blindly:',
      '- `kubectl rollout status` or a call to the `/healthz` endpoint.\n- A short check of the error rate in Application Insights or Prometheus.\n- If the check fails, roll back with `helm rollback` or by swapping App Service slots back.',
      'I also mark each deployment on the dashboards (a Grafana annotation or an Application Insights release annotation). When a graph changes, everyone can see it lines up with a deploy.',
    ],
    tags: ['monitoring', 'ci/cd', 'rollback'],
  },
  {
    id: 'itv-myfaq-250',
    level: 'advanced',
    kind: 'open',
    prompt:
      'How do you integrate Azure Functions with Service Bus? How did your Functions work with Service Bus?',
    probing:
      'Queue-based decoupling, peek-lock and dead-lettering, at-least-once delivery and idempotency, identity-based connections, and concurrency limits.',
    answer: [
      'The API puts a request message on a **Service Bus queue** and returns right away. A **Service Bus-triggered Function** picks up each message, does the slow work (for example, generating a document), and writes the result to **Blob Storage**.',
      "Login without connection strings: the app settings hold only the namespace and the blob URI (`__fullyQualifiedNamespace`, `__blobServiceUri`). The Function App's managed identity needs **Azure Service Bus Data Receiver** on the queue and **Storage Blob Data Contributor** on the container.",
      '- **Peek-lock:** the message is hidden while the Function works. If the Function succeeds, the message is completed. If it fails, the message comes back and is retried.\n- After **max delivery count** (10 by default) the message goes to the **dead-letter queue**. Alert on the dead-letter count, because nobody looks there otherwise.',
    ],
    deeper: [
      'Make the Function **idempotent** (the same message processed twice gives the same result), because Service Bus delivers **at least once**. Naming the file by message or request ID does this.',
      'The trigger scales the Function out based on the queue length. Limit concurrency in `host.json` so you do not overload the database.',
    ],
    code: [
      {
        title: 'Flow',
        language: 'text',
        code: `API receives a request
-> sends a message to the Service Bus queue (returns 202 Accepted)
-> Function is triggered by the message (peek-lock)
-> Function generates the document
-> Function writes the file to Blob Storage
-> message is completed (removed from the queue)
-> if it fails many times, the message moves to the dead-letter queue`,
      },
      {
        title: 'Example (Python v2 programming model)',
        language: 'python',
        code: `import azure.functions as func

app = func.FunctionApp()

@app.service_bus_queue_trigger(arg_name="msg", queue_name="doc-requests",
                               connection="ServiceBusConnection")
@app.blob_output(arg_name="outfile", path="documents/{MessageId}.pdf",
                 connection="DocsStorage")
def generate_document(msg: func.ServiceBusMessage, outfile: func.Out[bytes]):
    request = msg.get_body().decode("utf-8")
    pdf_bytes = build_pdf(request)      # your document logic
    outfile.set(pdf_bytes)`,
      },
      {
        title: 'Login without connection strings (managed identity)',
        language: 'text',
        code: `ServiceBusConnection__fullyQualifiedNamespace = sb-docs-prod.servicebus.windows.net
DocsStorage__blobServiceUri                    = https://stdocsprod.blob.core.windows.net`,
      },
    ],
    diagrams: [
      {
        kind: 'flow',
        title: 'Service Bus-triggered document Function',
        caption:
          'The queue absorbs load; peek-lock and the dead-letter queue keep failed work from being lost.',
        nodes: [
          { label: 'API sends a message', detail: 'Returns 202 Accepted' },
          { label: 'Service Bus queue' },
          {
            label: 'Function triggered (peek-lock)',
            branch: { label: 'Fails max times: dead-letter queue', tone: 'danger' },
          },
          { label: 'Generate the document' },
          { label: 'Write to Blob Storage' },
          { label: 'Message completed', tone: 'success' },
        ],
      },
    ],
    followUps: [
      'Why must the Function be idempotent?',
      'How do you stop the Function from overloading the database during a spike?',
    ],
    tags: ['azure functions', 'service bus', 'serverless', 'managed identity'],
  },
  {
    id: 'itv-myfaq-251',
    level: 'advanced',
    kind: 'scenario',
    prompt:
      'How do you integrate Event Grid with Functions and Storage? Scenario: a Function turns uploaded files into PDFs.',
    probing:
      'Push-based events with a filter, avoiding a trigger loop, identity, idempotency, handling a burst, and Service Bus vs Event Grid.',
    answer: [
      '**Event Grid** delivers events, such as "a blob was created", to a handler like a Function or a webhook. It pushes the event, so nothing has to keep checking the storage account.',
      'File uploaded to Blob Storage -> the storage account publishes a `BlobCreated` event to Event Grid -> an Event Grid subscription with a filter (container, file type) -> a Function with an Event Grid trigger runs.',
      'Scenario: a user uploads `invoice.docx` to the `input/` container. A `BlobCreated` event, filtered to `input/` only, runs the Function (Event Grid trigger, or a Blob trigger with source EventGrid). It reads the file, generates the PDF, and writes `output/invoice.pdf`. Failures retry, then dead-letter; bad files are moved to `failed/`.',
      "- **Filter on the input container.** If the Function's own output also raised events, it would trigger itself in a loop.\n- **Managed identity** with Storage Blob Data Reader on `input/` and Contributor on `output/`. No storage account key in app settings.\n- **Idempotent:** if `output/invoice.pdf` already exists, skip. Events can arrive more than once.",
    ],
    deeper: [
      '**10,000 uploads at once:** put a **Service Bus queue** between Event Grid and the Function. The queue absorbs the spike, `host.json` limits concurrency, and failed jobs go to the dead-letter queue.',
      'Very long jobs (many minutes) fit better in **Container Apps Jobs** than in one Function run.',
      'Service Bus vs Event Grid:\n- **Model:** Service Bus is a queue or topic where the consumer pulls messages; Event Grid pushes and calls your handler.\n- **Use for:** Service Bus for commands and work items that must not be lost (orders, document jobs); Event Grid for reacting to events (a blob was created, a resource changed).\n- **Features:** Service Bus has ordering with sessions, dead-letter queue, transactions, duplicate detection; Event Grid has filtering, fan-out to many handlers, retries, dead-letter to storage.',
    ],
    code: [
      {
        title: 'Event flow',
        language: 'text',
        code: `File uploaded to Blob Storage
-> Storage account publishes a BlobCreated event to Event Grid
-> Event Grid subscription with a filter (container, file type)
-> Function with an Event Grid trigger runs`,
      },
      {
        title: 'Create the event subscription',
        language: 'bash',
        code: `az eventgrid event-subscription create \\
  --name new-invoices \\
  --source-resource-id "<storage-account-id>" \\
  --endpoint-type azurefunction \\
  --endpoint "<function-resource-id>/functions/process_invoice" \\
  --included-event-types Microsoft.Storage.BlobCreated \\
  --subject-begins-with /blobServices/default/containers/invoices/`,
      },
      {
        title: 'Scenario: uploaded files into PDFs',
        language: 'text',
        code: `User uploads invoice.docx to the input/ container
-> BlobCreated event, filtered to input/ only
-> Function runs (Event Grid trigger, or a Blob trigger with source EventGrid)
-> reads the file, generates the PDF
-> writes output/invoice.pdf
-> failures: retry, then dead-letter; bad files moved to failed/`,
      },
    ],
    diagrams: [
      {
        kind: 'flow',
        title: 'Upload to PDF with Event Grid',
        caption: 'Filter to input/ only, or the Function output triggers the Function again.',
        nodes: [
          { label: 'User uploads to input/' },
          { label: 'BlobCreated event', detail: 'Filtered to input/ only', tone: 'warning' },
          {
            label: 'Function runs',
            detail: 'Managed identity, idempotent',
            branch: { label: 'Failures: retry, then dead-letter', tone: 'danger' },
          },
          { label: 'Generate the PDF' },
          { label: 'Write output/invoice.pdf', tone: 'success' },
        ],
      },
    ],
    followUps: [
      'What happens if 10,000 files are uploaded at once?',
      'When would you choose Service Bus over Event Grid?',
    ],
    tags: ['event grid', 'azure functions', 'storage', 'service bus', 'serverless'],
  },
  {
    id: 'itv-myfaq-252',
    level: 'basic',
    kind: 'open',
    prompt:
      'How do you integrate Terraform with Ansible? Where does Terraform stop and Ansible start?',
    probing:
      'Terraform builds, Ansible configures, the dynamic inventory link by tags, and why not remote-exec provisioners.',
    answer: [
      '**Terraform builds the infrastructure. Ansible configures what runs on it.**',
      'Terraform/Bicep creates VMs with tags (`role=web`, `env=prod`), the Ansible dynamic inventory finds the VMs by tag, the Ansible playbook installs packages, applies OS hardening, and configures the app, and the same playbook runs later for patching and config drift.',
      'I do not use Terraform `remote-exec` provisioners for configuration. They run only once, at creation, are hard to re-run, and failures leave a half-built VM.',
    ],
    code: [
      {
        title: 'Flow',
        language: 'text',
        code: `Terraform/Bicep creates VMs with tags (role=web, env=prod)
-> Ansible dynamic inventory finds the VMs by tag
-> Ansible playbook installs packages, applies OS hardening, configures the app
-> the same playbook runs later for patching and config drift`,
      },
    ],
    tags: ['terraform', 'ansible', 'configuration management'],
  },
  {
    id: 'itv-myfaq-253',
    level: 'intermediate',
    kind: 'open',
    prompt: 'How do you integrate Ansible with Azure?',
    probing:
      'The `azure.azcollection` dynamic inventory plugin grouping by tags, its authentication, and keeping SSH keys out of the repo.',
    answer: [
      'With the **`azure.azcollection`** collection and the **Azure dynamic inventory plugin**, so I never keep a static list of IP addresses.',
      'From a pipeline (Azure DevOps, Jenkins, or GitHub Actions), the same command runs after the Azure login step. SSH keys come from Key Vault or the CI credential store, never from the repo.',
    ],
    code: [
      {
        title: 'Dynamic inventory',
        language: 'yaml',
        code: `# inventory/prod.azure_rm.yml   (the file name must end with azure_rm.yml)
plugin: azure.azcollection.azure_rm
auth_source: auto            # managed identity, environment variables, or az login
include_vm_resource_groups:
  - rg-web-prod
keyed_groups:
  - prefix: role
    key: tags.role           # creates groups like role_web
conditional_groups:
  linux: "'linux' in os_profile.system"`,
      },
      {
        title: 'Run it',
        language: 'bash',
        code: `ansible-galaxy collection install azure.azcollection
ansible-inventory -i inventory/prod.azure_rm.yml --graph
ansible-playbook -i inventory/prod.azure_rm.yml patch.yml --limit role_web`,
      },
    ],
    tags: ['ansible', 'azure', 'dynamic inventory'],
  },
  {
    id: 'itv-myfaq-254',
    level: 'intermediate',
    kind: 'open',
    prompt:
      'How do you integrate pipelines with Nexus and Azure Artifacts? How do your pipelines publish and use packages?',
    probing:
      'Versioned packages, promotion of the same package instead of rebuilding, feed views, and credentials kept out of Git.',
    answer: [
      'The build publishes a **versioned package** (Maven JAR, npm, NuGet, Python wheel) to the artifact repository. Other builds and deploys pull that exact version. **Promotion** means moving the same package from a dev feed or view to a release one after testing, not rebuilding it.',
      'Azure Artifacts feeds have **views** (`@local`, `@prerelease`, `@release`). Promoting a package to `@release` is the approval step.',
      'With Jenkins and Nexus, the Maven `settings.xml` holds the Nexus credentials and is stored in Jenkins (Config File Provider plugin), not in Git. Snapshots go to a `maven-snapshots` repository and releases to `maven-releases`, which does not allow overwriting a version.',
    ],
    code: [
      {
        title: 'Azure DevOps with Azure Artifacts',
        language: 'yaml',
        code: `- task: NuGetAuthenticate@1          # also npmAuthenticate@0, PipAuthenticate@1, MavenAuthenticate@0
- script: dotnet nuget push "**/*.nupkg" --source "https://pkgs.dev.azure.com/<org>/_packaging/<feed>/nuget/v3/index.json" --api-key az`,
      },
      {
        title: 'Jenkins with Nexus',
        language: 'text',
        code: `stage('Publish to Nexus') {
  steps {
    configFileProvider([configFile(fileId: 'maven-settings-nexus', variable: 'MAVEN_SETTINGS')]) {
      sh 'mvn -B -s "$MAVEN_SETTINGS" deploy -DskipTests'
    }
  }
}`,
      },
    ],
    tags: ['azure artifacts', 'nexus', 'packages', 'ci/cd'],
  },
  {
    id: 'itv-myfaq-255',
    level: 'basic',
    kind: 'open',
    prompt: 'How do you integrate Git with your pipelines?',
    probing:
      'Triggers, pull request checks, and branch protection, and what each looks like in Azure DevOps, GitHub, GitLab, and Jenkins.',
    answer: [
      'Git is where everything starts. The integration has three parts: **triggers**, **pull request checks**, and **branch protection**.',
      '- **Azure Repos + Azure DevOps:** trigger with `trigger:` and `pr:` in YAML; PR check through branch policy -> **Build validation**; protection with branch policies (reviewers, linked work item, comment resolution).\n- **GitHub + GitHub Actions:** `on: push` / `pull_request`; **required status checks**; rulesets or branch protection, CODEOWNERS.\n- **GitLab + GitLab CI:** pipelines on push and merge request; the **Pipelines must succeed** setting; protected branches, approval rules, CODEOWNERS.\n- **Jenkins:** Multibranch Pipeline + webhook from the Git server; status reported back to the Git server; protection is done on the Git server side.',
      'A developer opens a pull request to main, the pipeline runs build, tests, SonarQube, Checkov, Trivy, and `terraform plan`, results show on the pull request, merge is blocked until checks pass and a reviewer approves, and merge to main triggers the deploy pipeline.',
    ],
    code: [
      {
        title: 'Pull request flow',
        language: 'text',
        code: `Developer opens a pull request to main
-> the pipeline runs build, tests, SonarQube, Checkov, Trivy, and terraform plan
-> results show on the pull request
-> merge is blocked until checks pass and a reviewer approves
-> merge to main triggers the deploy pipeline`,
      },
    ],
    tags: ['git', 'branch protection', 'pull requests', 'ci/cd'],
  },
]
