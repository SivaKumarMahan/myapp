import type { InterviewQuestion } from '../../../types'

/** Cognizant round: GitHub Actions and Azure DevOps pipeline questions. */
export const roundsCognizantPipelineQuestions: InterviewQuestion[] = [
  {
    id: 'itv-rcog-2',
    level: 'basic',
    kind: 'open',
    prompt: 'What is the difference between `run` and `uses` in GitHub Actions?',
    probing:
      'That `run` executes shell commands on the runner while `uses` calls an existing action, and that a typical pipeline combines both.',
    answer: [
      '**The main difference**',
      '- `run` executes shell commands directly on the runner.\n- `uses` runs a GitHub Action that already exists, either from the Marketplace or from your own repository.',
      '**1. `run` example:** Use `run` to execute Linux commands, scripts, or build commands.',
      '**Real-time example:** in a CI pipeline, I use `run` to compile a Java application with Maven, run shell scripts, or run tests.',
      '**2. `uses` example:** Use `uses` to call an existing GitHub Action.',
      '**Real-time example:** before building a Java application, I use `actions/checkout` to download the repository code and `actions/setup-java` to install Java on the runner.',
      '**Key differences (`run` vs `uses`)**',
      '- **Purpose**: `run`: Executes shell commands; `uses`: Executes an existing action\n- **Examples**: `run`: `mvn clean package`, `ls`, `pwd`; `uses`: `actions/checkout@v4`\n- **What it contains**: `run`: Shell commands or scripts; `uses`: A reference to an action\n- **`with` inputs**: `run`: Not used; `uses`: Commonly used to pass inputs to the action\n- **Typical use**: `run`: Build, test, script execution; `uses`: Checkout code, set up tools, upload artifacts',
      'A single step can have either `run` or `uses`, not both.',
      '**3. Real-time DevOps pipeline example:** here, `uses` gets the code and prepares the environment, and `run` executes the Maven build.',
      '**Interview answer:** "In GitHub Actions, `run` executes shell commands or scripts directly on the runner, while `uses` calls an existing GitHub Action. For example, I use `actions/checkout` to get the source code and `actions/setup-java` to set up Java. Then I use `run: mvn clean package` to build the application. Both are used together in a typical CI/CD pipeline."',
    ],
    code: [
      {
        title: '`run` steps',
        language: 'yaml',
        code: `steps:
  - name: Check current directory
    run: pwd

  - name: List files
    run: ls -la

  - name: Build Java application
    run: mvn clean package`,
      },
      {
        title: '`uses` steps',
        language: 'yaml',
        code: `steps:
  - name: Checkout code
    uses: actions/checkout@v4

  - name: Set up Java
    uses: actions/setup-java@v4
    with:
      distribution: temurin
      java-version: '17'`,
      },
      {
        title: 'Java CI pipeline using both',
        language: 'yaml',
        code: `name: Java CI Pipeline

on:
  push:
    branches: [main]

jobs:
  build:
    runs-on: ubuntu-latest

    steps:
      - name: Checkout source code
        uses: actions/checkout@v4

      - name: Set up Java
        uses: actions/setup-java@v4
        with:
          distribution: temurin
          java-version: '17'

      - name: Build application
        run: mvn clean package`,
      },
    ],
    tags: ['github actions', 'ci/cd', 'workflow steps'],
  },
  {
    id: 'itv-rcog-3',
    level: 'basic',
    kind: 'open',
    prompt: 'If I want my pipeline to run automatically in GitHub Actions, what should I do?',
    probing:
      'Using the `on` keyword with push, pull_request and schedule triggers, and knowing where the workflow file must live.',
    answer: [
      '**Interview-style answer**',
      'In GitHub Actions, we use the `on` keyword to trigger a workflow automatically on events such as a code push, a pull request, or a schedule.',
      'For example, to run the pipeline whenever a developer pushes code to the `main` branch, I configure the `push` trigger in the workflow YAML file.',
      '**1. Run automatically when code is pushed:** create the file `.github/workflows/ci.yml`.',
      '**How the push trigger works**',
      '1. A developer pushes code to the `main` branch.\n2. GitHub detects the `push` event.\n3. GitHub Actions starts the workflow automatically.\n4. The runner checks out the code and runs the build step.',
      '**2. Other ways to trigger a pipeline**',
      '- **`push`**: Purpose: Run when code is pushed; Example: Developer pushes code to `main`\n- **`pull_request`**: Purpose: Run when a PR is opened or updated; Example: Developer creates a PR\n- **`schedule`**: Purpose: Run at a set time; Example: Daily security scan\n- **`workflow_dispatch`**: Purpose: Run manually from GitHub; Example: Engineer clicks **Run workflow**',
      'To run the pipeline daily at midnight UTC, use a `schedule` with a cron expression. You can also combine several triggers in one workflow.',
      '**Interview answer to remember**',
      '"To run a GitHub Actions pipeline automatically, I configure triggers with the `on` keyword in the workflow YAML file. I use `push` to trigger the pipeline whenever code is pushed to the `main` branch, and `pull_request` to validate code before merging. I can also use `schedule` for periodic jobs. In my DevOps workflow, the CI pipeline triggers on code changes and runs build, tests, and security scans automatically."',
      '**Important:** the workflow file must be committed under `.github/workflows/` in the repository. Scheduled workflows use UTC, run only from the default branch, and can be delayed when GitHub is under high load.',
    ],
    code: [
      {
        title: '.github/workflows/ci.yml triggered on push',
        language: 'yaml',
        code: `name: CI Pipeline

on:
  push:
    branches:
      - main

jobs:
  build:
    runs-on: ubuntu-latest

    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Build application
        run: echo "Building the application"`,
      },
      {
        title: 'Daily schedule at midnight UTC',
        language: 'yaml',
        code: `on:
  schedule:
    - cron: '0 0 * * *'`,
      },
      {
        title: 'Several triggers in one workflow',
        language: 'yaml',
        code: `on:
  push:
    branches: [main]
  pull_request:
    branches: [main]
  workflow_dispatch:`,
      },
    ],
    tags: ['github actions', 'triggers', 'ci/cd'],
  },
  {
    id: 'itv-rcog-4',
    level: 'basic',
    kind: 'open',
    prompt: 'What is the difference between a variable and a variable group in Azure DevOps?',
    probing:
      'A single value versus a reusable Library collection, per-environment groups, and handling secrets through secret variables or Key Vault.',
    answer: [
      'The main difference: a **variable** stores a single value, while a **variable group** stores many variables together so several pipelines can reuse them.',
      '**1. Variable:** a variable stores one value, such as an environment name, application name, or configuration setting.',
      'Here, `environment` and `appName` are defined directly in the pipeline YAML. You can also define variables in the pipeline settings (UI) in Azure DevOps.',
      '**2. Variable group:** a set of variables managed centrally in the Azure DevOps **Library**. Many pipelines can use the same group.',
      '**How to create one**',
      '1. Go to **Pipelines > Library**.\n2. Select **Variable groups**.\n3. Click **+ Variable group**.\n4. Give it a name, such as `dev-config`.\n5. Add variables like `environment`, `appName`, and `apiUrl`.\n6. Save the group and authorize the pipelines that need it.',
      'Here, the pipeline reads the variables from the `dev-config` group.',
      '**3. Key differences (variable vs variable group)**',
      '- **Purpose**: Variable: Stores one value; Variable group: Stores a collection of variables\n- **Location**: Variable: YAML, pipeline UI, or other supported scopes; Variable group: Azure DevOps Library\n- **Reusability**: Variable: Limited to where it is defined; Variable group: Shared across many pipelines\n- **Maintenance**: Variable: Update it where it is defined; Variable group: Update once, centrally\n- **Secrets**: Variable: Can be marked secret; Variable group: Can hold secret variables\n- **Key Vault integration**: Variable: No; Variable group: Can link to Azure Key Vault\n- **Access control**: Variable: Through the pipeline; Variable group: Own security roles and pipeline permissions',
      '**4. Real-time DevOps example:** suppose you have Dev, QA, and Production environments. Create one group per environment, then pick the right group in the pipeline.',
      '- `dev-config`: Dev URL and configuration values.\n- `qa-config`: QA URL and configuration values.\n- `prod-config`: Production URL and configuration values.',
      'Each group must contain the variables the pipeline uses, and access to production groups should be restricted. When you mix groups and plain variables, use the list syntax (`- name: x` / `value: y`) for the plain variables.',
      'For passwords, tokens, and connection strings, use secret variables or Azure Key Vault integration, and never print secret values in pipeline logs.',
      '**Interview answer:** "In Azure DevOps, a variable stores one configuration value, while a variable group stores many variables in the Library and lets us reuse them across pipelines. For example, I define an application name directly in YAML, but for Dev, QA, and Production configuration I keep separate variable groups. When a value changes, I update the group once instead of editing many pipeline files. For sensitive information, I use secret variables or link the variable group to Azure Key Vault."',
    ],
    code: [
      {
        title: 'Variables defined in YAML',
        language: 'yaml',
        code: `variables:
  environment: 'dev'
  appName: 'myapp'

steps:
  - script: |
      echo "Environment: $(environment)"
      echo "Application: $(appName)"`,
      },
      {
        title: 'Using a variable group',
        language: 'yaml',
        code: `variables:
  - group: dev-config

steps:
  - script: |
      echo "Environment: $(environment)"
      echo "Application: $(appName)"`,
      },
      {
        title: 'Pick a group per environment',
        language: 'yaml',
        code: `parameters:
  - name: environment
    type: string
    default: dev
    values:
      - dev
      - qa
      - prod

variables:
  - \${{ if eq(parameters.environment, 'dev') }}:
      - group: dev-config
  - \${{ if eq(parameters.environment, 'qa') }}:
      - group: qa-config
  - \${{ if eq(parameters.environment, 'prod') }}:
      - group: prod-config

steps:
  - script: echo "Deploying to $(environment)"`,
      },
    ],
    tags: ['azure devops', 'variables', 'variable groups'],
  },
  {
    id: 'itv-rcog-5',
    level: 'intermediate',
    kind: 'open',
    prompt:
      'What is the difference between Microsoft-hosted and self-hosted agents? How do you set up a self-hosted agent?',
    probing:
      'The trade-offs between hosted and self-hosted agents, the actual setup steps (pool, config.sh, svc.sh), and the network and security reasons for choosing self-hosted.',
    answer: [
      '**1. Difference between Microsoft-hosted and self-hosted agents**',
      'In Azure DevOps, an **agent** is a machine that runs pipeline jobs, such as building applications, running tests, creating Docker images, and deploying to AKS.',
      '- **Infrastructure**: Microsoft-hosted: Managed by Microsoft; Self-hosted: Managed by our team\n- **Setup**: Microsoft-hosted: No installation; Self-hosted: We install and configure the agent\n- **Machine lifecycle**: Microsoft-hosted: Fresh VM for every job; Self-hosted: Machine is reused between jobs\n- **Software**: Microsoft-hosted: Standard preinstalled tools; Self-hosted: We install the tools we need\n- **Network access**: Microsoft-hosted: Public internet; cannot reach private resources without extra setup; Self-hosted: Can run inside our private network\n- **Caching**: Microsoft-hosted: No cache between runs; Self-hosted: Docker layers and packages stay, so builds can be faster\n- **Maintenance**: Microsoft-hosted: Microsoft patches the VM; Self-hosted: We patch and secure it\n- **Cost**: Microsoft-hosted: Paid per parallel job (a free tier exists); Self-hosted: VM cost plus maintenance effort\n- **Best use case**: Microsoft-hosted: Standard build and test pipelines; Self-hosted: Private deployments and custom environments',
      '**Real-time example:** our application runs on a **private AKS cluster**.',
      '- **Microsoft-hosted agent:** can build the application, but cannot reach the private AKS API endpoint.\n- **Self-hosted agent:** we install the agent on an Azure VM inside the AKS VNet or a peered network. After configuring DNS, routing, permissions, and firewall rules, it can deploy to the private cluster.',
      '**Managed DevOps Pools** are a middle option: Microsoft manages the agents, but they can run inside your own VNet.',
      '**2. Steps to set up a self-hosted agent (Ubuntu VM in Azure)**',
      '**Step 1: Create a VM**',
      '1. In the Azure portal, go to **Virtual machines > Create**.\n2. Select **Ubuntu Linux**.\n3. Configure the VM size, networking, and SSH access.\n4. Make sure the VM has outbound HTTPS (port 443) access to Azure DevOps. No inbound port is needed: the agent connects out to Azure DevOps.\n5. Connect to the VM over SSH.',
      'You can also use an existing Linux VM.',
      '**Step 2: Create an agent pool**',
      '1. In Azure DevOps, open **Organization settings > Agent pools**.\n2. Click **Add pool**.\n3. Select **Self-hosted**.\n4. Name it `Linux-SelfHosted-Pool`.',
      'The pool groups the agents that will run your pipeline jobs.',
      '**Step 3: Install prerequisites:** install the base packages, plus whatever your builds need, such as Docker, Java, Node.js, Azure CLI, kubectl, or Helm.',
      '**Step 4: Download the agent**',
      '1. Go to **Organization settings > Agent pools > Linux-SelfHosted-Pool > Agents > New agent**.\n2. Select **Linux** and copy the download link for your architecture.\n3. Download and extract it (use the actual file name if it differs).',
      '**Step 5: Configure the agent:** run `./config.sh` and enter the requested details.',
      '- **Server URL:** `https://dev.azure.com/YOUR_ORGANIZATION`\n- **Authentication:** a supported method, such as a PAT.\n- **Agent pool:** `Linux-SelfHosted-Pool`\n- **Agent name:** `ubuntu-agent-01`\n- **Work folder:** accept the default `_work`, or choose another folder.',
      'If you use a PAT, give it only the **Agent Pools (Read & manage)** scope and handle it securely. It is only needed during configuration. Never commit it to Git or print it in logs.',
      '**Step 6: Install the agent as a service:** the agent now runs in the background and picks up jobs even after you disconnect from SSH, and it starts again after a reboot.',
      '**Step 7: Verify the agent:** go to **Organization settings > Agent pools > Linux-SelfHosted-Pool > Agents**. You should see `ubuntu-agent-01` with the status **Online**.',
      '**Step 8: Use the agent in a pipeline:** when a developer pushes code to `main`, Azure DevOps runs the job on your self-hosted agent.',
      '**3. Real-time project example (Azure DevOps, Docker, ACR, and a private AKS cluster)**',
      '1. A developer pushes code to Azure Repos.\n2. Azure DevOps triggers the pipeline.\n3. The self-hosted agent builds the application.\n4. It builds a Docker image and pushes it to ACR.\n5. It connects to the private AKS API and deploys the application.',
      'For this to work, the VM needs the right tools, network access, and permissions. Running the agent inside the same VNet helps with networking, but it does **not** give access to AKS by itself; the deployment identity still needs RBAC on the cluster.',
      '**4. Interview answer to remember**',
      '"I use Microsoft-hosted agents for standard build and test jobs because Microsoft manages the machines. For self-hosted agents, we manage the VM, install the tools, and configure the agent pool ourselves. To set one up, I create a Linux VM, create an agent pool in Azure DevOps, download the agent, run `config.sh`, and install it as a service with `svc.sh`. Then I reference that pool in the pipeline YAML. For example, to deploy to a private AKS cluster, a self-hosted agent inside the connected private network can do the deployment with the right permissions."',
      '**Security point:** treat self-hosted agents as sensitive infrastructure. Patch the VM, restrict which pipelines can use the pool, use least-privilege deployment identities, clean the work folder between runs, and never run untrusted pull-request code on an agent that has production access.',
    ],
    code: [
      {
        title: 'Step 3: install prerequisites',
        language: 'bash',
        code: `sudo apt update
sudo apt install -y curl git tar gzip`,
      },
      {
        title: 'Step 4: download and extract the agent',
        language: 'bash',
        code: `mkdir -p ~/myagent && cd ~/myagent
curl -LO <download-url-copied-from-azure-devops>
tar -xzf vsts-agent-linux-x64-*.tar.gz`,
        placeholders: ['<download-url-copied-from-azure-devops>'],
      },
      {
        title: 'Step 5: configure the agent',
        language: 'bash',
        code: `./config.sh`,
      },
      {
        title: 'Step 6: install and start the agent service',
        language: 'bash',
        code: `sudo ./svc.sh install
sudo ./svc.sh start
sudo ./svc.sh status`,
      },
      {
        title: 'Step 8: pipeline using the self-hosted pool',
        language: 'yaml',
        code: `trigger:
  - main

pool:
  name: Linux-SelfHosted-Pool

steps:
  - script: |
      echo "Running on self-hosted agent"
      hostname
      uname -a
    displayName: Verify agent`,
      },
    ],
    tags: ['azure devops', 'agents', 'self-hosted agent', 'private aks'],
  },
  {
    id: 'itv-rcog-6',
    level: 'intermediate',
    kind: 'open',
    prompt: 'Where do you store your secrets, and how do you integrate them with the pipeline?',
    probing:
      'Key Vault as the store, a workload-identity service connection with Key Vault Secrets User, a linked variable group, explicit env mapping and what happens on rotation.',
    answer: [
      '**1. Where do you store secrets?**',
      '"I store sensitive information such as passwords, access tokens, database credentials, and connection strings in **Azure Key Vault**. I integrate Key Vault with Azure DevOps pipelines, so the pipeline reads secrets securely at deployment time without hardcoding them in YAML or storing them in Git."',
      'Azure DevOps also supports **secret variables** and **variable groups** in the Library. For production, I prefer Azure Key Vault because it gives central secret management, access control, auditing, and secret rotation.',
      '**2. How do you integrate Azure Key Vault with Azure DevOps?**',
      '**Step 1: Create secrets in Azure Key Vault**',
      '1. Create or open an Azure Key Vault.\n2. Go to **Objects > Secrets**.\n3. Create secrets such as `db-password`, `api-token`, and `connection-string`.',
      'Never put real secret values in pipeline YAML.',
      '**Step 2: Create a service connection**',
      '1. In Azure DevOps, go to **Project settings > Service connections**.\n2. Select **New service connection > Azure Resource Manager**.\n3. Choose **Workload identity federation** for authentication, so there is no stored password.\n4. Select the subscription and save.',
      "**Step 3: Grant Key Vault permissions:** give the service connection's identity permission to **read** secrets. With the Azure RBAC permission model, assign the **Key Vault Secrets User** role on the vault. Also make sure the vault's firewall allows the pipeline agent to reach it (for a private vault, use a self-hosted agent inside the network).",
      '**Step 4: Link Key Vault to a variable group**',
      '1. Go to **Pipelines > Library > Variable groups**.\n2. Create a group, for example `prod-secrets`.\n3. Turn on **Link secrets from an Azure key vault as variables**.\n4. Select the service connection and the Key Vault.\n5. Add the secrets you need and save.\n6. Authorize only the pipelines that need access.',
      'The variable group stores **references** to the secrets, not their values. Azure DevOps fetches the latest values from Key Vault every time the pipeline runs.',
      '**Step 5: Use the variable group in YAML:** `db-password` and `api-token` are the secret names in the variable group. Secret variables are **not** passed to scripts automatically, so you map them explicitly with `env`. Azure DevOps masks them as `***` in logs.',
      'Do not `echo` secrets or pass them as command-line arguments, where they can appear in process lists or logs.',
      '**Alternative:** instead of a linked variable group, use the `AzureKeyVault@2` task to fetch secrets inside one job.',
      '**3. What happens if a secret changes in Key Vault?** Suppose the database password changes:',
      '- Key Vault holds the new value.\n- A linked variable group reads secrets at pipeline run time, so the **next** run gets the new value.\n- A pipeline or application that is **already running** does not refresh a value it has already loaded.\n- If an application needs the new password, restart or refresh the workload, or use a refresh mechanism such as Key Vault references in App Service or the Secrets Store CSI driver with rotation in AKS.',
      '**4. Interview answer to remember**',
      '"I store sensitive information such as database passwords, API tokens, and connection strings in Azure Key Vault. I create an Azure Resource Manager service connection with workload identity federation, give its identity the Key Vault Secrets User role, and link the vault to a variable group in the Azure DevOps Library. Then I reference that variable group in the pipeline YAML and map the secrets to environment variables for the scripts that need them. This keeps secrets out of the repository, gives central access control and rotation, and I make sure secrets are never printed in pipeline logs."',
      '**Key distinction:** the **service connection** lets the pipeline log in to Azure, **Key Vault** stores the secrets, and the **variable group** makes selected Key Vault secrets available to the pipeline.',
    ],
    code: [
      {
        title: 'The flow',
        language: 'text',
        code: `Azure DevOps pipeline
  -> Azure Resource Manager service connection
  -> Microsoft Entra ID authentication + Key Vault permissions (RBAC)
  -> Azure Key Vault returns the allowed secrets to the pipeline`,
      },
      {
        title: 'Step 3: grant Key Vault Secrets User',
        language: 'bash',
        code: `az role assignment create \\
  --assignee <service-connection-app-id> \\
  --role "Key Vault Secrets User" \\
  --scope $(az keyvault show -n kv-prod --query id -o tsv)`,
        placeholders: ['<service-connection-app-id>'],
      },
      {
        title: 'Step 5: use the variable group in YAML',
        language: 'yaml',
        code: `trigger:
  - main

pool:
  vmImage: ubuntu-latest

variables:
  - group: prod-secrets

steps:
  - script: ./deploy.sh
    displayName: Deploy application
    env:
      DB_PASSWORD: $(db-password)
      API_TOKEN: $(api-token)`,
      },
      {
        title: 'Alternative: AzureKeyVault@2 task',
        language: 'yaml',
        code: `- task: AzureKeyVault@2
  inputs:
    azureSubscription: sc-azure-prod
    KeyVaultName: kv-prod
    SecretsFilter: 'db-password,api-token'
    RunAsPreJob: false`,
      },
    ],
    tags: ['azure devops', 'key vault', 'secrets', 'service connections'],
  },
  {
    id: 'itv-rcog-9',
    level: 'intermediate',
    kind: 'open',
    prompt: 'In how many different ways can a pipeline run in GitHub Actions?',
    probing:
      'Knowing the trigger events beyond push (pull_request, schedule, workflow_dispatch, workflow_run, workflow_call, repository_dispatch) and the GITHUB_TOKEN loop gotcha.',
    answer: [
      '**Interview-style answer**',
      'In GitHub Actions, a workflow can start in many ways, depending on the triggers we set with the `on` keyword. The main ones are push, pull request, schedule, manual run, release, and triggers from other workflows or external systems.',
      '**1. Common ways to trigger a pipeline**',
      '- **`push`**: When: Code is pushed to a branch or tag; Example: Build the application after a developer pushes code\n- **`pull_request`**: When: A pull request is opened, updated, or reopened; Example: Run tests before merging\n- **`schedule`**: When: At set times, using cron (UTC); Example: Daily security scan\n- **`workflow_dispatch`**: When: Manually from the Actions UI, CLI, or API; Example: Production deployment when approved\n- **`release`**: When: A release is published or created; Example: Build and publish release artifacts\n- **`workflow_run`**: When: Another workflow finishes; Example: Deploy after the CI workflow succeeds\n- **`workflow_call`**: When: Another workflow calls this reusable workflow; Example: Reuse a standard build workflow across repositories\n- **`repository_dispatch`**: When: An external system sends an event through the API; Example: Trigger a pipeline from another tool\n- **`issue_comment`**: When: A comment is added to an issue or pull request; Example: Run a controlled test from a `/deploy` comment',
      'These are the common ones. GitHub Actions supports many more events.',
      '**2. Examples of the most common triggers**',
      '**A. On push** runs automatically on code pushed to `main`. **B. On a pull request** runs when a pull request targets `main`. **C. On a schedule** with `0 2 * * *` runs daily at 02:00 UTC.',
      '**D. Manually:** `workflow_dispatch` adds the **Run workflow** button, with an optional input. You can also start it from the CLI: `gh workflow run deploy.yml -f environment=qa`.',
      '**E. After another workflow finishes:** `completed` also fires when CI fails, so check the `conclusion` before deploying.',
      '**F. Several triggers together** can be combined in one `on` block.',
      '**3. Real-time DevOps example (Java application deployed to AKS)**',
      '- **Push to `main`:** build, test, scan, and publish the Docker image.\n- **Pull request:** validate code and run tests.\n- **Manual trigger:** deploy to production after approval.\n- **Schedule:** regular dependency and security scans.\n- **After CI completes:** start the deployment workflow only if CI succeeded.',
      '**Gotcha:** events created by the default `GITHUB_TOKEN` (for example, a push made by a workflow) do **not** start new workflows, except `workflow_dispatch` and `repository_dispatch`. This prevents endless loops.',
      '**Interview answer to remember**',
      '"In GitHub Actions, workflows are triggered with the `on` keyword. The most common triggers are `push`, `pull_request`, `schedule`, and `workflow_dispatch`. Workflows can also run on releases, after another workflow completes, when called as a reusable workflow, or from external events through `repository_dispatch`. I use `push` for automatic builds, `pull_request` for validation before merging, and `workflow_dispatch` for controlled production deployments."',
      '**Remember:** `on` defines **when** a workflow starts. Jobs and steps define **what** happens after it starts.',
    ],
    code: [
      {
        title: 'A. Automatically on code push',
        language: 'yaml',
        code: `on:
  push:
    branches:
      - main`,
      },
      {
        title: 'B. On a pull request',
        language: 'yaml',
        code: `on:
  pull_request:
    branches:
      - main`,
      },
      {
        title: 'C. On a schedule (02:00 UTC daily)',
        language: 'yaml',
        code: `on:
  schedule:
    - cron: '0 2 * * *'`,
      },
      {
        title: 'D. Manually, with an input',
        language: 'yaml',
        code: `on:
  workflow_dispatch:
    inputs:
      environment:
        description: Target environment
        type: choice
        options: [dev, qa, prod]`,
      },
      {
        title: 'E. After another workflow finishes',
        language: 'yaml',
        code: `on:
  workflow_run:
    workflows: ["CI Pipeline"]
    types:
      - completed

jobs:
  deploy:
    if: \${{ github.event.workflow_run.conclusion == 'success' }}
    runs-on: ubuntu-latest
    steps:
      - run: echo "Deploying"`,
      },
      {
        title: 'F. Several triggers together',
        language: 'yaml',
        code: `on:
  push:
    branches: [main]
  pull_request:
    branches: [main]
  workflow_dispatch:`,
      },
    ],
    tags: ['github actions', 'triggers', 'workflow_run', 'workflow_dispatch'],
  },
  {
    id: 'itv-rcog-10',
    level: 'basic',
    kind: 'open',
    prompt: 'What resources have you used in Azure DevOps?',
    probing:
      'Hands-on familiarity with the Azure DevOps services and pipeline building blocks, backed by a real end-to-end example.',
    answer: [
      '**Interview-style answer**',
      '"In my project, I used Azure DevOps to manage source code, automate CI/CD pipelines, store packages, manage configuration, and track work. The main services I worked with are Azure Repos, Azure Pipelines, Azure Artifacts, and Azure Boards. Inside pipelines I also used service connections, agent pools, variable groups, environments, and templates."',
      '**1. Main Azure DevOps services**',
      '- **Azure Repos**: Purpose: Git repositories for source code; Example: Developers push Java and React code; branch policies protect `main`\n- **Azure Pipelines**: Purpose: Build, test, and deploy automation; Example: Build Docker images and deploy to AKS\n- **Azure Artifacts**: Purpose: Package feeds (Maven, npm, NuGet, Python); Example: Store internal Maven libraries and cache public packages via upstream sources\n- **Azure Boards**: Purpose: Work items, sprints, and bugs; Example: Track sprint tasks and production issues\n- **Azure Test Plans**: Purpose: Manual and exploratory testing; Example: QA team validates application features',
      '**2. Other important Azure DevOps components**',
      '- **Agent pools**: Microsoft-hosted or self-hosted machines that run jobs\n- **Service connections**: Let pipelines authenticate to Azure, ACR, Kubernetes, SonarQube, and other services\n- **Variable groups**: Share configuration variables (and Key Vault secrets) across pipelines\n- **Secure files**: Store files such as certificates or signing keys securely\n- **Library**: Central place for variable groups and secure files\n- **Environments**: Deployment targets (for example `dev`, `prod`) with deployment history\n- **Approvals and checks**: Manual approval, branch control, business hours, and other gates before deploying\n- **Pipeline templates**: Reusable YAML steps, jobs, and stages\n- **Branch policies**: Require PR reviews, build validation, and linked work items before merging\n- **Wiki and dashboards**: Project documentation and team status views',
      '**3. Real-time DevOps project example:** a React frontend and Java Spring Boot backend deployed to AKS.',
      'Azure Boards tracks the related tasks and bugs, while environments with approvals and checks control production deployments.',
      '**Interview answer to remember**',
      '"In Azure DevOps, I mainly use Azure Repos for source control with branch policies, and Azure Pipelines for CI/CD. I also work with agent pools, service connections, variable groups, templates, environments, and approvals. For example, I configured a pipeline that builds a Java application, pushes a Docker image to ACR, and deploys it to AKS. Secrets come from Azure Key Vault through a variable group, and production deployments need approval on the environment."',
      '**Interview tip:** if the interviewer asks which resources **you** used, talk only about the components you actually configured, and be ready with one real example for each.',
    ],
    code: [
      {
        title: 'End-to-end flow',
        language: 'text',
        code: `Azure Repos (code + branch policies)
  -> Azure Pipelines: build, test, SonarQube scan
  -> Docker image pushed to Azure Container Registry
  -> Service connection + variable groups + Key Vault secrets
  -> Azure Pipelines deploys to AKS (dev -> qa -> prod environments)`,
      },
    ],
    tags: ['azure devops', 'azure repos', 'azure pipelines', 'azure artifacts'],
  },
  {
    id: 'itv-rcog-12',
    level: 'intermediate',
    kind: 'open',
    prompt: 'What are templates in Azure DevOps?',
    probing:
      'The template types (step, job, stage, variable, extends), parameters, versioned shared template repositories and compile-time expansion.',
    answer: [
      '**Interview-style answer**',
      'In Azure DevOps, YAML **templates** let us reuse common pipeline code across many pipelines instead of copying it.',
      'For example, if we have Dev, QA, UAT, and Production pipelines, we create one common build template and use it in all four. When the build steps change, we update the template once instead of every pipeline.',
      '**1. Types of templates**',
      '- **Step template**: Purpose: Reuses a group of steps; Example: Build and test a Java application\n- **Job template**: Purpose: Reuses a complete job; Example: Build plus security scanning\n- **Stage template**: Purpose: Reuses a whole stage; Example: Deploy an application to an environment\n- **Variable template**: Purpose: Reuses a set of variables; Example: Common application configuration\n- **Extends template**: Purpose: Defines the whole pipeline structure that others must follow; Example: Enforce mandatory security scans in every pipeline',
      '**2. Example: step template with parameters:** `templates/build.yml` is called from `azure-pipelines.yml`.',
      'When the pipeline runs, Azure DevOps expands the template and runs its steps. Parameters make one template work for different services.',
      '**3. Example: variable template:** `templates/dev-variables.yml` holds the variables and the pipeline includes it.',
      '**4. Example: templates from a shared repository:** teams usually keep templates in a central repository and reference them from every service.',
      'Pinning a tag means a template change does not break every pipeline at once.',
      '**5. How templates help in real projects:** with many microservices on AKS, each service would otherwise repeat build, test, SonarQube scan, Docker build, and deploy steps.',
      'Benefits: less duplicate YAML, consistent builds and deployments, easier maintenance, and fewer mistakes. With **extends templates** plus a **required template check** on environments, you can also enforce that every production deployment goes through approved security steps.',
      '**Interview answer to remember**',
      '"In Azure DevOps, templates are reusable YAML files that stop us from duplicating pipeline code. There are step, job, stage, and variable templates, plus extends templates that enforce a standard pipeline structure. In a microservices project, I keep common templates for Maven build, Docker image creation, and Kubernetes deployment in a shared repository, pass parameters such as the service name, and reuse them across all pipelines. If the build process changes, I update the template once."',
      '**Important:** templates are expanded when the pipeline is **compiled**, before it runs. They are different from **variable groups**, which store variables centrally in the Library and can hold secrets.',
    ],
    code: [
      {
        title: 'templates/build.yml',
        language: 'yaml',
        code: `parameters:
  - name: mavenGoals
    type: string
    default: 'clean package'

steps:
  - script: mvn \${{ parameters.mavenGoals }}
    displayName: Build Java application

  - script: echo "Build completed"
    displayName: Verify build`,
      },
      {
        title: 'azure-pipelines.yml calling the template',
        language: 'yaml',
        code: `trigger:
  - main

pool:
  vmImage: ubuntu-latest

steps:
  - checkout: self

  - template: templates/build.yml
    parameters:
      mavenGoals: 'clean verify'`,
      },
      {
        title: 'templates/dev-variables.yml',
        language: 'yaml',
        code: `variables:
  environmentName: dev
  appName: myapp`,
      },
      {
        title: 'Using the variable template',
        language: 'yaml',
        code: `variables:
  - template: templates/dev-variables.yml

steps:
  - script: |
      echo "Environment: $(environmentName)"
      echo "Application: $(appName)"`,
      },
      {
        title: 'Templates from a shared repository',
        language: 'yaml',
        code: `resources:
  repositories:
    - repository: templates
      type: git
      name: Platform/pipeline-templates
      ref: refs/tags/v1.2.0   # pin a version

stages:
  - template: stages/build-and-deploy.yml@templates
    parameters:
      serviceName: orders-api`,
      },
      {
        title: 'Shared templates across services',
        language: 'text',
        code: `Shared Azure DevOps templates
  |-- Service A (Java API)
  |-- Service B (React UI)
  |-- Service C (Worker)`,
      },
    ],
    tags: ['azure devops', 'templates', 'yaml pipelines'],
  },
]
