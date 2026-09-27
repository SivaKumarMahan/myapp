import type { Topic } from '../../../types'

export const storageServices: Topic = {
  id: 'az9-storage-services',
  title: 'Storage: accounts, redundancy, tiers, services and migration',
  domainId: 'az9-architecture',
  difficulty: 'intermediate',
  estimatedMinutes: 35,
  order: 4,
  tags: [
    'storage account',
    'redundancy',
    'lrs',
    'zrs',
    'grs',
    'gzrs',
    'access tiers',
    'blob',
    'azure files',
    'azcopy',
    'azure migrate',
    'data box',
  ],
  oneLiner:
    'How Azure stores data durably, how many copies it keeps and where, how access tiers trade cost for speed, and how to move data in.',
  explanation: [
    'Almost all Azure data services start with a **storage account**: a uniquely named container that gives you an address on the internet for your data, such as https://mystore.blob.core.windows.net. One account can hold four data services: **Blob** storage for unstructured objects, **Azure Files** for SMB and NFS file shares, **Queue** storage for simple messages, and **Table** storage for NoSQL key-attribute data. **Managed disks** for VMs are built on the same platform.',
    'Every storage account keeps several copies of your data, chosen by its **redundancy** setting. **LRS** keeps three copies in one datacenter. **ZRS** keeps three copies across three availability zones in the region. **GRS** adds an asynchronous copy to the paired secondary region (LRS there), and **GZRS** combines ZRS in the primary region with a copy in the secondary. The **RA-** variants (RA-GRS, RA-GZRS) also let you read from the secondary region at any time.',
    'Blob data can sit in **access tiers**. **Hot** is for frequently used data, **Cool** for data kept at least 30 days and read less often, **Cold** for at least 90 days, and **Archive** for at least 180 days. Storage gets cheaper as you go down, while reading gets more expensive. Archive is offline: a blob must be rehydrated to an online tier before you can read it, which can take hours.',
    'To move data into Azure you can use **AzCopy** (a command-line copy tool), **Azure Storage Explorer** (a desktop GUI), **Azure File Sync** (to cache Azure file shares on Windows Servers), **Azure Migrate** (a hub for discovering, assessing and migrating servers, databases and apps) and **Azure Data Box** (a physical device Microsoft ships to you for large offline transfers).',
  ],
  whyItMatters: [
    'Redundancy options are one of the most tested AZ-900 topics. You must know how many copies each option keeps, where they live, and which options survive a zone or region outage.',
    'Access tiers are a direct cost lever. Leaving years of rarely read logs in the Hot tier is one of the most common ways organisations overspend on storage.',
    'Migration options come up as scenario questions: moving hundreds of terabytes over a slow link is a Data Box problem, not an AzCopy one.',
  ],
  howItWorks: [
    'The storage account name must be globally unique, 3 to 24 characters, lowercase letters and numbers only, because it becomes part of each service endpoint URL.',
    'The main account type is **Standard general-purpose v2**, which supports all four services and every redundancy option. Premium account types (block blobs, file shares, page blobs) use SSDs for low latency and support fewer redundancy options.',
    'With LRS and ZRS, writes are copied synchronously within the primary region. With GRS and GZRS, data is also replicated asynchronously to the secondary region, so after a regional disaster a small amount of the most recent data may not have arrived yet. Without RA-, the secondary is only readable after a failover.',
    'The default access tier (Hot or Cool, and Cold where supported) is set on the account; individual blobs can be moved to any tier, including Archive. Early deletion charges apply if a blob leaves Cool, Cold or Archive before its minimum period.',
    '**Azure Files** shares can be mounted by Windows, Linux and macOS clients. Azure File Sync installs an agent on Windows Server, keeps the full data set in Azure and can tier rarely used files so the local server acts as a fast cache.',
    'AzCopy copies or synchronises files between local storage and Azure, or between storage accounts. Its sync is one direction only. Storage Explorer uses AzCopy under the hood for transfers and adds a graphical interface for browsing and managing data.',
  ],
  diagrams: [
    {
      kind: 'nested',
      title: 'Where each redundancy option keeps copies',
      caption:
        'LRS survives a disk or rack failure, ZRS a datacenter failure, GRS and GZRS a regional failure.',
      root: {
        label: 'Geography',
        tone: 'muted',
        children: [
          {
            label: 'Primary region',
            tone: 'accent',
            children: [
              { label: 'LRS: 3 copies in 1 datacenter', detail: 'Cheapest, no zone protection' },
              { label: 'ZRS: 3 copies across 3 zones', detail: 'Survives a zone outage' },
            ],
          },
          {
            label: 'Secondary (paired) region',
            children: [
              {
                label: 'GRS or GZRS: 3 more copies (LRS)',
                detail: 'Asynchronous; RA- makes it readable',
                tone: 'success',
              },
            ],
          },
        ],
      },
    },
    {
      kind: 'decision',
      title: 'Choosing a migration tool',
      caption:
        'Pick by data size, network speed and whether you are moving files or whole servers.',
      question: 'What are you moving into Azure?',
      branches: [
        {
          condition: 'Files, scripted, over the network',
          result: 'AzCopy',
          detail: 'Command-line copy and one-way sync',
        },
        {
          condition: 'Files, with a graphical tool',
          result: 'Azure Storage Explorer',
          detail: 'Desktop app built on AzCopy',
        },
        {
          condition: 'Whole servers, databases or apps',
          result: 'Azure Migrate',
          detail: 'Discover, assess, then migrate',
          tone: 'accent',
        },
        {
          condition: 'Terabytes over a slow or no link',
          result: 'Azure Data Box',
          detail: 'Ship a physical device to Microsoft',
          tone: 'success',
        },
        {
          condition: 'Keep file servers but back them with Azure',
          result: 'Azure File Sync',
          detail: 'Cache Azure Files on Windows Server',
        },
      ],
    },
  ],
  keyObjects: [
    {
      kind: 'Storage account (Microsoft.Storage/storageAccounts)',
      apiVersion: '2023-05-01',
      purpose: 'The top-level container and namespace for Blob, Files, Queue and Table data.',
      fields: [
        {
          path: 'name',
          meaning: 'Globally unique, 3-24 lowercase letters and numbers.',
          required: true,
        },
        { path: 'kind', meaning: 'StorageV2 for standard general-purpose v2.', required: true },
        {
          path: 'sku.name',
          meaning: 'Performance plus redundancy, e.g. Standard_LRS, Standard_GZRS.',
          required: true,
        },
        {
          path: 'properties.accessTier',
          meaning: 'Default blob tier: Hot or Cool (Cold where supported).',
        },
        { path: 'properties.minimumTlsVersion', meaning: 'Set to TLS1_2 to refuse older clients.' },
        {
          path: 'properties.allowBlobPublicAccess',
          meaning: 'false blocks anonymous blob access.',
        },
      ],
    },
    {
      kind: 'Blob container and blob',
      purpose: 'Containers group blobs inside an account; each blob can have its own access tier.',
      fields: [
        { path: 'container name', meaning: 'Lowercase, groups blobs like a top-level folder.' },
        { path: 'blob tier', meaning: 'Hot, Cool, Cold or Archive for that individual blob.' },
      ],
    },
    {
      kind: 'Storage services and endpoints',
      purpose: 'The four data services in an account, each with its own endpoint.',
      fields: [
        { path: 'blob.core.windows.net', meaning: 'Blob: objects such as images, backups, logs.' },
        { path: 'file.core.windows.net', meaning: 'Files: managed SMB and NFS shares.' },
        { path: 'queue.core.windows.net', meaning: 'Queue: messages between app components.' },
        { path: 'table.core.windows.net', meaning: 'Table: schemaless NoSQL key-attribute data.' },
      ],
    },
  ],
  realWorldExample: {
    title: 'A media archive that saved most of its storage bill',
    story: [
      'A broadcaster uploaded every finished programme to a single Hot-tier storage account with LRS. After two years the bill had grown enormous, yet most videos were never watched again after the first month.',
      'They changed the account to GZRS for the new content that mattered most, and added a lifecycle management rule: move blobs to Cool after 30 days, Cold after 90 and Archive after a year. The monthly storage cost fell dramatically, and the rare request for an old programme simply waited a few hours for rehydration.',
      'For the initial backlog of several hundred terabytes held on tape and NAS, uploading over the office link would have taken months. They ordered Azure Data Box devices, copied the data locally and shipped them back, then used AzCopy for the ongoing daily uploads.',
    ],
  },
  yamlExamples: [
    {
      title: 'A secure general-purpose v2 account in Bicep',
      language: 'bicep',
      code: `param location string = resourceGroup().location
param accountName string

resource sa 'Microsoft.Storage/storageAccounts@2023-05-01' = {
  name: accountName
  location: location
  kind: 'StorageV2'
  sku: {
    name: 'Standard_ZRS'
  }
  properties: {
    accessTier: 'Hot'
    minimumTlsVersion: 'TLS1_2'
    allowBlobPublicAccess: false
    supportsHttpsTrafficOnly: true
  }
}

resource blobSvc 'Microsoft.Storage/storageAccounts/blobServices@2023-05-01' = {
  parent: sa
  name: 'default'
}

resource container 'Microsoft.Storage/storageAccounts/blobServices/containers@2023-05-01' = {
  parent: blobSvc
  name: 'reports'
}`,
      placeholders: ['accountName'],
    },
    {
      title: 'A lifecycle rule that tiers down old blobs (JSON)',
      language: 'json',
      explanation:
        'Applied with az storage account management-policy create. Moves blobs to cheaper tiers as they age.',
      code: `{
  "rules": [
    {
      "enabled": true,
      "name": "tier-down-logs",
      "type": "Lifecycle",
      "definition": {
        "filters": { "blobTypes": ["blockBlob"], "prefixMatch": ["logs/"] },
        "actions": {
          "baseBlob": {
            "tierToCool": { "daysAfterModificationGreaterThan": 30 },
            "tierToArchive": { "daysAfterModificationGreaterThan": 180 },
            "delete": { "daysAfterModificationGreaterThan": 730 }
          }
        }
      }
    }
  ]
}`,
    },
  ],
  imperative: [
    {
      command:
        'az storage account create --name <uniquename> --resource-group rg-az900-storage --location westeurope --sku Standard_ZRS --kind StorageV2 --access-tier Hot --min-tls-version TLS1_2 --allow-blob-public-access false',
      what: 'Creates a zone-redundant general-purpose v2 account with safe defaults.',
      placeholders: ['<uniquename>'],
    },
    {
      command:
        'az storage account update --name <uniquename> --resource-group rg-az900-storage --sku Standard_RAGZRS',
      what: 'Changes the redundancy to read-access geo-zone-redundant storage.',
      placeholders: ['<uniquename>'],
    },
    {
      command:
        'az storage blob upload --account-name <uniquename> --container-name reports --name q1.csv --file ./q1.csv --auth-mode login',
      what: 'Uploads a file using your Entra ID sign-in instead of an account key.',
      placeholders: ['<uniquename>'],
    },
    {
      command:
        'az storage blob set-tier --account-name <uniquename> --container-name reports --name q1.csv --tier Archive --auth-mode login',
      what: 'Moves a single blob to the Archive tier.',
      placeholders: ['<uniquename>'],
    },
    {
      command:
        'azcopy copy "./exports" "https://<uniquename>.blob.core.windows.net/reports" --recursive',
      what: 'Copies a local folder to a container after signing in with azcopy login.',
      placeholders: ['<uniquename>'],
    },
  ],
  declarative: {
    steps: [
      'Choose redundancy from the failures you must survive: rack (LRS), zone (ZRS), region (GRS or GZRS).',
      'Set a default access tier and a lifecycle policy for data that ages.',
      'Describe the account and containers in Bicep with secure defaults such as TLS 1.2 and no public blob access.',
      'Deploy with az deployment group create and verify the SKU and tier.',
    ],
    code: [
      {
        title: 'Deploy the storage template',
        language: 'bash',
        code: `az group create -n rg-az900-storage -l westeurope
az deployment group create \\
  --resource-group rg-az900-storage \\
  --template-file storage.bicep \\
  --parameters accountName=<uniquename>`,
        placeholders: ['<uniquename>'],
      },
    ],
  },
  verification: [
    {
      command:
        'az storage account show --name <uniquename> --resource-group rg-az900-storage --query "{sku:sku.name, tier:accessTier, tls:minimumTlsVersion}"',
      what: 'Confirms redundancy, default tier and minimum TLS version.',
      expected: '{ "sku": "Standard_ZRS", "tier": "Hot", "tls": "TLS1_2" }',
      placeholders: ['<uniquename>'],
    },
    {
      command:
        'az storage blob show --account-name <uniquename> --container-name reports --name q1.csv --auth-mode login --query properties.blobTier',
      what: 'Shows the current tier of one blob.',
      placeholders: ['<uniquename>'],
    },
    {
      command: 'az storage account check-name --name <uniquename>',
      what: 'Checks whether a storage account name is available globally.',
      expected: '"nameAvailable": true',
      placeholders: ['<uniquename>'],
    },
  ],
  troubleshooting: [
    {
      command:
        'az role assignment create --assignee <your-upn> --role "Storage Blob Data Contributor" --scope <storage-account-id>',
      what: 'Fixes AuthorizationPermissionMismatch when using --auth-mode login: Owner on the account is not a data-plane role.',
      placeholders: ['<your-upn>', '<storage-account-id>'],
    },
    {
      command:
        'az storage blob set-tier --account-name <uniquename> --container-name reports --name q1.csv --tier Hot --rehydrate-priority Standard --auth-mode login',
      what: 'Starts rehydrating an archived blob that returns an error when read.',
      placeholders: ['<uniquename>'],
    },
    {
      command:
        'az storage account show --name <uniquename> --query "{primary:statusOfPrimary, secondary:statusOfSecondary}"',
      what: 'Checks primary and secondary region availability for a geo-redundant account.',
      placeholders: ['<uniquename>'],
    },
  ],
  commonMistakes: [
    'Assuming GRS lets you read from the secondary at any time. Only RA-GRS and RA-GZRS do; plain GRS needs a failover first.',
    'Thinking Archive blobs can be read immediately. They must be rehydrated first, which can take hours.',
    'Believing you can set Archive as the default tier of an account. Archive is set per blob.',
    'Using AzCopy or an internet upload for hundreds of terabytes on a slow link when Data Box would be much faster.',
    'Mixing up Azure Files (managed file shares) with Azure File Sync (caching those shares on Windows Server).',
  ],
  examTips: [
    'LRS: 3 copies, one datacenter. ZRS: 3 copies, 3 zones. GRS: LRS plus LRS in the secondary region. GZRS: ZRS plus LRS in the secondary region.',
    'RA- in front of GRS or GZRS means read access to the secondary region without failing over.',
    'Hot, Cool, Cold, Archive: cheaper to store, more expensive and slower to read. Archive is offline.',
    'Blob for unstructured objects, Files for shares, Queue for messages, Table for NoSQL key-attribute data, Disks for VMs.',
    'AzCopy is command line, Storage Explorer is GUI, Azure Migrate assesses and migrates servers, Data Box is physical shipping.',
  ],
  summary: [
    'A storage account provides a globally unique namespace for Blob, Files, Queue and Table.',
    'Redundancy options trade cost for protection against rack, zone or region failures.',
    'Access tiers lower storage cost for data that is read rarely.',
    'AzCopy, Storage Explorer and File Sync move and manage file data.',
    'Azure Migrate and Data Box cover server migration and large offline transfers.',
  ],
  practice: [
    {
      id: 'az9-storage-services-p1',
      level: 'beginner',
      prompt: 'Which redundancy option keeps three copies in one datacenter and is the cheapest?',
      answer: 'Locally redundant storage (LRS).',
    },
    {
      id: 'az9-storage-services-p2',
      level: 'intermediate',
      prompt:
        'An app must keep reading its data even while the primary region is completely unavailable, without waiting for a failover. Which redundancy options satisfy that?',
      answer: 'RA-GRS or RA-GZRS, which allow reads from the secondary region at any time.',
    },
    {
      id: 'az9-storage-services-p3',
      level: 'intermediate',
      prompt:
        'Compliance requires keeping audit files for seven years, and they are almost never read. Which blob tier minimises storage cost, and what is the catch?',
      answer:
        'The Archive tier. The catch is that blobs are offline and must be rehydrated, taking hours, before they can be read, and early deletion charges apply within 180 days.',
    },
    {
      id: 'az9-storage-services-p4',
      level: 'advanced',
      prompt:
        'You must move 300 TB from an office with a slow internet link into Azure within a few weeks. What should you use and why?',
      answer:
        'Azure Data Box. Copying that volume over a slow link could take months, whereas Data Box devices are filled locally and shipped to a Microsoft datacenter.',
    },
  ],
  lab: {
    title: 'Create a storage account, upload a blob and change its tier',
    scenario:
      'Create a secure ZRS account, grant yourself a data role, upload a file with Entra ID authentication, move it to Cool and then change the account redundancy.',
    prerequisites: ['An Azure subscription', 'Azure Cloud Shell (Bash)'],
    tasks: [
      {
        instruction: 'Create resource group rg-az900-storage and a Standard_ZRS StorageV2 account.',
      },
      {
        instruction: 'Assign yourself Storage Blob Data Contributor on the account.',
        hint: 'Role assignments can take a minute or two to take effect.',
      },
      { instruction: 'Create a container named reports and upload a small text file to it.' },
      { instruction: 'Move the blob to the Cool tier and confirm the change.' },
      { instruction: 'Change the account redundancy to Standard_GZRS and confirm the new SKU.' },
    ],
    solution: [
      {
        title: 'Storage lab steps',
        language: 'bash',
        code: `RG=rg-az900-storage
SA=<uniquename>
az group create -n $RG -l westeurope
az storage account create -n $SA -g $RG -l westeurope \\
  --sku Standard_ZRS --kind StorageV2 --min-tls-version TLS1_2 --allow-blob-public-access false

ME=$(az ad signed-in-user show --query userPrincipalName -o tsv)
SAID=$(az storage account show -n $SA -g $RG --query id -o tsv)
az role assignment create --assignee "$ME" --role "Storage Blob Data Contributor" --scope "$SAID"

echo "hello azure" > hello.txt
az storage container create --account-name $SA -n reports --auth-mode login
az storage blob upload --account-name $SA -c reports -n hello.txt -f hello.txt --auth-mode login
az storage blob set-tier --account-name $SA -c reports -n hello.txt --tier Cool --auth-mode login

az storage account update -n $SA -g $RG --sku Standard_GZRS`,
        placeholders: ['<uniquename>'],
      },
    ],
    verification: [
      {
        command:
          'az storage blob show --account-name <uniquename> -c reports -n hello.txt --auth-mode login --query properties.blobTier -o tsv',
        what: 'Confirms the blob is now in the Cool tier.',
        expected: 'Cool',
        placeholders: ['<uniquename>'],
      },
      {
        command:
          'az storage account show -n <uniquename> -g rg-az900-storage --query sku.name -o tsv',
        what: 'Confirms the redundancy change.',
        expected: 'Standard_GZRS',
        placeholders: ['<uniquename>'],
      },
    ],
    cleanup: [
      {
        command: 'az group delete -n rg-az900-storage --yes --no-wait',
        what: 'Deletes the storage account and its data.',
      },
    ],
  },
  relatedTopicIds: ['az9-core-architecture', 'az9-networking-services', 'az9-compute-services'],
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
      title: 'Access tiers for blob data',
      url: 'https://learn.microsoft.com/azure/storage/blobs/access-tiers-overview',
    },
    {
      title: 'Get started with AzCopy',
      url: 'https://learn.microsoft.com/azure/storage/common/storage-use-azcopy-v10',
    },
    {
      title: 'About Azure Migrate',
      url: 'https://learn.microsoft.com/azure/migrate/migrate-services-overview',
    },
  ],
}
