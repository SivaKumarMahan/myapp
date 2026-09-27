import type { Topic } from '../../../types'

export const az1Rbac: Topic = {
  id: 'az1-rbac',
  title: 'Azure role-based access control (RBAC)',
  domainId: 'az1-identity',
  difficulty: 'intermediate',
  estimatedMinutes: 35,
  order: 2,
  tags: ['rbac', 'role-assignment', 'custom-roles', 'scope', 'inheritance', 'entra-roles'],
  oneLiner:
    'Grant exactly the access people and workloads need by assigning a role definition to a security principal at a scope.',
  explanation: [
    '**Azure role-based access control (Azure RBAC)** decides who can do what to which Azure resources. Every grant is a **role assignment** made of three parts: a **security principal** (user, group, service principal or managed identity), a **role definition** (a list of allowed actions) and a **scope** (where the permissions apply).',
    'Scopes form a hierarchy: **management group**, **subscription**, **resource group**, **resource**. An assignment at a higher scope is **inherited** by everything beneath it, so Reader on a subscription means Reader on every resource group and resource inside it. You cannot block inheritance with an ordinary role assignment; permissions are additive.',
    'Azure ships hundreds of **built-in roles**. Four are fundamental: **Owner** (full access plus the right to grant access), **Contributor** (full access to manage resources but cannot grant access), **Reader** (view only) and **User Access Administrator** (manage access only). There is also **Role Based Access Control Administrator**, which can manage assignments but can be constrained by conditions to specific roles or principals. When no built-in role fits, you create a **custom role** with your own list of actions.',
    'Azure RBAC is separate from **Microsoft Entra roles** such as Global Administrator, User Administrator or Groups Administrator. Entra roles control the directory (users, groups, app registrations); Azure roles control Azure resources. A Global Administrator has no access to subscriptions by default, though they can temporarily elevate to User Access Administrator at root scope.',
  ],
  whyItMatters: [
    'AZ-104 asks you to manage built-in roles, assign roles at different scopes and interpret access assignments. Many questions describe a principal, a few assignments at different levels and ask what the user can actually do.',
    'Least privilege is the most common security review finding. Knowing the difference between Contributor and Owner, or between Virtual Machine Contributor and Network Contributor, is what lets you delegate safely.',
    'Workloads need access too. A managed identity given Storage Blob Data Reader on a single storage account is the modern replacement for sharing account keys, and it is granted with exactly the same role assignment mechanics.',
  ],
  howItWorks: [
    'A role definition lists `actions` (control-plane operations such as `Microsoft.Compute/virtualMachines/start/action`), `notActions` (subtracted from actions), `dataActions` and `notDataActions` (data-plane operations such as reading blob contents) and `assignableScopes` (where a custom role can be used).',
    'Effective permissions are `actions` minus `notActions`, plus `dataActions` minus `notDataActions`, unioned across every assignment that applies to the principal, including those through group membership and inherited from parent scopes.',
    '`notActions` is **not a deny**. It only removes permissions from that one role; another role assignment can still grant them. Real denies come from **deny assignments**, which you cannot create directly; they are created by Azure Deployment Stacks and managed applications, and they take precedence over role assignments.',
    'Control-plane and data-plane permissions are separate. **Contributor** on a storage account can list keys (and so read data through the keys), but a user with no key access who signs in with Entra ID needs a data role such as **Storage Blob Data Reader** to read blobs.',
    'Custom roles are created from a JSON definition with `az role definition create`. Their `assignableScopes` can be management groups, subscriptions or resource groups. Changes to role assignments can take several minutes to take effect, and sign-in tokens may need refreshing.',
    'Assigning roles requires `Microsoft.Authorization/roleAssignments/write`, which Owner, User Access Administrator and Role Based Access Control Administrator have. Contributor does not.',
    '**Privileged Identity Management (PIM)**, with Entra ID P2, makes assignments **eligible** instead of permanent: users activate the role just-in-time, optionally with approval, MFA and a justification.',
  ],
  diagrams: [
    {
      kind: 'nested',
      title: 'Scopes and inheritance in Azure RBAC',
      caption:
        'An assignment flows down to every child scope. Grant at the lowest scope that does the job.',
      root: {
        label: 'Management group: Corp',
        detail: 'Reader for the audit group',
        tone: 'accent',
        children: [
          {
            label: 'Subscription: Prod',
            detail: 'Contributor for platform team',
            children: [
              {
                label: 'Resource group: rg-web',
                detail: 'Website Contributor for web devs',
                children: [
                  { label: 'App Service: web01', detail: 'Inherits all three', tone: 'success' },
                ],
              },
            ],
          },
        ],
      },
    },
    {
      kind: 'decision',
      title: 'Which role should you assign?',
      caption:
        'Start with the most specific built-in role. Custom roles are for the gaps, not the default.',
      question: 'What does the principal need to do?',
      branches: [
        { condition: 'Only view resources', result: 'Reader' },
        {
          condition: 'Manage resources, not access',
          result: 'Contributor or a service-specific role',
        },
        {
          condition: 'Manage access, not resources',
          result: 'User Access Administrator or RBAC Administrator',
        },
        { condition: 'Everything including access', result: 'Owner', tone: 'warning' },
        {
          condition: 'Read blob or queue data via Entra ID',
          result: 'Storage Blob or Queue Data role',
          tone: 'accent',
        },
        { condition: 'No built-in role fits', result: 'Custom role with assignableScopes' },
      ],
    },
  ],
  keyObjects: [
    {
      kind: 'Role assignment (Microsoft.Authorization/roleAssignments)',
      apiVersion: '2022-04-01',
      purpose:
        'Binds a role definition to a principal at a scope. This is the thing that actually grants access.',
      fields: [
        {
          path: 'properties.principalId',
          meaning: 'Object ID of the user, group, service principal or managed identity.',
          required: true,
        },
        {
          path: 'properties.roleDefinitionId',
          meaning: 'Full ID of the built-in or custom role definition.',
          required: true,
        },
        {
          path: 'properties.principalType',
          meaning:
            'User, Group or ServicePrincipal. Set it to avoid replication-delay failures for new principals.',
        },
        {
          path: 'properties.condition',
          meaning: 'Optional ABAC condition, for example limiting blob access by tag.',
        },
        {
          path: 'name',
          meaning: 'A GUID. Use guid() in Bicep for a deterministic, idempotent name.',
        },
      ],
    },
    {
      kind: 'Role definition (Microsoft.Authorization/roleDefinitions)',
      apiVersion: '2022-04-01',
      purpose:
        'A named set of permissions. Built-in definitions are managed by Microsoft; custom ones by you.',
      fields: [
        {
          path: 'properties.permissions[].actions',
          meaning:
            'Allowed control-plane operations; wildcards such as Microsoft.Compute/* are allowed.',
        },
        {
          path: 'properties.permissions[].notActions',
          meaning: 'Operations removed from actions. Not a deny.',
        },
        {
          path: 'properties.permissions[].dataActions',
          meaning: 'Allowed data-plane operations such as blob read.',
        },
        { path: 'properties.assignableScopes', meaning: 'Where a custom role may be assigned.' },
      ],
    },
    {
      kind: 'Microsoft Entra role',
      purpose:
        'A directory role such as Global Administrator or User Administrator. Governs Entra objects, not Azure resources.',
      fields: [
        {
          path: 'scope',
          meaning: 'Tenant-wide, or an administrative unit, or a single app registration.',
        },
        {
          path: 'elevateAccess',
          meaning:
            'A Global Administrator can toggle Access management for Azure resources to gain User Access Administrator at root scope.',
        },
      ],
    },
  ],
  realWorldExample: {
    title: 'The contractor who could not restart a VM',
    story: [
      'A managed service provider was given Reader on a subscription and Virtual Machine Contributor on one resource group. Their engineer could see every VM but the Restart button was greyed out on a VM in a second resource group, and a ticket was raised saying RBAC was broken.',
      'Interpreting the access was straightforward: the Access control (IAM) blade on the VM, under Check access, showed only the inherited Reader assignment. Virtual Machine Contributor applied to the first resource group only. RBAC was working exactly as designed.',
      'Rather than widening the grant to Contributor on the subscription, the team created a custom role with just start, restart and deallocate actions and assigned it to the MSP group at the second resource group. The security team approved it in a day because the JSON listed exactly what was allowed.',
    ],
  },
  yamlExamples: [
    {
      title: 'Custom role definition: VM operator',
      language: 'json',
      explanation:
        'Allows reading and power operations on VMs, nothing else. The assignableScopes list limits where the role can be used.',
      placeholders: ['<subscription-id>'],
      code: `{
  "Name": "Virtual Machine Operator (custom)",
  "IsCustom": true,
  "Description": "Start, restart and deallocate VMs; read VMs and their network.",
  "Actions": [
    "Microsoft.Compute/virtualMachines/read",
    "Microsoft.Compute/virtualMachines/start/action",
    "Microsoft.Compute/virtualMachines/restart/action",
    "Microsoft.Compute/virtualMachines/deallocate/action",
    "Microsoft.Network/networkInterfaces/read",
    "Microsoft.Resources/subscriptions/resourceGroups/read"
  ],
  "NotActions": [],
  "DataActions": [],
  "NotDataActions": [],
  "AssignableScopes": ["/subscriptions/<subscription-id>"]
}`,
    },
    {
      title: 'Assign roles with Azure PowerShell',
      language: 'powershell',
      placeholders: ['<group-object-id>', '<subscription-id>'],
      code: `# Contributor for a group on one resource group
New-AzRoleAssignment -ObjectId '<group-object-id>' \`
  -RoleDefinitionName 'Contributor' \`
  -ResourceGroupName 'rg-web'

# Reader at subscription scope
New-AzRoleAssignment -ObjectId '<group-object-id>' \`
  -RoleDefinitionName 'Reader' \`
  -Scope '/subscriptions/<subscription-id>'

# Everything that applies to a user, including inherited and via groups
Get-AzRoleAssignment -SignInName 'ana@contoso.com' -ExpandPrincipalGroups |
  Select-Object RoleDefinitionName, Scope`,
    },
  ],
  imperative: [
    {
      command:
        'az role assignment create --assignee <object-id> --assignee-principal-type Group --role "Reader" --scope /subscriptions/<subscription-id>',
      what: 'Grants Reader to a group on a whole subscription.',
      expected: 'JSON with roleDefinitionName Reader and the scope.',
      placeholders: ['<object-id>', '<subscription-id>'],
    },
    {
      command:
        'az role assignment create --assignee ana@contoso.com --role "Virtual Machine Contributor" --resource-group rg-web',
      what: 'Grants a built-in service-specific role to one user on one resource group.',
    },
    {
      command:
        'az role definition list --name "Contributor" --output json --query "[].permissions[0]"',
      what: 'Shows the actions and notActions of a built-in role.',
      expected: 'actions ["*"] and notActions including Microsoft.Authorization/*/Write.',
    },
    {
      command: 'az role definition create --role-definition @vm-operator.json',
      what: 'Creates a custom role from a JSON file.',
    },
    {
      command:
        'az role assignment delete --assignee ana@contoso.com --role "Virtual Machine Contributor" --resource-group rg-web',
      what: 'Removes a specific assignment. Inherited assignments must be removed at the scope where they were made.',
    },
  ],
  declarative: {
    steps: [
      'Look up the built-in role ID once (`az role definition list --name "<role>" --query [].name`); IDs are the same in every tenant.',
      'Declare the role assignment with a deterministic `guid()` name built from scope, principal and role, so redeployments are idempotent.',
      'Set `principalType` to avoid failures when the principal was created seconds earlier.',
      'Deploy at the scope you want to grant: resource group, subscription or management group deployment.',
    ],
    code: [
      {
        title: 'Grant a managed identity blob read on one storage account',
        language: 'bicep',
        explanation:
          'The `scope` property attaches the assignment to the storage account instead of the whole resource group.',
        code: `param storageAccountName string
param principalId string

resource sa 'Microsoft.Storage/storageAccounts@2023-05-01' existing = {
  name: storageAccountName
}

// Storage Blob Data Reader
var roleId = '2a2b9908-6ea1-4ae2-8e65-a410df84e7d1'

resource blobReader 'Microsoft.Authorization/roleAssignments@2022-04-01' = {
  name: guid(sa.id, principalId, roleId)
  scope: sa
  properties: {
    principalId: principalId
    principalType: 'ServicePrincipal'
    roleDefinitionId: subscriptionResourceId('Microsoft.Authorization/roleDefinitions', roleId)
  }
}`,
      },
    ],
  },
  verification: [
    {
      command:
        'az role assignment list --assignee ana@contoso.com --all --include-inherited --include-groups -o table',
      what: 'Lists every assignment that affects the user, across scopes and through groups.',
      expected: 'One row per role and scope.',
    },
    {
      command:
        'az role assignment list --scope /subscriptions/<subscription-id>/resourceGroups/rg-web --include-inherited -o table',
      what: 'Shows who has access to a resource group, including assignments inherited from above.',
      placeholders: ['<subscription-id>'],
    },
    {
      command: 'Get-AzRoleDefinition -Name "Virtual Machine Operator (custom)" | ConvertTo-Json',
      what: 'Confirms a custom role exists and shows its assignable scopes.',
    },
  ],
  troubleshooting: [
    {
      command: 'az role assignment list --assignee <object-id> --all -o table',
      what: 'A user gets AuthorizationFailed: check which assignments exist and at which scope.',
      placeholders: ['<object-id>'],
    },
    {
      command: 'az ad signed-in-user show --query id -o tsv',
      what: 'Find your own object ID to check your assignments. New assignments can take minutes; sign out and back in to refresh the token.',
    },
    {
      command:
        'az monitor activity-log list --offset 1d --query "[?authorization.action==\'Microsoft.Authorization/roleAssignments/write\'].{who:caller, when:eventTimestamp}" -o table',
      what: 'Finds who created or changed role assignments in the last day.',
    },
    {
      command: 'az role assignment list --all --query "[?principalName==\'\']" -o table',
      what: 'Finds orphaned assignments whose principal was deleted (shown as Identity not found in the portal).',
    },
  ],
  commonMistakes: [
    'Using `notActions` as a deny. It only trims that role; another assignment can still grant the same permission.',
    'Giving Contributor when the person needs to grant access to others. Contributor cannot write role assignments; that needs Owner, User Access Administrator or RBAC Administrator.',
    'Expecting Global Administrator to manage subscriptions. Entra roles and Azure roles are separate systems.',
    'Assigning roles to individual users instead of groups, so every joiner and leaver becomes an RBAC change.',
    'Granting Contributor on a storage account and assuming the user can read blobs with Entra auth. Data access needs a Storage Blob Data role.',
    'Forgetting the resource group scope inherits to every resource, including ones created later.',
  ],
  examTips: [
    'Memorise the four fundamental roles: Owner, Contributor, Reader, User Access Administrator. Contributor manages everything except access.',
    'When a question shows several assignments, add them together across scopes and groups. The only thing that subtracts is a deny assignment.',
    'Custom roles: know the JSON properties (Actions, NotActions, DataActions, NotDataActions, AssignableScopes) and that you create them with `az role definition create` or `New-AzRoleDefinition`.',
    'Scope order from widest to narrowest: management group, subscription, resource group, resource.',
    'User Administrator is an Entra role (manage users). User Access Administrator is an Azure role (manage access to resources). The exam uses the similar names deliberately.',
    'Use the Check access tab on Access control (IAM) to interpret what a principal can do at a scope.',
  ],
  summary: [
    'A role assignment is principal plus role definition plus scope.',
    'Assignments inherit down the scope hierarchy and are additive.',
    'NotActions subtract within one role only; deny assignments are the real deny.',
    'Control plane and data plane are separate permission sets.',
    'Entra roles govern the directory; Azure roles govern resources.',
  ],
  practice: [
    {
      id: 'az1-rbac-p1',
      level: 'beginner',
      prompt:
        'A developer has Contributor on a resource group and needs to give a colleague Reader on it. Why can they not, and what is the least-privilege fix?',
      answer:
        'Contributor excludes Microsoft.Authorization write actions. Assign Role Based Access Control Administrator (optionally constrained to the Reader role) or User Access Administrator at that resource group.',
    },
    {
      id: 'az1-rbac-p2',
      level: 'intermediate',
      prompt:
        'A user has Reader on the subscription, Contributor on rg-app, and is in a group with a custom role whose NotActions contains Microsoft.Compute/virtualMachines/delete at rg-app. Can they delete a VM in rg-app?',
      answer:
        'Yes. Contributor on rg-app grants delete; NotActions in the custom role only trims that custom role and does not deny what another assignment grants.',
    },
    {
      id: 'az1-rbac-p3',
      level: 'intermediate',
      prompt:
        'Which built-in role lets an app with a managed identity read blobs using Entra authentication, without access to account keys?',
      answer: 'Storage Blob Data Reader, assigned at the storage account or container scope.',
    },
    {
      id: 'az1-rbac-p4',
      level: 'advanced',
      prompt:
        'You must create a custom role usable in two subscriptions but not a third. How do you set it up?',
      answer:
        'List both subscription IDs in AssignableScopes of the custom role definition (or place both under a management group and use that as the assignable scope, if the third is not in it).',
    },
  ],
  lab: {
    title: 'Delegate, interpret and tighten access',
    scenario:
      'Grant a test group access at two scopes, interpret the effective access, then replace a broad role with a custom one.',
    prerequisites: [
      'An Azure subscription where you are Owner',
      'Cloud Shell (Bash)',
      'A test group you can create in Entra ID',
    ],
    tasks: [
      {
        instruction:
          'Create resource groups rg-rbac-a and rg-rbac-b and an Entra security group rbac-ops.',
      },
      {
        instruction:
          'Assign Reader to rbac-ops at rg-rbac-a and Virtual Machine Contributor at rg-rbac-b.',
      },
      {
        instruction: 'List the effective assignments for the group, including inherited ones.',
        hint: 'az role assignment list --assignee ... --all',
      },
      {
        instruction:
          'Create a custom role that can only start, restart and deallocate VMs, scoped to your subscription.',
      },
      {
        instruction:
          'Replace the Virtual Machine Contributor assignment on rg-rbac-b with the custom role.',
      },
      { instruction: 'Check the activity log for the role assignment writes you just made.' },
    ],
    solution: [
      {
        title: 'Full solution in Azure CLI',
        language: 'bash',
        code: `SUB=$(az account show --query id -o tsv)
az group create -n rg-rbac-a -l westeurope
az group create -n rg-rbac-b -l westeurope
GID=$(az ad group create --display-name rbac-ops --mail-nickname rbac-ops --query id -o tsv)

az role assignment create --assignee-object-id $GID --assignee-principal-type Group \\
  --role Reader --resource-group rg-rbac-a
az role assignment create --assignee-object-id $GID --assignee-principal-type Group \\
  --role "Virtual Machine Contributor" --resource-group rg-rbac-b

az role assignment list --assignee $GID --all -o table

cat > vm-operator.json <<EOF
{
  "Name": "VM Operator Lab",
  "IsCustom": true,
  "Description": "Power operations only",
  "Actions": [
    "Microsoft.Compute/virtualMachines/read",
    "Microsoft.Compute/virtualMachines/start/action",
    "Microsoft.Compute/virtualMachines/restart/action",
    "Microsoft.Compute/virtualMachines/deallocate/action"
  ],
  "AssignableScopes": ["/subscriptions/$SUB"]
}
EOF
az role definition create --role-definition @vm-operator.json

az role assignment delete --assignee $GID --role "Virtual Machine Contributor" --resource-group rg-rbac-b
az role assignment create --assignee-object-id $GID --assignee-principal-type Group \\
  --role "VM Operator Lab" --resource-group rg-rbac-b`,
      },
    ],
    verification: [
      {
        command:
          'az role assignment list --assignee $GID --all --query "[].{role:roleDefinitionName, scope:scope}" -o table',
        what: 'Shows Reader on rg-rbac-a and VM Operator Lab on rg-rbac-b.',
      },
      {
        command: 'az role definition list --custom-role-only true --query "[].roleName" -o tsv',
        what: 'Confirms the custom role exists.',
        expected: 'VM Operator Lab',
      },
    ],
    cleanup: [
      {
        command:
          'az group delete -n rg-rbac-a --yes --no-wait; az group delete -n rg-rbac-b --yes --no-wait; az role definition delete --name "VM Operator Lab"; az ad group delete --group rbac-ops',
        what: 'Removes the resource groups (and their assignments), the custom role and the test group. Delete assignments before the role if the delete complains.',
      },
    ],
  },
  relatedTopicIds: [
    'az1-entra-users-groups',
    'az1-subscriptions-governance',
    'az1-azure-policy',
    'az1-storage-security',
  ],
  docs: [
    {
      title: 'What is Azure RBAC?',
      url: 'https://learn.microsoft.com/azure/role-based-access-control/overview',
    },
    {
      title: 'Azure built-in roles',
      url: 'https://learn.microsoft.com/azure/role-based-access-control/built-in-roles',
    },
    {
      title: 'Azure custom roles',
      url: 'https://learn.microsoft.com/azure/role-based-access-control/custom-roles',
    },
    {
      title: 'Azure roles, Microsoft Entra roles and classic administrator roles',
      url: 'https://learn.microsoft.com/azure/role-based-access-control/rbac-and-directory-admin-roles',
    },
  ],
}
