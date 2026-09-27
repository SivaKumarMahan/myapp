import type { InterviewQuestion } from '../../../types'

/** AI-Assisted Kubernetes Upgrade Readiness Assessment. */
export const myAiUpgradeQuestions: InterviewQuestion[] = [
  {
    id: 'itv-myai-60',
    level: 'advanced',
    kind: 'open',
    prompt: 'Walk me through your AI-assisted Kubernetes upgrade readiness assessment project.',
    probing:
      'Whether you understand that an upgrade touches APIs, add-ons, CRDs, webhooks and capacity, and that AI only explains verified facts.',
    answer: [
      '**One line:** I designed an AI-assisted readiness tool that combines live Kubernetes evidence, manifests, release notes and vendor compatibility matrices to decide whether a cluster upgrade is safe, what could break, what must be fixed first, and how to validate and roll back the change.',
      '**30-second answer:** I designed an AI-assisted Kubernetes upgrade risk assessor. Before an upgrade, it gathers read-only evidence about cluster and node versions, workloads, APIs, CRDs, operators, admission webhooks, CNI, CSI, runtime and resource pressure. It then checks every intermediate Kubernetes release and verifies installed add-ons against official compatibility information. Predictable checks find removed APIs and unsafe settings, while AI compares the large evidence set, explains failure scenarios and produces a risk matrix, readiness score and ordered fix plan. Unknown compatibility is never treated as safe, and AI never performs the upgrade. A platform engineer reviews the evidence, tests the upgrade in a representative environment, follows the approved runbook and validates service health after each phase.',
      '**Two-minute answer:** a Kubernetes upgrade is not just changing the control-plane version. The API server may remove an API, an operator may not support the target version, a conversion webhook may stop working, a CSI driver may lose compatibility, or draining a node may expose missing capacity and PodDisruptionBudget problems.',
      'I split the assessment into four parts:\n1. A read-only collector inventories the cluster and supporting configuration.\n2. A compatibility engine checks objective rules such as version skew, removed APIs, CRD storage versions and add-on support.\n3. A retrieval layer obtains the official Kubernetes release notes and vendor compatibility documents for every version step.\n4. An AI reasoning layer compares the verified facts, models failure scenarios and creates a simple executive and engineering report.',
      'The report separates verified, probable, possible and unknown risks. For every issue it says what can break, during which upgrade phase, the impact, severity, supporting evidence and required fix. It ends with an `APPROVED`, `CONDITIONAL` or `NOT RECOMMENDED` decision, but the decision is accepted only after predictable validation and human review.',
      'The key principle is conservative reasoning: if compatibility cannot be verified, it reduces confidence and cannot silently become a pass.',
      '**Honest closing statement:** this project shows how I would use AI to improve a Kubernetes platform task without giving AI unsafe control. The system gathers read-only evidence, verifies compatibility against authoritative sources, uses predictable logic for technical gates, and uses AI to compare and explain risks. The supplied repository is an assessment design, so I would describe it as designed or prototyped until I have implemented the collector, evaluated it with known failure scenarios, rehearsed an upgrade and recorded real results.',
    ],
    followUps: [
      'Why check every intermediate version?',
      'Can AI approve the upgrade automatically?',
      'What is the difference between readiness and confidence?',
    ],
    tags: ['kubernetes', 'upgrade', 'project', 'ai'],
  },
  {
    id: 'itv-myai-61',
    level: 'basic',
    kind: 'open',
    prompt: 'What can you honestly claim about the Kubernetes upgrade assessment project?',
    probing: 'Credibility: a prompt/design is not evidence of a successful upgrade.',
    answer: [
      'The supplied project contains one detailed assessment prompt and an Apache 2.0 license. It does not contain an implemented application, cluster collector, AI integration, assessment output, automated tests, upgrade execution logs or production results.',
      'In an interview I should say **"I designed an AI-assisted Kubernetes upgrade assessment workflow"** unless I have separately implemented and validated it against real clusters. The prompt defines what the assessment must do; it is not evidence that a cluster was successfully upgraded.',
    ],
    tags: ['kubernetes', 'upgrade', 'honesty'],
  },
  {
    id: 'itv-myai-62',
    level: 'intermediate',
    kind: 'open',
    prompt:
      'What problem does the upgrade readiness assessment solve and what questions must it answer?',
    probing: 'Understanding why upgrades are risky beyond the control-plane version.',
    answer: [
      '**Problem:**\n- Kubernetes changes across every minor release, not only at the final target version.\n- Cluster add-ons have their own Kubernetes compatibility ranges and upgrade ordering.\n- Custom Resources may depend on conversion webhooks and controller behavior.\n- Node drain can cause capacity, disruption-budget, local-storage or scheduling failures.\n- Networking, DNS and storage problems may appear only after nodes or workloads restart.\n- Manually checking many release notes and vendor matrices is slow and easy to miss.',
      '**Goal** — a repeatable pre-upgrade assessment that answers:\n- Is the source-to-target path supported?\n- What will break and when?\n- What must be upgraded or migrated first?\n- Is there enough capacity to drain and replace nodes safely?\n- What is still unknown?\n- What is the correct upgrade, validation and rollback order?',
      'Scores help summarize the assessment, but evidence and explicit blockers determine the decision. A high average score must never hide one critical incompatibility.',
    ],
    code: [
      {
        title: 'Expected result',
        language: 'text',
        code: `Decision: CONDITIONAL
Source: 1.x
Target: 1.y
Readiness: 78/100
Confidence: 84%

Verified blocker:
  Component: example-controller
  Evidence: installed version does not support target Kubernetes version
  Break point: first reconciliation (making actual state match desired state) after control-plane upgrade
  Impact: custom resources stop reconciling
  Required action: upgrade controller and CRDs before cluster upgrade`,
      },
    ],
    tags: ['kubernetes', 'upgrade'],
  },
  {
    id: 'itv-myai-63',
    level: 'advanced',
    kind: 'open',
    prompt: 'Explain the architecture and suggested technology stack of the upgrade assessor.',
    probing: 'Separation of evidence collection, compatibility rules and AI interpretation.',
    answer: [
      'An assessment request (cluster, source version, target version) goes to a read-only evidence collector (cluster, workloads, APIs, CRDs, add-ons, webhooks, CNI, CSI, runtime, capacity). Normalized evidence flows into a compatibility and source-verification layer (rules, release notes, vendor matrices, version skew, policy, manifest scanning). Cited facts and unknowns go to AI reasoning and report generation, then through schema and policy validation into a human-reviewed readiness report.',
      'AI is not the source of truth. Live cluster evidence and official compatibility documentation are the source of truth; AI helps compare and explain them.',
      '- **Collector — Python, Kubernetes Python client or controlled `kubectl`**: read cluster objects and status\n- **API — FastAPI and Pydantic**: start assessments and validate structured results\n- **Compatibility — predictable Python rules**: version skew, API, CRD, capacity and policy checks\n- **Manifest scanning — Pluto, kubent or equivalent plus repository scanning**: find deprecated/removed APIs in deployed and source manifests\n- **Documentation retrieval — official Kubernetes and vendor sources**: verify changes and add-on support\n- **AI — approved LLM with structured output**: compare evidence and explain risk\n- **Persistence — PostgreSQL/object storage**: store evidence snapshot, citations, report and audit history\n- **Execution — background worker/queue**: run long assessments with retry and cancellation\n- **Observability — metrics, structured logs and traces**: audit duration, errors and evidence coverage',
      'The exact tools may vary. The important design choice is to separate evidence collection, compatibility rules and AI interpretation.',
    ],
    code: [
      {
        title: 'High-level architecture',
        language: 'text',
        code: `┌──────────────────────────────────────────────┐
│ Assessment request                          │
│ Cluster + source version + target version   │
└─────────────────────┬────────────────────────┘
                      ▼
┌──────────────────────────────────────────────┐
│ Read-only evidence collector                 │
│ cluster | workloads | APIs | CRDs | add-ons  │
│ webhooks | CNI | CSI | runtime | capacity    │
└──────────────┬───────────────────────────────┘
               │ normalized evidence
               ▼
┌──────────────────────────────────────────────┐
│ Compatibility and source-verification layer  │
│ rules | release notes | vendor matrices      │
│ version skew | policy | manifest scanning    │
└──────────────┬───────────────────────────────┘
               │ cited facts and unknowns
               ▼
┌──────────────────────────────────────────────┐
│ AI reasoning and report generation           │
│ correlation | failure modeling | explanation │
└──────────────┬───────────────────────────────┘
               │ schema and policy validation
               ▼
┌──────────────────────────────────────────────┐
│ Human-reviewed readiness report              │
│ decision | risks | remediation | runbook      │
└──────────────────────────────────────────────┘`,
      },
    ],
    followUps: ['Why keep compatibility rules deterministic rather than asking the LLM?'],
    tags: ['kubernetes', 'upgrade', 'architecture'],
  },
  {
    id: 'itv-myai-64',
    level: 'advanced',
    kind: 'open',
    prompt:
      'How does the assessment validate the upgrade path, snapshot the cluster and inventory controllers (Phases 1–3)?',
    probing:
      'Sequential minor upgrades, safe read-only collection, and reliable version evidence for add-ons.',
    answer: [
      '**Phase 1 — validate the requested upgrade path.** I record:\n- cluster type and provider\n- source and target Kubernetes versions\n- managed or self-managed control plane\n- high-availability topology\n- maintenance window and business criticality\n- provider-specific supported upgrade path',
      'I evaluate every intermediate minor version. If the platform supports only sequential minor upgrades, a multi-version request is converted into several gated steps. APIs, defaults and supported version-skew can change at each minor release, so a direct source-to-target comparison may miss a required migration or unsupported upgrade hop.',
      '**Phase 2 — capture a read-only cluster snapshot.** Beyond the core commands, I additionally collect Deployments, StatefulSets, DaemonSets, Jobs, CronJobs, Services, Ingresses, NetworkPolicies, StorageClasses, PVs, PVCs, VolumeSnapshots, PodDisruptionBudgets, priority classes, events and relevant node conditions. Every command has an allow-list, timeout, output limit, correlation ID and sanitized error handling. Collection uses a least-privilege (minimum required access) read-only identity and never fetches Secret values.',
      '**Phase 3 — inventory controllers and operators.** I identify standard, vendor and internal components using labels, images, Helm releases, namespaces and Custom Resource ownership, for example:\n- ingress and DNS controllers\n- metrics-server and autoscalers\n- cert-manager\n- Prometheus Operator\n- Argo CD or Flux\n- service meshes\n- policy engines\n- backup tools\n- CNI and CSI drivers\n- cloud-provider controllers',
      'For each component I record installed version, source of version evidence, current support, target support, known upgrade notes and whether it must be upgraded before or after Kubernetes. Image tags are helpful but not always reliable; digests, Helm metadata, component endpoints and vendor-supported detection methods provide stronger evidence.',
    ],
    code: [
      {
        title: 'Gated upgrade path',
        language: 'text',
        code: `source -> next minor -> validation -> next minor -> validation -> target`,
      },
      {
        title: 'Read-only cluster snapshot',
        language: 'bash',
        code: `kubectl version
kubectl cluster-info
kubectl get nodes -o wide
kubectl api-resources
kubectl get apiservices
kubectl get all -A
kubectl get crd -o yaml
kubectl get validatingwebhookconfigurations
kubectl get mutatingwebhookconfigurations
kubectl top nodes
kubectl top pods -A`,
      },
    ],
    followUps: ['Why are image tags weak evidence of an add-on version?'],
    tags: ['kubernetes', 'upgrade', 'inventory'],
  },
  {
    id: 'itv-myai-65',
    level: 'advanced',
    kind: 'open',
    prompt:
      'How do you analyze release changes and find deprecated or removed APIs accurately (Phases 4–5)?',
    probing:
      'Knowing that live YAML shows the served version, so source manifests and API-request evidence are needed too.',
    answer: [
      '**Phase 4 — analyze all intermediate release changes.** The retrieval layer reads official release notes, changelogs, deprecation guides, upgrade notes and provider documentation for every version transition. It extracts:\n- API removals and deprecations\n- feature-gate changes\n- kubelet and runtime requirements\n- security and admission behavior changes\n- networking, DNS and proxy changes\n- storage and CSI changes\n- scheduler and eviction changes\n- version-skew restrictions',
      'Each claim in the final report retains its source URL, document version and retrieval time. If official support cannot be found, the component becomes an unknown risk rather than a pass.',
      '**Phase 5 — scan APIs and manifests** in three places:\n1. Objects currently exposed by the API server\n2. Stored and requested API usage from metrics or audit evidence\n3. Git, Helm and deployment manifests that may recreate an old API later',
      'This distinction matters because `kubectl get -o yaml` normally shows the version currently served by the API server. The API server can convert objects, so scanning only live YAML may miss an old API still present in a Helm chart or CI repository. I therefore scan source manifests and, where available, API request metrics/audit logs as well.',
      'In short, I combine a versioned removal database, repository/Helm manifest scanning, live discovery and API-request metrics or audit logs.',
    ],
    code: [
      {
        title: 'Per-object API finding',
        language: 'text',
        code: `Namespace and object
Current/source API
Removal or behavior-change version
Evidence location
Failure point
Required manifest migration`,
      },
    ],
    followUps: ['Would you automatically fix removed APIs?'],
    tags: ['kubernetes', 'upgrade', 'deprecated apis'],
  },
  {
    id: 'itv-myai-66',
    level: 'advanced',
    kind: 'open',
    prompt:
      'How do you assess CRDs, conversion and admission webhooks before an upgrade (Phases 6–7)?',
    probing: 'CRD storage versions and fail-closed webhooks as hidden upgrade blockers.',
    answer: [
      '**Phase 6 — CRDs and conversion.** For every CRD I verify:\n- `apiextensions.k8s.io` compatibility\n- served and storage versions\n- `status.storedVersions`\n- structural OpenAPI schema\n- validation and defaulting behavior\n- conversion strategy and webhook service\n- webhook certificate, CA bundle and endpoint availability\n- controller support for every stored/served version\n- need for storage-version migration',
      'A CRD definition being accepted does not prove that its controller can reconcile (make actual state match desired state) objects on the target Kubernetes version. CRD and controller compatibility are separate gates.',
      '**Phase 7 — admission webhooks.** I review validating and mutating webhooks for:\n- service and endpoint health\n- TLS certificate validity and CA configuration\n- supported admission review versions\n- namespace/object selectors\n- timeout and `failurePolicy`\n- side effects and reinvocation behavior\n- controller compatibility',
      'A failing webhook with `failurePolicy: Fail` can block Pod creation or other API writes, so it may be a critical pre-upgrade dependency.',
    ],
    followUps: ['What happens to existing objects stored in a version that is no longer served?'],
    tags: ['kubernetes', 'upgrade', 'crd', 'webhooks'],
  },
  {
    id: 'itv-myai-67',
    level: 'advanced',
    kind: 'open',
    prompt:
      'How do you assess networking, storage, runtime and node-drain capacity risk (Phases 8–9)?',
    probing: 'Whether you think about what happens when nodes are drained and workloads restart.',
    answer: [
      '**Phase 8.** Networking checks include CNI support, CoreDNS, kube-proxy or replacement, Services, Ingress controllers, NetworkPolicies and provider load-balancer controllers. Storage checks include CSI driver versions, StorageClasses, reclaim policies, snapshots, attachment behavior, PV/PVC health and stateful workload disruption. Node/runtime checks include OS image, kernel, container runtime, CRI, kubelet version, taints, allocatable resources and provider image support.',
      '**Phase 9 — drain and capacity.** Before upgrading a worker node, I determine whether its Pods can move elsewhere:\n- enough spare CPU, memory, pod IPs and volume attachment capacity\n- valid PodDisruptionBudgets\n- replicas spread across nodes/zones\n- no blocking local storage or unmanaged static Pods\n- topology, affinity, anti-affinity, taint and selector constraints\n- critical DaemonSets and priority/preemption behavior',
      'The exact drain options depend on policy. I would never add `--delete-emptydir-data` or force eviction automatically without understanding data and availability impact.',
    ],
    code: [
      {
        title: 'Dry-run drain preparation',
        language: 'bash',
        code: `kubectl get pdb -A
kubectl get pods -A -o wide
kubectl describe node <node>
kubectl drain <node> --ignore-daemonsets --dry-run=server`,
      },
    ],
    followUps: ['How would you upgrade with minimum downtime?'],
    tags: ['kubernetes', 'upgrade', 'capacity'],
  },
  {
    id: 'itv-myai-68',
    level: 'advanced',
    kind: 'open',
    prompt:
      'How is the upgrade report generated and validated (Phase 10), and how are risks classified?',
    probing: 'Schema validation and policy gates that the LLM cannot override.',
    answer: [
      'The AI receives normalized, redacted evidence and retrieved compatibility facts and returns a strict schema. The backend validates the schema, recalculates scores, checks citations and applies policy gates. The LLM cannot turn a predictable critical failure into `APPROVED`.',
      '- **PASS**: verified compatible with strong evidence — continue\n- **GOOD**: no issue found; normal validation still required — continue with checks\n- **WARNING**: non-blocking concern or migration approaching — schedule fix\n- **HIGH RISK**: likely outage or major decline without fix — fix before upgrade\n- **CRITICAL**: verified blocker, data risk or unsupported path — do not upgrade',
      'Every finding uses the mandatory failure format: what will break, when it will break, impact, severity, evidence, remediation and validation.',
    ],
    code: [
      {
        title: 'Report schema',
        language: 'json',
        code: `{
  "decision": "CONDITIONAL",
  "readiness_score": 78,
  "confidence": 84,
  "verified_issues": [],
  "probable_issues": [],
  "possible_issues": [],
  "unknown_risks": [],
  "required_actions": [],
  "upgrade_order": [],
  "post_upgrade_validations": []
}`,
      },
      {
        title: 'Mandatory failure format',
        language: 'text',
        code: `WHAT WILL BREAK:
WHEN IT WILL BREAK:
IMPACT:
SEVERITY:
EVIDENCE:
REMEDIATION:
VALIDATION:`,
      },
    ],
    followUps: ['What would make the backend reject an AI-generated report?'],
    tags: ['kubernetes', 'upgrade', 'risk'],
  },
  {
    id: 'itv-myai-69',
    level: 'intermediate',
    kind: 'open',
    prompt:
      'What is the difference between readiness and confidence in the upgrade assessment, and how are they scored?',
    probing: 'That a high readiness score with low confidence is not safe to approve.',
    answer: [
      'Readiness measures known technical risk. Confidence measures how complete and trustworthy the evidence is. They answer different questions: a cluster may have few known risks but low confidence because important controllers or namespaces were inaccessible.',
      'Predictable deductions are mapped to severity, with a critical blocker also forcing `NOT RECOMMENDED` regardless of the total. The weights must be versioned and agreed with the platform team rather than invented by the LLM.',
      'An assessment with readiness `95` and confidence `45%` is not safe to approve. It means few known problems were found but too much remains unverified.',
    ],
    code: [
      {
        title: 'Example readiness model',
        language: 'text',
        code: `APIs             15 points
CRDs             15 points
Controllers      15 points
Webhooks         10 points
Networking       10 points
Storage          10 points
Security          8 points
Runtime/nodes    12 points
Control plane     5 points
Total           100 points`,
      },
      {
        title: 'Confidence inputs',
        language: 'text',
        code: `cluster inventory completeness
+ release-note coverage
+ verified controller matrices
+ verified CRD ownership
+ provider/runtime evidence
- unknown or inaccessible components`,
      },
    ],
    tags: ['kubernetes', 'upgrade', 'scoring'],
  },
  {
    id: 'itv-myai-70',
    level: 'advanced',
    kind: 'open',
    prompt:
      'Once the assessment is approved, what does the upgrade execution runbook look like, and how do you minimise downtime?',
    probing: 'Ordered, gated execution with backups, add-on ordering and batch node upgrades.',
    answer: [
      'The assessment does not execute the upgrade. A reviewed runbook normally includes:\n1. Back up etcd or confirm the managed-provider recovery mechanism.\n2. Back up critical application data and verify restore procedures.\n3. Freeze or coordinate risky platform changes.\n4. Remediate removed APIs and incompatible CRDs/controllers.\n5. Upgrade add-ons that must precede the control plane.\n6. Validate the plan in a representative non-production cluster.\n7. Upgrade one supported minor version at a time.\n8. Upgrade the control plane according to provider procedure.\n9. Run the control-plane validation gate.\n10. Drain and replace/upgrade worker nodes in controlled batches.\n11. Validate each node pool and availability zone before continuing.\n12. Upgrade add-ons that must follow the cluster version.\n13. Run application, networking, storage, policy and observability tests.\n14. Observe the cluster through the agreed soak period.',
      "Managed services such as AKS, EKS and GKE have provider-specific order, supported versions, node-image procedures and rollback limitations. The runbook must use the provider's current official process.",
      '**Minimum downtime:** I ensure spare capacity and multiple replicas, correct PDBs and topology spread, upgrade the control plane first where required, then drain and replace nodes in small batches, validating service health after each batch. Stateful and singleton workloads receive specific runbooks.',
    ],
    followUps: ['Why upgrade one minor version at a time?'],
    tags: ['kubernetes', 'upgrade', 'runbook'],
  },
  {
    id: 'itv-myai-71',
    level: 'intermediate',
    kind: 'open',
    prompt: 'How do you validate a Kubernetes cluster after an upgrade?',
    probing: 'Going beyond `kubectl get nodes` to service- and application-level checks.',
    answer: [
      'I validate more than `kubectl get nodes`:\n- all nodes Ready and on supported kubelet/runtime versions\n- system Pods healthy with no new restart loops\n- APIService and webhook availability\n- Deployments, StatefulSets and DaemonSets at desired replicas\n- operators reconciling and Custom Resources healthy\n- DNS resolution and internal/external traffic\n- Ingress, load balancer and NetworkPolicy behavior\n- PVC mount, read/write and snapshot/restore checks\n- autoscaling and scheduling\n- admission, RBAC and Pod Security behavior\n- monitoring, logging and alert delivery\n- application synthetic tests and critical business transactions\n- error rate, latency, saturation (how close a resource is to its limit) and event comparison with baseline',
      'Command success alone is not sufficient; service-level and application-level validation are required.',
    ],
    code: [
      {
        title: 'Post-upgrade commands',
        language: 'bash',
        code: `kubectl get nodes -o wide
kubectl get pods -A
kubectl get apiservices
kubectl get events -A --sort-by=.metadata.creationTimestamp
kubectl rollout status deployment/<name> -n <namespace>`,
      },
    ],
    tags: ['kubernetes', 'upgrade', 'validation'],
  },
  {
    id: 'itv-myai-72',
    level: 'advanced',
    kind: 'scenario',
    prompt:
      'A Kubernetes upgrade fails partway through. What is your rollback and recovery approach?',
    probing:
      'Knowing that control-plane downgrades are often unsupported, so recovery is designed in advance.',
    answer: [
      'Rollback must be designed before the change. I document:\n- provider-supported control-plane recovery or limitations\n- node-pool rollback/replacement method\n- previous add-on, Helm chart and manifest versions\n- etcd backup and tested restore process for self-managed clusters\n- application-data backup and restore ownership\n- traffic-shift or failover plan\n- stop conditions and decision authority',
      'Kubernetes downgrades are not generally something I assume is safe. On managed platforms, control-plane rollback may be unavailable. Therefore forward fix, replacement node pools, backup restore or cluster failover may be the real recovery method.',
      'If the upgrade fails, I stop at the defined gate, preserve evidence, restore traffic or capacity using the prepared recovery method, and follow provider-specific recovery. I do not assume a control-plane downgrade is supported.',
    ],
    followUps: ['How would you fail over to another cluster during an upgrade?'],
    tags: ['kubernetes', 'upgrade', 'rollback'],
  },
  {
    id: 'itv-myai-73',
    level: 'advanced',
    kind: 'open',
    prompt:
      'How is AI used safely in the upgrade assessment, and why use AI for an upgrade at all?',
    probing:
      'Clear good-use list, deterministic list, and controls against invented compatibility.',
    answer: [
      'An upgrade produces a large, cross-component evidence set. AI helps compare and explain it, but predictable rules and official documentation decide compatibility. This reduces manual reading without allowing the model to invent support.',
      '**Good uses of AI:**\n- summarize changes across several release documents\n- compare a removed API with affected manifests and workloads\n- explain why a webhook or controller creates upgrade risk\n- organize findings by failure phase and severity\n- draft fix, validation and runbook steps\n- highlight contradictions and missing evidence',
      '**Tasks kept predictable:**\n- cluster collection\n- semantic version comparison\n- API removal tables\n- compatibility-matrix parsing and citations\n- readiness/confidence calculation\n- policy gates\n- command allow-listing\n- final approval and upgrade execution',
      '**Controls:**\n- Treat resource names, annotations, labels and CRD text as untrusted input.\n- Redact Secret data, tokens, private URLs and sensitive configuration.\n- Require citations for compatibility claims.\n- Reject claims that are not supported by collected or retrieved evidence.\n- Validate structured output and score calculations server-side.\n- Keep collection read-only and separate from upgrade credentials.\n- Require platform-owner approval for the report and change runbook.\n- Record evidence hashes, prompt/model version and assessment time for audit.',
      "**Can AI approve the upgrade automatically?** No. It can generate a recommendation. Predictable blockers, provider policy, staging evidence and a platform engineer's change approval determine whether execution proceeds.",
    ],
    followUps: ['How do you stop the model from assuming an add-on is compatible?'],
    tags: ['kubernetes', 'upgrade', 'ai', 'safety'],
  },
  {
    id: 'itv-myai-74',
    level: 'intermediate',
    kind: 'open',
    prompt:
      'How does the upgrade assessor handle errors and unknowns, such as an operator with no compatibility matrix?',
    probing: 'Unknown is not the same as safe.',
    answer: [
      '- **Namespace is inaccessible**: mark inventory incomplete and reduce confidence\n- **Metrics Server unavailable**: do not infer capacity safety from missing metrics\n- **Operator version unknown**: classify support as unknown/high risk based on criticality\n- **Vendor matrix unavailable**: do not let the model assume compatibility\n- **Release-note retrieval incomplete**: block final approval or lower confidence below policy threshold\n- **CRD owner cannot be identified**: report unknown reconciliation risk\n- **Webhook endpoint is unhealthy**: flag possible API-write/deployment failure\n- **AI output is invalid**: fail report generation safely; preserve collected evidence\n- **Cluster changes during scan**: record timestamps/resource versions and warn about snapshot inconsistency',
      'Unknown does not always mean the component will fail, but it means the assessor cannot prove that it is safe.',
      'If an operator has no compatibility matrix, I contact the owner/vendor, inspect release and test evidence, and rehearse it against the target. Until verified, I report an unknown risk and reduce confidence; I do not mark it compatible. Internal controllers with no public matrix require owner confirmation and test evidence.',
    ],
    tags: ['kubernetes', 'upgrade', 'unknowns'],
  },
  {
    id: 'itv-myai-75',
    level: 'advanced',
    kind: 'open',
    prompt: 'How would you test the upgrade assessor and rehearse the upgrade?',
    probing: 'Known-bad fixtures and a staging rehearsal as the strongest validation.',
    answer: [
      '**Unit tests:**\n- version-range and version-skew calculations\n- release-to-removal mapping\n- CRD served/storage-version checks\n- severity and policy-gate rules\n- readiness and confidence calculations\n- redaction and prompt-injection defenses\n- structured AI response validation',
      '**Integration tests:**\n- collector behavior with RBAC denial, timeout and partial APIs\n- clusters containing deprecated manifests and unhealthy APIService objects\n- conversion and admission webhook failure scenarios\n- fake vendor matrices and missing-source behavior\n- database evidence/report ownership\n- background job retry and cancellation',
      '**Scenario evaluation** — known test clusters or fixtures for:\n- removed API in a Git manifest but not visible in live output\n- old cert-manager or ingress controller\n- CRD with conversion webhook failure\n- blocking PodDisruptionBudget\n- insufficient node-drain capacity\n- incompatible CNI or CSI version\n- expired webhook certificate\n- privileged workload affected by security-policy change',
      'Expected blockers and severities are reviewed by platform engineers and compared with the generated report.',
      '**Upgrade rehearsal:** the strongest validation is a representative staging or cloned environment. I run the exact upgrade sequence, failure tests and application checks, record differences, then update the production runbook.',
    ],
    followUps: ['How would you build a fixture for a removed API that only exists in Git?'],
    tags: ['kubernetes', 'upgrade', 'testing'],
  },
  {
    id: 'itv-myai-76',
    level: 'intermediate',
    kind: 'open',
    prompt: 'How would you measure the success of the upgrade assessor?',
    probing: 'Defensible outcomes: confirmed findings and fixes, not claims of prevented outages.',
    answer: [
      '- percentage of installed components with verified compatibility\n- deprecated/removed APIs found before the maintenance window\n- critical findings confirmed by engineers\n- false-positive and unsupported-claim rate\n- assessment duration compared with manual review\n- fix completion before upgrade\n- upgrade success without unplanned outage or data loss\n- post-upgrade error, latency and reconciliation health\n- number of rollbacks or emergency fixes\n- repeatability of assessment results from the same evidence snapshot',
      'I would not claim the AI "prevented an outage" without a confirmed finding and documented fix. A defensible outcome is that it identified a specific risk before the change and the team verified and fixed it.',
    ],
    tags: ['kubernetes', 'upgrade', 'metrics'],
  },
  {
    id: 'itv-myai-77',
    level: 'advanced',
    kind: 'open',
    prompt:
      'What were the main challenges in the upgrade assessor, what is the highest-risk area, and what would you improve next?',
    probing:
      'Awareness of changing compatibility data, phase-specific risk and false confidence from scores.',
    answer: [
      '**Compatibility information changes.** I retrieve and timestamp official version-specific sources for every assessment rather than relying on model memory.',
      '**Live objects can hide old source APIs.** I scan Git, Helm and CI manifests plus API-request evidence, not only `kubectl get` output.',
      '**Internal controllers may have no public matrix.** I require owner confirmation and test evidence; until then compatibility remains unknown and reduces confidence.',
      '**Upgrade risk is phase-specific.** Each finding states whether failure occurs during control-plane upgrade, node drain, node startup, first workload restart, first API write or first controller reconciliation.',
      '**A numeric score can create false confidence.** Critical policy gates override the weighted score, and unknowns reduce confidence separately.',
      '**Highest-risk area:** it depends on the cluster. Common high-risk areas are unsupported operators, admission webhooks that fail closed, CRD conversion, CNI/CSI incompatibility and workloads that cannot move during node drain. The assessment uses evidence rather than assuming one universal answer.',
      '**Future improvements:**\n1. Build provider adapters for AKS, EKS, GKE and self-managed clusters.\n2. Continuously inventory add-ons and warn before versions become unsupported.\n3. Integrate GitOps and Helm repositories for source-manifest scanning.\n4. Add Prometheus/audit-log API-usage detection.\n5. Maintain a versioned compatibility knowledge base with source citations.\n6. Generate a pull request for safe manifest migrations.\n7. Add a staging rehearsal pipeline and automated conformance/smoke tests.\n8. Model node drain using scheduler constraints and current capacity.\n9. Compare pre/post-upgrade SLOs and automatically assemble evidence.\n10. Add signed approvals, exceptions, expiry and assessment audit history.',
      '**Would you automatically fix removed APIs?** I can generate a reviewed Git pull request, but I would not modify live production resources blindly. The migration needs schema validation, controller support, testing and normal GitOps/change approval.',
    ],
    followUps: ['How would you continuously detect add-ons drifting out of support?'],
    tags: ['kubernetes', 'upgrade', 'challenges'],
  },
]
