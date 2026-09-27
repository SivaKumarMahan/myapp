import type { Topic } from '../../../types'

export const backupRecovery: Topic = {
  id: 'az1-backup-recovery',
  title: 'Azure Backup and Azure Site Recovery',
  domainId: 'az1-monitor',
  difficulty: 'advanced',
  estimatedMinutes: 40,
  order: 3,
  tags: [
    'azure-backup',
    'recovery-services-vault',
    'backup-vault',
    'backup-policy',
    'soft-delete',
    'site-recovery',
    'failover',
    'backup-reports',
  ],
  oneLiner:
    'Back up VMs, files and databases into vaults you can restore from, and replicate whole VMs to another region with Site Recovery.',
  explanation: [
    '**Azure Backup** takes scheduled copies of your data and keeps them in a **vault**, so you can restore after deletion, corruption or ransomware. **Azure Site Recovery (ASR)** continuously replicates whole VMs to another region so you can **fail over** when the primary region is unavailable. Backup answers "give me yesterday back"; Site Recovery answers "keep running somewhere else".',
    'There are two vault types. A **Recovery Services vault (RSV)** holds backups of **Azure VMs**, **SQL Server and SAP HANA in Azure VMs**, **Azure Files**, and on-premises files and folders through the **MARS agent**; it is also the vault Site Recovery uses. A **Backup vault** is the newer type for **Azure managed disks**, **Azure Blobs**, **Azure Database for PostgreSQL flexible server** and **AKS**. Pick the vault by the datasource, not by preference.',
    'A **backup policy** sets when backups run and how long recovery points are kept (daily, weekly, monthly and yearly retention). For Azure VMs, a backup first takes a snapshot (the **instant restore** tier, kept in your subscription for fast restores) and then transfers the data to the vault tier for long-term retention.',
    'Backups are protected against accidents and attackers by **soft delete** (deleted backup data is kept for 14 days by default before it is purged), **immutable vaults** (block operations that would destroy recovery points early), and **multi-user authorization** with a Resource Guard. Monitoring comes from **Azure Monitor**: built-in alerts for failed jobs, and **backup reports** once the vault sends diagnostics to a Log Analytics workspace.',
  ],
  whyItMatters: [
    'This is one of the most scenario-heavy AZ-104 areas. Expect questions on which vault a datasource needs, where the vault must be located, which restore option fits, and the order of Site Recovery operations.',
    'A backup that has never been restored is a hope, not a plan. Knowing the restore options and their limits (for example, cross-region restore needs GRS and has to be enabled on the vault) is what lets you meet a recovery time objective under pressure.',
    'Ransomware increasingly targets backups first. Soft delete, immutability and multi-user authorization are the controls that keep an attacker with admin access from deleting your way back.',
  ],
  howItWorks: [
    '**Vault placement**: for Azure Backup the vault must be in the **same region** as the VM or resource it protects, but can be in a different resource group. For Site Recovery the Recovery Services vault goes in the **target (secondary) region**, not the source region. The contrast is a favourite exam trap.',
    '**Storage redundancy** of the vault (GRS by default, or LRS or ZRS) must be chosen **before** you protect the first item; after that it cannot be changed. **Cross-region restore (CRR)** is available only with GRS and must be enabled on the vault; it lets you restore in the Azure paired region.',
    '**VM backup policies** come in two flavours. The **standard** policy backs up once a day and keeps instant restore snapshots for 1 to 5 days. The **enhanced** policy supports multiple backups per day (as often as every 4 hours), instant restore retention of up to 30 days, and is required for Trusted Launch VMs and some newer disk types. Retention for the vault tier can be set in days, weeks, months and years.',
    '**Restore options for an Azure VM**: **create a new VM** from a recovery point; **restore disks** (managed disks plus a template, so you can customise the VM before creating it); **replace existing** (swap the disks of an existing VM, keeping its identity and configuration); **file-level recovery** (mount a recovery point on any machine through a downloaded script and copy individual files); and **cross-region restore** to the paired region when CRR is enabled.',
    '**Soft delete** keeps deleted backup data for 14 days by default (configurable up to 180 days) at no extra cost for that period; you can undelete during that time. **Enhanced soft delete** can be made always-on, which cannot be turned off. An **immutable vault** blocks operations such as reducing retention or deleting recovery points, and once **locked** that setting is irreversible.',
    '**Site Recovery for Azure VMs**: enable replication (the Mobility service extension is installed and disks replicate to the target region), run a **test failover** into an isolated VNet to prove it works without affecting replication, then clean up the test. For a real event run **failover**, then **commit** to finalise the chosen recovery point, then **re-protect** to replicate back the other way, then **fail back** to the primary region and re-protect again. **Recovery plans** group VMs into ordered boot groups with scripts, Automation runbooks and manual actions, so a multi-tier app fails over in the right sequence.',
    '**Monitoring**: Azure Monitor-based alerts for backup and Site Recovery are built in (for example, failed backup jobs) and can be routed to action groups with alert processing rules. **Backup reports** in Azure Business Continuity Center (the successor to Backup center) read data from a Log Analytics workspace, so each vault needs a **diagnostic setting** sending its backup categories to that workspace.',
  ],
  diagrams: [
    {
      kind: 'decision',
      title: 'Which vault protects this workload?',
      caption:
        'The datasource decides the vault. Azure VMs always go to a Recovery Services vault in the same region.',
      question: 'What are you protecting?',
      branches: [
        {
          condition: 'Azure VMs, or SQL or SAP HANA in a VM',
          result: 'Recovery Services vault',
          detail: 'Same region as the VM',
          tone: 'accent',
        },
        {
          condition: 'Azure Files shares or MARS agent files',
          result: 'Recovery Services vault',
          detail: 'MARS covers on-premises files and folders',
        },
        {
          condition: 'Managed disks, blobs, PostgreSQL flexible, AKS',
          result: 'Backup vault',
          detail: 'The newer vault type and its datasources',
          tone: 'success',
        },
        {
          condition: 'A whole VM running in another region',
          result: 'Site Recovery in a Recovery Services vault',
          detail: 'Vault lives in the target region',
          tone: 'warning',
        },
      ],
    },
    {
      kind: 'flow',
      title: 'Site Recovery failover lifecycle',
      caption:
        'Test first, fail over for real, commit, then reverse the replication so you can come home.',
      nodes: [
        {
          label: 'Enable replication',
          detail: 'Source VM replicates to target region',
          tone: 'accent',
        },
        {
          label: 'Test failover',
          detail: 'Isolated VNet, replication keeps running',
          arrowLabel: 'drill',
          branch: {
            label: 'Clean up test failover',
            detail: 'Deletes the test VMs',
            tone: 'muted',
          },
        },
        {
          label: 'Failover',
          detail: 'VMs start in the target region',
          arrowLabel: 'real outage',
          tone: 'warning',
        },
        {
          label: 'Commit',
          detail: 'Finalises the chosen recovery point',
        },
        {
          label: 'Re-protect',
          detail: 'Replicate from target back to primary',
          arrowLabel: 'reverse direction',
        },
        {
          label: 'Fail back and re-protect',
          detail: 'Return to primary, replicate again',
          tone: 'success',
        },
      ],
    },
  ],
  keyObjects: [
    {
      kind: 'Recovery Services vault (Microsoft.RecoveryServices/vaults)',
      apiVersion: '2024-04-01',
      purpose:
        'Stores backups of Azure VMs, SQL and SAP HANA in VMs, Azure Files and MARS agent data, and hosts Site Recovery replication.',
      fields: [
        { path: 'sku.name', meaning: 'RS0 with tier Standard.', required: true },
        {
          path: 'location',
          meaning: 'Same region as protected VMs for Backup; the target region for Site Recovery.',
          required: true,
        },
        {
          path: 'properties.redundancySettings.standardTierStorageRedundancy',
          meaning:
            'GeoRedundant (default), LocallyRedundant or ZoneRedundant. Fixed after the first item is protected.',
        },
        {
          path: 'properties.redundancySettings.crossRegionRestore',
          meaning: 'Enabled allows restores in the paired region. Requires GeoRedundant.',
        },
        {
          path: 'properties.securitySettings.softDeleteSettings',
          meaning:
            'softDeleteState (Enabled, Disabled or AlwaysON) and softDeleteRetentionPeriodInDays (14 to 180).',
        },
        {
          path: 'properties.securitySettings.immutabilitySettings.state',
          meaning: 'Disabled, Unlocked or Locked. Locked cannot be undone.',
        },
      ],
    },
    {
      kind: 'Backup vault (Microsoft.DataProtection/backupVaults)',
      apiVersion: '2024-04-01',
      purpose:
        'The newer vault type for Azure managed disks, Azure Blobs, PostgreSQL flexible server and AKS backups.',
      fields: [
        {
          path: 'properties.storageSettings',
          meaning:
            'Datastore type (VaultStore) and redundancy (LocallyRedundant, GeoRedundant, ZoneRedundant).',
          required: true,
        },
        {
          path: 'identity.type',
          meaning:
            'SystemAssigned identity that must be granted roles on the datasource, for example Disk Backup Reader.',
        },
      ],
    },
    {
      kind: 'Backup policy (Microsoft.RecoveryServices/vaults/backupPolicies)',
      apiVersion: '2024-04-01',
      purpose: 'Schedule and retention for a class of protected items.',
      fields: [
        {
          path: 'properties.backupManagementType',
          meaning:
            'AzureIaasVM for VMs, AzureStorage for Azure Files, AzureWorkload for SQL or SAP HANA.',
          required: true,
        },
        {
          path: 'properties.policyType',
          meaning: 'V1 is the standard VM policy, V2 the enhanced policy with hourly schedules.',
        },
        {
          path: 'properties.instantRpRetentionRangeInDays',
          meaning: 'Days to keep instant restore snapshots: 1 to 5 standard, up to 30 enhanced.',
        },
        {
          path: 'properties.retentionPolicy',
          meaning: 'Daily, weekly, monthly and yearly retention of vault-tier recovery points.',
        },
      ],
    },
    {
      kind: 'Site Recovery concepts',
      purpose: 'The moving parts of disaster recovery for Azure VMs.',
      fields: [
        {
          path: 'Replication policy',
          meaning: 'Recovery point retention and app-consistent snapshot frequency.',
        },
        { path: 'Test failover', meaning: 'A non-disruptive drill into an isolated network.' },
        { path: 'Commit', meaning: 'Confirms the failover and the recovery point used.' },
        {
          path: 'Re-protect',
          meaning: 'Starts replication in the reverse direction after failover.',
        },
        {
          path: 'Recovery plan',
          meaning: 'Ordered groups of VMs with scripts and manual actions.',
        },
      ],
    },
  ],
  realWorldExample: {
    title: 'The ransomware night the backups survived',
    story: [
      'A manufacturing firm had its file server VM and a line-of-business database VM backed up daily to a GRS Recovery Services vault with the enhanced policy, soft delete and multi-user authorization enabled. An attacker who phished a subscription owner encrypted both VMs and then tried to stop protection and delete the backup data.',
      'The delete succeeded on paper, but soft delete kept the backup data for its retention period, and the attempt to reduce retention was blocked because it needed approval through the Resource Guard owned by the security team. The operations team undeleted the items, then used restore disks to bring back clean disks from a recovery point before the encryption started.',
      'For the file server they needed only a folder of CAD drawings immediately, so they used file-level recovery to mount a recovery point and copy it off within the hour, while the full restore ran in parallel.',
      'The post-incident review added two things: backup reports in Log Analytics so management could see job health weekly, and a Site Recovery recovery plan for the database tier, drilled every quarter with a test failover.',
    ],
  },
  yamlExamples: [
    {
      title: 'KQL: failed backup jobs in the last week',
      language: 'text',
      explanation:
        'Requires a diagnostic setting on the vault that sends the Addon Azure Backup Jobs category to Log Analytics in resource-specific mode.',
      code: `AddonAzureBackupJobs
| where TimeGenerated > ago(7d)
| where JobOperation == "Backup" and JobStatus == "Failed"
| summarize Failures = count() by BackupItemUniqueId, JobFailureCode
| order by Failures desc`,
    },
    {
      title: 'PowerShell: Site Recovery test failover and cleanup',
      language: 'powershell',
      explanation:
        'Runs a drill for one replicated VM into an isolated VNet, then removes the test VM. Replication continues throughout.',
      code: `$vault = Get-AzRecoveryServicesVault -Name "rsv-dr-westus" -ResourceGroupName "rg-dr"
Set-AzRecoveryServicesAsrVaultContext -Vault $vault

$fabric    = Get-AzRecoveryServicesAsrFabric -FriendlyName "East US"
$container = Get-AzRecoveryServicesAsrProtectionContainer -Fabric $fabric
$item      = Get-AzRecoveryServicesAsrReplicationProtectedItem -ProtectionContainer $container -FriendlyName "vm-app01"

$testVnet = "/subscriptions/<sub-id>/resourceGroups/rg-dr/providers/Microsoft.Network/virtualNetworks/vnet-drill"
$job = Start-AzRecoveryServicesAsrTestFailoverJob -ReplicationProtectedItem $item -Direction PrimaryToRecovery -AzureVMNetworkId $testVnet

# After validating the test VM:
Start-AzRecoveryServicesAsrTestFailoverCleanupJob -ReplicationProtectedItem $item -Comment "Quarterly drill OK"`,
      placeholders: ['<sub-id>'],
    },
  ],
  imperative: [
    {
      command: 'az backup vault create -g <rg> -n <vault> -l eastus',
      what: 'Creates a Recovery Services vault in the same region as the VMs it will protect.',
      placeholders: ['<rg>', '<vault>'],
    },
    {
      command:
        'az backup vault backup-properties set -g <rg> -n <vault> --backup-storage-redundancy GeoRedundant --cross-region-restore-flag true',
      what: 'Sets vault redundancy and enables cross-region restore. Do this before protecting any item.',
      placeholders: ['<rg>', '<vault>'],
    },
    {
      command:
        'az backup protection enable-for-vm -g <rg> --vault-name <vault> --vm <vm> --policy-name DefaultPolicy',
      what: 'Protects a VM with a backup policy. The VM must be in the same region as the vault.',
      expected: 'A ConfigureBackup job that completes with status Completed.',
      placeholders: ['<rg>', '<vault>', '<vm>'],
    },
    {
      command:
        'az backup protection backup-now -g <rg> --vault-name <vault> --container-name <vm> --item-name <vm> --backup-management-type AzureIaasVM --retain-until 31-12-2026',
      what: 'Takes an on-demand backup kept until the given date (dd-mm-yyyy).',
      placeholders: ['<rg>', '<vault>', '<vm>'],
    },
    {
      command:
        'az backup restore restore-disks -g <rg> --vault-name <vault> --container-name <vm> --item-name <vm> --rp-name <recovery-point> --storage-account <staging-storage> --target-resource-group <restore-rg>',
      what: 'Restores managed disks and a VM template from a recovery point into another resource group.',
      placeholders: [
        '<rg>',
        '<vault>',
        '<vm>',
        '<recovery-point>',
        '<staging-storage>',
        '<restore-rg>',
      ],
    },
    {
      command:
        "az dataprotection backup-vault create -g <rg> --vault-name <backup-vault> -l eastus --type SystemAssigned --storage-setting \"[{'type':'LocallyRedundant','datastore-type':'VaultStore'}]\"",
      what: 'Creates a Backup vault for disks, blobs, PostgreSQL flexible server or AKS.',
      placeholders: ['<rg>', '<backup-vault>'],
    },
  ],
  declarative: {
    steps: [
      'Deploy the vault in the same region as the VMs you will back up.',
      'Set storage redundancy and cross-region restore in the same deployment, before any item is protected.',
      'Enable soft delete (at least the 14-day default) and consider immutability once the design is stable.',
      'Create an enhanced (V2) VM policy with the schedule and retention your recovery point objective needs.',
      'Add a diagnostic setting sending backup categories to Log Analytics so backup reports and KQL queries work.',
      'Protect VMs with az backup protection enable-for-vm, or with Azure Policy (configure backup on VMs) at scale.',
    ],
    code: [
      {
        title: 'vault.bicep: Recovery Services vault, enhanced policy and diagnostics',
        language: 'bicep',
        explanation:
          'Deploy with az deployment group create -g <rg> -f vault.bicep -p workspaceId=<workspace-id>. The policy backs up every 4 hours, keeps snapshots 7 days and vault points 30 days.',
        code: `param location string = resourceGroup().location
param vaultName string = 'rsv-\${uniqueString(resourceGroup().id)}'
param workspaceId string

resource vault 'Microsoft.RecoveryServices/vaults@2024-04-01' = {
  name: vaultName
  location: location
  sku: {
    name: 'RS0'
    tier: 'Standard'
  }
  properties: {
    publicNetworkAccess: 'Enabled'
    redundancySettings: {
      standardTierStorageRedundancy: 'GeoRedundant'
      crossRegionRestore: 'Enabled'
    }
    securitySettings: {
      softDeleteSettings: {
        softDeleteState: 'Enabled'
        softDeleteRetentionPeriodInDays: 14
      }
      immutabilitySettings: {
        state: 'Unlocked'
      }
    }
  }
}

resource enhancedPolicy 'Microsoft.RecoveryServices/vaults/backupPolicies@2024-04-01' = {
  parent: vault
  name: 'vm-enhanced-4h'
  properties: {
    backupManagementType: 'AzureIaasVM'
    policyType: 'V2'
    instantRpRetentionRangeInDays: 7
    timeZone: 'UTC'
    schedulePolicy: {
      schedulePolicyType: 'SimpleSchedulePolicyV2'
      scheduleRunFrequency: 'Hourly'
      hourlySchedule: {
        interval: 4
        scheduleWindowStartTime: '2026-01-01T06:00:00Z'
        scheduleWindowDuration: 16
      }
    }
    retentionPolicy: {
      retentionPolicyType: 'LongTermRetentionPolicy'
      dailySchedule: {
        retentionTimes: [
          '2026-01-01T06:00:00Z'
        ]
        retentionDuration: {
          count: 30
          durationType: 'Days'
        }
      }
    }
  }
}

resource backupDiagnostics 'Microsoft.Insights/diagnosticSettings@2021-05-01-preview' = {
  scope: vault
  name: 'to-log-analytics'
  properties: {
    workspaceId: workspaceId
    logAnalyticsDestinationType: 'Dedicated'
    logs: [
      { category: 'CoreAzureBackup', enabled: true }
      { category: 'AddonAzureBackupJobs', enabled: true }
      { category: 'AddonAzureBackupPolicy', enabled: true }
      { category: 'AddonAzureBackupProtectedInstance', enabled: true }
    ]
  }
}

output vaultId string = vault.id`,
      },
    ],
  },
  verification: [
    {
      command: 'az backup item list -g <rg> --vault-name <vault> -o table',
      what: 'Lists protected items with their protection status and last backup status.',
      expected: 'Your VM with Protection Status Healthy and Last Backup Status Completed.',
      placeholders: ['<rg>', '<vault>'],
    },
    {
      command: 'az backup job list -g <rg> --vault-name <vault> -o table',
      what: 'Shows backup and restore jobs with status and duration.',
      placeholders: ['<rg>', '<vault>'],
    },
    {
      command:
        'az backup recoverypoint list -g <rg> --vault-name <vault> --container-name <vm> --item-name <vm> --backup-management-type AzureIaasVM -o table',
      what: 'Lists recovery points and their tier (snapshot, vault or both).',
      expected: 'Recovery point names you can pass to restore commands.',
      placeholders: ['<rg>', '<vault>', '<vm>'],
    },
    {
      command: 'az backup vault backup-properties show -g <rg> -n <vault>',
      what: 'Confirms redundancy, cross-region restore and soft delete settings.',
      placeholders: ['<rg>', '<vault>'],
    },
  ],
  troubleshooting: [
    {
      command:
        'az backup job show -g <rg> --vault-name <vault> -n <job-id> --query properties.errorDetails',
      what: 'A backup job failed: read the error code, for example a VM agent that is not responding.',
      placeholders: ['<rg>', '<vault>', '<job-id>'],
    },
    {
      command: 'az vm get-instance-view -g <rg> -n <vm> --query instanceView.vmAgent.statuses',
      what: 'VM backups need a healthy Azure VM agent in the guest. Check it reports Ready.',
      expected: 'displayStatus Ready.',
      placeholders: ['<rg>', '<vm>'],
    },
    {
      command:
        'az backup item list -g <rg> --vault-name <vault> --query "[].properties.isScheduledForDeferredDelete"',
      what: 'The vault will not delete: soft-deleted items still count. Undelete and delete properly, or wait for retention to end.',
      namespaceNote:
        'A vault cannot be deleted while it holds protected or soft-deleted items, registered servers or Site Recovery items.',
      placeholders: ['<rg>', '<vault>'],
    },
    {
      command: 'az backup vault show -g <rg> -n <vault> --query location',
      what: 'Enable protection fails for a VM: confirm the vault is in the same region as the VM.',
      placeholders: ['<rg>', '<vault>'],
    },
  ],
  commonMistakes: [
    'Creating the Recovery Services vault in a different region from the VMs. Azure Backup for VMs needs the vault in the same region.',
    'Putting the Site Recovery vault in the source region. For Azure-to-Azure replication it belongs in the target region.',
    'Trying to switch a vault from GRS to LRS after protecting items. Redundancy is fixed once the first item is protected, so choose it first.',
    'Expecting cross-region restore on an LRS or ZRS vault. CRR needs GRS and must be enabled on the vault.',
    'Looking for Azure VM backup in a Backup vault, or disk and blob backup in a Recovery Services vault. The datasource decides the vault.',
    'Running a real failover as a drill. Test failover is the non-disruptive option; a real failover needs commit and re-protect afterwards.',
    'Opening backup reports and seeing nothing. Reports need diagnostic settings on each vault sending data to Log Analytics.',
  ],
  examTips: [
    'Vault location: **Backup** = same region as the resource; **Site Recovery** = the target region.',
    'Recovery Services vault: Azure VMs, SQL/SAP HANA in VMs, Azure Files, MARS. Backup vault: managed disks, blobs, PostgreSQL flexible server, AKS.',
    'Need one file back quickly? **File-level recovery**. Need to change VM settings before it boots? **Restore disks**. Keep the same VM? **Replace existing**.',
    'Soft delete keeps deleted backup data for **14 days** by default. You can undelete within that window.',
    'Site Recovery order: test failover, failover, commit, re-protect, fail back. Recovery plans sequence multi-tier apps.',
    'Backup reports require a **Log Analytics workspace** and diagnostic settings; alerts are delivered through **Azure Monitor** and action groups.',
  ],
  summary: [
    'Azure Backup restores data; Site Recovery keeps VMs running in another region.',
    'Recovery Services vaults cover VMs, in-VM databases, Azure Files and MARS; Backup vaults cover disks, blobs, PostgreSQL flexible and AKS.',
    'Policies set schedule and retention; enhanced VM policies allow multiple backups a day and longer instant restore retention.',
    'Restore options: new VM, restore disks, replace existing, file-level recovery, and cross-region restore with GRS.',
    'Soft delete, immutability and multi-user authorization protect backups; reports and alerts come from Log Analytics and Azure Monitor.',
  ],
  practice: [
    {
      id: 'az1-backup-recovery-p1',
      level: 'beginner',
      prompt:
        'You have VMs in West Europe and a Recovery Services vault in North Europe. Can you back up the VMs to it?',
      answer:
        'No. Azure Backup for VMs requires the vault to be in the same region as the VM, so you need a Recovery Services vault in West Europe.',
      explanation:
        'The vault can be in any resource group, but the region must match. Cross-region copies come from GRS and cross-region restore, not from a remote vault.',
    },
    {
      id: 'az1-backup-recovery-p2',
      level: 'intermediate',
      prompt:
        'A user deleted a single spreadsheet from a VM data disk yesterday. What is the fastest restore option that does not touch the running VM?',
      answer:
        'File-level recovery: pick the recovery point from yesterday, download and run the mount script on a machine, copy the file, then unmount.',
      explanation:
        'Replace existing would roll back the whole disk, and restore disks or a new VM is slower and restores far more than needed.',
    },
    {
      id: 'az1-backup-recovery-p3',
      level: 'intermediate',
      prompt:
        'You need to back up Azure managed disks and blob containers, and Azure VMs. How many vault types do you need and why?',
      answer:
        'Two: a Backup vault for the managed disks and blobs, and a Recovery Services vault for the Azure VMs.',
      explanation:
        'Each vault type supports a specific set of datasources, so a mixed estate commonly has both.',
    },
    {
      id: 'az1-backup-recovery-p4',
      level: 'advanced',
      prompt:
        'After a regional outage you failed over VMs with Site Recovery to the secondary region. The primary region is back. List the remaining steps to return home.',
      answer:
        'Commit the failover (if not already), re-protect so the VMs replicate from secondary back to primary, run a failover back to the primary region, commit, and re-protect again to resume primary-to-secondary replication.',
      explanation:
        'Without re-protect there is nothing replicating back, so a failback has no up-to-date copy to fail over to.',
    },
  ],
  lab: {
    title: 'Back up a VM, restore its disks, and clean up a protected vault',
    scenario:
      'Protect a small Linux VM with a Recovery Services vault, take an on-demand backup, restore its disks into another resource group, and learn why a vault with backup data resists deletion.',
    prerequisites: [
      'An Azure subscription (free account works) and Azure Cloud Shell (Bash) or Azure CLI 2.60+',
      'About 60 minutes: the first backup of a VM can take 30 minutes or more',
    ],
    tasks: [
      {
        instruction:
          'Create resource group rg-bkp-lab in eastus and a Standard_B1s Ubuntu VM vm-bkp with no public IP.',
      },
      {
        instruction:
          'Create Recovery Services vault rsv-bkp-lab in eastus and set its storage redundancy to LocallyRedundant before protecting anything.',
        hint: 'az backup vault backup-properties set --backup-storage-redundancy LocallyRedundant',
      },
      {
        instruction:
          'Enable protection for vm-bkp with DefaultPolicy and trigger an on-demand backup.',
      },
      {
        instruction: 'Watch the job until it completes and list the recovery points.',
        hint: 'The snapshot phase completes first; the vault transfer follows.',
      },
      {
        instruction:
          'Restore disks from the latest recovery point into rg-bkp-restore, using a staging storage account in eastus.',
      },
      {
        instruction:
          'Check the vault soft delete setting, then disable soft delete, stop protection with delete backup data, and delete both resource groups.',
        hint: 'With soft delete on, deleted backup data stays for 14 days and blocks deleting the vault.',
      },
    ],
    solution: [
      {
        title: 'Create the VM and vault, then protect and back up',
        language: 'bash',
        code: `RG=rg-bkp-lab
LOC=eastus
VAULT=rsv-bkp-lab
az group create -n $RG -l $LOC
az vm create -g $RG -n vm-bkp --image Ubuntu2204 --size Standard_B1s \\
  --public-ip-address "" --admin-username azureuser --generate-ssh-keys

az backup vault create -g $RG -n $VAULT -l $LOC
az backup vault backup-properties set -g $RG -n $VAULT \\
  --backup-storage-redundancy LocallyRedundant

az backup protection enable-for-vm -g $RG --vault-name $VAULT \\
  --vm vm-bkp --policy-name DefaultPolicy

az backup protection backup-now -g $RG --vault-name $VAULT \\
  --container-name vm-bkp --item-name vm-bkp \\
  --backup-management-type AzureIaasVM --retain-until 31-12-2026

az backup job list -g $RG --vault-name $VAULT -o table`,
      },
      {
        title: 'Restore disks into a separate resource group',
        language: 'bash',
        code: `az group create -n rg-bkp-restore -l $LOC
ST=stbkp$RANDOM
az storage account create -g rg-bkp-restore -n $ST -l $LOC --sku Standard_LRS

RP=$(az backup recoverypoint list -g $RG --vault-name $VAULT \\
  --container-name vm-bkp --item-name vm-bkp \\
  --backup-management-type AzureIaasVM --query "[0].name" -o tsv)

az backup restore restore-disks -g $RG --vault-name $VAULT \\
  --container-name vm-bkp --item-name vm-bkp --rp-name $RP \\
  --storage-account $ST --target-resource-group rg-bkp-restore

az backup job list -g $RG --vault-name $VAULT --operation Restore -o table`,
      },
    ],
    verification: [
      {
        command: 'az backup item list -g rg-bkp-lab --vault-name rsv-bkp-lab -o table',
        what: 'Confirms the VM is protected and the last backup completed.',
        expected: 'vm-bkp with Last Backup Status Completed.',
      },
      {
        command: 'az disk list -g rg-bkp-restore -o table',
        what: 'Confirms the restored managed disks exist in the restore resource group.',
        expected: 'An OS disk restored from the recovery point.',
      },
    ],
    cleanup: [
      {
        command:
          'az backup vault backup-properties set -g rg-bkp-lab -n rsv-bkp-lab --soft-delete-feature-state Disable',
        what: 'Turns off soft delete for this lab vault so deleted backup data is purged immediately.',
      },
      {
        command:
          'az backup protection disable -g rg-bkp-lab --vault-name rsv-bkp-lab --container-name vm-bkp --item-name vm-bkp --backup-management-type AzureIaasVM --delete-backup-data true --yes',
        what: 'Stops protection and deletes the backup data so the vault becomes empty.',
      },
      {
        command: 'az group delete -n rg-bkp-restore --yes --no-wait',
        what: 'Deletes the restored disks and staging storage account.',
      },
      {
        command: 'az group delete -n rg-bkp-lab --yes --no-wait',
        what: 'Deletes the VM, vault and remaining resources.',
      },
    ],
  },
  relatedTopicIds: [
    'az1-azure-monitor',
    'az1-virtual-machines',
    'az1-azure-files',
    'az1-blob-storage',
    'az1-storage-accounts',
  ],
  docs: [
    {
      title: 'What is Azure Backup?',
      url: 'https://learn.microsoft.com/azure/backup/backup-overview',
    },
    {
      title: 'Recovery Services vaults overview',
      url: 'https://learn.microsoft.com/azure/backup/backup-azure-recovery-services-vault-overview',
    },
    {
      title: 'Backup vaults overview',
      url: 'https://learn.microsoft.com/azure/backup/backup-vault-overview',
    },
    {
      title: 'Restore Azure VM data in the Azure portal',
      url: 'https://learn.microsoft.com/azure/backup/backup-azure-arm-restore-vms',
    },
    {
      title: 'Soft delete for Azure Backup',
      url: 'https://learn.microsoft.com/azure/backup/backup-azure-security-feature-cloud',
    },
    {
      title: 'Immutable vault for Azure Backup',
      url: 'https://learn.microsoft.com/azure/backup/backup-azure-immutable-vault-concept',
    },
    {
      title: 'Set up disaster recovery for Azure VMs',
      url: 'https://learn.microsoft.com/azure/site-recovery/azure-to-azure-tutorial-enable-replication',
    },
    {
      title: 'About recovery plans',
      url: 'https://learn.microsoft.com/azure/site-recovery/recovery-plan-overview',
    },
    {
      title: 'Configure Azure Backup reports',
      url: 'https://learn.microsoft.com/azure/backup/configure-reports',
    },
  ],
}
