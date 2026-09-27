import type { Question } from '../../types'

/** Original practice questions for the pipelines domain, part A. Written for this app. */
export const az400PipelinesPartAQuestions: Question[] = [
  {
    id: 'az4q-ppa-1',
    domainId: 'az4-pipelines',
    topicId: 'az4-package-management',
    kind: 'mcq',
    category: 'concept',
    difficulty: 'beginner',
    points: 1,
    prompt:
      'Developers restore npm packages from npmjs.com directly. You need builds to keep working if a public package version is later unpublished, while keeping a single source URL in every project. What should you configure?',
    options: [
      { id: 'a', text: 'An Azure Artifacts feed with npmjs.com as an upstream source' },
      { id: 'b', text: 'A second registry entry for npmjs.com in every .npmrc file' },
      { id: 'c', text: 'A pipeline cache step keyed on package-lock.json' },
      { id: 'd', text: 'A feed view named @Release that mirrors npmjs.com' },
    ],
    correct: ['a'],
    explanation:
      'An upstream source proxies npmjs.com and saves each version the feed serves, so it remains available after it disappears upstream, and clients use one feed URL. Adding npmjs.com to .npmrc bypasses the feed. A pipeline cache is per pipeline and can be evicted. Views filter packages already in a feed; they do not mirror a registry.',
  },
  {
    id: 'az4q-ppa-2',
    domainId: 'az4-pipelines',
    topicId: 'az4-package-management',
    kind: 'mcq',
    category: 'concept',
    difficulty: 'beginner',
    points: 1,
    prompt:
      'Your library team publishes every CI build of a NuGet package to a feed. Application teams must consume only versions that passed integration testing, without a second feed. What do you use?',
    options: [
      { id: 'a', text: 'Retention policies that delete untested versions' },
      {
        id: 'b',
        text: 'Promote tested versions to the @Release view and have consumers use feed@Release',
      },
      { id: 'c', text: 'Prerelease suffixes on every version so NuGet hides them' },
      { id: 'd', text: 'An upstream source that points at the same feed' },
    ],
    correct: ['b'],
    explanation:
      'Views are designed for this: every version lives in @Local and promotion adds a tested version to @Release, which consumers target. Retention would delete versions you may still need, prerelease suffixes only hide versions from default resolution rather than expressing test status, and a feed cannot usefully be its own upstream.',
  },
  {
    id: 'az4q-ppa-3',
    domainId: 'az4-pipelines',
    topicId: 'az4-package-management',
    kind: 'multi',
    category: 'concept',
    difficulty: 'intermediate',
    points: 2,
    prompt:
      'A library is at version 3.4.2 under Semantic Versioning. Which statements are correct? (Select all that apply.)',
    options: [
      { id: 'a', text: 'Removing a public method requires version 4.0.0' },
      { id: 'b', text: 'Adding a backwards-compatible feature should produce 3.5.0' },
      { id: 'c', text: '3.5.0-beta.1 has higher precedence than 3.5.0' },
      { id: 'd', text: 'A bug fix with no API change should produce 3.4.3' },
      { id: 'e', text: 'Build metadata such as +20260927 changes version precedence' },
    ],
    correct: ['a', 'b', 'd'],
    explanation:
      'Breaking changes bump MAJOR, compatible features bump MINOR and fixes bump PATCH. A prerelease such as 3.5.0-beta.1 sorts before 3.5.0, not after, and build metadata after + is ignored when comparing precedence.',
  },
  {
    id: 'az4q-ppa-4',
    domainId: 'az4-pipelines',
    topicId: 'az4-package-management',
    kind: 'mcq',
    category: 'troubleshoot',
    difficulty: 'intermediate',
    points: 2,
    prompt:
      'The pipeline below restores from the feed successfully but the push step fails with 403 Forbidden. What is the most likely fix?',
    code: {
      title: 'azure-pipelines.yml (excerpt)',
      language: 'yaml',
      code: `steps:
  - task: NuGetAuthenticate@1
  - script: dotnet pack -c Release -o $(Build.ArtifactStagingDirectory) /p:PackageVersion=1.2.$(Build.BuildId)
  - task: DotNetCoreCLI@2
    inputs:
      command: push
      packagesToPush: $(Build.ArtifactStagingDirectory)/*.nupkg
      nuGetFeedType: internal
      publishVstsFeed: 'Contoso/shared'`,
    },
    options: [
      { id: 'a', text: 'Replace NuGetAuthenticate@1 with a PAT stored in nuget.config' },
      {
        id: 'b',
        text: 'Grant the project build service identity the Feed Publisher (Contributor) role on the feed',
      },
      { id: 'c', text: 'Change nuGetFeedType to external' },
      { id: 'd', text: 'Add the feed as an upstream source of itself' },
    ],
    correct: ['b'],
    explanation:
      'Restore needs reader rights, push needs Feed Publisher (Contributor). The pipeline runs as the build service identity, so that identity must have the role. A PAT in the repo is insecure and unnecessary, external is for feeds outside the organization, and upstreams do not grant permissions.',
  },
  {
    id: 'az4q-ppa-5',
    domainId: 'az4-pipelines',
    topicId: 'az4-package-management',
    kind: 'command',
    category: 'command',
    difficulty: 'intermediate',
    points: 2,
    prompt:
      'Your az devops defaults already set the organization and project. Publish the folder ./dist as Universal Package `ops-cli` version 1.0.0 to the project-scoped feed `tools`.',
    acceptedAnswers: [
      'az artifacts universal publish --scope project --feed tools --name ops-cli --version 1.0.0 --path ./dist',
      'az artifacts universal publish --feed tools --scope project --name ops-cli --version 1.0.0 --path ./dist',
      'az artifacts universal publish --scope project --feed tools --name ops-cli --version 1.0.0 --path dist',
      'az artifacts universal publish --feed tools --name ops-cli --version 1.0.0 --path ./dist --scope project',
    ],
    answerHint:
      'az artifacts universal publish --scope ... --feed ... --name ... --version ... --path ...',
    explanation:
      '`az artifacts universal publish` uploads a directory as a Universal Package. `--scope project` is needed for a project-scoped feed (organization is the default scope), and `--path` names the folder to upload.',
  },
  {
    id: 'az4q-ppa-6',
    domainId: 'az4-pipelines',
    topicId: 'az4-testing-strategy',
    kind: 'mcq',
    category: 'troubleshoot',
    difficulty: 'beginner',
    points: 1,
    prompt:
      'When a unit test fails, the run fails but the Tests tab is empty. When all tests pass, the tab is populated. What is the bug?',
    code: {
      title: 'Test steps',
      language: 'yaml',
      code: `steps:
  - script: npx jest --ci --reporters=default --reporters=jest-junit
    displayName: Run tests
  - task: PublishTestResults@2
    inputs:
      testResultsFormat: JUnit
      testResultsFiles: '**/junit.xml'`,
    },
    options: [
      { id: 'a', text: 'testResultsFormat must be VSTest for Jest' },
      {
        id: 'b',
        text: 'The publish step has the default succeeded() condition, so it is skipped after the test step fails',
      },
      { id: 'c', text: 'The glob must be an absolute path' },
      { id: 'd', text: 'jest-junit only writes results when every test passes' },
    ],
    correct: ['b'],
    explanation:
      'Steps default to succeeded(), so once the test step fails, publishing is skipped. Add condition: succeededOrFailed() (or always()). JUnit is the correct format for jest-junit, relative globs are fine, and jest-junit writes results regardless of outcome.',
  },
  {
    id: 'az4q-ppa-7',
    domainId: 'az4-pipelines',
    topicId: 'az4-testing-strategy',
    kind: 'mcq',
    category: 'concept',
    difficulty: 'intermediate',
    points: 2,
    prompt:
      'Production deployments from a multi-stage YAML pipeline must wait automatically while any Sev 1 alert is active for the application. What should you configure?',
    options: [
      { id: 'a', text: 'A manual approval on the production environment' },
      { id: 'b', text: 'A Query Azure Monitor alerts check on the production environment' },
      { id: 'c', text: 'A build validation policy on the main branch' },
      { id: 'd', text: 'A condition: failed() on the production stage' },
    ],
    correct: ['b'],
    explanation:
      'Environment checks are the YAML form of release gates; the Azure Monitor alerts check re-evaluates until no matching alert is active. A manual approval is not automatic, build validation gates PRs rather than deployments, and failed() would run the stage only when earlier stages fail.',
  },
  {
    id: 'az4q-ppa-8',
    domainId: 'az4-pipelines',
    topicId: 'az4-testing-strategy',
    kind: 'multi',
    category: 'concept',
    difficulty: 'intermediate',
    points: 2,
    prompt:
      'Your team wants faster, more reliable feedback on pull requests. Which changes follow the test pyramid and shift-left guidance? (Select all that apply.)',
    options: [
      { id: 'a', text: 'Run unit tests and linting in the PR build' },
      { id: 'b', text: 'Convert most unit tests into UI tests so they cover more of the stack' },
      {
        id: 'c',
        text: 'Run a small set of critical-path end-to-end tests after deployment to staging',
      },
      { id: 'd', text: 'Run load tests against staging before production rather than on every PR' },
      { id: 'e', text: 'Run the full UI suite before compiling, to fail as early as possible' },
    ],
    correct: ['a', 'c', 'd'],
    explanation:
      'The pyramid keeps many fast unit tests at the base and few slow end-to-end tests at the top, run where they make sense: unit tests on PRs, end-to-end after deployment, load tests against a production-like environment. Replacing unit tests with UI tests inverts the pyramid, and UI tests cannot run before the app is built and deployed.',
  },
  {
    id: 'az4q-ppa-9',
    domainId: 'az4-pipelines',
    topicId: 'az4-testing-strategy',
    kind: 'mcq',
    category: 'yaml',
    difficulty: 'advanced',
    points: 2,
    prompt:
      'An AzureLoadTest@1 step uses the config below. The run reports an average response time of 350 ms and 1% errors. What happens to the pipeline step?',
    code: {
      title: 'loadtests/checkout.yaml',
      language: 'yaml',
      code: `version: v0.1
testId: checkout
testPlan: checkout.jmx
testType: JMX
engineInstances: 1
failureCriteria:
  - avg(response_time_ms) > 300
  - percentage(error) > 5`,
    },
    options: [
      { id: 'a', text: 'It succeeds, because the error rate is under 5%' },
      { id: 'b', text: 'It fails, because the average response time criterion is breached' },
      { id: 'c', text: 'It succeeds with a warning; failure criteria are informational' },
      { id: 'd', text: 'It fails only if both criteria are breached' },
    ],
    correct: ['b'],
    explanation:
      'Each failure criterion is evaluated independently and any breach marks the test run FAILED, which fails the pipeline step. 350 ms exceeds the 300 ms average threshold. Criteria are not informational, and they are not combined with AND.',
  },
  {
    id: 'az4q-ppa-10',
    domainId: 'az4-pipelines',
    topicId: 'az4-yaml-pipelines',
    kind: 'mcq',
    category: 'troubleshoot',
    difficulty: 'intermediate',
    points: 2,
    prompt:
      'This pipeline is for a repository in Azure Repos. Pushes to main build, but pull requests into main never start a run. What is wrong?',
    code: {
      title: 'azure-pipelines.yml',
      language: 'yaml',
      code: `trigger:
  branches:
    include:
      - main

pr:
  branches:
    include:
      - main

pool:
  vmImage: ubuntu-latest

steps:
  - script: dotnet test`,
    },
    options: [
      { id: 'a', text: 'The pr section must be indented under trigger' },
      {
        id: 'b',
        text: 'The pr keyword is ignored for Azure Repos; add a build validation branch policy on main',
      },
      { id: 'c', text: 'PR builds require a self-hosted agent' },
      { id: 'd', text: 'pr branch filters must use refs/heads/main' },
    ],
    correct: ['b'],
    explanation:
      'The pr trigger applies to GitHub and Bitbucket Cloud repositories. Azure Repos PR validation is configured with a Build validation branch policy that references the pipeline. pr is a top-level key, PR builds work on hosted agents, and short branch names are fine in filters.',
  },
  {
    id: 'az4q-ppa-11',
    domainId: 'az4-pipelines',
    topicId: 'az4-yaml-pipelines',
    kind: 'mcq',
    category: 'troubleshoot',
    difficulty: 'intermediate',
    points: 2,
    prompt:
      'The Deploy stage should run only for main after Build succeeds. Yesterday it ran for main even though Build failed. Which line is the bug?',
    code: {
      title: 'Stages',
      language: 'yaml',
      code: `stages:
  - stage: Build
    jobs:
      - job: Compile
        steps:
          - script: make build

  - stage: Deploy
    dependsOn: Build
    condition: eq(variables['Build.SourceBranch'], 'refs/heads/main')
    jobs:
      - job: Release
        steps:
          - script: make deploy`,
    },
    options: [
      { id: 'a', text: 'dependsOn: Build must be a list' },
      {
        id: 'b',
        text: "The condition replaces succeeded(); it should be and(succeeded(), eq(variables['Build.SourceBranch'], 'refs/heads/main'))",
      },
      { id: 'c', text: "variables['Build.SourceBranch'] is only available in the Build stage" },
      { id: 'd', text: 'Build.SourceBranch holds main, not refs/heads/main' },
    ],
    correct: ['b'],
    explanation:
      'A custom condition replaces the default succeeded(), so the stage now ignores the result of Build. Wrap it with and(succeeded(), ...). dependsOn accepts a single string, predefined variables are available in every stage, and Build.SourceBranch is the full ref (Build.SourceBranchName is the short name).',
  },
  {
    id: 'az4q-ppa-12',
    domainId: 'az4-pipelines',
    topicId: 'az4-yaml-pipelines',
    kind: 'multi',
    category: 'concept',
    difficulty: 'beginner',
    points: 1,
    prompt:
      'Which statements describe the default execution order in a multi-stage Azure Pipelines YAML file? (Select all that apply.)',
    options: [
      { id: 'a', text: 'Stages run sequentially in the order they are written' },
      {
        id: 'b',
        text: 'Jobs in the same stage run in parallel if agents and parallel jobs are available',
      },
      { id: 'c', text: 'Steps in a job run in parallel on the same agent' },
      {
        id: 'd',
        text: 'Setting dependsOn: [] on a stage lets it run at the same time as the first stage',
      },
      { id: 'e', text: 'Jobs always wait for the previous job in the file to finish' },
    ],
    correct: ['a', 'b', 'd'],
    explanation:
      'Stages implicitly depend on the previous stage, jobs within a stage have no implicit dependency and so run in parallel, and dependsOn: [] removes a stage’s implicit dependency. Steps always run in order, and jobs only wait for others when dependsOn says so.',
  },
  {
    id: 'az4q-ppa-13',
    domainId: 'az4-pipelines',
    topicId: 'az4-yaml-pipelines',
    kind: 'mcq',
    category: 'yaml',
    difficulty: 'advanced',
    points: 2,
    prompt:
      'A step named `meta` in job `Version` of stage `Build` runs `echo "##vso[task.setvariable variable=tag;isOutput=true]v1.8.0"`. How does a job in stage `Release` map it to a variable?',
    options: [
      { id: 'a', text: "tag: $[ dependencies.Version.outputs['meta.tag'] ]" },
      { id: 'b', text: "tag: $[ stageDependencies.Build.Version.outputs['meta.tag'] ]" },
      { id: 'c', text: 'tag: $(Build.Version.meta.tag)' },
      { id: 'd', text: "tag: $[ variables['meta.tag'] ]" },
    ],
    correct: ['b'],
    explanation:
      "Across stages you use stageDependencies.<stage>.<job>.outputs['<step>.<variable>'] in a runtime expression. dependencies.<job> works only within the same stage, and macro or variables[] syntax cannot see another job’s outputs.",
  },
  {
    id: 'az4q-ppa-14',
    domainId: 'az4-pipelines',
    topicId: 'az4-yaml-pipelines',
    kind: 'mcq',
    category: 'yaml',
    difficulty: 'intermediate',
    points: 2,
    prompt:
      'A nightly build uses the schedule below. On nights after a weekend with no commits, no run appears. Why?',
    code: {
      title: 'schedules',
      language: 'yaml',
      code: `schedules:
  - cron: '0 1 * * *'
    displayName: Nightly
    branches:
      include:
        - main`,
    },
    options: [
      { id: 'a', text: 'Cron schedules only run on weekdays unless you add a days list' },
      {
        id: 'b',
        text: 'always defaults to false, so the run is skipped when main has not changed since the last successful scheduled run',
      },
      { id: 'c', text: 'The cron is in local time and the agent pool is in another region' },
      { id: 'd', text: 'Scheduled triggers need trigger: none to be set' },
    ],
    correct: ['b'],
    explanation:
      'Scheduled triggers skip runs when there are no source changes, unless always: true. The cron fields 0 1 * * * already mean every day; times are UTC regardless of agent location, and trigger: none is unrelated to schedules.',
  },
  {
    id: 'az4q-ppa-15',
    domainId: 'az4-pipelines',
    topicId: 'az4-yaml-pipelines',
    kind: 'command',
    category: 'command',
    difficulty: 'beginner',
    points: 1,
    prompt:
      'With az devops defaults configured, queue a run of the pipeline named `orders-ci` on branch `release/2.4`.',
    acceptedAnswers: [
      'az pipelines run --name orders-ci --branch release/2.4',
      'az pipelines run --branch release/2.4 --name orders-ci',
      'az pipelines run --name orders-ci --branch refs/heads/release/2.4',
    ],
    answerHint: 'az pipelines run ...',
    explanation:
      '`az pipelines run` queues a run of an existing pipeline, identified by `--name` or `--id`, on the branch given by `--branch`. It works regardless of the YAML trigger settings.',
  },
  {
    id: 'az4q-ppa-16',
    domainId: 'az4-pipelines',
    topicId: 'az4-agents-runners',
    kind: 'mcq',
    category: 'concept',
    difficulty: 'intermediate',
    points: 2,
    prompt:
      'Integration tests must reach a database that is only reachable through a private endpoint. You want Microsoft to manage the agent machines and images, and you want to minimize administrative effort. What do you use?',
    options: [
      { id: 'a', text: 'Microsoft-hosted agents with the ubuntu-latest image' },
      {
        id: 'b',
        text: 'Managed DevOps Pools with the pool injected into a subnet of your virtual network',
      },
      { id: 'c', text: 'A self-hosted agent on a VM you build and patch' },
      { id: 'd', text: 'A pipeline service connection with a private endpoint' },
    ],
    correct: ['b'],
    explanation:
      'Managed DevOps Pools run agents Microsoft manages, in your subscription, and support VNet injection for private access. Microsoft-hosted agents cannot reach your private network, a self-hosted VM works but needs more administration, and service connections do not provide network paths.',
  },
  {
    id: 'az4q-ppa-17',
    domainId: 'az4-pipelines',
    topicId: 'az4-agents-runners',
    kind: 'mcq',
    category: 'troubleshoot',
    difficulty: 'intermediate',
    points: 2,
    prompt:
      'An organization has six online self-hosted agents in one pool, yet only one self-hosted job runs at a time and the rest queue. What is the cause?',
    options: [
      { id: 'a', text: 'The agents are missing a demand' },
      { id: 'b', text: 'The organization has only one self-hosted parallel job' },
      { id: 'c', text: 'Self-hosted agents can only run one pipeline per project' },
      { id: 'd', text: 'The pool must be converted to a scale set pool for parallelism' },
    ],
    correct: ['b'],
    explanation:
      'Concurrency is limited by the number of parallel jobs licensed, not the number of agents. Buy additional self-hosted parallel jobs. Demands decide which agents are eligible, not how many jobs run; there is no per-project limit of this kind, and a scale set pool does not raise the licence limit.',
  },
  {
    id: 'az4q-ppa-18',
    domainId: 'az4-pipelines',
    topicId: 'az4-agents-runners',
    kind: 'multi',
    category: 'concept',
    difficulty: 'intermediate',
    points: 2,
    prompt:
      'Which statements about self-hosted agents and runners are correct? (Select all that apply.)',
    options: [
      {
        id: 'a',
        text: 'They connect outbound to the service over HTTPS, so no inbound firewall rule is required',
      },
      { id: 'b', text: 'GitHub recommends against using them with public repositories' },
      { id: 'c', text: 'They start every job on a fresh, reimaged machine by default' },
      {
        id: 'd',
        text: 'Registering a GitHub runner with --ephemeral makes it take a single job and then deregister',
      },
      {
        id: 'e',
        text: 'Every Azure DevOps job on a self-hosted agent consumes Microsoft-hosted minutes',
      },
    ],
    correct: ['a', 'b', 'd'],
    explanation:
      'Agents and runners poll outbound, fork PRs could run untrusted code on a public repo’s self-hosted runner, and --ephemeral gives one job per runner. Self-hosted machines keep state between jobs unless you arrange otherwise, and self-hosted jobs do not consume Microsoft-hosted minutes.',
  },
  {
    id: 'az4q-ppa-19',
    domainId: 'az4-pipelines',
    topicId: 'az4-agents-runners',
    kind: 'mcq',
    category: 'troubleshoot',
    difficulty: 'beginner',
    points: 1,
    prompt:
      'A job fails to start with "No agent found in pool Default which satisfies the specified demands". What is the first thing to compare?',
    code: {
      title: 'Job',
      language: 'yaml',
      code: `- job: Package
  pool:
    name: Default
    demands:
      - maven
      - Agent.OS -equals Linux
  steps:
    - script: mvn -B package`,
    },
    options: [
      {
        id: 'a',
        text: 'The job demands against the capabilities of the agents in the Default pool',
      },
      { id: 'b', text: 'The vmImage of the Microsoft-hosted pool' },
      { id: 'c', text: 'The number of Microsoft-hosted parallel jobs' },
      { id: 'd', text: 'The branch filters in the trigger' },
    ],
    correct: ['a'],
    explanation:
      'Demands must be satisfied by some agent’s system or user capabilities. Install Maven on a Linux agent (or add the capability), or change the demands. vmImage and hosted parallel jobs are irrelevant for a self-hosted pool, and triggers decide whether a run starts, not which agent it uses.',
  },
  {
    id: 'az4q-ppa-20',
    domainId: 'az4-pipelines',
    topicId: 'az4-github-actions',
    kind: 'mcq',
    category: 'troubleshoot',
    difficulty: 'intermediate',
    points: 2,
    prompt:
      'This deploy job fails in the azure/login step with an error saying it could not fetch an OIDC token. What is the bug?',
    code: {
      title: '.github/workflows/deploy.yml (excerpt)',
      language: 'yaml',
      code: `permissions:
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
    options: [
      { id: 'a', text: 'client-id must be read from secrets, not vars' },
      { id: 'b', text: 'The job lacks permissions: id-token: write' },
      { id: 'c', text: 'azure/login requires runs-on: windows-latest for OIDC' },
      { id: 'd', text: 'environment must be removed for OIDC to work' },
    ],
    correct: ['b'],
    explanation:
      'The workflow-level permissions grant only contents: read, so the job cannot request an ID token. Add id-token: write (with contents: read) to the job. Client and tenant IDs are identifiers and can be variables, OIDC works on any runner OS, and environments are fully supported (they change the token subject).',
  },
  {
    id: 'az4q-ppa-21',
    domainId: 'az4-pipelines',
    topicId: 'az4-github-actions',
    kind: 'mcq',
    category: 'troubleshoot',
    difficulty: 'advanced',
    points: 2,
    prompt:
      'A job with `environment: staging` logs in with OIDC and fails with AADSTS700213 (no matching federated identity record). The app registration has one federated credential with subject `repo:contoso/shop:ref:refs/heads/main`. What should you do?',
    options: [
      {
        id: 'a',
        text: 'Add a federated credential with subject repo:contoso/shop:environment:staging',
      },
      { id: 'b', text: 'Change the audience to https://github.com' },
      {
        id: 'c',
        text: 'Add a client secret to the app registration and store it as AZURE_CREDENTIALS',
      },
      { id: 'd', text: 'Grant the app registration Owner on the subscription' },
    ],
    correct: ['a'],
    explanation:
      'When a job targets an environment, the token subject is repo:<owner>/<repo>:environment:<name>, which does not match the branch-based credential. Add a credential for that subject. The audience must stay api://AzureADTokenExchange, a client secret defeats the purpose of OIDC, and RBAC roles do not affect token exchange.',
  },
  {
    id: 'az4q-ppa-22',
    domainId: 'az4-pipelines',
    topicId: 'az4-github-actions',
    kind: 'mcq',
    category: 'concept',
    difficulty: 'intermediate',
    points: 2,
    prompt:
      'Fifteen repositories need an identical deployment process: two jobs, a protected environment and OIDC login. You want one place to change it. What should you create?',
    options: [
      { id: 'a', text: 'A composite action used as a step in each repository' },
      {
        id: 'b',
        text: 'A reusable workflow triggered by workflow_call and called as a job from each repository',
      },
      { id: 'c', text: 'An organization secret containing the deployment script' },
      { id: 'd', text: 'A workflow_dispatch workflow in each repository' },
    ],
    correct: ['b'],
    explanation:
      'Reusable workflows share whole jobs, including runners and environments. A composite action shares steps only and cannot declare jobs or environments. Secrets are for sensitive values, not logic, and a workflow_dispatch workflow per repo still duplicates the process.',
  },
  {
    id: 'az4q-ppa-23',
    domainId: 'az4-pipelines',
    topicId: 'az4-github-actions',
    kind: 'mcq',
    category: 'troubleshoot',
    difficulty: 'intermediate',
    points: 2,
    prompt: 'This composite action fails to load. What is wrong?',
    code: {
      title: '.github/actions/setup/action.yml',
      language: 'yaml',
      code: `name: setup
description: Install dependencies
runs:
  using: composite
  steps:
    - uses: actions/setup-node@v4
      with:
        node-version: 22
    - run: npm ci`,
    },
    options: [
      { id: 'a', text: 'Composite actions cannot use other actions' },
      { id: 'b', text: 'The run step is missing the required shell property' },
      { id: 'c', text: 'using must be node20' },
      { id: 'd', text: 'Composite actions must declare runs-on' },
    ],
    correct: ['b'],
    explanation:
      'In a composite action every run step must specify shell (for example shell: bash). Composite actions can use other actions, using: composite is correct for this type, and runners are chosen by the calling job, not the action.',
  },
  {
    id: 'az4q-ppa-24',
    domainId: 'az4-pipelines',
    topicId: 'az4-github-actions',
    kind: 'multi',
    category: 'concept',
    difficulty: 'intermediate',
    points: 2,
    prompt:
      'Which GitHub environment features can you use to control deployments to production? (Select all that apply.)',
    options: [
      { id: 'a', text: 'Required reviewers who must approve before the job starts' },
      { id: 'b', text: 'A wait timer that delays the job' },
      { id: 'c', text: 'Deployment branch and tag rules limiting which refs can deploy' },
      {
        id: 'd',
        text: 'Environment secrets available only to jobs that reference the environment',
      },
      { id: 'e', text: 'Automatic rollback of the Azure resource when a later job fails' },
    ],
    correct: ['a', 'b', 'c', 'd'],
    explanation:
      'Environments provide protection rules (required reviewers, wait timer, deployment branches and tags, custom protection rules) and scoped secrets and variables. They do not roll back Azure resources; rollback is something your workflow must implement.',
  },
  {
    id: 'az4q-ppa-25',
    domainId: 'az4-pipelines',
    topicId: 'az4-github-actions',
    kind: 'command',
    category: 'command',
    difficulty: 'beginner',
    points: 1,
    prompt:
      'Trigger the workflow file `release.yml` (which has a workflow_dispatch trigger) on branch `main`, passing the input `environment` with the value `staging`.',
    acceptedAnswers: [
      'gh workflow run release.yml --ref main -f environment=staging',
      'gh workflow run release.yml -r main -f environment=staging',
      'gh workflow run release.yml --ref main --field environment=staging',
      'gh workflow run release.yml --ref main --raw-field environment=staging',
      'gh workflow run release.yml -f environment=staging --ref main',
    ],
    answerHint: 'gh workflow run ...',
    explanation:
      '`gh workflow run` creates a workflow_dispatch event; `--ref` picks the branch and `-f/--field` (or `-F`, `--raw-field`) passes inputs.',
  },
  {
    id: 'az4q-ppa-26',
    domainId: 'az4-pipelines',
    topicId: 'az4-github-actions',
    kind: 'task',
    category: 'lab',
    difficulty: 'advanced',
    points: 3,
    prompt:
      'Configure repository contoso/web to deploy to an existing Azure web app from GitHub Actions with no stored Azure secret, only from main, and only after a reviewer approves.',
    context:
      'A resource group rg-web with web app app-contoso-web exists. You have Owner on the resource group and admin on the repository.',
    checkpoints: [
      {
        id: 'c1',
        text: 'A user-assigned managed identity (or app registration) has Website Contributor on rg-web only',
      },
      {
        id: 'c2',
        text: 'A federated credential exists with subject repo:contoso/web:environment:production and audience api://AzureADTokenExchange',
      },
      {
        id: 'c3',
        text: 'The production environment has a required reviewer and allows deployments only from main',
      },
      {
        id: 'c4',
        text: 'The deploy job declares environment: production and permissions id-token: write',
      },
      {
        id: 'c5',
        text: 'No client secret exists in repository, environment or organization secrets',
      },
    ],
    solution: [
      {
        title: 'Identity and trust',
        language: 'bash',
        code: `az identity create -n id-gh-web -g rg-web
PRINCIPAL_ID=$(az identity show -n id-gh-web -g rg-web --query principalId -o tsv)
az role assignment create --assignee-object-id $PRINCIPAL_ID \\
  --assignee-principal-type ServicePrincipal --role "Website Contributor" \\
  --scope $(az group show -n rg-web --query id -o tsv)

az identity federated-credential create -n gh-production \\
  --identity-name id-gh-web -g rg-web \\
  --issuer https://token.actions.githubusercontent.com \\
  --subject repo:contoso/web:environment:production \\
  --audiences api://AzureADTokenExchange

gh variable set AZURE_CLIENT_ID -R contoso/web \\
  --body "$(az identity show -n id-gh-web -g rg-web --query clientId -o tsv)"
gh variable set AZURE_TENANT_ID -R contoso/web --body "$(az account show --query tenantId -o tsv)"
gh variable set AZURE_SUBSCRIPTION_ID -R contoso/web --body "$(az account show --query id -o tsv)"
# Then: Settings > Environments > production: add a required reviewer
# and set Deployment branches to Selected branches: main.`,
      },
      {
        title: 'Deploy job',
        language: 'yaml',
        code: `jobs:
  deploy:
    runs-on: ubuntu-latest
    environment: production
    permissions:
      contents: read
      id-token: write
    steps:
      - uses: actions/checkout@v4
      - uses: azure/login@v2
        with:
          client-id: \${{ vars.AZURE_CLIENT_ID }}
          tenant-id: \${{ vars.AZURE_TENANT_ID }}
          subscription-id: \${{ vars.AZURE_SUBSCRIPTION_ID }}
      - uses: azure/webapps-deploy@v3
        with:
          app-name: app-contoso-web
          package: .`,
      },
    ],
    explanation:
      'OIDC removes the stored secret, the environment-based subject ties the trust to the protected environment, and the environment rules enforce both the reviewer and the main-only restriction. The role is scoped to the resource group for least privilege.',
  },
  {
    id: 'az4q-ppa-27',
    domainId: 'az4-pipelines',
    topicId: 'az4-yaml-pipelines',
    kind: 'task',
    category: 'lab',
    difficulty: 'intermediate',
    points: 2,
    prompt:
      'Write an Azure Pipelines YAML file that builds on pushes to main and releases/*, tests on Linux and Windows in parallel, and runs a Deploy stage only for main after all tests pass.',
    context:
      'An Azure Repos repository with a .NET solution. Microsoft-hosted agents are available.',
    checkpoints: [
      { id: 'c1', text: 'trigger includes main and releases/*' },
      {
        id: 'c2',
        text: 'A matrix (or two jobs) runs tests on ubuntu-latest and windows-latest in parallel',
      },
      { id: 'c3', text: 'The Deploy stage depends on the build/test stage' },
      {
        id: 'c4',
        text: "The Deploy condition is and(succeeded(), eq(variables['Build.SourceBranch'], 'refs/heads/main'))",
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
      - releases/*

stages:
  - stage: Test
    jobs:
      - job: UnitTests
        strategy:
          matrix:
            linux:
              imageName: ubuntu-latest
            windows:
              imageName: windows-latest
        pool:
          vmImage: $(imageName)
        steps:
          - script: dotnet test -c Release

  - stage: Deploy
    dependsOn: Test
    condition: and(succeeded(), eq(variables['Build.SourceBranch'], 'refs/heads/main'))
    jobs:
      - job: Release
        pool:
          vmImage: ubuntu-latest
        steps:
          - script: echo "Deploying $(Build.BuildNumber)"`,
      },
    ],
    explanation:
      'The matrix produces two parallel jobs in the Test stage. Deploy depends on Test and its condition keeps succeeded() while adding the branch check, so a failed test leg or a release branch run skips it.',
  },
]
