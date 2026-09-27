import type { Question } from '../../types'

const DOMAIN = 'az9-architecture'

/** Original practice questions for this domain. Written for this app. */
export const az900ArchitectureQuestions: Question[] = [
  /* ------------------------------------------------ core architecture */
  {
    id: 'az9q-arc-1',
    domainId: DOMAIN,
    topicId: 'az9-core-architecture',
    kind: 'mcq',
    category: 'concept',
    difficulty: 'beginner',
    points: 1,
    prompt:
      'A company wants its web tier to keep running if a single Azure datacenter building loses power, while staying in one region. What should it use?',
    options: [
      { id: 'a', text: 'A region pair' },
      { id: 'b', text: 'Availability zones' },
      { id: 'c', text: 'A management group' },
      { id: 'd', text: 'A sovereign region' },
    ],
    correct: ['b'],
    explanation:
      'Availability zones are physically separate datacenters within one region, so spreading VMs across them survives a building failure. A region pair involves a second region, a management group is a governance container, and sovereign regions are isolated clouds for legal requirements, not a resiliency feature.',
  },
  {
    id: 'az9q-arc-2',
    domainId: DOMAIN,
    topicId: 'az9-core-architecture',
    kind: 'multi',
    category: 'concept',
    difficulty: 'beginner',
    points: 1,
    prompt: 'Which statements about Azure resource groups are true? (Select all that apply.)',
    options: [
      { id: 'a', text: 'Each resource belongs to exactly one resource group at a time' },
      { id: 'b', text: 'Deleting a resource group deletes the resources it contains' },
      { id: 'c', text: 'Resource groups can be nested inside other resource groups' },
      { id: 'd', text: 'Resources must be in the same region as their resource group' },
      { id: 'e', text: 'A resource can be moved from one resource group to another' },
    ],
    correct: ['a', 'b', 'e'],
    explanation:
      'A resource lives in one resource group, is deleted with it, and can be moved to another group. Resource groups cannot be nested (only management groups nest), and the group location only stores metadata, so resources may be in any region.',
  },
  {
    id: 'az9q-arc-3',
    domainId: DOMAIN,
    topicId: 'az9-core-architecture',
    kind: 'mcq',
    category: 'concept',
    difficulty: 'intermediate',
    points: 2,
    prompt:
      'You must enforce an allowed-regions policy on all existing and future subscriptions that belong to the research division. Where should you assign the policy?',
    options: [
      { id: 'a', text: 'On each resource group in the research subscriptions' },
      { id: 'b', text: 'On each research subscription individually' },
      { id: 'c', text: 'On a management group that contains the research subscriptions' },
      { id: 'd', text: 'On the Microsoft Entra ID tenant properties page' },
    ],
    correct: ['c'],
    explanation:
      'Policies assigned to a management group are inherited by every subscription placed under it, including new ones. Per-subscription or per-resource-group assignments miss anything created later, and tenant properties do not hold Azure Policy assignments.',
  },
  {
    id: 'az9q-arc-4',
    domainId: DOMAIN,
    topicId: 'az9-core-architecture',
    kind: 'mcq',
    category: 'concept',
    difficulty: 'beginner',
    points: 1,
    prompt: 'Which of these is an Azure sovereign region?',
    options: [
      { id: 'a', text: 'Azure Government' },
      { id: 'b', text: 'West Europe' },
      { id: 'c', text: 'Azure Stack Edge' },
      { id: 'd', text: 'Azure Arc' },
    ],
    correct: ['a'],
    explanation:
      'Azure Government (and Azure operated by 21Vianet in China) are sovereign regions, isolated from the global Azure cloud. West Europe is an ordinary public region, Azure Stack Edge is on-premises hardware, and Azure Arc extends Azure management to other environments.',
  },
  {
    id: 'az9q-arc-5',
    domainId: DOMAIN,
    topicId: 'az9-core-architecture',
    kind: 'multi',
    category: 'concept',
    difficulty: 'intermediate',
    points: 2,
    prompt: 'What benefits do Azure region pairs provide? (Select all that apply.)',
    options: [
      {
        id: 'a',
        text: 'Planned platform updates are rolled out to one region of the pair at a time',
      },
      { id: 'b', text: 'Recovery of one region in the pair is prioritised during a broad outage' },
      { id: 'c', text: 'All resources are automatically copied to the paired region' },
      {
        id: 'd',
        text: 'Services such as geo-redundant storage can replicate to the paired region',
      },
    ],
    correct: ['a', 'b', 'd'],
    explanation:
      'Pairs stagger updates, prioritise recovery and are the default target for services like GRS. They do not automatically replicate everything; VMs and most other resources need you to configure disaster recovery yourself.',
  },
  {
    id: 'az9q-arc-6',
    domainId: DOMAIN,
    topicId: 'az9-core-architecture',
    kind: 'command',
    category: 'command',
    difficulty: 'beginner',
    points: 1,
    prompt:
      'Which Azure CLI command lists every region available to your current subscription in table format?',
    acceptedAnswers: [
      'az account list-locations --output table',
      'az account list-locations -o table',
      'az account list-locations --out table',
    ],
    answerHint: 'az account ...',
    explanation:
      '`az account list-locations` returns the regions for the current subscription, and `--output table` (or `-o table`) formats them for reading. `az group list` lists resource groups, not regions.',
  },

  /* ------------------------------------------------ compute */
  {
    id: 'az9q-arc-7',
    domainId: DOMAIN,
    topicId: 'az9-compute-services',
    kind: 'mcq',
    category: 'concept',
    difficulty: 'beginner',
    points: 1,
    prompt:
      'A developer wants to run a small piece of code every time an image is uploaded to blob storage, and pay only while the code runs. Which service fits best?',
    options: [
      { id: 'a', text: 'Azure Virtual Machines' },
      { id: 'b', text: 'Azure Functions' },
      { id: 'c', text: 'Azure Virtual Desktop' },
      { id: 'd', text: 'Azure Kubernetes Service' },
    ],
    correct: ['b'],
    explanation:
      'Azure Functions is event-driven and serverless: a blob trigger starts the code and consumption-style plans bill per execution. A VM or AKS cluster runs and bills continuously, and Azure Virtual Desktop delivers desktops, not event processing.',
  },
  {
    id: 'az9q-arc-8',
    domainId: DOMAIN,
    topicId: 'az9-compute-services',
    kind: 'mcq',
    category: 'concept',
    difficulty: 'intermediate',
    points: 2,
    prompt:
      'You need a group of identical VMs that automatically adds instances when CPU usage is high and removes them when it drops. What should you deploy?',
    options: [
      { id: 'a', text: 'An availability set' },
      { id: 'b', text: 'A virtual machine scale set' },
      { id: 'c', text: 'A resource group with several VMs' },
      { id: 'd', text: 'Azure Container Instances' },
    ],
    correct: ['b'],
    explanation:
      'Scale sets manage identical VMs as one resource and support autoscale rules. An availability set improves resilience of a fixed set of VMs but does not scale them, a resource group is only a container, and ACI runs containers rather than VMs.',
  },
  {
    id: 'az9q-arc-9',
    domainId: DOMAIN,
    topicId: 'az9-compute-services',
    kind: 'multi',
    category: 'concept',
    difficulty: 'intermediate',
    points: 2,
    prompt:
      'Which statements correctly compare containers with virtual machines? (Select all that apply.)',
    options: [
      { id: 'a', text: 'Containers share the host operating system kernel' },
      { id: 'b', text: 'Containers usually start faster than VMs' },
      { id: 'c', text: 'Each container includes its own full guest operating system' },
      { id: 'd', text: 'More containers than VMs can typically run on the same hardware' },
    ],
    correct: ['a', 'b', 'd'],
    explanation:
      'Containers package an app and its dependencies but share the host kernel, so they are lighter, start quickly and pack more densely than VMs. A full guest OS per instance is what a VM has, not a container.',
  },
  {
    id: 'az9q-arc-10',
    domainId: DOMAIN,
    topicId: 'az9-compute-services',
    kind: 'mcq',
    category: 'concept',
    difficulty: 'beginner',
    points: 1,
    prompt:
      'A company wants staff to reach a Windows desktop and line-of-business apps from any device, with several users sharing each session host. Which service should it use?',
    options: [
      { id: 'a', text: 'Azure App Service' },
      { id: 'b', text: 'Azure Virtual Desktop' },
      { id: 'c', text: 'Azure Bastion' },
      { id: 'd', text: 'Azure Functions' },
    ],
    correct: ['b'],
    explanation:
      'Azure Virtual Desktop delivers Windows desktops and apps, and Windows Enterprise multi-session lets many users share a VM. App Service hosts web apps, Bastion provides secure admin access to VMs rather than end-user desktops, and Functions runs event-driven code.',
  },
  {
    id: 'az9q-arc-11',
    domainId: DOMAIN,
    topicId: 'az9-compute-services',
    kind: 'mcq',
    category: 'concept',
    difficulty: 'intermediate',
    points: 2,
    prompt: 'What does placing VMs in an availability set protect against?',
    options: [
      { id: 'a', text: 'The failure of an entire Azure region' },
      { id: 'b', text: 'Hardware failures and planned maintenance within one datacenter' },
      { id: 'c', text: 'Accidental deletion of the VMs by an administrator' },
      { id: 'd', text: 'The failure of a whole datacenter building in a region' },
    ],
    correct: ['b'],
    explanation:
      'Availability sets spread VMs across fault domains (separate power and network) and update domains (staggered maintenance) inside a datacenter. A datacenter failure needs availability zones, a region failure needs a second region, and deletion is prevented by resource locks.',
  },
  {
    id: 'az9q-arc-12',
    domainId: DOMAIN,
    topicId: 'az9-compute-services',
    kind: 'multi',
    category: 'concept',
    difficulty: 'advanced',
    points: 2,
    prompt:
      'A team wants to host containerised microservices without managing a Kubernetes cluster, with automatic scaling that can go to zero. Which options are unsuitable for that goal? (Select all that apply.)',
    options: [
      { id: 'a', text: 'Azure Container Apps' },
      { id: 'b', text: 'Self-managed Kubernetes on Azure VMs' },
      { id: 'c', text: 'Virtual machines with Docker installed by hand' },
      { id: 'd', text: 'Azure Functions for event-driven parts of the system' },
    ],
    correct: ['b', 'c'],
    explanation:
      'Self-managed Kubernetes and hand-built Docker VMs both mean managing servers and neither scales to zero on its own, so they are unsuitable. Container Apps is serverless containers with scale to zero, and Functions also scales to zero for event-driven work.',
  },

  /* ------------------------------------------------ networking */
  {
    id: 'az9q-arc-13',
    domainId: DOMAIN,
    topicId: 'az9-networking-services',
    kind: 'mcq',
    category: 'concept',
    difficulty: 'beginner',
    points: 1,
    prompt:
      'Which service provides a private connection from an on-premises network to Azure that does not travel over the public internet?',
    options: [
      { id: 'a', text: 'Site-to-site VPN Gateway' },
      { id: 'b', text: 'Azure ExpressRoute' },
      { id: 'c', text: 'Azure DNS' },
      { id: 'd', text: 'Point-to-site VPN' },
    ],
    correct: ['b'],
    explanation:
      'ExpressRoute uses a dedicated circuit through a connectivity provider rather than the internet. Both VPN options encrypt traffic but send it across the public internet, and Azure DNS is name resolution, not connectivity.',
  },
  {
    id: 'az9q-arc-14',
    domainId: DOMAIN,
    topicId: 'az9-networking-services',
    kind: 'mcq',
    category: 'concept',
    difficulty: 'intermediate',
    points: 2,
    prompt:
      'VNet-Hub is peered with VNet-A and with VNet-B. No other configuration exists. Can a VM in VNet-A reach a VM in VNet-B by private IP?',
    options: [
      { id: 'a', text: 'Yes, peering is transitive through the hub' },
      { id: 'b', text: 'No, peering is not transitive' },
      { id: 'c', text: 'Yes, but only if all three VNets are in the same region' },
      { id: 'd', text: 'Only after an ExpressRoute circuit is added' },
    ],
    correct: ['b'],
    explanation:
      'Peering is not transitive, so A and B need their own peering or a hub routing device such as Azure Firewall or a gateway. Region does not change transitivity, and ExpressRoute is for on-premises connectivity.',
  },
  {
    id: 'az9q-arc-15',
    domainId: DOMAIN,
    topicId: 'az9-networking-services',
    kind: 'multi',
    category: 'concept',
    difficulty: 'intermediate',
    points: 2,
    prompt: 'Which connections can Azure VPN Gateway provide? (Select all that apply.)',
    options: [
      { id: 'a', text: 'Site-to-site from an on-premises VPN device' },
      { id: 'b', text: 'Point-to-site from individual client computers' },
      { id: 'c', text: 'VNet-to-VNet over an encrypted tunnel' },
      {
        id: 'd',
        text: 'A private circuit through a connectivity provider without internet transit',
      },
    ],
    correct: ['a', 'b', 'c'],
    explanation:
      'VPN Gateway supports site-to-site, point-to-site and VNet-to-VNet connections, all encrypted with IPsec/IKE or similar. A private provider circuit without internet transit describes ExpressRoute.',
  },
  {
    id: 'az9q-arc-16',
    domainId: DOMAIN,
    topicId: 'az9-networking-services',
    kind: 'mcq',
    category: 'concept',
    difficulty: 'intermediate',
    points: 2,
    prompt:
      'An application in a VNet must reach a storage account using a private IP address from its own subnet, so that public network access to the account can be disabled. What should you create?',
    options: [
      { id: 'a', text: 'A public IP address on the storage account' },
      { id: 'b', text: 'A private endpoint for the storage account' },
      { id: 'c', text: 'A VPN Gateway in the VNet' },
      { id: 'd', text: 'A public DNS zone for the storage account name' },
    ],
    correct: ['b'],
    explanation:
      'A private endpoint gives the storage account a private IP inside your subnet via Private Link. A public IP is the opposite of the goal, a VPN Gateway connects networks rather than exposing a service privately, and a public DNS zone does not change the network path.',
  },
  {
    id: 'az9q-arc-17',
    domainId: DOMAIN,
    topicId: 'az9-networking-services',
    kind: 'mcq',
    category: 'concept',
    difficulty: 'beginner',
    points: 1,
    prompt: 'What does Azure DNS let you do?',
    options: [
      { id: 'a', text: 'Host DNS zones and manage records with Azure tools and RBAC' },
      { id: 'b', text: 'Register and buy any new domain name directly in Azure DNS' },
      { id: 'c', text: 'Encrypt traffic between two virtual networks' },
      { id: 'd', text: 'Balance HTTP traffic across regions' },
    ],
    correct: ['a'],
    explanation:
      'Azure DNS hosts public and private DNS zones so records are managed like other Azure resources. It does not sell domain names (you buy them from a registrar), it does not encrypt VNet traffic, and global HTTP balancing is the job of Front Door or Traffic Manager.',
  },
  {
    id: 'az9q-arc-18',
    domainId: DOMAIN,
    topicId: 'az9-networking-services',
    kind: 'multi',
    category: 'concept',
    difficulty: 'advanced',
    points: 2,
    prompt: 'Which statements about Azure virtual networks are true? (Select all that apply.)',
    options: [
      { id: 'a', text: 'A VNet is scoped to a single region' },
      {
        id: 'b',
        text: 'Resources in different subnets of the same VNet can communicate by default',
      },
      { id: 'c', text: 'Two VNets with overlapping address spaces can be peered' },
      {
        id: 'd',
        text: 'Network security groups can filter traffic to subnets and network interfaces',
      },
    ],
    correct: ['a', 'b', 'd'],
    explanation:
      'A VNet lives in one region, its subnets can talk to each other by default, and NSGs filter traffic at subnet or NIC level. Peering requires non-overlapping address spaces, so overlapping VNets cannot be peered.',
  },

  /* ------------------------------------------------ storage */
  {
    id: 'az9q-arc-19',
    domainId: DOMAIN,
    topicId: 'az9-storage-services',
    kind: 'mcq',
    category: 'concept',
    difficulty: 'beginner',
    points: 1,
    prompt:
      'Which storage redundancy option keeps three copies of data across three availability zones in the primary region, with no copy in a second region?',
    options: [
      { id: 'a', text: 'LRS' },
      { id: 'b', text: 'ZRS' },
      { id: 'c', text: 'GRS' },
      { id: 'd', text: 'RA-GZRS' },
    ],
    correct: ['b'],
    explanation:
      'Zone-redundant storage (ZRS) replicates synchronously across three zones in one region. LRS keeps its three copies in a single datacenter, while GRS and RA-GZRS also copy data to a secondary region.',
  },
  {
    id: 'az9q-arc-20',
    domainId: DOMAIN,
    topicId: 'az9-storage-services',
    kind: 'mcq',
    category: 'concept',
    difficulty: 'intermediate',
    points: 2,
    prompt:
      'An application must be able to read data from the secondary region at any time, even when the primary region is healthy. Which option supports this?',
    options: [
      { id: 'a', text: 'GRS' },
      { id: 'b', text: 'ZRS' },
      { id: 'c', text: 'RA-GRS' },
      { id: 'd', text: 'LRS' },
    ],
    correct: ['c'],
    explanation:
      'Read-access geo-redundant storage (RA-GRS) exposes a readable secondary endpoint. Plain GRS replicates to the secondary but only allows reads after a failover, and ZRS and LRS have no secondary region at all.',
  },
  {
    id: 'az9q-arc-21',
    domainId: DOMAIN,
    topicId: 'az9-storage-services',
    kind: 'multi',
    category: 'concept',
    difficulty: 'intermediate',
    points: 2,
    prompt: 'Which statements about the Archive access tier are true? (Select all that apply.)',
    options: [
      { id: 'a', text: 'It has the lowest storage cost of the blob tiers' },
      { id: 'b', text: 'Archived blobs must be rehydrated before they can be read' },
      { id: 'c', text: 'It can be set as the default access tier of a storage account' },
      { id: 'd', text: 'Rehydration can take hours' },
      { id: 'e', text: 'It offers the fastest read latency of all tiers' },
    ],
    correct: ['a', 'b', 'd'],
    explanation:
      'Archive is the cheapest place to keep data but is offline: blobs must be rehydrated, which can take hours. It is set per blob, not as an account default, and it is the slowest tier to read, not the fastest.',
  },
  {
    id: 'az9q-arc-22',
    domainId: DOMAIN,
    topicId: 'az9-storage-services',
    kind: 'mcq',
    category: 'concept',
    difficulty: 'intermediate',
    points: 2,
    prompt:
      'A company must move about 400 TB of archived video from an office with a slow internet connection into Azure within a month. Which option is most appropriate?',
    options: [
      { id: 'a', text: 'AzCopy over the existing internet link' },
      { id: 'b', text: 'Azure Data Box' },
      { id: 'c', text: 'Azure File Sync' },
      { id: 'd', text: 'Azure Storage Explorer' },
    ],
    correct: ['b'],
    explanation:
      'Data Box ships physical devices that you fill locally and return, avoiding the slow network. AzCopy and Storage Explorer both depend on the network link, and File Sync keeps file servers in sync with Azure Files rather than performing a bulk offline transfer.',
  },
  {
    id: 'az9q-arc-23',
    domainId: DOMAIN,
    topicId: 'az9-storage-services',
    kind: 'mcq',
    category: 'concept',
    difficulty: 'beginner',
    points: 1,
    prompt:
      'Which Azure Storage service is designed for passing small messages between components of an application?',
    options: [
      { id: 'a', text: 'Table storage' },
      { id: 'b', text: 'Queue storage' },
      { id: 'c', text: 'Azure Files' },
      { id: 'd', text: 'Managed disks' },
    ],
    correct: ['b'],
    explanation:
      'Queue storage holds messages that one component writes and another processes later. Table storage is NoSQL key-attribute data, Azure Files provides file shares, and managed disks are block storage for VMs.',
  },
  {
    id: 'az9q-arc-24',
    domainId: DOMAIN,
    topicId: 'az9-storage-services',
    kind: 'task',
    category: 'lab',
    difficulty: 'intermediate',
    points: 2,
    prompt:
      'Create a resource group named rg-az900-exam in West Europe and, in it, a general-purpose v2 storage account that keeps copies across availability zones, defaults to the Hot tier, requires TLS 1.2 and blocks anonymous blob access.',
    context: 'Azure Cloud Shell (Bash) in a subscription where you can create resources.',
    checkpoints: [
      { id: 'c1', text: 'Resource group rg-az900-exam exists in westeurope' },
      { id: 'c2', text: 'The storage account kind is StorageV2 and the SKU is Standard_ZRS' },
      { id: 'c3', text: 'The default access tier is Hot' },
      { id: 'c4', text: 'minimumTlsVersion is TLS1_2 and allowBlobPublicAccess is false' },
    ],
    solution: [
      {
        title: 'Create and verify',
        language: 'bash',
        code: `az group create --name rg-az900-exam --location westeurope

az storage account create \\
  --name <uniquename> \\
  --resource-group rg-az900-exam \\
  --location westeurope \\
  --kind StorageV2 \\
  --sku Standard_ZRS \\
  --access-tier Hot \\
  --min-tls-version TLS1_2 \\
  --allow-blob-public-access false

az storage account show -n <uniquename> -g rg-az900-exam \\
  --query "{kind:kind, sku:sku.name, tier:accessTier, tls:minimumTlsVersion, public:allowBlobPublicAccess}"

# clean up afterwards
az group delete -n rg-az900-exam --yes --no-wait`,
        placeholders: ['<uniquename>'],
      },
    ],
    explanation:
      'ZRS is the redundancy option that spreads copies across availability zones in one region. The name must be globally unique, 3 to 24 lowercase letters and numbers. LRS would not meet the zone requirement, and GRS adds a secondary region that was not asked for.',
  },

  /* ------------------------------------------------ identity and security */
  {
    id: 'az9q-arc-25',
    domainId: DOMAIN,
    topicId: 'az9-identity-security',
    kind: 'mcq',
    category: 'concept',
    difficulty: 'intermediate',
    points: 2,
    prompt:
      'You want to require MFA only when users sign in to the Azure portal from outside the corporate network. What should you configure?',
    options: [
      { id: 'a', text: 'An Azure RBAC role assignment' },
      { id: 'b', text: 'A Microsoft Entra Conditional Access policy' },
      { id: 'c', text: 'A resource lock on the subscription' },
      { id: 'd', text: 'A network security group rule' },
    ],
    correct: ['b'],
    explanation:
      'Conditional Access evaluates signals such as location and app at sign-in and can require MFA. RBAC grants permissions after sign-in, resource locks prevent deletion or changes, and NSGs filter network traffic rather than sign-ins.',
  },
  {
    id: 'az9q-arc-26',
    domainId: DOMAIN,
    topicId: 'az9-identity-security',
    kind: 'mcq',
    category: 'concept',
    difficulty: 'advanced',
    points: 2,
    prompt:
      'A legacy application needs domain join, Group Policy and Kerberos authentication in Azure, and the team does not want to deploy or patch domain controllers. Which service should they use?',
    options: [
      { id: 'a', text: 'Microsoft Entra ID alone' },
      { id: 'b', text: 'Microsoft Entra Domain Services' },
      { id: 'c', text: 'Windows Server VMs promoted to domain controllers' },
      { id: 'd', text: 'Microsoft Entra External ID' },
    ],
    correct: ['b'],
    explanation:
      'Entra Domain Services provides a managed domain with domain join, Group Policy, LDAP and Kerberos/NTLM without you running domain controllers. Entra ID alone does not offer those legacy protocols, self-built domain controllers are exactly what the team wants to avoid, and External ID is for partner and customer sign-in.',
  },
  {
    id: 'az9q-arc-27',
    domainId: DOMAIN,
    topicId: 'az9-identity-security',
    kind: 'multi',
    category: 'concept',
    difficulty: 'intermediate',
    points: 2,
    prompt: 'Which are principles of the Zero Trust model? (Select all that apply.)',
    options: [
      { id: 'a', text: 'Verify explicitly' },
      { id: 'b', text: 'Use least-privilege access' },
      { id: 'c', text: 'Assume breach' },
      { id: 'd', text: 'Trust all traffic from the corporate network' },
    ],
    correct: ['a', 'b', 'c'],
    explanation:
      'Zero Trust is built on verify explicitly, use least-privilege access and assume breach. Trusting the corporate network by default is the old perimeter model that Zero Trust replaces.',
  },
  {
    id: 'az9q-arc-28',
    domainId: DOMAIN,
    topicId: 'az9-identity-security',
    kind: 'mcq',
    category: 'concept',
    difficulty: 'intermediate',
    points: 2,
    prompt:
      'A user needs to create and manage resources in one resource group but must not be able to grant access to anyone else. Which built-in role at that resource group is the best fit?',
    options: [
      { id: 'a', text: 'Owner' },
      { id: 'b', text: 'Contributor' },
      { id: 'c', text: 'Reader' },
      { id: 'd', text: 'User Access Administrator' },
    ],
    correct: ['b'],
    explanation:
      'Contributor can manage all resources but cannot assign roles. Owner can also grant access, Reader can only view, and User Access Administrator manages access without managing the resources themselves.',
  },
  {
    id: 'az9q-arc-29',
    domainId: DOMAIN,
    topicId: 'az9-identity-security',
    kind: 'multi',
    category: 'concept',
    difficulty: 'advanced',
    points: 2,
    prompt:
      'Which capabilities does Microsoft Defender for Cloud provide? (Select all that apply.)',
    options: [
      { id: 'a', text: 'A secure score with security recommendations' },
      { id: 'b', text: 'Threat protection for workloads such as VMs, storage and databases' },
      { id: 'c', text: 'Protection for resources in AWS and Google Cloud through connectors' },
      { id: 'd', text: 'Issuing sign-in tokens to users and applications' },
    ],
    correct: ['a', 'b', 'c'],
    explanation:
      'Defender for Cloud combines security posture management (secure score, recommendations) with workload protection and supports hybrid and multicloud resources. Issuing sign-in tokens is the job of Microsoft Entra ID.',
  },
  {
    id: 'az9q-arc-30',
    domainId: DOMAIN,
    topicId: 'az9-identity-security',
    kind: 'command',
    category: 'command',
    difficulty: 'intermediate',
    points: 2,
    prompt:
      'Which Azure CLI command lists all role assignments for the user alice@contoso.com across every scope you can see?',
    acceptedAnswers: [
      'az role assignment list --assignee alice@contoso.com --all',
      'az role assignment list --all --assignee alice@contoso.com',
      'az role assignment list --assignee alice@contoso.com --all --output table',
      'az role assignment list --assignee alice@contoso.com --all -o table',
      'az role assignment list --assignee alice@contoso.com --all --include-inherited',
    ],
    answerHint: 'az role assignment ... --all',
    explanation:
      '`az role assignment list --assignee <user> --all` searches every scope rather than only the current subscription default. Without `--all`, the results are limited to the current subscription, so assignments made at a management group or in other subscriptions can be missed.',
  },
  {
    id: 'az9q-arc-31',
    domainId: DOMAIN,
    topicId: 'az9-identity-security',
    kind: 'mcq',
    category: 'concept',
    difficulty: 'beginner',
    points: 1,
    prompt: 'Which of these is a passwordless sign-in method supported by Microsoft Entra ID?',
    options: [
      { id: 'a', text: 'A FIDO2 security key or passkey' },
      { id: 'b', text: 'A longer, more complex password' },
      { id: 'c', text: 'Security questions' },
      { id: 'd', text: 'An account key from a storage account' },
    ],
    correct: ['a'],
    explanation:
      'FIDO2 security keys and passkeys (along with Windows Hello for Business and the Microsoft Authenticator app) are passwordless methods. A complex password is still a password, security questions are a weak knowledge factor, and storage account keys are not user sign-in credentials.',
  },
]
