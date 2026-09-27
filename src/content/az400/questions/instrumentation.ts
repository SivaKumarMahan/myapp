import type { Question } from '../../types'

/** Original practice questions for this domain. Written for this app. */
export const az400InstrumentationQuestions: Question[] = [
  {
    id: 'az4q-ins-1',
    domainId: 'az4-instrumentation',
    topicId: 'az4-app-insights-monitoring',
    kind: 'mcq',
    category: 'concept',
    difficulty: 'intermediate',
    points: 2,
    prompt:
      'Users report that an order page is slow. The page calls three microservices, each instrumented with the Azure Monitor OpenTelemetry Distro sending to the same Application Insights resource. Which feature best shows which downstream call adds the latency?',
    options: [
      { id: 'a', text: 'End-to-end transaction details for a slow operation' },
      { id: 'b', text: 'Availability tests' },
      { id: 'c', text: 'The Activity log' },
      { id: 'd', text: 'Azure Advisor recommendations' },
    ],
    correct: ['a'],
    explanation:
      'End-to-end transaction details use distributed tracing to show every request and dependency with durations. Availability tests only probe an endpoint from outside, the Activity log records control-plane operations, and Advisor gives general best-practice recommendations.',
  },
  {
    id: 'az4q-ins-2',
    domainId: 'az4-instrumentation',
    topicId: 'az4-app-insights-monitoring',
    kind: 'mcq',
    category: 'concept',
    difficulty: 'beginner',
    points: 1,
    prompt:
      'You need CPU, memory, disk and network performance and a dependency map for a fleet of Azure VMs. Which solution should you enable?',
    options: [
      { id: 'a', text: 'VM insights with the Azure Monitor Agent' },
      { id: 'b', text: 'The legacy Log Analytics (MMA) agent with solutions' },
      { id: 'c', text: 'Container insights' },
      { id: 'd', text: 'Application Insights availability tests' },
    ],
    correct: ['a'],
    explanation:
      'VM insights uses the Azure Monitor Agent and data collection rules to collect performance data and optionally a dependency map. The MMA agent is retired, Container insights is for Kubernetes, and availability tests check URLs.',
  },
  {
    id: 'az4q-ins-3',
    domainId: 'az4-instrumentation',
    topicId: 'az4-app-insights-monitoring',
    kind: 'multi',
    category: 'concept',
    difficulty: 'intermediate',
    points: 2,
    prompt:
      'Which statements about workspace-based Application Insights are correct? (Select all that apply.)',
    options: [
      { id: 'a', text: 'Telemetry is stored in a Log Analytics workspace' },
      { id: 'b', text: 'Applications should be configured with the connection string' },
      { id: 'c', text: 'Data can be queried with KQL together with other workspace tables' },
      { id: 'd', text: 'It requires installing the Log Analytics agent on every web server' },
    ],
    correct: ['a', 'b', 'c'],
    explanation:
      'Workspace-based Application Insights stores data in a workspace, is configured with a connection string, and can be joined with other workspace data. It needs an SDK, the OpenTelemetry distro or auto-instrumentation, not a server agent.',
  },
  {
    id: 'az4q-ins-4',
    domainId: 'az4-instrumentation',
    topicId: 'az4-app-insights-monitoring',
    kind: 'mcq',
    category: 'concept',
    difficulty: 'advanced',
    points: 2,
    prompt:
      'A multi-stage YAML pipeline deploys to a production environment in rings. You want the deployment to wait or fail automatically when Azure Monitor alerts are active for the application. What should you configure?',
    options: [
      { id: 'a', text: 'A Query Azure Monitor alerts check on the production environment' },
      { id: 'b', text: 'A scheduled trigger that runs every hour' },
      { id: 'c', text: 'A build validation branch policy' },
      { id: 'd', text: 'Pipeline retention settings' },
    ],
    correct: ['a'],
    explanation:
      'The Query Azure Monitor alerts check evaluates alert state before the deployment job runs on that environment. Scheduled triggers only decide when a run starts, build validation guards pull requests, and retention controls how long runs are kept.',
  },
  {
    id: 'az4q-ins-5',
    domainId: 'az4-instrumentation',
    topicId: 'az4-kql-analysis',
    kind: 'mcq',
    category: 'concept',
    difficulty: 'intermediate',
    points: 2,
    prompt: 'What does this query return?',
    code: {
      title: 'KQL',
      language: 'text',
      code: `requests
| where timestamp > ago(1h)
| summarize count() by bin(timestamp, 5m), success
| render timechart`,
    },
    options: [
      {
        id: 'a',
        text: 'A chart with request counts in 5-minute buckets, one series for successful and one for failed requests',
      },
      { id: 'b', text: 'The 5 slowest requests of the last hour' },
      { id: 'c', text: 'The total number of requests in the last hour as a single value' },
      { id: 'd', text: 'Requests that took longer than 5 minutes' },
    ],
    correct: ['a'],
    explanation:
      'summarize by bin(timestamp, 5m) and success produces a time series per success value, drawn as a timechart. Nothing sorts by duration, the grouping prevents a single total, and 5m is a bucket size, not a duration filter.',
  },
  {
    id: 'az4q-ins-6',
    domainId: 'az4-instrumentation',
    topicId: 'az4-kql-analysis',
    kind: 'mcq',
    category: 'concept',
    difficulty: 'beginner',
    points: 1,
    prompt:
      'Which KQL operator adds a calculated column to each row while keeping all existing columns?',
    options: [
      { id: 'a', text: 'project' },
      { id: 'b', text: 'extend' },
      { id: 'c', text: 'summarize' },
      { id: 'd', text: 'where' },
    ],
    correct: ['b'],
    explanation:
      'extend adds columns and keeps the rest. project keeps only the listed columns, summarize aggregates rows into groups, and where filters rows.',
  },
  {
    id: 'az4q-ins-7',
    domainId: 'az4-instrumentation',
    topicId: 'az4-kql-analysis',
    kind: 'multi',
    category: 'concept',
    difficulty: 'advanced',
    points: 2,
    prompt:
      'You want to find which dependencies are responsible for requests slower than 2 seconds. Which elements belong in the query? (Select all that apply.)',
    options: [
      { id: 'a', text: 'Filter requests where duration > 2000' },
      { id: 'b', text: 'join to dependencies on operation_Id' },
      { id: 'c', text: 'summarize by dependency target' },
      { id: 'd', text: 'join to Heartbeat on Computer' },
    ],
    correct: ['a', 'b', 'c'],
    explanation:
      'Slow requests are filtered by duration (milliseconds), correlated to their dependencies with the shared operation_Id, and then aggregated per target. Heartbeat records agent health and has no relationship with individual requests.',
  },
  {
    id: 'az4q-ins-8',
    domainId: 'az4-instrumentation',
    topicId: 'az4-kql-analysis',
    kind: 'mcq',
    category: 'troubleshoot',
    difficulty: 'intermediate',
    points: 2,
    prompt:
      'Which query returns the computers whose agent has not reported in the last 15 minutes?',
    options: [
      {
        id: 'a',
        text: 'Heartbeat | summarize LastSeen = max(TimeGenerated) by Computer | where LastSeen < ago(15m)',
      },
      { id: 'b', text: 'Heartbeat | where TimeGenerated < ago(15m) | distinct Computer' },
      { id: 'c', text: 'Perf | where CounterValue == 0 | distinct Computer' },
      { id: 'd', text: 'requests | where success == false | distinct cloud_RoleName' },
    ],
    correct: ['a'],
    explanation:
      'You need the most recent heartbeat per computer and then keep those older than 15 minutes. Option b returns every computer that ever reported earlier than 15 minutes ago, including healthy ones; Perf zeros and failed requests do not indicate missing agents.',
  },
  {
    id: 'az4q-ins-9',
    domainId: 'az4-instrumentation',
    topicId: 'az4-app-insights-monitoring',
    kind: 'command',
    category: 'command',
    difficulty: 'intermediate',
    points: 2,
    prompt:
      'Create a workspace-based Application Insights resource named appi-web in resource group rg-mon, location westeurope, using the workspace law-web.',
    acceptedAnswers: [
      'az monitor app-insights component create --app appi-web -g rg-mon -l westeurope --workspace law-web',
      'az monitor app-insights component create --app appi-web --resource-group rg-mon --location westeurope --workspace law-web',
      'az monitor app-insights component create --app appi-web -g rg-mon -l westeurope --workspace law-web --application-type web',
      'az monitor app-insights component create --app appi-web --resource-group rg-mon --location westeurope --workspace law-web --application-type web',
    ],
    answerHint: 'az monitor app-insights component create ...',
    explanation:
      '`az monitor app-insights component create` with --workspace makes it workspace-based. --application-type defaults to web.',
  },
  {
    id: 'az4q-ins-10',
    domainId: 'az4-instrumentation',
    topicId: 'az4-kql-analysis',
    kind: 'task',
    category: 'lab',
    difficulty: 'advanced',
    points: 2,
    prompt:
      'Create a log search alert that notifies the on-call team when average CPU of any VM reporting to workspace law-ops stays above 85 percent over 15 minutes, with each VM alerting separately.',
    context:
      'VMs onboarded to VM insights with the Azure Monitor Agent, sending to law-ops in rg-ops. An action group ag-oncall exists.',
    checkpoints: [
      {
        id: 'c1',
        text: 'The query uses InsightsMetrics with Namespace Processor and Name UtilizationPercentage',
      },
      { id: 'c2', text: 'The query summarizes average Val by Computer' },
      {
        id: 'c3',
        text: 'The alert evaluates each VM separately (split by resource id or Computer), with threshold 85 and a 15 minute window',
      },
      { id: 'c4', text: 'The rule is linked to ag-oncall' },
    ],
    solution: [
      {
        title: 'Scheduled query rule with the CLI',
        language: 'bash',
        code: `WS_ID=$(az monitor log-analytics workspace show -g rg-ops -n law-ops --query id -o tsv)
az monitor scheduled-query create -g rg-ops -n vm-cpu-85 \\
  --scopes $WS_ID \\
  --condition "avg AvgCpu from 'Cpu' > 85 resource id _ResourceId" \\
  --condition-query Cpu="InsightsMetrics | where Namespace == 'Processor' and Name == 'UtilizationPercentage' | summarize AvgCpu = avg(Val) by Computer, _ResourceId" \\
  --window-size 15m --evaluation-frequency 5m \\
  --action-groups ag-oncall --severity 2`,
      },
    ],
    explanation:
      'Summarizing by Computer (or resource id) lets the rule split into one alert per VM. The window defines the 15 minutes averaged, and the action group delivers the notification.',
  },
]
