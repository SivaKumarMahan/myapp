import type { Topic } from '../../../types'

export const az1StorageSecurity: Topic = {
  id: 'az1-storage-security',
  title: 'Securing storage: network rules, keys, SAS and Entra authentication',
  domainId: 'az1-storage',
  difficulty: 'advanced',
  estimatedMinutes: 40,
  order: 2,
  tags: [
    'storage-firewall',
    'access-keys',
    'sas',
    'user-delegation-sas',
    'stored-access-policy',
    'entra-auth',
    'azure-files-identity',
  ],
  oneLiner:
    'Control who can reach a storage account over the network and how they prove who they are: firewalls, keys, shared access signatures and Microsoft Entra ID.',
  explanation: [
    'Storage security has two independent layers. The **network layer** decides whether a request can reach the account at all: public access from all networks, only from selected virtual networks and IP ranges, or disabled in favour of private endpoints. The **authorization layer** decides whether a request that arrives is allowed: Entra ID with RBAC, a shared key, or a shared access signature.',
    'Each account has two **access keys**. A key is effectively root access to every service in the account, so anyone holding it can read, write and delete everything. Two keys exist so you can **rotate** one while applications use the other. You can also turn shared key authorization off entirely.',
    'A **shared access signature (SAS)** is a signed URL token granting limited access: specific services, resource types, permissions, IP range, protocol and time window. An **account SAS** and a **service SAS** are signed with an account key. A **user delegation SAS** is signed with a key obtained through Entra ID credentials and works only for Blob storage (and Data Lake). It is the recommended type because it does not depend on account keys and is tied to the identity that created it.',
    '**Microsoft Entra ID authorization** is the preferred way for users and workloads to access blobs, queues and tables: assign a data role such as **Storage Blob Data Contributor** to a user, group or managed identity, and the client presents an OAuth token. For **Azure Files**, identity-based access over SMB uses **Active Directory Domain Services**, **Microsoft Entra Domain Services** or **Microsoft Entra Kerberos** for hybrid identities, combined with share-level RBAC roles and Windows NTFS permissions.',
  ],
  whyItMatters: [
    'This is one of the most tested AZ-104 storage areas: configure firewalls and virtual networks, manage access keys, create SAS tokens and stored access policies, configure identity-based access for Azure Files, and choose the right authorization method for a scenario.',
    'Leaked keys and over-broad SAS tokens are among the most common causes of cloud data exposure. Knowing how to revoke access quickly, and which revocation works for which SAS type, is an operational must.',
    'Moving applications from keys to managed identities removes secrets from configuration entirely, which also removes a whole category of rotation incidents.',
  ],
  howItWorks: [
    'The storage **firewall** starts from `publicNetworkAccess` and `networkAcls.defaultAction`. With `Deny`, only listed **virtual network rules** (subnets that have the `Microsoft.Storage` service endpoint), **IP rules** (public IPv4 addresses or CIDR ranges, not private ranges) and **resource instance rules** get through. **Trusted Microsoft services** such as Azure Backup or Event Grid can be allowed as an exception.',
    '**Private endpoints** give the account a private IP in your VNet per service (blob, file and so on). Combined with disabling public network access, traffic never uses the public endpoint. Name resolution uses a `privatelink` private DNS zone.',
    'Key rotation: switch apps to key2, regenerate key1, switch back or keep using key2, then regenerate key2 on the next cycle. Regenerating a key immediately invalidates it and every account or service SAS signed with it. Storing keys in Key Vault and setting a **key expiration policy** helps enforce rotation.',
    'A SAS token has fields such as `sv` (version), `ss` (services), `srt` (resource types), `sp` (permissions), `st` and `se` (start and expiry), `sip` (IP range), `spr` (protocol) and `sig` (signature). Anyone with the URL has the access; nothing is checked against an identity for key-based SAS.',
    'A **stored access policy** is defined on a container, share, queue or table and can hold up to five policies. A service SAS that references it inherits start, expiry and permissions from the policy, so you can **revoke** or extend all those SAS tokens by editing or deleting the policy, without rotating keys. Stored access policies do not apply to account SAS or user delegation SAS.',
    'A user delegation SAS is revoked by revoking the **user delegation key** (`az storage account revoke-delegation-keys`) or by removing the identity RBAC permissions. Its maximum lifetime is seven days.',
    'With Entra ID, the control plane (manage the account) and data plane (read blobs) are separate. A user who is Reader on the account but has Storage Blob Data Reader can read blobs with `--auth-mode login`. If `allowSharedKeyAccess` is false, all key and key-based SAS requests fail, so every client must use Entra ID.',
    'For Azure Files over SMB, enable an identity source on the account, assign **Storage File Data SMB Share Reader**, **Contributor** or **Elevated Contributor** at the share (or a default share-level permission for all authenticated users), and then set NTFS ACLs on directories and files. Both layers must allow the action.',
  ],
  diagrams: [
    {
      kind: 'flow',
      title: 'How a storage request is checked',
      caption:
        'The network check comes first. A valid token from a blocked network is still rejected.',
      nodes: [
        { label: 'Client request', detail: 'Over HTTPS to the account endpoint', tone: 'accent' },
        {
          label: 'Network rules',
          detail: 'Public, selected networks, private endpoint',
          branch: {
            label: '403 AuthorizationFailure',
            detail: 'Blocked by firewall',
            tone: 'danger',
          },
        },
        { label: 'Authorization method', detail: 'Entra token, shared key or SAS' },
        { label: 'Permission check', detail: 'RBAC data role or SAS permissions' },
        { label: 'Operation succeeds', tone: 'success' },
      ],
    },
    {
      kind: 'decision',
      title: 'Which kind of SAS should you use?',
      caption:
        'Prefer Entra ID first. When a SAS is needed, prefer user delegation for blobs, or a stored access policy for revocability.',
      question: 'What does the SAS need to do?',
      branches: [
        {
          condition: 'Blob access, avoid account keys',
          result: 'User delegation SAS',
          tone: 'success',
        },
        {
          condition: 'One service, must be revocable',
          result: 'Service SAS with stored access policy',
          tone: 'accent',
        },
        { condition: 'Several services or service-level operations', result: 'Account SAS' },
        { condition: 'An app you control in Azure', result: 'No SAS: managed identity and RBAC' },
      ],
    },
    {
      kind: 'sequence',
      title: 'Issuing a user delegation SAS',
      caption: 'No account key is involved. The delegation key is obtained with an Entra token.',
      participants: [
        { id: 'app', label: 'Backend app' },
        { id: 'entra', label: 'Microsoft Entra ID' },
        { id: 'storage', label: 'Blob service' },
        { id: 'client', label: 'External client' },
      ],
      messages: [
        { from: 'app', to: 'entra', label: 'Get token for storage' },
        { from: 'app', to: 'storage', label: 'Get user delegation key' },
        { from: 'storage', to: 'app', label: 'Delegation key, max 7 days', kind: 'return' },
        { from: 'app', to: 'client', label: 'Signed blob URL' },
        { from: 'client', to: 'storage', label: 'GET blob with SAS' },
      ],
    },
  ],
  keyObjects: [
    {
      kind: 'Network rule set (properties.networkAcls)',
      purpose: 'The storage firewall for the public endpoint.',
      fields: [
        {
          path: 'properties.publicNetworkAccess',
          meaning: 'Enabled or Disabled. Disabled means private endpoints only.',
        },
        {
          path: 'properties.networkAcls.defaultAction',
          meaning: 'Allow or Deny for traffic not matched by a rule.',
        },
        {
          path: 'properties.networkAcls.virtualNetworkRules[]',
          meaning: 'Subnets with the Microsoft.Storage service endpoint.',
        },
        {
          path: 'properties.networkAcls.ipRules[]',
          meaning: 'Public IPv4 addresses or CIDR ranges.',
        },
        {
          path: 'properties.networkAcls.bypass',
          meaning: 'AzureServices, Logging, Metrics or None.',
        },
      ],
    },
    {
      kind: 'Account keys and shared key settings',
      purpose: 'The two account keys and whether key-based authorization is allowed.',
      fields: [
        {
          path: 'properties.allowSharedKeyAccess',
          meaning: 'false disables account keys, account SAS and service SAS.',
        },
        {
          path: 'properties.keyPolicy.keyExpirationPeriodInDays',
          meaning: 'Flags keys that have not been rotated in time.',
        },
        { path: 'keys[].keyName', meaning: 'key1 and key2; regenerate one at a time.' },
      ],
    },
    {
      kind: 'Shared access signature',
      purpose: 'A signed token granting limited, time-bound access.',
      fields: [
        { path: 'sp', meaning: 'Permissions such as r, w, d, l, a, c.' },
        { path: 'st / se', meaning: 'Start and expiry time in UTC.' },
        { path: 'sip / spr', meaning: 'Allowed IP range and protocol (https).' },
        { path: 'si', meaning: 'Stored access policy identifier, for service SAS only.' },
        { path: 'skoid', meaning: 'Object ID of the signer; present only on user delegation SAS.' },
      ],
    },
    {
      kind: 'Azure Files identity-based authentication',
      purpose: 'Kerberos authentication to SMB shares with share-level RBAC and NTFS permissions.',
      fields: [
        {
          path: 'properties.azureFilesIdentityBasedAuthentication.directoryServiceOptions',
          meaning: 'AD, AADDS or AADKERB.',
        },
        {
          path: 'properties.azureFilesIdentityBasedAuthentication.defaultSharePermission',
          meaning: 'Share-level role for all authenticated identities, or None.',
        },
      ],
    },
  ],
  realWorldExample: {
    title: 'The SAS link in a support ticket',
    story: [
      'A support engineer pasted a SAS URL into a ticket so a customer could download diagnostics. The token was an account SAS with read and list on every container, valid for a year, signed with key1. The ticket system was indexed by a partner tool and the link was copied far beyond its intended audience.',
      'Because it was an account SAS, there was no stored access policy to delete. The only way to revoke it was to regenerate key1, which also broke three internal apps still using that key. The team rotated apps to key2 first, then regenerated key1, and the leak was closed within an hour.',
      'Afterwards they moved the apps to managed identities, disabled shared key access on the account, and changed the support tool to issue user delegation SAS URLs for a single blob with a one-day expiry.',
    ],
  },
  yamlExamples: [
    {
      title: 'Lock down the network and allow one subnet and one office IP',
      language: 'bash',
      code: `az network vnet subnet update -g rg-net --vnet-name vnet-app -n snet-app \\
  --service-endpoints Microsoft.Storage

az storage account update -n stcontosodata01 -g rg-storage \\
  --default-action Deny --bypass AzureServices

az storage account network-rule add -n stcontosodata01 -g rg-storage \\
  --vnet-name vnet-app --subnet snet-app --resource-group rg-net

az storage account network-rule add -n stcontosodata01 -g rg-storage \\
  --ip-address 203.0.113.0/24`,
    },
    {
      title: 'Create a user delegation SAS for one blob',
      language: 'bash',
      explanation:
        'The caller needs a data role that allows the delegated permissions, plus the generateUserDelegationKey action (included in Storage Blob Data roles).',
      code: `EXPIRY=$(date -u -d '+1 day' '+%Y-%m-%dT%H:%MZ')
az storage blob generate-sas \\
  --account-name stcontosodata01 \\
  --container-name reports \\
  --name q3.pdf \\
  --permissions r \\
  --expiry "$EXPIRY" \\
  --https-only \\
  --auth-mode login \\
  --as-user \\
  --full-uri`,
    },
    {
      title: 'Stored access policy and a service SAS that uses it',
      language: 'powershell',
      code: `$ctx = New-AzStorageContext -StorageAccountName 'stcontosodata01' -UseConnectedAccount
New-AzStorageContainerStoredAccessPolicy -Container 'uploads' -Policy 'partner-write' \`
  -Permission 'wl' -ExpiryTime (Get-Date).AddDays(30) -Context $ctx

# Service SAS must be signed with a key; this context uses the account key
$keyCtx = (Get-AzStorageAccount -ResourceGroupName 'rg-storage' -Name 'stcontosodata01').Context
New-AzStorageContainerSASToken -Name 'uploads' -Policy 'partner-write' -Context $keyCtx

# Revoke every SAS based on the policy
Remove-AzStorageContainerStoredAccessPolicy -Container 'uploads' -Policy 'partner-write' -Context $keyCtx`,
    },
  ],
  imperative: [
    {
      command: 'az storage account keys list -n stcontosodata01 -g rg-storage -o table',
      what: 'Lists both access keys. Requires the listKeys action, which Contributor and Owner have.',
    },
    {
      command: 'az storage account keys renew -n stcontosodata01 -g rg-storage --key key1',
      what: 'Regenerates key1, invalidating it and every account or service SAS signed with it.',
    },
    {
      command:
        'az storage account update -n stcontosodata01 -g rg-storage --allow-shared-key-access false',
      what: 'Disables key-based authorization so only Entra ID (and user delegation SAS) works.',
    },
    {
      command:
        'az role assignment create --assignee <principal-id> --role "Storage Blob Data Contributor" --scope <storage-account-id>/blobServices/default/containers/uploads',
      what: 'Grants a principal read and write on one container through Entra ID.',
      placeholders: ['<principal-id>', '<storage-account-id>'],
    },
    {
      command:
        'az storage container policy create --account-name stcontosodata01 --container-name uploads --name partner-write --permissions wl --expiry 2026-12-31T00:00Z --auth-mode key',
      what: 'Creates a stored access policy on a container.',
    },
    {
      command: 'az storage account revoke-delegation-keys -n stcontosodata01 -g rg-storage',
      what: 'Revokes all user delegation keys, invalidating every user delegation SAS on the account.',
    },
  ],
  declarative: {
    steps: [
      'Declare the account with `allowSharedKeyAccess: false`, `defaultAction: Deny` and the subnet and IP rules the environment needs.',
      'Declare the role assignment for the application managed identity in the same template.',
      'For Azure Files, set the identity-based authentication options and default share permission on the account.',
      'Deploy, then test from inside and outside the allowed networks.',
    ],
    code: [
      {
        title: 'Keyless, firewalled account with a data role for an app identity',
        language: 'bicep',
        code: `param location string = resourceGroup().location
param accountName string
param subnetId string
param appPrincipalId string

resource sa 'Microsoft.Storage/storageAccounts@2023-05-01' = {
  name: accountName
  location: location
  kind: 'StorageV2'
  sku: { name: 'Standard_ZRS' }
  properties: {
    minimumTlsVersion: 'TLS1_2'
    allowBlobPublicAccess: false
    allowSharedKeyAccess: false
    publicNetworkAccess: 'Enabled'
    networkAcls: {
      defaultAction: 'Deny'
      bypass: 'AzureServices'
      virtualNetworkRules: [
        { id: subnetId, action: 'Allow' }
      ]
      ipRules: [
        { value: '203.0.113.0/24', action: 'Allow' }
      ]
    }
  }
}

// Storage Blob Data Contributor
var blobContributor = 'ba92f5b4-2d11-453d-a403-e96b0029c9fe'

resource appAccess 'Microsoft.Authorization/roleAssignments@2022-04-01' = {
  name: guid(sa.id, appPrincipalId, blobContributor)
  scope: sa
  properties: {
    principalId: appPrincipalId
    principalType: 'ServicePrincipal'
    roleDefinitionId: subscriptionResourceId('Microsoft.Authorization/roleDefinitions', blobContributor)
  }
}`,
      },
    ],
  },
  verification: [
    {
      command:
        'az storage account show -n stcontosodata01 -g rg-storage --query "{public:publicNetworkAccess, default:networkRuleSet.defaultAction, sharedKey:allowSharedKeyAccess}"',
      what: 'Confirms the network default action and whether shared key is allowed.',
    },
    {
      command: 'az storage account network-rule list -n stcontosodata01 -g rg-storage',
      what: 'Lists the virtual network and IP rules.',
    },
    {
      command:
        'az storage blob list --account-name stcontosodata01 -c uploads --auth-mode login -o table',
      what: 'Proves Entra ID data access works for the signed-in identity.',
    },
  ],
  troubleshooting: [
    {
      command: 'az storage blob list --account-name stcontosodata01 -c uploads --auth-mode login',
      what: 'AuthorizationPermissionMismatch means the identity has no data role; AuthorizationFailure usually means the firewall blocked the source IP.',
    },
    {
      command: 'curl -s -o /dev/null -w "%{http_code}" "<blob-url-with-sas>"',
      what: 'A SAS returns 403: check expiry (in UTC), permissions, IP range and whether the signing key was regenerated.',
      placeholders: ['<blob-url-with-sas>'],
    },
    {
      command:
        'az network vnet subnet show -g rg-net --vnet-name vnet-app -n snet-app --query serviceEndpoints',
      what: 'A VNet rule does not work: confirm the subnet has the Microsoft.Storage service endpoint.',
    },
    {
      command:
        'az storage account show -n stcontosodata01 -g rg-storage --query azureFilesIdentityBasedAuthentication',
      what: 'SMB access with a domain identity fails: confirm the identity source is configured before checking share roles and NTFS ACLs.',
    },
  ],
  commonMistakes: [
    'Adding a private IP range to the storage firewall IP rules. IP rules accept public addresses only; use virtual network rules or private endpoints for VNet traffic.',
    'Expecting to revoke an account SAS by deleting a stored access policy. Only service SAS can reference a policy; account SAS is revoked by rotating the signing key.',
    'Regenerating the key applications use without switching them to the other key first.',
    'Granting Owner or Contributor and expecting Entra data access to blobs. Management roles do not include data actions.',
    'Assigning share-level RBAC for Azure Files and forgetting NTFS permissions, or the reverse. Both must allow the action.',
    'Setting SAS times in local time. SAS times are UTC, and clock skew means a start time slightly in the past is safer.',
  ],
  examTips: [
    'Most secure to least: Entra ID with managed identity, user delegation SAS, service SAS with stored access policy, ad-hoc service or account SAS, account key.',
    'User delegation SAS is Blob only and signed with Entra credentials. Account SAS can cover multiple services. Service SAS covers one service.',
    'Stored access policies: up to five per container, share, queue or table, used by service SAS, and the way to revoke without key rotation.',
    'Firewall: default action Deny plus VNet rules (with service endpoint) and IP rules (public only). Trusted services is a separate exception.',
    'Azure Files identity-based auth: on-premises AD DS or Microsoft Entra Kerberos for hybrid users, Entra Domain Services for cloud-managed domains. Share-level role plus NTFS ACLs.',
    'Rotating keys: switch consumers to the secondary key, regenerate the primary, repeat.',
  ],
  summary: [
    'Network rules decide whether a request reaches the account; authorization decides what it may do.',
    'Account keys are all-powerful; rotate them in turn or disable shared key access.',
    'SAS types: account, service and user delegation; stored access policies make service SAS revocable.',
    'Entra ID with data roles is the preferred authorization for blobs, queues and tables.',
    'Azure Files over SMB uses Kerberos identity sources, share-level RBAC and NTFS permissions.',
  ],
  practice: [
    {
      id: 'az1-storage-security-p1',
      level: 'intermediate',
      prompt:
        'Partners upload via service SAS tokens on the uploads container. You must be able to revoke all of them instantly without affecting other apps. What do you configure?',
      answer:
        'A stored access policy on the uploads container and issue the service SAS tokens referencing it. Deleting or changing the policy revokes them, with no key rotation.',
    },
    {
      id: 'az1-storage-security-p2',
      level: 'intermediate',
      prompt:
        'An account firewall is set to Deny with a rule for snet-app, but VMs in snet-app still get 403. What is the likely cause?',
      answer:
        'The subnet does not have the Microsoft.Storage service endpoint enabled (or the traffic uses a private endpoint path the rule does not cover). Enable the service endpoint on the subnet.',
    },
    {
      id: 'az1-storage-security-p3',
      level: 'advanced',
      prompt:
        'A web app with a managed identity must read blobs, and security wants no secrets anywhere. What do you do?',
      answer:
        'Assign the web app identity Storage Blob Data Reader on the account or container, use Entra token authentication in the SDK (DefaultAzureCredential), and set allowSharedKeyAccess to false.',
    },
    {
      id: 'az1-storage-security-p4',
      level: 'advanced',
      prompt:
        'Hybrid users signed in with their AD accounts must access an Azure file share with their existing NTFS permissions. Name the two layers of permissions you configure.',
      answer:
        'Enable AD DS (or Microsoft Entra Kerberos) authentication on the account, assign a share-level role such as Storage File Data SMB Share Contributor, and keep or set NTFS ACLs on the directories and files.',
    },
  ],
  lab: {
    title: 'Firewall, SAS and keyless access',
    scenario:
      'Restrict an account to your IP, compare SAS types, revoke them in different ways and switch to Entra-only access.',
    prerequisites: ['An Azure subscription where you are Owner', 'Cloud Shell (Bash)'],
    tasks: [
      {
        instruction:
          'Create rg-sec-lab, a GPv2 account and a container named docs with one test blob.',
      },
      {
        instruction:
          'Assign yourself Storage Blob Data Contributor on the account and list blobs with --auth-mode login.',
      },
      {
        instruction: 'Set default action Deny and add your Cloud Shell public IP as an IP rule.',
        hint: 'curl -s https://api.ipify.org returns your current public IP.',
      },
      {
        instruction:
          'Create a stored access policy on docs, generate a service SAS that uses it, download the blob, then delete the policy and retry.',
      },
      {
        instruction:
          'Generate a user delegation SAS for the blob, test it, then revoke delegation keys and retry.',
      },
      {
        instruction:
          'Disable shared key access and confirm key-based listing fails while --auth-mode login still works.',
      },
    ],
    solution: [
      {
        title: 'Lab commands',
        language: 'bash',
        code: `RG=rg-sec-lab; LOC=westeurope; SA=seclab$RANDOM
az group create -n $RG -l $LOC
az storage account create -n $SA -g $RG -l $LOC --sku Standard_LRS --allow-blob-public-access false
SAID=$(az storage account show -n $SA -g $RG --query id -o tsv)
az role assignment create --assignee $(az ad signed-in-user show --query id -o tsv) \\
  --role "Storage Blob Data Contributor" --scope $SAID
sleep 60
az storage container create --account-name $SA -n docs --auth-mode login
echo hello > hello.txt
az storage blob upload --account-name $SA -c docs -n hello.txt -f hello.txt --auth-mode login

MYIP=$(curl -s https://api.ipify.org)
az storage account update -n $SA -g $RG --default-action Deny
az storage account network-rule add -n $SA -g $RG --ip-address $MYIP

KEY=$(az storage account keys list -n $SA -g $RG --query [0].value -o tsv)
az storage container policy create --account-name $SA --account-key $KEY -c docs -n p1 \\
  --permissions r --expiry $(date -u -d '+1 day' '+%Y-%m-%dT%H:%MZ')
SAS=$(az storage blob generate-sas --account-name $SA --account-key $KEY -c docs -n hello.txt --policy-name p1 -o tsv)
curl -s "https://$SA.blob.core.windows.net/docs/hello.txt?$SAS"
az storage container policy delete --account-name $SA --account-key $KEY -c docs -n p1
curl -s -o /dev/null -w "%{http_code}\\n" "https://$SA.blob.core.windows.net/docs/hello.txt?$SAS"

UDS=$(az storage blob generate-sas --account-name $SA -c docs -n hello.txt --permissions r \\
  --expiry $(date -u -d '+1 day' '+%Y-%m-%dT%H:%MZ') --auth-mode login --as-user -o tsv)
curl -s "https://$SA.blob.core.windows.net/docs/hello.txt?$UDS"
az storage account revoke-delegation-keys -n $SA -g $RG

az storage account update -n $SA -g $RG --allow-shared-key-access false
az storage blob list --account-name $SA -c docs --account-key $KEY   # fails
az storage blob list --account-name $SA -c docs --auth-mode login -o table  # works`,
      },
    ],
    verification: [
      {
        command:
          'az storage account show -n $SA -g $RG --query "{default:networkRuleSet.defaultAction, sharedKey:allowSharedKeyAccess}"',
        what: 'Shows Deny and false.',
      },
      {
        command:
          'curl -s -o /dev/null -w "%{http_code}" "https://$SA.blob.core.windows.net/docs/hello.txt?$UDS"',
        what: 'Returns 403 after the delegation keys were revoked (allow a few minutes for revocation).',
      },
    ],
    cleanup: [
      {
        command: 'az group delete -n rg-sec-lab --yes --no-wait',
        what: 'Deletes the storage account and all lab data.',
      },
    ],
  },
  relatedTopicIds: ['az1-storage-accounts', 'az1-blob-storage', 'az1-azure-files', 'az1-rbac'],
  docs: [
    {
      title: 'Configure Azure Storage firewalls and virtual networks',
      url: 'https://learn.microsoft.com/azure/storage/common/storage-network-security',
    },
    {
      title: 'Manage storage account access keys',
      url: 'https://learn.microsoft.com/azure/storage/common/storage-account-keys-manage',
    },
    {
      title: 'Grant limited access with shared access signatures',
      url: 'https://learn.microsoft.com/azure/storage/common/storage-sas-overview',
    },
    {
      title: 'Create a stored access policy',
      url: 'https://learn.microsoft.com/rest/api/storageservices/define-stored-access-policy',
    },
    {
      title: 'Authorize access to blobs using Microsoft Entra ID',
      url: 'https://learn.microsoft.com/azure/storage/blobs/authorize-access-azure-active-directory',
    },
    {
      title: 'Azure Files identity-based authentication overview',
      url: 'https://learn.microsoft.com/azure/storage/files/storage-files-active-directory-overview',
    },
  ],
}
