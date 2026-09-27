import type { InterviewQuestion } from '../../../types'

/** Deployment strategies, Azure Artifacts, GitHub Actions comparison and pipeline debugging. */
export const azureDevopsDeliveryQuestions: InterviewQuestion[] = [
  {
    id: 'itv-azdo-15',
    level: 'advanced',
    kind: 'open',
    prompt:
      'How do you implement blue-green, canary and rolling deployments with Azure Pipelines? Where do App Service slots fit?',
    probing:
      'Progressive delivery in practice. They want the deployment job strategies and lifecycle hooks, plus a real Azure mechanism for traffic shifting.',
    answer: [
      'Deployment jobs support three **strategies**. `runOnce` runs the deploy steps once - the default. `rolling` deploys to a set of VM targets in an environment a batch at a time. `canary` deploys in increments you define (say 10% then 50%), running verification between each.',
      'Each strategy has **lifecycle hooks**: `preDeploy`, `deploy`, `routeTraffic`, `postRouteTraffic`, and `on: failure` / `on: success`. The hooks give you the places to put health checks and automatic rollback - for example, query Application Insights in `postRouteTraffic` and fail the job if the error rate rises, which triggers the `on: failure` hook to roll back.',
      'The traffic shifting itself comes from the platform. For **App Service**, **deployment slots** are the natural blue-green: deploy to a `staging` slot, warm it up and smoke test it, then **swap** - the swap is near-instant and reversible by swapping back. Slots also support routing a percentage of production traffic to the staging slot, which gives you a simple canary. For **AKS** you would shift traffic with the ingress or service mesh; for **Container Apps**, revision traffic weights; for VMs behind a load balancer, the rolling strategy.',
      'Whatever the mechanism, the key is automated verification between steps. A canary nobody watches is just a slower deployment.',
    ],
    diagrams: [
      {
        kind: 'flow',
        title: 'Blue-green with App Service slots',
        caption: 'Production traffic only moves after the new version is warm and verified.',
        nodes: [
          { label: 'Deploy to staging slot', detail: 'Production untouched', tone: 'accent' },
          { label: 'Warm up and smoke test', detail: 'Hit the staging slot URL' },
          { label: 'Optional: route 10% traffic', detail: 'Watch error rate and latency' },
          {
            label: 'Swap slots',
            detail: 'Staging becomes production',
            branch: { label: 'Health check fails', detail: 'Swap back - old version intact' },
          },
          { label: 'Verify in production', detail: 'postRouteTraffic hook', tone: 'success' },
        ],
      },
    ],
    code: [
      {
        title: 'Canary strategy with health gates',
        language: 'yaml',
        code: `- deployment: api
  environment: prod.aks-prod          # environment + Kubernetes resource
  strategy:
    canary:
      increments: [10, 50]
      preDeploy:
        steps:
          - script: echo "pre-flight checks"
      deploy:
        steps:
          - task: KubernetesManifest@1
            inputs:
              action: deploy
              strategy: canary
              percentage: $(strategy.increment)
              manifests: k8s/api.yaml
              containers: $(acr)/api:$(Build.BuildId)
      postRouteTraffic:
        steps:
          - script: ./check-error-rate.sh --max 1.0   # fails the job on regression
      on:
        failure:
          steps:
            - task: KubernetesManifest@1
              inputs:
                action: reject
                strategy: canary
                manifests: k8s/api.yaml
        success:
          steps:
            - task: KubernetesManifest@1
              inputs:
                action: promote
                strategy: canary
                manifests: k8s/api.yaml`,
      },
      {
        title: 'App Service slot swap and traffic split',
        language: 'bash',
        code: `az webapp deployment slot create -g <rg> -n <app> --slot staging
az webapp deploy -g <rg> -n <app> --slot staging --src-path app.zip --type zip

# Send 10% of production traffic to staging
az webapp traffic-routing set -g <rg> -n <app> --distribution staging=10

# Promote, or roll back by swapping again
az webapp deployment slot swap -g <rg> -n <app> --slot staging --target-slot production`,
        placeholders: ['<rg>', '<app>'],
      },
    ],
    deeper: [
      'Slot swaps move **settings** too, unless a setting is marked as a slot setting ("deployment slot setting"). Connection strings that must stay with the production slot need that flag, or the swap points production at the staging database.',
      'Database schema changes are what make rollbacks hard in every strategy. Expand-and-contract migrations - add columns first, remove them in a later release - keep the old and new versions compatible during the switch.',
    ],
    traps: [
      'Swapping without warming up the staging slot, so production takes cold starts.',
      'Forgetting slot-sticky settings, so a swap moves the wrong connection string into production.',
      'Canary increments with no automated health check between them.',
    ],
    followUps: [
      'How would you roll back a database migration?',
      'How does this change with feature flags?',
      'What is ring-based deployment?',
    ],
    tags: ['deployment strategies', 'canary', 'blue-green', 'app service'],
  },
  {
    id: 'itv-azdo-16',
    level: 'basic',
    kind: 'mcq',
    prompt: 'In Azure Artifacts, what does adding npmjs.com as an upstream source to your feed do?',
    options: [
      {
        id: 'a',
        text: 'Lets clients install public packages through your feed, which saves a copy of each one used',
      },
      { id: 'b', text: 'Publishes every package in your feed to the public npm registry' },
      { id: 'c', text: 'Mirrors the whole public registry into your feed on a nightly schedule' },
      { id: 'd', text: 'Blocks public packages so only internal packages can be installed' },
    ],
    correct: ['a'],
    probing: 'Package supply chain basics: one feed, cached upstreams, reproducible builds.',
    answer: [
      'An **upstream source** lets your feed act as a proxy. Clients point only at your feed; when they ask for a package the feed does not have, it fetches it from the upstream and **saves a copy**. After that, the package is served from your feed even if it is later removed from the public registry.',
      'That gives you one place to authenticate, one place to audit which public packages are in use, protection from upstream outages and deleted packages, and a single configuration for developers and pipelines. It does not mirror everything, and it never publishes anything outward.',
    ],
    code: [
      {
        title: 'Point npm at the feed only',
        language: 'bash',
        code: `# .npmrc in the repo - the feed proxies npmjs.com through its upstream
echo "registry=https://pkgs.dev.azure.com/<org>/<project>/_packaging/<feed>/npm/registry/" > .npmrc
echo "always-auth=true" >> .npmrc

# In a pipeline, authenticate with the build identity
#   - task: npmAuthenticate@0
#     inputs:
#       workingFile: .npmrc`,
        placeholders: ['<org>', '<project>', '<feed>'],
      },
    ],
    traps: [
      'Configuring both the public registry and the feed on clients, which defeats the point.',
    ],
    followUps: ['How does a feed protect you from dependency confusion attacks?'],
    tags: ['azure artifacts', 'packages', 'upstream sources'],
  },
  {
    id: 'itv-azdo-17',
    level: 'intermediate',
    kind: 'open',
    prompt:
      'How would you organise Azure Artifacts feeds for a company, and how do you promote packages?',
    probing:
      'Feed scope, permissions, views and retention - the operational side of package management.',
    answer: [
      'Feeds can be **project-scoped** or **organisation-scoped**. I prefer project-scoped feeds for team packages, because permissions then follow the project, plus one shared organisation-level feed if there are genuinely company-wide libraries.',
      'Each feed would have **upstream sources** for the public registries it needs, so every build pulls through the feed. That makes builds reproducible and gives security a single place to see which open-source packages are in use.',
      '**Views** are how you promote. Every feed has `@local` (everything published), and by default `@prerelease` and `@release`. A pipeline publishes a new version to the feed; after it passes testing, a later stage promotes it to `@release`. Consumers who should only get tested versions point at the `@release` view.',
      'Permissions: the pipeline’s **build service identity** needs Feed Publisher (Contributor) to push, developers usually only need Reader. And set **retention policies** - keep the last N versions of each package - because feeds otherwise grow without limit, and packages that are in a view or recently downloaded are kept regardless.',
    ],
    code: [
      {
        title: 'Publish, then promote to the release view',
        language: 'yaml',
        code: `- stage: Publish
  jobs:
    - job: pack
      steps:
        - task: NuGetAuthenticate@1
        - script: dotnet pack src/Contoso.Payments.Client -c Release -o $(Build.ArtifactStagingDirectory) /p:Version=2.3.$(Build.BuildId)
        - script: >
            dotnet nuget push "$(Build.ArtifactStagingDirectory)/*.nupkg"
            --source https://pkgs.dev.azure.com/<org>/<project>/_packaging/<feed>/nuget/v3/index.json
            --api-key az

- stage: Promote
  dependsOn: Publish
  jobs:
    - deployment: promote
      environment: packages-release      # approval before release
      strategy:
        runOnce:
          deploy:
            steps:
              - script: echo "Promote with the Artifacts REST API: set view to Release"`,
        placeholders: ['<org>', '<project>', '<feed>'],
      },
    ],
    traps: [
      'Pipeline fails with 403 on push because the build service identity is not a Feed Publisher.',
      'No retention policy, so the feed grows until storage costs get noticed.',
      'Letting consumers use `@local`, so untested versions reach production.',
    ],
    followUps: [
      'Which identity does the pipeline use to publish to a feed?',
      'How would you share a feed with another project?',
    ],
    tags: ['azure artifacts', 'feeds', 'views', 'packages'],
  },
  {
    id: 'itv-azdo-18',
    level: 'intermediate',
    kind: 'open',
    prompt: 'GitHub Actions or Azure Pipelines - how do you choose, and how do the concepts map?',
    probing:
      'Pragmatism. The strong answer ties the choice to where the code lives and what governance is needed, not to a favourite tool.',
    answer: [
      'The biggest factor is **where the code lives**. If the repositories are on GitHub, GitHub Actions is the natural choice: tight integration with pull requests, the Marketplace, GitHub Advanced Security, environments with protection rules, and OIDC login to Azure. If the organisation is on Azure Repos with Boards and Test Plans, Azure Pipelines fits better.',
      'Azure Pipelines is still stronger in a few places: a mature **checks** model on protected resources (service connections, pools, variable groups), **extends templates** with required-template checks for central governance, deployment job strategies, and classic release support for teams that still depend on it. Actions is stronger on ecosystem, reusable workflows and developer experience.',
      'The concepts map closely. A **workflow** is a pipeline, a **job** is a job, a **step** is a step, a **runner** is an agent, a **reusable workflow** is roughly a template, **environments** exist in both, and a **service connection** corresponds to an `azure/login` step with an OIDC federated credential.',
      'It is also common to mix them - GitHub repos with Azure Pipelines for deployments - which Azure Pipelines supports through the GitHub app. For a migration, **GitHub Actions Importer** converts Azure Pipelines definitions and reports what it could not convert.',
    ],
    diagrams: [
      {
        kind: 'decision',
        title: 'GitHub Actions or Azure Pipelines?',
        caption: 'Where the code lives usually decides it; governance needs can tip the balance.',
        question: 'Where does the code live, and what governance is required?',
        branches: [
          {
            condition: 'Code on GitHub, standard governance',
            result: 'GitHub Actions',
            detail: 'OIDC to Azure, environments, GHAS',
            tone: 'success',
          },
          {
            condition: 'Azure Repos, Boards, Test Plans',
            result: 'Azure Pipelines',
            detail: 'Native integration and checks',
            tone: 'success',
          },
          {
            condition: 'Central template enforcement at scale',
            result: 'Azure Pipelines',
            detail: 'Extends + required template checks',
            tone: 'accent',
          },
          {
            condition: 'Mixed estate during migration',
            result: 'Both, with a plan',
            detail: 'GitHub Actions Importer helps',
            tone: 'warning',
          },
        ],
      },
    ],
    code: [
      {
        title: 'The same deploy in GitHub Actions with OIDC',
        language: 'yaml',
        code: `name: deploy
on:
  push:
    branches: [main]

permissions:
  id-token: write      # required for OIDC
  contents: read

jobs:
  deploy:
    runs-on: ubuntu-latest
    environment: prod  # protection rules live here
    steps:
      - uses: actions/checkout@v4
      - uses: azure/login@v2
        with:
          client-id: \${{ vars.AZURE_CLIENT_ID }}
          tenant-id: \${{ vars.AZURE_TENANT_ID }}
          subscription-id: \${{ vars.AZURE_SUBSCRIPTION_ID }}
      - run: az deployment group create -g rg-app-prod -f infra/main.bicep`,
      },
    ],
    traps: [
      'Picking a tool because of personal preference rather than where the code and governance live.',
      'Assuming a migration is a mechanical conversion. Approvals, checks and secrets need redesigning.',
    ],
    followUps: [
      'How would you enforce a mandatory security scan in GitHub Actions?',
      'What would you migrate first?',
    ],
    tags: ['github actions', 'azure pipelines', 'comparison', 'migration'],
  },
  {
    id: 'itv-azdo-19',
    level: 'intermediate',
    kind: 'scenario',
    prompt:
      'A pipeline that passed yesterday fails today with no code changes. Walk me through how you debug it.',
    probing:
      'Systematic debugging. They want "what changed" thinking - agents, images, dependencies, permissions - and the debug tooling.',
    answer: [
      'No code change means something **around** the code changed, so I start by asking what else could have moved. The usual suspects: the **agent image** (Microsoft-hosted images update regularly, and `ubuntu-latest` can change what it points at), an **unpinned dependency** or tool version, an **expired credential** or changed permission, a **template** repo referenced by branch rather than tag, or an external service being down.',
      'I compare the failing run with the last good one: the **agent image version** and tool versions printed in the "Initialize job" log, the resolved template (via **Download full YAML**), and the package versions restored. A diff between those usually finds it.',
      'For more detail I re-run with `system.debug` set to true, which gives verbose logs for every task. If the failure is on a self-hosted agent, I check the agent’s own diagnostic logs and disk space - a full disk is a surprisingly common cause.',
      'Then I fix the cause and make it not happen again: pin the image to a specific version (`ubuntu-24.04` rather than `ubuntu-latest`), pin tool versions with `UseDotNet`, `NodeTool` or similar tasks, commit lock files, and pin template repos to tags.',
    ],
    diagrams: [
      {
        kind: 'flow',
        title: 'Debugging a pipeline that broke on its own',
        caption: 'If the code did not change, compare everything the code depends on.',
        nodes: [
          { label: 'Failure with no code change', tone: 'danger' },
          {
            label: 'Diff against last good run',
            detail: 'Image version, tools, packages, templates',
            tone: 'accent',
          },
          { label: 'Re-run with system.debug', detail: 'Verbose logs for every task' },
          { label: 'Check identity and access', detail: 'Expired secret, removed role, feed 403' },
          {
            label: 'Fix and pin it',
            detail: 'Image, tool versions, lock files, tags',
            tone: 'success',
          },
        ],
      },
    ],
    code: [
      {
        title: 'Debugging switches and pinning',
        language: 'yaml',
        code: `variables:
  system.debug: true          # remove once diagnosed

pool:
  vmImage: ubuntu-24.04       # pinned, not ubuntu-latest

steps:
  - task: UseDotNet@2
    inputs:
      version: 8.0.x
  - task: NodeTool@0
    inputs:
      versionSpec: 20.x
  - script: |
      df -h
      dotnet --info
      node --version
    displayName: Print environment for comparison`,
      },
      {
        title: 'Rerun a failed run from the CLI with debug on',
        language: 'bash',
        code: `az pipelines runs list --pipeline-ids <id> --top 5 \\
  --query "[].{id:id, result:result, branch:sourceBranch, finished:finishTime}" -o table

az pipelines run --id <id> --branch main --variables system.debug=true`,
        placeholders: ['<id>'],
      },
    ],
    traps: [
      'Re-running until it goes green and calling it flaky.',
      'Leaving `system.debug` on permanently, which bloats logs.',
      'Pinning nothing, so the same failure returns next month.',
    ],
    followUps: [
      'How do you handle genuinely flaky tests?',
      'How would you find which image version a job ran on?',
    ],
    tags: ['scenario', 'debugging', 'pipelines', 'troubleshooting'],
  },
  {
    id: 'itv-azdo-20',
    level: 'advanced',
    kind: 'scenario',
    prompt:
      'Deployment runs sit in "Queued" or "Waiting" for a long time before anything happens. Where do you look?',
    probing:
      'Knowing every reason a job does not start: parallel jobs, pools, demands, checks, locks. Good candidates read the waiting message first.',
    answer: [
      'The first thing is the **exact message on the run**, because Azure DevOps usually says why it is waiting - and the reasons are quite different.',
      '"Waiting for an available agent" or a queue position means **capacity**. Either the organisation has run out of **parallel jobs** (each concurrently running job needs one, and a free organisation has a limited grant), or the pool has no **online, idle agent** matching the job’s **demands**. I would check the pool’s agents and their capabilities, and the parallel jobs page under organisation settings.',
      '"Waiting for checks" or a stage showing pending approval means **checks**: an approval nobody has acted on, a business-hours window, an **exclusive lock** held by another run on the same environment, or an Azure Function or monitor-alert gate that keeps re-evaluating.',
      'For Managed DevOps Pools or scale set agents there is also **scale-out time** - a pool scaled to zero needs minutes to provision a machine, which looks like queueing. Keeping a small standby count during working hours fixes that.',
      'Fixes follow from the cause: buy parallel jobs or move non-critical jobs off the pool, fix demands or bring agents back online, change exclusive-lock behaviour to "sequential" or "run latest only", and make sure approvers get notifications.',
    ],
    diagrams: [
      {
        kind: 'decision',
        title: 'Why is the job not starting?',
        caption:
          'Read the waiting message first; capacity, matching and checks each have their own fix.',
        question: 'What does the run say it is waiting for?',
        branches: [
          {
            condition: 'Available agent, queue position',
            result: 'Parallel job limit',
            detail: 'Org settings, Parallel jobs',
            tone: 'warning',
          },
          {
            condition: 'No agent matching demands',
            result: 'Pool or capabilities',
            detail: 'Agents offline or missing capability',
          },
          {
            condition: 'Checks or approval pending',
            result: 'Environment checks',
            detail: 'Approver, business hours, gate',
            tone: 'accent',
          },
          {
            condition: 'Exclusive lock',
            result: 'Another run holds the environment',
            detail: 'Cancel it or change lock behaviour',
          },
          {
            condition: 'Pool scaled to zero',
            result: 'Provisioning time',
            detail: 'Add standby agents in work hours',
          },
        ],
      },
    ],
    code: [
      {
        title: 'Check pool health from the CLI',
        language: 'bash',
        code: `POOL=$(az pipelines pool list --pool-name build-linux --query "[0].id" -o tsv)

az pipelines agent list --pool-id $POOL --include-capabilities \\
  --query "[].{name:name, status:status, enabled:enabled, os:systemCapabilities.\\"Agent.OS\\"}" -o table`,
      },
      {
        title: 'Exclusive lock behaviour on a stage',
        language: 'yaml',
        code: `- stage: Prod
  lockBehavior: runLatest     # superseded queued runs are cancelled
  jobs:
    - deployment: api
      environment: prod       # the environment has the Exclusive lock check
      strategy:
        runOnce:
          deploy:
            steps:
              - script: ./deploy.sh`,
      },
    ],
    deeper: [
      'Parallel jobs are counted separately for Microsoft-hosted and self-hosted agents, and across all pipelines in the organisation. One team’s nightly matrix build can starve everyone else’s deployments; separate pools and scheduling are the structural fix.',
    ],
    traps: [
      'Adding more self-hosted agents when the limit is parallel jobs, not machines.',
      'Not noticing a stale run holding the exclusive lock.',
    ],
    followUps: [
      'How are parallel jobs licensed for private versus public projects?',
      'How would you stop one team starving the rest?',
    ],
    tags: ['scenario', 'agents', 'parallel jobs', 'checks', 'troubleshooting'],
  },
  {
    id: 'itv-azdo-21',
    level: 'advanced',
    kind: 'scenario',
    prompt:
      'After the project was renamed, every Azure deployment fails at login with "No matching federated identity record found". Then, after fixing that, one pipeline fails with AuthorizationFailed. Walk me through both.',
    probing:
      'Real federation troubleshooting. The candidate must know what the subject claim contains and separate authentication from authorisation.',
    answer: [
      'The first error is **authentication**. With workload identity federation, Entra ID only issues a token if the incoming token’s **issuer and subject** exactly match a federated credential on the identity. The subject includes the organisation, **project** and service connection names - `sc://<org>/<project>/<connection>` - so renaming the project changed the subject and nothing matches any more.',
      'The fix is to update the federated credential’s subject to the new value (the service connection page shows the expected issuer and subject), or add a second credential for the new subject during the transition. The same thing happens if someone renames the service connection or the organisation.',
      'The second error is **authorisation**: login now succeeds, but the identity lacks an RBAC role on the scope it is deploying to. `AuthorizationFailed` names the action and the scope, which tells you exactly what is missing - commonly a new resource group, or a deployment that creates **role assignments**, which needs Owner, User Access Administrator or Role Based Access Control Administrator rather than Contributor.',
      'I would grant the narrowest role on the narrowest scope that the error names - and resist granting Owner on the subscription just to make it green. RBAC changes can take a few minutes to propagate, so a retry after assigning is normal.',
    ],
    diagrams: [
      {
        kind: 'flow',
        title: 'Authentication first, then authorisation',
        caption: 'Federation errors are about matching claims; AuthorizationFailed is about RBAC.',
        nodes: [
          { label: 'Job requests OIDC token', detail: 'Subject includes project name' },
          {
            label: 'Entra matches federated credential',
            detail: 'Issuer and subject must be exact',
            branch: { label: 'No match after rename', detail: 'Update the credential subject' },
          },
          { label: 'Azure token issued', tone: 'success' },
          {
            label: 'ARM checks RBAC on scope',
            detail: 'Action plus scope from the error',
            branch: { label: 'AuthorizationFailed', detail: 'Grant narrow role on that scope' },
          },
          { label: 'Deployment runs', tone: 'success' },
        ],
      },
    ],
    code: [
      {
        title: 'Inspect and fix the federated credential',
        language: 'bash',
        code: `az ad app federated-credential list --id <app-object-id> \\
  --query "[].{name:name, subject:subject, issuer:issuer}" -o table

az ad app federated-credential update --id <app-object-id> \\
  --federated-credential-id ado-payments-prod --parameters '{
  "name": "ado-payments-prod",
  "issuer": "<issuer-url-shown-on-the-service-connection>",
  "subject": "sc://<org>/<new-project-name>/sc-payments-prod",
  "audiences": ["api://AzureADTokenExchange"]
}'`,
        placeholders: [
          '<app-object-id>',
          '<issuer-url-shown-on-the-service-connection>',
          '<org>',
          '<new-project-name>',
        ],
      },
      {
        title: 'Grant exactly what the error names',
        language: 'bash',
        code: `# Error: ... does not have authorization to perform action
#   'Microsoft.Authorization/roleAssignments/write' over scope '/subscriptions/.../resourceGroups/rg-payments-prod'
az role assignment create --assignee <app-client-id> \\
  --role "Role Based Access Control Administrator" \\
  --scope /subscriptions/<sub>/resourceGroups/rg-payments-prod`,
        placeholders: ['<app-client-id>', '<sub>'],
      },
    ],
    traps: [
      'Recreating the service connection with a client secret "because federation is broken".',
      'Granting Owner on the subscription to fix an AuthorizationFailed on one resource group.',
      'Treating both errors as the same problem.',
    ],
    followUps: [
      'Why does creating role assignments need more than Contributor?',
      'How would you constrain what role assignments the pipeline may create?',
    ],
    tags: ['scenario', 'workload identity federation', 'rbac', 'troubleshooting'],
  },
]
