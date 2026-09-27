import type { InterviewQuestion } from '../../../types'

/** Upgrades, etcd, backup and disaster recovery, multi-region, monitoring, CI/CD and GitOps. */
export const myKubernetesOperationsQuestions: InterviewQuestion[] = [
  {
    id: 'itv-myk8s-118',
    level: 'advanced',
    kind: 'open',
    prompt: 'How do you safely update a Kubernetes cluster version?',
    probing:
      'Whether you check deprecated APIs and add-ons, upgrade one minor version at a time and drain safely with PDBs.',
    answer: [
      'I start with an inventory: the current version, version skew, support status, deprecated APIs (checked with tools like `pluto` or `kubent`), and compatibility across CRDs, webhooks, operators, CNI, CSI, Ingress, and metrics, plus PDB coverage, capacity, and backups. For self-managed etcd, I actually test a backup and restore. I upgrade dev, then staging, under real workload tests first.',
      'For production, I set up a maintenance window and communicate it, upgrade the control plane by one supported version increment, validate the API and controllers, update add-ons, add or upgrade a new node pool, and cordon and drain nodes gradually — respecting PDBs and any local or stateful workload — validating each batch before moving to the next. Then I retire the old node pool.',
      'I monitor SLOs, Pending Pods, restarts, DNS, networking, storage, and admission throughout.',
      "Rolling back a managed control plane usually isn't possible, so recovery often means fixing forward, rolling back the node pool, or failing the workload over elsewhere. I keep IaC, a runbook, and post-upgrade evidence, and I never skip an unsupported version jump.",
      'Upgrade control plane first → Drain nodes one by one → Use pod disruption budgets → Monitor workloads.',
      '**Detailed interview approach:** I review version skew, removed APIs, CNI, CSI, and Ingress compatibility, add-on versions, quotas, and maintenance constraints. I test the exact upgrade on a representative non-production cluster and run API deprecation and workload disruption checks against it.',
      'In production, I upgrade the control plane first, then move through one node pool or failure domain at a time: cordon, drain respecting PDBs, replace or upgrade, and verify before moving on to the next.',
      "I monitor API errors, DNS, networking, scheduling, and node and application SLOs, and keep the rollback and recovery options documented, since a control-plane downgrade often isn't supported.",
      'Backups and a tested cluster-rebuild path are required before rolling this out across the whole fleet.',
      '- **Backup everything:** etcd, configurations, and application data.\n- **Check compatibility:** Review release notes and breaking changes.\n- **Update the control plane first:** API server, controller-manager, scheduler.\n- **Update kubelet and kube-proxy** on nodes one by one.\n- **Drain nodes before updating:** `kubectl drain <node> --ignore-daemonsets`.\n- **Update CNI and other addons** to compatible versions.\n- **Verify cluster health** after each step.\n- **Test applications** and roll back if issues occur.\n- **Uncordon nodes:** `kubectl uncordon <node>`.',
      'Back up self-managed etcd and cluster configuration, confirm workload/backup health, review deprecated APIs and add-on compatibility, respect supported version skew, and rehearse in staging.',
      'Upgrade the control plane through the distribution/provider-supported procedure, then cordon and drain worker nodes one at a time while respecting PDBs and replacement capacity.',
      'Upgrade kubelet/runtime/node images and CNI/CSI/Ingress/DNS add-ons in their supported sequence. Verify nodes, system Pods, application transactions, SLOs, and rollback/recovery after every wave.',
      'Do not copy version numbers from a screenshot; select currently supported versions from the platform documentation.',
    ],
    followUps: [
      'Why can you usually not roll back a managed control plane?',
      'How do you find deprecated APIs before upgrading?',
    ],
    tags: ['upgrades', 'version skew'],
  },
  {
    id: 'itv-myk8s-119',
    level: 'advanced',
    kind: 'open',
    prompt:
      'How have you upgraded a Kubernetes cluster in production on Azure, and how did you ensure zero downtime?',
    probing:
      'Whether you can walk through an AKS control-plane-then-node-pool upgrade with PDBs, monitoring and a rollback plan.',
    answer: [
      'In production, I upgrade AKS clusters with zero downtime by upgrading the control plane first, followed by node pools sequentially using Azure CLI. Each node is drained gracefully, with workloads protected by readiness probes, multiple replicas, and PodDisruptionBudgets.',
      'I monitor during the process via Azure Monitor and Grafana, and test in staging beforehand. This rolling approach ensures continuous availability — users never see downtime.',
      '**Steps for a zero-downtime AKS upgrade:**',
      '**1. Pre-upgrade preparation:**',
      '- Review the AKS release notes for breaking changes.\n- Test the upgrade process in a staging environment.\n- Ensure all workloads have multiple replicas and readiness/liveness probes configured.\n- Define **PodDisruptionBudgets (PDBs)** to limit voluntary disruptions.',
      '**3. Upgrade node pools sequentially:**',
      '- The node is cordoned (no new pods scheduled).\n- Pods are evicted and rescheduled on healthy nodes.\n- A new node with the upgraded image joins the cluster.\n- The old node is deleted once draining completes.',
      '**4. Monitor the upgrade:**',
      '- Use Azure Monitor and Grafana dashboards to track cluster health, node status, and application performance.\n- Check for any Pod evictions or disruptions.',
      '**5. Post-upgrade validation:**',
      '- Verify that all nodes are running the new Kubernetes version.\n- Ensure all applications are functioning correctly.\n- Review logs for any errors or warnings.',
      '**6. Rollback plan:**',
      '- Have a rollback plan in case of issues, such as restoring from backups or redeploying previous versions of applications.',
      'By following these steps, I ensure a smooth AKS upgrade with zero downtime for end-users.',
    ],
    followUps: [
      'What does max surge do during an AKS node pool upgrade?',
      'What would make a node drain hang during the upgrade?',
    ],
    code: [
      {
        title: 'Upgrade the AKS control plane only',
        language: 'bash',
        code: `az aks upgrade --resource-group <resource-group> --name <aks-cluster-name> --kubernetes-version <new-version> --control-plane-only`,
      },
      {
        title: 'List and upgrade node pools one at a time',
        language: 'bash',
        code: `# List node pools
az aks nodepool list --resource-group <resource-group> --cluster-name <aks-cluster-name>

# Upgrade each node pool one at a time
az aks nodepool upgrade --resource-group <resource-group> --cluster-name <aks-cluster-name> --name <nodepool-name> --kubernetes-version <new-version>`,
      },
    ],
    tags: ['aks', 'upgrades', 'zero downtime'],
  },
  {
    id: 'itv-myk8s-120',
    level: 'advanced',
    kind: 'open',
    prompt: 'How do you automate zero-downtime EKS upgrades?',
    probing:
      'Whether you know the EKS order (control plane, add-ons, node groups) and automate it with IaC and a pipeline.',
    answer: [
      'My order for an automated, zero-downtime EKS upgrade:',
      '1. Upgrade the control plane first, one minor version at a time, using `aws eks update-cluster-version`. AWS manages this part.\n2. Upgrade the managed add-ons (VPC CNI, CoreDNS, kube-proxy) to versions compatible with the new control plane.\n3. Upgrade the node groups. Use managed node groups or Karpenter to create new nodes on the new version, then cordon and drain the old nodes so pods reschedule gracefully. Managed node groups handle this rolling update for you.\n4. Protect availability during the drains with PodDisruptionBudgets, multiple replicas, readiness probes, and topology spread.\n5. Validate compatibility beforehand: check for deprecated APIs with tools like `kubent` or `pluto`, test the upgrade in a non-production cluster, and automate the whole flow with IaC (Terraform or eksctl) plus a pipeline.',
    ],
    followUps: [
      'Which add-ons must be upgraded alongside the control plane?',
      'How do you check for deprecated APIs before the upgrade?',
    ],
    tags: ['eks', 'upgrades', 'automation'],
  },
  {
    id: 'itv-myk8s-121',
    level: 'intermediate',
    kind: 'open',
    prompt: 'Have you upgraded Kubernetes clusters?',
    probing:
      'Whether you can describe your exact role and real steps honestly, without overclaiming ownership.',
    answer: [
      'A strong, honest answer states my exact role, the scale, the version, and the actual steps I followed. For example: I inventoried deprecated APIs, version skew, and compatibility across CNI, CSI, Ingress, metrics, and operators, tested a backup restore, ran the upgrade in dev and staging, and then scheduled it for production.',
      'I upgraded the control plane by one supported minor version, validated the API and add-ons, created or upgraded a canary node pool, and cordoned and drained nodes gradually while respecting PDBs and any stateful or local data. I monitored Pending Pods, restarts, DNS, networking, storage, and SLOs throughout, then removed the old node pool. I kept spare capacity, clear communication, and a recovery plan the whole time.',
      'Afterward I validated real transactions, policy and security, and backups, and recorded the evidence and any issues in the root-cause review. If I only assisted on part of it, I say exactly what my responsibility was rather than claiming end-to-end ownership.',
    ],
    tags: ['upgrades', 'experience'],
  },
  {
    id: 'itv-myk8s-122',
    level: 'advanced',
    kind: 'open',
    prompt: 'How do you manage Kubernetes upgrades across 50+ clusters?',
    probing:
      'Whether you can run upgrades as waves across a fleet with canary clusters and automatic stop conditions.',
    answer: [
      'Automate upgrades with tools like Rancher/Anthos, test in staging first, roll out gradually, and monitor workloads post-upgrade. Mini-case: Anthos automated rolling upgrades; a failed upgrade in staging paused rollout and prevented production outages.',
      '**Detailed interview approach:** I review version skew, removed APIs, CNI, CSI, and Ingress compatibility, add-on versions, quotas, and maintenance constraints. I test the exact upgrade on a representative non-production cluster and run API deprecation and workload disruption checks against it.',
      'In production, I upgrade the control plane first, then move through one node pool or failure domain at a time: cordon, drain respecting PDBs, replace or upgrade, and verify before moving on to the next.',
      "I monitor API errors, DNS, networking, scheduling, and node and application SLOs, and keep the rollback and recovery options documented, since a control-plane downgrade often isn't supported.",
      'Backups and a tested cluster-rebuild path are required before rolling this out across the whole fleet.',
    ],
    followUps: [
      'How do you decide the order of clusters in the rollout?',
      'What stops the rollout automatically?',
    ],
    tags: ['upgrades', 'fleet', 'multi-cluster'],
  },
  {
    id: 'itv-myk8s-123',
    level: 'intermediate',
    kind: 'open',
    prompt: 'What is the role of etcd and how do you back it up?',
    probing:
      'Whether you can take a TLS-authenticated etcd snapshot, store it safely and actually test a restore.',
    answer: [
      "etcd stores the entire Kubernetes API's state. If it loses quorum or the data itself, the cluster loses its management state along with it. For a self-managed stacked or external etcd, I use the correct TLS endpoints and take a consistent snapshot:",
      'I encrypt it, store it off-cluster with a retention policy, control access and audit it, and keep the matching manifests and certificates alongside it. I actually test the documented restore process in an isolated environment. Managed services back up their own control plane, but recovering workload manifests and data is still on the customer.',
      'I monitor quorum and member health, fsync latency, DB size, and available space. Checking snapshot status is not the same as testing a real restore.',
    ],
    code: [
      {
        title: 'Take and check an etcd snapshot',
        language: 'bash',
        code: `ETCDCTL_API=3 etcdctl --endpoints=https://127.0.0.1:2379 \\
 --cacert=ca.crt --cert=server.crt --key=server.key snapshot save snapshot.db
etcdctl snapshot status snapshot.db --write-out=table`,
      },
    ],
    tags: ['etcd', 'backup'],
  },
  {
    id: 'itv-myk8s-124',
    level: 'advanced',
    kind: 'open',
    prompt: 'What is etcd, and what actually happens to your cluster if it goes down?',
    probing:
      'Whether you know what keeps running, what stops, and how Raft quorum loss makes it worse.',
    answer: [
      'Everyone knows etcd is a key-value store. The real question is what breaks, and in what order, when etcd becomes unavailable.',
      'When etcd goes down, your **existing workloads keep running**. Healthy pods on nodes continue, because the kubelet on each node is independent and does not need etcd to keep existing containers alive.',
      'What stops working is everything that requires the control plane to make decisions:',
      '- You cannot deploy anything new — the API server cannot write desired state, so it rejects all writes.\n- You cannot scale, update a ConfigMap, or create a Secret.\n- Any `kubectl` command that modifies cluster state fails.\n- **Self-healing stops.** If a pod crashes while etcd is down, the controller manager cannot create a replacement. Your deployment said three replicas; one died; it stays dead until etcd comes back.',
      'The dangerous part most people miss: etcd uses **Raft consensus**. A three-node etcd cluster needs two nodes for quorum.',
      'Lose two of three and you lose quorum — now even reads start failing. The API server cannot read cluster state, `kubectl get` starts returning errors, and the cluster is read-only at best and completely unavailable at worst.',
      'This is why etcd backup is not optional in production. In my client environment we took automated etcd snapshots every six hours and stored them in a separate S3 bucket in a different AWS region.',
      'If you lose etcd data with no backup, you have lost your entire cluster state — you can see what is running from the pods, but Kubernetes has no record of desired state, and recovery without backups is extremely painful.',
      'The answer the interviewer wants is not just what etcd is — it is that you understand the scope of impact of losing it and have a real backup and recovery plan.',
    ],
    followUps: [
      'How many etcd members do you need to tolerate two failures?',
      'How would you restore a cluster from an etcd snapshot?',
    ],
    tags: ['etcd', 'quorum', 'control plane'],
  },
  {
    id: 'itv-myk8s-125',
    level: 'advanced',
    kind: 'scenario',
    prompt: 'Kubernetes etcd performance is degrading. What are root causes and fixes?',
    probing:
      'Whether you check disk fsync latency, DB size and client load, and only change one quorum member at a time.',
    answer: [
      "Symptoms usually show up as API latency, timeouts, or leader changes. I check etcd's own metrics, logs, and member health, leader and quorum status, WAL and backend commit and fsync latency, disk throughput and space, CPU and memory, network latency and loss, DB size, alarms, how much object and event churn there is, and the overall API request load.",
      'For mitigation, I cut down abusive or noisy clients and events, protect the disk, and replace an unhealthy member only through the documented, quorum-safe procedure. Longer term, I look at a dedicated low-latency SSD, an odd number of quorum members on a low-latency network, resource headroom, compaction followed by a controlled defrag of one member at a time per the official guidance, quotas, and better monitoring.',
      "I always snapshot before maintenance and never restart or remove more than one quorum member at a time. Afterward I validate the API's SLOs and controller health. For managed Kubernetes, I escalate to the provider with metrics and a time window, while I check my own client load in parallel.",
    ],
    followUps: [
      'Why is disk latency so important for etcd?',
      'What is the difference between compaction and defragmentation?',
    ],
    tags: ['etcd', 'performance'],
  },
  {
    id: 'itv-myk8s-126',
    level: 'advanced',
    kind: 'scenario',
    prompt: 'How do you handle Kubernetes etcd datastore corruption?',
    probing:
      'Whether you protect quorum and evidence and use the supported member-replacement or snapshot-restore path.',
    answer: [
      'Restore from snapshot, rebuild control plane if required, ensure regular backups, and test restore procedure. Mini-case: When an upgrade corrupted etcd, Velero backups allowed full cluster restore in 30 minutes, saving production downtime.',
      '**Detailed interview approach:** I stop control-plane writes where the recovery procedure requires it, and preserve member logs, health data, disk evidence, and the latest known-good snapshot. I check `etcdctl endpoint health` and `status`, quorum, alarms, disk latency and space, certificates, and whether the corruption affects just one member or the whole cluster.',
      'Recovery uses whatever method the Kubernetes distribution actually supports: replacing one failed member from healthy quorum, or restoring a verified snapshot into a new, consistent cluster and pointing the API servers at it. Velero on its own is not an etcd backup.',
      'I validate API objects, controllers, Nodes, Secrets, and workloads before letting any new changes through. Scheduled, encrypted snapshots stored in a genuinely separate failure domain, and regular restore drills, are what actually prove the RPO and RTO.',
    ],
    followUps: [
      'Why is a Velero backup not an etcd backup?',
      'How do you validate the cluster after an etcd restore?',
    ],
    tags: ['etcd', 'disaster recovery'],
  },
  {
    id: 'itv-myk8s-127',
    level: 'advanced',
    kind: 'scenario',
    prompt: 'How do you handle Kubernetes API server overload?',
    probing:
      'Whether you find the noisy client from audit logs and metrics and fix list/watch, pagination and backoff.',
    answer: [
      'Scale API servers horizontally, add rate limiting, optimize controller workloads, and increase etcd performance.',
      'Mini-case: Cluster had 50 controllers hammering the API; tuning cache sizes + scaling API server replicas fixed latency.',
      "**Detailed interview approach:** I confirm API-server latency, error rate, and inflight request metrics, audit volume, etcd latency and space, and control-plane CPU and memory. The API's audit logs and metrics usually point to a specific controller, user, a bad list/watch pattern, or a discovery storm.",
      'To reduce the impact, I rate-limit or scale down the offending client or controller and pause any noisy automation. In a managed cluster, I bring in the provider to scale the control plane itself.',
      'The permanent fix uses shared informers and watches, pagination, client backoff, realistic QPS and burst settings, fewer high-volume audit rules, and a healthy etcd.',
      'Before closing the incident, I verify kubectl latency, controller queues, scheduling, admission webhooks, and any application-side change. Control-plane SLOs and alerts should catch saturation before clients start timing out.',
    ],
    followUps: [
      'What is API Priority and Fairness used for?',
      'How do shared informers reduce API load?',
    ],
    tags: ['api server', 'performance'],
  },
  {
    id: 'itv-myk8s-128',
    level: 'intermediate',
    kind: 'open',
    prompt: 'What is your strategy for backup and restore in a cluster?',
    probing:
      'Whether you back up etcd, volumes and manifests, secure the backups, and regularly test restores against RTO and RPO.',
    answer: [
      "A comprehensive backup and restore strategy for a Kubernetes cluster involves several key components to ensure data integrity, availability, and quick recovery in case of failures. Here's a general approach:",
      '1. **Identify critical data:** Determine which data needs to be backed up, including etcd data, Persistent Volumes, configuration files, and application state.\n2. **Backup etcd:** Use `etcdctl` to create regular backups of the etcd database, which stores the cluster state. Schedule automated etcd backups using cron jobs or backup tools.\n3. **Backup Persistent Volumes:** Use volume snapshot features provided by your cloud provider or storage solution to create snapshots of Persistent Volumes. Consider using tools like Velero, Kasten, or Stash for managing backups of Persistent Volumes and application data.\n4. **Backup configuration and manifests:** Store Kubernetes manifests (YAML files) for deployments, services, and other resources in a version-controlled repository (e.g., Git). Regularly export the current state of the cluster using `kubectl get all --all-namespaces -o yaml` and back it up.\n5. **Automate backups:** Implement automated backup processes using scripts or backup tools to ensure regular and consistent backups. Schedule backups during off-peak hours to minimize impact on cluster performance.\n6. **Test restore procedures:** Regularly test the restore process to ensure that backups can be successfully restored. Document the restore procedures and ensure that team members are familiar with them.\n7. **Monitor backup health:** Implement monitoring and alerting for backup jobs to ensure they complete successfully. Use logging to track backup activities and identify any issues promptly.\n8. **Secure backups:** Store backups in secure locations, such as encrypted storage or offsite locations. Implement access controls to restrict who can access backup data.\n9. **Disaster recovery plan:** Develop a disaster recovery plan that outlines the steps to recover the cluster in case of catastrophic failures. Include **RTO** (Recovery Time Objective) and **RPO** (Recovery Point Objective) targets in the plan.',
      'By following this strategy, you can ensure that your Kubernetes cluster is well-protected against data loss and can be quickly restored in the event of a failure. Protect:',
      '- Cluster configuration and manifests\n- Persistent application data\n- etcd for self-managed control planes\n- External dependencies, certificates, and secrets according to policy',
      'Velero can back up Kubernetes resources and coordinate supported volume snapshots. Test restores regularly; an untested backup is not a recovery plan.',
      'Managed Kubernetes providers protect their control plane, but customers remain responsible for workload data and configuration recovery.',
      'Multi-region recovery normally uses separate clusters, replicated data, independently deployable configuration, and DNS or global traffic management. One stretched control plane creates a large failure domain — a single group of resources that can all fail together.',
    ],
    tags: ['backup', 'restore', 'disaster recovery'],
  },
  {
    id: 'itv-myk8s-129',
    level: 'intermediate',
    kind: 'open',
    prompt: 'How do you use Velero for backup and restore in Azure Kubernetes Service?',
    probing:
      'Whether you can install Velero on AKS and create, schedule, monitor and restore backups.',
    answer: [
      'Velero is an open-source tool that provides backup, restore, and disaster recovery capabilities for Kubernetes clusters.',
      '**1. Install Velero:**',
      '- First, install the Velero CLI on your local machine. You can download it from the official Velero GitHub releases page.\n- Next, install Velero in your AKS cluster:',
      'Replace `<your-velero-bucket>`, `<path-to-your-azure-credentials-file>`, `<your-resource-group>`, and `<your-storage-account>` with your actual values.',
      '**2. Create backups:** Replace `<backup-name>` with a name for your backup and `<namespace1>,<namespace2>` with the namespaces you want to include.',
      '**4. Restore from backups:** Replace `<backup-name>` with the name of the backup you want to restore from.',
      '**6. Schedule regular backups:** Replace `<schedule-name>` with a name for your schedule and adjust the cron expression as needed.',
      '**7. Clean up old backups:** Replace `<backup-name>` with the name of the backup you want to delete.',
      'By following these steps, you can effectively use Velero to manage backups and restores in your Azure Kubernetes Service (AKS) cluster.',
    ],
    code: [
      {
        title: 'Install Velero with the Azure provider',
        language: 'bash',
        code: `velero install \\
  --provider azure \\
  --bucket <your-velero-bucket> \\
  --secret-file <path-to-your-azure-credentials-file> \\
  --backup-location-config resourceGroup=<your-resource-group>,storageAccount=<your-storage-account>`,
      },
      {
        title: 'Create a backup',
        language: 'bash',
        code: `velero backup create <backup-name> --include-namespaces <namespace1>,<namespace2>`,
      },
      {
        title: 'Check backup status',
        language: 'bash',
        code: `velero backup get`,
      },
      {
        title: 'Restore from a backup',
        language: 'bash',
        code: `velero restore create --from-backup <backup-name>`,
      },
      {
        title: 'Check restore status',
        language: 'bash',
        code: `velero restore get`,
      },
      {
        title: 'Schedule nightly backups',
        language: 'bash',
        code: `velero schedule create <schedule-name> --schedule "0 2 * * *" --include-namespaces <namespace1>,<namespace2>`,
      },
      {
        title: 'Delete an old backup',
        language: 'bash',
        code: `velero backup delete <backup-name>`,
      },
    ],
    tags: ['velero', 'aks', 'backup'],
  },
  {
    id: 'itv-myk8s-130',
    level: 'advanced',
    kind: 'open',
    prompt: 'How do you prepare for disaster recovery in Kubernetes?',
    probing:
      'Whether you start from RTO and RPO and prove recovery with restore drills, not just a Velero schedule.',
    answer: [
      'Backup cluster state with Velero → Store manifests in Git → Automate redeployment in DR cluster.',
      '**Detailed interview approach:** I start with a business-approved RTO and RPO, then identify the data, configuration, identity, DNS and network, certificates, dependencies, and the people and runbooks needed to actually recover.',
      'Manifests and infrastructure are versioned, but stateful data and secrets need encrypted backups or replication into a genuinely separate failure domain or account.',
      "I automate restoring into a clean environment and validate integrity, application transactions, monitoring, and access before switching any traffic over. A backup isn't considered successful until a restore drill has actually proven it works.",
      'Regular drills record the actual recovery time, any missing dependency, and any manual step needed, and that feeds back into updating the runbook, capacity planning, DNS TTLs, contact paths, and backup retention.',
    ],
    followUps: [
      'What is usually missing when a DR drill fails?',
      'How do DNS TTLs affect failover time?',
    ],
    tags: ['disaster recovery', 'rto', 'rpo'],
  },
  {
    id: 'itv-myk8s-131',
    level: 'advanced',
    kind: 'scenario',
    prompt: 'An entire Kubernetes region goes down. How do you fail over workloads?',
    probing:
      'Whether recovery is designed ahead of time and you can run and communicate a controlled regional failover.',
    answer: [
      "Regional recovery has to be designed ahead of time: an independent cluster and control plane in a second region, data that's actually replicated or restorable, a registry, config, and secrets that are available there too, IaC and GitOps, a global traffic manager, spare capacity, a runbook, and a defined RTO and RPO.",
      'During the actual outage, I declare the incident, confirm data replication and consistency and who has authority to act, scale up or activate the secondary region, validate critical dependencies with a synthetic transaction, and then shift traffic over gradually while monitoring. Writes may need fencing to prevent a split-brain situation.',
      'Communication and who owns the recovery decision are made explicit up front.',
      'Failing back is also planned: reconcile the data, restore the primary region, test it, and shift traffic back gradually. Regular fire drills measure the actual RTO and RPO, not the theoretical one.',
      "Just having manifests in Git isn't disaster recovery if the data, DNS, secrets, quota, or dependencies aren't actually available in the second region.",
    ],
    followUps: [
      'How do you prevent split brain on writes during failover?',
      'How do you plan the failback?',
    ],
    tags: ['disaster recovery', 'multi-region'],
  },
  {
    id: 'itv-myk8s-132',
    level: 'advanced',
    kind: 'open',
    prompt: 'Why is a single Kubernetes control plane for multi-region deployments risky?',
    probing:
      'Whether you know etcd quorum needs low latency and why one cluster per region is the safer pattern.',
    answer: [
      'Control-plane components and etcd need a low-latency, reliable quorum. Stretching that across distant regions adds latency and awkward partition behavior. Losing connectivity between regions can lose quorum entirely, or leave nodes unmanaged.',
      'A single control plane also becomes a shared failure domain for upgrades, security, and configuration — meaning one bad change or outage there can take down everything that depends on it at once.',
      'I normally run one independent cluster per region, all managed from the same versioned IaC and GitOps setup but with region-specific configuration. Global traffic routing and application or data replication are what actually provide failover between services.',
      'Access, policy, and observability are standardized across regions without coupling their runtime quorum together.',
      'The trade-off is more clusters and more work keeping them operationally consistent, which is addressed through automation and fleet management. I test losing a whole region or control plane, not just a single Pod failure.',
    ],
    followUps: [
      'How do you keep many regional clusters consistent?',
      'What provides failover if not a stretched control plane?',
    ],
    tags: ['multi-region', 'control plane', 'etcd'],
  },
  {
    id: 'itv-myk8s-133',
    level: 'advanced',
    kind: 'open',
    prompt: 'How do you implement cross-region failover for Kubernetes control planes?',
    probing:
      'Whether you tie control-plane failover to RTO/RPO, replicated data and restore drills.',
    answer: [
      'Run HA clusters with regional control planes, replicate etcd across zones, set up DNS failover, and test regularly. Mini-case: A zone failure in us-central caused automatic API server failover to backup region; developers continued kubectl operations without noticing.',
      '**Detailed interview approach:** I start with a business-approved RTO and RPO, then identify the data, configuration, identity, DNS and network, certificates, dependencies, and the people and runbooks needed to actually recover.',
      'Manifests and infrastructure are versioned, but stateful data and secrets need encrypted backups or replication into a genuinely separate failure domain or account.',
      "I automate restoring into a clean environment and validate integrity, application transactions, monitoring, and access before switching any traffic over. A backup isn't considered successful until a restore drill has actually proven it works.",
      'Regular drills record the actual recovery time, any missing dependency, and any manual step needed, and that feeds back into updating the runbook, capacity planning, DNS TTLs, contact paths, and backup retention.',
    ],
    followUps: [
      'What has to exist in the second region before failover can work?',
      'How do you test this without a real outage?',
    ],
    tags: ['multi-region', 'failover'],
  },
  {
    id: 'itv-myk8s-134',
    level: 'advanced',
    kind: 'open',
    prompt: 'How do you implement multi-region deployments in Kubernetes?',
    probing:
      'Whether you run separate regional clusters behind global traffic management with tested data replication.',
    answer: [
      'Use multiple clusters across regions → Manage via Anthos (GCP) or Azure Arc → Route traffic with global load balancer.',
      '**Detailed interview approach:** I start with a business-approved RTO and RPO, then identify the data, configuration, identity, DNS and network, certificates, dependencies, and the people and runbooks needed to actually recover.',
      'Manifests and infrastructure are versioned, but stateful data and secrets need encrypted backups or replication into a genuinely separate failure domain or account.',
      "I automate restoring into a clean environment and validate integrity, application transactions, monitoring, and access before switching any traffic over. A backup isn't considered successful until a restore drill has actually proven it works.",
      'Regular drills record the actual recovery time, any missing dependency, and any manual step needed, and that feeds back into updating the runbook, capacity planning, DNS TTLs, contact paths, and backup retention.',
    ],
    followUps: [
      'How do you route users to the nearest healthy region?',
      'How do you keep configuration identical across regions?',
    ],
    tags: ['multi-region', 'deployments'],
  },
  {
    id: 'itv-myk8s-135',
    level: 'advanced',
    kind: 'open',
    prompt: 'How do you handle stateful service failover in Kubernetes across zones/regions?',
    probing:
      'Whether you know stateful failover depends on datastore replication, leader election and storage topology.',
    answer: [
      'Use StatefulSets with appropriate storage classes, enable cross-zone replication for the datastore (e.g., multi-zone DB clusters), design DNS failover and leader election, and test failover procedures.',
      'Mini-case: We configured a multi-zone PostgreSQL cluster with synchronous replicas; during a zone outage, automated leader election and DNS failover restored write availability within minutes.',
      '**Detailed interview approach:** I inspect the Pod, PVC, PV, StorageClass, CSI controller and node Pods, and their Events. The message usually points to pending provisioning, a topology mismatch, an attach conflict, a permissions issue, quota, a mount failure, or a filesystem error.',
      "I confirm the access mode, requested capacity, zone or node affinity, reclaim policy, secret or IAM access, CSI logs, and the cloud disk's attachment state. For a stateful workload, I protect the data and avoid force-detaching or deleting a PVC until I've confirmed ownership and that backups exist.",
      'I repair whichever layer is broken — binding, CSI, permissions, or storage — remount it through the controller, and validate that the application can actually read, write, and fail over. Regular snapshots, restore tests, CSI monitoring, and sensible topology settings are what prevent this.',
    ],
    followUps: [
      'Why does a StatefulSet alone not give you database failover?',
      'How do you avoid split brain in a multi-zone database?',
    ],
    tags: ['stateful', 'failover', 'storage'],
  },
  {
    id: 'itv-myk8s-136',
    level: 'intermediate',
    kind: 'open',
    prompt: 'How do you manage stateful applications in Kubernetes?',
    probing:
      'Whether you combine StatefulSets, PVCs, the right StorageClass and tested backups for stateful apps.',
    answer: [
      'Use StatefulSets → PersistentVolumeClaims → Ensure proper storage class → Backup with Velero.',
      '**Detailed interview approach:** I inspect the Pod, PVC, PV, StorageClass, CSI controller and node Pods, and their Events. The message usually points to pending provisioning, a topology mismatch, an attach conflict, a permissions issue, quota, a mount failure, or a filesystem error.',
      "I confirm the access mode, requested capacity, zone or node affinity, reclaim policy, secret or IAM access, CSI logs, and the cloud disk's attachment state. For a stateful workload, I protect the data and avoid force-detaching or deleting a PVC until I've confirmed ownership and that backups exist.",
      'I repair whichever layer is broken — binding, CSI, permissions, or storage — remount it through the controller, and validate that the application can actually read, write, and fail over. Regular snapshots, restore tests, CSI monitoring, and sensible topology settings are what prevent this.',
    ],
    tags: ['stateful', 'statefulset', 'storage'],
  },
  {
    id: 'itv-myk8s-137',
    level: 'advanced',
    kind: 'open',
    prompt: 'How would you migrate a stateful application to Kubernetes with minimal downtime?',
    probing:
      'Whether you plan replication or CDC, a controlled cutover and a real rollback window for stateful data.',
    answer: [
      "First I document data ownership, consistency requirements, storage IOPS, dependencies, DNS, backups, and what RTO and RPO are actually acceptable. I only use a StatefulSet when stable identity or ordered behavior is actually required — a managed external database can be the safer choice if the team isn't set up to operate a distributed datastore inside Kubernetes.",
      'The target environment needs the right storage topology, anti-affinity, disruption budgets, probes, resource requests, and a tested backup and restore process.',
      'I provision the target in parallel, restore a recent backup into it, and use database-native replication or change-data capture to keep it in sync with ongoing writes. I validate schema compatibility, transactions, performance, failover, monitoring, and restore before actually cutting over.',
      'At cutover, I pause writes if consistency requires it, apply the final delta, switch the connection or shift weighted traffic over, and watch errors, latency, replication lag, and data correctness closely.',
      'The old environment stays read-only during an agreed rollback window. Rolling back is only safe once I understand who owns the writes and how the data would reconcile back.',
      'Once things are stable, I stop the temporary replication, rotate the migration credentials, verify another restore still works, and record the actual downtime and recovery behavior for next time.',
    ],
    followUps: [
      'What decides whether you run the database in Kubernetes at all?',
      'How do you measure replication lag before cutover?',
    ],
    tags: ['migration', 'stateful', 'databases'],
  },
  {
    id: 'itv-myk8s-138',
    level: 'intermediate',
    kind: 'open',
    prompt: 'Challenges with StatefulSets & persistent storage',
    probing:
      'Whether you know the real operational pain of StatefulSets: zonal storage, orphaned PVCs, slow ordered rollouts and backups.',
    answer: [
      'StatefulSets give pods a stable network identity (`pod-0`, `pod-1`), ordered deployment and scaling, and stable per-pod storage through `volumeClaimTemplates`. The main challenges:',
      "- Storage is tied to a zone. An EBS volume lives in one availability zone, so its pod is pinned there too. Plan topology spread and multi-AZ replication at the application layer.\n- Scaling down does not delete PVCs — this is by design, to protect data. Orphaned volumes still cost money, so clean them up deliberately once you confirm the data isn't needed.\n- Ordered operations make rollouts slower, and upgrades must respect the application's quorum rules, as with databases.\n- Backups and data migration are your responsibility. Use CSI volume snapshots and application-level backups.\n- Rescheduling a pod to a new node requires the CSI driver to detach and reattach the volume, which can be slow.",
      'Best practice: use CSI drivers with dynamic provisioning and a proper StorageClass, run stateful workloads through mature operators where possible, and back up regularly.',
    ],
    tags: ['statefulset', 'storage'],
  },
  {
    id: 'itv-myk8s-139',
    level: 'advanced',
    kind: 'open',
    prompt: 'How do you manage multi-cloud Kubernetes deployments?',
    probing:
      'Whether you standardise clusters with versioned modules and GitOps while keeping failure domains independent.',
    answer: [
      'Use Rancher, Anthos (GCP), or Azure Arc → Standardize with Helm/ArgoCD → Centralized monitoring/logging.',
      "**Detailed interview approach:** I standardize cluster creation, baseline add-ons, policy, identity, ingress, storage, observability, and GitOps through versioned modules, while keeping each cluster's state and failure domain independent of the others.",
      'A central inventory or fleet layer reports versions, policy compliance, capacity, certificates, and health, but workload credentials and namespace RBAC stay least-privilege on each cluster individually.',
      'Deployments roll out from a representative canary cluster to waves of others, and stop automatically on an SLO or policy failure. Cross-cluster traffic uses private connectivity, explicit DNS or service discovery, mTLS identity, and narrow firewall rules.',
      'I test what happens if a whole cluster or region is lost, avoid any hidden shared control-plane dependency, and automate upgrades and drift correction with audited exceptions.',
    ],
    followUps: [
      'What do you centralise, and what stays per cluster?',
      'How do you roll a change across clouds safely?',
    ],
    tags: ['multi-cloud', 'fleet'],
  },
  {
    id: 'itv-myk8s-140',
    level: 'intermediate',
    kind: 'open',
    prompt: 'What metrics are monitored to ensure cluster health?',
    probing:
      'Whether you monitor control plane, nodes and workloads but alert on user-facing symptoms with runbooks.',
    answer: [
      "I monitor control-plane and API availability, latency, and errors, the scheduler and controller work queues, and etcd where it's self-managed. On nodes, I watch Ready status, CPU, memory, disk, inodes, PIDs, network, kubelet, and the runtime. I also watch CNI and CoreDNS, Pending or restarting Pods, unavailable replicas, Jobs, HPA, PDB, PVCs and CSI, Ingress, and certificate expiry.",
      "The most important signals are the workload's own SLIs: availability, latency, traffic, errors, saturation — meaning how close a resource is to its limit — and the actual business transaction succeeding. Capacity forecasts and cost round this out.",
      'Alerts focus on actionable symptoms — SLO burn, zero Ready replicas, node pressure — each with a runbook attached. Dashboards are for diagnosing, not alerting. I test the alerts themselves and compare across cluster, version, and deployment labels.',
      "I keep metric cardinality under control, since it's easy to let it explode. And healthy nodes don't automatically mean healthy users.",
      'Monitor control-plane/API health, node conditions, Pod restarts, pending Pods, CPU/memory, disk and inode pressure, network errors, workload latency/errors, HPA conditions, and persistent storage.',
      'Common stacks include Prometheus, Grafana, Alertmanager, cloud-native container insights, OpenTelemetry, and centralized log platforms. Compare infrastructure metrics with application monitoring data.',
    ],
    tags: ['monitoring', 'metrics', 'slo'],
  },
  {
    id: 'itv-myk8s-141',
    level: 'intermediate',
    kind: 'open',
    prompt: 'What logging and monitoring solutions do you recommend for Kubernetes?',
    probing:
      'Whether you can recommend a metrics, logs and tracing stack and justify it by scale, cost and team skills.',
    answer: [
      'A common stack is Prometheus Operator, kube-state-metrics, and node-exporter for metrics, with Alertmanager and Grafana on top. Logs go through Fluent Bit into Loki, Elasticsearch, OpenSearch, or a cloud logging service. Tracing goes through OpenTelemetry into Tempo, Jaeger, or a vendor tool. Managed options like CloudWatch, Azure Monitor, or GCP Operations cut down on platform operations work.',
      "The choice depends on scale, retention and query needs, high availability, tenancy, security and data-residency requirements, how well it integrates with what you already have, the team's skill set, and cost. I standardize structured logs with consistent correlation and resource attributes, sampling, retention tiering, and access control.",
      'The observability platform also has to observe itself: scrape and ingest failures, dropped logs, storage growth, and cardinality.',
      'I define SLO dashboards and alerts, and run incident drills that trace one request across ingress, service, and database. The number of tools matters far less than having reliable, correlated signals and clear ownership of them.',
    ],
    tags: ['monitoring', 'logging', 'tracing'],
  },
  {
    id: 'itv-myk8s-142',
    level: 'advanced',
    kind: 'open',
    prompt:
      'How do you implement centralised monitoring for multiple Kubernetes clusters in Azure? Which tools, and why?',
    probing:
      'Whether you can centralise metrics, logs and alerts for many AKS clusters with Azure Monitor, Prometheus and Grafana.',
    answer: [
      'A centralized place to monitor:',
      '- Cluster health\n- Node and Pod metrics\n- Application logs\n- Alerts and dashboards',
      '- **Metrics & Logs Collection**: Tool: **Azure Monitor / Container Insights (Log Analytics)**; Purpose: Collects CPU, memory, pod, and container logs from all clusters; Centralized Integration: Centralized Log Analytics workspace\n- **Dashboards & Visualization**: Tool: **Grafana**; Purpose: Custom dashboards using data from Azure Monitor or Prometheus; Centralized Integration: Single Grafana instance connects to all data sources\n- **Prometheus (Optional)**: Tool: **Prometheus + Azure Managed Prometheus**; Purpose: Cluster-level scraping of metrics; Centralized Integration: Can be federated or exported to Azure Monitor\n- **Log Storage**: Tool: **Log Analytics Workspace**; Purpose: Stores logs from all clusters; Centralized Integration: Single shared workspace\n- **Alerting**: Tool: **Azure Monitor Alerts** + **Prometheus Alertmanager**; Purpose: Alerts based on thresholds and log queries; Centralized Integration: Centralized alert routing\n- **Event Correlation / Tracing**: Tool: **Azure Application Insights**; Purpose: Distributed tracing, dependency maps, and custom monitoring data; Centralized Integration: Application-level observability\n- **Notifications**: Tool: **Azure Action Groups / Slack / Email**; Purpose: Sends alerts to teams; Centralized Integration: Unified notification routing',
      '**Tools explanation:**',
      '- **Azure Monitor / Container Insights:** Native Azure tool for monitoring AKS clusters, providing deep integration with Azure services.\n- **Grafana:** Popular open-source dashboarding tool that can visualize data from multiple sources, including Azure Monitor and Prometheus.\n- **Prometheus:** Widely used for Kubernetes monitoring; can be integrated with Azure Managed Prometheus for scalability.\n- **Log Analytics Workspace:** Centralized storage for logs, making it easy to query and analyze data from multiple clusters.\n- **Azure Application Insights:** Provides application-level monitoring and tracing, useful for microservices architectures.',
      'This setup allows for a comprehensive, centralized monitoring solution across multiple Kubernetes clusters in Azure, leveraging both native Azure tools and popular open-source solutions.',
      '**Steps to implement:**',
      '**3. Set up Grafana:**',
      '- Deploy Grafana in a separate AKS cluster or use Azure Managed Grafana.\n- **Configure data sources:** Add Azure Monitor and Prometheus as data sources in Grafana.\n- **Create dashboards:** Build dashboards to visualize metrics and logs from all clusters.',
      '**4. Set up alerting:** Configure alerts in Azure Monitor and Prometheus Alertmanager to notify teams via preferred channels.',
      '**5. (Optional) Integrate Application Insights:** Instrument applications running in the clusters with Application Insights SDKs for deeper observability.',
      'This approach ensures you have a robust, scalable, and centralized monitoring solution for multiple Kubernetes clusters in Azure.',
    ],
    followUps: [
      'When would you choose Azure Managed Prometheus over Container Insights metrics?',
      'How do you keep alert noise down across many clusters?',
    ],
    code: [
      {
        title: 'Create a central Log Analytics workspace',
        language: 'bash',
        code: `az monitor log-analytics workspace create \\
  -g monitoring-rg \\
  -n central-law`,
      },
      {
        title: 'Enable Container Insights on each AKS cluster',
        language: 'bash',
        code: `az aks enable-addons \\
  --resource-group <cluster-rg> \\
  --name <aks-cluster-name> \\
  --addons monitoring \\
  --workspace-resource-id /subscriptions/<subscription-id>/resourceGroups/monitoring-rg/providers/Microsoft.OperationalInsights/workspaces/central-law`,
      },
      {
        title: 'Create a CPU alert',
        language: 'bash',
        code: `az monitor metrics alert create \\
  -n "HighCPUAlert" \\
  -g monitoring-rg \\
  --scopes "/subscriptions/<subID>/resourceGroups/monitoring-rg/providers/Microsoft.OperationalInsights/workspaces/central-law" \\
  --condition "avg(kubernetes.container.cpuUsageNanoCores) > 800000000" \\
  --description "CPU usage too high"`,
      },
    ],
    tags: ['monitoring', 'azure', 'aks'],
  },
  {
    id: 'itv-myk8s-143',
    level: 'intermediate',
    kind: 'open',
    prompt: 'How do you monitor logs in Kubernetes?',
    probing:
      'Whether you move from kubectl logs to a centralised, correlated logging pipeline with sensible retention.',
    answer: [
      'Use kubectl logs for quick debugging → For centralized logging, use EFK (Elasticsearch + Fluentd + Kibana) or Loki + Grafana.',
      '**Detailed interview approach:** I define the service indicators first — availability, latency, errors, traffic, saturation, and the key business outcomes — then collect correlated metrics, structured logs, and traces with consistent service, environment, version, and request IDs.',
      'Dashboards show both the symptoms and the dependencies behind them. SLO-based alerts route by severity and ownership, each with a runbook attached.',
      "At scale, I combine or downsample older metrics, sample traces intelligently, and apply hot, warm, and cold log retention based on what's actually needed for debugging and compliance. During an incident I follow one request across every layer and compare it against deployment and config events.",
      'I verify alert delivery and recovery regularly, and tune out noisy or unactionable signals.',
    ],
    tags: ['logging', 'efk', 'loki'],
  },
  {
    id: 'itv-myk8s-144',
    level: 'basic',
    kind: 'open',
    prompt: 'How do you monitor Kubernetes clusters?',
    probing:
      'Whether you can name a standard monitoring stack and connect it to SLO-based alerting.',
    answer: [
      'Use Prometheus + Grafana for metrics, ELK/EFK stack for logs, and Kubernetes liveness/readiness probes for pod health.',
      '**Detailed interview approach:** I define the service indicators first — availability, latency, errors, traffic, saturation, and the key business outcomes — then collect correlated metrics, structured logs, and traces with consistent service, environment, version, and request IDs.',
      'Dashboards show both the symptoms and the dependencies behind them. SLO-based alerts route by severity and ownership, each with a runbook attached.',
      "At scale, I combine or downsample older metrics, sample traces intelligently, and apply hot, warm, and cold log retention based on what's actually needed for debugging and compliance. During an incident I follow one request across every layer and compare it against deployment and config events.",
      'I verify alert delivery and recovery regularly, and tune out noisy or unactionable signals.',
    ],
    tags: ['monitoring', 'prometheus', 'grafana'],
  },
  {
    id: 'itv-myk8s-145',
    level: 'advanced',
    kind: 'open',
    prompt: 'How do you implement chaos engineering in Kubernetes?',
    probing:
      'Whether you run chaos as a controlled experiment with a hypothesis, small scope and abort thresholds.',
    answer: [
      'Use Chaos Mesh/LitmusChaos → Inject pod/node failures → Test resilience → Monitor recovery.',
      '**Detailed interview approach:** I define a hypothesis tied to an SLO — something like "losing one Pod causes no user-visible errors" — and I make sure monitoring, a rollback path, a clear owner, and abort thresholds are all in place first.',
      'I run the experiment in staging first, then in production with the smallest possible scope: one service or Pod, a low-traffic window, a short duration, and no other risky change happening at the same time.',
      'Tools like Chaos Mesh can inject Pod, network, or resource faults, but access to them is tightly controlled. Something watches error rate, latency, saturation, and data integrity the whole time, and stops the experiment immediately if it crosses a threshold.',
      "I compare what actually recovered against the hypothesis, record any gaps, fix the probes, capacity, retries, or runbooks, and rerun it. Chaos engineering is never just unlimited random failure — it's a controlled experiment.",
    ],
    followUps: [
      'What would your first chaos experiment be?',
      'How do you decide abort thresholds?',
    ],
    tags: ['chaos engineering', 'resilience'],
  },
  {
    id: 'itv-myk8s-146',
    level: 'advanced',
    kind: 'open',
    prompt: 'How do you integrate Kubernetes into a CI/CD pipeline?',
    probing:
      'Whether you build once, promote the same digest, use GitOps or scoped identity and keep full traceability.',
    answer: [
      'On a pull request, I run tests, lint, and secret, dependency, and IaC scans. On the main branch, I build the image once, generate an SBOM, scan it, sign it, and push it by its immutable digest.',
      'I render the Helm or Kustomize output and run schema and policy checks against it. I deploy to staging through GitOps where possible, or with a least-privilege CI identity otherwise, then run rollout, smoke, and integration checks.',
      'Once approved, I progressively promote that same digest through the higher environments, monitoring SLOs and ready to roll back traffic or version at any point.',
      'Secrets come from an external manager or workload identity — never an admin kubeconfig in the pipeline. Environments, config, and state stay separated, and concurrency controls prevent two overlapping deploys to the same production environment. Database changes follow an expand, migrate, contract pattern.',
      "The pipeline records the commit, the image digest, the manifests or chart used, the scan results, approvals, the cluster, deployment, and revision, and the verification results. If a deploy fails, its events and logs are preserved, and it's reverted through Git, Helm, or the controller once it's safe to do so.",
      'A typical delivery flow builds and scans an image, publishes it to a registry, validates manifests or Helm charts, deploys to a lower environment, runs tests, and promotes an immutable version — one that is never changed after it is created, only replaced.',
      '- **Push deployment:** CI credentials apply changes to the cluster.\n- **Pull-based GitOps:** Argo CD or Flux reconciles cluster state from Git/OCI sources.',
      'GitOps provides continuous reconciliation and drift visibility. Projects that combine Terraform, EKS/AKS, Helm, Jenkins, Argo CD/Flux, Prometheus, and Grafana demonstrate the full infrastructure-to-observability lifecycle.',
    ],
    followUps: [
      'Why build the image once and promote it rather than rebuilding per environment?',
      'How do you stop two pipelines deploying to production at the same time?',
    ],
    tags: ['ci/cd', 'gitops', 'pipelines'],
  },
  {
    id: 'itv-myk8s-147',
    level: 'advanced',
    kind: 'open',
    prompt:
      'How would you design a GitOps workflow for more than 20 teams with independent release cycles?',
    probing:
      'Whether you can separate platform and app ownership and enforce team boundaries with Argo CD Projects or Flux tenancy.',
    answer: [
      'I separate platform configuration from application delivery. A platform team owns the cluster add-ons, admission policy, namespaces, common charts, and the GitOps controllers themselves.',
      "Each application team owns its own scoped repository or directory. Argo CD Projects, or Flux's own tenancy rules, restrict which repositories, namespaces, clusters, and resource kinds each team can touch, so one team can't alter another team's workloads or the cluster-wide controls.",
      "The flow looks like this: commit, CI tests and scans it, it becomes an immutable signed image, a pull request updates the digest or chart version, policy and the owner review it, GitOps reconciles the cluster, and then progressive health checks confirm it's actually working.",
      'Teams release independently within their own application boundaries. Promotion just moves the same tested artifact forward instead of rebuilding it for each environment.',
      'ApplicationSets, or generated configuration, cut down on repetition without collapsing everything into one giant shared values file.',
      'I add branch protection, CODEOWNERS, schema and policy tests, external secret references, sync ordering for dependencies, safe pruning, and rollback through a Git revert. Dashboards track sync health, drift, controller permissions, rollout SLOs, and how long reconciliation actually takes.',
      'Break-glass changes are time-limited and get captured back into Git immediately.',
    ],
    followUps: [
      'How do ApplicationSets help at this scale?',
      'How do you handle a break-glass change?',
    ],
    tags: ['gitops', 'argo cd', 'multi-team'],
  },
  {
    id: 'itv-myk8s-148',
    level: 'intermediate',
    kind: 'open',
    prompt: 'How do you handle configuration drift in Kubernetes?',
    probing:
      'Whether you use continuous reconciliation from Git and capture emergency changes back into Git.',
    answer: [
      'Use GitOps tools like ArgoCD/Flux → Ensure cluster config matches Git repo → Auto-revert manual changes.',
      '**Detailed interview approach:** Git holds the reviewed, desired configuration in immutable, versioned commits. Argo CD or Flux continuously compares that against the live cluster and reconciles any difference.',
      'I separate environment permissions and repositories, require branch protection and policy or security checks, and give the controller only the cluster scope it actually needs.',
      'A manual emergency change might temporarily pause sync, but it gets captured through a pull request right away — otherwise reconciliation will correctly remove it again. A rollback is just a Git revert to the last known-good commit, followed by a sync and a health and SLO check.',
      'Secrets use an external-secret or encrypted-secret workflow, never plaintext in Git. Sync failures, drift, controller access, and audit events are all monitored, and destructive pruning has explicit safeguards around it.',
    ],
    tags: ['gitops', 'drift'],
  },
  {
    id: 'itv-myk8s-149',
    level: 'intermediate',
    kind: 'open',
    prompt: 'How do you optimize Kubernetes cluster costs?',
    probing:
      'Whether you optimise from usage evidence with right-sizing, autoscaling and spot, and verify SLOs afterwards.',
    answer: [
      'Use Cluster Autoscaler, rightsizing pods with requests/limits, spot/preemptible nodes, and scale workloads by time of day.',
      '**Detailed interview approach:** I compare cost by service, account or subscription, region, tag, SKU, and usage metric against the normal baseline and recent deployments. I check whether the increase comes from real traffic, runaway autoscaling, orphaned resources, log or egress volume, a pricing or commitment change, or even compromised compute.',
      'I contain it safely with budgets, scaling caps, quotas, or shutting down confirmed non-production waste — never by blindly deleting stateful production resources. Terraform plans get cost estimates and require policy or approval above certain thresholds.',
      'Required tags, anomaly alerts, rightsizing, schedules, lifecycle retention, reserved or spot instance choices, and owner showback are what make cost optimization an ongoing habit rather than a one-time cleanup. I always verify performance and SLOs are still fine after reducing cost.',
    ],
    tags: ['cost', 'finops'],
  },
  {
    id: 'itv-myk8s-150',
    level: 'intermediate',
    kind: 'open',
    prompt: 'How do you deliver microservices to Kubernetes with Helm?',
    probing:
      'Whether you separate chart templates from environment values and prove health beyond a successful Helm release.',
    answer: [
      'Helm charts define the workload, Service, ingress/Gateway routes, configuration, resource limits, probes and policy-compatible metadata.',
      'Store chart templates separately from environment values; promote an immutable chart version and image digest rather than rebuilding for each environment.',
      'A typical release validates with `helm lint` and `helm template`, runs policy/security checks, deploys with limited `--wait`/`--atomic` behavior where suitable, then proves health through real requests and observability. Helm release success alone is not application success.',
    ],
    tags: ['helm', 'delivery'],
  },
  {
    id: 'itv-myk8s-151',
    level: 'advanced',
    kind: 'open',
    prompt: 'What goes into a production microservices design checklist on Kubernetes?',
    probing:
      'Whether you can cover ownership, traffic, scaling, security and observability in one production design.',
    answer: [
      'A microservices platform should define clear service and data ownership, package each service in a small non-root image, and keep configuration separate from the image.',
      'Kubernetes Deployments, Services, Ingress, ConfigMaps, external secret integration, resource requests, and health probes form the basic workload contract.',
      'Traffic design includes a supported ingress controller, TLS automation, authentication, rate limiting, and private service communication. A service mesh such as Istio or Linkerd is justified when workload identity, mTLS, traffic policy, or detailed service monitoring data outweighs its additional operational cost.',
      'Scaling must cover both Pods and nodes. HPA handles suitable utilization or application metrics, VPA recommends or changes resource sizing with restart considerations, KEDA handles event/queue-driven demand, and the cluster autoscaler supplies node capacity.',
      'Load testing must verify dependency limits and scale-down behavior.',
      'Security includes namespace and RBAC boundaries, default-deny NetworkPolicies, Pod Security Admission, read-only/non-root containers, signed and scanned images, SBOMs, and secrets retrieved through workload identity.',
      'Observability combines Prometheus metrics, Grafana dashboards, structured logs through Fluent Bit/Loki or another log store, and OpenTelemetry/Jaeger traces with consistent service and request identifiers.',
    ],
    followUps: [
      'When is a service mesh worth its operational cost?',
      'How do you load-test scale-down as well as scale-up?',
    ],
    tags: ['microservices', 'design', 'platform'],
  },
]
