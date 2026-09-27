import type { InterviewQuestion } from '../../../types'

/** Probes, resources, scheduling, autoscaling, rollouts and deployment strategies. */
export const myKubernetesWorkloadQuestions: InterviewQuestion[] = [
  {
    id: 'itv-myk8s-30',
    level: 'intermediate',
    kind: 'open',
    prompt:
      'Explain the difference between liveness, readiness, and startup probes. When does getting this wrong take down your production app?',
    probing:
      'Whether you know what each probe does and have seen misconfigured probes cause restart loops or bad traffic in production.',
    answer: [
      'Everyone knows the definitions — liveness restarts the container if it fails, readiness removes the pod from Service endpoints if it fails, startup gates the other two until the app has initialized. The interviewer is testing whether you have seen what happens when these are configured wrong in production.',
      'Three real scenarios:',
      '**Scenario 1 — Liveness probe that is too aggressive.** Suppose your Java app takes 90 seconds to start, but the liveness probe begins checking at 10 seconds with a 5-second timeout. The app is still loading, does not respond, and liveness fails.',
      'Kubernetes restarts the container, it starts loading again, liveness fails again, and you are in a `CrashLoopBackOff` that has nothing to do with the application being broken — the probe configuration is wrong.',
      'The fix is a startup probe, which runs first and gives the slow app time to initialize; liveness and readiness only start after it succeeds:',
      '**Scenario 2 — Readiness probe checking the wrong endpoint.** Suppose readiness checks `/health`, but the app marks itself ready before it finishes loading configuration from a remote config service.',
      'Traffic starts hitting the pod, which serves requests with incomplete configuration, and users get wrong data or errors.',
      'In production you want readiness to check a deeper endpoint that validates the app is truly ready — database connection pool initialized, config loaded, cache warmed — not just that the HTTP server started.',
      'The difference between a shallow health check and a meaningful one is the difference between routing traffic to a broken pod or not.',
      '**Scenario 3 — No readiness probe on a StatefulSet.** Suppose a Postgres StatefulSet with three replicas does a rolling upgrade. `pod-0` goes down, comes back, but has not finished replaying its WAL logs and is not ready for connections.',
      'Without a readiness probe, Kubernetes has no way to know this — it marks the pod ready and routes traffic, and the application gets connection errors while Postgres is still recovering.',
      'A proper readiness probe that checks whether Postgres is accepting connections keeps the pod out of the Service endpoints until it is actually ready.',
      'Probe configuration is not a minor detail. It is what stands between a smooth deployment and a 2am incident.',
      "A startup probe gates the liveness and readiness probes for a slow-starting application. Readiness removes an unready Pod from the Service's endpoints without restarting it. Liveness restarts a process that can't recover on its own. All three can use HTTP, TCP, exec, or, where supported, gRPC.",
      "I keep the liveness probe local and conservative. If it checks something like a downstream database that's temporarily down, it can restart every healthy app at once and make the outage worse. Readiness can check whatever's actually needed to serve traffic. I set the thresholds based on measured startup and recovery times, not guesses.",
      "When a probe fails, I check `kubectl describe`, hit the endpoint manually from inside the Pod, check the path, port, and scheme, the bind address, the timing, resource pressure, and the logs. I fix the probe or the application — I don't just disable the probe permanently to force a rollout through.",
      '- **Startup probe:** Protects slow-starting applications from premature liveness checks.\n- **Readiness probe:** Controls whether a Pod receives Service traffic.\n- **Liveness probe:** Restarts a container considered unhealthy.\n- **PodDisruptionBudget:** Limits voluntary disruption to a replicated workload.',
      'Readiness gates traffic; liveness should detect an unrecoverable process, not temporary dependency slowness. Poor probes are a common source of rollout downtime and restart loops.',
    ],
    code: [
      {
        title: 'Startup probe for a slow-starting app',
        language: 'yaml',
        code: `startupProbe:
  httpGet:
    path: /health
    port: 8080
  failureThreshold: 30   # 30 x 10s = 5 minutes to start
  periodSeconds: 10`,
      },
    ],
    tags: ['probes', 'readiness', 'liveness'],
  },
  {
    id: 'itv-myk8s-31',
    level: 'basic',
    kind: 'open',
    prompt: 'How do resource requests and limits work?',
    probing:
      'Whether you know requests drive scheduling and QoS while limits throttle CPU and OOM-kill memory.',
    answer: [
      'Requests are what the scheduler uses to place a Pod, and they influence its QoS class. Limits are hard ceilings enforced at runtime. CPU is compressible — going over the limit just throttles it.',
      "Memory isn't compressible — going over the cgroup limit can get the container OOMKilled. A namespace's LimitRange or ResourceQuota can enforce defaults and bounds on top of this.",
      'I size these from observed usage percentiles and load tests, plus some headroom — not from guesses. I keep monitoring usage, throttling, OOM events, evictions, latency, and Pending Pods.',
      'VPA can help recommend values. Requests that are too high waste capacity or block scheduling. Memory limits that are too low cause crashes. CPU limits can hurt latency-sensitive workloads. The right policy really depends on the workload.',
      '- **Request:** Used for scheduling and influences resource guarantees.\n- **Limit:** Enforced maximum for memory and a throttling boundary for CPU.',
      'A container exceeding its memory limit can be terminated as `OOMKilled`. During node pressure, QoS class, usage relative to requests, and Pod priority influence eviction.',
      'Existing Pod specifications are generally replaced through their controller when resource settings change. In-place resize availability depends on the Kubernetes version, feature status, and cluster support; do not assume it is universally available.',
    ],
    code: [
      {
        title: 'Requests and limits',
        language: 'yaml',
        code: `resources:
  requests: { cpu: 250m, memory: 256Mi }
  limits: { cpu: "1", memory: 512Mi }`,
      },
    ],
    tags: ['resources', 'requests', 'limits'],
  },
  {
    id: 'itv-myk8s-32',
    level: 'intermediate',
    kind: 'open',
    prompt: 'How do you set resource limits in Kubernetes?',
    probing:
      'Whether you set requests and limits in the Pod spec and can read scheduler evidence when they block placement.',
    answer: [
      'Define requests & limits in pod spec → Ensures fair resource allocation and prevents pod from consuming all CPU/memory.',
      "**Detailed interview approach:** I use `kubectl describe pod <pod>` and read the scheduler's Events instead of guessing. They tell me whether it's insufficient CPU or memory, a taint, a node selector or affinity mismatch, an unbound PVC, a topology constraint, pod limits, or quota.",
      "I compare the requests against `kubectl top nodes`, the nodes' allocatable values, taints, labels, quotas, and autoscaler logs. Then I fix whatever's actually blocking the Pod: right-size the requests, add a justified toleration or label, fix the PVC or storage class, relax an overly strict affinity rule, or add node capacity.",
      "I don't remove a protective taint just to get past the problem. I verify scheduling, readiness, distribution across failure domains, and whether the cluster autoscaler will handle the same situation automatically next time.",
    ],
    tags: ['resources', 'limits', 'scheduling'],
  },
  {
    id: 'itv-myk8s-33',
    level: 'intermediate',
    kind: 'open',
    prompt:
      'How do you optimize resource requests and limits for containers in a production cluster?',
    probing:
      'Whether you size from measured usage and load tests, and use VPA, HPA and quotas rather than guesses.',
    answer: [
      'Optimizing resource requests and limits is crucial for ensuring efficient resource utilization, preventing resource contention, and maintaining application performance.',
      '1. **Analyze application resource usage:** Monitor the resource usage of your applications using tools like Prometheus, Grafana, or the Kubernetes Metrics Server. Collect data on CPU and memory consumption under different load conditions to understand the resource requirements of your applications.\n2. **Set resource requests:** Resource requests define the **minimum** amount of CPU and memory that a container needs to run. Set requests based on the average resource usage observed during monitoring. This ensures that the scheduler can make informed decisions about pod placement.\n3. **Set resource limits:** Resource limits define the **maximum** amount of CPU and memory that a container can use. Set limits slightly above the peak usage observed during monitoring to prevent containers from consuming excessive resources and affecting other workloads.\n4. **Use Vertical Pod Autoscaler (VPA):** VPA automatically adjusts the resource requests and limits of pods based on their actual usage. Deploy VPA in your cluster to help optimize resource allocation dynamically.\n5. **Implement Horizontal Pod Autoscaler (HPA):** HPA scales the number of pod replicas based on resource usage metrics, helping to distribute the load and optimize resource utilization.\n6. **Conduct load testing:** Perform load testing to simulate real-world traffic and observe how your applications behave under stress. Use the results to fine-tune resource requests and limits.\n7. **Review and adjust regularly:** Regularly review resource usage metrics and adjust requests and limits as needed based on changes in application behavior or workload patterns.\n8. **Avoid over-provisioning:** Avoid setting excessively high resource requests and limits, as this can lead to wasted resources and increased costs. Aim for a balance between ensuring application performance and efficient resource utilization.\n9. **Use namespaces and resource quotas:** Organize workloads into namespaces and apply resource quotas to limit the total resource consumption for each namespace. This helps prevent any single team or application from consuming all cluster resources.',
      'By following these strategies, you can optimize resource requests and limits for containers in your production Kubernetes cluster, leading to improved performance and cost-efficiency.',
    ],
    tags: ['resources', 'right-sizing', 'vpa'],
  },
  {
    id: 'itv-myk8s-34',
    level: 'intermediate',
    kind: 'open',
    prompt: 'How does the Kubernetes scheduler decide where to place Pods?',
    probing:
      'Whether you know the filter-then-score process and read the FailedScheduling event before changing anything.',
    answer: [
      "The scheduler watches for Pods that haven't been scheduled yet. First it filters out any node that fails a hard requirement: not enough allocatable resources for the requests, a node selector or required affinity that doesn't match, a taint with no matching toleration, a volume topology or binding mismatch, a port conflict, or another plugin rule.",
      'Then it scores the remaining, feasible nodes on preferred affinity, spreading, resource balance, and topology, and binds the Pod to the best one. Kubelet is what actually starts it.',
      'For a Pending Pod, I read the scheduling event first:',
      "I check the requests, taints, selectors and affinity, topology constraints, PVC, quota, node capacity and IPs, and the autoscaler. I fix the actual constraint or add capacity — deleting and recreating an identical Pod doesn't solve a problem that was never going to schedule in the first place.",
      'The scheduler filters and scores nodes using:',
      '- Resource requests and allocatable capacity\n- Node selectors and node affinity\n- Pod affinity and anti-affinity\n- Taints and tolerations\n- Topology spread constraints\n- Volume topology\n- Pod priority and preemption',
      'Required anti-affinity can make Pods unschedulable when there are too few eligible nodes or zones. Prefer soft rules when strict separation is not essential and monitor scheduling events.',
      'When a node becomes unreachable, Pods usually receive default `NoExecute` tolerations for `not-ready` and `unreachable` conditions. Per-Pod `tolerationSeconds` can alter how long they remain bound.',
      'Exact behavior depends on cluster configuration and workload type.',
    ],
    code: [
      {
        title: 'Read the scheduling evidence',
        language: 'bash',
        code: `kubectl describe pod <pod>
kubectl get nodes --show-labels
kubectl top nodes`,
      },
    ],
    tags: ['scheduler', 'scheduling'],
  },
  {
    id: 'itv-myk8s-35',
    level: 'advanced',
    kind: 'open',
    prompt: 'What are common scheduling challenges in a multi-node, multi-AZ setup?',
    probing:
      'Whether you can reason about zonal volumes, IP and quota exhaustion, and strict versus preferred spreading.',
    answer: [
      "The usual challenges are zonal volumes conflicting with where a Pod needs to run, uneven replica distribution, strict anti-affinity rules with too few zones to satisfy them, exhausted subnet IPs or instance quotas in an AZ, taints and node selectors, mixed node architectures, and autoscaler node groups that just can't satisfy the constraints. Cross-zone traffic also adds latency and cost.",
      'I design topology spread across hostname and zone, choosing `ScheduleAnyway` or `DoNotSchedule` depending on how strict the requirement really is. I use `WaitForFirstConsumer` for storage, keep capacity available in each zone, and test what happens if a zone goes down. When investigating, I group the Pending events together and compare eligible nodes, PV zone, subnet IPs, quotas, and autoscaler logs.',
      "The goal isn't perfect spreading at all costs — hard constraints can actually reduce availability if one zone fails, so I choose between strict and preferred rules deliberately.",
    ],
    followUps: [
      'When would you choose ScheduleAnyway over DoNotSchedule?',
      'How do you keep enough capacity in each zone to survive a zone failure?',
    ],
    tags: ['scheduling', 'multi-az', 'topology spread'],
  },
  {
    id: 'itv-myk8s-36',
    level: 'basic',
    kind: 'open',
    prompt: 'I want a Pod to be scheduled on one specific node only. How can I achieve this?',
    probing:
      'Whether you know nodeSelector, required node affinity and nodeName, and that nodeName bypasses the scheduler.',
    answer: [
      'You can control pod scheduling using `nodeSelector`, Node Affinity, or the `nodeName` field:',
      '- **`nodeSelector`:** Add labels to nodes and use `nodeSelector` in the pod spec.\n- **Node Affinity:** More flexible, using `requiredDuringSchedulingIgnoredDuringExecution`.\n- **`nodeName`:** Directly specify the node name (bypasses the scheduler).',
    ],
    code: [
      {
        title: 'nodeSelector or required node affinity',
        language: 'yaml',
        code: `spec:
  nodeSelector:
    disktype: ssd
  # OR
  affinity:
    nodeAffinity:
      requiredDuringSchedulingIgnoredDuringExecution:
        nodeSelectorTerms:
        - matchExpressions:
          - key: kubernetes.io/hostname
            operator: In
            values: ["node-1"]`,
      },
    ],
    tags: ['scheduling', 'nodeselector', 'affinity'],
  },
  {
    id: 'itv-myk8s-37',
    level: 'intermediate',
    kind: 'open',
    prompt: 'How does Kubernetes handle self-healing at Pod and node level?',
    probing:
      'Whether you know the layers of self-healing and their limits: bare Pods, storage topology, capacity and single replicas.',
    answer: [
      "At the container level, kubelet restarts it according to the restart policy and probe results. At the Pod level, controllers like ReplicaSet, StatefulSet, or Job create replacements whenever the desired state isn't met.",
      'The scheduler places the new Pods, and Services only send traffic to ready endpoints. When a node stops sending heartbeats, it becomes NotReady or Unreachable, and taint-based eviction combined with tolerations decides when managed Pods actually get replaced.',
      "Self-healing has real limits. A standalone Pod isn't recreated. Persistent volume topology can block scheduling. Not enough capacity or overly strict affinity can leave a Pod Pending. Corrupted data doesn't heal itself. And a single replica still means downtime when it fails.",
      'I validate all this with controlled Pod and node failure tests, watching events, replacement time, readiness, traffic, storage, and SLOs. A PDB protects against voluntary disruption — it does nothing for a node crash.',
    ],
    tags: ['self-healing', 'controllers'],
  },
  {
    id: 'itv-myk8s-38',
    level: 'intermediate',
    kind: 'open',
    prompt: 'How do you implement auto-healing in Kubernetes?',
    probing:
      'Whether you connect liveness restarts, controller replacement and autoscaling into one auto-healing story.',
    answer: [
      'Use liveness probes → If container fails health check, kubelet restarts it → Integrate with Horizontal Pod Autoscaler for scaling.',
      '**Detailed interview approach:** First I decide whether the demand actually needs more Pods, bigger Pods, or more nodes. I look at request rate, latency, CPU and memory, throttling, Pending Pods, and dependency limits.',
      "HPA needs realistic resource requests or application metrics, and tested min/max and stabilization settings. The node autoscaler supplies capacity for whatever's unschedulable.",
      'For an immediate incident, I might safely scale with `kubectl scale deployment <name> --replicas=<n>` while I investigate the actual traffic or performance cause.',
      'I verify readiness, load distribution, scaling events, dependency health, a graceful scale-down, and cost. Load tests and capacity alerts are what prove the whole path works before the next real peak.',
    ],
    tags: ['self-healing', 'probes', 'hpa'],
  },
  {
    id: 'itv-myk8s-39',
    level: 'intermediate',
    kind: 'open',
    prompt:
      'What is a PodDisruptionBudget, and when does ignoring it cause a real production outage?',
    probing:
      'Whether you know a PDB limits voluntary disruptions only, and have seen what a drain does without one.',
    answer: [
      'Most candidates have heard of PodDisruptionBudget (PDB); few understand what happens when it is missing.',
      'Suppose you run a three-replica deployment of your payment service, and the cluster needs node maintenance — Karpenter consolidating underutilized nodes, or a team upgrading the EKS node group. Kubernetes starts draining nodes one by one.',
      'Without a PDB, Kubernetes can evict all three payment-service pods at the same time if they all happened to sit on nodes being drained. Within seconds the service has zero running pods and is completely down.',
      'This is not a failure — it is Kubernetes doing exactly what you asked, because you never told it any limits.',
      'A PDB lets you declare the minimum number of pods that must stay running during voluntary disruptions:',
      'With `minAvailable: 2`, Kubernetes can only evict one payment pod at a time. It drains the node, waits for that pod to be rescheduled and healthy elsewhere, then proceeds to the next node.',
      'The keyword is **voluntary disruptions** — node drains, cluster upgrades, Karpenter consolidation. A PDB does **not** protect you from a node crashing or a pod being OOMKilled; that is a different problem.',
      'I have seen this play out: a team upgrading their EKS node group with no PDBs sent three critical services to zero pods simultaneously during the drain. Even in a 2am maintenance window it caused a 20-minute outage, because nobody had defined the minimum acceptable state during disruption.',
      'That specific scenario is what PDB is for.',
      'A PodDisruptionBudget, or PDB, limits how many **voluntary** disruptions can happen at once to a set of Pods, using `minAvailable` or `maxUnavailable`. The eviction API used by node drains and the cluster autoscaler respects it.',
      "It doesn't protect against crashes, node loss, OOM kills, or application failures, and it doesn't create replicas either.",
      'For a three-replica API, `minAvailable: 2` allows exactly one voluntary eviction at a time. I make sure the selector is correct, replicas are actually spread across nodes and zones, readiness is accurate, and the budget still allows maintenance to happen — an impossible PDB can block node drains and upgrades entirely.',
      "When a drain is stuck, I check `kubectl get pdb`, the current healthy and desired counts, allowed disruptions, unavailable Pods, and the controller's replica count. I fix the underlying health or capacity issue, or make a deliberate, approved risk decision — I don't just bypass a production safeguard casually.",
    ],
    code: [
      {
        title: 'PodDisruptionBudget for the payment service',
        language: 'yaml',
        code: `apiVersion: policy/v1
kind: PodDisruptionBudget
metadata:
  name: payment-pdb
spec:
  minAvailable: 2
  selector:
    matchLabels:
      app: payment`,
      },
    ],
    tags: ['pdb', 'disruptions'],
  },
  {
    id: 'itv-myk8s-40',
    level: 'intermediate',
    kind: 'open',
    prompt: 'How do you implement autoscaling when traffic fluctuates heavily in Kubernetes?',
    probing:
      'Whether you pair HPA for Pods with a node autoscaler for capacity, and test the whole scaling path.',
    answer: [
      'To implement autoscaling when traffic fluctuates heavily, you can use the **Horizontal Pod Autoscaler (HPA)** and **Cluster Autoscaler**.',
      '**1. Horizontal Pod Autoscaler (HPA):** HPA automatically scales the number of pod replicas based on observed CPU utilization or other selected metrics.',
      'Replace `<deployment-name>` with the name of your deployment. This command sets the minimum number of replicas to 2, the maximum to 10, and targets 50% CPU utilization.',
      'You can also define HPA in a YAML manifest:',
      'Apply the YAML manifest using:',
      '**2. Cluster Autoscaler:** The Cluster Autoscaler automatically adjusts the size of the Kubernetes cluster by adding or removing nodes based on the resource requests of the pods.',
      'To set up Cluster Autoscaler in AKS, enable it through the Azure portal or use the Azure CLI:',
      'Replace `<resource-group>` and `<aks-cluster-name>` with your actual resource group and AKS cluster name.',
      '**3. Monitor autoscaling:**',
      '- Use `kubectl get hpa` to monitor the status of your Horizontal Pod Autoscaler.\n- Use Azure Monitor or the Kubernetes dashboard to keep an eye on cluster resource usage and scaling activities.',
      '**4. Test autoscaling:** Simulate traffic spikes to test the autoscaling behavior and ensure that your application can handle increased load effectively.',
      'By implementing HPA and Cluster Autoscaler, you can ensure that your Kubernetes cluster scales efficiently in response to fluctuating traffic demands.',
      '- **HPA:** Changes replica count using resource or custom/external metrics.\n- **VPA:** Recommends or updates Pod resource sizing according to its mode.\n- **Cluster Autoscaler:** Adds or removes nodes based on unschedulable Pods and utilization rules.',
      'When HPA metrics are unavailable, scaling behavior depends on which metrics fail and available recommendations. Monitor HPA conditions rather than assuming every metrics failure freezes replicas.',
      'HPA changes Pod replica count from CPU, memory, or custom/external metrics. VPA recommends or changes Pod resource sizing and may restart Pods.',
      'Cluster Autoscaler or the provider node autoscaler adds/removes worker-node capacity when Pods cannot schedule or nodes are underused.',
      'Metrics Server supplies common resource metrics; production scaling must also validate resource requests, min/max limits, stabilization, dependency capacity, startup time, and safe scale-down.',
    ],
    code: [
      {
        title: 'Create an HPA imperatively',
        language: 'bash',
        code: `kubectl autoscale deployment <deployment-name> --min=2 --max=10 --cpu-percent=50`,
      },
      {
        title: 'HPA manifest (autoscaling/v2)',
        language: 'yaml',
        code: `apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: my-hpa
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: my-deployment
  minReplicas: 2
  maxReplicas: 10
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 50`,
      },
      {
        title: 'Apply the HPA',
        language: 'bash',
        code: `kubectl apply -f hpa.yaml`,
      },
      {
        title: 'Enable the AKS cluster autoscaler',
        language: 'bash',
        code: `az aks update \\
  --resource-group <resource-group> \\
  --name <aks-cluster-name> \\
  --enable-cluster-autoscaler \\
  --min-count 1 \\
  --max-count 5`,
      },
    ],
    tags: ['hpa', 'cluster autoscaler', 'autoscaling'],
  },
  {
    id: 'itv-myk8s-41',
    level: 'basic',
    kind: 'open',
    prompt:
      'What is the difference between vertical and horizontal scaling in Kubernetes, and which is preferred?',
    probing:
      'Whether you can contrast scale up and scale out, and explain why horizontal is preferred for stateless services.',
    answer: [
      'Vertical and horizontal scaling are two ways to give an application more capacity as its workload increases.',
      '- **Vertical scaling**: Increases the CPU or memory available to an existing Pod. | **Horizontal scaling**: Increases the number of Pod replicas.\n- **Vertical scaling**: Also called **scale up**. | **Horizontal scaling**: Also called **scale out**.\n- **Vertical scaling**: Makes one Pod more powerful. | **Horizontal scaling**: Distributes the workload across multiple Pods.\n- **Vertical scaling**: Usually replaces or restarts the Pod to apply new resource settings; in-place resizing depends on cluster support. | **Horizontal scaling**: Creates new Pods without changing the existing replicas.\n- **Vertical scaling**: Is limited by the capacity of a single node. | **Horizontal scaling**: Can use capacity across multiple nodes.\n- **Vertical scaling**: Suits applications that cannot run multiple instances easily. | **Horizontal scaling**: Suits stateless applications such as web servers and APIs.',
      'Suppose an application starts with one Pod that has one CPU and 2 GB of memory:',
      '- **Vertical scaling:** Increase the Pod from one to four CPUs and from 2 GB to 8 GB of memory. The application still has one Pod, but that Pod has more capacity.\n- **Horizontal scaling:** Increase the replica count from one to five while each Pod keeps one CPU and 2 GB of memory. A Kubernetes Service distributes traffic across the ready Pods.',
      '**Horizontal Pod Autoscaler:** The Horizontal Pod Autoscaler (HPA) automatically increases or decreases the number of Pod replicas according to CPU, memory, or custom/external metrics. For example, when CPU utilization rises above a configured target such as 70%, HPA might increase a workload from two Pods to five.',
      '**Vertical Pod Autoscaler:** The Vertical Pod Autoscaler (VPA) recommends or, depending on its mode, applies CPU and memory requests to right-size Pods. For example:',
      '- **CPU**: Current: `500m`; Recommended: `1000m`\n- **Memory**: Current: `512Mi`; Recommended: `2Gi`',
      'Applying a VPA recommendation commonly requires Pod replacement, although behavior depends on VPA mode and support for in-place Pod resizing. Avoid using HPA and VPA on the same CPU or memory signal without careful design because their control loops can conflict.',
      '**Which Approach Is Preferred?** Horizontal scaling is generally preferred for stateless Kubernetes workloads because it:',
      '- Improves availability by keeping multiple replicas.\n- Handles Pod or node failures better because other ready Pods can serve traffic.\n- Scales beyond the capacity of a single machine.\n- Fits stateless microservices naturally.',
      'Vertical scaling is useful when:',
      '- The application cannot be distributed easily across multiple instances, as with some legacy or stateful applications.\n- The workload needs more CPU or memory but gains little from additional replicas.',
      'In production, the approaches can complement each other: use VPA recommendations to right-size Pods, HPA to adjust replica count, and a node autoscaler to provide enough cluster capacity.',
      '**30-Second Interview Answer:** Vertical scaling, or scale up, means increasing the CPU and memory available to a Pod. It improves the capacity of one Pod but is limited by the resources of a node and commonly requires Pod replacement.',
      'Horizontal scaling, or scale out, means increasing the number of Pod replicas. Kubernetes typically uses VPA for vertical scaling and HPA for horizontal scaling.',
      'For stateless production workloads, horizontal scaling is generally preferred because it provides better availability, fault tolerance, and scalability.',
    ],
    tags: ['hpa', 'vpa', 'scaling'],
  },
  {
    id: 'itv-myk8s-42',
    level: 'intermediate',
    kind: 'open',
    prompt:
      'How does Kubernetes handle scaling, rolling updates, and self-healing, and how do you scale a deployment manually and automatically?',
    probing:
      'Whether you can explain the controller model behind scaling, rollouts and healing, and scale both manually and automatically.',
    answer: [
      'Kubernetes uses controllers to keep actual state equal to desired state. A Deployment declares the required image and replica count, while its ReplicaSet keeps that number of Pods running.',
      'If a container fails, kubelet restarts it according to the Pod policy. If a Pod disappears, the ReplicaSet creates another.',
      'If a node fails, the control plane schedules replacement Pods on healthy nodes when capacity and storage constraints allow it.',
      'For a rolling update, the Deployment creates a new ReplicaSet and gradually adds new Pods while removing old ones. I configure readiness and startup probes so traffic reaches only healthy Pods, and I tune `maxSurge` and `maxUnavailable` to maintain capacity.',
      'I monitor with `kubectl rollout status deployment/<name>` and application metrics. If the release is unhealthy, I stop or reverse it with `kubectl rollout undo deployment/<name>`.',
      'Manual scaling is appropriate for a planned, temporary change:',
      'For automatic scaling, I configure an HPA using CPU, memory, or application metrics. Resource requests must be realistic because utilization-based HPA calculations depend on them:',
      'HPA scales Pods, while Cluster Autoscaler or a provider-specific node autoscaler adds nodes when Pods remain Pending because the cluster lacks capacity. I load-test the complete path and verify scale-up time, maximum limits, Pod distribution, graceful scale-down, and cost alerts.',
    ],
    code: [
      {
        title: 'Scale manually and check',
        language: 'bash',
        code: `kubectl scale deployment api --replicas=6
kubectl get deployment api
kubectl get pods -l app=api`,
      },
      {
        title: 'Autoscale on CPU and inspect the HPA',
        language: 'bash',
        code: `kubectl autoscale deployment api --min=3 --max=20 --cpu-percent=65
kubectl get hpa
kubectl describe hpa api`,
      },
    ],
    tags: ['scaling', 'rolling updates', 'self-healing'],
  },
  {
    id: 'itv-myk8s-43',
    level: 'basic',
    kind: 'open',
    prompt: 'How do you replicate a Pod?',
    probing:
      'Whether you scale through the controller, not individual Pods, and check capacity and dependencies before adding replicas.',
    answer: [
      'You use the controller for this. A Deployment for interchangeable stateless Pods, a StatefulSet for stable identity and storage. You set `spec.replicas` directly, or let an HPA manage it.',
      "Before scaling, I check requests, node and IP capacity, the Service's selector and readiness, shared dependency or database connection capacity, session and state handling, and licensing. More Pods won't help if the actual bottleneck is a database or something serialized — I load-test to confirm.",
      "For automatic scaling, I configure the metrics, min and max, and behavior settings, plus node autoscaling. I verify the Ready replica count, how endpoints are distributed across zones, latency and error rate, and cost. I also update the Git source so GitOps doesn't quietly undo a manual change.",
      "Don't manage pods directly. Use a Deployment (or a ReplicaSet or StatefulSet) and set the replica count:",
      'The ReplicaSet controller keeps the pod count at whatever you set. For automatic scaling, use an HPA (see §3.6).',
    ],
    code: [
      {
        title: 'Scale a Deployment and watch the rollout',
        language: 'bash',
        code: `kubectl scale deployment api --replicas=5
kubectl rollout status deployment/api`,
      },
      {
        title: 'Set the replica count',
        language: 'bash',
        code: `kubectl scale deployment <name> --replicas=3
# or in the manifest:  spec.replicas: 3`,
      },
    ],
    tags: ['replicas', 'scaling'],
  },
  {
    id: 'itv-myk8s-44',
    level: 'intermediate',
    kind: 'scenario',
    prompt: 'What do you do if a Pod is getting heavy load and must remain healthy?',
    probing:
      'Whether you protect users first, then scale on the right metric, and remember scaling can amplify a bottleneck.',
    answer: [
      "I confirm request rate, latency, error rate, CPU, memory, concurrency, and how saturated any downstream dependency is. For an immediate fix, I scale out replicas if the workload is stateless and there's capacity, rate limit or load shed, cache, push work onto a queue, shift traffic, or roll back an inefficient change.",
      'I also make sure readiness and graceful termination are working and the node autoscaler has capacity to add.',
      'Longer term, I put the HPA on a metric that actually reflects load, set a minimum for headroom, cap the maximum based on what dependencies can handle, optimize startup time and image size, size requests and limits from load tests, use a PDB and spreading, and add connection pooling and a retry budget. KEDA works well for queue-based scaling.',
      'I also optimize the code, database, or cache directly, since scaling horizontally can just amplify a bottleneck instead of fixing it.',
      'I load-test both the traffic surge and a node failure, and measure HPA detection time, Pod and node Ready time, P95 latency, error rate, and cost. Alerts should fire before saturation actually becomes a problem, not after.',
      '- Use the Horizontal Pod Autoscaler (HPA) to add or remove replicas based on CPU, memory, or custom/external metrics — for example requests-per-second through the Prometheus Adapter, or KEDA for event-driven scaling.',
      "- Set proper resource requests and limits so the scheduler and HPA make good decisions.\n- Use the Cluster Autoscaler or Karpenter to add nodes when pods can't be scheduled.\n- Use readiness probes together with a PodDisruptionBudget to keep enough healthy replicas during scaling and rollouts.\n- Use the VPA to right-size single-instance workloads, and add caching or queues to reduce load.",
    ],
    code: [
      {
        title: 'Autoscale on CPU',
        language: 'bash',
        code: `kubectl autoscale deployment web --cpu-percent=70 --min=3 --max=20`,
      },
    ],
    tags: ['scaling', 'hpa', 'load'],
  },
  {
    id: 'itv-myk8s-45',
    level: 'advanced',
    kind: 'scenario',
    prompt:
      'HPA cannot scale Pods fast enough during a massive traffic surge. How do you handle it?',
    probing:
      'Whether you can mitigate a surge immediately and then fix scaling lag with leading metrics, headroom and faster startup.',
    answer: [
      "First, I protect the users: rate limiting or load shedding, caching, pushing work onto a queue, rolling back an inefficient release, and manually raising replicas if it's safe and there's capacity. Then I check the HPA's conditions and current metric, how delayed that metric is, `maxReplicas`, the requests, Pod startup and readiness, Pending events, the node autoscaler, and any downstream bottleneck.",
      'To prevent it next time, I raise the minimum replica count for headroom against sudden traffic, plan ahead for known peaks, and switch to a leading metric like queue depth or request concurrency through HPA or KEDA instead of a lagging one like CPU. I also tune the scale-up policy, optimize image pull and startup time, pre-provision nodes or use Karpenter, and make sure the database and cache can actually scale with it.',
      "I load-test the burst scenario and measure detection time, Pod Ready time, node provisioning time, error rate, latency, and cost. Adding more Pods can't fix a shared dependency that's already saturated.",
    ],
    followUps: [
      'Why is CPU a lagging metric for scaling?',
      'How would KEDA help with a queue-driven workload?',
    ],
    tags: ['hpa', 'keda', 'scaling'],
  },
  {
    id: 'itv-myk8s-46',
    level: 'advanced',
    kind: 'scenario',
    prompt:
      'Your cluster autoscaler is not scaling up even though Pods are Pending. What do you investigate?',
    probing:
      'Whether you know the autoscaler only adds nodes when a Pending Pod would fit a node-group template, and check the real constraint.',
    answer: [
      "The Cluster Autoscaler only scales up if a Pending Pod could actually schedule on a new node from a managed node group. So I check the Pod's `FailedScheduling` event and the autoscaler's own logs and status.",
      'Common causes are a node group already at its max size, a cloud quota or capacity limit, exhausted subnet IPs, requests bigger than any available node, a selector, affinity, or taint mismatch, a zonal PV or topology constraint, an unsupported architecture or missing GPU, an unrecognized node group, or an IAM or API failure.',
      "I work out whether any available node template would actually satisfy the Pod. Then I fix the real constraint, config, or capacity issue — I don't just raise the max node count blindly. After the fix, I measure the time from Pending to node provisioning, to node Ready, to Pod Ready, and I check that scale-down still respects safety, PDBs, and cost.",
      'A PDB mainly affects scale-down, not the initial scale-up. HPA also needs realistic requests, and the node autoscaler needs to respond fast enough for the actual demand.',
    ],
    followUps: [
      'How do you measure time from Pending to Pod Ready?',
      'How does a PDB affect scale-down?',
    ],
    tags: ['cluster autoscaler', 'pending'],
  },
  {
    id: 'itv-myk8s-47',
    level: 'advanced',
    kind: 'open',
    prompt:
      'Explain how Karpenter is different from Cluster Autoscaler. In 2026, why would you still choose Cluster Autoscaler?',
    probing:
      'Whether you know the architectural difference and can argue a context-based choice rather than "newer is better".',
    answer: [
      'Most candidates know Karpenter is newer and faster; few can explain the architectural difference and when Cluster Autoscaler is still the right choice.',
      '**Cluster Autoscaler** works with your existing node groups. If you have a node group of `m5.xlarge` instances, then when pods are pending for lack of capacity, it adds another `m5.xlarge` to that group.',
      'It can only add node types you have already configured. That means you must predict your workload in advance — a machine learning job that suddenly needs GPU cannot get a `p3.2xlarge` unless a node group with that type already exists; otherwise the pod stays `Pending`.',
      '**Karpenter** watches pending pods and reads their requirements directly — CPU, memory, GPU, architecture, spot or on-demand — then calls the AWS EC2 API to provision the exact right instance type. No predefined node groups, no waiting for a group to scale, and a node in under 60 seconds in most cases.',
      'Karpenter also does **consolidation**: when the cluster is underutilized it actively moves workloads off nodes it can terminate, so you are not paying for half-empty nodes idling at 3am.',
      'So why still use Cluster Autoscaler in 2026?',
      "- **You are not on EKS.** Karpenter's strongest support is on AWS; on GKE or AKS, Cluster Autoscaler is still the more mature, battle-tested option.\n- **Compliance and predictability.** Some regulated industries must know exactly which instance types run their workloads. A banking client restricted to approved, audited instance types cannot let Karpenter decide dynamically — they need a controlled, predefined node group managed by Cluster Autoscaler.\n- **Migration risk.** On a large existing cluster with complex node-group configuration, migrating to Karpenter is not zero risk. Many teams keep Cluster Autoscaler in production and run Karpenter experiments in lower environments first.",
      'The strong answer shows you understand both tools and can make a context-based decision — not just "Karpenter is newer so it must be better."',
    ],
    followUps: [
      'How does Karpenter consolidation interact with PodDisruptionBudgets?',
      'How would you restrict Karpenter to approved instance types?',
    ],
    tags: ['karpenter', 'cluster autoscaler', 'eks'],
  },
  {
    id: 'itv-myk8s-48',
    level: 'intermediate',
    kind: 'scenario',
    prompt: 'How do you troubleshoot Azure Kubernetes Service (AKS) scaling issues?',
    probing:
      'Whether you check autoscaler logs, VM quota and resource requests before scaling blindly on AKS.',
    answer: [
      'Check cluster autoscaler logs → Verify VM quotas in Azure → Ensure correct resource requests/limits.',
      '**Detailed interview approach:** First I decide whether the demand actually needs more Pods, bigger Pods, or more nodes. I look at request rate, latency, CPU and memory, throttling, Pending Pods, and dependency limits.',
      "HPA needs realistic resource requests or application metrics, and tested min/max and stabilization settings. The node autoscaler supplies capacity for whatever's unschedulable.",
      'For an immediate incident, I might safely scale with `kubectl scale deployment <name> --replicas=<n>` while I investigate the actual traffic or performance cause.',
      'I verify readiness, load distribution, scaling events, dependency health, a graceful scale-down, and cost. Load tests and capacity alerts are what prove the whole path works before the next real peak.',
    ],
    tags: ['aks', 'autoscaling'],
  },
  {
    id: 'itv-myk8s-49',
    level: 'intermediate',
    kind: 'open',
    prompt: 'How do you perform rolling updates and rollbacks in Kubernetes?',
    probing:
      'Whether you understand maxSurge and maxUnavailable, watch the rollout, and know what a rollback cannot undo.',
    answer: [
      'I change the versioned manifest or image digest and apply it through CI or GitOps. The Deployment creates a new ReplicaSet and scales it up according to `maxSurge` and `maxUnavailable`. I watch it happen:',
      "I check the Pods, events, readiness, and the application's own error rate, latency, and smoke tests. If something regresses, I pause or roll back with `kubectl rollout undo deploy/api --to-revision=N`, or a Git revert or Helm rollback, and then validate.",
      "A rollback might not undo a ConfigMap change, an external system change, or a database change. That's why releases use immutable config and artifacts, and backward-compatible migrations. Whatever failed gets its evidence preserved and fixed before I try the rollout again.",
      'Kubernetes performs rolling updates using the **Deployment** resource, which allows you to update your application without downtime by gradually replacing old pods with new ones. You can specify the update strategy and parameters in the Deployment YAML file.',
      '**Example Deployment YAML for a rolling update:** To perform a rolling update, update the image version in the Deployment YAML (e.g., change `my-app:1.0.0` to `my-app:1.1.0`) and apply the changes using `kubectl apply -f deployment.yaml`.',
      'Kubernetes will then:',
      '1. Create new pods with the updated image.\n2. Gradually terminate old pods while ensuring that the specified number of replicas is maintained.\n3. Use `maxUnavailable` and `maxSurge` settings to control the pace of the update, ensuring zero downtime.',
      'You can monitor the update process using:',
      '**Additional features for zero downtime:**',
      "- Use **readiness probes** to ensure traffic isn't sent to unready Pods.\n- The Kubernetes **Service** handles load balancing across old and new Pods during rollout.\n- Supports **canary** or **blue-green** strategies if you want finer control.\n- Supports **pause/resume** rollout (`kubectl rollout pause/resume`) for manual approval.",
      'A Deployment rolling update gradually scales a new ReplicaSet up while scaling the old one down. `maxSurge` and `maxUnavailable` control capacity during the rollout.',
      'For low-risk updates:',
      '- Use multiple replicas across nodes/zones.\n- Define realistic readiness and startup probes.\n- Set resource requests.\n- Use a PodDisruptionBudget and graceful shutdown.\n- Configure `preStop` and sufficient termination grace where needed.\n- Monitor the rollout and application metrics.\n- Keep a tested rollback method.',
      'If a Deployment is updated again during an active rollout, Kubernetes creates or uses a ReplicaSet for the newest Pod template and converges toward that latest state.',
      'Blue-green and canary releases can be implemented with Services, multiple Deployments, Ingress/service-mesh routing, or progressive-delivery tools.',
    ],
    code: [
      {
        title: 'Diff, apply and watch a rollout',
        language: 'bash',
        code: `kubectl diff -f deployment.yaml
kubectl apply -f deployment.yaml
kubectl rollout status deploy/api --timeout=5m
kubectl rollout history deploy/api`,
      },
      {
        title: 'Deployment with a RollingUpdate strategy',
        language: 'yaml',
        code: `apiVersion: apps/v1
kind: Deployment
metadata:
  name: my-app
spec:
  replicas: 3
  strategy:
    type: RollingUpdate
    rollingUpdate:
      maxUnavailable: 0   # Number of pods that can be unavailable during the update
      maxSurge: 1         # Number of extra pods that can be created temporarily during the update
  selector:
    matchLabels:
      app: my-app
  template:
    metadata:
      labels:
        app: my-app
    spec:
      containers:
      - name: my-app-container
        image: my-app:1.0.0`,
      },
      {
        title: 'Monitor the rollout',
        language: 'bash',
        code: `kubectl rollout status deployment my-app
kubectl get pods -o wide`,
      },
      {
        title: 'Roll back',
        language: 'bash',
        code: `kubectl rollout undo deployment my-app`,
      },
    ],
    tags: ['rolling updates', 'rollback', 'deployments'],
  },
  {
    id: 'itv-myk8s-50',
    level: 'advanced',
    kind: 'scenario',
    prompt:
      'An application upgrade caused downtime even with rolling updates. How do you prevent it next time?',
    probing:
      'Whether you can find the real cause of rollout downtime (probes, SIGTERM, capacity, schema) instead of blaming the strategy.',
    answer: [
      'I line up the rollout timeline against endpoints, readiness, termination, capacity, errors, and any database or dependency change. Common causes are running only one replica, readiness firing too early or checking the wrong thing, a liveness probe killing the app mid-startup, `maxUnavailable` set too aggressively with no surge capacity, the app ignoring SIGTERM, load-balancer propagation delay, an incompatible config, schema, or API change, or simply not enough resources.',
      "The fix usually involves multiple replicas spread across nodes, a startup and readiness probe tuned from measured timings, `maxUnavailable: 0` where there's capacity for it, a preStop hook with a real termination grace period and connection draining, a PDB for maintenance windows, and a backward-compatible expand-and-contract approach to schema changes. CI runs smoke tests and canary health gates with a rollback path.",
      'I reproduce the failure in a load test and measure how many requests actually get dropped during the rollout. Zero downtime is an end-to-end architecture decision, not just a Deployment strategy setting.',
    ],
    followUps: [
      'What does a preStop hook buy you during a rollout?',
      'How do you measure dropped requests during a deployment?',
    ],
    tags: ['zero downtime', 'rolling updates', 'incidents'],
  },
  {
    id: 'itv-myk8s-51',
    level: 'intermediate',
    kind: 'open',
    prompt: 'How do you ensure zero downtime deployment in Kubernetes?',
    probing:
      'Whether you combine RollingUpdate, probes, graceful shutdown and spare capacity rather than trusting the strategy alone.',
    answer: [
      'Use RollingUpdate strategy in deployments, configure readiness probes, and keep replicas running until new pods are healthy.',
      '**Detailed interview approach:** I use a Deployment strategy with realistic readiness and startup probes, a graceful shutdown, and enough spare capacity. I pick `maxUnavailable` and `maxSurge` based on the replica count and the availability target — setting zero unavailable only makes sense if the cluster can actually host the surge capacity that requires.',
      'I deploy an immutable image digest, watch `kubectl rollout status`, Pod events, error rate, latency, and business checks, and pause if the new ReplicaSet looks unhealthy. A rollback uses `kubectl rollout undo deployment/<name>`, or a Git revert in GitOps, followed by verification.',
      'PodDisruptionBudgets, spreading across multiple zones, backward-compatible configuration and database changes, and an actually-tested rollback path are what make an update genuinely low-risk.',
    ],
    tags: ['zero downtime', 'rolling updates'],
  },
  {
    id: 'itv-myk8s-52',
    level: 'intermediate',
    kind: 'open',
    prompt: 'How do you achieve blue-green deployments in Kubernetes?',
    probing:
      'Whether you can run two versions side by side, switch the selector or route, and plan capacity and data compatibility.',
    answer: [
      'I run Blue, the current version, and Green, the candidate, as two separate Deployments with distinct version labels. A stable production Service or Ingress route points at Blue.',
      'I deploy Green, test it through a preview Service or hostname, including dependency and data compatibility, and then atomically switch the Service selector or traffic route over to it. I monitor the switch, and I can switch back for a fast rollback since Blue is still running.',
      "I make sure there's enough capacity for both at once, and check sessions, caching, background jobs, database schema compatibility, and that there are no duplicate consumers of the same queue or resource. The Service selector switch itself is fast, but I still watch endpoint and load-balancer propagation. A weighted route can ramp traffic more gradually if needed.",
      "Once I'm confident, I remove Blue and the old resources, with approval. The pipeline records the versions involved, and automated synthetic checks and SLO gates back the decision. Any destructive database migration waits until the rollback window has closed.",
      'Run two environments (Blue = current, Green = new) → Route traffic to Green only after successful validation → Rollback to Blue if issues occur.',
      '**Detailed interview approach:** I use a Deployment strategy with realistic readiness and startup probes, a graceful shutdown, and enough spare capacity. I pick `maxUnavailable` and `maxSurge` based on the replica count and the availability target — setting zero unavailable only makes sense if the cluster can actually host the surge capacity that requires.',
      'I deploy an immutable image digest, watch `kubectl rollout status`, Pod events, error rate, latency, and business checks, and pause if the new ReplicaSet looks unhealthy. A rollback uses `kubectl rollout undo deployment/<name>`, or a Git revert in GitOps, followed by verification.',
      'PodDisruptionBudgets, spreading across multiple zones, backward-compatible configuration and database changes, and an actually-tested rollback path are what make an update genuinely low-risk.',
    ],
    tags: ['blue-green', 'deployments'],
  },
  {
    id: 'itv-myk8s-53',
    level: 'intermediate',
    kind: 'open',
    prompt: 'How do you perform Canary Deployment in Kubernetes?',
    probing:
      'Whether you can shift a small share of traffic with a mesh or ingress and promote or roll back on metrics.',
    answer: [
      'Deploy a new version to a small % of users → Use Istio/NGINX Ingress for traffic routing → Gradually increase traffic → Rollback if errors.',
      '**Detailed interview approach:** I use a Deployment strategy with realistic readiness and startup probes, a graceful shutdown, and enough spare capacity. I pick `maxUnavailable` and `maxSurge` based on the replica count and the availability target — setting zero unavailable only makes sense if the cluster can actually host the surge capacity that requires.',
      'I deploy an immutable image digest, watch `kubectl rollout status`, Pod events, error rate, latency, and business checks, and pause if the new ReplicaSet looks unhealthy. A rollback uses `kubectl rollout undo deployment/<name>`, or a Git revert in GitOps, followed by verification.',
      'PodDisruptionBudgets, spreading across multiple zones, backward-compatible configuration and database changes, and an actually-tested rollback path are what make an update genuinely low-risk.',
    ],
    tags: ['canary', 'deployments'],
  },
  {
    id: 'itv-myk8s-54',
    level: 'intermediate',
    kind: 'scenario',
    prompt: 'How do you handle a failed deployment in Kubernetes?',
    probing:
      'Whether you diagnose with describe and logs, roll back quickly when critical, and fix before redeploying.',
    answer: [
      'Use kubectl describe pod and kubectl logs to check errors → If critical, rollback with kubectl rollout undo deployment <name> → Fix and redeploy.',
      '**Detailed interview approach:** I use a Deployment strategy with realistic readiness and startup probes, a graceful shutdown, and enough spare capacity. I pick `maxUnavailable` and `maxSurge` based on the replica count and the availability target — setting zero unavailable only makes sense if the cluster can actually host the surge capacity that requires.',
      'I deploy an immutable image digest, watch `kubectl rollout status`, Pod events, error rate, latency, and business checks, and pause if the new ReplicaSet looks unhealthy. A rollback uses `kubectl rollout undo deployment/<name>`, or a Git revert in GitOps, followed by verification.',
      'PodDisruptionBudgets, spreading across multiple zones, backward-compatible configuration and database changes, and an actually-tested rollback path are what make an update genuinely low-risk.',
    ],
    tags: ['deployments', 'rollback'],
  },
  {
    id: 'itv-myk8s-55',
    level: 'intermediate',
    kind: 'open',
    prompt: 'How do you implement rollback in Azure Kubernetes Service (AKS)?',
    probing:
      'Whether you know kubectl rollout undo and helm rollback, and that a rollback cannot undo a destructive schema change.',
    answer: [
      'Use kubectl rollout undo for deployments, or Helm rollback (helm rollback release name ).',
      '**Detailed interview approach:** I deploy an immutable artifact through a strategy matched to the risk involved: rolling for routine stateless changes, canary for metric-based exposure, or blue-green for a fast traffic switch.',
      'The pipeline runs prechecks, deploys to a small or no-traffic target, runs readiness and business smoke tests, and then advances while watching error rate, latency, saturation, and the SLO or error budget.',
      "If a threshold fails, it stops traffic and rolls back to the previous artifact or config. Database changes use an expand-and-contract approach, since an application rollback can't undo a destructive schema change. I verify recovery, record the result, and improve whatever test or guard should have caught the failure earlier.",
    ],
    tags: ['aks', 'rollback', 'helm'],
  },
  {
    id: 'itv-myk8s-56',
    level: 'intermediate',
    kind: 'open',
    prompt: 'Do you update only images or also replicas, storage, and CPU?',
    probing:
      'Whether you treat a deployment as the full desired state, not just the image, and respect immutable storage fields.',
    answer: [
      'I manage the whole desired state, not just the image: the image digest, replicas and HPA, requests and limits, probes, config and Secret references, the security context, Service, Ingress, and policy, volumes, and annotations. Each of these carries its own risk and needs its own validation.',
      'Changing the image, config, or resources rolls the Pods, so I verify the rollout, capacity, and performance afterward. Manually changing replicas can fight with HPA or GitOps trying to set it back.',
      "Some StorageClass and PVC fields are immutable, and need proper data migration, expansion, topology, or backup work instead — I never casually edit a stateful volume. Changing a Service's selector or port can cause an outage on its own.",
      'Every change flows through a Git diff, render, schema, and policy checks, a lower environment first, then a progressive rollout to production, SLO verification, and a rollback or recovery path. "Deployment" really means configuration plus artifact together, not just the image.',
    ],
    tags: ['deployments', 'configuration'],
  },
  {
    id: 'itv-myk8s-57',
    level: 'basic',
    kind: 'open',
    prompt: 'How do you stop a Pod in Kubernetes?',
    probing:
      'Whether you know there is no stop state for a Pod and that you stop a workload through its controller.',
    answer: [
      'There\'s no normal "stop and keep" state for a Pod in Kubernetes. Deleting it terminates it, and its controller just recreates it if the desired replica count still says it should exist.',
      "To actually stop a workload, you change its owner instead: scale a Deployment or StatefulSet to zero if that's safe, suspend a CronJob, or delete or update the controller through Git or IaC.",
      "Before stopping anything in production, I check the traffic it's handling, its PDB, any state or background work it holds, graceful termination, and get approval. For a single unhealthy Pod, deleting it is only a diagnostic step or a fix after I've already captured logs and evidence — then I validate the replacement.",
      'GitOps can revert a manual scale-down on its own, so I either update the actual source of truth or use an approved, temporary override instead.',
      'If a Deployment manages the pod, deleting the pod alone just triggers a replacement. To actually stop the workload, scale the Deployment to zero replicas or delete the Deployment itself.',
    ],
    code: [
      {
        title: 'Find the owner and scale to zero',
        language: 'bash',
        code: `kubectl get pod <pod> -o jsonpath='{.metadata.ownerReferences}'
kubectl scale deploy/api --replicas=0`,
      },
      {
        title: 'Delete, scale to zero, or remove the workload',
        language: 'bash',
        code: `kubectl delete pod <name>            # deletes; a controller (Deployment/RS) recreates it
kubectl scale deploy <name> --replicas=0   # actually stop the workload
kubectl delete deploy <name>         # remove workload entirely`,
      },
    ],
    tags: ['pods', 'kubectl'],
  },
  {
    id: 'itv-myk8s-58',
    level: 'intermediate',
    kind: 'open',
    prompt:
      'How can you ensure high availability for an application deployed in a Kubernetes cluster?',
    probing:
      'Whether you can list the layers of application HA: replicas, spreading, PDBs, probes, resources and autoscaling.',
    answer: [
      'I layer these strategies to keep an application highly available:',
      'Implement these strategies:',
      '- **Multiple replicas:** Use a Deployment with `replicas > 1`.\n- **Pod Disruption Budgets:** Ensure a minimum number of pods during updates.\n- **Anti-affinity rules:** Spread pods across nodes/zones.\n- **Health checks:** Configure readiness and liveness probes.\n- **Resource limits:** Set appropriate requests and limits.\n- **Multi-zone deployment:** Use node affinity for zone distribution.\n- **Horizontal Pod Autoscaler:** Scale based on metrics.\n- **Rolling updates:** Zero-downtime deployments.',
    ],
    tags: ['high availability', 'resilience'],
  },
  {
    id: 'itv-myk8s-59',
    level: 'intermediate',
    kind: 'open',
    prompt: 'How do you manage Kubernetes CronJobs efficiently?',
    probing:
      'Whether you set concurrency, deadlines, history and idempotency deliberately and alert on the last successful run.',
    answer: [
      'Set concurrency policy → Use resource limits → Monitor with Prometheus alerts → Clean up old jobs.',
      "**Detailed interview approach:** I set the schedule, timezone, service account, resource requests and limits, deadline, retry behavior, and history retention deliberately. `concurrencyPolicy: Forbid` prevents overlapping runs of work that isn't safe to run twice at once, while `Replace` only makes sense if a new run should just cancel the old one.",
      "Jobs are idempotent, and use a database or distributed lock whenever duplicate execution would actually cause harm. I check the CronJob and Job Events and logs, missed schedules, the controller's clock, image pulls, quota, and dependency errors.",
      'Success is a business result, not just a completed Pod, so I alert on the last successful timestamp and duration. `ttlSecondsAfterFinished` and history limits clean up old Jobs without deleting evidence I still need for audit.',
    ],
    tags: ['cronjob', 'jobs'],
  },
]
