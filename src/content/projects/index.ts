import type { FlowDiagram } from '../types'

/**
 * Projects: the products you have worked on, written so you can explain them
 * in an interview - what the product is, what it offers, how it works end to
 * end, and what you owned. Add a project by appending to `projects`.
 *
 * Inline text supports the same **bold** and `code` markup as interview
 * answers.
 */

export interface ProjectFact {
  label: string
  value: string
}

export interface ProjectStep {
  title: string
  detail: string
}

export interface ProjectArea {
  title: string
  items: string[]
}

export interface Project {
  id: string
  icon: string
  name: string
  tagline: string
  /** The one-paragraph summary, as you would put it on a CV. */
  summary: string
  /** Your role on the project, in one line. */
  role: string
  facts: ProjectFact[]
  /** The problem the product solves and for whom. */
  whatItDoes: string[]
  /** Who pays for it. */
  customers: string[]
  /** What the product offers its customers. */
  offerings: ProjectStep[]
  /** How it works, in order, from raw data to the customer. */
  howItWorks: ProjectStep[]
  diagram: FlowDiagram
  /** The platform behind the product, grouped by area. */
  platform: ProjectArea[]
  /** What you owned and did. */
  responsibilities: string[]
  techStack: string[]
  /** How to describe it in an interview: 30 seconds, then the longer version. */
  pitch: { short: string; long: string[] }
  /** Questions an interviewer is likely to ask about this project. */
  likelyQuestions: string[]
  /** Interview topic ids worth revising for this project. */
  relatedTopics: string[]
}

