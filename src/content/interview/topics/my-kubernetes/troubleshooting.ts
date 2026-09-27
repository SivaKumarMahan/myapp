import type { InterviewQuestion } from '../../../types'

/** Pod, node, storage and traffic troubleshooting scenarios, plus where to find logs. */
export const myKubernetesTroubleshootingQuestions: InterviewQuestion[] = [
  {
    id: 'itv-myk8s-60',
    level: 'intermediate',
    kind: 'open',
    prompt: 'What is your standard troubleshooting order for a Kubernetes workload?',
    probing:
      'Whether you follow one evidence-based order instead of jumping straight to deleting Pods.',
    answer: [
      'Use a consistent order:',
      'Repeated issue charts consolidate to one evidence-based flow:',
      '- CrashLoopBackOff: inspect current/previous logs, exit code, command, configuration, probes, permissions, dependencies, and OOM evidence.\n- ImagePullBackOff: verify image digest/tag, registry existence and reachability, architecture, pull secret/service account, CA/proxy, and node disk.\n- Pending: read scheduler Events for resource shortage, taints, affinity, quota, topology, or unbound PVC.\n- OOMKilled/high CPU or memory: measure Pod and node usage, throttling, requests/limits, GC/query/process behavior, traffic, HPA, and node pressure before scaling or tuning.\n- NodeNotReady: inspect Conditions/Events, kubelet/runtime, disk/memory/PID pressure, certificates, time, CNI, and API connectivity; cordon before repair and drain only when safe.\n- PVC Pending/mount failure: inspect PVC/PV/StorageClass, access mode, topology, CSI logs, identity, quota, and attachment state before any destructive storage action.',
    ],
    code: [
      {
        title: 'Troubleshooting command order',
        language: 'bash',
        code: `kubectl get pod <pod> -o wide
kubectl describe pod <pod>
kubectl get events --sort-by=.metadata.creationTimestamp
kubectl logs <pod> --all-containers
kubectl logs <pod> --previous
kubectl get deploy,rs,svc,endpointslice,ingress
kubectl top pod
kubectl top node`,
      },
    ],
    tags: ['troubleshooting', 'kubectl'],
  },
  {
    id: 'itv-myk8s-61',
    level: 'intermediate',
    kind: 'scenario',
    prompt: 'How do you troubleshoot CrashLoopBackOff?',
    probing:
      'Whether you preserve evidence with --previous and exit codes, and roll back before debugging a bad release.',
    answer: [
      'CrashLoopBackOff means the container keeps exiting and restarting, and kubelet is deliberately delaying each retry. I preserve the evidence first:',
      'I look at the exit code and reason — OOMKilled, Error, Completed — the command and arguments, config and Secret mounts, permissions, dependency and DNS reachability, probe failures, the port, the runtime, and any recent image or config change. Exit 0 under a restart policy of `Always` usually means the command was wrong for a long-running workload.',
      "If a recent release caused this, I roll back first. To debug further, I run the same image with a command override or an ephemeral container where that's appropriate. I don't weaken production probes permanently just to make a rollout pass.",
      "Once it's fixed, I verify the restart count is stable, readiness passes, logs and dependency health look normal, and I add a regression or preflight test.",
      'Run kubectl describe pod and kubectl logs → Check startup script, image, or config issue → Fix error → Redeploy.',
      '**Detailed interview approach:** I compare the current and previous container failure using `kubectl describe pod <pod>`, `kubectl logs <pod> -c <container>`, and `kubectl logs <pod> -c <container> --previous`.',
      'I look at the exit code, reason, events, probes, command and arguments, environment, mounted ConfigMaps and Secrets, permissions, and dependency reachability.',
      'Exit code 137 usually points to OOM; a connection or config error needs a different fix. I reproduce the issue with the exact image and configuration in a safe namespace, fix the actual application, config, resource, or probe problem, and deploy a new revision instead of just repeatedly deleting the Pod.',
      'I watch the rollout status, restart count, logs, latency, and error rate afterward, and roll back to the last healthy revision if the impact keeps growing. Common causes:',
      '- Application exits immediately after startup.\n- Missing environment variables or config.\n- Resource limits too restrictive.\n- Failed liveness probe.\n- Image issues or wrong command/args.',
      '**Troubleshooting steps:** Check exit codes, resource requests/limits, and application logs.',
      'Check current and previous logs, exit code, events, command/arguments, environment, mounted configuration, dependencies, probes, and OOM status. `kubectl port-forward` is unreliable while the container repeatedly crashes; use logs, an ephemeral debug container, or a stable Service target when appropriate.',
    ],
    code: [
      {
        title: 'Capture the crash evidence',
        language: 'bash',
        code: `kubectl describe pod <pod>
kubectl logs <pod> -c <container> --previous
kubectl get pod <pod> -o jsonpath='{.status.containerStatuses[*].lastState}'`,
      },
      {
        title: 'Describe, previous logs and events',
        language: 'bash',
        code: `kubectl describe pod <pod-name>
kubectl logs <pod-name> --previous
kubectl get events --sort-by='.lastTimestamp'`,
      },
    ],
    tags: ['crashloopbackoff', 'troubleshooting'],
  },
  {
    id: 'itv-myk8s-62',
    level: 'advanced',
    kind: 'scenario',
    prompt: 'A Pod is stuck in CrashLoopBackOff, but logs show no errors. How do you debug?',
    probing:
      'Whether you know why logs can be empty and can debug with a sleep override, ephemeral containers and node logs.',
    answer: [
      'The current logs can be empty because the container exits before its logger even starts, because it writes to a file instead of stdout, or because the useful output is actually in the previous instance. So I check `--previous`, the termination reason, message, and exit code, along with events and probes.',
      "I compare the image's ENTRYPOINT against the manifest's command and arguments, environment and config mounts, the working directory, user and file permissions, architecture, OOM, and dependency reachability.",
      'I can spin up a temporary debug Pod using the same image but with a `sleep` command instead, then inspect the filesystem and config and manually run the application under approved, non-production conditions. Ephemeral containers help too, as long as the target runs long enough to attach to.',
      'If the process never even starts, I also check the node, runtime, and kubelet logs. The real fix gets codified in the image or manifest, tested, rolled out, and verified — a manual change inside a running Pod is never the permanent fix.',
    ],
    followUps: [
      'How do you use kubectl debug against a crashing container?',
      'What does exit code 0 under restartPolicy Always tell you?',
    ],
    tags: ['crashloopbackoff', 'debugging'],
  },
  {
    id: 'itv-myk8s-63',
    level: 'intermediate',
    kind: 'scenario',
    prompt: 'How do you troubleshoot Kubernetes CrashLoopBackOff with ConfigMap errors?',
    probing:
      'Whether you check mounted config and keys, reproduce safely and deploy a fixed revision instead of deleting Pods.',
    answer: [
      'Check mounted config → Validate YAML → Fix key-value mismatches → Restart pod.',
      '**Detailed interview approach:** I compare the current and previous container failure using `kubectl describe pod <pod>`, `kubectl logs <pod> -c <container>`, and `kubectl logs <pod> -c <container> --previous`.',
      'I look at the exit code, reason, events, probes, command and arguments, environment, mounted ConfigMaps and Secrets, permissions, and dependency reachability.',
      'Exit code 137 usually points to OOM; a connection or config error needs a different fix. I reproduce the issue with the exact image and configuration in a safe namespace, fix the actual application, config, resource, or probe problem, and deploy a new revision instead of just repeatedly deleting the Pod.',
      'I watch the rollout status, restart count, logs, latency, and error rate afterward, and roll back to the last healthy revision if the impact keeps growing.',
    ],
    tags: ['crashloopbackoff', 'configmap'],
  },
  {
    id: 'itv-myk8s-64',
    level: 'intermediate',
    kind: 'scenario',
    prompt: 'A Pod is stuck in ImagePullBackOff. How do you troubleshoot?',
    probing:
      'Whether you read the exact pull error and map it to repo, tag, credentials, network or architecture.',
    answer: [
      '`ImagePullBackOff` means the pull failed and kubelet is now backing off between retries. I start by reading the exact event:',
      '`not found` usually means the wrong repo or tag. `unauthorized` usually means a pull secret or IAM problem. A timeout or DNS error points to networking between the node and the registry. A manifest mismatch can mean a CPU architecture mismatch.',
      "I verify the image and digest actually exist, check credentials such as IRSA or a managed identity, the secret's namespace and the ServiceAccount, registry limits and certificates, and the node's DNS, egress, disk, and runtime logs.",
      "I fix the manifest or the access problem, confirm the image now pulls and starts, and run the application's health checks. To prevent it happening again, I add CI registry validation, digest pinning, credential-expiry monitoring, and a registry path that works across multiple AZs.",
      'Check if image exists in registry.',
      'Validate credentials/secret for private registry. Verify image tag. Fix and redeploy.',
      '**Detailed interview approach:** `kubectl describe pod <pod>` normally gives me the useful event: unauthorized, manifest not found, a DNS timeout, a certificate failure, a rate limit, or an architecture mismatch.',
      'I verify the image name and digest actually exist, that the node can reach the registry, and that the Pod or its service account references the correct `imagePullSecret`.',
      "I test or rotate credentials without printing them, and check registry IAM, the secret's namespace, proxy and CA trust, egress policy, quota, and node disk. I fix the specific layer that's broken, run a controlled rollout, and confirm new Pods pull successfully and become Ready.",
      "To prevent it recurring, I use workload identity where it's supported, expiring registry credentials, signed and scanned smaller images, registry mirrors, and alerts on image-pull events.",
      'Create imagePullSecret → Attach to service account → Validate registry credentials.',
      'Check image name/tag, registry reachability, credentials, pull secrets, ServiceAccount configuration, architecture compatibility, and registry rate limits.',
    ],
    code: [
      {
        title: 'Read the pull event, image and ServiceAccount',
        language: 'bash',
        code: `kubectl describe pod <pod>
kubectl get pod <pod> -o jsonpath='{.spec.containers[*].image}'
kubectl get serviceaccount <sa> -o yaml`,
      },
    ],
    tags: ['imagepullbackoff', 'registry'],
  },
  {
    id: 'itv-myk8s-65',
    level: 'intermediate',
    kind: 'scenario',
    prompt: 'How do you troubleshoot slow image pulls in Kubernetes?',
    probing:
      'Whether you can speed up pulls with smaller images, caching and mirrors, and still check registry errors.',
    answer: [
      'Check registry health, use image caching on nodes, enable parallel pulls, reduce image size, and use local/private mirrors.',
      'Mini-case: Our pods were delayed by 2 mins due to 3GB images; slimming base images + enabling node cache cut startup time to <20s.',
      '**Detailed interview approach:** `kubectl describe pod <pod>` normally gives me the useful event: unauthorized, manifest not found, a DNS timeout, a certificate failure, a rate limit, or an architecture mismatch.',
      'I verify the image name and digest actually exist, that the node can reach the registry, and that the Pod or its service account references the correct `imagePullSecret`.',
      "I test or rotate credentials without printing them, and check registry IAM, the secret's namespace, proxy and CA trust, egress policy, quota, and node disk. I fix the specific layer that's broken, run a controlled rollout, and confirm new Pods pull successfully and become Ready.",
      "To prevent it recurring, I use workload identity where it's supported, expiring registry credentials, signed and scanned smaller images, registry mirrors, and alerts on image-pull events.",
    ],
    tags: ['images', 'performance'],
  },
  {
    id: 'itv-myk8s-66',
    level: 'intermediate',
    kind: 'scenario',
    prompt: "How do you troubleshoot a pod that is stuck in the 'Pending' state in Kubernetes?",
    probing:
      'Whether you read the scheduler events and check resources, taints, affinity, PVCs, quota and the autoscaler in order.',
    answer: [
      "To troubleshoot a pod stuck in the 'Pending' state, I would follow these steps:",
      '**1. Check pod description:** Look for events at the bottom of the output for clues (e.g., insufficient resources, scheduling issues).',
      '**2. Check node resources:** Ensure nodes have enough CPU, memory, and disk space to schedule the pod.',
      "**3. Verify resource requests and limits:** Check if the pod's resource requests exceed available resources on any node.",
      '**4. Check taints and tolerations:**',
      '- Look for any taints on nodes that might prevent the pod from being scheduled.\n- Check if the pod has the necessary tolerations to be scheduled on those nodes.',
      "**5. Check node selectors and affinity rules:** Ensure the pod's `nodeSelector` or affinity rules match available nodes.",
      "**6. Review Cluster Autoscaler (if applicable):** If using a cluster autoscaler, check if it's functioning correctly and can scale up nodes if needed.",
      '**7. Check for pending PVCs:** If the pod uses Persistent Volume Claims (PVCs), ensure they are bound to available Persistent Volumes (PVs).',
      '**8. Review scheduler logs:** If you have access to the scheduler logs, check for any errors or issues related to pod scheduling.',
      '**9. Look for quotas:** Check if there are any resource quotas in the namespace that might be preventing the pod from being scheduled.',
      "By systematically going through these steps, I can identify and resolve the issue causing the pod to remain in the 'Pending' state.",
      'Run kubectl describe pod → Check node resource availability → Verify PVC binding → Ensure taints/tolerations are configured.',
      "**Detailed interview approach:** I use `kubectl describe pod <pod>` and read the scheduler's Events instead of guessing. They tell me whether it's insufficient CPU or memory, a taint, a node selector or affinity mismatch, an unbound PVC, a topology constraint, pod limits, or quota.",
      "I compare the requests against `kubectl top nodes`, the nodes' allocatable values, taints, labels, quotas, and autoscaler logs. Then I fix whatever's actually blocking the Pod: right-size the requests, add a justified toleration or label, fix the PVC or storage class, relax an overly strict affinity rule, or add node capacity.",
      "I don't remove a protective taint just to get past the problem. I verify scheduling, readiness, distribution across failure domains, and whether the cluster autoscaler will handle the same situation automatically next time.",
      'Run kubectl describe pod → Check taints/tolerations → Check node resources → Add tolerations or scale nodes.',
      'Check these common issues:',
      "- **Insufficient resources:** No node has enough CPU/memory.\n- **Node selector/affinity:** No node matches the constraints.\n- **PVC issues:** PersistentVolume not available or bound.\n- **Image pull issues:** `imagePullSecrets` missing or wrong image.\n- **Taints and tolerations:** Pod can't tolerate node taints.\n- **Scheduler issues:** kube-scheduler not running properly.",
      'Use `kubectl describe pod` and check the Events section for specific reasons.',
      'Check scheduling events, requests, affinity, taints, topology spread, quotas, pending PVCs, node selectors, and autoscaler status.',
      'Start with this general flow:',
      "A pod stuck in **Pending** almost always means the scheduler can't place it. Read the events to see why:",
      "- **Insufficient CPU or memory** — no node has room. Add nodes, adjust the requests, or let the cluster autoscaler add capacity.\n- **Unschedulable due to taints, affinity, or a nodeSelector** — no node matches the pod's requirements.\n- **PVC unbound** — there's no matching PV or StorageClass, or a zone mismatch.\n- **ImagePullBackOff** (a different phase) — the image name or tag is wrong, or the registry credentials are missing.",
      'If the pod is running but not responding, or keeps restarting:',
      "- `CrashLoopBackOff` means the app crashes on startup. Check `logs --previous`, the config, missing env vars or secrets, and any failing dependency.\n- Failing liveness or readiness probes can restart a healthy app or keep it out of the Service. Check the probe's path, port, and timeout.\n- `OOMKilled` (shown by `describe`) means the container ran out of memory. Raise the memory limit or fix the leak.",
    ],
    code: [
      {
        title: 'Check the Pod events',
        language: 'bash',
        code: `kubectl describe pod <pod-name>`,
      },
      {
        title: 'Check node capacity',
        language: 'bash',
        code: `kubectl get nodes -o wide
kubectl describe node <node-name>`,
      },
      {
        title: 'Check node taints',
        language: 'bash',
        code: `kubectl describe node <node-name>`,
      },
      {
        title: 'Check PVC binding',
        language: 'bash',
        code: `kubectl get pvc`,
      },
      {
        title: 'Check namespace quotas',
        language: 'bash',
        code: `kubectl get resourcequota -n <namespace>`,
      },
      {
        title: 'General Pod triage flow',
        language: 'bash',
        code: `kubectl get pods -o wide
kubectl describe pod <name>     # EVENTS section is the key signal
kubectl logs <name> [--previous]
kubectl get events --sort-by=.lastTimestamp`,
      },
    ],
    tags: ['pending', 'scheduling'],
  },
  {
    id: 'itv-myk8s-67',
    level: 'intermediate',
    kind: 'scenario',
    prompt: 'How do you troubleshoot Kubernetes pod scheduling due to taints?',
    probing:
      'Whether you add a justified toleration rather than removing a protective taint to force scheduling.',
    answer: [
      'Run kubectl describe node → Check taints → Add tolerations in pod spec → Or remove taints if not needed.',
      "**Detailed interview approach:** I use `kubectl describe pod <pod>` and read the scheduler's Events instead of guessing. They tell me whether it's insufficient CPU or memory, a taint, a node selector or affinity mismatch, an unbound PVC, a topology constraint, pod limits, or quota.",
      "I compare the requests against `kubectl top nodes`, the nodes' allocatable values, taints, labels, quotas, and autoscaler logs. Then I fix whatever's actually blocking the Pod: right-size the requests, add a justified toleration or label, fix the PVC or storage class, relax an overly strict affinity rule, or add node capacity.",
      "I don't remove a protective taint just to get past the problem. I verify scheduling, readiness, distribution across failure domains, and whether the cluster autoscaler will handle the same situation automatically next time.",
    ],
    tags: ['taints', 'tolerations', 'scheduling'],
  },
  {
    id: 'itv-myk8s-68',
    level: 'intermediate',
    kind: 'scenario',
    prompt: 'What do you do if a Pod is not responding?',
    probing:
      'Whether you first locate where it is not responding (process, probe, Service, outside) before acting.',
    answer: [
      'First clarify where the Pod is not responding: inside the process, through its health endpoint, through the Service, or from outside the cluster.',
      'I check `get` and `describe`, current and previous logs, the restart reason, exit code, OOM events, resource use, probes, the application port, the EndpointSlice, a direct request to the Pod versus one through the Service, DNS, network policy, and dependencies.',
      'Also compare node health with recent deployment or configuration changes.',
      "If there's real user impact, I pull it out of traffic through readiness or a rollback, or scale up a healthy version instead — I don't repeatedly kill it without evidence. An ephemeral debug container or a memory dump can capture a hang or deadlock. A node-level issue might need a cordon, drain, or replacement.",
      "Once it's fixed, I verify the Pod is Ready with stable restarts, the Service endpoints are correct, and a real transaction succeeds with normal latency and error rate. The root-cause review adds a timeout, a probe fix, better monitoring, resource resizing, or a regression test.",
    ],
    tags: ['troubleshooting', 'pods'],
  },
  {
    id: 'itv-myk8s-69',
    level: 'intermediate',
    kind: 'scenario',
    prompt: 'How do you fix OOMKilled Pods?',
    probing:
      'Whether you confirm OOMKilled from exit code 137 and metrics and fix the root cause rather than just raising limits.',
    answer: [
      "First I confirm it's really OOMKilled: `lastState.terminated.reason: OOMKilled`, exit code 137, the events, memory metrics, and whether it's node pressure or a container-limit issue. I compare against recent traffic, releases, and config changes, and look at heap or native memory use, caching, concurrency, payload size, and possible leaks.",
      'For an immediate, safe fix, I might roll back, reduce traffic or concurrency, scale out replicas, or raise the limit — only within what the node can actually support and only with evidence behind it. For a JVM app, I make sure the heap size leaves room for native memory inside the container limit.',
      'The permanent fix removes the leak or the unbounded cache, or right-sizes the resources properly.',
      'I update requests and limits through the controller, load-test the change, and keep watching working set, RSS, GC, OOM events, and node headroom, with alerts in place. Just raising the memory limit without finding the root cause can just move the failure to the node level or raise cost.',
      'Pod exceeded memory → Check logs/events → Increase memory limit → Optimize app memory usage → Use HPA to spread load.',
      '**Detailed interview approach:** I compare the current and previous container failure using `kubectl describe pod <pod>`, `kubectl logs <pod> -c <container>`, and `kubectl logs <pod> -c <container> --previous`.',
      'I look at the exit code, reason, events, probes, command and arguments, environment, mounted ConfigMaps and Secrets, permissions, and dependency reachability.',
      'Exit code 137 usually points to OOM; a connection or config error needs a different fix. I reproduce the issue with the exact image and configuration in a safe namespace, fix the actual application, config, resource, or probe problem, and deploy a new revision instead of just repeatedly deleting the Pod.',
      'I watch the rollout status, restart count, logs, latency, and error rate afterward, and roll back to the last healthy revision if the impact keeps growing.',
    ],
    tags: ['oomkilled', 'memory'],
  },
  {
    id: 'itv-myk8s-70',
    level: 'advanced',
    kind: 'scenario',
    prompt:
      'You have a memory leak in one of your microservices and the pod keeps getting OOMKilled. Walk me through how you would diagnose and fix it without taking down your production service.',
    probing:
      'Whether you judge impact first, separate a leak from a low limit with working-set metrics, and add alerting for next time.',
    answer: [
      'This is a scenario question — the interviewer wants to see how you think under pressure, not just whether you know the commands.',
      'First, understand the scope of impact. How many replicas are running, and what is the traffic impact of one pod being killed?',
      'Five replicas with one OOMKilled every 30 minutes gives you time to investigate. Two replicas both getting OOMKilled is an active incident, and investigation comes second.',
      'Assuming you have time, the investigation path:',
      'Now determine whether this is a real memory leak or just a limit set too low — two different problems with different fixes. Look at Prometheus, specifically `container_memory_working_set_bytes` over time:',
      '- **Memory grows continuously with no plateau** → a leak.\n- **Memory is stable but just above your limit** → the limit is wrong.',
      'If it is a real leak, that is ultimately a developer problem.',
      'Your job as a DevOps engineer is to buy the team time without an outage: temporarily raise the memory limit to stop the OOMKills, set an alert at 80% of the new limit so you know when it is approaching again, and give developers the metrics they need to find the leak.',
      'If the limit was simply too low, right-size it — look at actual peak memory usage from Prometheus over the last 30 days and set the limit to something reasonable above that.',
      'The part most people miss: make sure it does not happen again silently. Set a Prometheus alert on `OOMKilled` events so you are notified immediately next time, and consider whether the Vertical Pod Autoscaler can right-size requests and limits automatically over time.',
      'The interviewer is checking whether you think in systems, not just commands — anyone can Google the `kubectl` commands; not everyone thinks about the alert that catches the next incident before it becomes an outage.',
    ],
    followUps: [
      'Which Prometheus query shows a leak versus a limit that is too low?',
      'When is VPA a good fit for this workload?',
    ],
    code: [
      {
        title: 'Check memory use and the last termination',
        language: 'bash',
        code: `kubectl top pods                 # current memory consumption across pods
kubectl describe pod <pod>       # check Last State -> exit code 137 = OOMKilled`,
      },
    ],
    tags: ['oomkilled', 'memory leak', 'prometheus'],
  },
  {
    id: 'itv-myk8s-71',
    level: 'intermediate',
    kind: 'scenario',
    prompt: 'How do you troubleshoot high Pod restart counts?',
    probing:
      'Whether you classify the restart reason per container and stabilise it through the controller.',
    answer: [
      "First I identify which container, when it first started, how often it's happening, and why: `describe`, `logs --previous`, the container status's `lastState` and exit code, events, and metrics.",
      'I classify the cause: OOM, a failed liveness probe, an application error, a completion under a restart policy of `Always`, a node or runtime issue, a config or Secret problem, a dependency or DNS failure, a permissions issue, or a rollout gone wrong.',
      'I compare against the image, config, node, and an unaffected replica. To mitigate, I roll back, scale, or pull it out of traffic, and for a hang I capture a memory dump before it restarts again. Then I fix the code, config, probe, resources, or dependency, and deploy that fix through the controller.',
      'I confirm the restart count has stabilized — keeping in mind the counter itself persists for the life of the Pod — readiness is good, transactions succeed, and SLOs hold over an observation window. To prevent it recurring, I add an alert on restart rate and reason, tune startup and liveness settings, test for memory leaks, add a dependency timeout or circuit breaker, run a config preflight check, and use a canary rollout.',
      '• Check pod logs for crash reason.',
      '- Validate resource limits.\n- Verify liveness/readiness probes.\n- Fix config/secret errors.',
      '**Detailed interview approach:** I compare the current and previous container failure using `kubectl describe pod <pod>`, `kubectl logs <pod> -c <container>`, and `kubectl logs <pod> -c <container> --previous`.',
      'I look at the exit code, reason, events, probes, command and arguments, environment, mounted ConfigMaps and Secrets, permissions, and dependency reachability.',
      'Exit code 137 usually points to OOM; a connection or config error needs a different fix. I reproduce the issue with the exact image and configuration in a safe namespace, fix the actual application, config, resource, or probe problem, and deploy a new revision instead of just repeatedly deleting the Pod.',
      'I watch the rollout status, restart count, logs, latency, and error rate afterward, and roll back to the last healthy revision if the impact keeps growing.',
    ],
    tags: ['restarts', 'troubleshooting'],
  },
  {
    id: 'itv-myk8s-72',
    level: 'advanced',
    kind: 'scenario',
    prompt:
      'All Pods in one namespace suddenly fail readiness checks. What is your troubleshooting approach?',
    probing:
      'Whether you suspect a shared change or dependency when a whole namespace fails at once.',
    answer: [
      "Because this hits one whole namespace at the same time, I suspect a shared change or dependency rather than a bug in one application's code. I pin down the start time and check namespace events, and any recent rollout, config, Secret, NetworkPolicy, ServiceAccount, or quota change, along with the nodes hosting these Pods.",
      'I call the readiness endpoint from inside a failing Pod, then from another Pod, and check the application logs. I test DNS and any shared database, cache, or API, check certificate and secret expiry, service endpoints, egress policy, and resource pressure.',
      "I also compare against a namespace or environment that isn't affected.",
      'For immediate mitigation, I might roll back a config, policy, or release, or restore a broken dependency, while preserving the evidence. Then I confirm the endpoints repopulate and real requests actually succeed.',
      'To prevent a repeat, I add config canaries, secret-expiry alerts, policy tests, synthetic probes on dependencies, and better change correlation.',
    ],
    followUps: [
      'Which shared changes would you check first?',
      'How do you compare against an unaffected namespace?',
    ],
    tags: ['readiness', 'incidents'],
  },
  {
    id: 'itv-myk8s-73',
    level: 'advanced',
    kind: 'scenario',
    prompt:
      'A critical Pod gets evicted due to node pressure. How do you prevent it from happening again?',
    probing:
      'Whether you know node-pressure eviction is involuntary, so a PDB does not help, and fix requests and capacity.',
    answer: [
      "First I confirm the eviction reason from the Pod's status and events: memory, disk, inodes, PIDs, ephemeral storage, or a taint. I check the node's conditions, the kubelet's eviction messages, top and metrics data, and whether the filesystem, runtime, or logs are growing, along with what other Pods are doing.",
      "I set measured requests, appropriate limits including ephemeral storage, log rotation, and cleanup. I also add capacity or autoscaling and spread replicas out. Critical workloads can deliberately use a PriorityClass and a Guaranteed or Burstable QoS class, but keep in mind priority can evict other workloads — it's not extra capacity.",
      "A PDB doesn't stop this kind of eviction, because node pressure is involuntary, not voluntary.",
      "I fix the source of the pressure, replace the node if it's unhealthy, confirm rescheduling and SLOs recover, and add alerts on capacity and growth forecasts. Changing kubelet's eviction thresholds is a last resort, tested platform decision — not a way to hide the fact that there isn't enough capacity.",
    ],
    followUps: [
      'How do QoS classes affect eviction order?',
      'Why is priority not the same as capacity?',
    ],
    tags: ['eviction', 'node pressure', 'priorityclass'],
  },
  {
    id: 'itv-myk8s-74',
    level: 'intermediate',
    kind: 'scenario',
    prompt: 'How do you handle pod eviction in Kubernetes?',
    probing:
      'Whether you check node pressure and reschedule safely, using PDBs for voluntary disruptions.',
    answer: [
      'Check node pressure (CPU/memory/disk) → Reschedule pods to healthy nodes → Use PodDisruptionBudgets to protect critical pods.',
      "**Detailed interview approach:** I use `kubectl describe pod <pod>` and read the scheduler's Events instead of guessing. They tell me whether it's insufficient CPU or memory, a taint, a node selector or affinity mismatch, an unbound PVC, a topology constraint, pod limits, or quota.",
      "I compare the requests against `kubectl top nodes`, the nodes' allocatable values, taints, labels, quotas, and autoscaler logs. Then I fix whatever's actually blocking the Pod: right-size the requests, add a justified toleration or label, fix the PVC or storage class, relax an overly strict affinity rule, or add node capacity.",
      "I don't remove a protective taint just to get past the problem. I verify scheduling, readiness, distribution across failure domains, and whether the cluster autoscaler will handle the same situation automatically next time.",
    ],
    tags: ['eviction', 'pdb'],
  },
  {
    id: 'itv-myk8s-75',
    level: 'intermediate',
    kind: 'scenario',
    prompt: 'What if Kubernetes cluster nodes are running out of resources?',
    probing:
      'Whether you check node metrics and requests and add capacity through the autoscaler instead of guessing.',
    answer: [
      'Check node metrics → Add more nodes (cluster autoscaler) → Tune resource requests/limits → Reschedule pods across nodes.',
      "**Detailed interview approach:** I use `kubectl describe pod <pod>` and read the scheduler's Events instead of guessing. They tell me whether it's insufficient CPU or memory, a taint, a node selector or affinity mismatch, an unbound PVC, a topology constraint, pod limits, or quota.",
      "I compare the requests against `kubectl top nodes`, the nodes' allocatable values, taints, labels, quotas, and autoscaler logs. Then I fix whatever's actually blocking the Pod: right-size the requests, add a justified toleration or label, fix the PVC or storage class, relax an overly strict affinity rule, or add node capacity.",
      "I don't remove a protective taint just to get past the problem. I verify scheduling, readiness, distribution across failure domains, and whether the cluster autoscaler will handle the same situation automatically next time.",
    ],
    tags: ['capacity', 'nodes'],
  },
  {
    id: 'itv-myk8s-76',
    level: 'intermediate',
    kind: 'scenario',
    prompt: 'How do you troubleshoot Kubernetes nodes showing “NotReady”?',
    probing:
      'Whether you read node conditions, check kubelet and runtime, cordon safely and fix the image rather than rebooting forever.',
    answer: [
      'Run kubectl describe node → Check kubelet, docker/containerd logs → Verify network plugins → Restart node or replace if unhealthy.',
      '**Detailed interview approach:** I first run `kubectl get nodes -o wide` and `kubectl describe node <node>` and read the Conditions, Events, capacity, taints, and lease time.',
      'From console access, I check `systemctl status kubelet`, `journalctl -u kubelet`, containerd, disk and inodes, memory pressure, time sync, certificates, and connectivity to the API server.',
      'I cordon the node to stop new scheduling, and only drain it once disruption budgets and replacement capacity actually allow it.',
      'Then I fix the real cause — disk cleanup, a CNI or runtime repair, certificate renewal, a route or firewall change, or replacing the node — and verify the node comes back Ready, system Pods are healthy, workloads reschedule, and alerts clear.',
      'If this keeps happening, the fix is repairing the node image or node pool, not repeatedly restarting the node.',
      'Run kubectl describe node → Check kubelet logs → Verify Docker/container runtime → Restart node services → Replace unhealthy node if needed.',
      'Check kubelet and runtime health, certificates, disk/memory/PID pressure, CNI state, system logs, control-plane connectivity, and cloud instance health.',
    ],
    tags: ['notready', 'nodes', 'kubelet'],
  },
  {
    id: 'itv-myk8s-77',
    level: 'advanced',
    kind: 'scenario',
    prompt: 'Kubelet is constantly restarting on one node. How do you isolate the issue?',
    probing:
      'Whether you isolate one bad node by comparing with a healthy one and prefer replacing it from a known-good image.',
    answer: [
      "First I confirm it's really just one node, and cordon or drain it if that's safe to protect the workloads on it, and I preserve the logs. Then I check `systemctl status kubelet`, `journalctl -u kubelet`, the restart count and exit reason, config and flags, certificate expiry, system time, disk, inodes, memory, PIDs, the container runtime, and network, DNS, and firewall access to the API server.",
      "I compare against a healthy node's version and config, and check for any recent image or bootstrap change. CNI errors here could be a symptom or the actual cause. For a managed node group, I usually favor replacing the node from a known-good image once I have evidence, rather than hand-repairing it.",
      'After the fix or replacement, I verify the node is Ready, kubelet, the runtime, and CNI are healthy, test Pod scheduling, networking, volumes, logs, and exec, and then uncordon it. The root-cause review adds image validation, certificate and disk alerts, or a rollout canary.',
    ],
    followUps: [
      'What in the kubelet journal would point to a certificate problem?',
      'When do you repair a node instead of replacing it?',
    ],
    tags: ['kubelet', 'nodes'],
  },
  {
    id: 'itv-myk8s-78',
    level: 'intermediate',
    kind: 'open',
    prompt: 'What happens if kubelet is not running?',
    probing:
      'Whether you know running containers may survive but nothing new is managed, and the split-brain risk for stateful Pods.',
    answer: [
      'Kubelet stops sending heartbeats and status, and it stops managing the Pod lifecycle. Existing containers might keep running under the runtime, but no newly assigned Pods will start, and probes, restarts, config updates, and volume operations are no longer reliably handled. Exec and log access through kubelet also fails.',
      'The node becomes NotReady, and managed Pods may eventually get replaced once tolerations expire — though that carries a split-brain risk for stateful workloads if the old process is still actually running.',
      "I cordon the node, check `systemctl` and `journalctl` for kubelet, the runtime, config and certificates, disk and memory, and API connectivity, DNS, networking, and time sync. If it's a fixed, replaceable node image, I preserve the evidence and then replace it.",
      "After recovery, I verify the node is Ready, CNI and CSI are healthy, a test Pod schedules fine, networking, logs, and exec work, and the application itself is healthy. I monitor kubelet's service, certificates, and disk going forward to catch this earlier next time.",
    ],
    tags: ['kubelet', 'nodes'],
  },
  {
    id: 'itv-myk8s-79',
    level: 'advanced',
    kind: 'scenario',
    prompt: 'What do you do when a node hosting critical workloads crashes permanently?',
    probing:
      'Whether you know how managed Pods are replaced, the fencing needed for stateful ones, and that PDBs do not cover crashes.',
    answer: [
      'First I confirm the cloud instance or node is actually gone and check the user impact, make sure remaining capacity is enough, and stop routing to the unhealthy endpoints — readiness and the node controller normally handle that on their own. Managed, stateless Pods get recreated once the node is marked NotReady and eviction kicks in. I watch scheduling, storage attachment, and SLOs during that.',
      'Stateful workloads need fencing and a clean detach first, to avoid a split-brain situation before anything reattaches.',
      "For a node that's intermittently reachable, I cordon it. For a node that's permanently gone, I remove and replace it through the node group, after confirming there's no recoverable local data or forensic need. I don't rely on a PDB here — a PDB only controls voluntary disruption, not a crash.",
      'Once recovery is done, I verify replicas are spread across zones, data is consistent, endpoints are correct, and the application actually transacts. The root-cause review covers node health, autoscaler capacity, replica spreading, any assumptions about local data, and how long failover took.',
    ],
    followUps: [
      'How long before Pods from a dead node are replaced by default?',
      'How do you fence a stateful workload before reattaching its volume?',
    ],
    tags: ['nodes', 'failure', 'stateful'],
  },
  {
    id: 'itv-myk8s-80',
    level: 'intermediate',
    kind: 'scenario',
    prompt: 'One of your worker nodes is not joining the cluster. How would you debug the issue?',
    probing:
      'Whether you check the join token, API-server connectivity, kubelet logs and runtime before resetting and rejoining.',
    answer: [
      "If a worker node isn't joining the cluster, I'd first check the `kubeadm join` token validity, network connectivity to the API server, and kubelet logs for authentication or connection errors.",
      "Then I'd verify kubelet and container runtime status, DNS/hostname resolution, and finally reset and rejoin the node if necessary.",
      '**1. Check the `kubeadm join` command output:** When you run `kubeadm join`, it provides output that can indicate issues (e.g., token expired, unable to connect to API server).',
      '**2. Verify network connectivity:**',
      "- From the worker node, try pinging the master node's IP address.\n- Use `curl` or `wget` to test connectivity to the API server endpoint (`https://<master-ip>:6443`).",
      '**3. Check kubelet logs:** On the worker node, check kubelet logs for errors related to authentication or connection issues:',
      '**5. Check DNS and hostname resolution:**',
      "- Ensure the worker node can resolve the master node's hostname if using hostnames instead of IPs.\n- Try `nslookup` or `dig` commands to verify DNS resolution.",
      '**6. Reset and rejoin the node:** Then rejoin the cluster using the `kubeadm join` command provided by the master node.',
    ],
    code: [
      {
        title: 'Test connectivity to the API server',
        language: 'bash',
        code: `ping <control-plane-ip>
telnet <control-plane-ip> 6443`,
      },
      {
        title: 'Read the kubelet logs',
        language: 'bash',
        code: `journalctl -u kubelet -xe`,
      },
      {
        title: 'Check kubelet and the runtime',
        language: 'bash',
        code: `sudo systemctl status kubelet
sudo systemctl status docker      # or containerd`,
      },
      {
        title: 'Check or recreate the join token and reset',
        language: 'bash',
        code: `sudo kubeadm token list                        # Check if the token is still valid
sudo kubeadm token create --print-join-command  # Create a new token on the master if expired
sudo kubeadm reset                              # On the worker node, reset the kubeadm state`,
      },
    ],
    tags: ['nodes', 'kubeadm'],
  },
  {
    id: 'itv-myk8s-81',
    level: 'intermediate',
    kind: 'open',
    prompt:
      'What happens if the firewall between the Kubernetes master node and worker nodes gets broken?',
    probing:
      'Whether you know which control-plane and node ports matter and what breaks when they are blocked.',
    answer: [
      '**Impact** when the firewall breaks:',
      "- API server becomes inaccessible.\n- kubelet can't communicate with the master.\n- Pod scheduling stops.\n- Service discovery fails.\n- Existing pods may continue running but can't be managed.",
      '**Recovery steps** to restore communication:',
      '- Restore firewall rules for the required ports (6443, 10250, 2379-2380, etc.).\n- Check component health: API server, etcd, kubelet.\n- Restart cluster components if needed.\n- Verify node communication with `kubectl get nodes`.\n- Test pod creation and service connectivity.',
    ],
    tags: ['networking', 'control plane', 'ports'],
  },
  {
    id: 'itv-myk8s-82',
    level: 'advanced',
    kind: 'scenario',
    prompt:
      'What could cause a StatefulSet Pod to fail when rescheduled to a different availability zone?',
    probing:
      'Whether you know zonal disks cannot follow a Pod to another zone and that editing PV affinity does not move data.',
    answer: [
      "Cloud block volumes like EBS are tied to a single availability zone. The PV carries that zone's node affinity, so a Pod scheduled in a different zone simply can't attach it.",
      'Other causes include a stale VolumeAttachment, a multi-attach lock, not enough capacity in the zone, a CSI failure, node affinity or taints, or lost permissions.',
      "I check the Pod's events, the PVC and PV, the PV's node affinity, the StorageClass binding mode, the VolumeAttachment, CSI controller and node logs, and the node's zone labels. `WaitForFirstConsumer` helps prevent new claims from being provisioned in the wrong zone in the first place.",
      "For data that already exists, I schedule the Pod back in the volume's zone, restore or replicate it to supported storage, or move to a storage architecture actually designed for multi-zone availability. I don't edit the PV's affinity blindly — the physical location of the storage doesn't move just because I changed a field.",
    ],
    followUps: [
      'How does WaitForFirstConsumer prevent this for new claims?',
      'How would you design this StatefulSet for multi-AZ?',
    ],
    tags: ['statefulset', 'storage', 'zones'],
  },
  {
    id: 'itv-myk8s-83',
    level: 'advanced',
    kind: 'scenario',
    prompt:
      'What happens when a StatefulSet Pod cannot mount its volume after moving to another node?',
    probing:
      'Whether you read attach and mount events, check VolumeAttachments and CSI logs, and verify data after it mounts.',
    answer: [
      'The Pod may sit in Pending or ContainerCreating with an error like `FailedAttachVolume`, `Multi-Attach`, `FailedMount`, a timeout, or a filesystem error. I preserve the events and check:',
      "I compare the node's zone against the PV's zone, confirm the old node actually detached, check CSI health, the cloud disk's state, IAM, the mount path and filesystem, and node capacity.",
      "The fix might be rescheduling to the correct zone, carefully recovering a failed detach, restarting or replacing a CSI or node component once I have evidence it's the cause, or restoring the data.",
      "Once it mounts, I check the filesystem and application data and keep monitoring — I don't just consider the job done because the Pod shows Running.",
    ],
    followUps: ['What causes a Multi-Attach error?', 'When is it safe to force-detach a volume?'],
    code: [
      {
        title: 'Storage investigation commands',
        language: 'bash',
        code: `kubectl describe pod <pod>
kubectl get pvc,pv
kubectl describe pv <pv>
kubectl get volumeattachment
kubectl logs -n kube-system <csi-controller-pod>`,
      },
    ],
    tags: ['statefulset', 'storage', 'csi'],
  },
  {
    id: 'itv-myk8s-84',
    level: 'intermediate',
    kind: 'scenario',
    prompt:
      "All pods in a StatefulSet are trying to connect to the same storage volume. What's wrong, and how do you fix it?",
    probing:
      'Whether you know volumeClaimTemplates give each replica its own PVC and how those PVCs are named.',
    answer: [
      "**Issue:** StatefulSets should have unique PVCs per pod, but they're sharing storage. Root cause:",
      '- Incorrect `volumeClaimTemplates` configuration.\n- PVC not created per pod instance.\n- Storage class misconfiguration.',
      '**Solution:** Use `volumeClaimTemplates` so each pod gets its own PVC:',
      'Each StatefulSet pod gets its own PVC with the naming pattern `<claim-name>-<statefulset-name>-<ordinal>` (e.g., `data-mysql-0`, `data-mysql-1`).',
    ],
    code: [
      {
        title: 'volumeClaimTemplates',
        language: 'yaml',
        code: `spec:
  volumeClaimTemplates:
  - metadata:
      name: data
    spec:
      accessModes: ["ReadWriteOnce"]
      resources:
        requests:
          storage: 10Gi
      storageClassName: fast-ssd`,
      },
    ],
    tags: ['statefulset', 'storage'],
  },
  {
    id: 'itv-myk8s-85',
    level: 'intermediate',
    kind: 'scenario',
    prompt: 'How do you debug failed persistent volume (PV) mounts in Kubernetes?',
    probing:
      'Whether you inspect PVC, PV, StorageClass and CSI evidence and protect data before any destructive storage action.',
    answer: [
      'Check PVC status (kubectl describe pvc) → Validate storage class → Check node permissions → Fix provisioner issues.',
      '**Detailed interview approach:** I inspect the Pod, PVC, PV, StorageClass, CSI controller and node Pods, and their Events. The message usually points to pending provisioning, a topology mismatch, an attach conflict, a permissions issue, quota, a mount failure, or a filesystem error.',
      "I confirm the access mode, requested capacity, zone or node affinity, reclaim policy, secret or IAM access, CSI logs, and the cloud disk's attachment state. For a stateful workload, I protect the data and avoid force-detaching or deleting a PVC until I've confirmed ownership and that backups exist.",
      'I repair whichever layer is broken — binding, CSI, permissions, or storage — remount it through the controller, and validate that the application can actually read, write, and fail over. Regular snapshots, restore tests, CSI monitoring, and sensible topology settings are what prevent this.',
    ],
    tags: ['storage', 'pv', 'csi'],
  },
  {
    id: 'itv-myk8s-86',
    level: 'intermediate',
    kind: 'scenario',
    prompt: 'How do you handle Kubernetes pods stuck in Terminating state?',
    probing:
      'Whether you check finalizers and node state before force-deleting, and know force deletion does not stop the process.',
    answer: [
      'Run kubectl delete pod --force --grace-period=0 → Check finalizers → Investigate volumes/network issues.',
      '**Detailed interview approach:** I check `kubectl describe pod`, the deletion timestamp, finalizers, the owner, node status, volume attachments, and kubelet, CNI, and CSI events. A Pod can get stuck Terminating because a finalizer has unfinished cleanup, the node is unreachable, a preStop hook is taking longer than the grace period, or storage or network teardown is stuck.',
      "I fix whatever's actually responsible — the controller, node, or plugin — and let it delete normally. I only force-delete after confirming the process isn't still serving or writing, and that a stateful volume won't end up attached to two nodes at once. Force deletion removes the API object, but the process could still be running on an unreachable node.",
      "I verify the replacement is healthy and cleanup finished, then fix the underlying finalizer timeout, controller issue, or node fencing so it doesn't happen again.",
    ],
    tags: ['terminating', 'finalizers'],
  },
  {
    id: 'itv-myk8s-87',
    level: 'intermediate',
    kind: 'scenario',
    prompt: 'How do you detect & fix Kubernetes resource leaks?',
    probing:
      'Whether you find unused objects and runaway resource use and clean up with quotas and jobs.',
    answer: [
      'Monitor unused PVCs, ConfigMaps, Secrets → Use cleanup jobs → Apply resource quotas.',
      '**Detailed interview approach:** I compare the current and previous container failure using `kubectl describe pod <pod>`, `kubectl logs <pod> -c <container>`, and `kubectl logs <pod> -c <container> --previous`.',
      'I look at the exit code, reason, events, probes, command and arguments, environment, mounted ConfigMaps and Secrets, permissions, and dependency reachability.',
      'Exit code 137 usually points to OOM; a connection or config error needs a different fix. I reproduce the issue with the exact image and configuration in a safe namespace, fix the actual application, config, resource, or probe problem, and deploy a new revision instead of just repeatedly deleting the Pod.',
      'I watch the rollout status, restart count, logs, latency, and error rate afterward, and roll back to the last healthy revision if the impact keeps growing.',
    ],
    tags: ['resource leaks', 'cleanup'],
  },
  {
    id: 'itv-myk8s-88',
    level: 'advanced',
    kind: 'scenario',
    prompt: 'Multiple nodes show high disk I/O due to container logs. What do you do?',
    probing:
      'Whether you find the write source, fix rotation and log levels, and avoid deleting open log files.',
    answer: [
      "I confirm the actual write source using node and disk metrics and file growth, and compare that against the app's release, its log level, and whether the log agent is duplicating output. For an immediate fix, I reduce a noisy debug log or a runaway loop, or roll back the release, protect node capacity, rotate logs through kubelet or runtime settings, and ship them centrally.",
      "I don't blindly `rm` active log files — a deleted-but-open file still holds onto its disk space, and hand-editing the runtime directory can corrupt its state.",
      "For the long term, I move to structured logs at the right level, add rate limiting or sampling, set size and file retention, tune Fluent Bit's backpressure and buffers, use a separate disk where that's designed in, set ephemeral-storage requests and limits, and add disk and inode forecast alerts.",
      "I confirm the application's logs are still sufficient, the agent delivers them without loss within the required window, node I/O, pressure, and restarts are back to normal, and central log cost and cardinality — meaning the number of unique label combinations being tracked — stay under control.",
    ],
    followUps: [
      'Why does deleting an open log file not free the disk?',
      'How do you set ephemeral-storage limits for logs?',
    ],
    tags: ['logging', 'disk', 'nodes'],
  },
  {
    id: 'itv-myk8s-89',
    level: 'advanced',
    kind: 'scenario',
    prompt: 'How would you debug a sudden spike in latency across services?',
    probing:
      'Whether you scope the incident, trace one slow request and find amplification rather than scaling everything.',
    answer: [
      "First I pin down the incident's start time, scope, and affected regions, and compare traffic, errors, saturation, and recent deployments.",
      'I start at the ingress P95 and P99 and trace one representative slow request across services. I compare time spent in the service itself against time spent in a dependency like a database, cache, or external call, plus queueing, retries, timeouts, DNS, networking, and node pressure.',
      'I also check HPA and node scaling, cold starts, and any configuration or certificate change.',
      'Mitigation might mean rolling back, shifting traffic, scaling the actual bottleneck, disabling an expensive feature, rate limiting, or restoring a broken dependency. I avoid blindly scaling or restarting every service.',
      "I validate the user's actual transaction, latency, and error rate, and watch it recover. The root-cause review identifies the change that started it and any amplification — a retry storm or pool exhaustion, for example — and adds a test, more capacity, a timeout or retry budget, an alert, or a deployment gate.",
    ],
    followUps: [
      'How would you spot a retry storm?',
      'What would you add so this is caught earlier next time?',
    ],
    tags: ['latency', 'incidents', 'tracing'],
  },
  {
    id: 'itv-myk8s-90',
    level: 'intermediate',
    kind: 'scenario',
    prompt:
      'I get a 503 error from a load balancer URL that routes to apps in a Kubernetes cluster. How do you troubleshoot it?',
    probing:
      'Whether you check endpoints, readiness, selectors and ports before blaming the load balancer.',
    answer: [
      'I follow this systematic approach from the Service outwards:',
      'Follow this systematic approach:',
      '- **Check service endpoints:** `kubectl get endpoints <service-name>`.\n- **Verify pod health:** `kubectl get pods` — check if pods are ready.\n- **Check service configuration:** Ensure correct port mapping and selectors.\n- **Test internal connectivity:** `kubectl exec` into a pod and test the service.\n- **Check ingress/load balancer logs:** Look for backend connection errors.\n- **Verify health checks:** Ensure readiness/liveness probes are configured properly.\n- **Check resource limits:** Pods might be throttled due to resource constraints.',
    ],
    tags: ['503', 'services', 'ingress'],
  },
  {
    id: 'itv-myk8s-91',
    level: 'intermediate',
    kind: 'open',
    prompt:
      'What are common Kubernetes errors you have faced (like CrashLoopBackOff, ImagePullError) and how did you resolve them?',
    probing:
      'Whether you have real experience with the common failure states and know the first check for each.',
    answer: [
      '**1. CrashLoopBackOff**',
      '- **Cause:** Occurs when a container repeatedly crashes after starting.\n- **Resolution:** Check the container logs using `kubectl logs <pod-name>` to identify the root cause. Common issues include application errors, misconfigurations, or missing dependencies. Fix the underlying issue and redeploy the pod.',
      '**2. ImagePullBackOff**',
      '- **Cause:** Occurs when Kubernetes cannot pull the container image from the specified registry.\n- **Resolution:** Verify that the image name and tag are correct. Ensure the container registry is accessible and that any required authentication (e.g., image pull secrets) is properly configured. You can also check the events using `kubectl describe pod <pod-name>` for more details.',
      '**3. ErrImageNeverPull**',
      '- **Cause:** Occurs when the `imagePullPolicy` is set to `"Never"` and the image is not present on the node.\n- **Resolution:** Change the `imagePullPolicy` to `"IfNotPresent"` or `"Always"` in the pod specification, or ensure the image is pre-pulled on the nodes.',
      '**4. NodeNotReady** - cause and resolution:',
      '- **Cause:** Indicates that a node is not in a ready state to schedule pods.\n- **Resolution:** Check the node status using `kubectl get nodes` and investigate the node logs for issues such as resource exhaustion, network problems, or kubelet failures. Resolve the underlying issue and ensure the node is healthy.',
      '**5. PersistentVolumeClaim (PVC) Pending**',
      '- **Cause:** Occurs when a PVC cannot be bound to a PersistentVolume (PV).\n- **Resolution:** Ensure that there are available PVs that match the storage class, access modes, and size requested by the PVC. You can create additional PVs or adjust the PVC specifications as needed.',
      '**6. Unauthorized (401) Errors**',
      '- **Cause:** Occurs when there are authentication or authorization issues.\n- **Resolution:** Verify that the kubeconfig file is correctly configured and that the user has the necessary RBAC permissions to perform the requested actions.',
      '**7. DNS Resolution Issues**',
      '- **Cause:** Pods may fail to resolve DNS names, leading to connectivity issues.\n- **Resolution:** Check the CoreDNS pods and their logs for errors. Ensure that the DNS configuration is correct and that network policies allow DNS traffic.',
      'By systematically diagnosing and addressing these common errors, you can maintain a healthy and stable cluster environment.',
    ],
    tags: ['troubleshooting', 'errors'],
  },
  {
    id: 'itv-myk8s-92',
    level: 'basic',
    kind: 'open',
    prompt: 'What command gets logs from a Pod?',
    probing:
      'Whether you know --previous, container and label selection, and that Pod logs are ephemeral.',
    answer: [
      "`--previous` is essential for a container that already restarted. `kubectl describe` gives you events and termination details separately. If there are no logs at all, the app might be writing to a file instead, exiting before it even logs anything, or there's a runtime or kubelet issue, or I'm just looking at the wrong container.",
      'Production logs should be structured and centralized, because Pod logs themselves are ephemeral. I make sure they include a correlation ID and timestamp, redact secrets and PII, and avoid an unbounded `-f` tail during an incident.',
      'I compare the logs against deployment history, metrics, and traces rather than treating one log line as proof on its own.',
      'Pod logs disappear once the pod is deleted, so for logs you need to keep, send them to a centralized logging system (see §8.4).',
    ],
    code: [
      {
        title: 'kubectl logs variations',
        language: 'bash',
        code: `kubectl logs <pod> -n <ns> -c <container> --since=30m --timestamps
kubectl logs <pod> -n <ns> -c <container> --previous
kubectl logs -n <ns> -l app=api --all-containers --prefix --tail=200`,
      },
      {
        title: 'More kubectl logs options',
        language: 'bash',
        code: `kubectl logs <pod>                      # current logs
kubectl logs <pod> -c <container>       # specific container in multi-container pod
kubectl logs -f <pod>                   # follow (tail)
kubectl logs <pod> --previous           # logs from previous crashed container
kubectl logs -l app=web --tail=100      # by label selector`,
      },
    ],
    tags: ['logs', 'kubectl'],
  },
  {
    id: 'itv-myk8s-93',
    level: 'intermediate',
    kind: 'open',
    prompt: 'Where do you look for logs when troubleshooting an AKS workload and its nodes?',
    probing:
      'Whether you know which logs come from the API, the node and Azure-managed control-plane diagnostics.',
    answer: [
      'For an AKS workload, inspect from the Kubernetes API first:',
      'On Linux nodes, container-runtime log symlinks are commonly under `/var/log/containers/` and pod log directories under `/var/log/pods/`. Kubelet and node/system messages are often available through `journalctl -u kubelet` and the OS journal rather than a fixed `/var/log/kubelet.log` or `syslog` file.',
      'Paths vary by OS, runtime and managed-service configuration.',
      'In managed AKS, control-plane components are operated by Azure; their local host log files are not normally available. Enable and query AKS diagnostic/control-plane logs, Azure Activity Log, Container Insights/Log Analytics and Application Insights as applicable.',
      'Use application logs for business and code failures, node/kubelet/CNI logs for node and scheduling symptoms, and control-plane monitoring data for API, scheduler and controller issues. Collect structured `stdout`/`stderr` logs with correlation IDs; avoid logging secrets.',
    ],
    code: [
      {
        title: 'Start from the Kubernetes API',
        language: 'bash',
        code: `kubectl logs <pod> -c <container> --previous
kubectl describe pod <pod>
kubectl get events --sort-by=.metadata.creationTimestamp`,
      },
    ],
    tags: ['aks', 'logs'],
  },
  {
    id: 'itv-myk8s-94',
    level: 'intermediate',
    kind: 'open',
    prompt: 'How do you get and centralise Pod and cluster logs on EKS?',
    probing:
      'Whether you can investigate immediately with kubectl and also ship durable logs with least-privilege identity.',
    answer: [
      'For immediate investigation, identify the namespace, Pod and container, then inspect current and previous container output and Events:',
      '`kubectl logs` is not durable centralized storage. In EKS, deploy the Amazon CloudWatch Observability add-on or an approved Fluent Bit/OpenTelemetry logging pipeline with Pod Identity or another least-privilege workload identity.',
      'Route structured application logs with Kubernetes metadata to CloudWatch Logs, OpenSearch, Loki, or the organization’s platform; set retention, filtering, multiline parsing, redaction, cost controls, dashboards, and alerts.',
      'Enable EKS control-plane log types separately when required, and distinguish application, node/data-plane, control-plane, and CloudTrail API audit evidence during investigation.',
    ],
    code: [
      {
        title: 'Immediate Pod investigation',
        language: 'bash',
        code: `kubectl logs -n <namespace> <pod> -c <container> --since=30m
kubectl logs -n <namespace> <pod> -c <container> --previous
kubectl describe pod -n <namespace> <pod>
kubectl get events -n <namespace> --sort-by=.metadata.creationTimestamp`,
      },
    ],
    tags: ['eks', 'logs', 'cloudwatch'],
  },
]
