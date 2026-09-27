import type { Question } from '../../types'

/** Original practice questions for this domain. Written for this app. */
export const az104StorageQuestions: Question[] = [
  {
    id: 'az1q-sto-1',
    domainId: 'az1-storage',
    topicId: 'az1-storage-accounts',
    kind: 'mcq',
    category: 'concept',
    difficulty: 'beginner',
    points: 1,
    prompt:
      'An application must continue reading and writing blobs if a single availability zone fails. Regional disaster recovery is not required. You need the lowest cost. Which redundancy should you choose?',
    options: [
      { id: 'a', text: 'LRS' },
      { id: 'b', text: 'ZRS' },
      { id: 'c', text: 'GRS' },
      { id: 'd', text: 'RA-GZRS' },
    ],
    correct: ['b'],
    explanation:
      'ZRS keeps three synchronous copies across zones and stays writable during a zone outage. LRS keeps all copies in one datacenter, GRS replicates to another region but its primary is LRS so a zone loss can still interrupt it, and RA-GZRS meets the need but costs more than required.',
  },
  {
    id: 'az1q-sto-2',
    domainId: 'az1-storage',
    topicId: 'az1-storage-accounts',
    kind: 'mcq',
    category: 'concept',
    difficulty: 'intermediate',
    points: 2,
    prompt:
      'A reporting application must be able to read data from the secondary region at any time, even when the primary region is healthy. The primary must survive a zone failure. Which SKU meets the requirement?',
    options: [
      { id: 'a', text: 'Standard_GZRS' },
      { id: 'b', text: 'Standard_RAGRS' },
      { id: 'c', text: 'Standard_RAGZRS' },
      { id: 'd', text: 'Premium_ZRS' },
    ],
    correct: ['c'],
    explanation:
      'RA-GZRS combines zone redundancy in the primary with a readable secondary endpoint. GZRS has no read access to the secondary before failover, RA-GRS is LRS in the primary so it does not survive a zone failure without failover, and Premium_ZRS has no secondary region.',
  },
  {
    id: 'az1q-sto-3',
    domainId: 'az1-storage',
    topicId: 'az1-storage-accounts',
    kind: 'multi',
    category: 'concept',
    difficulty: 'intermediate',
    points: 2,
    prompt:
      'You perform a customer-managed unplanned failover of a GRS storage account. Which statements are true? (Select all that apply.)',
    options: [
      { id: 'a', text: 'Writes made after the Last Sync Time may be lost' },
      {
        id: 'b',
        text: 'After failover the account is locally redundant in the new primary region',
      },
      { id: 'c', text: 'You should reconfigure geo-redundancy after the failover completes' },
      { id: 'd', text: 'The storage account endpoints get new DNS names' },
      { id: 'e', text: 'Failover converts the account to a premium account' },
    ],
    correct: ['a', 'b', 'c'],
    explanation:
      'Geo-replication is asynchronous, so data written after the last sync time can be lost. After an unplanned failover the account is LRS in the new primary and must be set back to GRS or GZRS. The endpoint names stay the same because DNS is repointed, and the performance tier does not change.',
  },
  {
    id: 'az1q-sto-4',
    domainId: 'az1-storage',
    topicId: 'az1-storage-accounts',
    kind: 'mcq',
    category: 'concept',
    difficulty: 'advanced',
    points: 2,
    prompt:
      'Compliance requires that storage data is encrypted twice at rest and that your team controls one of the keys. You are creating a new storage account. What should you configure?',
    options: [
      { id: 'a', text: 'Customer-managed keys only; double encryption is automatic with CMK' },
      {
        id: 'b',
        text: 'Infrastructure encryption at creation plus customer-managed keys in Key Vault',
      },
      { id: 'c', text: 'Microsoft-managed keys and HTTPS-only transfer' },
      { id: 'd', text: 'Azure Disk Encryption on the storage account' },
    ],
    correct: ['b'],
    explanation:
      'Infrastructure encryption adds a second layer and can only be enabled when the account is created. Customer-managed keys give your team control of the service-level key. CMK alone is single-layer, HTTPS protects data in transit rather than at rest, and Azure Disk Encryption applies to VM disks, not storage accounts.',
  },
  {
    id: 'az1q-sto-5',
    domainId: 'az1-storage',
    topicId: 'az1-storage-accounts',
    kind: 'command',
    category: 'command',
    difficulty: 'beginner',
    points: 1,
    prompt:
      'Using Azure CLI, create a general-purpose v2 storage account named stapp01 in resource group rg-app in westeurope with zone-redundant storage.',
    acceptedAnswers: [
      'az storage account create --name stapp01 --resource-group rg-app --location westeurope --kind StorageV2 --sku Standard_ZRS',
      'az storage account create -n stapp01 -g rg-app -l westeurope --kind StorageV2 --sku Standard_ZRS',
      'az storage account create -n stapp01 -g rg-app -l westeurope --sku Standard_ZRS --kind StorageV2',
      'az storage account create -n stapp01 -g rg-app -l westeurope --sku Standard_ZRS',
    ],
    answerHint: 'az storage account create ...',
    explanation:
      '`--kind StorageV2` is the default kind and `--sku Standard_ZRS` sets standard performance with zone redundancy. Name, resource group and location complete the command.',
  },
  {
    id: 'az1q-sto-6',
    domainId: 'az1-storage',
    topicId: 'az1-storage-security',
    kind: 'mcq',
    category: 'concept',
    difficulty: 'intermediate',
    points: 2,
    prompt:
      'External partners upload files to container uploads using service SAS tokens. You need to be able to revoke all of their tokens at once without affecting other applications that use the account keys. What should you do?',
    options: [
      { id: 'a', text: 'Issue the tokens as account SAS and rotate key1 when needed' },
      {
        id: 'b',
        text: 'Create a stored access policy on uploads and issue service SAS tokens that reference it',
      },
      { id: 'c', text: 'Enable blob soft delete on the account' },
      { id: 'd', text: 'Set the container public access level to Blob' },
    ],
    correct: ['b'],
    explanation:
      'Service SAS tokens that reference a stored access policy can be revoked by deleting or editing the policy, with no key rotation. Rotating keys would break the other applications, soft delete is about recovery, and public access removes authentication altogether.',
  },
  {
    id: 'az1q-sto-7',
    domainId: 'az1-storage',
    topicId: 'az1-storage-security',
    kind: 'mcq',
    category: 'concept',
    difficulty: 'advanced',
    points: 2,
    prompt:
      'A backend service must hand out short-lived download links to single blobs. Security requires that the links do not depend on storage account keys. Which option should you use?',
    options: [
      { id: 'a', text: 'Account SAS' },
      { id: 'b', text: 'Service SAS with a stored access policy' },
      { id: 'c', text: 'User delegation SAS' },
      { id: 'd', text: 'Anonymous container access' },
    ],
    correct: ['c'],
    explanation:
      'A user delegation SAS is signed with a key obtained using Entra ID credentials, not an account key, and is supported for Blob storage. Account and service SAS are both signed with an account key, and anonymous access provides no control at all.',
  },
  {
    id: 'az1q-sto-8',
    domainId: 'az1-storage',
    topicId: 'az1-storage-security',
    kind: 'multi',
    category: 'troubleshoot',
    difficulty: 'intermediate',
    points: 2,
    prompt:
      'You set a storage account firewall to Deny and add a virtual network rule for subnet snet-app. VMs in snet-app still receive 403 errors. Which could be the cause? (Select all that apply.)',
    options: [
      { id: 'a', text: 'The subnet does not have the Microsoft.Storage service endpoint enabled' },
      { id: 'b', text: 'The VMs use an identity with no data role and use Entra authentication' },
      { id: 'c', text: 'The account uses LRS instead of ZRS' },
      { id: 'd', text: 'The account has blob versioning enabled' },
    ],
    correct: ['a', 'b'],
    explanation:
      'Virtual network rules only match traffic from subnets with the Microsoft.Storage service endpoint. Even when the network allows the request, Entra authentication needs a data role such as Storage Blob Data Reader. Redundancy and versioning have no effect on access.',
  },
  {
    id: 'az1q-sto-9',
    domainId: 'az1-storage',
    topicId: 'az1-storage-security',
    kind: 'mcq',
    category: 'concept',
    difficulty: 'intermediate',
    points: 2,
    prompt:
      'Applications use key1 of a storage account. You need to rotate keys with no downtime. What should you do first?',
    options: [
      { id: 'a', text: 'Regenerate key1' },
      { id: 'b', text: 'Update the applications to use key2' },
      { id: 'c', text: 'Disable shared key access' },
      { id: 'd', text: 'Regenerate key2 and key1 together' },
    ],
    correct: ['b'],
    explanation:
      'Switch consumers to the secondary key first, then regenerate key1. Regenerating key1 first would break the apps immediately, disabling shared key access breaks every key-based client, and regenerating both at once guarantees an outage.',
  },
  {
    id: 'az1q-sto-10',
    domainId: 'az1-storage',
    topicId: 'az1-storage-security',
    kind: 'mcq',
    category: 'concept',
    difficulty: 'advanced',
    points: 2,
    prompt:
      'Hybrid users whose identities are synchronised from on-premises AD must access an Azure file share over SMB with their own credentials, and existing NTFS permissions must be honoured. Which combination should you configure?',
    options: [
      { id: 'a', text: 'Shared key access and a stored access policy on the share' },
      {
        id: 'b',
        text: 'Identity-based authentication (AD DS or Microsoft Entra Kerberos), a share-level Storage File Data SMB role, and NTFS ACLs',
      },
      { id: 'c', text: 'Storage Blob Data Contributor on the account and anonymous SMB access' },
      { id: 'd', text: 'A user delegation SAS mapped as a network drive' },
    ],
    correct: ['b'],
    explanation:
      'Identity-based SMB access needs an identity source, a share-level RBAC role and NTFS permissions at directory and file level. Shared keys give everyone full access as the account, Blob data roles do not apply to Files over SMB, and user delegation SAS is Blob-only.',
  },
  {
    id: 'az1q-sto-11',
    domainId: 'az1-storage',
    topicId: 'az1-storage-security',
    kind: 'command',
    category: 'command',
    difficulty: 'intermediate',
    points: 2,
    prompt: 'Using Azure CLI, regenerate key1 of storage account stapp01 in resource group rg-app.',
    acceptedAnswers: [
      'az storage account keys renew --account-name stapp01 --resource-group rg-app --key key1',
      'az storage account keys renew -n stapp01 -g rg-app --key key1',
      'az storage account keys renew --name stapp01 --resource-group rg-app --key key1',
      'az storage account keys renew -g rg-app -n stapp01 --key key1',
    ],
    answerHint: 'az storage account keys ...',
    explanation:
      '`az storage account keys renew` regenerates the chosen key (key1 or key2). Every account and service SAS signed with that key stops working immediately.',
  },
  {
    id: 'az1q-sto-12',
    domainId: 'az1-storage',
    topicId: 'az1-blob-storage',
    kind: 'mcq',
    category: 'concept',
    difficulty: 'intermediate',
    points: 2,
    prompt:
      'You need to read a blob that is in the Archive tier as quickly as possible, and you want to avoid an early deletion charge on the archived blob. What should you do?',
    options: [
      { id: 'a', text: 'Download the blob directly with AzCopy' },
      { id: 'b', text: 'Copy the blob to a new blob in the Hot tier with high rehydrate priority' },
      { id: 'c', text: 'Change the account default access tier to Hot' },
      { id: 'd', text: 'Create a snapshot of the archived blob and read the snapshot' },
    ],
    correct: ['b'],
    explanation:
      'Archive blobs are offline and must be rehydrated. Copying to a new online blob leaves the original archived, avoiding early deletion, and high priority is the fastest option. Direct download fails, the account default tier does not affect blobs with an explicit Archive tier, and a snapshot of an archived blob is still unreadable.',
  },
  {
    id: 'az1q-sto-13',
    domainId: 'az1-storage',
    topicId: 'az1-blob-storage',
    kind: 'multi',
    category: 'concept',
    difficulty: 'intermediate',
    points: 2,
    prompt:
      'You plan object replication from account src01 to account dst01. Which prerequisites must be met? (Select all that apply.)',
    options: [
      { id: 'a', text: 'Blob versioning enabled on src01' },
      { id: 'b', text: 'Blob versioning enabled on dst01' },
      { id: 'c', text: 'Change feed enabled on src01' },
      { id: 'd', text: 'Both accounts use GZRS' },
      { id: 'e', text: 'Both accounts are premium FileStorage accounts' },
    ],
    correct: ['a', 'b', 'c'],
    explanation:
      'Object replication requires versioning on both accounts and change feed on the source. It works across redundancy settings and regions, and it replicates block blobs, so FileStorage accounts are not relevant.',
  },
  {
    id: 'az1q-sto-14',
    domainId: 'az1-storage',
    topicId: 'az1-blob-storage',
    kind: 'mcq',
    category: 'concept',
    difficulty: 'beginner',
    points: 1,
    prompt:
      'Users occasionally overwrite blobs in a container with the wrong file. You need to restore the previous content. Which feature should you enable?',
    options: [
      { id: 'a', text: 'Container soft delete' },
      { id: 'b', text: 'Blob versioning' },
      { id: 'c', text: 'Lifecycle management' },
      { id: 'd', text: 'Object replication' },
    ],
    correct: ['b'],
    explanation:
      'Versioning keeps the prior content as a previous version on every overwrite, which you can promote back. Container soft delete only restores deleted containers, lifecycle management tiers and deletes, and object replication copies data to another account including the bad overwrite.',
  },
  {
    id: 'az1q-sto-15',
    domainId: 'az1-storage',
    topicId: 'az1-blob-storage',
    kind: 'mcq',
    category: 'yaml',
    difficulty: 'advanced',
    points: 2,
    prompt:
      'A lifecycle rule should move blobs to Cool when they have not been read for 30 days. The rule uses daysAfterLastAccessTimeGreaterThan but nothing ever moves. What is missing?',
    options: [
      { id: 'a', text: 'Blob versioning' },
      { id: 'b', text: 'Last access time tracking on the blob service' },
      { id: 'c', text: 'A stored access policy on the container' },
      { id: 'd', text: 'An account default tier of Cool' },
    ],
    correct: ['b'],
    explanation:
      'Rules based on last access time need last access time tracking enabled on the blob service. Versioning, stored access policies and the default tier have no effect on whether the rule condition can be evaluated.',
  },
  {
    id: 'az1q-sto-16',
    domainId: 'az1-storage',
    topicId: 'az1-blob-storage',
    kind: 'command',
    category: 'command',
    difficulty: 'intermediate',
    points: 2,
    prompt:
      'Using AzCopy, make container https://stapp01.blob.core.windows.net/web exactly match local folder ./site, deleting blobs that do not exist locally.',
    acceptedAnswers: [
      'azcopy sync ./site https://stapp01.blob.core.windows.net/web --delete-destination=true',
      'azcopy sync ./site https://stapp01.blob.core.windows.net/web --delete-destination true',
      'azcopy sync ./site https://stapp01.blob.core.windows.net/web --recursive --delete-destination=true',
    ],
    answerHint: 'azcopy sync ...',
    explanation:
      '`azcopy sync` compares source and destination and copies only differences; `--delete-destination=true` removes destination blobs that are missing from the source. `azcopy copy` never deletes.',
  },
  {
    id: 'az1q-sto-17',
    domainId: 'az1-storage',
    topicId: 'az1-azure-files',
    kind: 'mcq',
    category: 'concept',
    difficulty: 'intermediate',
    points: 2,
    prompt:
      'You have created a storage account with a file share and deployed a Storage Sync Service. You have installed the Azure File Sync agent on server FS1. What should you do next?',
    options: [
      { id: 'a', text: 'Add a server endpoint for FS1' },
      { id: 'b', text: 'Register FS1 with the Storage Sync Service' },
      { id: 'c', text: 'Create a second cloud endpoint for FS1' },
      { id: 'd', text: 'Enable cloud tiering on the file share' },
    ],
    correct: ['b'],
    explanation:
      'A server must be registered with the Storage Sync Service before it can host a server endpoint. A sync group has only one cloud endpoint, and cloud tiering is a server endpoint setting, not a share setting.',
  },
  {
    id: 'az1q-sto-18',
    domainId: 'az1-storage',
    topicId: 'az1-azure-files',
    kind: 'mcq',
    category: 'concept',
    difficulty: 'beginner',
    points: 1,
    prompt:
      'Linux servers require an NFS 4.1 file share in Azure. Which storage account should you create?',
    options: [
      { id: 'a', text: 'Standard general-purpose v2 with LRS' },
      { id: 'b', text: 'Premium FileStorage' },
      { id: 'c', text: 'Premium BlockBlobStorage' },
      { id: 'd', text: 'Standard general-purpose v1' },
    ],
    correct: ['b'],
    explanation:
      'NFS file shares are supported on premium FileStorage accounts. Standard GPv2 shares are SMB only, BlockBlobStorage holds premium block blobs (its NFS support is for Blob storage, not file shares), and GPv1 is legacy.',
  },
  {
    id: 'az1q-sto-19',
    domainId: 'az1-storage',
    topicId: 'az1-azure-files',
    kind: 'multi',
    category: 'concept',
    difficulty: 'advanced',
    points: 2,
    prompt: 'Which statements about Azure File Sync are correct? (Select all that apply.)',
    options: [
      { id: 'a', text: 'A sync group contains exactly one cloud endpoint' },
      { id: 'b', text: 'A sync group can contain several server endpoints on different servers' },
      { id: 'c', text: 'A server can be registered with several Storage Sync Services at once' },
      { id: 'd', text: 'Cloud tiering can use a volume free space policy and a date policy' },
      {
        id: 'e',
        text: 'Changes made directly in the Azure file share reach servers within seconds',
      },
    ],
    correct: ['a', 'b', 'd'],
    explanation:
      'A sync group has one cloud endpoint and many server endpoints, and cloud tiering uses free space and date policies. A server registers with only one Storage Sync Service, and direct changes in the share are picked up by a change detection job that runs about once every 24 hours.',
  },
  {
    id: 'az1q-sto-20',
    domainId: 'az1-storage',
    topicId: 'az1-azure-files',
    kind: 'mcq',
    category: 'troubleshoot',
    difficulty: 'intermediate',
    points: 2,
    prompt:
      'A user at home cannot map an Azure SMB file share. Test-NetConnection to the account file endpoint on port 445 returns TcpTestSucceeded False. What is the most likely cause?',
    options: [
      { id: 'a', text: 'The share quota is full' },
      { id: 'b', text: 'Outbound TCP port 445 is blocked by the ISP or local network' },
      { id: 'c', text: 'Share soft delete is enabled' },
      { id: 'd', text: 'The storage account uses customer-managed keys' },
    ],
    correct: ['b'],
    explanation:
      'A failed TCP test on 445 means the network path blocks SMB, commonly at the ISP. Options are a VPN, ExpressRoute or a File Sync server. A full quota, soft delete or encryption keys do not stop a TCP connection from being established.',
  },
  {
    id: 'az1q-sto-21',
    domainId: 'az1-storage',
    topicId: 'az1-blob-storage',
    kind: 'task',
    category: 'lab',
    difficulty: 'advanced',
    points: 3,
    prompt:
      'Protect storage account stlogs01 in rg-logs: keep deleted blobs and containers for 14 days, keep previous versions on overwrite, and move blobs under logs/ to Cool after 30 days and delete them after 365 days.',
    context: 'You have Contributor on rg-logs and Azure CLI in Cloud Shell.',
    checkpoints: [
      { id: 'c1', text: 'Blob soft delete is enabled with 14-day retention' },
      { id: 'c2', text: 'Container soft delete is enabled with 14-day retention' },
      { id: 'c3', text: 'Blob versioning is enabled' },
      {
        id: 'c4',
        text: 'A lifecycle rule filters on the logs/ prefix, tiers to Cool after 30 days and deletes after 365 days',
      },
    ],
    solution: [
      {
        title: 'Data protection and lifecycle policy',
        language: 'bash',
        code: `az storage account blob-service-properties update -n stlogs01 -g rg-logs \\
  --enable-delete-retention true --delete-retention-days 14 \\
  --enable-container-delete-retention true --container-delete-retention-days 14 \\
  --enable-versioning true

cat > policy.json <<'EOF'
{ "rules": [ { "enabled": true, "name": "logs", "type": "Lifecycle",
  "definition": {
    "filters": { "blobTypes": ["blockBlob"], "prefixMatch": ["logs/"] },
    "actions": { "baseBlob": {
      "tierToCool": { "daysAfterModificationGreaterThan": 30 },
      "delete": { "daysAfterModificationGreaterThan": 365 } } } } } ] }
EOF
az storage account management-policy create --account-name stlogs01 -g rg-logs --policy @policy.json

az storage account blob-service-properties show -n stlogs01 -g rg-logs \\
  --query "{blob:deleteRetentionPolicy, container:containerDeleteRetentionPolicy, versioning:isVersioningEnabled}"`,
      },
    ],
    explanation:
      'Soft delete for blobs and containers, and versioning, are blob service properties. Tiering and deletion by age are a lifecycle management policy; prefixMatch starts with the container name, so logs/ matches the logs container.',
  },
]
