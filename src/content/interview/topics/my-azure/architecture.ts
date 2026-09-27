import type { InterviewQuestion } from '../../../types'

/** Azure architecture, integration and governance notes from my summary. */
export const myAzureArchitectureQuestions: InterviewQuestion[] = [
  {
    id: 'itv-myaz-42',
    level: 'basic',
    kind: 'open',
    prompt: 'Explain IaaS, PaaS, and SaaS with Azure examples.',
    probing: 'The responsibility split at each model and a correct Azure example of each.',
    answer: [
      '**Infrastructure as a Service (IaaS)**',
      'The cloud provider manages the physical data center, hardware, networking, and virtualization. The customer manages the operating system, configuration, applications, and data.',
      '- Best for: workloads that require OS-level control or custom infrastructure.\n- Azure examples: Virtual Machines, Virtual Network, and Managed Disks.\n- Analogy: renting virtual hardware in a cloud data center.',
      '**Platform as a Service (PaaS)**',
      'The provider also manages the operating system, runtime, patching, and much of the platform. Developers focus mainly on application code and data.',
      '- Best for: application development without server administration.\n- Azure examples: App Service, Azure SQL Database, and Azure Functions.\n- Main benefit: faster development with less infrastructure maintenance.',
      '**Software as a Service (SaaS)**',
      'The provider delivers a complete application. Users configure and consume the software without managing the platform or infrastructure.',
      '- Best for: ready-to-use business capabilities.\n- Examples: Microsoft 365 and Dynamics 365.\n- Trade-off: least infrastructure responsibility, but less low-level control.',
      '**Interview summary:** IaaS gives the most control and management responsibility; SaaS gives the least. PaaS sits between them and is commonly used by application teams.',
    ],
    tags: ['iaas', 'paas', 'saas'],
  },
  {
    id: 'itv-myaz-43',
    level: 'basic',
    kind: 'open',
    prompt: 'What are the pillars of the Azure Well-Architected Framework?',
    probing:
      'The five pillars with concrete Azure practices, and that they trade off against each other.',
    answer: [
      'The framework helps teams balance five connected design pillars:',
      '1. **Reliability** — Recover from failures and continue meeting business requirements. Use Availability Zones, load balancing, backups, and disaster recovery. Define recovery time and recovery point objectives.\n2. **Security** — Protect identities, applications, infrastructure, and data. Apply least privilege through RBAC — give each identity only the access it actually needs. Store secrets and keys in Key Vault. Use Defender for Cloud and Azure Policy to improve security posture.\n3. **Cost Optimization** — Control spending while delivering the required business value. Right-size resources and remove unused capacity. Consider reservations and Spot VMs where appropriate. Track spending with Cost Management and Billing.\n4. **Operational Excellence** — Improve deployment, monitoring, and operational processes. Use infrastructure as code with Bicep or ARM templates. Centralize monitoring data with Azure Monitor and Log Analytics. Automate repeatable operational tasks.\n5. **Performance Efficiency** — Meet demand efficiently as usage changes. Use autoscaling for App Service, VM Scale Sets, and AKS. Select suitable SKUs and review Azure Advisor recommendations. Use caching and Azure Front Door for global content delivery.',
      '**Interview summary:** Architecture decisions involve trade-offs. Improving one pillar can affect another, so design against business requirements rather than optimizing only one area.',
    ],
    tags: ['well-architected', 'architecture'],
  },
  {
    id: 'itv-myaz-44',
    level: 'basic',
    kind: 'open',
    prompt: 'What are the common Azure Function triggers and when do you use each?',
    probing:
      'HTTP, timer, queue and blob triggers mapped to real use cases, and how they combine in one workflow.',
    answer: [
      '**HTTP trigger:** Runs when the function receives an HTTP request.',
      '- Use for APIs, webhooks, and synchronous actions.\n- Example: an HR application calls `/api/send-welcome-email` when an employee joins.',
      '**Timer trigger:** Runs according to a schedule.',
      '- Use for cleanup, synchronization, reporting, and recurring maintenance.\n- Example: synchronize data from an external API to SQL every night.',
      '**Queue trigger:** Runs when a message is available in an Azure Storage Queue.',
      '- Use for asynchronous background processing.\n- Example: process an invoice message and send a billing email.',
      '**Blob trigger:** Runs when a blob is created or updated in a monitored container.',
      '- Image/video processing: generate thumbnails, compress, or transcode.\n- Data ingestion: process uploaded CSV or JSON files.\n- Document processing: run OCR or extract invoice fields.\n- Backup or replication: copy new files to another location.\n- Event automation: generate alerts or start downstream work.',
      '**Combined onboarding example**',
      '1. An HTTP-triggered Function accepts a new employee request.\n2. It places a message in a welcome-email queue.\n3. A queue-triggered Function sends the email asynchronously.\n4. A timer-triggered Function checks incomplete onboarding tasks nightly.',
    ],
    tags: ['azure functions', 'triggers'],
  },
  {
    id: 'itv-myaz-45',
    level: 'intermediate',
    kind: 'open',
    prompt: 'When is serverless a good fit, and when is it not?',
    probing:
      'Matching serverless to event-driven, variable workloads and recognising when latency, duration or steady load argue against it.',
    answer: [
      'Use serverless for event-driven systems, variable or intermittent workloads, automation, small APIs, and independently scalable processing steps.',
      'Consider another hosting model when workloads require consistently low latency, long-running processes, extensive local state, or predictable sustained compute where another pricing model is more economical.',
    ],
    tags: ['serverless', 'architecture'],
  },
  {
    id: 'itv-myaz-46',
    level: 'intermediate',
    kind: 'open',
    prompt: 'When do you use Azure Functions versus Logic Apps?',
    probing: 'Code-first custom logic versus connector-driven workflow, and designs that use both.',
    answer: [
      'Both services support serverless and event-driven solutions, but they solve different problems.',
      '- **Custom algorithms, validation, or transformations**: Azure Functions\n- **Low-code workflow and system integration**: Logic Apps\n- **Built-in connectors to SaaS and enterprise systems**: Logic Apps\n- **Lightweight API or background code**: Azure Functions\n- **Orchestration that also needs custom code**: Logic Apps plus Functions',
      '**Azure Functions: the code engine**',
      '- Developer-focused and code-first\n- Suitable for custom logic and data processing\n- Commonly triggered by HTTP, queues, timers, blobs, or events',
      '**Logic Apps: the workflow engine**',
      '- Designer-driven and connector-focused\n- Suitable for business workflows, system integration, scheduling, and orchestration\n- Can connect Azure services, SaaS products, and on-premises systems',
      '**Order-to-invoice example:** A Logic App receives an order, calls Dynamics 365, writes to SQL, and sends a Teams notification. It calls an Azure Function when it needs custom discount calculations or tax-rule validation.',
      '**File-processing example:** A file arrives in Blob Storage, a Logic App starts the workflow, a Function validates and transforms the file, and the Logic App stores the result and sends a notification.',
    ],
    tags: ['azure functions', 'logic apps', 'integration'],
  },
  {
    id: 'itv-myaz-47',
    level: 'intermediate',
    kind: 'open',
    prompt: 'What is Azure Queue Storage, and when would you choose Service Bus instead?',
    probing:
      'The basic queue flow, idempotent consumers, and which enterprise messaging features push you to Service Bus.',
    answer: [
      'Queue Storage provides simple, durable message queues for asynchronous communication between application components.',
      '**Why use it? (Azure Queue Storage)**',
      '- Decouples producers from consumers\n- Smooths traffic spikes\n- Supports asynchronous processing\n- Scales with storage workloads\n- Is simple and cost-effective for basic queueing scenarios',
      '**Basic flow (Azure Queue Storage)**',
      '1. A producer adds a message to the queue.\n2. Azure stores the message in the storage account.\n3. A consumer retrieves and processes it.\n4. The consumer deletes the message after successful processing.',
      'Design consumers to be idempotent, since a message can be delivered more than once. Use visibility timeouts, retry handling, and poison-message handling.',
      '**Interview distinction:** Queue Storage is a good choice for straightforward queueing. Azure Service Bus is generally preferred when enterprise messaging features such as topics, subscriptions, sessions, transactions, duplicate detection, or dead-lettering are required.',
    ],
    tags: ['queue storage', 'service bus', 'messaging'],
  },
  {
    id: 'itv-myaz-48',
    level: 'intermediate',
    kind: 'open',
    prompt: 'How do Azure Functions work with Azure Data Factory?',
    probing:
      'Data Factory as the orchestrator and Functions as the custom code step, with secure credentials and API resilience.',
    answer: [
      'Data Factory and Functions work well together when a data pipeline needs custom API or transformation logic.',
      '**Example pipeline (Azure Functions with Azure Data Factory)**',
      '1. Data Factory schedules and orchestrates the load.\n2. A Function handles complex authentication and calls the external API.\n3. The Function parses, validates, and reshapes JSON or CSV data.\n4. Credentials are obtained securely through Key Vault or managed identity.\n5. Data is written to Blob Storage/Data Lake or returned for the next pipeline step.\n6. Data Factory continues loading into services such as Synapse or Databricks.\n7. Application Insights monitors Function execution while Data Factory monitors the overall pipeline.',
      'For .NET implementations, reuse `HttpClient` rather than creating a new client for every request. Also plan for API throttling, retries, pagination, and timeouts.',
      '**Interview summary:** Data Factory is the orchestration layer; Functions supply custom code where built-in activities are not sufficient.',
    ],
    tags: ['data factory', 'azure functions', 'integration'],
  },
  {
    id: 'itv-myaz-49',
    level: 'intermediate',
    kind: 'open',
    prompt: 'How can Azure Functions extend Power Apps and Power Automate?',
    probing:
      'Where a Function adds capability to low-code tools and that the endpoint must be secured, not anonymous.',
    answer: [
      'An HTTP-triggered Function can extend Power Apps and Power Automate with capabilities that are difficult to implement using low-code components alone.',
      'Common uses include (Azure Functions with Power Platform):',
      '- Complex validation or business rules\n- External API integration\n- Data transformation\n- AI or custom library calls',
      'Power Apps can call the Function and use its response interactively. Power Automate can call it as one step in a wider workflow. Secure the endpoint with an appropriate identity and authorization model rather than exposing an anonymous production Function.',
    ],
    tags: ['power platform', 'azure functions'],
  },
  {
    id: 'itv-myaz-50',
    level: 'basic',
    kind: 'open',
    prompt: 'How do you host a static website in Azure Storage?',
    probing:
      'The setup steps, the `$web` container, and the limitation that no server-side code runs.',
    answer: [
      'Azure Storage can host static HTML, CSS, JavaScript, and media files without a web server or VM.',
      '**Setup (Hosting a Static Website in Azure Storage)**',
      '1. Create a general-purpose v2 storage account.\n2. Open **Storage account > Data management > Static website**.\n3. Enable the feature.\n4. Configure an index document such as `index.html` and an error document such as `error.html`.\n5. Upload website files to the automatically created `$web` container.\n6. Test the primary web endpoint and a missing path to verify error handling.\n7. Monitor storage metrics and logs as required.',
      '**Benefits (Hosting a Static Website in Azure Storage)**',
      '- No web server administration\n- Low-cost hosting for static content\n- Simple deployment\n- Integration with Azure Front Door for custom domains, edge delivery, security, and global performance',
      '**Limitations:** Storage static websites do not execute server-side application code. Use an API or Functions for dynamic behavior.',
    ],
    tags: ['static website', 'storage', 'front door'],
  },
  {
    id: 'itv-myaz-51',
    level: 'intermediate',
    kind: 'open',
    prompt:
      'Does a subscription Owner automatically get access to Key Vault secrets? Explain management plane vs data plane.',
    probing:
      'That Owner is a management-plane role, which data-plane roles grant secret access, and how the access model changes the answer.',
    answer: [
      'A subscription Owner does not automatically receive permission to read or change secrets, keys, and certificates in every Key Vault.',
      '- **Management plane:** Create or delete the vault, configure networking, and manage resource settings and role assignments.\n- **Data plane:** Read, create, update, or delete the keys, secrets, and certificates stored inside the vault.',
      'The Owner role provides broad management-plane permissions, including the ability to assign access, but it is not itself a Key Vault data-plane role.',
      '**When using Azure RBAC**',
      'Assign a suitable data-plane role at the narrowest practical scope:',
      '- **Key Vault Administrator**: Manage keys, secrets, and certificates; does not manage RBAC assignments\n- **Key Vault Crypto Officer**: Create and manage keys\n- **Key Vault Secrets Officer**: Create and manage secrets\n- **Key Vault Certificates Officer**: Create and manage certificates\n- **Key Vault Secrets User**: Read secret values',
      '**When using vault access policies**',
      'Add an access policy that explicitly grants the required key, secret, or certificate operations.',
      'Check the configured model under **Key Vault > Settings > Access configuration**. Apply least privilege, and prefer managed identities for applications.',
    ],
    tags: ['key vault', 'rbac'],
  },
  {
    id: 'itv-myaz-52',
    level: 'advanced',
    kind: 'open',
    prompt: 'What does Microsoft Defender for Containers do in an Azure delivery flow?',
    probing:
      'What Defender actually covers, where it fits alongside CI scanning, and that it does not block a pipeline by itself.',
    answer: [
      'Microsoft Defender for Containers adds security capabilities for supported container registries and Kubernetes environments.',
      "What it actually gives you depends on which Defender plan, extensions, and connectivity you've enabled — it can cover vulnerability scanning for the registry and running images, security-posture recommendations, and runtime threat detection.",
      'In an Azure delivery flow:',
      '1. CI scans the exact image digest and blocks findings according to policy.\n2. The approved digest is stored in Azure Container Registry.\n3. AKS deploys the same digest using managed identity with narrowly scoped `AcrPull`.\n4. Defender for Containers continuously reassesses supported registry and running images and produces security findings.\n5. Defender alerts flow to the security operations process; Azure Monitor verifies application health.',
      "Defender doesn't automatically stop an Azure DevOps run by itself — it's not a pipeline task. To actually enforce a deployment policy, use a CI scan that fails the build, an admission policy, or an Azure DevOps environment check that queries an approved external decision source.",
      'Plan out the Defender components and private-cluster connectivity you need, then test that alerts actually route where they should and get fixed.',
    ],
    followUps: [
      'How would you actually block a deployment of a vulnerable image?',
      'How do Defender alerts reach the security operations team?',
    ],
    tags: ['defender', 'containers', 'security'],
  },
  {
    id: 'itv-myaz-53',
    level: 'intermediate',
    kind: 'open',
    prompt:
      'How do you use Azure Policy to restrict snapshot SKUs, and what is the difference between deny and audit?',
    probing: 'Writing a policy rule with aliases and knowing exactly how deny and audit behave.',
    answer: [
      'Azure Policy can enforce or report configuration rules at scale. For example, an organization can require managed-disk snapshots in Central India to use `Standard_LRS`.',
      '- `deny` blocks a non-compliant create or update request.\n- `audit` allows the request but marks the resource non-compliant.',
      '**Expected behavior**',
      '- With `deny`, `Standard_LRS` passes and a disallowed SKU is rejected.\n- With `audit`, a disallowed SKU can be created but appears as non-compliant.',
      'Test policies in a non-production scope first. Review aliases, exemptions, existing resources, and fix requirements before broad assignment.',
    ],
    code: [
      {
        title: 'Azure Policy: Restricting Snapshot SKUs — Example policy rule',
        language: 'json',
        code: `{
  "if": {
    "allOf": [
      {
        "field": "type",
        "equals": "Microsoft.Compute/snapshots"
      },
      {
        "field": "location",
        "equals": "centralindia"
      },
      {
        "field": "Microsoft.Compute/snapshots/sku.name",
        "notEquals": "Standard_LRS"
      }
    ]
  },
  "then": {
    "effect": "deny"
  }
}`,
      },
    ],
    tags: ['azure policy', 'governance'],
  },
  {
    id: 'itv-myaz-54',
    level: 'advanced',
    kind: 'open',
    prompt: 'What happens when you move resources between resource groups, and how do you prepare?',
    probing:
      'That a move is a control-plane operation that changes resource IDs and locks both groups, and a checklist to prepare for it.',
    answer: [
      'Azure can move many resource types between resource groups, but support and dependencies vary by service.',
      '**What happens during a move**',
      '- Azure validates that the resources and dependencies support the move.\n- The source and destination resource groups are locked against write operations for part of the move.\n- Existing workloads usually continue to run, but control-plane changes are temporarily blocked.\n- Resource IDs change because the resource-group segment changes.',
      '**Preparation checklist**',
      '1. Confirm that every resource type supports the intended move.\n2. Identify and include required dependent resources.\n3. Check resource locks, policies, quotas, and destination permissions.\n4. Save resource IDs and review anything that stores them explicitly, such as scripts, dashboards, or external automation.\n5. Validate the move before execution.\n6. Avoid simultaneous changes to either resource group.\n7. Verify monitoring, permissions, automation, and application behavior afterward.',
      "**Interview summary:** A resource-group move is primarily a control-plane operation and normally does not move the resource's physical region. Do not promise zero impact without checking the specific services and dependencies.",
    ],
    followUps: [
      'What breaks when a resource ID changes after a move?',
      'How do you validate a move before executing it?',
    ],
    tags: ['resource groups', 'resource move'],
  },
  {
    id: 'itv-myaz-55',
    level: 'basic',
    kind: 'open',
    prompt: 'Which Azure monitoring service fits each layer of a system?',
    probing:
      'Knowing what Azure Monitor, Log Analytics, Application Insights, Network Watcher and Service Health are each for.',
    answer: [
      'Use monitoring at both the component and workflow level:',
      '- **Azure Monitor:** common platform for metrics, logs, alerts, and dashboards.\n- **Log Analytics workspace:** query and analyze collected logs with KQL.\n- **Application Insights:** application performance monitoring, requests, dependencies, exceptions, traces, and distributed transaction views.\n- **Network Watcher:** network topology, diagnostics, connection monitoring, packet capture, and flow-related analysis.\n- **Service-specific monitoring:** Data Factory pipeline runs, Function executions, Storage metrics, and Front Door health/caching metrics.',
      'Operationally mature systems should include structured logs, correlation IDs, useful alerts, retry visibility, dashboards, runbooks, and tested incident procedures.',
      "Azure Monitor collects metrics, logs, and alerts. Application Insights covers application-level request and dependency monitoring. Log Analytics stores and lets you query logs with KQL. Azure Service Health tells you about Azure's own incidents and planned maintenance.",
      'Azure Advisor gives recommendations across reliability, security, performance, cost, and operational excellence — but each one still needs a workload-specific review before you act on it.',
    ],
    tags: ['azure monitor', 'application insights', 'log analytics'],
  },
  {
    id: 'itv-myaz-56',
    level: 'basic',
    kind: 'open',
    prompt: 'How do common AWS services map to Azure?',
    probing:
      'Whether you can translate between clouds while knowing the mappings are conceptual, not exact.',
    answer: [
      'These are conceptual comparisons, not always exact feature-for-feature equivalents.',
      '- **Virtual machines**: AWS: EC2; Azure: Azure Virtual Machines\n- **Serverless functions**: AWS: Lambda; Azure: Azure Functions\n- **Managed Kubernetes**: AWS: EKS; Azure: AKS\n- **Object storage**: AWS: S3; Azure: Blob Storage\n- **Block storage**: AWS: EBS; Azure: Managed Disks\n- **Managed file shares**: AWS: EFS; Azure: Azure Files\n- **Managed relational databases**: AWS: RDS; Azure: Azure SQL Database / Azure Database services\n- **Globally distributed NoSQL**: AWS: DynamoDB; Azure: Cosmos DB\n- **Private cloud network**: AWS: VPC; Azure: Virtual Network\n- **DNS hosting**: AWS: Route 53; Azure: Azure DNS\n- **Content delivery / global edge**: AWS: CloudFront; Azure: Azure Front Door\n- **Workforce identity**: AWS: IAM Identity Center; Azure: Microsoft Entra ID\n- **Resource authorization**: AWS: IAM policies and roles; Azure: Azure RBAC\n- **Metrics and logs**: AWS: CloudWatch; Azure: Azure Monitor\n- **CI/CD**: AWS: CodePipeline; Azure: Azure Pipelines / GitHub Actions',
    ],
    tags: ['aws', 'azure', 'comparison'],
  },
  {
    id: 'itv-myaz-57',
    level: 'basic',
    kind: 'open',
    prompt: 'What Azure topics should you be ready to explain in an interview?',
    probing:
      'Breadth across hosting, integration, storage, security and governance, with a definition, example and trade-off for each.',
    answer: [
      'Be ready to explain (Final Interview Revision Checklist):',
      '- The responsibility difference between IaaS, PaaS, and SaaS\n- When to choose Web Apps, Functions, or Logic Apps\n- How common Function triggers support event-driven design\n- Queue Storage vs. Service Bus\n- How Functions complement Data Factory and Power Platform\n- Static website hosting and the purpose of Front Door\n- Storage security using identity, network controls, SAS, and encryption\n- Individual public IP addresses vs. public IP prefixes\n- Key Vault management-plane vs. data-plane authorization\n- Azure Policy `deny` vs. `audit`\n- Resource-group move preparation and effects\n- The five Well-Architected Framework pillars\n- The monitoring service appropriate to each layer',
      'For each topic, prepare a short definition, one real-world example, the main trade-off, and one alternative service.',
    ],
    tags: ['revision', 'fundamentals'],
  },
  {
    id: 'itv-myaz-58',
    level: 'intermediate',
    kind: 'open',
    prompt: 'How do you explain an Azure architecture as a business flow?',
    probing:
      'Walking from the user to the data and operations layers, then judging choices against the Well-Architected pillars.',
    answer: [
      'Azure architecture should be explained as a business flow rather than a list of products:',
      '1. Users arrive through DNS, Front Door or CDN for global routing, acceleration, and edge availability.\n2. Entra ID, WAF, DDoS Protection, and Key Vault protect identity, traffic, and secrets.\n3. API Management, Logic Apps, Service Bus, and Event Grid expose, orchestrate, and decouple integrations.\n4. App Service, AKS, Functions, and Container Apps run applications with different control and scaling models.\n5. Azure SQL, Cosmos DB, Blob Storage, and Data Lake store transactional, globally distributed, object, and analytical data.\n6. Synapse, Databricks, Azure Machine Learning, and Azure OpenAI provide analytics and intelligent capabilities.\n7. Azure Monitor, Application Insights, Log Analytics, Defender for Cloud, and Azure Policy provide operations, security, and governance.\n8. GitHub, Azure DevOps, Terraform, and Bicep automate reviewed, repeatable delivery.',
      'Architecture choices should be evaluated against the Azure Well-Architected pillars: reliability, security, cost optimization, operational excellence, and performance efficiency. Resource hierarchy flows from management groups to subscriptions, resource groups, and resources.',
      'Identity should rest on Entra ID, RBAC, managed identities, MFA, and least privilege. Availability Zones protect against a single datacenter failing. Region pairs, replicated data, traffic failover, and tested runbooks are what actually protect against a regional disaster.',
      'Storage redundancy options range from LRS and ZRS up to GRS, GZRS, and their read-access variants. Pick based on the actual durability, availability, residency, latency, and recovery requirements — not by defaulting to the most expensive option.',
      'Cost controls include correct sizing, reservations or savings plans where applicable, autoscaling, lifecycle policies, budgets, and removal of confirmed unused resources.',
    ],
    tags: ['architecture', 'well-architected'],
  },
  {
    id: 'itv-myaz-59',
    level: 'intermediate',
    kind: 'open',
    prompt: 'Explain Entra ID, Azure RBAC and scope inheritance.',
    probing:
      'The two permission systems (directory roles vs Azure roles), how scope inherits, and the Owner/Contributor/Reader differences.',
    answer: [
      'Microsoft Entra ID authenticates users, groups, service principals, and managed identities — it confirms who someone is. Azure RBAC authorizes what they can do to Azure resources.',
      'Entra directory roles like Global Administrator govern directory-wide capabilities. Azure roles like Owner, Contributor, and Reader govern access to resources. These are two different permission systems, not one.',
      'Azure resource scope inherits downward: `management group -> subscription -> resource group -> resource`',
      'Apply the rule **right principal, right role, right scope**. Prefer groups and managed identities over individual assignments. Use least privilege, time-bound privileged access, separation of duties, access reviews, and diagnostic logs.',
      "`Owner` can also assign roles to others. `Contributor` manages resources but can't grant RBAC access by default. `Reader` is view-only. Avoid broad, permanent assignments when a narrower resource-group or resource scope would do the job.",
    ],
    tags: ['entra id', 'rbac', 'scope'],
  },
  {
    id: 'itv-myaz-60',
    level: 'intermediate',
    kind: 'open',
    prompt: 'How do Virtual Machine Scale Sets work, and what does a production setup need?',
    probing:
      'Autoscale mechanics plus the production details: capacity bounds, health, zones, rolling upgrades, and what autoscale cannot fix.',
    answer: [
      "VM Scale Sets run a group of identically configured VMs, and tie into load balancing, health checks, autoscale, and rolling upgrades. Scaling out adds instances once demand crosses a threshold you've set; scaling in removes the extra capacity once things settle down.",
      'A production setup needs minimum, maximum, and default capacity, health probes, a zone or fault-domain strategy, instance repair, graceful termination, image versioning, health gates during rolling upgrades, and enough time for the application to actually start up.',
      "Autoscaling won't fix inefficient code or an overloaded database. Check end-to-end latency, queue depth, dependency limits, and cost after scaling, not just before. For events you can predict, scheduled scaling can add capacity ahead of the traffic instead of reacting to it.",
    ],
    tags: ['vmss', 'autoscale'],
  },
  {
    id: 'itv-myaz-61',
    level: 'advanced',
    kind: 'open',
    prompt: 'How do you design a resilient multi-region application on Azure?',
    probing:
      'That real RPO/RTO come from data replication and failover behaviour, not from deploying compute twice.',
    answer: [
      'A multi-region Azure application can use Front Door as the global entry point, with a regional Application Gateway, WAF, or another regional ingress in each deployment.',
      'Keep the web, application, data, and management boundaries separate. Use private endpoints, Key Vault, Firewall, Policy, Monitor, and tested backup and failover, based on what the workload actually needs.',
      'The real recovery point and recovery time come down to how data replication and failover actually behave — deploying compute in two regions by itself is not disaster recovery. Regularly test regional traffic failover, dependency capacity, DNS and TLS, data recovery, and the operational runbooks themselves.',
    ],
    followUps: [
      'How does data replication decide your real RPO?',
      'What do you test in a regional failover exercise?',
    ],
    tags: ['multi-region', 'front door', 'disaster recovery'],
  },
  {
    id: 'itv-myaz-62',
    level: 'advanced',
    kind: 'open',
    prompt: 'Describe an Azure three-tier blueprint and how you automate it.',
    probing:
      'Tier boundaries with the right services, private data access, and environment separation that goes beyond variable files.',
    answer: [
      'A typical Azure three-tier design uses Front Door for global entry, Application Gateway or WAF for regional routing, and App Service, VM Scale Sets, containers, or AKS for the presentation tier.',
      'The application tier runs on its own separately secured service or compute boundary, and can use an internal load balancer, Service Bus, and Redis to decouple work and cut down latency.',
      'Azure SQL, Cosmos DB, or Storage services make up the data tier, reached through private connectivity, managed identity, encryption, backup, and tested recovery.',
      'Terraform modules, the Azure CLI where it fits, Git-based review, and CI/CD keep Dev, Test, and Production repeatable. Environment separation also needs to cover state, identity, approval, policy, and network boundaries — not just separate variable files.',
    ],
    followUps: [
      'How do you separate state and identity between Dev, Test and Production?',
      'Where would Service Bus and Redis help in the application tier?',
    ],
    tags: ['three-tier', 'architecture', 'terraform'],
  },
  {
    id: 'itv-myaz-63',
    level: 'intermediate',
    kind: 'open',
    prompt: 'When do you choose Azure Functions versus Azure Virtual Machines?',
    probing:
      'Event-driven, short-lived compute versus full OS control, and the operational work each one brings.',
    answer: [
      '**Azure Functions** is event-driven serverless compute. Common triggers are HTTP, timer, Blob, queue, and Event Grid.',
      "It's a strong fit for short-lived APIs, automation, scheduled work, notifications, and event processing. Choose the plan, timeout, memory, concurrency, retry and dead-letter behavior, identity, secret access, and observability deliberately — don't just take the defaults.",
      "It's not automatically the best fit for anything long-running, stateful, or connection-heavy.",
      '**Azure Virtual Machines** give you operating-system control, for legacy applications, custom software, migration workloads, self-managed tools, and development environments.',
      'They need patching, image management, endpoint protection, backup, monitoring, least-privilege access, and capacity planning.',
      "Use private IPs by default, and reach VMs through Azure Bastion or controlled just-in-time administration instead of exposing RDP or SSH publicly. Use VM Scale Sets when you're scaling identical instances horizontally.",
      "A VM that's just stopped can still cost you in compute charges. **Stopped (deallocated)** actually releases that compute allocation — though disks and other attached resources still cost money on their own.",
    ],
    tags: ['azure functions', 'vm'],
  },
]
