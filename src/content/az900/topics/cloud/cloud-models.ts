import type { Topic } from '../../../types'

export const cloudModels: Topic = {
  id: 'az9-cloud-models',
  title: 'Cloud models and the consumption-based pricing model',
  domainId: 'az9-cloud',
  difficulty: 'beginner',
  estimatedMinutes: 16,
  order: 2,
  tags: [
    'public cloud',
    'private cloud',
    'hybrid cloud',
    'multi-cloud',
    'capex',
    'opex',
    'pricing',
  ],
  oneLiner:
    'Where the cloud runs (public, private, hybrid) and how you pay for it (consumption, reservations, savings plans, spot).',
  explanation: [
    'A **cloud model** describes where the cloud resources live and who can use them. There are three to know. A **public cloud** is owned and run by a provider such as Microsoft and shared by many customers. A **private cloud** is used by a single organisation, often in its own datacenter. A **hybrid cloud** connects the two so workloads and data can move between them.',
    'You will also meet **multi-cloud**: using more than one public cloud provider, for example Azure and another vendor, at the same time. Azure supports hybrid and multi-cloud management through **Azure Arc**, which lets you manage servers, Kubernetes clusters and databases running outside Azure as if they were Azure resources. **Azure VMware Solution** lets you run VMware workloads on dedicated hosts in Azure.',
    'The second half of this lesson is money. Traditional IT is **capital expenditure (CapEx)**: you buy hardware up front and depreciate it over years. The cloud is mostly **operational expenditure (OpEx)**: you pay as you go for what you consume, like a utility bill. This is the **consumption-based model**.',
    'Pay-as-you-go is the default, but not the only price. **Azure Reservations** give a discount for committing to one or three years of a specific resource. **Azure savings plans for compute** give a discount for committing to a fixed hourly spend across compute services. **Spot VMs** use spare capacity cheaply but can be evicted. And the **Azure Hybrid Benefit** lets you reuse existing Windows Server and SQL Server licences.',
  ],
  whyItMatters: [
    'AZ-900 asks you to pick the right cloud model from a short scenario ("data must stay on premises for regulation, but the web tier should burst to the cloud" is hybrid) and to distinguish CapEx from OpEx.',
    'Pricing models appear in both this domain and the cost management lesson. Knowing when a reservation beats pay-as-you-go is a real skill: steady workloads that run all year are wasting money on list price.',
    'Most enterprises are hybrid in practice. Understanding why - regulation, latency, existing investment - explains why tools like Azure Arc and ExpressRoute exist.',
  ],
  howItWorks: [
    'In a **public cloud**, the provider owns all hardware, and customers share it with logical isolation. You need no capital investment and can scale almost without limit, but you have less control over the physical environment.',
    'In a **private cloud**, one organisation has exclusive use of the infrastructure. It gives maximum control and can satisfy strict requirements, but the organisation pays for hardware, staff and maintenance, and capacity is limited to what it has bought.',
    'A **hybrid cloud** links private and public environments with secure network connections such as a site-to-site VPN or ExpressRoute. Sensitive data can stay on premises while elastic front ends run in Azure, and the organisation chooses per workload.',
    'With the **consumption-based model** there is no up-front cost, no idle capacity to pay for, and you can stop paying when you stop using something. Costs become variable and track demand.',
    '**Reservations** trade flexibility for price: you commit to a resource type and region for one or three years. **Savings plans** commit to an hourly amount of compute spend, which is more flexible across VM sizes and regions. Both apply their discount automatically to matching usage.',
    'Unused capacity is sold as **Spot**. Spot VMs are much cheaper but Azure can evict them when it needs the capacity, so they suit interruptible batch jobs, not production web servers.',
  ],
  diagrams: [
    {
      kind: 'decision',
      title: 'Which cloud model fits the scenario?',
      caption:
        'Look for the constraint in the question: exclusivity points to private, a mix of on-premises and Azure points to hybrid.',
      question: 'What does the organisation need?',
      branches: [
        {
          condition: 'no hardware, pay only for use',
          result: 'Public cloud',
          detail: 'Provider owns and shares infrastructure',
          tone: 'accent',
        },
        {
          condition: 'exclusive use, full control',
          result: 'Private cloud',
          detail: 'Single organisation, often own datacenter',
        },
        {
          condition: 'keep some systems on site, extend to Azure',
          result: 'Hybrid cloud',
          detail: 'Connected by VPN or ExpressRoute',
          tone: 'success',
        },
        {
          condition: 'use more than one public provider',
          result: 'Multi-cloud',
          detail: 'Often managed with Azure Arc',
        },
      ],
    },
    {
      kind: 'flow',
      title: 'Choosing a pricing model for a VM',
      caption:
        'Start from how predictable and interruptible the workload is. The more you can commit, the lower the price.',
      nodes: [
        {
          label: 'Pay-as-you-go',
          detail: 'Default. Per-second or per-hour, no commitment',
          tone: 'muted',
        },
        {
          label: 'Savings plan for compute',
          detail: 'Commit an hourly spend for 1 or 3 years',
          arrowLabel: 'steady spend, changing sizes',
        },
        {
          label: 'Reservation',
          detail: 'Commit to a specific resource for 1 or 3 years',
          arrowLabel: 'same size, runs all year',
          tone: 'success',
        },
        {
          label: 'Azure Hybrid Benefit',
          detail: 'Reuse Windows Server or SQL licences',
          arrowLabel: 'stack on top if licensed',
          branch: {
            label: 'Spot VM',
            detail: 'Cheapest, can be evicted at any time',
            tone: 'warning',
          },
        },
      ],
    },
  ],
  keyObjects: [
    {
      kind: 'Cloud deployment models (concept)',
      purpose: 'Where cloud infrastructure runs and who is allowed to use it.',
      fields: [
        { path: 'public', meaning: 'Provider-owned, shared by many customers, no CapEx.' },
        {
          path: 'private',
          meaning: 'Dedicated to one organisation; maximum control, you pay for hardware.',
        },
        {
          path: 'hybrid',
          meaning: 'Public and private connected, workloads placed per requirement.',
        },
        { path: 'multiCloud', meaning: 'Two or more public cloud providers used together.' },
      ],
    },
    {
      kind: 'Expenditure types (concept)',
      purpose: 'How spending on IT is accounted for.',
      fields: [
        {
          path: 'capex',
          meaning:
            'Capital expenditure: up-front purchase of physical assets, depreciated over time.',
        },
        {
          path: 'opex',
          meaning:
            'Operational expenditure: ongoing spend on services, deducted in the period it occurs.',
        },
      ],
    },
    {
      kind: 'Reservation order (Microsoft.Capacity/reservationOrders)',
      purpose: 'A one- or three-year commitment that discounts matching resource usage.',
      fields: [
        { path: 'properties.term', meaning: 'P1Y or P3Y - the length of the commitment.' },
        {
          path: 'properties.billingPlan',
          meaning: 'Pay up front or monthly; the discount is the same.',
        },
        {
          path: 'properties.appliedScopeType',
          meaning: 'Shared, single subscription, resource group or management group.',
        },
      ],
    },
    {
      kind: 'Virtual machine priority (Microsoft.Compute/virtualMachines)',
      apiVersion: '2024-07-01',
      purpose: 'Chooses regular or Spot pricing for a VM.',
      fields: [
        { path: 'properties.priority', meaning: 'Regular (default) or Spot.' },
        {
          path: 'properties.evictionPolicy',
          meaning: 'Deallocate or Delete when a Spot VM is evicted.',
        },
        {
          path: 'properties.billingProfile.maxPrice',
          meaning: 'The most you will pay per hour; -1 means up to the pay-as-you-go price.',
        },
      ],
    },
  ],
  realWorldExample: {
    title: 'A hospital that could not move everything',
    story: [
      'A regional hospital group wanted to leave its ageing datacenter. Its patient records system, however, had to stay in a facility it controlled because of local health regulations and a vendor support contract.',
      'It chose hybrid. The records system stayed on premises; the patient portal, reporting and backups moved to Azure, connected over ExpressRoute. Azure Arc brought the on-premises servers under the same Azure Policy and Microsoft Defender for Cloud views as the cloud VMs.',
      'On the money side, the portal ran around the clock, so the team bought reservations for its VMs after the first month of stable usage. Overnight report generation ran on Spot VMs, because a delayed report was acceptable.',
      'The finance team noticed the shift immediately: a large hardware refresh (CapEx) disappeared from the budget and was replaced by a monthly Azure invoice (OpEx) that tracked actual use.',
    ],
  },
  yamlExamples: [
    {
      title: 'A Spot VM declared in Bicep',
      language: 'bicep',
      explanation:
        'Only the priority, eviction policy and max price differ from a normal VM. Everything else (image, size, network) is omitted here for brevity.',
      code: `resource vm 'Microsoft.Compute/virtualMachines@2024-07-01' = {
  name: 'vm-batch-spot'
  location: resourceGroup().location
  properties: {
    priority: 'Spot'
    evictionPolicy: 'Deallocate'
    billingProfile: {
      maxPrice: -1 // pay up to the pay-as-you-go price, never more
    }
    // hardwareProfile, storageProfile, osProfile, networkProfile ...
  }
}`,
    },
    {
      title: 'Checking Spot and pay-as-you-go prices with the Retail Prices API',
      language: 'bash',
      explanation:
        'The public Azure Retail Prices API needs no authentication. Filtering by SKU and region shows the list price you would pay without any commitment.',
      code: `curl -s "https://prices.azure.com/api/retail/prices?\\$filter=serviceName eq 'Virtual Machines' and armRegionName eq 'eastus' and armSkuName eq 'Standard_D2s_v5'" \\
  | jq '.Items[] | {meter: .meterName, price: .retailPrice, type: .type}'`,
    },
  ],
  imperative: [
    {
      command:
        'az vm create -g rg-az900-models -n vm-spot --image Ubuntu2204 --priority Spot --eviction-policy Deallocate --max-price -1 --generate-ssh-keys',
      what: 'Creates a Spot VM that is deallocated rather than deleted if Azure reclaims capacity.',
      expected: 'JSON with "powerState": "VM running".',
    },
    {
      command: 'az reservations reservation-order list --output table',
      what: 'Lists reservation orders you have purchased (requires billing permissions).',
      expected: 'A table of orders with term and state, or an empty list.',
    },
    {
      command: 'az connectedmachine list --output table',
      what: 'Lists on-premises or other-cloud servers onboarded to Azure Arc - the hybrid view.',
      expected: 'Arc-enabled servers with their status, or an empty list.',
    },
    {
      command: 'Get-AzVM -ResourceGroupName rg-az900-models | Select-Object Name, Priority',
      what: 'PowerShell: shows which VMs are Regular and which are Spot.',
    },
  ],
  declarative: {
    steps: [
      'Decide per workload which model applies: public, private or hybrid.',
      'For interruptible work, declare the VM with `priority: Spot` in Bicep.',
      'Deploy it to a resource group and confirm the priority.',
      'For steady workloads, review Advisor reservation recommendations after a month of usage.',
    ],
    code: [
      {
        title: 'Deploy the Spot VM template',
        language: 'bash',
        code: `az group create -n rg-az900-models -l eastus
az deployment group create -g rg-az900-models --template-file spot-vm.bicep`,
      },
    ],
  },
  verification: [
    {
      command:
        'az vm show -g rg-az900-models -n vm-spot --query "{priority:priority, eviction:evictionPolicy}"',
      what: 'Confirms the VM is priced as Spot.',
      expected: '{ "eviction": "Deallocate", "priority": "Spot" }',
    },
    {
      command: 'az advisor recommendation list --category Cost --output table',
      what: 'Shows cost recommendations, including reservation purchase suggestions.',
    },
  ],
  troubleshooting: [
    {
      command: 'az vm list-skus --location eastus --size Standard_D2s --output table',
      what: 'If Spot creation fails, the size may be unavailable or restricted in that region.',
    },
    {
      command:
        'az vm get-instance-view -g rg-az900-models -n vm-spot --query instanceView.statuses',
      what: 'A Spot VM that stopped by itself was probably evicted; the status shows it deallocated.',
      expected: '"PowerState/deallocated"',
    },
    {
      command: 'az consumption usage list --top 5 --output table',
      what: 'If a reservation seems not to apply, check which meters your usage is actually hitting.',
      namespaceNote: 'Consumption data depends on your billing account type and may lag by hours.',
    },
  ],
  commonMistakes: [
    'Calling any on-premises server farm a private cloud. A private cloud still needs self-service and automation; a room of manually managed servers is just a datacenter.',
    'Confusing hybrid with multi-cloud. Hybrid mixes private and public; multi-cloud uses more than one public provider.',
    'Running production web servers on Spot VMs. They can be evicted with little notice.',
    'Buying a reservation before usage is stable. A reservation you do not use is still paid for.',
    'Thinking the cloud has no CapEx at all. It is mostly OpEx, but reservations paid up front still look like a commitment.',
  ],
  examTips: [
    'Public cloud: no CapEx, provider-owned. Private cloud: single organisation, most control. Hybrid: both, connected.',
    'If the scenario says "must keep data on premises" and "wants to use Azure", the answer is hybrid.',
    'CapEx is up-front and depreciated; OpEx is pay-as-you-go. The cloud shifts spending to OpEx.',
    'Azure Arc manages resources outside Azure. Azure VMware Solution runs VMware workloads inside Azure.',
    'Reservations and savings plans are one- or three-year commitments. Spot is the cheapest but evictable.',
  ],
  summary: [
    'Public, private and hybrid describe where the cloud runs and who uses it; multi-cloud means several public providers.',
    'Hybrid connects on-premises and Azure, and Azure Arc extends Azure management to both.',
    'The consumption-based model means no up-front cost and paying only for what you use (OpEx).',
    'Reservations and savings plans trade commitment for discount; Spot trades reliability for price.',
    'Azure Hybrid Benefit lets you reuse existing Windows Server and SQL Server licences.',
  ],
  practice: [
    {
      id: 'az9-cloud-models-p1',
      level: 'beginner',
      prompt:
        'Which cloud model requires the organisation to buy and maintain all of its own hardware?',
      answer: 'Private cloud. The organisation has exclusive use and pays for the infrastructure.',
      explanation:
        'Public cloud has no hardware purchase; hybrid still involves hardware for the private part, but only private is entirely self-owned.',
    },
    {
      id: 'az9-cloud-models-p2',
      level: 'beginner',
      prompt: 'Is paying a monthly Azure bill for virtual machines CapEx or OpEx? Why?',
      answer:
        'OpEx. It is an ongoing operational cost for a service consumed in that period, not the purchase of an asset.',
    },
    {
      id: 'az9-cloud-models-p3',
      level: 'intermediate',
      prompt:
        'A VM runs 24 hours a day at the same size for the foreseeable future. Which pricing option usually saves the most, and what is the risk?',
      answer:
        'A three-year reservation for that VM size and region. The risk is paying for the commitment even if the workload is later shut down or resized.',
      explanation:
        'Savings plans are more flexible across sizes and regions but usually discount slightly less than a matching reservation.',
    },
    {
      id: 'az9-cloud-models-p4',
      level: 'intermediate',
      prompt: 'What does Azure Arc let an organisation do in a hybrid or multi-cloud estate?',
      answer:
        'Project servers, Kubernetes clusters and data services running outside Azure into Azure Resource Manager, so they can be governed with Azure Policy, tags, RBAC and monitoring.',
    },
  ],
  lab: {
    title: 'Price a workload three ways',
    scenario:
      'Compare pay-as-you-go, Spot and reserved pricing for the same VM size, then create a Spot VM and prove it is priced as Spot.',
    prerequisites: ['An Azure subscription', 'Cloud Shell (Bash)'],
    tasks: [
      {
        instruction:
          'Open the Azure Pricing calculator and add a Standard_D2s_v5 Linux VM in one region. Note the pay-as-you-go monthly price.',
      },
      {
        instruction:
          'Switch the savings option to a one-year and a three-year reservation and note both prices.',
      },
      { instruction: 'Create a resource group `rg-az900-models`.' },
      {
        instruction: 'Create a small Spot VM with eviction policy Deallocate.',
        hint: 'Use --priority Spot and --max-price -1.',
      },
      { instruction: 'Query the VM to confirm its priority and eviction policy.' },
      {
        instruction:
          'Write one sentence describing a workload in your organisation that would suit Spot, and one that would suit a reservation.',
      },
    ],
    solution: [
      {
        title: 'Create and check the Spot VM',
        language: 'bash',
        code: `az group create -n rg-az900-models -l eastus
az vm create -g rg-az900-models -n vm-spot --image Ubuntu2204 \\
  --size Standard_B2s --priority Spot --eviction-policy Deallocate \\
  --max-price -1 --generate-ssh-keys
az vm show -g rg-az900-models -n vm-spot --query "{p:priority, e:evictionPolicy}"`,
      },
    ],
    verification: [
      {
        command: 'az vm show -g rg-az900-models -n vm-spot --query priority -o tsv',
        what: 'Confirms the pricing priority.',
        expected: 'Spot',
      },
    ],
    cleanup: [
      {
        command: 'az group delete -n rg-az900-models --yes --no-wait',
        what: 'Deletes the VM, disk, NIC and public IP together.',
      },
    ],
  },
  relatedTopicIds: ['az9-cloud-computing', 'az9-cloud-benefits', 'az9-cost-management'],
  docs: [
    {
      title: 'Describe cloud models (Microsoft Learn)',
      url: 'https://learn.microsoft.com/training/modules/describe-cloud-compute/5-define-cloud-models',
    },
    {
      title: 'What are Azure Reservations?',
      url: 'https://learn.microsoft.com/azure/cost-management-billing/reservations/save-compute-costs-reservations',
    },
    {
      title: 'Azure savings plan for compute',
      url: 'https://learn.microsoft.com/azure/cost-management-billing/savings-plan/savings-plan-compute-overview',
    },
    {
      title: 'Use Azure Spot Virtual Machines',
      url: 'https://learn.microsoft.com/azure/virtual-machines/spot-vms',
    },
  ],
}
