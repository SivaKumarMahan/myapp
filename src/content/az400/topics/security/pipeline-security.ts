import type { Topic } from '../../../types'

export const pipelineSecurity: Topic = {
  id: 'az4-pipeline-security',
  title: 'Pipeline identities, service connections and secrets',
  domainId: 'az4-security',
  difficulty: 'intermediate',
  estimatedMinutes: 40,
  order: 1,
  tags: [
    'service-principal',
    'managed-identity',
    'workload-identity-federation',
    'oidc',
    'service-connections',
    'github-token',
    'github-apps',
    'pat',
    'key-vault',
    'secure-files',
  ],
  oneLiner:
    'Give pipelines the least-privileged identity possible (workload identity federation first), keep secrets in Key Vault or platform secret stores, and lock down service connections, tokens and permissions.',
  explanation: [
    'A pipeline that deploys to Azure has to prove who it is. There are three kinds of Microsoft Entra identity it can use. A **service principal** is an identity for an app registration; it traditionally authenticates with a **client secret** or **certificate** that you must store and rotate. A **managed identity** is a service principal whose credentials Azure manages for you, but it only works for code running on an Azure resource (a VM, a scale set agent, an App Service), so it fits **self-hosted agents and runners on Azure**. **Workload identity federation** lets an external identity provider (Azure DevOps or GitHub, via OpenID Connect) exchange a short-lived token for an Entra access token, trusted through a **federated credential** on an app registration or a user-assigned managed identity. No secret exists at all.',
    'For 2026, the recommended default is **workload identity federation**. In Azure DevOps, an Azure Resource Manager **service connection** created with workload identity federation needs no secret and no expiry management; existing secret-based connections can be converted. In GitHub Actions, the `azure/login` action with `client-id`, `tenant-id`, `subscription-id` and `permissions: id-token: write` does the same with OIDC.',
    'The pipeline also needs tokens for the DevOps platform itself. In GitHub, every workflow run gets an automatic **GITHUB_TOKEN**, scoped to the repository and expiring when the job ends; you narrow it with the `permissions:` key. A **GitHub App** is the right identity for cross-repository automation: fine-grained permissions, installation-scoped, short-lived installation tokens. **Personal access tokens (PATs)** act as a user, so prefer fine-grained PATs with an expiry, and only when nothing else fits. Azure DevOps has PATs too (scoped, with expiry, and organization admins can restrict them) and a **job access token** for the project build service identity, exposed as `System.AccessToken`.',
    'Secrets that are not identities (API keys, connection strings for third parties, signing passwords) belong in **Azure Key Vault**, **GitHub secrets** (repository, environment or organization level) or Azure DevOps **secret variables** and **variable groups** (optionally linked to Key Vault). Files such as signing certificates, provisioning profiles or SSH keys go into Azure DevOps **Secure files**, downloaded at runtime with the DownloadSecureFile task and deleted when the job ends.',
  ],
  whyItMatters: [
    'The security domain starts with "choose between service principals and managed identity, including workload identity federation". Expect scenario questions where the right answer is the one that removes a stored secret, or the one that works given where the agent runs.',
    'Pipelines are privileged: they hold deployment rights to production. A compromised pipeline secret is one of the most damaging supply-chain incidents, so least privilege, short-lived tokens and approvals on service connections are real defenses, not paperwork.',
    'You will also be tested on the plumbing: how GITHUB_TOKEN permissions work, which secret levels exist in GitHub, how a variable group links to Key Vault, and how to authorise a service connection only for specific pipelines.',
  ],
  howItWorks: [
    '**Workload identity federation in Azure DevOps**: create an Azure Resource Manager service connection with Workload identity federation (automatic or manual). Azure DevOps issues an OIDC token whose issuer is `https://vstoken.dev.azure.com/<organization-id>` and subject `sc://<org>/<project>/<service-connection>`. The federated credential on the app registration or managed identity trusts exactly that issuer and subject, and Entra ID returns an access token.',
    '**OIDC in GitHub Actions**: the job requests a token from GitHub (issuer `https://token.actions.githubusercontent.com`). The subject encodes where the run came from, for example `repo:contoso/web:environment:production` or `repo:contoso/web:ref:refs/heads/main`. Create federated credentials on the Entra app or user-assigned managed identity for exactly the subjects that should deploy, which is why using environments in the subject is a strong control.',
    '**Service connection security**: each connection has User permissions (who can use, administer) and Pipeline permissions (which pipelines may use it; by default a new pipeline needs authorisation on first use). Add **Approvals and checks** on the service connection (approval, business hours, branch control, required template, Azure Monitor alerts) so any pipeline using it must pass them. Scope the underlying identity with Azure RBAC to one resource group, not the subscription.',
    '**GITHUB_TOKEN permissions**: set a restrictive default in organization or repository settings (read-only), then grant per workflow or job, for example `contents: read`, `packages: write`, `id-token: write`. PRs from forks receive a read-only token and no secrets, except with `pull_request_target`, which runs in the base repository context and must never check out and execute untrusted PR code.',
    '**Key Vault in pipelines**: Azure Pipelines can link a variable group to a vault (secrets become variables, fetched at runtime) or use the AzureKeyVault@2 task to download chosen secrets. GitHub Actions log in with OIDC then call `az keyvault secret show`. The pipeline identity needs the **Key Vault Secrets User** role (RBAC model) on the vault. Secrets are masked in logs, but masking is not a security boundary: a script can still exfiltrate a value.',
    '**Azure DevOps permissions and security groups**: Project Collection Administrators, Project Administrators, Contributors, Readers, Build Administrators and the Project Build Service identity. Limit job authorisation scope to the current project, protect access to repositories in YAML pipelines, and restrict who can create or edit service connections (Endpoint Administrators and Endpoint Creators groups).',
  ],
  diagrams: [
    {
      kind: 'sequence',
      title: 'Workload identity federation from GitHub Actions',
      caption:
        'No secret is stored anywhere. Entra ID trusts the GitHub token only for the exact repository and environment in the federated credential.',
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
          label: 'Signed JWT, sub repo:org/app:environment:prod',
          kind: 'return',
        },
        { from: 'job', to: 'entra', label: 'Exchange JWT for access token' },
        {
          from: 'entra',
          to: 'job',
          label: 'Access token if issuer and subject match',
          kind: 'return',
        },
        { from: 'job', to: 'arm', label: 'Deploy with bearer token' },
      ],
    },
    {
      kind: 'decision',
      title: 'Which identity should the pipeline use?',
      caption:
        'Prefer the option with no stored secret. Fall back to secrets only when federation is not supported.',
      question: 'Where does the pipeline run and what does it call?',
      branches: [
        {
          condition: 'Hosted agent or runner deploying to Azure',
          result: 'Workload identity federation',
          detail: 'Service connection or azure/login with OIDC',
          tone: 'success',
        },
        {
          condition: 'Self-hosted agent on an Azure VM or scale set',
          result: 'Managed identity',
          detail: 'Or federation, both avoid secrets',
          tone: 'accent',
        },
        {
          condition: 'Tool that cannot use OIDC or managed identity',
          result: 'Service principal with certificate',
          detail: 'Store in Key Vault, rotate, short expiry',
          tone: 'warning',
        },
        {
          condition: 'Automation across many GitHub repositories',
          result: 'GitHub App',
          detail: 'Not a personal access token',
        },
      ],
    },
  ],
  keyObjects: [
    {
      kind: 'Federated identity credential (Microsoft.ManagedIdentity/userAssignedIdentities/federatedIdentityCredentials)',
      apiVersion: '2023-01-31',
      purpose:
        'Trust relationship that lets an external OIDC token be exchanged for an Entra token for this identity.',
      fields: [
        {
          path: 'properties.issuer',
          meaning: 'Token issuer, e.g. https://token.actions.githubusercontent.com.',
          required: true,
        },
        {
          path: 'properties.subject',
          meaning: 'Exact subject, e.g. repo:contoso/web:environment:production.',
          required: true,
        },
        {
          path: 'properties.audiences',
          meaning: 'Usually api://AzureADTokenExchange.',
          required: true,
        },
      ],
    },
    {
      kind: 'Azure Resource Manager service connection (Azure DevOps)',
      purpose: 'Stores how pipelines authenticate to Azure and who may use it.',
      fields: [
        {
          path: 'authorization.scheme',
          meaning: 'WorkloadIdentityFederation, ServicePrincipal or ManagedServiceIdentity.',
        },
        {
          path: 'data.scopeLevel',
          meaning: 'Subscription, management group or machine learning workspace.',
        },
        { path: 'Pipeline permissions', meaning: 'Which pipelines are authorised to use it.' },
        {
          path: 'Approvals and checks',
          meaning: 'Approvals, branch control and other checks enforced on every use.',
        },
      ],
    },
    {
      kind: 'GITHUB_TOKEN',
      purpose: 'Automatic per-job installation token for the repository running the workflow.',
      fields: [
        {
          path: 'permissions',
          meaning: 'Workflow or job level scopes like contents, packages, id-token, pull-requests.',
        },
        {
          path: 'lifetime',
          meaning: 'Expires when the job finishes, or after a maximum of 24 hours.',
        },
        {
          path: 'fork PRs',
          meaning: 'Read-only and no secrets for pull_request events from forks.',
        },
      ],
    },
  ],
  realWorldExample: {
    title: 'The expiring client secret',
    story: [
      'A company had forty Azure DevOps service connections, all backed by service principals with client secrets. Every few months a secret expired on a Friday evening and production deployments failed. Worse, an audit found three secrets pasted into variable groups for "local testing".',
      'The platform team converted every Azure Resource Manager service connection to workload identity federation, which removed all stored secrets in an afternoon. They scoped each identity to the resource group of its application with the Contributor role, and put Approvals and checks with branch control on the production connections so only pipelines running from main could use them.',
      'For GitHub-based teams, they created user-assigned managed identities with federated credentials whose subject is the production environment, and set the organization default GITHUB_TOKEN permission to read-only.',
      'The remaining third-party API keys moved into Key Vault with a linked variable group, and the vault got RBAC and diagnostic logs. Expiry-related deployment failures stopped completely.',
    ],
  },
  yamlExamples: [
    {
      title: 'GitHub Actions: OIDC login to Azure',
      language: 'yaml',
      explanation:
        'No secrets for Azure credentials: only ids, stored as variables. The environment makes the OIDC subject repo:<org>/<repo>:environment:production.',
      code: `name: deploy
on:
  push:
    branches: [main]

permissions:
  id-token: write
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
      - run: az deployment group create -g rg-web-prod -f main.bicep`,
    },
    {
      title: 'Azure Pipelines: Key Vault secrets and a secure file',
      language: 'yaml',
      explanation:
        'The service connection uses workload identity federation. Secrets from Key Vault become masked variables; the secure file is removed when the job ends.',
      code: `variables:
  - group: web-prod-kv   # variable group linked to Key Vault

steps:
  - task: AzureKeyVault@2
    inputs:
      azureSubscription: sc-web-prod
      KeyVaultName: kv-web-prod
      SecretsFilter: 'PaymentApiKey'
      RunAsPreJob: false

  - task: DownloadSecureFile@1
    name: signingCert
    inputs:
      secureFile: codesign.pfx

  - script: ./sign.sh "$(signingCert.secureFilePath)"
    env:
      PAYMENT_API_KEY: $(PaymentApiKey)`,
    },
  ],
  imperative: [
    {
      command:
        'az identity federated-credential create --name gh-prod --identity-name id-web-deploy --resource-group rg-identity --issuer https://token.actions.githubusercontent.com --subject repo:<org>/<repo>:environment:production --audiences api://AzureADTokenExchange',
      what: 'Lets GitHub Actions jobs in the production environment of one repository sign in as this managed identity.',
      placeholders: ['<org>', '<repo>'],
    },
    {
      command:
        'az role assignment create --assignee <principal-id> --role Contributor --scope /subscriptions/<sub-id>/resourceGroups/rg-web-prod',
      what: 'Grants the pipeline identity Contributor on a single resource group only.',
      placeholders: ['<principal-id>', '<sub-id>'],
    },
    {
      command:
        'az role assignment create --assignee <principal-id> --role "Key Vault Secrets User" --scope $(az keyvault show -n kv-web-prod --query id -o tsv)',
      what: 'Lets the identity read secret values from one vault using the RBAC permission model.',
      placeholders: ['<principal-id>'],
    },
    {
      command: 'gh secret set PAYMENT_API_KEY --env production --body "<value>"',
      what: 'Creates an environment-level secret, only available to jobs that target the production environment.',
      placeholders: ['<value>'],
    },
    {
      command:
        'az devops service-endpoint list --query "[].{name:name,scheme:authorization.scheme}" -o table',
      what: 'Shows which service connections still use secret-based ServicePrincipal authentication.',
    },
    {
      command:
        'az pipelines variable-group create --name web-prod --variables Environment=prod --authorize false',
      what: 'Creates a variable group without authorising it for all pipelines.',
    },
  ],
  declarative: {
    steps: [
      'Create a user-assigned managed identity (or app registration) per application and environment.',
      'Add a federated credential for the exact pipeline subject.',
      'Assign least-privilege Azure RBAC at resource group scope.',
      'Store any remaining secrets in Key Vault with RBAC and reference them at runtime.',
      'Protect the service connection or GitHub environment with approvals and branch restrictions.',
    ],
    code: [
      {
        title: 'Bicep: identity, federated credential and role assignment',
        language: 'bicep',
        explanation:
          'Deploy at resource group scope. The identity can deploy only into this resource group, and only from the production environment of one repository.',
        code: `param githubOrg string
param githubRepo string
param location string = resourceGroup().location

resource deployId 'Microsoft.ManagedIdentity/userAssignedIdentities@2023-01-31' = {
  name: 'id-web-deploy'
  location: location
}

resource fic 'Microsoft.ManagedIdentity/userAssignedIdentities/federatedIdentityCredentials@2023-01-31' = {
  parent: deployId
  name: 'github-production'
  properties: {
    issuer: 'https://token.actions.githubusercontent.com'
    subject: 'repo:\${githubOrg}/\${githubRepo}:environment:production'
    audiences: [
      'api://AzureADTokenExchange'
    ]
  }
}

var contributorRoleId = 'b24988ac-6180-42a0-ab88-20f7382dd24c'

resource rbac 'Microsoft.Authorization/roleAssignments@2022-04-01' = {
  name: guid(resourceGroup().id, deployId.id, contributorRoleId)
  properties: {
    principalId: deployId.properties.principalId
    principalType: 'ServicePrincipal'
    roleDefinitionId: subscriptionResourceId('Microsoft.Authorization/roleDefinitions', contributorRoleId)
  }
}

output clientId string = deployId.properties.clientId`,
      },
    ],
  },
  verification: [
    {
      command:
        'az identity federated-credential list --identity-name id-web-deploy -g rg-identity -o table',
      what: 'Lists federated credentials and their subjects.',
      expected: 'repo:<org>/<repo>:environment:production',
    },
    {
      command: 'az role assignment list --assignee <principal-id> --all -o table',
      what: 'Confirms the identity has only the intended role assignments.',
      placeholders: ['<principal-id>'],
    },
    {
      command: 'az account show --query "{user:user.name,type:user.type}"',
      what: 'Run inside the pipeline after login to confirm which identity it signed in as.',
      expected: 'type servicePrincipal and the expected client id.',
    },
  ],
  troubleshooting: [
    {
      command:
        'az identity federated-credential show --name gh-prod --identity-name id-web-deploy -g rg-identity',
      what: 'AADSTS700213 or AADSTS70021 "no matching federated identity record": compare the subject with the one in the error; a job without environment sends a ref-based subject instead.',
    },
    {
      command: 'gh api repos/<owner>/<repo>/actions/permissions/workflow',
      what: 'Shows the default GITHUB_TOKEN permission for the repository. "Resource not accessible by integration" usually means the job lacks a permissions entry.',
      placeholders: ['<owner>', '<repo>'],
    },
    {
      command: 'az keyvault secret show --vault-name kv-web-prod --name PaymentApiKey --query id',
      what: 'A 403 Forbidden here means the identity lacks Key Vault Secrets User, or the vault firewall blocks the agent IP.',
    },
  ],
  commonMistakes: [
    'Creating a service principal with a client secret when workload identity federation is available, then forgetting to rotate it.',
    'Choosing managed identity for a Microsoft-hosted agent. Hosted agents are not your Azure resources, so they cannot use your managed identity.',
    'Forgetting `permissions: id-token: write` in a GitHub workflow, so azure/login cannot request an OIDC token.',
    'Granting the pipeline identity Owner or Contributor on the whole subscription instead of one resource group.',
    'Using `pull_request_target` and checking out the PR head, which runs untrusted code with secrets and a write token.',
    'Believing masked secrets in logs are safe from exfiltration. Masking only hides accidental printing.',
  ],
  examTips: [
    'No secret to manage plus hosted agents or GitHub-hosted runners: workload identity federation.',
    'Self-hosted agent on Azure compute: managed identity is also valid.',
    'GITHUB_TOKEN is automatic, repository-scoped and short-lived; GitHub Apps are for cross-repo automation; PATs are the last resort.',
    'Environment-level secrets in GitHub are only exposed to jobs that reference that environment, after its protection rules pass.',
    'Secure files are for certificates and keystores in Azure Pipelines; Key Vault is for secrets, keys and certificates in general.',
  ],
  summary: [
    'Service principal needs a credential; managed identity only works on Azure resources; workload identity federation needs no stored secret.',
    'Service connections carry pipeline permissions and approvals and checks.',
    'Scope GITHUB_TOKEN with permissions, and prefer GitHub Apps over PATs.',
    'Keep secrets in Key Vault or platform secret stores and fetch them at runtime.',
    'Least privilege at the RBAC scope is as important as how the identity authenticates.',
  ],
  practice: [
    {
      id: 'az4-pipeline-security-p1',
      level: 'beginner',
      prompt:
        'Why can a Microsoft-hosted agent not use a user-assigned managed identity you created?',
      answer:
        'Managed identities can only be used by code running on an Azure resource the identity is attached to, and hosted agents are not your resources.',
      explanation: 'Use workload identity federation from the service connection instead.',
    },
    {
      id: 'az4-pipeline-security-p2',
      level: 'intermediate',
      prompt:
        'A GitHub workflow fails at azure/login with "no matching federated identity record". The job has no environment. What is wrong?',
      answer:
        'The OIDC subject is ref-based (repo:org/repo:ref:refs/heads/main) but the federated credential expects environment:production. Add the environment to the job or create a credential for the ref subject.',
      explanation: 'The subject must match exactly; environment presence changes the claim.',
    },
    {
      id: 'az4-pipeline-security-p3',
      level: 'intermediate',
      prompt:
        'How do you make sure only pipelines running from main can use the production service connection?',
      answer:
        'Add a Branch control check under Approvals and checks on the service connection, allowing only refs/heads/main.',
      explanation:
        'Checks on a protected resource run for every pipeline that uses it, regardless of the YAML.',
    },
    {
      id: 'az4-pipeline-security-p4',
      level: 'advanced',
      prompt:
        'Which GITHUB_TOKEN permission is required for a job to request an OIDC token, and what else should the workflow set?',
      answer:
        'id-token: write, plus other permissions set explicitly (for example contents: read) so everything else defaults to none.',
      explanation:
        'Specifying any permission sets all unspecified ones to none, which is the least-privilege pattern.',
    },
  ],
  lab: {
    title: 'Deploy from GitHub Actions to Azure with no secrets',
    scenario:
      'Create a managed identity with a federated credential for a GitHub environment, grant it one resource group, and run a workflow that lists resources using OIDC.',
    prerequisites: [
      'An Azure subscription (free account works) and Cloud Shell',
      'A GitHub repository you own',
      'gh CLI',
    ],
    tasks: [
      { instruction: 'Create resource groups `rg-lab-identity` and `rg-lab-target`.' },
      { instruction: 'Create a user-assigned managed identity `id-lab-gh` in `rg-lab-identity`.' },
      {
        instruction:
          'Add a federated credential for subject `repo:<owner>/<repo>:environment:lab`.',
      },
      { instruction: 'Assign the identity Reader on `rg-lab-target` only.' },
      {
        instruction:
          'Create a GitHub environment `lab` and repository variables for client id, tenant id and subscription id.',
      },
      {
        instruction:
          'Add a workflow with `id-token: write` that logs in with azure/login and runs `az resource list -g rg-lab-target`.',
      },
      {
        instruction:
          'Run it and confirm the login step used OIDC and no secret exists in the repository.',
      },
    ],
    solution: [
      {
        title: 'Azure side',
        language: 'bash',
        code: `az group create -n rg-lab-identity -l westeurope
az group create -n rg-lab-target -l westeurope
az identity create -n id-lab-gh -g rg-lab-identity
az identity federated-credential create --name gh-lab \\
  --identity-name id-lab-gh -g rg-lab-identity \\
  --issuer https://token.actions.githubusercontent.com \\
  --subject "repo:<owner>/<repo>:environment:lab" \\
  --audiences api://AzureADTokenExchange
PID=$(az identity show -n id-lab-gh -g rg-lab-identity --query principalId -o tsv)
az role assignment create --assignee-object-id $PID --assignee-principal-type ServicePrincipal \\
  --role Reader --scope $(az group show -n rg-lab-target --query id -o tsv)`,
      },
      {
        title: 'GitHub side',
        language: 'bash',
        code: `gh api repos/<owner>/<repo>/environments/lab --method PUT
gh variable set AZURE_CLIENT_ID --body "$(az identity show -n id-lab-gh -g rg-lab-identity --query clientId -o tsv)"
gh variable set AZURE_TENANT_ID --body "$(az account show --query tenantId -o tsv)"
gh variable set AZURE_SUBSCRIPTION_ID --body "$(az account show --query id -o tsv)"
gh workflow run oidc-lab.yml`,
      },
      {
        title: '.github/workflows/oidc-lab.yml',
        language: 'yaml',
        code: `name: oidc-lab
on: workflow_dispatch
permissions:
  id-token: write
  contents: read
jobs:
  list:
    runs-on: ubuntu-latest
    environment: lab
    steps:
      - uses: azure/login@v2
        with:
          client-id: \${{ vars.AZURE_CLIENT_ID }}
          tenant-id: \${{ vars.AZURE_TENANT_ID }}
          subscription-id: \${{ vars.AZURE_SUBSCRIPTION_ID }}
      - run: az resource list -g rg-lab-target -o table`,
      },
    ],
    verification: [
      {
        command: 'gh run list --workflow oidc-lab.yml --limit 1',
        what: 'The latest run should have succeeded.',
        expected: 'completed  success',
      },
      {
        command: 'gh secret list',
        what: 'Confirms no Azure credential secret exists in the repository.',
        expected: 'No AZURE_CLIENT_SECRET or similar.',
      },
    ],
    cleanup: [
      {
        command:
          'az group delete -n rg-lab-identity --yes --no-wait && az group delete -n rg-lab-target --yes --no-wait',
        what: 'Deletes the identity, federated credential and target group.',
      },
      {
        command: 'gh api repos/<owner>/<repo>/environments/lab --method DELETE',
        what: 'Removes the GitHub environment.',
      },
    ],
  },
  relatedTopicIds: [
    'az4-security-scanning',
    'az4-github-actions',
    'az4-environments-approvals',
    'az4-iac-pipelines',
  ],
  docs: [
    {
      title: 'Connect to Azure with workload identity federation (Azure Pipelines)',
      url: 'https://learn.microsoft.com/azure/devops/pipelines/library/connect-to-azure',
    },
    {
      title: 'Use GitHub Actions to connect to Azure with OpenID Connect',
      url: 'https://learn.microsoft.com/azure/developer/github/connect-from-azure-openid-connect',
    },
    {
      title: 'Automatic token authentication (GITHUB_TOKEN)',
      url: 'https://docs.github.com/actions/security-for-github-actions/security-guides/automatic-token-authentication',
    },
    {
      title: 'Use Azure Key Vault secrets in Azure Pipelines',
      url: 'https://learn.microsoft.com/azure/devops/pipelines/release/azure-key-vault',
    },
    {
      title: 'Secure files',
      url: 'https://learn.microsoft.com/azure/devops/pipelines/library/secure-files',
    },
  ],
}
