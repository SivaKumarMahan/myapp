import type { Topic } from '../../../types'

export const virtualMachines: Topic = {
  id: 'az1-virtual-machines',
  title: 'Virtual machines: sizes, disks, encryption and availability',
  domainId: 'az1-compute',
  difficulty: 'beginner',
  estimatedMinutes: 40,
  order: 2,
  tags: [
    'vm',
    'managed disks',
    'resize',
    'encryption at host',
    'ade',
    'availability set',
    'availability zone',
    'move',
  ],
  oneLiner:
    'Create and size Azure VMs, choose the right managed disks, encrypt them, and place them so a single failure does not take you down.',
  explanation: [
    'An **Azure virtual machine** is infrastructure as a service: Microsoft runs the physical host, hypervisor and datacenter, and you manage everything from the guest operating system up - patches, software, firewall inside the OS and data. A VM is not one resource but a small family: the VM itself, a **network interface (NIC)** in a subnet, an **OS disk**, optional **data disks**, and usually a public IP or none at all if you connect through Azure Bastion.',
    'The **size** decides the vCPU count, memory, temporary storage, maximum data disks, network bandwidth and disk throughput. Sizes are grouped into families by letter: B (burstable), D (general purpose), E (memory optimised), F (compute optimised), L (storage optimised), M (very large memory), N (GPU). A name like `Standard_D4s_v5` reads as family D, 4 vCPUs, `s` = supports Premium SSD, version 5.',
    'VM disks are **managed disks**: Azure handles the underlying storage and you pick a type. From fastest to cheapest they are **Ultra Disk**, **Premium SSD v2**, **Premium SSD**, **Standard SSD** and **Standard HDD**. The **temporary disk** that many sizes include is local to the host and is lost when the VM is deallocated or moved - never keep data there.',
    'For resilience you place VMs either in an **availability set** (spread across fault domains and update domains inside one datacenter) or across **availability zones** (physically separate datacenters in a region). You make this choice at creation time; changing it later means recreating the VM.',
  ],
  whyItMatters: [
    'Deploying and managing VMs is a large part of the AZ-104 compute domain: create a VM, resize it, add disks, configure encryption, choose between availability sets and zones, and move VMs between resource groups, subscriptions or regions.',
    'Most real Azure estates still run many VMs - legacy line-of-business apps, domain controllers, jump hosts, third-party appliances. Picking the wrong disk type or size is one of the most common causes of both poor performance and wasted spend.',
    'Availability decisions are made up front. An engineer who knows that zone placement and availability-set membership are set at creation time avoids an expensive rebuild later.',
  ],
  howItWorks: [
    'When you create a VM, Azure allocates it on a host in a hardware cluster that supports the size you asked for. **Stopping** from inside the OS leaves the VM allocated and billed for compute; **Stop (deallocate)** from Azure releases the host, stops compute billing, loses the temporary disk and releases a dynamic public IP.',
    '**Resizing** changes the size in place with a restart. If the new size is not available on the current hardware cluster, you must deallocate first so Azure can place the VM on a cluster that offers it. `az vm list-vm-resize-options` shows sizes available without deallocation.',
    'Disks are separate Azure resources (`Microsoft.Compute/disks`). You can attach and detach data disks while the VM runs, expand a disk (then extend the partition in the OS), change the disk type (usually with the VM deallocated), and take snapshots. The number of data disks and total throughput are capped by the VM size, not only by the disk.',
    'All managed disks are encrypted at rest by **server-side encryption (SSE)** with platform-managed keys by default. You can switch to **customer-managed keys** in Key Vault through a **disk encryption set**. **Encryption at host** extends encryption to the temporary disk and the OS and data disk caches on the host, so data is encrypted before it reaches storage.',
    "**Azure Disk Encryption (ADE)** is different: it encrypts inside the guest with BitLocker (Windows) or DM-Crypt (Linux) using keys in Key Vault. Microsoft now recommends encryption at host for new deployments and has announced ADE's retirement, but you may still meet ADE in existing estates and exam questions.",
    'An **availability set** spreads VMs across up to 3 **fault domains** (separate racks with their own power and network) and up to 20 **update domains** (groups rebooted together during host maintenance, 5 by default). **Availability zones** go further: each zone is one or more datacenters with independent power, cooling and networking, so a zonal deployment survives a whole-datacenter failure and carries a higher SLA.',
    'Moving: VMs can move between resource groups and subscriptions in the same region with `az resource move` - the NIC, disks and public IP must move too, and the resource ids change. Moving to another region uses **Azure Resource Mover** or Azure Site Recovery, which replicate and recreate the VM in the target region.',
  ],
  diagrams: [
    {
      kind: 'nested',
      title: 'What a VM deployment really contains',
      caption:
        'A VM is a group of resources. The NIC, disks and public IP are separate objects that must move and be deleted with it.',
      root: {
        label: 'Resource group',
        children: [
          {
            label: 'Virtual machine',
            detail: 'Size, image, OS profile',
            tone: 'accent',
            children: [
              { label: 'OS disk', detail: 'Managed disk, persistent' },
              { label: 'Data disks', detail: 'Managed disks, count capped by size' },
              {
                label: 'Temporary disk',
                detail: 'Host-local, lost on deallocate',
                tone: 'warning',
              },
            ],
          },
          {
            label: 'Network interface',
            detail: 'Private IP in a subnet, optional NSG',
            children: [{ label: 'Public IP (optional)', detail: 'Standard SKU, static' }],
          },
        ],
      },
    },
    {
      kind: 'decision',
      title: 'Availability set or availability zones?',
      caption:
        'Zones protect against a datacenter failure; availability sets protect against a rack or host failure in one datacenter.',
      question: 'What failure must the workload survive?',
      branches: [
        {
          condition: 'A whole datacenter going offline',
          result: 'Availability zones',
          detail: 'Two or more zones, highest VM SLA',
          tone: 'success',
        },
        {
          condition: 'A rack or host update, region has no zones',
          result: 'Availability set',
          detail: 'Fault domains and update domains',
        },
        {
          condition: 'A single dev or test box',
          result: 'Single VM with Premium SSD',
          detail: 'Lower single-instance SLA',
          tone: 'muted',
        },
      ],
    },
  ],
  keyObjects: [
    {
      kind: 'Virtual machine (Microsoft.Compute/virtualMachines)',
      apiVersion: '2024-07-01',
      purpose: 'The compute instance: size, image, OS settings, disks and NICs.',
      fields: [
        {
          path: 'properties.hardwareProfile.vmSize',
          meaning: 'The size, for example Standard_D2s_v5. Change it to resize.',
          required: true,
        },
        {
          path: 'properties.storageProfile.osDisk.managedDisk.storageAccountType',
          meaning:
            'OS disk type: Premium_LRS, StandardSSD_LRS, Standard_LRS and zone-redundant variants.',
        },
        {
          path: 'properties.storageProfile.dataDisks[]',
          meaning: 'Attached data disks with lun, caching and size.',
        },
        {
          path: 'properties.securityProfile.encryptionAtHost',
          meaning: 'true to encrypt temp disk and caches on the host.',
        },
        {
          path: 'properties.availabilitySet.id',
          meaning: 'The availability set the VM belongs to; set only at creation.',
        },
        {
          path: 'zones',
          meaning: 'The availability zone, for example ["1"]; set only at creation.',
        },
      ],
    },
    {
      kind: 'Managed disk (Microsoft.Compute/disks)',
      apiVersion: '2024-03-02',
      purpose: 'Block storage for a VM, billed by provisioned size and type.',
      fields: [
        {
          path: 'sku.name',
          meaning:
            'UltraSSD_LRS, PremiumV2_LRS, Premium_LRS, Premium_ZRS, StandardSSD_LRS, StandardSSD_ZRS, Standard_LRS.',
        },
        { path: 'properties.diskSizeGB', meaning: 'Size; can be increased, never decreased.' },
        {
          path: 'properties.encryption.type',
          meaning: 'Platform-managed key, customer-managed key or both.',
        },
        {
          path: 'properties.encryption.diskEncryptionSetId',
          meaning: 'The disk encryption set holding the customer-managed key reference.',
        },
      ],
    },
    {
      kind: 'Availability set (Microsoft.Compute/availabilitySets)',
      purpose:
        'A logical grouping that spreads VMs across fault and update domains in one datacenter.',
      fields: [
        { path: 'properties.platformFaultDomainCount', meaning: 'Up to 3 in most regions.' },
        { path: 'properties.platformUpdateDomainCount', meaning: 'Up to 20; 5 by default.' },
        { path: 'sku.name', meaning: 'Aligned is required for VMs with managed disks.' },
      ],
    },
  ],
  realWorldExample: {
    title: 'The report server that forgot its files',
    story: [
      'A finance team ran a nightly report job on a VM and, to make it faster, wrote intermediate files to the D: drive. It was quick, because the D: drive is the temporary disk on local host storage.',
      "After a weekend where the VM was deallocated to save cost, Monday's job failed: the files it expected were gone. The temporary disk had been wiped when the VM was placed back on a host.",
      'The fix was to add a Premium SSD data disk for working files and keep only genuinely disposable data on the temporary disk. They also moved from a single VM to two VMs in separate availability zones behind a load balancer, which removed the maintenance-window outages they had accepted as normal.',
    ],
  },
  yamlExamples: [
    {
      title: 'A zonal Linux VM with a data disk and encryption at host (Bicep)',
      language: 'bicep',
      explanation:
        'The VM is pinned to zone 1, uses SSH keys only, has an attached Premium SSD data disk and encrypts temp disk and caches on the host. The NIC is assumed to exist.',
      code: `param location string = resourceGroup().location
param adminUsername string = 'azureuser'
@secure()
param sshPublicKey string
param nicId string

resource vm 'Microsoft.Compute/virtualMachines@2024-07-01' = {
  name: 'vm-web-01'
  location: location
  zones: [
    '1'
  ]
  properties: {
    hardwareProfile: {
      vmSize: 'Standard_D2s_v5'
    }
    securityProfile: {
      encryptionAtHost: true
    }
    osProfile: {
      computerName: 'vm-web-01'
      adminUsername: adminUsername
      linuxConfiguration: {
        disablePasswordAuthentication: true
        ssh: {
          publicKeys: [
            {
              path: '/home/\${adminUsername}/.ssh/authorized_keys'
              keyData: sshPublicKey
            }
          ]
        }
      }
    }
    storageProfile: {
      imageReference: {
        publisher: 'Canonical'
        offer: 'ubuntu-24_04-lts'
        sku: 'server'
        version: 'latest'
      }
      osDisk: {
        createOption: 'FromImage'
        managedDisk: {
          storageAccountType: 'Premium_LRS'
        }
      }
      dataDisks: [
        {
          lun: 0
          createOption: 'Empty'
          diskSizeGB: 128
          managedDisk: {
            storageAccountType: 'Premium_LRS'
          }
        }
      ]
    }
    networkProfile: {
      networkInterfaces: [
        {
          id: nicId
        }
      ]
    }
  }
}`,
    },
    {
      title: 'Resize and change a disk type with PowerShell',
      language: 'powershell',
      explanation:
        'Deallocate first so the new size can land on any hardware cluster and the disk SKU can change.',
      code: `$rg = 'rg-vm-lab'
Stop-AzVM -ResourceGroupName $rg -Name 'vm-web-01' -Force

$vm = Get-AzVM -ResourceGroupName $rg -Name 'vm-web-01'
$vm.HardwareProfile.VmSize = 'Standard_D4s_v5'
Update-AzVM -ResourceGroupName $rg -VM $vm

$disk = Get-AzDisk -ResourceGroupName $rg -DiskName 'vm-web-01_data0'
$disk.Sku = [Microsoft.Azure.Management.Compute.Models.DiskSku]::new('StandardSSD_LRS')
$disk | Update-AzDisk

Start-AzVM -ResourceGroupName $rg -Name 'vm-web-01'`,
    },
  ],
  imperative: [
    {
      command:
        'az vm create -g rg-vm-lab -n vm-web-01 --image Ubuntu2404 --size Standard_B2s --zone 1 --admin-username azureuser --generate-ssh-keys --public-ip-address "" --nsg ""',
      what: 'Creates a zonal Ubuntu VM with SSH keys, no public IP and no NIC-level NSG (connect through Bastion).',
      expected: 'JSON with powerState "VM running" and a privateIpAddress.',
    },
    {
      command: 'az vm list-vm-resize-options -g rg-vm-lab -n vm-web-01 -o table',
      what: 'Lists sizes you can resize to without deallocating.',
    },
    {
      command: 'az vm resize -g rg-vm-lab -n vm-web-01 --size Standard_D2s_v5',
      what: 'Resizes the VM. It restarts; deallocate first if the size is not in the list above.',
    },
    {
      command:
        'az vm disk attach -g rg-vm-lab --vm-name vm-web-01 --name data01 --new --size-gb 128 --sku Premium_LRS',
      what: 'Creates and attaches a new empty Premium SSD data disk. Partition and format it inside the OS afterwards.',
    },
    {
      command:
        'az vm deallocate -g rg-vm-lab -n vm-web-01 && az vm update -g rg-vm-lab -n vm-web-01 --set securityProfile.encryptionAtHost=true',
      what: 'Enables encryption at host (the subscription feature EncryptionAtHost must be registered first).',
    },
    {
      command:
        'New-AzVM -ResourceGroupName rg-vm-lab -Name vm-win-01 -Image Win2022Datacenter -Size Standard_D2s_v5 -Zone 2 -Credential (Get-Credential)',
      what: 'PowerShell equivalent: a Windows Server VM in zone 2.',
    },
  ],
  declarative: {
    steps: [
      'Declare the VNet, subnet and NIC (or reference them with existing).',
      'Declare the VM with its size, image, zone or availability set, and SSH or password settings.',
      'Declare OS and data disk types, and set encryptionAtHost or a disk encryption set.',
      'Run what-if, then deploy with az deployment group create.',
      'Change the size by editing vmSize and redeploying; ARM restarts the VM for you.',
    ],
    code: [
      {
        title: 'An availability set with two VMs (excerpt)',
        language: 'bicep',
        code: `resource avset 'Microsoft.Compute/availabilitySets@2024-07-01' = {
  name: 'avset-app'
  location: location
  sku: {
    name: 'Aligned'
  }
  properties: {
    platformFaultDomainCount: 2
    platformUpdateDomainCount: 5
  }
}

resource vms 'Microsoft.Compute/virtualMachines@2024-07-01' = [for i in range(0, 2): {
  name: 'vm-app-\${i}'
  location: location
  properties: {
    availabilitySet: {
      id: avset.id
    }
    hardwareProfile: {
      vmSize: 'Standard_D2s_v5'
    }
    // osProfile, storageProfile and networkProfile as in the zonal example
  }
}]`,
        explanation:
          'A loop creates two VMs in the same availability set, so Azure spreads them across two fault domains and separate update domains.',
      },
    ],
  },
  verification: [
    {
      command:
        'az vm show -g rg-vm-lab -n vm-web-01 -d --query "{size:hardwareProfile.vmSize, zone:zones[0], power:powerState, eah:securityProfile.encryptionAtHost}"',
      what: 'Shows size, zone, power state and whether encryption at host is on.',
      expected: '{ "size": "Standard_D2s_v5", "zone": "1", "power": "VM running", "eah": true }',
    },
    {
      command:
        'az disk list -g rg-vm-lab --query "[].{name:name, sku:sku.name, sizeGb:diskSizeGB, state:diskState}" -o table',
      what: 'Lists every managed disk with type, size and whether it is attached.',
      expected: 'OS disk and data01 with diskState Attached.',
    },
    {
      command: 'Get-AzVM -ResourceGroupName rg-vm-lab -Name vm-web-01 -Status',
      what: 'PowerShell view of power state, provisioning state and VM agent status.',
    },
  ],
  troubleshooting: [
    {
      command: 'az vm get-instance-view -g rg-vm-lab -n vm-web-01 --query instanceView.statuses',
      what: 'Shows provisioning and power status codes when a VM will not start or a resize failed.',
      expected: 'ProvisioningState/succeeded and PowerState/running.',
    },
    {
      command:
        'az vm list-skus -l westeurope --size Standard_D4s --query "[].{name:name, zones:locationInfo[0].zones, restrictions:restrictions}" -o table',
      what: 'Checks whether a size is offered in a region and zone, and whether your subscription is restricted from it.',
    },
    {
      command: 'az vm boot-diagnostics get-boot-log -g rg-vm-lab -n vm-web-01',
      what: 'Reads the serial console log when a VM boots but is unreachable.',
    },
    {
      command: 'az vm list-usage -l westeurope -o table',
      what: 'Shows vCPU quota use per family - a resize or create fails with a quota error when a family is exhausted.',
    },
  ],
  commonMistakes: [
    'Storing data on the temporary disk. It is lost on deallocation, redeploy and some maintenance events.',
    'Expecting to add an existing VM to an availability set or zone. Both are set at creation; to change them you recreate the VM from its disks.',
    'Thinking that shutting down from inside the OS stops billing. Only Stop (deallocate) releases compute billing.',
    'Picking a size without the `s` suffix and then trying to attach Premium SSD disks.',
    'Confusing ADE with SSE. SSE (on by default) encrypts at the storage layer; ADE encrypts inside the guest; encryption at host covers the temp disk and caches.',
    'Moving a VM to another resource group without its NIC, disks and public IP, or expecting resource ids to stay the same after a move.',
  ],
  examTips: [
    'Availability set: up to 3 fault domains and 20 update domains, protects within one datacenter. Availability zones: separate datacenters, higher SLA. You cannot combine an availability set and a zone for one VM.',
    'If a resize target is not listed, deallocate the VM and try again - the answer "stop (deallocate) the VM, then resize" is common.',
    'Disk types in order of performance: Ultra, Premium SSD v2, Premium SSD, Standard SSD, Standard HDD. Ultra and Premium SSD v2 cannot be used as OS disks.',
    'Encryption questions: "encrypt temp disk and caches" means encryption at host; "use my own key in Key Vault for managed disks" means a disk encryption set with customer-managed keys; "BitLocker inside the VM" means ADE.',
    'Moving across regions uses Azure Resource Mover (or ASR); moving across resource groups or subscriptions uses Move in the portal, `az resource move` or `Move-AzResource`.',
  ],
  summary: [
    'A VM is a VM resource plus a NIC, managed disks and optionally a public IP.',
    'Sizes set CPU, memory, disk count and throughput; resizing restarts the VM and may need deallocation.',
    'Managed disk types range from Ultra to Standard HDD; the temporary disk is not persistent.',
    'SSE is on by default; add customer-managed keys, encryption at host, or (legacy) ADE for further requirements.',
    'Choose availability zones or an availability set at creation time; changing later means recreating.',
  ],
  practice: [
    {
      id: 'az1-virtual-machines-p1',
      level: 'beginner',
      prompt:
        'You try to resize a running VM to Standard_E8s_v5 and the size is not offered. What should you do?',
      answer:
        'Stop (deallocate) the VM, then resize it. Deallocation lets Azure place the VM on a hardware cluster that supports the new size.',
      explanation:
        'Sizes shown by list-vm-resize-options are those available on the current cluster; others require deallocation.',
    },
    {
      id: 'az1-virtual-machines-p2',
      level: 'intermediate',
      prompt:
        'A security team requires that the VM temporary disk and disk caches are encrypted, without installing anything inside the guest OS. What do you enable?',
      answer:
        'Encryption at host (securityProfile.encryptionAtHost = true), after registering the EncryptionAtHost feature on the subscription.',
      explanation:
        'SSE encrypts data at rest in storage but not the host-side temp disk and caches; ADE works inside the guest.',
    },
    {
      id: 'az1-virtual-machines-p3',
      level: 'intermediate',
      prompt:
        'An existing VM must now be protected against a datacenter failure. It was created with no zone. What is the simplest supported approach?',
      answer:
        'Create a new VM in the required zone (for example from a snapshot of the existing disks), then deploy at least one more VM in another zone behind a load balancer.',
      explanation:
        'Zone and availability-set placement are chosen at creation. A single VM, even zonal, does not survive the loss of its own zone.',
    },
    {
      id: 'az1-virtual-machines-p4',
      level: 'beginner',
      prompt: 'Which VM power state stops compute charges: Stopped or Stopped (deallocated)?',
      answer:
        'Stopped (deallocated). A VM that is merely Stopped from inside the OS still holds its host allocation and is billed for compute.',
    },
  ],
  lab: {
    title: 'Create, extend, resize and inspect a VM',
    scenario:
      'Build a small zonal Linux VM, attach a data disk, resize it, and confirm what happens to disks when you deallocate.',
    prerequisites: [
      'An Azure subscription with vCPU quota for B and D series',
      'Azure Cloud Shell (Bash)',
    ],
    tasks: [
      {
        instruction:
          'Create resource group rg-vm-lab and a Ubuntu VM vm-web-01 in zone 1 with size Standard_B2s and SSH keys.',
      },
      {
        instruction: 'Attach a new 64 GB Standard SSD data disk named data01.',
        hint: 'az vm disk attach --new',
      },
      {
        instruction:
          'List the resize options, then resize to Standard_D2s_v5 (deallocate first if needed).',
      },
      {
        instruction: 'Change data01 to Premium_LRS while the VM is deallocated.',
        hint: 'az disk update --sku',
      },
      { instruction: 'Start the VM and verify size, zone and disk types.' },
    ],
    solution: [
      {
        title: 'Azure CLI',
        language: 'bash',
        code: `az group create -n rg-vm-lab -l westeurope
az vm create -g rg-vm-lab -n vm-web-01 --image Ubuntu2404 --size Standard_B2s \\
  --zone 1 --admin-username azureuser --generate-ssh-keys --public-ip-address ""

az vm disk attach -g rg-vm-lab --vm-name vm-web-01 --name data01 --new --size-gb 64 --sku StandardSSD_LRS

az vm list-vm-resize-options -g rg-vm-lab -n vm-web-01 -o table
az vm deallocate -g rg-vm-lab -n vm-web-01
az vm resize -g rg-vm-lab -n vm-web-01 --size Standard_D2s_v5
az disk update -g rg-vm-lab -n data01 --sku Premium_LRS
az vm start -g rg-vm-lab -n vm-web-01`,
      },
    ],
    verification: [
      {
        command:
          'az vm show -g rg-vm-lab -n vm-web-01 --query "{size:hardwareProfile.vmSize, zone:zones[0]}"',
        what: 'Confirms the new size and the zone.',
        expected: '{ "size": "Standard_D2s_v5", "zone": "1" }',
      },
      {
        command: 'az disk show -g rg-vm-lab -n data01 --query sku.name -o tsv',
        what: 'Confirms the disk type changed.',
        expected: 'Premium_LRS',
      },
    ],
    cleanup: [
      {
        command: 'az group delete -n rg-vm-lab --yes --no-wait',
        what: 'Deletes the VM, disks, NIC and VNet.',
      },
    ],
  },
  relatedTopicIds: [
    'az1-vm-scale-sets',
    'az1-arm-bicep',
    'az1-nsg-bastion',
    'az1-backup-recovery',
    'az1-dns-load-balancing',
  ],
  docs: [
    {
      title: 'Virtual machines in Azure',
      url: 'https://learn.microsoft.com/azure/virtual-machines/overview',
    },
    {
      title: 'Azure managed disk types',
      url: 'https://learn.microsoft.com/azure/virtual-machines/disks-types',
    },
    {
      title: 'Overview of managed disk encryption options',
      url: 'https://learn.microsoft.com/azure/virtual-machines/disk-encryption-overview',
    },
    {
      title: 'Availability options for Azure Virtual Machines',
      url: 'https://learn.microsoft.com/azure/virtual-machines/availability',
    },
    {
      title: 'Move a VM to another resource group or subscription',
      url: 'https://learn.microsoft.com/azure/azure-resource-manager/management/move-resource-group-and-subscription',
    },
  ],
}
