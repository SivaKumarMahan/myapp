import type { InterviewQuestion } from '../../../types'

/** Architecture, core objects, workload controllers, storage, namespaces and extending the API. */
export const myKubernetesArchitectureQuestions: InterviewQuestion[] = [
  {
    id: 'itv-myk8s-1',
    level: 'basic',
    kind: 'open',
    prompt: 'Explain Kubernetes architecture.',
    probing:
      'Whether you can name each control-plane and node component and trace a request from kubectl apply to a running Pod.',
    answer: [
      'Kubernetes has two parts: a control plane and worker nodes. The API server is the front door. It authenticates requests, checks permissions, validates the data, and exposes the cluster API.',
      'etcd stores the desired and current state of the cluster.',
      'The scheduler picks a node for each new Pod. The controller managers continuously reconcile objects like Deployments and Nodes — that means they keep checking the actual state and pushing it back toward the desired state.',
      'On each worker node, kubelet watches the Pods assigned to it and tells a container runtime, such as containerd, to run them. A CNI plugin handles Pod networking. Service routing is handled by kube-proxy or, in newer setups, an eBPF data plane.',
      "Here's the flow end to end. You run `kubectl apply`, which sends the desired state to the API server. The API server saves that state. The Deployment controller creates a ReplicaSet and Pods. The scheduler binds the Pods to nodes. Kubelet runs them. The controllers keep reconciling in the background.",
      'In a managed service like EKS or AKS, the cloud provider runs the control plane for you. You still own the nodes, the workloads, and the configuration, and you still have to design for high availability yourself. Control Plane',
      '- **kube-apiserver:** Front end for Kubernetes API requests and the main communication hub.\n- **etcd:** Strongly consistent key-value store containing cluster state.\n- **kube-scheduler:** Assigns unscheduled Pods to suitable nodes.\n- **kube-controller-manager:** Runs controllers that reconcile resources such as nodes, Deployments, and Jobs.\n- **cloud-controller-manager:** Integrates supported cloud-provider capabilities.',
      '**Worker Node** components:',
      '- **kubelet:** Ensures the containers described by Pod specifications are running on its node.\n- **Container runtime:** Pulls images and runs containers.\n- **kube-proxy or eBPF data plane:** Implements Service networking, depending on the cluster network implementation.\n- **CNI plugin:** Provides Pod networking and often NetworkPolicy enforcement.',
      'If the control plane is temporarily unavailable, existing containers can keep running, but new scheduling, updates, and controller-driven recovery stop. A production cluster should use a highly available control plane.',
    ],
    tags: ['architecture', 'control plane'],
  },
  {
    id: 'itv-myk8s-2',
    level: 'basic',
    kind: 'open',
    prompt: 'How is Kubernetes different from a container runtime such as Docker?',
    probing:
      'Whether you understand that Kubernetes orchestrates containers across nodes and still needs a CRI runtime underneath.',
    answer: [
      'Docker and other container runtimes run containers on a host. Kubernetes orchestrates containers across a cluster by declaring desired state, scheduling workloads, maintaining replicas, exposing services, managing configuration, and recovering from failures.',
      '- **Container runtime**: Runs containers | **Kubernetes**: Orchestrates containerized workloads\n- **Container runtime**: Usually scoped to one host | **Kubernetes**: Coordinates multiple nodes\n- **Container runtime**: Container lifecycle is managed directly | **Kubernetes**: Controllers continuously reconcile — bring the actual state in line with the desired state\n- **Container runtime**: Networking and scaling are configured manually | **Kubernetes**: Provides service discovery, rollout, and scaling APIs',
      'Kubernetes still needs a CRI-compatible runtime such as containerd. Kubernetes is not a replacement for container images or runtimes.',
    ],
    tags: ['containers', 'runtime'],
  },
  {
    id: 'itv-myk8s-3',
    level: 'intermediate',
    kind: 'open',
    prompt: 'What are the roles of kubelet, kube-apiserver, and kube-proxy in EKS?',
    probing:
      'Whether you know what each component does on EKS, what AWS manages, and what degrades when the API server is unreachable.',
    answer: [
      "In EKS, AWS runs the highly available API server for you. It's the front door for every request, and it handles authentication, authorization, admission, and validation.",
      "Kubelet runs on each worker node. It registers the node, reports its status, and makes sure the containers in its assigned Pods match their specs by talking to the container runtime. Kube-proxy sets up the networking rules that translate a Service's stable virtual IP into the actual Pod IPs behind it. Some CNI or eBPF setups replace this function.",
      'If the API server becomes unreachable, existing containers usually keep running. But scheduling, exec and log access, status updates, and controller actions all degrade.',
      'When I troubleshoot this, I check node status, the kubelet journal, EKS control-plane logs, security groups, routes, DNS, certificate and IAM authentication, and the health of CNI and kube-proxy.',
      'I cordon an unstable node before doing any corrective work on it.',
    ],
    tags: ['eks', 'kubelet', 'kube-proxy'],
  },
  {
    id: 'itv-myk8s-4',
    level: 'intermediate',
    kind: 'open',
    prompt:
      'There is 1 master and 3 worker nodes. If the master fails, what happens? Will Pods keep running or crash?',
    probing:
      'Whether you know running Pods survive a control-plane outage but scheduling, scaling and self-healing stop.',
    answer: [
      '**What happens if the master fails:** The pods already running on the worker nodes keep running normally. Worker nodes and their `kubelet` processes keep the containers alive on their own.',
      'But no new pods can be scheduled and no changes can be applied, because:',
      "- The scheduler is down.\n- The API server is unreachable.\n- The control plane can't make any decisions.",
      'So the cluster is temporarily frozen. Workloads keep running, but nothing management-related works — no deployments, no scaling, no restarts if a node crashes.',
      'The fix is a highly available control plane: run multiple master nodes spread across zones, for example three masters. That way, if one master fails, the cluster keeps working normally.',
    ],
    tags: ['control plane', 'high availability'],
  },
  {
    id: 'itv-myk8s-5',
    level: 'intermediate',
    kind: 'open',
    prompt: 'What happens, step by step, after you run kubectl apply -f app.yaml?',
    probing:
      'Whether you can walk the full path: authn, authz, admission, etcd, controllers, scheduler, kubelet, CRI, CNI, CSI and probes.',
    answer: [
      '`kubectl` submits a declarative object to the API server. Authentication, authorization, admission, and schema validation run before the desired state is persisted in etcd.',
      'Controllers observe the new state and create or update lower-level objects such as ReplicaSets. The scheduler assigns unscheduled Pods using resources, affinity, taints, topology, and policy.',
      'Kubelet on the selected node asks the container runtime through CRI to pull the image and start containers. Probes determine whether the container is alive and ready; Services and Ingress route only when endpoints and readiness are correct.',
      "1. `kubectl` reads the manifest, resolves its API resource, and sends an authenticated request to the API server.\n2. The API server performs authentication, authorization, schema/defaulting and admission checks, then persists accepted desired state in etcd.\n3. Informers notify the relevant reconcilers. For a Deployment, its controller creates or updates a ReplicaSet, and the ReplicaSet controller creates Pods. For a Pod created directly, there is no workload controller in this creation path.\n4. The scheduler watches unscheduled Pods and selects a node using resource requests, constraints, affinity, taints/tolerations, topology, and policy.\n5. The selected node's kubelet observes the PodSpec and asks the container runtime through CRI to pull images and start containers. CNI configures networking and CSI mounts storage where required.\n6. Kubelet reports status through the API server. Readiness controls whether Services send traffic; liveness and startup probes govern restart behavior.",
      'When this flow fails, investigate the stage indicated by evidence: API/RBAC/admission errors, controller events, Pending scheduling events, image-pull failures, CNI/CSI errors, probe failures, or application logs.',
      'Start with `kubectl describe`, events, current and previous logs, and the owning controller rather than repeatedly deleting the Pod.',
    ],
    tags: ['api server', 'reconciliation', 'kubectl'],
  },
  {
    id: 'itv-myk8s-6',
    level: 'basic',
    kind: 'open',
    prompt: 'What are Pods, Deployments, and Services?',
    probing:
      'Whether you can define the three core objects and explain how labels, readiness and EndpointSlices tie them together.',
    answer: [
      'A Pod is the smallest schedulable unit in Kubernetes. It holds one or more tightly coupled containers that share the same IP address, port space, and any declared volumes.',
      'A Deployment declares a stateless Pod template and a replica count. It manages ReplicaSets underneath, which gives you self-healing, rolling updates, and rollback.',
      'A Service selects Pods by label and gives them a stable DNS name and IP, even though the Pods themselves come and go and their addresses change.',
      "For example, say three API Pods are controlled by a Deployment, and a ClusterIP Service called `orders-api` selects the label `app: orders`. Clients call the Service's DNS name, and EndpointSlices keep track of which Pods are currently ready.",
      'During a rollout, the Deployment creates new Pods, readiness gates when they start receiving traffic through the Service, and the old Pods terminate gradually.',
      'I verify all of this with `kubectl get deploy,rs,pods,svc,endpointslice`, rollout status, events, and a test request from a debug Pod.',
      'A Pod is the smallest schedulable unit. Containers in one Pod share:',
      '- One network namespace, Pod IP, and port space\n- `localhost` connectivity\n- Declared volumes\n- Pod metadata and lifecycle',
      'Two containers in the same Pod cannot bind the same IP and port at the same time.',
    ],
    tags: ['pods', 'deployments', 'services'],
  },
  {
    id: 'itv-myk8s-7',
    level: 'basic',
    kind: 'open',
    prompt: 'What is a ConfigMap and what is a Secret?',
    probing:
      'Whether you know a Secret is only base64-encoded by default and how config reaches a Pod as env vars or files.',
    answer: [
      "A ConfigMap stores non-sensitive configuration — key/value pairs or whole files. A Secret stores sensitive data, but by default it's only base64-encoded, not encrypted — encoding is not the same as encryption. Both can be exposed to a Pod as environment variables or as mounted volumes.",
      "I keep the application image immutable, meaning it doesn't change after it's built, and separate from the environment configuration. I never put passwords in ConfigMaps or in Git. Production secrets come from a system like Vault, AWS Secrets Manager, or Azure Key Vault, using workload identity and tools like External Secrets or a Secrets Store CSI driver where possible.",
      'I also turn on encryption at rest, use least-privilege RBAC, meaning roles that grant only the access someone actually needs, enable audit logging, rotate credentials, and isolate secrets by namespace.',
      'Updating an environment variable requires the Pod to be recreated. A mounted, projected file may refresh on its own, but the application still has to reread it. When troubleshooting, I check the object and key names, the namespace, the volume or event, permissions, the rendered value without printing the secret itself, and whether consumers of the value have been rolled out.',
      '- **ConfigMap:** Non-sensitive configuration.\n- **Secret:** Sensitive data; base64 encoding is not encryption.\n- **ServiceAccount:** Workload identity within the Kubernetes API.\n- **Namespace:** Logical isolation and scope for namespaced resources.',
      'Prefer an external secret manager and workload identity for production credentials. Apply encryption at rest, RBAC, audit logging, and least privilege (only the permissions needed).',
    ],
    tags: ['configmap', 'secrets'],
  },
  {
    id: 'itv-myk8s-8',
    level: 'basic',
    kind: 'open',
    prompt: 'What is a ReplicaSet and how does it ensure the desired Pod count?',
    probing:
      'Whether you understand the selector, template and replica-count reconcile loop, and why you use a Deployment instead.',
    answer: [
      'A ReplicaSet is defined by a label selector, a Pod template, and a desired replica count. Its controller compares the number of matching, active Pods against that desired count. Too few, and it creates more. Too many, and it deletes the extras.',
      'It keeps reconciling continuously, so if you delete one Pod it manages, a replacement shows up.',
      "In practice I create a Deployment rather than a ReplicaSet directly, because a Deployment adds versioned rollout and rollback and manages multiple ReplicaSets underneath. If replicas aren't appearing, I check the Deployment and ReplicaSet conditions, events, whether the selector matches the template labels, quota, admission, and scheduling:",
      'A correct replica count only proves the Pods exist — not that the application is actually ready. I still have to check readiness and the Service endpoints separately.',
    ],
    code: [
      {
        title: 'Why replicas are not appearing',
        language: 'bash',
        code: `kubectl describe deploy api
kubectl describe rs <name>
kubectl get events --sort-by=.metadata.creationTimestamp`,
      },
    ],
    tags: ['replicaset', 'controllers'],
  },
  {
    id: 'itv-myk8s-9',
    level: 'basic',
    kind: 'open',
    prompt: 'What is the difference between ReplicaSet, Deployment, StatefulSet, and DaemonSet?',
    probing:
      'Whether you choose a workload controller by identity and lifecycle, not just by whether the app has data.',
    answer: [
      '- A ReplicaSet keeps N interchangeable, matching Pods running.\n- A Deployment manages ReplicaSets to give you stateless rolling updates and rollback.\n- A StatefulSet gives replicas a stable ordinal name and DNS entry, usually one PVC per Pod, and ordered behavior.\n- A DaemonSet runs one Pod per eligible node — typically used for CNI, log collection, metrics, security, or storage agents.',
      'I choose based on identity and lifecycle, not just on whether the workload has data. A stateless API uses a Deployment. A database that needs `db-0` and its own volume might use a StatefulSet, though a managed database service is often the better call. A node-level log collector uses a DaemonSet.',
      "Whatever I pick, it still needs probes, resource limits, security settings, monitoring, and a disruption plan. To verify it's working, I look at the controller's conditions, the desired/current/ready counts, events, and how the workload actually behaves.",
      '- **ReplicaSet**: Maintains a desired number of matching Pods\n- **Deployment**: Manages stateless replicas and declarative rollouts\n- **StatefulSet**: Provides stable identities, ordered behavior, and per-Pod storage templates\n- **DaemonSet**: Runs a Pod on every eligible node or selected group of nodes\n- **Job**: Runs work to completion\n- **CronJob**: Creates Jobs on a schedule',
      'Deleting `app-1` from a StatefulSet recreates `app-1`; the other Pods are not renamed. Stable ordinals preserve network and storage identity.',
      'DaemonSet Pods receive tolerations for several node conditions, but scheduling onto control-plane nodes normally requires an explicit toleration for the applicable control-plane taint.',
      '- Pod: smallest runnable unit; one or more tightly coupled containers.\n- Deployment/ReplicaSet: stateless replicas, rollout, rollback, and desired count.\n- StatefulSet: stable identity and storage orchestration; it does not itself replicate application data.\n- DaemonSet: one Pod on every matching node, commonly agents and node services.\n- Job/CronJob: finite or scheduled work.\n- ConfigMap/Secret: non-secret configuration versus sensitive values; Secret objects still require encryption, RBAC, and safe delivery.\n- PV/PVC/StorageClass: supplied storage, a workload claim, and dynamic provisioning policy.\n- Namespace/RBAC: organizational and authorization boundaries; stronger multi-tenancy also needs policy, quotas, and network isolation.',
    ],
    tags: ['workloads', 'statefulset', 'daemonset'],
  },
  {
    id: 'itv-myk8s-10',
    level: 'intermediate',
    kind: 'open',
    prompt: 'What is the difference between a Deployment and a StatefulSet?',
    probing:
      'Whether you know stable ordinals, headless Services and volumeClaimTemplates, and that a StatefulSet does not replicate data.',
    answer: [
      'Deployment Pods are interchangeable. They get randomly generated names, support flexible parallel rolling updates, and are the right choice for stateless services.',
      "StatefulSet Pods have a stable, ordinal identity, like `db-0`. They get stable DNS through a headless Service, they're created and deleted in order by default, and `volumeClaimTemplates` keeps one PVC tied to each ordinal.",
      "If you delete `db-1`, Kubernetes recreates `db-1` — the other Pods don't get renamed, and its PVC normally stays intact. A StatefulSet by itself doesn't make an application highly available or replicate its data. The database itself still has to handle quorum, replication, and backup.",
      'Before I use a StatefulSet, I check the storage topology, the Pod management and update strategy, failover behavior, backups, and disruption handling. A managed database can reduce a lot of that operational risk.',
    ],
    tags: ['statefulset', 'deployments'],
  },
  {
    id: 'itv-myk8s-11',
    level: 'intermediate',
    kind: 'open',
    prompt: 'When should you use a StatefulSet instead of a Deployment?',
    probing:
      'Whether you can justify a StatefulSet from identity and storage needs, and consider a managed service or operator instead.',
    answer: [
      'I reach for a StatefulSet when the workload needs a stable member identity, stable per-replica storage, predictable DNS, or an ordered lifecycle. Examples are ZooKeeper, Kafka, or a database cluster where membership depends on ordinal position.',
      "Before choosing it, I ask a few questions. Can replicas be swapped out interchangeably? Does each one need its own volume? Who's responsible for replication, leader election, backup, repair, and upgrades? Would a managed service or operator be safer?",
      "I test what happens when a Pod is deleted or rescheduled, when a zone fails and storage has to reattach, an ordered rollout, scaling up and down, backup and restore, and losing quorum. If the application's state actually lives outside the Pods and the Pods are interchangeable, a Deployment is simpler — even if those Pods mount shared, read-only data.",
    ],
    tags: ['statefulset', 'design'],
  },
  {
    id: 'itv-myk8s-12',
    level: 'intermediate',
    kind: 'open',
    prompt: 'Can you attach a volume to a Deployment? How is it different from a StatefulSet?',
    probing:
      'Whether you know access modes limit shared PVCs and that volumeClaimTemplates give each ordinal its own disk.',
    answer: [
      "Yes. A Deployment's Pod template can mount ConfigMap, Secret, ephemeral, host, or persistent volumes.",
      "Having multiple replicas reference the same PVC only works if the storage's access mode and backend actually support that kind of concurrent access. A typical block disk with ReadWriteOnce access can't be mounted read-write from multiple nodes at once.",
      "A StatefulSet's `volumeClaimTemplates`, on the other hand, creates a predictable PVC per ordinal — something like `data-db-0` — and that PVC stays tied to the Pod even when it's replaced. That's what gives each member its own disk with a stable identity.",
      "I check the PVC and PV access mode, the StorageClass, the reclaim policy, topology, mount events, CSI logs, and the application's own concurrency assumptions. For stateless applications, I try to keep persistent state outside the Pods entirely.",
      "If you need shared content, use a storage backend that's actually built for multiple writers — don't assume switching to a Deployment changes the underlying storage rules.",
    ],
    tags: ['storage', 'deployments', 'statefulset'],
  },
  {
    id: 'itv-myk8s-13',
    level: 'basic',
    kind: 'open',
    prompt: 'What is a DaemonSet and when would you use it?',
    probing:
      'Whether you can name real DaemonSet use cases and the cluster-wide risk of a badly sized or privileged one.',
    answer: [
      'A DaemonSet makes sure one Pod runs on every eligible node, based on labels, affinity, and tolerations. When a node joins the cluster, it gets a Pod. When a node leaves, that Pod goes with it.',
      'Typical uses are Fluent Bit, node-exporter, a CNI or CSI node plugin, a security agent, or anything that needs host networking or storage access.',
      'Because this Pod runs on every node, I always set resource requests and limits for it, restrict hostPath and privileged access, choose the right tolerations, and pick a sensible `maxUnavailable` for updates. A broken DaemonSet can affect the whole cluster at once.',
      "I check the desired, current, ready, and misscheduled counts, events, per-node coverage, logs, and the node-level resource impact. Control-plane nodes need explicit toleration and compatibility — I don't assume every DaemonSet should run there.",
      "A **DaemonSet** in Kubernetes ensures that a copy of a specific pod runs on all (or selected) nodes in the cluster. It's used for deploying system-level services that need to run on every node, such as log collectors, monitoring agents, or network plugins.",
      '**Use cases for DaemonSets:**',
      '- **Log Collection:** Deploying log collection agents (e.g., Fluentd, Logstash) on all nodes to gather and forward logs.\n- **Monitoring:** Running monitoring agents (e.g., Prometheus Node Exporter, Datadog Agent) on each node to collect metrics.\n- **Networking:** Deploying network plugins (e.g., Calico, Weave) that require a pod on every node for network management.\n- **Storage:** Running storage daemons (e.g., GlusterFS, Ceph) that need to be present on all nodes for distributed storage.',
      '**Example DaemonSet YAML:** In this example, a DaemonSet named `log-collector` deploys a Fluentd container on every node in the cluster to collect logs.',
    ],
    code: [
      {
        title: 'DaemonSet running a log collector on every node',
        language: 'yaml',
        code: `apiVersion: apps/v1
kind: DaemonSet
metadata:
  name: log-collector
spec:
  selector:
    matchLabels:
      app: log-collector
  template:
    metadata:
      labels:
        app: log-collector
    spec:
      containers:
      - name: fluentd
        image: fluent/fluentd:latest
        resources:
          limits:
            memory: "200Mi"
            cpu: "100m"`,
      },
    ],
    tags: ['daemonset'],
  },
  {
    id: 'itv-myk8s-14',
    level: 'intermediate',
    kind: 'open',
    prompt:
      'If you want two Pods per node instead of one, what alternatives to DaemonSet can you use?',
    probing:
      'Whether you question the requirement and know a Deployment with spreading cannot guarantee exactly two per node.',
    answer: [
      'A single DaemonSet only ever creates one Pod per eligible node. If you genuinely need two independent agents, running two separate DaemonSets is the clearest way to do it.',
      "A Deployment with replicas set to twice the number of eligible nodes, combined with topology spreading, can aim for an even distribution — but it doesn't actually guarantee exactly two Pods per node as nodes come and go.",
      "Before building either, I ask why two are needed. If it's about throughput, one multi-threaded agent might solve it better. If it's about redundancy, a Deployment might be the answer instead. I define `topologySpreadConstraints` by hostname, account for capacity, anti-affinity, and autoscaler behavior, and then test adding, removing, and failing nodes.",
      'The scheduling policy should express the actual requirement, not lean on a replica-count formula that goes stale the moment the cluster changes shape.',
    ],
    tags: ['daemonset', 'scheduling', 'topology spread'],
  },
  {
    id: 'itv-myk8s-15',
    level: 'basic',
    kind: 'open',
    prompt: 'What is the difference between a Kubernetes Job and CronJob?',
    probing:
      'Whether you know Job completions and backoffLimit, CronJob concurrencyPolicy, and why tasks must be idempotent.',
    answer: [
      'A Job runs a one-off task until it reaches the required number of successful completions. It supports parallelism and a `backoffLimit` for retries. A CronJob creates Jobs on a schedule, and adds a `concurrencyPolicy`, a starting deadline, the ability to suspend, and history limits.',
      "For a backup CronJob, I set `concurrencyPolicy: Forbid` so runs don't overlap, pick the right timezone and schedule, set an active deadline and resource requests, and alert on a missed or failed Job.",
      'The task itself needs to be idempotent — safe to run more than once — because retries or duplicate scheduling can happen. I make the output use unique transaction or backup IDs to guarantee that.',
      "I check the CronJob's last schedule time, the Jobs it created, Pod events and logs, exit codes, the timezone, controller availability, and concurrency. A successful Job doesn't prove the backup is restorable — I still need to test restores separately.",
    ],
    tags: ['jobs', 'cronjob'],
  },
  {
    id: 'itv-myk8s-16',
    level: 'intermediate',
    kind: 'open',
    prompt:
      'I want to run a one-time database migration task before my application starts. How can I achieve this in Kubernetes?',
    probing:
      'Whether you know init containers run to completion before the app starts, and when a Job or hook is better.',
    answer: [
      'Use Init Containers, which run and complete before the main containers start:',
      'Init containers are perfect for migrations, schema updates, or data seeding.',
    ],
    code: [
      {
        title: 'Init container running a migration before the app',
        language: 'yaml',
        code: `spec:
  initContainers:
  - name: migration
    image: myapp:migration
    command: ['sh', '-c', 'run-migration.sh']
    env:
    - name: DB_HOST
      value: "postgres-service"
  containers:
  - name: app
    image: myapp:latest`,
      },
    ],
    tags: ['init containers', 'migrations'],
  },
  {
    id: 'itv-myk8s-17',
    level: 'basic',
    kind: 'open',
    prompt:
      'How do you enter a running Pod, and what is the correct way to define Kubernetes objects?',
    probing:
      'Whether you can exec or debug into a Pod safely and describe an object with apiVersion, kind, metadata and spec.',
    answer: [
      'I identify the namespace, Pod, and container, and run only the command I actually need:',
      "A minimal image might not even have a shell, so I use an approved ephemeral debug container with `kubectl debug` instead. I avoid installing tools or permanently changing configuration inside a running container, since those changes aren't tracked anywhere and just disappear the moment it restarts.",
      'Objects are declared with `apiVersion`, `kind`, `metadata`, and `spec`, then reviewed and applied through GitOps or `kubectl apply -f`. I validate manifests with a server-side dry-run, schema and policy checks, and a diff, then verify the rollout and application health afterward.',
      'CRDs extend the API with entirely new object types. A StorageClass, by the way, is a specific storage-provisioning object — not a general-purpose Kubernetes "class" of anything.',
      'To access a pod in Kubernetes, you can use the `kubectl exec` command. This command allows you to run commands inside a running pod.',
      "**2. Once you have the pod name, use the following command to access it:** Replace `<pod-name>` with the actual name of your pod. The `-it` flags allow you to interactively access the pod's shell.",
      '**Defining/creating a Kubernetes object:** In Kubernetes, every resource like a Pod, Deployment, or Service is an **object** in the Kubernetes API. These objects are defined in YAML manifests with fields like `apiVersion`, `kind`, `metadata`, and `spec`.',
      "Here's an example of a simple Pod object using a YAML file:",
      'Save this YAML content to a file named `my-pod.yaml` and then create the Pod using:',
      'This command will create the Pod in your Kubernetes cluster based on the specifications defined in the YAML file.',
      '**What is a Kubernetes "class"?** In Kubernetes, there isn\'t a concept specifically called a "Kubernetes class." However, you might be referring to **Custom Resource Definitions (CRDs)** or **Storage Classes**:',
      '- **Custom Resource Definitions (CRDs)** allow you to define your own resource types in Kubernetes, enabling you to extend the Kubernetes API.\n- **Storage Classes** define different types of storage (like SSDs, HDDs) that can be dynamically provisioned for Persistent Volumes in Kubernetes.',
      'A Kubernetes manifest is YAML or JSON describing the desired state of an API object.',
      'Common manifests define Deployments, StatefulSets, Services, Ingresses, ConfigMaps, Secrets, HPAs, Jobs, and NetworkPolicies.',
    ],
    code: [
      {
        title: 'Find the Pod and open a shell',
        language: 'bash',
        code: `kubectl get pods -n payments
kubectl exec -it -n payments api-7d9f6 -c api -- /bin/sh`,
      },
      {
        title: 'List Pods',
        language: 'bash',
        code: `kubectl get pods`,
      },
      {
        title: 'Open a shell in a Pod',
        language: 'bash',
        code: `kubectl exec -it <pod-name> -- /bin/bash`,
      },
      {
        title: 'Simple Pod manifest',
        language: 'yaml',
        code: `apiVersion: v1
kind: Pod
metadata:
  name: my-pod
spec:
  containers:
  - name: my-container
    image: nginx
    ports:
    - containerPort: 80`,
      },
      {
        title: 'Create the Pod',
        language: 'bash',
        code: `kubectl apply -f my-pod.yaml`,
      },
      {
        title: 'Deployment manifest',
        language: 'yaml',
        code: `apiVersion: apps/v1
kind: Deployment
metadata:
  name: web
spec:
  replicas: 3
  selector:
    matchLabels:
      app: web
  template:
    metadata:
      labels:
        app: web
    spec:
      containers:
        - name: web
          image: example/web:1.0.0`,
      },
    ],
    tags: ['kubectl', 'manifests', 'exec'],
  },
  {
    id: 'itv-myk8s-18',
    level: 'basic',
    kind: 'open',
    prompt: 'What does `kubectl describe` do, and how do you use it during troubleshooting?',
    probing:
      'Whether you know what describe shows (state, conditions, events) and what it does not replace (logs, YAML, metrics).',
    answer: [
      '`kubectl describe <resource> <name>` gives you a human-readable view of the live object: metadata, selected spec and status fields, Conditions, related resources, and recent Events. Common examples are `kubectl describe pod`, `kubectl describe node`, and `kubectl describe pvc`.',
      "For a Pod, I look at the container state, the last termination reason and exit code, the image, mounts, probes, requests and limits, where it's placed, and any scheduling, image-pull, probe, or volume Events.",
      "It doesn't replace logs, metrics, or the full YAML, so I compare it against `kubectl logs --previous`, the sorted Events, `kubectl get -o yaml`, node or runtime logs, and monitoring data.",
      'I fix the cause once I actually have evidence for it, then confirm the Conditions, readiness, and the real application transaction all recover.',
    ],
    tags: ['kubectl', 'troubleshooting'],
  },
  {
    id: 'itv-myk8s-19',
    level: 'intermediate',
    kind: 'open',
    prompt: 'etcd is a key-value store. Can you write something to it manually?',
    probing:
      'Whether you know etcdctl can write to etcd but that bypassing the API server risks an inconsistent cluster.',
    answer: [
      "Yes, you can write data manually to etcd in Kubernetes, but it's generally not a good idea.",
      '- etcd is the backing store for all cluster data in Kubernetes. Modifying its contents by hand can leave the cluster inconsistent or unstable.\n- If you do need to interact with etcd directly, use the `etcdctl` command-line tool.\n- Make sure the `etcdctl` version you use matches your etcd server version.\n- Back up your etcd data before making any changes.',
      "Here's a basic example of how to interact with etcd using `etcdctl`:",
      'Remember, direct manipulation of etcd should be done with extreme caution and typically only in advanced scenarios where you fully understand the implications. In most cases, it is better to use `kubectl` and Kubernetes APIs to manage cluster state.',
    ],
    code: [
      {
        title: 'etcdctl put, get and delete',
        language: 'bash',
        code: `# Set environment variables for etcdctl
export ETCDCTL_API=3
export ETCDCTL_ENDPOINTS=https://<etcd-server-ip>:2379
export ETCDCTL_CACERT=/path/to/ca.crt
export ETCDCTL_CERT=/path/to/client.crt
export ETCDCTL_KEY=/path/to/client.key

# Put a key-value pair
etcdctl put mykey "myvalue"

# Get a value by key
etcdctl get mykey

# Delete a key
etcdctl del mykey`,
      },
    ],
    tags: ['etcd'],
  },
  {
    id: 'itv-myk8s-20',
    level: 'intermediate',
    kind: 'open',
    prompt:
      'Explain PersistentVolumes, PersistentVolumeClaims, StorageClasses and the volume access modes.',
    probing:
      'Whether you can explain PV, PVC, StorageClass, CSI and each access mode, and that a mount is not a backup.',
    answer: [
      '- **PersistentVolume (PV):** Cluster storage resource.\n- **PersistentVolumeClaim (PVC):** Namespaced request for storage.\n- **StorageClass:** Defines dynamic provisioning behavior.\n- **VolumeSnapshot:** Snapshot API object when supported by the CSI driver.',
      'The common access modes are:',
      '- `ReadWriteOnce` (RWO): read-write from a single node; multiple Pods on that node may be possible depending on the driver.\n- `ReadWriteOncePod` (RWOP): read-write by one Pod.\n- `ReadOnlyMany` (ROX): read-only from many nodes.\n- `ReadWriteMany` (RWX): read-write from many nodes.',
      'Zone-bound disks can prevent a StatefulSet Pod from mounting after scheduling into another zone. Use topology-aware StorageClasses, appropriate node affinity, and a tested backup/restore strategy.',
      'A single PV is normally bound to one PVC. Cross-namespace failures are more commonly caused by multiple PVs using the same storage backend or by an RWX service failure, not multiple ordinary PVCs binding independently to one PV.',
      'Use no persistent mount for stateless workloads whose local data can disappear when a container or Pod is replaced. Use `emptyDir` only for Pod-lifetime scratch space shared by containers.',
      'Use a PVC for data that must survive Pod replacement; choose the StorageClass, access mode, capacity, topology, expansion, snapshot and backup behavior from application requirements. A mount is not itself a backup, and stateful databases also require application-consistent recovery testing.',
      "A PersistentVolumeClaim is the workload's request for capacity, access mode, and optionally a StorageClass. A PersistentVolume represents storage made available to the cluster.",
      'A StorageClass and CSI driver can dynamically provision a suitable PV, after which the claim binds to it and the Pod mounts the claim:',
      'The PV lifecycle is independent of an individual Pod, but data survival also depends on the reclaim policy, storage service, zone topology, backup, and restore design.',
      'In AKS, Azure Disk commonly fits single-node block storage and Azure Files supports shared file access; choose through workload access and performance requirements rather than assuming all persistent storage behaves the same.',
    ],
    code: [
      {
        title: 'Pod to storage chain',
        language: 'text',
        code: `Pod -> PVC -> bound PV -> CSI-backed storage`,
      },
    ],
    tags: ['storage', 'pv', 'pvc'],
  },
  {
    id: 'itv-myk8s-21',
    level: 'intermediate',
    kind: 'open',
    prompt: 'How do PV and PVC behave across zones in EKS or Kubernetes in general?',
    probing:
      'Whether you know zonal disks pin Pods to a zone and that WaitForFirstConsumer delays binding until scheduling.',
    answer: [
      'A PVC is a namespaced request for storage. A PV is the actual cluster storage object it binds to. Dynamic provisioning uses a StorageClass to create that PV automatically.',
      'With EBS, the disk and its PV are tied to one availability zone, so the Pod has to be scheduled there too. Setting `volumeBindingMode: WaitForFirstConsumer` delays provisioning and binding until the scheduler already knows where the Pod will land.',
      "I only configure allowed topologies when it's actually required, and I spread StatefulSet replicas using topology rules while making sure each volume stays reachable from wherever its Pod lands. When a PVC is stuck Pending, I check the StorageClass and whether there's a default one, capacity, access mode, the CSI provisioner, quota, events, and topology.",
      "If the Pod is Pending after the PVC is already bound, I check the PV's node affinity against the nodes that are actually eligible.",
      'Multi-AZ availability for an application needs replicated application data or storage designed for that — not a single zonal disk that somehow spans zones on its own.',
    ],
    tags: ['storage', 'zones', 'eks'],
  },
  {
    id: 'itv-myk8s-22',
    level: 'basic',
    kind: 'open',
    prompt: 'What is a Namespace, and is it a security boundary?',
    probing:
      'Whether you know what namespaces scope, that they are not a security boundary alone, and which objects are cluster-scoped.',
    answer: [
      'A Namespace is a logical scope within one Kubernetes cluster. It organizes resources by team, application, tenant or environment and enables namespace-scoped RBAC, ResourceQuota, LimitRange, NetworkPolicy and name isolation.',
      'The same resource name can exist in separate namespaces, so `dev/nginx`, `qa/nginx` and `production/nginx` do not conflict.',
      'Namespaces are not strong security boundaries by themselves. Pods can normally communicate across namespaces through Services such as `api.payments.svc.cluster.local`; use enforced ingress and egress NetworkPolicies, workload identity and least-privilege RBAC to allow only the required paths.',
      'Cluster-scoped objects such as Nodes, PersistentVolumes and StorageClasses are not namespaced.',
    ],
    code: [
      {
        title: 'Same name in different namespaces',
        language: 'bash',
        code: `kubectl get pods -n dev
kubectl get pods -n qa
kubectl get pods -n production`,
      },
    ],
    tags: ['namespaces', 'multi-tenancy'],
  },
  {
    id: 'itv-myk8s-23',
    level: 'intermediate',
    kind: 'open',
    prompt: 'Tell the building-blocks story: why does each core Kubernetes concept exist?',
    probing:
      'Whether you understand why each object exists by the problem it solves, rather than reciting definitions.',
    answer: [
      'Each Kubernetes concept exists because the previous one was not enough. This is the progression from a single Pod to a fully elastic, predictable cluster.',
      '**You start with a Pod:** A Pod runs your container. Simple, clean, done — until it crashes. Nobody restarts it; it is just gone. In production, that is not acceptable.',
      '**So you use a Deployment:** A Deployment watches your pods. One dies and it creates another. You want 3 running, it keeps 3 running. You want to scale to 10, one command does it. **Pods were too fragile for production. Deployment fixed that.**',
      '**The problem: unstable Pod IPs:** Every pod gets a new IP when it restarts. You have 3 pods running your app, and another service needs to talk to them. Which IP do you use? They keep changing. You cannot hardcode them or track them at scale.',
      '**So you use a Service:** A Service gives your app one stable IP address. It finds your pods using labels, not IPs.',
      'Pods die and come back with new IPs, but the Service always finds them. It also distributes incoming traffic across all ready Pods.',
      '**The problem was unstable Pod IPs. A Service provides a stable address and load balancing.**',
      '**The problem: external access (LoadBalancer Service):** Your app still needs to be accessible from the internet, so you use a **LoadBalancer Service**. This creates a real cloud load balancer (AWS ALB, Azure LB, GCP LB) and your app gets a public endpoint.',
      'It works perfectly — until you have 10 services. Now you have 10 load balancers, each costing money every month, even the 6 that handle almost no traffic. **LoadBalancer Services solved external access, but one per service does not scale.**',
      '**So you use Ingress:** One load balancer, all your services behind it. Ingress routes traffic based on rules: a request for `/api` goes to the API service, a request for `/dashboard` goes to the frontend service.',
      'One entry point, smart routing, one cloud load balancer on your bill. But Ingress is just a set of rules — something has to execute them.',
      '**So you use an Ingress Controller:** Nginx, Traefik, the AWS Load Balancer Controller — these are the actual engines that read your Ingress rules and make the routing happen. Ingress without a controller is just a config file nobody reads. **The Ingress Controller made the rules actually work.**',
      '**The problem: configuration:** Now your app is running, but it needs configuration — database URL, API keys, environment name, feature flags. So you hardcode them inside the container.',
      'It works on your laptop. You deploy to staging: wrong database URL.',
      'You deploy to production: wrong API key. You fix it by rebuilding the image every time config changes.',
      'In production, rebuilding an image to change a config value is not acceptable.',
      '**So you use a ConfigMap:** A ConfigMap holds your configuration outside the container. You inject it into your pod at runtime as environment variables or a mounted file.',
      'Change the ConfigMap, redeploy, and the application receives the new values without rebuilding the image. The same image can run in Development, Staging, and Production with different configuration.',
      '**The problem was environment-specific configuration inside the image. A ConfigMap keeps normal configuration outside it.**',
      '**The problem: secrets in plain text:** Your database password is sitting in a ConfigMap. ConfigMaps are not encrypted, and anyone with basic `kubectl` access can read them.',
      'You just stored your production database credentials in plain text inside your cluster. That is not a mistake — that is a security incident.',
      '**So you use a Secret:** A Secret holds sensitive data: passwords, tokens, certificates, API keys. It is stored separately from ConfigMaps with its own access controls.',
      'Your application reads the Secret at runtime, so the image never contains the value. RBAC controls which users and service accounts can read it.',
      '**The problem was sensitive data in a ConfigMap. A Secret provides a separate object with access controls, although it still needs encryption and careful RBAC.**',
      '**The problem: manual scaling:** Traffic starts growing and manual scaling breaks you. Some days 100 users, some days 10,000.',
      'You are running 3 pods; on a busy day all three are maxed out, responses are slow, requests time out. You jump on, bump it to 8 pods, crisis over.',
      'Traffic drops at night and 8 pods sit idle, wasting money. Next spike, you do it all over again.',
      'You cannot babysit your cluster every time traffic changes.',
      '**So you use HPA (Horizontal Pod Autoscaler):** HPA watches your pods continuously. CPU goes above 70 percent, it adds more pods automatically.',
      'Traffic drops, it scales back down automatically. You define the minimum and maximum; Kubernetes does the rest.',
      'Your app handles the spike and you are not woken up at 2am to manually scale. **Manual scaling could not keep up with real traffic. HPA fixed that.**',
      '**The problem: Pending pods with no node capacity:** Scaling pods created a new problem. HPA adds pods during a traffic spike, but your nodes are full.',
      'The new pods sit in `Pending` state — they cannot be scheduled because there is no capacity. HPA did its job, but your cluster had nowhere to put the pods.',
      'Scaling pods without scaling nodes is half a solution.',
      '**So you use Cluster Autoscaler or Karpenter:** They watch for pods stuck in `Pending`. Not enough capacity?',
      'They add a new node automatically, pending pods get scheduled, and traffic is handled. Load drops, nodes sit underutilized, and they remove them automatically — you only pay for the compute you actually need.',
      'On EKS, Karpenter is the better choice: it is faster and more cost efficient, provisioning the exact right node for your workload instead of waiting for a fixed node group to scale. **HPA scaled your pods, Karpenter scaled your nodes — together they make your cluster truly elastic.**',
      '**The problem: uncontrolled resource usage:** One last problem, and it is the one that takes things down silently. Everything is scaling — pods coming up, nodes being added.',
      'One pod starts consuming 4GB of memory when it was never supposed to. Nobody told Kubernetes that, so it keeps consuming, starving every other pod on that node.',
      'Those pods start failing and a cascade begins. One rogue pod with no limits affects your entire node.',
      'An unpredictable cluster is an unreliable cluster.',
      '**So you use Resource Requests and Limits:** Requests tell Kubernetes the minimum your pod needs to be scheduled on a node. Limits tell Kubernetes the maximum it is ever allowed to consume.',
      'The scheduler uses requests when placing Pods on nodes. Limits stop a container from using more than its allowed amount, although memory limits can cause `OOMKilled` and CPU limits can cause throttling.',
      '**The problem was uncontrolled resource use. Requests support scheduling, and limits provide a boundary.**',
      '**The problem: every pod restarts at once during a deploy:** You deploy a new image and every pod restarts at the same time. For 30 seconds your app is completely down, users see errors, and your on-call phone starts ringing.',
      '**So you use a RollingUpdate strategy:** Kubernetes kills one pod, starts a new one, waits for it to be healthy, then moves to the next. Your users never notice the deploy happened. **A simultaneous restart caused downtime. RollingUpdate fixed that.**',
      '**The problem: an unhealthy version still receives traffic:** Your new version has a silent bug. Health checks pass but the app returns wrong data, and by the time you notice, the old version is completely gone.',
      '**So you use a Readiness Probe:** Kubernetes only sends traffic to a pod when it is actually ready to handle it. Bad pods stay out of rotation automatically. **A pod serving traffic before it was truly ready caused bad responses. Readiness probes fixed that.**',
      '**The problem: a restarting pod loses all its data:** Your database pod restarts and loses all its data. Containers are stateless — every restart is a fresh start with an empty disk. That is fine for your API, not fine for Postgres.',
      '**So you use PersistentVolumes and PVCs:** Storage exists outside the pod lifecycle. Your data survives crashes, restarts, and rescheduling. **Ephemeral container storage lost data. PersistentVolumes and PVCs fixed that.**',
      '**The problem: stateful pods need a sticky, ordered identity:** You have one database pod. It gets rescheduled to a different node and needs the same disk to follow it. PVCs work for Deployments, but ordered, sticky identities do not.',
      '**So you use a StatefulSet:** Each pod gets a stable name, a stable identity, and a stable volume that follows it. `pod-0` is always `pod-0`, not some random hash. **Deployments could not give stable identity. StatefulSets fixed that.**',
      '**The problem: a run-once job keeps restarting:** Your ML training job runs for 6 hours and you need exactly one run. A Deployment would keep restarting it forever after it finishes.',
      '**So you use a Job:** Kubernetes runs it to completion and stops. No restarts after success, no babysitting, one clean run. **Deployments could not model run-to-completion work. Jobs fixed that.**',
      '**The problem: you need one pod on every node:** You want a log collector or monitoring agent on every single node, but a Deployment does not guarantee one pod per node.',
      '**So you use a DaemonSet:** One pod lands on every node automatically, including new nodes Karpenter just added. No manual scheduling, no missed nodes. **Deployments could not guarantee per-node coverage. DaemonSets fixed that.**',
      '**The problem: no access guardrails:** Your team keeps accidentally deploying to the wrong namespace and wiping production configs. No guardrails — one bad `kubectl` command causes real damage.',
      '**So you use RBAC:** Roles define what actions are allowed. RoleBindings attach them to users or service accounts. Your junior dev can read logs but cannot delete deployments in prod. **Unrestricted access caused accidental damage. RBAC fixed that.**',
      '**The problem: low-value work steals resources from critical work:** You have a critical payment service and a batch analytics job on the same node. The batch job spikes and steals CPU from payments, tripling checkout latency during every report run.',
      '**So you use PriorityClasses:** Payment pods get high priority, batch pods get low. When nodes run out of resources, Kubernetes evicts the batch job first — not the thing making you money. **Equal treatment of unequal workloads caused contention. PriorityClasses fixed that.**',
      "**The problem: one team starves a shared cluster:** Three teams share one cluster and one team's runaway pods keep starving the others.",
      '**So you use ResourceQuota:** Each namespace gets a hard ceiling on CPU, memory, and object counts. One team cannot blow up the cluster for everyone else. **A shared cluster had no fairness boundaries. ResourceQuota fixed that.**',
      '**The problem: Kubernetes does not understand your complex app:** You need to run Kafka in Kubernetes. Kafka has brokers, topics, partition leadership, and a very specific idea of how it wants to be operated. StatefulSets alone do not know any of that.',
      '**So you use a CRD:** You teach Kubernetes what a Kafka cluster is. Now `kubectl` understands Kafka as a first-class object. But the CRD is just a schema — nobody acts on it. You create a `KafkaCluster` resource and nothing happens.',
      '**So you add an Operator:** It watches your custom resources and takes action — provisioning brokers, handling rebalancing, managing rolling upgrades. It encodes the operational knowledge a human expert would have.',
      'Strimzi does this for Kafka; the Prometheus Operator does it for monitoring stacks. **A CRD alone was just a schema. The Operator made it act.**',
      '**The problem: the wrong pods land on expensive nodes:** Your GPU nodes are expensive, but regular API pods keep landing on them — $8 per hour wasted serving JSON.',
      '**So you use Taints and Tolerations:** GPU nodes are tainted, so only pods that explicitly tolerate that taint can land there. Your API pods never touch the GPU nodes again.',
      'But toleration is just permission, not a guarantee — your ML pods can land on GPU nodes, but they might still end up on CPU nodes.',
      '**So you add Node Affinity:** Your ML pods now declare a hard requirement for nodes with the `gpu=true` label. Permission plus preference becomes a guarantee. **Taints kept the wrong pods off; Node Affinity pulled the right pods on.** The full story',
      '- **Deployment**: A Pod ran your app but had no resilience\n- **Service**: Pods had unstable IPs\n- **Ingress**: One load balancer per service was too expensive\n- **Ingress Controller**: Ingress needed something to execute its rules\n- **ConfigMap**: Hardcoded config made images inflexible\n- **Secret**: ConfigMaps were not safe for sensitive data\n- **HPA**: Manual scaling could not keep up with traffic\n- **Cluster Autoscaler / Karpenter**: Pod scaling without node scaling left pods `Pending`\n- **Resource Requests and Limits**: Uncontrolled resource usage made clusters unpredictable\n- **RollingUpdate strategy**: Restarting every pod at once caused deploy downtime\n- **Readiness Probe**: Pods received traffic before they were truly ready\n- **PersistentVolumes / PVCs**: Ephemeral container storage lost data on restart\n- **StatefulSet**: Deployments could not give stable, ordered identity\n- **Job**: Deployments could not model run-to-completion work\n- **DaemonSet**: Deployments could not guarantee one pod per node\n- **RBAC**: Unrestricted access caused accidental damage\n- **PriorityClasses**: Low-value work stole resources from critical work\n- **ResourceQuota**: One team could starve a shared cluster\n- **CRD**: Kubernetes did not understand complex apps like Kafka\n- **Operator**: A CRD alone was just a schema; nobody acted on it\n- **Taints and Tolerations**: The wrong pods landed on expensive/special nodes\n- **Node Affinity**: Permission alone did not guarantee correct placement',
      'Each concept exists because the previous one was not enough. That is how you stop memorizing Kubernetes and start understanding it.',
    ],
    tags: ['concepts', 'building blocks'],
  },
  {
    id: 'itv-myk8s-24',
    level: 'intermediate',
    kind: 'open',
    prompt:
      'Why does each layer of the Kubernetes tooling ecosystem exist, and what problem does each tool solve?',
    probing:
      'Whether you can explain the gap each popular tool closes instead of listing tool names.',
    answer: [
      'Each tool in the Kubernetes ecosystem exists because the previous layer was not enough. The goal is not to collect tools but to understand the gap each one closes.',
      '- **`kubectl` was painful at scale**: Tool: **K9s** and **Lens**; What it fixed: Fast, visual cluster navigation and troubleshooting instead of raw commands\n- **Manual deployment caused drift**: Tool: **ArgoCD**; What it fixed: GitOps continuous reconciliation keeps the cluster matching Git\n- **HPA only understood CPU**: Tool: **KEDA**; What it fixed: Event-driven autoscaling on queues, custom metrics, and external triggers\n- **Pod scaling without node scaling left Pods `Pending`**: Tool: **Karpenter**; What it fixed: Just-in-time node provisioning to match pod demand\n- **An open network was a risk**: Tool: **Network Policies**; What it fixed: L3/L4 segmentation controlling which pods can talk to each other\n- **Invisible traffic made debugging impossible**: Tool: **Service Mesh**; What it fixed: mTLS, traffic management, and per-request monitoring data between services\n- **Kubernetes Secrets were not secure enough**: Tool: **Secrets Store CSI Driver**; What it fixed: Mounts secrets from external managers (Vault, AWS/Azure) instead of etcd base64\n- **No guardrails meant incidents**: Tool: **Kyverno**; What it fixed: Policy-as-code admission control to validate, mutate, and enforce standards\n- **No numbers meant no answers**: Tool: **Prometheus** and **Grafana**; What it fixed: Metrics collection and dashboards for visibility\n- **Metrics and logs could not connect the dots**: Tool: **Jaeger**; What it fixed: Distributed tracing to follow a request across services',
      'Each layer addresses a limitation the previous one exposed: usability, delivery, scaling (pods, then nodes), security (network, secrets, policy), and observability (metrics, then traces).',
      'That is how you stop collecting tools and start understanding them — by knowing the specific problem each one was adopted to solve.',
    ],
    tags: ['ecosystem', 'tooling'],
  },
  {
    id: 'itv-myk8s-25',
    level: 'intermediate',
    kind: 'open',
    prompt: 'What are your key operations, networking and security notes for Kubernetes?',
    probing:
      'Whether you have the everyday facts straight: kubelet vs kubectl, Service types, probes, drains, security and HA.',
    answer: [
      'These are the points I keep in my operations, networking and security notes:',
      "- `kubelet` runs on each node. It reconciles the Pod specs assigned to that node with the container runtime — it keeps what's actually running in line with what was requested. `kubectl` is just the client CLI; it is not a control-plane component. Metrics Server supplies the resource metrics behind `kubectl top` and, usually, HPA.\n- A Service selects ready Pods by labels. `ClusterIP` is internal-only. `NodePort` exposes a port on every node. A headless Service (`clusterIP: None`) returns Pod endpoints directly instead of a single virtual IP, which is common for StatefulSets. Ingress and Gateway resources define HTTP(S) routing, but they need an installed controller or data plane to actually implement that routing.\n- Readiness controls whether a Pod receives traffic. Liveness restarts a container that's stuck. Startup probes protect applications that take a while to start. HPA scales the number of replicas horizontally. Size requests and limits properly, and handle node-level (cluster/node) autoscaling as a separate concern.\n- For planned node work, cordon the node with `kubectl cordon <node>`, drain it with a PDB-aware command, do the maintenance, then bring it back with `kubectl uncordon <node>`. Don't reach for `--ignore-daemonsets` as a way to avoid thinking through what the drain will actually disrupt.\n- Secure a cluster with RBAC, short-lived ServiceAccount or workload identity, NetworkPolicies, Pod Security admission, signed and scanned images, a proper secret-management integration, audit logs, regular patching, and restricted administrative access. `imagePullSecrets` are a fallback for private registries — prefer cloud workload identity where it's available.\n- A highly available control plane needs multiple API servers behind a load balancer and an odd-numbered healthy etcd quorum. Worker-node failure causes Pods to be evicted/rescheduled after node-health timeouts; the exact behavior depends on controllers, PDBs, storage and scheduling capacity.",
    ],
    tags: ['operations', 'networking', 'security'],
  },
  {
    id: 'itv-myk8s-26',
    level: 'advanced',
    kind: 'open',
    prompt: 'What is a CustomResourceDefinition (CRD), and when would you create one?',
    probing:
      'Whether you know a CRD only adds an API type, a controller does the work, and a production CRD needs schema and versioning.',
    answer: [
      "A CRD extends the Kubernetes API with an entirely new resource type. Once it's installed, users can create, read, update, watch, label, and authorize custom objects using normal Kubernetes tools.",
      'For example, a platform team could define a `Database` resource whose spec describes the engine, size, and backup policy.',
      "The CRD gives the new object storage, discovery, validation, and API behavior, but it doesn't perform the actual business action on its own. A custom controller is normally what turns the `Database` object's desired state into real cloud or Kubernetes resources.",
      "I reach for a CRD when the concept has a genuinely meaningful declarative lifecycle, multiple users or tools need a real Kubernetes API contract for it, and reconciling it actually adds domain value. I don't create one just to store arbitrary configuration — a ConfigMap or an external API is often simpler.",
      "A production CRD needs a structural schema, clear defaults and validation, status Conditions, printer columns where they're useful, RBAC, versioning, and a conversion or migration plan before its stored schema ever changes.",
      'A CRD adds a declarative resource type to the Kubernetes API with group, names, scope, served/storage versions and an OpenAPI schema. Kubernetes then provides persistence in etcd, API discovery, watch, labels, RBAC and standard `kubectl` interaction.',
      'A CRD alone does not create workload or cloud resources.',
      'A custom controller watches desired custom objects and reconciles actual state to match them, through a loop that is idempotent — safe to run again and again without causing harm.',
      'It manages owned resources or external APIs, records `status.observedGeneration` and Conditions, handles deletion through carefully designed finalizers, and retries temporary failures with limited backoff.',
      'Production design requires schema/version migration, least-privilege RBAC, leader election, metrics/logs/events, conflict handling, idempotent external operations, and tests for restart, duplicate events, partial failure, and deletion.',
    ],
    followUps: [
      'How do you change the stored version of a CRD without breaking existing objects?',
      'When would you use a ConfigMap or an external API instead of a CRD?',
    ],
    code: [
      {
        title: 'CRD for a Database resource',
        language: 'yaml',
        code: `apiVersion: apiextensions.k8s.io/v1
kind: CustomResourceDefinition
metadata:
  name: databases.platform.example.com
spec:
  group: platform.example.com
  scope: Namespaced
  names:
    plural: databases
    singular: database
    kind: Database
    shortNames: [db]
  versions:
    - name: v1
      served: true
      storage: true
      schema:
        openAPIV3Schema:
          type: object
          properties:
            spec:
              type: object
              required: [engine, storageGiB]
              properties:
                engine:
                  type: string
                  enum: [postgres, mysql]
                storageGiB:
                  type: integer
                  minimum: 10
      subresources:
        status: {}`,
      },
    ],
    tags: ['crd', 'api extension'],
  },
  {
    id: 'itv-myk8s-27',
    level: 'advanced',
    kind: 'open',
    prompt:
      'What is a custom Kubernetes controller, and how does its reconciliation (making actual state match desired state) loop work?',
    probing:
      'Whether you can describe an idempotent reconcile loop with observedGeneration, conditions, finalizers and leader election.',
    answer: [
      'A custom controller watches one or more Kubernetes resources and continuously moves the actual state toward the desired state. An operator is a controller plus domain-specific operational knowledge — things like provisioning, upgrades, backup, or failover.',
      'The reconciliation flow looks like this:',
      'Reconciliation has to be idempotent — running it repeatedly with the same desired and actual state should never produce a harmful extra action.',
      "The resource's generation number changes whenever its spec changes. The controller records `status.observedGeneration` and Conditions like `Ready`, `Progressing`, or `Degraded`, so users can see whether their latest change has actually been processed.",
      'I use owner references for anything Kubernetes should own and clean up automatically, and finalizers only for cleanup that genuinely has to happen before deletion. I keep RBAC least-privilege, use leader election so only one replica is active at a time, rate-limited queues, optimistic-concurrency retries, limited external calls, timeouts, and metrics, events, and logs.',
      'Calls to external APIs need their own idempotency tokens and a way to recover from a partial success.',
      "If a controller isn't reconciling, I check CRD or version discovery, the controller Pod and leader election, RBAC denials, watch or list errors, work-queue depth and retries, the resource's generation and Conditions, finalizers, dependent events, and external API failures.",
      'Tests cover reconciling the same state repeatedly, a lost watch or restart, a conflict, a dependency outage, deletion, a schema upgrade, and partial creation — not just the happy path.',
    ],
    followUps: [
      'What happens if your controller misses a watch event?',
      'Why must external API calls in a reconciler be idempotent?',
    ],
    code: [
      {
        title: 'Reconciliation loop',
        language: 'text',
        code: `watch event -> enqueue key -> read desired and actual state
-> handle deletion/finalizer -> calculate required change
-> create/update owned or external resources -> observe health
-> update status/conditions -> requeue when required`,
      },
    ],
    tags: ['controllers', 'reconciliation', 'operators'],
  },
  {
    id: 'itv-myk8s-28',
    level: 'advanced',
    kind: 'open',
    prompt: 'How do you design a Kubernetes operator?',
    probing:
      'Whether you can design an operator beyond a Deployment wrapper: status, finalizers, RBAC, retries and failure testing.',
    answer: [
      "I define a versioned CRD spec to capture what the user wants, and a status with conditions to capture what's actually happening.",
      "The controller watches the custom resource and the objects it owns, and reconciles them idempotently: fetch the object, handle deletion or a finalizer, compute what's actually needed, create or update the owned objects, check their readiness, update the status and `observedGeneration`, and requeue with a backoff — meaning it waits a bit longer between each retry.",
      "I use owner references for anything Kubernetes should clean up automatically, least-privilege RBAC, conflict and retry handling, events, metrics, and logs, leader election, rate limits, and validation, defaulting, or conversion webhooks only when they're actually needed. Calls to external systems need idempotency keys — something that makes it safe to repeat the same call — and a cleanup or finalizer timeout.",
      'Tests cover reconciling the same state repeatedly, partial failure, deletion, an upgrade or schema conversion, and a dependency outage — not just the happy path. A good operator encodes the real lifecycle of its domain, not just a wrapper around a Deployment.',
    ],
    followUps: [
      'How do you test an operator against partial failure?',
      'How would you handle deletion of a resource that owns cloud infrastructure?',
    ],
    tags: ['operators', 'crd', 'design'],
  },
  {
    id: 'itv-myk8s-29',
    level: 'basic',
    kind: 'open',
    prompt: 'How confident are you in Kubernetes and Docker? (rating question)',
    probing:
      'Whether you can rate yourself honestly and back the number with concrete production work.',
    answer: [
      'Give an honest self-rating and back it up with real work.',
      'For example: "8/10 — I run production EKS clusters: writing manifests and Helm charts, HPA/VPA autoscaling, RBAC, network policies, and troubleshooting incidents like CrashLoopBackOff, pending pods, and node pressure." Avoid claiming a perfect 10/10. A number backed by concrete examples is always more convincing.',
    ],
    tags: ['interview', 'experience'],
  },
]
