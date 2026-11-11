import type { InterviewQuestion } from '../../../types'

/**
 * Real interview round, part 2: Terraform (for_each, TF_LOG, lists and maps, import),
 * App Service slots, self-hosted agents, HPA and VPA, Helm values, storage access,
 * code and IaC scanning, AKS traffic flow, NAT and Azure DevOps stages and jobs.
 */
export const roundsGlobantPart2Questions: InterviewQuestion[] = [
  {
    id: 'itv-rglb2-1',
    level: 'intermediate',
    kind: 'open',
    prompt: 'How do you use `for_each` in Terraform?',
    probing:
      'Using `each.key` and `each.value` over a map or set, why instances keyed by name are safer than `count` indexes, and the plan-time key rule.',
    answer: [
      '`for_each` creates **one resource (or module) per item** in a map or a set of strings. Each instance is identified by its **key**, not by a number.',
      'Inside the block you use:',
      '- `each.key`: the map key (or the set value)\n- `each.value`: the map value (for a set, the same as `each.key`)',
      '**Example 1: a set of strings.** This creates `azurerm_resource_group.rg["dev"]`, `rg["test"]` and `rg["prod"]`.',
      '**Example 2: a map of objects (most common in real projects).** Subnets are kept in a map variable and all of them are created with one `azurerm_subnet` block; a `for` expression turns them into an output map of IDs.',
      '**`for_each` vs `count`**',
      '- **Input**: `count`: A number; `for_each`: A map or a set of strings\n- **Instance address**: `count`: `rg[0]`, `rg[1]`; `for_each`: `rg["dev"]`, `rg["prod"]`\n- **Removing an item in the middle**: `count`: Shifts the indexes, so Terraform may destroy and recreate other resources; `for_each`: Only that one item is destroyed\n- **Best for**: `count`: N identical copies, or on/off (`count = var.enabled ? 1 : 0`); `for_each`: Resources that differ by name or settings',
      '**Rules to remember**',
      '- `for_each` does not accept a plain list. Convert it with `toset()`.\n- The keys must be known at plan time. You cannot use a value that is only known after apply (such as a generated ID) as a key.\n- You cannot use `count` and `for_each` in the same block.',
      '**Interview-ready answer**',
      '"`for_each` creates one instance of a resource or module for each item in a map or set. I use `each.key` and `each.value` inside the block. For example, I keep subnets in a map variable and create all of them with one `azurerm_subnet` block. I prefer `for_each` over `count` because instances are tracked by key, so removing one item does not shift indexes and recreate the others. I use `count` only for simple on/off resources."',
    ],
    followUps: [
      'How would you move existing `count`-based resources to `for_each` without destroying them?',
      'Why does Terraform fail when a `for_each` key depends on a resource ID?',
      "How do you use `for_each` on a module, and how do you reference one instance's outputs?",
    ],
    traps: [
      'Passing a list straight to `for_each`: it fails, convert it with `toset()` or build a map.',
      'Using `count` for named resources: removing the first item renumbers and recreates everything after it.',
    ],
    code: [
      {
        title: 'Example 1: a set of strings',
        language: 'hcl',
        code: `resource "azurerm_resource_group" "rg" {
  for_each = toset(["dev", "test", "prod"])

  name     = "rg-app-\${each.key}"
  location = "eastus"
}`,
      },
      {
        title: 'Example 2: a map of objects',
        language: 'hcl',
        code: `variable "subnets" {
  type = map(object({
    address_prefix = string
  }))
  default = {
    web = { address_prefix = "10.0.1.0/24" }
    app = { address_prefix = "10.0.2.0/24" }
    db  = { address_prefix = "10.0.3.0/24" }
  }
}

resource "azurerm_subnet" "subnet" {
  for_each = var.subnets

  name                 = "snet-\${each.key}"
  resource_group_name  = azurerm_resource_group.rg["dev"].name
  virtual_network_name = azurerm_virtual_network.vnet.name
  address_prefixes     = [each.value.address_prefix]
}

output "subnet_ids" {
  value = { for name, subnet in azurerm_subnet.subnet : name => subnet.id }
}`,
      },
    ],
    tags: ['terraform', 'for_each', 'count', 'iac'],
  },
  {
    id: 'itv-rglb2-2',
    level: 'basic',
    kind: 'open',
    prompt: 'What is `TF_LOG` in Terraform?',
    probing:
      'Knowing the log levels, `TF_LOG_PATH` and the core/provider split, and that debug logs can leak secrets.',
    answer: [
      '`TF_LOG` is an **environment variable that turns on detailed Terraform logs**. It is used to debug problems such as provider errors, authentication failures, API calls that fail, or a plan that hangs.',
      '**Log levels (most detailed first)**',
      '- **`TRACE`**: What you see: Everything, including every API request and response\n- **`DEBUG`**: What you see: Detailed internal and provider messages\n- **`INFO`**: What you see: General information\n- **`WARN`**: What you see: Warnings\n- **`ERROR`**: What you see: Errors only\n- **`JSON`**: What you see: Same as `TRACE`, in JSON format',
      '**Related variables**',
      '- **`TF_LOG_PATH`**: Use: Writes the logs to a file instead of the console\n- **`TF_LOG_CORE`**: Use: Log level for Terraform core only\n- **`TF_LOG_PROVIDER`**: Use: Log level for providers only (for example `azurerm`)',
      'You can set it in a Linux or macOS shell, in Windows PowerShell, or as a step `env` in an Azure DevOps pipeline.',
      '**Careful:** `TRACE` and `DEBUG` logs can contain tokens and secrets. Do not publish them as public pipeline artifacts, and turn logging off after debugging.',
      '**Interview-ready answer**',
      '"`TF_LOG` is an environment variable that enables Terraform\'s detailed logging. The levels are TRACE, DEBUG, INFO, WARN and ERROR. I set `TF_LOG=DEBUG` or `TRACE` with `TF_LOG_PATH` to write the logs to a file when I need to debug a provider or authentication error, and `TF_LOG_PROVIDER` when I only want the provider\'s API calls. I turn it off afterwards because the logs can contain sensitive data."',
    ],
    code: [
      {
        title: 'Linux / macOS',
        language: 'bash',
        code: `# Linux / macOS
export TF_LOG=DEBUG
export TF_LOG_PATH=./terraform-debug.log
terraform plan

# Only provider logs, to see the Azure API calls
export TF_LOG_PROVIDER=TRACE
terraform apply

# Turn logging off again
unset TF_LOG TF_LOG_PATH TF_LOG_PROVIDER`,
      },
      {
        title: 'Windows PowerShell',
        language: 'powershell',
        code: `# Windows PowerShell
$env:TF_LOG = "DEBUG"
$env:TF_LOG_PATH = "terraform-debug.log"
terraform plan`,
      },
      {
        title: 'In an Azure DevOps pipeline',
        language: 'yaml',
        code: `- script: terraform plan -out=tfplan
  env:
    TF_LOG: DEBUG
    TF_LOG_PATH: $(Build.ArtifactStagingDirectory)/terraform-debug.log`,
      },
    ],
    tags: ['terraform', 'debugging', 'tf_log'],
  },
  {
    id: 'itv-rglb2-3',
    level: 'basic',
    kind: 'open',
    prompt: 'What is the difference between a list and a map in Terraform?',
    probing:
      'Ordered and index-accessed versus keyed, uniqueness of keys, and which one works directly with `for_each`.',
    answer: [
      '**List vs map in Terraform**',
      '- **What it is**: List: An **ordered** collection of values; Map: A collection of **key = value** pairs\n- **Accessed by**: List: Index: `var.locations[0]`; Map: Key: `var.tags["environment"]`\n- **Order**: List: Order matters; Map: Accessed by key, not by position\n- **Duplicates**: List: Allowed; Map: Keys must be unique\n- **Works with `for_each`**: List: Only after `toset()`; Map: Yes, directly\n- **Typical use**: List: Address spaces, DNS servers, zones; Map: Tags, per-environment settings, VM sizes per environment',
      '**List example:** a VNet address space is a `list(string)`, and the first item is `var.address_space[0]`.',
      '**Map example:** VM sizes keyed by environment, read with `var.vm_size[var.environment]`, and a map of tags.',
      'There are also `set` (unordered, unique values) and `object` (fixed attributes with different types, for example `object({ name = string, size = number })`).',
      '**Interview-ready answer**',
      '"A list is an ordered collection accessed by index, like `var.zones[0]`. A map is a set of key-value pairs accessed by key, like `var.tags["environment"]`. I use lists for things like address spaces and zones, and maps for tags and per-environment settings, for example a map of VM sizes keyed by environment. Maps also work directly with `for_each`, while a list needs `toset()` first."',
    ],
    code: [
      {
        title: 'List example',
        language: 'hcl',
        code: `variable "address_space" {
  type    = list(string)
  default = ["10.0.0.0/16", "10.1.0.0/16"]
}

resource "azurerm_virtual_network" "vnet" {
  name                = "vnet-app"
  address_space       = var.address_space
  location            = "eastus"
  resource_group_name = "rg-app"
}

# First item: var.address_space[0]`,
      },
      {
        title: 'Map example',
        language: 'hcl',
        code: `variable "vm_size" {
  type = map(string)
  default = {
    dev  = "Standard_B2s"
    prod = "Standard_D4s_v5"
  }
}

variable "tags" {
  type = map(string)
  default = {
    environment = "dev"
    owner       = "platform-team"
  }
}

# VM size for the current environment
# size = var.vm_size[var.environment]
# tags = var.tags`,
      },
    ],
    tags: ['terraform', 'variables', 'list', 'map'],
  },
  {
    id: 'itv-rglb2-4',
    level: 'intermediate',
    kind: 'open',
    prompt: 'Are App Service deployment slots blue/green, canary, or both?',
    probing:
      'That a slot swap is blue/green and Traffic % routing gives canary, plus how rollback and session stickiness work.',
    answer: [
      '**Both, depending on how you swap.**',
      '- **Blue/green:** deploy the new version to the `staging` slot, test it, then **swap** it with `production`. All traffic moves to the new version at once, and the old version is now in the staging slot, so you can swap back to roll back.\n- **Canary:** use **Traffic % routing** (called "testing in production"). Send a small percentage of production traffic, for example 10%, to the staging slot, watch errors and performance, then increase it or swap.',
      '**Blue/green with a swap:** deploy to staging, test the slot URL, swap; rollback is the same swap again.',
      '**Canary with traffic routing:** send 10% of production traffic to staging, and when everything looks good, swap and clear the routing.',
      'A user who is routed to a slot stays on it through the `x-ms-routing-name` cookie, so they do not jump between versions.',
      '**Interview-ready answer**',
      '"Deployment slots support both. The swap is a blue/green deployment: I deploy to the staging slot, warm it up and test it, then swap it with production, and rolling back is just swapping again. For canary, I use Traffic % routing to send a small share of production traffic, like 10%, to the staging slot, monitor it in Application Insights, and then swap when it is healthy."',
    ],
    followUps: [
      'Which settings move with the code during a swap, and which stay with the slot?',
      'How do you make sure the staging slot is warmed up before the swap?',
      'What happens to the database schema if you need to swap back?',
    ],
    traps: [
      'Saying a swap needs a new deployment to roll back: rollback is simply swapping again, the old build is still in the staging slot.',
    ],
    code: [
      {
        title: 'Blue/green with a swap',
        language: 'bash',
        code: `# Deploy to the staging slot
az webapp deploy -g rg-app -n app-prod --slot staging --src-path app.zip

# Test https://app-prod-staging.azurewebsites.net, then swap
az webapp deployment slot swap -g rg-app -n app-prod --slot staging --target-slot production

# Rollback = swap again
az webapp deployment slot swap -g rg-app -n app-prod --slot staging --target-slot production`,
      },
      {
        title: 'Canary with traffic routing',
        language: 'bash',
        code: `# Send 10% of production traffic to the staging slot
az webapp traffic-routing set -g rg-app -n app-prod --distribution staging=10

# Everything looks good: send all traffic by swapping, then clear the routing
az webapp deployment slot swap -g rg-app -n app-prod --slot staging --target-slot production
az webapp traffic-routing clear -g rg-app -n app-prod`,
      },
    ],
    tags: ['app service', 'deployment slots', 'blue/green', 'canary'],
  },
  {
    id: 'itv-rglb2-5',
    level: 'intermediate',
    kind: 'scenario',
    prompt:
      'If the PAT used to set up a self-hosted agent expires, will the agent show as online or offline?',
    probing:
      'Understanding that the PAT is only used at registration, that the agent then uses its own credentials, and the real causes of an offline agent.',
    answer: [
      '**It stays online after the PAT expires.**',
      'The PAT is used **only once, while registering the agent** (`config.sh` / `config.cmd`). During registration, the agent gets its own credentials (a key pair and an OAuth token issued for that agent). After that, the agent uses those credentials to talk to Azure DevOps, not the PAT.',
      'So when the PAT expires or is revoked:',
      '- The agent stays **online** and keeps running jobs.\n- You need a **new PAT** only when you **reconfigure** or **remove** the agent (`config.sh remove`), or register a new one.',
      '**When does an agent go offline?**',
      '- **The agent service or VM is stopped**: What to do: Start the service (`sudo ./svc.sh start`) or the VM\n- **No outbound network access to Azure DevOps (firewall, proxy, DNS)**: What to do: Allow outbound HTTPS 443 to the Azure DevOps URLs\n- **The agent was deleted from the pool in the portal**: What to do: Register it again with a new PAT\n- **The VM was reimaged, or the agent folder was deleted**: What to do: Register it again\n- **A very old agent version that cannot update itself**: What to do: Upgrade the agent',
      '**Good practice:** give the registration PAT only the **Agent Pools (Read & manage)** scope and a short expiry, because it is not needed after registration.',
      '**Interview-ready answer**',
      '"The agent stays online. The PAT is only used to register the agent. During registration the agent gets its own credentials, and it uses those afterwards. An expired PAT only matters when I want to reconfigure, remove or add an agent. If an agent shows offline, I check the agent service, the VM, and outbound network access to Azure DevOps."',
    ],
    followUps: [
      'How would you register agents without a PAT, for example with a service principal?',
      'An agent shows offline but the VM is running. What do you check first?',
      'How do you keep self-hosted agents patched and on a current agent version?',
    ],
    code: [
      {
        title: 'Check, remove and re-register an agent',
        language: 'bash',
        code: `# Check the agent service on Linux
sudo ./svc.sh status

# Remove and re-register (this step needs a valid PAT)
./config.sh remove --auth pat --token <new-pat>
./config.sh --unattended --url https://dev.azure.com/<org> --auth pat --token <new-pat> \\
  --pool Linux-SelfHosted --agent build-agent-01 --acceptTeeEula
sudo ./svc.sh install && sudo ./svc.sh start`,
        placeholders: ['<new-pat>', '<org>'],
      },
    ],
    tags: ['azure devops', 'self-hosted agents', 'pat', 'troubleshooting'],
  },
  {
    id: 'itv-rglb2-6',
    level: 'intermediate',
    kind: 'scenario',
    prompt: 'Give a use case where you would use self-hosted agents.',
    probing:
      'A concrete reason such as reaching a private AKS cluster or private endpoints, plus how the pool is placed in the network and used only for the stages that need it.',
    answer: [
      "Microsoft-hosted agents are easy (a clean VM for every job, no maintenance), but they run on Microsoft's network and you cannot change them much. I use **self-hosted agents** when:",
      '1. **The pipeline must reach private resources.** For example, deploying to a **private AKS cluster**, a Key Vault or Storage Account with **private endpoints only**, an internal database, or on-premises servers. A Microsoft-hosted agent cannot reach them.\n2. **Special tools or licences** are needed: a specific SDK, a licensed tool, GPU, or a particular OS version.\n3. **Speed:** Docker layers, Maven `.m2`, npm and NuGet caches stay on the agent between runs, so builds are faster.\n4. **Compliance:** the build must run inside the company network or a specific region, with company-approved images.\n5. **Long or heavy jobs:** jobs that need more CPU, memory or disk, or run longer than the Microsoft-hosted time limit.\n6. **Cost:** many build minutes a month can be cheaper on your own VMs or a VM Scale Set.',
      '**Real-time example:** our production AKS cluster was **private** and Key Vault was behind a **private endpoint**. Microsoft-hosted agents could not reach them, so we created self-hosted Linux agents in a VM Scale Set **inside a subnet peered with the AKS VNet**. The deploy stages ran on that pool, so `kubectl`, `helm` and Key Vault calls stayed inside the private network.',
      'In the pipeline, the build stage stays on a Microsoft-hosted agent and only the production deploy stage uses the private self-hosted pool.',
      '**Tip:** Azure Virtual Machine Scale Set agents (or Managed DevOps Pools) give you self-hosted agents that scale automatically and can be reset to a clean state after each job.',
      '**Interview-ready answer**',
      '"I use self-hosted agents when the pipeline needs to reach private resources. In my project the production AKS cluster was private and Key Vault had only a private endpoint, so Microsoft-hosted agents could not reach them. We ran self-hosted agents in a VM Scale Set inside a peered VNet and used that pool for the deployment stages. Other reasons are custom tools, caching for faster builds, compliance, and long-running jobs."',
    ],
    followUps: [
      'What is the difference between VM Scale Set agents and Managed DevOps Pools?',
      'How do you stop a compromised build on a self-hosted agent from affecting the next job?',
      'Besides network placement, what else does the agent need to deploy to a private AKS cluster?',
    ],
    code: [
      {
        title: 'Build on Microsoft-hosted, deploy on self-hosted',
        language: 'yaml',
        code: `stages:
  - stage: Build
    pool:
      vmImage: ubuntu-latest        # Microsoft-hosted is fine for the build
    jobs:
      - job: Build
        steps:
          - script: docker build -t myapp:$(Build.BuildId) .

  - stage: DeployProd
    pool:
      name: Linux-SelfHosted-Private   # self-hosted agents inside the VNet
    jobs:
      - deployment: Deploy
        environment: prod
        strategy:
          runOnce:
            deploy:
              steps:
                - script: helm upgrade --install myapp ./chart -n myapp`,
      },
    ],
    tags: ['azure devops', 'self-hosted agents', 'private aks', 'private endpoints'],
  },
  {
    id: 'itv-rglb2-7',
    level: 'advanced',
    kind: 'scenario',
    prompt: 'Terraform says a resource already exists. What do you do?',
    probing:
      'Recognising state drift, checking the backend and workspace first, importing with an `import` block or `terraform import`, then reconciling the code until plan shows no changes, without deleting the real resource.',
    answer: [
      'The error usually looks like the one in the first code sample (with the `azurerm` provider it normally appears during **apply**).',
      'It means the resource **exists in Azure but not in the Terraform state**, so Terraform tries to create it again. Common causes: someone created it manually in the portal, a previous apply failed after creating it, or you are using the **wrong state file** (wrong backend key or workspace).',
      '**Step 1: check you are on the right state.** If the backend key or workspace is wrong, fix that first. Then the resource is already in the state and there is nothing to import.',
      '**Step 2: decide if Terraform should manage it**',
      '**Yes, Terraform should manage it: import it.**',
      '- **Option A, the `import` block** (Terraform 1.5+, reviewed in the plan, good for pipelines): `terraform plan` shows "1 to import", then `terraform apply`.\n- **Option B, the CLI command:** `terraform import` with the resource address and the Azure resource ID.',
      '**No, it is a different resource with the same name:** give the Terraform resource a different name.',
      '**Step 3: make the code match.** After the import, run `terraform plan`. If it shows changes, update the code to match the real settings (or accept the changes on purpose). The goal is **"No changes"**.',
      '**Do not** delete the Azure resource just to make the error go away. It may hold data or be used by other systems.',
      '**Interview-ready answer**',
      '"That error means the resource exists in Azure but not in Terraform\'s state. First I check I am using the right backend and workspace, because a wrong state file causes the same error. If the resource should be managed by Terraform, I import it, preferably with an `import` block so the import shows up in the plan, or with `terraform import`. Then I run plan again and adjust the code until it shows no changes. I never delete the existing resource just to get past the error."',
    ],
    followUps: [
      'How can `terraform plan -generate-config-out` help when importing many existing resources?',
      'How would you stop people creating resources manually in the portal in the first place?',
      'A previous apply crashed halfway. How do you check whether the state is consistent?',
    ],
    traps: [
      'Deleting the existing Azure resource to clear the error: it can destroy data and break other systems.',
      'Importing before confirming the backend key and workspace: you may import into the wrong state.',
    ],
    code: [
      {
        title: 'The error',
        language: 'text',
        code: `Error: A resource with the ID "/subscriptions/.../resourceGroups/rg-app" already exists -
to be managed via Terraform this resource needs to be imported into the State.`,
      },
      {
        title: 'Step 1: check the state',
        language: 'bash',
        code: `terraform workspace show
terraform state list | grep rg-app`,
      },
      {
        title: 'Option A: import block',
        language: 'hcl',
        code: `import {
  to = azurerm_resource_group.rg
  id = "/subscriptions/<subscription-id>/resourceGroups/rg-app"
}`,
        placeholders: ['<subscription-id>'],
      },
      {
        title: 'Plan and apply the import',
        language: 'bash',
        code: `terraform plan    # shows "1 to import"
terraform apply`,
      },
      {
        title: 'Option B: CLI import',
        language: 'bash',
        code: `terraform import azurerm_resource_group.rg /subscriptions/<subscription-id>/resourceGroups/rg-app`,
        placeholders: ['<subscription-id>'],
      },
    ],
    tags: ['terraform', 'import', 'state', 'troubleshooting'],
  },
  {
    id: 'itv-rglb2-8',
    level: 'intermediate',
    kind: 'scenario',
    prompt: 'Give a particular use case where you would use HPA.',
    probing:
      'A believable stateless workload with variable traffic, correct HPA settings (requests, min/max, target), and knowing when KEDA, VPA or the Cluster Autoscaler fit better.',
    answer: [
      'The **Horizontal Pod Autoscaler (HPA)** adds or removes **pod replicas** based on a metric, usually CPU or memory.',
      '**Use case:** we had an **order API** on AKS. Traffic was low at night and very high during sales and in the evenings. With a fixed 3 replicas, pods hit high CPU and response times went up at peak, and at night we paid for capacity we did not use. We added an HPA: **minimum 3, maximum 15 pods, target 70% CPU**. At peak it scaled out automatically; at night it scaled back to 3. The **Cluster Autoscaler** added nodes when the new pods did not fit.',
      '**Requirements for HPA to work**',
      '- **metrics-server** must be running (it is built into AKS).\n- The containers must have **CPU and memory requests**, because utilization is calculated against the request.\n- The app should be **stateless** so any pod can serve any request.',
      '**When HPA is not the right tool**',
      '- Scaling on **queue length** or events (Service Bus, Kafka): use **KEDA**.\n- Pods need **more CPU per pod**, not more pods: use **VPA**.\n- There is **no room for more pods** on the nodes: the **Cluster Autoscaler** adds nodes.',
      '**Interview-ready answer**',
      '"I use HPA for stateless services with changing traffic. For example, our order API on AKS had big peaks in the evening. I configured an HPA with minimum 3, maximum 15 replicas and a 70% CPU target, with CPU requests set on the containers. It scaled out at peak and back down at night, and the Cluster Autoscaler added nodes when needed. For queue-based workloads I use KEDA instead."',
    ],
    followUps: [
      'Why does the HPA show `<unknown>` for the CPU target?',
      'What does the `behavior.scaleDown.stabilizationWindowSeconds` setting prevent?',
      'How would you scale the same API on requests per second instead of CPU?',
    ],
    code: [
      {
        title: 'HPA for the order API',
        language: 'yaml',
        code: `apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: order-api
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: order-api
  minReplicas: 3
  maxReplicas: 15
  metrics:
    - type: Resource
      resource:
        name: cpu
        target:
          type: Utilization
          averageUtilization: 70
  behavior:
    scaleDown:
      stabilizationWindowSeconds: 300   # wait 5 minutes before scaling down`,
      },
      {
        title: 'Watch the HPA',
        language: 'bash',
        code: `kubectl get hpa order-api -w
kubectl describe hpa order-api`,
      },
    ],
    tags: ['kubernetes', 'aks', 'hpa', 'autoscaling'],
  },
  {
    id: 'itv-rglb2-9',
    level: 'basic',
    kind: 'open',
    prompt: 'What is the difference between a Deployment and a DaemonSet?',
    probing:
      'N replicas placed by the scheduler versus one pod per (matching) node, and typical node-level DaemonSet workloads.',
    answer: [
      '**Deployment vs DaemonSet**',
      '- **Purpose**: Deployment: Run **N replicas** of an application; DaemonSet: Run **one pod on every node** (or on selected nodes)\n- **Number of pods**: Deployment: You set `replicas` (or HPA does); DaemonSet: Equal to the number of matching nodes\n- **Placement**: Deployment: The scheduler places pods on any suitable nodes; DaemonSet: One pod per node, automatically\n- **New node joins**: Deployment: Nothing changes; DaemonSet: A pod is started on the new node automatically\n- **Scaling**: Deployment: `kubectl scale`, HPA; DaemonSet: No `replicas` field; it follows the nodes\n- **Typical use**: Deployment: Web apps, APIs, microservices; DaemonSet: Log agents (Fluent Bit), monitoring agents (node-exporter), network/CNI and storage/CSI plugins, security agents',
      'The DaemonSet example uses a toleration with `operator: Exists` so the agent also runs on tainted nodes.',
      '**Interview-ready answer**',
      '"A Deployment runs a set number of replicas of an application, and the scheduler decides which nodes they go on. I use it for web apps and APIs, and scale it with HPA. A DaemonSet runs exactly one pod on every node, or on nodes that match a selector, and automatically adds a pod when a new node joins. I use DaemonSets for node-level agents like Fluent Bit for logs and node-exporter for metrics."',
    ],
    code: [
      {
        title: 'Deployment',
        language: 'yaml',
        code: `apiVersion: apps/v1
kind: Deployment
metadata:
  name: web-api
spec:
  replicas: 3
  selector:
    matchLabels:
      app: web-api
  template:
    metadata:
      labels:
        app: web-api
    spec:
      containers:
        - name: web-api
          image: myacr.azurecr.io/web-api:1.4.0`,
      },
      {
        title: 'DaemonSet',
        language: 'yaml',
        code: `apiVersion: apps/v1
kind: DaemonSet
metadata:
  name: node-exporter
  namespace: monitoring
spec:
  selector:
    matchLabels:
      app: node-exporter
  template:
    metadata:
      labels:
        app: node-exporter
    spec:
      tolerations:
        - operator: Exists          # also run on tainted nodes
      containers:
        - name: node-exporter
          image: quay.io/prometheus/node-exporter:v1.8.2`,
      },
    ],
    tags: ['kubernetes', 'deployment', 'daemonset'],
  },
  {
    id: 'itv-rglb2-10',
    level: 'intermediate',
    kind: 'open',
    prompt: 'The same port is defined in `values.yaml` and `dev-values.yaml`. Which one is used?',
    probing:
      'Helm value precedence (chart defaults, `-f` files left to right, `--set`), deep merge of maps versus replacement of lists, and verifying with `helm template`.',
    answer: [
      '**The value from `dev-values.yaml` is used** (assuming you pass it with `-f`).',
      'Helm merges values in this order, and **later values override earlier ones**:',
      "1. The chart's own `values.yaml` (always loaded, even if you do not pass it)\n2. Files passed with `-f` / `--values`, **from left to right**\n3. `--set` and `--set-string` (highest priority)",
      'With `-f values.yaml -f dev-values.yaml` the result is `service.port = 8080` and `service.type = ClusterIP` (kept from `values.yaml`). Adding `--set service.port=9090` gives 9090, because `--set` wins.',
      '**Things to know about values files**',
      '- **Maps are merged deeply**, so `service.type` is kept from `values.yaml` while only `service.port` changes.\n- **Lists are replaced, not merged.** If both files define a list, the later list replaces the earlier one completely.\n- If you pass the files the other way round (`-f dev-values.yaml -f values.yaml`), `values.yaml` wins. The order on the command line matters.',
      'Check the final values before deploying with `helm template`, and see the values of an installed release with `helm get values`.',
      '**Interview-ready answer**',
      '"The port from `dev-values.yaml` is used. Helm starts with the chart\'s `values.yaml`, then applies each `-f` file from left to right, and `--set` overrides everything. Maps are deep-merged, so only the port is overridden and other keys stay from `values.yaml`, but lists are replaced completely. I check the final result with `helm template` before deploying."',
    ],
    followUps: [
      'How would you remove a key that the chart defaults set, from an override file?',
      'Why can a list of environment variables in an override file silently drop the defaults?',
      'How do you see which values an installed release was deployed with, including defaults?',
    ],
    code: [
      {
        title: 'values.yaml',
        language: 'yaml',
        code: `# values.yaml
service:
  port: 80
  type: ClusterIP`,
      },
      {
        title: 'dev-values.yaml',
        language: 'yaml',
        code: `# dev-values.yaml
service:
  port: 8080`,
      },
      {
        title: 'Precedence in practice',
        language: 'bash',
        code: `helm upgrade --install myapp ./myapp -f values.yaml -f dev-values.yaml
# Result: service.port = 8080, service.type = ClusterIP (kept from values.yaml)

helm upgrade --install myapp ./myapp -f dev-values.yaml --set service.port=9090
# Result: service.port = 9090 (--set wins)`,
      },
      {
        title: 'Check the final values',
        language: 'bash',
        code: `helm template myapp ./myapp -f values.yaml -f dev-values.yaml | grep -A5 "kind: Service"
helm get values myapp -n dev          # values used by an installed release`,
      },
    ],
    tags: ['helm', 'values', 'kubernetes'],
  },
  {
    id: 'itv-rglb2-11',
    level: 'intermediate',
    kind: 'scenario',
    prompt: 'How do you give new joiners access to a storage account?',
    probing:
      'Group-based Entra ID access with data-plane RBAC roles at the smallest scope, shared keys disabled, PIM for elevation, user delegation SAS for temporary access, and access reviews.',
    answer: [
      'I give access through **Microsoft Entra ID groups and Azure RBAC**, never by sharing the storage account keys.',
      '**Steps to give new joiners access**',
      '**1. Add the new joiner to an Entra ID group**, for example `grp-storage-app-readers`. Access is given to the group, not to each person, so onboarding and offboarding is just group membership.',
      '**2. Assign a data role to the group** at the smallest scope that works (the container or file share, not the whole subscription):',
      '- **Read blobs**: Role: **Storage Blob Data Reader**\n- **Upload and change blobs**: Role: **Storage Blob Data Contributor**\n- **Read Azure Files shares**: Role: **Storage File Data SMB Share Reader**\n- **Read and write Azure Files shares**: Role: **Storage File Data SMB Share Contributor**\n- **Read queue messages**: Role: **Storage Queue Data Reader**',
      "**3. Disable shared key access** (`allowSharedKeyAccess = false`) so everyone must use Entra ID, and every access is logged with the user's identity.",
      '**4. Network:** if the account uses private endpoints or firewall rules, the user must connect through the VPN or corporate network.',
      '**5. Elevated access** (for example Contributor on production) goes through **PIM**: eligible, time-limited and approved.',
      '**6. Temporary access** for one file or an external user: a **user delegation SAS** with a short expiry, not an account key SAS.',
      '**7. Run access reviews** every quarter, and remove the user from the group when they leave or change team.',
      '**Important:** **Reader** or **Contributor** on the storage account is **control-plane** access (manage the account settings). They do **not** let users read data with Entra ID. For data you need the **Storage Blob Data** roles.',
      'The user then signs in with their own account, for example in Azure Storage Explorer or with `az storage blob list --auth-mode login`.',
      '**Interview-ready answer**',
      '"I add the new joiner to an Entra ID group and give the group a data-plane role like Storage Blob Data Reader, scoped to the container they need. I keep shared key access disabled, so access always goes through Entra ID and is audited. Higher access goes through PIM, temporary access uses a short user delegation SAS, and access reviews remove people who no longer need it. I never share account keys."',
    ],
    followUps: [
      'A user has Contributor on the storage account but gets 403 reading blobs. Why?',
      'What breaks when you disable shared key access, and how do you check before turning it off?',
      'Why is a user delegation SAS safer than an account key SAS?',
    ],
    traps: [
      'Assuming Owner or Contributor on the account grants blob data access with Entra ID: it does not, a Storage Blob Data role is needed.',
    ],
    code: [
      {
        title: 'Assign a data role to the group at container scope',
        language: 'bash',
        code: `SCOPE=$(az storage account show -n stappdata -g rg-app --query id -o tsv)
GROUP_ID=$(az ad group show --group grp-storage-app-readers --query id -o tsv)

az role assignment create \\
  --assignee-object-id "$GROUP_ID" --assignee-principal-type Group \\
  --role "Storage Blob Data Reader" \\
  --scope "$SCOPE/blobServices/default/containers/reports"`,
      },
    ],
    tags: ['azure storage', 'rbac', 'entra id', 'access management'],
  },
  {
    id: 'itv-rglb2-12',
    level: 'basic',
    kind: 'open',
    prompt: 'What are Function Apps and App Service used for?',
    probing:
      'Always-on web hosting versus serverless event-driven code, triggers, the scaling and billing differences, and execution time limits.',
    answer: [
      'Both run on the same App Service platform, but they are used for different kinds of work.',
      '- **Model**: App Service (Web App): Always-on web hosting; Function App (Azure Functions): **Serverless**, event-driven code\n- **Runs when**: App Service: Always, waiting for HTTP requests; Function App: When a **trigger** fires: HTTP, timer, queue, Service Bus, Event Grid, Blob\n- **Typical use**: App Service: Websites, REST APIs, backends for mobile and frontend apps; Function App: Small background tasks: process a queue message, resize an uploaded image, nightly cleanup, webhooks\n- **Scaling**: App Service: Manual or autoscale rules on the App Service plan; Function App: Automatic, per event, down to zero on the Consumption / Flex Consumption plans\n- **Billing**: App Service: Pay for the App Service plan all the time; Function App: On Consumption: pay per execution and resources used\n- **Long tasks**: App Service: Fine; Function App: Consumption plan has an execution time limit (5 minutes by default, 10 at most); use Premium, Flex Consumption, Dedicated or Durable Functions for longer work\n- **Deployment slots**: App Service: Yes; Function App: Yes (with limits on some plans)',
      '**Real-time example:** our customer portal and its REST API ran on **App Service** with deployment slots. When a user uploaded an invoice to Blob Storage, a **Function App** with a Blob/Event Grid trigger read the file, generated a PDF summary and wrote the result to another container. A **timer-triggered function** cleaned up old files every night.',
      '**Interview-ready answer**',
      '"App Service is for always-on web apps and APIs, like our customer portal and its REST API. Function Apps are serverless and event-driven: code runs when a trigger fires, like an HTTP call, a timer, a queue message or a new blob. I use Functions for small background jobs such as processing uploaded files or nightly cleanup, because they scale automatically and on the Consumption plan you pay only when they run. For long-running work I use a Premium plan or Durable Functions."',
    ],
    code: [
      {
        title: 'A timer-triggered function (C#)',
        language: 'text',
        code: `// A timer-triggered function: runs every day at 01:00
[Function("NightlyCleanup")]
public void Run([TimerTrigger("0 0 1 * * *")] TimerInfo timer) { /* delete old blobs */ }`,
      },
    ],
    tags: ['app service', 'azure functions', 'serverless'],
  },
  {
    id: 'itv-rglb2-13',
    level: 'basic',
    kind: 'open',
    prompt: 'Write a sample KQL query to list the resources in a resource group.',
    probing:
      'Knowing that Azure Resource Graph is the place to query resources with KQL, basic `where`/`project`/`summarize`, and running it from the CLI.',
    answer: [
      'Use **Azure Resource Graph**, which you can query with KQL from the **Resource Graph Explorer** in the portal, the Azure CLI or PowerShell.',
      '**List the resources:** filter `Resources` on the resource group and project the columns you need.',
      '`=~` is a case-insensitive comparison. Resource group names are stored in lowercase in Resource Graph, so `=~` avoids missing them.',
      '**More useful queries:** count the resources by type, find resources missing an `owner` tag, and list VMs with their power state.',
      '**Run it from the CLI** with `az graph query`, or use `az resource list -g` as the simple non-KQL way.',
      '**Interview-ready answer**',
      '"I use Azure Resource Graph with KQL: `Resources | where resourceGroup =~ \'rg-app-prod\' | project name, type, location`. I run it in Resource Graph Explorer or with `az graph query`. I also use `summarize count() by type` to see what is in a resource group, and filter on tags to find resources without an owner. Resource Graph is fast and can query across all subscriptions at once."',
    ],
    code: [
      {
        title: 'List the resources (KQL)',
        language: 'text',
        code: `Resources
| where resourceGroup =~ 'rg-app-prod'
| project name, type, location, resourceGroup, subscriptionId
| order by type asc, name asc`,
      },
      {
        title: 'More useful queries (KQL)',
        language: 'text',
        code: `// Count the resources by type
Resources
| where resourceGroup =~ 'rg-app-prod'
| summarize count() by type
| order by count_ desc

// Resources missing an "owner" tag
Resources
| where resourceGroup =~ 'rg-app-prod'
| where isnull(tags.owner) or tostring(tags.owner) == ''
| project name, type

// VMs and their power state
Resources
| where type =~ 'microsoft.compute/virtualmachines'
| where resourceGroup =~ 'rg-app-prod'
| project name, powerState = tostring(properties.extended.instanceView.powerState.code)`,
      },
      {
        title: 'Run it from the CLI',
        language: 'bash',
        code: `az extension add --name resource-graph
az graph query -q "Resources | where resourceGroup =~ 'rg-app-prod' | project name, type, location" -o table

# The simple non-KQL way
az resource list -g rg-app-prod -o table`,
      },
    ],
    tags: ['kql', 'azure resource graph', 'azure cli'],
  },
  {
    id: 'itv-rglb2-14',
    level: 'intermediate',
    kind: 'open',
    prompt: 'Which Azure-native security tool scans code for vulnerabilities?',
    probing:
      'Naming GitHub Advanced Security for Azure DevOps (CodeQL, secret and dependency scanning) and how Defender for Cloud DevOps security aggregates findings.',
    answer: [
      '**GitHub Advanced Security for Azure DevOps (GHAzDO)**, with the results also visible in **Microsoft Defender for Cloud**.',
      '- **GitHub Advanced Security for Azure DevOps**: What it scans: **Code scanning** with **CodeQL** (SQL injection, XSS, insecure code in C#, Java, JavaScript, Python and more), **secret scanning** (with push protection to block secrets before they are pushed), and **dependency scanning** (vulnerable open-source packages)\n- **Microsoft Defender for Cloud: DevOps security**: What it scans: Connects Azure DevOps, GitHub and GitLab, and shows code, secret, dependency and IaC findings in one place, linked to the cloud resources they deploy\n- **Microsoft Security DevOps extension**: What it scans: Runs scanners in the pipeline (for example Checkov, Trivy and Template Analyzer) and sends the results to Defender for Cloud\n- **Defender for Containers**: What it scans: Vulnerability scanning of container images in Azure Container Registry',
      'For code in **GitHub**, the same features are part of **GitHub Advanced Security** (CodeQL, secret scanning, Dependabot). Advanced Security is now also sold as two separate products, **Secret Protection** and **Code Security**, so a team can enable only the part it needs.',
      'The results appear in **Repos > Advanced Security**, and the team can block pull requests that add new high-severity alerts.',
      '**Interview-ready answer**',
      '"The Azure-native option is GitHub Advanced Security for Azure DevOps. It gives code scanning with CodeQL, secret scanning with push protection, and dependency scanning, all inside Azure Repos and Pipelines. Microsoft Defender for Cloud\'s DevOps security brings those findings together with IaC and container image findings, so we see everything in one place. Many teams also use SonarQube for code quality, but the native security tool is Advanced Security."',
    ],
    followUps: [
      'How would you block a pull request that introduces a new high-severity CodeQL alert?',
      'What is the difference between secret scanning and push protection?',
      'Where would Checkov and Trivy fit next to CodeQL in the same pipeline?',
    ],
    code: [
      {
        title: 'Pipeline with GitHub Advanced Security for Azure DevOps',
        language: 'yaml',
        code: `steps:
  - task: AdvancedSecurity-Codeql-Init@1
    inputs:
      languages: 'csharp'
  - task: DotNetCoreCLI@2
    inputs:
      command: build
  - task: AdvancedSecurity-Dependency-Scanning@1
  - task: AdvancedSecurity-Codeql-Analyze@1`,
      },
    ],
    tags: ['devsecops', 'github advanced security', 'codeql', 'defender for cloud'],
  },
  {
    id: 'itv-rglb2-15',
    level: 'intermediate',
    kind: 'open',
    prompt: 'What type of vulnerabilities does Checkov report?',
    probing:
      'That Checkov finds IaC misconfigurations (not application code bugs), the categories it covers, and how skips and soft-fail are handled in a pipeline.',
    answer: [
      '**Checkov** is an open-source **static analysis tool for infrastructure as code**. It reports **misconfigurations**: settings that make the infrastructure insecure or non-compliant, **before** it is deployed.',
      '**What it scans:** Terraform (and Terraform plan JSON), Bicep, ARM templates, CloudFormation, Kubernetes YAML, Helm charts, Kustomize, Dockerfiles, and CI/CD files such as GitHub Actions and Azure Pipelines.',
      '**Types of issues it reports**',
      '- **Public exposure**: Examples: Storage account allows public blob access; NSG allows SSH (22) or RDP (3389) from `0.0.0.0/0`; database open to the internet\n- **Encryption**: Examples: Encryption at rest disabled; HTTPS-only not enforced; minimum TLS version below 1.2\n- **Identity and access**: Examples: Overly broad IAM/RBAC permissions; managed identity not used; AKS without Entra ID or with local accounts\n- **Logging and monitoring**: Examples: Diagnostic logs disabled; no log retention\n- **Backup and resilience**: Examples: Soft delete or purge protection disabled on Key Vault; no backup or geo-redundancy\n- **Kubernetes and containers**: Examples: Containers running as root or privileged; no CPU/memory limits; no readiness/liveness probes; image using the `latest` tag\n- **Secrets**: Examples: Hardcoded passwords, keys and tokens in the code\n- **Supply chain (SCA)**: Examples: Vulnerable open-source packages and container images (with the Prisma Cloud platform connected)',
      'Each finding has a check ID (for example `CKV_AZURE_...`, `CKV_K8S_...`), the file and line, and a link to the fix.',
      'Skips must have a reason, and the team reviews them.',
      '**Note:** Checkov is **not** a code vulnerability scanner for application code (SQL injection, XSS). Use CodeQL or SonarQube for that, and Trivy or Defender for Containers for image CVEs.',
      '**Interview-ready answer**',
      '"Checkov scans infrastructure as code (Terraform, Bicep, ARM, Kubernetes manifests, Helm charts and Dockerfiles) for security misconfigurations before deployment. It reports things like public storage access, NSGs open to the internet on SSH or RDP, encryption or HTTPS-only not enforced, missing diagnostic logs, Key Vault without purge protection, containers running as root or without resource limits, and hardcoded secrets. I run it in the pipeline on every pull request, and any skip needs a documented reason."',
    ],
    followUps: [
      'Why would you scan the Terraform plan JSON instead of only the `.tf` files?',
      'How do you roll Checkov out on an old codebase with hundreds of findings without blocking every build?',
      'How would you write a custom Checkov policy for an internal tagging rule?',
    ],
    traps: [
      'Calling Checkov an application code scanner: it does not find SQL injection or XSS in your app code.',
    ],
    code: [
      {
        title: 'Run Checkov',
        language: 'bash',
        code: `checkov -d ./terraform --framework terraform
checkov -f k8s/deployment.yaml
checkov -d . --soft-fail          # report only, do not fail the build`,
      },
      {
        title: 'Skip a check with a reason',
        language: 'hcl',
        code: `resource "azurerm_storage_account" "logs" {
  # checkov:skip=<check-id>:Public access is required for the static website
  name                     = "stlogs001"
  resource_group_name      = "rg-app"
  location                 = "eastus"
  account_tier             = "Standard"
  account_replication_type = "LRS"
}`,
        placeholders: ['<check-id>'],
      },
    ],
    tags: ['checkov', 'iac security', 'devsecops', 'terraform'],
  },
  {
    id: 'itv-rglb2-16',
    level: 'basic',
    kind: 'open',
    prompt: 'Will I get Helm in the Azure Marketplace?',
    probing:
      'That Helm is an open-source CLI you install, where it already exists in Azure tooling, and the difference from Marketplace Kubernetes apps packaged as Helm charts.',
    answer: [
      '**Not as a product to buy or deploy.** Helm is a free, open-source **CLI tool**. You install it on your machine or agent; it is not something you deploy from the Azure Marketplace.',
      '**Where Helm is already available in Azure**',
      '- **Azure Cloud Shell**: How: Helm is preinstalled\n- **Microsoft-hosted pipeline agents**: How: Helm is preinstalled; the `HelmInstaller@1` task installs a specific version\n- **Azure DevOps**: How: Built-in **`HelmDeploy@0`** task to run `helm upgrade` against AKS\n- **Azure Container Registry**: How: Stores Helm charts as **OCI artifacts** (`helm push oci://myacr.azurecr.io/helm`)\n- **Azure Marketplace "Kubernetes apps"**: How: Third-party applications **packaged as Helm charts** that you install on AKS as cluster extensions. You get the application, not the Helm tool',
      '**Interview-ready answer**',
      '"Helm itself is an open-source CLI, so you install it rather than get it from the Marketplace. It is already in Cloud Shell and on Microsoft-hosted agents, Azure DevOps has the HelmInstaller and HelmDeploy tasks, and ACR can store Helm charts as OCI artifacts. What the Azure Marketplace does have is Kubernetes apps, which are third-party applications packaged as Helm charts that you install on AKS."',
    ],
    code: [
      {
        title: 'Install Helm on a Linux VM or self-hosted agent',
        language: 'bash',
        code: `# Install Helm on a Linux VM or self-hosted agent
curl -fsSL https://raw.githubusercontent.com/helm/helm/main/scripts/get-helm-3 | bash
helm version`,
      },
      {
        title: 'Azure DevOps Helm tasks',
        language: 'yaml',
        code: `- task: HelmInstaller@1
  inputs:
    helmVersionToInstall: 'latest'
- task: HelmDeploy@0
  inputs:
    connectionType: 'Azure Resource Manager'
    azureSubscription: 'sc-azure-prod'
    azureResourceGroup: 'rg-aks'
    kubernetesCluster: 'aks-prod'
    command: upgrade
    chartType: FilePath
    chartPath: './charts/myapp'
    releaseName: 'myapp'
    namespace: 'myapp'`,
      },
    ],
    tags: ['helm', 'azure marketplace', 'azure devops', 'acr'],
  },
  {
    id: 'itv-rglb2-17',
    level: 'intermediate',
    kind: 'open',
    prompt:
      'Explain maxSurge and maxUnavailable in a rolling update: 8 replicas, surge 4, unavailable 2. What are the percentages?',
    probing:
      'Correct arithmetic (50% and 25%, 12 maximum and 6 minimum pods), the role of readiness probes, and the rounding rules for percentages.',
    answer: [
      'In a rolling update, Kubernetes replaces old pods with new ones in batches.',
      '- **`maxSurge`**: how many **extra** pods can exist **above** the desired replica count during the update.\n- **`maxUnavailable`**: how many pods can be **unavailable below** the desired replica count during the update.',
      '**With 8 replicas, maxSurge 4, maxUnavailable 2**',
      '- **maxSurge**: Number: 4; Percentage of 8: **50%** (4 / 8)\n- **maxUnavailable**: Number: 2; Percentage of 8: **25%** (2 / 8)',
      'So during the update:',
      '- **Maximum pods at any time:** 8 + 4 = **12**\n- **Minimum available pods at any time:** 8 - 2 = **6**',
      '**What happens step by step**',
      '1. Kubernetes can start up to **4 new pods** at once (total 12) and stop up to **2 old pods** at once (6 still available).\n2. When new pods become **Ready** (readiness probe passes), more old pods are removed and more new pods are started.\n3. This repeats until all 8 pods run the new version.',
      '**Rounding rules for percentages**',
      '- `maxSurge` percentage is **rounded up**.\n- `maxUnavailable` percentage is **rounded down**.',
      'For example, with 8 replicas and `maxUnavailable: 30%`: 8 × 0.3 = 2.4, rounded down to **2**.',
      '**Zero-downtime setting:** `maxUnavailable: 0` with `maxSurge: 1` (or more) never drops below full capacity, but needs room for the extra pods.',
      '**Interview-ready answer**',
      '"maxSurge is how many extra pods can run above the desired count during a rolling update, and maxUnavailable is how many can be down below it. With 8 replicas, a surge of 4 is 50% and an unavailable of 2 is 25%, so the Deployment runs at most 12 pods and always keeps at least 6 available. New pods must pass their readiness probe before more old ones are removed. For zero downtime in production, I use maxUnavailable 0."',
    ],
    followUps: [
      'What happens if you set both maxSurge and maxUnavailable to 0?',
      'A rolling update is stuck halfway. How do you find out why and roll it back?',
      'Why does `maxUnavailable: 0` sometimes leave new pods Pending on a full cluster?',
    ],
    traps: ['Rounding both percentages the same way: surge rounds up, unavailable rounds down.'],
    code: [
      {
        title: 'Rolling update strategy',
        language: 'yaml',
        code: `apiVersion: apps/v1
kind: Deployment
metadata:
  name: web-api
spec:
  replicas: 8
  strategy:
    type: RollingUpdate
    rollingUpdate:
      maxSurge: 4           # or "50%"
      maxUnavailable: 2     # or "25%"`,
      },
    ],
    tags: ['kubernetes', 'rolling update', 'deployment strategy'],
  },
  {
    id: 'itv-rglb2-18',
    level: 'intermediate',
    kind: 'open',
    prompt: 'How do you use GitHub with Azure DevOps?',
    probing:
      'Connecting GitHub repos to Azure Pipelines through the GitHub App, PR status checks with branch protection, GitHub template repositories in `resources`, and Azure Boards `AB#` links.',
    answer: [
      'You can keep your code in **GitHub** and still use **Azure Pipelines** and **Azure Boards**.',
      '**1. Build and deploy GitHub code with Azure Pipelines**',
      '1. In Azure DevOps: **Pipelines > New pipeline > GitHub (YAML)**.\n2. Authorize with the **Azure Pipelines GitHub App** (recommended), OAuth, or a PAT. This creates a **GitHub service connection**.\n3. Select the repository. The pipeline YAML (`azure-pipelines.yml`) lives in the GitHub repo.\n4. Pushes and pull requests in GitHub trigger the pipeline, and the result appears as a **status check** on the pull request.',
      'In GitHub, make that check **required** with a branch protection rule, so pull requests cannot merge until the pipeline passes.',
      '**2. Use another GitHub repository in a pipeline (templates or multi-repo):** declare it under `resources.repositories` with `type: github` and the GitHub service connection as the `endpoint`.',
      '**3. Azure Boards with GitHub:** install the **Azure Boards app** for GitHub. Then write `AB#1234` in a commit message or pull request, and it links to work item 1234. `Fixes AB#1234` moves the work item to done when the pull request merges.',
      '**Interview-ready answer**',
      '"I connect the GitHub repository to Azure Pipelines through the Azure Pipelines GitHub App, which creates a service connection. The YAML file lives in the GitHub repo, pushes and pull requests trigger the pipeline, and the result shows as a status check that I make required with branch protection. I also use GitHub repos as template repositories through `resources.repositories`, and link commits to Azure Boards with `AB#` mentions."',
    ],
    followUps: [
      'Why is the GitHub App preferred over a PAT for the service connection?',
      'How do you stop pipelines from running secrets on pull requests from forks?',
      'When would you move the pipeline itself to GitHub Actions instead?',
    ],
    code: [
      {
        title: 'azure-pipelines.yml in the GitHub repository',
        language: 'yaml',
        code: `# azure-pipelines.yml in the GitHub repository
trigger:
  branches:
    include: [main]

pr:
  branches:
    include: [main]

pool:
  vmImage: ubuntu-latest

steps:
  - script: npm ci && npm test
    displayName: Build and test`,
      },
      {
        title: 'Another GitHub repository as a resource',
        language: 'yaml',
        code: `resources:
  repositories:
    - repository: templates
      type: github
      name: my-org/pipeline-templates
      endpoint: github-connection      # the GitHub service connection
      ref: refs/heads/main

steps:
  - checkout: self
  - checkout: templates`,
      },
    ],
    tags: ['azure devops', 'github', 'azure pipelines', 'azure boards'],
  },
  {
    id: 'itv-rglb2-19',
    level: 'basic',
    kind: 'open',
    prompt: 'What are slots in a Web App?',
    probing:
      'What a slot is, why it gives zero-downtime releases and instant rollback, sticky slot settings, and the tier requirement.',
    answer: [
      'A **deployment slot** is a **separate live copy of your web app** with its own hostname, for example `app-prod-staging.azurewebsites.net`. The default slot is **production**; you add others like **staging** or **qa**.',
      '**Why use deployment slots**',
      '- **Test before going live:** deploy to staging and test it with real settings.\n- **Zero-downtime release:** the slot is **warmed up** before the swap, so users do not hit a cold start.\n- **Instant rollback:** swap back, and the previous version is live again.\n- **Canary:** send a percentage of traffic to a slot (see the blue/green and canary question).',
      '**Key facts about slots**',
      '- **Plan tier**: Detail: **Standard** or higher (Standard: up to 5 slots, Premium and Isolated: up to 20)\n- **Shared resources**: Detail: All slots run on the **same App Service plan**, so they share its CPU and memory\n- **Slot settings ("sticky")**: Detail: Settings marked **Deployment slot setting** stay with the slot during a swap, for example a staging database connection string\n- **Swap with preview**: Detail: Applies the target slot\'s settings to the source first, so you can check it before finishing the swap\n- **Auto swap**: Detail: Swaps automatically after a successful deployment to the slot\n- **Warm-up**: Detail: Use `applicationInitialization` or health check paths so the app is ready before the swap',
      'In Azure DevOps, deploy to the staging slot with `AzureWebApp@1`, then swap with `AzureAppServiceManage@0`.',
      '**Interview-ready answer**',
      '"Slots are separate live environments of the same web app, each with its own URL, running on the same App Service plan. I deploy to the staging slot, test it, and swap it into production, so the release is zero downtime and rollback is just swapping back. I mark environment-specific settings as slot settings so they stay with the slot. Slots need the Standard tier or higher."',
    ],
    code: [
      {
        title: 'Create a slot, set a sticky setting, swap',
        language: 'bash',
        code: `az webapp deployment slot create -g rg-app -n app-prod --slot staging
az webapp config appsettings set -g rg-app -n app-prod --slot staging \\
  --slot-settings ENVIRONMENT=staging
az webapp deployment slot swap -g rg-app -n app-prod --slot staging --target-slot production`,
      },
      {
        title: 'Azure DevOps: deploy to staging, then swap',
        language: 'yaml',
        code: `# Azure DevOps: deploy to staging, then swap
- task: AzureWebApp@1
  inputs:
    azureSubscription: sc-azure-prod
    appName: app-prod
    deployToSlotOrASE: true
    resourceGroupName: rg-app
    slotName: staging
    package: $(Pipeline.Workspace)/drop/*.zip
- task: AzureAppServiceManage@0
  inputs:
    azureSubscription: sc-azure-prod
    Action: Swap Slots
    WebAppName: app-prod
    ResourceGroupName: rg-app
    SourceSlot: staging`,
      },
    ],
    tags: ['app service', 'deployment slots', 'zero downtime'],
  },
  {
    id: 'itv-rglb2-20',
    level: 'intermediate',
    kind: 'open',
    prompt: 'Explain Azure Front Door, VNet peering, private endpoints, IaaS and PaaS.',
    probing:
      'A crisp definition of each, the non-transitive nature of peering, the Private DNS requirement for private endpoints, the IaaS/PaaS responsibility split, and how they fit in one architecture.',
    answer: [
      '**Azure Front Door explained**',
      "A **global** entry point for web applications. It is a Layer 7 load balancer and CDN that runs at Microsoft's edge locations around the world. It sends users to the **nearest healthy backend**, handles TLS, caches static content and includes a **WAF**. Used for multi-region apps and failover between regions.",
      '**VNet peering explained**',
      'Connects **two virtual networks** so resources in them talk using **private IPs** over the Microsoft backbone, with low latency. It works in the same region or across regions (global peering). Peering is **not transitive**: if A is peered with B and B with C, A cannot reach C unless you add peering or route through a hub firewall. Used in **hub-and-spoke** networks.',
      '**Private endpoint explained**',
      'A **network interface with a private IP in your subnet** that connects to a PaaS service such as Storage, Key Vault, SQL or ACR. Traffic stays on the private network, and you can **disable public access** to the service. It needs **Private DNS zones** (for example `privatelink.blob.core.windows.net`) so the service name resolves to the private IP.',
      '**IaaS (Infrastructure as a Service)**',
      'Azure gives you the infrastructure (**VMs, disks, networks**); **you manage the OS**, patching, runtime and application. Example: Azure Virtual Machines. Most control, most work.',
      '**PaaS (Platform as a Service)**',
      'Azure manages the infrastructure **and the OS and runtime**; **you manage only your code and data**. Examples: App Service, Azure SQL Database, Azure Functions, AKS (partly). Less work, less control.',
      '- **You manage**: IaaS: OS, runtime, app, data; PaaS: App and data; SaaS: Only your data and users\n- **Example**: IaaS: Azure VMs; PaaS: App Service, Azure SQL; SaaS: Microsoft 365',
      '**How they fit together:** users reach Front Door, which forwards to App Service in a spoke VNet; App Service reaches Azure SQL and Key Vault through private endpoints; the hub VNet holds the firewall and VPN and is peered with the spokes; a legacy app on VMs (IaaS) sits in another spoke.',
      '**Interview-ready answer**',
      '"Front Door is a global Layer 7 entry point with WAF, caching and routing to the nearest healthy region. VNet peering connects two VNets over private IPs, and it is not transitive, so we use hub-and-spoke. A private endpoint gives a PaaS service a private IP inside my VNet, so I can turn off its public access, with Private DNS zones for name resolution. IaaS means I manage the OS, like with VMs, and PaaS means Azure manages the platform and I manage only my app and data, like with App Service and Azure SQL."',
    ],
    followUps: [
      'What is the difference between a private endpoint and a service endpoint?',
      'Spoke A cannot reach spoke B through the hub. What do you check?',
      'How do you stop users bypassing Front Door and calling the origin directly?',
    ],
    code: [
      {
        title: 'How they fit together',
        language: 'text',
        code: `Users ──► Azure Front Door (global, WAF)
            ──► App Service (PaaS) in the spoke VNet
                  ──► Azure SQL / Key Vault through private endpoints
            Hub VNet (firewall, VPN) ◄── peering ──► spoke VNets
            Legacy app on VMs (IaaS) in another spoke`,
      },
    ],
    tags: ['azure front door', 'vnet peering', 'private endpoints', 'iaas', 'paas'],
  },
  {
    id: 'itv-rglb2-21',
    level: 'advanced',
    kind: 'open',
    prompt:
      'Explain the traffic flow from a user on the internet to an application in a container in a pod.',
    probing:
      'Every hop in order (DNS, edge/WAF, Azure Load Balancer, ingress controller, Ingress rule, ClusterIP Service, kube-proxy, pod targetPort), readiness gating, and how AGIC changes the path.',
    answer: [
      'A typical AKS setup with an ingress controller is shown in the first code sample.',
      '**Step by step traffic flow**',
      "1. **DNS:** the user types `app.example.com`. DNS returns the public IP of the entry point.\n2. **Edge / WAF (optional):** Front Door or Application Gateway terminates TLS, checks the WAF rules, and forwards the request.\n3. **Azure Load Balancer:** AKS creates it for any Service of type `LoadBalancer`. It sends the traffic to a node.\n4. **Ingress controller:** the NGINX ingress controller pod receives the request.\n5. **Ingress rules:** it matches the **host** and **path** (for example `/api` to `api-service`) and forwards to that **ClusterIP Service**.\n6. **Service:** the Service has a stable virtual IP. **kube-proxy** (iptables/IPVS) or the CNI sends the request to one of the **ready** pod IPs.\n7. **Pod and container:** the request reaches the pod IP on the `targetPort`, and the container's application handles it.",
      'The response goes back the same way.',
      '**With the Application Gateway Ingress Controller (AGIC) or Application Gateway for Containers,** the gateway sends traffic **directly to the pod IPs**, so there is no in-cluster NGINX hop.',
      '**Only ready pods get traffic:** a pod is added to the Service endpoints only when its **readiness probe** passes.',
      'Note: the community `ingress-nginx` project has been retired, so on new AKS clusters the NGINX hop is usually the managed application routing add-on, or Application Gateway for Containers with the Gateway API. The flow of hops is the same.',
      '**Interview-ready answer**',
      '"The user\'s DNS lookup returns the public IP of the entry point, usually Front Door or Application Gateway with WAF. From there the traffic reaches the Azure Load Balancer that AKS created for the ingress controller\'s LoadBalancer Service. The NGINX ingress controller matches the host and path in the Ingress rules and forwards to a ClusterIP Service. The Service, through kube-proxy, sends the request to one of the ready pod IPs on the target port, and the container handles it. With AGIC, Application Gateway sends traffic straight to the pod IPs."',
    ],
    followUps: [
      'Users get a 502 from the ingress. Which hops do you check, and with which commands?',
      'What does `externalTrafficPolicy: Local` change on the Load Balancer hop?',
      'How does the path change with Azure CNI Overlay compared with Azure CNI with pod subnet?',
    ],
    traps: [
      'Forgetting the readiness probe: a running pod that is not Ready gets no traffic from the Service.',
      'Saying the Service port and the container port must match: the Service forwards from `port` to `targetPort`.',
    ],
    code: [
      {
        title: 'Traffic flow from browser to container',
        language: 'text',
        code: `User's browser
  1. DNS: app.example.com ──► public IP (of Front Door / App Gateway / Load Balancer)
  2. Azure Front Door or Application Gateway (TLS, WAF)            [optional]
  3. Azure Load Balancer (public IP)  ──► AKS node
  4. Ingress controller Service (type LoadBalancer) ──► ingress pod (NGINX)
  5. Ingress rule: host + path ──► backend Service (ClusterIP)
  6. Service ──► one of the healthy pod IPs (Endpoints)
  7. Pod ──► container port (for example 8080) ──► application`,
      },
      {
        title: 'Ingress and ClusterIP Service',
        language: 'yaml',
        code: `apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: myapp
spec:
  ingressClassName: nginx
  tls:
    - hosts: [app.example.com]
      secretName: app-tls
  rules:
    - host: app.example.com
      http:
        paths:
          - path: /api
            pathType: Prefix
            backend:
              service:
                name: api-service
                port:
                  number: 80
---
apiVersion: v1
kind: Service
metadata:
  name: api-service
spec:
  type: ClusterIP
  selector:
    app: api
  ports:
    - port: 80
      targetPort: 8080`,
      },
    ],
    tags: ['aks', 'kubernetes networking', 'ingress', 'traffic flow'],
  },
  {
    id: 'itv-rglb2-22',
    level: 'intermediate',
    kind: 'open',
    prompt: 'What is Cloud NAT?',
    probing:
      "Recognising it as Google Cloud's managed outbound NAT, mapping it to Azure NAT Gateway, and the reasons for it: private workloads, a fixed egress IP and SNAT port capacity.",
    answer: [
      "**Cloud NAT** is **Google Cloud's** managed NAT service. It lets **private resources without public IPs** (VMs, GKE nodes) make **outbound** connections to the internet, for example to download packages or call external APIs. It does **not** allow inbound connections from the internet.",
      '**The equivalents in other clouds**',
      '- **Google Cloud**: Service: **Cloud NAT**\n- **Azure**: Service: **Azure NAT Gateway**\n- **AWS**: Service: **NAT Gateway**',
      '**Why Cloud NAT is used**',
      "- **Security:** VMs and Kubernetes nodes stay private (no public IP), but can still reach the internet outbound.\n- **Fixed outbound IP:** all outbound traffic uses the NAT's static public IP(s), so external partners can **allow-list** that IP.\n- **Avoid SNAT port exhaustion:** a NAT gateway provides many more SNAT ports than default outbound access or a load balancer's outbound rules, so busy apps do not run out of outbound connections.",
      '**Azure example:** create a NAT Gateway with a Standard public IP and attach it to a subnet. For AKS you can use `--outbound-type managedNATGateway` or `userAssignedNATGateway`.',
      'Default outbound access for new Azure VNets is being retired, so new subnets need an explicit outbound method such as NAT Gateway.',
      '**Interview-ready answer**',
      '"Cloud NAT is Google Cloud\'s managed NAT service. It lets private VMs and GKE nodes without public IPs make outbound internet connections, while blocking inbound connections. In Azure the equivalent is NAT Gateway, which I attach to a subnet. It gives a fixed outbound IP that partners can allow-list, keeps workloads private, and provides enough SNAT ports to avoid outbound connection failures."',
    ],
    followUps: [
      'How do you recognise SNAT port exhaustion on an AKS cluster?',
      'What is the difference between AKS outbound type `loadBalancer`, `managedNATGateway` and `userDefinedRouting`?',
      'When would you send outbound traffic through Azure Firewall instead of a NAT Gateway?',
    ],
    code: [
      {
        title: 'Azure NAT Gateway on a subnet',
        language: 'bash',
        code: `az network public-ip create -g rg-net -n pip-nat --sku Standard
az network nat gateway create -g rg-net -n nat-app --public-ip-addresses pip-nat --idle-timeout 10
az network vnet subnet update -g rg-net --vnet-name vnet-app -n snet-aks --nat-gateway nat-app`,
      },
    ],
    tags: ['networking', 'nat gateway', 'cloud nat', 'outbound connectivity'],
  },
  {
    id: 'itv-rglb2-23',
    level: 'basic',
    kind: 'open',
    prompt: 'What is the difference between a stage and a job in an Azure DevOps pipeline?',
    probing:
      'The Pipeline > Stages > Jobs > Steps hierarchy, default sequential versus parallel execution, one agent per job, and that approvals sit on stages through environments.',
    answer: [
      'A pipeline is built like this: **Pipeline > Stages > Jobs > Steps**.',
      '- **What it is**: Stage: A **major phase** of the pipeline, for example Build, Deploy Dev, Deploy Prod; Job: A **set of steps that runs on one agent**\n- **Contains**: Stage: One or more jobs; Job: Steps (tasks and scripts)\n- **Runs on**: Stage: Not an agent itself; its jobs pick agents; Job: **One agent** per job; each job gets a fresh agent\n- **Order by default**: Stage: Stages run **one after another**; Job: Jobs in the same stage run **in parallel** (if agents are available)\n- **Dependencies**: Stage: `dependsOn` and `condition` between stages; Job: `dependsOn` and `condition` between jobs\n- **Approvals and checks**: Stage: Yes, through **environments** (approvals, business hours, branch control); Job: No approvals on a job itself; a `deployment` job targets an environment\n- **Sharing files**: Stage: Through **pipeline artifacts**; Job: Jobs do not share a file system; use artifacts or output variables\n- **Rerun**: Stage: You can rerun a failed stage; Job: Rerun failed jobs within a stage',
      'In the example, `BuildApi` and `BuildWeb` run in parallel in the Build stage, and `DeployProd` runs only after Build succeeds on `main`, with the approval configured on the `prod` environment.',
      '**Interview-ready answer**',
      '"A stage is a major phase of the pipeline, like Build or Deploy to Prod, and a job is a group of steps that runs on one agent. A stage contains one or more jobs. By default stages run in order and jobs in the same stage run in parallel. Each job gets a fresh agent, so jobs share files through artifacts. Approvals and checks are applied at the stage level through environments, which is why I put each environment in its own stage."',
    ],
    code: [
      {
        title: 'Stages and jobs',
        language: 'yaml',
        code: `stages:
  - stage: Build
    jobs:
      - job: BuildApi
        pool:
          vmImage: ubuntu-latest
        steps:
          - script: dotnet build
          - publish: $(Build.ArtifactStagingDirectory)
            artifact: api

      - job: BuildWeb               # runs in parallel with BuildApi
        pool:
          vmImage: ubuntu-latest
        steps:
          - script: npm ci && npm run build

  - stage: DeployProd
    dependsOn: Build
    condition: and(succeeded(), eq(variables['Build.SourceBranch'], 'refs/heads/main'))
    jobs:
      - deployment: DeployApi
        environment: prod           # approval is configured on this environment
        strategy:
          runOnce:
            deploy:
              steps:
                - script: echo "deploying"`,
      },
    ],
    tags: ['azure devops', 'pipelines', 'stages', 'jobs'],
  },
  {
    id: 'itv-rglb2-24',
    level: 'advanced',
    kind: 'scenario',
    prompt: 'Give a particular use case where you would use VPA.',
    probing:
      'A workload that cannot scale out, using `Off` mode for recommendations before `Auto`, setting min/max bounds, and knowing the HPA conflict and the restart impact.',
    answer: [
      'The **Vertical Pod Autoscaler (VPA)** changes the **CPU and memory requests (and limits) of a pod**, not the number of pods. HPA scales **out** (more pods); VPA scales **up** (bigger pods).',
      '**Use case (real-world example):** we had a **nightly report/ETL worker** on AKS that ran as a **single replica**. It could not run as several copies because it processed one batch at a time. The team had guessed the requests: `cpu: 250m, memory: 512Mi`. As data grew, the pod got **OOMKilled** and was CPU-throttled, so the job ran for hours. Other services had the opposite problem: they requested `2 CPU / 4Gi` but used about 10% of it, so nodes looked "full" and we paid for capacity we did not use.',
      'We first deployed VPA in **`Off` (recommendation) mode** for a week to see real usage. Then we switched the worker to **`Auto`** with a `minAllowed` and `maxAllowed` range. VPA raised its memory to about 1.5Gi and the OOMKills stopped. For the over-sized services we used the recommendations to **right-size requests**, which let more pods fit per node and reduced the node count.',
      '**VPA update modes explained**',
      '- **`Off`**: What VPA does: Only gives **recommendations**; changes nothing. Good for right-sizing.\n- **`Initial`**: What VPA does: Sets requests **only when a pod is created**; never evicts running pods.\n- **`Recreate` / `Auto`**: What VPA does: **Evicts** pods whose requests are far from the recommendation, and they restart with new values. (Newer Kubernetes and VPA versions can resize pods in place.)',
      '**When I would use VPA**',
      '- **Single-replica or stateful workloads** that cannot scale out: batch jobs, workers, some databases, legacy apps.\n- **Right-sizing**: you do not know the correct requests, so you use `Off` mode to get recommendations.\n- Workloads that keep getting **OOMKilled** or **CPU-throttled** because requests were guessed too low.\n- **Cost saving**: over-requested pods waste node capacity.',
      '**Things to be careful about**',
      '- **Do not use VPA and HPA on the same metric** (CPU or memory) for the same workload; they fight each other. You can combine them if HPA uses a custom or external metric (for example requests per second or queue length).\n- In `Auto`/`Recreate` mode, pods are **restarted** to apply new values, so set a **PodDisruptionBudget** and run more than one replica where you can.\n- Always set **`maxAllowed`**, or one memory leak can make VPA request a huge pod that no node can fit.\n- VPA needs the **metrics server** and some days of history to give good recommendations.',
      '**HPA vs VPA compared**',
      '- **Changes**: HPA: Number of pods; VPA: CPU/memory per pod\n- **Best for**: HPA: Stateless apps with changing traffic; VPA: Single-replica, stateful or unknown sizing\n- **Restarts pods**: HPA: No; VPA: Yes, in `Auto`/`Recreate` mode',
      '**Interview-ready answer**',
      '"VPA adjusts the CPU and memory requests of pods instead of the number of pods. I use it for workloads that cannot scale out, like a single-replica batch worker. In one case our nightly report worker kept getting OOMKilled because its memory request was a guess. I ran VPA in Off mode for a week to get recommendations, then switched it to Auto with min and max limits, and the OOMKills stopped. I also use Off mode to right-size over-requested services and save node cost. I don\'t run VPA and HPA on the same CPU or memory metric, because they conflict."',
    ],
    followUps: [
      'How would you combine VPA and HPA on the same Deployment safely?',
      'What do the Target, Lower Bound and Upper Bound recommendations mean?',
      'Why can VPA in Auto mode cause an outage on a single-replica workload, and how do you limit it?',
    ],
    traps: [
      'Running VPA in Auto mode and HPA on CPU for the same Deployment: the two controllers fight.',
      'Leaving out `maxAllowed`: a memory leak can push requests beyond what any node can fit.',
    ],
    code: [
      {
        title: 'VPA for the report worker',
        language: 'yaml',
        code: `apiVersion: autoscaling.k8s.io/v1
kind: VerticalPodAutoscaler
metadata:
  name: report-worker-vpa
spec:
  targetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: report-worker
  updatePolicy:
    updateMode: "Auto"        # Off = recommend only, Initial = only on pod creation, Recreate/Auto = evict and resize
  resourcePolicy:
    containerPolicies:
      - containerName: "*"
        minAllowed:
          cpu: 250m
          memory: 512Mi
        maxAllowed:
          cpu: "2"
          memory: 4Gi
        controlledResources: ["cpu", "memory"]`,
      },
      {
        title: 'Enable the AKS VPA add-on and read recommendations',
        language: 'bash',
        code: `# On AKS, VPA is a managed add-on
az aks update -g rg-aks -n aks-prod --enable-vpa

kubectl get vpa
kubectl describe vpa report-worker-vpa   # shows Target, Lower Bound, Upper Bound recommendations`,
      },
    ],
    tags: ['kubernetes', 'aks', 'vpa', 'autoscaling', 'right-sizing'],
  },
]
