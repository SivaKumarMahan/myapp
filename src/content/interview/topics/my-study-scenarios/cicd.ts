import type { InterviewQuestion } from '../../../types'

/** CI/CD scenarios: pipeline secrets, Jenkinsfile structure, Trivy gates, triggers, end-to-end flows and Helm rollback. */
export const myStudyScenariosCicdQuestions: InterviewQuestion[] = [
  {
    id: 'itv-mystsc-13',
    level: 'intermediate',
    kind: 'scenario',
    prompt:
      'Azure DevOps pipeline secret exposure: what is wrong with this pipeline, and how would you redesign it?',
    promptCode: [
      {
        title: 'The pipeline',
        language: 'yaml',
        code: `variables:
  DB_USER: "admin"
  DB_PASSWORD: "<hardcoded-password>"
  API_KEY: "<hardcoded-api-key>"

steps:
- script: |
    echo "Deploying application"
    echo "DB Password: $(DB_PASSWORD)"
    echo "API Key: $(API_KEY)"`,
      },
    ],
    probing:
      'Whether you spot both hardcoded secrets and secrets echoed to logs, and know Key Vault-linked variable groups.',
    answer: [
      '**What is wrong with this pipeline**',
      "1. **Secrets are hardcoded in plain text** directly in the YAML, which is normally stored in source control — anyone with repo read access can see the real password and API key.\n2. **Secrets are printed to the build log** via `echo`. Even if these were pipeline secret variables, Azure DevOps only masks variables it knows are secret — and even then, log masking can be bypassed (e.g., by echoing partial characters), so printing secrets is a bad practice regardless.\n3. Non-secret variables like `DB_USER` don't need protecting, but `DB_PASSWORD` and `API_KEY` clearly do and are treated the same as any other plain variable here.",
      '**How to redesign it**',
      '- Store secrets in an **Azure Key Vault** and link them into the pipeline via a variable group, or mark them as **secret variables** in the pipeline UI/library (never in the YAML file itself).\n- Never `echo` a secret value, even for debugging.',
      'The script receives the secrets as environment variables at runtime without ever printing or committing them.',
      '**Short interview answer**\n"There are two problems: real secrets are hardcoded directly in version-controlled YAML, and the script prints them to the build log where anyone with log access can read them. I\'d move the secrets into Azure Key Vault, reference them through a linked variable group so they\'re marked secret and get masked, pass them into the script as environment variables, and remove the `echo` statements that print them entirely."',
    ],
    code: [
      {
        title: 'How to redesign it',
        language: 'yaml',
        code: `variables:
  - group: payment-api-secrets   # variable group linked to Azure Key Vault

steps:
- script: |
    echo "Deploying application"
    ./deploy.sh
  env:
    DB_USER: $(DB_USER)
    DB_PASSWORD: $(DB_PASSWORD)
    API_KEY: $(API_KEY)`,
      },
    ],
    tags: ['azure devops', 'secrets', 'security'],
  },
  {
    id: 'itv-mystsc-14',
    level: 'intermediate',
    kind: 'scenario',
    prompt:
      'Jenkins pipeline security: what are the security issues in this Jenkinsfile, and how do you fix them?',
    promptCode: [
      {
        title: 'The pipeline',
        language: 'text',
        code: `pipeline {
    agent any

    stages {
        stage('Deploy') {
            steps {
                sh '''
                    export DB_PASSWORD="<hardcoded-password>"
                    ./deploy.sh
                '''
            }
        }
    }
}`,
      },
    ],
    probing:
      'Whether you move the secret to Jenkins Credentials and think about where credentials run (agents) and how they get masked.',
    answer: [
      '**Security issues in this Jenkinsfile**',
      '1. **Hardcoded credential in the Jenkinsfile** — `<hardcoded-password>` is in plain text in source control, visible to anyone with repo read access, and preserved forever in git history even if later removed.\n2. **Printed in Jenkins console logs** — depending on how `deploy.sh` uses the variable, it can easily end up echoed to the build console, which many users can view.\n3. **`agent any`** — runs on any available agent, including potentially untrusted or shared agents, without restricting where sensitive credentials are used.\n4. **No credential rotation/central management** — changing the password means editing and redeploying the Jenkinsfile.',
      "**Secure fix — use Jenkins Credentials**\nThe secret `db-password-prod` is stored in Jenkins' built-in Credentials store (or backed by a vault plugin), Jenkins automatically masks it in console output, and it's injected as an environment variable at runtime — never written in the Jenkinsfile itself.",
      "**Short interview answer**\n\"The password is hardcoded directly in the Jenkinsfile, which means it's stored in plain text in version control and could leak into build logs. I'd store it in Jenkins Credentials (or an external vault) and reference it with `credentials('db-password-prod')` in the `environment` block, so Jenkins injects it at runtime and automatically masks it in the console output, instead of it ever appearing in source code.\"",
    ],
    code: [
      {
        title: 'Secure fix — use Jenkins Credentials',
        language: 'text',
        code: `pipeline {
    agent any

    environment {
        DB_PASSWORD = credentials('db-password-prod')
    }

    stages {
        stage('Deploy') {
            steps {
                sh './deploy.sh'
            }
        }
    }
}`,
      },
    ],
    tags: ['jenkins', 'secrets', 'security'],
  },
  {
    id: 'itv-mystsc-15',
    level: 'basic',
    kind: 'scenario',
    prompt:
      'Jenkins declarative pipeline missing structure: what is missing or incorrect in this pipeline?',
    promptCode: [
      {
        title: 'The pipeline',
        language: 'text',
        code: `pipeline {
    stages {
        stage('Build') {
            steps {
                sh 'mvn clean package'
            }
        }

        stage('Deploy') {
            steps {
                sh './deploy.sh'
            }
        }
    }
}`,
      },
    ],
    probing:
      'Whether you know the required `agent` block and the production additions - test stage, options, post, and a deploy gate.',
    answer: [
      '**What is missing or incorrect**',
      "1. **No `agent` block** — a declarative pipeline requires a top-level `agent` (e.g., `agent any` or a specific label); without it, the pipeline won't even validate/run.\n2. **No `post` block** — there's no cleanup, notification, or failure handling (e.g., sending a Slack/email alert on failure, archiving artifacts, cleaning workspace).\n3. **No test stage** — going straight from `Build` to `Deploy` skips running automated tests, which is risky for production deployments.\n4. **No `options`** — things like `timeout()`, `retry()`, or `disableConcurrentBuilds()` are missing, so a hung build could run forever or two deploys could overlap.\n5. **Deploy has no gate/approval** — going straight to deploy after build with no manual approval or environment check is risky for production pipelines.",
      '**Short interview answer**\n"This pipeline is missing the required top-level `agent`, has no test stage before deploying, and has no `post` block for failure notifications or cleanup. I\'d add `agent any`, insert a `Test` stage between build and deploy, add `options` like a timeout and `disableConcurrentBuilds`, and add a `post` block to handle success/failure notifications and workspace cleanup."',
    ],
    code: [
      {
        title: 'Corrected structure',
        language: 'text',
        code: `pipeline {
    agent any

    options {
        timeout(time: 30, unit: 'MINUTES')
        disableConcurrentBuilds()
    }

    stages {
        stage('Build') {
            steps {
                sh 'mvn clean package'
            }
        }

        stage('Test') {
            steps {
                sh 'mvn test'
            }
        }

        stage('Deploy') {
            steps {
                sh './deploy.sh'
            }
        }
    }

    post {
        success {
            echo 'Pipeline completed successfully'
        }
        failure {
            echo 'Pipeline failed - notifying team'
        }
        always {
            cleanWs()
        }
    }
}`,
      },
    ],
    tags: ['jenkins', 'pipelines', 'declarative'],
  },
  {
    id: 'itv-mystsc-16',
    level: 'advanced',
    kind: 'scenario',
    prompt:
      'The CI/CD pipeline (Build -> Test -> SonarQube -> Docker Build -> Trivy Scan -> Push ACR -> Deploy) fails at the Trivy stage with `CRITICAL vulnerabilities found`. What would you do next?',
    promptCode: [
      {
        title: 'The pipeline',
        language: 'text',
        code: `Build → Test → SonarQube → Docker Build → Trivy Scan → Push ACR → Deploy Dev → Approval → Deploy Prod`,
      },
      {
        title: 'The pipeline (2)',
        language: 'text',
        code: `CRITICAL vulnerabilities found
Exit code: 1`,
      },
    ],
    probing:
      'Whether you refuse to bypass the security gate and know how to handle a real false positive with a documented, targeted exception.',
    answer: [
      '**What I would do next**\n**I would not bypass Trivy and deploy anyway.** A CRITICAL vulnerability finding exists specifically to block deployment of known, exploitable weaknesses — pushing past it defeats the purpose of having the scan in the pipeline at all, and could ship a real security hole to production. Instead:',
      "1. **Review the actual findings** — Trivy's report names the specific CVEs, the affected package, and the severity. Not all \"CRITICAL\" findings are equally urgent (e.g., a CVE in a library function the app never calls is lower real-world risk than one in an internet-facing component).\n2. **Check if a fixed version exists** — often the fix is simply updating a base image or dependency to a patched version.\n3. **Rebuild and rescan** after the fix to confirm the vulnerability is resolved.\n4. **If there's a genuine false positive or accepted risk** (e.g., the vulnerable code path is unreachable, or it's a transitive dependency with no fix available yet), document a formal exception/waiver with the security team's sign-off, and use Trivy's `.trivyignore` mechanism to suppress that specific CVE with a comment explaining why — not to silence the whole scan.\n5. **Escalate the timeline** if the fix will take time — communicate the delay rather than silently skipping the gate.",
      "**Short interview answer**\n\"I would not bypass a CRITICAL finding just to keep the pipeline moving — that's exactly the scenario the scan exists to prevent. I'd look at the actual CVE details to see if a patched base image or dependency version is available, fix and rescan, and only if there's a genuine false positive or an accepted, time-boxed risk would I use a targeted `.trivyignore` entry with sign-off and a tracking ticket — never a blanket bypass of the whole Trivy stage.\"",
    ],
    code: [
      {
        title: 'What I would do next',
        language: 'bash',
        code: `# example: targeted, documented ignore (not a blanket bypass)
# .trivyignore
CVE-2023-XXXXX  # accepted risk: unreachable code path, tracked in JIRA-1234, review by 2026-09-01`,
      },
    ],
    followUps: [
      'How would you keep base images patched so this happens less often?',
      'Who should be allowed to approve a CVE exception, and how do you make it expire?',
    ],
    tags: ['trivy', 'devsecops', 'ci/cd'],
  },
  {
    id: 'itv-mystsc-17',
    level: 'basic',
    kind: 'scenario',
    prompt:
      'Azure DevOps pipeline not triggering for feature branches: a developer pushes to `feature/payment-api`, but this pipeline does not run. Is this expected, and how do you fix it?',
    promptCode: [
      {
        title: 'The YAML',
        language: 'yaml',
        code: `trigger:
  - main

pool:
  vmImage: ubuntu-latest

steps:
  - script: echo "Build started"`,
      },
    ],
    probing: 'Whether you read the CI trigger literally and know the `branches: include` syntax.',
    answer: [
      "**Is this expected?**\n**Yes.** The `trigger` section explicitly lists only `main`, so Azure DevOps only creates a CI run automatically for pushes to `main`. Pushing to any other branch, including `feature/payment-api`, simply doesn't match the trigger and is correctly skipped — this isn't a bug.",
      '**Fix — trigger on both `main` and `feature/*`**\nUsing `branches: include:` is the clearer, expanded form - the short list form also accepts wildcards like `feature/*`, but only the expanded form supports `exclude`, path filters and batching.',
      '**Short interview answer**\n"Yes, this is expected — the trigger only lists `main`, so pushes to any other branch, including `feature/payment-api`, are correctly ignored by design, not a bug. To make it trigger for both, I\'d rewrite the trigger using the `branches: include:` form with both `main` and `feature/*` listed, since that expanded syntax is clearer and also supports excludes and path filters."',
    ],
    code: [
      {
        title: 'Fix — trigger on both main and feature/',
        language: 'yaml',
        code: `trigger:
  branches:
    include:
      - main
      - feature/*

pool:
  vmImage: ubuntu-latest

steps:
  - script: echo "Build started"`,
      },
    ],
    tags: ['azure devops', 'triggers', 'yaml'],
  },
  {
    id: 'itv-mystsc-18',
    level: 'intermediate',
    kind: 'scenario',
    prompt:
      'You have 30 CI/CD pipelines and need to add one environment variable to all of them. How would you avoid updating each pipeline manually?',
    probing:
      'Whether you centralise shared configuration - Jenkins Shared Library or an Azure DevOps Variable Group - instead of copy-pasting.',
    answer: [
      'I would avoid duplicating the variable across 30 pipelines. I would centralize the configuration.',
      "If I'm using Jenkins, my preferred approach is a Jenkins Shared Library or a centrally managed configuration.",
      'in every Jenkinsfile, I can define the common environment variable in the shared library or global configuration and let all pipelines consume it.',
      '**Jenkins Shared Library approach**\nThen the individual pipelines use the shared library rather than maintaining the common configuration themselves.',
      '**If using Azure DevOps**\nAll pipelines reference the same Variable Group. If I change the variable there, all pipelines get the updated value.',
      '**Interview summary**\n"I would not update 30 pipelines individually. I would centralize common environment variables. In Jenkins, I would use a Shared Library or centralized Jenkins configuration. In Azure DevOps, I would use a Variable Group. This gives us one place to maintain the variable and prevents configuration drift across pipelines."',
    ],
    code: [
      {
        title: 'For example, instead of defining',
        language: 'text',
        code: `environment {
    APP_ENV = 'production'
}`,
      },
      {
        title: 'I could have a common pipeline function',
        language: 'text',
        code: `def call() {
    pipeline {
        agent any

        environment {
            APP_ENV = 'production'
        }

        stages {
            stage('Build') {
                steps {
                    sh 'echo $APP_ENV'
                }
            }
        }
    }
}`,
      },
      {
        title: 'I would use a Variable Group',
        language: 'text',
        code: `Variable Group
      |
30 Pipelines
      |
APP_ENV = production`,
      },
    ],
    tags: ['ci/cd', 'jenkins', 'azure devops'],
  },
  {
    id: 'itv-mystsc-19',
    level: 'intermediate',
    kind: 'open',
    prompt:
      'What applications have you worked on in frontend and backend? Give the end-to-end flow.',
    probing:
      'Whether you can describe one realistic architecture and your DevOps ownership of it, not just list technologies.',
    answer: [
      'For an Azure DevOps Engineer interview, explain one realistic application architecture and then walk through the complete flow from developer commit to production.',
      '**Example application**\nI would use a 3-tier application:',
      '- **Frontend:** React.js\n- **Backend:** .NET Core Web API\n- **Database:** Azure SQL\n- **Containerization:** Docker\n- **Orchestration:** AKS\n- **Ingress:** NGINX Ingress Controller\n- **CI/CD:** Azure DevOps Pipelines\n- **IaC:** Terraform\n- **Secrets:** Azure Key Vault\n- **Monitoring:** Azure Monitor + Application Insights + Prometheus/Grafana',
      '**How I would explain it in an interview**\n"In my project, we had a React-based frontend and a .NET Core Web API backend. Both applications were containerized using Docker and deployed into Azure Kubernetes Service. Azure SQL was used as the backend database.',
      'Developers pushed their code to Azure Repos. This triggered the Azure DevOps CI pipeline. The pipeline performed code checkout, dependency installation, unit testing, SonarQube/code-quality checks, Docker image build and security scanning. After successful validation, the images were pushed to Azure Container Registry.',
      'For deployment, we used Helm charts to deploy the frontend and backend into AKS. The CD pipeline retrieved the required image from ACR and performed a Helm upgrade. Kubernetes created or updated the pods using a rolling update strategy.',
      'External traffic came through DNS and the ingress layer. The ingress routed frontend and API traffic to the appropriate Kubernetes services. The frontend communicated with the backend through REST APIs, and the backend connected to Azure SQL.',
      'Application secrets such as database credentials and API keys were stored in Azure Key Vault rather than directly in the pipeline or Kubernetes manifests.',
      'We monitored the application using Azure Monitor and Application Insights, while Prometheus and Grafana were used for Kubernetes metrics and dashboards. If a deployment failed, we checked pipeline logs, Kubernetes events, pod status, container logs, readiness/liveness probes and ingress logs."',
    ],
    code: [
      {
        title: 'The runtime flow is',
        language: 'text',
        code: `User -> DNS -> Application Gateway/Load Balancer -> Ingress -> Frontend -> Backend API -> Azure SQL`,
      },
      {
        title: 'And the deployment flow is',
        language: 'text',
        code: `Developer -> Git -> Azure DevOps CI pipeline -> Build/Test -> Docker Image
   -> Azure Container Registry -> CD Pipeline -> AKS -> Production`,
      },
    ],
    tags: ['architecture', 'aks', 'azure devops', 'end-to-end'],
  },
  {
    id: 'itv-mystsc-20',
    level: 'advanced',
    kind: 'open',
    prompt:
      'Walk through the complete deployment flow for a React frontend and .NET Core backend on AKS - from developer commit to monitoring.',
    probing:
      'Whether you can walk every hop from commit through PR validation, image build, ACR, Helm, AKS, Ingress, Key Vault and monitoring.',
    answer: [
      '**Step 1: Developer changes code**\nDeveloper creates a feature branch: `git checkout -b feature/payment`',
      'A Pull Request is created.',
      '**Step 2: Pull Request validation**\nAzure DevOps pipeline gets triggered.',
      'We can also run SonarQube, Checkov, Trivy or tfsec depending on what is being scanned.',
      '**Step 3: Docker image creation**\nAfter the code passes validation, we build Docker images.',
      'I would normally use multi-stage Docker builds so the final image contains only what is required to run the application.',
      '**Step 4: Push images to ACR**\nThe pipeline authenticates to Azure using an Azure DevOps Service Connection.',
      '**Step 5: CD pipeline deploys to AKS**\nThe CD pipeline picks the approved image version. We use Helm.',
      '**Step 6: Kubernetes deployment**\nAKS receives the deployment.',
      'If we deploy a new version, Kubernetes performs a rolling update.',
      'Readiness probes make sure traffic is sent only to healthy pods.',
      '**Step 7: User request flow**\nThe user accesses: `https://myapp.com`',
      'The React frontend calls: `https://myapp.com/api/orders`',
      'Ingress routes `/api` traffic to the backend:',
      '**Step 8: Where Key Vault comes in**\nThe application retrieves the required secrets securely.',
      'For Azure DevOps authentication to Azure resources, I would use an appropriate service connection, preferably with managed identity / workload identity where the architecture supports it.',
      '**Step 9: Monitoring**\nWe monitor:',
      '- CPU / memory\n- Pod restarts\n- Node health\n- API response time\n- HTTP 4xx / 5xx\n- Application exceptions\n- Availability\n- Container logs',
      'Alerts can notify the team when thresholds are breached.',
    ],
    code: [
      {
        title: 'Developer works on',
        language: 'text',
        code: `Frontend
React.js
   |
   +-- src/
   +-- package.json
   +-- Dockerfile

Backend
.NET Core Web API
   |
   +-- Controllers/
   +-- Services/
   +-- appsettings.json
   +-- Dockerfile`,
      },
      {
        title: 'After development',
        language: 'bash',
        code: `git add .
git commit -m "Added payment functionality"
git push origin feature/payment`,
      },
      {
        title: 'Typical validations',
        language: 'text',
        code: `Checkout code
     |
Install dependencies
     |
Build
     |
Unit tests
     |
SonarQube
     |
Security scanning
     |
PR approval`,
      },
      {
        title: 'Step 2: Pull Request validation: Frontend',
        language: 'bash',
        code: `npm install
npm test
npm run build`,
      },
      {
        title: 'Step 2: Pull Request validation: Backend',
        language: 'bash',
        code: `dotnet restore
dotnet build
dotnet test`,
      },
      {
        title: 'Step 3: Docker image creation: For example',
        language: 'text',
        code: `frontend:v1.2.0
backend:v1.2.0`,
      },
      {
        title: 'Frontend Docker image',
        language: 'text',
        code: `React application
      |
npm build
      |
Nginx
      |
Frontend Docker image`,
      },
      {
        title: 'Step 3: Docker image creation: Backend',
        language: 'text',
        code: `.NET Core application
      |
dotnet publish
      |
.NET runtime
      |
Backend Docker image`,
      },
      {
        title: 'Step 4: Push images to ACR: Then',
        language: 'bash',
        code: `docker build -t myacr.azurecr.io/frontend:1.2.0 .
docker push myacr.azurecr.io/frontend:1.2.0`,
      },
      {
        title: 'Step 4: Push images to ACR: Similarly',
        language: 'bash',
        code: `docker build -t myacr.azurecr.io/backend:1.2.0 .
docker push myacr.azurecr.io/backend:1.2.0`,
      },
      {
        title: 'Now ACR contains',
        language: 'text',
        code: `ACR
 ├── frontend
 │    ├── 1.1.0
 │    └── 1.2.0
 │
 └── backend
      ├── 1.1.0
      └── 1.2.0`,
      },
      {
        title: 'Step 5: CD pipeline deploys to AKS',
        language: 'text',
        code: `Helm Chart
 ├── Chart.yaml
 ├── values.yaml
 └── templates/
      ├── deployment.yaml
      ├── service.yaml
      └── ingress.yaml`,
      },
      {
        title: 'The pipeline executes something like',
        language: 'bash',
        code: `helm upgrade --install frontend ./helm/frontend \\
  --set image.tag=1.2.0 \\
  -n production`,
      },
      {
        title: 'Step 5: CD pipeline deploys to AKS: And',
        language: 'bash',
        code: `helm upgrade --install backend ./helm/backend \\
  --set image.tag=1.2.0 \\
  -n production`,
      },
      {
        title: 'Step 6: Kubernetes deployment: For backend',
        language: 'text',
        code: `Deployment
     |
     +---- Pod 1
     +---- Pod 2
     +---- Pod 3`,
      },
      {
        title: 'The Service provides stable networking',
        language: 'text',
        code: `Backend Service
      |
      +---- Pod 1
      +---- Pod 2
      +---- Pod 3`,
      },
      {
        title: 'Step 6: Kubernetes deployment',
        language: 'text',
        code: `Old Pods
v1.1
v1.1
v1.1

       |
New Pods created
v1.2
v1.2

       |
Old Pods terminated

       |
v1.2
v1.2
v1.2`,
      },
      {
        title: 'Step 7: User request flow: Flow',
        language: 'text',
        code: `User
  |
DNS
  |
Azure Application Gateway / Load Balancer
  |
NGINX Ingress Controller
  |
Frontend Service
  |
Frontend Pods`,
      },
      {
        title: 'Ingress routes /api traffic to the backend',
        language: 'text',
        code: `Ingress
   |
   +-- /       -> Frontend Service
   |
   +-- /api    -> Backend Service`,
      },
      {
        title: 'Step 7: User request flow: Then',
        language: 'text',
        code: `Backend Pod
    |
Azure SQL`,
      },
      {
        title: 'So the complete runtime flow is',
        language: 'text',
        code: `User
 |
DNS
 |
Application Gateway
 |
Ingress Controller
 |
Frontend Service
 |
React Pod
 |
REST API
 |
Backend Service
 |
.NET Core Pod
 |
Azure SQL`,
      },
      {
        title: "We don't hardcode things like",
        language: 'text',
        code: `DB_PASSWORD
API_KEY
CONNECTION_STRING`,
      },
      {
        title: 'Step 8: Where Key Vault comes in: Instead',
        language: 'text',
        code: `Azure Key Vault
       |
AKS / Workload Identity
       |
Backend Pod`,
      },
      {
        title: 'For application monitoring',
        language: 'text',
        code: `Frontend
Backend
   |
Application Insights
   |
Azure Monitor`,
      },
      {
        title: 'For Kubernetes',
        language: 'text',
        code: `AKS
 |
Prometheus
 |
Grafana`,
      },
    ],
    followUps: [
      'How would you promote the same image from dev to production?',
      'Where would you add a rollback step in this flow?',
    ],
    tags: ['end-to-end', 'aks', 'helm', 'ci/cd'],
  },
  {
    id: 'itv-mystsc-21',
    level: 'basic',
    kind: 'open',
    prompt:
      'If the interviewer asks "What applications have you worked on?", how should you answer?',
    probing:
      'Whether you answer with application knowledge plus DevOps ownership and the full flow, not a one-line list of frameworks.',
    answer: [
      'Don\'t just say: "I worked on React and .NET." Say:',
      '"I worked on a web-based three-tier application. The frontend was React.js, the backend was .NET Core REST APIs, and Azure SQL was used as the database. From the DevOps side, I was responsible for Git-based source control, Azure DevOps CI/CD, Docker image creation, ACR, AKS deployments using Helm, Terraform for infrastructure, Key Vault for secrets, and Azure Monitor/Application Insights for monitoring."',
      'Then immediately explain:',
      '"The end-to-end flow was developer commit -> PR -> CI validation -> Docker build -> security/code-quality checks -> ACR -> CD pipeline -> Helm deployment -> AKS -> Ingress -> frontend/backend -> Azure SQL -> monitoring."',
      'That answer gives the interviewer both application knowledge and actual DevOps ownership, which is what they usually look for in an Azure DevOps interview.',
      '**Additional enterprise elements worth mentioning**\nFor a more enterprise-scale version of the same architecture:',
      '- **Azure Front Door** in front of Application Gateway for global routing/CDN, when the application serves multiple regions.\n- **TDE (Transparent Data Encryption)** on Azure SQL for encryption at rest.\n- **Redis** as a caching layer between the backend and the database to reduce database load.\n- **GZRS (Geo-Zone-Redundant Storage)** for the storage tier when both zone and region redundancy are required.',
    ],
    tags: ['interview', 'architecture', 'end-to-end'],
  },
  {
    id: 'itv-mystsc-22',
    level: 'advanced',
    kind: 'open',
    prompt:
      'How are you using Helm in Kubernetes? Explain Helm charts, deployments, upgrades, and the complete rollback procedure.',
    probing:
      "Whether you validate before installing, understand revisions, and verify health after a rollback instead of trusting Helm's exit code.",
    answer: [
      'I use Helm as the package manager for Kubernetes. Instead of maintaining large Kubernetes YAML files separately for every environment, I create a reusable Helm chart and pass environment-specific values through `values.yaml` or separate values files.',
      '**Helm chart structure**',
      '- **Chart.yaml** - chart name and version\n- **values.yaml** - default configuration such as image, replicas, CPU, memory\n- **templates/** - Kubernetes manifests containing Helm templating\n- **templates/deployment.yaml** - creates the Kubernetes Deployment\n- **templates/service.yaml** - creates the Service',
      'For different environments, I normally maintain files like:',
      '**Helm deployment**\nFirst, I validate the chart: `helm lint ./my-app`',
      'Then I render the templates to check what Kubernetes YAML will actually be generated:',
      '**Helm upgrade**\nSuppose the application team releases version v2.',
      'I update the image tag in `values-prod.yaml`:',
      'And check the Helm revision: `helm history my-app -n production`',
      'Each Helm upgrade creates a new release revision, which is important for rollback.',
      'In CI/CD I normally combine install and upgrade into one idempotent command instead of branching on "does this release already exist":',
      'For a quick one-off change without editing the values file, `--set` overrides a single value directly:',
      '**Complete Helm rollback procedure**\nSuppose revision 2 introduced a bad application version and the Pods are failing.',
      '**Step 2: Check Helm history**\n`helm history my-app -n production`',
      'I identify revision 2 as the last known good release.',
      '**Step 3: Roll back**\n`helm rollback my-app 2 -n production`',
      'Helm creates a new revision based on revision 2. It does not simply delete the current revision.',
      'I then check: `helm history my-app -n production`',
      'Revision 4 is the rollback operation.',
      '**Step 4: Verify Kubernetes rollout**\nI also check the application logs and readiness probes to make sure the application is actually healthy.',
      '**Step 5: Verify the Helm release**\n`helm status my-app -n production`',
      'If everything is healthy, I consider the rollback complete.',
      '**Important interview point**\nI would not immediately roll back just because a Pod restarted. First I check whether the problem is actually related to the latest Helm release.',
      '**Strong interview answer**\n"In my projects, I use Helm to package Kubernetes resources into reusable charts. The chart contains Chart.yaml, values.yaml, and templates such as Deployment, Service, and Ingress. For deployment, I validate the chart using `helm lint` and `helm template`, then use `helm install` or `helm upgrade` with environment-specific values. Every upgrade creates a new Helm revision. If the latest deployment has an issue, I check `helm history`, identify the last known-good revision, and run `helm rollback <release> <revision>`. After rollback, I verify the Helm status, Kubernetes rollout, Pod health, logs, and application functionality."\n**Best practices**',
      "- Separate values files per environment (`values-dev.yaml`, `values-qa.yaml`, `values-prod.yaml`) instead of branching logic inside templates.\n- Keep secrets out of the chart where possible - reference an external secret manager (e.g. Azure Key Vault) rather than committing secret values to `values.yaml`.\n- Version Helm charts, so a specific chart version can be pinned and rolled back independently of the application image tag.\n- Always run `helm lint` before deploying.\n- Use `helm upgrade --install` in CI/CD so the same command works for both first deploy and subsequent releases.\n- Verify the rollout (`kubectl rollout status`) after every install/upgrade rather than assuming success from Helm's own exit code.\n- Roll back immediately on a failed deployment rather than trying to hotfix forward under pressure.",
    ],
    code: [
      {
        title: 'A typical chart looks like this',
        language: 'text',
        code: `my-app/
├── Chart.yaml
├── values.yaml
└── templates/
    ├── deployment.yaml
    ├── service.yaml
    ├── ingress.yaml
    └── configmap.yaml`,
      },
      {
        title: 'For different environments, I normally maintain files like',
        language: 'text',
        code: `values-dev.yaml
values-qa.yaml
values-prod.yaml`,
      },
      {
        title: 'Helm deployment',
        language: 'bash',
        code: `helm template my-app ./my-app -f values-prod.yaml`,
      },
      {
        title: 'Then I install it',
        language: 'bash',
        code: `helm install my-app ./my-app \\
  -n production \\
  --create-namespace \\
  -f values-prod.yaml`,
      },
      {
        title: 'I verify the release',
        language: 'bash',
        code: `helm list -n production
helm status my-app -n production`,
      },
      {
        title: 'Then I verify the Kubernetes resources',
        language: 'bash',
        code: `kubectl get pods -n production
kubectl get deployment -n production
kubectl get svc -n production`,
      },
      {
        title: 'I update the image tag in values-prod.yaml',
        language: 'yaml',
        code: `image:
  repository: myacr.azurecr.io/my-app
  tag: "v2"`,
      },
      {
        title: 'Helm upgrade: Then I run',
        language: 'bash',
        code: `helm upgrade my-app ./my-app \\
  -n production \\
  -f values-prod.yaml`,
      },
      {
        title: 'I check the rollout',
        language: 'bash',
        code: `kubectl rollout status deployment/my-app -n production`,
      },
      {
        title: 'Helm upgrade: For example',
        language: 'text',
        code: `REVISION  STATUS
1         superseded
2         deployed`,
      },
      {
        title: 'Helm upgrade',
        language: 'bash',
        code: `helm upgrade --install my-app ./my-app \\
  -n production \\
  -f values-prod.yaml`,
      },
      {
        title: 'Helm upgrade (2)',
        language: 'bash',
        code: `helm upgrade my-app ./my-app -n production --set image.tag=v2`,
      },
      {
        title: 'Step 1: Check the application',
        language: 'bash',
        code: `kubectl get pods -n production
kubectl describe pod <pod-name> -n production
kubectl logs <pod-name> -n production`,
      },
      {
        title: 'Step 2: Check Helm history: Suppose I see',
        language: 'text',
        code: `REVISION  STATUS
1         superseded
2         superseded
3         deployed`,
      },
      {
        title: 'Step 3: Roll back: I might see',
        language: 'text',
        code: `REVISION  STATUS
1         superseded
2         superseded
3         superseded
4         deployed`,
      },
      {
        title: 'Step 4: Verify Kubernetes rollout',
        language: 'bash',
        code: `kubectl rollout status deployment/my-app -n production`,
      },
      {
        title: 'Step 4: Verify Kubernetes rollout: Then',
        language: 'bash',
        code: `kubectl get pods -n production
kubectl get deployment -n production`,
      },
      {
        title: 'Important interview point: My flow is',
        language: 'text',
        code: `Helm Chart
    |
helm install
    |
Kubernetes Deployment
    |
helm upgrade
    |
New Helm Revision
    |
Application issue
    |
helm history
    |
Identify last known-good revision
    |
helm rollback
    |
Kubernetes rollout
    |
Verify Pods + Application`,
      },
    ],
    followUps: [
      'What does `helm upgrade --atomic` do, and when would you use it?',
      'What happens to CRDs and PVCs when you roll back a Helm release?',
    ],
    tags: ['helm', 'kubernetes', 'rollback'],
  },
]
