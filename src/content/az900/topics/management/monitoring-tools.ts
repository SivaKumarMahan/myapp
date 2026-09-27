import type { Topic } from '../../../types'

export const monitoringTools: Topic = {
  id: 'az9-monitoring-tools',
  title: 'Monitoring tools: Advisor, Service Health, Azure Monitor and Application Insights',
  domainId: 'az9-management',
  difficulty: 'advanced',
  estimatedMinutes: 24,
  order: 4,
  tags: [
    'azure advisor',
    'service health',
    'azure monitor',
    'log analytics',
    'alerts',
    'application insights',
    'kql',
  ],
  oneLiner:
    'Advisor tells you what to improve, Service Health tells you what Azure is doing, and Azure Monitor tells you what your own resources and apps are doing.',
  explanation: [
    '**Azure Advisor** is a free, personalised consultant. It analyses your resource configuration and usage and makes recommendations in five categories: **Reliability**, **Security**, **Performance**, **Cost** and **Operational excellence**. Examples: "right-size or shut down underused VMs", "enable soft delete on this storage account", "add a second instance for higher availability".',
    '**Azure Service Health** tells you about Azure itself. It combines three views: **Azure status** (a global view of outages across all regions, public at status.azure.com), **Service Health** (a personalised view of incidents, planned maintenance, health advisories and security advisories that affect the services and regions you use), and **Resource Health** (whether each of your individual resources is available right now, and its history).',
    '**Azure Monitor** is the platform for collecting, analysing and acting on telemetry from your Azure resources, on-premises machines and applications. It gathers **metrics** (numbers sampled over time, such as CPU percentage) and **logs** (records of events, stored in a **Log Analytics workspace** and queried with **Kusto Query Language, KQL**). **Alerts** watch metrics or log queries and notify people or trigger automation through **action groups**.',
    '**Application Insights** is the application performance monitoring (APM) feature of Azure Monitor. Instrumented with OpenTelemetry-based SDKs or auto-instrumentation, it tracks request rates, response times, failure rates, dependencies, exceptions, page views and availability tests, and shows how requests flow between components.',
  ],
  whyItMatters: [
    'Monitoring tools are a full objective in the management domain. Classic exam questions describe a need - "notify me about planned maintenance in my region", "recommend cost savings", "track page load times" - and ask which tool meets it.',
    'Confusing Service Health (Azure problems) with Azure Monitor (your problems) is the most common mistake. In an incident, the first question is always which side is failing.',
    'Advisor is free and runs continuously. Reviewing its recommendations is one of the quickest ways to cut cost and fix risky configurations.',
  ],
  howItWorks: [
    'Advisor evaluates resources against best practices using configuration and usage telemetry. Each recommendation has an impact rating and a suggested action; you can postpone or dismiss them. The Advisor **score** summarises how well you follow recommendations per category.',
    'Service Health events are scoped to your subscriptions. You can create **Service Health alerts** so the right people are notified by email, SMS or webhook when an incident or planned maintenance affects a service and region you use. Resource Health reports states such as Available, Unavailable, Degraded or Unknown per resource.',
    'Azure Monitor collects **platform metrics** automatically for most resources. **Activity logs** record control-plane operations (who created or deleted what) at subscription level. **Resource logs** and guest OS data need configuration: **diagnostic settings** route resource logs to a Log Analytics workspace, and the **Azure Monitor Agent** with a **data collection rule** collects data from inside VMs.',
    'In Log Analytics you query with KQL, for example filtering failed requests and counting them per hour. Queries power workbooks, dashboards and log alerts.',
    '**Alert rules** define a condition on a metric, log query or activity log event. When it fires, an **action group** sends notifications (email, SMS, push, voice) or runs actions (Logic Apps, Functions, webhooks, Automation runbooks).',
    'Application Insights stores its telemetry in a Log Analytics workspace. Its application map, live metrics, failures and performance views are built on that data, and **availability tests** probe your endpoints from locations around the world.',
  ],
  diagrams: [
    {
      kind: 'decision',
      title: 'Which monitoring tool answers the question?',
      caption:
        'Advisor recommends, Service Health reports on Azure, Azure Monitor reports on your workloads.',
      question: 'What do you need to know?',
      branches: [
        {
          condition: 'how to improve cost, security or reliability',
          result: 'Azure Advisor',
          detail: 'Personalised recommendations',
          tone: 'accent',
        },
        {
          condition: 'is Azure having an incident or maintenance',
          result: 'Service Health',
          detail: 'For your services and regions',
          tone: 'warning',
        },
        {
          condition: 'is this one resource available',
          result: 'Resource Health',
          detail: 'Per-resource availability',
        },
        {
          condition: 'CPU, logs and alerts for my resources',
          result: 'Azure Monitor',
          detail: 'Metrics, Log Analytics, alerts',
          tone: 'success',
        },
        {
          condition: 'response times and failures in my app',
          result: 'Application Insights',
          detail: 'APM within Azure Monitor',
        },
      ],
    },
    {
      kind: 'flow',
      title: 'From telemetry to a notification',
      caption:
        'Data flows in, is stored as metrics or logs, and alert rules turn it into action through action groups.',
      nodes: [
        {
          label: 'Sources',
          detail: 'Resources, VMs, apps, activity log',
          tone: 'muted',
        },
        {
          label: 'Metrics and logs',
          detail: 'Metrics store and Log Analytics workspace',
          arrowLabel: 'diagnostic settings, agent',
        },
        {
          label: 'Analyse',
          detail: 'Metrics explorer, KQL, workbooks',
          tone: 'accent',
        },
        {
          label: 'Alert rule fires',
          detail: 'Condition met on metric or query',
          tone: 'warning',
        },
        {
          label: 'Action group',
          detail: 'Email, SMS, webhook, runbook',
          tone: 'success',
        },
      ],
    },
  ],
  keyObjects: [
    {
      kind: 'Log Analytics workspace (Microsoft.OperationalInsights/workspaces)',
      apiVersion: '2023-09-01',
      purpose: 'Where Azure Monitor logs and Application Insights data are stored and queried.',
      fields: [
        {
          path: 'properties.retentionInDays',
          meaning: 'How long data is kept for interactive query.',
        },
        {
          path: 'properties.sku.name',
          meaning: 'Pricing tier, typically PerGB2018 (pay as you go).',
        },
      ],
    },
    {
      kind: 'Metric alert rule (Microsoft.Insights/metricAlerts)',
      apiVersion: '2018-03-01',
      purpose: 'Fires when a metric crosses a threshold.',
      fields: [
        { path: 'properties.scopes', meaning: 'Resources the rule watches.', required: true },
        {
          path: 'properties.criteria',
          meaning: 'Metric, operator, threshold and aggregation.',
          required: true,
        },
        { path: 'properties.actions[].actionGroupId', meaning: 'Who or what is notified.' },
        { path: 'properties.severity', meaning: '0 (critical) to 4 (verbose).' },
      ],
    },
    {
      kind: 'Action group (Microsoft.Insights/actionGroups)',
      apiVersion: '2023-01-01',
      purpose: 'A reusable list of notifications and actions triggered by alerts.',
      fields: [
        {
          path: 'properties.groupShortName',
          meaning: 'Up to 12 characters, shown in SMS and email.',
          required: true,
        },
        { path: 'properties.emailReceivers', meaning: 'Email addresses to notify.' },
        { path: 'properties.webhookReceivers', meaning: 'Endpoints to call.' },
      ],
    },
    {
      kind: 'Application Insights component (Microsoft.Insights/components)',
      apiVersion: '2020-02-02',
      purpose: 'APM resource for an application, backed by a Log Analytics workspace.',
      fields: [
        {
          path: 'properties.WorkspaceResourceId',
          meaning: 'The workspace that stores the telemetry.',
        },
        {
          path: 'properties.ConnectionString',
          meaning: 'What the app uses to send telemetry - treat as configuration, not code.',
        },
      ],
    },
  ],
  realWorldExample: {
    title: 'Whose outage is it?',
    story: [
      'At 09:10 a retail web app started returning errors. The on-call engineer opened Application Insights: failure rate had jumped, and the failures view showed every failed request timing out on a call to the SQL database dependency.',
      'The next stop was Service Health. It showed an active incident for Azure SQL Database in the app region, with Microsoft engineers already mitigating. Resource Health for the database showed Degraded. It was not the team code.',
      'The team posted the Service Health incident link to its status page instead of debugging for an hour. After recovery they made two changes: a Service Health alert so incidents for their regions page the on-call rotation, and an Advisor recommendation they had been postponing - configure geo-replication for the database - was finally implemented.',
      'Their metric alert on HTTP 5xx errors had fired within two minutes, which is why the engineer was looking within minutes. Monitoring had done exactly its job: detect, locate, and tell them which side of the shared responsibility line the problem sat on.',
    ],
  },
  yamlExamples: [
    {
      title: 'A KQL query for failed requests per hour',
      language: 'text',
      explanation:
        'Run in Log Analytics or Application Insights Logs. It filters failed requests in the last day, counts them in hourly bins and draws a chart.',
      code: `AppRequests
| where TimeGenerated > ago(1d)
| where Success == false
| summarize failures = count() by bin(TimeGenerated, 1h), Name
| order by TimeGenerated asc
| render timechart`,
    },
    {
      title: 'An action group and CPU alert in Bicep',
      language: 'bicep',
      explanation:
        'Alerts when average CPU on a VM is over 80% for 15 minutes and emails the operations team.',
      code: `param vmId string
param opsEmail string

resource ag 'Microsoft.Insights/actionGroups@2023-01-01' = {
  name: 'ag-ops'
  location: 'global'
  properties: {
    groupShortName: 'ops'
    enabled: true
    emailReceivers: [
      { name: 'ops-email', emailAddress: opsEmail, useCommonAlertSchema: true }
    ]
  }
}

resource cpuAlert 'Microsoft.Insights/metricAlerts@2018-03-01' = {
  name: 'vm-high-cpu'
  location: 'global'
  properties: {
    severity: 2
    enabled: true
    scopes: [ vmId ]
    evaluationFrequency: 'PT5M'
    windowSize: 'PT15M'
    criteria: {
      'odata.type': 'Microsoft.Azure.Monitor.SingleResourceMultipleMetricCriteria'
      allOf: [
        {
          name: 'cpu'
          metricName: 'Percentage CPU'
          operator: 'GreaterThan'
          threshold: 80
          timeAggregation: 'Average'
          criterionType: 'StaticThresholdCriterion'
        }
      ]
    }
    actions: [ { actionGroupId: ag.id } ]
  }
}`,
      placeholders: ['opsEmail'],
    },
  ],
  imperative: [
    {
      command: 'az advisor recommendation list --category Cost -o table',
      what: 'Lists Advisor cost recommendations for the subscription.',
    },
    {
      command:
        'az monitor action-group create -g rg-az900-mon -n ag-ops --short-name ops --action email ops <ops-email>',
      what: 'Creates an action group that emails the operations team.',
      placeholders: ['<ops-email>'],
    },
    {
      command:
        'az monitor metrics alert create -g rg-az900-mon -n vm-high-cpu --scopes <vm-id> --condition "avg Percentage CPU > 80" --window-size 15m --evaluation-frequency 5m --action ag-ops',
      what: 'Creates a metric alert on VM CPU that notifies the action group.',
      placeholders: ['<vm-id>'],
    },
    {
      command: 'az monitor log-analytics workspace create -g rg-az900-mon -n law-az900',
      what: 'Creates a Log Analytics workspace for logs.',
    },
    {
      command: 'Get-AzAdvisorRecommendation -Category Security',
      what: 'PowerShell: lists Advisor security recommendations.',
    },
  ],
  declarative: {
    steps: [
      'Create a resource group and a small VM to monitor.',
      'Write the action group and metric alert in Bicep.',
      'Deploy, passing the VM id and your email.',
      'Confirm the email confirmation from Azure Monitor that you were added to the action group.',
    ],
    code: [
      {
        title: 'Deploy the alert',
        language: 'bash',
        code: `VM_ID=$(az vm show -g rg-az900-mon -n vm-mon --query id -o tsv)
az deployment group create -g rg-az900-mon --template-file alerts.bicep \\
  --parameters vmId="$VM_ID" opsEmail=<you@example.com>`,
        placeholders: ['<you@example.com>'],
      },
    ],
  },
  verification: [
    {
      command: 'az monitor metrics alert list -g rg-az900-mon -o table',
      what: 'Lists metric alert rules in the group.',
      expected: 'vm-high-cpu  Enabled',
    },
    {
      command:
        'az monitor metrics list --resource <vm-id> --metric "Percentage CPU" --interval PT5M -o table',
      what: 'Shows the raw metric the alert evaluates.',
      placeholders: ['<vm-id>'],
    },
    {
      command: 'az monitor activity-log list -g rg-az900-mon --offset 1h -o table',
      what: 'Shows recent control-plane operations - who created what.',
    },
  ],
  troubleshooting: [
    {
      command:
        'az resource show --ids <vm-id>/providers/Microsoft.ResourceHealth/availabilityStatuses/current --query properties.availabilityState',
      what: 'Checks Resource Health for a single resource when it is unreachable.',
      expected: '"Available"',
      placeholders: ['<vm-id>'],
    },
    {
      command: 'az monitor diagnostic-settings list --resource <resource-id>',
      what: 'If logs are missing from Log Analytics, confirm a diagnostic setting routes them there.',
      placeholders: ['<resource-id>'],
    },
    {
      command:
        'az monitor log-analytics query -w <workspace-guid> --analytics-query "Heartbeat | summarize max(TimeGenerated) by Computer"',
      what: 'Checks whether VMs with the Azure Monitor Agent are still reporting.',
      placeholders: ['<workspace-guid>'],
    },
  ],
  commonMistakes: [
    'Using Azure Monitor to learn about Azure platform outages. That is Service Health.',
    'Expecting Advisor to fix problems automatically. It recommends; you act (some recommendations offer a quick fix button).',
    'Assuming resource logs are collected by default. Platform metrics are; resource logs need a diagnostic setting.',
    'Confusing Application Insights with Log Analytics. Application Insights is APM for apps; Log Analytics is the log store and query tool it uses.',
    'Installing the legacy Log Analytics agent. The Azure Monitor Agent with data collection rules is the current agent.',
  ],
  examTips: [
    'Advisor categories: Reliability, Security, Performance, Cost, Operational excellence.',
    'Service Health = Azure status (global) + Service Health (your services) + Resource Health (your resources).',
    'Azure Monitor collects metrics and logs; Log Analytics queries logs with KQL; alerts use action groups.',
    'Application Insights monitors web application performance, availability and usage.',
    'If the scenario says "planned maintenance" or "Azure outage affecting my region", answer Service Health.',
  ],
  summary: [
    'Azure Advisor gives free, personalised best-practice recommendations in five categories.',
    'Service Health reports Azure incidents, maintenance and advisories; Resource Health reports each resource.',
    'Azure Monitor collects metrics and logs from Azure, on-premises and apps.',
    'Log Analytics stores logs and queries them with KQL; alerts notify through action groups.',
    'Application Insights provides application performance monitoring within Azure Monitor.',
  ],
  practice: [
    {
      id: 'az9-monitoring-tools-p1',
      level: 'beginner',
      prompt:
        'You want to be emailed when Microsoft schedules maintenance affecting VMs in your region. Which tool do you configure?',
      answer:
        'Azure Service Health, by creating a Service Health alert for planned maintenance on Virtual Machines in that region.',
    },
    {
      id: 'az9-monitoring-tools-p2',
      level: 'beginner',
      prompt: 'Name the five Azure Advisor recommendation categories.',
      answer: 'Reliability, Security, Performance, Cost and Operational excellence.',
    },
    {
      id: 'az9-monitoring-tools-p3',
      level: 'intermediate',
      prompt:
        'What is the relationship between Azure Monitor, Log Analytics and Application Insights?',
      answer:
        'Azure Monitor is the overall platform. Log Analytics is the workspace and query tool where Azure Monitor logs are stored and queried with KQL. Application Insights is the APM feature of Azure Monitor that stores its telemetry in Log Analytics.',
    },
    {
      id: 'az9-monitoring-tools-p4',
      level: 'advanced',
      prompt:
        'A storage account resource logs never appear in your workspace, but its metrics show in the portal. Why?',
      answer:
        'Platform metrics are collected automatically, but resource logs are only sent to Log Analytics when a diagnostic setting is configured for the resource.',
    },
  ],
  lab: {
    title: 'Advice, health and an alert',
    scenario: 'Review Advisor, check Service Health, and build a working CPU alert on a VM.',
    prerequisites: ['An Azure subscription', 'Cloud Shell'],
    tasks: [
      {
        instruction:
          'List Advisor recommendations for your subscription and note one from each category that appears.',
      },
      {
        instruction:
          'Open Service Health in the portal and look at the Health history and Planned maintenance tabs.',
      },
      { instruction: 'Create resource group `rg-az900-mon` and a Standard_B1s Linux VM `vm-mon`.' },
      { instruction: 'Create an action group with your email address.' },
      {
        instruction: 'Create a metric alert on the VM for average CPU over 80% over 15 minutes.',
        hint: 'Use az monitor metrics alert create with --action pointing at the action group.',
      },
      { instruction: 'Check Resource Health for the VM.' },
    ],
    solution: [
      {
        title: 'CLI steps',
        language: 'bash',
        code: `az advisor recommendation list -o table
az group create -n rg-az900-mon -l eastus
az vm create -g rg-az900-mon -n vm-mon --image Ubuntu2204 --size Standard_B1s --generate-ssh-keys
VM_ID=$(az vm show -g rg-az900-mon -n vm-mon --query id -o tsv)
az monitor action-group create -g rg-az900-mon -n ag-ops --short-name ops \\
  --action email me <you@example.com>
az monitor metrics alert create -g rg-az900-mon -n vm-high-cpu --scopes "$VM_ID" \\
  --condition "avg Percentage CPU > 80" --window-size 15m --evaluation-frequency 5m \\
  --action ag-ops`,
        placeholders: ['<you@example.com>'],
      },
    ],
    verification: [
      {
        command:
          'az monitor metrics alert show -g rg-az900-mon -n vm-high-cpu --query "{enabled:enabled, severity:severity}"',
        what: 'Confirms the alert rule exists and is enabled.',
        expected: '{ "enabled": true, "severity": 2 }',
      },
      {
        command:
          'az monitor action-group show -g rg-az900-mon -n ag-ops --query emailReceivers[0].status',
        what: 'Confirms the email receiver is enabled.',
        expected: '"Enabled"',
      },
    ],
    cleanup: [
      {
        command: 'az group delete -n rg-az900-mon --yes --no-wait',
        what: 'Deletes the VM, alert rule and action group.',
      },
    ],
  },
  relatedTopicIds: ['az9-cost-management', 'az9-deployment-tools', 'az9-cloud-benefits'],
  docs: [
    {
      title: 'Introduction to Azure Advisor',
      url: 'https://learn.microsoft.com/azure/advisor/advisor-overview',
    },
    {
      title: 'Azure Service Health overview',
      url: 'https://learn.microsoft.com/azure/service-health/overview',
    },
    {
      title: 'Azure Monitor overview',
      url: 'https://learn.microsoft.com/azure/azure-monitor/overview',
    },
    {
      title: 'Application Insights overview',
      url: 'https://learn.microsoft.com/azure/azure-monitor/app/app-insights-overview',
    },
  ],
}
