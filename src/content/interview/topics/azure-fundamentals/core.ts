import type { InterviewQuestion } from '../../../types'

/** The platform itself: geography, the resource hierarchy, ARM and resource providers. */
export const azureFundamentalsCoreQuestions: InterviewQuestion[] = [
  {
    id: 'itv-azf-1',
    level: 'basic',
    kind: 'open',
    prompt: 'Explain Azure regions, availability zones and region pairs. How do they relate?',
    probing:
      'The opener in almost every Azure round. They want the physical model in the right order, and whether you know zones and pairs protect against different failures.',
    answer: [
      'A **region** is a set of datacenters in one metro area, connected by a low-latency network - `westeurope`, `uksouth`, `eastus2`. You deploy almost everything into a region, and that choice drives latency, data residency, price and which services are available.',
      'Many regions are split into **availability zones**: typically three physically separate locations inside the region, each with its own power, cooling and network. Zones are close enough for synchronous replication, so you can spread VMs, AKS nodes or a zone-redundant database across them and survive a whole datacenter failing without losing data.',
      'A **region pair** is a relationship between two regions in the same geography, usually hundreds of kilometres apart - `uksouth` and `ukwest`, for example. Microsoft rolls out platform updates to one side of a pair at a time, prioritises recovering one region of each pair in a wide outage, and some services, such as geo-redundant storage, replicate to the paired region by default.',
      'So zones protect against a **datacenter** failure with near-zero data loss, and a second region protects against a **regional** failure, usually with asynchronous replication and some data loss. A production design typically starts zone-redundant in one region, then adds a second region only if the business case for regional disaster recovery is there.',
    ],
    deeper: [
      'Zone numbers are **logical per subscription**. Zone 1 in your subscription is not necessarily zone 1 in mine, which matters if two subscriptions try to co-locate resources by zone number. The `availabilityZoneMappings` returned by the locations API shows the physical mapping.',
      'Newer regions are often built with zones but **without a pair**. Microsoft now positions pairs as one option rather than the default DR target, so a modern answer is "pick the secondary region by latency, service availability and residency, and use the pair where it helps" rather than "always use the pair".',
      'Not every service is zone-redundant by default. Some are **zonal** (you pin them to zone 1, 2 or 3), some are **zone-redundant** (the platform spreads them), and some are neither. Knowing which is which for your data tier is what makes a zone claim true.',
    ],
    code: [
      {
        title: 'Which regions have zones, and what are they paired with?',
        language: 'bash',
        code: `# Physical regions, their pair and zone support
az account list-locations \\
  --query "[?metadata.regionType=='Physical'].{name:name, pair:metadata.pairedRegion[0].name, zones:length(availabilityZoneMappings || \`[]\`)}" \\
  -o table

# Is a VM size offered in every zone of this region?
az vm list-skus -l uksouth --size Standard_D4s_v5 \\
  --query "[].{sku:name, zones:locationInfo[0].zones, restrictions:restrictions[].reasonCode}" -o json`,
        explanation:
          'A region with no zone mappings cannot host a zone-redundant design, and a restricted SKU in one zone quietly breaks a three-zone VM spread.',
      },
    ],
    diagrams: [
      {
        kind: 'nested',
        title: 'The physical model, outside in',
        caption:
          'Zones defend against a datacenter loss; a second region defends against a regional one.',
        root: {
          label: 'Geography (for example United Kingdom)',
          detail: 'Data residency boundary',
          children: [
            {
              label: 'Region uksouth',
              tone: 'accent',
              children: [
                { label: 'Zone 1', detail: 'One or more datacenters' },
                { label: 'Zone 2', detail: 'Separate power and cooling' },
                { label: 'Zone 3', detail: 'Low-latency links between zones' },
              ],
            },
            {
              label: 'Region ukwest (the pair)',
              detail: 'Staggered updates, recovery priority',
              tone: 'muted',
            },
          ],
        },
      },
    ],
    traps: [
      'Saying an availability zone is a region, or that a region pair is a pair of zones.',
      'Claiming "we are highly available because we deployed to a region with zones" when the resources were never spread across zones.',
      'Assuming every region has a pair and zones. Several do not.',
    ],
    followUps: [
      'Why are zone numbers different between subscriptions?',
      'When would you pick a secondary region that is not the pair?',
      'What does zone-redundant mean for a storage account versus a VM?',
    ],
    tags: ['regions', 'availability zones', 'region pairs', 'fundamentals'],
  },
  {
    id: 'itv-azf-2',
    level: 'basic',
    kind: 'mcq',
    prompt:
      'A business unit owns six subscriptions. You want one Azure Policy assignment to apply to all six, and to any subscription they add later. Where do you assign it?',
    options: [
      { id: 'a', text: 'To each subscription individually, using a script run nightly' },
      { id: 'b', text: 'To a management group that contains the six subscriptions' },
      { id: 'c', text: 'To a resource group in the business unit’s main subscription' },
      { id: 'd', text: 'To the Entra ID tenant through an administrative unit' },
    ],
    correct: ['b'],
    probing:
      'Whether you know the scope hierarchy and that policy and RBAC inherit downward - the whole reason management groups exist.',
    answer: [
      'Assign it to a **management group**. Management groups sit above subscriptions, and anything assigned at that scope - Azure Policy or Azure RBAC - is inherited by every subscription beneath it, including ones moved in later.',
      'Per-subscription assignments work but drift: someone creates a seventh subscription and it has no guardrail until the script catches it. A resource group is too narrow a scope. Administrative units are an Entra ID concept for delegating directory administration over users and groups; they have nothing to do with Azure resources or policy.',
    ],
    code: [
      {
        title: 'Create a management group, move subscriptions in, assign at that scope',
        language: 'bash',
        code: `az account management-group create --name mg-retail --display-name "Retail"
az account management-group subscription add --name mg-retail --subscription <sub-id>

az policy assignment create \\
  --name allowed-locations \\
  --scope /providers/Microsoft.Management/managementGroups/mg-retail \\
  --policy e56962a6-4747-49cd-b67b-bf8b01975c4c \\
  --params '{ "listOfAllowedLocations": { "value": ["uksouth", "ukwest"] } }'`,
        explanation: 'The GUID is the built-in "Allowed locations" policy definition.',
        placeholders: ['<sub-id>'],
      },
    ],
    traps: [
      'Confusing Entra administrative units with management groups - they live in different planes.',
    ],
    followUps: ['How deep can a management group hierarchy go, and why keep it shallow?'],
    tags: ['management groups', 'azure policy', 'governance'],
  },
  {
    id: 'itv-azf-3',
    level: 'basic',
    kind: 'open',
    prompt:
      'Walk me through the Azure resource hierarchy, from the tenant down to a resource. What is each level for?',
    probing:
      'They want to hear that each level is a boundary for something different - identity, billing, access, lifecycle - not just a list of nouns.',
    answer: [
      'At the top is the **Entra ID tenant**, the identity boundary. Every subscription trusts exactly one tenant for authentication. Under it is the **tenant root management group**, and beneath that your own **management groups**, which exist to apply policy and access to many subscriptions at once.',
      'A **subscription** is the billing and scale unit. It has its own invoice line, its own quotas and limits, and it is the most common boundary for separating environments or workloads - production in one subscription, non-production in another.',
      'A **resource group** is a lifecycle container. Everything in it should be created, updated and deleted together - an application’s web app, its database and its Key Vault. Deleting a resource group deletes everything inside it, which is both its power and its danger.',
      'Finally a **resource** is the actual thing - a VM, a storage account, a VNet. Each has a region, though the resource group’s region only stores its metadata; resources inside can live in other regions.',
      'The important property is **inheritance**: RBAC role assignments, Azure Policy assignments and resource locks all flow downward. So I put broad guardrails high, at management groups, and grant access as low and as narrow as I can.',
    ],
    diagrams: [
      {
        kind: 'nested',
        title: 'Each level is a different boundary',
        caption: 'Policy, RBAC and locks inherit downward through every level.',
        root: {
          label: 'Entra ID tenant',
          detail: 'Identity boundary',
          children: [
            {
              label: 'Management group',
              detail: 'Policy and RBAC at scale',
              tone: 'accent',
              children: [
                {
                  label: 'Subscription',
                  detail: 'Billing, quotas, blast radius',
                  children: [
                    {
                      label: 'Resource group',
                      detail: 'Shared lifecycle',
                      children: [{ label: 'Resource', detail: 'VM, VNet, storage account' }],
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
        title: 'See the hierarchy and what is inherited at a scope',
        language: 'bash',
        code: `# The management group tree under the root
az account management-group show --name <tenant-id> --expand --recurse -o jsonc

# Every role assignment that applies to a resource group, including inherited ones
az role assignment list --resource-group rg-shop-prod --include-inherited -o table

# Locks, which also inherit
az lock list --resource-group rg-shop-prod -o table`,
        placeholders: ['<tenant-id>'],
      },
    ],
    traps: [
      'Saying the resource group region constrains where its resources live. It only decides where the metadata is stored.',
      'Treating subscriptions as a security boundary on their own. RBAC is; the subscription just gives you a clean scope to apply it.',
    ],
    followUps: [
      'Can a resource belong to two resource groups?',
      'What happens to role assignments when you move a subscription to another management group?',
      'What does a CanNotDelete lock stop, and what does it not stop?',
    ],
    tags: ['hierarchy', 'subscriptions', 'resource groups', 'management groups'],
  },
  {
    id: 'itv-azf-4',
    level: 'intermediate',
    kind: 'open',
    prompt:
      'What is Azure Resource Manager? Explain the difference between the control plane and the data plane.',
    probing:
      'This distinction explains half of the permission and networking surprises in Azure. They want to know you can reason about where a request goes.',
    answer: [
      'Azure Resource Manager - ARM - is the **single front door for managing resources**. The portal, the CLI, PowerShell, Bicep, Terraform and the SDKs all send requests to the same endpoint, `management.azure.com`. ARM authenticates the caller with Entra ID, checks Azure RBAC and Azure Policy, and then forwards the request to the **resource provider** that owns that type, such as `Microsoft.Storage`.',
      'That path is the **control plane**: create a storage account, change a VM size, add a firewall rule. Because everything goes through ARM you get one consistent place for RBAC, policy, locks, tags and the activity log.',
      'The **data plane** is using the resource itself: reading a blob, querying a SQL database, getting a secret from Key Vault, SSH to a VM. Those requests go directly to the resource’s own endpoint, such as `mystore.blob.core.windows.net`, not through ARM.',
      'The practical consequences are big. Being **Owner** of a storage account on the control plane does not, by itself, let you read blobs with Entra auth - you need a data-plane role like `Storage Blob Data Reader`. And a private endpoint or firewall on the resource affects data-plane traffic, while control-plane calls to ARM keep working from anywhere.',
    ],
    diagrams: [
      {
        kind: 'sequence',
        title: 'Control plane versus data plane',
        caption: 'Management goes through ARM; using the resource goes straight to its endpoint.',
        participants: [
          { id: 'cli', label: 'az CLI' },
          { id: 'arm', label: 'ARM' },
          { id: 'rp', label: 'Microsoft.Storage RP' },
          { id: 'blob', label: 'Blob endpoint' },
        ],
        messages: [
          { from: 'cli', to: 'arm', label: 'PUT storageAccounts/mystore' },
          { from: 'arm', to: 'rp', label: 'RBAC, Policy, locks pass: forward' },
          { from: 'rp', to: 'arm', label: '201 Created', kind: 'return' },
          { from: 'arm', to: 'cli', label: 'Provisioning state', kind: 'return' },
          { from: 'cli', to: 'blob', label: 'GET /container/file (data plane)' },
          { from: 'blob', to: 'cli', label: 'Needs a data role or key', kind: 'return' },
        ],
      },
    ],
    code: [
      {
        title: 'The same resource, two planes',
        language: 'bash',
        code: `# Control plane: a plain ARM REST call
az rest --method get \\
  --url "https://management.azure.com/subscriptions/<sub-id>/resourceGroups/rg-data/providers/Microsoft.Storage/storageAccounts/mystore?api-version=2023-05-01"

# Data plane: Entra auth straight to the blob endpoint.
# Fails with 403 unless you hold a Storage Blob Data role, even as Owner.
az storage blob list --account-name mystore --container-name reports --auth-mode login`,
        placeholders: ['<sub-id>'],
      },
    ],
    deeper: [
      'ARM operations are **asynchronous** for long-running work: the provider returns 201 or 202 with an `Azure-AsyncOperation` header, and clients poll it. That is why a Bicep deployment can report success on one resource while another is still provisioning.',
      'ARM is **regional and replicated**, and throttles per principal per subscription. Scripts that loop hundreds of `az ... show` calls can hit `429 TooManyRequests`, which is a reason to use Azure Resource Graph for inventory queries instead.',
      'Some services blur the line. Key Vault access policies were a control-plane setting that granted data-plane access, which is one reason the RBAC permission model is now recommended.',
    ],
    traps: [
      'Believing Owner or Contributor can read data. They manage the resource, not its contents - unless the service falls back to account keys.',
      'Expecting a storage firewall to block someone from deleting the account. That is a control-plane call and needs RBAC or a lock.',
    ],
    followUps: [
      'Why does a Contributor get 403 reading a blob in the portal?',
      'What is Azure Resource Graph and why is it better for inventory?',
    ],
    tags: ['arm', 'control plane', 'data plane', 'rbac'],
  },
  {
    id: 'itv-azf-5',
    level: 'intermediate',
    kind: 'open',
    prompt:
      'A pipeline fails with "MissingSubscriptionRegistration" when deploying a Container App. What is a resource provider, and how do you fix this properly?',
    probing:
      'A common real error. They want the concept (providers are per subscription), the fix, and whether you think about who should hold permission to register them.',
    answer: [
      'A **resource provider** is the service behind a namespace like `Microsoft.App`, `Microsoft.ContainerService` or `Microsoft.Network`. It defines the resource types and API versions, and ARM forwards requests for those types to it.',
      'Providers must be **registered per subscription** before you can create their resources. Many common ones are registered automatically, but newer or less common ones are not. The error means this subscription has never registered `Microsoft.App`.',
      'The immediate fix is `az provider register --namespace Microsoft.App` and waiting until the state shows `Registered`. It is a subscription-scope operation, so the identity needs the `*/register/action` permission - Contributor at subscription scope has it, but a pipeline identity that is only Contributor on a resource group does not.',
      'The proper fix is to make registration part of **subscription vending**: when a subscription is created, register the providers your platform supports. Then workload pipelines never need subscription-wide rights just to register a namespace once.',
    ],
    code: [
      {
        title: 'Check and register providers',
        language: 'bash',
        code: `# Which providers are registered?
az provider list --query "[?registrationState=='Registered'].namespace" -o tsv | sort

# Register one and wait for it
az provider register --namespace Microsoft.App --wait
az provider show --namespace Microsoft.App --query registrationState -o tsv   # Registered

# Which API versions and regions does a type support?
az provider show --namespace Microsoft.App \\
  --query "resourceTypes[?resourceType=='containerApps'].{versions:apiVersions[0:3], locations:locations}" -o jsonc`,
      },
      {
        title: 'Register the platform baseline during subscription vending',
        language: 'powershell',
        code: `$providers = 'Microsoft.App','Microsoft.ContainerService','Microsoft.KeyVault',
             'Microsoft.OperationalInsights','Microsoft.Insights','Microsoft.Network'

foreach ($p in $providers) {
    Register-AzResourceProvider -ProviderNamespace $p | Out-Null
}
Get-AzResourceProvider -ListAvailable |
    Where-Object ProviderNamespace -in $providers |
    Select-Object ProviderNamespace, RegistrationState`,
      },
    ],
    traps: [
      'Granting the workload pipeline Contributor on the whole subscription just to fix a one-off registration.',
      'Retrying the deployment immediately - registration takes a few minutes and the retry fails the same way.',
    ],
    followUps: [
      'Which permission does registering a provider require?',
      'Why can an API version work in one region and not another?',
    ],
    tags: ['resource providers', 'arm', 'troubleshooting', 'subscriptions'],
  },
]
