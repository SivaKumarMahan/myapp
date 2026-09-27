import type { InterviewQuestion } from '../../../types'

/** Shared responsibility, pricing models and keeping the bill under control. */
export const azureFundamentalsCostQuestions: InterviewQuestion[] = [
  {
    id: 'itv-azf-11',
    level: 'basic',
    kind: 'open',
    prompt:
      'Explain the shared responsibility model. How does it change between IaaS, PaaS and SaaS?',
    probing:
      'They want to hear that some responsibilities never move to Microsoft - data, identities, access - whatever the service model.',
    answer: [
      'The shared responsibility model says who secures and operates what. **Microsoft always owns the physical layer** - datacenters, hosts, the physical network. **You always own your data, your identities and accounts, and who has access to what**. Everything between those shifts depending on the service model.',
      'With **IaaS**, such as a VM, you own a lot: the operating system, patching, antivirus, the runtime, the application, network rules. Microsoft gives you a healthy hypervisor and hardware.',
      'With **PaaS**, such as App Service or Azure SQL Database, Microsoft takes over the OS, patching and the runtime platform. You still own the application code, its configuration, network exposure, and data.',
      'With **SaaS**, such as Microsoft 365, Microsoft runs almost everything; you still own your data, your users, their devices and how access is configured.',
      'The point I would stress is that moving to PaaS reduces your **operational** burden but not your **accountability**. A publicly readable storage container or a leaked admin password is your incident on every model.',
    ],
    diagrams: [
      {
        kind: 'decision',
        title: 'Who patches the operating system?',
        caption: 'Data, identity and access stay yours on every model.',
        question: 'Which service model is the workload on?',
        branches: [
          { condition: 'On-premises', result: 'You own everything', tone: 'muted' },
          {
            condition: 'IaaS (a VM)',
            result: 'You patch the OS',
            detail: 'Microsoft owns hosts and hardware',
            tone: 'warning',
          },
          {
            condition: 'PaaS (App Service, Azure SQL)',
            result: 'Microsoft patches the OS',
            detail: 'You own code, config, network, data',
            tone: 'accent',
          },
          {
            condition: 'SaaS (Microsoft 365)',
            result: 'Microsoft runs the app',
            detail: 'You own data, users, devices, access',
            tone: 'success',
          },
        ],
      },
    ],
    code: [
      {
        title: 'Your side of the line, checked with Resource Graph',
        language: 'bash',
        code: `# Storage accounts that still allow anonymous blob access - always your responsibility
az graph query -q "
resources
| where type == 'microsoft.storage/storageaccounts'
| where properties.allowBlobPublicAccess == true
| project name, resourceGroup, subscriptionId"`,
      },
    ],
    traps: [
      'Saying Microsoft is responsible for data in PaaS or SaaS.',
      'Treating "we moved to PaaS" as a security control on its own.',
    ],
    followUps: [
      'Who is responsible for patching the OS of an AKS node?',
      'Where does Defender for Cloud fit in this model?',
    ],
    tags: ['shared responsibility', 'iaas', 'paas', 'saas', 'security'],
  },
  {
    id: 'itv-azf-12',
    level: 'intermediate',
    kind: 'open',
    prompt:
      'Compare reservations, savings plans, spot VMs and Azure Hybrid Benefit. When would you use each?',
    probing:
      'Real cost knowledge. They want commitment tradeoffs - flexibility versus discount - and the eviction risk of spot.',
    answer: [
      '**Reservations** are a one- or three-year commitment to a specific resource type in a region - for example D4s_v5 VMs in UK South, or a quantity of SQL vCores or Cosmos DB throughput. They give the deepest discount for steady workloads, but the commitment is narrow: change VM family or region and the reservation may no longer apply, though exchanges are possible for some products.',
      'A **savings plan for compute** is a commitment to spend a fixed amount per hour on compute for one or three years. It applies across VM families, regions and some services like App Service Premium and Functions Premium, so it suits estates that change shape. The discount is usually a bit lower than a matching reservation.',
      '**Spot VMs** use spare capacity at a large discount, but Azure can **evict** them at short notice when it needs the capacity back or the price exceeds your cap. They suit interruptible work - batch jobs, CI agents, dev and test, stateless scale-out tiers with an on-demand base.',
      '**Azure Hybrid Benefit** lets you bring existing Windows Server and SQL Server licences with Software Assurance, so you pay only for the compute. It stacks with reservations.',
      'In practice I layer them: Hybrid Benefit where licences exist, reservations for the stable, well-understood baseline, a savings plan for the rest of steady compute, pay-as-you-go for spiky or new workloads, and spot where interruption is acceptable. Before buying any commitment I look at at least a month of usage in Cost Management and at Advisor’s reservation recommendations.',
    ],
    diagrams: [
      {
        kind: 'decision',
        title: 'Which pricing lever fits this workload?',
        caption: 'Commit only to what you are sure will still be running.',
        question: 'What does the usage look like?',
        branches: [
          {
            condition: 'Steady, same SKU and region for years',
            result: 'Reservation',
            detail: 'Deepest discount, narrow scope',
            tone: 'success',
          },
          {
            condition: 'Steady spend, changing shape',
            result: 'Savings plan for compute',
            detail: 'Flexible across families and regions',
            tone: 'accent',
          },
          {
            condition: 'Interruptible, restartable',
            result: 'Spot VMs',
            detail: 'Plan for eviction',
            tone: 'warning',
          },
          {
            condition: 'Spiky, new or short-lived',
            result: 'Pay-as-you-go plus autoscale',
            tone: 'muted',
          },
        ],
      },
    ],
    code: [
      {
        title: 'A spot VM that deallocates on eviction',
        language: 'bash',
        code: `az vm create -g rg-batch -n vm-render-01 \\
  --image Ubuntu2204 --size Standard_D8s_v5 \\
  --priority Spot \\
  --eviction-policy Deallocate \\
  --max-price -1        # -1 = pay up to the on-demand price, evict only for capacity

# Inside the VM, poll for the eviction notice (Scheduled Events)
curl -s -H Metadata:true \\
  "http://169.254.169.254/metadata/scheduledevents?api-version=2020-07-01"`,
      },
      {
        title: 'Turn on Azure Hybrid Benefit for an existing Windows VM',
        language: 'bash',
        code: `az vm update -g rg-app -n vm-win-01 --license-type Windows_Server`,
      },
    ],
    traps: [
      'Buying three-year reservations for a workload that is about to be re-platformed.',
      'Running stateful, single-instance production on spot.',
      'Forgetting that a reservation is a billing discount, not capacity - unless you use on-demand capacity reservations separately.',
    ],
    followUps: [
      'What happens to a reservation if you resize the VM to another family?',
      'How do you handle spot eviction in a scale set?',
    ],
    tags: ['cost', 'reservations', 'savings plans', 'spot', 'hybrid benefit'],
  },
  {
    id: 'itv-azf-13',
    level: 'intermediate',
    kind: 'scenario',
    prompt:
      'Finance tells you the Azure bill jumped 40% this month with no new projects. Walk me through how you find out why and stop it happening again.',
    probing:
      'A practical investigation: Cost Management first, narrowing by dimension, then finding waste and putting controls in place. Tags and anomaly alerts should appear.',
    answer: [
      'I start in **Cost Management cost analysis**, comparing this month to last and grouping by **service name**, then by **subscription and resource group**, then by **resource**. A 40% jump is usually a handful of resources, so within a few minutes the chart normally points at one service - a new SKU, a data transfer spike, a Log Analytics ingestion surge.',
      'Then I look at **why**. Common culprits: someone scaled a database or App Service plan up for a test and never scaled back; a VM left running with a large GPU size; **Log Analytics ingestion** exploding after verbose diagnostics were turned on; egress from a new cross-region replication; or a reservation expiring so steady usage suddenly bills at pay-as-you-go. The activity log tells me who changed what and when.',
      'Next I check for **waste** that accumulated quietly: unattached managed disks, orphaned public IPs, stopped-but-not-deallocated VMs, old snapshots. Resource Graph finds those across every subscription in one query.',
      'To stop it recurring I would put **budgets with alerts** on each subscription, turn on **anomaly alerts** in Cost Management, enforce **cost-center and owner tags** with Azure Policy so every cost can be attributed, and review Advisor cost recommendations monthly. The goal is that the owner hears about a spike in days, not at month end from finance.',
    ],
    code: [
      {
        title: 'Resource Graph: waste across all subscriptions',
        language: 'text',
        code: `// Unattached managed disks
resources
| where type == "microsoft.compute/disks"
| where properties.diskState == "Unattached"
| project name, resourceGroup, subscriptionId, sku = sku.name, sizeGb = properties.diskSizeGB

// Public IPs not associated with anything
resources
| where type == "microsoft.network/publicipaddresses"
| where isnull(properties.ipConfiguration) and isnull(properties.natGateway)
| project name, resourceGroup, subscriptionId`,
        explanation: 'Run with az graph query or in the portal Resource Graph Explorer.',
      },
      {
        title: 'Log Analytics: which tables drove ingestion cost?',
        language: 'text',
        code: `Usage
| where TimeGenerated > ago(30d)
| where IsBillable == true
| summarize IngestedGB = sum(Quantity) / 1000 by DataType, bin(TimeGenerated, 1d)
| render timechart`,
      },
      {
        title: 'Who scaled things up? The activity log',
        language: 'bash',
        code: `az monitor activity-log list --offset 30d \\
  --query "[?contains(operationName.value, 'write') && status.value=='Succeeded'].{when:eventTimestamp, who:caller, what:operationName.value, id:resourceId}" \\
  -o table`,
      },
    ],
    diagrams: [
      {
        kind: 'flow',
        title: 'From a bill spike to a control',
        caption: 'Narrow by dimension, explain the change, then stop it recurring.',
        nodes: [
          { label: 'Cost analysis: month vs month', tone: 'accent' },
          { label: 'Group by service, then resource' },
          { label: 'Activity log: who changed it', detail: 'Scale-ups, new SKUs' },
          { label: 'Resource Graph: find waste', detail: 'Orphaned disks and IPs' },
          { label: 'Budgets, anomaly alerts, tag policy', tone: 'success' },
        ],
      },
    ],
    traps: [
      'Jumping straight to buying reservations before understanding the spike.',
      'Deleting "orphaned" disks without checking whether they are someone’s only backup.',
      'Having no tags, so the cost cannot be attributed to any team.',
    ],
    followUps: [
      'How would you enforce tags on every resource group?',
      'How do you reduce Log Analytics ingestion cost without losing the data you need?',
    ],
    tags: ['scenario', 'cost', 'cost management', 'resource graph', 'finops'],
  },
  {
    id: 'itv-azf-14',
    level: 'advanced',
    kind: 'open',
    prompt:
      'How would you run cost governance across 50 subscriptions and a dozen teams, without becoming a bottleneck?',
    probing:
      'FinOps at scale: attribution, guardrails in code, showback, and making teams responsible for their own spend.',
    answer: [
      'The principle is **visibility and accountability close to the team, guardrails at the platform level**. A central team approving every SKU does not scale; teams seeing their own spend and being alerted early does.',
      '**Attribution** comes first. Every subscription and resource group gets mandatory `costCenter`, `owner` and `environment` tags, enforced with Azure Policy - `deny` on resource groups without them, and `modify` to inherit them from the resource group onto resources. Subscription-per-workload makes attribution even easier, because the subscription itself is the cost boundary.',
      '**Guardrails** are policies at management group scope: allowed regions, allowed VM SKU families in non-production, a deny on the most expensive GPU sizes unless an exemption is granted, and auto-shutdown for dev VMs. Budgets are deployed by the subscription vending pipeline, so no subscription exists without one.',
      '**Showback** is a monthly report per cost center from Cost Management exports into a storage account, feeding Power BI or a FinOps toolkit dashboard. Teams see trend, forecast and Advisor savings for their own resources.',
      'Finally, **commitments are central**: reservations and savings plans are bought at the billing scope by the platform team, since they are shared across subscriptions, and utilisation is reviewed monthly so unused commitment is spotted early.',
    ],
    code: [
      {
        title: 'A budget deployed with every subscription',
        language: 'bicep',
        code: `targetScope = 'subscription'

param ownerEmail string
param monthlyLimit int

resource budget 'Microsoft.Consumption/budgets@2023-05-01' = {
  name: 'budget-monthly'
  properties: {
    category: 'Cost'
    amount: monthlyLimit
    timeGrain: 'Monthly'
    timePeriod: { startDate: '2026-01-01' }
    notifications: {
      actual80: {
        enabled: true
        operator: 'GreaterThan'
        threshold: 80
        thresholdType: 'Actual'
        contactEmails: [ ownerEmail ]
      }
      forecast100: {
        enabled: true
        operator: 'GreaterThan'
        threshold: 100
        thresholdType: 'Forecasted'
        contactEmails: [ ownerEmail ]
      }
    }
  }
}`,
      },
      {
        title: 'Inherit the cost-center tag from the resource group',
        language: 'bash',
        code: `# Built-in: "Inherit a tag from the resource group if missing"
az policy assignment create \\
  --name inherit-costcenter \\
  --scope /providers/Microsoft.Management/managementGroups/mg-landingzones \\
  --policy cd3aa116-8754-49c9-a813-ad46512ece54 \\
  --params '{ "tagName": { "value": "costCenter" } }' \\
  --mi-system-assigned --location uksouth

# Modify-effect policies need a remediation task for existing resources
az policy remediation create --name fix-costcenter \\
  --policy-assignment inherit-costcenter \\
  --management-group mg-landingzones`,
      },
    ],
    deeper: [
      'Tags do not flow into cost data retroactively. Enforce them **before** the spend happens, or the first months of data are unattributable.',
      'Shared platform costs - hub firewall, ExpressRoute, central Log Analytics - need an explicit **allocation rule**. Cost Management cost allocation can split them by percentage or by usage, which avoids endless arguments.',
      'Unit economics - cost per order, per tenant, per build - is what makes the conversation with a product team meaningful. Absolute spend going up is fine if orders went up faster.',
    ],
    traps: [
      'A central approval queue for every resource.',
      'Tag policies in audit mode forever, so nothing is ever actually tagged.',
      'Letting each team buy its own reservations, which fragments utilisation.',
    ],
    followUps: [
      'How would you allocate the cost of a shared hub network?',
      'What is the difference between the deny and modify policy effects here?',
    ],
    tags: ['cost', 'finops', 'azure policy', 'tags', 'governance'],
  },
  {
    id: 'itv-azf-15',
    level: 'intermediate',
    kind: 'mcq',
    prompt: 'Which of these workloads is the best fit for Azure Spot VMs?',
    options: [
      { id: 'a', text: 'A single-instance SQL Server VM holding the order database' },
      { id: 'b', text: 'A nightly video-rendering batch that checkpoints its progress' },
      { id: 'c', text: 'The domain controllers for a hybrid Active Directory' },
      { id: 'd', text: 'A jump box that admins need during incidents' },
    ],
    correct: ['b'],
    probing:
      'Understanding eviction - the discount only makes sense for work that can be interrupted.',
    answer: [
      'The **batch rendering job that checkpoints** is the fit. Spot capacity can be reclaimed at short notice, and a job that saves progress can simply resume on another VM, so it gets the large discount at almost no risk.',
      'The others all need to be there when you need them. A single database VM, domain controllers and an incident jump box being evicted at the worst moment is exactly the failure spot pricing asks you to accept.',
    ],
    code: [
      {
        title: 'A spot scale set that tries to replace evicted capacity',
        language: 'bash',
        code: `az vmss create -g rg-render -n vmss-render \\
  --image Ubuntu2204 --vm-sku Standard_F16s_v2 \\
  --orchestration-mode Flexible --instance-count 10 \\
  --priority Spot --eviction-policy Delete --max-price -1 \\
  --enable-spot-restore true`,
      },
    ],
    traps: ['Using spot for anything that cannot tolerate being stopped without warning.'],
    followUps: ['How much warning does a spot VM get before eviction, and how does it find out?'],
    tags: ['spot', 'cost', 'compute'],
  },
]
