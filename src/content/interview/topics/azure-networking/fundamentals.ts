import type { InterviewQuestion } from '../../../types'

/** VNets, address planning, NSGs, peering and hub-spoke topologies. */
export const azureNetworkingFundamentalsQuestions: InterviewQuestion[] = [
  {
    id: 'itv-aznet-1',
    level: 'basic',
    kind: 'open',
    prompt: 'How do you plan the address space for Azure VNets and subnets?',
    probing:
      'IP planning mistakes are nearly impossible to fix later. They want non-overlap with on-premises, room to grow, and awareness of subnets that have size requirements.',
    answer: [
      'A **virtual network** is a private address space - for example `10.20.0.0/16` - in one region and one subscription, divided into **subnets**. Everything in a VNet can reach everything else by default; subnets are where you attach NSGs, route tables and delegations.',
      'The first rule is **no overlap** - with on-premises ranges, with other VNets you will ever peer to, and with partner networks you might connect by VPN. Peering and VPN routing simply do not work across overlapping ranges, and renumbering later means rebuilding. I take ranges from a central **IPAM** plan, not whatever the portal suggests.',
      'The second rule is **leave room**. Azure reserves **five addresses in every subnet** - network, gateway, two for Azure DNS, and broadcast - so a `/29` gives only three usable. I size for growth, and some subnets have minimum sizes or dedicated names: `GatewaySubnet` for VPN and ExpressRoute gateways (a `/27` or larger), `AzureFirewallSubnet` (`/26`), `AzureBastionSubnet` (`/26` or larger), and delegated subnets for App Service VNet integration or Container Apps.',
      'AKS is the usual surprise. With classic Azure CNI every pod takes a VNet IP, so a cluster needs thousands of addresses; with **Azure CNI Overlay** pods come from a separate private range and only nodes consume VNet IPs. That choice changes the plan dramatically.',
    ],
    code: [
      {
        title: 'A spoke VNet with purpose-built subnets',
        language: 'bicep',
        code: `resource vnet 'Microsoft.Network/virtualNetworks@2024-01-01' = {
  name: 'vnet-shop-prod-uks'
  location: location
  properties: {
    addressSpace: { addressPrefixes: [ '10.20.0.0/20' ] }
    subnets: [
      { name: 'snet-app',  properties: { addressPrefix: '10.20.0.0/24' } }
      { name: 'snet-data', properties: { addressPrefix: '10.20.1.0/24' } }
      { name: 'snet-pe',   properties: { addressPrefix: '10.20.2.0/24' } }
      {
        name: 'snet-appsvc-integration'
        properties: {
          addressPrefix: '10.20.3.0/26'
          delegations: [ { name: 'web', properties: { serviceName: 'Microsoft.Web/serverFarms' } } ]
        }
      }
      { name: 'snet-aks-nodes', properties: { addressPrefix: '10.20.8.0/22' } }
    ]
  }
}`,
      },
      {
        title: 'Check what is free before adding a subnet',
        language: 'bash',
        code: `az network vnet show -g rg-net -n vnet-shop-prod-uks \\
  --query "{space:addressSpace.addressPrefixes, subnets:subnets[].{name:name, prefix:addressPrefix}}" -o jsonc

# How many IPs are left in a subnet?
az network vnet subnet show -g rg-net --vnet-name vnet-shop-prod-uks -n snet-app \\
  --query "{prefix:addressPrefix, used:length(ipConfigurations || \`[]\`)}"`,
      },
    ],
    traps: [
      'Picking 10.0.0.0/16 for every VNet because it is the portal default.',
      'Forgetting the five reserved addresses per subnet.',
      'Sizing the AKS subnet for nodes only with classic Azure CNI, where every pod needs an IP.',
    ],
    followUps: [
      'Can you change a VNet’s address space after peering?',
      'Why does GatewaySubnet need to be at least a /27?',
    ],
    tags: ['vnet', 'subnets', 'cidr', 'ip planning'],
  },
  {
    id: 'itv-aznet-2',
    level: 'basic',
    kind: 'mcq',
    prompt: 'How many IP addresses can you assign to resources in an Azure subnet sized /27?',
    options: [
      { id: 'a', text: '32 addresses' },
      { id: 'b', text: '30 addresses' },
      { id: 'c', text: '27 addresses' },
      { id: 'd', text: '16 addresses' },
    ],
    correct: ['c'],
    probing: 'The reserved-address rule, which catches people used to on-premises networks.',
    answer: [
      'A /27 has 32 addresses, and Azure reserves **five** in every subnet: the network address, the default gateway (.1), two for Azure DNS (.2 and .3), and the broadcast address. So **27** are usable.',
      '30 is the on-premises answer, reserving only network and broadcast. 16 would be a /28 before reservations.',
    ],
    code: [
      {
        title: 'The arithmetic',
        language: 'python',
        code: `for prefix in (29, 28, 27, 26, 24):
    total = 2 ** (32 - prefix)
    print(f"/{prefix}: {total} total, {total - 5} usable in Azure")`,
      },
    ],
    traps: ['Applying on-premises subnet maths in Azure.'],
    followUps: ['What is the smallest subnet Azure allows?'],
    tags: ['subnets', 'cidr', 'basics'],
  },
  {
    id: 'itv-aznet-3',
    level: 'basic',
    kind: 'open',
    prompt:
      'How do network security groups work? How are rules evaluated, and where do application security groups fit?',
    probing:
      'Priority order, default rules, statefulness, and that subnet and NIC NSGs both apply. ASGs show you can keep rules readable.',
    answer: [
      'An **NSG** is a stateful list of allow and deny rules on source, destination, port and protocol. You attach it to a **subnet**, a **NIC**, or both. Rules are evaluated by **priority**, lowest number first, from 100 to 4096, and the **first match wins**. Because NSGs are **stateful**, allowing a request inbound automatically allows its reply.',
      'Every NSG has **default rules** at priorities 65000 and up: allow traffic within the VNet, allow the Azure Load Balancer probe, and deny everything else inbound; outbound allows VNet and Internet and denies the rest. You cannot delete them, only override them with lower-numbered rules.',
      'If both a subnet NSG and a NIC NSG exist, traffic must be allowed by **both**. Inbound, the subnet NSG is evaluated first, then the NIC’s; outbound, the NIC’s first, then the subnet’s. That double evaluation is the classic reason "I allowed it and it is still blocked".',
      '**Application security groups** let you group NICs by role - `asg-web`, `asg-api` - and write rules like "allow asg-web to asg-api on 443". The rules stay the same as VMs are added or IPs change. Where they exist, I also use **service tags** like `AzureLoadBalancer`, `Storage.UKSouth` or `AzureFrontDoor.Backend` instead of hard-coding Microsoft IP ranges.',
    ],
    diagrams: [
      {
        kind: 'flow',
        title: 'An inbound packet to a VM',
        caption: 'Both NSGs must allow it. Outbound, the order is reversed.',
        nodes: [
          { label: 'Packet arrives at subnet' },
          {
            label: 'Subnet NSG, lowest priority first',
            branch: { label: 'Deny match', detail: 'Dropped', tone: 'danger' },
          },
          {
            label: 'NIC NSG, lowest priority first',
            branch: { label: 'Deny match', detail: 'Dropped', tone: 'danger' },
          },
          { label: 'Delivered to the VM', tone: 'success' },
          { label: 'Reply allowed automatically', detail: 'NSGs are stateful', tone: 'muted' },
        ],
      },
    ],
    code: [
      {
        title: 'ASG-based rule and the effective rules on a NIC',
        language: 'bash',
        code: `az network asg create -g rg-app -n asg-web
az network asg create -g rg-app -n asg-api

az network nsg rule create -g rg-app --nsg-name nsg-snet-app -n allow-web-to-api \\
  --priority 200 --direction Inbound --access Allow --protocol Tcp \\
  --source-asgs asg-web --destination-asgs asg-api --destination-port-ranges 443

# What actually applies to this NIC, subnet and NIC NSGs combined
az network nic list-effective-nsg -g rg-app -n vm-api-01-nic -o jsonc`,
      },
    ],
    traps: [
      'Thinking higher priority numbers win.',
      'Allowing a port on the NIC NSG and forgetting the subnet NSG.',
      'Adding a deny-all at priority 4096 and blocking the load balancer health probe.',
    ],
    followUps: [
      'Why would a load balancer health probe fail after you add a deny rule?',
      'Which subnets cannot have an NSG, or need specific rules?',
    ],
    tags: ['nsg', 'asg', 'service tags', 'security'],
  },
  {
    id: 'itv-aznet-4',
    level: 'intermediate',
    kind: 'open',
    prompt:
      'Explain VNet peering and the hub-and-spoke topology. Why is peering non-transitive, and how do spokes talk to each other?',
    probing:
      'The core enterprise topology. They want non-transitivity understood and the three ways to handle spoke-to-spoke traffic.',
    answer: [
      '**VNet peering** connects two VNets over the Microsoft backbone, so resources in each reach the other by private IP with low latency. It works within a region or across regions (global peering), and across subscriptions and even tenants. It is **not a gateway** - no bandwidth bottleneck and no encryption layer of its own.',
      'Peering is **non-transitive**: if A peers with hub H and B peers with H, A cannot reach B through H. Each peering only exchanges the two VNets’ own address spaces.',
      'That is why **hub-and-spoke** exists. The **hub** VNet holds shared services - Azure Firewall or an NVA, the VPN or ExpressRoute gateway, Bastion, DNS resolvers - and each workload **spoke** peers only with the hub. With **gateway transit**, spokes use the hub’s VPN or ExpressRoute gateway to reach on-premises: the hub peering allows gateway transit and each spoke peering uses remote gateways.',
      'For **spoke-to-spoke** traffic there are three options. Put a **user-defined route** in each spoke sending other spokes’ ranges to the **hub firewall**, which forwards and inspects - the usual choice because it gives central control. Create **direct peerings** between specific spokes that talk a lot, bypassing inspection. Or use **Azure Virtual Network Manager** connectivity configurations, or Virtual WAN, which manage this for you.',
    ],
    diagrams: [
      {
        kind: 'nested',
        title: 'Hub-and-spoke',
        caption:
          'Spokes peer only to the hub; spoke-to-spoke traffic is routed through the hub firewall.',
        root: {
          label: 'Region: uksouth',
          children: [
            {
              label: 'Hub VNet',
              tone: 'accent',
              children: [
                { label: 'Azure Firewall', detail: 'Inspection, spoke-to-spoke' },
                { label: 'VPN or ExpressRoute gateway', detail: 'Gateway transit' },
                { label: 'Bastion and DNS resolver' },
              ],
            },
            { label: 'Spoke: shop-prod', detail: 'UDR 0.0.0.0/0 to firewall' },
            { label: 'Spoke: payments-prod', detail: 'UDR 0.0.0.0/0 to firewall' },
          ],
        },
      },
    ],
    code: [
      {
        title: 'Hub and spoke peering with gateway transit',
        language: 'bash',
        code: `HUB_ID=$(az network vnet show -g rg-hub -n vnet-hub-uks --query id -o tsv)
SPOKE_ID=$(az network vnet show -g rg-shop -n vnet-shop-prod-uks --query id -o tsv)

# Hub side: allow the spoke to use the hub gateway, accept forwarded traffic
az network vnet peering create -g rg-hub --vnet-name vnet-hub-uks -n hub-to-shop \\
  --remote-vnet "$SPOKE_ID" --allow-vnet-access --allow-forwarded-traffic --allow-gateway-transit

# Spoke side: use the hub's gateway for on-premises routes
az network vnet peering create -g rg-shop --vnet-name vnet-shop-prod-uks -n shop-to-hub \\
  --remote-vnet "$HUB_ID" --allow-vnet-access --allow-forwarded-traffic --use-remote-gateways

az network vnet peering show -g rg-shop --vnet-name vnet-shop-prod-uks -n shop-to-hub \\
  --query "{state:peeringState, sync:peeringSyncLevel}"`,
      },
    ],
    traps: [
      'Saying spokes can reach each other through the hub by default.',
      'Forgetting allow-forwarded-traffic, so the firewall’s forwarded packets are dropped.',
      'Setting use-remote-gateways before the hub gateway exists - the peering fails.',
    ],
    followUps: [
      'What happens to peering if you need to add an address range to a spoke?',
      'When would you choose direct spoke peering over routing through the firewall?',
    ],
    tags: ['peering', 'hub-spoke', 'gateway transit', 'topology'],
  },
  {
    id: 'itv-aznet-5',
    level: 'advanced',
    kind: 'open',
    prompt: 'When would you choose Azure Virtual WAN over a self-managed hub-and-spoke?',
    probing:
      'Architecture judgement. They want Virtual WAN’s managed routing and scale benefits weighed against control and cost - not a blanket preference.',
    answer: [
      'A **self-managed hub-and-spoke** means you build the hub VNet yourself: gateways, firewall, route tables in every spoke, peering, and routing between regional hubs. You have **full control** - any NVA, custom routing, any feature that works in a normal VNet - and you own all the routing complexity.',
      '**Azure Virtual WAN** is a Microsoft-managed hub. You create a virtual hub per region, connect VNets, VPN sites, ExpressRoute circuits and point-to-site users to it, and Virtual WAN handles the **routing between them automatically** - including **any-to-any transit between hubs** across regions over the Microsoft backbone. With a **secured hub** (Azure Firewall inside it) and **routing intent**, you get inspection of private and internet traffic without maintaining UDRs in every spoke.',
      'I would lean to **Virtual WAN** for large, multi-region estates with many branches or SD-WAN devices, many VPN sites, or global transit requirements - where the routing management is the real cost. I would lean to **self-managed hub-and-spoke** for one or two regions, when I need an NVA or feature Virtual WAN hubs do not support, or when I want fine-grained control of routes and lower baseline cost.',
      'Either way, Azure Virtual Network Manager can take over the repetitive parts - peering, connectivity groups and security admin rules - so a self-managed topology does not have to mean hand-built peerings.',
    ],
    diagrams: [
      {
        kind: 'decision',
        title: 'Virtual WAN or self-managed hub?',
        caption: 'Virtual WAN trades control for managed routing at scale.',
        question: 'What dominates the network design?',
        branches: [
          {
            condition: 'Many branches, SD-WAN, many regions',
            result: 'Virtual WAN',
            detail: 'Managed any-to-any transit',
            tone: 'accent',
          },
          {
            condition: 'One or two regions, custom routing',
            result: 'Self-managed hub-spoke',
            detail: 'Full control, you own UDRs',
            tone: 'success',
          },
          {
            condition: 'Third-party NVA not supported in hubs',
            result: 'Self-managed hub-spoke',
            tone: 'warning',
          },
          {
            condition: 'Many spokes, want less toil either way',
            result: 'Add Virtual Network Manager',
            detail: 'Connectivity and admin rules',
          },
        ],
      },
    ],
    code: [
      {
        title: 'A secured Virtual WAN hub with routing intent',
        language: 'bash',
        code: `az network vwan create -g rg-net -n vwan-contoso --type Standard
az network vhub create -g rg-net -n vhub-uks --vwan vwan-contoso \\
  --address-prefix 10.100.0.0/23 -l uksouth

az network vhub connection create -g rg-net --vhub-name vhub-uks -n conn-shop \\
  --remote-vnet /subscriptions/<sub-id>/resourceGroups/rg-shop/providers/Microsoft.Network/virtualNetworks/vnet-shop-prod-uks

# After deploying Azure Firewall into the hub: send private and internet traffic through it
az network vhub routing-intent create -g rg-net --vhub vhub-uks -n ri-uks \\
  --routing-policies "[{name:PrivateTraffic,destinations:[PrivateTraffic],next-hop:<firewall-id>},{name:Internet,destinations:[Internet],next-hop:<firewall-id>}]"`,
        placeholders: ['<sub-id>', '<firewall-id>'],
      },
    ],
    deeper: [
      'Virtual WAN hubs are billed per hub hour plus data processing, so for a single small region it is often more expensive than a simple VNet hub.',
      'In a Virtual WAN hub you cannot deploy arbitrary resources as you can in a VNet hub - shared services like DNS resolvers and Bastion go in a separate shared-services spoke.',
      'Routing intent replaced much of the manual custom route table work in secured hubs; mixing custom route tables and routing intent has restrictions, so choose one approach.',
    ],
    traps: [
      'Choosing Virtual WAN for a single region with three spokes "because it is managed".',
      'Planning to put Bastion or a DNS resolver inside the Virtual WAN hub itself.',
    ],
    followUps: [
      'What is routing intent?',
      'How does Azure Virtual Network Manager differ from Virtual WAN?',
    ],
    tags: ['virtual wan', 'hub-spoke', 'topology', 'design', 'avnm'],
  },
]
