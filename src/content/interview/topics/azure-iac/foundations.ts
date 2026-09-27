import type { InterviewQuestion } from '../../../types'

/** ARM, Bicep and Terraform fundamentals: tools, scopes, modes and what-if. */
export const azureIacFoundationQuestions: InterviewQuestion[] = [
  {
    id: 'itv-aziac-1',
    level: 'basic',
    kind: 'open',
    prompt:
      'ARM templates, Bicep or Terraform for Azure - how do they differ and how would you choose?',
    probing:
      'The opening IaC question. They want the state-file difference, day-zero support, and a choice justified by the organisation, not by fashion.',
    answer: [
      '**ARM templates** are JSON documents that Azure Resource Manager deploys natively. They are verbose and hard to write by hand, but everything else builds on them - the portal, the CLI, and Bicep all end up submitting ARM deployments.',
      '**Bicep** is a domain-specific language that compiles to ARM JSON. It is much more readable, has modules, loops, conditions, type checking and a good VS Code extension, and because it is ARM underneath it supports **every resource type and API version on day one**. There is **no state file**: Azure itself is the source of truth, and each deployment is compared with what exists.',
      '**Terraform** is HashiCorp’s multi-cloud tool, using the `azurerm` and `azapi` providers. It keeps a **state file** that records what it manages, which gives you a real plan and clean deletion of removed resources, and it can manage Entra ID, GitHub, Datadog and other clouds from the same workflow. The costs are managing state securely and occasional lag before a new Azure feature appears in `azurerm` - which `azapi` covers.',
      'My rule: an Azure-only organisation, especially one standardising on Microsoft tooling, is best served by **Bicep**, now with deployment stacks for lifecycle management. A multi-cloud organisation or one that already runs Terraform well should use **Terraform**. I would not mix both for the same resources, and I would never hand-write new ARM JSON.',
    ],
    diagrams: [
      {
        kind: 'decision',
        title: 'Choosing an IaC tool for Azure',
        caption: 'The organisation’s estate and skills decide it more than language features do.',
        question: 'What does the organisation look like?',
        branches: [
          {
            condition: 'Azure only, Microsoft-first tooling',
            result: 'Bicep',
            detail: 'No state, day-zero API support',
            tone: 'success',
          },
          {
            condition: 'Multi-cloud or many SaaS providers',
            result: 'Terraform',
            detail: 'One workflow, state to manage',
            tone: 'success',
          },
          {
            condition: 'Terraform, but a brand-new Azure API',
            result: 'Terraform with azapi',
            detail: 'Any ARM type and API version',
            tone: 'accent',
          },
          {
            condition: 'Writing new ARM JSON by hand',
            result: 'Do not',
            detail: 'Author Bicep; it compiles to ARM',
            tone: 'danger',
          },
        ],
      },
    ],
    code: [
      {
        title: 'The same storage account in Bicep and Terraform',
        language: 'bicep',
        code: `param location string = resourceGroup().location

resource sa 'Microsoft.Storage/storageAccounts@2023-05-01' = {
  name: 'st\${uniqueString(resourceGroup().id)}'
  location: location
  sku: { name: 'Standard_ZRS' }
  kind: 'StorageV2'
  properties: {
    minimumTlsVersion: 'TLS1_2'
    allowBlobPublicAccess: false
  }
}`,
      },
      {
        title: 'Terraform equivalent',
        language: 'hcl',
        code: `resource "azurerm_storage_account" "sa" {
  name                     = "st\${random_string.suffix.result}"
  resource_group_name      = azurerm_resource_group.app.name
  location                 = azurerm_resource_group.app.location
  account_tier             = "Standard"
  account_replication_type = "ZRS"
  min_tls_version          = "TLS1_2"
  allow_nested_items_to_be_public = false
}`,
      },
    ],
    traps: [
      'Saying Bicep has a state file, or that Terraform does not need one.',
      'Claiming Terraform is "always behind" Azure - azapi exists precisely to close that gap.',
      'Managing the same resources with both tools, so each keeps reverting the other.',
    ],
    followUps: [
      'Without a state file, how does Bicep know what to delete?',
      'What is azapi for?',
      'How would you migrate from ARM JSON to Bicep?',
    ],
    tags: ['bicep', 'arm', 'terraform', 'fundamentals'],
  },
  {
    id: 'itv-aziac-2',
    level: 'basic',
    kind: 'mcq',
    prompt: 'What happens when you run az deployment group create with a .bicep file?',
    options: [
      { id: 'a', text: 'The CLI uploads the Bicep file and Azure interprets it directly' },
      {
        id: 'b',
        text: 'The Bicep file is compiled to ARM JSON locally and submitted to Resource Manager as a deployment',
      },
      { id: 'c', text: 'Bicep writes a local state file and applies only the difference' },
      { id: 'd', text: 'The file is converted to Terraform and run by the Azure provider' },
    ],
    correct: ['b'],
    probing: 'Whether the candidate knows Bicep is a compile-to-ARM language with no state.',
    answer: [
      'The CLI (or PowerShell) runs the **Bicep compiler** locally, which transpiles the file into an **ARM JSON template**, and submits that to Azure Resource Manager as a normal deployment. ARM then does the work: it resolves dependencies, creates or updates resources in parallel where possible, and records a **deployment** object you can inspect afterwards.',
      'There is no Bicep state file. Each deployment is declarative against the real resources - resources in the template are created or updated to match, and anything not in the template is left alone (in incremental mode) or handled by a deployment stack.',
    ],
    code: [
      {
        title: 'See what the compiler produces, then deploy',
        language: 'bash',
        code: `az bicep build --file main.bicep --outfile main.json   # inspect the ARM JSON
az bicep lint --file main.bicep

az deployment group create -g <rg> -n app-$(date +%Y%m%d%H%M) \\
  --template-file main.bicep --parameters main.bicepparam

# Every deployment leaves a record
az deployment group list -g <rg> --query "[].{name:name, state:properties.provisioningState}" -o table`,
        placeholders: ['<rg>'],
      },
    ],
    traps: [
      'Committing the compiled JSON and the Bicep file together, then editing one and not the other.',
    ],
    followUps: ['How many deployments does a resource group keep in history?'],
    tags: ['bicep', 'arm', 'deployments'],
  },
  {
    id: 'itv-aziac-3',
    level: 'basic',
    kind: 'mcq',
    prompt:
      'Your Bicep file must create a resource group and then deploy a storage account into it. What do you need?',
    options: [
      { id: 'a', text: 'A resource-group-scope deployment with the resource group declared first' },
      {
        id: 'b',
        text: 'targetScope = subscription for the resource group, and a module scoped to that resource group for the storage account',
      },
      {
        id: 'c',
        text: 'A management-group-scope deployment, because resource groups are tenant objects',
      },
      { id: 'd', text: 'Two separate pipelines, because one Bicep deployment cannot span scopes' },
    ],
    correct: ['b'],
    probing: 'Deployment scopes and how modules cross them.',
    answer: [
      "Resource groups are **subscription-level** resources, so the file creating one must be a subscription-scope deployment - `targetScope = 'subscription'`, deployed with `az deployment sub create`. A resource-group-scope deployment cannot create the resource group it is deploying into.",
      'The storage account belongs inside the resource group, so it goes in a **module** whose `scope` is that resource group. One deployment can therefore span scopes: the parent deployment runs at subscription scope and ARM creates a nested deployment in the resource group.',
    ],
    code: [
      {
        title: 'Subscription scope creating a group and deploying into it',
        language: 'bicep',
        code: `targetScope = 'subscription'

param location string = 'westeurope'

resource rg 'Microsoft.Resources/resourceGroups@2024-03-01' = {
  name: 'rg-orders-prod'
  location: location
}

module storage 'modules/storage.bicep' = {
  name: 'storage'
  scope: rg                // the module deploys INTO the new group
  params: { location: location }
}`,
      },
      {
        title: 'Deploying at subscription scope',
        language: 'bash',
        code: `az deployment sub create --location westeurope \\
  --template-file main.bicep --name orders-$(date +%s)`,
      },
    ],
    traps: [
      'Forgetting that subscription-scope deployments need a `--location` for the deployment metadata.',
    ],
    followUps: ['What scopes can a Bicep deployment target?'],
    tags: ['bicep', 'scopes', 'modules'],
  },
  {
    id: 'itv-aziac-4',
    level: 'intermediate',
    kind: 'open',
    prompt: 'Explain ARM deployment scopes. What would you deploy at each one?',
    probing:
      'Landing-zone thinking. They want resource group, subscription, management group and tenant, each with a sensible example.',
    answer: [
      'There are four scopes, matching the Azure hierarchy. **Resource group** is the everyday one: the resources of a workload - web apps, databases, storage, networks. **Subscription** is for things that live on the subscription itself: resource groups, subscription-level role assignments, budgets, policy assignments, Defender for Cloud plans, activity log diagnostic settings.',
      '**Management group** is for governance across many subscriptions: custom **policy definitions and initiatives**, policy assignments, and role assignments that should inherit down the tree. **Tenant** scope is rare - creating management groups or subscriptions through aliases - and needs elevated permissions.',
      "In Bicep you set `targetScope` in the file and use the matching command: `az deployment group|sub|mg|tenant create`. Modules let one deployment reach other scopes with the `scope` property - `resourceGroup('rg-name')`, `subscription('<id>')`, `managementGroup('<id>')` - as long as the deploying identity has rights there.",
      'In practice a platform repo deploys at management group and subscription scope (policies, subscriptions, hub networking), and application repos deploy at resource group scope. Keeping those separate keeps the blast radius and the permissions of each pipeline small.',
    ],
    diagrams: [
      {
        kind: 'nested',
        title: 'What gets deployed at each scope',
        caption: 'Higher scopes are for governance; workloads live at resource group scope.',
        root: {
          label: 'Tenant scope',
          detail: 'Management groups, subscription aliases',
          tone: 'muted',
          children: [
            {
              label: 'Management group scope',
              detail: 'Policy definitions, initiatives, RBAC',
              tone: 'accent',
              children: [
                {
                  label: 'Subscription scope',
                  detail: 'Resource groups, budgets, Defender plans',
                  children: [
                    {
                      label: 'Resource group scope',
                      detail: 'The workload: apps, data, networks',
                      tone: 'success',
                    },
                  ],
                },
              ],
            },
          ],
        },
      },
    ],
    code: [
      {
        title: 'A policy definition at management group scope',
        language: 'bicep',
        code: `targetScope = 'managementGroup'

resource requireTag 'Microsoft.Authorization/policyDefinitions@2023-04-01' = {
  name: 'require-costcentre-tag'
  properties: {
    displayName: 'Require a costCentre tag on resource groups'
    policyType: 'Custom'
    mode: 'All'
    policyRule: {
      if: {
        allOf: [
          { field: 'type', equals: 'Microsoft.Resources/subscriptions/resourceGroups' }
          { field: 'tags[costCentre]', exists: 'false' }
        ]
      }
      then: { effect: 'deny' }
    }
  }
}`,
      },
      {
        title: 'The matching commands',
        language: 'bash',
        code: `az deployment group  create -g <rg>             -f app.bicep
az deployment sub    create -l westeurope        -f subscription.bicep
az deployment mg     create -m <mg-id> -l westeurope -f governance.bicep
az deployment tenant create -l westeurope        -f tenant.bicep`,
        placeholders: ['<rg>', '<mg-id>'],
      },
    ],
    traps: [
      'Deploying policy definitions per subscription instead of once at a management group.',
      'Giving application pipelines management-group permissions they never need.',
    ],
    followUps: [
      'Why do subscription and management group deployments need a location?',
      'How would you structure a landing-zone repository?',
    ],
    tags: ['arm', 'scopes', 'governance', 'landing zones'],
  },
  {
    id: 'itv-aziac-5',
    level: 'advanced',
    kind: 'mcq',
    prompt: 'Which statement about ARM deployment modes is correct?',
    options: [
      {
        id: 'a',
        text: 'Incremental mode deletes resources in the resource group that are not in the template',
      },
      {
        id: 'b',
        text: 'Complete mode deletes resources in the target resource group that are not in the template, and applies only to resource group deployments',
      },
      { id: 'c', text: 'Complete mode is the default for Bicep deployments' },
      {
        id: 'd',
        text: 'Complete mode also deletes resources in other resource groups the template does not mention',
      },
    ],
    correct: ['b'],
    probing:
      'A dangerous switch. Senior candidates know exactly what it deletes, where it applies, and what Microsoft now recommends instead.',
    answer: [
      '**Incremental** is the default. Resources in the template are created or updated; resources in the resource group that the template does not mention are **left alone**. That is safe, but it means removing a resource from the template does not remove it from Azure.',
      '**Complete** mode makes the resource group match the template: anything in the **target resource group** that the template does not declare is **deleted**. It applies only to resource-group-scope deployments, and it only touches the resource group the deployment targets - not other groups a module deploys into.',
      'It is powerful for keeping a group tidy and terrifying in practice, because one template missing a resource - someone deployed a partial template, or a resource was added by hand - deletes it. Microsoft now recommends **deployment stacks** for this job: they track exactly the resources they created and let you choose whether unmanaged ones are detached or deleted.',
    ],
    deeper: [
      'Always run **what-if** with `--mode Complete` before any complete deployment; it lists the deletions explicitly.',
      'Some resource types behave unexpectedly under complete mode - extension and child resources in particular - and resource locks will make the deletion fail rather than silently succeed. That is one more reason to prefer stacks.',
    ],
    code: [
      {
        title: 'Preview a complete-mode deployment before running it',
        language: 'bash',
        code: `az deployment group what-if -g <rg> --mode Complete \\
  --template-file main.bicep --parameters main.bicepparam
# Look for "Delete" entries - each one will be removed from the group

# Only then, and ideally never by hand:
# az deployment group create -g <rg> --mode Complete -f main.bicep -p main.bicepparam`,
        placeholders: ['<rg>'],
      },
    ],
    traps: [
      'Running complete mode against a shared resource group containing resources from several templates.',
      'Believing incremental mode cleans up removed resources.',
    ],
    followUps: [
      'How do deployment stacks improve on complete mode?',
      'How would you clean up resources removed from a Bicep file?',
    ],
    tags: ['arm', 'deployment modes', 'complete mode', 'safety'],
  },
  {
    id: 'itv-aziac-6',
    level: 'intermediate',
    kind: 'open',
    prompt: 'What does what-if do, and what are its limitations?',
    probing:
      'The Bicep equivalent of a plan. They want to know how to read it, why it is noisy, and that it is not a guarantee.',
    answer: [
      '`az deployment group what-if` (and the `sub`, `mg` and `tenant` equivalents) submits the template to Resource Manager, which compares it with the current state of the resources and reports what **would** change - **Create**, **Delete** (complete mode only), **Modify** with property-level diffs, **NoChange**, **Ignore** for resources outside the template, and **Deploy** where it cannot tell.',
      'It is the review step before deployment. In a pipeline I run what-if on every pull request and post the output, so reviewers see the actual effect on Azure rather than just a diff of Bicep.',
      'The limitations matter. It can be **noisy**: some resource providers return properties differently from how you set them, so what-if reports modifications that will not actually happen. It cannot see through everything - values computed at deployment time, nested deployments that depend on runtime outputs, and some extension resources show as unknown or "Deploy". And it does not evaluate every Azure Policy or quota, so a clean what-if can still fail at deployment.',
      'So I treat it as a strong review aid, not a contract. Deletions and replacements get read carefully every time, and noisy properties that are known false positives are documented so reviewers are not trained to ignore the output.',
    ],
    diagrams: [
      {
        kind: 'flow',
        title: 'What-if in a pull request',
        caption: 'Reviewers approve the effect on Azure, not just the Bicep diff.',
        nodes: [
          { label: 'PR changes main.bicep', tone: 'accent' },
          { label: 'Build and lint', detail: 'az bicep build, linter rules' },
          { label: 'what-if against the target', detail: 'Create, Modify, Delete, NoChange' },
          {
            label: 'Post result to the PR',
            detail: 'Reviewers read deletes first',
            branch: { label: 'Unexpected Delete', detail: 'Block the merge and investigate' },
          },
          {
            label: 'Merge, then deploy',
            detail: 'Same template, same parameters',
            tone: 'success',
          },
        ],
      },
    ],
    code: [
      {
        title: 'What-if with focused output',
        language: 'bash',
        code: `az deployment group what-if -g <rg> \\
  --template-file main.bicep --parameters main.bicepparam \\
  --result-format FullResourcePayloads \\
  --exclude-change-types NoChange Ignore

# Machine-readable, for a pipeline gate that fails on deletes
az deployment group what-if -g <rg> -f main.bicep -p main.bicepparam \\
  --no-pretty-print --query "changes[?changeType=='Delete'].resourceId" -o tsv`,
        placeholders: ['<rg>'],
      },
      {
        title: 'Pipeline gate on deletions',
        language: 'yaml',
        code: `- task: AzureCLI@2
  displayName: what-if (fail on delete)
  inputs:
    azureSubscription: sc-orders-prod
    scriptType: bash
    scriptLocation: inlineScript
    inlineScript: |
      deletes=$(az deployment group what-if -g rg-orders-prod -f main.bicep \\
        -p main.bicepparam --no-pretty-print \\
        --query "length(changes[?changeType=='Delete'])")
      if [ "$deletes" -gt 0 ]; then
        echo "##vso[task.logissue type=error]what-if reports $deletes deletion(s)"
        exit 1
      fi`,
      },
    ],
    traps: [
      'Treating a clean what-if as a guarantee the deployment will succeed.',
      'Letting the noise train reviewers to skim past real changes.',
      'Running what-if with different parameters from the real deployment.',
    ],
    followUps: [
      'Why does what-if show changes that never happen?',
      'How does what-if compare with terraform plan?',
    ],
    tags: ['what-if', 'bicep', 'review', 'pipelines'],
  },
]
