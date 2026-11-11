import type { InterviewQuestion } from '../../../types'

/** Real interview round (part 3b): SRE, EKS, Container Apps, databases, HA/DR, identity, IaC and release pipelines. */
export const roundsGlobantPart3bQuestions: InterviewQuestion[] = [
  {
    id: 'itv-rglb3-19',
    level: 'intermediate',
    kind: 'open',
    prompt: 'Explain proactive monitoring and automation. How do you prevent production downtime?',
    probing:
      'Whether you alert on trends and leading signals rather than only on failures, and can name concrete automation (autoscaling, self-healing, safe deployments, patching, drift and secret control) that stops problems reaching users.',
    answer: [
      '**Reactive** monitoring tells you something **broke**. **Proactive** monitoring tells you it is **about to break**, and automation fixes or prevents it.',
      '**Proactive monitoring**',
      '- Alerts on **trends**, not just failures: disk > 80%, memory growth, queue backlog, node pressure, DB DTU/CPU.\n- **Certificate and secret expiry** alerts (for example 30 days before).\n- **Availability tests** (synthetic checks) from Application Insights from several regions.\n- **Service Health** and **Resource Health** alerts for Azure platform issues and planned maintenance.\n- **Capacity and quota** checks before big releases or events.\n- **SLO burn-rate** alerts.',
      '**Automation that prevents downtime**',
      '- **Autoscaling**: HPA, cluster autoscaler, App Service autoscale, VMSS\n- **Self-healing**: Health probes, liveness/readiness probes, App Service auto-heal\n- **Safe deployments**: Slots, blue/green, canary, approval gates, **automatic rollback** on failed smoke tests\n- **Patching**: Azure Update Manager with maintenance windows\n- **Drift prevention**: IaC only, Azure Policy, scheduled `terraform plan` for drift\n- **Secret rotation**: Key Vault rotation, managed identities (no secrets)\n- **Resilience**: Availability zones, backups, DR drills, chaos tests (Azure Chaos Studio)',
      '**Interview answer:** "Proactive monitoring means alerting on trends before failure: disk and memory growth, queue backlog, certificate expiry, availability tests and Service Health. Then automation prevents or fixes problems: autoscaling, self-healing probes, safe deployments with slots or canary and automatic rollback, patching with Update Manager, IaC with Azure Policy to stop drift, and secret rotation. Combined with zone redundancy and DR drills, most issues are caught before users notice."',
    ],
    traps: [
      'Listing only CPU and error alerts: those fire after users are already affected, which is reactive monitoring.',
      'Assuming autoscaling alone prevents downtime: without quota and capacity checks the scale-out can fail exactly when it is needed.',
    ],
    followUps: [
      'How would you set up an SLO burn-rate alert, and why is it better than a static error threshold?',
      'How do you make a deployment roll back automatically when smoke tests fail?',
      'How do you detect infrastructure drift between Terraform and what is really deployed?',
    ],
    tags: ['sre', 'monitoring', 'automation', 'azure monitor', 'reliability'],
  },
  {
    id: 'itv-rglb3-20',
    level: 'advanced',
    kind: 'open',
    prompt: 'Explain your EKS architecture and how you manage it.',
    probing:
      'That you understand the shared responsibility split on EKS (AWS runs the control plane, you own nodes, networking, add-ons and deployments) and can describe networking, identity, scaling and a safe upgrade order.',
    answer: [
      'We ran EKS in a **multi-AZ VPC** with **private worker nodes**. AWS manages the **control plane**; we manage nodes, networking, add-ons and deployments.',
      '**Architecture by layer**',
      '- **Network**: VPC across 3 AZs: public subnets (load balancers, NAT gateways), private subnets (nodes); security groups; **VPC endpoints** for ECR, S3, STS\n- **Control plane**: Managed EKS, private or restricted public endpoint, control plane logs to CloudWatch\n- **Compute**: **Managed node groups**, plus **Karpenter** or Cluster Autoscaler; Spot for non-critical; Fargate for some workloads\n- **Ingress**: **AWS Load Balancer Controller** (ALB/NLB), ACM certificates, Route 53, AWS WAF\n- **Identity**: **IRSA** or **EKS Pod Identity** for pods; **EKS access entries** (or `aws-auth`) for users; Kubernetes RBAC\n- **Images**: **ECR** with image scanning\n- **Add-ons**: VPC CNI, CoreDNS, kube-proxy, EBS/EFS CSI drivers, metrics-server\n- **Secrets**: AWS Secrets Manager / SSM via Secrets Store CSI driver or External Secrets\n- **Observability**: CloudWatch Container Insights or Prometheus + Grafana; logs with Fluent Bit',
      '**How we managed it**',
      '- **IaC:** Terraform for VPC, EKS and node groups, with remote state in S3 and locking.\n- **Deployments:** pipeline builds the image → pushes to ECR → deploys with **Helm** (or **Argo CD** GitOps).\n- **Scaling:** HPA for pods, Karpenter for nodes.\n- **Upgrades:** control plane first, then add-ons, then node groups (rolling), tested in a lower environment; **PodDisruptionBudgets** protect availability.\n- **Security:** least-privilege IAM, network policies, image scanning, private endpoint.\n- **Cost:** right-sizing, Spot, tagging.',
      '**Interview answer:** "Our EKS ran in a three-AZ VPC with nodes in private subnets, NAT in public subnets and VPC endpoints for ECR and S3. AWS manages the control plane; we used managed node groups with Karpenter, the AWS Load Balancer Controller for ALBs, IRSA for pod permissions and access entries for users. Everything was built with Terraform, apps were deployed with Helm through the pipeline, and upgrades went control plane, then add-ons, then nodes, tested in lower environments first with PodDisruptionBudgets in place."',
    ],
    code: [
      {
        title: 'EKS layout',
        language: 'text',
        code: `VPC (3 AZs)
├── Public subnets   -> ALB/NLB (AWS Load Balancer Controller), NAT gateways
├── Private subnets  -> managed node groups + Karpenter nodes (pods get VPC IPs via VPC CNI)
└── VPC endpoints    -> ECR, S3, STS

EKS control plane (AWS-managed) -> logs to CloudWatch
Pods -> IRSA / EKS Pod Identity -> IAM roles -> AWS APIs
Pipeline -> ECR -> Helm / Argo CD -> cluster`,
      },
    ],
    traps: [
      'Upgrading node groups before the control plane: worker nodes must not be newer than the control plane, so the order is control plane, add-ons, then nodes.',
      'Saying "EKS is fully managed": only the control plane is; node patching, add-on versions and networking are still your job.',
    ],
    followUps: [
      'What is the difference between IRSA and EKS Pod Identity?',
      'Why would you choose Karpenter over Cluster Autoscaler?',
      'How do you handle pod IP exhaustion with the VPC CNI?',
    ],
    tags: ['eks', 'aws', 'kubernetes', 'architecture', 'terraform'],
  },
  {
    id: 'itv-rglb3-21',
    level: 'advanced',
    kind: 'scenario',
    prompt: 'What common issues have you faced in EKS, and how did you troubleshoot them?',
    probing:
      'A structured troubleshooting method (events, describe, logs, then network and IAM) and knowledge of EKS-specific causes such as VPC CNI IP exhaustion, IRSA trust policies and node access mapping.',
    answer: [
      '**Common issues, likely causes and fixes**',
      '- **Nodes not joining**: Likely cause: Wrong node IAM role, missing access entry / `aws-auth` mapping, no route to the API or ECR; How I troubleshot and fixed it: Checked node role, access entries, subnet routes and security groups\n- **ImagePullBackOff**: Likely cause: No ECR permission, no route to ECR, wrong tag; How I troubleshot and fixed it: `kubectl describe pod`; node role policy, VPC endpoints or NAT, image tag\n- **Pods Pending**: Likely cause: Not enough CPU/memory, taints, **no free IPs** (VPC CNI uses VPC IPs); How I troubleshot and fixed it: Events in `describe pod`; scaled nodes, fixed requests, tolerations; **prefix delegation** or bigger subnets for IP exhaustion\n- **CrashLoopBackOff / OOMKilled**: Likely cause: App error, bad config, memory limit too low; How I troubleshot and fixed it: `kubectl logs --previous`; raised limits, fixed config and probes\n- **502/504 from the ALB**: Likely cause: Failing target health checks, security group blocks, wrong target type; How I troubleshot and fixed it: Target group health, probe path and port, security group rules\n- **AccessDenied from pods (IRSA)**: Likely cause: Wrong trust policy, OIDC provider, or service account annotation; How I troubleshot and fixed it: Verified OIDC provider, role trust policy, annotation\n- **DNS failures**: Likely cause: CoreDNS overloaded or misconfigured; How I troubleshot and fixed it: CoreDNS pods and logs; scaled CoreDNS, tuned config, NodeLocal DNSCache\n- **Upgrade problems**: Likely cause: Deprecated APIs, add-on version mismatch; How I troubleshot and fixed it: API deprecation check (for example `pluto` / EKS upgrade insights), add-ons upgraded in order, staging first',
      '**My approach:** start with events, `describe` and logs (commands below). Then network (security groups, routes, DNS), then IAM. Each fix went into a **runbook** and an **alert**.',
      '**Interview answer:** "The common ones were nodes not joining because of IAM role or access entry mapping, ImagePullBackOff from missing ECR permissions or routes, Pending pods from IP exhaustion with the VPC CNI, which we fixed with prefix delegation, OOMKilled pods, 502s from failing ALB health checks, and IRSA AccessDenied from wrong trust policies. I always start with events and describe, then logs, then network and IAM, and each fix becomes a runbook entry and an alert."',
    ],
    code: [
      {
        title: 'First commands for any EKS issue',
        language: 'bash',
        code: `kubectl get events -A --sort-by=.lastTimestamp
kubectl describe pod <pod> -n <ns>
kubectl logs <pod> -n <ns> --previous
kubectl get nodes -o wide && kubectl describe node <node>`,
        placeholders: ['<pod>', '<ns>', '<node>'],
      },
    ],
    traps: [
      'Treating Pending pods as only a CPU/memory problem: on EKS with the VPC CNI, running out of subnet IPs also leaves pods Pending.',
      'Running `kubectl logs` without `--previous` on a CrashLoopBackOff pod and seeing only the fresh, empty container.',
    ],
    followUps: [
      'How does prefix delegation increase the number of pods per node?',
      'Walk me through the IRSA chain from service account to IAM role.',
      'How do you find deprecated APIs before an EKS version upgrade?',
    ],
    tags: ['eks', 'troubleshooting', 'kubernetes', 'irsa', 'vpc cni'],
  },
  {
    id: 'itv-rglb3-22',
    level: 'basic',
    kind: 'open',
    prompt: 'What is Azure Container Apps, and what have you done with it?',
    probing:
      'That Container Apps is serverless containers on managed Kubernetes (KEDA, Dapr, Envoy) with no cluster to run, and a concrete example of scale rules, revisions and managed identity.',
    answer: [
      '**Azure Container Apps (ACA)** is a **serverless container platform**. It runs containers on managed infrastructure (built on **Kubernetes, KEDA, Dapr and Envoy**), without you managing a cluster, nodes or control plane.',
      '**Key features of Container Apps**',
      '- **Scale to zero** and **event-driven autoscaling** with KEDA (HTTP, queue length, CPU, Service Bus, Kafka, …).\n- **Revisions** with **traffic splitting** for blue/green and canary releases.\n- Built-in **ingress** with HTTPS (external or internal), custom domains and certificates.\n- **Managed identity**, Key Vault secret references.\n- **Dapr** for service-to-service calls, pub/sub and state.\n- **Container Apps jobs** for scheduled, event-driven or manual batch tasks.\n- **Environments**: a boundary (shared VNet and Log Analytics) that holds several apps. Consumption or **workload profiles** (dedicated, including GPU).',
      '**What I did (sample)**',
      '- Deployed containerised **APIs and background workers** into a Container Apps environment **inside a VNet**.\n- Pulled images from **ACR with a managed identity** (no admin user).\n- Read secrets from **Key Vault**; configured **scale rules** (HTTP concurrency for the API, Service Bus queue length for the worker, which scaled to zero at night).\n- Used revisions to send 10% of traffic to a new version before shifting fully.\n- Logs and metrics to Log Analytics with alerts.',
      '**Interview answer:** "Azure Container Apps is a serverless platform for containers, built on Kubernetes, KEDA and Dapr, but you don\'t manage the cluster. It gives scale to zero, event-driven autoscaling, revisions with traffic splitting and built-in HTTPS ingress. I deployed APIs and queue workers into a VNet-integrated environment, pulled from ACR with managed identity, used Key Vault secrets, scaled the worker on Service Bus queue length down to zero, and did canary releases with revision traffic splitting."',
    ],
    traps: [
      'Saying you can run `kubectl` against Container Apps: the Kubernetes API is not exposed.',
      'Using the ACR admin user for image pulls instead of a managed identity with AcrPull.',
    ],
    tags: ['container apps', 'azure', 'serverless', 'keda'],
  },
  {
    id: 'itv-rglb3-23',
    level: 'intermediate',
    kind: 'open',
    prompt: 'How do you deploy an application on Azure Container Apps end to end?',
    probing:
      'An ordered flow from image build to monitored release: registry, IaC for the environment, managed identity with AcrPull and Key Vault access, scale rules and probes, and revision-based canary with rollback.',
    answer: [
      '1. **Build the image:** Dockerfile, build and test locally.\n2. **Push to a registry:** the pipeline builds and pushes to **ACR**, with image scanning.\n3. **Create base resources (IaC):** resource group, Log Analytics workspace, VNet and subnet (if private), and the **Container Apps environment**.\n4. **Identity and access:** a managed identity for the app with **AcrPull** on ACR and **Key Vault Secrets User** on the vault.\n5. **Create the container app:** image, CPU/memory, target port, ingress (external/internal), environment variables and secrets (Key Vault references).\n6. **Scaling and probes:** min/max replicas, scale rules (HTTP concurrency, queue length), liveness/readiness/startup probes.\n7. **Release safely:** **multiple revision mode**; send a small % of traffic to the new revision, check health, then 100% (or roll back to the old revision).\n8. **Networking and DNS:** custom domain and managed certificate; internal ingress or private endpoint where needed.\n9. **Monitor:** Log Analytics queries, alerts on restarts, failures, latency and replica count.',
      'In Azure DevOps you can use the `AzureContainerApps@1` task; in GitHub Actions, `azure/container-apps-deploy-action`.',
      '**Interview answer:** "The pipeline builds the image, scans it and pushes it to ACR. Terraform creates the Log Analytics workspace, the VNet and the Container Apps environment. The app gets a managed identity with AcrPull and Key Vault Secrets User. I create the container app with the image, port, ingress, secrets, scale rules and probes. For each release the pipeline creates a new revision, sends a small share of traffic to it, checks health, then moves 100% or rolls back. Logs and alerts go to Log Analytics."',
    ],
    code: [
      {
        title: 'Create, update and canary with the Azure CLI',
        language: 'bash',
        code: `az containerapp env create -n cae-prod -g rg-app -l eastus \\
  --logs-workspace-id <id> --logs-workspace-key <key>

az containerapp create -n ca-api -g rg-app --environment cae-prod \\
  --image myacr.azurecr.io/api:1.0 --target-port 8080 --ingress external \\
  --registry-server myacr.azurecr.io --registry-identity system \\
  --min-replicas 1 --max-replicas 5

# New version from the pipeline
az containerapp update -n ca-api -g rg-app --image myacr.azurecr.io/api:1.1

# Canary: 90/10 split between revisions
az containerapp ingress traffic set -n ca-api -g rg-app \\
  --revision-weight ca-api--v1=90 ca-api--v2=10`,
        placeholders: ['<id>', '<key>'],
      },
    ],
    traps: [
      'Expecting traffic splitting in single revision mode: you must switch the app to multiple revision mode first.',
    ],
    followUps: [
      'How do you roll back a bad release in Container Apps?',
      'Which scale rule would you use for a queue worker, and how does it scale to zero?',
      'How would you make the app reachable only from inside the VNet?',
    ],
    tags: ['container apps', 'deployment', 'ci/cd', 'azure cli'],
  },
  {
    id: 'itv-rglb3-24',
    level: 'basic',
    kind: 'open',
    prompt: 'What are the prerequisites for deploying an application on Azure Container Apps?',
    probing:
      'Resource providers, Log Analytics, the environment and its subnet sizing, a Linux image with pull access via managed identity, deployer RBAC and the CLI extension.',
    answer: [
      '- An **Azure subscription** with the **`Microsoft.App`** and **`Microsoft.OperationalInsights`** resource providers registered.\n- A **resource group** and a **Log Analytics workspace** (for logs).\n- A **Container Apps environment**. For a custom VNet, a **dedicated subnet**, delegated to `Microsoft.App/environments` for workload profiles. Minimum size: **/27** for workload-profiles environments, **/23** for consumption-only environments.\n- A **container image** in a registry (ACR, Docker Hub, …), and **pull access**: managed identity with **AcrPull** (preferred) or registry credentials.\n- The app listens on a **known port** (target port) and is a **Linux** container (linux/amd64).\n- **RBAC** for the deployer (for example Contributor on the resource group) and a **service connection** for the pipeline.\n- **Secrets and config** ready: Key Vault, environment variables.\n- **DNS and certificates** if using a custom domain.\n- **Azure CLI** with the `containerapp` extension, if deploying from the command line.',
      '**Interview answer:** "I need a subscription with the Microsoft.App and Microsoft.OperationalInsights providers registered, a resource group, a Log Analytics workspace and a Container Apps environment, with a dedicated subnet of the right size if it\'s in my VNet. The image must be a Linux container in a registry like ACR, and the app needs a managed identity with AcrPull. I also need the target port, RBAC and a pipeline service connection, secrets in Key Vault, DNS and certificates for a custom domain, and the containerapp CLI extension."',
    ],
    code: [
      {
        title: 'Register providers and install the CLI extension',
        language: 'bash',
        code: `az provider register --namespace Microsoft.App
az provider register --namespace Microsoft.OperationalInsights
az extension add --name containerapp --upgrade`,
      },
    ],
    traps: [
      'Building the image on an Apple Silicon laptop without `--platform linux/amd64` and getting an image that will not start.',
    ],
    tags: ['container apps', 'prerequisites', 'networking', 'azure'],
  },
  {
    id: 'itv-rglb3-25',
    level: 'intermediate',
    kind: 'open',
    prompt: 'What is the difference between AKS and Azure Container Apps?',
    probing:
      'A clear trade-off between control and operational effort, the absence of the Kubernetes API in Container Apps, the cost model (idle nodes vs scale to zero) and a sensible rule for choosing.',
    answer: [
      '**AKS vs Azure Container Apps**',
      '- **Model**: AKS: **Managed Kubernetes**: you manage node pools, upgrades, add-ons; Azure Container Apps: **Serverless containers**: Azure manages the infrastructure\n- **Kubernetes API**: AKS: **Full** (`kubectl`, CRDs, operators, Helm); Azure Container Apps: **Not exposed**\n- **Control and flexibility**: AKS: Very high: custom networking, node pools, GPUs, service mesh, DaemonSets; Azure Container Apps: Lower: simpler and opinionated\n- **Scaling**: AKS: HPA, cluster autoscaler, KEDA (you set them up); Azure Container Apps: **Built-in KEDA**, including **scale to zero**\n- **Releases**: AKS: Your choice of tools (Helm, Argo CD, Flagger); Azure Container Apps: Revisions with traffic splitting built in\n- **Operational effort**: AKS: **Higher**: patching, upgrades, security hardening; Azure Container Apps: **Lower**\n- **Cost**: AKS: Pay for nodes **even when idle**; Azure Container Apps: Pay per use (consumption); scale to zero saves cost\n- **Best for**: AKS: Complex microservices, platform teams, custom Kubernetes needs; Azure Container Apps: Web APIs, microservices, event-driven workers, small teams',
      '**How I choose between them**',
      '- **Container Apps**: fast, low-ops microservices, APIs and event-driven jobs, when the team does not need Kubernetes itself.\n- **AKS**: when we need full Kubernetes: operators, service mesh, custom networking, DaemonSets, GPU pools, strict compliance, or many teams on one platform.',
      '**Interview answer:** "AKS is managed Kubernetes: I get the full Kubernetes API, CRDs, operators and node pools, but I also own upgrades, patching and hardening, and I pay for nodes even when idle. Container Apps is serverless on top of Kubernetes: no cluster to manage, built-in KEDA scaling to zero, revisions with traffic splitting, but no kubectl access. I choose Container Apps for simple APIs and event-driven workers, and AKS when we need full Kubernetes control or complex networking and compliance."',
    ],
    traps: [
      'Saying Container Apps is always cheaper: a steady, high-load workload on dedicated workload profiles can cost as much as or more than a right-sized AKS cluster.',
    ],
    followUps: [
      'Can Container Apps use GPUs or dedicated compute?',
      'What would make you migrate a workload from Container Apps to AKS?',
    ],
    tags: ['aks', 'container apps', 'comparison', 'kubernetes'],
  },
  {
    id: 'itv-rglb3-26',
    level: 'basic',
    kind: 'open',
    prompt: 'What database services are available in Azure?',
    probing:
      'Breadth across relational (SQL Database, Managed Instance, SQL on VM, PostgreSQL and MySQL Flexible Server) and non-relational (Cosmos DB, Redis, Table Storage), with HA/DR options and a rule for choosing.',
    answer: [
      '**Relational databases**',
      '- **Azure SQL Database**: What it is: Fully managed SQL Server engine (PaaS), single database or elastic pool. Tiers: General Purpose, Business Critical, **Hyperscale**; DTU or vCore; **serverless** auto-pause; HA / DR options: Zone redundancy, **active geo-replication**, **auto-failover groups**, automatic backups with point-in-time restore (PITR), long-term retention\n- **Azure SQL Managed Instance**: What it is: Near 100% SQL Server compatibility (SQL Agent, cross-database queries, CLR); good for lift-and-shift; HA / DR options: Zone redundancy, failover groups, backups/PITR\n- **SQL Server on Azure VM** (IaaS): What it is: Full control of OS and SQL Server; HA / DR options: Always On availability groups, Site Recovery, Azure Backup\n- **Azure Database for PostgreSQL – Flexible Server**: What it is: Managed PostgreSQL; HA / DR options: Zone-redundant HA (standby in another zone), read replicas, geo-redundant backup\n- **Azure Database for MySQL – Flexible Server**: What it is: Managed MySQL; HA / DR options: Zone-redundant HA, read replicas, geo-redundant backup',
      '**Non-relational and others**',
      '- **Azure Cosmos DB**: Globally distributed **NoSQL** database (APIs: NoSQL, MongoDB, Cassandra, Gremlin, Table; also **PostgreSQL** for distributed Postgres). Multi-region writes, 5 consistency levels, single-digit-ms latency\n- **Azure Cache for Redis / Azure Managed Redis**: In-memory cache and session store\n- **Azure Table Storage**: Simple, cheap key-value store in a storage account\n- **Azure Synapse / Microsoft Fabric / Azure Data Explorer**: Analytics and data warehouse (not OLTP)\n- **Azure Database Migration Service**: Migrate on-prem databases to Azure',
      '**How I choose a database**',
      '- Existing SQL Server app → **Azure SQL Database**; needs instance features → **SQL Managed Instance**; needs OS access or unsupported features → **SQL on VM**.\n- Open-source stack → **PostgreSQL / MySQL Flexible Server**.\n- Global, low-latency, flexible schema, huge scale → **Cosmos DB**.\n- Caching, sessions → **Redis**.',
      '**Interview answer:** "For relational data Azure has Azure SQL Database, SQL Managed Instance for near-full SQL Server compatibility, SQL Server on VMs when we need OS control, and Flexible Server for PostgreSQL and MySQL. For NoSQL there\'s Cosmos DB, globally distributed with multi-region writes, plus Redis for caching and Table Storage for simple key-value data. For HA and DR I use zone redundancy, auto-failover groups or geo-replication for SQL, zone-redundant HA and read replicas for Flexible Server, and multi-region accounts for Cosmos DB."',
    ],
    traps: [
      'Choosing Azure SQL Database for an app that relies on SQL Agent jobs or cross-database queries: those need Managed Instance.',
    ],
    tags: ['databases', 'azure sql', 'cosmos db', 'postgresql'],
  },
  {
    id: 'itv-rglb3-27',
    level: 'intermediate',
    kind: 'open',
    prompt: 'Which authentication types do the different Azure databases support?',
    probing:
      'Knowing the native and Microsoft Entra ID options per database, and the best practice: managed identity for apps, local/key auth disabled where possible, remaining secrets in Key Vault.',
    answer: [
      '**Authentication by database**',
      '- **Azure SQL Database / SQL Managed Instance**: **SQL authentication** (username + password); **Microsoft Entra ID**: users and groups (password, integrated, interactive with **MFA**), **service principals**, **managed identities**; option for **Microsoft Entra-only authentication** (SQL auth disabled). SQL MI also supports **Windows authentication** for Entra principals (Kerberos)\n- **SQL Server on Azure VM**: Windows authentication (AD domain), SQL authentication, Microsoft Entra authentication (SQL Server 2022+)\n- **PostgreSQL Flexible Server**: PostgreSQL authentication (password), **Microsoft Entra ID** (users, groups, service principals, managed identities), or both\n- **MySQL Flexible Server**: MySQL authentication (password), **Microsoft Entra ID**, or both\n- **Cosmos DB**: **Primary/secondary keys** (read-write and read-only), **resource tokens**, **Microsoft Entra ID with data-plane RBAC** (keys can be turned off with `disableLocalAuth`)\n- **Azure Cache for Redis**: Access keys, **Microsoft Entra ID** (access keys can be disabled)\n- **Table Storage**: Account keys, **SAS tokens**, Microsoft Entra ID',
      '**Best practice for database auth**',
      '- Use **Microsoft Entra ID with managed identities** for apps: no passwords in config, central control, MFA for humans, easy offboarding.\n- **Disable local/key authentication** where possible (Entra-only for SQL, `disableLocalAuth` for Cosmos DB).\n- If passwords or keys must be used, keep them in **Key Vault** and rotate them.\n- Combine with **network security**: private endpoints, firewall rules, TLS.',
      '**Example: app with managed identity on Azure SQL.** Create a contained database user for the managed identity, grant it roles, and use a connection string with `Authentication=Active Directory Managed Identity` (see code).',
      '**Interview answer:** "Azure SQL and Managed Instance support SQL authentication and Microsoft Entra ID, including MFA, service principals and managed identities, and can be set to Entra-only. PostgreSQL and MySQL Flexible Server support their native passwords and Entra ID. Cosmos DB supports keys, resource tokens and Entra ID with data-plane RBAC, and Redis supports keys and Entra ID. My standard is managed identity with Entra ID for apps, local auth disabled where possible, and any remaining secrets in Key Vault with rotation."',
    ],
    code: [
      {
        title: 'Grant a managed identity access to Azure SQL (T-SQL)',
        language: 'text',
        code: `-- Run as the Entra admin of the database
CREATE USER [app-orders-prod] FROM EXTERNAL PROVIDER;   -- the managed identity's name
ALTER ROLE db_datareader ADD MEMBER [app-orders-prod];
ALTER ROLE db_datawriter ADD MEMBER [app-orders-prod];`,
      },
      {
        title: 'Connection string with managed identity',
        language: 'text',
        code: `Server=tcp:sql-prod.database.windows.net;Database=orders;Authentication=Active Directory Managed Identity;`,
      },
    ],
    traps: [
      'Assuming Azure RBAC roles like Contributor on the SQL server give data access: database access still needs a database user and database roles.',
      'Thinking Cosmos DB control-plane roles (such as Contributor) grant data-plane access with Entra ID: data access uses separate Cosmos DB data-plane role assignments.',
    ],
    followUps: [
      'How do you switch an existing Azure SQL Database to Entra-only authentication without breaking apps?',
      'With a user-assigned identity, how does the connection string know which identity to use?',
    ],
    tags: ['databases', 'authentication', 'entra id', 'managed identity', 'security'],
  },
  {
    id: 'itv-rglb3-28',
    level: 'advanced',
    kind: 'open',
    prompt: 'What do you know about High Availability and Disaster Recovery plans?',
    probing:
      'RTO/RPO driven planning from a business impact analysis, HA within a region using zones, a DR strategy chosen per tier with Azure services, and a tested runbook.',
    answer: [
      '**Key terms for HA and DR**',
      '- **RTO** (Recovery Time Objective): Maximum acceptable **downtime**\n- **RPO** (Recovery Point Objective): Maximum acceptable **data loss**, measured in time\n- **Availability zone**: Separate datacenter(s) in one region, with its own power, cooling, network\n- **Paired / secondary region**: Another region used for DR',
      '**HA plan (within a region)**',
      '- **Zone-redundant** services: ZRS/GZRS storage, zone-redundant App Service plans, AKS node pools across zones, zone-redundant SQL, Application Gateway v2 across zones.\n- **No single instance**: at least 2 VMs/instances behind a load balancer, VM Scale Sets.\n- **Health probes and auto-healing**, autoscaling.',
      '**DR plan (another region)**',
      '- **Backup and restore**: How it works: Backups copied to another region; rebuild with IaC; RTO: Hours to days; Cost: Lowest\n- **Pilot light**: How it works: Data replicated; minimal core services running in DR; RTO: Hours; Cost: Low\n- **Warm standby** (active-passive): How it works: Scaled-down full copy running in DR; scale up on failover; RTO: Minutes to an hour; Cost: Medium\n- **Active-active**: How it works: Both regions serve traffic; RTO: Near zero; Cost: Highest',
      '**Azure services for DR**',
      '- **Azure Site Recovery** (VM replication and failover), **Azure Backup** with cross-region restore.\n- **SQL auto-failover groups**, Cosmos DB multi-region, **GRS/GZRS** storage.\n- **Front Door / Traffic Manager** for traffic failover.\n- **IaC** (Terraform/Bicep) to rebuild the same environment in the secondary region.',
      '**The plan itself, step by step**',
      '1. **Business impact analysis**: list applications by criticality, set RTO/RPO for each tier.\n2. Choose the strategy per tier (not everything needs active-active).\n3. **Runbook**: who declares a disaster, failover steps, DNS changes, communication, failback.\n4. **Test**: DR drills at least twice a year; measure real RTO/RPO; fix gaps.\n5. **Review** after every architecture change.',
      '**Interview answer:** "I start with RTO and RPO per application, from a business impact analysis. For HA inside a region I use availability zones, multiple instances and health probes, so a zone or server failure doesn\'t cause an outage. For DR I pick a strategy per tier, from backup and restore up to warm standby or active-active, using Site Recovery, Azure Backup with cross-region restore, SQL failover groups, GZRS storage and Front Door. Everything is written in a runbook with clear owners and tested in regular DR drills."',
    ],
    traps: [
      'Putting every application on active-active: cost explodes, and most tiers can accept a warm standby or backup-and-restore RTO.',
      'Having a DR plan that has never been tested: real RTO is unknown until a drill measures it.',
    ],
    followUps: [
      'How would you pick RTO and RPO for a payments API versus an internal reporting tool?',
      'What steps does your failback plan include after the primary region recovers?',
      'How does Front Door detect a failed region and shift traffic?',
    ],
    tags: ['high availability', 'disaster recovery', 'rto', 'rpo', 'resilience'],
  },
  {
    id: 'itv-rglb3-29',
    level: 'intermediate',
    kind: 'open',
    prompt: 'What is the difference between the old and the new landing zone?',
    probing:
      'Clarifying what "old" means, then contrasting hand-built subscriptions with the policy-driven CAF Azure landing zone (management groups, hub-and-spoke, platform subscriptions, subscription vending), and knowing the move to Azure Verified Modules.',
    answer: [
      'A **landing zone** is a pre-configured Azure environment (subscriptions, management groups, networking, identity, policies, monitoring) that application teams deploy into.',
      'Clarify what the interviewer means by "old". It is usually one of these two comparisons.',
      '**1. Old (traditional, hand-built) vs new (Azure landing zone / CAF)**',
      '- **Structure**: Old / traditional: Few large subscriptions, everything mixed; resource groups as the main boundary; New: Azure landing zone (Cloud Adoption Framework): **Management group hierarchy** with **subscriptions as the unit of scale** (one or more per app/environment)\n- **Build**: Old / traditional: Manual, portal clicks, inconsistent; New: Azure landing zone (Cloud Adoption Framework): **IaC** (Bicep / Terraform accelerators), repeatable\n- **Governance**: Old / traditional: Checked after the fact, by people; New: Azure landing zone (Cloud Adoption Framework): **Policy-driven guardrails** with **Azure Policy** at management-group level (deny public IPs, allowed regions, required tags, diagnostics)\n- **Networking**: Old / traditional: Flat or ad hoc VNets; New: Azure landing zone (Cloud Adoption Framework): **Hub-and-spoke** or **Virtual WAN**, central firewall, private DNS\n- **Platform services**: Old / traditional: Each team sets up its own; New: Azure landing zone (Cloud Adoption Framework): Central **platform** subscriptions: Connectivity, Identity, Management (Log Analytics, Defender)\n- **New apps**: Old / traditional: Ticket and wait; New: Azure landing zone (Cloud Adoption Framework): **Subscription vending**: new app landing zone created automatically',
      '**2. ALZ itself: older vs current implementation**',
      '- **Older**: "Enterprise-Scale" ARM templates, the **ALZ-Bicep** modules, and the Terraform `caf-enterprise-scale` module.\n- **Current**: Azure landing zone **accelerators built on Azure Verified Modules (AVM)** for Bicep and Terraform, with updated policy assignments and a simpler, more modular design. The older modules are being retired in favour of AVM.',
      'The typical management group layout is the same in both versions (see code).',
      '**Interview answer:** "A landing zone is the ready-made foundation that applications deploy into. The old way was a few hand-built subscriptions with mixed workloads, manual networking and governance checked afterwards. The new Azure landing zone from the Cloud Adoption Framework uses a management group hierarchy, subscriptions per workload, hub-and-spoke or Virtual WAN networking, central platform subscriptions for connectivity, identity and management, Azure Policy guardrails and subscription vending, all deployed with IaC. The latest accelerators are built on Azure Verified Modules, replacing the older Enterprise-Scale and ALZ-Bicep modules."',
    ],
    code: [
      {
        title: 'Typical management group layout',
        language: 'text',
        code: `Tenant Root
└── Organisation
    ├── Platform        (Connectivity, Identity, Management)
    ├── Landing Zones   (Corp = private/connected, Online = internet-facing)
    ├── Sandbox
    └── Decommissioned`,
      },
    ],
    followUps: [
      'What is the difference between the Corp and Online landing zones?',
      'How does subscription vending work in practice?',
      'Which Azure Policy assignments would you put at the Landing Zones management group?',
    ],
    tags: ['landing zone', 'caf', 'governance', 'azure policy', 'management groups'],
  },
  {
    id: 'itv-rglb3-30',
    level: 'basic',
    kind: 'open',
    prompt: 'What is the difference between authentication and authorization?',
    probing:
      'Who-you-are versus what-you-can-do, the order they happen in, an Azure example (Entra ID sign-in vs RBAC) and the 401 vs 403 distinction.',
    answer: [
      '**Authentication (AuthN) vs Authorization (AuthZ)**',
      '- **Question it answers**: Authentication: **Who are you?**; Authorization: **What are you allowed to do?**\n- **Happens**: Authentication: **First**; Authorization: **After** authentication\n- **Based on**: Authentication: Credentials: password, MFA, certificate, token, managed identity; Authorization: Roles, permissions, policies\n- **Azure example**: Authentication: Signing in to **Microsoft Entra ID**, getting a token; Authorization: **Azure RBAC** role (Reader, Contributor, Key Vault Secrets User) on a scope\n- **Protocol**: Authentication: **OpenID Connect** (identity), SAML; Authorization: **OAuth 2.0** (access to an API/resource)\n- **Failure**: Authentication: **401 Unauthorized** (actually "unauthenticated"); Authorization: **403 Forbidden**',
      "**Example:** a pipeline's service connection signs in to Entra ID with **workload identity federation** → **authentication**. It then tries to create a VM in a resource group where it only has the **Reader** role → **authorization** fails with 403.",
      '**Interview answer:** "Authentication proves who you are, for example signing in to Entra ID with a password and MFA, or a managed identity getting a token. Authorization decides what you can do after that, for example the RBAC role you have on a resource group. Authentication always comes first. A 401 usually means authentication failed, and a 403 means you are authenticated but not authorized."',
    ],
    traps: [
      'Reading "401 Unauthorized" literally: despite the name it means the caller is not authenticated; a lack of permission is 403.',
    ],
    tags: ['identity', 'authentication', 'authorization', 'entra id', 'rbac'],
  },
  {
    id: 'itv-rglb3-31',
    level: 'basic',
    kind: 'open',
    prompt: 'What is the difference between DR and HA?',
    probing:
      'That HA keeps running through component or zone failures within a region, while DR recovers from region-level events or data corruption, measured by RTO/RPO, and that you need both.',
    answer: [
      '**High Availability (HA) vs Disaster Recovery (DR)**',
      '- **Goal**: HA: **Keep running** with no or minimal interruption; DR: **Recover** after a major failure\n- **Protects against**: HA: Server, rack, disk or **zone** failure; DR: **Whole region** outage, data corruption, ransomware, major human error\n- **Scope**: HA: Usually **within one region** (availability zones, multiple instances); DR: **Another region** (or site)\n- **Failover**: HA: **Automatic**, seconds; DR: Often **planned / triggered**, minutes to hours\n- **Data loss**: HA: Usually none (synchronous replication); DR: Possible, defined by **RPO** (asynchronous replication)\n- **Measured by**: HA: Uptime % (SLA, for example 99.99%); DR: **RTO** and **RPO**\n- **Azure examples**: HA: Availability zones, load balancer, VMSS, ZRS, zone-redundant SQL; DR: Site Recovery, GRS/GZRS, SQL failover groups, backups with cross-region restore, Front Door failover',
      '**Simple way to say it:** HA stops small failures from becoming outages. DR gets you back when something big fails anyway. You need **both**: HA does not protect against a region outage or a corrupted database (corruption is replicated too), and DR alone means downtime for every small failure.',
      '**Interview answer:** "HA keeps the service running through component failures, like a VM or a zone going down, usually inside one region, with automatic failover and no data loss, measured as uptime. DR is recovering from a big event like a region outage or data corruption, usually in another region, measured by RTO and RPO. For example, zone-redundant App Service and SQL give HA, while a failover group and a second region behind Front Door give DR. We need both."',
    ],
    traps: [
      'Treating replication as a backup: corruption or an accidental delete is replicated too, so DR also needs point-in-time backups.',
    ],
    tags: ['high availability', 'disaster recovery', 'resilience', 'rto', 'rpo'],
  },
  {
    id: 'itv-rglb3-32',
    level: 'intermediate',
    kind: 'open',
    prompt:
      'What is the difference between a system-assigned and a user-assigned managed identity?',
    probing:
      'Lifecycle (tied to the resource vs independent), sharing across resources, granting roles before deployment, and the need to pass the client ID when a user-assigned identity is used.',
    answer: [
      'A **managed identity** is an identity in **Microsoft Entra ID** that Azure manages for you. A resource uses it to get tokens for other services (Key Vault, Storage, SQL) **without any secret** in your code.',
      '**System-assigned vs user-assigned**',
      '- **Created**: System-assigned: **Enabled on the resource** itself; User-assigned: Created as a **separate Azure resource**\n- **Lifecycle**: System-assigned: **Tied to the resource**: deleted when the resource is deleted; User-assigned: **Independent**: survives when resources are deleted\n- **Sharing**: System-assigned: **One resource only**; User-assigned: **Can be attached to many resources**\n- **Per resource**: System-assigned: One; User-assigned: Several user-assigned identities per resource\n- **Role assignments**: System-assigned: Must be redone for each new resource; User-assigned: Assign once, reuse across resources\n- **Available before the resource exists**: System-assigned: No; User-assigned: **Yes**: you can grant roles before deploying\n- **Best for**: System-assigned: Single resource with its own permissions; simple setups; User-assigned: Many resources needing the same access (VMSS, multiple apps, AKS workload identity); **blue/green or recreated resources**; pre-provisioned access',
      'When a resource has a user-assigned identity, the code must say **which one** to use (its **client ID**), for example `AZURE_CLIENT_ID`, or `keyVaultReferenceIdentity` for App Service Key Vault references.',
      '**Interview answer:** "A system-assigned identity is enabled on one resource and lives and dies with it, so it can\'t be shared. A user-assigned identity is its own resource with an independent lifecycle and can be attached to many resources. I use system-assigned for a single app with its own permissions, and user-assigned when several resources need the same access, when resources get recreated, or when I want to grant roles before deploying, for example for AKS workload identity. With user-assigned, the app must specify the client ID."',
    ],
    code: [
      {
        title: 'System-assigned vs user-assigned with the Azure CLI',
        language: 'bash',
        code: `# System-assigned on a web app
az webapp identity assign -g rg-app -n app-orders

# User-assigned: create once, attach to several apps
az identity create -g rg-identity -n id-orders
az webapp identity assign -g rg-app -n app-orders     --identities <id-orders-resource-id>
az webapp identity assign -g rg-app -n app-orders-dr  --identities <id-orders-resource-id>
az role assignment create --assignee <principalId> \\
  --role "Key Vault Secrets User" --scope <key-vault-id>`,
        placeholders: ['<id-orders-resource-id>', '<principalId>', '<key-vault-id>'],
      },
    ],
    traps: [
      'Recreating an app that used a system-assigned identity and expecting its role assignments to still work: the new resource gets a new identity.',
      'Attaching a user-assigned identity but not setting the client ID, so the SDK or Key Vault reference picks the wrong identity or fails.',
    ],
    followUps: [
      'How does a user-assigned identity fit into AKS workload identity?',
      'How long can it take for a new role assignment to take effect, and how do you handle that in a pipeline?',
    ],
    tags: ['managed identity', 'entra id', 'identity', 'security'],
  },
  {
    id: 'itv-rglb3-33',
    level: 'intermediate',
    kind: 'open',
    prompt: 'How does a Classic release pipeline work with multiple stages and approvals?',
    probing:
      'Artifacts flowing through stages with triggers, pre- and post-deployment approvals with their settings, automated gates, and how the same is done with Environments in YAML.',
    answer: [
      'A Classic **Release pipeline** takes an **artifact** (from a build pipeline) and deploys it through **stages**, for example Dev → QA → UAT → Prod. Each stage can have **approvals and gates** before and after it.',
      '**Stage triggers in a release**',
      '- **After release**: the stage starts as soon as a release is created (usually Dev).\n- **After stage**: starts when a previous stage **succeeds** (can wait for several stages, or also run on partial success).\n- **Manual only**: someone clicks Deploy.',
      '**Approval settings per stage**',
      '- **Pre-deployment approval**: Someone must approve **before** the stage deploys (for example a release manager before Prod)\n- **Post-deployment approval**: Someone must sign off **after** deployment before the release moves on (for example QA sign-off)\n- **Approvers**: Users or groups\n- **Approval order**: **Any one** user, **all in any order**, or **all in sequence**\n- **Timeout**: Release is rejected if not approved in time (for example 3 days)\n- **Policy**: "The user requesting a release should not approve it"\n- **Revalidate identity**: Approver must re-enter credentials',
      '**Gates:** automatic checks that must pass before or after a stage, re-evaluated on an interval: **Azure Monitor alerts** (no active alerts), **query work items** (no open Sev1 bugs), **invoke REST API / Azure Function** (for example ServiceNow change approved), **Azure Policy compliance**.',
      '**Other release pipeline settings**',
      '- **Stage variables** (different connection strings per stage) and **variable groups** scoped to stages.\n- **Deployment queue settings**: deploy only the latest release, or all in sequence.\n- **Redeploy / rollback** by redeploying an older release to a stage.',
      '**YAML equivalent:** in YAML, approvals and checks live on **Environments** (Pipelines → Environments → Approvals and checks), and a `deployment` job targeting that environment waits for them.',
      '**Interview answer:** "A Classic release pipeline takes the build artifact and deploys it stage by stage, like Dev, QA, UAT and Prod. Each stage has a trigger: after release, after a previous stage, or manual. I add pre-deployment approvals before UAT and Prod, with approver groups, an order like any-one or all, a timeout and the rule that the requester can\'t approve. Post-deployment approvals are for sign-off, and gates check things automatically, like no active Azure Monitor alerts or an approved change in ServiceNow. In YAML the same is done with approvals and checks on environments."',
    ],
    code: [
      {
        title: 'Stage flow with approvals',
        language: 'text',
        code: `Artifact (build) --> [Dev] --> [QA] --> (pre-approval: QA lead) [UAT] --> (pre-approval: CAB + gate) [Prod] --> (post-approval)`,
      },
      {
        title: 'YAML equivalent: deployment job waiting on an environment',
        language: 'yaml',
        code: `stages:
  - stage: Prod
    jobs:
      - deployment: DeployProd
        environment: prod   # approvals and checks are configured on this environment
        strategy:
          runOnce:
            deploy:
              steps:
                - script: echo "Deploying to prod"`,
      },
    ],
    traps: [
      'Putting approvals in YAML pipeline code: in YAML pipelines approvals are configured on the Environment (or other protected resource), not in the YAML file.',
    ],
    followUps: [
      'What is the difference between a gate and an approval?',
      'How would you migrate a Classic release with gates to a YAML pipeline?',
      'How do you roll back to a previous release in a Classic pipeline?',
    ],
    tags: ['azure devops', 'classic release', 'approvals', 'ci/cd', 'gates'],
  },
  {
    id: 'itv-rglb3-34',
    level: 'intermediate',
    kind: 'open',
    prompt: 'Have you used Azure Bicep and ARM templates? How do they compare with Terraform?',
    probing:
      'That Bicep compiles to ARM JSON (day-one Azure support, no state file), how Terraform differs (multi-cloud, state file, plan), and a sensible pipeline with what-if/plan and approvals.',
    answer: [
      '**ARM templates** are JSON files that describe Azure resources for **Azure Resource Manager**. **Bicep** is a simpler language **on top of ARM**: Bicep files are **compiled into ARM JSON**, so anything ARM can do, Bicep can do. The code samples show the same storage account in ARM JSON and in Bicep, plus the deploy commands.',
      '**Comparison: ARM vs Bicep vs Terraform**',
      '- **Language**: ARM templates: Verbose JSON; Bicep: Clean, concise DSL; Terraform: HCL\n- **Clouds**: ARM templates: Azure only; Bicep: Azure only; Terraform: **Multi-cloud** and many other providers\n- **State file**: ARM templates: No (Azure is the state); Bicep: **No**; Terraform: **Yes**: must be stored and locked securely\n- **Preview**: ARM templates: `what-if`; Bicep: `what-if`; Terraform: `plan`\n- **New Azure features**: ARM templates: Day one; Bicep: **Day one**; Terraform: When the provider adds them (`azapi` provider fills the gap)\n- **Modules**: ARM templates: Linked/nested templates; Bicep: **Modules**, registries, Azure Verified Modules; Terraform: Modules, registry\n- **Deployment modes**: ARM templates: Incremental / Complete; Bicep: Incremental / Complete, **deployment stacks**; Terraform: Desired state; also destroys removed resources',
      '**How I deploy IaC safely**',
      '1. Code and modules in Git with pull request reviews.\n2. Pipeline runs lint/validation, then `terraform plan` or `az deployment ... what-if`.\n3. Manual approval before production.\n4. Parameter files per environment; secrets from Key Vault, never in code.\n5. Azure Policy and tagging enforced; drift checked regularly.',
      '**How I choose:** **Bicep** for Azure-only work, **Terraform** when the setup is multi-cloud or the team already uses it, **raw ARM** only when maintaining existing templates (or decompile them to Bicep).',
      '**Interview answer:** "Yes. ARM templates are Azure\'s native JSON format; Bicep is a cleaner language that compiles to ARM, so it supports every Azure resource on day one, has modules and what-if, and needs no state file. Terraform is multi-cloud with plan and a large provider ecosystem, but I must manage its state file securely. I use Bicep for Azure-only work, Terraform for multi-cloud or where the team already uses it, and keep ARM only for legacy templates. All of it runs through a pipeline with what-if or plan, reviews and approval before production."',
    ],
    code: [
      {
        title: 'Storage account in ARM (JSON)',
        language: 'json',
        code: `{
  "$schema": "https://schema.management.azure.com/schemas/2019-04-01/deploymentTemplate.json#",
  "contentVersion": "1.0.0.0",
  "parameters": {
    "name": { "type": "string" }
  },
  "resources": [
    {
      "type": "Microsoft.Storage/storageAccounts",
      "apiVersion": "2023-05-01",
      "name": "[parameters('name')]",
      "location": "[resourceGroup().location]",
      "sku": { "name": "Standard_GZRS" },
      "kind": "StorageV2"
    }
  ]
}`,
      },
      {
        title: 'The same storage account in Bicep',
        language: 'bicep',
        code: `param name string
param location string = resourceGroup().location

resource st 'Microsoft.Storage/storageAccounts@2023-05-01' = {
  name: name
  location: location
  sku: { name: 'Standard_GZRS' }
  kind: 'StorageV2'
}`,
      },
      {
        title: 'Preview, deploy and decompile',
        language: 'bash',
        code: `az deployment group what-if -g rg-app -f main.bicep -p name=stappprod01   # preview
az deployment group create  -g rg-app -f main.bicep -p name=stappprod01
az bicep decompile --file template.json                                  # ARM -> Bicep`,
      },
    ],
    traps: [
      'Saying Bicep has a state file like Terraform: Bicep and ARM use Azure itself as the source of truth.',
      'Using Complete mode casually: it deletes resources in the resource group that are not in the template.',
    ],
    followUps: [
      'What are deployment stacks and what problem do they solve?',
      'How do you manage Terraform state securely in Azure?',
      'When would you reach for the `azapi` provider?',
    ],
    tags: ['bicep', 'arm templates', 'terraform', 'iac'],
  },
  {
    id: 'itv-rglb3-35',
    level: 'advanced',
    kind: 'scenario',
    prompt:
      'The App Service is in East US and the Key Vault is in a different region. What best practices would you follow?',
    probing:
      'Awareness of cross-region latency and failure coupling, Key Vault resilience behaviour (read-only during failover), secure access with managed identity and private endpoints across VNets, caching and retries, and the recommendation to co-locate vaults.',
    answer: [
      'Cross-region works, but plan for **latency, resilience and access**.',
      '**Key Vault best practices**',
      '- **Replication:** Key Vault contents are replicated within the region and to the **paired region**. During a Microsoft-managed failover the vault is **read-only**: you can read secrets but cannot create or rotate them until it recovers.\n- **Soft delete** and **purge protection** on.\n- **Azure RBAC** with least privilege, scoped to the vault (or secret).\n- **Networking:** private endpoint (needs DNS working across regions/VNets), firewall, trusted services.\n- **Monitoring:** diagnostic settings to Log Analytics; alerts on failures, throttling and near-expiry secrets/certificates.\n- **Secret lifecycle:** rotation, expiry dates; reference secrets **without a pinned version** so rotation is picked up.\n- **Throttling limits** and the right SKU (Standard, or Premium for HSM keys).',
      '**App Service best practices**',
      "- **Managed identity** with **Key Vault Secrets User**.\n- **Key Vault references** (`@Microsoft.KeyVault(SecretUri=...)`) resolve correctly; they are cached and refreshed periodically, not fetched per request.\n- **VNet integration**, routing and private DNS to reach the vault's private endpoint in the other region (VNet peering / hub).\n- **Latency:** cross-region calls add delay, so **cache secrets** in the app; don't fetch on every request.\n- **Resilience:** retry with backoff; app startup should not fail hard on a slow vault.\n- **Slots:** slot-specific settings and a swap strategy.\n- Monitoring with Application Insights (dependency calls to Key Vault).",
      '**Recommendation:** put the vault **in the same region** as the app, and a **second vault in the DR region** (synced by IaC/pipeline), so one regional problem does not break secret access, and latency stays low.',
      "**Interview answer:** \"It works, but I'd plan for latency and resilience. On Key Vault: soft delete and purge protection, RBAC, a private endpoint with DNS that resolves from the app's VNet, diagnostics and expiry alerts, and awareness that during a regional failover the vault is read-only. On App Service: a managed identity with Secrets User, Key Vault references without pinned versions, VNet integration, and caching with retries so we don't call across regions on every request. My recommendation is a vault in the same region as the app, plus one in the DR region.\"",
    ],
    code: [
      {
        title: 'Key Vault reference in App Service settings (no pinned version)',
        language: 'text',
        code: `DbPassword = @Microsoft.KeyVault(SecretUri=https://kv-orders-prod.vault.azure.net/secrets/DbPassword/)`,
      },
    ],
    traps: [
      'Pinning a secret version in the Key Vault reference: rotation then never reaches the app.',
      'Creating the private endpoint but not linking the `privatelink.vaultcore.azure.net` private DNS zone to the App Service integration VNet, so the name still resolves to the public IP.',
    ],
    followUps: [
      'How would you keep secrets in the primary and DR vaults in sync?',
      'What happens to Key Vault references if the vault is unreachable when the app restarts?',
      'How do you troubleshoot a Key Vault reference that shows an error status in the App Service configuration?',
    ],
    tags: ['key vault', 'app service', 'multi-region', 'security', 'networking'],
  },
  {
    id: 'itv-rglb3-36',
    level: 'basic',
    kind: 'open',
    prompt: 'Which tools have you worked with so far?',
    probing:
      'An organised, honest overview by area with how each tool was used, limited to tools you can defend in follow-up questions.',
    answer: [
      'Only list tools you can answer follow-up questions on.',
      '- **Cloud**: Tools: Azure (App Service, VMs, AKS, Container Apps, Key Vault, VNet, Storage, Front Door, Application Gateway), AWS (EKS, ECR, VPC); How I used them: Built and ran production environments in hub-and-spoke networks\n- **CI/CD**: Tools: Azure DevOps (YAML and Classic), GitHub Actions, Jenkins; How I used them: Build and release pipelines, templates, approvals, self-hosted agents\n- **IaC**: Tools: Terraform, Bicep, ARM templates; How I used them: Repeatable environments with plan / what-if review\n- **Scripting**: Tools: PowerShell, Azure CLI, Bash, Python; How I used them: Automation, Key Vault tasks, housekeeping scripts\n- **Containers**: Tools: Docker, Kubernetes (AKS, EKS), Helm, Azure Container Apps; How I used them: Packaging, deployment and scaling\n- **Monitoring**: Tools: Azure Monitor, Log Analytics, Application Insights, workbooks, Prometheus, Grafana; How I used them: Dashboards, alerts, KQL investigations, SLOs\n- **Source control**: Tools: Git, Azure Repos, GitHub; How I used them: Branching strategy, pull requests, branch policies\n- **Security and quality**: Tools: Key Vault, Defender for Cloud, SonarQube, Trivy, Checkov, Azure Policy; How I used them: Secrets, scanning, compliance\n- **Other**: Tools: Ansible, Jira, ServiceNow, Confluence; How I used them: Configuration, tickets, change records, runbooks',
      '**Interview answer:** "Mainly Azure: App Service, AKS, Container Apps, Key Vault, networking with Front Door and Application Gateway, and some AWS EKS. For CI/CD, Azure DevOps YAML and Classic plus GitHub Actions; for IaC, Terraform and Bicep; scripting in PowerShell, Bash, Azure CLI and Python. For containers, Docker, Kubernetes and Helm; for monitoring, Azure Monitor, Application Insights, workbooks, Prometheus and Grafana; and for security, Defender for Cloud, SonarQube, Trivy and Checkov, with ServiceNow and Jira for change and work tracking."',
    ],
    traps: [
      'Listing every tool you have heard of: the interviewer will pick one and ask a deep question about it.',
    ],
    tags: ['tools', 'experience', 'devops', 'introduction'],
  },
]