export const projects: Project[] = [
  {
    id: 'tenetic',
    icon: '📡',
    name: 'Tenetic',
    tagline: 'AI-powered consumer and advertising-intelligence SaaS',
    summary:
      'An AI-powered consumer-measurement and advertising-intelligence SaaS serving 200+ U.S. markets, processing trillions of behavioral attributes across hundreds of millions of consumers. Owned the DevOps and cloud platform for the multi-cloud estate (AWS, Azure, Cloudflare, Databricks) behind the product.',
    role: 'DevOps / cloud platform owner for the multi-cloud estate behind the product',
    facts: [
      { label: 'Markets served', value: '200+ U.S. markets' },
      { label: 'Data processed', value: 'Trillions of behavioral attributes' },
      { label: 'Consumers covered', value: 'Hundreds of millions' },
      { label: 'Cloud estate', value: 'AWS · Azure · Cloudflare · Databricks' },
    ],
    whatItDoes: [
      'Measures **who consumes what**: TV viewership, digital engagement, visits to venues and stores, and brand affinity, market by market across the U.S.',
      'Turns those signals into **audiences and insights** that media sellers and advertisers can act on - who watches a station or daypart, which brands those households buy, and where they go.',
      'Uses **AI** to project panel data to whole markets, score affinities, and let users ask questions of the data in plain language instead of writing SQL.',
      'Delivers it all as a **SaaS product**: customers log in to a web application and APIs; they never see the data platform behind it.',
    ],
    customers: [
      'Local TV stations and broadcast groups proving the value of their audience to advertisers',
      'Media sales teams building pitches and packages by market, station and daypart',
      'Advertisers and agencies planning campaigns and choosing where to spend',
      'Brands that want to understand and reach their buyers in each market',
    ],
    offerings: [
      {
        title: 'Audience measurement',
        detail:
          'Audience size and reach by market, station, daypart and weekday/weekend - industry metrics such as **AQH** (average quarter-hour audience) and **Cume** (unique audience over a period).',
      },
      {
        title: 'Consumer and brand intelligence',
        detail:
          'Which brands a station or daypart audience buys, brand penetration against all households in the market, and demographic and lifestyle profiles.',
      },
      {
        title: 'Visitation insights',
        detail:
          'Mobile and venue visitation - which audiences visit which stores and venues - to connect media exposure with real-world behaviour.',
      },
      {
        title: 'Audience targeting',
        detail:
          'Build a target audience from behaviours and affinities, size it per market, and use it to plan or sell a campaign.',
      },
      {
        title: 'AI assistant and natural-language analytics',
        detail:
          'Ask questions such as "which dayparts over-index for this brand in Los Angeles?" and get answers from the governed data, without writing queries.',
      },
      {
        title: 'Reports, dashboards and APIs',
        detail:
          'Ready-made reports and dashboards in the web app, plus data access for customers who want to pull results into their own tools.',
      },
    ],
    howItWorks: [
      {
        title: 'Ingest',
        detail:
          'Licensed and partner data feeds - TV viewing, digital engagement, mobile location and visitation, purchase and brand data - land in cloud object storage (S3 on AWS, ADLS on Azure) on a schedule.',
      },
      {
        title: 'Process in Databricks',
        detail:
          'Spark pipelines clean, validate and join the feeds through a **medallion** layout: raw (bronze), cleaned and conformed (silver), and business-ready (gold) Delta tables, partitioned by report period.',
      },
      {
        title: 'Model with AI/ML',
        detail:
          'Models project panel households to full market populations, compute audience metrics, and score brand and lifestyle affinities. Results are written back to gold tables per market and period.',
      },
      {
        title: 'Serve',
        detail:
          'Gold tables are queried through SQL warehouses and application APIs. Dimension tables (market, station, daypart, brand, geography) make results readable, e.g. market id to "Los Angeles, CA".',
      },
      {
        title: 'Deliver through the SaaS app',
        detail:
          'The web application and APIs sit behind **Cloudflare** for DNS, CDN, TLS and WAF protection. Customers sign in, explore dashboards, build audiences and export results.',
      },
      {
        title: 'Operate',
        detail:
          'Every layer is built by IaC and CI/CD into separate dev, QA, stage and production environments, monitored with alerts on pipelines, jobs, cost and application health.',
      },
    ],
    diagram: {
      kind: 'flow',
      title: 'From raw consumer signals to customer insights',
      caption:
        'Data flows one way through the layers; the DevOps platform builds, deploys and watches every box.',
      nodes: [
        {
          label: 'Data feeds',
          detail: 'TV, digital, mobile visitation, purchase and brand data',
        },
        {
          label: 'Cloud storage',
          detail: 'S3 and ADLS landing zones',
          arrowLabel: 'scheduled ingest',
        },
        {
          label: 'Databricks pipelines',
          detail: 'Bronze, silver and gold Delta tables',
          arrowLabel: 'Spark jobs',
        },
        {
          label: 'AI and ML models',
          detail: 'Projection, audience metrics, affinity scores',
          tone: 'accent',
        },
        {
          label: 'SQL warehouses and APIs',
          detail: 'Governed access to gold data',
        },
        {
          label: 'SaaS web app',
          detail: 'Behind Cloudflare DNS, CDN and WAF',
          arrowLabel: 'HTTPS',
        },
        {
          label: 'Customers',
          detail: 'Stations, media sellers, agencies, advertisers',
          tone: 'success',
        },
      ],
    },
    platform: [
      {
        title: 'AWS',
        items: [
          'Object storage for data landing and exchange with partners',
          'Compute and networking for application and data workloads',
          'IAM roles and policies with least privilege per environment',
        ],
      },
      {
        title: 'Azure',
        items: [
          'Data Lake Storage, networking and identity (Microsoft Entra ID, managed identities)',
          'Key Vault for secrets and keys used by pipelines and services',
          'Monitoring and alerting for platform resources',
        ],
      },
      {
        title: 'Databricks',
        items: [
          'Workspaces per environment, Unity Catalog for governance and access control',
          'Jobs and workflows for the data pipelines, SQL warehouses for serving',
          'Cluster policies and job compute to keep cost under control',
        ],
      },
      {
        title: 'Cloudflare',
        items: [
          'DNS and TLS for the product domains',
          'CDN, WAF and DDoS protection in front of the web application and APIs',
          'Access policies for internal tools',
        ],
      },
      {
        title: 'Delivery and operations',
        items: [
          'Terraform for every cloud, with remote state and per-environment configuration',
          'CI/CD pipelines that build, test, scan and promote changes from dev to QA, stage and production',
          'Monitoring, logging and alerting for jobs, pipelines, applications and cost',
        ],
      },
    ],
    responsibilities: [
      'Owned the DevOps and cloud platform for the multi-cloud estate (AWS, Azure, Cloudflare, Databricks) behind the product.',
      'Provisioned and standardised infrastructure as code with Terraform across clouds and environments (dev, QA, stage, production).',
      'Built and maintained CI/CD pipelines for application and data code, with approvals and promotion between environments.',
      'Ran the Databricks platform: workspaces, jobs, SQL warehouses, access control and cost governance.',
      'Managed identity, secrets and network security: least-privilege access, secrets in a vault, Cloudflare in front of public endpoints.',
      'Set up monitoring and alerting for job failures, data freshness, application health and cloud cost; tuned alerts to cut noise.',
      'Handled production incidents and root-cause analysis, and fed the fixes back into automation.',
    ],
    techStack: [
      'AWS',
      'Azure',
      'Databricks',
      'Apache Spark',
      'Delta Lake',
      'Unity Catalog',
      'Cloudflare',
      'Terraform',
      'CI/CD pipelines',
      'Docker',
      'Kubernetes',
      'Python',
      'SQL',
      'Bash',
      'Monitoring and alerting',
    ],
    pitch: {
      short:
        'Tenetic is an AI-powered consumer-measurement and advertising-intelligence SaaS. It takes TV, digital, visitation and brand data for hundreds of millions of consumers across 200+ U.S. markets, processes trillions of attributes in Databricks, and gives TV stations, agencies and advertisers audience and brand insights through a web app. I owned the DevOps and cloud platform behind it across AWS, Azure, Cloudflare and Databricks.',
      long: [
        '**The product:** media sellers and advertisers need to know who their audience is and what those people buy and do. Tenetic measures that per market, station and daypart, and lets customers build audiences and ask questions in plain language.',
        '**How it works:** partner data lands in S3 and ADLS, Databricks pipelines move it through bronze, silver and gold Delta tables, ML models project it to full markets and score affinities, and the results are served through SQL warehouses and APIs to the SaaS app behind Cloudflare.',
        '**My part:** I owned the platform under all of that - Terraform for every cloud, CI/CD from dev to production, the Databricks workspaces and jobs, identity and secrets, Cloudflare in front of the app, and monitoring, alerting and cost control.',
        '**Impact to mention:** pick two or three concrete wins you can back up - for example faster or safer releases, fewer pipeline failures, alert noise removed, or cloud cost reduced - with the numbers.',
      ],
    },
    likelyQuestions: [
      'Walk me through the architecture of your current project.',
      'Why is the platform multi-cloud, and how do you manage AWS and Azure together?',
      'How do you deploy Databricks jobs and infrastructure through CI/CD?',
      'How do you manage Terraform state and environments across clouds?',
      'How do you handle secrets and access across AWS, Azure and Databricks?',
      'What does Cloudflare do in front of the application?',
      'How do you monitor data pipelines and know when data is late or wrong?',
      'How did you reduce cloud or Databricks cost?',
      'Describe a production incident on this platform and how you resolved it.',
    ],
    relatedTopics: [
      'my-terraform',
      'my-aws',
      'my-azure',
      'my-azure-devops',
      'my-monitoring',
      'my-ops',
      'azure-identity',
    ],
  },
  {
    id: 'aimsplus',
    icon: '🏭',
    name: 'AimsPlus',
    tagline: 'Cloud-native warehouse management on Azure microservices',
    summary:
      'A cloud-native, containerized application designed to manage warehouse operations using microservices architecture. It integrates on-premise devices, such as Zebra printers, with cloud infrastructure hosted in Microsoft Azure. The system ensures secure, scalable, and real-time communication between components using VNet peering, private endpoints, and VPN connections.',
    role: 'DevOps / infrastructure engineer for the Azure platform, networking and deployments',
    facts: [
      { label: 'Microservices', value: '1 frontend + 4 backend' },
      { label: 'Runs on', value: 'Azure Container Apps' },
      { label: 'Database', value: 'PostgreSQL Flexible Server + read replicas' },
      { label: 'On-premise link', value: 'IPsec site-to-site VPN' },
    ],
    whatItDoes: [
      '**Modernizes warehouse operations** through microservices: fulfillment, label printing and conveyor systems each run as their own service.',
      'Enables **real-time data flow** between on-premise warehouse devices (such as Zebra printers) and the cloud backend.',
      'Ensures **high availability, security and scalability** using Azure-native networking: VNet, VNet peering, private DNS and private endpoints.',
      'Provides **monitoring and observability** with Grafana, Prometheus and Azure Monitor.',
      'Keeps access to databases and services **private**, through private endpoints and Key Vault integration.',
    ],
    customers: [
      'Warehouse users: end users operating the UI and warehouse devices',
      'DevOps and infra teams: manage Azure infrastructure, networking, the container registry and deployments',
      'Backend developers: build and maintain the microservices handling fulfillment, printing and conveyor systems',
      'Monitoring and admin teams: handle alerts, metrics and logging via Log Analytics, Prometheus and Grafana',
    ],
    offerings: [
      {
        title: 'Microservices',
        detail:
          '1 frontend and 4 backend services deployed as containers in **Azure Container Apps**, each scaled and released on its own.',
      },
      {
        title: 'Device integration',
        detail:
          'On-premise devices such as **Zebra printers** and conveyors talk to the cloud backend in real time over a secure VPN.',
      },
      {
        title: 'Networking',
        detail:
          'Utilizes **VNet, VNet peering, private DNS and IPsec VPN** for secure communication between cloud and warehouse.',
      },
      {
        title: 'Databases',
        detail:
          '**Azure PostgreSQL Flexible Server** with read replicas, accessed securely via private endpoints.',
      },
      {
        title: 'Monitoring',
        detail:
          'Integrated with **Prometheus, Grafana, Azure Log Analytics and Metric Alert Rules**.',
      },
      {
        title: 'Security',
        detail:
          'Uses **Azure Key Vault, Network Security Groups (NSGs) and private endpoints** to restrict access.',
      },
    ],
    howItWorks: [
      {
        title: 'Warehouse user acts',
        detail:
          'A warehouse user works in the frontend UI - for example picking an order or requesting a shipping label.',
      },
      {
        title: 'Frontend calls the backend',
        detail:
          'The frontend container calls the backend microservices in Azure Container Apps (fulfillment, printing, conveyor) inside the VNet.',
      },
      {
        title: 'Services read and write data',
        detail:
          'Services reach **PostgreSQL Flexible Server** through a private endpoint; private DNS resolves the server name to its private IP. Read-heavy queries go to read replicas. Secrets come from **Key Vault**.',
      },
      {
        title: 'Cloud reaches the warehouse',
        detail:
          'Traffic to on-premise devices goes through **VNet peering** to the network with the VPN gateway, then over the **IPsec site-to-site VPN** to the warehouse network.',
      },
      {
        title: 'Device does the work',
        detail:
          'The **Zebra printer** prints the label or the conveyor routes the item, and status flows back to the services in real time.',
      },
      {
        title: 'Everything is watched',
        detail:
          'Prometheus collects service metrics and Grafana shows dashboards; logs go to **Log Analytics**, and **Metric Alert Rules** notify the monitoring team.',
      },
    ],
    diagram: {
      kind: 'flow',
      title: 'From a warehouse click to a printed label',
      caption:
        'Everything private stays private: the database and devices are reached only through private endpoints, peering and the VPN.',
      nodes: [
        { label: 'Warehouse user', detail: 'Frontend UI' },
        {
          label: 'Frontend service',
          detail: 'Container in Azure Container Apps',
          arrowLabel: 'HTTPS',
        },
        {
          label: 'Backend microservices',
          detail: 'Fulfillment, printing, conveyor',
          tone: 'accent',
        },
        {
          label: 'PostgreSQL Flexible Server',
          detail: 'Private endpoint, read replicas, secrets in Key Vault',
          arrowLabel: 'private endpoint',
        },
        {
          label: 'VNet peering',
          detail: 'Hub network with the VPN gateway',
        },
        {
          label: 'IPsec VPN',
          detail: 'Site-to-site tunnel to the warehouse',
          arrowLabel: 'encrypted tunnel',
        },
        {
          label: 'On-premise devices',
          detail: 'Zebra printers and conveyors',
          tone: 'success',
        },
      ],
    },
    platform: [
      {
        title: 'Compute',
        items: [
          'Azure Container Apps running 1 frontend and 4 backend services',
          'Azure Container Registry holding the service images',
        ],
      },
      {
        title: 'Networking',
        items: [
          'VNet with subnets and VNet peering',
          'Private DNS zones so private endpoints resolve by name',
          'IPsec site-to-site VPN to the on-premise warehouse network',
        ],
      },
      {
        title: 'Data',
        items: [
          'Azure PostgreSQL Flexible Server with read replicas',
          'Access only through private endpoints',
        ],
      },
      {
        title: 'Security',
        items: [
          'Azure Key Vault for secrets and connection strings',
          'Network Security Groups (NSGs) restricting traffic between subnets',
          'Private endpoints instead of public access',
        ],
      },
      {
        title: 'Monitoring',
        items: [
          'Prometheus metrics and Grafana dashboards',
          'Azure Monitor with Log Analytics for logs',
          'Metric Alert Rules for alerting',
        ],
      },
    ],
    responsibilities: [
      'Managed the Azure infrastructure, networking, container registry and deployments for the platform.',
      'Built and maintained the network: VNet, subnets, VNet peering, private DNS and the IPsec VPN to the warehouse.',
      'Deployed and released the frontend and backend microservices to Azure Container Apps from the container registry.',
      'Secured access with private endpoints, NSGs and Key Vault integration for secrets.',
      'Ran PostgreSQL Flexible Server with read replicas behind private endpoints.',
      'Set up monitoring and alerting with Prometheus, Grafana, Log Analytics and Metric Alert Rules.',
      'Troubleshot connectivity between cloud services and on-premise devices across peering and VPN.',
    ],
    techStack: [
      'Azure Container Apps',
      'Azure Container Registry',
      'Docker',
      'Azure VNet',
      'VNet peering',
      'Private DNS',
      'Private endpoints',
      'IPsec VPN',
      'PostgreSQL Flexible Server',
      'Azure Key Vault',
      'NSGs',
      'Prometheus',
      'Grafana',
      'Azure Monitor',
      'Log Analytics',
    ],
    pitch: {
      short:
        'AimsPlus is a cloud-native warehouse management system on Azure. It runs 1 frontend and 4 backend microservices in Azure Container Apps, and connects them in real time to on-premise devices like Zebra printers over VNet peering and an IPsec VPN. The database is PostgreSQL Flexible Server with read replicas behind private endpoints, secrets are in Key Vault, and it is monitored with Prometheus, Grafana and Azure Monitor. I worked on the Azure infrastructure, networking and deployments.',
      long: [
        '**The problem:** warehouse operations - fulfillment, label printing, conveyors - needed to move to a modern, scalable platform while still driving physical devices on the warehouse floor.',
        '**The design:** each capability is a microservice in Azure Container Apps. The services sit in a VNet, reach PostgreSQL only through private endpoints, and reach the warehouse devices through VNet peering and a site-to-site IPsec VPN.',
        '**Security:** no public database access - private endpoints with private DNS, NSGs between subnets, and secrets in Key Vault.',
        '**My part:** the Azure infrastructure, networking, container registry, deployments and monitoring. Be ready to draw the path from the UI to a printed label and explain each hop.',
      ],
    },
    likelyQuestions: [
      'Draw the architecture of your warehouse project and explain each component.',
      'Why Azure Container Apps instead of AKS or App Service?',
      'How does a service in Azure reach a Zebra printer in the warehouse?',
      'How does a private endpoint work, and why do you need private DNS with it?',
      'Is VNet peering transitive? How does traffic from a peered VNet reach the VPN?',
      'How do the microservices get database credentials securely?',
      'How do read replicas help, and what are their limits?',
      'The printer stopped printing - how do you troubleshoot from cloud to device?',
      'What do you monitor and alert on in this system?',
    ],
    relatedTopics: [
      'azure-networking',
      'my-networking',
      'azure-compute',
      'azure-identity',
      'azure-monitoring',
      'prometheus',
      'grafana',
    ],
  },
]

export const projectById = new Map(projects.map((project) => [project.id, project]))
