import type { CommandGroup } from '../types'

/**
 * Searchable command reference for AZ-900.
 *
 * AZ-900 is not a hands-on exam, so this covers the handful of commands that
 * make the concepts concrete: finding your way around subscriptions, resource
 * groups, tags, locks, policy, Advisor and cost. Azure CLI first, with the
 * Azure PowerShell equivalent in the notes where it helps.
 */
export const az900CommandGroups: CommandGroup[] = [
  {
    id: 'az9-cmd-account',
    title: 'Signing in and choosing a subscription',
    description:
      'Cloud Shell basics, signing in, and making sure you are working in the right subscription.',
    entries: [
      {
        id: 'az9-c-login',
        command: 'az login',
        description:
          'Sign in to Azure with your Microsoft Entra ID account. Not needed in Cloud Shell.',
        example: 'az login --tenant <tenant-id>',
        notes: 'PowerShell: Connect-AzAccount. Cloud Shell signs you in automatically.',
        tags: ['account', 'basics', 'sign-in'],
      },
      {
        id: 'az9-c-account-show',
        command: 'az account show --output table',
        description: 'Show the subscription and tenant your commands will act on.',
        notes: 'PowerShell: Get-AzContext.',
        tags: ['account', 'subscription', 'basics'],
      },
      {
        id: 'az9-c-account-list',
        command: 'az account list --output table',
        description: 'List every subscription you can access, and which one is the default.',
        notes: 'PowerShell: Get-AzSubscription.',
        tags: ['account', 'subscription'],
      },
      {
        id: 'az9-c-account-set',
        command: 'az account set --subscription <name-or-id>',
        description: 'Change the default subscription for subsequent commands.',
        placeholders: ['<name-or-id>'],
        example: 'az account set --subscription "Pay-As-You-Go"',
        notes: 'PowerShell: Set-AzContext -Subscription <name-or-id>.',
        tags: ['account', 'subscription'],
      },
      {
        id: 'az9-c-list-locations',
        command:
          'az account list-locations --query "[].{name:name, display:displayName}" --output table',
        description:
          'List the Azure regions available to your subscription, with their short names.',
        notes: 'Use the short name (for example westeurope) in --location arguments.',
        tags: ['regions', 'basics'],
      },
      {
        id: 'az9-c-az-find',
        command: 'az find "<what you want to do>"',
        description:
          'Ask the Azure CLI to suggest commands and examples for a task or command group.',
        placeholders: ['<what you want to do>'],
        example: 'az find "az lock"',
        notes:
          'Works in Cloud Shell, where the Azure CLI and Azure PowerShell are pre-installed and signed in. Use az <group> --help for full syntax.',
        tags: ['cloud shell', 'basics', 'help'],
      },
    ],
  },
  {
    id: 'az9-cmd-groups',
    title: 'Resource groups and resources',
    description:
      'Creating, listing and deleting resource groups, and finding the resources inside them.',
    entries: [
      {
        id: 'az9-c-group-create',
        command: 'az group create --name <rg> --location <region>',
        description: 'Create a resource group - a logical container for related resources.',
        placeholders: ['<rg>', '<region>'],
        example: 'az group create --name rg-az900-demo --location eastus --tags Environment=dev',
        notes: 'PowerShell: New-AzResourceGroup -Name <rg> -Location <region>.',
        tags: ['resource group', 'basics'],
      },
      {
        id: 'az9-c-group-list',
        command: 'az group list --output table',
        description: 'List resource groups in the current subscription.',
        notes: 'PowerShell: Get-AzResourceGroup.',
        tags: ['resource group'],
      },
      {
        id: 'az9-c-resource-list',
        command: 'az resource list --resource-group <rg> --output table',
        description: 'List every resource in a resource group, whatever its type.',
        placeholders: ['<rg>'],
        notes: 'PowerShell: Get-AzResource -ResourceGroupName <rg>.',
        tags: ['resources', 'inspect'],
      },
      {
        id: 'az9-c-group-delete',
        command: 'az group delete --name <rg> --yes --no-wait',
        description: 'Delete a resource group and everything in it. The standard lab cleanup.',
        placeholders: ['<rg>'],
        notes:
          'Fails if any lock exists on the group or its resources. PowerShell: Remove-AzResourceGroup -Name <rg> -Force.',
        tags: ['resource group', 'cleanup'],
      },
      {
        id: 'az9-c-deploy-bicep',
        command: 'az deployment group create --resource-group <rg> --template-file <file>.bicep',
        description: 'Deploy a Bicep or ARM template to a resource group.',
        placeholders: ['<rg>', '<file>'],
        example:
          'az deployment group create -g rg-az900-demo --template-file main.bicep --parameters env=dev',
        notes:
          'PowerShell: New-AzResourceGroupDeployment -ResourceGroupName <rg> -TemplateFile <file>.bicep.',
        tags: ['bicep', 'iac', 'deploy'],
      },
      {
        id: 'az9-c-what-if',
        command: 'az deployment group what-if --resource-group <rg> --template-file <file>.bicep',
        description: 'Preview what a deployment would create, change or delete, without deploying.',
        placeholders: ['<rg>', '<file>'],
        notes: 'PowerShell: add -WhatIf to New-AzResourceGroupDeployment.',
        tags: ['bicep', 'iac', 'preview'],
      },
    ],
  },
  {
    id: 'az9-cmd-tags',
    title: 'Tags',
    description: 'Adding, merging and querying tags for organisation and cost reporting.',
    entries: [
      {
        id: 'az9-c-tag-group',
        command: 'az group update --name <rg> --set tags.<name>=<value>',
        description: 'Add or change one tag on a resource group, keeping the others.',
        placeholders: ['<rg>', '<name>', '<value>'],
        example: 'az group update --name rg-az900-demo --set tags.CostCenter=1234',
        notes: 'Tags on a group are not inherited by the resources inside it.',
        tags: ['tags', 'resource group'],
      },
      {
        id: 'az9-c-tag-merge',
        command:
          'az tag update --resource-id <resource-id> --operation Merge --tags <name>=<value>',
        description: 'Merge tags into a resource or group without removing existing tags.',
        placeholders: ['<resource-id>', '<name>', '<value>'],
        notes:
          'Use --operation Replace to overwrite all tags, or Delete to remove named ones. PowerShell: Update-AzTag -ResourceId <id> -Tag @{Name="Value"} -Operation Merge.',
        tags: ['tags'],
      },
      {
        id: 'az9-c-resource-by-tag',
        command: 'az resource list --tag <name>=<value> --output table',
        description: 'Find every resource in the subscription carrying a given tag.',
        placeholders: ['<name>', '<value>'],
        example: 'az resource list --tag Environment=prod -o table',
        notes: 'PowerShell: Get-AzResource -Tag @{Environment="prod"}.',
        tags: ['tags', 'inspect'],
      },
      {
        id: 'az9-c-tag-list',
        command: 'az tag list --output table',
        description: 'List the tag names and values used across the subscription.',
        tags: ['tags', 'inspect'],
      },
      {
        id: 'az9-c-untagged',
        command:
          'az resource list --query "[?tags.<name>==null].{name:name, type:type}" --output table',
        description: 'Find resources missing a required tag, so their cost can be attributed.',
        placeholders: ['<name>'],
        example: 'az resource list --query "[?tags.CostCenter==null].name" -o tsv',
        tags: ['tags', 'cost', 'governance'],
      },
    ],
  },
  {
    id: 'az9-cmd-governance',
    title: 'Locks and Azure Policy',
    description: 'Preventing accidental deletion and enforcing standards across a scope.',
    entries: [
      {
        id: 'az9-c-lock-create',
        command:
          'az lock create --name <lock> --resource-group <rg> --lock-type <CanNotDelete|ReadOnly>',
        description:
          'Lock a resource group so it cannot be deleted (CanNotDelete) or changed (ReadOnly).',
        placeholders: ['<lock>', '<rg>'],
        example: 'az lock create --name protect --resource-group rg-prod --lock-type CanNotDelete',
        notes:
          'Locks apply to everyone, including Owners. PowerShell: New-AzResourceLock -LockName <lock> -LockLevel CanNotDelete -ResourceGroupName <rg>.',
        tags: ['locks', 'governance'],
      },
      {
        id: 'az9-c-lock-list',
        command: 'az lock list --resource-group <rg> --output table',
        description: 'List locks on a resource group and its resources.',
        placeholders: ['<rg>'],
        notes: 'PowerShell: Get-AzResourceLock -ResourceGroupName <rg>.',
        tags: ['locks', 'inspect'],
      },
      {
        id: 'az9-c-lock-delete',
        command: 'az lock delete --name <lock> --resource-group <rg>',
        description: 'Remove a lock - required before a locked group can be deleted.',
        placeholders: ['<lock>', '<rg>'],
        tags: ['locks', 'cleanup'],
      },
      {
        id: 'az9-c-policy-definitions',
        command:
          "az policy definition list --query \"[?policyType=='BuiltIn' && contains(displayName, '<text>')].{name:name, display:displayName}\" --output table",
        description: 'Search the built-in policy definitions by display name.',
        placeholders: ['<text>'],
        example:
          'az policy definition list --query "[?contains(displayName, \'Allowed locations\')].name" -o tsv',
        tags: ['policy', 'governance'],
      },
      {
        id: 'az9-c-policy-assign',
        command:
          'az policy assignment create --name <name> --scope <scope-id> --policy <definition-name-or-id> --params <json>',
        description:
          'Assign a policy definition to a management group, subscription or resource group.',
        placeholders: ['<name>', '<scope-id>', '<definition-name-or-id>', '<json>'],
        example:
          'az policy assignment create --name allowed-locations --scope /subscriptions/<sub-id>/resourceGroups/rg-prod --policy e56962a6-4747-49cd-b67b-bf8b01975c4c --params \'{"listOfAllowedLocations":{"value":["westeurope"]}}\'',
        notes: 'PowerShell: New-AzPolicyAssignment.',
        tags: ['policy', 'governance'],
      },
      {
        id: 'az9-c-policy-list',
        command: 'az policy assignment list --resource-group <rg> --output table',
        description: 'List policy assignments at a resource group.',
        placeholders: ['<rg>'],
        notes: 'Add --disable-scope-strict-match to include assignments inherited from above.',
        tags: ['policy', 'inspect'],
      },
      {
        id: 'az9-c-policy-state',
        command: 'az policy state summarize --resource-group <rg>',
        description: 'Summarise compliant and non-compliant resources for a scope.',
        placeholders: ['<rg>'],
        notes: 'Run az policy state trigger-scan to evaluate immediately instead of waiting.',
        tags: ['policy', 'compliance'],
      },
    ],
  },
  {
    id: 'az9-cmd-cost-monitor',
    title: 'Cost, Advisor and monitoring',
    description: 'Budgets, Advisor recommendations, and a first look at Azure Monitor.',
    entries: [
      {
        id: 'az9-c-advisor-list',
        command:
          'az advisor recommendation list --category <Cost|Security|HighAvailability|Performance|OperationalExcellence> --output table',
        description: 'List Azure Advisor recommendations, optionally filtered by category.',
        example: 'az advisor recommendation list --category Cost -o table',
        notes:
          'The CLI calls the Reliability category HighAvailability. PowerShell: Get-AzAdvisorRecommendation -Category Cost.',
        tags: ['advisor', 'cost'],
      },
      {
        id: 'az9-c-budget-create',
        command:
          'az consumption budget create --budget-name <name> --amount <amount> --category cost --time-grain monthly --start-date <yyyy-mm-01> --end-date <yyyy-mm-dd>',
        description: 'Create a monthly cost budget for the current subscription.',
        placeholders: ['<name>', '<amount>', '<yyyy-mm-01>', '<yyyy-mm-dd>'],
        notes:
          'Budgets alert; they do not stop resources. Add notifications in the portal or with Bicep. PowerShell: New-AzConsumptionBudget.',
        tags: ['cost', 'budget'],
      },
      {
        id: 'az9-c-budget-list',
        command: 'az consumption budget list --output table',
        description: 'List budgets with their amount and current spend.',
        tags: ['cost', 'budget', 'inspect'],
      },
      {
        id: 'az9-c-activity-log',
        command: 'az monitor activity-log list --resource-group <rg> --offset 1d --output table',
        description:
          'Show control-plane operations in the last day - who created, changed or deleted what.',
        placeholders: ['<rg>'],
        notes:
          'PowerShell: Get-AzActivityLog -ResourceGroupName <rg> -StartTime (Get-Date).AddDays(-1).',
        tags: ['monitor', 'audit'],
      },
      {
        id: 'az9-c-metrics-list',
        command:
          'az monitor metrics list --resource <resource-id> --metric "<metric-name>" --interval PT5M --output table',
        description: 'Read platform metrics for a resource, such as Percentage CPU for a VM.',
        placeholders: ['<resource-id>', '<metric-name>'],
        example: 'az monitor metrics list --resource <vm-id> --metric "Percentage CPU" -o table',
        tags: ['monitor', 'metrics'],
      },
      {
        id: 'az9-c-resource-health',
        command:
          'az resource show --ids <resource-id>/providers/Microsoft.ResourceHealth/availabilityStatuses/current --query properties.availabilityState',
        description:
          'Check Resource Health for one resource: Available, Unavailable, Degraded or Unknown.',
        placeholders: ['<resource-id>'],
        tags: ['monitor', 'service health'],
      },
    ],
  },
]
