import type { InterviewQuestion } from '../../../types'

/** Load balancing choices, WAF, application gateway failures and DNS resolution. */
export const azureNetworkingLoadBalancingQuestions: InterviewQuestion[] = [
  {
    id: 'itv-aznet-16',
    level: 'intermediate',
    kind: 'open',
    prompt:
      'Compare Azure Load Balancer, Application Gateway, Front Door and Traffic Manager. How do you choose?',
    probing:
      'The classic comparison. They want two axes - layer 4 versus layer 7, regional versus global - and sensible combinations.',
    answer: [
      'I sort them on two axes: **which layer** they work at, and whether they are **regional or global**.',
      '**Azure Load Balancer** is **layer 4, regional**: it distributes TCP and UDP flows by a hash of the 5-tuple, very fast, no idea what HTTP is. Use it for non-HTTP traffic, internal load balancing between tiers, and in front of VM scale sets or NVAs. **Application Gateway** is **layer 7, regional**: HTTP and HTTPS, TLS termination, path- and host-based routing, rewrites, cookie affinity, and an optional **WAF**. It is the regional reverse proxy for web apps, including private ones.',
      '**Azure Front Door** is **layer 7, global**: an anycast edge network with TLS termination near the user, caching, global routing between regions based on latency, priority or weight, and a WAF at the edge. It is the front door for public, internet-facing, multi-region web apps. **Traffic Manager** is **DNS-based, global**: it answers DNS queries with the endpoint that is healthy and closest or highest priority. It never sees the traffic itself, so it works for any protocol, but failover speed depends on DNS TTLs and client caching.',
      'Common combinations: **Front Door in front of regional App Gateways or App Services** for global public web apps; **App Gateway with WAF in front of an internal Load Balancer or AKS** for regional apps; **Traffic Manager** for non-HTTP global failover.',
    ],
    diagrams: [
      {
        kind: 'decision',
        title: 'Which load balancer?',
        caption: 'Two questions: HTTP-aware or not, and one region or many.',
        question: 'What traffic, and how many regions?',
        branches: [
          {
            condition: 'TCP or UDP, one region',
            result: 'Azure Load Balancer',
            detail: 'Layer 4, very low latency',
          },
          {
            condition: 'HTTP(S), one region, WAF, private apps',
            result: 'Application Gateway',
            detail: 'Layer 7 regional reverse proxy',
            tone: 'accent',
          },
          {
            condition: 'HTTP(S), global, public',
            result: 'Front Door',
            detail: 'Edge TLS, caching, WAF',
            tone: 'success',
          },
          {
            condition: 'Any protocol, global failover by DNS',
            result: 'Traffic Manager',
            detail: 'Never sees the traffic',
            tone: 'muted',
          },
        ],
      },
    ],
    code: [
      {
        title: 'An internal Standard Load Balancer with a health probe',
        language: 'bash',
        code: `az network lb create -g rg-app -n ilb-api --sku Standard \\
  --vnet-name vnet-shop-prod-uks --subnet snet-app \\
  --frontend-ip-name fe-api --private-ip-address 10.20.0.100 \\
  --backend-pool-name be-api

az network lb probe create -g rg-app --lb-name ilb-api -n probe-health \\
  --protocol Http --port 8080 --path /healthz

az network lb rule create -g rg-app --lb-name ilb-api -n rule-443 \\
  --protocol Tcp --frontend-port 443 --backend-port 8443 \\
  --frontend-ip-name fe-api --backend-pool-name be-api --probe-name probe-health`,
      },
    ],
    traps: [
      'Putting Application Gateway in front of UDP traffic.',
      'Expecting Traffic Manager failover to be instant - clients cache DNS answers.',
      'Forgetting the Basic Load Balancer is retired; Standard is closed by default and needs NSGs allowing traffic.',
    ],
    followUps: [
      'Why would you put Application Gateway behind Front Door?',
      'What is the difference between Front Door Standard and Premium?',
    ],
    tags: ['load balancer', 'application gateway', 'front door', 'traffic manager'],
  },
  {
    id: 'itv-aznet-17',
    level: 'advanced',
    kind: 'open',
    prompt:
      'Your public app sits behind Front Door with WAF. How do you make sure attackers cannot bypass Front Door and hit the origin directly?',
    probing:
      'A real gap in many designs. They want layered origin lockdown - network, header check, or Private Link - and WAF policy tuning.',
    answer: [
      'Front Door only protects traffic that goes **through** it. If the origin - an App Service, an App Gateway, a public IP on AKS - is reachable directly, attackers skip the WAF entirely. So the origin must **only accept traffic from my Front Door profile**.',
      'The strongest option with **Front Door Premium** is a **Private Link origin**: Front Door connects to the App Service, storage account or internal load balancer over a private endpoint, and the origin’s public access is disabled. There is no public origin to attack.',
      'Without Private Link, I use two checks together. At the network level, allow inbound only from the **`AzureFrontDoor.Backend` service tag** - on App Service access restrictions, or an NSG on the App Gateway subnet. But that tag covers **every** Front Door customer, so I also check the **`X-Azure-FDID` header** equals my profile’s ID, which App Service access restrictions support natively and App Gateway can do with a WAF custom rule.',
      'On the WAF itself: start in **Detection** mode with the Microsoft managed rule set and bot protection, review logs for false positives, add targeted exclusions rather than disabling rules, then switch to **Prevention**. And add **rate limiting** custom rules for login and search endpoints.',
    ],
    code: [
      {
        title: 'App Service: only my Front Door profile may connect',
        language: 'bash',
        code: `FDID=$(az afd profile show -g rg-edge --profile-name afd-shop --query frontDoorId -o tsv)

az webapp config access-restriction add -g rg-shop -n app-shop-prod \\
  --rule-name allow-my-frontdoor --priority 100 --action Allow \\
  --service-tag AzureFrontDoor.Backend --http-header x-azure-fdid="$FDID"

# Everything else now falls through to the implicit deny`,
      },
      {
        title: 'WAF: rate-limit the login endpoint',
        language: 'bicep',
        code: `resource waf 'Microsoft.Network/FrontDoorWebApplicationFirewallPolicies@2024-02-01' = {
  name: 'wafshopprod'
  location: 'global'
  sku: { name: 'Premium_AzureFrontDoor' }
  properties: {
    policySettings: { enabledState: 'Enabled', mode: 'Prevention' }
    customRules: {
      rules: [
        {
          name: 'RateLimitLogin'
          priority: 10
          ruleType: 'RateLimitRule'
          rateLimitDurationInMinutes: 1
          rateLimitThreshold: 100
          action: 'Block'
          matchConditions: [
            {
              matchVariable: 'RequestUri'
              operator: 'Contains'
              matchValue: [ '/account/login' ]
            }
          ]
        }
      ]
    }
    managedRules: {
      managedRuleSets: [
        { ruleSetType: 'Microsoft_DefaultRuleSet', ruleSetVersion: '2.1', ruleSetAction: 'Block' }
        { ruleSetType: 'Microsoft_BotManagerRuleSet', ruleSetVersion: '1.1' }
      ]
    }
  }
}`,
      },
    ],
    diagrams: [
      {
        kind: 'flow',
        title: 'Layered origin lockdown',
        caption:
          'The service tag alone admits every Front Door tenant; the FDID check makes it yours.',
        nodes: [
          { label: 'Client request' },
          { label: 'Front Door edge + WAF', detail: 'Managed rules, rate limits', tone: 'accent' },
          {
            label: 'Origin network check',
            detail: 'AzureFrontDoor.Backend only',
            branch: { label: 'Direct hit', detail: 'Denied', tone: 'danger' },
          },
          {
            label: 'Header X-Azure-FDID matches',
            branch: { label: 'Other profile', detail: 'Denied', tone: 'danger' },
          },
          { label: 'App serves the request', tone: 'success' },
        ],
      },
    ],
    deeper: [
      'The origin’s default hostname, like `app-shop-prod.azurewebsites.net`, is discoverable. Lockdown must be at the origin; relying on nobody knowing the hostname is not a control.',
      'If both Front Door and App Gateway have WAFs, decide which one owns which rules. Running the same managed rules twice doubles false positives and tuning effort.',
      'Keep the host header consistent end to end, or set it deliberately - redirects and cookies break when the origin sees a different hostname from the user.',
    ],
    traps: [
      'Allowing only the AzureFrontDoor.Backend tag and calling the origin locked down.',
      'Turning on Prevention mode on day one and blocking real users.',
      'Disabling whole rule groups to fix one false positive.',
    ],
    followUps: [
      'How do you tune WAF false positives safely?',
      'What does Private Link to the origin require?',
    ],
    tags: ['front door', 'waf', 'security', 'origin lockdown'],
  },
  {
    id: 'itv-aznet-18',
    level: 'advanced',
    kind: 'scenario',
    prompt:
      'Users get "502 Bad Gateway" from Application Gateway v2. The app team says their VMs are healthy. How do you find the cause?',
    probing:
      'A 502 from a proxy means it could not get a good answer from the backend. They want backend health first, then the usual suspects: probes, TLS, NSGs, timeouts, DNS.',
    answer: [
      'A 502 from Application Gateway means the gateway **could not get a valid response from any backend** in the pool. The first thing I look at is **Backend health** - in the portal or with the CLI - because it shows each backend’s status and, importantly, the **reason** the probe failed.',
      'The common reasons, roughly in order of frequency. The **health probe** does not match the app: wrong path, wrong port, or the app returns 401 or a redirect, which the default probe treats as unhealthy - so "healthy VMs" can still be unhealthy backends. **TLS to the backend**: with end-to-end TLS, the backend certificate’s name must match the host name App Gateway uses, and its chain must be trusted; a self-signed or internal CA certificate needs a trusted root uploaded. **NSGs**: the backend subnet must allow traffic from the App Gateway subnet, and the App Gateway subnet itself must allow the GatewayManager management ports and the Azure Load Balancer probe.',
      'Then: **timeouts**, when a slow endpoint exceeds the HTTP setting’s request timeout, which shows as intermittent 502s on specific paths; **DNS**, when the backend is an FQDN and the gateway cannot resolve it through the VNet’s DNS servers; and **routing**, when a UDR on the App Gateway subnet sends return traffic somewhere else.',
      'I would confirm with the **access logs** in Log Analytics - they show which backend served each request and the backend status code - fix the specific cause, and add an alert on the unhealthy host count metric so we see it before users do.',
    ],
    code: [
      {
        title: 'Backend health, with the reason',
        language: 'bash',
        code: `az network application-gateway show-backend-health -g rg-edge -n agw-shop-prod \\
  --query "backendAddressPools[].backendHttpSettingsCollection[].servers[].{server:address, health:health, why:healthProbeLog}" \\
  -o table`,
      },
      {
        title: 'Access logs: which backends returned what?',
        language: 'text',
        code: `AGWAccessLogs
| where TimeGenerated > ago(1h)
| where HttpStatus == 502
| summarize count() by BackendPoolName, ServerRouted, ServerStatus, RequestUri
| order by count_ desc`,
        explanation:
          'Older setups in AzureDiagnostics mode store the same data with different column names, such as httpStatus_d.',
      },
      {
        title: 'A probe that matches the app',
        language: 'bash',
        code: `az network application-gateway probe create -g rg-edge --gateway-name agw-shop-prod \\
  -n probe-healthz --protocol Https --path /healthz --host-name-from-http-settings true \\
  --match-status-codes 200-399 --interval 30 --timeout 30 --threshold 3`,
      },
    ],
    diagrams: [
      {
        kind: 'flow',
        title: 'Tracing an Application Gateway 502',
        caption: 'Backend health tells you the reason; start there, not with the app.',
        nodes: [
          { label: 'Backend health: reason per server', tone: 'accent' },
          { label: 'Probe path, port, status codes', detail: 'Redirect or 401 counts as down' },
          { label: 'Backend TLS name and trusted root', detail: 'End-to-end TLS only' },
          { label: 'NSGs on both subnets', detail: 'GatewayManager ports, LB probe' },
          { label: 'Timeouts, DNS, UDRs', detail: 'Intermittent or path-specific' },
          { label: 'Alert on unhealthy host count', tone: 'success' },
        ],
      },
    ],
    deeper: [
      'App Gateway v2 requires inbound TCP 65200-65535 from the GatewayManager service tag on its subnet. Blocking it does not just break health; the gateway can go into a failed state.',
      'If every backend fails the probe at once after a certificate renewal, suspect the new certificate’s chain or name rather than the servers.',
      'The request timeout default is 20 seconds in HTTP settings; long-running endpoints need either a higher timeout on a separate setting or an async design.',
    ],
    traps: [
      'Restarting the backend VMs before looking at backend health.',
      'Leaving the default probe on an app whose root path redirects to a login page.',
      'Fixing it by switching end-to-end TLS off.',
    ],
    followUps: [
      'What does a 504 from Application Gateway mean instead?',
      'How would you monitor backend health proactively?',
    ],
    tags: ['scenario', 'application gateway', '502', 'troubleshooting', 'probes'],
  },
  {
    id: 'itv-aznet-19',
    level: 'basic',
    kind: 'mcq',
    prompt:
      'Which Azure service distributes traffic globally by answering DNS queries, and never proxies the client traffic itself?',
    options: [
      { id: 'a', text: 'Azure Front Door' },
      { id: 'b', text: 'Azure Traffic Manager' },
      { id: 'c', text: 'Azure Application Gateway' },
      { id: 'd', text: 'Cross-region Azure Load Balancer' },
    ],
    correct: ['b'],
    probing: 'Knowing how each global option actually moves traffic.',
    answer: [
      '**Traffic Manager** is a DNS-based load balancer. It returns the address of a healthy endpoint according to the routing method - priority, weighted, performance, geographic - and the client then connects to that endpoint directly.',
      'Front Door is a global **reverse proxy** that terminates connections at the edge. Application Gateway is a **regional** reverse proxy. The cross-region Load Balancer is a global layer-4 load balancer with an anycast IP - it does carry the traffic.',
    ],
    code: [
      {
        title: 'A priority profile with a low TTL',
        language: 'bash',
        code: `az network traffic-manager profile create -g rg-edge -n tm-shop \\
  --routing-method Priority --unique-dns-name tm-shop-contoso --ttl 30 \\
  --protocol HTTPS --port 443 --path /healthz`,
      },
    ],
    traps: ['Expecting instant failover from a DNS-based service.'],
    followUps: ['Why does a low TTL not guarantee fast failover?'],
    tags: ['traffic manager', 'dns', 'global load balancing'],
  },
  {
    id: 'itv-aznet-20',
    level: 'advanced',
    kind: 'scenario',
    prompt:
      'The network team switched every spoke VNet to use two domain controllers as custom DNS servers. Since then, some VMs cannot resolve private endpoint names and AKS pods intermittently fail DNS lookups. Walk me through it.',
    probing:
      'DNS architecture in a hybrid estate: what changes when you leave Azure DNS, how clients pick up DNS settings, and where the Private Resolver fits.',
    answer: [
      'When a VNet uses the Azure-provided DNS, clients query `168.63.129.16`, which sees every private DNS zone linked to the VNet. Switching to **custom DNS servers** means clients now ask the domain controllers, and the DCs only know private zones if **they** forward to Azure DNS - and only zones linked to the VNet the DCs live in. So first: do the DCs have a **forwarder** to `168.63.129.16`, or conditional forwarders to a **Private Resolver inbound endpoint**, for the `privatelink` and public service zones? And are the private zones linked to the DCs’ VNet?',
      'Second, **reachability**: can every spoke reach the DCs on TCP and UDP 53? NSGs, firewall rules in the hub and UDRs all apply to DNS traffic now, because it leaves the subnet. Intermittent failures are often **one of the two DCs** being unreachable or overloaded - clients try the first server, time out, then the second, which shows up as slow or failed lookups.',
      'Third, **clients pick up DNS settings from DHCP**. VMs need a renewal or restart to use the new servers; some will still be on the old ones, which explains "some VMs". For AKS, **CoreDNS** forwards to the node’s upstream servers, and the nodes also need a reimage or restart to pick up the change; heavy pod DNS load against the DCs is a common cause of intermittent timeouts.',
      'The cleaner design is usually to keep Azure-native resolution and use the **Azure DNS Private Resolver**: VNets keep Azure DNS, an **outbound endpoint** with a **forwarding ruleset** sends only the on-premises domain - `corp.contoso.com` - to the DCs, and on-premises forwards Azure zones to the inbound endpoint. That removes the DCs from the path for every Azure lookup.',
    ],
    code: [
      {
        title: 'Check what a VM is really using and where it resolves',
        language: 'bash',
        code: `# On a Linux VM
resolvectl status | grep -A2 'DNS Servers'
dig +short stshopprod.blob.core.windows.net @10.0.5.4      # via DC 1
dig +short stshopprod.blob.core.windows.net @168.63.129.16 # via Azure DNS directly

# From AKS: test resolution inside the cluster
kubectl run dnstest --rm -it --image=busybox:1.36 --restart=Never -- \\
  nslookup stshopprod.blob.core.windows.net`,
      },
      {
        title: 'Private Resolver: forward only the corporate domain to the DCs',
        language: 'bash',
        code: `az dns-resolver forwarding-ruleset create -g rg-dns -n frs-hub \\
  --outbound-endpoints '[{id:<outbound-endpoint-id>}]' -l uksouth

az dns-resolver forwarding-rule create -g rg-dns --ruleset-name frs-hub -n corp \\
  --domain-name "corp.contoso.com." \\
  --target-dns-servers '[{ip-address:10.0.5.4,port:53},{ip-address:10.0.5.5,port:53}]'

az dns-resolver vnet-link create -g rg-dns --ruleset-name frs-hub -n link-shop \\
  --id /subscriptions/<sub-id>/resourceGroups/rg-shop/providers/Microsoft.Network/virtualNetworks/vnet-shop-prod-uks`,
        placeholders: ['<outbound-endpoint-id>', '<sub-id>'],
      },
    ],
    diagrams: [
      {
        kind: 'sequence',
        title: 'Spoke VM resolving an on-premises name',
        caption: 'Azure DNS stays the resolver; only the corporate domain is forwarded.',
        participants: [
          { id: 'vm', label: 'Spoke VM' },
          { id: 'azure', label: 'Azure DNS' },
          { id: 'out', label: 'Resolver outbound' },
          { id: 'dc', label: 'Domain controller' },
        ],
        messages: [
          { from: 'vm', to: 'azure', label: 'db01.corp.contoso.com?' },
          { from: 'azure', to: 'out', label: 'Ruleset match: corp.contoso.com' },
          { from: 'out', to: 'dc', label: 'Forward query' },
          { from: 'dc', to: 'out', label: 'A 192.168.10.20', kind: 'return' },
          { from: 'out', to: 'vm', label: '192.168.10.20', kind: 'return' },
        ],
      },
    ],
    deeper: [
      '`168.63.129.16` is only reachable from inside Azure. On-premises servers cannot forward to it directly, which is why the Private Resolver inbound endpoint exists.',
      'Pod DNS traffic is heavy - every lookup of a short name tries several search domains first. Azure DNS applies a per-VM query rate limit and a pair of DCs has finite capacity, so node-local DNS caching and fully qualified names reduce both the load and the intermittent timeouts.',
    ],
    traps: [
      'Forgetting the DCs must forward to Azure DNS for private zones.',
      'Expecting running VMs and AKS nodes to pick up new DNS servers immediately.',
      'Blocking port 53 at the hub firewall between spokes and the DCs.',
    ],
    followUps: [
      'Why can on-premises DNS servers not forward to 168.63.129.16?',
      'How would you make DNS highly available in this design?',
    ],
    tags: ['scenario', 'dns', 'dns private resolver', 'troubleshooting', 'hybrid'],
  },
]
