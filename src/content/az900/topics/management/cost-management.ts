import type { Topic } from '../../../types'

export const costManagement: Topic = {
  id: 'az9-cost-management',
  title: 'Azure costs: factors, calculators, Cost Management and tags',
  domainId: 'az9-management',
  difficulty: 'beginner',
  estimatedMinutes: 18,
  order: 1,
  tags: ['cost', 'pricing calculator', 'tco', 'cost management', 'budgets', 'tags', 'billing'],
  oneLiner:
    'What drives an Azure bill, how to estimate it before you deploy, and how to track and allocate it afterwards.',
  explanation: [
    'Azure is billed on consumption, so the bill depends on choices you make. The main **factors that affect cost** are the **resource type** and its settings (a premium SKU costs more than a standard one), **consumption** (how long and how much you use), **maintenance** (resources left running that nobody uses), **geography** (the same service can cost different amounts in different regions), **network traffic** (data leaving Azure - egress - and crossing regions is billed, while most inbound data is free), and the **subscription and offer type** you are on.',
    'Microsoft gives you two estimating tools. The **Pricing calculator** estimates the monthly cost of Azure services you plan to deploy - pick services, regions, sizes and hours, and it totals them. The **Total Cost of Ownership (TCO) calculator** compares the cost of running your current on-premises infrastructure against running it in Azure over several years, including power, cooling, hardware and labour.',
    'Once resources are running, **Microsoft Cost Management** (in the portal as Cost Management + Billing) shows what you have spent and are forecast to spend, broken down by subscription, resource group, service, region or tag. You can create **budgets** that send **alerts** when spending reaches a threshold, and Cost Management also surfaces Azure Advisor cost recommendations.',
    '**Tags** are name/value pairs, such as `CostCenter: 1234` or `Environment: prod`, that you attach to resources, resource groups and subscriptions. They are how you answer "which department spent this?" - Cost Management can group and filter costs by tag. Tags are not inherited automatically from a resource group, but Azure Policy can apply or inherit them for you.',
  ],
  whyItMatters: [
    'Cost management is a core objective of the management and governance domain, which carries roughly a third of the AZ-900 exam. Expect questions that ask which calculator to use, what a budget does, and which factors change the price.',
    'The number-one surprise for new Azure users is a bill for resources they forgot to delete, or for data egress they did not expect. Understanding cost factors prevents both.',
    'Finance teams rely on tags and Cost Management to charge costs back to projects. An untagged estate is one where nobody can say who owns the spend.',
  ],
  howItWorks: [
    'Every resource emits **meters** - for example VM compute hours, managed disk capacity, or gigabytes of outbound data transfer. The billing system multiplies usage by the price for your offer and region.',
    'The **Pricing calculator** is a public web tool; you do not need a subscription. It produces an estimate you can export or share. It is for new deployments.',
    'The **TCO calculator** asks you to describe your current servers, databases, storage and networking, plus assumptions such as electricity cost and IT labour. It then projects on-premises cost against Azure cost over up to five years. It is for migration business cases.',
    '**Cost Management** reads actual usage. **Cost analysis** lets you slice spending by scope (management group, subscription, resource group) and by dimension (service, location, tag). **Budgets** set a threshold for a scope and period; **alerts** notify by email or trigger an action group when actual or forecast spend crosses a percentage. A budget does not stop resources by itself.',
    '**Tags** are metadata. Each resource can hold up to 50 tag name/value pairs. You apply them in the portal, CLI, PowerShell or IaC, and you enforce them with Azure Policy (for example "Require a tag on resource groups" or "Inherit a tag from the resource group").',
    'To reduce cost you can: shut down or delete idle resources, right-size over-provisioned VMs, use reservations or savings plans for steady workloads, use Spot for interruptible work, apply Azure Hybrid Benefit, and pick cheaper regions where data residency allows.',
  ],
  diagrams: [
    {
      kind: 'decision',
      title: 'Which cost tool answers this question?',
      caption:
        'Pricing calculator and TCO look forward; Cost Management looks at what you actually spent.',
      question: 'What do you need to know?',
      branches: [
        {
          condition: 'cost of services I plan to deploy',
          result: 'Pricing calculator',
          detail: 'No subscription needed',
          tone: 'accent',
        },
        {
          condition: 'on-premises versus Azure over years',
          result: 'TCO calculator',
          detail: 'Migration business case',
        },
        {
          condition: 'what I have spent and will spend',
          result: 'Cost Management',
          detail: 'Cost analysis and forecasts',
          tone: 'success',
        },
        {
          condition: 'warn me before I overspend',
          result: 'Budget with alerts',
          detail: 'Alerts only, does not stop resources',
          tone: 'warning',
        },
      ],
    },
    {
      kind: 'flow',
      title: 'From resource usage to a cost report by team',
      caption: 'Tags applied at deployment are what let finance split the bill later.',
      nodes: [
        { label: 'Resources emit meters', detail: 'Compute hours, GB stored, GB egress' },
        {
          label: 'Usage is priced',
          detail: 'Offer, region and SKU rates',
          arrowLabel: 'billing engine',
        },
        {
          label: 'Cost Management',
          detail: 'Actual and forecast costs by scope',
          arrowLabel: 'within hours',
          tone: 'accent',
        },
        {
          label: 'Group by tag',
          detail: 'CostCenter, Environment, Owner',
          tone: 'success',
          branch: { label: 'Untagged spend', detail: 'Nobody can say who owns it', tone: 'danger' },
        },
        {
          label: 'Budget alerts fire',
          detail: 'At 80% and 100% of the monthly budget',
          tone: 'warning',
        },
      ],
    },
  ],
  keyObjects: [
    {
      kind: 'Budget (Microsoft.Consumption/budgets)',
      apiVersion: '2023-05-01',
      purpose:
        'A spending threshold on a scope with notifications when it is approached or exceeded.',
      fields: [
        {
          path: 'properties.amount',
          meaning: 'The budget amount in the billing currency.',
          required: true,
        },
        {
          path: 'properties.timeGrain',
          meaning: 'Monthly, Quarterly or Annually.',
          required: true,
        },
        {
          path: 'properties.timePeriod.startDate',
          meaning: 'First day of the budget; must be the start of a month.',
          required: true,
        },
        {
          path: 'properties.notifications',
          meaning:
            'Thresholds (percent), Actual or Forecasted, and email or action group recipients.',
        },
      ],
    },
    {
      kind: 'Tags (Microsoft.Resources/tags)',
      apiVersion: '2024-03-01',
      purpose: 'Name/value metadata on a resource, resource group or subscription.',
      fields: [
        { path: 'properties.tags', meaning: 'A dictionary such as { "CostCenter": "1234" }.' },
        {
          path: 'limits',
          meaning: 'Up to 50 tag pairs per resource; not every resource type supports tags.',
        },
        {
          path: 'inheritance',
          meaning: 'Not automatic - use Azure Policy to inherit from the resource group.',
        },
      ],
    },
    {
      kind: 'Cost factors (concept)',
      purpose: 'What changes the price of the same workload.',
      fields: [
        { path: 'resourceType', meaning: 'Service, SKU, tier and settings.' },
        { path: 'consumption', meaning: 'Hours running, GB stored, transactions, commitments.' },
        { path: 'geography', meaning: 'Region pricing differs.' },
        {
          path: 'networkTraffic',
          meaning: 'Outbound (egress) and inter-region data transfer are billed.',
        },
        {
          path: 'subscriptionType',
          meaning: 'Free, pay-as-you-go, Enterprise Agreement, CSP pricing.',
        },
      ],
    },
  ],
  realWorldExample: {
    title: 'The mystery 40% increase',
    story: [
      'A software company saw its Azure bill jump by 40% in one month. Nobody had approved new projects, and the finance lead asked IT to explain it.',
      'Cost analysis grouped by resource group showed the increase came from a group called rg-temp. Grouped by service, most of it was Virtual Machines, and the VMs had no Owner or Project tag. They turned out to be a performance-test environment a contractor had left running after the engagement ended.',
      'The team deleted the environment, then made three changes: an Azure Policy requiring Owner and CostCenter tags on every resource group, a monthly budget per subscription with alerts at 80% and 100%, and a weekly review of Advisor cost recommendations.',
      'The next month Advisor also suggested right-sizing two over-provisioned database VMs. The bill ended lower than before the spike.',
    ],
  },
  yamlExamples: [
    {
      title: 'A monthly budget with alerts, in Bicep',
      language: 'bicep',
      explanation:
        'Deployed at subscription scope. One notification fires on actual spend at 80%, another on forecast spend at 100%.',
      code: `targetScope = 'subscription'

param startDate string = '2026-10-01'
param contactEmail string

resource budget 'Microsoft.Consumption/budgets@2023-05-01' = {
  name: 'monthly-subscription-budget'
  properties: {
    category: 'Cost'
    amount: 500
    timeGrain: 'Monthly'
    timePeriod: { startDate: startDate }
    notifications: {
      actual80: {
        enabled: true
        operator: 'GreaterThan'
        threshold: 80
        thresholdType: 'Actual'
        contactEmails: [ contactEmail ]
      }
      forecast100: {
        enabled: true
        operator: 'GreaterThan'
        threshold: 100
        thresholdType: 'Forecasted'
        contactEmails: [ contactEmail ]
      }
    }
  }
}`,
      placeholders: ['contactEmail'],
    },
    {
      title: 'Tagging a resource group and its resources',
      language: 'bash',
      explanation:
        'Tags on a resource group do not flow down automatically, so tag resources too - or use a policy that inherits them.',
      code: `az group create -n rg-az900-cost -l eastus \\
  --tags CostCenter=1234 Environment=dev Owner=<your-alias>

az resource tag --tags CostCenter=1234 Environment=dev \\
  --ids $(az resource list -g rg-az900-cost --query "[].id" -o tsv) --is-incremental`,
      placeholders: ['<your-alias>'],
    },
  ],
  imperative: [
    {
      command: 'az group update -n rg-az900-cost --set tags.CostCenter=1234',
      what: 'Adds or changes one tag on a resource group.',
      expected: '"tags": { "CostCenter": "1234", ... }',
    },
    {
      command: 'az tag update --resource-id <resource-id> --operation Merge --tags Environment=dev',
      what: 'Merges a tag into a resource without removing existing tags.',
      placeholders: ['<resource-id>'],
    },
    {
      command:
        'az consumption budget create --budget-name dev-budget --amount 100 --category cost --time-grain monthly --start-date 2026-10-01 --end-date 2027-09-30',
      what: 'Creates a monthly budget for the current subscription.',
    },
    {
      command: 'New-AzTag -ResourceId <resource-id> -Tag @{ CostCenter = "1234" }',
      what: 'PowerShell: replaces the tags on a resource with the given set.',
      placeholders: ['<resource-id>'],
    },
  ],
  declarative: {
    steps: [
      'Write the budget as a subscription-scoped Bicep file.',
      'Pick a start date that is the first day of a month.',
      'Deploy with `az deployment sub create`.',
      'Confirm the budget in Cost Management + Billing > Budgets.',
    ],
    code: [
      {
        title: 'Deploy at subscription scope',
        language: 'bash',
        code: `az deployment sub create --location eastus \\
  --template-file budget.bicep --parameters contactEmail=<you@example.com>`,
        placeholders: ['<you@example.com>'],
      },
    ],
  },
  verification: [
    {
      command: 'az consumption budget list -o table',
      what: 'Lists budgets on the subscription with amount and current spend.',
    },
    {
      command: 'az group show -n rg-az900-cost --query tags',
      what: 'Shows the tags on the resource group.',
      expected: '{ "CostCenter": "1234", "Environment": "dev", ... }',
    },
    {
      command: 'az resource list --tag CostCenter=1234 -o table',
      what: 'Finds every resource carrying a given tag.',
    },
  ],
  troubleshooting: [
    {
      command: 'az resource list -g rg-az900-cost --query "[?tags.CostCenter==null].name" -o tsv',
      what: 'Finds resources missing a cost tag - they will show as untagged in cost analysis.',
    },
    {
      command: 'az consumption usage list --top 10 -o table',
      what: 'Shows recent usage records when a charge needs explaining.',
      namespaceNote: 'Usage data can lag by several hours and depends on billing account type.',
    },
    {
      command: 'az advisor recommendation list --category Cost -o table',
      what: 'Lists idle or over-sized resources Advisor thinks you are overpaying for.',
    },
  ],
  commonMistakes: [
    'Expecting a budget to stop spending. Budgets alert; to act automatically you must wire an action group to automation.',
    'Using the TCO calculator to price a new cloud-only project. That is the Pricing calculator.',
    'Assuming tags on a resource group apply to the resources inside it. They are not inherited without Azure Policy.',
    'Forgetting that outbound data transfer and cross-region traffic cost money.',
    'Believing every region costs the same. Prices differ by region.',
  ],
  examTips: [
    'Pricing calculator = estimate new Azure services. TCO calculator = compare on-premises with Azure.',
    'Cost Management shows actual and forecast spend and hosts budgets. Budgets alert, they do not block.',
    'Know the cost factors: resource type, consumption, maintenance, geography, network traffic, subscription type, and Azure Marketplace purchases.',
    'Tags are for organisation and cost reporting. Enforce them with Azure Policy.',
    'Inbound data transfer is generally free; outbound (egress) is charged.',
  ],
  summary: [
    'Cost depends on resource type, consumption, region, network traffic and subscription type.',
    'Use the Pricing calculator for new deployments and the TCO calculator for migration cases.',
    'Cost Management analyses actual spend and forecasts; budgets send alerts at thresholds.',
    'Tags let you group costs by team, project or environment.',
    'Policy can require and inherit tags, so the bill stays attributable.',
  ],
  practice: [
    {
      id: 'az9-cost-management-p1',
      level: 'beginner',
      prompt:
        'Which tool would you use to estimate the monthly cost of three VMs and a SQL database you have not deployed yet?',
      answer: 'The Azure Pricing calculator.',
      explanation:
        'The TCO calculator compares on-premises against Azure; Cost Management reports on resources that already exist.',
    },
    {
      id: 'az9-cost-management-p2',
      level: 'beginner',
      prompt: 'Name four factors that change the cost of an Azure resource.',
      answer:
        'Resource type and SKU, how long and how much it is used, the region it runs in, and outbound network traffic. Subscription type also matters.',
    },
    {
      id: 'az9-cost-management-p3',
      level: 'intermediate',
      prompt: 'A budget alert fires at 100%. Do the resources in the subscription stop? Explain.',
      answer:
        'No. A budget only notifies. You can connect it to an action group that runs automation to stop resources, but that is not the default.',
    },
    {
      id: 'az9-cost-management-p4',
      level: 'intermediate',
      prompt:
        'How would you make sure every new resource group records which cost center pays for it?',
      answer:
        'Assign an Azure Policy that requires a CostCenter tag on resource groups (deny if missing), and optionally one that makes resources inherit the tag from their group.',
    },
  ],
  lab: {
    title: 'Tag, budget and analyse',
    scenario: 'Create a tagged resource group, set a budget, and find your costs by tag.',
    prerequisites: [
      'An Azure subscription where you can create budgets (Owner or Cost Management Contributor)',
      'Cloud Shell',
    ],
    tasks: [
      {
        instruction:
          'Estimate a Standard_B1s VM for one month in the Pricing calculator and note the figure.',
      },
      {
        instruction:
          'Create resource group `rg-az900-cost` with tags CostCenter=1234 and Environment=dev.',
      },
      {
        instruction:
          'Create a small storage account in it and give the account the same CostCenter tag.',
      },
      { instruction: 'Create a monthly budget of 20 in your currency with an alert at 80%.' },
      {
        instruction: 'Open Cost Management > Cost analysis and group by the CostCenter tag.',
        hint: 'New resources can take up to a day to show cost.',
      },
    ],
    solution: [
      {
        title: 'CLI steps',
        language: 'bash',
        code: `az group create -n rg-az900-cost -l eastus --tags CostCenter=1234 Environment=dev
az storage account create -n <uniquestorname> -g rg-az900-cost --sku Standard_LRS \\
  --tags CostCenter=1234
az consumption budget create --budget-name az900-lab --amount 20 --category cost \\
  --time-grain monthly --start-date 2026-10-01 --end-date 2027-09-30`,
        placeholders: ['<uniquestorname>'],
      },
    ],
    verification: [
      {
        command: 'az resource list --tag CostCenter=1234 -o table',
        what: 'Shows the tagged resources.',
        expected: 'The storage account.',
      },
      {
        command: 'az consumption budget show --budget-name az900-lab',
        what: 'Shows the budget amount and period.',
      },
    ],
    cleanup: [
      {
        command: 'az group delete -n rg-az900-cost --yes --no-wait',
        what: 'Deletes the resource group and storage account.',
      },
      {
        command: 'az consumption budget delete --budget-name az900-lab',
        what: 'Removes the lab budget.',
      },
    ],
  },
  relatedTopicIds: ['az9-cloud-models', 'az9-governance-compliance', 'az9-monitoring-tools'],
  docs: [
    {
      title: 'Describe cost management in Azure (Microsoft Learn)',
      url: 'https://learn.microsoft.com/training/modules/describe-cost-management-azure/',
    },
    {
      title: 'Tutorial: Create and manage budgets',
      url: 'https://learn.microsoft.com/azure/cost-management-billing/costs/tutorial-acm-create-budgets',
    },
    {
      title: 'Use tags to organize your Azure resources',
      url: 'https://learn.microsoft.com/azure/azure-resource-manager/management/tag-resources',
    },
  ],
}
