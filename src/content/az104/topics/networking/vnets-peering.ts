import type { Topic } from '../../../types'

export const vnetsPeering: Topic = {
  id: 'az1-vnets-peering',
  title: 'Virtual networks, subnets and VNet peering',
  domainId: 'az1-networking',
  difficulty: 'beginner',
  estimatedMinutes: 30,
  order: 1,
  tags: ['vnet', 'subnet', 'address space', 'cidr', 'peering', 'global peering', 'gateway transit'],
  oneLiner:
    'A VNet is your private address space in one region, subnets carve it up, and peering joins two VNets over the Microsoft backbone without being transitive.',
  explanation: [
    'A **virtual network (VNet)** is a private, isolated network that you own inside Azure. It lives in exactly one region and one subscription, and it has one or more **address spaces** written in CIDR notation, such as `10.10.0.0/16`. Anything you place in the VNet (VM network interfaces, private endpoints, internal load balancers) gets a private IP address from that space.',
    'A VNet is divided into **subnets**. Each subnet takes a slice of the address space, for example `10.10.1.0/24`, and is the unit you attach network security groups, route tables and NAT gateways to. Azure keeps **five addresses in every subnet** for itself: the network address, the first three host addresses (default gateway and two for Azure DNS mapping) and the last address. A `/24` therefore gives you 251 usable addresses, not 254, and the smallest IPv4 subnet you can create is a `/29` with 3 usable addresses.',
    'Two VNets cannot talk to each other by default, even in the same subscription. **VNet peering** connects them so resources communicate using private IPs over the Microsoft backbone, with no gateway, no public internet and no encryption appliance in the path. Peering between VNets in the same region is **regional peering**; peering between regions is **global peering**. Both work across subscriptions and even across Microsoft Entra tenants.',
    'Peering has three rules that the exam tests constantly. It is **non-transitive**: if Hub peers with Spoke1 and Hub peers with Spoke2, Spoke1 still cannot reach Spoke2. It must be created **in both directions**: each VNet holds its own peering link, and traffic flows only when both links show `Connected`. And the **address spaces must not overlap**: Azure refuses to peer two VNets that both use `10.0.0.0/16`.',
  ],
  whyItMatters: [
    'VNets are the foundation of every other AZ-104 networking topic. NSGs, route tables, private endpoints, Bastion, load balancers and VPN gateways all attach to a VNet or subnet, so a wrong address plan early on causes pain in every later lesson and every later project.',
    'Hub-and-spoke is the most common enterprise Azure topology, and it is built from peering. Understanding gateway transit, forwarded traffic and non-transitivity is what lets you explain why a spoke can reach on-premises through the hub gateway but cannot reach another spoke unless something routes it.',
    'Address overlap is the classic mistake that cannot be fixed cheaply. Once workloads are deployed you cannot peer, connect a VPN or merge after an acquisition without renumbering. Planning non-overlapping ranges up front is a skill employers expect from an administrator.',
  ],
  howItWorks: [
    'You create a VNet with at least one address space (you can add more later) and one or more subnets. Subnet ranges must sit inside an address space and must not overlap each other. You can resize a subnet only if nothing is using the addresses that would disappear.',
    'Inside a VNet, Azure adds a **system route** for each address space with next hop `VirtualNetwork`, so every subnet can reach every other subnet with no configuration. Isolation between subnets comes from NSGs, not from routing.',
    'When you create a peering, you create a `virtualNetworkPeerings` child resource on the local VNet pointing at the remote VNet. Its state is `Initiated` until the matching link exists on the remote VNet, then both become `Connected`. Delete either side and the other shows `Disconnected`; it must be deleted and recreated.',
    'Once both sides are connected, Azure injects a route for the remote address space with next hop type `VNetPeering` into every NIC in both VNets. Traffic between peered VMs is as fast as traffic within one VNet, and you pay a small per-GB charge for data crossing the peering (higher for global peering).',
    'Each peering link has settings. **Allow virtual network access** (on by default) lets the VNets talk at all. **Allow forwarded traffic** accepts packets that did not originate in the remote VNet, for example traffic an NVA in the hub forwards on behalf of another spoke. **Allow gateway transit** on the hub side plus **Use remote gateways** on the spoke side lets the spoke use the hub VPN or ExpressRoute gateway instead of deploying its own.',
    'Peering is non-transitive because routes learned through a peering are never re-advertised to another peering. To make spokes talk you either peer them directly (a mesh), route through an NVA or Azure Firewall in the hub with UDRs and allow forwarded traffic, or use Azure Virtual Network Manager or Virtual WAN, which build the connectivity for you.',
    'If you add or change an address space on a VNet that is already peered, the peering must be **synced** so the remote side learns the new prefix. The portal flags this, and `az network vnet peering sync` resolves it without deleting the peering.',
  ],
  diagrams: [
    {
      kind: 'nested',
      title: 'What lives inside a virtual network',
      caption:
        'The VNet belongs to one region and subscription; subnets slice its address space and each subnet loses five addresses to Azure.',
      root: {
        label: 'Subscription',
        detail: 'Billing and RBAC boundary',
        children: [
          {
            label: 'VNet hub-vnet in West Europe',
            detail: 'Address space 10.10.0.0/16',
            tone: 'accent',
            children: [
              {
                label: 'Subnet snet-app 10.10.1.0/24',
                detail: '251 usable, 5 reserved by Azure',
                children: [{ label: 'VM NIC 10.10.1.4', detail: 'First address you can use' }],
              },
              {
                label: 'GatewaySubnet 10.10.255.0/27',
                detail: 'Exact name required for VPN gateways',
                tone: 'muted',
              },
            ],
          },
        ],
      },
    },
    {
      kind: 'decision',
      title: 'Can these two VNets reach each other?',
      caption:
        'Peering is direct, bidirectional and non-transitive. Anything more needs a routing hop in the middle or a managed service.',
      question: 'How are the two VNets connected?',
      branches: [
        {
          condition: 'Peered, both links show Connected',
          result: 'Yes, private IP traffic flows',
          detail: 'Same speed as traffic inside one VNet',
          tone: 'success',
        },
        {
          condition: 'Peering created on one side only',
          result: 'No, state stays Initiated',
          detail: 'Create the reverse link on the other VNet',
          tone: 'warning',
        },
        {
          condition: 'Both peered to the same hub only',
          result: 'No, peering is non-transitive',
          detail: 'Peer directly or route via a hub NVA or firewall',
          tone: 'danger',
        },
        {
          condition: 'Address spaces overlap',
          result: 'Peering cannot be created',
          detail: 'Renumber one VNet first',
          tone: 'danger',
        },
      ],
    },
  ],
  keyObjects: [
    {
      kind: 'Virtual network (Microsoft.Network/virtualNetworks)',
      apiVersion: '2024-05-01',
      purpose:
        'A private network in one region and subscription. Holds address spaces, subnets, DNS settings and peering links.',
      fields: [
        {
          path: 'location',
          meaning: 'The single region the VNet lives in. A VNet cannot span regions.',
          required: true,
        },
        {
          path: 'properties.addressSpace.addressPrefixes',
          meaning:
            'One or more CIDR ranges, typically from RFC 1918. Must not overlap any network you intend to peer or connect.',
          required: true,
        },
        {
          path: 'properties.subnets[].properties.addressPrefix',
          meaning:
            'The slice of the address space for one subnet. Azure reserves 5 addresses in each.',
        },
        {
          path: 'properties.dhcpOptions.dnsServers',
          meaning: 'Custom DNS servers. Empty means Azure-provided DNS (168.63.129.16).',
        },
      ],
    },
    {
      kind: 'Subnet (Microsoft.Network/virtualNetworks/subnets)',
      apiVersion: '2024-05-01',
      purpose:
        'A range inside the VNet. The attachment point for NSGs, route tables, NAT gateways, service endpoints and delegations.',
      fields: [
        {
          path: 'properties.addressPrefix',
          meaning: 'The CIDR range, at least a /29.',
          required: true,
        },
        {
          path: 'properties.networkSecurityGroup.id',
          meaning: 'Optional NSG filtering traffic for everything in the subnet.',
        },
        {
          path: 'properties.routeTable.id',
          meaning: 'Optional route table (UDRs). One per subnet at most.',
        },
        {
          path: 'name',
          meaning:
            'Some services need exact names: GatewaySubnet, AzureBastionSubnet, AzureFirewallSubnet.',
        },
      ],
    },
    {
      kind: 'VNet peering (Microsoft.Network/virtualNetworks/virtualNetworkPeerings)',
      apiVersion: '2024-05-01',
      purpose: 'One direction of a peering. You need one on each VNet for traffic to flow.',
      fields: [
        {
          path: 'properties.remoteVirtualNetwork.id',
          meaning:
            'Resource ID of the VNet on the other side. May be in another subscription or tenant.',
          required: true,
        },
        {
          path: 'properties.allowVirtualNetworkAccess',
          meaning: 'Allows the address spaces to communicate. True by default.',
        },
        {
          path: 'properties.allowForwardedTraffic',
          meaning:
            'Accept traffic that originated outside the remote VNet, for example forwarded by an NVA.',
        },
        {
          path: 'properties.allowGatewayTransit',
          meaning: 'Set on the hub side: let the peer use this VNet gateway.',
        },
        {
          path: 'properties.useRemoteGateways',
          meaning:
            'Set on the spoke side: use the hub gateway. The spoke must not have its own gateway.',
        },
        {
          path: 'properties.peeringState',
          meaning: 'Read-only: Initiated, Connected or Disconnected.',
        },
      ],
    },
  ],
  realWorldExample: {
    title: 'The acquisition that could not be peered',
    story: [
      'A retailer ran its Azure estate as a hub VNet on `10.0.0.0/16` with spokes for each application. It acquired a smaller company whose single VNet had also been created with the portal default of `10.0.0.0/16`. The plan was to peer the new VNet to the hub within a week.',
      'The peering failed immediately with an overlapping address space error. The only real fix was renumbering: new VNet on `10.40.0.0/16`, redeploy or move every VM NIC, update DNS records and firewall rules. It took six weeks instead of one.',
      'Meanwhile the team hit a second surprise. Two existing spokes, both peered to the hub, needed to share a database. They could not reach each other because peering is non-transitive. They added a UDR in each spoke sending the other spoke range to the hub Azure Firewall and enabled allow forwarded traffic on the peerings.',
      'Afterwards they published an IP address management plan: every VNet gets a range from a central register, never the portal default, and spoke-to-spoke traffic always goes through the hub firewall so it is inspected and logged.',
    ],
  },
  yamlExamples: [
    {
      title: 'Hub and spoke with peering in both directions (Bicep)',
      language: 'bicep',
      explanation:
        'Two VNets with non-overlapping ranges and a peering resource on each side. Nothing flows until both peering resources exist.',
      code: `param location string = resourceGroup().location

resource hub 'Microsoft.Network/virtualNetworks@2024-05-01' = {
  name: 'vnet-hub'
  location: location
  properties: {
    addressSpace: { addressPrefixes: [ '10.10.0.0/16' ] }
    subnets: [
      { name: 'snet-shared', properties: { addressPrefix: '10.10.1.0/24' } }
    ]
  }
}

resource spoke 'Microsoft.Network/virtualNetworks@2024-05-01' = {
  name: 'vnet-spoke1'
  location: location
  properties: {
    addressSpace: { addressPrefixes: [ '10.20.0.0/16' ] }
    subnets: [
      { name: 'snet-app', properties: { addressPrefix: '10.20.1.0/24' } }
    ]
  }
}

resource hubToSpoke 'Microsoft.Network/virtualNetworks/virtualNetworkPeerings@2024-05-01' = {
  parent: hub
  name: 'hub-to-spoke1'
  properties: {
    remoteVirtualNetwork: { id: spoke.id }
    allowVirtualNetworkAccess: true
    allowForwardedTraffic: true
    allowGatewayTransit: false
    useRemoteGateways: false
  }
}

resource spokeToHub 'Microsoft.Network/virtualNetworks/virtualNetworkPeerings@2024-05-01' = {
  parent: spoke
  name: 'spoke1-to-hub'
  properties: {
    remoteVirtualNetwork: { id: hub.id }
    allowVirtualNetworkAccess: true
    allowForwardedTraffic: true
    allowGatewayTransit: false
    useRemoteGateways: false
  }
}`,
    },
    {
      title: 'Subnet sizing cheat sheet',
      language: 'text',
      explanation:
        'Usable addresses are always the raw count minus 5, because Azure reserves the network address, .1, .2, .3 and the last address.',
      code: `Prefix  Total  Usable  Typical use
/29        8      3     smallest allowed subnet
/27       32     27     GatewaySubnet (recommended minimum)
/26       64     59     AzureBastionSubnet, AzureFirewallSubnet
/24      256    251     general workload subnet
/16    65536  65531     whole VNet address space

Reserved in 10.20.1.0/24:
10.20.1.0    network address
10.20.1.1    default gateway
10.20.1.2    Azure DNS mapping
10.20.1.3    Azure DNS mapping
10.20.1.255  broadcast (last address)`,
    },
  ],
  imperative: [
    {
      command:
        'az network vnet create -g rg-net -n vnet-hub --address-prefixes 10.10.0.0/16 --subnet-name snet-shared --subnet-prefixes 10.10.1.0/24',
      what: 'Creates a VNet with one address space and its first subnet.',
      expected: 'JSON for the new VNet with "provisioningState": "Succeeded".',
    },
    {
      command:
        'az network vnet subnet create -g rg-net --vnet-name vnet-hub -n GatewaySubnet --address-prefixes 10.10.255.0/27',
      what: 'Adds a second subnet. GatewaySubnet must use exactly that name for VPN or ExpressRoute gateways.',
    },
    {
      command:
        'az network vnet peering create -g rg-net -n hub-to-spoke1 --vnet-name vnet-hub --remote-vnet vnet-spoke1 --allow-vnet-access --allow-forwarded-traffic',
      what: 'Creates the hub side of the peering. On its own this shows peeringState Initiated.',
      expected: '"peeringState": "Initiated"',
      namespaceNote:
        'For a VNet in another resource group or subscription, pass the full resource ID to --remote-vnet.',
    },
    {
      command:
        'az network vnet peering create -g rg-net -n spoke1-to-hub --vnet-name vnet-spoke1 --remote-vnet vnet-hub --allow-vnet-access --allow-forwarded-traffic',
      what: 'Creates the reverse link. Both sides now become Connected.',
      expected: '"peeringState": "Connected"',
    },
    {
      command:
        'az network vnet peering update -g rg-net -n spoke1-to-hub --vnet-name vnet-spoke1 --set useRemoteGateways=true',
      what: 'Makes the spoke use the hub gateway. The hub side must already have allowGatewayTransit=true and a deployed gateway.',
    },
    {
      command: 'az network vnet peering sync -g rg-net -n hub-to-spoke1 --vnet-name vnet-hub',
      what: 'Resyncs a peering after an address space was added to the remote VNet.',
    },
  ],
  declarative: {
    steps: [
      'Pick non-overlapping ranges for every VNet from a central IP plan, leaving room to grow.',
      'Declare each VNet with its address space and subnets in Bicep.',
      'Declare one `virtualNetworkPeerings` child resource on each VNet, pointing at the other.',
      'Set `allowGatewayTransit` on the hub side and `useRemoteGateways` on the spoke side only if the hub has a gateway.',
      'Deploy with `az deployment group create`, run `what-if` first, and confirm both peerings report Connected.',
    ],
    code: [
      {
        title: 'Reusable spoke module peered to an existing hub',
        language: 'bicep',
        explanation:
          'The spoke module creates its own VNet and both peering links. The hub-side link is declared with an existing reference, so one deployment connects both directions.',
        placeholders: ['<spoke-name>', '<spoke-prefix>'],
        code: `param location string = resourceGroup().location
param spokeName string = '<spoke-name>'
param spokePrefix string = '<spoke-prefix>'
param hubVnetName string = 'vnet-hub'
param hubHasGateway bool = false

resource hub 'Microsoft.Network/virtualNetworks@2024-05-01' existing = {
  name: hubVnetName
}

resource spoke 'Microsoft.Network/virtualNetworks@2024-05-01' = {
  name: 'vnet-\${spokeName}'
  location: location
  properties: {
    addressSpace: { addressPrefixes: [ spokePrefix ] }
    subnets: [
      {
        name: 'snet-app'
        properties: { addressPrefix: cidrSubnet(spokePrefix, 24, 0) }
      }
    ]
  }
}

resource spokeToHub 'Microsoft.Network/virtualNetworks/virtualNetworkPeerings@2024-05-01' = {
  parent: spoke
  name: '\${spokeName}-to-hub'
  properties: {
    remoteVirtualNetwork: { id: hub.id }
    allowVirtualNetworkAccess: true
    allowForwardedTraffic: true
    useRemoteGateways: hubHasGateway
  }
}

resource hubToSpoke 'Microsoft.Network/virtualNetworks/virtualNetworkPeerings@2024-05-01' = {
  parent: hub
  name: 'hub-to-\${spokeName}'
  properties: {
    remoteVirtualNetwork: { id: spoke.id }
    allowVirtualNetworkAccess: true
    allowForwardedTraffic: true
    allowGatewayTransit: hubHasGateway
  }
}`,
      },
    ],
  },
  verification: [
    {
      command: 'az network vnet peering list -g rg-net --vnet-name vnet-hub -o table',
      what: 'Lists every peering on the hub with its state and settings.',
      expected: 'Each row shows PeeringState Connected and PeeringSyncLevel FullyInSync.',
    },
    {
      command:
        'az network vnet show -g rg-net -n vnet-spoke1 --query "{space:addressSpace.addressPrefixes, subnets:subnets[].{name:name, prefix:addressPrefix}}"',
      what: 'Shows the address space and subnet ranges so you can check for overlap.',
    },
    {
      command: 'az network nic show-effective-route-table -g rg-net -n <nic-name> -o table',
      what: 'Shows the routes a running VM actually uses, including the VNetPeering routes for peered ranges.',
      expected: 'A row with Next Hop Type VNetPeering for the remote address space.',
      placeholders: ['<nic-name>'],
      namespaceNote: 'Works only when the NIC is attached to a running VM.',
    },
  ],
  troubleshooting: [
    {
      command:
        'az network vnet peering show -g rg-net -n hub-to-spoke1 --vnet-name vnet-hub --query peeringState',
      what: 'Initiated means the reverse link is missing; Disconnected means the other side was deleted and this link must be recreated.',
      expected: '"Connected"',
    },
    {
      command:
        'az network vnet peering show -g rg-net -n hub-to-spoke1 --vnet-name vnet-hub --query peeringSyncLevel',
      what: 'LocalNotInSync or RemoteNotInSync after an address space change means you need to run a peering sync.',
      expected: '"FullyInSync"',
    },
    {
      command:
        'az network watcher test-ip-flow --vm <vm-name> -g rg-net --direction Outbound --protocol TCP --local 10.20.1.4:50000 --remote 10.30.1.4:443',
      what: 'When peering is Connected but traffic still fails, checks whether an NSG rule is the real blocker.',
      placeholders: ['<vm-name>'],
    },
  ],
  commonMistakes: [
    'Creating the peering on one VNet only and expecting traffic to flow. Each side needs its own link, and state stays Initiated until both exist.',
    'Assuming peering is transitive. Spoke1 and Spoke2 both peered to a hub still cannot reach each other without a direct peering or a routing hop in the hub.',
    'Accepting the portal default range 10.0.0.0/16 for every VNet, then discovering later that none of them can be peered with each other.',
    'Forgetting the 5 reserved addresses when sizing subnets. A /29 has only 3 usable addresses, and a /24 has 251.',
    'Enabling Use remote gateways on a spoke that already has its own VPN gateway, or before the hub has a gateway with allow gateway transit set. The setting is rejected.',
    'Using a name like gateway-subnet instead of exactly GatewaySubnet, so the VPN gateway deployment fails.',
    'Thinking peering opens everything. NSGs still apply on both sides, so a Connected peering can still carry no traffic on a blocked port.',
  ],
  examTips: [
    'Memorise the reserved addresses: the first four and the last one in every subnet. For a /24, usable hosts = 251. For a /29 (the smallest), usable = 3.',
    'If a question has spokes that cannot talk while both are peered to a hub, the answer involves non-transitivity: add a direct peering, or a hub NVA or Azure Firewall with UDRs and allow forwarded traffic.',
    'Gateway transit is a pair of settings: allow gateway transit on the VNet that owns the gateway, use remote gateways on the VNet that borrows it. Expect questions that swap which side gets which.',
    'Peering works across regions (global peering), subscriptions and tenants. It does not work between VNets whose address spaces overlap, and you cannot fix that with a setting.',
    'A VNet belongs to exactly one region. A question asking to stretch one VNet across two regions wants two VNets and global peering.',
    'You can add an address space to a peered VNet without deleting the peering, then sync the peering.',
  ],
  summary: [
    'A VNet is a private network in one region and subscription with one or more non-overlapping CIDR address spaces.',
    'Subnets carve up the address space; Azure reserves 5 addresses in each, and the smallest is /29.',
    'Peering connects two VNets over the Microsoft backbone, regionally or globally, and must be created on both sides.',
    'Peering is non-transitive and needs non-overlapping address spaces.',
    'Allow gateway transit (hub) plus use remote gateways (spoke) lets spokes share a hub VPN or ExpressRoute gateway.',
  ],
  practice: [
    {
      id: 'az1-vnets-peering-p1',
      level: 'beginner',
      prompt:
        'How many IP addresses can you assign to VMs in a subnet with the prefix 10.1.2.0/26?',
      answer: '59. A /26 has 64 addresses and Azure reserves 5 of them.',
      explanation:
        'The reserved addresses are 10.1.2.0 (network), 10.1.2.1 (default gateway), 10.1.2.2 and 10.1.2.3 (Azure DNS mapping) and 10.1.2.63 (broadcast).',
    },
    {
      id: 'az1-vnets-peering-p2',
      level: 'beginner',
      prompt:
        'You created a peering from VNet-A to VNet-B. The portal shows the peering as Initiated and VMs cannot ping each other. What is missing?',
      answer:
        'The reverse peering from VNet-B to VNet-A. Once it exists, both links change to Connected.',
      explanation:
        'Each VNet owns its own peering link. The portal can create both in one step, but the CLI, Bicep and ARM create one direction per resource.',
    },
    {
      id: 'az1-vnets-peering-p3',
      level: 'intermediate',
      prompt:
        'Spoke1 (10.1.0.0/16) and Spoke2 (10.2.0.0/16) are both peered to Hub (10.0.0.0/16). A VM in Spoke1 cannot reach a VM in Spoke2. Give two ways to fix it.',
      answer:
        'Either peer Spoke1 and Spoke2 directly in both directions, or route spoke-to-spoke traffic through an NVA or Azure Firewall in the hub using UDRs, with allow forwarded traffic enabled on the peerings.',
      explanation:
        'Peering is non-transitive, so the hub does not pass traffic between spokes on its own. Azure Virtual Network Manager can also create the mesh or hub connectivity for you.',
    },
    {
      id: 'az1-vnets-peering-p4',
      level: 'intermediate',
      prompt:
        'A spoke VNet must reach on-premises through the VPN gateway in the hub. Which peering setting do you enable on each side?',
      answer:
        'Allow gateway transit on the hub-to-spoke peering, and use remote gateways on the spoke-to-hub peering.',
      explanation:
        'The spoke must not have its own gateway. The VPN gateway also needs to advertise the spoke range to on-premises, which happens automatically with BGP or needs the local network configured for static routing.',
    },
    {
      id: 'az1-vnets-peering-p5',
      level: 'advanced',
      prompt:
        'You add a second address space 10.21.0.0/16 to a spoke that is already peered to the hub. VMs in the hub cannot reach the new range. What do you do?',
      answer:
        'Sync the peering (az network vnet peering sync, or the Sync button in the portal) so the hub learns the new prefix. There is no need to delete and recreate it.',
      explanation:
        'The peering sync level shows RemoteNotInSync or LocalNotInSync until you sync. The new range must not overlap anything the hub already knows.',
    },
  ],
  lab: {
    title: 'Build a hub and two spokes and prove peering is non-transitive',
    scenario:
      'You are building the first hub-and-spoke layout for a team. Create three VNets, peer each spoke to the hub, confirm the peering states, then see for yourself why the spokes cannot reach each other and why an overlapping VNet cannot be peered at all.',
    prerequisites: [
      'An Azure subscription (a free account works) with Contributor on a resource group',
      'Azure Cloud Shell (Bash) or Azure CLI 2.60 or newer, signed in with az login',
    ],
    tasks: [
      {
        instruction:
          'Create a resource group rg-az104-peering and three VNets: vnet-hub 10.10.0.0/16, vnet-spoke1 10.20.0.0/16 and vnet-spoke2 10.30.0.0/16, each with one /24 subnet.',
      },
      {
        instruction:
          'Peer vnet-hub with vnet-spoke1. Create only the hub side first and check the peering state.',
        hint: 'It should say Initiated.',
      },
      {
        instruction:
          'Create the reverse link from vnet-spoke1 and confirm both sides are Connected.',
      },
      {
        instruction: 'Peer vnet-hub with vnet-spoke2 in both directions.',
      },
      {
        instruction:
          'List the peerings on vnet-spoke1. Explain in one sentence why there is no path to vnet-spoke2.',
        hint: 'Look for any peering whose remote VNet is spoke2.',
      },
      {
        instruction:
          'Create vnet-overlap with 10.10.0.0/16 and try to peer it with vnet-hub. Read the error.',
        hint: 'Both VNets now claim 10.10.0.0/16, so Azure cannot tell which side an address belongs to.',
      },
      {
        instruction:
          'Add a second address space 10.21.0.0/16 to vnet-spoke1, check the peering sync level on the hub, then sync it.',
      },
    ],
    solution: [
      {
        title: 'Create the VNets and peerings',
        language: 'bash',
        code: `RG=rg-az104-peering
LOC=westeurope
az group create -n $RG -l $LOC

az network vnet create -g $RG -n vnet-hub    --address-prefixes 10.10.0.0/16 --subnet-name snet-shared --subnet-prefixes 10.10.1.0/24
az network vnet create -g $RG -n vnet-spoke1 --address-prefixes 10.20.0.0/16 --subnet-name snet-app    --subnet-prefixes 10.20.1.0/24
az network vnet create -g $RG -n vnet-spoke2 --address-prefixes 10.30.0.0/16 --subnet-name snet-app    --subnet-prefixes 10.30.1.0/24

# Hub side only - state is Initiated
az network vnet peering create -g $RG -n hub-to-spoke1 --vnet-name vnet-hub --remote-vnet vnet-spoke1 --allow-vnet-access
az network vnet peering show -g $RG -n hub-to-spoke1 --vnet-name vnet-hub --query peeringState -o tsv

# Reverse link - both become Connected
az network vnet peering create -g $RG -n spoke1-to-hub --vnet-name vnet-spoke1 --remote-vnet vnet-hub --allow-vnet-access

# Spoke2 in both directions
az network vnet peering create -g $RG -n hub-to-spoke2 --vnet-name vnet-hub    --remote-vnet vnet-spoke2 --allow-vnet-access
az network vnet peering create -g $RG -n spoke2-to-hub --vnet-name vnet-spoke2 --remote-vnet vnet-hub    --allow-vnet-access

# Spoke1 knows only the hub: no route to 10.30.0.0/16
az network vnet peering list -g $RG --vnet-name vnet-spoke1 -o table`,
      },
      {
        title: 'Overlap and sync',
        language: 'bash',
        code: `# Overlapping range - this peering is rejected
az network vnet create -g $RG -n vnet-overlap --address-prefixes 10.10.0.0/16
az network vnet peering create -g $RG -n hub-to-overlap --vnet-name vnet-hub --remote-vnet vnet-overlap --allow-vnet-access
# Error says the address spaces of the two VNets overlap

# Grow spoke1, then resync the hub side
az network vnet update -g $RG -n vnet-spoke1 --address-prefixes 10.20.0.0/16 10.21.0.0/16
az network vnet peering show -g $RG -n hub-to-spoke1 --vnet-name vnet-hub --query peeringSyncLevel -o tsv
az network vnet peering sync -g $RG -n hub-to-spoke1 --vnet-name vnet-hub
az network vnet peering sync -g $RG -n spoke1-to-hub --vnet-name vnet-spoke1`,
      },
    ],
    verification: [
      {
        command: 'az network vnet peering list -g rg-az104-peering --vnet-name vnet-hub -o table',
        what: 'Confirms the hub has two peerings, both Connected and in sync.',
        expected: 'hub-to-spoke1 and hub-to-spoke2 with PeeringState Connected.',
      },
      {
        command:
          'az network vnet peering list -g rg-az104-peering --vnet-name vnet-spoke1 --query "[].remoteVirtualNetwork.id" -o tsv',
        what: 'Shows that spoke1 is peered only to the hub, which is why it cannot reach spoke2.',
        expected: 'A single resource ID ending in vnet-hub.',
      },
    ],
    cleanup: [
      {
        command: 'az group delete -n rg-az104-peering --yes --no-wait',
        what: 'Deletes the resource group, all four VNets and every peering.',
      },
    ],
  },
  relatedTopicIds: [
    'az1-routing-public-ip',
    'az1-nsg-bastion',
    'az1-private-endpoints',
    'az1-network-watcher',
  ],
  docs: [
    {
      title: 'What is Azure Virtual Network?',
      url: 'https://learn.microsoft.com/azure/virtual-network/virtual-networks-overview',
    },
    {
      title: 'Add, change or delete a virtual network subnet',
      url: 'https://learn.microsoft.com/azure/virtual-network/virtual-network-manage-subnet',
    },
    {
      title: 'Virtual network peering',
      url: 'https://learn.microsoft.com/azure/virtual-network/virtual-network-peering-overview',
    },
    {
      title: 'Create, change or delete a virtual network peering',
      url: 'https://learn.microsoft.com/azure/virtual-network/virtual-network-manage-peering',
    },
    {
      title: 'Configure VPN gateway transit for virtual network peering',
      url: 'https://learn.microsoft.com/azure/vpn-gateway/vpn-gateway-peering-gateway-transit',
    },
  ],
}
