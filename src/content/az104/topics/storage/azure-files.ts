import type { Topic } from '../../../types'

export const az1AzureFiles: Topic = {
  id: 'az1-azure-files',
  title: 'Azure Files and Azure File Sync',
  domainId: 'az1-storage',
  difficulty: 'intermediate',
  estimatedMinutes: 35,
  order: 4,
  tags: [
    'azure-files',
    'smb',
    'nfs',
    'share-snapshots',
    'soft-delete',
    'file-sync',
    'cloud-tiering',
  ],
  oneLiner:
    'Run fully managed SMB and NFS file shares in Azure, protect them with snapshots and soft delete, and cache them on Windows servers with Azure File Sync.',
  explanation: [
    '**Azure Files** offers fully managed file shares in the cloud that clients mount like a network drive. Shares speak **SMB** (Windows, Linux, macOS) or **NFS 4.1** (Linux), so existing applications that expect a file system can move to Azure without being rewritten.',
    'Shares live in a storage account. **Standard** shares run on HDD-backed GPv2 accounts with **transaction optimized**, **hot** and **cool** tiers. **Premium** shares run on SSD-backed **FileStorage** accounts and are needed for NFS. Newer **provisioned v2** billing lets you choose storage, IOPS and throughput independently; the classic models charge premium shares by provisioned size and standard shares by usage.',
    'Two features protect share data. **Share snapshots** are read-only, point-in-time copies of an entire share, which users can browse as Previous Versions in Windows. **Soft delete** for file shares keeps a deleted share recoverable for a retention period. **Azure Backup** automates snapshots on a schedule with longer retention.',
    '**Azure File Sync** extends an Azure file share to Windows Servers. Each server keeps a local cache of the share; with **cloud tiering** enabled, rarely used files are replaced by pointers and fetched from Azure on demand, so a small server can front a huge share. Multiple servers in different offices can sync the same share.',
  ],
  whyItMatters: [
    'AZ-104 asks you to create and configure file shares, configure snapshots and soft delete, and deploy and configure Azure File Sync. Questions often probe the order of setup steps and what can or cannot be mixed in a sync group.',
    'File servers are one of the most common workloads in a lift-and-shift migration. Knowing when to replace them with a share mounted directly and when to keep a local cache with File Sync shapes the whole migration plan.',
    'Port 445 is blocked by many ISPs and corporate networks, and most "cannot mount" tickets come down to it. Administrators who know the network and authentication prerequisites resolve these quickly.',
  ],
  howItWorks: [
    'SMB shares are reachable on TCP **port 445** at `<account>.file.core.windows.net`. Clients can authenticate with the storage account key (as user `localhost\\<account>` or `AZURE\\<account>`), or with identity-based authentication (AD DS, Microsoft Entra Domain Services or Microsoft Entra Kerberos). SMB 3.x encryption in transit is required for access from outside the Azure region.',
    'NFS shares need a **premium FileStorage** account, have no key or identity authentication (access is controlled by network: private endpoint or service endpoint), and require **secure transfer required** to be disabled for the account unless you use NFS encryption in transit where available.',
    'Share snapshots are incremental and taken at the share level, manually or by Azure Backup. You can restore individual files from a snapshot or the whole share. Deleting a share deletes its snapshots, which is one reason to enable **share soft delete** (retention 1 to 365 days) and, for backed-up shares, a **resource lock** Azure Backup places on the account.',
    'Azure File Sync has four objects. A **Storage Sync Service** is the top-level resource. A **sync group** defines one sync topology: exactly one **cloud endpoint** (an Azure file share) and one or more **server endpoints** (a path on a registered server). A **registered server** is a Windows Server with the File Sync agent installed and registered to one Storage Sync Service.',
    'Setup order: deploy the Storage Sync Service, create the sync group and its cloud endpoint, install the agent on each Windows Server, register the server, then add server endpoints. A server can be registered to only one Storage Sync Service, and a server endpoint cannot be on the system volume if cloud tiering is enabled.',
    '**Cloud tiering** has a **volume free space policy** (keep at least N percent of the volume free) and an optional **date policy** (tier files not accessed for N days). Tiered files keep their namespace locally and are recalled on access.',
    'Changes made directly in the Azure file share (not through a server) are detected by a change detection job that runs about every 24 hours, so they reach servers more slowly than server-side changes, which sync almost immediately.',
  ],
  diagrams: [
    {
      kind: 'nested',
      title: 'Azure File Sync object model',
      caption: 'One sync group has exactly one cloud endpoint and any number of server endpoints.',
      root: {
        label: 'Storage Sync Service',
        tone: 'accent',
        children: [
          {
            label: 'Sync group: Projects',
            children: [
              { label: 'Cloud endpoint', detail: 'Azure file share: projects', tone: 'success' },
              { label: 'Server endpoint', detail: 'FS-LON D:\\Projects' },
              { label: 'Server endpoint', detail: 'FS-NYC E:\\Projects' },
            ],
          },
          { label: 'Registered servers', detail: 'FS-LON, FS-NYC with agent', tone: 'muted' },
        ],
      },
    },
    {
      kind: 'flow',
      title: 'Deploying Azure File Sync',
      caption: 'The cloud side is prepared first; servers join once the sync group exists.',
      nodes: [
        { label: 'Create file share', detail: 'In a storage account', tone: 'accent' },
        { label: 'Deploy Storage Sync Service', detail: 'Same region as the account' },
        { label: 'Create sync group', detail: 'With the cloud endpoint' },
        { label: 'Install agent and register server', detail: 'One sync service per server' },
        { label: 'Add server endpoint', detail: 'Path plus cloud tiering policy', tone: 'success' },
      ],
    },
    {
      kind: 'decision',
      title: 'Mount directly or sync a cache?',
      caption:
        'Direct mount is simplest; File Sync is for low-latency local access and branch offices.',
      question: 'How do users need to reach the files?',
      branches: [
        {
          condition: 'Cloud VMs or port 445 available',
          result: 'Mount the share directly over SMB',
        },
        { condition: 'Linux workloads needing POSIX', result: 'Premium NFS share', tone: 'accent' },
        {
          condition: 'Branch offices, fast local access',
          result: 'Azure File Sync with cloud tiering',
          tone: 'success',
        },
        {
          condition: 'Port 445 blocked from clients',
          result: 'VPN, ExpressRoute or File Sync server',
        },
      ],
    },
  ],
  keyObjects: [
    {
      kind: 'File share (Microsoft.Storage/storageAccounts/fileServices/shares)',
      apiVersion: '2023-05-01',
      purpose: 'An SMB or NFS share inside a storage account.',
      fields: [
        {
          path: 'properties.shareQuota',
          meaning: 'Maximum size in GiB; for premium classic billing also the provisioned size.',
        },
        { path: 'properties.enabledProtocols', meaning: 'SMB or NFS. Set at creation.' },
        {
          path: 'properties.accessTier',
          meaning: 'TransactionOptimized, Hot or Cool for standard shares; Premium for premium.',
        },
        {
          path: 'properties.rootSquash',
          meaning: 'NFS only: NoRootSquash, RootSquash or AllSquash.',
        },
      ],
    },
    {
      kind: 'File service properties (Microsoft.Storage/storageAccounts/fileServices)',
      apiVersion: '2023-05-01',
      purpose: 'Account-wide settings for all shares.',
      fields: [
        {
          path: 'properties.shareDeleteRetentionPolicy',
          meaning: 'Soft delete for shares: enabled and days.',
        },
        {
          path: 'properties.protocolSettings.smb',
          meaning: 'Allowed SMB versions, channel encryption and multichannel for premium.',
        },
      ],
    },
    {
      kind: 'Storage Sync Service (Microsoft.StorageSync/storageSyncServices)',
      apiVersion: '2022-09-01',
      purpose: 'Top-level File Sync resource holding sync groups and registered servers.',
      fields: [
        {
          path: 'syncGroups[].cloudEndpoints',
          meaning: 'Exactly one Azure file share per sync group.',
        },
        {
          path: 'syncGroups[].serverEndpoints',
          meaning:
            'Server paths; each with cloudTiering, volumeFreeSpacePercent and tierFilesOlderThanDays.',
        },
        {
          path: 'registeredServers',
          meaning: 'Windows Servers with the agent; each belongs to one sync service.',
        },
      ],
    },
  ],
  realWorldExample: {
    title: 'Retiring six branch file servers',
    story: [
      'A law firm had a file server in each of six offices, each with its own backup tapes and slightly different copies of the templates folder. Two servers were near end of support and the WAN links were too slow for everyone to use one central server.',
      'They created one Azure file share per department, a Storage Sync Service and a sync group per share, and installed the File Sync agent on new small Windows Server VMs in each office. Cloud tiering kept 20 percent of each volume free, so each office server cached only what it used.',
      'Azure Backup took daily share snapshots with 30-day retention, and share soft delete protected against someone deleting a whole share. When an office server failed a year later, a new server was registered, the endpoint was re-added, and the namespace appeared within minutes while file content was recalled on demand.',
    ],
  },
  yamlExamples: [
    {
      title: 'Create a share, snapshot it and enable soft delete',
      language: 'bash',
      code: `az storage share-rm create -g rg-storage --storage-account stcontosofiles \\
  --name projects --quota 1024 --access-tier Hot --enabled-protocols SMB

az storage account file-service-properties update -g rg-storage -n stcontosofiles \\
  --enable-delete-retention true --delete-retention-days 14

az storage share-rm snapshot -g rg-storage --storage-account stcontosofiles --name projects

az storage share-rm list -g rg-storage --storage-account stcontosofiles --include-snapshot -o table`,
    },
    {
      title: 'Mount an SMB share on Windows',
      language: 'powershell',
      explanation:
        'Tests port 445 first. With identity-based authentication, omit the credential and users connect with their own identity.',
      placeholders: ['<storage-account-key>'],
      code: `$account = 'stcontosofiles'
Test-NetConnection -ComputerName "$account.file.core.windows.net" -Port 445

$secure = ConvertTo-SecureString '<storage-account-key>' -AsPlainText -Force
$cred = New-Object System.Management.Automation.PSCredential("localhost\\$account", $secure)
New-PSDrive -Name Z -PSProvider FileSystem -Root "\\\\$account.file.core.windows.net\\projects" \`
  -Credential $cred -Persist`,
    },
    {
      title: 'Set up Azure File Sync with PowerShell',
      language: 'powershell',
      code: `# In Azure
$sss = New-AzStorageSyncService -ResourceGroupName 'rg-storage' -Name 'sync-contoso' -Location 'westeurope'
New-AzStorageSyncGroup -ParentObject $sss -Name 'projects'
$sa = Get-AzStorageAccount -ResourceGroupName 'rg-storage' -Name 'stcontosofiles'
New-AzStorageSyncCloudEndpoint -ResourceGroupName 'rg-storage' -StorageSyncServiceName 'sync-contoso' \`
  -SyncGroupName 'projects' -Name 'projects-cloud' \`
  -StorageAccountResourceId $sa.Id -AzureFileShareName 'projects'

# On the Windows Server, after installing the agent
$server = Register-AzStorageSyncServer -ParentObject $sss
New-AzStorageSyncServerEndpoint -ResourceGroupName 'rg-storage' -StorageSyncServiceName 'sync-contoso' \`
  -SyncGroupName 'projects' -Name 'fs-lon' -ServerResourceId $server.ResourceId \`
  -ServerLocalPath 'D:\\Projects' -CloudTiering -VolumeFreeSpacePercent 20 -TierFilesOlderThanDays 60`,
    },
  ],
  imperative: [
    {
      command:
        'az storage account create -n stcontosonfs -g rg-storage -l westeurope --kind FileStorage --sku Premium_LRS --https-only false',
      what: 'Creates a premium FileStorage account suitable for NFS shares.',
    },
    {
      command:
        'az storage share-rm create -g rg-storage --storage-account stcontosonfs --name data --quota 100 --enabled-protocols NFS --root-squash RootSquash',
      what: 'Creates a 100 GiB NFS 4.1 share with root squash.',
    },
    {
      command:
        'az storage share-rm update -g rg-storage --storage-account stcontosofiles --name projects --quota 2048',
      what: 'Increases the share quota.',
    },
    {
      command:
        'az storage share-rm restore -g rg-storage --storage-account stcontosofiles --name projects --deleted-version <deleted-version>',
      what: 'Restores a soft-deleted share. Find the version with az storage share-rm list --include-deleted.',
      placeholders: ['<deleted-version>'],
    },
    {
      command: 'az storagesync create -g rg-storage -n sync-contoso -l westeurope',
      what: 'Deploys a Storage Sync Service (the storagesync CLI extension installs on first use).',
    },
    {
      command:
        'az storagesync sync-group create -g rg-storage --storage-sync-service sync-contoso -n projects',
      what: 'Creates a sync group, which then gets a cloud endpoint.',
    },
  ],
  declarative: {
    steps: [
      'Declare the file service with share soft delete and the share with its quota and tier.',
      'Declare the Storage Sync Service and the sync group; the cloud endpoint references the share.',
      'Server registration happens on the server itself with the agent, so server endpoints are added after deployment.',
      'Deploy with `az deployment group create`.',
    ],
    code: [
      {
        title: 'File share, soft delete and File Sync scaffold in Bicep',
        language: 'bicep',
        code: `param accountName string
param location string = resourceGroup().location

resource sa 'Microsoft.Storage/storageAccounts@2023-05-01' existing = {
  name: accountName
}

resource fileSvc 'Microsoft.Storage/storageAccounts/fileServices@2023-05-01' = {
  parent: sa
  name: 'default'
  properties: {
    shareDeleteRetentionPolicy: { enabled: true, days: 14 }
  }
}

resource share 'Microsoft.Storage/storageAccounts/fileServices/shares@2023-05-01' = {
  parent: fileSvc
  name: 'projects'
  properties: {
    shareQuota: 1024
    accessTier: 'Hot'
    enabledProtocols: 'SMB'
  }
}

resource sync 'Microsoft.StorageSync/storageSyncServices@2022-09-01' = {
  name: 'sync-contoso'
  location: location
}

resource group 'Microsoft.StorageSync/storageSyncServices/syncGroups@2022-09-01' = {
  parent: sync
  name: 'projects'
}

resource cloudEp 'Microsoft.StorageSync/storageSyncServices/syncGroups/cloudEndpoints@2022-09-01' = {
  parent: group
  name: 'projects-cloud'
  properties: {
    storageAccountResourceId: sa.id
    azureFileShareName: share.name
    storageAccountTenantId: tenant().tenantId
  }
}`,
      },
    ],
  },
  verification: [
    {
      command:
        'az storage share-rm show -g rg-storage --storage-account stcontosofiles --name projects --query "{quota:shareQuota, tier:accessTier, protocol:enabledProtocols}"',
      what: 'Confirms quota, tier and protocol.',
    },
    {
      command:
        'az storage account file-service-properties show -g rg-storage -n stcontosofiles --query shareDeleteRetentionPolicy',
      what: 'Confirms share soft delete is enabled.',
    },
    {
      command:
        'Get-AzStorageSyncServerEndpoint -ResourceGroupName rg-storage -StorageSyncServiceName sync-contoso -SyncGroupName projects | Select-Object ServerLocalPath, CloudTiering, SyncStatus',
      what: 'Shows each server endpoint, whether tiering is on, and sync health.',
    },
  ],
  troubleshooting: [
    {
      command: 'Test-NetConnection -ComputerName stcontosofiles.file.core.windows.net -Port 445',
      what: 'A mount fails with system error 53 or 67: TcpTestSucceeded False means port 445 is blocked on the path.',
    },
    {
      command:
        'az storage account show -n stcontosofiles -g rg-storage --query "{default:networkRuleSet.defaultAction, public:publicNetworkAccess}"',
      what: 'Mount denied from inside Azure: check the storage firewall and private endpoint configuration.',
    },
    {
      command: 'Invoke-StorageSyncFileRecall -Path D:\\Projects -ThreadCount 8',
      what: 'Run on the server to recall tiered files locally, for example before disabling cloud tiering.',
    },
    {
      command:
        'Invoke-AzStorageSyncChangeDetection -ResourceGroupName rg-storage -StorageSyncServiceName sync-contoso -SyncGroupName projects -CloudEndpointName projects-cloud -Path "Templates"',
      what: 'Changes made directly in the Azure share have not reached servers: trigger change detection instead of waiting up to 24 hours.',
    },
  ],
  commonMistakes: [
    'Trying to create an NFS share on a standard GPv2 account. NFS needs a premium FileStorage account.',
    'Registering one server to two Storage Sync Services. A server can register with only one.',
    'Adding two cloud endpoints to a sync group. A sync group has exactly one cloud endpoint.',
    'Expecting changes made directly in the Azure file share to appear on servers immediately. Cloud change detection runs about once a day.',
    'Deleting a share and expecting its snapshots to survive. Snapshots are deleted with the share unless share soft delete is on.',
    'Forgetting that port 445 must be open outbound; many home and corporate networks block it.',
  ],
  examTips: [
    'File Sync hierarchy: Storage Sync Service, sync group, one cloud endpoint, many server endpoints, registered servers.',
    'Setup order questions: create the storage account and share, deploy the Storage Sync Service, create a sync group, install the agent, register the server, add server endpoints.',
    'Cloud tiering uses a volume free space policy and an optional date policy.',
    'NFS 4.1: premium FileStorage, Linux, network-based access control. SMB: all platforms, keys or identity-based auth, port 445.',
    'Share snapshots are read-only and share-level; restore single files or the whole share. Up to 200 snapshots per share.',
    'To protect against share deletion, enable soft delete for file shares; Azure Backup also adds a delete lock on the account.',
  ],
  summary: [
    'Azure Files provides managed SMB and NFS shares inside a storage account.',
    'Standard shares have transaction optimized, hot and cool tiers; premium shares are SSD and required for NFS.',
    'Share snapshots and share soft delete protect data; Azure Backup automates snapshots.',
    'Azure File Sync caches a share on Windows Servers, with cloud tiering to save local space.',
    'A sync group has one cloud endpoint and many server endpoints; each server registers to one sync service.',
  ],
  practice: [
    {
      id: 'az1-azure-files-p1',
      level: 'beginner',
      prompt:
        'Linux application servers need a POSIX-compliant shared file system over NFS 4.1. What storage account and share do you create?',
      answer:
        'A premium FileStorage account with an NFS-protocol file share, accessed over a private endpoint or service endpoint.',
    },
    {
      id: 'az1-azure-files-p2',
      level: 'intermediate',
      prompt:
        'You have deployed a Storage Sync Service and installed the agent on FS1. What two steps remain before FS1 syncs D:\\Data with a share?',
      answer:
        'Register FS1 with the Storage Sync Service, and add a server endpoint for D:\\Data in a sync group whose cloud endpoint is the share (create the sync group first if it does not exist).',
    },
    {
      id: 'az1-azure-files-p3',
      level: 'intermediate',
      prompt:
        'A user deleted a folder on a mapped Azure file share yesterday. Share snapshots are taken nightly. How do you recover it?',
      answer:
        'Open the folder Previous Versions (or browse the snapshot in the portal) and restore the folder from the snapshot taken before the deletion.',
    },
    {
      id: 'az1-azure-files-p4',
      level: 'advanced',
      prompt:
        'A branch server has a 500 GB volume and the share is 4 TB. How can the server keep working without running out of disk?',
      answer:
        'Enable cloud tiering on the server endpoint with a volume free space policy (for example 20 percent) and optionally a date policy. Cold files become pointers and are recalled on access.',
    },
  ],
  lab: {
    title: 'Build and protect a file share',
    scenario:
      'Create a share, mount it, protect it with snapshots and soft delete, and prepare a File Sync topology.',
    prerequisites: [
      'An Azure subscription',
      'Cloud Shell (Bash)',
      'Optional: a Windows Server VM to register with File Sync',
    ],
    tasks: [
      {
        instruction:
          'Create rg-files-lab and a Standard_LRS GPv2 account, and enable share soft delete for 7 days.',
      },
      {
        instruction:
          'Create an SMB share named team with a 100 GiB quota and upload a file into it.',
      },
      {
        instruction:
          'Take a share snapshot, then delete the file and restore it from the snapshot.',
        hint: 'Use az storage file copy start with the snapshot as the source, or the portal.',
      },
      { instruction: 'Delete the whole share, list deleted shares and restore it.' },
      {
        instruction:
          'Deploy a Storage Sync Service, a sync group and a cloud endpoint for the team share.',
      },
      {
        instruction:
          'Optionally install the agent on a Windows Server VM, register it and add a server endpoint with cloud tiering.',
      },
    ],
    solution: [
      {
        title: 'Lab commands',
        language: 'bash',
        code: `RG=rg-files-lab; LOC=westeurope; SA=fileslab$RANDOM
az group create -n $RG -l $LOC
az storage account create -n $SA -g $RG -l $LOC --sku Standard_LRS
az storage account file-service-properties update -g $RG -n $SA --enable-delete-retention true --delete-retention-days 7
KEY=$(az storage account keys list -n $SA -g $RG --query [0].value -o tsv)

az storage share-rm create -g $RG --storage-account $SA -n team --quota 100
echo plan > plan.txt
az storage file upload --account-name $SA --account-key $KEY -s team --source plan.txt

SNAP=$(az storage share-rm snapshot -g $RG --storage-account $SA -n team --query snapshotTime -o tsv)
az storage file delete --account-name $SA --account-key $KEY -s team -p plan.txt
az storage file copy start --account-name $SA --account-key $KEY \\
  --source-uri "https://$SA.file.core.windows.net/team/plan.txt?sharesnapshot=$SNAP" \\
  --source-account-key $KEY --destination-share team --destination-path plan.txt

az storage share-rm delete -g $RG --storage-account $SA -n team --include snapshots --yes
VER=$(az storage share-rm list -g $RG --storage-account $SA --include-deleted --query "[?name=='team'].version" -o tsv)
az storage share-rm restore -g $RG --storage-account $SA -n team --deleted-version $VER

az storagesync create -g $RG -n sync-lab -l $LOC
az storagesync sync-group create -g $RG --storage-sync-service sync-lab -n team
az storagesync sync-group cloud-endpoint create -g $RG --storage-sync-service sync-lab \\
  --sync-group-name team -n team-cloud --storage-account $SA --azure-file-share-name team`,
      },
    ],
    verification: [
      {
        command: 'az storage file list --account-name $SA --account-key $KEY -s team -o table',
        what: 'Shows plan.txt restored in the share.',
      },
      {
        command:
          'az storagesync sync-group cloud-endpoint list -g $RG --storage-sync-service sync-lab --sync-group-name team -o table',
        what: 'Shows the cloud endpoint pointing at the team share.',
      },
    ],
    cleanup: [
      {
        command: 'az group delete -n rg-files-lab --yes --no-wait',
        what: 'Deletes the account, share and sync service. Unregister any server first, or deletion of the sync service is blocked.',
      },
    ],
  },
  relatedTopicIds: ['az1-storage-accounts', 'az1-storage-security', 'az1-blob-storage'],
  docs: [
    {
      title: 'What is Azure Files?',
      url: 'https://learn.microsoft.com/azure/storage/files/storage-files-introduction',
    },
    {
      title: 'Overview of share snapshots',
      url: 'https://learn.microsoft.com/azure/storage/files/storage-snapshots-files',
    },
    {
      title: 'Enable soft delete on Azure file shares',
      url: 'https://learn.microsoft.com/azure/storage/files/storage-files-enable-soft-delete',
    },
    {
      title: 'Plan for an Azure File Sync deployment',
      url: 'https://learn.microsoft.com/azure/storage/file-sync/file-sync-planning',
    },
    {
      title: 'Cloud tiering overview',
      url: 'https://learn.microsoft.com/azure/storage/file-sync/file-sync-cloud-tiering-overview',
    },
    {
      title: 'NFS file shares in Azure Files',
      url: 'https://learn.microsoft.com/azure/storage/files/files-nfs-protocol',
    },
  ],
}
