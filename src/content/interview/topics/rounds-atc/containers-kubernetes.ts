import type { InterviewQuestion } from '../../../types'

/** ATC round: containers, Kubernetes and AKS questions. */
export const roundsAtcKubernetesQuestions: InterviewQuestion[] = [
  {
    id: 'itv-ratc-1',
    level: 'intermediate',
    kind: 'open',
    prompt: 'What are local accounts in Kubernetes, and how do they work in AKS?',
    probing:
      'Certificate-based users authorised by RBAC, and why AKS teams disable local accounts in favour of Entra ID.',
    answer: [
      'If you mean **Local Accounts in Kubernetes**, this usually refers to user authentication using client certificates instead of an external identity provider.',
      '**What are local accounts?**',
      'A local account is a user that is authenticated directly by the Kubernetes cluster, typically using an X.509 client certificate. The cluster recognizes the certificate and grants permissions based on RBAC.',
      'Unlike Azure AD, LDAP, or OIDC users, local accounts are managed within the cluster.',
      '**How it works (Local accounts in Kubernetes)**',
      "1. Generate a private key and CSR (Certificate Signing Request).\n2. Sign the CSR with the cluster's Certificate Authority (CA).\n3. Create a kubeconfig file containing the certificate.\n4. Create an RBAC Role/ClusterRole and RoleBinding/ClusterRoleBinding.\n5. The user authenticates using the client certificate.",
      '**Example:** The user `siva` can now list and view pods only in the `dev` namespace.',
      '**In AKS:** AKS authentication is commonly integrated with Microsoft Entra ID (formerly Azure AD). However, AKS also supports local accounts, which use the cluster-admin kubeconfig instead of Entra ID.',
      'You can disable local accounts for better security:',
      '**Interview answer:** "Local accounts are Kubernetes users authenticated directly by the cluster, usually through client certificates rather than an external identity provider like Microsoft Entra ID. Access is controlled using Kubernetes RBAC. In AKS, local accounts provide cluster-admin access through kubeconfig, but many organizations disable them and use Microsoft Entra ID to improve security, auditing, and centralized access management."',
    ],
    code: [
      {
        title: 'Role: read pods in dev',
        language: 'yaml',
        code: `kind: Role
apiVersion: rbac.authorization.k8s.io/v1
metadata:
  name: pod-reader
  namespace: dev

rules:
- apiGroups: [""]
  resources: ["pods"]
  verbs: ["get", "list", "watch"]`,
      },
      {
        title: 'RoleBinding for the local user siva',
        language: 'yaml',
        code: `kind: RoleBinding
apiVersion: rbac.authorization.k8s.io/v1
metadata:
  name: pod-reader-binding
  namespace: dev

subjects:
- kind: User
  name: siva

roleRef:
  kind: Role
  name: pod-reader
  apiGroup: rbac.authorization.k8s.io`,
      },
      {
        title: 'Disable local accounts on AKS',
        language: 'bash',
        code: `az aks update \\
  --resource-group myRG \\
  --name myAKS \\
  --disable-local-accounts`,
      },
    ],
    tags: ['kubernetes', 'rbac', 'aks', 'authentication'],
  },
  {
    id: 'itv-ratc-2',
    level: 'basic',
    kind: 'open',
    prompt: 'What is the difference between a VM and a container?',
    probing:
      'Hardware versus OS virtualisation, the shared kernel, and when each one is the right choice.',
    answer: [
      'This is one of the most common DevOps interview questions.',
      '- **Virtual Machine (VM)**: Virtualizes hardware; **Container**: Virtualizes the operating system\n- **Virtual Machine (VM)**: Has its own Guest OS; **Container**: Shares the host OS kernel\n- **Virtual Machine (VM)**: Larger in size (GBs); **Container**: Smaller in size (MBs)\n- **Virtual Machine (VM)**: Takes minutes to boot; **Container**: Starts in seconds or less\n- **Virtual Machine (VM)**: Higher resource usage; **Container**: Lower resource usage\n- **Virtual Machine (VM)**: Better isolation; **Container**: Lightweight isolation\n- **Virtual Machine (VM)**: Can run different operating systems; **Container**: Must use the host OS kernel (Linux containers on Linux, Windows containers on Windows)\n- **Virtual Machine (VM)**: Managed by Hypervisor (VMware, Hyper-V, KVM); **Container**: Managed by Container Runtime (Docker, containerd)',
      '**VM architecture:** Each VM has its own operating system, making it heavier.',
      '**Container architecture:** All containers share the same host OS kernel, making them lightweight.',
      '**Example:** Suppose you have three applications.',
      'Each VM has a complete operating system.',
      'All share the same Linux kernel. No separate operating system is needed for each application.',
      '**Advantages of VMs**',
      '- Strong isolation\n- Can run different operating systems simultaneously\n- Suitable for legacy applications\n- Better security boundaries for untrusted workloads',
      '**Advantages of containers**',
      '- Fast startup\n- Lightweight\n- Efficient resource utilization\n- Easy to scale\n- Portable across environments\n- Ideal for microservices and Kubernetes',
      '**When to use VMs** — Running Windows and Linux on the same host; Hosting legacy or monolithic applications; Workloads requiring strong isolation; Traditional enterprise applications.',
      '**When to use containers**',
      '- Microservices\n- CI/CD pipelines\n- Kubernetes deployments\n- Cloud-native applications\n- Rapid scaling and deployments',
      '**Interview answer (1 minute)**',
      '"A Virtual Machine virtualizes the hardware and includes its own guest operating system, making it larger, slower to start, and more resource-intensive. A container virtualizes the operating system, shares the host OS kernel, and packages only the application and its dependencies. Because containers are lightweight, they start in seconds and allow much higher application density on the same infrastructure. In my DevOps work, we package applications as Docker containers and orchestrate them with Kubernetes for faster deployments and easier scaling, while VMs are typically used for hosting the Kubernetes nodes or for workloads that require stronger isolation or different operating systems."',
    ],
    code: [
      {
        title: 'VM architecture',
        language: 'text',
        code: `Application
Application
-----------------
Guest OS
Guest OS
-----------------
Hypervisor
-----------------
Host OS
-----------------
Physical Server`,
      },
      {
        title: 'Container architecture',
        language: 'text',
        code: `Application
Application
-----------------
Container Runtime
-----------------
Host OS Kernel
-----------------
Physical Server`,
      },
      {
        title: 'Example: three apps on three VMs',
        language: 'text',
        code: `VM1
- Ubuntu
- Java App

VM2
- Ubuntu
- Python App

VM3
- Ubuntu
- Node.js App`,
      },
      {
        title: 'Example: three apps in three containers',
        language: 'text',
        code: `Container1
- Java App

Container2
- Python App

Container3
- Node.js App`,
      },
    ],
    tags: ['vm', 'containers', 'docker'],
  },
  {
    id: 'itv-ratc-3',
    level: 'advanced',
    kind: 'open',
    prompt: 'How do you isolate a container?',
    probing:
      'The kernel features behind isolation (namespaces, cgroups, layered filesystems) and the security controls you add on top in Kubernetes.',
    answer: [
      'This is a common Kubernetes/Docker interview question. The interviewer wants to know the Linux kernel features behind container isolation.',
      '**Answer:** Containers are isolated using Linux kernel features, not by running separate operating systems. The main isolation mechanisms are:',
      '**1. Namespaces (isolation)**',
      'Namespaces ensure each container has its own view of system resources.',
      '- **PID Namespace** – Each container has its own process IDs.\n- **Network Namespace** – Each container has its own IP address, routing table, and network interfaces.\n- **Mount Namespace** – Each container has its own filesystem view.\n- **UTS Namespace** – Each container has its own hostname.\n- **IPC Namespace** – Isolates shared memory and message queues.\n- **User Namespace** – Maps container users to different host users, improving security.',
      'Example: Two containers can both have a process with PID 1 because each has its own PID namespace.',
      '**2. Control Groups (cgroups)**',
      'cgroups limit and monitor resource usage.',
      'They control (Control Groups):',
      '- CPU\n- Memory\n- Disk I/O\n- Network bandwidth (indirectly through Linux traffic control)\n- Number of processes',
      'This container can use a maximum of 512 MB RAM and 1 CPU.',
      '**3. Filesystem isolation**',
      'Each container gets its own writable layer on top of read-only image layers using a storage driver such as OverlayFS.',
      'This ensures (Filesystem isolation):',
      '- Changes in one container do not affect another.\n- Containers can share image layers efficiently.',
      '**4. Security features**',
      'Containers are further isolated using:',
      '- Linux Capabilities (remove unnecessary root privileges)\n- Seccomp (restricts system calls)\n- AppArmor or SELinux (mandatory access control)\n- Read-only root filesystem (optional)\n- Non-root users (recommended)',
      '**5. Kubernetes isolation**',
      'Kubernetes adds additional controls:',
      '- Resource requests and limits\n- Network Policies\n- RBAC\n- Pod Security Admission\n- Security Contexts',
      '**Interview answer (1 minute)**',
      '"Containers are isolated primarily through Linux namespaces and cgroups. Namespaces isolate processes, networking, filesystems, hostnames, IPC, and users so each container sees its own environment. cgroups enforce resource limits such as CPU and memory. Filesystem isolation ensures each container has its own writable layer, while security mechanisms like seccomp, AppArmor or SELinux, Linux capabilities, and running as a non-root user further reduce risk. In Kubernetes, we strengthen isolation with Network Policies, Security Contexts, Pod Security Admission, and resource limits."',
    ],
    followUps: [
      'What is the difference between namespaces and cgroups?',
      'Why is running as non-root still important inside a container?',
    ],
    code: [
      {
        title: 'cgroup limits with docker run',
        language: 'bash',
        code: `docker run --memory=512m --cpus=1 nginx`,
      },
      {
        title: 'Restrictive securityContext',
        language: 'yaml',
        code: `securityContext:
  runAsNonRoot: true
  allowPrivilegeEscalation: false
  readOnlyRootFilesystem: true`,
      },
    ],
    tags: ['containers', 'namespaces', 'cgroups', 'security'],
  },
  {
    id: 'itv-ratc-4',
    level: 'basic',
    kind: 'open',
    prompt: 'How do you connect to an AKS cluster?',
    probing:
      'The az login, get-credentials, kubectl flow, how authentication works, and how you reach a private cluster.',
    answer: [
      'This is a very common AKS interview question.',
      '**Answer:** To connect to an AKS cluster, I use the Azure CLI to download the cluster credentials into my local kubeconfig file. After that, I use `kubectl` to interact with the cluster.',
      '**Step 1: Login to Azure:** `az login`',
      '**Step 3: Get AKS credentials:** This command downloads the cluster credentials and merges them into: `~/.kube/config`',
      '**Step 4: Verify the connection:** or',
      'If the nodes or pods are listed, the connection is successful.',
      '**How authentication works**',
      "- **Microsoft Entra ID-enabled AKS:** Your Azure identity is authenticated, and Kubernetes RBAC or Azure RBAC determines what actions you're allowed to perform.\n- **Local accounts enabled:** You can use the cluster-admin kubeconfig to connect with administrative privileges.",
      '**If the cluster is private**',
      'For a private AKS cluster, you cannot connect directly from the internet. You typically connect from:',
      '- A VM (jump box/bastion) inside the VNet\n- A machine connected through VPN or ExpressRoute\n- A network that has connectivity to the AKS private endpoint',
      '**Interview answer (1 minute)**',
      '"I first authenticate to Azure using `az login` and select the correct subscription if needed. Then I run `az aks get-credentials` with the resource group and AKS cluster name. This downloads the cluster credentials into my local kubeconfig file. After that, I verify connectivity using commands like `kubectl get nodes` or `kubectl get pods -A`. If the AKS cluster is private, I connect from a machine that has network access to the cluster, such as a jump box, VPN-connected machine, or an Azure Bastion-hosted VM."',
    ],
    code: [
      {
        title: 'Step 2: Select the subscription (if multiple subscriptions exist)',
        language: 'bash',
        code: `az account set --subscription "<subscription-name-or-id>"`,
      },
      {
        title: 'Step 3: Get AKS credentials',
        language: 'bash',
        code: `az aks get-credentials \\
  --resource-group myResourceGroup \\
  --name myAKS`,
      },
      {
        title: 'Step 4: Verify the connection (nodes)',
        language: 'bash',
        code: `kubectl get nodes`,
      },
      {
        title: 'Step 4: Verify the connection (all pods)',
        language: 'bash',
        code: `kubectl get pods -A`,
      },
    ],
    tags: ['aks', 'kubectl', 'kubeconfig'],
  },
  {
    id: 'itv-ratc-5',
    level: 'intermediate',
    kind: 'open',
    prompt: 'What is an Ingress Controller?',
    probing:
      'That an Ingress resource does nothing without a controller, how routing works, and the AKS options (NGINX or AGIC).',
    answer: [
      'This is one of the most frequently asked Kubernetes interview questions.',
      '**What is an Ingress Controller?**',
      'An Ingress Controller is a Kubernetes component that implements the rules defined in an Ingress resource. It watches the Kubernetes API for Ingress objects and configures a reverse proxy or load balancer to route incoming HTTP/HTTPS traffic to the correct Services.',
      'Without an Ingress Controller, an Ingress resource does nothing.',
      '**Why do we need it?**',
      'Suppose you have three applications:',
      '- User Service\n- Order Service\n- Payment Service',
      'Without an Ingress Controller, you might expose each Service using its own LoadBalancer, resulting in multiple public IPs.',
      'This is more expensive and harder to manage.',
      'With an Ingress Controller, a single external IP can route traffic to different services.',
      '**How it works (Ingress Controllers)**',
      '1. A client sends an HTTP/HTTPS request.\n2. The request reaches the Ingress Controller.\n3. The controller checks the Ingress rules.\n4. It forwards the request to the appropriate Kubernetes Service.\n5. The Service sends the request to one of the backend Pods.',
      '**Common features (Ingress Controllers)**',
      '- Path-based routing\n- Host-based routing\n- SSL/TLS termination\n- URL rewriting\n- Load balancing\n- Authentication integration\n- Rate limiting (controller-dependent)',
      '**Popular Ingress Controllers**',
      '- NGINX Ingress Controller\n- Azure Application Gateway Ingress Controller (AGIC)\n- Traefik\n- HAProxy\n- Kong',
      '**In AKS:** Alternatively, you can use Azure Application Gateway with Application Gateway Ingress Controller (AGIC), which uses the Application Gateway as the Layer 7 load balancer.',
      '**Interview answer (1 minute)**',
      '"An Ingress Controller is a Kubernetes component that implements Ingress resources. It watches the Kubernetes API for Ingress rules and configures a reverse proxy to route incoming HTTP or HTTPS requests to the correct Services. It enables features such as host-based routing, path-based routing, SSL termination, and load balancing. In AKS, I\'ve commonly used NGINX Ingress Controller with Azure Load Balancer to expose multiple applications through a single public IP. For applications requiring Azure-native Layer 7 capabilities and WAF, Azure Application Gateway with AGIC is another common choice."',
    ],
    code: [
      {
        title: 'Without an Ingress Controller: one LoadBalancer per service',
        language: 'text',
        code: `Internet
   │
LB1 → User Service
LB2 → Order Service
LB3 → Payment Service`,
      },
      {
        title: 'With an Ingress Controller: one IP, path routing',
        language: 'text',
        code: `               Internet
                   │
           Ingress Controller
                   │
      ┌────────────┼────────────┐
      │            │            │
 /users        /orders      /payment
      │            │            │
User Service Order Service Payment Service`,
      },
      {
        title: 'Ingress resource with /api and /web',
        language: 'yaml',
        code: `apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: app-ingress

spec:
  rules:
  - host: example.com
    http:
      paths:
      - path: /api
        pathType: Prefix
        backend:
          service:
            name: api-service
            port:
              number: 80

      - path: /web
        pathType: Prefix
        backend:
          service:
            name: web-service
            port:
              number: 80`,
      },
      {
        title: 'Resulting routes',
        language: 'text',
        code: `example.com/api → api-service
example.com/web → web-service`,
      },
      {
        title: 'Common AKS setup',
        language: 'text',
        code: `Internet
     │
Azure Load Balancer
     │
NGINX Ingress Controller
     │
Ingress Resource
     │
Kubernetes Services
     │
Pods`,
      },
    ],
    tags: ['ingress', 'kubernetes', 'aks'],
  },
  {
    id: 'itv-ratc-6',
    level: 'basic',
    kind: 'open',
    prompt: 'What are the types of Services in Kubernetes?',
    probing:
      'ClusterIP, NodePort, LoadBalancer and ExternalName, plus the headless variant, with a use case for each.',
    answer: [
      'This is a very common Kubernetes interview question.',
      '**What is a Service in Kubernetes?**',
      'A Service provides a stable network endpoint for a group of Pods. Since Pods are ephemeral and their IP addresses can change, a Service gives applications a consistent way to communicate with them.',
      '**1. ClusterIP (default)**',
      '- Exposes the application only inside the cluster.\n- Gets an internal virtual IP.\n- Cannot be accessed directly from the internet.',
      'Use cases (ClusterIP):',
      '- Backend APIs\n- Databases\n- Internal microservices',
      'Flow: `Pod → ClusterIP Service → Backend Pods`',
      '**2. NodePort** — Exposes the Service on a port of every worker node.',
      'Accessible using: `NodeIP:NodePort`',
      'Default NodePort range: `30000–32767`',
      'Use cases (NodePort):',
      '- Testing\n- Development\n- When no cloud load balancer is available',
      '**3. LoadBalancer** — Creates an external cloud load balancer. Assigns a public or private IP (depending on configuration). Commonly used in AKS, EKS, and GKE.',
      'Use cases (LoadBalancer):',
      '- Production web applications\n- Public APIs',
      '**4. ExternalName** — Maps a Kubernetes Service to an external DNS name. No Pods or Endpoints are created.',
      'Use cases (ExternalName):',
      '- Accessing external databases\n- Calling third-party services',
      '**5. Headless Service**',
      '- Kubernetes does not assign a ClusterIP.\n- DNS returns the individual Pod IPs instead of a single virtual IP.',
      'Use cases (Headless Service):',
      '- StatefulSets\n- Databases like Cassandra, Kafka, MongoDB\n- Direct Pod-to-Pod communication',
      '**Summary table (Kubernetes Service types)**',
      '- **ClusterIP**: Accessible From: Inside cluster only; IP Assigned: Internal ClusterIP; Common Use Case: Internal communication\n- **NodePort**: Accessible From: NodeIP:Port; IP Assigned: Internal + NodePort; Common Use Case: Testing, development\n- **LoadBalancer**: Accessible From: Internet or private network; IP Assigned: Cloud Load Balancer IP; Common Use Case: Production applications\n- **ExternalName**: Accessible From: External DNS; IP Assigned: No Service IP; Common Use Case: External services/databases\n- **Headless**: Accessible From: Inside cluster; IP Assigned: No ClusterIP; Common Use Case: Stateful applications',
      '**Interview answer (1 minute)**',
      '"Kubernetes provides four Service types, plus the headless variant of ClusterIP. ClusterIP is the default and is used for internal communication within the cluster. NodePort exposes the application on a port of every node, making it accessible using the node\'s IP and port. LoadBalancer provisions a cloud load balancer, such as Azure Load Balancer in AKS, to expose applications externally. ExternalName maps a Service to an external DNS name, allowing applications to access external resources through Kubernetes DNS. Headless Service does not allocate a ClusterIP and returns the IP addresses of individual Pods, making it useful for StatefulSets and distributed databases."',
    ],
    code: [
      {
        title: 'ClusterIP — Example',
        language: 'yaml',
        code: `spec:
  type: ClusterIP`,
      },
      {
        title: 'NodePort — Example',
        language: 'yaml',
        code: `spec:
  type: NodePort`,
      },
      {
        title: 'NodePort — Flow',
        language: 'text',
        code: `Internet
    │
NodeIP:30080
    │
NodePort Service
    │
Pods`,
      },
      {
        title: 'LoadBalancer — Example',
        language: 'yaml',
        code: `spec:
  type: LoadBalancer`,
      },
      {
        title: 'LoadBalancer — Flow',
        language: 'text',
        code: `Internet
    │
Azure Load Balancer
    │
Service
    │
Pods`,
      },
      {
        title: 'ExternalName — Example',
        language: 'yaml',
        code: `spec:
  type: ExternalName
  externalName: database.company.com`,
      },
      {
        title: 'ExternalName — Flow',
        language: 'text',
        code: `Application
    │
ExternalName Service
    │
database.company.com`,
      },
      {
        title: 'Headless Service — Uses',
        language: 'yaml',
        code: `clusterIP: None`,
      },
      {
        title: 'Headless Service — Example',
        language: 'yaml',
        code: `spec:
  clusterIP: None`,
      },
      {
        title: 'Headless Service — Flow',
        language: 'text',
        code: `Application
      │
DNS Lookup
      │
Pod1   Pod2   Pod3`,
      },
    ],
    tags: ['kubernetes', 'services', 'networking'],
  },
  {
    id: 'itv-ratc-7',
    level: 'intermediate',
    kind: 'open',
    prompt: 'How do you expose an application in Kubernetes?',
    probing:
      'The Service types for internal and external access, Ingress for many apps behind one IP, and port-forward only for debugging.',
    answer: [
      'This is a common Kubernetes interview question. The interviewer wants to know the different ways to make an application accessible.',
      '**Answer:** There are several ways to expose an application in Kubernetes, depending on whether it needs to be accessed internally or externally.',
      '**1. ClusterIP (internal access)**',
      '- Default Service type.\n- Accessible only within the Kubernetes cluster.',
      'Use case: Backend APIs, databases, internal microservices.',
      '**2. NodePort:** Exposes the application on a port on every worker node.',
      'Access using: `http://<NodeIP>:<NodePort>`',
      'Use case: Development and testing.',
      '**3. LoadBalancer** — Creates a cloud load balancer (Azure Load Balancer in AKS). Assigns a public or private IP.',
      'Use case: Internet-facing applications.',
      '**4. Ingress (recommended for multiple applications)**',
      'Instead of creating multiple LoadBalancer Services, use an Ingress Controller.',
      'Benefits (Ingress (recommended for multiple applications)):',
      '- Single public IP\n- Host-based routing\n- Path-based routing\n- SSL/TLS termination',
      '**5. Port forwarding**',
      'Used only for debugging.',
      'Access: `http://localhost:8080`',
      '**In AKS (production flow)**',
      'Here (In AKS (production flow)):',
      '- The Ingress Controller is exposed using a LoadBalancer Service.\n- Backend applications remain as ClusterIP Services.\n- External traffic reaches the applications through the Ingress rules.',
      '**Interview answer (1 minute)**',
      '"Applications in Kubernetes can be exposed using different Service types. ClusterIP is used for internal communication, NodePort exposes the application on a port of each worker node, and LoadBalancer provisions a cloud load balancer for external access. For production environments with multiple web applications, I typically use an Ingress Controller. In AKS, the Ingress Controller is exposed through an Azure Load Balancer, and it routes HTTP/HTTPS traffic to backend ClusterIP Services based on hostnames or URL paths. This approach is scalable, cost-effective, and supports features like SSL termination and path-based routing."',
    ],
    code: [
      {
        title: 'ClusterIP — Example',
        language: 'yaml',
        code: `spec:
  type: ClusterIP`,
      },
      {
        title: 'NodePort — Example',
        language: 'yaml',
        code: `spec:
  type: NodePort`,
      },
      {
        title: 'LoadBalancer — Example',
        language: 'yaml',
        code: `spec:
  type: LoadBalancer`,
      },
      {
        title: 'Ingress — Example',
        language: 'text',
        code: `Internet
     │
Azure Load Balancer
     │
NGINX Ingress Controller
     │
───────────────
/app1 → Service1
/app2 → Service2
/api  → Service3`,
      },
      {
        title: 'Port forwarding',
        language: 'bash',
        code: `kubectl port-forward pod/nginx 8080:80`,
      },
      {
        title: 'A common production architecture is',
        language: 'text',
        code: `Internet
     │
Azure Load Balancer
     │
NGINX Ingress Controller
     │
Ingress Resource
     │
ClusterIP Services
     │
Pods`,
      },
    ],
    tags: ['kubernetes', 'ingress', 'services'],
  },
  {
    id: 'itv-ratc-8',
    level: 'intermediate',
    kind: 'open',
    prompt: 'What are Linux namespaces and cgroups?',
    probing:
      'Namespaces for isolation versus cgroups for resource control, and how Docker and Kubernetes rely on both.',
    answer: [
      'This is a very common Docker and Kubernetes interview question.',
      '**Linux namespaces:** Namespaces provide isolation. They make a container think it has its own independent system by isolating resources from other containers and the host.',
      '**Types of namespaces**',
      '- **PID**: Isolates process IDs. Each container has its own process tree.\n- **NET**: Isolates networking. Each container gets its own IP address, routing table, and network interfaces.\n- **MNT (Mount)**: Isolates filesystem mount points.\n- **IPC**: Isolates shared memory and message queues.\n- **UTS**: Allows each container to have its own hostname and domain name.\n- **USER**: Maps container users to different host users, improving security.',
      '**Example:** Both processes have PID 1 inside their own containers because of the PID namespace.',
      '**Linux cgroups (Control Groups)**',
      "cgroups control and limit how much of the system's resources a process or container can use.",
      'They can limit (Linux cgroups):',
      '- CPU\n- Memory\n- Disk I/O\n- Number of processes\n- Device access',
      '**Example:** This limits the container to: 512 MB RAM, 1 CPU.',
      'If the application tries to exceed these limits:',
      '- Memory overuse can result in an OOMKilled event.\n- CPU usage is throttled to the configured limit.',
      '**Namespaces vs cgroups**',
      '- **Namespaces**: Provide isolation; **cgroups**: Provide resource control\n- **Namespaces**: Separate processes, networking, filesystems, etc.; **cgroups**: Limit CPU, memory, disk I/O, and other resources\n- **Namespaces**: Make containers appear independent; **cgroups**: Prevent one container from consuming excessive resources',
      '**How Docker uses them**',
      'When you start a container:',
      '1. Namespaces create an isolated environment.\n2. cgroups enforce resource limits.\n3. The container runtime starts the application inside that isolated, resource-controlled environment.',
      '**How Kubernetes uses them**',
      'Kubernetes passes these limits to the container runtime, which uses cgroups to enforce them. The container runtime also relies on Linux namespaces to isolate the container from other workloads.',
      '**Interview answer (1 minute)**',
      '"Linux namespaces and cgroups are the core technologies behind containers. Namespaces provide isolation by giving each container its own view of processes, networking, filesystems, hostnames, IPC, and users. This makes each container appear as if it has its own operating system. cgroups, or control groups, manage resource usage by limiting CPU, memory, disk I/O, and other resources for each container. Together, namespaces provide isolation and cgroups provide resource control, enabling multiple containers to run safely and efficiently on the same Linux host."',
    ],
    code: [
      {
        title: 'PID namespace: both containers have a PID 1',
        language: 'text',
        code: `Container A
PID 1 → Nginx

Container B
PID 1 → Apache`,
      },
      {
        title: 'cgroup limits with docker run',
        language: 'bash',
        code: `docker run --memory=512m --cpus=1 nginx`,
      },
      {
        title: 'Kubernetes requests and limits',
        language: 'yaml',
        code: `resources:
  requests:
    cpu: "500m"
    memory: "512Mi"
  limits:
    cpu: "1"
    memory: "1Gi"`,
      },
    ],
    tags: ['linux', 'namespaces', 'cgroups', 'containers'],
  },
]
