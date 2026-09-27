import type { Topic } from '../../../types'

export const networkingServices: Topic = {
  id: 'az9-networking-services',
  title: 'Networking: VNets, hybrid connectivity, DNS and endpoints',
  domainId: 'az9-architecture',
  difficulty: 'intermediate',
  estimatedMinutes: 30,
  order: 3,
  tags: [
    'virtual network',
    'subnets',
    'peering',
    'vpn gateway',
    'expressroute',
    'azure dns',
    'private endpoint',
  ],
  oneLiner:
    'How Azure resources talk to each other, to the internet and to your on-premises network, and how DNS and endpoints control who can reach them.',
  explanation: [
    'An **Azure Virtual Network (VNet)** is your private network in Azure. You give it an address space such as 10.0.0.0/16 and divide it into **subnets**. Resources such as VMs get private IP addresses from a subnet, and by default everything inside one VNet can talk to everything else in it.',
    'VNets are isolated from each other until you connect them. **VNet peering** links two VNets so traffic flows privately over the Microsoft backbone network; it works within a region and across regions (global peering). Peering is **not transitive**: if A is peered to B and B to C, A cannot reach C unless you add a peering or routing for it.',
    'To connect Azure to your own datacenter you have two main choices. A **VPN Gateway** sends encrypted traffic over the public internet, either from a whole site (site-to-site) or from individual computers (point-to-site). **ExpressRoute** is a private connection through a connectivity provider that does not travel over the public internet, giving more predictable speed and latency.',
    '**Azure DNS** hosts DNS zones on Microsoft infrastructure so you can manage records with the same tools and access control as other resources, and private DNS zones resolve names inside your VNets. Finally, services such as storage and SQL are reached through a **public endpoint** by default; a **private endpoint** gives that service a private IP address inside your VNet using Azure Private Link, so traffic never needs to leave your private network.',
  ],
  whyItMatters: [
    'The exam checks that you can match a connectivity need to a service: encrypted over the internet points to VPN Gateway, private and dedicated points to ExpressRoute, connect two VNets points to peering, hosting DNS records points to Azure DNS.',
    'Public versus private endpoints is a core security decision. Many data leaks come from storage or databases that were reachable from the whole internet when only one application needed them.',
    'Networking choices are hard to change later. Overlapping address spaces, for example, block peering and hybrid connections, so planning IP ranges up front saves a painful re-addressing project.',
  ],
  howItWorks: [
    'You create a VNet in one region and subscription with one or more address ranges, then carve subnets out of it. Azure reserves a few addresses in every subnet for its own use.',
    '**Network security groups (NSGs)** attach to subnets or network interfaces and allow or deny traffic by source, destination, port and protocol. They are the basic firewall of a VNet.',
    'Peering is created in both directions (one link on each VNet). After that, VMs in the two VNets reach each other by private IP with low latency, and no gateway is needed.',
    'A VPN Gateway is deployed into a dedicated subnet named GatewaySubnet. It creates an IPsec/IKE tunnel to an on-premises VPN device (site-to-site) or accepts connections from client computers (point-to-site). Active-active or zone-redundant gateways improve availability.',
    'ExpressRoute works through a **circuit** provisioned with a connectivity provider at a peering location. It supports private peering to VNets and Microsoft peering to Microsoft 365 and public Azure services, and ExpressRoute Global Reach can link on-premises sites to each other through Microsoft.',
    'Azure DNS hosts zones you already own; you point your registrar at the Azure name servers. It does not sell domain names itself. **Private endpoints** place a network interface with a private IP from your subnet in front of one specific service instance, and you usually pair them with a private DNS zone so the normal service name resolves to that private IP.',
  ],
  diagrams: [
    {
      kind: 'decision',
      title: 'Connecting on-premises to Azure',
      caption:
        'Both options reach your VNets. The difference is the path: the public internet with encryption, or a private provider circuit.',
      question: 'How should on-premises reach Azure?',
      branches: [
        {
          condition: 'One laptop or a few remote users',
          result: 'Point-to-site VPN',
          detail: 'Client software, encrypted over internet',
        },
        {
          condition: 'A whole office, internet path is fine',
          result: 'Site-to-site VPN Gateway',
          detail: 'IPsec tunnel to your VPN device',
          tone: 'accent',
        },
        {
          condition: 'Private, predictable, high bandwidth',
          result: 'ExpressRoute',
          detail: 'Provider circuit, not over the internet',
          tone: 'success',
        },
      ],
    },
    {
      kind: 'sequence',
      title: 'Reaching storage through a private endpoint',
      caption:
        'The app keeps using the normal storage name. Private DNS returns a private IP, so the traffic stays inside the VNet.',
      participants: [
        { id: 'vm', label: 'App VM in VNet' },
        { id: 'dns', label: 'Private DNS zone' },
        { id: 'pe', label: 'Private endpoint' },
        { id: 'st', label: 'Storage account' },
      ],
      messages: [
        { from: 'vm', to: 'dns', label: 'Resolve mystore.blob.core.windows.net' },
        { from: 'dns', to: 'vm', label: 'Private IP 10.0.2.5', kind: 'return' },
        { from: 'vm', to: 'pe', label: 'HTTPS to 10.0.2.5' },
        { from: 'pe', to: 'st', label: 'Private Link to the account' },
        { from: 'st', to: 'vm', label: 'Blob data', kind: 'return' },
      ],
    },
  ],
  keyObjects: [
    {
      kind: 'Virtual network (Microsoft.Network/virtualNetworks)',
      apiVersion: '2024-05-01',
      purpose: 'A private, isolated network in one region, divided into subnets.',
      fields: [
        {
          path: 'properties.addressSpace.addressPrefixes',
          meaning: 'CIDR ranges such as 10.0.0.0/16.',
          required: true,
        },
        {
          path: 'properties.subnets[].properties.addressPrefix',
          meaning: 'Each subnet range, inside the address space.',
        },
        {
          path: 'properties.subnets[].properties.networkSecurityGroup',
          meaning: 'An NSG filtering the subnet.',
        },
        { path: 'properties.virtualNetworkPeerings', meaning: 'Peering links to other VNets.' },
      ],
    },
    {
      kind: 'VPN gateway (Microsoft.Network/virtualNetworkGateways)',
      purpose:
        'Encrypted connectivity to on-premises sites, clients or other VNets over the internet.',
      fields: [
        { path: 'properties.gatewayType', meaning: 'Vpn or ExpressRoute.' },
        { path: 'properties.vpnType', meaning: 'RouteBased (most common) or PolicyBased.' },
        { path: 'properties.sku.name', meaning: 'Sets throughput and features, e.g. VpnGw1AZ.' },
      ],
    },
    {
      kind: 'ExpressRoute circuit (Microsoft.Network/expressRouteCircuits)',
      purpose: 'A private connection to Microsoft through a connectivity provider.',
      fields: [
        {
          path: 'properties.serviceProviderProperties.bandwidthInMbps',
          meaning: 'Circuit bandwidth.',
        },
        {
          path: 'properties.serviceProviderProperties.peeringLocation',
          meaning: 'Where the provider meets Microsoft.',
        },
        { path: 'sku.tier', meaning: 'Standard, Premium or Local, which affects reach and price.' },
      ],
    },
    {
      kind: 'Private endpoint (Microsoft.Network/privateEndpoints)',
      purpose:
        'A private IP in your subnet that maps to one instance of a PaaS service through Private Link.',
      fields: [
        { path: 'properties.subnet.id', meaning: 'The subnet the private IP comes from.' },
        {
          path: 'properties.privateLinkServiceConnections[].properties.groupIds',
          meaning: 'Which sub-resource, e.g. blob.',
        },
      ],
    },
    {
      kind: 'DNS zone (Microsoft.Network/dnsZones and privateDnsZones)',
      purpose: 'Hosts DNS records for a domain, publicly or only inside linked VNets.',
      fields: [
        { path: 'name', meaning: 'The domain, e.g. contoso.com.' },
        { path: 'properties.nameServers', meaning: 'Azure name servers to set at your registrar.' },
      ],
    },
  ],
  realWorldExample: {
    title: 'From a VPN to ExpressRoute, and locking down the database',
    story: [
      'A logistics company started its Azure journey with a site-to-site VPN from head office. It was quick to set up and cheap, and it carried the first few applications comfortably.',
      'As more systems moved, nightly data transfers began to suffer from internet congestion. They ordered an ExpressRoute circuit from their network provider, which gave them a private, consistent link, and kept the VPN as a backup path.',
      'An audit then found the Azure SQL database accepted connections from its public endpoint. They added a private endpoint in the application subnet, linked the private DNS zone, and disabled public network access, so only traffic from their own networks could reach it.',
    ],
  },
  yamlExamples: [
    {
      title: 'A VNet with two subnets in Bicep',
      language: 'bicep',
      code: `param location string = resourceGroup().location

resource vnet 'Microsoft.Network/virtualNetworks@2024-05-01' = {
  name: 'vnet-hub'
  location: location
  properties: {
    addressSpace: {
      addressPrefixes: [
        '10.0.0.0/16'
      ]
    }
    subnets: [
      {
        name: 'snet-app'
        properties: { addressPrefix: '10.0.1.0/24' }
      }
      {
        name: 'snet-data'
        properties: { addressPrefix: '10.0.2.0/24' }
      }
    ]
  }
}`,
    },
    {
      title: 'A public DNS zone with an A record',
      language: 'bicep',
      explanation:
        'You still buy the domain from a registrar, then delegate it to the name servers Azure returns.',
      code: `resource zone 'Microsoft.Network/dnsZones@2018-05-01' = {
  name: 'contoso-learn.com'
  location: 'global'
}

resource www 'Microsoft.Network/dnsZones/A@2018-05-01' = {
  parent: zone
  name: 'www'
  properties: {
    TTL: 3600
    ARecords: [
      { ipv4Address: '203.0.113.10' }
    ]
  }
}`,
    },
  ],
  imperative: [
    {
      command:
        'az network vnet create --resource-group rg-az900-net --name vnet-a --address-prefixes 10.1.0.0/16 --subnet-name snet-app --subnet-prefixes 10.1.1.0/24',
      what: 'Creates a VNet with one subnet.',
      expected: '"provisioningState": "Succeeded"',
    },
    {
      command:
        'az network vnet peering create --resource-group rg-az900-net --name a-to-b --vnet-name vnet-a --remote-vnet vnet-b --allow-vnet-access',
      what: 'Creates one side of a peering. Run the mirror command on vnet-b to complete it.',
      expected: 'peeringState Initiated, then Connected once both sides exist.',
    },
    {
      command: 'az network dns zone create --resource-group rg-az900-net --name contoso-learn.com',
      what: 'Creates a public DNS zone and returns the Azure name servers.',
    },
    {
      command:
        'az network private-endpoint create --resource-group rg-az900-net --name pe-blob --vnet-name vnet-a --subnet snet-app --private-connection-resource-id <storage-account-id> --group-id blob --connection-name pe-blob-conn',
      what: 'Creates a private endpoint for the blob service of a storage account.',
      placeholders: ['<storage-account-id>'],
    },
  ],
  declarative: {
    steps: [
      'Plan non-overlapping address spaces for every VNet and every on-premises network.',
      'Describe VNets and subnets in Bicep, with an NSG per subnet if needed.',
      'Add peerings as child resources of each VNet, one per direction.',
      'Deploy with az deployment group create and verify peering state is Connected.',
    ],
    code: [
      {
        title: 'Peering from vnet-a to vnet-b in Bicep',
        language: 'bicep',
        code: `resource vnetA 'Microsoft.Network/virtualNetworks@2024-05-01' existing = {
  name: 'vnet-a'
}

resource vnetB 'Microsoft.Network/virtualNetworks@2024-05-01' existing = {
  name: 'vnet-b'
}

resource aToB 'Microsoft.Network/virtualNetworks/virtualNetworkPeerings@2024-05-01' = {
  parent: vnetA
  name: 'a-to-b'
  properties: {
    remoteVirtualNetwork: { id: vnetB.id }
    allowVirtualNetworkAccess: true
    allowForwardedTraffic: false
  }
}`,
      },
    ],
  },
  verification: [
    {
      command: 'az network vnet list --resource-group rg-az900-net --output table',
      what: 'Lists VNets and their address spaces.',
    },
    {
      command:
        'az network vnet peering list --resource-group rg-az900-net --vnet-name vnet-a --output table',
      what: 'Shows peering status for vnet-a.',
      expected: 'PeeringState Connected.',
    },
    {
      command: 'nslookup <account>.blob.core.windows.net',
      what: 'From a VM in the VNet, confirms the name resolves to a private IP when a private endpoint and private DNS zone are in place.',
      expected: 'An address in 10.x.x.x via privatelink.blob.core.windows.net.',
      placeholders: ['<account>'],
    },
  ],
  troubleshooting: [
    {
      command:
        'az network vnet peering show --resource-group rg-az900-net --vnet-name vnet-a --name a-to-b --query peeringState',
      what: 'Initiated means the other side of the peering has not been created yet.',
      expected: '"Connected" once both directions exist.',
    },
    {
      command: 'az network nic list-effective-nsg --resource-group rg-az900-net --name <nic-name>',
      what: 'Shows the combined NSG rules applying to a VM network interface when traffic is blocked.',
      placeholders: ['<nic-name>'],
    },
    {
      command:
        'az network dns zone show --resource-group rg-az900-net --name contoso-learn.com --query nameServers',
      what: 'Gets the name servers you must configure at the domain registrar if public resolution fails.',
    },
  ],
  commonMistakes: [
    'Assuming peering is transitive. A hub peered to two spokes does not let the spokes talk to each other by default.',
    'Believing ExpressRoute traffic crosses the public internet. It uses a private provider connection.',
    'Thinking Azure DNS lets you buy domain names. It hosts zones; you purchase the domain elsewhere (or via App Service domains).',
    'Using overlapping address ranges, which makes peering and VPN connections impossible.',
    'Creating a private endpoint but leaving public network access enabled on the service, so the internet path remains open.',
  ],
  examTips: [
    'VPN Gateway: encrypted, over the public internet, site-to-site, point-to-site or VNet-to-VNet.',
    'ExpressRoute: private connection via a connectivity provider, not over the internet, higher reliability and predictable latency.',
    'VNet peering connects VNets over the Microsoft backbone, in the same or different regions, and is not transitive.',
    'Public endpoint: reachable by a public address. Private endpoint: a private IP in your VNet for a specific service instance.',
    'Azure DNS hosts DNS domains and supports private zones for name resolution inside VNets.',
  ],
  summary: [
    'VNets and subnets provide private networking; NSGs filter traffic.',
    'Peering connects VNets privately and is not transitive.',
    'VPN Gateway encrypts traffic over the internet; ExpressRoute is a private provider circuit.',
    'Azure DNS hosts public and private DNS zones.',
    'Private endpoints bring PaaS services into your VNet with a private IP.',
  ],
  practice: [
    {
      id: 'az9-networking-services-p1',
      level: 'beginner',
      prompt:
        'A company needs a connection from its datacenter to Azure that does not travel over the public internet. Which service fits?',
      answer:
        'Azure ExpressRoute, which uses a private connection through a connectivity provider.',
    },
    {
      id: 'az9-networking-services-p2',
      level: 'intermediate',
      prompt:
        'VNet A is peered with VNet B, and VNet B is peered with VNet C. Can a VM in A reach a VM in C by private IP with no other configuration?',
      answer:
        'No. Peering is not transitive, so A needs its own peering to C or a routed hub design with a gateway or firewall.',
    },
    {
      id: 'az9-networking-services-p3',
      level: 'intermediate',
      prompt:
        'Several salespeople need to connect laptops to an Azure VNet from hotels. Which VPN Gateway connection type suits them?',
      answer:
        'Point-to-site VPN, which connects individual client computers rather than a whole site.',
    },
    {
      id: 'az9-networking-services-p4',
      level: 'advanced',
      prompt: 'Why do private endpoints usually need a private DNS zone as well?',
      answer:
        'So that the service’s normal name, such as account.blob.core.windows.net, resolves to the private endpoint IP inside the VNet instead of the public IP.',
    },
  ],
  lab: {
    title: 'Build and peer two VNets',
    scenario:
      'Create two VNets with non-overlapping ranges, peer them in both directions, and create a public DNS zone to see the name servers Azure provides.',
    prerequisites: ['An Azure subscription', 'Azure Cloud Shell (Bash)'],
    tasks: [
      { instruction: 'Create resource group rg-az900-net.' },
      {
        instruction:
          'Create vnet-a (10.1.0.0/16) and vnet-b (10.2.0.0/16), each with one /24 subnet.',
      },
      {
        instruction: 'Peer vnet-a to vnet-b and vnet-b to vnet-a.',
        hint: 'Peering needs a link on each side before it shows Connected.',
      },
      { instruction: 'Check that both peerings report Connected.' },
      { instruction: 'Create a DNS zone called contoso-learn.com and list its name servers.' },
    ],
    solution: [
      {
        title: 'VNets, peering and DNS',
        language: 'bash',
        code: `az group create -n rg-az900-net -l westeurope

az network vnet create -g rg-az900-net -n vnet-a \\
  --address-prefixes 10.1.0.0/16 --subnet-name snet-app --subnet-prefixes 10.1.1.0/24
az network vnet create -g rg-az900-net -n vnet-b \\
  --address-prefixes 10.2.0.0/16 --subnet-name snet-app --subnet-prefixes 10.2.1.0/24

az network vnet peering create -g rg-az900-net -n a-to-b \\
  --vnet-name vnet-a --remote-vnet vnet-b --allow-vnet-access
az network vnet peering create -g rg-az900-net -n b-to-a \\
  --vnet-name vnet-b --remote-vnet vnet-a --allow-vnet-access

az network dns zone create -g rg-az900-net -n contoso-learn.com
az network dns zone show -g rg-az900-net -n contoso-learn.com --query nameServers`,
      },
    ],
    verification: [
      {
        command:
          'az network vnet peering list -g rg-az900-net --vnet-name vnet-b --query "[].peeringState" -o tsv',
        what: 'Confirms the peering is connected from vnet-b.',
        expected: 'Connected',
      },
      {
        command: 'az network dns zone list -g rg-az900-net -o table',
        what: 'Shows the DNS zone and its record set count.',
      },
    ],
    cleanup: [
      {
        command: 'az group delete -n rg-az900-net --yes --no-wait',
        what: 'Deletes the VNets, peerings and DNS zone.',
      },
    ],
  },
  relatedTopicIds: ['az9-core-architecture', 'az9-compute-services', 'az9-identity-security'],
  docs: [
    {
      title: 'What is Azure Virtual Network?',
      url: 'https://learn.microsoft.com/azure/virtual-network/virtual-networks-overview',
    },
    {
      title: 'Virtual network peering',
      url: 'https://learn.microsoft.com/azure/virtual-network/virtual-network-peering-overview',
    },
    {
      title: 'What is VPN Gateway?',
      url: 'https://learn.microsoft.com/azure/vpn-gateway/vpn-gateway-about-vpngateways',
    },
    {
      title: 'What is Azure ExpressRoute?',
      url: 'https://learn.microsoft.com/azure/expressroute/expressroute-introduction',
    },
    {
      title: 'What is a private endpoint?',
      url: 'https://learn.microsoft.com/azure/private-link/private-endpoint-overview',
    },
  ],
}
