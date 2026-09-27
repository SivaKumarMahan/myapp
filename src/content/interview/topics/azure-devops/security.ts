import type { InterviewQuestion } from '../../../types'

/** Service connections, environments and checks, branch policies and pipeline security. */
export const azureDevopsSecurityQuestions: InterviewQuestion[] = [
  {
    id: 'itv-azdo-9',
    level: 'intermediate',
    kind: 'open',
    prompt:
      'What is a service connection, and how does workload identity federation work for an Azure Resource Manager service connection?',
    probing:
      'Modern CI identity. They want the OIDC exchange explained and why it beats client secrets, plus the subject format.',
    answer: [
      'A **service connection** is how a pipeline authenticates to something outside Azure DevOps - an Azure subscription, a container registry, Kubernetes, a Git host. For Azure, it wraps an identity in Entra ID (an app registration or a user-assigned managed identity) that has RBAC roles on some scope.',
      'The old way was a **service principal with a client secret** stored in the connection. That secret expires, has to be rotated, and can be stolen. **Workload identity federation** removes the secret. You configure a **federated credential** on the Entra identity that says "trust tokens from this Azure DevOps issuer, for this subject".',
      'At run time, Azure DevOps issues a short-lived **OIDC token** for the job. The task presents it to Entra ID, which checks the issuer, the audience (`api://AzureADTokenExchange`) and the subject - `sc://<org>/<project>/<service-connection-name>` - and, if they match the federated credential, returns an Azure access token. Nothing long-lived exists to leak.',
      'I scope each connection narrowly - one per environment, RBAC on a resource group rather than the subscription where possible - and restrict it to specific pipelines, because the service connection is effectively the keys to that environment.',
    ],
    diagrams: [
      {
        kind: 'sequence',
        title: 'Workload identity federation token exchange',
        caption: 'No secret is stored anywhere; trust comes from matching issuer and subject.',
        participants: [
          { id: 'job', label: 'Pipeline job' },
          { id: 'ado', label: 'Azure DevOps' },
          { id: 'entra', label: 'Microsoft Entra ID' },
          { id: 'arm', label: 'Azure Resource Manager' },
        ],
        messages: [
          { from: 'job', to: 'ado', label: 'request OIDC token' },
          { from: 'ado', to: 'job', label: 'signed JWT, sub = sc://org/proj/conn', kind: 'return' },
          { from: 'job', to: 'entra', label: 'exchange JWT for access token' },
          {
            from: 'entra',
            to: 'job',
            label: 'issuer and subject match: Azure token',
            kind: 'return',
          },
          { from: 'job', to: 'arm', label: 'deploy with bearer token' },
        ],
      },
    ],
    code: [
      {
        title: 'Federated credential on an app registration',
        language: 'bash',
        code: `az ad app federated-credential create --id <app-object-id> --parameters '{
  "name": "ado-payments-prod",
  "issuer": "<issuer-url-shown-on-the-service-connection>",
  "subject": "sc://<org>/<project>/sc-payments-prod",
  "audiences": ["api://AzureADTokenExchange"]
}'

# RBAC on the narrowest scope that works
az role assignment create --assignee <app-client-id> \\
  --role Contributor --scope /subscriptions/<sub>/resourceGroups/rg-payments-prod`,
        placeholders: [
          '<app-object-id>',
          '<issuer-url-shown-on-the-service-connection>',
          '<org>',
          '<project>',
          '<app-client-id>',
          '<sub>',
        ],
      },
      {
        title: 'Using it in YAML',
        language: 'yaml',
        code: `- task: AzureCLI@2
  inputs:
    azureSubscription: sc-payments-prod
    scriptType: bash
    scriptLocation: inlineScript
    inlineScript: |
      az account show --query "{sub:name, user:user.name}"
      az deployment group create -g rg-payments-prod -f main.bicep`,
      },
    ],
    traps: [
      'Granting the connection Owner on the subscription "to avoid permission errors".',
      'Leaving "Grant access permission to all pipelines" ticked on a production connection.',
      'Renaming the service connection or project and not updating the federated credential subject.',
    ],
    followUps: [
      'How would you migrate existing secret-based connections to federation?',
      'What changes in the subject if the project is renamed?',
      'How does GitHub Actions OIDC differ?',
    ],
    tags: ['service connections', 'workload identity federation', 'oidc', 'security'],
  },
  {
    id: 'itv-azdo-10',
    level: 'intermediate',
    kind: 'open',
    prompt:
      'What are environments in Azure Pipelines, and what approvals and checks can you put on them?',
    probing:
      'Release governance. They want to hear that checks live on the resource, not in the YAML, which is why they cannot be bypassed by editing the pipeline.',
    answer: [
      'An **environment** is a named deployment target - `dev`, `staging`, `prod` - that deployment jobs reference. It records **deployment history** (which run, which commit, which work items reached production) and, most importantly, carries **approvals and checks**.',
      'Checks are configured on the environment by its owners, **not** in the pipeline YAML. So a developer who edits the pipeline cannot remove them. Before any deployment job targeting the environment starts, every check must pass.',
      'The useful checks: **Approvals** from named users or groups, optionally forbidding the person who queued the run from approving. **Branch control**, allowing only `refs/heads/main` or release branches. **Business hours** windows. **Required template**, which ensures the pipeline extends an approved template. **Exclusive lock**, so only one run deploys at a time. **Invoke Azure Function or REST API** and **Query Azure Monitor alerts** for automated gates - for example, do not deploy while production has a firing alert.',
      'The same checks can be put on other protected resources - service connections, agent pools, variable groups, repositories. Putting branch control and approvals on the **production service connection** as well as the environment closes the gap where someone uses the connection from a plain job.',
    ],
    code: [
      {
        title: 'Deployment job targeting a protected environment',
        language: 'yaml',
        code: `- stage: Prod
  dependsOn: Staging
  jobs:
    - deployment: web
      displayName: Deploy web to prod
      environment: prod          # approvals, branch control, lock are enforced here
      pool:
        vmImage: ubuntu-latest
      strategy:
        runOnce:
          deploy:
            steps:
              - download: current
                artifact: web
              - task: AzureWebApp@1
                inputs:
                  azureSubscription: sc-web-prod
                  appName: app-web-prod
                  package: $(Pipeline.Workspace)/web/*.zip`,
      },
    ],
    diagrams: [
      {
        kind: 'flow',
        title: 'What happens before a prod deployment job starts',
        caption: 'All checks run against the environment; none of them live in the pipeline file.',
        nodes: [
          {
            label: 'Run reaches stage Prod',
            detail: 'Deployment job targets env prod',
            tone: 'accent',
          },
          { label: 'Branch control', detail: 'Only refs/heads/main allowed' },
          { label: 'Required template', detail: 'Must extend the approved template' },
          { label: 'Azure Monitor alerts query', detail: 'No sev-1 alerts firing' },
          {
            label: 'Human approval',
            detail: 'Release managers, not the requester',
            branch: { label: 'Rejected or timed out', detail: 'Stage fails, nothing deploys' },
          },
          { label: 'Exclusive lock acquired', detail: 'Job starts', tone: 'success' },
        ],
      },
    ],
    traps: [
      'Implementing "approval" as a manual validation step inside the YAML, which anyone can delete.',
      'Protecting the environment but not the service connection it deploys with.',
      'Using a plain `job` instead of a `deployment` job, so the environment and its checks are never involved.',
    ],
    followUps: [
      'How does the required template check work?',
      'How would you implement an automated quality gate?',
    ],
    tags: ['environments', 'approvals', 'checks', 'governance'],
  },
  {
    id: 'itv-azdo-11',
    level: 'intermediate',
    kind: 'open',
    prompt: 'Which branch policies would you configure on main in Azure Repos, and why?',
    probing:
      'Code quality and supply-chain basics. They want each policy tied to the risk it controls.',
    answer: [
      'Branch policies turn `main` into a branch you can only change through a **pull request**, and they define what a PR must satisfy. The ones I would set on every production repo:',
      '**Minimum number of reviewers** - usually two - with "prohibit the most recent pusher from approving" and "reset votes on new changes", so an approval covers the code that is actually merged. **Build validation**, so the CI pipeline must pass for the PR. **Check for comment resolution**, so review comments are not ignored. **Linked work items**, for traceability.',
      '**Automatically included reviewers** by path - the platform team on `infra/`, security on `auth/` - which is the Azure Repos equivalent of a CODEOWNERS file. **Limit merge types**, typically squash only, to keep history linear. And **status checks** from external services such as a security scanner.',
      'Then permissions: very few people should have **Bypass policies when completing pull requests** or **Bypass policies when pushing**, and anyone who does is audited. A policy that the whole team can bypass is a suggestion.',
    ],
    code: [
      {
        title: 'Policies from the CLI',
        language: 'bash',
        code: `REPO=$(az repos show -r payments-api --query id -o tsv)

az repos policy approver-count create --repository-id $REPO --branch main \\
  --minimum-approver-count 2 --creator-vote-counts false \\
  --allow-downvotes false --reset-on-source-push true \\
  --blocking true --enabled true

az repos policy comment-required create --repository-id $REPO --branch main \\
  --blocking true --enabled true

az repos policy required-reviewer create --repository-id $REPO --branch main \\
  --required-reviewer-ids platform-team@contoso.com --path-filter "/infra/*" \\
  --message "Platform review for infrastructure" --blocking true --enabled true

az repos policy merge-strategy create --repository-id $REPO --branch main \\
  --allow-squash true --allow-no-fast-forward false --blocking true --enabled true`,
      },
    ],
    traps: [
      'Letting the author’s own vote count as an approval.',
      'Not resetting votes when new commits are pushed, so an approved PR can change completely.',
      'Giving the whole Contributors group bypass permissions.',
    ],
    followUps: [
      'How is this different from GitHub rulesets?',
      'How would you enforce the same policies across 200 repositories?',
    ],
    tags: ['azure repos', 'branch policies', 'pull requests'],
  },
  {
    id: 'itv-azdo-12',
    level: 'intermediate',
    kind: 'multi',
    prompt:
      'You must guarantee that only code from main can deploy to production, whoever edits the pipeline. Which controls actually enforce that?',
    options: [
      {
        id: 'a',
        text: 'A branch control check on the prod environment allowing only refs/heads/main',
      },
      {
        id: 'b',
        text: 'A condition on the Prod stage: eq(variables[Build.SourceBranch], refs/heads/main)',
      },
      { id: 'c', text: 'A branch control check on the production service connection' },
      { id: 'd', text: 'Marking the production variable group values as secret' },
      {
        id: 'e',
        text: 'A required template check so pipelines must extend the approved deploy template',
      },
    ],
    correct: ['a', 'c', 'e'],
    probing:
      'The difference between controls in the YAML, which the author controls, and controls on the resource, which they do not.',
    answer: [
      '**Checks on protected resources** are enforced by Azure DevOps regardless of what the YAML says, because they are configured by the resource owners. Branch control on the **environment** and on the **service connection** covers both ways of deploying, and a **required template** check ensures the pipeline structure itself is the approved one.',
      'A stage **condition** is useful but it is not a control: anyone who can edit the YAML on their branch can delete it. Marking variables secret hides values in logs but says nothing about which branch may use them.',
    ],
    code: [
      {
        title: 'The pattern: condition for convenience, check for enforcement',
        language: 'yaml',
        code: `- stage: Prod
  # Convenience: skip the stage on feature branches so runs stay green
  condition: and(succeeded(), eq(variables['Build.SourceBranch'], 'refs/heads/main'))
  jobs:
    - deployment: api
      environment: prod   # Enforcement: branch control + approvals configured here
      strategy:
        runOnce:
          deploy:
            steps:
              - script: ./deploy.sh`,
      },
    ],
    traps: ['Believing a YAML condition is a security control.'],
    followUps: ['Where else would you put checks besides the environment?'],
    tags: ['security', 'checks', 'environments', 'service connections'],
  },
  {
    id: 'itv-azdo-13',
    level: 'advanced',
    kind: 'open',
    prompt: 'How would you secure Azure Pipelines across an organisation? Give me your checklist.',
    probing:
      'Supply-chain and CI security maturity. They want identity, scoping, fork handling, template enforcement and auditing - not just "use Key Vault".',
    answer: [
      '**Identity first.** Workload identity federation for every Azure service connection, so there are no stored client secrets. One connection per environment with RBAC on the narrowest scope, and pipeline permissions so only named pipelines can use each one. Avoid PATs; where one is unavoidable, scope it and give it a short expiry.',
      '**Limit the job token.** Enable "Limit job authorization scope to current project" and "Protect access to repositories in YAML pipelines", so the build identity cannot read every repo in the organisation. Turn off creating new classic pipelines so everything is reviewable YAML.',
      '**Protect resources with checks.** Branch control, approvals and required templates on production environments, service connections, variable groups and agent pools. An **extends** template owned by the platform team that injects mandatory stages - build, tests, secret and dependency scanning - and that product pipelines must use.',
      '**Handle untrusted code.** PRs from forks must not receive secrets and should require a comment from a team member before running. Untrusted builds run on Microsoft-hosted or ephemeral agents, never on agents that can reach production.',
      '**Supply chain and audit.** Pin marketplace tasks and template repos to versions, pull packages through an Azure Artifacts feed with upstream sources rather than directly from the internet, scan with GitHub Advanced Security for Azure DevOps, and stream the **audit log** to Log Analytics or a SIEM so changes to policies, permissions and service connections are visible.',
    ],
    deeper: [
      'The **build service identity** is an often-forgotten principal. By default it can have broad rights on repos and feeds; review "Project Collection Build Service" and "<project> Build Service" permissions as carefully as any human group.',
      'Shell injection is real in CI: a parameter or PR title interpolated into a script can execute code. Enable argument parameter validation for shell tasks and pass untrusted values through environment variables rather than splicing them into commands.',
    ],
    code: [
      {
        title: 'A platform-owned extends template that injects mandatory stages',
        language: 'yaml',
        code: `# platform/pipeline-templates: secure-pipeline.yml
parameters:
  - name: buildSteps
    type: stepList
  - name: deployStages
    type: stageList
    default: []

stages:
  - stage: Build
    jobs:
      - job: build
        steps:
          - \${{ parameters.buildSteps }}
          - task: AdvancedSecurity-Dependency-Scanning@1
          - task: MicrosoftSecurityDevOps@1   # or your chosen secret scanner

  - \${{ parameters.deployStages }}`,
      },
      {
        title: 'Stream the organisation audit log',
        language: 'bash',
        code: `# Audit streams are configured in Organization settings > Auditing > Streams.
# Querying recent audit events with an Entra token for Azure DevOps:
az rest --resource 499b84ac-1321-427f-aa17-267ca6975798 \\
  --url "https://auditservice.dev.azure.com/<org>/_apis/audit/auditlog?startTime=2026-09-20&api-version=7.1-preview.1" \\
  --query "decoratedAuditLogEntries[].{when:timestamp, who:actorDisplayName, what:actionId}"`,
        placeholders: ['<org>'],
      },
    ],
    traps: [
      'Relying on secret masking as the main defence.',
      'One service connection with Owner on the subscription shared by every pipeline.',
      'Running fork PR builds on the same self-hosted agents that deploy to production.',
    ],
    followUps: [
      'How does the required template check interact with extends templates?',
      'What can a malicious PR do with the job access token?',
      'How would you detect a newly created service connection?',
    ],
    tags: ['security', 'pipelines', 'supply chain', 'governance'],
  },
  {
    id: 'itv-azdo-14',
    level: 'advanced',
    kind: 'scenario',
    prompt:
      'A developer deployed a feature branch straight to production. The prod environment has approvals configured. How could that have happened, and how do you close the gap?',
    probing:
      'Threat modelling the pipeline. The answer is usually that the checks were on the environment but the identity was usable without it.',
    answer: [
      'First I would look at the **run** that deployed - its pipeline, branch, stages and the jobs that touched production - and at the **service connection’s usage history**, which lists every run that used it. That tells me the path they took.',
      'The usual causes, in order of likelihood. The pipeline used a plain **`job`** rather than a **`deployment`** job, or a different pipeline entirely, so the **environment** and its approvals were never involved - while the **service connection** had no checks and was open to all pipelines. Or the approval check existed but the developer was an allowed approver and **approved their own run**. Or a **branch control** check was missing, so an approved run from a feature branch was allowed.',
      'Closing the gap: put **branch control and approvals on the production service connection** itself, not just the environment; remove "grant access to all pipelines" and authorise only the release pipeline; enable "approvers cannot approve their own runs"; add a **required template** check so only pipelines extending the approved template can use production resources.',
      'Then the process side: review who has administer permissions on the environment and connection, since they can remove checks, and alert on changes to checks through the audit stream.',
    ],
    diagrams: [
      {
        kind: 'flow',
        title: 'How the approval was bypassed',
        caption:
          'Checks protect a resource only if every path to production goes through that resource.',
        nodes: [
          { label: 'Feature branch pipeline', detail: 'Edited by the developer', tone: 'warning' },
          {
            label: 'Plain job, not deployment job',
            detail: 'Environment prod never referenced',
            branch: { label: 'Environment approvals skipped', detail: 'They were never evaluated' },
          },
          {
            label: 'Uses sc-prod directly',
            detail: 'Open to all pipelines, no checks',
            tone: 'danger',
          },
          { label: 'Deploys to production', tone: 'danger' },
          {
            label: 'Fix: checks on the connection',
            detail: 'Branch control, approvals, required template',
            tone: 'success',
          },
        ],
      },
    ],
    code: [
      {
        title: 'Who used the production connection?',
        language: 'bash',
        code: `# Service connection execution history (Azure DevOps REST, Entra token)
az rest --resource 499b84ac-1321-427f-aa17-267ca6975798 \\
  --url "https://dev.azure.com/<org>/<project>/_apis/serviceendpoint/<connection-id>/executionhistory?api-version=7.1-preview.1" \\
  --query "value[].data.{pipeline:definition.name, finished:finishTime, result:result}"`,
        placeholders: ['<project>', '<connection-id>', '<org>'],
      },
    ],
    deeper: [
      'Removing access to the connection for all but one pipeline is powerful but not sufficient on its own: someone who can edit **that** pipeline’s YAML on a branch can still change what it deploys. That is why branch control belongs on the connection too.',
    ],
    traps: [
      'Blaming the developer and changing nothing structural.',
      'Adding more approvals to the environment when the environment was not in the path at all.',
    ],
    followUps: [
      'How would you detect this automatically next time?',
      'What permissions let someone remove a check?',
    ],
    tags: ['scenario', 'security', 'environments', 'service connections'],
  },
]
