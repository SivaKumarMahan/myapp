import type { InterviewQuestion } from '../../../types'

/** Azure DevOps services, YAML pipelines, templates, variables and agents. */
export const azureDevopsPlatformQuestions: InterviewQuestion[] = [
  {
    id: 'itv-azdo-1',
    level: 'basic',
    kind: 'open',
    prompt: 'Give me an overview of Azure DevOps. What are the services and how is it organised?',
    probing:
      'Orientation. They want the five services, the organisation/project hierarchy, and a sense of where the security boundaries are.',
    answer: [
      'Azure DevOps is Microsoft’s hosted suite for planning, building and shipping software. It has five services you can turn on or off per project: **Boards** for work items, backlogs and sprints; **Repos** for Git repositories with pull requests and branch policies; **Pipelines** for CI/CD; **Test Plans** for manual and exploratory testing; and **Artifacts** for package feeds - NuGet, npm, Maven, Python and Universal Packages.',
      'The hierarchy is **organisation**, then **projects**, then the things inside a project - repos, pipelines, boards, feeds. The organisation is connected to a Microsoft Entra tenant, which is where users authenticate, and it holds billing, parallel-job purchases and organisation-wide policies.',
      'The **project** is the main security and visibility boundary. Permissions, service connections, agent pool access, environments and variable groups are all granted within a project, so how you split projects is really a decision about who should see and use what.',
    ],
    diagrams: [
      {
        kind: 'nested',
        title: 'How Azure DevOps is organised',
        caption:
          'The project is the main permission boundary; the organisation owns identity and billing.',
        root: {
          label: 'Organisation',
          detail: 'Linked to an Entra tenant, billing, policies',
          tone: 'accent',
          children: [
            {
              label: 'Project: payments',
              detail: 'Permissions and visibility boundary',
              children: [
                { label: 'Boards and Repos', detail: 'Work items, Git, PR policies' },
                { label: 'Pipelines', detail: 'YAML, environments, service connections' },
                { label: 'Artifacts feed', detail: 'Project-scoped packages' },
              ],
            },
            { label: 'Project: platform', detail: 'Separate permissions', tone: 'muted' },
          ],
        },
      },
    ],
    code: [
      {
        title: 'Exploring an organisation from the CLI',
        language: 'bash',
        code: `az extension add --name azure-devops
az devops configure --defaults organization=https://dev.azure.com/<org> project=<project>

az devops project list --query "value[].name" -o tsv
az repos list --query "[].{name:name, defaultBranch:defaultBranch}" -o table
az pipelines list --query "[].{name:name, folder:path}" -o table`,
        placeholders: ['<org>', '<project>'],
      },
    ],
    traps: [
      'Calling it "VSTS" or "TFS" as if they were current products. Azure DevOps Server is the self-hosted edition; Azure DevOps Services is the cloud one.',
      'Putting every team in one giant project and then struggling to restrict who can use the production service connection.',
    ],
    followUps: [
      'How would you split teams across projects?',
      'When would you use GitHub instead of Azure Repos?',
    ],
    tags: ['azure devops', 'fundamentals', 'organisation'],
  },
  {
    id: 'itv-azdo-2',
    level: 'basic',
    kind: 'mcq',
    prompt:
      'Which statement about YAML pipelines versus classic build and release pipelines is correct?',
    options: [
      {
        id: 'a',
        text: 'YAML pipelines are versioned with the code, reviewed in pull requests, and are the recommended model for new work',
      },
      {
        id: 'b',
        text: 'Classic release pipelines are the only way to use approvals before production',
      },
      { id: 'c', text: 'YAML pipelines cannot deploy to environments, only build artifacts' },
      { id: 'd', text: 'Classic pipelines are stored as YAML files in the repository' },
    ],
    correct: ['a'],
    probing:
      'Whether the candidate knows where Azure Pipelines is heading and why pipeline-as-code matters.',
    answer: [
      '**YAML pipelines** live in the repository as `azure-pipelines.yml` (or any file you point at). That means the pipeline is **versioned with the code**, changes go through the same pull request review, a branch can carry its own pipeline change, and templates let you share logic across repos. Multi-stage YAML covers build and deployment, with **environments** providing approvals and checks. It is the recommended model for new pipelines.',
      '**Classic** pipelines are defined in the web designer and stored in Azure DevOps, not in Git. Classic release pipelines did have pre-deployment approvals, which is where option b comes from - but YAML environments offer approvals and a richer set of checks. Microsoft has also added organisation settings to disable creating new classic pipelines, which tells you the direction.',
    ],
    code: [
      {
        title: 'A minimal multi-stage YAML pipeline',
        language: 'yaml',
        code: `trigger:
  branches:
    include: [main]

pool:
  vmImage: ubuntu-latest

stages:
  - stage: Build
    jobs:
      - job: build
        steps:
          - script: dotnet publish -c Release -o $(Build.ArtifactStagingDirectory)
          - publish: $(Build.ArtifactStagingDirectory)
            artifact: app

  - stage: Prod
    dependsOn: Build
    jobs:
      - deployment: deploy
        environment: prod   # approvals and checks live on the environment
        strategy:
          runOnce:
            deploy:
              steps:
                - script: echo "deploying $(Pipeline.Workspace)/app"`,
      },
    ],
    traps: [
      'Saying you need classic releases for approvals.',
      'Believing the YAML editor in the portal stores a copy outside Git. It commits to the repo.',
    ],
    followUps: ['How would you migrate a classic release pipeline to YAML?'],
    tags: ['pipelines', 'yaml', 'classic'],
  },
  {
    id: 'itv-azdo-3',
    level: 'basic',
    kind: 'mcq',
    prompt:
      'You added a pr: trigger to azure-pipelines.yml in an Azure Repos Git repository, but pull requests do not start the pipeline. Why?',
    options: [
      { id: 'a', text: 'The pr: section must be indented under trigger:' },
      {
        id: 'b',
        text: 'For Azure Repos Git, PR validation is configured with a build validation branch policy, not the pr: keyword',
      },
      { id: 'c', text: 'PR triggers only work on Microsoft-hosted agents' },
      { id: 'd', text: 'The pipeline needs a scheduled trigger before PR triggers are enabled' },
    ],
    correct: ['b'],
    probing: 'A very common real-world confusion between GitHub and Azure Repos behaviour.',
    answer: [
      'The YAML `pr:` trigger is honoured for **GitHub** and **Bitbucket Cloud** repositories. For **Azure Repos Git** it is ignored; instead you add a **build validation** policy on the target branch, which queues the pipeline for every PR into that branch and can make it required before merge.',
      'The other trigger types work the same everywhere: `trigger:` for CI on pushes, `schedules:` for cron-based runs, and `resources: pipelines:` for running when another pipeline completes.',
    ],
    code: [
      {
        title: 'Add build validation to main with the CLI',
        language: 'bash',
        code: `az repos policy build create \\
  --repository-id <repo-id> --branch main \\
  --build-definition-id <pipeline-id> \\
  --display-name "PR build" \\
  --blocking true --enabled true \\
  --manual-queue-only false --queue-on-source-update-only false \\
  --valid-duration 720`,
        placeholders: ['<repo-id>', '<pipeline-id>'],
      },
      {
        title: 'The other trigger types in YAML',
        language: 'yaml',
        code: `trigger:
  branches:
    include: [main, release/*]
  paths:
    exclude: [docs/*]

schedules:
  - cron: '0 2 * * 1-5'       # UTC
    displayName: Nightly
    branches:
      include: [main]
    always: false             # skip if nothing changed

resources:
  pipelines:
    - pipeline: build
      source: app-ci
      trigger:
        branches:
          include: [main]`,
      },
    ],
    traps: ['Debugging the YAML for an hour when the fix is a branch policy.'],
    followUps: ['How would you run a pipeline only when certain paths change?'],
    tags: ['pipelines', 'triggers', 'branch policies'],
  },
  {
    id: 'itv-azdo-4',
    level: 'intermediate',
    kind: 'open',
    prompt:
      'Explain the structure of a multi-stage YAML pipeline: stages, jobs, steps, dependencies, conditions, and passing values between stages.',
    probing:
      'Hands-on pipeline authoring. They want the hierarchy, what runs in parallel by default, and the output-variable syntax that trips people up.',
    answer: [
      'A pipeline is a set of **stages**, a stage is a set of **jobs**, and a job is a sequence of **steps** - scripts or tasks - that run on **one agent**. Stages run sequentially by default (each depends on the previous one), but jobs within a stage run **in parallel** unless you add `dependsOn`.',
      'Each job gets a fresh agent workspace, so files do not carry over between jobs. You pass files with **pipeline artifacts** (`publish` and `download`) and small values with **output variables**.',
      "`condition` decides whether something runs. The default is `succeeded()`; common alternatives are `always()` for cleanup, `failed()` for notifications, and expressions like `eq(variables['Build.SourceBranch'], 'refs/heads/main')` to deploy only from main.",
      "Output variables are set from a script with the `setvariable` logging command and `isOutput=true`. Within the same stage you read them via `dependencies.<job>.outputs['<step>.<var>']`; across stages it is `stageDependencies.<stage>.<job>.outputs[...]`. Getting that path right - job name, step **name**, variable - is the usual source of blank values.",
    ],
    diagrams: [
      {
        kind: 'flow',
        title: 'Stages, jobs and what runs where',
        caption:
          'Jobs in a stage run in parallel on separate agents; artifacts carry files between them.',
        nodes: [
          { label: 'Stage Build', detail: 'Jobs: compile, test in parallel', tone: 'accent' },
          {
            label: 'Publish artifact',
            detail: 'Files leave the agent here',
            arrowLabel: 'publish',
          },
          {
            label: 'Stage Test',
            detail: 'dependsOn Build, gets output vars',
            arrowLabel: 'stageDependencies',
          },
          {
            label: 'Stage Prod',
            detail: 'Deployment job to environment prod',
            arrowLabel: 'condition: main only',
            branch: { label: 'Skipped on PR branches', detail: 'condition evaluates false' },
          },
          { label: 'Cleanup job', detail: 'condition: always()', tone: 'muted' },
        ],
      },
    ],
    code: [
      {
        title: 'Output variable passed across stages',
        language: 'yaml',
        code: `stages:
  - stage: Build
    jobs:
      - job: version
        steps:
          - bash: echo "##vso[task.setvariable variable=semver;isOutput=true]1.4.$(Build.BuildId)"
            name: setver               # the step NAME is part of the path

  - stage: Deploy
    dependsOn: Build
    condition: and(succeeded(), eq(variables['Build.SourceBranch'], 'refs/heads/main'))
    variables:
      semver: $[ stageDependencies.Build.version.outputs['setver.semver'] ]
    jobs:
      - job: show
        steps:
          - script: echo "Deploying version $(semver)"`,
      },
    ],
    traps: [
      'Forgetting `name:` on the step that sets the output variable, so the reference resolves to empty.',
      'Expecting a file written in one job to exist in the next job.',
      'Adding a custom condition and accidentally dropping `succeeded()`, so the stage runs even when the build failed.',
    ],
    followUps: [
      'Why does a custom condition sometimes run after a failure?',
      'What is the difference between dependencies and stageDependencies?',
    ],
    tags: ['pipelines', 'yaml', 'stages', 'variables'],
  },
  {
    id: 'itv-azdo-5',
    level: 'intermediate',
    kind: 'open',
    prompt:
      'How do you reuse pipeline logic in Azure Pipelines? Explain templates, parameters versus variables, and the three expression syntaxes.',
    probing:
      'Scaling pipelines across many repos. The expression-syntax question separates people who have debugged templates from people who have copied them.',
    answer: [
      '**Templates** are YAML files you include in a pipeline. There are step, job, stage and variable templates you insert with `template:`, and **extends templates**, where the pipeline declares `extends: template: ...` and the template controls the overall structure. Templates can live in another repository, referenced through `resources: repositories:` and pinned to a tag or branch.',
      '**Parameters** are typed inputs to a template or pipeline - string, number, boolean, object, stepList - resolved when the pipeline is **compiled**, so they can change the structure: add stages, loop over environments, include steps conditionally. **Variables** are strings resolved while the pipeline **runs**, so they cannot change which jobs exist.',
      'That maps to three syntaxes. `${{ parameters.env }}` is **compile-time** template expression - evaluated before anything runs, and the only one that can drive `if` and `each`. `$[ variables.x ]` is a **runtime expression**, used in conditions and variable definitions. `$(x)` is **macro syntax**, replaced just before a task runs.',
      'For a platform team, the pattern I like is a central templates repo with stage templates for build, scan and deploy, and an **extends** template that product pipelines must use. Combined with a **required template check** on production resources, it guarantees that anything deploying to production went through the approved stages.',
    ],
    code: [
      {
        title: 'A stage template with typed parameters and a loop',
        language: 'yaml',
        code: `# templates/deploy-stages.yml
parameters:
  - name: environments
    type: object
    default: [dev, test, prod]
  - name: runSmokeTests
    type: boolean
    default: true

stages:
  - \${{ each env in parameters.environments }}:
      - stage: deploy_\${{ env }}
        jobs:
          - deployment: deploy
            environment: \${{ env }}
            strategy:
              runOnce:
                deploy:
                  steps:
                    - script: ./deploy.sh \${{ env }}
                    - \${{ if parameters.runSmokeTests }}:
                        - script: ./smoke.sh \${{ env }}`,
      },
      {
        title: 'Consuming it from another repo, pinned to a tag',
        language: 'yaml',
        code: `resources:
  repositories:
    - repository: templates
      type: git
      name: platform/pipeline-templates
      ref: refs/tags/v3.2.0

extends:
  template: templates/deploy-stages.yml@templates
  parameters:
    environments: [dev, prod]`,
      },
    ],
    deeper: [
      'Because `${{ }}` is evaluated at compile time, it cannot see variables set by a script during the run. If a condition must depend on something a previous job computed, it has to be a runtime expression.',
      'The **Download full YAML** option on a run shows the pipeline after all templates are expanded, which is the fastest way to debug template logic.',
    ],
    traps: [
      'Using `$(var)` inside `${{ if }}` and wondering why it is always false.',
      'Referencing a templates repo on `main` so every product pipeline changes the moment someone merges.',
      'Using variables where parameters are needed to change the pipeline’s shape.',
    ],
    followUps: [
      'How does an extends template enforce security?',
      'When is a runtime expression evaluated?',
    ],
    tags: ['pipelines', 'templates', 'parameters', 'expressions'],
  },
  {
    id: 'itv-azdo-6',
    level: 'advanced',
    kind: 'open',
    prompt:
      'How do secrets flow into Azure Pipelines? Cover variable groups, Key Vault, secret variables and the ways secrets leak.',
    probing:
      'Secret hygiene in CI. Strong answers know masking is best-effort and prefer identity over stored secrets entirely.',
    answer: [
      'There are three places secrets can come from. **Secret pipeline variables** are set in the pipeline settings, encrypted, and never shown again. **Variable groups** are shared sets of variables in the Library, which can be marked secret and shared across pipelines with pipeline permissions. And a variable group can be **linked to Azure Key Vault**, so the values are fetched from the vault at run time and rotating the secret in Key Vault updates every pipeline.',
      'Secret variables behave differently from normal ones on purpose. They are **not** exposed to scripts as environment variables automatically - you map them explicitly with `env:` - they are not passed to builds from **forks**, and they are **masked** in logs.',
      'Masking is string matching, so it is best-effort. A secret that is base64-encoded, split, URL-encoded or written to a file and published as an artifact is not masked. That is how most pipeline secret leaks happen.',
      'The best secret is no secret. For Azure access I use a **workload identity federation** service connection so there is no client secret at all, and scripts that need other secrets fetch them from Key Vault using that identity at the moment they are needed.',
    ],
    code: [
      {
        title: 'Key Vault-linked group and explicit mapping',
        language: 'yaml',
        code: `variables:
  - group: payments-prod-kv      # linked to Key Vault in the Library

steps:
  - task: AzureCLI@2
    inputs:
      azureSubscription: sc-payments-prod    # workload identity federation
      scriptType: bash
      scriptLocation: inlineScript
      inlineScript: |
        # Secrets are NOT in the environment unless mapped below
        ./migrate.sh --connection-name orders
    env:
      DB_PASSWORD: $(orders-db-password)      # explicit, visible in review`,
      },
      {
        title: 'Fetch a secret on demand instead of storing it',
        language: 'bash',
        code: `# Inside an AzureCLI@2 step authenticated through the service connection
token=$(az keyvault secret show --vault-name <vault> -n partner-api-token --query value -o tsv)
echo "##vso[task.setvariable variable=partnerToken;issecret=true]$token"`,
        placeholders: ['<vault>'],
      },
    ],
    deeper: [
      'Anyone who can edit the YAML on a branch that the pipeline runs with can print a secret in a transformed form. Protecting secrets therefore means protecting **who can run the pipeline against the resources that hold them** - pipeline permissions on the variable group, branch control and approvals on the environment - not just masking.',
      'Setting `issecret=true` on a runtime variable registers it for masking in all subsequent log output, which matters when a script fetches a secret dynamically.',
    ],
    traps: [
      'Assuming masking makes it safe to echo a secret.',
      'Granting "open access" on a variable group so every pipeline in the project can read production secrets.',
      'Storing a service principal client secret in a variable when a federated service connection would need none.',
    ],
    followUps: [
      'How would a malicious pull request try to exfiltrate a secret?',
      'How do you restrict which pipelines can use a variable group?',
    ],
    tags: ['pipelines', 'secrets', 'key vault', 'security'],
  },
  {
    id: 'itv-azdo-7',
    level: 'basic',
    kind: 'open',
    prompt:
      'Compare Microsoft-hosted agents, self-hosted agents, scale set agents and Managed DevOps Pools. When would you use each?',
    probing:
      'Agent choice is a cost, security and networking decision. They want to hear private network access as the usual driver.',
    answer: [
      '**Microsoft-hosted agents** are fresh VMs Microsoft provides per job, with common tools preinstalled, and thrown away afterwards. No maintenance, clean every time - but no access to your private network, limited control over the image, and each job starts cold with no caches.',
      '**Self-hosted agents** are machines you install the agent on. You control the tools and hardware, they can sit inside your VNet to reach private endpoints, and caches persist. The cost is that you patch them, scale them and secure them, and a long-lived agent can accumulate state between jobs.',
      '**Scale set agents** point an agent pool at a VM scale set you own; Azure DevOps grows and shrinks it and can recycle machines after each job. **Managed DevOps Pools** is the newer managed service for the same need: you describe the pool - image, size, VNet, scaling - as an Azure resource and Microsoft runs the infrastructure, which gives you private networking without maintaining the scale set yourself.',
      'My default: Microsoft-hosted for anything that does not need private access; Managed DevOps Pools for deployments into private networks or builds that need bigger machines or custom images; plain self-hosted agents only for special hardware or on-premises targets.',
    ],
    diagrams: [
      {
        kind: 'decision',
        title: 'Choosing an agent type',
        caption: 'Private network access and custom images are what push you off Microsoft-hosted.',
        question: 'What does the job need?',
        branches: [
          {
            condition: 'Public endpoints, standard tools',
            result: 'Microsoft-hosted',
            detail: 'Zero maintenance, fresh VM per job',
            tone: 'success',
          },
          {
            condition: 'Private endpoints in a VNet',
            result: 'Managed DevOps Pools',
            detail: 'VNet injection, Microsoft runs it',
            tone: 'accent',
          },
          {
            condition: 'Own scale set already, full control',
            result: 'Scale set agents',
            detail: 'You own the VMSS and its image',
          },
          {
            condition: 'Special hardware or on-premises',
            result: 'Self-hosted agent',
            detail: 'You patch, scale and secure it',
            tone: 'warning',
          },
        ],
      },
    ],
    code: [
      {
        title: 'Choosing a pool in YAML, with demands',
        language: 'yaml',
        code: `jobs:
  - job: unit_tests
    pool:
      vmImage: ubuntu-latest          # Microsoft-hosted

  - job: deploy_private
    pool:
      name: mdp-payments-prod         # Managed DevOps Pool inside the VNet
      demands:
        - Agent.OS -equals Linux`,
      },
      {
        title: 'Registering a self-hosted Linux agent (unattended)',
        language: 'bash',
        code: `./config.sh --unattended \\
  --url https://dev.azure.com/<org> \\
  --auth pat --token <pat-with-agent-pools-manage> \\
  --pool build-linux --agent "$(hostname)" \\
  --replace --acceptTeeEula
sudo ./svc.sh install && sudo ./svc.sh start`,
        placeholders: ['<org>', '<pat-with-agent-pools-manage>'],
      },
    ],
    traps: [
      'Forgetting that parallel jobs are licensed separately - more agents do not help if you only bought one parallel job.',
      'Running long-lived self-hosted agents for untrusted PR builds, where one job can leave malware for the next.',
    ],
    followUps: [
      'How are parallel jobs licensed?',
      'How would you make a self-hosted agent ephemeral?',
    ],
    tags: ['agents', 'managed devops pools', 'pipelines'],
  },
  {
    id: 'itv-azdo-8',
    level: 'advanced',
    kind: 'open',
    prompt:
      'Design the build agent infrastructure for a company whose production resources are only reachable through private endpoints.',
    probing:
      'Platform design. They want networking, isolation between environments, ephemeral agents, identity and cost addressed together.',
    answer: [
      'The core constraint is that Microsoft-hosted agents run on the public internet and cannot reach private endpoints, so deployments need agents **inside** the network. I would use **Managed DevOps Pools** with VNet injection into a dedicated agent subnet that has routes and DNS to reach the private endpoints - private DNS zones linked to that VNet are essential, or the agents will resolve public IPs and fail.',
      'I would run **separate pools per trust level**: one for untrusted work such as PR builds, and one per production boundary, with the production pool’s subnet only able to reach production resources. Pool permissions in Azure DevOps restrict which pipelines can use the production pool.',
      'Agents should be **ephemeral** - a fresh machine per job - so nothing one job leaves behind can affect the next, and images should be built and patched on a schedule with the tools baked in, so jobs do not download toolchains every run.',
      'For identity, deployments authenticate through **workload identity federation** service connections, not secrets on the agents. If the pool itself has a managed identity, it should have no standing permissions to production - otherwise any pipeline scheduled on the pool inherits them.',
      'Finally cost: scale to zero out of hours, set a sensible maximum, keep a small standby count only during working hours, and use Microsoft-hosted agents for all the jobs that do not need the network.',
    ],
    deeper: [
      'Egress matters too. Agents need outbound access to Azure DevOps service URLs and package sources; a firewall with an allow list or a NAT gateway with a known IP is typical, and the allow list has to be maintained as Microsoft publishes changes.',
      'Caching is the price of ephemerality. Pipeline caching (`Cache@2`) and an Azure Artifacts upstream feed recover most of the speed without reintroducing shared state.',
    ],
    diagrams: [
      {
        kind: 'nested',
        title: 'Private deployment agents',
        caption:
          'Agents live in the VNet, resolve private DNS, and hold no standing production rights.',
        root: {
          label: 'Hub VNet',
          tone: 'accent',
          children: [
            {
              label: 'snet-agents-prod',
              detail: 'Managed DevOps Pool, ephemeral agents',
              tone: 'success',
            },
            {
              label: 'Private DNS zones',
              detail: 'privatelink zones linked to the VNet',
            },
            {
              label: 'Spoke: production',
              children: [
                { label: 'Private endpoint: Key Vault' },
                { label: 'Private endpoint: SQL, Storage' },
              ],
            },
          ],
        },
      },
    ],
    code: [
      {
        title: 'Using pipeline caching on ephemeral agents',
        language: 'yaml',
        code: `variables:
  npm_config_cache: $(Pipeline.Workspace)/.npm

steps:
  - task: Cache@2
    inputs:
      key: 'npm | "$(Agent.OS)" | package-lock.json'
      restoreKeys: |
        npm | "$(Agent.OS)"
      path: $(npm_config_cache)
  - script: npm ci`,
      },
      {
        title: 'Checking private DNS from the agent',
        language: 'bash',
        code: `# Must return a 10.x private address, not a public IP
nslookup <vault>.vault.azure.net
curl -sS -o /dev/null -w "%{http_code}\\n" https://<vault>.vault.azure.net/healthstatus`,
        placeholders: ['<vault>'],
      },
    ],
    traps: [
      'Giving the agent pool’s managed identity Contributor on production.',
      'Sharing one pool between PR validation and production deployments.',
      'Forgetting private DNS, so agents in the VNet still resolve public endpoints.',
    ],
    followUps: [
      'How do you stop a PR pipeline from using the production pool?',
      'How would you patch agent images?',
    ],
    tags: ['agents', 'networking', 'private endpoints', 'design', 'security'],
  },
]
