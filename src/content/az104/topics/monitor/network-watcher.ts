import type { Topic } from '../../../types'

export const networkWatcher: Topic = {
  id: 'az1-network-watcher',
  title: 'Network Watcher: diagnose, monitor and log network traffic',
  domainId: 'az1-monitor',
  difficulty: 'intermediate',
  estimatedMinutes: 30,
  order: 2,
  tags: [
    'network-watcher',
    'ip-flow-verify',
    'next-hop',
    'connection-troubleshoot',
    'connection-monitor',
    'flow-logs',
    'traffic-analytics',
    'packet-capture',
  ],
  oneLiner:
    'The regional toolbox that tells you which NSG rule blocked a packet, where a route sends it, and what traffic actually flowed.',
  explanation: [
    '**Azure Network Watcher** is a regional service that gives you diagnostic and logging tools for IaaS networking: virtual networks, NICs, NSGs, route tables, VPN gateways and the VMs that sit on them. It does not monitor PaaS services such as App Service directly; it looks at the network plumbing underneath your VMs.',
    'You rarely create it yourself. When you create or update a virtual network in a region, Azure **automatically enables Network Watcher** for that region by creating a resource called `NetworkWatcher_<region>` in a resource group named `NetworkWatcherRG`. There is one Network Watcher per region per subscription, and it is free to have enabled; you pay for what the tools produce (flow log storage, traffic analytics processing, Connection Monitor tests).',
    'The tools fall into three groups. **Diagnostics** answer a question right now: **IP flow verify** (is this 5-tuple allowed, and by which NSG rule?), **next hop** (where does a route send this packet?), **effective security rules** (the merged NSG rules on a NIC), **connection troubleshoot** (can A reach B end to end?), **VPN troubleshoot** and **packet capture**. **Monitoring** watches over time: **Connection Monitor** and **topology**. **Logging** records what happened: **flow logs** and **traffic analytics**.',
    'Several VM-level tools, including packet capture, connection troubleshoot and Connection Monitor with an Azure VM source, rely on the **Network Watcher Agent VM extension** (`NetworkWatcherAgentWindows` or `NetworkWatcherAgentLinux`). IP flow verify, next hop and effective security rules read the platform configuration, so they work without the agent.',
  ],
  whyItMatters: [
    'AZ-104 tests Network Watcher as a set of scenario questions: "a VM cannot reach X, which tool identifies the NSG rule responsible?" (IP flow verify) or "traffic is going to the wrong appliance" (next hop). Picking the right tool is most of the marks.',
    'In real operations these tools cut a network incident from hours of guessing to minutes. Instead of reading dozens of NSG rules across subnet and NIC, you ask the platform which rule matched, and it names it.',
    'Flow logs are also a compliance and security control. Auditors ask "show me what talked to the payment subnet last month", and flow logs plus traffic analytics are how you answer. Knowing that NSG flow logs are being retired in favour of VNet flow logs keeps your designs current.',
  ],
  howItWorks: [
    'Network Watcher is enabled per region. Check it with `az network watcher list`; if a region is missing, `az network watcher configure -l <region> -g NetworkWatcherRG --enabled true` turns it on. Deleting `NetworkWatcherRG` disables it, and many tools then fail with a "Network Watcher not found" error.',
    '**IP flow verify** takes a direction, protocol, local IP and port, and remote IP and port for a VM NIC. It evaluates the effective NSG rules (subnet NSG plus NIC NSG) and returns **Allow** or **Deny** plus the **name of the rule** that made the decision, for example `defaultSecurityRules/DenyAllInBound`. It only evaluates NSGs, not UDRs, Azure Firewall or guest OS firewalls.',
    '**Next hop** takes a source VM and a destination IP and returns the **next hop type** (Internet, VirtualAppliance, VirtualNetworkGateway, VnetLocal, VNetPeering, VirtualNetworkServiceEndpoint or None) and the **route table ID** that supplied the route, or "System Route". Use it when a user-defined route is sending traffic somewhere unexpected.',
    '**Effective security rules** show the combined, prioritised NSG rules that actually apply to a NIC, including default rules and expanded service tags. **Effective routes** (`az network nic show-effective-route-table`) do the same for routing. These are the first two things to read when a VM behaves oddly.',
    '**Connection troubleshoot** tests a one-time connection from a VM, VM scale set instance, Application Gateway or Bastion host to another VM, FQDN, URI or IP and port. It reports reachable or unreachable, latency, each hop, and detected issues such as an NSG block, a UDR, DNS resolution failure or high guest CPU. **Connection Monitor** is the ongoing version: test groups of sources, destinations and test configurations run on a schedule, results land in Log Analytics, and metrics such as checks failed percent and round-trip time drive alerts. It replaces the retired classic Connection Monitor and Network Performance Monitor.',
    '**Flow logs** record IP traffic metadata (5-tuple, allow or deny, bytes and packets) as JSON in a storage account in the same region. **VNet flow logs** are the current type and can target a whole VNet, a subnet or a NIC. **NSG flow logs** are being retired: new NSG flow logs cannot be created since 30 June 2025 and existing ones stop working on 30 September 2027, so migrate them to VNet flow logs. **Traffic analytics** processes flow logs into a Log Analytics workspace every 10 or 60 minutes and shows top talkers, open ports, malicious IPs and geo maps.',
    '**Packet capture** records packets on a VM (or scale set instance) into a storage account or local file as a `.cap` file you open in Wireshark, with filters and time or size limits. **Topology** draws the resources in a subscription, region or resource group and how they connect.',
  ],
  diagrams: [
    {
      kind: 'decision',
      title: 'Which Network Watcher tool answers it?',
      caption:
        'Match the question in the scenario to the tool. Most exam questions hinge on IP flow verify versus next hop.',
      question: 'What do you need to find out?',
      branches: [
        {
          condition: 'Which NSG rule allows or denies a flow',
          result: 'IP flow verify',
          detail: 'Returns Allow or Deny and the rule name',
          tone: 'accent',
        },
        {
          condition: 'Where a route sends a packet',
          result: 'Next hop',
          detail: 'Returns hop type and route table ID',
        },
        {
          condition: 'Whether A can reach B end to end now',
          result: 'Connection troubleshoot',
          detail: 'One-off test with hops and latency',
        },
        {
          condition: 'Reachability and latency over time',
          result: 'Connection Monitor',
          detail: 'Scheduled tests, Log Analytics, alerts',
        },
        {
          condition: 'What traffic actually flowed',
          result: 'VNet flow logs and traffic analytics',
          detail: 'Stored in a storage account and workspace',
          tone: 'success',
        },
      ],
    },
    {
      kind: 'flow',
      title: 'Troubleshooting an unreachable VM',
      caption:
        'Work from the cheapest, most specific check to the broadest. Each step either finds the cause or rules a layer out.',
      nodes: [
        {
          label: 'VM cannot reach a destination',
          detail: 'Confirm IPs, ports and the direction',
          tone: 'warning',
        },
        {
          label: 'IP flow verify',
          detail: 'Is an NSG rule denying the 5-tuple?',
          arrowLabel: 'check NSGs',
          branch: { label: 'Deny', detail: 'Fix or add a higher priority rule', tone: 'danger' },
        },
        {
          label: 'Next hop',
          detail: 'Is a UDR sending it to an NVA or None?',
          arrowLabel: 'check routes',
          branch: { label: 'Wrong hop', detail: 'Fix the route table', tone: 'danger' },
        },
        {
          label: 'Connection troubleshoot',
          detail: 'End-to-end test, DNS and hop latency',
          arrowLabel: 'test the path',
        },
        {
          label: 'Packet capture or flow logs',
          detail: 'Inspect real packets and flows',
          tone: 'success',
        },
      ],
    },
  ],
  keyObjects: [
    {
      kind: 'Network Watcher (Microsoft.Network/networkWatchers)',
      apiVersion: '2024-05-01',
      purpose:
        'The regional instance that hosts every Network Watcher tool. One per region per subscription, created automatically in NetworkWatcherRG.',
      fields: [
        {
          path: 'name',
          meaning: 'Auto-created as NetworkWatcher_<region>, for example NetworkWatcher_eastus.',
        },
        {
          path: 'location',
          meaning: 'The region it serves. Tools only work on resources in that region.',
          required: true,
        },
        {
          path: 'resourceGroup',
          meaning: 'NetworkWatcherRG by default. Deleting it disables Network Watcher.',
        },
      ],
    },
    {
      kind: 'Flow log (Microsoft.Network/networkWatchers/flowLogs)',
      apiVersion: '2024-05-01',
      purpose:
        'Records traffic metadata for a target VNet, subnet or NIC (or a legacy NSG) into a storage account, optionally feeding traffic analytics.',
      fields: [
        {
          path: 'properties.targetResourceId',
          meaning: 'The VNet, subnet or NIC being logged. NSG targets can no longer be created.',
          required: true,
        },
        {
          path: 'properties.storageId',
          meaning: 'Storage account for the JSON logs. Must be in the same region as the target.',
          required: true,
        },
        {
          path: 'properties.retentionPolicy.days',
          meaning:
            'Days to keep log blobs (0 keeps them indefinitely). Needs a supported account type.',
        },
        {
          path: 'properties.flowAnalyticsConfiguration.networkWatcherFlowAnalyticsConfiguration',
          meaning:
            'Traffic analytics settings: enabled, workspace resource ID, and trafficAnalyticsInterval of 10 or 60 minutes.',
        },
      ],
    },
    {
      kind: 'Connection monitor (Microsoft.Network/networkWatchers/connectionMonitors)',
      apiVersion: '2024-05-01',
      purpose:
        'Continuous reachability and latency testing between endpoints in Azure and on-premises, with results in Log Analytics.',
      fields: [
        {
          path: 'properties.endpoints',
          meaning: 'Sources and destinations: VMs, subnets, FQDNs, IPs.',
        },
        {
          path: 'properties.testConfigurations',
          meaning: 'Protocol (TCP, HTTP, ICMP), port, frequency and success thresholds.',
        },
        {
          path: 'properties.testGroups',
          meaning: 'Bind sources, destinations and test configurations together.',
        },
        {
          path: 'properties.outputs',
          meaning: 'The Log Analytics workspace that receives test results.',
        },
      ],
    },
    {
      kind: 'Network Watcher Agent VM extension',
      purpose:
        'Guest agent that lets packet capture, connection troubleshoot and Connection Monitor run tests from inside a VM.',
      fields: [
        {
          path: 'publisher',
          meaning: 'Microsoft.Azure.NetworkWatcher',
        },
        {
          path: 'type',
          meaning: 'NetworkWatcherAgentWindows or NetworkWatcherAgentLinux.',
        },
      ],
    },
  ],
  realWorldExample: {
    title: 'The firewall that was not the problem',
    story: [
      'A retailer moved its order API VMs behind a new hub-and-spoke design. On go-live morning the API could not reach the payment provider, and the network team spent an hour convinced the provider had blocked them.',
      'An administrator ran IP flow verify for outbound TCP 443 from the API VM to the provider IP. It returned Allow by the rule AllowInternetOutBound, which ruled out every NSG in one command. Next hop then returned VirtualAppliance with the ID of a route table the spoke team had attached, pointing 0.0.0.0/0 at the hub firewall.',
      'The firewall had no application rule for the provider FQDN. One rule later, connection troubleshoot showed Reachable with normal latency. The team then added a Connection Monitor test from the API subnet to the provider on port 443, alerting on checks failed percent, so the next routing change would page someone before customers noticed.',
      'The lesson they wrote up: prove each layer with a tool instead of arguing about it. NSG, route, then path.',
    ],
  },
  yamlExamples: [
    {
      title: 'KQL: denied flows from traffic analytics',
      language: 'text',
      explanation:
        'Traffic analytics writes VNet flow log data to the NTANetAnalytics table. This query lists the top sources whose flows were denied in the last day.',
      code: `NTANetAnalytics
| where TimeGenerated > ago(1d)
| where SubType == "FlowLog" and FlowStatus == "Denied"
| summarize DeniedFlows = count() by SrcIp, DestIp, DestPort, L4Protocol
| top 20 by DeniedFlows desc`,
    },
    {
      title: 'IP flow verify result',
      language: 'json',
      explanation:
        'The answer names the rule. A default rule appears under defaultSecurityRules, a custom rule under securityRules.',
      code: `{
  "access": "Deny",
  "ruleName": "defaultSecurityRules/DenyAllInBound"
}`,
    },
    {
      title: 'Next hop result for a UDR',
      language: 'json',
      explanation:
        'A custom route is identified by its route table ID. A platform route shows "System Route" instead.',
      code: `{
  "nextHopIpAddress": "10.0.0.4",
  "nextHopType": "VirtualAppliance",
  "routeTableId": "/subscriptions/<sub-id>/resourceGroups/rg-spoke/providers/Microsoft.Network/routeTables/rt-spoke"
}`,
      placeholders: ['<sub-id>'],
    },
  ],
  imperative: [
    {
      command: 'az network watcher list -o table',
      what: 'Lists the Network Watcher instances in the subscription, one per enabled region.',
      expected: 'Rows such as NetworkWatcher_eastus in NetworkWatcherRG.',
    },
    {
      command: 'az network watcher configure -g NetworkWatcherRG -l eastus --enabled true',
      what: 'Enables Network Watcher in a region if it was not enabled automatically.',
    },
    {
      command:
        'az network watcher test-ip-flow -g <rg> --vm <vm> --direction Inbound --protocol TCP --local 10.20.1.4:22 --remote 203.0.113.50:50000',
      what: 'IP flow verify: tests one inbound 5-tuple against the effective NSG rules.',
      expected: 'access Deny, ruleName defaultSecurityRules/DenyAllInBound (or the matching rule).',
      placeholders: ['<rg>', '<vm>'],
    },
    {
      command:
        'az network watcher show-next-hop -g <rg> --vm <vm> --source-ip 10.20.1.4 --dest-ip 8.8.8.8',
      what: 'Next hop: shows the hop type and route table that decide where the packet goes.',
      expected: 'nextHopType Internet, routeTableId System Route.',
      placeholders: ['<rg>', '<vm>'],
    },
    {
      command: 'az network nic list-effective-nsg -g <rg> -n <nic>',
      what: 'Effective security rules: the merged subnet and NIC NSG rules applied to the NIC.',
      placeholders: ['<rg>', '<nic>'],
    },
    {
      command:
        'az network watcher test-connectivity -g <rg> --source-resource <vm> --dest-address www.microsoft.com --dest-port 443',
      what: 'Connection troubleshoot: a one-off end-to-end test with hops and latency.',
      expected: 'connectionStatus Reachable, plus a hops array and avgLatencyInMs.',
      placeholders: ['<rg>', '<vm>'],
    },
    {
      command:
        'az network watcher flow-log create -g <rg> -l eastus -n fl-vnet --vnet <vnet> --storage-account <storage> --workspace <workspace-id> --traffic-analytics true --interval 10',
      what: 'Creates a VNet flow log with traffic analytics processing every 10 minutes.',
      placeholders: ['<rg>', '<vnet>', '<storage>', '<workspace-id>'],
    },
    {
      command:
        'az network watcher packet-capture create -g <rg> --vm <vm> -n cap1 --storage-account <storage> --time-limit 120',
      what: 'Starts a packet capture on the VM for up to 120 seconds, saved to blob storage.',
      placeholders: ['<rg>', '<vm>', '<storage>'],
    },
  ],
  declarative: {
    steps: [
      'Decide the target: VNet flow logs can log a whole VNet, a subnet or a single NIC.',
      'Create or reuse a storage account in the same region as the target, and a Log Analytics workspace for traffic analytics.',
      'Deploy the flow log as a child of the regional Network Watcher, which lives in NetworkWatcherRG, so deploy this file to that resource group.',
      'Enable traffic analytics with a 10-minute interval if you need near-real-time insights, 60 minutes to reduce cost.',
      'Verify with `az network watcher flow-log list -l <region>` and wait for blobs to appear in the insights-logs-flowlogflowevent container.',
    ],
    code: [
      {
        title: 'flowlog.bicep: VNet flow log with traffic analytics',
        language: 'bicep',
        explanation:
          'Deploy with az deployment group create -g NetworkWatcherRG -f flowlog.bicep, passing the resource IDs. The existing keyword references the auto-created Network Watcher instead of creating a new one.',
        code: `param location string = resourceGroup().location
param vnetId string
param storageAccountId string
param workspaceResourceId string

resource watcher 'Microsoft.Network/networkWatchers@2024-05-01' existing = {
  name: 'NetworkWatcher_\${location}'
}

resource vnetFlowLog 'Microsoft.Network/networkWatchers/flowLogs@2024-05-01' = {
  parent: watcher
  name: 'fl-\${last(split(vnetId, '/'))}'
  location: location
  properties: {
    targetResourceId: vnetId
    storageId: storageAccountId
    enabled: true
    format: {
      type: 'JSON'
      version: 2
    }
    retentionPolicy: {
      enabled: true
      days: 30
    }
    flowAnalyticsConfiguration: {
      networkWatcherFlowAnalyticsConfiguration: {
        enabled: true
        workspaceResourceId: workspaceResourceId
        trafficAnalyticsInterval: 10
      }
    }
  }
}`,
      },
    ],
  },
  verification: [
    {
      command: 'az network watcher flow-log list -l eastus -o table',
      what: 'Lists flow logs in the region with their target and enabled state.',
      expected: 'Your flow log with Enabled True and the VNet as target.',
    },
    {
      command:
        'az network watcher flow-log show -l eastus -n fl-vnet --query flowAnalyticsConfiguration',
      what: 'Confirms traffic analytics is enabled and pointing at the right workspace.',
    },
    {
      command: 'az network watcher packet-capture show-status -l eastus -n cap1',
      what: 'Shows whether a packet capture is running, stopped, and why it stopped.',
      expected: 'packetCaptureStatus Stopped with stopReason TimeExceeded after the limit.',
    },
    {
      command: 'az vm extension list -g <rg> --vm-name <vm> -o table',
      what: 'Checks the Network Watcher agent extension is installed before agent-based tests.',
      expected: 'NetworkWatcherAgentLinux or NetworkWatcherAgentWindows, Succeeded.',
      placeholders: ['<rg>', '<vm>'],
    },
  ],
  troubleshooting: [
    {
      command: 'az network watcher list --query "[].location" -o tsv',
      what: 'A tool fails with "Network Watcher not found": check the region is enabled.',
      expected: 'Your region is listed; if not, run az network watcher configure for it.',
      namespaceNote:
        'Someone deleting NetworkWatcherRG to tidy up is the usual cause. Re-enable the region.',
    },
    {
      command:
        'az vm extension set -g <rg> --vm-name <vm> --publisher Microsoft.Azure.NetworkWatcher --name NetworkWatcherAgentLinux',
      what: 'Packet capture or connection troubleshoot fails on a VM: install the agent extension.',
      placeholders: ['<rg>', '<vm>'],
    },
    {
      command: 'az network nic show-effective-route-table -g <rg> -n <nic> -o table',
      what: 'IP flow verify says Allow but traffic still fails: read the effective routes.',
      expected: 'A User route for 0.0.0.0/0 or the destination prefix explains the detour.',
      placeholders: ['<rg>', '<nic>'],
    },
    {
      command: 'az storage account show -n <storage> --query "{location:location, kind:kind}"',
      what: 'Flow log creation fails: confirm the storage account is in the same region as the target.',
      placeholders: ['<storage>'],
    },
  ],
  commonMistakes: [
    'Using next hop to find a blocking NSG rule. Next hop only reads routes; IP flow verify and effective security rules read NSGs.',
    'Assuming IP flow verify checks everything on the path. It evaluates NSGs only, not UDRs, Azure Firewall or the guest OS firewall.',
    'Deleting NetworkWatcherRG because it looks empty or unowned. That disables Network Watcher in every region it held.',
    'Creating new NSG flow logs in a design. New NSG flow logs are blocked; use VNet flow logs, which also cover a whole VNet or subnet.',
    'Putting the flow log storage account in a different region from the VNet. The storage account must be in the same region as the target.',
    'Expecting packet capture or connection troubleshoot to work on a VM without the Network Watcher Agent extension, or on a stopped VM.',
    'Building on classic Connection Monitor or Network Performance Monitor. Both are retired; Connection Monitor is the replacement.',
  ],
  examTips: [
    '"Which NSG rule is blocking traffic?" means **IP flow verify**. It returns Allow or Deny and names the rule.',
    '"Traffic is going to the wrong place" or "is a UDR in effect?" means **next hop**, which returns the next hop type and route table ID.',
    '"Monitor connectivity and latency between VMs or to on-premises over time, with alerts" means **Connection Monitor**. A one-time test is **connection troubleshoot**.',
    '"Record allowed and denied traffic for analysis" means **flow logs**; "visualise top talkers and malicious IPs" means **traffic analytics**, which needs a Log Analytics workspace.',
    'Network Watcher is **per region** and enabled automatically in NetworkWatcherRG. Tools cannot inspect resources in a region where it is not enabled.',
    'Remember the retirement dates: no new NSG flow logs since 30 June 2025, and NSG flow logs retire on 30 September 2027. Migrate to VNet flow logs.',
  ],
  summary: [
    'Network Watcher is a free, regional, auto-enabled toolbox in NetworkWatcherRG for IaaS networking.',
    'IP flow verify names the NSG rule that allows or denies a 5-tuple; next hop names the route that decides the path.',
    'Connection troubleshoot is a one-off end-to-end test; Connection Monitor tests continuously and alerts.',
    'VNet flow logs record traffic metadata to storage in the same region; traffic analytics turns them into insights in Log Analytics.',
    'Packet capture, connection troubleshoot and Connection Monitor from a VM need the Network Watcher Agent extension.',
  ],
  practice: [
    {
      id: 'az1-network-watcher-p1',
      level: 'beginner',
      prompt:
        'Users cannot RDP to a VM from the internet. You want to know which NSG rule is responsible in a single step. Which tool do you use?',
      answer:
        'IP flow verify, with direction Inbound, TCP, the VM private IP on port 3389 and a sample internet IP as remote. It returns Deny and the rule name.',
      explanation:
        'Next hop reads routes, not NSGs. Effective security rules shows all rules but leaves you to work out which one matches; IP flow verify does the evaluation for you.',
    },
    {
      id: 'az1-network-watcher-p2',
      level: 'intermediate',
      prompt:
        'IP flow verify returns Allow for outbound TCP 443, but the VM still cannot reach the website. What do you check next and why?',
      answer:
        'Run next hop to the destination IP. A user-defined route may send the traffic to a virtual appliance or to None, and IP flow verify does not evaluate routes.',
      explanation:
        'After routing, connection troubleshoot tests the full path including DNS and the destination listening on the port.',
    },
    {
      id: 'az1-network-watcher-p3',
      level: 'intermediate',
      prompt:
        'A security team wants flow logging for every subnet in a new VNet, analysed hourly in Log Analytics. What do you configure?',
      answer:
        'A VNet flow log targeting the VNet, a storage account in the same region, and traffic analytics enabled with a 60-minute interval to a Log Analytics workspace.',
      explanation:
        'NSG flow logs are not an option for new deployments, and one VNet flow log covers all subnets and NICs without a per-NSG setup.',
    },
    {
      id: 'az1-network-watcher-p4',
      level: 'advanced',
      prompt:
        'You must be alerted within minutes if latency from an Azure VM to an on-premises server rises, and keep the history. Which feature, and what does it need?',
      answer:
        'Connection Monitor with the Azure VM as source (Network Watcher Agent extension installed), the on-premises server as destination (with Azure Monitor Agent via Azure Arc if it is a source too), results sent to Log Analytics, and a metric alert on round-trip time.',
      explanation:
        'Connection troubleshoot is a single test with no history. Classic Connection Monitor and Network Performance Monitor are retired.',
    },
  ],
  lab: {
    title: 'Find the rule, find the route',
    scenario:
      'Build a small VM with no inbound access, prove with IP flow verify which default rule blocks SSH, open it for one IP, then send internet traffic to a black-hole route and catch it with next hop.',
    prerequisites: [
      'An Azure subscription (free account works) and Azure Cloud Shell (Bash) or Azure CLI 2.60+',
      'Permission to create resource groups, VNets and VMs',
    ],
    tasks: [
      {
        instruction:
          'Create resource group rg-nw-lab in eastus, a VNet 10.20.0.0/16 with subnet app 10.20.1.0/24, and a Standard_B1s Ubuntu VM with no public IP and no NSG rule.',
        hint: 'Use --public-ip-address "" and --nsg-rule NONE on az vm create.',
      },
      {
        instruction: 'Confirm Network Watcher is enabled for eastus.',
        hint: 'az network watcher list. It is usually created for you when the VNet is.',
      },
      {
        instruction:
          'Run IP flow verify for inbound TCP 22 from 203.0.113.50 and record the access and rule name.',
      },
      {
        instruction:
          'Add an NSG rule allow-ssh-admin (priority 200) allowing TCP 22 from 203.0.113.50 only, and re-run IP flow verify. Then test from 198.51.100.7.',
        hint: 'The first test should name your rule, the second the default deny rule.',
      },
      {
        instruction: 'Run next hop from the VM to 8.8.8.8 and note the hop type and route table.',
      },
      {
        instruction:
          'Create route table rt-lab with a 0.0.0.0/0 route of next hop type None, associate it with the subnet, and run next hop again.',
      },
      {
        instruction:
          'Install the Network Watcher agent extension and run connection troubleshoot to www.microsoft.com on 443. Explain the result.',
      },
      { instruction: 'Clean up everything, including anything created in NetworkWatcherRG.' },
    ],
    solution: [
      {
        title: 'Build the environment',
        language: 'bash',
        code: `RG=rg-nw-lab
LOC=eastus
az group create -n $RG -l $LOC

az network vnet create -g $RG -n vnet-lab --address-prefixes 10.20.0.0/16 \\
  --subnet-name app --subnet-prefixes 10.20.1.0/24

az vm create -g $RG -n vm-lab --image Ubuntu2204 --size Standard_B1s \\
  --vnet-name vnet-lab --subnet app --public-ip-address "" --nsg-rule NONE \\
  --admin-username azureuser --generate-ssh-keys

az network watcher list -o table
IP=$(az vm list-ip-addresses -g $RG -n vm-lab --query "[0].virtualMachine.network.privateIpAddresses[0]" -o tsv)
echo $IP`,
      },
      {
        title: 'IP flow verify before and after the rule',
        language: 'bash',
        code: `az network watcher test-ip-flow -g $RG --vm vm-lab --direction Inbound \\
  --protocol TCP --local $IP:22 --remote 203.0.113.50:50000
# access Deny, ruleName defaultSecurityRules/DenyAllInBound

az network nsg rule create -g $RG --nsg-name vm-labNSG -n allow-ssh-admin \\
  --priority 200 --direction Inbound --access Allow --protocol Tcp \\
  --source-address-prefixes 203.0.113.50 --destination-port-ranges 22

az network watcher test-ip-flow -g $RG --vm vm-lab --direction Inbound \\
  --protocol TCP --local $IP:22 --remote 203.0.113.50:50000
# access Allow, ruleName securityRules/allow-ssh-admin

az network watcher test-ip-flow -g $RG --vm vm-lab --direction Inbound \\
  --protocol TCP --local $IP:22 --remote 198.51.100.7:50000
# access Deny, ruleName defaultSecurityRules/DenyAllInBound`,
      },
      {
        title: 'Next hop with and without a black-hole route',
        language: 'bash',
        code: `az network watcher show-next-hop -g $RG --vm vm-lab --source-ip $IP --dest-ip 8.8.8.8
# nextHopType Internet, routeTableId System Route

az network route-table create -g $RG -n rt-lab
az network route-table route create -g $RG --route-table-name rt-lab -n blackhole \\
  --address-prefix 0.0.0.0/0 --next-hop-type None
az network vnet subnet update -g $RG --vnet-name vnet-lab -n app --route-table rt-lab

az network watcher show-next-hop -g $RG --vm vm-lab --source-ip $IP --dest-ip 8.8.8.8
# nextHopType None, routeTableId .../routeTables/rt-lab

az vm extension set -g $RG --vm-name vm-lab \\
  --publisher Microsoft.Azure.NetworkWatcher --name NetworkWatcherAgentLinux
az network watcher test-connectivity -g $RG --source-resource vm-lab \\
  --dest-address www.microsoft.com --dest-port 443
# connectionStatus Unreachable: the None route drops internet traffic`,
      },
    ],
    verification: [
      {
        command:
          'az network watcher test-ip-flow -g rg-nw-lab --vm vm-lab --direction Inbound --protocol TCP --local <private-ip>:22 --remote 203.0.113.50:50000 --query ruleName -o tsv',
        what: 'Confirms your custom rule is the one allowing SSH from the admin IP.',
        expected: 'securityRules/allow-ssh-admin',
        placeholders: ['<private-ip>'],
      },
      {
        command:
          'az network watcher show-next-hop -g rg-nw-lab --vm vm-lab --source-ip <private-ip> --dest-ip 8.8.8.8 --query nextHopType -o tsv',
        what: 'Confirms the black-hole route is in effect.',
        expected: 'None',
        placeholders: ['<private-ip>'],
      },
    ],
    cleanup: [
      {
        command: 'az group delete -n rg-nw-lab --yes --no-wait',
        what: 'Deletes the VM, VNet, NSG, route table and disks.',
      },
      {
        command: 'az network watcher flow-log list -l eastus -o table',
        what: 'If you also created a flow log, it lives in NetworkWatcherRG; delete it with az network watcher flow-log delete -l eastus -n <name>. Leave NetworkWatcherRG itself in place.',
      },
    ],
  },
  relatedTopicIds: [
    'az1-azure-monitor',
    'az1-nsg-bastion',
    'az1-routing-public-ip',
    'az1-vnets-peering',
  ],
  docs: [
    {
      title: 'What is Azure Network Watcher?',
      url: 'https://learn.microsoft.com/azure/network-watcher/network-watcher-overview',
    },
    {
      title: 'IP flow verify overview',
      url: 'https://learn.microsoft.com/azure/network-watcher/ip-flow-verify-overview',
    },
    {
      title: 'Next hop overview',
      url: 'https://learn.microsoft.com/azure/network-watcher/next-hop-overview',
    },
    {
      title: 'Connection troubleshoot overview',
      url: 'https://learn.microsoft.com/azure/network-watcher/connection-troubleshoot-overview',
    },
    {
      title: 'Connection Monitor overview',
      url: 'https://learn.microsoft.com/azure/network-watcher/connection-monitor-overview',
    },
    {
      title: 'Virtual network flow logs',
      url: 'https://learn.microsoft.com/azure/network-watcher/vnet-flow-logs-overview',
    },
    {
      title: 'Traffic analytics',
      url: 'https://learn.microsoft.com/azure/network-watcher/traffic-analytics',
    },
    {
      title: 'Packet capture overview',
      url: 'https://learn.microsoft.com/azure/network-watcher/packet-capture-overview',
    },
  ],
}
