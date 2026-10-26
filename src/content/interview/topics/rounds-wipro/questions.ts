import type { InterviewQuestion } from '../../../types'

/** Wipro round: Linux, AKS and Kubernetes internals, Docker, Helm and Jenkins. */
export const roundsWiproQuestions: InterviewQuestion[] = [
  {
    id: 'itv-rwip-1',
    level: 'basic',
    kind: 'open',
    prompt: 'What is umask in Linux?',
    probing:
      'That umask removes permissions from the 666/777 defaults rather than setting them, and that you can do the arithmetic.',
    answer: [
      '`umask` in Linux defines the default permission restrictions applied when a new file or directory is created. Think of it as a **permission filter**.',
      '**Default permissions**',
      'Linux starts with:\n- **Files:** `666` → `rw-rw-rw-`\n- **Directories:** `777` → `rwxrwxrwx`',
      'Then `umask` removes permissions from these defaults.',
      '**Example:** With umask `0022`, a new file gets 666 - 022 = 644 (`-rw-r--r--`) and a new directory gets 777 - 022 = 755 (`drwxr-xr-x`).',
      '**Common umask values**',
      '- **022**: New file: 644; New directory: 755\n- **027**: New file: 640; New directory: 750\n- **077**: New file: 600; New directory: 700\n- **002**: New file: 664; New directory: 775',
      '**Important interview point**',
      '`umask` does **not** directly set permissions. It **removes** permissions from the default permissions. For example, with `umask 077`, `touch test.txt` gives `-rw-------` and `mkdir testdir` gives `drwx------`.',
      '**How to change it:** Temporarily, for the current shell, run `umask 027` and check it with `umask`. For a persistent user setting, it is commonly configured in shell startup files such as `~/.bashrc`.',
      '**Interview answer:** "umask is used in Linux to control the default permissions of newly created files and directories. It acts as a permission mask by removing permissions from the default 666 for files and 777 for directories. For example, with umask 022, new files get 644 and directories get 755."',
    ],
    code: [
      {
        title: 'Check the current umask',
        language: 'bash',
        code: `umask
# Output:
# 0022`,
      },
      {
        title: 'umask 022 arithmetic',
        language: 'text',
        code: `New file:
  666
- 022
-----
  644   ->  -rw-r--r--

New directory:
  777
- 022
-----
  755   ->  drwxr-xr-x`,
      },
      {
        title: 'umask 077 in action',
        language: 'bash',
        code: `umask 077
touch test.txt
# Result: -rw-------

mkdir testdir
# Result: drwx------`,
      },
      {
        title: 'Change it for the current shell',
        language: 'bash',
        code: `umask 027
umask`,
      },
    ],
    tags: ['linux', 'umask', 'permissions'],
  },
  {
    id: 'itv-rwip-2',
    level: 'intermediate',
    kind: 'open',
    prompt: 'How do you authenticate to an AKS cluster?',
    probing:
      'The az login and get-credentials flow, non-personal identities in CI/CD, and the difference between authentication and authorization.',
    answer: [
      'To authenticate to an AKS cluster, the standard approach is to use **Azure AD / Microsoft Entra ID** with `kubectl`.',
      '**1. Log in to Azure.** Run `az login`. If you have multiple subscriptions, select one with `az account set`.',
      '**2. Get the AKS credentials.** `az aks get-credentials` downloads and merges the AKS credentials into your local kubeconfig, usually `~/.kube/config`.',
      '**3. Verify authentication.** Run `kubectl get nodes` or `kubectl get pods -A`. If Entra ID integration is enabled, `kubectl` can authenticate using your Azure identity.',
      '**In a DevOps pipeline**',
      'For Azure DevOps, I would normally use an **Azure Resource Manager service connection** or a **workload identity / service principal**, depending on the setup. For example, the pipeline authenticates to Azure and then retrieves the AKS credentials.',
      'For automated workloads, avoid storing usernames/passwords or long-lived client secrets. Workload identity / managed identity is preferred where supported.',
      '**AKS authentication vs. authorization**',
      'This distinction is important in interviews.',
      '**Authentication = Who are you?** Azure AD / Microsoft Entra ID → kubectl → AKS API Server.',
      '**Authorization = What are you allowed to do?** Microsoft Entra ID → Azure RBAC / Kubernetes RBAC → Permissions on AKS resources.',
      "For example, you may successfully authenticate to AKS but still get `Error from server (Forbidden)` because your identity doesn't have the required Kubernetes RBAC or Azure RBAC permissions.",
      '**Interview answer:** "I authenticate to AKS using Microsoft Entra ID. First I log in using `az login`, select the required subscription, and run `az aks get-credentials` to configure the kubeconfig. Then I use `kubectl` to interact with the cluster. In CI/CD, I use an Azure service connection or workload identity rather than personal credentials. Authentication verifies the identity, while Kubernetes RBAC or Azure RBAC controls what that identity can access."',
    ],
    code: [
      {
        title: 'Log in and pick a subscription',
        language: 'bash',
        code: `az login
az account set --subscription "<subscription-name>"`,
        placeholders: ['<subscription-name>'],
      },
      {
        title: 'Get the AKS credentials',
        language: 'bash',
        code: `az aks get-credentials \\
  --resource-group my-rg \\
  --name my-aks`,
      },
      {
        title: 'Verify authentication',
        language: 'bash',
        code: `kubectl get nodes
kubectl get pods -A`,
      },
      {
        title: 'In a pipeline',
        language: 'bash',
        code: `az login
az aks get-credentials \\
  --resource-group my-rg \\
  --name my-aks \\
  --overwrite-existing

kubectl get pods`,
      },
      {
        title: 'Authentication vs authorization',
        language: 'text',
        code: `Authentication (who are you?)
Azure AD / Microsoft Entra ID
        ↓
     kubectl
        ↓
  AKS API Server

Authorization (what are you allowed to do?)
   Microsoft Entra ID
          ↓
Azure RBAC / Kubernetes RBAC
          ↓
Permissions on AKS resources`,
      },
    ],
    tags: ['aks', 'authentication', 'entra id', 'rbac', 'kubectl'],
  },
  {
    id: 'itv-rwip-3',
    level: 'intermediate',
    kind: 'open',
    prompt: 'What is a headless Service?',
    probing:
      'That clusterIP: None makes DNS return Pod IPs, and why StatefulSets and databases need that.',
    answer: [
      'A **headless Service** in Kubernetes is a Service that does **not** get a ClusterIP. It is mainly used when you want to communicate directly with individual Pods rather than through a single virtual IP.',
      '**How it works:** Normally the client goes through the Service ClusterIP to the Pods. With a headless Service, the client resolves DNS and reaches the Pods directly.',
      'The important configuration is `clusterIP: None`. Instead of returning one ClusterIP, Kubernetes DNS returns the **Pod IP addresses** associated with the Service.',
      '**Why use it?** Headless Services are commonly used for:',
      '- StatefulSets\n- Databases such as PostgreSQL, Cassandra and MongoDB\n- Applications where Pods need to discover each other\n- Systems where clients need to connect to a specific Pod',
      'For example, with a StatefulSet, each Pod can have a stable DNS identity such as `pod-0.my-service`, `pod-1.my-service` and `pod-2.my-service`.',
      '**Normal vs. headless Service**',
      '- **Normal Service**: Has a ClusterIP; **Headless Service**: `clusterIP: None`\n- **Normal Service**: Provides a virtual IP; **Headless Service**: No virtual IP\n- **Normal Service**: Traffic goes through the Service; **Headless Service**: DNS can return the Pod IPs\n- **Normal Service**: Common for stateless apps; **Headless Service**: Common for StatefulSets\n- **Normal Service**: Load balancing through the Service; **Headless Service**: Client can discover individual Pods',
      '**Interview answer:** "A headless Service is a Kubernetes Service with `clusterIP: None`. It doesn\'t provide a virtual ClusterIP. Instead, Kubernetes DNS returns the IP addresses of the Pods selected by the Service. It\'s commonly used with StatefulSets and databases where applications need direct Pod discovery and stable network identities."',
    ],
    code: [
      {
        title: 'Normal vs headless traffic',
        language: 'text',
        code: `Normal:
      Client
        ↓
Service (ClusterIP)
        ↓
Pod 1   Pod 2   Pod 3

Headless:
      Client
        ↓
       DNS
        ↓
Pod 1   Pod 2   Pod 3`,
      },
      {
        title: 'Headless Service manifest',
        language: 'yaml',
        code: `apiVersion: v1
kind: Service
metadata:
  name: my-service
spec:
  clusterIP: None
  selector:
    app: myapp
  ports:
    - port: 80
      targetPort: 8080`,
      },
      {
        title: 'Stable DNS names with a StatefulSet',
        language: 'text',
        code: `my-service
    ↓
pod-0   pod-1   pod-2

pod-0.my-service
pod-1.my-service
pod-2.my-service`,
      },
    ],
    tags: ['kubernetes', 'services', 'headless service', 'statefulset', 'dns'],
  },
  {
    id: 'itv-rwip-4',
    level: 'advanced',
    kind: 'open',
    prompt: 'How do you integrate Jenkins with Kubernetes?',
    probing:
      'The Kubernetes plugin with dynamic agent Pods, and the separate concern of Jenkins deploying applications to AKS.',
    answer: [
      "There are two common ways to integrate Jenkins with Kubernetes. For a DevOps interview, explain the **Kubernetes plugin with dynamic agents**, because that's the common production pattern.",
      '**1. Jenkins runs outside Kubernetes**',
      'Developer → GitHub → Jenkins → Kubernetes Cluster → Dynamic Jenkins Agent Pod → Build / Test / Docker / Deploy. Jenkins can be running on a VM, while Kubernetes provides temporary build agents.',
      '**2. Configure Jenkins to communicate with AKS**',
      'In Jenkins, install and configure the **Kubernetes plugin**.',
      'Jenkins needs credentials to access the Kubernetes API. For AKS, this can be configured using appropriate Kubernetes credentials or Azure identity-based authentication. Jenkins then connects to the Kubernetes cluster and can create agent Pods dynamically.',
      '**3. Define a Kubernetes agent**',
      'When the pipeline starts, Jenkins asks Kubernetes (through the Kubernetes API) to create an agent Pod in the AKS cluster, which runs Build, Test and Deploy. After the pipeline finishes, the temporary agent Pod can be removed.',
      '**4. Deploy the application to AKS**',
      'Another common pattern is: Git → Jenkins → Build → Unit Test → SonarQube → Docker Build → Trivy Scan → Push Image → ACR → Helm / kubectl → AKS.',
      '**Important distinction**',
      'There are actually two separate integrations you should understand:',
      '- **Jenkins → Kubernetes:** used to create dynamic Jenkins agent Pods.\n- **Jenkins → AKS application deployment:** used to deploy your application using `kubectl` or `helm`.',
      '**Interview answer:** "I have integrated Jenkins with Kubernetes using the Kubernetes plugin. Jenkins acts as the controller and Kubernetes provides dynamic agent Pods. When a pipeline starts, Jenkins requests Kubernetes to create an agent Pod with the required tools such as Maven, Docker or kubectl. The pipeline executes on that temporary Pod and the Pod is removed after the job completes. For application deployment, Jenkins authenticates to AKS and uses Helm or kubectl to deploy the application. In our Azure setup, the container images are pushed to ACR and then deployed to AKS."',
    ],
    followUps: [
      'How does the agent Pod connect back to the Jenkins controller?',
      'How would you build Docker images inside a Kubernetes agent Pod without mounting the Docker socket?',
      'What RBAC does the Jenkins service account need in the agent namespace?',
    ],
    code: [
      {
        title: 'Jenkinsfile with a Kubernetes agent',
        language: 'text',
        code: `pipeline {
    agent {
        kubernetes {
            yaml '''
apiVersion: v1
kind: Pod
spec:
  containers:
  - name: build
    image: maven:3.9-eclipse-temurin-17
    command:
    - sleep
    args:
    - 99d
'''
        }
    }

    stages {
        stage('Build') {
            steps {
                container('build') {
                    sh 'mvn clean package'
                }
            }
        }

        stage('Test') {
            steps {
                container('build') {
                    sh 'mvn test'
                }
            }
        }
    }
}`,
      },
      {
        title: 'Controller creating an agent Pod',
        language: 'text',
        code: `Jenkins Controller
       |
       | Kubernetes API
       ↓
   AKS Cluster
       |
       ↓
 Jenkins Agent Pod
       |
       ├── Build
       ├── Test
       └── Deploy`,
      },
      {
        title: 'Build, push and deploy to AKS',
        language: 'bash',
        code: `docker build -t myacr.azurecr.io/myapp:1.0 .
docker push myacr.azurecr.io/myapp:1.0

helm upgrade --install myapp ./helm \\
  --set image.repository=myacr.azurecr.io/myapp \\
  --set image.tag=1.0`,
      },
    ],
    tags: ['jenkins', 'kubernetes', 'aks', 'ci/cd', 'helm'],
  },
  {
    id: 'itv-rwip-5',
    level: 'advanced',
    kind: 'scenario',
    prompt: 'If etcd is not available, can you access the Kubernetes cluster?',
    probing:
      'A precise answer: the API server may answer and running Pods keep running, but state reads and writes fail; plus etcd quorum and what AKS manages for you.',
    answer: [
      '**No, not normally.** If etcd is completely unavailable in a Kubernetes control plane, the cluster will not function correctly.',
      '**Why?** etcd is the key-value database that stores the Kubernetes cluster state, including:',
      '- Pods and Deployments\n- Services\n- ConfigMaps and Secrets\n- Nodes\n- RBAC configuration\n- Cluster configuration and desired state',
      'The architecture is roughly kubectl → kube-apiserver → etcd. When you run `kubectl get pods`, the request goes to the kube-apiserver, which needs etcd to retrieve the cluster state.',
      '**What happens if etcd is down?**',
      'You might still be able to reach the API server (for example with `kubectl version`) or establish a connection to the API endpoint, but operations that need to read or write cluster state will generally fail or be unavailable. For example, `kubectl get pods` may return an error such as `etcdserver: request timed out`.',
      '**Existing workloads may continue running temporarily**, because the kubelet and container runtime on the worker nodes keep running the Pods they already know about.',
      "But you won't be able to reliably:",
      '- Create new Pods\n- Delete or update resources\n- Scale Deployments\n- Schedule new workloads\n- Update the cluster state',
      '**Important interview point**',
      'Don\'t say: "If etcd is down, Kubernetes immediately goes down." That\'s not precise. A better answer is:',
      '"etcd is the persistent state store of Kubernetes. If etcd becomes unavailable, the API server may still be reachable, and existing workloads can continue running for some time. However, Kubernetes cannot reliably read or update cluster state, so operations such as creating, updating, deleting, or scaling resources will fail. If etcd is permanently lost, the control plane cannot operate normally."',
      '**What about an HA cluster?**',
      'In production, etcd is usually deployed with multiple members. etcd uses **quorum**. With 3 members, you need 2 members available for quorum. So if one etcd node fails, the Kubernetes control plane can continue operating. If quorum is lost, the control plane cannot reliably process state changes.',
      "**AKS note:** in Azure Kubernetes Service, Microsoft manages the control-plane components, including the etcd layer. You generally don't administer the managed control-plane etcd members directly, as you would in a self-managed Kubernetes cluster.",
    ],
    followUps: [
      'Why are etcd clusters sized with an odd number of members?',
      'How do you back up and restore etcd on a self-managed cluster?',
      'What happens to a running Pod that crashes while etcd is unavailable?',
    ],
    code: [
      {
        title: 'Request path',
        language: 'text',
        code: `kubectl
   ↓
kube-apiserver
   ↓
etcd`,
      },
      {
        title: 'What still answers and what fails',
        language: 'bash',
        code: `kubectl version     # API endpoint may still respond
kubectl get pods    # needs cluster state
# etcdserver: request timed out`,
      },
      {
        title: 'etcd quorum with three members',
        language: 'text',
        code: `          kube-apiserver
           /    |    \\
          ↓     ↓     ↓
       etcd-1 etcd-2 etcd-3

One member down - quorum kept (2 of 3):
etcd-1 ❌
etcd-2 ✅
etcd-3 ✅

Two members down - quorum lost:
etcd-1 ❌
etcd-2 ❌
etcd-3 ✅`,
      },
    ],
    tags: ['kubernetes', 'etcd', 'control plane', 'high availability'],
  },
  {
    id: 'itv-rwip-6',
    level: 'intermediate',
    kind: 'scenario',
    prompt: 'A Pod is not getting scheduled on a node. Why?',
    probing:
      'A methodical walk through scheduler events: resources, nodeSelector, affinity, taints, NotReady nodes and topology rules.',
    answer: [
      'If a Pod is not getting scheduled to a Kubernetes node, the first thing I check is `kubectl get pods` and `kubectl describe pod <pod-name>`. Look at the **Events** section at the bottom. It usually tells you exactly why the scheduler rejected the nodes.',
      "**Common reasons:** **1. Insufficient CPU or memory.** The event looks like `0/3 nodes are available: 3 Insufficient memory`. Check the nodes with `kubectl describe node` and `kubectl top nodes`. The Pod's resource requests may be too high. Either reduce the request or add or scale nodes.",
      '**2. nodeSelector mismatch.** The Pod has a `nodeSelector` such as `environment: production` but no node has that label. Check with `kubectl get nodes --show-labels` and add the required label if appropriate.',
      '**3. Node affinity mismatch.** If no node satisfies the required affinity rules (`requiredDuringSchedulingIgnoredDuringExecution`), the Pod stays `Pending`. Check the scheduler events with `kubectl describe pod <pod-name>`.',
      "**4. Taints and tolerations.** `kubectl describe node <node-name>` might show `Taints: dedicated=gpu:NoSchedule`. If the Pod doesn't have a matching toleration, it won't be scheduled there.",
      '**5. Node is NotReady.** If `kubectl get nodes` shows a node as `NotReady`, investigate it with `kubectl describe node`.',
      '**6. Restrictive topology rules.** For example `topologySpreadConstraints`, Pod affinity and Pod anti-affinity can prevent the scheduler from finding a valid node.',
      '**My troubleshooting sequence**',
      '"First, I check whether the Pod is in Pending state using `kubectl get pods`. Then I run `kubectl describe pod <pod-name>` and check the scheduler Events. I specifically check for insufficient CPU or memory, nodeSelector or affinity mismatch, node taints without tolerations, node NotReady status, and topology or scheduling constraints. I then verify node capacity and labels using `kubectl describe node` and `kubectl get nodes --show-labels`. Based on the scheduler error, I fix the resource request, labels, tolerations, affinity rules, or node capacity."',
      'The key command to remember is `kubectl describe pod <pod-name>`. The **Events** section is usually the starting point for a Pod scheduling issue.',
    ],
    code: [
      {
        title: 'First checks',
        language: 'bash',
        code: `kubectl get pods
kubectl describe pod <pod-name>`,
        placeholders: ['<pod-name>'],
      },
      {
        title: '1. Insufficient resources',
        language: 'text',
        code: `0/3 nodes are available:
3 Insufficient memory`,
      },
      {
        title: 'Check node capacity',
        language: 'bash',
        code: `kubectl describe node <node-name>
kubectl top nodes`,
        placeholders: ['<node-name>'],
      },
      {
        title: 'Requests that may be too high',
        language: 'yaml',
        code: `resources:
  requests:
    cpu: "2"
    memory: "4Gi"`,
      },
      {
        title: '2. nodeSelector on the Pod',
        language: 'yaml',
        code: `nodeSelector:
  environment: production`,
      },
      {
        title: 'Check and add node labels',
        language: 'bash',
        code: `kubectl get nodes --show-labels
kubectl label node <node-name> environment=production`,
        placeholders: ['<node-name>'],
      },
      {
        title: '3. Required node affinity',
        language: 'yaml',
        code: `affinity:
  nodeAffinity:
    requiredDuringSchedulingIgnoredDuringExecution:`,
      },
      {
        title: '4. Node taint and matching toleration',
        language: 'yaml',
        code: `# kubectl describe node shows:
# Taints:
# dedicated=gpu:NoSchedule

tolerations:
- key: "dedicated"
  operator: "Equal"
  value: "gpu"
  effect: "NoSchedule"`,
      },
      {
        title: '5. NotReady node',
        language: 'bash',
        code: `kubectl get nodes
# NAME       STATUS
# node-01    NotReady

kubectl describe node node-01`,
      },
    ],
    tags: ['kubernetes', 'scheduling', 'pending', 'taints', 'affinity', 'troubleshooting'],
  },
  {
    id: 'itv-rwip-7',
    level: 'intermediate',
    kind: 'open',
    prompt: 'What are static and dynamic IPs for Pods?',
    probing:
      'That Pod IPs are dynamic, Services give the stable endpoint, and a StatefulSet gives a stable identity rather than a fixed IP.',
    answer: [
      "In Kubernetes, the important point is that **Pod IPs are normally dynamic**. A Pod's IP can change when the Pod is recreated.",
      "**Dynamic Pod IP:** Suppose you deploy 3 Pods. If `app-2` is deleted and recreated, the IP can change. That's why applications should not directly depend on Pod IPs.",
      'Instead, use a **Kubernetes Service** (Client → Service → Pods). The Service provides a stable endpoint while the Pod IPs can change.',
      '**What about a "static Pod IP"?**',
      "In standard Kubernetes, you generally don't assign a permanent static IP directly to a normal Pod. For example, setting `podIP` in the spec is **not** a normal Kubernetes pattern.",
      "Pod IP allocation is handled by the cluster's networking (the CNI plugin).",
      "There are specialized networking configurations where a Pod can receive a predictable or fixed IP, but that's different from the normal Kubernetes model.",
      '**A StatefulSet gives a stable identity**',
      'This is an important interview distinction. A StatefulSet can give Pods stable names, for example `postgres-0`, `postgres-1`, `postgres-2`, and, with a headless Service, stable DNS names such as `postgres-0.postgres`.',
      'But a stable identity does **not** necessarily mean the Pod IP stays fixed.',
      '**Static vs. dynamic**',
      '- **Normal Kubernetes Pod**: Dynamic Pod IP: Yes; Static / fixed IP: Normally no\n- **IP can change after recreation**: Dynamic Pod IP: Yes; Static / fixed IP: Depends on the networking setup\n- **Should the application depend on the IP?**: Dynamic Pod IP: No; Static / fixed IP: Usually avoid it\n- **Recommended access**: Dynamic Pod IP: Kubernetes Service; Static / fixed IP: Service / specialized networking\n- **StatefulSet**: Dynamic Pod IP: IP can change; Static / fixed IP: Stable DNS identity instead',
      '**Interview answer:** "Pod IPs in Kubernetes are normally dynamic. When a Pod is recreated, it can receive a different IP. Therefore, we don\'t use Pod IPs directly for application communication. We use a Kubernetes Service, which provides a stable endpoint and routes traffic to the current Pod IPs. StatefulSets provide stable Pod names and DNS identities, but that doesn\'t mean the Pod IP itself is permanently static."',
    ],
    code: [
      {
        title: 'Pod IPs change on recreation',
        language: 'text',
        code: `app-1 → 10.244.1.5
app-2 → 10.244.1.6
app-3 → 10.244.1.7

After app-2 is deleted and recreated:
app-2 → 10.244.2.10`,
      },
      {
        title: 'Service as the stable endpoint',
        language: 'text',
        code: `Client
  ↓
Service
  ↓
Pod 1   Pod 2   Pod 3`,
      },
      {
        title: 'Not a normal Kubernetes pattern',
        language: 'yaml',
        code: `spec:
  podIP: 10.244.1.10`,
      },
      {
        title: 'StatefulSet names and DNS',
        language: 'text',
        code: `postgres-0
postgres-1
postgres-2

postgres-0.postgres
postgres-1.postgres
postgres-2.postgres`,
      },
    ],
    tags: ['kubernetes', 'networking', 'pod ip', 'statefulset', 'cni'],
  },
  {
    id: 'itv-rwip-8',
    level: 'basic',
    kind: 'open',
    prompt: 'How is your application accessed using a NodePort Service?',
    probing:
      'Node IP plus nodePort, how port, targetPort and nodePort map, and why NodePort is not the production front door on AKS.',
    answer: [
      'With a **NodePort** Service, an application is accessed using the **Node IP + NodePort**.',
      '**Flow:** User / Client → `http://<Node-IP>:30080` → Kubernetes Node (NodePort 30080) → NodePort Service → Pod → Application container :8080.',
      '**Example:** Suppose your application is listening on port 8080 inside the Pod. In the Service:',
      '- `targetPort: 8080` → application port inside the Pod\n- `port: 80` → Service port\n- `nodePort: 30080` → port exposed on every eligible node',
      'You can access it using `http://<Node-IP>:30080`, for example `http://10.10.1.20:30080`. Kubernetes then forwards the request: 10.10.1.20:30080 → NodePort Service :80 → Pod :8080.',
      '**How do you find the NodePort?**',
      'Run `kubectl get svc my-app` to see the port mapping, find the node IP with `kubectl get nodes -o wide`, then access `http://<NODE-IP>:30080`.',
      '**Important point in AKS**',
      'If the AKS nodes have private IPs, you cannot normally access the NodePort directly from the public internet using those private IPs. You would typically use Internet → Azure Load Balancer / Application Gateway → AKS → Service → Pods.',
      'For production applications, NodePort is generally **not** the preferred external exposure mechanism. LoadBalancer or Ingress is more common.',
      '**Interview answer:** "With a NodePort Service, Kubernetes exposes a port on the nodes, usually in the 30000-32767 range. The client accesses the application using the Node IP and NodePort, for example `http://10.10.1.20:30080`. Kubernetes forwards that request to the Service, and the Service routes it to one of the backend Pods. In AKS, for production external access, I would normally use a LoadBalancer or Ingress rather than exposing NodePort directly."',
    ],
    code: [
      {
        title: 'NodePort request flow',
        language: 'text',
        code: `User / Client
     |
     | http://<Node-IP>:30080
     ↓
Kubernetes Node
     |
     | NodePort 30080
     ↓
NodePort Service
     |
     ↓
Pod
     |
     ↓
Application container :8080`,
      },
      {
        title: 'NodePort Service',
        language: 'yaml',
        code: `apiVersion: v1
kind: Service
metadata:
  name: my-app
spec:
  type: NodePort
  selector:
    app: my-app
  ports:
    - port: 80
      targetPort: 8080
      nodePort: 30080`,
      },
      {
        title: 'Find the NodePort and node IP',
        language: 'bash',
        code: `kubectl get svc my-app
# NAME     TYPE       CLUSTER-IP    EXTERNAL-IP   PORT(S)
# my-app   NodePort   10.0.10.50    <none>        80:30080/TCP

kubectl get nodes -o wide`,
      },
      {
        title: 'Production path on AKS',
        language: 'text',
        code: `Internet
   ↓
Azure Load Balancer / Application Gateway
   ↓
AKS
   ↓
Service
   ↓
Pods`,
      },
    ],
    tags: ['kubernetes', 'services', 'nodeport', 'aks'],
  },
  {
    id: 'itv-rwip-9',
    level: 'basic',
    kind: 'open',
    prompt: 'What is the difference between CMD and ENTRYPOINT?',
    probing:
      'Override versus append behaviour, the combined ENTRYPOINT + CMD pattern, and why the exec form matters for signals.',
    answer: [
      'In a Dockerfile, both `CMD` and `ENTRYPOINT` define what runs when a container starts, but they behave differently.',
      '**Simple difference**',
      '- **CMD** → provides the default command or default arguments. It can easily be overridden.\n- **ENTRYPOINT** → defines the main executable. Arguments can be passed to it, but the executable normally remains fixed.',
      '**Example with CMD:** Running `docker run myimage` prints `Hello World`. But you can override it: `docker run myimage echo "Hi Siva"` prints `Hi Siva`. The original `CMD` is completely replaced.',
      '**Example with ENTRYPOINT**',
      'Running `docker run myimage "Hello World"` prints `Hello World`. Here ENTRYPOINT = echo and the argument = Hello World. The argument is **appended** to the `ENTRYPOINT`.',
      '**Using both together**',
      'This is a very common pattern. `docker run myimage` effectively runs `echo "Hello World"`, and `docker run myimage "Hi Siva"` prints `Hi Siva`. So ENTRYPOINT = fixed executable and CMD = default argument.',
      "**Comparison:**\n- **Purpose**: CMD: Default command / arguments; ENTRYPOINT: Main executable\n- **Easily overridden?**: CMD: Yes; ENTRYPOINT: Not normally\n- **Arguments appended?**: CMD: No, if CMD is overridden; ENTRYPOINT: Yes\n- **Common use**: CMD: Default behavior; ENTRYPOINT: The container's main application",
      '**Interview answer:** "CMD and ENTRYPOINT both define the container startup behavior. CMD provides a default command or arguments and can be completely overridden when running the container. ENTRYPOINT defines the main executable, and runtime arguments are normally appended to it. We can also use them together, where ENTRYPOINT is the fixed executable and CMD provides its default arguments."',
      '**One important interview point:** prefer the JSON (exec) form rather than the shell form. The exec form handles signals and process management more cleanly, which matters for containers running in Kubernetes.',
    ],
    code: [
      {
        title: 'CMD only',
        language: 'dockerfile',
        code: `FROM ubuntu:22.04

CMD ["echo", "Hello World"]`,
      },
      {
        title: 'Overriding CMD',
        language: 'bash',
        code: `docker run myimage
# Hello World

docker run myimage echo "Hi Siva"
# Hi Siva`,
      },
      {
        title: 'ENTRYPOINT only',
        language: 'dockerfile',
        code: `FROM ubuntu:22.04

ENTRYPOINT ["echo"]`,
      },
      {
        title: 'Arguments are appended to ENTRYPOINT',
        language: 'bash',
        code: `docker run myimage "Hello World"
# Hello World
# ENTRYPOINT = echo, Argument = Hello World`,
      },
      {
        title: 'ENTRYPOINT with CMD defaults',
        language: 'dockerfile',
        code: `FROM ubuntu:22.04

ENTRYPOINT ["echo"]
CMD ["Hello World"]`,
      },
      {
        title: 'Running the combined image',
        language: 'bash',
        code: `docker run myimage
# Hello World   (effectively: echo "Hello World")

docker run myimage "Hi Siva"
# Hi Siva`,
      },
      {
        title: 'Exec form (preferred) vs shell form',
        language: 'dockerfile',
        code: `# Exec (JSON) form - preferred
ENTRYPOINT ["java", "-jar", "app.jar"]

# Shell form - avoid
ENTRYPOINT java -jar app.jar`,
      },
    ],
    tags: ['docker', 'dockerfile', 'cmd', 'entrypoint'],
  },
  {
    id: 'itv-rwip-10',
    level: 'advanced',
    kind: 'scenario',
    prompt: 'If a Secret is changed while Pods are running, what is the effect?',
    probing:
      'That it depends on consumption: env vars never update, mounted volumes update after a delay but the app must re-read, and baked-in secrets ignore the change.',
    answer: [
      'It depends on **how the Secret is consumed by the Pod**. This is an important Kubernetes interview question.',
      '**1. Secret used as an environment variable**',
      'If you change the Secret (for example with `kubectl edit secret db-secret`), the environment variable inside an already-running container does **not** change. The Pod must be restarted or recreated to pick up the new value, for example with `kubectl rollout restart`.',
      'Flow: Secret changed → Existing Pod → Environment variable keeps the OLD value → Pod restart → NEW value loaded.',
      '**2. Secret mounted as a volume**',
      'Here, Kubernetes **can update the mounted Secret files inside the running Pod** after the Secret changes. There can be a short propagation delay.',
      'However, there is an important catch: **your application must actually re-read the file.**',
      "If the application reads the secret only during startup and keeps it in memory, changing the mounted file won't change the application's behavior. You may still need to restart or reload the application.",
      '**3. Secret baked into the Docker image**',
      'If you put a secret directly into the image, changing a Kubernetes Secret has **no effect**. The secret is already part of the image and container configuration. This is also a bad security practice.',
      '**Interview answer:** "The effect depends on how the Secret is consumed. If the Secret is injected as an environment variable, changing the Kubernetes Secret does not update the environment variable in an existing Pod, so we need to restart the Pod to pick up the new value. If the Secret is mounted as a volume, Kubernetes can update the mounted files automatically after a short propagation delay, but the application must re-read the file or reload the configuration. If the application only reads the secret during startup, we still need a restart or reload."',
      '**One more production point**',
      "If you're using **Azure Key Vault with the Secrets Store CSI Driver**, the behavior is slightly different, because the secret can be synced from Key Vault and rotated depending on the rotation configuration. But again, whether the application sees the new value depends on whether it reads the mounted file dynamically or only at startup.",
    ],
    followUps: [
      'Does a Secret mounted with subPath receive updates?',
      'How would you trigger a rolling restart automatically when a Secret changes?',
      'How does rotation polling work in the Secrets Store CSI Driver?',
    ],
    code: [
      {
        title: 'Secret as an environment variable',
        language: 'yaml',
        code: `env:
- name: DB_PASSWORD
  valueFrom:
    secretKeyRef:
      name: db-secret
      key: password`,
      },
      {
        title: 'Change the Secret and restart',
        language: 'bash',
        code: `kubectl edit secret db-secret
kubectl rollout restart deployment my-app`,
      },
      {
        title: 'Environment variable flow',
        language: 'text',
        code: `Secret changed
     ↓
Existing Pod
     ↓
Environment variable keeps the OLD value
     ↓
Pod restart
     ↓
NEW value loaded`,
      },
      {
        title: 'Secret mounted as a volume',
        language: 'yaml',
        code: `volumes:
- name: secret-volume
  secret:
    secretName: db-secret`,
      },
      {
        title: 'Volume flow',
        language: 'text',
        code: `Secret changed
      ↓
Kubernetes updates the mounted volume
      ↓
File inside the Pod gets the new value`,
      },
      {
        title: 'Secret baked into the image (bad practice)',
        language: 'dockerfile',
        code: `ENV DB_PASSWORD=mysecret`,
      },
    ],
    tags: ['kubernetes', 'secrets', 'configuration', 'key vault'],
  },
  {
    id: 'itv-rwip-11',
    level: 'intermediate',
    kind: 'open',
    prompt:
      'In Helm, if you want to deploy one specific version out of three, how will you deploy it?',
    probing:
      'Whether you separate chart version, image version and release revision, and know --version, --set image.tag and helm rollback.',
    answer: [
      'If you have 3 versions of the same Helm chart or application and specifically want to deploy version 2, you need to distinguish between the **Helm chart version** and the **application (image) version**.',
      '**1. If you mean the Helm chart version**',
      'Suppose your Helm repository has myapp 1.0.0, 2.0.0 and 3.0.0. First check the available versions with `helm search repo myapp --versions`, then explicitly install version 2.0.0. `--version` tells Helm which chart version to use.',
      '**2. If you mean the application / image version**',
      'Suppose the same chart can deploy `myapp:1.0`, `myapp:2.0` and `myapp:3.0`. You can specify the image tag with `--set image.tag=2.0`, or, preferably, use a values file.',
      '**3. If the versions already exist as Helm releases**',
      'If you mean deploying or rolling back to an earlier release revision, check `helm history myapp`. To go back to revision 1, run `helm rollback myapp 1`, then verify with `helm status myapp`.',
      '**Interview answer:** "First I clarify whether the version refers to the Helm chart version or the application image version. If I need a specific Helm chart version, I use `helm upgrade --install` with `--version`, for example `--version 2.0.0`. If I need a specific application version, I pass the required image tag using `--set image.tag=2.0`. If the required version was already deployed previously and I need to revert to that release, I check `helm history` and use `helm rollback` with the required revision."',
    ],
    code: [
      {
        title: 'Chart versions in the repository',
        language: 'text',
        code: `myapp
├── 1.0.0
├── 2.0.0
└── 3.0.0`,
      },
      {
        title: 'Install a specific chart version',
        language: 'bash',
        code: `helm search repo myapp --versions

helm upgrade --install myapp myrepo/myapp \\
  --version 2.0.0`,
      },
      {
        title: 'Pick the image tag on the command line',
        language: 'bash',
        code: `helm upgrade --install myapp ./mychart \\
  --set image.tag=2.0`,
      },
      {
        title: 'values-prod.yaml',
        language: 'yaml',
        code: `image:
  repository: myacr.azurecr.io/myapp
  tag: "2.0"`,
      },
      {
        title: 'Deploy with the values file',
        language: 'bash',
        code: `helm upgrade --install myapp ./mychart \\
  -f values-prod.yaml`,
      },
      {
        title: 'Roll back to an earlier release revision',
        language: 'bash',
        code: `helm history myapp
# REVISION   STATUS
# 1          superseded
# 2          superseded
# 3          deployed

helm rollback myapp 1
helm status myapp`,
      },
    ],
    tags: ['helm', 'versioning', 'rollback', 'kubernetes'],
  },
  {
    id: 'itv-rwip-12',
    level: 'advanced',
    kind: 'scenario',
    prompt: 'What will happen if kubelet is not running?',
    probing:
      'What kubelet does, that containers may keep running unmanaged, the NotReady/eviction sequence, and how to troubleshoot on the node.',
    answer: [
      'If kubelet is not running on a Kubernetes worker node, that node **cannot properly participate in Kubernetes workload management**.',
      '**What does kubelet do?**',
      'kubelet is the agent running on every worker node. It:',
      '- Communicates with the Kubernetes API server.\n- Watches for Pods assigned to its node.\n- Creates and manages containers through the container runtime.\n- Handles liveness, readiness and startup probes.\n- Reports node and Pod status back to the API server.',
      '**If kubelet stops:** The API server will eventually detect that the node is not responding, and `kubectl get nodes` may show it as `NotReady`.',
      '**What happens to existing Pods?**',
      'This is an important distinction. The container runtime **may continue running existing containers** even if kubelet stops. But kubelet is no longer managing them or reporting their state to the API server, so Kubernetes loses reliable management and health reporting for that node.',
      'After the node is considered unavailable, Kubernetes may eventually evict and reschedule workloads, depending on the Pod and controller configuration.',
      '**What happens to new Pods?**',
      "The scheduler may initially see the node as available, but once the node becomes `NotReady` and is no longer considered suitable, new Pods won't normally be scheduled there. Existing workloads managed by Deployments or ReplicaSets can be recreated on healthy nodes after eviction.",
      '**Troubleshooting:** On the affected node, check `systemctl status kubelet`, read the logs with `journalctl -u kubelet -f`, restart it with `systemctl restart kubelet`, then confirm with `kubectl get nodes`.',
      '**Interview answer:** "Kubelet is the agent responsible for managing Pods on a Kubernetes node and communicating node and Pod status to the API server. If kubelet stops, existing containers may continue running through the container runtime, but Kubernetes loses management and status reporting for that node. The node will eventually become NotReady, new workloads won\'t be scheduled there, and controllers may reschedule affected Pods to healthy nodes. I would troubleshoot using `systemctl status kubelet` and `journalctl -u kubelet`."',
    ],
    followUps: [
      'How long before the node is marked NotReady, and before Pods are evicted?',
      'What happens to StatefulSet Pods on a node that went NotReady?',
      'How would you troubleshoot this on AKS where you do not SSH to nodes by default?',
    ],
    code: [
      {
        title: 'One node with kubelet down',
        language: 'text',
        code: `              API Server
                  |
          ----------------
          |              |
       Node-1          Node-2
     kubelet ✅      kubelet ❌`,
      },
      {
        title: 'Node status',
        language: 'bash',
        code: `kubectl get nodes
# NAME      STATUS
# node-1    Ready
# node-2    NotReady`,
      },
      {
        title: 'Existing containers without kubelet',
        language: 'text',
        code: `kubelet ❌
    |
    └── Existing containers may continue running`,
      },
      {
        title: 'Troubleshoot on the node',
        language: 'bash',
        code: `systemctl status kubelet
journalctl -u kubelet -f
systemctl restart kubelet
kubectl get nodes`,
      },
    ],
    tags: ['kubernetes', 'kubelet', 'node', 'troubleshooting'],
  },
  {
    id: 'itv-rwip-13',
    level: 'advanced',
    kind: 'scenario',
    prompt: 'Pods are in NotReady state and nodes are in NotReady state. What is the reason?',
    probing:
      'Treating Pod NotReady and Node NotReady as different problems, with the right starting commands and likely causes for each.',
    answer: [
      'There are two different problems here: **Pod NotReady** and **Node NotReady**. The troubleshooting approach is slightly different.',
      '**1. Pod is NotReady**',
      'First check `kubectl get pods` and `kubectl describe pod <pod-name>`. Look at the **Conditions** and **Events**. Common reasons:',
      "**Readiness probe failure.** For example `Readiness probe failed: HTTP probe failed with statuscode: 503`. The application may be running, but it isn't ready to receive traffic. Check `kubectl logs` and `kubectl describe pod`.",
      '**Application or container problem.** Examples are `CrashLoopBackOff`, `OOMKilled` and `ImagePullBackOff`. Check `kubectl logs <pod-name>` and `kubectl logs <pod-name> --previous`.',
      '**Dependency problem.** For example, the application is running but cannot connect to:',
      '- PostgreSQL\n- Redis\n- another microservice\n- an external API',
      'The readiness probe may therefore fail.',
      '**Wrong port or probe configuration.** For example, the application listens on `8080` but the readiness probe checks `8081`. The Pod stays NotReady.',
      '**2. Node is NotReady**',
      'Check `kubectl get nodes` and `kubectl describe node <node-name>`. Look at the **Conditions** section. Common reasons:',
      '**Kubelet is down.** Check `systemctl status kubelet` and the logs with `journalctl -u kubelet`.',
      "**Node has CPU, memory or disk pressure.** `kubectl describe node` may show `MemoryPressure=True`, `DiskPressure=True` or `PIDPressure=True`. For example, if the node's disk is full, kubelet may report `DiskPressure=True`.",
      "**Container runtime problem.** For example, containerd is down (`systemctl status containerd`). If the container runtime isn't working, kubelet cannot properly manage containers.",
      '**Network problem.** The node may not be able to communicate with the Kubernetes API server. Check the kubelet logs and network connectivity.',
      '**CNI / network plugin problem.** If Azure CNI or another Kubernetes networking component is broken, Pods may have networking problems, and the node can become unhealthy depending on the failure.',
      '**Certificate or authentication issue.** Kubelet certificates or credentials can expire or become invalid, preventing proper communication with the API server.',
      '**Very important interview distinction**',
      "Don't troubleshoot both in exactly the same way.",
      '- **Start with**: Pod NotReady: `kubectl describe pod <pod>`, `kubectl logs <pod>`; Node NotReady: `kubectl describe node <node>`, then on the node: `systemctl status kubelet`, `systemctl status containerd`, `journalctl -u kubelet`\n- **Focus on**: Pod NotReady: Readiness probe, application, dependencies, container status, configuration; Node NotReady: Kubelet, container runtime, CPU / memory / disk pressure, network, certificates, node health',
      '**Interview answer:** "If a Pod is NotReady, I first check `kubectl describe pod` and the Pod logs. I specifically look for readiness probe failures, application issues, dependency connectivity, incorrect ports, or resource problems. If a Node is NotReady, I check `kubectl describe node` and look at the node conditions. Then I verify kubelet and container runtime status, CPU, memory and disk pressure, network connectivity to the API server, and kubelet logs. I identify the exact condition or event first rather than restarting components blindly."',
    ],
    followUps: [
      'If every Pod on one node is NotReady at once, which side do you suspect first?',
      'Should a readiness probe check downstream dependencies like the database?',
      'How would you find a node with DiskPressure on AKS and clear it?',
    ],
    code: [
      {
        title: 'Pod NotReady: first checks',
        language: 'bash',
        code: `kubectl get pods
kubectl describe pod <pod-name>
kubectl logs <pod-name>
kubectl logs <pod-name> --previous`,
        placeholders: ['<pod-name>'],
      },
      {
        title: 'Typical Pod-side messages',
        language: 'text',
        code: `Readiness probe failed: HTTP probe failed with statuscode: 503

CrashLoopBackOff
OOMKilled
ImagePullBackOff`,
      },
      {
        title: 'Node NotReady: first checks',
        language: 'bash',
        code: `kubectl get nodes
kubectl describe node <node-name>

# On the node
systemctl status kubelet
journalctl -u kubelet
systemctl status containerd`,
        placeholders: ['<node-name>'],
      },
      {
        title: 'Node pressure conditions',
        language: 'text',
        code: `MemoryPressure=True
DiskPressure=True
PIDPressure=True`,
      },
    ],
    tags: ['kubernetes', 'notready', 'readiness probe', 'kubelet', 'troubleshooting'],
  },
  {
    id: 'itv-rwip-14',
    level: 'advanced',
    kind: 'scenario',
    prompt: 'If you restore a backup in Jenkins, will it work?',
    probing:
      'What JENKINS_HOME must contain, plugin and version compatibility, the secrets/ encryption keys for credentials, and testing restores.',
    answer: [
      '**Yes**, a Jenkins backup can be restored and Jenkins can work, but it depends on **what was backed up** and whether the restore is **compatible** with the Jenkins environment.',
      '**What needs to be backed up?**',
      'The most important Jenkins data is the `JENKINS_HOME` directory. It contains jobs, `credentials.xml`, `config.xml`, users, nodes, plugins, secrets, fingerprints and the pipelines / jobs configuration.',
      'A proper backup should protect the Jenkins configuration, jobs, credentials, secrets, and other required metadata.',
      '**Restore process:** Suppose the old Jenkins server failed: back up JENKINS_HOME from the old Jenkins, prepare a new Jenkins server, install a compatible Jenkins version, restore JENKINS_HOME and start Jenkins. Stop Jenkins, restore the backup into the correct Jenkins home, fix the ownership, start it and verify.',
      '**Important issue: plugins**',
      'This is where restores can fail. Suppose the backup was created on Jenkins version A with plugin versions X, and you restore it onto a completely different Jenkins and plugin environment. You can run into:',
      '- Plugin incompatibility\n- Missing plugins\n- Failed jobs\n- Configuration errors',
      'So ideally, restore onto the **same or a compatible Jenkins version and plugin versions**, then upgrade in a controlled manner.',
      '**Credentials are especially important**',
      "Jenkins credentials are **encrypted**. Restoring only `credentials.xml` is not enough if the matching Jenkins encryption keys are missing. That's why a proper Jenkins backup must include the relevant files under `JENKINS_HOME/secrets/`. Without the required encryption keys, previously stored credentials may not be usable.",
      '**Interview answer:** "Yes, Jenkins can be restored from backup, provided the backup is complete and the restored environment is compatible. I would normally back up the entire JENKINS_HOME, including job configurations, credentials, plugins, users, secrets, and system configuration. During DR, I install a compatible Jenkins version, restore JENKINS_HOME, maintain the correct ownership and permissions, verify plugins and credentials, and then start Jenkins. I would also test the restored pipelines before considering the recovery successful."',
      '**Production best practice**',
      "Don't rely only on a Jenkins server snapshot. Keep regular, tested backups of `JENKINS_HOME` and periodically perform a restore test. **A backup that has never been restored is not a proven backup.**",
    ],
    followUps: [
      'Which parts of JENKINS_HOME can you safely exclude from a backup to keep it small?',
      'How would Configuration as Code (JCasC) change your backup and restore strategy?',
      'How do you take a consistent backup while builds are running?',
    ],
    code: [
      {
        title: 'JENKINS_HOME layout',
        language: 'text',
        code: `JENKINS_HOME/
├── jobs/
├── credentials.xml
├── config.xml
├── users/
├── nodes/
├── plugins/
├── secrets/
├── fingerprints/
└── pipelines / jobs configuration`,
      },
      {
        title: 'Restore flow',
        language: 'text',
        code: `Old Jenkins
     ↓
Backup JENKINS_HOME
     ↓
New Jenkins server
     ↓
Install a compatible Jenkins version
     ↓
Restore JENKINS_HOME
     ↓
Start Jenkins`,
      },
      {
        title: 'Restore commands',
        language: 'bash',
        code: `systemctl stop jenkins

# Restore the backup into the correct Jenkins home
cp -r /backup/jenkins_home/* /var/lib/jenkins/

# Fix the ownership
chown -R jenkins:jenkins /var/lib/jenkins

systemctl start jenkins
systemctl status jenkins`,
      },
    ],
    tags: ['jenkins', 'backup', 'disaster recovery', 'credentials'],
  },
  {
    id: 'itv-rwip-15',
    level: 'intermediate',
    kind: 'open',
    prompt: 'How do you store secrets in Jenkins?',
    probing:
      'Jenkins Credentials with withCredentials, masking and not printing secrets, and an external vault such as Azure Key Vault for production.',
    answer: [
      'In Jenkins, I would **not** store secrets directly in the Jenkinsfile. I use **Jenkins Credentials** or an external secret manager such as **Azure Key Vault**.',
      '**1. Jenkins Credentials Store**',
      'Go to Jenkins → Manage Jenkins → Credentials → Global → Add Credentials. You can store:',
      '- Username / password\n- Secret text\n- SSH private key\n- Certificate\n- Secret files\n- API tokens',
      "For example, create a credential with the ID `azure-sp-credentials` and use it in the pipeline. The actual secret isn't written in the Jenkinsfile.",
      '**2. Mask secrets in console output**',
      'Jenkins credentials binding masks recognized secret values in build logs. But don\'t do `echo "$AZURE_CLIENT_SECRET"`. Even though Jenkins may mask it, never intentionally print secrets.',
      'Also avoid `set -x` when running commands that contain sensitive values.',
      '**3. External secret manager**',
      'In an Azure environment, I would prefer **Azure Key Vault** for important production secrets. Example architecture: Jenkins → (Managed Identity / Workload Identity) → Azure Key Vault → Secrets → Application / Deployment.',
      'This keeps sensitive values outside Jenkins and provides centralized secret management, access control, auditing and rotation.',
      '**4. What I would avoid**',
      "Don't store secrets in a Jenkinsfile `environment` block, don't commit a plain `password:` value to Git, and don't put credentials in Dockerfiles or container images.",
      '**Interview answer:** "I store secrets using Jenkins Credentials rather than hardcoding them in the Jenkinsfile or Git repository. I create the credential in the Jenkins Credentials Store and reference it by credentialsId using withCredentials or the credentials binding mechanism. Jenkins masks the values in console output, and I make sure not to print secrets. For production environments, especially in Azure, I prefer using Azure Key Vault as the centralized secret store and allow Jenkins to access it through an appropriate identity."',
    ],
    code: [
      {
        title: 'Where credentials live in the UI',
        language: 'text',
        code: `Jenkins
 → Manage Jenkins
 → Credentials
 → Global
 → Add Credentials`,
      },
      {
        title: 'Jenkinsfile using withCredentials',
        language: 'text',
        code: `pipeline {
    agent any

    stages {
        stage('Deploy') {
            steps {
                withCredentials([
                    usernamePassword(
                        credentialsId: 'azure-sp-credentials',
                        usernameVariable: 'AZURE_CLIENT_ID',
                        passwordVariable: 'AZURE_CLIENT_SECRET'
                    )
                ]) {
                    sh '''
                        az login \\
                          --service-principal \\
                          -u "$AZURE_CLIENT_ID" \\
                          -p "$AZURE_CLIENT_SECRET" \\
                          --tenant "$AZURE_TENANT_ID"
                    '''
                }
            }
        }
    }
}`,
      },
      {
        title: 'Never do this in a build step',
        language: 'bash',
        code: `echo "$AZURE_CLIENT_SECRET"
set -x`,
      },
      {
        title: 'Key Vault architecture',
        language: 'text',
        code: `Jenkins
   |
   | Managed Identity / Workload Identity
   ↓
Azure Key Vault
   |
   ↓
Secrets
   |
   ↓
Application / Deployment`,
      },
      {
        title: 'Anti-pattern: secret in the Jenkinsfile',
        language: 'text',
        code: `environment {
    DB_PASSWORD = 'MyPassword123'
}`,
      },
      {
        title: 'Anti-pattern: secret committed to Git',
        language: 'yaml',
        code: `password: MyPassword123`,
      },
    ],
    tags: ['jenkins', 'secrets', 'credentials', 'key vault', 'security'],
  },
]
