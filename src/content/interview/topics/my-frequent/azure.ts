import type { InterviewQuestion } from '../../../types'

/** Azure cost optimization, storage types and the 3-tier architecture. */
export const myFrequentAzureQuestions: InterviewQuestion[] = [
  {
    id: 'itv-myfaq-78',
    level: 'advanced',
    kind: 'open',
    prompt: 'How have you reduced cloud cost in Azure? Give a few examples.',
    probing:
      'Practical savings with what you changed, why, and how you measured it - not a list of service names.',
    answer: [
      'For an Azure DevOps interview, give practical cost-saving examples and explain **what you changed, why, and how you measured it**.',
      '**Strong interview answer:** "I have approached cost optimization mainly through resource utilization and automation. First, I used Azure Monitor metrics to identify underutilized VMs and right-size them. For non-production environments, I automated VM shutdown and startup during non-working hours. For AKS, I monitored node and pod utilization and used appropriate node sizing and cluster autoscaling to avoid running unnecessary nodes."',
      '"I also cleaned up orphaned resources such as unattached managed disks, unused public IPs, snapshots and old container images. For storage, I used lifecycle policies to move older data from Hot to Cool or Archive tiers. For stable production workloads, I would evaluate Azure Reservations or Savings Plans based on historical usage."',
      '"On the DevOps side, I optimized Docker images using multi-stage builds and cleaned up self-hosted agent resources. I also reviewed Log Analytics ingestion and retention so we weren\'t unnecessarily storing verbose logs. Finally, I used resource tagging and Azure Cost Management to identify which applications and environments were actually driving the cost."',
    ],
    followUps: [
      'How did you prove the saving?',
      'Which of these gave the biggest saving, and why?',
    ],
    tags: ['cost', 'finops', 'azure'],
  },
  {
    id: 'itv-myfaq-79',
    level: 'intermediate',
    kind: 'open',
    prompt: 'How did you prove that a cost optimization actually saved money?',
    probing:
      'Before/after evidence from Cost Management, controlled for workload changes, with performance still within limits.',
    answer: [
      'Don\'t say "I think it reduced the cost."',
      'Say: "I compared the Azure Cost Management data before and after the change, while controlling for workload changes. For example, after right-sizing or shutting down non-production resources, I compared the monthly compute cost and validated that application performance and availability remained within the required limits."',
      "That's a much stronger DevOps interview answer.",
    ],
    tags: ['cost', 'finops'],
  },
  {
    id: 'itv-myfaq-80',
    level: 'basic',
    kind: 'open',
    prompt: 'How do you right-size Azure VMs?',
    probing: 'Using utilization data to pick a smaller SKU, validating first and monitoring after.',
    answer: [
      '"I reviewed VM CPU and memory utilization using Azure Monitor. If a VM was consistently underutilized, for example using only 10-20% CPU, I recommended moving it to a smaller SKU."',
      'I would validate the workload before downsizing and monitor it after the change.',
      '**Cost saving:** lower compute cost without affecting application performance.',
    ],
    code: [
      {
        title: 'Right-sizing example',
        language: 'text',
        code: `Before:
D4s_v5 -> 4 vCPU / 16 GB

After:
D2s_v5 -> 2 vCPU / 8 GB`,
      },
    ],
    tags: ['cost', 'vm', 'right-sizing'],
  },
  {
    id: 'itv-myfaq-81',
    level: 'basic',
    kind: 'open',
    prompt: 'How do you save cost on non-production environments outside working hours?',
    probing:
      'Automated schedules and knowing that deallocate, not an OS shutdown, stops compute billing.',
    answer: [
      "For Dev/Test environments, resources don't need to run 24/7. For example, a Dev VM stops at 8 PM and starts at 8 AM.",
      'I can automate this with Azure Automation, Logic Apps, Functions, or scheduled Azure DevOps jobs.',
      '**Important:** `deallocate` is different from simply shutting down the OS, because deallocation releases the VM compute allocation.',
      '**Cost saving:** avoid paying for compute during unused hours.',
    ],
    code: [
      {
        title: 'Schedule',
        language: 'text',
        code: `Dev VM
 |
Stop at 8 PM
 |
Start at 8 AM`,
      },
      {
        title: 'Deallocate a VM',
        language: 'bash',
        code: `az vm deallocate \\
  --resource-group dev-rg \\
  --name dev-vm`,
      },
    ],
    tags: ['cost', 'vm', 'automation'],
  },
  {
    id: 'itv-myfaq-82',
    level: 'intermediate',
    kind: 'open',
    prompt: 'How do you optimize AKS node cost?',
    probing:
      'Watching utilization and pod density, reducing or resizing nodes, and letting the cluster autoscaler follow demand.',
    answer: [
      'For AKS nodes I would monitor:',
      '- CPU utilization\n- Memory utilization\n- Pod density\n- Node utilization\n- Cluster autoscaler behaviour',
      'If nodes are consistently underutilized, I can reduce the node count or use a smaller VM SKU.',
      'I can also use the Cluster Autoscaler so AKS adds and removes nodes based on pending workload: fewer nodes under low workload, more nodes under high workload.',
    ],
    code: [
      {
        title: 'Node count example',
        language: 'text',
        code: `Before:
5 x D4s_v5 nodes

After:
3 x D4s_v5 nodes`,
      },
      {
        title: 'Cluster autoscaler behaviour',
        language: 'text',
        code: `Low workload
     |
Fewer nodes

High workload
     |
More nodes`,
      },
    ],
    tags: ['cost', 'aks', 'autoscaling'],
  },
  {
    id: 'itv-myfaq-83',
    level: 'intermediate',
    kind: 'open',
    prompt: 'When do you use Azure Reservations or a Savings Plan?',
    probing: 'Committing only for predictable, always-on workloads based on historical usage.',
    answer: [
      'For workloads that are predictable and continuously running, such as production VMs, I would evaluate Azure Reservations and the Azure Savings Plan for Compute instead of paying the full pay-as-you-go rate for stable workloads.',
      "I wouldn't use a long-term commitment for highly variable or temporary workloads.",
    ],
    code: [
      {
        title: 'Commitment decision flow',
        language: 'text',
        code: `Production VM
Runs 24 x 7
        |
Analyze historical usage
        |
Commit appropriate capacity
        |
Lower compute cost`,
      },
    ],
    tags: ['cost', 'reservations'],
  },
  {
    id: 'itv-myfaq-84',
    level: 'basic',
    kind: 'open',
    prompt: 'How do you find and remove unused Azure resources?',
    probing:
      'Knowing the usual orphans (disks, IPs, snapshots) and cleaning them up safely after validation.',
    answer: [
      'This is one of the easiest cost optimizations. I regularly look for unused:',
      '- Managed disks\n- Snapshots\n- Public IPs\n- Load balancers\n- Old VM resources\n- Unused NICs\n- Old container images\n- Unused App Service plans\n- Old backups',
      'For example, a VM may be deleted but its managed disk remains and keeps generating cost.',
      'I can use Azure Resource Graph or Azure CLI to identify orphaned resources and clean them up after validation. (A PowerShell script that finds unattached managed disks and exports them to CSV for owner review is in the automation questions.)',
    ],
    code: [
      {
        title: 'Orphaned disk',
        language: 'text',
        code: `VM deleted
   |
Disk still exists
   |
Still generating cost`,
      },
    ],
    tags: ['cost', 'cleanup'],
  },
  {
    id: 'itv-myfaq-85',
    level: 'basic',
    kind: 'open',
    prompt: 'How do you use storage lifecycle management to reduce cost?',
    probing: 'Moving data between Hot, Cool and Archive by rule instead of by hand.',
    answer: [
      'For storage accounts, I can move old data to cheaper tiers: Hot, then Cool, then Archive. For logs or backups that are rarely accessed, recent logs stay Hot, older logs move to Cool and old backups to Archive.',
      'I would configure lifecycle management rules rather than manually moving files.',
    ],
    code: [
      {
        title: 'Tiering',
        language: 'text',
        code: `Hot
 |
Cool
 |
Archive

Recent logs -> Hot
Older logs  -> Cool
Old backups -> Archive`,
      },
    ],
    tags: ['cost', 'storage', 'lifecycle'],
  },
  {
    id: 'itv-myfaq-86',
    level: 'intermediate',
    kind: 'open',
    prompt: 'How do you reduce the cost of build agents and pipelines?',
    probing:
      'Cleaning self-hosted agents and making pipelines do less work through caching and incremental builds.',
    answer: [
      "If we're using self-hosted agents, I can clean up:",
      '- Old Docker images\n- Containers\n- Build artifacts\n- Temporary files\n- Workspace files',
      'For Microsoft-hosted agents, I avoid unnecessary work by improving pipeline efficiency:',
      '- Dependency caching\n- Parallel jobs\n- Incremental builds\n- Docker layer caching',
      "This doesn't just reduce Azure infrastructure cost - it reduces pipeline execution time and compute consumption.",
    ],
    tags: ['cost', 'ci/cd', 'agents'],
  },
  {
    id: 'itv-myfaq-87',
    level: 'intermediate',
    kind: 'open',
    prompt: 'How does container image optimization reduce cost?',
    probing:
      'Multi-stage builds and small base images cut registry storage, transfer and pull time.',
    answer: [
      'For Docker workloads, I use:',
      '- Multi-stage builds\n- Smaller base images\n- `.dockerignore`\n- Layer caching',
      'Instead of putting Node.js, npm, source code and build dependencies into the production image, the final image only contains Nginx and the built application.',
      'The smaller image reduces:',
      '- ACR storage\n- Image transfer time\n- AKS pull time\n- Container storage usage',
    ],
    code: [
      {
        title: 'Multi-stage build',
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
    ],
    tags: ['cost', 'docker'],
  },
  {
    id: 'itv-myfaq-88',
    level: 'intermediate',
    kind: 'open',
    prompt: 'How do you control Log Analytics cost?',
    probing:
      'Knowing ingestion volume and retention drive the bill, and filtering verbose logs in Production.',
    answer: [
      'Logs can become surprisingly expensive. I review Log Analytics retention and ingestion volume against cost.',
      'I avoid sending unnecessary verbose/debug logs to Log Analytics in production: DEBUG is not collected in production unless required, INFO is kept where useful, and ERROR is always retained.',
      'I also configure appropriate retention and archive older data where required.',
    ],
    code: [
      {
        title: 'What drives log cost',
        language: 'text',
        code: `Log Analytics
     |
Retention
     |
Ingestion volume
     |
Cost

DEBUG -> Don't collect in production unless required
INFO  -> Keep where useful
ERROR -> Always retain`,
      },
    ],
    tags: ['cost', 'logging', 'log analytics'],
  },
  {
    id: 'itv-myfaq-89',
    level: 'basic',
    kind: 'open',
    prompt: 'How do tagging and cost analysis help you find what is driving cost?',
    probing: 'Consistent tags that let Cost Management split spend by app, team and environment.',
    answer: [
      'I use consistent tags such as Environment, Application, Owner and CostCenter.',
      'Then Azure Cost Management can help identify which application, team or environment is consuming money. Then I investigate the biggest unexpected spend first.',
    ],
    code: [
      {
        title: 'Tags',
        language: 'text',
        code: `Environment = Production
Application = Payments
Owner       = DevOps
CostCenter  = 1234`,
      },
      {
        title: 'Cost by application',
        language: 'text',
        code: `Application A -> ₹80,000/month
Application B -> ₹25,000/month
Unused Dev    -> ₹15,000/month`,
      },
    ],
    tags: ['cost', 'tagging'],
  },
  {
    id: 'itv-myfaq-90',
    level: 'intermediate',
    kind: 'open',
    prompt: 'What storage types do you use in your project, and how do you choose between them?',
    probing: 'Choosing storage by data type and access pattern, not one service for everything.',
    answer: [
      'I choose storage based on the type of data and how the application needs to access it. I do not use one storage service for every requirement.',
      '- **Images, documents, logs, and backups:** Blob Storage\n- **A disk attached to one AKS workload:** Azure Disk\n- **Shared files used by multiple Pods:** Azure Files\n- **Application transactions:** Azure Database for PostgreSQL\n- **Container images:** Azure Container Registry\n- **Terraform state:** Private Blob container',
      '**Example:** suppose an application stores user-uploaded images and order data. I put the images in Blob Storage because they are files, and I put the orders in PostgreSQL because they need transactions and queries. If several Pods must read the same generated report folder, I use Azure Files.',
      "**In short:** I use Blob Storage for files, Azure Disk for a single workload's persistent disk, Azure Files for shared folders, PostgreSQL for transactional data, ACR for images, and a private Blob container for Terraform state. I select the service based on access pattern, availability, security, cost, and recovery needs.",
    ],
    tags: ['storage', 'azure'],
  },
  {
    id: 'itv-myfaq-91',
    level: 'basic',
    kind: 'open',
    prompt: 'What do you use Azure Blob Storage for, and what are its blob types and access tiers?',
    probing:
      'Knowing block/append/page blobs and Hot/Cool/Cold/Archive tiers with lifecycle rules.',
    answer: [
      'I use Blob Storage for unstructured files such as:',
      '- Images and videos.\n- Reports and documents.\n- Log archives.\n- Application exports.\n- Backup files.',
      '**Blob types** available:',
      '- **Block blob:** Normal files such as images, PDFs, and backups.\n- **Append blob:** Data that is added at the end, such as some logging scenarios.\n- **Page blob:** Random read/write data, mainly used by virtual disks.',
      'For most application files, I use block blobs.',
      '**Access tiers** available:',
      '- **Hot:** Frequently accessed data.\n- **Cool:** Infrequently accessed data.\n- **Cold/Archive:** Long-term data that is rarely read.',
      'I use lifecycle rules to move older files to a cheaper tier or delete them after the retention period.',
    ],
    code: [
      {
        title: 'Upload with Entra ID auth',
        language: 'bash',
        code: `az storage blob upload \\
  --account-name <storage-account> \\
  --container-name reports \\
  --name report.pdf \\
  --file report.pdf \\
  --auth-mode login`,
      },
      {
        title: 'Lifecycle example',
        language: 'text',
        code: `0-30 days    -> Hot
31-90 days   -> Cool
After 90 days -> Archive or delete`,
      },
    ],
    tags: ['storage', 'blob'],
  },
  {
    id: 'itv-myfaq-92',
    level: 'intermediate',
    kind: 'open',
    prompt: 'When do you use Azure Disk, Azure Files or emptyDir for AKS workloads?',
    probing:
      'Matching access modes (RWO vs RWX) and lifetimes to the workload, and knowing the zone limit of disks.',
    answer: [
      '**Azure Disk** provides block storage that behaves like a disk attached to a node. In AKS, it is commonly used through a PersistentVolumeClaim. This works well when one workload needs its own persistent disk. A normal Azure Disk is tied to an availability zone and is not the default choice for many Pods writing to the same volume.',
      '**Azure Files** provides a shared file system. I use it when multiple Pods or systems need to access the same files. Typical uses include shared reports, uploaded content, or legacy applications that require a shared folder.',
      '**Temporary Pod storage.** For temporary files that can disappear when the Pod is deleted, I use `emptyDir`. I do not use it for important business data because it follows the lifetime of the Pod.',
    ],
    code: [
      {
        title: 'Azure Disk PVC (ReadWriteOnce)',
        language: 'yaml',
        code: `apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: application-data
spec:
  accessModes:
    - ReadWriteOnce
  resources:
    requests:
      storage: 20Gi
  storageClassName: managed-csi`,
      },
      {
        title: 'Azure Files PVC (ReadWriteMany)',
        language: 'yaml',
        code: `apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: shared-files
spec:
  accessModes:
    - ReadWriteMany
  resources:
    requests:
      storage: 100Gi
  storageClassName: azurefile-csi`,
      },
      {
        title: 'emptyDir',
        language: 'yaml',
        code: `volumes:
  - name: temporary-data
    emptyDir: {}`,
      },
    ],
    tags: ['storage', 'aks', 'pvc'],
  },
  {
    id: 'itv-myfaq-93',
    level: 'intermediate',
    kind: 'open',
    prompt: 'Where do you keep database data, Terraform state and container images?',
    probing:
      'Keeping state out of Pods, protecting Terraform state, and pulling immutable images by identity.',
    answer: [
      '**Azure Database for PostgreSQL.** I use PostgreSQL for structured transactional data such as users, orders, and payments. It provides:',
      '- Tables and relationships.\n- Transactions.\n- Backups and point-in-time restore.\n- High-availability options.\n- Monitoring and access controls.',
      'I keep database data outside the AKS Pods so that replacing a Pod does not delete the data.',
      '**Terraform state** is stored in a dedicated private Blob container. The storage account has:',
      '- Restricted access.\n- State locking.\n- Versioning or recovery protection.\n- Separate state files for separate environments.',
      'Terraform state may contain sensitive information, so I do not make the container public.',
      '**Azure Container Registry** stores container images rather than normal application files. AKS receives permission to pull images through its identity. I use a version or digest instead of `latest`.',
    ],
    code: [
      {
        title: 'Terraform azurerm backend',
        language: 'hcl',
        code: `terraform {
  backend "azurerm" {
    resource_group_name  = "rg-platform"
    storage_account_name = "tfstateaccount"
    container_name       = "tfstate"
    key                  = "production.tfstate"
  }
}`,
      },
      {
        title: 'Build and push to ACR',
        language: 'bash',
        code: `docker build -t <registry>.azurecr.io/orders-api:1.2.0 .
docker push <registry>.azurecr.io/orders-api:1.2.0`,
      },
    ],
    tags: ['storage', 'terraform', 'acr'],
  },
  {
    id: 'itv-myfaq-94',
    level: 'basic',
    kind: 'open',
    prompt: 'How do you choose storage redundancy and protect stored data?',
    probing:
      'LRS/ZRS/GRS trade-offs against cost, and per-service backup features that are only useful when restores are tested.',
    answer: [
      'The redundancy option depends on how much failure protection the application needs:',
      '- **LRS:** Copies data within one datacenter.\n- **ZRS:** Copies data across availability zones in one region.\n- **GRS/GZRS:** Also copies data to another region.',
      "Higher protection usually costs more, so I choose it from the application's availability and recovery requirement.",
      '**Backup and recovery.** The exact protection depends on the service:',
      '- Blob versioning and soft delete protect files.\n- Disk snapshots provide point-in-time disk copies.\n- PostgreSQL supports backup and point-in-time restore.\n- Terraform state uses versioning and restricted access.',
      'A backup is useful only if the restore process has been tested.',
    ],
    tags: ['storage', 'redundancy', 'backup'],
  },
  {
    id: 'itv-myfaq-95',
    level: 'intermediate',
    kind: 'open',
    prompt: 'How do you secure Azure Storage?',
    probing:
      'Private by default, identity and RBAC over account keys, short-lived SAS only when needed.',
    answer: [
      'For storage security, I:',
      '- Disable public access unless it is required.\n- Use managed identity and Azure RBAC.\n- Use private endpoints for sensitive workloads.\n- Require HTTPS.\n- Encrypt data at rest.\n- Use short-lived SAS tokens only when delegated access is needed.\n- Monitor access and configuration changes.',
      'I do not store account keys in source code.',
    ],
    tags: ['storage', 'security'],
  },
  {
    id: 'itv-myfaq-96',
    level: 'intermediate',
    kind: 'scenario',
    prompt:
      'An AKS volume will not mount, or an app cannot access Blob Storage. How do you troubleshoot it?',
    probing:
      'Checking PVC binding, zone and CSI errors for volumes; identity, role, firewall and DNS for Blob.',
    answer: [
      'For an AKS volume problem, I check whether the claim is bound, whether the disk is in the correct zone, and whether the CSI driver reported an attach or mount error.',
      'For Blob access problems, I check the application identity, role assignment, firewall, private DNS, and whether the container and blob names are correct.',
    ],
    code: [
      {
        title: 'Volume troubleshooting',
        language: 'bash',
        code: `kubectl get pvc,pv -n <namespace>
kubectl describe pvc <pvc-name> -n <namespace>
kubectl describe pod <pod-name> -n <namespace>`,
      },
    ],
    tags: ['storage', 'troubleshooting', 'aks'],
  },
  {
    id: 'itv-myfaq-97',
    level: 'advanced',
    kind: 'open',
    prompt: 'Explain the 3-tier architecture you have worked on in Azure.',
    probing:
      'Whether you can explain the entire request path and its security boundaries, not just name services.',
    answer: [
      'For an Azure DevOps interview, you should be able to explain the **entire request path**, not just name the services. The basic idea is Internet, Gateway/WAF, Web Tier, Application Tier, Database Tier.',
      '**2-minute interview answer:** "We had a three-tier architecture consisting of web, application and database tiers. We deployed the infrastructure inside an Azure VNet with separate subnets for Application Gateway, web servers, application servers and private connectivity to the database."',
      '"The user\'s request first reaches DNS and resolves to the public IP of Azure Application Gateway. Application Gateway acts as the Layer 7 load balancer and WAF. It performs SSL termination, health probes and routing. Requests for the frontend are routed to the web tier, where our React application is served through Nginx."',
      '"When the user performs an operation such as login, React sends an HTTPS REST API request to the backend. Application Gateway routes `/api` traffic to the application tier. The application tier contains our Spring Boot services, which handle authentication, authorization and business logic."',
      '"When the backend needs data, it connects to the database over private networking. For example, Azure SQL can be accessed through a Private Endpoint. The database isn\'t exposed to the Internet."',
      '"We use NSGs to control traffic between the tiers. The web tier can receive traffic from the Application Gateway. The application tier accepts only required traffic from the web tier. The database accepts only the required database traffic from the application tier. For outbound connectivity from private resources, we use NAT Gateway, and for centralized network inspection we can use Azure Firewall."',
      '"For high availability, we run multiple web and application instances across availability zones where supported. Application Gateway distributes traffic and health probes remove unhealthy instances from rotation."',
      '"From the DevOps side, developers push code to Azure Repos. Azure DevOps pipelines build the React frontend and backend, run unit tests and SonarQube analysis, build Docker images and push them to ACR. We then deploy the images to AKS using Helm. In AKS, Ingress routes traffic to frontend and backend services, and the backend communicates privately with Azure SQL. We monitor the application using Azure Monitor, Application Insights, Prometheus and Grafana."',
      '**The security rule to remember:** Internet -> Gateway -> Web -> App -> Database. Never Internet -> Database.',
    ],
    code: [
      {
        title: 'High-level architecture',
        language: 'text',
        code: `                         INTERNET
                            |
                            v
                    Public IP Address
                            |
                            v
                  Azure Application Gateway
                       + WAF enabled
                            |
                    Web Subnet
                            |
                  +---------+---------+
                  |                   |
                  v                   v
            Web Server 1         Web Server 2
            React/Nginx           React/Nginx
                  |                   |
                  +---------+---------+
                            |
                            | HTTPS / API
                            v
                    Application Subnet
                            |
                  +---------+---------+
                  |                   |
                  v                   v
             App Server 1         App Server 2
             Spring Boot          Spring Boot
                  |                   |
                  +---------+---------+
                            |
                            | DB connection
                            v
                    Database Subnet
                            |
                            v
                   Azure SQL Database`,
      },
      {
        title: 'Basic idea',
        language: 'text',
        code: `Internet
   |
Gateway / WAF
   |
Web Tier
   |
Application Tier
   |
Database Tier`,
      },
      {
        title: 'One line to remember',
        language: 'text',
        code: `User
 |
DNS
 |
Application Gateway + WAF
 |
Web Subnet -> React/Nginx
 |
App Subnet -> Spring Boot/API
 |
Private Network
 |
Database -> Azure SQL`,
      },
    ],
    followUps: [
      'Walk me through exactly what happens when a user clicks Login.',
      'How would this change if the web and app tiers ran on AKS?',
    ],
    tags: ['architecture', '3-tier', 'azure'],
  },
  {
    id: 'itv-myfaq-98',
    level: 'intermediate',
    kind: 'open',
    prompt: 'How do you design the VNet and subnets for a 3-tier application?',
    probing:
      'One VNet split into purpose-specific subnets, including a dedicated Application Gateway subnet, for isolation.',
    answer: [
      'I create one VNet, for example `10.0.0.0/16`, then divide it into separate subnets: AppGatewaySubnet `10.0.1.0/24`, WebSubnet `10.0.2.0/24`, AppSubnet `10.0.3.0/24` and DatabaseSubnet `10.0.4.0/24`.',
      "The subnet separation gives network isolation. I don't want users from the Internet directly reaching my application servers or database.",
      "**Application Gateway subnet.** Application Gateway sits in its own dedicated subnet. I don't deploy normal application workloads into this subnet. This subnet is only for Application Gateway.",
    ],
    code: [
      {
        title: 'VNet and subnets',
        language: 'text',
        code: `VNet: 10.0.0.0/16
|
+-- AppGatewaySubnet
|      10.0.1.0/24
|
+-- WebSubnet
|      10.0.2.0/24
|
+-- AppSubnet
|      10.0.3.0/24
|
+-- DatabaseSubnet
       10.0.4.0/24`,
      },
    ],
    tags: ['architecture', 'vnet', 'subnets'],
  },
  {
    id: 'itv-myfaq-99',
    level: 'intermediate',
    kind: 'open',
    prompt: 'What role does Application Gateway play, and how does path-based routing work?',
    probing:
      'Layer 7 entry point with WAF, TLS termination and probes, and routing `/` and `/api/*` to different tiers.',
    answer: [
      'The user opens `https://myapp.com`. DNS resolves the domain to the public IP of Azure Application Gateway.',
      'Application Gateway acts as the Layer 7 entry point. I can enable WAF on it to protect against common web attacks. It can also do:',
      '- SSL / TLS termination\n- Host-based routing\n- Path-based routing\n- Load balancing\n- Health probes',
      'Suppose the user clicks **Login**. React sends `POST /api/login` to `https://myapp.com/api/login`. Application Gateway can use path-based routing: `/` goes to the web tier and `/api/*` goes to the application tier.',
      'This is a very important interview concept.',
    ],
    code: [
      {
        title: 'DNS to Application Gateway',
        language: 'text',
        code: `myapp.com
     |
     v
Public IP
     |
     v
Application Gateway`,
      },
      {
        title: 'Path-based routing rules',
        language: 'text',
        code: `/              -> Web Tier

/api/*         -> Application Tier`,
      },
      {
        title: 'Routing diagram',
        language: 'text',
        code: `User
 |
 | HTTPS
 v
Application Gateway
 |
 +---- / ----------> Web Tier
 |
 +---- /api/* -----> App Tier`,
      },
    ],
    tags: ['architecture', 'application gateway', 'waf'],
  },
  {
    id: 'itv-myfaq-100',
    level: 'basic',
    kind: 'open',
    prompt: 'What do the web tier and the application tier each do?',
    probing:
      'Separating the user-facing frontend from business logic, and that the frontend never talks to the database.',
    answer: [
      '**Web tier.** The Application Gateway forwards traffic to the web tier (for example two Web VMs running Nginx and React in the WebSubnet). The web tier might run React, Nginx, Angular or a static web application. In a containerized environment, these would instead be frontend pods running in AKS.',
      "**Why do we need the web tier?** It handles the user-facing part of the application, such as `GET /`, `GET /login` and `GET /dashboard`. The React application is served to the user's browser. But React should **not** directly access the database. Instead, it talks to the application tier.",
      '**Application tier.** The application tier contains the business logic, for example a Spring Boot application server on port 8080 in the AppSubnet. There can be multiple instances, which gives availability and scalability. The backend could be Java Spring Boot, .NET, Node.js, Python or microservices.',
      '**How web -> app communication works.** Suppose React sends `POST /api/orders`. The request goes from the browser through Application Gateway and its routing to the backend service (Spring Boot). The backend validates the user, checks authorization, processes the business logic and reads or writes the database.',
    ],
    code: [
      {
        title: 'Web tier',
        language: 'text',
        code: `Application Gateway
        |
        v
WebSubnet
10.0.2.0/24
        |
   +----+----+
   |         |
   v         v
Web VM 1   Web VM 2
Nginx      Nginx
React      React`,
      },
      {
        title: 'Application tier',
        language: 'text',
        code: `AppSubnet
10.0.3.0/24

+--------------------+
| Application Server |
| Spring Boot        |
| Port 8080          |
+--------------------+`,
      },
      {
        title: 'Request to the backend',
        language: 'text',
        code: `Browser
   |
   v
Application Gateway
   |
   v
Web/Application routing
   |
   v
Backend Service
   |
   v
Spring Boot`,
      },
      {
        title: 'What the backend does',
        language: 'text',
        code: `Validate user
      |
Check authorization
      |
Process business logic
      |
Read/write database`,
      },
    ],
    tags: ['architecture', '3-tier'],
  },
  {
    id: 'itv-myfaq-101',
    level: 'intermediate',
    kind: 'open',
    prompt: 'How does the application tier connect to the database securely?',
    probing:
      'Private connectivity - dedicated subnet for VNet-deployed servers, Private Endpoint for PaaS - and no Internet exposure.',
    answer: [
      'The backend connects to the database on the database port, for example TCP 1433 for Azure SQL or TCP 5432 for PostgreSQL.',
      'The important point: **the database should not be directly accessible from the Internet.** Only the application tier should be allowed to talk to it.',
      'For Azure, you could use Azure SQL Database, Azure Database for PostgreSQL or Azure Database for MySQL. If you use a database server deployed inside the VNet, it can be placed in a dedicated database subnet.',
      'For PaaS databases such as Azure SQL, the networking model is different. You normally use a Private Endpoint / private connectivity instead of simply putting the database resource into your VNet subnet. The database has no public exposure.',
    ],
    code: [
      {
        title: 'Database ports',
        language: 'text',
        code: `Spring Boot
     |
     | TCP 1433
     v
Azure SQL

Spring Boot
     |
     | TCP 5432
     v
PostgreSQL`,
      },
      {
        title: 'Private Endpoint path',
        language: 'text',
        code: `AppSubnet
   |
   | Private connection
   v
Private Endpoint
   |
   v
Azure SQL Database`,
      },
    ],
    tags: ['architecture', 'database', 'private endpoint'],
  },
  {
    id: 'itv-myfaq-102',
    level: 'intermediate',
    kind: 'open',
    prompt: 'How do you use NSGs to control traffic between the tiers?',
    probing:
      'Explicit allow rules per tier boundary and explicit denial of Internet-to-app and web-to-database paths.',
    answer: [
      'This is very important for interviews. I use Network Security Groups to control traffic between tiers.',
      "**Web NSG.** Allow TCP 443 from the Internet/Application Gateway to the web tier. Don't allow random Internet traffic directly to the web servers.",
      '**Application NSG.** Allow TCP 8080 from the web tier to the application tier. Block Internet -> Application Tier. If Application Gateway routes `/api/*` straight to the application tier, the Application NSG must also allow the AppGatewaySubnet on the backend port.',
      '**Database NSG.** Allow TCP 1433 from the application tier to the database. Block Internet -> Database and Web Tier -> Database.',
      'So the idea is: the Internet can reach neither the database nor the application tier; the web tier may reach the application tier, and the application tier may reach the database.',
    ],
    code: [
      {
        title: 'Allowed flows',
        language: 'text',
        code: `Internet/Application Gateway
        |
TCP 443
        |
Web Tier

Web Tier
   |
TCP 8080
   |
Application Tier

Application Tier
       |
TCP 1433
       |
Database`,
      },
      {
        title: 'Blocked flows',
        language: 'text',
        code: `Internet -> Application Tier

Internet -> Database
Web Tier -> Database`,
      },
      {
        title: 'Summary',
        language: 'text',
        code: `Internet
   |
   X
   |
Database

Internet
   |
   X
   |
Application Tier

Web Tier
   |
   | Allowed
   v
Application Tier
   |
   | Allowed
   v
Database`,
      },
    ],
    tags: ['architecture', 'nsg', 'security'],
  },
  {
    id: 'itv-myfaq-103',
    level: 'intermediate',
    kind: 'open',
    prompt: 'How do route tables and NAT Gateway fit into a private 3-tier design?',
    probing:
      'Forcing traffic through a firewall with UDRs, and outbound Internet without public IPs on VMs.',
    answer: [
      '**Route tables.** If needed, I can use User Defined Routes (UDR) with Azure Route Tables. For example, traffic from private workloads can be forced through Azure Firewall. This gives centralized traffic inspection and control.',
      "**NAT Gateway.** Private application servers may need outbound Internet access - for example, the application server needs to download something from an external API. I don't want to give the VM a public IP. Instead, traffic goes out through NAT Gateway, which gives controlled outbound connectivity.",
    ],
    code: [
      {
        title: 'Forced tunnelling through Azure Firewall',
        language: 'text',
        code: `Private Subnet
      |
      v
Route Table
      |
      v
Azure Firewall
      |
      v
Internet`,
      },
      {
        title: 'Outbound through NAT Gateway',
        language: 'text',
        code: `App Server
   |
   v
NAT Gateway
   |
   v
Internet`,
      },
    ],
    tags: ['architecture', 'routing', 'nat gateway'],
  },
  {
    id: 'itv-myfaq-104',
    level: 'basic',
    kind: 'open',
    prompt: 'What is the difference between Azure Firewall and an NSG?',
    probing:
      'NSG as distributed 5-tuple allow/deny at subnet or NIC, Firewall as central inspection for many destinations.',
    answer: [
      'This is another common interview question.',
      '**NSG** works mainly at the subnet / NIC level. It is used for allow / deny rules on source, destination, port and protocol.',
      '**Azure Firewall** gives centralized network security and traffic inspection, for traffic from the VNet to the Internet, other VNets and on-premises.',
    ],
    code: [
      {
        title: 'NSG rules',
        language: 'text',
        code: `WebSubnet -> AppSubnet : 8080 ALLOW
AppSubnet -> DB        : 1433 ALLOW`,
      },
      {
        title: 'Azure Firewall',
        language: 'text',
        code: `VNet
 |
 +--> Azure Firewall
          |
          +--> Internet
          +--> Other VNet
          +--> On-prem`,
      },
    ],
    tags: ['networking', 'nsg', 'azure firewall'],
  },
  {
    id: 'itv-myfaq-105',
    level: 'basic',
    kind: 'open',
    prompt: 'Where do VPN Gateway and ExpressRoute come into the architecture?',
    probing:
      'Knowing both hybrid options and when the application tier needs to reach on-premises systems.',
    answer: [
      'If the company has an on-premises data center, we can connect it to Azure using a **VPN Gateway** (IPsec VPN over the Internet) or **ExpressRoute** (a private dedicated connection terminating on an ExpressRoute Gateway).',
      'For example, your application might need to access an on-premises payment system, so the application tier reaches it over VPN/ExpressRoute.',
    ],
    code: [
      {
        title: 'VPN Gateway',
        language: 'text',
        code: `On-Prem
   |
   | IPsec VPN
   |
VPN Gateway
   |
   v
Azure VNet`,
      },
      {
        title: 'ExpressRoute',
        language: 'text',
        code: `On-Prem
   |
   | Private dedicated connection
   |
ExpressRoute
   |
ExpressRoute Gateway
   |
   v
Azure VNet`,
      },
      {
        title: 'Reaching an on-prem system',
        language: 'text',
        code: `Application Tier
       |
       v
VPN/ExpressRoute
       |
       v
On-Prem Payment System`,
      },
    ],
    tags: ['networking', 'vpn', 'expressroute'],
  },
  {
    id: 'itv-myfaq-106',
    level: 'basic',
    kind: 'open',
    prompt: 'How does DNS work in this architecture, publicly and privately?',
    probing:
      'Public record to the gateway IP, and Private DNS so PaaS names resolve to private endpoints.',
    answer: [
      'Suppose the domain is `www.myapp.com`. The DNS record points to the Application Gateway public IP.',
      'For internal services, I can use Azure Private DNS. For example, `myapp.database.windows.net` can resolve privately when a private endpoint and private DNS are configured.',
      'This stops internal traffic from going over the public Internet unnecessarily.',
    ],
    tags: ['networking', 'dns', 'private dns'],
  },
  {
    id: 'itv-myfaq-107',
    level: 'advanced',
    kind: 'open',
    prompt: 'Walk me through the complete request flow when a user opens the application.',
    probing:
      'A memorised, ordered path: DNS, gateway with WAF and TLS, web tier, API routing, backend, private DB, NSGs, outbound.',
    answer: [
      'This is the part you should memorize for the interview. Suppose the user opens `https://www.myapp.com`.',
      '"First, the user\'s DNS request resolves the application domain to the public IP of Azure Application Gateway. The request reaches Application Gateway, where WAF can inspect the traffic and SSL termination can happen. Application Gateway uses health probes and routing rules to forward the request to the healthy web-tier instance in the web subnet."',
      '"The React frontend is served from the web tier. When the user performs an operation such as login or retrieving orders, React sends an HTTPS REST API request to the backend. Application Gateway routes `/api/*` traffic to the application tier based on path-based routing."',
      '"The application tier contains the backend services, such as Spring Boot microservices. The backend performs authentication, authorization and business logic. When it needs data, it connects privately to the database using the required database port, such as 1433 for Azure SQL."',
      '**Then security:** "NSGs restrict communication between the tiers. The application tier isn\'t directly accessible from the Internet, and the database isn\'t accessible from the Internet or directly from the web tier. Private endpoints can be used for PaaS services such as Azure SQL."',
      '**Then outbound:** "If private workloads need outbound Internet access, I use NAT Gateway. If centralized inspection is required, traffic can be routed through Azure Firewall."',
    ],
    followUps: [
      'Where exactly does TLS terminate, and is traffic re-encrypted to the backend?',
      'What happens to a request when one web instance fails its health probe?',
    ],
    tags: ['architecture', '3-tier', 'request flow'],
  },
  {
    id: 'itv-myfaq-108',
    level: 'intermediate',
    kind: 'open',
    prompt: 'Where does CI/CD fit into the 3-tier architecture?',
    probing:
      'Connecting the architecture to your DevOps role: pipelines building both tiers into ACR and deploying to AKS behind ingress.',
    answer: [
      'Now connect this to your Azure DevOps role. Developers push to Azure Repos; the Azure DevOps pipeline builds, tests, runs SonarQube and builds a Docker image for both the React frontend and the backend; the images (`frontend:v1`, `backend:v1`) go to Azure Container Registry and are deployed to AKS as the web tier and the application tier.',
      'If using AKS, Application Gateway sends traffic to the Ingress Controller, which routes to the Frontend Service (React Pods) and the Backend Service (Spring Boot Pods); the backend reaches Azure SQL through a Private Endpoint.',
      'This is a very strong architecture to explain for an Azure DevOps interview.',
    ],
    code: [
      {
        title: 'Pipeline to ACR and AKS',
        language: 'text',
        code: `Developer
    |
    v
Azure Repos
    |
    v
Azure DevOps Pipeline
    |
    +--> Build React
    +--> Test
    +--> SonarQube
    +--> Build Docker image
    |
    +--> Build Backend
    +--> Test
    +--> SonarQube
    +--> Build Docker image
    |
    v
Azure Container Registry
    |
    +--> frontend:v1
    +--> backend:v1
    |
    v
AKS
    |
    +--> Web Tier
    +--> Application Tier`,
      },
      {
        title: '3-tier on AKS',
        language: 'text',
        code: `Application Gateway
       |
       v
Ingress Controller
       |
       +--------> Frontend Service
       |              |
       |              v
       |         React Pods
       |
       +--------> Backend Service
                      |
                      v
                 Spring Boot Pods
                      |
                      v
                Private Endpoint
                      |
                      v
                  Azure SQL`,
      },
    ],
    tags: ['architecture', 'ci/cd', 'aks'],
  },
  {
    id: 'itv-myfaq-109',
    level: 'intermediate',
    kind: 'open',
    prompt: 'How do you make a 3-tier application highly available?',
    probing:
      'Multiple instances per tier behind health probes, database HA features, and spreading across zones.',
    answer: [
      '**Web tier.** Multiple instances (Web 1, Web 2, Web 3). Application Gateway distributes traffic.',
      '**Application tier.** Multiple backend instances (App 1, App 2, App 3). If one goes down, traffic goes to the healthy instances.',
      '**Database.** Use Azure SQL high availability features, zone redundancy where supported, backups and a proper disaster-recovery configuration.',
      '**Availability Zones.** Where supported, spread workloads across zones.',
    ],
    code: [
      {
        title: 'Spread across availability zones',
        language: 'text',
        code: `Zone 1       Zone 2       Zone 3
  |            |            |
Web/App      Web/App      Web/App`,
      },
    ],
    tags: ['architecture', 'high availability', 'zones'],
  },
  {
    id: 'itv-myfaq-110',
    level: 'intermediate',
    kind: 'open',
    prompt: 'What security controls do you put in a 3-tier Azure architecture?',
    probing:
      'Defence in depth along the request path plus identity, secrets and private connectivity controls.',
    answer: [
      'A good answer walks the layers: Internet, WAF, Application Gateway, Web NSG, web tier, App NSG, app tier, DB NSG / Private Endpoint, database.',
      'And the controls themselves:',
      '- No public IP on application servers where possible\n- No public database access\n- NSGs between tiers\n- WAF at the entry point\n- Azure Firewall when centralized inspection is required\n- Key Vault for secrets\n- Managed Identity instead of hardcoded credentials\n- Private Endpoints for PaaS services\n- TLS for application communication\n- RBAC for Azure access',
    ],
    code: [
      {
        title: 'Security layers',
        language: 'text',
        code: `Internet
   |
 WAF
   |
Application Gateway
   |
 Web NSG
   |
Web Tier
   |
 App NSG
   |
App Tier
   |
 DB NSG / Private Endpoint
   |
Database`,
      },
    ],
    tags: ['architecture', 'security'],
  },
]
