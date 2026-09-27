import type { InterviewQuestion } from '../../../types'

/** App Service plans, deployment slots, 5xx troubleshooting and Azure Functions hosting. */
export const azureComputeAppServiceQuestions: InterviewQuestion[] = [
  {
    id: 'itv-azc-4',
    level: 'basic',
    kind: 'open',
    prompt:
      'What is the relationship between an App Service plan and a web app? Explain scale up versus scale out.',
    probing:
      'The basic cost and capacity model of App Service. Many people do not realise the plan is the server and apps share it.',
    answer: [
      'An **App Service plan** is the **compute**: a set of VM instances of a given size and tier, in one region, running Windows or Linux. A **web app** is an application deployed **onto** a plan. Several apps can share one plan, and they all run on **every instance** of that plan and share its CPU and memory. You pay for the plan, not the apps.',
      'That means one noisy app can starve the others on the same plan, so I group apps by how they scale and how critical they are, and give important production apps their own plan.',
      '**Scale up** means changing the plan’s **tier or size** - from Basic to Premium v3, or from P1v3 to P2v3 - for more CPU and memory per instance or features like deployment slots, zone redundancy and more VNet options. **Scale out** means adding **instances**, manually, with autoscale rules, or with **automatic scaling** based on HTTP traffic. Scale out is how you handle load; scale up is how you handle bigger per-request needs or unlock features.',
      'For production I would use **Premium v3 or v4**, **zone redundancy** with at least three instances, a health check path, and autoscale.',
    ],
    diagrams: [
      {
        kind: 'nested',
        title: 'Apps run on every instance of their plan',
        caption: 'The plan is the bill and the capacity; apps on it share both.',
        root: {
          label: 'App Service plan P1v3, 3 instances',
          detail: 'Zone redundant, uksouth',
          tone: 'accent',
          children: [
            {
              label: 'Instance 1',
              children: [{ label: 'app-shop-web' }, { label: 'app-shop-api' }],
            },
            {
              label: 'Instance 2',
              children: [{ label: 'app-shop-web' }, { label: 'app-shop-api' }],
            },
            {
              label: 'Instance 3',
              children: [{ label: 'app-shop-web' }, { label: 'app-shop-api' }],
            },
          ],
        },
      },
    ],
    code: [
      {
        title: 'A zone-redundant plan, then both kinds of scaling',
        language: 'bash',
        code: `az appservice plan create -g rg-shop -n asp-shop-prod --is-linux \\
  --sku P1v3 --number-of-workers 3 --zone-redundant

az webapp create -g rg-shop -p asp-shop-prod -n app-shop-api --runtime "DOTNETCORE:8.0"

az appservice plan update -g rg-shop -n asp-shop-prod --sku P2v3            # scale up
az appservice plan update -g rg-shop -n asp-shop-prod --number-of-workers 6 # scale out`,
      },
    ],
    traps: [
      'Thinking each app has its own server.',
      'Scaling up to fix a load problem that scale out would solve more cheaply.',
      'Putting production and test apps on the same plan.',
    ],
    followUps: ['What does per-app scaling do?', 'Which features need Standard or Premium tiers?'],
    tags: ['app service', 'app service plan', 'scaling', 'basics'],
  },
  {
    id: 'itv-azc-5',
    level: 'intermediate',
    kind: 'open',
    prompt:
      'How do deployment slots work, and how do you do a safe zero-downtime release with them?',
    probing:
      'The standard App Service release pattern. They want warm-up, sticky settings, swap with preview, and rollback by swapping back.',
    answer: [
      'A **deployment slot** is a separate live app - with its own hostname like `app-shop-api-staging.azurewebsites.net` - running on the **same plan** as production. You deploy the new version to the **staging** slot, test it there, then **swap** staging and production.',
      'A swap does not copy files. App Service first applies production’s **slot-specific settings** to the staging instances, **restarts and warms them up** - hitting the root path or your configured warm-up path until they respond - and only then **switches routing** so production traffic goes to the warmed instances. That is why a swap has no cold start for users.',
      'Settings marked as **deployment slot settings** are **sticky**: they stay with the slot. I make things like the environment name, the production database connection string for the prod slot, or feature flags that differ per slot sticky. Everything else travels with the code.',
      'For extra safety I use **swap with preview**, which does the configuration and warm-up phase and then pauses so I can check staging with production settings before completing. And rollback is simply **swapping back**, since the previous version is now sitting warm in the staging slot.',
    ],
    diagrams: [
      {
        kind: 'sequence',
        title: 'What a slot swap actually does',
        caption:
          'Traffic only moves after the target instances are warmed with production settings.',
        participants: [
          { id: 'ci', label: 'Pipeline' },
          { id: 'stage', label: 'Staging slot' },
          { id: 'prod', label: 'Production slot' },
          { id: 'fe', label: 'App Service front ends' },
        ],
        messages: [
          { from: 'ci', to: 'stage', label: 'Deploy v2 and smoke test' },
          { from: 'ci', to: 'stage', label: 'Swap: apply prod settings, warm up' },
          { from: 'stage', to: 'ci', label: 'Warm-up path returns 200', kind: 'return' },
          { from: 'ci', to: 'fe', label: 'Switch routing' },
          { from: 'fe', to: 'stage', label: 'Production traffic now on v2' },
          { from: 'prod', to: 'ci', label: 'v1 kept warm for swap back', kind: 'return' },
        ],
      },
    ],
    code: [
      {
        title: 'Deploy to staging, swap, and swap back if needed',
        language: 'bash',
        code: `az webapp deployment slot create -g rg-shop -n app-shop-api --slot staging

# Sticky setting: stays with the slot during swaps
az webapp config appsettings set -g rg-shop -n app-shop-api --slot staging \\
  --slot-settings ASPNETCORE_ENVIRONMENT=Staging

az webapp deploy -g rg-shop -n app-shop-api --slot staging --src-path app.zip --type zip

az webapp deployment slot swap -g rg-shop -n app-shop-api --slot staging --target-slot production

# Rollback
az webapp deployment slot swap -g rg-shop -n app-shop-api --slot staging --target-slot production`,
      },
      {
        title: 'Custom warm-up so swap waits for the app to be ready',
        language: 'bash',
        code: `az webapp config appsettings set -g rg-shop -n app-shop-api --slot staging --settings \\
  WEBSITE_SWAP_WARMUP_PING_PATH=/healthz \\
  WEBSITE_SWAP_WARMUP_PING_STATUSES=200`,
      },
    ],
    traps: [
      'Forgetting to make per-environment settings sticky, so staging’s test database connection string moves into production.',
      'Database schema changes that are not backward compatible - swap back cannot undo a migration.',
      'Assuming slots are isolated capacity. They share the plan’s instances.',
    ],
    followUps: [
      'What does not swap?',
      'How would you handle a database migration with slots?',
      'What is auto swap?',
    ],
    tags: ['app service', 'deployment slots', 'zero downtime', 'releases'],
  },
  {
    id: 'itv-azc-6',
    level: 'intermediate',
    kind: 'multi',
    prompt:
      'When you swap an App Service staging slot into production, which of these move with the swap? Select all that apply.',
    options: [
      { id: 'a', text: 'The deployed application content' },
      { id: 'b', text: 'App settings that are not marked as deployment slot settings' },
      { id: 'c', text: 'Scale settings such as the instance count' },
      { id: 'd', text: 'Custom domain names bound to the production slot' },
      { id: 'e', text: 'Connection strings that are not marked as slot settings' },
    ],
    correct: ['a', 'b', 'e'],
    probing: 'The exact swap semantics, which decide whether a release leaks configuration.',
    answer: [
      'The **content**, and **app settings and connection strings that are not sticky**, move with the swap - along with general settings like the runtime stack version, handler mappings and public certificates.',
      '**Scale settings** belong to the plan and the slot, and **custom domains**, TLS bindings, IP access restrictions, Always On, managed identities, VNet integration and diagnostic settings stay where they are. That is why the production hostname keeps working after a swap and why you must mark per-environment settings sticky.',
    ],
    code: [
      {
        title: 'Which settings are sticky on this slot?',
        language: 'bash',
        code: `az webapp config appsettings list -g rg-shop -n app-shop-api --slot staging \\
  --query "[].{name:name, sticky:slotSetting}" -o table`,
      },
    ],
    traps: ['Assuming managed identity or VNet integration moves with the code.'],
    followUps: [
      'Why do managed identities not swap, and what does that mean for Key Vault access?',
    ],
    tags: ['app service', 'deployment slots', 'configuration'],
  },
  {
    id: 'itv-azc-7',
    level: 'advanced',
    kind: 'scenario',
    prompt:
      'Right after a release, your App Service app starts returning a mix of 500, 502 and 503 errors. Walk me through the troubleshooting.',
    probing:
      'They want the codes interpreted - app error, front end could not get a response, no healthy instance - then evidence from logs, and a fast mitigation.',
    answer: [
      'First, **mitigate**: the release is the obvious suspect, so if slots are in use I **swap back** immediately and investigate on the staging slot. Restoring service beats understanding it.',
      'Then I read the codes. A **500** is the application throwing - an unhandled exception, a bad configuration value, a failed dependency. A **502** means the App Service front end could not get a valid response from the worker - the app process crashed, did not start, or did not answer within the request timeout, which on Linux is often the container not listening on the expected port. A **503** usually means **no healthy instance** was available - all instances were restarting, the app was stopped, or health check had marked them unhealthy.',
      'For evidence I use **Diagnose and solve problems** - its availability and application crash detectors are good - the **log stream** or container logs for startup errors, **Application Insights** failures and exceptions grouped by type, and the **AppServiceHTTPLogs** and console log tables in Log Analytics. For a release-related failure, the usual findings are a missing app setting or Key Vault reference that fails to resolve, a new dependency the managed identity cannot access, a startup that became too slow for the timeout, or a runtime or port mismatch.',
      'If it is not the release, I check the platform side: CPU or memory exhaustion on the plan, **SNAT port exhaustion** on outbound calls, and Resource Health for the plan. Afterwards, the release gets a **health check path** and a **swap with warm-up** that would have caught it before users did.',
    ],
    code: [
      {
        title: 'Stream logs and check the recent deployment',
        language: 'bash',
        code: `az webapp log config -g rg-shop -n app-shop-api --docker-container-logging filesystem \\
  --application-logging filesystem --level information
az webapp log tail -g rg-shop -n app-shop-api

# Key Vault references that failed to resolve show here
az webapp config appsettings list -g rg-shop -n app-shop-api -o table

# Linux: is the app listening on the port App Service expects?
az webapp config appsettings set -g rg-shop -n app-shop-api --settings WEBSITES_PORT=8080`,
      },
      {
        title: 'Which paths and instances are failing?',
        language: 'text',
        code: `AppServiceHTTPLogs
| where TimeGenerated > ago(1h)
| where ScStatus >= 500
| summarize errors = count() by ScStatus, CsUriStem, ComputerName, bin(TimeGenerated, 5m)
| order by errors desc

AppServiceConsoleLogs
| where TimeGenerated > ago(1h)
| where ResultDescription has_any ("Exception", "error", "failed to start")
| project TimeGenerated, _ResourceId, ResultDescription`,
      },
      {
        title: 'Health check so bad instances are taken out of rotation',
        language: 'bash',
        code: `az webapp config set -g rg-shop -n app-shop-api --generic-configurations '{"healthCheckPath": "/healthz"}'`,
      },
    ],
    diagrams: [
      {
        kind: 'decision',
        title: 'What the 5xx code tells you',
        caption: 'Each code points at a different layer; swap back first, then read the evidence.',
        question: 'Which status code are users getting?',
        branches: [
          {
            condition: '500',
            result: 'The app threw',
            detail: 'Exceptions, config, dependencies',
            tone: 'danger',
          },
          {
            condition: '502',
            result: 'Worker did not answer properly',
            detail: 'Crash, port, startup, timeout',
            tone: 'warning',
          },
          {
            condition: '503',
            result: 'No healthy instance',
            detail: 'Restarting, stopped, health check',
            tone: 'warning',
          },
          {
            condition: '504 or slow 502',
            result: 'Request exceeded timeout',
            detail: 'Long-running request, async it',
            tone: 'muted',
          },
        ],
      },
    ],
    deeper: [
      'App Service has a fixed front-end request timeout of around 230 seconds. Requests that run longer fail regardless of your app’s own timeout, so long work belongs in a queue and a background worker.',
      'Health check removes an unhealthy instance from the load balancer and eventually replaces it, but only if there are enough instances. With one instance, health check cannot take it out of rotation, so run at least two.',
      'A Key Vault reference that cannot resolve leaves the raw reference string as the setting value, so the app fails in confusing ways. The portal shows the resolution status per setting.',
    ],
    traps: [
      'Debugging live in production instead of swapping back first.',
      'Treating all 5xx codes as "the app is broken".',
      'Restarting repeatedly without reading the logs.',
    ],
    followUps: [
      'How does the health check feature decide an instance is unhealthy?',
      'What would you add to the pipeline to catch this before swap?',
    ],
    tags: ['scenario', 'app service', '5xx', 'troubleshooting', 'kql'],
  },
  {
    id: 'itv-azc-8',
    level: 'intermediate',
    kind: 'open',
    prompt: 'Compare the Azure Functions hosting plans. How do you choose one?',
    probing:
      'Current knowledge of the plan landscape - including Flex Consumption - and the tradeoffs of cold start, networking, scale and cost.',
    answer: [
      '**Flex Consumption** is the recommended serverless plan for new apps. It scales to zero and bills per execution and memory, scales out fast per function, supports **VNet integration**, lets you pick instance memory size, and has **always-ready instances** to remove cold start for chosen functions.',
      'The original **Consumption** plan is the older serverless option: scale to zero, pay per execution, but limited networking, a short maximum execution time and noticeable cold starts. On Linux it is on a retirement path in favour of Flex Consumption, so I would not start new work on it.',
      'The **Premium** plan (Elastic Premium) keeps **pre-warmed instances** so there is no cold start, supports VNet integration and long-running executions, and still scales out elastically - but you pay for at least one instance all the time. It suits latency-sensitive APIs and steady load.',
      'A **Dedicated** App Service plan runs functions on VMs you already pay for, with no elastic event-driven scaling beyond normal autoscale - useful when spare capacity exists. And functions can also be hosted in **Azure Container Apps**, which suits teams already running containers there.',
      'So I choose on four questions: can it tolerate cold start, does it need private networking, how long do executions run, and is the load spiky or steady?',
    ],
    diagrams: [
      {
        kind: 'decision',
        title: 'Which Functions plan?',
        caption: 'Flex Consumption is the default for new serverless apps.',
        question: 'What matters most for this function app?',
        branches: [
          {
            condition: 'Spiky, pay per use, maybe VNet',
            result: 'Flex Consumption',
            detail: 'Always-ready instances optional',
            tone: 'success',
          },
          {
            condition: 'No cold start, steady load',
            result: 'Premium plan',
            detail: 'Pre-warmed instances',
            tone: 'accent',
          },
          {
            condition: 'Spare App Service capacity',
            result: 'Dedicated plan',
          },
          {
            condition: 'Already standardised on containers',
            result: 'Container Apps hosting',
            tone: 'muted',
          },
        ],
      },
    ],
    code: [
      {
        title: 'A Flex Consumption app with an always-ready HTTP instance',
        language: 'bash',
        code: `az functionapp create -g rg-fn -n func-orders-prod \\
  --storage-account stfnordersprod \\
  --flexconsumption-location uksouth \\
  --runtime python --runtime-version 3.11 \\
  --instance-memory 2048

# Keep one instance warm for HTTP-triggered functions
az functionapp scale config always-ready set -g rg-fn -n func-orders-prod --settings http=1

az functionapp scale config set -g rg-fn -n func-orders-prod --maximum-instance-count 100`,
      },
    ],
    traps: [
      'Choosing the classic Consumption plan for a new app that needs private networking.',
      'Putting long-running work in an HTTP-triggered function, which is bound by the HTTP timeout anyway.',
      'Assuming Premium scales to zero.',
    ],
    followUps: [
      'How would you run a workflow longer than any execution timeout?',
      'What does the storage account behind a function app do?',
    ],
    tags: ['azure functions', 'flex consumption', 'serverless', 'hosting plans'],
  },
  {
    id: 'itv-azc-9',
    level: 'advanced',
    kind: 'open',
    prompt:
      'An HTTP-triggered function has p99 latency of 8 seconds on the first request after idle. What causes cold start and how do you reduce it?',
    probing:
      'Understanding what happens during a cold start and the fixes at each layer - plan, packaging, code - rather than "use Premium".',
    answer: [
      'A **cold start** happens when no instance is running for the app, which on a scale-to-zero plan is normal after idle. The platform has to **allocate an instance**, **mount or download the app package**, **start the language worker** - the .NET, Node, Python or Java process - and then run your **startup code** before the first request can be served. Each step adds latency, and heavy startup code is often the biggest part.',
      'At the **plan** level: on Flex Consumption, configure **always-ready instances** for the HTTP group; on Premium, pre-warmed instances do this by default. That removes the allocation step for the baseline, and bursts beyond it still scale out.',
      'At the **packaging** level: deploy as a **run-from-package** zip rather than loose files, keep the package small by excluding dev dependencies, and for Python avoid building dependencies at startup. For .NET, the **isolated worker** model with ReadyToRun compilation starts faster.',
      'At the **code** level: move expensive initialisation - loading large models, warming caches, opening many connections - out of the critical path or make it lazy, reuse clients as statics, and avoid synchronous calls to Key Vault on every start by using app setting references. Then measure: Application Insights shows the gap between host start and first execution, so I can see which part shrank.',
    ],
    code: [
      {
        title: 'Measure cold starts in Application Insights',
        language: 'text',
        code: `requests
| where timestamp > ago(1d)
| where cloud_RoleName == "func-orders-prod"
| sort by timestamp asc
| extend idleMinutes = datetime_diff('minute', timestamp, prev(timestamp))
| extend afterIdle = idleMinutes > 10
| summarize p50 = percentile(duration, 50), p99 = percentile(duration, 99), n = count() by afterIdle`,
        explanation:
          'Requests that arrive after a long idle gap are the likely cold starts; comparing them with the rest shows the cold-start cost.',
      },
      {
        title: 'Reuse clients instead of creating them per invocation',
        language: 'python',
        code: `import azure.functions as func
from azure.identity import DefaultAzureCredential
from azure.storage.blob import BlobServiceClient

# Created once per worker process, reused across invocations
_credential = DefaultAzureCredential()
_blobs = BlobServiceClient("https://stordersprod.blob.core.windows.net", credential=_credential)

app = func.FunctionApp()

@app.route(route="orders/{id}")
def get_order(req: func.HttpRequest) -> func.HttpResponse:
    blob = _blobs.get_blob_client("orders", f"{req.route_params['id']}.json")
    return func.HttpResponse(blob.download_blob().readall(), mimetype="application/json")`,
      },
    ],
    deeper: [
      'Always-ready instances are billed even when idle, so choose the count from real concurrency data, not a guess. One warm instance is often enough to take the edge off the p99.',
      'VNet integration used to add noticeable cold start on older plans; on Flex Consumption and Premium it is part of the normal instance setup.',
      'If latency matters that much and load is steady, the honest answer may be that serverless is the wrong model and a container on Container Apps or App Service with a minimum instance count is simpler.',
    ],
    traps: [
      'Pinging the function every few minutes as a keep-warm hack instead of configuring always-ready.',
      'Blaming the platform while startup code loads a 500 MB model synchronously.',
      'Creating a new SDK client in every invocation.',
    ],
    followUps: [
      'How is concurrency per instance configured on Flex Consumption?',
      'When would you move this workload off Functions altogether?',
    ],
    tags: ['azure functions', 'cold start', 'performance', 'serverless'],
  },
]
