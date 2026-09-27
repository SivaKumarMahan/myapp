import type { InterviewQuestion } from '../../../types'

/** Azure SQL Database and Azure Cosmos DB. */
export const azureStorageDatabaseQuestions: InterviewQuestion[] = [
  {
    id: 'itv-azst-8',
    level: 'intermediate',
    kind: 'open',
    prompt:
      'Azure SQL Database: explain DTU versus vCore, and where serverless and Hyperscale fit.',
    probing:
      'Purchasing models are a daily cost decision. They want to hear why vCore is usually preferred and what serverless actually does.',
    answer: [
      'The **DTU model** sells a bundled unit - a blend of CPU, memory and IO - in Basic, Standard and Premium tiers. It is simple, but you cannot scale CPU without also paying for IO, and you cannot use your existing SQL Server licences.',
      'The **vCore model** lets you choose compute and storage independently, shows you real hardware numbers you can compare with on-premises, and supports **Azure Hybrid Benefit** and reserved capacity. It has three service tiers: **General Purpose** (remote storage, the balanced default), **Business Critical** (local SSD, built-in readable replicas, lowest latency) and **Hyperscale** (a distributed storage architecture for very large databases with fast scaling and fast backups).',
      '**Serverless** is a compute option inside vCore. You set a minimum and maximum vCore range, the database scales within it automatically, and you are billed per second for what is used. On General Purpose it can also **auto-pause** after an idle period, so you pay only for storage while it sleeps.',
      'So: dev/test and spiky or intermittent workloads suit serverless; steady production suits provisioned vCore, ideally with reservations; very large or fast-growing databases suit Hyperscale; latency-sensitive OLTP suits Business Critical. I would only pick DTU for small, simple databases where the bundle is genuinely cheaper.',
    ],
    diagrams: [
      {
        kind: 'decision',
        title: 'Choosing an Azure SQL compute option',
        caption: 'Workload shape decides the purchasing model, not habit.',
        question: 'What does the workload look like?',
        branches: [
          {
            condition: 'Idle for long periods, dev/test',
            result: 'vCore serverless (auto-pause)',
            detail: 'Pay per second, cold start on resume',
            tone: 'accent',
          },
          {
            condition: 'Steady production OLTP',
            result: 'Provisioned General Purpose',
            detail: 'Add reservations and Hybrid Benefit',
            tone: 'success',
          },
          {
            condition: 'Low latency, readable replica',
            result: 'Business Critical',
            detail: 'Local SSD, built-in replicas',
          },
          {
            condition: 'Very large, growing fast',
            result: 'Hyperscale',
            detail: 'Distributed storage, fast restore',
          },
          {
            condition: 'Many small DBs with uneven load',
            result: 'Elastic pool',
            detail: 'Share one budget of compute',
          },
        ],
      },
    ],
    code: [
      {
        title: 'Serverless General Purpose database',
        language: 'bash',
        code: `az sql db create -g <rg> -s <server> -n orders \\
  --edition GeneralPurpose --compute-model Serverless \\
  --family Gen5 --min-capacity 0.5 --capacity 4 \\
  --auto-pause-delay 60 \\
  --zone-redundant false --backup-storage-redundancy Zone

# Check what it is doing right now
az sql db show -g <rg> -s <server> -n orders \\
  --query "{status:status, sku:currentSku.name, capacity:currentSku.capacity}"`,
        placeholders: ['<rg>', '<server>'],
      },
    ],
    deeper: [
      'Auto-pause has a real cost: the first connection after a pause gets an error or a delay while the database resumes, so client retry logic must handle it. Some features, such as long-term retention or geo-replication, also keep the database from pausing, so check before relying on the saving.',
      'Moving between General Purpose and Business Critical is an online operation but involves copying data, so it takes time proportional to size. Moving **to** Hyperscale is well supported; moving back out has restrictions, so treat it as a one-way door in planning.',
    ],
    traps: [
      'Assuming serverless is always cheaper. For a database busy all day, provisioned compute with a reservation usually wins.',
      'Forgetting that auto-pause means cold starts for the first user.',
    ],
    followUps: [
      'What happens to the first connection after an auto-pause?',
      'When is Business Critical worth the price?',
      'How do reservations and Azure Hybrid Benefit change the maths?',
    ],
    tags: ['azure sql', 'dtu', 'vcore', 'serverless', 'cost'],
  },
  {
    id: 'itv-azst-9',
    level: 'intermediate',
    kind: 'open',
    prompt: 'When would you use an elastic pool, and how do you size one?',
    probing:
      'Multi-tenant SaaS is the classic case. They want to hear about peak concurrency, per-database limits and the noisy-neighbour risk.',
    answer: [
      'An **elastic pool** is one budget of compute - eDTUs or vCores - shared by many databases on the same logical server. It makes sense when you have **many databases with low average use and peaks at different times**, which is the database-per-tenant SaaS pattern. Paying for each at its own peak would waste most of the money.',
      'Sizing is about **concurrent** peaks, not the sum of peaks. If a hundred tenant databases each peak at 2 vCores but only ten peak at once, the pool needs roughly 20 vCores plus headroom, not 200. You measure it from historical utilisation rather than guessing.',
      'You can set **per-database minimum and maximum** limits inside the pool. The maximum is the important one: it stops one tenant’s runaway report from consuming the entire pool and slowing every other tenant down.',
      'A pool is the wrong choice when databases are busy at the same time, or when one database is large and constantly busy - that one belongs in its own single database, and you can move databases in and out of pools online.',
    ],
    code: [
      {
        title: 'Create a pool with a per-database cap, and move a database in',
        language: 'bash',
        code: `az sql elastic-pool create -g <rg> -s <server> -n tenants-pool \\
  --edition GeneralPurpose --family Gen5 --capacity 16 \\
  --db-min-capacity 0 --db-max-capacity 4

az sql db update -g <rg> -s <server> -n tenant-042 --elastic-pool tenants-pool`,
        placeholders: ['<rg>', '<server>'],
      },
      {
        title: 'Which tenants are using the pool? (KQL on AzureMetrics)',
        language: 'text',
        code: `AzureMetrics
| where ResourceProvider == "MICROSOFT.SQL" and MetricName == "cpu_percent"
| where TimeGenerated > ago(7d)
| summarize p95_cpu = percentile(Average, 95) by Resource
| order by p95_cpu desc
| take 20`,
      },
    ],
    traps: [
      'Sizing the pool to the sum of every database’s peak.',
      'Leaving the per-database maximum at the pool size, so one tenant can starve the rest.',
    ],
    followUps: [
      'How would you detect a noisy neighbour in a pool?',
      'When would you move a tenant out of the pool?',
    ],
    tags: ['azure sql', 'elastic pool', 'saas', 'sizing'],
  },
  {
    id: 'itv-azst-10',
    level: 'advanced',
    kind: 'open',
    prompt:
      'Explain active geo-replication versus auto-failover groups in Azure SQL. How does the application reconnect after a failover?',
    probing:
      'Regional DR design. The key detail is the listener endpoint - failover groups let the connection string stay the same.',
    answer: [
      '**Active geo-replication** creates readable secondary databases, per database, on servers in other regions. Replication is asynchronous. Failover is manual and per database, and afterwards the app must point at a **different server name** - so you are editing connection strings in the middle of an outage.',
      '**Failover groups** sit on top of geo-replication and fail over a **group of databases together**. Crucially they provide two DNS listener endpoints: `<group>.database.windows.net` for read-write, which always points at the current primary, and `<group>.secondary.database.windows.net` for read-only. The app connects to the listener, so after a failover the connection string does not change - clients just reconnect.',
      'Failover can be **planned** (synchronises first, no data loss, used for drills and migrations) or **forced** (immediate, may lose the last few seconds of transactions). The group can be set to fail over automatically after a grace period, or be customer-managed.',
      'I would use failover groups for anything customer-facing, test failover regularly, and make sure the application tier has a matching plan - the database failing over is useless if the web tier in the secondary region is not ready.',
    ],
    deeper: [
      'Automatic failover in a failover group is driven by Microsoft’s own outage detection with a grace period of at least an hour, precisely to avoid failing over (and losing data) for a short blip. Many teams choose customer-managed failover so a human decides - which means the runbook and the permissions must be ready before the outage.',
      'Logins and users: contained database users travel with the database. Server-level logins do not - they must exist with the **same SID** on the secondary server, or users will fail to log in after failover even though the data is there.',
      'Clients cache DNS. Short connection timeouts plus retry logic that re-resolves the listener name are what make failover transparent in practice.',
    ],
    diagrams: [
      {
        kind: 'sequence',
        title: 'Failover through the listener endpoint',
        caption: 'The app keeps one connection string; DNS moves underneath it.',
        participants: [
          { id: 'app', label: 'Application' },
          { id: 'dns', label: 'Listener DNS' },
          { id: 'p', label: 'Primary (West Europe)' },
          { id: 's', label: 'Secondary (North Europe)' },
        ],
        messages: [
          { from: 'app', to: 'dns', label: 'resolve fog-orders.database' },
          { from: 'dns', to: 'app', label: 'points at primary', kind: 'return' },
          { from: 'app', to: 'p', label: 'read-write traffic' },
          { from: 'p', to: 's', label: 'async replication' },
          { from: 's', to: 'dns', label: 'failover: listener repointed' },
          { from: 'app', to: 'dns', label: 'reconnect, re-resolve' },
          { from: 'app', to: 's', label: 'read-write to new primary' },
        ],
      },
    ],
    code: [
      {
        title: 'Create a failover group and run a planned failover drill',
        language: 'bash',
        code: `az sql failover-group create -g <rg> -s sql-orders-weu \\
  -n fog-orders --partner-server sql-orders-neu \\
  --add-db orders payments --failover-policy Manual

# Planned failover: run against the SECONDARY server, no data loss
az sql failover-group set-primary -g <rg> -s sql-orders-neu -n fog-orders

# Forced failover during a real outage - may lose recent transactions
# az sql failover-group set-primary -g <rg> -s sql-orders-neu -n fog-orders --allow-data-loss`,
        placeholders: ['<rg>'],
      },
      {
        title: 'Connection string uses the listener, not a server',
        language: 'text',
        code: `Server=tcp:fog-orders.database.windows.net,1433;Database=orders;
Authentication=Active Directory Managed Identity;Encrypt=True;Connect Timeout=30;`,
      },
    ],
    traps: [
      'Pointing the app at the primary server name, which defeats the purpose of the listener.',
      'Forgetting server logins on the secondary, so failover "works" but nobody can log in.',
      'Only failing over the database and not the application tier.',
    ],
    followUps: [
      'What is the RPO of a failover group, and how would you measure it?',
      'Why would you choose manual rather than automatic failover?',
      'How does this differ for SQL Managed Instance?',
    ],
    tags: ['azure sql', 'geo-replication', 'failover groups', 'disaster recovery'],
  },
  {
    id: 'itv-azst-11',
    level: 'basic',
    kind: 'open',
    prompt: 'What is Azure Cosmos DB, and what is a Request Unit?',
    probing:
      'Foundations before the hard Cosmos questions. They want the RU as the currency of everything, not just "a NoSQL database".',
    answer: [
      'Cosmos DB is a fully managed, globally distributed NoSQL database. You pick an API - **NoSQL** (the native document API), MongoDB, Cassandra, Gremlin or Table - and Cosmos handles replication to any regions you add, automatic indexing, and single-digit-millisecond reads at any scale when the data model is right.',
      'The **Request Unit** is its currency. Every operation costs RUs based on the CPU, memory and IO it needs. As a rough anchor, a point read of a 1 KB item by id and partition key costs about 1 RU; writes cost more, and queries cost more again depending on how much they scan.',
      'You buy throughput as **RU/s**, either on a container or shared across a database. If you exceed it, requests are rejected with HTTP **429** and a retry-after hint. So in Cosmos, performance and cost are the same conversation: a better data model means fewer RUs per request, which means a smaller bill and fewer 429s.',
    ],
    code: [
      {
        title: 'Account, database and container with autoscale throughput',
        language: 'bash',
        code: `az cosmosdb create -g <rg> -n <account> \\
  --locations regionName=westeurope failoverPriority=0 isZoneRedundant=true \\
  --default-consistency-level Session

az cosmosdb sql database create -g <rg> -a <account> -n shop

az cosmosdb sql container create -g <rg> -a <account> -d shop -n orders \\
  --partition-key-path /customerId --max-throughput 4000`,
        placeholders: ['<rg>', '<account>'],
        explanation:
          'Autoscale with a 4000 RU/s maximum scales between 400 and 4000 RU/s and bills for the highest level reached each hour.',
      },
    ],
    traps: [
      'Treating Cosmos like a relational database and writing cross-partition queries for every request.',
      'Believing 429 means the service is down. It means you exceeded your provisioned RU/s.',
    ],
    followUps: [
      'How would you find out how many RUs a query costs?',
      'What happens when you exceed provisioned throughput?',
    ],
    tags: ['cosmos db', 'request units', 'fundamentals'],
  },
  {
    id: 'itv-azst-12',
    level: 'intermediate',
    kind: 'mcq',
    prompt:
      'A shopping cart app needs users to always see their own writes immediately, but it does not matter if other users see them a moment later. Which Cosmos DB consistency level is the best fit?',
    options: [
      { id: 'a', text: 'Strong' },
      { id: 'b', text: 'Bounded staleness' },
      { id: 'c', text: 'Session' },
      { id: 'd', text: 'Eventual' },
    ],
    correct: ['c'],
    probing:
      'Whether the candidate can map the five consistency levels to a real requirement and knows Session is the default for a reason.',
    answer: [
      '**Session** consistency guarantees read-your-own-writes, monotonic reads and consistent ordering **within a client session**, which is exactly this requirement. Other sessions may briefly see older data. It is the default level and the right choice for most user-facing apps, because it costs far less in latency and RUs than Strong.',
      'The five levels from strongest to weakest are **Strong, Bounded staleness, Session, Consistent prefix, Eventual**. Strong gives linearizability but reads cost more and it is not available with multi-region writes. Bounded staleness caps lag by versions or time. Eventual is cheapest but a user could refresh and not see the item they just added - which would feel broken in a cart.',
    ],
    diagrams: [
      {
        kind: 'flow',
        title: 'Cosmos DB consistency spectrum',
        caption: 'Moving down trades guarantees for latency, availability and RU cost.',
        nodes: [
          { label: 'Strong', detail: 'Linearizable, highest read cost', tone: 'warning' },
          { label: 'Bounded staleness', detail: 'Lag capped by time or versions' },
          { label: 'Session', detail: 'Read your own writes - the default', tone: 'success' },
          { label: 'Consistent prefix', detail: 'Never out of order, may lag' },
          { label: 'Eventual', detail: 'Cheapest, no ordering guarantee', tone: 'muted' },
        ],
      },
    ],
    code: [
      {
        title: 'Session tokens are per client - share them if the session spans instances',
        language: 'python',
        code: `from azure.cosmos import CosmosClient
from azure.identity import DefaultAzureCredential

client = CosmosClient("https://<account>.documents.azure.com", DefaultAzureCredential())
cart = client.get_database_client("shop").get_container_client("carts")

cart.upsert_item({"id": "cart-42", "customerId": "c-42", "items": ["sku-1"]})
token = cart.client_connection.last_response_headers["x-ms-session-token"]

# A different app instance serving the same user passes the token to read its write
item = cart.read_item("cart-42", partition_key="c-42", session_token=token)`,
        placeholders: ['<account>'],
      },
    ],
    traps: [
      'Choosing Strong "to be safe" and paying roughly double for reads with higher latency.',
      'Forgetting that session consistency is scoped to the session token; behind a load balancer with no token sharing, another instance may not see the write.',
    ],
    followUps: ['Why is Strong not available with multi-region writes?'],
    tags: ['cosmos db', 'consistency'],
  },
  {
    id: 'itv-azst-13',
    level: 'advanced',
    kind: 'open',
    prompt: 'How do you choose a partition key in Cosmos DB, and what goes wrong with a bad one?',
    probing:
      'The most consequential Cosmos design decision, and it is immutable. They want cardinality, even distribution, and matching the query pattern.',
    answer: [
      'Cosmos distributes data by hashing the partition key. All items with the same key value form a **logical partition**, and logical partitions are placed on **physical partitions**, each of which has its own slice of the container’s RU/s and storage. So the partition key decides both where data lives and where load lands.',
      'A good key has three properties. **High cardinality** - many distinct values, so data can spread. **Even distribution** of both storage and requests, so no single value becomes hot. And it **matches the most frequent queries**, so those queries can go to one partition instead of fanning out across all of them.',
      'A bad key shows up two ways. A **hot partition**: key on `status` or on today’s date and most traffic hits one value, so one physical partition throttles with 429s while the container as a whole looks under-used. Or **cross-partition queries** everywhere: key on something the queries do not filter on and every read fans out, multiplying RU cost.',
      'For an orders system I would key on `customerId` - high cardinality, and "get this customer’s orders" is the hot query. If some customers are huge, a **hierarchical partition key** such as tenantId then userId lets one tenant span many physical partitions while queries by tenant stay efficient.',
    ],
    deeper: [
      'A single logical partition has a storage limit (20 GB), so a key where one value can grow without bound - a single tenant id for a giant tenant - will eventually fail writes. Hierarchical partition keys or a synthetic key (tenantId plus a suffix) are the fixes.',
      'The partition key of a container **cannot be changed**. Fixing a bad one means creating a new container and migrating - with the change feed, a container copy job, or the data migration tools - which is why it deserves design time up front.',
      'Physical partitions each get an equal share of provisioned throughput. Adding RU/s to fix a hot partition is mostly wasted money: it increases every partition’s share, but the hot one still hits its ceiling first.',
    ],
    diagrams: [
      {
        kind: 'decision',
        title: 'Is this a good partition key?',
        caption: 'A key must spread storage and requests and serve the hot query.',
        question: 'How does the candidate key behave?',
        branches: [
          {
            condition: 'Few values, e.g. status or country',
            result: 'Hot partitions',
            detail: 'One physical partition takes all the load',
            tone: 'danger',
          },
          {
            condition: 'Current date or timestamp',
            result: 'Write hot spot',
            detail: 'Every write lands on today',
            tone: 'danger',
          },
          {
            condition: 'Unique id, queries by customer',
            result: 'Fan-out queries',
            detail: 'Even data, high RU per query',
            tone: 'warning',
          },
          {
            condition: 'customerId, queries by customer',
            result: 'Good key',
            detail: 'Spread out and single-partition reads',
            tone: 'success',
          },
        ],
      },
    ],
    code: [
      {
        title: 'Hierarchical partition key in Bicep',
        language: 'bicep',
        code: `resource orders 'Microsoft.DocumentDB/databaseAccounts/sqlDatabases/containers@2024-05-15' = {
  parent: shopDb
  name: 'orders'
  properties: {
    resource: {
      id: 'orders'
      partitionKey: {
        paths: [ '/tenantId', '/customerId' ]
        kind: 'MultiHash'
        version: 2
      }
    }
    options: { autoscaleSettings: { maxThroughput: 10000 } }
  }
}`,
      },
      {
        title: 'Find the hot partition (KQL, resource-specific diagnostics)',
        language: 'text',
        code: `CDBPartitionKeyRUConsumption
| where TimeGenerated > ago(1h)
| where CollectionName == "orders"
| summarize totalRU = sum(RequestCharge) by PartitionKey, PartitionKeyRangeId
| order by totalRU desc
| take 10`,
      },
    ],
    traps: [
      'Adding RU/s to fix a hot partition instead of fixing the key.',
      'Choosing `/id` as the key because it is unique, when every query filters by something else.',
      'Assuming the key can be changed later.',
    ],
    followUps: [
      'How would you migrate a container to a new partition key?',
      'What is a synthetic partition key?',
      'How do you know a query is cross-partition?',
    ],
    tags: ['cosmos db', 'partitioning', 'data modelling', 'performance'],
  },
  {
    id: 'itv-azst-14',
    level: 'intermediate',
    kind: 'open',
    prompt:
      'Cosmos DB offers provisioned manual throughput, autoscale and serverless. How do you choose, and how do you keep RU cost under control?',
    probing:
      'Cost design. They want the traffic shape to drive the choice, plus concrete RU-reducing techniques.',
    answer: [
      '**Manual provisioned** throughput is a fixed RU/s you pay for every hour. It is cheapest per RU when traffic is steady and predictable. **Autoscale** sets a maximum and scales between 10% of it and the maximum, billing for the highest level used each hour - ideal for traffic with peaks and troughs, at a higher unit price. **Serverless** has no provisioning at all; you pay per RU consumed, which suits low, bursty or development workloads, but it has per-container limits and is single-region.',
      'The rule of thumb: serverless for small and intermittent, autoscale for variable production traffic, manual when the load is flat enough that you would sit near the maximum anyway.',
      'Controlling cost is mostly about spending fewer RUs per request. **Point reads** by id and partition key instead of queries. A **partition key** that matches the hot query. A trimmed **indexing policy** - by default every property is indexed, so exclude paths you never filter on and writes get cheaper. **Smaller items** and projections that return only the fields needed. And the right **consistency level**, since Strong and Bounded staleness cost more per read.',
    ],
    code: [
      {
        title: 'Measure a query’s RU charge before optimising',
        language: 'python',
        code: `items = container.query_items(
    query="SELECT c.id, c.total FROM c WHERE c.customerId = @cid",
    parameters=[{"name": "@cid", "value": "c-42"}],
    partition_key="c-42",          # single-partition: no fan-out
)
list(items)
charge = container.client_connection.last_response_headers["x-ms-request-charge"]
print(f"RU charge: {charge}")`,
      },
      {
        title: 'Indexing policy that excludes everything not queried',
        language: 'json',
        code: `{
  "indexingMode": "consistent",
  "includedPaths": [
    { "path": "/customerId/?" },
    { "path": "/orderDate/?" },
    { "path": "/status/?" }
  ],
  "excludedPaths": [ { "path": "/*" } ]
}`,
      },
    ],
    traps: [
      'Leaving the default index-everything policy on a write-heavy container.',
      'Using serverless for a production workload that needs multiple regions.',
      'Using queries where a point read would do.',
    ],
    followUps: [
      'Why does trimming the indexing policy reduce write cost?',
      'What is the difference between database-level and container-level throughput?',
    ],
    tags: ['cosmos db', 'throughput', 'autoscale', 'serverless', 'cost'],
  },
]
