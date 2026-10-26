import type { InterviewQuestion } from '../../../types'

/** Cognizant round: AKS versions and autoscaling, Ingress, Helm charts and Azure Front Door. */
export const roundsCognizantAksHelmQuestions: InterviewQuestion[] = [
  {
    id: 'itv-rcog-1',
    level: 'advanced',
    kind: 'open',
    prompt: 'Have you done any automation to check deprecated versions in AKS?',
    probing:
      'Checking both the cluster version and deprecated APIs in manifests and the live cluster (Pluto, kubent), wired into the pipeline as a gate before upgrades and deployments.',
    answer: [
      '**Interview-style answer**',
      'Yes. I automate the check for deprecated Kubernetes API versions and AKS cluster versions using Azure CLI and scanning tools.',
      'In our project, we run applications on AKS and deploy them with Helm charts and Kubernetes YAML manifests. Before upgrading the cluster or deploying an application, we must make sure the Kubernetes version is supported and that our manifests do not use deprecated APIs.',
      'I automate this in three ways.',
      '**1. Check the AKS Kubernetes version:** Azure CLI shows the current cluster version and the versions you can upgrade to.',
      '**2. Check deprecated APIs in manifests and in the cluster**',
      '- **Pluto** scans Kubernetes YAML files and Helm templates for APIs that are deprecated or removed in a target Kubernetes version.\n- **kubent (Kube No Trouble)** scans the resources already running in the live cluster.',
      'For example, if a manifest uses the old `extensions/v1beta1` API for an Ingress, the scan flags it so we replace it with `networking.k8s.io/v1`.',
      '**3. Integrate it into the CI/CD pipeline:** I add this validation step to the Azure DevOps pipeline before deployment. If deprecated APIs are found, the pipeline fails or publishes a report, so the team fixes the manifests before upgrading or deploying.',
      '**The flow (pipeline validation)**',
      '1. Azure DevOps pipeline starts.\n2. Check the AKS version and available upgrades.\n3. Scan YAML and Helm manifests with Pluto.\n4. Publish a report or fail the validation.\n5. Deploy only after the validation passes.',
      'Pluto returns a non-zero exit code when it finds deprecated or removed APIs, so the step fails the pipeline automatically.',
      '**Short answer to speak in the interview**',
      '"Yes, I automate deprecated version checks in AKS using Azure CLI and tools like Pluto and kubent. Azure CLI shows the current Kubernetes version and the available upgrades. Pluto finds deprecated APIs in Kubernetes YAML files and Helm charts, and kubent checks what is already running in the cluster. I add these checks to the Azure DevOps pipeline so we catch compatibility issues before upgrading the AKS cluster or deploying the application. This prevents deployment failures during Kubernetes upgrades."',
      '**Important:** Checking the AKS cluster version alone does not find every deprecated API. You also need to scan the manifests and, where needed, the live cluster resources. AKS itself also stops an upgrade if it detects recent use of APIs that are removed in the target version.',
    ],
    followUps: [
      'What is the difference between what Pluto and kubent scan?',
      'What do you do when a third-party Helm chart still uses a removed API?',
      'How would you schedule this check so it catches problems before an AKS auto-upgrade?',
    ],
    code: [
      {
        title: 'Check AKS version and available upgrades',
        language: 'bash',
        code: `# Current Kubernetes version of the cluster
az aks show \\
  --resource-group my-rg \\
  --name my-aks \\
  --query kubernetesVersion \\
  -o tsv

# Available upgrade versions
az aks get-upgrades \\
  --resource-group my-rg \\
  --name my-aks \\
  -o table`,
      },
      {
        title: 'Scan for deprecated APIs with Pluto and kubent',
        language: 'bash',
        code: `# Scan YAML files against the target Kubernetes version
pluto detect-files -d k8s/ --target-versions k8s=v1.30.0

# Render a Helm chart and scan the output
helm template my-app ./charts/my-app | pluto detect - --target-versions k8s=v1.30.0

# Scan the live cluster
kubent`,
      },
      {
        title: 'Azure DevOps validation step',
        language: 'yaml',
        code: `- task: AzureCLI@2
  displayName: Check AKS version and deprecated APIs
  inputs:
    azureSubscription: sc-azure-dev
    scriptType: bash
    scriptLocation: inlineScript
    inlineScript: |
      az aks get-upgrades -g my-rg -n my-aks -o table
      helm template my-app ./charts/my-app | pluto detect - --target-versions k8s=v1.30.0`,
      },
    ],
    tags: ['aks', 'deprecated apis', 'pluto', 'kubent', 'azure devops'],
  },
  {
    id: 'itv-rcog-7',
    level: 'intermediate',
    kind: 'open',
    prompt: 'What is Ingress, and what is the main configuration in an Ingress?',
    probing:
      'Host and path routing, ingressClassName, backend, TLS and annotations, and the difference between the Ingress resource and the Ingress Controller.',
    answer: [
      '**1. What is Ingress in Kubernetes?**',
      'Ingress is a Kubernetes resource that manages **external HTTP and HTTPS access** to applications running inside the cluster.',
      'For example, suppose we run two applications in AKS:',
      '- **Frontend:** React application\n- **Backend:** Java Spring Boot application',
      'Instead of exposing each one separately with its own public IP, we use one Ingress to route requests to the right Kubernetes Service based on the **hostname** or **URL path**.',
      '**Important:** Ingress is only the routing configuration. An **Ingress Controller** reads those rules and actually handles the traffic. Creating an Ingress resource without a controller does nothing.',
      '**2. What are the main configurations in Ingress?**',
      '- **`ingressClassName`**: Purpose: Selects which Ingress Controller handles this Ingress; Example: `nginx`\n- **`rules`**: Purpose: Host- and path-based routing rules; Example: `/api` to the backend\n- **`host`**: Purpose: The domain name to match; Example: `app.example.com`\n- **`paths`**: Purpose: URL paths and how to match them (`pathType`); Example: `/api`, `/`\n- **`backend`**: Purpose: Target Service and port; Example: `backend-service:8080`\n- **`tls`**: Purpose: Enables HTTPS using a TLS Secret; Example: `app-tls-secret`\n- **Annotations**: Purpose: Controller-specific behavior; Example: HTTP-to-HTTPS redirect, timeouts, body size, rewrites',
      '**3. Example Ingress YAML:** this routes `/` to the frontend Service and `/api` to the backend Service.',
      '**How the example works**',
      '- **apiVersion:** `networking.k8s.io/v1` is the current Ingress API (the old `extensions/v1beta1` is removed).\n- **ingressClassName:** selects the Ingress Controller.\n- **host:** matches requests for `app.example.com`.\n- **path:** `/api` goes to the backend, `/` goes to the frontend. When several paths match, the longest one wins, so `/api/orders` goes to the backend.\n- **pathType:** `Prefix` matches the path and everything under it; `Exact` matches only that exact path.\n- **backend:** the Kubernetes Service name and port.\n- **tls:** enables HTTPS using the certificate stored in `app-tls-secret`.',
      'The Services and the TLS Secret must be in the **same namespace** as the Ingress, and a working controller must be installed.',
      '**4. What is the difference between Ingress and Ingress Controller?**',
      '- **Ingress:** the rules that say where traffic should go.\n- **Ingress Controller:** the component (a reverse proxy running in the cluster) that reads those rules and routes the traffic.',
      'For example, I write an Ingress YAML to route `/api` to my Java backend. The NGINX Ingress Controller reads that configuration and does the routing.',
      '**Common controllers in AKS**',
      '- **Application routing add-on:** a managed NGINX controller from AKS.\n- **Application Gateway Ingress Controller (AGIC)** or **Application Gateway for Containers:** uses Azure Application Gateway, with WAF support.\n- **Self-installed NGINX or Traefik** via Helm.',
      'Note: **Gateway API** is the newer Kubernetes standard that is replacing Ingress over time, and the community `ingress-nginx` project has been retired. For new AKS setups, prefer a managed option such as the application routing add-on or Application Gateway for Containers.',
      '**5. Interview answer to remember**',
      '"Ingress exposes applications running inside Kubernetes over HTTP or HTTPS through a single entry point. Its main configurations are the hostname, path-based routing rules, backend Service and port, Ingress class, TLS settings, and controller-specific annotations. For example, in my AKS project I route `/` to the React frontend and `/api` to the Java Spring Boot backend. The Ingress Controller processes these rules and forwards requests to the matching Services."',
    ],
    code: [
      {
        title: 'Ingress routing overview',
        language: 'text',
        code: `User / Browser
      |
Ingress Controller (NGINX, or Application Gateway)
      |
      |-- /      -> frontend-service -> React Pods
      |-- /api   -> backend-service  -> Java Pods`,
      },
      {
        title: 'Ingress with TLS and path routing',
        language: 'yaml',
        code: `apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: app-ingress
spec:
  ingressClassName: nginx

  tls:
    - hosts:
        - app.example.com
      secretName: app-tls-secret

  rules:
    - host: app.example.com
      http:
        paths:
          - path: /api
            pathType: Prefix
            backend:
              service:
                name: backend-service
                port:
                  number: 8080

          - path: /
            pathType: Prefix
            backend:
              service:
                name: frontend-service
                port:
                  number: 80`,
      },
      {
        title: 'Inspect Ingress objects',
        language: 'bash',
        code: `kubectl get ingress -A
kubectl describe ingress app-ingress
kubectl get ingressclass`,
      },
    ],
    tags: ['kubernetes', 'ingress', 'aks', 'tls'],
  },
  {
    id: 'itv-rcog-8',
    level: 'intermediate',
    kind: 'open',
    prompt: 'How do you autoscale in AKS? What commands do you use?',
    probing:
      'HPA for Pods versus Cluster Autoscaler for nodes, the CPU-requests prerequisite, the actual commands, and how to troubleshoot when scaling does not happen.',
    answer: [
      '**Interview-style answer:** in AKS, I use two main types of autoscaling:',
      '- **Horizontal Pod Autoscaler (HPA):** increases or decreases the number of **Pods** based on CPU, memory, or custom metrics.\n- **Cluster Autoscaler:** increases or decreases the number of **worker nodes** based on Pods that cannot be scheduled and on unused capacity.',
      'When traffic increases, HPA adds Pods. If the nodes do not have enough capacity for those Pods, Cluster Autoscaler adds more nodes.',
      '**Other autoscaling options**',
      "- **Vertical Pod Autoscaler (VPA):** recommends or adjusts a Pod's CPU and memory requests.\n- **KEDA (AKS add-on):** scales Pods on events, such as Service Bus queue length or Kafka lag, and can scale to zero.",
      '**1. Configure HPA to autoscale Pods:** the Deployment must have **CPU requests**, because HPA calculates utilization as a percentage of the request. AKS installs Metrics Server by default.',
      '`kubectl autoscale` keeps between 2 and 10 replicas and targets an average CPU usage of 70% of the requested CPU. The same HPA can be written in YAML, which is better for GitOps and Helm.',
      'If `TARGETS` shows `<unknown>`, check that Metrics Server is running (`kubectl get pods -n kube-system | grep metrics-server`) and that the Pods have CPU requests.',
      '**2. Configure Cluster Autoscaler to scale nodes:** after enabling it on an existing node pool, the pool can scale between 2 and 5 nodes, and the limits can be changed later.',
      'You can also enable it when creating the cluster with `az aks create ... --enable-cluster-autoscaler --min-count 2 --max-count 5`.',
      '**3. How do you troubleshoot autoscaling? Common problems:**',
      "- **HPA shows `<unknown>`:** no CPU requests, or Metrics Server is not working.\n- **Pods stay Pending, no new nodes:** the node pool has reached `max-count`, the subscription vCPU quota is used up, the subnet has no free IPs, or the Pod's node selector or taints do not match the pool.\n- **Nodes do not scale down:** Pods without a controller, Pods with local storage, or a strict PodDisruptionBudget block node removal.",
      '**Interview answer to remember**',
      '"In AKS, I use HPA to scale application Pods based on CPU or memory, and Cluster Autoscaler to scale worker nodes when Pods cannot be scheduled. For example, I configure HPA to keep 2 to 10 replicas at 70% CPU, and Cluster Autoscaler to scale the node pool between 2 and 5 nodes. I check the behavior with `kubectl get hpa`, `kubectl get pods`, and `kubectl get nodes`. For event-driven workloads, I use the KEDA add-on."',
      '**Key point:** HPA scales **Pods**. Cluster Autoscaler scales **nodes**. They work together but solve different problems.',
    ],
    code: [
      {
        title: 'Autoscaling flow',
        language: 'text',
        code: `Application traffic increases
  -> HPA increases Pod replicas
  -> New Pods stay Pending if nodes lack capacity
  -> Cluster Autoscaler adds worker nodes
  -> Pending Pods are scheduled on the new nodes`,
      },
      {
        title: 'Container requests and limits',
        language: 'yaml',
        code: `resources:
  requests:
    cpu: "250m"
    memory: "256Mi"
  limits:
    cpu: "500m"
    memory: "512Mi"`,
      },
      {
        title: 'Create an HPA with kubectl',
        language: 'bash',
        code: `kubectl autoscale deployment myapp \\
  --cpu-percent=70 \\
  --min=2 \\
  --max=10`,
      },
      {
        title: 'HPA in YAML',
        language: 'yaml',
        code: `apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: myapp
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: myapp
  minReplicas: 2
  maxReplicas: 10
  metrics:
    - type: Resource
      resource:
        name: cpu
        target:
          type: Utilization
          averageUtilization: 70`,
      },
      {
        title: 'Check the HPA',
        language: 'bash',
        code: `kubectl get hpa
kubectl describe hpa myapp
kubectl top pods
kubectl get pods -w`,
      },
      {
        title: 'Enable Cluster Autoscaler on a node pool',
        language: 'bash',
        code: `az aks nodepool update \\
  --resource-group my-rg \\
  --cluster-name my-aks \\
  --name nodepool1 \\
  --enable-cluster-autoscaler \\
  --min-count 2 \\
  --max-count 5`,
      },
      {
        title: 'Change the autoscaler limits',
        language: 'bash',
        code: `az aks nodepool update \\
  --resource-group my-rg \\
  --cluster-name my-aks \\
  --name nodepool1 \\
  --update-cluster-autoscaler \\
  --min-count 2 \\
  --max-count 8`,
      },
      {
        title: 'Check nodes and node pool settings',
        language: 'bash',
        code: `kubectl get nodes

az aks nodepool show \\
  --resource-group my-rg \\
  --cluster-name my-aks \\
  --name nodepool1 \\
  --query "{count:count, autoscaling:enableAutoScaling, min:minCount, max:maxCount}" \\
  -o table`,
      },
      {
        title: 'Troubleshooting commands',
        language: 'bash',
        code: `kubectl get hpa
kubectl describe hpa myapp
kubectl get pods
kubectl describe pod <pending-pod>
kubectl get nodes
kubectl get events --sort-by=.lastTimestamp`,
        placeholders: ['<pending-pod>'],
      },
    ],
    tags: ['aks', 'hpa', 'cluster autoscaler', 'keda', 'autoscaling'],
  },
  {
    id: 'itv-rcog-11',
    level: 'advanced',
    kind: 'open',
    prompt: 'How do you automate version upgrades in AKS?',
    probing:
      'Pre-checks, one minor version at a time, surge and PDBs, an approval-gated pipeline, auto-upgrade channels with maintenance windows, and the fact that a control plane upgrade cannot be rolled back.',
    answer: [
      '**Interview-style answer**',
      "I automate AKS Kubernetes upgrades with Azure CLI inside Azure DevOps pipelines, and I also use AKS's built-in auto-upgrade with planned maintenance windows. Before upgrading, I check the current version, the available upgrades, deprecated APIs, and application compatibility.",
      '**An AKS upgrade has two parts**',
      '- **Control plane upgrade:** upgrades the Kubernetes API server and other managed components.\n- **Node pool upgrade:** upgrades the worker nodes where application Pods run.',
      'For production, I use a controlled pipeline with validation, approval, upgrade, and post-upgrade health checks, not a blind automatic upgrade.',
      '**1. Check the current and available versions:** choose a supported target version. AKS upgrades one **minor** version at a time (for example 1.29 to 1.30, then 1.30 to 1.31). You cannot skip minor versions.',
      '**2. Configure the upgrade strategy:** set node surge to reduce disruption. `--max-surge` tells AKS how many extra nodes to add during the upgrade (a number like `1` or a percentage). More surge means a faster upgrade but needs more VM quota and subnet IPs.',
      '**Before upgrading, check**',
      '- **PodDisruptionBudgets:** too strict a PDB (for example `maxUnavailable: 0`) blocks node drain.\n- **Readiness probes** and at least 2 replicas for important apps.\n- **Spare capacity:** VM quota and free IPs for surge nodes.\n- **Deprecated APIs:** scan with Pluto or kubent (see Q1).',
      '**3. Upgrade AKS using Azure CLI:** phased upgrades let you upgrade a system pool or a less critical pool first and check it before the rest.',
      '**4. Built-in AKS auto-upgrade:** AKS can upgrade itself on a schedule. A common pattern: `patch` auto-upgrade for safe patch versions in a maintenance window, and a pipeline with approval for **minor** version upgrades.',
      '**5. Automate it in Azure DevOps:** the pipeline uses an Azure Resource Manager service connection with permission to upgrade the cluster.',
      'Configure an **approval check** on the `production-aks` environment so the upgrade stage waits for sign-off. Upgrade **dev first, then QA, then prod**, with time between them to catch problems.',
      '**6. Validate after the upgrade:** then check application health with readiness checks, service endpoints, monitoring dashboards, and smoke tests.',
      'If validation fails, stop further upgrades and investigate. **You cannot roll back an AKS control plane to an older version**, so the safe recovery plan is testing in lower environments first, backups (for example Velero or Azure Backup for AKS), and, for critical systems, a blue-green cluster upgrade (build a new cluster on the new version and switch traffic).',
      '**Interview answer to remember**',
      '"I automate AKS upgrades with Azure DevOps pipelines and Azure CLI. First I check the current version and available upgrades, scan for deprecated APIs, and check PodDisruptionBudgets and node pool surge capacity. After approval on the production environment, the pipeline upgrades the control plane and node pools, one minor version at a time. Then it validates node and Pod health and runs smoke tests. For patch versions and node OS images, I use AKS auto-upgrade channels with a planned maintenance window. I always go dev, then QA, then prod, because a control plane upgrade cannot be rolled back."',
    ],
    followUps: [
      'What would you do if a node drain hangs because of a PodDisruptionBudget?',
      'When would you choose a blue-green cluster upgrade over an in-place upgrade?',
      'What is the difference between the auto-upgrade channel and the node OS upgrade channel?',
    ],
    code: [
      {
        title: 'Automation flow',
        language: 'text',
        code: `Scheduled or manual Azure DevOps pipeline
  -> Check available AKS versions and deprecated APIs
  -> Validate workloads, PDBs, and node pool surge settings
  -> Production approval
  -> Upgrade control plane, then node pools
  -> Validate nodes, Pods, Services, and application health`,
      },
      {
        title: 'Check current and available versions',
        language: 'bash',
        code: `# Current version
az aks show \\
  --resource-group my-rg \\
  --name my-aks \\
  --query kubernetesVersion \\
  -o tsv

# Available upgrade versions
az aks get-upgrades \\
  --resource-group my-rg \\
  --name my-aks \\
  -o table`,
      },
      {
        title: 'Set node surge',
        language: 'bash',
        code: `az aks nodepool update \\
  --resource-group my-rg \\
  --cluster-name my-aks \\
  --name nodepool1 \\
  --max-surge 33%`,
      },
      {
        title: 'Upgrade in one go or in phases',
        language: 'bash',
        code: `# Upgrade control plane and all node pools
az aks upgrade \\
  --resource-group my-rg \\
  --name my-aks \\
  --kubernetes-version <target-version> \\
  --yes

# Or upgrade in phases: control plane first...
az aks upgrade -g my-rg -n my-aks --kubernetes-version <target-version> --control-plane-only --yes

# ...then each node pool
az aks nodepool upgrade -g my-rg --cluster-name my-aks -n nodepool1 --kubernetes-version <target-version> --yes`,
        placeholders: ['<target-version>'],
      },
      {
        title: 'Auto-upgrade channels and maintenance window',
        language: 'bash',
        code: `# Auto-upgrade channel: none | patch | stable | rapid | node-image
az aks update -g my-rg -n my-aks --auto-upgrade-channel patch

# Node OS security updates
az aks update -g my-rg -n my-aks --node-os-upgrade-channel NodeImage

# Planned maintenance window: Sundays 00:00-04:00
az aks maintenanceconfiguration add \\
  -g my-rg --cluster-name my-aks \\
  --name aksManagedAutoUpgradeSchedule \\
  --schedule-type Weekly --day-of-week Sunday \\
  --interval-weeks 1 --start-time 00:00 --duration 4`,
      },
      {
        title: 'Azure DevOps upgrade pipeline',
        language: 'yaml',
        code: `trigger: none

parameters:
  - name: targetVersion
    type: string

stages:
  - stage: Validate
    jobs:
      - job: CheckAKS
        pool:
          vmImage: ubuntu-latest
        steps:
          - task: AzureCLI@2
            displayName: Check available AKS upgrades
            inputs:
              azureSubscription: 'azure-service-connection'
              scriptType: bash
              scriptLocation: inlineScript
              inlineScript: |
                set -euo pipefail
                az aks show -g my-rg -n my-aks --query kubernetesVersion -o tsv
                az aks get-upgrades -g my-rg -n my-aks -o table

                # Fail if the target version is not an allowed upgrade
                az aks get-upgrades -g my-rg -n my-aks \\
                  --query "controlPlaneProfile.upgrades[].kubernetesVersion" -o tsv \\
                  | grep -qx '\${{ parameters.targetVersion }}' \\
                  || { echo "Target version not allowed"; exit 1; }

  - stage: Upgrade
    dependsOn: Validate
    jobs:
      - deployment: UpgradeAKS
        environment: 'production-aks'   # approval check configured here
        pool:
          vmImage: ubuntu-latest
        strategy:
          runOnce:
            deploy:
              steps:
                - task: AzureCLI@2
                  displayName: Upgrade AKS
                  inputs:
                    azureSubscription: 'azure-service-connection'
                    scriptType: bash
                    scriptLocation: inlineScript
                    inlineScript: |
                      set -euo pipefail
                      az aks upgrade \\
                        --resource-group my-rg \\
                        --name my-aks \\
                        --kubernetes-version '\${{ parameters.targetVersion }}' \\
                        --yes`,
      },
      {
        title: 'Validate after the upgrade',
        language: 'bash',
        code: `kubectl get nodes
kubectl get pods -A
kubectl get deployments -A
kubectl get events -A --sort-by=.lastTimestamp`,
      },
    ],
    tags: ['aks', 'kubernetes upgrade', 'azure devops', 'maintenance window'],
  },
  {
    id: 'itv-rcog-13',
    level: 'intermediate',
    kind: 'open',
    prompt: 'What is the use of `.tpl` and helper files (`_helpers.tpl`) in Helm?',
    probing:
      'Named templates with define and include, why underscore files are not rendered, include versus template, and the separate tpl function.',
    answer: [
      'In Helm, `_helpers.tpl` is used to define **reusable named templates** (small functions), which you call from your Kubernetes YAML templates.',
      "**1. What is `_helpers.tpl`?** It is a file in the chart's `templates/` folder. It usually defines:",
      '- Application name\n- Full resource name\n- Common labels\n- Selector labels\n- Service account name',
      '**Main benefit:** define it once and reuse it everywhere, instead of repeating the same code in every YAML file.',
      '**2. Example Helm chart structure**',
      '**Step 1: Define helpers in `_helpers.tpl`.** `trunc 63` is used because Kubernetes names and labels have a 63-character limit.',
      '**Step 2: Use them in `deployment.yaml`.** `{{ include "myapp.fullname" . }}` calls the helper and inserts its output. If the release is `dev` and the chart is `myapp`, the name becomes `dev-myapp`. `nindent 4` adds a new line and indents the labels correctly.',
      '**Check the output before installing** with `helm template` and `helm lint`.',
      '**3. Files in a chart**',
      '- **`_helpers.tpl`**: Reusable named templates (helpers)\n- **Other `_*.tpl` files**: More reusable template logic, split by topic\n- **`deployment.yaml`**: The Kubernetes Deployment\n- **`service.yaml`**: The Kubernetes Service\n- **`values.yaml`**: Configurable values such as replicas, image, and ports\n- **`Chart.yaml`**: Chart name, version, and appVersion',
      '**Important:** the `.tpl` extension itself does not make a helper. The `define` and `include` functions give the reusable behavior. Files starting with `_` are **partials**: Helm does not render them as Kubernetes manifests.',
      '**4. `include` vs `template`, and the `tpl` function**',
      '- **`include`** returns the output as a string, so you can pipe it, for example `| nindent 4`. Prefer it.\n- **`template`** inserts the output directly and cannot be piped.\n- **`tpl`** is a different thing: a function that renders a **string from `values.yaml` as a template**. Example: `{{ tpl .Values.configTemplate . }}` lets a value contain `{{ .Release.Name }}`.',
      '**5. Interview-ready answer**',
      '"In Helm, we use `_helpers.tpl` to define reusable named templates for things like the full resource name, common labels, and selector labels. We call them from `deployment.yaml`, `service.yaml`, and other templates with the `include` function. Files starting with an underscore are not rendered as manifests. This removes duplicate code, keeps names and labels consistent across all resources, and makes charts easier to maintain."',
    ],
    code: [
      {
        title: 'Chart structure',
        language: 'text',
        code: `myapp/
├── Chart.yaml
├── values.yaml
└── templates/
    ├── deployment.yaml
    ├── service.yaml
    └── _helpers.tpl`,
      },
      {
        title: 'Step 1: templates/_helpers.tpl',
        language: 'yaml',
        code: `{{- define "myapp.fullname" -}}
{{- printf "%s-%s" .Release.Name .Chart.Name | trunc 63 | trimSuffix "-" -}}
{{- end -}}

{{- define "myapp.labels" -}}
app.kubernetes.io/name: {{ .Chart.Name }}
app.kubernetes.io/instance: {{ .Release.Name }}
app.kubernetes.io/version: {{ .Chart.AppVersion | quote }}
{{- end -}}`,
      },
      {
        title: 'Step 2: templates/deployment.yaml using the helpers',
        language: 'yaml',
        code: `apiVersion: apps/v1
kind: Deployment
metadata:
  name: {{ include "myapp.fullname" . }}
  labels:
    {{- include "myapp.labels" . | nindent 4 }}
spec:
  replicas: {{ .Values.replicaCount }}
  selector:
    matchLabels:
      app: {{ include "myapp.fullname" . }}
  template:
    metadata:
      labels:
        app: {{ include "myapp.fullname" . }}`,
      },
      {
        title: 'Check the rendered output',
        language: 'bash',
        code: `helm template dev ./myapp
helm lint ./myapp`,
      },
    ],
    tags: ['helm', 'helpers', 'named templates'],
  },
  {
    id: 'itv-rcog-14',
    level: 'basic',
    kind: 'open',
    prompt: 'What is the use of `NOTES.txt` in Helm?',
    probing:
      'That NOTES.txt is a templated post-install message, how to view it again, and that Helm never executes the commands in it.',
    answer: [
      "In Helm, `NOTES.txt` shows important information and instructions to the user **after a chart is installed or upgraded**. It lives in the chart's `templates/` folder.",
      '**1. Example Helm chart structure**',
      '**2. Example `NOTES.txt`:** suppose the application runs in AKS behind a Kubernetes Service.',
      'Install the chart with `helm install myapp ./myapp`. Helm prints the rendered `NOTES.txt` at the end of the output.',
      'Because `NOTES.txt` is a template, it can use values, release information, helpers, and `if` conditions, as in the example above.',
      'To see the notes again later, use `helm status myapp` or `helm get notes myapp`.',
      '**3. Difference between `_helpers.tpl` and `NOTES.txt`**',
      '- **`_helpers.tpl`**: Defines reusable named templates (helpers)\n- **`NOTES.txt`**: Shows post-install or post-upgrade instructions to the user\n- **`deployment.yaml`**: Defines the Kubernetes Deployment\n- **`values.yaml`**: Stores configurable chart values',
      "**Important:** `NOTES.txt` is only information. Helm does **not** run the commands written in it, and it does not create any Kubernetes resource. Only the parent chart's `NOTES.txt` is shown; notes from subcharts are not printed.",
      '**Interview-ready answer**',
      '"In Helm, `NOTES.txt` displays post-install or post-upgrade information, such as how to access the application, how to check Pods and Services, or the application URL. It is a template, so it can use values and release details like the namespace and release name. Helm only prints it; the commands in it are not executed. We can view it again with `helm status` or `helm get notes`."',
    ],
    code: [
      {
        title: 'Chart structure with NOTES.txt',
        language: 'text',
        code: `myapp/
├── Chart.yaml
├── values.yaml
└── templates/
    ├── deployment.yaml
    ├── service.yaml
    ├── _helpers.tpl
    └── NOTES.txt`,
      },
      {
        title: 'templates/NOTES.txt',
        language: 'text',
        code: `{{ .Chart.Name }} was deployed as release "{{ .Release.Name }}" in namespace "{{ .Release.Namespace }}".

Check your application pods:
  kubectl get pods -n {{ .Release.Namespace }}

Check your services:
  kubectl get svc -n {{ .Release.Namespace }}

To access the application locally:
  kubectl port-forward svc/{{ include "myapp.fullname" . }} 8080:{{ .Values.service.port }} -n {{ .Release.Namespace }}
{{- if .Values.ingress.enabled }}

Application URL: https://{{ .Values.ingress.host }}
{{- end }}`,
      },
      {
        title: 'Install the chart',
        language: 'bash',
        code: `helm install myapp ./myapp`,
      },
      {
        title: 'Output printed by Helm',
        language: 'text',
        code: `NAME: myapp
STATUS: deployed
REVISION: 1
NOTES:
myapp was deployed as release "myapp" in namespace "default".

Check your application pods:
  kubectl get pods -n default
...`,
      },
      {
        title: 'Show the notes again',
        language: 'bash',
        code: `helm status myapp
helm get notes myapp`,
      },
    ],
    tags: ['helm', 'notes.txt'],
  },
  {
    id: 'itv-rcog-15',
    level: 'basic',
    kind: 'open',
    prompt: 'If you want to use `dev-config.yaml`, how will you deploy it using Helm?',
    probing:
      'Passing a values file with -f, using upgrade --install with --wait and --atomic, and knowing the values precedence order.',
    answer: [
      'To deploy with `dev-config.yaml`, I pass it with the `-f` (or `--values`) option during install or upgrade.',
      '**1. Example folder structure**',
      '**2. Deploy using Helm**',
      '- `myapp`: the Helm release name.\n- `./myapp`: the chart folder.\n- `-f dev-config.yaml`: the development values.\n- `--wait`: waits until the Pods are ready.\n- `--atomic`: rolls back automatically if the upgrade fails.',
      '**3. Example `dev-config.yaml`:** the chart templates must reference these values (for example `{{ .Values.replicaCount }}`) for them to change anything.',
      '**4. How values are merged:** Helm combines values in this order; later ones win:',
      "1. The chart's own `values.yaml` (defaults)\n2. Each `-f` file, in the order given\n3. `--set` values on the command line",
      'With `--set image.tag=v2`, `image.tag` becomes `v2` even though `dev-config.yaml` says `v1`.',
      '**5. Check before and after deploying**',
      '**Interview-ready answer**',
      '"To deploy with the development configuration, I run `helm install myapp ./myapp -f dev-config.yaml`, or `helm upgrade myapp ./myapp -f dev-config.yaml` if the release already exists. In pipelines I use `helm upgrade --install` with `--wait` and `--atomic`. Values in the `-f` file override the chart\'s default `values.yaml`, and `--set` overrides both. This lets me keep separate configuration files for Dev, QA, UAT, and Production without changing the chart."',
      '**Note:** `dev-config.yaml` is a **values file**, not something Helm executes. Helm reads its values and uses them to render the chart templates.',
    ],
    code: [
      {
        title: 'Folder structure',
        language: 'text',
        code: `myapp/
├── Chart.yaml
├── values.yaml
└── templates/
    ├── deployment.yaml
    └── service.yaml

dev-config.yaml`,
      },
      {
        title: 'Install or upgrade with dev-config.yaml',
        language: 'bash',
        code: `# New deployment
helm install myapp ./myapp -f dev-config.yaml

# Existing deployment
helm upgrade myapp ./myapp -f dev-config.yaml

# One command for both (common in pipelines)
helm upgrade --install myapp ./myapp \\
  -f dev-config.yaml \\
  --namespace dev --create-namespace \\
  --wait --atomic`,
      },
      {
        title: 'dev-config.yaml',
        language: 'yaml',
        code: `replicaCount: 2

image:
  repository: myregistry.azurecr.io/myapp
  tag: "v1"

service:
  type: ClusterIP
  port: 80`,
      },
      {
        title: 'Override one value with --set',
        language: 'bash',
        code: `helm upgrade --install myapp ./myapp \\
  -f dev-config.yaml \\
  --set image.tag=v2`,
      },
      {
        title: 'Check before and after deploying',
        language: 'bash',
        code: `# Preview the rendered YAML without deploying
helm template myapp ./myapp -f dev-config.yaml

# After deploying
helm list -n dev
helm get values myapp -n dev
kubectl get pods -n dev
kubectl get svc -n dev`,
      },
    ],
    tags: ['helm', 'values files', 'deployment'],
  },
  {
    id: 'itv-rcog-16',
    level: 'advanced',
    kind: 'scenario',
    prompt:
      'If you have multiple environments, how do you write the templates so that only one environment is deployed?',
    probing:
      'One chart with per-environment values files, feature flags with if blocks for environment-only resources, required() to fail fast, and separate releases and namespaces.',
    answer: [
      "With Dev, QA, UAT, and Prod, I keep **one chart** and **one values file per environment**, and pass only the required environment's file during deployment. The templates stay the same; only the values change. I do not write separate templates for each environment.",
      '**1. Folder structure**',
      '**2. Configure each environment:** `values-dev.yaml` and `values-prod.yaml` set the environment name, replicas, image tag and autoscaling.',
      '**3. Use the values in the templates:** `templates/deployment.yaml` reads them. `replicas` is skipped when HPA is enabled, so Helm and HPA do not fight over the replica count.',
      '**4. Create a resource only in some environments:** use an `if` condition around the whole file, as in `templates/hpa.yaml`.',
      'With `values-dev.yaml`, no HPA is created. With `values-prod.yaml`, it is. Prefer **feature flags** like `autoscaling.enabled` over `if eq .Values.environment "prod"`, because flags keep the templates simple and let you turn a feature on in QA without changing the chart.',
      '**5. Use `_helpers.tpl` for common logic:** the helper reads the environment from the selected values file. `required` makes the deployment **fail** with a clear message if someone forgets to pass an environment file.',
      "**6. Deploy only one environment:** each command deploys only that environment's configuration. Separate release names and namespaces keep the environments isolated. The chart's `values.yaml` still applies as the base, and the environment file overrides it.",
      'In a pipeline, the environment is a parameter, so the same step deploys any environment.',
      '**Interview-ready answer**',
      '"I keep one Helm chart and separate values files for Dev, QA, UAT, and Production. I deploy one environment by passing only its values file with `-f`, using a separate release name and namespace per environment. The templates read values for replicas, image tags, and settings. For resources needed only in some environments, such as an HPA in production, I wrap the template in an `if` on a flag like `autoscaling.enabled`. I use `_helpers.tpl` for shared logic, for example a helper that uses `required` so the deployment fails if no environment is passed."',
    ],
    followUps: [
      'How would you keep production secrets out of values-prod.yaml?',
      'Why prefer a feature flag over checking the environment name inside a template?',
      'How would you promote the same image tag from dev to prod without editing the chart?',
    ],
    code: [
      {
        title: 'Chart with one values file per environment',
        language: 'text',
        code: `myapp/
├── Chart.yaml
├── values.yaml          # common defaults
├── values-dev.yaml
├── values-qa.yaml
├── values-uat.yaml
├── values-prod.yaml
└── templates/
    ├── deployment.yaml
    ├── service.yaml
    ├── hpa.yaml
    └── _helpers.tpl`,
      },
      {
        title: 'values-dev.yaml',
        language: 'yaml',
        code: `environment: dev
replicaCount: 1
image:
  tag: "dev"
autoscaling:
  enabled: false`,
      },
      {
        title: 'values-prod.yaml',
        language: 'yaml',
        code: `environment: prod
replicaCount: 3
image:
  tag: "v1.0.0"
autoscaling:
  enabled: true
  minReplicas: 3
  maxReplicas: 10`,
      },
      {
        title: 'templates/deployment.yaml',
        language: 'yaml',
        code: `apiVersion: apps/v1
kind: Deployment
metadata:
  name: {{ include "myapp.fullname" . }}
  labels:
    environment: {{ include "myapp.environment" . | quote }}
spec:
  {{- if not .Values.autoscaling.enabled }}
  replicas: {{ .Values.replicaCount }}
  {{- end }}
  selector:
    matchLabels:
      app: {{ include "myapp.fullname" . }}
  template:
    metadata:
      labels:
        app: {{ include "myapp.fullname" . }}
    spec:
      containers:
        - name: myapp
          image: "myregistry.azurecr.io/myapp:{{ .Values.image.tag }}"`,
      },
      {
        title: 'templates/hpa.yaml created only when enabled',
        language: 'yaml',
        code: `{{- if .Values.autoscaling.enabled }}
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: {{ include "myapp.fullname" . }}
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: {{ include "myapp.fullname" . }}
  minReplicas: {{ .Values.autoscaling.minReplicas }}
  maxReplicas: {{ .Values.autoscaling.maxReplicas }}
  metrics:
    - type: Resource
      resource:
        name: cpu
        target:
          type: Utilization
          averageUtilization: 70
{{- end }}`,
      },
      {
        title: '_helpers.tpl: require an environment',
        language: 'yaml',
        code: `{{- define "myapp.environment" -}}
{{- required "environment is required: pass -f values-<env>.yaml" .Values.environment -}}
{{- end -}}`,
      },
      {
        title: 'Deploy one environment at a time',
        language: 'bash',
        code: `# Dev
helm upgrade --install myapp-dev ./myapp \\
  -f ./myapp/values-dev.yaml \\
  --namespace dev --create-namespace

# QA
helm upgrade --install myapp-qa ./myapp \\
  -f ./myapp/values-qa.yaml \\
  --namespace qa --create-namespace

# Production
helm upgrade --install myapp-prod ./myapp \\
  -f ./myapp/values-prod.yaml \\
  --namespace prod --create-namespace`,
      },
      {
        title: 'Parameterised pipeline step',
        language: 'bash',
        code: `helm upgrade --install "myapp-\${ENV}" ./myapp \\
  -f "./myapp/values-\${ENV}.yaml" \\
  --namespace "\${ENV}" --create-namespace --wait --atomic`,
      },
    ],
    tags: ['helm', 'environments', 'values files', 'helpers'],
  },
  {
    id: 'itv-rcog-17',
    level: 'advanced',
    kind: 'open',
    prompt: 'What do you know about Azure Front Door?',
    probing:
      'Front Door as a global Layer 7 entry point with probes, routing methods, WAF and caching, how it differs from Traffic Manager, Application Gateway and Load Balancer, and that it only fails over traffic, not data.',
    answer: [
      '**Interview answer (Azure Front Door)**',
      'Azure Front Door is a **global Layer 7 (HTTP/HTTPS) load balancer and CDN** from Microsoft Azure. It improves performance, availability, and security by sending each user request to the best available backend across regions.',
      'In simple words: if your application runs in several Azure regions, Front Door gives users **one global entry point** and sends them to a healthy region close to them.',
      '**1. How does Azure Front Door work?** Example: the application runs in **East US** and **West Europe**.',
      '**Request flow through Front Door**',
      "1. The user opens the application through the Front Door URL or a custom domain.\n2. Front Door receives the request at the nearest Microsoft edge location.\n3. It checks routing rules, origin health, and the routing method.\n4. It forwards the request to a suitable healthy origin over Microsoft's network.\n5. If a region becomes unhealthy, the health probes detect it and Front Door sends traffic to another healthy region.",
      '**2. Key features of Front Door**',
      '- **Global load balancing**: Routes requests across origins in different regions\n- **Routing methods**: Latency (closest), priority (active-passive), weighted (for example 90/10), session affinity\n- **Health probes**: Check origin health and route away from unhealthy origins\n- **WAF (Web Application Firewall)**: Blocks attacks such as SQL injection and cross-site scripting; rate limiting and geo-filtering\n- **TLS termination**: Handles HTTPS at the edge, with free managed certificates for custom domains; use HTTPS to the origin too\n- **Caching (CDN)**: Caches static content close to users to reduce latency and origin load\n- **URL-based routing**: For example `/api/*` to the API origin and `/images/*` to a storage origin\n- **Rules engine**: Redirects, header changes, URL rewrites\n- **Private Link origins (Premium)**: Connects to origins privately, so they need no public endpoint',
      '**Tiers:** **Standard** (CDN, routing, basic WAF custom rules) and **Premium** (adds managed WAF rule sets, bot protection, and Private Link origins). The older **Front Door (classic)** tier is being retired; new setups should use Standard or Premium.',
      '**3. Front Door vs Application Gateway vs Load Balancer vs Traffic Manager**',
      '- **Azure Front Door**: Scope: Global; Layer: Layer 7; Main use: Global HTTP/S routing, acceleration, caching, WAF, failover\n- **Traffic Manager**: Scope: Global; Layer: DNS; Main use: DNS-based routing for any protocol; does not proxy traffic\n- **Application Gateway**: Scope: Regional; Layer: Layer 7; Main use: Regional HTTP/S routing, TLS termination, WAF, AKS ingress\n- **Azure Load Balancer**: Scope: Regional; Layer: Layer 4; Main use: TCP/UDP load balancing',
      '**In an AKS architecture**',
      '- **Front Door:** sends global users to the right regional application.\n- **Application Gateway or an ingress controller:** routes HTTP/S traffic inside the region to the AKS Services.\n- **Load Balancer:** distributes TCP/UDP traffic to nodes (AKS creates one for `LoadBalancer` Services).',
      'You do not always need all of them; it depends on the requirements.',
      '**4. Real-time DevOps scenario.** Interviewer: "Your application runs in East US and West Europe. East US goes down. How do you handle it?"',
      '1. Deploy the application in both regions.\n2. Create a Front Door **origin group** containing both regional endpoints.\n3. Configure **health probes** against a real health endpoint, for example `/health`.\n4. Set **priority**: East US = 1, West Europe = 2, so West Europe is the backup (or use latency routing for active-active).\n5. When East US fails its probes, Front Door sends requests to West Europe automatically.\n6. Monitor origin health, error rates, latency, and WAF logs with Azure Monitor and diagnostic logs.',
      'Front Door handles **traffic** failover only. The database, storage, secrets, and other dependencies must also be designed for disaster recovery (for example geo-replication and failover groups). Front Door alone does not make the application recover.',
      '**5. Security tip: lock the origins to Front Door.** Users could bypass Front Door (and its WAF) by calling the origin directly. To prevent this:',
      "- Allow only the `AzureFrontDoor.Backend` service tag in the origin's NSG or access restrictions, **and** check the `X-Azure-FDID` header matches your Front Door ID.\n- Or, on the Premium tier, use **Private Link** origins so the backend has no public endpoint at all.",
      '**6. When would you use Azure Front Door?**',
      '- Users access the application from many countries.\n- The application runs in multiple Azure regions.\n- You need global routing and regional failover.\n- You want one global HTTPS entry point with WAF protection.\n- You want caching to speed up static content.',
      'For a single-region internal application, Front Door is usually not needed; Application Gateway is enough.',
      '**Interview-ready answer**',
      '"Azure Front Door is a global Layer 7 load balancer and CDN in Azure. It receives HTTP and HTTPS traffic at Microsoft\'s edge locations and routes it to the best healthy backend using health probes and routing methods such as latency, priority, or weighted. It provides global load balancing, caching, TLS termination, WAF protection, and regional failover. In my architecture, I use Front Door as the global entry point for an application deployed in multiple regions, with Application Gateway or an AKS ingress controller handling traffic inside each region. I lock the origins so they accept traffic only from Front Door."',
    ],
    followUps: [
      'When would you choose Traffic Manager instead of Front Door?',
      'How do you stop users from bypassing Front Door and hitting the origin directly?',
      'Front Door fails over to West Europe, but the app still errors. What do you check next?',
    ],
    code: [
      {
        title: 'Front Door in front of two regions',
        language: 'text',
        code: `Users worldwide
      |
Azure Front Door (Microsoft edge locations)
  global routing · HTTPS · WAF · caching
      |
      |-- East US      -> AKS / App Service
      |-- West Europe  -> AKS / App Service`,
      },
      {
        title: 'Create a profile, endpoint, origin group and origin',
        language: 'bash',
        code: `az afd profile create -g rg-app --profile-name afd-app --sku Premium_AzureFrontDoor
az afd endpoint create -g rg-app --profile-name afd-app --endpoint-name app-endpoint --enabled-state Enabled
az afd origin-group create -g rg-app --profile-name afd-app --origin-group-name og-app \\
  --probe-request-type GET --probe-protocol Https --probe-path /health \\
  --probe-interval-in-seconds 30 \\
  --sample-size 4 --successful-samples-required 3 --additional-latency-in-milliseconds 50
az afd origin create -g rg-app --profile-name afd-app --origin-group-name og-app \\
  --origin-name eastus --host-name app-eastus.example.com --origin-host-header app-eastus.example.com \\
  --priority 1 --weight 1000 --enabled-state Enabled --http-port 80 --https-port 443`,
      },
    ],
    tags: ['azure front door', 'load balancing', 'waf', 'disaster recovery'],
  },
]
