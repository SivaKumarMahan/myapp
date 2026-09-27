import type { InterviewQuestion } from '../../../types'

/** Azure platform: DDoS/WAF, Key Vault, high availability, App Service and a Teams ChatOps dashboard. */
export const myStudyPlatformAzureQuestions: InterviewQuestion[] = [
  {
    id: 'itv-mystpl-22',
    level: 'intermediate',
    kind: 'open',
    prompt: 'How do you use Azure DDoS Protection, rate limiting and WAF together?',
    probing:
      'Whether you place each control at the right layer and add monitoring for defence in depth.',
    answer: [
      'Layered protection, applied in this order:',
      '- **Azure DDoS Protection** - protects the network against volumetric DDoS attacks, at the network layer.\n- **Rate limiting** - limits requests from individual clients; can be implemented at the Ingress Controller or an API Gateway.\n- **WAF (Web Application Firewall)** - Azure Application Gateway WAF protects against common web attacks such as SQL Injection and XSS, at the application layer.',
      '**Also layer in these controls:**',
      "- Network Policies (Pod-level restriction).\n- HPA / Cluster Autoscaler (absorb legitimate traffic spikes so they aren't mistaken for or compounded by an attack).\n- Azure Monitor / Prometheus / Grafana for visibility.\n- Alerts for unusual traffic patterns.",
      '**Short interview answer**\nI use Azure DDoS Protection at the network layer, rate limiting at the Ingress/API Gateway layer, and WAF for application-layer attacks like SQLi and XSS. On top of that, Network Policies, autoscaling, and monitoring/alerting on unusual traffic give defense in depth rather than relying on any single layer.',
    ],
    code: [
      {
        title: 'Layered protection, applied in this order',
        language: 'text',
        code: `Azure DDoS Protection -> Rate Limiting -> WAF on Ingress`,
      },
    ],
    tags: ['azure', 'ddos', 'waf', 'security'],
  },
  {
    id: 'itv-mystpl-23',
    level: 'intermediate',
    kind: 'open',
    prompt: 'How do you secure Azure Key Vault?',
    probing:
      'Whether you know soft delete, purge protection, managed identity, RBAC, logging and private access.',
    answer: [
      "- **Enable Soft Delete** - deleted secrets, keys, or certificates are retained and recoverable during the retention period, instead of being gone immediately.\n- **Enable Purge Protection** - prevents a permanent purge during that retention period, so even someone with delete permissions can't irreversibly destroy a secret before the retention window ends.\n- **Use Managed Identity** instead of storing credentials in application code to authenticate to the Vault.\n- **Use Azure RBAC with least privilege** - scope access to exactly the secrets/keys a given identity needs.\n- **Enable diagnostic logs and monitoring** - so access to secrets is auditable.\n- **Restrict network access** using Private Endpoints or firewall rules, rather than leaving the Vault reachable from the public internet.",
      "**Short interview answer**\nI secure Key Vault with Soft Delete and Purge Protection so secrets can't be irrecoverably destroyed, Managed Identity instead of embedded credentials, least-privilege Azure RBAC, diagnostic logging for auditability, and private network access via Private Endpoints or firewall rules instead of public exposure.",
    ],
    tags: ['azure', 'key vault', 'security'],
  },
  {
    id: 'itv-mystpl-24',
    level: 'advanced',
    kind: 'open',
    prompt:
      'How do you design for high availability in Azure, and what are the storage redundancy tiers?',
    probing:
      'Whether you think across compute, data and storage and can pick the right redundancy tier for the failure domain.',
    answer: [
      'Broader than just Kubernetes - applies across VMs, databases, and storage too:',
      '- **Availability Zones**\n- **Multiple VM instances / VMSS**\n- **Multiple AKS nodes and Pod replicas**\n- **Load Balancer / Application Gateway**\n- **Autoscaling**\n- **Highly available databases**\n- **Storage redundancy**\n- **Backup and disaster recovery**\n- **Monitoring and alerting**',
      '**Storage redundancy tiers:**',
      '- **LRS**: Locally Redundant Storage - copies within a single datacenter\n- **ZRS**: Zone Redundant Storage - copies across Availability Zones in one region\n- **GRS**: Geo Redundant Storage - copies to a secondary, paired region\n- **GZRS**: Geo-Zone Redundant Storage - zone redundancy in the primary region, plus geo-replication to a secondary region',
      '**For AKS specifically:** deploy node pools across Availability Zones, use multiple Pod replicas with readiness probes, HPA, Cluster Autoscaler, an Application Gateway (or other LB) in front, and a highly available database configuration behind it.',
      '**Short interview answer**\nAzure HA spans compute, data, and storage: Availability Zones and VMSS/multiple AKS nodes for compute, HA database configurations, and a storage redundancy tier chosen for the failure domain that actually matters - LRS for datacenter-local redundancy up through GZRS when both zone and region redundancy are required - backed by autoscaling, load balancing, backup/DR, and monitoring across all of it.',
    ],
    followUps: [
      'When would you choose ZRS over GRS?',
      'What does a regional failover of a GRS storage account involve?',
    ],
    tags: ['azure', 'high availability', 'storage'],
  },
  {
    id: 'itv-mystpl-25',
    level: 'basic',
    kind: 'open',
    prompt: 'What is the difference between App Service, an App Service Plan and a Web App?',
    probing:
      'Whether you can separate the platform, the compute you pay for, and the app - and the noisy-neighbour effect of sharing a plan.',
    answer: [
      'This is one of the most common Azure interview questions. Many people confuse these three terms because they are closely related.',
      'Think of it like an apartment building:',
      '- **App Service Plan** = the building (CPU, RAM, OS, pricing tier)\n- **Web App** = your apartment (your application)\n- **App Service** = the overall Azure platform that hosts web applications, APIs, mobile backends, etc.',
      "**Azure App Service**\nApp Service is Microsoft's PaaS (Platform as a Service) offering for hosting web applications. It provides everything required to run an application without managing servers.",
      'It includes features like:',
      '- Auto scaling\n- Load balancing\n- SSL certificates\n- Deployment slots\n- Authentication\n- Custom domains\n- Backup and restore\n- Monitoring\n- CI/CD integration',
      'So App Service is the service itself.',
      'Instead of creating VMs, installing IIS or Nginx, configuring networking, and maintaining the OS, Azure App Service handles all of that.',
      '**App Service Plan**\nThe App Service Plan defines the infrastructure on which your applications run. It decides:',
      '- CPU\n- RAM\n- OS (Windows / Linux)\n- Region\n- Pricing tier\n- Number of instances\n- Scaling',
      'Think of it as: "How much hardware do I want?"',
      'Every Web App inside this plan shares these resources.',
      '**One App Service Plan can host multiple apps**\nAll these applications share the same compute resources.',
      '**Web App**\nA Web App is the actual application you deploy. Examples:',
      '- Company website\n- React application\n- Angular application\n- ASP.NET application\n- Node.js application\n- Java application\n- Python Flask application',
      "When you open: `https://mycompany.azurewebsites.net` you're accessing a Web App.",
      '**Real-world example**\nSuppose your company has three applications: Customer Portal, Admin Portal and a REST API.',
      'All three apps run on the same App Service Plan and share the same compute resources.',
      '**If one app uses high CPU?**\nSince all apps share the same App Service Plan:',
      '- Admin Portal performance may degrade.\n- API performance may also degrade.',
      "That's why production workloads often use separate App Service Plans for critical applications.",
      '**Common follow-up questions**',
      '**Can one App Service Plan have apps from different subscriptions?**\nNo. Apps in an App Service Plan must belong to the same subscription.',
      '**Can multiple App Service Plans exist?**\nYes.',
      'Each plan has different resources and pricing.',
      '**Can two Web Apps share one App Service Plan?**\nYes. Multiple Web Apps can share a single App Service Plan, and they share the underlying compute resources (CPU, memory, and storage). This is cost-effective, but heavy resource usage by one app can affect the others.',
      '**Scaling**\n**Scale Up** - increase VM size. More CPU and RAM.',
      '**Scale Out** - increase the number of instances.',
      "Azure's load balancer distributes traffic across them.\n**Quick comparison**",
      "- **What is it?**: App Service: Azure hosting platform; App Service Plan: Compute resources; Web App: Your application\n- **Contains**: App Service: Web Apps, API Apps, etc.; App Service Plan: CPU, RAM, OS, pricing; Web App: Application code\n- **Billing**: App Service: Through the plan; App Service Plan: Yes; Web App: No separate compute charge\n- **Scaling**: App Service: Supported; App Service Plan: Defines scale; Web App: Uses the plan's resources\n- **Multiple apps?**: App Service: Yes; App Service Plan: Yes; Web App: One application",
      '**Easy way to remember**\nImagine renting office space:',
      "- **App Service** = the business park that provides facilities and management.\n- **App Service Plan** = the office building you rent (size, capacity, cost).\n- **Web App** = your company's office operating inside that building.",
      'The building determines how much space and power you have, while your office is the actual business running inside it.',
    ],
    code: [
      {
        title: 'App Service Plan: Example',
        language: 'text',
        code: `App Service Plan

Premium V3
Linux
East US
4 CPUs
16 GB RAM`,
      },
      {
        title: 'One App Service Plan can host multiple apps',
        language: 'text',
        code: `App Service Plan
Premium V3
Linux
4 CPU
16 GB RAM

        |
        +-- Web App A
        +-- Web App B
        +-- API App
        +-- Function App (Premium)`,
      },
      {
        title: 'Real-world example: You create',
        language: 'text',
        code: `App Service Plan
Premium V3
8 GB RAM
Linux

        |
        +-- Customer Portal (Web App)
        +-- Admin Portal (Web App)
        +-- Orders API (Web App)`,
      },
      {
        title: 'If one app uses high CPU?',
        language: 'text',
        code: `Customer Portal
CPU = 90%`,
      },
      {
        title: 'Can multiple App Service Plans exist?',
        language: 'text',
        code: `Development Plan
B1

Testing Plan
S1

Production Plan
Premium V3`,
      },
      {
        title: 'Scale Up',
        language: 'text',
        code: `B1
 |
S1
 |
P1V3
 |
P2V3`,
      },
      {
        title: 'Scale Out',
        language: 'text',
        code: `Instance 1
Instance 2
Instance 3`,
      },
    ],
    tags: ['azure', 'app service'],
  },
  {
    id: 'itv-mystpl-26',
    level: 'basic',
    kind: 'open',
    prompt:
      'Explain Teams bots, Adaptive Cards, micro frontends and D3.js vs Highcharts for a deployment-status dashboard.',
    probing:
      'Whether you can explain the building blocks of a ChatOps dashboard and choose a charting library for the job.',
    answer: [
      'A cluster of related concepts that shows up in "build a status dashboard/bot" style questions: chat apps, micro frontends, the Teams Bot Framework, Adaptive Cards, and the difference between D3.js and Highcharts for the visualization layer.',
      "**Chat apps** - applications where users communicate through messages, such as Microsoft Teams, Slack, or an internal chat application. In a DevOps context, they're commonly used as the front door for ChatOps - checking deployment status, triggering pipelines, or getting alerts without leaving the chat tool.",
      '**Micro frontends** - a way to split a large frontend application into smaller, independently developed and deployed frontend applications, each typically owned by a different team.',
      'Different teams can own and deploy each section independently instead of shipping one large frontend as a single unit.',
      '**Teams Bot Framework** - used to build bots that users interact with directly inside Microsoft Teams.',
      '**Adaptive Cards** - JSON-based UI cards used by Teams bots to display structured information and interactive buttons inside a Teams conversation, instead of plain text.',
      '**D3.js vs Highcharts** - both are JavaScript charting libraries, but they solve different problems:',
      '- **D3.js**: More flexible and customizable - you build the visualization from primitives (SVG, scales, axes)\n- **Highcharts**: Easier for standard business charts (bar, line, pie) with less code and built-in interactivity',
      'D3.js is the right choice when a dashboard needs a custom or unusual visualization; Highcharts is the right choice when the requirement is common business charts delivered quickly.',
      '**Azure Web Apps** - Azure App Service Web Apps, used to host web applications and APIs without managing the underlying VMs directly. Supports .NET, Node.js, Python, Java, and PHP.',
      '**Putting it together** - a Teams-integrated deployment-status dashboard could look like:',
      'The bot handles the conversational interface and Adaptive Cards inside Teams, a Python API on Azure App Service does the backend work (querying deployment/pipeline state), and a web dashboard renders the same data visually using D3.js or Highcharts depending on how custom the charts need to be.',
    ],
    code: [
      {
        title: 'Micro frontends',
        language: 'text',
        code: `Employee Portal
 ├── Profile
 ├── Payroll
 ├── Leave Management
 └── Reports`,
      },
      {
        title: 'Teams Bot Framework',
        language: 'text',
        code: `User: Check production deployment
Bot:  Production deployment is successful.
      Version: v2.4.1
      Status: Running`,
      },
      {
        title: 'Adaptive Cards',
        language: 'text',
        code: `Production Deployment
Status: Successful
Version: v2.4.1
Environment: Production
[View Logs] [Rollback]`,
      },
      {
        title: 'Putting it together',
        language: 'text',
        code: `User
  |
  v
Microsoft Teams
  |
  v
Teams Bot
  |
  v
Python API
  |
  v
Azure Web App / Database / APIs
  |
  v
Data
  |
  v
D3.js / Highcharts
  |
  v
Web Dashboard`,
      },
    ],
    tags: ['chatops', 'teams', 'dashboards'],
  },
]
