import type { Question } from '../../types'

/** Original practice questions for this domain. Written for this app. */
export const az400SecurityQuestions: Question[] = [
  {
    id: 'az4q-sec-1',
    domainId: 'az4-security',
    topicId: 'az4-pipeline-security',
    kind: 'mcq',
    category: 'concept',
    difficulty: 'intermediate',
    points: 2,
    prompt:
      'An Azure Pipelines YAML pipeline running on Microsoft-hosted agents deploys Bicep templates to Azure. The security team requires that no client secret or certificate is stored or rotated for this deployment. What should the service connection use?',
    options: [
      { id: 'a', text: 'A service principal with a client secret stored in a variable group' },
      { id: 'b', text: 'Workload identity federation' },
      { id: 'c', text: 'A system-assigned managed identity of the hosted agent' },
      { id: 'd', text: 'A personal access token of a subscription owner' },
    ],
    correct: ['b'],
    explanation:
      'Workload identity federation exchanges an Azure DevOps-issued OIDC token for an Entra token, so no secret exists. A client secret must be stored and rotated, Microsoft-hosted agents are not your Azure resources and cannot carry your managed identity, and a PAT authenticates to Azure DevOps, not to Azure Resource Manager.',
  },
  {
    id: 'az4q-sec-2',
    domainId: 'az4-security',
    topicId: 'az4-pipeline-security',
    kind: 'mcq',
    category: 'yaml',
    difficulty: 'intermediate',
    points: 2,
    prompt:
      'A GitHub Actions job uses azure/login with client-id, tenant-id and subscription-id, but fails with an error that it cannot get an ID token. Which change fixes it?',
    options: [
      { id: 'a', text: 'Add permissions: id-token: write to the workflow or job' },
      { id: 'b', text: 'Add a repository secret named AZURE_CLIENT_SECRET' },
      { id: 'c', text: 'Change runs-on to a self-hosted runner' },
      { id: 'd', text: 'Add permissions: contents: write' },
    ],
    correct: ['a'],
    explanation:
      'The job must be allowed to request an OIDC token with id-token: write. Adding a client secret defeats the purpose of OIDC, the runner type is irrelevant, and contents: write grants repository write access without enabling OIDC.',
  },
  {
    id: 'az4q-sec-3',
    domainId: 'az4-security',
    topicId: 'az4-pipeline-security',
    kind: 'mcq',
    category: 'concept',
    difficulty: 'intermediate',
    points: 2,
    prompt:
      'A GitHub automation must open pull requests in 60 repositories across your organization with narrowly scoped permissions and short-lived tokens, independent of any employee account. What should you use?',
    options: [
      { id: 'a', text: 'A classic personal access token of an organization owner' },
      { id: 'b', text: 'The GITHUB_TOKEN of a workflow in one repository' },
      { id: 'c', text: 'A GitHub App installed on the organization' },
      { id: 'd', text: 'An SSH deploy key on each repository' },
    ],
    correct: ['c'],
    explanation:
      'A GitHub App has fine-grained permissions, is installed on selected repositories, is not tied to a user and issues short-lived installation tokens. A PAT is tied to a person, GITHUB_TOKEN is scoped to its own repository, and deploy keys are per repository and only grant Git access, not the ability to open PRs through the API.',
  },
  {
    id: 'az4q-sec-4',
    domainId: 'az4-security',
    topicId: 'az4-pipeline-security',
    kind: 'multi',
    category: 'concept',
    difficulty: 'advanced',
    points: 2,
    prompt:
      'You must ensure that only pipelines running from the main branch, and only after a release manager approves, can use the production Azure service connection. Which configurations achieve this? (Select all that apply.)',
    options: [
      {
        id: 'a',
        text: 'Add a Branch control check on the service connection allowing refs/heads/main',
      },
      {
        id: 'b',
        text: 'Add an Approvals check on the service connection with the release managers group',
      },
      { id: 'c', text: 'Add a condition in each pipeline YAML that compares Build.SourceBranch' },
      { id: 'd', text: 'Grant the service connection access to all pipelines' },
    ],
    correct: ['a', 'b'],
    explanation:
      'Checks on the protected resource run for every pipeline that uses it, whatever the YAML says. A YAML condition can be edited by anyone who changes the pipeline, and granting access to all pipelines widens rather than restricts use.',
  },
  {
    id: 'az4q-sec-5',
    domainId: 'az4-security',
    topicId: 'az4-pipeline-security',
    kind: 'mcq',
    category: 'concept',
    difficulty: 'beginner',
    points: 1,
    prompt:
      'An iOS build in Azure Pipelines needs a signing certificate (.p12) and a provisioning profile during the build. Where should these files be stored?',
    options: [
      { id: 'a', text: 'In the repository under a certs folder' },
      { id: 'b', text: 'As Azure Pipelines secure files, downloaded with a task at runtime' },
      { id: 'c', text: 'As base64 text in a non-secret pipeline variable' },
      { id: 'd', text: 'In the pipeline artifact of a previous run' },
    ],
    correct: ['b'],
    explanation:
      'Secure files are encrypted, permissioned per pipeline and deleted from the agent after the job. Committing them exposes them to everyone with read access, non-secret variables are visible in logs and UI, and artifacts are readable by anyone who can view the run.',
  },
  {
    id: 'az4q-sec-6',
    domainId: 'az4-security',
    topicId: 'az4-pipeline-security',
    kind: 'command',
    category: 'command',
    difficulty: 'advanced',
    points: 2,
    prompt:
      'Grant the managed identity with principal id 1111-2222 permission to read secret values from the vault kv-web-prod (RBAC permission model). The vault resource id is stored in $KV_ID.',
    acceptedAnswers: [
      'az role assignment create --assignee 1111-2222 --role "Key Vault Secrets User" --scope $KV_ID',
      'az role assignment create --role "Key Vault Secrets User" --assignee 1111-2222 --scope $KV_ID',
      'az role assignment create --assignee-object-id 1111-2222 --role "Key Vault Secrets User" --scope $KV_ID',
      'az role assignment create --scope $KV_ID --role "Key Vault Secrets User" --assignee 1111-2222',
    ],
    answerHint: 'az role assignment create ...',
    explanation:
      'Key Vault Secrets User allows reading secret contents under the RBAC model. Key Vault Reader only reads metadata, and Key Vault Administrator is far more than needed.',
  },
  {
    id: 'az4q-sec-7',
    domainId: 'az4-security',
    topicId: 'az4-security-scanning',
    kind: 'mcq',
    category: 'concept',
    difficulty: 'beginner',
    points: 1,
    prompt:
      'You need to stop developers from pushing commits that contain cloud provider access tokens to GitHub repositories. Which feature should you enable?',
    options: [
      { id: 'a', text: 'Dependabot security updates' },
      { id: 'b', text: 'Secret scanning push protection' },
      { id: 'c', text: 'CodeQL default setup' },
      { id: 'd', text: 'Required signed commits' },
    ],
    correct: ['b'],
    explanation:
      'Push protection blocks pushes that contain supported secret patterns before they reach the repository. Dependabot handles vulnerable dependencies, CodeQL finds code vulnerabilities, and signed commits prove authorship without inspecting contents.',
  },
  {
    id: 'az4q-sec-8',
    domainId: 'az4-security',
    topicId: 'az4-security-scanning',
    kind: 'mcq',
    category: 'yaml',
    difficulty: 'advanced',
    points: 2,
    prompt:
      'GitHub Advanced Security for Azure DevOps is enabled on an Azure Repos repository. Secret scanning alerts appear, but no code scanning alerts. What must you add?',
    options: [
      { id: 'a', text: 'A GitHub Actions workflow in .github/workflows' },
      {
        id: 'b',
        text: 'The AdvancedSecurity-Codeql-Init, Autobuild and Analyze tasks to a pipeline for the repository',
      },
      { id: 'c', text: 'A dependabot.yml file at the repository root' },
      { id: 'd', text: 'A branch policy requiring a linked work item' },
    ],
    correct: ['b'],
    explanation:
      'In GHAS for Azure DevOps, code scanning runs as CodeQL pipeline tasks. Azure Repos does not run GitHub Actions workflows, dependabot.yml is a GitHub feature for dependency updates, and a work item policy has nothing to do with scanning.',
  },
  {
    id: 'az4q-sec-9',
    domainId: 'az4-security',
    topicId: 'az4-security-scanning',
    kind: 'multi',
    category: 'concept',
    difficulty: 'intermediate',
    points: 2,
    prompt: 'Which statements about Dependabot are correct? (Select all that apply.)',
    options: [
      { id: 'a', text: 'Dependabot alerts are raised when a dependency matches a known advisory' },
      {
        id: 'b',
        text: 'Security updates open PRs that bump a vulnerable dependency to a fixed version',
      },
      { id: 'c', text: 'Version updates are configured in .github/dependabot.yml' },
      { id: 'd', text: 'Dependabot scans your own source code for SQL injection' },
      { id: 'e', text: 'Dependabot can only update npm packages' },
    ],
    correct: ['a', 'b', 'c'],
    explanation:
      'Dependabot provides alerts, security updates and version updates configured in dependabot.yml across many ecosystems (npm, NuGet, pip, Maven, Docker, GitHub Actions and more). Finding SQL injection in your own code is code scanning with CodeQL.',
  },
  {
    id: 'az4q-sec-10',
    domainId: 'az4-security',
    topicId: 'az4-security-scanning',
    kind: 'mcq',
    category: 'concept',
    difficulty: 'intermediate',
    points: 2,
    prompt:
      'Pull requests must be blocked if they introduce a dependency with a high severity vulnerability or a GPL-3.0 license. Which GitHub capability fits best?',
    options: [
      { id: 'a', text: 'The dependency review action as a required status check' },
      { id: 'b', text: 'Secret scanning custom patterns' },
      { id: 'c', text: 'CODEOWNERS for package.json' },
      { id: 'd', text: 'Repository traffic insights' },
    ],
    correct: ['a'],
    explanation:
      'Dependency review compares dependency changes in the PR and can fail on severity and on denied licenses. Custom secret patterns detect credentials, CODEOWNERS routes reviews but does not evaluate packages, and traffic insights show visitors.',
  },
  {
    id: 'az4q-sec-11',
    domainId: 'az4-security',
    topicId: 'az4-security-scanning',
    kind: 'mcq',
    category: 'concept',
    difficulty: 'advanced',
    points: 2,
    prompt:
      'The CISO wants one place to see security posture and findings from GitHub organizations, Azure DevOps organizations and Azure workloads, and to trace a vulnerable production container back to its repository. What should you implement?',
    options: [
      { id: 'a', text: 'Azure Policy compliance dashboard' },
      {
        id: 'b',
        text: 'Microsoft Defender for Cloud DevOps security with GitHub and Azure DevOps connectors',
      },
      { id: 'c', text: 'An Azure Boards dashboard with query tiles' },
      { id: 'd', text: 'GitHub repository insights' },
    ],
    correct: ['b'],
    explanation:
      'Defender for Cloud DevOps security connects DevOps platforms, aggregates GHAS and Microsoft Security DevOps findings, and with Defender CSPM provides code-to-cloud mapping. Azure Policy covers Azure resource compliance only, and Boards or repository insights are not security tools.',
  },
  {
    id: 'az4q-sec-12',
    domainId: 'az4-security',
    topicId: 'az4-pipeline-security',
    kind: 'task',
    category: 'lab',
    difficulty: 'advanced',
    points: 2,
    prompt:
      'Configure a GitHub Actions workflow to deploy to resource group rg-app-prod with no stored Azure credential, so that only jobs targeting the production environment of the repository contoso/app can authenticate.',
    context:
      'An Azure subscription, a user-assigned managed identity id-app-deploy in rg-identity, and the GitHub repository contoso/app.',
    checkpoints: [
      {
        id: 'c1',
        text: 'A federated credential exists on id-app-deploy with subject repo:contoso/app:environment:production',
      },
      { id: 'c2', text: 'The identity has a role assignment scoped only to rg-app-prod' },
      {
        id: 'c3',
        text: 'The workflow sets permissions id-token: write and the job uses environment: production',
      },
      { id: 'c4', text: 'The repository contains no Azure client secret' },
    ],
    solution: [
      {
        title: 'Azure configuration',
        language: 'bash',
        code: `az identity federated-credential create --name gh-prod \\
  --identity-name id-app-deploy -g rg-identity \\
  --issuer https://token.actions.githubusercontent.com \\
  --subject repo:contoso/app:environment:production \\
  --audiences api://AzureADTokenExchange
PID=$(az identity show -n id-app-deploy -g rg-identity --query principalId -o tsv)
az role assignment create --assignee-object-id $PID --assignee-principal-type ServicePrincipal \\
  --role Contributor --scope $(az group show -n rg-app-prod --query id -o tsv)`,
      },
      {
        title: 'Workflow',
        language: 'yaml',
        code: `permissions:
  id-token: write
  contents: read
jobs:
  deploy:
    runs-on: ubuntu-latest
    environment: production
    steps:
      - uses: azure/login@v2
        with:
          client-id: \${{ vars.AZURE_CLIENT_ID }}
          tenant-id: \${{ vars.AZURE_TENANT_ID }}
          subscription-id: \${{ vars.AZURE_SUBSCRIPTION_ID }}`,
      },
    ],
    explanation:
      'The federated credential subject pins trust to one repository and environment, the role assignment limits blast radius, and OIDC removes the need for any stored secret.',
  },
]
