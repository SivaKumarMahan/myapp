import type { Topic } from '../../../types'

export const azureMonitor: Topic = {
  id: 'az1-azure-monitor',
  title: 'Azure Monitor: metrics, logs and alerts',
  domainId: 'az1-monitor',
  difficulty: 'intermediate',
  estimatedMinutes: 40,
  order: 1,
  tags: [
    'azure monitor',
    'metrics',
    'log analytics',
    'kql',
    'diagnostic settings',
    'alerts',
    'action groups',
    'azure monitor agent',
    'data collection rules',
  ],
  oneLiner:
    'Collect metrics and logs from every Azure resource, query them with KQL, and turn the interesting ones into alerts that notify people or run automation.',
  explanation: [
    '**Azure Monitor** is the single platform that collects, stores and acts on telemetry for everything in Azure. It works with two kinds of data. **Metrics** are lightweight numeric values sampled over time (CPU percentage, transactions per minute) and are ideal for near real-time charts and fast alerts. **Logs** are structured records with many columns (an audit event, a performance sample, a firewall decision) stored in a **Log Analytics workspace** and queried with **KQL** (Kusto Query Language).',
    'Some data arrives with no configuration at all. **Platform metrics** are collected automatically for most resources and kept for 93 days. The **activity log** records every control plane operation in a subscription (who created, deleted or changed a resource) and is kept for 90 days. Anything else, such as resource logs from inside a service or guest OS data from a VM, must be switched on.',
    'You switch resource logs on with a **diagnostic setting** on the resource. It sends chosen log categories and metrics to one or more destinations: a Log Analytics workspace for querying, a storage account for cheap long-term archive, an Event Hub for streaming to a SIEM or other tool, or a supported partner solution. For VMs and Arc servers, the **Azure Monitor Agent (AMA)** collects guest data according to **data collection rules (DCRs)**. The legacy Log Analytics agent (MMA/OMS) is retired and should not be used in new designs.',
    'Finally, **alert rules** watch the data and fire when a condition is met. They call **action groups** (email, SMS, push, voice, webhook, Logic App, Azure Function, Automation runbook, ITSM) and can be silenced or redirected with **alert processing rules**, for example during a maintenance window.',
  ],
  whyItMatters: [
    'The AZ-104 "monitor and maintain" domain asks you to interpret metrics, configure log settings, query logs, set up alert rules, action groups and alert processing rules, and use Azure Monitor insights for VMs, storage and networks.',
    'Without diagnostic settings, most resource logs simply do not exist anywhere you can query. Teams often discover this during an incident, when the evidence they need was never collected.',
    'Alert design decides whether on-call engineers trust the pager. Choosing metric alerts for fast numeric thresholds, log search alerts for richer conditions and processing rules for planned work keeps noise low.',
  ],
  howItWorks: [
    'Every resource emits platform metrics to the metrics database automatically. Metrics explorer charts them with aggregation (average, min, max, sum, count), splitting by dimension and a time grain. Metric alerts evaluate these directly, typically every minute.',
    'The activity log is subscription level. You can view it in the portal for 90 days, or add a subscription diagnostic setting to send it to a workspace for longer retention and KQL queries in the `AzureActivity` table.',
    'A diagnostic setting names a resource, a list of log categories (or category groups such as `allLogs` or `audit`) and metrics, and destinations. A resource can have several diagnostic settings, which lets you send audit logs to archive storage and everything else to a workspace.',
    'A Log Analytics workspace stores logs in tables (for example `Heartbeat`, `Perf`, `Event`, `Syslog`, `AzureDiagnostics` or resource-specific tables such as `StorageBlobLogs`). Retention and cost are set per workspace and per table. Access can be workspace-context or resource-context, controlled with Azure RBAC.',
    'The Azure Monitor Agent is installed as a VM extension and needs a managed identity. A DCR defines what to collect (performance counters, Windows events, Syslog), optional transformation, and which workspace to send to. A **DCR association** links the rule to one or many machines, so one rule can serve a whole fleet.',
    'An alert rule has a scope (resource, resource group or subscription), a condition (metric threshold, log search query result, or activity log event), an evaluation frequency, a severity from 0 (critical) to 4 (verbose), and one or more action groups. When it fires, an **alert** instance is created with a state you can acknowledge and close.',
    'An alert processing rule sits between fired alerts and action groups. It can suppress notifications for a scope during a scheduled window, or add an action group to every alert in a scope, without editing individual alert rules.',
  ],
  diagrams: [
    {
      kind: 'flow',
      title: 'From resource telemetry to a notification',
      caption:
        'Data must be collected before it can be alerted on. Diagnostic settings and DCRs are the collection step most people forget.',
      nodes: [
        {
          label: 'Resource or VM emits data',
          detail: 'Platform metrics, resource logs, guest data',
          tone: 'accent',
        },
        {
          label: 'Collection is configured',
          detail: 'Diagnostic setting or AMA with a DCR',
          branch: {
            label: 'Nothing configured',
            detail: 'Only platform metrics and activity log exist',
            tone: 'warning',
          },
        },
        {
          label: 'Log Analytics workspace',
          detail: 'Tables queried with KQL',
          arrowLabel: 'ingest',
        },
        {
          label: 'Alert rule evaluates',
          detail: 'Metric, log search or activity log condition',
        },
        {
          label: 'Alert processing rule',
          detail: 'Suppress in maintenance or add actions',
        },
        {
          label: 'Action group runs',
          detail: 'Email, SMS, webhook, Logic App, runbook',
          tone: 'success',
        },
      ],
    },
    {
      kind: 'decision',
      title: 'Which alert rule type fits the requirement?',
      caption:
        'Match the signal to the rule type: numeric and fast, query based, or a control plane event.',
      question: 'What should trigger the alert?',
      branches: [
        {
          condition: 'A numeric metric crosses a threshold',
          result: 'Metric alert',
          detail: 'Near real time, static or dynamic thresholds',
          tone: 'accent',
        },
        {
          condition: 'A pattern found by a KQL query',
          result: 'Log search alert',
          detail: 'Runs a query on a schedule against a workspace',
        },
        {
          condition: 'Someone deletes or changes a resource',
          result: 'Activity log alert',
          detail: 'Administrative operations, policy, autoscale',
        },
        {
          condition: 'Azure itself has an outage or maintenance',
          result: 'Service Health alert',
          detail: 'An activity log alert on the ServiceHealth category',
          tone: 'warning',
        },
      ],
    },
  ],
  keyObjects: [
    {
      kind: 'Diagnostic setting (Microsoft.Insights/diagnosticSettings)',
      apiVersion: '2021-05-01-preview',
      purpose: 'Routes resource logs and metrics from one resource to one or more destinations.',
      fields: [
        { path: 'properties.workspaceId', meaning: 'Log Analytics workspace destination.' },
        { path: 'properties.storageAccountId', meaning: 'Storage account for low-cost archive.' },
        {
          path: 'properties.eventHubAuthorizationRuleId',
          meaning: 'Event Hub namespace rule for streaming to external tools.',
        },
        {
          path: 'properties.logs[].categoryGroup',
          meaning: 'allLogs or audit, or name individual categories with category.',
        },
        {
          path: 'properties.metrics[].category',
          meaning: 'AllMetrics to also send platform metrics.',
        },
      ],
    },
    {
      kind: 'Log Analytics workspace (Microsoft.OperationalInsights/workspaces)',
      apiVersion: '2023-09-01',
      purpose: 'The store for log data, with per-workspace and per-table retention and pricing.',
      fields: [
        {
          path: 'properties.sku.name',
          meaning: 'PerGB2018 (pay as you go) or a commitment tier.',
          required: true,
        },
        {
          path: 'properties.retentionInDays',
          meaning: 'Interactive retention for tables that do not override it.',
        },
        {
          path: 'properties.features.enableLogAccessUsingOnlyResourcePermissions',
          meaning: 'Resource-context access: users see logs for resources they can read.',
        },
      ],
    },
    {
      kind: 'Data collection rule (Microsoft.Insights/dataCollectionRules)',
      apiVersion: '2023-03-11',
      purpose: 'Tells the Azure Monitor Agent what to collect and where to send it.',
      fields: [
        {
          path: 'properties.dataSources.performanceCounters',
          meaning: 'Counters and sampling interval.',
        },
        {
          path: 'properties.dataSources.windowsEventLogs',
          meaning: 'XPath queries for Windows events.',
        },
        {
          path: 'properties.dataSources.syslog',
          meaning: 'Facilities and minimum levels on Linux.',
        },
        { path: 'properties.destinations.logAnalytics', meaning: 'Target workspace resource id.' },
        {
          path: 'properties.dataFlows',
          meaning: 'Which streams go to which destinations, with optional transforms.',
        },
      ],
    },
    {
      kind: 'Action group (Microsoft.Insights/actionGroups)',
      apiVersion: '2023-01-01',
      purpose: 'A reusable list of notifications and actions that alert rules call.',
      fields: [
        {
          path: 'properties.groupShortName',
          meaning: 'Up to 12 characters, shown in SMS and email.',
          required: true,
        },
        {
          path: 'properties.emailReceivers',
          meaning: 'Email addresses, optionally the common alert schema.',
        },
        {
          path: 'properties.webhookReceivers',
          meaning: 'HTTPS endpoints for automation or ticketing.',
        },
        {
          path: 'properties.automationRunbookReceivers',
          meaning: 'Automation runbooks to run on fire.',
        },
      ],
    },
    {
      kind: 'Alert processing rule (Microsoft.AlertsManagement/actionRules)',
      apiVersion: '2021-08-08',
      purpose:
        'Suppresses or adds action groups to fired alerts in a scope, optionally on a schedule.',
      fields: [
        { path: 'properties.scopes', meaning: 'Subscription, resource group or resource ids.' },
        {
          path: 'properties.actions[].actionType',
          meaning: 'RemoveAllActionGroups (suppress) or AddActionGroups.',
        },
        { path: 'properties.schedule', meaning: 'One-off or recurring window with a time zone.' },
      ],
    },
  ],
  realWorldExample: {
    title: 'The storage account that was deleted with nobody watching',
    story: [
      'A finance team loses a storage account overnight. The activity log shows the delete, but only for 90 days and only if someone looks. There were no alerts, and no one could tell which files had been read in the days before because storage resource logs were never enabled.',
      'The platform team fixes the gaps as policy, not heroics. A subscription diagnostic setting sends the activity log to a central Log Analytics workspace. An Azure Policy `deployIfNotExists` assignment adds a diagnostic setting sending `StorageBlobLogs` to the same workspace for every storage account.',
      'An activity log alert fires on `Microsoft.Storage/storageAccounts/delete` and calls an action group that emails the owners and opens a ticket through a webhook. A metric alert on the account `Availability` metric catches degraded service within minutes.',
      'For the monthly patch weekend they add an alert processing rule that suppresses notifications for the VM resource groups between 22:00 and 04:00 on the second Saturday, so the pager stays quiet during planned reboots while the alerts are still recorded.',
    ],
  },
  yamlExamples: [
    {
      title: 'KQL: heartbeat gaps and top CPU consumers',
      language: 'text',
      explanation:
        'The first query finds machines that have stopped reporting through the Azure Monitor Agent. The second summarises CPU from the Perf table in 5 minute bins.',
      code: `// Machines with no heartbeat in the last 10 minutes
Heartbeat
| summarize LastSeen = max(TimeGenerated) by Computer
| where LastSeen < ago(10m)

// Average CPU per computer, last hour
Perf
| where TimeGenerated > ago(1h)
| where ObjectName == "Processor" and CounterName == "% Processor Time"
| summarize AvgCpu = avg(CounterValue) by Computer, bin(TimeGenerated, 5m)
| order by AvgCpu desc`,
    },
    {
      title: 'KQL: who deleted what in the activity log',
      language: 'text',
      code: `AzureActivity
| where TimeGenerated > ago(7d)
| where OperationNameValue endswith "/DELETE"
| where ActivityStatusValue == "Success"
| project TimeGenerated, Caller, OperationNameValue, ResourceGroup, _ResourceId
| order by TimeGenerated desc`,
    },
    {
      title: 'Diagnostic setting for a storage account blob service in Bicep',
      language: 'bicep',
      code: `param storageName string
param workspaceId string

resource sa 'Microsoft.Storage/storageAccounts@2023-05-01' existing = {
  name: storageName
}

resource blobSvc 'Microsoft.Storage/storageAccounts/blobServices@2023-05-01' existing = {
  parent: sa
  name: 'default'
}

resource diag 'Microsoft.Insights/diagnosticSettings@2021-05-01-preview' = {
  name: 'send-to-law'
  scope: blobSvc
  properties: {
    workspaceId: workspaceId
    logs: [ { categoryGroup: 'allLogs', enabled: true } ]
    metrics: [ { category: 'Transaction', enabled: true } ]
  }
}`,
    },
  ],
  imperative: [
    {
      command:
        'az monitor log-analytics workspace create -g rg-mon -n law-az104 --retention-time 30',
      what: 'Creates a Log Analytics workspace with 30 days of interactive retention.',
    },
    {
      command:
        'az monitor diagnostic-settings create -n send-to-law --resource <resource-id> --workspace <workspace-id> --logs \'[{"categoryGroup":"allLogs","enabled":true}]\' --metrics \'[{"category":"AllMetrics","enabled":true}]\'',
      what: 'Adds a diagnostic setting that sends all resource logs and metrics to the workspace.',
      placeholders: ['<resource-id>', '<workspace-id>'],
    },
    {
      command:
        'az monitor action-group create -g rg-mon -n ag-ops --short-name ops --action email oncall <email-address>',
      what: 'Creates an action group with one email receiver.',
      placeholders: ['<email-address>'],
    },
    {
      command:
        'az monitor metrics alert create -g rg-mon -n cpu-high --scopes <vm-id> --condition "avg Percentage CPU > 80" --window-size 5m --evaluation-frequency 1m --severity 2 --action ag-ops',
      what: 'Creates a metric alert that fires when average CPU exceeds 80 percent over 5 minutes.',
      placeholders: ['<vm-id>'],
    },
    {
      command:
        'az monitor activity-log alert create -g rg-mon -n rg-delete --scope /subscriptions/<sub-id> --condition category=Administrative and operationName=Microsoft.Resources/subscriptions/resourceGroups/delete --action-group ag-ops',
      what: 'Creates an activity log alert when any resource group is deleted in the subscription.',
      placeholders: ['<sub-id>'],
    },
    {
      command:
        'az monitor alert-processing-rule create -g rg-mon -n patch-window --scopes <rg-id> --rule-type RemoveAllActionGroups --schedule-recurrence-type Weekly --schedule-recurrence Saturday --schedule-start-datetime "2026-10-03 22:00:00" --schedule-end-datetime "2027-10-03 04:00:00" --schedule-time-zone "UTC"',
      what: 'Suppresses notifications for a resource group on a weekly maintenance schedule.',
      placeholders: ['<rg-id>'],
    },
    {
      command:
        'az monitor log-analytics query -w <workspace-guid> --analytics-query "Heartbeat | summarize max(TimeGenerated) by Computer" -o table',
      what: 'Runs a KQL query from the CLI against a workspace (uses the workspace customer id, a GUID).',
      placeholders: ['<workspace-guid>'],
    },
  ],
  declarative: {
    steps: [
      'Declare the Log Analytics workspace and an action group.',
      'Declare a data collection rule that collects CPU and memory counters and sends them to the workspace.',
      'Associate the DCR with the VM and make sure the VM has the Azure Monitor Agent extension and a managed identity.',
      'Declare a metric alert rule that references the action group.',
      'Preview with `az deployment group what-if`, then deploy.',
    ],
    code: [
      {
        title: 'Workspace, DCR, association and metric alert in Bicep',
        language: 'bicep',
        code: `param location string = resourceGroup().location
param vmName string
param alertEmail string

resource vm 'Microsoft.Compute/virtualMachines@2024-03-01' existing = {
  name: vmName
}

resource law 'Microsoft.OperationalInsights/workspaces@2023-09-01' = {
  name: 'law-az104'
  location: location
  properties: { sku: { name: 'PerGB2018' }, retentionInDays: 30 }
}

resource dcr 'Microsoft.Insights/dataCollectionRules@2023-03-11' = {
  name: 'dcr-vm-perf'
  location: location
  properties: {
    dataSources: {
      performanceCounters: [
        {
          name: 'perf'
          streams: ['Microsoft-Perf']
          samplingFrequencyInSeconds: 60
          counterSpecifiers: ['\\\\Processor(_Total)\\\\% Processor Time', '\\\\Memory\\\\Available Bytes']
        }
      ]
    }
    destinations: {
      logAnalytics: [ { name: 'law', workspaceResourceId: law.id } ]
    }
    dataFlows: [ { streams: ['Microsoft-Perf'], destinations: ['law'] } ]
  }
}

resource dcra 'Microsoft.Insights/dataCollectionRuleAssociations@2023-03-11' = {
  name: 'dcra-\${vmName}'
  scope: vm
  properties: { dataCollectionRuleId: dcr.id }
}

resource ag 'Microsoft.Insights/actionGroups@2023-01-01' = {
  name: 'ag-ops'
  location: 'global'
  properties: {
    groupShortName: 'ops'
    enabled: true
    emailReceivers: [ { name: 'oncall', emailAddress: alertEmail, useCommonAlertSchema: true } ]
  }
}

resource cpuAlert 'Microsoft.Insights/metricAlerts@2018-03-01' = {
  name: 'cpu-high-\${vmName}'
  location: 'global'
  properties: {
    severity: 2
    enabled: true
    scopes: [ vm.id ]
    evaluationFrequency: 'PT1M'
    windowSize: 'PT5M'
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
      },
    ],
  },
  verification: [
    {
      command: 'az monitor diagnostic-settings list --resource <resource-id> -o table',
      what: 'Lists diagnostic settings on a resource and their destinations.',
      placeholders: ['<resource-id>'],
    },
    {
      command:
        'az monitor metrics list --resource <vm-id> --metric "Percentage CPU" --interval PT5M --aggregation Average -o table',
      what: 'Reads platform metrics directly from the metrics database.',
      placeholders: ['<vm-id>'],
    },
    {
      command:
        'az vm extension list -g rg-mon --vm-name vm-mon --query "[].{name:name, state:provisioningState}" -o table',
      what: 'Confirms the AzureMonitorLinuxAgent or AzureMonitorWindowsAgent extension succeeded.',
      expected: 'AzureMonitorLinuxAgent  Succeeded',
    },
    {
      command: 'az monitor data-collection rule association list --resource <vm-id> -o table',
      what: 'Shows which DCRs are associated with a machine.',
      placeholders: ['<vm-id>'],
    },
    {
      command: 'az monitor metrics alert list -g rg-mon -o table',
      what: 'Lists metric alert rules and whether they are enabled.',
    },
  ],
  troubleshooting: [
    {
      command:
        'az monitor log-analytics query -w <workspace-guid> --analytics-query "Heartbeat | where Computer == \'vm-mon\' | top 1 by TimeGenerated" -o table',
      what: 'No rows means the agent is not sending: check the extension, the managed identity, the DCR association and outbound access to Azure Monitor endpoints.',
      placeholders: ['<workspace-guid>'],
    },
    {
      command:
        'az monitor activity-log list --resource-group rg-mon --offset 1h --query "[].{op:operationName.value, status:status.value, caller:caller}" -o table',
      what: 'Finds who changed or deleted something in the last hour, straight from the activity log.',
    },
    {
      command:
        'az monitor action-group test-notifications create -g rg-mon --action-group ag-ops --alert-type servicehealth',
      what: 'Sends a test notification through the action group to prove receivers work.',
      namespaceNote:
        'Email receivers must accept the message; check spam filters when nothing arrives.',
    },
    {
      command: 'az monitor alert-processing-rule list -g rg-mon -o table',
      what: 'When an alert fired but nobody was notified, check for a suppression rule covering that scope.',
    },
  ],
  commonMistakes: [
    'Assuming resource logs are collected by default. Only platform metrics and the activity log are; resource logs need a diagnostic setting.',
    'Installing the legacy Log Analytics agent (MMA/OMS). It is retired; use the Azure Monitor Agent with data collection rules.',
    'Deploying the Azure Monitor Agent without a DCR association. The agent runs but collects nothing.',
    'Using a log search alert for a simple CPU threshold. A metric alert is faster, cheaper and simpler.',
    'Editing dozens of alert rules to silence them for maintenance instead of one alert processing rule with a schedule.',
    'Sending everything to a workspace forever. Use storage for long-term archive and set table-level retention to control cost.',
    'Querying a workspace with the resource id where the CLI expects the workspace customer id (GUID).',
  ],
  examTips: [
    'Destinations of a diagnostic setting: Log Analytics workspace, storage account, Event Hub, partner solution. Event Hub is the answer for streaming to a third-party SIEM.',
    'Platform metrics: 93 days. Activity log: 90 days in the portal. For longer, route them to a workspace or storage.',
    'Alert rule types to know: metric, log search, activity log (including Service Health and Resource Health). Match the signal to the type.',
    'Action groups are reusable across many alert rules; alert processing rules suppress or add action groups without changing the rules.',
    'VM insights, Storage insights and Network insights are curated workbooks on top of Azure Monitor data. VM insights requires the Azure Monitor Agent and a DCR.',
    'Know basic KQL operators: where, summarize, project, extend, order by, top, bin, ago. Expect to read a query and predict what it returns.',
  ],
  summary: [
    'Metrics are numeric time series collected automatically; logs are records in a Log Analytics workspace queried with KQL.',
    'The activity log records control plane operations per subscription for 90 days.',
    'Diagnostic settings route resource logs and metrics to a workspace, storage, Event Hub or partner.',
    'The Azure Monitor Agent plus data collection rules collect guest data; the legacy agent is retired.',
    'Alert rules fire on metric, log search or activity log conditions and call action groups; alert processing rules suppress or redirect them.',
  ],
  practice: [
    {
      id: 'az1-azure-monitor-p1',
      level: 'beginner',
      prompt:
        'You must stream Key Vault audit logs to a third-party SIEM in near real time. Which diagnostic setting destination should you choose?',
      answer: 'An Event Hub.',
      explanation:
        'Event Hubs is the streaming destination. A workspace is for querying inside Azure and storage is for archive.',
    },
    {
      id: 'az1-azure-monitor-p2',
      level: 'intermediate',
      prompt:
        'The Azure Monitor Agent extension is installed on a VM but the Perf table is empty. What is the most likely missing piece?',
      answer:
        'A data collection rule association linking a DCR (with performance counters and the workspace destination) to that VM.',
      explanation:
        'The agent does nothing on its own; DCRs define what to collect. Also confirm the VM has a managed identity.',
    },
    {
      id: 'az1-azure-monitor-p3',
      level: 'intermediate',
      prompt:
        'Operations wants no notifications for resource group rg-web every Sunday from 01:00 to 03:00, but still wants alerts recorded. What do you configure?',
      answer:
        'An alert processing rule scoped to rg-web with the RemoveAllActionGroups (suppression) action and a weekly recurring schedule.',
      explanation:
        'Alerts still fire and appear in the portal, but action groups are not called during the window. Disabling rules would lose the record.',
    },
    {
      id: 'az1-azure-monitor-p4',
      level: 'advanced',
      prompt:
        'What does this KQL return: Heartbeat | summarize LastSeen = max(TimeGenerated) by Computer | where LastSeen < ago(15m)?',
      answer:
        'One row per computer whose most recent heartbeat is older than 15 minutes, meaning machines that have stopped reporting.',
      explanation:
        'summarize collapses the table to one row per Computer with the latest time, and the where filters to stale ones. This is a classic log search alert query.',
    },
  ],
  lab: {
    title: 'Collect VM data with AMA and alert on it',
    scenario:
      'Create a workspace, a Linux VM with the Azure Monitor Agent and a DCR, a metric alert with an action group, and a suppression rule. Generate CPU load and watch the alert fire.',
    prerequisites: [
      'An Azure subscription and Cloud Shell (Bash)',
      'An email address you can check',
    ],
    tasks: [
      {
        instruction:
          'Create resource group `rg-az104-mon`, a Log Analytics workspace `law-az104` and a small Ubuntu VM `vm-mon` with a system-assigned managed identity.',
      },
      {
        instruction:
          'Install the AzureMonitorLinuxAgent extension and create a DCR that collects CPU counters and Syslog to the workspace. Associate it with the VM.',
        hint: 'The portal Data Collection Rules blade builds the JSON for you; the CLI accepts a rule file.',
      },
      {
        instruction:
          'Open Metrics explorer for the VM (platform metrics need no setup), then add a subscription diagnostic setting that sends the activity log to the workspace and query the AzureActivity table.',
        hint: 'az monitor diagnostic-settings subscription create, with the Administrative category enabled.',
      },
      {
        instruction:
          'Create action group `ag-ops` with your email, and a metric alert `cpu-high` at 70 percent average over 5 minutes.',
      },
      {
        instruction:
          'SSH (or use run-command) to generate CPU load for 10 minutes. Confirm the alert fires and the email arrives. Query Perf in the workspace with KQL.',
        hint: 'az vm run-command invoke with a timeout and a busy loop works without SSH.',
      },
      {
        instruction:
          'Create an alert processing rule that suppresses all action groups for the resource group, repeat the load, and confirm the alert fires with no email.',
      },
    ],
    solution: [
      {
        title: 'Build the environment',
        language: 'bash',
        placeholders: ['<email-address>'],
        code: `RG=rg-az104-mon
LOC=eastus
az group create -n $RG -l $LOC
az monitor log-analytics workspace create -g $RG -n law-az104 -l $LOC
LAW_ID=$(az monitor log-analytics workspace show -g $RG -n law-az104 --query id -o tsv)
LAW_GUID=$(az monitor log-analytics workspace show -g $RG -n law-az104 --query customerId -o tsv)

az vm create -g $RG -n vm-mon --image Ubuntu2204 --size Standard_B1s \\
  --assign-identity --admin-username azureuser --generate-ssh-keys
VM_ID=$(az vm show -g $RG -n vm-mon --query id -o tsv)

az vm extension set -g $RG --vm-name vm-mon -n AzureMonitorLinuxAgent \\
  --publisher Microsoft.Azure.Monitor --enable-auto-upgrade true

cat > dcr.json <<EOF
{
  "location": "$LOC",
  "properties": {
    "dataSources": {
      "performanceCounters": [{
        "name": "perf", "streams": ["Microsoft-Perf"], "samplingFrequencyInSeconds": 60,
        "counterSpecifiers": ["Processor(*)\\\\\\\\% Processor Time"]
      }],
      "syslog": [{
        "name": "syslog", "streams": ["Microsoft-Syslog"],
        "facilityNames": ["auth", "daemon"], "logLevels": ["Warning", "Error", "Critical"]
      }]
    },
    "destinations": { "logAnalytics": [{ "name": "law", "workspaceResourceId": "$LAW_ID" }] },
    "dataFlows": [{ "streams": ["Microsoft-Perf", "Microsoft-Syslog"], "destinations": ["law"] }]
  }
}
EOF
az monitor data-collection rule create -g $RG -n dcr-vm-mon --rule-file dcr.json
DCR_ID=$(az monitor data-collection rule show -g $RG -n dcr-vm-mon --query id -o tsv)
az monitor data-collection rule association create -n dcra-vm-mon \\
  --resource $VM_ID --rule-id $DCR_ID`,
      },
      {
        title: 'Alerts, load and suppression',
        language: 'bash',
        placeholders: ['<email-address>'],
        code: `az monitor action-group create -g $RG -n ag-ops --short-name ops \\
  --action email oncall <email-address>
az monitor metrics alert create -g $RG -n cpu-high --scopes $VM_ID \\
  --condition "avg Percentage CPU > 70" --window-size 5m --evaluation-frequency 1m \\
  --severity 2 --action ag-ops

az vm run-command invoke -g $RG -n vm-mon --command-id RunShellScript \\
  --scripts "timeout 600 sh -c 'while :; do :; done' &"

az monitor log-analytics query -w $LAW_GUID -o table --analytics-query \\
  "Perf | where CounterName == '% Processor Time' | summarize avg(CounterValue) by bin(TimeGenerated, 1m) | order by TimeGenerated desc"

RG_ID=$(az group show -n $RG --query id -o tsv)
az monitor alert-processing-rule create -g $RG -n quiet-lab --scopes $RG_ID \\
  --rule-type RemoveAllActionGroups --description "Lab suppression"`,
      },
    ],
    verification: [
      {
        command: 'az monitor data-collection rule association list --resource <vm-id> -o table',
        what: 'Shows the DCR association on the VM.',
        expected: 'dcra-vm-mon listed with the rule id.',
        placeholders: ['<vm-id>'],
      },
      {
        command:
          'az monitor log-analytics query -w <workspace-guid> --analytics-query "Heartbeat | where Computer == \'vm-mon\' | count" -o table',
        what: 'Confirms the agent is reporting to the workspace.',
        expected: 'A count greater than 0 a few minutes after association.',
        placeholders: ['<workspace-guid>'],
      },
      {
        command:
          'az monitor metrics alert show -g rg-az104-mon -n cpu-high --query "{enabled:enabled, severity:severity}"',
        what: 'Confirms the alert rule exists and is enabled.',
      },
    ],
    cleanup: [
      {
        command: 'az group delete -n rg-az104-mon --yes --no-wait',
        what: 'Deletes the VM, workspace, DCR, alert rules, action group and processing rule.',
      },
    ],
  },
  relatedTopicIds: [
    'az1-network-watcher',
    'az1-backup-recovery',
    'az1-virtual-machines',
    'az1-azure-policy',
    'az1-storage-accounts',
  ],
  docs: [
    {
      title: 'Azure Monitor overview',
      url: 'https://learn.microsoft.com/azure/azure-monitor/overview',
    },
    {
      title: 'Diagnostic settings in Azure Monitor',
      url: 'https://learn.microsoft.com/azure/azure-monitor/essentials/diagnostic-settings',
    },
    {
      title: 'Log Analytics workspace overview',
      url: 'https://learn.microsoft.com/azure/azure-monitor/logs/log-analytics-workspace-overview',
    },
    {
      title: 'Azure Monitor Agent overview',
      url: 'https://learn.microsoft.com/azure/azure-monitor/agents/azure-monitor-agent-overview',
    },
    {
      title: 'Types of Azure Monitor alerts',
      url: 'https://learn.microsoft.com/azure/azure-monitor/alerts/alerts-types',
    },
    {
      title: 'Alert processing rules',
      url: 'https://learn.microsoft.com/azure/azure-monitor/alerts/alerts-processing-rules',
    },
    {
      title: 'Kusto Query Language overview',
      url: 'https://learn.microsoft.com/kusto/query/',
    },
  ],
}
