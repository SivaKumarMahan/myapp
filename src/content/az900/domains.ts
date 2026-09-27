import type { Domain } from '../types'

/**
 * The three functional groups of the AZ-900 study guide.
 *
 * Microsoft publishes each group's weight as a RANGE ("25–30%"), not a single
 * figure, so every domain carries `examWeight: null` and shows the published
 * range as its label. The single numbers the mock exam needs live in the
 * blueprint and are labelled as the app's own.
 */
export const az900Domains: Domain[] = [
  {
    id: 'az9-cloud',
    title: 'Describe cloud concepts',
    shortTitle: 'Cloud concepts',
    examWeight: null,
    weightLabel: '25–30%',
    description:
      'What cloud computing is, the shared responsibility model, public, private and hybrid clouds, the consumption-based model, the benefits of the cloud, and IaaS, PaaS and SaaS.',
    officialCompetencies: [
      'Describe cloud computing and the shared responsibility model',
      'Define cloud models, including public, private and hybrid',
      'Describe the consumption-based model and compare cloud pricing models',
      'Describe the benefits of high availability, scalability, reliability and predictability',
      'Describe the benefits of security, governance and manageability in the cloud',
      'Describe infrastructure as a service, platform as a service and software as a service',
    ],
    accent: 'blue',
    order: 1,
  },
  {
    id: 'az9-architecture',
    title: 'Describe Azure architecture and services',
    shortTitle: 'Architecture & services',
    examWeight: null,
    weightLabel: '35–40%',
    description:
      'Regions, availability zones, subscriptions and management groups; compute, networking and storage services; identity, access and security.',
    officialCompetencies: [
      'Describe Azure regions, region pairs, sovereign regions and availability zones',
      'Describe resources, resource groups, subscriptions and management groups',
      'Compare compute types, including containers, virtual machines and functions',
      'Describe virtual networking, VPN Gateway, ExpressRoute, DNS and public and private endpoints',
      'Compare storage services, redundancy options, access tiers and migration options',
      'Describe Microsoft Entra ID, authentication methods, external identities and Conditional Access',
      'Describe Azure RBAC, Zero Trust, defense-in-depth and Microsoft Defender for Cloud',
    ],
    accent: 'violet',
    order: 2,
  },
  {
    id: 'az9-management',
    title: 'Describe Azure management and governance',
    shortTitle: 'Management & governance',
    examWeight: null,
    weightLabel: '30–35%',
    description:
      'Cost management, governance and compliance tools, tools for managing and deploying resources, and monitoring tools.',
    officialCompetencies: [
      'Describe factors that affect costs, the pricing calculator and Cost Management',
      'Describe the purpose of tags',
      'Describe Microsoft Purview, Azure Policy, resource locks and the Service Trust Portal',
      'Describe the Azure portal, Cloud Shell, Azure CLI and Azure PowerShell',
      'Describe Azure Arc, infrastructure as code and Azure Resource Manager templates',
      'Describe Azure Advisor, Azure Service Health and Azure Monitor, including Log Analytics, alerts and Application Insights',
    ],
    accent: 'emerald',
    order: 3,
  },
]
