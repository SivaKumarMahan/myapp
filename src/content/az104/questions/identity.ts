import type { Question } from '../../types'

/** Original practice questions for this domain. Written for this app. */
export const az104IdentityQuestions: Question[] = [
  {
    id: 'az1q-idn-1',
    domainId: 'az1-identity',
    topicId: 'az1-entra-users-groups',
    kind: 'mcq',
    category: 'concept',
    difficulty: 'beginner',
    points: 1,
    prompt:
      'You need every user whose department attribute is Marketing to be a member of a group automatically, including future hires. What should you create?',
    options: [
      { id: 'a', text: 'A security group with assigned membership and a weekly script' },
      { id: 'b', text: 'A security group with dynamic user membership' },
      { id: 'c', text: 'A Microsoft 365 group with assigned membership' },
      { id: 'd', text: 'An administrative unit named Marketing' },
    ],
    correct: ['b'],
    explanation:
      'Dynamic user membership evaluates a rule such as user.department -eq "Marketing" and keeps membership in sync automatically. An assigned group with a script works but is not automatic. A Microsoft 365 group with assigned membership still needs manual changes, and an administrative unit scopes administration rather than creating a group.',
  },
  {
    id: 'az1q-idn-2',
    domainId: 'az1-identity',
    topicId: 'az1-entra-users-groups',
    kind: 'mcq',
    category: 'troubleshoot',
    difficulty: 'beginner',
    points: 1,
    prompt:
      'You assign a Microsoft 365 E3 license to a group. Most members receive it, but a few newly created cloud users show a license assignment error. What should you do first?',
    options: [
      { id: 'a', text: 'Set the usage location on the affected users' },
      { id: 'b', text: 'Convert the group to a Microsoft 365 group' },
      { id: 'c', text: 'Assign the users the License Administrator role' },
      { id: 'd', text: 'Enable self-service password reset for the users' },
    ],
    correct: ['a'],
    explanation:
      'A license cannot be assigned to a user without a usageLocation, because service availability depends on the country. Changing the group type is impossible and irrelevant, License Administrator lets someone manage licenses rather than receive them, and SSPR has nothing to do with licensing.',
  },
  {
    id: 'az1q-idn-3',
    domainId: 'az1-identity',
    topicId: 'az1-entra-users-groups',
    kind: 'multi',
    category: 'concept',
    difficulty: 'intermediate',
    points: 2,
    prompt:
      'Your tenant uses Microsoft Entra ID Free. Which features require you to purchase at least Microsoft Entra ID P1? (Select all that apply.)',
    options: [
      { id: 'a', text: 'Dynamic membership groups' },
      { id: 'b', text: 'Group-based licensing' },
      { id: 'c', text: 'Creating cloud-only users' },
      { id: 'd', text: 'Inviting B2B guest users' },
      { id: 'e', text: 'Self-service password reset with writeback for synced users' },
    ],
    correct: ['a', 'b', 'e'],
    explanation:
      'Dynamic groups, group-based licensing and SSPR for hybrid users with password writeback all need P1 or higher. Creating cloud users and inviting B2B guests are available in every edition, including Free.',
  },
  {
    id: 'az1q-idn-4',
    domainId: 'az1-identity',
    topicId: 'az1-entra-users-groups',
    kind: 'mcq',
    category: 'concept',
    difficulty: 'intermediate',
    points: 2,
    prompt:
      'You need to ensure that only administrators and users you explicitly nominate can invite external guests, and that invitations to one competitor domain are blocked. Where should you configure this?',
    options: [
      { id: 'a', text: 'Conditional Access policies' },
      { id: 'b', text: 'External collaboration settings' },
      { id: 'c', text: 'Self-service password reset properties' },
      { id: 'd', text: 'The Azure Policy Allowed locations definition' },
    ],
    correct: ['b'],
    explanation:
      'External collaboration settings control guest invite restrictions (for example admins and the Guest Inviter role only) and collaboration restrictions with allow or deny domain lists. Conditional Access governs sign-in conditions, SSPR is about password reset, and Azure Policy governs Azure resources, not directory invitations.',
  },
  {
    id: 'az1q-idn-5',
    domainId: 'az1-identity',
    topicId: 'az1-entra-users-groups',
    kind: 'command',
    category: 'command',
    difficulty: 'beginner',
    points: 1,
    prompt:
      'Using Azure CLI, create a security group with the display name "Ops team" and mail nickname ops-team.',
    acceptedAnswers: [
      'az ad group create --display-name "Ops team" --mail-nickname ops-team',
      'az ad group create --mail-nickname ops-team --display-name "Ops team"',
    ],
    answerHint: 'az ad group create ...',
    explanation:
      '`az ad group create` requires both `--display-name` and `--mail-nickname`. It creates an assigned security group; dynamic groups need Microsoft Graph PowerShell or the portal.',
  },
  {
    id: 'az1q-idn-6',
    domainId: 'az1-identity',
    topicId: 'az1-entra-users-groups',
    kind: 'mcq',
    category: 'troubleshoot',
    difficulty: 'intermediate',
    points: 2,
    prompt:
      'Users are synchronised from on-premises AD with Microsoft Entra Connect. After enabling SSPR, users can reset their password online but still cannot sign in to domain-joined PCs with the new password. What should you do?',
    options: [
      { id: 'a', text: 'Require two authentication methods for reset' },
      { id: 'b', text: 'Enable password writeback in Microsoft Entra Connect' },
      { id: 'c', text: 'Convert the users to cloud-only accounts' },
      { id: 'd', text: 'Assign the users the Password Administrator role' },
    ],
    correct: ['b'],
    explanation:
      'Without password writeback the reset changes only the cloud password. Writeback writes it back to AD DS so on-premises sign-in uses the new password. Requiring more methods changes verification, converting users breaks hybrid identity, and Password Administrator is for helpdesk staff resetting other users.',
  },
  {
    id: 'az1q-idn-7',
    domainId: 'az1-identity',
    topicId: 'az1-rbac',
    kind: 'mcq',
    category: 'concept',
    difficulty: 'beginner',
    points: 1,
    prompt:
      'A team lead must create and manage all resources in resource group rg-app but must not be able to grant access to anyone else. Which built-in role should you assign at rg-app?',
    options: [
      { id: 'a', text: 'Owner' },
      { id: 'b', text: 'Contributor' },
      { id: 'c', text: 'User Access Administrator' },
      { id: 'd', text: 'Reader' },
    ],
    correct: ['b'],
    explanation:
      'Contributor has full management access but its NotActions exclude Microsoft.Authorization write and delete, so it cannot create role assignments. Owner can grant access, User Access Administrator can only manage access, and Reader cannot change resources.',
  },
  {
    id: 'az1q-idn-8',
    domainId: 'az1-identity',
    topicId: 'az1-rbac',
    kind: 'mcq',
    category: 'concept',
    difficulty: 'intermediate',
    points: 2,
    prompt:
      'User1 has Reader on subscription Sub1 and Virtual Machine Contributor on resource group RG1 in Sub1. User1 is also a member of Group1, which has Contributor on resource group RG2 in Sub1. What can User1 do?',
    options: [
      {
        id: 'a',
        text: 'Only view resources, because Reader at the subscription overrides lower scopes',
      },
      {
        id: 'b',
        text: 'Manage VMs in RG1, manage all resources in RG2, and view everything else in Sub1',
      },
      {
        id: 'c',
        text: 'Manage VMs in RG1 only; group assignments do not combine with user assignments',
      },
      { id: 'd', text: 'Manage all resources in RG1 and RG2' },
    ],
    correct: ['b'],
    explanation:
      'Azure RBAC is additive: effective access is the union of all assignments, direct and through groups, across all scopes. Reader never overrides a broader grant at a lower scope. Virtual Machine Contributor is limited to VM-related resources, so User1 cannot manage every resource type in RG1.',
  },
  {
    id: 'az1q-idn-9',
    domainId: 'az1-identity',
    topicId: 'az1-rbac',
    kind: 'multi',
    category: 'concept',
    difficulty: 'intermediate',
    points: 2,
    prompt:
      'Which statements about Microsoft Entra roles and Azure roles are correct? (Select all that apply.)',
    options: [
      { id: 'a', text: 'Global Administrator has no access to Azure resources by default' },
      { id: 'b', text: 'User Administrator can create users and manage groups in the directory' },
      { id: 'c', text: 'User Access Administrator is an Entra role that resets user passwords' },
      {
        id: 'd',
        text: 'A Global Administrator can elevate access to get User Access Administrator at root scope',
      },
      {
        id: 'e',
        text: 'Azure roles can be assigned at the tenant directory scope to manage users',
      },
    ],
    correct: ['a', 'b', 'd'],
    explanation:
      'Entra roles govern the directory and Azure roles govern resources. Global Administrator can toggle Access management for Azure resources to become User Access Administrator at root scope. User Access Administrator is an Azure role for managing role assignments, not passwords, and Azure roles do not manage directory users.',
  },
  {
    id: 'az1q-idn-10',
    domainId: 'az1-identity',
    topicId: 'az1-rbac',
    kind: 'mcq',
    category: 'concept',
    difficulty: 'advanced',
    points: 2,
    prompt:
      'You need a role that lets operators start, restart and deallocate VMs in two subscriptions, and nothing else. No built-in role matches. What should you do?',
    options: [
      { id: 'a', text: 'Assign Virtual Machine Contributor and add a deny assignment for delete' },
      {
        id: 'b',
        text: 'Create a custom role with those actions and both subscriptions in AssignableScopes',
      },
      { id: 'c', text: 'Assign Contributor with NotActions for every other operation' },
      { id: 'd', text: 'Create an Azure Policy with the deny effect for other VM operations' },
    ],
    correct: ['b'],
    explanation:
      'A custom role lists exactly the allowed actions and its AssignableScopes can include both subscriptions. You cannot create deny assignments directly, you cannot edit a built-in role, and Azure Policy evaluates resource properties rather than who performs power operations.',
  },
  {
    id: 'az1q-idn-11',
    domainId: 'az1-identity',
    topicId: 'az1-rbac',
    kind: 'command',
    category: 'command',
    difficulty: 'intermediate',
    points: 2,
    prompt:
      'Using Azure CLI, assign the Reader role to user ana@contoso.com on resource group rg-web.',
    acceptedAnswers: [
      'az role assignment create --assignee ana@contoso.com --role Reader --resource-group rg-web',
      'az role assignment create --assignee ana@contoso.com --role Reader -g rg-web',
      'az role assignment create --role Reader --assignee ana@contoso.com --resource-group rg-web',
      'az role assignment create --role Reader --assignee ana@contoso.com -g rg-web',
    ],
    answerHint: 'az role assignment create ...',
    explanation:
      '`az role assignment create` takes the principal (`--assignee`), the role name or ID (`--role`) and a scope, either `--resource-group` or a full `--scope` ID.',
  },
  {
    id: 'az1q-idn-12',
    domainId: 'az1-identity',
    topicId: 'az1-subscriptions-governance',
    kind: 'mcq',
    category: 'troubleshoot',
    difficulty: 'intermediate',
    points: 2,
    prompt:
      'You apply a ReadOnly lock to resource group rg-data. Shortly after, a backup job that lists the storage account keys in rg-data fails. What is the best fix that still prevents accidental deletion?',
    options: [
      { id: 'a', text: 'Grant the backup identity Owner on rg-data' },
      { id: 'b', text: 'Replace the ReadOnly lock with a CanNotDelete lock' },
      { id: 'c', text: 'Move the storage account to another subscription' },
      { id: 'd', text: 'Apply the ReadOnly lock to the subscription instead' },
    ],
    correct: ['b'],
    explanation:
      'Listing keys is a POST operation, which ReadOnly blocks for everyone including Owners. CanNotDelete still prevents deletion while allowing modifications and key listing. Moving the account or locking a wider scope does not help.',
  },
  {
    id: 'az1q-idn-13',
    domainId: 'az1-identity',
    topicId: 'az1-subscriptions-governance',
    kind: 'multi',
    category: 'concept',
    difficulty: 'intermediate',
    points: 2,
    prompt:
      'You move a VM and its disks, NIC and public IP from rg-old to rg-new in the same subscription. Which statements are true? (Select all that apply.)',
    options: [
      { id: 'a', text: 'The resources get new resource IDs' },
      { id: 'b', text: 'The resources stay in their original Azure region' },
      {
        id: 'c',
        text: 'Both resource groups are locked for write and delete operations during the move',
      },
      { id: 'd', text: 'Tags from rg-new are automatically applied to the moved resources' },
      { id: 'e', text: 'The VM is moved to the region of rg-new' },
    ],
    correct: ['a', 'b', 'c'],
    explanation:
      'A move changes the resource group segment of the ID, does not change the region, and locks source and target groups for writes during the operation. Tags are not inherited from a resource group, and the resource group location only stores metadata.',
  },
  {
    id: 'az1q-idn-14',
    domainId: 'az1-identity',
    topicId: 'az1-subscriptions-governance',
    kind: 'mcq',
    category: 'concept',
    difficulty: 'beginner',
    points: 1,
    prompt:
      'Finance wants an email when a subscription is projected to exceed 5,000 USD this month, before the money is actually spent. What should you configure?',
    options: [
      { id: 'a', text: 'An Azure Advisor cost recommendation alert' },
      { id: 'b', text: 'A budget with a Forecasted threshold notification' },
      { id: 'c', text: 'An Azure Policy with the audit effect' },
      { id: 'd', text: 'A CanNotDelete lock on the subscription' },
    ],
    correct: ['b'],
    explanation:
      'Budgets support Actual and Forecasted thresholds; a forecast threshold warns before spend happens. Advisor gives optimisation recommendations, not threshold alerts, and policies and locks do not track cost.',
  },
  {
    id: 'az1q-idn-15',
    domainId: 'az1-identity',
    topicId: 'az1-subscriptions-governance',
    kind: 'mcq',
    category: 'concept',
    difficulty: 'intermediate',
    points: 2,
    prompt:
      'You apply the tag costCenter=4410 to resource group rg-web. A cost report grouped by costCenter shows no cost for the App Service in rg-web. Which action fixes this for existing and future resources with the least effort?',
    options: [
      { id: 'a', text: 'Reapply the tag to the resource group with the Replace operation' },
      {
        id: 'b',
        text: 'Assign a policy that inherits the tag from the resource group and run a remediation task',
      },
      { id: 'c', text: 'Apply a CanNotDelete lock to rg-web' },
      { id: 'd', text: 'Move the App Service to a new resource group' },
    ],
    correct: ['b'],
    explanation:
      'Tags are not inherited by default. The built-in Inherit a tag from the resource group policy (modify effect) tags new resources, and a remediation task fixes existing ones. Reapplying the tag to the group, locking or moving changes nothing about the resource tags.',
  },
  {
    id: 'az1q-idn-16',
    domainId: 'az1-identity',
    topicId: 'az1-subscriptions-governance',
    kind: 'command',
    category: 'command',
    difficulty: 'beginner',
    points: 1,
    prompt:
      'Using Azure CLI, create a lock named nodelete of type CanNotDelete on resource group rg-prod.',
    acceptedAnswers: [
      'az lock create --name nodelete --lock-type CanNotDelete --resource-group rg-prod',
      'az lock create -n nodelete --lock-type CanNotDelete -g rg-prod',
      'az lock create --name nodelete --resource-group rg-prod --lock-type CanNotDelete',
      'az lock create -n nodelete -g rg-prod --lock-type CanNotDelete',
    ],
    answerHint: 'az lock create ...',
    explanation:
      '`az lock create` needs a name, a lock type (CanNotDelete or ReadOnly) and a scope such as `--resource-group`. Without a resource name the lock applies to the whole group.',
  },
  {
    id: 'az1q-idn-17',
    domainId: 'az1-identity',
    topicId: 'az1-azure-policy',
    kind: 'mcq',
    category: 'concept',
    difficulty: 'intermediate',
    points: 2,
    prompt:
      'You need to ensure a diagnostic setting that sends logs to a Log Analytics workspace exists on every Key Vault, including vaults created in the future. Which policy effect should the definition use?',
    options: [
      { id: 'a', text: 'audit' },
      { id: 'b', text: 'deny' },
      { id: 'c', text: 'deployIfNotExists' },
      { id: 'd', text: 'append' },
    ],
    correct: ['c'],
    explanation:
      'deployIfNotExists checks for a related resource (the diagnostic setting) and deploys it when missing, using the assignment managed identity. audit only reports, deny would block the vault itself, and append adds fields to the request but cannot create a separate child resource.',
  },
  {
    id: 'az1q-idn-18',
    domainId: 'az1-identity',
    topicId: 'az1-azure-policy',
    kind: 'mcq',
    category: 'troubleshoot',
    difficulty: 'advanced',
    points: 2,
    prompt:
      'You assign a built-in policy with the modify effect that adds a missing env tag. New resources are tagged correctly, but 200 existing resources still show as non-compliant a week later. What should you do?',
    options: [
      { id: 'a', text: 'Change the effect to deny' },
      { id: 'b', text: 'Create a remediation task for the assignment' },
      { id: 'c', text: 'Set the enforcement mode to DoNotEnforce' },
      { id: 'd', text: 'Delete and recreate the assignment' },
    ],
    correct: ['b'],
    explanation:
      'Modify and deployIfNotExists apply automatically only to resources that are created or updated. Existing resources need a remediation task. Deny does not change existing resources, DoNotEnforce disables the effect, and recreating the assignment still leaves existing resources untouched.',
  },
  {
    id: 'az1q-idn-19',
    domainId: 'az1-identity',
    topicId: 'az1-azure-policy',
    kind: 'multi',
    category: 'concept',
    difficulty: 'advanced',
    points: 2,
    prompt: 'Which statements about Azure Policy are correct? (Select all that apply.)',
    options: [
      { id: 'a', text: 'An initiative groups several policy definitions into one assignable unit' },
      { id: 'b', text: 'A policy assignment with the modify effect needs a managed identity' },
      { id: 'c', text: 'Owners of a subscription are exempt from deny policies assigned to it' },
      { id: 'd', text: 'An exemption can carry a category and an expiry date' },
      {
        id: 'e',
        text: 'A deny policy deletes existing non-compliant resources during the next scan',
      },
    ],
    correct: ['a', 'b', 'd'],
    explanation:
      'Initiatives group definitions; modify and deployIfNotExists need an assignment identity; exemptions have a Waiver or Mitigated category and optional expiry. Policy applies regardless of RBAC role, so Owners are not exempt, and deny never deletes anything; existing resources are just reported as non-compliant.',
  },
  {
    id: 'az1q-idn-20',
    domainId: 'az1-identity',
    topicId: 'az1-azure-policy',
    kind: 'mcq',
    category: 'concept',
    difficulty: 'intermediate',
    points: 2,
    prompt:
      'Security wants to measure how many deployments a new deny policy would block in production, without blocking anything yet. What should you do?',
    options: [
      {
        id: 'a',
        text: 'Assign the policy with enforcement mode DoNotEnforce and review compliance',
      },
      { id: 'b', text: 'Assign the policy to a test resource group only' },
      { id: 'c', text: 'Add every production subscription as an exclusion' },
      { id: 'd', text: 'Place a ReadOnly lock on production while testing' },
    ],
    correct: ['a'],
    explanation:
      'DoNotEnforce evaluates and reports compliance without applying the effect. Assigning to a test group does not measure production, excluding production evaluates nothing there, and a ReadOnly lock would block every change.',
  },
  {
    id: 'az1q-idn-21',
    domainId: 'az1-identity',
    topicId: 'az1-azure-policy',
    kind: 'task',
    category: 'lab',
    difficulty: 'advanced',
    points: 3,
    prompt:
      'In subscription Sub1, ensure resources can be created only in West Europe and North Europe, and that every resource missing a costCenter tag receives the value from its resource group, including resources that already exist.',
    context: 'You are Owner of Sub1 and have Azure CLI in Cloud Shell.',
    checkpoints: [
      {
        id: 'c1',
        text: 'The Allowed locations built-in policy is assigned to Sub1 with westeurope and northeurope',
      },
      {
        id: 'c2',
        text: 'Inherit a tag from the resource group if missing is assigned with tagName costCenter and a system-assigned identity',
      },
      {
        id: 'c3',
        text: 'The assignment identity holds Tag Contributor (or Contributor) at the subscription',
      },
      {
        id: 'c4',
        text: 'A remediation task has run and existing resources show the costCenter tag',
      },
    ],
    solution: [
      {
        title: 'Assignments, identity role and remediation',
        language: 'bash',
        code: `SUB=/subscriptions/$(az account show --query id -o tsv)

az policy assignment create -n allowed-locations --scope $SUB \\
  --policy e56962a6-4747-49cd-b67b-bf8b01975c4c \\
  --params '{"listOfAllowedLocations":{"value":["westeurope","northeurope"]}}'

PID=$(az policy assignment create -n inherit-costcenter --scope $SUB \\
  --policy ea3f2387-9b95-492a-a190-fcdc54f7b070 \\
  --params '{"tagName":{"value":"costCenter"}}' \\
  --mi-system-assigned --location westeurope \\
  --query identity.principalId -o tsv)

az role assignment create --assignee-object-id $PID --assignee-principal-type ServicePrincipal \\
  --role "Tag Contributor" --scope $SUB

az policy remediation create -n fix-costcenter --policy-assignment inherit-costcenter \\
  --resource-discovery-mode ReEvaluateCompliance`,
      },
    ],
    explanation:
      'Allowed locations is a deny policy and needs no identity. The inherit-tag policy uses modify, so its assignment needs a managed identity with a role that can write tags, and a remediation task is required for resources that already existed.',
  },
]
