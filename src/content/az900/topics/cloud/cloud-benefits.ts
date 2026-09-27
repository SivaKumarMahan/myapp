import type { Topic } from '../../../types'

export const cloudBenefits: Topic = {
  id: 'az9-cloud-benefits',
  title: 'The benefits of the cloud',
  domainId: 'az9-cloud',
  difficulty: 'beginner',
  estimatedMinutes: 18,
  order: 3,
  tags: [
    'high availability',
    'scalability',
    'elasticity',
    'reliability',
    'predictability',
    'security',
    'governance',
    'manageability',
    'sla',
  ],
  oneLiner:
    'High availability, scalability, reliability, predictability, security, governance and manageability - what each means and how Azure delivers it.',
  explanation: [
    'Microsoft groups the benefits of cloud computing into a handful of words that appear again and again on the exam. They sound similar, so the skill is telling them apart. **High availability** means a service keeps running with minimal downtime. **Scalability** means you can add or remove resources to meet demand. **Reliability** means a system recovers from failures and keeps functioning. **Predictability** means you can forecast both performance and cost.',
    'The second group is about control. **Security** covers the tools and physical protections the provider gives you. **Governance** means setting and enforcing standards - which regions, which sizes, which tags - across everything you deploy. **Manageability** is about how easily you manage the cloud (automatic scaling, monitoring, templates) and how you manage it (portal, CLI, APIs).',
    'Scalability has two directions. **Vertical scaling** (scaling up or down) changes the size of one resource, such as giving a VM more CPU. **Horizontal scaling** (scaling out or in) changes the number of instances. **Elasticity** is scaling that happens automatically as demand changes, so you are never paying for idle capacity for long.',
    'High availability is usually expressed as a **service-level agreement (SLA)**: Microsoft commitment to an uptime percentage, such as 99.9% or 99.99%, with service credits if it is missed. The SLA you get depends on how you deploy - one VM gets a lower SLA than several VMs spread across availability zones.',
  ],
  whyItMatters: [
    'Expect several questions that describe a scenario and ask which benefit it demonstrates. "A retailer adds servers automatically on Black Friday" is elasticity; "the app keeps running when a datacenter fails" is high availability or reliability.',
    'These are the words business stakeholders use when they justify moving to the cloud. Being precise - knowing that scalability is not the same as availability - makes you credible in those conversations.',
    'Later lessons turn each benefit into a concrete service: availability zones for availability, scale sets for elasticity, Azure Policy for governance, Azure Monitor and ARM templates for manageability.',
  ],
  howItWorks: [
    '**High availability** comes from redundancy. Azure offers availability zones (separate datacenters in one region), region pairs and redundant storage. A higher SLA is achieved by running multiple instances across these fault boundaries.',
    '**Scalability** is either vertical (resize a VM from 2 to 8 vCPUs) or horizontal (go from 2 to 10 instances). **Elasticity** adds automation: autoscale rules watch metrics like CPU and add or remove instances within limits you set.',
    '**Reliability** is the ability to recover. Because Azure spans many regions, you can design so that the loss of a zone or even a region does not take your application down. Resilience is designed, not automatic.',
    '**Predictability** has two sides. Performance predictability comes from autoscaling, load balancing and high availability. Cost predictability comes from tools such as the Pricing calculator, TCO calculator and Cost Management budgets.',
    '**Security** in the cloud includes physical datacenter protection you could not afford yourself, DDoS protection, encryption at rest by default, and services such as Microsoft Defender for Cloud. Depending on the service type, patches may be applied for you.',
    '**Governance** uses Azure Policy, resource locks, tags and management groups to keep deployments compliant with corporate and regulatory standards, and to audit and remediate those that drift. **Manageability** uses templates, monitoring and alerting, plus consistent tools - portal, CLI, PowerShell, APIs.',
  ],
  diagrams: [
    {
      kind: 'decision',
      title: 'Which cloud benefit is this scenario describing?',
      caption:
        'Most benefit questions hinge on one keyword. Match the keyword to the benefit before reading the options.',
      question: 'What does the scenario emphasise?',
      branches: [
        {
          condition: 'stays up with minimal downtime',
          result: 'High availability',
          detail: 'Measured by an SLA',
          tone: 'success',
        },
        {
          condition: 'more or fewer resources for demand',
          result: 'Scalability',
          detail: 'Vertical (size) or horizontal (count)',
        },
        {
          condition: 'automatically follows demand',
          result: 'Elasticity',
          detail: 'Autoscale adds and removes instances',
          tone: 'accent',
        },
        {
          condition: 'recovers from a failure',
          result: 'Reliability',
          detail: 'Resilient, decentralised design',
        },
        {
          condition: 'forecast cost or performance',
          result: 'Predictability',
          detail: 'Budgets, calculators, autoscale',
        },
        {
          condition: 'enforce corporate standards',
          result: 'Governance',
          detail: 'Azure Policy, locks, tags',
          tone: 'warning',
        },
      ],
    },
    {
      kind: 'flow',
      title: 'Elasticity in action: an autoscale loop',
      caption:
        'Elasticity is scalability with a feedback loop. Metrics drive the change, and limits stop it running away.',
      nodes: [
        { label: 'Demand rises', detail: 'Traffic spike during a sale', tone: 'warning' },
        {
          label: 'Metric crosses threshold',
          detail: 'Average CPU above 70% for 10 minutes',
          arrowLabel: 'Azure Monitor watches',
        },
        {
          label: 'Scale out',
          detail: 'Add instances up to the maximum',
          arrowLabel: 'autoscale rule fires',
          tone: 'accent',
        },
        {
          label: 'Demand falls',
          detail: 'CPU below 30%',
        },
        {
          label: 'Scale in',
          detail: 'Remove instances down to the minimum',
          tone: 'success',
        },
      ],
    },
  ],
  keyObjects: [
    {
      kind: 'Service-level agreement (concept)',
      purpose: 'Microsoft formal commitment to a level of uptime and connectivity for a service.',
      fields: [
        {
          path: 'uptimePercentage',
          meaning: 'For example 99.9% (about 43 minutes a month of allowed downtime) or 99.99%.',
        },
        {
          path: 'serviceCredit',
          meaning: 'A partial refund if Microsoft misses the SLA - you must claim it.',
        },
        {
          path: 'deploymentDependent',
          meaning:
            'The SLA depends on configuration: multiple instances across zones earn a higher figure.',
        },
      ],
    },
    {
      kind: 'Autoscale setting (Microsoft.Insights/autoscalesettings)',
      apiVersion: '2022-10-01',
      purpose: 'The rules that make a scale set or App Service plan elastic.',
      fields: [
        {
          path: 'properties.targetResourceUri',
          meaning: 'The scale set or plan to scale.',
          required: true,
        },
        {
          path: 'properties.profiles[].capacity',
          meaning: 'Minimum, maximum and default instance counts.',
          required: true,
        },
        {
          path: 'properties.profiles[].rules[]',
          meaning: 'Metric trigger plus scale action (increase or decrease by N).',
        },
      ],
    },
    {
      kind: 'Scaling directions (concept)',
      purpose: 'The two ways to change capacity.',
      fields: [
        { path: 'vertical', meaning: 'Scale up or down: change the size of one resource.' },
        { path: 'horizontal', meaning: 'Scale out or in: change the number of instances.' },
        { path: 'elasticity', meaning: 'Automatic scaling in response to demand.' },
      ],
    },
  ],
  realWorldExample: {
    title: 'The ticketing site that stopped over-buying',
    story: [
      'A concert-ticketing company used to size its on-premises servers for the busiest ten minutes of the year - the moment a major tour went on sale. For the other 364 days, most of that hardware sat idle.',
      'In Azure it runs its web tier on a virtual machine scale set spread across three availability zones. Autoscale keeps two instances overnight and adds up to forty when CPU climbs during a sale. That is elasticity, and it is also predictability: the site stays fast under load.',
      'During one sale a datacenter in the region lost power. The instances in the other two zones carried the load and customers noticed nothing. That is high availability through redundancy, and the zone-redundant deployment qualified for a higher SLA than a single VM would.',
      'Finance set a Cost Management budget with alerts at 80% and 100%, and IT used Azure Policy to allow only approved VM sizes. The company had swapped capital risk for governed, predictable operating cost.',
    ],
  },
  yamlExamples: [
    {
      title: 'An autoscale setting in Bicep',
      language: 'bicep',
      explanation:
        'Two rules: scale out by one instance above 70% CPU, scale in by one below 30%. The capacity block is what keeps elasticity bounded and costs predictable.',
      code: `param vmssId string

resource autoscale 'Microsoft.Insights/autoscalesettings@2022-10-01' = {
  name: 'web-autoscale'
  location: resourceGroup().location
  properties: {
    enabled: true
    targetResourceUri: vmssId
    profiles: [
      {
        name: 'default'
        capacity: { minimum: '2', maximum: '10', default: '2' }
        rules: [
          {
            metricTrigger: {
              metricName: 'Percentage CPU'
              metricResourceUri: vmssId
              timeGrain: 'PT1M'
              statistic: 'Average'
              timeWindow: 'PT10M'
              timeAggregation: 'Average'
              operator: 'GreaterThan'
              threshold: 70
            }
            scaleAction: { direction: 'Increase', type: 'ChangeCount', value: '1', cooldown: 'PT5M' }
          }
          {
            metricTrigger: {
              metricName: 'Percentage CPU'
              metricResourceUri: vmssId
              timeGrain: 'PT1M'
              statistic: 'Average'
              timeWindow: 'PT10M'
              timeAggregation: 'Average'
              operator: 'LessThan'
              threshold: 30
            }
            scaleAction: { direction: 'Decrease', type: 'ChangeCount', value: '1', cooldown: 'PT5M' }
          }
        ]
      }
    ]
  }
}`,
    },
    {
      title: 'Vertical versus horizontal scaling from the CLI',
      language: 'bash',
      explanation: 'The first command scales up one VM; the second scales out a scale set.',
      code: `# Vertical: bigger VM (causes a restart)
az vm resize -g rg-az900-benefits -n vm-single --size Standard_D4s_v5

# Horizontal: more instances
az vmss scale -g rg-az900-benefits -n vmss-web --new-capacity 5`,
    },
  ],
  imperative: [
    {
      command:
        'az vmss create -g rg-az900-benefits -n vmss-web --image Ubuntu2204 --instance-count 2 --zones 1 2 3 --generate-ssh-keys',
      what: 'Creates a zone-redundant scale set - redundancy for availability, instances for scale.',
      expected: 'JSON describing the scale set with two instances.',
    },
    {
      command:
        'az monitor autoscale create -g rg-az900-benefits --resource vmss-web --resource-type Microsoft.Compute/virtualMachineScaleSets --name web-autoscale --min-count 2 --max-count 10 --count 2',
      what: 'Adds an autoscale profile with bounds, making the scale set elastic.',
    },
    {
      command:
        'az monitor autoscale rule create -g rg-az900-benefits --autoscale-name web-autoscale --condition "Percentage CPU > 70 avg 10m" --scale out 1',
      what: 'Adds a scale-out rule triggered by CPU.',
    },
    {
      command:
        'Update-AzVmss -ResourceGroupName rg-az900-benefits -VMScaleSetName vmss-web -SkuCapacity 4',
      what: 'PowerShell: manually scales the scale set out to four instances.',
    },
  ],
  declarative: {
    steps: [
      'Deploy a scale set across availability zones.',
      'Declare an autoscale setting that targets the scale set with minimum and maximum bounds.',
      'Add paired scale-out and scale-in rules so capacity follows demand both ways.',
      'Deploy and review the setting in the portal under Scaling.',
    ],
    code: [
      {
        title: 'Deploy the autoscale template',
        language: 'bash',
        code: `VMSS_ID=$(az vmss show -g rg-az900-benefits -n vmss-web --query id -o tsv)
az deployment group create -g rg-az900-benefits \\
  --template-file autoscale.bicep --parameters vmssId="$VMSS_ID"`,
      },
    ],
  },
  verification: [
    {
      command:
        'az vmss list-instances -g rg-az900-benefits -n vmss-web --query "[].{id:instanceId, zone:zones[0]}" -o table',
      what: 'Shows how instances are spread across zones.',
      expected: 'Instances in different zones.',
    },
    {
      command:
        'az monitor autoscale show -g rg-az900-benefits -n web-autoscale --query profiles[0].capacity',
      what: 'Confirms the elastic bounds.',
      expected: '{ "default": "2", "maximum": "10", "minimum": "2" }',
    },
  ],
  troubleshooting: [
    {
      command:
        'az monitor activity-log list -g rg-az900-benefits --offset 1h --query "[?contains(operationName.value, \'autoscale\')]" -o table',
      what: 'If scaling did not happen, check the activity log for autoscale actions and failures.',
    },
    {
      command: 'az vm list-usage --location eastus -o table',
      what: 'Scale-out can fail when the subscription vCPU quota is reached.',
      expected: 'Current value close to Limit for the VM family.',
    },
    {
      command: 'az vm list-skus -l eastus --zone --size Standard_B2s -o table',
      what: 'Checks the VM size is offered in every zone you requested.',
    },
  ],
  commonMistakes: [
    'Treating scalability and elasticity as identical. Elasticity is automatic scaling; scalability is the ability to scale at all.',
    'Confusing scaling up (bigger) with scaling out (more). Scaling up usually requires a restart; scaling out does not.',
    'Assuming a single VM is highly available because it runs in Azure. Availability needs redundancy.',
    'Thinking an SLA is a guarantee that nothing will fail. It is a commitment with service credits, not a promise of zero downtime.',
    'Mixing up governance (enforce standards) and security (protect against threats). Azure Policy is governance.',
  ],
  examTips: [
    'Learn the keyword for each benefit: uptime - availability; demand - scalability; automatic - elasticity; recovery - reliability; forecast - predictability; standards - governance.',
    'Vertical = up/down = size. Horizontal = out/in = count.',
    'Predictability is about both cost and performance. Expect options that mention only one.',
    'Manageability has two meanings on the exam: management of the cloud (autoscale, monitoring, templates) and management in the cloud (portal, CLI, APIs).',
  ],
  summary: [
    'High availability keeps a service running and is measured by an SLA.',
    'Scalability changes capacity vertically or horizontally; elasticity does it automatically.',
    'Reliability is recovering from failure; predictability is forecasting cost and performance.',
    'Security, governance and manageability give you control: protection, standards and tooling.',
    'Most benefits require design choices - redundancy, autoscale, policy - not just moving to Azure.',
  ],
  practice: [
    {
      id: 'az9-cloud-benefits-p1',
      level: 'beginner',
      prompt:
        'An online shop automatically adds web servers when traffic increases and removes them afterwards. Which benefit is this?',
      answer: 'Elasticity - automatic horizontal scaling in response to demand.',
      explanation:
        'Scalability alone would be correct but less precise; the word "automatically" points to elasticity.',
    },
    {
      id: 'az9-cloud-benefits-p2',
      level: 'beginner',
      prompt: 'What is the difference between scaling up and scaling out?',
      answer:
        'Scaling up (vertical) gives one resource more capacity, such as more CPU and memory. Scaling out (horizontal) adds more instances of the resource.',
    },
    {
      id: 'az9-cloud-benefits-p3',
      level: 'intermediate',
      prompt: 'Which two tools help make cloud costs predictable before and during a project?',
      answer:
        'The Azure Pricing calculator estimates costs before deployment; Cost Management budgets and alerts track spending during it.',
      explanation:
        'The TCO calculator also supports predictability by comparing on-premises and Azure costs.',
    },
    {
      id: 'az9-cloud-benefits-p4',
      level: 'intermediate',
      prompt:
        'A company wants to ensure nobody deploys resources outside two approved regions. Which benefit, and which Azure feature?',
      answer:
        'Governance, implemented with Azure Policy (for example the built-in Allowed locations policy).',
    },
  ],
  lab: {
    title: 'Make a workload scalable, elastic and highly available',
    scenario:
      'Deploy a small zone-redundant scale set, scale it by hand, then make it elastic with autoscale.',
    prerequisites: ['An Azure subscription with quota for a few small VMs', 'Cloud Shell (Bash)'],
    tasks: [
      {
        instruction:
          'Create a resource group `rg-az900-benefits` in a region with availability zones.',
      },
      {
        instruction: 'Create a scale set with two Standard_B1s instances across zones 1, 2 and 3.',
        hint: 'Use --zones 1 2 3.',
      },
      { instruction: 'Scale out manually to three instances and list where they landed.' },
      { instruction: 'Add an autoscale setting with minimum 2 and maximum 5 instances.' },
      { instruction: 'Add a scale-out rule at 70% CPU and a scale-in rule at 30% CPU.' },
      { instruction: 'Label each step you did with the benefit it demonstrates.' },
    ],
    solution: [
      {
        title: 'All steps',
        language: 'bash',
        code: `az group create -n rg-az900-benefits -l eastus
az vmss create -g rg-az900-benefits -n vmss-web --image Ubuntu2204 \\
  --vm-sku Standard_B1s --instance-count 2 --zones 1 2 3 --generate-ssh-keys  # availability
az vmss scale -g rg-az900-benefits -n vmss-web --new-capacity 3              # scalability
az monitor autoscale create -g rg-az900-benefits --resource vmss-web \\
  --resource-type Microsoft.Compute/virtualMachineScaleSets \\
  --name web-autoscale --min-count 2 --max-count 5 --count 3                  # elasticity
az monitor autoscale rule create -g rg-az900-benefits --autoscale-name web-autoscale \\
  --condition "Percentage CPU > 70 avg 10m" --scale out 1
az monitor autoscale rule create -g rg-az900-benefits --autoscale-name web-autoscale \\
  --condition "Percentage CPU < 30 avg 10m" --scale in 1`,
      },
    ],
    verification: [
      {
        command:
          'az monitor autoscale rule list -g rg-az900-benefits --autoscale-name web-autoscale -o table',
        what: 'Lists both autoscale rules.',
        expected: 'Two rules, one Increase and one Decrease.',
      },
      {
        command: 'az vmss list-instances -g rg-az900-benefits -n vmss-web -o table',
        what: 'Shows the current instance count and zones.',
      },
    ],
    cleanup: [
      {
        command: 'az group delete -n rg-az900-benefits --yes --no-wait',
        what: 'Removes the scale set, autoscale setting and networking.',
      },
    ],
  },
  relatedTopicIds: [
    'az9-cloud-computing',
    'az9-cloud-models',
    'az9-service-types',
    'az9-governance-compliance',
  ],
  docs: [
    {
      title: 'Describe the benefits of using cloud services (Microsoft Learn)',
      url: 'https://learn.microsoft.com/training/modules/describe-benefits-use-cloud-services/',
    },
    {
      title: 'Azure reliability overview',
      url: 'https://learn.microsoft.com/azure/reliability/overview',
    },
    {
      title: 'Overview of autoscale in Azure',
      url: 'https://learn.microsoft.com/azure/azure-monitor/autoscale/autoscale-overview',
    },
  ],
}
