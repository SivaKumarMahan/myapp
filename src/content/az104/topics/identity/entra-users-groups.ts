import type { Topic } from '../../../types'

export const az1EntraUsersGroups: Topic = {
  id: 'az1-entra-users-groups',
  title: 'Microsoft Entra users, groups, licenses and SSPR',
  domainId: 'az1-identity',
  difficulty: 'beginner',
  estimatedMinutes: 30,
  order: 1,
  tags: ['entra-id', 'users', 'groups', 'dynamic-groups', 'licenses', 'b2b', 'sspr'],
  oneLiner:
    'Create and manage the identities in a Microsoft Entra tenant: member and guest users, assigned and dynamic groups, group-based licensing and self-service password reset.',
  explanation: [
    '**Microsoft Entra ID** is the cloud identity service behind every Azure subscription. A **tenant** is one dedicated instance of it, identified by a tenant ID and at least one domain such as `contoso.onmicrosoft.com`. Every user, group, app registration and device you manage lives in exactly one tenant, and every subscription trusts exactly one tenant for sign-in.',
    'A **user** is an identity that can sign in. **Member** users belong to your organisation, either created directly in the cloud or synchronised from on-premises Active Directory with Microsoft Entra Connect (cloud sync or Connect Sync). **Guest** users are external people invited through **B2B collaboration**; they sign in with their own home identity (another Entra tenant, a Microsoft account, Google, or a one-time passcode) and appear in your tenant with `userType` set to `Guest`.',
    'A **group** collects users (and optionally devices, service principals or other groups) so you can grant access, assign licenses or target policies once instead of per person. **Security groups** control access to resources; **Microsoft 365 groups** also provision a shared mailbox, calendar and SharePoint site. Membership is either **assigned** (you add members by hand) or **dynamic** (a rule such as `user.department -eq "Finance"` evaluates attributes and keeps membership in sync automatically).',
    '**Licenses** unlock paid features such as Microsoft Entra ID P1 or P2. Assigning them to a group with **group-based licensing** means every member receives the license and loses it when they leave the group. **Self-service password reset (SSPR)** lets users reset their own password after proving their identity with registered methods, which removes a large share of helpdesk calls.',
  ],
  whyItMatters: [
    'The AZ-104 "Manage Azure identities and governance" skill area opens with exactly these tasks: create users and groups, manage user and group properties, manage licenses, manage external users and configure SSPR. Expect several questions that hinge on one attribute or one licensing prerequisite.',
    'Everything else in Azure builds on these objects. Azure RBAC role assignments, Conditional Access, Azure Policy exemptions and Key Vault access all point at a user, a group or a service principal. Getting group design right is what keeps role assignments manageable later.',
    'In day-to-day administration most identity tickets are joiners, movers and leavers. Dynamic groups and group-based licensing turn those tickets into attribute changes in the HR system instead of manual clicks.',
  ],
  howItWorks: [
    'Each user has an immutable **object ID**, a **user principal name (UPN)** used to sign in (for example `ana@contoso.com`), and attributes such as `department`, `jobTitle`, `usageLocation` and `accountEnabled`. The UPN suffix must be a verified domain in the tenant.',
    'Synchronised users are **sourced from on-premises AD**. Their core attributes are read-only in Entra ID and must be changed in AD, then synced. Cloud-only users are edited directly in the portal, Microsoft Graph, Azure CLI or PowerShell.',
    'An **assigned** group changes only when an owner or admin adds or removes a member. A **dynamic** group has a `membershipRule`; the service re-evaluates it whenever relevant attributes change, and you cannot add or remove members by hand. Dynamic membership requires a **Microsoft Entra ID P1** license for each unique member covered by the rule.',
    'A group type is chosen at creation. You cannot convert a security group into a Microsoft 365 group, but you can switch a group between assigned and dynamic membership, which recalculates members from the rule.',
    'Group-based licensing assigns a product (and optionally disables individual service plans). A user must have a `usageLocation` before any license can be assigned, because license availability differs by country; the portal shows such users in an error state on the group licenses blade.',
    'B2B invitations create a guest user object and send a redemption link. Until the guest redeems it, the account shows as **Pending acceptance**. **External collaboration settings** control who may invite guests (admins only, members, or also guests) and which domains are allowed or blocked. **Cross-tenant access settings** add finer inbound and outbound trust rules with other Entra tenants.',
    'SSPR is enabled for **None**, **Selected** (one group) or **All** users. You pick how many methods are required (1 or 2) and which methods are allowed (Microsoft Authenticator, SMS, voice call, email, security questions). Users register their methods at `https://aka.ms/ssprsetup`. **Password writeback** through Entra Connect is required for synchronised users to reset their on-premises password. Administrator accounts always use a stronger, Microsoft-enforced two-method policy regardless of your settings.',
  ],
  diagrams: [
    {
      kind: 'nested',
      title: 'What lives inside a Microsoft Entra tenant',
      caption:
        'Users and groups belong to the tenant, not to a subscription. Subscriptions only trust the tenant for sign-in.',
      root: {
        label: 'Microsoft Entra tenant',
        detail: 'contoso.onmicrosoft.com plus verified domains',
        tone: 'accent',
        children: [
          {
            label: 'Users',
            children: [
              { label: 'Members', detail: 'Cloud-only or synced from AD' },
              { label: 'Guests', detail: 'B2B, sign in with home identity' },
            ],
          },
          {
            label: 'Groups',
            children: [
              { label: 'Security groups', detail: 'Access, licenses, policies' },
              { label: 'Microsoft 365 groups', detail: 'Mailbox, SharePoint, Teams' },
            ],
          },
          {
            label: 'Trusted subscriptions',
            detail: 'RBAC points back at tenant objects',
            tone: 'muted',
          },
        ],
      },
    },
    {
      kind: 'flow',
      title: 'A joiner, handled by attributes alone',
      caption:
        'With a dynamic group and group-based licensing, HR sets the department and everything else follows automatically.',
      nodes: [
        {
          label: 'HR creates the user',
          detail: 'department = Finance, usageLocation = GB',
          tone: 'accent',
        },
        {
          label: 'Dynamic rule evaluates',
          detail: 'user.department -eq Finance',
          arrowLabel: 'attribute change',
        },
        { label: 'User joins Finance group', detail: 'No admin clicks' },
        {
          label: 'Group license applies',
          detail: 'Entra ID P1 plus Microsoft 365',
          branch: {
            label: 'No usageLocation set',
            detail: 'License assignment error',
            tone: 'danger',
          },
        },
        { label: 'RBAC via group works', detail: 'Reader on the finance RG', tone: 'success' },
      ],
    },
  ],
  keyObjects: [
    {
      kind: 'User (Microsoft Graph user)',
      purpose: 'An identity that can sign in: a member of your organisation or an invited guest.',
      fields: [
        {
          path: 'userPrincipalName',
          meaning: 'Sign-in name. Suffix must be a verified domain.',
          required: true,
        },
        {
          path: 'userType',
          meaning: 'Member or Guest. Guests get restricted directory permissions by default.',
        },
        {
          path: 'usageLocation',
          meaning: 'Two-letter country code. Required before any license can be assigned.',
        },
        { path: 'accountEnabled', meaning: 'false blocks sign-in without deleting the account.' },
        {
          path: 'onPremisesSyncEnabled',
          meaning: 'true means the user is sourced from AD and most attributes are read-only here.',
        },
      ],
    },
    {
      kind: 'Group (Microsoft Graph group)',
      purpose:
        'A collection of principals used to grant access, assign licenses and target policies.',
      fields: [
        {
          path: 'securityEnabled',
          meaning: 'true for security groups that can be used in RBAC and Conditional Access.',
        },
        {
          path: 'groupTypes',
          meaning:
            'Contains Unified for Microsoft 365 groups and DynamicMembership for dynamic groups.',
        },
        {
          path: 'membershipRule',
          meaning: 'The dynamic rule, for example user.department -eq "Finance".',
        },
        {
          path: 'membershipRuleProcessingState',
          meaning: 'On to evaluate the rule, Paused to freeze membership.',
        },
        {
          path: 'isAssignableToRole',
          meaning: 'Set at creation only; allows the group to hold Microsoft Entra roles.',
        },
      ],
    },
    {
      kind: 'Self-service password reset policy',
      purpose:
        'Tenant-wide settings that decide who can reset their own password and how they prove who they are.',
      fields: [
        { path: 'enabledFor', meaning: 'None, Selected (one group) or All users.' },
        { path: 'numberOfMethodsRequired', meaning: '1 or 2 methods needed to reset.' },
        {
          path: 'methods',
          meaning: 'Authenticator app, SMS, voice call, email, security questions and others.',
        },
        {
          path: 'passwordWriteback',
          meaning: 'Configured in Entra Connect so synced users reset their AD password too.',
        },
      ],
    },
  ],
  realWorldExample: {
    title: 'Two hundred contractors and one attribute',
    story: [
      'A retailer onboarded a design agency of two hundred contractors for a six-month project. The first week, admins invited guests one at a time and added each to four groups by hand. Three people were missed, and one guest was accidentally added to the finance team.',
      'The team switched to a single dynamic security group with the rule `(user.userType -eq "Guest") and (user.companyName -eq "Fabrikam Design")`. Invitations were sent in bulk from a CSV, and the agency set its own company name during redemption through an attribute collected by the invite flow.',
      'The dynamic group held the Contributor role on the project resource group and nothing else. When the contract ended, one access review removed every guest and the group emptied itself. The auditors got a one-line explanation of who had access and why.',
    ],
  },
  yamlExamples: [
    {
      title: 'Bulk-create cloud users from a CSV with Azure CLI',
      language: 'bash',
      explanation:
        'A simple loop is enough for small batches. Passwords are generated per user and must be changed at first sign-in.',
      placeholders: ['<verified-domain>'],
      code: `# users.csv: displayName,alias,department
while IFS=, read -r name alias dept; do
  pw="$(openssl rand -base64 18)Aa1!"
  az ad user create \\
    --display-name "$name" \\
    --user-principal-name "$alias@<verified-domain>" \\
    --password "$pw" \\
    --force-change-password-next-sign-in true
  # department is not a CLI flag; set it through Microsoft Graph
  id=$(az ad user show --id "$alias@<verified-domain>" --query id -o tsv)
  az rest --method PATCH \\
    --url "https://graph.microsoft.com/v1.0/users/$id" \\
    --body "{\\"department\\": \\"$dept\\", \\"usageLocation\\": \\"GB\\"}"
done < users.csv`,
    },
    {
      title: 'Create a dynamic security group with Microsoft Graph PowerShell',
      language: 'powershell',
      explanation:
        'Azure CLI cannot set a membership rule, so dynamic groups are created with Microsoft Graph PowerShell or the portal.',
      code: `Connect-MgGraph -Scopes 'Group.ReadWrite.All'

New-MgGroup -DisplayName 'Finance users' \`
  -MailEnabled:$false -MailNickname 'finance-users' \`
  -SecurityEnabled:$true \`
  -GroupTypes 'DynamicMembership' \`
  -MembershipRule 'user.department -eq "Finance" and user.accountEnabled -eq true' \`
  -MembershipRuleProcessingState 'On'`,
    },
    {
      title: 'Invite a B2B guest and assign group-based licensing',
      language: 'powershell',
      explanation:
        'The invitation creates the guest object immediately; redemption happens when they follow the link. The license is assigned to the group, not the person.',
      placeholders: ['<group-id>', '<sku-id>'],
      code: `Connect-MgGraph -Scopes 'User.Invite.All','Group.ReadWrite.All','Organization.Read.All'

New-MgInvitation -InvitedUserEmailAddress 'lee@fabrikam.com' \`
  -InvitedUserDisplayName 'Lee (Fabrikam)' \`
  -InviteRedirectUrl 'https://myapps.microsoft.com' \`
  -SendInvitationMessage:$true

# Find the SKU, then license the whole group
Get-MgSubscribedSku | Select-Object SkuPartNumber, SkuId
Set-MgGroupLicense -GroupId '<group-id>' \`
  -AddLicenses @(@{ SkuId = '<sku-id>' }) -RemoveLicenses @()`,
    },
  ],
  imperative: [
    {
      command:
        'az ad user create --display-name "Ana Silva" --user-principal-name ana@<verified-domain> --password "<initial-password>" --force-change-password-next-sign-in true',
      what: 'Creates a cloud-only member user who must change the password at first sign-in.',
      expected: 'JSON for the new user, including its id and userPrincipalName.',
      placeholders: ['<verified-domain>', '<initial-password>'],
    },
    {
      command: 'az ad group create --display-name "App admins" --mail-nickname app-admins',
      what: 'Creates an assigned security group.',
      expected: 'JSON with the group id and securityEnabled: true.',
    },
    {
      command: 'az ad group member add --group "App admins" --member-id <user-object-id>',
      what: 'Adds a user to an assigned group by object ID.',
      placeholders: ['<user-object-id>'],
    },
    {
      command: 'az ad user update --id ana@<verified-domain> --account-enabled false',
      what: 'Blocks sign-in for a leaver without deleting the account or its data.',
      placeholders: ['<verified-domain>'],
    },
    {
      command: 'Update-MgUser -UserId ana@<verified-domain> -UsageLocation GB -Department Finance',
      what: 'Sets the usage location (required for licensing) and a department that a dynamic rule can use.',
      placeholders: ['<verified-domain>'],
    },
    {
      command: 'az ad user delete --id ana@<verified-domain>',
      what: 'Soft-deletes the user. It can be restored from Deleted users for 30 days.',
      placeholders: ['<verified-domain>'],
    },
  ],
  declarative: {
    steps: [
      'Users and groups are directory objects, not Azure resources, so they are not deployed by ARM. Use the Microsoft Graph Bicep extension (or Graph PowerShell scripts in a pipeline) to manage them as code.',
      'Enable the extension in `bicepconfig.json`, then declare the group with a stable `uniqueName` so repeated deployments update rather than duplicate it.',
      'Reference the group principal ID from ordinary Azure resources, for example a role assignment on a resource group.',
      'Deploy with `az deployment group create` and verify the group exists with `az ad group show`.',
    ],
    code: [
      {
        title: 'Security group plus role assignment with the Microsoft Graph Bicep extension',
        language: 'bicep',
        explanation:
          'The Graph extension lets one Bicep file create the group and grant it Reader on the resource group it is deployed to.',
        code: `extension microsoftGraphV1

resource financeGroup 'Microsoft.Graph/groups@v1.0' = {
  uniqueName: 'finance-readers'
  displayName: 'Finance readers'
  mailEnabled: false
  mailNickname: 'finance-readers'
  securityEnabled: true
}

var readerRoleId = 'acdd72a7-3385-48ef-bd42-f606fba81ae7'

resource readerAssignment 'Microsoft.Authorization/roleAssignments@2022-04-01' = {
  name: guid(resourceGroup().id, financeGroup.id, readerRoleId)
  properties: {
    principalId: financeGroup.id
    principalType: 'Group'
    roleDefinitionId: subscriptionResourceId('Microsoft.Authorization/roleDefinitions', readerRoleId)
  }
}`,
      },
    ],
  },
  verification: [
    {
      command:
        'az ad user show --id ana@<verified-domain> --query "{upn:userPrincipalName, type:userType, enabled:accountEnabled}"',
      what: 'Confirms the user exists and shows its type and sign-in state.',
      expected: 'upn, type Member or Guest, enabled true or false.',
      placeholders: ['<verified-domain>'],
    },
    {
      command:
        'az ad group member list --group "Finance users" --query "[].userPrincipalName" -o tsv',
      what: 'Lists the current members of a group, including those added by a dynamic rule.',
    },
    {
      command: 'az ad user get-member-groups --id ana@<verified-domain>',
      what: 'Shows every group the user is a member of, including transitive membership.',
      placeholders: ['<verified-domain>'],
    },
    {
      command:
        'Get-MgUser -Filter "userType eq \'Guest\'" -Property DisplayName,ExternalUserState | Select DisplayName,ExternalUserState',
      what: 'Lists guest users and whether they have accepted the invitation.',
      expected: 'ExternalUserState is PendingAcceptance or Accepted.',
    },
  ],
  troubleshooting: [
    {
      command:
        'Get-MgGroup -GroupId <group-id> -Property MembershipRule,MembershipRuleProcessingState',
      what: 'A dynamic group shows no members: check the rule text and that processing is On, not Paused.',
      placeholders: ['<group-id>'],
    },
    {
      command: 'Get-MgUser -UserId ana@<verified-domain> -Property UsageLocation,AssignedLicenses',
      what: 'A group license did not apply: an empty UsageLocation is the most common cause.',
      placeholders: ['<verified-domain>'],
    },
    {
      command: 'az ad user show --id ana@<verified-domain> --query onPremisesSyncEnabled',
      what: 'Editing an attribute fails: true means the user is synced and must be changed in on-premises AD.',
      placeholders: ['<verified-domain>'],
    },
    {
      command: 'Get-MgDirectoryDeletedItemAsUser | Select DisplayName, DeletedDateTime',
      what: 'A deleted user needs to come back: list soft-deleted users that can still be restored within 30 days.',
    },
  ],
  commonMistakes: [
    'Trying to add a member by hand to a dynamic group. Membership is controlled only by the rule; change the attribute or the rule instead.',
    'Assigning a license to a user with no usage location. The assignment fails until `usageLocation` is set.',
    'Editing the department of a synchronised user in the portal. Source-of-authority is on-premises AD, so the change is either blocked or overwritten on the next sync.',
    'Enabling SSPR for synced users without password writeback. The cloud password changes but the on-premises one does not, and sign-in to domain resources breaks.',
    'Assuming a guest is a second-class account that cannot be granted Azure roles. Guests can hold RBAC roles; what is restricted by default is their ability to browse the directory.',
    'Creating a group that must hold Entra roles without setting `isAssignableToRole`. It can only be set when the group is created.',
  ],
  examTips: [
    'Dynamic membership requires Microsoft Entra ID P1 (or P2). If a question says the tenant has only the Free edition, dynamic groups and group-based licensing are not available.',
    'A security group can be used for RBAC, licensing and Conditional Access; a Microsoft 365 group is for collaboration. If the scenario is about granting access to Azure resources, the answer is a security group.',
    'Remember the usage location requirement: "user cannot be assigned a license" almost always means set `usageLocation` first.',
    'Deleted users and Microsoft 365 groups are soft-deleted and can be restored for 30 days. Treat a deleted security group as gone unless your tenant shows it under Deleted groups: exam answers assume only users and Microsoft 365 groups are restorable.',
    'For external users, "who can invite guests" is controlled by External collaboration settings; "allow or block specific partner domains" is also there. Cross-tenant access settings handle trust with other Entra tenants, such as accepting their MFA.',
    'SSPR can be scoped to one group only with the Selected option. If a question needs two groups, nest them or add both sets of users to one group.',
  ],
  summary: [
    'A tenant holds users, groups and apps; subscriptions trust one tenant for sign-in.',
    'Members belong to your organisation; guests are B2B users who authenticate at home.',
    'Assigned groups are managed by hand; dynamic groups follow an attribute rule and need Entra ID P1.',
    'Group-based licensing needs a usage location on every user.',
    'SSPR is scoped to None, Selected or All, with 1 or 2 methods; synced users need password writeback.',
  ],
  practice: [
    {
      id: 'az1-entra-users-groups-p1',
      level: 'beginner',
      prompt:
        'You try to add a user to the group "Sales users" and the portal says membership is managed by a rule. What does that mean and how do you get the user in?',
      answer:
        'The group has dynamic membership. Set the attribute the rule tests (for example `department` to Sales) on the user, or change the rule. You cannot add members manually.',
    },
    {
      id: 'az1-entra-users-groups-p2',
      level: 'beginner',
      prompt:
        'Group-based licensing shows three users in an error state. What is the first property you check?',
      answer:
        'The `usageLocation` of each user. A license cannot be assigned until the country is set; other causes are not enough licenses or conflicting service plans.',
    },
    {
      id: 'az1-entra-users-groups-p3',
      level: 'intermediate',
      prompt:
        'Your users are synchronised from on-premises AD. You enable SSPR for all users, but after resetting, users cannot sign in to their domain-joined PCs with the new password. Why?',
      answer:
        'Password writeback is not enabled in Microsoft Entra Connect, so the reset only changed the cloud password. Enable writeback so the new password is written back to AD.',
    },
    {
      id: 'az1-entra-users-groups-p4',
      level: 'intermediate',
      prompt:
        'Write a dynamic membership rule for enabled members (not guests) in the Engineering department.',
      answer:
        '(user.department -eq "Engineering") and (user.userType -eq "Member") and (user.accountEnabled -eq true)',
      explanation:
        'Rules combine expressions with and/or; string values are quoted and comparisons use -eq, -ne, -contains, -startsWith and similar operators.',
    },
    {
      id: 'az1-entra-users-groups-p5',
      level: 'advanced',
      prompt:
        'Only members of the IT group may invite guests, and invitations to gmail.com must be blocked. Where do you configure each requirement?',
      answer:
        'Both are in External collaboration settings: restrict guest invite settings so only admins and users in the Guest Inviter role can invite (give the IT group that role), and add gmail.com to the deny list in collaboration restrictions.',
    },
  ],
  lab: {
    title: 'Build a self-maintaining group and invite a guest',
    scenario:
      'You are the administrator of a test tenant. Create users, a dynamic group, a guest and a scoped SSPR policy, and prove that membership follows attributes.',
    prerequisites: [
      'An Azure free account; its tenant includes a free trial of Microsoft Entra ID P2 you can activate',
      'Cloud Shell, or Azure CLI plus the Microsoft.Graph PowerShell module',
      'User Administrator and Groups Administrator (or Global Administrator) in the tenant',
    ],
    tasks: [
      {
        instruction:
          'Create two cloud users, lab-ana and lab-ben, with a forced password change at first sign-in.',
      },
      {
        instruction: 'Set department Finance and usage location GB on lab-ana only.',
        hint: 'Use Update-MgUser or az rest against Microsoft Graph.',
      },
      {
        instruction:
          'Create a dynamic security group lab-finance with the rule user.department -eq "Finance".',
        hint: 'Membership can take a few minutes to evaluate.',
      },
      {
        instruction:
          'Confirm lab-ana is a member and lab-ben is not. Then set lab-ben to Finance and watch him join.',
      },
      {
        instruction:
          'Invite an external email address you control as a guest and observe its PendingAcceptance state.',
      },
      {
        instruction:
          'In the portal, enable SSPR for Selected and pick lab-finance, requiring one method.',
        hint: 'Protection > Password reset > Properties.',
      },
    ],
    solution: [
      {
        title: 'Users, attributes and the dynamic group',
        language: 'powershell',
        placeholders: ['<verified-domain>', '<initial-password>'],
        code: `Connect-MgGraph -Scopes 'User.ReadWrite.All','Group.ReadWrite.All','User.Invite.All'
$pw = @{ Password = '<initial-password>'; ForceChangePasswordNextSignIn = $true }

foreach ($a in 'lab-ana','lab-ben') {
  New-MgUser -DisplayName $a -MailNickname $a -AccountEnabled \`
    -UserPrincipalName "$a@<verified-domain>" -PasswordProfile $pw
}
Update-MgUser -UserId 'lab-ana@<verified-domain>' -Department 'Finance' -UsageLocation 'GB'

$g = New-MgGroup -DisplayName 'lab-finance' -MailEnabled:$false -MailNickname 'lab-finance' \`
  -SecurityEnabled:$true -GroupTypes 'DynamicMembership' \`
  -MembershipRule 'user.department -eq "Finance"' -MembershipRuleProcessingState 'On'

# a few minutes later
Get-MgGroupMember -GroupId $g.Id | ForEach-Object { $_.AdditionalProperties.userPrincipalName }

Update-MgUser -UserId 'lab-ben@<verified-domain>' -Department 'Finance'`,
      },
      {
        title: 'Invite the guest',
        language: 'powershell',
        placeholders: ['<your-external-email>'],
        code: `New-MgInvitation -InvitedUserEmailAddress '<your-external-email>' \`
  -InviteRedirectUrl 'https://myapps.microsoft.com' -SendInvitationMessage:$true
Get-MgUser -Filter "userType eq 'Guest'" -Property DisplayName,ExternalUserState |
  Select-Object DisplayName, ExternalUserState`,
      },
    ],
    verification: [
      {
        command:
          'az ad group member list --group lab-finance --query "[].userPrincipalName" -o tsv',
        what: 'Shows both lab users once lab-ben has the Finance department.',
        expected: 'lab-ana@... and lab-ben@...',
      },
      {
        command: 'az ad user list --filter "userType eq \'Guest\'" --query "[].mail" -o tsv',
        what: 'Confirms the guest object exists.',
      },
    ],
    cleanup: [
      {
        command:
          'az ad user delete --id lab-ana@<verified-domain>; az ad user delete --id lab-ben@<verified-domain>; az ad group delete --group lab-finance',
        what: 'Deletes the lab users and group. Also delete the guest, and set SSPR back to None if this is a shared tenant.',
        placeholders: ['<verified-domain>'],
      },
    ],
  },
  relatedTopicIds: ['az1-rbac', 'az1-subscriptions-governance'],
  docs: [
    {
      title: 'Add or delete users',
      url: 'https://learn.microsoft.com/entra/fundamentals/how-to-create-delete-users',
    },
    {
      title: 'Dynamic membership rules for groups',
      url: 'https://learn.microsoft.com/entra/identity/users/groups-dynamic-membership',
    },
    {
      title: 'Group-based licensing',
      url: 'https://learn.microsoft.com/entra/identity/users/licensing-groups-assign',
    },
    {
      title: 'B2B collaboration overview',
      url: 'https://learn.microsoft.com/entra/external-id/what-is-b2b',
    },
    {
      title: 'How self-service password reset works',
      url: 'https://learn.microsoft.com/entra/identity/authentication/concept-sspr-howitworks',
    },
  ],
}
