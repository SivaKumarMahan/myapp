import type { Question } from '../../types'

/** Original practice questions for build and release pipelines, lessons 6-10. Written for this app. */
export const az400PipelinesPartBQuestions: Question[] = [
  {
    id: 'az4q-ppb-1',
    domainId: 'az4-pipelines',
    topicId: 'az4-pipeline-templates',
    kind: 'mcq',
    category: 'yaml',
    difficulty: 'advanced',
    points: 2,
    prompt:
      'A script in job A runs `echo "##vso[task.setvariable variable=ready;isOutput=true]yes"` in a step named check. Job B in the same stage has dependsOn: A. Which condition on job B correctly runs it only when ready is yes?',
    options: [
      { id: 'a', text: "condition: eq(${{ variables.ready }}, 'yes')" },
      { id: 'b', text: "condition: eq(dependencies.A.outputs['check.ready'], 'yes')" },
      { id: 'c', text: "condition: eq($(ready), 'yes')" },
      { id: 'd', text: "condition: eq(stageDependencies.A.outputs['ready'], 'yes')" },
    ],
    correct: ['b'],
    explanation:
      "Output variables from another job in the same stage are read at runtime through dependencies.<job>.outputs['<step>.<variable>']. A template expression is evaluated at compile time, before the script ran, so it sees nothing. Macro syntax is not expanded inside conditions. stageDependencies is for jobs in a later stage and also needs the job name.",
  },
  {
    id: 'az4q-ppb-2',
    domainId: 'az4-pipelines',
    topicId: 'az4-pipeline-templates',
    kind: 'mcq',
    category: 'concept',
    difficulty: 'advanced',
    points: 2,
    prompt:
      'Your security team must guarantee that every YAML pipeline that uses the production service connection runs a mandatory credential-scanning stage that pipeline authors cannot remove. What should you implement?',
    options: [
      { id: 'a', text: 'A step template containing the scan, referenced from each pipeline' },
      {
        id: 'b',
        text: 'An extends template with the scan stage, plus a Required template check on the service connection',
      },
      { id: 'c', text: 'A task group containing the scan task, shared across the project' },
      { id: 'd', text: 'A variable group that sets runScan to true for every pipeline' },
    ],
    correct: ['b'],
    explanation:
      'Only an extends template combined with the Required template check enforces structure: runs that do not extend the approved template are blocked at the check. A step template can simply be omitted by an author. Task groups are for classic pipelines, and a variable only works if the pipeline chooses to read it.',
  },
  {
    id: 'az4q-ppb-3',
    domainId: 'az4-pipelines',
    topicId: 'az4-pipeline-templates',
    kind: 'multi',
    category: 'concept',
    difficulty: 'intermediate',
    points: 2,
    prompt:
      'Which statements about parameters and variables in Azure Pipelines YAML are correct? (Select all that apply.)',
    options: [
      { id: 'a', text: 'Template parameters are typed and are resolved at compile time' },
      {
        id: 'b',
        text: 'Variables are always strings and can be changed by a script during the run',
      },
      { id: 'c', text: 'Parameters are the recommended way to pass secrets into a template' },
      {
        id: 'd',
        text: 'A runtime parameter with a values list restricts what a user can choose when queuing a run',
      },
      { id: 'e', text: 'Variable groups can only be used by classic release pipelines' },
    ],
    correct: ['a', 'b', 'd'],
    explanation:
      'Parameters are typed, validated and expanded at compile time, and a values list on a root parameter limits queue-time choices. Variables are strings that scripts can update with task.setvariable. Parameters end up in the expanded YAML anyone with read access can download, so secrets belong in secret variables or Key Vault-linked variable groups, which YAML pipelines use with - group.',
  },
  {
    id: 'az4q-ppb-4',
    domainId: 'az4-pipelines',
    topicId: 'az4-pipeline-templates',
    kind: 'command',
    category: 'command',
    difficulty: 'intermediate',
    points: 2,
    prompt:
      'Using the Azure DevOps CLI extension, queue the pipeline named web-ci on the main branch and set the runtime parameter environment to prod.',
    acceptedAnswers: [
      'az pipelines run --name web-ci --branch main --parameters environment=prod',
      'az pipelines run --name web-ci --parameters environment=prod --branch main',
      'az pipelines run --branch main --name web-ci --parameters environment=prod',
    ],
    answerHint: 'az pipelines run ...',
    explanation:
      'az pipelines run queues a run; --parameters sets runtime (template) parameter values as name=value pairs, while --variables would set queue-time variables instead.',
  },
  {
    id: 'az4q-ppb-5',
    domainId: 'az4-pipelines',
    topicId: 'az4-deployment-strategies',
    kind: 'mcq',
    category: 'concept',
    difficulty: 'intermediate',
    points: 2,
    prompt:
      'An App Service web app on the Premium v3 tier must be updated with zero downtime, and operations must be able to revert to the previous version within seconds without redeploying. What should you use?',
    options: [
      { id: 'a', text: 'Deploy to a staging deployment slot and swap it with production' },
      { id: 'b', text: 'Scale out to more instances before deploying directly to production' },
      { id: 'c', text: 'Use a rolling deployment job strategy with maxParallel: 1' },
      { id: 'd', text: 'Enable a feature flag in Azure App Configuration for the new version' },
    ],
    correct: ['a'],
    explanation:
      'A slot swap exchanges routing between the warmed-up staging slot and production, and the previous version remains in the staging slot, so a second swap reverts in seconds. Scaling out does not prevent restarts during deployment. The rolling strategy targets VM resources, not App Service. A feature flag toggles features inside one version rather than switching versions.',
  },
  {
    id: 'az4q-ppb-6',
    domainId: 'az4-pipelines',
    topicId: 'az4-deployment-strategies',
    kind: 'mcq',
    category: 'concept',
    difficulty: 'advanced',
    points: 2,
    prompt:
      'A product team wants to release a new search feature first to internal employees, then to a group of opted-in beta customers, and finally to all users, without deploying new code at each step. Which approach fits best?',
    options: [
      { id: 'a', text: 'Blue-green deployment with two App Service plans' },
      {
        id: 'b',
        text: 'A feature flag in Azure App Configuration with a targeting filter for groups and rollout percentage',
      },
      { id: 'c', text: 'A canary deployment job with increments of 10 and 50' },
      { id: 'd', text: 'A rolling deployment across the VM scale set' },
    ],
    correct: ['b'],
    explanation:
      'The requirement is progressive exposure by user group without redeploying, which is exactly a feature flag with a targeting filter (groups such as employees and beta, then a default rollout percentage). Blue-green, canary and rolling all expose a deployed version by infrastructure or traffic share, not by named user groups, and each step would require a deployment action.',
  },
  {
    id: 'az4q-ppb-7',
    domainId: 'az4-pipelines',
    topicId: 'az4-deployment-strategies',
    kind: 'multi',
    category: 'troubleshoot',
    difficulty: 'intermediate',
    points: 2,
    prompt:
      'After swapping a staging slot into production, the production app starts using the staging database and staging API keys. Which actions prevent this on future swaps? (Select all that apply.)',
    options: [
      {
        id: 'a',
        text: 'Mark the database connection string as a deployment slot setting in each slot',
      },
      {
        id: 'b',
        text: 'Mark the environment-specific API key app setting as a deployment slot setting',
      },
      { id: 'c', text: 'Enable auto swap on the staging slot' },
      { id: 'd', text: 'Move the app to a Basic tier plan' },
      {
        id: 'e',
        text: 'Use swap with preview so production settings are applied to staging before the final swap',
      },
    ],
    correct: ['a', 'b'],
    explanation:
      'Settings marked as deployment slot settings (sticky) stay with their slot during a swap, so production keeps its own connection string and keys. Auto swap only automates the swap. Basic tier does not support slots at all. Swap with preview applies target settings temporarily for validation but does not change which settings travel with the swap.',
  },
  {
    id: 'az4q-ppb-8',
    domainId: 'az4-pipelines',
    topicId: 'az4-deployment-strategies',
    kind: 'command',
    category: 'command',
    difficulty: 'intermediate',
    points: 2,
    prompt:
      'Write the Azure CLI command that swaps the staging slot of web app app-shop in resource group rg-shop into production.',
    acceptedAnswers: [
      'az webapp deployment slot swap --resource-group rg-shop --name app-shop --slot staging --target-slot production',
      'az webapp deployment slot swap -g rg-shop -n app-shop --slot staging --target-slot production',
      'az webapp deployment slot swap --resource-group rg-shop --name app-shop --slot staging',
      'az webapp deployment slot swap -g rg-shop -n app-shop --slot staging',
      'az webapp deployment slot swap -g rg-shop -n app-shop -s staging --target-slot production',
    ],
    answerHint: 'az webapp deployment slot ...',
    explanation:
      'az webapp deployment slot swap swaps the source slot given with --slot into --target-slot, which defaults to production. Running it again swaps back, which is the rollback.',
  },
  {
    id: 'az4q-ppb-9',
    domainId: 'az4-pipelines',
    topicId: 'az4-deployment-strategies',
    kind: 'mcq',
    category: 'yaml',
    difficulty: 'advanced',
    points: 2,
    prompt:
      'In an Azure Pipelines deployment job using strategy canary with increments [10, 25], in which lifecycle hook should you place an automated check of error rates that runs after each increment receives traffic?',
    options: [
      { id: 'a', text: 'preDeploy' },
      { id: 'b', text: 'deploy' },
      { id: 'c', text: 'postRouteTraffic' },
      { id: 'd', text: 'on: success' },
    ],
    correct: ['c'],
    explanation:
      'postRouteTraffic runs after traffic has been routed to the new version for each increment, which is the moment to measure health. preDeploy prepares resources before deployment, deploy performs the rollout itself, and on success runs only once at the end after every increment has passed, too late to stop a bad canary early.',
  },
  {
    id: 'az4q-ppb-10',
    domainId: 'az4-pipelines',
    topicId: 'az4-environments-approvals',
    kind: 'mcq',
    category: 'concept',
    difficulty: 'intermediate',
    points: 2,
    prompt:
      'You need to stop any YAML pipeline from deploying to the orders-prod environment while an Azure Monitor Sev 1 alert is active on the production resource group. What should you configure?',
    options: [
      { id: 'a', text: 'A Business hours check on the orders-prod environment' },
      { id: 'b', text: 'A Query Azure Monitor alerts check on the orders-prod environment' },
      { id: 'c', text: 'A condition: failed() on the production stage' },
      { id: 'd', text: 'A branch policy on main that requires a successful build' },
    ],
    correct: ['b'],
    explanation:
      'The Query Azure Monitor alerts check evaluates alert rules and only passes when no matching alerts are firing. Business hours limits deployment windows, a failed() condition reacts to earlier stages in the same run rather than to production health, and branch policies govern pull requests, not deployments.',
  },
  {
    id: 'az4q-ppb-11',
    domainId: 'az4-pipelines',
    topicId: 'az4-environments-approvals',
    kind: 'multi',
    category: 'concept',
    difficulty: 'intermediate',
    points: 2,
    prompt:
      'Which settings can you configure as protection rules or scoping on a GitHub Actions environment? (Select all that apply.)',
    options: [
      { id: 'a', text: 'Required reviewers' },
      { id: 'b', text: 'A wait timer before the job starts' },
      { id: 'c', text: 'Allowed deployment branches and tags' },
      { id: 'd', text: 'The Azure Pipelines agent pool the job runs on' },
      { id: 'e', text: 'Secrets that only jobs referencing the environment can read' },
    ],
    correct: ['a', 'b', 'c', 'e'],
    explanation:
      'GitHub environments support required reviewers, a wait timer, deployment branch and tag rules, custom protection rules and environment-scoped secrets and variables. Agent pools are an Azure Pipelines concept; in GitHub the runner is selected with runs-on in the workflow.',
  },
  {
    id: 'az4q-ppb-12',
    domainId: 'az4-pipelines',
    topicId: 'az4-environments-approvals',
    kind: 'mcq',
    category: 'yaml',
    difficulty: 'intermediate',
    points: 2,
    prompt:
      'Several merges to main trigger runs that all wait at the production environment. You want only the most recent run to deploy and older waiting runs to be cancelled. What do you configure?',
    options: [
      {
        id: 'a',
        text: 'An Exclusive lock check on the environment and lockBehavior: runLatest in the pipeline',
      },
      {
        id: 'b',
        text: 'An Exclusive lock check on the environment and lockBehavior: sequential in the pipeline',
      },
      { id: 'c', text: 'batch: false on the CI trigger' },
      { id: 'd', text: 'An Approvals check with a 5 minute timeout' },
    ],
    correct: ['a'],
    explanation:
      'With an Exclusive lock check, lockBehavior runLatest lets only the newest run proceed and cancels older waiting ones. sequential would deploy every run one after another. batch false is the default and creates more runs, not fewer, and an approval timeout simply fails runs nobody approved.',
  },
  {
    id: 'az4q-ppb-13',
    domainId: 'az4-pipelines',
    topicId: 'az4-environments-approvals',
    kind: 'task',
    category: 'lab',
    difficulty: 'intermediate',
    points: 2,
    prompt:
      'Configure a multi-stage YAML pipeline so that deployments to production require approval from the Release Approvers group and can only come from the main branch.',
    context:
      'An Azure DevOps project with a working Build stage that publishes an artifact named drop, and a group called Release Approvers.',
    checkpoints: [
      { id: 'c1', text: 'An environment named app-prod exists in Pipelines > Environments' },
      {
        id: 'c2',
        text: 'app-prod has an Approvals check listing the Release Approvers group, with the requester not allowed to approve',
      },
      { id: 'c3', text: 'app-prod has a Branch control check allowing only refs/heads/main' },
      {
        id: 'c4',
        text: 'The pipeline has a Prod stage whose deployment job targets environment: app-prod',
      },
      {
        id: 'c5',
        text: 'A run from main waits for approval; a run from a feature branch fails at the Branch control check',
      },
    ],
    solution: [
      {
        title: 'Prod stage',
        language: 'yaml',
        code: `- stage: Prod
  dependsOn: Build
  jobs:
    - deployment: DeployProd
      environment: app-prod
      pool:
        vmImage: ubuntu-latest
      strategy:
        runOnce:
          deploy:
            steps:
              - script: ls $(Pipeline.Workspace)/drop
              - script: echo "Deploying to production"`,
      },
      {
        title: 'Checks on the environment',
        language: 'text',
        code: `Pipelines > Environments > app-prod > ... > Approvals and checks
  + Approvals: Approvers = Release Approvers, uncheck "Allow approvers to approve their own runs"
  + Branch control: Allowed branches = refs/heads/main`,
      },
    ],
    explanation:
      'Approvals and branch control are checks owned by the environment, not YAML keywords. The deployment job references the environment, so every run must pass both checks before the Prod stage starts.',
  },
  {
    id: 'az4q-ppb-14',
    domainId: 'az4-pipelines',
    topicId: 'az4-iac-pipelines',
    kind: 'mcq',
    category: 'concept',
    difficulty: 'intermediate',
    points: 2,
    prompt:
      'Reviewers of a pull request that changes Bicep files want the pipeline to show which Azure resources would be created, modified or deleted, without changing anything. Which command should the PR pipeline run?',
    options: [
      { id: 'a', text: 'az deployment group validate' },
      { id: 'b', text: 'az deployment group what-if' },
      { id: 'c', text: 'az bicep build' },
      { id: 'd', text: 'az deployment group create --mode Complete' },
    ],
    correct: ['b'],
    explanation:
      'what-if compares the template with live resources and lists each Create, Modify, Delete and NoChange. validate only checks that Resource Manager would accept the template, bicep build compiles to ARM JSON locally, and a Complete mode create actually deploys and can delete resources.',
  },
  {
    id: 'az4q-ppb-15',
    domainId: 'az4-pipelines',
    topicId: 'az4-iac-pipelines',
    kind: 'multi',
    category: 'concept',
    difficulty: 'advanced',
    points: 2,
    prompt:
      'You are designing Terraform deployments to Azure from Azure Pipelines for several teams. Which practices should you adopt? (Select all that apply.)',
    options: [
      {
        id: 'a',
        text: 'Store state in an azurerm backend in Azure Storage, which locks state with blob leases',
      },
      {
        id: 'b',
        text: 'Save the plan with terraform plan -out and apply that exact plan file after approval',
      },
      { id: 'c', text: 'Commit terraform.tfstate to the repository so reviewers can see it' },
      {
        id: 'd',
        text: 'Use a service connection with workload identity federation instead of a client secret',
      },
      {
        id: 'e',
        text: 'Run terraform apply -auto-approve on every pull request to test the change',
      },
    ],
    correct: ['a', 'b', 'd'],
    explanation:
      'A locked remote backend, applying the reviewed plan file and secretless workload identity federation are the recommended pattern. State can contain secrets and must never be committed. Applying on every pull request changes real infrastructure before review; PRs should run plan only.',
  },
  {
    id: 'az4q-ppb-16',
    domainId: 'az4-pipelines',
    topicId: 'az4-iac-pipelines',
    kind: 'mcq',
    category: 'concept',
    difficulty: 'advanced',
    points: 2,
    prompt:
      'Developers need to create short-lived test environments from templates approved by the platform team, in subscriptions where they have no direct role assignments. Which Azure service meets this?',
    options: [
      { id: 'a', text: 'Azure Deployment Environments' },
      { id: 'b', text: 'Azure Automation State Configuration' },
      { id: 'c', text: 'Azure Blueprints' },
      { id: 'd', text: 'Azure Machine Configuration' },
    ],
    correct: ['a'],
    explanation:
      'Azure Deployment Environments lets developers create environments from catalog definitions, with environment types mapping projects to subscriptions and deployment identities. Automation State Configuration and Machine Configuration manage configuration inside machines, and Azure Blueprints is deprecated in favour of template specs and deployment stacks and was never a developer self-service tool.',
  },
  {
    id: 'az4q-ppb-17',
    domainId: 'az4-pipelines',
    topicId: 'az4-iac-pipelines',
    kind: 'task',
    category: 'lab',
    difficulty: 'advanced',
    points: 2,
    prompt:
      'Write a GitHub Actions workflow that runs terraform plan for pull requests touching infra/, authenticating to Azure with OIDC and no stored client secret.',
    context:
      'A federated credential for pull requests exists on an Entra ID app registration, and repository variables AZURE_CLIENT_ID, AZURE_TENANT_ID and AZURE_SUBSCRIPTION_ID are set. The backend block has use_oidc = true.',
    checkpoints: [
      { id: 'c1', text: 'The workflow triggers on pull_request with a paths filter for infra/**' },
      { id: 'c2', text: 'permissions includes id-token: write' },
      {
        id: 'c3',
        text: 'ARM_CLIENT_ID, ARM_TENANT_ID, ARM_SUBSCRIPTION_ID and ARM_USE_OIDC are set without any client secret',
      },
      { id: 'c4', text: 'The job runs terraform init, validate and plan' },
    ],
    solution: [
      {
        title: '.github/workflows/tf-plan.yml',
        language: 'yaml',
        code: `name: tf-plan
on:
  pull_request:
    paths: ['infra/**']

permissions:
  id-token: write
  contents: read

env:
  ARM_CLIENT_ID: \${{ vars.AZURE_CLIENT_ID }}
  ARM_TENANT_ID: \${{ vars.AZURE_TENANT_ID }}
  ARM_SUBSCRIPTION_ID: \${{ vars.AZURE_SUBSCRIPTION_ID }}
  ARM_USE_OIDC: 'true'

jobs:
  plan:
    runs-on: ubuntu-latest
    defaults:
      run:
        working-directory: infra
    steps:
      - uses: actions/checkout@v4
      - uses: hashicorp/setup-terraform@v3
      - run: terraform init -input=false
      - run: terraform validate
      - run: terraform plan -input=false -no-color`,
      },
    ],
    explanation:
      'The id-token permission lets the job request a GitHub OIDC token, and ARM_USE_OIDC tells the azurerm provider and backend to exchange it with Entra ID for an access token, so no secret is stored.',
  },
  {
    id: 'az4q-ppb-18',
    domainId: 'az4-pipelines',
    topicId: 'az4-pipeline-maintenance',
    kind: 'mcq',
    category: 'yaml',
    difficulty: 'intermediate',
    points: 2,
    prompt:
      'A Node.js pipeline spends most of its time in npm ci. Which Cache@2 key gives the best reuse while still refreshing when dependencies change?',
    options: [
      { id: 'a', text: 'key: \'npm | "$(Agent.OS)" | package-lock.json\'' },
      { id: 'b', text: "key: 'npm | $(Build.BuildId)'" },
      { id: 'c', text: "key: 'npm'" },
      { id: 'd', text: "key: 'npm | $(Build.SourceVersion)'" },
    ],
    correct: ['a'],
    explanation:
      'Hashing package-lock.json changes the key only when dependencies change, and including the OS avoids restoring binaries built for another platform. BuildId and SourceVersion change on every run so the cache never hits, and a constant key never refreshes when dependencies change.',
  },
  {
    id: 'az4q-ppb-19',
    domainId: 'az4-pipelines',
    topicId: 'az4-pipeline-maintenance',
    kind: 'multi',
    category: 'concept',
    difficulty: 'intermediate',
    points: 2,
    prompt:
      'Your organisation wants to reduce Azure Pipelines and GitHub Actions consumption without lowering quality. Which changes help? (Select all that apply.)',
    options: [
      {
        id: 'a',
        text: 'Add path filters so documentation-only changes do not trigger full builds',
      },
      { id: 'b', text: 'Use concurrency groups with cancel-in-progress in GitHub workflows' },
      { id: 'c', text: 'Set batch: true on busy CI triggers in Azure Pipelines' },
      { id: 'd', text: 'Disable test publishing so runs finish sooner' },
      { id: 'e', text: 'Cache package dependencies between runs' },
    ],
    correct: ['a', 'b', 'c', 'e'],
    explanation:
      'Path filters, cancelling superseded runs, batching commits and caching all remove wasted work. Disabling test result publishing saves seconds but removes visibility into failures and flaky tests, which lowers quality.',
  },
  {
    id: 'az4q-ppb-20',
    domainId: 'az4-pipelines',
    topicId: 'az4-pipeline-maintenance',
    kind: 'mcq',
    category: 'concept',
    difficulty: 'intermediate',
    points: 2,
    prompt:
      'The project retention policy deletes pipeline runs after 30 days, but compliance requires that every production deployment run is kept for one year. What should you do?',
    options: [
      { id: 'a', text: 'Raise the project retention to 365 days for all pipelines' },
      { id: 'b', text: 'Add a retention lease of 365 days to each production run' },
      { id: 'c', text: 'Download all logs to a storage account manually each month' },
      { id: 'd', text: 'Disable the retention policy for the project' },
    ],
    correct: ['b'],
    explanation:
      'Retention leases keep specific runs beyond the policy while everything else is still cleaned up. Raising or disabling retention for everything keeps every PR and CI run too, wasting storage, and manual exports are error-prone and not tied to the run record.',
  },
  {
    id: 'az4q-ppb-21',
    domainId: 'az4-pipelines',
    topicId: 'az4-pipeline-maintenance',
    kind: 'command',
    category: 'command',
    difficulty: 'beginner',
    points: 1,
    prompt:
      'Using the GitHub CLI, rerun only the failed jobs of workflow run 123456789 in the current repository.',
    acceptedAnswers: ['gh run rerun 123456789 --failed', 'gh run rerun --failed 123456789'],
    answerHint: 'gh run ...',
    explanation:
      'gh run rerun with --failed reruns only jobs that failed. If the same job keeps passing on rerun without code changes, treat it as a flaky test to fix rather than a habit.',
  },
]
