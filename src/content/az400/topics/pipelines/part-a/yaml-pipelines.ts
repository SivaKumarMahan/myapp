import type { Topic } from '../../../../types'

export const yamlPipelines: Topic = {
  id: 'az4-yaml-pipelines',
  title: 'Azure Pipelines YAML: triggers, stages, jobs, steps and conditions',
  domainId: 'az4-pipelines',
  difficulty: 'beginner',
  estimatedMinutes: 40,
  order: 3,
  tags: [
    'azure-pipelines',
    'yaml',
    'triggers',
    'stages',
    'jobs',
    'dependsOn',
    'conditions',
    'matrix',
    'multi-stage',
  ],
  oneLiner:
    'Read and write an azure-pipelines.yml: what starts it, how stages, jobs and steps nest, and how dependsOn, conditions and matrices control what runs.',
  explanation: [
    'An Azure Pipelines **YAML pipeline** is a file in your repository (by convention `azure-pipelines.yml`) that describes a build and release process. Because it lives with the code, it is versioned, reviewed in pull requests and branches with the code - unlike the older **classic** pipelines edited in the web UI.',
    'The hierarchy is **pipeline > stages > jobs > steps**. A **step** is a single task (`task: DotNetCoreCLI@2`) or script (`script:`, `bash:`, `pwsh:`). A **job** is a group of steps that runs on one agent, one after another, sharing a workspace. A **stage** is a group of jobs - typically Build, Test, Deploy to staging, Deploy to production - and is the unit that approvals and environments usually attach to.',
    'You can omit levels you do not need: a file with only `steps:` is a pipeline with one implicit stage and one implicit job. As soon as you need a second environment or an approval, you move to explicit **multi-stage** YAML.',
    '**Triggers** decide when a run starts: `trigger` (CI on push), `pr` (pull request builds for GitHub and Bitbucket repos), `schedules` (cron), and `resources.pipelines` (run when another pipeline completes). For **Azure Repos**, PR builds are configured with a build validation **branch policy**, not the `pr` keyword.',
    "Ordering and branching logic use **dependsOn** (which stages or jobs must finish first) and **condition** (an expression such as `and(succeeded(), eq(variables['Build.SourceBranch'], 'refs/heads/main'))`). **strategy: matrix** fans one job definition out into several parallel copies with different variables.",
  ],
  whyItMatters: [
    'Pipelines are the largest part of the AZ-400 exam, and YAML is the default. You are expected to read a snippet and say what runs, in what order, on which trigger - or spot the one line that is wrong.',
    'Most real pipeline bugs are structural: a stage that runs on every branch because it had no condition, a PR build that never fires because the `pr` keyword was used with Azure Repos, a scheduled build that silently skips because nothing changed.',
    'Understanding the model also tells you where to put things: variables and pools at the right scope, approvals on stages, and parallelism at the job level where agents are allocated.',
  ],
  howItWorks: [
    'When an event occurs (push, PR, schedule, upstream pipeline completion), Azure Pipelines reads the YAML **from the branch being built** and evaluates its trigger sections. `trigger: none` disables CI; `pr: none` disables PR builds for GitHub repositories.',
    'The file is compiled first: templates are expanded and `${{ }}` compile-time expressions are resolved. The result is a plan of stages and jobs. Runtime expressions (`$[ ]`) and conditions are evaluated later, as the run progresses.',
    'Stages run **sequentially by default** - each stage implicitly depends on the one above it. Jobs inside a stage run **in parallel by default** (subject to available parallel jobs and agents), unless you add `dependsOn`. Steps inside a job always run in order.',
    'The default condition for a stage or job is `succeeded()`: all dependencies succeeded. Other functions: `failed()`, `succeededOrFailed()`, `always()`, `canceled()`. Adding your own `condition` **replaces** the default, so you usually wrap it: `and(succeeded(), ...)`.',
    'Each job is sent to an **agent** from the pool named by `pool` (for example `vmImage: ubuntu-latest` for Microsoft-hosted). A job gets a fresh workspace; to pass files to a later job or stage, publish a **pipeline artifact** and download it.',
    "To pass values, a step sets an output variable with the logging command `##vso[task.setvariable variable=name;isOutput=true]value`. Another job reads it via `dependencies.<job>.outputs['<step>.<name>']`, and another stage via `stageDependencies.<stage>.<job>.outputs['<step>.<name>']`.",
    'A **matrix** creates one job per entry. `maxParallel` limits how many run at once. `parallel: N` (slicing) instead runs N identical copies, typically to split a test suite.',
  ],
  diagrams: [
    {
      kind: 'nested',
      title: 'Pipeline, stages, jobs and steps',
      caption:
        'Stages run one after another by default; jobs in a stage run in parallel on separate agents; steps in a job run in order on one agent.',
      root: {
        label: 'Pipeline (azure-pipelines.yml)',
        detail: 'trigger, pr, schedules, resources, variables',
        children: [
          {
            label: 'Stage: Build',
            tone: 'accent',
            children: [
              { label: 'Job: Linux build', detail: 'steps run in order on one agent' },
              { label: 'Job: Windows build', detail: 'runs in parallel with Linux' },
            ],
          },
          {
            label: 'Stage: Deploy',
            detail: 'dependsOn Build, condition main only',
            tone: 'success',
            children: [{ label: 'Deployment job', detail: 'targets an environment' }],
          },
        ],
      },
    },
    {
      kind: 'decision',
      title: 'Which trigger starts this pipeline',
      caption:
        'Pick the trigger by the event. For Azure Repos, PR validation is a branch policy, not the pr keyword.',
      question: 'What should start the run?',
      branches: [
        {
          condition: 'a push to a branch or tag',
          result: 'trigger (CI)',
          detail: 'branches, paths, tags, batch',
          tone: 'accent',
        },
        {
          condition: 'a PR in GitHub or Bitbucket',
          result: 'pr',
          detail: 'Azure Repos uses build validation policy',
        },
        {
          condition: 'a time of day',
          result: 'schedules (cron, UTC)',
          detail: 'always: false skips if nothing changed',
        },
        {
          condition: 'another pipeline finishing',
          result: 'resources.pipelines trigger',
          detail: 'pipeline completion trigger',
        },
      ],
    },
  ],
  keyObjects: [
    {
      kind: 'Pipeline triggers',
      purpose: 'Top-level keys that decide which events start a run.',
      fields: [
        {
          path: 'trigger.branches.include / exclude',
          meaning: 'Branch filters for CI. Wildcards such as releases/* are allowed.',
        },
        {
          path: 'trigger.paths.include / exclude',
          meaning: 'Only run when files under these paths change.',
        },
        {
          path: 'trigger.batch',
          meaning: 'When true, pushes that arrive during a run are combined into one next run.',
        },
        {
          path: 'pr',
          meaning: 'PR trigger for GitHub and Bitbucket Cloud. Ignored for Azure Repos.',
        },
        {
          path: 'schedules[].cron / always',
          meaning:
            'Cron in UTC. always: false (default) skips the run if the source has not changed.',
        },
        {
          path: 'resources.pipelines[].trigger',
          meaning: 'Start this pipeline when another named pipeline completes.',
        },
      ],
    },
    {
      kind: 'Stage and job',
      purpose: 'The units of ordering, parallelism and agent allocation.',
      fields: [
        {
          path: 'stages[].stage / jobs[].job',
          meaning: 'Identifier used by dependsOn and dependency expressions.',
          required: true,
        },
        {
          path: 'dependsOn',
          meaning: 'List of stages or jobs that must finish first. [] means none.',
        },
        { path: 'condition', meaning: 'Expression that replaces the default succeeded().' },
        {
          path: 'pool',
          meaning: 'Where the job runs: vmImage for Microsoft-hosted, name for a pool.',
        },
        {
          path: 'strategy.matrix / maxParallel',
          meaning: 'Fan one job out into several configurations.',
        },
        { path: 'timeoutInMinutes', meaning: 'Job timeout; limited by agent type and licensing.' },
      ],
    },
    {
      kind: 'Step',
      purpose: 'A single unit of work inside a job.',
      fields: [
        {
          path: 'task: Name@major',
          meaning: 'Built-in or marketplace task, pinned to a major version.',
        },
        { path: 'script / bash / pwsh', meaning: 'Inline shell script.' },
        { path: 'checkout', meaning: 'self, none, or a repository resource alias.' },
        { path: 'name', meaning: 'Step reference name, needed to read its output variables.' },
        { path: 'condition / continueOnError', meaning: 'Per-step control flow.' },
      ],
    },
  ],
  realWorldExample: {
    title: 'The deploy stage that shipped a feature branch',
    story: [
      'A team converted a classic build and release into one multi-stage YAML file: Build, then DeployDev, then DeployProd. The trigger included `main` and `feature/*` so developers got CI on their branches.',
      'Two weeks later a half-finished feature went to production. The DeployProd stage had no condition, so it inherited `succeeded()` - and a feature branch build had succeeded. The production approval was on the environment, but the approver assumed anything waiting was from main.',
      "The fix was one line on each deploy stage: `condition: and(succeeded(), eq(variables['Build.SourceBranch'], 'refs/heads/main'))`, plus a **branch control** check on the production environment so even a mistaken condition could not deploy another branch.",
      'They also added `paths.exclude: [docs/*]` to the trigger, which cut their monthly pipeline minutes noticeably because documentation edits no longer built the whole solution.',
    ],
  },
  yamlExamples: [
    {
      title: 'Multi-stage pipeline with triggers, dependsOn and a main-only deploy',
      language: 'yaml',
      explanation:
        'Build runs for main and release branches; the Deploy stage only for main. Files cross the stage boundary as a pipeline artifact.',
      code: `trigger:
  batch: true
  branches:
    include:
      - main
      - releases/*
  paths:
    exclude:
      - docs/*
      - '*.md'

pr: none

schedules:
  - cron: '0 2 * * 1-5'
    displayName: Nightly build
    branches:
      include:
        - main
    always: false

variables:
  buildConfiguration: Release

stages:
  - stage: Build
    jobs:
      - job: Compile
        pool:
          vmImage: ubuntu-latest
        steps:
          - script: dotnet build -c $(buildConfiguration)
            displayName: Build
          - script: dotnet publish src/Api -c $(buildConfiguration) -o $(Build.ArtifactStagingDirectory)/api
            displayName: Publish
          - publish: $(Build.ArtifactStagingDirectory)/api
            artifact: api

  - stage: Deploy
    dependsOn: Build
    condition: and(succeeded(), eq(variables['Build.SourceBranch'], 'refs/heads/main'))
    jobs:
      - deployment: DeployApi
        environment: staging
        pool:
          vmImage: ubuntu-latest
        strategy:
          runOnce:
            deploy:
              steps:
                - download: current
                  artifact: api
                - script: ls $(Pipeline.Workspace)/api`,
    },
    {
      title: 'Matrix, parallel jobs and a fan-in job',
      language: 'yaml',
      explanation:
        'Test fans out into three jobs (two at a time). Report waits for all of them and runs even if one failed.',
      code: `jobs:
  - job: Test
    strategy:
      maxParallel: 2
      matrix:
        linux_node20:
          imageName: ubuntu-latest
          nodeVersion: '20.x'
        linux_node22:
          imageName: ubuntu-latest
          nodeVersion: '22.x'
        windows_node22:
          imageName: windows-latest
          nodeVersion: '22.x'
    pool:
      vmImage: $(imageName)
    steps:
      - task: NodeTool@0
        inputs:
          versionSpec: $(nodeVersion)
      - script: npm ci && npm test

  - job: Report
    dependsOn: Test
    condition: succeededOrFailed()
    pool:
      vmImage: ubuntu-latest
    steps:
      - script: echo "All test legs finished"`,
    },
    {
      title: 'Output variables across jobs and stages',
      language: 'yaml',
      explanation:
        'The step needs a `name`. Same stage uses `dependencies`; a later stage uses `stageDependencies`, and the value is mapped into a variable with a runtime `$[ ]` expression.',
      code: `stages:
  - stage: Build
    jobs:
      - job: Version
        steps:
          - bash: echo "##vso[task.setvariable variable=semver;isOutput=true]1.4.$(Build.BuildId)"
            name: setVersion

      - job: Tag
        dependsOn: Version
        variables:
          ver: $[ dependencies.Version.outputs['setVersion.semver'] ]
        steps:
          - script: echo "Tagging $(ver)"

  - stage: Release
    dependsOn: Build
    variables:
      ver: $[ stageDependencies.Build.Version.outputs['setVersion.semver'] ]
    jobs:
      - job: Announce
        steps:
          - script: echo "Releasing $(ver)"`,
    },
    {
      title: 'Pipeline completion trigger',
      language: 'yaml',
      explanation:
        'This deployment pipeline starts whenever the pipeline named contoso-ci completes successfully on main, and can download its artifacts.',
      code: `trigger: none

resources:
  pipelines:
    - pipeline: ci
      source: contoso-ci
      trigger:
        branches:
          include:
            - main

steps:
  - download: ci
    artifact: api
  - script: ls $(Pipeline.Workspace)/ci/api`,
    },
  ],
  imperative: [
    {
      command:
        'az pipelines create --name contoso-ci --repository contoso-api --repository-type tfsgit --branch main --yml-path azure-pipelines.yml --skip-first-run true',
      what: 'Creates a YAML pipeline definition from a file already in an Azure Repos repo.',
      expected: 'JSON describing the new pipeline definition, including its id.',
    },
    {
      command: 'az pipelines run --name contoso-ci --branch main',
      what: 'Queues a run manually on a branch (a manual trigger, independent of trigger settings).',
      expected: 'JSON with the run id and status notStarted or inProgress.',
    },
    {
      command:
        'az pipelines run --name contoso-ci --branch main --variables buildConfiguration=Debug',
      what: 'Queues a run overriding a variable that is marked "settable at queue time".',
    },
    {
      command: 'az pipelines runs list --pipeline-ids <pipeline-id> --top 5 -o table',
      what: 'Lists the latest runs with reason (manual, individualCI, batchedCI, schedule, pullRequest).',
      placeholders: ['<pipeline-id>'],
    },
  ],
  declarative: {
    steps: [
      'Create `azure-pipelines.yml` at the repo root with trigger, pool and steps.',
      'Commit it and create the pipeline pointing at the file (portal New pipeline, or `az pipelines create`).',
      'Split into stages when you add environments; put approvals and checks on environments, not in YAML.',
      'Add conditions to deploy stages so only the intended branch deploys.',
      'For Azure Repos, add a build validation policy to run the pipeline on PRs.',
    ],
    code: [
      {
        title: 'Minimal single-job pipeline',
        language: 'yaml',
        code: `trigger:
  - main

pool:
  vmImage: ubuntu-latest

steps:
  - checkout: self
    fetchDepth: 1
  - script: echo "Building $(Build.SourceBranchName) at $(Build.SourceVersion)"
    displayName: Show context
  - script: npm ci && npm run build
    displayName: Build`,
      },
      {
        title: 'Tag trigger for releases',
        language: 'yaml',
        explanation: 'Runs only when a tag such as v1.4.0 is pushed.',
        code: `trigger:
  branches:
    exclude:
      - '*'
  tags:
    include:
      - v*`,
      },
    ],
  },
  verification: [
    {
      command:
        'az pipelines show --name contoso-ci --query "{path:process.yamlFilename, repo:repository.name}"',
      what: 'Confirms which YAML file and repository the definition uses.',
      expected: '{ "path": "azure-pipelines.yml", "repo": "contoso-api" }',
    },
    {
      command:
        'az pipelines runs show --id <run-id> --query "{reason:reason, branch:sourceBranch, result:result}"',
      what: 'Shows why a run started and on which branch - the quickest way to check a trigger.',
      expected: 'reason individualCI for a push, schedule for a nightly build.',
      placeholders: ['<run-id>'],
    },
    {
      command: 'az pipelines runs list --pipeline-ids <pipeline-id> --reason schedule -o table',
      what: 'Lists only scheduled runs, to confirm a cron trigger is firing.',
      placeholders: ['<pipeline-id>'],
    },
  ],
  troubleshooting: [
    {
      command: 'az repos policy list --repository-id <repo-id> --branch main -o table',
      what: 'If PR builds never start in Azure Repos, check for a Build validation policy - the pr keyword has no effect there.',
      placeholders: ['<repo-id>'],
    },
    {
      command: 'az pipelines runs show --id <run-id> --open',
      what: 'Opens the run; a stage marked Skipped with a condition shown means the condition evaluated false. Expand it to see the evaluated expression.',
      placeholders: ['<run-id>'],
    },
    {
      command: 'az pipelines show --name contoso-ci --query "triggers"',
      what: 'Shows if the UI overrides YAML triggers. When "Override the YAML trigger" is set in the pipeline settings, YAML trigger edits are ignored.',
    },
  ],
  commonMistakes: [
    'Using `pr:` in a pipeline for an Azure Repos repo and wondering why PRs are not validated. Use a build validation branch policy.',
    "Writing `condition: eq(variables['Build.SourceBranch'], 'refs/heads/main')` without `and(succeeded(), ...)`, so the stage runs even when earlier stages failed.",
    'Expecting a scheduled build to run nightly when nothing has changed. With the default `always: false`, it is skipped.',
    'Forgetting that schedule cron is in UTC, so builds fire at an unexpected local time.',
    'Assuming files built in one job exist in the next job. Each job has its own workspace, often on another machine - publish and download an artifact.',
    'Reading an output variable without naming the step or without `isOutput=true`.',
    'Indenting with tabs. YAML requires spaces, and the error message is not always obvious.',
  ],
  examTips: [
    'Stages default to sequential, jobs default to parallel, steps are always sequential.',
    'A custom condition replaces the default `succeeded()`. Look for `and(succeeded(), ...)` in the correct answer.',
    '`dependsOn: []` on a stage makes it run in parallel with the first stage.',
    '`trigger: none` turns CI off; manual and other triggers still work.',
    "Cross-stage output variables use `stageDependencies.Stage.Job.outputs['step.var']`; same-stage uses `dependencies.Job.outputs['step.var']`.",
    'Pipeline completion triggers are declared in `resources.pipelines` with a `trigger` section.',
  ],
  summary: [
    'A YAML pipeline is code: pipeline > stages > jobs > steps, stored and reviewed with the app.',
    'Triggers: trigger (CI), pr (GitHub/Bitbucket), schedules (UTC cron) and resources.pipelines (completion).',
    'Stages are sequential, jobs parallel, steps sequential by default; dependsOn and condition change that.',
    'Custom conditions replace succeeded(), so wrap them with and(succeeded(), ...).',
    'Matrix fans a job out over configurations; artifacts and output variables carry data between jobs and stages.',
  ],
  practice: [
    {
      id: 'az4-yaml-pipelines-p1',
      level: 'beginner',
      prompt:
        'A pipeline has stages Build, Test and Deploy with no dependsOn. In what order do they run, and what happens if Test fails?',
      answer:
        'They run sequentially in the order written, because each stage implicitly depends on the previous one. If Test fails, Deploy is skipped because its default condition is succeeded().',
    },
    {
      id: 'az4-yaml-pipelines-p2',
      level: 'beginner',
      prompt:
        'You added a schedules block with cron 0 3 * * * but some nights no run appears. Why might that be?',
      answer:
        'With the default always: false, a scheduled run is skipped when there have been no source changes since the last successful scheduled run. Set always: true to run regardless.',
    },
    {
      id: 'az4-yaml-pipelines-p3',
      level: 'intermediate',
      prompt:
        'Write the condition that runs a stage only if previous stages succeeded and the run is for the main branch.',
      answer: "and(succeeded(), eq(variables['Build.SourceBranch'], 'refs/heads/main'))",
    },
    {
      id: 'az4-yaml-pipelines-p4',
      level: 'intermediate',
      prompt:
        'A job in stage Build sets output variable `tag` from a step named `meta`. How does a job in stage Deploy read it?',
      answer:
        "Map it with a runtime expression: variables: tag: $[ stageDependencies.Build.<jobName>.outputs['meta.tag'] ], and the step must have used isOutput=true.",
    },
    {
      id: 'az4-yaml-pipelines-p5',
      level: 'advanced',
      prompt:
        'Your repo is in Azure Repos. You added pr: branches: include: [main] but PRs into main show no build. Explain and fix.',
      answer:
        'The pr trigger only applies to GitHub and Bitbucket Cloud repositories. For Azure Repos you add a Build validation policy on main that references the pipeline; then every PR queues a run and can be blocked by it.',
    },
  ],
  lab: {
    title: 'Build a multi-stage YAML pipeline with a matrix and a guarded deploy stage',
    scenario:
      'Create a pipeline for a small Node.js repo in Azure Repos that tests on two Node versions, publishes an artifact, and deploys (echo only) from main.',
    prerequisites: [
      'An Azure DevOps project with an Azure Repos Git repo containing a package.json with a test script',
      'Azure CLI with the azure-devops extension',
    ],
    tasks: [
      {
        instruction:
          'Write azure-pipelines.yml with a CI trigger on main and feature/*, excluding changes under docs/.',
      },
      {
        instruction:
          'Add a Build stage with a Test job that uses a matrix for Node 20 and 22, and a Package job that depends on Test and publishes an artifact.',
      },
      {
        instruction:
          'Add a Deploy stage with a condition so it only runs from main, which downloads the artifact and lists it.',
      },
      {
        instruction: 'Create the pipeline with az pipelines create and let it run on main.',
      },
      {
        instruction:
          'Push to a feature/demo branch and confirm the Deploy stage is skipped with its condition shown.',
      },
      {
        instruction:
          'Add a step that sets an output variable in Package and print it in Deploy using stageDependencies.',
      },
    ],
    solution: [
      {
        title: 'azure-pipelines.yml',
        language: 'yaml',
        code: `trigger:
  branches:
    include:
      - main
      - feature/*
  paths:
    exclude:
      - docs/*

stages:
  - stage: Build
    jobs:
      - job: Test
        pool:
          vmImage: ubuntu-latest
        strategy:
          matrix:
            node20:
              nodeVersion: '20.x'
            node22:
              nodeVersion: '22.x'
        steps:
          - task: NodeTool@0
            inputs:
              versionSpec: $(nodeVersion)
          - script: npm ci && npm test

      - job: Package
        dependsOn: Test
        pool:
          vmImage: ubuntu-latest
        steps:
          - script: npm ci && npm pack --pack-destination $(Build.ArtifactStagingDirectory)
          - bash: echo "##vso[task.setvariable variable=pkgVersion;isOutput=true]$(node -p "require('./package.json').version")"
            name: meta
          - publish: $(Build.ArtifactStagingDirectory)
            artifact: package

  - stage: Deploy
    dependsOn: Build
    condition: and(succeeded(), eq(variables['Build.SourceBranch'], 'refs/heads/main'))
    variables:
      pkgVersion: $[ stageDependencies.Build.Package.outputs['meta.pkgVersion'] ]
    jobs:
      - job: Release
        pool:
          vmImage: ubuntu-latest
        steps:
          - download: current
            artifact: package
          - script: |
              echo "Deploying version $(pkgVersion)"
              ls $(Pipeline.Workspace)/package`,
      },
      {
        title: 'Create and run it',
        language: 'bash',
        code: `az devops configure --defaults organization=https://dev.azure.com/<org> project=<project>
git add azure-pipelines.yml && git commit -m "Add multi-stage pipeline" && git push
az pipelines create --name lab-multistage --repository <repo> --repository-type tfsgit \\
  --branch main --yml-path azure-pipelines.yml
git checkout -b feature/demo && git commit --allow-empty -m "Trigger" && git push -u origin feature/demo`,
      },
    ],
    verification: [
      {
        command: 'az pipelines runs list --pipeline-ids <pipeline-id> -o table',
        what: 'Shows one run for main (all stages) and one for feature/demo.',
        expected: 'Both runs succeeded; the feature run shows Deploy as skipped in the UI.',
        placeholders: ['<pipeline-id>'],
      },
      {
        command: 'az pipelines runs artifact list --run-id <run-id> -o table',
        what: 'Confirms the package artifact was published.',
        expected: 'An artifact named package.',
        placeholders: ['<run-id>'],
      },
    ],
    cleanup: [
      {
        command: 'az pipelines delete --id <pipeline-id> --yes',
        what: 'Deletes the lab pipeline definition.',
        placeholders: ['<pipeline-id>'],
      },
      {
        command: 'git push origin --delete feature/demo',
        what: 'Removes the test branch.',
      },
    ],
  },
  relatedTopicIds: [
    'az4-agents-runners',
    'az4-pipeline-templates',
    'az4-environments-approvals',
    'az4-github-actions',
    'az4-testing-strategy',
  ],
  docs: [
    {
      title: 'YAML schema reference',
      url: 'https://learn.microsoft.com/azure/devops/pipelines/yaml-schema/',
    },
    {
      title: 'Triggers in Azure Pipelines',
      url: 'https://learn.microsoft.com/azure/devops/pipelines/build/triggers',
    },
    {
      title: 'Specify conditions',
      url: 'https://learn.microsoft.com/azure/devops/pipelines/process/conditions',
    },
    {
      title: 'Define variables (output variables)',
      url: 'https://learn.microsoft.com/azure/devops/pipelines/process/variables',
    },
    {
      title: 'Configure schedules',
      url: 'https://learn.microsoft.com/azure/devops/pipelines/process/scheduled-triggers',
    },
  ],
}
