import type { InterviewQuestion } from '../../../types'

/**
 * Real interview round, part 1: DaemonSets, Bicep, Linux processes, NSGs, Kubernetes HA,
 * Prometheus, Function Apps, Azure DevOps pipelines, Terraform, private endpoints and WAF.
 */
export const roundsGlobantPart1Questions: InterviewQuestion[] = [
  {
    id: 'itv-rglb1-1',
    level: 'basic',
    kind: 'open',
    prompt: 'What is the use of a DaemonSet?',
    probing:
      'That a DaemonSet runs one pod per node (or per selected node), has no replica count, and is used for node-level agents that must follow the autoscaler.',
    answer: [
      'A **DaemonSet** makes sure that **one copy of a pod runs on every node** (or on every node that matches a selector). When a new node joins the cluster, the DaemonSet automatically starts a pod on it. When a node is removed, its pod is cleaned up.',
      '**Where DaemonSets are used**',
      '- **Log collection from every node**: Example tool: Fluent Bit, Fluentd, Azure Monitor agent (`ama-logs`)\n- **Node metrics**: Example tool: Prometheus `node-exporter`\n- **Networking**: Example tool: `kube-proxy`, CNI plugins such as Azure CNI, Calico, Cilium\n- **Storage**: Example tool: CSI node drivers (Azure Disk/File CSI)\n- **Security**: Example tool: Defender for Containers sensor, Falco',
      '**Example: node-exporter on every node.** Notice there is **no `replicas` field**. The number of pods = number of matching nodes. The `tolerations` block with `operator: Exists` lets it also run on tainted nodes, such as the system pool.',
      'To run only on some nodes, add a `nodeSelector` (for example `agentpool: linuxpool`) in the pod template.',
      '**Interview-ready answer**',
      '"A DaemonSet runs exactly one pod on every node, or on a selected group of nodes. It is used for node-level agents such as log collectors like Fluent Bit, monitoring agents like node-exporter, kube-proxy, CNI plugins, and CSI drivers. The main advantage is that when the cluster autoscaler adds a new node, the DaemonSet automatically places the agent on it, so we never miss logs or metrics from a node. It has no replica count; the number of pods follows the number of nodes."',
    ],
    code: [
      {
        title: 'node-exporter DaemonSet',
        language: 'yaml',
        code: `apiVersion: apps/v1
kind: DaemonSet
metadata:
  name: node-exporter
  namespace: monitoring
spec:
  selector:
    matchLabels:
      app: node-exporter
  template:
    metadata:
      labels:
        app: node-exporter
    spec:
      tolerations:                 # also run on tainted nodes (e.g. system pool)
        - operator: Exists
      containers:
        - name: node-exporter
          image: prom/node-exporter:v1.8.2
          ports:
            - containerPort: 9100`,
      },
      {
        title: 'Useful commands',
        language: 'bash',
        code: `kubectl get daemonset -A                      # list all DaemonSets
kubectl get pods -n kube-system -o wide       # see one kube-proxy pod per node
kubectl rollout status ds/node-exporter -n monitoring
kubectl describe ds node-exporter -n monitoring`,
      },
    ],
    tags: ['kubernetes', 'daemonset', 'aks', 'monitoring'],
  },
  {
    id: 'itv-rglb1-2',
    level: 'intermediate',
    kind: 'open',
    prompt: 'Why use Bicep over ARM templates?',
    probing:
      'That Bicep transpiles to ARM JSON (same engine, day-zero support), and the concrete gains: shorter syntax, automatic dependencies, local modules, tooling, no state file and what-if.',
    answer: [
      '**Bicep** is a simpler language for Azure infrastructure. It is **not a replacement engine**: Bicep code is converted (transpiled) into an ARM JSON template, and Azure Resource Manager deploys it. So anything ARM can do, Bicep can do, but with much less code.',
      '**Bicep vs ARM templates**',
      '- **Syntax**: ARM template (JSON): Long JSON, lots of brackets and `[concat()]`; Bicep: Short, clean, readable\n- **Lines of code**: ARM template (JSON): Large; Bicep: Usually 2-3x smaller\n- **References**: ARM template (JSON): `[resourceId(...)]`, manual `dependsOn`; Bicep: `storage.id`, dependencies detected automatically\n- **Modules**: ARM template (JSON): Linked/nested templates (need a URL or template spec); Bicep: Simple `module` keyword with a local file\n- **Editor support**: ARM template (JSON): Limited; Bicep: VS Code extension with IntelliSense, type checking, linting\n- **New Azure features**: ARM template (JSON): Day 0; Bicep: Day 0 (same API versions)\n- **State file**: ARM template (JSON): None; Bicep: None (Azure itself is the state)',
      "**Same storage account, both ways:** the ARM JSON version needs a schema, `contentVersion`, a parameters object and expression strings like `[parameters('storageName')]`; the Bicep version is a few lines and can output `storage.id` directly.",
      '**Commands:** use `what-if` to preview changes (like `terraform plan`), `az deployment group create` to deploy, `az bicep build` to convert Bicep to ARM JSON, and `az bicep decompile` to migrate existing ARM JSON to Bicep.',
      '**Interview-ready answer**',
      '"Bicep is a domain-specific language on top of ARM. It compiles to ARM JSON, so it supports every Azure resource on day zero, but the code is much shorter and easier to read. Dependencies are detected automatically when one resource references another, modules are simple local files, and the VS Code extension gives IntelliSense and validation. Like ARM, there is no state file to manage. I use `what-if` to preview changes and `az deployment group create` to deploy. For existing ARM templates, `az bicep decompile` helps migrate them."',
    ],
    followUps: [
      'When would you still choose Terraform over Bicep?',
      'How do you share Bicep modules across teams (registry or template specs)?',
      'What does `what-if` not catch before a deployment?',
    ],
    code: [
      {
        title: 'ARM JSON: storage account',
        language: 'json',
        code: `{
  "$schema": "https://schema.management.azure.com/schemas/2019-04-01/deploymentTemplate.json#",
  "contentVersion": "1.0.0.0",
  "parameters": {
    "storageName": { "type": "string" }
  },
  "resources": [
    {
      "type": "Microsoft.Storage/storageAccounts",
      "apiVersion": "2023-01-01",
      "name": "[parameters('storageName')]",
      "location": "[resourceGroup().location]",
      "sku": { "name": "Standard_LRS" },
      "kind": "StorageV2"
    }
  ]
}`,
      },
      {
        title: 'Bicep: the same storage account',
        language: 'bicep',
        code: `param storageName string

resource storage 'Microsoft.Storage/storageAccounts@2023-01-01' = {
  name: storageName
  location: resourceGroup().location
  sku: { name: 'Standard_LRS' }
  kind: 'StorageV2'
}

output storageId string = storage.id`,
      },
      {
        title: 'Preview, deploy, build and decompile',
        language: 'bash',
        code: `# Preview changes (like terraform plan)
az deployment group what-if -g rg-demo --template-file main.bicep --parameters storageName=demostore01

# Deploy
az deployment group create -g rg-demo --template-file main.bicep --parameters storageName=demostore01

# Convert Bicep -> ARM JSON
az bicep build --file main.bicep

# Convert existing ARM JSON -> Bicep (migration)
az bicep decompile --file azuredeploy.json`,
      },
    ],
    tags: ['bicep', 'arm templates', 'iac', 'azure'],
  },
  {
    id: 'itv-rglb1-3',
    level: 'basic',
    kind: 'open',
    prompt: 'How do you find the process ID if you want to kill a process?',
    probing:
      'Finding the PID by name or by port, then killing gracefully with SIGTERM before resorting to SIGKILL.',
    answer: [
      '**Step 1: Find the PID**',
      '- **`ps -ef | grep nginx`**: What it does: Lists all processes and filters by name\n- **`pgrep -a nginx`**: What it does: Prints PID and command line of matching processes\n- **`pidof nginx`**: What it does: Prints only PIDs of the exact program name\n- **`ss -ltnp | grep :8080`**: What it does: Finds which process is listening on port 8080\n- **`lsof -i :8080`**: What it does: Same, using lsof\n- **`top` / `htop`**: What it does: Interactive view, sorted by CPU/memory',
      'In the `ps` output, the second column (`1234`) is the PID. The `[n]ginx` trick stops `grep` from matching itself.',
      '**Step 2: Kill it.** Always try `kill` (SIGTERM) first so the application can close files and connections cleanly. Use `kill -9` (SIGKILL) only if SIGTERM does not work.',
      '**Real example: port already in use.** `ss -ltnp` shows the process holding port 8080 (`pid=4521`), then `kill 4521`.',
      '**Windows equivalent:** `Get-Process` to find the PID and `Stop-Process -Id <pid> -Force` to kill it, or in cmd `tasklist | findstr` and `taskkill /PID <pid> /F`.',
      '**Interview-ready answer**',
      '"I use `ps -ef | grep <name>` or `pgrep -a <name>` to get the PID. If I only know the port, I use `ss -ltnp` or `lsof -i :<port>`. Then I run `kill <PID>`, which sends SIGTERM for a graceful shutdown. Only if the process does not stop, I use `kill -9`, which forces it. I can also kill by name with `pkill`."',
    ],
    code: [
      {
        title: 'Find the PID',
        language: 'bash',
        code: `$ ps -ef | grep [n]ginx
root      1234     1  0 10:01 ?  00:00:00 nginx: master process
www-data  1235  1234  0 10:01 ?  00:00:00 nginx: worker process`,
      },
      {
        title: 'Kill it',
        language: 'bash',
        code: `kill 1234          # sends SIGTERM (15): asks the process to stop gracefully
kill -9 1234       # sends SIGKILL (9): forces stop, use only if SIGTERM does not work
pkill nginx        # kill by name
killall nginx      # kill all processes with that exact name`,
      },
      {
        title: 'Port already in use',
        language: 'bash',
        code: `$ ss -ltnp | grep :8080
LISTEN 0 100 *:8080 *:* users:(("java",pid=4521,fd=12))

$ kill 4521`,
      },
      {
        title: 'Windows equivalent',
        language: 'powershell',
        code: `Get-Process -Name notepad          # find PID
Stop-Process -Id 4521 -Force       # kill
# or in cmd: tasklist | findstr notepad ; taskkill /PID 4521 /F`,
      },
    ],
    traps: [
      'Going straight to `kill -9`: the process cannot flush files or close connections, which can corrupt data.',
    ],
    tags: ['linux', 'processes', 'kill', 'shell'],
  },
  {
    id: 'itv-rglb1-4',
    level: 'intermediate',
    kind: 'scenario',
    prompt:
      "The IP is whitelisted in the VM's NSG with only an inbound rule; no outbound rule is set. Will ping work?",
    probing:
      'That NSGs are stateful and default outbound rules exist, plus the real reasons ping still fails: TCP-only rule, OS firewall, subnet plus NIC NSG.',
    answer: [
      '**Yes, ping from the whitelisted IP to the VM will work**, as long as the inbound rule allows **ICMP** (or `Any` protocol). There are two reasons:',
      '1. **NSGs are stateful.** If an inbound request is allowed, the reply traffic for that same connection is automatically allowed back out. You do not need a matching outbound rule.\n2. **Default outbound rules already exist.** Every NSG has default rules `AllowVnetOutBound` and `AllowInternetOutBound`, so outbound is open unless you add a deny rule.',
      '**When ping will still fail**',
      '- **Inbound rule allows only TCP (e.g. port 22)**: Fix: Add rule with protocol `ICMP` (or `Any`)\n- **Windows VM firewall blocks ICMP by default**: Fix: Enable "File and Printer Sharing (Echo Request)" rule in Windows Firewall\n- **Linux firewall (`iptables`/`ufw`/`firewalld`) drops ICMP**: Fix: Allow ICMP in the OS firewall\n- **VM has no public IP, or ping goes to a Load Balancer IP**: Fix: Ping the instance public IP (load balancer frontends do not reliably answer ICMP for every SKU and configuration)\n- **An NSG is also on the subnet and does not allow it**: Fix: Both subnet NSG and NIC NSG must allow the traffic',
      'Check what is actually applied on the NIC with `az network nic list-effective-nsg`.',
      '**Interview-ready answer**',
      '"Yes, it will work. NSGs are stateful, so when inbound ICMP from the whitelisted IP is allowed, the echo reply is allowed back automatically without an outbound rule. Also, the default outbound rules allow VNet and Internet traffic anyway. If ping still fails, I check that the inbound rule is for ICMP and not just TCP, check the OS firewall, because Windows blocks ICMP by default, and check effective security rules, because both the subnet NSG and the NIC NSG must allow it."',
    ],
    followUps: [
      'If ping works but SSH on port 22 does not, what do you check next?',
      'How does NSG statefulness differ from a stateless network ACL?',
      'How would you test connectivity without ICMP, for example with Network Watcher?',
    ],
    code: [
      {
        title: 'Flow',
        language: 'text',
        code: `Whitelisted IP 203.0.113.10
      |  ICMP Echo Request
      v
NSG inbound rule: Allow 203.0.113.10, protocol ICMP  --> allowed
      |
      v
     VM  --> ICMP Echo Reply goes back automatically (stateful)`,
      },
      {
        title: 'Add the ICMP rule and check effective rules',
        language: 'bash',
        code: `az network nsg rule create -g rg-demo --nsg-name nsg-demo-vm \\
  -n Allow-ICMP-From-Office --priority 110 --direction Inbound \\
  --access Allow --protocol Icmp \\
  --source-address-prefixes 203.0.113.10 --destination-address-prefixes '*'

# What is actually applied on the NIC
az network nic list-effective-nsg -g rg-demo -n vm-demo-nic`,
      },
    ],
    traps: [
      'Saying you must add an outbound rule: NSGs are stateful, and default outbound rules already allow the reply.',
    ],
    tags: ['azure networking', 'nsg', 'icmp', 'vm'],
  },
  {
    id: 'itv-rglb1-5',
    level: 'advanced',
    kind: 'open',
    prompt: 'How do you achieve high availability and scalability in Kubernetes?',
    probing:
      'A layered answer: replicas, zone spread, probes, PDBs and rolling updates for HA; HPA, KEDA, VPA and Cluster Autoscaler for scale; control-plane SLA and multi-region DR on AKS.',
    answer: [
      '**High availability (HA)** = the app keeps running when a pod, node, or zone fails. **Scalability** = the app can grow and shrink with load.',
      '**High availability**',
      '- **Multiple replicas**: What it does: `replicas: 3` so one pod failure does not stop the app\n- **Spread across nodes and zones**: What it does: `topologySpreadConstraints` / pod anti-affinity, AKS node pools across zones 1, 2, 3\n- **Readiness and liveness probes**: What it does: Send traffic only to healthy pods, restart stuck ones\n- **PodDisruptionBudget (PDB)**: What it does: Keeps a minimum number of pods running during upgrades and node drains\n- **Rolling updates**: What it does: `maxUnavailable: 0`, `maxSurge: 1` for zero-downtime deploys\n- **Control plane HA**: What it does: AKS Standard tier (uptime SLA)\n- **Multi-region (DR)**: What it does: Second cluster in another region behind Azure Front Door / Traffic Manager',
      '**Scalability in Kubernetes**',
      '- **HPA**: Scales: Number of pods, based on CPU/memory/custom metrics\n- **KEDA**: Scales: Pods based on events (queue length, Kafka lag), even to zero\n- **VPA**: Scales: CPU/memory requests of each pod\n- **Cluster Autoscaler**: Scales: Number of nodes',
      'HPA needs `resources.requests` to calculate utilization.',
      '**Interview-ready answer**',
      '"For high availability, I run at least three replicas, spread them across nodes and availability zones with topology spread constraints, add readiness and liveness probes, and protect them during upgrades with a PodDisruptionBudget. Deployments use rolling updates with `maxUnavailable: 0`. On AKS, I use zone-redundant node pools and the Standard tier for the control-plane SLA, and for DR a second region behind Front Door. For scalability, HPA scales pods on CPU or custom metrics, KEDA for event-driven workloads, and the Cluster Autoscaler adds nodes when pods are pending."',
    ],
    deeper: [
      'Do not let HPA and VPA both act on CPU for the same workload; keep VPA in recommendation mode or scale HPA on a custom metric.',
      'A PDB with `minAvailable` equal to the replica count blocks node drains, so AKS upgrades hang. Leave room for at least one disruption.',
    ],
    followUps: [
      'What happens to a node drain if the PDB allows zero disruptions?',
      'Why does HPA need resource requests, and what happens without them?',
      'How would you fail over between two regional AKS clusters?',
    ],
    code: [
      {
        title: 'Deployment, PDB and HPA',
        language: 'yaml',
        code: `apiVersion: apps/v1
kind: Deployment
metadata:
  name: demo-api
spec:
  replicas: 3
  strategy:
    rollingUpdate:
      maxUnavailable: 0
      maxSurge: 1
  selector:
    matchLabels: { app: demo-api }
  template:
    metadata:
      labels: { app: demo-api }
    spec:
      topologySpreadConstraints:
        - maxSkew: 1
          topologyKey: topology.kubernetes.io/zone
          whenUnsatisfiable: ScheduleAnyway
          labelSelector:
            matchLabels: { app: demo-api }
      containers:
        - name: api
          image: demoacr.azurecr.io/demo-api:1.0.0
          resources:
            requests: { cpu: 250m, memory: 256Mi }
            limits:   { memory: 512Mi }
          readinessProbe:
            httpGet: { path: /health/ready, port: 8080 }
          livenessProbe:
            httpGet: { path: /health/live, port: 8080 }
---
apiVersion: policy/v1
kind: PodDisruptionBudget
metadata:
  name: demo-api-pdb
spec:
  minAvailable: 2
  selector:
    matchLabels: { app: demo-api }
---
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: demo-api-hpa
spec:
  scaleTargetRef: { apiVersion: apps/v1, kind: Deployment, name: demo-api }
  minReplicas: 3
  maxReplicas: 10
  metrics:
    - type: Resource
      resource:
        name: cpu
        target: { type: Utilization, averageUtilization: 70 }`,
      },
      {
        title: 'Zone-redundant AKS with cluster autoscaler',
        language: 'bash',
        code: `# AKS cluster across 3 zones with cluster autoscaler
az aks create -g rg-demo -n aks-demo --zones 1 2 3 --node-count 3 \\
  --enable-cluster-autoscaler --min-count 3 --max-count 10 --tier standard

kubectl get hpa
kubectl get pdb
kubectl get pods -o wide        # check pods are on different nodes`,
      },
    ],
    tags: ['kubernetes', 'high availability', 'autoscaling', 'aks', 'hpa'],
  },
  {
    id: 'itv-rglb1-6',
    level: 'intermediate',
    kind: 'open',
    prompt: 'How can you send metrics to Prometheus and Grafana?',
    probing:
      'The pull model (expose /metrics, Prometheus scrapes), ServiceMonitor on Kubernetes, Pushgateway for batch jobs, Grafana as a query layer, and the Azure managed option.',
    answer: [
      'Prometheus works on a **pull model**: it **scrapes** a `/metrics` HTTP endpoint every few seconds and stores the data. Grafana does not store metrics; it **queries Prometheus** and draws dashboards. Alertmanager handles alerts.',
      '**Step 1: Expose metrics from the app**',
      '- **Spring Boot**: How it exposes metrics: `micrometer-registry-prometheus` -> `/actuator/prometheus`\n- **Python / Node / Go**: How it exposes metrics: Prometheus client library -> `/metrics`\n- **Linux VM / node**: How it exposes metrics: `node-exporter` on port 9100\n- **Kubernetes objects**: How it exposes metrics: `kube-state-metrics`\n- **Short batch jobs**: How it exposes metrics: Push to **Pushgateway**, Prometheus scrapes the Pushgateway',
      '**Step 2: Tell Prometheus what to scrape.** On a VM, use `scrape_configs` in `prometheus.yml`. On Kubernetes with kube-prometheus-stack, use a **ServiceMonitor**; its `release` label must match the Helm release so the operator picks it up.',
      '**Step 3: Install Prometheus + Grafana** with the `kube-prometheus-stack` Helm chart and open Grafana with a port-forward.',
      '**Step 4: Visualise in Grafana**',
      '1. Add Prometheus as a data source (already added by kube-prometheus-stack).\n2. Import a dashboard (for example ID `1860` for Node Exporter Full) or build panels with PromQL.',
      '**Azure managed option:** Azure Monitor **managed Prometheus** + **Azure Managed Grafana**: no Prometheus servers to run.',
      '**Interview-ready answer**',
      '"Prometheus uses a pull model. First, the application exposes a `/metrics` endpoint, for Spring Boot through Micrometer at `/actuator/prometheus`, and node-exporter exposes VM metrics. Then Prometheus scrapes those endpoints, configured through `scrape_configs` on a VM or a ServiceMonitor in Kubernetes with kube-prometheus-stack. For short batch jobs, I push to the Pushgateway. Grafana uses Prometheus as a data source and shows dashboards with PromQL queries, and Alertmanager handles alerts. On AKS, I prefer Azure Managed Prometheus with Azure Managed Grafana to avoid running the monitoring stack ourselves."',
    ],
    followUps: [
      'Why does a ServiceMonitor sometimes get ignored by Prometheus?',
      'When is the Pushgateway the wrong choice?',
      'How do you avoid high-cardinality labels blowing up Prometheus storage?',
    ],
    code: [
      {
        title: 'Flow',
        language: 'text',
        code: `App (/metrics) <-- scrape -- Prometheus (stores time series) <-- PromQL query -- Grafana (dashboards)
                                   |
                              Alertmanager (alerts)`,
      },
      {
        title: 'Spring Boot application.yml',
        language: 'yaml',
        code: `management:
  endpoints:
    web:
      exposure:
        include: health,prometheus`,
      },
      {
        title: 'prometheus.yml on a VM',
        language: 'yaml',
        code: `scrape_configs:
  - job_name: "demo-app"
    metrics_path: /actuator/prometheus
    static_configs:
      - targets: ["10.0.1.4:8080"]
  - job_name: "node"
    static_configs:
      - targets: ["10.0.1.4:9100"]`,
      },
      {
        title: 'ServiceMonitor on Kubernetes',
        language: 'yaml',
        code: `apiVersion: monitoring.coreos.com/v1
kind: ServiceMonitor
metadata:
  name: demo-app
  labels:
    release: monitoring          # must match the Helm release label
spec:
  selector:
    matchLabels:
      app: demo-app              # the Service label
  endpoints:
    - port: http
      path: /actuator/prometheus
      interval: 30s`,
      },
      {
        title: 'Install kube-prometheus-stack',
        language: 'bash',
        code: `helm repo add prometheus-community https://prometheus-community.github.io/helm-charts
helm repo update
helm install monitoring prometheus-community/kube-prometheus-stack -n monitoring --create-namespace

# Open Grafana locally
kubectl port-forward svc/monitoring-grafana 3000:80 -n monitoring`,
      },
      {
        title: 'PromQL panel query',
        language: 'text',
        code: `rate(http_server_requests_seconds_count{job="demo-app"}[5m])`,
      },
      {
        title: 'Azure managed Prometheus and Grafana',
        language: 'bash',
        code: `az aks update -g rg-demo -n aks-demo --enable-azure-monitor-metrics \\
  --azure-monitor-workspace-resource-id <AMW_ID> --grafana-resource-id <GRAFANA_ID>`,
      },
    ],
    tags: ['prometheus', 'grafana', 'monitoring', 'kubernetes'],
  },
  {
    id: 'itv-rglb1-7',
    level: 'intermediate',
    kind: 'open',
    prompt: 'How do you do deployments in a Function App? Zip file? How do you create a function?',
    probing:
      'Creating a function with Core Tools, the resources a Function App needs, zip deploy / run-from-package in CI/CD, slots, and Key Vault references for settings.',
    answer: [
      '**Part 1: Create a function locally (Azure Functions Core Tools).** `func init` creates the project, `func new` adds a function from a trigger template, and `func start` runs it locally at `http://localhost:7071/api/HttpHello`.',
      '**Part 2: Create the Function App in Azure.** A Function App needs a **resource group**, a **storage account**, and a **hosting plan** (Consumption, Flex Consumption, Premium, or App Service plan). For new serverless Linux apps, prefer **Flex Consumption**; the older Linux Consumption plan is on a retirement path.',
      '**Part 3: Deployment options**',
      '- **`func azure functionapp publish`**: When to use: Quick deploy from a developer machine\n- **Zip deploy**: When to use: Package the app as a zip and push it; most common in CI/CD\n- **Run from package (`WEBSITE_RUN_FROM_PACKAGE=1`)**: When to use: App runs directly from the zip; faster cold start, read-only files\n- **Azure DevOps `AzureFunctionApp@2` task**: When to use: Standard pipeline deployment (uses zip deploy internally)\n- **Deployment slots**: When to use: Deploy to `staging`, test, then swap to production with zero downtime',
      '**Yes, zip is the standard way.** `local.settings.json` is only for local development; app settings in Azure are set with `az functionapp config appsettings set`, using Key Vault references for secrets.',
      '**Part 4: Azure DevOps pipeline.** The Build stage installs dependencies into `.python_packages`, zips the folder with `ArchiveFiles@2` and publishes it as an artifact; the Deploy stage uses a deployment job and `AzureFunctionApp@2` with `deploymentMethod: zipDeploy`.',
      '**Interview-ready answer**',
      '"I create a function with Azure Functions Core Tools: `func init` for the project and `func new` with a trigger template such as HTTP trigger, and I test it locally with `func start`. In Azure, I create a storage account, a hosting plan, and the Function App with `az functionapp create`, usually through Terraform. For deployment, yes, I use zip deploy: the pipeline packages the code into a zip, publishes it as an artifact, and the `AzureFunctionApp@2` task deploys it, often with run-from-package. For production, I deploy to a staging slot and swap for zero downtime. Secrets come from Key Vault references in app settings, not from `local.settings.json`."',
    ],
    followUps: [
      'What changes when you deploy to a Flex Consumption plan instead of Consumption?',
      'How does the Function App read a Key Vault reference, and which identity needs access?',
      'Which app settings should be slot-sticky during a swap?',
    ],
    code: [
      {
        title: 'Create a function locally',
        language: 'bash',
        code: `func init demo-func --worker-runtime python      # create project
cd demo-func
func new --name HttpHello --template "HTTP trigger" --authlevel function
func start                                         # run locally at http://localhost:7071/api/HttpHello`,
      },
      {
        title: 'Create the Function App',
        language: 'bash',
        code: `az group create -n rg-demo -l eastus
az storage account create -n demofuncstore01 -g rg-demo -l eastus --sku Standard_LRS

az functionapp create -g rg-demo -n demo-func-app \\
  --storage-account demofuncstore01 \\
  --consumption-plan-location eastus \\
  --runtime python --runtime-version 3.11 \\
  --functions-version 4 --os-type Linux`,
      },
      {
        title: 'Publish and zip deploy',
        language: 'bash',
        code: `# Option A: Core Tools
func azure functionapp publish demo-func-app

# Option B: Zip deploy
zip -r app.zip . -x ".venv/*" "local.settings.json"
az functionapp deployment source config-zip -g rg-demo -n demo-func-app --src app.zip

# App setting with a Key Vault reference
az functionapp config appsettings set -g rg-demo -n demo-func-app --settings "DB_URL=@Microsoft.KeyVault(SecretUri=https://kv-demo.vault.azure.net/secrets/db-url/)"`,
      },
      {
        title: 'Azure DevOps build and deploy',
        language: 'yaml',
        code: `stages:
  - stage: Build
    jobs:
      - job: Build
        pool: { vmImage: ubuntu-latest }
        steps:
          - script: pip install -r requirements.txt --target=".python_packages/lib/site-packages"
          - task: ArchiveFiles@2
            inputs:
              rootFolderOrFile: $(System.DefaultWorkingDirectory)
              includeRootFolder: false
              archiveType: zip
              archiveFile: $(Build.ArtifactStagingDirectory)/app.zip
          - publish: $(Build.ArtifactStagingDirectory)/app.zip
            artifact: drop

  - stage: Deploy
    dependsOn: Build
    jobs:
      - deployment: DeployFunc
        environment: demo-dev
        pool: { vmImage: ubuntu-latest }
        strategy:
          runOnce:
            deploy:
              steps:
                - task: AzureFunctionApp@2
                  inputs:
                    connectedServiceNameARM: sc-azure-demo
                    appType: functionAppLinux
                    appName: demo-func-app
                    package: $(Pipeline.Workspace)/drop/app.zip
                    deploymentMethod: zipDeploy`,
      },
    ],
    tags: ['azure functions', 'zip deploy', 'azure devops', 'serverless'],
  },
  {
    id: 'itv-rglb1-8',
    level: 'advanced',
    kind: 'scenario',
    prompt:
      'Your build stage has warnings. It must deploy to Dev but not to Prod. How do you do it in an Azure YAML multi-stage pipeline?',
    probing:
      'Knowing the SucceededWithIssues result, that succeeded() treats it as success, and writing a Prod condition on dependencies.Build.result.',
    answer: [
      'When a stage finishes with warnings, its result is **`SucceededWithIssues`** (not `Succeeded`).',
      '- The default condition `succeeded()` is **true** for both `Succeeded` and `SucceededWithIssues`. So **Dev** deploys.\n- For **Prod**, add a condition that checks the Build result is exactly `Succeeded`. So Prod is **skipped** when there are warnings.',
      '**Possible stage results**',
      '- **`Succeeded`**: Meaning: Clean, no warnings\n- **`SucceededWithIssues`**: Meaning: Passed, but with warnings or a step with `continueOnError: true` failed\n- **`Failed`**: Meaning: Failed\n- **`Canceled` / `Skipped`**: Meaning: Canceled or not run',
      'For `dependencies.Build.result` to be available in the Prod condition, Prod must list `Build` in its `dependsOn`, which is why it depends on both `Build` and `DeployDev`. A script can also mark a run as "with warnings" using logging commands.',
      '**Result of this pipeline**',
      '- **`Succeeded`**: Dev: Deploys; Prod: Deploys (after approval)\n- **`SucceededWithIssues`**: Dev: Deploys; Prod: **Skipped**\n- **`Failed`**: Dev: Skipped; Prod: Skipped',
      '**Interview-ready answer**',
      '"When a build has warnings, the stage result is `SucceededWithIssues`. The default `succeeded()` condition treats that as success, so the Dev stage runs normally. For the Prod stage, I add `dependsOn: [Build, DeployDev]` and the condition `and(succeeded(), eq(dependencies.Build.result, \'Succeeded\'))`. So Prod only runs when the build was completely clean. On top of that, the Prod environment has approvals and checks."',
    ],
    followUps: [
      'How would you reference a job-level output variable from a previous stage in a condition?',
      'What is the difference between `succeeded()` and `succeededOrFailed()`?',
      'Why put approvals on the environment instead of in the YAML?',
    ],
    code: [
      {
        title: 'Pipeline: Dev on warnings, Prod only when clean',
        language: 'yaml',
        code: `trigger:
  - main

stages:
  - stage: Build
    jobs:
      - job: Build
        pool: { vmImage: ubuntu-latest }
        steps:
          - script: mvn -B clean package
            displayName: Build

          - script: mvn -B checkstyle:check
            displayName: Lint (warnings allowed)
            continueOnError: true          # failure here -> SucceededWithIssues

  - stage: DeployDev
    dependsOn: Build
    condition: succeeded()                # true for Succeeded AND SucceededWithIssues
    jobs:
      - deployment: Dev
        environment: demo-dev
        pool: { vmImage: ubuntu-latest }
        strategy:
          runOnce:
            deploy:
              steps:
                - script: echo "Deploying to Dev"

  - stage: DeployProd
    dependsOn:
      - Build
      - DeployDev
    condition: |
      and(
        succeeded(),
        eq(dependencies.Build.result, 'Succeeded')
      )
    jobs:
      - deployment: Prod
        environment: demo-prod              # add approvals on this environment
        pool: { vmImage: ubuntu-latest }
        strategy:
          runOnce:
            deploy:
              steps:
                - script: echo "Deploying to Prod"`,
      },
      {
        title: 'Mark a run as "with warnings" from a script',
        language: 'bash',
        code: `echo "##vso[task.logissue type=warning]Deprecated API used"
echo "##vso[task.complete result=SucceededWithIssues;]"`,
      },
    ],
    traps: [
      'Using only `succeeded()` on Prod: it is also true for `SucceededWithIssues`, so Prod would still deploy.',
    ],
    tags: ['azure devops', 'yaml pipelines', 'conditions', 'multi-stage'],
  },
  {
    id: 'itv-rglb1-9',
    level: 'intermediate',
    kind: 'scenario',
    prompt:
      'Shell script: delete logs older than 30 days in a folder that are larger than 500 MB. Do you need `rm -rf`? Is `find /var/demo -type f -name *.log -size 500M -mtime +30 -delete` correct?',
    probing:
      'Spotting the unquoted glob and the missing + on -size, knowing -delete replaces rm, dry-running first, and the open-file-handle gotcha.',
    answer: [
      '**No, you do not need `rm -rf`.** `find ... -delete` deletes the matching files itself. `-r` is only for directories, and we only want files (`-type f`).',
      'The command is **almost** right, but has two mistakes:',
      '- **`-name *.log`**: Problem: Without quotes, the shell may expand `*.log` before `find` sees it; Correct: `-name "*.log"`\n- **`-size 500M`**: Problem: Means **exactly** 500 MB (rounded), not greater; Correct: `-size +500M`\n- **`-mtime +30`**: Problem: Correct: modified **more than** 30 days ago; Correct: Keep it',
      '**Quick reference for find**',
      '- **`-mtime +30`**: Meaning: Older than 30 days\n- **`-mtime -30`**: Meaning: Modified within the last 30 days\n- **`-size +500M`**: Meaning: Bigger than 500 MB\n- **`-size -500M`**: Meaning: Smaller than 500 MB\n- **`-maxdepth 1`**: Meaning: Do not go into sub-folders',
      'Wrap it in a script with logging and schedule it daily at 2 AM with cron.',
      'If a process still has the file open, deleting it does not free disk space until the process restarts. Check with `lsof +L1`. For log files that are still being written, use `truncate -s 0 file.log` or `logrotate` instead.',
      '**Interview-ready answer**',
      '"I don\'t need `rm -rf`, because `find` with `-delete` removes the matching files directly, and `-r` is only for directories. The command needs two fixes: quote the pattern as `"*.log"` so the shell does not expand it, and use `-size +500M`, because `500M` without the plus means exactly 500 MB. So it becomes `find /var/demo -type f -name "*.log" -size +500M -mtime +30 -delete`. I always run it with `-print` first as a dry run, and then schedule the script with cron or use logrotate."',
    ],
    followUps: [
      'Disk usage did not drop after deleting the files. Why, and how do you fix it?',
      'How would you configure logrotate for this folder instead?',
      'Why does the position of `-delete` in a find expression matter?',
    ],
    code: [
      {
        title: 'Correct command',
        language: 'bash',
        code: `# 1. Dry run first: only list what would be deleted
find /var/demo -type f -name "*.log" -size +500M -mtime +30 -print

# 2. Delete
find /var/demo -type f -name "*.log" -size +500M -mtime +30 -delete`,
      },
      {
        title: 'Script version with logging',
        language: 'bash',
        code: `#!/bin/bash
set -euo pipefail

LOG_DIR="/var/demo"
DAYS=30
SIZE="+500M"
REPORT="/var/log/demo-cleanup.log"

if [[ ! -d "$LOG_DIR" ]]; then
  echo "$(date) ERROR: $LOG_DIR not found" >> "$REPORT"
  exit 1
fi

echo "$(date) Starting cleanup in $LOG_DIR" >> "$REPORT"

find "$LOG_DIR" -type f -name "*.log" -size "$SIZE" -mtime +"$DAYS" -print -delete >> "$REPORT"

echo "$(date) Cleanup done" >> "$REPORT"`,
      },
      {
        title: 'Schedule daily at 2 AM',
        language: 'bash',
        code: `crontab -e
0 2 * * * /opt/scripts/demo-cleanup.sh`,
      },
    ],
    traps: [
      'Reading `-size 500M` as "500 MB or more": without `+` it matches only files that round to exactly 500 MB.',
    ],
    tags: ['linux', 'shell', 'find', 'log cleanup', 'cron'],
  },
  {
    id: 'itv-rglb1-10',
    level: 'intermediate',
    kind: 'open',
    prompt: 'If you have Deployment and StatefulSet, why do you need a DaemonSet?',
    probing:
      'That Deployment and StatefulSet control how many pods run, while a DaemonSet guarantees one per node, including new autoscaled nodes.',
    answer: [
      'Each controller solves a different problem. Deployment and StatefulSet decide **how many** pods run; a DaemonSet decides **one pod per node**.',
      '- **Pod count**: Deployment: `replicas: N`; StatefulSet: `replicas: N`; DaemonSet: One per node (automatic)\n- **Placement**: Deployment: Anywhere the scheduler chooses; StatefulSet: Anywhere the scheduler chooses; DaemonSet: Every node (or selected nodes)\n- **Pod names**: Deployment: Random (`api-7d9f-xk2p`); StatefulSet: Stable (`db-0`, `db-1`); DaemonSet: Per node\n- **Storage**: Deployment: Usually shared/none; StatefulSet: Own PVC per pod; DaemonSet: Usually `hostPath` to read node files\n- **Example**: Deployment: Web API, frontend; StatefulSet: MySQL, Kafka, Redis; DaemonSet: Fluent Bit, node-exporter, kube-proxy',
      '**Why a Deployment cannot replace it.** Suppose you have **5 nodes** and need a log agent on each one.',
      '- Deployment with `replicas: 5`: the scheduler might put 2 pods on node-1 and none on node-4. Logs from node-4 are lost.\n- Cluster autoscaler adds node-6: the Deployment does nothing. Node-6 has no agent.\n- DaemonSet: exactly one pod on each of the 5 nodes, and node-6 gets one automatically.',
      '**Interview-ready answer**',
      '"Deployment and StatefulSet run a fixed number of replicas wherever the scheduler places them. A Deployment is for stateless apps, a StatefulSet for apps that need stable names and their own storage. Neither guarantees one pod on each node. Node-level agents such as log collectors, node-exporter, kube-proxy, and CSI drivers must run on every node, including new nodes added by the autoscaler. A DaemonSet guarantees exactly that, so it is a different use case, not a duplicate."',
    ],
    followUps: [
      'How do you run a DaemonSet only on one node pool?',
      'How are DaemonSet pods updated during a rollout?',
      'Could pod anti-affinity on a Deployment achieve the same thing? What breaks?',
    ],
    code: [
      {
        title: 'DaemonSet follows the node count',
        language: 'bash',
        code: `kubectl get nodes                        # 3 nodes
kubectl get ds -n kube-system            # DESIRED = 3, CURRENT = 3
# scale node pool to 4
az aks nodepool scale -g rg-demo --cluster-name aks-demo -n nodepool1 --node-count 4
kubectl get ds -n kube-system            # DESIRED = 4, CURRENT = 4`,
      },
    ],
    tags: ['kubernetes', 'daemonset', 'deployment', 'statefulset'],
  },
  {
    id: 'itv-rglb1-11',
    level: 'intermediate',
    kind: 'open',
    prompt: 'How can you send alerts from Azure Monitor?',
    probing:
      'The alert rule model (scope, condition, action group), the signal types, severity, alert processing rules and defining alerts as code.',
    answer: [
      'An Azure Monitor alert has three parts: **scope** (what to watch) + **condition** (when to fire) make the **alert rule**, and the **action group** decides who is notified and how.',
      '- **Scope**: Examples: VM, AKS cluster, App Service, Log Analytics workspace\n- **Signal type**: Examples: **Metric** (CPU > 80%), **Log** (KQL query), **Activity log** (VM deleted), **Service health**\n- **Action group**: Examples: Email, SMS, voice, Azure app push, webhook (Teams/Slack), Logic App, Azure Function, ITSM, Automation runbook\n- **Severity**: Examples: Sev 0 (critical) to Sev 4 (verbose)',
      '**Step 1:** create an action group. **Step 2:** create a metric alert (CPU > 80% for 5 minutes). **Step 3 (optional):** a log search alert with KQL, for example pods in CrashLoopBackOff on AKS. Create it in **Monitor > Alerts > Create > Alert rule**, choose the Log Analytics workspace, paste the query, set "Number of results > 0", and attach the action group.',
      '**Good practice for alerting**',
      '- Use **alert processing rules** to mute alerts during maintenance windows.\n- Define alerts in Terraform/Bicep so every environment gets the same alerts.\n- Avoid noisy alerts: use proper thresholds and windows.',
      '**Interview-ready answer**',
      '"In Azure Monitor, I create an alert rule with a scope, a condition, and an action group. The condition can be a metric, such as CPU above 80% for 5 minutes, a log query in KQL, or an activity log event, such as a resource being deleted. The action group defines the notification: email, SMS, a webhook to Teams or Slack, a Logic App, or an ITSM tool like ServiceNow. I create these with the CLI or Terraform so all environments are consistent, and I use alert processing rules to suppress alerts during maintenance."',
    ],
    followUps: [
      'What is the difference between a metric alert and a log search alert in cost and latency?',
      'How do you stop an alert storm during a planned maintenance window?',
      'How would you route Sev 0 alerts differently from Sev 3 alerts?',
    ],
    code: [
      {
        title: 'Alert model',
        language: 'text',
        code: `Scope (what to watch) + Condition (when to fire) --> Alert rule --> Action group (who/how to notify)`,
      },
      {
        title: 'Action group and metric alert',
        language: 'bash',
        code: `az monitor action-group create -g rg-demo -n ag-demo-oncall --short-name demooncall \\
  --action email oncall oncall@example.com \\
  --action webhook teams https://example.webhook.office.com/xxxx

VM_ID=$(az vm show -g rg-demo -n vm-demo --query id -o tsv)

az monitor metrics alert create -g rg-demo -n alert-vm-high-cpu \\
  --scopes "$VM_ID" \\
  --condition "avg Percentage CPU > 80" \\
  --window-size 5m --evaluation-frequency 1m \\
  --severity 2 \\
  --action ag-demo-oncall \\
  --description "CPU above 80% on vm-demo"`,
      },
      {
        title: 'KQL for a log search alert (pods in CrashLoopBackOff)',
        language: 'text',
        code: `KubePodInventory
| where ContainerStatusReason == "CrashLoopBackOff"
| summarize count() by Name, Namespace`,
      },
    ],
    tags: ['azure monitor', 'alerts', 'action groups', 'kql'],
  },
  {
    id: 'itv-rglb1-12',
    level: 'intermediate',
    kind: 'open',
    prompt: 'How do you send alerts from the Azure DevOps pipeline itself? Cron?',
    probing:
      'Notification subscriptions, service hooks or the Teams app, a condition: failed() webhook step with a secret URL, and scheduled triggers in UTC.',
    answer: [
      'There are three common ways to alert, plus cron (scheduled triggers) to **run** the pipeline on a schedule.',
      '**Option 1: Built-in notifications (no code).** **Project settings > Notifications > New subscription > Build > "A build fails"**. Choose the team, a group, or a custom email address. Users can also set personal ones under **User settings > Notifications**.',
      '**Option 2: Service hooks / Teams app**',
      '- **Project settings > Service hooks > Microsoft Teams / Slack / Webhook**, event "Build completed" or "Run state changed", filtered by status = failed.\n- Or install the **Azure Pipelines app in Teams** and run `@Azure Pipelines subscribe <pipeline URL>` in the channel.',
      '**Option 3: A step in the YAML that runs only on failure.** `TEAMS_WEBHOOK_URL` is stored as a secret variable or in a variable group linked to Key Vault. Note that the old Office 365 connector incoming webhooks in Teams are being retired; new setups use a Teams Workflows (Power Automate) webhook URL, which you call the same way.',
      '**Cron: scheduled pipeline runs**',
      '- **Minute**: Value here: `0`\n- **Hour**: Value here: `2`\n- **Day of month**: Value here: `*`\n- **Month**: Value here: `*`\n- **Day of week**: Value here: `1-5` (Mon-Fri)',
      'Cron times in Azure DevOps are in **UTC**. A nightly scheduled run + a `condition: failed()` notification step = automatic daily health check with alerts.',
      '**Interview-ready answer**',
      '"Inside Azure DevOps, I use notification subscriptions for build failures to email the team, and service hooks or the Azure Pipelines Teams app to post to a channel. For custom messages, I add a final step with `condition: failed()` that calls a Teams or Slack webhook with the pipeline name and run link; the webhook URL is a secret variable. To run pipelines on a schedule, I use the `schedules` block with a cron expression, which is in UTC, with `always: true` if it must run even without new commits."',
    ],
    followUps: [
      'Why must a secret variable be mapped explicitly into a script step?',
      'How would you notify only when a run goes from success to failure, not on every failure?',
      'Which branch does a scheduled trigger read its schedule from?',
    ],
    code: [
      {
        title: 'Notify Teams on failure',
        language: 'yaml',
        code: `steps:
  - script: ./deploy.sh
    displayName: Deploy

  - script: |
      curl -H "Content-Type: application/json" -d '{
        "text": "Pipeline $(Build.DefinitionName) #$(Build.BuildNumber) FAILED on $(Build.SourceBranchName). $(System.CollectionUri)$(System.TeamProject)/_build/results?buildId=$(Build.BuildId)"
      }' "$(TEAMS_WEBHOOK_URL)"
    displayName: Notify Teams on failure
    condition: failed()`,
      },
      {
        title: 'Scheduled run',
        language: 'yaml',
        code: `schedules:
  - cron: "0 2 * * 1-5"          # 02:00 UTC, Monday to Friday
    displayName: Nightly build
    branches:
      include:
        - main
    always: true                  # run even if there are no new commits`,
      },
    ],
    tags: ['azure devops', 'notifications', 'cron', 'webhooks'],
  },
  {
    id: 'itv-rglb1-13',
    level: 'intermediate',
    kind: 'open',
    prompt: 'What is the difference between a service endpoint and a private endpoint?',
    probing:
      'Public IP plus subnet firewall versus a private NIC per resource, on-prem and peered reach, DNS zones, exfiltration protection and cost.',
    answer: [
      'Both let a VNet reach a PaaS service (Storage, SQL, Key Vault) securely, but they work differently.',
      '- **How it works**: Service endpoint: Extends the subnet identity to the service over the Azure backbone; Private endpoint: Creates a **NIC with a private IP** from your subnet for the service\n- **Service IP**: Service endpoint: Service keeps its **public IP**; Private endpoint: Service gets a **private IP** (e.g. `10.0.2.5`)\n- **Public endpoint**: Service endpoint: Still exists; firewall allows only your subnet; Private endpoint: Can be fully disabled\n- **Access from on-prem (VPN/ExpressRoute) / peered VNets**: Service endpoint: No; Private endpoint: **Yes**\n- **DNS changes**: Service endpoint: None; Private endpoint: Needs a private DNS zone (e.g. `privatelink.blob.core.windows.net`)\n- **Scope**: Service endpoint: Whole service type (all storage accounts) from that subnet; Private endpoint: One specific resource (one storage account)\n- **Data exfiltration protection**: Service endpoint: Weaker; Private endpoint: Stronger\n- **Cost**: Service endpoint: Free; Private endpoint: Paid (per hour + per GB)',
      'After creating a private endpoint, link a private DNS zone so the service name resolves to the private IP (see the VM-to-storage question). Check from the VM with `nslookup`: a private endpoint returns a `10.0.x.x` address.',
      '**Interview-ready answer**',
      '"A service endpoint keeps the service\'s public IP but sends traffic from my subnet over the Azure backbone, and the service firewall allows only that subnet. It is free and simple, but it does not work from on-premises or peered networks, and the public endpoint still exists. A private endpoint puts a NIC with a private IP from my VNet in front of one specific resource, so I can disable public access completely, and it works from on-premises and peered VNets. It needs a private DNS zone and has a small cost. For production and sensitive data, I prefer private endpoints."',
    ],
    followUps: [
      'How does on-premises DNS resolve a privatelink name (DNS Private Resolver)?',
      'What is a service endpoint policy and what problem does it solve?',
      'Why can a private endpoint still be reachable while nslookup returns a public IP?',
    ],
    code: [
      {
        title: 'Diagram',
        language: 'text',
        code: `Service endpoint:
VM (10.0.1.4) --Azure backbone--> demostore.blob.core.windows.net (public IP, firewall allows subnet)

Private endpoint:
VM (10.0.1.4) --VNet--> 10.0.2.5 (PE NIC) --> demostore (public access disabled)
                DNS: demostore.blob.core.windows.net -> demostore.privatelink.blob.core.windows.net -> 10.0.2.5`,
      },
      {
        title: 'Service endpoint',
        language: 'bash',
        code: `az network vnet subnet update -g rg-demo --vnet-name vnet-demo -n snet-app \\
  --service-endpoints Microsoft.Storage

az storage account network-rule add -g rg-demo --account-name demostore01 \\
  --vnet-name vnet-demo --subnet snet-app
az storage account update -g rg-demo -n demostore01 --default-action Deny`,
      },
      {
        title: 'Private endpoint',
        language: 'bash',
        code: `SA_ID=$(az storage account show -g rg-demo -n demostore01 --query id -o tsv)

az network private-endpoint create -g rg-demo -n pe-demostore-blob \\
  --vnet-name vnet-demo --subnet snet-pe \\
  --private-connection-resource-id "$SA_ID" --group-id blob \\
  --connection-name demostore-blob-conn

# Check from the VM
nslookup demostore01.blob.core.windows.net    # private endpoint -> returns 10.0.x.x`,
      },
    ],
    tags: ['azure networking', 'private endpoint', 'service endpoint', 'storage'],
  },
  {
    id: 'itv-rglb1-14',
    level: 'advanced',
    kind: 'scenario',
    prompt:
      'A user opens https://demo.example.com. How does the traffic flow to the container in the pod?',
    probing:
      'Walking every hop (DNS, LB/App Gateway, ingress controller and TLS, Service, kube-proxy, ready pod, targetPort) and using the same path to troubleshoot.',
    answer: [
      '**End-to-end flow (AKS example):** browser -> DNS -> Azure Load Balancer or Application Gateway -> ingress controller -> ClusterIP Service -> kube-proxy -> ready pod -> container port.',
      '**Step by step traffic flow**',
      '- **1. Browser**: What happens: Starts HTTPS request\n- **2. DNS**: What happens: Resolves `demo.example.com` to the public IP of the load balancer / App Gateway\n- **3. Load balancer / App Gateway**: What happens: Receives traffic on 443; App Gateway can apply WAF rules\n- **4. Ingress controller**: What happens: Terminates TLS, reads `Host` and path, finds the matching Ingress rule\n- **5. Service**: What happens: Stable virtual IP and DNS name in front of the pods (selects pods by labels)\n- **6. kube-proxy / Endpoints**: What happens: Load-balances to one ready pod IP\n- **7. Container**: What happens: `targetPort` 8080 of the container receives the request; response returns the same way',
      '**The YAML that makes it work:** an Ingress with the host, TLS secret and backend Service, and a ClusterIP Service whose `selector` matches the pod labels and whose `targetPort` is the container port.',
      '**Debug by following the path:** DNS resolves to the right IP, the ingress controller EXTERNAL-IP matches, the Ingress host/path/backend are correct, the Service has endpoints (empty = selector/labels or readiness problem), and the pods are running.',
      '**Interview-ready answer**',
      '"The browser resolves the domain through DNS to the public IP of the Azure Load Balancer or Application Gateway. The request reaches the ingress controller, such as NGINX or AGIC, which terminates TLS and matches the host and path to an Ingress rule. The Ingress forwards to a ClusterIP Service, which selects pods by label, and kube-proxy load-balances to one ready pod IP. Finally, the request reaches the container\'s `targetPort`, for example 8080. To troubleshoot, I follow the same path: DNS, ingress external IP, Ingress rules, Service endpoints, and pod readiness."',
    ],
    deeper: [
      'Most ingress controllers (including NGINX) send traffic straight to pod IPs from the Endpoints/EndpointSlices rather than through the Service ClusterIP, so kube-proxy is bypassed on that hop; the Service is still what defines the set of endpoints.',
    ],
    followUps: [
      'Where does TLS terminate with AGIC versus NGINX, and how do you do end-to-end TLS?',
      'The Service shows no endpoints. What are the likely causes?',
      'How does `externalTrafficPolicy: Local` change the flow and the client source IP?',
    ],
    code: [
      {
        title: 'End-to-end flow',
        language: 'text',
        code: `1. Browser: https://demo.example.com
       |
2. DNS (Azure DNS / registrar): demo.example.com -> 20.10.30.40 (public IP)
       |
3. Azure Load Balancer or Application Gateway (WAF) on 20.10.30.40:443
       |
4. Ingress controller pod (NGINX / AGIC)  -> TLS terminated with cert from a Secret / Key Vault
       |  matches Ingress rule: host demo.example.com, path /
5. Service "demo-web" (ClusterIP 10.0.150.20:80)
       |  kube-proxy (iptables/IPVS) picks one healthy endpoint
6. Pod IP 10.244.1.15:8080   (only pods passing the readiness probe)
       |
7. Container listening on port 8080`,
      },
      {
        title: 'Ingress and Service',
        language: 'yaml',
        code: `apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: demo-ingress
spec:
  ingressClassName: nginx
  tls:
    - hosts: [demo.example.com]
      secretName: demo-tls
  rules:
    - host: demo.example.com
      http:
        paths:
          - path: /
            pathType: Prefix
            backend:
              service:
                name: demo-web
                port:
                  number: 80
---
apiVersion: v1
kind: Service
metadata:
  name: demo-web
spec:
  type: ClusterIP
  selector:
    app: demo-web            # must match pod labels
  ports:
    - port: 80
      targetPort: 8080       # container port`,
      },
      {
        title: 'Debug commands (follow the path)',
        language: 'bash',
        code: `nslookup demo.example.com                       # DNS -> public IP?
kubectl get svc -n ingress-nginx                # ingress controller EXTERNAL-IP matches?
kubectl describe ingress demo-ingress           # host/path/backend correct?
kubectl get endpoints demo-web                  # empty = selector/labels or readiness problem
kubectl get pods -l app=demo-web -o wide
kubectl port-forward svc/demo-web 8080:80       # test the service directly`,
      },
    ],
    tags: ['kubernetes', 'ingress', 'networking', 'aks', 'troubleshooting'],
  },
  {
    id: 'itv-rglb1-15',
    level: 'intermediate',
    kind: 'open',
    prompt: 'What is the main reason behind a CrashLoopBackOff issue?',
    probing:
      'That CrashLoopBackOff is a symptom, the common causes mapped to exit codes, and the logs --previous / describe workflow.',
    answer: [
      '**CrashLoopBackOff** means: the container **starts, then exits (crashes), and Kubernetes keeps restarting it**, waiting longer each time (10s, 20s, 40s ... up to 5 minutes). It is a **symptom**; the real reason is why the container exits.',
      '**Main reasons for CrashLoopBackOff**',
      '- **Application error at startup (exception, bad config)**: How to recognise it: `kubectl logs --previous` shows a stack trace; exit code `1`\n- **Missing env var / ConfigMap / Secret / wrong connection string**: How to recognise it: Logs: "DB_URL not set", "connection refused"\n- **Wrong command or entrypoint**: How to recognise it: Exit code `127` (command not found) or `126`\n- **Out of memory**: How to recognise it: `Reason: OOMKilled`, exit code `137`\n- **Liveness probe fails (too early or wrong path/port)**: How to recognise it: Events: "Liveness probe failed", container killed\n- **Dependency not ready (DB, other service)**: How to recognise it: App exits because it cannot connect\n- **Container has no long-running process**: How to recognise it: Process finishes, exit code `0`, restarts again\n- **Permission issues (read-only FS, non-root user)**: How to recognise it: Logs: "permission denied"',
      'In the example `describe` output, `Reason: OOMKilled` with exit code 137 means the fix is to increase the memory limit or fix the memory leak.',
      '**Common fixes for CrashLoopBackOff**',
      '- Fix the app config / add the missing Secret or ConfigMap.\n- Correct `command` / `args` in the manifest.\n- Increase `resources.limits.memory` if OOMKilled.\n- Add a `startupProbe` or increase `initialDelaySeconds` for slow-starting apps (e.g. Java).\n- Debug the image by running a shell: `kubectl run debug --rm -it --image=<image> -- sh`.',
      '**Interview-ready answer**',
      '"CrashLoopBackOff means the container keeps starting and crashing, and Kubernetes restarts it with an increasing back-off delay. The most common reason is the application itself failing at startup, for example because of a missing environment variable, Secret, or ConfigMap, a wrong database connection, or a wrong command. Other reasons are OOMKilled with exit code 137, or a liveness probe that kills a slow-starting app. I troubleshoot with `kubectl logs --previous` to see why it crashed and `kubectl describe pod` to check the exit code, reason, and events."',
    ],
    followUps: [
      'How do you debug a crashing distroless image that has no shell (`kubectl debug`)?',
      'What is the difference between a failing readiness probe and a failing liveness probe?',
      'How is CrashLoopBackOff different from ImagePullBackOff?',
    ],
    code: [
      {
        title: 'Troubleshooting steps',
        language: 'bash',
        code: `kubectl get pods                                  # STATUS: CrashLoopBackOff, RESTARTS: 7
kubectl describe pod demo-api-6c8d9-abcde         # check Last State, Reason, Exit Code, Events
kubectl logs demo-api-6c8d9-abcde --previous      # logs from the crashed container
kubectl get events --sort-by=.lastTimestamp
kubectl get pod demo-api-6c8d9-abcde -o yaml | grep -A5 lastState`,
      },
      {
        title: 'Example describe output',
        language: 'text',
        code: `Last State:     Terminated
  Reason:       OOMKilled
  Exit Code:    137`,
      },
    ],
    traps: [
      'Only running `kubectl logs` without `--previous`: the current container may have just restarted and show nothing useful.',
    ],
    tags: ['kubernetes', 'crashloopbackoff', 'troubleshooting', 'pods'],
  },
  {
    id: 'itv-rglb1-16',
    level: 'advanced',
    kind: 'scenario',
    prompt:
      'Your terraform plan is clean, but terraform apply is failing. What might be the reason?',
    probing:
      'Understanding that plan only reads, so write permissions, policy, existing resources, unique names, quota, locks, soft delete and drift surface only at apply; plus saved plans and TF_LOG.',
    answer: [
      '`terraform plan` mostly **reads** state and calls read APIs. It does **not** actually create anything, so Azure only checks many things during `apply`, when the real create/update API is called.',
      '**Common reasons apply fails after a clean plan**',
      "- **Permissions: the identity can read but not write**: Example error: `AuthorizationFailed ... does not have authorization to perform action 'Microsoft.Network/virtualNetworks/write'`\n- **Azure Policy denies the resource**: Example error: `RequestDisallowedByPolicy` (e.g. location not allowed, missing tag)\n- **Resource already exists outside Terraform state**: Example error: `A resource with the ID ... already exists - to be managed via Terraform this resource needs to be imported`\n- **Globally unique name already taken**: Example error: Storage account / Key Vault / web app name in use\n- **Quota / capacity limits**: Example error: `QuotaExceeded` for vCPUs, or the VM size is not available in that region/zone\n- **Resource lock (`CanNotDelete` / `ReadOnly`)**: Example error: Update or delete blocked\n- **Soft-deleted resource with the same name**: Example error: Key Vault or API Management in soft-delete state\n- **Drift / race: something changed between plan and apply**: Example error: Someone edited it in the portal, or another pipeline ran\n- **State lock held by another run**: Example error: `Error acquiring the state lock`\n- **Values only known at apply time are invalid**: Example error: Generated name too long, invalid combination\n- **Dependency timing**: Example error: Role assignment not propagated yet, private DNS not ready\n- **Expired credentials / token during a long apply**: Example error: Service principal secret expired",
      '**How I troubleshoot:** apply a saved plan so apply does exactly what was reviewed, turn on `TF_LOG=DEBUG` for detail, import resources that exist outside state (or use an `import` block in Terraform 1.5+), check locks and role assignments, and `force-unlock` a stuck state lock only if no other run is active.',
      '**Interview-ready answer**',
      '"Plan only reads state and calls read APIs, so many checks happen only during apply, when Azure actually processes the create or update. The common reasons are: the pipeline\'s service principal has read but not write permissions, Azure Policy denies the resource, the resource already exists outside the state and needs to be imported, a globally unique name is taken, subscription quota is exceeded, or there is a resource lock or a soft-deleted Key Vault. Drift between plan and apply can also cause it. I read the exact error, enable `TF_LOG=DEBUG` if needed, and always apply a saved plan file so the apply matches what was reviewed."',
    ],
    followUps: [
      'How would you fix a role assignment that fails because the principal has not propagated yet?',
      'How do you recover a soft-deleted Key Vault that blocks the apply?',
      'Why is applying a saved plan file safer in a pipeline than running apply directly?',
    ],
    code: [
      {
        title: 'Troubleshooting commands',
        language: 'bash',
        code: `# Use a saved plan so apply does exactly what was reviewed
terraform plan -out=tfplan
terraform apply tfplan

# More detail
export TF_LOG=DEBUG
terraform apply tfplan

# Resource exists outside state -> import it
terraform import azurerm_resource_group.rg /subscriptions/<sub-id>/resourceGroups/rg-demo

# Check locks and permissions
az lock list -g rg-demo -o table
az role assignment list --assignee <sp-app-id> -o table

# Stuck state lock (only if no other run is active)
terraform force-unlock <LOCK_ID>`,
      },
    ],
    traps: [
      'Assuming a clean plan means Azure has validated the change: plan never calls the write APIs.',
    ],
    tags: ['terraform', 'troubleshooting', 'azure policy', 'rbac'],
  },
  {
    id: 'itv-rglb1-17',
    level: 'basic',
    kind: 'open',
    prompt: 'What is the difference between a task and a job in an Azure YAML pipeline?',
    probing:
      'The pipeline > stage > job > step hierarchy, that a job runs on one agent with sequential steps, jobs run in parallel and share data only via artifacts or outputs.',
    answer: [
      '**Hierarchy:** a pipeline contains stages, a stage contains jobs, and a job contains steps (tasks or scripts).',
      '- **What it is**: Task: A single unit of work (a step); Job: A group of steps\n- **Runs on**: Task: Inside a job; Job: **One agent** (fresh VM for Microsoft-hosted)\n- **Order**: Task: Steps run **sequentially**; Job: Jobs run in **parallel** by default (use `dependsOn` to order)\n- **Examples**: Task: `Docker@2`, `AzureCLI@2`, `script:`; Job: `job: Build`, `deployment: DeployProd`\n- **Shares files?**: Task: Yes, steps in the same job share the workspace; Job: No, jobs share data only through artifacts or output variables',
      '`script:`, `bash:`, and `pwsh:` are shortcuts for script tasks.',
      '**Job types in Azure Pipelines**',
      '- **`job`**: Use: Normal build/test work\n- **`deployment`**: Use: Deploys to an `environment` (history, approvals, strategies like `runOnce`, `rolling`, `canary`)\n- **Agentless (`pool: server`)**: Use: Waits, manual validation, REST calls; no agent needed',
      '**Interview-ready answer**',
      '"A task is a single step, like `Docker@2`, `AzureCLI@2`, or a script, and it runs inside a job. A job is a group of steps that runs on one agent; the steps run one after another and share the same workspace. Jobs in a stage run in parallel by default unless I add `dependsOn`, and they share data only through artifacts or output variables. Stages group jobs. For deployments, I use a deployment job, which targets an environment with approvals and deployment history."',
    ],
    code: [
      {
        title: 'Hierarchy',
        language: 'text',
        code: `Pipeline
 └── Stage   (e.g. Build, DeployDev, DeployProd)
      └── Job   (runs on ONE agent)
           └── Step  (task or script, runs one after another)`,
      },
      {
        title: 'Jobs and tasks',
        language: 'yaml',
        code: `stages:
  - stage: CI
    jobs:
      - job: Build                      # JOB 1
        pool: { vmImage: ubuntu-latest }
        steps:
          - task: Maven@4               # TASK
            inputs:
              mavenPomFile: pom.xml
              goals: package
          - script: echo "Build done"   # TASK (script shortcut)

      - job: Lint                       # JOB 2 runs in parallel with Build
        pool: { vmImage: ubuntu-latest }
        steps:
          - script: npm run lint

      - job: Report                     # JOB 3 waits for both
        dependsOn: [Build, Lint]
        pool: { vmImage: ubuntu-latest }
        steps:
          - script: echo "All checks passed"`,
      },
    ],
    tags: ['azure devops', 'yaml pipelines', 'jobs', 'tasks'],
  },
  {
    id: 'itv-rglb1-18',
    level: 'advanced',
    kind: 'scenario',
    prompt:
      'You need to update one parameter in Terraform, but the plan shows it will recreate the resource. How can you avoid recreating it?',
    probing:
      'Reading "forces replacement" first, then choosing the right tool: moved blocks / state mv for address changes, ignore_changes, explicit defaults, prevent_destroy, or an honest migration plan.',
    answer: [
      'First, **find why** Terraform wants to replace it. The plan tells you: the attribute marked **`# forces replacement`** is the cause. Then choose the right fix:',
      '- **You renamed the resource block or moved it into a module**: Fix without recreating: `moved` block (or `terraform state mv`)\n- **Changed `count` to `for_each`, or list order changed (indexes shifted)**: Fix without recreating: `moved` blocks for each address\n- **The attribute is ForceNew in Azure (e.g. `name`, `location`, VM `admin_username`) but you only need Terraform to stop touching it**: Fix without recreating: `lifecycle { ignore_changes = [...] }`\n- **The change can be done in place in Azure but not by the provider (rare)**: Fix without recreating: Change it with `az` CLI / portal, then update the code to match, or ignore it\n- **Provider upgrade changed defaults**: Fix without recreating: Set the old value explicitly in code\n- **Protect against accidental destroy**: Fix without recreating: `lifecycle { prevent_destroy = true }` (blocks the plan, does not avoid it)',
      '**Verify:** run `terraform plan` again and expect "~ update in-place" or "No changes", NOT "-/+ must be replaced".',
      'If the attribute truly can only be set at creation time (e.g. storage account name), the cloud does not allow an in-place change. Then you plan a migration: create the new resource, move the data, and switch over.',
      '**Interview-ready answer**',
      '"First I read the plan to see which attribute shows `forces replacement`. If the replacement happens only because I renamed the resource or moved it into a module, I add a `moved` block or use `terraform state mv`, and then it is a no-op. If the attribute is ForceNew in Azure but I don\'t actually need Terraform to change it, I use `lifecycle { ignore_changes = [...] }`. For critical resources, I add `prevent_destroy` so a replacement fails the plan. If the property really can only be set at creation time, like a storage account name, recreation cannot be avoided, so I plan a proper migration."',
    ],
    followUps: [
      'Why is a `moved` block preferred over `terraform state mv` in a team?',
      'What is the risk of leaving `ignore_changes` on an attribute long-term?',
      'How would you migrate from `count` to `for_each` without downtime?',
    ],
    code: [
      {
        title: 'Plan output showing the cause',
        language: 'text',
        code: `# azurerm_storage_account.sa must be replaced
-/+ resource "azurerm_storage_account" "sa" {
      ~ account_replication_type = "LRS" -> "ZRS"
      ~ name                     = "demostore01" -> "demostore02" # forces replacement`,
      },
      {
        title: 'Fix 1: moved block (resource address changed)',
        language: 'hcl',
        code: `# Old: resource "azurerm_storage_account" "sa" {...}
# New name in code:
resource "azurerm_storage_account" "logs" {
  name = "demostore01"
  # ...
}

moved {
  from = azurerm_storage_account.sa
  to   = azurerm_storage_account.logs
}`,
      },
      {
        title: 'Or with the CLI',
        language: 'bash',
        code: `terraform state mv azurerm_storage_account.sa azurerm_storage_account.logs`,
      },
      {
        title: 'Fix 2: ignore_changes',
        language: 'hcl',
        code: `resource "azurerm_linux_virtual_machine" "vm" {
  # ...
  custom_data = base64encode(file("init.sh"))

  lifecycle {
    ignore_changes = [custom_data, tags["CreatedOn"]]
  }
}`,
      },
      {
        title: 'Fix 3: prevent_destroy as a safety net',
        language: 'hcl',
        code: `lifecycle {
  prevent_destroy = true      # plan fails instead of deleting a critical resource
}`,
      },
    ],
    tags: ['terraform', 'lifecycle', 'moved block', 'state'],
  },
  {
    id: 'itv-rglb1-19',
    level: 'intermediate',
    kind: 'open',
    prompt: 'What is the use of Docker Compose and multi-stage Docker builds?',
    probing:
      'That Compose runs several containers together for local/dev, while multi-stage builds produce small, secure runtime images; they solve different problems.',
    answer: [
      'They solve different problems:',
      '- **Purpose**: Docker Compose: **Run several containers together** (app + DB + cache); Multi-stage Dockerfile: **Build a small, secure image**\n- **File**: Docker Compose: `docker-compose.yml` / `compose.yaml`; Multi-stage Dockerfile: `Dockerfile` with multiple `FROM`\n- **Used for**: Docker Compose: Local development, testing, simple single-host setups; Multi-stage Dockerfile: Every production image',
      '**Docker Compose:** all services share one network, so `api` reaches the database using the hostname `db`. Plain `depends_on` only waits for the container to start, not to be ready; use a `healthcheck` with `condition: service_healthy` if the app needs the DB ready.',
      '**Multi-stage Dockerfile (Spring Boot):** stage 1 has Maven + JDK to compile; stage 2 copies only the jar into a small JRE image and runs as a non-root user.',
      '- **Image size**: Single-stage: ~700 MB (Maven + JDK + source); Multi-stage: ~200 MB (JRE + jar)\n- **Attack surface**: Single-stage: Build tools and source code inside; Multi-stage: Only what is needed to run\n- **Build speed**: Single-stage: Less caching; Multi-stage: Better layer caching',
      '(Sizes are typical values; they depend on the base images.)',
      '**Interview-ready answer**',
      '"Docker Compose is for running multiple related containers together with one YAML file, for example an API, Postgres, and Redis for local development or testing, with `docker compose up`. A multi-stage Dockerfile is for building images: the first stage uses a heavy image with Maven and the JDK to compile, and the final stage copies only the jar into a small JRE image. That makes the image much smaller and more secure, because build tools and source code are not shipped. In production, Kubernetes replaces Compose, but multi-stage builds are used for every image."',
    ],
    followUps: [
      'Why copy `pom.xml` and download dependencies before copying the source?',
      'How would you make the API wait until Postgres is actually ready?',
      'What would you use instead of Compose in production, and why?',
    ],
    code: [
      {
        title: 'compose.yaml',
        language: 'yaml',
        code: `services:
  api:
    build: .
    ports:
      - "8080:8080"
    environment:
      DB_HOST: db
      REDIS_HOST: cache
    depends_on:
      - db
      - cache

  db:
    image: postgres:16
    environment:
      POSTGRES_PASSWORD: example
    volumes:
      - dbdata:/var/lib/postgresql/data

  cache:
    image: redis:7

volumes:
  dbdata:`,
      },
      {
        title: 'Compose commands',
        language: 'bash',
        code: `docker compose up -d          # start everything
docker compose ps             # status
docker compose logs -f api    # logs
docker compose down -v        # stop and remove (and volumes)`,
      },
      {
        title: 'Multi-stage Dockerfile (Spring Boot)',
        language: 'dockerfile',
        code: `# Stage 1: build (has Maven + JDK, large)
FROM maven:3.9-eclipse-temurin-17 AS build
WORKDIR /app
COPY pom.xml .
RUN mvn -B dependency:go-offline          # cached layer
COPY src ./src
RUN mvn -B package -DskipTests

# Stage 2: runtime (only JRE + jar, small)
FROM eclipse-temurin:17-jre-alpine
WORKDIR /app
RUN addgroup -S app && adduser -S app -G app
COPY --from=build /app/target/*.jar app.jar
USER app
EXPOSE 8080
ENTRYPOINT ["java", "-jar", "app.jar"]`,
      },
      {
        title: 'Build and check size',
        language: 'bash',
        code: `docker build -t demoacr.azurecr.io/demo-api:1.0.0 .
docker images | grep demo-api`,
      },
    ],
    tags: ['docker', 'docker compose', 'multi-stage build', 'containers'],
  },
  {
    id: 'itv-rglb1-20',
    level: 'advanced',
    kind: 'scenario',
    prompt: 'Your VM needs to access a storage account. How do you establish a secure connection?',
    probing:
      'Securing both network (private endpoint, private DNS, public access off) and identity (managed identity, data-plane RBAC, shared key disabled), then verifying.',
    answer: [
      'Secure access has two parts: **network** (how traffic travels) and **identity** (who is allowed). Use both.',
      "**Step 1: Network - private endpoint + private DNS.** Create a private endpoint for the blob service in the VM's VNet, link the `privatelink.blob.core.windows.net` private DNS zone with a DNS zone group, and disable public network access. A cheaper alternative is a **service endpoint** on the VM subnet.",
      '**Step 2: Identity - managed identity + RBAC (no keys).** Enable a system-assigned managed identity on the VM, give it a data-plane role such as **Storage Blob Data Reader** on the storage account, and turn off Shared Key access so only Microsoft Entra ID auth works.',
      '**Step 3: Test from the VM.** `nslookup` should return a `10.0.x.x` address, and `az login --identity` followed by `az storage blob list --auth-mode login` should work.',
      '**Extra hardening steps**',
      '- `--min-tls-version TLS1_2` and `--https-only true` on the storage account.\n- NSG on the private endpoint subnet if needed.\n- Diagnostic logs on the storage account to see who accessed what.',
      '**Interview-ready answer**',
      '"I secure both the network and the identity. For the network, I create a private endpoint for the blob service in the VM\'s VNet, link the `privatelink.blob.core.windows.net` private DNS zone so the storage name resolves to a private IP, and disable public network access. For identity, I enable a managed identity on the VM and give it an RBAC role like Storage Blob Data Reader on the storage account, and I disable shared key access, so there are no keys or SAS tokens in code. I verify with `nslookup` that it resolves to a private IP and with `az login --identity` that access works."',
    ],
    followUps: [
      'Why does a Contributor role on the storage account not let the VM read blobs with `--auth-mode login`?',
      'What breaks when you disable Shared Key access (for example, some tools or SAS)?',
      'How would the same design work from on-premises over VPN?',
    ],
    code: [
      {
        title: 'Design',
        language: 'text',
        code: `VM (managed identity) --private IP--> Private endpoint --> Storage account (public access disabled)
                           RBAC: Storage Blob Data Reader`,
      },
      {
        title: 'Step 1: Private endpoint and private DNS',
        language: 'bash',
        code: `SA_ID=$(az storage account show -g rg-demo -n demostore01 --query id -o tsv)

# Private endpoint in the VM's VNet
az network private-endpoint create -g rg-demo -n pe-demostore-blob \\
  --vnet-name vnet-demo --subnet snet-pe \\
  --private-connection-resource-id "$SA_ID" --group-id blob \\
  --connection-name demostore-blob-conn

# Private DNS zone so the storage name resolves to the private IP
az network private-dns zone create -g rg-demo -n privatelink.blob.core.windows.net
az network private-dns link vnet create -g rg-demo -n link-vnet-demo \\
  --zone-name privatelink.blob.core.windows.net --virtual-network vnet-demo --registration-enabled false
az network private-endpoint dns-zone-group create -g rg-demo \\
  --endpoint-name pe-demostore-blob -n default \\
  --private-dns-zone privatelink.blob.core.windows.net --zone-name blob

# Block public access
az storage account update -g rg-demo -n demostore01 --public-network-access Disabled`,
      },
      {
        title: 'Step 2: Managed identity and RBAC',
        language: 'bash',
        code: `# Enable system-assigned managed identity on the VM
az vm identity assign -g rg-demo -n vm-demo
PRINCIPAL_ID=$(az vm show -g rg-demo -n vm-demo --query identity.principalId -o tsv)

# Give it data access on the storage account
az role assignment create --assignee "$PRINCIPAL_ID" \\
  --role "Storage Blob Data Reader" --scope "$SA_ID"

# Turn off account keys (Shared Key) so only Entra ID auth works
az storage account update -g rg-demo -n demostore01 --allow-shared-key-access false`,
      },
      {
        title: 'Step 3: Test from the VM',
        language: 'bash',
        code: `nslookup demostore01.blob.core.windows.net      # should return 10.0.x.x
az login --identity
az storage blob list --account-name demostore01 -c data --auth-mode login -o table`,
      },
    ],
    traps: [
      'Securing only the network and still using account keys or SAS tokens in code: identity is the other half.',
    ],
    tags: ['azure storage', 'private endpoint', 'managed identity', 'rbac', 'security'],
  },
  {
    id: 'itv-rglb1-21',
    level: 'intermediate',
    kind: 'open',
    prompt: 'How do you use WAF? How do you integrate WAF with Application Gateway?',
    probing:
      'WAF_v2 SKU, a separate WAF policy with managed and custom rules, attaching it at gateway/listener/path level, Detection-then-Prevention, and tuning via logs and exclusions.',
    answer: [
      '**WAF (Web Application Firewall)** inspects HTTP/HTTPS requests and blocks common attacks such as **SQL injection, cross-site scripting (XSS)**, and other OWASP Top 10 attacks, plus bad bots. In Azure, WAF runs on **Application Gateway** (regional) or **Azure Front Door** (global). A blocked request gets **403 Forbidden** and is logged in Log Analytics.',
      '**Key WAF concepts to know**',
      '- **SKU**: Meaning: Application Gateway must be **WAF_v2**\n- **WAF policy**: Meaning: Separate resource holding the settings; attached to the gateway, a listener, or a path\n- **Managed rules**: Meaning: Microsoft-managed rule sets: OWASP CRS 3.2 / Default Rule Set (DRS), Bot Manager\n- **Custom rules**: Meaning: Your own rules: block an IP range, geo-block, rate limiting, match a header\n- **Mode**: Meaning: **Detection** = only log; **Prevention** = log and block\n- **Exclusions**: Meaning: Skip a rule for a specific field to fix false positives',
      '**Steps:** 1) create a WAF policy, starting in Detection mode; 2) add custom rules (for example, block an IP range); 3) attach the policy to the Application Gateway (CLI or Terraform `firewall_policy_id`); 4) enable diagnostic settings to Log Analytics, check what was blocked, add exclusions for false positives, then switch to **Prevention**.',
      'For new policies, the Microsoft Default Rule Set (DRS 2.1 or later) is the current recommendation over OWASP CRS 3.2.',
      '**Interview-ready answer**',
      '"I deploy Application Gateway with the WAF_v2 SKU and create a separate WAF policy with the OWASP 3.2 or Microsoft Default Rule Set, which protects against SQL injection, XSS, and other OWASP Top 10 attacks. I add custom rules for things like IP blocking, geo-filtering, or rate limiting, and attach the policy to the gateway, or to a specific listener if different sites need different rules. I start in Detection mode, send the firewall logs to Log Analytics, tune false positives with exclusions, and then switch to Prevention mode. Everything is defined in Terraform."',
    ],
    followUps: [
      'When would you put WAF on Front Door instead of Application Gateway?',
      'A legitimate request is blocked by rule 942100. How do you fix it without disabling the WAF?',
      'How does rate limiting work in a WAF custom rule?',
    ],
    code: [
      {
        title: 'Flow',
        language: 'text',
        code: `User --> Application Gateway (WAF_v2 + WAF policy) --> Backend (VM / App Service / AKS)
               |
          Blocked request -> 403 Forbidden, logged in Log Analytics`,
      },
      {
        title: 'Create the policy and a custom rule',
        language: 'bash',
        code: `az network application-gateway waf-policy create -g rg-demo -n wafpol-demo \\
  --type OWASP --version 3.2

# Start in Detection, move to Prevention after tuning
az network application-gateway waf-policy policy-setting update -g rg-demo \\
  --policy-name wafpol-demo --state Enabled --mode Detection

# Custom rule: block an IP range
az network application-gateway waf-policy custom-rule create -g rg-demo \\
  --policy-name wafpol-demo -n BlockBadIPs --priority 10 \\
  --rule-type MatchRule --action Block

az network application-gateway waf-policy custom-rule match-condition add -g rg-demo \\
  --policy-name wafpol-demo -n BlockBadIPs \\
  --match-variables RemoteAddr --operator IPMatch --values 198.51.100.0/24`,
      },
      {
        title: 'Attach the policy to Application Gateway',
        language: 'bash',
        code: `POLICY_ID=$(az network application-gateway waf-policy show -g rg-demo -n wafpol-demo --query id -o tsv)

az network application-gateway create -g rg-demo -n agw-demo \\
  --sku WAF_v2 --capacity 2 \\
  --vnet-name vnet-demo --subnet snet-agw \\
  --public-ip-address pip-agw-demo \\
  --servers 10.0.1.4 10.0.1.5 \\
  --waf-policy "$POLICY_ID" --priority 100`,
      },
      {
        title: 'Terraform',
        language: 'hcl',
        code: `resource "azurerm_web_application_firewall_policy" "waf" {
  name                = "wafpol-demo"
  resource_group_name = azurerm_resource_group.rg.name
  location            = azurerm_resource_group.rg.location

  policy_settings {
    enabled = true
    mode    = "Prevention"
  }

  managed_rules {
    managed_rule_set {
      type    = "OWASP"
      version = "3.2"
    }
  }
}

resource "azurerm_application_gateway" "agw" {
  # ... sku { name = "WAF_v2", tier = "WAF_v2" }, listeners, backends ...
  firewall_policy_id = azurerm_web_application_firewall_policy.waf.id
}`,
      },
      {
        title: 'KQL: what was blocked',
        language: 'text',
        code: `AzureDiagnostics
| where Category == "ApplicationGatewayFirewallLog"
| where action_s == "Blocked" or action_s == "Matched"
| project TimeGenerated, clientIp_s, requestUri_s, ruleId_s, Message`,
      },
    ],
    tags: ['waf', 'application gateway', 'azure security', 'terraform'],
  },
  {
    id: 'itv-rglb1-22',
    level: 'basic',
    kind: 'open',
    prompt: 'Which ps commands do you use in shell scripts?',
    probing:
      'Practical ps usage (full listing, sorting by CPU/memory, custom -o columns for parsing) and knowing pgrep is cleaner for "is it running" checks.',
    answer: [
      '`ps` shows running processes. In scripts it is mostly used to **check if something is running**, **find PIDs**, and **find top CPU/memory consumers**.',
      '**Common ps commands**',
      '- **`ps -ef`**: Use: All processes, full format (UID, PID, PPID, start time, command)\n- **`ps aux`**: Use: All processes with %CPU, %MEM\n- **`ps -ef | grep [n]ginx`**: Use: Find a process by name (bracket avoids matching grep itself)\n- **`ps aux --sort=-%cpu | head -5`**: Use: Top 5 CPU consumers\n- **`ps aux --sort=-%mem | head -5`**: Use: Top 5 memory consumers\n- **`ps -p 1234 -o pid,ppid,%cpu,%mem,etime,cmd`**: Use: Details of one PID, custom columns\n- **`ps -u demo`**: Use: Processes of user `demo`\n- **`ps -eLf`**: Use: Show threads\n- **`ps -ef --forest`**: Use: Process tree (parent/child)',
      'Related helpers: `pgrep -f <pattern>` (just PIDs), `pkill`, `pidof`, `top -b -n 1` (batch mode for scripts).',
      '**Interview-ready answer**',
      '"In scripts, I use `ps -ef` or `ps aux` to list processes, `ps aux --sort=-%cpu | head` or `--sort=-%mem` to find the top resource consumers, and `ps -p <pid> -o pid,%cpu,%mem,etime,cmd` with custom columns for a specific process. Custom output with `-o` and `--no-headers` is easy to parse with `awk`. To check if a service is running, I prefer `pgrep -x`, because it returns just the PID and a clean exit code. For example, I have a script that restarts a service with systemctl if `pgrep` finds it is not running."',
    ],
    code: [
      {
        title: 'Script 1: Restart a service if it is not running',
        language: 'bash',
        code: `#!/bin/bash
SERVICE="nginx"

if pgrep -x "$SERVICE" > /dev/null; then
  echo "$(date) $SERVICE is running"
else
  echo "$(date) $SERVICE is down, restarting..."
  sudo systemctl restart "$SERVICE"
fi`,
      },
      {
        title: 'Script 2: Alert on high CPU processes',
        language: 'bash',
        code: `#!/bin/bash
THRESHOLD=80

ps -eo pid,comm,%cpu --sort=-%cpu --no-headers | head -5 | while read -r pid cmd cpu; do
  if (( \${cpu%.*} > THRESHOLD )); then
    echo "$(date) High CPU: $cmd (PID $pid) using \${cpu}%"
  fi
done`,
      },
      {
        title: 'Script 3: Kill processes running longer than 1 hour',
        language: 'bash',
        code: `#!/bin/bash
# etimes = elapsed time in seconds
ps -eo pid,etimes,comm --no-headers | awk '$3=="java" && $2 > 3600 {print $1}' | while read -r pid; do
  echo "Killing long-running java PID $pid"
  kill "$pid"
done`,
      },
    ],
    tags: ['linux', 'ps', 'shell scripting', 'processes'],
  },
  {
    id: 'itv-rglb1-23',
    level: 'advanced',
    kind: 'open',
    prompt: 'Write a multi-stage Azure YAML pipeline.',
    probing:
      'A realistic Build -> image -> Dev -> Prod pipeline: build once and promote the same tag, PR builds skip push, deployment jobs with environments, approvals outside YAML, branch conditions.',
    answer: [
      'A complete pipeline: **Build and test -> Docker image to ACR -> Deploy to Dev AKS -> Deploy to Prod AKS (with approval)**.',
      '**Prerequisites for the pipeline**',
      '- **ACR service connection (Docker registry)**: Name in example: `sc-acr-demo`\n- **Kubernetes service connections**: Name in example: `sc-aks-dev`, `sc-aks-prod`\n- **Environments**: Name in example: `demo-dev`, `demo-prod` (add **Approvals and checks** on `demo-prod`)\n- **Manifests in repo**: Name in example: `k8s/deployment.yaml`, `k8s/service.yaml`',
      '**Key points to explain**',
      "- **Stages run in order using `dependsOn`**: Where: Build -> Docker -> DeployDev -> DeployProd\n- **PRs only build and test**: Where: `ne(variables['Build.Reason'], 'PullRequest')` on Docker stage\n- **Build once, deploy the same image everywhere**: Where: Same `$(tag)` used for Dev and Prod\n- **Deployment jobs auto-download artifacts**: Where: Manifests available at `$(Pipeline.Workspace)/manifests`\n- **Approvals**: Where: Set on the `demo-prod` environment, not in YAML\n- **Prod only from `main`**: Where: Condition on `Build.SourceBranch`\n- **`containers:` input**: Where: Replaces the image in the manifest with the exact tag",
      '**Interview-ready answer**',
      '"My multi-stage pipeline has four stages. Build runs Maven with unit tests and publishes the Kubernetes manifests as an artifact. The Docker stage builds the image once and pushes it to ACR with the build ID as tag, and it is skipped for pull requests. DeployDev uses a deployment job targeting the `demo-dev` environment and the KubernetesManifest task to deploy that exact image tag. DeployProd depends on Dev, runs only from the main branch, and targets the `demo-prod` environment, which has approvals and checks configured. So the same tested image is promoted from Dev to Prod."',
    ],
    deeper: [
      'Pushing a mutable `latest` tag alongside the build ID is convenient but never deploy `latest`; deploy by the immutable build tag (or digest) so Dev and Prod run the exact same bits.',
      'Prefer workload identity federation for the Azure and ACR service connections instead of secrets that expire.',
    ],
    followUps: [
      'How would you split this into reusable templates for several microservices?',
      'How would you add a security scan gate before the image is pushed?',
      'How would you roll back Prod if the new release fails?',
    ],
    code: [
      {
        title: 'Stage flow',
        language: 'text',
        code: `Build (Maven + tests) --> Docker (build + push to ACR) --> DeployDev --> DeployProd (approval)`,
      },
      {
        title: 'azure-pipelines.yml',
        language: 'yaml',
        code: `trigger:
  branches:
    include:
      - main

pr:
  - main

variables:
  imageRepository: demo-api
  containerRegistry: demoacr.azurecr.io
  tag: $(Build.BuildId)
  vmImage: ubuntu-latest

stages:
  # ---------- Stage 1: Build & Test ----------
  - stage: Build
    displayName: Build and test
    jobs:
      - job: Build
        pool: { vmImage: $(vmImage) }
        steps:
          - task: Maven@4
            displayName: Maven package + unit tests
            inputs:
              mavenPomFile: pom.xml
              goals: clean package
              publishJUnitResults: true
              testResultsFiles: "**/surefire-reports/TEST-*.xml"
              javaHomeOption: JDKVersion
              jdkVersionOption: "1.17"

          - publish: k8s
            artifact: manifests
            displayName: Publish K8s manifests

  # ---------- Stage 2: Docker build & push ----------
  - stage: Docker
    displayName: Build and push image
    dependsOn: Build
    condition: and(succeeded(), ne(variables['Build.Reason'], 'PullRequest'))
    jobs:
      - job: Docker
        pool: { vmImage: $(vmImage) }
        steps:
          - task: Docker@2
            displayName: Build and push
            inputs:
              command: buildAndPush
              containerRegistry: sc-acr-demo
              repository: $(imageRepository)
              dockerfile: Dockerfile
              tags: |
                $(tag)
                latest

  # ---------- Stage 3: Deploy to Dev ----------
  - stage: DeployDev
    displayName: Deploy to Dev
    dependsOn: Docker
    jobs:
      - deployment: DeployDev
        environment: demo-dev
        pool: { vmImage: $(vmImage) }
        strategy:
          runOnce:
            deploy:
              steps:
                - task: KubernetesManifest@1
                  displayName: Deploy to AKS Dev
                  inputs:
                    action: deploy
                    connectionType: kubernetesServiceConnection
                    kubernetesServiceConnection: sc-aks-dev
                    namespace: demo-dev
                    manifests: |
                      $(Pipeline.Workspace)/manifests/deployment.yaml
                      $(Pipeline.Workspace)/manifests/service.yaml
                    containers: $(containerRegistry)/$(imageRepository):$(tag)

  # ---------- Stage 4: Deploy to Prod ----------
  - stage: DeployProd
    displayName: Deploy to Prod
    dependsOn: DeployDev
    condition: and(succeeded(), eq(variables['Build.SourceBranch'], 'refs/heads/main'))
    jobs:
      - deployment: DeployProd
        environment: demo-prod          # approval configured on this environment
        pool: { vmImage: $(vmImage) }
        strategy:
          runOnce:
            deploy:
              steps:
                - task: KubernetesManifest@1
                  displayName: Deploy to AKS Prod
                  inputs:
                    action: deploy
                    connectionType: kubernetesServiceConnection
                    kubernetesServiceConnection: sc-aks-prod
                    namespace: demo-prod
                    manifests: |
                      $(Pipeline.Workspace)/manifests/deployment.yaml
                      $(Pipeline.Workspace)/manifests/service.yaml
                    containers: $(containerRegistry)/$(imageRepository):$(tag)`,
      },
    ],
    tags: ['azure devops', 'multi-stage', 'yaml pipelines', 'aks', 'acr'],
  },
  {
    id: 'itv-rglb1-24',
    level: 'intermediate',
    kind: 'open',
    prompt:
      "What is needed to create a VM? If all prerequisites already exist, what is defined in the VM's resource block?",
    probing:
      'Knowing the dependency chain (RG, VNet/subnet, NSG, NIC, optional public IP, keys) and the required VM arguments (size, admin auth, NIC IDs, os_disk, image).',
    answer: [
      '**Prerequisites (dependencies)**',
      "- **Resource group**: Why it is needed: Container for all resources\n- **Virtual network + subnet**: Why it is needed: The VM's network\n- **Network security group**: Why it is needed: Firewall rules (on subnet or NIC)\n- **Public IP (optional)**: Why it is needed: Only if direct internet access is needed; prefer Bastion\n- **Network interface (NIC)**: Why it is needed: Connects the VM to the subnet; **mandatory**\n- **SSH key / password (in Key Vault)**: Why it is needed: Admin login\n- **Optional**: Why it is needed: Availability zone/set, managed identity, data disks, boot diagnostics storage, Log Analytics",
      '**What goes in the VM resource block**',
      '- **`name`, `resource_group_name`, `location`**: Example: `vm-demo`, `rg-demo`, `eastus`\n- **`size`**: Example: `Standard_B2s`\n- **`admin_username` + auth**: Example: `admin_ssh_key` (Linux) or `admin_password`\n- **`network_interface_ids`**: Example: ID of the existing NIC\n- **`os_disk`**: Example: caching, storage type (`Premium_LRS`), size\n- **`source_image_reference` (or `source_image_id`)**: Example: Publisher / offer / sku / version\n- **Optional**: Example: `zone`, `identity`, `custom_data` (cloud-init), `boot_diagnostics`, `tags`',
      'The OS disk is created with the VM. Data disks are separate resources: `azurerm_managed_disk` + `azurerm_virtual_machine_data_disk_attachment`.',
      '**Interview-ready answer**',
      '"To create a VM, I need a resource group, a VNet and subnet, an NSG, a network interface, optionally a public IP (I prefer Bastion instead), and SSH keys stored in Key Vault. If those already exist, the VM resource block itself only defines the VM: name, resource group, location, size, admin username with an SSH key, the existing NIC ID in `network_interface_ids`, the `os_disk` settings, and the `source_image_reference`. Optionally, I add a zone, a managed identity, cloud-init through `custom_data`, boot diagnostics, and tags. Data disks are separate resources attached to the VM."',
    ],
    followUps: [
      'How do you reference a NIC created by another team or another state file?',
      'Why does changing `admin_username` or `custom_data` force VM replacement?',
      'How would you inject secrets into cloud-init without putting them in state?',
    ],
    code: [
      {
        title: 'Dependency tree',
        language: 'text',
        code: `Resource Group
  └── VNet ── Subnet ── NSG
                 └── NIC (+ optional Public IP)
                       └── VM  (OS disk created with the VM)`,
      },
      {
        title: 'Terraform: VM with existing prerequisites',
        language: 'hcl',
        code: `data "azurerm_network_interface" "nic" {
  name                = "nic-vm-demo"
  resource_group_name = "rg-demo"
}

resource "azurerm_linux_virtual_machine" "vm" {
  name                = "vm-demo"
  resource_group_name = "rg-demo"
  location            = "eastus"
  size                = "Standard_B2s"
  zone                = "1"

  admin_username                  = "azureuser"
  disable_password_authentication = true
  admin_ssh_key {
    username   = "azureuser"
    public_key = file("~/.ssh/id_rsa.pub")
  }

  network_interface_ids = [data.azurerm_network_interface.nic.id]

  os_disk {
    name                 = "osdisk-vm-demo"
    caching              = "ReadWrite"
    storage_account_type = "Premium_LRS"
    disk_size_gb         = 64
  }

  source_image_reference {
    publisher = "Canonical"
    offer     = "ubuntu-24_04-lts"
    sku       = "server"
    version   = "latest"
  }

  identity {
    type = "SystemAssigned"
  }

  custom_data = base64encode(file("cloud-init.yaml"))

  boot_diagnostics {}              # managed storage account

  tags = {
    env   = "dev"
    owner = "platform-team"
  }
}`,
      },
      {
        title: 'Same with Azure CLI',
        language: 'bash',
        code: `az vm create -g rg-demo -n vm-demo \\
  --image Ubuntu2404 --size Standard_B2s --zone 1 \\
  --nics nic-vm-demo \\
  --admin-username azureuser --ssh-key-values ~/.ssh/id_rsa.pub \\
  --os-disk-size-gb 64 --storage-sku Premium_LRS \\
  --assign-identity`,
      },
    ],
    tags: ['azure vm', 'terraform', 'compute', 'networking'],
  },
  {
    id: 'itv-rglb1-25',
    level: 'intermediate',
    kind: 'open',
    prompt:
      'After one pipeline runs, another pipeline should run in Azure DevOps. How do you achieve it?',
    probing:
      'Pipeline resource completion triggers (source name, branch filter, trigger: none, default-branch gotcha, download of the exact run artifact), plus CLI and classic alternatives.',
    answer: [
      'The standard way is a **pipeline completion trigger**: the second (downstream) pipeline declares the first (upstream) pipeline as a **pipeline resource** with a `trigger`. When the upstream pipeline finishes successfully, Azure DevOps starts the downstream one automatically.',
      '**Options to chain pipelines**',
      '- **Pipeline resource trigger (YAML)**: How: `resources.pipelines` with `trigger` in the downstream pipeline; When to use: Recommended; separate CI and CD pipelines\n- **Classic build completion trigger**: How: Downstream pipeline > Edit > **Triggers** > Build completion; When to use: Classic (UI) pipelines\n- **Call it from the upstream pipeline**: How: `az pipelines run` or REST API in the last step; When to use: Need to pass parameters, or trigger conditionally\n- **One multi-stage pipeline**: How: Put both as stages with `dependsOn`; When to use: Same team and repo; simplest if separation is not needed',
      '**Option 1: Pipeline resource trigger (recommended).** The upstream `demo-ci` builds and publishes an artifact; the downstream `demo-cd` runs automatically after it.',
      '**Key points to remember**',
      '- `source` is the pipeline **name** as shown in Azure DevOps, not the YAML file name.\n- The downstream run fires only when the upstream run **completes successfully**. If `demo-ci` fails, `demo-cd` does not start.\n- The trigger settings are read from the downstream YAML on its **default branch**, so merge the `resources` block to `main` before testing.\n- `download: ci` gets the artifact from the exact run that triggered it, so CD deploys exactly what CI built.',
      "**Option 2: Trigger it from the upstream pipeline (CLI).** Useful when you want to pass parameters or trigger only on some condition. The project's build service account needs the **Queue builds** permission on `demo-cd` (Pipelines > demo-cd > Manage security).",
      '**Option 3: Classic UI.** Downstream pipeline > **Edit** > **...** > **Triggers** > **Build completion** > **Add** > select `demo-ci` and the branch filter.',
      '**Verify:** run `demo-ci`; after it succeeds, `demo-cd` starts automatically, and its run summary shows it was triggered by `demo-ci`.',
      '**Interview-ready answer**',
      '"I use a pipeline completion trigger. In the second pipeline, I add a `resources.pipelines` entry with the first pipeline as `source` and a `trigger` with a branch filter, and I set `trigger: none` so it does not also run on code commits. When the first pipeline completes successfully on main, Azure DevOps automatically starts the second one, and with `download` it uses the artifact from that exact run, so CD deploys exactly what CI built. If I need to pass parameters or trigger conditionally, I call `az pipelines run` from the first pipeline using the System.AccessToken. For classic pipelines, I use the build completion trigger in the Triggers tab. If both belong to the same team, a single multi-stage pipeline with `dependsOn` is often simpler."',
    ],
    followUps: [
      'Why did the downstream pipeline not trigger even though the YAML looks right?',
      'How do you trigger the downstream pipeline only after a specific upstream stage?',
      'How do you pass a value such as the image tag from CI to CD?',
    ],
    code: [
      {
        title: 'Flow',
        language: 'text',
        code: `demo-ci (build, test, publish artifact)  --completes successfully-->  demo-cd (deploy, uses demo-ci's artifact)`,
      },
      {
        title: 'Upstream pipeline demo-ci (azure-pipelines-ci.yml)',
        language: 'yaml',
        code: `trigger:
  - main

pool: { vmImage: ubuntu-latest }

steps:
  - script: mvn -B clean package
  - publish: target
    artifact: drop`,
      },
      {
        title: 'Downstream pipeline demo-cd (azure-pipelines-cd.yml)',
        language: 'yaml',
        code: `trigger: none                      # no trigger on code commits, only on demo-ci completion

resources:
  pipelines:
    - pipeline: ci                 # alias used inside this YAML
      source: demo-ci              # exact name of the upstream pipeline in Azure DevOps
      # project: OtherProject      # only if the upstream pipeline is in another project
      trigger:
        branches:
          include:
            - main                 # only when demo-ci ran on main
        # stages:                  # optional: trigger after a specific stage finishes
        #   - Build

pool: { vmImage: ubuntu-latest }

steps:
  - download: ci                   # download artifacts from the triggering demo-ci run
    artifact: drop

  - script: |
      echo "Triggered by demo-ci run: $(resources.pipeline.ci.runName)"
      echo "Run ID: $(resources.pipeline.ci.runID)"
      echo "Branch: $(resources.pipeline.ci.sourceBranch)"
      ls $(Pipeline.Workspace)/ci/drop
    displayName: Show upstream run details`,
      },
      {
        title: 'Option 2: start it from the upstream pipeline',
        language: 'yaml',
        code: `- script: |
    az pipelines run --name demo-cd --branch main \\
      --org $(System.CollectionUri) --project "$(System.TeamProject)" \\
      --parameters env=dev
  displayName: Start demo-cd
  env:
    AZURE_DEVOPS_EXT_PAT: $(System.AccessToken)`,
      },
    ],
    traps: [
      'Using the YAML file name as `source`: it must be the pipeline name shown in Azure DevOps.',
    ],
    tags: ['azure devops', 'pipeline triggers', 'resources', 'ci/cd'],
  },
]
