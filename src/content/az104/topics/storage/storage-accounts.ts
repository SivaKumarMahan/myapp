import type { Topic } from '../../../types'

export const az1StorageAccounts: Topic = {
  id: 'az1-storage-accounts',
  title: 'Storage accounts: kinds, performance, redundancy and encryption',
  domainId: 'az1-storage',
  difficulty: 'beginner',
  estimatedMinutes: 30,
  order: 1,
  tags: [
    'storage-account',
    'redundancy',
    'lrs',
    'zrs',
    'grs',
    'gzrs',
    'failover',
    'encryption',
    'cmk',
  ],
  oneLiner:
    'Choose the right storage account kind, performance tier and redundancy, know how failover works, and control how data is encrypted at rest.',
  explanation: [
    'A **storage account** is the top-level container for Azure Storage data: blobs, file shares, queues and tables. It gives your data a globally unique namespace (`https://<account>.blob.core.windows.net`), and its settings (redundancy, network rules, encryption) apply to everything inside it.',
    'The account **kind** and **performance** decide what it can hold. **Standard general-purpose v2 (GPv2)** is the default and supports every service and every redundancy option. **Premium** accounts use SSDs for low latency and come in three kinds: **premium block blobs** (BlockBlobStorage), **premium file shares** (FileStorage) and **premium page blobs** (Premium general-purpose v2 for unmanaged disks). Legacy general-purpose v1 and BlobStorage accounts should be upgraded to GPv2.',
    '**Redundancy** decides how many copies exist and where. **LRS** keeps three copies in one datacenter; **ZRS** spreads three copies across availability zones in the region; **GRS** adds three more copies in the paired secondary region (LRS there); **GZRS** combines ZRS in the primary with LRS in the secondary. The **RA-** variants (RA-GRS, RA-GZRS) also let you read from the secondary endpoint at any time.',
    'All data is **encrypted at rest** with 256-bit AES, always, and you cannot turn it off. By default Microsoft manages the keys. You can choose **customer-managed keys (CMK)** stored in Azure Key Vault or Managed HSM, and optionally enable **infrastructure encryption** for a second layer of encryption with a different key and algorithm.',
  ],
  whyItMatters: [
    'AZ-104 asks you to create and configure storage accounts, configure redundancy and object replication, and configure encryption. Many questions give a durability or availability requirement and ask for the cheapest redundancy that meets it.',
    'Some decisions are permanent or disruptive. Account names cannot change, premium kinds cannot become standard, and infrastructure encryption must be chosen at creation. Understanding which settings are fixed prevents painful migrations.',
    'Failover is an operational decision with data-loss consequences. An administrator must know when Microsoft fails over, when you do, and what the last sync time means.',
  ],
  howItWorks: [
    'Account names are 3 to 24 characters, lowercase letters and numbers only, and globally unique because they form DNS names. Each service has its own endpoint: `blob`, `file`, `queue`, `table`, `dfs` (Data Lake Storage) and `web` (static website).',
    'LRS protects against drive and rack failure; ZRS also survives a zone outage and keeps the account writable; GRS and GZRS survive a regional outage after failover. Replication to the secondary region is **asynchronous**, so the secondary can lag behind. The **Last Sync Time** property shows the point up to which the secondary is guaranteed consistent.',
    'With GRS or GZRS the secondary is not readable until failover. With RA-GRS or RA-GZRS you can read from `<account>-secondary.blob.core.windows.net` all the time, which suits read-heavy apps that tolerate slightly stale data.',
    '**Customer-managed failover** (planned or unplanned) is started by you. Unplanned failover promotes the secondary to primary; any writes after the last sync time are lost, and the account becomes LRS in the new primary until you reconfigure geo-redundancy. **Planned failover** keeps geo-redundancy and loses no data, for disaster-recovery drills. Microsoft may also initiate failover in a severe regional disaster.',
    'You can change redundancy after creation. LRS, GRS and RA-GRS switch easily. Moving to or from zone redundancy (LRS to ZRS, GRS to GZRS) uses a **conversion** requested in the portal or CLI, or a manual migration; not every account type supports every conversion.',
    'Encryption with CMK needs a key vault with **soft delete and purge protection** enabled, and a managed identity for the storage account with permission to get, wrap and unwrap keys (for example the **Key Vault Crypto Service Encryption User** role). Key rotation can be automatic if you reference the key without a version. Revoking access to the key makes the data unreadable.',
    '**Infrastructure encryption** double-encrypts at the storage infrastructure layer and can only be enabled when the account is created. **Encryption scopes** let you use different keys for different containers or blobs in one account.',
  ],
  diagrams: [
    {
      kind: 'decision',
      title: 'Choosing storage redundancy',
      caption:
        'Pick the cheapest option that survives the failure you care about. RA- adds read access to the secondary.',
      question: 'Which failure must the data survive?',
      branches: [
        {
          condition: 'Drive or rack failure only',
          result: 'LRS',
          detail: 'Cheapest, one datacenter',
        },
        {
          condition: 'Loss of an availability zone',
          result: 'ZRS',
          detail: 'Stays writable during zone outage',
          tone: 'accent',
        },
        {
          condition: 'Loss of the whole region',
          result: 'GRS',
          detail: 'Secondary readable after failover',
        },
        { condition: 'Zone and region, maximum durability', result: 'GZRS', tone: 'success' },
        { condition: 'Region loss and read secondary anytime', result: 'RA-GRS or RA-GZRS' },
      ],
    },
    {
      kind: 'nested',
      title: 'Where the copies of GZRS data live',
      caption:
        'Primary copies span zones synchronously; the secondary receives an asynchronous copy kept as LRS.',
      root: {
        label: 'GZRS storage account',
        tone: 'accent',
        children: [
          {
            label: 'Primary region',
            detail: 'Synchronous writes',
            children: [
              { label: 'Zone 1 copy' },
              { label: 'Zone 2 copy' },
              { label: 'Zone 3 copy' },
            ],
          },
          {
            label: 'Paired secondary region',
            detail: 'Asynchronous, three LRS copies',
            tone: 'muted',
          },
        ],
      },
    },
    {
      kind: 'flow',
      title: 'Customer-managed unplanned failover',
      caption:
        'Anything written after the last sync time is lost, and the new primary starts as LRS.',
      nodes: [
        { label: 'Primary region outage', tone: 'danger' },
        { label: 'Check Last Sync Time', detail: 'Estimate the data loss window' },
        {
          label: 'Start failover',
          detail: 'az storage account failover',
          arrowLabel: 'you decide',
        },
        { label: 'DNS points to secondary', detail: 'Secondary becomes primary' },
        {
          label: 'Re-enable geo-redundancy',
          detail: 'Account is LRS until you do',
          tone: 'warning',
        },
      ],
    },
  ],
  keyObjects: [
    {
      kind: 'Storage account (Microsoft.Storage/storageAccounts)',
      apiVersion: '2023-05-01',
      purpose: 'The namespace and configuration boundary for blobs, files, queues and tables.',
      fields: [
        {
          path: 'kind',
          meaning: 'StorageV2, BlockBlobStorage, FileStorage (and legacy Storage, BlobStorage).',
          required: true,
        },
        {
          path: 'sku.name',
          meaning:
            'Performance plus redundancy, for example Standard_LRS, Standard_RAGZRS, Premium_ZRS.',
          required: true,
        },
        {
          path: 'properties.accessTier',
          meaning: 'Default blob tier for the account: Hot, Cool or Cold.',
        },
        { path: 'properties.minimumTlsVersion', meaning: 'Set TLS1_2 to reject older clients.' },
        {
          path: 'properties.allowBlobPublicAccess',
          meaning: 'false prevents any container from allowing anonymous access.',
        },
        {
          path: 'properties.encryption.keySource',
          meaning:
            'Microsoft.Storage (Microsoft-managed) or Microsoft.Keyvault (customer-managed).',
        },
        {
          path: 'properties.encryption.requireInfrastructureEncryption',
          meaning: 'Double encryption; only settable at creation.',
        },
      ],
    },
    {
      kind: 'Geo-replication status',
      purpose: 'Read-only information about the secondary region used to judge failover risk.',
      fields: [
        {
          path: 'geoReplicationStats.lastSyncTime',
          meaning: 'Writes before this time are guaranteed on the secondary.',
        },
        { path: 'geoReplicationStats.status', meaning: 'Live, Bootstrap or Unavailable.' },
        {
          path: 'geoReplicationStats.canFailover',
          meaning: 'Whether a customer-managed failover is currently possible.',
        },
      ],
    },
    {
      kind: 'Encryption scope (Microsoft.Storage/storageAccounts/encryptionScopes)',
      apiVersion: '2023-05-01',
      purpose: 'A named key choice used for a container or individual blobs inside one account.',
      fields: [
        { path: 'properties.source', meaning: 'Microsoft.Storage or Microsoft.KeyVault.' },
        {
          path: 'properties.keyVaultProperties.keyUri',
          meaning: 'Key used when the source is Key Vault.',
        },
        {
          path: 'properties.requireInfrastructureEncryption',
          meaning: 'Double encryption for this scope.',
        },
      ],
    },
  ],
  realWorldExample: {
    title: 'The failover that lost twelve minutes of orders',
    story: [
      'An online shop stored order receipts in a GRS account. During a regional outage the team failed over within an hour, and the application recovered. Two days later finance found a gap of about twelve minutes of receipts.',
      'The Last Sync Time at the moment of failover was twelve minutes behind: asynchronous replication had not yet copied the latest writes. After failover the account was LRS in the new region, so a second incident would have been worse.',
      'They moved to GZRS so a zone outage never needs failover at all, added an alert on geo-replication lag, re-enabled geo-redundancy in the runbook straight after any failover, and made the application write receipts idempotently so replays could fill any gap.',
    ],
  },
  yamlExamples: [
    {
      title: 'Create a hardened GPv2 account with Azure CLI',
      language: 'bash',
      code: `az storage account create \\
  --name stcontosodata01 \\
  --resource-group rg-storage \\
  --location westeurope \\
  --kind StorageV2 \\
  --sku Standard_GZRS \\
  --access-tier Hot \\
  --min-tls-version TLS1_2 \\
  --allow-blob-public-access false \\
  --https-only true \\
  --require-infrastructure-encryption true`,
    },
    {
      title: 'Switch to customer-managed keys with Azure PowerShell',
      language: 'powershell',
      explanation:
        'The storage account system-assigned identity needs Key Vault Crypto Service Encryption User on the vault or key. Omitting the key version enables automatic rotation.',
      placeholders: ['<vault-name>'],
      code: `$sa = Set-AzStorageAccount -ResourceGroupName 'rg-storage' -Name 'stcontosodata01' -AssignIdentity
$kv = Get-AzKeyVault -VaultName '<vault-name>'
$key = Add-AzKeyVaultKey -VaultName $kv.VaultName -Name 'storage-cmk' -Destination Software

New-AzRoleAssignment -ObjectId $sa.Identity.PrincipalId \`
  -RoleDefinitionName 'Key Vault Crypto Service Encryption User' -Scope $kv.ResourceId

Set-AzStorageAccount -ResourceGroupName 'rg-storage' -Name 'stcontosodata01' \`
  -KeyvaultEncryption -KeyName $key.Name -KeyVaultUri $kv.VaultUri`,
    },
  ],
  imperative: [
    {
      command: 'az storage account check-name --name stcontosodata01',
      what: 'Checks the name is valid and globally available before you try to create it.',
      expected: '"nameAvailable": true',
    },
    {
      command:
        'az storage account create -n stcontosodata01 -g rg-storage -l westeurope --kind StorageV2 --sku Standard_ZRS',
      what: 'Creates a standard GPv2 account with zone-redundant storage.',
    },
    {
      command: 'az storage account update -n stcontosodata01 -g rg-storage --sku Standard_RAGRS',
      what: 'Changes redundancy between LRS, GRS and RA-GRS in place.',
    },
    {
      command:
        'az storage account show -n stcontosodata01 -g rg-storage --expand geoReplicationStats --query geoReplicationStats',
      what: 'Shows the last sync time and whether failover is possible.',
      expected: 'lastSyncTime, status Live, canFailover true.',
    },
    {
      command: 'az storage account failover -n stcontosodata01 -g rg-storage --yes',
      what: 'Starts a customer-managed unplanned failover to the secondary region. Add --failover-type Planned for a planned failover where supported.',
    },
    {
      command:
        'az storage account update -n stcontosodata01 -g rg-storage --encryption-key-source Microsoft.Keyvault --encryption-key-vault https://<vault-name>.vault.azure.net --encryption-key-name storage-cmk --identity-type SystemAssigned',
      what: 'Switches encryption to a customer-managed key in Key Vault.',
      placeholders: ['<vault-name>'],
    },
  ],
  declarative: {
    steps: [
      'Declare the account with its kind, SKU and security properties; these are the settings reviewers care about.',
      'Set `requireInfrastructureEncryption` at creation if you need it, because it cannot be added later.',
      'Keep redundancy as a parameter so dev can use LRS and production GZRS from the same template.',
      'Deploy with `az deployment group create` and use `what-if` first to see any change to an existing account.',
    ],
    code: [
      {
        title: 'Storage account in Bicep with environment-driven redundancy',
        language: 'bicep',
        code: `param location string = resourceGroup().location
@minLength(3)
@maxLength(24)
param accountName string
@allowed(['Standard_LRS', 'Standard_ZRS', 'Standard_GZRS', 'Standard_RAGZRS'])
param skuName string = 'Standard_ZRS'

resource sa 'Microsoft.Storage/storageAccounts@2023-05-01' = {
  name: accountName
  location: location
  kind: 'StorageV2'
  sku: {
    name: skuName
  }
  properties: {
    accessTier: 'Hot'
    minimumTlsVersion: 'TLS1_2'
    supportsHttpsTrafficOnly: true
    allowBlobPublicAccess: false
    encryption: {
      keySource: 'Microsoft.Storage'
      requireInfrastructureEncryption: true
      services: {
        blob: { enabled: true, keyType: 'Account' }
        file: { enabled: true, keyType: 'Account' }
      }
    }
  }
}

output blobEndpoint string = sa.properties.primaryEndpoints.blob`,
      },
    ],
  },
  verification: [
    {
      command:
        'az storage account show -n stcontosodata01 -g rg-storage --query "{kind:kind, sku:sku.name, tls:minimumTlsVersion, keySource:encryption.keySource}"',
      what: 'Confirms kind, redundancy, TLS minimum and key source.',
    },
    {
      command:
        'az storage account show -n stcontosodata01 -g rg-storage --query "{primary:primaryLocation, secondary:secondaryLocation, secondaryBlob:secondaryEndpoints.blob}"',
      what: 'Shows the paired region and, for RA- SKUs, the secondary read endpoint.',
    },
    {
      command:
        'Get-AzStorageAccount -ResourceGroupName rg-storage -Name stcontosodata01 | Select-Object -ExpandProperty Encryption',
      what: 'Shows encryption services, key source and infrastructure encryption flag.',
    },
  ],
  troubleshooting: [
    {
      command: 'az storage account check-name --name <name>',
      what: 'Creation fails with AccountNameInvalid or StorageAccountAlreadyTaken: check naming rules and global uniqueness.',
      placeholders: ['<name>'],
    },
    {
      command:
        'az keyvault show -n <vault-name> --query "{softDelete:properties.enableSoftDelete, purge:properties.enablePurgeProtection}"',
      what: 'CMK configuration fails: the vault must have soft delete and purge protection enabled.',
      placeholders: ['<vault-name>'],
    },
    {
      command:
        'az storage account show -n stcontosodata01 -g rg-storage --expand geoReplicationStats --query geoReplicationStats.canFailover',
      what: 'Failover is refused: canFailover is false while replication is bootstrapping or for unsupported configurations.',
    },
  ],
  commonMistakes: [
    'Choosing GRS when the requirement is to survive a zone outage without any failover. ZRS or GZRS keeps writing during a zone loss; GRS needs a regional failover.',
    'Assuming the secondary of GRS can be read. Only RA-GRS and RA-GZRS expose a readable secondary endpoint before failover.',
    'Forgetting that after an unplanned failover the account becomes LRS and must be reconfigured for geo-redundancy.',
    'Trying to enable infrastructure encryption on an existing account. It must be set at creation.',
    'Configuring CMK against a vault without purge protection, or deleting the key and making all data unreadable.',
    'Creating a premium block blob account and expecting file shares or queues in it. Premium kinds support one service each.',
  ],
  examTips: [
    'Know the copy counts: LRS 3, ZRS 3 across zones, GRS and GZRS 6 in total across two regions.',
    'Read access to secondary data is the tell for RA-GRS or RA-GZRS. Surviving a zone outage without failover is the tell for ZRS or GZRS.',
    'Premium file shares need the FileStorage kind; premium blobs need BlockBlobStorage. Premium accounts support only LRS and ZRS.',
    'Encryption at rest cannot be disabled. The choices are who manages the key (Microsoft or you) and whether to add infrastructure encryption.',
    'CMK needs Key Vault or Managed HSM with soft delete and purge protection, plus a managed identity with key access.',
    'Archive tier is not supported for ZRS, GZRS or RA-GZRS accounts; if a question combines them, it is a trap.',
  ],
  summary: [
    'GPv2 is the default kind; premium kinds are single-service and SSD-backed.',
    'LRS, ZRS, GRS, GZRS and RA- variants trade cost for durability and availability.',
    'Geo-replication is asynchronous; Last Sync Time bounds data loss on failover.',
    'After unplanned failover the account is LRS until you reconfigure it.',
    'Encryption is always on; choose Microsoft-managed or customer-managed keys, plus optional infrastructure encryption at creation.',
  ],
  practice: [
    {
      id: 'az1-storage-accounts-p1',
      level: 'beginner',
      prompt:
        'An app must keep writing to storage if one availability zone fails, at the lowest cost, with no need for regional DR. Which redundancy?',
      answer:
        'ZRS. It keeps three synchronous copies across zones and remains writable during a zone outage; geo options cost more and are not needed.',
    },
    {
      id: 'az1-storage-accounts-p2',
      level: 'intermediate',
      prompt:
        'A reporting tool must read data from the secondary region at all times, and the primary must survive a zone outage. Which SKU?',
      answer:
        'Standard_RAGZRS (RA-GZRS): zone-redundant in the primary and a readable secondary endpoint.',
    },
    {
      id: 'az1-storage-accounts-p3',
      level: 'intermediate',
      prompt:
        'After an unplanned failover of a GRS account, what is the redundancy of the account and what should you do?',
      answer:
        'It is LRS in the new primary region. Reconfigure it back to GRS or GZRS so it is geo-redundant again.',
    },
    {
      id: 'az1-storage-accounts-p4',
      level: 'advanced',
      prompt:
        'Compliance requires double encryption at rest and keys your team controls. What do you configure, and what must be decided at creation?',
      answer:
        'Customer-managed keys in Key Vault (with soft delete and purge protection and a managed identity granted key access) plus infrastructure encryption. Infrastructure encryption must be enabled when the account is created.',
    },
  ],
  lab: {
    title: 'Create, inspect and change a storage account',
    scenario:
      'Create an account, inspect its geo-replication, change redundancy and move it to customer-managed keys.',
    prerequisites: [
      'An Azure subscription',
      'Cloud Shell (Bash)',
      'Permission to create a key vault',
    ],
    tasks: [
      {
        instruction:
          'Create resource group rg-sa-lab and a GPv2 account with Standard_LRS and TLS 1.2 minimum.',
      },
      { instruction: 'Change the account to Standard_RAGRS and show its secondary endpoints.' },
      {
        instruction: 'Show geoReplicationStats and note the last sync time.',
        hint: 'It can take a while to show Live after switching to geo-redundancy.',
      },
      { instruction: 'Create a key vault with purge protection and an RSA key.' },
      {
        instruction:
          'Enable a system-assigned identity on the account, grant it Key Vault Crypto Service Encryption User and switch to the customer-managed key.',
      },
      { instruction: 'Confirm encryption.keySource is Microsoft.Keyvault.' },
    ],
    solution: [
      {
        title: 'Lab commands',
        language: 'bash',
        code: `RG=rg-sa-lab; LOC=westeurope; SA=salab$RANDOM; KV=kvsalab$RANDOM
az group create -n $RG -l $LOC
az storage account create -n $SA -g $RG -l $LOC --kind StorageV2 --sku Standard_LRS --min-tls-version TLS1_2

az storage account update -n $SA -g $RG --sku Standard_RAGRS
az storage account show -n $SA -g $RG --query secondaryEndpoints
az storage account show -n $SA -g $RG --expand geoReplicationStats --query geoReplicationStats

az keyvault create -n $KV -g $RG -l $LOC --enable-purge-protection true --enable-rbac-authorization true
ME=$(az ad signed-in-user show --query id -o tsv)
KVID=$(az keyvault show -n $KV --query id -o tsv)
az role assignment create --assignee $ME --role "Key Vault Crypto Officer" --scope $KVID
az keyvault key create --vault-name $KV -n storage-cmk --kty RSA --size 2048

PID=$(az storage account update -n $SA -g $RG --assign-identity --query identity.principalId -o tsv)
az role assignment create --assignee-object-id $PID --assignee-principal-type ServicePrincipal \\
  --role "Key Vault Crypto Service Encryption User" --scope $KVID

az storage account update -n $SA -g $RG \\
  --encryption-key-source Microsoft.Keyvault \\
  --encryption-key-vault https://$KV.vault.azure.net \\
  --encryption-key-name storage-cmk`,
      },
    ],
    verification: [
      {
        command:
          'az storage account show -n $SA -g $RG --query "{sku:sku.name, key:encryption.keySource, keyName:encryption.keyVaultProperties.keyName}"',
        what: 'Shows Standard_RAGRS, Microsoft.Keyvault and storage-cmk.',
      },
      {
        command: 'az storage account show -n $SA -g $RG --query secondaryEndpoints.blob -o tsv',
        what: 'Shows the -secondary blob endpoint available with RA-GRS.',
      },
    ],
    cleanup: [
      {
        command: 'az group delete -n rg-sa-lab --yes --no-wait',
        what: 'Deletes the account and vault. The purge-protected vault stays soft-deleted for its retention period and cannot be purged early.',
      },
    ],
  },
  relatedTopicIds: ['az1-storage-security', 'az1-blob-storage', 'az1-azure-files'],
  docs: [
    {
      title: 'Storage account overview',
      url: 'https://learn.microsoft.com/azure/storage/common/storage-account-overview',
    },
    {
      title: 'Azure Storage redundancy',
      url: 'https://learn.microsoft.com/azure/storage/common/storage-redundancy',
    },
    {
      title: 'Disaster recovery and storage account failover',
      url: 'https://learn.microsoft.com/azure/storage/common/storage-disaster-recovery-guidance',
    },
    {
      title: 'Customer-managed keys for Azure Storage encryption',
      url: 'https://learn.microsoft.com/azure/storage/common/customer-managed-keys-overview',
    },
    {
      title: 'Enable infrastructure encryption',
      url: 'https://learn.microsoft.com/azure/storage/common/infrastructure-encryption-enable',
    },
  ],
}
