import type { InterviewQuestion } from '../../../types'

/** Azure Bicep questions and the File Share backup project. */
export const myAzureBicepQuestions: InterviewQuestion[] = [
  {
    id: 'itv-myaz-64',
    level: 'basic',
    kind: 'open',
    prompt: 'What is Azure Bicep?',
    probing:
      'That Bicep is a declarative ARM language that compiles to ARM JSON with no state file, and how you run it safely.',
    answer: [
      "Bicep is Microsoft's declarative language for deploying Azure Resource Manager (ARM) resources. I describe the Azure state I want, and ARM figures out the dependency order and does the idempotent create/update work — meaning it's safe to run the same deployment again.",
      "Bicep compiles down to an ARM JSON template, so it uses the same Azure resource APIs. There's no separate state file to manage.",
      'I keep Bicep in Git, validate it and run what-if in CI, and deploy with an identity that has only the access it needs. Afterward I check the Azure Activity Log, the deployment output, policy compliance, and resource health.',
    ],
    code: [
      {
        title: 'Storage account in Bicep',
        language: 'bicep',
        code: `param location string = resourceGroup().location

resource storage 'Microsoft.Storage/storageAccounts@2023-05-01' = {
  name: 'st\${uniqueString(resourceGroup().id)}'
  location: location
  sku: { name: 'Standard_LRS' }
  kind: 'StorageV2'
  properties: {
    supportsHttpsTrafficOnly: true
    minimumTlsVersion: 'TLS1_2'
  }
}`,
      },
    ],
    tags: ['bicep', 'iac'],
  },
  {
    id: 'itv-myaz-65',
    level: 'basic',
    kind: 'open',
    prompt: 'Why use Bicep instead of raw ARM templates?',
    probing: 'The concrete authoring benefits over ARM JSON and a fair comparison with Terraform.',
    answer: [
      'Bicep is more concise and easier to read than ARM JSON. It gives you type checking, IntelliSense, symbolic references, modules, loops, and conditions, along with simpler expressions — all while keeping full ARM deployment capability underneath.',
      "For example, referencing `storage.id` creates an implicit dependency automatically. In raw JSON I'd usually need a verbose resource ID and an explicit `dependsOn`. Bicep can also decompile existing ARM templates, which helps with migration.",
      "I choose Bicep for Azure-only infrastructure, when the team wants native ARM integration and doesn't need external state. I'd consider Terraform instead when one workflow has to manage multiple cloud providers, or when its module and provider ecosystem is what the team needs.",
      'The right choice depends on scope, team skills, governance, and whatever platform standards already exist.',
    ],
    tags: ['bicep', 'arm', 'terraform'],
  },
  {
    id: 'itv-myaz-66',
    level: 'basic',
    kind: 'open',
    prompt: 'What is the basic structure of a Bicep file?',
    probing:
      'Parameters, variables, resources, modules and outputs, and why secrets never go in outputs.',
    answer: [
      'A Bicep file commonly has metadata, parameters, variables, resource declarations, modules, and outputs.',
      "Parameters are the deployment's inputs. Variables calculate internal values. Resources declare the actual Azure objects. Modules let you reuse other Bicep files, and outputs expose non-sensitive results. I avoid putting secrets in outputs, because deployment history can retain them.",
    ],
    code: [
      {
        title: 'Parameters, variables, a resource and an output',
        language: 'bicep',
        code: `@description('Deployment environment')
@allowed(['dev', 'prod'])
param environment string

var tags = {
  environment: environment
  managedBy: 'bicep'
}

resource logWorkspace 'Microsoft.OperationalInsights/workspaces@2023-09-01' = {
  name: 'log-\${environment}'
  location: resourceGroup().location
  tags: tags
  properties: {}
}

output workspaceId string = logWorkspace.id`,
      },
    ],
    tags: ['bicep'],
  },
  {
    id: 'itv-myaz-67',
    level: 'intermediate',
    kind: 'open',
    prompt: 'What are Bicep modules?',
    probing:
      'Focused, versioned modules with clear inputs and outputs, published to a registry and pinned.',
    answer: [
      'A module is a reusable Bicep file that gets deployed from another Bicep file. I use modules to keep networking, monitoring, compute, and application resources separate, each with a clear set of inputs and outputs.',
      'Modules can be published to a private Bicep registry in Azure Container Registry and versioned there. I keep each module focused on one job, validate its parameters, document its outputs, pin the published version I use, and test breaking changes in a lower environment first.',
      'I avoid building one large module full of unrelated, conditional resources — it quickly becomes hard to own and unsafe to change.',
    ],
    code: [
      {
        title: 'Calling a module',
        language: 'bicep',
        code: `module network './modules/network.bicep' = {
  name: 'network-\${environment}'
  params: {
    environment: environment
    addressPrefix: '10.20.0.0/16'
  }
}`,
      },
    ],
    tags: ['bicep', 'modules'],
  },
  {
    id: 'itv-myaz-68',
    level: 'intermediate',
    kind: 'open',
    prompt: 'How do you pass values between Bicep modules?',
    probing:
      'Outputs feeding parameters with implicit dependencies, and when to reference an existing resource instead.',
    answer: [
      'The producing module declares an output, and the parent passes that output into another module as a parameter. This creates an implicit dependency between them.',
      "I pass stable values like resource IDs, names, or endpoints — not entire sensitive objects. If two modules belong to different deployment lifecycles, I'd rather look up an existing resource by ID or name, or use an approved configuration output, than couple every deployment into one giant template.",
    ],
    code: [
      {
        title: 'Module output passed to another module',
        language: 'bicep',
        code: `module network './network.bicep' = {
  name: 'network'
  params: { location: location }
}

module app './app.bicep' = {
  name: 'app'
  params: {
    subnetId: network.outputs.appSubnetId
  }
}`,
      },
    ],
    tags: ['bicep', 'modules'],
  },
  {
    id: 'itv-myaz-69',
    level: 'intermediate',
    kind: 'open',
    prompt: 'How do you deploy a Bicep file?',
    probing:
      'Build, validate, what-if and create with the Azure CLI, and the review and identity around a production deploy.',
    answer: [
      'CI runs lint/build, validation, policy and security checks, and what-if. A reviewer approves the production diff, and a workload identity does the actual deploy.',
      'Afterward I check the deployment operations, policy results, resource health, diagnostics, and run an application smoke test.',
    ],
    code: [
      {
        title: 'For resource-group scope',
        language: 'bash',
        code: `az bicep build --file main.bicep
az deployment group validate \\
  --resource-group rg-app-prod \\
  --template-file main.bicep \\
  --parameters @prod.bicepparam
az deployment group what-if \\
  --resource-group rg-app-prod \\
  --template-file main.bicep \\
  --parameters @prod.bicepparam
az deployment group create \\
  --name app-$(date +%Y%m%d%H%M%S) \\
  --resource-group rg-app-prod \\
  --template-file main.bicep \\
  --parameters @prod.bicepparam`,
      },
    ],
    tags: ['bicep', 'azure cli', 'deployment'],
  },
  {
    id: 'itv-myaz-70',
    level: 'intermediate',
    kind: 'open',
    prompt: 'How do you handle different environments in Bicep?',
    probing:
      'Shared modules with `.bicepparam` files, separate scopes and identities, and restraint with conditions.',
    answer: [
      'I keep the reusable modules common across environments, and use `.bicepparam` files or pipeline inputs for anything environment-specific and non-secret.',
      'Dev and production deploy to separate resource groups or subscriptions, with separate identities and approvals. I only add conditions for genuinely optional capabilities — not to pile up environment checks until the template becomes hard to follow.',
      'Secrets come from Key Vault or a secure deployment input, never from a plain parameter.',
      'The pipeline renders what-if for each environment, checks Azure Policy, and promotes the same module version through each stage. Post-deployment checks confirm tags, networking, diagnostics, capacity, and that the application actually behaves correctly.',
    ],
    code: [
      {
        title: 'prod.bicepparam',
        language: 'bicep',
        code: `using './main.bicep'

param environment = 'prod'
param skuName = 'P1v3'
param instanceCount = 3`,
      },
    ],
    tags: ['bicep', 'environments'],
  },
  {
    id: 'itv-myaz-71',
    level: 'intermediate',
    kind: 'open',
    prompt: 'How do you secure secrets in Bicep deployments?',
    probing:
      '`@secure()` parameters, not outputting secrets, and ideally not handling the secret value at all.',
    answer: [
      "I mark secret parameters with `@secure()` so the values don't show up in normal deployment history, and I avoid outputting them.",
      'Ideally, the workload uses a managed identity and pulls secrets from Key Vault directly. That way Bicep only deploys the identity, the role assignment, and the secret reference — it never handles the secret value itself.',
      'CI authenticates with workload identity federation, and only reads protected values when a resource API genuinely requires them. I check what-if output, logs, parameter files, outputs, and generated templates for any leakage. Key Vault access follows least privilege — only the permissions actually needed — plus private networking where required, audit logging, rotation, and recovery protection.',
    ],
    code: [
      {
        title: 'Secure parameter',
        language: 'bicep',
        code: `@secure()
param administratorPassword string`,
      },
    ],
    tags: ['bicep', 'secrets', 'key vault'],
  },
  {
    id: 'itv-myaz-72',
    level: 'intermediate',
    kind: 'open',
    prompt: 'What is the difference between `existing` resources and new resources in Bicep?',
    probing:
      'That `existing` only references a resource, the permissions it needs, and that it does not import the resource.',
    answer: [
      "A normal `resource` declaration tells ARM to create or manage that resource. An `existing` declaration just references a resource that's already there, without redeploying it.",
      "The deployment identity needs read access to that referenced scope. If the name or scope is wrong, the deployment fails once it tries to evaluate the resource's properties.",
      "`existing` is useful when a network or Key Vault has a separate owner and lifecycle. It doesn't import that resource into your current deployment for you to modify.",
    ],
    code: [
      {
        title: 'Referencing an existing VNet in another scope',
        language: 'bicep',
        code: `resource existingVnet 'Microsoft.Network/virtualNetworks@2023-11-01' existing = {
  name: 'vnet-hub-prod'
  scope: resourceGroup('network-subscription-id', 'rg-hub')
}

output hubVnetId string = existingVnet.id`,
      },
    ],
    tags: ['bicep'],
  },
  {
    id: 'itv-myaz-73',
    level: 'intermediate',
    kind: 'open',
    prompt: 'What deployment scopes does Bicep support?',
    probing:
      'The four scopes, `targetScope`, and keeping high-privilege governance deployments separate.',
    answer: [
      'Bicep supports resource group, subscription, management group, and tenant scopes, set using `targetScope`. The scope you choose controls which resource types are available and which deployment command you use.',
      'Subscription scope can create resource groups and policy assignments. Management-group and tenant deployments support broader governance work. I use the narrowest scope that gets the job done, and keep high-privilege governance deployments separate from application deployments.',
      'Cross-scope modules make ownership clear.',
    ],
    code: [
      {
        title: 'Subscription-scope deployment creating a resource group',
        language: 'bicep',
        code: `targetScope = 'subscription'

param location string

resource rg 'Microsoft.Resources/resourceGroups@2024-03-01' = {
  name: 'rg-app-prod'
  location: location
}`,
      },
    ],
    tags: ['bicep', 'scope'],
  },
  {
    id: 'itv-myaz-74',
    level: 'intermediate',
    kind: 'open',
    prompt: 'How do you validate a Bicep deployment before applying it?',
    probing:
      'Layered validation from lint to what-if to a lower environment, and the limits of what-if.',
    answer: [
      'My validation layers are:',
      "1. The editor's Bicep linter and `az bicep build` for compile and type errors.\n2. `az deployment ... validate` for ARM-level validation.\n3. `what-if` to see the expected create, modify, and delete changes.\n4. Azure Policy and security checks.\n5. A test deployment in a lower environment, followed by functional checks.",
      "I pay close attention to deletions, replacements, role assignments, network rules, SKUs, and any properties that what-if can't fully predict. What-if is a useful change artifact to review, but it doesn't replace backups, a staged rollout, or a service-specific recovery plan.",
    ],
    tags: ['bicep', 'what-if', 'validation'],
  },
  {
    id: 'itv-myaz-75',
    level: 'advanced',
    kind: 'scenario',
    prompt: 'How do you troubleshoot Bicep deployment failures?',
    probing:
      'Going to the failed deployment operation, a checklist of common causes, and never blindly redeploying over a partial failure.',
    answer: [
      'I start with the failed deployment operation itself, not just the top-level error message:',
      'I check the error code, resource name, API version, permissions, any policy denial, quota, region/SKU availability, dependency output, naming constraints, and the Activity Log. I try to reproduce the issue through validate/what-if using the same parameters.',
      "Once I've fixed the root cause, I rerun what-if and confirm there's no unintended delete or replacement. ARM deployments can partially create resources before failing, so I check the actual state rather than blindly redeploying or manually deleting resources.",
      'I validate resource health and the dependent application once the deployment succeeds.',
    ],
    followUps: [
      'What do you do when a deployment partially created resources before failing?',
      'How do you tell a policy denial from a permissions error?',
    ],
    code: [
      {
        title: 'Inspect the failed deployment and its operations',
        language: 'bash',
        code: `az deployment group show -g rg-app-prod -n <deployment-name>
az deployment operation group list \\
  -g rg-app-prod -n <deployment-name> -o table`,
      },
    ],
    tags: ['bicep', 'troubleshooting'],
  },
  {
    id: 'itv-myaz-76',
    level: 'advanced',
    kind: 'open',
    prompt: 'How do you automate Azure File Share backup with Bicep?',
    probing:
      'The resources involved in Azure Files backup, a what-if-first deployment, and proving the backup with a real restore.',
    answer: [
      'This project sets up and protects an Azure File Share using repeatable infrastructure code. The steps are:',
      '1. Create or reference a Storage Account and File Share.\n2. Create a Recovery Services vault in a supported region.\n3. Register the Storage Account with the vault.\n4. Define an Azure Files backup policy with the schedule and retention you need.\n5. Create the protected item that links the File Share to the policy.\n6. Deploy with Azure CLI, then check both the protection status and that a restore point exists.',
      "**Deployment flow:** Before this goes to production, I check a few things: the region and API version are supported, soft delete is on, immutability is set where it's required, networking is private, and the deployment identity has only the access it needs. I also plan for retention and cost, set up alerts for backup failures, and run restore tests on a regular schedule.",
      "A successful deployment doesn't prove the backup can actually be restored. I always test a real restore into an isolated location to be sure.",
    ],
    followUps: [
      'How do you prove the backup can actually be restored?',
      'Which backup settings protect against a malicious delete?',
    ],
    code: [
      {
        title: 'Minimal Recovery Services vault',
        language: 'bicep',
        code: `param location string = resourceGroup().location
param vaultName string

resource vault 'Microsoft.RecoveryServices/vaults@2023-08-01' = {
  name: vaultName
  location: location
  sku: {
    name: 'RS0'
    tier: 'Standard'
  }
  properties: {}
}`,
      },
      {
        title: 'What-if then deploy',
        language: 'bash',
        code: `az deployment group what-if \\
  --resource-group <resource-group> \\
  --template-file main.bicep \\
  --parameters vaultName=<vault-name>

az deployment group create \\
  --resource-group <resource-group> \\
  --template-file main.bicep \\
  --parameters vaultName=<vault-name>`,
      },
    ],
    tags: ['bicep', 'azure backup', 'azure files'],
  },
]
