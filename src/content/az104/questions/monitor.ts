import type { Question } from '../../types'

/** Original practice questions for this domain. Written for this app. */
export const az104MonitorQuestions: Question[] = [
  /* -------------------------------------------------------- Azure Monitor */
  {
    id: 'az1q-mon-1',
    domainId: 'az1-monitor',
    topicId: 'az1-azure-monitor',
    kind: 'mcq',
    category: 'concept',
    difficulty: 'intermediate',
    points: 2,
    prompt:
      'You need to query a Key Vault’s AuditEvent logs with KQL alongside logs from other resources. The vault is newly created. What must you configure first?',
    options: [
      { id: 'a', text: 'Nothing - resource logs are collected into Log Analytics automatically' },
      {
        id: 'b',
        text: 'A diagnostic setting on the vault that sends the AuditEvent category to a Log Analytics workspace',
      },
      { id: 'c', text: 'The Azure Monitor Agent on the vault' },
      { id: 'd', text: 'An activity log alert for the vault' },
    ],
    correct: ['b'],
    explanation:
      'Platform metrics and the activity log are collected automatically, but resource logs are not stored anywhere until a diagnostic setting routes them to a destination such as a Log Analytics workspace. The Azure Monitor Agent is for VMs and servers, not PaaS resources, and an alert rule does not collect data.',
  },
  {
    id: 'az1q-mon-2',
    domainId: 'az1-monitor',
    topicId: 'az1-azure-monitor',
    kind: 'mcq',
    category: 'concept',
    difficulty: 'intermediate',
    points: 2,
    prompt:
      'Every Saturday 02:00-04:00 you patch VMs and do not want the CPU alerts that fire during the window to page the on-call team, but you still want the alerts recorded. What should you create?',
    options: [
      {
        id: 'a',
        text: 'An alert processing rule with a weekly schedule that suppresses action groups',
      },
      { id: 'b', text: 'A second action group with no receivers' },
      { id: 'c', text: 'A delete lock on the alert rules during the window' },
      { id: 'd', text: 'A diagnostic setting that sends alerts to a storage account' },
    ],
    correct: ['a'],
    explanation:
      'Alert processing rules can suppress notifications on a schedule for a scope (subscription, resource group or resources). Alerts still fire and appear in the portal; only the action groups are skipped. Editing action groups or disabling rules by hand is error-prone, a lock has nothing to do with notifications, and diagnostic settings do not control alert delivery.',
  },
  {
    id: 'az1q-mon-3',
    domainId: 'az1-monitor',
    topicId: 'az1-azure-monitor',
    kind: 'multi',
    category: 'concept',
    difficulty: 'intermediate',
    points: 2,
    prompt:
      'You must collect Windows Security events and performance counters from 200 VMs into a Log Analytics workspace. Which components are required? (Select two.)',
    options: [
      { id: 'a', text: 'The Azure Monitor Agent installed on each VM' },
      { id: 'b', text: 'A data collection rule associated with the VMs' },
      { id: 'c', text: 'The legacy Log Analytics (MMA) agent with a workspace key' },
      { id: 'd', text: 'A diagnostic setting on each VM resource' },
      { id: 'e', text: 'An action group' },
    ],
    correct: ['a', 'b'],
    explanation:
      'Guest-level data needs the Azure Monitor Agent, and what it collects and where it sends it is defined by a data collection rule associated with the machines. The MMA agent is retired. A diagnostic setting on a VM resource only exports platform data, not in-guest events. Action groups are for notifications.',
  },
  {
    id: 'az1q-mon-4',
    domainId: 'az1-monitor',
    topicId: 'az1-azure-monitor',
    kind: 'mcq',
    category: 'concept',
    difficulty: 'beginner',
    points: 1,
    prompt:
      'An auditor asks who deleted a public IP address in production last Tuesday. Where is this information recorded without any configuration?',
    options: [
      { id: 'a', text: 'The Azure activity log' },
      { id: 'b', text: 'The public IP resource logs' },
      { id: 'c', text: 'VM insights' },
      { id: 'd', text: 'Platform metrics for the public IP' },
    ],
    correct: ['a'],
    explanation:
      'The activity log records control-plane operations (create, update, delete) on every resource, including the caller, and is kept for 90 days by default. Resource logs cover data-plane events and need a diagnostic setting. Metrics are numbers over time with no caller, and VM insights is about guest performance.',
  },
  {
    id: 'az1q-mon-5',
    domainId: 'az1-monitor',
    topicId: 'az1-azure-monitor',
    kind: 'command',
    category: 'command',
    difficulty: 'intermediate',
    points: 2,
    prompt:
      'Write the Azure CLI command that creates an action group named `ag-ops` with short name `ops` in resource group `rg-mon`, with an email receiver named `oncall` sending to `oncall@contoso.com`.',
    acceptedAnswers: [
      'az monitor action-group create -g rg-mon -n ag-ops --short-name ops --action email oncall oncall@contoso.com',
      'az monitor action-group create --resource-group rg-mon --name ag-ops --short-name ops --action email oncall oncall@contoso.com',
      'az monitor action-group create -n ag-ops -g rg-mon --short-name ops --action email oncall oncall@contoso.com',
      'az monitor action-group create -g rg-mon -n ag-ops --short-name ops -a email oncall oncall@contoso.com',
    ],
    answerHint: 'az monitor action-group create ...',
    explanation:
      '`az monitor action-group create` takes receivers through `--action` (or `-a`) as TYPE NAME TARGET. The short name (up to 12 characters) is what appears in SMS and email notifications. Alert rules then reference the action group by ID.',
  },

  /* ------------------------------------------------------ Network Watcher */
  {
    id: 'az1q-mon-6',
    domainId: 'az1-monitor',
    topicId: 'az1-network-watcher',
    kind: 'mcq',
    category: 'troubleshoot',
    difficulty: 'intermediate',
    points: 2,
    prompt:
      'Users cannot reach VM-Web on TCP 443. You want to know, in one step, whether an NSG is blocking the packet and exactly which rule is responsible. Which Network Watcher tool should you use?',
    options: [
      { id: 'a', text: 'IP flow verify' },
      { id: 'b', text: 'Next hop' },
      { id: 'c', text: 'Topology' },
      { id: 'd', text: 'Packet capture' },
    ],
    correct: ['a'],
    explanation:
      'IP flow verify tests a specific 5-tuple against the effective NSG rules and returns Allow or Deny with the name of the rule that matched. Next hop answers a routing question, not a filtering one. Topology draws the resources, and packet capture shows raw packets but does not name the NSG rule.',
  },
  {
    id: 'az1q-mon-7',
    domainId: 'az1-monitor',
    topicId: 'az1-network-watcher',
    kind: 'mcq',
    category: 'troubleshoot',
    difficulty: 'intermediate',
    points: 2,
    prompt:
      'After a firewall team added a route table, VM-App can no longer reach the internet. NSGs allow the traffic. Which tool tells you where Azure is sending packets from VM-App to 8.8.8.8 and which route table causes it?',
    options: [
      { id: 'a', text: 'Next hop' },
      { id: 'b', text: 'IP flow verify' },
      { id: 'c', text: 'NSG diagnostics' },
      { id: 'd', text: 'Traffic analytics' },
    ],
    correct: ['a'],
    explanation:
      'Next hop returns the next hop type (for example VirtualAppliance or None), the next hop IP and the ID of the route table whose route was selected. IP flow verify and NSG diagnostics evaluate security rules, not routes. Traffic analytics summarises flow logs after the fact and does not trace one route decision.',
  },
  {
    id: 'az1q-mon-8',
    domainId: 'az1-monitor',
    topicId: 'az1-network-watcher',
    kind: 'multi',
    category: 'concept',
    difficulty: 'intermediate',
    points: 2,
    prompt:
      'You need continuous, scheduled checks of latency and reachability from three Azure VMs to an on-premises API, with alerts when checks fail, plus a record of which flows traversed the VNet for later analysis. Which features do you use? (Select two.)',
    options: [
      { id: 'a', text: 'Connection Monitor' },
      { id: 'b', text: 'Virtual network flow logs, optionally with traffic analytics' },
      { id: 'c', text: 'Connection troubleshoot run once from the portal' },
      { id: 'd', text: 'Effective security rules' },
      { id: 'e', text: 'IP flow verify on a schedule via the portal' },
    ],
    correct: ['a', 'b'],
    explanation:
      'Connection Monitor runs ongoing tests between sources and destinations, records latency and loss, and integrates with Azure Monitor alerts. VNet flow logs record the IP flows through the network, and traffic analytics turns them into insights. Connection troubleshoot and IP flow verify are one-off diagnostic checks, and effective security rules is a static view of NSG configuration.',
  },
  {
    id: 'az1q-mon-9',
    domainId: 'az1-monitor',
    topicId: 'az1-network-watcher',
    kind: 'command',
    category: 'command',
    difficulty: 'advanced',
    points: 2,
    prompt:
      'Write the Azure CLI command that checks whether inbound TCP traffic from 203.0.113.5 port 50000 to VM `vm-web` (resource group `rg-app`) at local address 10.0.1.4 port 443 is allowed.',
    acceptedAnswers: [
      'az network watcher test-ip-flow -g rg-app --vm vm-web --direction Inbound --protocol TCP --local 10.0.1.4:443 --remote 203.0.113.5:50000',
      'az network watcher test-ip-flow --resource-group rg-app --vm vm-web --direction Inbound --protocol TCP --local 10.0.1.4:443 --remote 203.0.113.5:50000',
      'az network watcher test-ip-flow --vm vm-web -g rg-app --direction Inbound --protocol TCP --local 10.0.1.4:443 --remote 203.0.113.5:50000',
      'az network watcher test-ip-flow -g rg-app --vm vm-web --direction inbound --protocol tcp --local 10.0.1.4:443 --remote 203.0.113.5:50000',
    ],
    answerHint: 'az network watcher test-ip-flow ...',
    explanation:
      '`az network watcher test-ip-flow` is the CLI form of IP flow verify. `--local` is the VM side and `--remote` the other end, each as IP:port. The output gives `access` (Allow or Deny) and `ruleName`, the NSG rule that decided.',
  },

  /* ---------------------------------------------------- backup & recovery */
  {
    id: 'az1q-mon-10',
    domainId: 'az1-monitor',
    topicId: 'az1-backup-recovery',
    kind: 'mcq',
    category: 'concept',
    difficulty: 'advanced',
    points: 2,
    prompt:
      'You must back up Azure VMs in West Europe and also Azure Blob storage (operational and vaulted backup) in the same region. Which vaults do you need?',
    options: [
      { id: 'a', text: 'One Recovery Services vault for both' },
      {
        id: 'b',
        text: 'A Recovery Services vault for the VMs and a Backup vault for the blobs, both in West Europe',
      },
      { id: 'c', text: 'One Backup vault for both' },
      {
        id: 'd',
        text: 'A Recovery Services vault in a paired region for the VMs, and a Backup vault in West Europe',
      },
    ],
    correct: ['b'],
    explanation:
      'Azure VM backup uses a Recovery Services vault, while newer datasources such as blobs, managed disks, PostgreSQL flexible server and AKS use a Backup vault. The vault must be in the same region as the resources it protects, so a paired-region vault cannot back up the VMs. GRS storage on the vault plus cross-region restore is the way to get a second-region copy.',
  },
  {
    id: 'az1q-mon-11',
    domainId: 'az1-monitor',
    topicId: 'az1-backup-recovery',
    kind: 'mcq',
    category: 'concept',
    difficulty: 'intermediate',
    points: 2,
    prompt:
      'A user deleted one configuration file on a backed-up Windows VM yesterday. The VM is otherwise healthy. What is the fastest restore with the least disruption?',
    options: [
      { id: 'a', text: 'Replace existing disks from yesterday’s recovery point' },
      { id: 'b', text: 'Create a new VM from the recovery point' },
      { id: 'c', text: 'File recovery: mount the recovery point and copy the file back' },
      { id: 'd', text: 'Run an Azure Site Recovery test failover' },
    ],
    correct: ['c'],
    explanation:
      'File recovery (item-level restore) mounts the recovery point as a drive via a script so you can copy just the file, with no downtime. Replacing disks rolls the whole VM back and requires it to be stopped. A new VM is slow and wasteful for one file. Site Recovery is for disaster recovery replication, not point-in-time file restore.',
  },
  {
    id: 'az1q-mon-12',
    domainId: 'az1-monitor',
    topicId: 'az1-backup-recovery',
    kind: 'multi',
    category: 'concept',
    difficulty: 'advanced',
    points: 2,
    prompt:
      'You protect production VMs with Azure Site Recovery to a secondary region. Which statements are true? (Select all that apply.)',
    options: [
      {
        id: 'a',
        text: 'A test failover creates VMs in an isolated network you choose and does not affect replication',
      },
      {
        id: 'b',
        text: 'After a real failover you commit it and then re-protect to replicate back to the primary region',
      },
      { id: 'c', text: 'Recovery plans can group VMs and order their startup during failover' },
      {
        id: 'd',
        text: 'Site Recovery replaces the need for Azure Backup, because it keeps long-term point-in-time copies',
      },
      { id: 'e', text: 'Failover requires the primary region to be reachable' },
    ],
    correct: ['a', 'b', 'c'],
    explanation:
      'Test failover validates DR without interrupting replication. After a real failover you commit, re-protect (reverse replication) and later fail back. Recovery plans sequence groups of machines and can run scripts. Site Recovery keeps short-term recovery points for DR and does not replace backup retention. Failover is designed to work when the primary region is down.',
  },
  {
    id: 'az1q-mon-13',
    domainId: 'az1-monitor',
    topicId: 'az1-backup-recovery',
    kind: 'task',
    category: 'lab',
    difficulty: 'advanced',
    points: 3,
    prompt:
      'Protect VM vm-app (resource group rg-app, region West Europe) with Azure Backup using the default policy, trigger an on-demand backup, and confirm the job succeeded.',
    context: 'A running Azure VM vm-app in rg-app. Cloud Shell (bash).',
    checkpoints: [
      { id: 'c1', text: 'A Recovery Services vault exists in the same region as vm-app' },
      { id: 'c2', text: 'vm-app is listed as a protected item using DefaultPolicy' },
      { id: 'c3', text: 'An on-demand backup job was started for vm-app' },
      { id: 'c4', text: 'The backup job shows status Completed' },
    ],
    solution: [
      {
        title: 'Vault, protection and an on-demand backup',
        language: 'bash',
        code: `az backup vault create -g rg-app -n rsv-app -l westeurope

az backup protection enable-for-vm -g rg-app --vault-name rsv-app \\
  --vm vm-app --policy-name DefaultPolicy

az backup protection backup-now -g rg-app --vault-name rsv-app \\
  --container-name vm-app --item-name vm-app \\
  --backup-management-type AzureIaasVM --retain-until 31-12-2026

# Watch the job
az backup job list -g rg-app --vault-name rsv-app -o table`,
      },
    ],
    explanation:
      'The vault must be in the VM region. `enable-for-vm` registers the VM and applies the policy, and `backup-now` triggers an ad hoc recovery point with its own retention date. The first backup takes longer because it copies the full disk. Remember that soft delete keeps backup data for 14 days after you stop protection, so plan cleanup accordingly.',
  },
]
