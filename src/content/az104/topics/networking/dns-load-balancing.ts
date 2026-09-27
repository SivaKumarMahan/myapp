import type { Topic } from '../../../types'

export const dnsLoadBalancing: Topic = {
  id: 'az1-dns-load-balancing',
  title: 'Azure DNS and load balancing',
  domainId: 'az1-networking',
  difficulty: 'intermediate',
  estimatedMinutes: 40,
  order: 5,
  tags: [
    'azure dns',
    'private dns',
    'load balancer',
    'health probe',
    'application gateway',
    'front door',
    'traffic manager',
  ],
  oneLiner:
    'Resolve names with public and private DNS zones, then spread traffic with a Standard Load Balancer or the right global or layer 7 service.',
  explanation: [
    '**Azure DNS** hosts DNS zones on Microsoft name servers. A **public DNS zone** (for example `contoso.com`) answers queries from the whole internet once the domain registrar points at the Azure name servers. A **private DNS zone** (for example `corp.contoso.internal`) answers only for virtual networks that you link to it, so internal names never leak to the internet.',
    'Inside a zone you create **record sets**: a name plus a type plus one or more values. `A` maps to an IPv4 address, `AAAA` to IPv6, `CNAME` points one name at another name, `MX` and `TXT` serve mail and verification, and `NS` delegates a child zone to other name servers. An **alias record** is an Azure extension that points an A, AAAA or CNAME record directly at an Azure resource such as a public IP, Front Door or Traffic Manager profile, and it updates automatically if the resource IP changes.',
    '**Azure Load Balancer** is a layer 4 (TCP/UDP) service that spreads flows across a **backend pool** of VMs or scale set instances. A **public** load balancer has a public IP on its frontend; an **internal** load balancer has a private IP from a subnet. The **Standard SKU** is the one to use: it is zone-aware, secure by default (closed until an NSG allows traffic) and has an SLA. The Basic SKU has been retired, so new designs and exam answers should assume Standard.',
    'Load Balancer is only one of four traffic distribution services. **Application Gateway** is a regional layer 7 (HTTP/HTTPS) load balancer with path-based routing, TLS termination and an optional **Web Application Firewall**. **Front Door** is a global layer 7 entry point with caching and WAF at the Microsoft edge. **Traffic Manager** is DNS-based global routing: it only answers DNS queries with the best endpoint and never touches the traffic itself.',
  ],
  whyItMatters: [
    'AZ-104 expects you to configure Azure DNS zones and records, link private zones to VNets, and configure and troubleshoot an internal or public load balancer. Scenario questions often ask which of the four load balancing services fits a set of requirements.',
    'Most "the site is down" incidents on a load balanced app are not the load balancer at all. They are health probes failing because an NSG or the guest firewall blocks the probe source, and the load balancer correctly stops sending traffic. Knowing that pattern saves hours.',
    'Private DNS zones are the glue behind private endpoints and multi-VNet name resolution. Without the right VNet links, a VM resolves a service to its public IP and the private design silently fails.',
  ],
  howItWorks: [
    'For a public zone, you create the zone in a resource group, Azure assigns four name servers (`ns1-xx.azure-dns.com` style), and you update the NS records at your registrar. To delegate a subdomain such as `dev.contoso.com`, create a child zone and add an `NS` record set named `dev` in the parent containing the child zone name servers.',
    'For a private zone, you create the zone and add a **virtual network link** for each VNet that should resolve it. A link can have **autoregistration** enabled: VMs in that VNet then get A records created and removed automatically. A VNet can have many resolution links but autoregistration in only one private zone at a time.',
    'A load balancer has a **frontend IP configuration** (public IP or private IP), one or more **backend pools** (NICs or IP addresses), **health probes** (TCP, HTTP or HTTPS on a port and path) and **load balancing rules** that map a frontend port to a backend port through a probe. The default distribution is a five-tuple hash; **session persistence** can switch it to client IP or client IP and protocol.',
    'Health probes originate from the Azure platform address `168.63.129.16`, represented in NSGs by the **AzureLoadBalancer** service tag. The default NSG rule `AllowAzureLoadBalancerInBound` permits it; if you add a higher priority deny that blocks it, or the guest OS firewall blocks the probe port, every instance is marked unhealthy.',
    '**Inbound NAT rules** forward a specific frontend port (or a port range for a whole pool) to a single backend instance, for example port 50001 to VM1 port 22. **Outbound rules** control SNAT for backend instances reaching the internet through the load balancer public IP; for serious outbound needs, a NAT gateway on the subnet is usually the better answer.',
    'A Standard public load balancer and Standard public IPs are closed by default. Traffic flows only if an NSG on the subnet or NIC allows it, which is a frequent reason a freshly built lab returns nothing.',
  ],
  diagrams: [
    {
      kind: 'flow',
      title: 'A request through a public Standard Load Balancer',
      caption:
        'Name resolution happens first; the load balancer then only forwards flows to instances whose health probe is passing.',
      nodes: [
        {
          label: 'Client resolves www.contoso.com',
          detail: 'Azure DNS alias record to the public IP',
          tone: 'accent',
        },
        {
          label: 'Frontend public IP',
          detail: 'Standard SKU, zone-redundant',
          arrowLabel: 'TCP 80',
        },
        {
          label: 'Load balancing rule',
          detail: 'Frontend 80 to backend 80, five-tuple hash',
        },
        {
          label: 'Health probe check',
          detail: 'Probe from 168.63.129.16 on HTTP /health',
          branch: {
            label: 'Probe fails',
            detail: 'Instance removed from rotation',
            tone: 'danger',
          },
        },
        {
          label: 'Healthy backend VM answers',
          detail: 'NSG must allow client and probe traffic',
          tone: 'success',
        },
      ],
    },
    {
      kind: 'decision',
      title: 'Which load balancing service should I pick?',
      caption:
        'Split on two questions: is the traffic HTTP(S) or any TCP/UDP, and is it regional or global?',
      question: 'What traffic and scope do you need to balance?',
      branches: [
        {
          condition: 'Any TCP/UDP within one region',
          result: 'Azure Load Balancer',
          detail: 'Layer 4, public or internal, very low latency',
          tone: 'accent',
        },
        {
          condition: 'HTTP(S) in one region, WAF or paths',
          result: 'Application Gateway',
          detail: 'Layer 7, TLS offload, URL routing, WAF',
        },
        {
          condition: 'HTTP(S) global with edge caching',
          result: 'Azure Front Door',
          detail: 'Layer 7 at the edge, WAF, fast failover',
        },
        {
          condition: 'Any protocol, global, DNS level only',
          result: 'Traffic Manager',
          detail: 'Returns the best endpoint in DNS answers',
          tone: 'warning',
        },
      ],
    },
  ],
  keyObjects: [
    {
      kind: 'DNS zone (Microsoft.Network/dnsZones)',
      apiVersion: '2018-05-01',
      purpose: 'A public zone hosted on Azure name servers and resolvable from the internet.',
      fields: [
        { path: 'name', meaning: 'The domain name, for example contoso.com.', required: true },
        {
          path: 'properties.nameServers',
          meaning: 'Read-only list of the four Azure name servers to configure at the registrar.',
        },
        {
          path: 'A / AAAA / CNAME / MX / TXT / NS child resources',
          meaning: 'Record sets with a relative name, a TTL and one or more records.',
        },
        {
          path: 'properties.targetResource',
          meaning:
            'On an alias record set, the Azure resource id the record follows automatically.',
        },
      ],
    },
    {
      kind: 'Private DNS zone (Microsoft.Network/privateDnsZones)',
      apiVersion: '2020-06-01',
      purpose: 'A zone resolvable only from virtual networks that are linked to it.',
      fields: [
        {
          path: 'virtualNetworkLinks[].properties.virtualNetwork.id',
          meaning: 'The VNet that can resolve this zone.',
          required: true,
        },
        {
          path: 'virtualNetworkLinks[].properties.registrationEnabled',
          meaning:
            'Autoregistration of VM A records for that VNet. Only one registration zone per VNet.',
        },
      ],
    },
    {
      kind: 'Load balancer (Microsoft.Network/loadBalancers)',
      apiVersion: '2023-09-01',
      purpose: 'Layer 4 distribution of TCP/UDP flows to a backend pool.',
      fields: [
        {
          path: 'sku.name',
          meaning: 'Standard (Gateway for NVA chaining). Basic is retired.',
          required: true,
        },
        {
          path: 'properties.frontendIPConfigurations',
          meaning: 'Public IP for a public LB, or subnet plus private IP for an internal LB.',
          required: true,
        },
        {
          path: 'properties.backendAddressPools',
          meaning: 'Groups of NICs or IP addresses that receive traffic.',
        },
        {
          path: 'properties.probes',
          meaning: 'TCP, HTTP or HTTPS checks with port, path and interval.',
        },
        {
          path: 'properties.loadBalancingRules',
          meaning:
            'Frontend port to backend port through a probe, with optional session persistence and floating IP.',
        },
        {
          path: 'properties.inboundNatRules',
          meaning: 'Port forwarding to one specific backend instance.',
        },
        {
          path: 'properties.outboundRules',
          meaning: 'Explicit SNAT configuration for outbound internet access.',
        },
      ],
    },
  ],
  realWorldExample: {
    title: 'The web tier that went dark after a security hardening change',
    story: [
      'A team runs two web VMs behind a Standard public load balancer, with `www.fabrikam.com` in Azure DNS as an alias record to the frontend public IP. During a security review someone adds an NSG rule at priority 100 that denies all inbound traffic except TCP 443 from the internet.',
      'Within seconds the site stops responding. The VMs are running, IIS is fine from Bastion, and the load balancer shows no errors. The health probe status metric, however, drops to 0 percent: the new deny rule also blocks probes from `168.63.129.16`, so the load balancer marks both instances down.',
      'The fix is one rule: allow source service tag `AzureLoadBalancer` to the probe port at a priority lower in number than the deny. The team also moves the probe from TCP to an HTTP `/health` endpoint so the probe tests the app rather than just the open port.',
      'Because the DNS record is an alias rather than a hard-coded A record, the later move to a new zone-redundant public IP needs no DNS edit at all.',
    ],
  },
  yamlExamples: [
    {
      title: 'Public zone, alias record and CNAME in Bicep',
      language: 'bicep',
      explanation:
        'The alias record follows the public IP resource, so an IP change never leaves a stale A record. The CNAME points a friendly name at the apex.',
      code: `param zoneName string = 'contoso.com'
param publicIpId string

resource zone 'Microsoft.Network/dnsZones@2018-05-01' = {
  name: zoneName
  location: 'global'
}

resource wwwAlias 'Microsoft.Network/dnsZones/A@2018-05-01' = {
  parent: zone
  name: 'www'
  properties: {
    TTL: 300
    targetResource: {
      id: publicIpId
    }
  }
}

resource shop 'Microsoft.Network/dnsZones/CNAME@2018-05-01' = {
  parent: zone
  name: 'shop'
  properties: {
    TTL: 3600
    CNAMERecord: {
      cname: 'www.\${zoneName}'
    }
  }
}

output nameServers array = zone.properties.nameServers`,
    },
    {
      title: 'Private zone with an autoregistration VNet link',
      language: 'bicep',
      placeholders: ['<vnet-resource-id>'],
      code: `param vnetId string = '<vnet-resource-id>'

resource pzone 'Microsoft.Network/privateDnsZones@2020-06-01' = {
  name: 'corp.contoso.internal'
  location: 'global'
}

resource link 'Microsoft.Network/privateDnsZones/virtualNetworkLinks@2020-06-01' = {
  parent: pzone
  name: 'link-hub'
  location: 'global'
  properties: {
    registrationEnabled: true
    virtualNetwork: {
      id: vnetId
    }
  }
}`,
    },
  ],
  imperative: [
    {
      command: 'az network dns zone create -g rg-dns -n contoso.com',
      what: 'Creates a public DNS zone and returns the assigned Azure name servers.',
      expected: 'JSON with "nameServers": ["ns1-01.azure-dns.com.", ...]',
    },
    {
      command:
        'az network dns record-set a add-record -g rg-dns -z contoso.com -n www -a 20.50.10.4',
      what: 'Adds an A record www.contoso.com to the zone (creating the record set if needed).',
    },
    {
      command:
        'az network private-dns link vnet create -g rg-dns -z corp.contoso.internal -n link-hub -v vnet-hub -e true',
      what: 'Links a VNet to a private zone with autoregistration enabled.',
      expected: '"registrationEnabled": true and "virtualNetworkLinkState": "Completed"',
    },
    {
      command:
        'az network lb create -g rg-lb -n lb-web --sku Standard --public-ip-address pip-web --frontend-ip-name fe-web --backend-pool-name be-web',
      what: 'Creates a Standard public load balancer with a frontend and an empty backend pool.',
    },
    {
      command:
        'az network lb probe create -g rg-lb --lb-name lb-web -n hp-http --protocol Http --port 80 --path /',
      what: 'Adds an HTTP health probe on port 80.',
    },
    {
      command:
        'az network lb rule create -g rg-lb --lb-name lb-web -n rule-http --protocol Tcp --frontend-port 80 --backend-port 80 --frontend-ip-name fe-web --backend-pool-name be-web --probe-name hp-http',
      what: 'Creates a load balancing rule that ties frontend, backend pool and probe together.',
    },
    {
      command:
        'az network lb inbound-nat-rule create -g rg-lb --lb-name lb-web -n nat-ssh-vm1 --protocol Tcp --frontend-port 50001 --backend-port 22 --frontend-ip-name fe-web',
      what: 'Creates an inbound NAT rule to forward port 50001 to SSH on one backend VM (associate it with the VM NIC afterwards).',
    },
  ],
  declarative: {
    steps: [
      'Declare a Standard public IP with a static allocation.',
      'Declare the load balancer with a frontend that references the public IP.',
      'Add a backend pool, an HTTP probe and a load balancing rule that references both.',
      'Add the VM NIC IP configurations to the backend pool (on the NIC resource).',
      'Run `az deployment group what-if` before `az deployment group create`.',
    ],
    code: [
      {
        title: 'Standard public load balancer in Bicep',
        language: 'bicep',
        code: `param location string = resourceGroup().location
var lbName = 'lb-web'

resource pip 'Microsoft.Network/publicIPAddresses@2023-09-01' = {
  name: 'pip-web'
  location: location
  sku: { name: 'Standard' }
  zones: ['1', '2', '3']
  properties: { publicIPAllocationMethod: 'Static' }
}

resource lb 'Microsoft.Network/loadBalancers@2023-09-01' = {
  name: lbName
  location: location
  sku: { name: 'Standard' }
  properties: {
    frontendIPConfigurations: [
      { name: 'fe-web', properties: { publicIPAddress: { id: pip.id } } }
    ]
    backendAddressPools: [ { name: 'be-web' } ]
    probes: [
      {
        name: 'hp-http'
        properties: { protocol: 'Http', port: 80, requestPath: '/', intervalInSeconds: 5 }
      }
    ]
    loadBalancingRules: [
      {
        name: 'rule-http'
        properties: {
          protocol: 'Tcp'
          frontendPort: 80
          backendPort: 80
          disableOutboundSnat: true
          frontendIPConfiguration: { id: resourceId('Microsoft.Network/loadBalancers/frontendIPConfigurations', lbName, 'fe-web') }
          backendAddressPool: { id: resourceId('Microsoft.Network/loadBalancers/backendAddressPools', lbName, 'be-web') }
          probe: { id: resourceId('Microsoft.Network/loadBalancers/probes', lbName, 'hp-http') }
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
      command: 'az network dns zone show -g rg-dns -n contoso.com --query nameServers',
      what: 'Lists the name servers you must configure at the registrar.',
    },
    {
      command: 'nslookup www.contoso.com ns1-01.azure-dns.com',
      what: 'Queries an Azure name server directly, before registrar delegation is in place.',
      expected: 'The A record address, answered by the Azure name server.',
    },
    {
      command:
        'az network private-dns record-set a list -g rg-dns -z corp.contoso.internal -o table',
      what: 'Shows autoregistered VM records in the private zone.',
      expected: 'One A record per VM in the registration VNet.',
    },
    {
      command:
        'az network lb show -g rg-lb -n lb-web --query "{sku:sku.name, probes:probes[].name, rules:loadBalancingRules[].name}"',
      what: 'Confirms SKU, probes and rules on the load balancer.',
    },
    {
      command:
        'az monitor metrics list --resource <lb-resource-id> --metric DipAvailability --interval PT1M -o table',
      what: 'Reads the Health Probe Status metric (DipAvailability) for the backend.',
      expected: '100 when every instance answers the probe.',
      placeholders: ['<lb-resource-id>'],
    },
  ],
  troubleshooting: [
    {
      command: 'az network nic list-effective-nsg -g rg-lb -n <vm-nic-name>',
      what: 'Shows effective NSG rules on a backend NIC so you can spot a deny that blocks the AzureLoadBalancer tag or the client port.',
      placeholders: ['<vm-nic-name>'],
      namespaceNote: 'Effective rules are only returned for a NIC attached to a running VM.',
    },
    {
      command:
        'az network watcher test-ip-flow -g rg-lb --vm vm1 --direction Inbound --protocol TCP --local 10.0.1.4:80 --remote 168.63.129.16:60000',
      what: 'Checks whether the probe source is allowed to reach the VM on the probe port.',
      expected: 'Access Allow; Deny names the rule that blocks probes.',
    },
    {
      command: 'curl -s -o /dev/null -w "%{http_code}" http://localhost/',
      what: 'Run on the backend VM: confirms the app answers the probe path locally with HTTP 200.',
      expected: '200. Any other status makes an HTTP probe mark the instance down.',
    },
    {
      command: 'nslookup app.corp.contoso.internal',
      what: 'From a VM, checks private zone resolution. NXDOMAIN usually means the VNet is not linked to the zone.',
    },
  ],
  commonMistakes: [
    'Blocking the `AzureLoadBalancer` service tag (168.63.129.16) with a custom deny rule, so every health probe fails and the load balancer sends traffic nowhere.',
    'Expecting a Standard load balancer or Standard public IP to be open by default. Without an NSG that allows the traffic, nothing reaches the backend.',
    'Creating a CNAME at the zone apex (`contoso.com`). DNS does not allow it; use an alias A record to the Azure resource instead.',
    'Creating a private DNS zone but forgetting the virtual network link, then wondering why VMs resolve names to public IPs or not at all.',
    'Trying to enable autoregistration for one VNet in two private zones. A VNet can autoregister into only one private zone.',
    'Choosing Traffic Manager for WAF or TLS offload. It is DNS only and never sees the HTTP request.',
    'Using an HTTP probe on a path that returns 301 or 401. Only 200 counts as healthy.',
  ],
  examTips: [
    'Layer 4 regional equals Load Balancer; layer 7 regional with WAF equals Application Gateway; layer 7 global equals Front Door; DNS based global equals Traffic Manager. Memorise this grid.',
    'Probe failures with healthy VMs almost always mean an NSG or guest firewall blocks 168.63.129.16 or the app returns non-200 on the probe path.',
    'Backend pool members of a Standard load balancer must be in the same VNet, and all VMs in the pool should be Standard SKU compatible (no Basic public IPs on them).',
    'To delegate a subdomain, add an NS record set in the parent zone that lists the child zone name servers.',
    'Alias records can target a public IP, Traffic Manager profile, Front Door or another record set in the same zone, and they support the zone apex.',
    'Private DNS zones are global resources; the same zone can be linked to VNets in any region and subscription within the tenant.',
  ],
  summary: [
    'Public DNS zones serve the internet; private DNS zones serve only linked VNets, optionally with autoregistration.',
    'Record sets group records of one type under one name; alias records follow Azure resources automatically.',
    'Standard Load Balancer is the layer 4 regional choice: frontend, backend pool, probe, rule, plus NAT and outbound rules.',
    'Health probes come from 168.63.129.16, the AzureLoadBalancer tag; never block it.',
    'Pick Application Gateway for regional HTTP with WAF, Front Door for global HTTP, Traffic Manager for global DNS routing.',
  ],
  practice: [
    {
      id: 'az1-dns-load-balancing-p1',
      level: 'beginner',
      prompt:
        'You want contoso.com (the zone apex) to point at a Standard public IP that might be recreated. Which record type should you use?',
      answer: 'An alias A record in the contoso.com zone targeting the public IP resource.',
      explanation:
        'A CNAME is not allowed at the apex, and a plain A record would go stale if the IP changes. The alias follows the resource.',
    },
    {
      id: 'az1-dns-load-balancing-p2',
      level: 'intermediate',
      prompt:
        'Two VMs behind an internal load balancer are running and the app works locally, but the probe status is 0 percent. What do you check first?',
      answer:
        'The effective NSG rules on the NICs and subnet for a deny that blocks the AzureLoadBalancer tag (168.63.129.16) on the probe port, then the guest OS firewall.',
      explanation:
        'Probes come from the platform address. If they cannot reach the port, every instance is marked unhealthy even though the app is fine.',
    },
    {
      id: 'az1-dns-load-balancing-p3',
      level: 'intermediate',
      prompt:
        'A company needs HTTPS load balancing across two regions with WAF and edge caching of static content. Which service fits?',
      answer: 'Azure Front Door (Standard or Premium tier) with a WAF policy.',
      explanation:
        'Application Gateway is regional, Load Balancer is layer 4 and Traffic Manager is DNS only with no WAF or caching.',
    },
    {
      id: 'az1-dns-load-balancing-p4',
      level: 'advanced',
      prompt:
        'VMs in vnet-spoke must resolve records in corp.contoso.internal, and VMs in vnet-hub must autoregister there. How do you configure the links?',
      answer:
        'Create a virtual network link for vnet-hub with registration enabled, and a second link for vnet-spoke with registration disabled (resolution only).',
      explanation:
        'Any number of VNets can link for resolution. Registration is a per-link setting, and each VNet can register into only one private zone.',
    },
  ],
  lab: {
    title: 'Build a load balanced web tier with a DNS name',
    scenario:
      'Deploy two small Linux VMs running nginx behind a Standard public load balancer, publish it with an Azure DNS alias record, then break and fix the health probe.',
    prerequisites: [
      'An Azure subscription (free account works) and Cloud Shell (Bash)',
      'Quota for two B-series VMs in your chosen region',
    ],
    tasks: [
      {
        instruction:
          'Create resource group `rg-az104-lb` and a VNet `vnet-lb` with subnet `snet-web` (10.20.1.0/24).',
      },
      {
        instruction:
          'Create an NSG allowing TCP 80 from the internet, associate it with the subnet, and create two VMs without public IPs that install nginx via cloud-init.',
        hint: 'Use `--public-ip-address ""` and `--custom-data` with a small cloud-init file.',
      },
      {
        instruction:
          'Create a Standard public IP, a Standard load balancer, an HTTP probe on port 80 and a rule for port 80. Add both VM NICs to the backend pool.',
      },
      {
        instruction:
          'Create a DNS zone `az104lab<unique>.com` and an alias A record `www` targeting the public IP. Query it directly against an Azure name server.',
        hint: 'The zone does not need to be delegated for a direct query to a name server to work.',
      },
      {
        instruction:
          'Add an NSG rule at priority 100 denying source `AzureLoadBalancer`. Watch the site stop responding, then delete the rule.',
      },
    ],
    solution: [
      {
        title: 'Network, VMs and load balancer',
        language: 'bash',
        code: `RG=rg-az104-lb
LOC=eastus
az group create -n $RG -l $LOC
az network vnet create -g $RG -n vnet-lb --address-prefix 10.20.0.0/16 \\
  --subnet-name snet-web --subnet-prefix 10.20.1.0/24
az network nsg create -g $RG -n nsg-web
az network nsg rule create -g $RG --nsg-name nsg-web -n allow-http --priority 200 \\
  --source-address-prefixes Internet --destination-port-ranges 80 --protocol Tcp --access Allow
az network vnet subnet update -g $RG --vnet-name vnet-lb -n snet-web --network-security-group nsg-web

cat > cloud-init.txt <<'EOF'
#cloud-config
packages: [nginx]
runcmd:
  - hostname > /var/www/html/index.html
EOF

for i in 1 2; do
  az vm create -g $RG -n vm$i --image Ubuntu2204 --size Standard_B1s \\
    --vnet-name vnet-lb --subnet snet-web --public-ip-address "" --nsg "" \\
    --admin-username azureuser --generate-ssh-keys --custom-data cloud-init.txt
done

az network public-ip create -g $RG -n pip-web --sku Standard --zone 1 2 3
az network lb create -g $RG -n lb-web --sku Standard --public-ip-address pip-web \\
  --frontend-ip-name fe-web --backend-pool-name be-web
az network lb probe create -g $RG --lb-name lb-web -n hp-http --protocol Http --port 80 --path /
az network lb rule create -g $RG --lb-name lb-web -n rule-http --protocol Tcp \\
  --frontend-port 80 --backend-port 80 --frontend-ip-name fe-web \\
  --backend-pool-name be-web --probe-name hp-http --disable-outbound-snat true

for i in 1 2; do
  az network nic ip-config address-pool add -g $RG --nic-name vm\${i}VMNic \\
    --ip-config-name ipconfigvm\${i} --lb-name lb-web --address-pool be-web
done`,
      },
      {
        title: 'DNS alias record and the probe experiment',
        language: 'bash',
        code: `ZONE=az104lab$RANDOM.com
PIP_ID=$(az network public-ip show -g $RG -n pip-web --query id -o tsv)
az network dns zone create -g $RG -n $ZONE
az network dns record-set a create -g $RG -z $ZONE -n www --target-resource $PIP_ID
NS=$(az network dns zone show -g $RG -n $ZONE --query "nameServers[0]" -o tsv)
nslookup www.$ZONE $NS

IP=$(az network public-ip show -g $RG -n pip-web --query ipAddress -o tsv)
curl http://$IP   # alternates vm1 / vm2 across new connections

# Break the probe
az network nsg rule create -g $RG --nsg-name nsg-web -n deny-probe --priority 100 \\
  --source-address-prefixes AzureLoadBalancer --destination-port-ranges '*' --access Deny
# Wait a minute; curl now times out. Fix it:
az network nsg rule delete -g $RG --nsg-name nsg-web -n deny-probe`,
      },
    ],
    verification: [
      {
        command:
          'az network lb address-pool show -g rg-az104-lb --lb-name lb-web -n be-web --query "backendIPConfigurations[].id" -o tsv',
        what: 'Confirms both NIC IP configurations are in the backend pool.',
        expected: 'Two ids ending in ipconfigvm1 and ipconfigvm2.',
      },
      {
        command: 'curl -s http://<public-ip>',
        what: 'Hits the frontend; repeat to see responses from both hostnames.',
        expected: 'vm1 or vm2',
        placeholders: ['<public-ip>'],
      },
    ],
    cleanup: [
      {
        command: 'az group delete -n rg-az104-lb --yes --no-wait',
        what: 'Deletes the VMs, load balancer, public IP, DNS zone and network in one go.',
      },
    ],
  },
  relatedTopicIds: [
    'az1-vnets-peering',
    'az1-nsg-bastion',
    'az1-private-endpoints',
    'az1-routing-public-ip',
    'az1-network-watcher',
  ],
  docs: [
    { title: 'What is Azure DNS?', url: 'https://learn.microsoft.com/azure/dns/dns-overview' },
    {
      title: 'What is an Azure Private DNS zone?',
      url: 'https://learn.microsoft.com/azure/dns/private-dns-privatednszone',
    },
    {
      title: 'Azure DNS alias records overview',
      url: 'https://learn.microsoft.com/azure/dns/dns-alias',
    },
    {
      title: 'What is Azure Load Balancer?',
      url: 'https://learn.microsoft.com/azure/load-balancer/load-balancer-overview',
    },
    {
      title: 'Azure Load Balancer health probes',
      url: 'https://learn.microsoft.com/azure/load-balancer/load-balancer-custom-probe-overview',
    },
    {
      title: 'Load-balancing options',
      url: 'https://learn.microsoft.com/azure/architecture/guide/technology-choices/load-balancing-overview',
    },
  ],
}
