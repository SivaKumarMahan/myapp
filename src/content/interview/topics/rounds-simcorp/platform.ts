import type { InterviewQuestion } from '../../../types'

/** SimCorp round: AKS upgrades, CI/CD checks, secrets, DR, incidents and Terraform state. */
export const roundsSimcorpPlatformQuestions: InterviewQuestion[] = [
  {
    id: 'itv-rsim-1',
    level: 'advanced',
    kind: 'open',
    prompt: 'How did you upgrade the Kubernetes version?',
    probing:
      'A structured AKS upgrade: compatibility checks, a lower-environment rehearsal, a rolling node upgrade protected by replicas and PDBs, and real validation afterwards.',
    answer: [
      'For an interview, answer this as an **AKS Kubernetes upgrade**. Keep it practical and structured.',
      '**Sample answer:** "In my project, we used **Azure Kubernetes Service (AKS)**. Before upgrading the Kubernetes version, I first checked the current cluster version and the supported upgrade versions.',
      'I reviewed the AKS release notes and checked whether our workloads, Helm charts, ingress controller, and other add-ons were compatible with the target version.',
      'Then I tested the upgrade in the lower environment first. I verified the application health, pod status, readiness/liveness probes, PDBs, resource requests and limits, and node capacity.',
      'After getting approval, we upgraded the cluster during a planned maintenance window. AKS performs a **rolling upgrade** of the nodes. It cordons and drains nodes and moves the workloads to other available nodes, so with proper replica configuration and PDBs, we can achieve zero or minimal downtime.',
      'After the upgrade, I verified the Kubernetes version, nodes, pods, services, ingress, application connectivity, and monitoring. I also checked the application logs and Azure Monitor/Prometheus dashboards.',
      'Finally, I performed smoke testing with the application team and monitored the cluster for some time to make sure there were no issues."',
      '**Commands to mention**',
      '**If they ask: "How did you achieve zero downtime?"**',
      '"We maintained multiple replicas, configured appropriate **PodDisruptionBudgets**, used **readiness probes**, and ensured sufficient **node capacity**. During the rolling node upgrade, workloads were rescheduled onto healthy nodes while traffic continued to go to the available pods."',
      '**If they ask: "What challenges did you face?"**',
      '"The main things I checked were deprecated Kubernetes APIs, incompatible Helm charts or ingress controllers, insufficient node capacity, PDBs preventing node draining, and workloads without proper readiness probes. We identified these in the lower environment before performing the production upgrade."',
    ],
    followUps: ['How did you achieve zero downtime?', 'What challenges did you face?'],
    code: [
      {
        title: 'Commands to mention — Check current version',
        language: 'bash',
        code: `kubectl version
kubectl get nodes`,
      },
      {
        title: 'For AKS, check available upgrades',
        language: 'bash',
        code: `az aks get-upgrades \\
  --resource-group <resource-group> \\
  --name <aks-cluster>`,
      },
      {
        title: 'Commands to mention — Upgrade',
        language: 'bash',
        code: `az aks upgrade \\
  --resource-group <resource-group> \\
  --name <aks-cluster> \\
  --kubernetes-version <target-version>`,
      },
      {
        title: 'Commands to mention — Verify after upgrade',
        language: 'bash',
        code: `kubectl get nodes
kubectl get pods -A
kubectl get deployments -A
kubectl get events -A`,
      },
    ],
    tags: ['aks', 'kubernetes upgrade', 'pdb'],
  },
  {
    id: 'itv-rsim-2',
    level: 'advanced',
    kind: 'open',
    prompt: 'What challenges did you face while upgrading the Kubernetes version?',
    probing:
      'One concrete, credible problem (deprecated APIs, a PDB blocking drain, capacity) with how you detected, fixed and validated it.',
    answer: [
      'For an interview, give a realistic AKS example rather than listing ten generic problems.',
      '**Sample answer:** "During one of our AKS upgrades, the main challenges were **compatibility** and **workload availability**.',
      'First, we checked for **deprecated Kubernetes APIs** because some older API versions are removed in newer Kubernetes releases. We reviewed our application manifests and Helm charts and updated them where required.',
      'Second, we had to make sure the **ingress controller and other Kubernetes add-ons** were compatible with the target version.',
      "Another challenge was **node draining**. Some pods could not be evicted immediately because of PodDisruptionBudgets or because the application didn't have enough replicas. We reviewed the PDB configuration and increased replicas where required.",
      'We also checked **node capacity** because during a rolling upgrade, workloads from a node being upgraded need to run on other available nodes.',
      'After the upgrade, we validated all nodes, pods, services and ingress, and checked application logs and monitoring dashboards. We also performed application smoke testing to confirm there was no functional impact."',
      '**If the interviewer asks for one specific incident**',
      '"One issue we faced was that a workload had a strict **PodDisruptionBudget allowing zero disruption**. During node drain, AKS couldn\'t evict the pod immediately. We identified this from the node drain events, reviewed the PDB configuration, and adjusted it to allow controlled disruption while maintaining application availability. After that, the node upgrade continued successfully."',
      '**Key challenges to remember**',
      '- **Deprecated APIs**: Update manifests/Helm charts\n- **Helm/add-on compatibility**: Verify supported versions\n- **PodDisruptionBudget**: Can block node draining\n- **Insufficient replicas**: Risk of application downtime\n- **Node capacity**: Ensure workloads can be rescheduled\n- **Readiness/liveness probes**: Verify they work correctly after upgrade\n- **Ingress/networking**: Validate ingress controller and connectivity\n- **Post-upgrade validation**: Check nodes, pods, services, logs and application health',
      "**Tip:** Don't say you faced all eight. Pick **one concrete problem**, explain how you detected it, fixed it, and validated the upgrade. That sounds much more credible.",
    ],
    followUps: [
      'How did you find deprecated APIs before the upgrade?',
      'What PDB setting blocks a node drain, and how did you change it?',
    ],
    tags: ['aks', 'kubernetes upgrade', 'troubleshooting'],
  },
  {
    id: 'itv-rsim-3',
    level: 'intermediate',
    kind: 'open',
    prompt:
      'What code tests and checks have you performed in CI/CD (for example SonarQube and Trivy)?',
    probing:
      'Layered quality and security gates, what fails the pipeline, and that SonarQube is primarily static code quality, not just a security scanner.',
    answer: [
      'In an interview, explain it as **multiple quality and security checks** in the CI pipeline, not just SonarQube and Trivy.',
      '**Sample answer:** "In our CI/CD pipeline, we performed different types of checks before deploying the application. The exact checks depended on the application, but our pipeline generally included code compilation, unit testing, code quality analysis, security scanning, Docker image scanning, and deployment validation.',
      'For **code quality**, we used **SonarQube** to check bugs, vulnerabilities, code smells, duplicated code, and code coverage. We configured a **quality gate**, and if the quality gate failed, the pipeline stopped.',
      'We also ran **unit tests** as part of the application build. For Java applications, we used Maven, for example `mvn test` or `mvn clean test`.',
      'For **container security**, after building the Docker image, we used **Trivy** to scan the image for vulnerabilities. If critical vulnerabilities crossed our configured threshold, the pipeline failed and the image was not pushed to ACR.',
      'We also performed **dependency/security checks** where required, checking third-party libraries for known vulnerabilities.',
      'After these checks passed, we pushed the image to **Azure Container Registry** and deployed it to **AKS**. After deployment, we performed health checks or smoke tests to verify that the application was running correctly."',
      '**Examples you can mention**',
      '- **Build/Compile**: Tool: Maven / npm; Purpose: Verify application builds successfully\n- **Unit Testing**: Tool: JUnit / Jest; Purpose: Validate application functionality\n- **Code Quality**: Tool: SonarQube; Purpose: Bugs, code smells, coverage, vulnerabilities\n- **Dependency Scan**: Tool: Trivy / Snyk; Purpose: Identify vulnerable dependencies\n- **Container Scan**: Tool: Trivy; Purpose: Scan Docker image vulnerabilities\n- **IaC Scan**: Tool: Checkov / tfsec; Purpose: Find Terraform/IaC security issues\n- **YAML Validation**: Tool: kubectl / pipeline validation; Purpose: Validate Kubernetes manifests\n- **Docker Validation**: Tool: Docker; Purpose: Verify image builds correctly\n- **Deployment Test**: Tool: kubectl / Helm; Purpose: Verify Kubernetes deployment\n- **Smoke Test**: Tool: curl / application tests; Purpose: Verify application is accessible',
      '**If they ask: "What happens if Trivy finds a CRITICAL vulnerability?"**',
      '"The Trivy scan returns a **non-zero exit code**, so the CI pipeline fails. We don\'t push that image to ACR or deploy it to AKS. We review the vulnerability, update the base image or dependency, rebuild the image, and run the scan again."',
      '**One important distinction**',
      "Don't say SonarQube is only a security scanner. It is primarily used for **static code quality analysis**, although it also identifies certain security issues.",
      'A strong interview sentence:',
      '"Our CI pipeline had quality gates at multiple levels: **unit tests** for functionality, **SonarQube** for code quality, **Trivy** for dependency and container vulnerabilities, and **post-deployment smoke tests** for application validation."',
    ],
    followUps: ['What happens if Trivy finds a CRITICAL vulnerability?'],
    code: [
      {
        title: 'Typical pipeline',
        language: 'text',
        code: `Developer Push / PR
        ↓
Checkout Code
        ↓
Build / Compile
        ↓
Unit Tests
        ↓
SonarQube Analysis
        ↓
SonarQube Quality Gate
        ↓
Dependency / Security Scan
        ↓
Docker Build
        ↓
Trivy Image Scan
        ↓
Push Image to ACR
        ↓
Deploy to AKS
        ↓
Smoke / Health Tests`,
      },
    ],
    tags: ['ci/cd', 'sonarqube', 'trivy', 'quality gates'],
  },
  {
    id: 'itv-rsim-4',
    level: 'intermediate',
    kind: 'open',
    prompt: 'How many YAML pipelines do you have for each environment in Azure DevOps?',
    probing:
      'One reusable multi-stage pipeline per application with environment stages, variable groups, environments for approvals and shared templates.',
    answer: [
      "For an interview, don't give an unnecessarily large number. Explain the pipeline design and environment separation clearly.",
      '**Sample answer:** "We followed a YAML-based CI/CD approach in Azure DevOps. We generally had **one main multi-stage YAML pipeline per application**, rather than creating a separate YAML pipeline for every environment.',
      'The same pipeline handled Development, QA, UAT, and Production through **separate stages**.',
      'For example: Build → Test → SonarQube → Docker Build → Trivy Scan → Push to ACR → Deploy Dev → Deploy QA → Deploy UAT → Approval → Deploy Production.',
      'We used **environment-specific variable groups** and **Azure DevOps Environments** for configuration and approvals. This avoided duplicating the same pipeline YAML for every environment."',
      '**If they ask: "Did you have separate pipelines?"**',
      '"For some applications or organizational requirements, we did have separate pipelines, but wherever possible we preferred a **single reusable multi-stage YAML pipeline**. We also used **YAML templates** for common build, security-scan, and deployment logic so that we didn\'t duplicate code across pipelines."',
    ],
    followUps: ['Did you have separate pipelines?'],
    code: [
      {
        title: 'Example structure',
        language: 'text',
        code: `azure-pipelines.yml
│
├── Build
├── Unit Test
├── SonarQube
├── Docker Build
├── Trivy Scan
├── Push to ACR
│
├── Deploy Dev
├── Deploy QA
├── Deploy UAT
└── Deploy Prod
        └── Approval`,
      },
      {
        title: 'Example structure — Environment mapping example',
        language: 'text',
        code: `Dev    → dev variable group  + dev AKS
QA     → qa variable group   + qa AKS
UAT    → uat variable group  + uat AKS
Prod   → prod variable group + prod AKS`,
      },
    ],
    tags: ['azure devops', 'yaml pipelines', 'environments'],
  },
  {
    id: 'itv-rsim-5',
    level: 'intermediate',
    kind: 'open',
    prompt: 'Where do you store your secrets?',
    probing:
      'Key Vault accessed through a service connection or managed identity, the CSI driver for AKS, and knowing Kubernetes Secrets are only base64-encoded.',
    answer: [
      'For an Azure DevOps + AKS project, the answer is **Azure Key Vault**.',
      '**Sample answer:** "We stored sensitive information such as database passwords, API keys, tokens, and certificates in **Azure Key Vault** rather than keeping them directly in the YAML pipeline or source code.',
      'Azure DevOps accessed Key Vault securely through a **service connection or managed identity**, depending on the setup. In the pipeline, we retrieved the required secrets at runtime and passed them to the deployment without hardcoding them.',
      'For AKS workloads, we could also use the **Azure Key Vault CSI Driver** to mount secrets into pods when required.',
      'Access to Key Vault was controlled using **Azure RBAC**, and we followed least-privilege access. We also enabled features such as **soft delete** and **purge protection** to protect secrets from accidental deletion."',
      '**If they ask: "Did you store secrets in Azure DevOps?"**',
      '"We avoided storing actual secret values directly in YAML. For **non-sensitive configuration**, we used variable groups. For **sensitive values**, we preferred Azure Key Vault and retrieved them securely during the pipeline or application runtime."',
      '**If they ask: "How does AKS access Key Vault?"**',
      '"We used a **User Assigned Managed Identity** with the required Key Vault permissions. For workloads that needed secrets inside the pod, we used the **Azure Key Vault CSI Driver**. This avoided putting credentials directly inside Kubernetes Secrets or application configuration."',
      '**Remember:** Kubernetes Secrets are not automatically secure just because they are called Secrets. They are only **base64-encoded** by default, so for sensitive production credentials, integrating AKS with Key Vault is a better approach.',
    ],
    followUps: ['Did you store secrets in Azure DevOps?', 'How does AKS access Key Vault?'],
    code: [
      {
        title: 'Simple architecture',
        language: 'text',
        code: `Azure DevOps Pipeline
        |
        | Managed Identity / Service Connection
        ↓
   Azure Key Vault
        |
        | Secret
        ↓
    AKS Deployment
        |
        ↓
       Pod`,
      },
      {
        title: 'Examples of secrets',
        language: 'text',
        code: `DB_USERNAME
DB_PASSWORD
API_KEY
CLIENT_SECRET
CERTIFICATE
CONNECTION_STRING`,
      },
    ],
    tags: ['key vault', 'secrets', 'aks'],
  },
  {
    id: 'itv-rsim-6',
    level: 'intermediate',
    kind: 'open',
    prompt: 'Will there be downtime when you rotate secrets in Key Vault?',
    probing:
      'That rotation itself causes no downtime; the risk depends on how the app reads the secret, handled with a verified new version and a rolling restart.',
    answer: [
      'Not necessarily. Secret rotation in Azure Key Vault itself does not cause application downtime. The impact depends on **how the application consumes the secret**.',
      '**Sample answer:** "No, rotating a secret in Azure Key Vault does not by itself cause downtime. The important point is how the application retrieves the secret.',
      'If the application **reads the secret dynamically at runtime**, the new value can be picked up without restarting the application.',
      'If the secret is **loaded only during application startup**, then we need to restart or redeploy the pods to pick up the new value. In AKS, we can avoid downtime by using multiple replicas and performing a **rolling restart**.',
      'We also make sure the new secret is validated before removing or invalidating the old secret, so that the application continues working during the rotation."',
      '**Example with AKS + Key Vault CSI Driver:** **Important detail:** Updating the mounted secret does not necessarily mean the application immediately uses the new value. If the application reads the secret only once at startup, you still need an application reload/restart.',
      '**Safe production rotation:** For AKS, use multiple replicas + rolling restart if the application needs a restart:',
      '**Short interview answer**',
      '"Key Vault secret rotation itself doesn\'t cause downtime. If the application needs a restart to consume the new secret, we use multiple replicas and a rolling restart so traffic continues to be served by healthy pods."',
    ],
    code: [
      {
        title: 'Example with AKS + Key Vault CSI Driver',
        language: 'text',
        code: `Old Secret
    ↓
Key Vault
    ↓
AKS Pod
    ↓
Rotate Secret
    ↓
New Secret
    ↓
CSI Driver updates mounted secret`,
      },
      {
        title: 'Safe production rotation',
        language: 'text',
        code: `1. Create new secret/version
          ↓
2. Verify new credential
          ↓
3. Update Key Vault
          ↓
4. Refresh/reload application
          ↓
5. Validate application
          ↓
6. Disable old credential`,
      },
      {
        title: 'Safe production rotation',
        language: 'bash',
        code: `kubectl rollout restart deployment <deployment-name>
kubectl rollout status deployment <deployment-name>`,
      },
    ],
    tags: ['key vault', 'secret rotation', 'aks'],
  },
  {
    id: 'itv-rsim-7',
    level: 'advanced',
    kind: 'open',
    prompt:
      'Dev, QA and UAT are in one resource group and subscription; Pre-Prod and Prod are in another, but both subscriptions are in the same region. How will you achieve disaster recovery?',
    probing:
      'Recognising that separate subscriptions in one region are not DR, and designing a secondary-region setup driven by RTO and RPO.',
    answer: [
      'The key issue: **separate subscriptions and resource groups in the same region are not, by themselves, disaster recovery.** If the entire Azure region goes down, both environments can be affected.',
      '**Sample answer:** "If Dev, QA and UAT are in one subscription and resource group, and Pre-Prod and Production are in another subscription and resource group, but both subscriptions are in the same Azure region, I would not consider that a complete DR setup.',
      'For disaster recovery, I would keep Production in the **primary region** and create the DR environment in a **different Azure region**. The DR resources can be in a separate subscription and resource group as well.',
      'For AKS, I would have a **secondary AKS cluster** in the DR region with the required networking, ACR access, Key Vault integration, ingress, monitoring and application configuration.',
      'For the database and persistent data, I would configure the appropriate Azure-native replication or backup mechanism, such as **geo-replication** or **geo-redundant backups**, depending on the database technology.',
      'We would also replicate or make available container images, secrets/configuration and infrastructure definitions in the DR region.',
      'During a regional disaster, we would deploy or activate the application in the DR region, switch DNS or traffic through **Azure Front Door / Traffic Manager**, validate the application, and then restore normal traffic after the primary region is recovered."',
      '**What about the current same-region setup?**',
      '"The separate subscriptions give us **administrative and security isolation**, but they don\'t protect us from a **regional outage** because both are in the same region. For true regional DR, I would introduce a secondary region."',
      "**HA vs DR** — **Note:** You don't necessarily need Dev/QA/UAT duplicated in the DR region. DR requirements are normally focused on **Production and its critical dependencies**. The exact DR design should be based on the application's **RTO and RPO**.",
    ],
    followUps: [
      'What does the current same-region setup protect you from?',
      'What is the difference between HA and DR?',
    ],
    code: [
      {
        title: 'Architecture',
        language: 'text',
        code: `                 PRIMARY REGION
        ┌─────────────────────────┐
        │ Prod Subscription       │
        │                         │
Users → │ Front Door / DNS        │
        │        ↓                │
        │      AKS                │
        │        ↓                │
        │    Database             │
        └─────────────────────────┘
                  │
                  │ Replication
                  ↓
                 DR REGION
        ┌─────────────────────────┐
        │ DR Subscription         │
        │                         │
        │      AKS                │
        │        ↓                │
        │  Replicated Database    │
        │                         │
        └─────────────────────────┘`,
      },
      {
        title: 'HA vs DR — High Availability',
        language: 'text',
        code: `Same region
Multiple AZs / nodes / replicas
        ↓
Protects against component or zone failure`,
      },
      {
        title: 'HA vs DR — Disaster Recovery',
        language: 'text',
        code: `Primary Region
       ↓
Secondary Region
       ↓
Protects against regional disaster`,
      },
    ],
    tags: ['disaster recovery', 'aks', 'multi-region'],
  },
  {
    id: 'itv-rsim-8',
    level: 'advanced',
    kind: 'scenario',
    prompt: 'What production issue did you resolve recently, and how? (Memory leak in pods)',
    probing:
      'A real incident flow: detection, investigation with kubectl, root cause, mitigation versus permanent fix, and prevention.',
    answer: [
      'For an interview, present this as a real incident flow: **detection → investigation → root cause → immediate fix → permanent fix → prevention**.',
      '**Sample answer:** "Recently, we had a production issue where some application pods were continuously consuming memory. Initially, the pods were running normally, but their memory usage gradually increased and eventually they were getting restarted with **OOMKilled**.',
      'We first detected the issue through our **monitoring alerts**. I checked the pod status and saw that the affected pods were restarting.',
      "I used `kubectl describe pod` and checked the container termination reason. It showed **OOMKilled**. Then I checked the pod's memory usage and application logs to understand whether there was an application-level issue.",
      'We compared the memory usage over time and found that memory was **continuously increasing instead of being released**. This indicated a possible memory leak in the application.',
      "As an **immediate mitigation**, we increased the number of replicas and adjusted the memory limit based on the application's actual usage. This reduced the impact on users while we investigated the root cause.",
      'We then worked with the **development team** to analyze the application and identified the memory leak. They fixed the code and provided a new application build.',
      'We deployed the fixed version through our CI/CD pipeline and monitored memory utilization after deployment. The memory usage remained stable and the pods stopped getting restarted.',
      'As a **preventive measure**, we improved memory monitoring and alerts and reviewed the application\'s resource requests and limits."',
      '**Commands to mention**',
      '**If they ask: "How did you prove it was a memory leak?"**',
      '"We monitored the memory usage over time. The memory consumption continuously increased after each request cycle and was not coming back down. Eventually it reached the container memory limit and Kubernetes terminated the container with OOMKilled. After the development team fixed the application, we deployed the new version and observed that memory usage stabilized. That confirmed the application-level memory leak was the root cause."',
      '**Important:** Don\'t say "I fixed the memory leak by increasing the memory limit." That\'s not a real fix. Increasing the limit is only a **temporary mitigation**. The permanent solution is identifying and **fixing the application memory leak**.',
    ],
    followUps: ['How did you prove it was a memory leak?'],
    code: [
      {
        title: 'Check pod status',
        language: 'bash',
        code: `kubectl get pods -n <namespace>`,
      },
      {
        title: 'Check why the pod restarted',
        language: 'bash',
        code: `kubectl describe pod <pod-name> -n <namespace>`,
      },
      {
        title: 'Look for',
        language: 'text',
        code: `Reason: OOMKilled
Exit Code: 137`,
      },
      {
        title: 'Check current resource usage',
        language: 'bash',
        code: `kubectl top pod -n <namespace>`,
      },
      {
        title: 'Check previous container logs',
        language: 'bash',
        code: `kubectl logs <pod-name> -n <namespace> --previous`,
      },
      {
        title: 'Check deployment',
        language: 'bash',
        code: `kubectl get deployment <deployment-name> -n <namespace>`,
      },
    ],
    tags: ['incident', 'oomkilled', 'memory leak', 'kubernetes'],
  },
  {
    id: 'itv-rsim-9',
    level: 'intermediate',
    kind: 'open',
    prompt: 'How do you secure your Terraform state file?',
    probing:
      'A remote backend with RBAC, encryption, network restriction, locking and versioning, and knowing `sensitive = true` does not keep values out of state.',
    answer: [
      '**Sample answer:** "We never store the Terraform state file locally or commit it to Git. We use a **remote backend**, typically an **Azure Storage Account**, to store the state centrally.',
      'The storage account is secured using **Azure AD/RBAC** rather than sharing storage account keys. Only the required DevOps pipeline identity and authorized engineers have access to the state container.',
      'We also enable **encryption at rest**, **soft delete/versioning** where appropriate, and restrict network access using **private endpoints or firewall rules**.',
      'Terraform state can contain sensitive information, so we make sure the state storage has strict access control. We also protect the state from concurrent modifications using **Terraform state locking**.',
      'Finally, we keep the backend configuration separate from application code and make sure `.tfstate` and `.tfstate.backup` are included in `.gitignore` so they aren\'t accidentally committed."',
      '**Important points to mention**',
      "- **Remote backend**: Azure Storage Account instead of local state\n- **RBAC**: Restrict who can read/write state\n- **Encryption at rest**: Protects stored data\n- **Private Endpoint / firewall**: Restrict network access\n- **State locking**: Prevents concurrent Terraform operations\n- **Versioning / soft delete**: Recovery from accidental changes/deletion\n- **`.gitignore`**: Never commit `.tfstate` to Git\n- **No manual edits**: Don't manually edit the state file",
      '**If they ask: "Can Terraform state contain secrets?"**',
      '"Yes. Terraform state can contain sensitive values depending on the resources being managed. Marking a variable as `sensitive = true` mainly prevents it from being displayed in CLI output; it **does not remove the value from the state file**. Therefore, protecting the backend itself is critical."',
    ],
    followUps: ['Can Terraform state contain secrets?'],
    code: [
      {
        title: 'Typical Azure setup',
        language: 'text',
        code: `Azure DevOps Pipeline
        |
        | Managed Identity / Service Principal
        ↓
Azure Storage Account
        |
        └── tfstate container
                |
                └── terraform.tfstate`,
      },
    ],
    tags: ['terraform', 'state', 'security'],
  },
]
