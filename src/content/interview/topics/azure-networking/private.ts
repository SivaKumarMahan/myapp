import type { InterviewQuestion } from '../../../types'

/** Private access to PaaS: service endpoints, private endpoints, private DNS and Bastion. */
export const azureNetworkingPrivateQuestions: InterviewQuestion[] = [
  {
    id: 'itv-aznet-11',
    level: 'intermediate',
    kind: 'open',
    prompt: 'Compare service endpoints and private endpoints. When would you use each?',
    probing:
      'A very common design question. They want the mechanism difference - optimised route versus a private IP in your VNet - and its consequences for on-premises and exfiltration.',
    answer: [
      'A **service endpoint** is a subnet setting. Traffic from that subnet to a service such as Storage or SQL still goes to the service’s **public endpoint**, but over the Azure backbone with the subnet’s identity attached, so the service firewall can say "only allow this subnet". The service keeps its public IP; your VNet gets no new address.',
      'A **private endpoint** is a network interface **in your subnet with a private IP**, mapped to one specific resource - one storage account, one SQL server, one Key Vault. Clients connect to that private IP, and you can then **disable public network access** on the resource completely.',
      'The differences that matter: private endpoints work from **on-premises and peered VNets** over VPN or ExpressRoute, service endpoints only from the enabled subnets in Azure. Private endpoints map to **one resource**, which limits data exfiltration - a compromised VM cannot use it to reach an attacker’s storage account - whereas a service endpoint reaches the whole service unless you add service endpoint policies. Private endpoints cost per hour and per GB, and they need **private DNS** to work; service endpoints are free and need no DNS changes.',
      'My default for production is **private endpoints with public access disabled**. I would use service endpoints for simpler, cost-sensitive cases where only Azure-hosted clients in known subnets need access.',
    ],
    diagrams: [
      {
        kind: 'decision',
        title: 'Service endpoint or private endpoint?',
        caption:
          'Private endpoints give a private IP for one resource; service endpoints keep the public IP.',
        question: 'What must the access pattern support?',
        branches: [
          {
            condition: 'On-premises or peered clients',
            result: 'Private endpoint',
            tone: 'accent',
          },
          {
            condition: 'Disable public access entirely',
            result: 'Private endpoint',
            detail: 'Plus private DNS zone',
            tone: 'accent',
          },
          {
            condition: 'Only Azure subnets, keep it free',
            result: 'Service endpoint',
            detail: 'Plus the service firewall rule',
            tone: 'success',
          },
          {
            condition: 'Stop exfiltration to other accounts',
            result: 'Private endpoint or SE policy',
            tone: 'warning',
          },
        ],
      },
    ],
    code: [
      {
        title: 'The two approaches side by side',
        language: 'bash',
        code: `# Service endpoint: a subnet setting plus a firewall rule on the account
az network vnet subnet update -g rg-shop --vnet-name vnet-shop-prod-uks -n snet-app \\
  --service-endpoints Microsoft.Storage
az storage account network-rule add -g rg-shop --account-name stshopprod \\
  --vnet-name vnet-shop-prod-uks --subnet snet-app

# Private endpoint: a NIC in your subnet for this one account's blob service
az network private-endpoint create -g rg-shop -n pe-stshopprod-blob \\
  --vnet-name vnet-shop-prod-uks --subnet snet-pe \\
  --private-connection-resource-id $(az storage account show -g rg-shop -n stshopprod --query id -o tsv) \\
  --group-id blob --connection-name stshopprod-blob
az storage account update -g rg-shop -n stshopprod --public-network-access Disabled`,
      },
    ],
    traps: [
      'Saying a service endpoint gives the service a private IP.',
      'Creating a private endpoint and leaving public access enabled.',
      'Forgetting a private endpoint is per sub-resource - blob, file, queue and dfs each need their own.',
    ],
    followUps: [
      'Why does a private endpoint need DNS changes and a service endpoint does not?',
      'What are service endpoint policies?',
    ],
    tags: ['private endpoints', 'service endpoints', 'private link', 'paas'],
  },
  {
    id: 'itv-aznet-12',
    level: 'advanced',
    kind: 'open',
    prompt:
      'Explain how DNS works with private endpoints, including for clients on-premises. What does a correct setup look like at scale?',
    probing:
      'The part of private endpoints that actually breaks. They want the CNAME chain, privatelink zones, zone links, and the Private Resolver for hybrid.',
    answer: [
      'When you create a private endpoint for `stshopprod.blob.core.windows.net`, Azure changes the **public** DNS so that name becomes a **CNAME** to `stshopprod.privatelink.blob.core.windows.net`. Anyone on the internet still resolves that onward to the public IP. The trick is to make **your** clients resolve the privatelink name to the private IP instead.',
      'That is done with an **Azure Private DNS zone** named `privatelink.blob.core.windows.net`, containing an A record for `stshopprod` pointing at the private endpoint IP - created automatically if you attach a **private DNS zone group** to the endpoint. The zone must be **linked** to the VNets whose clients should resolve it. Clients using the Azure-provided resolver, `168.63.129.16`, then follow the CNAME into the private zone and get the private IP.',
      'At scale, the landing zone pattern is: **one set of privatelink zones centrally** in the connectivity subscription, linked to the hub and every spoke, with Azure Policy that automatically adds a zone group to every new private endpoint. Teams never create their own zones, which avoids the classic failure where two copies of the same zone exist and one of them has no record.',
      'For **on-premises**, clients use on-premises DNS, which cannot see private zones. I would deploy an **Azure DNS Private Resolver** in the hub with an **inbound endpoint**, and on the on-premises DNS servers add **conditional forwarders** for the privatelink zones - or the public service zones like `blob.core.windows.net` - pointing at that inbound endpoint IP. Spokes that need to resolve on-premises names use an **outbound endpoint** with a forwarding ruleset.',
    ],
    diagrams: [
      {
        kind: 'sequence',
        title: 'An on-premises client resolving a private endpoint',
        caption: 'The CNAME is public; the private answer only comes from the linked private zone.',
        participants: [
          { id: 'client', label: 'On-prem client' },
          { id: 'onprem', label: 'On-prem DNS' },
          { id: 'resolver', label: 'Private Resolver' },
          { id: 'azdns', label: 'Azure DNS + private zone' },
        ],
        messages: [
          { from: 'client', to: 'onprem', label: 'stshopprod.blob.core.windows.net?' },
          { from: 'onprem', to: 'resolver', label: 'Conditional forward to inbound IP' },
          { from: 'resolver', to: 'azdns', label: 'Resolve via 168.63.129.16' },
          {
            from: 'azdns',
            to: 'resolver',
            label: 'CNAME privatelink, A 10.20.2.5',
            kind: 'return',
          },
          { from: 'resolver', to: 'onprem', label: '10.20.2.5', kind: 'return' },
          { from: 'onprem', to: 'client', label: '10.20.2.5', kind: 'return' },
        ],
      },
    ],
    code: [
      {
        title: 'Private endpoint with a DNS zone group, in Bicep',
        language: 'bicep',
        code: `resource pe 'Microsoft.Network/privateEndpoints@2024-01-01' = {
  name: 'pe-\${storage.name}-blob'
  location: location
  properties: {
    subnet: { id: peSubnetId }
    privateLinkServiceConnections: [
      {
        name: 'blob'
        properties: { privateLinkServiceId: storage.id, groupIds: [ 'blob' ] }
      }
    ]
  }
}

// The central zone lives in the connectivity subscription, linked to hub and spokes
resource zoneGroup 'Microsoft.Network/privateEndpoints/privateDnsZoneGroups@2024-01-01' = {
  parent: pe
  name: 'default'
  properties: {
    privateDnsZoneConfigs: [
      { name: 'blob', properties: { privateDnsZoneId: centralBlobZoneId } }
    ]
  }
}`,
      },
      {
        title: 'On-premises Windows DNS: forward the zone to the resolver',
        language: 'powershell',
        code: `Add-DnsServerConditionalForwarderZone -Name "blob.core.windows.net" \`
    -MasterServers 10.0.4.4 -ReplicationScope Forest

Resolve-DnsName stshopprod.blob.core.windows.net   # expect 10.20.2.5 via privatelink`,
        explanation: '10.0.4.4 is the Private Resolver inbound endpoint in the hub.',
      },
    ],
    deeper: [
      'Forward the **public** zone (`blob.core.windows.net`), not only the privatelink one. On-premises clients ask for the public name, and the resolver follows the CNAME for them; forwarding only privatelink zones is a common reason on-premises resolution returns the public IP.',
      'If a VNet uses **custom DNS servers**, those servers must forward to `168.63.129.16` (or the Private Resolver), otherwise linked private zones are invisible to its clients.',
      'Some services need several zones - Azure Monitor Private Link Scope, AKS private clusters, Container Apps environments - and region-specific zone names, so a policy-driven central zone list saves a lot of confusion.',
    ],
    traps: [
      'Creating a separate privatelink zone per team or per spoke.',
      'Forgetting the zone link to the VNet where the client is.',
      'Connecting to the privatelink FQDN directly instead of the normal name - TLS certificates are issued for the normal name.',
    ],
    followUps: [
      'Why must you keep connecting to the public FQDN, not the privatelink one?',
      'How would you automate zone group creation for every new private endpoint?',
    ],
    tags: ['private endpoints', 'private dns', 'dns private resolver', 'hybrid'],
  },
  {
    id: 'itv-aznet-13',
    level: 'advanced',
    kind: 'scenario',
    prompt:
      'You added a private endpoint to a storage account and disabled public access. Now the app in a spoke VNet gets 403 "This request is not authorized to perform this operation". nslookup shows a public IP. Fix it.',
    probing:
      'Structured private endpoint troubleshooting: the 403 is a symptom of DNS returning the public IP, so traffic arrives on the disabled public endpoint.',
    answer: [
      'The 403 is a symptom, not the cause. Because DNS returns the **public IP**, the app is hitting the storage account’s public endpoint, which is now disabled - so storage rejects it with an authorisation-style error. The private endpoint itself may be fine. The fix is in **DNS**.',
      'I check in order. Does **nslookup** from the app’s network show the CNAME to `privatelink.blob.core.windows.net`? If not, the endpoint may not be approved or created for the `blob` sub-resource. Does a **private DNS zone** `privatelink.blob.core.windows.net` exist with an **A record** for the account? If the endpoint has no zone group, nobody created one. Is that zone **linked to the spoke VNet** - or, if the VNet uses custom DNS servers pointing at the hub, is it linked where those servers resolve?',
      'Then **which resolver the app uses**. An App Service app with VNet integration uses the VNet’s DNS settings; a VM with custom DNS uses those servers. If the custom DNS servers do not forward to `168.63.129.16` or the Private Resolver, private zones are invisible. And duplicate zones are a classic: a second `privatelink.blob.core.windows.net` zone linked to the same VNet with no record for this account.',
      'Once DNS returns the private IP, I confirm with a real call, then check that NSGs on the private endpoint subnet - if network policies are enabled - allow the traffic. Finally I make it permanent with the central zone and the policy that creates zone groups automatically.',
    ],
    code: [
      {
        title: 'Walk the DNS chain from where the app runs',
        language: 'bash',
        code: `# From the VM, or the App Service Kudu console / SSH
nslookup stshopprod.blob.core.windows.net
#   Good:  CNAME stshopprod.privatelink.blob.core.windows.net -> 10.20.2.5
#   Bad:   ... -> 20.x.x.x (public)

# Is there an A record, and is the zone linked to this VNet?
az network private-dns record-set a list -g rg-dns -z privatelink.blob.core.windows.net -o table
az network private-dns link vnet list -g rg-dns -z privatelink.blob.core.windows.net \\
  --query "[].{name:name, vnet:virtualNetwork.id, state:virtualNetworkLinkState}" -o table

# Which DNS servers does the VNet hand out?
az network vnet show -g rg-shop -n vnet-shop-prod-uks --query dhcpOptions.dnsServers

# Is the endpoint approved, and does it have a zone group?
az network private-endpoint show -g rg-shop -n pe-stshopprod-blob \\
  --query "{status:privateLinkServiceConnections[0].privateLinkServiceConnectionState.status, ip:customDnsConfigs[0].ipAddresses}"
az network private-endpoint dns-zone-group list -g rg-shop --endpoint-name pe-stshopprod-blob -o table`,
      },
      {
        title: 'Fix: link the central zone to the spoke',
        language: 'bash',
        code: `az network private-dns link vnet create -g rg-dns \\
  -z privatelink.blob.core.windows.net -n link-shop-prod \\
  -v /subscriptions/<sub-id>/resourceGroups/rg-shop/providers/Microsoft.Network/virtualNetworks/vnet-shop-prod-uks \\
  --registration-enabled false`,
        placeholders: ['<sub-id>'],
      },
    ],
    diagrams: [
      {
        kind: 'flow',
        title: 'Private endpoint returns a public IP',
        caption:
          'The 403 comes from the disabled public endpoint. Fix DNS, not the storage account.',
        nodes: [
          { label: 'nslookup from the client', tone: 'accent' },
          {
            label: 'CNAME to privatelink?',
            branch: { label: 'No: endpoint missing or pending', tone: 'warning' },
          },
          {
            label: 'A record in the private zone?',
            branch: { label: 'No: add a zone group', tone: 'warning' },
          },
          {
            label: 'Zone linked to client VNet?',
            branch: { label: 'No: create the link', tone: 'warning' },
          },
          { label: 'Custom DNS forwards to Azure?', detail: '168.63.129.16 or resolver' },
          { label: 'Private IP returned, call succeeds', tone: 'success' },
        ],
      },
    ],
    deeper: [
      'Clients cache DNS. After fixing the zone, restart the app or flush the cache, or you will think the fix did not work.',
      'Temporarily re-enabling public access to "make it work" hides the DNS bug and usually becomes permanent. Leave it disabled and fix resolution.',
    ],
    traps: [
      'Treating the 403 as an RBAC problem and adding roles.',
      'Re-enabling public network access as the fix.',
      'Editing the hosts file on one VM.',
    ],
    followUps: [
      'How would this differ for an on-premises client?',
      'What does a duplicate private DNS zone look like in practice?',
    ],
    tags: ['scenario', 'private endpoints', 'private dns', 'troubleshooting', 'dns'],
  },
  {
    id: 'itv-aznet-14',
    level: 'intermediate',
    kind: 'multi',
    prompt: 'Which statements about Azure private endpoints are true? Select all that apply.',
    options: [
      { id: 'a', text: 'The endpoint gets a private IP address from a subnet in your VNet' },
      {
        id: 'b',
        text: 'Creating a private endpoint automatically disables the resource’s public endpoint',
      },
      {
        id: 'c',
        text: 'It is reachable from peered VNets and from on-premises over VPN or ExpressRoute',
      },
      {
        id: 'd',
        text: 'NSGs and UDRs can apply to private endpoint traffic when network policies are enabled on the subnet',
      },
      {
        id: 'e',
        text: 'One private endpoint gives access to every storage account in the region',
      },
    ],
    correct: ['a', 'c', 'd'],
    probing: 'The facts that decide whether a private endpoint design is actually private.',
    answer: [
      'A private endpoint is a NIC with a **private IP in your subnet**, it is reachable from **anywhere routed to that subnet** - peered VNets and on-premises included - and since network policies for private endpoints became available, **NSGs and UDRs can be applied** to its traffic if you enable them on the subnet.',
      'It does **not** disable public access by itself; you must set public network access to disabled on the resource. And it maps to **one resource and sub-resource** - which is exactly why it protects against exfiltration to other accounts.',
    ],
    code: [
      {
        title: 'Enable network policies for private endpoints on a subnet',
        language: 'bash',
        code: `az network vnet subnet update -g rg-shop --vnet-name vnet-shop-prod-uks -n snet-pe \\
  --private-endpoint-network-policies Enabled`,
      },
    ],
    traps: ['Assuming the resource is private because a private endpoint exists.'],
    followUps: ['What does a private endpoint cost, and when does that matter?'],
    tags: ['private endpoints', 'nsg', 'private link'],
  },
  {
    id: 'itv-aznet-15',
    level: 'basic',
    kind: 'open',
    prompt: 'What is Azure Bastion and why would you use it instead of public IPs on VMs?',
    probing:
      'Secure admin access basics: no public IPs, no open RDP or SSH ports, and awareness of the SKUs and subnet requirements.',
    answer: [
      '**Azure Bastion** is a managed service that gives you **RDP and SSH to VMs over TLS** from the Azure portal or the native client, without the VMs having **public IPs** and without opening ports 3389 or 22 to the internet. You deploy it once, typically in the hub, and it reaches VMs in that VNet and in peered VNets.',
      'The security benefit is attack surface. Open RDP and SSH ports on public IPs are scanned and brute-forced constantly. With Bastion the only exposed thing is a Microsoft-managed service authenticated by Entra ID and Azure RBAC, and you can combine it with Just-in-Time access and Conditional Access.',
      'Practical details: it needs a dedicated subnet named **AzureBastionSubnet**, a `/26` or larger. The **Basic** SKU covers portal connections; **Standard** adds native client support for `az network bastion ssh` and `rdp`, file transfer, IP-based connections and scaling; **Premium** adds session recording and private-only deployments; and a **Developer** SKU offers a free, limited option for dev and test.',
    ],
    code: [
      {
        title: 'Deploy Bastion and connect with the native client',
        language: 'bash',
        code: `az network public-ip create -g rg-hub -n pip-bastion --sku Standard
az network bastion create -g rg-hub -n bas-hub-uks \\
  --vnet-name vnet-hub-uks --public-ip-address pip-bastion \\
  --sku Standard --enable-tunneling true

# SSH with Entra ID auth to a VM in a peered spoke
az network bastion ssh -g rg-hub -n bas-hub-uks \\
  --target-resource-id $(az vm show -g rg-shop -n vm-app-01 --query id -o tsv) \\
  --auth-type AAD`,
      },
    ],
    traps: [
      'Naming the subnet anything other than AzureBastionSubnet.',
      'Blocking Bastion with an NSG on the VM subnet that does not allow 22 or 3389 from the Bastion subnet range.',
    ],
    followUps: [
      'What NSG rules does AzureBastionSubnet need if you attach one?',
      'How would you give admins access for only two hours?',
    ],
    tags: ['bastion', 'remote access', 'security'],
  },
]
