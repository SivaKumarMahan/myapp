import type { Topic } from '../../../../types'

export const az4EnvironmentsApprovals: Topic = {
  id: 'az4-environments-approvals',
  title: 'Environments, approvals, checks and deployment jobs',
  domainId: 'az4-pipelines',
  difficulty: 'intermediate',
  estimatedMinutes: 30,
  order: 8,
  tags: [
    'environments',
    'approvals',
    'checks',
    'gates',
    'deployment jobs',
    'github environments',
    'release pipelines',
  ],
  oneLiner:
    'Put a guard on every production deployment: named environments with approvals, automated checks and a full deployment history, in Azure Pipelines and GitHub Actions.',
  explanation: [
    'An **environment** in Azure Pipelines is a named deployment target such as `orders-dev` or `orders-prod`. It is more than a label: it records every deployment made to it (which run, which commits, which work items), it can contain **resources** (Kubernetes namespaces or virtual machines registered with an agent), and it is the place where you attach **approvals and checks**.',
    'A pipeline targets an environment with a **deployment job** (`- deployment:` instead of `- job:`) and the `environment:` keyword. When the run reaches that job, Azure Pipelines evaluates every check configured on the environment before the job starts. The job waits, visibly, until all checks pass or one of them fails or times out.',
    'Checks are defined by the **resource owner**, not by the pipeline author. That is the key design idea: the person who owns production decides the rules, and a developer cannot remove them by editing YAML. Available checks include **Approvals**, **Branch control**, **Business hours**, **Invoke Azure Function**, **Invoke REST API**, **Query Azure Monitor alerts**, **Required template**, **Evaluate artifact** and **Exclusive lock**. The same checks can also be placed on service connections, agent pools, variable groups, secure files and repositories.',
    'GitHub has the same idea. A **GitHub environment** belongs to a repository and can have **required reviewers**, a **wait timer**, **deployment branch and tag rules**, **custom deployment protection rules** (implemented by GitHub Apps, for example to query a monitoring system) and its own **environment secrets and variables** that only jobs targeting that environment can read.',
    'Before YAML, Azure DevOps used **classic release pipelines**: a visual designer with stages, **pre-deployment and post-deployment approvals**, and **gates** that sample an Azure Monitor query, a REST API or work item query until they succeed. Classic releases still exist and still appear on the exam, but new work should use YAML multi-stage pipelines with environments, where checks play the role of gates.',
  ],
  whyItMatters: [
    'AZ-400 asks you to design release pipelines with the right controls: "implement approvals and checks", "design quality and release gates", and configure GitHub environment protection. Questions describe a governance requirement and ask which check or rule satisfies it.',
    'Approvals and checks are the auditable control point in a CI/CD system. Auditors want to know who approved which change into production and whether it passed the required gates; environments record exactly that.',
    'Automated checks catch problems humans miss. A Query Azure Monitor alerts check that blocks deployment while production alerts are firing prevents you from piling a new release on top of an ongoing incident.',
  ],
  howItWorks: [
    'Create an environment in Pipelines > Environments, or let the first YAML run that references it create it automatically (auto-created environments have no checks until you add them). Resources can be added: a Kubernetes namespace (AKS or any cluster) or virtual machines that run a registration script and appear as targets for rolling deployments.',
    'Add checks from the environment page (three-dot menu, Approvals and checks). Each check has a timeout; approvals can require any one or all listed approvers, can forbid the person who queued the run from approving, and can include instructions.',
    'When a stage containing a deployment job to that environment is about to start, Azure Pipelines evaluates all checks for all protected resources that the stage uses. Checks run in a defined order: static checks such as branch control and required template first, then approvals, then dynamic checks such as Invoke REST API, which can be retried on an interval until they pass or time out.',
    'The **Exclusive lock** check ensures only one run deploys to the resource at a time. The YAML side can set `lockBehavior: sequential` (queue every run in order) or `lockBehavior: runLatest` (cancel older waiting runs and only deploy the newest).',
    'Once checks pass, the deployment job runs its strategy (runOnce, rolling or canary) and its **lifecycle hooks**: `preDeploy`, `deploy`, `routeTraffic`, `postRouteTraffic`, `on: failure` and `on: success`. Deployment jobs do not check out source by default; they automatically download pipeline artifacts in each hook.',
    'In GitHub Actions a job opts in with `environment: production`. When the job is reached, GitHub applies the environment rules: branch or tag rules are checked, the wait timer starts, required reviewers are notified (up to six people or teams can be listed and one approval is enough), and only then does the job receive the environment secrets.',
  ],
  diagrams: [
    {
      kind: 'sequence',
      title: 'A deployment job waiting on checks',
      caption:
        'The pipeline cannot skip the checks: they belong to the environment, and the deployment job only starts once every check has passed.',
      participants: [
        { id: 'run', label: 'Pipeline run' },
        { id: 'env', label: 'Environment' },
        { id: 'approver', label: 'Approver' },
        { id: 'agent', label: 'Agent' },
      ],
      messages: [
        { from: 'run', to: 'env', label: 'Stage requests orders-prod' },
        { from: 'env', to: 'run', label: 'Branch control passed', kind: 'return' },
        { from: 'env', to: 'approver', label: 'Approval requested' },
        { from: 'approver', to: 'env', label: 'Approved with comment', kind: 'return' },
        { from: 'env', to: 'run', label: 'All checks passed', kind: 'return' },
        { from: 'run', to: 'agent', label: 'Run deployment job hooks' },
      ],
    },
    {
      kind: 'nested',
      title: 'Where protection is configured',
      caption:
        'Azure Pipelines hangs checks on protected resources; GitHub hangs protection rules on repository environments.',
      root: {
        label: 'Deployment controls',
        children: [
          {
            label: 'Azure Pipelines',
            tone: 'accent',
            children: [
              {
                label: 'Environment orders-prod',
                detail: 'Approvals, branch control, exclusive lock',
              },
              {
                label: 'Service connection',
                detail: 'Required template, business hours',
              },
              { label: 'Variable group, agent pool', detail: 'Approvals and checks too' },
            ],
          },
          {
            label: 'GitHub repository',
            tone: 'success',
            children: [
              {
                label: 'Environment production',
                detail: 'Reviewers, wait timer, branch rules',
              },
              { label: 'Environment secrets', detail: 'Released only after rules pass' },
            ],
          },
        ],
      },
    },
  ],
  keyObjects: [
    {
      kind: 'Azure Pipelines environment',
      purpose:
        'A named deployment target that holds resources, deployment history and the approvals and checks that guard it.',
      fields: [
        {
          path: 'environment: <name>[.<resource>]',
          meaning:
            'YAML reference from a deployment job. Adding .resource targets a specific Kubernetes namespace or VM resource.',
          required: true,
        },
        {
          path: 'Resources',
          meaning:
            'Kubernetes namespaces or registered virtual machines that the deployment job can target.',
        },
        {
          path: 'Approvals and checks',
          meaning:
            'Configured by the environment owner; evaluated before any stage that deploys to it.',
        },
        {
          path: 'Security (roles)',
          meaning:
            'Creator, Reader, User and Administrator roles decide who can use and manage it.',
        },
      ],
    },
    {
      kind: 'Check types',
      purpose: 'The controls that can gate use of a protected resource.',
      fields: [
        {
          path: 'Approvals',
          meaning: 'One or all named users or groups must approve; optional self-approval block.',
        },
        {
          path: 'Branch control',
          meaning: 'Only runs from allowed branches (for example refs/heads/main) may proceed.',
        },
        { path: 'Business hours', meaning: 'Deployments only start inside a defined time window.' },
        {
          path: 'Invoke REST API / Azure Function',
          meaning: 'Calls an external system and passes or fails on its response; can be retried.',
        },
        {
          path: 'Query Azure Monitor alerts',
          meaning: 'Passes only when no matching alerts are active.',
        },
        { path: 'Required template', meaning: 'The run must extend an approved YAML template.' },
        { path: 'Exclusive lock', meaning: 'Only one run at a time may use the resource.' },
      ],
    },
    {
      kind: 'GitHub environment',
      purpose:
        'Repository-level deployment target with protection rules, secrets and variables for jobs that reference it.',
      fields: [
        {
          path: 'required reviewers',
          meaning: 'Up to six users or teams; one approval releases the job.',
        },
        { path: 'wait timer', meaning: 'Delay in minutes before the job may start.' },
        {
          path: 'deployment branches and tags',
          meaning: 'All, protected branches only, or selected branch and tag patterns.',
        },
        {
          path: 'prevent self-review',
          meaning: 'The person who triggered the run cannot approve it.',
        },
        {
          path: 'custom protection rules',
          meaning: 'GitHub Apps that approve or reject based on external checks.',
        },
      ],
    },
  ],
  realWorldExample: {
    title: 'The hotfix that deployed during an outage',
    story: [
      'A payments team pushed a hotfix at 2am while a database failover alert was still active. The pipeline deployed happily, the new version could not reach the database, and the incident doubled in length.',
      'They added three checks to the `payments-prod` environment: **Branch control** allowing only `refs/heads/main` and `refs/heads/hotfix/*`, **Query Azure Monitor alerts** that fails while any Sev 0 or Sev 1 alert on the payments resource group is active, and an **Approvals** check requiring one person from the on-call group, with the run requester not allowed to approve.',
      'An **Exclusive lock** with `lockBehavior: runLatest` was added too, because two merges in quick succession had previously deployed out of order.',
      'The next night-time hotfix waited at the alerts check until the database recovered, then requested approval. The environment history now shows who approved each deployment, which also satisfied the audit team.',
    ],
  },
  yamlExamples: [
    {
      title: 'Multi-stage pipeline with deployment jobs and lifecycle hooks',
      language: 'yaml',
      explanation:
        'The Test stage deploys to orders-test and the Prod stage to orders-prod. Approvals live on the environments, not in this file. lockBehavior applies to the exclusive lock check.',
      code: `trigger:
  - main

lockBehavior: runLatest

stages:
  - stage: Build
    jobs:
      - job: Build
        pool:
          vmImage: ubuntu-latest
        steps:
          - script: dotnet publish -c Release -o $(Build.ArtifactStagingDirectory)
          - publish: $(Build.ArtifactStagingDirectory)
            artifact: drop

  - stage: Test
    dependsOn: Build
    jobs:
      - deployment: DeployTest
        environment: orders-test
        pool:
          vmImage: ubuntu-latest
        strategy:
          runOnce:
            deploy:
              steps:
                - script: echo "Deploying $(Pipeline.Workspace)/drop to test"

  - stage: Prod
    dependsOn: Test
    condition: and(succeeded(), eq(variables['Build.SourceBranch'], 'refs/heads/main'))
    jobs:
      - deployment: DeployProd
        environment: orders-prod
        pool:
          vmImage: ubuntu-latest
        strategy:
          runOnce:
            preDeploy:
              steps:
                - script: echo "Check database migrations are applied"
            deploy:
              steps:
                - script: echo "Deploy the drop artifact"
            postRouteTraffic:
              steps:
                - script: echo "Run smoke tests"
            on:
              failure:
                steps:
                  - script: echo "Roll back and page the on-call engineer"
              success:
                steps:
                  - script: echo "Post release notes"`,
    },
    {
      title: 'Rolling deployment to VM resources in an environment',
      language: 'yaml',
      explanation:
        'VMs registered in the environment and tagged web receive the deployment two at a time.',
      code: `jobs:
  - deployment: DeployWebFarm
    environment:
      name: shop-prod
      resourceType: VirtualMachine
      tags: web
    strategy:
      rolling:
        maxParallel: 2
        deploy:
          steps:
            - script: sudo systemctl restart shop-web
        routeTraffic:
          steps:
            - script: echo "Add this VM back to the load balancer pool"
        on:
          failure:
            steps:
              - script: echo "Remove this VM from rotation"`,
    },
    {
      title: 'GitHub Actions: staging then production environments',
      language: 'yaml',
      explanation:
        'The production job pauses until a required reviewer approves. Environment secrets for production are only available to that job.',
      code: `name: deploy
on:
  push:
    branches: [main]

permissions:
  id-token: write
  contents: read

jobs:
  staging:
    runs-on: ubuntu-latest
    environment:
      name: staging
      url: https://staging.contoso.example
    steps:
      - run: echo "Deploy to staging"

  production:
    needs: staging
    runs-on: ubuntu-latest
    environment:
      name: production
      url: https://www.contoso.example
    concurrency:
      group: production
      cancel-in-progress: false
    steps:
      - uses: azure/login@v2
        with:
          client-id: \${{ vars.AZURE_CLIENT_ID }}
          tenant-id: \${{ vars.AZURE_TENANT_ID }}
          subscription-id: \${{ vars.AZURE_SUBSCRIPTION_ID }}
      - run: echo "Deploy to production"`,
    },
  ],
  imperative: [
    {
      command:
        'az devops invoke --area distributedtask --resource environments --route-parameters project=<project> --http-method GET --api-version 7.1 -o json',
      what: 'Lists the environments in a project through the REST API, since there is no dedicated az pipelines environment command.',
      expected: 'A value array with the id and name of each environment.',
      placeholders: ['<project>'],
    },
    {
      command:
        'gh api --method PUT repos/<owner>/<repo>/environments/production --input production-env.json',
      what: 'Creates or updates a GitHub environment with reviewers, a wait timer and branch rules defined in a JSON body.',
      expected: 'JSON describing the environment and its protection_rules.',
      placeholders: ['<owner>', '<repo>'],
    },
    {
      command: 'gh secret set DB_PASSWORD --env production --repo <owner>/<repo>',
      what: 'Stores an environment secret that only jobs targeting the production environment can read. The value is prompted for, not typed on the command line.',
      placeholders: ['<owner>', '<repo>'],
    },
    {
      command:
        'gh variable set AZURE_CLIENT_ID --env production --body <clientId> --repo <owner>/<repo>',
      what: 'Stores a non-secret environment variable, such as the client id used for OIDC login.',
      placeholders: ['<clientId>', '<owner>', '<repo>'],
    },
  ],
  declarative: {
    steps: [
      'Manage environments and checks as code so they are reviewed like any other change.',
      'In Azure DevOps use the Terraform azuredevops provider: azuredevops_environment plus check resources.',
      'In GitHub use the Terraform github provider: github_repository_environment with reviewers and branch policy.',
      'Keep the approver groups in Microsoft Entra ID or GitHub teams, not individual people, so leave and join is automatic.',
    ],
    code: [
      {
        title: 'Terraform: Azure DevOps environment with approval, branch control and lock',
        language: 'hcl',
        code: `terraform {
  required_providers {
    azuredevops = {
      source  = "microsoft/azuredevops"
      version = "~> 1.0"
    }
  }
}

data "azuredevops_project" "orders" {
  name = "Orders"
}

data "azuredevops_group" "release_approvers" {
  project_id = data.azuredevops_project.orders.id
  name       = "Release Approvers"
}

resource "azuredevops_environment" "prod" {
  project_id  = data.azuredevops_project.orders.id
  name        = "orders-prod"
  description = "Production for the orders service"
}

resource "azuredevops_check_approval" "prod" {
  project_id            = data.azuredevops_project.orders.id
  target_resource_id    = azuredevops_environment.prod.id
  target_resource_type  = "environment"
  requester_can_approve = false
  approvers             = [data.azuredevops_group.release_approvers.origin_id]
  timeout               = 1440
}

resource "azuredevops_check_branch_control" "prod" {
  project_id           = data.azuredevops_project.orders.id
  display_name         = "Only main"
  target_resource_id   = azuredevops_environment.prod.id
  target_resource_type = "environment"
  allowed_branches     = "refs/heads/main"
}

resource "azuredevops_check_exclusive_lock" "prod" {
  project_id           = data.azuredevops_project.orders.id
  target_resource_id   = azuredevops_environment.prod.id
  target_resource_type = "environment"
}`,
      },
      {
        title: 'Terraform: GitHub environment with reviewers and branch policy',
        language: 'hcl',
        code: `data "github_team" "release" {
  slug = "release-approvers"
}

resource "github_repository_environment" "production" {
  repository          = "orders-api"
  environment         = "production"
  wait_timer          = 10
  prevent_self_review = true

  reviewers {
    teams = [data.github_team.release.id]
  }

  deployment_branch_policy {
    protected_branches     = true
    custom_branch_policies = false
  }
}`,
      },
      {
        title: 'production-env.json for gh api',
        language: 'json',
        code: `{
  "wait_timer": 10,
  "prevent_self_review": true,
  "reviewers": [{ "type": "Team", "id": 1234567 }],
  "deployment_branch_policy": {
    "protected_branches": true,
    "custom_branch_policies": false
  }
}`,
      },
    ],
  },
  verification: [
    {
      command: 'gh api repos/<owner>/<repo>/environments/production --jq ".protection_rules"',
      what: 'Shows the protection rules on a GitHub environment.',
      expected: 'Entries of type required_reviewers, wait_timer and branch_policy.',
      placeholders: ['<owner>', '<repo>'],
    },
    {
      command:
        'curl -s -u :$AZURE_DEVOPS_EXT_PAT "https://dev.azure.com/<org>/<project>/_apis/pipelines/checks/configurations?resourceType=environment&resourceId=<environmentId>&api-version=7.1-preview.1"',
      what: 'Lists the checks configured on an environment.',
      expected: 'One entry per check with its type name, for example Approval or Branch control.',
      placeholders: ['<org>', '<project>', '<environmentId>'],
    },
    {
      command: 'Pipelines > Environments > orders-prod > Deployments',
      what: 'The deployment history: every run, its commits and work items, and who approved it.',
    },
  ],
  troubleshooting: [
    {
      command: 'Run summary > stage > View checks',
      what: 'Shows which check a waiting stage is blocked on, with its status and timeout.',
      expected: 'For example "Approval: waiting for 1 of 1 approvers" or "Branch control: failed".',
    },
    {
      command: 'gh run view <runId> --repo <owner>/<repo>',
      what: 'Shows a GitHub run that is waiting for review and which environment is holding it.',
      expected: 'The job shows Waiting with the environment name.',
      placeholders: ['<runId>', '<owner>', '<repo>'],
    },
    {
      command: 'gh api repos/<owner>/<repo>/actions/runs/<runId>/pending_deployments',
      what: 'Lists pending deployments for a run and whether the current user is allowed to approve them.',
      expected:
        'current_user_can_approve false means you are not a listed reviewer or you triggered the run with self-review blocked.',
      placeholders: ['<owner>', '<repo>', '<runId>'],
    },
  ],
  commonMistakes: [
    'Using a normal `job:` instead of a `deployment:` job and expecting environment checks and deployment history. Only deployment jobs (and jobs that reference the environment) are tracked and gated.',
    'Relying on auto-created environments. They start with no checks at all, so the first production run deploys unguarded.',
    'Adding approvals in YAML. There is no approval keyword in the pipeline file; approvals belong to the resource so that pipeline authors cannot remove them. (ManualValidation in an agentless job is a pause, not a governance control.)',
    'Naming individual approvers instead of a group, so approvals stall when that person is on leave.',
    'In GitHub, storing production secrets as repository secrets instead of environment secrets, so any workflow job can read them without passing the protection rules.',
    'Assuming a Business hours or Invoke REST API check will be retried forever. Every check has a timeout, after which the stage fails.',
  ],
  examTips: [
    'Approvals and checks are configured on the **resource** (environment, service connection, agent pool, variable group, secure file, repository), never in the YAML file.',
    '"Deploy only from main" is the **Branch control** check. "Only during working hours" is **Business hours**. "Do not deploy while alerts fire" is **Query Azure Monitor alerts**. "Only one deployment at a time" is **Exclusive lock**.',
    'Classic release pipelines use **pre-deployment and post-deployment approvals and gates**; YAML pipelines use **environments with checks**. Know both names.',
    'GitHub environment protection rules: required reviewers, wait timer, deployment branches and tags, prevent self-review and custom protection rules via GitHub Apps.',
    'Deployment job lifecycle hooks: preDeploy, deploy, routeTraffic, postRouteTraffic, on failure, on success.',
    'Environment secrets in GitHub are released to a job only after the environment protection rules pass.',
  ],
  summary: [
    'Environments are named deployment targets with history, resources and checks.',
    'Checks are owned by the resource owner and evaluated before a stage starts.',
    'Deployment jobs run lifecycle hooks and download artifacts automatically.',
    'GitHub environments provide reviewers, wait timers, branch rules and scoped secrets.',
    'Classic release pipelines use approvals and gates; YAML uses environments and checks.',
    'Manage environments and checks as code with Terraform for reviewable governance.',
  ],
  practice: [
    {
      id: 'az4-environments-approvals-p1',
      level: 'beginner',
      prompt:
        'A developer asks where to add the approval step in azure-pipelines.yml before production. What do you tell them?',
      answer:
        'There is no approval step in the YAML. Add an Approvals check to the production environment (Pipelines > Environments > orders-prod > Approvals and checks) and target it from a deployment job.',
      explanation:
        'Checks belong to the resource so that the resource owner controls them and pipeline authors cannot remove them.',
    },
    {
      id: 'az4-environments-approvals-p2',
      level: 'intermediate',
      prompt:
        'Two runs of the same pipeline reach the production stage within a minute of each other. You only want the newest to deploy. What do you configure?',
      answer:
        'Add an Exclusive lock check to the production environment and set lockBehavior: runLatest in the pipeline, so older waiting runs are cancelled and only the latest deploys.',
      explanation: 'lockBehavior: sequential would instead deploy both, one after the other.',
    },
    {
      id: 'az4-environments-approvals-p3',
      level: 'intermediate',
      prompt:
        'In GitHub Actions, how do you make sure a production database password can only be read by a job that has passed a manual review?',
      answer:
        'Create a production environment with required reviewers, store the password as an environment secret on it, and set environment: production on the deployment job.',
      explanation:
        'Environment secrets are only released after the environment protection rules pass. Repository secrets are readable by any job.',
    },
    {
      id: 'az4-environments-approvals-p4',
      level: 'advanced',
      prompt:
        'A team wants a release to proceed automatically only when an external change-management system says the change ticket is approved. Which Azure Pipelines check fits?',
      answer:
        'An Invoke REST API check (or Invoke Azure Function) on the environment that calls the change system, passes on an approved response, and retries on an interval until the timeout.',
      explanation:
        'Dynamic checks call external systems; they replace the REST API gate of classic release pipelines.',
    },
  ],
  lab: {
    title: 'Guard a production environment in Azure Pipelines and GitHub',
    scenario:
      'Create an Azure Pipelines environment with approval and branch control checks, deploy to it from a multi-stage pipeline, then create an equivalent GitHub environment with a required reviewer.',
    prerequisites: [
      'An Azure DevOps project with a repository',
      'A GitHub repository you administer',
      'Azure CLI with the azure-devops extension and GitHub CLI',
    ],
    tasks: [
      { instruction: 'In Pipelines > Environments create environments lab-test and lab-prod.' },
      {
        instruction:
          'On lab-prod add an Approvals check naming yourself, and a Branch control check allowing refs/heads/main only.',
      },
      {
        instruction:
          'Commit a multi-stage pipeline with a Build stage and deployment jobs to lab-test and lab-prod, then run it.',
        hint: 'The prod stage should show Waiting with a Review button.',
      },
      { instruction: 'Approve the deployment and view the lab-prod deployment history.' },
      {
        instruction:
          'Run the pipeline from a feature branch and confirm the Branch control check fails the prod stage.',
      },
      {
        instruction:
          'In GitHub create an environment production with yourself as a required reviewer, add a workflow job that targets it, and approve the run.',
      },
    ],
    solution: [
      {
        title: 'azure-pipelines.yml',
        language: 'yaml',
        code: `trigger:
  - main

pool:
  vmImage: ubuntu-latest

stages:
  - stage: Build
    jobs:
      - job: Build
        steps:
          - script: echo "build" > $(Build.ArtifactStagingDirectory)/app.txt
          - publish: $(Build.ArtifactStagingDirectory)
            artifact: drop
  - stage: Test
    jobs:
      - deployment: DeployTest
        environment: lab-test
        strategy:
          runOnce:
            deploy:
              steps:
                - script: cat $(Pipeline.Workspace)/drop/app.txt
  - stage: Prod
    jobs:
      - deployment: DeployProd
        environment: lab-prod
        strategy:
          runOnce:
            deploy:
              steps:
                - script: echo "Deployed to prod"`,
      },
      {
        title: '.github/workflows/env-lab.yml',
        language: 'yaml',
        code: `name: env-lab
on: workflow_dispatch

jobs:
  deploy:
    runs-on: ubuntu-latest
    environment: production
    steps:
      - run: echo "Approved and deployed"`,
      },
      {
        title: 'GitHub environment via CLI',
        language: 'bash',
        code: `USER_ID=$(gh api user --jq .id)
gh api --method PUT repos/<owner>/<repo>/environments/production \\
  -F "reviewers[][type]=User" -F "reviewers[][id]=$USER_ID"
gh workflow run env-lab.yml --repo <owner>/<repo>`,
      },
    ],
    verification: [
      {
        command: 'az pipelines runs list --top 2 -o table',
        what: 'Shows the main branch run succeeded and the feature branch run failed at Prod.',
      },
      {
        command:
          'gh api repos/<owner>/<repo>/environments/production --jq ".protection_rules[].type"',
        what: 'Confirms the required reviewer rule is in place.',
        expected: 'required_reviewers',
        placeholders: ['<owner>', '<repo>'],
      },
    ],
    cleanup: [
      {
        command: 'gh api --method DELETE repos/<owner>/<repo>/environments/production',
        what: 'Deletes the GitHub environment.',
        placeholders: ['<owner>', '<repo>'],
      },
      {
        command:
          'Pipelines > Environments > lab-prod and lab-test > Delete; az pipelines delete --id <pipelineId> --yes',
        what: 'Deletes the Azure Pipelines environments and the lab pipeline.',
        placeholders: ['<pipelineId>'],
      },
    ],
  },
  relatedTopicIds: [
    'az4-deployment-strategies',
    'az4-pipeline-templates',
    'az4-yaml-pipelines',
    'az4-github-actions',
    'az4-pipeline-security',
  ],
  docs: [
    {
      title: 'Create and target an environment',
      url: 'https://learn.microsoft.com/azure/devops/pipelines/process/environments',
    },
    {
      title: 'Define approvals and checks',
      url: 'https://learn.microsoft.com/azure/devops/pipelines/process/approvals',
    },
    {
      title: 'Deployment jobs',
      url: 'https://learn.microsoft.com/azure/devops/pipelines/process/deployment-jobs',
    },
    {
      title: 'Managing environments for deployment (GitHub)',
      url: 'https://docs.github.com/actions/managing-workflow-runs-and-deployments/managing-deployments/managing-environments-for-deployment',
    },
    {
      title: 'Release gates and approvals (classic)',
      url: 'https://learn.microsoft.com/azure/devops/pipelines/release/approvals/',
    },
  ],
}
