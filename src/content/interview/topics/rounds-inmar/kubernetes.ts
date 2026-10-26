import type { InterviewQuestion } from '../../../types'

/** Inmar round: Kubernetes and AKS questions. */
export const roundsInmarKubernetesQuestions: InterviewQuestion[] = [
  {
    id: 'itv-rinm-1',
    level: 'advanced',
    kind: 'scenario',
    prompt: 'If pods are OOMKilled, what is the issue, and what will you do to fix it?',
    probing:
      'Whether you can read exit code 137, separate a too-low limit from a leak or a traffic spike, and fix the cause rather than just adding memory.',
    answer: [
      '**OOMKilled** means "Out Of Memory Killed". The container tried to use **more memory than its memory limit**, so the Linux kernel killed it. Kubernetes then restarts the container, and if it keeps happening, the pod goes into `CrashLoopBackOff`.',
      '**How to confirm it**',
      '**Exit code 137** = the process was killed with signal 9 (`SIGKILL`), which is what the OOM killer sends.',
      'Then check the memory trend and the logs from before the crash:',
      'In Grafana or Azure Monitor, check `container_memory_working_set_bytes` for the pod: does memory jump suddenly (traffic spike) or grow slowly until it hits the limit (memory leak)?',
      '**Common causes**\n- **Cause**: Memory limit too low; **Example**: The app genuinely needs 1 GiB, but the limit is 512 MiB\n- **Cause**: JVM not aligned with the container limit; **Example**: Java heap (`-Xmx`) is set close to or above the container limit, leaving no room for non-heap memory\n- **Cause**: Memory leak; **Example**: Memory grows steadily over hours until the pod is killed\n- **Cause**: Traffic spike; **Example**: Too many requests per pod; each request holds data in memory\n- **Cause**: Large in-memory work; **Example**: Loading a full file or a big query result into memory',
      "**Not the same as eviction:** if the **node** runs out of memory, the kubelet **evicts** pods (status `Evicted`). OOMKilled is about the **container's own limit**.",
      '**How to fix**\n1. **Right-size the memory** based on real usage (monitoring or VPA recommendations), with some headroom:\n2. **Align the JVM with the container** (for Java apps). Let the JVM size the heap as a percentage of the container limit:\n3. **If it is a leak**, increasing memory only delays the crash. Take a heap dump, analyze it (Eclipse MAT, VisualVM), and fix the code (unclosed connections, caches without size limits, etc.).\n4. **If it is a traffic spike**, use HPA to add more pods so each pod handles less load.\n5. **Set alerts** on pod restarts and memory usage close to the limit, so you find out before users do.',
      '**Interview answer:** "OOMKilled means the container used more memory than its limit, so the kernel killed it, and we see exit code 137 in `kubectl describe pod`. I first check the memory trend in Grafana or Azure Monitor. If memory jumps with traffic, I scale out with HPA or increase the limit. If it grows slowly, it\'s probably a memory leak, so I take a heap dump and get the code fixed instead of just adding memory. For Java apps, I make sure the heap is sized with `MaxRAMPercentage` so the JVM stays within the container limit. Finally, I set the requests and limits based on real usage and add alerts on restarts."',
    ],
    code: [
      {
        title: 'Find the crashing pod',
        language: 'bash',
        code: `kubectl get pods -n dev
# NAME                  READY  STATUS             RESTARTS
# springboot-app-7d9f   0/1    CrashLoopBackOff   6

kubectl describe pod springboot-app-7d9f -n dev`,
      },
      {
        title: 'Termination reason in describe output',
        language: 'text',
        code: `Last State:     Terminated
  Reason:       OOMKilled
  Exit Code:    137
Limits:
  memory:       512Mi`,
      },
      {
        title: 'Check memory usage and previous logs',
        language: 'bash',
        code: `kubectl top pod -n dev
kubectl logs springboot-app-7d9f -n dev --previous`,
      },
      {
        title: 'Right-size memory requests and limits',
        language: 'yaml',
        code: `resources:
  requests:
    memory: "1Gi"
  limits:
    memory: "1Gi"   # same as request for predictable memory`,
      },
      {
        title: 'Size the JVM heap from the container limit',
        language: 'yaml',
        code: `env:
  - name: JAVA_TOOL_OPTIONS
    value: "-XX:MaxRAMPercentage=75.0 -XX:+HeapDumpOnOutOfMemoryError -XX:HeapDumpPath=/tmp"`,
      },
    ],
    followUps: [
      'How is OOMKilled different from a pod being Evicted for node memory pressure?',
      'Why might you set the memory request equal to the limit?',
      'How would you use VPA recommendations to pick the right memory size?',
    ],
    tags: ['kubernetes', 'oomkilled', 'resources', 'jvm', 'troubleshooting'],
  },
  {
    id: 'itv-rinm-2',
    level: 'basic',
    kind: 'open',
    prompt: 'What are some examples of stateful and stateless applications?',
    probing:
      'That you can classify real applications and map them to Deployments versus StatefulSets, and prefer pushing state into managed services.',
    answer: [
      '**Stateless:** the application does **not keep any data inside itself** between requests. Any pod can handle any request, and if a pod dies, a new one can replace it with no data loss.',
      '**Stateful:** the application **stores data that must survive** restarts, and each instance often has its own identity and its own disk.',
      '**Examples**\n- **Stateless**: React/Angular frontend served by Nginx; **Stateful**: Databases: MySQL, PostgreSQL, MongoDB, SQL Server\n- **Stateless**: Spring Boot REST API (sessions kept in Redis or JWT); **Stateful**: Message brokers: Kafka, RabbitMQ\n- **Stateless**: API gateway; **Stateful**: Elasticsearch\n- **Stateless**: Azure Functions (HTTP trigger); **Stateful**: Redis with persistence enabled\n- **Stateless**: Image resizing / PDF generation service; **Stateful**: Jenkins (job history in `JENKINS_HOME`)',
      '**Simple example:** Online shopping site:\n- The **product API** reads products from the database and returns them. It stores nothing itself, so it is **stateless**. Run 3 or 30 copies, and any copy can answer.\n- The **database** stores orders and users. It is **stateful**. If you lose its disk, you lose the orders.',
      '**In Kubernetes**\n- **Workload type** — **Stateless**: Deployment; **Stateful**: StatefulSet\n- **Pod names** — **Stateless**: Random (`api-7d9f-x2k`); **Stateful**: Stable (`mongo-0`, `mongo-1`)\n- **Storage** — **Stateless**: None, or shared; **Stateful**: Own PVC per pod\n- **Scaling** — **Stateless**: Easy, any order; **Stateful**: Ordered, one by one',
      '**Best practice:** keep applications stateless and move the state to managed services (Azure SQL, Azure Cache for Redis, Storage). Then scaling, rolling updates, and recovery become simple.',
      '**Interview answer:** "A stateless application keeps no data between requests, so any instance can serve any request. Examples are a React frontend or a Spring Boot REST API that keeps sessions in Redis. A stateful application stores data that must survive restarts, like MySQL, MongoDB, Kafka, or Elasticsearch. In Kubernetes, I run stateless apps as Deployments and stateful apps as StatefulSets with a PVC per pod. Where possible, I keep the apps stateless and put the state in managed services like Azure SQL or Azure Cache for Redis."',
    ],
    tags: ['kubernetes', 'stateful', 'stateless', 'statefulset', 'deployment'],
  },
  {
    id: 'itv-rinm-3',
    level: 'intermediate',
    kind: 'open',
    prompt: 'How do you use a LoadBalancer type Service in Kubernetes?',
    probing:
      'How a LoadBalancer Service gets an Azure IP, the internal annotation, when Ingress is the better choice, and how to debug a pending IP.',
    answer: [
      "A `LoadBalancer` Service exposes the application **outside the cluster** using the cloud's load balancer. In AKS, Kubernetes asks Azure to create a rule on an **Azure Load Balancer** with an IP address, which sends traffic to the pods.",
      '**Service types compared**\n- **Type**: ClusterIP (default); **Reachable from**: Inside the cluster only; **Use case**: Backend APIs, databases\n- **Type**: NodePort; **Reachable from**: `<NodeIP>:30000-32767`; **Use case**: Testing, rarely in production\n- **Type**: LoadBalancer; **Reachable from**: An external (or internal VNet) IP; **Use case**: Exposing a service directly, non-HTTP traffic',
      '**Example: public LoadBalancer**',
      'After a minute, `EXTERNAL-IP` changes from `<pending>` to a public IP. `curl http://20.81.45.120` reaches the app.',
      '**Example: internal LoadBalancer (only inside the VNet):** For services that only other VNet resources or on-premises systems should reach:',
      '**When to use Ingress instead:** Each LoadBalancer Service gets its **own IP and load-balancer rule**. With 10 web services, that means 10 IPs. For HTTP/HTTPS, it is better to use **one Ingress controller** (NGINX or Application Gateway for Containers) with a single IP that routes by host or path, and handles TLS in one place. Use LoadBalancer for non-HTTP traffic (TCP/UDP, such as databases or MQTT) or for the Ingress controller itself.',
      '**If EXTERNAL-IP stays `<pending>`**',
      'Look at Events. A common cause in AKS is that the cluster identity lacks **Network Contributor** permission on the VNet subnet or public IP resource group.',
      '**Interview answer:** "A LoadBalancer Service exposes pods outside the cluster. In AKS, when I create it, the cloud controller manager creates an Azure Load Balancer rule and public IP, and traffic goes to the pods behind the Service. For services that should be reachable only inside the VNet, I add the `azure-load-balancer-internal` annotation. For HTTP apps, I usually prefer one Ingress controller instead of a LoadBalancer per service, to save IPs and manage TLS in one place. If the external IP stays pending, I check the Service events and the cluster identity\'s network permissions."',
    ],
    code: [
      {
        title: 'Public LoadBalancer Service',
        language: 'yaml',
        code: `apiVersion: v1
kind: Service
metadata:
  name: frontend-lb
  namespace: dev
spec:
  type: LoadBalancer
  selector:
    app: frontend
  ports:
    - port: 80          # port on the load balancer
      targetPort: 8080  # port on the container`,
      },
      {
        title: 'Apply and watch for the external IP',
        language: 'bash',
        code: `kubectl apply -f service.yaml
kubectl get svc frontend-lb -n dev --watch
# NAME          TYPE           CLUSTER-IP    EXTERNAL-IP     PORT(S)
# frontend-lb   LoadBalancer   10.0.120.15   <pending>       80:31234/TCP
# frontend-lb   LoadBalancer   10.0.120.15   20.81.45.120    80:31234/TCP`,
      },
      {
        title: 'Internal LoadBalancer annotation',
        language: 'yaml',
        code: `metadata:
  name: backend-internal-lb
  annotations:
    service.beta.kubernetes.io/azure-load-balancer-internal: "true"`,
      },
      {
        title: 'Traffic flow through the load balancer',
        language: 'text',
        code: `User --> Azure Load Balancer (public IP:80)
             |
             v
         AKS node --> kube-proxy rules --> frontend pod (8080)`,
      },
      {
        title: 'Debug a pending external IP',
        language: 'bash',
        code: `kubectl describe svc frontend-lb -n dev`,
      },
    ],
    tags: ['kubernetes', 'service', 'loadbalancer', 'aks', 'ingress'],
  },
  {
    id: 'itv-rinm-4',
    level: 'intermediate',
    kind: 'open',
    prompt: 'What is the cloud controller manager?',
    probing:
      'Whether you know which component talks to the cloud API for load balancers, routes and node metadata, and that AKS runs it for you.',
    answer: [
      "The **cloud-controller-manager (CCM)** is a control-plane component that **connects Kubernetes to the cloud provider's APIs** (Azure, AWS, GCP). It lets Kubernetes create and manage cloud resources, such as load balancers, automatically.",
      'Kubernetes itself does not know how to create an Azure Load Balancer. The CCM does that translation.',
      '**What it does**\n- **Controller inside CCM**: **Service controller**; **What it does**: Creates and updates cloud load balancers for `type: LoadBalancer` Services; **Example in AKS**: Creates the Azure Load Balancer rule and public IP\n- **Controller inside CCM**: **Node controller**; **What it does**: Adds cloud information to nodes and removes nodes whose VM no longer exists; **Example in AKS**: Adds labels for region, zone, and VM size\n- **Controller inside CCM**: **Route controller**; **What it does**: Configures network routes between nodes; **Example in AKS**: Updates the route table for kubenet clusters',
      '(Disk creation is handled by CSI drivers today, not by the CCM.)',
      "**In AKS:** The CCM (cloud-provider-azure) runs in the **Microsoft-managed control plane**, so you don't install or upgrade it. What you **do** need is the right permissions: the cluster's managed identity needs rights on the VNet, subnet, and public IPs it manages. Missing permissions are a common reason for `EXTERNAL-IP <pending>`.",
      '**Interview answer:** "The cloud controller manager is the control-plane component that connects Kubernetes to the cloud APIs. Its service controller creates the Azure Load Balancer and public IP when I create a LoadBalancer Service, its node controller adds cloud details like the zone and VM size to nodes, and the route controller manages routes for kubenet. In AKS it is managed by Microsoft, so my part is making sure the cluster identity has the network permissions it needs."',
    ],
    code: [
      {
        title: 'What happens when a LoadBalancer Service is created',
        language: 'text',
        code: `kubectl apply -f service.yaml   (type: LoadBalancer)
          |
          v
API server stores the Service
          |
          v
Cloud controller manager sees it
          |
          v
Calls Azure API: create LB rule + public IP
          |
          v
Writes the IP back to the Service status (EXTERNAL-IP)`,
      },
      {
        title: 'Node labels and provider ID set by the CCM',
        language: 'bash',
        code: `kubectl get nodes --show-labels | grep -o 'topology.kubernetes.io/zone=[^,]*'
kubectl describe node <node-name> | grep ProviderID`,
      },
    ],
    tags: ['kubernetes', 'cloud-controller-manager', 'control plane', 'aks'],
  },
  {
    id: 'itv-rinm-5',
    level: 'intermediate',
    kind: 'open',
    prompt: 'What are a Deployment, StatefulSet, and DaemonSet? Give examples.',
    probing:
      'That you can pick the right workload controller for a stateless API, a database and a per-node agent, with realistic manifests.',
    answer: [
      'All three are controllers that create and manage pods, but for different kinds of applications.',
      '- **Use for** — **Deployment**: Stateless apps; **StatefulSet**: Stateful apps; **DaemonSet**: One pod on every node\n- **Pod names** — **Deployment**: Random (`api-7d9f-x2k`); **StatefulSet**: Fixed, ordered (`mongo-0`, `mongo-1`); **DaemonSet**: One per node\n- **Storage** — **Deployment**: Usually none or shared; **StatefulSet**: Own PVC per pod (kept after restart); **DaemonSet**: Often node paths (logs)\n- **Scaling** — **Deployment**: `replicas: N`, any order; **StatefulSet**: Ordered, one at a time; **DaemonSet**: Follows the number of nodes\n- **Examples** — **Deployment**: Spring Boot API, React frontend, Nginx; **StatefulSet**: MongoDB, Kafka, Elasticsearch, Zookeeper; **DaemonSet**: Fluent Bit, node-exporter, Azure Monitor agent, kube-proxy, CSI node drivers',
      '**Deployment: Spring Boot API**',
      'Any of the 3 pods can serve any request. Rolling updates replace them one by one.',
      '**StatefulSet: MongoDB with a disk per pod**',
      'Pods are `mongo-0`, `mongo-1`, `mongo-2`. If `mongo-1` restarts, it comes back with the **same name and the same disk** (`data-mongo-1`).',
      '**DaemonSet: log collector on every node**',
      'When Cluster Autoscaler adds a node, the DaemonSet automatically starts a Fluent Bit pod on it.',
      'Related: a **Job** runs a task to completion once (DB migration), and a **CronJob** runs on a schedule (nightly report).',
      '**Interview answer:** "A Deployment is for stateless apps like a Spring Boot API: pods are interchangeable and updated with rolling updates. A StatefulSet is for stateful apps like MongoDB or Kafka: each pod has a stable name like `mongo-0` and its own persistent disk that stays with it after restarts. A DaemonSet runs one pod on every node, for node-level agents like Fluent Bit for logs, node-exporter for metrics, or the Azure Monitor agent. New nodes automatically get the DaemonSet pod."',
    ],
    code: [
      {
        title: 'Deployment: Spring Boot API',
        language: 'yaml',
        code: `apiVersion: apps/v1
kind: Deployment
metadata:
  name: orders-api
spec:
  replicas: 3
  selector:
    matchLabels:
      app: orders-api
  template:
    metadata:
      labels:
        app: orders-api
    spec:
      containers:
        - name: orders-api
          image: myacr.azurecr.io/orders-api:v1.2.0`,
      },
      {
        title: 'StatefulSet: MongoDB with a disk per pod',
        language: 'yaml',
        code: `apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: mongo
spec:
  serviceName: mongo        # headless Service for stable DNS names
  replicas: 3
  selector:
    matchLabels:
      app: mongo
  template:
    metadata:
      labels:
        app: mongo
    spec:
      containers:
        - name: mongo
          image: mongo:7.0
          volumeMounts:
            - name: data
              mountPath: /data/db
  volumeClaimTemplates:
    - metadata:
        name: data
      spec:
        accessModes: ["ReadWriteOnce"]
        storageClassName: managed-csi
        resources:
          requests:
            storage: 20Gi`,
      },
      {
        title: 'DaemonSet: log collector on every node',
        language: 'yaml',
        code: `apiVersion: apps/v1
kind: DaemonSet
metadata:
  name: fluent-bit
  namespace: logging
spec:
  selector:
    matchLabels:
      app: fluent-bit
  template:
    metadata:
      labels:
        app: fluent-bit
    spec:
      containers:
        - name: fluent-bit
          image: fluent/fluent-bit:3.0
          volumeMounts:
            - name: varlog
              mountPath: /var/log
              readOnly: true
      volumes:
        - name: varlog
          hostPath:
            path: /var/log`,
      },
    ],
    tags: ['kubernetes', 'deployment', 'statefulset', 'daemonset', 'workloads'],
  },
  {
    id: 'itv-rinm-6',
    level: 'intermediate',
    kind: 'open',
    prompt: 'What are the components of the control plane and data plane in Kubernetes?',
    probing:
      'Whether you can name each control plane and node component, say what it does, and walk through what happens on kubectl apply.',
    answer: [
      '- The **control plane** is the "brain": it stores the desired state and makes decisions.\n- The **data plane** (worker nodes) is the "muscle": it actually runs the application pods.',
      '**Control plane components**\n- **Component**: **kube-apiserver**; **Role**: Front door of the cluster. All requests (`kubectl`, pipelines, kubelets) go through it. Handles authentication and authorization.\n- **Component**: **etcd**; **Role**: Key-value database that stores the whole cluster state (Deployments, Secrets, ConfigMaps).\n- **Component**: **kube-scheduler**; **Role**: Picks the best node for each new pod based on resources, taints, and affinity.\n- **Component**: **kube-controller-manager**; **Role**: Runs controllers that keep actual state = desired state (for example, if a pod dies, the ReplicaSet controller creates a new one).\n- **Component**: **cloud-controller-manager**; **Role**: Talks to Azure for load balancers, node information, and routes (see Q4).',
      '**Data plane (worker node) components**\n- **Component**: **kubelet**; **Role**: Agent on each node. Starts the pods assigned to the node, runs probes, and reports status.\n- **Component**: **kube-proxy**; **Role**: Programs iptables/IPVS rules so Service IPs reach the right pods (Cilium can replace it).\n- **Component**: **Container runtime**; **Role**: Actually runs the containers (containerd in AKS, see Q7).\n- **Component**: **CNI plugin**; **Role**: Gives pods IPs and networking (see Q8).',
      'Cluster add-ons like **CoreDNS** and **metrics-server** run as pods on the worker nodes.',
      '**What happens on `kubectl apply -f deployment.yaml`**\n1. `kubectl` sends the Deployment to the **API server**, which stores it in **etcd**.\n2. The **controller manager** creates a ReplicaSet and the pod objects.\n3. The **scheduler** assigns each pod to a node.\n4. The **kubelet** on that node asks **containerd** to pull the image and start the container; the **CNI** assigns an IP.\n5. The kubelet reports "Running" back to the API server.',
      "**In AKS:** Microsoft manages the whole **control plane** (you don't see those VMs, and etcd is backed up for you). You manage the **node pools** (VM size, count, upgrades) and the workloads. The Standard tier adds an uptime SLA for the API server.",
      '**Interview answer:** "The control plane has the API server as the entry point, etcd to store the cluster state, the scheduler to place pods on nodes, the controller manager to keep the actual state matching the desired state, and the cloud controller manager to talk to Azure. The data plane is the worker nodes, each running the kubelet, kube-proxy, the container runtime, which is containerd, and the CNI plugin. In AKS, Microsoft manages the control plane, and we manage the node pools and workloads."',
    ],
    code: [
      {
        title: 'Control plane and data plane layout',
        language: 'text',
        code: `                     CONTROL PLANE
  +----------------------------------------------------+
  |  kube-apiserver  <-->  etcd                        |
  |       ^                                            |
  |       |-- kube-scheduler                           |
  |       |-- kube-controller-manager                  |
  |       |-- cloud-controller-manager                 |
  +-------|--------------------------------------------+
          |
  +-------|-------------------+  +---------------------------+
  | Worker node 1             |  | Worker node 2             |
  |  kubelet                  |  |  kubelet                  |
  |  kube-proxy               |  |  kube-proxy               |
  |  container runtime        |  |  container runtime        |
  |  CNI plugin               |  |  CNI plugin               |
  |  [pod] [pod] [pod]        |  |  [pod] [pod]              |
  +---------------------------+  +---------------------------+`,
      },
    ],
    tags: ['kubernetes', 'control plane', 'architecture', 'kubelet', 'etcd'],
  },
  {
    id: 'itv-rinm-7',
    level: 'basic',
    kind: 'open',
    prompt: 'What container runtime have you used in Kubernetes?',
    probing:
      'That you know AKS uses containerd, why Docker images still work, and how to debug containers on a node with crictl.',
    answer: [
      'The container runtime is the software on each node that **pulls images and runs the containers**. The kubelet talks to it through the **CRI** (Container Runtime Interface).',
      'In AKS, the runtime is **containerd**. AKS moved from Docker to containerd for Linux node pools from Kubernetes 1.19, and Kubernetes removed Docker support (dockershim) completely in 1.24.',
      '**Common question: "Then can we still use Docker images?":** **Yes.** Docker builds images in the standard **OCI** format, and containerd runs OCI images. Developers still use `docker build` and push to ACR; only the runtime on the node changed.',
      '**Debugging on the node:** Without Docker on the node, `docker ps` does not work. Use `crictl` instead:',
      'Other runtimes you may hear about: **CRI-O** (used by OpenShift) and sandboxed runtimes like **Kata Containers** (AKS Pod Sandboxing) for strong isolation.',
      '**Interview answer:** "We used containerd, which is the default runtime in AKS. The kubelet talks to it through CRI. Docker images still work because they\'re standard OCI images; we build with Docker in the pipeline and push to ACR, and containerd runs them on the nodes. For node-level debugging, I use `kubectl debug node` and `crictl`, because there is no Docker CLI on the nodes."',
    ],
    code: [
      {
        title: 'Check the node container runtime',
        language: 'bash',
        code: `kubectl get nodes -o wide
# NAME                     STATUS  VERSION  OS-IMAGE           CONTAINER-RUNTIME
# aks-nodepool1-123-vmss0  Ready   v1.30.x  Ubuntu 22.04.x LTS containerd://1.7.x`,
      },
      {
        title: 'Debug containers on the node with crictl',
        language: 'bash',
        code: `kubectl debug node/aks-nodepool1-123-vmss0 -it --image=mcr.microsoft.com/cbl-mariner/busybox:2.0
chroot /host
crictl ps          # running containers
crictl images      # images on the node
crictl logs <container-id>`,
      },
    ],
    tags: ['kubernetes', 'containerd', 'container runtime', 'cri', 'aks'],
  },
  {
    id: 'itv-rinm-8',
    level: 'intermediate',
    kind: 'open',
    prompt: 'What are the uses of a network plugin in Kubernetes?',
    probing:
      'What the CNI plugin is responsible for (pod IPs, pod-to-pod routing, NetworkPolicy) and which options AKS offers.',
    answer: [
      'Kubernetes defines **networking rules** (every pod gets its own IP, and every pod can reach every other pod without NAT), but it does not implement them itself. The **network plugin (CNI)** implements them.',
      '**Uses**\n- **Use**: **Assign pod IPs**; **What it means**: Each pod gets an IP when it starts (from a VNet subnet or an overlay range).\n- **Use**: **Pod-to-pod communication**; **What it means**: Pods on different nodes can talk to each other, through routing or encapsulation.\n- **Use**: **Connect to the outside network**; **What it means**: Pods can reach VNet resources, private endpoints, on-premises, and the internet.\n- **Use**: **Network policies**; **What it means**: Allow or deny traffic between pods (for example, only the backend can reach the database). Supported by Azure NPM, Calico, or Cilium.\n- **Use**: **Performance and scale**; **What it means**: eBPF-based plugins (Cilium) process traffic faster and can replace kube-proxy.\n- **Use**: **Observability and encryption**; **What it means**: Some plugins show traffic flows (Cilium Hubble) and encrypt node-to-node traffic (WireGuard).',
      '**Example: NetworkPolicy enforced by the plugin:** Only frontend pods can call the backend on port 8080:',
      '**Important:** if the cluster has no network policy engine enabled, Kubernetes accepts this YAML but **nothing enforces it**.',
      '**AKS options:** Azure CNI Overlay, Azure CNI (pod subnet), Kubenet (legacy), and Azure CNI Powered by Cilium. See the EPAM rounds topic (part 3, Q4) for a comparison table, and the EPAM rounds topic (part 3, Q14) for how the plugin assigns pod IPs.',
      '**Interview answer:** "The network plugin implements pod networking. It assigns IPs to pods, lets pods on different nodes talk to each other, connects them to the VNet and external services, and enforces NetworkPolicies, such as allowing only the frontend to call the backend. Advanced plugins like Cilium also give better performance with eBPF, traffic visibility, and encryption. In AKS, we used Azure CNI Overlay with network policies enabled."',
      'Only name the plugin your cluster actually used.',
    ],
    code: [
      {
        title: 'NetworkPolicy enforced by the plugin',
        language: 'yaml',
        code: `apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: allow-frontend-to-backend
  namespace: prod
spec:
  podSelector:
    matchLabels:
      app: backend
  policyTypes:
    - Ingress
  ingress:
    - from:
        - podSelector:
            matchLabels:
              app: frontend
      ports:
        - protocol: TCP
          port: 8080`,
      },
    ],
    tags: ['kubernetes', 'cni', 'networking', 'networkpolicy', 'aks'],
  },
  {
    id: 'itv-rinm-9',
    level: 'advanced',
    kind: 'open',
    prompt: 'How do you increase nodes automatically in Kubernetes?',
    probing:
      'How HPA and the cluster autoscaler work together, how to enable and tune autoscaling in AKS, and what stops nodes from being added or removed.',
    answer: [
      'Use the **Cluster Autoscaler**. It adds nodes when pods cannot be scheduled because of insufficient CPU or memory (`Pending`), and removes nodes that stay underused.',
      "**Key point:** it does **not** add nodes just because CPU is high. The trigger is **pending pods**. That is why it works together with HPA: HPA adds pods, and if they don't fit, Cluster Autoscaler adds nodes.",
      '**Enable it in AKS:** Change the limits later with `--update-cluster-autoscaler`.',
      "If you manage the node count with the autoscaler, don't also hard-code `node_count` changes in Terraform, or Terraform and the autoscaler will fight. Use `lifecycle { ignore_changes = [node_count] }`.",
      '**Tuning:** The **autoscaler profile** controls behaviour, for example how long a node must be unused before removal (`scale-down-unneeded-time`, default 10 minutes):\n**Things that stop it from working**\n- Pods have **no resource requests**, so the scheduler thinks they fit and they never go Pending.\n- The pool is already at `max-count`, or the subscription has no vCPU **quota** left.\n- Scale-down is blocked by pods with local storage, strict PodDisruptionBudgets, or pods not managed by a controller.',
      'Another option in AKS is **Node Auto-Provisioning** (based on Karpenter), which picks the best VM size for the pending pods automatically.',
      '**Interview answer:** "I enable the Cluster Autoscaler on the AKS node pool with a minimum and maximum node count. It adds nodes when pods are Pending because of insufficient resources, and removes underused nodes after a while. It works together with HPA: HPA adds pods for traffic, and the Cluster Autoscaler adds nodes when those pods don\'t fit. For it to work well, every pod must have resource requests, and the subscription must have enough vCPU quota."',
    ],
    code: [
      {
        title: 'HPA and cluster autoscaler together',
        language: 'text',
        code: `Traffic up --> HPA adds pods --> pods Pending (no space)
                                     |
                                     v
                     Cluster Autoscaler adds a node
                                     |
                                     v
                        Pods scheduled on the new node`,
      },
      {
        title: 'Enable the autoscaler on a new cluster',
        language: 'bash',
        code: `az aks create -g rg-aks-dev -n aks-dev \\
  --node-count 3 \\
  --enable-cluster-autoscaler \\
  --min-count 3 \\
  --max-count 10`,
      },
      {
        title: 'Enable it on an existing node pool',
        language: 'bash',
        code: `az aks nodepool update -g rg-aks-dev --cluster-name aks-dev \\
  --name userpool \\
  --enable-cluster-autoscaler \\
  --min-count 2 \\
  --max-count 8`,
      },
      {
        title: 'Node pool autoscaling with Terraform (azurerm 4.x)',
        language: 'hcl',
        code: `resource "azurerm_kubernetes_cluster_node_pool" "user" {
  name                  = "userpool"
  kubernetes_cluster_id = azurerm_kubernetes_cluster.aks.id
  vm_size               = "Standard_D4s_v5"
  auto_scaling_enabled  = true   # enable_auto_scaling in azurerm 3.x
  min_count             = 2
  max_count             = 8
}`,
      },
      {
        title: 'Tune the autoscaler profile',
        language: 'bash',
        code: `az aks update -g rg-aks-dev -n aks-dev \\
  --cluster-autoscaler-profile scale-down-unneeded-time=15m`,
      },
    ],
    followUps: [
      'Why does the cluster autoscaler react to Pending pods and not to CPU usage?',
      'What can block a scale-down, and how do PodDisruptionBudgets affect it?',
      'How would you handle a node pool that has hit its maximum node count or the subscription vCPU quota?',
    ],
    tags: ['kubernetes', 'cluster autoscaler', 'hpa', 'aks', 'scaling'],
  },
  {
    id: 'itv-rinm-10',
    level: 'intermediate',
    kind: 'open',
    prompt: 'What is CSI in Kubernetes?',
    probing:
      'That CSI is the standard plugin interface for storage, and which CSI drivers and storage classes AKS ships.',
    answer: [
      '**CSI = Container Storage Interface.** It is a standard API between Kubernetes and storage systems.',
      'Before CSI, storage code for each cloud was **inside Kubernetes itself** ("in-tree"), so every storage fix needed a new Kubernetes release. With CSI, each storage vendor writes its own **driver** that plugs into Kubernetes, and it can be updated independently.',
      '**What a CSI driver does**\n- **Step**: **Create** the volume; **Example with Azure Disk**: Creates a managed disk when a PVC is created\n- **Step**: **Attach** it to the node; **Example with Azure Disk**: Attaches the disk to the VM where the pod is scheduled\n- **Step**: **Mount** it into the pod; **Example with Azure Disk**: Formats and mounts the disk at the container path\n- **Step**: **Expand / snapshot / delete**; **Example with Azure Disk**: Resizes the disk, takes snapshots, deletes it when no longer needed',
      'A CSI driver usually has two parts:\n- **Controller plugin** (Deployment): creates, deletes, attaches, and detaches volumes using the cloud API.\n- **Node plugin** (DaemonSet): mounts the volume on each node.',
      '**CSI drivers in AKS**\n- **Driver**: `disk.csi.azure.com`; **Storage**: Azure Managed Disks; **Typical use**: Databases, one pod per disk (ReadWriteOnce)\n- **Driver**: `file.csi.azure.com`; **Storage**: Azure Files (SMB/NFS); **Typical use**: Shared files across many pods (ReadWriteMany)\n- **Driver**: `blob.csi.azure.com`; **Storage**: Azure Blob (BlobFuse/NFS); **Typical use**: Large unstructured data, ML datasets\n- **Driver**: `secrets-store.csi.k8s.io`; **Storage**: Azure Key Vault (via provider); **Typical use**: Mount secrets and certificates as files (see Q14)',
      'The Disk and Files drivers are enabled by default in AKS.',
      '**Interview answer:** "CSI is the Container Storage Interface, a standard that lets storage vendors write drivers for Kubernetes without changing Kubernetes code. The driver creates, attaches, mounts, expands, and snapshots volumes. In AKS, we use the Azure Disk CSI driver for databases that need a dedicated disk, the Azure Files CSI driver for storage shared by many pods, and the Secrets Store CSI driver to mount Key Vault secrets into pods."',
    ],
    code: [
      {
        title: 'List CSI drivers and storage classes',
        language: 'bash',
        code: `kubectl get csidrivers
kubectl get storageclass
# NAME                    PROVISIONER          
# managed-csi (default)   disk.csi.azure.com
# managed-csi-premium     disk.csi.azure.com
# azurefile-csi           file.csi.azure.com
# azurefile-csi-premium   file.csi.azure.com`,
      },
    ],
    tags: ['kubernetes', 'csi', 'storage', 'aks'],
  },
  {
    id: 'itv-rinm-11',
    level: 'intermediate',
    kind: 'open',
    prompt: 'How is storage managed in Kubernetes?',
    probing:
      'Whether you can explain ephemeral versus persistent storage and how StorageClass, PVC and PV fit together.',
    answer: [
      'Containers are **temporary**: when a container restarts, anything written inside it is lost. Kubernetes uses **volumes** to keep or share data.',
      "**Types of storage**\n- **Type**: `emptyDir`; **Lifetime**: Lives as long as the pod; **Example use**: Temp files, cache, sharing files with a sidecar\n- **Type**: `configMap` / `secret`; **Lifetime**: Managed by Kubernetes; **Example use**: Config files, certificates mounted as files\n- **Type**: `hostPath`; **Lifetime**: Node's disk; **Example use**: Node agents like log collectors (avoid for apps)\n- **Type**: **PersistentVolume (PV) + PVC**; **Lifetime**: Independent of the pod; **Example use**: Databases, uploaded files, anything that must survive",
      '**The persistent storage building blocks**',
      '**Dynamic provisioning** is the normal way: the developer creates only a PVC, and the StorageClass + CSI driver creates the disk and the PV automatically.',
      '**Example StorageClass**',
      '- **Setting**: `reclaimPolicy: Retain`; **Why it matters**: Protects production data if someone deletes the PVC. `Delete` (the default) removes the disk too.\n- **Setting**: `WaitForFirstConsumer`; **Why it matters**: Creates the disk in the same availability zone as the node where the pod lands.\n- **Setting**: `allowVolumeExpansion`; **Why it matters**: Lets you increase the PVC size later without recreating it.',
      '**Other parts of storage management**\n- **Access modes:** ReadWriteOnce (one node, Azure Disk) vs ReadWriteMany (many pods, Azure Files). See Q12.\n- **StatefulSets** use `volumeClaimTemplates` to give each pod its own PVC.\n- **Backup:** Azure Backup for AKS or Velero, plus volume snapshots.\n- **Monitoring:** alert when a volume is nearly full (`kubelet_volume_stats_used_bytes`).',
      '**Interview answer:** "Container storage is temporary, so Kubernetes uses volumes. For temporary or shared data inside a pod, I use `emptyDir`; for config, ConfigMaps and Secrets. For data that must survive, I use PersistentVolumeClaims with a StorageClass, so the CSI driver creates the Azure Disk or Azure Files share automatically. For production, I use a StorageClass with `Retain`, `WaitForFirstConsumer`, and volume expansion enabled, and I back up the volumes with Azure Backup for AKS or Velero."',
    ],
    code: [
      {
        title: 'Persistent storage building blocks',
        language: 'text',
        code: `StorageClass  -> "how" to create storage (disk type, reclaim policy)
      |
PVC           -> developer asks: "I need 20Gi, ReadWriteOnce"
      |
PV            -> the actual storage (Azure Disk), created automatically
      |
Pod           -> mounts the PVC at /data`,
      },
      {
        title: 'Example StorageClass',
        language: 'yaml',
        code: `apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: premium-retain
provisioner: disk.csi.azure.com
parameters:
  skuName: Premium_LRS
reclaimPolicy: Retain                 # keep the disk if the PVC is deleted
volumeBindingMode: WaitForFirstConsumer
allowVolumeExpansion: true`,
      },
    ],
    tags: ['kubernetes', 'storage', 'storageclass', 'pvc', 'pv'],
  },
  {
    id: 'itv-rinm-12',
    level: 'intermediate',
    kind: 'open',
    prompt: 'What are PV and PVC?',
    probing:
      'The PV and PVC relationship, access modes, static versus dynamic provisioning, and how to fix a PVC stuck in Pending.',
    answer: [
      '- **PV (PersistentVolume):** the **actual piece of storage** in the cluster, such as an Azure Disk or Azure Files share. It is a cluster-level resource.\n- **PVC (PersistentVolumeClaim):** a **request for storage** made by an application, such as "I need 10Gi, ReadWriteOnce". It belongs to a namespace.',
      'Simple analogy: the **PV is a parking space**; the **PVC is your parking ticket** asking for a space of a certain size. Kubernetes matches them (**binding**), and the pod uses the ticket.',
      '**Example: PVC + pod (dynamic provisioning)**',
      'When the pod is scheduled, the CSI driver creates a 10Gi Azure Disk and a PV, and the PVC becomes `Bound`.',
      '**Access modes**\n- **Mode**: ReadWriteOnce (RWO); **Meaning**: Read-write by one node; **Azure storage**: Azure Disk\n- **Mode**: ReadOnlyMany (ROX); **Meaning**: Read-only by many nodes; **Azure storage**: Azure Files, Blob\n- **Mode**: ReadWriteMany (RWX); **Meaning**: Read-write by many nodes; **Azure storage**: Azure Files, Blob\n- **Mode**: ReadWriteOncePod (RWOP); **Meaning**: Read-write by a single pod; **Azure storage**: Azure Disk',
      '**Static vs dynamic**\n- **Dynamic:** create only the PVC; the StorageClass creates the PV. (Normal case.)\n- **Static:** an admin creates the PV for **existing** storage (for example, an existing Azure Files share with data), and the PVC binds to it.',
      '**Common issues**\n- **Symptom**: PVC stuck in `Pending`; **Cause**: Wrong StorageClass name, no quota, or waiting for a pod (`WaitForFirstConsumer`, which is normal)\n- **Symptom**: Pod stuck in `ContainerCreating` with "Multi-Attach error"; **Cause**: An RWO disk is still attached to another node; use RWX storage if many pods need it\n- **Symptom**: PV in `Released` state; **Cause**: The PVC was deleted and the reclaim policy is `Retain`; the data is kept and the PV must be cleaned up manually to reuse',
      '**Interview answer:** "A PV is the actual storage, like an Azure Disk, and a PVC is the application\'s request for storage of a certain size and access mode. Kubernetes binds the PVC to a PV, and the pod mounts the PVC. Normally we use dynamic provisioning: we create only the PVC, and the StorageClass and CSI driver create the disk and the PV. I choose Azure Disk with ReadWriteOnce for databases, and Azure Files with ReadWriteMany when several pods share the same files."',
    ],
    code: [
      {
        title: 'PVC and pod with dynamic provisioning',
        language: 'yaml',
        code: `apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: uploads-pvc
  namespace: dev
spec:
  accessModes:
    - ReadWriteOnce
  storageClassName: managed-csi
  resources:
    requests:
      storage: 10Gi
---
apiVersion: v1
kind: Pod
metadata:
  name: uploads-app
  namespace: dev
spec:
  containers:
    - name: app
      image: myacr.azurecr.io/uploads-app:v1.0.0
      volumeMounts:
        - name: uploads
          mountPath: /app/uploads
  volumes:
    - name: uploads
      persistentVolumeClaim:
        claimName: uploads-pvc`,
      },
      {
        title: 'Check the PVC is bound',
        language: 'bash',
        code: `kubectl get pvc -n dev
# NAME          STATUS   VOLUME          CAPACITY   ACCESS MODES   STORAGECLASS
# uploads-pvc   Bound    pvc-3f2a...     10Gi       RWO            managed-csi

kubectl get pv`,
      },
    ],
    tags: ['kubernetes', 'pv', 'pvc', 'storage', 'access modes'],
  },
  {
    id: 'itv-rinm-13',
    level: 'advanced',
    kind: 'open',
    prompt: 'What is encryption at rest in Kubernetes?',
    probing:
      'Whether you know Secrets are only base64-encoded, how etcd encryption works, what AKS adds with KMS and encryption at host, and better secret practices.',
    answer: [
      '**Encryption at rest** means data stored on disk is encrypted, so if someone gets the disk or a backup, they cannot read the data. In Kubernetes, there are two places to think about:\n1. **etcd**, which stores cluster objects, including **Secrets**.\n2. **Disks**: node OS disks and the persistent volumes (PVs) used by apps.',
      '**Important point: Kubernetes Secrets are only base64-encoded**',
      'Base64 is **encoding, not encryption**. Anyone with read access to Secrets or to etcd can decode them. That is why we need encryption at rest for etcd and RBAC restrictions on who can read Secrets.',
      '**In vanilla Kubernetes:** Admins configure an `EncryptionConfiguration` on the API server, ideally with a **KMS provider**, so Secrets are encrypted before they are written to etcd:\n**In AKS**\n- **Layer**: etcd; **Default**: Encrypted at rest by Azure with Microsoft-managed keys; **Extra option (customer-managed keys)**: **KMS etcd encryption** with your own key in Azure Key Vault\n- **Layer**: Node OS disks; **Default**: Azure Storage encryption with platform-managed keys; **Extra option (customer-managed keys)**: Disk Encryption Set with your key from Key Vault\n- **Layer**: Temp disks and disk cache on the node; **Default**: Not covered by storage encryption; **Extra option (customer-managed keys)**: **Encryption at host**\n- **Layer**: PVs (Azure Disk / Files); **Default**: Encrypted with platform-managed keys; **Extra option (customer-managed keys)**: StorageClass `diskEncryptionSetID` parameter with your key',
      'Enable KMS etcd encryption with a Key Vault key:',
      '(The cluster needs a user-assigned managed identity with permission to use the key. For a private Key Vault, use `Private` network access.)',
      '**Better practice for secrets:** Instead of storing real secrets in Kubernetes Secrets, keep them in **Azure Key Vault** and mount them with the Secrets Store CSI driver (Q14) or read them through Workload ID.',
      '**Interview answer:** "Encryption at rest protects stored data. In Kubernetes, the main concern is etcd, because Secrets are only base64-encoded, not encrypted. In AKS, etcd and disks are already encrypted by Azure with Microsoft-managed keys. For stricter compliance, I enable KMS etcd encryption with a key in Key Vault, use a Disk Encryption Set for customer-managed keys on OS disks and PVs, and enable encryption at host for temp disks. I also prefer keeping secrets in Key Vault and mounting them with the Secrets Store CSI driver."',
    ],
    code: [
      {
        title: 'Secrets are only base64-encoded',
        language: 'bash',
        code: `kubectl get secret db-secret -n dev -o jsonpath='{.data.password}' | base64 -d
# MyPassword123`,
      },
      {
        title: 'EncryptionConfiguration for etcd',
        language: 'yaml',
        code: `apiVersion: apiserver.config.k8s.io/v1
kind: EncryptionConfiguration
resources:
  - resources:
      - secrets
    providers:
      - kms:
          apiVersion: v2
          name: azure-kms
          endpoint: unix:///opt/azurekms.socket
      - identity: {}`,
      },
      {
        title: 'Enable KMS etcd encryption in AKS',
        language: 'bash',
        code: `az aks update -g rg-aks-prod -n aks-prod \\
  --enable-azure-keyvault-kms \\
  --azure-keyvault-kms-key-id "$KEY_ID" \\
  --azure-keyvault-kms-key-vault-network-access Public`,
      },
      {
        title: 'Encryption at host for a node pool',
        language: 'bash',
        code: `az aks nodepool add -g rg-aks-prod --cluster-name aks-prod \\
  --name securepool --enable-encryption-at-host`,
      },
    ],
    followUps: [
      'What is the difference between envelope encryption with KMS and the default platform encryption of etcd?',
      'What happens to the cluster if the Key Vault key used for KMS is deleted or rotated?',
      'Why would you still prefer Key Vault with the Secrets Store CSI driver over Kubernetes Secrets?',
    ],
    tags: ['kubernetes', 'encryption', 'secrets', 'kms', 'aks', 'security'],
  },
  {
    id: 'itv-rinm-14',
    level: 'advanced',
    kind: 'open',
    prompt: 'How do you integrate external services with CSI?',
    probing:
      'That you can wire Key Vault into pods with the Secrets Store CSI driver and Workload ID, and mount existing Azure Files shares with static PVs.',
    answer: [
      'The most common case is **Azure Key Vault → pods** using the **Secrets Store CSI driver** with the **Azure Key Vault provider**. Key Vault secrets, keys, and certificates are mounted into the pod as files, and can optionally be synced to a Kubernetes Secret. The second case is mounting **existing Azure Storage** (Files/Blob) with the storage CSI drivers.',
      '**Case 1: Azure Key Vault secrets in a pod**',
      '**Step 1: Enable the add-on**',
      '**Step 2: Identity and access**',
      'Set up Workload ID with a user-assigned managed identity, a federated credential for the service account, and the **Key Vault Secrets User** role. These are the same steps as the EPAM rounds topic (part 3, Q9).',
      '**Step 3: Create a `SecretProviderClass`** (tells the driver what to fetch)',
      '**Step 4: Mount it in the Deployment**',
      'If the pod is stuck in `ContainerCreating`, run `kubectl describe pod` and look for mount errors: usually a wrong client ID, a missing role assignment, or the Key Vault firewall blocking access.',
      'Note: the synced Kubernetes Secret (`db-secret`) exists only while a pod is mounting the volume.',
      '**Case 2: Existing Azure Files share (static provisioning):** To mount an existing file share that already has data, create a PV that points to it:',
      'Then a PVC with the same `storageClassName` and `volumeName: shared-reports-pv` binds to it.',
      '**Interview answer:** "I integrate external services with the CSI drivers. For secrets, I enable the Azure Key Vault Secrets Store CSI add-on, create a SecretProviderClass listing the Key Vault secrets, and mount it as a volume in the pod. The driver authenticates with Workload ID, using a user-assigned managed identity that has the Key Vault Secrets User role, so there are no credentials in the cluster. I enable secret rotation, and optionally sync to a Kubernetes Secret for apps that need environment variables. For existing Azure Files or Blob storage, I create a static PV that points to the share, and the pods mount it through a PVC."',
    ],
    code: [
      {
        title: 'Key Vault to pod flow',
        language: 'text',
        code: `Pod (serviceAccount with Workload ID)
   |
   | mounts volume (driver: secrets-store.csi.k8s.io)
   v
Secrets Store CSI driver + Azure Key Vault provider
   |
   | authenticates as the user-assigned managed identity
   v
Azure Key Vault --> secret written as a file: /mnt/secrets/database-password`,
      },
      {
        title: 'Step 1: enable the Key Vault provider add-on',
        language: 'bash',
        code: `az aks enable-addons -g rg-aks-dev -n aks-dev \\
  --addons azure-keyvault-secrets-provider

# Optional: refresh mounted secrets when they change in Key Vault
az aks addon update -g rg-aks-dev -n aks-dev \\
  --addon azure-keyvault-secrets-provider \\
  --enable-secret-rotation`,
      },
      {
        title: 'Step 3: SecretProviderClass',
        language: 'yaml',
        code: `apiVersion: secrets-store.csi.x-k8s.io/v1
kind: SecretProviderClass
metadata:
  name: kv-db-secrets
  namespace: dev
spec:
  provider: azure
  parameters:
    clientID: "<USER_ASSIGNED_CLIENT_ID>"
    keyvaultName: "<KEYVAULT_NAME>"
    tenantId: "<TENANT_ID>"
    objects: |
      array:
        - |
          objectName: database-password
          objectType: secret
  secretObjects:                 # optional: also create a Kubernetes Secret
    - secretName: db-secret
      type: Opaque
      data:
        - objectName: database-password
          key: password`,
      },
      {
        title: 'Step 4: mount the secrets in the Deployment',
        language: 'yaml',
        code: `spec:
  template:
    metadata:
      labels:
        app: springboot-app
        azure.workload.identity/use: "true"
    spec:
      serviceAccountName: springboot-sa
      containers:
        - name: app
          image: myacr.azurecr.io/springboot-app:v1.0.0
          volumeMounts:
            - name: secrets-store
              mountPath: /mnt/secrets
              readOnly: true
          env:
            - name: DB_PASSWORD
              valueFrom:
                secretKeyRef:
                  name: db-secret
                  key: password
      volumes:
        - name: secrets-store
          csi:
            driver: secrets-store.csi.k8s.io
            readOnly: true
            volumeAttributes:
              secretProviderClass: kv-db-secrets`,
      },
      {
        title: 'Step 5: verify the mounted secret',
        language: 'bash',
        code: `kubectl exec -n dev deploy/springboot-app -- ls /mnt/secrets
# database-password`,
      },
      {
        title: 'Static PV for an existing Azure Files share',
        language: 'yaml',
        code: `apiVersion: v1
kind: PersistentVolume
metadata:
  name: shared-reports-pv
spec:
  capacity:
    storage: 100Gi
  accessModes:
    - ReadWriteMany
  persistentVolumeReclaimPolicy: Retain
  storageClassName: azurefile-csi
  csi:
    driver: file.csi.azure.com
    volumeHandle: "rg-storage#streportsprod#reports"   # unique ID: rg#account#share
    volumeAttributes:
      resourceGroup: rg-storage
      storageAccount: streportsprod
      shareName: reports
    nodeStageSecretRef:
      name: azure-storage-secret     # storage account name and key
      namespace: dev`,
      },
    ],
    followUps: [
      'How does secret rotation reach a running pod, and does the app need to reload it?',
      'Why does the synced Kubernetes Secret disappear when no pod mounts the volume?',
      'How would you troubleshoot a pod stuck in ContainerCreating with a mount error?',
    ],
    tags: ['kubernetes', 'csi', 'key vault', 'secrets store', 'workload identity', 'azure files'],
  },
]
