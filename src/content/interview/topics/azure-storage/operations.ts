import type { InterviewQuestion } from '../../../types'

/** Choosing a data store, backup strategy, and production storage incidents. */
export const azureStorageOperationsQuestions: InterviewQuestion[] = [
  {
    id: 'itv-azst-15',
    level: 'basic',
    kind: 'open',
    prompt:
      'How do you choose between Blob Storage, Azure Files, Azure SQL, Cosmos DB and the other data stores?',
    probing:
      'Architecture judgement. The weak answer names services; the strong one starts from the data shape and access pattern.',
    answer: [
      'I start from **what the data is and how it is accessed**, not from the service list.',
      '**Unstructured objects** - images, backups, logs, data lake files - go in **Blob Storage** (with hierarchical namespace for analytics). A **shared file system** that existing apps mount with SMB or NFS goes in **Azure Files**. Simple **queues** between components go in Storage Queues, or Service Bus when I need ordering, sessions or dead-lettering.',
      '**Relational data** with transactions, joins and a schema goes in **Azure SQL Database**, or **Azure Database for PostgreSQL or MySQL** if the team or the app is built for those engines. **SQL Managed Instance** is for lifting an on-premises SQL Server estate that needs instance-level features like SQL Agent or cross-database queries.',
      '**Global, low-latency, schema-flexible** data at high scale - user profiles, carts, IoT telemetry, anything keyed by an id - goes in **Cosmos DB**. For caching hot reads I add **Azure Cache for Redis**. And a simple key-attribute store with very low cost is **Table storage**.',
      'Then I check the non-functional requirements: consistency, RPO and RTO, multi-region writes, data residency, and cost at the expected volume. Those usually decide between the two plausible candidates.',
    ],
    diagrams: [
      {
        kind: 'decision',
        title: 'Picking an Azure data store',
        caption: 'Start from data shape and access pattern, then check RPO, latency and cost.',
        question: 'What shape is the data and how is it accessed?',
        branches: [
          {
            condition: 'Files and objects by URL',
            result: 'Blob Storage',
            detail: 'Tiers, lifecycle, data lake',
          },
          {
            condition: 'A mounted share (SMB or NFS)',
            result: 'Azure Files',
            detail: 'Lift-and-shift file servers',
          },
          {
            condition: 'Relational with transactions',
            result: 'Azure SQL or PostgreSQL',
            detail: 'Managed Instance for full SQL Server',
            tone: 'accent',
          },
          {
            condition: 'Global, keyed, massive scale',
            result: 'Cosmos DB',
            detail: 'Design the partition key first',
            tone: 'accent',
          },
          {
            condition: 'Hot reads that can be rebuilt',
            result: 'Azure Cache for Redis',
            detail: 'A cache, not the system of record',
          },
        ],
      },
    ],
    code: [
      {
        title: 'Blob storage as a data lake (hierarchical namespace)',
        language: 'bash',
        code: `az storage account create -n <account> -g <rg> -l westeurope \\
  --kind StorageV2 --sku Standard_ZRS --hns true

az storage fs create -n raw --account-name <account> --auth-mode login`,
        placeholders: ['<account>', '<rg>'],
      },
    ],
    traps: [
      'Choosing Cosmos DB for relational data with complex joins because it "scales".',
      'Using Redis as the system of record.',
      'Picking a store before knowing the access pattern.',
    ],
    followUps: [
      'When would you pick PostgreSQL over Azure SQL?',
      'Storage Queues or Service Bus - what decides it?',
    ],
    tags: ['architecture', 'data stores', 'design'],
  },
  {
    id: 'itv-azst-16',
    level: 'advanced',
    kind: 'open',
    prompt:
      'Design a backup and restore strategy for an app using Blob Storage, Azure SQL and Cosmos DB. What does each service give you, and what do you add?',
    probing:
      'Whether the candidate knows the built-in backup of each service, where its limits are, and that restores must be tested.',
    answer: [
      'I would start with the **RPO and RTO** the business needs per data set, then check what each service already does, then close the gaps.',
      '**Azure SQL** takes automated full, differential and log backups, giving **point-in-time restore** within a retention window you set (up to 35 days). For longer retention I add **long-term retention** policies - weekly, monthly, yearly copies kept for years - and choose geo-redundant backup storage so a **geo-restore** is possible if the region is lost. Restores always create a **new database**, so the runbook must include swapping names or connection strings.',
      '**Cosmos DB** has periodic backup by default, which you restore by opening a support request, or **continuous backup** with self-service point-in-time restore over a 7- or 30-day window. For production I would enable continuous mode.',
      '**Blob Storage** has operational protection built in - soft delete, versioning, point-in-time restore - but all of that lives inside the same account. **Azure Backup vaulted backup** for blobs copies data into a Backup vault, which is the protection against the account itself being compromised or deleted.',
      'Then the part people skip: **restore drills** on a schedule, measured against the RTO, and alerts on backup job failures. An untested backup is a hope, not a strategy.',
    ],
    deeper: [
      'Backups should be in a different **security boundary** from production. Backup vaults with soft delete, immutability and multi-user authorization (a resource guard owned by a separate team) stop a single compromised admin from deleting both the data and its backups.',
      'Cross-service consistency is the hard part. Restoring SQL to 10:00 and Cosmos to 10:00 gives you two stores at roughly the same moment, not a transactionally consistent snapshot. The app should tolerate small inconsistencies, or the restore procedure must reconcile them.',
      'Point-in-time restore of blobs cannot recover from deleting the storage account. Account deletion recovery exists only within a short window and is not guaranteed - which is why the CanNotDelete lock and vaulted backup matter.',
    ],
    code: [
      {
        title: 'Azure SQL: long-term retention and a point-in-time restore',
        language: 'bash',
        code: `az sql db ltr-policy set -g <rg> -s <server> -n orders \\
  --weekly-retention P8W --monthly-retention P12M \\
  --yearly-retention P7Y --week-of-year 1

# PITR always restores to a NEW database
az sql db restore -g <rg> -s <server> -n orders \\
  --dest-name orders-restored-0926 --time "2026-09-26T09:55:00Z"`,
        placeholders: ['<rg>', '<server>'],
      },
      {
        title: 'Cosmos DB: continuous backup and self-service restore',
        language: 'bash',
        code: `az cosmosdb update -g <rg> -n <account> --backup-policy-type Continuous \\
  --continuous-tier Continuous30Days

az cosmosdb restore -g <rg> --account-name <account> \\
  --target-database-account-name <account>-restored \\
  --restore-timestamp 2026-09-26T09:55:00Z --location westeurope`,
        placeholders: ['<rg>', '<account>'],
      },
    ],
    traps: [
      'Treating geo-redundancy as backup - corruption and deletes replicate too.',
      'Never having restored anything, so the RTO is a guess.',
      'Keeping the only backups in the same subscription with the same admins as production.',
    ],
    followUps: [
      'How would you protect backups from a compromised subscription owner?',
      'How long does a large Azure SQL point-in-time restore take?',
      'What does a restore drill look like?',
    ],
    tags: ['backup', 'disaster recovery', 'azure sql', 'cosmos db', 'blob'],
  },
  {
    id: 'itv-azst-17',
    level: 'advanced',
    kind: 'scenario',
    prompt:
      'An ingestion service writing to Blob Storage starts getting 503 Server Busy errors and timeouts during a nightly batch. Walk me through it.',
    probing:
      'Throttling diagnosis. They want metrics split by response type, awareness of scalability targets, and fixes that are not just "retry harder".',
    answer: [
      'A 503 **ServerBusy** from storage almost always means **throttling**: the account, or one partition of it, has hit a scalability target. So the first job is to confirm that and find **which** limit.',
      'I would open the account’s **Transactions** metric and split it by **ResponseType**. `ServerBusyError` and `ServerTimeoutError` climbing at batch time confirms throttling. Then look at **Ingress/Egress** and request rate against the account’s published targets - if the whole account is at its limit, that is one kind of problem; if the account is well below it, the load is concentrated on a **hot partition**.',
      'Blob storage partitions by account, container and blob name, using ranges of the name. A batch that writes names like `2026-09-26-000001`, `2026-09-26-000002` puts every write in the same range. The fix there is spreading the names - a short hash prefix - so writes land on many partitions.',
      'Other fixes, depending on the cause: make sure the SDK uses **exponential backoff with jitter** rather than a tight retry loop, which makes throttling worse; batch small writes into larger blocks; spread the job over more time or across **several storage accounts**; or move to **premium block blob** storage, which has higher transaction rates and lower latency for small-object workloads.',
      'Finally, I would put an alert on the throttling response types so the next occurrence is caught at the start of the batch, not by a failed report the next morning.',
    ],
    diagrams: [
      {
        kind: 'flow',
        title: 'Diagnosing storage throttling',
        caption:
          'Split by response type first; account limits and hot partitions have different fixes.',
        nodes: [
          { label: '503 ServerBusy in the app', detail: 'During a nightly batch', tone: 'danger' },
          {
            label: 'Split Transactions by ResponseType',
            detail: 'ServerBusyError confirms throttling',
            tone: 'accent',
          },
          {
            label: 'Account near its targets?',
            detail: 'Compare request rate and ingress',
            branch: { label: 'Yes: spread across accounts', detail: 'Or premium block blob' },
          },
          {
            label: 'Below target: hot partition',
            detail: 'Sequential blob names in one range',
          },
          {
            label: 'Hash-prefix names, backoff with jitter',
            detail: 'Then alert on throttling types',
            tone: 'success',
          },
        ],
      },
    ],
    code: [
      {
        title: 'Throttled requests over time (KQL)',
        language: 'text',
        code: `StorageBlobLogs
| where TimeGenerated > ago(24h)
| where StatusCode in (500, 503)
| summarize throttled = count() by bin(TimeGenerated, 5m), StatusText, OperationName
| render timechart`,
      },
      {
        title: 'Which name prefixes take the load?',
        language: 'text',
        code: `StorageBlobLogs
| where TimeGenerated > ago(24h) and OperationName == "PutBlob"
| extend prefix = substring(tostring(split(Uri, "?")[0]), 0, 80)
| summarize writes = count(), busy = countif(StatusCode == 503) by prefix
| order by writes desc
| take 20`,
      },
      {
        title: 'Metric alert on server-busy responses',
        language: 'bash',
        code: `az monitor metrics alert create -g <rg> -n storage-throttling \\
  --scopes <storage-account-id> \\
  --condition "total Transactions > 100 where ResponseType includes ServerBusyError" \\
  --window-size 5m --evaluation-frequency 1m \\
  --action <action-group-id>`,
        placeholders: ['<rg>', '<storage-account-id>', '<action-group-id>'],
      },
    ],
    deeper: [
      'Different services signal throttling differently, and it is worth naming them: Blob and Queue return **503 ServerBusy** or 500 OperationTimedOut; Cosmos DB, Key Vault and ARM return **429 Too Many Requests** with a retry-after header; Azure SQL returns resource-limit errors such as 10928/10929 or 40501.',
      'If a single blob is the hot spot - thousands of readers hitting one config file - the fix is a CDN or a cache in front of it, because a single blob has its own throughput target no matter how the account is laid out.',
    ],
    traps: [
      'Adding aggressive retries with no backoff, which amplifies the throttling.',
      'Upgrading redundancy or tier without finding out which limit is being hit.',
      'Treating 503 from storage as an Azure outage and opening a sev-A ticket before checking the metrics.',
    ],
    followUps: [
      'How is a hot partition different from hitting the account limit?',
      'How do the SDK retry policies behave by default?',
      'What would you change if a single blob were the hot spot?',
    ],
    tags: ['scenario', 'throttling', 'blob', 'troubleshooting', 'performance'],
  },
  {
    id: 'itv-azst-18',
    level: 'advanced',
    kind: 'scenario',
    prompt:
      'After a marketing campaign, the orders API returns intermittent 429s from Cosmos DB, but the portal shows the container using only 30% of its RU/s. What is going on?',
    probing:
      'The classic hot-partition trap. The candidate must know that throughput is divided across physical partitions.',
    answer: [
      'Container-level utilisation averages across **physical partitions**. Provisioned RU/s is divided evenly among them, so if one partition is at 100% and the others are idle, the container average can read 30% while that one partition returns 429s. That is almost certainly what is happening.',
      'To confirm, I would look at the **Normalized RU Consumption** metric split by **PartitionKeyRangeId** - one range pinned near 100% is the smoking gun - and then the partition key RU diagnostics to find **which key value** is hot. After a campaign, a common culprit is a key like `campaignId` or a single big tenant where one value suddenly takes most of the traffic.',
      'Short term: the SDK already retries 429s with the retry-after hint, so the question is whether the retries are exhausting. Raising RU/s buys time but is inefficient because it raises every partition equally. If a small set of queries is causing it, making them point reads or adding a cache relieves the hot partition immediately.',
      'Long term the fix is the **data model**: a partition key that spreads the load - a hierarchical key, or a synthetic key that adds a suffix to the hot value so its writes fan out across partitions.',
    ],
    deeper: [
      'Some 429s are healthy. A small rate of throttled requests that succeed on retry means you are using what you pay for. The alarm is 429s that exhaust retries and surface as failures, or a rising p99 latency.',
      'Autoscale does not fix hot partitions either - it scales the whole container, and the maximum is still divided across physical partitions.',
    ],
    code: [
      {
        title: 'Throttled requests by partition (KQL)',
        language: 'text',
        code: `CDBDataPlaneRequests
| where TimeGenerated > ago(1h)
| where StatusCode == 429
| summarize throttled = count() by PartitionKeyRangeId, OperationName, bin(TimeGenerated, 5m)
| order by throttled desc`,
      },
      {
        title: 'Synthetic key to spread a hot value',
        language: 'python',
        code: `import random

SPREAD = 10  # how many partitions one hot campaign can use

def order_partition_key(order: dict) -> str:
    # Hot campaigns get a random suffix so writes fan out; reads query all suffixes.
    return f"{order['campaignId']}-{random.randint(0, SPREAD - 1)}"`,
      },
    ],
    traps: [
      'Concluding "we have 70% headroom, it cannot be throughput".',
      'Doubling RU/s and calling it fixed.',
      'Disabling SDK retries to make the errors "clearer".',
    ],
    followUps: [
      'How do physical partitions split, and does that help here?',
      'What is the read-side cost of a synthetic partition key?',
    ],
    tags: ['scenario', 'cosmos db', '429', 'partitioning', 'troubleshooting'],
  },
  {
    id: 'itv-azst-19',
    level: 'advanced',
    kind: 'scenario',
    prompt:
      'West Europe has a major outage. Your app uses a GZRS storage account and an Azure SQL failover group. Walk me through the data side of the response.',
    probing:
      'Regional DR execution. They want the data-loss decision made consciously, using Last Sync Time and replication lag, and the order of operations.',
    answer: [
      'First, confirm it is really regional and not us - **Azure Service Health** for the region and the affected services - and decide with the incident lead whether to fail over or wait. Failing over storage is **not free**: it may lose data and it leaves the account locally redundant afterwards. If Microsoft expects recovery in an hour and the RTO is four hours, waiting may be the right call.',
      'If we fail over: for **SQL**, the failover group listener makes it straightforward. If the primary is reachable at all I would prefer a planned failover; in a real outage it is a **forced failover** with possible loss of the last seconds of transactions. The app reconnects through the listener with no config change.',
      'For **storage**, I would check the account’s **Last Sync Time** first. Everything written after that timestamp is lost in an unplanned failover, and I want that number recorded for the post-incident review. Then initiate the customer-managed failover. DNS for the account endpoint is repointed to North Europe, so clients keep using the same URLs once the failover finishes.',
      'After recovery: re-enable geo-redundancy on the storage account (it will be LRS in the new primary), decide whether and when to fail back, and reconcile - anything written after Last Sync Time may need to be replayed from upstream sources.',
    ],
    diagrams: [
      {
        kind: 'flow',
        title: 'Regional failover, data tier',
        caption:
          'The decision to fail over comes before any command, and data loss is measured, not assumed.',
        nodes: [
          {
            label: 'Confirm via Service Health',
            detail: 'Regional, not our deployment',
            tone: 'accent',
          },
          {
            label: 'Decide: wait or fail over',
            detail: 'Expected recovery versus RTO',
            branch: { label: 'Wait', detail: 'Degrade gracefully, keep data' },
          },
          { label: 'SQL: failover group', detail: 'Forced if primary unreachable' },
          {
            label: 'Storage: note Last Sync Time',
            detail: 'Writes after it will be lost',
            tone: 'warning',
          },
          { label: 'Storage: customer-managed failover', detail: 'Same endpoints, new region' },
          { label: 'Re-protect and plan failback', detail: 'Account is now LRS', tone: 'success' },
        ],
      },
    ],
    code: [
      {
        title: 'Storage failover commands',
        language: 'bash',
        code: `# How much data would we lose?
az storage account show -n <account> -g <rg> --expand geoReplicationStats \\
  --query geoReplicationStats.lastSyncTime -o tsv

# Unplanned failover to the secondary region (takes a while; endpoints stay the same)
az storage account failover -n <account> -g <rg> --yes

# Afterwards the account is LRS in the new primary - re-enable geo-redundancy
az storage account update -n <account> -g <rg> --sku Standard_GZRS`,
        placeholders: ['<account>', '<rg>'],
      },
      {
        title: 'Forced SQL failover through the group',
        language: 'bash',
        code: `az sql failover-group set-primary -g <rg> -s <secondary-server> \\
  -n fog-orders --allow-data-loss`,
        placeholders: ['<rg>', '<secondary-server>'],
      },
    ],
    traps: [
      'Failing over storage without checking Last Sync Time, so nobody knows what was lost.',
      'Forgetting the account is LRS after failover and running unprotected for weeks.',
      'Failing over data and leaving the compute tier in the dead region.',
    ],
    followUps: [
      'When would you choose not to fail over?',
      'How does a planned storage failover differ from an unplanned one?',
      'How would you rehearse this without an outage?',
    ],
    tags: ['scenario', 'disaster recovery', 'failover', 'region outage'],
  },
  {
    id: 'itv-azst-20',
    level: 'intermediate',
    kind: 'scenario',
    prompt:
      'Users report the app is slow and Azure SQL Database shows CPU at 100% since this morning’s release. How do you investigate?',
    probing:
      'Practical database triage. The strong answer finds the query that regressed before reaching for a bigger SKU.',
    answer: [
      'A sudden CPU jump right after a release points at **a query**, not at organic growth. So scaling up is a way to buy time, not the diagnosis.',
      'I would open **Query Performance Insight** or query **Query Store** directly for the top CPU consumers since the release, and compare them with the previous day. Usually one query stands out - a new query without a supporting index, or an existing one whose **plan changed**, for example a scan replacing a seek because of a new parameter pattern.',
      'Fixes, depending on what I find: if a plan regressed, **force the last good plan** in Query Store as an immediate mitigation; if an index is missing, add it (the missing-index recommendations and automatic tuning help); if the new code is inherently expensive, roll back the release. Scaling up the vCores is reasonable as a temporary mitigation while this happens, because it is an online change.',
      'Afterwards: enable **automatic tuning** for plan correction, and add a CPU and DTU alert plus a Query Store check to the release process so a regression shows up in staging.',
    ],
    code: [
      {
        title: 'Top CPU queries in the last three hours (T-SQL via Query Store)',
        language: 'text',
        code: `SELECT TOP 10
    q.query_id, p.plan_id,
    SUM(rs.count_executions) AS executions,
    SUM(rs.avg_cpu_time * rs.count_executions) / 1000 AS total_cpu_ms,
    MAX(qt.query_sql_text) AS sql_text
FROM sys.query_store_runtime_stats rs
JOIN sys.query_store_plan p ON p.plan_id = rs.plan_id
JOIN sys.query_store_query q ON q.query_id = p.query_id
JOIN sys.query_store_query_text qt ON qt.query_text_id = q.query_text_id
WHERE rs.last_execution_time > DATEADD(hour, -3, SYSUTCDATETIME())
GROUP BY q.query_id, p.plan_id
ORDER BY total_cpu_ms DESC;

-- Mitigate a plan regression by forcing the previous good plan
EXEC sp_query_store_force_plan @query_id = 4711, @plan_id = 12;`,
      },
      {
        title: 'Temporary scale-up while you fix it',
        language: 'bash',
        code: `az sql db update -g <rg> -s <server> -n orders --capacity 8
az sql db show-usage -g <rg> -s <server> -n orders -o table`,
        placeholders: ['<rg>', '<server>'],
      },
    ],
    traps: [
      'Scaling up and closing the ticket without finding the query.',
      'Rebuilding every index as a reflex.',
      'Ignoring that the plan change could come from parameter sensitivity, not the code.',
    ],
    followUps: [
      'What is parameter sniffing and how does Query Store help?',
      'What does automatic tuning actually do?',
    ],
    tags: ['scenario', 'azure sql', 'performance', 'query store'],
  },
  {
    id: 'itv-azst-21',
    level: 'basic',
    kind: 'mcq',
    prompt:
      'A user requests a blob that was moved to the Archive tier last month. What happens when the application tries to download it?',
    options: [
      { id: 'a', text: 'It downloads normally but more slowly than from Hot' },
      { id: 'b', text: 'The read fails until the blob is rehydrated to an online tier' },
      { id: 'c', text: 'Azure automatically rehydrates it and returns it within a minute' },
      { id: 'd', text: 'The blob has been deleted because Archive is a recycle bin' },
    ],
    correct: ['b'],
    probing: 'A fact that is easy to half-know and painful to discover in production.',
    answer: [
      'Archive is an **offline** tier. You can read the blob’s metadata, but reading its content fails until you rehydrate it to Hot, Cool or Cold - either by changing its tier or by copying it to a new blob in an online tier. Standard-priority rehydration can take up to around 15 hours; high priority is much faster but costs more.',
      'So archive is for data you almost never need and can wait for, such as compliance copies. Anything an application might serve to a user belongs in an online tier, even if it is Cold.',
    ],
    code: [
      {
        title: 'Check the tier and rehydration status',
        language: 'bash',
        code: `az storage blob show --auth-mode login --account-name <account> \\
  -c archive -n 2025/invoice-991.pdf \\
  --query "{tier:properties.blobTier, rehydrate:properties.rehydrationStatus}"

az storage blob set-tier --auth-mode login --account-name <account> \\
  -c archive -n 2025/invoice-991.pdf --tier Hot --rehydrate-priority Standard`,
        placeholders: ['<account>'],
      },
    ],
    traps: ['Archiving anything a user might request interactively.'],
    followUps: ['How would you get notified when rehydration completes?'],
    tags: ['blob', 'access tiers', 'archive'],
  },
]
