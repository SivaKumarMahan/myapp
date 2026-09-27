import type { Topic } from '../../../types'

export const vmScaleSets: Topic = {
  id: 'az1-vm-scale-sets',
  title: 'Virtual Machine Scale Sets: orchestration, autoscale and upgrades',
  domainId: 'az1-compute',
  difficulty: 'intermediate',
  estimatedMinutes: 35,
  order: 3,
  tags: ['vmss', 'autoscale', 'flexible', 'uniform', 'upgrade policy', 'zones', 'azure monitor'],
  oneLiner:
    'Run a fleet of identical or mixed VMs that grows and shrinks automatically and updates without downtime.',
  explanation: [
    'A **Virtual Machine Scale Set (VMSS)** manages a group of VMs as one unit. Instead of creating ten VMs by hand, you describe one **model** - image, size, network, extensions - and a **capacity** (how many instances). Azure creates, spreads and replaces instances to match, and you pay only for the VMs that exist.',
    'Scale sets come in two **orchestration modes**. **Uniform** mode creates identical instances from the scale set model and manages them through the scale set API; it is optimised for large stateless fleets. **Flexible** mode (the recommended default for new scale sets) creates ordinary VM resources that you can manage with normal VM commands, mix sizes and Spot with standard pricing, and spread across fault domains and zones.',
    'The main reason to use a scale set is **autoscale**: rules in Azure Monitor that add instances when load rises (for example average CPU above 70% for ten minutes) and remove them when it falls, always staying between a minimum and a maximum. Schedule-based profiles cover predictable peaks such as business hours.',
    'The **upgrade policy** decides what happens to existing instances when you change the model. **Manual** leaves them alone until you upgrade them, **Automatic** upgrades them all as soon as possible (with no guarantee on how many stay up), and **Rolling** upgrades in batches, pausing between batches and optionally checking health.',
  ],
  whyItMatters: [
    'AZ-104 asks you to create and configure scale sets, including orchestration mode, autoscale rules, upgrade policies and zone placement. Scenario questions typically describe a load pattern and ask which rule or setting meets it.',
    'Scale sets turn capacity planning into policy: you decide the minimum you can accept and the maximum you can afford, and Azure handles the rest. That is how many web tiers, batch workers and CI agent pools run on Azure.',
    'Rolling upgrades and automatic instance repair are what make a fleet of VMs behave more like a platform service - updates without outages, and broken instances replaced without a ticket.',
  ],
  howItWorks: [
    'You create the scale set with a VM profile (image, size, admin credentials, NIC configuration pointing at a subnet and optionally at a load balancer backend pool or Application Gateway), an orchestration mode and an initial instance count.',
    'Instances are spread for resilience. In Flexible mode Azure spreads instances across fault domains, and across the availability zones you list; in Uniform mode you can list zones and optionally require strict **zone balance**. Zones are chosen at creation - an existing regional scale set cannot become zonal.',
    'Autoscale is an Azure Monitor **autoscale setting** attached to the scale set. It has one or more **profiles** (default, recurring schedule or fixed date), each with minimum, maximum and default instance counts and a list of **rules**. A rule names a metric, a time aggregation, a threshold, a duration and an action such as increase count by 1, with a **cool down** period before the next action.',
    'Always pair scale-out with a scale-in rule and leave a gap between their thresholds (for example out above 70%, in below 30%). Otherwise the set can flap: adding an instance lowers the average, which triggers scale-in, which raises it again. Autoscale evaluates scale-out if any rule fires, and scale-in only when all scale-in rules agree.',
    'When you change the model - a new image version, a new extension, a new size - existing instances become out of date. With Manual policy you run `az vmss update-instances` (Uniform) or update VMs individually; Automatic applies at once; Rolling respects `maxBatchInstancePercent`, `pauseTimeBetweenBatches` and unhealthy-instance limits.',
    '**Health** comes from a load balancer health probe or the **Application Health extension**. With it you can enable **automatic instance repairs**, which delete and recreate instances reported unhealthy after a grace period, and rolling upgrades can stop when too many upgraded instances fail health.',
    '**Automatic OS image upgrades** roll out new platform image versions using the same batch-and-health logic, so OS patching of the image layer happens without you orchestrating it.',
  ],
  diagrams: [
    {
      kind: 'sequence',
      title: 'How an autoscale scale-out happens',
      caption:
        'Autoscale reads metrics, compares them with rules, and changes the capacity of the scale set. The cool down stops it reacting again too soon.',
      participants: [
        { id: 'vm', label: 'Scale set instances' },
        { id: 'mon', label: 'Azure Monitor metrics' },
        { id: 'as', label: 'Autoscale engine' },
        { id: 'ss', label: 'Scale set' },
      ],
      messages: [
        { from: 'vm', to: 'mon', label: 'Host metrics: Percentage CPU' },
        { from: 'as', to: 'mon', label: 'Average CPU over 10 min?' },
        { from: 'mon', to: 'as', label: '78 percent', kind: 'return' },
        { from: 'as', to: 'ss', label: 'Rule fires: capacity +1' },
        { from: 'ss', to: 'vm', label: 'Create new instance' },
        { from: 'ss', to: 'as', label: 'Capacity 3, cool down starts', kind: 'return' },
      ],
    },
    {
      kind: 'decision',
      title: 'Which upgrade policy fits?',
      caption:
        'Rolling is the production choice when you need both automation and availability during a model change.',
      question: 'How should existing instances receive a model change?',
      branches: [
        {
          condition: 'Only when an operator chooses',
          result: 'Manual',
          detail: 'Upgrade instances yourself',
        },
        {
          condition: 'Immediately, downtime acceptable',
          result: 'Automatic',
          detail: 'All instances may restart together',
          tone: 'warning',
        },
        {
          condition: 'Automatically, in health-checked batches',
          result: 'Rolling',
          detail: 'Batch size, pause, health probe',
          tone: 'success',
        },
      ],
    },
  ],
  keyObjects: [
    {
      kind: 'Scale set (Microsoft.Compute/virtualMachineScaleSets)',
      apiVersion: '2024-07-01',
      purpose: 'The model and capacity for a group of VMs.',
      fields: [
        {
          path: 'sku.name / sku.capacity',
          meaning: 'VM size and the current instance count.',
          required: true,
        },
        { path: 'properties.orchestrationMode', meaning: 'Uniform or Flexible; set at creation.' },
        { path: 'properties.upgradePolicy.mode', meaning: 'Manual, Automatic or Rolling.' },
        {
          path: 'properties.upgradePolicy.rollingUpgradePolicy',
          meaning: 'maxBatchInstancePercent, pauseTimeBetweenBatches, maxUnhealthyInstancePercent.',
        },
        {
          path: 'properties.automaticRepairsPolicy',
          meaning: 'enabled and gracePeriod for automatic instance repairs.',
        },
        { path: 'zones', meaning: 'List of zones to spread across, set at creation.' },
        {
          path: 'properties.virtualMachineProfile',
          meaning: 'Image, OS profile, storage, network and extensions for new instances.',
        },
      ],
    },
    {
      kind: 'Autoscale setting (Microsoft.Insights/autoscaleSettings)',
      apiVersion: '2022-10-01',
      purpose:
        'The Azure Monitor object that holds autoscale profiles and rules for a target resource.',
      fields: [
        {
          path: 'properties.targetResourceUri',
          meaning: 'The scale set (or App Service plan) being scaled.',
        },
        {
          path: 'properties.profiles[].capacity',
          meaning: 'minimum, maximum and default instance counts.',
        },
        {
          path: 'properties.profiles[].rules[].metricTrigger',
          meaning: 'metricName, timeGrain, statistic, timeWindow, operator, threshold.',
        },
        {
          path: 'properties.profiles[].rules[].scaleAction',
          meaning:
            'direction, type (ChangeCount, PercentChangeCount, ExactCount), value, cooldown.',
        },
        {
          path: 'properties.profiles[].recurrence',
          meaning: 'Schedule for a recurring profile, such as weekdays 08:00.',
        },
      ],
    },
  ],
  realWorldExample: {
    title: 'The retailer that paid for Black Friday all year',
    story: [
      'An online retailer ran twelve VMs behind a load balancer permanently, sized for the busiest day of the year. For most of the year CPU sat below 15%.',
      'They moved the web tier to a Flexible scale set spread over three zones, with a minimum of three instances, a maximum of twenty, scale-out at 70% average CPU and scale-in below 30%. A recurring profile raised the minimum to six during weekday business hours.',
      'Compute cost for the tier dropped by more than half, and the next sales peak scaled to seventeen instances without anyone touching the portal. Rolling upgrades with the Application Health extension meant monthly image updates no longer needed a maintenance window.',
    ],
  },
  yamlExamples: [
    {
      title: 'Autoscale setting with scale-out and scale-in rules (Bicep)',
      language: 'bicep',
      explanation:
        'Out by one above 70% average CPU for 10 minutes; in by one below 30%; 5-minute cool downs; between 2 and 10 instances.',
      code: `param vmssId string
param location string = resourceGroup().location

resource autoscale 'Microsoft.Insights/autoscaleSettings@2022-10-01' = {
  name: 'as-web'
  location: location
  properties: {
    enabled: true
    targetResourceUri: vmssId
    profiles: [
      {
        name: 'default'
        capacity: {
          minimum: '2'
          maximum: '10'
          default: '2'
        }
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
            scaleAction: {
              direction: 'Increase'
              type: 'ChangeCount'
              value: '1'
              cooldown: 'PT5M'
            }
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
            scaleAction: {
              direction: 'Decrease'
              type: 'ChangeCount'
              value: '1'
              cooldown: 'PT5M'
            }
          }
        ]
      }
    ]
  }
}`,
    },
  ],
  imperative: [
    {
      command:
        'az vmss create -g rg-vmss-lab -n vmss-web --orchestration-mode Flexible --image Ubuntu2404 --vm-sku Standard_B2s --instance-count 2 --zones 1 2 3 --admin-username azureuser --generate-ssh-keys',
      what: 'Creates a Flexible scale set of two instances spread across three zones.',
      expected: 'JSON describing the scale set with orchestrationMode Flexible.',
    },
    {
      command:
        'az monitor autoscale create -g rg-vmss-lab --resource vmss-web --resource-type Microsoft.Compute/virtualMachineScaleSets --name as-web --min-count 2 --max-count 10 --count 2',
      what: 'Creates the autoscale setting with capacity limits.',
    },
    {
      command:
        'az monitor autoscale rule create -g rg-vmss-lab --autoscale-name as-web --condition "Percentage CPU > 70 avg 10m" --scale out 1 --cooldown 5',
      what: 'Adds a scale-out rule: plus one instance when average CPU exceeds 70% over 10 minutes.',
    },
    {
      command:
        'az monitor autoscale rule create -g rg-vmss-lab --autoscale-name as-web --condition "Percentage CPU < 30 avg 10m" --scale in 1 --cooldown 5',
      what: 'Adds the matching scale-in rule, with a gap to avoid flapping.',
    },
    {
      command: 'az vmss scale -g rg-vmss-lab -n vmss-web --new-capacity 4',
      what: 'Manually sets the instance count (autoscale may change it again).',
    },
    {
      command:
        'Update-AzVmss -ResourceGroupName rg-vmss-lab -VMScaleSetName vmss-web -UpgradePolicyMode Rolling',
      what: 'PowerShell: switches the upgrade policy to Rolling (a health probe or health extension is required).',
    },
  ],
  declarative: {
    steps: [
      'Declare the VNet and subnet the instances will use.',
      'Declare the scale set with orchestrationMode, zones, sku capacity and the virtualMachineProfile.',
      'Set upgradePolicy and, for Rolling, the batch settings and a health signal.',
      'Declare a Microsoft.Insights/autoscaleSettings resource targeting the scale set id.',
      'Deploy with what-if first; later changes to the model roll out according to the upgrade policy.',
    ],
    code: [
      {
        title: 'Flexible scale set across three zones (excerpt)',
        language: 'bicep',
        code: `resource vmss 'Microsoft.Compute/virtualMachineScaleSets@2024-07-01' = {
  name: 'vmss-web'
  location: location
  zones: [
    '1'
    '2'
    '3'
  ]
  sku: {
    name: 'Standard_B2s'
    capacity: 3
  }
  properties: {
    orchestrationMode: 'Flexible'
    platformFaultDomainCount: 1
    upgradePolicy: {
      mode: 'Rolling'
      rollingUpgradePolicy: {
        maxBatchInstancePercent: 20
        maxUnhealthyInstancePercent: 20
        pauseTimeBetweenBatches: 'PT2M'
      }
    }
    automaticRepairsPolicy: {
      enabled: true
      gracePeriod: 'PT10M'
    }
    virtualMachineProfile: {
      // osProfile, storageProfile, networkProfile and the
      // ApplicationHealthLinux extension go here
    }
  }
}`,
        explanation:
          'With zones listed, platformFaultDomainCount of 1 lets Azure spread across zones; Rolling plus automatic repairs keeps the fleet healthy during updates.',
      },
    ],
  },
  verification: [
    {
      command:
        'az vmss list-instances -g rg-vmss-lab -n vmss-web --query "[].{name:name, zone:zones[0], state:provisioningState}" -o table',
      what: 'Lists each instance and the zone it landed in.',
      expected: 'Instances spread over zones 1, 2 and 3.',
    },
    {
      command:
        'az monitor autoscale show -g rg-vmss-lab -n as-web --query "{min:profiles[0].capacity.minimum, max:profiles[0].capacity.maximum, rules:length(profiles[0].rules)}"',
      what: 'Confirms the autoscale limits and number of rules.',
      expected: '{ "min": "2", "max": "10", "rules": 2 }',
    },
    {
      command:
        'az vmss show -g rg-vmss-lab -n vmss-web --query "{mode:orchestrationMode, upgrade:upgradePolicy.mode, capacity:sku.capacity}"',
      what: 'Shows orchestration mode, upgrade policy and current capacity.',
    },
  ],
  troubleshooting: [
    {
      command:
        'az monitor activity-log list --resource-id $(az monitor autoscale show -g rg-vmss-lab -n as-web --query id -o tsv) --offset 1d --query "[].{time:eventTimestamp, op:operationName.localizedValue, status:status.value}" -o table',
      what: 'Shows recent autoscale actions and whether they succeeded - the first stop when a set did not scale.',
    },
    {
      command:
        'az vmss get-instance-view -g rg-vmss-lab -n vmss-web --instance-id "*" --query "[].{id:instanceId, health:vmHealth.status.code}"',
      what: 'Shows the health state each instance reports (Uniform mode), which drives repairs and rolling upgrades.',
    },
    {
      command: 'az vmss rolling-upgrade get-latest -g rg-vmss-lab -n vmss-web',
      what: 'Shows the status of the latest rolling upgrade and why it stopped, if it did.',
    },
    {
      command: 'az vm list-usage -l westeurope -o table',
      what: 'Checks regional vCPU quota - scale-out silently stalls at the quota limit.',
    },
  ],
  commonMistakes: [
    'Creating only a scale-out rule. Without a scale-in rule the set grows to the maximum and stays there.',
    'Setting scale-out and scale-in thresholds too close together, causing flapping.',
    'Choosing Automatic upgrade policy for production and being surprised when all instances restart at once.',
    'Expecting to change orchestration mode or add zones to an existing scale set. Both are fixed at creation.',
    'Setting maximum instances above the subscription vCPU quota and assuming autoscale will cope.',
    'Enabling Rolling upgrades or automatic repairs without a health probe or the Application Health extension.',
  ],
  examTips: [
    'Uniform = identical instances managed through the scale set API; Flexible = regular VMs, can mix sizes and pricing, recommended for new deployments.',
    'Autoscale rules live in Azure Monitor. Know the parts: metric, aggregation, operator, threshold, duration, action (count or percent), cool down, and min/max/default.',
    'Scale-out happens if any scale-out rule is met; scale-in only if all scale-in rules are met.',
    'Schedule-based scaling uses a recurring or fixed-date profile - the answer when load is predictable (for example weekday business hours).',
    'Upgrade policies: Manual, Automatic, Rolling. Rolling needs a health signal and upgrades in batches.',
    'A scale set spread across zones protects against a zone failure; Microsoft recommends at least two zones.',
  ],
  summary: [
    'A scale set runs many VMs from one model and capacity.',
    'Flexible mode is the default recommendation; Uniform suits very large identical fleets.',
    'Autoscale uses Azure Monitor settings with profiles, min/max/default and paired rules.',
    'Upgrade policies are Manual, Automatic or Rolling; Rolling plus health checks avoids downtime.',
    'Zones and orchestration mode are chosen at creation time.',
  ],
  practice: [
    {
      id: 'az1-vm-scale-sets-p1',
      level: 'beginner',
      prompt:
        'A scale set must never drop below 3 instances and never exceed 12. Where do you set these limits?',
      answer:
        'In the autoscale setting profile capacity: minimum 3 and maximum 12 (with a default count used when metrics are unavailable).',
    },
    {
      id: 'az1-vm-scale-sets-p2',
      level: 'intermediate',
      prompt:
        'Traffic doubles every weekday from 08:00 to 18:00. What autoscale feature handles this most predictably?',
      answer:
        'A recurring schedule-based profile for weekdays 08:00 to 18:00 with a higher minimum instance count, alongside the default metric-based profile.',
      explanation: 'Metric rules react after load arrives; a schedule scales in advance.',
    },
    {
      id: 'az1-vm-scale-sets-p3',
      level: 'intermediate',
      prompt:
        'You updated the scale set image, but existing instances still run the old image. The upgrade policy is Manual. What do you run?',
      answer:
        'Upgrade the instances to the latest model, for example `az vmss update-instances -g <rg> -n <vmss> --instance-ids "*"` in Uniform mode, or switch the policy to Rolling for future changes.',
    },
    {
      id: 'az1-vm-scale-sets-p4',
      level: 'advanced',
      prompt:
        'A scale set adds an instance, CPU drops to 35%, it removes one, CPU rises to 72%, and repeats. What is wrong and how do you fix it?',
      answer:
        'The thresholds are too close, so the set flaps. Widen the gap (for example out above 70% and in below 30%) and lengthen the cool down or duration window.',
    },
  ],
  lab: {
    title: 'Build an autoscaling Flexible scale set',
    scenario:
      'Create a zonal Flexible scale set, attach an autoscale setting with paired rules, and trigger a scale-out.',
    prerequisites: [
      'An Azure subscription with quota for at least 6 B-series vCPUs',
      'Azure Cloud Shell (Bash)',
    ],
    tasks: [
      {
        instruction:
          'Create rg-vmss-lab and a Flexible scale set vmss-web with 2 Standard_B2s instances across zones 1, 2 and 3.',
      },
      { instruction: 'Create an autoscale setting as-web with minimum 2, maximum 5, default 2.' },
      {
        instruction:
          'Add a scale-out rule (+1 when average CPU > 70% over 5 minutes) and a scale-in rule (-1 when < 25% over 10 minutes).',
      },
      {
        instruction: 'Generate CPU load on one instance and watch the capacity change.',
        hint: 'Use az vm run-command invoke on a Flexible instance with a command such as stress-ng or a busy loop.',
      },
      { instruction: 'Check the activity log for the autoscale event.' },
    ],
    solution: [
      {
        title: 'Azure CLI',
        language: 'bash',
        code: `az group create -n rg-vmss-lab -l westeurope
az vmss create -g rg-vmss-lab -n vmss-web --orchestration-mode Flexible \\
  --image Ubuntu2404 --vm-sku Standard_B2s --instance-count 2 --zones 1 2 3 \\
  --admin-username azureuser --generate-ssh-keys

az monitor autoscale create -g rg-vmss-lab --resource vmss-web \\
  --resource-type Microsoft.Compute/virtualMachineScaleSets \\
  --name as-web --min-count 2 --max-count 5 --count 2

az monitor autoscale rule create -g rg-vmss-lab --autoscale-name as-web \\
  --condition "Percentage CPU > 70 avg 5m" --scale out 1
az monitor autoscale rule create -g rg-vmss-lab --autoscale-name as-web \\
  --condition "Percentage CPU < 25 avg 10m" --scale in 1

# Flexible instances are normal VMs - pick one and load it
VM=$(az vmss list-instances -g rg-vmss-lab -n vmss-web --query "[0].name" -o tsv)
az vm run-command invoke -g rg-vmss-lab -n "$VM" --command-id RunShellScript \\
  --scripts "timeout 900 sh -c 'while :; do :; done' &"`,
      },
    ],
    verification: [
      {
        command: 'az vmss show -g rg-vmss-lab -n vmss-web --query sku.capacity',
        what: 'Capacity should rise above 2 after sustained load.',
        expected: '3',
      },
      {
        command: 'az monitor autoscale rule list -g rg-vmss-lab --autoscale-name as-web -o table',
        what: 'Lists both rules.',
      },
    ],
    cleanup: [
      {
        command: 'az group delete -n rg-vmss-lab --yes --no-wait',
        what: 'Deletes the scale set, autoscale setting and network.',
      },
    ],
  },
  relatedTopicIds: [
    'az1-virtual-machines',
    'az1-dns-load-balancing',
    'az1-azure-monitor',
    'az1-arm-bicep',
  ],
  docs: [
    {
      title: 'What are Virtual Machine Scale Sets?',
      url: 'https://learn.microsoft.com/azure/virtual-machine-scale-sets/overview',
    },
    {
      title: 'Orchestration modes for scale sets',
      url: 'https://learn.microsoft.com/azure/virtual-machine-scale-sets/virtual-machine-scale-sets-orchestration-modes',
    },
    {
      title: 'Autoscale overview',
      url: 'https://learn.microsoft.com/azure/azure-monitor/autoscale/autoscale-overview',
    },
    {
      title: 'Upgrade policies for scale sets',
      url: 'https://learn.microsoft.com/azure/virtual-machine-scale-sets/virtual-machine-scale-sets-upgrade-policy',
    },
  ],
}
