import type { Topic } from '../../../types'

export const routingPublicIp: Topic = {
  id: 'az1-routing-public-ip',
  title: 'Public IPs, routing, UDRs and NAT gateway',
  domainId: 'az1-networking',
  difficulty: 'intermediate',
  estimatedMinutes: 35,
  order: 2,
  tags: [
    'public ip',
    'standard sku',
    'system routes',
    'udr',
    'route table',
    'next hop',
    'nva',
    'ip forwarding',
    'nat gateway',
  ],
  oneLiner:
    'Azure routes every packet by longest prefix match over system routes and your UDRs, while public IPs and NAT gateway decide how traffic enters and leaves the internet.',
  explanation: [
    'A **public IP address** is a standalone Azure resource that you attach to something that must be reachable from, or appear from, the internet: a VM NIC, a load balancer frontend, a VPN gateway, Azure Bastion, Azure Firewall or a NAT gateway. Today there is effectively one SKU to choose: **Standard**. The **Basic** SKU was retired on 30 September 2025, so new designs and exam answers should assume Standard.',
    'A Standard public IP is always **static** (the address never changes while the resource exists), is **zone-redundant** by default in regions with availability zones, and is **secure by default**: inbound traffic is blocked until an NSG explicitly allows it. That last point surprises people who attach a Standard IP to a VM and cannot connect.',
    'Routing decides where a packet goes next. Every subnet gets **system routes** automatically: traffic to the VNet address space stays in the VNet, `0.0.0.0/0` goes to the Internet, and some private ranges not in your VNet are dropped. You override them with **user-defined routes (UDRs)**, which live in a **route table** that you associate with one or more subnets.',
    'Each route has an address prefix and a **next hop type**: `VirtualAppliance` (a specific private IP, usually a firewall or NVA), `VirtualNetworkGateway` (the VPN gateway), `VnetLocal` (stay inside the VNet), `Internet`, or `None` (drop the packet). When several routes match a destination, Azure picks the one with the **longest prefix**, so a `/24` route beats a `/16` route, which beats `0.0.0.0/0`.',
    'For outbound internet access at scale, a **NAT gateway** attached to a subnet gives every VM in it a shared, predictable set of outbound public IPs without exposing any of them to inbound connections. It is the recommended way to give private subnets internet egress.',
  ],
  whyItMatters: [
    'Forced tunnelling through a firewall, spoke-to-spoke traffic in a hub and spoke, and blocking internet access for a subnet are all implemented with UDRs. Exam scenarios regularly ask you to pick the next hop type or predict which route wins.',
    'The retirement of Basic public IPs changed defaults that older tutorials still show. Knowing that Standard is static, zone-redundant and closed to inbound traffic by default saves hours of troubleshooting and avoids answers based on retired behaviour.',
    'Outbound connectivity is shifting: new VNets increasingly default to private subnets with no implicit outbound internet access, so administrators must choose NAT gateway, a firewall or a load balancer outbound rule deliberately. NAT gateway is the answer Microsoft recommends for most cases.',
  ],
  howItWorks: [
    'When a packet leaves a NIC, Azure looks up the destination in the effective route table for that subnet. The table is the system routes plus any routes learned via BGP from a VPN or ExpressRoute gateway plus your UDRs.',
    'Azure selects the route with the **longest matching prefix**. If two routes have exactly the same prefix, the source decides: a UDR beats a BGP route, and a BGP route beats a system route.',
    'The default system routes are: each VNet address space to `VirtualNetwork` (shown as VnetLocal when you create a UDR), `0.0.0.0/0` to `Internet`, and `10.0.0.0/8`, `172.16.0.0/12`, `192.168.0.0/16` and `100.64.0.0/10` to `None`. Peering adds `VNetPeering` routes, a gateway adds `VirtualNetworkGateway` routes, and service endpoints add routes for the service public prefixes.',
    'A route table is a regional resource associated with zero or more subnets in the same region and subscription. A subnet can have at most one route table. The table setting **propagate gateway routes** (disableBgpRoutePropagation in the API) controls whether routes learned by the VPN or ExpressRoute gateway are added to the subnet.',
    'For a `VirtualAppliance` next hop, Azure delivers the packet to the NVA private IP, but the NVA must be allowed to receive packets addressed to other IPs. Enable **IP forwarding** on the NVA NIC in Azure, and enable forwarding inside the guest operating system too. Without both, the NVA silently drops the traffic.',
    'A NAT gateway is associated with subnets and one or more Standard public IPs or public IP prefixes. Once attached, it takes over outbound connections from that subnet, taking precedence over load balancer outbound rules and instance-level public IPs for outbound flows. Inbound connections to a VM public IP still work; NAT gateway only handles traffic the VM initiates.',
    'Standard public IPs can use **routing preference**: Microsoft network (traffic enters and leaves the Microsoft backbone close to the user) or Internet (cheaper, hands off to ISPs sooner). The tier setting chooses regional or global; global IPs front cross-region load balancers.',
  ],
  diagrams: [
    {
      kind: 'flow',
      title: 'How Azure picks a route for a packet',
      caption:
        'Longest prefix wins first. Only when prefixes tie does the route source matter: UDR, then BGP, then system.',
      nodes: [
        {
          label: 'Packet leaves the VM NIC',
          detail: 'Destination 10.30.1.4',
          tone: 'accent',
        },
        {
          label: 'Collect effective routes',
          detail: 'System routes plus BGP plus UDRs',
          arrowLabel: 'lookup',
        },
        {
          label: 'Keep routes that match',
          detail: '10.30.1.0/24, 10.0.0.0/8 and 0.0.0.0/0',
        },
        {
          label: 'Longest prefix wins',
          detail: '10.30.1.0/24 beats the shorter prefixes',
          arrowLabel: 'most specific',
          branch: {
            label: 'Prefixes tie',
            detail: 'UDR beats BGP beats system route',
            tone: 'warning',
          },
        },
        {
          label: 'Send to the next hop',
          detail: 'VirtualAppliance 10.10.2.4, the hub firewall',
          tone: 'success',
          branch: {
            label: 'Next hop is None',
            detail: 'Packet is dropped',
            tone: 'danger',
          },
        },
      ],
    },
    {
      kind: 'decision',
      title: 'Which next hop type do I need?',
      caption:
        'The next hop type is the whole point of a UDR. Pick it from what should happen to the packet.',
      question: 'Where should traffic for this prefix go?',
      branches: [
        {
          condition: 'Through a firewall or NVA for inspection',
          result: 'VirtualAppliance',
          detail: 'Give the NVA private IP and enable IP forwarding',
          tone: 'accent',
        },
        {
          condition: 'To on-premises via the VPN gateway',
          result: 'VirtualNetworkGateway',
          detail: 'Forced tunnelling of 0.0.0.0/0 uses this',
        },
        {
          condition: 'Stay inside this VNet, bypassing an NVA',
          result: 'VnetLocal',
        },
        {
          condition: 'Straight out to the internet',
          result: 'Internet',
          detail: 'Also used to exempt a service prefix',
        },
        {
          condition: 'Nowhere, block it',
          result: 'None',
          detail: 'Packets are dropped silently',
          tone: 'danger',
        },
      ],
    },
  ],
  keyObjects: [
    {
      kind: 'Public IP address (Microsoft.Network/publicIPAddresses)',
      apiVersion: '2024-05-01',
      purpose:
        'A standalone internet-facing IPv4 or IPv6 address attached to a NIC, load balancer, gateway, Bastion, firewall or NAT gateway.',
      fields: [
        {
          path: 'sku.name',
          meaning: 'Standard. Basic was retired in September 2025.',
          required: true,
        },
        {
          path: 'sku.tier',
          meaning: 'Regional (default) or Global for cross-region load balancer frontends.',
        },
        {
          path: 'properties.publicIPAllocationMethod',
          meaning: 'Always Static for the Standard SKU.',
        },
        {
          path: 'zones',
          meaning:
            'Zone-redundant across 1, 2, 3 by default in zonal regions, or pinned to one zone. Cannot be changed after creation.',
        },
        {
          path: 'properties.ipTags / routing preference',
          meaning: 'Choose Microsoft network or Internet routing for the address. Set at creation.',
        },
      ],
    },
    {
      kind: 'Route table (Microsoft.Network/routeTables)',
      apiVersion: '2024-05-01',
      purpose:
        'A set of user-defined routes associated with subnets. Overrides or adds to the system routes.',
      fields: [
        {
          path: 'properties.routes[].properties.addressPrefix',
          meaning: 'Destination CIDR, or a service tag such as Storage or AzureCloud.',
          required: true,
        },
        {
          path: 'properties.routes[].properties.nextHopType',
          meaning: 'VirtualAppliance, VirtualNetworkGateway, VnetLocal, Internet or None.',
          required: true,
        },
        {
          path: 'properties.routes[].properties.nextHopIpAddress',
          meaning: 'Required only for VirtualAppliance: the NVA or firewall private IP.',
        },
        {
          path: 'properties.disableBgpRoutePropagation',
          meaning: 'True stops gateway-learned routes reaching the associated subnets.',
        },
      ],
    },
    {
      kind: 'NAT gateway (Microsoft.Network/natGateways)',
      apiVersion: '2024-05-01',
      purpose:
        'Managed outbound-only SNAT for whole subnets using Standard public IPs or prefixes.',
      fields: [
        { path: 'sku.name', meaning: 'Standard.', required: true },
        {
          path: 'properties.publicIpAddresses[] / publicIpPrefixes[]',
          meaning: 'Up to 16 public IP addresses in total. Each address gives 64,512 SNAT ports.',
        },
        {
          path: 'properties.idleTimeoutInMinutes',
          meaning: 'TCP idle timeout, 4 minutes by default, configurable up to 120.',
        },
        {
          path: 'subnet.properties.natGateway.id',
          meaning:
            'The association lives on the subnet. One NAT gateway can serve many subnets in one VNet.',
        },
      ],
    },
    {
      kind: 'Network interface IP forwarding (Microsoft.Network/networkInterfaces)',
      apiVersion: '2024-05-01',
      purpose: 'Lets an NVA NIC accept and send packets not addressed to its own IP.',
      fields: [
        {
          path: 'properties.enableIPForwarding',
          meaning:
            'Must be true on every NVA NIC that forwards traffic. Guest OS forwarding is a separate switch.',
        },
      ],
    },
  ],
  realWorldExample: {
    title: 'Forcing spoke traffic through the hub firewall',
    story: [
      'A bank ran a hub VNet with Azure Firewall at 10.10.2.4 and several application spokes. Security required that every packet leaving a spoke, to the internet or to another spoke, was inspected and logged by the firewall.',
      'The network team created one route table per spoke with a single UDR: `0.0.0.0/0` next hop VirtualAppliance 10.10.2.4, and associated it with every workload subnet. Because 0.0.0.0/0 is the shortest possible prefix, any more specific route wins over it. They added explicit UDRs for the hub and other spoke ranges pointing at the firewall, so the VNetPeering system route to the hub no longer bypassed inspection and spoke-to-spoke traffic had a defined path.',
      'The first test failed: VMs could not reach the internet at all. The firewall had no network rule allowing the traffic, and the team had also forgotten that the firewall subnet itself must not use the route table, or its own outbound traffic would loop back to itself.',
      'Separately, a batch subnet that called a partner API needed a fixed outbound IP for the partner allow list. Rather than giving each VM a public IP, they attached a NAT gateway with one Standard public IP to that subnet. The partner allow-listed a single address, and no VM was reachable inbound.',
    ],
  },
  yamlExamples: [
    {
      title: 'Route table forcing internet traffic to a firewall (Bicep)',
      language: 'bicep',
      explanation:
        'A default route to the firewall plus a UDR with next hop None to blackhole a range. The table does nothing until a subnet references it.',
      code: `param location string = resourceGroup().location
param firewallPrivateIp string = '10.10.2.4'

resource rt 'Microsoft.Network/routeTables@2024-05-01' = {
  name: 'rt-spoke1'
  location: location
  properties: {
    disableBgpRoutePropagation: true
    routes: [
      {
        name: 'default-to-firewall'
        properties: {
          addressPrefix: '0.0.0.0/0'
          nextHopType: 'VirtualAppliance'
          nextHopIpAddress: firewallPrivateIp
        }
      }
      {
        name: 'block-legacy-range'
        properties: {
          addressPrefix: '192.168.50.0/24'
          nextHopType: 'None'
        }
      }
    ]
  }
}`,
    },
    {
      title: 'Reading an effective route table',
      language: 'text',
      explanation:
        'Output of az network nic show-effective-route-table. The User row for 0.0.0.0/0 has replaced the Default Internet route, which now shows Invalid.',
      code: `Source    State    Address Prefix    Next Hop Type     Next Hop IP
--------  -------  ----------------  ----------------  -----------
Default   Active   10.20.0.0/16      VnetLocal
Default   Active   10.10.0.0/16      VNetPeering
Default   Invalid  0.0.0.0/0         Internet
User      Active   0.0.0.0/0         VirtualAppliance  10.10.2.4`,
    },
  ],
  imperative: [
    {
      command:
        'az network public-ip create -g rg-net -n pip-web --sku Standard --version IPv4 --zone 1 2 3',
      what: 'Creates a static, zone-redundant Standard public IP.',
      expected: '"publicIPAllocationMethod": "Static" and "sku": { "name": "Standard" }',
    },
    {
      command:
        'az network route-table create -g rg-net -n rt-spoke1 --disable-bgp-route-propagation true',
      what: 'Creates an empty route table that ignores gateway-learned routes.',
    },
    {
      command:
        'az network route-table route create -g rg-net --route-table-name rt-spoke1 -n default-to-fw --address-prefix 0.0.0.0/0 --next-hop-type VirtualAppliance --next-hop-ip-address 10.10.2.4',
      what: 'Adds a UDR sending all internet-bound traffic to the firewall.',
    },
    {
      command:
        'az network vnet subnet update -g rg-net --vnet-name vnet-spoke1 -n snet-app --route-table rt-spoke1',
      what: 'Associates the route table with a subnet. Until this runs the routes have no effect.',
    },
    {
      command: 'az network nic update -g rg-net -n nic-nva --ip-forwarding true',
      what: 'Enables IP forwarding on the NVA NIC so it can forward packets for other hosts.',
      namespaceNote:
        'Also enable forwarding in the guest OS, for example net.ipv4.ip_forward=1 on Linux.',
    },
    {
      command:
        'az network nat gateway create -g rg-net -n natgw-app --public-ip-addresses pip-nat --idle-timeout 10',
      what: 'Creates a NAT gateway using an existing Standard public IP.',
    },
    {
      command:
        'az network vnet subnet update -g rg-net --vnet-name vnet-spoke1 -n snet-batch --nat-gateway natgw-app',
      what: 'Attaches the NAT gateway so all outbound flows from the subnet use its public IP.',
    },
  ],
  declarative: {
    steps: [
      'Declare the Standard public IP (or prefix) that outbound traffic should use.',
      'Declare the NAT gateway and reference the public IP.',
      'Declare the route table with its UDRs, including the NVA or firewall next hop IP.',
      'Declare the VNet and reference the route table and NAT gateway on the subnets that need them.',
      'Run what-if, deploy, then check effective routes on a VM NIC in each subnet.',
    ],
    code: [
      {
        title: 'Subnets with a route table and a NAT gateway',
        language: 'bicep',
        explanation:
          'The association is a property of the subnet, which is why both resources are referenced from inside the VNet definition.',
        code: `param location string = resourceGroup().location
param prefix string = 'app'

resource pip 'Microsoft.Network/publicIPAddresses@2024-05-01' = {
  name: 'pip-\${prefix}-nat'
  location: location
  sku: { name: 'Standard' }
  zones: [ '1', '2', '3' ]
  properties: {
    publicIPAllocationMethod: 'Static'
    publicIPAddressVersion: 'IPv4'
  }
}

resource nat 'Microsoft.Network/natGateways@2024-05-01' = {
  name: 'natgw-\${prefix}'
  location: location
  sku: { name: 'Standard' }
  properties: {
    idleTimeoutInMinutes: 10
    publicIpAddresses: [ { id: pip.id } ]
  }
}

resource rt 'Microsoft.Network/routeTables@2024-05-01' = {
  name: 'rt-\${prefix}'
  location: location
  properties: {
    routes: [
      {
        name: 'to-nva'
        properties: {
          addressPrefix: '10.30.0.0/16'
          nextHopType: 'VirtualAppliance'
          nextHopIpAddress: '10.20.9.4'
        }
      }
    ]
  }
}

resource vnet 'Microsoft.Network/virtualNetworks@2024-05-01' = {
  name: 'vnet-\${prefix}'
  location: location
  properties: {
    addressSpace: { addressPrefixes: [ '10.20.0.0/16' ] }
    subnets: [
      {
        name: 'snet-app'
        properties: {
          addressPrefix: '10.20.1.0/24'
          routeTable: { id: rt.id }
        }
      }
      {
        name: 'snet-batch'
        properties: {
          addressPrefix: '10.20.2.0/24'
          natGateway: { id: nat.id }
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
      command: 'az network nic show-effective-route-table -g rg-net -n <nic-name> -o table',
      what: 'Shows every route a VM actually uses and which ones are Active or Invalid.',
      expected: 'A User route for 0.0.0.0/0 with Next Hop Type VirtualAppliance.',
      placeholders: ['<nic-name>'],
      namespaceNote: 'The NIC must be attached to a running VM.',
    },
    {
      command:
        'az network watcher show-next-hop -g rg-net --vm <vm-name> --source-ip 10.20.1.4 --dest-ip 8.8.8.8',
      what: 'Asks Network Watcher which next hop and which route table a packet will use.',
      expected:
        '"nextHopType": "VirtualAppliance", "nextHopIpAddress": "10.10.2.4" and the route table ID.',
      placeholders: ['<vm-name>'],
    },
    {
      command:
        'az network public-ip show -g rg-net -n pip-web --query "{ip:ipAddress, sku:sku.name, zones:zones, method:publicIPAllocationMethod}"',
      what: 'Confirms the address, SKU, zones and static allocation.',
    },
    {
      command:
        'az network vnet subnet show -g rg-net --vnet-name vnet-spoke1 -n snet-batch --query natGateway.id -o tsv',
      what: 'Confirms the NAT gateway is associated with the subnet.',
    },
  ],
  troubleshooting: [
    {
      command: 'az network nic show -g rg-net -n nic-nva --query enableIPForwarding',
      what: 'Traffic sent to an NVA disappears. The first thing to check is IP forwarding on its NIC.',
      expected: 'true',
    },
    {
      command:
        'az network watcher test-ip-flow -g rg-net --vm <vm-name> --direction Inbound --protocol TCP --local 10.20.1.4:443 --remote 203.0.113.10:50000',
      what: 'A Standard public IP is attached but nobody can connect. Checks whether an NSG allows the inbound flow.',
      expected: 'Access Deny names the NSG rule that blocks it; add an allow rule.',
      placeholders: ['<vm-name>'],
    },
    {
      command:
        'az network vnet subnet show -g rg-net --vnet-name vnet-spoke1 -n snet-app --query routeTable.id -o tsv',
      what: 'Routes seem ignored. An empty result means the route table was never associated with this subnet.',
    },
    {
      command: 'curl -s https://ifconfig.me',
      what: 'Run from a VM to see which public IP its outbound traffic uses; it should be the NAT gateway IP.',
    },
  ],
  commonMistakes: [
    'Creating a route table and routes but never associating it with a subnet. Route tables have no effect on their own.',
    'Pointing a UDR at an NVA without enabling IP forwarding on the NVA NIC and in the guest OS. Traffic is silently dropped.',
    'Applying the forced-tunnel route table to the firewall or NVA subnet itself, creating a routing loop.',
    'Expecting 0.0.0.0/0 to capture traffic to peered VNets. The more specific VNetPeering system routes still win by longest prefix, so add specific UDRs for those ranges.',
    'Attaching a Standard public IP to a VM and expecting it to be reachable. Standard is closed inbound until an NSG allows the traffic.',
    'Planning around Basic public IPs or dynamic allocation. Basic is retired and Standard is always static.',
    'Expecting NAT gateway to allow inbound connections. It is outbound only.',
  ],
  examTips: [
    'Route selection order: longest prefix match first; on a tie, UDR over BGP over system route.',
    'Memorise the five UDR next hop types: VirtualAppliance, VirtualNetworkGateway, VnetLocal, Internet, None. Only VirtualAppliance needs a next hop IP address.',
    'A subnet can have one route table; a route table can serve many subnets but only in the same region and subscription.',
    'NVA scenarios need two things: a UDR pointing at the NVA IP, and IP forwarding enabled on the NVA NIC.',
    'Standard public IP facts: static, zone-redundant by default, secure by default (needs an NSG allow rule for inbound). Basic is retired.',
    'When a question asks for predictable outbound IPs for many VMs without exposing them inbound, the answer is NAT gateway on the subnet.',
    'Next hop in Network Watcher tells you which route and route table a packet uses; it is the fastest way to answer "why does traffic go there?".',
  ],
  summary: [
    'Standard public IPs are static, zone-redundant and closed to inbound traffic by default; Basic is retired.',
    'Every subnet gets system routes; UDRs in a route table associated with the subnet override or extend them.',
    'Azure chooses routes by longest prefix match, then UDR over BGP over system on a tie.',
    'Next hop types are VirtualAppliance, VirtualNetworkGateway, VnetLocal, Internet and None.',
    'NVAs need IP forwarding on their NIC, and NAT gateway gives subnets scalable outbound-only internet access.',
  ],
  practice: [
    {
      id: 'az1-routing-public-ip-p1',
      level: 'beginner',
      prompt:
        'A subnet has a system route 0.0.0.0/0 to Internet and a UDR 0.0.0.0/0 to VirtualAppliance 10.0.2.4. Where does traffic to 8.8.8.8 go?',
      answer:
        'To the virtual appliance at 10.0.2.4. The prefixes tie, so the UDR wins over the system route.',
      explanation:
        'When prefixes are identical, the route source decides: UDR, then BGP, then system. The system Internet route shows as Invalid in the effective routes.',
    },
    {
      id: 'az1-routing-public-ip-p2',
      level: 'intermediate',
      prompt:
        'A route table has 10.0.0.0/16 to VirtualAppliance 10.1.0.4 and 10.0.5.0/24 to VnetLocal. Where does a packet for 10.0.5.20 go?',
      answer:
        'It follows the 10.0.5.0/24 route with next hop VnetLocal, because /24 is a longer prefix than /16.',
      explanation:
        'Longest prefix match is evaluated before route source. This is how you exempt one subnet from going through an NVA.',
    },
    {
      id: 'az1-routing-public-ip-p3',
      level: 'intermediate',
      prompt:
        'You add a UDR pointing to a Linux NVA, but traffic never arrives at its destination. The NVA is running and reachable. What two settings do you check?',
      answer:
        'IP forwarding on the NVA network interface in Azure, and IP forwarding inside the guest OS (net.ipv4.ip_forward=1).',
      explanation:
        'Azure drops packets arriving at a NIC for an address that is not its own unless IP forwarding is enabled. The OS then has to forward them too. NSGs on the NVA subnet are the third thing to check.',
    },
    {
      id: 'az1-routing-public-ip-p4',
      level: 'beginner',
      prompt:
        'You attach a new Standard public IP to a VM and RDP from home times out. The VM is running. What is the most likely cause?',
      answer:
        'No NSG allows the inbound traffic. Standard public IPs are secure by default and block inbound until an NSG rule permits it.',
      explanation:
        'The better fix is usually not to open RDP at all but to use Azure Bastion, which avoids a public IP on the VM.',
    },
    {
      id: 'az1-routing-public-ip-p5',
      level: 'advanced',
      prompt:
        'Fifty VMs in one subnet must call a partner API that allow-lists source IPs, and none may be reachable from the internet. What do you deploy?',
      answer:
        'A NAT gateway with one Standard public IP (or a prefix), associated with the subnet. All outbound flows use that IP and no inbound path exists.',
      explanation:
        'Instance public IPs would expose each VM and give fifty addresses to allow-list. A load balancer outbound rule works but needs more configuration. NAT gateway takes precedence for outbound once attached.',
    },
  ],
  lab: {
    title: 'Build forced tunnelling routes, a blackhole route and a NAT gateway',
    scenario:
      'A spoke VNet has two subnets. The app subnet must send all internet traffic to a future firewall and must never reach a legacy range. The batch subnet needs a fixed outbound public IP. Build it with the CLI and inspect the result without deploying any VMs.',
    prerequisites: [
      'An Azure subscription with Contributor on a resource group',
      'Azure Cloud Shell (Bash) or Azure CLI 2.60 or newer',
      'NAT gateway and public IPs are billed hourly, so finish and clean up in one sitting',
    ],
    tasks: [
      {
        instruction:
          'Create rg-az104-routing and a VNet vnet-lab 10.20.0.0/16 with subnets snet-app 10.20.1.0/24, snet-batch 10.20.2.0/24 and snet-nva 10.20.9.0/24.',
      },
      {
        instruction:
          'Create a route table rt-app with a UDR 0.0.0.0/0 to VirtualAppliance 10.20.9.4 and a UDR 192.168.50.0/24 with next hop None.',
        hint: 'Only the VirtualAppliance route needs --next-hop-ip-address.',
      },
      {
        instruction: 'Associate rt-app with snet-app only. Do not associate it with snet-nva.',
        hint: 'Associating it with the NVA subnet would send the NVA traffic back to itself.',
      },
      {
        instruction:
          'Create a Standard, zone-redundant public IP pip-nat and a NAT gateway natgw-batch that uses it, then attach the NAT gateway to snet-batch.',
      },
      {
        instruction:
          'Verify: the route table lists two routes, snet-app references rt-app, snet-batch references natgw-batch, and pip-nat is Static and Standard.',
      },
      {
        instruction:
          'Predict (in writing) the next hop for traffic from snet-app to 8.8.8.8, to 192.168.50.10 and to 10.20.2.5.',
        hint: 'Longest prefix first: 10.20.0.0/16 VnetLocal is more specific than 0.0.0.0/0.',
      },
    ],
    solution: [
      {
        title: 'Network, route table and NAT gateway',
        language: 'bash',
        code: `RG=rg-az104-routing
LOC=westeurope
az group create -n $RG -l $LOC

az network vnet create -g $RG -n vnet-lab --address-prefixes 10.20.0.0/16 \\
  --subnet-name snet-app --subnet-prefixes 10.20.1.0/24
az network vnet subnet create -g $RG --vnet-name vnet-lab -n snet-batch --address-prefixes 10.20.2.0/24
az network vnet subnet create -g $RG --vnet-name vnet-lab -n snet-nva   --address-prefixes 10.20.9.0/24

# Route table with a default route to the NVA and a blackhole route
az network route-table create -g $RG -n rt-app
az network route-table route create -g $RG --route-table-name rt-app -n default-to-nva \\
  --address-prefix 0.0.0.0/0 --next-hop-type VirtualAppliance --next-hop-ip-address 10.20.9.4
az network route-table route create -g $RG --route-table-name rt-app -n block-legacy \\
  --address-prefix 192.168.50.0/24 --next-hop-type None
az network vnet subnet update -g $RG --vnet-name vnet-lab -n snet-app --route-table rt-app

# Standard public IP and NAT gateway for the batch subnet
az network public-ip create -g $RG -n pip-nat --sku Standard --zone 1 2 3
az network nat gateway create -g $RG -n natgw-batch --public-ip-addresses pip-nat --idle-timeout 10
az network vnet subnet update -g $RG --vnet-name vnet-lab -n snet-batch --nat-gateway natgw-batch`,
      },
      {
        title: 'Expected predictions',
        language: 'text',
        code: `snet-app -> 8.8.8.8        VirtualAppliance 10.20.9.4  (UDR 0.0.0.0/0)
snet-app -> 192.168.50.10  None, dropped               (UDR /24 beats system /16)
snet-app -> 10.20.2.5      VnetLocal                   (system 10.20.0.0/16 is longer than /0)`,
      },
    ],
    verification: [
      {
        command:
          'az network route-table route list -g rg-az104-routing --route-table-name rt-app -o table',
        what: 'Lists the two UDRs with their next hop types.',
        expected: 'default-to-nva VirtualAppliance 10.20.9.4 and block-legacy None.',
      },
      {
        command:
          'az network vnet show -g rg-az104-routing -n vnet-lab --query "subnets[].{name:name, rt:routeTable.id, nat:natGateway.id}" -o table',
        what: 'Shows which subnet has the route table and which has the NAT gateway.',
        expected: 'snet-app has rt-app, snet-batch has natgw-batch, snet-nva has neither.',
      },
      {
        command:
          'az network public-ip show -g rg-az104-routing -n pip-nat --query "{sku:sku.name, method:publicIPAllocationMethod, zones:zones}"',
        what: 'Confirms the public IP is Standard, Static and zone-redundant.',
        expected: 'Standard, Static and zones 1, 2, 3.',
      },
    ],
    cleanup: [
      {
        command: 'az group delete -n rg-az104-routing --yes --no-wait',
        what: 'Deletes the NAT gateway, public IP, route table and VNet so hourly charges stop.',
      },
    ],
  },
  relatedTopicIds: [
    'az1-vnets-peering',
    'az1-nsg-bastion',
    'az1-dns-load-balancing',
    'az1-network-watcher',
  ],
  docs: [
    {
      title: 'Virtual network traffic routing',
      url: 'https://learn.microsoft.com/azure/virtual-network/virtual-networks-udr-overview',
    },
    {
      title: 'Create, change or delete a route table',
      url: 'https://learn.microsoft.com/azure/virtual-network/manage-route-table',
    },
    {
      title: 'Public IP addresses in Azure',
      url: 'https://learn.microsoft.com/azure/virtual-network/ip-services/public-ip-addresses',
    },
    {
      title: 'What is Azure NAT Gateway?',
      url: 'https://learn.microsoft.com/azure/nat-gateway/nat-overview',
    },
    {
      title: 'Diagnose a VM routing problem with next hop',
      url: 'https://learn.microsoft.com/azure/network-watcher/diagnose-vm-network-routing-problem',
    },
  ],
}
