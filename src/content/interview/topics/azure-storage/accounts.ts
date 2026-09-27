import type { InterviewQuestion } from '../../../types'

/** Storage accounts: redundancy, tiers, access, data protection and Azure Files. */
export const azureStorageAccountQuestions: InterviewQuestion[] = [
  {
    id: 'itv-azst-1',
    level: 'basic',
    kind: 'open',
    prompt: 'Walk me through storage account types and the redundancy options. How do you choose?',
    probing:
      'The opener for any storage round. They want the four redundancy letters explained as failure domains, not recited as acronyms.',
    answer: [
      'A storage account is the namespace and billing boundary for Blob, Files, Queue and Table storage. For almost everything you create a **general-purpose v2** (`StorageV2`) account on the Standard tier. The Premium account kinds - **BlockBlobStorage**, **FileStorage**, and premium page blobs - put data on SSD for low, consistent latency, and are chosen per workload rather than by default.',
      'Redundancy is the question of **which failure you want to survive**. **LRS** keeps three copies inside one datacenter, so it survives a disk or rack failure but not the datacenter. **ZRS** spreads three copies across three availability zones in the region, so it survives a zone going down with no data loss and no failover.',
      '**GRS** is LRS in the primary region plus an asynchronous copy to the paired region. **GZRS** is ZRS in the primary plus the same asynchronous copy. Put **RA-** in front of either and you also get a read-only `-secondary` endpoint you can read from at any time, without failing over.',
      'My default for production is ZRS for anything that must survive a zone outage, and GZRS or RA-GZRS when the data must also survive losing the region. LRS is fine for data you can recreate - build caches, scratch space, dev accounts - because it is the cheapest.',
    ],
    deeper: [
      'Geo-replication is **asynchronous**, so the secondary lags. The account’s **Last Sync Time** property tells you how far behind it is, and anything written after that time is lost in an unplanned failover. RPO for geo-redundant storage is typically measured in minutes, not zero.',
      'After an unplanned customer-managed failover, the old secondary becomes the primary and the account ends up **locally redundant** there. You have to re-enable geo-redundancy afterwards, which means a full re-replication.',
      'Premium block blob and premium file shares only support LRS and ZRS - there is no geo-redundant premium tier, so cross-region protection for them is your job (object replication, AzCopy, or backup).',
    ],
    diagrams: [
      {
        kind: 'decision',
        title: 'Which redundancy do you need?',
        caption:
          'Pick the largest failure you must survive, then decide whether you need reads during it.',
        question: 'What is the largest failure the data must survive?',
        branches: [
          {
            condition: 'Disk or rack failure only',
            result: 'LRS',
            detail: 'Three copies in one datacenter, cheapest',
          },
          {
            condition: 'A whole availability zone',
            result: 'ZRS',
            detail: 'Synchronous across three zones',
            tone: 'success',
          },
          {
            condition: 'The whole region',
            result: 'GRS or GZRS',
            detail: 'Async copy to the paired region',
            tone: 'accent',
          },
          {
            condition: 'Region loss and must read meanwhile',
            result: 'RA-GRS or RA-GZRS',
            detail: 'Read-only secondary endpoint',
            tone: 'accent',
          },
        ],
      },
    ],
    code: [
      {
        title: 'Create a zone- and geo-redundant account, then check replication lag',
        language: 'bash',
        code: `az storage account create \\
  --name <account> --resource-group <rg> --location westeurope \\
  --kind StorageV2 --sku Standard_RAGZRS \\
  --min-tls-version TLS1_2 --allow-blob-public-access false

# How far behind is the secondary? Anything after this timestamp is at risk.
az storage account show -n <account> -g <rg> \\
  --expand geoReplicationStats \\
  --query "geoReplicationStats.{status:status, lastSync:lastSyncTime}"`,
        placeholders: ['<account>', '<rg>'],
      },
    ],
    traps: [
      'Saying GRS gives you an automatic regional failover. Microsoft only initiates it in extreme cases; normally the customer triggers failover.',
      'Assuming RA-GRS means the application automatically reads from the secondary. The app, or the SDK retry policy, has to be told about the secondary endpoint.',
      'Treating redundancy as backup. A deleted or overwritten blob is deleted or overwritten in every replica.',
    ],
    followUps: [
      'What is Last Sync Time and why does it matter during failover?',
      'How is ZRS different from an availability set?',
      'What happens to redundancy after you fail over?',
    ],
    tags: ['storage accounts', 'redundancy', 'fundamentals'],
  },
  {
    id: 'itv-azst-2',
    level: 'basic',
    kind: 'mcq',
    prompt:
      'An app must survive a zone outage with no data loss, survive a regional outage, and keep reading data during the regional outage without anyone initiating a failover. Which SKU fits?',
    options: [
      { id: 'a', text: 'Standard_ZRS' },
      { id: 'b', text: 'Standard_GRS' },
      { id: 'c', text: 'Standard_RAGZRS' },
      { id: 'd', text: 'Standard_GZRS' },
    ],
    correct: ['c'],
    probing:
      'Can the candidate map three separate requirements onto the redundancy letters, including the easily-missed read-access part?',
    answer: [
      '**RA-GZRS**. The Z gives synchronous copies across three zones in the primary region, so a zone outage loses nothing. The G adds an asynchronous copy in the paired region. The RA adds a read-only secondary endpoint, which is what lets the app keep reading during a regional outage without waiting for a failover.',
      'ZRS alone does not leave the region. GRS survives the region but not a zone outage as gracefully, because the primary is LRS in a single datacenter. Plain GZRS has the right durability but no read endpoint until someone fails over.',
    ],
    code: [
      {
        title: 'Changing redundancy on an existing account',
        language: 'bash',
        code: `# LRS/GRS -> ZRS/GZRS is a conversion that can take time; check the portal
# "Redundancy" blade or request a conversion if the in-place change is refused.
az storage account update -n <account> -g <rg> --sku Standard_RAGZRS

# The app reads from the secondary host when the primary is unavailable:
#   https://<account>-secondary.blob.core.windows.net/<container>/<blob>`,
        placeholders: ['<account>', '<rg>', '<container>', '<blob>'],
      },
    ],
    traps: [
      'Picking GZRS and forgetting that without RA the secondary is not readable until failover.',
      'Expecting writes to work on the secondary endpoint. It is read-only.',
    ],
    followUps: ['How would the application know to switch to the secondary endpoint?'],
    tags: ['redundancy', 'ra-gzrs', 'storage accounts'],
  },
  {
    id: 'itv-azst-3',
    level: 'intermediate',
    kind: 'open',
    prompt: 'Explain blob access tiers and how you would use lifecycle management to control cost.',
    probing:
      'Cost awareness. The detail they listen for is the trade-off: cheaper storage means more expensive, slower access, plus minimum retention penalties.',
    answer: [
      'Block blobs have four tiers. **Hot** has the highest storage price and the lowest access price - for data read often. **Cool** and **Cold** are cheaper to store but charge more per read and have minimum retention periods of 30 and 90 days. **Archive** is the cheapest by far, but it is **offline**: you cannot read an archived blob until you rehydrate it to an online tier, which takes hours at standard priority.',
      'The minimum retention matters. Move a blob to Cool and delete it after ten days, and you pay an **early deletion** charge for the remaining twenty. So tiering is a decision about access pattern, not just age.',
      '**Lifecycle management** is a policy on the account that runs roughly once a day and moves or deletes blobs based on rules: days since modification, days since creation, or - if you enable last-access-time tracking - days since last read. A typical policy for logs is Hot for a week, Cool after 30 days, Archive after 180, delete after seven years.',
      'Rules can be scoped with prefix filters and blob index tags, and they can also clean up **old versions and snapshots**, which is where a lot of forgotten cost hides once versioning is on.',
    ],
    deeper: [
      'Rehydration from Archive has two priorities. Standard can take up to about 15 hours; High priority is typically under an hour for smaller objects and costs more. You either change the tier in place or copy the blob to a new online blob, and the copy approach leaves the archived original untouched.',
      'Lifecycle policies are not instantaneous. A new or changed policy can take up to a day or more to start acting, so they are useless for "move this now" - use `az storage blob set-tier` for that.',
      'Tiering based on **last access time** is the best fit for unpredictable data, but it adds a small cost for tracking and needs the feature enabled before any history exists.',
    ],
    diagrams: [
      {
        kind: 'flow',
        title: 'A typical log lifecycle',
        caption:
          'Each move trades storage cost for access cost. Archive is offline until rehydrated.',
        nodes: [
          { label: 'Hot', detail: 'Written and read daily', tone: 'accent' },
          {
            label: 'Cool after 30 days',
            detail: 'Min retention 30 days',
            arrowLabel: 'lifecycle rule',
          },
          { label: 'Cold after 90 days', detail: 'Min retention 90 days' },
          {
            label: 'Archive after 180 days',
            detail: 'Offline - hours to rehydrate',
            tone: 'warning',
          },
          { label: 'Delete after 7 years', detail: 'Retention obligation met', tone: 'muted' },
        ],
      },
    ],
    code: [
      {
        title: 'Lifecycle policy for a logs container',
        language: 'json',
        code: `{
  "rules": [
    {
      "name": "logs-retention",
      "enabled": true,
      "type": "Lifecycle",
      "definition": {
        "filters": { "blobTypes": ["blockBlob"], "prefixMatch": ["logs/"] },
        "actions": {
          "baseBlob": {
            "tierToCool":    { "daysAfterModificationGreaterThan": 30 },
            "tierToCold":    { "daysAfterModificationGreaterThan": 90 },
            "tierToArchive": { "daysAfterModificationGreaterThan": 180 },
            "delete":        { "daysAfterModificationGreaterThan": 2555 }
          },
          "version":  { "delete": { "daysAfterCreationGreaterThan": 90 } },
          "snapshot": { "delete": { "daysAfterCreationGreaterThan": 90 } }
        }
      }
    }
  ]
}`,
      },
      {
        title: 'Apply the policy, and rehydrate one blob by hand',
        language: 'bash',
        code: `az storage account management-policy create \\
  --account-name <account> -g <rg> --policy @policy.json

# Rehydrate by copying to a new online blob (original stays archived)
az storage blob copy start --auth-mode login \\
  --account-name <account> \\
  --destination-container restored --destination-blob report.parquet \\
  --source-container logs --source-blob 2023/report.parquet \\
  --tier Hot --rehydrate-priority High`,
        placeholders: ['<account>', '<rg>'],
      },
    ],
    traps: [
      'Archiving data that someone needs within minutes. Archive is offline.',
      'Ignoring early-deletion charges when data is short-lived.',
      'Turning on versioning without a lifecycle rule for old versions, so storage grows forever.',
    ],
    followUps: [
      'How do you rehydrate an archived blob, and how long does it take?',
      'When would you tier on last access time rather than modification time?',
    ],
    tags: ['blob', 'access tiers', 'lifecycle', 'cost'],
  },
  {
    id: 'itv-azst-4',
    level: 'intermediate',
    kind: 'open',
    prompt:
      'Compare account keys, SAS tokens and Microsoft Entra authorization for storage. What would you use?',
    probing:
      'Security judgement. Strong candidates prefer identity, know the three SAS types, and know how (and whether) each can be revoked.',
    answer: [
      '**Account keys** are two shared secrets that grant full control of the entire account - every container, every file share, every operation. Anyone with a key is effectively the owner of the data. They are the thing to avoid.',
      'A **SAS** is a signed URL that grants limited rights - specific permissions, a resource, a time window, optionally an IP range. There are three kinds. An **account SAS** and a **service SAS** are signed with an account key. A **user delegation SAS** is signed with a key obtained using Entra credentials, so it is tied to an identity and its RBAC permissions.',
      '**Entra authorization** means the caller presents an OAuth token and Azure RBAC data-plane roles decide access: Storage Blob Data Reader, Contributor or Owner, Storage Queue Data Contributor and so on. With **managed identities** the application holds no secret at all.',
      'My order of preference: managed identity with RBAC for anything running in Azure; a short-lived user delegation SAS when I must hand access to something that cannot authenticate, like a browser upload; key-signed SAS only with a stored access policy; and account keys never in application code. Once nothing depends on them, I set `allowSharedKeyAccess` to false.',
    ],
    diagrams: [
      {
        kind: 'decision',
        title: 'Which storage authorization to use',
        caption: 'Identity first; SAS only for callers that cannot hold an identity.',
        question: 'Who needs access to the data?',
        branches: [
          {
            condition: 'Code running in Azure',
            result: 'Managed identity + RBAC',
            detail: 'No secret to leak or rotate',
            tone: 'success',
          },
          {
            condition: 'A browser or partner, briefly',
            result: 'User delegation SAS',
            detail: 'Signed via Entra, short expiry',
            tone: 'accent',
          },
          {
            condition: 'Legacy tool needing a SAS',
            result: 'Service SAS + stored access policy',
            detail: 'Revocable by editing the policy',
            tone: 'warning',
          },
          {
            condition: 'Anything else',
            result: 'Not account keys',
            detail: 'Full control of the whole account',
            tone: 'danger',
          },
        ],
      },
    ],
    code: [
      {
        title: 'RBAC for an app, and a user delegation SAS',
        language: 'bash',
        code: `# Data-plane role for a managed identity, scoped to one container
az role assignment create \\
  --assignee-object-id <principal-id> --assignee-principal-type ServicePrincipal \\
  --role "Storage Blob Data Contributor" \\
  --scope "/subscriptions/<sub>/resourceGroups/<rg>/providers/Microsoft.Storage/storageAccounts/<account>/blobServices/default/containers/uploads"

# A one-hour, write-only user delegation SAS - signed with your Entra identity
az storage blob generate-sas --auth-mode login --as-user \\
  --account-name <account> -c uploads -n incoming/file.zip \\
  --permissions cw --expiry $(date -u -d '+1 hour' '+%Y-%m-%dT%H:%MZ') --https-only

# When nothing uses keys any more
az storage account update -n <account> -g <rg> --allow-shared-key-access false`,
        placeholders: ['<principal-id>', '<sub>', '<rg>', '<account>'],
      },
    ],
    deeper: [
      'Revocation differs by SAS type. A user delegation SAS dies when you revoke the user delegation keys or remove the identity’s role. A service SAS bound to a **stored access policy** dies when you change or delete the policy. An ad-hoc account or service SAS can only be killed by **rotating the key that signed it** - which breaks everything else using that key.',
      'Control plane and data plane are separate. **Contributor** on the account does not grant blob read through Entra - but it does grant `listKeys`, and with a key you can read everything. That is why disabling shared key access matters: it closes the side door.',
    ],
    traps: [
      'Saying "Owner on the storage account can read blobs with Entra auth". It needs a Storage Blob Data role; Owner only gets there via the keys.',
      'Issuing long-lived SAS tokens without a stored access policy, which cannot be revoked short of key rotation.',
      'Rotating both keys at once, which breaks every client simultaneously.',
    ],
    followUps: [
      'How do you revoke a SAS that was leaked?',
      'How would you rotate account keys without downtime?',
      'What breaks when you disable shared key access?',
    ],
    tags: ['security', 'sas', 'rbac', 'managed identity', 'storage accounts'],
  },
  {
    id: 'itv-azst-5',
    level: 'advanced',
    kind: 'open',
    prompt:
      'How would you protect blob data against accidental deletion and ransomware? Explain soft delete, versioning, point-in-time restore and immutability.',
    probing:
      'Layered data protection. The senior answer distinguishes "oops" protection from "an attacker has my credentials" protection.',
    answer: [
      'I think of it as two different threats. **Accidents** - someone deletes a container or overwrites a file - are covered by soft delete, versioning and point-in-time restore. **Malicious deletion** by someone holding valid credentials needs something they cannot undo: immutability and backups outside their reach.',
      '**Soft delete** keeps deleted blobs and containers for a retention period you choose, so a delete becomes recoverable. **Versioning** keeps the previous version every time a blob is overwritten, so an overwrite is recoverable too. **Point-in-time restore** builds on versioning and change feed to roll a set of block blobs back to a timestamp - useful after a bad batch job.',
      '**Immutability** is WORM storage: a **time-based retention** policy or a **legal hold** on a container or on individual versions. While it applies, nobody - including the account owner - can modify or delete the data. A time-based policy can be **locked**, after which it can only be extended, never shortened or removed.',
      'Around that I add a **CanNotDelete lock** on the account so it cannot be deleted from the control plane, disable shared key access, and for critical data take a **vaulted backup** into a Backup vault in a separate security boundary, with its own soft delete and immutability.',
    ],
    deeper: [
      'Soft delete alone does not stop an attacker with Owner rights - they can shorten the retention or disable it and then purge. That is precisely why locked immutability and backup-vault soft delete exist: they remove the ability to undo the protection.',
      'A resource lock protects the **account resource**, not the data. Someone with a key can still delete every blob inside a locked account. Candidates frequently confuse the two.',
      'Locked immutability is a compliance commitment. Lock a seven-year policy on the wrong container and you pay to store that data for seven years; test on unlocked policies first.',
    ],
    code: [
      {
        title: 'Blob data protection in Bicep',
        language: 'bicep',
        code: `resource sa 'Microsoft.Storage/storageAccounts@2023-05-01' existing = {
  name: storageAccountName
}

resource blobSvc 'Microsoft.Storage/storageAccounts/blobServices@2023-05-01' = {
  parent: sa
  name: 'default'
  properties: {
    isVersioningEnabled: true
    changeFeed: { enabled: true }
    deleteRetentionPolicy: { enabled: true, days: 30 }
    containerDeleteRetentionPolicy: { enabled: true, days: 30 }
    restorePolicy: { enabled: true, days: 14 } // must be less than soft delete days
  }
}

resource audit 'Microsoft.Storage/storageAccounts/blobServices/containers@2023-05-01' = {
  parent: blobSvc
  name: 'audit'
  properties: {
    immutableStorageWithVersioning: { enabled: true }
  }
}

resource noDelete 'Microsoft.Authorization/locks@2020-05-01' = {
  scope: sa
  name: 'no-delete'
  properties: { level: 'CanNotDelete', notes: 'Protects the account, not the data inside it' }
}`,
      },
      {
        title: 'Undelete and restore',
        language: 'bash',
        code: `# Recover a soft-deleted blob
az storage blob undelete --auth-mode login --account-name <account> \\
  -c reports -n q3/summary.csv

# Roll every block blob under a prefix back to a point in time
az storage blob restore --account-name <account> -g <rg> \\
  --time-to-restore 2026-09-26T08:00:00Z \\
  --blob-range reports/q3 reports/q4`,
        placeholders: ['<account>', '<rg>'],
      },
    ],
    traps: [
      'Believing a resource lock protects the blobs. It protects the account resource only.',
      'Relying on soft delete against a compromised admin who can simply turn it off.',
      'Locking an immutability policy before testing it.',
    ],
    followUps: [
      'What is the difference between an unlocked and a locked immutability policy?',
      'How does point-in-time restore depend on versioning and change feed?',
      'Where would you keep backups so a compromised subscription owner cannot delete them?',
    ],
    tags: ['data protection', 'immutability', 'soft delete', 'ransomware', 'blob'],
  },
  {
    id: 'itv-azst-6',
    level: 'intermediate',
    kind: 'open',
    prompt: 'What is Azure Files, and when would you add Azure File Sync?',
    probing:
      'Hybrid file storage. They want SMB versus NFS, identity-based access, and a correct mental model of cloud tiering.',
    answer: [
      '**Azure Files** is a managed file share you mount over **SMB** (Windows, Linux, macOS) or **NFS** (Linux, premium shares only), or reach through the REST API. It replaces a traditional file server for lift-and-shift apps, shared configuration, and user or departmental shares.',
      'For access control on SMB you normally use **identity-based authentication** - on-premises AD DS, Entra Domain Services, or Entra Kerberos for hybrid identities - so NTFS permissions work as users expect. Mounting with the storage account key works but gives everyone full control.',
      '**Azure File Sync** is for when users are still in an office and need LAN-speed access. You install the agent on a Windows Server, register it with a **Storage Sync Service**, and create a **sync group** that links an Azure file share (the cloud endpoint) to folders on one or more servers (server endpoints). The server becomes a fast local cache of the share.',
      '**Cloud tiering** is what makes it economical: the server keeps hot files locally and replaces cold files with pointers, recalling them transparently when opened. The Azure share holds the full dataset, so a failed server is replaced by installing a new one and letting it sync the namespace.',
    ],
    diagrams: [
      {
        kind: 'nested',
        title: 'Azure File Sync building blocks',
        caption: 'One sync group ties one cloud share to server folders in any number of offices.',
        root: {
          label: 'Storage Sync Service',
          detail: 'Regional resource, servers register here',
          tone: 'accent',
          children: [
            {
              label: 'Sync group: finance',
              children: [
                {
                  label: 'Cloud endpoint',
                  detail: 'Azure file share, full dataset',
                  tone: 'success',
                },
                { label: 'Server endpoint: London', detail: 'D:\\Finance, cloud tiering on' },
                { label: 'Server endpoint: Madrid', detail: 'E:\\Finance, cloud tiering on' },
              ],
            },
          ],
        },
      },
    ],
    code: [
      {
        title: 'Create a share and mount it from Linux over SMB',
        language: 'bash',
        code: `az storage share-rm create -g <rg> --storage-account <account> \\
  --name finance --quota 1024 --enabled-protocols SMB

# Port 445 must be reachable - many ISPs block it, so use VPN or ExpressRoute
nc -zvw3 <account>.file.core.windows.net 445

sudo mount -t cifs //<account>.file.core.windows.net/finance /mnt/finance \\
  -o vers=3.1.1,credentials=/etc/smbcredentials/<account>.cred,serverino,nosharesock`,
        placeholders: ['<rg>', '<account>'],
      },
    ],
    traps: [
      'Expecting SMB to work from home broadband. TCP 445 outbound is commonly blocked.',
      'Using File Sync as a backup. Deletes sync too - back up the Azure share.',
      'Thinking NFS shares support identity-based auth the same way SMB does. NFS relies on network controls.',
    ],
    followUps: [
      'How does cloud tiering decide what to keep locally?',
      'How would you back up an Azure file share?',
      'How do you replace a failed File Sync server?',
    ],
    tags: ['azure files', 'file sync', 'smb', 'hybrid'],
  },
  {
    id: 'itv-azst-7',
    level: 'basic',
    kind: 'multi',
    prompt:
      'A storage account key was committed to a public repository an hour ago. Which actions actually reduce the exposure?',
    options: [
      { id: 'a', text: 'Rotate (regenerate) the leaked key' },
      { id: 'b', text: 'Delete the commit from the repository and force-push' },
      { id: 'c', text: 'Review storage logs for requests authorised with the key' },
      { id: 'd', text: 'Move clients to managed identity and disable shared key access' },
      { id: 'e', text: 'Add a CanNotDelete lock to the storage account' },
    ],
    correct: ['a', 'c', 'd'],
    probing:
      'Incident instinct: invalidate the secret first, then assess damage, then remove the class of problem.',
    answer: [
      '**Rotate the key** first - that is the only thing that invalidates it, and it also invalidates any SAS signed with it. Then **check the logs** for what was done with it during the exposure window. Then remove the whole class of risk by moving clients to **managed identity** and disabling shared key access.',
      'Rewriting Git history is good hygiene but does not help: the key was public, so assume it was scraped within minutes. A CanNotDelete lock protects the account resource from deletion but does nothing to stop someone with the key reading or deleting the data inside it.',
    ],
    code: [
      {
        title: 'Rotate, then look for use',
        language: 'bash',
        code: `# Rotate the leaked key (key1 here); clients should already use key2
az storage account keys renew -g <rg> -n <account> --key key1`,
        placeholders: ['<rg>', '<account>'],
      },
      {
        title: 'Who used shared-key auth in the window? (KQL)',
        language: 'text',
        code: `StorageBlobLogs
| where TimeGenerated > ago(2h)
| where AuthenticationType == "AccountKey"
| summarize requests = count() by CallerIpAddress, OperationName
| order by requests desc`,
      },
    ],
    traps: [
      'Believing a force-push un-leaks a secret.',
      'Rotating the key that legitimate clients are using without switching them to the other key first.',
    ],
    followUps: ['How do you rotate keys without breaking running applications?'],
    tags: ['security', 'incident', 'account keys'],
  },
]
