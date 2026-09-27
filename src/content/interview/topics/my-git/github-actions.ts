import type { InterviewQuestion } from '../../../types'

/** GitHub Actions workflows, cross-repo triggers, projects and troubleshooting. */
export const myGithubActionsQuestions: InterviewQuestion[] = [
  {
    id: 'itv-mygit-24',
    level: 'basic',
    kind: 'open',
    prompt: 'What are GitHub Actions?',
    probing:
      'Whether you can explain events, workflows, jobs, runners and steps, and the production defaults.',
    answer: [
      "GitHub Actions is GitHub's built-in automation platform, and it's event-driven. A workflow is a YAML file stored in `.github/workflows`. Events trigger workflows. Workflows contain jobs. Jobs run on runners. Each job has steps that run commands or reusable actions.",
      'Actions can run CI/CD, scheduled maintenance, issue automation, releases, security scans, and infrastructure workflows. GitHub-hosted runners are convenient and short-lived, spun up fresh for each job. Self-hosted runners are useful when you need private network access or special software, but you have to patch them, isolate them, scale them, and clean them up yourself.',
      'For production, I keep `permissions` scoped to the minimum needed — least privilege. I use protected environments, OIDC federation instead of long-lived cloud keys, actions pinned to trusted versions, concurrency controls, timeouts, artifact retention, and branch protection for workflow files.',
      'GitHub Actions is a CI/CD platform built into GitHub. It runs **workflows**, which are YAML files stored in `.github/workflows/`. A workflow starts when an event happens, such as a push, a pull request, a schedule, or a manual trigger.',
      'A workflow contains **jobs**, and each job runs on a runner. A job is made up of **steps**, and steps can use reusable **actions** from the Marketplace.',
      'GitHub Actions offers hosted or self-hosted runners, secrets management, matrix builds, and reusable or composite workflows.',
      "GitHub Actions is GitHub's built-in, event-driven automation platform. Workflow YAML files live under `.github/workflows/`.",
      'Events such as `push`, `pull_request`, `workflow_dispatch`, schedules, releases, or a repository dispatch create workflow runs. A workflow contains jobs. Each job runs on a GitHub-hosted or self-hosted runner and contains ordered steps that execute commands or reusable actions.',
      '**A typical flow looks like this:**',
      "1. A developer pushes a commit or opens a pull request.\n2. GitHub checks the workflow's event, branch, and path filters.\n3. A runner checks out the exact commit and runs the build, test, scan, and packaging jobs.\n4. Artifacts or a container digest are published. The digest is immutable, meaning it never changes once it's created.\n5. Protected environments apply reviewers, branch restrictions, and scoped secrets before deployment.\n6. The workflow deploys to a VM, Kubernetes, or a cloud target, then reports status and sends notifications.",
      'Some good defaults for production: keep `permissions` scoped to the minimum needed (least privilege), pin third-party actions to trusted, immutable commit SHAs, prefer OIDC federation over long-lived cloud keys, isolate self-hosted runners, protect environments, and keep untrusted pull requests away from deployment secrets.',
    ],
    tags: ['github actions', 'basics'],
  },
  {
    id: 'itv-mygit-25',
    level: 'basic',
    kind: 'open',
    prompt: 'What are the building blocks of a GitHub Actions workflow?',
    probing: 'Whether you know the workflow building blocks and why pinning and npm ci matter.',
    answer: [
      '- **Event**: Triggers a workflow — for example `push`, `pull_request`, `workflow_dispatch`, or `schedule`\n- **Job**: Runs on its own runner; jobs run in parallel unless `needs` sets a dependency\n- **Step**: Runs sequentially inside a job; each step runs a shell command or an action\n- **Action**: A reusable, packaged automation unit\n- **Runner**: The execution environment — GitHub-hosted or self-hosted',
      "Version tags keep this example readable, but production workflows should pin third-party and reusable actions to reviewed, full commit SHAs, and use dependency automation to update them safely. `npm ci` honors the committed lock file, so it's more reproducible in CI than `npm install`.",
    ],
    code: [
      {
        title: 'Basic Node.js CI workflow',
        language: 'yaml',
        code: `name: CI

on:
  pull_request:
  push:
    branches: [main]

permissions:
  contents: read

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - name: Check out source
        uses: actions/checkout@v6

      - name: Set up Node.js
        uses: actions/setup-node@v6
        with:
          node-version-file: .nvmrc
          cache: npm

      - name: Install locked dependencies
        run: npm ci

      - name: Run tests
        run: npm test`,
      },
    ],
    tags: ['github actions', 'workflow', 'building blocks'],
  },
  {
    id: 'itv-mygit-26',
    level: 'intermediate',
    kind: 'open',
    prompt: 'How do you create a GitHub Actions workflow?',
    probing:
      'Whether you can write a workflow with explicit permissions, concurrency and pinned actions, then extend it for deploys.',
    answer: [
      'I start by figuring out the triggering event and the outcome I need. Then I split independent work into separate jobs and make deployment depend on CI passing first.',
      'I validate the YAML, pin the actions, set explicit permissions and timeouts, cache only dependencies that are safe to cache, and make sure secrets never get printed to logs. A pull request tests the workflow before it merges.',
      'For deployment, I add an environment that requires approval, OIDC authentication, a versioned artifact, smoke tests, health monitoring, and a rollback plan.',
    ],
    code: [
      {
        title: 'CI workflow with permissions and concurrency',
        language: 'yaml',
        code: `name: application-ci

on:
  pull_request:
  push:
    branches: [main]

permissions:
  contents: read

concurrency:
  group: ci-\${{ github.ref }}
  cancel-in-progress: true

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
      - run: npm test`,
      },
      {
        title: 'Workflow with OIDC login to AWS',
        language: 'yaml',
        code: `name: ci
on:
  push: { branches: [main] }
  pull_request:
jobs:
  build:
    runs-on: ubuntu-latest
    permissions: { id-token: write, contents: read }   # OIDC for keyless AWS auth
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 20, cache: npm }
      - run: npm ci
      - run: npm test
      - name: Configure AWS (OIDC)
        uses: aws-actions/configure-aws-credentials@v4
        with:
          role-to-assume: arn:aws:iam::123456789012:role/gha-deploy
          aws-region: us-east-1
      - run: ./deploy.sh`,
      },
    ],
    tags: ['github actions', 'workflow'],
  },
  {
    id: 'itv-mygit-27',
    level: 'intermediate',
    kind: 'open',
    prompt: 'What does a production GitHub Actions CI/CD workflow typically run?',
    probing:
      'Whether you know the usual ordered steps of a production workflow and the role of matrices and reusable workflows.',
    answer: [
      'A production workflow commonly runs, in order: checkout, language/tool setup, dependency caching, build, unit tests, test-report upload, code and security checks, Docker build, registry login through short-lived identity, image push by digest, deployment, rollout verification, and notification.',
      'Matrices test multiple supported versions at once. Reusable workflows keep multiple pipelines in sync and prevent copy-paste drift.',
    ],
    tags: ['github actions', 'ci/cd', 'pattern'],
  },
  {
    id: 'itv-mygit-28',
    level: 'basic',
    kind: 'open',
    prompt: 'Why is GitHub Actions popular and gaining ground?',
    probing:
      'Whether you can explain why GitHub Actions is popular and also name its real trade-offs.',
    answer: [
      "It's popular because the automation lives right next to the code. It reacts directly to GitHub events, has a huge ecosystem of ready-made actions, supports both hosted and self-hosted runners, and integrates well with pull requests, environments, releases, packages, and GitHub's security features.",
      "There are trade-offs, though. Hosted runners can't reach private systems without extra networking. Usage costs can add up. Untrusted marketplace actions carry supply-chain risk. Self-hosted runners need strong isolation and ongoing maintenance.",
      "I choose GitHub Actions when the source already lives in GitHub and the workflow fits its security and runner model. I'd consider Jenkins, Azure Pipelines, GitLab CI, or a dedicated deployment controller instead when customization needs, network placement, governance, or existing platform investment point that way.",
      "It's built into GitHub, so there's no extra server to run. The pipeline config lives with the code as YAML, so it's versioned and reviewed through pull requests. It has a huge marketplace of reusable actions and generous hosted runners, and matrix builds are easy to set up. It needs far less maintenance than running Jenkins yourself, and it supports OIDC, so cloud login doesn't need long-lived keys. For teams already on GitHub, this lowers the barrier to CI/CD a lot.",
    ],
    tags: ['github actions', 'trade-offs'],
  },
  {
    id: 'itv-mygit-29',
    level: 'intermediate',
    kind: 'open',
    prompt: 'How are SonarQube, Docker, and Trivy integrated in pipelines?',
    probing:
      'Whether you place SonarQube and Trivy before publishing and fail the job on findings.',
    answer: [
      'I place quality and security checks before an image is published or deployed:',
      'SonarQube checks source code quality and test coverage. Trivy checks the built image and its dependencies. I pin action versions to approved releases, set up a vulnerability exception process with an expiry date, upload scan reports even when a job fails, and never push or deploy an image if a required gate fails.',
    ],
    code: [
      {
        title: 'Quality and security order',
        language: 'text',
        code: `checkout → test → SonarQube → quality gate → Docker build
         → Trivy scan → push immutable image → deploy → smoke test`,
      },
      {
        title: 'Workflow: test, SonarQube, build, Trivy',
        language: 'yaml',
        code: `jobs:
  build:
    runs-on: ubuntu-latest
    permissions:
      contents: read
    steps:
      - uses: actions/checkout@v4
      - name: Test
        run: npm ci && npm test -- --coverage
      - name: SonarQube scan
        uses: SonarSource/sonarqube-scan-action@v3
        env:
          SONAR_TOKEN: \${{ secrets.SONAR_TOKEN }}
          SONAR_HOST_URL: \${{ secrets.SONAR_HOST_URL }}
      - name: Build image
        run: docker build -t app:\${{ github.sha }} .
      - name: Scan image
        uses: aquasecurity/trivy-action@master
        with:
          image-ref: app:\${{ github.sha }}
          severity: HIGH,CRITICAL
          exit-code: "1"`,
      },
    ],
    tags: ['github actions', 'sonarqube', 'trivy'],
  },
  {
    id: 'itv-mygit-30',
    level: 'advanced',
    kind: 'open',
    prompt: 'How do you trigger a GitHub Actions workflow in another repository?',
    probing:
      'Whether you trigger another repo safely with a narrow token, metadata-only payload and idempotency.',
    answer: [
      'The best approach depends on who owns each repository. For loosely coupled systems, I prefer publishing a versioned artifact or image and letting the consumer repository detect or promote that version on its own.',
      'When a direct trigger is needed, common options are `repository_dispatch`, calling `workflow_dispatch` through the API, or a reusable workflow — that last one works when repositories share an organization and a trust model.',
      'The caller needs permission to invoke the target repository. I prefer a GitHub App token with narrow, short-lived access over a broad personal access token.',
      'The payload should only carry identifiers, like a version number and source commit, never secrets. The target repository validates the sender, checks the artifact exists, and confirms the environment is allowed before it deploys.',
      "I also add concurrency control, make the workflow idempotent, meaning safe to run more than once, keep audit logs, and attach a correlation ID. That way duplicate requests can't deploy twice, and both workflow runs stay traceable.",
    ],
    followUps: [
      'When is publishing a versioned artifact better than a direct trigger?',
      'How do you stop a duplicate dispatch from deploying twice?',
    ],
    tags: ['github actions', 'cross-repo'],
  },
  {
    id: 'itv-mygit-31',
    level: 'intermediate',
    kind: 'open',
    prompt: 'What is the purpose of `repository_dispatch` in GitHub Actions?',
    probing:
      'Whether you know what repository_dispatch is, how the receiver validates it, and its payload limits.',
    answer: [
      '`repository_dispatch` is a custom event sent through the GitHub API. It lets an external system or another repository start a workflow and pass a small JSON payload.',
      'I use it for controlled cross-repository orchestration, not as an open production deployment endpoint. The sender needs the right repository permission. The receiver validates the event type and payload. Environment protection still controls what reaches production.',
      'GitHub limits how big the payload can be, so artifacts stay in a registry or artifact store. The event itself carries only metadata.',
    ],
    code: [
      {
        title: 'Workflow triggered by repository_dispatch',
        language: 'yaml',
        code: `on:
  repository_dispatch:
    types: [deploy-version]

jobs:
  deploy:
    if: github.event.client_payload.environment == 'staging'
    runs-on: ubuntu-latest
    steps:
      - run: echo "Deploying \${{ github.event.client_payload.version }}"`,
      },
    ],
    tags: ['github actions', 'repository_dispatch'],
  },
  {
    id: 'itv-mygit-32',
    level: 'advanced',
    kind: 'open',
    prompt: 'How would you trigger a CI/CD pipeline in Repo A from changes in Repo B?',
    probing:
      'Whether you can design a one-way, validated cross-repo trigger and know when a bot PR is safer.',
    answer: [
      'Say Repo B builds a shared library and Repo A deploys an application. My preferred flow is:',
      '1. Repo B tests and publishes an immutable library or image version.\n2. Repo B authenticates with a GitHub App token.\n3. It sends a dispatch event to Repo A with the version, source commit, and correlation ID.\n4. Repo A checks that the version exists and is approved.\n5. Repo A runs its own tests and gets environment approval before deploying.',
      'I prevent loops by defining one-way ownership, add concurrency control per environment, and keep the workflow idempotent.',
      'If Repo A only needs a dependency update, a pull request from Dependabot or an update bot is often safer. It goes through normal review instead of triggering a deployment directly.',
    ],
    code: [
      {
        title: 'Send a dispatch event with gh api',
        language: 'bash',
        code: `gh api --method POST repos/company/repo-a/dispatches \\
  -f event_type=dependency-released \\
  -F 'client_payload[version]=2.3.1' \\
  -F 'client_payload[source_sha]=abc123'`,
      },
    ],
    followUps: [
      'How do you prevent trigger loops between the two repositories?',
      'Why might a Dependabot PR be safer than a direct trigger?',
    ],
    tags: ['github actions', 'cross-repo', 'dispatch'],
  },
  {
    id: 'itv-mygit-33',
    level: 'advanced',
    kind: 'open',
    prompt: 'Explain your end-to-end GitHub Actions, Terraform, EKS and Kubernetes project.',
    probing:
      'Whether you can explain a real GitHub Actions + Terraform + EKS project and how you troubleshoot it.',
    answer: [
      '**The architecture of the project:**',
      "- Modular Terraform provisions a VPC, public/private subnets, routes, security controls, IAM roles, and an EKS cluster.\n- Terraform state uses a remote backend that is encrypted, versioned, and locked. Production applies need approval and use short-lived identity.\n- A Node.js application is built into a small container image. It's published with a commit-SHA tag or digest, so the image is immutable, meaning it never changes after it's created. That way the exact image that gets tested is the one that gets deployed.\n- Kubernetes manifests use Kustomize overlays for environment differences and define Deployments, Services, Ingress, probes, and resource limits.\n- Prometheus and Grafana provide cluster and application monitoring.",
      '**GitHub Actions flow:**',
      'The workflow uses GitHub OIDC federation instead of stored cloud access keys. Third-party actions are pinned to trusted versions or commit SHAs. Production environments are restricted, and untrusted pull requests never get deployment credentials. The image that gets tested is the same image that gets deployed.',
      'When something fails, I check the first failed job, then the runner and action version, OIDC claims and IAM trust, registry authentication, the Terraform plan and state, EKS endpoint connectivity, Kubernetes events, Ingress health, and monitoring dashboards.',
      "I only retry a job when it's idempotent, meaning safe to run more than once, and when I know the underlying cause was temporary.",
    ],
    code: [
      {
        title: 'GitHub Actions flow',
        language: 'text',
        code: `pull request → lint/test → Terraform and manifest validation → security scans
merge → build image → Trivy scan → sign/publish digest
      → update/deploy desired state → rollout and application verification`,
      },
    ],
    followUps: [
      'How does GitHub OIDC federation to AWS work?',
      'Why pin third-party actions to commit SHAs?',
    ],
    tags: ['github actions', 'terraform', 'eks', 'project'],
  },
  {
    id: 'itv-mygit-34',
    level: 'intermediate',
    kind: 'open',
    prompt: 'How do you hand off from GitHub Actions CI to Azure DevOps CD?',
    probing:
      'Whether you hand off an immutable, traceable artifact from GitHub Actions to Azure DevOps without rebuilding.',
    answer: [
      'When GitHub Actions handles CI and Azure DevOps handles CD, GitHub Actions publishes a versioned package or an immutable ACR image digest, along with provenance (where the artifact came from and how it was built) and scan evidence.',
      'Azure DevOps consumes and promotes that same artifact through protected environments — it should not rebuild the application.',
      'Prefer GitHub OIDC to obtain short-lived Azure credentials, grant that identity only the ACR publishing permissions it needs, and protect the production Azure DevOps environment with resource permissions, branch control, approvals, and checks.',
      "If Azure Pipelines already connects directly to GitHub and can own the whole workflow, it's worth comparing that simpler design before committing to a cross-platform handoff.",
    ],
    tags: ['github actions', 'azure devops', 'handoff'],
  },
  {
    id: 'itv-mygit-35',
    level: 'intermediate',
    kind: 'scenario',
    prompt: 'What are the common GitHub Actions failures, and how do you troubleshoot them?',
    probing: 'Whether you know the common GitHub Actions failure classes and where to look first.',
    answer: [
      '- **Workflow not triggered**: Wrong event, branch/path filter, file path, YAML syntax, or Actions disabled\n- **Step failure**: Nonzero exit code, missing dependency, wrong working directory, bad input, or wrong shell\n- **Checkout/permission failure**: Token scope, private repo access, wrong ref, proxy/network issue, or submodule credentials\n- **Missing secret/variable**: Wrong scope or context (`secrets`, `vars`, `env`), environment not selected, or secret unavailable to forks\n- **Action/dependency/cache failure**: Invalid version, removed action, wrong cache key/path, quota, corruption, or proxy\n- **Artifact/registry failure**: Wrong path/name, retention expired, authentication, repository policy, or image tag\n- **Deployment/runner timeout**: Missing approval, wrong environment, resource limits, queue capacity, or no runner available',
      "Start troubleshooting with the workflow syntax, event delivery, the first failed step, effective permissions, runner logs, repository/environment configuration, and GitHub's service status. Add debug output carefully, and never expose secrets in it.",
    ],
    tags: ['github actions', 'troubleshooting'],
  },
]
