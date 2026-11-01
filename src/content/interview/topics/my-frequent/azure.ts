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
      '"I also used Spot node pools for interruptible jobs, and kept Dev App Service plans on lower tiers with autoscale only in production. I cleaned up orphaned resources such as unattached managed disks, unused public IPs, snapshots and old container images. For storage, I used lifecycle policies to move older data from Hot to Cool or Archive tiers. For stable production workloads, I would evaluate Azure Reservations or Savings Plans based on historical usage."',
      '"On the DevOps side, I optimized Docker images using multi-stage builds and cleaned up self-hosted agent resources. I also reviewed Log Analytics ingestion and retention so we weren\'t unnecessarily storing verbose logs. Finally, I used resource tagging and Azure Cost Management to identify which applications and environments were actually driving the cost, and I set budgets and cost alerts so we found any new spike early."',
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
      '- No public IP on application servers where possible\n- No public database access\n- NSGs between tiers\n- WAF at the entry point\n- Azure Firewall when centralized inspection is required\n- Key Vault for secrets\n- Managed Identity instead of hardcoded credentials\n- Private Endpoints for PaaS services\n- TLS for application communication\n- RBAC for Azure access\n- Entra ID sign-in in front of the app',
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
  {
    id: 'itv-myfaq-600',
    level: 'intermediate',
    kind: 'open',
    prompt: 'Which App Service plan do you use, and how does it affect cost?',
    probing:
      'Knowing that you pay for plan instances, not apps, and matching tiers and autoscale limits to each environment.',
    answer: [
      'The **App Service plan** is the compute that the Web App runs on. I pay for the plan instances, not for each app. So the plan tier and the instance count drive the cost.',
      '- **Free / Shared:** Learning only\n- **Basic (B1-B3):** Dev and QA - dedicated compute, manual scale only\n- **Standard (S1-S3):** Smaller production apps - autoscale and deployment slots\n- **Premium v3 (P0v3, P1v3...):** Most production apps - more slots, better VNet integration, faster scaling\n- **Isolated v2 (App Service Environment):** Apps that need full network isolation',
      'How I keep it cheap: Dev and QA run on a Basic plan with 1 instance, and Production runs on Premium v3 with autoscale min 2 / max 4.',
      'Things to remember here:',
      '- **Scale out** = more instances (autoscale). **Scale up** = bigger tier or size.\n- Several small apps can share one plan to save money, but they share the same CPU and memory. A noisy app can slow the others.\n- Delete empty plans. An App Service plan with no apps is still billed.\n- Use different scale-out and scale-in thresholds so the plan does not keep flapping.',
    ],
    code: [
      {
        title: 'Plan per environment',
        language: 'text',
        code: `Dev / QA   -> Basic plan, 1 instance
Production -> Premium v3, autoscale min 2 / max 4`,
      },
      {
        title: 'Example autoscale rule on the plan',
        language: 'text',
        code: `CPU > 70% for 10 min -> add 1 instance (max 4)
CPU < 35% for 15 min -> remove 1 instance (min 2)`,
      },
    ],
    followUps: [
      'Why should the scale-in threshold be lower than the scale-out threshold?',
      'When would you split apps onto separate plans?',
    ],
    tags: ['cost', 'app service', 'autoscale'],
  },
  {
    id: 'itv-myfaq-601',
    level: 'basic',
    kind: 'open',
    prompt: 'How do you stop Azure cost from creeping back up after you optimize it?',
    probing:
      'Guardrails: Advisor recommendations, budgets with alerts, anomaly alerts and Azure Policy.',
    answer: [
      'Saving money once is not enough. I also put guardrails in place so cost does not creep back up.',
      '- **Azure Advisor:** cost recommendations (idle VMs, right-size, reservations)\n- **Budgets:** monthly limit per subscription or resource group\n- **Cost alerts:** email / Action Group at 50%, 80%, 100% of budget\n- **Anomaly alerts:** Cost Management flags an unusual daily spike\n- **Azure Policy:** deny expensive VM SKUs in Dev, require cost tags',
      'For Dev subscriptions, an Azure Policy idea is to allow only B-series and D2s/D4s VM SKUs, and to require the Environment, Owner and CostCenter tags.',
    ],
    code: [
      {
        title: 'Guardrails',
        language: 'text',
        code: `Azure Advisor        -> cost recommendations (idle VMs, right-size, reservations)
Budgets              -> monthly limit per subscription or resource group
Cost alerts          -> email / Action Group at 50%, 80%, 100% of budget
Anomaly alerts       -> Cost Management flags an unusual daily spike
Azure Policy         -> deny expensive VM SKUs in Dev, require cost tags`,
      },
      {
        title: 'Example Azure Policy idea for Dev subscriptions',
        language: 'text',
        code: `Allowed VM SKUs  -> B-series and D2s/D4s only
Required tags    -> Environment, Owner, CostCenter`,
      },
    ],
    tags: ['cost', 'budgets', 'advisor', 'azure policy'],
  },
  {
    id: 'itv-myfaq-602',
    level: 'advanced',
    kind: 'scenario',
    prompt: 'You notice the Azure cost has increased a lot. What will you do?',
    probing:
      'A calm detect, fix, root cause, prevent flow using Cost analysis and the Activity Log - not deleting things blindly.',
    answer: [
      'I follow **detect -> fix -> root cause -> prevent**.',
      'In Cost Management I open Cost analysis, group by subscription, then resource group, then resource or meter, and compare with last week or last month.',
      'Then I find the cause: new resources, bigger SKUs, unexpected scale-out, storage growth, data transfer, Log Analytics ingestion, or something left running after a test. The Activity Log tells me who created or changed it, and when.',
      'Fix: stop, resize or delete (after checking with the owner). Prevent: budgets and alerts, Azure Policy, tags, RBAC and scheduled shutdown.',
      '"I would not just delete the expensive resource. I would confirm with the owner, find out from the Activity Log how it was created, and then add a budget alert, a policy and the right RBAC so the same thing cannot happen again."',
    ],
    code: [
      {
        title: 'Investigation flow',
        language: 'text',
        code: `Cost Management -> Cost analysis
        |
Group by subscription -> resource group -> resource / meter
        |
Compare with last week / last month
        |
Find the cause:
  new resources, bigger SKUs, unexpected scale-out,
  storage growth, data transfer, Log Analytics ingestion,
  something left running after a test
        |
Activity Log -> who created or changed it, and when
        |
Fix: stop / resize / delete (after checking with the owner)
        |
Prevent: budgets + alerts, Azure Policy, tags, RBAC, scheduled shutdown`,
      },
    ],
    diagrams: [
      {
        kind: 'flow',
        title: 'Cost spike: detect to prevent',
        caption: 'Find the meter, find who changed it, fix with the owner, then add guardrails.',
        nodes: [
          { label: 'Cost analysis', detail: 'Group by RG, resource, meter' },
          { label: 'Compare periods', detail: 'Last week / last month' },
          { label: 'Activity Log', detail: 'Who created or changed it' },
          {
            label: 'Fix with owner',
            detail: 'Stop, resize or delete',
            tone: 'warning',
          },
          {
            label: 'Prevent',
            detail: 'Budgets, Policy, tags, RBAC',
            tone: 'success',
          },
        ],
      },
    ],
    followUps: [
      'The spike is Log Analytics ingestion. What do you check next?',
      'How would you get warned earlier next time?',
    ],
    tags: ['cost', 'troubleshooting', 'cost management'],
  },
  {
    id: 'itv-myfaq-603',
    level: 'advanced',
    kind: 'scenario',
    prompt: 'A Storage Account has become public. How do you remediate it?',
    probing:
      'Separating public network access from anonymous blob access, closing both safely, checking whether data was read, and preventing it in code and policy.',
    answer: [
      'First I find out **what kind of public** it is. There are two separate settings, and I check both:',
      '- **Public network access:** Anyone on the internet can reach the account endpoint (they still need a key, SAS or RBAC)\n- **Anonymous blob access:** Anyone can read blobs **without any credentials** - this is the dangerous one',
      'Remediation flow: identify the exposure, disable anonymous blob access and set containers to Private, disable public network access and use a Private Endpoint or selected networks, review keys, SAS tokens and RBAC, check the Activity Log and storage logs, and prevent it with Azure Policy and Terraform/Bicep.',
      'If some clients really need internet access, I set it to **selected networks** with IP rules instead of all networks.',
      'After closing the exposure, I check:',
      '- If anonymous access was on, I check the storage logs (diagnostic settings to Log Analytics) to see whether data was read.\n- If a key or SAS may have leaked, I rotate the account keys. Rotating keys invalidates account SAS tokens signed with that key.\n- I remove extra RBAC roles such as Storage Blob Data Contributor or Owner where they are not needed.',
      'For prevention I use the built-in Azure Policies "Storage accounts should disable public network access" and "Storage account public access should be disallowed" with the **Deny** effect.',
    ],
    deeper: [
      'Public network access and anonymous blob access are different controls.',
      'Turn on private access only after the Private Endpoint and Private DNS are tested, or the application will break.',
      'Before disabling shared keys, check that nothing still uses a connection string. Some tools and older SDKs need keys.',
    ],
    code: [
      {
        title: 'Quick commands',
        language: 'bash',
        code: `# Which containers allow anonymous access?
az storage container list --account-name <account> --auth-mode login \\
  --query "[].{name:name, access:properties.publicAccess}" -o table

# Lock the account down
az storage account update -g <rg> -n <account> \\
  --allow-blob-public-access false \\
  --public-network-access Disabled`,
        placeholders: ['<account>', '<rg>'],
      },
      {
        title: 'Prevention in code',
        language: 'hcl',
        code: `resource "azurerm_storage_account" "app" {
  name                     = "stappprod001"
  resource_group_name      = azurerm_resource_group.app.name
  location                 = azurerm_resource_group.app.location
  account_tier             = "Standard"
  account_replication_type = "ZRS"

  public_network_access_enabled   = false
  allow_nested_items_to_be_public = false # no anonymous blob access
  shared_access_key_enabled       = false # Entra ID only, no account keys
  min_tls_version                 = "TLS1_2"
}`,
      },
    ],
    diagrams: [
      {
        kind: 'flow',
        title: 'Public Storage Account remediation',
        caption:
          'Close anonymous access first, then the network, then check what leaked and prevent it.',
        nodes: [
          { label: 'Identify exposure', detail: 'Network access or anonymous container?' },
          {
            label: 'Disable anonymous access',
            detail: 'Containers set to Private',
            tone: 'danger',
          },
          {
            label: 'Disable public network',
            detail: 'Private Endpoint or selected networks',
          },
          { label: 'Review access', detail: 'Keys, SAS tokens, RBAC, logs' },
          { label: 'Prevent', detail: 'Azure Policy + Terraform/Bicep', tone: 'success' },
        ],
      },
    ],
    followUps: [
      'How do you know whether data was actually read while it was public?',
      'What breaks if you disable shared key access?',
    ],
    tags: ['storage', 'security', 'remediation'],
  },
  {
    id: 'itv-myfaq-604',
    level: 'intermediate',
    kind: 'scenario',
    prompt:
      'An Azure Function generates a PDF and stores it in a Storage Account. How is the storage part set up?',
    probing:
      'Private containers, managed identity with a scoped role, identity-based host storage, Event Grid triggers, idempotent names and lifecycle rules.',
    answer: [
      'In my project, an Azure Function picked up requests from Service Bus, generated the document, and saved it to Blob Storage.',
      'The storage-side points are:',
      '- **Separate containers** for input, output and failed files, all private.\n- **Managed identity** on the Function App, with **Storage Blob Data Contributor** scoped to the account or to the output container. No account keys in app settings.\n- The Function App also has its own **host storage** (`AzureWebJobsStorage`). I use an identity-based connection (`AzureWebJobsStorage__accountName`) instead of a connection string.\n- If the flow starts from a file upload, a **Blob Created** event through **Event Grid** triggers the Function. This is faster and more reliable than the old polling blob trigger.\n- **Idempotent writes:** use a fixed blob name such as `output/<request-id>.pdf`, so a retry overwrites the same file instead of creating duplicates.\n- **Lifecycle rule:** move PDFs older than 30 days to Cool and delete them after the retention period.\n- Users download through a **short-lived user delegation SAS** or through the API, never through a public container.',
      'Things to remember here:',
      '- Blob is the right choice here because PDFs are unstructured files.\n- Keep the generated-file account private, with a Private Endpoint if the Function is VNet-integrated.',
    ],
    code: [
      {
        title: 'Function to Blob flow',
        language: 'text',
        code: `Request -> Service Bus queue
              |
         Azure Function (managed identity)
              |
         Generate PDF
              |
         Blob Storage
           input/      <- source files (if a file upload starts the flow)
           output/     <- generated PDFs
           failed/     <- files that could not be processed`,
      },
    ],
    diagrams: [
      {
        kind: 'flow',
        title: 'Generated PDF to Blob Storage',
        caption: 'The Function writes with its managed identity into a private output container.',
        nodes: [
          { label: 'Service Bus queue', detail: 'Incoming request' },
          { label: 'Azure Function', detail: 'Managed identity' },
          { label: 'Generate PDF' },
          {
            label: 'Blob output container',
            detail: 'output/request-id.pdf',
            tone: 'success',
            branch: { label: 'failed container', detail: 'Could not be processed', tone: 'danger' },
          },
        ],
      },
    ],
    tags: ['storage', 'azure functions', 'blob', 'managed identity'],
  },
  {
    id: 'itv-myfaq-605',
    level: 'intermediate',
    kind: 'open',
    prompt:
      'Which applications did you use in the frontend and backend, and how does the frontend connect to the backend?',
    probing:
      'Understanding that React runs in the browser, so the browser calls the API through the gateway or ingress - not the React pod.',
    answer: [
      'The frontend was **React.js**, served by **Nginx**. The backend was **Java Spring Boot** REST APIs. The data was in **Azure Database for PostgreSQL**. Both apps ran as separate containers in AKS.',
      "The key point: **React runs in the user's browser.** So the browser calls the backend over HTTPS, not the React pod.",
      'Things to remember here:',
      '- React never talks to the database. Only the backend does.\n- Same domain for UI and API (`/` and `/api`) means **no CORS problem**. If the API is on another domain, the backend must allow the frontend origin in its CORS settings.\n- Values like `VITE_API_URL` or `REACT_APP_API_URL` are baked in at **build time**. A relative `/api` path lets the same image run in every environment.\n- `backend-service:8080` works only inside the cluster. The browser cannot resolve it.',
    ],
    code: [
      {
        title: 'Request path',
        language: 'text',
        code: `Browser (React code)
   |
   | GET https://myapp.com/api/orders
   v
Application Gateway / Ingress
   |
   +-- /       -> frontend-service (ClusterIP) -> Nginx pods (React files)
   |
   +-- /api/*  -> backend-service  (ClusterIP) -> Spring Boot pods :8080
                                                     |
                                                     v
                                               PostgreSQL :5432`,
      },
      {
        title: 'React calls a relative path',
        language: 'text',
        code: `const response = await fetch("/api/orders");`,
      },
      {
        title: 'Spring Boot exposes it',
        language: 'text',
        code: `@GetMapping("/api/orders")
public List<Order> getOrders() {
    return orderService.findAll();
}`,
      },
    ],
    diagrams: [
      {
        kind: 'sequence',
        title: 'Browser to API to database',
        caption: 'The browser, not the React pod, calls the backend.',
        participants: [
          { id: 'browser', label: 'Browser (React)' },
          { id: 'gw', label: 'App Gateway / Ingress' },
          { id: 'api', label: 'Spring Boot' },
          { id: 'db', label: 'PostgreSQL' },
        ],
        messages: [
          { from: 'browser', to: 'gw', label: 'GET /api/orders (HTTPS)' },
          { from: 'gw', to: 'api', label: 'backend-service :8080' },
          { from: 'api', to: 'db', label: 'SQL on 5432' },
          { from: 'db', to: 'api', label: 'rows', kind: 'return' },
          { from: 'api', to: 'browser', label: 'JSON', kind: 'return' },
        ],
      },
    ],
    tags: ['architecture', 'frontend', 'backend', 'aks'],
  },
  {
    id: 'itv-myfaq-606',
    level: 'intermediate',
    kind: 'open',
    prompt: 'What types of load balancers are there? Which one have you used in Azure?',
    probing:
      'Layer 4 versus Layer 7, the Azure service for each scope, and how an L4 load balancer actually distributes connections.',
    answer: [
      'Load balancers are mainly **Layer 4** or **Layer 7**.',
      '- **Layer 4:** works on TCP / UDP, routes by IP and port, no TLS termination (pass-through), no WAF. Azure service: Azure Load Balancer.\n- **Layer 7:** works on HTTP / HTTPS, routes by host, URL path, headers, cookies, terminates TLS, supports WAF. Azure services: Application Gateway, Front Door.',
      'The Azure load balancing options:',
      '- **Azure Load Balancer:** L4, regional - VMs, VMSS, AKS `LoadBalancer` Services\n- **Application Gateway (+ WAF):** L7, regional - web apps, path-based routing, TLS, WAF\n- **Azure Front Door (+ WAF):** L7, global - multi-region web apps, CDN, global failover\n- **Traffic Manager:** DNS, global - DNS-based failover for any protocol',
      'Azure Load Balancer comes as **public** (has a public IP) or **internal** (private IP inside the VNet).',
      '**How a Layer 4 load balancer distributes traffic:** it builds a **5-tuple hash** (source IP, source port, destination IP, destination port, protocol) and sends the whole connection to one healthy backend. It is not strict round-robin. If a client must stick to one VM, I set **session persistence** to client IP.',
      'What I used: "I mainly used Azure Load Balancer. AKS creates it automatically for a `LoadBalancer` Service, such as the ingress controller. I also used internal load balancers for private services and configured health probes and rules for VM Scale Sets. For web traffic, Application Gateway with WAF was the entry point, because it gives TLS termination and path-based routing."',
      'Things to remember here:',
      '- The **Basic** SKU of Azure Load Balancer was retired in September 2025. Use **Standard**.\n- Standard Load Balancer is closed by default. The NSG must allow the traffic.',
    ],
    diagrams: [
      {
        kind: 'decision',
        title: 'Choosing an Azure load balancer',
        caption: 'Pick by layer and scope: regional or global, TCP or HTTP.',
        question: 'What traffic are you balancing?',
        branches: [
          { condition: 'TCP/UDP in one region', result: 'Azure Load Balancer' },
          {
            condition: 'HTTP in one region, needs WAF',
            result: 'Application Gateway + WAF',
            tone: 'accent',
          },
          { condition: 'HTTP across regions', result: 'Azure Front Door' },
          { condition: 'Any protocol, DNS failover', result: 'Traffic Manager' },
        ],
      },
    ],
    tags: ['networking', 'load balancer', 'application gateway'],
  },
  {
    id: 'itv-myfaq-607',
    level: 'advanced',
    kind: 'scenario',
    prompt:
      'How do you set up health probes in a load balancer, and what do you check when a running VM shows as unhealthy?',
    probing:
      'Probe types and rules, Application Gateway custom probes, and the classic causes: bind address, NSG blocking 168.63.129.16, guest firewall.',
    answer: [
      'A health probe checks each backend regularly. Only healthy backends get **new** connections.',
      'Probe types: **TCP** (port is open), **HTTP** and **HTTPS** (path must return 200).',
      'On **Application Gateway**, I add a custom probe with the host name and path, for example `/actuator/health` for Spring Boot. It accepts 200-399 by default.',
      'If a running VM shows as unhealthy, I check:',
      '- Is the app listening on the probe port, and on `0.0.0.0`, not only `127.0.0.1`? (`ss -lntp`)\n- Does `curl -i http://localhost:8080/health` return 200?\n- Does the NSG allow the `AzureLoadBalancer` service tag? Probes come from `168.63.129.16`. A custom "deny all inbound" rule blocks them.\n- Is the guest OS firewall blocking the port?',
    ],
    deeper: [
      'Keep the health endpoint light. If it checks the database and the database is slow, every backend can be marked unhealthy at once.',
      'In AKS, readiness probes decide which pods get traffic. The load balancer probe checks the node or ingress level.',
    ],
    code: [
      {
        title: 'Probe results',
        language: 'text',
        code: `Load Balancer -- probe HTTP :8080 /health every 5s -->  VM1  200  -> healthy
                                                        VM2  200  -> healthy
                                                        VM3  timeout -> removed`,
      },
      {
        title: 'Create a probe and a rule',
        language: 'bash',
        code: `az network lb probe create -g my-rg --lb-name my-lb -n app-probe \\
  --protocol Http --port 8080 --path /health --interval 5 --probe-threshold 2

az network lb rule create -g my-rg --lb-name my-lb -n app-rule \\
  --protocol Tcp --frontend-port 80 --backend-port 8080 \\
  --frontend-ip-name my-frontend --backend-pool-name my-pool --probe-name app-probe`,
      },
    ],
    diagrams: [
      {
        kind: 'flow',
        title: 'Unhealthy backend checklist',
        caption: 'Work from the app outwards: listener, local response, NSG, guest firewall.',
        nodes: [
          { label: 'App listening?', detail: 'ss -lntp, bound to 0.0.0.0' },
          { label: 'Local health check', detail: 'curl localhost:8080/health = 200' },
          {
            label: 'NSG allows probes',
            detail: 'AzureLoadBalancer tag, 168.63.129.16',
            tone: 'warning',
          },
          { label: 'Guest OS firewall', detail: 'Port open inside the VM' },
        ],
      },
    ],
    followUps: [
      'Why can a deep health check take the whole backend pool down?',
      'How do readiness probes in AKS relate to the load balancer probe?',
    ],
    tags: ['networking', 'load balancer', 'health probes', 'troubleshooting'],
  },
  {
    id: 'itv-myfaq-608',
    level: 'advanced',
    kind: 'open',
    prompt:
      'What are the Kubernetes Service types, and how do you expose an application in AKS with Ingress and NGINX?',
    probing:
      'Service types and when to use each, the difference between Ingress rules and the Ingress Controller, and current controller options in AKS.',
    answer: [
      'A **Service** gives a stable name and IP to a group of pods, because pod IPs change.',
      '- **ClusterIP (default):** inside the cluster - backend APIs, internal services\n- **NodePort:** `NodeIP:30000-32767` - testing\n- **LoadBalancer:** public or private IP (Azure Load Balancer) - exposing one service, or the ingress controller\n- **ExternalName:** DNS alias to an outside name - external database or API\n- **Headless (`clusterIP: None`):** DNS returns pod IPs - StatefulSets such as Kafka',
      '**What is an Ingress Controller?** An **Ingress** is only a set of HTTP routing rules. The **Ingress Controller** is the pod that reads those rules and actually routes the traffic. Without a controller, an Ingress does nothing. One controller gives one IP for many apps, instead of one load balancer per app.',
      '**What is NGINX?** NGINX is a fast web server and reverse proxy. I used it in two places:',
      '- **Inside the frontend image:** it serves the React build files and can send `/api` to the backend.\n- **As the ingress controller:** it routes HTTP traffic to Services, terminates TLS and load balances across pods.',
      'Things to remember here:',
      '- Backend apps stay **ClusterIP**. Only the ingress controller gets a `LoadBalancer` Service.\n- `kubectl port-forward` is for debugging only.',
    ],
    deeper: [
      'Options for the controller in AKS:',
      '- **Community ingress-nginx:** The Kubernetes project retired it in March 2026. No more fixes, so plan a move\n- **AKS application routing add-on:** Managed NGINX by Microsoft, with a limited support window. Check the current AKS notes\n- **AGIC (Application Gateway Ingress Controller):** Uses Application Gateway + WAF as the L7 entry point\n- **Application Gateway for Containers:** Newer Azure option. Supports the **Gateway API**, the successor to Ingress',
    ],
    code: [
      {
        title: 'Internal-only load balancer in AKS',
        language: 'yaml',
        code: `metadata:
  annotations:
    service.beta.kubernetes.io/azure-load-balancer-internal: "true"
spec:
  type: LoadBalancer`,
      },
      {
        title: 'Ingress traffic path',
        language: 'text',
        code: `Internet
   |
Azure Load Balancer (public IP)
   |
Ingress controller pods (LoadBalancer Service)
   |
   +-- myapp.com/      -> frontend-service (ClusterIP)
   +-- myapp.com/api   -> backend-service  (ClusterIP)`,
      },
      {
        title: 'Ingress',
        language: 'yaml',
        code: `apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: myapp
spec:
  ingressClassName: nginx
  tls:
    - hosts: [myapp.com]
      secretName: myapp-tls
  rules:
    - host: myapp.com
      http:
        paths:
          - path: /api
            pathType: Prefix
            backend:
              service: { name: backend-service, port: { number: 8080 } }
          - path: /
            pathType: Prefix
            backend:
              service: { name: frontend-service, port: { number: 80 } }`,
      },
      {
        title: 'NGINX inside the frontend image',
        language: 'text',
        code: `server {
  listen 80;
  root /usr/share/nginx/html;

  location / {
    try_files $uri /index.html;   # React client-side routing
  }

  location /api/ {
    proxy_pass http://backend-service:8080;
  }
}`,
      },
    ],
    diagrams: [
      {
        kind: 'flow',
        title: 'Exposing apps through one ingress',
        caption: 'Only the ingress controller is a LoadBalancer Service; apps stay ClusterIP.',
        nodes: [
          { label: 'Internet' },
          { label: 'Azure Load Balancer', detail: 'Public IP' },
          { label: 'Ingress controller pods', detail: 'Reads Ingress rules', tone: 'accent' },
          { label: 'ClusterIP Services', detail: '/ frontend, /api backend' },
          { label: 'Pods' },
        ],
      },
    ],
    followUps: [
      'ingress-nginx is retired. Which option would you migrate to, and why?',
      'Why not give every app its own LoadBalancer Service?',
    ],
    tags: ['aks', 'kubernetes', 'ingress', 'nginx'],
  },
  {
    id: 'itv-myfaq-609',
    level: 'advanced',
    kind: 'scenario',
    prompt: 'Your frontend and backend use HTTP. How do you move them to HTTPS?',
    probing:
      'Certificates in Key Vault, HTTPS listener and redirect, TLS policy, backend TLS, app config (mixed content, cookies, redirect URIs) and testing.',
    answer: [
      'It is more than changing `http` to `https`. I need certificates, HTTPS listeners, a redirect, backend TLS and app config changes.',
      'The steps I follow are:',
      '- **Certificate:** from a trusted CA, stored in **Key Vault**. The CN/SAN must match `app.company.com`. Application Gateway reads it through a user-assigned managed identity. In AKS, **cert-manager** can issue and renew certificates automatically.\n- **HTTPS listener** on port 443, plus a **redirect rule** from HTTP 80 to HTTPS 443.\n- **SSL policy:** TLS 1.2 or higher.\n- **Backend:** backend settings on HTTPS 443, with a host name that matches the backend certificate.\n- **App config:** change API URLs to `https://`, so the browser does not block **mixed content**. Mark cookies `Secure`, add HSTS, and update Entra ID redirect URIs.\n- **NSG:** allow 443. Keep 80 only for the redirect.\n- **Test** in Dev and QA first: certificate chain, redirect, API calls, login callback.',
    ],
    deeper: [
      'Azure Load Balancer is Layer 4 and cannot terminate TLS. Use Application Gateway, Front Door or the ingress controller.',
      'TLS only up to Application Gateway is enough if policy allows it. If the requirement is end-to-end encryption, the backend must also use HTTPS.',
      'Add certificate expiry alerts, or use auto-renewal.',
    ],
    code: [
      {
        title: 'HTTPS end to end',
        language: 'text',
        code: `User --HTTPS 443--> Application Gateway (cert from Key Vault, WAF)
                          |
                          | HTTPS (end-to-end TLS, if required)
                          v
                    Ingress / frontend / backend
                          |
                          | TLS
                          v
                      PostgreSQL (TLS enforced)`,
      },
    ],
    diagrams: [
      {
        kind: 'flow',
        title: 'TLS along the request path',
        caption:
          'Terminate at the gateway; re-encrypt to the backend when end-to-end TLS is required.',
        nodes: [
          { label: 'User', detail: 'HTTPS 443, HTTP 80 redirected' },
          {
            label: 'Application Gateway',
            detail: 'Cert from Key Vault, WAF',
            tone: 'accent',
          },
          {
            label: 'Ingress / frontend / backend',
            arrowLabel: 'HTTPS if end-to-end',
          },
          { label: 'PostgreSQL', detail: 'TLS enforced', arrowLabel: 'TLS' },
        ],
      },
    ],
    followUps: [
      'The site loads but API calls fail after the switch. What do you check?',
      'How do you avoid a certificate expiring in production?',
    ],
    tags: ['security', 'tls', 'https', 'application gateway'],
  },
  {
    id: 'itv-myfaq-610',
    level: 'advanced',
    kind: 'open',
    prompt: 'Have you created a private Kubernetes cluster? How?',
    probing:
      'Private API server, private DNS zone links, Entra ID access, self-hosted agents for CI/CD, and command invoke.',
    answer: [
      'Yes. In a private AKS cluster, the **API server has only a private IP** in our VNet. `kubectl` works only from a connected network.',
      'What I set up for the cluster:',
      '- **Network:** VNet with subnets for nodes, private endpoints and build agents. No overlap with peered or on-premises ranges. Egress through Azure Firewall if needed.\n- **DNS:** AKS creates a private DNS zone. In hub-spoke, I link it to the hub VNet or bring my own zone with `--private-dns-zone`.\n- **Access:** Entra ID login with Azure RBAC for Kubernetes. Engineers connect through a jumpbox, Bastion or VPN.\n- **CI/CD:** a **self-hosted Azure DevOps agent** (VM or VMSS agent pool) inside the VNet. Microsoft-hosted agents cannot reach the private API server.\n- **Quick admin command without network access:** `az aks command invoke` runs `kubectl` through Azure.',
      'Things to remember here:',
      '- If `kubectl` times out or the name does not resolve, check the private DNS zone link first.\n- A private cluster hides the **control plane**. App traffic still comes through the ingress or Application Gateway.',
    ],
    code: [
      {
        title: 'Create a private cluster',
        language: 'bash',
        code: `az aks create -g rg-prod -n aks-prod \\
  --enable-private-cluster \\
  --network-plugin azure \\
  --vnet-subnet-id <aks-subnet-id> \\
  --enable-managed-identity \\
  --enable-aad --enable-azure-rbac \\
  --generate-ssh-keys`,
        placeholders: ['<aks-subnet-id>'],
      },
      {
        title: 'How kubectl reaches the API server',
        language: 'text',
        code: `Jumpbox / VPN / self-hosted agent (in VNet or peered VNet)
        |
Private DNS zone (privatelink.<region>.azmk8s.io) -> private IP
        |
AKS API server private endpoint`,
      },
      {
        title: 'Admin command without network access',
        language: 'bash',
        code: `az aks command invoke -g rg-prod -n aks-prod --command "kubectl get pods -A"`,
      },
    ],
    diagrams: [
      {
        kind: 'flow',
        title: 'Reaching a private AKS API server',
        caption: 'Name resolution through the private DNS zone is what usually breaks.',
        nodes: [
          { label: 'Jumpbox / VPN / agent', detail: 'In VNet or peered VNet' },
          {
            label: 'Private DNS zone',
            detail: 'privatelink.region.azmk8s.io',
            tone: 'warning',
          },
          { label: 'API server private endpoint', tone: 'accent' },
        ],
      },
    ],
    followUps: [
      'Your pipeline cannot deploy to the private cluster. Why, and what do you change?',
      'In hub-and-spoke, where do you link the private DNS zone?',
    ],
    tags: ['aks', 'private cluster', 'networking', 'security'],
  },
  {
    id: 'itv-myfaq-611',
    level: 'advanced',
    kind: 'open',
    prompt:
      'How do you connect the AKS backend to the database through a private endpoint? How does the request flow with VNet, subnet and private endpoint?',
    probing:
      'That a private endpoint is a NIC plus DNS: the app keeps the host name, the private DNS zone returns a private IP, and most failures are DNS.',
    answer: [
      'A **private endpoint** is a NIC with a private IP in my subnet that connects to one PaaS resource through **Private Link**. The app keeps using the normal host name. **DNS is what changes.**',
      'The flow: the Spring Boot pod connects to `mydb.postgres.database.azure.com:5432`. DNS returns a CNAME to `mydb.privatelink.postgres.database.azure.com`, and the private DNS zone linked to the VNet returns the A record `10.0.2.5`. The pod sends TCP 5432 to that IP (NSG, UDR and firewall are checked), the private endpoint NIC forwards it over Private Link on the Microsoft backbone to PostgreSQL with public access disabled, and authentication is Entra ID (workload identity) or a password from Key Vault.',
      'Private DNS zones and ports I use:',
      '- **Azure SQL:** `privatelink.database.windows.net`, 1433\n- **PostgreSQL:** `privatelink.postgres.database.azure.com`, 5432\n- **Key Vault:** `privatelink.vaultcore.azure.net`, 443\n- **Blob Storage:** `privatelink.blob.core.windows.net`, 443\n- **ACR:** `privatelink.azurecr.io`, 443',
      'Things to remember here:',
      '- Most failures are DNS. With custom or hub DNS servers, they must forward to Azure DNS `168.63.129.16` or a DNS Private Resolver.\n- Use the host name, not the IP. TLS certificates expect the host name.\n- NSGs apply to the private endpoint subnet only if network policies are enabled on that subnet.\n- Disable public access **after** private connectivity is tested.',
    ],
    deeper: [
      'A **service endpoint** is different: the service keeps its public IP, but only allows chosen subnets.',
      'PostgreSQL Flexible Server has a second model: **VNet integration** in a delegated subnet. You choose it at creation time. The private endpoint model is used with the "public access" networking mode.',
    ],
    code: [
      {
        title: 'Request flow',
        language: 'text',
        code: `Spring Boot pod (snet-aks 10.0.1.0/24)
   |
   | 1. connect mydb.postgres.database.azure.com:5432
   v
DNS: CNAME -> mydb.privatelink.postgres.database.azure.com
     Private DNS zone (linked to the VNet) -> A record 10.0.2.5
   |
   | 2. TCP 5432 to 10.0.2.5 (NSG / UDR / firewall checked)
   v
Private endpoint NIC (snet-private-endpoints 10.0.2.5)
   |
   | 3. Private Link over the Microsoft backbone
   v
PostgreSQL (public access disabled)
   |
   | 4. Authentication: Entra ID (workload identity) or password from Key Vault`,
      },
      {
        title: 'Setup',
        language: 'bash',
        code: `az network private-endpoint create -g my-rg -n pe-postgres \\
  --vnet-name aks-vnet --subnet snet-private-endpoints \\
  --private-connection-resource-id <postgres-id> \\
  --group-id postgresqlServer --connection-name pe-postgres-conn

az network private-dns zone create -g my-rg -n privatelink.postgres.database.azure.com

az network private-dns link vnet create -g my-rg \\
  --zone-name privatelink.postgres.database.azure.com \\
  --name aks-vnet-link --virtual-network aks-vnet --registration-enabled false

az network private-endpoint dns-zone-group create -g my-rg \\
  --endpoint-name pe-postgres --name default \\
  --private-dns-zone privatelink.postgres.database.azure.com --zone-name postgres`,
        placeholders: ['<postgres-id>'],
      },
      {
        title: 'Test from inside the cluster',
        language: 'bash',
        code: `kubectl run net-test -it --rm --image=busybox -- sh
nslookup mydb.postgres.database.azure.com   # must return 10.x, not a public IP
nc -zv mydb.postgres.database.azure.com 5432`,
      },
    ],
    diagrams: [
      {
        kind: 'sequence',
        title: 'Pod to PostgreSQL via private endpoint',
        caption: 'Same host name, private answer from DNS, traffic over Private Link.',
        participants: [
          { id: 'pod', label: 'Spring Boot pod' },
          { id: 'dns', label: 'Private DNS zone' },
          { id: 'pe', label: 'Private endpoint NIC' },
          { id: 'db', label: 'PostgreSQL' },
        ],
        messages: [
          { from: 'pod', to: 'dns', label: 'Resolve mydb host name' },
          { from: 'dns', to: 'pod', label: 'A record 10.0.2.5', kind: 'return' },
          { from: 'pod', to: 'pe', label: 'TCP 5432 to 10.0.2.5' },
          { from: 'pe', to: 'db', label: 'Private Link, backbone' },
          { from: 'db', to: 'pod', label: 'TLS session, auth', kind: 'return' },
        ],
      },
    ],
    followUps: [
      'nslookup returns a public IP from the pod. What is wrong?',
      'When would you choose VNet integration instead of a private endpoint for PostgreSQL?',
    ],
    tags: ['networking', 'private endpoint', 'aks', 'postgresql', 'dns'],
  },
  {
    id: 'itv-myfaq-612',
    level: 'intermediate',
    kind: 'open',
    prompt: 'Tell me about the PostgreSQL database in your project.',
    probing:
      'Flexible Server with private access, Entra auth, zone-redundant HA, backups and PITR, monitoring, and connection-pool sizing.',
    answer: [
      'We used **Azure Database for PostgreSQL Flexible Server**. (Single Server was retired in March 2025.) I provisioned it with Bicep and handled backups, connectivity and basic performance checks.',
      '- **Network:** Private access only, through a private endpoint or VNet integration. Port 5432\n- **Auth:** Entra ID authentication where possible. Otherwise the password is kept in Key Vault\n- **HA:** Zone-redundant HA in production: a standby in another zone, with automatic failover\n- **Backup:** Automatic backups, 7-35 days retention, point-in-time restore. Geo-redundant backup for DR\n- **Scale:** Read replicas for reporting. Compute and storage scaled by tier\n- **Monitoring:** Azure Monitor metrics: CPU, connections, storage. Alerts through Action Groups',
      'Things to remember here:',
      '- **Connection pools:** 20 pods x 50 connections = 1000 connections, which can exceed `max_connections`. Size the pool per pod, or use the built-in **PgBouncer** (port 6432).\n- For "app cannot connect", check in order: DNS -> `nc` on 5432 -> NSG/firewall -> credentials -> connection limits.',
    ],
    code: [
      {
        title: 'Connect',
        language: 'bash',
        code: `psql "host=mydb.postgres.database.azure.com port=5432 dbname=orders user=appuser sslmode=require"`,
      },
      {
        title: 'Connections and long-running queries',
        language: 'text',
        code: `SELECT count(*) FROM pg_stat_activity;                -- current connections
SELECT pid, now() - query_start AS duration, query
FROM pg_stat_activity WHERE state = 'active'
ORDER BY duration DESC;                               -- long-running queries`,
      },
      {
        title: 'Logical backup and restore',
        language: 'bash',
        code: `pg_dump -Fc -h <host> -U <user> -d orders -f orders.dump    # logical backup
pg_restore -h <host> -U <user> -d orders orders.dump`,
        placeholders: ['<host>', '<user>'],
      },
    ],
    diagrams: [
      {
        kind: 'flow',
        title: 'App cannot connect to PostgreSQL',
        caption: 'Check in order, from name resolution to connection limits.',
        nodes: [
          { label: 'DNS', detail: 'Resolves to private IP?' },
          { label: 'nc on 5432', detail: 'Port reachable?' },
          { label: 'NSG / firewall' },
          { label: 'Credentials', detail: 'Entra ID or Key Vault password' },
          { label: 'Connection limits', detail: 'max_connections, PgBouncer', tone: 'warning' },
        ],
      },
    ],
    tags: ['database', 'postgresql', 'high availability', 'backup'],
  },
  {
    id: 'itv-myfaq-613',
    level: 'basic',
    kind: 'open',
    prompt: 'How do you connect two VNets?',
    probing:
      'VNet peering both ways with non-overlapping ranges, non-transitivity, hub-and-spoke and gateway transit.',
    answer: [
      'I use **VNet peering**. Traffic stays on the Microsoft backbone, and no gateway is needed.',
      'Steps: address spaces must not overlap -> create both peerings -> status **Connected** -> tighten NSGs (for example, allow only TCP 5432 from the app subnet) -> test with `nc -zv`.',
      'Things to remember here:',
      "- Different regions -> **global VNet peering**. Different subscriptions or tenants also work, with Network Contributor on both sides.\n- Peering is **not transitive**. A <-> B <-> C does not let A reach C. Use **hub-and-spoke** with Azure Firewall or an NVA in the hub, or **Virtual WAN**.\n- Spokes can share the hub's VPN gateway with **gateway transit** (`--allow-gateway-transit` on the hub, `--use-remote-gateways` on the spoke).\n- VNet-to-VNet **VPN** is used only when an IPsec tunnel is required. It is slower and costs more.",
    ],
    code: [
      {
        title: 'Peering',
        language: 'text',
        code: `VNet-A 10.0.0.0/16  <--- peering (both directions) --->  VNet-B 10.1.0.0/16`,
      },
      {
        title: 'Create both peerings',
        language: 'bash',
        code: `az network vnet peering create -g rg-a --vnet-name vnet-a -n a-to-b \\
  --remote-vnet <vnet-b-id> --allow-vnet-access
az network vnet peering create -g rg-b --vnet-name vnet-b -n b-to-a \\
  --remote-vnet <vnet-a-id> --allow-vnet-access`,
        placeholders: ['<vnet-a-id>', '<vnet-b-id>'],
      },
    ],
    followUps: ['A is peered with B, and B with C. Can A reach C?'],
    tags: ['networking', 'vnet peering', 'hub-spoke'],
  },
  {
    id: 'itv-myfaq-614',
    level: 'advanced',
    kind: 'open',
    prompt: 'How can you restrict users before their requests reach the application?',
    probing:
      'Layering network controls (WAF, access restrictions, private endpoints) with identity controls (Easy Auth, assignment required, Conditional Access).',
    answer: [
      'I restrict at two levels: **network** (where the request comes from) and **identity** (who the user is).',
      '- **WAF:** OWASP rules, plus custom IP, geo and rate-limit rules.\n- **Lock the app to the gateway:** App Service access restrictions allow only the Application Gateway subnet, or the `AzureFrontDoor.Backend` service tag plus the `X-Azure-FDID` header check. Otherwise users can bypass the gateway through `*.azurewebsites.net`.\n- **Entra ID:** App Service Authentication (Easy Auth) with "Require authentication". In the Enterprise application, set **Assignment required = Yes** and assign only the allowed group.\n- **Conditional Access:** require MFA or a compliant device, and block risky locations.\n- For internal apps: no public endpoint at all. Users come through VPN and the private network.',
    ],
    deeper: [
      'WAF stops bad **traffic**. It does not know **who** the user is. Entra ID handles identity, so the two work together.',
      'The app must still check roles for sensitive operations.',
    ],
    code: [
      {
        title: 'Layers in front of the app',
        language: 'text',
        code: `User
 |
Front Door / Application Gateway + WAF   -> blocks SQL injection, XSS, bots,
 |                                          bad IPs or countries, rate limits
 |
Access restrictions / Private Endpoint   -> app accepts traffic only from the gateway
 |
Entra ID sign-in (Easy Auth)             -> not signed in -> redirect to login
 |                                          not in the allowed group -> denied
Application                              -> checks app roles for admin actions`,
      },
    ],
    diagrams: [
      {
        kind: 'flow',
        title: 'Restricting users before the app',
        caption:
          'Network controls decide where traffic may come from; Entra ID decides who gets in.',
        nodes: [
          { label: 'User' },
          {
            label: 'Front Door / App Gateway + WAF',
            detail: 'OWASP, IP, geo, rate limits',
            branch: { label: 'Blocked', detail: 'Bad traffic', tone: 'danger' },
          },
          { label: 'Access restrictions', detail: 'Only from the gateway' },
          {
            label: 'Entra ID sign-in',
            detail: 'Easy Auth, allowed group only',
            tone: 'accent',
            branch: { label: 'Denied', detail: 'Not in group', tone: 'danger' },
          },
          { label: 'Application', detail: 'Checks app roles', tone: 'success' },
        ],
      },
    ],
    followUps: [
      'How do you stop users bypassing Front Door through the azurewebsites.net host name?',
      'Why is WAF alone not enough?',
    ],
    tags: ['security', 'waf', 'entra id', 'app service'],
  },
  {
    id: 'itv-myfaq-615',
    level: 'advanced',
    kind: 'scenario',
    prompt:
      'Dev, QA and UAT are in one resource group and subscription. Pre-Prod and Prod are in another, but both are in the same region. How do you achieve DR?',
    probing:
      'Knowing subscriptions are isolation, not DR; a second region with replicated data, IaC rebuild, global routing, and RTO/RPO-driven design.',
    answer: [
      'Separate subscriptions give **access and billing isolation**. They do **not** give DR, because one regional outage hits both. For DR, Production needs a **second region**.',
      'What I would do for DR:',
      '- Keep Terraform/Bicep and Helm charts ready, so the DR environment can be built the same way.\n- Replicate data: PostgreSQL geo-redundant backups or a cross-region read replica, GRS/GZRS storage, ACR geo-replication.\n- Put **Front Door** or **Traffic Manager** in front, so traffic can switch regions.\n- Write a runbook and run DR drills. Choose the design (active-passive, warm or cold standby) from the agreed **RTO and RPO**.',
    ],
    deeper: [
      '**HA** = zones in one region (protects against node or zone failure). **DR** = another region (protects against regional failure).',
      'Dev, QA and UAT usually do not need a DR copy. Production and its dependencies do.',
    ],
    code: [
      {
        title: 'Primary and DR regions',
        language: 'text',
        code: `Users -> Azure Front Door / Traffic Manager
            |                       |
      Primary region            DR region (paired or chosen region)
      Prod subscription         DR resources (same or separate subscription)
      AKS + App Gateway         AKS (warm standby, or built by IaC on demand)
      PostgreSQL       ---->    geo-redundant backup / cross-region read replica
      ACR Premium      ---->    geo-replicated images
      Key Vault                 Key Vault with the same secrets`,
      },
    ],
    diagrams: [
      {
        kind: 'nested',
        title: 'DR needs a second region',
        caption:
          'Subscriptions isolate access and billing; only another region protects against a regional outage.',
        root: {
          label: 'Front Door / Traffic Manager',
          children: [
            {
              label: 'Primary region',
              tone: 'accent',
              children: [
                { label: 'AKS + App Gateway' },
                { label: 'PostgreSQL', detail: 'Geo-redundant backup' },
                { label: 'ACR Premium', detail: 'Geo-replicated' },
              ],
            },
            {
              label: 'DR region',
              tone: 'muted',
              children: [
                { label: 'AKS', detail: 'Warm standby or built by IaC' },
                { label: 'PostgreSQL', detail: 'Replica or restore' },
                { label: 'Key Vault', detail: 'Same secrets' },
              ],
            },
          ],
        },
      },
    ],
    followUps: [
      'What RTO and RPO would push you from cold standby to warm standby?',
      'How do you test the DR plan without affecting production?',
    ],
    tags: ['architecture', 'disaster recovery', 'subscriptions', 'high availability'],
  },
  {
    id: 'itv-myfaq-616',
    level: 'basic',
    kind: 'open',
    prompt:
      'Give a brief on Azure Container Apps and Azure Container Instances. Where else can the tiers run?',
    probing:
      'Choosing compute by how much control you need: AKS, App Service, Container Apps or ACI.',
    answer: [
      'The same 3-tier design can run on different compute. I choose by how much control we need.',
      '- **AKS:** Managed Kubernetes. We manage node pools, ingress and upgrades. Good for many microservices, full control\n- **App Service:** Managed web hosting for code or containers. Good for simple web apps and APIs\n- **Azure Container Apps:** Serverless containers on managed Kubernetes. KEDA autoscaling (can scale to zero), revisions, traffic splitting, built-in ingress. Good for microservices without running AKS\n- **Azure Container Instances:** Run a single container or group quickly. No orchestration. Good for short jobs, tests, build tasks',
    ],
    code: [
      {
        title: 'Easy way to remember',
        language: 'text',
        code: `ACI            -> run a container
Container Apps -> run and scale an app made of containers
AKS            -> run your own Kubernetes platform`,
      },
    ],
    diagrams: [
      {
        kind: 'decision',
        title: 'Where to run a container tier',
        caption: 'Pick the least platform that meets the need.',
        question: 'How much control do you need?',
        branches: [
          { condition: 'Short job or test', result: 'Container Instances' },
          { condition: 'Simple web app or API', result: 'App Service' },
          {
            condition: 'Microservices, scale to zero',
            result: 'Container Apps',
            tone: 'accent',
          },
          { condition: 'Full Kubernetes control', result: 'AKS' },
        ],
      },
    ],
    tags: ['compute', 'container apps', 'aci', 'app service', 'aks'],
  },
]
