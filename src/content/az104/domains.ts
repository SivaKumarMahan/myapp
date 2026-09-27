import type { Domain } from '../types'

/**
 * The five functional groups of the AZ-104 study guide.
 *
 * Microsoft publishes weights as ranges, so each domain shows its published
 * range as a label and `examWeight` stays null. See the blueprint note.
 */
export const az104Domains: Domain[] = [
  {
    id: 'az1-identity',
    title: 'Manage Azure identities and governance',
    shortTitle: 'Identity & governance',
    examWeight: null,
    weightLabel: '20–25%',
    description:
      'Microsoft Entra users and groups, licences, external users and self-service password reset; Azure RBAC; Azure Policy, locks, tags, subscriptions, management groups and cost controls.',
    officialCompetencies: [
      'Create users and groups, manage user and group properties and licenses in Microsoft Entra ID',
      'Manage external users and configure self-service password reset (SSPR)',
      'Manage built-in Azure roles, assign roles at different scopes and interpret access assignments',
      'Implement and manage Azure Policy',
      'Configure resource locks and apply and manage tags on resources',
      'Manage resource groups, subscriptions and management groups',
      'Manage costs by using alerts, budgets and Azure Advisor recommendations',
    ],
    accent: 'blue',
    order: 1,
  },
  {
    id: 'az1-storage',
    title: 'Implement and manage storage',
    shortTitle: 'Storage',
    examWeight: null,
    weightLabel: '15–20%',
    description:
      'Storage account security, SAS tokens, access keys and identity-based access; storage account redundancy and encryption; Blob Storage and Azure Files.',
    officialCompetencies: [
      'Configure Azure Storage firewalls and virtual networks',
      'Create and use shared access signature (SAS) tokens and stored access policies',
      'Manage access keys and configure identity-based access for Azure Files',
      'Create and configure storage accounts, redundancy and object replication',
      'Configure storage account encryption',
      'Manage data by using Azure Storage Explorer and AzCopy',
      'Create and configure file shares and containers in Azure Blob Storage',
      'Configure storage tiers, snapshots, soft delete, versioning and lifecycle management',
    ],
    accent: 'amber',
    order: 2,
  },
  {
    id: 'az1-compute',
    title: 'Deploy and manage Azure compute resources',
    shortTitle: 'Compute',
    examWeight: null,
    weightLabel: '20–25%',
    description:
      'ARM templates and Bicep; virtual machines and scale sets; Azure Container Registry, Container Instances and Container Apps; App Service.',
    officialCompetencies: [
      'Interpret, modify and deploy Azure Resource Manager templates and Bicep files',
      'Export a deployment as an ARM template or convert an ARM template to Bicep',
      'Create a virtual machine, configure disk encryption and move a VM between groups, subscriptions or regions',
      'Manage VM sizes and disks, and deploy to availability zones and availability sets',
      'Deploy and configure Azure Virtual Machine Scale Sets',
      'Create and manage Azure Container Registry, Container Instances and Container Apps',
      'Provision an App Service plan, configure scaling, certificates, custom domains, backup, networking and deployment slots',
    ],
    accent: 'violet',
    order: 3,
  },
  {
    id: 'az1-networking',
    title: 'Implement and manage virtual networking',
    shortTitle: 'Networking',
    examWeight: null,
    weightLabel: '15–20%',
    description:
      'Virtual networks, subnets and peering; public IPs and user-defined routes; NSGs, ASGs and Azure Bastion; service and private endpoints; Azure DNS and load balancing.',
    officialCompetencies: [
      'Create and configure virtual networks, subnets and virtual network peering',
      'Configure public IP addresses and user-defined network routes',
      'Troubleshoot network connectivity',
      'Create and configure network security groups and application security groups',
      'Evaluate effective security rules and implement Azure Bastion',
      'Configure service endpoints and private endpoints for Azure PaaS',
      'Configure Azure DNS and an internal or public load balancer',
    ],
    accent: 'cyan',
    order: 4,
  },
  {
    id: 'az1-monitor',
    title: 'Monitor and maintain Azure resources',
    shortTitle: 'Monitor & maintain',
    examWeight: null,
    weightLabel: '10–15%',
    description:
      'Azure Monitor metrics, logs, alerts and insights; Network Watcher; Azure Backup and Azure Site Recovery.',
    officialCompetencies: [
      'Interpret metrics, configure log settings and query and analyse logs in Azure Monitor',
      'Set up alert rules, action groups and alert processing rules',
      'Configure and interpret monitoring of VMs, storage accounts and networks by using Azure Monitor Insights',
      'Use Azure Network Watcher and Connection Monitor',
      'Create a Recovery Services vault and an Azure Backup vault, and create and configure backup policies',
      'Perform backup and restore operations',
      'Configure Azure Site Recovery and perform a failover to a secondary region',
      'Configure and interpret reports and alerts for backups',
    ],
    accent: 'rose',
    order: 5,
  },
]
