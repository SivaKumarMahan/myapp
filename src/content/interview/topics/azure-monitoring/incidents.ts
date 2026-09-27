import type { InterviewQuestion } from '../../../types'

/** Production incident scenarios, alert design and audit basics. */
export const azureMonitoringIncidentQuestions: InterviewQuestion[] = [
  {
    id: 'itv-azmon-14',
    level: 'advanced',
    kind: 'scenario',
    prompt:
      'At 02:00 alerts fire across several services in West Europe. It looks like a regional problem. Walk me through the first hour.',
    probing:
      'Incident command under uncertainty. They want confirmation from Service Health, a failover decision against RTO, and communication, not a heroic solo fix.',
    answer: [
      'Minute one is **declaring an incident** and naming roles - an incident lead, someone on communications - so I am not investigating and updating stakeholders at the same time.',
      'Then **confirm scope**. Is it us or the platform? **Azure Service Health** shows service issues for our subscriptions and regions, and **Resource Health** shows whether specific resources are affected by a platform event. If our own deployment at 01:50 is the cause, the answer is a rollback, not a failover - so I also check the activity log for recent changes.',
      'If it is a regional platform issue, the decision is **wait or fail over**. That depends on the RTO, Microsoft’s estimate, and what failover costs: possible data loss on asynchronously replicated stores, and time to fail back. If the service is designed active-passive, failing over means Front Door or Traffic Manager sending traffic to the secondary, databases failed over through failover groups, and storage failed over only if we must.',
      'Throughout: **status updates** on a fixed cadence, a timeline of decisions, and no config changes nobody has written down. Afterwards, a blameless review - including whether our Service Health alerts fired early enough and whether the runbook matched reality.',
    ],
    diagrams: [
      {
        kind: 'flow',
        title: 'The first hour of a suspected regional outage',
        caption:
          'Confirm before acting; the failover decision is weighed against RTO and data loss.',
        nodes: [
          {
            label: 'Declare incident, assign roles',
            detail: 'Lead, comms, investigators',
            tone: 'accent',
          },
          {
            label: 'Service Health and Resource Health',
            detail: 'Platform issue or our change?',
            branch: { label: 'Our deployment', detail: 'Roll back, no failover' },
          },
          { label: 'Estimate impact and ETA', detail: 'Against RTO and SLA' },
          { label: 'Decide: wait or fail over', detail: 'Data loss and failback cost' },
          { label: 'Execute runbook', detail: 'Front Door, failover groups', tone: 'warning' },
          { label: 'Regular status updates', detail: 'Then blameless review', tone: 'success' },
        ],
      },
    ],
    code: [
      {
        title: 'Service Health and resource health from the CLI',
        language: 'bash',
        code: `# Active service issues affecting this subscription
az rest --method get \\
  --url "https://management.azure.com/subscriptions/<sub>/providers/Microsoft.ResourceHealth/events?api-version=2024-02-01&\\$filter=properties/eventType eq 'ServiceIssue' and properties/status eq 'Active'" \\
  --query "value[].{title:properties.title, impact:properties.impact[0].impactedService, region:properties.impact[0].impactedRegions[0].impactedRegion}"

# Is this specific resource affected?
az rest --method get \\
  --url "https://management.azure.com/<resource-id>/providers/Microsoft.ResourceHealth/availabilityStatuses/current?api-version=2024-02-01" \\
  --query "properties.{state:availabilityState, reason:reasonType, summary:summary}"`,
        placeholders: ['<sub>', '<resource-id>'],
      },
      {
        title: 'Service Health alert so you hear about it first',
        language: 'bash',
        code: `az monitor activity-log alert create -g rg-monitor -n service-health-weu \\
  --scope /subscriptions/<sub> \\
  --condition category=ServiceHealth \\
  --action-group ag-platform-oncall`,
        placeholders: ['<sub>'],
      },
    ],
    traps: [
      'Failing over immediately without confirming it is not your own change.',
      'One person investigating, fixing and communicating at once.',
      'No Service Health alerts, so you learn about a platform outage from customers.',
    ],
    followUps: [
      'What would make you decide not to fail over?',
      'How do you test the failover runbook?',
      'What goes in the post-incident review?',
    ],
    tags: ['scenario', 'incident', 'region outage', 'service health'],
  },
  {
    id: 'itv-azmon-15',
    level: 'intermediate',
    kind: 'scenario',
    prompt: 'A Linux VM is suddenly unreachable over SSH. How do you troubleshoot it?',
    probing:
      'Methodical layer-by-layer triage with the right Azure tools, without needing network access to the VM itself.',
    answer: [
      'I work from the platform inwards. **Resource Health** first: is the VM running, or is there a host or platform event? Then the VM’s **power state** and whether anything changed - the **activity log** shows restarts, resizes, NSG edits or route changes around the time it broke.',
      'Next, **is it the network?** **Network Watcher IP flow verify** tells me whether an NSG rule allows port 22 from my source IP, and **effective security rules** show the combined NIC and subnet NSGs. **Next hop** catches a user-defined route sending traffic to a firewall that drops it. If the VM has no public IP by design, I should be going through **Azure Bastion** anyway.',
      'If the network is fine, **is the OS up?** **Boot diagnostics** show the console screenshot and serial log - a kernel panic, a failed fstab mount waiting forever, a full disk. The **serial console** gives me an interactive login even with no network, and **Run Command** executes a script through the agent - for example to restart sshd or check disk space.',
      'Last-resort fixes: **reset SSH configuration or credentials** with the VMAccess extension, **redeploy** to move the VM to a new host, or attach the OS disk to a rescue VM to repair it. And afterwards, an alert on VM availability so we find out before the user does.',
    ],
    diagrams: [
      {
        kind: 'flow',
        title: 'VM unreachable: outside in',
        caption: 'Each layer has a tool that works without logging in to the VM.',
        nodes: [
          {
            label: 'Resource Health, power state',
            detail: 'Platform event? Stopped?',
            tone: 'accent',
          },
          { label: 'Activity log', detail: 'Recent NSG, route or VM changes' },
          { label: 'IP flow verify, next hop', detail: 'NSG and UDR path to port 22' },
          { label: 'Boot diagnostics, serial console', detail: 'Kernel panic, fstab, full disk' },
          { label: 'Run Command or reset SSH', detail: 'Fix via the agent', tone: 'success' },
          { label: 'Redeploy or rescue VM', detail: 'Last resort', tone: 'warning' },
        ],
      },
    ],
    code: [
      {
        title: 'The triage commands in order',
        language: 'bash',
        code: `az vm get-instance-view -g <rg> -n <vm> \\
  --query "instanceView.statuses[].displayStatus" -o tsv

az network watcher test-ip-flow -g <rg> --vm <vm> --direction Inbound \\
  --protocol TCP --local 10.0.1.4:22 --remote <my-public-ip>:50000

az network watcher show-next-hop -g <rg> --vm <vm> \\
  --source-ip 10.0.1.4 --dest-ip <my-public-ip>

az vm boot-diagnostics get-boot-log -g <rg> -n <vm> | tail -50

az vm run-command invoke -g <rg> -n <vm> --command-id RunShellScript \\
  --scripts "df -h; systemctl status sshd --no-pager; journalctl -u sshd -n 20 --no-pager"

az vm user reset-ssh -g <rg> -n <vm>`,
        placeholders: ['<rg>', '<vm>', '<my-public-ip>'],
      },
    ],
    traps: [
      'Restarting the VM first, which destroys the evidence and may not fix it.',
      'Opening port 22 to the internet to "test".',
      'Forgetting that a UDR can black-hole traffic even when the NSG allows it.',
    ],
    followUps: [
      'What would you check if the VM was reachable but the app on it was not?',
      'How does Bastion change this?',
    ],
    tags: ['scenario', 'vm', 'network watcher', 'troubleshooting'],
  },
  {
    id: 'itv-azmon-16',
    level: 'advanced',
    kind: 'scenario',
    prompt:
      'An App Service web app has become slow - p95 latency went from 300 ms to 4 seconds - but CPU on the plan looks fine. How do you find the cause?',
    probing:
      'Performance triage with Application Insights. The strong answer looks at dependencies and outbound connections, not just the web tier.',
    answer: [
      'If CPU is fine, the app is probably **waiting** on something. So I start with **Application Insights Performance**: which operations got slower, and when. Then drill into a slow request’s **end-to-end transaction** to see where the time goes - is it the app code or a **dependency** such as SQL, Redis, a storage call or a partner API?',
      'Usually one dependency stands out. If it is the database, I move to the database’s own diagnostics - Query Store, DTU or vCore usage, blocking. If it is an external API, its latency is now my latency, and the fix is timeouts, caching or a circuit breaker.',
      'If dependencies look fast but requests are still slow, I suspect the **outbound connection path**. App Service has a limited number of **SNAT ports** for outbound connections; an app that opens a new HTTP or database connection per request exhausts them, and new connections queue. **Diagnose and solve problems** on the app has a SNAT port exhaustion detector. The fix is **connection reuse** (a single shared HttpClient, connection pooling), or a NAT gateway through VNet integration for more ports.',
      'Other things to rule out: memory pressure and garbage collection (the plan’s memory metric), thread-pool starvation from blocking calls, instance count after a scale-in, and a deployment at the same time - the activity log and deployment history tell me if this started with a release. The **profiler** in Application Insights captures traces from slow requests if the cause is in our own code.',
    ],
    code: [
      {
        title: 'Which dependency got slower? (KQL)',
        language: 'text',
        code: `AppDependencies
| where TimeGenerated > ago(6h)
| summarize p95ms = percentile(DurationMs, 95), calls = count(), failed = countif(Success == false)
    by bin(TimeGenerated, 15m), DependencyType, Target
| where calls > 50
| order by TimeGenerated desc, p95ms desc`,
      },
      {
        title: 'Where does the time go for slow requests?',
        language: 'text',
        code: `let slow = AppRequests
  | where TimeGenerated > ago(1h) and DurationMs > 2000
  | project OperationId, RequestMs = DurationMs, Name;
slow
| join kind=inner (AppDependencies | where TimeGenerated > ago(1h)
    | summarize DependencyMs = sum(DurationMs) by OperationId) on OperationId
| extend OwnCodeMs = RequestMs - DependencyMs
| summarize avg(RequestMs), avg(DependencyMs), avg(OwnCodeMs) by Name`,
      },
      {
        title: 'Connection reuse - the usual SNAT fix',
        language: 'python',
        code: `import requests

# One session per process, reused for every call: pooled connections, few SNAT ports
session = requests.Session()
adapter = requests.adapters.HTTPAdapter(pool_connections=10, pool_maxsize=50)
session.mount("https://", adapter)

def get_rates():
    return session.get("https://partner.example.com/rates", timeout=3).json()`,
      },
    ],
    deeper: [
      'Averages hide this kind of problem. A p95 jump with a flat average means a subset of requests is stuck - often those that hit the saturated dependency or wait for a connection - so always chart percentiles.',
      'Scaling out can make SNAT exhaustion look better temporarily, because each instance has its own allocation. That is a clue, not a fix.',
    ],
    traps: [
      'Scaling up the plan because "it is slow" when CPU is not the bottleneck.',
      'Looking only at averages.',
      'Creating a new HttpClient per request.',
    ],
    followUps: [
      'How do you detect SNAT port exhaustion?',
      'What does the Application Insights profiler show you?',
    ],
    tags: ['scenario', 'app service', 'performance', 'application insights'],
  },
  {
    id: 'itv-azmon-17',
    level: 'intermediate',
    kind: 'scenario',
    prompt:
      'Finance flags that yesterday’s Azure spend was three times normal. How do you find out why, and stop it happening again?',
    probing:
      'Cost as an operational signal. They want Cost Management analysis by resource and meter, the usual suspects, and preventive controls.',
    answer: [
      'I open **Cost Management cost analysis** for the day, grouped by **resource** and then by **meter**, and compare with the previous week. That usually names the culprit in minutes. Cost data can lag by several hours, so I also look at usage metrics for real-time confirmation.',
      'The usual suspects: **Log Analytics ingestion** exploding because someone turned on debug logging or a new diagnostic setting; **autoscale** that scaled out and never scaled back in; a **forgotten resource** - a large VM, a GPU node pool, a test environment - left running; **egress** from a misconfigured replication or a backup copying across regions; or a runaway **Function** or Logic App looping on itself.',
      'For a Log Analytics spike, the **Usage** table shows which data type grew, and from there which resources are sending it. Then I fix the source - revert the log level, remove the noisy diagnostic category, add a DCR transformation, or move the table to a cheaper plan.',
      'Prevention: **budgets** with alerts at 50/80/100% (budgets alert, they do not stop spending), **cost anomaly alerts**, an ingestion-volume alert on each workspace, tags so every resource has an owner, and scheduled cleanup of non-production environments.',
    ],
    code: [
      {
        title: 'Which tables grew yesterday? (KQL)',
        language: 'text',
        code: `Usage
| where TimeGenerated > ago(8d) and IsBillable == true
| summarize GB = sum(Quantity) / 1024 by DataType, Day = bin(TimeGenerated, 1d)
| evaluate pivot(Day, sum(GB))
| order by DataType asc`,
      },
      {
        title: 'Which resources send the most to a noisy table?',
        language: 'text',
        code: `AppTraces
| where TimeGenerated > ago(1d)
| summarize GB = sum(_BilledSize) / 1024 / 1024 / 1024 by _ResourceId, SeverityLevel
| order by GB desc
| take 10`,
      },
      {
        title: 'Budget and ingestion alert',
        language: 'bash',
        code: `az consumption budget create --budget-name monthly-prod --amount 20000 \\
  --category Cost --time-grain Monthly \\
  --start-date 2026-10-01 --end-date 2027-09-30

az monitor scheduled-query create -g rg-monitor -n law-ingestion-spike \\
  --scopes <workspace-resource-id> \\
  --condition "total 'Ingest' from 'GB' > 200" \\
  --condition-query Ingest="Usage | where IsBillable == true | summarize GB = sum(Quantity) / 1024" \\
  --window-size 1d --evaluation-frequency 1h --severity 2 \\
  --action-groups <action-group-id>`,
        placeholders: ['<workspace-resource-id>', '<action-group-id>'],
      },
    ],
    traps: [
      'Believing a budget stops spending. It only alerts unless you wire automation to it.',
      'Setting a Log Analytics daily cap as the fix, and losing production logs.',
      'Deleting the expensive resource without finding out who owns it and why it exists.',
    ],
    followUps: [
      'How would you attribute cost to teams?',
      'How do you make budgets actually stop non-production spend?',
    ],
    tags: ['scenario', 'cost', 'finops', 'log analytics'],
  },
  {
    id: 'itv-azmon-18',
    level: 'advanced',
    kind: 'scenario',
    prompt:
      'Secret scanning reports that a service principal client secret was pushed to a public GitHub repository 40 minutes ago. What do you do?',
    probing:
      'Leaked credential response. They want revoke first, then investigate with sign-in and activity logs, then eliminate the class of secret.',
    answer: [
      'Assume it is **already compromised** - public secrets are scraped within minutes. The first action is to **revoke it**: delete the client secret from the app registration (or add a new one first if a production service depends on it and switch that service immediately). Rotating is the containment; deleting the commit is not.',
      'Then **scope the damage**. What can this principal do? Its **RBAC role assignments** and any **Entra or Graph permissions** tell me the blast radius. **Service principal sign-in logs** in Entra ID show whether anyone authenticated with it from an unfamiliar IP during the exposure window, and the **activity log** and resource logs show what they did - created VMs, read Key Vault secrets, changed role assignments.',
      'If there was malicious use, it becomes a security incident: disable the principal, remove anything the attacker created (new credentials, new role assignments, new resources - attackers add persistence), and involve the security team and Sentinel.',
      'Then remove the class of problem: replace the client secret with **workload identity federation** or a managed identity, turn on **push protection** so secrets are blocked before they reach GitHub, and set a short maximum lifetime on any secrets that must remain.',
    ],
    diagrams: [
      {
        kind: 'flow',
        title: 'Leaked service principal secret',
        caption: 'Revoke first, investigate second, then remove the need for the secret.',
        nodes: [
          {
            label: 'Revoke the secret now',
            detail: 'Delete or rotate the credential',
            tone: 'danger',
          },
          { label: 'Blast radius', detail: 'RBAC roles, Graph permissions' },
          { label: 'Sign-in logs', detail: 'Unknown IPs using the principal' },
          {
            label: 'Activity and resource logs',
            detail: 'What did they do with it?',
            branch: {
              label: 'Malicious use found',
              detail: 'Security incident, remove persistence',
            },
          },
          {
            label: 'Federation, push protection',
            detail: 'No secret left to leak',
            tone: 'success',
          },
        ],
      },
    ],
    code: [
      {
        title: 'Revoke and inspect',
        language: 'bash',
        code: `# Which credentials does the app have?
az ad app credential list --id <app-id> \\
  --query "[].{keyId:keyId, name:displayName, end:endDateTime}" -o table

# Remove the leaked one
az ad app credential delete --id <app-id> --key-id <leaked-key-id>

# What can the principal do?
az role assignment list --assignee <app-id> --all \\
  --query "[].{role:roleDefinitionName, scope:scope}" -o table`,
        placeholders: ['<app-id>', '<leaked-key-id>'],
      },
      {
        title: 'Who used it? (KQL on Entra and Azure logs)',
        language: 'text',
        code: `AADServicePrincipalSignInLogs
| where TimeGenerated > ago(2h)
| where AppId == "<app-id>"
| summarize signIns = count() by IPAddress, Location, ResultType
| order by signIns desc;

AzureActivity
| where TimeGenerated > ago(2h)
| where Caller == "<service-principal-object-id>"
| project TimeGenerated, OperationNameValue, ResourceGroup, ActivityStatusValue, CallerIpAddress`,
        placeholders: ['<app-id>', '<service-principal-object-id>'],
      },
    ],
    traps: [
      'Force-pushing to remove the commit and considering it fixed.',
      'Rotating the secret and not checking what was done with it.',
      'Missing attacker persistence such as a new credential added to the same app.',
    ],
    followUps: [
      'What does push protection do?',
      'How would workload identity federation have prevented this?',
    ],
    tags: ['scenario', 'security', 'leaked secret', 'incident response'],
  },
  {
    id: 'itv-azmon-19',
    level: 'intermediate',
    kind: 'scenario',
    prompt:
      'An app that reads from Blob Storage starts getting 403 errors after a security hardening change. How do you work out which kind of 403 it is?',
    probing:
      'Storage 403s have several distinct causes. They want the error code read first, and each mapped to its fix.',
    answer: [
      'A storage 403 is not one error. The **error code** in the response - or `StatusText` in the storage logs - tells you which, so that is the first thing I read.',
      '**AuthorizationPermissionMismatch** means authentication worked but the identity lacks a **data-plane role** such as Storage Blob Data Reader. Control-plane roles like Contributor do not count. **AuthorizationFailure** usually means the **network**: the storage firewall or disabled public access is rejecting the source - the caller is not in an allowed VNet or IP range, or is not coming through the private endpoint.',
      '**KeyBasedAuthenticationNotPermitted** means someone disabled **shared key access** and the app still uses an account key or a key-signed SAS. **AuthenticationFailed** points at a bad or expired **SAS**, a rotated key, or clock skew on the client.',
      'Given "after a security hardening change", my money is on either the firewall (AuthorizationFailure) or shared key being disabled (KeyBasedAuthenticationNotPermitted). The fix is to move the app to a **managed identity with a data role** and to reach the account through a private endpoint, rather than rolling the hardening back.',
    ],
    diagrams: [
      {
        kind: 'decision',
        title: 'Which storage 403 is it?',
        caption: 'Read the error code first; each points at a different layer.',
        question: 'What does the error code say?',
        branches: [
          {
            condition: 'AuthorizationPermissionMismatch',
            result: 'Missing data-plane role',
            detail: 'Grant Storage Blob Data Reader',
            tone: 'accent',
          },
          {
            condition: 'AuthorizationFailure',
            result: 'Network rules',
            detail: 'Firewall, VNet or private endpoint',
            tone: 'warning',
          },
          {
            condition: 'KeyBasedAuthenticationNotPermitted',
            result: 'Shared key disabled',
            detail: 'Move the app to Entra auth',
          },
          {
            condition: 'AuthenticationFailed',
            result: 'Bad SAS, key or clock',
            detail: 'Expired SAS, rotated key, skew',
          },
        ],
      },
    ],
    code: [
      {
        title: 'Which 403s, from where? (KQL)',
        language: 'text',
        code: `StorageBlobLogs
| where TimeGenerated > ago(1h) and StatusCode == 403
| summarize failures = count() by StatusText, AuthenticationType, CallerIpAddress, RequesterObjectId
| order by failures desc`,
      },
      {
        title: 'Check the account’s current settings and the app’s roles',
        language: 'bash',
        code: `az storage account show -n <account> -g <rg> \\
  --query "{sharedKey:allowSharedKeyAccess, publicNetwork:publicNetworkAccess, defaultAction:networkRuleSet.defaultAction}"

az role assignment list --assignee <app-principal-id> --all \\
  --query "[?contains(roleDefinitionName, 'Storage')].{role:roleDefinitionName, scope:scope}" -o table`,
        placeholders: ['<account>', '<rg>', '<app-principal-id>'],
      },
    ],
    traps: [
      'Granting Contributor on the storage account to fix AuthorizationPermissionMismatch.',
      'Re-enabling public network access instead of routing through a private endpoint.',
      'Forgetting that role assignments can take a few minutes to take effect.',
    ],
    followUps: [
      'Why does Contributor not grant blob read access with Entra auth?',
      'How do trusted Azure services bypass the firewall?',
    ],
    tags: ['scenario', 'storage', '403', 'rbac', 'networking'],
  },
  {
    id: 'itv-azmon-20',
    level: 'advanced',
    kind: 'open',
    prompt: 'How do you design alerting for a service so that on-call is not drowning in noise?',
    probing:
      'Alerting philosophy. They want symptom-based, SLO-driven paging, a clear split between pages and tickets, and ownership.',
    answer: [
      'I page on **symptoms users feel**, not on causes. Error rate, latency percentiles and availability of the user-facing endpoints - ideally against an **SLO**, such as 99.9% of requests succeeding under 500 ms over 30 days. High CPU on one instance is a cause; if users are not affected, it is a ticket or a dashboard, not a 3am page.',
      'SLOs give a principled threshold: alert on **burn rate** - how fast the error budget is being consumed. A fast burn (the whole month’s budget gone in hours) pages now; a slow burn becomes a ticket for working hours. That removes most flapping alerts at a stroke.',
      'Then the mechanics in Azure Monitor: **stateful** alerts that auto-resolve, **dynamic thresholds** where normal varies by time of day, dimensions so one alert covers many instances without firing once per instance, **alert processing rules** for maintenance windows, and severity mapped to routing - sev 0-1 page, sev 2-3 ticket.',
      'Finally, **ownership and hygiene**: every alert has an owner and a runbook link, and we review alerts regularly - any alert that fired without anyone needing to act gets tuned or deleted.',
    ],
    deeper: [
      'Multi-window burn-rate alerts - a short window to detect fast and a longer one to confirm - are the standard way to get both quick detection and few false positives. They are straightforward to express as log search alerts in KQL over request data.',
      'Alert storms from one root cause - a database outage making twenty services fail - are best handled by paging on the top-level symptom and letting dependent alerts go to lower severity, or by grouping in the incident tool.',
    ],
    code: [
      {
        title: 'Burn-rate check over two windows (KQL)',
        language: 'text',
        code: `// SLO: 99.9% success. Error budget = 0.1%.
let slo = 0.999;
let budget = 1.0 - slo;
let burn = (window: timespan) {
    AppRequests
    | where TimeGenerated > ago(window) and AppRoleName == "orders-api"
    | summarize errorRatio = 1.0 * countif(Success == false) / count()
    | extend burnRate = errorRatio / budget
};
burn(5m) | extend window = "5m"
| union (burn(1h) | extend window = "1h")
// Page only if BOTH windows burn faster than 14x (the month's budget in about 2 days)`,
      },
      {
        title: 'Dynamic-threshold metric alert',
        language: 'bash',
        code: `az monitor metrics alert create -g rg-monitor -n orders-latency-dynamic \\
  --scopes <app-insights-resource-id> \\
  --condition "avg requests/duration > dynamic medium 2 of 4 since 2026-09-01T00:00:00Z" \\
  --window-size 5m --evaluation-frequency 5m --severity 2 \\
  --action ag-platform-tickets`,
        placeholders: ['<app-insights-resource-id>'],
      },
    ],
    traps: [
      'Paging on CPU, memory and disk for every VM.',
      'Alerts with no owner and no runbook.',
      'Static thresholds on metrics that vary widely by time of day.',
    ],
    followUps: [
      'How do you choose an SLO target?',
      'What would you do with an alert that fires weekly and nobody acts on?',
    ],
    tags: ['alerting', 'slo', 'on-call', 'design'],
  },
  {
    id: 'itv-azmon-21',
    level: 'basic',
    kind: 'mcq',
    prompt:
      'A production resource group was deleted yesterday afternoon. Where do you look first to see who did it?',
    options: [
      { id: 'a', text: 'The Azure Activity log for the subscription' },
      { id: 'b', text: 'Application Insights for the apps in that group' },
      { id: 'c', text: 'The resource group’s own diagnostic settings' },
      { id: 'd', text: 'Defender for Cloud secure score history' },
    ],
    correct: ['a'],
    probing:
      'Knowing the activity log is the control-plane audit trail - and its default retention.',
    answer: [
      'The **activity log** records every control-plane write, action and delete at subscription level - who (the caller), what, when, from which IP, and whether it succeeded. A resource group delete appears there even though the group itself no longer exists, which is exactly why the resource group’s own settings cannot help.',
      'It is retained for **90 days** by default. For longer retention and KQL, route it with a subscription diagnostic setting to a Log Analytics workspace, where it lands in the `AzureActivity` table. Application Insights sees application telemetry, not management operations, and secure score is about posture.',
    ],
    code: [
      {
        title: 'Find the delete',
        language: 'bash',
        code: `az monitor activity-log list --offset 2d \\
  --query "[?operationName.value=='Microsoft.Resources/subscriptions/resourceGroups/delete'].{when:eventTimestamp, who:caller, rg:resourceGroupName, status:status.value}" \\
  -o table`,
      },
      {
        title: 'The same in Log Analytics',
        language: 'text',
        code: `AzureActivity
| where TimeGenerated > ago(2d)
| where OperationNameValue =~ "MICROSOFT.RESOURCES/SUBSCRIPTIONS/RESOURCEGROUPS/DELETE"
| project TimeGenerated, Caller, CallerIpAddress, ResourceGroup, ActivityStatusValue`,
      },
    ],
    traps: ['Not exporting the activity log, so after 90 days the evidence is gone.'],
    followUps: ['How would you prevent a production resource group from being deleted?'],
    tags: ['activity log', 'audit', 'basics'],
  },
]
