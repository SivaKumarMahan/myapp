import type { Topic } from '../../../types'

export const appInsightsMonitoring: Topic = {
  id: 'az4-app-insights-monitoring',
  title: 'Azure Monitor, Application Insights and alerting for DevOps',
  domainId: 'az4-instrumentation',
  difficulty: 'intermediate',
  estimatedMinutes: 35,
  order: 1,
  tags: [
    'azure-monitor',
    'application-insights',
    'opentelemetry',
    'distributed-tracing',
    'vm-insights',
    'container-insights',
    'alerts',
    'action-groups',
    'github-insights',
  ],
  oneLiner:
    'Instrument applications with Application Insights and OpenTelemetry, trace requests across services, monitor VMs and containers with insights, and alert on both workloads and pipeline runs.',
  explanation: [
    '**Azure Monitor** is the umbrella service for observability in Azure. It collects two kinds of data. **Metrics** are numeric time series, lightweight and near real time (CPU percentage, request count). **Logs** are rich records stored in a **Log Analytics workspace** and queried with KQL (request details, exceptions, traces, container logs). Alerts, workbooks, dashboards and autoscale all build on these.',
    '**Application Insights** is the application performance monitoring (APM) feature of Azure Monitor. A **workspace-based** Application Insights resource stores its telemetry in a Log Analytics workspace, in tables such as `AppRequests`, `AppDependencies`, `AppExceptions`, `AppTraces` and `AppPageViews` (the classic query names are `requests`, `dependencies`, `exceptions`, `traces`). You send telemetry with the **Azure Monitor OpenTelemetry Distro**, the recommended SDK for .NET, Java, Node.js and Python, configured with a **connection string** (not the legacy instrumentation key). App Service and Functions can also enable auto-instrumentation without code changes.',
    '**Distributed tracing** follows one user request across many services. OpenTelemetry propagates a W3C **traceparent** header, so every request, dependency call and log line shares an **operation id** (trace id). The **Application map** draws the components and their calls with failure rates, and the **transaction search** and end-to-end transaction view show the whole call tree, which is how you find which downstream service made a request slow.',
    'For infrastructure, **VM insights** (using the **Azure Monitor Agent** and a data collection rule) shows CPU, memory, disk and network, plus an optional dependency map; **Container insights** collects AKS node and pod metrics, container logs and Kubernetes events, and pairs with **Azure Monitor managed service for Prometheus** and **Azure Managed Grafana**. **Storage insights** and **Network insights** give ready-made views for those resources. **Alerts** (metric, log search, activity log, smart detection) fire into **action groups** that email, SMS, call a webhook, trigger a Logic App or Function, or create an incident. For the delivery pipeline itself, Azure Pipelines can notify on failures and use Azure Monitor alerts as a deployment gate, and GitHub Actions can notify through workflow_run webhooks and conditional jobs; GitHub also provides repository **Insights** (pulse, contributors, traffic) and custom charts in GitHub Projects.',
  ],
  whyItMatters: [
    'The instrumentation domain is small but precise. You will be asked which Application Insights feature answers "which dependency made the request slow" (end-to-end transaction or application map), which agent to use (Azure Monitor Agent), or which alert type to configure for a given signal.',
    'Monitoring closes the DevOps loop. Deployment frequency means little if you cannot tell within minutes whether a release increased failures. Release annotations, alerts on failure rate and pipeline gates driven by Azure Monitor alerts turn monitoring into a safety net for continuous delivery.',
    'Standardising on OpenTelemetry avoids lock-in and lets the same instrumentation feed Application Insights today and other backends later.',
  ],
  howItWorks: [
    'Create a Log Analytics workspace and a workspace-based Application Insights component that points at it. Give the app the **connection string**, usually via the `APPLICATIONINSIGHTS_CONNECTION_STRING` app setting or environment variable.',
    'In code, call the distro once at startup, for example `builder.Services.AddOpenTelemetry().UseAzureMonitor()` in ASP.NET Core or `useAzureMonitor()` in Node.js. Incoming HTTP requests, outgoing HTTP and SQL calls, exceptions and logs are collected automatically; add custom spans, metrics and attributes with the standard OpenTelemetry APIs.',
    'Sampling reduces volume: the distro supports fixed-rate sampling, and ingestion sampling can be set on the resource. Sampling is trace-aware, so a trace is kept or dropped as a whole and the end-to-end view stays intact.',
    '**Availability tests** (standard tests) ping URLs from multiple Azure regions and alert when a threshold of locations fails. **Live metrics** show a real-time stream during a deployment. **Smart detection** and **failure anomalies** flag unusual failure rates automatically.',
    '**VM and container monitoring**: deploy the Azure Monitor Agent through an Azure Policy initiative or VM insights onboarding; a **data collection rule (DCR)** defines which performance counters and logs go to which workspace. For AKS, enable the monitoring add-on (Container insights) and managed Prometheus, which also use DCRs.',
    '**Alert rules** have a scope, a condition (metric threshold, dynamic threshold, or a KQL log search evaluated on a schedule), and actions via **action groups**. **Alert processing rules** can suppress notifications during planned maintenance. In Azure Pipelines, the **Query Azure Monitor alerts** check on an environment blocks or rolls forward a deployment based on alert state; in GitHub, a job with `if: failure()` or a workflow_run webhook can notify Teams or open an issue.',
  ],
  diagrams: [
    {
      kind: 'sequence',
      title: 'One request traced across two services',
      caption:
        'The traceparent header carries the operation id, so Application Insights can stitch the call tree back together.',
      participants: [
        { id: 'user', label: 'Browser' },
        { id: 'web', label: 'Web front end' },
        { id: 'api', label: 'Orders API' },
        { id: 'ai', label: 'Application Insights' },
      ],
      messages: [
        { from: 'user', to: 'web', label: 'GET /checkout' },
        { from: 'web', to: 'api', label: 'POST /orders with traceparent' },
        { from: 'api', to: 'web', label: '201 after slow SQL call', kind: 'return' },
        { from: 'web', to: 'user', label: '200 OK', kind: 'return' },
        { from: 'api', to: 'ai', label: 'Request and dependency spans' },
        { from: 'web', to: 'ai', label: 'Request span, same operation id' },
      ],
    },
    {
      kind: 'nested',
      title: 'Where Azure Monitor data lives',
      caption:
        'Application Insights, VM insights and Container insights all land in a Log Analytics workspace, so one KQL query can join them.',
      root: {
        label: 'Azure Monitor',
        children: [
          {
            label: 'Metrics store',
            detail: 'Numeric time series, fast alerts',
            children: [{ label: 'Platform and custom metrics' }],
          },
          {
            label: 'Log Analytics workspace',
            detail: 'KQL, log alerts, workbooks',
            tone: 'accent',
            children: [
              { label: 'AppRequests, AppDependencies', detail: 'Application Insights' },
              { label: 'InsightsMetrics, Perf', detail: 'VM insights via AMA' },
              { label: 'ContainerLogV2, KubePodInventory', detail: 'Container insights' },
            ],
          },
          { label: 'Action groups', detail: 'Email, webhook, Logic App', tone: 'warning' },
        ],
      },
    },
  ],
  keyObjects: [
    {
      kind: 'Application Insights component (Microsoft.Insights/components)',
      apiVersion: '2020-02-02',
      purpose: 'Workspace-based APM resource that receives application telemetry.',
      fields: [
        { path: 'kind', meaning: 'Usually web.', required: true },
        { path: 'properties.Application_Type', meaning: 'web or other.', required: true },
        {
          path: 'properties.WorkspaceResourceId',
          meaning: 'Log Analytics workspace that stores the data.',
          required: true,
        },
        {
          path: 'properties.ConnectionString',
          meaning: 'Read-only output the app uses to send telemetry.',
        },
        { path: 'properties.SamplingPercentage', meaning: 'Ingestion sampling percentage.' },
      ],
    },
    {
      kind: 'Scheduled query rule (Microsoft.Insights/scheduledQueryRules)',
      apiVersion: '2023-03-15-preview',
      purpose:
        'Log search alert: runs a KQL query on a schedule and fires when the result meets a condition.',
      fields: [
        {
          path: 'properties.scopes',
          meaning: 'Workspace or Application Insights resource.',
          required: true,
        },
        { path: 'properties.evaluationFrequency', meaning: 'How often the query runs, e.g. PT5M.' },
        { path: 'properties.windowSize', meaning: 'Time range the query covers.' },
        { path: 'properties.criteria.allOf[].query', meaning: 'The KQL query.' },
        { path: 'properties.actions.actionGroups', meaning: 'Action groups to notify.' },
      ],
    },
    {
      kind: 'Action group (Microsoft.Insights/actionGroups)',
      apiVersion: '2023-01-01',
      purpose: 'Reusable set of notifications and automated actions for alerts.',
      fields: [
        {
          path: 'properties.groupShortName',
          meaning: 'Up to 12 characters, shown in SMS and email.',
          required: true,
        },
        { path: 'properties.emailReceivers', meaning: 'Email notifications.' },
        {
          path: 'properties.webhookReceivers',
          meaning: 'HTTP endpoints such as a Teams workflow or ITSM tool.',
        },
        { path: 'properties.logicAppReceivers', meaning: 'Logic Apps for custom automation.' },
      ],
    },
  ],
  realWorldExample: {
    title: 'Finding the slow hop in checkout',
    story: [
      'An online shop saw checkout latency jump from about 400 ms to over 3 seconds after a Tuesday release, but only for some customers. CPU on every service looked normal.',
      'Because every service used the Azure Monitor OpenTelemetry Distro and shared one workspace, the on-call engineer opened the Application map and saw the Orders API calling an inventory service with a sharply higher dependency duration. The end-to-end transaction for a slow request showed the inventory call making dozens of sequential SQL queries, a classic N plus one pattern introduced by the release.',
      'A release annotation on the chart lined up exactly with the regression, and the deployment was linked to the pipeline run and its PR. The team rolled back with a slot swap, fixed the query, and redeployed.',
      'Afterwards they added a log search alert on the 95th percentile duration of the checkout operation and wired it as a Query Azure Monitor alerts check on the production environment, so the next regression would stop a rollout at the first ring rather than reaching every customer.',
    ],
  },
  yamlExamples: [
    {
      title: 'Bicep: workspace-based Application Insights and an action group',
      language: 'bicep',
      code: `param location string = resourceGroup().location

resource law 'Microsoft.OperationalInsights/workspaces@2023-09-01' = {
  name: 'law-web-prod'
  location: location
  properties: {
    sku: { name: 'PerGB2018' }
    retentionInDays: 30
  }
}

resource appi 'Microsoft.Insights/components@2020-02-02' = {
  name: 'appi-web-prod'
  location: location
  kind: 'web'
  properties: {
    Application_Type: 'web'
    WorkspaceResourceId: law.id
  }
}

resource ag 'Microsoft.Insights/actionGroups@2023-01-01' = {
  name: 'ag-web-oncall'
  location: 'global'
  properties: {
    groupShortName: 'weboncall'
    enabled: true
    emailReceivers: [
      { name: 'oncall', emailAddress: 'oncall@contoso.com', useCommonAlertSchema: true }
    ]
  }
}

output connectionString string = appi.properties.ConnectionString`,
    },
    {
      title: 'Node.js: enable the Azure Monitor OpenTelemetry Distro',
      language: 'text',
      explanation: 'Call it before other imports so HTTP and database libraries are patched.',
      code: `// index.js
const { useAzureMonitor } = require('@azure/monitor-opentelemetry');
useAzureMonitor({
  azureMonitorExporterOptions: {
    connectionString: process.env.APPLICATIONINSIGHTS_CONNECTION_STRING
  }
});

const express = require('express');
const app = express();
app.get('/health', (req, res) => res.send('ok'));
app.listen(8080);`,
    },
    {
      title: 'Azure Pipelines: notify on failure from a pipeline',
      language: 'yaml',
      explanation:
        'A final job that runs only when a previous stage failed, calling a webhook stored as a secret variable.',
      code: `stages:
  - stage: Deploy
    jobs:
      - job: Deploy
        steps:
          - script: ./deploy.sh

  - stage: Notify
    dependsOn: Deploy
    condition: failed()
    jobs:
      - job: Alert
        steps:
          - script: |
              curl -sS -X POST -H "Content-Type: application/json" \\
                -d '{"text":"Deploy failed: $(System.CollectionUri)$(System.TeamProject)/_build/results?buildId=$(Build.BuildId)"}' \\
                "$(TEAMS_WEBHOOK_URL)"`,
    },
  ],
  imperative: [
    {
      command: 'az monitor log-analytics workspace create -g rg-mon -n law-web-prod -l westeurope',
      what: 'Creates the Log Analytics workspace that will store logs and Application Insights data.',
    },
    {
      command:
        'az monitor app-insights component create --app appi-web-prod -g rg-mon -l westeurope --workspace law-web-prod --application-type web',
      what: 'Creates a workspace-based Application Insights resource.',
      expected: 'JSON including connectionString.',
      namespaceNote:
        'Requires the application-insights CLI extension, which az installs on first use.',
    },
    {
      command:
        'az webapp config appsettings set -g rg-web -n <app-name> --settings APPLICATIONINSIGHTS_CONNECTION_STRING="<connection-string>"',
      what: 'Gives an App Service app its Application Insights connection string.',
      placeholders: ['<app-name>', '<connection-string>'],
    },
    {
      command:
        'az monitor action-group create -g rg-mon -n ag-web-oncall --short-name weboncall --action email oncall oncall@contoso.com',
      what: 'Creates an action group that emails the on-call alias.',
    },
    {
      command:
        'az monitor metrics alert create -g rg-mon -n high-5xx --scopes <app-resource-id> --condition "total Http5xx > 10" --window-size 5m --evaluation-frequency 1m --action ag-web-oncall',
      what: 'Metric alert on App Service 5xx errors.',
      placeholders: ['<app-resource-id>'],
    },
    {
      command:
        'az aks enable-addons -g rg-aks -n aks-prod -a monitoring --workspace-resource-id <workspace-id>',
      what: 'Enables Container insights on an AKS cluster.',
      placeholders: ['<workspace-id>'],
    },
  ],
  declarative: {
    steps: [
      'Deploy the workspace, Application Insights and action groups with Bicep alongside the app.',
      'Pass the connection string to the app as a setting, never commit it.',
      'Assign the Azure Monitor Agent and DCRs through Azure Policy for VMs.',
      'Define alert rules in Bicep so they are reviewed and consistent across environments.',
    ],
    code: [
      {
        title: 'Bicep: log search alert on failed requests',
        language: 'bicep',
        code: `param appInsightsId string
param actionGroupId string
param location string = resourceGroup().location

resource failedRequests 'Microsoft.Insights/scheduledQueryRules@2023-03-15-preview' = {
  name: 'web-failed-requests'
  location: location
  properties: {
    severity: 2
    enabled: true
    scopes: [ appInsightsId ]
    evaluationFrequency: 'PT5M'
    windowSize: 'PT15M'
    criteria: {
      allOf: [
        {
          query: 'requests | where success == false | summarize failures = count()'
          timeAggregation: 'Total'
          metricMeasureColumn: 'failures'
          operator: 'GreaterThan'
          threshold: 20
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
        'az monitor app-insights query --app appi-web-prod -g rg-mon --analytics-query "requests | where timestamp > ago(15m) | count"',
      what: 'Confirms requests are arriving in Application Insights.',
      expected: 'A count greater than zero after traffic.',
    },
    {
      command: 'az monitor metrics alert list -g rg-mon -o table',
      what: 'Lists metric alert rules and whether they are enabled.',
    },
    {
      command: 'az monitor data-collection rule list -g rg-mon -o table',
      what: 'Lists data collection rules used by the Azure Monitor Agent.',
    },
  ],
  troubleshooting: [
    {
      command:
        'az webapp config appsettings list -g rg-web -n <app-name> --query "[?name==\'APPLICATIONINSIGHTS_CONNECTION_STRING\']"',
      what: 'No telemetry: confirm the connection string setting exists and points to the right resource.',
      placeholders: ['<app-name>'],
    },
    {
      command: 'az vm extension list -g rg-vm --vm-name <vm-name> -o table',
      what: 'VM insights empty: confirm AzureMonitorLinuxAgent or AzureMonitorWindowsAgent is installed and provisioned, and a DCR is associated.',
      placeholders: ['<vm-name>'],
    },
    {
      command:
        'az monitor activity-log list --resource-group rg-mon --offset 1h --query "[?contains(operationName.value, \'alertRules\')]"',
      what: 'Alert never fires: check for recent changes to the rule, then test the KQL in the workspace to see whether it returns rows.',
    },
  ],
  commonMistakes: [
    'Using the instrumentation key instead of the connection string. New SDKs and regional endpoints require the connection string.',
    'Creating classic (non-workspace) Application Insights. Classic resources are retired; use workspace-based.',
    'Installing the legacy Log Analytics agent (MMA). It is retired; the Azure Monitor Agent with DCRs is the current agent.',
    'Setting a metric alert where the signal only exists in logs, or a log alert with a window shorter than ingestion latency.',
    'Sampling without understanding it, then trusting raw counts. Use itemCount or the portal adjusted counts.',
  ],
  examTips: [
    'Find which downstream call is slow: Application map or end-to-end transaction details.',
    'Check a public endpoint from several regions: standard availability test.',
    'VM CPU, memory, disk and network plus dependency map: VM insights with Azure Monitor Agent.',
    'AKS node and pod health, container logs: Container insights (plus managed Prometheus for metrics).',
    'Stop a deployment if production alerts are firing: the Query Azure Monitor alerts check or gate on the environment.',
  ],
  summary: [
    'Azure Monitor collects metrics and logs; Log Analytics stores logs for KQL.',
    'Application Insights is APM, fed by the Azure Monitor OpenTelemetry Distro using a connection string.',
    'Distributed tracing uses a shared operation id to rebuild cross-service calls.',
    'VM insights and Container insights use the Azure Monitor Agent and DCRs.',
    'Alerts plus action groups notify people and systems, and can gate pipelines.',
  ],
  practice: [
    {
      id: 'az4-app-insights-monitoring-p1',
      level: 'beginner',
      prompt:
        'What setting does an app need to send telemetry to a workspace-based Application Insights resource?',
      answer:
        'The Application Insights connection string, usually in APPLICATIONINSIGHTS_CONNECTION_STRING.',
      explanation:
        'The connection string includes the ingestion endpoint and is required by the OpenTelemetry distro.',
    },
    {
      id: 'az4-app-insights-monitoring-p2',
      level: 'intermediate',
      prompt:
        'Users report slow page loads; which Application Insights views help identify the responsible service?',
      answer:
        'The Application map to see dependency durations between components, and the end-to-end transaction details for a slow operation.',
      explanation: 'Both rely on distributed tracing and a shared operation id.',
    },
    {
      id: 'az4-app-insights-monitoring-p3',
      level: 'intermediate',
      prompt:
        'How can an Azure Pipelines deployment stop automatically if production alerts are firing?',
      answer:
        'Add the Query Azure Monitor alerts check to the environment (or a release gate) so the deployment waits or fails while alerts are active.',
      explanation: 'Checks on environments are evaluated before deployment jobs run.',
    },
    {
      id: 'az4-app-insights-monitoring-p4',
      level: 'advanced',
      prompt:
        'Why is sampling in Application Insights called trace-aware, and why does that matter?',
      answer:
        'The sampling decision is made per trace, so all telemetry of a sampled operation is kept together; the end-to-end view stays complete.',
      explanation: 'Per-item random sampling would leave traces with missing spans.',
    },
  ],
  lab: {
    title: 'Instrument an App Service app and alert on failures',
    scenario:
      'Deploy a small Node.js app to App Service, send telemetry to workspace-based Application Insights, generate failures and receive an alert.',
    prerequisites: [
      'An Azure subscription (free account) and Cloud Shell',
      'Node.js sample code or the snippet in this lesson',
    ],
    tasks: [
      {
        instruction:
          'Create resource group `rg-lab-mon`, a Log Analytics workspace and a workspace-based Application Insights resource.',
      },
      {
        instruction:
          'Create a Linux App Service (free or basic tier) running Node.js and set the connection string app setting.',
      },
      {
        instruction:
          'Deploy an app that uses `useAzureMonitor()` and has a `/fail` route returning 500.',
      },
      {
        instruction:
          'Generate traffic including failures, then query `requests` for failed requests.',
      },
      {
        instruction:
          'Create an action group that emails you and a log search alert on failed requests.',
      },
      { instruction: 'Trigger failures again and confirm the alert email arrives.' },
    ],
    solution: [
      {
        title: 'Infrastructure',
        language: 'bash',
        code: `az group create -n rg-lab-mon -l westeurope
az monitor log-analytics workspace create -g rg-lab-mon -n law-lab
az monitor app-insights component create --app appi-lab -g rg-lab-mon \\
  -l westeurope --workspace law-lab --application-type web
CS=$(az monitor app-insights component show --app appi-lab -g rg-lab-mon --query connectionString -o tsv)

az appservice plan create -g rg-lab-mon -n plan-lab --is-linux --sku B1
az webapp create -g rg-lab-mon -p plan-lab -n <unique-app-name> --runtime "NODE:22-lts"
az webapp config appsettings set -g rg-lab-mon -n <unique-app-name> \\
  --settings APPLICATIONINSIGHTS_CONNECTION_STRING="$CS"`,
      },
      {
        title: 'Traffic, query and alert',
        language: 'bash',
        code: `for i in $(seq 1 30); do curl -s https://<unique-app-name>.azurewebsites.net/fail > /dev/null; done

az monitor app-insights query --app appi-lab -g rg-lab-mon \\
  --analytics-query "requests | where success == false | summarize count() by resultCode"

az monitor action-group create -g rg-lab-mon -n ag-lab --short-name lab \\
  --action email me <you@example.com>
az monitor scheduled-query create -g rg-lab-mon -n lab-failures \\
  --scopes $(az monitor app-insights component show --app appi-lab -g rg-lab-mon --query id -o tsv) \\
  --condition "count 'Failed' > 5" \\
  --condition-query Failed="requests | where success == false" \\
  --evaluation-frequency 5m --window-size 15m --action-groups ag-lab`,
      },
    ],
    verification: [
      {
        command: 'az monitor scheduled-query show -g rg-lab-mon -n lab-failures --query enabled',
        what: 'The alert rule exists and is enabled.',
        expected: 'true',
      },
      {
        command:
          'az monitor app-insights query --app appi-lab -g rg-lab-mon --analytics-query "requests | where success == false | count"',
        what: 'Failed requests are visible.',
        expected: 'Count of about 30',
      },
    ],
    cleanup: [
      {
        command: 'az group delete -n rg-lab-mon --yes --no-wait',
        what: 'Deletes the app, plan, Application Insights, workspace, action group and alert.',
      },
    ],
  },
  relatedTopicIds: [
    'az4-kql-analysis',
    'az4-environments-approvals',
    'az4-deployment-strategies',
    'az4-docs-integration',
  ],
  docs: [
    {
      title: 'Application Insights overview',
      url: 'https://learn.microsoft.com/azure/azure-monitor/app/app-insights-overview',
    },
    {
      title: 'Enable Azure Monitor OpenTelemetry',
      url: 'https://learn.microsoft.com/azure/azure-monitor/app/opentelemetry-enable',
    },
    {
      title: 'Distributed tracing and telemetry correlation',
      url: 'https://learn.microsoft.com/azure/azure-monitor/app/distributed-trace-data',
    },
    {
      title: 'VM insights overview',
      url: 'https://learn.microsoft.com/azure/azure-monitor/vm/vminsights-overview',
    },
    {
      title: 'Container insights overview',
      url: 'https://learn.microsoft.com/azure/azure-monitor/containers/container-insights-overview',
    },
  ],
}
