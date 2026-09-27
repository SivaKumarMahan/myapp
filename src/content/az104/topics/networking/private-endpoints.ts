import type { Topic } from '../../../types'

export const privateEndpoints: Topic = {
  id: 'az1-private-endpoints',
  title: 'Service endpoints, private endpoints and Private Link',
  domainId: 'az1-networking',
  difficulty: 'advanced',
  estimatedMinutes: 40,
  order: 4,
  tags: [
    'service-endpoints',
    'private-endpoints',
    'private-link',
    'private-dns',
    'dns-resolver',
    'az-104',
  ],
  oneLiner:
    'Reach PaaS services such as Storage and SQL privately from your VNet, either by extending the subnet identity with service endpoints or by giving the service a private IP with a private endpoint.',
  explanation: [
    'By default a PaaS service such as a storage account has a public endpoint: `mystorage.blob.core.windows.net` resolves to a public IP and anyone on the internet can try to connect. Azure gives you two ways to keep traffic from your virtual network private, and AZ-104 expects you to know the difference.',
    'A **service endpoint** is a setting on a subnet (for example `Microsoft.Storage`). Traffic from that subnet to the service travels over the Microsoft backbone and arrives carrying the identity of your VNet and subnet. The service still has a public IP, but its firewall can now say "allow only this subnet". A **service endpoint policy** narrows it further so the subnet can reach only specific storage accounts.',
    'A **private endpoint** is a network interface with a private IP from your subnet that is mapped to one specific resource (and one sub-resource, such as `blob` or `file`). Clients connect to that private IP, so the service is reachable from peered VNets and from on-premises over VPN or ExpressRoute. The technology behind it is **Azure Private Link**.',
    'Private endpoints only work well if DNS returns the private IP. Azure does this with **private DNS zones** such as `privatelink.blob.core.windows.net`, linked to your VNets, and a **DNS zone group** on the endpoint that keeps the A record up to date. Once private access works, you can **disable public network access** on the service so the public endpoint refuses everything.',
  ],
  whyItMatters: [
    'Many AZ-104 scenarios ask for the cheapest or simplest way to restrict a storage account to one subnet (service endpoint), or for access from on-premises or a peered VNet over a private IP (private endpoint). Picking the wrong one is the classic trap.',
    'DNS is where real private endpoint deployments break. A missing VNet link or an on-premises DNS server that cannot forward to Azure makes clients silently use the public endpoint, which then fails when public access is disabled.',
    'Data exfiltration controls matter to auditors. Service endpoint policies and per-resource private endpoints stop a compromised VM from copying data to an attacker-owned storage account over the same trusted path.',
  ],
  howItWorks: [
    'Service endpoint: enable `Microsoft.Storage` (or `Microsoft.Sql`, `Microsoft.KeyVault` and others) on a subnet. Azure adds optimised routes so traffic to that service stays on the backbone, and the source address seen by the service becomes the private IP of the VM plus the subnet identity. You then add a virtual network rule on the storage account firewall for that subnet.',
    'Service endpoints are per subnet and per service type, cost nothing extra, and do not extend to on-premises networks. Peered VNets need their own subnet rules. The service keeps its public IP, and DNS does not change.',
    'Service endpoint policy: attached to a subnet that already has the Microsoft.Storage service endpoint, it lists which storage accounts (or resource groups or subscriptions) the subnet may reach. Anything else is blocked, even if that other account would allow the traffic.',
    'Private endpoint: you create it in a subnet, pointing at a resource ID and a group ID (sub-resource) such as blob, file, queue, table, dfs or web for Storage, or sqlServer for Azure SQL. Azure allocates a private IP and creates a NIC. The connection may be auto-approved (you own the resource) or wait for manual approval by the resource owner.',
    'DNS: the public name gains a CNAME to the privatelink name, for example mystorage.blob.core.windows.net to mystorage.privatelink.blob.core.windows.net. A private DNS zone named privatelink.blob.core.windows.net, linked to the VNet, holds an A record pointing to the private IP. Clients in linked VNets using Azure-provided DNS (168.63.129.16) get the private IP; everyone else still resolves the public IP.',
    'A DNS zone group on the private endpoint ties it to one or more private DNS zones, so Azure creates and deletes the A record automatically with the endpoint. Without it you manage A records by hand.',
    'On-premises clients cannot query 168.63.129.16, which is only reachable from inside Azure. Deploy an Azure DNS Private Resolver inbound endpoint (or a DNS forwarder VM) in a VNet linked to the zone, and set a conditional forwarder on premises for blob.core.windows.net (the public zone, not the privatelink one) pointing to that inbound IP.',
    'Private Link service is the provider side: you place your own application behind a Standard Load Balancer and publish it as a Private Link service. Consumers in other tenants or VNets create private endpoints to it, and you approve or reject each connection.',
  ],
  diagrams: [
    {
      kind: 'decision',
      title: 'Service endpoint or private endpoint?',
      caption:
        'Service endpoints secure a subnet to a public service endpoint. Private endpoints give the service a private IP that any connected network can reach.',
      question: 'Where must the traffic come from?',
      branches: [
        {
          condition: 'one or two subnets in the same VNet',
          result: 'Service endpoint',
          detail: 'Free, subnet setting plus a firewall VNet rule',
        },
        {
          condition: 'peered VNets or on-premises via VPN/ER',
          result: 'Private endpoint',
          detail: 'Private IP in your subnet, needs private DNS',
          tone: 'accent',
        },
        {
          condition: 'only approved storage accounts',
          result: 'Service endpoint policy',
          detail: 'Blocks exfiltration to other accounts',
          tone: 'warning',
        },
        {
          condition: 'publishing your own app to consumers',
          result: 'Private Link service',
          detail: 'Behind a Standard Load Balancer',
        },
      ],
    },
    {
      kind: 'sequence',
      title: 'How a VM resolves a private endpoint',
      caption:
        'The public name is kept; a CNAME to the privatelink zone plus a linked private DNS zone returns the private IP instead of the public one.',
      participants: [
        { id: 'vm', label: 'VM in linked VNet' },
        { id: 'azdns', label: 'Azure DNS 168.63.129.16' },
        { id: 'zone', label: 'Private DNS zone' },
        { id: 'pe', label: 'Private endpoint' },
      ],
      messages: [
        { from: 'vm', to: 'azdns', label: 'Resolve mystorage.blob.core.windows.net' },
        { from: 'azdns', to: 'zone', label: 'CNAME to privatelink name, look up A' },
        { from: 'zone', to: 'azdns', label: 'A record 10.20.2.4', kind: 'return' },
        { from: 'azdns', to: 'vm', label: '10.20.2.4', kind: 'return' },
        { from: 'vm', to: 'pe', label: 'HTTPS to 10.20.2.4, SNI is public name' },
      ],
    },
  ],
  keyObjects: [
    {
      kind: 'Private endpoint (Microsoft.Network/privateEndpoints)',
      apiVersion: '2023-11-01',
      purpose:
        'A NIC with a private IP in your subnet connected to one sub-resource of one Azure resource.',
      fields: [
        {
          path: 'properties.subnet.id',
          meaning: 'The subnet that provides the private IP.',
          required: true,
        },
        {
          path: 'properties.privateLinkServiceConnections[].properties.privateLinkServiceId',
          meaning: 'Resource ID of the target, for example a storage account.',
          required: true,
        },
        {
          path: 'properties.privateLinkServiceConnections[].properties.groupIds',
          meaning: 'Sub-resource: blob, file, queue, table, dfs, web, sqlServer, vault and so on.',
          required: true,
        },
        {
          path: 'properties.manualPrivateLinkServiceConnections',
          meaning: 'Used instead when the resource owner must approve the connection.',
        },
      ],
    },
    {
      kind: 'Private DNS zone and VNet link (Microsoft.Network/privateDnsZones)',
      apiVersion: '2020-06-01',
      purpose: 'Holds the privatelink A records and is linked to the VNets that must resolve them.',
      fields: [
        {
          path: 'name',
          meaning: 'Must be the service privatelink zone, e.g. privatelink.blob.core.windows.net.',
          required: true,
        },
        {
          path: 'virtualNetworkLinks[].properties.virtualNetwork.id',
          meaning: 'Each VNet that should resolve private IPs needs a link.',
        },
        {
          path: 'virtualNetworkLinks[].properties.registrationEnabled',
          meaning: 'Auto-registration of VM records. Keep false for privatelink zones.',
        },
      ],
    },
    {
      kind: 'DNS zone group (Microsoft.Network/privateEndpoints/privateDnsZoneGroups)',
      apiVersion: '2023-11-01',
      purpose:
        'Makes Azure manage the A record in the private DNS zone for the endpoint lifecycle.',
      fields: [
        {
          path: 'properties.privateDnsZoneConfigs[].properties.privateDnsZoneId',
          meaning: 'The private DNS zone that receives the A record.',
          required: true,
        },
      ],
    },
    {
      kind: 'Subnet service endpoints and policies',
      purpose:
        'Subnet-level settings that give the subnet an identity to a service and optionally restrict targets.',
      fields: [
        {
          path: 'properties.serviceEndpoints[].service',
          meaning: 'Service type such as Microsoft.Storage or Microsoft.Sql.',
        },
        {
          path: 'properties.serviceEndpointPolicies[].id',
          meaning: 'Policy listing which storage accounts the subnet may reach.',
        },
        {
          path: 'properties.privateEndpointNetworkPolicies',
          meaning: 'Enable to apply NSGs and UDRs to private endpoints in the subnet.',
        },
      ],
    },
  ],
  realWorldExample: {
    title: 'The private endpoint that only worked in Azure',
    story: [
      'A retailer moved order exports to a storage account, created a blob private endpoint, and disabled public network access. VMs in the hub VNet uploaded files fine. The on-premises ETL server failed with 403 errors the same afternoon.',
      'nslookup on the ETL server returned a public IP. The on-premises DNS servers forwarded everything to the internet, so the CNAME to privatelink was followed publicly and the public endpoint, now closed, answered with an authorisation failure.',
      'The network team deployed Azure DNS Private Resolver with an inbound endpoint in the hub VNet, which was already linked to privatelink.blob.core.windows.net. On premises they added a conditional forwarder for blob.core.windows.net pointing to the inbound endpoint IP.',
      'The next nslookup returned 10.20.2.4 and the export ran over ExpressRoute. The team added DNS checks to their private endpoint runbook, and replaced ad-hoc A records with DNS zone groups so records are cleaned up when endpoints are deleted.',
    ],
  },
  yamlExamples: [
    {
      title: 'Storage account with a blob private endpoint, DNS zone and zone group (Bicep)',
      language: 'bicep',
      explanation:
        'One file creates the zone, links it to the VNet, creates the endpoint, and attaches a zone group so the A record is managed for you. Public network access is disabled on the account.',
      code: `param location string = resourceGroup().location
param storageName string
param vnetId string
param peSubnetId string

resource st 'Microsoft.Storage/storageAccounts@2023-05-01' = {
  name: storageName
  location: location
  sku: { name: 'Standard_LRS' }
  kind: 'StorageV2'
  properties: {
    publicNetworkAccess: 'Disabled'
    minimumTlsVersion: 'TLS1_2'
    allowBlobPublicAccess: false
  }
}

resource zone 'Microsoft.Network/privateDnsZones@2020-06-01' = {
  name: 'privatelink.blob.\${environment().suffixes.storage}'
  location: 'global'
}

resource link 'Microsoft.Network/privateDnsZones/virtualNetworkLinks@2020-06-01' = {
  parent: zone
  name: 'link-hub'
  location: 'global'
  properties: {
    virtualNetwork: { id: vnetId }
    registrationEnabled: false
  }
}

resource pe 'Microsoft.Network/privateEndpoints@2023-11-01' = {
  name: 'pe-\${storageName}-blob'
  location: location
  properties: {
    subnet: { id: peSubnetId }
    privateLinkServiceConnections: [
      {
        name: 'blob'
        properties: {
          privateLinkServiceId: st.id
          groupIds: [ 'blob' ]
        }
      }
    ]
  }
}

resource zoneGroup 'Microsoft.Network/privateEndpoints/privateDnsZoneGroups@2023-11-01' = {
  parent: pe
  name: 'default'
  properties: {
    privateDnsZoneConfigs: [
      {
        name: 'blob'
        properties: { privateDnsZoneId: zone.id }
      }
    ]
  }
}`,
      placeholders: ['storageName', 'vnetId', 'peSubnetId'],
    },
    {
      title: 'Service endpoint plus storage firewall rule (Azure CLI)',
      language: 'bash',
      explanation:
        'The simpler, free option: the subnet gets an identity, and the storage firewall allows only that subnet. DNS does not change and the public IP remains.',
      code: `az network vnet subnet update -g <rg> --vnet-name vnet-hub -n snet-app \\
  --service-endpoints Microsoft.Storage

az storage account update -g <rg> -n <storage> --default-action Deny

az storage account network-rule add -g <rg> --account-name <storage> \\
  --vnet-name vnet-hub --subnet snet-app`,
      placeholders: ['<rg>', '<storage>'],
    },
  ],
  imperative: [
    {
      command:
        'az network private-endpoint create -g <rg> -n pe-blob --vnet-name vnet-hub --subnet snet-pe --private-connection-resource-id <storage-id> --group-id blob --connection-name pe-blob-conn',
      what: 'Creates a private endpoint NIC in snet-pe connected to the blob sub-resource of the storage account.',
      expected:
        '"provisioningState": "Succeeded" and a customDnsConfigs or ipConfigurations entry with a 10.x address.',
      placeholders: ['<rg>', '<storage-id>'],
    },
    {
      command: 'az network private-dns zone create -g <rg> -n privatelink.blob.core.windows.net',
      what: 'Creates the private DNS zone for blob private endpoints.',
      placeholders: ['<rg>'],
    },
    {
      command:
        'az network private-dns link vnet create -g <rg> --zone-name privatelink.blob.core.windows.net -n link-hub --virtual-network vnet-hub --registration-enabled false',
      what: 'Links the zone to the VNet so its resolvers can see the privatelink records.',
      placeholders: ['<rg>'],
    },
    {
      command:
        'az network private-endpoint dns-zone-group create -g <rg> --endpoint-name pe-blob -n default --private-dns-zone privatelink.blob.core.windows.net --zone-name blob',
      what: 'Attaches a DNS zone group so Azure writes and removes the A record automatically.',
      placeholders: ['<rg>'],
    },
    {
      command: 'az storage account update -g <rg> -n <storage> --public-network-access Disabled',
      what: 'Turns off the public endpoint entirely; only private endpoints can reach the account.',
      placeholders: ['<rg>', '<storage>'],
    },
    {
      command:
        'az network vnet subnet update -g <rg> --vnet-name vnet-hub -n snet-app --service-endpoints Microsoft.Storage',
      what: 'Enables the Microsoft.Storage service endpoint on a subnet.',
      placeholders: ['<rg>'],
    },
  ],
  declarative: {
    steps: [
      'Create or reference a VNet with a dedicated subnet for private endpoints.',
      'Declare the storage account with publicNetworkAccess set to Disabled.',
      'Declare the privatelink.blob zone using environment().suffixes.storage so it works in sovereign clouds.',
      'Link the zone to every VNet that must resolve the private IP, with registration disabled.',
      'Declare the private endpoint and a privateDnsZoneGroups child pointing at the zone.',
      'Deploy with az deployment group what-if, then az deployment group create.',
    ],
    code: [
      {
        title: 'Hub VNet with a private endpoint subnet and a service endpoint policy (Bicep)',
        language: 'bicep',
        explanation:
          'snet-app uses a service endpoint restricted by a policy to one storage account; snet-pe is reserved for private endpoints with network policies enabled so NSGs apply.',
        code: `param location string = resourceGroup().location
param allowedStorageId string

resource sep 'Microsoft.Network/serviceEndpointPolicies@2023-11-01' = {
  name: 'sep-allowed-storage'
  location: location
  properties: {
    serviceEndpointPolicyDefinitions: [
      {
        name: 'allow-one-account'
        properties: {
          service: 'Microsoft.Storage'
          serviceResources: [ allowedStorageId ]
        }
      }
    ]
  }
}

resource vnet 'Microsoft.Network/virtualNetworks@2023-11-01' = {
  name: 'vnet-hub'
  location: location
  properties: {
    addressSpace: { addressPrefixes: [ '10.20.0.0/16' ] }
    subnets: [
      {
        name: 'snet-app'
        properties: {
          addressPrefix: '10.20.1.0/24'
          serviceEndpoints: [ { service: 'Microsoft.Storage' } ]
          serviceEndpointPolicies: [ { id: sep.id } ]
        }
      }
      {
        name: 'snet-pe'
        properties: {
          addressPrefix: '10.20.2.0/24'
          privateEndpointNetworkPolicies: 'Enabled'
        }
      }
    ]
  }
}`,
        placeholders: ['allowedStorageId'],
      },
    ],
  },
  verification: [
    {
      command:
        'az vm run-command invoke -g <rg> -n <vm> --command-id RunShellScript --scripts "nslookup <storage>.blob.core.windows.net"',
      what: 'Resolves the storage name from inside the VNet without needing an SSH session.',
      expected:
        'An alias to <storage>.privatelink.blob.core.windows.net and an address such as 10.20.2.4.',
      placeholders: ['<rg>', '<vm>', '<storage>'],
    },
    {
      command:
        'az network private-dns record-set a list -g <rg> -z privatelink.blob.core.windows.net -o table',
      what: 'Shows the A records the DNS zone group created.',
      expected: 'A record named after the storage account with the private endpoint IP.',
      placeholders: ['<rg>'],
    },
    {
      command:
        'az network private-endpoint show -g <rg> -n pe-blob --query "privateLinkServiceConnections[0].privateLinkServiceConnectionState.status"',
      what: 'Checks the connection state of the private endpoint.',
      expected: '"Approved"',
      placeholders: ['<rg>'],
    },
  ],
  troubleshooting: [
    {
      command:
        'az network private-dns link vnet list -g <rg> -z privatelink.blob.core.windows.net -o table',
      what: 'If a VM resolves the public IP, check that its VNet (not just the hub) is linked to the zone.',
      placeholders: ['<rg>'],
    },
    {
      command:
        'az storage account show -g <rg> -n <storage> --query "{public:publicNetworkAccess, rules:networkRuleSet}"',
      what: 'Confirms whether public access is disabled and which VNet rules and IP rules exist.',
      placeholders: ['<rg>', '<storage>'],
    },
    {
      command: 'az network vnet show -g <rg> -n <vnet> --query "dhcpOptions.dnsServers"',
      what: 'A custom DNS server on the VNet bypasses the private zone unless it forwards to 168.63.129.16 or a Private Resolver.',
      expected: 'An empty list means Azure-provided DNS is in use.',
      placeholders: ['<rg>', '<vnet>'],
    },
  ],
  commonMistakes: [
    'Choosing a service endpoint when on-premises clients need access. Service endpoints do not extend over VPN or ExpressRoute; a private endpoint does.',
    'Creating the private endpoint but no private DNS zone, or forgetting the VNet link, so clients keep resolving the public IP.',
    'Changing application connection strings to the privatelink name. Keep using the normal public FQDN; the CNAME chain and private zone handle resolution and TLS stays valid.',
    'Pointing the on-premises conditional forwarder at 168.63.129.16. That address is reachable only from inside Azure; forward to a Private Resolver inbound endpoint or a forwarder VM in Azure.',
    'Creating one private endpoint for blob and expecting Azure Files to work. Each sub-resource (blob, file, queue, table, dfs) needs its own private endpoint and zone.',
    'Disabling public network access before private DNS works, and locking out every client at once.',
    'Assuming NSGs filter traffic to private endpoints by default. Network policies for private endpoints must be enabled on the subnet first.',
  ],
  examTips: [
    'Only from a subnet to a PaaS service, cheapest option: service endpoint plus a firewall VNet rule. From on-premises or a peered VNet over a private IP: private endpoint.',
    'Service endpoint policies restrict which storage accounts a subnet can reach and are the answer to data exfiltration questions with service endpoints.',
    'Know the zone names: privatelink.blob.core.windows.net, privatelink.file.core.windows.net, privatelink.database.windows.net, privatelink.vaultcore.azure.net.',
    'A private DNS zone only answers for VNets that are linked to it. Linking is the fix when one spoke resolves public and another resolves private.',
    'Private Link service is how you expose your own application privately to other tenants, and it requires a Standard Load Balancer.',
    'On-premises resolution needs Azure DNS Private Resolver (inbound endpoint) or a DNS forwarder in Azure, plus a conditional forwarder on premises.',
  ],
  summary: [
    'Service endpoints give a subnet an identity to a PaaS service over the backbone; the service keeps its public IP.',
    'Service endpoint policies limit which storage accounts a subnet may reach.',
    'Private endpoints put a private IP for one sub-resource into your subnet, reachable from peered and on-premises networks.',
    'Private DNS zones, VNet links and DNS zone groups make the normal FQDN resolve to the private IP.',
    'On-premises clients need a Private Resolver inbound endpoint or forwarder because 168.63.129.16 is Azure-only.',
    'Disable public network access once private access and DNS are verified.',
  ],
  practice: [
    {
      id: 'az1-private-endpoints-p1',
      level: 'intermediate',
      prompt:
        'VMs in one subnet must reach a storage account and nothing else may. There is no on-premises requirement and cost should be minimal. What do you configure?',
      answer:
        'Enable the Microsoft.Storage service endpoint on the subnet, add a VNet rule for that subnet on the storage firewall, and set the default action to Deny.',
      explanation:
        'Service endpoints are free and sufficient for same-VNet subnet access. A private endpoint would also work but adds cost and DNS configuration that the scenario does not need.',
    },
    {
      id: 'az1-private-endpoints-p2',
      level: 'intermediate',
      prompt:
        'You created a blob private endpoint in the hub VNet. VMs in the hub resolve 10.20.2.4, but VMs in a peered spoke resolve a public IP. Why, and what is the fix?',
      answer:
        'The privatelink.blob.core.windows.net zone is linked only to the hub VNet. Add a virtual network link from the zone to the spoke VNet.',
      explanation:
        'Peering carries traffic but not private DNS zone visibility. Each VNet using Azure-provided DNS needs its own link.',
    },
    {
      id: 'az1-private-endpoints-p3',
      level: 'advanced',
      prompt:
        'On-premises servers connected by ExpressRoute resolve the storage account to its public IP. What do you deploy and how do you configure on-premises DNS?',
      answer:
        'Deploy Azure DNS Private Resolver with an inbound endpoint in a VNet linked to the privatelink zone, then create a conditional forwarder on premises for blob.core.windows.net pointing at the inbound endpoint IP.',
      explanation:
        'On-premises servers cannot reach 168.63.129.16. Forwarding the public zone name lets the CNAME to privatelink be resolved inside Azure where the private zone is visible.',
    },
    {
      id: 'az1-private-endpoints-p4',
      level: 'advanced',
      prompt:
        'A subnet has the Microsoft.Storage service endpoint. Security wants to stop VMs from copying data to storage accounts outside the company. What do you add?',
      answer:
        'A service endpoint policy on that subnet that lists only the approved storage accounts (or their resource group or subscription).',
      explanation:
        'Without a policy, a service endpoint lets the subnet reach any storage account whose firewall accepts the traffic, including one an attacker owns.',
    },
  ],
  lab: {
    title: 'Private endpoint for Blob storage with private DNS',
    scenario:
      'Create a VNet with a VM, a storage account with public access disabled, and a blob private endpoint with a linked private DNS zone. Prove from the VM that the storage name resolves to a private IP.',
    prerequisites: [
      'An Azure subscription with rights to create networking, storage and VMs',
      'Azure CLI 2.60 or later, or Cloud Shell',
    ],
    tasks: [
      {
        instruction:
          'Create resource group rg-pe-lab and VNet vnet-pe (10.20.0.0/16) with subnets snet-app (10.20.1.0/24) and snet-pe (10.20.2.0/24).',
      },
      {
        instruction:
          'Create a StorageV2 account with a unique name, then create an Ubuntu VM in snet-app with no public IP.',
        hint: 'Append $RANDOM to the storage name for uniqueness.',
      },
      {
        instruction:
          'Run nslookup for the storage blob FQDN from the VM with az vm run-command and note the public IP.',
      },
      {
        instruction:
          'Create a blob private endpoint in snet-pe, the zone privatelink.blob.core.windows.net, a VNet link, and a DNS zone group.',
      },
      {
        instruction:
          'Repeat nslookup from the VM and confirm it now returns an address from 10.20.2.0/24.',
      },
      {
        instruction:
          'Disable public network access on the storage account and confirm the setting.',
      },
    ],
    solution: [
      {
        title: 'Network, storage and VM',
        language: 'bash',
        code: `RG=rg-pe-lab
LOC=westeurope
ST=stpelab$RANDOM

az group create -n $RG -l $LOC
az network vnet create -g $RG -n vnet-pe --address-prefixes 10.20.0.0/16 \\
  --subnet-name snet-app --subnet-prefixes 10.20.1.0/24
az network vnet subnet create -g $RG --vnet-name vnet-pe -n snet-pe \\
  --address-prefixes 10.20.2.0/24

az storage account create -g $RG -n $ST -l $LOC --sku Standard_LRS --kind StorageV2
az vm create -g $RG -n vm-app --image Ubuntu2204 --size Standard_B1s \\
  --vnet-name vnet-pe --subnet snet-app --public-ip-address "" \\
  --admin-username azureuser --generate-ssh-keys

az vm run-command invoke -g $RG -n vm-app --command-id RunShellScript \\
  --scripts "nslookup $ST.blob.core.windows.net"`,
      },
      {
        title: 'Private endpoint, zone, link and zone group',
        language: 'bash',
        code: `ST_ID=$(az storage account show -g $RG -n $ST --query id -o tsv)

az network private-endpoint create -g $RG -n pe-blob \\
  --vnet-name vnet-pe --subnet snet-pe \\
  --private-connection-resource-id $ST_ID \\
  --group-id blob --connection-name pe-blob-conn

az network private-dns zone create -g $RG -n privatelink.blob.core.windows.net
az network private-dns link vnet create -g $RG \\
  --zone-name privatelink.blob.core.windows.net -n link-pe \\
  --virtual-network vnet-pe --registration-enabled false
az network private-endpoint dns-zone-group create -g $RG \\
  --endpoint-name pe-blob -n default \\
  --private-dns-zone privatelink.blob.core.windows.net --zone-name blob

az vm run-command invoke -g $RG -n vm-app --command-id RunShellScript \\
  --scripts "nslookup $ST.blob.core.windows.net"

az storage account update -g $RG -n $ST --public-network-access Disabled`,
      },
    ],
    verification: [
      {
        command:
          'az network private-dns record-set a list -g rg-pe-lab -z privatelink.blob.core.windows.net --query "[].{name:name, ip:aRecords[0].ipv4Address}" -o table',
        what: 'Shows the A record the zone group created for the storage account.',
        expected: 'One row with the storage account name and an IP in 10.20.2.0/24.',
      },
      {
        command:
          'az storage account show -g rg-pe-lab -n <storage> --query publicNetworkAccess -o tsv',
        what: 'Confirms the public endpoint is disabled.',
        expected: 'Disabled',
        placeholders: ['<storage>'],
      },
    ],
    cleanup: [
      {
        command: 'az group delete -n rg-pe-lab --yes --no-wait',
        what: 'Deletes the VM, storage account, private endpoint, DNS zone and VNet.',
      },
    ],
  },
  relatedTopicIds: [
    'az1-vnets-peering',
    'az1-nsg-bastion',
    'az1-dns-load-balancing',
    'az1-storage-security',
  ],
  docs: [
    {
      title: 'Virtual network service endpoints',
      url: 'https://learn.microsoft.com/azure/virtual-network/virtual-network-service-endpoints-overview',
    },
    {
      title: 'Service endpoint policies',
      url: 'https://learn.microsoft.com/azure/virtual-network/virtual-network-service-endpoint-policies-overview',
    },
    {
      title: 'What is a private endpoint?',
      url: 'https://learn.microsoft.com/azure/private-link/private-endpoint-overview',
    },
    {
      title: 'Azure private endpoint DNS configuration',
      url: 'https://learn.microsoft.com/azure/private-link/private-endpoint-dns',
    },
    {
      title: 'What is Azure Private Link service?',
      url: 'https://learn.microsoft.com/azure/private-link/private-link-service-overview',
    },
    {
      title: 'What is Azure DNS Private Resolver?',
      url: 'https://learn.microsoft.com/azure/dns/dns-private-resolver-overview',
    },
  ],
}
