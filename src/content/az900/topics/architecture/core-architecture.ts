import type { Topic } from '../../../types'

export const coreArchitecture: Topic = {
  id: 'az9-core-architecture',
  title: 'Core architecture: regions, zones and the resource hierarchy',
  domainId: 'az9-architecture',
  difficulty: 'beginner',
  estimatedMinutes: 25,
  order: 1,
  tags: [
    'regions',
    'region pairs',
    'sovereign regions',
    'availability zones',
    'resource groups',
    'subscriptions',
    'management groups',
  ],
  oneLiner:
    'Where Azure physically runs your workloads, and how every resource is organised into resource groups, subscriptions and management groups.',
  explanation: [
    'Azure is built from **datacenters** grouped into **regions**. A region is a geographic area, such as East US or West Europe, that contains one or more datacenters linked by a low-latency network. When you create almost any resource you choose a region, and that choice decides where the data lives, how close it is to your users and which services and VM sizes are available.',
    'Many regions are split into **availability zones**: physically separate groups of datacenters inside the region, each with its own power, cooling and networking. A region that supports zones has a minimum of three. Spreading copies of a workload across zones means a fire or power failure in one building does not take you offline.',
    'Most regions are also **paired** with another region in the same geography, typically several hundred miles away. Azure uses the pair to stagger planned updates and to prioritise recovery after a large outage. Some newer regions have no pair and rely on availability zones instead. **Sovereign regions** such as Azure Government and Azure operated by 21Vianet in China are physically and logically isolated instances of Azure for legal and compliance reasons.',
    'On the logical side, everything you create is a **resource**. Resources live in exactly one **resource group**, resource groups live in exactly one **subscription**, and subscriptions can be organised into a tree of **management groups**. Access control, policy and budgets applied high in that tree flow down to everything underneath.',
  ],
  whyItMatters: [
    'This objective is the foundation of the largest AZ-900 domain. You will be asked to pick the right resiliency construct (zone versus region pair), to identify what a resource group or subscription is for, and to say where a policy or role assignment should be applied so that it is inherited.',
    'In real projects, the region and hierarchy decisions are the hardest ones to change later. Moving data between regions costs time and egress charges, and a messy subscription layout makes cost reporting and access control painful for years.',
    'Understanding inheritance is what lets a small team govern hundreds of subscriptions: assign a role or policy once at a management group and it applies everywhere below it, including subscriptions created next year.',
  ],
  howItWorks: [
    'You pick a **region** for each resource. Some services are **zonal** (pinned to one zone you choose, like a single VM), some are **zone-redundant** (replicated across zones automatically, like zone-redundant storage) and some are **non-regional** or global (like Microsoft Entra ID or Azure Front Door).',
    'A **region pair** gives you a second location in the same geography for disaster recovery. Azure rolls out platform updates to one region of a pair at a time, and some services, such as geo-redundant storage, replicate to the paired region automatically.',
    'A **resource** is any manageable item: a VM, a storage account, a virtual network, a database. Each resource belongs to one resource group, although it can be in a different region from the group itself. The group only stores metadata about its resources.',
    'A **resource group** is a lifecycle and management boundary. Put things that are deployed, managed and deleted together in the same group. Deleting a resource group deletes every resource inside it. Resource groups cannot be nested.',
    'A **subscription** is a billing and access boundary linked to one Microsoft Entra tenant. Organisations use separate subscriptions to separate environments (production and development), departments or billing arrangements, and to stay under per-subscription limits.',
    '**Management groups** sit above subscriptions. They form a tree that starts at a single root management group per tenant and can be up to six levels deep, not counting the root and the subscription level. Each management group or subscription has exactly one parent.',
    'Azure RBAC role assignments and Azure Policy assignments made at any level are **inherited** by every child scope: management group, then subscription, then resource group, then resource.',
  ],
  diagrams: [
    {
      kind: 'nested',
      title: 'The Azure resource hierarchy',
      caption:
        'Every resource sits in one resource group, in one subscription, under a management group tree. Policies and roles flow downwards.',
      root: {
        label: 'Root management group',
        detail: 'One per Microsoft Entra tenant',
        tone: 'muted',
        children: [
          {
            label: 'Management group: Production',
            tone: 'accent',
            children: [
              {
                label: 'Subscription: Prod-Payments',
                detail: 'Billing and access boundary',
                children: [
                  { label: 'Resource group: rg-web', detail: 'VMs, VNet, storage' },
                  { label: 'Resource group: rg-data', detail: 'Databases' },
                ],
              },
            ],
          },
          {
            label: 'Management group: Sandbox',
            children: [{ label: 'Subscription: Dev-Test', detail: 'Cheaper, looser policies' }],
          },
        ],
      },
    },
    {
      kind: 'decision',
      title: 'Which resiliency construct protects you?',
      caption:
        'Zones protect against a datacenter failure inside a region. A second region protects against the whole region going down.',
      question: 'What failure are you designing for?',
      branches: [
        {
          condition: 'A single server or rack fails',
          result: 'Availability set or scale set',
          detail: 'Fault and update domains inside one datacenter',
        },
        {
          condition: 'One datacenter building fails',
          result: 'Availability zones',
          detail: 'Zone-redundant or zonal copies in 3 zones',
          tone: 'accent',
        },
        {
          condition: 'An entire region is unavailable',
          result: 'A second region, often the pair',
          detail: 'Geo-replication and failover',
          tone: 'success',
        },
      ],
    },
  ],
  keyObjects: [
    {
      kind: 'Resource group (Microsoft.Resources/resourceGroups)',
      apiVersion: '2024-03-01',
      purpose:
        'A logical container for resources that share a lifecycle. Deleting the group deletes everything inside it.',
      fields: [
        {
          path: 'name',
          meaning: 'Unique within the subscription, e.g. rg-web-prod.',
          required: true,
        },
        {
          path: 'location',
          meaning: 'Where the group metadata is stored. Resources inside can be in other regions.',
          required: true,
        },
        { path: 'tags', meaning: 'Name/value pairs used for cost reporting and ownership.' },
        {
          path: 'managedBy',
          meaning: 'Set when another service (such as AKS) owns the group on your behalf.',
        },
      ],
    },
    {
      kind: 'Subscription',
      purpose:
        'A billing unit and an access-control boundary. Every resource group belongs to exactly one subscription.',
      fields: [
        { path: 'subscriptionId', meaning: 'A GUID that appears in every resource ID.' },
        { path: 'tenantId', meaning: 'The Microsoft Entra tenant that the subscription trusts.' },
        {
          path: 'state',
          meaning: 'Enabled, Disabled, Warned and so on. Disabled subscriptions stop resources.',
        },
      ],
    },
    {
      kind: 'Management group (Microsoft.Management/managementGroups)',
      apiVersion: '2023-04-01',
      purpose:
        'A container for subscriptions and other management groups, used to apply governance at scale.',
      fields: [
        { path: 'name', meaning: 'The management group ID, unique in the tenant.' },
        { path: 'properties.displayName', meaning: 'A friendly name shown in the portal.' },
        {
          path: 'properties.details.parent.id',
          meaning: 'The single parent management group. Defaults to the root.',
        },
      ],
    },
    {
      kind: 'Region and availability zone',
      purpose:
        'The physical placement of a resource. Zones are separate datacenters in one region; pairs are two regions in one geography.',
      fields: [
        { path: 'location', meaning: 'The region name, e.g. westeurope.' },
        { path: 'zones', meaning: 'For zonal resources, the zone number such as 1, 2 or 3.' },
        { path: 'metadata.pairedRegion', meaning: 'The paired region, if the region has one.' },
      ],
    },
  ],
  realWorldExample: {
    title: 'The retailer that only used one zone',
    story: [
      'An online retailer ran its checkout on two VMs in West Europe. Both happened to be placed in the same datacenter. When a cooling failure took that building offline for a few hours, checkout went down with it, even though the region itself stayed healthy.',
      'The fix was cheap: redeploy the VMs across availability zones 1, 2 and 3 behind a zone-redundant load balancer, and switch the storage account from LRS to ZRS. A later datacenter incident caused no customer impact at all.',
      'At the same time they cleaned up their layout. Production and development were split into separate subscriptions under two management groups, so a single policy at the Production group now enforces allowed regions and required tags on every current and future production subscription.',
    ],
  },
  yamlExamples: [
    {
      title: 'Create a resource group with Bicep (subscription scope)',
      language: 'bicep',
      explanation:
        'Resource groups are created at subscription scope, so the file sets targetScope. The group location only stores metadata.',
      code: `targetScope = 'subscription'

param location string = 'westeurope'
param env string = 'dev'

resource rg 'Microsoft.Resources/resourceGroups@2024-03-01' = {
  name: 'rg-az900-\${env}'
  location: location
  tags: {
    environment: env
    owner: 'platform-team'
  }
}

output rgId string = rg.id`,
    },
    {
      title: 'Count resources by region with Azure Resource Graph (KQL)',
      language: 'text',
      explanation:
        'Resource Graph queries every subscription you can read at once. Useful for spotting resources in unexpected regions.',
      code: `Resources
| summarize resourceCount = count() by location, subscriptionId
| order by resourceCount desc`,
    },
  ],
  imperative: [
    {
      command: 'az account list-locations --output table',
      what: 'Lists every region available to your subscription, with display names.',
      expected: 'A table of regions such as eastus, westeurope and uksouth.',
    },
    {
      command:
        'az account list-locations --query "[?metadata.regionType==\'Physical\'].{name:name, pair:metadata.pairedRegion[0].name}" --output table',
      what: 'Shows each physical region with its paired region, if any.',
      expected: 'Rows like westeurope paired with northeurope.',
    },
    {
      command: 'az group create --name rg-az900-demo --location westeurope --tags env=learn',
      what: 'Creates a resource group in West Europe with a tag.',
      expected: '"provisioningState": "Succeeded"',
    },
    {
      command: 'az account management-group create --name mg-sandbox --display-name "Sandbox"',
      what: 'Creates a management group under the tenant root (needs the right tenant-level permission).',
      expected: 'JSON describing the new management group.',
    },
    {
      command: 'Get-AzLocation | Select-Object Location, DisplayName, PairedRegion',
      what: 'The Azure PowerShell equivalent for listing regions and their pairs.',
    },
  ],
  declarative: {
    steps: [
      'Decide your hierarchy first: management groups for broad categories, subscriptions per environment or workload, resource groups per lifecycle.',
      'Write a Bicep file with targetScope set to subscription to create resource groups.',
      'Deploy it with az deployment sub create, which needs a location for the deployment metadata.',
      'Apply roles and policies at the highest scope that makes sense so they are inherited.',
    ],
    code: [
      {
        title: 'Deploy the resource group template',
        language: 'bash',
        code: `az deployment sub create \\
  --location westeurope \\
  --template-file main.bicep \\
  --parameters env=dev`,
      },
      {
        title: 'A management group under a parent (tenant scope)',
        language: 'bicep',
        explanation:
          'Management groups are tenant-scope resources. Most AZ-900 learners will only read this, not deploy it.',
        code: `targetScope = 'tenant'

resource sandbox 'Microsoft.Management/managementGroups@2023-04-01' = {
  name: 'mg-sandbox'
  properties: {
    displayName: 'Sandbox'
    details: {
      parent: {
        id: '/providers/Microsoft.Management/managementGroups/<parent-mg-id>'
      }
    }
  }
}`,
        placeholders: ['<parent-mg-id>'],
      },
    ],
  },
  verification: [
    {
      command: 'az group show --name rg-az900-demo --output table',
      what: 'Confirms the resource group exists and shows its location.',
      expected: 'Location westeurope, ProvisioningState Succeeded.',
    },
    {
      command: 'az account show --output table',
      what: 'Shows which subscription and tenant your commands are currently targeting.',
      namespaceNote:
        'Every az command runs against the current subscription unless you pass --subscription.',
    },
    {
      command: 'az account management-group list --output table',
      what: 'Lists the management groups you can see in the tenant.',
    },
  ],
  troubleshooting: [
    {
      command: 'az account set --subscription "<subscription-name-or-id>"',
      what: 'Fixes resources appearing in the wrong subscription by switching the active one.',
      placeholders: ['<subscription-name-or-id>'],
    },
    {
      command: 'az vm list-skus --location westeurope --size Standard_D2s --output table',
      what: 'Checks whether a VM size is offered in a region and in which zones, when a deployment fails with SkuNotAvailable.',
      expected: 'A Zones column listing 1,2,3 where zonal deployment is supported.',
    },
    {
      command: 'az group delete --name rg-az900-demo --yes --no-wait',
      what: 'Removes a group and everything in it. Fails if a resource lock is present.',
    },
  ],
  commonMistakes: [
    'Assuming a resource must be in the same region as its resource group. The group location only stores metadata.',
    'Confusing availability zones with region pairs. Zones are inside one region; a pair is two regions.',
    'Thinking resource groups can be nested inside each other. They cannot; only management groups nest.',
    'Believing every region has availability zones and a pair. Many do, but not all, so check before designing.',
    'Putting resources with very different lifecycles in one resource group, then being unable to delete the test ones without touching production.',
    'Assigning access at every individual resource instead of once at a higher scope and letting inheritance do the work.',
  ],
  examTips: [
    'Remember the order from top to bottom: management groups, subscriptions, resource groups, resources.',
    'A resource can be in only one resource group at a time, but it can be moved to another group or subscription.',
    'Availability zones: physically separate datacenters in one region, minimum of three in a zone-enabled region.',
    'Region pairs: same geography, staggered updates, prioritised recovery. Sovereign regions: Azure Government and Azure in China (21Vianet).',
    'If a question asks where to apply a policy so that all current and future subscriptions inherit it, the answer is a management group.',
  ],
  summary: [
    'Regions contain datacenters; zone-enabled regions have at least three availability zones.',
    'Region pairs give disaster recovery options inside the same geography.',
    'Sovereign regions isolate Azure for government or legal requirements.',
    'Resources live in resource groups, which live in subscriptions, which live under management groups.',
    'Roles and policies are inherited downwards through that hierarchy.',
  ],
  practice: [
    {
      id: 'az9-core-architecture-p1',
      level: 'beginner',
      prompt:
        'A VM is in resource group rg-app, which was created in East US. Can the VM itself run in West Europe?',
      answer:
        'Yes. The resource group location only stores metadata; resources in the group can be in any region.',
      explanation:
        'Many teams keep a group and its resources in one region for tidiness, but Azure does not require it.',
    },
    {
      id: 'az9-core-architecture-p2',
      level: 'beginner',
      prompt:
        'What is the difference between an availability zone and a region pair, in one sentence each?',
      answer:
        'An availability zone is a physically separate datacenter group inside one region; a region pair is two regions in the same geography used for disaster recovery and staggered updates.',
    },
    {
      id: 'az9-core-architecture-p3',
      level: 'intermediate',
      prompt:
        'Your company wants every current and future subscription used by the finance department to allow only European regions. Where should the policy be assigned?',
      answer:
        'At a management group that contains the finance subscriptions. Every subscription placed under it, now or later, inherits the policy.',
      explanation:
        'Assigning at each subscription works today but is forgotten when a new subscription is created.',
    },
    {
      id: 'az9-core-architecture-p4',
      level: 'intermediate',
      prompt: 'What happens to the resources inside a resource group when the group is deleted?',
      answer:
        'They are all deleted with it, which is why resource groups should hold resources that share a lifecycle.',
    },
  ],
  lab: {
    title: 'Explore regions and build a small hierarchy',
    scenario:
      'Use Cloud Shell in a free or pay-as-you-go subscription to inspect regions, then create and tag a resource group with both the CLI and Bicep.',
    prerequisites: ['An Azure subscription', 'Azure Cloud Shell (Bash) or the Azure CLI locally'],
    tasks: [
      { instruction: 'List all regions available to your subscription in table form.' },
      {
        instruction: 'Find the paired region for West Europe.',
        hint: 'Query metadata.pairedRegion from az account list-locations.',
      },
      {
        instruction:
          'Create a resource group named rg-az900-lab1 in a region near you, tagged env=learn.',
      },
      {
        instruction:
          'Write a Bicep file with targetScope subscription that creates rg-az900-lab1-bicep and deploy it.',
      },
      {
        instruction: 'List your resource groups and confirm both groups and their tags.',
      },
    ],
    solution: [
      {
        title: 'CLI steps',
        language: 'bash',
        code: `az account list-locations --output table
az account list-locations \\
  --query "[?name=='westeurope'].metadata.pairedRegion[0].name" --output tsv
az group create --name rg-az900-lab1 --location westeurope --tags env=learn`,
      },
      {
        title: 'main.bicep and deployment',
        language: 'bicep',
        code: `targetScope = 'subscription'

resource rg 'Microsoft.Resources/resourceGroups@2024-03-01' = {
  name: 'rg-az900-lab1-bicep'
  location: 'westeurope'
  tags: {
    env: 'learn'
  }
}

// deploy with:
// az deployment sub create --location westeurope --template-file main.bicep`,
      },
    ],
    verification: [
      {
        command: 'az group list --query "[?starts_with(name, \'rg-az900-lab1\')]" --output table',
        what: 'Shows both lab resource groups.',
        expected: 'rg-az900-lab1 and rg-az900-lab1-bicep, both Succeeded.',
      },
      {
        command: 'az group show --name rg-az900-lab1 --query tags',
        what: 'Confirms the tag was applied.',
        expected: '{ "env": "learn" }',
      },
    ],
    cleanup: [
      {
        command: 'az group delete -n rg-az900-lab1 --yes --no-wait',
        what: 'Deletes the CLI-created group.',
      },
      {
        command: 'az group delete -n rg-az900-lab1-bicep --yes --no-wait',
        what: 'Deletes the Bicep-created group.',
      },
    ],
  },
  relatedTopicIds: ['az9-compute-services', 'az9-storage-services', 'az9-identity-security'],
  docs: [
    {
      title: 'Azure regions and availability zones',
      url: 'https://learn.microsoft.com/azure/reliability/availability-zones-overview',
    },
    {
      title: 'Azure region pairs and nonpaired regions',
      url: 'https://learn.microsoft.com/azure/reliability/cross-region-replication-azure',
    },
    {
      title: 'What are Azure management groups?',
      url: 'https://learn.microsoft.com/azure/governance/management-groups/overview',
    },
    {
      title: 'Manage resource groups with the Azure CLI',
      url: 'https://learn.microsoft.com/azure/azure-resource-manager/management/manage-resource-groups-cli',
    },
  ],
}
