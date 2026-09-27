import type { InterviewQuestion } from '../../../types'

/** Kubernetes deep dives: Ingress, NetworkPolicy, core objects, Service types, operations, autoscaling, StatefulSets and HA. */
export const myStudyPlatformKubernetesQuestions: InterviewQuestion[] = [
  {
    id: 'itv-mystpl-1',
    level: 'basic',
    kind: 'open',
    prompt: 'What are Ingress and DNS (CoreDNS) in Kubernetes?',
    probing:
      'Whether you know Ingress is only rules that need a controller, and how Service DNS names resolve.',
    answer: [
      '**Key points about Ingress and DNS:**',
      '- Ingress defines HTTP/HTTPS routing rules and requires an Ingress controller.\n- CoreDNS provides cluster DNS.\n- Troubleshoot routing from the inside out: Pod readiness, endpoint slices, Service selectors and ports, DNS, Ingress rules/controller, then load balancer and firewall.',
      '**What is a Kubernetes Ingress?**',
      '- Ingress manages external HTTP/HTTPS access to applications running inside the Kubernetes cluster.\n- Instead of exposing every application with a separate LoadBalancer, Ingress lets you route traffic based on the host name or URL path.\n- Ingress itself is just a set of routing rules. To enforce those rules, you need an **Ingress Controller** such as NGINX Ingress Controller, Azure Application Gateway Ingress Controller (AGIC), or Traefik.',
      '**What is DNS (CoreDNS)?**',
      '- Kubernetes uses CoreDNS as its internal DNS server.\n- It allows Pods and Services to communicate using names instead of IP addresses.\n- For example, a Pod can access a Service using `orders-service.default.svc.cluster.local` instead of remembering its IP.',
    ],
    tags: ['kubernetes', 'ingress', 'dns'],
  },
  {
    id: 'itv-mystpl-2',
    level: 'intermediate',
    kind: 'open',
    prompt: 'What is a Kubernetes NetworkPolicy, and how does default-deny work?',
    probing:
      'Whether you know traffic is allowed until a policy selects a Pod, and that DNS must be allowed explicitly after default-deny.',
    answer: [
      'NetworkPolicy restricts Pod ingress and egress when supported by the CNI plugin.',
      '- With no selecting policy, traffic is allowed by default.\n- A policy isolates a selected Pod only for the directions listed in `policyTypes` or inferred from its rules.\n- To deny all egress, select the Pods, include `Egress` in `policyTypes`, and provide no allowed egress rules.\n- Use default-deny policies and add explicit allows for DNS and required application flows.',
    ],
    tags: ['kubernetes', 'networkpolicy', 'security'],
  },
  {
    id: 'itv-mystpl-3',
    level: 'basic',
    kind: 'open',
    prompt:
      'What is the difference between a ConfigMap, a Secret, a ServiceAccount and a Namespace?',
    probing:
      'Whether you can separate configuration, sensitive data, workload identity and logical isolation in one breath.',
    answer: [
      '**Quick definitions:**',
      '- **ConfigMap:** non-sensitive configuration.\n- **Secret:** sensitive data; base64 encoding is not encryption.\n- **ServiceAccount:** workload identity within the Kubernetes API.\n- **Namespace:** logical isolation and scope for namespaced resources.',
      '**Difference table: purpose and contents**',
      '- **ConfigMap**: Purpose: Store non-sensitive configuration; Contains: URLs, ports, feature flags\n- **Secret**: Purpose: Store sensitive data; Contains: Passwords, API keys, certificates\n- **ServiceAccount**: Purpose: Identity for pods; Contains: Authentication to Kubernetes API\n- **Namespace**: Purpose: Logical isolation; Contains: Groups and isolates resources',
      '**One-line interview summary**',
      "- **ConfigMap** -> stores non-sensitive configuration.\n- **Secret** -> stores sensitive data; Base64 encoding is not encryption.\n- **ServiceAccount** -> provides a pod's identity to access the Kubernetes API.\n- **Namespace** -> logically isolates resources within a cluster for different teams or environments.",
    ],
    tags: ['kubernetes', 'configmap', 'secrets', 'namespaces'],
  },
  {
    id: 'itv-mystpl-4',
    level: 'basic',
    kind: 'open',
    prompt: 'What is a ConfigMap?',
    probing:
      'Whether you know ConfigMaps hold non-sensitive config and the ways a Pod can consume them.',
    answer: [
      '"A ConfigMap is used to store non-sensitive configuration data separately from the application. This allows us to change configuration without rebuilding the container image."',
      'Examples of data stored in a ConfigMap:',
      '- Application URLs\n- Port numbers\n- Feature flags\n- Environment names\n- Log levels',
      'The application can consume this as environment variables, mounted files, or command-line arguments.',
    ],
    code: [
      {
        title: 'ConfigMap',
        language: 'yaml',
        code: `apiVersion: v1
kind: ConfigMap
metadata:
  name: app-config
data:
  APP_ENV: production
  LOG_LEVEL: info`,
      },
    ],
    tags: ['kubernetes', 'configmap'],
  },
  {
    id: 'itv-mystpl-5',
    level: 'intermediate',
    kind: 'open',
    prompt: 'What is a Kubernetes Secret, and is it encrypted?',
    probing:
      'Whether you know base64 is encoding, not encryption, and how production clusters actually protect Secrets.',
    answer: [
      '"A Secret stores sensitive information such as passwords, API keys, database credentials, and certificates. Kubernetes stores Secret values as Base64-encoded data, but Base64 is only an encoding mechanism, not encryption. For stronger security, Secrets should be encrypted at rest and integrated with external secret managers like Azure Key Vault or HashiCorp Vault."',
      'The pod can consume the Secret as environment variables or mounted files.',
      '**Follow-up: Is a Kubernetes Secret encrypted?**\n"By default, Secret values are Base64 encoded, which is not secure because anyone can decode them. In production, we enable encryption at rest in etcd and often integrate Kubernetes with Azure Key Vault or another external secrets manager."',
    ],
    code: [
      {
        title: 'Secret',
        language: 'yaml',
        code: `apiVersion: v1
kind: Secret
metadata:
  name: db-secret
type: Opaque
data:
  password: cGFzc3dvcmQ=`,
      },
    ],
    tags: ['kubernetes', 'secrets', 'security'],
  },
  {
    id: 'itv-mystpl-6',
    level: 'intermediate',
    kind: 'open',
    prompt: 'What is a ServiceAccount, and why not use the default one?',
    probing: 'Whether you tie ServiceAccounts to RBAC and least privilege.',
    answer: [
      '"A ServiceAccount provides an identity for a pod when it communicates with the Kubernetes API. Instead of using a user\'s credentials, applications running inside pods use a ServiceAccount to authenticate and authorize API requests." Examples:',
      '- Reading ConfigMaps\n- Listing Pods\n- Accessing Secrets (if permitted)\n- Interacting with the Kubernetes API',
      'A ServiceAccount works together with RBAC (Role and RoleBinding) to define what actions the pod is allowed to perform.',
      '**Follow-up: Why not use the default ServiceAccount?**\n"The default ServiceAccount often has broader permissions than required. Following the principle of least privilege, I create dedicated ServiceAccounts with only the permissions the application needs."',
    ],
    code: [
      {
        title: 'ServiceAccount',
        language: 'yaml',
        code: `apiVersion: v1
kind: ServiceAccount
metadata:
  name: app-sa`,
      },
      {
        title: 'Assign it to a pod',
        language: 'yaml',
        code: `spec:
  serviceAccountName: app-sa`,
      },
    ],
    tags: ['kubernetes', 'serviceaccount', 'rbac'],
  },
  {
    id: 'itv-mystpl-7',
    level: 'basic',
    kind: 'open',
    prompt: 'What is a Namespace, and can two namespaces have Pods with the same name?',
    probing: 'Whether you understand namespaces as a naming and policy scope inside one cluster.',
    answer: [
      '"A Namespace is a logical partition within a Kubernetes cluster. It isolates resources, allowing multiple teams or environments to share the same cluster without resource name conflicts."',
      'Each namespace can have its own Pods, Services, ConfigMaps, Secrets, resource quotas and RBAC policies.',
      '**Follow-up: Can two namespaces have pods with the same name?**\nYes.',
      'These are different resources because they belong to different namespaces.',
    ],
    code: [
      {
        title: 'Namespaces: For example',
        language: 'text',
        code: `Cluster
│
├── dev
│     ├── pods
│     ├── services
│
├── test
│     ├── pods
│     ├── services
│
└── prod
      ├── pods
      ├── services`,
      },
      {
        title: 'Follow-up: Can two namespaces have pods with the same name?',
        language: 'text',
        code: `dev/nginx
prod/nginx`,
      },
    ],
    tags: ['kubernetes', 'namespaces'],
  },
  {
    id: 'itv-mystpl-8',
    level: 'intermediate',
    kind: 'open',
    prompt: 'What are the Kubernetes Service types, and which do you use in AKS?',
    probing:
      'Whether you know all five types, where each is reachable from, and sensible production choices in AKS.',
    answer: [
      '**Quick definitions:**',
      '- **ClusterIP:** stable internal virtual IP; the default Service type.\n- **NodePort:** exposes a port on every node and forwards to the Service.\n- **LoadBalancer:** requests an external or internal cloud load balancer.\n- **ExternalName:** returns a configured external DNS name.\n- **Headless Service:** uses `clusterIP: None` for direct endpoint discovery.\n- `port` is the Service port, `targetPort` is the destination Pod port, and `nodePort` is the optional port exposed on cluster nodes.',
      '**ClusterIP Service**\n"ClusterIP is the default Kubernetes Service type. It exposes an application only inside the cluster using a stable virtual IP. Other pods can access the application through the Service, but it isn\'t reachable from outside the cluster."',
      '**Use cases:** database services, internal APIs, backend microservices.',
      '**NodePort Service**\n"NodePort exposes the application on a fixed port on every Kubernetes node. Traffic received on that port is forwarded to the Service and then to the target pods."',
      '**Use cases:** testing, development environments, labs.',
      '**LoadBalancer Service**\n"A LoadBalancer Service creates a cloud load balancer in providers like Azure, AWS, or GCP. It exposes the application externally and distributes traffic across healthy pods."',
      '**Use case:** production web applications and APIs.',
      '**ExternalName Service**\n"ExternalName doesn\'t create a proxy or load balance traffic. Instead, it maps a Kubernetes Service to an external DNS name using a DNS CNAME record."',
      'Applications connect to: `mysql.default.svc.cluster.local` which resolves to: `mysql.company.com`',
      '**Use case:** accessing external databases or third-party services without changing application code.',
      '**Headless Service**\n"A Headless Service is created by setting `clusterIP: None`. Kubernetes doesn\'t assign a virtual IP. Instead, DNS returns the IP addresses of the individual pods, allowing clients to communicate directly with them."',
      '**Use cases:** StatefulSets, databases, Kafka, Cassandra, Elasticsearch.',
      '**Follow-up: which Service type do you use in AKS?**\n"For internal communication between microservices, I use ClusterIP because it keeps services accessible only within the cluster. For production applications that need internet access, I use LoadBalancer, which provisions an Azure Load Balancer automatically. I rarely use NodePort in production because it exposes ports directly on every node and is mainly useful for testing or when an external load balancer isn\'t available."\n**Quick comparison**',
      '- **ClusterIP**: Accessible From: Inside the cluster only; Common Use: Internal microservices\n- **NodePort**: Accessible From: External via NodeIP:Port; Common Use: Development and testing\n- **LoadBalancer**: Accessible From: Internet or internal cloud load balancer; Common Use: Production applications\n- **ExternalName**: Accessible From: External DNS name; Common Use: External databases or APIs\n- **Headless**: Accessible From: Direct pod IPs via DNS; Common Use: StatefulSets and databases',
      '**One-line interview summary**',
      '- **ClusterIP** -> internal communication within the cluster.\n- **NodePort** -> exposes the application on a port of every node.\n- **LoadBalancer** -> creates a cloud load balancer for external access.\n- **ExternalName** -> maps a Service to an external DNS name.\n- **Headless Service** -> no virtual IP; DNS returns individual pod IPs for direct access.',
    ],
    code: [
      {
        title: 'ClusterIP Service',
        language: 'text',
        code: `Pod A ----> ClusterIP Service ----> Pod B`,
      },
      {
        title: 'NodePort Service',
        language: 'text',
        code: `Client
   |
NodeIP:30080
   |
NodePort Service
   |
Pods`,
      },
      {
        title: 'NodePort Service (2)',
        language: 'yaml',
        code: `spec:
  type: NodePort
  ports:
  - port: 80
    targetPort: 8080
    nodePort: 30080`,
      },
      {
        title: 'LoadBalancer Service',
        language: 'text',
        code: `Internet
    |
Azure Load Balancer
    |
Kubernetes Service
    |
Pods`,
      },
      {
        title: 'ExternalName Service',
        language: 'yaml',
        code: `apiVersion: v1
kind: Service
metadata:
  name: mysql
spec:
  type: ExternalName
  externalName: mysql.company.com`,
      },
      {
        title: 'Headless Service',
        language: 'yaml',
        code: `spec:
  clusterIP: None`,
      },
      {
        title: 'Headless Service (2)',
        language: 'text',
        code: `Headless Service
        |
DNS
        |
Pod-0
Pod-1
Pod-2`,
      },
    ],
    tags: ['kubernetes', 'services', 'aks'],
  },
  {
    id: 'itv-mystpl-9',
    level: 'basic',
    kind: 'open',
    prompt: 'What is the difference between `port`, `targetPort` and `nodePort` in a Service?',
    probing:
      'Whether you can trace a request from the node port to the Service port to the container port.',
    answer: [
      'The three port fields in a Service manifest describe the hops a request takes, as in the sample below.',
      '- **port** -> the port exposed by the Kubernetes Service.\n- **targetPort** -> the port on which the container inside the pod is listening.\n- **nodePort** -> the port opened on every Kubernetes node (used only with NodePort or LoadBalancer Services).',
    ],
    code: [
      {
        title: 'Service ports',
        language: 'yaml',
        code: `ports:
- port: 80
  targetPort: 8080
  nodePort: 30080`,
      },
      {
        title: 'Service ports: Flow',
        language: 'text',
        code: `Client
   |
NodeIP:30080 (nodePort)
   |
Service:80 (port)
   |
Pod:8080 (targetPort)`,
      },
    ],
    tags: ['kubernetes', 'services', 'ports'],
  },
  {
    id: 'itv-mystpl-10',
    level: 'basic',
    kind: 'open',
    prompt: 'How do you view Pod logs, and what is your basic Pod troubleshooting sequence?',
    probing:
      'Whether you know the useful `kubectl logs` flags, especially `--previous` for crash loops.',
    answer: [
      'Use `kubectl logs` to read the output of an application running in a pod.',
      '- `kubectl logs <pod>`: Show the current logs of the default container\n- `kubectl logs <pod> -c <container>`: Show logs from one container in a multi-container pod\n- `kubectl logs -f <pod>`: Follow new log messages in real time; press `Ctrl+C` to stop\n- `kubectl logs <pod> --previous`: Show logs from the previous container instance after a restart\n- `kubectl logs -l app=web --tail=100`: Show the last 100 lines from pods with the label `app=web`\n- `kubectl logs <pod> --tail=50`: Show only the last 50 lines\n- `kubectl logs <pod> --since=30m`: Show logs from the last 30 minutes\n- `kubectl logs <pod> --timestamps`: Include a timestamp on each line\n- `kubectl logs <pod> --all-containers=true`: Show logs from every container in the pod\n- `kubectl logs <pod> -c app --previous`: Show previous logs for a specific container\n- `kubectl logs deployment/myapp`: Show logs from a pod managed by a Deployment\n- `kubectl logs job/my-job`: Show logs from a Job',
      '**Basic pod troubleshooting**\nThis can reveal application errors, container crashes, failed image pulls, scheduling problems, and resource shortages. For `CrashLoopBackOff`, previous logs are especially useful because they show what happened before the container restarted.',
    ],
    code: [
      {
        title: 'Run these commands in order',
        language: 'bash',
        code: `kubectl get pods
kubectl describe pod <pod-name>
kubectl logs <pod-name>
kubectl logs <pod-name> --previous
kubectl get events --sort-by=.metadata.creationTimestamp`,
      },
    ],
    tags: ['kubernetes', 'logs', 'kubectl'],
  },
  {
    id: 'itv-mystpl-11',
    level: 'intermediate',
    kind: 'open',
    prompt: 'How do you monitor AKS with Prometheus and Grafana?',
    probing:
      'Whether you understand the scrape-store-query-alert flow, the metric sources, and how to debug missing metrics.',
    answer: [
      '**How the monitoring flow works**',
      '1. The application exposes values such as request count, errors, memory use, and response time through a `/metrics` endpoint.\n2. Prometheus watches the Kubernetes API and discovers pods, services, endpoints, and nodes. New replicas can therefore be found automatically.\n3. Prometheus sends HTTP requests to each metrics endpoint at a configured interval, often every 15 to 30 seconds.\n4. It stores each metric with its timestamp, value, and labels in a time-series database.\n5. Grafana uses Prometheus as a data source. It runs PromQL queries and turns the results into graphs, tables, gauges, and other dashboard panels. Grafana does not collect the metrics itself.\n6. Prometheus evaluates alert rules. When a rule is true, Alertmanager groups, de-duplicates, and routes notifications to systems such as email, Microsoft Teams, Slack, or PagerDuty.',
      'Common dashboard and alert signals include:',
      '- CPU and memory use\n- Request rate and response time\n- HTTP error rate\n- Pod restarts and unavailable pods\n- Network and disk use\n- Node health',
      '**Kubernetes metric sources**',
      '- `kube-state-metrics`: State of pods, Deployments, nodes, PVCs, and other Kubernetes objects\n- `node-exporter`: Node CPU, memory, disk, filesystem, and network metrics\n- `cAdvisor`: Container CPU, memory, filesystem, and network metrics\n- **Kubelet and API server**: Node, pod, and Kubernetes API metrics\n- **CoreDNS**: DNS metrics',
      '**Installing the stack**\nIn production this is normally installed as a single Helm release rather than assembled component by component:',
      'This one chart typically brings in Prometheus, Grafana, Alertmanager, `kube-state-metrics`, and `node-exporter` together, pre-wired to scrape the cluster.',
      "**Troubleshooting missing metrics**\nIf a target's metrics aren't showing up in Grafana, work through it in order:",
      "1. **Check Prometheus Pods** - `kubectl get pods -n monitoring` to confirm Prometheus itself is running.\n2. **Check Prometheus Targets** - in the Prometheus UI, confirm the target shows as `UP`, not `DOWN`.\n3. **Confirm the `/metrics` endpoint** - `curl` the application's metrics port directly to confirm it's actually exposing data.\n4. **Check ServiceMonitor/PodMonitor** - confirm a `ServiceMonitor` or `PodMonitor` resource exists and its label selector actually matches the target Service/Pod.\n5. **Check NetworkPolicies/firewalls** - confirm nothing is blocking Prometheus from reaching the target's metrics port.\n6. **Review Prometheus logs** - scrape errors (TLS, auth, timeouts) usually show up here.",
    ],
    code: [
      {
        title: 'The monitoring flow is',
        language: 'text',
        code: `Application exposes /metrics
        ↓
Prometheus discovers the target through Kubernetes
        ↓
Prometheus regularly scrapes and stores the metrics
        ↓
Grafana queries Prometheus and displays dashboards
        ↓
Alertmanager sends notifications when rules are triggered`,
      },
      {
        title: 'Example PromQL queries',
        language: 'text',
        code: `rate(http_requests_total[5m])
sum(container_memory_usage_bytes)`,
      },
      {
        title: 'Installing the stack',
        language: 'bash',
        code: `helm install kube-prometheus-stack prometheus-community/kube-prometheus-stack \\
  --namespace monitoring \\
  --create-namespace`,
      },
    ],
    tags: ['aks', 'prometheus', 'grafana', 'monitoring'],
  },
  {
    id: 'itv-mystpl-12',
    level: 'intermediate',
    kind: 'open',
    prompt: 'How does autoscaling work in Kubernetes - HPA, VPA, Cluster Autoscaler and Karpenter?',
    probing:
      'Whether you know what each autoscaler changes, why requests matter for HPA, and how Pending Pods trigger node scaling.',
    answer: [
      'Kubernetes can scale at three levels:',
      '- **Horizontal Pod Autoscaler (HPA)**: What it changes: Number of pod replicas; Typical use: Stateless applications and workers\n- **Vertical Pod Autoscaler (VPA)**: What it changes: Pod CPU and memory requests; Typical use: Workloads that need better resource sizing\n- **Cluster Autoscaler**: What it changes: Number of worker nodes; Typical use: Pods cannot be scheduled because the cluster is full',
      '**Horizontal Pod Autoscaler**\nHPA adds or removes replicas based on CPU, memory, custom metrics, or external metrics.',
      'This keeps CPU use near 70%, with at least 3 and at most 20 replicas.',
      'Custom metrics can include requests per second, latency, and active users. A Prometheus Adapter can expose these metrics to Kubernetes. KEDA is commonly used for event-based scaling from sources such as Service Bus, Kafka, RabbitMQ, and storage queues.',
      'Resource requests must be set correctly because CPU-based HPA compares actual use with the requested CPU. Missing or unrealistic requests can produce poor scaling decisions. Limits provide an upper boundary but are not the basis of this utilization calculation.',
      '**Cluster Autoscaler and Karpenter**\nThe Cluster Autoscaler adds a worker node when pods are pending because no existing node has enough capacity. It can remove underused nodes when their pods can safely run elsewhere.',
      'Karpenter also provisions nodes for pending pods and can choose a suitable node size dynamically. It is commonly associated with AWS. AKS normally uses the Cluster Autoscaler.',
      '**Vertical Pod Autoscaler**\nVPA recommends or updates CPU and memory requests based on observed usage. Applying an update can require the pod to be recreated. VPA is useful when increasing the size of a pod is more suitable than adding replicas. Avoid letting VPA and HPA control the same CPU or memory signal without careful design.',
      '**Keeping scaling safe**',
      '- A readiness probe prevents traffic from reaching a new pod until it is ready.\n- A PodDisruptionBudget keeps a minimum number of replicas available during voluntary disruptions such as maintenance.\n- Caching reduces repeated work and database calls.\n- Queues absorb traffic bursts and let workers process jobs at a controlled rate.',
    ],
    code: [
      {
        title: 'The normal scale-up flow is',
        language: 'text',
        code: `Traffic increases
      ↓
HPA creates more pods
      ↓
Pods remain Pending if nodes are full
      ↓
Cluster Autoscaler adds a node
      ↓
The scheduler places the pending pods`,
      },
      {
        title: 'Horizontal Pod Autoscaler',
        language: 'bash',
        code: `kubectl autoscale deployment web --cpu-percent=70 --min=3 --max=20`,
      },
    ],
    tags: ['kubernetes', 'autoscaling', 'hpa'],
  },
  {
    id: 'itv-mystpl-13',
    level: 'advanced',
    kind: 'open',
    prompt: 'What is a StatefulSet, and what are the challenges of running stateful workloads?',
    probing:
      'Whether you know stable identity and per-Pod storage, and the real operational issues: zones, PVCs, backups, ordered updates.',
    answer: [
      'A StatefulSet manages applications that need stable identity or persistent storage, such as databases, Kafka, Elasticsearch, and ZooKeeper.\n**Main features**',
      '- Stable pod names such as `mysql-0`, `mysql-1`, and `mysql-2`\n- Predictable DNS names for communication between members\n- A separate persistent volume for each pod through `volumeClaimTemplates`\n- Ordered creation, scaling, deletion, and rolling updates by default',
      'If `mysql-1` is recreated, it keeps the same identity and reconnects to its own persistent volume. When scaling down, Kubernetes removes the highest-numbered pod first. Its PVC normally remains so that data is not accidentally lost.',
      '**Deployment compared with StatefulSet**',
      '- **Pod identity**: Deployment: Replaceable, usually with random suffixes; StatefulSet: Stable ordinal names\n- **Storage**: Deployment: Often ephemeral or shared; StatefulSet: Usually one persistent volume per pod\n- **Start and removal order**: Deployment: Usually parallel or unrestricted; StatefulSet: Ordered by default\n- **Common workloads**: Deployment: Web applications and APIs; StatefulSet: Databases and clustered data systems',
      '**Challenges and good practices**',
      "- Cloud disks may be tied to one availability zone. The pod must run on a node that can attach its disk, so plan zones, topology, and application-level replication.\n- Scaling down normally leaves PVCs behind. Review unused PVCs and delete them only after confirming that their data is no longer needed.\n- Ordered updates can be slow. Plan upgrades around the application's leader, replication, and quorum rules.\n- A persistent volume is not a backup. Use CSI volume snapshots and application-level backup tools, and regularly test restores.\n- Moving a pod after node failure requires the disk to detach and attach elsewhere, which can delay recovery.\n- Use a suitable StorageClass and CSI driver with dynamic provisioning.\n- Prefer a mature Kubernetes operator for complex databases when it can safely manage upgrades, backups, failover, and recovery.",
    ],
    followUps: [
      'Why would you prefer a database operator over a plain StatefulSet?',
      'How do you back up and restore a PVC with CSI snapshots?',
    ],
    tags: ['kubernetes', 'statefulset', 'storage'],
  },
  {
    id: 'itv-mystpl-14',
    level: 'intermediate',
    kind: 'open',
    prompt: 'What happens when you run `kubectl apply`?',
    probing:
      'Whether you can trace the request through the API Server, admission, etcd, controllers, scheduler and kubelet.',
    answer: [
      '`kubectl apply -f deployment.yaml`',
      '1. `kubectl` reads the YAML and prepares the API request.\n2. The request goes to the Kubernetes API Server.\n3. The API Server authenticates and authorizes the request.\n4. Admission controllers and validation are applied.\n5. The desired state is stored in `etcd`.\n6. Controllers reconcile the desired state - for a Deployment, the Deployment Controller creates or updates a ReplicaSet.\n7. The Scheduler assigns new Pods to suitable worker nodes.\n8. The Kubelet on the selected node asks the container runtime to pull the image and start the container.\n9. The CNI configures Pod networking.\n10. Readiness checks determine when the Pod can start receiving traffic.',
      '**Short interview answer**\n`kubectl apply` sends the manifest to the API Server, which authenticates the request, runs it through admission controllers, and persists the desired state in `etcd`. From there, the relevant controller (e.g. the Deployment Controller) reconciles that state into a ReplicaSet, the Scheduler places the resulting Pods on suitable nodes, and the Kubelet on each node pulls the image and starts the container - with the CNI wiring up networking and readiness checks gating when traffic actually starts flowing.',
    ],
    code: [
      {
        title: 'kubectl apply',
        language: 'text',
        code: `kubectl apply
  -> API Server
  -> etcd
  -> Deployment Controller
  -> ReplicaSet
  -> Scheduler
  -> Kubelet
  -> Container Runtime
  -> Pod Running`,
      },
    ],
    tags: ['kubernetes', 'architecture', 'kubectl'],
  },
  {
    id: 'itv-mystpl-15',
    level: 'intermediate',
    kind: 'open',
    prompt: 'How do rolling updates work, and what do `maxSurge` and `maxUnavailable` control?',
    probing:
      'Whether you understand how the two knobs trade rollout speed against spare capacity and availability.',
    answer: [
      'A Rolling Update is the default Deployment strategy: it replaces old Pods with new ones gradually, in batches, instead of stopping everything at once.',
      'Example: 4 Pods running `v1`, deploying `v2`:',
      '1. Kubernetes creates a `v2` Pod.\n2. It waits for the new Pod to become healthy (readiness probe passes).\n3. It removes an old `v1` Pod.\n4. It repeats until all Pods run `v2`.',
      '- `maxSurge` - the maximum number of extra Pods that can be created above the desired replica count during the update.\n- `maxUnavailable` - the maximum number of Pods that can be unavailable at once during the update.',
      'Tuning these controls the tradeoff between rollout speed and headroom: a higher `maxSurge` rolls out faster but briefly uses more cluster resources; a higher `maxUnavailable` rolls out faster but reduces how many healthy replicas are guaranteed at any moment.',
      '**Short interview answer**\nA Rolling Update gradually replaces old Pods with new ones, waiting for each new Pod to pass its readiness probe before removing an old one - so deployments happen with little or no downtime. `maxSurge` caps how many extra Pods can exist above the desired count during the rollout, and `maxUnavailable` caps how many Pods can be unavailable at once; together they control how aggressively the rollout proceeds.',
    ],
    code: [
      {
        title: 'Rolling update',
        language: 'yaml',
        code: `strategy:
  type: RollingUpdate
  rollingUpdate:
    maxSurge: 1
    maxUnavailable: 1`,
      },
    ],
    tags: ['kubernetes', 'deployments', 'rolling update'],
  },
  {
    id: 'itv-mystpl-16',
    level: 'basic',
    kind: 'open',
    prompt: 'What is the difference between `kubectl exec` and `kubectl run`?',
    probing:
      'Whether you know one enters an existing Pod and the other creates a new one - and the `--rm` debug pattern.',
    answer: [
      "**`kubectl exec`** - runs a command inside an existing Pod's container.",
      '`-it` attaches an interactive terminal; `-c` selects a specific container in a multi-container Pod.',
      '**`kubectl run`** - creates a new, standalone Pod, mainly for quick testing/debugging.',
      "The `--rm` flag in the `debug` example is worth calling out specifically - it deletes the Pod automatically once the interactive session ends, which is the standard pattern for a throwaway debug Pod that doesn't linger in the cluster.",
      "**Short interview answer**\n`kubectl exec` runs a command inside a Pod that's already running - useful for inspecting a live application. `kubectl run` creates a brand-new standalone Pod, which is mainly useful for spinning up a temporary debug/test Pod (often with `--rm` so it cleans itself up) rather than working with an existing workload.",
    ],
    code: [
      {
        title: 'kubectl exec',
        language: 'bash',
        code: `kubectl exec -it nginx-pod -- /bin/bash
kubectl exec -it nginx-pod -- /bin/sh
kubectl exec nginx-pod -- ls /app
kubectl exec nginx-pod -- env
kubectl exec -it nginx-pod -c app-container -- /bin/bash`,
      },
      {
        title: 'kubectl run',
        language: 'bash',
        code: `kubectl run nginx --image=nginx
kubectl run ubuntu --image=ubuntu -it -- /bin/bash
kubectl run debug --image=busybox -it --rm -- sh
kubectl run test --image=busybox -- sleep 3600`,
      },
    ],
    tags: ['kubernetes', 'kubectl', 'debugging'],
  },
  {
    id: 'itv-mystpl-17',
    level: 'basic',
    kind: 'open',
    prompt:
      'Summarise pod troubleshooting, AKS monitoring, autoscaling and StatefulSets in a short interview answer.',
    probing: 'Whether you can compress the core Kubernetes operations story into a crisp answer.',
    answer: [
      'For pod failures, inspect pod status, description, current and previous logs, and recent events. In AKS monitoring, applications expose metrics, Prometheus discovers and stores them, Grafana displays them, and Alertmanager routes alerts.',
      'HPA scales pods, Cluster Autoscaler scales nodes, and VPA adjusts pod resource requests. StatefulSets are used when pods need stable names and their own persistent storage, but they require careful planning for zones, backups, upgrades, and recovery.',
    ],
    tags: ['kubernetes', 'summary'],
  },
  {
    id: 'itv-mystpl-18',
    level: 'basic',
    kind: 'open',
    prompt: 'What is the difference between vertical and horizontal scaling in Kubernetes?',
    probing:
      'Whether you know which one HPA and VPA drive and why horizontal is usually preferred for stateless services.',
    answer: [
      '- **Vertical scaling**: Gives a pod more CPU or memory; **Horizontal scaling**: Adds more pod replicas\n- **Vertical scaling**: Also called scaling up; **Horizontal scaling**: Also called scaling out\n- **Vertical scaling**: Makes one pod more powerful; **Horizontal scaling**: Shares work across several pods\n- **Vertical scaling**: Often requires pod recreation; **Horizontal scaling**: Adds new pods while current pods keep running\n- **Vertical scaling**: Limited by the size of a node; **Horizontal scaling**: Can spread replicas across nodes\n- **Vertical scaling**: Useful for workloads that cannot use replicas; **Horizontal scaling**: Usually best for stateless APIs and web applications',
      '**Example**\nAn application starts with one pod using one CPU and 2 GB of memory.',
      'Vertical scaling changes it to one larger pod:',
      'Horizontal scaling keeps the same pod size but increases the count: `1 pod → 5 pods`',
      'A Kubernetes Service distributes traffic across the ready replicas.',
      '**HPA and VPA**\nThe Horizontal Pod Autoscaler (HPA) changes the number of replicas based on CPU, memory, custom, or external metrics.',
      'The Vertical Pod Autoscaler (VPA) recommends or updates pod CPU and memory requests. Applying an update can require the pod to be recreated.',
      'Horizontal scaling is usually preferred for stateless services because it improves availability and can grow beyond one node. Vertical scaling is useful for legacy, stateful, or single-instance applications that cannot easily share work across replicas.',
      '**Short interview answer**\nVertical scaling gives an existing pod more CPU or memory and is limited by node capacity. Horizontal scaling adds more replicas and normally uses HPA. Horizontal scaling is often preferred for stateless services because it provides better availability and fault tolerance, while VPA is useful when a workload benefits from a larger pod.',
    ],
    code: [
      {
        title: 'Vertical scaling changes it to one larger pod',
        language: 'text',
        code: `1 CPU → 4 CPUs
2 GB  → 8 GB`,
      },
    ],
    tags: ['kubernetes', 'scaling', 'hpa', 'vpa'],
  },
  {
    id: 'itv-mystpl-19',
    level: 'intermediate',
    kind: 'open',
    prompt: 'What is a service mesh, and what does it provide?',
    probing:
      'Whether you understand the sidecar model and what traffic, security and observability features come with it.',
    answer: [
      "A Service Mesh is an infrastructure layer that manages communication between microservices without requiring application code changes - the logic lives in a proxy sitting next to each service, not in the service's own code.",
      '**What it provides:**',
      '- **Traffic management** - routing, retries, load balancing, canary releases.\n- **Security** - mutual TLS (mTLS), authentication and authorization between services.\n- **Observability** - metrics, logs, distributed tracing across service calls.\n- **Resilience** - timeouts, circuit breakers, and fault injection for testing failure handling.',
      '**Common solutions:** Istio, Linkerd, Cilium.',
      '**Typical architecture:**\nEach service gets a sidecar proxy injected alongside it. Traffic between services goes through the proxies rather than directly - which is what lets the mesh apply mTLS, retries, and routing rules uniformly, without every application team implementing that logic themselves.',
      '**Short interview answer**\nA Service Mesh manages service-to-service communication using sidecar proxies instead of application code. It handles traffic routing, retries, timeouts, mTLS, and observability transparently - the application just makes a normal network call, and the mesh intercepts it to apply policy and collect telemetry.',
    ],
    code: [
      {
        title: 'Typical architecture',
        language: 'text',
        code: `Application Pod -> Sidecar Proxy -> Destination Sidecar -> Destination Application`,
      },
    ],
    tags: ['service mesh', 'istio', 'mtls'],
  },
  {
    id: 'itv-mystpl-20',
    level: 'advanced',
    kind: 'open',
    prompt: 'How do you secure container-to-container communication in Kubernetes?',
    probing:
      'Whether you layer network, identity, secret and Pod hardening controls instead of relying on one.',
    answer: [
      'Use multiple layers together - no single control is sufficient on its own:',
      "1. **Network Policies** - restrict which Pods can talk to which other Pods (see the NetworkPolicy question).\n2. **mTLS via a Service Mesh** - encrypts and authenticates traffic between services, so even Pods that can reach each other over the network still can't impersonate each other or read traffic in transit.\n3. **Kubernetes RBAC and Service Accounts** - controls what each workload is allowed to do against the Kubernetes API itself.\n4. **Namespaces** - isolate workloads logically, and are the scope boundary for NetworkPolicies and RBAC.\n5. **Kubernetes Secrets or Azure Key Vault** - for any credentials the services need to authenticate to each other or to shared dependencies.\n6. **Run containers as non-root and drop unnecessary Linux capabilities** - limits the blast radius if a container is compromised, even if network/identity controls are somehow bypassed.",
      '**Short interview answer**\nI layer several controls: Network Policies to restrict which Pods can reach which, mTLS through a service mesh to encrypt and authenticate the traffic that is allowed, RBAC and Service Accounts to control API access, namespaces for isolation, Key Vault or Kubernetes Secrets for credentials, and hardened Pod security settings - non-root, dropped capabilities - so a compromised container has as little to work with as possible even if it did get network access.',
    ],
    code: [
      {
        title: 'securityContext',
        language: 'yaml',
        code: `securityContext:
  runAsNonRoot: true
  capabilities:
    drop:
      - ALL`,
      },
    ],
    followUps: [
      'How would you roll out default-deny NetworkPolicies without breaking traffic?',
      'What does mTLS protect against that NetworkPolicy does not?',
    ],
    tags: ['kubernetes', 'security', 'networkpolicy', 'mtls'],
  },
  {
    id: 'itv-mystpl-21',
    level: 'advanced',
    kind: 'open',
    prompt:
      'How do you build a highly available Kubernetes cluster, and what happens when a worker node fails?',
    probing:
      'Whether you cover control plane quorum, zones, replicas, probes, PDBs, autoscaling and etcd backups.',
    answer: [
      "- **Multiple control plane nodes** - normally 3 or 5 (odd numbers, for etcd quorum).\n- **Distribute nodes across Availability Zones** - both control plane and worker nodes, so a single zone failure doesn't take down the cluster.\n- **Highly available etcd** - etcd is the cluster's source of truth; losing quorum on it is losing the cluster's ability to make any changes.\n- **Multiple application replicas** - so a single Pod or node failure doesn't cause an outage.\n- **Readiness and liveness probes** - so traffic only reaches healthy Pods, and unhealthy containers get restarted automatically.\n- **Rolling updates** with suitable `maxUnavailable`/`maxSurge` - see the rolling updates question for the full mechanics.\n- **Pod Disruption Budgets (PDBs)** - guarantee a minimum number of replicas stay available during voluntary disruptions like node maintenance.\n- **Load Balancer/Ingress** for traffic distribution.\n- **HPA and Cluster Autoscaler** - so capacity keeps pace with load.\n- **Back up etcd**, and keep the cluster's own definition as infrastructure as code, so the control plane itself is recoverable.",
      "**If a worker node fails**\nKubernetes marks the node `NotReady`, removes its Pods' endpoints from any Services routing to them, and schedules replacement Pods on healthy nodes. Because multiple replicas were already spread across nodes, traffic continues flowing through the surviving replicas while the replacements come up.",
      '**Short interview answer**\nHA in Kubernetes is a stack of measures working together: multiple control plane nodes with HA etcd spread across Availability Zones, multiple Pod replicas backed by readiness/liveness probes and PDBs, rolling updates tuned via `maxSurge`/`maxUnavailable`, HPA plus Cluster Autoscaler for capacity, and regular etcd backups. When a worker node fails, Kubernetes marks it `NotReady`, pulls its Pods out of Service endpoints, and reschedules them elsewhere - the surviving replicas keep serving traffic in the meantime.',
    ],
    followUps: [
      'Why does etcd need an odd number of members?',
      'How does a PodDisruptionBudget interact with node upgrades in AKS?',
    ],
    tags: ['kubernetes', 'high availability', 'aks'],
  },
]
