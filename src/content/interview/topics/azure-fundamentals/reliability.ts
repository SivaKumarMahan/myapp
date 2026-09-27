import type { InterviewQuestion } from '../../../types'

/** SLAs, availability options, the Well-Architected Framework and multi-region design. */
export const azureFundamentalsReliabilityQuestions: InterviewQuestion[] = [
  {
    id: 'itv-azf-6',
    level: 'basic',
    kind: 'mcq',
    prompt:
      'A web app on App Service (SLA 99.95%) depends on an Azure SQL Database (SLA 99.99%). Both must be up for the app to work. What is the composite SLA, roughly?',
    options: [
      { id: 'a', text: '99.99%, because the higher SLA wins' },
      { id: 'b', text: '99.95%, because the lower SLA is the bottleneck' },
      { id: 'c', text: 'About 99.94%, because serial dependencies multiply' },
      { id: 'd', text: '99.97%, the average of the two services' },
    ],
    correct: ['c'],
    probing:
      'Whether you understand that chaining dependencies lowers availability, and can do the arithmetic in your head.',
    answer: [
      'When two components are **in series** - both must work - you multiply their availabilities: 0.9995 x 0.9999 is about 0.9994, so roughly **99.94%**. Every extra hard dependency you add pulls the number down, never up.',
      'The way to raise it is **redundancy in parallel**: two independent instances where either can serve. Then the chance both fail is (1 - A) squared, so two 99.95% regions behind a global load balancer give far more than 99.95% - as long as the failover itself works and the regions really fail independently.',
      'In an interview I would also say that the composite SLA is a **financial commitment**, not a prediction. It tells you what Microsoft credits when it misses, and it ignores your own code, deployments and configuration, which cause most outages.',
    ],
    code: [
      {
        title: 'The arithmetic, both ways',
        language: 'python',
        code: `app, sql = 0.9995, 0.9999

serial = app * sql                       # both must be up
print(f"serial:   {serial:.4%}")         # 99.9400%

two_regions = 1 - (1 - serial) ** 2      # either region can serve
print(f"parallel: {two_regions:.6%}")    # 99.999964% (in theory)

minutes_per_month = 30 * 24 * 60
print(f"allowed downtime: {(1 - serial) * minutes_per_month:.0f} min/month")  # ~26`,
      },
    ],
    traps: [
      'Adding a dependency and assuming the SLA stays the same.',
      'Quoting a parallel SLA without mentioning that failover has to be tested to be real.',
    ],
    followUps: [
      'How many minutes a month is 99.9% versus 99.99%?',
      'Why does the theoretical multi-region number overstate reality?',
    ],
    tags: ['sla', 'composite sla', 'reliability'],
  },
  {
    id: 'itv-azf-7',
    level: 'intermediate',
    kind: 'open',
    prompt:
      'How do SLA, SLO, RTO and RPO differ? And what VM availability options would you pick for a 99.99% target?',
    probing:
      'Vocabulary under pressure, then mapping it to concrete Azure options. Mixing up RTO and RPO is an instant red flag.',
    answer: [
      'An **SLA** is Microsoft’s contractual promise per service, backed by service credits. An **SLO** is the target **you** set for your own workload, measured from your users’ point of view - "99.9% of checkout requests succeed in under 800 ms". Your SLO should be informed by the SLAs underneath, but it is yours.',
      '**RTO**, recovery time objective, is how long you can be down after a disaster. **RPO**, recovery point objective, is how much data you can afford to lose, measured in time. A nightly backup has an RPO of up to 24 hours; synchronous zone-redundant storage has an RPO of effectively zero.',
      'For VMs the options step up. A **single VM** with premium SSD or better has an SLA around 99.9%. An **availability set** spreads VMs across fault and update domains in one datacenter, around 99.95%. VMs spread across **availability zones** give 99.99%, because each zone is a separate facility.',
      'So for 99.99% I would run at least two VMs, ideally in a **Virtual Machine Scale Set with Flexible orchestration spread across three zones**, behind a zone-redundant Standard Load Balancer, with a zone-redundant data tier. Two VMs in one zone cannot give you 99.99%, whatever the load balancer does.',
    ],
    diagrams: [
      {
        kind: 'decision',
        title: 'Pick the VM availability option',
        caption: 'Each step up protects against a bigger failure domain.',
        question: 'What failure must the workload survive?',
        branches: [
          {
            condition: 'Host reboot, can tolerate short downtime',
            result: 'Single VM, premium disks',
            detail: 'About 99.9%',
            tone: 'muted',
          },
          {
            condition: 'Rack or planned maintenance',
            result: 'Availability set',
            detail: 'Fault and update domains, about 99.95%',
          },
          {
            condition: 'A whole datacenter',
            result: 'Zones, via VMSS Flex',
            detail: 'About 99.99%',
            tone: 'accent',
          },
          {
            condition: 'A whole region',
            result: 'Second region plus failover',
            detail: 'Async replication, RPO above zero',
            tone: 'warning',
          },
        ],
      },
    ],
    code: [
      {
        title: 'A zone-spread scale set in Bicep',
        language: 'bicep',
        code: `resource vmss 'Microsoft.Compute/virtualMachineScaleSets@2024-07-01' = {
  name: 'vmss-web-prod'
  location: location
  zones: [ '1', '2', '3' ]
  sku: { name: 'Standard_D4s_v5', capacity: 3 }
  properties: {
    orchestrationMode: 'Flexible'
    platformFaultDomainCount: 1
    zoneBalance: true
    // virtualMachineProfile omitted for brevity
  }
}`,
      },
    ],
    traps: [
      'Swapping RTO and RPO.',
      'Claiming an availability set protects against a datacenter outage. It is one datacenter.',
      'Quoting the Microsoft SLA as the workload’s SLO.',
    ],
    followUps: [
      'How would you measure an SLO in Azure Monitor?',
      'What is the RPO of geo-redundant storage failover?',
    ],
    tags: ['sla', 'slo', 'rto', 'rpo', 'availability'],
  },
  {
    id: 'itv-azf-8',
    level: 'intermediate',
    kind: 'open',
    prompt:
      'What is the Azure Well-Architected Framework, and how have you actually used it on a project?',
    probing:
      'Everyone can list the pillars. They want to hear tradeoffs and a concrete use - a review, a finding you fixed - not a recital.',
    answer: [
      'The Well-Architected Framework is Microsoft’s set of design principles for workloads, organised into five pillars: **Reliability, Security, Cost Optimization, Operational Excellence and Performance Efficiency**. Each pillar has design principles, checklists and tradeoffs, and there are service guides that apply them to specific services like AKS or App Service.',
      'The important word is **tradeoffs**. The pillars pull against each other. Adding a second region improves reliability and costs roughly double. Private endpoints improve security and add DNS complexity that hurts operational excellence. The framework’s value is making those tradeoffs explicit and deliberate instead of accidental.',
      'Practically, I have used the **Well-Architected Review** assessment at the start of a project and again before go-live, and fed Azure Advisor recommendations - which are grouped by the same pillars - into the backlog. A typical finding: a production App Service running a single instance on a non-zone-redundant plan, which we fixed by moving to a zone-redundant Premium plan with at least three instances.',
      'It is different from the **Cloud Adoption Framework**, which is about how an organisation adopts Azure - strategy, landing zones, governance. WAF is about how one workload is built well.',
    ],
    code: [
      {
        title: 'Advisor findings grouped by pillar',
        language: 'bash',
        code: `# Advisor categories map onto the WAF pillars
az advisor recommendation list --category HighAvailability \\
  --query "[].{impact:impact, resource:impactedValue, problem:shortDescription.problem}" -o table

az advisor recommendation list --category Cost -o table
az advisor recommendation list --category Security -o table`,
      },
    ],
    traps: [
      'Reciting five pillars with no tradeoff and no example.',
      'Confusing the Well-Architected Framework with the Cloud Adoption Framework.',
    ],
    followUps: [
      'Give me a tradeoff between security and operational excellence you made.',
      'How does Advisor relate to the framework?',
    ],
    tags: ['well-architected', 'waf', 'advisor', 'design'],
  },
  {
    id: 'itv-azf-9',
    level: 'advanced',
    kind: 'open',
    prompt:
      'Design a multi-region active-passive deployment for a web app with a SQL backend. What fails over, how, and what do you test?',
    probing:
      'Senior design. They want the data tier to lead the answer, a clear failover trigger, and honesty about RPO and the cost of a warm standby.',
    answer: [
      'I start from the **data**, because stateless compute is easy to duplicate and data is not. For Azure SQL I would use a **failover group** between the primary and secondary regions. It replicates asynchronously, gives the app a stable read-write listener name that follows the primary, and supports planned and forced failover. That means an RPO of seconds rather than zero, which the business has to accept explicitly.',
      'The compute tier - App Service or Container Apps - is deployed to both regions by the **same pipeline and the same Bicep**, with the secondary scaled down but running. Secrets and configuration live in regional Key Vaults and App Configuration stores so the secondary does not depend on the primary region to start.',
      'In front I put **Azure Front Door** with both origins, the primary at higher priority, and health probes on an endpoint that checks the app’s real dependencies. Front Door moves traffic automatically when the primary is unhealthy. The database failover I would usually keep **manual or customer-managed**, because an automatic data failover during a partial outage can cause more damage than it prevents.',
      'Then I would **test it**: a scheduled game day that fails the SQL group over, confirms Front Door shifts, measures actual RTO against the target, and fails back. An untested DR plan is a hypothesis. I would also check quotas in the secondary region ahead of time, because a failover that cannot allocate VMs or cores is not a failover.',
    ],
    diagrams: [
      {
        kind: 'flow',
        title: 'Regional failover, in order',
        caption: 'Data first, then traffic. Front Door alone cannot fail over a database.',
        nodes: [
          {
            label: 'Primary region unhealthy',
            detail: 'Service Health plus probes',
            tone: 'danger',
          },
          { label: 'Decide to fail over', detail: 'Runbook, named owner' },
          {
            label: 'SQL failover group to secondary',
            detail: 'Listener name follows primary',
            tone: 'warning',
          },
          { label: 'Scale out secondary compute', detail: 'Quota checked in advance' },
          { label: 'Front Door routes to secondary', detail: 'Priority origin now unhealthy' },
          { label: 'Verify, then plan failback', tone: 'success' },
        ],
      },
    ],
    code: [
      {
        title: 'Failover group and a manual failover',
        language: 'bash',
        code: `az sql failover-group create \\
  --name fog-shop --resource-group rg-shop-uks \\
  --server sql-shop-uks --partner-server sql-shop-ukw \\
  --partner-resource-group rg-shop-ukw \\
  --add-db shopdb --failover-policy Manual

# App connection string uses the listener, never a server name:
#   Server=tcp:fog-shop.database.windows.net,1433;Database=shopdb;Authentication=Active Directory Default

# Game day: planned failover to the secondary
az sql failover-group set-primary --name fog-shop \\
  --resource-group rg-shop-ukw --server sql-shop-ukw`,
      },
      {
        title: 'Front Door origins with priority',
        language: 'bicep',
        code: `resource primary 'Microsoft.Cdn/profiles/originGroups/origins@2024-02-01' = {
  parent: originGroup
  name: 'uksouth'
  properties: {
    hostName: 'app-shop-uks.azurewebsites.net'
    originHostHeader: 'app-shop-uks.azurewebsites.net'
    priority: 1
    weight: 1000
  }
}

resource secondary 'Microsoft.Cdn/profiles/originGroups/origins@2024-02-01' = {
  parent: originGroup
  name: 'ukwest'
  properties: {
    hostName: 'app-shop-ukw.azurewebsites.net'
    originHostHeader: 'app-shop-ukw.azurewebsites.net'
    priority: 2
    weight: 1000
  }
}`,
      },
    ],
    deeper: [
      'Health probes should hit a **deep health endpoint** that exercises the database and critical dependencies, but must not cascade: if the probe fails whenever a non-critical dependency is slow, Front Door will flap traffic between regions.',
      'Active-active removes the "is failover working" question because both regions serve all the time, but needs a data tier that accepts writes in both - Cosmos DB with multi-region writes, or application-level partitioning. It is a bigger design change than people expect.',
      'Consider **what depends on the primary region implicitly**: a single Entra app registration is global and fine, but a single Key Vault, a single Log Analytics workspace or a single container registry in the primary region are all hidden single points of failure.',
    ],
    traps: [
      'Designing compute failover and forgetting the database.',
      'Automatic database failover on a flaky probe.',
      'Hard-coding a server name instead of the failover group listener.',
      'Never testing the failover.',
    ],
    followUps: [
      'When would you choose active-active instead?',
      'What is the RPO of a SQL failover group and why is it not zero?',
      'How do you stop Front Door flapping between regions?',
    ],
    tags: ['disaster recovery', 'multi-region', 'front door', 'sql', 'design'],
  },
  {
    id: 'itv-azf-10',
    level: 'advanced',
    kind: 'multi',
    prompt: 'Which statements about Azure region pairs are true? Select all that apply.',
    options: [
      {
        id: 'a',
        text: 'Planned platform updates are rolled out to one region of a pair at a time',
      },
      {
        id: 'b',
        text: 'In a broad outage, recovery of one region in each pair is prioritised',
      },
      { id: 'c', text: 'You can choose which region your region is paired with' },
      {
        id: 'd',
        text: 'Geo-redundant storage replicates to the paired region by default',
      },
      {
        id: 'e',
        text: 'Every Azure region has a pair, so pairs are always the right DR target',
      },
    ],
    correct: ['a', 'b', 'd'],
    probing:
      'Knowing the actual guarantees of a pair, and not over-selling them. Several newer regions have no pair at all.',
    answer: [
      'Three are true. Microsoft **staggers updates** across the two regions of a pair so a bad update does not hit both, **prioritises recovering** one region of each pair in a large outage, and services with built-in geo-replication - most visibly **GRS and GZRS storage** - replicate to the paired region.',
      'You **cannot choose** a pair; Microsoft defines them. And **not every region has one** - several newer regions ship with availability zones and no pair. So a pair is a useful default where it exists, but the right DR region is chosen on latency, service availability, capacity and data residency.',
    ],
    deeper: [
      'For services where you control replication - SQL failover groups, Cosmos DB, your own Bicep deployed twice - you can use **any** secondary region. The pair only matters for services whose geo-replication is fixed to it.',
      'Some pairs cross geographies for capacity reasons, which can matter for residency. Check the pair before assuming data stays in the country.',
    ],
    code: [
      {
        title: 'Look up the pair before designing around it',
        language: 'bash',
        code: `az account list-locations \\
  --query "[?name=='uksouth'].{region:name, pair:metadata.pairedRegion[0].name, geography:metadata.geography}" -o table`,
      },
    ],
    traps: ['Assuming every region has a pair, or that the pair is always in the same country.'],
    followUps: ['Your primary region has no pair. How do you choose the DR region?'],
    tags: ['region pairs', 'disaster recovery', 'storage'],
  },
]
