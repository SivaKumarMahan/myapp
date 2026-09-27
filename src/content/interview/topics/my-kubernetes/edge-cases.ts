import type { InterviewQuestion } from '../../../types'

/** Tricky behaviour questions, EKS traffic routing, and the revision summaries from summary.md. */
export const myKubernetesEdgeCaseQuestions: InterviewQuestion[] = [
  {
    id: 'itv-myk8s-152',
    level: 'intermediate',
    kind: 'open',
    prompt:
      'If a Pod has initContainers that fail but the main container has `restartPolicy: Never`, what happens to the Pod status?',
    probing:
      'Whether you know init containers must all succeed and that restartPolicy Never makes an init failure fail the Pod.',
    answer: [
      'When an initContainer fails and the Pod has `restartPolicy: Never`, the Pod moves to the `Failed` phase and shows `Init:Error` permanently (`Init:CrashLoopBackOff` only appears when the restart policy allows retries). The main container never starts because initContainers must complete successfully before the main containers can begin. Key points:',
      "- InitContainers run sequentially and must succeed.\n- With `restartPolicy: Never`, failed initContainers won't restart.\n- The Pod becomes permanently stuck in a failed init state.\n- You need to delete and recreate the Pod to resolve this.",
      'Init containers run sequentially before application containers. If an init container fails with Pod `restartPolicy: Never`, the Pod fails and the main containers never start. A higher-level controller may create another Pod.',
    ],
    code: [
      {
        title: 'Pod whose init container always fails',
        language: 'yaml',
        code: `apiVersion: v1
kind: Pod
spec:
  restartPolicy: Never
  initContainers:
  - name: init-container
    image: busybox
    command: ['sh', '-c', 'exit 1']  # This will fail
  containers:
  - name: main-container
    image: nginx  # This will never start`,
      },
    ],
    tags: ['init containers', 'restart policy'],
  },
  {
    id: 'itv-myk8s-153',
    level: 'basic',
    kind: 'open',
    prompt:
      'When using a StatefulSet with 3 replicas and you delete replica-1, will replica-2 and replica-3 be renamed to maintain sequential ordering?',
    probing:
      'Whether you know StatefulSet Pods keep their ordinal names and are never renamed to fill gaps.',
    answer: [
      'No, Kubernetes does not rename existing StatefulSet Pods. If you delete `myapp-1`, only that specific Pod gets recreated with the same name. `myapp-2` and `myapp-3` retain their original names.',
      'StatefulSet naming behavior:',
      "- Pod names are persistent and ordinal-based (`myapp-0`, `myapp-1`, `myapp-2`).\n- When a Pod is deleted, it's recreated with the same name and ordinal.\n- Existing Pods are never renamed to fill gaps.\n- This maintains stable network identities and persistent storage associations.",
      'This is crucial for applications requiring stable network identities like databases or distributed systems.',
    ],
    tags: ['statefulset', 'identity'],
  },
  {
    id: 'itv-myk8s-154',
    level: 'intermediate',
    kind: 'open',
    prompt:
      'Can a DaemonSet Pod be scheduled on a master node that has a `NoSchedule` taint without explicitly adding tolerations?',
    probing:
      'Whether you know which tolerations DaemonSets get automatically and that the control-plane taint still needs one.',
    answer: [
      "No, DaemonSet Pods cannot be scheduled on nodes with `NoSchedule` taints unless they have matching tolerations. However, there's an important exception.",
      'The DaemonSet controller automatically adds tolerations for:',
      '- `node.kubernetes.io/not-ready`\n- `node.kubernetes.io/unreachable`\n- `node.kubernetes.io/disk-pressure`\n- `node.kubernetes.io/memory-pressure`\n- `node.kubernetes.io/pid-pressure`\n- `node.kubernetes.io/network-unavailable`',
      'For control-plane nodes with the `node-role.kubernetes.io/control-plane:NoSchedule` taint (older clusters used `node-role.kubernetes.io/master`), you must explicitly add:',
    ],
    code: [
      {
        title: 'Toleration for the control-plane taint',
        language: 'yaml',
        code: `spec:
  template:
    spec:
      tolerations:
      - key: node-role.kubernetes.io/control-plane
        operator: Exists
        effect: NoSchedule`,
      },
    ],
    tags: ['daemonset', 'taints', 'tolerations'],
  },
  {
    id: 'itv-myk8s-155',
    level: 'intermediate',
    kind: 'open',
    prompt:
      "If you update a Deployment's image while a rolling update is in progress, will Kubernetes wait for the current rollout to complete or start a new one immediately?",
    probing:
      'Whether you know a new template during a rollout triggers a rollover to the newest ReplicaSet immediately.',
    answer: [
      'Kubernetes immediately starts a new rollout, canceling the current one. Kubernetes calls this a rollover (sometimes described as a rollout interruption). What happens:',
      '- The current rolling update stops immediately.\n- A new ReplicaSet is created for the updated image.\n- The previous ReplicaSet (from the interrupted rollout) begins scaling down.\n- The new ReplicaSet scales up according to the rolling update strategy.',
      'You can observe this with:',
      'This can lead to more Pods than expected during the transition period, so monitor resource usage carefully.',
    ],
    code: [
      {
        title: 'Watch the rollover',
        language: 'bash',
        code: `kubectl rollout status deployment/myapp
kubectl rollout history deployment/myapp`,
      },
    ],
    tags: ['rolling updates', 'deployments'],
  },
  {
    id: 'itv-myk8s-156',
    level: 'intermediate',
    kind: 'open',
    prompt:
      'When a node becomes `NotReady`, how long does it take for Pods to be evicted, and can this be controlled per Pod?',
    probing:
      'Whether you know the default 300-second not-ready and unreachable tolerations and how tolerationSeconds changes them.',
    answer: [
      'By default, Pods are evicted after 5 minutes (300 seconds) when a node becomes `NotReady`. With taint-based eviction this comes from the default `tolerationSeconds: 300` that the DefaultTolerationSeconds admission plugin adds for the `not-ready` and `unreachable` taints; the old `--pod-eviction-timeout` controller-manager flag no longer controls it.',
      'Per-Pod control options:',
      '- **Toleration with `tolerationSeconds`:** Control how long a Pod tolerates node conditions.\n- **PodDisruptionBudgets:** Limit how many Pods can be evicted simultaneously.\n- **Priority and preemption:** Higher priority Pods evict lower priority ones first.',
      'An example toleration is shown in the code sample.',
    ],
    code: [
      {
        title: 'Evict after 60 seconds instead of 300',
        language: 'yaml',
        code: `tolerations:
- key: "node.kubernetes.io/not-ready"
  operator: "Exists"
  effect: "NoExecute"
  tolerationSeconds: 60  # Evict after 60 seconds instead of 300`,
      },
    ],
    tags: ['notready', 'eviction', 'tolerations'],
  },
  {
    id: 'itv-myk8s-157',
    level: 'basic',
    kind: 'open',
    prompt:
      'Is it possible for a Pod to have multiple containers sharing the same port on localhost, and what happens if they try to bind simultaneously?',
    probing:
      'Whether you know containers in a Pod share one network namespace, so two cannot bind the same port.',
    answer: [
      'No, multiple containers in the same Pod cannot bind to the same port on localhost simultaneously. Since containers in a Pod share the same network namespace, they share the same IP address and port space. What happens:',
      '- The first container successfully binds to the port.\n- The second container gets a "port already in use" error.\n- The failing container may crash or go into CrashLoopBackOff.',
      'The solutions to the port conflict are:',
      '- Use different ports for each container.\n- Use a sidecar proxy pattern.\n- Configure one container as the primary port handler.',
    ],
    code: [
      {
        title: 'Two containers on the same port',
        language: 'yaml',
        code: `# This will cause conflicts
containers:
- name: app1
  ports:
  - containerPort: 8080
- name: app2
  ports:
  - containerPort: 8080  # Conflict!`,
      },
    ],
    tags: ['pods', 'networking', 'ports'],
  },
  {
    id: 'itv-myk8s-158',
    level: 'intermediate',
    kind: 'open',
    prompt:
      'If you create a PVC with `ReadWriteOnce` access mode, can multiple Pods on the same node access it simultaneously?',
    probing: 'Whether you know RWO is per node, not per Pod, and when to use RWOP or RWX instead.',
    answer: [
      'This depends on the storage provider and how it implements `ReadWriteOnce` (RWO). Technical details:',
      '- **RWO specification:** The volume can be mounted as read-write by a single node.\n- **Implementation varies:** Some storage providers allow multiple Pods on the same node to access RWO volumes.\n- **Not guaranteed:** This behavior is not guaranteed by the Kubernetes specification.',
      'The safe approaches are:',
      "- Use `ReadWriteMany` (RWX) for multi-Pod access.\n- Use StatefulSets for predictable single-Pod-per-volume relationships.\n- Test your specific storage provider's behavior.",
    ],
    code: [
      {
        title: 'Use ReadWriteMany for multi-Pod access',
        language: 'yaml',
        code: `# Safer approach for multi-Pod access
accessModes:
- ReadWriteMany  # Instead of ReadWriteOnce`,
      },
    ],
    tags: ['storage', 'access modes'],
  },
  {
    id: 'itv-myk8s-159',
    level: 'intermediate',
    kind: 'open',
    prompt:
      'When using a Horizontal Pod Autoscaler with custom metrics, what happens if the metrics server becomes unavailable during high load?',
    probing:
      'Whether you know the HPA holds its current replica count when metrics are unavailable and how to monitor that.',
    answer: [
      'When the metrics server becomes unavailable, the HPA enters a degraded state.',
      'Behavior during metrics unavailability:',
      '- HPA stops making scaling decisions.\n- The current replica count is maintained.\n- No scale-up occurs even during high load.\n- Events show "unable to get metrics" errors.',
      'The recovery behavior is:',
      '- Once metrics are available again, HPA resumes normal operation.\n- It may trigger rapid scaling based on accumulated load.\n- Consider using multiple metrics sources for redundancy.',
      'Monitoring considerations: Best practices:',
      '- Monitor metrics server health.\n- Set up alerts for HPA failures.\n- Consider backup scaling strategies (manual intervention procedures).',
    ],
    code: [
      {
        title: 'Check HPA status and events',
        language: 'bash',
        code: `kubectl get hpa
kubectl describe hpa myapp-hpa`,
      },
    ],
    tags: ['hpa', 'custom metrics'],
  },
  {
    id: 'itv-myk8s-160',
    level: 'intermediate',
    kind: 'open',
    prompt:
      "Can you run `kubectl port-forward` to a Pod that's in CrashLoopBackOff state, and will it work?",
    probing:
      'Whether you know port-forward needs a running container and what to use instead when it keeps crashing.',
    answer: [
      'It depends on the timing and Pod restart behavior.',
      '- **During the container restart interval:** `kubectl port-forward` may work briefly if you catch the Pod between restarts and the container is temporarily running.\n- **When the container is down:** Port-forward fails immediately with connection errors.',
      'Practical approach: For debugging CrashLoopBackOff:',
      '- Use `kubectl logs pod-name --previous` to see crash logs.\n- Check container startup probes and resource limits.\n- Consider temporarily removing liveness probes for debugging.',
    ],
    code: [
      {
        title: 'Port-forward to a Pod or a Service',
        language: 'bash',
        code: `# This usually fails
kubectl port-forward pod/failing-pod 8080:8080

# Better approach - port-forward to a service
kubectl port-forward service/myapp-service 8080:8080`,
      },
    ],
    tags: ['port-forward', 'crashloopbackoff'],
  },
  {
    id: 'itv-myk8s-161',
    level: 'advanced',
    kind: 'open',
    prompt:
      'If a ServiceAccount is deleted while Pods using it are still running, what happens to the mounted tokens and API access?',
    probing:
      'Whether you know bound tokens are tied to the ServiceAccount, so deleting it breaks API access for running Pods.',
    answer: [
      'Existing Pods keep running, but their API access is at risk: projected (bound) ServiceAccount tokens are tied to the ServiceAccount object, so the API server rejects them once the ServiceAccount is deleted. Immediate effects:',
      '- **Running Pods:** Keep running, but API calls with their mounted token fail once the ServiceAccount is gone.\n- **Token refresh:** May fail when tokens expire (typically 1 hour).\n- **New Pods:** Cannot be created using the deleted ServiceAccount.',
      'The token behavior is:',
      "- Bound tokens are validated against the ServiceAccount, so they stop working when it is deleted; legacy Secret-based tokens are deleted with it.\n- Kubernetes doesn't immediately revoke tokens from running Pods.\n- Applications may experience authentication failures when tokens expire.",
      'Recovery steps: Deleting a ServiceAccount does not necessarily terminate existing Pods immediately. Bound tokens are short-lived and refreshed; API calls fail once the token is checked against the missing ServiceAccount.',
      'New Pods referencing a missing ServiceAccount cannot be admitted.',
    ],
    followUps: [
      'Why does recreating the ServiceAccount not fix the old tokens?',
      'How are bound ServiceAccount tokens refreshed?',
    ],
    code: [
      {
        title: 'Recreate the ServiceAccount and restart the Pods',
        language: 'bash',
        code: `# Recreate the ServiceAccount
kubectl create serviceaccount myapp-sa

# Restart Pods to get new tokens
kubectl rollout restart deployment/myapp`,
      },
    ],
    tags: ['serviceaccount', 'tokens', 'rbac'],
  },
  {
    id: 'itv-myk8s-162',
    level: 'intermediate',
    kind: 'open',
    prompt:
      'When using anti-affinity rules, is it possible to create a "deadlock" where no new Pods can be scheduled?',
    probing:
      'Whether you know required anti-affinity can make replicas unschedulable and when to use preferred rules.',
    answer: [
      'Yes, overly restrictive anti-affinity rules can create scheduling deadlocks.',
      'Common deadlock scenarios:',
      '- `requiredDuringSchedulingIgnoredDuringExecution` with insufficient nodes.\n- Zone anti-affinity with limited availability zones.\n- A combination of multiple affinity rules creating impossible constraints.',
      'Example deadlock: Solutions:',
      '- Use `preferredDuringSchedulingIgnoredDuringExecution` instead of `required`.\n- Ensure adequate node diversity.\n- Monitor Pod scheduling events.',
    ],
    code: [
      {
        title: 'Required anti-affinity that deadlocks on 2 nodes',
        language: 'yaml',
        code: `# If you have only 2 nodes and request 3 Pods with this rule
affinity:
  podAntiAffinity:
    requiredDuringSchedulingIgnoredDuringExecution:
    - labelSelector:
        matchLabels:
          app: myapp
      topologyKey: kubernetes.io/hostname`,
      },
    ],
    tags: ['affinity', 'scheduling'],
  },
  {
    id: 'itv-myk8s-163',
    level: 'intermediate',
    kind: 'open',
    prompt:
      'If you have a Job with `parallelism: 3` and one Pod fails with `restartPolicy: Never`, will the Job create a replacement Pod?',
    probing:
      'Whether you know the Job controller replaces failed Pods until completions or backoffLimit are reached.',
    answer: [
      'Yes, the Job controller will create a replacement Pod to maintain the desired parallelism level.',
      'Job behavior with failures:',
      '- **`restartPolicy: Never`:** Failed Pods are not restarted, but new Pods are created.\n- **Parallelism maintenance:** The Job ensures the specified number of Pods are running.\n- **Completion tracking:** The Job tracks successful completions vs. failures.',
      'Example configuration:',
      'The Job keeps creating new Pods until it reaches the completion count or hits the backoff limit.',
      'A Job maintains the requested parallelism and continues creating Pods until it reaches successful completions or a failure limit such as `backoffLimit`.',
    ],
    code: [
      {
        title: 'Parallel Job with restartPolicy Never',
        language: 'yaml',
        code: `spec:
  parallelism: 3
  completions: 10
  template:
    spec:
      restartPolicy: Never
      containers:
      - name: worker
        image: busybox`,
      },
    ],
    tags: ['jobs', 'restart policy'],
  },
  {
    id: 'itv-myk8s-164',
    level: 'intermediate',
    kind: 'open',
    prompt:
      "Can a Pod's resource requests be modified after creation, and what's the difference between requests and limits during OOM scenarios?",
    probing:
      'Whether you separate container OOM kills at the limit from node-pressure eviction based on requests and priority.',
    answer: [
      "**Resource modification:** Traditionally, resource requests and limits could not be modified after Pod creation: you recreate the Pod or use VPA (Vertical Pod Autoscaler) for automatic adjustments. Newer clusters support in-place Pod resize (beta and on by default from Kubernetes 1.33) through the Pod's `resize` subresource.",
      'OOM behavior differences:',
      '- **Requests:** Used for scheduling decisions; guaranteed resources.\n- **Limits:** Maximum resources allowed, enforced by the kernel.',
      'During OOM scenarios:',
      '- **Container exceeds limits:** The container is immediately killed (OOMKilled).\n- **Node memory pressure:** Pods exceeding requests are candidates for eviction.\n- **Priority-based eviction:** Lower priority Pods are evicted first.',
    ],
    code: [
      {
        title: 'Requests and limits',
        language: 'yaml',
        code: `resources:
  requests:
    memory: "64Mi"     # Guaranteed
    cpu: "250m"
  limits:
    memory: "128Mi"    # Maximum allowed
    cpu: "500m"`,
      },
    ],
    tags: ['resources', 'oomkilled', 'eviction'],
  },
  {
    id: 'itv-myk8s-165',
    level: 'intermediate',
    kind: 'open',
    prompt:
      "When using network policies, if you don't specify egress rules, are outbound connections blocked by default?",
    probing: 'Whether you know egress is only restricted when Egress is listed in policyTypes.',
    answer: [
      'Only when the policy lists `Egress` in `policyTypes`. A NetworkPolicy that selects Pods, declares `Egress` and has no egress rules blocks all outbound traffic from those Pods. If `policyTypes` is omitted and there is no egress section, the policy is treated as ingress-only and egress stays open.',
      'NetworkPolicy behavior:',
      '- **No NetworkPolicy:** All traffic allowed (default).\n- **NetworkPolicy with only ingress:** Egress remains open.\n- **NetworkPolicy with `Egress` in `policyTypes` but no egress section:** All egress blocked.\n- **Empty egress array:** All egress blocked.',
      'Example blocking all egress:',
    ],
    code: [
      {
        title: 'Deny all egress for selected Pods',
        language: 'yaml',
        code: `apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: deny-all-egress
spec:
  podSelector:
    matchLabels:
      app: secure-app
  policyTypes:
  - Egress
  # No egress rules = deny all egress`,
      },
    ],
    tags: ['network policy', 'egress'],
  },
  {
    id: 'itv-myk8s-166',
    level: 'advanced',
    kind: 'open',
    prompt:
      'If a Persistent Volume gets corrupted, can multiple PVCs bound to it cause cascading failures across different namespaces?',
    probing:
      'Whether you know a PV binds to one PVC and that shared backends and RWX services are the real cross-namespace risk.',
    answer: [
      'It can, but not quite as the question implies: a PV binds to exactly one PVC, so cross-namespace cascades come from a shared storage backend or a shared RWX service rather than several PVCs on one PV.',
      'Scenarios for cross-namespace impact:',
      '- **Shared storage backend:** Multiple PVs on the same underlying storage.\n- **ReadWriteMany volumes:** Multiple PVCs accessing the same PV.\n- **Storage class dependencies:** Shared storage infrastructure.',
      'Cascading failure patterns:',
      '- **Data corruption spreads:** Applications in multiple namespaces fail.\n- **Storage backend overload:** Performance decline affects all PVs.\n- **Backup system failures:** Corrupt data propagates to backups.',
      'Prevention strategies:',
      '- Implement proper backup and disaster recovery.\n- Use separate storage backends for critical namespaces.\n- Monitor storage health across all namespaces.',
      'Use no persistent mount for stateless workloads whose local data can disappear when a container or Pod is replaced. Use `emptyDir` only for Pod-lifetime scratch space shared by containers.',
    ],
    followUps: [
      'How would you limit the blast radius of a shared storage backend?',
      'Why can a corrupted volume end up in your backups?',
    ],
    code: [
      {
        title: 'Namespace-specific StorageClass',
        language: 'yaml',
        code: `# Use namespace-specific storage classes
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: namespace-a-storage
parameters:
  zone: us-west1-a
  type: pd-ssd`,
      },
    ],
    tags: ['storage', 'failure domains'],
  },
  {
    id: 'itv-myk8s-167',
    level: 'advanced',
    kind: 'scenario',
    prompt:
      'What happens to a StatefulSet pod when its node goes into NotReady state? How is that different from a Deployment pod?',
    probing:
      'Whether you know StatefulSet Pods on a lost node stay Terminating to avoid split brain, and when to force delete.',
    answer: [
      'The common answer — "the pod gets rescheduled" — is wrong for a StatefulSet, and it exposes someone who has never run stateful workloads in production.',
      'When a node loses network connectivity, Kubernetes does not immediately know whether the node is dead or just temporarily unreachable, so it waits. By default it waits about five minutes before marking pods on that node as `Terminating`.',
      'From there, StatefulSets and Deployments behave completely differently:',
      '- **Deployment pod:** After the timeout, Kubernetes reschedules the pod on another node. The pod gets a new identity, a new IP, and life continues.\n- **StatefulSet pod:** Kubernetes will **not** reschedule it automatically. The pod stays in `Terminating` indefinitely.',
      "The reason is StatefulSet's core guarantee: no two pods with the same identity run at the same time. Suppose the node is not actually dead — it just lost network for a while.",
      'If Kubernetes rescheduled `postgres-0` onto another node, you would now have two `postgres-0` instances both writing to the same data. That is a split-brain scenario, and it corrupts your database.',
      'So Kubernetes deliberately does nothing and waits for a human to intervene.',
      'In production this means you have to make a decision. Is the node actually dead? If yes, you force delete the pod:',
      'If no, you wait for the node to come back. This is why stateful workloads on Kubernetes are complex — the safety guarantee that protects you from corruption is the same thing that keeps your pod stuck when a node dies.',
      'I hit exactly this in a banking environment. A node went `NotReady` at 11pm and the on-call engineer, unaware of this behavior, waited for an automatic recovery that was never going to come.',
      'We lost two hours before someone force deleted the pod. That production context is what the interviewer is really looking for.',
    ],
    followUps: [
      'How do you confirm the node is really dead before force deleting?',
      'What does non-graceful node shutdown handling change?',
    ],
    code: [
      {
        title: 'Force delete the stuck Pod once the node is confirmed dead',
        language: 'bash',
        code: `kubectl delete pod postgres-0 --force --grace-period=0`,
      },
    ],
    tags: ['statefulset', 'notready', 'split brain'],
  },
  {
    id: 'itv-myk8s-168',
    level: 'basic',
    kind: 'open',
    prompt: 'Which Kubernetes topics and edge cases should you revise before an interview?',
    probing:
      'Whether you have covered the full Kubernetes surface and the tricky edge cases interviewers like.',
    answer: [
      'Be ready to reason through:',
      '1. Failed init containers and Pod restart policies\n2. Stable StatefulSet Pod identities\n3. DaemonSets, taints, and tolerations\n4. Deployment changes during an active rolling update\n5. Node failure detection and Pod eviction timing\n6. Port conflicts between containers in one Pod\n7. RWO vs. RWOP vs. RWX storage semantics\n8. HPA behavior during metrics failures\n9. Debugging containers in CrashLoopBackOff\n10. ServiceAccount deletion and token rotation\n11. Anti-affinity scheduling deadlocks\n12. Job replacement Pods and failure limits\n13. Requests, limits, OOM kills, and eviction\n14. Default-deny egress NetworkPolicies\n15. Shared storage failure domains',
      '- Kubernetes architecture and reconciliation\n- Pods and workload controllers\n- Manifests, ConfigMaps, Secrets, and ServiceAccounts\n- Service types, Ingress, DNS, and NetworkPolicy\n- PV, PVC, StorageClass, access modes, and topology\n- Scheduling, affinity, taints, and disruption handling\n- Requests, limits, HPA, VPA, and cluster autoscaling\n- Probes, rolling updates, and rollback\n- Security context, RBAC, admission, and image security\n- Troubleshooting Pods, nodes, storage, and networking\n- Backup, disaster recovery, monitoring, CI/CD, and GitOps',
    ],
    tags: ['revision', 'interview'],
  },
  {
    id: 'itv-myk8s-169',
    level: 'advanced',
    kind: 'open',
    prompt:
      'What are the key investigation points for control-plane and node reliability incidents?',
    probing:
      'Whether you have a short, evidence-first plan for NotReady nodes, API overload, etcd corruption and fleet upgrades.',
    answer: [
      'My quick-revision points for control-plane and node reliability:',
      '- For `NodeNotReady`, inspect node Conditions and Events, kubelet/container-runtime status, disk and memory pressure, certificates, time synchronization, CNI state, and API-server reachability. Cordon before repair and drain only when disruption budgets and replacement capacity allow it.\n- For API-server overload, compare request latency, inflight requests, audit logs, etcd latency, admission-webhook performance, and noisy controllers. Rate-limit or pause the offending client, then correct its list/watch, cache, pagination, and backoff (increasing wait between retries) behavior.\n- For etcd corruption, protect quorum and evidence, use the distribution-supported member replacement or snapshot restore process, and validate API objects and controllers before accepting writes. Velero application backups do not replace etcd snapshots.\n- Fleet upgrades should move from a representative staging cluster through controlled production waves. Check removed APIs and add-on compatibility, respect version skew, upgrade node pools gradually, and stop promotion when workload SLOs regress.',
    ],
    followUps: [
      'Which of these would you check first for a NotReady node?',
      'How do you stop a fleet upgrade automatically?',
    ],
    tags: ['control plane', 'nodes', 'revision'],
  },
  {
    id: 'itv-myk8s-170',
    level: 'intermediate',
    kind: 'open',
    prompt: 'What are the key investigation points for workload failures and scheduling?',
    probing: 'Whether you distinguish failure types from evidence before changing anything.',
    answer: [
      'My quick-revision points for workload failures and scheduling:',
      '- Start with `kubectl describe` Events, then current and previous logs. Distinguish image, configuration, command, dependency, probe, permission, scheduling, and resource failures before changing anything.\n- `Pending` Pods require scheduler evidence: CPU or memory shortage, taints, affinity, quota, unbound PVC, topology, or autoscaler limits. Fix the reported constraint rather than deleting the Pod repeatedly.\n- `Terminating` Pods require checking finalizers, preStop hooks, grace periods, attached storage, API reachability, and the responsible controller. Force deletion is a last resort after understanding state and data risk.\n- For OOM, eviction, restart, and resource-leak incidents, compare requests and limits with observed use, node pressure, throttling, heap or file-descriptor growth, and application metrics. Right-size from load-test evidence and verify after rollout.',
    ],
    tags: ['troubleshooting', 'revision'],
  },
  {
    id: 'itv-myk8s-171',
    level: 'advanced',
    kind: 'open',
    prompt: 'What are the key points for Kubernetes security and compliance scenarios?',
    probing:
      'Whether you remember the security, leaked-secret, certificate and tenancy essentials in one pass.',
    answer: [
      'My quick-revision points for security and compliance scenarios:',
      '- Use identity-based least privilege, separate service accounts, Pod Security Admission, non-root/read-only containers, seccomp, approved signed images, default-deny network controls, encrypted secrets, and audit/runtime monitoring.\n- A leaked secret must be revoked and rotated immediately; removing it from a log or Git file is not fix. Investigate access, update consumers through an overlap period, verify the new value, and then revoke the old value.\n- Certificate incidents require identifying the exact endpoint and owner, checking expiry, SAN, SNI, issuer, chain, and consumer reload. Automate renewal and alert well before expiry.\n- Multi-tenant and multi-cluster designs need explicit isolation boundaries, quotas, policy enforcement, centralized identity and audit, and separate clusters where the risk boundary requires it.',
    ],
    followUps: [
      'What is the first thing you do after a secret leaks?',
      'When does a tenant need a separate cluster?',
    ],
    tags: ['security', 'compliance', 'revision'],
  },
  {
    id: 'itv-myk8s-172',
    level: 'intermediate',
    kind: 'open',
    prompt: 'What are the key points for delivery, scaling and cost scenarios?',
    probing:
      'Whether you connect zero-downtime delivery, progressive release, scaling and cost into one view.',
    answer: [
      'My quick-revision points for delivery, scaling and cost:',
      '- Zero-downtime delivery depends on immutable versions, realistic readiness/startup probes, adequate surge capacity, graceful shutdown, compatible database changes, rollout monitoring, and a tested rollback — not only `RollingUpdate` settings.\n- Canary and blue-green strategies promote releases using health and business metrics. Keep the old version available during the validation window and automate rollback when thresholds fail.\n- HPA scales Pods, a node autoscaler supplies schedulable capacity, and event-driven scaling handles queue or custom demand. Validate metric freshness, resource requests, min/max limits, stabilization windows, dependency capacity, and scale-down behavior.\n- Cost optimization combines usage evidence, right-sizing, autoscaling, appropriate node pools, spot capacity for tolerant workloads, log retention, storage lifecycle, quotas, schedules, and SLO verification after each change.',
    ],
    tags: ['delivery', 'scaling', 'cost'],
  },
  {
    id: 'itv-myk8s-173',
    level: 'advanced',
    kind: 'open',
    prompt: 'What are the key points for stateful workloads and disaster recovery scenarios?',
    probing:
      'Whether you remember that stateful failover and DR are about data, fencing and tested restores, not manifests.',
    answer: [
      'My quick-revision points for stateful workloads and disaster recovery:',
      '- Stateful failover must cover data replication, quorum, storage topology, fencing, leader election, DNS or traffic switching, and application consistency. StatefulSets alone do not provide database replication.\n- For failed PV mounts, inspect PVC/PV/StorageClass, CSI Events and logs, access mode, topology, attachment state, quota, identity, and filesystem health. Do not force-detach or delete state until ownership and backups are verified.\n- Disaster recovery begins with business-approved RTO/RPO. Protect manifests, cluster state, persistent data, secrets, certificates, DNS, identity, dependencies, and runbooks in another failure domain, then prove them through restore and failover exercises.\n- Multi-region and multi-cloud recovery must control write ownership to avoid split brain and use tested weighted traffic or DNS cutover with an explicit rollback window.',
    ],
    followUps: ['What does fencing mean for a stateful workload?', 'How do you prove your RPO?'],
    tags: ['stateful', 'disaster recovery', 'revision'],
  },
  {
    id: 'itv-myk8s-174',
    level: 'intermediate',
    kind: 'open',
    prompt: 'What are the key points for observability, chaos and continuous improvement?',
    probing:
      'Whether you close the loop after incidents with monitoring, chaos experiments and preventive actions.',
    answer: [
      'My quick-revision points for observability, chaos and continuous improvement:',
      '- Monitor availability, latency, errors, traffic, saturation (how close a resource is to its limit), control-plane health, node pressure, scheduling, restarts, storage, DNS, and important business transactions using correlated metrics, structured logs, traces, and deployment events.\n- Chaos experiments require a hypothesis, limited scope of impact, steady-state metrics, approval, abort conditions, and a rollback. Begin in non-production and use the findings to improve redundancy, timeouts, retries, alerts, and runbooks.\n- After every incident, verify the real application path, remove temporary access or scaling, capture the root cause and contributing controls, assign preventive actions, and test that monitoring detects recurrence.',
    ],
    tags: ['observability', 'chaos engineering'],
  },
  {
    id: 'itv-myk8s-175',
    level: 'intermediate',
    kind: 'open',
    prompt:
      'On EKS, why do teams move from LoadBalancer Services to an ALB, and then to Ingress with a controller?',
    probing:
      'Whether you can explain why teams move from one LoadBalancer per Service to a shared ALB driven by Ingress.',
    answer: [
      'ALB, Ingress, Gateway API, API Gateway, Service Mesh, and Network Policies all seem to route traffic, and the features overlap — most can do HTTP routing and TLS termination, and several use Nginx or Envoy as the engine.',
      'The clarity comes not from "what does it do" but from "why does it exist." Each layer was born to solve a production problem the previous setup could not handle.',
      '**2026 context:** In March 2026, Ingress NGINX moved into formal retirement (no more security patches). Kubernetes 1.36 (released April 22, 2026) marks the shift to **Gateway API** as the official successor to Ingress.',
      'Ingress itself is not deprecated, but new investment should go to Gateway API.',
      'Your service runs in a pod. You can hit it from inside the cluster, but nobody outside can reach it.',
      'So you create a **LoadBalancer Service** and Kubernetes provisions a real cloud load balancer with a public URL. It works perfectly — until you have 10 services and 10 cloud load balancers, each on your AWS bill every month. **LoadBalancer Service solved external access, but one per service does not scale.**',
      'So you put one **AWS Application Load Balancer (ALB)** in front of everything. ALB is an AWS-managed load balancer that runs outside your cluster and routes to many services by path or host — `/api/products` to the product service, `/api/orders` to the order service.',
      'One AWS load balancer instead of ten.',
      "The catch: you configure the ALB through the AWS Console or Terraform, so developers cannot ship a new microservice without an infrastructure ticket, and the routing rules (outside the cluster) drift from the cluster's YAML. **ALB cut costs, but it took routing control away from your team.**",
      'Ingress is a Kubernetes resource that defines routing rules in YAML. Developers commit an Ingress file alongside their service code, so routing lives where the code lives.',
      'But Ingress is just a config file — something has to read and execute it. That something is the **Ingress Controller**: Nginx Ingress, Traefik, or the AWS Load Balancer Controller.',
      'On EKS, most teams use the **AWS Load Balancer Controller**. You write Ingress YAML; the controller talks to AWS and provisions an ALB with the right rules automatically.',
      'You get the cost benefit of one ALB and the YAML-first control of Kubernetes. **ALB without Ingress was unmanageable from the cluster side. Ingress fixed that.**',
    ],
    tags: ['eks', 'ingress', 'alb'],
  },
  {
    id: 'itv-myk8s-176',
    level: 'intermediate',
    kind: 'open',
    prompt: 'What is Gateway API, why is it replacing Ingress, and should you migrate?',
    probing:
      'Whether you know the Ingress limitations Gateway API fixes, its role-based resources, and a sensible migration plan.',
    answer: [
      'Ingress was the default for ten years, but it had limits:',
      '- It only handled HTTP and HTTPS. Routing TCP or UDP needed vendor-specific extensions.\n- Advanced features (canary deployments, traffic splitting, header-based routing) required many annotations, and each controller had its own syntax — migrating meant rewriting all of them.\n- The platform team and application team shared the same Ingress resource, with no clean ownership separation.\n- As of March 2026, Ingress NGINX is no longer maintained.',
      'So the Kubernetes community built **Gateway API**.',
      'Gateway API is the official successor to Ingress (GA in November 2023, with adoption accelerating through 2025–2026). It splits the old Ingress resource into three role-oriented pieces:',
      '- **GatewayClass** — defines the type of underlying infrastructure. The platform team owns this.\n- **Gateway** — the actual entry point; listens on ports and handles TLS. Cluster operators manage these.\n- **HTTPRoute** (and **TCPRoute**, **GRPCRoute**) — the actual routing rules. Application developers own these.',
      'Each team manages what it should, with no argument about who owns the Ingress. Gateway API also supports L4 protocols natively (TCP, UDP, gRPC) and has built-in traffic splitting and header-based routing without annotations.',
      'On EKS, the AWS Load Balancer Controller supports Gateway API as of 2026: you write Gateway and HTTPRoute resources, the controller provisions an ALB, and you get the same cost benefits as Ingress with a cleaner model.',
      '**Guidance:** For a new EKS project in 2026, use Gateway API. If you run Ingress in production today, you have time — Ingress is stable and not deprecated — but the future investment is Gateway API.',
      '- **New EKS project:** yes — use Gateway API from day one.\n- **Running Ingress with the AWS Load Balancer Controller:** you have time. Ingress is stable and not deprecated; AWS supports both.\n- **Using Ingress NGINX specifically:** plan your migration — the project is in retirement as of March 2026 with no more security patches.',
      'The migration path is straightforward: Ingress and Gateway API can run side by side. Move new services to Gateway API and migrate old ones one at a time.',
    ],
    tags: ['gateway api', 'ingress'],
  },
  {
    id: 'itv-myk8s-177',
    level: 'intermediate',
    kind: 'open',
    prompt:
      'How do a service mesh, NetworkPolicies and an API Gateway differ, and is Gateway API the same as an API Gateway?',
    probing:
      'Whether you can separate east-west, north-south and API-management concerns and the near-identical names.',
    answer: [
      'Now your microservices talk to each other inside the cluster via ClusterIP Services. It works until something fails, and then you have no idea which call broke or whether pod-to-pod traffic was even encrypted.',
      'Some pods retry forever, some give up immediately, and every team writes retry logic differently. You want mTLS between every service, consistent retries, and distributed tracing.',
      'So you install a **service mesh** — Istio, Linkerd, or Consul. It injects a sidecar proxy into every pod; all pod-to-pod traffic goes through the sidecar, which handles mTLS, retries, timeouts, tracing, and traffic splitting.',
      'Application code stays clean while the mesh handles the plumbing. **Service-to-service traffic was a black box. Service mesh fixed that.**',
      'By default, any pod can talk to any other pod — your frontend pod can reach your payments database, your build pod can reach your auth service. If one pod is compromised, the attacker can move laterally to anything.',
      'So you use **NetworkPolicies**, which define which Pods may communicate. For example, you can allow only the order service to reach the payments database and allow the frontend to reach only the API service.',
      '**The problem was a flat cluster network. NetworkPolicies limit communication when the installed network plugin enforces them.**',
      'Your platform works — internal traffic is meshed, network policies lock things down, external traffic comes in through Gateway API. Then the business launches a mobile app, a partner wants API access, a third-party developer wants to integrate.',
      'Now you need API keys, per-customer rate limits, and centralized JWT validation.',
      'If you add auth and rate-limiting code to every service, six microservices become six different implementations of the same thing, and per-customer limits (Customer A: 1000 req/sec, Customer B: 100, free tier: 10) get scattered everywhere.',
      'So you add an **API Gateway** — Kong, APISIX, AWS API Gateway, or Tyk. It sits between your Gateway/Ingress and your microservices and handles everything that is not business logic: API key validation, JWT validation, per-customer rate limiting, request transformation, response caching, usage analytics.',
      "A request comes in, the gateway checks the API key, sees the customer's plan allows 1000 req/sec, and forwards to the right service. **API-level concerns scattered across services made the platform fragile. API Gateway fixed that.**",
      'The names are almost identical but they are not the same thing:',
      '- **Gateway API** is a Kubernetes specification for routing traffic. It replaces Ingress and handles north-south routing into the cluster.\n- **API Gateway** is an architectural pattern for API management — auth, rate limiting, API keys, transformations, analytics.',
      'You can implement an API Gateway using Gateway API resources (Kong and Envoy Gateway support both), but Gateway API on its own does not give you API key management or per-customer rate limits — that is API Gateway territory.',
      'The simple rule: **Gateway API gets traffic into the cluster; API Gateway manages what your APIs do once it is in.** In 2026 the line is blurring (Kong, Envoy Gateway, and APISIX do both), but conceptually they solve different problems.',
    ],
    tags: ['service mesh', 'api gateway', 'network policy'],
  },
  {
    id: 'itv-myk8s-178',
    level: 'advanced',
    kind: 'open',
    prompt: 'What are the production traffic-routing patterns on EKS, and how do you choose one?',
    probing:
      'Whether you can pick the simplest routing pattern that fits who calls your APIs, and avoid over-engineering.',
    answer: [
      'There are three real patterns, each fitting a different stage of your platform.',
      '**Pattern 1 — Internal app or simple frontend.** A React frontend and a few microservices behind it; the frontend is the only client. No third-party API consumers, no API keys.',
      'The AWS Load Balancer Controller provisions the ALB from your Gateway and HTTPRoute resources. One YAML, one AWS bill.',
      'This is what ~80% of EKS workloads look like — no API Gateway, no service mesh. **The trap:** engineers add an Nginx "API Gateway" Deployment here because a tutorial said so. It is a reverse proxy with extra steps and a monthly cost.',
      '**Pattern 2 — Public APIs for mobile or third-party clients.** Now you have a mobile app and partners integrating. You need API keys, per-customer rate limits, and centralized JWT validation.',
      'Gateway API still gets traffic into the cluster; what is new is the API Gateway between it and your services (deployed in-cluster as a Deployment with 2+ replicas). Customer A gets 1000 req/sec, Customer B gets 100, free tier gets 10 — none of that logic touches your microservices.',
      'Most teams skip this until they have already polluted every service with auth code, then spend a quarter ripping it out.',
      '**Pattern 3 — Scale, with internal traffic too.** Mobile clients hit public APIs, the frontend hits internal APIs, and services talk constantly. You need different policies for different traffic and observability across all of it.',
      'Public traffic goes through the API Gateway (auth, rate limits, transformations). Internal frontend traffic skips the gateway — it is trusted, latency-sensitive, and needs no API key validation.',
      'Service-to-service traffic goes through the service mesh (mTLS, distributed tracing). Network Policies enforce who can talk to whom across the cluster.',
      'Each layer does one job well.',
      'Ask one question: **who is calling your APIs?**',
      '- Only your own frontend → **Pattern 1**.\n- A mobile app or third-party clients → **Pattern 2**.\n- 50+ services where you care about mTLS, distributed tracing, and zero-trust networking → **Pattern 3**.',
      'Most teams skip Pattern 1 because they read a microservices blog, then over-engineer toward Pattern 3 because they read a Netflix blog. The right answer is almost always one step simpler than what you think you need.',
      '- A Nginx Deployment routing traffic is **not** an API Gateway. It is a reverse proxy.\n- An Ingress Controller is **not** a load balancer. It is a router that sits behind one.\n- A service mesh is **not** an API Gateway. It handles east-west (service-to-service) traffic; API Gateway handles north-south (internet-to-service) traffic.\n- Network Policies are **not** a firewall. They are pod-level traffic rules enforced by your CNI.',
      'Each layer between your user and your pod exists because the previous setup was not enough:',
      '- **ALB** gets traffic to your cluster.\n- **Gateway API (or Ingress)** gets traffic into your services.\n- **Service Mesh** secures and observes pod-to-pod traffic.\n- **Network Policies** enforce who can talk to whom.\n- **API Gateway** manages what your public APIs do.',
    ],
    followUps: [
      'When would you add a service mesh to Pattern 2?',
      'What is the trap engineers fall into with Pattern 1?',
    ],
    code: [
      {
        title: 'Pattern 1: internal app or simple frontend',
        language: 'text',
        code: `Internet → AWS ALB → Gateway API (ALB Controller) → Microservices`,
      },
      {
        title: 'Pattern 2: public APIs',
        language: 'text',
        code: `Internet → AWS ALB → Gateway API → API Gateway (Kong / APISIX / Envoy Gateway) → Microservices`,
      },
      {
        title: 'Pattern 3: public and internal traffic at scale',
        language: 'text',
        code: `Internet
   ↓
AWS ALB (TLS, WAF)
   ↓
Gateway API
   ↓
   ├─→ /api/public/*   → API Gateway → Microservices (with Istio sidecars)
   └─→ /api/internal/* ─────────────→ Microservices (with Istio sidecars)
                                              ↑
                                     Network Policies enforce
                                     pod-to-pod access rules`,
      },
    ],
    tags: ['eks', 'traffic routing', 'architecture'],
  },
  {
    id: 'itv-myk8s-179',
    level: 'intermediate',
    kind: 'open',
    prompt:
      'Traffic-routing quick fire: is an API Gateway the same as Ingress or Gateway API, and do you need ALB, Ingress and a mesh together?',
    probing:
      'Whether you can answer the quick-fire naming questions about ALB, Ingress, Gateway API, API Gateway and mesh.',
    answer: [
      'The quick-fire answers I keep ready on traffic routing:',
      '- **Is API Gateway the same as Kubernetes Ingress?** No. Ingress (and its successor Gateway API) is a Kubernetes resource for routing external traffic to services. API Gateway is a pattern for API-level concerns like authentication, rate limiting, and API keys. Both can route HTTP, but they solve different problems.\n- **Is API Gateway the same as Gateway API?** No, despite the near-identical names. Gateway API is a Kubernetes specification that replaces Ingress. API Gateway is an architectural pattern. You can implement an API Gateway using Gateway API resources, but they are not the same thing.\n- **Do I need both ALB and Ingress on EKS?** Yes. ALB is the AWS-managed load balancer; Ingress (or Gateway API) is the Kubernetes resource that tells the AWS Load Balancer Controller how to configure the ALB. They work together.\n- **Is Ingress NGINX deprecated?** It entered formal retirement in March 2026. It still works, but no new security patches will be released. Plan migration to Gateway API or another supported Ingress Controller.\n- **Can I use AWS API Gateway with EKS?** Yes, via a Network Load Balancer or VPC Link. But most EKS teams prefer in-cluster API Gateways like Kong, APISIX, or Envoy Gateway because they are easier to configure with Kubernetes-native tools.\n- **Do I need a service mesh if I have an API Gateway?** They solve different problems. API Gateway handles north-south traffic (internet to your services); service mesh handles east-west traffic (service to service). Most teams need both at scale.\n- **What is the difference between Gateway API and API Gateway in Kubernetes?** Gateway API is a Kubernetes specification for routing external traffic into the cluster (it replaces Ingress). API Gateway is a pattern handling authentication, rate limiting, and API management. Some tools (Kong, Envoy Gateway) implement both.',
    ],
    tags: ['traffic routing', 'faq'],
  },
]
