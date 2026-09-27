import type { Topic } from '../../../types'

export const appService: Topic = {
  id: 'az1-app-service',
  title: 'App Service: plans, scaling, domains, networking and deployment slots',
  domainId: 'az1-compute',
  difficulty: 'advanced',
  estimatedMinutes: 45,
  order: 5,
  tags: [
    'app service',
    'app service plan',
    'scale up',
    'scale out',
    'custom domain',
    'tls',
    'vnet integration',
    'access restrictions',
    'deployment slots',
    'backup',
  ],
  oneLiner:
    'Host web apps on a managed platform, choose and scale the plan, secure the network, and release through slots with zero downtime.',
  explanation: [
    '**Azure App Service** is platform as a service for web apps, APIs and background jobs. You bring code (.NET, Java, Node.js, Python, PHP) or a container; Microsoft patches the OS and runtime, runs the load balancers and provides TLS, scaling, deployment and diagnostics. You do not sign in to servers.',
    "Every app runs in an **App Service plan**, which is the set of VM instances you pay for. The plan's **pricing tier** (Free, Shared, Basic, Standard, Premium v3, Isolated v2) decides the features and the size of each instance; its **instance count** decides how many copies of every app in the plan run. Several apps can share one plan and its capacity.",
    'Two scaling directions follow from that: **scale up** means moving to a bigger or higher tier (more CPU, memory and features), and **scale out** means adding instances. Scale out can be manual, rule-based **autoscale** (Standard and above) or platform-managed **automatic scaling** based on HTTP traffic (Premium v2 and v3).',
    '**Deployment slots** (Standard and above) are live apps with their own hostnames - for example a `staging` slot - that run in the same plan. You deploy to staging, warm it up and test it, then **swap** it with production. The swap exchanges the content and most configuration, so the new version goes live without a cold start, and swapping back is the rollback.',
  ],
  whyItMatters: [
    'App Service is its own AZ-104 skill area: provision a plan, configure scaling, create an app, configure certificates and TLS, map custom DNS names, configure backup, configure networking, and configure deployment slots. The advanced questions usually hinge on which tier a feature requires.',
    'Most organisations run many internal and public web apps. Getting tier choice, network isolation and release process right is the difference between a cheap, safe platform and a costly one that breaks on every deployment.',
    'Slot settings and swap behaviour are a classic source of production incidents - a staging connection string swapped into production - so understanding what swaps and what sticks is directly useful.',
  ],
  howItWorks: [
    'Tiers in brief: **Free** and **Shared** run on shared infrastructure for dev and test, without custom TLS or scale out. **Basic** gives dedicated instances, custom domains and TLS and manual scale out. **Standard** adds autoscale, deployment slots and daily backups. **Premium v3** adds faster instances, more slots and instances, and automatic scaling. **Isolated v2** runs in an App Service Environment inside your VNet for full network isolation.',
    "A **custom domain** is added by proving ownership with a DNS record: a `CNAME` pointing to `<app>.azurewebsites.net` for a subdomain, or an `A` record to the app's IP for an apex domain, plus a `TXT` record `asuid.<subdomain>` containing the app's domain verification ID. Custom domains need Basic or higher (Shared supports them without TLS).",
    'For HTTPS on a custom domain you bind a certificate: a free **App Service managed certificate** (auto-renewed, Basic and above, not for wildcard domains), a certificate imported from **Key Vault**, or an uploaded PFX. Bindings are usually **SNI SSL**; **IP SSL** gives a dedicated inbound IP. You can enforce **HTTPS Only** and a minimum TLS version.',
    '**Backup** copies the app content and configuration (and optionally a linked database) so you can restore to the same or another app. Backups are available from Basic tier upward; Microsoft takes automatic backups periodically, and you can configure custom scheduled backups to a storage account you choose. Backups have a size limit, so exclude large files with a `_backup.filter` file.',
    'Networking has two directions. **Inbound**: **access restrictions** are priority-ordered allow/deny rules (by IP range, service tag, or VNet subnet via service endpoint) evaluated before your code, and **private endpoints** give the app a private IP in your VNet so it can be removed from the internet entirely. **Outbound**: **VNet integration** lets the app reach resources in or through a VNet, using a delegated subnet; it does not make the app reachable privately.',
    "A **swap** first applies the target slot's sticky settings to the source slot instances, restarts them and waits for warm-up (optionally at custom warm-up paths), then switches the routing rules. Settings marked as **deployment slot setting** (sticky) stay with the slot; everything else moves with the code. **Swap with preview** pauses after the first phase so you can validate, and **auto swap** swaps automatically after each deployment to the slot.",
    'Slots can also receive a percentage of production traffic (testing in production): set a routing rule such as 10% to staging, and users are pinned by a cookie. Slot count is capped per tier (Standard fewer, Premium more).',
  ],
  diagrams: [
    {
      kind: 'sequence',
      title: 'What happens during a slot swap',
      caption:
        'The staging instances are warmed with production settings before routing flips, which is why a swap causes no cold start.',
      participants: [
        { id: 'op', label: 'Operator' },
        { id: 'stg', label: 'Staging slot' },
        { id: 'fe', label: 'App Service front ends' },
        { id: 'prod', label: 'Production slot' },
      ],
      messages: [
        { from: 'op', to: 'stg', label: 'Swap staging to production' },
        { from: 'prod', to: 'stg', label: 'Apply sticky prod settings' },
        { from: 'stg', to: 'op', label: 'Restarted and warmed up', kind: 'return' },
        { from: 'op', to: 'fe', label: 'Switch routing rules' },
        { from: 'fe', to: 'prod', label: 'Old version now in staging', kind: 'return' },
      ],
    },
    {
      kind: 'decision',
      title: 'Which App Service tier is the minimum?',
      caption: 'Most App Service exam questions reduce to the lowest tier that provides a feature.',
      question: 'Which feature do you need?',
      branches: [
        {
          condition: 'Custom domain with TLS, manual scale out',
          result: 'Basic',
          detail: 'Also managed certificates, backup',
        },
        {
          condition: 'Deployment slots or rule-based autoscale',
          result: 'Standard',
          tone: 'accent',
        },
        {
          condition: 'More slots, bigger instances, automatic scaling',
          result: 'Premium v3',
          tone: 'success',
        },
        {
          condition: 'Single-tenant, fully inside your VNet',
          result: 'Isolated v2 (ASE v3)',
          tone: 'warning',
        },
      ],
    },
  ],
  keyObjects: [
    {
      kind: 'App Service plan (Microsoft.Web/serverfarms)',
      apiVersion: '2023-12-01',
      purpose: 'The compute (tier, size, instance count, OS) that apps run on.',
      fields: [
        {
          path: 'sku.name',
          meaning: 'Tier and size, for example B1, S1, P1v3, I1v2.',
          required: true,
        },
        { path: 'sku.capacity', meaning: 'Number of instances - scale out.' },
        {
          path: 'kind / properties.reserved',
          meaning: 'linux with reserved true for Linux plans.',
        },
        {
          path: 'properties.zoneRedundant',
          meaning: 'Spread instances across zones (Premium v3 and Isolated v2).',
        },
        { path: 'properties.elasticScaleEnabled', meaning: 'Automatic scaling on Premium plans.' },
      ],
    },
    {
      kind: 'Web app (Microsoft.Web/sites)',
      apiVersion: '2023-12-01',
      purpose: 'The app itself, and (as Microsoft.Web/sites/slots) each deployment slot.',
      fields: [
        { path: 'properties.serverFarmId', meaning: 'The plan the app runs in.', required: true },
        { path: 'properties.httpsOnly', meaning: 'Redirect HTTP to HTTPS.' },
        {
          path: 'properties.siteConfig.minTlsVersion',
          meaning: 'Minimum inbound TLS version, for example 1.2.',
        },
        {
          path: 'properties.siteConfig.ipSecurityRestrictions[]',
          meaning:
            'Access restriction rules with priority, action and ipAddress or vnetSubnetResourceId.',
        },
        {
          path: 'properties.virtualNetworkSubnetId',
          meaning: 'Delegated subnet for outbound VNet integration.',
        },
        {
          path: 'properties.publicNetworkAccess',
          meaning: 'Disabled when only private endpoints should reach the app.',
        },
      ],
    },
    {
      kind: 'Slot config names (Microsoft.Web/sites/config slotConfigNames)',
      purpose: 'Lists which app settings and connection strings are sticky to a slot.',
      fields: [
        {
          path: 'properties.appSettingNames[]',
          meaning: 'App setting names that do not move during a swap.',
        },
        {
          path: 'properties.connectionStringNames[]',
          meaning: 'Connection string names that do not move during a swap.',
        },
      ],
    },
  ],
  realWorldExample: {
    title: 'The swap that pointed production at the test database',
    story: [
      'A team deployed to a staging slot whose `SQL_CONNECTION` setting pointed at the test database. Production had its own value. After swapping, customers started seeing test orders - the setting had moved with the code, because nobody had marked it as a deployment slot setting.',
      'They swapped back within minutes (the old version was waiting in staging, still warm), then marked the connection string as sticky in both slots so it would stay with each environment.',
      'Afterwards they added swap with preview to the pipeline, a custom warm-up path that checks the database connection, and access restrictions so the staging hostname was reachable only from the company network and the build agents.',
    ],
  },
  yamlExamples: [
    {
      title: 'Plan, app, staging slot and a sticky setting (Bicep)',
      language: 'bicep',
      explanation:
        'A Standard S1 Linux plan with two instances, an HTTPS-only app with TLS 1.2, a staging slot, and a slot-sticky connection setting.',
      code: `param location string = resourceGroup().location
param appName string = 'app-\${uniqueString(resourceGroup().id)}'

resource plan 'Microsoft.Web/serverfarms@2023-12-01' = {
  name: 'asp-web'
  location: location
  kind: 'linux'
  sku: {
    name: 'S1'
    capacity: 2
  }
  properties: {
    reserved: true
  }
}

resource app 'Microsoft.Web/sites@2023-12-01' = {
  name: appName
  location: location
  properties: {
    serverFarmId: plan.id
    httpsOnly: true
    siteConfig: {
      linuxFxVersion: 'NODE|20-lts'
      minTlsVersion: '1.2'
      appSettings: [
        {
          name: 'ENVIRONMENT'
          value: 'production'
        }
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
      linuxFxVersion: 'NODE|20-lts'
      appSettings: [
        {
          name: 'ENVIRONMENT'
          value: 'staging'
        }
      ]
    }
  }
}

resource sticky 'Microsoft.Web/sites/config@2023-12-01' = {
  parent: app
  name: 'slotConfigNames'
  properties: {
    appSettingNames: [
      'ENVIRONMENT'
    ]
  }
}`,
    },
    {
      title: 'Access restrictions: allow a corporate range and Front Door only',
      language: 'bicep',
      explanation:
        'Rules are evaluated by priority, lowest first; once any allow rule exists, unmatched traffic is denied.',
      code: `resource web 'Microsoft.Web/sites/config@2023-12-01' = {
  name: '\${appName}/web'
  properties: {
    ipSecurityRestrictionsDefaultAction: 'Deny'
    ipSecurityRestrictions: [
      {
        name: 'corp'
        priority: 100
        action: 'Allow'
        ipAddress: '203.0.113.0/24'
      }
      {
        name: 'frontdoor'
        priority: 200
        action: 'Allow'
        tag: 'ServiceTag'
        ipAddress: 'AzureFrontDoor.Backend'
      }
    ]
  }
}`,
    },
  ],
  imperative: [
    {
      command:
        'az appservice plan create -g rg-app-lab -n asp-web --sku S1 --is-linux --number-of-workers 2',
      what: 'Creates a Standard Linux plan with two instances.',
    },
    {
      command: 'az webapp create -g rg-app-lab -p asp-web -n <appname> --runtime "NODE:20-lts"',
      what: 'Creates the web app in the plan with a Node.js runtime.',
      expected: '"defaultHostName": "<appname>.azurewebsites.net"',
      placeholders: ['<appname>'],
    },
    {
      command: 'az appservice plan update -g rg-app-lab -n asp-web --sku P1v3',
      what: 'Scales up to Premium v3. Use --number-of-workers to scale out.',
    },
    {
      command:
        'az webapp deployment slot create -g rg-app-lab -n <appname> --slot staging --configuration-source <appname>',
      what: 'Creates a staging slot, cloning configuration from production.',
      placeholders: ['<appname>'],
    },
    {
      command:
        'az webapp deployment slot swap -g rg-app-lab -n <appname> --slot staging --target-slot production',
      what: 'Swaps staging into production. Run it again to roll back.',
      placeholders: ['<appname>'],
    },
    {
      command:
        'az webapp config hostname add -g rg-app-lab --webapp-name <appname> --hostname www.contoso.com',
      what: 'Adds a custom domain after the CNAME and asuid TXT records exist.',
      placeholders: ['<appname>'],
    },
    {
      command:
        'az webapp vnet-integration add -g rg-app-lab -n <appname> --vnet vnet-app --subnet snet-integration',
      what: 'Enables outbound VNet integration using a subnet delegated to Microsoft.Web/serverFarms.',
      placeholders: ['<appname>'],
    },
    {
      command:
        'Switch-AzWebAppSlot -ResourceGroupName rg-app-lab -Name <appname> -SourceSlotName staging -DestinationSlotName production',
      what: 'PowerShell equivalent of a slot swap.',
      placeholders: ['<appname>'],
    },
  ],
  declarative: {
    steps: [
      'Declare the plan with the tier that provides the features you need.',
      'Declare the app with httpsOnly, minTlsVersion and app settings.',
      'Declare slots as Microsoft.Web/sites/slots and sticky settings with slotConfigNames.',
      'Add access restrictions, a private endpoint or VNet integration as required.',
      'Deploy code to the staging slot and swap from the pipeline.',
    ],
    code: [
      {
        title: 'Rule-based autoscale for an App Service plan (excerpt)',
        language: 'bicep',
        code: `resource asAutoscale 'Microsoft.Insights/autoscaleSettings@2022-10-01' = {
  name: 'as-asp-web'
  location: location
  properties: {
    enabled: true
    targetResourceUri: plan.id
    profiles: [
      {
        name: 'default'
        capacity: {
          minimum: '2'
          maximum: '6'
          default: '2'
        }
        rules: [
          {
            metricTrigger: {
              metricName: 'CpuPercentage'
              metricResourceUri: plan.id
              timeGrain: 'PT1M'
              statistic: 'Average'
              timeWindow: 'PT10M'
              timeAggregation: 'Average'
              operator: 'GreaterThan'
              threshold: 70
            }
            scaleAction: {
              direction: 'Increase'
              type: 'ChangeCount'
              value: '1'
              cooldown: 'PT5M'
            }
          }
        ]
      }
    ]
  }
}`,
        explanation:
          'Autoscale targets the plan, not the app, because instances belong to the plan. In practice add a matching scale-in rule.',
      },
    ],
  },
  verification: [
    {
      command:
        'az appservice plan show -g rg-app-lab -n asp-web --query "{tier:sku.tier, size:sku.name, workers:sku.capacity}"',
      what: 'Shows the tier, size and instance count.',
      expected: '{ "tier": "Standard", "size": "S1", "workers": 2 }',
    },
    {
      command:
        'az webapp deployment slot list -g rg-app-lab -n <appname> --query "[].{slot:name, host:defaultHostName, state:state}" -o table',
      what: 'Lists slots and their hostnames.',
      placeholders: ['<appname>'],
    },
    {
      command: 'az webapp config access-restriction show -g rg-app-lab -n <appname>',
      what: 'Shows the access restriction rules for the main site and the SCM (Kudu) site.',
      placeholders: ['<appname>'],
    },
  ],
  troubleshooting: [
    {
      command: 'az webapp log tail -g rg-app-lab -n <appname>',
      what: 'Streams application and web server logs (enable logging first with az webapp log config).',
      placeholders: ['<appname>'],
    },
    {
      command:
        'az webapp config appsettings list -g rg-app-lab -n <appname> --slot staging --query "[].{name:name, sticky:slotSetting}" -o table',
      what: 'Shows which settings are sticky in a slot - check before every swap.',
      placeholders: ['<appname>'],
    },
    {
      command:
        'az webapp show -g rg-app-lab -n <appname> --query "{outboundIps:outboundIpAddresses, possible:possibleOutboundIpAddresses}"',
      what: 'Lists outbound IPs to allow on a downstream firewall (when not using VNet integration with a NAT gateway).',
      placeholders: ['<appname>'],
    },
    {
      command: 'nslookup asuid.www.contoso.com',
      what: 'Confirms the domain verification TXT record is published before adding a custom hostname.',
    },
  ],
  commonMistakes: [
    'Buying Basic and expecting deployment slots or rule-based autoscale - both need Standard or higher.',
    'Forgetting to mark environment-specific settings as deployment slot settings, so they move to production on swap.',
    'Treating VNet integration as inbound privacy. It is outbound only; use a private endpoint (and disable public access) for private inbound.',
    'Autoscaling the app instead of the plan. Instances belong to the plan, and every app in the plan scales with it.',
    'Trying to use an App Service managed certificate for a wildcard domain or on the Free tier.',
    'Adding access restrictions to the main site but leaving the SCM (Kudu) site open; set rules for both or make SCM use the main rules.',
  ],
  examTips: [
    'Minimum tiers: custom domain with TLS and managed certificates - Basic; slots, autoscale - Standard; automatic scaling and more slots - Premium v3; network isolation in your VNet - Isolated v2 (App Service Environment).',
    'Scale up = change tier or size; scale out = change instance count. Both are properties of the plan.',
    'Custom domain verification: CNAME (or A record for apex) plus TXT record `asuid.<name>` containing the verification ID.',
    'Sticky settings stay with the slot; non-sticky settings and the code swap. Swap back to roll back.',
    'VNet integration = outbound into the VNet. Private endpoint = inbound private IP. Access restrictions = inbound allow/deny by IP, service tag or subnet.',
    'Backups need Basic or higher; restore can target the same app, another app or a slot.',
  ],
  summary: [
    'An app runs in a plan; the plan tier sets features and the instance count sets capacity.',
    'Scale up changes the tier or size; scale out adds instances manually, by rules or automatically.',
    'Custom domains are verified with DNS records and secured with managed, Key Vault or uploaded certificates.',
    'Access restrictions and private endpoints control inbound; VNet integration controls outbound.',
    'Deployment slots and swaps give zero-downtime releases and instant rollback; sticky settings stay put.',
  ],
  practice: [
    {
      id: 'az1-app-service-p1',
      level: 'beginner',
      prompt:
        'You need a staging environment you can swap into production. What is the minimum App Service plan tier?',
      answer: 'Standard. Deployment slots are not available on Free, Shared or Basic tiers.',
    },
    {
      id: 'az1-app-service-p2',
      level: 'intermediate',
      prompt:
        'After a swap, production uses the staging API key. How should you have configured the setting?',
      answer:
        'Mark the API key app setting as a deployment slot setting (sticky) in each slot, so it stays with the slot during swaps.',
    },
    {
      id: 'az1-app-service-p3',
      level: 'advanced',
      prompt:
        'A web app must call a SQL Managed Instance in a VNet and must not be reachable from the internet. Which two features do you configure?',
      answer:
        'VNet integration (outbound) so the app can reach the managed instance, and a private endpoint for inbound access with public network access disabled.',
      explanation:
        'Access restrictions alone still leave a public endpoint; VNet integration alone does not make inbound private.',
    },
    {
      id: 'az1-app-service-p4',
      level: 'intermediate',
      prompt:
        'You map www.contoso.com to an app. Which DNS records must exist before Azure accepts the hostname?',
      answer:
        "A CNAME from www to `<app>.azurewebsites.net` and a TXT record named `asuid.www` containing the app's custom domain verification ID.",
    },
  ],
  lab: {
    title: 'Release with a staging slot and roll back',
    scenario:
      'Create a Standard plan and app, add a staging slot with a sticky setting, deploy a change to staging, swap, and roll back.',
    prerequisites: ['An Azure subscription', 'Azure Cloud Shell (Bash)'],
    tasks: [
      {
        instruction:
          'Create rg-app-lab, a Standard S1 Linux plan and a Node.js web app with a unique name.',
      },
      {
        instruction:
          'Add app setting ENVIRONMENT=production to the app and mark it as a slot setting.',
      },
      {
        instruction:
          'Create a staging slot and set ENVIRONMENT=staging there, also as a slot setting.',
      },
      { instruction: 'Add an app setting RELEASE=v2 (not sticky) to the staging slot only.' },
      {
        instruction:
          'Swap staging into production and confirm RELEASE moved but ENVIRONMENT did not.',
      },
      { instruction: 'Swap again to roll back and confirm production no longer has RELEASE=v2.' },
    ],
    solution: [
      {
        title: 'Azure CLI',
        language: 'bash',
        code: `RG=rg-app-lab
APP=app$RANDOM$RANDOM
az group create -n $RG -l westeurope
az appservice plan create -g $RG -n asp-web --sku S1 --is-linux
az webapp create -g $RG -p asp-web -n $APP --runtime "NODE:20-lts"

az webapp config appsettings set -g $RG -n $APP --slot-settings ENVIRONMENT=production
az webapp deployment slot create -g $RG -n $APP --slot staging
az webapp config appsettings set -g $RG -n $APP --slot staging --slot-settings ENVIRONMENT=staging
az webapp config appsettings set -g $RG -n $APP --slot staging --settings RELEASE=v2

az webapp deployment slot swap -g $RG -n $APP --slot staging --target-slot production
az webapp config appsettings list -g $RG -n $APP -o table

# roll back
az webapp deployment slot swap -g $RG -n $APP --slot staging --target-slot production`,
      },
    ],
    verification: [
      {
        command:
          "az webapp config appsettings list -g rg-app-lab -n <appname> --query \"[?name=='ENVIRONMENT' || name=='RELEASE'].{n:name, v:value, sticky:slotSetting}\" -o table",
        what: 'After the first swap production shows ENVIRONMENT=production (sticky) and RELEASE=v2.',
        placeholders: ['<appname>'],
      },
      {
        command: 'az webapp deployment slot list -g rg-app-lab -n <appname> -o table',
        what: 'Confirms the staging slot exists.',
        placeholders: ['<appname>'],
      },
    ],
    cleanup: [
      {
        command: 'az group delete -n rg-app-lab --yes --no-wait',
        what: 'Deletes the plan, app and slot.',
      },
    ],
  },
  relatedTopicIds: [
    'az1-containers',
    'az1-arm-bicep',
    'az1-private-endpoints',
    'az1-dns-load-balancing',
    'az1-vm-scale-sets',
  ],
  docs: [
    {
      title: 'App Service overview',
      url: 'https://learn.microsoft.com/azure/app-service/overview',
    },
    {
      title: 'App Service plans',
      url: 'https://learn.microsoft.com/azure/app-service/overview-hosting-plans',
    },
    {
      title: 'Set up staging environments (deployment slots)',
      url: 'https://learn.microsoft.com/azure/app-service/deploy-staging-slots',
    },
    {
      title: 'Map an existing custom DNS name',
      url: 'https://learn.microsoft.com/azure/app-service/app-service-web-tutorial-custom-domain',
    },
    {
      title: 'App Service networking features',
      url: 'https://learn.microsoft.com/azure/app-service/networking-features',
    },
    {
      title: 'Back up and restore an app',
      url: 'https://learn.microsoft.com/azure/app-service/manage-backup',
    },
  ],
}
