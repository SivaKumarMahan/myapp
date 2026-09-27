import type { Topic } from '../../../types'

export const kqlAnalysis: Topic = {
  id: 'az4-kql-analysis',
  title: 'Analysing telemetry with KQL',
  domainId: 'az4-instrumentation',
  difficulty: 'advanced',
  estimatedMinutes: 40,
  order: 2,
  tags: [
    'kql',
    'log-analytics',
    'summarize',
    'join',
    'bin',
    'render',
    'performance',
    'cpu',
    'memory',
    'telemetry',
  ],
  oneLiner:
    'Write Kusto Query Language queries that filter, shape, aggregate, join and chart logs, and use them to read CPU, memory, disk and network indicators and application and pipeline telemetry.',
  explanation: [
    '**Kusto Query Language (KQL)** is the read-only query language of Log Analytics, Application Insights, Azure Resource Graph, Microsoft Sentinel and Azure Data Explorer. A query starts with a **table** and pipes rows through **operators** with the `|` character, each operator taking the previous result as input. Reading left to right is exactly how the data flows.',
    'A handful of operators do most of the work. `where` filters rows. `project` chooses (and renames) columns, `extend` adds calculated columns. `summarize` aggregates with functions such as `count()`, `avg()`, `percentile()`, `dcount()` and `make_set()`, grouped `by` columns. `bin(TimeGenerated, 5m)` rounds timestamps into buckets so you can aggregate over time. `order by` or `sort by`, `top` and `take` limit results. `join` combines two tables on a key, and `render timechart` (or barchart, piechart) draws the result.',
    'Time matters in every query. Filter early with `where TimeGenerated > ago(1h)` (Application Insights classic tables use `timestamp`), because it is the biggest performance lever and the portal time picker only applies when the query does not set its own time filter. `ago()`, `now()`, `startofday()` and `between` handle time ranges, and strings are compared with `==` (case-sensitive), `=~` (case-insensitive), `has` (whole-term, fast, uses the index) and `contains` (substring, slower).',
    'For infrastructure, VM insights with the Azure Monitor Agent writes to **InsightsMetrics** (Namespace and Name such as Processor UtilizationPercentage, Memory AvailableMB, LogicalDisk FreeSpacePercentage, Network ReadBytesPerSecond), and custom DCR counters land in **Perf**. **Heartbeat** shows agent health. For applications, **requests**, **dependencies**, **exceptions** and **traces** (or AppRequests and friends in the workspace) hold telemetry. For pipelines, Azure DevOps Analytics exposes pipeline run data through OData and Power BI, and you can also send custom run events to a workspace; GitHub Actions data is available through the API and can be forwarded.',
  ],
  whyItMatters: [
    'The objective literally says "interrogate logs by using basic KQL queries" and "inspect infrastructure performance indicators, including CPU, memory, disk and network". Expect to read a query and predict what it returns, or pick the operator that completes one.',
    'Every log alert, workbook and Sentinel rule is a KQL query. If you can write KQL, you can build your own alerts on exactly the signal that matters rather than relying on defaults.',
    'During an incident, the ability to go from "the site is slow" to "the 95th percentile of the Orders API rose after the 14:05 deployment on two of six instances" in a few queries is what shortens time to restore service.',
  ],
  howItWorks: [
    'Shape of a typical query: table, time filter, other filters, extend or project, summarize, order, render. Putting `where` filters before `summarize` and `join` reduces the data that later operators process.',
    '`summarize` returns one row per distinct combination of the `by` columns. Grouping by `bin(TimeGenerated, 5m)` produces a time series; adding a second column (for example Computer) produces one series per machine, which `render timechart` draws as multiple lines.',
    '`join kind=inner` returns matching rows from both sides; `kind=leftouter` keeps all left rows; the default `innerunique` removes duplicate keys on the left first, which surprises people. Put the smaller table on the left. `lookup` is a cheaper alternative when enriching from a small dimension table.',
    '`let` binds a name to a value, a table expression or a function so a long query stays readable, for example `let threshold = 80;` or `let slowOps = requests | where duration > 1000;`.',
    'Performance indicators: CPU is usually `InsightsMetrics | where Namespace == "Processor" and Name == "UtilizationPercentage"`; memory uses `Memory AvailableMB`; disk uses `LogicalDisk FreeSpacePercentage` and transfers; network uses `Network ReadBytesPerSecond` and `WriteBytesPerSecond`. With Perf, filter `ObjectName` and `CounterName`, for example "Processor" and "% Processor Time".',
    'Application telemetry: `requests` has name, duration (milliseconds), resultCode, success, operation_Id and cloud_RoleName; `dependencies` has target, type, duration and success. Joining requests and dependencies on `operation_Id` lets you attribute slow requests to specific downstream calls. `percentiles(duration, 50, 95, 99)` is better than `avg` for latency.',
  ],
  diagrams: [
    {
      kind: 'flow',
      title: 'Data flowing through a KQL query',
      caption:
        'Each pipe hands a smaller, more shaped table to the next operator. Filter first, aggregate later.',
      nodes: [
        { label: 'Table', detail: 'InsightsMetrics', tone: 'accent' },
        { label: 'where', detail: 'Time range and Processor namespace', arrowLabel: 'filter' },
        { label: 'extend or project', detail: 'Add or pick columns' },
        { label: 'summarize by bin', detail: 'avg(Val) per 5m per Computer' },
        { label: 'render timechart', detail: 'One line per machine', tone: 'success' },
      ],
    },
    {
      kind: 'decision',
      title: 'Picking the right operator',
      caption: 'Most exam items hinge on choosing between similar operators.',
      question: 'What do you need to do to the rows?',
      branches: [
        { condition: 'Keep only some rows', result: 'where' },
        { condition: 'Choose or rename columns', result: 'project' },
        { condition: 'Add a calculated column, keep the rest', result: 'extend' },
        {
          condition: 'Aggregate into groups or time buckets',
          result: 'summarize with bin',
          tone: 'accent',
        },
        {
          condition: 'Combine rows from two tables on a key',
          result: 'join',
          detail: 'Or lookup for small tables',
        },
      ],
    },
  ],
  keyObjects: [
    {
      kind: 'Log Analytics table: InsightsMetrics',
      purpose:
        'Performance data from VM insights and Container insights collected by the Azure Monitor Agent.',
      fields: [
        { path: 'TimeGenerated', meaning: 'When the sample was collected.' },
        { path: 'Computer', meaning: 'Machine name.' },
        { path: 'Namespace', meaning: 'Processor, Memory, LogicalDisk, Network.' },
        {
          path: 'Name',
          meaning:
            'UtilizationPercentage, AvailableMB, FreeSpacePercentage, ReadBytesPerSecond and so on.',
        },
        { path: 'Val', meaning: 'The numeric value.' },
        { path: 'Tags', meaning: 'JSON with extra dimensions such as disk mount or total memory.' },
      ],
    },
    {
      kind: 'Application Insights table: requests (AppRequests)',
      purpose: 'One row per incoming request handled by an instrumented service.',
      fields: [
        { path: 'timestamp (TimeGenerated)', meaning: 'Request start.' },
        { path: 'name (Name)', meaning: 'Operation name, e.g. GET /orders/{id}.' },
        { path: 'duration (DurationMs)', meaning: 'Milliseconds.' },
        { path: 'resultCode, success', meaning: 'HTTP status and success flag.' },
        {
          path: 'operation_Id (OperationId)',
          meaning: 'Trace id shared with dependencies and traces.',
        },
        { path: 'cloud_RoleName (AppRoleName)', meaning: 'Which service emitted it.' },
      ],
    },
    {
      kind: 'Core KQL operators',
      purpose: 'The operators most likely to appear on the exam.',
      fields: [
        { path: 'where', meaning: 'Filter rows by a predicate.' },
        { path: 'project / extend', meaning: 'Select columns / add computed columns.' },
        { path: 'summarize ... by', meaning: 'Aggregate per group.' },
        { path: 'bin()', meaning: 'Round values, usually time, into buckets.' },
        {
          path: 'join kind=',
          meaning: 'Combine tables: inner, leftouter, innerunique (default), leftanti.',
        },
        { path: 'render', meaning: 'Visualise: timechart, barchart, piechart.' },
      ],
    },
  ],
  realWorldExample: {
    title: 'Three queries during a Monday outage',
    story: [
      'At 09:10 on Monday, alerts fired for checkout errors. The on-call engineer began with `requests | where timestamp > ago(1h) | summarize failures = countif(success == false), total = count() by bin(timestamp, 5m)` rendered as a timechart. Failures started at 08:55.',
      'The second query joined failing requests with dependencies on operation_Id and summarised by dependency target. Nearly all failures came from calls to the payments database timing out, and only from two instances of the API.',
      'The third query looked at InsightsMetrics for those two machines: available memory had fallen close to zero since 08:50 while CPU was normal. A memory leak in a new library version was starving the connection pool.',
      'They recycled the instances to restore service, rolled back the library, and saved all three queries as a workbook so the next on-call engineer starts there. They also added a log alert when available memory stays under a threshold for 10 minutes.',
    ],
  },
  yamlExamples: [
    {
      title: 'CPU per VM over time',
      language: 'text',
      explanation: 'VM insights data. One line per computer in the timechart.',
      code: `InsightsMetrics
| where TimeGenerated > ago(6h)
| where Namespace == "Processor" and Name == "UtilizationPercentage"
| summarize AvgCpu = avg(Val) by bin(TimeGenerated, 5m), Computer
| render timechart`,
    },
    {
      title: 'Request latency percentiles and failure rate per operation',
      language: 'text',
      code: `requests
| where timestamp > ago(1h)
| summarize
    Requests = count(),
    Failed = countif(success == false),
    P50 = percentile(duration, 50),
    P95 = percentile(duration, 95)
  by name
| extend FailureRate = round(100.0 * Failed / Requests, 2)
| order by P95 desc
| take 10`,
    },
    {
      title: 'Attribute slow requests to dependencies with join',
      language: 'text',
      explanation: 'Joins on the shared operation id from distributed tracing.',
      code: `let slow = requests
  | where timestamp > ago(1h) and duration > 2000
  | project operation_Id, request = name, requestMs = duration;
slow
| join kind=inner (
    dependencies
    | where timestamp > ago(1h)
    | project operation_Id, target, type, depMs = duration
  ) on operation_Id
| summarize calls = count(), avgDepMs = avg(depMs) by target, type
| order by avgDepMs desc`,
    },
    {
      title: 'Free disk space and machines that stopped reporting',
      language: 'text',
      code: `// Disks below 15 percent free
InsightsMetrics
| where TimeGenerated > ago(30m)
| where Namespace == "LogicalDisk" and Name == "FreeSpacePercentage"
| extend Disk = tostring(parse_json(Tags)["vm.azm.ms/mountId"])
| summarize FreePct = min(Val) by Computer, Disk
| where FreePct < 15

// Agents with no heartbeat in 15 minutes
Heartbeat
| summarize LastSeen = max(TimeGenerated) by Computer
| where LastSeen < ago(15m)`,
    },
  ],
  imperative: [
    {
      command:
        'az monitor log-analytics query -w <workspace-guid> --analytics-query "Heartbeat | summarize LastSeen = max(TimeGenerated) by Computer" -o table',
      what: 'Runs a KQL query against a Log Analytics workspace from the CLI.',
      expected: 'One row per computer with its last heartbeat.',
      placeholders: ['<workspace-guid>'],
    },
    {
      command:
        'az monitor app-insights query --app appi-web-prod -g rg-mon --analytics-query "requests | summarize count() by resultCode" --offset 1h',
      what: 'Queries Application Insights telemetry for the last hour.',
    },
    {
      command:
        'az graph query -q "Resources | where type =~ \'microsoft.compute/virtualmachines\' | summarize count() by location"',
      what: 'Uses KQL against Azure Resource Graph to count VMs per region.',
      namespaceNote:
        'Resource Graph queries resource metadata, not logs, but uses the same language.',
    },
    {
      command:
        'az monitor log-analytics workspace saved-search create -g rg-mon --workspace-name law-web-prod -n cpu-by-vm --category Perf --display-name "CPU by VM" --saved-query "InsightsMetrics | where Name == \'UtilizationPercentage\' | summarize avg(Val) by Computer"',
      what: 'Saves a query in the workspace so the team can reuse it.',
    },
    {
      command:
        'az pipelines runs list --status completed --query "[?result==\'failed\'].{id:id,pipeline:definition.name,finish:finishTime}" -o table',
      what: 'Lists failed Azure Pipelines runs, a quick source for pipeline health analysis alongside Analytics.',
    },
  ],
  declarative: {
    steps: [
      'Develop and test the query in the Logs blade with a fixed time range.',
      'Save it as a function or in a workbook for reuse.',
      'Use it as the condition of a scheduled query rule in Bicep.',
      'Review alert noise after a week and tune thresholds and windows.',
    ],
    code: [
      {
        title: 'Bicep: alert when any VM stays above 90 percent CPU',
        language: 'bicep',
        explanation: 'Dimensions split the alert per Computer so each VM raises its own alert.',
        code: `param workspaceId string
param actionGroupId string
param location string = resourceGroup().location

resource highCpu 'Microsoft.Insights/scheduledQueryRules@2023-03-15-preview' = {
  name: 'vm-high-cpu'
  location: location
  properties: {
    severity: 2
    enabled: true
    scopes: [ workspaceId ]
    evaluationFrequency: 'PT5M'
    windowSize: 'PT15M'
    criteria: {
      allOf: [
        {
          query: 'InsightsMetrics | where Namespace == "Processor" and Name == "UtilizationPercentage" | summarize AvgCpu = avg(Val) by Computer'
          timeAggregation: 'Maximum'
          metricMeasureColumn: 'AvgCpu'
          dimensions: [
            { name: 'Computer', operator: 'Include', values: [ '*' ] }
          ]
          operator: 'GreaterThan'
          threshold: 90
          failingPeriods: {
            numberOfEvaluationPeriods: 1
            minFailingPeriodsToAlert: 1
          }
        }
      ]
    }
    actions: {
      actionGroups: [ actionGroupId ]
    }
  }
}`,
      },
    ],
  },
  verification: [
    {
      command:
        'az monitor log-analytics query -w <workspace-guid> --analytics-query "InsightsMetrics | where TimeGenerated > ago(10m) | distinct Namespace"',
      what: 'Confirms VM insights data is arriving and which namespaces exist.',
      expected: 'Processor, Memory, LogicalDisk, Network',
      placeholders: ['<workspace-guid>'],
    },
    {
      command: 'az monitor scheduled-query list -g rg-mon -o table',
      what: 'Lists log search alert rules built from your queries.',
    },
  ],
  troubleshooting: [
    {
      command:
        'az monitor log-analytics query -w <workspace-guid> --analytics-query "search * | where TimeGenerated > ago(1h) | summarize count() by $table"',
      what: 'Query returns nothing: find which tables actually have data in the time range (maybe Perf rather than InsightsMetrics, or AppRequests rather than requests).',
      placeholders: ['<workspace-guid>'],
    },
    {
      command:
        'az monitor log-analytics query -w <workspace-guid> --analytics-query "requests | getschema"',
      what: 'Shows column names and types, to fix "failed to resolve column" errors caused by classic versus workspace names.',
      placeholders: ['<workspace-guid>'],
    },
    {
      command:
        'az monitor log-analytics query -w <workspace-guid> --analytics-query "Usage | where TimeGenerated > ago(1d) | summarize GB = sum(Quantity) / 1000 by DataType | order by GB desc"',
      what: 'Slow or expensive queries and bills: see which data types dominate ingestion.',
      placeholders: ['<workspace-guid>'],
    },
  ],
  commonMistakes: [
    'Leaving out a time filter, so the query scans the full retention period and is slow.',
    'Using `contains` everywhere; `has` is faster for whole terms because it uses the term index.',
    'Averaging latency. Use percentiles; averages hide the slow tail users feel.',
    'Mixing classic Application Insights names (requests, timestamp, duration) with workspace names (AppRequests, TimeGenerated, DurationMs) in one query.',
    'Forgetting that the default join kind is innerunique, which deduplicates the left side and can drop rows unexpectedly.',
    'Summarising by TimeGenerated without bin, which creates one group per distinct timestamp.',
  ],
  examTips: [
    'Know the pipe order and what each core operator does: where, project, extend, summarize, bin, join, render, top, take.',
    'A time chart needs a summarize with `bin(TimeGenerated, <size>)` followed by `render timechart`.',
    'CPU, memory, disk and network for VMs come from InsightsMetrics (VM insights) or Perf.',
    'The join key for distributed tracing is operation_Id.',
    'Heartbeat is the table for "which agents stopped reporting".',
  ],
  summary: [
    'KQL pipes a table through operators, left to right.',
    'Filter early with time and where, then shape with project and extend, then aggregate with summarize.',
    'bin groups time into buckets; render draws the result.',
    'join correlates tables, especially requests and dependencies on operation_Id.',
    'InsightsMetrics, Perf and Heartbeat cover infrastructure; requests, dependencies and exceptions cover applications.',
  ],
  practice: [
    {
      id: 'az4-kql-analysis-p1',
      level: 'beginner',
      prompt: 'Which operator adds a new calculated column while keeping all existing columns?',
      answer: 'The extend operator.',
      explanation:
        'project keeps only the columns you list; extend keeps everything and adds more.',
    },
    {
      id: 'az4-kql-analysis-p2',
      level: 'intermediate',
      prompt:
        'Write a query that counts failed requests per 5 minutes over the last hour and draws a chart.',
      answer:
        'requests | where timestamp > ago(1h) and success == false | summarize count() by bin(timestamp, 5m) | render timechart',
      explanation: 'bin creates the 5-minute buckets; render timechart draws them.',
    },
    {
      id: 'az4-kql-analysis-p3',
      level: 'intermediate',
      prompt: 'Which table and filter return CPU utilisation collected by VM insights?',
      answer: 'InsightsMetrics where Namespace == "Processor" and Name == "UtilizationPercentage".',
      explanation:
        'VM insights with the Azure Monitor Agent writes standard performance counters to InsightsMetrics.',
    },
    {
      id: 'az4-kql-analysis-p4',
      level: 'advanced',
      prompt: 'How would you find which downstream dependency causes most slow requests?',
      answer:
        'Filter slow requests, project operation_Id, join to dependencies on operation_Id, then summarize count and average duration by target and order descending.',
      explanation: 'The shared operation id links every span in one trace.',
    },
  ],
  lab: {
    title: 'KQL on real VM and application data',
    scenario:
      'Onboard a small Linux VM to VM insights, then write KQL for CPU, memory, disk and heartbeat, and save a query as an alert.',
    prerequisites: [
      'An Azure subscription (free account) and Cloud Shell',
      'Optionally the Application Insights resource from the previous lesson lab',
    ],
    tasks: [
      {
        instruction:
          'Create resource group `rg-lab-kql`, a Log Analytics workspace and a small Ubuntu VM.',
      },
      {
        instruction: 'Enable VM insights on the VM (Azure Monitor Agent plus a VM insights DCR).',
        hint: 'Portal: VM, Insights, Enable. Or assign the VM insights policy initiative.',
      },
      { instruction: 'Wait about 15 minutes, then confirm Heartbeat rows exist for the VM.' },
      { instruction: 'Write a query that charts average CPU per 5 minutes.' },
      { instruction: 'Write a query that shows the minimum free disk percentage per mount.' },
      { instruction: 'Generate CPU load on the VM with a stress loop and watch the chart rise.' },
      { instruction: 'Create a log search alert for CPU above 80 percent using your query.' },
    ],
    solution: [
      {
        title: 'Create and onboard',
        language: 'bash',
        code: `az group create -n rg-lab-kql -l westeurope
az monitor log-analytics workspace create -g rg-lab-kql -n law-kql
az vm create -g rg-lab-kql -n vm-kql --image Ubuntu2204 --size Standard_B1s \\
  --admin-username azureuser --generate-ssh-keys
# Enable VM insights from the portal (VM > Insights > Enable) targeting law-kql

WS=$(az monitor log-analytics workspace show -g rg-lab-kql -n law-kql --query customerId -o tsv)
az monitor log-analytics query -w $WS --analytics-query "Heartbeat | summarize max(TimeGenerated) by Computer" -o table

# Load
az vm run-command invoke -g rg-lab-kql -n vm-kql --command-id RunShellScript \\
  --scripts "timeout 600 sh -c 'while :; do :; done' &"`,
      },
      {
        title: 'Queries',
        language: 'text',
        code: `InsightsMetrics
| where TimeGenerated > ago(1h)
| where Namespace == "Processor" and Name == "UtilizationPercentage"
| summarize AvgCpu = avg(Val) by bin(TimeGenerated, 5m), Computer
| render timechart

InsightsMetrics
| where TimeGenerated > ago(30m)
| where Namespace == "LogicalDisk" and Name == "FreeSpacePercentage"
| extend Disk = tostring(parse_json(Tags)["vm.azm.ms/mountId"])
| summarize FreePct = min(Val) by Computer, Disk`,
      },
    ],
    verification: [
      {
        command:
          'az monitor log-analytics query -w <workspace-guid> --analytics-query "InsightsMetrics | where Name == \'UtilizationPercentage\' | summarize max(Val)" -o table',
        what: 'Shows the peak CPU after the load test.',
        expected: 'A value close to 100 during the stress loop.',
        placeholders: ['<workspace-guid>'],
      },
      {
        command: 'az monitor scheduled-query list -g rg-lab-kql -o table',
        what: 'The CPU alert rule exists.',
      },
    ],
    cleanup: [
      {
        command: 'az group delete -n rg-lab-kql --yes --no-wait',
        what: 'Deletes the VM, workspace, DCR and alert.',
      },
    ],
  },
  relatedTopicIds: ['az4-app-insights-monitoring', 'az4-pipeline-maintenance', 'az4-work-tracking'],
  docs: [
    { title: 'Kusto Query Language overview', url: 'https://learn.microsoft.com/kusto/query/' },
    {
      title: 'Log Analytics tutorial',
      url: 'https://learn.microsoft.com/azure/azure-monitor/logs/log-analytics-tutorial',
    },
    {
      title: 'summarize operator',
      url: 'https://learn.microsoft.com/kusto/query/summarize-operator',
    },
    { title: 'join operator', url: 'https://learn.microsoft.com/kusto/query/join-operator' },
    {
      title: 'How to query logs from VM insights',
      url: 'https://learn.microsoft.com/azure/azure-monitor/vm/vminsights-log-query',
    },
  ],
}
