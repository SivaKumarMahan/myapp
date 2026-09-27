import type { InterviewQuestion } from '../../../types'

/** AKS architecture, networking, identity, ingress, upgrades and troubleshooting. */
export const azureComputeAksQuestions: InterviewQuestion[] = [
  {
    id: 'itv-azc-14',
    level: 'basic',
    kind: 'open',
    prompt:
      'Describe the architecture of an AKS cluster. What does Microsoft manage, what do you manage, and why have separate system and user node pools?',
    probing:
      'The shared responsibility line in AKS and the basic building blocks - node pools, the node resource group, the tiers.',
    answer: [
      'An AKS cluster has two halves. The **control plane** - API server, etcd, scheduler, controller manager - is **managed by Microsoft**: you do not see its VMs, and on the Free tier you do not pay for it. The **Standard** tier adds a financially backed uptime SLA and higher scale limits, and **Premium** adds long-term support versions.',
      'The **nodes** are VM Scale Sets in **your subscription**, in a separate **node resource group** usually named `MC_...`. They run your pods plus system components like CoreDNS, the CNI and the metrics server. You are responsible for choosing their sizes, keeping their node images updated - which AKS can automate - and upgrading Kubernetes versions.',
      'Nodes are grouped into **node pools**, each with one VM size and OS. A **system node pool** runs critical system pods; a **user node pool** runs your applications. Separating them means a noisy application cannot starve CoreDNS or the metrics server, and lets you give each pool the right VM size, zones and autoscaling. I usually taint the system pool with `CriticalAddonsOnly` so application pods stay off it, and add extra user pools for special needs like GPUs, Windows containers or spot capacity.',
    ],
    diagrams: [
      {
        kind: 'nested',
        title: 'What lives where in AKS',
        caption:
          'Microsoft runs the control plane; the node pools are VM Scale Sets in your subscription.',
        root: {
          label: 'AKS cluster',
          children: [
            {
              label: 'Control plane (Microsoft managed)',
              detail: 'API server, etcd, scheduler',
              tone: 'muted',
            },
            {
              label: 'Node resource group MC_...',
              tone: 'accent',
              children: [
                { label: 'System node pool', detail: 'CoreDNS, CNI, metrics; tainted' },
                { label: 'User node pool', detail: 'Application pods, autoscaled' },
                { label: 'Spot or GPU pool', detail: 'Optional, taints and tolerations' },
              ],
            },
          ],
        },
      },
    ],
    code: [
      {
        title: 'A cluster with separate system and user pools across zones',
        language: 'bash',
        code: `az aks create -g rg-aks -n aks-shop-prod --tier standard \\
  --nodepool-name system --node-count 3 --node-vm-size Standard_D4ds_v5 \\
  --zones 1 2 3 --nodepool-taints CriticalAddonsOnly=true:NoSchedule \\
  --network-plugin azure --network-plugin-mode overlay \\
  --enable-managed-identity --enable-oidc-issuer --enable-workload-identity

az aks nodepool add -g rg-aks --cluster-name aks-shop-prod -n apps \\
  --mode User --node-vm-size Standard_D8ds_v5 --zones 1 2 3 \\
  --enable-cluster-autoscaler --min-count 3 --max-count 15`,
      },
    ],
    traps: [
      'Editing resources in the MC_ node resource group by hand; AKS may revert them or break.',
      'Running application pods on an untainted system pool.',
      'Assuming the Free tier comes with an uptime SLA.',
    ],
    followUps: [
      'What happens to your workloads if the control plane is unavailable?',
      'Why can you not delete the last system node pool?',
    ],
    tags: ['aks', 'architecture', 'node pools', 'kubernetes'],
  },
  {
    id: 'itv-azc-15',
    level: 'advanced',
    kind: 'open',
    prompt:
      'Compare the AKS networking options: kubenet, Azure CNI, Azure CNI Overlay and Azure CNI powered by Cilium. What would you choose today?',
    probing:
      'IP address planning consequences, performance and policy features, and awareness that kubenet is being retired.',
    answer: [
      '**Kubenet** gave nodes VNet IPs and pods addresses from a separate range, routed with a route table. It is simple but limited - no Windows pools, route table limits, extra hops - and it is on a **retirement path**, so I would not choose it for anything new.',
      '**Azure CNI** in its classic "flat" form gives **every pod a real VNet IP**. Pods are directly routable from peered VNets and on-premises, which some integrations need, but it consumes a lot of address space: nodes multiplied by max pods per node, reserved up front. A variant with **dynamic pod IP allocation** uses a separate pod subnet and allocates on demand, which reduces waste.',
      '**Azure CNI Overlay** gives nodes VNet IPs and pods IPs from a **private overlay CIDR** that is not part of the VNet. Pod traffic leaving the cluster is NATed to the node IP. It **saves huge amounts of VNet address space**, scales to large clusters, and performs close to flat CNI. The tradeoff is that pods are not directly addressable from outside the cluster - you reach them through services and ingress, which is how you should reach them anyway.',
      '**Azure CNI powered by Cilium** replaces the data plane with **eBPF**: faster service routing without kube-proxy iptables, built-in **network policy** enforcement, and better observability. It works with overlay or pod-subnet modes. My default today is **Azure CNI Overlay with the Cilium data plane**, and flat CNI only when something outside the cluster must reach pod IPs directly.',
    ],
    diagrams: [
      {
        kind: 'decision',
        title: 'Which AKS network model?',
        caption:
          'Overlay with Cilium is the modern default; flat IPs only when you truly need them.',
        question: 'What must pod networking provide?',
        branches: [
          {
            condition: 'Save VNet IPs, large scale',
            result: 'Azure CNI Overlay',
            detail: 'Pods NAT to node IP on egress',
            tone: 'success',
          },
          {
            condition: 'Pods directly routable from VNet',
            result: 'Azure CNI, pod subnet',
            detail: 'Dynamic allocation reduces waste',
            tone: 'accent',
          },
          {
            condition: 'eBPF performance and policy',
            result: 'Add Cilium data plane',
            detail: 'Works with overlay or pod subnet',
          },
          {
            condition: 'Existing kubenet cluster',
            result: 'Plan migration to overlay',
            detail: 'Kubenet is being retired',
            tone: 'warning',
          },
        ],
      },
    ],
    code: [
      {
        title: 'Overlay with the Cilium data plane',
        language: 'bash',
        code: `az aks create -g rg-aks -n aks-shop-prod \\
  --network-plugin azure --network-plugin-mode overlay \\
  --pod-cidr 192.168.0.0/16 \\
  --network-dataplane cilium --network-policy cilium \\
  --vnet-subnet-id <node-subnet-id>

# In-place upgrade of an existing kubenet cluster to overlay
az aks update -g rg-aks -n aks-legacy --network-plugin azure --network-plugin-mode overlay`,
        placeholders: ['<node-subnet-id>'],
      },
      {
        title: 'Default-deny network policy for a namespace',
        language: 'yaml',
        code: `apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: default-deny
  namespace: orders
spec:
  podSelector: {}
  policyTypes:
    - Ingress
---
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: allow-from-ingress
  namespace: orders
spec:
  podSelector:
    matchLabels:
      app: orders-api
  ingress:
    - from:
        - namespaceSelector:
            matchLabels:
              kubernetes.io/metadata.name: ingress
      ports:
        - port: 8080`,
      },
    ],
    deeper: [
      'The overlay pod CIDR must not overlap with anything the pods need to reach - on-premises ranges included - even though it is not in the VNet, because pods use it as their source inside the cluster.',
      'Egress from overlay pods appears as the **node IP**. Firewall rules and partner allowlists work on node subnets or, better, on a NAT gateway or firewall egress IP.',
      'The network plugin is hard to change after creation. Some migrations are supported in place, but choosing right at creation avoids a rebuild.',
    ],
    traps: [
      'Sizing a flat CNI subnet for nodes only.',
      'Choosing kubenet for a new cluster in 2026.',
      'Believing pods on overlay are unreachable for ingress - services and ingress work normally.',
    ],
    followUps: [
      'How many IPs does a 50-node flat CNI cluster with max 30 pods per node reserve?',
      'How do you enforce network policy with Cilium versus Azure Network Policy Manager?',
    ],
    tags: ['aks', 'networking', 'azure cni', 'overlay', 'cilium'],
  },
  {
    id: 'itv-azc-16',
    level: 'advanced',
    kind: 'open',
    prompt:
      'How does Microsoft Entra Workload ID work in AKS? Walk me through letting a pod read from Key Vault without secrets.',
    probing:
      'The modern pod identity mechanism end to end - OIDC issuer, service account, federated credential, the webhook - and why it replaced pod-managed identity.',
    answer: [
      'Workload ID is **workload identity federation applied to Kubernetes service accounts**. The cluster runs an **OIDC issuer** that signs service account tokens. You create a **user-assigned managed identity**, and on it a **federated credential** saying "trust tokens from this cluster’s issuer whose subject is `system:serviceaccount:orders:orders-sa`".',
      'In the cluster, the **service account** is annotated with the identity’s **client ID**, and pods that use it carry the label `azure.workload.identity/use: "true"`. A mutating **webhook** then injects environment variables and a projected service account token into the pod.',
      'At run time the Azure SDK’s `DefaultAzureCredential` or `WorkloadIdentityCredential` reads that projected token, exchanges it with Entra for an access token for the managed identity, and calls Key Vault. The managed identity holds **Key Vault Secrets User** on the vault. **No secret exists anywhere** - not in the cluster, not in the image.',
      'It replaced the older **pod-managed identity** add-on, which intercepted calls to the instance metadata endpoint and was fragile. And it is much better than the **kubelet identity** approach, because each workload gets its own identity instead of every pod on a node sharing one.',
    ],
    diagrams: [
      {
        kind: 'sequence',
        title: 'A pod getting an Entra token',
        caption: 'The only trust is issuer plus exact service account subject.',
        participants: [
          { id: 'pod', label: 'Pod (SDK)' },
          { id: 'k8s', label: 'AKS OIDC issuer' },
          { id: 'entra', label: 'Entra ID' },
          { id: 'kv', label: 'Key Vault' },
        ],
        messages: [
          { from: 'k8s', to: 'pod', label: 'Projected SA token (webhook)' },
          { from: 'pod', to: 'entra', label: 'Exchange SA token for access token' },
          { from: 'entra', to: 'k8s', label: 'Fetch signing keys (JWKS)' },
          { from: 'entra', to: 'pod', label: 'Token for managed identity', kind: 'return' },
          { from: 'pod', to: 'kv', label: 'GET secret with bearer token' },
          { from: 'kv', to: 'pod', label: 'Secret value', kind: 'return' },
        ],
      },
    ],
    code: [
      {
        title: 'Identity, federated credential and role',
        language: 'bash',
        code: `ISSUER=$(az aks show -g rg-aks -n aks-shop-prod --query oidcIssuerProfile.issuerUrl -o tsv)

az identity create -g rg-aks -n id-orders
CLIENT_ID=$(az identity show -g rg-aks -n id-orders --query clientId -o tsv)
PRINCIPAL_ID=$(az identity show -g rg-aks -n id-orders --query principalId -o tsv)

az identity federated-credential create -g rg-aks --identity-name id-orders -n fc-orders \\
  --issuer "$ISSUER" \\
  --subject system:serviceaccount:orders:orders-sa \\
  --audiences api://AzureADTokenExchange

az role assignment create --assignee-object-id "$PRINCIPAL_ID" \\
  --assignee-principal-type ServicePrincipal --role "Key Vault Secrets User" \\
  --scope $(az keyvault show -n kv-orders-prod --query id -o tsv)`,
      },
      {
        title: 'Service account and pod',
        language: 'yaml',
        code: `apiVersion: v1
kind: ServiceAccount
metadata:
  name: orders-sa
  namespace: orders
  annotations:
    azure.workload.identity/client-id: "<client-id>"
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: orders-api
  namespace: orders
spec:
  replicas: 3
  selector:
    matchLabels:
      app: orders-api
  template:
    metadata:
      labels:
        app: orders-api
        azure.workload.identity/use: "true"
    spec:
      serviceAccountName: orders-sa
      containers:
        - name: api
          image: acrshop.azurecr.io/orders:1.5.0
          env:
            - name: KEYVAULT_URL
              value: https://kv-orders-prod.vault.azure.net/`,
        placeholders: ['<client-id>'],
      },
    ],
    deeper: [
      'The **subject must match exactly** - namespace and service account name. Renaming either, or deploying to a new namespace, silently breaks token exchange with an AADSTS error.',
      'The label goes on the **pod template**, not the Deployment’s own metadata. It is a frequent mistake that leaves the webhook doing nothing.',
      'For Key Vault specifically, the **Secrets Store CSI driver** can use the same workload identity to mount secrets as files and optionally sync Kubernetes secrets, for apps that cannot use the SDK.',
    ],
    traps: [
      'Granting the kubelet identity access to Key Vault so every pod on every node can read it.',
      'Forgetting --enable-oidc-issuer and --enable-workload-identity on the cluster.',
      'A subject for the wrong namespace.',
    ],
    followUps: [
      'How would you use the same pattern for a pod calling Azure SQL?',
      'What limits apply to federated credentials per identity?',
    ],
    tags: ['aks', 'workload identity', 'managed identity', 'key vault', 'federation'],
  },
  {
    id: 'itv-azc-17',
    level: 'intermediate',
    kind: 'open',
    prompt: 'What are the options for ingress into AKS, and which would you pick?',
    probing:
      'Awareness of the current landscape - managed NGINX, Application Gateway for Containers, Gateway API, service meshes - and how the choice interacts with WAF and private networking.',
    answer: [
      'The simplest layer is a Kubernetes **Service of type LoadBalancer**, which gives an Azure Load Balancer IP per service - fine for TCP services, wasteful and feature-poor for many HTTP apps.',
      'For HTTP routing you want an ingress or **Gateway API** implementation. The **application routing add-on** is a Microsoft-managed NGINX-based ingress controller with integration for Azure DNS and Key Vault certificates. Because the upstream community ingress-nginx project has been retired, I would check the add-on’s current support position and prefer Gateway API-based options for new designs.',
      '**Application Gateway for Containers** is Azure’s managed layer 7 load balancer for AKS. It runs outside the cluster, is configured through **Gateway API** or Ingress resources by an ALB controller, supports traffic splitting and mutual TLS, and integrates with WAF. It is the successor to the older AGIC approach with a classic Application Gateway. The **Istio-based service mesh add-on** also provides ingress gateways if you are adopting the mesh anyway.',
      'My usual pick for a new production cluster is **Application Gateway for Containers with Gateway API**, fronted by **Front Door** for public apps, and an internal option for private apps. The key is choosing one pattern for the platform and templating it, not letting each team run its own controller.',
    ],
    code: [
      {
        title: 'Gateway API: an HTTPRoute with a canary split',
        language: 'yaml',
        code: `apiVersion: gateway.networking.k8s.io/v1
kind: HTTPRoute
metadata:
  name: orders
  namespace: orders
spec:
  parentRefs:
    - name: gateway-shop
      namespace: infra
  hostnames:
    - orders.shop.example
  rules:
    - matches:
        - path:
            type: PathPrefix
            value: /api
      backendRefs:
        - name: orders-v1
          port: 8080
          weight: 90
        - name: orders-v2
          port: 8080
          weight: 10`,
      },
      {
        title: 'Enable the managed options',
        language: 'bash',
        code: `# Application routing add-on (managed NGINX)
az aks approuting enable -g rg-aks -n aks-shop-prod

# Istio-based service mesh add-on with an external ingress gateway
az aks mesh enable -g rg-aks -n aks-shop-prod
az aks mesh enable-ingress-gateway -g rg-aks -n aks-shop-prod --ingress-gateway-type external`,
      },
    ],
    traps: [
      'A public LoadBalancer service per microservice.',
      'Every team installing its own ingress controller.',
      'Starting a new design on a controller whose upstream is retired.',
    ],
    followUps: [
      'What does Gateway API improve over the Ingress resource?',
      'How would you put a WAF in front of AKS?',
    ],
    tags: ['aks', 'ingress', 'gateway api', 'application gateway for containers'],
  },
  {
    id: 'itv-azc-18',
    level: 'advanced',
    kind: 'open',
    prompt:
      'How do you keep AKS clusters upgraded safely? Cover Kubernetes version upgrades, node image updates and how the cluster autoscaler fits in.',
    probing:
      'Operational maturity: the two upgrade streams, automation channels, maintenance windows, surge, PDBs, and testing before production.',
    answer: [
      'There are two separate streams. **Kubernetes version upgrades** - 1.31 to 1.32 - change the control plane and node kubelets. AKS supports a rolling window of minor versions, and you cannot skip minors, so falling behind makes upgrades harder and eventually leaves you unsupported. **Node image upgrades** refresh the node OS and runtime with security patches, weekly or so, without changing Kubernetes version.',
      'I automate both with **channels**: a cluster **auto-upgrade channel** such as `patch` or `stable`, and a **node OS upgrade channel** such as `NodeImage` or `SecurityPatch`, each bound to a **planned maintenance window** outside business hours. Production follows the same versions after they have soaked in dev and staging for a week or two.',
      'An upgrade upgrades the **control plane first**, then each node pool by adding **surge nodes**, cordoning and draining old nodes, and replacing them. Surge - a count or a percentage like 33% - trades speed against extra capacity cost. **Pod disruption budgets** keep enough replicas running during the drain; they must allow at least one disruption, or the drain can never complete.',
      'The **cluster autoscaler** keeps working during upgrades and also matters for them: it needs room under the pool’s max count and subscription quota for surge nodes. Before a Kubernetes upgrade I also check for **deprecated APIs** the new version removes, since manifests using them will fail to apply afterwards.',
    ],
    code: [
      {
        title: 'Channels, maintenance windows and surge',
        language: 'bash',
        code: `az aks update -g rg-aks -n aks-shop-prod \\
  --auto-upgrade-channel patch --node-os-upgrade-channel NodeImage

az aks maintenanceconfiguration add -g rg-aks --cluster-name aks-shop-prod \\
  --name aksManagedAutoUpgradeSchedule --schedule-type Weekly \\
  --day-of-week Sunday --start-time 02:00 --duration 4 --utc-offset +00:00

az aks nodepool update -g rg-aks --cluster-name aks-shop-prod -n apps --max-surge 33%

# What can I upgrade to?
az aks get-upgrades -g rg-aks -n aks-shop-prod -o table`,
      },
      {
        title: 'A PDB that lets drains make progress',
        language: 'yaml',
        code: `apiVersion: policy/v1
kind: PodDisruptionBudget
metadata:
  name: orders-api
  namespace: orders
spec:
  maxUnavailable: 1        # with 3+ replicas, one can always move
  selector:
    matchLabels:
      app: orders-api`,
      },
    ],
    diagrams: [
      {
        kind: 'flow',
        title: 'A node pool upgrade, one batch',
        caption: 'Surge adds capacity first; PDBs decide how fast pods can move.',
        nodes: [
          { label: 'Control plane upgraded', tone: 'accent' },
          { label: 'Add surge nodes on new version', detail: 'Needs quota and max count' },
          { label: 'Cordon and drain an old node' },
          {
            label: 'Evictions respect PDBs',
            branch: { label: 'PDB allows zero', detail: 'Drain stalls', tone: 'danger' },
          },
          { label: 'Delete old node, next batch' },
          { label: 'Pool on new version', tone: 'success' },
        ],
      },
    ],
    deeper: [
      'Blue-green node pools - create a new pool on the new version, move workloads with taints or labels, delete the old pool - give you a fast rollback that an in-place upgrade does not.',
      'Once the control plane is upgraded it cannot be downgraded. That is the real reason to soak versions in lower environments first.',
      'Long-term support versions on the Premium tier give a much longer window for teams that cannot upgrade often, at a cost.',
    ],
    traps: [
      'Ignoring upgrades until the version is out of support.',
      'PDBs with maxUnavailable 0 or minAvailable equal to replicas.',
      'Upgrading production first.',
      'No quota for surge nodes.',
    ],
    followUps: [
      'How do you find deprecated APIs before an upgrade?',
      'When would you use blue-green node pools instead of in-place upgrades?',
    ],
    tags: ['aks', 'upgrades', 'cluster autoscaler', 'pdb', 'operations'],
  },
  {
    id: 'itv-azc-19',
    level: 'advanced',
    kind: 'scenario',
    prompt:
      'After a deploy, some AKS pods are Pending, some are in ImagePullBackOff and some are in CrashLoopBackOff. Walk me through how you work through each.',
    probing:
      'Structured Kubernetes troubleshooting on Azure: each status has a different cause and a different first command.',
    answer: [
      'Each status tells me where to look, and **`kubectl describe pod`** - especially the **Events** at the bottom - is the first command for all three.',
      '**Pending** means the scheduler cannot place the pod. The events say why: **insufficient CPU or memory** for the requests, a **node selector, affinity or taint** that no node satisfies, or a **PersistentVolumeClaim** that cannot bind - for example an Azure Disk in zone 1 while the only nodes with room are in zone 2. If it is capacity, the cluster autoscaler should add nodes; if it does not, it is at its max count or out of subscription quota.',
      '**ImagePullBackOff** means the kubelet cannot pull the image. Either the **tag does not exist** - a typo or a pipeline that did not push - or **authentication** fails because the kubelet identity lacks AcrPull, or **networking** blocks it: a private registry whose private DNS is not resolvable from the nodes, or a firewall blocking the registry’s data endpoints. `az aks check-acr` tests all of that from inside the cluster.',
      '**CrashLoopBackOff** means the image runs and the process keeps exiting. **`kubectl logs --previous`** shows the output of the last crashed container. Common causes are missing configuration or secrets, a dependency the new identity cannot reach, a **liveness probe** that kills a slow-starting app, or an **OOMKilled** exit when the memory limit is too low - visible in the last state of the container.',
    ],
    code: [
      {
        title: 'First commands for each status',
        language: 'bash',
        code: `kubectl get pods -n orders -o wide
kubectl describe pod <pod-name> -n orders | sed -n '/Events/,$p'

# Pending: capacity and constraints
kubectl describe nodes | grep -A5 "Allocated resources"
kubectl get pvc -n orders

# ImagePullBackOff: tag, auth and network, tested from the cluster
az acr repository show-tags -n acrshop --repository orders -o tsv | tail
az aks check-acr -g rg-aks -n aks-shop-prod --acr acrshop.azurecr.io

# CrashLoopBackOff: the crashed container's output and exit reason
kubectl logs <pod-name> -n orders --previous
kubectl get pod <pod-name> -n orders \\
  -o jsonpath='{.status.containerStatuses[0].lastState.terminated.reason}'   # e.g. OOMKilled`,
        placeholders: ['<pod-name>'],
      },
      {
        title: 'Container insights: restarts and OOM kills in the last hour',
        language: 'text',
        code: `KubePodInventory
| where TimeGenerated > ago(1h)
| where Namespace == "orders"
| summarize restarts = max(ContainerRestartCount) by Name, ContainerStatusReason
| order by restarts desc`,
      },
    ],
    diagrams: [
      {
        kind: 'decision',
        title: 'Read the pod status first',
        caption:
          'Each status points at a different stage; describe and events are always step one.',
        question: 'What status is the pod in?',
        branches: [
          {
            condition: 'Pending',
            result: 'Scheduling: requests, taints, PVC zone',
            detail: 'Autoscaler max or quota',
            tone: 'warning',
          },
          {
            condition: 'ImagePullBackOff',
            result: 'Tag, AcrPull, registry DNS',
            detail: 'az aks check-acr',
            tone: 'accent',
          },
          {
            condition: 'CrashLoopBackOff',
            result: 'logs --previous',
            detail: 'Config, probes, OOMKilled',
            tone: 'danger',
          },
          {
            condition: 'Running but not Ready',
            result: 'Readiness probe failing',
            detail: 'Dependency or wrong port',
            tone: 'muted',
          },
        ],
      },
    ],
    deeper: [
      'Azure Disks are **zonal**. A StatefulSet whose disk is in zone 1 can only run on nodes in zone 1, which is why node pools spanning zones need a StorageClass with `WaitForFirstConsumer` binding, or zone-redundant disk SKUs.',
      'A liveness probe on a slow-starting app causes an endless restart loop that looks like a crash. A **startup probe** gives the app time before liveness applies.',
      'If only new pods fail after a deploy while old ones keep running, compare the pod specs: image tag, service account, env vars and resource limits usually changed together in that release.',
    ],
    traps: [
      'Deleting pods repeatedly hoping they recover.',
      'Raising the memory limit without checking whether the app leaks.',
      'Assuming ImagePullBackOff is always authentication.',
    ],
    followUps: [
      'How would you roll back the deployment quickly?',
      'What is the difference between a liveness, readiness and startup probe?',
    ],
    tags: ['scenario', 'aks', 'troubleshooting', 'kubernetes', 'pods'],
  },
  {
    id: 'itv-azc-20',
    level: 'advanced',
    kind: 'scenario',
    prompt:
      'An AKS node pool upgrade has been running for two hours and is stuck with one node cordoned. The operation eventually fails. What is going on and how do you get it finished?',
    probing:
      'Real upgrade failure modes - PDBs, quota, stuck finalizers - and the options AKS gives you without destroying workloads.',
    answer: [
      'The most common cause is an eviction that can never succeed: a **pod disruption budget** that allows zero disruptions - `minAvailable` equal to the replica count, or a single-replica deployment with `minAvailable: 1`. The drain keeps retrying until the drain timeout, then the upgrade fails. The node’s events and the upgrade error both mention the eviction failure and name the pod.',
      'I would check PDBs first: `kubectl get pdb -A` and look for **ALLOWED DISRUPTIONS 0**. The right fix is usually to **scale the workload up** so the PDB allows one disruption, or correct the PDB. Temporarily editing a PDB owned by another team needs their agreement - it exists to protect them.',
      'Other causes: **no capacity for surge nodes** - the pool is at its autoscaler max, or the subscription is out of vCPU quota for that family, or the subnet has no free IPs with flat CNI. Pods that take very long to terminate, with long grace periods or stuck finalizers. And pods using local storage that the drain does not want to evict.',
      'Once fixed, I **re-run the upgrade**; it resumes from where it stopped. For the future, AKS supports settings for the drain timeout and **undrainable node behaviour** - for example cordoning and moving on so the rest of the pool completes, leaving the blocked node for manual handling. And a PDB lint in CI stops zero-disruption budgets reaching production.',
    ],
    code: [
      {
        title: 'Find the blocker',
        language: 'bash',
        code: `kubectl get nodes -o wide | grep SchedulingDisabled
kubectl get pdb -A          # look for ALLOWED DISRUPTIONS = 0
kubectl get pods -A --field-selector spec.nodeName=<node-name>

# The failed operation and its error
az aks show -g rg-aks -n aks-shop-prod --query "{state:provisioningState, power:powerState.code}"
az aks nodepool show -g rg-aks --cluster-name aks-shop-prod -n apps \\
  --query "{state:provisioningState, version:currentOrchestratorVersion}"

# Surge capacity: quota and pool max
az vm list-usage -l uksouth --query "[?contains(name.value, 'DDSv5')]" -o table`,
        placeholders: ['<node-name>'],
      },
      {
        title: 'Fix and resume, with safer drain settings',
        language: 'bash',
        code: `# Give the PDB room to move one pod
kubectl scale deployment/legacy-api -n billing --replicas 2

# Configure drain behaviour for the next attempt, then resume
az aks nodepool update -g rg-aks --cluster-name aks-shop-prod -n apps \\
  --drain-timeout 45 --undrainable-node-behavior Cordon

az aks nodepool upgrade -g rg-aks --cluster-name aks-shop-prod -n apps \\
  --kubernetes-version <target-version>`,
        placeholders: ['<target-version>'],
      },
    ],
    diagrams: [
      {
        kind: 'flow',
        title: 'Unsticking a node pool upgrade',
        caption: 'Most stuck upgrades are an eviction that a PDB will never allow.',
        nodes: [
          { label: 'Node cordoned, drain retrying', tone: 'warning' },
          {
            label: 'kubectl get pdb -A',
            detail: 'Allowed disruptions 0',
            branch: { label: 'Scale up or fix PDB', tone: 'accent' },
          },
          { label: 'Surge capacity available?', detail: 'Quota, max count, IPs' },
          { label: 'Long termination or finalizers?' },
          { label: 'Re-run upgrade, it resumes', tone: 'success' },
        ],
      },
    ],
    deeper: [
      'Never delete the cordoned VM from the scale set by hand to "unstick" things. AKS’s view of the pool and the real scale set diverge, and the next operation fails in stranger ways.',
      'Single-replica workloads with a PDB are a policy smell. Azure Policy or a CI check can require replicas of at least two for anything with a PDB.',
    ],
    traps: [
      'Deleting nodes manually in the MC_ resource group.',
      'Deleting a team’s PDB without telling them.',
      'Retrying the upgrade without fixing the cause.',
    ],
    followUps: [
      'What does undrainable node behaviour Cordon actually do?',
      'How would you detect zero-disruption PDBs before they block an upgrade?',
    ],
    tags: ['scenario', 'aks', 'upgrades', 'pdb', 'troubleshooting'],
  },
]
