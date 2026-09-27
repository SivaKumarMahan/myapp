import type { Topic } from '../../../types'

export const nsgBastion: Topic = {
  id: 'az1-nsg-bastion',
  title: 'Network security groups, ASGs and Azure Bastion',
  domainId: 'az1-networking',
  difficulty: 'intermediate',
  estimatedMinutes: 35,
  order: 3,
  tags: ['nsg', 'asg', 'service-tags', 'effective-security-rules', 'bastion', 'az-104'],
  oneLiner:
    'Filter traffic to subnets and NICs with prioritised allow/deny rules, group VMs with ASGs, and reach VMs over RDP/SSH through Azure Bastion without public IPs.',
  explanation: [
    'A **network security group (NSG)** is a list of allow and deny rules that Azure checks for traffic entering or leaving a subnet or a network interface (NIC). Each rule matches on source, destination, port, protocol and direction, and has a **priority** from 100 to 4096. Azure checks rules from the lowest number upward and stops at the first match, so a deny at priority 200 beats an allow at priority 300.',
    'Every NSG also carries **default rules** you cannot delete. Inbound: `AllowVnetInBound` (65000), `AllowAzureLoadBalancerInBound` (65001) and `DenyAllInBound` (65500). Outbound: `AllowVnetOutBound` (65000), `AllowInternetOutBound` (65001) and `DenyAllOutBound` (65500). Your own rules always win because their priorities are lower numbers, but you can only override the defaults, never remove them.',
    'Instead of typing IP ranges you can use **service tags** such as `Internet`, `VirtualNetwork`, `AzureLoadBalancer`, `Storage.WestEurope` or `AzureCloud`. Microsoft maintains the address prefixes behind them. **Application security groups (ASGs)** do the same trick for your own VMs: you tag NICs as members of `asg-web` or `asg-db` and write rules against those names instead of IP addresses.',
    '**Azure Bastion** is a managed jump host. It lives in a dedicated subnet named exactly `AzureBastionSubnet` and gives you RDP and SSH to VMs in the browser (or from your native client on higher SKUs) over TLS on port 443. The VMs themselves need no public IP address, which removes RDP and SSH from the internet entirely.',
  ],
  whyItMatters: [
    'NSGs are the most frequently tested networking control on AZ-104. Expect scenarios where two rules conflict, where an NSG sits on both the subnet and the NIC, or where you must work out why traffic is blocked from a rule table.',
    'Opening RDP (3389) or SSH (22) to the internet is one of the most common causes of compromised VMs. Bastion plus NSGs is the standard pattern that removes those ports from public exposure while keeping administrators productive.',
    'Effective security rules and IP flow verify are the tools you reach for during an outage. Knowing that Azure combines subnet and NIC NSGs, and in which order, turns a guessing game into a two-minute diagnosis.',
  ],
  howItWorks: [
    'An NSG is a regional resource. You associate it with zero or more subnets and zero or more NICs in the same region. One subnet or NIC can have at most one NSG associated with it.',
    'For **inbound** traffic Azure evaluates the NSG on the subnet first, then the NSG on the NIC. For **outbound** traffic the order reverses: NIC first, then subnet. Traffic must be allowed by both NSGs where both exist; a deny in either one drops the packet.',
    'Within one NSG, rules are processed in priority order (100 is highest priority, 4096 lowest of the custom range). The first rule that matches decides the outcome and no further rules are checked. Default rules sit at 65000 and above so they only apply when nothing you wrote matched.',
    'NSGs are **stateful**. If an inbound rule allows a TCP connection on port 443, the return traffic is allowed automatically; you do not need a matching outbound rule. Existing flows are not interrupted when you add a new deny rule until the flow ends.',
    'ASGs are referenced as a source or destination in a rule. A NIC can belong to several ASGs, and all NICs in an ASG must be in the same virtual network. Rules that reference ASGs stay correct when VMs are added or their IPs change.',
    '**Effective security rules** show the merged view Azure actually applies to a NIC: subnet NSG plus NIC NSG, with service tags and ASGs expanded into prefixes. Use `az network nic list-effective-nsg` or the portal blade on the NIC; the VM must be running.',
    'Bastion is deployed into `AzureBastionSubnet` (a /26 or larger is required for Basic and above). The browser connects to Bastion over 443, and Bastion opens RDP or SSH to the private IP of the target VM. SKUs are **Developer** (free, shared, no dedicated subnet, limited regions), **Basic**, **Standard** (host scaling, native client, IP-based connection, custom ports, shareable links) and **Premium** (adds session recording and private-only deployment).',
  ],
  diagrams: [
    {
      kind: 'flow',
      title: 'How an inbound packet is filtered',
      caption:
        'Inbound traffic meets the subnet NSG first and the NIC NSG second. Both must allow it; the first matching rule in each NSG decides.',
      nodes: [
        {
          label: 'Packet arrives from the internet',
          detail: 'TCP 443 to 10.0.1.4',
          tone: 'muted',
        },
        {
          label: 'Subnet NSG evaluated',
          detail: 'Lowest priority number first, first match stops',
          arrowLabel: 'inbound',
          branch: {
            label: 'Matched a deny rule',
            detail: 'Dropped, NIC NSG never checked',
            tone: 'danger',
          },
        },
        {
          label: 'NIC NSG evaluated',
          detail: 'Same logic, independent rule list',
          arrowLabel: 'allowed',
          branch: {
            label: 'Matched a deny rule',
            detail: 'Dropped even though the subnet allowed it',
            tone: 'danger',
          },
        },
        {
          label: 'Delivered to the VM',
          detail: 'Return traffic allowed automatically, stateful',
          arrowLabel: 'allowed',
          tone: 'success',
        },
      ],
    },
    {
      kind: 'decision',
      title: 'Choosing an Azure Bastion SKU',
      caption:
        'Pick the cheapest SKU that has the feature you need. Native client and IP-based connection are the usual reasons to move to Standard.',
      question: 'What do you need from Bastion?',
      branches: [
        {
          condition: 'a free test connection to one VM',
          result: 'Developer',
          detail: 'Shared infrastructure, no AzureBastionSubnet',
          tone: 'muted',
        },
        {
          condition: 'browser RDP and SSH only',
          result: 'Basic',
          detail: 'Dedicated host, /26 AzureBastionSubnet',
        },
        {
          condition: 'native client, scaling, IP connect',
          result: 'Standard',
          detail: 'Also custom ports and shareable links',
          tone: 'accent',
        },
        {
          condition: 'session recording or private-only',
          result: 'Premium',
          detail: 'Everything in Standard plus compliance features',
        },
      ],
    },
  ],
  keyObjects: [
    {
      kind: 'Network security group (Microsoft.Network/networkSecurityGroups)',
      apiVersion: '2023-11-01',
      purpose:
        'Holds prioritised allow/deny rules and is associated with subnets and NICs in the same region.',
      fields: [
        {
          path: 'properties.securityRules[].properties.priority',
          meaning: '100 to 4096. Lower number is evaluated first and the first match wins.',
          required: true,
        },
        {
          path: 'properties.securityRules[].properties.direction',
          meaning: 'Inbound or Outbound.',
          required: true,
        },
        {
          path: 'properties.securityRules[].properties.access',
          meaning: 'Allow or Deny.',
          required: true,
        },
        {
          path: 'properties.securityRules[].properties.sourceAddressPrefix',
          meaning: 'CIDR, IP, service tag such as Internet or VirtualNetwork, or * for any.',
        },
        {
          path: 'properties.securityRules[].properties.destinationApplicationSecurityGroups',
          meaning: 'ASG references used instead of IP prefixes.',
        },
        {
          path: 'properties.defaultSecurityRules',
          meaning: 'Read-only 65000/65001/65500 rules that cannot be deleted.',
        },
      ],
    },
    {
      kind: 'Application security group (Microsoft.Network/applicationSecurityGroups)',
      apiVersion: '2023-11-01',
      purpose:
        'A named group of NICs used as the source or destination of NSG rules, so rules follow workloads rather than IPs.',
      fields: [
        {
          path: 'ipConfigurations[].properties.applicationSecurityGroups',
          meaning: 'Set on the NIC IP configuration to make the NIC a member.',
        },
        {
          path: 'location',
          meaning: 'Must match the region of the NICs and the NSG that references it.',
        },
      ],
    },
    {
      kind: 'Azure Bastion host (Microsoft.Network/bastionHosts)',
      apiVersion: '2023-11-01',
      purpose: 'Managed RDP/SSH gateway so VMs need no public IP.',
      fields: [
        {
          path: 'sku.name',
          meaning: 'Developer, Basic, Standard or Premium.',
          required: true,
        },
        {
          path: 'properties.ipConfigurations[].properties.subnet',
          meaning: 'Must be the subnet named AzureBastionSubnet, /26 or larger.',
          required: true,
        },
        {
          path: 'properties.enableTunneling',
          meaning: 'Native client support (az network bastion ssh/rdp). Standard or Premium only.',
        },
        {
          path: 'properties.scaleUnits',
          meaning: 'Host scaling for more concurrent sessions. Standard or Premium only.',
        },
      ],
    },
  ],
  realWorldExample: {
    title: 'The rule that was never reached',
    story: [
      'An operations team added an NSG rule "Allow-HTTPS-From-Partner" at priority 400 on the web subnet. The partner still could not connect. The rule looked correct in the portal, so the ticket bounced between teams for a day.',
      'Effective security rules on the web VM NIC told the real story. A broad "Deny-All-Internet" rule at priority 300, added months earlier during an incident, matched first. Because processing stops at the first match, the new allow rule was never evaluated.',
      'The fix was to renumber: partner allow at 250, the broad deny left at 300. The team then replaced raw IP rules with ASGs (asg-web, asg-api) and moved every RDP and SSH rule behind Azure Bastion, which removed port 22 and 3389 from the internet altogether.',
      'The lesson they wrote into their runbook: always check effective rules and IP flow verify before touching an NSG, and leave priority gaps (100, 200, 300) so urgent rules can be slotted in without a renumbering exercise.',
    ],
  },
  yamlExamples: [
    {
      title: 'NSG with ASG-based rules and a subnet association (Bicep)',
      language: 'bicep',
      explanation:
        'Rules refer to ASGs rather than IP ranges. The web tier accepts HTTPS from the internet; only the web tier can reach the database tier on 1433.',
      code: `param location string = resourceGroup().location

resource asgWeb 'Microsoft.Network/applicationSecurityGroups@2023-11-01' = {
  name: 'asg-web'
  location: location
}

resource asgDb 'Microsoft.Network/applicationSecurityGroups@2023-11-01' = {
  name: 'asg-db'
  location: location
}

resource nsg 'Microsoft.Network/networkSecurityGroups@2023-11-01' = {
  name: 'nsg-app'
  location: location
  properties: {
    securityRules: [
      {
        name: 'Allow-HTTPS-Web'
        properties: {
          priority: 100
          direction: 'Inbound'
          access: 'Allow'
          protocol: 'Tcp'
          sourceAddressPrefix: 'Internet'
          sourcePortRange: '*'
          destinationApplicationSecurityGroups: [ { id: asgWeb.id } ]
          destinationPortRange: '443'
        }
      }
      {
        name: 'Allow-Sql-From-Web'
        properties: {
          priority: 200
          direction: 'Inbound'
          access: 'Allow'
          protocol: 'Tcp'
          sourceApplicationSecurityGroups: [ { id: asgWeb.id } ]
          sourcePortRange: '*'
          destinationApplicationSecurityGroups: [ { id: asgDb.id } ]
          destinationPortRange: '1433'
        }
      }
    ]
  }
}`,
    },
    {
      title: 'Reading the default rules',
      language: 'bash',
      explanation:
        'The --include-default flag shows the six rules every NSG has. Your own rules appear above them because their priority numbers are lower.',
      code: `az network nsg rule list \\
  --resource-group <rg> \\
  --nsg-name nsg-app \\
  --include-default \\
  --query "[].{name:name, prio:priority, dir:direction, access:access}" \\
  --output table`,
      placeholders: ['<rg>'],
    },
  ],
  imperative: [
    {
      command: 'az network nsg create --resource-group <rg> --name nsg-web --location <region>',
      what: 'Creates an empty NSG. It already contains the six default rules.',
      expected: 'JSON with "provisioningState": "Succeeded" and defaultSecurityRules populated.',
      placeholders: ['<rg>', '<region>'],
    },
    {
      command:
        'az network nsg rule create -g <rg> --nsg-name nsg-web -n Allow-HTTP --priority 200 --direction Inbound --access Allow --protocol Tcp --source-address-prefixes Internet --destination-asgs asg-web --destination-port-ranges 80',
      what: 'Adds an inbound allow for HTTP from the Internet service tag to every NIC in asg-web.',
      expected: 'The rule is returned with "priority": 200.',
      placeholders: ['<rg>'],
    },
    {
      command:
        'az network vnet subnet update -g <rg> --vnet-name vnet-app --name snet-web --network-security-group nsg-web',
      what: 'Associates the NSG with a subnet so it filters every NIC in that subnet.',
      placeholders: ['<rg>'],
    },
    {
      command: 'az network asg create -g <rg> -n asg-web --location <region>',
      what: 'Creates an application security group.',
      placeholders: ['<rg>', '<region>'],
    },
    {
      command:
        'az network nic ip-config update -g <rg> --nic-name <nic> -n <ipconfig> --application-security-groups asg-web',
      what: 'Makes a NIC a member of the ASG so rules targeting asg-web apply to it.',
      placeholders: ['<rg>', '<nic>', '<ipconfig>'],
    },
    {
      command:
        'az network bastion create -g <rg> -n bas-hub --vnet-name vnet-app --public-ip-address pip-bastion --location <region> --sku Standard --enable-tunneling true',
      what: 'Deploys a Standard Bastion host with native client support. Takes several minutes.',
      expected: '"provisioningState": "Succeeded"',
      placeholders: ['<rg>', '<region>'],
    },
  ],
  declarative: {
    steps: [
      'Declare the VNet with a workload subnet and a subnet named exactly AzureBastionSubnet with a /26 prefix.',
      'Declare the NSG and its custom rules, leaving gaps between priorities.',
      'Associate the NSG with the workload subnet through the subnet networkSecurityGroup property.',
      'Declare a Standard SKU static public IP and the Bastion host referencing AzureBastionSubnet.',
      'Deploy with az deployment group create and run a what-if first to review changes.',
    ],
    code: [
      {
        title: 'VNet, NSG association and Azure Bastion (Bicep)',
        language: 'bicep',
        explanation:
          'Do not associate a custom NSG with AzureBastionSubnet unless it contains every rule Bastion requires; leaving it unassociated is the simplest safe choice for a lab.',
        code: `param location string = resourceGroup().location
param prefix string = 'lab'

resource nsgWeb 'Microsoft.Network/networkSecurityGroups@2023-11-01' = {
  name: 'nsg-\${prefix}-web'
  location: location
  properties: {
    securityRules: [
      {
        name: 'Allow-HTTP-Internet'
        properties: {
          priority: 200
          direction: 'Inbound'
          access: 'Allow'
          protocol: 'Tcp'
          sourceAddressPrefix: 'Internet'
          sourcePortRange: '*'
          destinationAddressPrefix: '*'
          destinationPortRange: '80'
        }
      }
    ]
  }
}

resource vnet 'Microsoft.Network/virtualNetworks@2023-11-01' = {
  name: 'vnet-\${prefix}'
  location: location
  properties: {
    addressSpace: { addressPrefixes: [ '10.10.0.0/16' ] }
    subnets: [
      {
        name: 'snet-web'
        properties: {
          addressPrefix: '10.10.1.0/24'
          networkSecurityGroup: { id: nsgWeb.id }
        }
      }
      {
        name: 'AzureBastionSubnet'
        properties: { addressPrefix: '10.10.255.0/26' }
      }
    ]
  }
}

resource pip 'Microsoft.Network/publicIPAddresses@2023-11-01' = {
  name: 'pip-\${prefix}-bastion'
  location: location
  sku: { name: 'Standard' }
  properties: { publicIPAllocationMethod: 'Static' }
}

resource bastion 'Microsoft.Network/bastionHosts@2023-11-01' = {
  name: 'bas-\${prefix}'
  location: location
  sku: { name: 'Standard' }
  properties: {
    enableTunneling: true
    ipConfigurations: [
      {
        name: 'ipconf'
        properties: {
          subnet: { id: '\${vnet.id}/subnets/AzureBastionSubnet' }
          publicIPAddress: { id: pip.id }
        }
      }
    ]
  }
}`,
      },
    ],
  },
  verification: [
    {
      command: 'az network nic list-effective-nsg -g <rg> -n <nic> --output json',
      what: 'Shows the merged subnet and NIC rules Azure applies to this NIC, with tags expanded.',
      expected: 'An effectiveSecurityRules array listing both custom and default rules.',
      namespaceNote: 'The VM must be running; a deallocated VM returns an error.',
      placeholders: ['<rg>', '<nic>'],
    },
    {
      command:
        'az network watcher test-ip-flow -g <rg> --vm <vm> --direction Inbound --protocol TCP --local 10.10.1.4:80 --remote 203.0.113.10:50000',
      what: 'Asks Network Watcher whether a specific flow is allowed and which rule decides it.',
      expected: '"access": "Allow" and "ruleName": "securityRules/Allow-HTTP-Internet"',
      placeholders: ['<rg>', '<vm>'],
    },
    {
      command:
        'az network bastion show -g <rg> -n <bastion> --query "{sku:sku.name, tunneling:enableTunneling}"',
      what: 'Confirms the Bastion SKU and whether native client support is on.',
      expected: '{ "sku": "Standard", "tunneling": true }',
      placeholders: ['<rg>', '<bastion>'],
    },
  ],
  troubleshooting: [
    {
      command: 'az network nsg rule list -g <rg> --nsg-name <nsg> --include-default -o table',
      what: 'Lists rules in priority order so you can spot a lower-numbered deny that matches first.',
      placeholders: ['<rg>', '<nsg>'],
    },
    {
      command:
        'az network vnet subnet show -g <rg> --vnet-name <vnet> -n <subnet> --query networkSecurityGroup.id',
      what: 'Checks whether a subnet NSG is also in play, since inbound traffic must pass both.',
      placeholders: ['<rg>', '<vnet>', '<subnet>'],
    },
    {
      command:
        'az network bastion ssh -g <rg> -n <bastion> --target-resource-id <vm-id> --auth-type ssh-key --username azureuser --ssh-key ~/.ssh/id_rsa',
      what: 'Native client SSH through Bastion. Fails with a SKU error on Basic or Developer.',
      expected: 'An interactive shell on the VM, or an error saying tunneling is not enabled.',
      namespaceNote: 'Needs the bastion and ssh az CLI extensions installed.',
      placeholders: ['<rg>', '<bastion>', '<vm-id>'],
    },
  ],
  commonMistakes: [
    'Thinking a higher priority number means higher priority. It is the reverse: 100 is evaluated before 4096.',
    'Adding an allow rule on the NIC NSG and forgetting the subnet NSG still denies the traffic. Inbound must pass both.',
    'Creating a rule to deny all inbound traffic at a low number and then wondering why the load balancer health probe fails. The probe comes from the AzureLoadBalancer tag, which the default rule at 65001 would otherwise allow.',
    'Adding outbound rules for return traffic. NSGs are stateful, so replies to allowed connections are permitted automatically.',
    'Naming the Bastion subnet anything other than AzureBastionSubnet, or making it smaller than /26.',
    'Expecting az network bastion ssh or rdp to work on Basic. Native client support requires Standard or Premium.',
    'Putting NICs from different VNets into the same ASG. All members of an ASG must be in the same VNet.',
  ],
  examTips: [
    'Memorise the default rules and their priorities: 65000 AllowVnet, 65001 AllowAzureLoadBalancer (inbound) or AllowInternet (outbound), 65500 DenyAll.',
    'For inbound, subnet NSG is evaluated first then NIC NSG; for outbound, NIC first then subnet. A deny anywhere wins.',
    'When a question shows a rule table, sort by priority and find the first match for the given source, port and protocol. Ignore every rule after it.',
    'If a question asks how to see the combined rules applied to a VM, the answer is effective security rules. If it asks whether a specific flow is allowed and by which rule, the answer is IP flow verify.',
    'Bastion requires a subnet named AzureBastionSubnet of /26 or larger, and target VMs need no public IP. Native client, IP-based connection and host scaling mean Standard or above.',
    'Use ASGs when a question says rules should keep working as VMs are added or their IPs change.',
  ],
  summary: [
    'NSG rules have priorities 100 to 4096; the lowest number that matches wins and processing stops.',
    'Default rules at 65000, 65001 and 65500 cannot be deleted, only overridden.',
    'Subnet and NIC NSGs are both evaluated and both must allow the traffic.',
    'Service tags and ASGs replace hard-coded IP ranges in rules.',
    'Effective security rules show the merged view; IP flow verify tests one flow.',
    'Azure Bastion in AzureBastionSubnet (/26+) removes the need for public IPs on VMs; Standard or Premium unlocks native client.',
  ],
  practice: [
    {
      id: 'az1-nsg-bastion-p1',
      level: 'beginner',
      prompt:
        'An NSG has an inbound rule Allow TCP 3389 from Internet at priority 300 and Deny TCP 3389 from Internet at priority 200. Is RDP from the internet allowed?',
      answer:
        'No. Priority 200 is evaluated before 300, it matches, and processing stops, so the traffic is denied.',
      explanation:
        'Lower numbers are processed first. The allow rule at 300 is never reached for this traffic.',
    },
    {
      id: 'az1-nsg-bastion-p2',
      level: 'intermediate',
      prompt:
        'A subnet NSG allows inbound TCP 443 from Internet. The VM NIC has its own NSG with only default rules. Can clients reach the VM on 443?',
      answer:
        'No. The NIC NSG default DenyAllInBound (65500) drops the traffic because only VirtualNetwork and AzureLoadBalancer sources are allowed by default.',
      explanation:
        'Both NSGs must allow inbound traffic. Add an allow rule on the NIC NSG or remove the NIC association.',
    },
    {
      id: 'az1-nsg-bastion-p3',
      level: 'intermediate',
      prompt:
        'You need RDP to 40 VMs without any VM having a public IP, and admins want to use mstsc from their laptops. Which service and SKU do you deploy?',
      answer:
        'Azure Bastion with the Standard (or Premium) SKU, in AzureBastionSubnet of /26 or larger, with native client support enabled.',
      explanation:
        'Basic supports only browser-based sessions. Native client support via az network bastion rdp requires Standard or Premium.',
    },
    {
      id: 'az1-nsg-bastion-p4',
      level: 'advanced',
      prompt:
        'Web VMs are added and removed by autoscale and their IPs change. How do you write an NSG rule that allows only web VMs to reach SQL VMs on 1433?',
      answer:
        'Create ASGs asg-web and asg-sql, add each NIC to the right ASG, and write a rule with source asg-web, destination asg-sql, port 1433.',
      explanation:
        'ASGs make rules follow group membership instead of IP addresses. All member NICs must be in the same VNet as each other.',
    },
  ],
  lab: {
    title: 'Lock down a VM with NSGs and reach it through Bastion',
    scenario:
      'Build a small VNet with a web subnet and a Bastion subnet, deploy a Linux VM with no public IP, control traffic with an NSG and an ASG, and connect over SSH through Azure Bastion.',
    prerequisites: [
      'An Azure subscription where you can create resources (Bastion is billed per hour, so clean up promptly)',
      'Azure CLI 2.60 or later, or Cloud Shell',
    ],
    tasks: [
      {
        instruction:
          'Create resource group rg-nsg-lab and a VNet vnet-lab (10.10.0.0/16) with subnet snet-web (10.10.1.0/24) and AzureBastionSubnet (10.10.255.0/26).',
      },
      {
        instruction:
          'Create NSG nsg-web and ASG asg-web. Add an inbound rule allowing TCP 80 from Internet to asg-web at priority 200, then associate nsg-web with snet-web.',
        hint: 'Use --destination-asgs on az network nsg rule create.',
      },
      {
        instruction:
          'Create an Ubuntu VM vm-web in snet-web with no public IP and no NIC-level NSG, then add its NIC to asg-web.',
        hint: 'Pass --public-ip-address "" and --nsg "" to az vm create.',
      },
      {
        instruction:
          'Deploy a Standard SKU public IP and a Standard Bastion host with tunneling enabled.',
      },
      {
        instruction:
          'List the effective security rules for the VM NIC and find the rule that allows SSH from Bastion.',
        hint: 'Look for AllowVnetInBound: Bastion is inside the same VNet.',
      },
      {
        instruction:
          'Add a Deny TCP 22 from VirtualNetwork rule at priority 150 and confirm with IP flow verify that SSH from 10.10.255.4 is now denied. Then delete the rule.',
      },
    ],
    solution: [
      {
        title: 'Network, NSG and ASG',
        language: 'bash',
        code: `RG=rg-nsg-lab
LOC=westeurope

az group create -n $RG -l $LOC
az network vnet create -g $RG -n vnet-lab --address-prefixes 10.10.0.0/16 \\
  --subnet-name snet-web --subnet-prefixes 10.10.1.0/24
az network vnet subnet create -g $RG --vnet-name vnet-lab \\
  -n AzureBastionSubnet --address-prefixes 10.10.255.0/26

az network nsg create -g $RG -n nsg-web
az network asg create -g $RG -n asg-web
az network nsg rule create -g $RG --nsg-name nsg-web -n Allow-HTTP \\
  --priority 200 --direction Inbound --access Allow --protocol Tcp \\
  --source-address-prefixes Internet --destination-asgs asg-web \\
  --destination-port-ranges 80
az network vnet subnet update -g $RG --vnet-name vnet-lab -n snet-web \\
  --network-security-group nsg-web`,
      },
      {
        title: 'VM, ASG membership and Bastion',
        language: 'bash',
        code: `az vm create -g $RG -n vm-web --image Ubuntu2204 --size Standard_B1s \\
  --vnet-name vnet-lab --subnet snet-web \\
  --public-ip-address "" --nsg "" \\
  --admin-username azureuser --generate-ssh-keys

NIC_ID=$(az vm show -g $RG -n vm-web --query "networkProfile.networkInterfaces[0].id" -o tsv)
NIC=$(basename $NIC_ID)          # vm-webVMNic by default
IPCFG=$(az network nic show -g $RG -n $NIC --query "ipConfigurations[0].name" -o tsv)
az network nic ip-config update -g $RG --nic-name $NIC -n $IPCFG \\
  --application-security-groups asg-web

az network public-ip create -g $RG -n pip-bastion --sku Standard
az network bastion create -g $RG -n bas-lab --vnet-name vnet-lab \\
  --public-ip-address pip-bastion --location $LOC \\
  --sku Standard --enable-tunneling true`,
      },
      {
        title: 'Inspect, deny and test',
        language: 'bash',
        code: `az network nic list-effective-nsg -g $RG -n vm-webVMNic -o json

az network nsg rule create -g $RG --nsg-name nsg-web -n Deny-SSH-Vnet \\
  --priority 150 --direction Inbound --access Deny --protocol Tcp \\
  --source-address-prefixes VirtualNetwork --destination-port-ranges 22

az network watcher test-ip-flow -g $RG --vm vm-web --direction Inbound \\
  --protocol TCP --local 10.10.1.4:22 --remote 10.10.255.4:50000

az network nsg rule delete -g $RG --nsg-name nsg-web -n Deny-SSH-Vnet`,
      },
    ],
    verification: [
      {
        command:
          'az network bastion ssh -g rg-nsg-lab -n bas-lab --target-resource-id $(az vm show -g rg-nsg-lab -n vm-web --query id -o tsv) --auth-type ssh-key --username azureuser --ssh-key ~/.ssh/id_rsa',
        what: 'Opens an SSH session to the private VM through Bastion using the native client.',
        expected: 'A shell prompt azureuser@vm-web.',
      },
      {
        command:
          'az network watcher test-ip-flow -g rg-nsg-lab --vm vm-web --direction Inbound --protocol TCP --local 10.10.1.4:22 --remote 10.10.255.4:50000',
        what: 'With the deny rule in place this reports Deny and names Deny-SSH-Vnet.',
        expected: '"access": "Deny", "ruleName": "securityRules/Deny-SSH-Vnet"',
      },
    ],
    cleanup: [
      {
        command: 'az group delete -n rg-nsg-lab --yes --no-wait',
        what: 'Deletes the Bastion host, VM, NSG, ASG and VNet so billing stops.',
      },
    ],
  },
  relatedTopicIds: [
    'az1-vnets-peering',
    'az1-routing-public-ip',
    'az1-private-endpoints',
    'az1-network-watcher',
  ],
  docs: [
    {
      title: 'Network security groups overview',
      url: 'https://learn.microsoft.com/azure/virtual-network/network-security-groups-overview',
    },
    {
      title: 'How network security groups filter network traffic',
      url: 'https://learn.microsoft.com/azure/virtual-network/network-security-group-how-it-works',
    },
    {
      title: 'Application security groups',
      url: 'https://learn.microsoft.com/azure/virtual-network/application-security-groups',
    },
    {
      title: 'Virtual network service tags',
      url: 'https://learn.microsoft.com/azure/virtual-network/service-tags-overview',
    },
    {
      title: 'What is Azure Bastion?',
      url: 'https://learn.microsoft.com/azure/bastion/bastion-overview',
    },
    {
      title: 'Choose the right Azure Bastion SKU',
      url: 'https://learn.microsoft.com/azure/bastion/bastion-sku-comparison',
    },
  ],
}
