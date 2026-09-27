import type { InterviewQuestion } from '../../../types'

/** Azure DevOps pipelines, AKS delivery, Helm, Docker builds and cost from the Deloitte rounds. */
export const roundsDeloittePipelineQuestions: InterviewQuestion[] = [
  {
    id: 'itv-rdel-11',
    level: 'advanced',
    kind: 'open',
    prompt: 'How have you reduced cloud cost in Azure? Give a few examples.',
    probing:
      'Whether you have actually driven Azure cost down with specific levers, and can prove the saving with data rather than a feeling.',
    answer: [
      'For an Azure DevOps interview, give practical cost-saving examples and explain what you changed, why, and how you measured it.',
      '**1. Right-size VMs**',
      '"I reviewed VM CPU and memory utilization using Azure Monitor. If a VM was consistently underutilized, for example using only 10-20% CPU, I recommended moving it to a smaller SKU."',
      'I would validate the workload before downsizing and monitor it after the change.',
      'Cost saving: Lower compute cost without affecting application performance.',
      '**2. Stop non-production resources after working hours**',
      "For Dev/Test environments, resources don't need to run 24/7.",
      'I can automate this with Azure Automation, Logic Apps, Functions, or scheduled Azure DevOps jobs.',
      'For example: `az vm deallocate --resource-group dev-rg --name dev-vm`',
      'Important: `deallocate` is different from simply shutting down the OS because deallocation releases the VM compute allocation.',
      'Cost saving: Avoid paying for compute during unused hours.',
      '**3. AKS node optimization** - I would monitor:',
      '- CPU utilization\n- Memory utilization\n- Pod density\n- Node utilization\n- Cluster autoscaler behavior',
      'If nodes are consistently underutilized, I can reduce the node count or use a smaller VM SKU.',
      'I can also use Cluster Autoscaler so AKS adds/removes nodes based on pending workload.',
      '**4. Use Azure Reservations / Savings Plan**',
      'For workloads that are predictable and continuously running, such as production VMs, I would evaluate:',
      '- Azure Reservations\n- Azure Savings Plan for Compute',
      'Instead of paying the full pay-as-you-go rate for stable workloads.',
      "I wouldn't use a long-term commitment for highly variable or temporary workloads.",
      '**5. Remove unused resources**',
      'This is one of the easiest cost optimizations.',
      'I regularly look for unused:',
      '- Managed disks\n- Snapshots\n- Public IPs\n- Load balancers\n- Old VM resources\n- Unused NICs\n- Old container images\n- Unused App Service plans\n- Old backups',
      'For example, a VM may be deleted but its managed disk remains.',
      'I can use Azure Resource Graph/CLI to identify orphaned resources and clean them up after validation.',
      '**6. Storage lifecycle management**',
      'For storage accounts, I can move old data to cheaper tiers.',
      'For logs or backups that are rarely accessed: `Recent logs -> Hot`, `Older logs -> Cool`, `Old backups -> Archive`',
      'I would configure lifecycle management rules rather than manually moving files.',
      '**7. Optimize Azure DevOps build agents**',
      "If we're using self-hosted agents, I can clean up:",
      '- Old Docker images\n- Containers\n- Build artifacts\n- Temporary files\n- Workspace files',
      'For Microsoft-hosted agents, I avoid unnecessary work by improving pipeline efficiency, such as:',
      '- Dependency caching\n- Parallel jobs\n- Incremental builds\n- Docker layer caching',
      "This doesn't just reduce Azure infrastructure cost. It reduces pipeline execution time and compute consumption.",
      '**8. Container image optimization**',
      'For Docker workloads, I use:',
      '- Multi-stage builds\n- Smaller base images\n- `.dockerignore`\n- Layer caching',
      'Instead of putting Node.js, npm, source code and build dependencies into the production image, the final image only contains Nginx and the built application. This reduces:',
      '- ACR storage\n- Image transfer time\n- AKS pull time\n- Container storage usage',
      '**9. Log retention optimization**',
      'Logs can become surprisingly expensive.',
      'I review: (see code below)',
      'I avoid sending unnecessary verbose/debug logs to Log Analytics in production.',
      "For example: `DEBUG -> Don't collect in production unless required`, `INFO -> Keep where useful`, `ERROR -> Always retain`",
      'I also configure appropriate retention and archive older data where required.',
      '**10. Resource tagging and cost analysis**',
      'I use consistent tags: (see code below)',
      'Then Azure Cost Management can help identify which application/team/environment is consuming money.',
      'Then I investigate the biggest unexpected spend first.',
      '**Strong interview answer**',
      'If they ask "How have you reduced Azure cloud costs?", say:',
      '"I have approached cost optimization mainly through resource utilization and automation. First, I used Azure Monitor metrics to identify underutilized VMs and right-size them. For non-production environments, I automated VM shutdown and startup during non-working hours. For AKS, I monitored node and pod utilization and used appropriate node sizing and cluster autoscaling to avoid running unnecessary nodes.',
      'I also cleaned up orphaned resources such as unattached managed disks, unused public IPs, snapshots and old container images. For storage, I used lifecycle policies to move older data from Hot to Cool or Archive tiers. For stable production workloads, I would evaluate Azure Reservations or Savings Plans based on historical usage.',
      'On the DevOps side, I optimized Docker images using multi-stage builds and cleaned up self-hosted agent resources. I also reviewed Log Analytics ingestion and retention so we weren\'t unnecessarily storing verbose logs. Finally, I used resource tagging and Azure Cost Management to identify which applications and environments were actually driving the cost."',
      '**If they ask "How did you prove the saving?"**',
      'Don\'t say "I think it reduced the cost." Say:',
      '"I compared the Azure Cost Management data before and after the change, while controlling for workload changes. For example, after right-sizing or shutting down non-production resources, I compared the monthly compute cost and validated that application performance and availability remained within the required limits."',
      "That's a much stronger DevOps interview answer.",
    ],
    code: [
      {
        title: 'Right-size VMs - Example',
        language: 'text',
        code: `Before:
D4s_v5 -> 4 vCPU / 16 GB

After:
D2s_v5 -> 2 vCPU / 8 GB`,
      },
      {
        title: 'Stop non-production resources after working hours',
        language: 'text',
        code: `Dev VM
  |
  v
Stop at 8 PM
  |
  v
Start at 8 AM`,
      },
      {
        title: 'Stop non-production resources after working hours - commands',
        language: 'bash',
        code: `az vm deallocate \\
  --resource-group dev-rg \\
  --name dev-vm`,
      },
      {
        title: 'AKS node optimization - For example',
        language: 'text',
        code: `Before:
5 x D4s_v5 nodes

After:
3 x D4s_v5 nodes`,
      },
      {
        title: 'AKS node optimization',
        language: 'text',
        code: `Low workload
     |
     v
Fewer nodes

High workload
     |
     v
More nodes`,
      },
      {
        title: 'Use Azure Reservations / Savings Plan - For example',
        language: 'text',
        code: `Production VM
Runs 24 x 7
        |
        v
Analyze historical usage
        |
        v
Commit appropriate capacity
        |
        v
Lower compute cost`,
      },
      {
        title: 'Remove unused resources',
        language: 'text',
        code: `VM deleted
   |
   v
Disk still exists
   |
   v
Still generating cost`,
      },
      {
        title: 'Storage lifecycle management',
        language: 'text',
        code: `Hot
 |
 v
Cool
 |
 v
Archive`,
      },
      {
        title: 'Storage lifecycle management - snippet',
        language: 'text',
        code: `Recent logs -> Hot
Older logs  -> Cool
Old backups -> Archive`,
      },
      {
        title: 'Container image optimization - For example',
        language: 'dockerfile',
        code: `FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html`,
      },
      {
        title: 'I review',
        language: 'text',
        code: `Log Analytics
     |
     v
Retention
     |
     v
Ingestion volume
     |
     v
Cost`,
      },
      {
        title: 'Log retention optimization - snippet',
        language: 'text',
        code: `DEBUG -> Don't collect in production unless required
INFO  -> Keep where useful
ERROR -> Always retain`,
      },
      {
        title: 'I use consistent tags',
        language: 'text',
        code: `Environment = Production
Application = Payments
Owner       = DevOps
CostCenter  = 1234`,
      },
      {
        title: 'Resource tagging and cost analysis - Example',
        language: 'text',
        code: `Application A -> ₹80,000/month
Application B -> ₹25,000/month
Unused Dev    -> ₹15,000/month`,
      },
    ],
    followUps: [
      'How would you find orphaned disks, NICs and public IPs across every subscription?',
      'How do you decide between an Azure Reservation and a Savings Plan for a workload?',
    ],
    tags: ['azure', 'finops', 'cost'],
  },
  {
    id: 'itv-rdel-12',
    level: 'basic',
    kind: 'open',
    prompt: 'What are the key Helm commands to remember for deployment and rollback?',
    probing:
      'Whether you know the everyday Helm release commands and the difference between a Helm rollback and a Kubernetes rollout undo.',
    answer: [
      '**Helm deployment** - The standard command is: (see code below)',
      'What each part means:',
      "- `upgrade --install` → Install if the release doesn't exist; otherwise upgrade it.\n- `myapp` → Helm release name.\n- `./helm/myapp` → Helm chart location.\n- `-n production` → Kubernetes namespace.\n- `--create-namespace` → Creates namespace if it doesn't exist.\n- `-f values-prod.yaml` → Environment-specific configuration.\n- `--set image.tag=123` → Overrides the image tag.",
      '**Check deployment** - `helm list -n production`, `helm status myapp -n production`, `helm history myapp -n production`',
      'You can also verify the Kubernetes rollout: `kubectl rollout status deployment/myapp -n production`',
      '**Helm rollback** - First check the release history: `helm history myapp -n production`',
      'If revision 3 has an issue and you want to go back to revision 2: `helm rollback myapp 2 -n production`',
      'Then verify: `helm status myapp -n production`, `helm history myapp -n production`',
      'And: `kubectl rollout status deployment/myapp -n production`',
      '**Important interview point**',
      "Don't confuse Helm rollback with Kubernetes rollback.",
      'Helm: `helm rollback myapp 2 -n production`',
      'Kubernetes: `kubectl rollout undo deployment/myapp -n production`',
      'If the application was deployed and managed by Helm, I generally prefer Helm rollback, because Helm understands the release history and restores the chart configuration associated with that revision.',
      '**Typical CI/CD flow** (see code below)',
      '**Interview answer** - "For deployment, I normally use `helm upgrade --install`, which installs the release if it doesn\'t exist and upgrades it if it already exists. I pass the environment-specific values file and the Docker image tag generated by the CI pipeline. After deployment, I verify the Helm release and Kubernetes rollout. If the new version causes an issue, I check `helm history` and execute `helm rollback <release> <revision> -n <namespace>` to restore the previous Helm release."',
    ],
    code: [
      {
        title: 'The standard command is',
        language: 'bash',
        code: `helm upgrade --install myapp ./helm/myapp \\
  -n production \\
  --create-namespace \\
  -f values-prod.yaml \\
  --set image.tag=123`,
      },
      {
        title: 'Check deployment - commands',
        language: 'bash',
        code: `helm list -n production
helm status myapp -n production
helm history myapp -n production

kubectl rollout status deployment/myapp -n production`,
      },
      {
        title: 'Helm rollback - commands',
        language: 'bash',
        code: `helm history myapp -n production

helm rollback myapp 2 -n production

helm status myapp -n production
helm history myapp -n production

kubectl rollout status deployment/myapp -n production`,
      },
      {
        title: 'Helm rollback - Example',
        language: 'text',
        code: `REVISION   STATUS
1          superseded
2          superseded
3          deployed`,
      },
      {
        title: 'Important interview point - commands',
        language: 'bash',
        code: `helm rollback myapp 2 -n production

kubectl rollout undo deployment/myapp -n production`,
      },
      {
        title: 'Typical CI/CD flow',
        language: 'text',
        code: `Build application
       |
       v
Build Docker image
       |
       v
Push image to ACR
       |
       v
helm upgrade --install
       |
       v
AKS deployment
       |
       v
Health/rollout check
       |
       v
PASS -> Continue
FAIL -> helm rollback`,
      },
    ],
    tags: ['helm', 'rollback', 'kubernetes'],
  },
  {
    id: 'itv-rdel-14',
    level: 'intermediate',
    kind: 'open',
    prompt: 'How do you avoid duplicating YAML across Azure DevOps pipelines?',
    probing:
      'Whether you know step, job and stage templates with parameters, and how to share them across repositories.',
    answer: [
      'In Azure DevOps, I avoid duplicating YAML by using templates, parameters, variables, and stages/jobs templates.',
      'The most common approach is to create reusable YAML templates and pass parameters to them.',
      '**Example** - Suppose I have `dev`, `qa`, and `prod` stages. Instead of writing the same deployment steps three times: (see code below)',
      '**1. Create a reusable template**',
      '`templates/deploy.yml`',
      '**2. Reuse the template**',
      'In `azure-pipelines.yml`: (see code below)',
      'Now the deployment logic exists only once.',
      '**Another common approach: steps template**',
      'If only the steps are repeated, I use a steps template.',
      '`templates/build-steps.yml`: (see code below)',
      '**What I use in real projects**',
      'I normally structure it like: (see code below)',
      'The main pipeline becomes mostly orchestration: (see code below)',
      'For multiple repositories, I would take this one step further and use an Azure DevOps YAML repository / centralized template repository. That allows many pipelines to consume the same templates.',
      '**Interview answer** - "I avoid duplicating YAML by creating reusable templates. Depending on the requirement, I use step templates for common steps, job templates for reusable jobs, and stage templates for complete environment deployments. I pass environment-specific values such as environment name, namespace, replica count, and image tag through parameters. For organization-wide reuse, I keep these templates in a centralized Azure Repos repository and reference them from different application pipelines. This gives us one place to maintain common CI/CD logic instead of modifying every pipeline individually."',
    ],
    code: [
      {
        title: 'Example',
        language: 'text',
        code: `azure-pipelines.yml
templates/
  build.yml
  deploy.yml`,
      },
      {
        title: 'Create a reusable template',
        language: 'yaml',
        code: `parameters:
- name: environment
  type: string

- name: namespace
  type: string

- name: replicas
  type: number
  default: 2

stages:
- stage: Deploy_\${{ parameters.environment }}
  displayName: Deploy to \${{ parameters.environment }}

  jobs:
  - job: Deploy
    steps:
    - script: |
        echo "Deploying to \${{ parameters.environment }}"
        echo "Namespace: \${{ parameters.namespace }}"
        echo "Replicas: \${{ parameters.replicas }}"
      displayName: Deploy application`,
      },
      {
        title: 'In azure-pipelines.yml',
        language: 'yaml',
        code: `trigger:
- main

stages:

- template: templates/deploy.yml
  parameters:
    environment: dev
    namespace: dev
    replicas: 1

- template: templates/deploy.yml
  parameters:
    environment: qa
    namespace: qa
    replicas: 2

- template: templates/deploy.yml
  parameters:
    environment: prod
    namespace: prod
    replicas: 3`,
      },
      {
        title: 'templates/build-steps.yml',
        language: 'yaml',
        code: `steps:

- checkout: self

- script: |
    npm install
    npm test
    npm run build
  displayName: Build and Test

- task: Docker@2
  inputs:
    command: buildAndPush
    repository: myapp
    tags: |
      $(Build.BuildId)`,
      },
      {
        title: 'Another common approach: steps template - Then',
        language: 'yaml',
        code: `stages:

- stage: Dev
  jobs:
  - job: Build
    steps:
    - template: templates/build-steps.yml

- stage: QA
  jobs:
  - job: Build
    steps:
    - template: templates/build-steps.yml`,
      },
      {
        title: 'I normally structure it like',
        language: 'text',
        code: `azure-pipelines.yml
templates/
├── build.yml
├── test.yml
├── sonar.yml
├── docker-build.yml
├── helm-deploy.yml
└── security-scan.yml`,
      },
      {
        title: 'The main pipeline becomes mostly orchestration',
        language: 'text',
        code: `Main Pipeline
     |
     +-- Build template
     |
     +-- Test template
     |
     +-- SonarQube template
     |
     +-- Docker template
     |
     +-- Deploy template`,
      },
    ],
    tags: ['azure devops', 'templates', 'yaml'],
  },
  {
    id: 'itv-rdel-15',
    level: 'advanced',
    kind: 'open',
    prompt: 'How do you integrate Azure DevOps with Kubernetes/AKS?',
    probing:
      'Whether you can wire CI to ACR and CD to AKS end to end, and know the two separate authentication paths (pipeline to Azure, AKS to ACR).',
    answer: [
      'You integrate Azure DevOps with Kubernetes/AKS mainly to automate application deployment through a CI/CD pipeline.',
      '**End-to-end flow** (see code below)',
      '**1. Create Azure resources** - Typically I use:',
      '- Azure Container Registry (ACR) for Docker images\n- AKS for Kubernetes\n- Azure DevOps for source code and CI/CD\n- Helm for Kubernetes deployments',
      '**2. Create Azure DevOps Service Connection**',
      'For Azure resources, I create an Azure Resource Manager service connection.',
      'The service connection provides authentication without putting Azure credentials directly inside the YAML file.',
      '**3. Build and push Docker image** (see code below)',
      'This builds `myapp:<BuildId>` and pushes it to ACR.',
      '**4. Connect Azure DevOps to AKS**',
      'There are different approaches.',
      'For AKS, I commonly use the Azure Resource Manager service connection with the Kubernetes/AKS deployment task.',
      'Azure DevOps obtains the AKS credentials and performs the deployment.',
      '**5. Using Helm** - In real projects, I would generally prefer Helm for application deployment.',
      'The important part is that the pipeline dynamically passes the newly built image tag into the Helm deployment.',
      '**6. Complete practical pipeline**',
      'A simplified pipeline could look like: (see code below)',
      '**7. How authentication works**',
      'There are actually two separate authentication requirements:',
      '**Azure DevOps → Azure/AKS**',
      'Use an Azure Resource Manager service connection.',
      '**AKS → ACR** - AKS also needs permission to pull the image from ACR.',
      'A common approach is to give the AKS kubelet identity the `AcrPull` role on the registry.',
      'This is important. Azure DevOps being able to push to ACR does not automatically mean AKS can pull from ACR.',
      '**Interview answer** - "I integrate Azure DevOps with AKS using CI/CD. In the CI stage, the pipeline checks out the code, runs unit tests and SonarQube analysis, builds the Docker image and pushes it to Azure Container Registry. For deployment, I configure an Azure Resource Manager service connection and use Helm or KubernetesManifest tasks to authenticate with AKS and deploy the application. We normally use Helm charts with environment-specific values and pass the Docker image tag generated by the CI pipeline. AKS is given AcrPull permission so that its kubelet identity can pull the image from ACR. After deployment, I verify the rollout using kubectl and monitor the application through Azure Monitor or Prometheus and Grafana."',
    ],
    code: [
      {
        title: 'End-to-end flow',
        language: 'text',
        code: `Developer
   |
   v
Git Repository
   |
   v
Azure DevOps CI Pipeline
   |
   +--> Build application
   +--> Unit tests
   +--> SonarQube scan
   +--> Build Docker image
   +--> Push image to ACR
   |
   v
Azure DevOps CD Pipeline
   |
   +--> Authenticate to AKS
   +--> Helm / kubectl
   +--> Deploy application
   |
   v
AKS Cluster
   |
   +--> Deployment
   +--> Service
   +--> Ingress
   +--> Pods`,
      },
      {
        title: 'Create Azure resources - Example',
        language: 'text',
        code: `Azure DevOps
     |
     +------> ACR
     |          |
     |          +--> application:v1.0
     |
     +------> AKS
                |
                +--> Pods
                +--> Services
                +--> Ingress`,
      },
      {
        title: 'Create Azure DevOps Service Connection - For example',
        language: 'text',
        code: `Azure DevOps
     |
     v
Azure Resource Manager Service Connection
     |
     +--> ACR
     +--> AKS`,
      },
      {
        title: 'Build and push Docker image - Example',
        language: 'yaml',
        code: `- task: Docker@2
  inputs:
    containerRegistry: 'ACR-Service-Connection'
    repository: 'myapp'
    command: 'buildAndPush'
    Dockerfile: '**/Dockerfile'
    tags: |
      $(Build.BuildId)`,
      },
      {
        title: 'Connect Azure DevOps to AKS - For example',
        language: 'yaml',
        code: `- task: KubernetesManifest@1
  inputs:
    action: deploy
    connectionType: azureResourceManager
    azureSubscriptionConnection: 'Azure-Service-Connection'
    azureResourceGroup: 'my-rg'
    kubernetesCluster: 'my-aks'
    namespace: 'default'
    manifests: |
      manifests/deployment.yaml
      manifests/service.yaml`,
      },
      {
        title: 'Using Helm - Example',
        language: 'yaml',
        code: `- task: HelmDeploy@1
  inputs:
    connectionType: 'Azure Resource Manager'
    azureSubscription: 'Azure-Service-Connection'
    azureResourceGroup: 'my-rg'
    kubernetesCluster: 'my-aks'
    namespace: 'production'
    command: 'upgrade'
    chartType: 'FilePath'
    chartPath: 'helm/myapp'
    releaseName: 'myapp'
    overrideValues: |
      image.repository=myacr.azurecr.io/myapp
      image.tag=$(Build.BuildId)`,
      },
      {
        title: 'A simplified pipeline could look like',
        language: 'yaml',
        code: `stages:

- stage: Build
  jobs:
  - job: Build
    steps:

    - checkout: self

    - task: SonarQubePrepare@7
      inputs:
        SonarQube: 'SonarQube-Connection'
        scannerMode: 'Other'

    - script: |
        mvn clean test
      displayName: 'Build and Test'

    - task: SonarQubeAnalyze@7

    - task: Docker@2
      inputs:
        containerRegistry: 'ACR-Service-Connection'
        repository: 'myapp'
        command: 'buildAndPush'
        Dockerfile: '**/Dockerfile'
        tags: |
          $(Build.BuildId)


- stage: Deploy
  dependsOn: Build
  jobs:
  - job: Deploy
    steps:

    - task: HelmDeploy@1
      inputs:
        connectionType: 'Azure Resource Manager'
        azureSubscription: 'Azure-Service-Connection'
        azureResourceGroup: 'my-rg'
        kubernetesCluster: 'my-aks'
        namespace: 'production'
        command: 'upgrade'
        chartType: 'FilePath'
        chartPath: 'helm/myapp'
        releaseName: 'myapp'
        install: true
        overrideValues: |
          image.repository=myacr.azurecr.io/myapp
          image.tag=$(Build.BuildId)`,
      },
      {
        title: 'Azure DevOps → Azure/AKS',
        language: 'text',
        code: `Azure DevOps
      |
      | Service Connection
      v
    Azure
      |
      +--> AKS
      +--> ACR`,
      },
      {
        title: 'AKS → ACR',
        language: 'text',
        code: `AKS kubelet identity
        |
        | AcrPull
        v
       ACR
        |
        v
   Docker image`,
      },
    ],
    followUps: [
      'How would you set the service connection up with workload identity federation so no secret is stored?',
      'How do you promote the same image tag from dev to prod instead of rebuilding it?',
    ],
    tags: ['azure devops', 'aks', 'acr', 'helm'],
  },
  {
    id: 'itv-rdel-16',
    level: 'intermediate',
    kind: 'open',
    prompt: 'How do you integrate SonarQube in an Azure DevOps pipeline?',
    probing:
      'Whether you know the Prepare - build - Analyze - Publish task order and how a failed quality gate stops a deployment.',
    answer: [
      'In an Azure DevOps CI pipeline, SonarQube is normally integrated as a sequence of tasks: `Code -> Build -> SonarQube analysis -> Quality Gate -> Publish artifact`',
      '**1. Create SonarQube project** - In SonarQube:',
      '- Create a project.\n- Note the Project Key.\n- Generate a SonarQube token.',
      'Example: `Project Key: my-java-app`',
      '**2. Create the Service Connection in Azure DevOps**',
      'In Azure DevOps: `Project Settings -> Service connections -> New service connection -> SonarQube` - Provide:',
      '- SonarQube server URL\n- Authentication token\n- Service connection name, for example `SonarQube-Connection`',
      'This allows the Azure DevOps pipeline to authenticate with SonarQube.',
      '**3. Install SonarQube extension**',
      'From Azure DevOps Marketplace, install the SonarQube/SonarCloud extension for your organization.',
      'Then the pipeline can use tasks such as:',
      '- `SonarQubePrepare`\n- `SonarQubeAnalyze`\n- `SonarQubePublish`',
      '**4. Add tasks to the YAML pipeline**',
      'For example, for a Maven application: (see code below)',
      'The important point is that `SonarQubePrepare` comes before the build, because it configures the scanner.',
      '**5. How the flow works** (see code below)',
      '**6. Quality Gate** - In a real project, I would also configure the pipeline so that a failed Quality Gate prevents the deployment.',
      '**Interview answer** - If the interviewer asks "How have you integrated SonarQube with Azure DevOps?", a good answer is:',
      '"I integrated SonarQube into Azure DevOps CI pipelines using the SonarQube Azure DevOps extension. First, I created a SonarQube project and configured a SonarQube service connection in Azure DevOps using the authentication token. In the YAML pipeline, I use `SonarQubePrepare` before the build, then execute the application build and unit tests, followed by `SonarQubeAnalyze` and `SonarQubePublish`. The analysis results are sent to the SonarQube server, where it checks bugs, vulnerabilities, code smells and coverage against the configured Quality Gate. If the Quality Gate fails, we prevent the pipeline from progressing to deployment."',
      "**Important:** The exact task versions and scanner configuration depend on whether you're analyzing Maven, Gradle, .NET, Node.js, or another language.",
    ],
    code: [
      {
        title: 'Pipeline flow - snippet',
        language: 'text',
        code: `Code -> Build -> SonarQube analysis -> Quality Gate -> Publish artifact`,
      },
      {
        title: 'Create SonarQube project - snippet',
        language: 'text',
        code: `Project Key: my-java-app`,
      },
      {
        title: 'Create the Service Connection in Azure DevOps - snippet',
        language: 'text',
        code: `Project Settings -> Service connections -> New service connection -> SonarQube`,
      },
      {
        title: 'For example, for a Maven application',
        language: 'yaml',
        code: `trigger:
- main

pool:
  vmImage: ubuntu-latest

steps:

- task: SonarQubePrepare@7
  inputs:
    SonarQube: 'SonarQube-Connection'
    scannerMode: 'Other'
    extraProperties: |
      sonar.projectKey=my-java-app
      sonar.projectName=my-java-app

- task: Maven@4
  inputs:
    mavenPomFile: 'pom.xml'
    goals: 'clean verify'
    publishJUnitResults: true

- task: SonarQubeAnalyze@7

- task: SonarQubePublish@7
  inputs:
    pollingTimeoutSec: '300'`,
      },
      {
        title: 'How the flow works',
        language: 'text',
        code: `Developer
   |
   v
Git Repository
   |
   v
Azure DevOps Pipeline
   |
   +--> SonarQubePrepare
   |
   +--> Build / Unit Tests
   |
   +--> SonarQubeAnalyze
   |
   +--> SonarQube Server
   |       |
   |       +--> Bugs
   |       +--> Vulnerabilities
   |       +--> Code Smells
   |       +--> Code Coverage
   |       +--> Quality Gate
   |
   +--> SonarQubePublish
   |
   v
Pipeline Result`,
      },
      {
        title: 'Quality Gate - For example',
        language: 'text',
        code: `Quality Gate
   |
   +-- Bugs = 0
   +-- Vulnerabilities = 0
   +-- Coverage >= 80%
   +-- Code Smells within threshold
   |
   +-- PASS --> Continue deployment
   |
   +-- FAIL --> Stop pipeline`,
      },
    ],
    tags: ['sonarqube', 'azure devops', 'quality gate'],
  },
  {
    id: 'itv-rdel-17',
    level: 'advanced',
    kind: 'open',
    prompt: 'How would you improve/optimize Kubernetes deployments, with and without Helm?',
    probing:
      'Whether you can improve raw-manifest and Helm deployments alike - immutable tags, probes, rolling strategy, validation - and explain when Helm earns its keep.',
    answer: [
      '**1. Deployment without Helm**',
      'Without Helm, we manage Kubernetes manifests directly: (see code below)',
      'Azure DevOps pipeline can deploy them using `kubectl` or `KubernetesManifest@1`.',
      'Or directly: `kubectl apply -f k8s/`',
      '**How I improve this**',
      'I avoid hardcoding image tags: `image: myacr.azurecr.io/myapp:latest`',
      'Instead: `image: myacr.azurecr.io/myapp:$(Build.BuildId)`',
      'Then I can deploy a specific immutable version.',
      'I also use: `kubectl rollout status deployment/myapp` and: `kubectl rollout history deployment/myapp`',
      'For rollback: `kubectl rollout undo deployment/myapp`',
      '**2. Deployment with Helm**',
      'With Helm, I package the Kubernetes resources into a Helm chart.',
      'Instead of maintaining separate manifests for every environment, I keep common templates and change values.',
      'Helm keeps track of the release, which makes upgrades and rollbacks easier. `helm history myapp`',
      'Rollback: `helm rollback myapp 2`',
      '**3. How I improve the deployment**',
      'I would use several practices.',
      "**Immutable image tags** - Don't use: `latest` - Use:",
      '- Build ID\n- Git commit SHA\n- Release version',
      'For example: `myapp:20260822.15`',
      '**Environment-specific values**',
      '`values-dev.yaml`, `values-qa.yaml`, `values-prod.yaml`',
      'Keep the Helm template common and only change environment-specific configuration.',
      '**Health checks** (see code below)',
      'This prevents traffic from reaching an unhealthy application.',
      '**Rolling deployment**',
      'Use Kubernetes rolling updates: (see code below)',
      'This allows the new version to come up before taking the old version down.',
      '**Automated validation**',
      'Before deployment: `helm lint ./helm/myapp`, `helm template myapp ./helm/myapp`',
      "You can also run security/scanning tools such as Trivy or Checkov depending on what you're scanning.",
      'After deployment: `kubectl rollout status deployment/myapp -n production`, `kubectl get pods -n production`',
      '**Helm vs without Helm**',
      '- **Without Helm:** Manage raw YAML - **With Helm:** Package Kubernetes resources as charts\n- **Without Helm:** `kubectl apply` - **With Helm:** `helm upgrade/install`\n- **Without Helm:** More YAML duplication across environments - **With Helm:** Reusable templates\n- **Without Helm:** Rollback through Kubernetes revisions - **With Helm:** Helm release rollback\n- **Without Helm:** Configuration management is manual - **With Helm:** `values.yaml` handles configuration\n- **Without Helm:** Simple applications - **With Helm:** Better for complex/multi-environment applications',
      '**Interview answer** - "I have used both approaches. Without Helm, I maintain Kubernetes manifests and deploy them through kubectl or the KubernetesManifest task in Azure DevOps. I use immutable image tags, rolling updates, readiness and liveness probes, and verify the rollout after deployment. For larger applications, I prefer Helm because it provides reusable templates and environment-specific values. The pipeline builds the Docker image, pushes it to ACR, and passes the generated image tag to Helm. We use `helm upgrade --install` for deployment, `helm history` for release tracking, and `helm rollback` when we need to revert. Before deployment, I validate the chart using `helm lint` and `helm template`, and after deployment I verify the Kubernetes rollout."',
    ],
    code: [
      {
        title: 'Without Helm, we manage Kubernetes manifests directly',
        language: 'text',
        code: `deployment.yaml
service.yaml
configmap.yaml
secret.yaml
ingress.yaml`,
      },
      {
        title: 'Deployment without Helm - Example',
        language: 'yaml',
        code: `- task: KubernetesManifest@1
  inputs:
    action: deploy
    connectionType: azureResourceManager
    azureSubscriptionConnection: 'Azure-Connection'
    azureResourceGroup: 'my-rg'
    kubernetesCluster: 'my-aks'
    manifests: |
      k8s/deployment.yaml
      k8s/service.yaml
      k8s/ingress.yaml`,
      },
      {
        title: 'Deployment without Helm - commands',
        language: 'bash',
        code: `kubectl apply -f k8s/`,
      },
      {
        title: 'How I improve this - snippet',
        language: 'yaml',
        code: `image: myacr.azurecr.io/myapp:latest

image: myacr.azurecr.io/myapp:$(Build.BuildId)`,
      },
      {
        title: 'How I improve this - commands',
        language: 'bash',
        code: `kubectl rollout status deployment/myapp

kubectl rollout history deployment/myapp

kubectl rollout undo deployment/myapp`,
      },
      {
        title: 'Deployment with Helm',
        language: 'text',
        code: `myapp/
├── Chart.yaml
├── values.yaml
├── values-dev.yaml
├── values-qa.yaml
├── values-prod.yaml
└── templates/
    ├── deployment.yaml
    ├── service.yaml
    ├── ingress.yaml
    └── configmap.yaml`,
      },
      {
        title: 'Deployment with Helm - For example',
        language: 'yaml',
        code: `image:
  repository: myacr.azurecr.io/myapp
  tag: "1234"

replicaCount: 3`,
      },
      {
        title: 'Deployment with Helm - Then',
        language: 'bash',
        code: `helm upgrade --install myapp ./helm/myapp \\
  -f ./helm/myapp/values-prod.yaml \\
  --set image.tag=1234 \\
  -n production`,
      },
      {
        title: 'Deployment with Helm - commands',
        language: 'bash',
        code: `helm history myapp

helm rollback myapp 2`,
      },
      {
        title: 'Immutable image tags - snippet',
        language: 'text',
        code: `latest

myapp:20260822.15`,
      },
      {
        title: 'Environment-specific values - snippet',
        language: 'text',
        code: `values-dev.yaml
values-qa.yaml
values-prod.yaml`,
      },
      {
        title: 'Health checks - Configure',
        language: 'yaml',
        code: `livenessProbe:
readinessProbe:
startupProbe:`,
      },
      {
        title: 'Use Kubernetes rolling updates',
        language: 'yaml',
        code: `strategy:
  type: RollingUpdate
  rollingUpdate:
    maxSurge: 1
    maxUnavailable: 0`,
      },
      {
        title: 'Automated validation - commands',
        language: 'bash',
        code: `helm lint ./helm/myapp
helm template myapp ./helm/myapp

kubectl rollout status deployment/myapp -n production
kubectl get pods -n production`,
      },
    ],
    followUps: [
      'How would you make the pipeline roll back automatically when the rollout check fails?',
      'When would you pick Kustomize over Helm?',
    ],
    tags: ['kubernetes', 'helm', 'deployments'],
  },
  {
    id: 'itv-rdel-18',
    level: 'intermediate',
    kind: 'open',
    prompt: 'How do you reduce Docker build time?',
    probing:
      'Whether you understand layer caching and build context, and know the CI-specific tricks such as registry-backed BuildKit cache.',
    answer: [
      'To reduce Docker build time, I focus mainly on Docker layer caching, build context, dependency installation, and BuildKit.',
      '**1. Use Docker layer caching**',
      'Docker reuses unchanged layers. So put frequently changing files toward the end.',
      'Every source-code change can invalidate the dependency layer.',
      'Now `npm ci` can use the cache when only application code changes.',
      '**2. Use `.dockerignore`**',
      "Don't send unnecessary files to the Docker daemon.",
      'A smaller build context means less data to transfer and process.',
      '**3. Use multi-stage builds** (see code below)',
      'This improves the final image size and avoids carrying build dependencies into production.',
      '**4. Use BuildKit/build cache**',
      'In Azure DevOps, I can use Docker BuildKit or buildx caching.',
      'This is especially useful with self-hosted agents where builds happen frequently.',
      "**5. Don't install unnecessary packages** (see code below)",
      'Combine related operations: (see code below)',
      'This reduces layers and unnecessary data.',
      '**6. Use appropriate base images**',
      "Don't automatically use huge images.",
      'For example: `ubuntu` may be much larger than: `alpine` or a language-specific slim image: `python:3.12-slim`, `node:20-slim`',
      "But I wouldn't choose Alpine blindly. Some applications have compatibility issues with musl libc.",
      '**7. Parallelize independent pipeline work**',
      "Docker itself isn't the only source of build time.",
      'In Azure DevOps, I can run independent activities in parallel: (see code below)',
      'Then build the Docker image after the required validations complete.',
      '**Interview answer** - "To reduce Docker build time, I first optimize Docker layer caching. I copy dependency files such as package.json or pom.xml before copying the application source, so dependency installation can be reused when only source code changes. I use a proper .dockerignore to reduce the build context, multi-stage builds to separate build and runtime dependencies, and BuildKit or buildx with registry-based caching for CI pipelines. I also avoid unnecessary packages and layers and choose appropriate base images. In Azure DevOps, I combine this with pipeline caching and parallel execution of independent tests and scans. The main goal is to make sure that unchanged layers are reused instead of rebuilding everything on every commit."',
    ],
    code: [
      {
        title: 'Use Docker layer caching - Bad',
        language: 'dockerfile',
        code: `COPY . .
RUN npm install`,
      },
      {
        title: 'Use Docker layer caching - Better',
        language: 'dockerfile',
        code: `COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build`,
      },
      {
        title: 'Use .dockerignore',
        language: 'text',
        code: `.git
node_modules
target
*.log
.env
README.md`,
      },
      {
        title: 'Use multi-stage builds - For example',
        language: 'dockerfile',
        code: `FROM node:20 AS builder

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build


FROM nginx:alpine

COPY --from=builder /app/dist /usr/share/nginx/html`,
      },
      {
        title: 'Use BuildKit/build cache - For example',
        language: 'bash',
        code: `docker buildx build \\
  --cache-from type=registry,ref=myacr.azurecr.io/myapp:buildcache \\
  --cache-to type=registry,ref=myacr.azurecr.io/myapp:buildcache,mode=max \\
  -t myacr.azurecr.io/myapp:$(Build.BuildId) .`,
      },
      {
        title: "Don't install unnecessary packages - Instead of",
        language: 'dockerfile',
        code: `RUN apt-get update
RUN apt-get install -y package1
RUN apt-get install -y package2`,
      },
      {
        title: 'Combine related operations',
        language: 'dockerfile',
        code: `RUN apt-get update && \\
    apt-get install -y package1 package2 && \\
    rm -rf /var/lib/apt/lists/*`,
      },
      {
        title: 'Use appropriate base images - snippet',
        language: 'text',
        code: `ubuntu

alpine

python:3.12-slim
node:20-slim`,
      },
      {
        title: 'In Azure DevOps, I can run independent activities in parallel',
        language: 'text',
        code: `             +--> Unit Tests
             |
Code --------+--> SonarQube
             |
             +--> Dependency Scan`,
      },
    ],
    tags: ['docker', 'build cache', 'ci/cd'],
  },
  {
    id: 'itv-rdel-19',
    level: 'intermediate',
    kind: 'open',
    prompt: 'How do you use multiple agents in an Azure DevOps YAML pipeline?',
    probing:
      'Whether you know that one job runs on one agent, so parallelism and different pools come from splitting work into jobs.',
    answer: [
      'In Azure DevOps YAML, you use multiple agents by defining multiple jobs. Each job can run on a different agent or agent pool. The key point is:',
      'One job runs on one agent. Multiple jobs can run on multiple agents, and independent jobs can execute in parallel.',
      '**1. Multiple Microsoft-hosted agents** (see code below)',
      'Here Azure DevOps can allocate two separate agents: (see code below)',
      'These jobs can run in parallel because there is no dependency between them.',
      '**2. Different self-hosted agent pools**',
      'You can also have different agents for different requirements.',
      'This is useful when a particular workload requires a specific OS or installed software.',
      '**3. Sequential jobs using dependencies**',
      'If the second job depends on the first: (see code below)',
      'Notice that Deploy can use a completely different agent.',
      '**4. Parallel jobs** - For CI, this is a common pattern: (see code below)',
      'This reduces total pipeline execution time.',
      '**Important interview point**',
      'Don\'t say "I specify three agents in one job." That\'s not how Azure DevOps works.',
      'The correct explanation is:',
      '"Azure DevOps assigns one agent to each job. If I need multiple agents, I split the work into multiple jobs. Independent jobs can run in parallel on different agents, and I can specify different agent pools for different jobs. If there is a dependency, I use `dependsOn` to execute the jobs sequentially."',
    ],
    code: [
      {
        title: 'Multiple Microsoft-hosted agents',
        language: 'yaml',
        code: `stages:

- stage: Build
  jobs:

  - job: Backend
    pool:
      vmImage: ubuntu-latest
    steps:
    - script: |
        echo "Building backend"
        mvn clean package

  - job: Frontend
    pool:
      vmImage: ubuntu-latest
    steps:
    - script: |
        echo "Building frontend"
        npm install
        npm run build`,
      },
      {
        title: 'Here Azure DevOps can allocate two separate agents',
        language: 'text',
        code: `                 Build Stage
                     |
          +----------+----------+
          |                     |
          v                     v
     Agent 1                Agent 2
     Backend                Frontend
        |                      |
      Maven                   npm`,
      },
      {
        title: 'Different self-hosted agent pools',
        language: 'yaml',
        code: `jobs:

- job: Build
  pool:
    name: Linux-Agent-Pool
  steps:
  - script: ./build.sh

- job: WindowsBuild
  pool:
    name: Windows-Agent-Pool
  steps:
  - powershell: .\\build.ps1`,
      },
      {
        title: 'Different self-hosted agent pools - For example',
        language: 'text',
        code: `Linux Agent Pool
    |
    +--> Agent 1 --> Linux build


Windows Agent Pool
    |
    +--> Agent 2 --> Windows build`,
      },
      {
        title: 'If the second job depends on the first',
        language: 'yaml',
        code: `jobs:

- job: Build
  pool:
    vmImage: ubuntu-latest
  steps:
  - script: |
      echo "Build application"

- job: Deploy
  dependsOn: Build
  pool:
    vmImage: ubuntu-latest
  steps:
  - script: |
      echo "Deploy application"`,
      },
      {
        title: 'Sequential jobs using dependencies - Flow',
        language: 'text',
        code: `Agent 1
Build
  |
  | completed
  v
Agent 2
Deploy`,
      },
      {
        title: 'For CI, this is a common pattern',
        language: 'yaml',
        code: `jobs:

- job: UnitTests
  pool:
    vmImage: ubuntu-latest
  steps:
  - script: npm test

- job: SonarQube
  pool:
    vmImage: ubuntu-latest
  steps:
  - script: echo "Run SonarQube"

- job: SecurityScan
  pool:
    vmImage: ubuntu-latest
  steps:
  - script: echo "Run security scan"`,
      },
      {
        title: 'Parallel jobs',
        language: 'text',
        code: `                    Pipeline
                       |
       +---------------+---------------+
       |               |               |
       v               v               v
    Agent 1          Agent 2         Agent 3
   Unit Test        SonarQube      Security Scan`,
      },
    ],
    tags: ['azure devops', 'agents', 'jobs'],
  },
  {
    id: 'itv-rdel-21',
    level: 'advanced',
    kind: 'open',
    prompt:
      'Write an Azure DevOps YAML pipeline for a React + Spring Boot application deployed to AKS through ACR',
    promptCode: [
      {
        title: 'Scenario',
        language: 'text',
        code: `Application stack:

1. React
2. Spring Boot
3. AKS
4. ACR

Task: Write Azure DevOps YAML.

Expected (as given):`,
      },
      {
        title: 'Expected stages (as given)',
        language: 'yaml',
        code: `trigger:
- main

stages:
- Build
- Test
- SonarQube
- DockerBuild
- TrivyScan
- PushACR
- DeployDev
- Approval
- DeployProd`,
      },
    ],
    probing:
      'Whether you can write a real multi-stage pipeline with gates and approvals, and promote one immutable image instead of rebuilding per environment.',
    answer: [
      'One correction to the expected answer: Azure DevOps stages need proper YAML objects. You cannot simply write `- Build`, `- Test`, etc. Each stage needs a `stage:` property.',
      '**Full pipeline** (see code below)',
      '**Simple flow** (see code below)',
      '**What each stage does**',
      '- **Build**: Builds React and Spring Boot\n- **Test**: Runs application/unit tests\n- **SonarQube**: Checks code quality and vulnerabilities\n- **DockerBuild**: Creates the Spring Boot Docker image\n- **TrivyScan**: Scans the image for HIGH/CRITICAL vulnerabilities\n- **PushACR**: Pushes the image to Azure Container Registry\n- **DeployDev**: Deploys the image to AKS Dev\n- **Approval**: Waits for manual approval\n- **DeployProd**: Deploys the same validated image to AKS Prod',
      "**Important interview point** - Don't say:",
      '"I build another Docker image for production." That\'s bad practice.',
      'Build once, scan once, push one immutable image, and promote the same image tag from Dev to Prod.',
      'That gives you confidence that the exact artifact tested in Dev is the artifact deployed to Production.',
    ],
    code: [
      {
        title: 'Full pipeline',
        language: 'yaml',
        code: `trigger:
  - main

variables:
  acrName: 'myacr'
  imageName: 'payment-api'
  imageTag: '$(Build.BuildId)'
  aksDev: 'aks-dev'
  aksProd: 'aks-prod'
  namespace: 'payment'

stages:

# --------------------------------------------------
# 1. BUILD
# --------------------------------------------------
- stage: Build
  displayName: Build React and Spring Boot
  jobs:
  - job: Build
    steps:

    # React
    - task: NodeTool@0
      inputs:
        versionSpec: '18.x'

    - script: |
        cd frontend
        npm install
        npm run build
      displayName: Build React Application

    # Spring Boot
    - task: JavaToolInstaller@0
      inputs:
        versionSpec: '17'
        jdkArchitectureOption: 'x64'
        jdkSourceOption: 'PreInstalled'

    - script: |
        cd backend
        ./mvnw clean package -DskipTests
      displayName: Build Spring Boot Application


# --------------------------------------------------
# 2. TEST
# --------------------------------------------------
- stage: Test
  displayName: Run Tests
  dependsOn: Build
  jobs:
  - job: Test
    steps:

    - script: |
        cd backend
        ./mvnw test
      displayName: Run Spring Boot Tests

    - script: |
        cd frontend
        npm test -- --watchAll=false
      displayName: Run React Tests


# --------------------------------------------------
# 3. SONARQUBE
# --------------------------------------------------
- stage: SonarQube
  displayName: SonarQube Analysis
  dependsOn: Test
  jobs:
  - job: SonarQube
    steps:

    - task: SonarQubePrepare@7
      inputs:
        SonarQube: 'SonarQube-Service-Connection'
        scannerMode: 'cli'
        configMode: 'manual'
        cliProjectKey: 'payment-api'
        cliProjectName: 'payment-api'

    - script: |
        cd backend
        ./mvnw verify sonar:sonar
      displayName: Run SonarQube Scan

    - task: SonarQubePublish@7
      inputs:
        pollingTimeoutSec: '300'


# --------------------------------------------------
# 4. DOCKER BUILD
# --------------------------------------------------
- stage: DockerBuild
  displayName: Build Docker Image
  dependsOn: SonarQube
  jobs:
  - job: DockerBuild
    steps:

    - task: Docker@2
      displayName: Build Docker Image
      inputs:
        command: build
        repository: $(imageName)
        Dockerfile: 'backend/Dockerfile'
        tags: |
          $(imageTag)


# --------------------------------------------------
# 5. TRIVY SCAN
# --------------------------------------------------
- stage: TrivyScan
  displayName: Scan Docker Image
  dependsOn: DockerBuild
  jobs:
  - job: Trivy
    steps:

    - script: |
        trivy image \\
          --severity HIGH,CRITICAL \\
          --exit-code 1 \\
          $(imageName):$(imageTag)
      displayName: Trivy Security Scan


# --------------------------------------------------
# 6. PUSH IMAGE TO ACR
# --------------------------------------------------
- stage: PushACR
  displayName: Push Image to ACR
  dependsOn: TrivyScan
  jobs:
  - job: Push
    steps:

    - task: Docker@2
      displayName: Login and Push to ACR
      inputs:
        command: buildAndPush
        repository: $(imageName)
        dockerfile: 'backend/Dockerfile'
        containerRegistry: 'ACR-Service-Connection'
        tags: |
          $(imageTag)


# --------------------------------------------------
# 7. DEPLOY TO DEV
# --------------------------------------------------
- stage: DeployDev
  displayName: Deploy to Development
  dependsOn: PushACR
  jobs:
  - deployment: DeployDev
    environment: 'Dev'
    strategy:
      runOnce:
        deploy:
          steps:

          - task: KubernetesManifest@1
            displayName: Deploy to AKS Dev
            inputs:
              action: deploy
              kubernetesServiceConnection: 'AKS-Dev-Service-Connection'
              namespace: $(namespace)
              manifests: |
                k8s/deployment.yaml
                k8s/service.yaml
              containers: |
                $(acrName).azurecr.io/$(imageName):$(imageTag)


# --------------------------------------------------
# 8. APPROVAL
# --------------------------------------------------
- stage: Approval
  displayName: Production Approval
  dependsOn: DeployDev
  jobs:
  - job: Approval
    pool: server
    steps:
    - task: ManualValidation@1
      inputs:
        notifyUsers: |
          devops-team@company.com
        instructions: |
          Please validate the Dev deployment.
          Approve to continue deployment to Production.
        onTimeout: 'reject'


# --------------------------------------------------
# 9. DEPLOY TO PROD
# --------------------------------------------------
- stage: DeployProd
  displayName: Deploy to Production
  dependsOn: Approval
  condition: succeeded()
  jobs:
  - deployment: DeployProd
    environment: 'Production'
    strategy:
      runOnce:
        deploy:
          steps:

          - task: KubernetesManifest@1
            displayName: Deploy to AKS Production
            inputs:
              action: deploy
              kubernetesServiceConnection: 'AKS-Prod-Service-Connection'
              namespace: $(namespace)
              manifests: |
                k8s/deployment.yaml
                k8s/service.yaml
              containers: |
                $(acrName).azurecr.io/$(imageName):$(imageTag)`,
      },
      {
        title: 'Simple flow',
        language: 'text',
        code: `Developer
    |
    v
Git Push -> main
    |
    v
Build
 |-- React build
 |-- Spring Boot build
    |
    v
Test
 |-- React tests
 |-- Spring Boot tests
    |
    v
SonarQube
    |
    v
Docker Build
    |
    v
Trivy Security Scan
    |
    v
Push Docker Image
    |
    v
Azure Container Registry
    |
    v
Deploy to AKS Dev
    |
    v
Manual Approval
    |
    v
Deploy to AKS Production`,
      },
      {
        title: 'Important interview point - For example',
        language: 'text',
        code: `payment-api:125
       |
       v
     ACR
       |
       +----> AKS Dev
       |
       +----> AKS Prod`,
      },
    ],
    followUps: [
      'Stages run on separate agents. How does the Trivy stage get the image that the DockerBuild stage built?',
      'How would you replace the ManualValidation stage with an approval check on the Production environment?',
    ],
    tags: ['azure devops', 'pipelines', 'aks', 'acr'],
  },
]
