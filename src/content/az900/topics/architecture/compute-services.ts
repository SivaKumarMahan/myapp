import type { Topic } from '../../../types'

export const computeServices: Topic = {
  id: 'az9-compute-services',
  title: 'Compute services: VMs, containers, Functions and App Service',
  domainId: 'az9-architecture',
  difficulty: 'intermediate',
  estimatedMinutes: 30,
  order: 2,
  tags: [
    'virtual machines',
    'scale sets',
    'availability sets',
    'azure virtual desktop',
    'containers',
    'aks',
    'functions',
    'app service',
  ],
  oneLiner:
    'The main ways to run code on Azure, from full virtual machines you manage yourself to serverless functions you never patch.',
  explanation: [
    'Azure offers a spectrum of compute. At one end are **virtual machines (VMs)**: infrastructure as a service, where you choose the operating system, install software and are responsible for patching. At the other end is **Azure Functions**: serverless code that runs only when an event happens and bills for execution rather than for idle servers.',
    'Between them sit **containers** and **Azure App Service**. Containers package an application and its dependencies so it runs the same everywhere. Azure runs them as **Azure Container Instances (ACI)** for simple single-container jobs, **Azure Container Apps** for serverless microservices that scale automatically, and **Azure Kubernetes Service (AKS)** when you need the full power of managed Kubernetes. App Service is a platform for web apps and APIs where Azure manages the servers and you deploy code or a container.',
    'For VMs, Azure adds features that improve availability and scale. **Virtual machine scale sets** create and manage a group of identical, load-balanced VMs that can grow or shrink automatically. **Availability sets** spread VMs across fault domains (separate power and network) and update domains (so planned maintenance never reboots them all at once).',
    '**Azure Virtual Desktop** delivers Windows desktops and apps from the cloud. Users connect from almost any device, and Windows 11 or Windows 10 Enterprise multi-session lets several users share one VM, which lowers cost.',
  ],
  whyItMatters: [
    'AZ-900 expects you to compare compute options and pick the right one for a scenario: "lift and shift a legacy server" points to a VM, "run code when a file arrives" points to Functions, "host a web app without managing servers" points to App Service.',
    'The choice also decides your share of the shared responsibility model. With a VM you patch the OS; with App Service or Functions Microsoft does. That trade-off between control and effort appears in many exam questions.',
    'In practice, choosing the lightest option that meets the need saves both money and operational work. Many teams overpay by running small web apps on always-on VMs.',
  ],
  howItWorks: [
    'A **VM** is created from an image (Windows Server, Ubuntu and so on) at a chosen size. It gets a managed OS disk, a network interface in a virtual network and optionally a public IP. You pay for compute while it runs; deallocating it stops compute charges but disk storage is still billed.',
    'An **availability set** places VMs across up to three fault domains and multiple update domains inside one datacenter. For protection against a whole datacenter failing, use **availability zones** instead.',
    'A **scale set** manages many VMs as one resource. Autoscale rules add instances when a metric such as CPU goes above a threshold and remove them when it falls, and scale sets can spread instances across zones.',
    '**Containers** share the host operating system kernel, so they start in seconds and are much lighter than VMs. ACI runs a container on demand with no cluster; Container Apps adds autoscaling (including scale to zero), revisions and ingress; AKS gives a managed Kubernetes control plane for complex orchestration.',
    '**Azure Functions** runs small pieces of code in response to **triggers** such as an HTTP request, a timer, a queue message or a new blob. On the consumption-style plans it scales out automatically and you pay only while code runs. Durable Functions add stateful workflows.',
    '**App Service** hosts web apps, REST APIs and back ends on Windows or Linux. You choose an App Service plan (which sets the compute size and features), and App Service provides built-in scaling, deployment slots, custom domains and TLS.',
  ],
  diagrams: [
    {
      kind: 'decision',
      title: 'Choosing an Azure compute service',
      caption:
        'Start from the least management you can accept. Move to VMs only when you need full OS control.',
      question: 'What does the workload need most?',
      branches: [
        {
          condition: 'Full control of the operating system',
          result: 'Virtual machine or scale set',
          detail: 'IaaS: you patch and configure the OS',
        },
        {
          condition: 'A web app or API without servers to manage',
          result: 'App Service',
          detail: 'PaaS with slots, scaling, TLS',
          tone: 'accent',
        },
        {
          condition: 'Short code that runs on an event',
          result: 'Azure Functions',
          detail: 'Serverless, pay per execution',
          tone: 'success',
        },
        {
          condition: 'Containerised microservices',
          result: 'Container Apps or AKS',
          detail: 'ACI for one-off containers',
        },
        {
          condition: 'Remote Windows desktops for staff',
          result: 'Azure Virtual Desktop',
          detail: 'Multi-session Windows in Azure',
        },
      ],
    },
    {
      kind: 'flow',
      title: 'How an event-driven function runs',
      caption:
        'No server waits for work. The platform starts instances when events arrive and bills for execution.',
      nodes: [
        { label: 'Event arrives', detail: 'Blob upload, queue message, HTTP call', tone: 'accent' },
        {
          label: 'Trigger fires',
          detail: 'Function binding detects the event',
          arrowLabel: 'watch',
        },
        {
          label: 'Platform allocates an instance',
          detail: 'Scales out automatically under load',
          arrowLabel: 'scale',
        },
        {
          label: 'Your code runs',
          detail: 'Reads input, writes output bindings',
          tone: 'success',
          branch: { label: 'Code throws an error', detail: 'Retry policy or poison queue' },
        },
        { label: 'Instance idles and is released', detail: 'No charge while idle on consumption' },
      ],
    },
  ],
  keyObjects: [
    {
      kind: 'Virtual machine (Microsoft.Compute/virtualMachines)',
      apiVersion: '2024-07-01',
      purpose: 'An IaaS server in Azure. You manage the OS and everything installed on it.',
      fields: [
        {
          path: 'properties.hardwareProfile.vmSize',
          meaning: 'Size such as Standard_B2s: vCPUs and memory.',
          required: true,
        },
        {
          path: 'properties.storageProfile.imageReference',
          meaning: 'The OS image the VM is built from.',
        },
        { path: 'properties.availabilitySet.id', meaning: 'Places the VM in an availability set.' },
        { path: 'zones', meaning: 'Pins the VM to an availability zone, e.g. ["1"].' },
      ],
    },
    {
      kind: 'Virtual machine scale set (Microsoft.Compute/virtualMachineScaleSets)',
      purpose:
        'A group of identical VMs that scale in or out together, manually or by autoscale rules.',
      fields: [
        { path: 'sku.capacity', meaning: 'Current number of instances.' },
        { path: 'properties.orchestrationMode', meaning: 'Flexible (recommended) or Uniform.' },
        { path: 'zones', meaning: 'Zones to spread instances across.' },
      ],
    },
    {
      kind: 'Container app (Microsoft.App/containerApps)',
      purpose: 'A serverless container with autoscaling, revisions and built-in ingress.',
      fields: [
        { path: 'properties.template.containers[].image', meaning: 'The container image to run.' },
        { path: 'properties.template.scale.minReplicas', meaning: 'Can be 0 to scale to zero.' },
        {
          path: 'properties.configuration.ingress.external',
          meaning: 'Whether it accepts internet traffic.',
        },
      ],
    },
    {
      kind: 'Web app and function app (Microsoft.Web/sites)',
      purpose:
        'App Service apps and Function apps share this resource type; kind distinguishes them. Both run on a plan (Microsoft.Web/serverfarms).',
      fields: [
        { path: 'kind', meaning: 'app, functionapp, or linux variants.' },
        { path: 'properties.serverFarmId', meaning: 'The App Service plan that supplies compute.' },
        { path: 'properties.httpsOnly', meaning: 'Redirects HTTP to HTTPS when true.' },
      ],
    },
  ],
  realWorldExample: {
    title: 'A photo site that stopped paying for idle servers',
    story: [
      'A small company ran a photo-sharing site on four always-on VMs: two for the web front end and two that resized uploaded images. The resize VMs sat idle most of the day but still cost money and needed monthly patching.',
      'They moved the front end to App Service, which gave them TLS, autoscale and deployment slots for zero-downtime releases. The resize job became an Azure Function with a blob trigger: every upload fires the function, which writes thumbnails to another container.',
      'The monthly bill dropped sharply, and nobody patches an operating system any more. The one legacy reporting tool that needed a specific Windows configuration stayed on a single VM, which is exactly where a VM makes sense.',
    ],
  },
  yamlExamples: [
    {
      title: 'An App Service plan and web app in Bicep',
      language: 'bicep',
      explanation:
        'The plan supplies compute; the site runs on it. Several apps can share one plan.',
      code: `param location string = resourceGroup().location
param appName string

resource plan 'Microsoft.Web/serverfarms@2023-12-01' = {
  name: '\${appName}-plan'
  location: location
  sku: {
    name: 'B1'
  }
  kind: 'linux'
  properties: {
    reserved: true
  }
}

resource site 'Microsoft.Web/sites@2023-12-01' = {
  name: appName
  location: location
  properties: {
    serverFarmId: plan.id
    httpsOnly: true
    siteConfig: {
      linuxFxVersion: 'NODE|20-lts'
    }
  }
}`,
      placeholders: ['appName'],
    },
    {
      title: 'A container instance in Bicep',
      language: 'bicep',
      code: `resource aci 'Microsoft.ContainerInstance/containerGroups@2023-05-01' = {
  name: 'aci-hello'
  location: resourceGroup().location
  properties: {
    osType: 'Linux'
    restartPolicy: 'Always'
    containers: [
      {
        name: 'hello'
        properties: {
          image: 'mcr.microsoft.com/azuredocs/aci-helloworld'
          ports: [{ port: 80 }]
          resources: { requests: { cpu: 1, memoryInGB: 1 } }
        }
      }
    ]
    ipAddress: {
      type: 'Public'
      ports: [{ port: 80, protocol: 'TCP' }]
    }
  }
}`,
    },
  ],
  imperative: [
    {
      command:
        'az vm create --resource-group rg-az900-compute --name vm-demo --image Ubuntu2204 --size Standard_B1s --admin-username azureuser --generate-ssh-keys',
      what: 'Creates a small Linux VM with SSH key authentication.',
      expected: 'JSON including publicIpAddress and powerState VM running.',
    },
    {
      command:
        'az vmss create --resource-group rg-az900-compute --name vmss-web --image Ubuntu2204 --instance-count 2 --zones 1 2 3 --admin-username azureuser --generate-ssh-keys',
      what: 'Creates a scale set of two VMs spread across three availability zones.',
    },
    {
      command:
        'az container create --resource-group rg-az900-compute --name aci-hello --image mcr.microsoft.com/azuredocs/aci-helloworld --os-type Linux --cpu 1 --memory 1 --ports 80 --ip-address Public --dns-name-label <unique-label>',
      what: 'Runs a single container instance with a public DNS name.',
      placeholders: ['<unique-label>'],
    },
    {
      command:
        'az webapp up --name <unique-app-name> --resource-group rg-az900-compute --runtime "NODE:20-lts" --sku B1',
      what: 'Creates a plan and web app and deploys the code in the current folder.',
      placeholders: ['<unique-app-name>'],
    },
    {
      command:
        'az functionapp create --resource-group rg-az900-compute --name <unique-func-name> --storage-account <storageaccount> --consumption-plan-location westeurope --runtime python --functions-version 4 --os-type Linux',
      what: 'Creates a function app on a consumption plan. Function apps need a storage account.',
      placeholders: ['<unique-func-name>', '<storageaccount>'],
    },
  ],
  declarative: {
    steps: [
      'Choose the lightest compute service that meets the requirement.',
      'Describe the plan or host and the app itself in a Bicep file.',
      'Deploy it to a resource group with az deployment group create.',
      'Check the app URL or public IP, then delete the group when finished.',
    ],
    code: [
      {
        title: 'Deploy the web app template',
        language: 'bash',
        code: `az group create --name rg-az900-compute --location westeurope
az deployment group create \\
  --resource-group rg-az900-compute \\
  --template-file webapp.bicep \\
  --parameters appName=<unique-app-name>`,
        placeholders: ['<unique-app-name>'],
      },
    ],
  },
  verification: [
    {
      command: 'az vm list --resource-group rg-az900-compute --show-details --output table',
      what: 'Lists VMs with their power state and IP addresses.',
      expected: 'PowerState VM running.',
    },
    {
      command:
        'az container show --resource-group rg-az900-compute --name aci-hello --query "{state:instanceView.state, fqdn:ipAddress.fqdn}"',
      what: 'Shows whether the container is running and its public DNS name.',
      expected: '"state": "Running"',
    },
    {
      command:
        'az webapp show --resource-group rg-az900-compute --name <unique-app-name> --query defaultHostName',
      what: 'Returns the azurewebsites.net host name of the app.',
      placeholders: ['<unique-app-name>'],
    },
  ],
  troubleshooting: [
    {
      command:
        'az vm get-instance-view --resource-group rg-az900-compute --name vm-demo --query instanceView.statuses',
      what: 'Distinguishes a stopped VM (still billed for compute) from a deallocated one.',
      expected: 'PowerState/deallocated when compute billing has stopped.',
    },
    {
      command: 'az container logs --resource-group rg-az900-compute --name aci-hello',
      what: 'Shows container output when an instance keeps restarting.',
    },
    {
      command: 'az webapp log tail --resource-group rg-az900-compute --name <unique-app-name>',
      what: 'Streams application logs from App Service while you reproduce an error.',
      placeholders: ['<unique-app-name>'],
    },
  ],
  commonMistakes: [
    'Thinking a VM shut down from inside the OS stops billing. Only deallocating (Stop in the portal or az vm deallocate) stops compute charges.',
    'Confusing availability sets with availability zones. Sets protect against rack and maintenance failures inside one datacenter; zones protect against a datacenter failure.',
    'Choosing AKS for a single simple container. ACI or Container Apps is far less work.',
    'Assuming serverless means there are no servers. Servers exist; you just do not manage or pay for them while idle.',
    'Believing App Service and Functions give you OS access to patch. They are PaaS; Microsoft patches the platform.',
  ],
  examTips: [
    'VM equals IaaS and maximum control. App Service and Functions equal PaaS or serverless and less management.',
    'Scale sets are for automatic, identical scaling of VMs. Availability sets are for resilience of a fixed group of VMs.',
    'Azure Virtual Desktop is the answer when the scenario mentions remote Windows desktops or multi-session Windows.',
    'Containers are lighter than VMs because they share the host kernel. ACI is the quickest way to run one container without orchestration.',
    'Functions scenarios usually mention an event or trigger and paying only when code runs.',
  ],
  summary: [
    'VMs give full control and full responsibility for the OS.',
    'Scale sets add autoscaling; availability sets add fault and update domain protection.',
    'Containers run on ACI, Container Apps or AKS depending on how much orchestration you need.',
    'Functions run event-driven code serverlessly; App Service hosts web apps and APIs as PaaS.',
    'Azure Virtual Desktop streams Windows desktops and apps from Azure.',
  ],
  practice: [
    {
      id: 'az9-compute-services-p1',
      level: 'beginner',
      prompt:
        'A team must run an old line-of-business app that needs a specific Windows registry setting and a custom driver. Which compute option fits?',
      answer:
        'A virtual machine, because only IaaS gives full control of the operating system configuration.',
    },
    {
      id: 'az9-compute-services-p2',
      level: 'intermediate',
      prompt:
        'You need code to run every time a message lands in a storage queue, and you want to pay nothing when the queue is empty. What should you use?',
      answer: 'Azure Functions on a consumption-style plan with a queue trigger.',
      explanation: 'Functions scale out with the queue length and bill only while code runs.',
    },
    {
      id: 'az9-compute-services-p3',
      level: 'intermediate',
      prompt:
        'What is the practical difference between an availability set and deploying VMs across availability zones?',
      answer:
        'An availability set spreads VMs across fault and update domains within one datacenter; availability zones place them in physically separate datacenters, so zones survive a whole-datacenter failure.',
    },
    {
      id: 'az9-compute-services-p4',
      level: 'advanced',
      prompt: 'Why might a company choose Container Apps over AKS for a set of microservices?',
      answer:
        'Container Apps is serverless: no cluster to upgrade or node pools to size, built-in autoscaling including scale to zero, and revisions for traffic splitting. AKS is chosen when you need direct Kubernetes API access and full control.',
    },
  ],
  lab: {
    title: 'Run a container and a web app without managing a server',
    scenario:
      'Deploy a public container with ACI, inspect it, then deploy a tiny App Service web app, and compare the experience with creating a VM.',
    prerequisites: ['An Azure subscription', 'Azure Cloud Shell (Bash)'],
    tasks: [
      { instruction: 'Create a resource group rg-az900-compute in a region near you.' },
      {
        instruction:
          'Create an ACI container from mcr.microsoft.com/azuredocs/aci-helloworld with a public IP and a unique DNS label.',
        hint: 'Include --os-type Linux, --cpu and --memory.',
      },
      { instruction: 'Show the container FQDN and open it in a browser.' },
      {
        instruction: 'Create an App Service plan (B1, Linux) and a web app running Node 20 LTS.',
      },
      { instruction: 'Confirm the web app default host name responds over HTTPS.' },
      { instruction: 'Note which of these resources would need OS patching by you: none of them.' },
    ],
    solution: [
      {
        title: 'Container Instances and App Service',
        language: 'bash',
        code: `az group create -n rg-az900-compute -l westeurope

az container create -g rg-az900-compute -n aci-hello \\
  --image mcr.microsoft.com/azuredocs/aci-helloworld \\
  --os-type Linux --cpu 1 --memory 1 \\
  --ports 80 --ip-address Public --dns-name-label <unique-label>

az container show -g rg-az900-compute -n aci-hello --query ipAddress.fqdn -o tsv

az appservice plan create -g rg-az900-compute -n plan-az900 --is-linux --sku B1
az webapp create -g rg-az900-compute -p plan-az900 -n <unique-app-name> --runtime "NODE:20-lts"
az webapp show -g rg-az900-compute -n <unique-app-name> --query defaultHostName -o tsv`,
        placeholders: ['<unique-label>', '<unique-app-name>'],
      },
    ],
    verification: [
      {
        command:
          'az container show -g rg-az900-compute -n aci-hello --query instanceView.state -o tsv',
        what: 'Confirms the container is running.',
        expected: 'Running',
      },
      {
        command: 'curl -sI https://<unique-app-name>.azurewebsites.net | head -n 1',
        what: 'Checks that the web app answers over HTTPS.',
        expected: 'HTTP/2 200 (or a 403/404 default page before code is deployed)',
        placeholders: ['<unique-app-name>'],
      },
    ],
    cleanup: [
      {
        command: 'az group delete -n rg-az900-compute --yes --no-wait',
        what: 'Deletes the container, plan and web app.',
      },
    ],
  },
  relatedTopicIds: ['az9-core-architecture', 'az9-networking-services', 'az9-storage-services'],
  docs: [
    {
      title: 'Virtual machines in Azure',
      url: 'https://learn.microsoft.com/azure/virtual-machines/overview',
    },
    {
      title: 'Choose an Azure compute service',
      url: 'https://learn.microsoft.com/azure/architecture/guide/technology-choices/compute-decision-tree',
    },
    {
      title: 'Azure Container Apps overview',
      url: 'https://learn.microsoft.com/azure/container-apps/overview',
    },
    {
      title: 'Azure Functions overview',
      url: 'https://learn.microsoft.com/azure/azure-functions/functions-overview',
    },
    {
      title: 'What is Azure Virtual Desktop?',
      url: 'https://learn.microsoft.com/azure/virtual-desktop/overview',
    },
  ],
}
