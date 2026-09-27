import type { InterviewQuestion } from '../../../types'

/** Authorisation: Azure RBAC, Entra roles, custom roles, PIM and the 403 investigation. */
export const azureIdentityRbacQuestions: InterviewQuestion[] = [
  {
    id: 'itv-azid-6',
    level: 'intermediate',
    kind: 'open',
    prompt: 'What is the difference between Azure RBAC roles and Microsoft Entra roles?',
    probing:
      'Two authorisation systems that share a tenant. Mixing them up is the root of many "I am Global Administrator, why can I not see the VM?" questions.',
    answer: [
      '**Azure RBAC roles** control access to **Azure resources** through ARM: Owner, Contributor, Reader, Storage Blob Data Reader, Key Vault Secrets User. They are assigned at a **scope** - management group, subscription, resource group or resource - and inherit downward.',
      '**Entra roles** control administration of the **directory and Microsoft 365**: Global Administrator, User Administrator, Application Administrator, Conditional Access Administrator. They are assigned at tenant scope, or to an administrative unit, and govern things like creating users, resetting passwords and consenting to apps.',
      'The two systems are **independent**. A Global Administrator has no access to Azure subscriptions by default. They can **elevate** themselves to User Access Administrator at the root scope with a toggle in the portal, which is an intentional break-glass path and is logged - but it is not normal access.',
      'In practice: platform engineers need Azure RBAC on subscriptions; identity administrators need Entra roles; very few people should need both, and both kinds of privileged role belong behind PIM.',
    ],
    diagrams: [
      {
        kind: 'decision',
        title: 'Which role system do I need?',
        caption: 'Different systems; a Global Admin has no Azure resource access by default.',
        question: 'What is the person trying to manage?',
        branches: [
          {
            condition: 'VMs, storage, networks, Key Vault',
            result: 'Azure RBAC role at a scope',
            detail: 'Owner, Contributor, data roles',
            tone: 'accent',
          },
          {
            condition: 'Users, groups, app consent, CA',
            result: 'Entra role',
            detail: 'Tenant or administrative unit scope',
            tone: 'success',
          },
          {
            condition: 'Recover lost subscription access',
            result: 'Global Admin elevates at root',
            detail: 'Break-glass, audited, remove after',
            tone: 'warning',
          },
        ],
      },
    ],
    code: [
      {
        title: 'The two systems, listed separately',
        language: 'bash',
        code: `# Azure RBAC: role assignments on Azure scopes
az role assignment list --assignee alice@contoso.com --all -o table

# Entra roles: directory role assignments, via Microsoft Graph
az rest --method get \\
  --url "https://graph.microsoft.com/v1.0/roleManagement/directory/roleAssignments?\\$filter=principalId eq '<user-object-id>'&\\$expand=roleDefinition" \\
  --query "value[].roleDefinition.displayName"`,
        placeholders: ['<user-object-id>'],
      },
    ],
    traps: [
      'Saying Global Administrator can manage every VM.',
      'Trying to assign "User Administrator" to a resource group.',
      'Leaving the root-scope elevation on after using it.',
    ],
    followUps: [
      'How does a Global Administrator regain access to an orphaned subscription?',
      'What is an administrative unit?',
    ],
    tags: ['rbac', 'entra roles', 'authorization'],
  },
  {
    id: 'itv-azid-7',
    level: 'intermediate',
    kind: 'open',
    prompt:
      'Walk me through how an Azure role definition works. When and how would you write a custom role?',
    probing:
      'Understanding actions versus dataActions, NotActions not being a deny, and scope - then least privilege in a custom role.',
    answer: [
      'A role definition is a list of **permissions** plus **assignable scopes**. `Actions` are control-plane operations such as `Microsoft.Compute/virtualMachines/restart/action`. `DataActions` are data-plane operations such as `Microsoft.Storage/storageAccounts/blobServices/containers/blobs/read`. `NotActions` and `NotDataActions` subtract from what the wildcards grant.',
      'An important subtlety: **NotActions is not a deny**. It only removes permissions from this one role. If the same person has another role that grants the operation, they still have it. Real denies come from **deny assignments**, which you cannot create directly - they come from things like deployment stacks and managed applications.',
      'Access is the **union** of all role assignments that apply at or above the scope. There is no priority order, so adding a role can only add permissions.',
      'I write a custom role when no built-in role fits and the gap matters - for example an operator who may start, stop and restart VMs and read their metrics, but not create, delete or resize them. I start from the closest built-in role, keep `assignableScopes` as narrow as makes sense, avoid wildcards on providers I do not fully understand, and keep the definition in source control deployed with Bicep so it is reviewed like code.',
    ],
    code: [
      {
        title: 'A VM operator custom role',
        language: 'json',
        code: `{
  "Name": "VM Operator",
  "IsCustom": true,
  "Description": "Start, stop, restart and read VMs. No create, delete or resize.",
  "Actions": [
    "Microsoft.Compute/virtualMachines/read",
    "Microsoft.Compute/virtualMachines/instanceView/read",
    "Microsoft.Compute/virtualMachines/start/action",
    "Microsoft.Compute/virtualMachines/powerOff/action",
    "Microsoft.Compute/virtualMachines/deallocate/action",
    "Microsoft.Compute/virtualMachines/restart/action",
    "Microsoft.Insights/metrics/read",
    "Microsoft.Resources/subscriptions/resourceGroups/read"
  ],
  "NotActions": [],
  "DataActions": [],
  "NotDataActions": [],
  "AssignableScopes": ["/providers/Microsoft.Management/managementGroups/mg-corp"]
}`,
      },
      {
        title: 'Create it and check what an operation needs',
        language: 'bash',
        code: `az role definition create --role-definition vm-operator.json

# Discover operation names for a provider
az provider operation show --namespace Microsoft.Compute \\
  --query "resourceTypes[?name=='virtualMachines'].operations[].name" -o tsv | grep -E 'start|restart|deallocate'`,
      },
    ],
    traps: [
      'Treating NotActions as a deny that overrides other roles.',
      'Wildcard custom roles like `Microsoft.Network/*` that quietly grant far more than intended.',
      'Forgetting DataActions, so the role can see a storage account but not read a single blob.',
    ],
    followUps: [
      'How do deny assignments differ from NotActions?',
      'What limits apply to custom roles, and why prefer management group assignable scopes?',
    ],
    tags: ['rbac', 'custom roles', 'least privilege'],
  },
  {
    id: 'itv-azid-8',
    level: 'advanced',
    kind: 'open',
    prompt:
      'What is Privileged Identity Management, and how would you design privileged access for a platform team?',
    probing:
      'Standing access versus just-in-time. They want eligible versus active, approval and justification, access reviews, and break-glass.',
    answer: [
      '**Privileged Identity Management (PIM)** replaces standing privileged access with **just-in-time** access. Instead of being permanently Owner or Global Administrator, a person is **eligible** for the role. When they need it, they **activate** it for a limited time - say two hours - with a justification, optionally a ticket number, MFA, and approval from someone else. PIM works for both Entra roles and Azure RBAC roles, and also for group membership through PIM for Groups.',
      'For a platform team I would give everyone **permanent read access** plus day-to-day Contributor in non-production. **Production Contributor** would be eligible with MFA and justification, no approval, so incidents are not slowed down. **Owner and User Access Administrator** would be eligible with approval, because they can grant access to others. Entra **Global Administrator** would be held by very few people, eligible only, with approval.',
      'Assignments go to **groups**, not individuals, so joining the team is one membership change - and with PIM for Groups, the group membership itself can be the just-in-time element.',
      'I would add **access reviews** every quarter so eligibility is re-justified, alerts on activations of the highest roles, and two **break-glass accounts** excluded from PIM and Conditional Access with long random passwords or FIDO2 keys stored offline, monitored with an alert on any sign-in.',
    ],
    code: [
      {
        title: 'Make a group eligible for Contributor on a subscription (Az PowerShell)',
        language: 'powershell',
        code: `Connect-AzAccount
$scope = "/subscriptions/<sub-id>"
$role  = Get-AzRoleDefinition -Name "Contributor"

New-AzRoleEligibilityScheduleRequest -Name (New-Guid).Guid \`
    -Scope $scope \`
    -PrincipalId "<group-object-id>" \`
    -RoleDefinitionId "$scope/providers/Microsoft.Authorization/roleDefinitions/$($role.Id)" \`
    -RequestType AdminAssign \`
    -ScheduleInfoStartDateTime (Get-Date).ToUniversalTime().ToString("o") \`
    -ExpirationType AfterDuration -ExpirationDuration "P365D"`,
        placeholders: ['<sub-id>', '<group-object-id>'],
      },
      {
        title: 'Alert when a break-glass account signs in',
        language: 'text',
        code: `SigninLogs
| where UserPrincipalName in~ ("breakglass1@contoso.onmicrosoft.com", "breakglass2@contoso.onmicrosoft.com")
| project TimeGenerated, UserPrincipalName, IPAddress, AppDisplayName, ResultType`,
      },
    ],
    diagrams: [
      {
        kind: 'sequence',
        title: 'A just-in-time activation',
        caption: 'Nobody holds the role until they need it, and it expires on its own.',
        participants: [
          { id: 'eng', label: 'Engineer' },
          { id: 'pim', label: 'PIM' },
          { id: 'appr', label: 'Approver' },
          { id: 'arm', label: 'Azure RBAC' },
        ],
        messages: [
          { from: 'eng', to: 'pim', label: 'Activate Owner, 2h, ticket, MFA' },
          { from: 'pim', to: 'appr', label: 'Approval request' },
          { from: 'appr', to: 'pim', label: 'Approved', kind: 'return' },
          { from: 'pim', to: 'arm', label: 'Create time-bound assignment' },
          { from: 'arm', to: 'eng', label: 'Access for 2 hours', kind: 'return' },
          { from: 'pim', to: 'arm', label: 'Expire assignment' },
        ],
      },
    ],
    deeper: [
      'PIM needs Entra ID P2 or an Entra ID Governance licence for the users who are eligible.',
      'After activation, existing tokens do not change. The user may need to sign out and back in, or refresh the portal, before the new role is effective - a common "PIM did not work" report.',
      'Service principals and managed identities should not be eligible for anything; pipelines need standing but narrowly scoped access, protected instead by workload identity federation and pipeline approvals.',
    ],
    traps: [
      'Requiring approval for every production role, so incidents wait for an approver who is asleep.',
      'Putting break-glass accounts behind the same MFA and Conditional Access policies that might lock everyone out.',
      'Eligible assignments to individuals instead of groups.',
    ],
    followUps: [
      'How would you handle an incident at 3am if the approver is unavailable?',
      'What is PIM for Groups and when is it better than role eligibility?',
    ],
    tags: ['pim', 'privileged access', 'rbac', 'break-glass'],
  },
  {
    id: 'itv-azid-9',
    level: 'basic',
    kind: 'mcq',
    prompt:
      'Which built-in role lets someone grant other people access to Azure resources, but not create or modify the resources themselves?',
    options: [
      { id: 'a', text: 'Owner' },
      { id: 'b', text: 'Contributor' },
      { id: 'c', text: 'User Access Administrator' },
      { id: 'd', text: 'Security Administrator' },
    ],
    correct: ['c'],
    probing: 'The three fundamental roles and the one permission that distinguishes them.',
    answer: [
      '**User Access Administrator** manages role assignments - `Microsoft.Authorization/*` - and can read resources, but cannot create or change them. It is the delegated "grant access" role.',
      '**Owner** can do both: manage resources and grant access. **Contributor** can manage resources but **cannot** assign roles, which is exactly why it is the usual role for pipelines. **Security Administrator** is an Entra role for security features, not an Azure resource role.',
    ],
    code: [
      {
        title: 'Compare the built-in roles',
        language: 'bash',
        code: `for r in Owner Contributor "User Access Administrator"; do
  echo "== $r"
  az role definition list --name "$r" --query "[0].{actions:permissions[0].actions, notActions:permissions[0].notActions}" -o json
done`,
        explanation: 'Contributor’s NotActions removes Microsoft.Authorization write and delete.',
      },
    ],
    traps: ['Giving a pipeline Owner because a deployment creates a role assignment.'],
    followUps: [
      'A Bicep deployment creates role assignments. What is the least-privilege role for its pipeline?',
    ],
    tags: ['rbac', 'built-in roles', 'basics'],
  },
  {
    id: 'itv-azid-10',
    level: 'advanced',
    kind: 'scenario',
    prompt:
      'A pipeline fails with "AuthorizationFailed: The client does not have authorization to perform action ... over scope ..." but the team insists the service principal is Contributor. Walk me through the investigation.',
    probing:
      'The single most common Azure support ticket. They want a methodical approach reading the error, then checking identity, scope, plane, deny and timing.',
    answer: [
      'I start by **reading the error precisely**. It names the **client object ID**, the **action** and the **scope**. Those three facts answer most of these tickets. The object ID tells me which identity actually made the call - often not the one the team thinks, because the pipeline uses a different service connection or a managed identity.',
      'Then I check **what that object ID actually holds at that scope**, including inherited assignments. Common findings: Contributor is on a **different resource group** or a different subscription; the assignment is on the **application object ID** instead of the service principal; or it was assigned minutes ago and **has not propagated**, which can take several minutes, and tokens issued before the change do not carry it.',
      'Next I look at the **action**. If it is `Microsoft.Authorization/roleAssignments/write`, Contributor genuinely cannot do it - it is excluded by design; the deployment needs Role Based Access Control Administrator with a condition, or User Access Administrator. If it is a data action, such as reading blobs or secrets, Contributor does not include data-plane permissions at all.',
      'Finally, **deny assignments** - from a deployment stack or a managed application - override role assignments, and some errors that look like authorisation are actually Azure Policy or locks, which have different error codes. Once I know the cause, the fix is a narrowly scoped assignment in IaC, not "make it Owner".',
    ],
    code: [
      {
        title: 'Establish who, what and where',
        language: 'bash',
        code: `# Which identity is the object ID in the error?
az ad sp show --id <object-id-from-error> --query "{name:displayName, appId:appId, type:servicePrincipalType}"

# Everything it holds, including inherited assignments
az role assignment list --assignee <object-id-from-error> --all --include-inherited \\
  --query "[].{role:roleDefinitionName, scope:scope}" -o table

# Does any of those roles include the failing action?
az role definition list --name Contributor \\
  --query "[0].permissions[0].{actions:actions, notActions:notActions, dataActions:dataActions}"

# Deny assignments at the scope
az rest --method get \\
  --url "https://management.azure.com/<scope-from-error>/providers/Microsoft.Authorization/denyAssignments?api-version=2022-04-01"`,
        placeholders: ['<object-id-from-error>', '<scope-from-error>'],
      },
      {
        title: 'Was it just propagation or a stale token?',
        language: 'bash',
        code: `# Decode the roles and object ID inside the token the pipeline is using
az account get-access-token --query accessToken -o tsv \\
  | cut -d. -f2 | tr '_-' '/+' | base64 -d 2>/dev/null | jq '{oid, appid, tid}'

# Force a fresh token after a new assignment
az account clear && az login --service-principal ...   # or re-run the pipeline`,
      },
    ],
    diagrams: [
      {
        kind: 'flow',
        title: 'Working through a 403 AuthorizationFailed',
        caption: 'Read the error first: object ID, action and scope answer most cases.',
        nodes: [
          { label: 'Read object ID, action, scope', tone: 'accent' },
          {
            label: 'Right identity?',
            detail: 'Which service connection really ran',
            branch: { label: 'Wrong SP or app object ID', tone: 'warning' },
          },
          {
            label: 'Assignment at or above scope?',
            branch: { label: 'Wrong RG or subscription', tone: 'warning' },
          },
          {
            label: 'Role includes the action?',
            detail: 'roleAssignments/write, dataActions',
            branch: { label: 'Needs a different role', tone: 'warning' },
          },
          { label: 'Deny assignment or propagation?', detail: 'Wait, refresh token' },
          { label: 'Fix in IaC, narrowly scoped', tone: 'success' },
        ],
      },
    ],
    deeper: [
      'Role assignment changes can take a while to be honoured because ARM caches authorisation. Tokens issued before a group membership change do not include the new group claim at all until reissued.',
      'If a principal is a member of more than about 200 groups, the token carries a group overage claim instead of the list, and ARM must look membership up - rarely the cause, but a real one for users in huge estates.',
      'Role Based Access Control Administrator with an ABAC condition lets a pipeline create role assignments for only specific roles and principal types, which is the least-privilege answer when Bicep must grant a managed identity access.',
    ],
    traps: [
      'Fixing it by granting Owner at subscription scope.',
      'Checking the wrong identity because the portal shows a friendly name.',
      'Forgetting that Contributor cannot write role assignments or read data.',
      'Retrying immediately after an assignment and concluding it did not work.',
    ],
    followUps: [
      'How would you let a pipeline create role assignments without making it Owner?',
      'How do you tell an RBAC failure from a policy denial?',
    ],
    tags: ['scenario', 'rbac', 'troubleshooting', '403', 'authorizationfailed'],
  },
]
