import type { Topic } from '../../../types'

export const az1SubscriptionsGovernance: Topic = {
  id: 'az1-subscriptions-governance',
  title: 'Management groups, subscriptions, locks, tags and cost control',
  domainId: 'az1-identity',
  difficulty: 'intermediate',
  estimatedMinutes: 35,
  order: 3,
  tags: [
    'management-groups',
    'subscriptions',
    'resource-groups',
    'move',
    'locks',
    'tags',
    'budgets',
    'advisor',
  ],
  oneLiner:
    'Organise resources into a governable hierarchy, protect them with locks, label them with tags, and keep spend visible with budgets, cost alerts and Advisor.',
  explanation: [
    'Azure resources sit in a four-level hierarchy. A **resource** (a VM, a storage account) always belongs to exactly one **resource group**. A resource group belongs to one **subscription**, which is a billing and quota boundary trusted by one Entra tenant. Subscriptions can be organised under **management groups**, which nest up to six levels below the **tenant root group**.',
    'The hierarchy is how governance scales. RBAC role assignments and Azure Policy assignments made at a management group are inherited by every subscription beneath it, so you set rules once for "all production" instead of per subscription.',
    'Three tools protect and describe what is inside. **Resource locks** stop accidental deletion (**CanNotDelete**) or any change (**ReadOnly**). **Tags** are name/value pairs such as `costCenter=4410` that let you filter, report and allocate cost. **Budgets** in Cost Management notify you when actual or forecast spend crosses thresholds.',
    'Finally, **Azure Advisor** analyses your resources and recommends improvements in five categories: reliability, security, performance, operational excellence and cost, for example shutting down or resizing underused VMs.',
  ],
  whyItMatters: [
    'AZ-104 lists "manage subscriptions and governance" explicitly: configure management groups, move resources, apply and manage tags, configure resource locks, manage costs with budgets and alerts, and use Advisor. These are high-frequency, practical questions.',
    'Locks and moves are classic trick questions. A ReadOnly lock blocks more than people expect, and many resource types have move restrictions that decide whether a migration plan works.',
    'Cost surprises are the fastest way to lose trust in a cloud platform. Tags plus budgets plus Advisor are the minimum toolkit an administrator is expected to set up.',
  ],
  howItWorks: [
    'Every tenant has one **tenant root group**. New subscriptions land in it, or in a **default management group** you configure. Moving a subscription between management groups requires write permission on the subscription (Owner) and on the target management group (for example Management Group Contributor); by default any user can create management groups unless you enable hierarchy protection.',
    'Resources can be **moved** between resource groups or subscriptions with `az resource move`. The source and target resource groups are locked for writes and deletes during the move (reads still work), the resource keeps its ID shape but gets a new resource ID, and dependent resources often must move together. Not every type supports every move; check the move support table and use **Validate** first.',
    'The resource group location only stores metadata. A resource in a resource group can live in any region, and moving a resource between resource groups does not change its region. Changing region is a different operation (Azure Resource Mover or redeploy).',
    'Locks are inherited: a lock on a resource group applies to every resource in it. **CanNotDelete** allows reading and modifying but not deleting. **ReadOnly** allows reading only, and because it blocks control-plane POST operations it has side effects: you cannot list storage account keys, start or stop a VM, or add a role assignment through a locked scope. Only Owner or User Access Administrator (roles with `Microsoft.Authorization/locks/*`) can create or delete locks.',
    'Tags are **not inherited** by default. A tag on a resource group does not appear on its resources unless you apply Azure Policy (for example Inherit a tag from the resource group, a modify effect). Each resource supports up to 50 tag pairs. Tagging needs write access to the resource, or the Tag Contributor role.',
    'Budgets are created at a management group, subscription or resource group scope, optionally filtered by tag or resource. They evaluate actual and forecast cost against thresholds and email contacts or fire an action group. Budgets **do not stop resources**; to automate a response you connect the action group to an Automation runbook or Logic App.',
    '**Cost alerts** combine budget alerts, credit alerts (for Azure credit subscriptions) and department spending quota alerts (for Enterprise Agreements). **Cost anomaly alerts** notify you when daily spend deviates from the usual pattern.',
  ],
  diagrams: [
    {
      kind: 'nested',
      title: 'The Azure governance hierarchy',
      caption:
        'Policies and role assignments flow down. Resource group location stores metadata only; resources can live anywhere.',
      root: {
        label: 'Tenant root group',
        tone: 'accent',
        children: [
          {
            label: 'Management group: Production',
            detail: 'Policy: allowed regions',
            children: [
              {
                label: 'Subscription: Prod-Apps',
                detail: 'Budget 5000 per month',
                children: [
                  { label: 'rg-payments', detail: 'CanNotDelete lock, tags', tone: 'success' },
                ],
              },
            ],
          },
          {
            label: 'Management group: Sandbox',
            detail: 'Budget alerts, auto-shutdown',
            tone: 'muted',
          },
        ],
      },
    },
    {
      kind: 'decision',
      title: 'Which lock type is right?',
      caption:
        'CanNotDelete is almost always the safe choice. ReadOnly breaks operations that are POST calls.',
      question: 'What must the lock prevent?',
      branches: [
        { condition: 'Accidental deletion only', result: 'CanNotDelete', tone: 'success' },
        {
          condition: 'Any configuration change',
          result: 'ReadOnly',
          detail: 'Also blocks list keys and VM start',
          tone: 'warning',
        },
        { condition: 'Changes by some people only', result: 'Use RBAC instead of a lock' },
      ],
    },
    {
      kind: 'flow',
      title: 'From budget threshold to automated action',
      caption:
        'A budget only notifies. Anything that stops resources has to be wired up through an action group.',
      nodes: [
        { label: 'Cost data refreshes', detail: 'Several times a day', tone: 'muted' },
        { label: 'Budget evaluates', detail: 'Actual or forecast vs threshold' },
        { label: 'Threshold crossed', detail: 'For example 80 percent actual', tone: 'warning' },
        { label: 'Email and action group', detail: 'Owners, finance, webhook' },
        { label: 'Runbook or Logic App', detail: 'Optional: deallocate dev VMs', tone: 'success' },
      ],
    },
  ],
  keyObjects: [
    {
      kind: 'Management group (Microsoft.Management/managementGroups)',
      apiVersion: '2023-04-01',
      purpose:
        'A container for subscriptions and other management groups, used to apply policy and RBAC at scale.',
      fields: [
        {
          path: 'name',
          meaning:
            'The ID used in scopes, such as /providers/Microsoft.Management/managementGroups/prod. Cannot change.',
        },
        { path: 'properties.displayName', meaning: 'Friendly name; can change.' },
        {
          path: 'properties.details.parent.id',
          meaning: 'The parent management group. Depth is limited to six levels below root.',
        },
      ],
    },
    {
      kind: 'Management lock (Microsoft.Authorization/locks)',
      apiVersion: '2020-05-01',
      purpose:
        'Prevents deletion or modification of a subscription, resource group or resource, for everyone including Owners.',
      fields: [
        { path: 'properties.level', meaning: 'CanNotDelete or ReadOnly.', required: true },
        { path: 'properties.notes', meaning: 'Why the lock exists; show it to whoever hits it.' },
        {
          path: 'scope',
          meaning: 'Resource group, subscription or single resource; children inherit.',
        },
      ],
    },
    {
      kind: 'Budget (Microsoft.Consumption/budgets)',
      apiVersion: '2023-05-01',
      purpose:
        'A spending threshold with notifications, scoped to a management group, subscription or resource group.',
      fields: [
        {
          path: 'properties.amount',
          meaning: 'Budget amount in the billing currency.',
          required: true,
        },
        {
          path: 'properties.timeGrain',
          meaning: 'Monthly, Quarterly or Annually (plus billing variants).',
        },
        {
          path: 'properties.notifications.*.threshold',
          meaning: 'Percentage of the amount that triggers a notification.',
        },
        { path: 'properties.notifications.*.thresholdType', meaning: 'Actual or Forecasted.' },
        {
          path: 'properties.filter',
          meaning: 'Limit the budget to tags, resource groups or meters.',
        },
      ],
    },
    {
      kind: 'Tags',
      purpose:
        'Name/value metadata on resources, resource groups and subscriptions for filtering, automation and cost allocation.',
      fields: [
        {
          path: 'tags',
          meaning:
            'Up to 50 pairs per resource. Names are case-insensitive, values case-sensitive.',
        },
        {
          path: 'inheritance',
          meaning:
            'Not inherited by default; use Azure Policy modify or enable tag inheritance in Cost Management for cost reports.',
        },
      ],
    },
  ],
  realWorldExample: {
    title: 'The ReadOnly lock that broke the backups',
    story: [
      'After an engineer deleted a production database by mistake, a team placed ReadOnly locks on every production resource group. Nothing was deleted again, but the next morning the nightly jobs had failed.',
      'The backup script listed storage account keys, which is a POST operation, and the lock blocked it. Autoscale could not add instances, and an on-call engineer could not restart a hung VM during an incident without first removing the lock.',
      'They replaced every ReadOnly lock with CanNotDelete, which gave the protection they actually wanted, and used RBAC to remove Contributor from people who only needed to read. A tag `lockReason` and the lock notes explained who to ask before removing a lock.',
    ],
  },
  yamlExamples: [
    {
      title: 'Build a small management group hierarchy',
      language: 'bash',
      placeholders: ['<subscription-id>'],
      code: `az account management-group create --name corp --display-name "Corp"
az account management-group create --name corp-prod --display-name "Production" --parent corp
az account management-group create --name corp-sandbox --display-name "Sandbox" --parent corp

# Move a subscription under Production
az account management-group subscription add --name corp-prod --subscription <subscription-id>

# See the tree
az account management-group show --name corp --expand --recurse -o json`,
    },
    {
      title: 'Locks and tags with Azure PowerShell',
      language: 'powershell',
      code: `New-AzResourceLock -LockName 'no-delete' -LockLevel CanNotDelete \`
  -ResourceGroupName 'rg-payments' -LockNotes 'Production data. Ask platform team.' -Force

# Merge tags without removing existing ones
$rg = Get-AzResourceGroup -Name 'rg-payments'
Update-AzTag -ResourceId $rg.ResourceId -Tag @{ costCenter = '4410'; env = 'prod' } -Operation Merge

# Find everything with a given tag
Get-AzResource -TagName 'costCenter' -TagValue '4410' | Select-Object Name, ResourceType`,
    },
  ],
  imperative: [
    {
      command:
        'az lock create --name no-delete --lock-type CanNotDelete --resource-group rg-payments --notes "Production data"',
      what: 'Prevents anyone deleting the resource group or anything in it.',
      expected: 'JSON with level CanNotDelete.',
    },
    {
      command:
        'az tag update --resource-id /subscriptions/<subscription-id>/resourceGroups/rg-payments --operation Merge --tags costCenter=4410 env=prod',
      what: 'Adds or updates tags without removing existing ones. Replace overwrites all tags; Delete removes the listed ones.',
      placeholders: ['<subscription-id>'],
    },
    {
      command:
        'az resource move --destination-group rg-target --ids <resource-id-1> <resource-id-2>',
      what: 'Moves resources to another resource group. Add --destination-subscription-id to change subscription.',
      expected:
        'Completes after validation; source and target groups are write-locked while it runs.',
      placeholders: ['<resource-id-1>', '<resource-id-2>'],
    },
    {
      command:
        'az consumption budget create --budget-name monthly-dev --amount 500 --category cost --time-grain monthly --start-date 2026-10-01 --end-date 2027-09-30 --resource-group rg-dev',
      what: 'Creates a simple monthly cost budget on a resource group. Notifications are easiest to add in the portal or with Bicep.',
    },
    {
      command: 'az advisor recommendation list --category Cost -o table',
      what: 'Lists Advisor cost recommendations such as right-sizing or shutting down idle VMs.',
    },
  ],
  declarative: {
    steps: [
      'Deploy the lock and tags in the same Bicep file as the resource group contents, so protection is part of the environment definition.',
      "Declare the budget at subscription scope with `targetScope = 'subscription'` and one notification per threshold.",
      'Use a forecast threshold as an early warning and an actual threshold as the hard signal.',
      'Deploy with `az deployment sub create` and confirm with `az consumption budget list`.',
    ],
    code: [
      {
        title: 'Subscription budget with actual and forecast alerts',
        language: 'bicep',
        placeholders: ['<finance-email>'],
        code: `targetScope = 'subscription'

param startDate string = '2026-10-01'
param amount int = 5000

resource budget 'Microsoft.Consumption/budgets@2023-05-01' = {
  name: 'prod-monthly'
  properties: {
    category: 'Cost'
    amount: amount
    timeGrain: 'Monthly'
    timePeriod: {
      startDate: startDate
    }
    notifications: {
      actual80: {
        enabled: true
        operator: 'GreaterThan'
        threshold: 80
        thresholdType: 'Actual'
        contactEmails: ['<finance-email>']
      }
      forecast100: {
        enabled: true
        operator: 'GreaterThan'
        threshold: 100
        thresholdType: 'Forecasted'
        contactEmails: ['<finance-email>']
        contactRoles: ['Owner']
      }
    }
  }
}`,
      },
      {
        title: 'Resource group lock in Bicep',
        language: 'bicep',
        code: `resource noDelete 'Microsoft.Authorization/locks@2020-05-01' = {
  name: 'no-delete'
  properties: {
    level: 'CanNotDelete'
    notes: 'Production data. Ask the platform team before removing.'
  }
}`,
      },
    ],
  },
  verification: [
    {
      command: 'az lock list --resource-group rg-payments -o table',
      what: 'Shows locks on the resource group, including those inherited from the subscription.',
    },
    {
      command:
        'az resource list --tag costCenter=4410 --query "[].{name:name, type:type}" -o table',
      what: 'Finds every resource carrying a tag.',
    },
    {
      command: 'az account management-group subscription show-sub-under-mg --name corp-prod',
      what: 'Lists the subscriptions directly under a management group.',
    },
    {
      command: 'az consumption budget list -o table',
      what: 'Lists budgets on the current subscription and their current spend.',
    },
  ],
  troubleshooting: [
    {
      command:
        'az lock list --resource-group rg-payments --query "[].{name:name, level:level}" -o table',
      what: 'A delete or a key listing fails with ScopeLocked: find the lock and its level.',
    },
    {
      command:
        'az resource invoke-action --action validateMoveResources --ids /subscriptions/<subscription-id>/resourceGroups/rg-source --request-body @move.json',
      what: 'Validates a move without performing it and reports dependent resources or unsupported types.',
      placeholders: ['<subscription-id>'],
    },
    {
      command: 'az tag list --resource-id <resource-id>',
      what: 'A cost report is missing a tag: check the resource itself; tags on the resource group are not inherited.',
      placeholders: ['<resource-id>'],
    },
  ],
  commonMistakes: [
    'Assuming tags on a resource group apply to its resources. They do not unless a policy or Cost Management tag inheritance adds them.',
    'Using ReadOnly when CanNotDelete was intended, then wondering why keys cannot be listed or VMs cannot start.',
    'Expecting a budget to stop spending. Budgets notify; stopping resources requires an action group wired to automation.',
    'Believing moving a resource to another resource group changes its region. Location stays the same.',
    'Moving a VM without its NIC, disks and public IP. Dependent resources usually must move together.',
    'Thinking Owners can ignore locks. Locks apply to everyone; an Owner must first remove the lock.',
  ],
  examTips: [
    'Management groups: up to six levels deep below the root, one parent per group, and a subscription belongs to exactly one management group.',
    'A lock applies to all users and roles. To delete a locked resource, remove the lock first. Deleting a resource group fails if any resource inside has a delete lock.',
    'Moving resources: the resource ID changes, the region does not, and source and target resource groups are locked during the move. Some services (for example certain classic resources) cannot move at all.',
    'Tags: Merge keeps existing tags; Replace overwrites. Remember the 50-tag limit and that tags are not inherited.',
    'Budget thresholds can be Actual or Forecasted. If a question asks to be warned before spend happens, the answer involves a forecast alert.',
    'Advisor categories are reliability, security, performance, operational excellence and cost. The security recommendations come from Microsoft Defender for Cloud.',
  ],
  summary: [
    'Hierarchy: management group, subscription, resource group, resource; policy and RBAC inherit downward.',
    'CanNotDelete blocks deletes; ReadOnly blocks every write and POST, with side effects.',
    'Tags are metadata for filtering and cost, not inherited by default.',
    'Moves change resource IDs, not regions; validate first and move dependencies together.',
    'Budgets and cost alerts notify; Advisor recommends improvements.',
  ],
  practice: [
    {
      id: 'az1-subscriptions-governance-p1',
      level: 'beginner',
      prompt:
        'You tag rg-app with env=prod. A cost report grouped by env shows nothing for the VMs in rg-app. Why?',
      answer:
        'Tags are not inherited from the resource group. Tag the resources directly, assign the built-in policy that inherits a tag from the resource group, or enable tag inheritance in Cost Management.',
    },
    {
      id: 'az1-subscriptions-governance-p2',
      level: 'intermediate',
      prompt:
        'An Owner tries to delete a storage account and gets ScopeLocked. There is no lock on the storage account. Where is it?',
      answer:
        'On a parent scope: the resource group or the subscription. Locks are inherited, so check `az lock list` at both levels and remove it there.',
    },
    {
      id: 'az1-subscriptions-governance-p3',
      level: 'intermediate',
      prompt:
        'Finance wants an email when the sandbox subscription is predicted to exceed its monthly budget, before it actually does. What do you configure?',
      answer:
        'A budget on the subscription with a notification whose thresholdType is Forecasted (for example at 100 percent) and the finance contact email.',
    },
    {
      id: 'az1-subscriptions-governance-p4',
      level: 'advanced',
      prompt:
        'You need every new subscription to be governed by the Sandbox policies automatically. What setting achieves this?',
      answer:
        'Set the default management group in hierarchy settings to Sandbox. New subscriptions are then placed there instead of the tenant root group and inherit its assignments.',
    },
  ],
  lab: {
    title: 'Govern a resource group end to end',
    scenario:
      'Create a resource group with tags and a lock, observe lock behaviour, move a resource, and add a budget.',
    prerequisites: ['An Azure subscription where you are Owner', 'Cloud Shell (Bash)'],
    tasks: [
      {
        instruction:
          'Create rg-gov-a and rg-gov-b and tag rg-gov-a with env=lab and owner=<your-alias>.',
      },
      {
        instruction: 'Create a storage account in rg-gov-a, then add a ReadOnly lock to rg-gov-a.',
      },
      {
        instruction:
          'Try to list the storage account keys and to delete the account. Note both errors.',
        hint: 'Both are blocked by ReadOnly.',
      },
      {
        instruction:
          'Change the lock to CanNotDelete and list keys again. Deletion should still fail.',
      },
      {
        instruction:
          'Remove the lock and move the storage account to rg-gov-b. Compare its resource ID before and after.',
      },
      {
        instruction:
          'Create a 20 (currency units) monthly budget on rg-gov-b with an 80 percent actual alert in the portal.',
      },
    ],
    solution: [
      {
        title: 'Lab commands',
        language: 'bash',
        code: `az group create -n rg-gov-a -l westeurope --tags env=lab owner=me
az group create -n rg-gov-b -l westeurope
SA=govlab$RANDOM
az storage account create -n $SA -g rg-gov-a -l westeurope --sku Standard_LRS

az lock create -n ro -g rg-gov-a --lock-type ReadOnly
az storage account keys list -n $SA -g rg-gov-a   # ScopeLocked
az storage account delete -n $SA -g rg-gov-a --yes # ScopeLocked

az lock delete -n ro -g rg-gov-a
az lock create -n nodelete -g rg-gov-a --lock-type CanNotDelete
az storage account keys list -n $SA -g rg-gov-a -o table   # works
az storage account delete -n $SA -g rg-gov-a --yes          # still blocked

az lock delete -n nodelete -g rg-gov-a
ID=$(az storage account show -n $SA -g rg-gov-a --query id -o tsv)
az resource move --destination-group rg-gov-b --ids $ID
az storage account show -n $SA -g rg-gov-b --query id -o tsv`,
      },
    ],
    verification: [
      {
        command: 'az resource list -g rg-gov-b --query "[].name" -o tsv',
        what: 'Shows the storage account now lives in rg-gov-b.',
      },
      {
        command: 'az lock list -g rg-gov-a -o table',
        what: 'Confirms no locks remain before cleanup.',
        expected: 'Empty output.',
      },
    ],
    cleanup: [
      {
        command:
          'az group delete -n rg-gov-a --yes --no-wait; az group delete -n rg-gov-b --yes --no-wait',
        what: 'Deletes both resource groups. Remove any remaining locks first and delete the lab budget in Cost Management.',
      },
    ],
  },
  relatedTopicIds: ['az1-rbac', 'az1-azure-policy', 'az1-entra-users-groups'],
  docs: [
    {
      title: 'Management groups overview',
      url: 'https://learn.microsoft.com/azure/governance/management-groups/overview',
    },
    {
      title: 'Lock your resources',
      url: 'https://learn.microsoft.com/azure/azure-resource-manager/management/lock-resources',
    },
    {
      title: 'Move resources to a new resource group or subscription',
      url: 'https://learn.microsoft.com/azure/azure-resource-manager/management/move-resource-group-and-subscription',
    },
    {
      title: 'Use tags to organize resources',
      url: 'https://learn.microsoft.com/azure/azure-resource-manager/management/tag-resources',
    },
    {
      title: 'Create and manage budgets',
      url: 'https://learn.microsoft.com/azure/cost-management-billing/costs/tutorial-acm-create-budgets',
    },
    {
      title: 'Introduction to Azure Advisor',
      url: 'https://learn.microsoft.com/azure/advisor/advisor-overview',
    },
  ],
}
