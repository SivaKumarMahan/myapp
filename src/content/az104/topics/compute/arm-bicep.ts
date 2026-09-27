import type { Topic } from '../../../types'

export const armBicep: Topic = {
  id: 'az1-arm-bicep',
  title: 'ARM templates and Bicep: read, modify and deploy',
  domainId: 'az1-compute',
  difficulty: 'intermediate',
  estimatedMinutes: 35,
  order: 1,
  tags: ['arm', 'bicep', 'iac', 'deployment modes', 'what-if', 'export', 'decompile'],
  oneLiner:
    'Describe Azure resources as code, preview the change with what-if, and deploy it the same way every time.',
  explanation: [
    'Every change you make in Azure - through the portal, the CLI, PowerShell or an SDK - ends up as a request to **Azure Resource Manager (ARM)**, the control plane that authenticates the caller, checks RBAC and Azure Policy, and hands the work to the right resource provider. An **ARM template** is a JSON file that describes the resources you want, and ARM makes reality match it.',
    '**Bicep** is a friendlier language for exactly the same thing. You write a `.bicep` file with a clean syntax - `param`, `var`, `resource`, `module`, `output` - and the Bicep tooling transpiles it to an ARM JSON template before sending it to ARM. There is no separate Bicep runtime: ARM only ever receives JSON. Microsoft recommends Bicep for new work, but the exam expects you to read both.',
    'Both are **declarative**. You state the end result ("a storage account called `stapp01` with Standard_LRS and TLS 1.2 minimum") rather than the steps. Deploy the same file twice and the second run changes nothing, because ARM compares the requested state with what exists and only sends the difference to the resource provider.',
    'A deployment always has a **scope**: a resource group (the most common), a subscription (for creating resource groups or assigning policy), a management group, or the tenant. For resource group deployments you also choose a **mode** - Incremental (the default: add or update what is in the template, leave everything else alone) or Complete (delete anything in the resource group that the template does not mention).',
  ],
  whyItMatters: [
    'AZ-104 lists "automate deployment of resources by using ARM templates or Bicep files" as a skill. Expect questions that show you a snippet and ask what it deploys, which property to change to meet a requirement, or which command previews the effect before anything changes.',
    'Templates are how teams stop configuring production by hand. A file in Git is reviewable, repeatable across dev, test and prod, and it documents the environment - the portal remembers nothing.',
    'Knowing the tooling around templates saves real time: exporting a template from an existing resource group, decompiling that JSON into Bicep, and running what-if before a risky change are everyday administrator tasks, not only developer tasks.',
  ],
  howItWorks: [
    "An ARM template has a fixed shape: `$schema`, `contentVersion`, then optional `parameters`, `variables`, `functions`, the required `resources` array, and optional `outputs`. Values are computed with template expressions in square brackets, such as `[parameters('location')]` or `[resourceGroup().location]`.",
    'In Bicep the same pieces are top-level keywords. A `param` is an input (with optional decorators like `@allowed`, `@minLength`, `@secure()`), a `var` is a computed value, a `resource` declares a resource with a symbolic name and a type string like `Microsoft.Storage/storageAccounts@2023-05-01`, and an `output` returns values after deployment.',
    'Dependencies are mostly implicit in Bicep: referencing `vnet.id` from a subnet or NIC tells Bicep to deploy the VNet first. In ARM JSON you often write `dependsOn` explicitly. ARM deploys independent resources in parallel and dependent ones in order.',
    'You deploy with `az deployment group create` (or `sub`, `mg`, `tenant` for other scopes), passing the template file and parameters. Parameters come from the command line, from a JSON parameters file, or from a `.bicepparam` file that points at its Bicep template with a `using` statement.',
    '`what-if` asks ARM to calculate the difference without changing anything. The output marks each resource as Create (+), Delete (-), Modify (~), NoChange (=), Ignore (*) or Deploy (!), and shows property-level changes. It is the template equivalent of a plan.',
    "Every deployment is recorded in the resource group's **Deployments** blade (the deployment history), which keeps the template, parameters and outcome. That history is useful for troubleshooting and for exporting what was last deployed. A resource group keeps a limited number of deployment records, and older ones are pruned automatically.",
    "`az group export` or the portal's **Export template** produces an ARM JSON template from existing resources. `az bicep decompile` converts that JSON into Bicep as a best-effort starting point - always clean it up, because exported templates hard-code names and include read-only properties.",
  ],
  diagrams: [
    {
      kind: 'flow',
      title: 'From a Bicep file to deployed resources',
      caption:
        'ARM only ever sees JSON. Bicep is transpiled locally, then ARM validates, checks policy and RBAC, and calls the resource providers.',
      nodes: [
        {
          label: 'main.bicep + main.bicepparam',
          detail: 'Written and reviewed in Git',
          tone: 'accent',
        },
        {
          label: 'Bicep CLI transpiles',
          detail: 'Produces an ARM JSON template',
          arrowLabel: 'az deployment ... create',
        },
        {
          label: 'ARM validates the request',
          detail: 'Syntax, RBAC, Azure Policy, quotas',
          branch: { label: 'Validation fails', detail: 'Nothing is deployed', tone: 'danger' },
        },
        { label: 'Resource providers act', detail: 'Parallel where no dependency exists' },
        {
          label: 'Deployment history recorded',
          detail: 'Template, parameters and outputs',
          tone: 'success',
        },
      ],
    },
    {
      kind: 'decision',
      title: 'Incremental or Complete deployment mode?',
      caption:
        'Incremental is the default and the safe choice. Complete deletes anything in the resource group the template does not declare.',
      question: 'What should happen to resources that are not in the template?',
      branches: [
        {
          condition: 'Leave them exactly as they are',
          result: 'Incremental (default)',
          detail: 'Adds and updates only what the template declares',
          tone: 'success',
        },
        {
          condition: 'Delete them so the group matches the file',
          result: 'Complete mode',
          detail: 'Run what-if first - deletions are real',
          tone: 'warning',
        },
        {
          condition: 'Manage lifecycle and deletion as a unit',
          result: 'Consider a deployment stack',
          detail: 'Tracks managed resources and can deny changes',
        },
      ],
    },
  ],
  keyObjects: [
    {
      kind: 'ARM template (JSON)',
      purpose:
        'The deployment document ARM understands. Every Bicep file becomes one of these before it is sent.',
      fields: [
        {
          path: '$schema',
          meaning:
            'Identifies the template scope - resource group, subscription, management group or tenant.',
          required: true,
        },
        {
          path: 'contentVersion',
          meaning: 'Your own version string, for example 1.0.0.0.',
          required: true,
        },
        {
          path: 'parameters',
          meaning: 'Inputs supplied at deployment time, with type, defaultValue, allowedValues.',
        },
        { path: 'variables', meaning: 'Values computed once and reused inside the template.' },
        {
          path: 'resources[]',
          meaning: 'Each resource with type, apiVersion, name, location, sku and properties.',
          required: true,
        },
        {
          path: 'outputs',
          meaning: 'Values returned after deployment, such as a resource id or hostname.',
        },
      ],
    },
    {
      kind: 'Bicep file (.bicep)',
      purpose: 'A concise, type-checked language that transpiles to an ARM template.',
      fields: [
        {
          path: 'targetScope',
          meaning:
            'Defaults to resourceGroup; set to subscription or managementGroup for other scopes.',
        },
        {
          path: 'param',
          meaning: 'Input with optional decorators such as @allowed, @minLength and @secure().',
        },
        {
          path: "resource <name> '<type>@<apiVersion>'",
          meaning:
            'Declares a resource; the symbolic name is used for references and implicit dependencies.',
        },
        {
          path: 'existing',
          meaning: 'References a resource that already exists without redeploying it.',
        },
        { path: 'module', meaning: 'Deploys another Bicep file, optionally at a different scope.' },
      ],
    },
    {
      kind: 'Deployment (Microsoft.Resources/deployments)',
      apiVersion: '2024-03-01',
      purpose: 'The record ARM keeps for each deployment operation at a scope.',
      fields: [
        {
          path: 'properties.mode',
          meaning: 'Incremental (default) or Complete, for resource group scope.',
        },
        {
          path: 'properties.parameters',
          meaning: 'The values actually used, visible in deployment history.',
        },
        { path: 'properties.provisioningState', meaning: 'Succeeded, Failed, Running and so on.' },
        { path: 'properties.outputs', meaning: 'Outputs returned by the template.' },
      ],
    },
  ],
  realWorldExample: {
    title: 'The resource group that lost its database',
    story: [
      'A team kept a web app, its App Service plan and a storage account in a Bicep file, but the SQL database had been created by hand in the same resource group months earlier. A new engineer, reading that "Complete mode keeps the group tidy", added `--mode Complete` to the pipeline.',
      'The next deployment removed the database, because it was not declared in the template. Point-in-time restore of the deleted database brought the data back, but the outage lasted most of an afternoon.',
      'The fix was procedural: every pipeline now runs `az deployment group what-if` and fails the job if the output contains any Delete operation that has not been approved. The hand-made database was imported into the Bicep file with an `existing` reference first, then declared properly.',
      'The lesson for the exam and for real life is the same: Incremental is the default for a reason, and what-if is cheap insurance before any change you are not certain about.',
    ],
  },
  yamlExamples: [
    {
      title: 'A storage account in Bicep with parameters and an output',
      language: 'bicep',
      explanation:
        'The @allowed decorator restricts the SKU, uniqueString gives a deterministic unique suffix, and the output returns the blob endpoint after deployment.',
      code: `@description('Azure region for all resources')
param location string = resourceGroup().location

@allowed([
  'Standard_LRS'
  'Standard_ZRS'
  'Standard_GRS'
])
param skuName string = 'Standard_LRS'

var storageName = 'st\${uniqueString(resourceGroup().id)}'

resource sa 'Microsoft.Storage/storageAccounts@2023-05-01' = {
  name: storageName
  location: location
  sku: {
    name: skuName
  }
  kind: 'StorageV2'
  properties: {
    minimumTlsVersion: 'TLS1_2'
    allowBlobPublicAccess: false
    supportsHttpsTrafficOnly: true
  }
}

output blobEndpoint string = sa.properties.primaryEndpoints.blob`,
    },
    {
      title: 'The same resource as ARM JSON',
      language: 'json',
      explanation:
        'Expressions live in square brackets. Compare the verbosity with the Bicep version - it is the same deployment.',
      code: `{
  "$schema": "https://schema.management.azure.com/schemas/2019-04-01/deploymentTemplate.json#",
  "contentVersion": "1.0.0.0",
  "parameters": {
    "location": {
      "type": "string",
      "defaultValue": "[resourceGroup().location]"
    },
    "skuName": {
      "type": "string",
      "defaultValue": "Standard_LRS",
      "allowedValues": ["Standard_LRS", "Standard_ZRS", "Standard_GRS"]
    }
  },
  "variables": {
    "storageName": "[concat('st', uniqueString(resourceGroup().id))]"
  },
  "resources": [
    {
      "type": "Microsoft.Storage/storageAccounts",
      "apiVersion": "2023-05-01",
      "name": "[variables('storageName')]",
      "location": "[parameters('location')]",
      "sku": { "name": "[parameters('skuName')]" },
      "kind": "StorageV2",
      "properties": {
        "minimumTlsVersion": "TLS1_2",
        "allowBlobPublicAccess": false,
        "supportsHttpsTrafficOnly": true
      }
    }
  ],
  "outputs": {
    "blobEndpoint": {
      "type": "string",
      "value": "[reference(variables('storageName')).primaryEndpoints.blob]"
    }
  }
}`,
    },
    {
      title: 'A .bicepparam file for the production environment',
      language: 'bicep',
      explanation:
        'The using line ties the parameter file to its template, so the Bicep tooling type-checks every value.',
      code: `using './main.bicep'

param location = 'westeurope'
param skuName = 'Standard_ZRS'`,
    },
  ],
  imperative: [
    {
      command: 'az group create --name rg-iac-lab --location westeurope',
      what: 'Creates the resource group that will be the deployment scope.',
      expected: '"provisioningState": "Succeeded"',
    },
    {
      command:
        'az deployment group what-if --resource-group rg-iac-lab --template-file main.bicep --parameters main.bicepparam',
      what: 'Previews every create, modify and delete without changing anything.',
      expected: 'Resource changes: 1 to create.',
    },
    {
      command:
        'az deployment group create --resource-group rg-iac-lab --template-file main.bicep --parameters skuName=Standard_ZRS',
      what: 'Deploys the Bicep file in Incremental mode, overriding one parameter inline.',
      expected: '"provisioningState": "Succeeded" and the outputs section.',
    },
    {
      command:
        'New-AzResourceGroupDeployment -ResourceGroupName rg-iac-lab -TemplateFile ./main.bicep -WhatIf',
      what: 'The Azure PowerShell equivalent of what-if. Drop -WhatIf to deploy; add -Mode Complete to change mode.',
      expected: 'A colour-coded list of resource changes.',
    },
    {
      command:
        'az group export --name rg-iac-lab > exported.json && az bicep decompile --file exported.json',
      what: 'Exports the resource group to an ARM template, then converts it to Bicep as a starting point.',
      expected: 'exported.bicep is written, possibly with warnings to review.',
    },
    {
      command: 'az bicep build --file main.bicep',
      what: 'Transpiles Bicep to main.json locally, which is useful to see exactly what ARM will receive.',
    },
  ],
  declarative: {
    steps: [
      'Create `main.bicep` declaring parameters, resources and outputs.',
      "Create `main.bicepparam` with `using './main.bicep'` and environment-specific values.",
      'Run `az bicep build` (or rely on the editor extension) to catch type errors early.',
      'Run `what-if` and read every Delete and Modify line.',
      'Deploy with `az deployment group create` and check the outputs and deployment history.',
    ],
    code: [
      {
        title: 'A module call and an existing resource',
        language: 'bicep',
        explanation:
          'The existing keyword references a VNet that another team owns without redeploying it; the module deploys a separate file and passes it the subnet id.',
        code: `param location string = resourceGroup().location

resource vnet 'Microsoft.Network/virtualNetworks@2023-11-01' existing = {
  name: 'vnet-hub'
}

module web './modules/webapp.bicep' = {
  name: 'webDeploy'
  params: {
    location: location
    subnetId: '\${vnet.id}/subnets/snet-web'
  }
}

output webHostName string = web.outputs.defaultHostName`,
      },
      {
        title: 'Subscription-scope deployment that creates a resource group',
        language: 'bicep',
        code: `targetScope = 'subscription'

param rgName string = 'rg-app-prod'
param location string = 'westeurope'

resource rg 'Microsoft.Resources/resourceGroups@2024-03-01' = {
  name: rgName
  location: location
  tags: {
    environment: 'prod'
  }
}`,
        explanation:
          'Deploy this with az deployment sub create --location westeurope --template-file rg.bicep, because a resource group cannot be created from inside a resource group deployment.',
      },
    ],
  },
  verification: [
    {
      command:
        'az deployment group list --resource-group rg-iac-lab --query "[].{name:name, state:properties.provisioningState, mode:properties.mode}" -o table',
      what: 'Shows the deployment history with state and mode.',
      expected: 'One row per deployment, state Succeeded, mode Incremental.',
    },
    {
      command:
        'az deployment group show --resource-group rg-iac-lab --name main --query properties.outputs',
      what: 'Reads the outputs of a named deployment. The name defaults to the template file name.',
      expected: 'The blobEndpoint output value.',
    },
    {
      command:
        'az deployment group what-if --resource-group rg-iac-lab --template-file main.bicep --result-format ResourceIdOnly',
      what: 'Re-runs what-if after a deployment; it should report no changes if nothing drifted.',
      expected: 'Resource changes: 1 no change.',
    },
  ],
  troubleshooting: [
    {
      command:
        'az deployment operation group list --resource-group rg-iac-lab --name main --query "[?properties.provisioningState==\'Failed\'].properties.statusMessage"',
      what: 'Lists only the failed operations inside a deployment, with the error message from the resource provider.',
      expected: 'An error code such as StorageAccountAlreadyTaken or RequestDisallowedByPolicy.',
    },
    {
      command:
        'az deployment group validate --resource-group rg-iac-lab --template-file main.bicep',
      what: 'Runs ARM preflight validation without deploying - catches bad parameter values and many policy denials.',
    },
    {
      command: 'az bicep lint --file main.bicep',
      what: 'Runs the Bicep linter for best-practice warnings such as hard-coded locations or unused parameters.',
    },
    {
      command: 'az bicep upgrade',
      what: 'Updates the Bicep CLI when a newer resource type or syntax is not recognised.',
      namespaceNote: 'Cloud Shell keeps Bicep current; local installs may lag behind.',
    },
  ],
  commonMistakes: [
    'Using Complete mode on a shared resource group. Anything the template does not mention is deleted - including resources other teams created.',
    'Assuming what-if is perfect. It can report noise for properties the provider normalises, and it cannot predict every runtime failure; still read it, but also validate.',
    'Deploying an exported template unchanged. Exports hard-code names and IDs and include read-only properties, so they often fail or overwrite settings when redeployed elsewhere.',
    "Trying to create a resource group from a resource group deployment. Resource groups are created at subscription scope with `targetScope = 'subscription'` and `az deployment sub create`.",
    'Putting secrets in parameter files or outputs. Use `@secure()` parameters and a Key Vault reference; outputs are stored in deployment history in plain text.',
    'Forgetting that the deployment name is reused. Deploying again with the same name overwrites that entry in the history; use unique names when you want an audit trail.',
  ],
  examTips: [
    'Incremental is the default mode. Complete deletes resources in the resource group that are not in the template. Complete mode is only supported for resource group deployments; subscription and higher scopes deploy incrementally.',
    'what-if is the answer to "preview the changes before deploying". `validate` checks the template is deployable but does not show a change list.',
    'Know the command family: `az deployment group|sub|mg|tenant create`, and the PowerShell `New-AzResourceGroupDeployment` / `New-AzSubscriptionDeployment` (alias `New-AzDeployment`).',
    'To reuse settings from an existing environment, export the template (resource group or single resource) from the portal or `az group export`, then `az bicep decompile` to Bicep.',
    "When shown a template and asked what to change, look for the property path: storage redundancy is `sku.name`, VM size is `properties.hardwareProfile.vmSize`, and a parameter's `allowedValues` restricts what can be passed in.",
    "Template expressions: `[resourceGroup().location]`, `[uniqueString(resourceGroup().id)]`, `[parameters('x')]`, `[variables('y')]`, `[reference(...)]`. Bicep uses plain property access and string interpolation instead.",
  ],
  summary: [
    'ARM is the control plane every tool talks to; ARM templates (JSON) and Bicep describe desired state declaratively.',
    'Bicep transpiles to ARM JSON and is the recommended authoring language.',
    'Deploy at resource group, subscription, management group or tenant scope with the matching `az deployment` subcommand.',
    'Incremental (default) leaves unlisted resources alone; Complete deletes them.',
    'Use what-if to preview, validate to preflight, export plus decompile to bootstrap Bicep from existing resources.',
  ],
  practice: [
    {
      id: 'az1-arm-bicep-p1',
      level: 'beginner',
      prompt:
        'A template deploys a storage account into a resource group that already contains a VM. You deploy it with default settings. What happens to the VM?',
      answer:
        'Nothing. The default Incremental mode only adds or updates resources declared in the template and leaves all other resources in the group untouched.',
      explanation:
        'Only Complete mode would delete the VM, because it is not declared in the template.',
    },
    {
      id: 'az1-arm-bicep-p2',
      level: 'intermediate',
      prompt:
        'Which command previews the changes a Bicep file would make to rg-prod, without deploying anything?',
      answer:
        '`az deployment group what-if --resource-group rg-prod --template-file main.bicep` (or `New-AzResourceGroupDeployment ... -WhatIf` in PowerShell).',
      explanation:
        'what-if returns Create, Modify, Delete, NoChange and Ignore markers per resource. validate only checks that the template is deployable.',
    },
    {
      id: 'az1-arm-bicep-p3',
      level: 'intermediate',
      prompt:
        'You must create three resource groups and a storage account in each from one Bicep deployment. What must the main file declare, and which command deploys it?',
      answer:
        "`targetScope = 'subscription'`, the resource groups as resources, and a module per group with `scope: rg` for the storage account. Deploy with `az deployment sub create --location <region> --template-file main.bicep`.",
      explanation:
        'Resource groups exist at subscription scope, so the main file must run there; modules can then target each resource group.',
    },
    {
      id: 'az1-arm-bicep-p4',
      level: 'advanced',
      prompt:
        'You exported a resource group as JSON and decompiled it to Bicep. Name two things you should clean up before reusing it for another environment.',
      answer:
        'Replace hard-coded names, locations and resource IDs with parameters or expressions, and remove read-only or default properties (such as provisioning state or generated IDs) that the export included.',
      explanation:
        'Decompilation is best-effort. The linter warnings are a good checklist for what to clean up.',
    },
  ],
  lab: {
    title: 'Deploy, preview and export with Bicep',
    scenario:
      'You will deploy a storage account from Bicep, change its configuration safely with what-if, and export the result back to Bicep.',
    prerequisites: [
      'An Azure subscription (a free account works)',
      'Azure Cloud Shell (Bash), which includes the Azure CLI and Bicep',
    ],
    tasks: [
      { instruction: 'Create a resource group rg-bicep-lab in a region near you.' },
      {
        instruction:
          'Write main.bicep that deploys a StorageV2 account with Standard_LRS, TLS 1.2 minimum and public blob access disabled, and outputs its blob endpoint.',
        hint: 'Use uniqueString(resourceGroup().id) for a globally unique name.',
      },
      { instruction: 'Run what-if, then deploy the file and note the output value.' },
      {
        instruction:
          'Change the SKU parameter to Standard_ZRS and run what-if again. Identify the Modify line for sku.name.',
        hint: 'Changing LRS to ZRS on an existing account may require a conversion; read what-if and any error carefully.',
      },
      {
        instruction:
          'Export the resource group to JSON and decompile it to Bicep. Compare it with your original file.',
      },
      {
        instruction:
          'Review the deployment history in the portal or with az deployment group list.',
      },
    ],
    solution: [
      {
        title: 'main.bicep',
        language: 'bicep',
        code: `param location string = resourceGroup().location
param skuName string = 'Standard_LRS'

resource sa 'Microsoft.Storage/storageAccounts@2023-05-01' = {
  name: 'st\${uniqueString(resourceGroup().id)}'
  location: location
  sku: {
    name: skuName
  }
  kind: 'StorageV2'
  properties: {
    minimumTlsVersion: 'TLS1_2'
    allowBlobPublicAccess: false
  }
}

output blobEndpoint string = sa.properties.primaryEndpoints.blob`,
      },
      {
        title: 'Commands',
        language: 'bash',
        code: `az group create -n rg-bicep-lab -l westeurope
az deployment group what-if -g rg-bicep-lab --template-file main.bicep
az deployment group create -g rg-bicep-lab --template-file main.bicep --query properties.outputs

az deployment group what-if -g rg-bicep-lab --template-file main.bicep --parameters skuName=Standard_ZRS

az group export -n rg-bicep-lab > exported.json
az bicep decompile --file exported.json
cat exported.bicep`,
      },
    ],
    verification: [
      {
        command:
          'az storage account list -g rg-bicep-lab --query "[].{name:name, sku:sku.name, tls:minimumTlsVersion}" -o table',
        what: 'Confirms the account exists with the declared settings.',
        expected: 'One account, Standard_LRS, TLS1_2.',
      },
      {
        command: 'az deployment group list -g rg-bicep-lab -o table',
        what: 'Shows the deployment history entry named main.',
        expected: 'main   Succeeded',
      },
    ],
    cleanup: [
      {
        command: 'az group delete -n rg-bicep-lab --yes --no-wait',
        what: 'Deletes the resource group and everything in it.',
      },
    ],
  },
  relatedTopicIds: [
    'az1-virtual-machines',
    'az1-app-service',
    'az1-azure-policy',
    'az1-subscriptions-governance',
  ],
  docs: [
    {
      title: 'What is Bicep?',
      url: 'https://learn.microsoft.com/azure/azure-resource-manager/bicep/overview',
    },
    {
      title: 'ARM template deployment modes',
      url: 'https://learn.microsoft.com/azure/azure-resource-manager/templates/deployment-modes',
    },
    {
      title: 'Bicep deployment what-if operation',
      url: 'https://learn.microsoft.com/azure/azure-resource-manager/bicep/deploy-what-if',
    },
    {
      title: 'Decompile ARM template JSON to Bicep',
      url: 'https://learn.microsoft.com/azure/azure-resource-manager/bicep/decompile',
    },
  ],
}
