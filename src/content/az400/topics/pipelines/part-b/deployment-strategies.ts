import type { Topic } from '../../../../types'

export const az4DeploymentStrategies: Topic = {
  id: 'az4-deployment-strategies',
  title: 'Deployment strategies: blue-green, canary, rings and feature flags',
  domainId: 'az4-pipelines',
  difficulty: 'advanced',
  estimatedMinutes: 40,
  order: 7,
  tags: [
    'blue-green',
    'canary',
    'ring',
    'rolling',
    'feature flags',
    'app configuration',
    'deployment slots',
    'a/b testing',
  ],
  oneLiner:
    'Choose how new code reaches users - all at once, side by side, a slice at a time, or hidden behind a flag - and how you get back if it goes wrong.',
  explanation: [
    'A **deployment strategy** decides how a new version replaces the old one and how many users are exposed to it at each moment. The goal is always the same: minimise downtime and limit the **blast radius** of a bad release, so that a bug hurts a few users for a few minutes rather than everyone for an hour.',
    '**Blue-green** runs two identical environments. Blue serves production; you deploy the new version to green, test it, then switch all traffic at once. Rollback is switching back. On Azure App Service this is exactly what **deployment slots** give you: deploy to a `staging` slot, warm it up, and **swap** it with production. The swap exchanges the slots at the load-balancer level (historically called a **VIP swap**), so users see no downtime.',
    '**Canary** releases send a small percentage of real traffic (say 5 percent) to the new version, watch error rates and latency, then increase the percentage in steps. **Ring** deployment is the organisational version of the same idea: ring 0 is the team itself, ring 1 early adopters, ring 2 one region, ring 3 everyone. **Rolling** deployment replaces instances a few at a time on the same infrastructure, so capacity dips slightly but no second environment is needed.',
    '**Feature flags** (also called feature toggles) decouple **deployment** from **release**. The code for a feature ships to production switched off, and you turn it on for chosen users, groups or a percentage without redeploying. **Azure App Configuration** stores feature flags centrally, and its **targeting filter** lets you enable a flag for named users, groups or a rollout percentage. This is how you do **progressive exposure** at the feature level rather than the deployment level.',
    '**A/B testing** looks similar to canary but has a different purpose. A canary asks "is the new version healthy?"; an A/B test asks "which variant do users prefer?" and splits users deliberately and consistently between two variants, measuring a business metric such as conversion. Feature flag variants and App Service traffic routing can both drive it.',
  ],
  whyItMatters: [
    'The AZ-400 outline has two bullets on this: "design a deployment strategy, including blue-green, canary, ring, progressive exposure, feature flags and A/B testing" and "design a strategy to ensure reliability and to minimise downtime, including VIP swap, load balancing, rolling deployments and deployment slots". Scenario questions give a set of requirements and ask you to pick the strategy.',
    'Most outages are caused by changes. A strategy that exposes a change gradually, with automatic health checks and a fast way back, turns a potential outage into a minor incident.',
    'Feature flags also change how teams work: trunk-based development becomes practical because unfinished work can be merged behind a flag, and business owners can choose the launch moment without an engineering deployment.',
  ],
  howItWorks: [
    'In Azure Pipelines, a **deployment job** targets an environment and declares a `strategy`. Three are built in: `runOnce` (every hook once), `rolling` (for virtual machine resources, replacing `maxParallel` machines at a time) and `canary` (for Kubernetes, running the hooks once per value in `increments`).',
    'Each strategy runs **lifecycle hooks**: `preDeploy`, `deploy`, `routeTraffic`, `postRouteTraffic`, and `on: failure` / `on: success`. You put health checks in `postRouteTraffic` and rollback steps in `on: failure`, so the pipeline itself encodes the "watch and revert" logic.',
    'For App Service, a staging slot is a full live app with its own hostname. `az webapp deployment slot swap` warms up the source slot (hitting the site root, or the paths in the `WEBSITE_SWAP_WARMUP_PING_PATH` setting), applies production settings, and then swaps the routing. Settings marked **deployment slot setting** (sticky) stay with the slot instead of travelling with the code. Slots require the Standard tier or higher.',
    '**Swap with preview** (multi-phase swap) splits this into two steps: phase one applies the target slot settings to the source and warms it up; you validate; phase two completes the swap, or you reset. App Service **traffic routing** (Testing in production) can also send a fixed percentage of production traffic to a slot, which gives you a simple canary.',
    'For containers, Azure Container Apps runs multiple **revisions** side by side and splits ingress traffic by weight; AKS canaries use the KubernetesManifest task with `strategy: canary`, which creates baseline and canary workloads you then `promote` or `reject`. At the global edge, Azure Front Door and Traffic Manager weighted routing split traffic between regions or stamps.',
    'Feature flags are read by the application at runtime through the App Configuration provider and the feature management library. Changing a flag in the store takes effect as soon as the app refreshes its configuration cache, with no pipeline run at all.',
  ],
  diagrams: [
    {
      kind: 'decision',
      title: 'Picking a deployment strategy',
      caption:
        'Start from the constraint that matters most: instant rollback, limited exposure, no extra infrastructure, or releasing independently of deploying.',
      question: 'What is the main requirement for this release?',
      branches: [
        {
          condition: 'Instant switch and instant rollback',
          result: 'Blue-green',
          detail: 'App Service slot swap, two identical stamps',
          tone: 'accent',
        },
        {
          condition: 'Expose a small share of traffic first',
          result: 'Canary',
          detail: 'Traffic routing percent, revision weights',
        },
        {
          condition: 'Release to user groups in waves',
          result: 'Ring deployment',
          detail: 'Internal, early adopters, then everyone',
        },
        {
          condition: 'No second environment available',
          result: 'Rolling',
          detail: 'Replace a few instances at a time',
        },
        {
          condition: 'Ship code dark, launch later',
          result: 'Feature flags',
          detail: 'Azure App Configuration targeting filter',
          tone: 'success',
        },
      ],
    },
    {
      kind: 'flow',
      title: 'Blue-green with App Service slots',
      caption:
        'The swap exchanges routing, not files, so production changes in seconds and a second swap is the rollback.',
      nodes: [
        {
          label: 'Deploy to staging slot',
          detail: 'Production keeps serving users',
          tone: 'accent',
        },
        {
          label: 'Warm up and smoke test',
          detail: 'Hit staging hostname and health path',
          arrowLabel: 'validate',
        },
        {
          label: 'Swap staging and production',
          detail: 'Sticky settings stay with the slot',
          arrowLabel: 'approve',
          tone: 'warning',
        },
        {
          label: 'Monitor production',
          detail: 'Errors, latency, Application Insights',
          arrowLabel: 'observe',
          branch: {
            label: 'Swap back',
            detail: 'Old version is still in staging',
            tone: 'danger',
          },
        },
        {
          label: 'Release complete',
          detail: 'Next build overwrites staging',
          tone: 'success',
        },
      ],
    },
  ],
  keyObjects: [
    {
      kind: 'Deployment slot (Microsoft.Web/sites/slots)',
      apiVersion: '2023-12-01',
      purpose:
        'A live copy of an App Service app with its own hostname, used for staging, blue-green swaps and percentage traffic routing.',
      fields: [
        {
          path: 'properties.serverFarmId',
          meaning:
            'Slots run on the same App Service plan as the production app and share its instances.',
          required: true,
        },
        {
          path: 'properties.siteConfig.autoSwapSlotName',
          meaning:
            'Enables auto swap: after a deployment to this slot completes, it swaps into the named slot.',
        },
        {
          path: 'slotConfigNames (config/slotConfigNames)',
          meaning:
            'Lists app setting and connection string names that are sticky, so they stay with the slot during a swap.',
        },
        {
          path: 'siteConfig.experiments.rampUpRules',
          meaning: 'Traffic routing rules that send a percentage of production traffic to a slot.',
        },
      ],
    },
    {
      kind: 'Feature flag (Azure App Configuration)',
      purpose:
        'A key-value in an App Configuration store under the .appconfig.featureflag/ prefix that the app reads to switch behaviour on or off.',
      fields: [
        {
          path: 'enabled',
          meaning: 'Master switch. When false, filters are ignored and the feature is off.',
          required: true,
        },
        {
          path: 'conditions.client_filters',
          meaning:
            'Filters such as Microsoft.Targeting (users, groups, default rollout percentage) or Microsoft.TimeWindow.',
        },
        {
          path: 'variants / allocation',
          meaning:
            'Variant feature flags return different values to different users, which is the basis for A/B tests.',
        },
      ],
    },
    {
      kind: 'Deployment job strategy',
      purpose: 'How an Azure Pipelines deployment job rolls out to its environment.',
      fields: [
        { path: 'strategy.runOnce', meaning: 'Runs each lifecycle hook once. The default choice.' },
        {
          path: 'strategy.rolling.maxParallel',
          meaning: 'For VM resources: how many machines (or what percentage) to update at a time.',
        },
        {
          path: 'strategy.canary.increments',
          meaning:
            'List of percentages; the hooks run once per increment, then once at 100 percent.',
        },
      ],
    },
  ],
  realWorldExample: {
    title: 'The checkout redesign that nobody noticed breaking',
    story: [
      'An online shop deployed a redesigned checkout straight to production on a Friday. Payment errors rose from 0.2 to 3 percent, but only for one card provider, and it took four hours to trace. The rollback meant redeploying the previous build, another twenty minutes.',
      'The team changed three things. Every release now goes to an App Service staging slot and is swapped in, so rollback is a second swap measured in seconds. New checkout behaviour ships behind an App Configuration feature flag with a targeting filter: staff first, then 5 percent of customers, then 25, then everyone.',
      'The pipeline gained a post-swap health check that queries Application Insights for failed dependency calls; if the rate exceeds a threshold, the `on: failure` hook swaps back automatically.',
      'The next checkout change showed a similar payment error at the 5 percent stage. The flag was switched off in under a minute, a fraction of customers were affected, and the fix shipped on Monday with no drama.',
    ],
  },
  yamlExamples: [
    {
      title: 'Azure Pipelines: slot deploy, health check, swap and automatic rollback',
      language: 'yaml',
      explanation:
        'runOnce hooks encode the whole blue-green flow. If postRouteTraffic fails, on failure swaps the slots back.',
      code: `stages:
  - stage: Production
    jobs:
      - deployment: DeployWeb
        environment: orders-prod
        pool:
          vmImage: ubuntu-latest
        strategy:
          runOnce:
            deploy:
              steps:
                - download: current
                  artifact: drop
                - task: AzureWebApp@1
                  inputs:
                    azureSubscription: sc-orders-prod
                    appType: webAppLinux
                    appName: app-orders-prod
                    deployToSlotOrASE: true
                    resourceGroupName: rg-orders-prod
                    slotName: staging
                    package: $(Pipeline.Workspace)/drop/*.zip
            routeTraffic:
              steps:
                - task: AzureAppServiceManage@0
                  inputs:
                    azureSubscription: sc-orders-prod
                    action: Swap Slots
                    webAppName: app-orders-prod
                    resourceGroupName: rg-orders-prod
                    sourceSlot: staging
            postRouteTraffic:
              steps:
                - bash: curl --fail --retry 5 --retry-delay 10 https://app-orders-prod.azurewebsites.net/health
                  displayName: Production health check
            on:
              failure:
                steps:
                  - task: AzureAppServiceManage@0
                    displayName: Roll back by swapping again
                    inputs:
                      azureSubscription: sc-orders-prod
                      action: Swap Slots
                      webAppName: app-orders-prod
                      resourceGroupName: rg-orders-prod
                      sourceSlot: staging`,
    },
    {
      title: 'Azure Pipelines: Kubernetes canary with promote and reject',
      language: 'yaml',
      explanation:
        'The canary strategy runs deploy once per increment. The KubernetesManifest task creates canary and baseline workloads; a manual or automated decision then promotes or rejects.',
      code: `jobs:
  - deployment: DeployApi
    environment: aks-prod.orders
    pool:
      vmImage: ubuntu-latest
    strategy:
      canary:
        increments: [10, 25]
        deploy:
          steps:
            - task: KubernetesManifest@1
              inputs:
                action: deploy
                strategy: canary
                percentage: $(strategy.increment)
                manifests: manifests/deployment.yml
                containers: acrorders.azurecr.io/orders-api:$(Build.BuildId)
        postRouteTraffic:
          pool: server
          steps:
            - task: Delay@1
              inputs:
                delayForMinutes: '10'
        on:
          failure:
            steps:
              - task: KubernetesManifest@1
                inputs:
                  action: reject
                  strategy: canary
                  manifests: manifests/deployment.yml
          success:
            steps:
              - task: KubernetesManifest@1
                inputs:
                  action: promote
                  strategy: canary
                  manifests: manifests/deployment.yml
                  containers: acrorders.azurecr.io/orders-api:$(Build.BuildId)`,
    },
    {
      title: 'GitHub Actions: deploy to a slot, then swap',
      language: 'yaml',
      explanation:
        'OIDC login, deploy to staging, smoke test the slot hostname, then swap. The production environment can hold required reviewers.',
      code: `name: release
on:
  push:
    branches: [main]

permissions:
  id-token: write
  contents: read

jobs:
  deploy:
    runs-on: ubuntu-latest
    environment: production
    steps:
      - uses: actions/download-artifact@v4
        with:
          name: webapp
      - uses: azure/login@v2
        with:
          client-id: \${{ vars.AZURE_CLIENT_ID }}
          tenant-id: \${{ vars.AZURE_TENANT_ID }}
          subscription-id: \${{ vars.AZURE_SUBSCRIPTION_ID }}
      - uses: azure/webapps-deploy@v3
        with:
          app-name: app-orders-prod
          slot-name: staging
          package: .
      - name: Smoke test staging slot
        run: curl --fail --retry 5 https://app-orders-prod-staging.azurewebsites.net/health
      - name: Swap staging into production
        run: az webapp deployment slot swap -g rg-orders-prod -n app-orders-prod --slot staging --target-slot production`,
    },
  ],
  imperative: [
    {
      command:
        'az webapp deployment slot create --resource-group rg-orders-prod --name app-orders-prod --slot staging --configuration-source app-orders-prod',
      what: 'Creates a staging slot and clones configuration from production.',
      expected: 'JSON for the new slot with hostname app-orders-prod-staging.azurewebsites.net.',
    },
    {
      command:
        'az webapp deployment slot swap --resource-group rg-orders-prod --name app-orders-prod --slot staging --target-slot production',
      what: 'Warms up staging and swaps it with production. Run the same command again to roll back.',
    },
    {
      command:
        'az webapp deployment slot swap --resource-group rg-orders-prod --name app-orders-prod --slot staging --action preview',
      what: 'Phase one of swap with preview: applies production settings to staging so you can validate before completing with --action swap, or cancel with --action reset.',
    },
    {
      command:
        'az webapp traffic-routing set --resource-group rg-orders-prod --name app-orders-prod --distribution staging=10',
      what: 'Sends 10 percent of production traffic to the staging slot - a simple canary.',
      expected: 'A ramp-up rule for staging at 10 percent.',
    },
    {
      command:
        'az appconfig feature set --name appcs-orders --feature NewCheckout --yes && az appconfig feature filter add --name appcs-orders --feature NewCheckout --filter-name Microsoft.Targeting --filter-parameters Audience=\'{"Users":[],"Groups":[{"Name":"staff","RolloutPercentage":100}],"DefaultRolloutPercentage":5}\' --yes',
      what: 'Creates a feature flag and adds a targeting filter: all staff plus 5 percent of everyone else.',
    },
    {
      command:
        'az containerapp ingress traffic set --name ca-orders --resource-group rg-orders-prod --revision-weight ca-orders--v1=90 ca-orders--v2=10',
      what: 'Splits Container Apps ingress between two revisions for a canary. The app must be in multiple revision mode.',
    },
  ],
  declarative: {
    steps: [
      'Put the App Service plan on Standard tier or higher so slots are available.',
      'Declare the staging slot in Bicep next to the app, and mark environment-specific settings as sticky with slotConfigNames.',
      'Declare the App Configuration store and feature flags in Bicep so their initial state is reviewed like code.',
      'Deploy code to the slot from the pipeline and swap in a later lifecycle hook with a health check and rollback.',
    ],
    code: [
      {
        title: 'Bicep: app, staging slot and sticky settings',
        language: 'bicep',
        code: `param location string = resourceGroup().location
param appName string = 'app-orders-prod'

resource plan 'Microsoft.Web/serverfarms@2023-12-01' = {
  name: 'asp-orders-prod'
  location: location
  sku: {
    name: 'S1'
  }
  kind: 'linux'
  properties: {
    reserved: true
  }
}

resource app 'Microsoft.Web/sites@2023-12-01' = {
  name: appName
  location: location
  properties: {
    serverFarmId: plan.id
    siteConfig: {
      linuxFxVersion: 'DOTNETCORE|8.0'
      healthCheckPath: '/health'
      appSettings: [
        { name: 'ENVIRONMENT_NAME', value: 'production' }
      ]
    }
  }
}

resource staging 'Microsoft.Web/sites/slots@2023-12-01' = {
  parent: app
  name: 'staging'
  location: location
  properties: {
    serverFarmId: plan.id
    siteConfig: {
      linuxFxVersion: 'DOTNETCORE|8.0'
      appSettings: [
        { name: 'ENVIRONMENT_NAME', value: 'staging' }
      ]
    }
  }
}

resource sticky 'Microsoft.Web/sites/config@2023-12-01' = {
  parent: app
  name: 'slotConfigNames'
  properties: {
    appSettingNames: [
      'ENVIRONMENT_NAME'
    ]
  }
}`,
      },
      {
        title: 'Bicep: App Configuration store with a feature flag',
        language: 'bicep',
        explanation:
          'Feature flags are key-values whose key starts with .appconfig.featureflag~2F (the URL-encoded slash) and that use the feature flag content type.',
        code: `param location string = resourceGroup().location

resource store 'Microsoft.AppConfiguration/configurationStores@2023-03-01' = {
  name: 'appcs-orders'
  location: location
  sku: {
    name: 'standard'
  }
}

var flagValue = {
  id: 'NewCheckout'
  description: 'Redesigned checkout flow'
  enabled: true
  conditions: {
    client_filters: [
      {
        name: 'Microsoft.Targeting'
        parameters: {
          Audience: {
            Users: []
            Groups: [
              { Name: 'staff', RolloutPercentage: 100 }
            ]
            DefaultRolloutPercentage: 5
          }
        }
      }
    ]
  }
}

resource newCheckout 'Microsoft.AppConfiguration/configurationStores/keyValues@2023-03-01' = {
  parent: store
  name: '.appconfig.featureflag~2FNewCheckout'
  properties: {
    value: string(flagValue)
    contentType: 'application/vnd.microsoft.appconfig.ff+json;charset=utf-8'
  }
}`,
      },
    ],
  },
  verification: [
    {
      command:
        'az webapp deployment slot list --resource-group rg-orders-prod --name app-orders-prod -o table',
      what: 'Lists slots for the app.',
      expected: 'A row for staging with state Running.',
    },
    {
      command:
        'az webapp traffic-routing show --resource-group rg-orders-prod --name app-orders-prod',
      what: 'Shows current percentage routing rules.',
      expected:
        'An empty list after a full release, or staging with its reroute percentage during a canary.',
    },
    {
      command: 'az appconfig feature show --name appcs-orders --feature NewCheckout',
      what: 'Shows the flag state and its filters.',
      expected: 'state on and a Microsoft.Targeting filter.',
    },
    {
      command:
        'az containerapp revision list --name ca-orders --resource-group rg-orders-prod --query "[].{name:name,weight:properties.trafficWeight,active:properties.active}" -o table',
      what: 'Shows each revision and the share of traffic it receives.',
    },
  ],
  troubleshooting: [
    {
      command:
        'az webapp log deployment show --resource-group rg-orders-prod --name app-orders-prod --slot staging',
      what: 'Shows the latest deployment log for the slot when a swap fails because the slot never became healthy.',
    },
    {
      command:
        'az webapp config appsettings list --resource-group rg-orders-prod --name app-orders-prod --slot staging --query "[?slotSetting]"',
      what: 'Lists sticky settings. A production connection string that moved to staging after a swap was not marked as a slot setting.',
      expected: 'Every environment-specific setting should appear with slotSetting true.',
    },
    {
      command:
        'az monitor app-insights query --app <appInsightsName> --resource-group rg-orders-prod --analytics-query "requests | where timestamp > ago(15m) | summarize failures=countif(success == false), total=count() by cloud_RoleInstance"',
      what: 'Compares failure rates per instance during a canary to decide whether to promote or roll back.',
      placeholders: ['<appInsightsName>'],
    },
  ],
  commonMistakes: [
    'Forgetting to mark environment-specific settings as deployment slot settings, so the swap carries the staging database connection string into production.',
    'Choosing slots on a Basic or Free plan. Deployment slots need Standard, Premium or Isolated tiers.',
    'Treating a feature flag as a permanent configuration switch. Old flags pile up as technical debt; remove them once a feature is fully released.',
    'Confusing canary with A/B testing. A canary validates health and is short-lived; an A/B test measures user behaviour and keeps users consistently in one variant.',
    'Using a rolling deployment for a change that is not backward compatible, such as a destructive database migration, while old and new instances run side by side.',
    'Assuming a slot swap rolls back the database. Swaps move code and configuration only; data changes need their own expand-and-contract migration plan.',
  ],
  examTips: [
    'Zero downtime plus instant rollback on App Service means **deployment slots and swap**. The exam may call it a VIP swap.',
    '"Release to a small percentage and increase gradually" is **canary**; "release to internal users, then early adopters, then everyone" is **ring**; "turn a feature on without deploying" is **feature flags** with Azure App Configuration.',
    'The Azure Pipelines `rolling` strategy targets virtual machine resources; the `canary` strategy is used with Kubernetes resources. `runOnce` works everywhere.',
    'Know the lifecycle hooks in order: preDeploy, deploy, routeTraffic, postRouteTraffic, then on failure or on success.',
    'Swap with preview lets you validate the source slot with production settings before the final phase. Auto swap swaps automatically after each deployment to a slot.',
    'A/B testing is about measuring a business outcome between variants, not about deployment safety.',
  ],
  summary: [
    'Blue-green switches all traffic between two environments; App Service slots implement it.',
    'Canary and ring deployments limit exposure by traffic share or by user group.',
    'Rolling replaces instances a few at a time on existing infrastructure.',
    'Feature flags separate deployment from release and live in Azure App Configuration.',
    'Deployment jobs encode strategy and rollback through lifecycle hooks.',
    'Sticky slot settings and backward-compatible data changes make swaps safe.',
  ],
  practice: [
    {
      id: 'az4-deployment-strategies-p1',
      level: 'intermediate',
      prompt:
        'An App Service app must be updated with no downtime, and the team must be able to revert within seconds. Which approach fits best?',
      answer:
        'Deploy to a staging deployment slot, validate it, then swap into production. Rolling back is swapping again, because the previous version is still in the staging slot.',
      explanation:
        'Redeploying an old build takes minutes; a swap only changes routing. Slots need the Standard tier or higher.',
    },
    {
      id: 'az4-deployment-strategies-p2',
      level: 'advanced',
      prompt:
        'Marketing wants to launch a feature at a specific moment next week, but engineering wants the code in production today. How do you satisfy both?',
      answer:
        'Deploy the code today behind a feature flag in Azure App Configuration with the flag disabled, then enable it at launch time (optionally with a time window filter), with no deployment required.',
      explanation:
        'Feature flags decouple deploying code from releasing a feature. A TimeWindow filter can even switch it on automatically.',
    },
    {
      id: 'az4-deployment-strategies-p3',
      level: 'intermediate',
      prompt:
        'After a slot swap, production starts writing to the staging database. What went wrong and how do you prevent it?',
      answer:
        'The connection string was not marked as a deployment slot setting, so it travelled with the code during the swap. Mark it as a slot setting (sticky) in each slot.',
      explanation: 'Only sticky settings stay with a slot; everything else swaps.',
    },
    {
      id: 'az4-deployment-strategies-p4',
      level: 'advanced',
      prompt:
        'In a canary deployment job with increments [10, 25], where would you put an automated health gate and where would you put the rollback?',
      answer:
        'Put the health check in the postRouteTraffic hook, so it runs after each increment receives traffic, and put the rollback (for example KubernetesManifest reject) in on: failure.',
      explanation:
        'If postRouteTraffic fails, the on failure hook runs; if every increment passes, on success promotes the canary.',
    },
  ],
  lab: {
    title: 'Blue-green and canary on App Service with a feature flag',
    scenario:
      'Create a web app with a staging slot, route a slice of traffic to it, swap it in, and create a targeted feature flag in App Configuration.',
    prerequisites: [
      'An Azure subscription (Cloud Shell is fine)',
      'Permission to create resource groups',
    ],
    tasks: [
      {
        instruction:
          'Create a resource group, a Standard S1 Linux App Service plan and a web app running a built-in runtime.',
        hint: 'Slots are not available on Free or Basic.',
      },
      {
        instruction:
          'Create a staging slot and add an app setting COLOUR=green on it, marked as a slot setting.',
      },
      {
        instruction:
          'Route 20 percent of production traffic to staging, check the routing rule, then remove it.',
      },
      {
        instruction:
          'Swap staging into production with preview, inspect, and then complete the swap.',
        hint: 'Use --action preview, then --action swap.',
      },
      {
        instruction:
          'Create an App Configuration store (Free tier), add a feature flag Beta and a targeting filter with DefaultRolloutPercentage 10.',
      },
      { instruction: 'Swap again to roll back and confirm the slots exchanged.' },
    ],
    solution: [
      {
        title: 'Lab commands',
        language: 'bash',
        code: `RG=rg-strategies-lab
LOC=westeurope
APP=app-strat-$RANDOM
az group create -n $RG -l $LOC
az appservice plan create -g $RG -n asp-strat --sku S1 --is-linux
az webapp create -g $RG -p asp-strat -n $APP --runtime "NODE:20-lts"

az webapp deployment slot create -g $RG -n $APP --slot staging
az webapp config appsettings set -g $RG -n $APP --slot staging --slot-settings COLOUR=green

az webapp traffic-routing set -g $RG -n $APP --distribution staging=20
az webapp traffic-routing show -g $RG -n $APP
az webapp traffic-routing clear -g $RG -n $APP

az webapp deployment slot swap -g $RG -n $APP --slot staging --action preview
az webapp deployment slot swap -g $RG -n $APP --slot staging --action swap

az appconfig create -g $RG -n appcs-strat-$RANDOM -l $LOC --sku Free
STORE=$(az appconfig list -g $RG --query "[0].name" -o tsv)
az appconfig feature set -n $STORE --feature Beta --yes
az appconfig feature enable -n $STORE --feature Beta --yes
az appconfig feature filter add -n $STORE --feature Beta --filter-name Microsoft.Targeting \\
  --filter-parameters Audience='{"Users":[],"Groups":[],"DefaultRolloutPercentage":10}' --yes

az webapp deployment slot swap -g $RG -n $APP --slot staging --target-slot production`,
      },
    ],
    verification: [
      {
        command: 'az webapp deployment slot list -g rg-strategies-lab -n <appName> -o table',
        what: 'Confirms the staging slot exists.',
        placeholders: ['<appName>'],
      },
      {
        command:
          'az webapp config appsettings list -g rg-strategies-lab -n <appName> --slot staging --query "[?name==\'COLOUR\']"',
        what: 'Confirms the sticky setting stayed on staging after the swaps.',
        expected: 'COLOUR green with slotSetting true.',
        placeholders: ['<appName>'],
      },
      {
        command: 'az appconfig feature filter list -n <storeName> --feature Beta',
        what: 'Confirms the targeting filter exists.',
        placeholders: ['<storeName>'],
      },
    ],
    cleanup: [
      {
        command: 'az group delete -n rg-strategies-lab --yes --no-wait',
        what: 'Deletes the web app, plan and App Configuration store.',
      },
    ],
  },
  relatedTopicIds: [
    'az4-environments-approvals',
    'az4-pipeline-templates',
    'az4-testing-strategy',
    'az4-app-insights-monitoring',
  ],
  docs: [
    {
      title: 'Set up staging environments in App Service',
      url: 'https://learn.microsoft.com/azure/app-service/deploy-staging-slots',
    },
    {
      title: 'Deployment jobs and strategies',
      url: 'https://learn.microsoft.com/azure/devops/pipelines/process/deployment-jobs',
    },
    {
      title: 'Canary deployment strategy for Kubernetes',
      url: 'https://learn.microsoft.com/azure/devops/pipelines/ecosystems/kubernetes/canary-demo',
    },
    {
      title: 'Feature management in Azure App Configuration',
      url: 'https://learn.microsoft.com/azure/azure-app-configuration/concept-feature-management',
    },
    {
      title: 'Traffic splitting in Azure Container Apps',
      url: 'https://learn.microsoft.com/azure/container-apps/traffic-splitting',
    },
  ],
}
