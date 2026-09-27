import type { Question } from '../../types'

/** Original practice questions for this domain. Written for this app. */
export const az104NetworkingQuestions: Question[] = [
  /* ------------------------------------------------------ VNets & peering */
  {
    id: 'az1q-net-1',
    domainId: 'az1-networking',
    topicId: 'az1-vnets-peering',
    kind: 'mcq',
    category: 'concept',
    difficulty: 'beginner',
    points: 1,
    prompt:
      'You create a subnet with the address range 10.1.0.0/28. How many IP addresses can you assign to resources in it?',
    options: [
      { id: 'a', text: '16' },
      { id: 'b', text: '14' },
      { id: 'c', text: '11' },
      { id: 'd', text: '8' },
    ],
    correct: ['c'],
    explanation:
      'A /28 has 16 addresses, and Azure reserves 5 in every subnet: the network address, the default gateway, two for Azure DNS mapping, and the broadcast address. That leaves 11. 14 is the traditional on-premises answer (only network and broadcast reserved), which is the trap.',
  },
  {
    id: 'az1q-net-2',
    domainId: 'az1-networking',
    topicId: 'az1-vnets-peering',
    kind: 'mcq',
    category: 'concept',
    difficulty: 'intermediate',
    points: 2,
    prompt:
      'VNet-Hub is peered with VNet-A and with VNet-B. VNet-A and VNet-B are not peered with each other, and no NVA or gateway is involved. A VM in VNet-A tries to reach a VM in VNet-B. What happens?',
    options: [
      { id: 'a', text: 'It works, because both VNets are peered with the same hub' },
      { id: 'b', text: 'It fails, because VNet peering is not transitive' },
      { id: 'c', text: 'It works only if both peerings are global peerings' },
      { id: 'd', text: 'It works once "Allow forwarded traffic" is enabled on the hub peerings' },
    ],
    correct: ['b'],
    explanation:
      'Peering is non-transitive: A can talk to the hub and B can talk to the hub, but A cannot reach B through it. Fix it by peering A and B directly, or by routing through an NVA or Azure Firewall in the hub with UDRs. "Allow forwarded traffic" only permits traffic that something in the hub actually forwards - on its own it forwards nothing. Global versus regional peering makes no difference to transitivity.',
  },
  {
    id: 'az1q-net-3',
    domainId: 'az1-networking',
    topicId: 'az1-vnets-peering',
    kind: 'multi',
    category: 'concept',
    difficulty: 'intermediate',
    points: 2,
    prompt:
      'VNet-Hub has a VPN gateway to the on-premises network. You want spoke VNet-Spoke1 to reach on-premises through that gateway without deploying its own. Which two settings are required? (Select two.)',
    options: [
      { id: 'a', text: 'Enable "Allow gateway transit" on the Hub-to-Spoke1 peering' },
      { id: 'b', text: 'Enable "Use remote gateways" on the Spoke1-to-Hub peering' },
      { id: 'c', text: 'Enable "Use remote gateways" on the Hub-to-Spoke1 peering' },
      { id: 'd', text: 'Deploy a GatewaySubnet in VNet-Spoke1' },
      { id: 'e', text: 'Configure a service endpoint for Microsoft.Network on the spoke' },
    ],
    correct: ['a', 'b'],
    explanation:
      'Gateway transit is a pair of settings: the VNet that owns the gateway allows transit, and the VNet that borrows it uses remote gateways. Setting "Use remote gateways" on the hub side is backwards. A spoke using remote gateways must not have its own gateway, so it needs no GatewaySubnet, and service endpoints are unrelated to on-premises connectivity.',
  },
  {
    id: 'az1q-net-4',
    domainId: 'az1-networking',
    topicId: 'az1-vnets-peering',
    kind: 'command',
    category: 'command',
    difficulty: 'intermediate',
    points: 2,
    prompt:
      'Write the Azure CLI command that creates a peering named `a-to-b` from VNet `vnet-a` to `vnet-b` (both in resource group `rg-net`), allowing VNet access. Assume `vnet-b` is in the same resource group and can be referenced by name.',
    acceptedAnswers: [
      'az network vnet peering create --name a-to-b --resource-group rg-net --vnet-name vnet-a --remote-vnet vnet-b --allow-vnet-access',
      'az network vnet peering create -n a-to-b -g rg-net --vnet-name vnet-a --remote-vnet vnet-b --allow-vnet-access',
      'az network vnet peering create -g rg-net -n a-to-b --vnet-name vnet-a --remote-vnet vnet-b --allow-vnet-access',
      'az network vnet peering create --resource-group rg-net --name a-to-b --vnet-name vnet-a --remote-vnet vnet-b --allow-vnet-access',
    ],
    answerHint: 'az network vnet peering create ...',
    explanation:
      '`az network vnet peering create` takes the local VNet in `--vnet-name` and the other side in `--remote-vnet` (a name in the same group, or a full resource ID). Remember that this creates only one direction - the status stays "Initiated" until you create `b-to-a` as well.',
  },

  /* --------------------------------------------------- routing & public IP */
  {
    id: 'az1q-net-5',
    domainId: 'az1-networking',
    topicId: 'az1-routing-public-ip',
    kind: 'mcq',
    category: 'troubleshoot',
    difficulty: 'intermediate',
    points: 2,
    prompt:
      'A route table on subnet App contains 0.0.0.0/0 next hop VirtualAppliance 10.0.100.4 and 10.2.0.0/16 next hop None. A VM in App sends traffic to 10.2.5.9, which is in a peered VNet. What happens to the packet?',
    options: [
      {
        id: 'a',
        text: 'It is sent to the NVA at 10.0.100.4, because the 0.0.0.0/0 route is listed first',
      },
      {
        id: 'b',
        text: 'It is delivered over the peering, because system peering routes always win',
      },
      {
        id: 'c',
        text: 'It is dropped, because 10.2.0.0/16 is the longest matching prefix and its next hop is None',
      },
      { id: 'd', text: 'It is sent to the internet, because None falls back to the default route' },
    ],
    correct: ['c'],
    explanation:
      'Azure picks the route with the longest prefix match. 10.2.0.0/16 is more specific than 0.0.0.0/0, and a UDR with the same prefix overrides the system peering route. Next hop None means drop. Order in the table is irrelevant, and None never falls back to anything.',
  },
  {
    id: 'az1q-net-6',
    domainId: 'az1-networking',
    topicId: 'az1-routing-public-ip',
    kind: 'multi',
    category: 'troubleshoot',
    difficulty: 'advanced',
    points: 2,
    prompt:
      'You add a UDR sending 0.0.0.0/0 to a third-party firewall VM at 10.0.1.4. Traffic from the workload subnet now times out, and the firewall never logs it leaving. Which two settings are the most likely missing pieces? (Select two.)',
    options: [
      {
        id: 'a',
        text: 'IP forwarding is not enabled on the firewall VM network interface in Azure',
      },
      { id: 'b', text: 'Forwarding is not enabled inside the firewall guest operating system' },
      {
        id: 'c',
        text: 'The route table uses next hop type VirtualNetworkGateway instead of VirtualAppliance',
      },
      { id: 'd', text: 'The firewall VM is using a Standard SKU public IP address' },
      { id: 'e', text: 'The workload subnet has no NAT gateway associated' },
    ],
    correct: ['a', 'b'],
    explanation:
      'An NVA must forward packets not addressed to itself. That needs IP forwarding on the Azure NIC (otherwise the platform drops them) and forwarding in the guest OS. The scenario says the next hop is the firewall IP, so VirtualAppliance is already in use. A Standard public IP is the normal choice, and a NAT gateway is not required when egress goes through the firewall.',
  },
  {
    id: 'az1q-net-7',
    domainId: 'az1-networking',
    topicId: 'az1-routing-public-ip',
    kind: 'mcq',
    category: 'concept',
    difficulty: 'intermediate',
    points: 2,
    prompt:
      'Forty VMs in a subnet, none with public IPs, need outbound internet access through a small, predictable set of static public IPs that a partner can allow-list, without managing any VMs. What should you deploy?',
    options: [
      { id: 'a', text: 'A NAT gateway with a Standard public IP associated to the subnet' },
      { id: 'b', text: 'A Standard public IP on each VM' },
      { id: 'c', text: 'Rely on default outbound access' },
      { id: 'd', text: 'A route table with 0.0.0.0/0 next hop Internet' },
    ],
    correct: ['a'],
    explanation:
      'A NAT gateway gives a whole subnet outbound SNAT through the public IPs or prefix you attach, is fully managed and scales without port exhaustion issues. Forty public IPs would expose every VM and is hard to allow-list. Default outbound access uses addresses you do not control and is being retired for new VNets. A route to Internet changes nothing about which source IP is used.',
  },
  {
    id: 'az1q-net-8',
    domainId: 'az1-networking',
    topicId: 'az1-routing-public-ip',
    kind: 'command',
    category: 'command',
    difficulty: 'intermediate',
    points: 2,
    prompt:
      'Write the Azure CLI command that adds a route named `to-fw` for `0.0.0.0/0` to route table `rt-spoke` in resource group `rg-net`, sending traffic to a virtual appliance at `10.0.1.4`.',
    acceptedAnswers: [
      'az network route-table route create -g rg-net --route-table-name rt-spoke -n to-fw --address-prefix 0.0.0.0/0 --next-hop-type VirtualAppliance --next-hop-ip-address 10.0.1.4',
      'az network route-table route create --resource-group rg-net --route-table-name rt-spoke --name to-fw --address-prefix 0.0.0.0/0 --next-hop-type VirtualAppliance --next-hop-ip-address 10.0.1.4',
      'az network route-table route create -n to-fw -g rg-net --route-table-name rt-spoke --address-prefix 0.0.0.0/0 --next-hop-type VirtualAppliance --next-hop-ip-address 10.0.1.4',
    ],
    answerHint: 'az network route-table route create ...',
    explanation:
      'Routes live inside a route table, so the command is `az network route-table route create` with `--route-table-name`. `--next-hop-ip-address` is only valid (and is required) when the type is VirtualAppliance. The table does nothing until it is associated with a subnet.',
  },

  /* -------------------------------------------------------- NSG & Bastion */
  {
    id: 'az1q-net-9',
    domainId: 'az1-networking',
    topicId: 'az1-nsg-bastion',
    kind: 'mcq',
    category: 'troubleshoot',
    difficulty: 'intermediate',
    points: 2,
    prompt:
      'An NSG on a VM subnet has these inbound rules: priority 200 Deny TCP 3389 from Internet; priority 300 Allow TCP 3389 from 203.0.113.10; priority 4000 Allow TCP any from VirtualNetwork. An admin at 203.0.113.10 cannot RDP to the VM public IP. Why?',
    options: [
      { id: 'a', text: 'Rule 300 should be above rule 4000, not below it' },
      {
        id: 'b',
        text: 'Rule 200 matches first - 203.0.113.10 is part of the Internet service tag - and processing stops',
      },
      { id: 'c', text: 'The DenyAllInBound default rule at 65500 overrides every custom rule' },
      {
        id: 'd',
        text: 'Allow rules are always processed before deny rules, so this must be a NIC NSG issue',
      },
    ],
    correct: ['b'],
    explanation:
      'NSG rules are evaluated from the lowest priority number upward and the first match wins. The admin address is a public internet address, so rule 200 denies it before rule 300 is ever read. Fix it by giving the allow rule a lower number than 200. Default rules only apply if nothing matched earlier, and there is no "allow before deny" ordering.',
  },
  {
    id: 'az1q-net-10',
    domainId: 'az1-networking',
    topicId: 'az1-nsg-bastion',
    kind: 'mcq',
    category: 'troubleshoot',
    difficulty: 'advanced',
    points: 2,
    prompt:
      'VM1 has an NSG on its NIC that allows inbound TCP 443 from any source. Its subnet has an NSG with only the default rules. A client on the internet cannot reach VM1 on 443. What is the cause?',
    options: [
      {
        id: 'a',
        text: 'Nothing - the NIC NSG allows it, so the traffic must be blocked by the guest firewall',
      },
      {
        id: 'b',
        text: 'The subnet NSG default DenyAllInBound rule blocks it, because inbound traffic must be allowed by both NSGs',
      },
      { id: 'c', text: 'The NIC NSG overrides the subnet NSG, so only the NIC rules count' },
      { id: 'd', text: 'AllowVnetInBound in the subnet NSG blocks internet traffic explicitly' },
    ],
    correct: ['b'],
    explanation:
      'When NSGs are on both the subnet and the NIC, inbound traffic is evaluated by the subnet NSG first, then the NIC NSG, and it must be allowed by both. The subnet NSG has no allow rule for internet traffic on 443, so DenyAllInBound (65500) drops it. Neither NSG overrides the other. AllowVnetInBound allows VNet traffic; it does not deny anything.',
  },
  {
    id: 'az1q-net-11',
    domainId: 'az1-networking',
    topicId: 'az1-nsg-bastion',
    kind: 'multi',
    category: 'concept',
    difficulty: 'intermediate',
    points: 2,
    prompt:
      'You are deploying Azure Bastion so admins can reach private VMs from the portal and from their local SSH client with az network bastion ssh. Which statements are true? (Select all that apply.)',
    options: [
      { id: 'a', text: 'Bastion must be deployed into a subnet named exactly AzureBastionSubnet' },
      { id: 'b', text: 'The Bastion subnet must be at least /26' },
      { id: 'c', text: 'Native client support requires the Standard SKU or higher' },
      { id: 'd', text: 'The target VMs each need a public IP address' },
      { id: 'e', text: 'The Developer SKU supports native client connections and peered VNets' },
    ],
    correct: ['a', 'b', 'c'],
    explanation:
      'Bastion needs a dedicated subnet named AzureBastionSubnet, /26 or larger. Native client (az network bastion ssh or rdp) is a Standard or Premium feature. The whole point of Bastion is that target VMs need no public IP. The Developer SKU is a free, shared, portal-only option for a single VNet - no native client and no peered VNets.',
  },
  {
    id: 'az1q-net-12',
    domainId: 'az1-networking',
    topicId: 'az1-nsg-bastion',
    kind: 'mcq',
    category: 'concept',
    difficulty: 'intermediate',
    points: 2,
    prompt:
      'Web VMs and database VMs share one subnet and scale in and out often. You want a rule "only web servers may reach SQL on 1433 on the database servers" that does not need editing when IP addresses change. What should you use?',
    options: [
      { id: 'a', text: 'Application security groups as the source and destination of an NSG rule' },
      { id: 'b', text: 'The VirtualNetwork service tag as the source' },
      { id: 'c', text: 'A separate route table per tier' },
      { id: 'd', text: 'An NSG rule listing every current web server IP address' },
    ],
    correct: ['a'],
    explanation:
      'ASGs group NICs by role, and NSG rules can reference them instead of IPs: source asg-web, destination asg-db, port 1433. New VMs join by adding their NIC to the ASG. VirtualNetwork would let every VM in the VNet in. Route tables control paths, not permissions, and an IP list breaks every time the tier scales.',
  },
  {
    id: 'az1q-net-13',
    domainId: 'az1-networking',
    topicId: 'az1-nsg-bastion',
    kind: 'task',
    category: 'lab',
    difficulty: 'intermediate',
    points: 3,
    prompt:
      'In resource group rg-web, create an NSG named nsg-web that allows inbound HTTPS from the internet at priority 100 and denies all other inbound internet traffic at priority 4000, then associate it with subnet snet-web in VNet vnet-web.',
    context: 'An existing VNet vnet-web with subnet snet-web in rg-web. Cloud Shell (bash).',
    checkpoints: [
      { id: 'c1', text: 'nsg-web exists in rg-web' },
      {
        id: 'c2',
        text: 'An inbound Allow rule for TCP 443 from the Internet service tag has priority 100',
      },
      { id: 'c3', text: 'An inbound Deny rule for any protocol from Internet has priority 4000' },
      { id: 'c4', text: 'snet-web shows nsg-web as its network security group' },
    ],
    solution: [
      {
        title: 'Create, populate and associate the NSG',
        language: 'bash',
        code: `az network nsg create -g rg-web -n nsg-web

az network nsg rule create -g rg-web --nsg-name nsg-web -n allow-https \\
  --priority 100 --direction Inbound --access Allow --protocol Tcp \\
  --source-address-prefixes Internet --destination-port-ranges 443

az network nsg rule create -g rg-web --nsg-name nsg-web -n deny-internet \\
  --priority 4000 --direction Inbound --access Deny --protocol '*' \\
  --source-address-prefixes Internet --destination-port-ranges '*'

az network vnet subnet update -g rg-web --vnet-name vnet-web -n snet-web \\
  --network-security-group nsg-web

# Verify
az network nsg rule list -g rg-web --nsg-name nsg-web -o table
az network vnet subnet show -g rg-web --vnet-name vnet-web -n snet-web \\
  --query networkSecurityGroup.id -o tsv`,
      },
    ],
    explanation:
      'The allow rule has the lower number, so HTTPS matches before the broad deny. The deny at 4000 is technically redundant with DenyAllInBound, but it documents intent and still leaves the VNet and load balancer default allows in place because it only targets the Internet tag. An NSG does nothing until it is associated with a subnet or NIC.',
  },

  /* --------------------------------------------------- private endpoints */
  {
    id: 'az1q-net-14',
    domainId: 'az1-networking',
    topicId: 'az1-private-endpoints',
    kind: 'mcq',
    category: 'concept',
    difficulty: 'advanced',
    points: 2,
    prompt:
      'A storage account must be reachable from VMs in Azure AND from on-premises servers over ExpressRoute, using a private IP address, with public network access disabled. What should you use?',
    options: [
      { id: 'a', text: 'A service endpoint for Microsoft.Storage on the VM subnet' },
      {
        id: 'b',
        text: 'A private endpoint for the blob sub-resource, with private DNS resolution available to on-premises',
      },
      { id: 'c', text: 'A storage firewall rule allowing the on-premises public IP range' },
      { id: 'd', text: 'A service endpoint policy scoped to the storage account' },
    ],
    correct: ['b'],
    explanation:
      'A private endpoint gives the storage account a private IP inside your VNet, which on-premises can reach over ExpressRoute or VPN, and it keeps working with public access disabled. Service endpoints only optimise traffic from the enabled subnet and still target the public endpoint, so on-premises cannot use them. A firewall rule for public IPs needs public access enabled, and endpoint policies only filter service endpoint traffic.',
  },
  {
    id: 'az1q-net-15',
    domainId: 'az1-networking',
    topicId: 'az1-private-endpoints',
    kind: 'mcq',
    category: 'troubleshoot',
    difficulty: 'advanced',
    points: 2,
    prompt:
      'You created a private endpoint for stapp01 in vnet-app and a private DNS zone privatelink.blob.core.windows.net with the A record. VMs in vnet-app resolve stapp01.blob.core.windows.net to 10.0.2.5, but VMs in peered vnet-tools resolve it to a public IP. What is missing?',
    options: [
      { id: 'a', text: 'A second private endpoint in vnet-tools' },
      { id: 'b', text: 'A virtual network link from the private DNS zone to vnet-tools' },
      { id: 'c', text: 'Gateway transit on the peering' },
      { id: 'd', text: 'A service endpoint for Microsoft.Storage in vnet-tools' },
    ],
    correct: ['b'],
    explanation:
      'A private DNS zone only answers for VNets it is linked to. Peering carries packets, not DNS zone visibility, so vnet-tools falls back to public resolution. Link the zone to vnet-tools (or to the VNet hosting a central DNS resolver). A second endpoint is unnecessary because peered VNets can reach 10.0.2.5 already. Gateway transit and service endpoints do not affect name resolution.',
  },
  {
    id: 'az1q-net-16',
    domainId: 'az1-networking',
    topicId: 'az1-private-endpoints',
    kind: 'multi',
    category: 'concept',
    difficulty: 'intermediate',
    points: 2,
    prompt:
      'Which statements correctly compare service endpoints and private endpoints? (Select all that apply.)',
    options: [
      { id: 'a', text: 'A private endpoint is a NIC with a private IP from your subnet' },
      {
        id: 'b',
        text: 'Service endpoints are enabled per subnet and per service, and the service still has a public IP',
      },
      { id: 'c', text: 'Service endpoints require a private DNS zone to work' },
      {
        id: 'd',
        text: 'A private endpoint maps to one specific resource, which limits data exfiltration to other accounts',
      },
      { id: 'e', text: 'Service endpoints can be used directly from on-premises networks' },
    ],
    correct: ['a', 'b', 'd'],
    explanation:
      'A private endpoint is a NIC in your subnet connected to one specific resource, so it cannot be used to reach someone else’s storage account. Service endpoints are enabled on a subnet for a service type, and traffic still targets the service public endpoint over the Microsoft backbone - no DNS changes needed. They only apply to traffic that originates in the enabled subnet, so on-premises cannot use them.',
  },

  /* ---------------------------------------------- DNS & load balancing */
  {
    id: 'az1q-net-17',
    domainId: 'az1-networking',
    topicId: 'az1-dns-load-balancing',
    kind: 'mcq',
    category: 'concept',
    difficulty: 'intermediate',
    points: 2,
    prompt:
      'A web app is deployed in East US and West Europe. You need a single global entry point that routes users to the closest healthy region, terminates TLS, applies a WAF and caches static content. Which service fits best?',
    options: [
      { id: 'a', text: 'Azure Load Balancer (Standard, cross-region)' },
      { id: 'b', text: 'Application Gateway with WAF' },
      { id: 'c', text: 'Azure Front Door' },
      { id: 'd', text: 'Traffic Manager with performance routing' },
    ],
    correct: ['c'],
    explanation:
      'Front Door is global, layer 7, with TLS termination, WAF and caching at the edge. Load Balancer is layer 4 and cannot inspect HTTP. Application Gateway is layer 7 with WAF but regional. Traffic Manager is global but DNS-based - it only hands out an endpoint address and never sees the traffic, so it cannot terminate TLS or cache.',
  },
  {
    id: 'az1q-net-18',
    domainId: 'az1-networking',
    topicId: 'az1-dns-load-balancing',
    kind: 'mcq',
    category: 'troubleshoot',
    difficulty: 'intermediate',
    points: 2,
    prompt:
      'A Standard public load balancer has a health probe on TCP 80. Both backend VMs run a working web server, but the portal shows them as unhealthy. The backend subnet NSG has a custom inbound rule at priority 100 denying all traffic from Any source. What should you change?',
    options: [
      {
        id: 'a',
        text: 'Add a rule with a priority lower than 100 allowing the AzureLoadBalancer service tag on port 80',
      },
      { id: 'b', text: 'Switch the probe to HTTPS' },
      { id: 'c', text: 'Move the VMs to an availability set' },
      { id: 'd', text: 'Nothing - AllowAzureLoadBalancerInBound at 65001 always allows probes' },
    ],
    correct: ['a'],
    explanation:
      'Probes come from 168.63.129.16, represented by the AzureLoadBalancer service tag. The default AllowAzureLoadBalancerInBound rule sits at 65001, so a custom deny at 100 blocks probes first. Allow the tag at a lower number (and allow the client traffic too). Changing the probe protocol or availability options does not get past the NSG.',
  },
  {
    id: 'az1q-net-19',
    domainId: 'az1-networking',
    topicId: 'az1-dns-load-balancing',
    kind: 'multi',
    category: 'concept',
    difficulty: 'intermediate',
    points: 2,
    prompt:
      'You host contoso.com in an Azure DNS public zone. Which statements are true? (Select all that apply.)',
    options: [
      {
        id: 'a',
        text: 'The domain registrar must be updated with the Azure DNS name servers for the zone',
      },
      {
        id: 'b',
        text: 'An alias record at the zone apex can point to a public IP or Front Door and tracks changes automatically',
      },
      { id: 'c', text: 'A CNAME record can be created at the zone apex (contoso.com itself)' },
      {
        id: 'd',
        text: 'To delegate dev.contoso.com to another zone, you create NS records for dev in the parent zone',
      },
      { id: 'e', text: 'Azure DNS public zones can also register domain names for you' },
    ],
    correct: ['a', 'b', 'd'],
    explanation:
      'Delegation from the registrar to the four Azure DNS name servers makes the zone authoritative, and child zones are delegated with NS records in the parent. Alias records solve the apex problem because DNS forbids a CNAME at the apex. Azure DNS hosts zones but is not a registrar.',
  },
]
