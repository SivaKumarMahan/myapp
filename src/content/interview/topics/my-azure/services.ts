import type { InterviewQuestion } from '../../../types'

/** Azure services: compute, storage, identity, messaging and AKS. */
export const myAzureServicesQuestions: InterviewQuestion[] = [
  {
    id: 'itv-myaz-23',
    level: 'basic',
    kind: 'open',
    prompt: 'What are Azure Virtual Machines?',
    probing:
      'The IaaS responsibility split, when a VM is the right choice, and how you separate platform problems from guest problems.',
    answer: [
      'Azure VMs are infrastructure-as-a-service compute. Azure runs the physical hardware and the hypervisor; I manage the guest OS, patches, software, configuration, identity, disks, and recovery of the workload itself. VMs attach network interfaces to a VNet and use managed disks for storage.',
      'I reach for VMs when I need legacy software, control over the OS or kernel, an unsupported runtime, or a straightforward lift-and-shift. In production I use Availability Zones or sets as needed, load balancing, backups, monitoring, patch management, managed identity, and infrastructure-as-code. A single VM is a single point of failure.',
      'When something\'s wrong, I start with Azure\'s own resource and boot diagnostics and the Activity Log, then move into guest-level CPU, memory, disk, network, and service logs. I always separate "Azure itself has a problem" from "the OS or app has a problem" before I reach for a reboot.',
    ],
    tags: ['vm', 'iaas'],
  },
  {
    id: 'itv-myaz-24',
    level: 'intermediate',
    kind: 'open',
    prompt: 'How do you secure Azure Virtual Machines?',
    probing:
      'Private access paths, hardening and patching, identity instead of stored credentials, and a real response to a compromised VM.',
    answer: [
      "I keep VMs private and reach them through Bastion, VPN, ExpressRoute, or another controlled jump path. I never expose RDP or SSH to the open internet. Network security groups and firewalls only allow the traffic that's actually needed. Signing in through Entra with managed identity, plus RBAC scoped to the minimum needed, cuts down on stored credentials.",
      'I use hardened images, keep patches and updates current, encrypt disks, turn on Secure Boot and vTPM where supported, run endpoint protection or Defender, scan for vulnerabilities, take backups, and send logs somewhere central. Secrets come from Key Vault, not from the VM itself.',
      'I watch for privileged sign-ins, changes to network security group rules, new public IPs, malware alerts, and patch compliance. I also test that recovery actually works.',
      "If I suspect a VM has been compromised, I cut off its network access, preserve evidence following the incident procedure, rotate any credentials it could reach, rebuild from a trusted image, and investigate properly — I don't just reboot it and hope.",
    ],
    tags: ['vm', 'security', 'bastion'],
  },
  {
    id: 'itv-myaz-25',
    level: 'basic',
    kind: 'open',
    prompt: 'What is an Azure Storage Account?',
    probing:
      'That the account is the configuration and security boundary for its services, and which settings you choose deliberately.',
    answer: [
      "A Storage Account is Azure's namespace, security, and configuration boundary for Blob, Files, Queue, and Table services, depending on the account type. It controls region, redundancy, performance tier, networking, encryption, identity and RBAC, lifecycle rules, and protection settings.",
      "I pick general-purpose v2 in most cases, choose LRS, ZRS, or GRS based on what failure and recovery-point needs the workload actually has, turn off public or anonymous access unless it's genuinely required, prefer Entra ID and managed identity over keys, enforce HTTPS, use private endpoints or firewalls, and turn on logs, soft delete, versioning, or lifecycle rules depending on the workload.",
      "I keep an eye on capacity, transactions, latency, availability, throttling, and data leaving the account. Recovery features and backup get chosen per service — replication by itself doesn't protect against every kind of deletion or corruption.",
    ],
    tags: ['storage'],
  },
  {
    id: 'itv-myaz-26',
    level: 'basic',
    kind: 'open',
    prompt: 'What is Azure Blob Storage?',
    probing:
      'Object storage use cases, access tiers and their trade-offs, and when Azure Files or managed disks fit better.',
    answer: [
      'Blob Storage is object storage for unstructured data — images, logs, backups, build artifacts, static content, data-lake files, that kind of thing. Containers hold block, append, or page blobs, and access tiers let you trade retrieval speed and cost against storage cost.',
      "Applications use the SDK or REST API with managed identity and roles scoped to just the data they need. I use lifecycle rules to move data to cheaper tiers or delete it on a schedule, immutable storage (which can't be altered or deleted before its retention period ends) for regulated data that must be retained, and versioning or soft delete for recovery.",
      'Large uploads go in blocks, with retries designed to be safe even if the same block gets uploaded twice.',
      'I choose Blob over Azure Files when the workload fits object access over HTTP; Files is the better fit for SMB or NFS shares. Monitoring covers request errors, latency, capacity, throttling, and outbound data.',
      'Azure Blob Storage is object storage. Pick the access tier based on how the data is actually used: Hot for data accessed often, Cool for data accessed rarely (with tradeoffs around minimum retention and retrieval cost), and Archive for long-term data that needs to be brought back online before it can be used.',
      "Azure Files gives you managed SMB or NFS file shares; managed disks give you block storage for VMs. Use private endpoints, encryption, RBAC, and backup or lifecycle policies wherever they're needed.",
    ],
    tags: ['blob storage', 'storage tiers'],
  },
  {
    id: 'itv-myaz-27',
    level: 'intermediate',
    kind: 'open',
    prompt: 'How do you secure Azure Storage?',
    probing:
      'Defence in depth: anonymous access, network restriction, identity over keys, careful SAS, encryption, and what you do after an exposure.',
    answer: [
      'I stack several layers of protection rather than relying on one setting. I turn off anonymous blob access, restrict or disable public network access, use private endpoints and private DNS, require HTTPS for all transfers, prefer Entra managed identities and data-level RBAC over account keys, protect and rotate any keys that are still in use, and issue SAS tokens that are short-lived and carry only the permissions they need.',
      'Azure encrypts data at rest by default. I add customer-managed keys or infrastructure-level encryption when the requirement calls for it. I also turn on Defender and logging, use versioning, soft delete, or immutability where it makes sense, and apply policies that stop insecure settings from being created in the first place.',
      "I test that allowed access actually works and denied access actually fails. If there's an exposure, I lock down access, revoke SAS tokens or rotate keys, keep the logs, check what was downloaded or changed, restore data if needed, and fix the underlying policy or architecture.",
      'Use defense in depth rather than relying on one setting.',
      "1. **Prevent anonymous blob access** unless the workload explicitly requires public content.\n2. **Restrict public network access** to selected networks, or disable it when private access is sufficient.\n3. **Use private endpoints** to give a storage service a private IP address in a VNet.\n4. **Use service endpoints when appropriate** to restrict the public storage endpoint to selected subnets. Unlike a private endpoint, the service still uses its public endpoint.\n5. **Enforce secure transfer** so clients use HTTPS or supported secure protocols.\n6. **Prefer Microsoft Entra ID and managed identities** over account keys.\n7. **Use SAS tokens carefully**: grant minimal permissions, use short expiry times, require HTTPS, and prefer user-delegation SAS for Blob Storage when possible.\n8. **Protect account keys** and rotate them if they must be used.\n9. **Use encryption at rest** with Microsoft-managed keys or customer-managed keys where required.\n10. **Consider infrastructure encryption** when compliance requires an additional encryption layer.\n11. **Use Defender for Storage** for threat detection where the risk and cost justify it.\n12. **Enable diagnostic settings, logging, soft delete, versioning, and recovery features** according to the workload's protection requirements.",
    ],
    tags: ['storage', 'security', 'sas'],
  },
  {
    id: 'itv-myaz-28',
    level: 'intermediate',
    kind: 'open',
    prompt: 'What is Azure Key Vault?',
    probing:
      'The management-plane versus data-plane split and a thorough checklist when an identity cannot read a secret.',
    answer: [
      "Key Vault stores secrets, cryptographic keys, and certificates. Management-plane permissions control the vault's configuration; data-plane permissions control access to what's stored inside it. A subscription Owner doesn't automatically get to read secrets — those are two separate permission systems.",
      "Applications use managed identity with a narrow role, like Key Vault Secrets User. I turn on soft delete and purge protection, enable logging, assign clear ownership for rotation and expiry, and use private networking where it's needed. I never let a secret's value get printed out through a pipeline or an infrastructure-as-code run.",
      "When troubleshooting, I check the identity making the request, whether the vault uses RBAC or the older access-policy model, the role and its scope, whether the role assignment has actually propagated yet, the object's version and state, the token's audience, firewall and private DNS settings, and the audit logs. I test rotation with the actual consumers of the secret, not just in isolation.",
    ],
    tags: ['key vault', 'secrets'],
  },
  {
    id: 'itv-myaz-29',
    level: 'basic',
    kind: 'open',
    prompt: 'What is Microsoft Entra ID?',
    probing:
      'That Entra ID authenticates and Azure RBAC authorises, plus the identity hygiene you apply.',
    answer: [
      "Microsoft Entra ID is Microsoft's cloud identity service. It handles users, groups, applications and service principals, managed identities, devices, authentication, Conditional Access, and tokens.",
      "It's a different system from Azure RBAC: Entra ID authenticates who someone is, while Azure RBAC decides what they're allowed to do to Azure resources.",
      'I use groups instead of assigning access to individual users, turn on MFA and Conditional Access, use Privileged Identity Management for privileged roles, prefer workload identity over stored secrets, run access reviews, keep break-glass accounts ready, and watch sign-in and audit logs.',
      "When authentication fails, I check the tenant, the identity's state, credentials or federation, Conditional Access rules, the token's audience and scopes, consent, and the sign-in logs. Once authentication is confirmed, authorization failures point me to roles and policies instead.",
    ],
    tags: ['entra id', 'identity'],
  },
  {
    id: 'itv-myaz-30',
    level: 'basic',
    kind: 'open',
    prompt: 'What is Azure Container Registry?',
    probing:
      'Digest-based deployments, identity-based pulls with AcrPull, and how you debug ImagePullBackOff.',
    answer: [
      'ACR is a private registry for container images and related artifacts. It supports repositories, geo-replication on the right tiers, build tasks, webhooks, retention and isolation features, and integration with Azure identity.',
      "CI builds and scans an image, pushes it with a digest (a fixed reference that always points to that exact image) using workload identity, signs it, and deployments reference that digest directly. AKS pulls it through managed identity with the `AcrPull` role — nobody shares the registry's admin password.",
      "I restrict public and network access where needed, apply repository permissions, retention rules, auditing, and a vulnerability-scanning workflow. When I see `ImagePullBackOff`, I check the image tag and digest, the registry login and role, network and private DNS settings, node architecture, and the pod's events.",
    ],
    tags: ['acr', 'containers'],
  },
  {
    id: 'itv-myaz-31',
    level: 'basic',
    kind: 'open',
    prompt: 'What is Azure App Service?',
    probing:
      'What the platform manages for you, the production features you turn on, and how slot swaps give safe releases.',
    answer: [
      'App Service is a managed platform for hosting web apps and APIs. Azure runs the OS and runtime; teams deploy their code or container and configure the plan, scaling, domains and TLS, identity, networking, diagnostics, and application behavior.',
      "In production I use multiple instances or zones where they're available, a health check, autoscale, managed identity with Key Vault references, VNet integration or private endpoints as needed, deployment slots, and Application Insights.",
      "I deploy to a slot, warm it up and test it, then swap it into production — keeping database changes backward-compatible so the swap doesn't break anything. When something fails, I check deployment logs, app logs, instance health, configuration, identity, DNS and networking, dependencies, and platform metrics before I roll back or swap.",
      'Azure Web Apps is a managed platform for building, deploying, and scaling web applications and APIs.',
      '**Key capabilities (Azure App Service Web Apps)**',
      '- Supports common runtimes such as .NET, Java, Node.js, Python, and PHP.\n- Supports deployment from GitHub, Azure DevOps, local Git, and other CI/CD systems.\n- Provides custom domains, TLS, authentication integration, deployment slots, monitoring, scaling, and backups depending on the plan.\n- Integrates with Visual Studio and Visual Studio Code.',
      '**Common use cases (Azure App Service Web Apps)**',
      '- Business web applications and REST APIs\n- E-commerce applications\n- Blogs and content-management systems',
      '**Interview summary:** Choose Web Apps when an HTTP application needs a continuously available managed hosting environment. Choose Functions when execution is primarily event-driven and can be broken into individual operations.',
    ],
    tags: ['app service', 'paas'],
  },
  {
    id: 'itv-myaz-32',
    level: 'basic',
    kind: 'open',
    prompt: 'What are Azure Functions?',
    probing:
      'Triggers and bindings, the effect of the hosting plan, and idempotent handling because events can arrive twice.',
    answer: [
      'Azure Functions runs code in response to events — HTTP requests, timers, queues, blobs, Event Grid, Service Bus, and more. Bindings handle a lot of the input and output plumbing for you. The hosting plan you pick determines scaling, cold-start behavior, networking, run duration, and cost.',
      'For example: a blob upload triggers a Function that validates and processes it, writes a status to a database, and sends failures to a dead-letter path. Because events can be delivered more than once, the function is written so that running it twice causes no harm, and any external calls it makes use limited retries and correlation IDs.',
      'I configure managed identity, Key Vault access, Application Insights, timeouts, concurrency, alerts, and failure handling. Durable Functions is the right tool when the workflow needs orchestration or state.',
      'Azure Functions is an event-driven compute service. A function runs code in response to an event without requiring the application team to manage servers.',
      '**Good use cases (Azure Functions)**',
      '- Lightweight APIs and webhooks\n- Queue and event processing\n- Scheduled background work\n- File and image processing\n- Data validation and transformation\n- Small integration components',
      '**Advantages (Azure Functions)**',
      '- Automatic or elastic scaling, depending on the hosting plan\n- Consumption-based options for intermittent workloads\n- Fast development for small, event-focused components\n- Native integration with many Azure services',
      '**Considerations (Azure Functions)**',
      "- Cold starts may affect latency on some hosting plans.\n- Execution and timeout behavior depends on the chosen plan.\n- Stateful or long-running workflows need an appropriate pattern, such as Durable Functions.\n- Distributed functions need good logging, correlation, retries, and idempotency — meaning it's safe to run the same operation more than once.",
      '**Example flow:** A user uploads a photo to Blob Storage. A Function is triggered, validates or transforms the image, calls an API, and writes metadata to a database.',
    ],
    tags: ['azure functions', 'serverless'],
  },
  {
    id: 'itv-myaz-33',
    level: 'intermediate',
    kind: 'open',
    prompt: 'What is Azure SQL Database?',
    probing:
      'The managed-service responsibility split, recovery options chosen from RPO/RTO, and a performance investigation that goes beyond scaling up.',
    answer: [
      'Azure SQL Database is a managed, SQL Server-compatible database. Azure handles platform patching, backups, and built-in availability; I manage schema, queries and indexes, users, data protection, performance tier, networking, recovery policy, and how resilient the application is to hiccups.',
      "I use Entra authentication or managed identity, a firewall or private endpoint, TLS, auditing and Defender, access scoped to only what's needed, and monitoring. Point-in-time restore and geo-replication or failover groups get chosen based on how much data loss and downtime the business can actually tolerate.",
      "When the database is slow, I look at query performance, wait stats, blocking, CPU and IO, the connection pool, indexes and query plans, and any recent changes. Scaling up can help in the moment, but it doesn't replace actually fixing the query or the root cause.",
    ],
    tags: ['azure sql', 'database'],
  },
  {
    id: 'itv-myaz-34',
    level: 'intermediate',
    kind: 'open',
    prompt: 'What is Azure Service Bus?',
    probing: 'Queues versus topics, peek-lock and dead-lettering, and idempotent consumers.',
    answer: [
      'Service Bus is enterprise messaging built around queues and topics with subscriptions. It supports multiple consumers competing for work, publish-subscribe patterns, message locks, dead-letter queues, scheduled messages, duplicate detection, ordered sessions, and transactions in some scenarios.',
      "A producer sends a durable message; a consumer picks it up under a lock, processes it in a way that's safe even if it runs twice, and marks it complete. On failure, the message is abandoned and retried, and after enough failed attempts it goes to the dead-letter queue. I keep an eye on active and dead-letter message counts, message age, throttling, and processing latency.",
      'Managed identity and roles scoped to just sending or just receiving protect access. I choose Service Bus when messages genuinely need to be processed reliably — not just when I need to announce that something happened.',
    ],
    tags: ['service bus', 'messaging'],
  },
  {
    id: 'itv-myaz-35',
    level: 'intermediate',
    kind: 'open',
    prompt: 'What is Azure Event Grid?',
    probing:
      'Reactive event fan-out with at-least-once delivery, and why it is not a substitute for a command queue.',
    answer: [
      "Event Grid routes events from Azure or custom sources to handlers like Functions, Logic Apps, webhooks, Service Bus, or Event Hubs. It's built for fast, reactive fan-out with filtering, and it delivers each event at least once.",
      'For example: a blob-created event triggers metadata processing and a notification. The handler validates the event, is written to tolerate being run twice, responds quickly, and relies on retries and a dead-letter destination for failures.',
      'The event payload usually just describes what happened; the consumer goes and fetches the real data separately if it needs to.',
      "I monitor delivery failures and dead-lettered events, and secure webhook validation and identity. Event Grid isn't a substitute for the richer guarantees of a real command queue.",
    ],
    tags: ['event grid', 'events'],
  },
  {
    id: 'itv-myaz-36',
    level: 'intermediate',
    kind: 'open',
    prompt: 'What is Azure Policy?',
    probing:
      'Policy effects, initiatives and assignments, an audit-first rollout, and the difference between Policy and RBAC.',
    answer: [
      "Azure Policy checks resource configuration against rules at whatever scope you assign it. Depending on the policy's effect, it can audit, deny, modify, append to, or deploy required settings. Initiatives group related policies together, and exemptions document any approved exceptions.",
      'For example: audit storage accounts for public access, deploy diagnostic settings automatically, then deny new insecure storage accounts once the existing ones are fixed. I roll out audit mode first, look at false positives and the impact on existing resources, fix what needs fixing, then switch to enforcement. Policies and their assignments are version-controlled like code.',
      'I test both compliant and non-compliant deployments, watch the compliance trend, and require exceptions to have an owner, a justification, and an expiry date. Policy is about governance — RBAC is what actually controls who can act.',
      "Azure Policy checks resources against your organization's rules. Depending on the effect you choose, it can audit, deny, modify supported properties, deploy required configuration, or just flag something as non-compliant.",
      'Initiatives group related policies into one baseline, and an assignment at management-group scope can inherit down across every subscription underneath it. Common controls include allowed regions or SKUs, mandatory tags, diagnostic settings, encryption, private networking, and security baselines.',
      "Start a policy rollout with an inventory and audit-only mode. Look at exemptions and how much it would break, then move to enforcement through proper change control. Policy isn't a replacement for RBAC — RBAC decides who can act, while Policy decides which resource states are acceptable.",
    ],
    tags: ['azure policy', 'governance'],
  },
  {
    id: 'itv-myaz-37',
    level: 'intermediate',
    kind: 'open',
    prompt: 'What is the difference between Service Bus and Event Grid?',
    probing:
      'Messages that must be processed versus events that announce a change, and how the two work together.',
    answer: [
      'Service Bus carries commands and messages that a consumer needs to reliably process from a queue or topic, with locks, completion tracking, dead-lettering, sessions, and richer broker features. Event Grid just announces that something happened, and routes that announcement quickly to subscribers with filtering and fan-out.',
      'I use Service Bus for something like order processing, where each message needs controlled completion, retry, and ordering. I use Event Grid to tell several different handlers that a blob or resource just changed.',
      'The two can work together: Event Grid spots an event and routes the important work into Service Bus for controlled processing.',
      'I decide between them based on delivery guarantees, ordering, transactions, retention, throughput, how consumers are structured, retry behavior, and what the payload needs to carry.',
    ],
    tags: ['service bus', 'event grid', 'messaging'],
  },
  {
    id: 'itv-myaz-38',
    level: 'intermediate',
    kind: 'open',
    prompt: 'What is the difference between App Service and Azure Functions?',
    probing:
      'Always-on web hosting versus trigger-driven execution, and the factors that decide between them.',
    answer: [
      'App Service hosts a web app or API that runs continuously, with its own application process and plan. Functions organizes code around triggers and events, and can scale execution up or down based on those events. Both are managed platforms, and they share some capabilities and plans under the hood.',
      'I choose App Service for a full web application or API that needs to always be on, with routing, slots, and longer-lived requests. I choose Functions for queue, timer, blob, or event handlers, or a small API where scaling by trigger makes sense.',
      'I weigh cold start, run duration, state, networking, runtime, throughput, and cost.',
      'An architecture can use both at once: App Service serves the API, while queue-triggered Functions handle the asynchronous work behind it.',
    ],
    tags: ['app service', 'azure functions'],
  },
  {
    id: 'itv-myaz-39',
    level: 'advanced',
    kind: 'open',
    prompt: 'How do you use Key Vault with App Service or Functions?',
    probing:
      'Key Vault references with managed identity, rotation behaviour and versioning, and a full troubleshooting checklist when a reference fails.',
    answer: [
      'I turn on managed identity, grant it a narrow Key Vault data role, set up network access and private DNS, then use a Key Vault reference in app settings, or access it directly through the SDK with `DefaultAzureCredential`.',
      'The app setting holds a reference URI, not the actual secret value. I plan out how refresh and rotation should behave, and I avoid pinning to a specific secret version if I want rotation to happen automatically, unless controlled versioning is actually the goal.',
      "I test startup and rotation, both allowed and denied identities, slot-specific identity and settings, and how the app behaves on failure. When troubleshooting, I check the reference's status, which identity got selected, the role and its scope, whether RBAC has propagated, the vault's network settings, DNS, the secret's expiry and state, and the logs.",
      'No secret value ever gets printed in diagnostics.',
    ],
    followUps: [
      'What happens to a Key Vault reference when the secret is rotated?',
      'How do slot-specific identities affect a slot swap?',
    ],
    tags: ['key vault', 'app service', 'managed identity'],
  },
  {
    id: 'itv-myaz-40',
    level: 'advanced',
    kind: 'open',
    prompt: 'Explain the AKS microservices architecture you would build on Azure.',
    probing:
      'Whether you can name each component, the delivery flow from image to cluster, and the production controls around it.',
    answer: [
      '**Core components (AKS microservices):**',
      "- **AKS cluster:** A managed Kubernetes control plane, with node pools sized and separated to match each workload's needs.\n- **Virtual Network:** The private network boundary for nodes, Pods, private endpoints, and any controlled connection back to on-premises systems.\n- **Azure Container Registry:** Private storage for container images that have been scanned and signed. AKS pulls them using managed identity and RBAC.\n- **Ingress and Azure Load Balancer/Application Gateway:** Handles external entry, TLS termination, routing, health checks, and an optional web application firewall.\n- **Azure Pipelines:** Builds, tests, and scans the code, publishes an image that won't change once tagged, and promotes releases that have passed review.\n- **Helm:** Packages Kubernetes resources and environment-specific values, and keeps a versioned history so upgrades and rollbacks are possible.\n- **Azure Monitor:** Collects monitoring data from the control plane, nodes, containers, applications, logs, metrics, and traces.",
      '**Deployment flow (AKS microservices):**',
      '1. Provision the VNet, AKS, ACR, identity, private DNS, ingress, monitoring, and policies through reviewed infrastructure-as-code.\n2. Build and scan each microservice image, then push its digest (a fixed, unchangeable reference to that exact image) to ACR.\n3. Validate and deploy versioned Helm charts, with readiness and startup probes and realistic resource requests.\n4. Send a small amount of traffic to the new version, run smoke and business tests, and watch errors, latency, how close resources are to their limits, and the health of dependencies.\n5. Either promote gradually, or roll back the traffic and the release if the health checks fail.',
      "A production setup also needs zone distribution, autoscaling, PodDisruptionBudgets, NetworkPolicies, workload identity, secrets pulled from an external store, backup and restore, certificate rotation, cost controls, and a regional recovery plan that's actually been tested.",
      'An Azure microservices platform can use Azure DevOps to build, test, scan, and publish container images to Azure Container Registry (ACR). Each image is immutable — once published, it never changes; a new version just gets a new tag. AKS pulls those images using a managed identity or workload identity with the narrow `AcrPull` permission.',
      'Helm packages the Kubernetes manifests and environment values. A deployment pipeline or GitOps controller then promotes that same chart and image digest through each environment.',
      "Use an AKS-supported CNI and data-plane configuration and enforce NetworkPolicy, but check what Cilium and policy features are actually supported for the AKS version you're running.",
      "Keep secrets in Key Vault and pull them in through workload identity, the CSI driver, or an approved external-secrets pattern. Don't store long-lived cloud credentials in Helm values.",
      "A production design also needs resource requests and limits, probes, autoscaling, PodDisruptionBudgets, an image-signing and scanning policy, RBAC, backup and recovery, and a rollback path that's actually been tested.",
    ],
    followUps: [
      'How do you promote the same image digest through environments?',
      'How do Pods get secrets without long-lived credentials?',
    ],
    code: [
      {
        title: 'AKS Microservices Reference Architecture',
        language: 'text',
        code: `developer -> Azure DevOps CI -> ACR
                              -> Helm/GitOps -> AKS
internet -> Front Door/WAF or Application Gateway -> AKS ingress/Gateway -> Services -> Pods
Pods -> Key Vault / Cosmos DB / Redis / Service Bus through private networking
Pods -> Azure Monitor, Log Analytics and Application Insights`,
      },
    ],
    tags: ['aks', 'architecture', 'microservices'],
  },
  {
    id: 'itv-myaz-41',
    level: 'advanced',
    kind: 'open',
    prompt: 'How do you rotate Key Vault secrets for workloads running in AKS?',
    probing:
      'The CSI driver with workload identity, how the app picks up a new value, and the event-driven alternative with its safety requirements.',
    answer: [
      'My preferred design: use the Azure Key Vault provider for the Secrets Store CSI Driver, paired with AKS workload identity. The Pod mounts values straight from Key Vault, and the driver can poll for a new secret version on its own.',
      'This keeps Terraform or a CI pipeline from becoming the long-term owner of rotating secret values — that job stays with Key Vault and the driver.',
      'A few things matter here:',
      "- Give the Kubernetes ServiceAccount and workload identity access to only the specific Key Vault objects they need, nothing broader.\n- Use private Key Vault connectivity and DNS where that's required.\n- Decide up front whether the application rereads the mounted file on its own, or needs a controlled Pod restart to pick up the change.\n- Watch for mount and rotation errors, and actually test a rotation with both the old and new application connections still active.\n- If you also sync the value into a Kubernetes Secret, remember that's another stored copy of the data. It needs its own encryption, RBAC, audit trail, and rotation handling.",
      'An event-driven alternative: a Key Vault rotation event goes through Event Grid to an Azure Function or automation workflow, which updates the approved target and kicks off a safe rollout.',
      'Whatever runs that workflow needs to be safe to run more than once, scoped to only the access it needs, logged, retried with dead-letter handling for failures, and verified afterward. A scheduled pipeline is simpler to build, but it can leave stale values sitting around until the next run — so don\'t rely on "runs every three months" as your only answer for a secret that might need to rotate early.',
      "One more thing: Argo CD won't notice a Key Vault version change on its own. Something else — an external-secrets process, or an encrypted desired-state update — has to bring that change into Git or Kubernetes before Argo CD can act on it.",
    ],
    followUps: [
      'Does the application pick up a rotated secret without a restart?',
      'Why does Argo CD not notice a Key Vault version change?',
    ],
    tags: ['key vault', 'aks', 'secret rotation', 'csi driver'],
  },
]
