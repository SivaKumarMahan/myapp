import type { Topic } from '../../../types'

export const deploymentTools: Topic = {
  id: 'az9-deployment-tools',
  title: 'Tools for managing and deploying Azure resources',
  domainId: 'az9-management',
  difficulty: 'intermediate',
  estimatedMinutes: 22,
  order: 3,
  tags: [
    'portal',
    'cloud shell',
    'azure cli',
    'azure powershell',
    'azure arc',
    'arm',
    'bicep',
    'iac',
  ],
  oneLiner:
    'The portal, Cloud Shell, Azure CLI and PowerShell for hands-on work; ARM templates and Bicep for repeatable infrastructure; Azure Arc for everything outside Azure.',
  explanation: [
    'Every Azure management tool talks to the same control plane: **Azure Resource Manager (ARM)**. ARM authenticates requests with Microsoft Entra ID, checks Azure RBAC and Azure Policy, and then creates, updates or deletes resources. Because all tools share this layer, anything you do in one tool is visible in the others.',
    'The **Azure portal** is the web-based graphical interface - ideal for exploring, learning and one-off tasks. **Azure Cloud Shell** is a browser-based shell, opened from the portal, with Bash or PowerShell and the Azure CLI, Azure PowerShell and common tools pre-installed and already authenticated. The **Azure CLI** (`az` commands) and **Azure PowerShell** (the Az module, `Verb-AzNoun` cmdlets) are command-line tools you can also install locally on Windows, macOS or Linux and use in scripts.',
    '**Infrastructure as code (IaC)** means describing resources in files and letting ARM deploy them. **ARM templates** are JSON files; **Bicep** is a simpler domain-specific language that compiles to ARM JSON and is Microsoft recommended IaC language for Azure. Both are **declarative**: you describe the end state, and ARM works out what to create or change. Deployments are **idempotent** - running the same template again produces the same result.',
    '**Azure Arc** extends Azure management beyond Azure. It lets you project servers, Kubernetes clusters and data services running on premises or in other clouds into Azure Resource Manager, so you can apply tags, Azure Policy, RBAC, Microsoft Defender for Cloud and Azure Monitor to them as if they were native Azure resources.',
  ],
  whyItMatters: [
    'AZ-900 asks you to choose the right tool for a scenario: a GUI for a beginner, a script for automation, a template for repeatable deployments, Arc for hybrid management.',
    'Knowing that all tools use Resource Manager explains why a policy or lock applies whether you click, script or deploy a template - and why there is no way around them.',
    'Infrastructure as code is how professional teams run Azure. It turns deployments into reviewable, repeatable changes and it is the foundation of AZ-104 and AZ-400.',
  ],
  howItWorks: [
    'A request from the portal, CLI, PowerShell, SDK or REST API arrives at Resource Manager, which routes it to the **resource provider** for that type, such as Microsoft.Compute or Microsoft.Storage.',
    'Cloud Shell runs in a temporary container per session. Your files persist in a `clouddrive` backed by an Azure Files share if you attach storage; without storage you get an ephemeral session. It times out after a period of inactivity.',
    'The Azure CLI uses a noun-verb pattern such as `az vm create` or `az group list`. Azure PowerShell uses verb-noun cmdlets such as `New-AzVM` or `Get-AzResourceGroup`. They cover the same services; the choice is mostly preference and existing skills.',
    'A Bicep file declares resources, parameters, variables and outputs. `az deployment group create` sends it to ARM, which compiles it to JSON, resolves dependencies between resources, and deploys in parallel where it can. **What-if** (`az deployment group what-if`) previews the change before applying it.',
    'ARM deployments are tracked. Each one appears in the resource group deployment history, so you can see what was deployed, when, and with which parameters.',
    'Azure Arc installs an agent (the Connected Machine agent for servers) or deploys cluster extensions (for Kubernetes). The machine then appears as an Azure resource of type Microsoft.HybridCompute/machines in a resource group of your choice.',
  ],
  diagrams: [
    {
      kind: 'flow',
      title: 'Every tool goes through Resource Manager',
      caption:
        'Portal, CLI, PowerShell and templates are just different doors into the same control plane.',
      nodes: [
        {
          label: 'Portal, CLI, PowerShell, Bicep',
          detail: 'Or SDKs and the REST API',
          tone: 'accent',
        },
        { label: 'Microsoft Entra ID', detail: 'Authenticates the caller', arrowLabel: 'token' },
        {
          label: 'Azure Resource Manager',
          detail: 'Checks RBAC, Policy and locks',
          tone: 'warning',
        },
        {
          label: 'Resource provider',
          detail: 'Microsoft.Compute, Microsoft.Storage ...',
        },
        {
          label: 'Resource created or updated',
          tone: 'success',
          branch: { label: 'Arc-enabled resource', detail: 'On premises or other cloud' },
        },
      ],
    },
    {
      kind: 'decision',
      title: 'Which management tool fits the job?',
      caption:
        'Graphical for exploring, command line for scripting, templates for repeatability, Arc for anything outside Azure.',
      question: 'What are you trying to do?',
      branches: [
        {
          condition: 'explore or do a one-off task visually',
          result: 'Azure portal',
          detail: 'Web GUI, dashboards',
        },
        {
          condition: 'run commands with nothing installed',
          result: 'Cloud Shell',
          detail: 'Bash or PowerShell in the browser',
          tone: 'accent',
        },
        {
          condition: 'automate with scripts',
          result: 'Azure CLI or Azure PowerShell',
          detail: 'Same capabilities, different syntax',
        },
        {
          condition: 'deploy the same environment repeatedly',
          result: 'Bicep or ARM templates',
          detail: 'Declarative infrastructure as code',
          tone: 'success',
        },
        {
          condition: 'manage servers outside Azure',
          result: 'Azure Arc',
          detail: 'Project them into Resource Manager',
        },
      ],
    },
  ],
  keyObjects: [
    {
      kind: 'Deployment (Microsoft.Resources/deployments)',
      apiVersion: '2024-03-01',
      purpose:
        'A recorded template deployment at a resource group, subscription, management group or tenant scope.',
      fields: [
        {
          path: 'properties.template',
          meaning: 'The ARM JSON (compiled from Bicep).',
          required: true,
        },
        { path: 'properties.parameters', meaning: 'Values passed to template parameters.' },
        { path: 'properties.mode', meaning: 'Incremental (default) or Complete.' },
        { path: 'properties.provisioningState', meaning: 'Succeeded, Failed, Running.' },
      ],
    },
    {
      kind: 'Arc-enabled server (Microsoft.HybridCompute/machines)',
      apiVersion: '2024-07-10',
      purpose: 'A non-Azure machine represented in Azure for governance and monitoring.',
      fields: [
        { path: 'properties.status', meaning: 'Connected, Disconnected or Expired.' },
        { path: 'properties.osName', meaning: 'Operating system reported by the agent.' },
        { path: 'tags', meaning: 'Tags work exactly as for Azure resources.' },
      ],
    },
    {
      kind: 'Management tools (concept)',
      purpose: 'Ways to interact with Azure.',
      fields: [
        { path: 'portal', meaning: 'Web GUI at portal.azure.com.' },
        {
          path: 'cloudShell',
          meaning: 'Browser shell with CLI and PowerShell pre-installed and authenticated.',
        },
        { path: 'azureCli', meaning: 'Cross-platform az command-line tool.' },
        { path: 'azurePowerShell', meaning: 'Az PowerShell module with Verb-AzNoun cmdlets.' },
        { path: 'bicep', meaning: 'Declarative IaC language that compiles to ARM JSON.' },
      ],
    },
  ],
  realWorldExample: {
    title: 'From click-ops to one command',
    story: [
      'A startup built its first Azure environment by clicking through the portal. When a large customer asked for a separate, isolated environment, the team spent three days recreating it by memory and still missed a firewall rule.',
      'They exported the resource group to a template, cleaned it up into Bicep with parameters for environment name and region, and stored it in Git. A new environment was now one `az deployment group create` away, and a what-if run before each change showed exactly what would happen.',
      'Operations still used the portal for dashboards and Cloud Shell for quick checks during incidents, and the Windows administrators kept writing Azure PowerShell. None of that conflicted, because every tool went through the same Resource Manager.',
      'When the startup acquired a company with servers in its own datacenter, it onboarded them with Azure Arc, and the same Azure Policy and tagging rules applied to them from day one.',
    ],
  },
  yamlExamples: [
    {
      title: 'A small Bicep file',
      language: 'bicep',
      explanation:
        'Parameters make it reusable across environments. The uniqueString function generates a stable, unique storage name per resource group.',
      code: `@allowed([ 'dev', 'test', 'prod' ])
param env string = 'dev'
param location string = resourceGroup().location

var saName = 'st\${env}\${uniqueString(resourceGroup().id)}'

resource sa 'Microsoft.Storage/storageAccounts@2023-05-01' = {
  name: saName
  location: location
  sku: { name: env == 'prod' ? 'Standard_ZRS' : 'Standard_LRS' }
  kind: 'StorageV2'
  tags: { Environment: env }
  properties: {
    minimumTlsVersion: 'TLS1_2'
    allowBlobPublicAccess: false
  }
}

output storageName string = sa.name`,
    },
    {
      title: 'The same storage account as ARM JSON',
      language: 'json',
      explanation:
        'What Bicep compiles to. Noticeably more verbose, which is why Bicep is recommended.',
      code: `{
  "$schema": "https://schema.management.azure.com/schemas/2019-04-01/deploymentTemplate.json#",
  "contentVersion": "1.0.0.0",
  "parameters": {
    "env": { "type": "string", "defaultValue": "dev", "allowedValues": [ "dev", "test", "prod" ] }
  },
  "resources": [
    {
      "type": "Microsoft.Storage/storageAccounts",
      "apiVersion": "2023-05-01",
      "name": "[format('st{0}{1}', parameters('env'), uniqueString(resourceGroup().id))]",
      "location": "[resourceGroup().location]",
      "sku": { "name": "Standard_LRS" },
      "kind": "StorageV2",
      "properties": { "minimumTlsVersion": "TLS1_2", "allowBlobPublicAccess": false }
    }
  ]
}`,
    },
    {
      title: 'The same task in Azure CLI and Azure PowerShell',
      language: 'powershell',
      explanation: 'Two syntaxes, one API. Pick whichever your team already knows.',
      code: `# Azure CLI (works in Bash or PowerShell)
az group create --name rg-az900-tools --location eastus

# Azure PowerShell
New-AzResourceGroup -Name rg-az900-tools -Location eastus
Get-AzResourceGroup -Name rg-az900-tools`,
    },
  ],
  imperative: [
    {
      command: 'az group create --name rg-az900-tools --location eastus',
      what: 'Azure CLI: creates a resource group.',
      expected: '"provisioningState": "Succeeded"',
    },
    {
      command: 'New-AzResourceGroup -Name rg-az900-tools -Location eastus',
      what: 'Azure PowerShell: the same operation.',
      expected: 'ProvisioningState : Succeeded',
    },
    {
      command:
        'az deployment group what-if -g rg-az900-tools --template-file main.bicep --parameters env=dev',
      what: 'Previews what a Bicep deployment would create, change or delete.',
      expected: 'Resource changes: 1 to create.',
    },
    {
      command:
        'az deployment group create -g rg-az900-tools --template-file main.bicep --parameters env=dev',
      what: 'Deploys the Bicep file.',
      expected: '"provisioningState": "Succeeded"',
    },
    {
      command: 'az bicep decompile --file exported.json',
      what: 'Converts an existing ARM JSON template into Bicep.',
    },
  ],
  declarative: {
    steps: [
      'Write `main.bicep` with a parameterised storage account.',
      'Run what-if to preview the deployment.',
      'Deploy it with `az deployment group create`.',
      'Run the same deployment again and confirm nothing changes - idempotence.',
    ],
    code: [
      {
        title: 'What-if, deploy, redeploy',
        language: 'bash',
        code: `az deployment group what-if -g rg-az900-tools --template-file main.bicep -p env=dev
az deployment group create  -g rg-az900-tools --template-file main.bicep -p env=dev
az deployment group what-if -g rg-az900-tools --template-file main.bicep -p env=dev
# second what-if: "Resource changes: 1 no change."`,
      },
    ],
  },
  verification: [
    {
      command: 'az deployment group list -g rg-az900-tools -o table',
      what: 'Shows the deployment history of the resource group.',
      expected: 'A row for main with state Succeeded.',
    },
    {
      command: 'az deployment group show -g rg-az900-tools -n main --query properties.outputs',
      what: 'Reads the outputs of a deployment.',
      expected: '{ "storageName": { "value": "stdev..." } }',
    },
    {
      command: 'Get-AzResource -ResourceGroupName rg-az900-tools | Format-Table Name, ResourceType',
      what: 'PowerShell: lists the resources the deployment created.',
    },
  ],
  troubleshooting: [
    {
      command: 'az bicep build --file main.bicep',
      what: 'Compiles locally and reports syntax errors and linter warnings before you deploy.',
    },
    {
      command:
        'az deployment operation group list -g rg-az900-tools -n main --query "[?properties.provisioningState==\'Failed\']"',
      what: 'When a deployment fails, lists the individual operations that failed with their error messages.',
    },
    {
      command: 'az account show --query "{name:name, id:id}"',
      what: 'Cloud Shell and CLI act on the default subscription - check it before blaming the template.',
      namespaceNote: 'Switch with az account set --subscription <name-or-id>.',
    },
  ],
  commonMistakes: [
    'Thinking Cloud Shell needs the CLI installed locally. It runs in the browser with tools pre-installed.',
    'Believing Azure CLI and Azure PowerShell have different capabilities. They cover the same services with different syntax.',
    'Calling ARM templates imperative. They are declarative: you describe the end state.',
    'Confusing Azure Arc with Azure Migrate. Arc manages resources where they are; Migrate moves them into Azure.',
    'Assuming Bicep deploys through a different engine. It compiles to ARM JSON and uses Resource Manager.',
  ],
  examTips: [
    'Azure Resource Manager is the deployment and management layer behind every tool.',
    'Cloud Shell: browser-based, Bash or PowerShell, authenticated automatically.',
    'Azure CLI and Azure PowerShell are both cross-platform and scriptable.',
    'ARM templates and Bicep are declarative infrastructure as code; Bicep is the simpler, recommended syntax.',
    'Azure Arc brings on-premises and multicloud resources under Azure management.',
  ],
  summary: [
    'All Azure tools use Azure Resource Manager, which enforces RBAC, Policy and locks.',
    'Use the portal to explore, Cloud Shell for quick commands, CLI or PowerShell for scripts.',
    'Bicep and ARM templates are declarative, idempotent infrastructure as code.',
    'What-if previews a deployment before you apply it.',
    'Azure Arc extends Azure management to servers and clusters outside Azure.',
  ],
  practice: [
    {
      id: 'az9-deployment-tools-p1',
      level: 'beginner',
      prompt:
        'A user on a locked-down laptop needs to run Azure CLI commands without installing anything. What should they use?',
      answer:
        'Azure Cloud Shell, which runs in the browser with the CLI pre-installed and authenticated.',
    },
    {
      id: 'az9-deployment-tools-p2',
      level: 'intermediate',
      prompt:
        'Why is deploying a Bicep file twice safe, while running a script of create commands twice may not be?',
      answer:
        'Bicep is declarative and idempotent: ARM compares the desired state with what exists and only makes needed changes. A script of imperative commands may try to create duplicates or fail.',
    },
    {
      id: 'az9-deployment-tools-p3',
      level: 'intermediate',
      prompt:
        'Which service lets you apply Azure Policy to Linux servers running in your own datacenter?',
      answer: 'Azure Arc, by onboarding the servers as Arc-enabled servers.',
    },
    {
      id: 'az9-deployment-tools-p4',
      level: 'advanced',
      prompt: 'How do you see what a Bicep deployment will change before running it?',
      answer:
        'Run `az deployment group what-if` (or `New-AzResourceGroupDeployment -WhatIf` in PowerShell) with the same template and parameters.',
    },
  ],
  lab: {
    title: 'One environment, four tools',
    scenario: 'Create and inspect the same resources using the portal, CLI, PowerShell and Bicep.',
    prerequisites: ['An Azure subscription', 'Cloud Shell'],
    tasks: [
      {
        instruction:
          'Open Cloud Shell in Bash and create resource group `rg-az900-tools` with the Azure CLI.',
      },
      {
        instruction:
          'Switch Cloud Shell to PowerShell and list the group with Get-AzResourceGroup.',
      },
      {
        instruction: 'Create `main.bicep` with the parameterised storage account from this lesson.',
        hint: 'Cloud Shell has an editor: run code main.bicep.',
      },
      { instruction: 'Run what-if, then deploy the file.' },
      { instruction: 'Run what-if again and confirm it reports no change.' },
      {
        instruction:
          'In the portal, open the resource group Deployments blade and find your deployment.',
      },
    ],
    solution: [
      {
        title: 'CLI and PowerShell',
        language: 'bash',
        code: `az group create -n rg-az900-tools -l eastus
# (PowerShell)  Get-AzResourceGroup -Name rg-az900-tools
az deployment group what-if -g rg-az900-tools --template-file main.bicep -p env=dev
az deployment group create -g rg-az900-tools --template-file main.bicep -p env=dev
az deployment group what-if -g rg-az900-tools --template-file main.bicep -p env=dev`,
      },
    ],
    verification: [
      {
        command:
          'az deployment group list -g rg-az900-tools --query "[].{name:name, state:properties.provisioningState}" -o table',
        what: 'Shows the successful deployment.',
        expected: 'main  Succeeded',
      },
    ],
    cleanup: [
      {
        command: 'az group delete -n rg-az900-tools --yes --no-wait',
        what: 'Deletes the group and the storage account.',
      },
    ],
  },
  relatedTopicIds: ['az9-governance-compliance', 'az9-monitoring-tools', 'az9-core-architecture'],
  docs: [
    {
      title: 'What is Azure Resource Manager?',
      url: 'https://learn.microsoft.com/azure/azure-resource-manager/management/overview',
    },
    {
      title: 'What is Bicep?',
      url: 'https://learn.microsoft.com/azure/azure-resource-manager/bicep/overview',
    },
    {
      title: 'Overview of Azure Cloud Shell',
      url: 'https://learn.microsoft.com/azure/cloud-shell/overview',
    },
    {
      title: 'Azure Arc overview',
      url: 'https://learn.microsoft.com/azure/azure-arc/overview',
    },
  ],
}
