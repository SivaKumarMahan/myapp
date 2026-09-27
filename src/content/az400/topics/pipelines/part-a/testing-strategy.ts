import type { Topic } from '../../../../types'

export const testingStrategy: Topic = {
  id: 'az4-testing-strategy',
  title: 'Testing strategy: the test pyramid, coverage and quality gates in pipelines',
  domainId: 'az4-pipelines',
  difficulty: 'intermediate',
  estimatedMinutes: 35,
  order: 2,
  tags: [
    'testing',
    'test-pyramid',
    'code-coverage',
    'quality-gates',
    'release-gates',
    'azure-load-testing',
    'shift-left',
  ],
  oneLiner:
    'Decide which tests run where in the pipeline, publish their results and coverage, and turn them into gates that stop bad changes automatically.',
  explanation: [
    'A pipeline without tests only proves that code compiles. A **testing strategy** decides which kinds of tests exist, where in the pipeline each runs, and what result blocks a change from moving on.',
    'The **test pyramid** is the usual starting shape: many fast **unit tests** at the bottom (milliseconds, no network), fewer **integration tests** in the middle (a real database, a real API, a container), and a small number of slow **end-to-end / UI tests** at the top. Load and security tests sit alongside, usually later in the pipeline.',
    '**Shift left** means running each test as early as it can meaningfully run: unit tests and static analysis in the pull request build, integration tests right after, load tests against a staging environment before production.',
    'Test results are only useful if the pipeline can read them. Azure Pipelines ingests results with `PublishTestResults@2` (JUnit, NUnit, xUnit, VSTest, cTest formats) and coverage with `PublishCodeCoverageResults@2` (Cobertura or JaCoCo), and shows them on the **Tests** and **Code Coverage** tabs of the run.',
    'A **quality gate** is a rule that fails the change when a threshold is missed - failing tests, coverage on changed lines below a target, a load test whose average response time is too high. A **release gate** (in YAML, an environment **check**) is evaluated before a deployment proceeds: querying Azure Monitor alerts, calling a REST API or Azure Function, or checking business hours.',
  ],
  whyItMatters: [
    'AZ-400 asks you to design and implement a testing strategy for pipelines: which test types go where, how to configure test and coverage publishing, how to implement quality and release gates, and how to add load testing. Many questions describe a symptom ("coverage tab is empty", "a bad build reached production") and ask for the missing configuration.',
    'Gates are what make continuous delivery safe. Without an automated rule, "tests failed but someone deployed anyway" is always one click away.',
    'The pyramid shape also controls cost and speed. A suite that is mostly UI tests is slow and flaky, developers stop trusting it, and red builds start being ignored - which is worse than having fewer tests.',
  ],
  howItWorks: [
    'Test runners write a results file (for example `TestResults/*.trx` or `junit.xml`). `PublishTestResults@2` uploads it, so failures appear per test with history, and the run shows a pass rate. `DotNetCoreCLI@2` with `command: test` publishes results automatically.',
    'Coverage tools (Coverlet via `--collect "XPlat Code Coverage"`, JaCoCo, Istanbul/nyc, coverage.py) write Cobertura or JaCoCo XML. `PublishCodeCoverageResults@2` reads it and renders a report on the run.',
    'For **pull request quality gates** in Azure Repos, a **build validation** branch policy runs the pipeline on every PR and blocks completion if it fails. Azure DevOps can also post a **code coverage status** on the PR for the lines the PR changed (diff coverage), configured in an `azurepipelines-coverage.yml` file; making that status a required policy turns it into a gate.',
    'On GitHub, the equivalent is a **required status check** in branch protection or a ruleset: the workflow job name must pass before a PR can merge.',
    '**Azure Load Testing** is a managed service that runs Apache JMeter or Locust scripts at scale. The `AzureLoadTest@1` task (or the `azure/load-testing` action) runs a test from a YAML config that declares **failure criteria** such as `avg(response_time_ms) > 300`; if a criterion is breached, the pipeline step fails.',
    'Before a deployment job targets an environment, Azure Pipelines evaluates that environment’s **approvals and checks**. Checks like "Query Azure Monitor alerts" re-evaluate on an interval until they pass or time out - this is the YAML equivalent of classic release gates.',
    'Azure Pipelines can detect **flaky tests** (tests that pass and fail on the same code) and optionally exclude them from the pass/fail outcome, which keeps a gate meaningful while the test is fixed.',
  ],
  diagrams: [
    {
      kind: 'flow',
      title: 'Where each kind of test runs in the pipeline',
      caption:
        'Fast, cheap checks run first and on every change. Expensive checks run later, against a real environment, and gate promotion to production.',
      nodes: [
        {
          label: 'PR build',
          detail: 'Unit tests, lint, diff coverage',
          tone: 'accent',
          branch: { label: 'Any failure', detail: 'PR cannot complete', tone: 'danger' },
        },
        {
          label: 'CI build on main',
          detail: 'Unit and integration tests, publish artifact',
          arrowLabel: 'merge',
        },
        {
          label: 'Deploy to staging',
          detail: 'Smoke tests after deployment',
          arrowLabel: 'artifact',
        },
        {
          label: 'Load test in staging',
          detail: 'Azure Load Testing with failure criteria',
          branch: { label: 'Criteria breached', detail: 'Stage fails', tone: 'danger' },
        },
        {
          label: 'Production checks',
          detail: 'Approval plus Azure Monitor alerts check',
          arrowLabel: 'gate',
        },
        { label: 'Deploy to production', tone: 'success' },
      ],
    },
    {
      kind: 'nested',
      title: 'The test pyramid and what lives in each layer',
      caption:
        'The wide base is what gives fast feedback. The narrow top is kept small because it is slow and brittle.',
      root: {
        label: 'Automated test suite',
        children: [
          {
            label: 'End-to-end and UI tests',
            detail: 'Few; Playwright or Selenium against staging',
            tone: 'warning',
          },
          {
            label: 'Integration tests',
            detail: 'Some; real DB, containers, API contracts',
            tone: 'accent',
          },
          {
            label: 'Unit tests',
            detail: 'Many; milliseconds each, no network',
            tone: 'success',
          },
        ],
      },
    },
  ],
  keyObjects: [
    {
      kind: 'Pipeline task PublishTestResults@2',
      purpose: 'Uploads test result files so failures, history and pass rate appear on the run.',
      fields: [
        {
          path: 'inputs.testResultsFormat',
          meaning: 'JUnit, NUnit, VSTest, XUnit or CTest.',
          required: true,
        },
        {
          path: 'inputs.testResultsFiles',
          meaning:
            'Glob for the result files, for example any junit*.xml under the working directory.',
        },
        {
          path: 'inputs.failTaskOnFailedTests',
          meaning: 'Fail the task (and the job) when any published test failed.',
        },
        {
          path: 'condition',
          meaning: 'Use succeededOrFailed() so results publish even when tests fail.',
        },
      ],
    },
    {
      kind: 'Pipeline task PublishCodeCoverageResults@2',
      purpose: 'Publishes Cobertura or JaCoCo coverage so the Code Coverage tab shows a report.',
      fields: [
        {
          path: 'inputs.summaryFileLocation',
          meaning: 'Path or glob to the coverage XML files.',
          required: true,
        },
      ],
    },
    {
      kind: 'Azure Load Testing (Microsoft.LoadTestService/loadTests)',
      apiVersion: '2022-12-01',
      purpose:
        'Managed service that generates high-scale load from JMeter or Locust scripts and compares results with failure criteria.',
      fields: [
        { path: 'location', meaning: 'Region the load engines run in.', required: true },
        {
          path: 'failureCriteria[] (test config)',
          meaning: 'Client-side metrics such as avg(response_time_ms) or percentage(error).',
        },
        {
          path: 'engineInstances (test config)',
          meaning: 'How many engines generate load in parallel.',
        },
      ],
    },
    {
      kind: 'Quality and release gates',
      purpose:
        'Automated rules that stop a change or a deployment when evidence says it is unsafe.',
      fields: [
        {
          path: 'Build validation policy',
          meaning: 'Azure Repos: PR must have a green pipeline run.',
        },
        { path: 'Required status check', meaning: 'GitHub: named check must pass before merge.' },
        {
          path: 'Environment checks',
          meaning: 'Azure Monitor alerts, Invoke REST API, Invoke Azure Function, business hours.',
        },
      ],
    },
  ],
  realWorldExample: {
    title: 'The release that passed every test and still fell over',
    story: [
      'A payments team had a healthy unit suite and 85% coverage. A change to how a discount was calculated added a database call inside a loop. Every test passed, the PR was approved, and at the Friday traffic peak the checkout API response time went from 180 ms to four seconds.',
      'Their fix was a stage between staging and production: a 5-minute Azure Load Testing run from the pipeline with `avg(response_time_ms) > 400` and `percentage(error) > 2` as failure criteria. The next change with a similar regression failed that stage in staging, with a comparison chart attached to the run.',
      'They also added a "Query Azure Monitor alerts" check on the production environment, so a deployment waits while any Sev 0 or Sev 1 alert is firing, and made the diff coverage status a required PR policy at 70% of changed lines.',
      'The number of tests barely changed. What changed was that the pipeline now had rules for the kinds of failure the unit suite could never see.',
    ],
  },
  yamlExamples: [
    {
      title: 'Unit tests with results and Cobertura coverage (.NET)',
      language: 'yaml',
      explanation:
        'Results are published even if tests fail, thanks to `succeededOrFailed()`. Coverlet writes Cobertura XML that the coverage task reads.',
      code: `trigger:
  - main

pool:
  vmImage: ubuntu-latest

steps:
  - task: UseDotNet@2
    inputs:
      version: 8.x

  - script: dotnet test Contoso.sln -c Release --logger trx --results-directory $(Agent.TempDirectory)/tests --collect "XPlat Code Coverage"
    displayName: Run unit tests

  - task: PublishTestResults@2
    displayName: Publish test results
    condition: succeededOrFailed()
    inputs:
      testResultsFormat: VSTest
      testResultsFiles: '$(Agent.TempDirectory)/tests/**/*.trx'
      failTaskOnFailedTests: true

  - task: PublishCodeCoverageResults@2
    displayName: Publish coverage
    condition: succeededOrFailed()
    inputs:
      summaryFileLocation: '$(Agent.TempDirectory)/tests/**/coverage.cobertura.xml'`,
    },
    {
      title: 'Load test stage with Azure Load Testing',
      language: 'yaml',
      explanation:
        'The service connection must have the Load Test Contributor role on the Azure Load Testing resource. The step fails if the config file failure criteria are breached.',
      code: `- stage: LoadTest
  dependsOn: DeployStaging
  jobs:
    - job: RunLoadTest
      pool:
        vmImage: ubuntu-latest
      steps:
        - task: AzureLoadTest@1
          inputs:
            azureSubscription: sc-staging-wif
            loadTestConfigFile: loadtests/checkout.yaml
            loadTestResource: lt-contoso-staging
            resourceGroup: rg-contoso-staging
            env: |
              [
                { "name": "webapp", "value": "app-contoso-staging.azurewebsites.net" }
              ]
        - publish: $(System.DefaultWorkingDirectory)/loadTest
          artifact: loadTestResults
          condition: succeededOrFailed()`,
    },
    {
      title: 'Azure Load Testing config with failure criteria',
      language: 'yaml',
      code: `version: v0.1
testId: checkout-api
displayName: Checkout API baseline
testPlan: checkout.jmx
testType: JMX
engineInstances: 2
failureCriteria:
  - avg(response_time_ms) > 400
  - percentage(error) > 2
autoStop:
  errorPercentage: 80
  timeWindow: 60`,
    },
    {
      title: 'Diff coverage status for pull requests (azurepipelines-coverage.yml)',
      language: 'yaml',
      explanation:
        'Placed at the root of the repo. Azure DevOps posts a coverage status for changed lines on the PR; make it required in branch policies to enforce it.',
      code: `coverage:
  status:
    comments: on
    diff:
      target: 70%`,
    },
  ],
  imperative: [
    {
      command: 'az load create --name <lt-name> --resource-group <rg> --location <region>',
      what: 'Creates an Azure Load Testing resource (requires the load CLI extension, installed on first use).',
      expected: 'JSON with provisioningState Succeeded and a dataPlaneUri.',
      placeholders: ['<lt-name>', '<rg>', '<region>'],
    },
    {
      command:
        'az load test create --load-test-resource <lt-name> --resource-group <rg> --test-id checkout-api --load-test-config-file loadtests/checkout.yaml',
      what: 'Creates a test from the YAML config (uploads the JMX script and failure criteria).',
      placeholders: ['<lt-name>', '<rg>'],
    },
    {
      command:
        'az load test-run create --load-test-resource <lt-name> --resource-group <rg> --test-id checkout-api --test-run-id run-$(date +%s)',
      what: 'Starts a run and waits for it; the result includes testResult PASSED or FAILED against the criteria.',
      placeholders: ['<lt-name>', '<rg>'],
    },
    {
      command:
        'az repos policy build create --repository-id <repo-id> --branch main --build-definition-id <pipeline-id> --blocking true --enabled true --queue-on-source-update-only false --manual-queue-only false --display-name "PR build" --valid-duration 720',
      what: 'Adds a build validation policy so every PR into main must have a passing run of the pipeline.',
      placeholders: ['<repo-id>', '<pipeline-id>'],
    },
  ],
  declarative: {
    steps: [
      'Make the PR pipeline run unit tests with results and coverage publishing.',
      'Add a build validation policy (Azure Repos) or required status check (GitHub) on main.',
      'Commit `azurepipelines-coverage.yml` and require the coverage status if you want a diff coverage gate.',
      'Provision an Azure Load Testing resource with Bicep and grant the pipeline identity Load Test Contributor.',
      'Add a load test stage after staging deployment, and add checks to the production environment.',
    ],
    code: [
      {
        title: 'Azure Load Testing resource and role assignment (Bicep)',
        language: 'bicep',
        code: `param location string = resourceGroup().location
param pipelinePrincipalId string

resource loadTest 'Microsoft.LoadTestService/loadTests@2022-12-01' = {
  name: 'lt-contoso-staging'
  location: location
  properties: {
    description: 'Load tests run from the release pipeline'
  }
}

// Load Test Contributor
var loadTestContributor = subscriptionResourceId('Microsoft.Authorization/roleDefinitions', '749a398d-560b-491b-bb21-08924219302e')

resource ra 'Microsoft.Authorization/roleAssignments@2022-04-01' = {
  name: guid(loadTest.id, pipelinePrincipalId, loadTestContributor)
  scope: loadTest
  properties: {
    roleDefinitionId: loadTestContributor
    principalId: pipelinePrincipalId
    principalType: 'ServicePrincipal'
  }
}`,
      },
      {
        title: 'GitHub Actions: tests as a required status check',
        language: 'yaml',
        explanation:
          'Make the job name `test` a required status check in the branch ruleset for main; PRs cannot merge while it is red.',
        code: `name: ci
on:
  pull_request:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: npm
      - run: npm ci
      - run: npx vitest run --coverage --reporter=junit --outputFile=junit.xml
      - uses: actions/upload-artifact@v4
        if: always()
        with:
          name: test-results
          path: |
            junit.xml
            coverage/`,
      },
    ],
  },
  verification: [
    {
      command: 'az pipelines runs show --id <run-id> --query "{result:result, status:status}"',
      what: 'Shows whether the run (and therefore the gate) succeeded.',
      expected: '{ "result": "succeeded", "status": "completed" }',
      placeholders: ['<run-id>'],
    },
    {
      command:
        'az load test-run show --load-test-resource <lt-name> --resource-group <rg> --test-run-id <run-id> --query testResult',
      what: 'Reports whether the load test met its failure criteria.',
      expected: '"PASSED"',
      placeholders: ['<lt-name>', '<rg>', '<run-id>'],
    },
    {
      command: 'az repos policy list --repository-id <repo-id> --branch main -o table',
      what: 'Confirms the build validation policy is enabled and blocking on main.',
      placeholders: ['<repo-id>'],
    },
  ],
  troubleshooting: [
    {
      command: 'find $(Agent.TempDirectory) -name "*.trx" -o -name "coverage.cobertura.xml"',
      what: 'Run as a script step when the Tests or Code Coverage tab is empty: usually the glob in the publish task does not match where the runner wrote the files.',
      expected:
        'The actual file paths, which you then use in testResultsFiles and summaryFileLocation.',
    },
    {
      command:
        'az load test-run metrics list --load-test-resource <lt-name> --resource-group <rg> --test-run-id <run-id> --metric-namespace LoadTestRunMetrics',
      what: 'Lists client-side metrics for a failed run so you can see which criterion was breached.',
      placeholders: ['<lt-name>', '<rg>', '<run-id>'],
    },
    {
      command:
        'az role assignment list --assignee <sp-app-id> --scope <load-test-resource-id> -o table',
      what: 'If AzureLoadTest@1 fails with an authorization error, check the service connection identity has Load Test Contributor on the resource.',
      placeholders: ['<sp-app-id>', '<load-test-resource-id>'],
    },
  ],
  commonMistakes: [
    'Publishing test results only when the test step succeeds - the default condition - so failures never reach the Tests tab. Use `condition: succeededOrFailed()` or `always()`.',
    'Inverting the pyramid: a large, slow UI suite and few unit tests. Feedback takes an hour and flakiness trains people to ignore red builds.',
    'Chasing a single global coverage number instead of gating on coverage of the lines each PR changes.',
    'Running load tests against production from a pipeline without agreement, or against an environment that is nothing like production.',
    'Adding the `pr:` trigger to an Azure Repos pipeline and expecting it to gate PRs. For Azure Repos, PR builds come from the build validation branch policy.',
    'Treating a manual approval as a quality gate. An approver who cannot see test and load results is a rubber stamp; add automated checks.',
  ],
  examTips: [
    '"Stop a PR from completing unless the build passes" = **build validation** branch policy (Azure Repos) or **required status check** (GitHub).',
    '"Stop a deployment while production alerts are active" = **Query Azure Monitor alerts** check on the environment (or a classic release pre-deployment gate).',
    'Know the coverage formats: `PublishCodeCoverageResults@2` accepts Cobertura and JaCoCo.',
    'Azure Load Testing uses JMeter or Locust, and **failure criteria** in the test config make the pipeline step fail.',
    'The test pyramid: most tests are unit tests; fewest are UI/end-to-end. Questions may ask which layer to expand for faster feedback.',
    'Gates and checks re-evaluate on a sampling interval until they succeed or the timeout expires.',
  ],
  summary: [
    'Design tests as a pyramid and shift them left: fast unit tests on every PR, slower tests later against real environments.',
    'Publish results and coverage so the pipeline can show and enforce them.',
    'Quality gates stop merges (build validation, required checks, diff coverage); release gates stop deployments (environment checks).',
    'Azure Load Testing runs JMeter or Locust scripts at scale and fails the step when failure criteria are breached.',
    'Gates must be automated and evidence-based, or they become rubber stamps.',
  ],
  practice: [
    {
      id: 'az4-testing-strategy-p1',
      level: 'beginner',
      prompt:
        'Your pipeline runs tests, but when a test fails the Tests tab of the run is empty. What is the most likely cause?',
      answer:
        'The PublishTestResults step runs with the default succeeded() condition, so it is skipped once the test step fails. Set its condition to succeededOrFailed() or always().',
    },
    {
      id: 'az4-testing-strategy-p2',
      level: 'intermediate',
      prompt:
        'You need production deployments to wait automatically while there are active Sev 1 alerts for the app. What do you configure in a YAML pipeline?',
      answer:
        'Add a Query Azure Monitor alerts check to the production environment. The deployment job targeting that environment waits, re-evaluating the check, until no matching alert is active or the timeout is reached.',
    },
    {
      id: 'az4-testing-strategy-p3',
      level: 'intermediate',
      prompt:
        'A team wants a PR to be blocked when fewer than 70% of the lines it changes are covered by tests. How can they do it in Azure Repos?',
      answer:
        'Publish coverage from the PR build, add an azurepipelines-coverage.yml with a diff target of 70%, and make the resulting code coverage status a required status policy on the branch.',
    },
    {
      id: 'az4-testing-strategy-p4',
      level: 'advanced',
      prompt:
        'Why is an end-to-end suite of several hundred UI tests usually a poor primary quality gate, and what would you change?',
      answer:
        'UI tests are slow and flaky, so the gate is late, expensive and often ignored. Move most checks down to unit and integration tests that run on every PR, keep a small set of critical-path UI tests after deployment, and quarantine flaky tests while they are fixed.',
    },
  ],
  lab: {
    title: 'Add tests, coverage and a load-test gate to a pipeline',
    scenario:
      'Take a small web API in Azure Repos, publish unit test results and coverage, require them on PRs, and add an Azure Load Testing stage.',
    prerequisites: [
      'Azure DevOps project with a repo containing a .NET or Node.js app with unit tests',
      'Azure subscription and a workload identity federation service connection',
      'Azure CLI 2.60 or later',
    ],
    tasks: [
      {
        instruction:
          'Add test, PublishTestResults@2 and PublishCodeCoverageResults@2 steps to azure-pipelines.yml and run it.',
      },
      {
        instruction:
          'Break one test on purpose and confirm the failing test appears on the Tests tab and the run fails.',
        hint: 'If the tab is empty, check the condition on the publish step.',
      },
      {
        instruction:
          'Add a build validation policy on main that uses the pipeline, then open a PR.',
      },
      {
        instruction:
          'Create a resource group and an Azure Load Testing resource, and grant the service connection identity Load Test Contributor.',
      },
      {
        instruction:
          'Commit a JMeter or Locust script plus a test config with two failure criteria, and add an AzureLoadTest@1 stage.',
      },
      {
        instruction:
          'Lower the response-time criterion to an impossible value and confirm the stage fails.',
      },
    ],
    solution: [
      {
        title: 'Azure resources',
        language: 'bash',
        code: `az group create -n rg-az400-testing -l westeurope
az load create -n lt-az400-lab -g rg-az400-testing -l westeurope

LT_ID=$(az load show -n lt-az400-lab -g rg-az400-testing --query id -o tsv)
az role assignment create --assignee <sc-app-id> \\
  --role "Load Test Contributor" --scope "$LT_ID"

az repos policy build create --repository-id <repo-id> --branch main \\
  --build-definition-id <pipeline-id> --blocking true --enabled true \\
  --queue-on-source-update-only false --manual-queue-only false \\
  --display-name "PR build" --valid-duration 720`,
      },
      {
        title: 'Pipeline stages',
        language: 'yaml',
        code: `stages:
  - stage: Build
    jobs:
      - job: Test
        pool:
          vmImage: ubuntu-latest
        steps:
          - script: dotnet test --logger trx --results-directory $(Agent.TempDirectory)/tests --collect "XPlat Code Coverage"
          - task: PublishTestResults@2
            condition: succeededOrFailed()
            inputs:
              testResultsFormat: VSTest
              testResultsFiles: '$(Agent.TempDirectory)/tests/**/*.trx'
          - task: PublishCodeCoverageResults@2
            condition: succeededOrFailed()
            inputs:
              summaryFileLocation: '$(Agent.TempDirectory)/tests/**/coverage.cobertura.xml'

  - stage: LoadTest
    dependsOn: Build
    condition: and(succeeded(), eq(variables['Build.SourceBranch'], 'refs/heads/main'))
    jobs:
      - job: Load
        pool:
          vmImage: ubuntu-latest
        steps:
          - task: AzureLoadTest@1
            inputs:
              azureSubscription: <service-connection>
              loadTestConfigFile: loadtests/api.yaml
              loadTestResource: lt-az400-lab
              resourceGroup: rg-az400-testing`,
      },
    ],
    verification: [
      {
        command:
          'az load test-run list --load-test-resource lt-az400-lab -g rg-az400-testing --test-id <test-id> -o table',
        what: 'Shows the pipeline-started runs and their results.',
        expected: 'One run per pipeline execution with PASSED or FAILED.',
        placeholders: ['<test-id>'],
      },
      {
        command: 'az repos policy list --repository-id <repo-id> --branch main -o table',
        what: 'Confirms the build validation policy exists and is blocking.',
        placeholders: ['<repo-id>'],
      },
    ],
    cleanup: [
      {
        command: 'az group delete -n rg-az400-testing --yes --no-wait',
        what: 'Deletes the Azure Load Testing resource and its resource group.',
      },
      {
        command: 'az repos policy delete --id <policy-id> --yes',
        what: 'Removes the lab build validation policy.',
        placeholders: ['<policy-id>'],
      },
    ],
  },
  relatedTopicIds: [
    'az4-yaml-pipelines',
    'az4-environments-approvals',
    'az4-branching-pr',
    'az4-pipeline-maintenance',
  ],
  docs: [
    {
      title: 'Publish Test Results task',
      url: 'https://learn.microsoft.com/azure/devops/pipelines/tasks/reference/publish-test-results-v2',
    },
    {
      title: 'Review code coverage results',
      url: 'https://learn.microsoft.com/azure/devops/pipelines/test/review-code-coverage-results',
    },
    {
      title: 'Automate load tests with CI/CD',
      url: 'https://learn.microsoft.com/azure/load-testing/how-to-configure-load-test-cicd',
    },
    {
      title: 'Define approvals and checks',
      url: 'https://learn.microsoft.com/azure/devops/pipelines/process/approvals',
    },
  ],
}
