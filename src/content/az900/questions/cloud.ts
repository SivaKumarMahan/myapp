import type { Question } from '../../types'

/** Original practice questions for this domain. Written for this app. */
export const az900CloudQuestions: Question[] = [
  {
    id: 'az9q-cld-1',
    domainId: 'az9-cloud',
    topicId: 'az9-cloud-computing',
    kind: 'mcq',
    category: 'concept',
    difficulty: 'beginner',
    points: 1,
    prompt: 'Which statement best describes cloud computing?',
    options: [
      { id: 'a', text: 'Buying servers and installing them in a colocation facility' },
      { id: 'b', text: 'The delivery of computing services over the internet on demand' },
      { id: 'c', text: 'Running virtual machines on your own hypervisor hosts' },
      { id: 'd', text: 'Outsourcing your IT helpdesk to a managed service provider' },
    ],
    correct: ['b'],
    explanation:
      'Cloud computing is the on-demand delivery of compute, storage, networking and software over the internet from a provider. Buying and racking servers is traditional hosting, running your own hypervisor is on-premises virtualisation, and an outsourced helpdesk is a service contract, not cloud.',
  },
  {
    id: 'az9q-cld-2',
    domainId: 'az9-cloud',
    topicId: 'az9-cloud-computing',
    kind: 'mcq',
    category: 'concept',
    difficulty: 'beginner',
    points: 1,
    prompt:
      'Under the shared responsibility model, who is always responsible for the physical security of the datacenter?',
    options: [
      { id: 'a', text: 'The customer' },
      { id: 'b', text: 'Microsoft' },
      { id: 'c', text: 'It depends on whether the service is IaaS, PaaS or SaaS' },
      { id: 'd', text: 'An independent auditor appointed by the customer' },
    ],
    correct: ['b'],
    explanation:
      'Physical datacenter, physical network and physical hosts are always the provider responsibility, for every service type. The service type only moves the middle layers (OS, network controls, applications). Auditors verify controls but do not operate them.',
  },
  {
    id: 'az9q-cld-3',
    domainId: 'az9-cloud',
    topicId: 'az9-cloud-computing',
    kind: 'multi',
    category: 'concept',
    difficulty: 'intermediate',
    points: 2,
    prompt:
      'Which responsibilities always remain with the customer, regardless of service type? (Select all that apply.)',
    options: [
      { id: 'a', text: 'Information and data' },
      { id: 'b', text: 'Accounts and identities' },
      { id: 'c', text: 'Devices such as mobile phones and PCs' },
      { id: 'd', text: 'Operating system patching' },
      { id: 'e', text: 'Physical network' },
    ],
    correct: ['a', 'b', 'c'],
    explanation:
      'Data, accounts and identities, and devices are always the customer. Operating system patching moves to Microsoft for PaaS and SaaS, so it is not always the customer. The physical network is always Microsoft.',
  },
  {
    id: 'az9q-cld-4',
    domainId: 'az9-cloud',
    topicId: 'az9-cloud-computing',
    kind: 'mcq',
    category: 'concept',
    difficulty: 'intermediate',
    points: 2,
    prompt:
      'A company stores confidential files in Azure Blob Storage. A developer makes a container publicly readable and the files leak. Under the shared responsibility model, whose failure is this?',
    options: [
      { id: 'a', text: 'Microsoft, because Azure Storage should block public access' },
      {
        id: 'b',
        text: 'The customer, because configuring access to data is always their responsibility',
      },
      { id: 'c', text: 'Shared equally, because storage is a PaaS service' },
      { id: 'd', text: 'Nobody, because public containers are a supported feature' },
    ],
    correct: ['b'],
    explanation:
      'Information and data - including who can access it - always belongs to the customer. Microsoft provides the controls, but choosing to enable anonymous access was a customer configuration. Being a supported feature does not remove responsibility for using it.',
  },
  {
    id: 'az9q-cld-5',
    domainId: 'az9-cloud',
    topicId: 'az9-cloud-models',
    kind: 'mcq',
    category: 'concept',
    difficulty: 'beginner',
    points: 1,
    prompt:
      'An organisation must keep its customer database in its own datacenter for regulatory reasons but wants to run its public website in Azure. Which cloud model is this?',
    options: [
      { id: 'a', text: 'Public cloud' },
      { id: 'b', text: 'Private cloud' },
      { id: 'c', text: 'Hybrid cloud' },
      { id: 'd', text: 'Community cloud' },
    ],
    correct: ['c'],
    explanation:
      'Combining on-premises (private) infrastructure with a public cloud such as Azure is hybrid. Public cloud alone would move the database too, private cloud alone would keep the website on premises, and community cloud is not one of the models AZ-900 tests.',
  },
  {
    id: 'az9q-cld-6',
    domainId: 'az9-cloud',
    topicId: 'az9-cloud-models',
    kind: 'mcq',
    category: 'concept',
    difficulty: 'beginner',
    points: 1,
    prompt:
      'Which cloud model gives a single organisation exclusive use of the infrastructure and the most control?',
    options: [
      { id: 'a', text: 'Private cloud' },
      { id: 'b', text: 'Public cloud' },
      { id: 'c', text: 'Multi-cloud' },
      { id: 'd', text: 'Hybrid cloud' },
    ],
    correct: ['a'],
    explanation:
      'A private cloud is dedicated to one organisation, which controls the hardware. Public cloud is shared by many customers, multi-cloud uses several public providers, and hybrid combines private with public.',
  },
  {
    id: 'az9q-cld-7',
    domainId: 'az9-cloud',
    topicId: 'az9-cloud-models',
    kind: 'mcq',
    category: 'concept',
    difficulty: 'beginner',
    points: 1,
    prompt:
      'Paying a monthly bill for the virtual machines you ran that month is an example of what?',
    options: [
      { id: 'a', text: 'Capital expenditure (CapEx)' },
      { id: 'b', text: 'Operational expenditure (OpEx)' },
      { id: 'c', text: 'Depreciation' },
      { id: 'd', text: 'A fixed-cost licence' },
    ],
    correct: ['b'],
    explanation:
      'Ongoing payments for services consumed in the period are OpEx. CapEx is an up-front purchase of physical assets that is then depreciated over years. A pay-as-you-go bill varies with usage, so it is not a fixed licence.',
  },
  {
    id: 'az9q-cld-8',
    domainId: 'az9-cloud',
    topicId: 'az9-cloud-models',
    kind: 'multi',
    category: 'concept',
    difficulty: 'intermediate',
    points: 2,
    prompt: 'Which are characteristics of the consumption-based model? (Select all that apply.)',
    options: [
      { id: 'a', text: 'No up-front infrastructure cost' },
      { id: 'b', text: 'You pay for additional resources only when you need them' },
      { id: 'c', text: 'You stop paying for resources once you delete them' },
      { id: 'd', text: 'You must commit to a three-year contract for every service' },
      { id: 'e', text: 'You buy spare capacity in advance for peak demand' },
    ],
    correct: ['a', 'b', 'c'],
    explanation:
      'Consumption-based pricing means no up-front cost, paying for what you use, and no charge once a resource is gone. Three-year commitments are optional reservations, not a requirement. Buying capacity in advance for peaks is the on-premises model the cloud avoids.',
  },
  {
    id: 'az9q-cld-9',
    domainId: 'az9-cloud',
    topicId: 'az9-cloud-models',
    kind: 'mcq',
    category: 'concept',
    difficulty: 'intermediate',
    points: 2,
    prompt:
      'A nightly batch job can be interrupted and restarted without harm. Which VM pricing option minimises its compute cost?',
    options: [
      { id: 'a', text: 'Pay-as-you-go' },
      { id: 'b', text: 'A three-year reservation' },
      { id: 'c', text: 'Azure Spot Virtual Machines' },
      { id: 'd', text: 'A dedicated host' },
    ],
    correct: ['c'],
    explanation:
      'Spot VMs use spare capacity at a deep discount and can be evicted, which suits interruptible work. Pay-as-you-go is list price, a reservation suits workloads running all year, and a dedicated host costs more because you rent a whole physical server.',
  },
  {
    id: 'az9q-cld-10',
    domainId: 'az9-cloud',
    topicId: 'az9-cloud-models',
    kind: 'mcq',
    category: 'concept',
    difficulty: 'intermediate',
    points: 2,
    prompt:
      'Which Azure service lets you manage servers and Kubernetes clusters running on premises and in other clouds from Azure?',
    options: [
      { id: 'a', text: 'Azure Arc' },
      { id: 'b', text: 'Azure Migrate' },
      { id: 'c', text: 'Azure VMware Solution' },
      { id: 'd', text: 'Azure Site Recovery' },
    ],
    correct: ['a'],
    explanation:
      'Azure Arc projects non-Azure resources into Resource Manager for hybrid and multi-cloud management. Azure Migrate moves workloads into Azure, Azure VMware Solution runs VMware inside Azure, and Site Recovery replicates for disaster recovery.',
  },
  {
    id: 'az9q-cld-11',
    domainId: 'az9-cloud',
    topicId: 'az9-cloud-benefits',
    kind: 'mcq',
    category: 'concept',
    difficulty: 'beginner',
    points: 1,
    prompt:
      'An online shop automatically adds web servers when traffic rises and removes them when it falls. Which cloud benefit does this describe?',
    options: [
      { id: 'a', text: 'Predictability' },
      { id: 'b', text: 'Elasticity' },
      { id: 'c', text: 'Governance' },
      { id: 'd', text: 'High availability' },
    ],
    correct: ['b'],
    explanation:
      'Automatically matching capacity to demand is elasticity. Predictability is about forecasting cost and performance, governance is about enforcing standards, and high availability is about staying up despite failures.',
  },
  {
    id: 'az9q-cld-12',
    domainId: 'az9-cloud',
    topicId: 'az9-cloud-benefits',
    kind: 'mcq',
    category: 'concept',
    difficulty: 'beginner',
    points: 1,
    prompt:
      'Changing a virtual machine from 2 vCPUs to 8 vCPUs is an example of which kind of scaling?',
    options: [
      { id: 'a', text: 'Horizontal scaling (scale out)' },
      { id: 'b', text: 'Vertical scaling (scale up)' },
      { id: 'c', text: 'Geographic scaling' },
      { id: 'd', text: 'Elastic scaling in' },
    ],
    correct: ['b'],
    explanation:
      'Making one resource bigger is vertical scaling, or scaling up. Horizontal scaling changes the number of instances. Geographic scaling is not a standard term here, and scaling in reduces instance count.',
  },
  {
    id: 'az9q-cld-13',
    domainId: 'az9-cloud',
    topicId: 'az9-cloud-benefits',
    kind: 'mcq',
    category: 'concept',
    difficulty: 'intermediate',
    points: 2,
    prompt: 'What does an Azure service-level agreement (SLA) describe?',
    options: [
      { id: 'a', text: 'A guarantee that a service will never experience downtime' },
      {
        id: 'b',
        text: 'Microsoft commitment to uptime and connectivity, with service credits if it is not met',
      },
      { id: 'c', text: 'The maximum number of resources you can create in a subscription' },
      { id: 'd', text: 'The price you pay per hour for a resource' },
    ],
    correct: ['b'],
    explanation:
      'An SLA is a formal uptime commitment, typically a percentage like 99.9%, with service credits when missed. It does not promise zero downtime. Resource limits are quotas, and prices come from the pricing pages.',
  },
  {
    id: 'az9q-cld-14',
    domainId: 'az9-cloud',
    topicId: 'az9-cloud-benefits',
    kind: 'multi',
    category: 'concept',
    difficulty: 'intermediate',
    points: 2,
    prompt:
      'Which tools or features contribute to cost predictability in Azure? (Select all that apply.)',
    options: [
      { id: 'a', text: 'Pricing calculator' },
      { id: 'b', text: 'TCO calculator' },
      { id: 'c', text: 'Cost Management budgets and alerts' },
      { id: 'd', text: 'Resource locks' },
      { id: 'e', text: 'Microsoft Entra multifactor authentication' },
    ],
    correct: ['a', 'b', 'c'],
    explanation:
      'The Pricing and TCO calculators estimate costs up front, and Cost Management budgets track spend. Resource locks prevent deletion (governance), and MFA protects sign-ins (security) - neither forecasts cost.',
  },
  {
    id: 'az9q-cld-15',
    domainId: 'az9-cloud',
    topicId: 'az9-cloud-benefits',
    kind: 'mcq',
    category: 'concept',
    difficulty: 'intermediate',
    points: 2,
    prompt:
      'A company wants to ensure that every resource deployed follows corporate standards such as allowed regions and required tags. Which cloud benefit is this?',
    options: [
      { id: 'a', text: 'Scalability' },
      { id: 'b', text: 'Reliability' },
      { id: 'c', text: 'Governance' },
      { id: 'd', text: 'Elasticity' },
    ],
    correct: ['c'],
    explanation:
      'Enforcing standards across deployments is governance, delivered by tools like Azure Policy. Scalability and elasticity are about capacity, and reliability is about recovering from failure.',
  },
  {
    id: 'az9q-cld-16',
    domainId: 'az9-cloud',
    topicId: 'az9-service-types',
    kind: 'mcq',
    category: 'concept',
    difficulty: 'beginner',
    points: 1,
    prompt: 'Azure Virtual Machines are an example of which cloud service type?',
    options: [
      { id: 'a', text: 'Infrastructure as a service (IaaS)' },
      { id: 'b', text: 'Platform as a service (PaaS)' },
      { id: 'c', text: 'Software as a service (SaaS)' },
      { id: 'd', text: 'Function as a service only' },
    ],
    correct: ['a'],
    explanation:
      'VMs give you raw compute and leave the OS and everything above it to you - that is IaaS. PaaS services like App Service manage the OS for you, SaaS is a finished application, and function as a service describes serverless offerings like Azure Functions.',
  },
  {
    id: 'az9q-cld-17',
    domainId: 'az9-cloud',
    topicId: 'az9-service-types',
    kind: 'mcq',
    category: 'concept',
    difficulty: 'intermediate',
    points: 2,
    prompt:
      'A web app runs on Azure App Service. Who is responsible for patching the underlying operating system?',
    options: [
      { id: 'a', text: 'The customer' },
      { id: 'b', text: 'Microsoft' },
      { id: 'c', text: 'The customer for Linux plans, Microsoft for Windows plans' },
      { id: 'd', text: 'Nobody - App Service has no operating system' },
    ],
    correct: ['b'],
    explanation:
      'App Service is PaaS, so Microsoft manages and patches the OS and runtime on both Windows and Linux. The customer manages application code, configuration and data. There is an OS underneath; you simply do not manage it.',
  },
  {
    id: 'az9q-cld-18',
    domainId: 'az9-cloud',
    topicId: 'az9-service-types',
    kind: 'multi',
    category: 'concept',
    difficulty: 'intermediate',
    points: 2,
    prompt: 'Which of these are platform as a service (PaaS) offerings? (Select all that apply.)',
    options: [
      { id: 'a', text: 'Azure SQL Database' },
      { id: 'b', text: 'Azure App Service' },
      { id: 'c', text: 'Azure Functions' },
      { id: 'd', text: 'Microsoft 365' },
      { id: 'e', text: 'Azure Virtual Machine Scale Sets' },
    ],
    correct: ['a', 'b', 'c'],
    explanation:
      'Azure SQL Database, App Service and Functions are managed platforms for your code or data. Microsoft 365 is SaaS, and scale sets are groups of VMs, which is IaaS.',
  },
  {
    id: 'az9q-cld-19',
    domainId: 'az9-cloud',
    topicId: 'az9-service-types',
    kind: 'mcq',
    category: 'concept',
    difficulty: 'intermediate',
    points: 2,
    prompt:
      'A company must move 30 legacy servers to Azure within a month without changing any application code. Which service type is most suitable?',
    options: [
      { id: 'a', text: 'SaaS' },
      { id: 'b', text: 'PaaS' },
      { id: 'c', text: 'IaaS' },
      { id: 'd', text: 'Serverless' },
    ],
    correct: ['c'],
    explanation:
      'Lift-and-shift without code changes is the classic IaaS scenario - the servers become VMs. PaaS and serverless usually require code or configuration changes, and SaaS replaces the application rather than moving it.',
  },
  {
    id: 'az9q-cld-20',
    domainId: 'az9-cloud',
    topicId: 'az9-service-types',
    kind: 'mcq',
    category: 'concept',
    difficulty: 'advanced',
    points: 2,
    prompt:
      'Which service type gives the customer the MOST control over the environment, and therefore the most responsibility?',
    options: [
      { id: 'a', text: 'SaaS' },
      { id: 'b', text: 'PaaS' },
      { id: 'c', text: 'IaaS' },
      { id: 'd', text: 'They all give equal control; only price differs' },
    ],
    correct: ['c'],
    explanation:
      'IaaS leaves the OS, middleware, runtime and applications to the customer, so it offers the most control and responsibility. PaaS hands the platform to Microsoft, and SaaS leaves only data, identities and devices with the customer.',
  },
  {
    id: 'az9q-cld-21',
    domainId: 'az9-cloud',
    topicId: 'az9-service-types',
    kind: 'multi',
    category: 'concept',
    difficulty: 'advanced',
    points: 2,
    prompt:
      'A company uses Microsoft 365 (SaaS). Which tasks remain the company responsibility? (Select all that apply.)',
    options: [
      { id: 'a', text: 'Deciding which users have accounts and what they can access' },
      { id: 'b', text: 'Classifying and protecting the documents stored in the service' },
      { id: 'c', text: 'Securing the laptops and phones employees sign in from' },
      { id: 'd', text: 'Applying updates to the Exchange Online servers' },
      { id: 'e', text: 'Replacing failed disks in the Microsoft datacenter' },
    ],
    correct: ['a', 'b', 'c'],
    explanation:
      'Accounts and identities, information and data, and devices stay with the customer even for SaaS. Updating the application servers and replacing hardware are Microsoft tasks in SaaS.',
  },
  {
    id: 'az9q-cld-22',
    domainId: 'az9-cloud',
    topicId: 'az9-cloud-benefits',
    kind: 'mcq',
    category: 'concept',
    difficulty: 'advanced',
    points: 2,
    prompt:
      'A single VM gets a lower SLA than two VMs spread across availability zones. Which benefit does the zone deployment improve, and why?',
    options: [
      { id: 'a', text: 'Elasticity, because zones add instances automatically' },
      {
        id: 'b',
        text: 'High availability, because redundancy across separate datacenters removes a single point of failure',
      },
      { id: 'c', text: 'Predictability, because zones have a fixed monthly price' },
      { id: 'd', text: 'Governance, because zones enforce allowed regions' },
    ],
    correct: ['b'],
    explanation:
      'Availability zones are physically separate datacenters in a region; spreading instances across them survives the loss of one, which raises availability and the SLA. Zones do not scale automatically, have no fixed price, and do not enforce policy.',
  },
]
