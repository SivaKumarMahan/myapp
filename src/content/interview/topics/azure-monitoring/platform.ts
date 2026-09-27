import type { InterviewQuestion } from '../../../types'

/** Azure Monitor: data platform, workspaces, KQL, Application Insights, alerts and the agent. */
export const azureMonitoringPlatformQuestions: InterviewQuestion[] = [
  {
    id: 'itv-azmon-1',
    level: 'basic',
    kind: 'open',
    prompt:
      'Explain the Azure Monitor data platform. What is the difference between metrics and logs?',
    probing:
      'The foundation for every monitoring question. They want the two stores, what goes in each, and how data gets there.',
    answer: [
      'Azure Monitor collects telemetry into two main stores. **Metrics** are numeric time series - CPU percentage, request count, queue length - stored in a time-series database that is fast to query and chart, kept for 93 days, and ideal for near-real-time alerting and autoscale. Most Azure resources emit platform metrics automatically with no setup.',
      '**Logs** are records with many fields - a request with its URL, status code and duration; a Windows event; an audit entry - stored in a **Log Analytics workspace** and queried with **KQL**. They are richer and slower than metrics, and retention is configurable.',
      'Data arrives from several sources. Platform metrics come for free. **Resource logs** (for example Key Vault audit events or storage requests) need a **diagnostic setting** that routes them to a workspace, storage or Event Hubs. The **activity log** records control-plane operations on the subscription. VMs send guest data through the **Azure Monitor Agent**, and applications send traces through **Application Insights**.',
      'So the rule of thumb: metrics for "is it healthy right now" and fast alerts; logs for "why", investigation and correlation across services.',
    ],
    diagrams: [
      {
        kind: 'flow',
        title: 'How telemetry reaches Azure Monitor',
        caption:
          'Platform metrics are automatic; almost everything else needs a setting, an agent or an SDK.',
        nodes: [
          { label: 'Azure resources', detail: 'Platform metrics - automatic', tone: 'accent' },
          {
            label: 'Diagnostic settings',
            detail: 'Resource logs and activity log',
            arrowLabel: 'opt-in',
          },
          { label: 'Azure Monitor Agent + DCRs', detail: 'Guest OS perf, events, syslog' },
          { label: 'Application Insights', detail: 'OpenTelemetry traces, requests' },
          {
            label: 'Log Analytics workspace',
            detail: 'Queried with KQL',
            tone: 'success',
            branch: { label: 'Metrics database', detail: '93 days, fast charts and alerts' },
          },
        ],
      },
    ],
    code: [
      {
        title: 'Route a Key Vault’s resource logs to a workspace',
        language: 'bash',
        code: `az monitor diagnostic-settings create --name to-law \\
  --resource <key-vault-resource-id> \\
  --workspace <workspace-resource-id> \\
  --export-to-resource-specific true \\
  --logs '[{"categoryGroup":"audit","enabled":true}]' \\
  --metrics '[{"category":"AllMetrics","enabled":true}]'

# Platform metrics need no setup at all
az monitor metrics list --resource <key-vault-resource-id> \\
  --metric ServiceApiLatency --interval PT5M --aggregation Average -o table`,
        placeholders: ['<key-vault-resource-id>', '<workspace-resource-id>'],
      },
    ],
    traps: [
      'Assuming resource logs are collected by default. Without a diagnostic setting they go nowhere.',
      'Using log queries for fast, high-frequency alerting where a metric alert would be cheaper and quicker.',
    ],
    followUps: [
      'What does a diagnostic setting do?',
      'When would you send logs to Event Hubs instead of a workspace?',
    ],
    tags: ['azure monitor', 'metrics', 'logs', 'fundamentals'],
  },
  {
    id: 'itv-azmon-2',
    level: 'advanced',
    kind: 'open',
    prompt: 'How would you design Log Analytics workspaces for a large organisation?',
    probing:
      'Architecture and cost. The modern answer is "as few workspaces as possible", with access control and table plans doing the separation.',
    answer: [
      'Microsoft’s guidance, which I agree with, is to start from **as few workspaces as possible** - often one per region or per environment - because a single workspace makes cross-resource queries, Sentinel and cost management far simpler. You add workspaces only when there is a concrete reason.',
      'The legitimate reasons are: **data residency** (data must stay in a geography), **billing separation** that cannot be done with tags or cost allocation, very different **retention** needs, or a hard **tenant** boundary. "Each team wants its own" is usually solved with access control instead.',
      'For access, I use **resource-context** access: people with read rights on a resource can query that resource’s logs without any workspace-level permission. Workspace-level roles go to the platform and security teams, and **table-level RBAC** can hide sensitive tables such as sign-in logs.',
      'For cost, the levers are **table plans** - Analytics for data you query and alert on, **Basic** or **Auxiliary** for high-volume verbose logs you only search occasionally - plus **retention** per table, a **commitment tier** once daily ingestion is predictable, and **DCR transformations** that drop fields or rows before they are ingested.',
    ],
    deeper: [
      'Sentinel is enabled on a workspace, and its pricing is based on that workspace’s ingestion. Mixing a huge volume of operational logs into the Sentinel workspace makes security monitoring expensive; some organisations keep a separate security workspace for exactly that reason.',
      'A **daily cap** protects the budget but stops collecting data when hit - including the data you need during the incident that caused the spike. I prefer an alert on ingestion volume over a hard cap in production.',
    ],
    diagrams: [
      {
        kind: 'decision',
        title: 'Do you need another workspace?',
        caption: 'Default to fewer workspaces; use access control and table plans for separation.',
        question: 'Why does this data need its own workspace?',
        branches: [
          {
            condition: 'Data must stay in a geography',
            result: 'Regional workspace',
            detail: 'Residency is a hard requirement',
            tone: 'accent',
          },
          {
            condition: 'Separate tenant or legal entity',
            result: 'Separate workspace',
            detail: 'A real boundary',
            tone: 'accent',
          },
          {
            condition: 'A team wants privacy',
            result: 'Same workspace',
            detail: 'Resource-context and table RBAC',
            tone: 'success',
          },
          {
            condition: 'Verbose logs are expensive',
            result: 'Same workspace',
            detail: 'Basic or Auxiliary table plan',
            tone: 'success',
          },
        ],
      },
    ],
    code: [
      {
        title: 'Table plan and retention per table',
        language: 'bash',
        code: `# Verbose container logs: cheaper plan, shorter interactive retention
az monitor log-analytics workspace table update -g <rg> --workspace-name <law> \\
  -n ContainerLogV2 --plan Basic --total-retention-time 180

# Security-relevant tables: analytics plan, long retention
az monitor log-analytics workspace table update -g <rg> --workspace-name <law> \\
  -n SigninLogs --retention-time 90 --total-retention-time 730`,
        placeholders: ['<rg>', '<law>'],
      },
      {
        title: 'Which tables cost the most? (KQL)',
        language: 'text',
        code: `Usage
| where TimeGenerated > ago(30d) and IsBillable == true
| summarize GB = round(sum(Quantity) / 1024, 1) by DataType
| order by GB desc
| take 15`,
      },
    ],
    traps: [
      'A workspace per team or per application, making cross-service investigation painful.',
      'Setting a daily cap in production and losing data mid-incident.',
      'Keeping every table on the Analytics plan with two years of retention.',
    ],
    followUps: [
      'How does resource-context access work?',
      'What can you not do with Basic logs?',
      'Where would Sentinel live in this design?',
    ],
    tags: ['log analytics', 'workspace design', 'cost', 'architecture'],
  },
  {
    id: 'itv-azmon-3',
    level: 'intermediate',
    kind: 'open',
    prompt:
      'Write me a few KQL queries you would use during an incident, and explain the operators.',
    probing:
      'Hands-on KQL. They want the core operators - where, summarize, bin, project, extend, join, render - used on real tables.',
    answer: [
      'KQL is a pipeline: you start from a table and each `|` passes the result to the next operator. The ones I use constantly: `where` to filter (always filter on `TimeGenerated` first, for speed), `summarize` to aggregate with `count()`, `avg()`, `percentile()` or `dcount()`, often `by bin(TimeGenerated, 5m)` for a time series, `project` to choose columns, `extend` to compute new ones, `top` or `order by` to sort, and `render timechart` to chart it.',
      '`join` combines tables - for example failed requests with the exceptions that share an operation ID - and `let` names a subquery or a value so a long query stays readable. `parse` and `extract` pull fields out of unstructured messages.',
      'During an incident the first three queries I reach for are: the **error rate over time** to see when it started, the **top failing operations** to see what is affected, and the **activity log around the start time** to see what changed.',
    ],
    code: [
      {
        title: 'Error rate over time, from workspace-based Application Insights',
        language: 'text',
        code: `AppRequests
| where TimeGenerated > ago(6h)
| summarize total = count(), failed = countif(Success == false) by bin(TimeGenerated, 5m)
| extend errorRate = round(100.0 * failed / total, 2)
| project TimeGenerated, errorRate, total
| render timechart`,
      },
      {
        title: 'Top failing operations and their exceptions',
        language: 'text',
        code: `let window = ago(1h);
AppRequests
| where TimeGenerated > window and Success == false
| summarize failures = count(), p95ms = percentile(DurationMs, 95) by OperationName, ResultCode
| top 10 by failures
| join kind=leftouter (
    AppExceptions
    | where TimeGenerated > window
    | summarize topException = take_any(ProblemId) by OperationName
  ) on OperationName`,
      },
      {
        title: 'What changed just before it started?',
        language: 'text',
        code: `AzureActivity
| where TimeGenerated between (datetime(2026-09-27 09:00) .. datetime(2026-09-27 09:45))
| where CategoryValue == "Administrative" and ActivityStatusValue == "Success"
| project TimeGenerated, Caller, OperationNameValue, ResourceGroup, _ResourceId
| order by TimeGenerated asc`,
      },
    ],
    traps: [
      'Not filtering on time first, so the query scans months of data.',
      'Averaging latency, which hides the tail - use percentiles.',
      'Mixing classic table names (requests) with workspace table names (AppRequests) in the same query.',
    ],
    followUps: [
      'How do you join application traces with infrastructure logs?',
      'What is the difference between summarize by bin and make-series?',
    ],
    tags: ['kql', 'log analytics', 'troubleshooting'],
  },
  {
    id: 'itv-azmon-4',
    level: 'basic',
    kind: 'mcq',
    prompt:
      'What does this KQL return? AppRequests | where TimeGenerated > ago(1h) | summarize count() by bin(TimeGenerated, 5m), ResultCode',
    options: [
      { id: 'a', text: 'The total number of requests in the last hour, as a single number' },
      {
        id: 'b',
        text: 'One row per 5-minute interval and result code, with the request count for each',
      },
      { id: 'c', text: 'The five most recent requests for each result code' },
      { id: 'd', text: 'Requests that took longer than 5 minutes, grouped by result code' },
    ],
    correct: ['b'],
    probing: 'Basic KQL literacy, specifically what summarize ... by bin() produces.',
    answer: [
      '`bin(TimeGenerated, 5m)` rounds each timestamp down to its 5-minute bucket, and `summarize count() by` groups on that bucket **and** on `ResultCode`. So the result has one row for each combination - "09:05, 200, 1432", "09:05, 500, 12", "09:10, 200, 1390" - which is exactly the shape you want for a chart of status codes over time.',
      'Adding `| render timechart` would draw it; adding `| where ResultCode startswith "5"` before the summarize would show only server errors.',
    ],
    code: [
      {
        title: 'The same query, charted',
        language: 'text',
        code: `AppRequests
| where TimeGenerated > ago(1h)
| summarize count() by bin(TimeGenerated, 5m), ResultCode
| render timechart`,
      },
    ],
    traps: ['Confusing `bin()` with `take` or `top`.'],
    followUps: ['How would you turn this into an error-rate percentage?'],
    tags: ['kql', 'basics'],
  },
  {
    id: 'itv-azmon-5',
    level: 'intermediate',
    kind: 'open',
    prompt:
      'How do you instrument an application with Application Insights today, and how does distributed tracing work?',
    probing:
      'Current practice: workspace-based Application Insights and the Azure Monitor OpenTelemetry Distro, plus trace context propagation.',
    answer: [
      'Application Insights is the application performance monitoring part of Azure Monitor. New resources are **workspace-based**, so the telemetry lands in a Log Analytics workspace next to infrastructure logs. The recommended way to instrument code is the **Azure Monitor OpenTelemetry Distro** for .NET, Java, Node.js or Python: one package, one line of setup, and the **connection string** from the resource.',
      'It collects **requests** coming into the service, **dependencies** it calls (HTTP, SQL, Service Bus, storage), **exceptions**, **logs**, and **metrics**. Because it is OpenTelemetry, you can add custom spans and attributes with the standard API, and you are not locked to a vendor SDK.',
      '**Distributed tracing** works by propagating trace context. When service A calls service B, the instrumentation adds a W3C `traceparent` header with the trace ID and the parent span ID. B continues the same trace. Every request, dependency and log in that chain shares one **operation ID**, so the application map and the end-to-end transaction view can show the whole path, and a KQL query on `OperationId` finds everything that happened for one user request.',
      'For hosted platforms there is also **auto-instrumentation** - App Service, Functions, AKS for some languages - which needs no code change, at the price of less control.',
    ],
    diagrams: [
      {
        kind: 'sequence',
        title: 'One trace across three services',
        caption: 'The traceparent header carries one trace ID through every hop.',
        participants: [
          { id: 'web', label: 'Web frontend' },
          { id: 'api', label: 'Orders API' },
          { id: 'db', label: 'Azure SQL' },
          { id: 'ai', label: 'Application Insights' },
        ],
        messages: [
          { from: 'web', to: 'api', label: 'HTTP call with traceparent' },
          { from: 'api', to: 'db', label: 'SQL dependency, same trace ID' },
          { from: 'db', to: 'api', label: 'result', kind: 'return' },
          { from: 'api', to: 'web', label: '200 OK', kind: 'return' },
          { from: 'web', to: 'ai', label: 'request + dependency spans' },
          { from: 'api', to: 'ai', label: 'request + SQL span, same OperationId' },
        ],
      },
    ],
    code: [
      {
        title: 'Python with the Azure Monitor OpenTelemetry Distro',
        language: 'python',
        code: `# pip install azure-monitor-opentelemetry
from azure.monitor.opentelemetry import configure_azure_monitor
from opentelemetry import trace

# Reads APPLICATIONINSIGHTS_CONNECTION_STRING from the environment
configure_azure_monitor()

tracer = trace.get_tracer(__name__)

def place_order(order):
    with tracer.start_as_current_span("place_order") as span:
        span.set_attribute("order.items", len(order["items"]))
        ...`,
      },
      {
        title: 'Everything for one request (KQL)',
        language: 'text',
        code: `union AppRequests, AppDependencies, AppExceptions, AppTraces
| where OperationId == "4bf92f3577b34da6a3ce929d0e0e4736"
| project TimeGenerated, Type, AppRoleName, Name, DurationMs, Success, Message
| order by TimeGenerated asc`,
      },
    ],
    traps: [
      'Hard-coding the connection string in source code.',
      'Turning sampling off in a high-traffic service and being surprised by the ingestion bill.',
      'Breaking trace propagation through a gateway or queue that drops the headers.',
    ],
    followUps: [
      'How does sampling affect the numbers you see?',
      'How do you propagate trace context through Service Bus?',
    ],
    tags: ['application insights', 'opentelemetry', 'distributed tracing'],
  },
  {
    id: 'itv-azmon-6',
    level: 'intermediate',
    kind: 'open',
    prompt: 'Explain alert rules, action groups and alert processing rules in Azure Monitor.',
    probing:
      'Alerting mechanics and the separation of detection from notification, which is what makes alerting manageable at scale.',
    answer: [
      'An **alert rule** defines **what** to detect. There are three main kinds: **metric alerts** on platform or custom metrics, with static or **dynamic thresholds** that learn the normal pattern; **log search alerts**, which run a KQL query on a schedule and fire on the result; and **activity log alerts** for control-plane events, including **Service Health** and **Resource Health** notifications.',
      'An **action group** defines **who and how** - email, SMS, push, voice, a webhook, an Azure Function, a Logic App, an Automation runbook, an ITSM connector or Event Hubs. Rules reference action groups, so many rules can share one "platform on-call" group and changing the phone number is one edit.',
      '**Alert processing rules** act on alerts after they fire and before notifications go out. The two main uses are **suppression** - no notifications for a resource group during a planned maintenance window - and **adding action groups at scale**, such as sending every sev-0 alert in a subscription to the incident tool without editing each rule.',
      'Metric and log alerts can be **stateful**: they resolve automatically when the condition clears, which keeps the alert list honest and lets the incident tool close things.',
    ],
    diagrams: [
      {
        kind: 'flow',
        title: 'From signal to notification',
        caption:
          'Detection, processing and notification are separate objects, which is what makes them manageable.',
        nodes: [
          { label: 'Signal', detail: 'Metric, log query, activity log', tone: 'accent' },
          { label: 'Alert rule fires', detail: 'Severity, stateful, dimensions' },
          {
            label: 'Alert processing rule',
            detail: 'Suppress or add action groups',
            branch: { label: 'Maintenance window', detail: 'Notifications suppressed' },
          },
          { label: 'Action group', detail: 'Email, SMS, webhook, Function' },
          { label: 'On-call acts', detail: 'Alert resolves when signal clears', tone: 'success' },
        ],
      },
    ],
    code: [
      {
        title: 'Action group, metric alert and a maintenance suppression',
        language: 'bash',
        code: `az monitor action-group create -g rg-monitor -n ag-platform-oncall \\
  --short-name platoncall \\
  --action email oncall platform-oncall@contoso.com \\
  --action webhook incident https://incident.contoso.com/hooks/azure

az monitor metrics alert create -g rg-monitor -n app-5xx \\
  --scopes <app-service-resource-id> \\
  --condition "total Http5xx > 20" --window-size 5m --evaluation-frequency 1m \\
  --severity 1 --action ag-platform-oncall

az monitor alert-processing-rule create -g rg-monitor -n suppress-sunday-patching \\
  --rule-type RemoveAllActionGroups \\
  --scopes /subscriptions/<sub>/resourceGroups/rg-orders-prod \\
  --schedule-recurrence-type Weekly --schedule-recurrence Sunday \\
  --schedule-start-datetime "2026-10-04 01:00:00" --schedule-end-datetime "2026-12-31 03:00:00"`,
        placeholders: ['<app-service-resource-id>', '<sub>'],
      },
    ],
    traps: [
      'Disabling alert rules for maintenance and forgetting to re-enable them. Suppress with a processing rule instead.',
      'One action group per rule, so an on-call change means editing hundreds of rules.',
      'Log search alerts every minute on expensive queries, which costs money and still lags a metric alert.',
    ],
    followUps: [
      'When would you use dynamic thresholds?',
      'How do you avoid alert storms from one root cause?',
    ],
    tags: ['alerts', 'action groups', 'alert processing rules'],
  },
  {
    id: 'itv-azmon-7',
    level: 'intermediate',
    kind: 'open',
    prompt: 'What is the Azure Monitor Agent, and how do data collection rules work?',
    probing:
      'Current VM monitoring. They must know the legacy agent is retired, and that DCRs decouple what is collected from which machines.',
    answer: [
      'The **Azure Monitor Agent** (AMA) is the single agent for collecting guest data from Windows and Linux VMs, scale sets and, through **Azure Arc**, on-premises and other-cloud servers. It replaced the legacy Log Analytics agent (MMA/OMS), which was retired in August 2024.',
      'What AMA collects is not configured on the machine. It is defined in **data collection rules** (DCRs): Azure resources that say which **data sources** to collect - performance counters, Windows event logs filtered with XPath, syslog facilities and levels, text logs - and which **destinations** to send them to, usually a Log Analytics workspace.',
      'A **DCR association** links a rule to a machine. One machine can have several rules - a baseline security rule from the platform team plus an application rule from the product team - and one rule can apply to thousands of machines. At scale, both the agent and the associations are deployed with **Azure Policy**.',
      'DCRs can also contain a **transformation**, a KQL expression applied at ingestion that filters or reshapes the data before it is stored and billed. That is one of the most effective cost controls available.',
    ],
    diagrams: [
      {
        kind: 'flow',
        title: 'Azure Monitor Agent with data collection rules',
        caption: 'The rule, not the machine, defines what is collected and where it goes.',
        nodes: [
          { label: 'VM or Arc server', detail: 'Azure Monitor Agent extension', tone: 'accent' },
          { label: 'DCR association', detail: 'Links machines to rules' },
          { label: 'Data collection rule', detail: 'Perf counters, events, syslog' },
          { label: 'Transformation', detail: 'KQL filter at ingestion', tone: 'warning' },
          {
            label: 'Log Analytics workspace',
            detail: 'Perf, Event, Syslog tables',
            tone: 'success',
          },
        ],
      },
    ],
    code: [
      {
        title: 'Install the agent and associate a rule',
        language: 'bash',
        code: `az vm extension set -g <rg> --vm-name <vm> \\
  --name AzureMonitorLinuxAgent --publisher Microsoft.Azure.Monitor \\
  --enable-auto-upgrade true

az monitor data-collection rule association create --name linux-baseline \\
  --rule-id <dcr-resource-id> \\
  --resource /subscriptions/<sub>/resourceGroups/<rg>/providers/Microsoft.Compute/virtualMachines/<vm>`,
        placeholders: ['<rg>', '<vm>', '<dcr-resource-id>', '<sub>'],
      },
      {
        title: 'DCR in Bicep with a cost-saving transformation',
        language: 'bicep',
        code: `resource dcr 'Microsoft.Insights/dataCollectionRules@2023-03-11' = {
  name: 'dcr-linux-baseline'
  location: location
  kind: 'Linux'
  properties: {
    dataSources: {
      syslog: [
        {
          name: 'syslog-auth-and-errors'
          streams: [ 'Microsoft-Syslog' ]
          facilityNames: [ 'auth', 'authpriv', 'daemon' ]
          logLevels: [ 'Warning', 'Error', 'Critical', 'Alert', 'Emergency' ]
        }
      ]
      performanceCounters: [
        {
          name: 'core-perf'
          streams: [ 'Microsoft-Perf' ]
          samplingFrequencyInSeconds: 60
          counterSpecifiers: [ '\\\\Processor(*)\\\\% Processor Time', '\\\\Memory(*)\\\\% Used Memory' ]
        }
      ]
    }
    destinations: {
      logAnalytics: [ { name: 'law', workspaceResourceId: workspaceId } ]
    }
    dataFlows: [
      {
        streams: [ 'Microsoft-Syslog' ]
        destinations: [ 'law' ]
        transformKql: 'source | where SyslogMessage !has "healthcheck"'
      }
      { streams: [ 'Microsoft-Perf' ], destinations: [ 'law' ] }
    ]
  }
}`,
      },
    ],
    traps: [
      'Talking about the Log Analytics agent (MMA) as current. It is retired.',
      'Installing the agent but never creating a DCR association, so nothing is collected.',
      'Collecting every Windows event at every level and paying for it.',
    ],
    followUps: [
      'How do you deploy AMA and DCRs to thousands of VMs?',
      'What can a DCR transformation not do?',
    ],
    tags: ['azure monitor agent', 'data collection rules', 'vm monitoring'],
  },
]
