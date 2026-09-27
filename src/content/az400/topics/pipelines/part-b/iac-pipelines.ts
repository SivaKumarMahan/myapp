import type { Topic } from '../../../../types'

export const az4IacPipelines: Topic = {
  id: 'az4-iac-pipelines',
  title: 'Infrastructure as code in pipelines: Bicep, Terraform and beyond',
  domainId: 'az4-pipelines',
  difficulty: 'advanced',
  estimatedMinutes: 40,
  order: 9,
  tags: [
    'bicep',
    'arm',
    'terraform',
    'what-if',
    'state',
    'machine configuration',
    'deployment environments',
    'deployment stacks',
  ],
  oneLiner:
    'Deploy Bicep and Terraform from Azure Pipelines and GitHub Actions with a previewed change on every pull request, safe state, configuration management for machines and self-service environments.',
  explanation: [
    '**Infrastructure as code (IaC)** means the Azure resources an application needs are described in files that live next to the application code, reviewed in pull requests and deployed by a pipeline instead of by hand. On Azure the main options are **Bicep** (Microsoft recommended, compiles to ARM JSON), **ARM templates** (the JSON format Azure Resource Manager understands natively) and **Terraform** (HashiCorp, multi-cloud, uses the `azurerm` and `azapi` providers).',
    'The pipeline pattern is the same for all of them. On a **pull request**, validate the files and produce a **preview** of what would change: `az deployment group what-if` for Bicep and ARM, `terraform plan` for Terraform. Reviewers read the preview alongside the code diff. After merge, the pipeline deploys the same change, usually behind an environment approval for production.',
    'Bicep and ARM are **stateless** from your point of view: Azure Resource Manager itself is the record of what exists, and each deployment is compared against the live resources. Terraform is **stateful**: it keeps a state file mapping your configuration to real resource ids. In a team, that state must live in a **remote backend** (on Azure, a blob in a storage account) with **locking** (blob leases) so two pipeline runs cannot apply at once.',
    'IaC creates resources; **configuration management** keeps what is inside machines correct. On Azure the current answer is **Azure Machine Configuration** (part of Azure Automanage, formerly Guest Configuration): you package a desired state configuration, publish it, and assign it through Azure Policy to Azure VMs and Azure Arc-enabled servers, which then audit or apply it continuously. Azure Automation State Configuration is the older service being retired in its favour.',
    '**Azure Deployment Environments** gives developers self-service infrastructure. A platform team defines **environment definitions** (IaC templates plus an `environment.yaml` manifest) in a Git **catalog** attached to a **dev center**, and sets which **environment types** (Dev, Test, Prod) each **project** can create and in which subscription. Developers or pipelines then create a full environment from a definition with one command, without needing rights on the subscription.',
  ],
  whyItMatters: [
    'The AZ-400 outline includes "design and implement an infrastructure as code strategy, including source control and automation of testing and deployment", "design and implement desired state configuration for environments, including Azure Automation State Configuration, ARM, Bicep and Azure Automanage Machine Configuration" and "design and implement Azure Deployment Environments for on-demand self-deployment".',
    'A reviewed what-if or plan is the single most useful safety net in infrastructure work. It turns "I think this only changes a tag" into a machine-generated list of creates, modifies and deletes that a second person can check.',
    'State and identity handling are where IaC pipelines go wrong in practice: leaked state files expose secrets, missing locks corrupt state, and long-lived client secrets in service connections get stolen. Using workload identity federation and a locked remote backend avoids both.',
  ],
  howItWorks: [
    'The pipeline authenticates to Azure through a **service connection** (Azure Pipelines) or `azure/login` (GitHub Actions). Both should use **workload identity federation** (OpenID Connect), so no client secret is stored: the pipeline receives a short-lived token that Microsoft Entra ID exchanges for an access token.',
    'Validation stage: `az bicep build` or the Bicep linter catches syntax and best-practice issues; `az deployment group validate` checks the template against Resource Manager; `terraform fmt -check`, `terraform validate` and optionally tflint or Checkov catch problems before any Azure call.',
    'Preview stage: `az deployment group what-if` lists each resource as Create, Delete, Modify, NoChange, Ignore or Deploy. `terraform plan -out tfplan` writes an exact plan file; publishing that file as a pipeline artifact and applying it later guarantees production gets exactly what was reviewed. `-detailed-exitcode` returns 2 when changes are pending, which a pipeline can use to skip the apply stage.',
    'Deploy stage: a deployment job to an environment with approvals runs `az deployment group create` (incremental mode by default: resources not in the template are left alone) or `terraform apply tfplan`. For Bicep, **deployment stacks** (`az stack group create`) add lifecycle management: resources removed from the template can be deleted or detached, and deny settings can block manual changes outside the stack.',
    'Terraform state configuration: the `azurerm` backend block names a resource group, storage account, container and key. With `use_oidc = true` and `use_azuread_auth = true` the backend uses the pipeline identity instead of storage account keys, which the identity needs the Storage Blob Data Contributor role for.',
    'Drift: because Bicep deployments compare against live resources, a scheduled what-if run detects manual changes. Terraform detects drift with a scheduled `terraform plan`. Azure Policy and Machine Configuration continuously detect drift inside and outside resources and can remediate it.',
  ],
  diagrams: [
    {
      kind: 'flow',
      title: 'IaC pipeline from pull request to production',
      caption:
        'The preview is produced on the pull request and the exact reviewed plan is applied after approval.',
      nodes: [
        {
          label: 'Pull request opened',
          detail: 'Bicep or Terraform files changed',
          tone: 'muted',
        },
        {
          label: 'Lint and validate',
          detail: 'bicep lint, terraform validate, Checkov',
          arrowLabel: 'PR trigger',
        },
        {
          label: 'Preview the change',
          detail: 'what-if or terraform plan -out tfplan',
          arrowLabel: 'OIDC login',
          tone: 'accent',
          branch: {
            label: 'Unexpected delete',
            detail: 'Reviewer rejects the PR',
            tone: 'danger',
          },
        },
        {
          label: 'Merge and approve',
          detail: 'Environment approval for prod',
          arrowLabel: 'review',
          tone: 'warning',
        },
        {
          label: 'Apply',
          detail: 'deployment create or apply tfplan',
          tone: 'success',
        },
      ],
    },
    {
      kind: 'nested',
      title: 'Azure Deployment Environments building blocks',
      caption:
        'Platform engineers own the dev center, catalog and environment types; developers only choose a definition and create.',
      root: {
        label: 'Dev center',
        tone: 'accent',
        children: [
          {
            label: 'Catalog (Git repo)',
            children: [
              {
                label: 'Environment definition',
                detail: 'environment.yaml plus Bicep or Terraform',
              },
            ],
          },
          {
            label: 'Project',
            children: [
              { label: 'Environment types', detail: 'Dev, Test mapped to subscriptions' },
              {
                label: 'Environments',
                detail: 'Created by developers or pipelines',
                tone: 'success',
              },
            ],
          },
        ],
      },
    },
  ],
  keyObjects: [
    {
      kind: 'Resource group deployment (Microsoft.Resources/deployments)',
      apiVersion: '2024-03-01',
      purpose:
        'The record Azure Resource Manager keeps for each Bicep or ARM deployment, including parameters, outputs and status.',
      fields: [
        {
          path: 'properties.mode',
          meaning:
            'Incremental (default) leaves unlisted resources alone; Complete deletes resources in the group that are not in the template.',
        },
        {
          path: 'properties.parameters',
          meaning: 'Values passed from a .bicepparam file or the command line.',
        },
        {
          path: 'properties.outputs',
          meaning: 'Values the template returns, readable by later pipeline steps.',
        },
      ],
    },
    {
      kind: 'Deployment stack (Microsoft.Resources/deploymentStacks)',
      apiVersion: '2024-03-01',
      purpose:
        'Manages a set of resources as one unit, with cleanup of removed resources and optional deny settings.',
      fields: [
        {
          path: 'properties.actionOnUnmanage',
          meaning: 'Whether resources dropped from the template are deleted or detached.',
        },
        {
          path: 'properties.denySettings.mode',
          meaning:
            'none, denyDelete or denyWriteAndDelete, to block changes made outside the stack.',
        },
      ],
    },
    {
      kind: 'Terraform azurerm backend',
      purpose: 'Stores Terraform state as a blob in Azure Storage with lease-based locking.',
      fields: [
        {
          path: 'storage_account_name / container_name / key',
          meaning: 'Where the state blob lives.',
          required: true,
        },
        { path: 'use_oidc', meaning: 'Authenticate with the federated token from the pipeline.' },
        {
          path: 'use_azuread_auth',
          meaning: 'Use Entra ID data-plane auth instead of storage account keys.',
        },
      ],
    },
    {
      kind: 'Machine Configuration assignment (Microsoft.GuestConfiguration/guestConfigurationAssignments)',
      apiVersion: '2022-01-25',
      purpose:
        'Assigns a configuration package to a VM or Arc-enabled server, usually created by an Azure Policy deployIfNotExists effect.',
      fields: [
        {
          path: 'properties.guestConfiguration.name',
          meaning: 'Name of the configuration package.',
        },
        {
          path: 'properties.guestConfiguration.assignmentType',
          meaning: 'Audit, ApplyAndMonitor or ApplyAndAutoCorrect.',
        },
        {
          path: 'properties.guestConfiguration.contentUri',
          meaning: 'Where the package zip is stored.',
        },
      ],
    },
  ],
  realWorldExample: {
    title: 'The one-line change that would have deleted a subnet',
    story: [
      'An engineer renamed a subnet in a Bicep file to match a naming standard. The pull request diff looked like a harmless one-word change.',
      'The PR pipeline ran what-if and posted the result: the virtual network would be **Modified**, with the old subnet deleted and a new one created. That subnet held a private endpoint for the production database.',
      'The reviewer rejected the change. The team instead added the new name as a second subnet, moved the private endpoint, and removed the old subnet in a later release.',
      'Afterwards they made the what-if output a required PR check, and switched the Terraform half of their estate to publish the plan file as an artifact so that production always applies exactly the reviewed plan.',
    ],
  },
  yamlExamples: [
    {
      title: 'Azure Pipelines: Bicep what-if on PR, deploy after approval',
      language: 'yaml',
      explanation:
        'The same pipeline runs on pull requests (what-if only) and on main (what-if, then a deployment job to an approved environment).',
      code: `trigger:
  branches:
    include: [main]
  paths:
    include: [infra/*]

pr:
  branches:
    include: [main]
  paths:
    include: [infra/*]

variables:
  serviceConnection: sc-orders-prod-wif
  resourceGroup: rg-orders-prod

stages:
  - stage: Preview
    jobs:
      - job: WhatIf
        pool:
          vmImage: ubuntu-latest
        steps:
          - task: AzureCLI@2
            displayName: Lint and what-if
            inputs:
              azureSubscription: $(serviceConnection)
              scriptType: bash
              scriptLocation: inlineScript
              inlineScript: |
                az bicep lint --file infra/main.bicep
                az deployment group what-if \\
                  --resource-group $(resourceGroup) \\
                  --template-file infra/main.bicep \\
                  --parameters infra/prod.bicepparam

  - stage: Deploy
    dependsOn: Preview
    condition: and(succeeded(), ne(variables['Build.Reason'], 'PullRequest'))
    jobs:
      - deployment: DeployInfra
        environment: orders-prod
        pool:
          vmImage: ubuntu-latest
        strategy:
          runOnce:
            deploy:
              steps:
                - checkout: self
                - task: AzureCLI@2
                  inputs:
                    azureSubscription: $(serviceConnection)
                    scriptType: bash
                    scriptLocation: inlineScript
                    inlineScript: |
                      az deployment group create \\
                        --resource-group $(resourceGroup) \\
                        --template-file infra/main.bicep \\
                        --parameters infra/prod.bicepparam \\
                        --name orders-$(Build.BuildId)`,
    },
    {
      title: 'Azure Pipelines: Terraform plan artifact applied after approval',
      language: 'yaml',
      explanation:
        'AzureCLI@2 with addSpnToEnvironment exposes the federated idToken, which Terraform uses through ARM_OIDC_TOKEN. The plan file is published and the apply stage uses exactly that file.',
      code: `stages:
  - stage: Plan
    jobs:
      - job: Plan
        pool:
          vmImage: ubuntu-latest
        steps:
          - task: AzureCLI@2
            displayName: terraform plan
            inputs:
              azureSubscription: sc-platform-wif
              addSpnToEnvironment: true
              scriptType: bash
              scriptLocation: inlineScript
              workingDirectory: infra/terraform
              inlineScript: |
                export ARM_CLIENT_ID=$servicePrincipalId
                export ARM_TENANT_ID=$tenantId
                export ARM_OIDC_TOKEN=$idToken
                export ARM_USE_OIDC=true
                export ARM_SUBSCRIPTION_ID=$(az account show --query id -o tsv)
                terraform init -input=false
                terraform plan -input=false -out=tfplan
          - publish: infra/terraform/tfplan
            artifact: tfplan

  - stage: Apply
    dependsOn: Plan
    jobs:
      - deployment: Apply
        environment: platform-prod
        pool:
          vmImage: ubuntu-latest
        strategy:
          runOnce:
            deploy:
              steps:
                - checkout: self
                - task: AzureCLI@2
                  displayName: terraform apply
                  inputs:
                    azureSubscription: sc-platform-wif
                    addSpnToEnvironment: true
                    scriptType: bash
                    scriptLocation: inlineScript
                    workingDirectory: infra/terraform
                    inlineScript: |
                      export ARM_CLIENT_ID=$servicePrincipalId
                      export ARM_TENANT_ID=$tenantId
                      export ARM_OIDC_TOKEN=$idToken
                      export ARM_USE_OIDC=true
                      export ARM_SUBSCRIPTION_ID=$(az account show --query id -o tsv)
                      cp $(Pipeline.Workspace)/tfplan/tfplan .
                      terraform init -input=false
                      terraform apply -input=false tfplan`,
    },
    {
      title: 'GitHub Actions: Terraform plan on pull request with OIDC',
      language: 'yaml',
      explanation:
        'The ARM_ variables tell the azurerm provider and backend to use the GitHub OIDC token. The plan is written to the job summary for reviewers.',
      code: `name: terraform-plan
on:
  pull_request:
    paths: ['infra/terraform/**']

permissions:
  id-token: write
  contents: read
  pull-requests: write

env:
  ARM_CLIENT_ID: \${{ vars.AZURE_CLIENT_ID }}
  ARM_TENANT_ID: \${{ vars.AZURE_TENANT_ID }}
  ARM_SUBSCRIPTION_ID: \${{ vars.AZURE_SUBSCRIPTION_ID }}
  ARM_USE_OIDC: 'true'

jobs:
  plan:
    runs-on: ubuntu-latest
    defaults:
      run:
        working-directory: infra/terraform
    steps:
      - uses: actions/checkout@v4
      - uses: hashicorp/setup-terraform@v3
      - run: terraform fmt -check
      - run: terraform init -input=false
      - run: terraform validate
      - id: plan
        run: terraform plan -input=false -no-color -out=tfplan
      - name: Add plan to job summary
        run: terraform show -no-color tfplan >> "$GITHUB_STEP_SUMMARY"`,
    },
  ],
  imperative: [
    {
      command:
        'az deployment group what-if --resource-group rg-orders-prod --template-file main.bicep --parameters prod.bicepparam',
      what: 'Previews every create, modify and delete a Bicep deployment would make, without changing anything.',
      expected: 'Resource changes: 1 to create, 1 to modify, 4 no change.',
    },
    {
      command:
        'az deployment group create --resource-group rg-orders-prod --template-file main.bicep --parameters prod.bicepparam --confirm-with-what-if',
      what: 'Runs what-if first and asks for confirmation before deploying - useful interactively, not in unattended pipelines.',
    },
    {
      command:
        'az stack group create --name orders-stack --resource-group rg-orders-prod --template-file main.bicep --action-on-unmanage deleteResources --deny-settings-mode denyDelete',
      what: 'Deploys the template as a deployment stack that deletes resources removed from the template and blocks deletion outside the stack.',
    },
    {
      command: 'terraform plan -input=false -out=tfplan -detailed-exitcode',
      what: 'Writes a plan file and returns exit code 0 (no changes), 1 (error) or 2 (changes pending).',
    },
    {
      command:
        'az devcenter dev environment create --dev-center-name dc-contoso --project-name orders --name pr-1234 --environment-type Dev --catalog-name platform-catalog --environment-definition-name webapp-sql --parameters \'{"appName":"orders-pr-1234"}\'',
      what: 'Creates a self-service Azure Deployment Environment from a catalog definition, for example a per-pull-request environment.',
    },
  ],
  declarative: {
    steps: [
      'Keep infrastructure code in the repository (or a dedicated infra repository) with the same branch policies as application code.',
      'Parameterise per environment with .bicepparam files or Terraform tfvars, never by editing the template.',
      'Create a storage account for Terraform state with blob versioning and soft delete, and grant the pipeline identity Storage Blob Data Contributor on the container.',
      'Publish Machine Configuration packages and assign them with Azure Policy so VMs report and correct drift continuously.',
      'Store environment definitions for Azure Deployment Environments in a catalog repository with an environment.yaml each.',
    ],
    code: [
      {
        title: 'Bicep module with a parameter file',
        language: 'bicep',
        code: `// main.bicep
@allowed([ 'dev', 'prod' ])
param environmentName string
param location string = resourceGroup().location

var storageName = 'st\${uniqueString(resourceGroup().id)}\${environmentName}'

resource storage 'Microsoft.Storage/storageAccounts@2023-05-01' = {
  name: take(storageName, 24)
  location: location
  sku: {
    name: environmentName == 'prod' ? 'Standard_ZRS' : 'Standard_LRS'
  }
  kind: 'StorageV2'
  properties: {
    minimumTlsVersion: 'TLS1_2'
    allowBlobPublicAccess: false
  }
}

output storageAccountName string = storage.name

// prod.bicepparam
// using './main.bicep'
// param environmentName = 'prod'`,
      },
      {
        title: 'Terraform backend and provider using OIDC',
        language: 'hcl',
        code: `terraform {
  required_version = ">= 1.6"

  required_providers {
    azurerm = {
      source  = "hashicorp/azurerm"
      version = "~> 4.0"
    }
  }

  backend "azurerm" {
    resource_group_name  = "rg-tfstate"
    storage_account_name = "sttfstatecontoso"
    container_name       = "tfstate"
    key                  = "orders/prod.tfstate"
    use_oidc             = true
    use_azuread_auth     = true
  }
}

provider "azurerm" {
  features {}
  use_oidc = true
}

resource "azurerm_resource_group" "orders" {
  name     = "rg-orders-prod"
  location = "westeurope"
}`,
      },
      {
        title: 'Azure Deployment Environments: environment.yaml',
        language: 'yaml',
        code: `name: webapp-sql
version: 1.0.0
summary: Web app with an Azure SQL database
description: Deploys an App Service plan, web app and serverless SQL database
runner: Bicep
templatePath: main.bicep
parameters:
  - id: appName
    name: App name
    type: string
    required: true`,
      },
      {
        title: 'Machine Configuration: build and publish a package',
        language: 'powershell',
        explanation:
          'The GuestConfiguration module turns a compiled DSC configuration into a package and a policy definition that assigns it.',
        code: `Install-Module -Name GuestConfiguration -Scope CurrentUser

# Compile your DSC configuration to ./WebServerBaseline/localhost.mof first
New-GuestConfigurationPackage -Name 'WebServerBaseline' \`
  -Configuration './WebServerBaseline/localhost.mof' \`
  -Type AuditAndSet -Force

# Upload the zip to a storage container, then create a policy definition from it
New-GuestConfigurationPolicy -PolicyId (New-Guid) \`
  -ContentUri '<packageUri>' \`
  -DisplayName 'Web server baseline' \`
  -Description 'Applies and monitors the web server baseline' \`
  -Path './policies' -Platform 'Windows' -PolicyVersion '1.0.0' -Mode ApplyAndAutoCorrect`,
        placeholders: ['<packageUri>'],
      },
    ],
  },
  verification: [
    {
      command:
        'az deployment group list --resource-group rg-orders-prod --query "[].{name:name,state:properties.provisioningState,time:properties.timestamp}" -o table',
      what: 'Lists deployments to the group and their outcome.',
      expected: 'The latest orders-<buildId> deployment shows Succeeded.',
    },
    {
      command: 'terraform state list',
      what: 'Lists every resource address in the remote state.',
      expected: 'azurerm_resource_group.orders and the other managed resources.',
    },
    {
      command:
        'az storage blob show --account-name sttfstatecontoso --container-name tfstate --name orders/prod.tfstate --auth-mode login --query "properties.lease"',
      what: 'Checks the state blob lease: locked during an apply, available otherwise.',
      expected: 'status unlocked and state available when no run is in progress.',
    },
    {
      command:
        'az devcenter dev environment list --dev-center-name dc-contoso --project-name orders -o table',
      what: 'Lists Deployment Environments in a project and their provisioning state.',
    },
  ],
  troubleshooting: [
    {
      command:
        'az deployment operation group list --resource-group rg-orders-prod --name orders-<buildId> --query "[?properties.provisioningState==\'Failed\'].properties.statusMessage"',
      what: 'Shows the error from the individual resource operation that failed inside a deployment.',
      placeholders: ['<buildId>'],
    },
    {
      command: 'terraform force-unlock <lockId>',
      what: 'Releases a stale state lock left by a cancelled pipeline run. Only do this when you are sure no apply is running.',
      placeholders: ['<lockId>'],
    },
    {
      command:
        'az role assignment list --assignee <clientId> --all --query "[].{role:roleDefinitionName,scope:scope}" -o table',
      what: 'Checks that the pipeline identity has the roles it needs, such as Contributor on the target and Storage Blob Data Contributor on the state container.',
      placeholders: ['<clientId>'],
    },
  ],
  commonMistakes: [
    'Running `terraform plan` on the PR and `terraform apply` without the saved plan after merge, so production applies whatever the code says at that moment rather than what was reviewed.',
    'Storing Terraform state locally or in the repository. State can contain secrets and must be in a locked remote backend with restricted access.',
    'Using Complete deployment mode without understanding it deletes every resource in the resource group that is not in the template.',
    'Service connections with a client secret that expires or leaks, instead of workload identity federation.',
    'Treating Azure Automation State Configuration as the go-forward option. New designs should use Azure Machine Configuration, which also covers Arc-enabled servers.',
    'Giving developers Owner on a subscription so they can create test environments, where Azure Deployment Environments would let them self-serve within guardrails.',
  ],
  examTips: [
    'Preview commands: `az deployment group what-if` for Bicep and ARM; `terraform plan` for Terraform. Both belong in the pull request validation.',
    'Terraform remote state on Azure uses the `azurerm` backend in a storage account; locking uses blob leases.',
    'Incremental mode is the default for resource group deployments. Complete mode removes resources not in the template.',
    'Desired state configuration for machines: Azure Machine Configuration (Automanage), assigned through Azure Policy. Azure Automation State Configuration is the legacy option.',
    'Self-service, governed environments for developers: Azure Deployment Environments (dev center, catalog, environment definitions, environment types, projects).',
    'Prefer workload identity federation for service connections and OIDC in GitHub Actions; no stored secret is needed.',
  ],
  summary: [
    'IaC pipelines lint, preview on PR, then apply after approval.',
    'what-if and terraform plan are the reviewable previews.',
    'Terraform needs remote, locked state; Bicep relies on Resource Manager.',
    'Deployment stacks add cleanup and deny settings to Bicep deployments.',
    'Machine Configuration keeps the inside of VMs and Arc servers in the desired state.',
    'Azure Deployment Environments gives developers governed self-service infrastructure.',
  ],
  practice: [
    {
      id: 'az4-iac-pipelines-p1',
      level: 'intermediate',
      prompt:
        'Reviewers want to see which Azure resources a Bicep change will create, modify or delete before approving a pull request. What should the PR pipeline run?',
      answer:
        'az deployment group what-if (or sub/mg/tenant what-if at the right scope) against the target resource group with the same template and parameters that will be deployed.',
      explanation:
        'what-if calls Resource Manager to compare the template with live resources and reports each change without applying it.',
    },
    {
      id: 'az4-iac-pipelines-p2',
      level: 'advanced',
      prompt:
        'Two pipeline runs started terraform apply against the same configuration at the same time and state became inconsistent. What should the backend setup have been?',
      answer:
        'A shared azurerm backend in an Azure Storage blob, which takes a blob lease as a state lock so the second run waits or fails instead of writing concurrently. Pair it with an exclusive lock check or concurrency group in the pipeline.',
      explanation:
        'Local or unlocked state allows concurrent writers; the azurerm backend locks with leases.',
    },
    {
      id: 'az4-iac-pipelines-p3',
      level: 'intermediate',
      prompt:
        'You must ensure a registry setting is enforced inside all Windows VMs in Azure and on-premises Arc-enabled servers, with drift corrected automatically. Which service do you use?',
      answer:
        'Azure Machine Configuration (Automanage Machine Configuration), with a package in ApplyAndAutoCorrect mode assigned through an Azure Policy definition.',
      explanation:
        'Machine Configuration works for Azure VMs and Arc-enabled servers and is the successor to Automation State Configuration.',
    },
    {
      id: 'az4-iac-pipelines-p4',
      level: 'advanced',
      prompt:
        'Developers need to spin up a full test copy of an app for each feature branch without having rights on the subscription, using templates the platform team controls. What fits?',
      answer:
        'Azure Deployment Environments: the platform team publishes environment definitions in a catalog on a dev center and allows a Dev environment type for the project; developers or pipelines create environments from those definitions.',
      explanation:
        'Environment types map to subscriptions and identities, so developers get self-service without direct permissions.',
    },
  ],
  lab: {
    title: 'Bicep what-if and deploy from a pipeline',
    scenario:
      'Create a resource group and a workload identity federation service connection, then build a pipeline that runs what-if on every change and deploys after an approval.',
    prerequisites: [
      'An Azure subscription and an Azure DevOps project',
      'Permission to create a service connection with workload identity federation (automatic)',
      'Azure CLI 2.60 or later with Bicep',
    ],
    tasks: [
      { instruction: 'Create resource group rg-iac-lab in your preferred region.' },
      {
        instruction:
          'Create an Azure Resource Manager service connection sc-iac-lab using workload identity federation (automatic), scoped to rg-iac-lab.',
      },
      {
        instruction:
          'Commit infra/main.bicep with a storage account and infra/lab.bicepparam, and run az deployment group what-if locally to see the Create result.',
      },
      {
        instruction:
          'Create an environment iac-lab with an Approvals check, and a pipeline with a Preview stage (what-if) and a Deploy stage (deployment job to iac-lab).',
      },
      {
        instruction:
          'Run the pipeline, read the what-if output in the log, approve, and let it deploy.',
      },
      {
        instruction:
          'Change the SKU in the template, run again, and confirm what-if shows a Modify for the storage account.',
      },
    ],
    solution: [
      {
        title: 'Setup and local what-if',
        language: 'bash',
        code: `az group create -n rg-iac-lab -l westeurope
az deployment group what-if -g rg-iac-lab \\
  --template-file infra/main.bicep --parameters infra/lab.bicepparam`,
      },
      {
        title: 'infra/lab.bicepparam',
        language: 'bicep',
        code: `using './main.bicep'

param environmentName = 'dev'`,
      },
      {
        title: 'azure-pipelines.yml',
        language: 'yaml',
        code: `trigger:
  - main

pool:
  vmImage: ubuntu-latest

stages:
  - stage: Preview
    jobs:
      - job: WhatIf
        steps:
          - task: AzureCLI@2
            inputs:
              azureSubscription: sc-iac-lab
              scriptType: bash
              scriptLocation: inlineScript
              inlineScript: |
                az deployment group what-if -g rg-iac-lab \\
                  --template-file infra/main.bicep --parameters infra/lab.bicepparam
  - stage: Deploy
    jobs:
      - deployment: Deploy
        environment: iac-lab
        strategy:
          runOnce:
            deploy:
              steps:
                - checkout: self
                - task: AzureCLI@2
                  inputs:
                    azureSubscription: sc-iac-lab
                    scriptType: bash
                    scriptLocation: inlineScript
                    inlineScript: |
                      az deployment group create -g rg-iac-lab \\
                        --template-file infra/main.bicep --parameters infra/lab.bicepparam \\
                        --name lab-$(Build.BuildId)`,
      },
    ],
    verification: [
      {
        command: 'az deployment group list -g rg-iac-lab -o table',
        what: 'Shows the pipeline deployments.',
        expected: 'lab-<buildId> with state Succeeded.',
      },
      {
        command:
          'az storage account list -g rg-iac-lab --query "[].{name:name,sku:sku.name}" -o table',
        what: 'Confirms the storage account and its SKU after each run.',
      },
    ],
    cleanup: [
      {
        command: 'az group delete -n rg-iac-lab --yes --no-wait',
        what: 'Deletes the lab resource group and everything in it. Delete the service connection and environment in Azure DevOps too.',
      },
    ],
  },
  relatedTopicIds: [
    'az4-environments-approvals',
    'az4-pipeline-templates',
    'az4-pipeline-security',
    'az4-github-actions',
  ],
  docs: [
    {
      title: 'Bicep deployment what-if',
      url: 'https://learn.microsoft.com/azure/azure-resource-manager/bicep/deploy-what-if',
    },
    {
      title: 'Deployment stacks',
      url: 'https://learn.microsoft.com/azure/azure-resource-manager/bicep/deployment-stacks',
    },
    {
      title: 'Store Terraform state in Azure Storage',
      url: 'https://learn.microsoft.com/azure/developer/terraform/store-state-in-azure-storage',
    },
    {
      title: 'Azure Machine Configuration overview',
      url: 'https://learn.microsoft.com/azure/governance/machine-configuration/overview',
    },
    {
      title: 'What is Azure Deployment Environments?',
      url: 'https://learn.microsoft.com/azure/deployment-environments/overview-what-is-azure-deployment-environments',
    },
  ],
}
