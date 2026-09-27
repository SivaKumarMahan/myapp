import type { Topic } from '../../../../types'

export const githubActions: Topic = {
  id: 'az4-github-actions',
  title: 'GitHub Actions: workflows, secrets, environments, reuse and OIDC to Azure',
  domainId: 'az4-pipelines',
  difficulty: 'intermediate',
  estimatedMinutes: 40,
  order: 5,
  tags: [
    'github-actions',
    'workflows',
    'secrets',
    'environments',
    'reusable-workflows',
    'composite-actions',
    'oidc',
    'workload-identity-federation',
  ],
  oneLiner:
    'Automate build and deployment in GitHub with workflow files, protect them with secrets and environments, reuse them across repos, and sign in to Azure without storing a secret.',
  explanation: [
    '**GitHub Actions** is GitHub’s built-in CI/CD. A **workflow** is a YAML file in `.github/workflows/` that runs when an **event** happens - a push, a pull request, a schedule, a manual `workflow_dispatch`, a release, or a call from another workflow.',
    'A workflow contains **jobs**. Each job runs on a **runner** (`runs-on`) and is a list of **steps**. A step either runs a shell command (`run:`) or uses an **action** (`uses: actions/checkout@v4`) - a reusable unit published in a repository or the Marketplace. Jobs run in parallel unless you declare `needs`.',
    'Configuration and credentials come from **variables** (`vars.NAME`, plain text) and **secrets** (`secrets.NAME`, encrypted and masked in logs). Both can be defined at organization, repository or **environment** level. An **environment** (for example `production`) adds protection rules: required reviewers, a wait timer, and which branches may deploy to it.',
    'To avoid copy-paste, GitHub offers two reuse mechanisms. A **reusable workflow** (`on: workflow_call`) is a whole workflow - jobs, runners, environments - that other workflows call as a job. A **composite action** (`runs: using: composite` in `action.yml`) bundles several steps into one step you can use inside any job.',
    'To deploy to Azure without storing a client secret, use **OpenID Connect (OIDC)**. The job requests a short-lived token from GitHub, `azure/login` exchanges it with Microsoft Entra ID via a **federated identity credential** on an app registration or user-assigned managed identity, and the job gets an Azure access token. No secret ever exists to leak or rotate.',
  ],
  whyItMatters: [
    'AZ-400 covers GitHub Actions alongside Azure Pipelines throughout the pipelines domain: creating workflows, choosing triggers, managing secrets and variables, using environments for approvals, reusing workflow logic, and authenticating to Azure with workload identity federation.',
    'Many exam questions contrast the two platforms. You should be able to map concepts: Azure Pipelines stage/job/step vs Actions job/step; variable groups vs organization variables and secrets; environments with approvals in both; templates vs reusable workflows and composite actions.',
    'OIDC is now the recommended way to authenticate from CI to Azure. Long-lived client secrets in `AZURE_CREDENTIALS` are a common finding in security reviews, and the fix is a federated credential plus two lines of YAML.',
  ],
  howItWorks: [
    'GitHub matches the event against every workflow file on the relevant ref. Filters such as `branches`, `paths` and `types` narrow it; `workflow_dispatch` adds a Run workflow button with typed `inputs`.',
    'Each job is queued to a runner matching `runs-on`. Jobs are independent machines: to pass files use `actions/upload-artifact` and `actions/download-artifact`; to pass values use job `outputs`, read with `needs.<job>.outputs.<name>`.',
    "Expressions `${{ }}` read **contexts**: `github` (event, ref, sha, actor), `env`, `vars`, `secrets`, `matrix`, `needs`, `inputs`, `steps`. `if:` conditions on jobs and steps use them, for example `if: github.ref == 'refs/heads/main'`.",
    'Every run gets an automatic **GITHUB_TOKEN** scoped to the repository. The `permissions` key sets exactly what it can do (`contents: read`, `packages: write`, `id-token: write` ...). Setting permissions explicitly and minimally is best practice.',
    'When a job declares `environment: production`, it waits for the environment protection rules (reviewers, wait timer, branch policy) before starting, and only then can it read that environment’s secrets and variables. Deployments are recorded against the environment.',
    'For OIDC, the job needs `permissions: id-token: write`. `azure/login@v2` requests a token with audience `api://AzureADTokenExchange` from issuer `https://token.actions.githubusercontent.com`. Entra ID accepts it only if the token **subject** exactly matches a federated credential, for example `repo:contoso/web:environment:production` or `repo:contoso/web:ref:refs/heads/main`.',
    '`concurrency` groups prevent two runs from deploying at once, and `strategy.matrix` fans a job out across versions or operating systems, with `fail-fast` and `max-parallel` controls.',
  ],
  diagrams: [
    {
      kind: 'sequence',
      title: 'OIDC login from a workflow to Azure',
      caption:
        'No secret is stored anywhere. Entra ID trusts the GitHub token only when its subject matches a federated credential exactly.',
      participants: [
        { id: 'job', label: 'Workflow job' },
        { id: 'gh', label: 'GitHub OIDC provider' },
        { id: 'entra', label: 'Microsoft Entra ID' },
        { id: 'arm', label: 'Azure Resource Manager' },
      ],
      messages: [
        { from: 'job', to: 'gh', label: 'Request ID token (id-token: write)' },
        {
          from: 'gh',
          to: 'job',
          label: 'JWT with sub repo:org/repo:environment:prod',
          kind: 'return',
        },
        { from: 'job', to: 'entra', label: 'Exchange JWT for client id and tenant' },
        {
          from: 'entra',
          to: 'job',
          label: 'Azure access token if subject matches',
          kind: 'return',
        },
        { from: 'job', to: 'arm', label: 'Deploy with the access token' },
      ],
    },
    {
      kind: 'decision',
      title: 'Reusable workflow or composite action',
      caption:
        'Reuse a whole pipeline with a reusable workflow; reuse a few steps inside jobs with a composite action.',
      question: 'What are you trying to share?',
      branches: [
        {
          condition: 'whole jobs, runners and environments',
          result: 'Reusable workflow',
          detail: 'on: workflow_call, used as jobs.x.uses',
          tone: 'accent',
        },
        {
          condition: 'a sequence of steps inside a job',
          result: 'Composite action',
          detail: 'action.yml with runs.using: composite',
        },
        {
          condition: 'complex logic with its own code',
          result: 'JavaScript or container action',
          detail: 'Published and versioned like a library',
        },
      ],
    },
  ],
  keyObjects: [
    {
      kind: 'Workflow file (.github/workflows/*.yml)',
      purpose: 'Defines triggers, permissions, jobs and steps for one automation.',
      fields: [
        {
          path: 'on',
          meaning:
            'Events: push, pull_request, schedule, workflow_dispatch, workflow_call, release...',
          required: true,
        },
        {
          path: 'permissions',
          meaning: 'Scopes granted to GITHUB_TOKEN for this workflow or job.',
        },
        { path: 'concurrency', meaning: 'Group name and cancel-in-progress to serialise runs.' },
        { path: 'jobs.<id>.runs-on', meaning: 'Runner label(s) or group.', required: true },
        { path: 'jobs.<id>.needs / if', meaning: 'Ordering and conditions between jobs.' },
        {
          path: 'jobs.<id>.environment',
          meaning: 'Target environment; applies protection rules and exposes its secrets.',
        },
        { path: 'jobs.<id>.outputs', meaning: 'Values later jobs read via needs.<id>.outputs.' },
      ],
    },
    {
      kind: 'Environment',
      purpose: 'A deployment target with protection rules and its own secrets and variables.',
      fields: [
        {
          path: 'Required reviewers',
          meaning: 'Up to a handful of users or teams who must approve.',
        },
        { path: 'Wait timer', meaning: 'Minutes to wait before the job may proceed.' },
        { path: 'Deployment branches and tags', meaning: 'Restrict which refs may deploy here.' },
        {
          path: 'Environment secrets / variables',
          meaning: 'Only available to jobs that reference the environment.',
        },
      ],
    },
    {
      kind: 'Federated identity credential (Microsoft Entra ID)',
      purpose:
        'Trust relationship that lets an external OIDC token act as an app registration or managed identity.',
      fields: [
        {
          path: 'issuer',
          meaning: 'https://token.actions.githubusercontent.com for GitHub Actions.',
          required: true,
        },
        {
          path: 'subject',
          meaning: 'Exact subject claim, e.g. repo:org/repo:environment:production.',
          required: true,
        },
        { path: 'audiences', meaning: 'api://AzureADTokenExchange.', required: true },
      ],
    },
    {
      kind: 'Composite action (action.yml)',
      purpose: 'A reusable step made of other steps.',
      fields: [
        { path: 'inputs / outputs', meaning: 'Parameters and results of the action.' },
        {
          path: 'runs.using',
          meaning: 'composite (also node20 or docker for other action types).',
          required: true,
        },
        {
          path: 'runs.steps[].shell',
          meaning: 'Required on every run step in a composite action.',
        },
      ],
    },
  ],
  realWorldExample: {
    title: 'Twelve repos, one deployment workflow, zero stored secrets',
    story: [
      'A SaaS company had twelve microservice repositories, each with its own 150-line deploy workflow, each holding an `AZURE_CREDENTIALS` secret with a client secret that expired every year - usually on a weekend.',
      'The platform team wrote one reusable workflow in `contoso/platform-workflows` that takes `app-name` and `environment` inputs, logs in with OIDC, runs Bicep what-if and deploys. Each service repo shrank to a ten-line caller workflow.',
      'For each repo they created a user-assigned managed identity with two federated credentials, one per GitHub environment (`staging`, `production`), and assigned it a role only on that service’s resource group. The production environment requires a reviewer from the service team and allows only `main`.',
      'Secret rotation disappeared from the calendar. When one service needed a new deploy step, the platform team released `v2` of the reusable workflow and repos moved to it at their own pace by changing the ref.',
    ],
  },
  yamlExamples: [
    {
      title: 'Build, test and deploy to Azure with OIDC and an environment',
      language: 'yaml',
      explanation:
        'Only the deploy job gets id-token: write. The client, tenant and subscription IDs are identifiers, not secrets, so they are variables here.',
      code: `name: web-ci-cd
on:
  push:
    branches: [main]
  pull_request:
    branches: [main]
  workflow_dispatch:

permissions:
  contents: read

concurrency:
  group: web-\${{ github.ref }}
  cancel-in-progress: true

jobs:
  build:
    runs-on: ubuntu-latest
    strategy:
      matrix:
        node: [20, 22]
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: \${{ matrix.node }}
          cache: npm
      - run: npm ci
      - run: npm test
      - run: npm run build
      - uses: actions/upload-artifact@v4
        if: matrix.node == 22
        with:
          name: site
          path: dist/

  deploy:
    needs: build
    if: github.event_name == 'push' && github.ref == 'refs/heads/main'
    runs-on: ubuntu-latest
    environment: production
    permissions:
      contents: read
      id-token: write
    steps:
      - uses: actions/download-artifact@v4
        with:
          name: site
          path: dist
      - uses: azure/login@v2
        with:
          client-id: \${{ vars.AZURE_CLIENT_ID }}
          tenant-id: \${{ vars.AZURE_TENANT_ID }}
          subscription-id: \${{ vars.AZURE_SUBSCRIPTION_ID }}
      - uses: azure/webapps-deploy@v3
        with:
          app-name: app-contoso-web
          package: dist`,
    },
    {
      title: 'A reusable workflow and its caller',
      language: 'yaml',
      explanation:
        'The called workflow declares inputs and secrets under workflow_call. The caller uses it as a job; secrets: inherit passes the caller’s secrets through.',
      code: `# contoso/platform-workflows/.github/workflows/deploy-webapp.yml
name: deploy-webapp
on:
  workflow_call:
    inputs:
      app-name:
        type: string
        required: true
      environment:
        type: string
        required: true
    outputs:
      url:
        value: \${{ jobs.deploy.outputs.url }}

jobs:
  deploy:
    runs-on: ubuntu-latest
    environment: \${{ inputs.environment }}
    permissions:
      id-token: write
      contents: read
    outputs:
      url: \${{ steps.deploy.outputs.webapp-url }}
    steps:
      - uses: actions/checkout@v4
      - uses: azure/login@v2
        with:
          client-id: \${{ vars.AZURE_CLIENT_ID }}
          tenant-id: \${{ vars.AZURE_TENANT_ID }}
          subscription-id: \${{ vars.AZURE_SUBSCRIPTION_ID }}
      - id: deploy
        uses: azure/webapps-deploy@v3
        with:
          app-name: \${{ inputs.app-name }}

---
# contoso/orders/.github/workflows/release.yml
name: release
on:
  push:
    branches: [main]
jobs:
  prod:
    uses: contoso/platform-workflows/.github/workflows/deploy-webapp.yml@v2
    with:
      app-name: app-orders-prod
      environment: production
    secrets: inherit`,
    },
    {
      title: 'A composite action',
      language: 'yaml',
      explanation:
        'Lives in .github/actions/setup-app/action.yml and is used with uses: ./.github/actions/setup-app. Note the shell on each run step.',
      code: `name: setup-app
description: Install Node, restore cache and install dependencies
inputs:
  node-version:
    description: Node.js version
    default: '22'
runs:
  using: composite
  steps:
    - uses: actions/setup-node@v4
      with:
        node-version: \${{ inputs.node-version }}
        cache: npm
    - run: npm ci
      shell: bash
    - run: echo "Node $(node --version) ready"
      shell: bash`,
    },
  ],
  imperative: [
    {
      command:
        'az ad app federated-credential create --id <app-id> --parameters \'{"name":"gh-prod","issuer":"https://token.actions.githubusercontent.com","subject":"repo:<owner>/<repo>:environment:production","audiences":["api://AzureADTokenExchange"]}\'',
      what: 'Adds a federated credential to an app registration that trusts workflow jobs using the production environment.',
      expected: 'JSON for the new credential with the subject you set.',
      placeholders: ['<app-id>', '<owner>', '<repo>'],
    },
    {
      command:
        'az identity federated-credential create --name gh-main --identity-name <uami> --resource-group <rg> --issuer https://token.actions.githubusercontent.com --subject repo:<owner>/<repo>:ref:refs/heads/main --audiences api://AzureADTokenExchange',
      what: 'The same trust on a user-assigned managed identity, for jobs running on the main branch with no environment.',
      placeholders: ['<uami>', '<rg>', '<owner>', '<repo>'],
    },
    {
      command: 'gh variable set AZURE_CLIENT_ID --body <client-id> --env production',
      what: 'Stores the identity client ID as an environment variable (not secret) for the production environment.',
      placeholders: ['<client-id>'],
    },
    {
      command: 'gh secret set SQL_ADMIN_PASSWORD --env production',
      what: 'Prompts for a value and stores it encrypted as an environment secret.',
      expected: '✓ Set Actions secret SQL_ADMIN_PASSWORD for production',
    },
    {
      command: 'gh workflow run deploy.yml --ref main -f environment=staging',
      what: 'Triggers a workflow_dispatch workflow on main with an input value.',
      expected: '✓ Created workflow_dispatch event for deploy.yml at main',
    },
  ],
  declarative: {
    steps: [
      'Create a user-assigned managed identity (or app registration) and give it a role scoped to the target resource group.',
      'Add one federated credential per subject you need (environment, branch, or pull_request).',
      'Create the GitHub environment with reviewers and deployment branch rules.',
      'Store client, tenant and subscription IDs as variables; no Azure secret is needed.',
      'Add permissions: id-token: write and azure/login@v2 to the deploy job.',
    ],
    code: [
      {
        title: 'Managed identity, federated credential and role assignment (Bicep)',
        language: 'bicep',
        code: `param location string = resourceGroup().location
param repo string = 'contoso/orders'

resource uami 'Microsoft.ManagedIdentity/userAssignedIdentities@2023-01-31' = {
  name: 'id-gh-orders'
  location: location
}

resource fic 'Microsoft.ManagedIdentity/userAssignedIdentities/federatedIdentityCredentials@2023-01-31' = {
  parent: uami
  name: 'gh-production'
  properties: {
    issuer: 'https://token.actions.githubusercontent.com'
    subject: 'repo:\${repo}:environment:production'
    audiences: [
      'api://AzureADTokenExchange'
    ]
  }
}

// Website Contributor on this resource group
var websiteContributor = subscriptionResourceId('Microsoft.Authorization/roleDefinitions', 'de139f84-1756-47ae-9be6-808fbbe84772')

resource ra 'Microsoft.Authorization/roleAssignments@2022-04-01' = {
  name: guid(resourceGroup().id, uami.id, websiteContributor)
  properties: {
    roleDefinitionId: websiteContributor
    principalId: uami.properties.principalId
    principalType: 'ServicePrincipal'
  }
}

output clientId string = uami.properties.clientId`,
      },
    ],
  },
  verification: [
    {
      command: 'gh run list --workflow web-ci-cd --limit 5',
      what: 'Lists the latest runs with event, branch and status.',
      expected: 'completed success push main for the latest deployment.',
    },
    {
      command: 'gh run watch <run-id> --exit-status',
      what: 'Follows a run until it finishes and exits non-zero if it failed.',
      placeholders: ['<run-id>'],
    },
    {
      command:
        'az identity federated-credential list --identity-name <uami> --resource-group <rg> -o table',
      what: 'Shows which subjects the identity trusts, to compare with the failing workflow.',
      placeholders: ['<uami>', '<rg>'],
    },
  ],
  troubleshooting: [
    {
      command: 'gh run view <run-id> --log-failed',
      what: 'Prints only the logs of failed steps.',
      expected:
        'For OIDC problems, AADSTS700213: No matching federated identity record found for presented assertion subject.',
      placeholders: ['<run-id>'],
    },
    {
      command: 'az ad app federated-credential list --id <app-id> --query "[].subject" -o tsv',
      what: 'AADSTS700213 means the token subject differs from every federated credential. A job with environment: production sends ...:environment:production, not ...:ref:refs/heads/main.',
      placeholders: ['<app-id>'],
    },
    {
      command: 'gh api repos/<owner>/<repo>/environments --jq ".environments[].name"',
      what: 'Checks that the environment the job references exists and is spelled the same way - a typo silently creates a new unprotected environment.',
      placeholders: ['<owner>', '<repo>'],
    },
  ],
  commonMistakes: [
    'Forgetting `permissions: id-token: write`, so azure/login fails to fetch an OIDC token.',
    'Creating a federated credential for the branch while the job uses an environment. The subject becomes environment-based, and the login fails with AADSTS700213.',
    'Storing a client secret in AZURE_CREDENTIALS when OIDC is available, then having to rotate it.',
    'Leaving GITHUB_TOKEN with broad default write permissions instead of declaring minimal permissions.',
    'Omitting `shell:` on run steps inside a composite action - it is required there.',
    'Referencing third-party actions by a mutable tag like @main. Pin to a release tag, or a full commit SHA for high-trust workflows.',
    'Expecting secrets to be available to workflows triggered by pull_request from forks. They are not, by design.',
  ],
  examTips: [
    '"Authenticate to Azure without storing credentials" = OIDC / workload identity federation: `id-token: write`, `azure/login`, federated credential.',
    'Manual approval before production = **environment** with **required reviewers**.',
    'Share an entire workflow across repos = **reusable workflow** (`workflow_call`). Share steps = **composite action**.',
    'Trigger a workflow manually with inputs = `workflow_dispatch`; from the CLI = `gh workflow run`.',
    'Jobs run in parallel unless linked with `needs`; outputs flow through `needs.<job>.outputs`.',
    'Secrets are masked in logs and not passed to fork PR workflows; variables (`vars`) are plain text.',
  ],
  summary: [
    'Workflows in .github/workflows respond to events and contain jobs of steps that run on runners.',
    'Secrets and variables exist at org, repo and environment level; environments add reviewers, wait timers and branch rules.',
    'Reusable workflows share whole jobs; composite actions share steps.',
    'OIDC lets a job sign in to Azure through a federated credential whose subject must match exactly.',
    'Set GITHUB_TOKEN permissions explicitly and minimally.',
  ],
  practice: [
    {
      id: 'az4-github-actions-p1',
      level: 'beginner',
      prompt:
        'Two jobs, build and deploy, run at the same time and deploy fails because the artifact does not exist yet. What single change fixes the order?',
      answer:
        'Add needs: build to the deploy job so it waits for build to succeed before starting.',
    },
    {
      id: 'az4-github-actions-p2',
      level: 'intermediate',
      prompt:
        'A deploy job uses environment: production and azure/login with OIDC. It fails with AADSTS700213. The federated credential subject is repo:contoso/web:ref:refs/heads/main. What is wrong?',
      answer:
        'Because the job targets an environment, the token subject is repo:contoso/web:environment:production. Add a federated credential with that subject (or remove the environment, which is not advisable).',
    },
    {
      id: 'az4-github-actions-p3',
      level: 'intermediate',
      prompt:
        'Ten repositories need the same four setup steps (install tools, restore cache, authenticate to a feed) inside their existing build jobs. Which reuse mechanism fits best?',
      answer:
        'A composite action: it packages the steps into one uses: step that fits inside each repo’s existing job. A reusable workflow would replace whole jobs, which is more than they need.',
    },
    {
      id: 'az4-github-actions-p4',
      level: 'advanced',
      prompt:
        'Explain why OIDC federation is more secure than a service principal client secret stored as a GitHub secret.',
      answer:
        'With OIDC there is no long-lived credential: each job gets a short-lived token bound to the repo and environment or branch, which Entra ID accepts only if it matches the federated credential. There is nothing to leak from logs or settings and nothing to rotate, and trust can be narrowed to one environment.',
    },
  ],
  lab: {
    title: 'Deploy to Azure from GitHub Actions with OIDC and a protected environment',
    scenario:
      'Create a user-assigned managed identity that trusts your repository’s production environment, and deploy a static page to an App Service from a workflow with no stored Azure secret.',
    prerequisites: [
      'A GitHub repository you own and the gh CLI signed in',
      'An Azure subscription and Azure CLI',
    ],
    tasks: [
      {
        instruction: 'Create a resource group, a Linux App Service plan (B1) and a web app.',
      },
      {
        instruction:
          'Create a user-assigned managed identity and grant it Website Contributor on the resource group.',
      },
      {
        instruction:
          'Add a federated credential with subject repo:<owner>/<repo>:environment:production.',
      },
      {
        instruction:
          'Create a production environment in the repo with yourself as required reviewer, and set AZURE_CLIENT_ID, AZURE_TENANT_ID and AZURE_SUBSCRIPTION_ID as variables.',
      },
      {
        instruction:
          'Write a workflow with a build job that uploads an artifact and a deploy job that uses the environment, OIDC login and azure/webapps-deploy.',
      },
      {
        instruction: 'Push to main, approve the deployment, and browse to the web app.',
      },
    ],
    solution: [
      {
        title: 'Azure and GitHub setup',
        language: 'bash',
        code: `RG=rg-az400-gha
APP=app-az400-gha-$RANDOM
az group create -n $RG -l westeurope
az appservice plan create -n plan-az400-gha -g $RG --is-linux --sku B1
az webapp create -n $APP -g $RG -p plan-az400-gha --runtime "NODE:20-lts"

az identity create -n id-gh-lab -g $RG
CLIENT_ID=$(az identity show -n id-gh-lab -g $RG --query clientId -o tsv)
PRINCIPAL_ID=$(az identity show -n id-gh-lab -g $RG --query principalId -o tsv)
az role assignment create --assignee-object-id $PRINCIPAL_ID \\
  --assignee-principal-type ServicePrincipal \\
  --role "Website Contributor" --scope $(az group show -n $RG --query id -o tsv)

az identity federated-credential create -n gh-production \\
  --identity-name id-gh-lab -g $RG \\
  --issuer https://token.actions.githubusercontent.com \\
  --subject "repo:<owner>/<repo>:environment:production" \\
  --audiences api://AzureADTokenExchange

gh api -X PUT repos/<owner>/<repo>/environments/production
gh variable set AZURE_CLIENT_ID --body "$CLIENT_ID" --env production
gh variable set AZURE_TENANT_ID --body "$(az account show --query tenantId -o tsv)" --env production
gh variable set AZURE_SUBSCRIPTION_ID --body "$(az account show --query id -o tsv)" --env production
gh variable set WEBAPP_NAME --body "$APP"`,
      },
      {
        title: '.github/workflows/deploy.yml',
        language: 'yaml',
        code: `name: deploy
on:
  push:
    branches: [main]

permissions:
  contents: read

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: mkdir site && echo "<h1>Deployed with OIDC</h1>" > site/index.html
      - uses: actions/upload-artifact@v4
        with:
          name: site
          path: site

  deploy:
    needs: build
    runs-on: ubuntu-latest
    environment: production
    permissions:
      contents: read
      id-token: write
    steps:
      - uses: actions/download-artifact@v4
        with:
          name: site
          path: site
      - uses: azure/login@v2
        with:
          client-id: \${{ vars.AZURE_CLIENT_ID }}
          tenant-id: \${{ vars.AZURE_TENANT_ID }}
          subscription-id: \${{ vars.AZURE_SUBSCRIPTION_ID }}
      - uses: azure/webapps-deploy@v3
        with:
          app-name: \${{ vars.WEBAPP_NAME }}
          package: site`,
      },
    ],
    verification: [
      {
        command: 'gh run list --workflow deploy.yml --limit 1',
        what: 'The latest run completed successfully after your approval.',
        expected: 'completed  success  deploy  main  push',
      },
      {
        command: 'curl -s https://<app-name>.azurewebsites.net',
        what: 'Returns the page deployed by the workflow.',
        expected: '<h1>Deployed with OIDC</h1>',
        placeholders: ['<app-name>'],
      },
    ],
    cleanup: [
      {
        command: 'az group delete -n rg-az400-gha --yes --no-wait',
        what: 'Deletes the web app, plan and managed identity (with its federated credential).',
      },
      {
        command: 'gh api -X DELETE repos/<owner>/<repo>/environments/production',
        what: 'Removes the lab environment and its variables from the repository.',
        placeholders: ['<owner>', '<repo>'],
      },
    ],
  },
  relatedTopicIds: [
    'az4-yaml-pipelines',
    'az4-agents-runners',
    'az4-environments-approvals',
    'az4-pipeline-security',
    'az4-pipeline-templates',
  ],
  docs: [
    {
      title: 'Workflow syntax for GitHub Actions',
      url: 'https://docs.github.com/actions/writing-workflows/workflow-syntax-for-github-actions',
    },
    {
      title: 'Reusing workflows',
      url: 'https://docs.github.com/actions/sharing-automations/reusing-workflows',
    },
    {
      title: 'Managing environments for deployment',
      url: 'https://docs.github.com/actions/managing-workflow-runs-and-deployments/managing-deployments/managing-environments-for-deployment',
    },
    {
      title: 'Use GitHub Actions to connect to Azure (OIDC)',
      url: 'https://learn.microsoft.com/azure/developer/github/connect-from-azure-openid-connect',
    },
  ],
}
