import type { Topic } from '../../../types'

export const serviceTypes: Topic = {
  id: 'az9-service-types',
  title: 'IaaS, PaaS and SaaS - and where responsibility shifts',
  domainId: 'az9-cloud',
  difficulty: 'intermediate',
  estimatedMinutes: 20,
  order: 4,
  tags: ['iaas', 'paas', 'saas', 'serverless', 'shared responsibility', 'service types'],
  oneLiner:
    'The three cloud service types, which Azure services fall into each, and exactly which layers you still manage.',
  explanation: [
    'Cloud services come in three broad types, named after what the provider hands you. **Infrastructure as a service (IaaS)** gives you raw building blocks - virtual machines, disks, networks - and you manage everything from the operating system upward. **Platform as a service (PaaS)** gives you a managed environment to run your code or data, and Microsoft manages the operating system, runtime and patching. **Software as a service (SaaS)** gives you a finished application you simply use, such as Microsoft 365.',
    'A common analogy is getting to work. IaaS is leasing a car: you drive, fuel and maintain it. PaaS is a taxi: you choose the destination, someone else handles the car. SaaS is a bus: the route, the vehicle and the driver are all provided; you just ride.',
    'Each step from IaaS to PaaS to SaaS moves more of the **shared responsibility model** to Microsoft, and gives you less control in exchange for less work. IaaS gives maximum flexibility - install any software, any OS configuration. SaaS gives the least flexibility but is fastest to adopt.',
    '**Serverless** services such as Azure Functions are usually classed as PaaS on the exam. You write code, Azure runs it on demand, and you never see or manage a server. Billing is typically per execution rather than per hour of capacity.',
  ],
  whyItMatters: [
    'This objective is one of the most heavily tested in the cloud concepts domain. You will be given a service or a scenario and asked to classify it, or given a task and asked who is responsible under a given service type.',
    'In real design work, choosing the service type is often the biggest decision. Lifting a VM as-is (IaaS) is quick to migrate but leaves you patching forever; moving to App Service or Azure SQL Database (PaaS) removes that toil but may require code changes.',
    'Understanding the responsibility shift explains pricing too. PaaS often costs more per unit than a raw VM, but it includes the operations work you would otherwise pay staff to do.',
  ],
  howItWorks: [
    'With **IaaS**, Microsoft provides and secures physical hosts, network and datacenter, and virtualisation. You manage the guest OS, patches, middleware, runtime, applications, data, network controls such as NSGs, and identities. Azure examples: Virtual Machines, Virtual Machine Scale Sets, managed disks, Virtual Network.',
    'With **PaaS**, Microsoft also manages the operating system, runtime and middleware. You manage the application code, its configuration, data, and who can access it. Azure examples: App Service, Azure SQL Database, Azure Functions, Azure Container Apps, Azure Cosmos DB.',
    'With **SaaS**, Microsoft (or the software vendor) manages the application itself. You manage your data, user accounts and access, and the devices users sign in from. Examples: Microsoft 365, Dynamics 365, Outlook.com.',
    'The shared responsibility boundary moves up as you go: IaaS stops at the hypervisor, PaaS at the runtime, SaaS at the application. The customer always keeps information and data, devices, and accounts and identities.',
    'Typical IaaS scenarios are lift-and-shift migrations, test and development environments, and workloads that need full OS control. Typical PaaS scenarios are building new web apps and APIs, and data services without DBA overhead. SaaS suits commodity needs like email, CRM and collaboration.',
    'Some services blend types. Azure Kubernetes Service is often described as a managed container platform: Microsoft runs the control plane, while you are responsible for node upgrades being applied and for your workloads. On AZ-900, when in doubt, classify by what you still have to patch.',
  ],
  diagrams: [
    {
      kind: 'nested',
      title: 'What you manage under each service type',
      caption:
        'Read top to bottom: the further right you move from IaaS to SaaS, the fewer boxes stay with you.',
      root: {
        label: 'Customer-managed layers',
        children: [
          {
            label: 'IaaS - you manage the most',
            tone: 'warning',
            children: [
              { label: 'Data, identities, devices' },
              { label: 'Applications and runtime' },
              { label: 'Operating system and patches' },
              { label: 'Network controls (NSGs)' },
            ],
          },
          {
            label: 'PaaS - Microsoft runs the platform',
            tone: 'accent',
            children: [
              { label: 'Data, identities, devices' },
              { label: 'Application code and config' },
            ],
          },
          {
            label: 'SaaS - you just use it',
            tone: 'success',
            children: [{ label: 'Data, identities, devices' }],
          },
        ],
      },
    },
    {
      kind: 'decision',
      title: 'Which service type should this workload use?',
      caption: 'Choose the most managed option that still meets your control requirements.',
      question: 'What does the workload need?',
      branches: [
        {
          condition: 'full control of the OS or custom software',
          result: 'IaaS',
          detail: 'Virtual Machines, scale sets',
          tone: 'warning',
        },
        {
          condition: 'run my code without managing servers',
          result: 'PaaS',
          detail: 'App Service, Functions, Azure SQL Database',
          tone: 'accent',
        },
        {
          condition: 'a ready-made application',
          result: 'SaaS',
          detail: 'Microsoft 365, Dynamics 365',
          tone: 'success',
        },
      ],
    },
  ],
  keyObjects: [
    {
      kind: 'Virtual machine (Microsoft.Compute/virtualMachines)',
      apiVersion: '2024-07-01',
      purpose: 'The classic IaaS resource: you choose the image and size and manage the OS inside.',
      fields: [
        {
          path: 'properties.hardwareProfile.vmSize',
          meaning: 'CPU and memory size, e.g. Standard_B2s.',
          required: true,
        },
        {
          path: 'properties.storageProfile.imageReference',
          meaning: 'The OS image; patching it is your job.',
          required: true,
        },
        {
          path: 'properties.osProfile.adminUsername',
          meaning: 'Local admin account - an identity you own.',
        },
      ],
    },
    {
      kind: 'Web app (Microsoft.Web/sites)',
      apiVersion: '2023-12-01',
      purpose: 'A PaaS host for web apps and APIs. Microsoft patches the OS and runtime.',
      fields: [
        {
          path: 'properties.serverFarmId',
          meaning: 'The App Service plan that provides compute.',
          required: true,
        },
        {
          path: 'properties.siteConfig.linuxFxVersion',
          meaning: 'Runtime stack, e.g. NODE|20-lts or PYTHON|3.12.',
        },
        {
          path: 'properties.httpsOnly',
          meaning: 'Redirect HTTP to HTTPS - a configuration you own.',
        },
      ],
    },
    {
      kind: 'Service types (concept)',
      purpose: 'The three cloud service categories.',
      fields: [
        { path: 'iaas', meaning: 'Most control and most responsibility. VMs, disks, VNets.' },
        {
          path: 'paas',
          meaning:
            'Managed platform for your code and data. App Service, Azure SQL Database, Functions.',
        },
        { path: 'saas', meaning: 'Complete application, pay per user. Microsoft 365.' },
      ],
    },
  ],
  realWorldExample: {
    title: 'Three moves, three service types',
    story: [
      'A mid-sized insurer planned its cloud migration in three waves. Wave one was lift-and-shift: forty legacy Windows servers moved to Azure VMs with Azure Migrate. It was fast and needed no code changes, but the operations team still patched every VM - that is IaaS.',
      'Wave two re-platformed the customer quote website onto App Service and its database onto Azure SQL Database. The team deleted their patching runbooks for those servers, gained built-in autoscale and backups, and spent a few weeks fixing file-system assumptions in the code - that is PaaS.',
      'Wave three retired the on-premises Exchange servers entirely in favour of Exchange Online in Microsoft 365. Nobody on the team manages a mail server any more; they manage mailboxes, licences and Conditional Access - that is SaaS.',
      'The insurer ended up with all three types at once, which is normal. The lesson was to push each workload as far toward managed services as its requirements allowed.',
    ],
  },
  yamlExamples: [
    {
      title: 'PaaS in Bicep: an App Service plan and web app',
      language: 'bicep',
      explanation:
        'No OS image, no patch schedule, no admin password. You declare the runtime and your settings; Microsoft runs the servers.',
      code: `param location string = resourceGroup().location
param appName string

resource plan 'Microsoft.Web/serverfarms@2023-12-01' = {
  name: 'plan-\${appName}'
  location: location
  sku: { name: 'B1' }
  kind: 'linux'
  properties: { reserved: true }
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
    }
  }
}`,
      placeholders: ['appName'],
    },
    {
      title: 'IaaS versus PaaS from the CLI',
      language: 'bash',
      explanation:
        'The VM gives you a server to log into and maintain. The web app gives you an endpoint to deploy code to.',
      code: `# IaaS: you will SSH in, install a web server and patch it forever
az vm create -g rg-az900-types -n vm-web --image Ubuntu2204 \\
  --size Standard_B1s --generate-ssh-keys

# PaaS: Microsoft runs the server; you deploy code
az appservice plan create -g rg-az900-types -n plan-web --sku B1 --is-linux
az webapp create -g rg-az900-types -p plan-web -n <uniqueappname> --runtime "NODE:20-lts"`,
      placeholders: ['<uniqueappname>'],
    },
  ],
  imperative: [
    {
      command:
        'az vm create -g rg-az900-types -n vm-web --image Ubuntu2204 --size Standard_B1s --generate-ssh-keys',
      what: 'Creates an IaaS virtual machine. You now own its OS.',
      expected: 'JSON with publicIpAddress and powerState "VM running".',
    },
    {
      command:
        'az webapp create -g rg-az900-types -p plan-web -n <uniqueappname> --runtime "NODE:20-lts"',
      what: 'Creates a PaaS web app on an existing plan.',
      expected: 'JSON with defaultHostName <uniqueappname>.azurewebsites.net.',
      placeholders: ['<uniqueappname>'],
    },
    {
      command:
        'az functionapp create -g rg-az900-types -n <uniquefuncname> --storage-account <storname> --consumption-plan-location eastus --runtime python --functions-version 4 --os-type Linux',
      what: 'Creates a serverless (PaaS) function app billed per execution on the Consumption plan.',
      placeholders: ['<uniquefuncname>', '<storname>'],
    },
    {
      command:
        'New-AzWebApp -ResourceGroupName rg-az900-types -Name <uniqueappname> -AppServicePlan plan-web',
      what: 'PowerShell equivalent of creating a web app.',
      placeholders: ['<uniqueappname>'],
    },
  ],
  declarative: {
    steps: [
      'Write the App Service plan and web app in `main.bicep`.',
      'Create a resource group.',
      'Deploy with a unique app name.',
      'Browse to the default hostname to see the platform serving a page you never configured a server for.',
    ],
    code: [
      {
        title: 'Deploy the PaaS template',
        language: 'bash',
        code: `az group create -n rg-az900-types -l eastus
az deployment group create -g rg-az900-types \\
  --template-file main.bicep --parameters appName=<uniqueappname>`,
        placeholders: ['<uniqueappname>'],
      },
    ],
  },
  verification: [
    {
      command:
        'az webapp show -g rg-az900-types -n <uniqueappname> --query "{host:defaultHostName, state:state}"',
      what: 'Confirms the web app is running and shows its URL.',
      expected: '"state": "Running"',
      placeholders: ['<uniqueappname>'],
    },
    {
      command: 'az vm get-instance-view -g rg-az900-types -n vm-web --query "instanceView.osName"',
      what: 'For the VM you can see - and must manage - the guest operating system.',
      expected: '"ubuntu"',
    },
  ],
  troubleshooting: [
    {
      command: 'az webapp log tail -g rg-az900-types -n <uniqueappname>',
      what: 'With PaaS you cannot log into the server, so stream application logs instead.',
      placeholders: ['<uniqueappname>'],
    },
    {
      command: 'az webapp list-runtimes --os linux',
      what: 'If creation fails with an invalid runtime, list the runtime strings the platform supports.',
    },
    {
      command:
        'az vm run-command invoke -g rg-az900-types -n vm-web --command-id RunShellScript --scripts "sudo apt list --upgradable"',
      what: 'On IaaS you are the one checking for pending OS updates.',
    },
  ],
  commonMistakes: [
    'Classifying Azure Virtual Machines as PaaS because they run in the cloud. VMs are IaaS.',
    'Believing PaaS customers patch the operating system. Microsoft does that for PaaS services.',
    'Thinking SaaS customers have no responsibilities. Data, users, access and devices remain theirs.',
    'Assuming serverless means no servers exist. It means you do not manage them.',
    'Picking IaaS by default for new applications. If you do not need OS control, PaaS usually lowers operational effort.',
  ],
  examTips: [
    'IaaS = VMs, disks, VNets. PaaS = App Service, Azure SQL Database, Functions, Cosmos DB. SaaS = Microsoft 365, Dynamics 365.',
    'Most control, most responsibility: IaaS. Least control, least responsibility: SaaS.',
    'Lift-and-shift migration of existing servers is the classic IaaS scenario.',
    'Serverless (Azure Functions, Logic Apps) is treated as PaaS and billed per execution.',
    'For "who is responsible" questions, start from the always-customer and always-Microsoft layers, then place the middle layers by service type.',
  ],
  summary: [
    'IaaS gives you infrastructure and leaves the OS and everything above it to you.',
    'PaaS gives you a managed platform; Microsoft patches the OS and runtime.',
    'SaaS gives you a finished application; you manage data, users and devices.',
    'Responsibility shifts to Microsoft as you move from IaaS to PaaS to SaaS.',
    'Real estates mix all three; choose the most managed option that meets requirements.',
  ],
  practice: [
    {
      id: 'az9-service-types-p1',
      level: 'beginner',
      prompt:
        'Classify each as IaaS, PaaS or SaaS: Azure Virtual Machines, Azure App Service, Microsoft 365.',
      answer: 'Virtual Machines are IaaS, App Service is PaaS, and Microsoft 365 is SaaS.',
    },
    {
      id: 'az9-service-types-p2',
      level: 'intermediate',
      prompt:
        'An application runs on Azure SQL Database. Who installs database engine updates, and who controls which users can read the tables?',
      answer:
        'Microsoft installs engine updates because Azure SQL Database is PaaS. The customer controls user access and permissions on the data.',
    },
    {
      id: 'az9-service-types-p3',
      level: 'intermediate',
      prompt:
        'Why might a company migrate a legacy app to IaaS first, even though PaaS reduces maintenance?',
      answer:
        'IaaS allows lift-and-shift with no code changes, so migration is faster and lower risk. The app can be re-platformed to PaaS later.',
    },
    {
      id: 'az9-service-types-p4',
      level: 'advanced',
      prompt:
        'Is Azure Functions on the Consumption plan IaaS, PaaS or SaaS, and how is it billed?',
      answer:
        'It is serverless compute, classed as PaaS. It is billed per execution and resource consumption, with no charge while idle beyond storage.',
      explanation: 'A monthly free grant of executions also applies on the Consumption plan.',
    },
  ],
  lab: {
    title: 'Deploy the same website as IaaS and as PaaS',
    scenario:
      'Feel the difference in responsibility by standing up a web page on a VM and on App Service.',
    prerequisites: ['An Azure subscription', 'Cloud Shell (Bash)'],
    tasks: [
      { instruction: 'Create a resource group `rg-az900-types`.' },
      {
        instruction: 'Create an Ubuntu VM, open port 80 and install nginx with a run command.',
        hint: 'az vm open-port and az vm run-command invoke.',
      },
      { instruction: 'Browse to the VM public IP and confirm the nginx page loads.' },
      { instruction: 'Create a Linux App Service plan (B1) and a web app with a Node runtime.' },
      { instruction: 'Browse to the web app default hostname and confirm it responds.' },
      {
        instruction:
          'List three tasks you would own for the VM that you do not own for the web app.',
        hint: 'Think OS patches, web server updates, disk management.',
      },
    ],
    solution: [
      {
        title: 'Both deployments',
        language: 'bash',
        code: `az group create -n rg-az900-types -l eastus

# IaaS
az vm create -g rg-az900-types -n vm-web --image Ubuntu2204 --size Standard_B1s --generate-ssh-keys
az vm open-port -g rg-az900-types -n vm-web --port 80
az vm run-command invoke -g rg-az900-types -n vm-web --command-id RunShellScript \\
  --scripts "sudo apt-get update && sudo apt-get install -y nginx"

# PaaS
az appservice plan create -g rg-az900-types -n plan-web --sku B1 --is-linux
az webapp create -g rg-az900-types -p plan-web -n <uniqueappname> --runtime "NODE:20-lts"

# Owned only for the VM: OS patching, nginx upgrades, disk and NSG management.`,
        placeholders: ['<uniqueappname>'],
      },
    ],
    verification: [
      {
        command:
          'curl -sI http://$(az vm show -d -g rg-az900-types -n vm-web --query publicIps -o tsv)',
        what: 'Checks nginx on the VM answers.',
        expected: 'HTTP/1.1 200 OK',
      },
      {
        command: 'curl -sI https://<uniqueappname>.azurewebsites.net',
        what: 'Checks the web app answers.',
        expected: 'HTTP/1.1 200 OK (or a default page status)',
        placeholders: ['<uniqueappname>'],
      },
    ],
    cleanup: [
      {
        command: 'az group delete -n rg-az900-types --yes --no-wait',
        what: 'Deletes the VM, the plan and the web app.',
      },
    ],
  },
  relatedTopicIds: ['az9-cloud-computing', 'az9-compute-services', 'az9-cloud-benefits'],
  docs: [
    {
      title: 'Describe cloud service types (Microsoft Learn)',
      url: 'https://learn.microsoft.com/training/modules/describe-cloud-service-types/',
    },
    {
      title: 'Choose an Azure compute service',
      url: 'https://learn.microsoft.com/azure/architecture/guide/technology-choices/compute-decision-tree',
    },
    {
      title: 'Shared responsibility in the cloud',
      url: 'https://learn.microsoft.com/azure/security/fundamentals/shared-responsibility',
    },
  ],
}
