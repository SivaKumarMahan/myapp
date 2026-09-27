import type { Topic } from '../../../types'

export const az1BlobStorage: Topic = {
  id: 'az1-blob-storage',
  title: 'Blob storage: tiers, lifecycle, data protection and replication',
  domainId: 'az1-storage',
  difficulty: 'intermediate',
  estimatedMinutes: 40,
  order: 3,
  tags: [
    'blob',
    'containers',
    'access-tiers',
    'archive',
    'rehydration',
    'lifecycle',
    'versioning',
    'soft-delete',
    'object-replication',
    'azcopy',
  ],
  oneLiner:
    'Store objects cost-effectively with the right access tier, automate tiering and deletion with lifecycle rules, protect data with versioning and soft delete, and move it with AzCopy.',
  explanation: [
    '**Blob storage** holds unstructured data such as documents, images, backups and logs. Blobs live in **containers**, which live in a storage account. There are three blob types: **block blobs** for ordinary files (the vast majority), **append blobs** for logs that only grow, and **page blobs** for random-access data such as unmanaged VM disks.',
    'Each block blob has an **access tier** that trades storage cost against access cost. **Hot** is for frequently used data. **Cool** is cheaper to store but costs more to read, with a 30-day minimum. **Cold** is cheaper still with a 90-day minimum. **Archive** is the cheapest and offline: data must be **rehydrated** to an online tier before it can be read, which takes hours, and it has a 180-day minimum.',
    '**Lifecycle management** policies move blobs between tiers or delete them based on age, last access time, prefix or blob index tags, so you do not pay hot prices for data nobody reads.',
    'Several features protect against accidental change or deletion. **Blob soft delete** keeps deleted blobs for a retention period; **container soft delete** does the same for whole containers; **versioning** automatically keeps previous versions whenever a blob is overwritten; **snapshots** are manual read-only copies at a point in time. **Object replication** asynchronously copies block blobs from a container in one account to a container in another, often in a different region.',
  ],
  whyItMatters: [
    'AZ-104 covers creating containers, configuring storage tiers, configuring soft delete, snapshots and versioning, configuring lifecycle management and object replication, and using AzCopy and Storage Explorer. Tier minimums and rehydration are frequent question material.',
    'Storage cost at scale is mostly tiering. A single lifecycle rule that moves logs to cool after 30 days and deletes them after a year can cut a bill dramatically.',
    'Ransomware and fat-finger deletes are real. Knowing which feature recovers which mistake (soft delete for deletes, versioning for overwrites, container soft delete for container deletes) is essential when something goes wrong.',
  ],
  howItWorks: [
    'The account has a default tier (Hot, Cool or Cold) inherited by blobs that have no explicit tier. You can set a tier per blob with `az storage blob set-tier`. Moving a blob out of cool, cold or archive before its minimum period incurs an **early deletion** charge for the remaining days.',
    'Archive blobs cannot be read or modified. **Rehydration** either changes the tier of the blob (Set Blob Tier) or copies it to a new blob in an online tier (Copy Blob). **Standard priority** can take up to 15 hours; **high priority** is faster (often under an hour for small objects) and costs more. Copying to a new blob avoids early-deletion charges on the archived original.',
    'A lifecycle policy is JSON with **rules**. Each rule has **filters** (`blobTypes`, `prefixMatch`, `blobIndexMatch`) and **actions** on `baseBlob`, `snapshot` or `version`, such as `tierToCool`, `tierToCold`, `tierToArchive` and `delete`, triggered by `daysAfterModificationGreaterThan`, `daysAfterCreationGreaterThan` or `daysAfterLastAccessTimeGreaterThan` (which needs **last access time tracking** enabled). Policies run once a day, and new rules can take up to 24 hours to take effect.',
    '**Blob soft delete** retention is 1 to 365 days; a soft-deleted blob can be undeleted with `az storage blob undelete`. With **versioning** enabled, an overwrite or delete makes the current version a previous version, which you can promote back. Microsoft recommends enabling both, plus container soft delete, and considering **point-in-time restore** for block blobs, which needs versioning, change feed and soft delete.',
    '**Snapshots** are created on demand and are billed only for data that differs from the base blob. A blob with snapshots cannot be deleted unless you delete the snapshots too (`--delete-snapshots include`).',
    '**Object replication** requires versioning on both source and destination accounts and **change feed** on the source. You define a policy with rules mapping source containers to destination containers, optionally with a prefix filter and a minimum creation time. Replication is asynchronous, and the destination container becomes read-only for replicated blobs.',
    '**AzCopy** is a command-line tool for high-throughput copy and sync between local disk, Blob, Files and other clouds. It authenticates with Entra ID (`azcopy login`) or a SAS. `azcopy copy` copies; `azcopy sync` makes the destination match the source (optionally deleting extras). Server-side copy between accounts does not route data through your machine. **Azure Storage Explorer** is the graphical equivalent for browsing, uploading, managing SAS and soft-deleted data.',
    'Containers have a **public access level**: Private (default), Blob (anonymous read of blobs) or Container (anonymous read and list). Anonymous access only works if the account allows it (`allowBlobPublicAccess`). **Immutable storage** (time-based retention or legal hold) makes blobs write-once, read-many for compliance.',
  ],
  diagrams: [
    {
      kind: 'flow',
      title: 'A typical lifecycle for log data',
      caption:
        'Each tier is cheaper to store and dearer to read. Archive is offline until rehydrated.',
      nodes: [
        { label: 'Hot', detail: 'Written and read daily', tone: 'accent' },
        { label: 'Cool', detail: '30-day minimum', arrowLabel: 'after 30 days' },
        { label: 'Cold', detail: '90-day minimum', arrowLabel: 'after 90 days' },
        {
          label: 'Archive',
          detail: 'Offline, 180-day minimum',
          arrowLabel: 'after 180 days',
          tone: 'muted',
          branch: {
            label: 'Needs rehydration to read',
            detail: 'Hours, standard or high priority',
            tone: 'warning',
          },
        },
        { label: 'Deleted', detail: 'After 7 years', arrowLabel: 'retention ends' },
      ],
    },
    {
      kind: 'decision',
      title: 'Which protection feature recovers this mistake?',
      caption: 'Turn all of these on for important data; each recovers a different accident.',
      question: 'What went wrong?',
      branches: [
        { condition: 'A blob was deleted', result: 'Blob soft delete or versioning' },
        { condition: 'A blob was overwritten', result: 'Versioning', tone: 'accent' },
        { condition: 'A whole container was deleted', result: 'Container soft delete' },
        {
          condition: 'Many blobs corrupted at once',
          result: 'Point-in-time restore',
          tone: 'success',
        },
        {
          condition: 'Storage account deleted',
          result: 'Recover account within 14 days if name is free',
          tone: 'warning',
        },
      ],
    },
  ],
  keyObjects: [
    {
      kind: 'Blob service properties (Microsoft.Storage/storageAccounts/blobServices)',
      apiVersion: '2023-05-01',
      purpose: 'Account-wide blob settings for data protection and tracking.',
      fields: [
        {
          path: 'properties.deleteRetentionPolicy',
          meaning: 'Blob soft delete: enabled and days (1 to 365).',
        },
        {
          path: 'properties.containerDeleteRetentionPolicy',
          meaning: 'Container soft delete settings.',
        },
        {
          path: 'properties.isVersioningEnabled',
          meaning: 'Keep previous versions on overwrite and delete.',
        },
        {
          path: 'properties.changeFeed.enabled',
          meaning: 'Log of blob changes; needed for object replication and point-in-time restore.',
        },
        {
          path: 'properties.lastAccessTimeTrackingPolicy',
          meaning: 'Enable to use daysAfterLastAccessTimeGreaterThan in lifecycle rules.',
        },
        {
          path: 'properties.restorePolicy',
          meaning: 'Point-in-time restore window for block blobs.',
        },
      ],
    },
    {
      kind: 'Lifecycle policy (Microsoft.Storage/storageAccounts/managementPolicies)',
      apiVersion: '2023-05-01',
      purpose: 'Rules that tier or delete blobs, versions and snapshots automatically.',
      fields: [
        {
          path: 'properties.policy.rules[].definition.filters.prefixMatch',
          meaning: 'Container name plus optional prefix, for example logs/app1.',
        },
        {
          path: 'properties.policy.rules[].definition.filters.blobTypes',
          meaning: 'blockBlob, appendBlob (append blobs support delete only).',
        },
        {
          path: 'properties.policy.rules[].definition.actions.baseBlob',
          meaning: 'tierToCool, tierToCold, tierToArchive, delete.',
        },
        {
          path: 'properties.policy.rules[].definition.actions.version',
          meaning: 'Actions on previous versions, by daysAfterCreationGreaterThan.',
        },
      ],
    },
    {
      kind: 'Object replication policy (Microsoft.Storage/storageAccounts/objectReplicationPolicies)',
      apiVersion: '2023-05-01',
      purpose: 'Asynchronously copies block blobs between containers in two accounts.',
      fields: [
        { path: 'properties.sourceAccount', meaning: 'Source account resource ID or name.' },
        { path: 'properties.destinationAccount', meaning: 'Destination account.' },
        {
          path: 'properties.rules[].sourceContainer / destinationContainer',
          meaning: 'Container mapping.',
        },
        {
          path: 'properties.rules[].filters.prefixMatch',
          meaning: 'Only replicate blobs with these prefixes.',
        },
      ],
    },
  ],
  realWorldExample: {
    title: 'Paying hot prices for seven years of logs',
    story: [
      'A logistics company exported application logs to blob storage for compliance: seven years of retention, rarely read. Everything sat in the Hot tier and the storage bill had quietly become larger than the compute bill.',
      'The administrator added one lifecycle rule for the logs container: move to Cool after 30 days, Cold after 90, Archive after 180, and delete after 2555 days. A second rule deleted previous versions older than 90 days, because versioning had been turned on for the whole account.',
      'The first time auditors asked for a two-year-old log, the team learned about rehydration: they used a high-priority copy of the few blobs needed into a separate Hot container, which avoided an early-deletion charge on the archived originals and had the data back the same morning.',
    ],
  },
  yamlExamples: [
    {
      title: 'Lifecycle management policy',
      language: 'json',
      code: `{
  "rules": [
    {
      "enabled": true,
      "name": "logs-tiering",
      "type": "Lifecycle",
      "definition": {
        "filters": { "blobTypes": ["blockBlob"], "prefixMatch": ["logs/"] },
        "actions": {
          "baseBlob": {
            "tierToCool": { "daysAfterModificationGreaterThan": 30 },
            "tierToCold": { "daysAfterModificationGreaterThan": 90 },
            "tierToArchive": { "daysAfterModificationGreaterThan": 180 },
            "delete": { "daysAfterModificationGreaterThan": 2555 }
          },
          "version": {
            "delete": { "daysAfterCreationGreaterThan": 90 }
          }
        }
      }
    }
  ]
}`,
    },
    {
      title: 'Copy and sync with AzCopy',
      language: 'bash',
      code: `azcopy login --tenant-id <tenant-id>

# Upload a folder
azcopy copy './site' 'https://stcontosodata01.blob.core.windows.net/web' --recursive

# Make the container match the folder, deleting blobs not present locally
azcopy sync './site' 'https://stcontosodata01.blob.core.windows.net/web' --delete-destination=true

# Server-side copy between accounts, uploaded straight into Cool
azcopy copy 'https://src01.blob.core.windows.net/data' 'https://dst01.blob.core.windows.net/data' \\
  --recursive --block-blob-tier=Cool`,
      placeholders: ['<tenant-id>'],
    },
    {
      title: 'Rehydrate and restore with Azure PowerShell',
      language: 'powershell',
      code: `$ctx = New-AzStorageContext -StorageAccountName 'stcontosodata01' -UseConnectedAccount

# Rehydrate by copying an archived blob to a new hot blob
Start-AzStorageBlobCopy -SrcContainer 'logs' -SrcBlob '2024/app.log' \`
  -DestContainer 'restored' -DestBlob '2024/app.log' \`
  -StandardBlobTier Hot -RehydratePriority High -Context $ctx

# List soft-deleted blobs and restore one
Get-AzStorageBlob -Container 'docs' -IncludeDeleted -Context $ctx |
  Where-Object IsDeleted | Select-Object Name, DeletedOn
$blob = Get-AzStorageBlob -Container 'docs' -Blob 'contract.pdf' -IncludeDeleted -Context $ctx
$blob.BlobBaseClient.Undelete()`,
    },
  ],
  imperative: [
    {
      command:
        'az storage container create --account-name stcontosodata01 -n logs --auth-mode login',
      what: 'Creates a private container.',
    },
    {
      command:
        'az storage blob set-tier --account-name stcontosodata01 -c logs -n 2024/app.log --tier Archive --auth-mode login',
      what: 'Moves one blob to the Archive tier.',
    },
    {
      command:
        'az storage blob set-tier --account-name stcontosodata01 -c logs -n 2024/app.log --tier Hot --rehydrate-priority High --auth-mode login',
      what: 'Rehydrates an archived blob in place. Its archiveStatus shows rehydrate-pending-to-hot until it completes.',
    },
    {
      command:
        'az storage account blob-service-properties update -n stcontosodata01 -g rg-storage --enable-delete-retention true --delete-retention-days 14 --enable-container-delete-retention true --container-delete-retention-days 14 --enable-versioning true --enable-change-feed true',
      what: 'Turns on blob and container soft delete, versioning and change feed in one command.',
    },
    {
      command:
        'az storage account management-policy create --account-name stcontosodata01 -g rg-storage --policy @policy.json',
      what: 'Applies a lifecycle management policy from a JSON file.',
    },
    {
      command:
        'az storage blob snapshot --account-name stcontosodata01 -c docs -n contract.pdf --auth-mode login',
      what: 'Creates a read-only snapshot and returns its snapshot timestamp.',
    },
  ],
  declarative: {
    steps: [
      'Declare the blob service with data protection settings on the account.',
      'Declare containers with the public access level set to None.',
      'Declare the lifecycle policy as a child resource named `default`; an account has one policy containing many rules.',
      'Deploy and check with `az storage account management-policy show`.',
    ],
    code: [
      {
        title: 'Blob service protection, a container and a lifecycle policy',
        language: 'bicep',
        code: `param accountName string

resource sa 'Microsoft.Storage/storageAccounts@2023-05-01' existing = {
  name: accountName
}

resource blobSvc 'Microsoft.Storage/storageAccounts/blobServices@2023-05-01' = {
  parent: sa
  name: 'default'
  properties: {
    isVersioningEnabled: true
    changeFeed: { enabled: true }
    deleteRetentionPolicy: { enabled: true, days: 14 }
    containerDeleteRetentionPolicy: { enabled: true, days: 14 }
    lastAccessTimeTrackingPolicy: { enable: true, name: 'AccessTimeTracking', trackingGranularityInDays: 1 }
  }
}

resource logs 'Microsoft.Storage/storageAccounts/blobServices/containers@2023-05-01' = {
  parent: blobSvc
  name: 'logs'
  properties: { publicAccess: 'None' }
}

resource lifecycle 'Microsoft.Storage/storageAccounts/managementPolicies@2023-05-01' = {
  parent: sa
  name: 'default'
  properties: {
    policy: {
      rules: [
        {
          name: 'logs-tiering'
          enabled: true
          type: 'Lifecycle'
          definition: {
            filters: { blobTypes: ['blockBlob'], prefixMatch: ['logs/'] }
            actions: {
              baseBlob: {
                tierToCool: { daysAfterLastAccessTimeGreaterThan: 30 }
                tierToArchive: { daysAfterModificationGreaterThan: 180 }
                delete: { daysAfterModificationGreaterThan: 2555 }
              }
            }
          }
        }
      ]
    }
  }
}`,
      },
    ],
  },
  verification: [
    {
      command:
        'az storage account blob-service-properties show -n stcontosodata01 -g rg-storage --query "{softDelete:deleteRetentionPolicy, versioning:isVersioningEnabled, changeFeed:changeFeed.enabled}"',
      what: 'Confirms the data protection settings.',
    },
    {
      command:
        'az storage blob show --account-name stcontosodata01 -c logs -n 2024/app.log --auth-mode login --query "properties.{tier:blobTier, archive:archiveStatus, rehydrate:rehydratePriority}"',
      what: 'Shows a blob tier and whether a rehydration is pending.',
    },
    {
      command:
        'az storage blob list --account-name stcontosodata01 -c docs --include dv --auth-mode login -o table',
      what: 'Lists deleted blobs (d) and versions (v) alongside current ones.',
    },
  ],
  troubleshooting: [
    {
      command:
        'az storage blob download --account-name stcontosodata01 -c logs -n 2024/app.log -f app.log --auth-mode login',
      what: 'Fails with BlobArchived (409): the blob is in Archive and must be rehydrated first.',
    },
    {
      command:
        'az storage account management-policy show --account-name stcontosodata01 -g rg-storage',
      what: 'A rule does not seem to run: check filters and prefixes, and remember policies run daily and new rules can take 24 hours.',
    },
    {
      command: 'az storage account or-policy list --account-name dst01 -g rg-storage',
      what: 'Object replication is not copying: confirm the policy exists on both accounts and that versioning and change feed are enabled.',
    },
    {
      command:
        'az storage blob delete --account-name stcontosodata01 -c docs -n contract.pdf --delete-snapshots include --auth-mode login',
      what: 'Delete fails with SnapshotsPresent: include snapshots in the delete.',
    },
  ],
  commonMistakes: [
    'Expecting to read an archived blob directly. It must be rehydrated first, which takes hours at standard priority.',
    'Forgetting early deletion charges: moving a blob out of Cool within 30 days, Cold within 90 or Archive within 180 days is billed for the remainder.',
    'Relying on soft delete alone to recover overwrites. Versioning (or a manual snapshot taken beforehand) is the feature designed to bring back overwritten content.',
    'Configuring object replication without versioning on both accounts and change feed on the source.',
    'Using daysAfterLastAccessTimeGreaterThan without enabling last access time tracking.',
    'Assuming container soft delete also restores blobs deleted individually. It only restores deleted containers.',
  ],
  examTips: [
    'Tier minimums: Cool 30 days, Cold 90 days, Archive 180 days. Hot has none.',
    'Archive rehydration: standard priority up to 15 hours, high priority faster. Rehydrate by changing tier or by copying to a new blob.',
    'Object replication prerequisites: versioning on source and destination, change feed on source, block blobs only.',
    'Lifecycle rules can act on base blobs, snapshots and versions, and filter by prefix and blob index tags.',
    'AzCopy sync with --delete-destination removes blobs that are not in the source; copy never deletes.',
    'Archive tier needs LRS, GRS or RA-GRS; it is not available with ZRS, GZRS or RA-GZRS.',
  ],
  summary: [
    'Blobs live in containers; block blobs are the common type.',
    'Hot, Cool, Cold and Archive trade storage cost against access cost and minimum retention.',
    'Lifecycle policies tier and delete automatically, running once a day.',
    'Soft delete, container soft delete, versioning, snapshots and point-in-time restore each recover a different mistake.',
    'Object replication copies block blobs asynchronously between accounts; AzCopy and Storage Explorer move data.',
  ],
  practice: [
    {
      id: 'az1-blob-storage-p1',
      level: 'beginner',
      prompt:
        'Which tier gives the lowest storage price for data kept for years and read perhaps once, where a delay of several hours is acceptable?',
      answer:
        'Archive. It is offline and must be rehydrated before reading, which fits rare access with a tolerated delay.',
    },
    {
      id: 'az1-blob-storage-p2',
      level: 'intermediate',
      prompt:
        'Users sometimes overwrite files in a container by mistake. Which feature lets you restore the previous content?',
      answer:
        'Blob versioning. Each overwrite creates a previous version that you can promote back to current.',
    },
    {
      id: 'az1-blob-storage-p3',
      level: 'intermediate',
      prompt:
        'You configure object replication and get an error that the source account is not ready. Name the prerequisites.',
      answer:
        'Blob versioning on both accounts and change feed on the source account. Only block blobs are replicated.',
    },
    {
      id: 'az1-blob-storage-p4',
      level: 'advanced',
      prompt:
        'You need to read an archived 2 GB blob urgently without incurring early deletion on the archived copy. What do you do?',
      answer:
        'Copy the archived blob to a new blob in the Hot tier with high rehydrate priority. The original stays archived, and the copy becomes readable when rehydration completes.',
    },
  ],
  lab: {
    title: 'Protect, tier and restore blobs',
    scenario:
      'Enable data protection, prove soft delete and versioning work, archive and rehydrate a blob and add a lifecycle rule.',
    prerequisites: [
      'An Azure subscription',
      'Cloud Shell (Bash); AzCopy is preinstalled in Cloud Shell',
    ],
    tasks: [
      {
        instruction:
          'Create rg-blob-lab and a Standard_LRS GPv2 account; grant yourself Storage Blob Data Contributor.',
      },
      {
        instruction:
          'Enable blob soft delete (7 days), container soft delete (7 days) and versioning.',
      },
      { instruction: 'Upload notes.txt, overwrite it with new content, then list versions.' },
      {
        instruction: 'Delete notes.txt, list deleted blobs and undelete it.',
        hint: 'With versioning on, restore by promoting a previous version or by undelete.',
      },
      {
        instruction:
          'Set a second blob to Archive, try to download it, then rehydrate it to Hot with high priority.',
      },
      {
        instruction: 'Apply a lifecycle policy that moves blobs under logs/ to Cool after 30 days.',
      },
    ],
    solution: [
      {
        title: 'Lab commands',
        language: 'bash',
        code: `RG=rg-blob-lab; LOC=westeurope; SA=bloblab$RANDOM
az group create -n $RG -l $LOC
az storage account create -n $SA -g $RG -l $LOC --sku Standard_LRS
az role assignment create --assignee $(az ad signed-in-user show --query id -o tsv) \\
  --role "Storage Blob Data Contributor" --scope $(az storage account show -n $SA -g $RG --query id -o tsv)
az storage account blob-service-properties update -n $SA -g $RG \\
  --enable-delete-retention true --delete-retention-days 7 \\
  --enable-container-delete-retention true --container-delete-retention-days 7 \\
  --enable-versioning true
sleep 60
az storage container create --account-name $SA -n docs --auth-mode login

echo v1 > notes.txt; az storage blob upload --account-name $SA -c docs -n notes.txt -f notes.txt --auth-mode login
echo v2 > notes.txt; az storage blob upload --account-name $SA -c docs -n notes.txt -f notes.txt --overwrite --auth-mode login
az storage blob list --account-name $SA -c docs --include v --auth-mode login --query "[].{name:name, version:versionId, current:isCurrentVersion}" -o table

az storage blob delete --account-name $SA -c docs -n notes.txt --auth-mode login
az storage blob list --account-name $SA -c docs --include d --auth-mode login -o table
az storage blob undelete --account-name $SA -c docs -n notes.txt --auth-mode login

echo old > old.txt; az storage blob upload --account-name $SA -c docs -n old.txt -f old.txt --auth-mode login
az storage blob set-tier --account-name $SA -c docs -n old.txt --tier Archive --auth-mode login
az storage blob download --account-name $SA -c docs -n old.txt -f out.txt --auth-mode login  # BlobArchived
az storage blob set-tier --account-name $SA -c docs -n old.txt --tier Hot --rehydrate-priority High --auth-mode login

cat > policy.json <<'EOF'
{ "rules": [ { "enabled": true, "name": "logs-cool", "type": "Lifecycle",
  "definition": { "filters": { "blobTypes": ["blockBlob"], "prefixMatch": ["docs/logs/"] },
  "actions": { "baseBlob": { "tierToCool": { "daysAfterModificationGreaterThan": 30 } } } } } ] }
EOF
az storage account management-policy create --account-name $SA -g $RG --policy @policy.json`,
      },
    ],
    verification: [
      {
        command:
          'az storage blob show --account-name $SA -c docs -n old.txt --auth-mode login --query properties.archiveStatus',
        what: 'Shows rehydrate-pending-to-hot until rehydration finishes, then null with tier Hot.',
      },
      {
        command:
          'az storage account management-policy show --account-name $SA -g $RG --query policy.rules[].name',
        what: 'Shows the logs-cool rule.',
      },
    ],
    cleanup: [
      {
        command: 'az group delete -n rg-blob-lab --yes --no-wait',
        what: 'Deletes the account and all blobs, versions and snapshots.',
      },
    ],
  },
  relatedTopicIds: ['az1-storage-accounts', 'az1-storage-security', 'az1-azure-files'],
  docs: [
    {
      title: 'Access tiers for blob data',
      url: 'https://learn.microsoft.com/azure/storage/blobs/access-tiers-overview',
    },
    {
      title: 'Rehydrate an archived blob to an online tier',
      url: 'https://learn.microsoft.com/azure/storage/blobs/archive-rehydrate-overview',
    },
    {
      title: 'Lifecycle management overview',
      url: 'https://learn.microsoft.com/azure/storage/blobs/lifecycle-management-overview',
    },
    {
      title: 'Data protection overview for Blob Storage',
      url: 'https://learn.microsoft.com/azure/storage/blobs/data-protection-overview',
    },
    {
      title: 'Object replication for block blobs',
      url: 'https://learn.microsoft.com/azure/storage/blobs/object-replication-overview',
    },
    {
      title: 'Get started with AzCopy',
      url: 'https://learn.microsoft.com/azure/storage/common/storage-use-azcopy-v10',
    },
  ],
}
