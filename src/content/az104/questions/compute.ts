import type { Question } from '../../types'

/** Original practice questions for this domain. Written for this app. */
export const az104ComputeQuestions: Question[] = [
  /* ------------------------------------------------------------ ARM / Bicep */
  {
    id: 'az1q-cmp-1',
    domainId: 'az1-compute',
    topicId: 'az1-arm-bicep',
    kind: 'mcq',
    category: 'concept',
    difficulty: 'intermediate',
    points: 2,
    prompt:
      'Resource group rg-shared contains a VM, a storage account and a Key Vault. You deploy a template that declares only the storage account, using --mode Complete. What is the result?',
    options: [
      { id: 'a', text: 'The storage account is updated and the VM and Key Vault are unchanged' },
      { id: 'b', text: 'The storage account is updated and the VM and Key Vault are deleted' },
      { id: 'c', text: 'The deployment fails because the template does not list every resource' },
      { id: 'd', text: 'The VM and Key Vault are moved to a new resource group' },
    ],
    correct: ['b'],
    explanation:
      'Complete mode makes the resource group match the template exactly, so resources not declared are deleted. Leaving them unchanged is the behaviour of the default Incremental mode. The deployment does not fail for missing resources, and ARM never moves resources as part of a deployment.',
  },
  {
    id: 'az1q-cmp-2',
    domainId: 'az1-compute',
    topicId: 'az1-arm-bicep',
    kind: 'command',
    category: 'command',
    difficulty: 'intermediate',
    points: 2,
    prompt:
      'Write the Azure CLI command that previews the changes main.bicep would make to resource group rg-prod, without deploying anything.',
    acceptedAnswers: [
      'az deployment group what-if --resource-group rg-prod --template-file main.bicep',
      'az deployment group what-if -g rg-prod --template-file main.bicep',
      'az deployment group what-if -g rg-prod -f main.bicep',
      'az deployment group what-if --resource-group rg-prod -f main.bicep',
      'az deployment group what-if --template-file main.bicep --resource-group rg-prod',
      'az deployment group what-if --template-file main.bicep -g rg-prod',
    ],
    answerHint: 'az deployment group ...',
    explanation:
      '`what-if` returns Create, Modify, Delete and NoChange per resource. `validate` only runs preflight checks and does not produce a change list, and `create --confirm-with-what-if` would go on to deploy after confirmation.',
  },
  {
    id: 'az1q-cmp-3',
    domainId: 'az1-compute',
    topicId: 'az1-arm-bicep',
    kind: 'mcq',
    category: 'yaml',
    difficulty: 'intermediate',
    points: 2,
    prompt:
      "A Bicep file begins with targetScope = 'subscription' and declares three resource groups. Which command deploys it?",
    code: {
      title: 'main.bicep (excerpt)',
      language: 'bicep',
      code: `targetScope = 'subscription'

resource rgs 'Microsoft.Resources/resourceGroups@2024-03-01' = [for name in ['rg-a', 'rg-b', 'rg-c']: {
  name: name
  location: 'westeurope'
}]`,
    },
    options: [
      { id: 'a', text: 'az deployment group create -g rg-a --template-file main.bicep' },
      {
        id: 'b',
        text: 'az deployment sub create --location westeurope --template-file main.bicep',
      },
      { id: 'c', text: 'az group create --template-file main.bicep' },
      {
        id: 'd',
        text: 'az deployment mg create --management-group-id root --template-file main.bicep',
      },
    ],
    correct: ['b'],
    explanation:
      'A subscription-scope file is deployed with `az deployment sub create`, which needs a location for the deployment metadata. A group deployment cannot create resource groups, `az group create` does not take templates, and a management group deployment is the wrong scope for this file.',
  },
  {
    id: 'az1q-cmp-4',
    domainId: 'az1-compute',
    topicId: 'az1-arm-bicep',
    kind: 'multi',
    category: 'concept',
    difficulty: 'intermediate',
    points: 2,
    prompt:
      'You want to reuse the configuration of an existing, manually built resource group as a Bicep file. Which actions help? (Select all that apply.)',
    options: [
      {
        id: 'a',
        text: 'Export the resource group template from the portal or with az group export',
      },
      { id: 'b', text: 'Run az bicep decompile on the exported JSON' },
      { id: 'c', text: 'Run az bicep build on the exported JSON' },
      { id: 'd', text: 'Replace hard-coded names and locations with parameters before reuse' },
      { id: 'e', text: 'Run az deployment group what-if to generate a Bicep file' },
    ],
    correct: ['a', 'b', 'd'],
    explanation:
      'Export produces ARM JSON, decompile converts it to Bicep, and cleaning up hard-coded values makes it reusable. `az bicep build` goes the other way (Bicep to JSON), and what-if compares a template with Azure but never generates one.',
  },
  {
    id: 'az1q-cmp-5',
    domainId: 'az1-compute',
    topicId: 'az1-arm-bicep',
    kind: 'mcq',
    category: 'yaml',
    difficulty: 'beginner',
    points: 1,
    prompt:
      'In an ARM template, which expression sets a resource location to the same region as the resource group being deployed to?',
    options: [
      { id: 'a', text: '[resourceGroup().location]' },
      { id: 'b', text: '[subscription().location]' },
      { id: 'c', text: "[parameters('resourceGroup')]" },
      { id: 'd', text: '[deployment().location]' },
    ],
    correct: ['a'],
    explanation:
      '`resourceGroup().location` returns the region of the target resource group. Subscriptions have no location property, the parameters function only reads declared parameters, and `deployment().location` applies to subscription and higher-scope deployments.',
  },
  /* -------------------------------------------------------- virtual machines */
  {
    id: 'az1q-cmp-6',
    domainId: 'az1-compute',
    topicId: 'az1-virtual-machines',
    kind: 'mcq',
    category: 'troubleshoot',
    difficulty: 'beginner',
    points: 1,
    prompt:
      'You try to resize a running VM from Standard_B2s to Standard_M32ms and the size is not offered in the list of available sizes, although the region supports it. What should you do first?',
    options: [
      { id: 'a', text: 'Redeploy the VM to a new resource group' },
      { id: 'b', text: 'Stop (deallocate) the VM, then resize it' },
      { id: 'c', text: 'Detach all data disks, then resize it' },
      { id: 'd', text: 'Convert the OS disk to Premium SSD v2' },
    ],
    correct: ['b'],
    explanation:
      'Only sizes available on the current hardware cluster are shown for a running VM. Deallocating releases the host so Azure can place the VM on a cluster that offers the target size. Changing resource group or detaching disks has no effect on size availability, and Premium SSD v2 cannot be an OS disk.',
  },
  {
    id: 'az1q-cmp-7',
    domainId: 'az1-compute',
    topicId: 'az1-virtual-machines',
    kind: 'mcq',
    category: 'concept',
    difficulty: 'intermediate',
    points: 2,
    prompt:
      "A compliance rule states that data on a VM's temporary disk and in OS and data disk caches must be encrypted, and no agent or encryption software may run in the guest OS. Which option meets the requirement?",
    options: [
      { id: 'a', text: 'Server-side encryption with platform-managed keys only' },
      { id: 'b', text: 'Azure Disk Encryption with BitLocker' },
      { id: 'c', text: 'Encryption at host' },
      { id: 'd', text: 'A storage account firewall' },
    ],
    correct: ['c'],
    explanation:
      'Encryption at host encrypts the temporary disk and disk caches on the host before data flows to storage, with nothing inside the guest. SSE alone protects data at rest in storage but not the temp disk and caches; ADE runs inside the guest; a storage firewall is about network access, not encryption.',
  },
  {
    id: 'az1q-cmp-8',
    domainId: 'az1-compute',
    topicId: 'az1-virtual-machines',
    kind: 'multi',
    category: 'concept',
    difficulty: 'intermediate',
    points: 2,
    prompt:
      'You plan to deploy two VMs for an application that must remain available if a single datacenter in the region fails. Which statements are true? (Select all that apply.)',
    options: [
      { id: 'a', text: 'Place the VMs in different availability zones' },
      { id: 'b', text: 'An availability set with two fault domains meets the requirement' },
      { id: 'c', text: 'The zone must be chosen when each VM is created' },
      { id: 'd', text: 'A load balancer or similar service must distribute traffic to both VMs' },
      { id: 'e', text: 'A single VM with Premium SSD disks meets the requirement' },
    ],
    correct: ['a', 'c', 'd'],
    explanation:
      'Only availability zones place VMs in physically separate datacenters, the zone is fixed at creation, and something must route traffic to whichever VM is healthy. An availability set protects against rack and host failures inside one datacenter, and a single VM cannot survive the loss of its own datacenter regardless of disk type.',
  },
  {
    id: 'az1q-cmp-9',
    domainId: 'az1-compute',
    topicId: 'az1-virtual-machines',
    kind: 'mcq',
    category: 'concept',
    difficulty: 'beginner',
    points: 1,
    prompt:
      'An application writes working files to the D: drive of a Windows VM. After the VM is stopped (deallocated) over the weekend, the files are missing. Why?',
    options: [
      { id: 'a', text: 'Azure Backup deleted them during the retention cycle' },
      { id: 'b', text: 'D: is the temporary disk, which is not persistent across deallocation' },
      { id: 'c', text: 'Standard HDD disks are wiped when a VM stops' },
      { id: 'd', text: 'The disk encryption set rotated its key' },
    ],
    correct: ['b'],
    explanation:
      'The temporary disk is host-local storage and is lost when a VM is deallocated or moved to another host. Managed disks of any type keep their data, Backup does not delete live files, and key rotation does not remove data.',
  },
  {
    id: 'az1q-cmp-10',
    domainId: 'az1-compute',
    topicId: 'az1-virtual-machines',
    kind: 'command',
    category: 'command',
    difficulty: 'intermediate',
    points: 2,
    prompt:
      'Write the Azure CLI command that attaches a NEW 256 GB Premium SSD data disk named data02 to VM vm-app1 in resource group rg-app.',
    acceptedAnswers: [
      'az vm disk attach -g rg-app --vm-name vm-app1 --name data02 --new --size-gb 256 --sku Premium_LRS',
      'az vm disk attach --resource-group rg-app --vm-name vm-app1 --name data02 --new --size-gb 256 --sku Premium_LRS',
      'az vm disk attach -g rg-app --vm-name vm-app1 -n data02 --new --size-gb 256 --sku Premium_LRS',
      'az vm disk attach -g rg-app --vm-name vm-app1 --name data02 --size-gb 256 --sku Premium_LRS --new',
    ],
    answerHint: 'az vm disk attach ... --new ...',
    explanation:
      '`az vm disk attach --new` creates the managed disk and attaches it in one step; `--sku Premium_LRS` selects Premium SSD. Without `--new` the command expects an existing disk. Afterwards, partition and format the disk inside the guest OS.',
  },
  /* ------------------------------------------------------------- scale sets */
  {
    id: 'az1q-cmp-11',
    domainId: 'az1-compute',
    topicId: 'az1-vm-scale-sets',
    kind: 'mcq',
    category: 'troubleshoot',
    difficulty: 'intermediate',
    points: 2,
    prompt:
      'A scale set has one autoscale rule: add 2 instances when average CPU exceeds 75% for 10 minutes. After a busy morning it stays at the maximum instance count all night. What is missing?',
    options: [
      { id: 'a', text: 'A health probe on the load balancer' },
      { id: 'b', text: 'A scale-in rule that decreases the count when CPU is low' },
      { id: 'c', text: 'The Rolling upgrade policy' },
      { id: 'd', text: 'A larger cool down on the scale-out rule' },
    ],
    correct: ['b'],
    explanation:
      'Autoscale only scales in when a scale-in rule tells it to. A health probe affects instance health and repairs, the upgrade policy affects model changes, and a longer cool down would only slow scale-out further.',
  },
  {
    id: 'az1q-cmp-12',
    domainId: 'az1-compute',
    topicId: 'az1-vm-scale-sets',
    kind: 'mcq',
    category: 'concept',
    difficulty: 'intermediate',
    points: 2,
    prompt:
      'You update the image of a production scale set. Instances must be upgraded automatically, but no more than 20% at a time, and the upgrade must stop if upgraded instances become unhealthy. Which upgrade policy do you configure?',
    options: [
      { id: 'a', text: 'Manual' },
      { id: 'b', text: 'Automatic' },
      { id: 'c', text: 'Rolling' },
      { id: 'd', text: 'Automatic OS image upgrade disabled' },
    ],
    correct: ['c'],
    explanation:
      'Rolling upgrades apply changes in batches (maxBatchInstancePercent), pause between them and stop when too many instances are unhealthy. Manual waits for an operator, Automatic upgrades all instances without batch control, and disabling automatic OS image upgrades does nothing for this requirement.',
  },
  {
    id: 'az1q-cmp-13',
    domainId: 'az1-compute',
    topicId: 'az1-vm-scale-sets',
    kind: 'multi',
    category: 'concept',
    difficulty: 'intermediate',
    points: 2,
    prompt:
      'Which statements about Virtual Machine Scale Set orchestration modes are correct? (Select all that apply.)',
    options: [
      { id: 'a', text: 'Flexible mode lets you mix VM sizes and Spot with standard instances' },
      {
        id: 'b',
        text: 'Uniform mode instances are managed through the scale set API from one model',
      },
      { id: 'c', text: 'You can switch an existing scale set from Uniform to Flexible in place' },
      { id: 'd', text: 'Flexible mode is recommended for most new scale sets' },
      { id: 'e', text: 'Uniform mode cannot be used with autoscale' },
    ],
    correct: ['a', 'b', 'd'],
    explanation:
      "Flexible mode creates ordinary VMs, supports mixing sizes and pricing, and is Microsoft's recommendation for new workloads; Uniform mode manages identical instances from one model. Orchestration mode is fixed at creation, and both modes support autoscale.",
  },
  {
    id: 'az1q-cmp-14',
    domainId: 'az1-compute',
    topicId: 'az1-vm-scale-sets',
    kind: 'command',
    category: 'command',
    difficulty: 'advanced',
    points: 2,
    prompt:
      'An autoscale setting named as-web exists in resource group rg-web. Write the Azure CLI command that adds a rule to scale OUT by 1 instance when average Percentage CPU is greater than 70 over 10 minutes.',
    acceptedAnswers: [
      'az monitor autoscale rule create -g rg-web --autoscale-name as-web --condition "Percentage CPU > 70 avg 10m" --scale out 1',
      'az monitor autoscale rule create --resource-group rg-web --autoscale-name as-web --condition "Percentage CPU > 70 avg 10m" --scale out 1',
      'az monitor autoscale rule create --autoscale-name as-web -g rg-web --condition "Percentage CPU > 70 avg 10m" --scale out 1',
      'az monitor autoscale rule create -g rg-web --autoscale-name as-web --scale out 1 --condition "Percentage CPU > 70 avg 10m"',
    ],
    answerHint: 'az monitor autoscale rule create ...',
    explanation:
      'Autoscale rules belong to Azure Monitor, so the command is under `az monitor autoscale rule`. The condition string is metric, operator, threshold, aggregation and window. `az vmss scale` would set the capacity once, not create a rule.',
  },
  /* ------------------------------------------------------------- containers */
  {
    id: 'az1q-cmp-15',
    domainId: 'az1-compute',
    topicId: 'az1-containers',
    kind: 'mcq',
    category: 'concept',
    difficulty: 'intermediate',
    points: 2,
    prompt:
      'A container registry must be replicated to a second region and reachable only through a private endpoint. Which ACR SKU is the minimum?',
    options: [
      { id: 'a', text: 'Basic' },
      { id: 'b', text: 'Standard' },
      { id: 'c', text: 'Premium' },
      { id: 'd', text: 'Any SKU, with the admin user enabled' },
    ],
    correct: ['c'],
    explanation:
      'Geo-replication and private endpoints are Premium features. Basic and Standard differ mainly in included storage and throughput, and the admin user is an authentication setting that has nothing to do with replication or private networking.',
  },
  {
    id: 'az1q-cmp-16',
    domainId: 'az1-compute',
    topicId: 'az1-containers',
    kind: 'mcq',
    category: 'concept',
    difficulty: 'intermediate',
    points: 2,
    prompt:
      'A Container App must pull images from a private ACR. The security team forbids stored passwords. What should you configure?',
    options: [
      {
        id: 'a',
        text: 'Enable the ACR admin user and store its password as a Container Apps secret',
      },
      {
        id: 'b',
        text: 'Assign the app a managed identity and grant it the AcrPull role on the registry',
      },
      { id: 'c', text: 'Make the registry repository public' },
      { id: 'd', text: "Grant the app's managed identity the Owner role on the subscription" },
    ],
    correct: ['b'],
    explanation:
      'A managed identity with AcrPull authenticates without any stored secret and follows least privilege. The admin user is a stored password, ACR does not offer public repositories by default for this purpose, and Owner on the subscription is far too broad.',
  },
  {
    id: 'az1q-cmp-17',
    domainId: 'az1-compute',
    topicId: 'az1-containers',
    kind: 'multi',
    category: 'concept',
    difficulty: 'advanced',
    points: 2,
    prompt:
      'You need to send 10% of traffic to a new version of a Container App and be able to scale it to zero when idle. Which settings are required? (Select all that apply.)',
    options: [
      { id: 'a', text: 'activeRevisionsMode set to Multiple' },
      { id: 'b', text: 'Traffic weights of 90 and 10 across the two revisions' },
      { id: 'c', text: 'minReplicas set to 0 with an HTTP scale rule' },
      { id: 'd', text: 'minReplicas set to 0 with only a CPU scale rule' },
      { id: 'e', text: 'Restart policy set to OnFailure' },
    ],
    correct: ['a', 'b', 'c'],
    explanation:
      'Traffic splitting requires multiple revision mode and weights, and scale to zero requires minReplicas 0 with a rule that can wake the app, such as HTTP. CPU and memory rules cannot scale from zero because there is no replica to measure, and restart policies belong to ACI, not Container Apps.',
  },
  {
    id: 'az1q-cmp-18',
    domainId: 'az1-compute',
    topicId: 'az1-containers',
    kind: 'task',
    category: 'lab',
    difficulty: 'intermediate',
    points: 3,
    prompt:
      'In resource group rg-batch, create an Azure Container Instances container group named aci-report that runs image mcr.microsoft.com/azuredocs/aci-wordcount:latest once to completion, with 1 vCPU and 1.5 GB memory, no public IP, and restart policy that never restarts it. Then read its logs.',
    context: 'Resource group rg-batch exists in westeurope. You use Cloud Shell (Bash).',
    checkpoints: [
      { id: 'c1', text: 'Container group aci-report exists in rg-batch with osType Linux' },
      { id: 'c2', text: 'restartPolicy is Never' },
      { id: 'c3', text: 'The container requests 1 CPU and 1.5 GB memory' },
      { id: 'c4', text: 'The group has no public IP address' },
      {
        id: 'c5',
        text: 'az container logs returns the word count output and the state is Terminated or Succeeded',
      },
    ],
    explanation:
      'A run-once job should use restart policy Never (or OnFailure if retries are wanted). Omitting --ip-address creates a group without a public IP. Logs remain available after the container exits until the group is deleted.',
    solution: [
      {
        title: 'Azure CLI',
        language: 'bash',
        code: `az container create -g rg-batch -n aci-report \\
  --image mcr.microsoft.com/azuredocs/aci-wordcount:latest \\
  --os-type Linux --cpu 1 --memory 1.5 --restart-policy Never

az container show -g rg-batch -n aci-report \\
  --query "{state:instanceView.state, restart:restartPolicy, ip:ipAddress}"
az container logs -g rg-batch -n aci-report`,
      },
    ],
  },
  /* ------------------------------------------------------------ App Service */
  {
    id: 'az1q-cmp-19',
    domainId: 'az1-compute',
    topicId: 'az1-app-service',
    kind: 'mcq',
    category: 'concept',
    difficulty: 'intermediate',
    points: 2,
    prompt:
      'A web app runs on a Basic B2 plan. The team now needs a staging slot and CPU-based autoscale rules at the lowest cost. What should you do?',
    options: [
      { id: 'a', text: 'Scale out the Basic plan to three instances' },
      { id: 'b', text: 'Scale up the plan to Standard S1' },
      { id: 'c', text: 'Scale up the plan to Isolated v2' },
      { id: 'd', text: 'Create a second Basic plan for the staging app' },
    ],
    correct: ['b'],
    explanation:
      'Deployment slots and rule-based autoscale start at the Standard tier, so scaling up to S1 is the cheapest option. Scaling out a Basic plan adds instances but not features, Isolated v2 is far more expensive than needed, and a separate app in another plan is not a slot and cannot be swapped.',
  },
  {
    id: 'az1q-cmp-20',
    domainId: 'az1-compute',
    topicId: 'az1-app-service',
    kind: 'mcq',
    category: 'troubleshoot',
    difficulty: 'advanced',
    points: 2,
    prompt:
      'After swapping the staging slot into production, the production app connects to the test database. Both slots define a DB_CONNECTION connection string with different values. What prevents this in future?',
    options: [
      { id: 'a', text: 'Enable auto swap on the staging slot' },
      { id: 'b', text: 'Mark DB_CONNECTION as a deployment slot setting in both slots' },
      { id: 'c', text: 'Use swap with preview instead of a direct swap' },
      { id: 'd', text: 'Move the staging slot to a separate App Service plan' },
    ],
    correct: ['b'],
    explanation:
      "Settings marked as deployment slot settings are sticky and stay with their slot during a swap. Auto swap would make the problem happen automatically, swap with preview only adds a validation pause, and slots always share their app's plan.",
  },
  {
    id: 'az1q-cmp-21',
    domainId: 'az1-compute',
    topicId: 'az1-app-service',
    kind: 'multi',
    category: 'concept',
    difficulty: 'advanced',
    points: 2,
    prompt:
      'A web app must read from a storage account that allows access only from a specific VNet subnet, and the app itself must not be reachable from the public internet. Which features do you configure? (Select all that apply.)',
    options: [
      { id: 'a', text: 'VNet integration on the web app using a delegated subnet' },
      { id: 'b', text: 'A private endpoint for the web app' },
      { id: 'c', text: 'Disable public network access on the web app' },
      { id: 'd', text: 'Hybrid Connections to the storage account' },
      { id: 'e', text: 'An App Service managed certificate' },
    ],
    correct: ['a', 'b', 'c'],
    explanation:
      'VNet integration carries outbound traffic into the VNet so the storage firewall rule matches; a private endpoint plus disabling public access makes inbound traffic private. Hybrid Connections reach specific host and port endpoints through a relay and are not how you reach a VNet-restricted storage account, and a certificate secures TLS but not network exposure.',
  },
  {
    id: 'az1q-cmp-22',
    domainId: 'az1-compute',
    topicId: 'az1-app-service',
    kind: 'mcq',
    category: 'concept',
    difficulty: 'intermediate',
    points: 2,
    prompt:
      'You are mapping www.fabrikam.com to web app fabrikam-web. Which records must you create in the fabrikam.com DNS zone for Azure to verify and serve the domain?',
    options: [
      {
        id: 'a',
        text: 'A CNAME www to fabrikam-web.azurewebsites.net and a TXT asuid.www with the verification ID',
      },
      { id: 'b', text: 'An MX record for www pointing to fabrikam-web.azurewebsites.net' },
      { id: 'c', text: 'Only an A record for the apex domain' },
      { id: 'd', text: "A PTR record for the app's inbound IP address" },
    ],
    correct: ['a'],
    explanation:
      'A subdomain uses a CNAME to the default hostname, and the asuid TXT record proves ownership. MX records are for mail, an apex A record does not map www, and PTR records are reverse lookups that App Service does not use for verification.',
  },
  {
    id: 'az1q-cmp-23',
    domainId: 'az1-compute',
    topicId: 'az1-app-service',
    kind: 'task',
    category: 'lab',
    difficulty: 'advanced',
    points: 4,
    prompt:
      'In resource group rg-web, web app contoso-web runs on a Standard S1 plan. Create a slot named staging, add app setting FEATURE_X=on to staging only (not sticky), mark ENVIRONMENT as a slot setting with value staging in the staging slot, then swap staging into production.',
    context:
      'Production already has ENVIRONMENT=production marked as a slot setting. You use Cloud Shell (Bash).',
    checkpoints: [
      { id: 'c1', text: 'Slot staging exists for contoso-web' },
      { id: 'c2', text: 'After the swap, production has FEATURE_X=on' },
      {
        id: 'c3',
        text: 'After the swap, production still has ENVIRONMENT=production with slotSetting true',
      },
      {
        id: 'c4',
        text: 'After the swap, the staging slot has ENVIRONMENT=staging and no FEATURE_X',
      },
    ],
    explanation:
      'Non-sticky settings travel with the swap while sticky settings stay in their slot. That is why FEATURE_X ends up in production while each slot keeps its own ENVIRONMENT value.',
    solution: [
      {
        title: 'Azure CLI',
        language: 'bash',
        code: `az webapp deployment slot create -g rg-web -n contoso-web --slot staging
az webapp config appsettings set -g rg-web -n contoso-web --slot staging --settings FEATURE_X=on
az webapp config appsettings set -g rg-web -n contoso-web --slot staging --slot-settings ENVIRONMENT=staging

az webapp deployment slot swap -g rg-web -n contoso-web --slot staging --target-slot production

az webapp config appsettings list -g rg-web -n contoso-web -o table
az webapp config appsettings list -g rg-web -n contoso-web --slot staging -o table`,
      },
    ],
  },
]
