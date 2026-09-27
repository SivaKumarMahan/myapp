import type { InterviewQuestion } from '../../../types'

/** Bicep in depth: modules, parameters, loops, stacks, template specs and registries. */
export const azureIacBicepQuestions: InterviewQuestion[] = [
  {
    id: 'itv-aziac-7',
    level: 'intermediate',
    kind: 'open',
    prompt:
      'Walk me through the Bicep features you use most: modules, parameters and parameter files, loops, conditions and existing resources.',
    probing:
      'Hands-on Bicep fluency. They want each feature with a reason for using it, and correct syntax.',
    answer: [
      '**Parameters** are the inputs, with types and decorators - `@allowed`, `@minLength`, `@description`, and `@secure()` for secrets, which keeps the value out of logs and deployment history. I put values per environment in **`.bicepparam`** files, which are type-checked against the template through a `using` statement - much nicer than the older JSON parameter files.',
      '**Modules** are other Bicep files called like functions, with their own parameters and outputs. Each module call becomes a nested deployment, so modules are how I split a workload into network, data and app pieces, and how I reach other scopes.',
      '**Loops** use `for` expressions to create several resources or module instances from an array or a range - `[for subnet in subnets: {...}]` - with an index available if needed and `@batchSize` to deploy them serially. **Conditions** use `if (deployBastion)` on a resource or module to deploy it only when needed, which is the idiomatic way to vary environments.',
      "**Existing** declares a reference to a resource that is already there - `resource kv 'Microsoft.KeyVault/vaults@...' existing = { name: kvName }` - so I can read its properties, use it as a `parent` or `scope`, or pass a secret from it into a module with `getSecret`, without redeploying it. Dependencies are mostly **implicit**: referencing another resource’s symbolic name creates the dependency, so explicit `dependsOn` is rarely needed.",
    ],
    code: [
      {
        title: 'Parameters, a loop, a condition and an existing resource',
        language: 'bicep',
        code: `@description('Environment short name')
@allowed([ 'dev', 'test', 'prod' ])
param env string

param location string = resourceGroup().location
param subnets array = [
  { name: 'app', prefix: '10.20.1.0/24' }
  { name: 'data', prefix: '10.20.2.0/24' }
]
param deployBastion bool = false
param keyVaultName string

resource vnet 'Microsoft.Network/virtualNetworks@2024-01-01' = {
  name: 'vnet-orders-\${env}'
  location: location
  properties: {
    addressSpace: { addressPrefixes: [ '10.20.0.0/16' ] }
    subnets: [for s in subnets: {
      name: 'snet-\${s.name}'
      properties: { addressPrefix: s.prefix }
    }]
  }
}

module bastion 'modules/bastion.bicep' = if (deployBastion) {
  name: 'bastion'
  params: { vnetId: vnet.id, location: location }   // implicit dependency on vnet
}

resource kv 'Microsoft.KeyVault/vaults@2023-07-01' existing = {
  name: keyVaultName
}

module sql 'modules/sql.bicep' = {
  name: 'sql'
  params: {
    location: location
    adminPassword: kv.getSecret('sql-admin-password')   // only into a @secure() param
  }
}

output vnetId string = vnet.id`,
      },
      {
        title: 'A typed .bicepparam file per environment',
        language: 'bicep',
        code: `using './main.bicep'

param env = 'prod'
param deployBastion = true
param keyVaultName = 'kv-orders-prod'
param subnets = [
  { name: 'app', prefix: '10.20.1.0/24' }
  { name: 'data', prefix: '10.20.2.0/24' }
  { name: 'pe', prefix: '10.20.3.0/24' }
]`,
      },
    ],
    traps: [
      'Adding `dependsOn` everywhere instead of letting symbolic references create dependencies.',
      'Outputting a secret, which stores it in plain text in the deployment history.',
      'Using `existing` for a resource in another resource group without setting `scope`.',
    ],
    followUps: [
      'Why should secrets never be outputs?',
      'When do you still need an explicit dependsOn?',
      'How do user-defined types improve parameters?',
    ],
    tags: ['bicep', 'modules', 'parameters', 'loops'],
  },
  {
    id: 'itv-aziac-8',
    level: 'advanced',
    kind: 'open',
    prompt:
      'What are deployment stacks, and how do they compare with complete mode and resource locks?',
    probing:
      'The modern Bicep lifecycle answer. They want managed-resource tracking, action on unmanage, and deny settings explained properly.',
    answer: [
      'A **deployment stack** is an Azure resource that wraps a deployment and **remembers which resources it created**. That gives Bicep something it never had: a record of what it manages, without a state file you look after yourself.',
      'Two settings make it useful. **Action on unmanage** decides what happens when you redeploy the stack without a resource that used to be in it: `detachAll` leaves it in Azure but stops managing it, `deleteResources` deletes the removed resources, and `deleteAll` deletes removed resources and resource groups. So removing a resource from Bicep can finally remove it from Azure - and only resources the stack itself created, which is the big improvement over complete mode.',
      '**Deny settings** put a deny assignment on the managed resources: `denyDelete` or `denyWriteAndDelete`. People with Contributor or even Owner cannot change or delete them outside the stack, which stops portal drift at the source. You can exclude specific principals or actions - the pipeline identity, a break-glass group.',
      'Compared with the alternatives: **complete mode** deletes anything in the resource group the template does not list, whoever created it. **Resource locks** block deletion or writes for everyone, including your own pipeline, and can be removed by anyone with Owner. Stacks are scoped to what they manage and can exempt the deployer, so they are the better default for Bicep estates.',
    ],
    diagrams: [
      {
        kind: 'decision',
        title: 'Stacks, complete mode or locks?',
        caption:
          'Stacks delete only what they created and can block drift without blocking the pipeline.',
        question: 'What do you need to control?',
        branches: [
          {
            condition: 'Remove resources dropped from Bicep',
            result: 'Stack with deleteResources',
            detail: 'Only resources the stack created',
            tone: 'success',
          },
          {
            condition: 'Stop portal edits and deletes',
            result: 'Stack deny settings',
            detail: 'Exclude the pipeline identity',
            tone: 'success',
          },
          {
            condition: 'Make a group exactly match a file',
            result: 'Complete mode',
            detail: 'Deletes anything unlisted - risky',
            tone: 'warning',
          },
          {
            condition: 'Block deletion by everyone',
            result: 'CanNotDelete lock',
            detail: 'Also blocks your own pipeline',
          },
        ],
      },
    ],
    code: [
      {
        title: 'Create or update a stack with deny settings',
        language: 'bash',
        code: `az stack group create --name orders-prod -g rg-orders-prod \\
  --template-file main.bicep --parameters main.bicepparam \\
  --action-on-unmanage deleteResources \\
  --deny-settings-mode denyWriteAndDelete \\
  --deny-settings-excluded-principals <pipeline-principal-id> \\
  --yes

# What does the stack manage?
az stack group show --name orders-prod -g rg-orders-prod \\
  --query "resources[].{id:id, status:status, denyStatus:denyStatus}" -o table`,
        placeholders: ['<pipeline-principal-id>'],
      },
    ],
    deeper: [
      'Stacks can be created at resource group, subscription and management group scope. A subscription-scope stack can manage the resource groups it creates, which is how you get a clean "delete this environment" operation.',
      'Deny assignments are a different mechanism from RBAC role assignments: they override allows, so even Owner is blocked. That is exactly why excluding the deploying identity and a break-glass group matters - otherwise the next deployment or the next emergency is blocked too.',
      'Changing `actionOnUnmanage` to delete on an existing stack is itself risky; run the update with what-if style review and check the list of resources that will be removed.',
    ],
    traps: [
      'Using `deleteAll` without realising it can delete whole resource groups.',
      'Turning on `denyWriteAndDelete` without excluding the pipeline identity or a break-glass group.',
      'Assuming a stack protects resources it did not create.',
    ],
    followUps: [
      'How would you adopt existing resources into a stack?',
      'What happens to a stack’s resources if the stack is deleted?',
    ],
    tags: ['bicep', 'deployment stacks', 'deny settings', 'lifecycle'],
  },
  {
    id: 'itv-aziac-9',
    level: 'intermediate',
    kind: 'open',
    prompt:
      'How would you share Bicep modules across teams? Compare template specs and a Bicep registry.',
    probing: 'Reuse at scale: versioning, access control, and awareness of Azure Verified Modules.',
    answer: [
      '**Template specs** store a compiled ARM template as an Azure resource, with versions, in a resource group. Access is controlled by RBAC, so you can let a whole organisation read them, and they can be deployed directly from the portal or CLI - which makes them good for "golden" deployable templates that ops teams or the portal use.',
      'A **Bicep registry** is an Azure Container Registry that stores Bicep modules as OCI artifacts. You `az bicep publish` a module with a version tag and consume it with `br:` syntax in any Bicep file. That fits the developer workflow better: modules are composed at authoring time, the tag is pinned in code, and upgrades are pull requests.',
      'For most platform teams I would use a **private Bicep registry** for internal modules, with semantic version tags, CI that lints and tests each module before publishing, and read access for everyone. I would also start from **Azure Verified Modules** - Microsoft’s published, tested modules in the public registry (`br/public:avm/...`) - rather than writing a storage account module from scratch.',
      'Template specs still earn their place for deployable blueprints consumed outside code, such as a portal form for requesting a standard environment.',
    ],
    code: [
      {
        title: 'Publish to a private registry and consume by version',
        language: 'bash',
        code: `az bicep publish --file modules/storage.bicep \\
  --target br:<acr>.azurecr.io/bicep/modules/storage:1.3.0 \\
  --documentation-uri https://wiki.contoso.com/bicep/storage

# Template spec alternative
az ts create -g rg-templates -n app-landing --version 2.0.0 \\
  --template-file blueprints/app-landing.bicep
az deployment group create -g <rg> \\
  --template-spec $(az ts show -g rg-templates -n app-landing --version 2.0.0 --query id -o tsv)`,
        placeholders: ['<acr>', '<rg>'],
      },
      {
        title: 'Consuming private and verified modules',
        language: 'bicep',
        code: `module storage 'br:<acr>.azurecr.io/bicep/modules/storage:1.3.0' = {
  name: 'storage'
  params: { name: 'stordersprod', sku: 'Standard_ZRS' }
}

module kv 'br/public:avm/res/key-vault/vault:0.9.0' = {
  name: 'kv'
  params: {
    name: 'kv-orders-prod'
    enablePurgeProtection: true
    enableRbacAuthorization: true
  }
}`,
        placeholders: ['<acr>'],
      },
    ],
    traps: [
      'Consuming modules by a mutable tag like latest, so builds change underneath you.',
      'Writing every module in-house when a verified one exists.',
    ],
    followUps: [
      'How would you test a module before publishing it?',
      'How do you roll out a breaking module change?',
    ],
    tags: ['bicep', 'modules', 'template specs', 'registry', 'reuse'],
  },
  {
    id: 'itv-aziac-10',
    level: 'advanced',
    kind: 'open',
    prompt: 'How do you handle secrets and sensitive values in Bicep deployments?',
    probing:
      'Security in IaC. They want @secure, getSecret, no secret outputs, and ideally identity-based designs that avoid secrets altogether.',
    answer: [
      'The first principle is the same as anywhere: prefer designs with **no secret at all**. Managed identities and Entra authentication for SQL, Storage, Key Vault and Service Bus mean there is no password to pass. Most of my Bicep wires up identities and role assignments rather than secrets.',
      'When a secret is unavoidable - a SQL admin password on creation, a third-party API key - it goes in a parameter marked **`@secure()`**. ARM then does not log it or keep it in the deployment history. The value comes from **Key Vault**, either with `getSecret()` on an `existing` vault passed into a module’s secure parameter, or with `az.getSecret()` in a `.bicepparam` file, so it never sits in the repository or the pipeline variables.',
      'The important don’ts: never **output** a secret - outputs are stored in plain text in the deployment record and visible to anyone with read access on the resource group. Never put a secret in a non-secure parameter or a tag. And avoid `listKeys()` feeding values into app settings where a Key Vault reference or managed identity would work.',
      'For app configuration, I deploy **Key Vault references** in App Service or Container Apps settings, so the platform fetches the secret at runtime using the app’s identity, and rotating the secret needs no redeployment.',
    ],
    code: [
      {
        title: 'Secret flow in Bicep without exposing it',
        language: 'bicep',
        code: `// main.bicep
param kvName string
resource kv 'Microsoft.KeyVault/vaults@2023-07-01' existing = {
  name: kvName
}

module sql 'modules/sql.bicep' = {
  name: 'sql'
  params: { adminPassword: kv.getSecret('sql-admin') }
}

// modules/sql.bicep
@secure()
param adminPassword string

resource server 'Microsoft.Sql/servers@2023-08-01-preview' = {
  name: 'sql-orders-prod'
  location: resourceGroup().location
  properties: {
    administratorLogin: 'sqladmin'
    administratorLoginPassword: adminPassword
    minimalTlsVersion: '1.2'
  }
}

// WRONG: output adminPassword string = adminPassword  (the linter warns on this)`,
      },
      {
        title: 'App setting as a Key Vault reference',
        language: 'bicep',
        code: `resource app 'Microsoft.Web/sites@2023-12-01' = {
  name: 'app-orders-prod'
  location: resourceGroup().location
  identity: { type: 'SystemAssigned' }
  properties: {
    serverFarmId: plan.id
    siteConfig: {
      appSettings: [
        {
          name: 'PartnerApiKey'
          value: '@Microsoft.KeyVault(VaultName=\${kvName};SecretName=partner-api-key)'
        }
      ]
    }
  }
}`,
      },
    ],
    deeper: [
      'Using `getSecret` requires the deploying identity to have the Key Vault property `enabledForTemplateDeployment` set, or the appropriate RBAC data-plane role, depending on the vault’s authorization model. Missing that is a common first-deploy failure.',
      'The Bicep linter has rules for secrets in outputs and in non-secure parameters; running `az bicep lint` in CI with warnings treated as errors enforces this cheaply.',
    ],
    traps: [
      'Outputting a connection string with a key in it.',
      'Passing a password from a pipeline variable into a non-secure parameter.',
      'Using `listKeys()` to inject storage keys into app settings when managed identity would work.',
    ],
    followUps: [
      'Where can someone see deployment outputs?',
      'How do Key Vault references handle rotation?',
    ],
    tags: ['bicep', 'secrets', 'key vault', 'security'],
  },
  {
    id: 'itv-aziac-11',
    level: 'basic',
    kind: 'multi',
    prompt: 'Which of these statements about Bicep are true?',
    options: [
      {
        id: 'a',
        text: 'Referencing another resource’s symbolic name creates an implicit dependency',
      },
      {
        id: 'b',
        text: 'Bicep keeps a state file in the resource group to track managed resources',
      },
      {
        id: 'c',
        text: 'az bicep decompile converts an ARM JSON template into Bicep as a starting point',
      },
      { id: 'd', text: 'A resource declared with the existing keyword is redeployed on every run' },
      { id: 'e', text: 'Bicep supports new resource types and API versions as soon as ARM does' },
    ],
    correct: ['a', 'c', 'e'],
    probing: 'Quick check of Bicep fundamentals and two common misconceptions.',
    answer: [
      'True: symbolic references create **implicit dependencies**, so ARM orders the deployment correctly without `dependsOn`. `az bicep decompile` turns ARM JSON into Bicep - a best-effort starting point that usually needs tidying. And because Bicep compiles to ARM, any resource type and API version ARM supports is usable immediately, even before the type definitions catch up (you get a warning, not an error).',
      'False: Bicep has **no state file** - deployment stacks add managed-resource tracking as an Azure resource, but that is not a state file. And `existing` only **references** a resource; nothing is deployed for it.',
    ],
    code: [
      {
        title: 'Decompile and tidy',
        language: 'bash',
        code: `az group export -g <rg> > exported.json      # current resources as ARM JSON
az bicep decompile --file exported.json         # writes exported.bicep
az bicep lint --file exported.bicep              # then clean up names and params`,
        placeholders: ['<rg>'],
      },
    ],
    traps: ['Treating decompiled or exported templates as production-ready.'],
    followUps: ['What typically needs fixing after a decompile?'],
    tags: ['bicep', 'fundamentals'],
  },
]
