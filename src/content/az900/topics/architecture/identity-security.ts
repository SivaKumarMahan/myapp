import type { Topic } from '../../../types'

export const identitySecurity: Topic = {
  id: 'az9-identity-security',
  title: 'Identity, access and security: Entra ID, RBAC, Zero Trust and Defender',
  domainId: 'az9-architecture',
  difficulty: 'advanced',
  estimatedMinutes: 40,
  order: 5,
  tags: [
    'entra id',
    'entra domain services',
    'sso',
    'mfa',
    'passwordless',
    'external identities',
    'conditional access',
    'rbac',
    'zero trust',
    'defense in depth',
    'defender for cloud',
  ],
  oneLiner:
    'Who you are (Entra ID and authentication), what you may do (Conditional Access and RBAC), and how Azure layers defences around your workloads.',
  explanation: [
    '**Microsoft Entra ID** is Microsoft’s cloud identity and access management service. It stores users, groups and applications, signs people in to Azure, Microsoft 365 and thousands of SaaS apps, and protects those sign-ins. Organisations with on-premises Active Directory usually synchronise their users to Entra ID with **Microsoft Entra Connect** (or Cloud Sync) so people keep one identity everywhere.',
    '**Microsoft Entra Domain Services** is different: it provides a managed domain with traditional Active Directory features such as domain join, Group Policy, LDAP and Kerberos/NTLM authentication, without you running domain controllers. It is for legacy applications that cannot use modern authentication.',
    '**Authentication** proves who someone is. **Single sign-on (SSO)** lets a user sign in once and reach many apps. **Multifactor authentication (MFA)** requires two or more of something you know, something you have and something you are. **Passwordless** methods such as Windows Hello for Business, the Microsoft Authenticator app and FIDO2 security keys (passkeys) remove the password altogether. **External identities** let partners (B2B collaboration) and customers (Microsoft Entra External ID) sign in with their own accounts.',
    '**Authorisation** decides what a signed-in identity may do. **Conditional Access** evaluates signals such as user, location, device and risk to allow, block or require MFA at sign-in. **Azure role-based access control (RBAC)** grants roles such as Reader or Contributor at a scope. Around all of this sit the **Zero Trust** model, the layered **defense in depth** approach, and **Microsoft Defender for Cloud**, which assesses and protects your resources.',
  ],
  whyItMatters: [
    'This is the most concept-heavy part of the architecture domain. Expect questions that ask you to tell authentication from authorisation, Entra ID from Entra Domain Services, and Conditional Access from RBAC.',
    'Identity is the new security perimeter. Most cloud breaches start with a stolen or weak credential, so MFA, Conditional Access and least-privilege RBAC are the controls that matter most in real environments.',
    'Knowing the Zero Trust principles and defense-in-depth layers helps you reason about any security scenario, even one you have not studied directly.',
  ],
  howItWorks: [
    'A user signs in to Entra ID. Entra ID verifies the credentials (password, passkey, Authenticator) and, if policy requires, a second factor.',
    '**Conditional Access** is an if-then engine: if the signals match a policy (for example "any user, outside the corporate network, accessing the Azure portal"), then enforce a decision (require MFA, require a compliant device, or block). It needs Microsoft Entra ID P1 or higher licensing.',
    'Once signed in, access to Azure resources is decided by **Azure RBAC**. A role assignment combines three things: a **security principal** (user, group, service principal or managed identity), a **role definition** (a set of allowed actions, such as Reader, Contributor or Owner) and a **scope** (management group, subscription, resource group or resource).',
    'Role assignments are **inherited** by child scopes and are **additive**: if you are Reader at the subscription and Contributor on one resource group, you can change things in that group. Deny assignments, used by some platform features, can override allows.',
    '**Zero Trust** rests on three principles: verify explicitly (always authenticate and authorise using all available signals), use least-privilege access (just-in-time and just-enough access), and assume breach (segment access, encrypt, and monitor to limit blast radius).',
    '**Defense in depth** stacks layers so that one failing control does not expose data: physical security, identity and access, perimeter, network, compute, application and data. **Defender for Cloud** is a cloud security posture management (CSPM) and workload protection tool that gives you a **secure score**, recommendations and threat alerts across Azure, on-premises (through Azure Arc) and other clouds such as AWS and Google Cloud.',
  ],
  diagrams: [
    {
      kind: 'flow',
      title: 'From sign-in to an allowed action',
      caption:
        'Authentication and Conditional Access decide whether you get a token. RBAC then decides what that token lets you do.',
      nodes: [
        {
          label: 'User signs in to Entra ID',
          detail: 'Password, passkey or Authenticator',
          tone: 'accent',
        },
        {
          label: 'Conditional Access evaluates signals',
          detail: 'User, location, device, risk, app',
          arrowLabel: 'credentials OK',
          branch: { label: 'Policy says block', detail: 'Sign-in denied', tone: 'danger' },
        },
        {
          label: 'MFA or compliant device if required',
          detail: 'Something you have or are',
          arrowLabel: 'grant with controls',
        },
        { label: 'Token issued', detail: 'Proves who the user is', arrowLabel: 'satisfied' },
        {
          label: 'Azure RBAC checks role at scope',
          detail: 'Reader, Contributor, Owner and more',
          tone: 'success',
        },
      ],
    },
    {
      kind: 'nested',
      title: 'Defense in depth layers',
      caption:
        'Each layer protects the one inside it. Data at the centre is what attackers are after.',
      root: {
        label: 'Physical security',
        detail: 'Microsoft datacenter controls',
        tone: 'muted',
        children: [
          {
            label: 'Identity and access, perimeter',
            detail: 'Entra ID, MFA, DDoS protection',
            children: [
              {
                label: 'Network and compute',
                detail: 'NSGs, private endpoints, patched VMs',
                tone: 'accent',
                children: [
                  {
                    label: 'Application and data',
                    detail: 'Secure code, encryption',
                    tone: 'success',
                  },
                ],
              },
            ],
          },
        ],
      },
    },
  ],
  keyObjects: [
    {
      kind: 'Role assignment (Microsoft.Authorization/roleAssignments)',
      apiVersion: '2022-04-01',
      purpose: 'Grants a security principal a role definition at a scope. The core of Azure RBAC.',
      fields: [
        {
          path: 'properties.principalId',
          meaning: 'Object ID of the user, group, service principal or managed identity.',
          required: true,
        },
        {
          path: 'properties.roleDefinitionId',
          meaning: 'The role, e.g. Reader, Contributor, Owner.',
          required: true,
        },
        {
          path: 'scope',
          meaning: 'Management group, subscription, resource group or resource.',
          required: true,
        },
        { path: 'properties.principalType', meaning: 'User, Group or ServicePrincipal.' },
      ],
    },
    {
      kind: 'Microsoft Entra ID tenant',
      purpose:
        'The directory that holds identities and trusts subscriptions. Not an Azure resource in a resource group.',
      fields: [
        {
          path: 'users and groups',
          meaning: 'Members, guests (B2B) and security or Microsoft 365 groups.',
        },
        { path: 'enterprise applications', meaning: 'Apps configured for SSO.' },
        {
          path: 'authentication methods',
          meaning: 'Which MFA and passwordless methods users may register.',
        },
      ],
    },
    {
      kind: 'Conditional Access policy',
      purpose: 'An if-then rule evaluated at sign-in. Configured in the Entra admin center.',
      fields: [
        { path: 'conditions.users', meaning: 'Which users or groups the policy targets.' },
        {
          path: 'conditions.locations',
          meaning: 'Named locations, e.g. outside the corporate network.',
        },
        { path: 'grantControls', meaning: 'Block, or require MFA, compliant device and so on.' },
        { path: 'state', meaning: 'Enabled, disabled or report-only for testing.' },
      ],
    },
    {
      kind: 'Built-in Azure roles',
      purpose: 'The four fundamental roles you should know by name.',
      fields: [
        { path: 'Owner', meaning: 'Full access including assigning roles to others.' },
        { path: 'Contributor', meaning: 'Create and manage resources, but cannot grant access.' },
        { path: 'Reader', meaning: 'View resources only.' },
        {
          path: 'User Access Administrator',
          meaning: 'Manage access for others, not the resources themselves.',
        },
      ],
    },
  ],
  realWorldExample: {
    title: 'Closing the door after a phishing scare',
    story: [
      'An engineer at a manufacturing company fell for a phishing email and entered her password on a fake page. The attacker signed in from another country and could see several subscriptions because she was an Owner on all of them.',
      'The incident response team made three changes. They enabled a Conditional Access policy requiring MFA for all users and blocking legacy authentication. They replaced standing Owner assignments with Contributor on the specific resource groups each team needed, assigned to groups rather than individuals. And they rolled out passkeys in the Authenticator app so staff no longer typed passwords at all.',
      'They also turned on Defender for Cloud across every subscription. Its secure score showed storage accounts with public access and VMs missing updates, and the team worked through the recommendations over the next quarter, following Zero Trust principles of verifying explicitly and granting least privilege.',
    ],
  },
  yamlExamples: [
    {
      title: 'Assign Reader on a resource group in Bicep',
      language: 'bicep',
      explanation:
        'guid() makes the assignment name deterministic, so redeploying does not create duplicates. The GUID is the built-in Reader role definition ID.',
      code: `param principalId string

var readerRoleId = subscriptionResourceId(
  'Microsoft.Authorization/roleDefinitions',
  'acdd72a7-3385-48ef-bd42-f606fba81ae7'
)

resource readerAssignment 'Microsoft.Authorization/roleAssignments@2022-04-01' = {
  name: guid(resourceGroup().id, principalId, readerRoleId)
  properties: {
    roleDefinitionId: readerRoleId
    principalId: principalId
    principalType: 'Group'
  }
}`,
      placeholders: ['principalId'],
    },
    {
      title: 'List Conditional Access policies with Microsoft Graph PowerShell',
      language: 'powershell',
      code: `Connect-MgGraph -Scopes 'Policy.Read.All'
Get-MgIdentityConditionalAccessPolicy |
  Select-Object DisplayName, State |
  Format-Table`,
    },
  ],
  imperative: [
    {
      command:
        'az role assignment create --assignee <user-or-group-object-id> --role Reader --scope /subscriptions/<subscription-id>/resourceGroups/rg-az900-sec',
      what: 'Grants Reader on one resource group.',
      placeholders: ['<user-or-group-object-id>', '<subscription-id>'],
    },
    {
      command: 'az role assignment list --assignee <user-upn> --all --output table',
      what: 'Lists every role assignment for a user across all scopes you can see.',
      placeholders: ['<user-upn>'],
    },
    {
      command:
        'az role definition list --name Contributor --query "[].{actions:permissions[0].actions, notActions:permissions[0].notActions}"',
      what: 'Shows what the Contributor role can and cannot do (it cannot write role assignments).',
    },
    {
      command:
        'az ad group create --display-name "sec-az900-readers" --mail-nickname sec-az900-readers',
      what: 'Creates an Entra ID security group to assign roles to.',
    },
    {
      command:
        'New-AzRoleAssignment -ObjectId <group-object-id> -RoleDefinitionName Reader -ResourceGroupName rg-az900-sec',
      what: 'The Azure PowerShell equivalent of assigning Reader.',
      placeholders: ['<group-object-id>'],
    },
  ],
  declarative: {
    steps: [
      'Create groups for job functions rather than assigning roles to individuals.',
      'Choose the least-privileged built-in role that does the job.',
      'Assign it at the narrowest scope that covers the need, using Bicep for repeatability.',
      'Review assignments regularly and remove ones that are no longer needed.',
    ],
    code: [
      {
        title: 'Deploy the role assignment template',
        language: 'bash',
        code: `GROUP_ID=$(az ad group show --group sec-az900-readers --query id -o tsv)
az deployment group create \\
  --resource-group rg-az900-sec \\
  --template-file reader.bicep \\
  --parameters principalId=$GROUP_ID`,
      },
    ],
  },
  verification: [
    {
      command: 'az role assignment list --resource-group rg-az900-sec --output table',
      what: 'Shows who has which role on the resource group, including inherited assignments with --include-inherited.',
      expected: 'A Reader row for sec-az900-readers.',
    },
    {
      command: 'az security secure-scores list --output table',
      what: 'Shows the Defender for Cloud secure score for the subscription.',
    },
    {
      command: 'az ad signed-in-user show --query "{upn:userPrincipalName, id:id}"',
      what: 'Confirms which Entra ID identity your CLI session is using.',
    },
  ],
  troubleshooting: [
    {
      command:
        'az role assignment list --assignee <user-upn> --all --include-inherited --output table',
      what: 'Explains unexpected access: shows assignments inherited from a subscription or management group.',
      placeholders: ['<user-upn>'],
      namespaceNote:
        'Assignments are additive, so any one of these rows can be the source of the access.',
    },
    {
      command:
        'az security assessment list --query "[?status.code==\'Unhealthy\'].displayName" --output tsv',
      what: 'Lists Defender for Cloud recommendations that are currently unhealthy.',
    },
    {
      command: 'az account get-access-token --query expiresOn',
      what: 'Checks the current token when a recently granted role seems not to work; sign out and in again to refresh it.',
    },
  ],
  commonMistakes: [
    'Confusing Entra ID with Entra Domain Services. Entra ID is modern cloud identity; Domain Services provides a managed classic AD domain for legacy apps.',
    'Thinking Conditional Access grants permissions to resources. It controls sign-in; RBAC controls what you can do after.',
    'Giving everyone Owner because it is easy. Contributor cannot assign roles, which is usually what you want.',
    'Assigning roles to individual users instead of groups, which makes access reviews painful.',
    'Believing Zero Trust means trusting the internal network. It means never assuming trust based on network location.',
  ],
  examTips: [
    'Authentication is proving who you are; authorisation is what you are allowed to do.',
    'Conditional Access uses signals to make an access decision at sign-in: allow, block or require MFA.',
    'RBAC = security principal + role definition + scope. Assignments inherit downwards and are additive.',
    'Zero Trust principles: verify explicitly, use least privilege, assume breach.',
    'Defender for Cloud: secure score and recommendations (posture) plus threat protection for Azure, hybrid and multicloud.',
    'Defense in depth layers, outside in: physical, identity and access, perimeter, network, compute, application, data.',
  ],
  summary: [
    'Entra ID is the cloud identity service; Entra Domain Services is a managed AD domain.',
    'SSO, MFA and passwordless make sign-in easier and safer; External ID covers partners and customers.',
    'Conditional Access decides whether to allow a sign-in; RBAC decides what a principal can do at a scope.',
    'Zero Trust and defense in depth are the guiding security models.',
    'Defender for Cloud measures and improves security posture across clouds.',
  ],
  practice: [
    {
      id: 'az9-identity-security-p1',
      level: 'beginner',
      prompt: 'Name the three categories of factor that multifactor authentication can combine.',
      answer:
        'Something you know (a password or PIN), something you have (a phone or security key) and something you are (a fingerprint or face).',
    },
    {
      id: 'az9-identity-security-p2',
      level: 'intermediate',
      prompt:
        'A legacy app needs LDAP and Kerberos, and you do not want to run domain controllers in Azure. Which service fits?',
      answer:
        'Microsoft Entra Domain Services, which provides a managed domain with those protocols.',
    },
    {
      id: 'az9-identity-security-p3',
      level: 'intermediate',
      prompt:
        'A user has Reader on a subscription and Contributor on one resource group in it. What can they do in that resource group?',
      answer:
        'Create and manage resources there, because role assignments are additive and Contributor includes the Reader permissions.',
    },
    {
      id: 'az9-identity-security-p4',
      level: 'advanced',
      prompt:
        'Which Zero Trust principle is applied when you segment networks and encrypt data so that an attacker who gets in cannot move freely?',
      answer:
        'Assume breach: design as if the attacker is already inside and minimise the blast radius.',
    },
  ],
  lab: {
    title: 'Grant least-privilege access with a group and RBAC',
    scenario:
      'Create a security group, assign it Reader on a resource group, inspect the result, and look at your Defender for Cloud secure score.',
    prerequisites: [
      'An Azure subscription where you are Owner or User Access Administrator',
      'Permission to create groups in Entra ID',
      'Azure Cloud Shell (Bash)',
    ],
    tasks: [
      { instruction: 'Create resource group rg-az900-sec.' },
      { instruction: 'Create an Entra ID security group called sec-az900-readers.' },
      { instruction: 'Assign the group the Reader role at the rg-az900-sec scope.' },
      { instruction: 'List role assignments on the resource group and find the new one.' },
      {
        instruction:
          'Compare the Contributor and Owner role definitions and note which one can assign roles.',
        hint: 'Look at the notActions of Contributor.',
      },
      { instruction: 'Show the secure score for your subscription in Defender for Cloud.' },
    ],
    solution: [
      {
        title: 'Group, role assignment and inspection',
        language: 'bash',
        code: `az group create -n rg-az900-sec -l westeurope
GROUP_ID=$(az ad group create --display-name sec-az900-readers \\
  --mail-nickname sec-az900-readers --query id -o tsv)
RG_ID=$(az group show -n rg-az900-sec --query id -o tsv)

az role assignment create --assignee-object-id "$GROUP_ID" \\
  --assignee-principal-type Group --role Reader --scope "$RG_ID"

az role assignment list -g rg-az900-sec -o table
az role definition list --name Contributor --query "[0].permissions[0].notActions"
az security secure-scores list -o table`,
      },
    ],
    verification: [
      {
        command:
          'az role assignment list -g rg-az900-sec --query "[?principalName==\'sec-az900-readers\'].roleDefinitionName" -o tsv',
        what: 'Confirms the group has Reader on the group scope.',
        expected: 'Reader',
      },
      {
        command: 'az ad group show --group sec-az900-readers --query displayName -o tsv',
        what: 'Confirms the group exists in Entra ID.',
        expected: 'sec-az900-readers',
      },
    ],
    cleanup: [
      {
        command: 'az group delete -n rg-az900-sec --yes --no-wait',
        what: 'Deletes the resource group and the role assignment scoped to it.',
      },
      {
        command: 'az ad group delete --group sec-az900-readers',
        what: 'Deletes the Entra ID group, which is not inside any resource group.',
      },
    ],
  },
  relatedTopicIds: ['az9-core-architecture', 'az9-networking-services', 'az9-storage-services'],
  docs: [
    {
      title: 'What is Microsoft Entra ID?',
      url: 'https://learn.microsoft.com/entra/fundamentals/whatis',
    },
    {
      title: 'What is Conditional Access?',
      url: 'https://learn.microsoft.com/entra/identity/conditional-access/overview',
    },
    {
      title: 'What is Azure role-based access control?',
      url: 'https://learn.microsoft.com/azure/role-based-access-control/overview',
    },
    {
      title: 'Zero Trust guidance',
      url: 'https://learn.microsoft.com/security/zero-trust/zero-trust-overview',
    },
    {
      title: 'What is Microsoft Defender for Cloud?',
      url: 'https://learn.microsoft.com/azure/defender-for-cloud/defender-for-cloud-introduction',
    },
  ],
}
