import type { InterviewQuestion } from '../../../types'

/** Routing, egress, SNAT and hybrid connectivity. */
export const azureNetworkingRoutingQuestions: InterviewQuestion[] = [
  {
    id: 'itv-aznet-6',
    level: 'intermediate',
    kind: 'open',
    prompt:
      'How does routing work in an Azure VNet? How would you force all spoke traffic through Azure Firewall?',
    probing:
      'System routes, UDRs and longest-prefix match, plus the details that make forced inspection actually work - including the return path.',
    answer: [
      'Every subnet gets **system routes** automatically: the VNet’s own range is local, peered ranges go to the peering, `0.0.0.0/0` goes to the Internet, and some reserved ranges are dropped. If a gateway exists, routes learned by **BGP** from on-premises are added too.',
      'A **route table** with **user-defined routes** overrides those. Azure picks the route with the **longest prefix match**, and when prefixes are equal the order of preference is UDR, then BGP, then system route. Next hop types are virtual appliance (an IP, typically a firewall), virtual network gateway, VNet, Internet, or None to drop.',
      'To force traffic through the hub firewall, I associate a route table with each spoke subnet containing `0.0.0.0/0` to the firewall’s **private IP**, and routes for other spokes’ ranges to the same IP if spoke-to-spoke must be inspected. I disable **BGP route propagation** on spoke route tables so on-premises routes learned by the gateway do not bypass the firewall.',
      'The detail people miss is **symmetry**. Traffic from on-premises arrives at the hub gateway and would go straight to the spoke over peering, while the return goes via the firewall - and a stateful firewall drops that. So the **GatewaySubnet** also needs a route table sending spoke ranges to the firewall. Both directions must pass the same firewall.',
    ],
    diagrams: [
      {
        kind: 'flow',
        title: 'Spoke VM to internet, via the hub firewall',
        caption: 'The 0.0.0.0/0 UDR wins because UDRs beat system routes for the same prefix.',
        nodes: [
          { label: 'VM in spoke subnet' },
          {
            label: 'UDR 0.0.0.0/0 next hop 10.0.1.4',
            detail: 'Firewall private IP',
            tone: 'accent',
          },
          { label: 'Peering to hub', arrowLabel: 'forwarded traffic allowed' },
          {
            label: 'Azure Firewall rules',
            branch: { label: 'Denied', detail: 'Logged to Log Analytics', tone: 'danger' },
          },
          { label: 'SNAT to firewall public IP', tone: 'success' },
        ],
      },
    ],
    code: [
      {
        title: 'A spoke route table that forces inspection',
        language: 'bash',
        code: `az network route-table create -g rg-shop -n rt-shop-prod --disable-bgp-route-propagation true

az network route-table route create -g rg-shop --route-table-name rt-shop-prod -n default-to-fw \\
  --address-prefix 0.0.0.0/0 --next-hop-type VirtualAppliance --next-hop-ip-address 10.0.1.4

az network vnet subnet update -g rg-shop --vnet-name vnet-shop-prod-uks -n snet-app \\
  --route-table rt-shop-prod

# What does this NIC actually use? Shows UDR, BGP and system routes together
az network nic show-effective-route-table -g rg-shop -n vm-app-01-nic -o table`,
      },
      {
        title: 'Or ask Network Watcher for a single destination',
        language: 'bash',
        code: `az network watcher show-next-hop -g rg-shop --vm vm-app-01 \\
  --source-ip 10.20.0.4 --dest-ip 52.239.0.10
# Expect nextHopType VirtualAppliance, nextHopIpAddress 10.0.1.4`,
      },
    ],
    traps: [
      'Forgetting the GatewaySubnet route, creating asymmetric routing that the firewall drops.',
      'Leaving BGP propagation on, so on-premises prefixes bypass the firewall.',
      'Putting a 0.0.0.0/0 UDR on subnets whose platform services need direct management traffic, without checking their requirements.',
    ],
    followUps: [
      'How do you troubleshoot a route that is not being used?',
      'Which subnets have special rules about route tables?',
    ],
    tags: ['routing', 'udr', 'azure firewall', 'forced tunneling'],
  },
  {
    id: 'itv-aznet-7',
    level: 'intermediate',
    kind: 'open',
    prompt:
      'How do resources in Azure get outbound internet access? Where does a NAT gateway fit, and what is SNAT port exhaustion?',
    probing:
      'Egress design. Default outbound access is being retired, so they want explicit egress methods and the SNAT mechanism explained.',
    answer: [
      'Historically a VM with no public IP still got internet access through **default outbound access** - an Azure-owned IP you did not control. Microsoft is retiring that behaviour, and new subnets are moving to **private by default**, so outbound should always be explicit.',
      'The explicit options are: a **public IP on the VM** (simple, but exposes the VM); **outbound rules on a Standard Load Balancer**; routing through **Azure Firewall** or an NVA, which gives inspection and a known egress IP; or a **NAT gateway** attached to the subnet. A NAT gateway is the recommended default for plain outbound: it scales without per-VM port allocation tuning, gives you predictable public IPs to allowlist at partners, and takes precedence over other outbound methods on that subnet.',
      '**SNAT** - source network address translation - is how many private IPs share a few public IPs. Each outbound connection to a given destination IP and port needs a **SNAT port** on the public IP. There are about 64,000 ports per public IP, and they are reused only after a connection closes and an idle timeout passes.',
      '**SNAT port exhaustion** happens when a workload opens connections faster than ports are released - typically code that creates a new HTTP client per request, or many connections to a single destination. New connections then fail or time out intermittently under load. The fixes are **connection reuse and pooling** in the code first, then more ports - a NAT gateway with more public IPs - and **private endpoints** for Azure services, which do not use SNAT at all.',
    ],
    code: [
      {
        title: 'Attach a NAT gateway to a subnet',
        language: 'bash',
        code: `az network public-ip create -g rg-net -n pip-natgw-uks --sku Standard --zone 1
az network nat gateway create -g rg-net -n natgw-uks \\
  --public-ip-addresses pip-natgw-uks --idle-timeout 4 --zone 1

az network vnet subnet update -g rg-shop --vnet-name vnet-shop-prod-uks -n snet-app \\
  --nat-gateway /subscriptions/<sub-id>/resourceGroups/rg-net/providers/Microsoft.Network/natGateways/natgw-uks`,
        placeholders: ['<sub-id>'],
      },
      {
        title: 'The code-level cause, and the fix',
        language: 'python',
        code: `import requests

# Bad: a new connection (and SNAT port) for every call
def get_price_bad(item):
    return requests.get(f"https://api.partner.example/price/{item}", timeout=5).json()

# Good: one session reuses pooled keep-alive connections
session = requests.Session()
def get_price(item):
    return session.get(f"https://api.partner.example/price/{item}", timeout=5).json()`,
      },
    ],
    traps: [
      'Relying on default outbound access for production egress.',
      'Adding public IPs to fix exhaustion without fixing connection handling.',
      'Allowlisting a VM’s default outbound IP at a partner - it can change.',
    ],
    followUps: [
      'Why do private endpoints help with SNAT?',
      'How does NAT gateway interact with a VM that also has a public IP?',
    ],
    tags: ['nat gateway', 'snat', 'outbound', 'egress'],
  },
  {
    id: 'itv-aznet-8',
    level: 'advanced',
    kind: 'scenario',
    prompt:
      'An App Service app calls a partner API. Under peak load, around 5% of calls time out after 30 seconds; at night everything is fine. CPU and memory are normal. Walk me through it.',
    probing:
      'Recognising SNAT exhaustion from its signature - load-dependent, intermittent, outbound only, healthy host - and proving it rather than guessing.',
    answer: [
      'The signature points at **outbound connection exhaustion**: it only happens under load, it is intermittent, it is outbound to one destination, and the instance is otherwise healthy. On App Service the prime suspect is **SNAT port exhaustion** - each instance has a limited pre-allocated SNAT port budget per destination - or the related problem of exhausting TCP connections.',
      'I would **prove it** before changing anything. App Service **Diagnose and solve problems** has a **SNAT Port Exhaustion** detector and a TCP connections detector that show allocated and failed SNAT ports per instance over time. I would line that up against the timeout spikes in Application Insights dependency telemetry for the partner host.',
      'Then fix it in the right order. First **the code**: a shared, long-lived `HttpClient` or session with keep-alive, sensible pool limits and timeouts, instead of a new client per request. That alone usually ends it. Second, if the volume genuinely needs more ports, route outbound traffic through **VNet integration and a NAT gateway**, which gives far more SNAT ports and a stable egress IP. Third, for Azure dependencies like Storage or SQL, use **private endpoints**, which bypass SNAT entirely.',
      'Scaling out also spreads connections across more instances and more SNAT allocations, which helps short-term, but it hides a code problem that will return with more traffic.',
    ],
    code: [
      {
        title: 'Application Insights: failing dependency calls by minute',
        language: 'text',
        code: `dependencies
| where timestamp > ago(1d)
| where target has "api.partner.example"
| summarize total = count(), failed = countif(success == false),
            p95 = percentile(duration, 95) by bin(timestamp, 5m)
| extend failRate = round(100.0 * failed / total, 2)
| render timechart`,
      },
      {
        title: 'Route the app’s outbound traffic through a NAT gateway',
        language: 'bash',
        code: `# App Service VNet integration into a delegated subnet that has a NAT gateway
az webapp vnet-integration add -g rg-shop -n app-shop-prod \\
  --vnet vnet-shop-prod-uks --subnet snet-appsvc-integration

# Send all outbound traffic through the VNet, not just private ranges
az webapp config set -g rg-shop -n app-shop-prod --generic-configurations '{"vnetRouteAllEnabled": true}'

az network vnet subnet update -g rg-shop --vnet-name vnet-shop-prod-uks \\
  -n snet-appsvc-integration --nat-gateway natgw-uks`,
      },
    ],
    diagrams: [
      {
        kind: 'flow',
        title: 'Diagnosing intermittent outbound timeouts',
        caption: 'Fix connection reuse first; more SNAT ports only buys headroom.',
        nodes: [
          { label: 'Timeouts only under load', tone: 'warning' },
          { label: 'Host healthy, outbound only', detail: 'CPU, memory normal' },
          { label: 'SNAT detector plus dependency telemetry', tone: 'accent' },
          {
            label: 'Reuse connections in code',
            detail: 'Shared client, keep-alive',
            tone: 'success',
          },
          { label: 'NAT gateway for more ports', detail: 'Stable egress IP too' },
          { label: 'Private endpoints for Azure services', detail: 'No SNAT at all' },
        ],
      },
    ],
    deeper: [
      'SNAT ports are per **destination IP and port**. Calling many different destinations exhausts ports far more slowly than hammering one, which is why a single partner API is the usual trigger.',
      'The partner’s side can also throttle or drop connections. A packet capture or the partner’s own logs distinguish "we never got a port" from "they did not answer".',
      'Setting `vnetRouteAllEnabled` changes more than egress: DNS and all outbound traffic now follow VNet routes, so check the route table and DNS before flipping it in production.',
    ],
    traps: [
      'Scaling up the plan because "it is a performance problem".',
      'Blaming the partner without data.',
      'Adding a NAT gateway but leaving the app routing only private ranges through the VNet.',
    ],
    followUps: [
      'How many SNAT ports does a NAT gateway provide?',
      'How would you do the same analysis for a VM behind a load balancer?',
    ],
    tags: ['scenario', 'snat', 'nat gateway', 'app service', 'troubleshooting'],
  },
  {
    id: 'itv-aznet-9',
    level: 'intermediate',
    kind: 'mcq',
    prompt: 'Which statement about ExpressRoute is correct?',
    options: [
      {
        id: 'a',
        text: 'ExpressRoute traffic is encrypted by default because it uses IPsec tunnels',
      },
      {
        id: 'b',
        text: 'ExpressRoute is a private connection that does not traverse the public internet, but is not encrypted by default',
      },
      {
        id: 'c',
        text: 'ExpressRoute requires a VPN gateway SKU in the GatewaySubnet to terminate IPsec',
      },
      {
        id: 'd',
        text: 'ExpressRoute provides a single circuit with no built-in redundancy',
      },
    ],
    correct: ['b'],
    probing: 'A security nuance that trips people up: private does not mean encrypted.',
    answer: [
      'ExpressRoute is a **private, dedicated connection** through a connectivity provider into the Microsoft network - it does not cross the public internet - but traffic is **not encrypted by default**. If you need encryption you add **MACsec** on ExpressRoute Direct ports, or run **IPsec over ExpressRoute** private peering, or rely on TLS at the application layer.',
      'The other options are wrong: ExpressRoute uses an **ExpressRoute gateway** SKU, not a VPN gateway, and there is no IPsec by default. And each circuit has **two connections** to two Microsoft edge routers for redundancy - though for real resilience you want circuits in two peering locations.',
    ],
    code: [
      {
        title: 'Check both BGP sessions on the circuit are up',
        language: 'bash',
        code: `az network express-route show -g rg-hub -n er-london \\
  --query "{state:circuitProvisioningState, provider:serviceProviderProvisioningState, bw:serviceProviderProperties.bandwidthInMbps}"

az network express-route list-route-tables -g rg-hub -n er-london \\
  --peering-name AzurePrivatePeering --path primary -o table`,
      },
    ],
    traps: ['Telling an auditor ExpressRoute traffic is encrypted.'],
    followUps: ['How would you design ExpressRoute for maximum resiliency?'],
    tags: ['expressroute', 'hybrid', 'encryption'],
  },
  {
    id: 'itv-aznet-10',
    level: 'advanced',
    kind: 'open',
    prompt:
      'Design hybrid connectivity for a company with two datacenters and a critical app in Azure. VPN, ExpressRoute, or both?',
    probing:
      'Tradeoffs between cost, latency, bandwidth and resilience, and knowing the failure modes - a single circuit, a single peering location, a single gateway.',
    answer: [
      '**Site-to-site VPN** runs IPsec over the internet to a **VPN gateway**. It is quick to set up and cheap, and it is encrypted, but latency and throughput depend on the internet path, and aggregate bandwidth is limited by the gateway SKU. It suits small sites, dev and test, and backup paths.',
      '**ExpressRoute** is a private circuit through a provider, with predictable latency, higher bandwidth and an SLA. It suits production traffic, large data transfer and regulated workloads. It costs more and takes weeks to provision.',
      'For a critical app with two datacenters I would use **ExpressRoute from both**, ideally to circuits in **two different peering locations**, so a provider or edge-site failure does not take everything down, with a **zone-redundant ExpressRoute gateway** in the hub. Each circuit already has two links, but one peering location is still a single point of failure.',
      'I would add a **site-to-site VPN as a backup** path - it can coexist with ExpressRoute on the same hub, and BGP prefers ExpressRoute routes while it is up, failing over to VPN if both circuits drop. And I would test the failover, because BGP path preference is easy to get subtly wrong: AS-path prepending or local preference on-premises decides which path is really used.',
    ],
    diagrams: [
      {
        kind: 'decision',
        title: 'Which hybrid connection?',
        caption: 'Production usually wants ExpressRoute with a second path, not one or the other.',
        question: 'What does the connection need to deliver?',
        branches: [
          {
            condition: 'Quick, cheap, small site',
            result: 'Site-to-site VPN',
            detail: 'IPsec over internet',
          },
          {
            condition: 'Predictable latency and bandwidth',
            result: 'ExpressRoute',
            detail: 'Private, not encrypted by default',
            tone: 'accent',
          },
          {
            condition: 'Critical, must survive a provider outage',
            result: 'Two circuits, two peering locations',
            detail: 'Plus zone-redundant gateway',
            tone: 'success',
          },
          {
            condition: 'Budget backup path',
            result: 'VPN as failover for ExpressRoute',
            detail: 'BGP prefers ExpressRoute',
            tone: 'warning',
          },
        ],
      },
    ],
    code: [
      {
        title: 'Zone-redundant gateways in the hub',
        language: 'bash',
        code: `az network public-ip create -g rg-hub -n pip-ergw --sku Standard --zone 1 2 3

az network vnet-gateway create -g rg-hub -n ergw-hub-uks \\
  --vnet vnet-hub-uks --gateway-type ExpressRoute --sku ErGw1AZ \\
  --public-ip-addresses pip-ergw

az network vpn-connection create -g rg-hub -n conn-er-london \\
  --vnet-gateway1 ergw-hub-uks --express-route-circuit2 <circuit-id>

# BGP routes learned from on-premises through the VPN backup
az network vnet-gateway list-learned-routes -g rg-hub -n vpngw-hub-uks -o table`,
        placeholders: ['<circuit-id>'],
      },
    ],
    deeper: [
      'ExpressRoute **FastPath** sends traffic from on-premises straight to VMs, bypassing the gateway for data, which removes the gateway as a throughput bottleneck for high-bandwidth workloads.',
      'Microsoft peering on ExpressRoute reaches Microsoft 365 and public PaaS endpoints, but most designs now use **private peering plus private endpoints** instead, which keeps everything on private IPs.',
      '**ExpressRoute Global Reach** connects your two datacenters to each other through Microsoft’s backbone, which can replace a separate WAN link between them.',
    ],
    traps: [
      'Two circuits in the same peering location and calling it redundant.',
      'Assuming ExpressRoute is encrypted.',
      'Never testing the VPN failover path.',
    ],
    followUps: [
      'How does BGP decide between ExpressRoute and VPN routes?',
      'What does FastPath change?',
    ],
    tags: ['expressroute', 'vpn', 'hybrid', 'bgp', 'design'],
  },
]
