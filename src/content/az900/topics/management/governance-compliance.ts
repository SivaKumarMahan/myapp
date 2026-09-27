import type { Topic } from '../../../types'

export const governanceCompliance: Topic = {
  id: 'az9-governance-compliance',
  title: 'Governance and compliance: Purview, Azure Policy, locks and the Service Trust Portal',
  domainId: 'az9-management',
  difficulty: 'intermediate',
  estimatedMinutes: 22,
  order: 2,
  tags: [
    'azure policy',
    'initiatives',
    'resource locks',
    'purview',
    'service trust portal',
    'compliance',
    'governance',
  ],
  oneLiner:
    'The tools that keep an Azure estate within the rules: policy to enforce standards, locks to prevent accidents, Purview to govern data, and the Service Trust Portal to prove compliance.',
  explanation: [
    '**Governance** means making sure everything deployed follows your organisation rules - approved regions, approved sizes, required tags, encryption on. **Compliance** means being able to show auditors and regulators that you, and Microsoft, meet specific standards such as ISO 27001 or GDPR. AZ-900 tests four tools for this.',
    '**Azure Policy** evaluates resources against rules you define and enforces them. A **policy definition** is one rule, such as "allowed locations". An **initiative** (policy set) groups several definitions, such as all the controls for a regulatory standard. An **assignment** applies a definition or initiative to a scope - a management group, subscription or resource group - and it is inherited by everything beneath. Policy can **deny** non-compliant deployments, **audit** them, or even **modify** and remediate existing resources.',
    '**Resource locks** protect resources from accidental change. A **CanNotDelete** lock (Delete in the portal) lets people read and modify a resource but not delete it. A **ReadOnly** lock lets people read it but not modify or delete it. Locks apply to everyone, including Owners, and they are inherited by child resources. To delete a locked resource, you must first remove the lock.',
    '**Microsoft Purview** is a family of data governance, risk and compliance solutions. It helps you discover, classify and map data across Azure, on-premises, multicloud and SaaS sources (the unified data governance side), and protect and govern Microsoft 365 data with features such as sensitivity labels and data loss prevention (the risk and compliance side). The **Service Trust Portal** is where Microsoft publishes its audit reports, certifications and compliance documentation so you can review them.',
  ],
  whyItMatters: [
    'Governance and compliance is a named objective in the management domain. Questions ask you to pick between Policy, locks, RBAC and Purview for a given requirement, and to recall what each lock type allows.',
    'In practice, Policy is how large organisations let many teams deploy freely while staying inside guardrails. Locks are the cheap insurance that stops someone deleting a production database with a mistyped command.',
    'Regulated industries need evidence. The Service Trust Portal provides Microsoft side of that evidence; Purview and Policy compliance reports provide yours.',
  ],
  howItWorks: [
    'A policy definition is JSON with an `if` condition and a `then` effect. Built-in definitions cover hundreds of common rules; you can also write custom ones. When assigned, Azure Policy evaluates new and updated resources at deployment time and re-evaluates existing resources periodically, producing a **compliance** view per assignment.',
    'Effects include **Deny** (block the request), **Audit** (allow but flag), **Append** and **Modify** (add or change properties such as tags), **DeployIfNotExists** (deploy a related resource, such as a diagnostic setting) and **AuditIfNotExists**. Existing non-compliant resources can be fixed with a **remediation task** for Modify and DeployIfNotExists effects.',
    'Assignments inherit down the hierarchy: assign at a management group and every subscription, resource group and resource underneath is evaluated. You can add exclusions and exemptions for specific scopes.',
    'Policy is different from **Azure RBAC**. RBAC controls **who** can perform actions; Policy controls **what** resources may look like, regardless of who deploys them. An Owner is still blocked by a Deny policy.',
    'Resource locks are applied at subscription, resource group or resource scope. Only principals with `Microsoft.Authorization/locks/*` permission (for example Owner or User Access Administrator) can create or remove them. A ReadOnly lock can have surprising side effects - for example it can block operations that are POST requests, such as listing storage account keys.',
    'Purview scans registered data sources, builds a data map and catalogue, and applies classifications. The Service Trust Portal requires a Microsoft account sign-in for some documents and offers audit reports (SOC, ISO), data protection resources and compliance guides.',
  ],
  diagrams: [
    {
      kind: 'decision',
      title: 'Which governance tool meets the requirement?',
      caption:
        'Policy governs what resources look like, locks prevent deletion or change, RBAC governs who can act, Purview governs data.',
      question: 'What is the requirement?',
      branches: [
        {
          condition: 'only allow certain regions or sizes',
          result: 'Azure Policy',
          detail: 'Deny or audit non-compliant resources',
          tone: 'accent',
        },
        {
          condition: 'nobody may delete this resource',
          result: 'CanNotDelete lock',
          detail: 'Applies even to Owners',
          tone: 'warning',
        },
        {
          condition: 'nobody may change this resource',
          result: 'ReadOnly lock',
          detail: 'Blocks modify and delete',
          tone: 'danger',
        },
        {
          condition: 'limit who can create resources',
          result: 'Azure RBAC',
          detail: 'Roles assigned at a scope',
        },
        {
          condition: 'discover and classify sensitive data',
          result: 'Microsoft Purview',
          detail: 'Data map, catalogue, labels',
          tone: 'success',
        },
        {
          condition: 'read Microsoft audit reports',
          result: 'Service Trust Portal',
          detail: 'SOC and ISO reports',
        },
      ],
    },
    {
      kind: 'sequence',
      title: 'A deployment meets a Deny policy',
      caption:
        'Azure Policy sits in the Resource Manager request path, so a non-compliant request is refused before anything is created.',
      participants: [
        { id: 'user', label: 'Engineer' },
        { id: 'arm', label: 'Resource Manager' },
        { id: 'policy', label: 'Azure Policy' },
      ],
      messages: [
        { from: 'user', to: 'arm', label: 'Create VM in westus' },
        { from: 'arm', to: 'policy', label: 'Evaluate assignments' },
        { from: 'policy', to: 'arm', label: 'Allowed locations: Deny', kind: 'return' },
        { from: 'arm', to: 'user', label: 'RequestDisallowedByPolicy', kind: 'return' },
      ],
    },
  ],
  keyObjects: [
    {
      kind: 'Policy assignment (Microsoft.Authorization/policyAssignments)',
      apiVersion: '2024-04-01',
      purpose: 'Applies a policy definition or initiative to a scope.',
      fields: [
        {
          path: 'properties.policyDefinitionId',
          meaning: 'The definition or initiative being assigned.',
          required: true,
        },
        {
          path: 'properties.parameters',
          meaning: 'Values for the definition, such as the list of allowed locations.',
        },
        { path: 'properties.notScopes', meaning: 'Child scopes excluded from the assignment.' },
        {
          path: 'properties.enforcementMode',
          meaning: 'Default enforces effects; DoNotEnforce only reports.',
        },
      ],
    },
    {
      kind: 'Policy definition (Microsoft.Authorization/policyDefinitions)',
      apiVersion: '2023-04-01',
      purpose: 'A single rule: condition plus effect.',
      fields: [
        {
          path: 'properties.policyRule.if',
          meaning: 'The condition that selects resources.',
          required: true,
        },
        {
          path: 'properties.policyRule.then.effect',
          meaning: 'Deny, Audit, Modify, Append, DeployIfNotExists, and so on.',
          required: true,
        },
        {
          path: 'properties.mode',
          meaning:
            'All (resource groups and resources) or Indexed (only types that support tags and location).',
        },
      ],
    },
    {
      kind: 'Management lock (Microsoft.Authorization/locks)',
      apiVersion: '2020-05-01',
      purpose: 'Prevents deletion or modification of a scope and its children.',
      fields: [
        { path: 'properties.level', meaning: 'CanNotDelete or ReadOnly.', required: true },
        { path: 'properties.notes', meaning: 'Why the lock exists - helps the next person.' },
      ],
    },
    {
      kind: 'Compliance tools (concept)',
      purpose: 'Where compliance evidence comes from.',
      fields: [
        {
          path: 'servicetrustPortal',
          meaning: 'Microsoft audit reports, certifications and whitepapers.',
        },
        {
          path: 'purview',
          meaning: 'Data governance, classification, and Microsoft 365 risk and compliance.',
        },
        {
          path: 'policyCompliance',
          meaning: 'Per-assignment compliance state of your own resources.',
        },
      ],
    },
  ],
  realWorldExample: {
    title: 'Guardrails for a hundred developers',
    story: [
      'A bank gave each product team its own subscription so they could move fast. Within weeks, security found VMs in regions outside the bank data residency rules and storage accounts reachable from the internet.',
      'The platform team created a management group for all product subscriptions and assigned an initiative there: allowed locations (two European regions), deny public network access on storage, require a CostCenter tag on resource groups, and deploy diagnostic settings to a central Log Analytics workspace. Every existing and future subscription inherited it.',
      'The shared networking and Key Vault resource groups received CanNotDelete locks. Months later an engineer ran a cleanup script against the wrong subscription; the locked groups survived untouched and the script failed loudly.',
      'For the annual audit, the bank downloaded Microsoft SOC 2 and ISO 27001 reports from the Service Trust Portal and paired them with its own Azure Policy compliance export, covering both sides of the shared responsibility model.',
    ],
  },
  yamlExamples: [
    {
      title: 'Assigning the built-in Allowed locations policy in Bicep',
      language: 'bicep',
      explanation:
        'The definition id is the well-known GUID of the built-in policy. The assignment is made at resource group scope here; the same resource works at subscription or management group scope with a different targetScope.',
      code: `param allowedLocations array = [
  'westeurope'
  'northeurope'
]

resource allowedLocs 'Microsoft.Authorization/policyAssignments@2024-04-01' = {
  name: 'allowed-locations'
  properties: {
    displayName: 'Allowed locations'
    policyDefinitionId: '/providers/Microsoft.Authorization/policyDefinitions/e56962a6-4747-49cd-b67b-bf8b01975c4c'
    parameters: {
      listOfAllowedLocations: { value: allowedLocations }
    }
  }
}

resource noDelete 'Microsoft.Authorization/locks@2020-05-01' = {
  name: 'protect-rg'
  properties: {
    level: 'CanNotDelete'
    notes: 'Shared resources - remove only with change approval'
  }
}`,
    },
    {
      title: 'A custom policy rule that denies public blob access',
      language: 'json',
      explanation:
        'The if block selects storage accounts that allow public blob access; the then block denies them.',
      code: `{
  "mode": "All",
  "policyRule": {
    "if": {
      "allOf": [
        { "field": "type", "equals": "Microsoft.Storage/storageAccounts" },
        { "field": "Microsoft.Storage/storageAccounts/allowBlobPublicAccess", "equals": true }
      ]
    },
    "then": { "effect": "deny" }
  }
}`,
    },
  ],
  imperative: [
    {
      command:
        'az policy assignment create --name allowed-locations --scope /subscriptions/<sub-id>/resourceGroups/rg-az900-gov --policy e56962a6-4747-49cd-b67b-bf8b01975c4c --params \'{"listOfAllowedLocations":{"value":["westeurope"]}}\'',
      what: 'Assigns the built-in Allowed locations policy to a resource group.',
      expected: 'JSON describing the assignment.',
      placeholders: ['<sub-id>'],
    },
    {
      command:
        'az lock create --name protect-rg --resource-group rg-az900-gov --lock-type CanNotDelete --notes "Shared resources"',
      what: 'Adds a delete lock to a resource group.',
      expected: '"level": "CanNotDelete"',
    },
    {
      command:
        'az lock create --name freeze-sa --resource-group rg-az900-gov --resource-name <storname> --resource-type Microsoft.Storage/storageAccounts --lock-type ReadOnly',
      what: 'Adds a read-only lock to a single resource.',
      placeholders: ['<storname>'],
    },
    {
      command:
        'New-AzResourceLock -LockName protect-rg -LockLevel CanNotDelete -ResourceGroupName rg-az900-gov',
      what: 'PowerShell equivalent for a resource group delete lock.',
    },
  ],
  declarative: {
    steps: [
      'Create a resource group for the lab.',
      'Write a Bicep file containing a policy assignment and a CanNotDelete lock.',
      'Deploy it at resource group scope.',
      'Try to create a resource in a disallowed region and try to delete the group; both should fail.',
    ],
    code: [
      {
        title: 'Deploy governance as code',
        language: 'bash',
        code: `az group create -n rg-az900-gov -l westeurope
az deployment group create -g rg-az900-gov --template-file governance.bicep`,
      },
    ],
  },
  verification: [
    {
      command: 'az policy assignment list --resource-group rg-az900-gov -o table',
      what: 'Lists policy assignments that apply at this scope.',
    },
    {
      command: 'az policy state summarize --resource-group rg-az900-gov',
      what: 'Summarises compliant and non-compliant resources for the scope.',
    },
    {
      command: 'az lock list --resource-group rg-az900-gov -o table',
      what: 'Lists locks on the group and its resources.',
      expected: 'protect-rg  CanNotDelete',
    },
  ],
  troubleshooting: [
    {
      command: 'az group delete -n rg-az900-gov --yes',
      what: 'Fails while a lock exists - the error names the lock. Remove it first.',
      expected:
        'ScopeLocked: The scope ... cannot perform delete operation because following scope(s) are locked',
    },
    {
      command:
        'az storage account create -n <storname> -g rg-az900-gov -l eastus --sku Standard_LRS',
      what: 'A Deny policy returns RequestDisallowedByPolicy with the assignment name.',
      expected: 'RequestDisallowedByPolicy',
      placeholders: ['<storname>'],
    },
    {
      command: 'az policy state trigger-scan --resource-group rg-az900-gov',
      what: 'Starts an on-demand compliance evaluation instead of waiting for the periodic scan.',
      namespaceNote: 'New assignments can take a while before compliance results appear.',
    },
  ],
  commonMistakes: [
    'Using RBAC to enforce resource settings. RBAC controls who can act; Policy controls what is allowed.',
    'Thinking Owners can bypass a lock. Locks apply to everyone until the lock itself is removed.',
    'Confusing lock types: CanNotDelete still allows changes; ReadOnly blocks changes and deletion.',
    'Expecting a new Deny policy to delete or fix existing non-compliant resources. Existing ones are flagged; fixing requires remediation for Modify or DeployIfNotExists effects.',
    'Looking for Microsoft audit reports in Azure Policy. They are in the Service Trust Portal.',
  ],
  examTips: [
    'Azure Policy: enforce standards, evaluate compliance, remediate. Initiative = a group of policy definitions.',
    'Policies and locks are inherited from parent scopes to children.',
    'CanNotDelete = read and modify, no delete. ReadOnly = read only.',
    'Microsoft Purview = data governance and risk and compliance across your data estate.',
    'Service Trust Portal = Microsoft compliance reports and documentation.',
  ],
  summary: [
    'Azure Policy evaluates and enforces rules on resources, grouped into initiatives and assigned at scopes.',
    'Resource locks (CanNotDelete, ReadOnly) prevent accidental deletion or change, even by Owners.',
    'Policy governs what resources look like; RBAC governs who can act.',
    'Microsoft Purview discovers, classifies and governs data across the estate.',
    'The Service Trust Portal publishes Microsoft audit reports and compliance documents.',
  ],
  practice: [
    {
      id: 'az9-governance-compliance-p1',
      level: 'beginner',
      prompt:
        'You must stop anyone creating resources outside West Europe in a subscription. Which service do you use?',
      answer:
        'Azure Policy, assigning the built-in Allowed locations definition to the subscription.',
    },
    {
      id: 'az9-governance-compliance-p2',
      level: 'beginner',
      prompt:
        'A resource has a CanNotDelete lock. Can an Owner change its configuration? Can they delete it?',
      answer: 'They can change its configuration but cannot delete it until the lock is removed.',
    },
    {
      id: 'az9-governance-compliance-p3',
      level: 'intermediate',
      prompt: 'What is the difference between a policy definition and an initiative?',
      answer:
        'A definition is a single rule with a condition and effect. An initiative is a named collection of definitions assigned together, often mapping to a standard.',
    },
    {
      id: 'az9-governance-compliance-p4',
      level: 'intermediate',
      prompt:
        'An auditor asks for evidence that Microsoft datacenters are ISO 27001 certified. Where do you get it?',
      answer:
        'Download the ISO 27001 audit report and certificate from the Microsoft Service Trust Portal.',
    },
  ],
  lab: {
    title: 'Put guardrails on a resource group',
    scenario: 'Assign an Allowed locations policy, add a delete lock, and watch both block you.',
    prerequisites: ['An Azure subscription where you are Owner', 'Cloud Shell'],
    tasks: [
      { instruction: 'Create resource group `rg-az900-gov` in westeurope.' },
      {
        instruction:
          'Assign the built-in Allowed locations policy to the group, allowing only westeurope.',
        hint: 'Search for it with az policy definition list --query "[?displayName==\'Allowed locations\']".',
      },
      {
        instruction: 'Try to create a storage account in eastus in that group and read the error.',
      },
      { instruction: 'Create a storage account in westeurope - it should succeed.' },
      { instruction: 'Add a CanNotDelete lock to the group and try to delete the group.' },
      { instruction: 'Open Policy > Compliance in the portal and find your assignment.' },
    ],
    solution: [
      {
        title: 'CLI steps',
        language: 'bash',
        code: `SUB=$(az account show --query id -o tsv)
az group create -n rg-az900-gov -l westeurope
az policy assignment create --name allowed-locations \\
  --scope /subscriptions/$SUB/resourceGroups/rg-az900-gov \\
  --policy e56962a6-4747-49cd-b67b-bf8b01975c4c \\
  --params '{"listOfAllowedLocations":{"value":["westeurope"]}}'

az storage account create -n <storname1> -g rg-az900-gov -l eastus --sku Standard_LRS      # denied
az storage account create -n <storname2> -g rg-az900-gov -l westeurope --sku Standard_LRS  # allowed

az lock create -n protect-rg -g rg-az900-gov --lock-type CanNotDelete
az group delete -n rg-az900-gov --yes   # fails: ScopeLocked`,
        placeholders: ['<storname1>', '<storname2>'],
      },
    ],
    verification: [
      {
        command: 'az lock list -g rg-az900-gov -o table',
        what: 'Shows the delete lock.',
        expected: 'protect-rg  CanNotDelete',
      },
      {
        command:
          'az policy assignment show --name allowed-locations --scope /subscriptions/<sub-id>/resourceGroups/rg-az900-gov --query displayName',
        what: 'Confirms the assignment exists.',
        placeholders: ['<sub-id>'],
      },
    ],
    cleanup: [
      {
        command: 'az lock delete -n protect-rg -g rg-az900-gov',
        what: 'Removes the lock so the group can be deleted.',
      },
      {
        command:
          'az policy assignment delete --name allowed-locations --scope /subscriptions/<sub-id>/resourceGroups/rg-az900-gov',
        what: 'Removes the policy assignment.',
        placeholders: ['<sub-id>'],
      },
      {
        command: 'az group delete -n rg-az900-gov --yes --no-wait',
        what: 'Deletes the group and the storage account.',
      },
    ],
  },
  relatedTopicIds: [
    'az9-cost-management',
    'az9-core-architecture',
    'az9-identity-security',
    'az9-deployment-tools',
  ],
  docs: [
    {
      title: 'What is Azure Policy?',
      url: 'https://learn.microsoft.com/azure/governance/policy/overview',
    },
    {
      title: 'Lock your resources to protect your infrastructure',
      url: 'https://learn.microsoft.com/azure/azure-resource-manager/management/lock-resources',
    },
    {
      title: 'Learn about Microsoft Purview',
      url: 'https://learn.microsoft.com/purview/purview',
    },
    {
      title: 'Get started with the Service Trust Portal',
      url: 'https://learn.microsoft.com/purview/get-started-with-service-trust-portal',
    },
  ],
}
