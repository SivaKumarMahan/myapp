import type { Topic } from '../../../../types'

export const az4PipelineMaintenance: Topic = {
  id: 'az4-pipeline-maintenance',
  title: 'Pipeline health, optimisation, retention and migration',
  domainId: 'az4-pipelines',
  difficulty: 'intermediate',
  estimatedMinutes: 30,
  order: 10,
  tags: [
    'pipeline analytics',
    'flaky tests',
    'caching',
    'concurrency',
    'retention',
    'classic to yaml',
    'cost',
  ],
  oneLiner:
    'Keep pipelines fast, cheap and trustworthy: measure failure rate and duration, tame flaky tests, cache dependencies, cancel redundant runs, set retention, and move classic pipelines to YAML.',
  explanation: [
    'A pipeline is a product that the whole team uses many times a day, and like any product it degrades without maintenance. Builds get slower as dependencies grow, tests start failing randomly, storage fills with old artifacts, and nobody remembers why a classic release has seventeen tasks. **Pipeline maintenance** is the habit of measuring pipeline health and fixing it deliberately.',
    'Azure Pipelines has built-in **pipeline analytics** (the Analytics tab on each pipeline): **pipeline pass rate** (and which tasks fail most), **test pass rate** and failing tests, and **pipeline duration** broken down by task. GitHub shows run history and timing per workflow, and the **Actions usage metrics** and **Actions performance metrics** views in organisation insights show minutes, job counts and failure rates.',
    'A **flaky test** passes and fails on the same code. Flaky tests are dangerous because people learn to click "rerun" and stop trusting red builds. Azure DevOps can **detect flaky tests** automatically (system detection when a test passes on a rerun of the same build) and mark them so they do not fail the build while you fix them; the Tests tab and test analytics show which tests are flaky.',
    'To make pipelines faster and cheaper, **cache** dependencies (`Cache@2` in Azure Pipelines, `actions/cache` or the built-in cache option of the setup actions in GitHub), fetch less history (**shallow fetch**), run independent jobs **in parallel**, avoid running at all when nothing relevant changed (**path filters**), and **cancel superseded runs** (`batch: true` for CI triggers, `autoCancel` for PR triggers, `concurrency` with `cancel-in-progress` in GitHub).',
    '**Retention** decides how long runs, logs and artifacts are kept. Azure DevOps project settings set how many days to keep runs and how many recent runs to keep per pipeline; **retention leases** keep specific runs (such as production releases) indefinitely. GitHub keeps artifacts and logs for a configurable number of days (90 by default) and `retention-days` on `actions/upload-artifact` shortens it per artifact. Azure Artifacts feeds have their own retention for old package versions.',
    'Finally, **migrating classic to YAML**: classic build pipelines can be exported with the "Export to YAML" option, task groups become step templates, variables and variable groups carry over, and classic release pipelines become stages with deployment jobs targeting environments. For moving to GitHub Actions, **GitHub Actions Importer** audits and converts Azure DevOps, Jenkins and other pipelines.',
  ],
  whyItMatters: [
    'The AZ-400 outline lists "monitor pipeline health, including failure rate, duration and flaky tests", "optimise a pipeline for cost, time, performance and reliability", "optimise pipeline concurrency for performance and cost", "design and implement a retention strategy for pipeline artifacts and dependencies" and "migrate a pipeline from classic to YAML in Azure Pipelines".',
    'Slow feedback kills productivity. A PR build that takes forty minutes means developers batch changes and context switch; getting it under ten changes how a team works.',
    'Pipeline minutes and parallel jobs cost money. Caching, path filters and cancelling redundant runs are the cheapest optimisations available and often halve consumption.',
  ],
  howItWorks: [
    'Pipeline analytics are built on the Azure DevOps Analytics service. Open a pipeline, choose the Analytics tab, and each report (pass rate, test failures, duration) can be filtered by branch and period; the same data is queryable through OData and Power BI for dashboards.',
    '`Cache@2` computes a key from strings and file hashes, for example `npm | "$(Agent.OS)" | package-lock.json`. On a hit it restores the path before your steps run; on a miss it runs the steps and saves the path in a post-job step. `restoreKeys` allow a partial match fallback. Caches are scoped by branch, and a PR can read caches from its target branch.',
    'In GitHub, `actions/setup-node`, `setup-python`, `setup-java` and `setup-dotnet` accept a `cache:` input that handles the key for you; `actions/cache@v4` gives full control. Caches are evicted when not used for about a week or when the repository cache storage limit is exceeded.',
    'Concurrency: a CI trigger with `batch: true` waits for the running build to finish and then builds all accumulated commits once. PR triggers cancel in-progress runs for the same PR by default when a new commit is pushed. In GitHub, `concurrency: group: ${{ github.workflow }}-${{ github.ref }}` with `cancel-in-progress: true` cancels the older run in the same group.',
    'Parallelism and cost: each concurrently running job needs a **parallel job** (Microsoft-hosted or self-hosted) in Azure DevOps; GitHub bills hosted runner minutes per operating system with free allowances depending on plan. Splitting tests across jobs with `parallel:` or a matrix trades more parallel capacity for shorter wall-clock time.',
    'Retention in Azure DevOps runs daily. Runs older than the retention period are deleted unless a **retention lease** holds them. Classic releases retained by release retention also keep their linked builds. A script can add a lease using the REST API, and YAML deployments to environments are commonly leased automatically for a period.',
  ],
  diagrams: [
    {
      kind: 'flow',
      title: 'How Cache@2 speeds up a build',
      caption:
        'The key changes only when the lock file changes, so most runs restore the cache and skip the slow download.',
      nodes: [
        {
          label: 'Compute cache key',
          detail: 'npm, agent OS, hash of package-lock.json',
          tone: 'accent',
        },
        {
          label: 'Look up key',
          detail: 'Exact key first, then restoreKeys',
          arrowLabel: 'restore',
          branch: {
            label: 'Miss',
            detail: 'Steps run from scratch, cache saved at end',
            tone: 'warning',
          },
        },
        {
          label: 'Restore folder',
          detail: 'npm cache directory ready',
          arrowLabel: 'hit',
          tone: 'success',
        },
        {
          label: 'npm ci runs fast',
          detail: 'Packages come from local cache',
        },
      ],
    },
    {
      kind: 'decision',
      title: 'Fixing a slow or expensive pipeline',
      caption:
        'Measure first with the duration report, then choose the optimisation that targets the slowest part.',
      question: 'Where is the time or money going?',
      branches: [
        {
          condition: 'Restoring packages every run',
          result: 'Cache dependencies',
          detail: 'Cache@2 or setup action cache input',
          tone: 'accent',
        },
        {
          condition: 'Runs for irrelevant changes',
          result: 'Path filters on triggers',
          detail: 'Skip docs-only commits',
        },
        {
          condition: 'Many runs for the same branch',
          result: 'Batch or cancel in progress',
          detail: 'batch true, autoCancel, concurrency',
        },
        {
          condition: 'One long test job',
          result: 'Split across parallel jobs',
          detail: 'parallel or matrix, needs capacity',
        },
        {
          condition: 'Random red builds',
          result: 'Quarantine flaky tests',
          detail: 'Flaky test detection, then fix',
          tone: 'warning',
        },
      ],
    },
  ],
  keyObjects: [
    {
      kind: 'Cache task (Cache@2)',
      purpose: 'Restores and saves a folder between runs based on a computed key.',
      fields: [
        {
          path: 'inputs.key',
          meaning: 'Segments separated by |; file paths are hashed.',
          required: true,
        },
        {
          path: 'inputs.path',
          meaning: 'Folder to cache, for example $(npm_config_cache).',
          required: true,
        },
        { path: 'inputs.restoreKeys', meaning: 'Prefix keys used for a partial match fallback.' },
        {
          path: 'inputs.cacheHitVar',
          meaning: 'Variable set to true, inexact or false so later steps can skip work on a hit.',
        },
      ],
    },
    {
      kind: 'Retention settings (Project settings > Pipelines > Settings)',
      purpose: 'Controls how long runs, logs, artifacts and attachments are kept.',
      fields: [
        { path: 'Days to keep runs', meaning: 'Runs older than this are deleted unless leased.' },
        {
          path: 'Number of recent runs to retain per pipeline',
          meaning: 'Minimum kept regardless of age.',
        },
        {
          path: 'Retention leases',
          meaning: 'Pin specific runs, for example production releases, beyond the policy.',
        },
        {
          path: 'Artifacts feed retention',
          meaning:
            'Separate Azure Artifacts setting for the maximum number of versions per package.',
        },
      ],
    },
    {
      kind: 'Trigger and concurrency controls',
      purpose: 'Keywords that stop unnecessary or duplicate runs.',
      fields: [
        {
          path: 'trigger.batch',
          meaning: 'Build accumulated commits once after the current run finishes.',
        },
        {
          path: 'trigger.paths.include / exclude',
          meaning: 'Only run when matching files change.',
        },
        {
          path: 'pr.autoCancel',
          meaning: 'Cancel an in-progress PR run when new commits arrive (default true).',
        },
        {
          path: 'concurrency.cancel-in-progress (GitHub)',
          meaning: 'Cancel the older run in the same concurrency group.',
        },
        {
          path: 'checkout.fetchDepth',
          meaning: 'Shallow fetch depth; 1 fetches only the latest commit.',
        },
      ],
    },
  ],
  realWorldExample: {
    title: 'From 38 minutes to 9',
    story: [
      'A team complained that PR builds took 38 minutes and failed about one run in five for "no reason". The Analytics tab showed two things: 14 minutes were spent restoring npm and NuGet packages, and three UI tests accounted for most of the failures, each passing on rerun.',
      'They added `Cache@2` for both package managers, switched checkout to `fetchDepth: 1`, split the test job in three with `parallel: 3`, and added path filters so documentation changes no longer triggered the full build.',
      'Flaky test detection was switched on in project settings. The three UI tests were marked flaky, stopped failing builds, and were assigned as bugs with a two-sprint deadline; two had timing waits that were replaced with proper waits for elements.',
      'The PR build dropped to nine minutes, the pass rate rose above 95 percent, and the team reduced retention for PR runs to 10 days while keeping production release runs with retention leases.',
    ],
  },
  yamlExamples: [
    {
      title: 'Azure Pipelines: caching, shallow fetch, path filters and batching',
      language: 'yaml',
      explanation:
        'The key hashes package-lock.json, so the cache is reused until dependencies change. batch and path filters stop redundant runs; timeoutInMinutes caps runaway jobs.',
      code: `trigger:
  batch: true
  branches:
    include: [main]
  paths:
    exclude: [docs/*, '*.md']

pr:
  autoCancel: true
  branches:
    include: [main]

variables:
  npm_config_cache: $(Pipeline.Workspace)/.npm

jobs:
  - job: Build
    timeoutInMinutes: 30
    pool:
      vmImage: ubuntu-latest
    steps:
      - checkout: self
        fetchDepth: 1
      - task: Cache@2
        displayName: Cache npm
        inputs:
          key: 'npm | "$(Agent.OS)" | package-lock.json'
          restoreKeys: |
            npm | "$(Agent.OS)"
          path: $(npm_config_cache)
      - script: npm ci
      - script: npm run build

  - job: Test
    dependsOn: Build
    strategy:
      parallel: 3
    pool:
      vmImage: ubuntu-latest
    steps:
      - script: npx vitest run --shard=$(System.JobPositionInPhase)/$(System.TotalJobsInPhase)
        displayName: Test shard $(System.JobPositionInPhase)
      - task: PublishTestResults@2
        condition: succeededOrFailed()
        inputs:
          testResultsFormat: JUnit
          testResultsFiles: '**/junit.xml'`,
    },
    {
      title: 'GitHub Actions: cache, concurrency and short artifact retention',
      language: 'yaml',
      explanation:
        'setup-node caches npm automatically. The concurrency group cancels superseded runs on the same branch; the artifact is kept for five days only.',
      code: `name: ci
on:
  push:
    branches: [main]
    paths-ignore: ['docs/**', '**.md']
  pull_request:

concurrency:
  group: \${{ github.workflow }}-\${{ github.ref }}
  cancel-in-progress: true

jobs:
  build:
    runs-on: ubuntu-latest
    timeout-minutes: 20
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: npm
      - run: npm ci
      - run: npm run build
      - uses: actions/upload-artifact@v4
        with:
          name: dist
          path: dist
          retention-days: 5`,
    },
    {
      title: 'A classic task group rewritten as a step template',
      language: 'yaml',
      explanation:
        'Classic task group parameters become template parameters; the tasks keep their names and versions.',
      code: `# templates/steps/publish-web.yml (was task group "Publish web app")
parameters:
  - name: projectPath
    type: string
  - name: artifactName
    type: string
    default: web

steps:
  - task: DotNetCoreCLI@2
    inputs:
      command: publish
      projects: \${{ parameters.projectPath }}
      arguments: -c Release -o $(Build.ArtifactStagingDirectory)
      zipAfterPublish: true
  - task: PublishPipelineArtifact@1
    inputs:
      targetPath: $(Build.ArtifactStagingDirectory)
      artifact: \${{ parameters.artifactName }}`,
    },
  ],
  imperative: [
    {
      command:
        'az pipelines runs list --pipeline-ids <pipelineId> --result failed --top 50 --query "[].{id:id,branch:sourceBranch,finished:finishTime}" -o table',
      what: 'Lists recent failed runs for a pipeline, a quick view of failure rate and which branches break.',
      placeholders: ['<pipelineId>'],
    },
    {
      command:
        'az pipelines runs list --pipeline-ids <pipelineId> --status completed --top 20 --query "[].{id:id,result:result,start:startTime,finish:finishTime}" -o table',
      what: 'Shows start and finish times so you can compare durations before and after an optimisation.',
      placeholders: ['<pipelineId>'],
    },
    {
      command: 'gh run list --workflow ci.yml --status failure --limit 20',
      what: 'Lists recent failed GitHub Actions runs of one workflow.',
    },
    {
      command: 'gh run rerun <runId> --failed',
      what: 'Reruns only the failed jobs of a run - useful, but repeated reruns of the same job are a flaky test signal.',
      placeholders: ['<runId>'],
    },
    {
      command: 'gh actions-importer audit azure-devops --output-dir tmp/audit',
      what: 'Audits Azure DevOps pipelines and reports how much of each can be converted to GitHub Actions automatically.',
    },
  ],
  declarative: {
    steps: [
      'Turn on the Analytics views for key pipelines and add pass rate and duration widgets to the team dashboard.',
      'Enable flaky test detection in Project settings > Test management, and treat flaky tests as bugs with an owner.',
      'Add caching, shallow fetch, path filters and cancellation to every pipeline template so all consumers benefit.',
      'Set project retention to match your needs (shorter for PR runs), and add retention leases to production releases.',
      'Migrate classic builds with Export to YAML, turn task groups into step templates and releases into environments.',
    ],
    code: [
      {
        title: 'Add a retention lease to a production run from the pipeline',
        language: 'yaml',
        explanation:
          'Uses the Build.Leases REST API with the job access token. The build service identity needs permission to manage retention on the pipeline.',
        code: `- stage: Production
  jobs:
    - deployment: Deploy
      environment: orders-prod
      strategy:
        runOnce:
          deploy:
            steps:
              - script: echo "deploy"
              - pwsh: |
                  $body = ConvertTo-Json @(@{
                    daysValid     = 365
                    definitionId  = $(System.DefinitionId)
                    ownerId       = "User:$(Build.RequestedForId)"
                    protectPipeline = $false
                    runId         = $(Build.BuildId)
                  })
                  $uri = "$(System.CollectionUri)$(System.TeamProject)/_apis/build/retention/leases?api-version=7.1"
                  Invoke-RestMethod -Uri $uri -Method POST -Body $body -ContentType 'application/json' \`
                    -Headers @{ Authorization = "Bearer $(System.AccessToken)" }
                displayName: Retain this production run for a year`,
      },
      {
        title: 'Multi-stage YAML that replaces a classic release',
        language: 'yaml',
        code: `trigger:
  - main

stages:
  - stage: Build
    jobs:
      - job: Build
        pool:
          vmImage: ubuntu-latest
        steps:
          - template: templates/steps/publish-web.yml
            parameters:
              projectPath: src/Web/Web.csproj

  - stage: QA
    dependsOn: Build
    jobs:
      - deployment: DeployQA
        environment: web-qa
        pool:
          vmImage: ubuntu-latest
        strategy:
          runOnce:
            deploy:
              steps:
                - task: AzureWebApp@1
                  inputs:
                    azureSubscription: sc-web-qa
                    appName: app-web-qa
                    package: $(Pipeline.Workspace)/web/*.zip

  - stage: Prod
    dependsOn: QA
    jobs:
      - deployment: DeployProd
        environment: web-prod
        pool:
          vmImage: ubuntu-latest
        strategy:
          runOnce:
            deploy:
              steps:
                - task: AzureWebApp@1
                  inputs:
                    azureSubscription: sc-web-prod
                    appName: app-web-prod
                    package: $(Pipeline.Workspace)/web/*.zip`,
      },
    ],
  },
  verification: [
    {
      command: 'Pipeline > Analytics tab > Pipeline duration',
      what: 'Shows the average duration and the tasks that take longest, before and after changes.',
      expected: 'The Cache npm step replaces most of the npm ci time on a cache hit.',
    },
    {
      command: 'gh cache list --repo <owner>/<repo>',
      what: 'Lists GitHub Actions caches with their keys, sizes and last access time.',
      expected: 'An entry with a key containing npm and the lock file hash.',
      placeholders: ['<owner>', '<repo>'],
    },
    {
      command:
        'curl -s -u :$AZURE_DEVOPS_EXT_PAT "https://dev.azure.com/<org>/<project>/_apis/build/retention/leases?definitionId=<pipelineId>&api-version=7.1"',
      what: 'Lists retention leases for a pipeline, to confirm production runs are held.',
      placeholders: ['<org>', '<project>', '<pipelineId>'],
    },
  ],
  troubleshooting: [
    {
      command: 'Cache@2 log line: "Cache miss" on every run',
      what: 'The key includes something that changes every run, such as a build number or an unpinned file. Keep keys to OS and lock-file hashes.',
    },
    {
      command: 'gh run view <runId> --log-failed',
      what: 'Prints only the logs of failed steps, the fastest way to see why a GitHub run failed.',
      placeholders: ['<runId>'],
    },
    {
      command:
        'az pipelines runs show --id <runId> --query "{reason:reason,result:result,queue:queueTime,start:startTime}"',
      what: 'A large gap between queue time and start time means you are waiting for a parallel job or agent, not a slow pipeline.',
      placeholders: ['<runId>'],
    },
    {
      command: 'gh cache delete <cacheKey> --repo <owner>/<repo>',
      what: 'Deletes a corrupted or oversized cache entry so the next run rebuilds it.',
      placeholders: ['<cacheKey>', '<owner>', '<repo>'],
    },
  ],
  commonMistakes: [
    'Clicking rerun on failed tests until they pass, instead of detecting, quarantining and fixing flaky tests. The team stops trusting red builds.',
    'Caching the node_modules folder with a key that ignores the lock file, so builds use stale dependencies.',
    'Putting a value that changes every run (such as $(Build.BuildId)) in the cache key, guaranteeing a cache miss.',
    'Keeping every run and artifact forever. Storage and clutter grow; use short retention for PR runs and leases for releases that must be kept.',
    'Buying more parallel jobs to fix a slow pipeline before looking at the duration report. Often the time is in one task that caching fixes.',
    'Migrating classic releases by copying tasks into one giant YAML job, losing the stages, environments and approvals that the classic release had.',
  ],
  examTips: [
    'Monitoring pipeline health means **failure rate (pass rate)**, **duration** and **flaky tests** - all available in the pipeline Analytics tab and test analytics.',
    'Faster and cheaper: caching (`Cache@2`, `actions/cache`), shallow fetch, path filters, parallel jobs or matrices, and cancelling superseded runs.',
    '`batch: true` on a CI trigger combines commits that arrive while a build is running into a single next run.',
    'In GitHub use `concurrency` with `cancel-in-progress: true` to stop duplicate runs; use `retention-days` on artifacts and the repository setting for defaults.',
    'Keep specific runs beyond the retention policy with **retention leases** in Azure Pipelines.',
    'Classic to YAML: Export to YAML for builds, task groups to step templates, releases to multi-stage with environments and checks. To move to GitHub Actions, use GitHub Actions Importer.',
  ],
  summary: [
    'Measure pass rate, duration and flaky tests before optimising.',
    'Cache dependencies with a key based on OS and lock-file hash.',
    'Cancel or batch redundant runs and skip irrelevant changes with path filters.',
    'Parallel jobs cut wall-clock time but cost capacity.',
    'Retention policies clean up; retention leases keep what must be kept.',
    'Migrate classic pipelines to YAML stages, templates and environments.',
  ],
  practice: [
    {
      id: 'az4-pipeline-maintenance-p1',
      level: 'beginner',
      prompt:
        'Developers push several commits to main within minutes and each one queues a full CI build. How do you make Azure Pipelines build them together instead?',
      answer:
        'Set batch: true on the CI trigger. While a run is in progress, new commits are accumulated and built together in one run after it finishes.',
      explanation:
        'For pull requests, autoCancel (on by default) cancels the older in-progress run instead.',
    },
    {
      id: 'az4-pipeline-maintenance-p2',
      level: 'intermediate',
      prompt:
        'A test fails in roughly one run out of ten on unchanged code and developers keep rerunning builds. What should you do in Azure DevOps?',
      answer:
        'Enable flaky test detection in project test management settings so the test is identified and marked flaky (and optionally excluded from failing the build), then log a bug and fix the underlying timing or dependency issue.',
      explanation:
        'Quarantining is temporary. Flaky tests must be fixed or removed, or trust in the pipeline erodes.',
    },
    {
      id: 'az4-pipeline-maintenance-p3',
      level: 'intermediate',
      prompt:
        'Project retention deletes runs after 30 days, but auditors require production release runs to be kept for a year. How do you satisfy both?',
      answer:
        'Keep the project policy and add a retention lease to each production run (for example from a step in the production stage via the leases REST API, or manually with Retain), valid for 365 days.',
      explanation:
        'Leased runs are excluded from automatic deletion until the lease expires or is removed.',
    },
    {
      id: 'az4-pipeline-maintenance-p4',
      level: 'advanced',
      prompt:
        'You are migrating a classic build that uses two task groups and a classic release with QA and Prod stages and pre-deployment approvals. Outline the YAML design.',
      answer:
        'Export the build to YAML as a starting point, convert each task group to a step template, and build a multi-stage pipeline with Build, QA and Prod stages whose deployment jobs target web-qa and web-prod environments. Recreate the approvals as Approvals checks on the environments.',
      explanation:
        'Approvals move from the release definition to the environment resource; gates become checks such as Invoke REST API or Query Azure Monitor alerts.',
    },
  ],
  lab: {
    title: 'Measure and speed up a pipeline',
    scenario:
      'Take a Node.js project, record a baseline duration, then add caching, shallow fetch, path filters and cancellation, and set up a retention lease for a release run.',
    prerequisites: [
      'An Azure DevOps project with a Node.js repository that has a package-lock.json',
      'Azure CLI with the azure-devops extension',
    ],
    tasks: [
      {
        instruction:
          'Create a basic pipeline that runs npm ci and npm test, run it three times, and note the durations from az pipelines runs list.',
      },
      {
        instruction:
          'Add a Cache@2 step keyed on the agent OS and package-lock.json, and set fetchDepth: 1.',
      },
      {
        instruction:
          'Run twice more. Confirm the first run reports a cache miss and the second a cache hit.',
        hint: 'Look for the Cache npm step log and the post-job step that saves the cache.',
      },
      {
        instruction:
          'Add batch: true and a paths exclude for docs, then push a docs-only change and confirm no run starts.',
      },
      { instruction: 'Open the Analytics tab and compare the duration report with your baseline.' },
      {
        instruction:
          'On one successful run, choose Retain from the run menu, then list leases with the REST API to confirm it.',
      },
    ],
    solution: [
      {
        title: 'azure-pipelines.yml after optimisation',
        language: 'yaml',
        code: `trigger:
  batch: true
  branches:
    include: [main]
  paths:
    exclude: [docs/*]

pool:
  vmImage: ubuntu-latest

variables:
  npm_config_cache: $(Pipeline.Workspace)/.npm

steps:
  - checkout: self
    fetchDepth: 1
  - task: Cache@2
    displayName: Cache npm
    inputs:
      key: 'npm | "$(Agent.OS)" | package-lock.json'
      restoreKeys: |
        npm | "$(Agent.OS)"
      path: $(npm_config_cache)
  - script: npm ci
  - script: npm test`,
      },
      {
        title: 'Comparing durations',
        language: 'bash',
        code: `az pipelines runs list --pipeline-ids <pipelineId> --top 10 \\
  --query "[].{id:id,result:result,start:startTime,finish:finishTime}" -o table`,
      },
    ],
    verification: [
      {
        command: 'az pipelines runs list --pipeline-ids <pipelineId> --top 5 -o table',
        what: 'The newest runs should be noticeably shorter than the baseline.',
        placeholders: ['<pipelineId>'],
      },
      {
        command:
          'curl -s -u :$AZURE_DEVOPS_EXT_PAT "https://dev.azure.com/<org>/<project>/_apis/build/retention/leases?definitionId=<pipelineId>&api-version=7.1"',
        what: 'Confirms a lease exists for the run you retained.',
        placeholders: ['<org>', '<project>', '<pipelineId>'],
      },
    ],
    cleanup: [
      {
        command: 'az pipelines delete --id <pipelineId> --yes',
        what: 'Deletes the lab pipeline. Remove the retention lease first from the run menu if deletion is blocked.',
        placeholders: ['<pipelineId>'],
      },
    ],
  },
  relatedTopicIds: [
    'az4-pipeline-templates',
    'az4-testing-strategy',
    'az4-agents-runners',
    'az4-yaml-pipelines',
    'az4-package-management',
  ],
  docs: [
    {
      title: 'Pipeline reports (Analytics)',
      url: 'https://learn.microsoft.com/azure/devops/pipelines/reports/pipelinereport',
    },
    {
      title: 'Manage flaky tests',
      url: 'https://learn.microsoft.com/azure/devops/pipelines/test/flaky-test-management',
    },
    {
      title: 'Pipeline caching',
      url: 'https://learn.microsoft.com/azure/devops/pipelines/release/caching',
    },
    {
      title: 'Set retention policies for builds, releases and tests',
      url: 'https://learn.microsoft.com/azure/devops/pipelines/policies/retention',
    },
    {
      title: 'Migrate from classic pipelines',
      url: 'https://learn.microsoft.com/azure/devops/pipelines/release/from-classic-pipelines',
    },
    {
      title: 'Control the concurrency of workflows and jobs',
      url: 'https://docs.github.com/actions/writing-workflows/choosing-what-your-workflow-does/control-the-concurrency-of-workflows-and-jobs',
    },
  ],
}
