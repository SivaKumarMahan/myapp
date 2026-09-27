import type { CommandGroup } from '../types'

/**
 * Searchable command reference for AZ-104.
 *
 * Grouped by administrative task. Azure CLI first, with the Azure PowerShell
 * equivalent in the notes for the commands administrators use most.
 */
export const az104CommandGroups: CommandGroup[] = [
  {
    id: 'az1-cmd-identity',
    title: 'Identity and RBAC',
    description: 'Microsoft Entra users and groups, and Azure role assignments.',
    entries: [
      {
        id: 'az1-c-ad-user-create',
        command:
          'az ad user create --display-name <name> --user-principal-name <upn> --password <password>',
        description: 'Create a Microsoft Entra user in the tenant.',
        placeholders: ['<name>', '<upn>', '<password>'],
        example:
          'az ad user create --display-name "Ana Silva" --user-principal-name ana@contoso.onmicrosoft.com --password <password> --force-change-password-next-sign-in true',
        notes:
          'PowerShell (Microsoft Graph): New-MgUser. The AzureAD and MSOnline modules are retired.',
        tags: ['entra', 'users'],
      },
      {
        id: 'az1-c-ad-group-create',
        command: 'az ad group create --display-name <name> --mail-nickname <alias>',
        description: 'Create a security group with assigned membership.',
        placeholders: ['<name>', '<alias>'],
        example: 'az ad group create --display-name "VM Operators" --mail-nickname vmops',
        notes:
          'Dynamic membership rules are configured in the portal or with Microsoft Graph (New-MgGroup -GroupTypes DynamicMembership).',
        tags: ['entra', 'groups'],
      },
      {
        id: 'az1-c-ad-group-member-add',
        command: 'az ad group member add --group <group> --member-id <objectId>',
        description: 'Add a user, group or service principal to a group by object id.',
        placeholders: ['<group>', '<objectId>'],
        example:
          'az ad group member add --group "VM Operators" --member-id $(az ad user show --id ana@contoso.onmicrosoft.com --query id -o tsv)',
        tags: ['entra', 'groups'],
      },
      {
        id: 'az1-c-role-assignment-create',
        command: 'az role assignment create --assignee <principal> --role <role> --scope <scope>',
        description: 'Grant an Azure RBAC role to a user, group or identity at a scope.',
        placeholders: ['<principal>', '<role>', '<scope>'],
        example:
          'az role assignment create --assignee-object-id <groupObjectId> --assignee-principal-type Group --role "Virtual Machine Contributor" --scope /subscriptions/<subId>/resourceGroups/rg-app',
        notes:
          'PowerShell: New-AzRoleAssignment -ObjectId <id> -RoleDefinitionName "Reader" -Scope <scope>. Assignments inherit down to child scopes.',
        tags: ['rbac', 'roles'],
      },
      {
        id: 'az1-c-role-assignment-list',
        command:
          'az role assignment list --assignee <principal> --all --include-inherited -o table',
        description: 'List every role assignment for a principal, including inherited ones.',
        placeholders: ['<principal>'],
        notes:
          'PowerShell: Get-AzRoleAssignment -SignInName <upn>. Group-based assignments show the group, not the user.',
        tags: ['rbac', 'audit'],
      },
      {
        id: 'az1-c-role-definition-list',
        command:
          'az role definition list --name <role> --query "[].{actions:permissions[0].actions, notActions:permissions[0].notActions}"',
        description: 'Show what a built-in or custom role actually allows.',
        placeholders: ['<role>'],
        example: 'az role definition list --name "Contributor"',
        notes: 'PowerShell: Get-AzRoleDefinition -Name "Contributor".',
        tags: ['rbac', 'roles'],
      },
      {
        id: 'az1-c-role-definition-create',
        command: 'az role definition create --role-definition <file.json>',
        description:
          'Create a custom role from a JSON definition with Actions, NotActions, DataActions and AssignableScopes.',
        placeholders: ['<file.json>'],
        notes:
          'Start from an existing role: az role definition list --name "Virtual Machine Contributor" > vm-role.json, then edit. PowerShell: New-AzRoleDefinition -InputFile.',
        tags: ['rbac', 'custom roles'],
      },
    ],
  },
  {
    id: 'az1-cmd-governance',
    title: 'Policy, locks, tags and cost',
    description: 'Governance controls on subscriptions, resource groups and resources.',
    entries: [
      {
        id: 'az1-c-policy-assignment-create',
        command:
          'az policy assignment create --name <name> --policy <definition> --scope <scope> --params <json>',
        description:
          'Assign a policy definition (or --policy-set-definition for an initiative) at a scope.',
        placeholders: ['<name>', '<definition>', '<scope>', '<json>'],
        example:
          'az policy assignment create --name allowed-locations --policy e56962a6-4747-49cd-b67b-bf8b01975c4c --scope /subscriptions/<subId> --params \'{"listOfAllowedLocations":{"value":["westeurope","northeurope"]}}\'',
        notes:
          'Modify and deployIfNotExists effects need --mi-system-assigned --location <region> for the remediation identity. PowerShell: New-AzPolicyAssignment.',
        tags: ['policy', 'governance'],
      },
      {
        id: 'az1-c-policy-state-summarize',
        command: 'az policy state summarize --resource-group <rg>',
        description: 'Summarise compliance results for a scope.',
        placeholders: ['<rg>'],
        notes:
          'Trigger a fresh evaluation with az policy state trigger-scan. PowerShell: Get-AzPolicyStateSummary.',
        tags: ['policy', 'compliance'],
      },
      {
        id: 'az1-c-policy-remediation-create',
        command:
          'az policy remediation create --name <name> --policy-assignment <assignment> --resource-group <rg>',
        description:
          'Remediate existing non-compliant resources for a modify or deployIfNotExists assignment.',
        placeholders: ['<name>', '<assignment>', '<rg>'],
        tags: ['policy', 'remediation'],
      },
      {
        id: 'az1-c-lock-create',
        command:
          'az lock create --name <name> --lock-type <CanNotDelete|ReadOnly> --resource-group <rg>',
        description:
          'Add a delete or read-only lock to a resource group (or --resource for a single resource).',
        placeholders: ['<name>', '<rg>'],
        example:
          'az lock create --name no-delete --lock-type CanNotDelete --resource-group rg-prod',
        notes:
          'Locks apply to everyone, including Owners, and inherit to child resources. ReadOnly can block operations that look like reads, such as listing storage keys. PowerShell: New-AzResourceLock.',
        tags: ['locks', 'governance'],
      },
      {
        id: 'az1-c-tag-update',
        command: 'az tag update --resource-id <id> --operation Merge --tags <key>=<value>',
        description:
          'Add or change tags without removing existing ones (Merge), or Replace/Delete them.',
        placeholders: ['<id>', '<key>', '<value>'],
        example:
          'az tag update --resource-id $(az group show -n rg-app --query id -o tsv) --operation Merge --tags costCenter=1234',
        notes:
          'Tags are not inherited by default; use a Modify policy to inherit from the resource group. PowerShell: Update-AzTag -Operation Merge.',
        tags: ['tags', 'cost'],
      },
      {
        id: 'az1-c-resource-move',
        command: 'az resource move --destination-group <rg> --ids <id1> <id2>',
        description:
          'Move resources to another resource group (add --destination-subscription-id to change subscription).',
        placeholders: ['<rg>', '<id1>', '<id2>'],
        notes:
          'Dependent resources (VM, NIC, disks, public IP) must move together; resource ids change. Validate first in the portal. PowerShell: Move-AzResource.',
        tags: ['move', 'resource groups'],
      },
      {
        id: 'az1-c-consumption-budget',
        command:
          'az consumption budget create --budget-name <name> --amount <amount> --time-grain Monthly --start-date <yyyy-mm-01> --end-date <yyyy-mm-dd> --category Cost',
        description:
          'Create a cost budget. Alert thresholds and action groups are usually configured in Cost Management.',
        placeholders: ['<name>', '<amount>', '<yyyy-mm-01>', '<yyyy-mm-dd>'],
        notes:
          'Budgets alert; they never stop resources on their own. PowerShell: New-AzConsumptionBudget.',
        tags: ['cost', 'budgets'],
      },
      {
        id: 'az1-c-advisor-list',
        command: 'az advisor recommendation list --category Cost -o table',
        description:
          'List Azure Advisor recommendations by category (Cost, Security, Reliability, OperationalExcellence, Performance).',
        tags: ['advisor', 'cost'],
      },
    ],
  },
  {
    id: 'az1-cmd-storage',
    title: 'Storage and AzCopy',
    description: 'Storage accounts, access, blobs, file shares and data movement.',
    entries: [
      {
        id: 'az1-c-storage-account-create',
        command:
          'az storage account create -g <rg> -n <name> --sku <sku> --kind StorageV2 --min-tls-version TLS1_2 --allow-blob-public-access false',
        description: 'Create a general-purpose v2 account with a chosen redundancy SKU.',
        placeholders: ['<rg>', '<name>', '<sku>'],
        example:
          'az storage account create -g rg-data -n stdata01 --sku Standard_ZRS --kind StorageV2 --min-tls-version TLS1_2 --allow-blob-public-access false',
        notes:
          'SKUs: Standard_LRS, Standard_ZRS, Standard_GRS, Standard_RAGRS, Standard_GZRS, Standard_RAGZRS, Premium_LRS, Premium_ZRS. PowerShell: New-AzStorageAccount.',
        tags: ['storage', 'redundancy'],
      },
      {
        id: 'az1-c-storage-network-rule',
        command:
          'az storage account network-rule add -g <rg> --account-name <name> --vnet-name <vnet> --subnet <subnet>',
        description:
          'Allow a subnet (with the Microsoft.Storage service endpoint) through the storage firewall.',
        placeholders: ['<rg>', '<name>', '<vnet>', '<subnet>'],
        notes:
          'Then set the default action to Deny: az storage account update --default-action Deny. Use --ip-address for public IP ranges.',
        tags: ['storage', 'network', 'firewall'],
      },
      {
        id: 'az1-c-storage-keys-renew',
        command:
          'az storage account keys renew -g <rg> --account-name <name> --key <primary|secondary>',
        description: 'Rotate one of the two account access keys.',
        placeholders: ['<rg>', '<name>'],
        notes:
          'Rotate the key apps are not using, switch apps, then rotate the other. Regenerating a key invalidates account and service SAS signed with it.',
        tags: ['storage', 'keys', 'security'],
      },
      {
        id: 'az1-c-storage-sas-user-delegation',
        command:
          'az storage blob generate-sas --account-name <name> -c <container> -n <blob> --permissions r --expiry <utc> --auth-mode login --as-user --https-only',
        description:
          'Generate a user delegation SAS signed with Entra credentials instead of an account key.',
        placeholders: ['<name>', '<container>', '<blob>', '<utc>'],
        notes:
          'User delegation SAS is the recommended SAS type. Stored access policies apply to service SAS and let you revoke without rotating keys.',
        tags: ['storage', 'sas', 'security'],
      },
      {
        id: 'az1-c-storage-blob-tier',
        command:
          'az storage blob set-tier --account-name <name> -c <container> -n <blob> --tier <Hot|Cool|Cold|Archive> --auth-mode login',
        description: 'Change a blob access tier; moving out of Archive starts rehydration.',
        placeholders: ['<name>', '<container>', '<blob>'],
        notes: 'Add --rehydrate-priority High for faster rehydration from Archive at higher cost.',
        tags: ['storage', 'blob', 'tiers'],
      },
      {
        id: 'az1-c-storage-lifecycle',
        command:
          'az storage account management-policy create -g <rg> --account-name <name> --policy @policy.json',
        description: 'Apply lifecycle management rules that tier or delete blobs by age.',
        placeholders: ['<rg>', '<name>'],
        tags: ['storage', 'lifecycle'],
      },
      {
        id: 'az1-c-storage-share-create',
        command:
          'az storage share-rm create -g <rg> --storage-account <name> -n <share> --quota <GiB> --enabled-protocols SMB',
        description: 'Create an Azure Files share through the management plane.',
        placeholders: ['<rg>', '<name>', '<share>', '<GiB>'],
        notes:
          'NFS shares need a Premium FileStorage account. Snapshot with az storage share-rm snapshot. PowerShell: New-AzRmStorageShare.',
        tags: ['storage', 'files'],
      },
      {
        id: 'az1-c-azcopy-copy',
        command: 'azcopy copy "<source>" "<destination>" --recursive',
        description:
          'Copy files or blobs between local disk, storage accounts, or accounts in different regions.',
        placeholders: ['<source>', '<destination>'],
        example:
          'azcopy copy "./logs" "https://stdata01.blob.core.windows.net/archive?<sas>" --recursive',
        notes:
          'Authenticate with azcopy login (Entra ID) or a SAS token. Account-to-account copies run server side.',
        tags: ['azcopy', 'migration'],
      },
      {
        id: 'az1-c-azcopy-sync',
        command: 'azcopy sync "<source>" "<destination>" --delete-destination=true',
        description: 'Make the destination match the source, optionally deleting extra files.',
        placeholders: ['<source>', '<destination>'],
        tags: ['azcopy', 'sync'],
      },
    ],
  },
  {
    id: 'az1-cmd-vms',
    title: 'Virtual machines, disks and templates',
    description: 'Create and change VMs and managed disks, and deploy ARM/Bicep templates.',
    entries: [
      {
        id: 'az1-c-vm-create',
        command:
          'az vm create -g <rg> -n <name> --image <image> --size <size> --zone <1|2|3> --admin-username <user> --generate-ssh-keys',
        description: 'Create a VM with a NIC, OS disk and (by default) public IP and NSG.',
        placeholders: ['<rg>', '<name>', '<image>', '<size>', '<user>'],
        example:
          'az vm create -g rg-vm -n vm-web-01 --image Ubuntu2404 --size Standard_B2s --zone 1 --admin-username azureuser --generate-ssh-keys --public-ip-address ""',
        notes:
          'Use --availability-set instead of --zone for an availability set. PowerShell: New-AzVM.',
        tags: ['vm', 'create'],
      },
      {
        id: 'az1-c-vm-resize',
        command: 'az vm resize -g <rg> -n <name> --size <size>',
        description: 'Change VM size; the VM restarts.',
        placeholders: ['<rg>', '<name>', '<size>'],
        notes:
          'Check az vm list-vm-resize-options first; deallocate if the size is not listed. PowerShell: set $vm.HardwareProfile.VmSize then Update-AzVM.',
        tags: ['vm', 'resize'],
      },
      {
        id: 'az1-c-vm-deallocate',
        command: 'az vm deallocate -g <rg> -n <name>',
        description: 'Stop the VM and release compute so it is no longer billed for compute.',
        placeholders: ['<rg>', '<name>'],
        notes:
          'az vm stop keeps the allocation and billing. PowerShell: Stop-AzVM (deallocates by default; -StayProvisioned keeps allocation).',
        tags: ['vm', 'cost'],
      },
      {
        id: 'az1-c-vm-disk-attach',
        command:
          'az vm disk attach -g <rg> --vm-name <vm> --name <disk> --new --size-gb <size> --sku <sku>',
        description:
          'Create and attach a new managed data disk (omit --new to attach an existing disk).',
        placeholders: ['<rg>', '<vm>', '<disk>', '<size>', '<sku>'],
        notes: 'PowerShell: Add-AzVMDataDisk then Update-AzVM.',
        tags: ['vm', 'disks'],
      },
      {
        id: 'az1-c-disk-update',
        command: 'az disk update -g <rg> -n <disk> --sku <sku> --size-gb <size>',
        description: 'Change a managed disk type or grow its size.',
        placeholders: ['<rg>', '<disk>', '<sku>', '<size>'],
        notes:
          'Most type changes need the VM deallocated. Disks can grow, never shrink; extend the partition in the guest afterwards.',
        tags: ['disks'],
      },
      {
        id: 'az1-c-snapshot-create',
        command: 'az snapshot create -g <rg> -n <name> --source <diskId> --incremental true',
        description: 'Take an incremental snapshot of a managed disk.',
        placeholders: ['<rg>', '<name>', '<diskId>'],
        tags: ['disks', 'backup'],
      },
      {
        id: 'az1-c-vm-encryption-at-host',
        command: 'az vm update -g <rg> -n <name> --set securityProfile.encryptionAtHost=true',
        description: 'Enable encryption at host on a deallocated VM.',
        placeholders: ['<rg>', '<name>'],
        notes:
          'Register the feature first: az feature register --namespace Microsoft.Compute --name EncryptionAtHost.',
        tags: ['vm', 'encryption', 'security'],
      },
      {
        id: 'az1-c-vm-run-command',
        command:
          'az vm run-command invoke -g <rg> -n <name> --command-id <RunShellScript|RunPowerShellScript> --scripts "<script>"',
        description: 'Run a script inside a VM through the VM agent, without network access to it.',
        placeholders: ['<rg>', '<name>', '<script>'],
        notes: 'PowerShell: Invoke-AzVMRunCommand.',
        tags: ['vm', 'troubleshooting'],
      },
      {
        id: 'az1-c-deployment-group-create',
        command: 'az deployment group create -g <rg> --template-file <file> --parameters <params>',
        description:
          'Deploy an ARM template or Bicep file to a resource group (Incremental by default).',
        placeholders: ['<rg>', '<file>', '<params>'],
        example:
          'az deployment group create -g rg-app --template-file main.bicep --parameters main.bicepparam',
        notes:
          'Add --mode Complete to delete unlisted resources. Other scopes: az deployment sub|mg|tenant create. PowerShell: New-AzResourceGroupDeployment.',
        tags: ['arm', 'bicep', 'iac'],
      },
      {
        id: 'az1-c-deployment-what-if',
        command: 'az deployment group what-if -g <rg> --template-file <file>',
        description: 'Preview creates, modifies and deletes without deploying.',
        placeholders: ['<rg>', '<file>'],
        notes:
          'PowerShell: New-AzResourceGroupDeployment -WhatIf, or Get-AzResourceGroupDeploymentWhatIfResult.',
        tags: ['arm', 'bicep', 'what-if'],
      },
      {
        id: 'az1-c-bicep-decompile',
        command: 'az bicep decompile --file <template.json>',
        description: 'Convert an ARM JSON template (for example from az group export) into Bicep.',
        placeholders: ['<template.json>'],
        notes:
          'The reverse is az bicep build. Export with az group export -n <rg> or Export-AzResourceGroup.',
        tags: ['bicep', 'export'],
      },
    ],
  },
  {
    id: 'az1-cmd-vmss',
    title: 'Scale sets and autoscale',
    description: 'Create scale sets, manage capacity and configure autoscale rules.',
    entries: [
      {
        id: 'az1-c-vmss-create',
        command:
          'az vmss create -g <rg> -n <name> --orchestration-mode <Flexible|Uniform> --image <image> --vm-sku <size> --instance-count <n> --zones 1 2 3',
        description: 'Create a scale set spread across zones.',
        placeholders: ['<rg>', '<name>', '<image>', '<size>', '<n>'],
        notes:
          'Add --upgrade-policy-mode Rolling for batched upgrades (needs a health probe or extension). PowerShell: New-AzVmss.',
        tags: ['vmss', 'create'],
      },
      {
        id: 'az1-c-vmss-scale',
        command: 'az vmss scale -g <rg> -n <name> --new-capacity <n>',
        description: 'Set the instance count manually.',
        placeholders: ['<rg>', '<name>', '<n>'],
        notes: 'An autoscale setting may change it again. PowerShell: Update-AzVmss -SkuCapacity.',
        tags: ['vmss', 'capacity'],
      },
      {
        id: 'az1-c-vmss-update-instances',
        command: 'az vmss update-instances -g <rg> -n <name> --instance-ids "*"',
        description:
          'Upgrade Uniform-mode instances to the latest model under the Manual upgrade policy.',
        placeholders: ['<rg>', '<name>'],
        notes: 'PowerShell: Update-AzVmssInstance -InstanceId "*".',
        tags: ['vmss', 'upgrade'],
      },
      {
        id: 'az1-c-autoscale-create',
        command:
          'az monitor autoscale create -g <rg> --resource <name> --resource-type <type> --name <setting> --min-count <n> --max-count <n> --count <n>',
        description: 'Create an autoscale setting for a scale set or App Service plan.',
        placeholders: ['<rg>', '<name>', '<type>', '<setting>', '<n>'],
        example:
          'az monitor autoscale create -g rg-web --resource vmss-web --resource-type Microsoft.Compute/virtualMachineScaleSets --name as-web --min-count 2 --max-count 10 --count 2',
        tags: ['autoscale', 'monitor'],
      },
      {
        id: 'az1-c-autoscale-rule-create',
        command:
          'az monitor autoscale rule create -g <rg> --autoscale-name <setting> --condition "<metric> <op> <threshold> avg <window>" --scale <out|in> <n>',
        description: 'Add a metric-based scale-out or scale-in rule.',
        placeholders: ['<rg>', '<setting>', '<metric>', '<op>', '<threshold>', '<window>', '<n>'],
        example:
          'az monitor autoscale rule create -g rg-web --autoscale-name as-web --condition "Percentage CPU > 70 avg 10m" --scale out 1 --cooldown 5',
        notes: 'Always pair with a scale-in rule and leave a gap between thresholds.',
        tags: ['autoscale', 'rules'],
      },
      {
        id: 'az1-c-autoscale-profile-create',
        command:
          'az monitor autoscale profile create -g <rg> --autoscale-name <setting> -n <profile> --recurrence week mon tue wed thu fri --start 08:00 --end 18:00 --timezone "<tz>" --min-count <n> --max-count <n> --count <n>',
        description: 'Add a recurring schedule profile for predictable load.',
        placeholders: ['<rg>', '<setting>', '<profile>', '<tz>', '<n>'],
        tags: ['autoscale', 'schedule'],
      },
    ],
  },
  {
    id: 'az1-cmd-containers',
    title: 'Containers: ACR, ACI and Container Apps',
    description: 'Build and store images, run container groups, and deploy Container Apps.',
    entries: [
      {
        id: 'az1-c-acr-create',
        command: 'az acr create -g <rg> -n <name> --sku <Basic|Standard|Premium>',
        description: 'Create a container registry.',
        placeholders: ['<rg>', '<name>'],
        notes:
          'Premium is needed for geo-replication (az acr replication create) and private endpoints. PowerShell: New-AzContainerRegistry.',
        tags: ['acr'],
      },
      {
        id: 'az1-c-acr-build',
        command: 'az acr build -r <registry> -t <repo>:<tag> <context>',
        description: 'Build an image in Azure with ACR Tasks and push it.',
        placeholders: ['<registry>', '<repo>', '<tag>', '<context>'],
        example: 'az acr build -r acrcontoso -t web:v1 .',
        tags: ['acr', 'tasks', 'build'],
      },
      {
        id: 'az1-c-acr-import',
        command: 'az acr import -n <registry> --source <image> --image <repo>:<tag>',
        description: 'Copy an image from another registry into ACR without pulling it locally.',
        placeholders: ['<registry>', '<image>', '<repo>', '<tag>'],
        example:
          'az acr import -n acrcontoso --source mcr.microsoft.com/azuredocs/aci-helloworld:latest --image hello:latest',
        tags: ['acr', 'import'],
      },
      {
        id: 'az1-c-acr-role',
        command:
          'az role assignment create --assignee <principalId> --role AcrPull --scope <registryId>',
        description: 'Let a managed identity or service principal pull images without passwords.',
        placeholders: ['<principalId>', '<registryId>'],
        notes:
          'AcrPush allows push and pull. Avoid the admin user (az acr update --admin-enabled false).',
        tags: ['acr', 'rbac', 'identity'],
      },
      {
        id: 'az1-c-container-create',
        command:
          'az container create -g <rg> -n <name> --image <image> --os-type Linux --cpu <n> --memory <GB> --restart-policy <Always|OnFailure|Never>',
        description: 'Run a container group in Azure Container Instances.',
        placeholders: ['<rg>', '<name>', '<image>', '<n>', '<GB>'],
        example:
          'az container create -g rg-cnt -n aci-hello --image mcr.microsoft.com/azuredocs/aci-helloworld --os-type Linux --cpu 1 --memory 1.5 --ports 80 --ip-address Public --dns-name-label hello-contoso',
        notes:
          'Add --vnet and --subnet for private deployment, --azure-file-volume-* to mount a share. PowerShell: New-AzContainerGroup.',
        tags: ['aci'],
      },
      {
        id: 'az1-c-container-logs',
        command: 'az container logs -g <rg> -n <name>',
        description: "Read a container group's output; use az container attach to stream it.",
        placeholders: ['<rg>', '<name>'],
        tags: ['aci', 'troubleshooting'],
      },
      {
        id: 'az1-c-containerapp-create',
        command:
          'az containerapp create -g <rg> -n <name> --environment <env> --image <image> --ingress <external|internal> --target-port <port> --min-replicas <n> --max-replicas <n>',
        description: 'Create a Container App in an environment with ingress and scale limits.',
        placeholders: ['<rg>', '<name>', '<env>', '<image>', '<port>', '<n>'],
        notes:
          'Add --registry-server <acr>.azurecr.io --registry-identity system to pull with a managed identity. az containerapp up does build, environment and app in one step.',
        tags: ['container apps'],
      },
      {
        id: 'az1-c-containerapp-scale',
        command:
          'az containerapp update -g <rg> -n <name> --scale-rule-name <rule> --scale-rule-type http --scale-rule-http-concurrency <n>',
        description: 'Add or change an HTTP concurrency scale rule (creates a new revision).',
        placeholders: ['<rg>', '<name>', '<rule>', '<n>'],
        tags: ['container apps', 'scale'],
      },
      {
        id: 'az1-c-containerapp-traffic',
        command:
          'az containerapp ingress traffic set -g <rg> -n <name> --revision-weight <rev1>=<pct> <rev2>=<pct>',
        description: 'Split traffic between revisions (requires multiple revision mode).',
        placeholders: ['<rg>', '<name>', '<rev1>', '<rev2>', '<pct>'],
        notes: 'Enable with az containerapp revision set-mode --mode multiple.',
        tags: ['container apps', 'revisions'],
      },
    ],
  },
  {
    id: 'az1-cmd-appservice',
    title: 'App Service',
    description: 'Plans, apps, scaling, domains, networking and deployment slots.',
    entries: [
      {
        id: 'az1-c-appservice-plan-create',
        command:
          'az appservice plan create -g <rg> -n <plan> --sku <sku> --is-linux --number-of-workers <n>',
        description: 'Create an App Service plan.',
        placeholders: ['<rg>', '<plan>', '<sku>', '<n>'],
        notes:
          'Scale up/out later with az appservice plan update --sku P1v3 --number-of-workers 3. PowerShell: New-AzAppServicePlan / Set-AzAppServicePlan.',
        tags: ['app service', 'plans', 'scale'],
      },
      {
        id: 'az1-c-webapp-create',
        command: 'az webapp create -g <rg> -p <plan> -n <app> --runtime "<runtime>"',
        description: 'Create a web app in a plan.',
        placeholders: ['<rg>', '<plan>', '<app>', '<runtime>'],
        example: 'az webapp create -g rg-web -p asp-web -n contoso-web --runtime "NODE:20-lts"',
        notes: 'List runtimes with az webapp list-runtimes. PowerShell: New-AzWebApp.',
        tags: ['app service'],
      },
      {
        id: 'az1-c-webapp-slot-create',
        command: 'az webapp deployment slot create -g <rg> -n <app> --slot <slot>',
        description: 'Create a deployment slot (Standard tier or higher).',
        placeholders: ['<rg>', '<app>', '<slot>'],
        notes: 'PowerShell: New-AzWebAppSlot.',
        tags: ['app service', 'slots'],
      },
      {
        id: 'az1-c-webapp-slot-swap',
        command:
          'az webapp deployment slot swap -g <rg> -n <app> --slot <slot> --target-slot production',
        description: 'Swap a slot into production; run again to roll back.',
        placeholders: ['<rg>', '<app>', '<slot>'],
        notes:
          'Use --action preview then --action swap for swap with preview. PowerShell: Switch-AzWebAppSlot.',
        tags: ['app service', 'slots', 'swap'],
      },
      {
        id: 'az1-c-webapp-slot-setting',
        command:
          'az webapp config appsettings set -g <rg> -n <app> --slot <slot> --slot-settings <key>=<value>',
        description: 'Set a sticky (deployment slot) setting that does not move during swaps.',
        placeholders: ['<rg>', '<app>', '<slot>', '<key>', '<value>'],
        notes: 'Use --settings for normal settings that swap with the code.',
        tags: ['app service', 'slots', 'config'],
      },
      {
        id: 'az1-c-webapp-hostname-add',
        command: 'az webapp config hostname add -g <rg> --webapp-name <app> --hostname <fqdn>',
        description: 'Bind a custom domain after creating the CNAME (or A) and asuid TXT records.',
        placeholders: ['<rg>', '<app>', '<fqdn>'],
        notes:
          'Then az webapp config ssl create --hostname <fqdn> for a free managed certificate and az webapp config ssl bind --ssl-type SNI.',
        tags: ['app service', 'dns', 'tls'],
      },
      {
        id: 'az1-c-webapp-access-restriction',
        command:
          'az webapp config access-restriction add -g <rg> -n <app> --rule-name <name> --action Allow --ip-address <cidr> --priority <n>',
        description:
          'Add an inbound allow/deny rule by IP range, service tag (--service-tag) or subnet (--vnet-name --subnet).',
        placeholders: ['<rg>', '<app>', '<name>', '<cidr>', '<n>'],
        notes: 'Add --scm-site true to target the Kudu site.',
        tags: ['app service', 'network', 'security'],
      },
      {
        id: 'az1-c-webapp-vnet-integration',
        command: 'az webapp vnet-integration add -g <rg> -n <app> --vnet <vnet> --subnet <subnet>',
        description: 'Route outbound traffic from the app into a VNet through a delegated subnet.',
        placeholders: ['<rg>', '<app>', '<vnet>', '<subnet>'],
        notes: 'Outbound only. For private inbound, create a private endpoint for the app.',
        tags: ['app service', 'network'],
      },
      {
        id: 'az1-c-webapp-backup',
        command:
          'az webapp config backup create -g <rg> --webapp-name <app> --container-url "<sasUrl>" --backup-name <name>',
        description: 'Take an on-demand custom backup to a storage container.',
        placeholders: ['<rg>', '<app>', '<sasUrl>', '<name>'],
        notes:
          'Schedule with az webapp config backup update; restore with az webapp config backup restore.',
        tags: ['app service', 'backup'],
      },
    ],
  },
  {
    id: 'az1-cmd-networking',
    title: 'Networking',
    description: 'VNets, peering, NSGs, routing, load balancing, DNS and private endpoints.',
    entries: [
      {
        id: 'az1-c-vnet-create',
        command:
          'az network vnet create -g <rg> -n <vnet> --address-prefixes <cidr> --subnet-name <subnet> --subnet-prefixes <cidr>',
        description: 'Create a VNet with its first subnet.',
        placeholders: ['<rg>', '<vnet>', '<subnet>', '<cidr>'],
        notes: 'PowerShell: New-AzVirtualNetwork with New-AzVirtualNetworkSubnetConfig.',
        tags: ['vnet', 'subnet'],
      },
      {
        id: 'az1-c-vnet-peering',
        command:
          'az network vnet peering create -g <rg> -n <name> --vnet-name <vnet> --remote-vnet <remoteVnetId> --allow-vnet-access',
        description: 'Create one direction of a VNet peering; create the reverse peering too.',
        placeholders: ['<rg>', '<name>', '<vnet>', '<remoteVnetId>'],
        notes:
          'Peering is not transitive. Use --allow-gateway-transit on the hub and --use-remote-gateways on the spoke. PowerShell: Add-AzVirtualNetworkPeering.',
        tags: ['vnet', 'peering'],
      },
      {
        id: 'az1-c-nsg-rule-create',
        command:
          'az network nsg rule create -g <rg> --nsg-name <nsg> -n <rule> --priority <100-4096> --direction Inbound --access Allow --protocol Tcp --destination-port-ranges <port> --source-address-prefixes <src>',
        description: 'Add an NSG rule; lower priority numbers are evaluated first.',
        placeholders: ['<rg>', '<nsg>', '<rule>', '<port>', '<src>'],
        notes:
          'Use --destination-asgs to target application security groups. PowerShell: Add-AzNetworkSecurityRuleConfig then Set-AzNetworkSecurityGroup.',
        tags: ['nsg', 'security'],
      },
      {
        id: 'az1-c-nic-effective-nsg',
        command: 'az network nic list-effective-nsg -g <rg> -n <nic>',
        description: 'Show the combined effective security rules from subnet and NIC NSGs.',
        placeholders: ['<rg>', '<nic>'],
        notes:
          'az network nic show-effective-route-table shows effective routes. The VM must be running.',
        tags: ['nsg', 'troubleshooting'],
      },
      {
        id: 'az1-c-route-table',
        command:
          'az network route-table route create -g <rg> --route-table-name <rt> -n <route> --address-prefix <cidr> --next-hop-type VirtualAppliance --next-hop-ip-address <ip>',
        description: 'Add a user-defined route sending traffic to a network virtual appliance.',
        placeholders: ['<rg>', '<rt>', '<route>', '<cidr>', '<ip>'],
        notes:
          'Associate the table with a subnet: az network vnet subnet update --route-table <rt>.',
        tags: ['routing', 'udr'],
      },
      {
        id: 'az1-c-lb-create',
        command:
          'az network lb create -g <rg> -n <lb> --sku Standard --public-ip-address <pip> --frontend-ip-name fe --backend-pool-name be',
        description:
          'Create a Standard public load balancer (use --vnet-name and --subnet for internal).',
        placeholders: ['<rg>', '<lb>', '<pip>'],
        notes:
          'Then add a probe (az network lb probe create) and a rule (az network lb rule create). PowerShell: New-AzLoadBalancer.',
        tags: ['load balancer'],
      },
      {
        id: 'az1-c-dns-record',
        command: 'az network dns record-set a add-record -g <rg> -z <zone> -n <name> -a <ip>',
        description: 'Add an A record to a public DNS zone (use private-dns for private zones).',
        placeholders: ['<rg>', '<zone>', '<name>', '<ip>'],
        notes:
          'Link private zones to VNets with az network private-dns link vnet create --registration-enabled for auto-registration.',
        tags: ['dns'],
      },
      {
        id: 'az1-c-private-endpoint',
        command:
          'az network private-endpoint create -g <rg> -n <pe> --vnet-name <vnet> --subnet <subnet> --private-connection-resource-id <resourceId> --group-id <subresource> --connection-name <name>',
        description:
          'Create a private endpoint for a PaaS resource, such as a storage account blob service.',
        placeholders: [
          '<rg>',
          '<pe>',
          '<vnet>',
          '<subnet>',
          '<resourceId>',
          '<subresource>',
          '<name>',
        ],
        example:
          'az network private-endpoint create -g rg-net -n pe-st --vnet-name vnet-hub --subnet snet-pe --private-connection-resource-id <storageId> --group-id blob --connection-name st-blob',
        notes:
          'Pair with a private DNS zone such as privatelink.blob.core.windows.net and a DNS zone group.',
        tags: ['private endpoint', 'private link', 'dns'],
      },
      {
        id: 'az1-c-watcher-ip-flow',
        command:
          'az network watcher test-ip-flow -g <rg> --vm <vm> --direction Inbound --protocol TCP --local <ip>:<port> --remote <ip>:<port>',
        description:
          'Check whether an NSG allows or denies a specific flow, and which rule decided.',
        placeholders: ['<rg>', '<vm>', '<ip>', '<port>'],
        notes:
          'Next hop: az network watcher show-next-hop. Connectivity: az network watcher test-connectivity.',
        tags: ['network watcher', 'troubleshooting'],
      },
    ],
  },
  {
    id: 'az1-cmd-monitor',
    title: 'Monitoring and alerts',
    description: 'Metrics, diagnostic settings, Log Analytics queries, alerts and action groups.',
    entries: [
      {
        id: 'az1-c-monitor-metrics-list',
        command:
          'az monitor metrics list --resource <resourceId> --metric "<metric>" --interval PT5M --aggregation Average',
        description: 'Read platform metrics for a resource.',
        placeholders: ['<resourceId>', '<metric>'],
        notes:
          'List available metrics with az monitor metrics list-definitions. PowerShell: Get-AzMetric.',
        tags: ['monitor', 'metrics'],
      },
      {
        id: 'az1-c-diagnostic-settings',
        command:
          'az monitor diagnostic-settings create -n <name> --resource <resourceId> --workspace <workspaceId> --logs \'[{"categoryGroup":"allLogs","enabled":true}]\' --metrics \'[{"category":"AllMetrics","enabled":true}]\'',
        description:
          'Send resource logs and metrics to a Log Analytics workspace (or storage / Event Hubs).',
        placeholders: ['<name>', '<resourceId>', '<workspaceId>'],
        notes: 'Resource logs are not collected until a diagnostic setting exists.',
        tags: ['monitor', 'logs', 'diagnostics'],
      },
      {
        id: 'az1-c-log-analytics-query',
        command:
          'az monitor log-analytics query -w <workspaceGuid> --analytics-query "<kql>" --timespan P1D',
        description: 'Run a KQL query against a Log Analytics workspace.',
        placeholders: ['<workspaceGuid>', '<kql>'],
        example:
          'az monitor log-analytics query -w <workspaceGuid> --analytics-query "Heartbeat | summarize LastSeen=max(TimeGenerated) by Computer | where LastSeen < ago(15m)"',
        notes:
          'Uses the workspace customer id (GUID), not the resource id. PowerShell: Invoke-AzOperationalInsightsQuery.',
        tags: ['monitor', 'kql', 'log analytics'],
      },
      {
        id: 'az1-c-action-group-create',
        command:
          'az monitor action-group create -g <rg> -n <name> --short-name <short> --action email <label> <address>',
        description: 'Create an action group that notifies or runs automation when an alert fires.',
        placeholders: ['<rg>', '<name>', '<short>', '<label>', '<address>'],
        tags: ['monitor', 'alerts', 'action groups'],
      },
      {
        id: 'az1-c-metric-alert-create',
        command:
          'az monitor metrics alert create -g <rg> -n <name> --scopes <resourceId> --condition "avg Percentage CPU > 80" --window-size 5m --evaluation-frequency 1m --action <actionGroupId>',
        description: 'Create a metric alert rule linked to an action group.',
        placeholders: ['<rg>', '<name>', '<resourceId>', '<actionGroupId>'],
        notes:
          'Log search alerts use az monitor scheduled-query create. Suppress notifications during maintenance with alert processing rules.',
        tags: ['monitor', 'alerts'],
      },
      {
        id: 'az1-c-dcr-association',
        command:
          'az monitor data-collection rule association create --name <name> --rule-id <dcrId> --resource <vmId>',
        description:
          'Associate a VM with a data collection rule so the Azure Monitor Agent collects its data.',
        placeholders: ['<name>', '<dcrId>', '<vmId>'],
        notes:
          'Install the agent with az vm extension set --name AzureMonitorLinuxAgent (or AzureMonitorWindowsAgent) --publisher Microsoft.Azure.Monitor.',
        tags: ['monitor', 'ama', 'dcr'],
      },
      {
        id: 'az1-c-activity-log',
        command:
          'az monitor activity-log list -g <rg> --offset 1d --query "[].{time:eventTimestamp, op:operationName.localizedValue, caller:caller, status:status.value}" -o table',
        description: 'See who changed what in the control plane recently.',
        placeholders: ['<rg>'],
        notes:
          'PowerShell: Get-AzActivityLog -ResourceGroupName <rg> -StartTime (Get-Date).AddDays(-1).',
        tags: ['monitor', 'activity log', 'audit'],
      },
    ],
  },
  {
    id: 'az1-cmd-backup',
    title: 'Backup and Site Recovery',
    description: 'Recovery Services vaults, VM backup, restores and replication.',
    entries: [
      {
        id: 'az1-c-backup-vault-create',
        command: 'az backup vault create -g <rg> -n <vault> -l <region>',
        description:
          'Create a Recovery Services vault (used by Azure Backup for VMs, Files, SQL in VM, and by ASR).',
        placeholders: ['<rg>', '<vault>', '<region>'],
        notes:
          'Set redundancy before protecting items: az backup vault backup-properties set --backup-storage-redundancy GeoRedundant. Backup vaults (az dataprotection) cover blobs, disks and PostgreSQL. PowerShell: New-AzRecoveryServicesVault.',
        tags: ['backup', 'vault'],
      },
      {
        id: 'az1-c-backup-protection-enable',
        command:
          'az backup protection enable-for-vm -g <rg> --vault-name <vault> --vm <vm> --policy-name <policy>',
        description: 'Start backing up a VM with a backup policy.',
        placeholders: ['<rg>', '<vault>', '<vm>', '<policy>'],
        example:
          'az backup protection enable-for-vm -g rg-bkp --vault-name rsv-prod --vm vm-web-01 --policy-name DefaultPolicy',
        notes:
          'The vault must be in the same region as the VM. PowerShell: Enable-AzRecoveryServicesBackupProtection.',
        tags: ['backup', 'vm'],
      },
      {
        id: 'az1-c-backup-now',
        command:
          'az backup protection backup-now -g <rg> --vault-name <vault> --container-name <vm> --item-name <vm> --backup-management-type AzureIaasVM --retain-until <dd-mm-yyyy>',
        description: 'Trigger an on-demand backup of a protected VM.',
        placeholders: ['<rg>', '<vault>', '<vm>', '<dd-mm-yyyy>'],
        tags: ['backup', 'on-demand'],
      },
      {
        id: 'az1-c-backup-restore-disks',
        command:
          'az backup restore restore-disks -g <rg> --vault-name <vault> --container-name <vm> --item-name <vm> --rp-name <recoveryPoint> --storage-account <staging>',
        description:
          'Restore the disks of a VM from a recovery point, to create a new VM or swap disks.',
        placeholders: ['<rg>', '<vault>', '<vm>', '<recoveryPoint>', '<staging>'],
        notes:
          'List recovery points with az backup recoverypoint list. File-level recovery mounts a recovery point as a drive via a script.',
        tags: ['backup', 'restore'],
      },
      {
        id: 'az1-c-backup-job-list',
        command: 'az backup job list -g <rg> --vault-name <vault> --status Failed -o table',
        description: 'List backup and restore jobs, filtered by status.',
        placeholders: ['<rg>', '<vault>'],
        notes:
          'For estate-wide reporting use Backup reports (diagnostic settings to Log Analytics) and Azure Monitor based alerts.',
        tags: ['backup', 'monitoring'],
      },
      {
        id: 'az1-c-asr-replication',
        command:
          'az site-recovery protected-item list -g <rg> --vault-name <vault> --fabric-name <fabric> --protection-container <container> -o table',
        description:
          'List Azure Site Recovery replicated items and their replication health (site-recovery CLI extension).',
        placeholders: ['<rg>', '<vault>', '<fabric>', '<container>'],
        notes:
          'Enabling replication, test failover and failover are usually done in the portal (Disaster recovery blade) or with Az.RecoveryServices PowerShell: Start-AzRecoveryServicesAsrTestFailoverJob.',
        tags: ['asr', 'disaster recovery'],
      },
    ],
  },
]
