import type { Topic } from '../../../types'

export const cloudComputing: Topic = {
  id: 'az9-cloud-computing',
  title: 'What cloud computing is, and the shared responsibility model',
  domainId: 'az9-cloud',
  difficulty: 'beginner',
  estimatedMinutes: 15,
  order: 1,
  tags: ['cloud computing', 'shared responsibility', 'datacenter', 'fundamentals'],
  oneLiner:
    'Renting compute, storage and networking over the internet, and knowing exactly which security jobs stay with you.',
  explanation: [
    '**Cloud computing** is the delivery of computing services - servers, storage, databases, networking, software and analytics - over the internet, on demand, from a provider that owns and runs the physical datacenters. Instead of buying a server, racking it and waiting weeks, you ask for one and it exists a minute later.',
    'Microsoft **Azure** is one such provider. Microsoft builds and operates datacenters in regions around the world; you get access to that capacity through the Azure portal, command-line tools and APIs, and you pay for what you use. When you are finished, you delete the resource and stop paying for it.',
    'Moving to the cloud does not hand every job to the provider. The **shared responsibility model** describes which tasks Microsoft owns, which you own, and which move between the two depending on the kind of service you choose. Physical security of the datacenter is always Microsoft. Your data, your accounts and your devices are always you.',
    'Everything else sits in the middle. The more of the stack you rent as a managed service, the more of the middle Microsoft takes on. That idea - responsibility shifting with the service type - is the thread that ties this lesson to the IaaS, PaaS and SaaS lesson later in this domain.',
  ],
  whyItMatters: [
    'AZ-900 opens with this objective and returns to it constantly. Questions ask you to pick who is responsible for a specific task - patching an operating system, securing a physical host, classifying data - for a given service type.',
    'In real projects, misunderstanding shared responsibility is one of the most common root causes of cloud incidents. Teams assume "Azure handles security", leave a storage account open to the internet, and discover that configuring access was always their job.',
    'The vocabulary here - on demand, self-service, pay-as-you-go, provider-managed datacenter - is the foundation for every later lesson on pricing, benefits and service types.',
  ],
  howItWorks: [
    'Microsoft operates physical datacenters grouped into **regions**. It owns the buildings, power, cooling, physical network and the host servers, and it runs the hypervisor that divides those servers into virtual machines and managed services.',
    'You interact with that capacity through a control plane called **Azure Resource Manager**. Whether you click in the portal, run the Azure CLI or deploy a Bicep file, the request goes to the same API, which creates, updates or deletes resources for you.',
    'Resources are metered. Azure records how long a VM runs, how many gigabytes a storage account holds, how many requests a function handles, and bills your subscription accordingly. This is the **consumption-based model** covered in the next lesson.',
    'Responsibility is split in layers. At the bottom are the physical datacenter, network and hosts: always Microsoft. At the top are information and data, devices (mobile and PCs), and accounts and identities: always the customer.',
    'In between sit the operating system, network controls, applications, and identity and directory infrastructure. With **IaaS** you manage the OS and above; with **PaaS** Microsoft manages the OS and runtime; with **SaaS** Microsoft runs almost everything except your data, devices, users and their access.',
    'The customer can never outsource accountability for their own data. Even with SaaS, you decide who has access, which data is stored, and how it is classified - Microsoft only provides the tools.',
  ],
  diagrams: [
    {
      kind: 'nested',
      title: 'Who owns which layer of responsibility',
      caption:
        'The top and the bottom never move. Only the middle layers shift between you and Microsoft as you pick IaaS, PaaS or SaaS.',
      root: {
        label: 'Shared responsibility model',
        children: [
          {
            label: 'Always the customer',
            tone: 'accent',
            children: [
              { label: 'Information and data' },
              { label: 'Devices (mobile and PCs)' },
              { label: 'Accounts and identities' },
            ],
          },
          {
            label: 'Varies by service type',
            tone: 'warning',
            children: [
              { label: 'Identity and directory infrastructure' },
              { label: 'Applications' },
              { label: 'Network controls' },
              { label: 'Operating system' },
            ],
          },
          {
            label: 'Always Microsoft',
            tone: 'success',
            children: [
              { label: 'Physical hosts' },
              { label: 'Physical network' },
              { label: 'Physical datacenter' },
            ],
          },
        ],
      },
    },
    {
      kind: 'flow',
      title: 'From request to running resource',
      caption:
        'Every tool talks to the same Resource Manager API, and metering starts the moment a resource exists.',
      nodes: [
        {
          label: 'You ask for a resource',
          detail: 'Portal, CLI, PowerShell or Bicep',
          tone: 'accent',
        },
        {
          label: 'Azure Resource Manager',
          detail: 'Authenticates you and checks permissions',
          arrowLabel: 'HTTPS API call',
        },
        {
          label: 'Provider allocates capacity',
          detail: 'Inside a Microsoft datacenter in your region',
        },
        {
          label: 'Resource is running',
          detail: 'Usage is metered and billed',
          tone: 'success',
          branch: {
            label: 'You delete it',
            detail: 'Billing for that resource stops',
          },
        },
      ],
    },
  ],
  keyObjects: [
    {
      kind: 'Shared responsibility model (concept)',
      purpose:
        'The split of security and operations duties between Microsoft and the customer, which changes with the service type.',
      fields: [
        {
          path: 'alwaysMicrosoft',
          meaning: 'Physical datacenter, physical network and physical hosts.',
        },
        {
          path: 'alwaysCustomer',
          meaning:
            'Information and data, devices, and accounts and identities - regardless of service type.',
        },
        {
          path: 'shared',
          meaning:
            'Operating system, network controls, applications, identity infrastructure - depends on IaaS, PaaS or SaaS.',
        },
      ],
    },
    {
      kind: 'Cloud computing characteristics (concept)',
      purpose: 'The properties that distinguish a cloud service from a traditional datacenter.',
      fields: [
        {
          path: 'onDemandSelfService',
          meaning: 'You provision resources yourself, in minutes, without raising a ticket.',
        },
        {
          path: 'broadNetworkAccess',
          meaning: 'Services are reached over the network through standard tools and APIs.',
        },
        {
          path: 'resourcePooling',
          meaning: 'Many customers share the same physical capacity, isolated from each other.',
        },
        {
          path: 'measuredService',
          meaning: 'Usage is metered, so you pay for what you consume.',
        },
      ],
    },
    {
      kind: 'Resource group (Microsoft.Resources/resourceGroups)',
      apiVersion: '2024-03-01',
      purpose:
        'A logical container for related resources. Every Azure resource lives in exactly one resource group.',
      fields: [
        { path: 'name', meaning: 'Unique within the subscription.', required: true },
        {
          path: 'location',
          meaning: 'Where the group metadata is stored; resources inside can be in other regions.',
          required: true,
        },
        { path: 'tags', meaning: 'Name/value pairs for cost reporting and organisation.' },
      ],
    },
  ],
  realWorldExample: {
    title: 'The storage account nobody thought was theirs',
    story: [
      'A small retailer moves its product images to Azure Blob Storage. The team reasons that Microsoft is a large security company, so the data must be protected by default.',
      'A developer enables anonymous read access on a container to make a quick test work and never turns it off. Months later a security researcher reports that the container also holds exported customer order files.',
      'Microsoft did its part perfectly: the datacenter was secure, the disks were encrypted, the platform was patched. What leaked was configured access to data - which the shared responsibility model always assigns to the customer.',
      'The fix was cheap: disable anonymous access, move exports to a private container, and add an Azure Policy that denies public blob access. The lesson was the expensive part: "in the cloud" never means "someone else is responsible for my data".',
    ],
  },
  yamlExamples: [
    {
      title: 'Asking the cloud for a resource, in Bicep',
      language: 'bicep',
      explanation:
        'This file declares a storage account. You state what you want; Azure Resource Manager does the provisioning on Microsoft hardware. Note that the security-relevant settings - public access and TLS - are yours to choose.',
      code: `param location string = resourceGroup().location
param name string

resource sa 'Microsoft.Storage/storageAccounts@2023-05-01' = {
  name: name
  location: location
  sku: {
    name: 'Standard_LRS'
  }
  kind: 'StorageV2'
  properties: {
    allowBlobPublicAccess: false // customer responsibility
    minimumTlsVersion: 'TLS1_2' // customer responsibility
    supportsHttpsTrafficOnly: true
  }
}`,
      placeholders: ['name'],
    },
    {
      title: 'The same request, one command at a time',
      language: 'bash',
      explanation:
        'Self-service in practice: two commands and you have a resource group and a storage account, no hardware purchase involved.',
      code: `az group create --name rg-az900-intro --location eastus

az storage account create \\
  --name <uniquestorname> \\
  --resource-group rg-az900-intro \\
  --sku Standard_LRS \\
  --allow-blob-public-access false \\
  --min-tls-version TLS1_2`,
      placeholders: ['<uniquestorname>'],
    },
  ],
  imperative: [
    {
      command: 'az login',
      what: 'Signs you in to Azure with your Microsoft Entra ID account. Not needed in Cloud Shell.',
      expected: 'A JSON list of the subscriptions you can access.',
    },
    {
      command: 'az group create --name rg-az900-intro --location eastus',
      what: 'Creates a resource group - the first thing you do before creating resources.',
      expected: '"provisioningState": "Succeeded"',
    },
    {
      command:
        'az storage account create -n <uniquestorname> -g rg-az900-intro --sku Standard_LRS --allow-blob-public-access false',
      what: 'Provisions storage on demand. You chose the access setting - that is your side of the model.',
      expected: 'JSON describing the new account with "provisioningState": "Succeeded".',
      placeholders: ['<uniquestorname>'],
    },
    {
      command: 'New-AzResourceGroup -Name rg-az900-intro -Location eastus',
      what: 'The Azure PowerShell equivalent of creating a resource group.',
      expected: 'ProvisioningState : Succeeded',
    },
  ],
  declarative: {
    steps: [
      'Create a file named `main.bicep` with the storage account shown above.',
      'Create a resource group with `az group create`.',
      'Deploy with `az deployment group create`, passing a globally unique name.',
      'Open the resource in the portal and review the settings you, not Microsoft, decided.',
    ],
    code: [
      {
        title: 'Deploy the Bicep file',
        language: 'bash',
        code: `az deployment group create \\
  --resource-group rg-az900-intro \\
  --template-file main.bicep \\
  --parameters name=<uniquestorname>`,
        placeholders: ['<uniquestorname>'],
      },
    ],
  },
  verification: [
    {
      command: 'az account show --output table',
      what: 'Confirms which subscription and tenant you are working in.',
      expected: 'A row with your subscription name, id and IsDefault True.',
    },
    {
      command: 'az resource list --resource-group rg-az900-intro --output table',
      what: 'Lists every resource you created in the group.',
      expected: 'One row for the storage account.',
    },
    {
      command:
        'az storage account show -n <uniquestorname> -g rg-az900-intro --query allowBlobPublicAccess',
      what: 'Checks a customer-owned security setting.',
      expected: 'false',
      placeholders: ['<uniquestorname>'],
    },
  ],
  troubleshooting: [
    {
      command: 'az storage account check-name --name <uniquestorname>',
      what: 'Storage names are global. If creation fails with a name conflict, check availability first.',
      expected: '"nameAvailable": true',
      placeholders: ['<uniquestorname>'],
    },
    {
      command: 'az account list --output table',
      what: 'If a resource "disappeared", you are probably in a different subscription. List them all.',
      namespaceNote:
        'Commands act on the default subscription unless you pass --subscription or run az account set.',
    },
    {
      command: 'az provider show --namespace Microsoft.Storage --query registrationState',
      what: 'A brand-new subscription may need a resource provider registered before first use.',
      expected: '"Registered"',
    },
  ],
  commonMistakes: [
    'Believing the provider is responsible for everything in the cloud. Data, identities, access and devices are always the customer.',
    'Thinking responsibility for physical security ever moves to the customer. It never does, for any service type.',
    'Assuming SaaS means zero customer responsibility. You still own your data, who can sign in, and the devices they use.',
    'Confusing "cloud" with "internet hosting". Cloud adds self-service, elastic capacity, metering and managed services on top of remote servers.',
    'Forgetting to delete test resources. On-demand also means on-bill until you remove them.',
  ],
  examTips: [
    'Memorise the fixed ends: physical datacenter, network and hosts are always Microsoft; information and data, devices, and accounts and identities are always the customer.',
    'When a question names a service type, move the middle layers accordingly: IaaS gives you the most responsibility, SaaS the least.',
    'If asked who patches the operating system of a VM, the answer is the customer. For a PaaS service such as App Service, it is Microsoft.',
    'Expect definitions phrased as "delivery of computing services over the internet". That is the standard wording for cloud computing.',
  ],
  summary: [
    'Cloud computing is renting computing services over the internet on demand from a provider that runs the datacenters.',
    'You provision resources yourself through one API, and you pay for what you use.',
    'The shared responsibility model splits duties between Microsoft and the customer.',
    'Physical security is always Microsoft; data, devices and identities are always the customer.',
    'The middle layers shift toward Microsoft as you move from IaaS to PaaS to SaaS.',
  ],
  practice: [
    {
      id: 'az9-cloud-computing-p1',
      level: 'beginner',
      prompt:
        'Name the three responsibilities that always belong to the customer, whatever the service type.',
      answer: 'Information and data; devices (mobile and PCs); and accounts and identities.',
      explanation:
        'No service type removes these. Even with a SaaS product like Microsoft 365 you decide who has an account and what data is stored.',
    },
    {
      id: 'az9-cloud-computing-p2',
      level: 'beginner',
      prompt:
        'A company runs Windows Server on an Azure virtual machine. Who applies the monthly OS security updates?',
      answer:
        'The customer. A VM is IaaS, so the guest operating system is the customer responsibility.',
      explanation:
        'Microsoft patches the physical host and hypervisor. Tools such as Azure Update Manager help, but deciding to patch remains yours.',
    },
    {
      id: 'az9-cloud-computing-p3',
      level: 'intermediate',
      prompt:
        'Explain why "Azure is secure, so our data in Azure is secure" is an incomplete statement.',
      answer:
        'Azure secures the platform, but configuration of access to data - who can read it, whether it is public, how it is classified - is always the customer responsibility.',
      explanation:
        'Most cloud data leaks are misconfigurations on the customer side of the model, not breaches of the provider.',
    },
    {
      id: 'az9-cloud-computing-p4',
      level: 'intermediate',
      prompt:
        'List four characteristics that make a service "cloud" rather than just a remote server.',
      answer:
        'On-demand self-service, broad network access, resource pooling across customers, and measured (metered) service. Rapid elasticity is often listed too.',
      explanation:
        'A rented physical server in someone else building lacks self-service and elasticity, so it is hosting rather than cloud.',
    },
  ],
  lab: {
    title: 'Provision a resource and find your side of the model',
    scenario:
      'Create a storage account in minutes and identify which of its settings are your responsibility rather than Microsoft.',
    prerequisites: [
      'An Azure subscription (a free account works)',
      'Azure Cloud Shell (Bash) or the Azure CLI installed locally',
    ],
    tasks: [
      { instruction: 'Open Cloud Shell and confirm your active subscription.' },
      { instruction: 'Create a resource group named `rg-az900-lab1` in a region near you.' },
      {
        instruction:
          'Create a Standard_LRS storage account with anonymous blob access disabled and TLS 1.2 as the minimum.',
        hint: 'The name must be 3-24 lowercase letters and digits, globally unique.',
      },
      {
        instruction:
          'In the portal, open the account and find two settings that only you can decide (for example networking and access keys).',
      },
      {
        instruction:
          'Write down one thing Microsoft handles for this account that you never had to think about.',
        hint: 'Think about disks, power and hardware failure.',
      },
    ],
    solution: [
      {
        title: 'Commands',
        language: 'bash',
        code: `az account show --output table
az group create -n rg-az900-lab1 -l eastus
az storage account create -n <uniquestorname> -g rg-az900-lab1 \\
  --sku Standard_LRS --allow-blob-public-access false --min-tls-version TLS1_2
# Microsoft handles: physical disks, datacenter power, host patching,
# replacing failed hardware and encryption at rest by default.`,
        placeholders: ['<uniquestorname>'],
      },
    ],
    verification: [
      {
        command:
          'az storage account show -n <uniquestorname> -g rg-az900-lab1 --query "{public:allowBlobPublicAccess, tls:minimumTlsVersion}"',
        what: 'Confirms the customer-owned settings you chose.',
        expected: '{ "public": false, "tls": "TLS1_2" }',
        placeholders: ['<uniquestorname>'],
      },
    ],
    cleanup: [
      {
        command: 'az group delete -n rg-az900-lab1 --yes --no-wait',
        what: 'Deletes the group and everything in it so billing stops.',
      },
    ],
  },
  relatedTopicIds: ['az9-service-types', 'az9-cloud-models', 'az9-cloud-benefits'],
  docs: [
    {
      title: 'What is Azure?',
      url: 'https://learn.microsoft.com/azure/cloud-adoption-framework/get-started/what-is-azure',
    },
    {
      title: 'Shared responsibility in the cloud',
      url: 'https://learn.microsoft.com/azure/security/fundamentals/shared-responsibility',
    },
    {
      title: 'Describe cloud computing (Microsoft Learn module)',
      url: 'https://learn.microsoft.com/training/modules/describe-cloud-compute/',
    },
  ],
}
