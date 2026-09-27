import type { Topic } from '../../../types'

export const az1AzurePolicy: Topic = {
  id: 'az1-azure-policy',
  title: 'Azure Policy: definitions, initiatives, effects and remediation',
  domainId: 'az1-identity',
  difficulty: 'advanced',
  estimatedMinutes: 40,
  order: 4,
  tags: [
    'azure-policy',
    'initiative',
    'effects',
    'deny',
    'modify',
    'deployifnotexists',
    'remediation',
    'compliance',
  ],
  oneLiner:
    'Enforce and audit organisational rules on every resource: define what is allowed, assign it at a scope, and remediate what is already out of line.',
  explanation: [
    '**Azure Policy** evaluates resource properties against rules and takes an **effect** when a rule matches. It answers "what is allowed to exist and how must it be configured", while RBAC answers "who is allowed to act". A user can be Owner and still be blocked by a policy that denies public IP addresses.',
    'A **policy definition** is a JSON rule with an `if` condition and a `then` effect, for example "if the resource type is a storage account and `minimumTlsVersion` is not `TLS1_2`, then deny". Microsoft ships hundreds of **built-in** definitions; you can write **custom** ones.',
    'An **initiative** (also called a policy set definition) groups several definitions so you assign and track them together, for example the Microsoft cloud security benchmark or your own "Corporate baseline". A **policy assignment** attaches a definition or initiative to a **scope** (management group, subscription or resource group), sets its **parameters** and can list **exclusions**. An **exemption** waives a specific resource or scope from an assignment, with a reason and optional expiry.',
    'Policy evaluates new and updated resources at deployment time and existing resources in periodic **compliance scans**. For resources that were created before the policy, effects such as **modify** and **deployIfNotExists** need a **remediation task** to fix them; deny never touches existing resources, it only reports them as non-compliant.',
  ],
  whyItMatters: [
    'AZ-104 asks you to implement and manage Azure Policy and to choose the right effect. Questions typically describe a requirement ("tag every resource", "block a region", "deploy the diagnostic setting automatically") and ask which effect or which extra step is needed.',
    'Policy is how governance survives scale. Instead of reviewing every deployment, you encode the rule once at a management group and every subscription beneath it is held to it, including resources created by pipelines.',
    'The remediation model is the part people miss. Knowing that deployIfNotExists and modify need a managed identity with the right role, and that existing resources need a remediation task, is the difference between a policy that works and one that only produces a red compliance chart.',
  ],
  howItWorks: [
    'A definition has `mode` (`All` evaluates resource groups, subscriptions and every type; `Indexed` only evaluates types that support tags and location), `parameters`, and `policyRule` with `if` and `then.effect`. Conditions use `field` expressions such as `type`, `location`, `tags[costCenter]` or property aliases such as `Microsoft.Storage/storageAccounts/minimumTlsVersion`.',
    'Common effects in order of evaluation: **disabled**, **append** and **modify** (change the request before it is processed), **deny** (reject the request with a 403 RequestDisallowedByPolicy), **audit** (allow but log a non-compliant event), then after the resource is created **auditIfNotExists** and **deployIfNotExists** (check for, and optionally deploy, a related resource). **denyAction** blocks specific actions such as delete.',
    '**Modify** adds, replaces or removes tags and certain properties; **append** adds fields to the request (legacy, prefer modify for tags). Both **modify** and **deployIfNotExists** require the assignment to have a **managed identity** (system- or user-assigned) with the roles listed in the definition, because Azure Policy itself makes the change on your behalf.',
    'Assignments have an **enforcement mode**. `Default` enforces effects; `DoNotEnforce` evaluates and reports compliance without denying or deploying anything. It is the safe way to trial a deny policy.',
    'Compliance states are compliant, non-compliant, exempt, conflicting and not started. A new assignment takes about 30 minutes to start evaluating; a standard scan runs roughly every 24 hours, and you can trigger one on demand with `az policy state trigger-scan`.',
    'A **remediation task** runs the modify or deployIfNotExists effect against existing non-compliant resources. You create one per assignment (or per definition inside an initiative) from the portal, CLI or PowerShell.',
    'When several assignments apply, the most restrictive wins: any deny blocks the request. Assignments are inherited down the scope hierarchy, and exclusions or exemptions carve out exceptions.',
  ],
  diagrams: [
    {
      kind: 'flow',
      title: 'What happens when a resource is deployed',
      caption:
        'Modify and append change the request, deny can stop it, and the IfNotExists effects run after creation.',
      nodes: [
        {
          label: 'PUT request reaches ARM',
          detail: 'Portal, CLI, Bicep, pipeline',
          tone: 'accent',
        },
        {
          label: 'Modify and append',
          detail: 'Add tags, set properties',
          arrowLabel: 'policy evaluates',
        },
        {
          label: 'Deny check',
          detail: 'Any matching deny wins',
          branch: { label: '403 RequestDisallowedByPolicy', tone: 'danger' },
        },
        { label: 'Resource created', detail: 'Audit logs non-compliance' },
        {
          label: 'IfNotExists effects',
          detail: 'Check or deploy related resource',
          tone: 'success',
        },
      ],
    },
    {
      kind: 'decision',
      title: 'Choosing a policy effect',
      caption:
        'Pick the gentlest effect that meets the requirement, and trial deny with DoNotEnforce first.',
      question: 'What should happen to a non-compliant resource?',
      branches: [
        { condition: 'Report it, allow it', result: 'audit' },
        { condition: 'Block it from being created', result: 'deny', tone: 'danger' },
        {
          condition: 'Fix a tag or property automatically',
          result: 'modify',
          detail: 'Needs managed identity',
        },
        {
          condition: 'Deploy a companion resource',
          result: 'deployIfNotExists',
          detail: 'Needs managed identity',
          tone: 'accent',
        },
        { condition: 'Report a missing companion', result: 'auditIfNotExists' },
      ],
    },
    {
      kind: 'sequence',
      title: 'Remediating existing resources',
      caption:
        'The assignment identity, not the admin, performs the fix, so it needs the right role at the scope.',
      participants: [
        { id: 'admin', label: 'Administrator' },
        { id: 'policy', label: 'Azure Policy' },
        { id: 'mi', label: 'Assignment identity' },
        { id: 'res', label: 'Existing resources' },
      ],
      messages: [
        { from: 'admin', to: 'policy', label: 'Create remediation task' },
        { from: 'policy', to: 'res', label: 'Find non-compliant resources' },
        { from: 'policy', to: 'mi', label: 'Use identity token' },
        { from: 'mi', to: 'res', label: 'Apply modify or deploy template' },
        { from: 'res', to: 'policy', label: 'Compliance re-evaluated', kind: 'return' },
      ],
    },
  ],
  keyObjects: [
    {
      kind: 'Policy definition (Microsoft.Authorization/policyDefinitions)',
      apiVersion: '2023-04-01',
      purpose:
        'A rule: which resources to look at, what condition makes them non-compliant, and the effect.',
      fields: [
        {
          path: 'properties.mode',
          meaning: 'All or Indexed. Use Indexed for rules on tags or location.',
        },
        {
          path: 'properties.parameters',
          meaning: 'Inputs such as allowed locations or a tag name, set at assignment.',
        },
        {
          path: 'properties.policyRule.if',
          meaning: 'The condition, using field, allOf, anyOf and not.',
          required: true,
        },
        {
          path: 'properties.policyRule.then.effect',
          meaning:
            'audit, deny, modify, append, auditIfNotExists, deployIfNotExists, denyAction or disabled.',
          required: true,
        },
        {
          path: 'properties.policyRule.then.details.roleDefinitionIds',
          meaning: 'Roles the assignment identity needs for modify or deployIfNotExists.',
        },
      ],
    },
    {
      kind: 'Initiative (Microsoft.Authorization/policySetDefinitions)',
      apiVersion: '2023-04-01',
      purpose: 'A group of policy definitions assigned and reported together.',
      fields: [
        {
          path: 'properties.policyDefinitions[]',
          meaning: 'Member definitions with their parameter values.',
        },
        {
          path: 'properties.parameters',
          meaning: 'Initiative-level parameters passed down to members.',
        },
      ],
    },
    {
      kind: 'Policy assignment (Microsoft.Authorization/policyAssignments)',
      apiVersion: '2024-04-01',
      purpose: 'Attaches a definition or initiative to a scope with parameter values.',
      fields: [
        {
          path: 'properties.policyDefinitionId',
          meaning: 'The definition or initiative being assigned.',
          required: true,
        },
        { path: 'properties.enforcementMode', meaning: 'Default or DoNotEnforce.' },
        { path: 'properties.notScopes', meaning: 'Exclusions: child scopes that are skipped.' },
        {
          path: 'identity',
          meaning: 'System or user-assigned identity; required for modify and deployIfNotExists.',
        },
        { path: 'location', meaning: 'Required when an identity is set.' },
      ],
    },
    {
      kind: 'Remediation (Microsoft.PolicyInsights/remediations)',
      apiVersion: '2021-10-01',
      purpose: 'Applies modify or deployIfNotExists to resources that were already non-compliant.',
      fields: [
        {
          path: 'properties.policyAssignmentId',
          meaning: 'The assignment to remediate.',
          required: true,
        },
        {
          path: 'properties.policyDefinitionReferenceId',
          meaning: 'Which member definition, when the assignment is an initiative.',
        },
        {
          path: 'properties.resourceDiscoveryMode',
          meaning: 'ExistingNonCompliant or ReEvaluateCompliance.',
        },
      ],
    },
  ],
  realWorldExample: {
    title: 'Tagging four thousand resources without a script',
    story: [
      'A company had to allocate cloud cost by cost center, but only a third of its resources had a costCenter tag. The finance team asked for every resource to be tagged within a month.',
      'The platform team assigned two built-in policies at the top management group: Require a tag on resource groups (deny) and Inherit a tag from the resource group if missing (modify), both parameterised with costCenter. The modify assignment got a system-assigned managed identity with the Tag Contributor role it needed.',
      'New deployments were tagged automatically. For the existing resources they created a single remediation task, which worked through thousands of resources over an afternoon. Resource groups without a tag were fixed by hand once, and from then on the rule enforced itself.',
    ],
  },
  yamlExamples: [
    {
      title: 'Custom definition: deny storage accounts below TLS 1.2',
      language: 'json',
      code: `{
  "mode": "All",
  "parameters": {
    "effect": {
      "type": "String",
      "allowedValues": ["Audit", "Deny", "Disabled"],
      "defaultValue": "Deny"
    }
  },
  "policyRule": {
    "if": {
      "allOf": [
        { "field": "type", "equals": "Microsoft.Storage/storageAccounts" },
        {
          "field": "Microsoft.Storage/storageAccounts/minimumTlsVersion",
          "notEquals": "TLS1_2"
        }
      ]
    },
    "then": { "effect": "[parameters('effect')]" }
  }
}`,
    },
    {
      title: 'Modify effect: add a tag from the resource group',
      language: 'json',
      explanation:
        'The roleDefinitionIds value is the Tag Contributor role. The assignment identity must hold it at the assignment scope.',
      code: `{
  "mode": "Indexed",
  "parameters": { "tagName": { "type": "String" } },
  "policyRule": {
    "if": {
      "allOf": [
        { "field": "[concat('tags[', parameters('tagName'), ']')]", "exists": "false" },
        { "value": "[resourceGroup().tags[parameters('tagName')]]", "notEquals": "" }
      ]
    },
    "then": {
      "effect": "modify",
      "details": {
        "roleDefinitionIds": [
          "/providers/Microsoft.Authorization/roleDefinitions/4a9ae827-6dc8-4573-8ac7-8239d42aa03f"
        ],
        "operations": [
          {
            "operation": "add",
            "field": "[concat('tags[', parameters('tagName'), ']')]",
            "value": "[resourceGroup().tags[parameters('tagName')]]"
          }
        ]
      }
    }
  }
}`,
    },
    {
      title: 'Assign and remediate with Azure PowerShell',
      language: 'powershell',
      placeholders: ['<subscription-id>'],
      code: `$def = Get-AzPolicyDefinition | Where-Object { $_.DisplayName -eq 'Inherit a tag from the resource group if missing' }
$scope = '/subscriptions/<subscription-id>'

$a = New-AzPolicyAssignment -Name 'inherit-costcenter' -Scope $scope \`
  -PolicyDefinition $def -PolicyParameterObject @{ tagName = 'costCenter' } \`
  -IdentityType SystemAssigned -Location 'westeurope'

New-AzRoleAssignment -ObjectId $a.IdentityPrincipalId -RoleDefinitionName 'Tag Contributor' -Scope $scope

Start-AzPolicyRemediation -Name 'fix-costcenter' -PolicyAssignmentId $a.Id -Scope $scope`,
    },
  ],
  imperative: [
    {
      command:
        'az policy definition list --query "[?displayName==\'Allowed locations\'].name" -o tsv',
      what: 'Finds the name (GUID) of a built-in definition by display name.',
      expected: 'e56962a6-4747-49cd-b67b-bf8b01975c4c',
    },
    {
      command:
        'az policy assignment create --name allowed-locations --scope /subscriptions/<subscription-id> --policy e56962a6-4747-49cd-b67b-bf8b01975c4c --params \'{"listOfAllowedLocations":{"value":["westeurope","northeurope"]}}\'',
      what: 'Assigns the built-in Allowed locations policy (deny effect) to a subscription.',
      placeholders: ['<subscription-id>'],
    },
    {
      command:
        'az policy definition create --name deny-tls-below-12 --rules tls-rule.json --params tls-params.json --mode All',
      what: 'Creates a custom policy definition from rule and parameter files.',
    },
    {
      command:
        'az policy set-definition create --name corp-baseline --definitions @initiative.json',
      what: 'Creates an initiative that groups several definitions.',
    },
    {
      command:
        'az policy remediation create --name fix-tags --policy-assignment inherit-costcenter --resource-discovery-mode ReEvaluateCompliance',
      what: 'Starts a remediation task for an assignment with a modify or deployIfNotExists effect.',
    },
    {
      command:
        'az policy exemption create --name legacy-app --policy-assignment <assignment-id> --exemption-category Waiver --scope <resource-group-id> --expires-on 2026-12-31',
      what: 'Exempts one resource group from an assignment until a date, with a recorded category.',
      placeholders: ['<assignment-id>', '<resource-group-id>'],
    },
  ],
  declarative: {
    steps: [
      'Store custom definitions as JSON or Bicep in the repository and deploy them at the management group so every subscription can use them.',
      'Declare the assignment at the same or a lower scope, with parameters and an identity if the effect needs one.',
      'Grant the identity the roles listed in `roleDefinitionIds`.',
      'Start with `enforcementMode: DoNotEnforce`, review compliance, then switch to `Default`.',
    ],
    code: [
      {
        title: 'Subscription-scope assignment with identity and role',
        language: 'bicep',
        code: `targetScope = 'subscription'

param location string = 'westeurope'

// Built-in: Inherit a tag from the resource group if missing
var inheritTagDefId = '/providers/Microsoft.Authorization/policyDefinitions/ea3f2387-9b95-492a-a190-fcdc54f7b070'
var tagContributorId = '4a9ae827-6dc8-4573-8ac7-8239d42aa03f'

resource inheritTag 'Microsoft.Authorization/policyAssignments@2024-04-01' = {
  name: 'inherit-costcenter'
  location: location
  identity: {
    type: 'SystemAssigned'
  }
  properties: {
    displayName: 'Inherit costCenter from resource group'
    policyDefinitionId: inheritTagDefId
    enforcementMode: 'Default'
    parameters: {
      tagName: { value: 'costCenter' }
    }
  }
}

resource identityRole 'Microsoft.Authorization/roleAssignments@2022-04-01' = {
  name: guid(subscription().id, inheritTag.id, tagContributorId)
  properties: {
    principalId: inheritTag.identity.principalId
    principalType: 'ServicePrincipal'
    roleDefinitionId: subscriptionResourceId('Microsoft.Authorization/roleDefinitions', tagContributorId)
  }
}`,
      },
    ],
  },
  verification: [
    {
      command: 'az policy state summarize --subscription <subscription-id>',
      what: 'Summarises compliance per assignment and per definition.',
      placeholders: ['<subscription-id>'],
    },
    {
      command:
        'az policy state list --filter "complianceState eq \'NonCompliant\'" --query "[].{res:resourceId, policy:policyDefinitionName}" -o table',
      what: 'Lists non-compliant resources and the policy they fail.',
    },
    {
      command: 'az policy remediation list -o table',
      what: 'Shows remediation tasks with their provisioning state and counts of fixed and failed resources.',
    },
    {
      command: 'az policy state trigger-scan --resource-group rg-app',
      what: 'Forces an on-demand compliance scan instead of waiting for the daily cycle.',
    },
  ],
  troubleshooting: [
    {
      command:
        'az monitor activity-log list --offset 1h --query "[?contains(operationName.value, \'Microsoft.Authorization/policies\')]"',
      what: 'A deployment failed with RequestDisallowedByPolicy: the activity log shows which assignment denied it.',
    },
    {
      command: 'az policy remediation deployment list --name fix-tags',
      what: 'A remediation task shows failures: list per-resource deployments and their error messages, often a missing role on the identity.',
    },
    {
      command:
        'az policy assignment show --name inherit-costcenter --query "{mode:enforcementMode, identity:identity.principalId}"',
      what: 'A modify policy does nothing: check the enforcement mode is Default and an identity exists.',
    },
  ],
  commonMistakes: [
    'Expecting deny to delete or fix existing resources. It only blocks new or updated requests; existing ones show as non-compliant.',
    'Assigning a modify or deployIfNotExists policy without a managed identity or without granting that identity the required role.',
    'Forgetting to create a remediation task for resources that existed before the assignment.',
    'Using mode All for a tag or location rule, so resource types that do not support tags produce noise. Use Indexed.',
    'Confusing exclusions (notScopes on the assignment) with exemptions (separate objects with category and expiry).',
    'Thinking Owner overrides policy. Policy applies to everyone regardless of RBAC role.',
  ],
  examTips: [
    'Map requirement to effect: block is deny, report is audit, add or fix tags is modify, deploy a related resource (diagnostic settings, an agent, a backup) is deployIfNotExists.',
    'Existing non-compliant resources are fixed by a remediation task, never by the assignment alone.',
    'An initiative is the answer whenever the scenario says group several policies and track compliance together.',
    'Policies can be assigned at management group, subscription or resource group scope, and definitions must be saved at a management group or subscription so assignments below can see them.',
    'Allowed locations and Allowed resource types are the classic built-in deny policies. Not allowed resource types blocks specific types.',
    'RBAC controls who; policy controls what. If a Contributor cannot create a VM in East US but can in West Europe, think policy.',
  ],
  summary: [
    'A definition is if-then rule; an initiative groups definitions; an assignment applies them to a scope.',
    'Effects: audit, deny, modify, append, auditIfNotExists, deployIfNotExists, denyAction, disabled.',
    'Modify and deployIfNotExists need a managed identity with the right roles.',
    'Remediation tasks fix existing resources; new resources are handled at deployment time.',
    'DoNotEnforce lets you measure impact before you block anything.',
  ],
  practice: [
    {
      id: 'az1-azure-policy-p1',
      level: 'beginner',
      prompt:
        'You must ensure no one can create resources outside West Europe and North Europe. Which built-in policy and effect do you use?',
      answer:
        'Allowed locations, whose effect is deny, assigned at the subscription or management group with those two regions in the parameter.',
    },
    {
      id: 'az1-azure-policy-p2',
      level: 'intermediate',
      prompt:
        'You assign a policy that adds a missing env tag. New resources get the tag, but 300 existing resources do not. What is missing?',
      answer:
        'A remediation task for the assignment. The modify effect only applies automatically to new or updated resources.',
    },
    {
      id: 'az1-azure-policy-p3',
      level: 'intermediate',
      prompt:
        'Your remediation task for a deployIfNotExists policy fails with an authorization error on every resource. What do you check?',
      answer:
        'The assignment managed identity: it must exist and hold the roles listed in the definition roleDefinitionIds (for example Contributor or Monitoring Contributor) at the assignment scope.',
    },
    {
      id: 'az1-azure-policy-p4',
      level: 'advanced',
      prompt:
        'Security wants to know how many production deployments a new deny policy would break, without breaking any. How?',
      answer:
        'Assign it with enforcementMode DoNotEnforce (or with the audit effect via a parameter), let compliance evaluate, review non-compliant resources and activity, then switch to Default.',
    },
  ],
  lab: {
    title: 'Enforce TLS and inherit tags',
    scenario:
      'Create a custom deny policy, assign a built-in modify policy with an identity, and remediate existing resources.',
    prerequisites: ['An Azure subscription where you are Owner', 'Cloud Shell (Bash)'],
    tasks: [
      {
        instruction:
          'Create resource group rg-pol-lab with tag costCenter=lab, and a storage account in it before any policy exists.',
      },
      {
        instruction:
          'Create a custom definition that denies storage accounts whose minimumTlsVersion is not TLS1_2, and assign it to rg-pol-lab.',
        hint: 'Wait a few minutes after assigning before testing.',
      },
      {
        instruction:
          'Try to create a storage account with --min-tls-version TLS1_0 and confirm it is denied.',
      },
      {
        instruction:
          'Assign Inherit a tag from the resource group if missing (tagName costCenter) with a system-assigned identity, and give it Tag Contributor.',
      },
      {
        instruction:
          'Create a remediation task and confirm the existing storage account now has costCenter=lab.',
      },
      { instruction: 'Summarise compliance for the resource group.' },
    ],
    solution: [
      {
        title: 'Lab commands',
        language: 'bash',
        code: `RG=rg-pol-lab; LOC=westeurope
az group create -n $RG -l $LOC --tags costCenter=lab
az storage account create -n pollab$RANDOM -g $RG -l $LOC --sku Standard_LRS
RGID=$(az group show -n $RG --query id -o tsv)

cat > rule.json <<'EOF'
{ "if": { "allOf": [
  { "field": "type", "equals": "Microsoft.Storage/storageAccounts" },
  { "field": "Microsoft.Storage/storageAccounts/minimumTlsVersion", "notEquals": "TLS1_2" } ] },
  "then": { "effect": "deny" } }
EOF
az policy definition create -n lab-deny-tls --rules rule.json --mode All
az policy assignment create -n lab-deny-tls --policy lab-deny-tls --scope $RGID

# after a few minutes: expect RequestDisallowedByPolicy
az storage account create -n polbad$RANDOM -g $RG -l $LOC --min-tls-version TLS1_0

DEF=$(az policy definition list --query "[?displayName=='Inherit a tag from the resource group if missing'].name" -o tsv)
PID=$(az policy assignment create -n lab-inherit --policy $DEF --scope $RGID \\
  --params '{"tagName":{"value":"costCenter"}}' --mi-system-assigned --location $LOC \\
  --query identity.principalId -o tsv)
az role assignment create --assignee-object-id $PID --assignee-principal-type ServicePrincipal \\
  --role "Tag Contributor" --scope $RGID

az policy remediation create -n lab-fix --policy-assignment lab-inherit -g $RG`,
      },
    ],
    verification: [
      {
        command:
          'az resource list -g rg-pol-lab --query "[].{name:name, cc:tags.costCenter}" -o table',
        what: 'Shows costCenter=lab on the pre-existing storage account after remediation.',
      },
      {
        command: 'az policy state summarize --resource-group rg-pol-lab',
        what: 'Shows compliance results for both assignments.',
      },
    ],
    cleanup: [
      {
        command:
          'az policy assignment delete -n lab-deny-tls --scope $RGID; az policy assignment delete -n lab-inherit --scope $RGID; az policy definition delete -n lab-deny-tls; az group delete -n rg-pol-lab --yes --no-wait',
        what: 'Removes the assignments, the custom definition and the resource group.',
      },
    ],
  },
  relatedTopicIds: ['az1-subscriptions-governance', 'az1-rbac', 'az1-storage-accounts'],
  docs: [
    {
      title: 'What is Azure Policy?',
      url: 'https://learn.microsoft.com/azure/governance/policy/overview',
    },
    {
      title: 'Azure Policy definition structure',
      url: 'https://learn.microsoft.com/azure/governance/policy/concepts/definition-structure-basics',
    },
    {
      title: 'Understand Azure Policy effects',
      url: 'https://learn.microsoft.com/azure/governance/policy/concepts/effect-basics',
    },
    {
      title: 'Remediate non-compliant resources',
      url: 'https://learn.microsoft.com/azure/governance/policy/how-to/remediate-resources',
    },
    {
      title: 'Azure Policy exemption structure',
      url: 'https://learn.microsoft.com/azure/governance/policy/concepts/exemption-structure',
    },
  ],
}
