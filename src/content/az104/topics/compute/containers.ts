import type { Topic } from '../../../types'

export const containers: Topic = {
  id: 'az1-containers',
  title: 'Containers: Container Registry, Container Instances and Container Apps',
  domainId: 'az1-compute',
  difficulty: 'intermediate',
  estimatedMinutes: 40,
  order: 4,
  tags: [
    'acr',
    'aci',
    'container apps',
    'acr tasks',
    'revisions',
    'ingress',
    'keda',
    'managed identity',
  ],
  oneLiner:
    'Store images in ACR, run a single container group quickly with ACI, and run scalable, revisioned apps with Container Apps.',
  explanation: [
    'A **container image** packages an application with everything it needs to run. Azure gives administrators three services around images that AZ-104 covers: **Azure Container Registry (ACR)** to store and build images privately, **Azure Container Instances (ACI)** to run a container with no servers or orchestrator to manage, and **Azure Container Apps** to run containerised apps that scale automatically, including to zero, with built-in HTTPS ingress and revisions.',
    '**ACR** is a private registry, compatible with Docker and OCI tooling. It comes in three SKUs - **Basic**, **Standard** and **Premium** - that differ in included storage, throughput and features. Premium adds geo-replication to other regions, private endpoints and advanced network rules, and other enterprise features. ACR Tasks can build images in the cloud so you do not need Docker locally.',
    '**ACI** runs a **container group**: one or more containers scheduled together on the same host, sharing a lifecycle, an IP address and optionally storage volumes. You pay per second for the CPU and memory you request. It is ideal for batch jobs, build agents, quick tests and simple sidecar patterns - but it has no autoscale, rolling updates or traffic splitting.',
    '**Container Apps** sits on top of Kubernetes and KEDA but hides them. You deploy apps into a **Container Apps environment** (a secure boundary with its own network and logging), and each change to the app template creates a new immutable **revision**. Scale rules - HTTP concurrency, CPU, memory, queue length and other KEDA scalers - adjust replicas between a minimum (which can be zero) and a maximum.',
  ],
  whyItMatters: [
    'The AZ-104 skills outline includes "create and manage an Azure container registry", "provision a container by using Azure Container Instances", "provision a container by using Azure Container Apps" and "manage sizing and scaling for containers". Expect questions on SKU choice, authentication to ACR, restart policies, and Container Apps scale and revisions.',
    'Choosing the right service matters for cost and effort: ACI for a job that runs for twenty minutes, Container Apps for a long-running API that must scale and roll out safely, AKS only when you need direct control of Kubernetes.',
    'Registry authentication is a common production failure. Knowing that the admin user is off by default and that a managed identity with the AcrPull role is the preferred way to pull saves hours of "unauthorized" errors.',
  ],
  howItWorks: [
    'Create a registry with `az acr create --sku Standard`. The login server is `<name>.azurecr.io`. Push with Docker after `az acr login`, or build in the cloud with `az acr build`, which uploads your source context, builds it with ACR Tasks and pushes the result. Multi-step and triggered tasks can rebuild on a Git commit, on a schedule, or when a base image updates.',
    'Authentication options for ACR: your own Entra identity via `az acr login`; a **managed identity** or service principal with an ACR role such as **AcrPull** or **AcrPush** (the recommended approach for services); **repository-scoped tokens** for narrowly scoped access; and the **admin user**, a single shared username and password that is disabled by default and not recommended for production.',
    'For ACI you specify the image, CPU cores and memory per container, the OS type, ports, optional public IP with a **DNS name label** (giving `<label>.<region>.azurecontainer.io`), environment variables (secure ones are hidden), and a **restart policy**: **Always** (default, for long-running services), **OnFailure** (retry until it succeeds) or **Never** (run once). ACI can also be deployed into a VNet subnet and can mount an Azure Files share as a volume.',
    'In Container Apps, the **ingress** setting controls how traffic reaches the app: disabled, **internal** (only inside the environment or its VNet) or **external** (public). You set the **target port** the container listens on, and Container Apps provides a TLS endpoint and a generated FQDN; custom domains and managed certificates are supported.',
    'Every change to the template (image, environment variables, scale rules) creates a new **revision**. In **single revision mode** the new revision replaces the old one once it is ready. In **multiple revision mode** several revisions stay active and you split traffic by percentage or by label, which enables blue-green and canary releases. Changes to secrets or ingress are application-scope and do not by themselves create a revision.',
    'Scaling is declarative: `minReplicas`, `maxReplicas` and a list of rules. With `minReplicas` of 0 the app scales to zero when idle and you pay nothing for compute; the first request after idle has a cold start. CPU and memory rules cannot scale to zero, because they need a running replica to measure.',
    'The environment is shared by all apps in it: they share a VNet (either managed or your own), a Log Analytics workspace for logs, and can call each other by name. Workload profiles let an environment offer Consumption and dedicated compute side by side.',
  ],
  diagrams: [
    {
      kind: 'decision',
      title: 'Which container service should you use?',
      caption:
        'Match the service to the lifecycle: one-off group, scalable app, or full Kubernetes control.',
      question: 'What does the workload need?',
      branches: [
        {
          condition: 'Run a container or small group once or briefly',
          result: 'Azure Container Instances',
          detail: 'Per-second billing, no autoscale',
        },
        {
          condition: 'Long-running app with autoscale and revisions',
          result: 'Azure Container Apps',
          detail: 'Scale to zero, ingress, traffic split',
          tone: 'success',
        },
        {
          condition: 'Direct Kubernetes API and cluster control',
          result: 'Azure Kubernetes Service',
          detail: 'You manage node pools and upgrades',
          tone: 'muted',
        },
      ],
    },
    {
      kind: 'flow',
      title: 'From source code to a running Container App',
      caption:
        'ACR Tasks builds the image, a managed identity pulls it, and each deployment becomes a new revision.',
      nodes: [
        { label: 'Source and Dockerfile', detail: 'In Git or a local folder', tone: 'accent' },
        {
          label: 'ACR Tasks builds and pushes',
          detail: 'myacr.azurecr.io/api:1.4',
          arrowLabel: 'az acr build',
        },
        {
          label: 'Container App pulls with managed identity',
          detail: 'Identity holds AcrPull on the registry',
          branch: {
            label: 'No AcrPull role',
            detail: 'Revision fails: unauthorized',
            tone: 'danger',
          },
        },
        { label: 'New revision created', detail: 'Immutable snapshot of the template' },
        {
          label: 'Traffic shifted to revision',
          detail: 'All at once or by percentage',
          tone: 'success',
        },
      ],
    },
  ],
  keyObjects: [
    {
      kind: 'Container registry (Microsoft.ContainerRegistry/registries)',
      apiVersion: '2023-07-01',
      purpose: 'A private OCI registry for images and artifacts.',
      fields: [
        { path: 'sku.name', meaning: 'Basic, Standard or Premium.', required: true },
        {
          path: 'properties.adminUserEnabled',
          meaning: 'Shared admin credentials; false by default and best left off.',
        },
        {
          path: 'properties.publicNetworkAccess',
          meaning: 'Enabled or Disabled; disable with private endpoints (Premium).',
        },
        {
          path: 'properties.networkRuleSet',
          meaning: 'IP rules restricting public access (Premium).',
        },
        {
          path: 'replications (child resource)',
          meaning: 'Geo-replicas in other regions (Premium).',
        },
      ],
    },
    {
      kind: 'Container group (Microsoft.ContainerInstance/containerGroups)',
      apiVersion: '2023-05-01',
      purpose: 'One or more containers that run together in ACI.',
      fields: [
        {
          path: 'properties.containers[].properties.resources.requests',
          meaning: 'cpu and memoryInGB per container.',
          required: true,
        },
        { path: 'properties.osType', meaning: 'Linux or Windows.', required: true },
        { path: 'properties.restartPolicy', meaning: 'Always (default), OnFailure or Never.' },
        { path: 'properties.ipAddress', meaning: 'Public or private IP, ports and dnsNameLabel.' },
        {
          path: 'properties.imageRegistryCredentials',
          meaning: 'How to authenticate to a private registry, including a managed identity.',
        },
        {
          path: 'properties.volumes',
          meaning: 'Azure Files share, emptyDir, secret or Git repo volumes.',
        },
      ],
    },
    {
      kind: 'Container app (Microsoft.App/containerApps)',
      apiVersion: '2024-03-01',
      purpose: 'A scalable, revisioned containerised application inside an environment.',
      fields: [
        {
          path: 'properties.environmentId',
          meaning: 'The Container Apps environment it runs in.',
          required: true,
        },
        {
          path: 'properties.configuration.ingress',
          meaning: 'external, targetPort, transport and traffic weights.',
        },
        { path: 'properties.configuration.activeRevisionsMode', meaning: 'Single or Multiple.' },
        {
          path: 'properties.configuration.registries[]',
          meaning: 'Registry server and the identity or secret used to pull.',
        },
        {
          path: 'properties.template.scale',
          meaning: 'minReplicas, maxReplicas and rules (http, cpu, memory, custom KEDA).',
        },
        {
          path: 'properties.template.containers[]',
          meaning: 'Image, CPU, memory, env, probes. Changes create a new revision.',
        },
      ],
    },
  ],
  realWorldExample: {
    title: 'The nightly import that ran on a VM for three years',
    story: [
      'A logistics company kept a Windows VM running 24 hours a day so that a 15-minute import script could run at 02:00. The VM needed patching, monitoring and backup, and cost as much as a small web tier.',
      'The team containerised the script, pushed it to ACR with `az acr build`, and ran it as an ACI container group with restart policy **OnFailure**, started by a Logic App on a schedule. The container authenticated to ACR and to the storage account with a user-assigned managed identity.',
      'Later, the customer-facing tracking API moved to Container Apps. Multiple revision mode let them send 10% of traffic to each new release before promoting it, and scale to zero overnight cut the non-production environments to almost nothing.',
    ],
  },
  yamlExamples: [
    {
      title:
        'A Container App with external ingress, managed identity pull and HTTP scaling (Bicep)',
      language: 'bicep',
      explanation:
        'The app scales from 0 to 10 replicas based on concurrent HTTP requests, and pulls from ACR with a user-assigned identity that holds AcrPull.',
      code: `param location string = resourceGroup().location
param environmentId string
param identityId string
param acrServer string = 'myacr.azurecr.io'

resource app 'Microsoft.App/containerApps@2024-03-01' = {
  name: 'ca-api'
  location: location
  identity: {
    type: 'UserAssigned'
    userAssignedIdentities: {
      '\${identityId}': {}
    }
  }
  properties: {
    environmentId: environmentId
    configuration: {
      activeRevisionsMode: 'Multiple'
      ingress: {
        external: true
        targetPort: 8080
      }
      registries: [
        {
          server: acrServer
          identity: identityId
        }
      ]
    }
    template: {
      containers: [
        {
          name: 'api'
          image: '\${acrServer}/api:1.4'
          resources: {
            cpu: json('0.5')
            memory: '1Gi'
          }
        }
      ]
      scale: {
        minReplicas: 0
        maxReplicas: 10
        rules: [
          {
            name: 'http-rule'
            http: {
              metadata: {
                concurrentRequests: '50'
              }
            }
          }
        ]
      }
    }
  }
}`,
    },
    {
      title: 'A run-once ACI job (YAML for az container create --file)',
      language: 'yaml',
      explanation:
        'ACI accepts a YAML definition. Restart policy Never runs the container once and leaves the group in a terminated state for log inspection.',
      code: `apiVersion: '2023-05-01'
location: westeurope
name: aci-import
properties:
  osType: Linux
  restartPolicy: Never
  containers:
    - name: import
      properties:
        image: myacr.azurecr.io/import:2.0
        resources:
          requests:
            cpu: 1
            memoryInGB: 1.5
        environmentVariables:
          - name: TARGET_CONTAINER
            value: imports
type: Microsoft.ContainerInstance/containerGroups`,
    },
  ],
  imperative: [
    {
      command: 'az acr create -g rg-cnt-lab -n <acrname> --sku Standard',
      what: 'Creates a Standard registry. The name must be globally unique, 5-50 alphanumeric characters.',
      expected: '"loginServer": "<acrname>.azurecr.io"',
      placeholders: ['<acrname>'],
    },
    {
      command: 'az acr build -r <acrname> -t web:v1 .',
      what: 'Builds the Dockerfile in the current folder with ACR Tasks and pushes web:v1 - no local Docker needed.',
      expected: 'Run ID: ca1 was successful',
      placeholders: ['<acrname>'],
    },
    {
      command:
        'az container create -g rg-cnt-lab -n aci-hello --image mcr.microsoft.com/azuredocs/aci-helloworld --os-type Linux --cpu 1 --memory 1.5 --ports 80 --ip-address Public --dns-name-label <uniquelabel> --restart-policy Always',
      what: 'Runs a public container group with a DNS name.',
      expected: 'fqdn <uniquelabel>.westeurope.azurecontainer.io',
      placeholders: ['<uniquelabel>'],
    },
    {
      command: 'az containerapp env create -g rg-cnt-lab -n cae-lab -l westeurope',
      what: 'Creates a Container Apps environment (with a Log Analytics workspace if none is given).',
    },
    {
      command:
        'az containerapp create -g rg-cnt-lab -n ca-web --environment cae-lab --image <acrname>.azurecr.io/web:v1 --registry-server <acrname>.azurecr.io --registry-identity system --ingress external --target-port 80 --min-replicas 0 --max-replicas 5',
      what: 'Creates a Container App that pulls with its system-assigned identity and scales 0 to 5.',
      placeholders: ['<acrname>'],
    },
    {
      command:
        'az containerapp ingress traffic set -g rg-cnt-lab -n ca-web --revision-weight ca-web--v1=90 ca-web--v2=10',
      what: 'Splits traffic 90/10 between two revisions (multiple revision mode required).',
    },
  ],
  declarative: {
    steps: [
      'Declare the registry and a user-assigned managed identity.',
      'Assign the AcrPull role to the identity at registry scope.',
      'Declare a Log Analytics workspace and a Container Apps environment.',
      'Declare the Container App with ingress, registry identity, scale rules and revision mode.',
      'Deploy; update the image tag to create a new revision.',
    ],
    code: [
      {
        title: 'Registry, identity and AcrPull role assignment',
        language: 'bicep',
        code: `param location string = resourceGroup().location

resource acr 'Microsoft.ContainerRegistry/registries@2023-07-01' = {
  name: 'acr\${uniqueString(resourceGroup().id)}'
  location: location
  sku: {
    name: 'Standard'
  }
  properties: {
    adminUserEnabled: false
  }
}

resource uami 'Microsoft.ManagedIdentity/userAssignedIdentities@2023-01-31' = {
  name: 'id-ca-pull'
  location: location
}

// AcrPull built-in role definition id
var acrPullRoleId = subscriptionResourceId('Microsoft.Authorization/roleDefinitions', '7f951dda-4ed3-4680-a7ca-43fe172d538d')

resource pull 'Microsoft.Authorization/roleAssignments@2022-04-01' = {
  name: guid(acr.id, uami.id, acrPullRoleId)
  scope: acr
  properties: {
    roleDefinitionId: acrPullRoleId
    principalId: uami.properties.principalId
    principalType: 'ServicePrincipal'
  }
}`,
        explanation:
          'guid() gives a deterministic role assignment name so redeployment is idempotent. The identity then pulls without any password.',
      },
    ],
  },
  verification: [
    {
      command: 'az acr repository show-tags -n <acrname> --repository web -o table',
      what: 'Lists image tags in a repository.',
      expected: 'v1',
      placeholders: ['<acrname>'],
    },
    {
      command:
        'az container show -g rg-cnt-lab -n aci-hello --query "{state:instanceView.state, fqdn:ipAddress.fqdn}"',
      what: 'Shows the container group state and public FQDN.',
      expected: '{ "state": "Running", "fqdn": "..." }',
    },
    {
      command:
        'az containerapp revision list -g rg-cnt-lab -n ca-web --query "[].{name:name, active:properties.active, weight:properties.trafficWeight, replicas:properties.replicas}" -o table',
      what: 'Lists revisions, whether each is active, its traffic weight and replica count.',
    },
  ],
  troubleshooting: [
    {
      command: 'az container logs -g rg-cnt-lab -n aci-hello',
      what: 'Reads stdout/stderr from the ACI container - the first check for a crash loop.',
    },
    {
      command:
        'az container show -g rg-cnt-lab -n aci-hello --query "containers[0].instanceView.events"',
      what: 'Shows pull and start events, which reveal image pull failures and restarts.',
    },
    {
      command: 'az containerapp logs show -g rg-cnt-lab -n ca-web --type system --follow',
      what: 'Streams system logs (image pulls, probe failures, scaling) for a Container App.',
    },
    {
      command: 'az acr check-health -n <acrname> --yes',
      what: 'Checks DNS, connectivity and authentication to the registry from where you are.',
      placeholders: ['<acrname>'],
    },
  ],
  commonMistakes: [
    'Enabling the ACR admin user to "make pulls work". Use a managed identity with AcrPull instead; the admin user is one shared credential.',
    'Choosing Basic or Standard ACR and then needing geo-replication or private endpoints - those require Premium.',
    'Using ACI restart policy Always for a batch job, which restarts it forever after it finishes. Use OnFailure or Never.',
    'Setting a Container App minimum of 0 with only a CPU scale rule. CPU and memory rules cannot wake an app from zero; use an HTTP or event-based rule.',
    'Expecting an ingress or secret change alone to create a new revision. Only revision-scope (template) changes create one.',
    'Forgetting the target port. If ingress targets a port the container does not listen on, the revision is unhealthy.',
  ],
  examTips: [
    'ACR SKUs: Basic, Standard, Premium. Premium is the answer for geo-replication, private link and stricter network rules.',
    'To pull from ACR without passwords, assign the AcrPull role to a managed identity. AcrPush allows push and pull.',
    'ACI restart policies: Always (default), OnFailure, Never. A DNS name label gives `<label>.<region>.azurecontainer.io`.',
    'Container Apps: scale rules (HTTP, TCP, CPU, memory, KEDA custom), minReplicas can be 0, revisions in single or multiple mode, and traffic splitting by weight or label.',
    '`az acr build` builds in Azure and pushes; `az acr import` copies an image from another registry without pulling it locally.',
    'Resource sizing: ACI sets CPU and memory per container; Container Apps sets CPU and memory per container in allowed combinations.',
  ],
  summary: [
    'ACR stores and builds images; Premium adds geo-replication and private networking.',
    'Authenticate to ACR with Entra identities and AcrPull/AcrPush roles, not the admin user.',
    'ACI runs container groups with per-second billing and restart policies, but no autoscale.',
    'Container Apps adds ingress, revisions, traffic splitting and KEDA-based scaling including to zero.',
    'Pick the service by lifecycle: brief job, scalable app, or full Kubernetes.',
  ],
  practice: [
    {
      id: 'az1-containers-p1',
      level: 'beginner',
      prompt:
        'An ACI container runs a data export that should run once and never restart, even on failure. Which restart policy do you set?',
      answer:
        'Never. Always would restart it after it exits, and OnFailure would retry it after a non-zero exit code.',
    },
    {
      id: 'az1-containers-p2',
      level: 'intermediate',
      prompt:
        'A Container App must pull from a private ACR with no stored passwords. Describe the configuration.',
      answer:
        'Give the Container App a system- or user-assigned managed identity, assign that identity the AcrPull role on the registry, and configure the registry in the app with that identity instead of a username and password secret.',
    },
    {
      id: 'az1-containers-p3',
      level: 'intermediate',
      prompt:
        'You must send 20% of production traffic to a new version of a Container App before full rollout. What settings are required?',
      answer:
        'Set activeRevisionsMode to Multiple, deploy the new image to create a new revision, then set traffic weights such as 80 to the old revision and 20 to the new.',
      explanation:
        'In single revision mode the new revision would replace the old one automatically.',
    },
    {
      id: 'az1-containers-p4',
      level: 'advanced',
      prompt:
        'Your registry must replicate to a second region and be reachable only through a private endpoint. Which SKU do you need, and what else must you change?',
      answer:
        'Premium. Add a replication in the second region, create a private endpoint (with the privatelink.azurecr.io private DNS zone), and set public network access to Disabled.',
    },
  ],
  lab: {
    title: 'Build an image in ACR and run it in ACI and Container Apps',
    scenario:
      'Create a registry, build an image in the cloud, run it once in ACI, then run it as a scalable Container App that pulls with a managed identity.',
    prerequisites: [
      'An Azure subscription',
      'Azure Cloud Shell (Bash) with the containerapp extension (installed on first use)',
    ],
    tasks: [
      { instruction: 'Create rg-cnt-lab and a Standard ACR with a globally unique name.' },
      {
        instruction:
          'Create a folder with a Dockerfile containing FROM nginx:alpine and build it with az acr build as web:v1.',
      },
      {
        instruction:
          'Run the public hello-world image in ACI with a DNS name label and browse to it.',
      },
      {
        instruction:
          'Create a Container Apps environment and a Container App from web:v1 using the system-assigned identity to pull.',
      },
      {
        instruction:
          'Set min replicas to 0 and max to 3 and confirm the app scales down when idle.',
        hint: 'Check replica count on the revision after a few idle minutes.',
      },
    ],
    solution: [
      {
        title: 'Azure CLI',
        language: 'bash',
        code: `RG=rg-cnt-lab
ACR=acr$RANDOM$RANDOM
az group create -n $RG -l westeurope
az acr create -g $RG -n $ACR --sku Standard

mkdir web && cd web && echo "FROM nginx:alpine" > Dockerfile
az acr build -r $ACR -t web:v1 .

az container create -g $RG -n aci-hello --image mcr.microsoft.com/azuredocs/aci-helloworld \\
  --os-type Linux --cpu 1 --memory 1.5 --ports 80 --ip-address Public \\
  --dns-name-label hello$RANDOM --restart-policy Always

az containerapp env create -g $RG -n cae-lab -l westeurope
az containerapp create -g $RG -n ca-web --environment cae-lab \\
  --image $ACR.azurecr.io/web:v1 --registry-server $ACR.azurecr.io \\
  --registry-identity system --ingress external --target-port 80 \\
  --min-replicas 0 --max-replicas 3`,
      },
    ],
    verification: [
      {
        command:
          'az containerapp show -g rg-cnt-lab -n ca-web --query properties.configuration.ingress.fqdn -o tsv',
        what: 'Returns the HTTPS FQDN; browsing to it shows the nginx welcome page.',
      },
      {
        command: 'az container show -g rg-cnt-lab -n aci-hello --query instanceView.state -o tsv',
        what: 'Confirms the ACI group is running.',
        expected: 'Running',
      },
    ],
    cleanup: [
      {
        command: 'az group delete -n rg-cnt-lab --yes --no-wait',
        what: 'Deletes the registry, container group, environment and app.',
      },
    ],
  },
  relatedTopicIds: ['az1-app-service', 'az1-rbac', 'az1-private-endpoints', 'az1-azure-files'],
  docs: [
    {
      title: 'Azure Container Registry service tiers',
      url: 'https://learn.microsoft.com/azure/container-registry/container-registry-skus',
    },
    {
      title: 'Authenticate with an Azure container registry',
      url: 'https://learn.microsoft.com/azure/container-registry/container-registry-authentication',
    },
    {
      title: 'What is Azure Container Instances?',
      url: 'https://learn.microsoft.com/azure/container-instances/container-instances-overview',
    },
    {
      title: 'Scaling in Azure Container Apps',
      url: 'https://learn.microsoft.com/azure/container-apps/scale-app',
    },
    {
      title: 'Revisions in Azure Container Apps',
      url: 'https://learn.microsoft.com/azure/container-apps/revisions',
    },
  ],
}
