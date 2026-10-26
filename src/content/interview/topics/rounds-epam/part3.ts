import type { InterviewQuestion } from '../../../types'

/** EPAM round, part 3: pipelines, AKS scaling and networking, identity, DevSecOps and Terraform. */
export const roundsEpamPart3Questions: InterviewQuestion[] = [
  {
    id: 'itv-repm3-1',
    level: 'intermediate',
    kind: 'scenario',
    prompt: 'How do you reduce pipeline deployment time?',
    probing:
      'Whether you measure first, then use caching, parallel stages, Docker layer caching and build-once promotion without dropping quality gates.',
    answer: [
      'I reduce pipeline deployment time by identifying the slow stages first, then optimizing builds, tests, Docker images, and deployments without compromising quality or security.',
      '**Practical ways to reduce pipeline time**',
      '- **Area**: Build; **What I would do**: Use dependency caching for Maven, npm, or NuGet packages.\n- **Area**: Pipeline stages; **What I would do**: Run independent tasks in parallel instead of sequentially.\n- **Area**: Docker; **What I would do**: Use multi-stage builds, smaller base images, and layer caching.\n- **Area**: Testing; **What I would do**: Run unit tests early and separate fast tests from longer integration tests.\n- **Area**: Security scans; **What I would do**: Avoid duplicate scans and scan the correct artifacts at appropriate stages.\n- **Area**: Artifacts; **What I would do**: Build the Docker image once and promote the same image across environments.\n- **Area**: Agents; **What I would do**: Use appropriately sized self-hosted agents when agent startup or resource constraints cause delays.\n- **Area**: Kubernetes; **What I would do**: Use rolling updates, readiness probes, and optimized health checks.\n- **Area**: Deployment; **What I would do**: Deploy only changed components instead of redeploying every microservice.',
      '**Example: Azure DevOps CI/CD pipeline**',
      'Suppose our pipeline takes 20 minutes to deploy a Spring Boot application to AKS. I would analyze the duration of each stage.',
      '**Before optimization:**',
      '- **Stage**: Build and dependencies; **Duration**: 6 min\n- **Stage**: Testing and code quality; **Duration**: 5 min\n- **Stage**: Docker build and push; **Duration**: 5 min\n- **Stage**: AKS deployment and validation; **Duration**: 4 min\n- **Stage**: **Total**; **Duration**: **20 min**',
      'These timings are an illustrative example, not measured results from a real pipeline.',
      '**Step-by-step optimization**',
      '**Step 1: Enable dependency caching**',
      'For Maven, cache the `.m2/repository` directory. For Node.js, cache npm dependencies. This avoids downloading the same packages on every run.',
      '**Step 2: Run independent tasks in parallel**',
      "For example, unit tests and code-quality checks can run in parallel if they do not depend on each other's output.",
      '**Step 3: Optimize the Docker build**',
      '- Use multi-stage Docker builds.\n- Copy dependency files before application source code to improve layer caching.\n- Use `.dockerignore` to exclude unnecessary files.\n- Use BuildKit caching where supported.\n- Use a smaller production runtime image.',
      '**Step 4: Optimize Kubernetes deployment**',
      '- Deploy only the services affected by the change.\n- Use rolling updates with suitable `maxSurge` and `maxUnavailable` settings.\n- Avoid unnecessary restarts and image pulls.\n- Configure readiness probes so traffic reaches pods only when they are ready.',
      '**Step 5: Measure the results**',
      'Use Azure DevOps pipeline logs and stage-duration metrics to compare execution times before and after each change. Keep security scans, required approvals, and production validation in place.',
      '**Interview answer:** "First, I analyze the Azure DevOps pipeline logs to identify which stages consume the most time. Then I optimize those stages. For example, I use dependency caching to reduce build time, run independent tests and code-quality checks in parallel, and optimize Docker images using multi-stage builds and layer caching. I also use appropriately sized build agents and avoid redeploying unchanged microservices. For AKS deployments, I use rolling updates and deploy only the affected components. I build the Docker image once, push it to Azure Container Registry, and promote the same image across environments. Finally, I compare pipeline execution times before and after the changes. I make sure these optimizations do not compromise security scanning, testing, or production stability."',
    ],
    code: [
      {
        title: 'Parallel pipeline stages',
        language: 'text',
        code: `              Build
                |
        +-------+-------+
        |               |
    Unit Tests      Code Analysis
        |               |
        +-------+-------+
                |
          Docker Build
                |
          Security Scan
                |
            Push ACR
                |
          Deploy to AKS`,
      },
    ],
    tags: ['ci/cd', 'azure devops', 'pipeline optimization', 'docker', 'caching'],
  },
  {
    id: 'itv-repm3-2',
    level: 'intermediate',
    kind: 'scenario',
    prompt: 'When do you use VPA, HPA, and Cluster Autoscaler? Give some real-time scenarios.',
    probing:
      'That you know which layer each autoscaler scales (pods, requests, nodes) and what actually triggers Cluster Autoscaler.',
    answer: [
      'In AKS/Kubernetes, I use HPA, VPA, and Cluster Autoscaler for three different purposes. HPA scales the number of pods, VPA adjusts pod resource requests, and Cluster Autoscaler scales the number of worker nodes.',
      '**Difference between HPA, VPA, and Cluster Autoscaler**',
      '- **Autoscaler**: **HPA** (Horizontal Pod Autoscaler); **What it scales**: Increases or decreases the number of replicas based on CPU, memory, or custom metrics.; **Example**: Traffic increases from 1,000 to 10,000 requests per minute. HPA scales the application from 3 pods to 10 pods.\n- **Autoscaler**: **VPA** (Vertical Pod Autoscaler); **What it scales**: Recommends or adjusts CPU and memory requests, and optionally limits, based on observed usage.; **Example**: A Java application consistently needs 1.5 GiB of memory, but its pod requests only 512 MiB. VPA helps right-size its resource requests.\n- **Autoscaler**: **Cluster Autoscaler**; **What it scales**: Adds nodes when pods cannot be scheduled due to insufficient resources and removes eligible underutilized nodes when possible.; **Example**: HPA increases replicas from 5 to 15, but the existing nodes lack capacity. Cluster Autoscaler adds worker nodes to accommodate the pending pods.',
      '**Scenario 1: HPA during a sudden traffic spike**',
      '**Situation:** We have a Spring Boot application running on AKS behind an Ingress or Application Gateway. Normally, 3 pods handle the traffic. During a sale or peak business hours, CPU utilization increases significantly.',
      '**What I do:**\n1. Configure HPA with a target CPU utilization, such as 70%.\n2. Set minimum replicas to 3 and maximum replicas to 10.\n3. HPA monitors metrics and increases the replica count when demand rises.\n4. When traffic decreases, HPA scales down gradually.',
      '**Result:** The application handles increased traffic without manually increasing replicas.',
      '**Scenario 2: VPA for a memory-hungry Java application**',
      '**Situation:** A Java microservice initially runs with a memory request of 512 MiB. Over time, monitoring shows that its typical memory requirement is much higher. The pod may be repeatedly OOMKilled if its memory limit is too low.',
      "**What I do:**\n1. Review CPU and memory usage using Azure Monitor, Prometheus, or Grafana.\n2. Deploy VPA initially in recommendation-only mode.\n3. Review its recommendations and adjust the Deployment's resource settings.\n4. If automatic VPA updates are appropriate, configure the update mode carefully and account for possible pod restarts.",
      'Here, `Off` means VPA provides recommendations without automatically changing pod resources.',
      '**Result:** Better resource sizing, fewer resource-related failures, and less wasted capacity.',
      '**Important:** VPA recommendations do not automatically fix every OOMKilled issue. If a Java application has a memory leak, I would investigate heap usage, garbage collection, and memory limits rather than simply allocating more memory.',
      '**Scenario 3: Cluster Autoscaler when nodes run out of capacity**',
      '**Situation:** Our AKS cluster has 3 worker nodes. During peak traffic, HPA increases the application from 5 pods to 15 pods. However, several pods remain in the `Pending` state because the existing nodes do not have sufficient CPU or memory.',
      '**What I do:**\n1. Check the pending pods:',
      '2. Check node capacity:',
      '3. Configure Cluster Autoscaler on the relevant AKS node pool with suitable minimum and maximum node counts.\n4. When pods cannot be scheduled because of insufficient capacity, Cluster Autoscaler can add nodes.\n5. When demand drops, it can remove eligible nodes that are no longer needed.',
      '**Result:** The cluster provides additional capacity without requiring manual node creation.',
      'Remember that Cluster Autoscaler does not scale nodes merely because CPU utilization is high. Its primary scale-up trigger is unschedulable pods, subject to node-pool limits, scheduling constraints, and available cloud capacity.',
      '**How all three work together**',
      "These components solve different problems, but there is an important caveat: HPA and VPA can conflict if both independently control CPU or memory for the same workload. For example, VPA changing CPU requests can affect HPA's CPU-utilization calculation. In practice, I usually use HPA for traffic-driven scaling and VPA recommendations for resource tuning, unless the workload and metric configuration are specifically designed to support both.",
      '**Quick comparison**\n- **Question**: Traffic suddenly increases. Need more application instances.; **Best fit**: HPA\n- **Question**: Pods consistently request too much or too little memory.; **Best fit**: VPA\n- **Question**: New pods are Pending because nodes lack capacity.; **Best fit**: Cluster Autoscaler\n- **Question**: Traffic decreases and we want fewer pods.; **Best fit**: HPA\n- **Question**: Workload demand falls and an eligible worker node can be removed.; **Best fit**: Cluster Autoscaler\n- **Question**: A Java application has a suspected memory leak.; **Best fit**: Investigate the leak; use VPA recommendations as supporting evidence',
      '**Interview answer:** "In my AKS projects, I use HPA to scale pods based on application demand, VPA to analyze and right-size pod resource requests, and Cluster Autoscaler to scale the underlying worker nodes. For example, if traffic increases, HPA adds replicas. If the cluster cannot schedule those replicas due to insufficient capacity, Cluster Autoscaler adds nodes. Separately, I use VPA recommendations to optimize CPU and memory allocation. I monitor the entire setup using Azure Monitor or Prometheus and Grafana."',
    ],
    code: [
      {
        title: 'HPA: scale on 70% CPU',
        language: 'yaml',
        code: `apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: springboot-hpa
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: springboot-app
  minReplicas: 3
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
        title: 'VPA in recommendation-only mode',
        language: 'yaml',
        code: `apiVersion: autoscaling.k8s.io/v1
kind: VerticalPodAutoscaler
metadata:
  name: springboot-vpa
spec:
  targetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: springboot-app
  updatePolicy:
    updateMode: "Off"`,
      },
      {
        title: 'Check the pending pods',
        language: 'bash',
        code: `kubectl get pods
kubectl describe pod <pod-name>`,
      },
      {
        title: 'Check node capacity',
        language: 'bash',
        code: `kubectl get nodes
kubectl top nodes`,
      },
      {
        title: 'How all three work together',
        language: 'text',
        code: `Traffic increases
      |
      v
More requests reach the application
      |
      v
HPA: increases pod replicas from 3 to 10
      |
      v
Cluster Autoscaler: adds nodes if pods cannot be scheduled

VPA (separately): helps right-size CPU and memory requests based on usage history`,
      },
    ],
    tags: ['kubernetes', 'aks', 'autoscaling', 'hpa', 'vpa', 'cluster autoscaler'],
  },
  {
    id: 'itv-repm3-3',
    level: 'advanced',
    kind: 'open',
    prompt: 'Can we use HPA and VPA together?',
    probing:
      'Why HPA utilisation depends on requests, so VPA changing requests can fight HPA, and the safe combinations.',
    answer: [
      'Yes, we can use HPA and VPA together in Kubernetes/AKS, but we need to configure them carefully because they can conflict when they both manage CPU or memory scaling for the same workload.',
      '**How they work together**',
      'Consider a Spring Boot application running on AKS:',
      '- HPA increases the number of pods when traffic increases.\n- VPA recommends or adjusts the CPU and memory requests for those pods based on observed usage.',
      'Example:\n1. Initially, we have 3 pods, each requesting 500m CPU and 512 MiB memory.\n2. Traffic increases, so HPA scales from 3 pods to 8 pods.\n3. Monitoring shows that each pod needs more memory.\n4. VPA recommends increasing the memory request to 1 GiB.',
      'This helps scale the application horizontally while improving resource allocation.',
      '**What is the conflict?**',
      "Suppose HPA scales based on CPU utilization. CPU utilization is calculated relative to the pod's CPU request:",
      '- **Value**: CPU request; **Amount**: 500m\n- **Value**: Actual CPU usage; **Amount**: 400m\n- **Value**: CPU utilization; **Amount**: 80%',
      'If HPA targets 70%, it may scale out.',
      "Now VPA increases the CPU request to 1 CPU. The same 400m usage becomes 40% utilization, so HPA may scale differently. VPA changing CPU requests can affect HPA's scaling decisions when HPA uses CPU utilization.",
      '**Recommended configurations**',
      '- **HPA metric**: CPU utilization; **VPA configuration**: VPA adjusts CPU requests; **Recommendation**: Potential conflict\n- **HPA metric**: Memory utilization; **VPA configuration**: VPA adjusts memory requests; **Recommendation**: Potential conflict\n- **HPA metric**: Custom/external metric, such as requests per second; **VPA configuration**: VPA adjusts CPU and memory requests; **Recommendation**: Often a better combination\n- **HPA metric**: CPU-based HPA; **VPA configuration**: VPA recommendation-only mode; **Recommendation**: Practical and safer starting point',
      'For a production AKS workload, I would generally:',
      '1. Configure HPA to scale replicas based on CPU or an application-level metric.\n2. Run VPA in recommendation-only mode initially.\n3. Review VPA recommendations and adjust resource requests.\n4. If both need to operate automatically, use a carefully tested configuration, preferably with HPA driven by a metric independent of the resource requests VPA changes.',
      'VPA recommendation-only mode (`updateMode: "Off"`) does not automatically change pod resources. You must apply the recommendations yourself.',
      '**Interview answer:** "Yes, we can use HPA and VPA together. HPA manages the number of pod replicas, while VPA manages pod resource requests. However, if both use CPU or memory metrics, they can interfere with each other because VPA changes the resource requests that HPA uses to calculate utilization. In production, I would commonly use HPA for horizontal scaling and VPA in recommendation-only mode for resource optimization. If automatic VPA updates are required, I would carefully choose the HPA metrics and test the combined behavior before enabling it in production."',
    ],
    followUps: [
      'How would you drive HPA from requests per second instead of CPU?',
      'What happens to running pods when VPA is in Auto or Recreate mode?',
      'How does KEDA change this picture for event-driven workloads?',
    ],
    tags: ['kubernetes', 'autoscaling', 'hpa', 'vpa'],
  },
  {
    id: 'itv-repm3-4',
    level: 'intermediate',
    kind: 'open',
    prompt: 'What is the network plugin you use in Kubernetes?',
    probing:
      'Knowledge of AKS CNI options (Overlay, pod subnet, kubenet), IP planning trade-offs and how to check what a cluster uses.',
    answer: [
      'For AKS, I explain the network plugin based on the cluster configuration. In AKS, the common options are Azure CNI Overlay, Azure CNI, and Kubenet (legacy). For Kubernetes networking generally, you may also encounter plugins such as Calico and Cilium.',
      '**Types of network plugins**',
      '- **Network plugin**: Azure CNI Overlay; **How it works**: Pods get IPs from a separate overlay CIDR, while nodes use Azure VNet IPs.; **When I use it**: AKS clusters that need scalable pod networking without allocating a VNet IP to every pod.\n- **Network plugin**: Azure CNI Pod Subnet; **How it works**: Pods receive IPs from a dedicated Azure VNet subnet.; **When I use it**: When pods need direct VNet addressability and integration with Azure networking.\n- **Network plugin**: Kubenet; **How it works**: Nodes use VNet IPs, while pod networking uses separate address space with routing.; **When I use it**: Legacy AKS clusters; generally not my first choice for new deployments.\n- **Network plugin**: Calico; **How it works**: Provides networking and Kubernetes NetworkPolicy enforcement.; **When I use it**: Clusters requiring fine-grained pod-to-pod traffic controls.\n- **Network plugin**: Cilium; **How it works**: Uses eBPF for networking, network policy, and observability.; **When I use it**: Clusters needing advanced network security and visibility.',
      '**Real-time AKS example**',
      'Suppose I have a three-tier application:',
      'For this setup, I might choose Azure CNI Overlay for pod networking. I would use Kubernetes NetworkPolicies, where supported by the selected AKS networking configuration, to restrict frontend-to-backend and backend-to-database traffic.',
      'I would also configure the appropriate Azure VNet routing, NSGs, private endpoints, and DNS for connectivity to Azure resources.',
      '**How do you check the network plugin?**',
      'To inspect the networking configuration using kubectl:',
      'The Azure CLI output is the more direct way to identify the configured AKS network plugin and network mode.',
      '**Interview answer:** "In my AKS environment, I would use Azure CNI Overlay for scalable pod networking, depending on the application requirements. It allows pods to use an overlay address range while nodes remain connected to the Azure VNet. If the requirement is direct pod IP connectivity from the VNet, I would evaluate Azure CNI Pod Subnet. I would also configure NetworkPolicies to control pod-to-pod communication and use NSGs and private endpoints for Azure network security."',
      '**Important:** Only say Azure CNI Overlay is the plugin you currently use if that matches your actual cluster configuration.',
    ],
    code: [
      {
        title: 'Three-tier application path',
        language: 'text',
        code: `Internet
   |
Application Gateway (WAF)
   |
AKS Ingress
   |
Frontend Pods
   |
Backend Pods
   |
Azure Database`,
      },
      {
        title: 'Show the AKS network profile',
        language: 'bash',
        code: `az aks show \\
  --resource-group <resource-group> \\
  --name <aks-cluster> \\
  --query networkProfile`,
      },
      {
        title: 'Inspect nodes and kube-system pods',
        language: 'bash',
        code: `kubectl get nodes -o wide
kubectl get pods -n kube-system`,
      },
    ],
    tags: ['kubernetes', 'aks', 'networking', 'cni', 'network policy'],
  },
  {
    id: 'itv-repm3-5',
    level: 'basic',
    kind: 'open',
    prompt: 'Write a sample deployment.yaml file.',
    probing:
      'Whether you can write a correct Deployment from memory with selectors, resources, probes and a rolling update strategy.',
    answer: [
      'Here is a sample Kubernetes `deployment.yaml` for a Spring Boot application running on AKS. It includes 3 replicas, resource requests and limits, health probes, and a rolling update strategy.',
      '**Explanation of important fields**',
      '- **Field**: `replicas: 3`; **Purpose**: Runs 3 application pods.\n- **Field**: `selector.matchLabels`; **Purpose**: Identifies which pods belong to the Deployment.\n- **Field**: `maxSurge: 1`; **Purpose**: Allows one extra pod during an update.\n- **Field**: `maxUnavailable: 0`; **Purpose**: Keeps existing availability during a rolling update, subject to readiness and cluster capacity.\n- **Field**: `requests`; **Purpose**: Specifies the CPU and memory used for scheduling decisions.\n- **Field**: `limits`; **Purpose**: Sets the maximum CPU and memory available to the container.\n- **Field**: `readinessProbe`; **Purpose**: Prevents traffic from reaching a pod until it is ready.\n- **Field**: `livenessProbe`; **Purpose**: Restarts the container when its liveness check repeatedly fails.',
      '**Deploy the application**',
      'Make sure the `dev` namespace exists:',
      'Check the logs if a pod fails:',
      '**Important:** Replace `myacr.azurecr.io/springboot-app:v1.0.0` with your actual ACR image. The Spring Boot application must expose the configured Actuator health endpoints, and AKS must have permission to pull the image.',
      'A Deployment does not expose the application externally by itself. You would typically create a separate Kubernetes Service and configure an Ingress or Azure Application Gateway for external access.',
    ],
    code: [
      {
        title: 'deployment.yaml for a Spring Boot app',
        language: 'yaml',
        code: `apiVersion: apps/v1
kind: Deployment
metadata:
  name: springboot-app
  namespace: dev
  labels:
    app: springboot-app

spec:
  replicas: 3

  selector:
    matchLabels:
      app: springboot-app

  strategy:
    type: RollingUpdate
    rollingUpdate:
      maxSurge: 1
      maxUnavailable: 0

  template:
    metadata:
      labels:
        app: springboot-app

    spec:
      containers:
        - name: springboot-container
          image: myacr.azurecr.io/springboot-app:v1.0.0

          ports:
            - containerPort: 8080

          resources:
            requests:
              cpu: "250m"
              memory: "512Mi"
            limits:
              cpu: "500m"
              memory: "1Gi"

          readinessProbe:
            httpGet:
              path: /actuator/health/readiness
              port: 8080
            initialDelaySeconds: 15
            periodSeconds: 10

          livenessProbe:
            httpGet:
              path: /actuator/health/liveness
              port: 8080
            initialDelaySeconds: 30
            periodSeconds: 15`,
      },
      {
        title: 'Create the dev namespace',
        language: 'bash',
        code: `kubectl create namespace dev`,
      },
      {
        title: 'Apply the manifest',
        language: 'bash',
        code: `kubectl apply -f deployment.yaml`,
      },
      {
        title: 'Verify the rollout',
        language: 'bash',
        code: `kubectl get deployments -n dev
kubectl get pods -n dev
kubectl rollout status deployment/springboot-app -n dev`,
      },
      {
        title: 'Check logs of a failing pod',
        language: 'bash',
        code: `kubectl logs <pod-name> -n dev
kubectl describe pod <pod-name> -n dev`,
      },
    ],
    tags: ['kubernetes', 'deployment', 'yaml', 'probes'],
  },
  {
    id: 'itv-repm3-6',
    level: 'advanced',
    kind: 'scenario',
    prompt: 'Out of 100% of traffic, 10% is fluctuating. How do you investigate and troubleshoot?',
    probing:
      'A structured, layer-by-layer investigation that clarifies the symptom and uses metrics and logs before changing anything.',
    answer: [
      'I would first clarify what "10% traffic fluctuation" means. It could mean a 10% drop in incoming requests, intermittent request failures, or traffic being distributed unevenly across pods. I would investigate from the entry point down to the application and database.',
      '**Troubleshooting flow**',
      '- **Layer**: 1. Application Gateway / Load Balancer; **What I check**: Incoming requests, backend health, 4xx/5xx, latency\n- **Layer**: 2. Ingress Controller; **What I check**: Routing, access logs, timeouts, and connection errors\n- **Layer**: 3. Kubernetes Service and Pods; **What I check**: Endpoints, restarts, readiness, CPU and memory\n- **Layer**: 4. Application and Database; **What I check**: Application errors, thread pools, DB latency, and connections',
      '**Step 1: Check traffic and error metrics**',
      'In Azure Monitor, Application Insights, or Prometheus/Grafana, compare the affected period with normal traffic. I check:',
      '- Request rate, and whether the drop affects all endpoints or only one.\n- HTTP 5xx and 4xx error rates.\n- Response time, especially p95 and p99 latency.\n- Application Gateway backend health.\n- Whether the fluctuation aligns with a deployment, autoscaling event, or infrastructure change.',
      'For example, if incoming traffic stays constant but successful requests decrease by 10%, I focus on failures and latency rather than assuming traffic volume has dropped.',
      '**Step 2: Check the AKS pods**',
      'I look for:\n- Pods restarting or entering `CrashLoopBackOff`.\n- Pods failing readiness probes.\n- CPU throttling or memory pressure.\n- Missing Service endpoints.\n- Uneven request distribution across replicas.',
      'If one pod receives more traffic than others, I check load-balancing behavior, keep-alive connections, session affinity, and whether all pods are healthy.',
      '**Step 3: Check logs**',
      'If a specific pod is failing:',
      'I search for timeouts, connection resets, HTTP 502/503/504 responses, application exceptions, and database connection failures. I correlate timestamps across the gateway, ingress, application, and database.',
      '**Step 4: Check autoscaling and resource limits**',
      'I verify whether HPA is scaling correctly and whether new pods are becoming ready quickly enough. I also check whether Cluster Autoscaler has enough node capacity.',
      'If pods are CPU-throttled, I review CPU requests and limits. If they are OOMKilled, I investigate memory usage and application behavior.',
      '**Step 5: Check networking and the database**',
      'If pods are healthy but requests still fail, I investigate:',
      '- Application Gateway backend health and probe configuration.\n- Ingress routing and timeout settings.\n- DNS resolution and connectivity.\n- NetworkPolicies and NSG rules, where relevant.\n- Database connection pool exhaustion, query latency, and connection limits.',
      'I avoid changing timeouts or increasing resources until metrics and logs identify a likely cause.',
      '**Example: 10% of requests fail in AKS**',
      'Suppose traffic is stable at 1,000 requests per minute, but approximately 100 requests fail intermittently.',
      'My investigation finds that one of the five application pods is repeatedly failing its readiness probe. The Kubernetes Service removes that pod from its ready endpoints while it recovers.',
      "I would:\n1. Inspect the affected pod's logs and events.\n2. Check CPU, memory, garbage collection, and application response times.\n3. Identify why the readiness probe is failing.\n4. Fix the underlying issue, such as an overloaded application or incorrect probe configuration.\n5. Verify that all replicas are ready and that the error rate returns to normal.",
      'This is only one possible cause. I would confirm it through telemetry before applying a fix.',
      '**Interview answer:** "I would first clarify whether the 10% fluctuation means a drop in traffic or a 10% request failure rate. Then I would check Azure Monitor or Grafana for request rate, latency, and HTTP errors. I would investigate Application Gateway and ingress logs first, followed by Kubernetes pod health, Service endpoints, CPU and memory utilization, and autoscaling events. Finally, I would correlate application logs with database metrics to identify the root cause. After applying the fix, I would validate the request success rate and monitor the system to ensure the issue does not recur."',
      '**Key point:** Start by identifying exactly where the 10% discrepancy appears. Do not scale pods or restart services until you have evidence of the bottleneck.',
    ],
    followUps: [
      'How would you tell a client-side drop from server-side failures?',
      'What if the failing 10% all hit the same pod or node?',
      'How would you set an alert so this is caught before users report it?',
    ],
    code: [
      {
        title: 'Check pods, deployment and events',
        language: 'bash',
        code: `kubectl get pods -n dev -o wide
kubectl get deployment -n dev
kubectl get endpointslices -n dev
kubectl top pods -n dev
kubectl get events -n dev --sort-by=.lastTimestamp`,
      },
      {
        title: 'Deployment logs (last 15 minutes)',
        language: 'bash',
        code: `kubectl logs -n dev deployment/springboot-app --since=15m`,
      },
      {
        title: 'Logs and events for one pod',
        language: 'bash',
        code: `kubectl logs <pod-name> -n dev --since=15m
kubectl describe pod <pod-name> -n dev`,
      },
      {
        title: 'Check HPA and resource usage',
        language: 'bash',
        code: `kubectl get hpa -n dev
kubectl describe hpa springboot-hpa -n dev
kubectl get nodes
kubectl describe nodes`,
      },
    ],
    tags: ['troubleshooting', 'aks', 'observability', 'application gateway', 'incident'],
  },
  {
    id: 'itv-repm3-7',
    level: 'intermediate',
    kind: 'open',
    prompt: 'How do you integrate Prometheus and Grafana with AKS?',
    probing:
      'Managed (Azure Monitor workspace plus Managed Grafana) versus self-hosted kube-prometheus-stack, and using PromQL to investigate.',
    answer: [
      'For AKS, I integrate Prometheus for collecting and querying metrics and Grafana for visualizing those metrics in dashboards. I use them to monitor pod health, CPU and memory usage, node capacity, application performance, and Kubernetes autoscaling.',
      'There are two common approaches:',
      '- **Azure Managed Prometheus + Azure Managed Grafana:** managed services with less operational overhead. This is a strong choice for production AKS.\n- **Self-hosted Prometheus + Grafana using Helm:** install and manage both inside AKS. This is useful when the team needs more control over configuration.',
      'For an Azure DevOps project, I would generally prefer the managed approach unless the project requires self-hosted monitoring.',
      'Typical metrics include CPU and memory usage, pod restarts, pending pods, node readiness, request rate, HTTP error rate, and application latency.',
      '**Method 1: Azure Managed Prometheus and Grafana**',
      'This is the approach I would recommend for most production AKS clusters. Microsoft manages the metrics backend, and Azure Managed Grafana provides dashboards.',
      '**Step 1: Enable monitoring in the Azure Portal**',
      '1. Open your AKS cluster in the Azure Portal.\n2. Navigate to **Monitor → Monitor settings**.\n3. Enable Prometheus metrics collection.\n4. Select or create an Azure Monitor workspace.\n5. Select or create an Azure Managed Grafana workspace.\n6. Enable Container Insights too if you need container logs and diagnostic data.\n7. Save the configuration.',
      '**Step 2: Configure the connection**',
      'Link Azure Managed Grafana to the Azure Monitor workspace. Ensure the Grafana managed identity has the required permission to query Prometheus metrics, such as **Monitoring Data Reader**.',
      '**Step 3: Open Grafana dashboards**',
      'Open the Grafana workspace and import or use suitable Kubernetes dashboards. You can monitor:',
      '- CPU and memory utilization per node and pod.\n- Pod restarts and unhealthy workloads.\n- Node capacity and resource pressure.\n- Application request rates and latency, if application metrics are exposed.\n- HPA scaling activity.',
      '**Method 2: Install Prometheus and Grafana using Helm**',
      'If the interviewer asks how you install them manually inside Kubernetes, use Helm.',
      '**Step 1: Add the Helm repository**',
      '**Step 2: Create a monitoring namespace**',
      '**Step 3: Install the monitoring stack**',
      'This chart installs Prometheus, Grafana, Prometheus Operator, and related Kubernetes monitoring components.',
      '**Step 4: Verify the pods**',
      'Wait until the relevant pods are ready.',
      '**Step 5: Access Grafana**',
      'For a quick test, use port forwarding:',
      'Open `http://localhost:3000` in your browser.',
      'Retrieve the initial admin password if the chart uses its default secret name:',
      "The chart's default secret and service names can change if you customize the release or values.",
      'For production, configure persistent storage where needed, authentication, restricted network access, resource requests and limits, alerting, and backup or recovery procedures. Do not expose Grafana publicly without appropriate access controls.',
      '**Example: Investigating a production issue**',
      'Suppose users report that the application is slow. In Grafana, I would check the following PromQL queries, assuming the relevant metrics are being collected.',
      '**CPU usage by pod:**',
      '**Pod memory usage:**',
      '**Container restart count:**',
      'If CPU is high, I check CPU throttling, requests, limits, and HPA behavior. If memory is increasing continuously, I investigate possible memory leaks or OOMKills. If pods look healthy but response times remain high, I check application latency, database connections, and network errors.',
      '**Interview answer:** "I have two options for integrating Prometheus and Grafana with AKS. For production, I prefer Azure Managed Prometheus with Azure Managed Grafana because it reduces the operational effort of maintaining the monitoring stack. I enable Prometheus collection on AKS, link the Azure Monitor workspace to Grafana, configure the required permissions, and use Kubernetes dashboards to monitor nodes, pods, CPU, memory, restarts, and application metrics.',
      'If the project requires self-hosted monitoring, I install the kube-prometheus-stack Helm chart in a dedicated monitoring namespace. I configure dashboards, alerts, and persistent storage, then use PromQL to investigate incidents such as high CPU, memory leaks, pod restarts, and increased latency."',
    ],
    code: [
      {
        title: 'Monitoring architecture',
        language: 'text',
        code: `AKS Cluster
(Nodes, Pods, kube-state-metrics, application metrics)
      |
      v
Prometheus
(scrapes, stores, and queries time-series metrics)
      |
      v
Grafana
(dashboards, alerts, and performance visualization)
      |
      v
DevOps team investigates incidents and capacity issues`,
      },
      {
        title: 'Step 1: Add the Helm repository',
        language: 'bash',
        code: `helm repo add prometheus-community \\
  https://prometheus-community.github.io/helm-charts

helm repo update`,
      },
      {
        title: 'Step 2: Create a monitoring namespace',
        language: 'bash',
        code: `kubectl create namespace monitoring`,
      },
      {
        title: 'Step 3: Install the monitoring stack',
        language: 'bash',
        code: `helm install monitoring \\
  prometheus-community/kube-prometheus-stack \\
  --namespace monitoring`,
      },
      {
        title: 'Step 4: Verify the pods',
        language: 'bash',
        code: `kubectl get pods -n monitoring`,
      },
      {
        title: 'For a quick test, use port forwarding',
        language: 'bash',
        code: `kubectl port-forward \\
  svc/monitoring-grafana \\
  3000:80 -n monitoring`,
      },
      {
        title: 'Get the Grafana admin password',
        language: 'bash',
        code: `kubectl get secret monitoring-grafana \\
  -n monitoring \\
  -o jsonpath="{.data.admin-password}" | base64 -d`,
      },
      {
        title: 'PromQL: CPU usage by pod',
        language: 'text',
        code: `sum by (pod) (
  rate(container_cpu_usage_seconds_total{
    namespace="prod",
    container!="",
    container!="POD"
  }[5m])
)`,
      },
      {
        title: 'PromQL: pod memory usage',
        language: 'text',
        code: `sum by (pod) (
  container_memory_working_set_bytes{
    namespace="prod",
    container!="",
    container!="POD"
  }
)`,
      },
      {
        title: 'PromQL: container restart count',
        language: 'text',
        code: `sum by (pod) (
  increase(kube_pod_container_status_restarts_total{
    namespace="prod"
  }[15m])
)`,
      },
    ],
    tags: ['monitoring', 'prometheus', 'grafana', 'aks', 'helm', 'promql'],
  },
  {
    id: 'itv-repm3-8',
    level: 'intermediate',
    kind: 'open',
    prompt:
      'What is the difference between a service principal and a managed identity? In which cases do we use them?',
    probing:
      'Credential ownership and lifecycle, system- versus user-assigned identities, and which to pick for pipelines versus Azure-hosted workloads.',
    answer: [
      "In Azure, both service principals and managed identities are used to authenticate applications, pipelines, and services so they can access Azure resources without using a user's account.",
      'The main difference is that a managed identity is an Azure-managed identity with automatically managed credentials, while a service principal can use credentials such as a client secret, certificate, or federated identity.',
      '**Difference between service principal and managed identity**',
      '- **Feature**: What is it?; **Service Principal**: An application identity in Microsoft Entra ID; **Managed Identity**: An identity managed by Azure for an Azure resource\n- **Feature**: Credential management; **Service Principal**: You may need to manage secrets or certificates, unless using federation; **Managed Identity**: Azure manages credentials automatically\n- **Feature**: Secret rotation; **Service Principal**: Required if using a secret or certificate; **Managed Identity**: No manual credential rotation\n- **Feature**: Where can it be used?; **Service Principal**: Azure DevOps, GitHub Actions, applications, automation tools; **Managed Identity**: Azure VMs, App Services, Functions, AKS workloads, and other supported Azure services\n- **Feature**: Access control; **Service Principal**: Azure RBAC and application permissions; **Managed Identity**: Azure RBAC and supported application permissions\n- **Feature**: Best use case; **Service Principal**: CI/CD pipelines and external applications; **Managed Identity**: Azure-hosted workloads accessing other Azure services',
      '**Important:** A service principal does not always require a client secret. Workload identity federation allows a service principal to authenticate without storing a long-lived secret.',
      '**When do we use a service principal?**',
      '**Real-time scenario: Azure DevOps pipeline deploying to AKS**',
      'Suppose your Azure DevOps pipeline needs to:',
      '1. Build a Docker image.\n2. Push the image to Azure Container Registry (ACR).\n3. Deploy the application to AKS.\n4. Access Azure resources using a non-human identity.',
      'I can configure an Azure Resource Manager service connection using a service principal.',
      'I assign only the required permissions, such as `AcrPush` on ACR and the appropriate deployment permissions for AKS. For authentication, I prefer workload identity federation where supported, rather than storing a client secret in the pipeline.',
      '**When I use it:** Azure DevOps pipelines, GitHub Actions, external automation, and applications that need an independent application identity.',
      '**When do we use a managed identity?**',
      '**Real-time scenario: AKS application accessing Azure Key Vault**',
      'Suppose a Spring Boot application running inside AKS needs to retrieve database credentials from Azure Key Vault. Instead of storing a service principal secret inside the pod, I configure Microsoft Entra Workload ID with a user-assigned managed identity (detailed steps in Q9).',
      'The managed identity receives the appropriate Key Vault permissions, such as the **Key Vault Secrets User** role when using Azure RBAC for secret access. The application obtains a token and accesses Key Vault without storing long-lived Azure credentials in its configuration.',
      '**When I use it:** Azure-hosted applications accessing Key Vault, Storage Accounts, Azure SQL, or other supported services.',
      '**System-assigned vs user-assigned managed identity**',
      '- **System-assigned:** its lifecycle is tied to a single Azure resource. Deleting the resource deletes its identity.\n- **User-assigned:** created as a separate Azure resource and can be assigned to multiple supported resources.',
      'For AKS workloads, a user-assigned managed identity is commonly used with Microsoft Entra Workload ID.',
      '**How do you decide which one to use?**',
      '- **Scenario**: Azure DevOps or GitHub Actions deploying infrastructure; **What to use**: A service principal with workload identity federation where supported. This avoids managing long-lived client secrets.\n- **Scenario**: Azure VM accessing Azure Storage; **What to use**: A system-assigned or user-assigned managed identity.\n- **Scenario**: AKS application accessing Key Vault; **What to use**: Microsoft Entra Workload ID with a federated Kubernetes service account and a user-assigned managed identity.\n- **Scenario**: External application outside Azure; **What to use**: A service principal with workload identity federation or certificate-based authentication when appropriate. Avoid long-lived client secrets where possible.',
      '**Interview answer:** "Both service principals and managed identities provide application authentication in Azure. A service principal is commonly used for CI/CD pipelines and external applications. For example, I can configure an Azure DevOps service connection to authenticate to Azure and deploy resources using RBAC permissions.',
      'A managed identity is preferable when an Azure-hosted workload needs to access another Azure service. For example, an AKS application can use Microsoft Entra Workload ID with a user-assigned managed identity to access Key Vault without storing credentials in the pod.',
      'In both cases, I follow the principle of least privilege. For pipelines, I prefer workload identity federation over long-lived client secrets wherever supported."',
    ],
    code: [
      {
        title: 'Pipeline auth via service principal',
        language: 'text',
        code: `Azure DevOps Pipeline
        |
        v
Service Connection
        |
        v
Service Principal
        |
        v
Azure RBAC permissions
        |
        +----> Azure Container Registry
        |
        +----> AKS / Azure resources`,
      },
      {
        title: 'Pod auth via managed identity',
        language: 'text',
        code: `Spring Boot Pod
      |
      v
Kubernetes Service Account
      |
      v
Microsoft Entra Workload ID
      |
      v
User-Assigned Managed Identity
      |
      v
Azure Key Vault`,
      },
    ],
    tags: ['azure', 'identity', 'service principal', 'managed identity', 'entra id'],
  },
  {
    id: 'itv-repm3-9',
    level: 'advanced',
    kind: 'scenario',
    prompt:
      'How do you configure Microsoft Entra Workload ID with a user-assigned managed identity? (Detailed steps)',
    probing:
      'The full trust chain: OIDC issuer, federated credential subject, ServiceAccount annotation, pod label and Key Vault RBAC.',
    answer: [
      'Scenario: a Spring Boot application running in a private or public AKS cluster needs to retrieve a database password from Azure Key Vault without storing Azure credentials inside the pod. We configure **Microsoft Entra Workload ID + a user-assigned managed identity + Azure Key Vault**.',
      '**Architecture**\n- **Component**: Spring Boot application pod; **Role**: Runs inside AKS\n- **Component**: Kubernetes ServiceAccount; **Role**: Provides the federated identity configuration\n- **Component**: Microsoft Entra Workload ID; **Role**: Exchanges a projected Kubernetes token for an Entra token\n- **Component**: User-assigned managed identity; **Role**: Has permission to read the required Key Vault secret\n- **Component**: Azure Key Vault; **Role**: Returns the authorized secret over HTTPS',
      'The important point is that you do not create or store a client secret for this workload. AKS issues a projected service account token, and Microsoft Entra ID validates it through a federated identity credential.',
      '**Prerequisites**\n- An existing AKS cluster.\n- An Azure Key Vault.\n- Azure CLI installed and logged in.\n- `kubectl` access to the AKS cluster.\n- Permission to update AKS settings, create managed identities and federated credentials, and assign Key Vault roles.',
      'The following steps use Bash, so you can run them in Azure Cloud Shell or a Linux terminal.',
      '**Step 1: Define your environment variables**',
      'Replace the sample names with your actual Azure resource names.',
      'Verify the selected subscription and resources:',
      'The resource group used for the identity can differ from the AKS resource group. For simplicity, this example places the identity in `rg-aks-dev`.',
      '**Step 2: Enable OIDC issuer and Workload ID on AKS**',
      'For an existing AKS Standard cluster:',
      'Why do we need these settings?',
      '- **OIDC issuer:** provides the identity endpoint that Microsoft Entra ID trusts when validating Kubernetes service account tokens.\n- **Workload ID:** enables the AKS integration that allows pods to exchange their tokens for Microsoft Entra tokens.',
      'Retrieve the OIDC issuer URL:',
      "The result should be a URL for your AKS cluster's OIDC issuer.",
      'Connect `kubectl` to the cluster:',
      '**Step 3: Create the user-assigned managed identity**',
      'Retrieve its identifiers:',
      "- **Identifier**: Client ID; **Purpose**: Identifies which managed identity the application should use.\n- **Identifier**: Principal ID; **Purpose**: Identifies the identity's service principal for Azure RBAC assignments.\n- **Identifier**: Tenant ID; **Purpose**: Identifies the Microsoft Entra tenant.",
      'Keep these identifiers available for the following steps. They are not passwords or client secrets.',
      '**Step 4: Create the federated identity credential**',
      'This is the most important step. It tells Microsoft Entra ID: *trust tokens issued by this AKS cluster, but only when they come from the specified Kubernetes namespace and service account.*',
      'The subject must exactly match the Kubernetes service account that your application will use. For this example:',
      'If the namespace or service account name differs, update the federated credential accordingly. A mismatch will prevent token exchange.',
      'Verify that the credential was created:',
      'Allow a short time for the new credential to propagate before testing authentication.',
      '**Step 5: Grant the identity access to Key Vault**',
      'Get the Key Vault resource ID:',
      'Check its authorization model:',
      'If the output is `true`, assign the **Key Vault Secrets User** role:',
      'This role allows the identity to read secret values without granting it permission to manage the vault.',
      'If the vault uses the legacy access-policy model instead of Azure RBAC, configure an appropriate Key Vault access policy rather than assuming this RBAC assignment will grant data access.',
      "Check that the vault's network configuration also permits the AKS workload to reach it. Identity permissions alone do not bypass firewall or private endpoint restrictions.",
      '**Step 6: Create the Kubernetes ServiceAccount**',
      'Create the namespace if it does not exist:',
      'Create `service-account.yaml`:',
      'Replace the placeholder with the `CLIENT_ID` from Step 3, then apply it:',
      'The annotation identifies the user-assigned managed identity that pods using this service account should authenticate as.',
      '**Step 7: Configure your application Deployment**',
      "Update the application's `deployment.yaml`. Two fields are essential:",
      '- `serviceAccountName: springboot-sa`\n- `azure.workload.identity/use: "true"` on the pod template labels',
      'Replace the ACR image, Key Vault name, and secret name with your actual values. Apply the Deployment:',
      'The AKS Workload ID webhook injects the federated token and the necessary environment variables into eligible pods. The application can then use an Azure Identity library to obtain tokens.',
      '**Step 8: Update the Spring Boot application to read the secret**',
      'Configuring Workload ID does not automatically put the Key Vault secret into an environment variable. Your application must retrieve the secret using an Azure SDK, or you can use the Azure Key Vault Secrets Store CSI Driver if you want secrets mounted into pods.',
      'For the SDK approach, add these dependencies to your Maven `pom.xml`:',
      'These are illustrative versions. Use current compatible versions approved for your project.',
      '`DefaultAzureCredential` detects the Workload ID environment configuration injected into the pod and uses it to authenticate.',
      '**Step 9: Validate the complete setup**',
      'Check the identity configuration:',
      'Check that the pods are running:',
      'Check that Workload ID variables were injected:',
      "The output should match your user-assigned managed identity's client ID. You can also check:",
      'These commands verify that the environment is configured. They do not, by themselves, prove that Key Vault access works. The final test is for the application to retrieve the intended secret successfully.',
      '**Troubleshooting common failures**',
      '- **Error or symptom**: `AADSTS70021` or federated credential error; **What to check**: Issuer URL, subject, audience, namespace, and service account name\n- **Error or symptom**: `403 Forbidden` from Key Vault; **What to check**: Key Vault Secrets User role, correct scope, propagation delay, and vault authorization model\n- **Error or symptom**: DNS or connection timeout; **What to check**: Key Vault firewall, private endpoint, private DNS, and network routing\n- **Error or symptom**: `AZURE_CLIENT_ID` missing; **What to check**: Pod label, service account annotation, and whether pods were recreated after configuration changes\n- **Error or symptom**: Secret not found; **What to check**: Correct vault URL, secret name, and secret status\n- **Error or symptom**: Application cannot authenticate; **What to check**: Azure Identity SDK version and Workload ID token environment variables',
      "If you change the service account annotation or the pod's Workload ID configuration, restart the Deployment so the new pod receives the correct injected configuration:",
    ],
    followUps: [
      'What error do you see when the federated credential subject does not match, and how do you fix it?',
      'How many federated credentials can one managed identity have, and how do you share it across clusters?',
      'How would you surface the secret with the Secrets Store CSI driver instead of the SDK?',
    ],
    code: [
      {
        title: 'Step 1: environment variables',
        language: 'bash',
        code: `export SUBSCRIPTION_ID="<subscription-id>"
export RESOURCE_GROUP="rg-aks-dev"
export AKS_NAME="aks-dev"
export KEYVAULT_NAME="<globally-unique-keyvault-name>"
export IDENTITY_NAME="aks-keyvault-identity"
export NAMESPACE="dev"
export SERVICE_ACCOUNT="springboot-sa"

az login
az account set --subscription "$SUBSCRIPTION_ID"`,
      },
      {
        title: 'Verify the selected subscription and resources',
        language: 'bash',
        code: `az account show --output table

az aks show \\
  --resource-group "$RESOURCE_GROUP" \\
  --name "$AKS_NAME" \\
  --output table`,
      },
      {
        title: 'Step 2: enable OIDC issuer and Workload ID',
        language: 'bash',
        code: `az aks update \\
  --resource-group "$RESOURCE_GROUP" \\
  --name "$AKS_NAME" \\
  --enable-oidc-issuer \\
  --enable-workload-identity`,
      },
      {
        title: 'Retrieve the OIDC issuer URL',
        language: 'bash',
        code: `export AKS_OIDC_ISSUER="$(az aks show \\
  --resource-group "$RESOURCE_GROUP" \\
  --name "$AKS_NAME" \\
  --query 'oidcIssuerProfile.issuerUrl' \\
  --output tsv)"

echo "$AKS_OIDC_ISSUER"`,
      },
      {
        title: 'Connect kubectl to the cluster',
        language: 'bash',
        code: `az aks get-credentials \\
  --resource-group "$RESOURCE_GROUP" \\
  --name "$AKS_NAME"

kubectl get nodes`,
      },
      {
        title: 'Step 3: create the managed identity',
        language: 'bash',
        code: `az identity create \\
  --resource-group "$RESOURCE_GROUP" \\
  --name "$IDENTITY_NAME"`,
      },
      {
        title: 'Retrieve the identity IDs',
        language: 'bash',
        code: `export CLIENT_ID="$(az identity show \\
  --resource-group "$RESOURCE_GROUP" \\
  --name "$IDENTITY_NAME" \\
  --query clientId \\
  --output tsv)"

export PRINCIPAL_ID="$(az identity show \\
  --resource-group "$RESOURCE_GROUP" \\
  --name "$IDENTITY_NAME" \\
  --query principalId \\
  --output tsv)"

export TENANT_ID="$(az account show \\
  --query tenantId \\
  --output tsv)"

echo "Client ID: $CLIENT_ID"
echo "Principal ID: $PRINCIPAL_ID"
echo "Tenant ID: $TENANT_ID"`,
      },
      {
        title: 'Step 4: create the federated credential',
        language: 'bash',
        code: `az identity federated-credential create \\
  --name "aks-springboot-federation" \\
  --identity-name "$IDENTITY_NAME" \\
  --resource-group "$RESOURCE_GROUP" \\
  --issuer "$AKS_OIDC_ISSUER" \\
  --subject "system:serviceaccount:\${NAMESPACE}:\${SERVICE_ACCOUNT}" \\
  --audiences "api://AzureADTokenExchange"`,
      },
      {
        title: 'Subject the credential must match',
        language: 'text',
        code: `Namespace:      dev
ServiceAccount: springboot-sa

Federated subject:
system:serviceaccount:dev:springboot-sa`,
      },
      {
        title: 'Verify that the credential was created',
        language: 'bash',
        code: `az identity federated-credential list \\
  --identity-name "$IDENTITY_NAME" \\
  --resource-group "$RESOURCE_GROUP" \\
  --output table`,
      },
      {
        title: 'Get the Key Vault resource ID',
        language: 'bash',
        code: `export KEYVAULT_ID="$(az keyvault show \\
  --name "$KEYVAULT_NAME" \\
  --query id \\
  --output tsv)"`,
      },
      {
        title: 'Check its authorization model',
        language: 'bash',
        code: `az keyvault show \\
  --name "$KEYVAULT_NAME" \\
  --query properties.enableRbacAuthorization \\
  --output tsv`,
      },
      {
        title: 'Assign Key Vault Secrets User',
        language: 'bash',
        code: `az role assignment create \\
  --assignee-object-id "$PRINCIPAL_ID" \\
  --assignee-principal-type ServicePrincipal \\
  --role "Key Vault Secrets User" \\
  --scope "$KEYVAULT_ID"`,
      },
      {
        title: 'Create the namespace if it does not exist',
        language: 'bash',
        code: `kubectl create namespace "$NAMESPACE" \\
  --dry-run=client -o yaml | kubectl apply -f -`,
      },
      {
        title: 'service-account.yaml',
        language: 'yaml',
        code: `apiVersion: v1
kind: ServiceAccount
metadata:
  name: springboot-sa
  namespace: dev
  annotations:
    azure.workload.identity/client-id: "<USER_ASSIGNED_CLIENT_ID>"`,
      },
      {
        title: 'Apply the ServiceAccount',
        language: 'bash',
        code: `kubectl apply -f service-account.yaml
kubectl get serviceaccount springboot-sa -n dev -o yaml`,
      },
      {
        title: 'Deployment using Workload ID',
        language: 'yaml',
        code: `apiVersion: apps/v1
kind: Deployment
metadata:
  name: springboot-app
  namespace: dev
spec:
  replicas: 2
  selector:
    matchLabels:
      app: springboot-app
  template:
    metadata:
      labels:
        app: springboot-app
        azure.workload.identity/use: "true"
    spec:
      serviceAccountName: springboot-sa
      containers:
        - name: springboot-app
          image: myacr.azurecr.io/springboot-app:v1.0.0
          ports:
            - containerPort: 8080
          env:
            - name: KEYVAULT_URL
              value: "https://<KEYVAULT_NAME>.vault.azure.net/"
            - name: KEYVAULT_SECRET_NAME
              value: "database-password"`,
      },
      {
        title: 'Apply and watch the rollout',
        language: 'bash',
        code: `kubectl apply -f deployment.yaml
kubectl rollout status deployment/springboot-app -n dev
kubectl get pods -n dev`,
      },
      {
        title: 'Maven dependencies (pom.xml)',
        language: 'text',
        code: `<dependency>
    <groupId>com.azure</groupId>
    <artifactId>azure-identity</artifactId>
    <version>1.13.3</version>
</dependency>

<dependency>
    <groupId>com.azure</groupId>
    <artifactId>azure-security-keyvault-secrets</artifactId>
    <version>4.8.3</version>
</dependency>`,
      },
      {
        title: 'Read a secret with DefaultAzureCredential',
        language: 'text',
        code: `import com.azure.identity.DefaultAzureCredentialBuilder;
import com.azure.security.keyvault.secrets.SecretClient;
import com.azure.security.keyvault.secrets.SecretClientBuilder;
import com.azure.security.keyvault.secrets.models.KeyVaultSecret;

public class KeyVaultExample {

    public static void main(String[] args) {
        String vaultUrl = System.getenv("KEYVAULT_URL");
        String secretName = System.getenv("KEYVAULT_SECRET_NAME");

        SecretClient client = new SecretClientBuilder()
                .vaultUrl(vaultUrl)
                .credential(
                    new DefaultAzureCredentialBuilder().build()
                )
                .buildClient();

        KeyVaultSecret secret = client.getSecret(secretName);

        // Use the secret securely. Do not print its value.
        System.out.println("Successfully retrieved Key Vault secret.");
    }
}`,
      },
      {
        title: 'Check the identity configuration',
        language: 'bash',
        code: `kubectl describe serviceaccount springboot-sa -n dev`,
      },
      {
        title: 'Check that the pods are running',
        language: 'bash',
        code: `kubectl get pods -n dev`,
      },
      {
        title: 'Check that Workload ID variables were injected',
        language: 'bash',
        code: `kubectl exec -n dev <pod-name> -- \\
  printenv AZURE_CLIENT_ID`,
      },
      {
        title: 'Check the federated token file variable',
        language: 'bash',
        code: `kubectl exec -n dev <pod-name> -- \\
  printenv AZURE_FEDERATED_TOKEN_FILE`,
      },
      {
        title: 'Restart the Deployment',
        language: 'bash',
        code: `kubectl rollout restart deployment/springboot-app -n dev
kubectl rollout status deployment/springboot-app -n dev`,
      },
    ],
    tags: ['aks', 'workload identity', 'managed identity', 'key vault', 'oidc', 'entra id'],
  },
  {
    id: 'itv-repm3-10',
    level: 'advanced',
    kind: 'scenario',
    prompt:
      'You have a VM created through Terraform. How do you rename the VM without recreating it?',
    probing:
      'Separating the Terraform address, the Azure resource name and the OS hostname, and knowing moved blocks and state mv.',
    answer: [
      'First clarify which "name" the interviewer means, because there are three different names:',
      '- **Name**: Terraform resource address (name in code); **Example**: `azurerm_linux_virtual_machine.web`; **Can it change without recreating?**: **Yes**, with a `moved` block or `terraform state mv`\n- **Name**: Azure resource name; **Example**: `vm-web-01` in the portal; **Can it change without recreating?**: **No**. In Azure, the VM name is fixed after creation. Changing `name` in Terraform forces replacement.\n- **Name**: OS hostname / display name; **Example**: `hostname`, `Name` tag; **Can it change without recreating?**: **Yes**. Tags update in place; the hostname can be changed inside the OS.',
      '**Case 1: Rename the resource in Terraform code (most common meaning)**',
      'Suppose the code says `web` but the VM is actually the frontend server, and you want to call it `frontend`. If you just rename it in the code, Terraform thinks you deleted `web` and created `frontend`, so it plans **destroy + create**.',
      'Use a `moved` block (Terraform 1.1+):',
      'Or use the CLI on older versions:',
      'Run `terraform plan`. It should show **0 to add, 0 to change, 0 to destroy** (or just the move). The `moved` block is better because it is reviewed in the PR and works for everyone on the team.',
      '**Case 2: Change the visible name without changing the Azure resource name**',
      '- Add or update a tag such as `DisplayName = "frontend-01"`. Tags update in place.\n- Change the OS hostname inside the VM:',
      'On AWS this is simpler: the EC2 "name" is just the `Name` tag, so changing it in Terraform is an in-place update.',
      '**Case 3: The Azure resource name really must change**',
      'Azure does not support renaming a VM. To reduce impact:',
      '1. Stop the VM and take a snapshot of the OS and data disks.\n2. Create a new VM with the new name, attaching the existing disks (or disks created from the snapshots), with the same NIC and IP if needed.\n3. Update the Terraform code and use `terraform import` (or an `import` block) so Terraform manages the new VM.\n4. Delete the old VM resource after validation.',
      '**Trap to avoid:** adding `lifecycle { ignore_changes = [name] }` does not rename anything. It only makes Terraform ignore the change.',
      '**Interview answer:** "It depends on which name. If it is the Terraform resource name in the code, I use a `moved` block or `terraform state mv`, so the state is updated and the plan shows no destroy. If it is the Azure VM name, Azure does not allow renaming, and changing it in Terraform forces replacement. In that case I either change the display tag or hostname, or, if the resource name really must change, I recreate the VM from the existing disks and import it into Terraform, so the data is preserved."',
    ],
    followUps: [
      'What does a moved block do differently from terraform state mv in a team setup?',
      'Why does ignore_changes not solve a rename?',
      'How would you rename an Azure VM with minimal downtime when the name must change?',
    ],
    code: [
      {
        title: 'moved block (Terraform 1.1+)',
        language: 'hcl',
        code: `resource "azurerm_linux_virtual_machine" "frontend" {
  name = "vm-web-01" # Azure name stays the same
  # ... same settings as before
}

moved {
  from = azurerm_linux_virtual_machine.web
  to   = azurerm_linux_virtual_machine.frontend
}`,
      },
      {
        title: 'terraform state mv (older versions)',
        language: 'bash',
        code: `terraform state mv \\
  'azurerm_linux_virtual_machine.web' \\
  'azurerm_linux_virtual_machine.frontend'`,
      },
      {
        title: 'Change the OS hostname',
        language: 'bash',
        code: `sudo hostnamectl set-hostname frontend-01`,
      },
    ],
    tags: ['terraform', 'state', 'azure', 'vm', 'refactoring'],
  },
  {
    id: 'itv-repm3-11',
    level: 'basic',
    kind: 'open',
    prompt: 'What is service discovery?',
    probing:
      'Why pod IPs cannot be hardcoded, and how a Service plus CoreDNS and EndpointSlices give a stable name.',
    answer: [
      'Service discovery is how one service **finds the network location** (IP and port) of another service automatically, without hardcoding IPs.',
      'Why we need it: in Kubernetes, pods are created and deleted all the time, and every new pod gets a new IP. If the frontend hardcoded the backend pod IP, it would break after every restart or scale event.',
      '**How it works in Kubernetes**',
      'Kubernetes uses a **Service** (stable virtual IP and name) plus **CoreDNS**.',
      'The frontend uses:\n- `http://backend-svc:8080` from the same namespace.\n- `http://backend-svc.dev.svc.cluster.local:8080` from any namespace (full DNS name).',
      'Kubernetes keeps the list of ready pod IPs behind the Service up to date (EndpointSlices). Only pods passing their readiness probe receive traffic.',
      '**Outside Kubernetes**',
      '- **Consul** or **Netflix Eureka** (Spring Cloud) – services register themselves and clients look them up.\n- **Azure Private DNS zones** – stable names for VMs and private endpoints.',
      '**Interview answer:** "Service discovery lets services find each other by name instead of by IP. In AKS, I create a Kubernetes Service in front of the pods. CoreDNS gives it a DNS name like `backend-svc.dev.svc.cluster.local`, and the Service forwards traffic to the ready pods behind it. So when pods restart or HPA adds replicas, the frontend keeps calling the same name and nothing needs to change."',
    ],
    code: [
      {
        title: 'Frontend to backend via Service and DNS',
        language: 'text',
        code: `Frontend pod
     |
     |  calls http://backend-svc:8080
     v
CoreDNS resolves backend-svc -> Service ClusterIP (10.0.45.12)
     |
     v
Service forwards to a healthy backend pod
     |
     +--> backend pod 1 (10.244.1.5)
     +--> backend pod 2 (10.244.2.8)
     +--> backend pod 3 (10.244.3.4)`,
      },
      {
        title: 'Example Service',
        language: 'yaml',
        code: `apiVersion: v1
kind: Service
metadata:
  name: backend-svc
  namespace: dev
spec:
  selector:
    app: backend
  ports:
    - port: 8080
      targetPort: 8080`,
      },
      {
        title: 'Check the Service and its endpoints',
        language: 'bash',
        code: `kubectl get svc backend-svc -n dev
kubectl get endpointslices -n dev -l kubernetes.io/service-name=backend-svc

kubectl run dns-test -n dev --rm -it --image=busybox:1.36 --restart=Never -- \\
  nslookup backend-svc.dev.svc.cluster.local`,
      },
    ],
    tags: ['kubernetes', 'service discovery', 'coredns', 'services'],
  },
  {
    id: 'itv-repm3-12',
    level: 'intermediate',
    kind: 'open',
    prompt: 'What is a service mesh?',
    probing:
      'What a mesh adds beyond Services (mTLS, traffic splitting, retries, telemetry), how sidecars work, and when it is not worth it.',
    answer: [
      'A service mesh is an infrastructure layer that manages **service-to-service communication** inside the cluster, so developers do not need to write that logic in every application.',
      'Simple way to think about it: Kubernetes Services answer *"where is the backend?"*. A service mesh answers *"how should traffic to the backend behave, and is it secure?"*',
      '**What a service mesh gives you**',
      '- **Feature**: Security (mTLS); **Example**: All pod-to-pod traffic is encrypted and each service has an identity.\n- **Feature**: Traffic control; **Example**: Send 90% of traffic to v1 and 10% to v2 (canary).\n- **Feature**: Resilience; **Example**: Retries, timeouts, circuit breaking.\n- **Feature**: Observability; **Example**: Request rate, error rate, latency, and tracing between services, without code changes.\n- **Feature**: Authorization; **Example**: Only the frontend can call the payments service.',
      '- **Data plane:** a proxy (usually Envoy) runs next to each app container as a **sidecar** and intercepts all traffic. Newer modes (Istio ambient, Cilium) avoid per-pod sidecars.\n- **Control plane:** configures all the proxies.',
      'Common meshes: **Istio** (AKS has an Istio-based service mesh add-on), **Linkerd**, **Cilium service mesh**.',
      '**Real use cases**\n**1. Canary release: 10% traffic to the new version**',
      '(The `v1` and `v2` subsets are defined in a `DestinationRule` using pod labels.)',
      '**2. Enforce mTLS for the whole namespace**',
      '**When not to use it**',
      'A mesh adds complexity, extra CPU/memory, and some latency. For a few microservices, Kubernetes Services, NetworkPolicies, and Ingress are usually enough.',
      '**Interview answer:** "A service mesh manages communication between microservices. It uses proxies, usually Envoy sidecars, next to each pod, and a control plane like Istio to configure them. It gives us mTLS between services, traffic splitting for canary releases, retries and timeouts, and observability without changing application code. In AKS, I would use the Istio add-on when we have many microservices with strict security or traffic-management requirements, and avoid it for small setups where it adds unnecessary complexity."',
    ],
    code: [
      {
        title: 'Data plane and control plane',
        language: 'text',
        code: `            Control plane (Istio istiod)
         pushes config, certificates, policies
                |               |
                v               v
  [ Frontend | Envoy ] ---> [ Envoy | Backend ]
         Pod A        mTLS        Pod B`,
      },
      {
        title: 'Canary: 10% to v2 (VirtualService)',
        language: 'yaml',
        code: `apiVersion: networking.istio.io/v1
kind: VirtualService
metadata:
  name: backend
  namespace: prod
spec:
  hosts:
    - backend
  http:
    - route:
        - destination:
            host: backend
            subset: v1
          weight: 90
        - destination:
            host: backend
            subset: v2
          weight: 10`,
      },
      {
        title: 'Strict mTLS for a namespace',
        language: 'yaml',
        code: `apiVersion: security.istio.io/v1
kind: PeerAuthentication
metadata:
  name: default
  namespace: prod
spec:
  mtls:
    mode: STRICT`,
      },
    ],
    tags: ['kubernetes', 'service mesh', 'istio', 'mtls', 'canary'],
  },
  {
    id: 'itv-repm3-13',
    level: 'basic',
    kind: 'open',
    prompt: 'What is the name of the API server in AKS that you used?',
    probing:
      'That the API server is kube-apiserver, that AKS manages the control plane, and how public and private endpoints differ.',
    answer: [
      'The Kubernetes API server component is **kube-apiserver**. It is the front door of the cluster: `kubectl`, pipelines, controllers, and kubelets all talk to it.',
      "In AKS, the control plane (API server, etcd, scheduler, controller manager) is **managed by Microsoft**. You do not see it as a pod or VM. You access it through the cluster's **API server FQDN**.",
      '- **Cluster type**: Public AKS; **API server address format**: `<dns-prefix>-<hash>.hcp.<region>.azmk8s.io`\n- **Cluster type**: Private AKS; **API server address format**: `<dns-prefix>-<hash>.privatelink.<region>.azmk8s.io` (resolves to a private IP)',
      'Related settings you may be asked about:',
      '- **Authorized IP ranges** – restrict which public IPs can reach a public API server.\n- **Private cluster** – API server reachable only through a private endpoint (see Q18).\n- **API Server VNet Integration** – the API server is projected into a subnet in your VNet.',
      '**Interview answer:** "The API server is kube-apiserver. In AKS it runs in the Microsoft-managed control plane, so I access it through the cluster FQDN, for example `aks-dev-xxxx.hcp.eastus.azmk8s.io` for a public cluster, or the `privatelink` FQDN for a private cluster. I get it from `az aks show` or `kubectl cluster-info`. In our project the cluster was private, so the pipeline agents reached it through the private endpoint."',
      'Only say "private" if that matches your project.',
    ],
    code: [
      {
        title: 'Find the API server FQDN',
        language: 'bash',
        code: `az aks show -g rg-aks-dev -n aks-dev --query fqdn -o tsv          # public
az aks show -g rg-aks-dev -n aks-dev --query privateFqdn -o tsv   # private

kubectl cluster-info
# Kubernetes control plane is running at https://aks-dev-xxxx.hcp.eastus.azmk8s.io:443`,
      },
    ],
    tags: ['kubernetes', 'aks', 'api server', 'private cluster'],
  },
  {
    id: 'itv-repm3-14',
    level: 'intermediate',
    kind: 'open',
    prompt: 'Which component is responsible for assigning an IP to a pod?',
    probing:
      'That the CNI plugin and its IPAM assign pod IPs (not the scheduler or kubelet itself), and where AKS gets those IPs.',
    answer: [
      'The **CNI plugin** (Container Network Interface) assigns the pod IP, using its **IPAM** (IP Address Management) part. The kubelet triggers it, but the kubelet does not choose the IP itself.',
      '**Flow when a pod starts**',
      '**In AKS: where the IP comes from**',
      "- **Network plugin**: Azure CNI Overlay; **Pod IP comes from**: A private overlay CIDR (for example `10.244.0.0/16`), separate from the VNet\n- **Network plugin**: Azure CNI (pod subnet / node subnet); **Pod IP comes from**: Real IPs from the Azure VNet subnet\n- **Network plugin**: Kubenet (legacy); **Pod IP comes from**: The node's `podCIDR` range, with routes in a route table",
      'Related, but different:',
      '- **Service ClusterIP** – assigned by the API server from the service CIDR.\n- **Node IP** – assigned by Azure from the node subnet.\n- **kube-proxy** – does not assign IPs; it programs rules so Service IPs reach pods.',
      'Real issue: with Azure CNI using VNet IPs, a small subnet can run out of addresses, and new pods get stuck in `ContainerCreating` with IP allocation errors. Fix: bigger subnet or Azure CNI Overlay.',
      '**Interview answer:** "The CNI plugin assigns the pod IP. When a pod is scheduled, the kubelet asks the container runtime to create it, the runtime calls the CNI plugin, and the plugin\'s IPAM picks an IP and sets up the network. In AKS, with Azure CNI Overlay, the IP comes from the overlay pod CIDR; with Azure CNI it comes from the VNet subnet. Service IPs are different: the API server assigns them from the service CIDR."',
    ],
    code: [
      {
        title: 'Flow when a pod starts',
        language: 'text',
        code: `1. Scheduler     -> picks a node for the pod
2. kubelet       -> asks the container runtime (containerd) to create the pod
3. containerd    -> calls the CNI plugin (ADD)
4. CNI + IPAM    -> picks a free IP, creates the network interface, sets routes
5. kubelet       -> reports the pod IP to the API server (status.podIP)`,
      },
      {
        title: 'Check pod IPs and the CNI',
        language: 'bash',
        code: `kubectl get pods -o wide                    # pod IPs
kubectl get nodes -o wide                   # node IPs
az aks show -g rg-aks-dev -n aks-dev --query networkProfile`,
      },
    ],
    tags: ['kubernetes', 'cni', 'ipam', 'networking', 'aks'],
  },
  {
    id: 'itv-repm3-15',
    level: 'intermediate',
    kind: 'open',
    prompt: 'What are a sidecar, a headless service, and probes? What are the real use cases?',
    probing:
      'Practical use of sidecars, headless Services for StatefulSets, and the distinct job of startup, liveness and readiness probes.',
    answer: [
      "**1. Sidecar:** A sidecar is an **extra container in the same pod** as the main application. It shares the pod's network (localhost) and volumes, and adds a supporting feature without changing the application code.",
      'Real use cases:\n- **Use case**: Ship application logs to a central system; **Sidecar**: Fluent Bit reads the log files and sends them to Log Analytics or Elasticsearch\n- **Use case**: Service mesh (mTLS, retries, metrics); **Sidecar**: Envoy proxy (Istio)\n- **Use case**: Database proxy; **Sidecar**: Cloud SQL Auth Proxy, PgBouncer\n- **Use case**: Refresh config or certificates; **Sidecar**: A container that syncs files into a shared volume',
      'Example: the app writes logs to a shared volume, and Fluent Bit ships them.',
      'Newer Kubernetes versions also support **native sidecars**: an init container with `restartPolicy: Always`, which starts before the app and keeps running.',
      '**2. Headless service**',
      "A normal Service has one ClusterIP and load-balances across pods. A **headless Service** has `clusterIP: None`, so DNS returns **each pod's IP directly**, and each pod gets its own stable DNS name when used with a StatefulSet.",
      'Real use cases:\n- **Databases and clusters in StatefulSets** (MongoDB, Kafka, Cassandra, Elasticsearch), where each member must reach a *specific* peer, such as the primary.\n- **Client-side load balancing**, such as gRPC clients that want the full list of pod IPs.',
      'With a StatefulSet that has `serviceName: mongo`, the pods get stable names:',
      '**3. Probes:** Probes are health checks that the kubelet runs against a container.',
      '- **Probe**: **Startup**; **Question it answers**: Has the app finished starting?; **If it fails**: Other probes wait; after the threshold, the container is restarted\n- **Probe**: **Readiness**; **Question it answers**: Can it receive traffic now?; **If it fails**: Pod is removed from the Service endpoints (no restart)\n- **Probe**: **Liveness**; **Question it answers**: Is it stuck or dead?; **If it fails**: Container is restarted',
      'Real use cases:\n- **Slow Java startup:** a Spring Boot app takes 2 minutes to start. Without a startup probe, the liveness probe kills it before it is ready, and it ends up in `CrashLoopBackOff`. A startup probe gives it time.\n- **Readiness during deployment:** with a rolling update, new pods get traffic only when ready, so users see no errors.\n- **Liveness for deadlocks:** if the app hangs (thread deadlock), liveness restarts it automatically.',
      '**Common mistake:** do not make the liveness probe check the database. If the database goes down, every pod restarts in a loop and makes the outage worse. Dependency checks belong in readiness, if anywhere.',
      '**Interview answer:** "A sidecar is a helper container in the same pod, for example Fluent Bit for shipping logs or an Envoy proxy for the service mesh. A headless Service has no ClusterIP, so DNS returns the individual pod IPs. I use it with StatefulSets like MongoDB or Kafka, where each pod needs a stable name like `mongo-0.mongo`. Probes are health checks: the startup probe protects slow-starting Java apps, the readiness probe controls whether a pod receives traffic, and the liveness probe restarts a stuck container. I keep liveness probes simple and never tie them to the database."',
    ],
    code: [
      {
        title: 'Pod with a Fluent Bit log sidecar',
        language: 'yaml',
        code: `apiVersion: v1
kind: Pod
metadata:
  name: springboot-with-logging
spec:
  volumes:
    - name: app-logs
      emptyDir: {}
  containers:
    - name: app
      image: myacr.azurecr.io/springboot-app:v1.0.0
      volumeMounts:
        - name: app-logs
          mountPath: /var/log/app
    - name: log-shipper
      image: fluent/fluent-bit:3.0
      volumeMounts:
        - name: app-logs
          mountPath: /var/log/app
          readOnly: true`,
      },
      {
        title: 'Headless Service for MongoDB',
        language: 'yaml',
        code: `apiVersion: v1
kind: Service
metadata:
  name: mongo
  namespace: db
spec:
  clusterIP: None
  selector:
    app: mongo
  ports:
    - port: 27017`,
      },
      {
        title: 'Stable StatefulSet DNS names',
        language: 'text',
        code: `mongo-0.mongo.db.svc.cluster.local
mongo-1.mongo.db.svc.cluster.local
mongo-2.mongo.db.svc.cluster.local`,
      },
      {
        title: 'Startup, liveness and readiness probes',
        language: 'yaml',
        code: `startupProbe:
  httpGet:
    path: /actuator/health/liveness
    port: 8080
  periodSeconds: 10
  failureThreshold: 30      # up to 300 seconds to start
readinessProbe:
  httpGet:
    path: /actuator/health/readiness
    port: 8080
  periodSeconds: 10
livenessProbe:
  httpGet:
    path: /actuator/health/liveness
    port: 8080
  periodSeconds: 15
  failureThreshold: 3`,
      },
    ],
    tags: ['kubernetes', 'sidecar', 'headless service', 'probes', 'statefulset'],
  },
  {
    id: 'itv-repm3-16',
    level: 'basic',
    kind: 'open',
    prompt: 'Can you list the checks done by SonarQube and what they are?',
    probing:
      'What static analysis covers (bugs, vulnerabilities, hotspots, smells, coverage, duplication) and how the Quality Gate stops a pipeline.',
    answer: [
      'SonarQube performs **static code analysis**: it reads the source code without running it. It does **not** run your tests itself. It imports the test results and code coverage produced by your build (for example JaCoCo for Java).',
      '**What SonarQube checks**',
      '- **Check**: **Bugs** (Reliability); **What it means**: Code that is likely to behave incorrectly; **Example**: Possible `NullPointerException`, resource not closed\n- **Check**: **Vulnerabilities** (Security); **What it means**: Code that can be exploited; **Example**: SQL injection, weak cryptography, hardcoded password\n- **Check**: **Security Hotspots**; **What it means**: Security-sensitive code that a person must review; **Example**: Use of `Random` for tokens, permissive CORS settings\n- **Check**: **Code Smells** (Maintainability); **What it means**: Code that works but is hard to maintain; **Example**: Very long methods, unused variables, deep nesting\n- **Check**: **Code Coverage**; **What it means**: % of code executed by unit tests (imported from JaCoCo, Istanbul, etc.); **Example**: 65% coverage on new code\n- **Check**: **Duplications**; **What it means**: Copy-pasted code blocks; **Example**: Same 30 lines in 3 classes\n- **Check**: **Complexity**; **What it means**: Cyclomatic and cognitive complexity; **Example**: A method with 15 nested `if` statements\n- **Check**: **Secrets detection**; **What it means**: Credentials committed in code; **Example**: Azure storage key in `application.properties`',
      'Each area gets a rating from **A to E**. Newer SonarQube versions group issues by software quality (Security, Reliability, Maintainability), but the ideas are the same.',
      '**Quality Gate:** The Quality Gate is the pass/fail rule for the pipeline. The default "Sonar way" gate checks **new code**, for example:',
      '- No new bugs or vulnerabilities (ratings must be A).\n- Coverage on new code ≥ 80%.\n- Duplicated lines on new code ≤ 3%.\n- All new security hotspots reviewed.',
      'If the gate fails, the pipeline fails, and the code does not move forward.',
      '**Example in a pipeline (Maven)**',
      '`clean verify` runs unit tests and generates the JaCoCo coverage report, `sonar:sonar` sends the analysis, and `sonar.qualitygate.wait=true` makes the step fail if the Quality Gate fails. The token comes from a secret pipeline variable or Key Vault, never from the code.',
      'In Azure DevOps, the same thing is done with the SonarQube extension tasks (Prepare Analysis → Maven build → Run Code Analysis → Publish Quality Gate Result).',
      '**Interview answer:** "SonarQube does static analysis. It finds bugs, vulnerabilities, security hotspots, code smells, duplicated code, and complexity, and it imports unit test coverage from JaCoCo. It rates reliability, security, and maintainability from A to E. The key part is the Quality Gate on new code, for example no new vulnerabilities and at least 80% coverage. I configure the pipeline to wait for the Quality Gate and fail the build if it fails, so poor-quality or insecure code cannot be deployed."',
    ],
    code: [
      {
        title: 'Maven build with Sonar analysis',
        language: 'bash',
        code: `mvn -B clean verify sonar:sonar \\
  -Dsonar.host.url="$SONAR_HOST_URL" \\
  -Dsonar.token="$SONAR_TOKEN" \\
  -Dsonar.projectKey=springboot-app \\
  -Dsonar.qualitygate.wait=true`,
      },
    ],
    tags: ['sonarqube', 'code quality', 'quality gate', 'static analysis'],
  },
  {
    id: 'itv-repm3-17',
    level: 'advanced',
    kind: 'scenario',
    prompt: 'You have a frontend, backend, and database. How do you implement DevSecOps practices?',
    probing:
      'Security controls at every stage and every tier: code, build, image, deploy, runtime, and how the pipeline enforces them.',
    answer: [
      'DevSecOps means adding security checks at **every stage** of the pipeline (shift left), instead of one security review at the end.',
      '**Common to all tiers**',
      '- **Stage**: Code; **Practice**: Branch policies, PR reviews, no direct push to main; **Tool examples**: Azure Repos / GitHub branch protection\n- **Stage**: Code; **Practice**: Secret scanning; **Tool examples**: Gitleaks, GitHub Advanced Security\n- **Stage**: Build; **Practice**: SAST (code analysis); **Tool examples**: SonarQube\n- **Stage**: Build; **Practice**: SCA (vulnerable libraries); **Tool examples**: OWASP Dependency-Check, `npm audit`, Snyk\n- **Stage**: Package; **Practice**: Container image scan, non-root, small base image; **Tool examples**: Trivy, Microsoft Defender for Containers\n- **Stage**: Infra; **Practice**: IaC scan before `terraform apply`; **Tool examples**: Checkov, tfsec\n- **Stage**: Deploy; **Practice**: Secrets from Key Vault, managed identity, approvals before prod; **Tool examples**: Azure Key Vault, Workload ID\n- **Stage**: Test; **Practice**: DAST against the QA environment; **Tool examples**: OWASP ZAP\n- **Stage**: Run; **Practice**: Threat detection, policy, logging; **Tool examples**: Defender for Cloud, Azure Policy, Azure Monitor',
      '**Per tier**\n**Frontend (React / Angular)**',
      '- `npm audit` / Snyk for vulnerable npm packages; ESLint security rules.\n- No secrets in frontend code (everything in the browser is public).\n- Security headers: Content Security Policy, HSTS, X-Frame-Options.\n- Application Gateway with **WAF** in front (OWASP rules block SQL injection, XSS).\n- OWASP ZAP scan against the QA URL.',
      '**Backend (Spring Boot API)**',
      '- SonarQube Quality Gate, Dependency-Check, Trivy image scan.\n- Authentication with Microsoft Entra ID (OAuth2/JWT); validate all input.\n- Runs on AKS as non-root, with resource limits and NetworkPolicies (only frontend → backend).\n- Gets DB credentials from Key Vault through Workload ID (see Q9), no passwords in config.',
      '**Database (Azure SQL / PostgreSQL)**',
      '- Public access disabled; reachable only through a **private endpoint**.\n- Microsoft Entra authentication, least-privilege DB users for the app.\n- Encryption at rest (TDE) and in transit (TLS).\n- Auditing, Microsoft Defender for SQL, automated backups.\n- Schema changes through reviewed migration scripts (Flyway/Liquibase), not manual changes in prod.',
      '**Example: security gates in Azure DevOps**',
      '(The Sonar token and other secrets are supplied from secret variables or Key Vault.)',
      '**Interview answer:** "I add security at every stage. In code, I use branch policies and secret scanning. In build, SonarQube for SAST and Dependency-Check or npm audit for vulnerable libraries, with the build failing on high-severity findings. Container images are scanned with Trivy, and Terraform is scanned with Checkov. Secrets come from Key Vault through managed identities. For the frontend, I use WAF and security headers; for the backend, Entra ID authentication, NetworkPolicies, and non-root containers; and for the database, private endpoints, no public access, encryption, and auditing. After deployment to QA, I run an OWASP ZAP scan, production needs approval, and Defender for Cloud monitors the runtime."',
    ],
    followUps: [
      'Which of these checks block the pipeline, and which only report?',
      'How do you keep secrets out of the frontend bundle?',
      'How would you handle a critical CVE found in production that has no fix yet?',
    ],
    code: [
      {
        title: 'Pipeline view',
        language: 'text',
        code: `Code ──> Build ──> Test ──> Package ──> Deploy ──> Run
 |         |         |         |           |          |
Secrets  SAST      DAST     Image scan   IaC scan   Monitoring
scan     SCA                SBOM         Approvals  Defender for Cloud
Branch   Unit tests                      Key Vault  Azure Policy
policies`,
      },
      {
        title: 'Example: security gates in Azure DevOps',
        language: 'yaml',
        code: `stages:
  - stage: Build
    jobs:
      - job: BuildAndScan
        steps:
          - script: gitleaks detect --source . --exit-code 1
            displayName: Secret scan
          - script: mvn -B clean verify sonar:sonar -Dsonar.qualitygate.wait=true
            displayName: Build, unit tests, SonarQube
          - script: mvn -B org.owasp:dependency-check-maven:check -DfailBuildOnCVSS=7
            displayName: Dependency scan
          - script: |
              docker build -t myacr.azurecr.io/backend:$(Build.BuildId) .
              trivy image --severity HIGH,CRITICAL --exit-code 1 myacr.azurecr.io/backend:$(Build.BuildId)
            displayName: Build and scan image

  - stage: DeployQA
    dependsOn: Build
    # deploy, then run OWASP ZAP baseline scan against QA

  - stage: DeployProd
    dependsOn: DeployQA
    # Azure DevOps environment with manual approval`,
      },
    ],
    tags: ['devsecops', 'security', 'azure devops', 'three-tier', 'shift left'],
  },
  {
    id: 'itv-repm3-18',
    level: 'advanced',
    kind: 'scenario',
    prompt: 'How does Azure DevOps authenticate to a private AKS cluster?',
    probing:
      'Separating network reachability (agent in the VNet, private DNS) from identity (service connection, Entra ID, Kubernetes RBAC).',
    answer: [
      'There are **two separate problems** to solve, and interviewers like it when you separate them:',
      '1. **Network:** can the pipeline agent even reach the private API server?\n2. **Identity:** once it reaches it, who is the pipeline, and what is it allowed to do?',
      '**1. Network: reach the private API server**',
      'A Microsoft-hosted agent runs on the internet, so it **cannot reach** a private AKS API server. Options:',
      '- **Option**: **Self-hosted agent in the VNet** (most common); **How it works**: A VM or VMSS agent pool in the AKS VNet or a peered VNet\n- **Option**: **Managed DevOps Pools** with VNet injection; **How it works**: Microsoft-managed agents placed in your subnet\n- **Option**: **`az aks command invoke`**; **How it works**: Runs `kubectl` commands through the Azure API without network line of sight (good for small tasks and emergencies)',
      "The agent must also resolve the private FQDN. The `privatelink.<region>.azmk8s.io` private DNS zone must be linked to the agent's VNet, or DNS must be forwarded to it.",
      '**2. Identity: authenticate and authorize**',
      "1. Create an **Azure Resource Manager service connection**, preferably with **workload identity federation** (no client secret to store or rotate).\n2. The AKS cluster uses **Microsoft Entra ID integration with Azure RBAC for Kubernetes**.\n3. Give the service connection's identity **only what it needs**, for example the `Azure Kubernetes Service RBAC Writer` role scoped to the `dev` namespace, and `AcrPush` on ACR for the build stage.\n4. In the pipeline, get credentials and convert the kubeconfig with **kubelogin** so `kubectl` uses the pipeline identity.",
      'Alternative without a VNet agent:',
      '**Interview answer:** "There are two parts: network and identity. Because the API server is private, Microsoft-hosted agents can\'t reach it, so we use self-hosted agents in a VNet peered with the AKS VNet, and the private DNS zone is linked so the private FQDN resolves. For identity, the pipeline uses an Azure Resource Manager service connection with workload identity federation, so there is no secret. The cluster uses Entra ID with Azure RBAC, and the pipeline identity has only namespace-scoped deployment permissions. In the pipeline, I run `az aks get-credentials` and `kubelogin` and then deploy. For one-off tasks, `az aks command invoke` also works without network access."',
    ],
    followUps: [
      'Why does a Microsoft-hosted agent fail against a private cluster, and what error do you see?',
      'What is the trade-off of az aks command invoke compared with a self-hosted agent?',
      'How do you scope the pipeline identity so it can deploy to one namespace only?',
    ],
    code: [
      {
        title: 'Self-hosted agent path to the private API',
        language: 'text',
        code: `Azure DevOps (cloud)
      |  job assigned
      v
Self-hosted agent (VM in hub/peered VNet)
      |  DNS: aks-xxxx.privatelink.eastus.azmk8s.io -> 10.10.1.4
      v
Private endpoint of the AKS API server
      |
      v
Private AKS cluster`,
      },
      {
        title: 'Pipeline deploy with kubelogin',
        language: 'yaml',
        code: `pool:
  name: aks-private-agents   # self-hosted pool inside the VNet

steps:
  - task: AzureCLI@2
    displayName: Deploy to private AKS
    inputs:
      azureSubscription: sc-aks-dev   # workload identity federation
      scriptType: bash
      scriptLocation: inlineScript
      inlineScript: |
        az aks get-credentials -g rg-aks-dev -n aks-dev --overwrite-existing
        kubelogin convert-kubeconfig -l azurecli
        kubectl apply -f k8s/ -n dev
        kubectl rollout status deployment/springboot-app -n dev`,
      },
      {
        title: 'az aks command invoke',
        language: 'bash',
        code: `az aks command invoke -g rg-aks-dev -n aks-dev \\
  --command "kubectl apply -f deployment.yaml -n dev" \\
  --file deployment.yaml`,
      },
    ],
    tags: ['azure devops', 'aks', 'private cluster', 'kubelogin', 'workload identity federation'],
  },
  {
    id: 'itv-repm3-19',
    level: 'intermediate',
    kind: 'scenario',
    prompt: 'How do you scan in the build stage once artifacts are generated as WAR/JAR files?',
    probing:
      'That artifact scanning (SCA, SBOM) is separate from SonarQube source analysis, and how failing builds stop vulnerable artifacts.',
    answer: [
      'SonarQube scans the **source code**. Once the WAR/JAR is built, I scan the **artifact itself**, because it contains all the third-party libraries (dependencies) that will actually run in production. Most real-world vulnerabilities (for example Log4Shell) come from these libraries, not from our own code.',
      '**Order in the build stage**',
      '**Tools and commands**',
      '**1. OWASP Dependency-Check** (free, widely used)',
      'Or through Maven: `mvn org.owasp:dependency-check-maven:check -DfailBuildOnCVSS=7`.',
      '**2. Trivy** (fast, also used later for the Docker image)',
      '**3. SBOM + scan** (Syft + Grype)',
      'Other options are Snyk, JFrog Xray (if artifacts go to Artifactory), and Mend.',
      'Because the scan step fails on HIGH/CRITICAL, the artifact is never published if it has serious vulnerabilities. The report is published even on failure (`condition: always()`), so developers can see what to fix.',
      '**Fixing findings**\n- Upgrade the library version (or the parent BOM) and rebuild.\n- If it is a false positive or not exploitable, add a documented suppression with an expiry date, approved by the security team.',
      '**Interview answer:** "After packaging, I scan the JAR or WAR itself with an SCA tool like OWASP Dependency-Check or Trivy, because it contains all the third-party libraries that will run in production. The step fails the build on HIGH or CRITICAL CVEs, publishes the report, and generates an SBOM. Only if the scan passes is the artifact published and the Docker image built, and then the image is scanned again with Trivy. Fixes are usually library upgrades, and any suppression must be documented and approved."',
    ],
    code: [
      {
        title: 'Order in the build stage',
        language: 'text',
        code: `Compile + unit tests
      |
SonarQube (source code, Quality Gate)
      |
Package -> target/app.jar
      |
Scan the JAR (SCA: known CVEs in libraries)   <-- fail on HIGH/CRITICAL
      |
Generate SBOM (list of everything inside)
      |
Publish artifact (only if all gates pass)
      |
Docker build -> scan the image with Trivy`,
      },
      {
        title: 'OWASP Dependency-Check',
        language: 'bash',
        code: `dependency-check.sh \\
  --project springboot-app \\
  --scan target/app.jar \\
  --format HTML --format JUNIT \\
  --out reports \\
  --failOnCVSS 7 \\
  --nvdApiKey "$NVD_API_KEY"`,
      },
      {
        title: 'Trivy filesystem scan',
        language: 'bash',
        code: `trivy fs --scanners vuln --severity HIGH,CRITICAL --exit-code 1 target/`,
      },
      {
        title: 'SBOM with Syft, scan with Grype',
        language: 'bash',
        code: `syft target/app.jar -o cyclonedx-json > sbom.json
grype sbom:sbom.json --fail-on high`,
      },
      {
        title: 'Azure DevOps build and scan steps',
        language: 'yaml',
        code: `- script: mvn -B clean package
  displayName: Build JAR

- script: trivy fs --scanners vuln --severity HIGH,CRITICAL --exit-code 1 --format template --template "@contrib/junit.tpl" -o trivy-results.xml target/
  displayName: Scan JAR

- task: PublishTestResults@2
  condition: always()
  inputs:
    testResultsFormat: JUnit
    testResultsFiles: trivy-results.xml

- task: PublishPipelineArtifact@1
  inputs:
    targetPath: target/app.jar
    artifact: app`,
      },
    ],
    tags: ['sca', 'security scanning', 'trivy', 'dependency-check', 'sbom', 'java'],
  },
  {
    id: 'itv-repm3-20',
    level: 'intermediate',
    kind: 'open',
    prompt:
      'Instead of using 3 VNets for frontend, backend, and database, can we put all in a single VNet? How?',
    probing:
      'One VNet with three subnets, the default AllowVnetInBound rule, and explicit NSG or ASG rules to enforce tier isolation.',
    answer: [
      '**Yes.** For one application, the usual design is **one VNet with three subnets**, and **NSGs** control traffic between the subnets. This is simpler and cheaper than three VNets (no peering to manage, no peering data charges).',
      '**Important point: subnets in the same VNet can talk to each other by default**',
      'The default NSG rule `AllowVnetInBound` allows **all** traffic inside the VNet. So you must add explicit **allow** rules for the required flows, and a **deny** rule for the rest (with a lower priority number than the default rules).',
      'Example NSG for the data subnet (Terraform):',
      'Other good practices:',
      '- Use **Application Security Groups** (ASGs) instead of IP ranges, so rules say "web → api" instead of CIDRs.\n- For NSG rules to apply to a private endpoint, enable **network policies for private endpoints** on that subnet.\n- If traffic must be inspected, use a route table (UDR) to send it through Azure Firewall.',
      '**When separate VNets are better**',
      '- Different teams, subscriptions, or environments (dev/prod must be isolated).\n- Hub-and-spoke design with shared services (firewall, VPN gateway) in a hub.\n- Compliance requires network-level isolation, such as a separate PCI zone.',
      '**Interview answer:** "Yes. For a single application, I would use one VNet with separate subnets for frontend, backend, and data, and use NSGs to control the traffic between them: only the frontend can reach the backend on 8080, and only the backend can reach the database private endpoint on 1433. Because subnets in a VNet can talk to each other by default, I add explicit deny rules for everything else. It\'s simpler and cheaper than three peered VNets. I would use separate VNets only for stronger isolation, such as different environments, teams, or a hub-and-spoke setup."',
    ],
    code: [
      {
        title: 'One VNet, three subnets',
        language: 'text',
        code: `VNet: vnet-app-prod (10.10.0.0/16)
 |
 +-- snet-frontend   10.10.1.0/24   App Gateway / web tier
 |        | allow 443 from internet, allow -> backend 8080
 |
 +-- snet-backend    10.10.2.0/24   API / AKS nodes
 |        | allow 8080 from frontend only, allow -> db 1433
 |
 +-- snet-data       10.10.3.0/24   Private endpoint for Azure SQL
          | allow 1433 from backend only, deny everything else`,
      },
      {
        title: 'Example NSG for the data subnet (Terraform)',
        language: 'hcl',
        code: `resource "azurerm_network_security_group" "data" {
  name                = "nsg-data"
  location            = var.location
  resource_group_name = var.rg_name

  security_rule {
    name                       = "allow-backend-sql"
    priority                   = 100
    direction                  = "Inbound"
    access                     = "Allow"
    protocol                   = "Tcp"
    source_address_prefix      = "10.10.2.0/24" # backend subnet
    source_port_range          = "*"
    destination_address_prefix = "10.10.3.0/24"
    destination_port_range     = "1433"
  }

  security_rule {
    name                       = "deny-all-other-vnet"
    priority                   = 4000
    direction                  = "Inbound"
    access                     = "Deny"
    protocol                   = "*"
    source_address_prefix      = "VirtualNetwork"
    source_port_range          = "*"
    destination_address_prefix = "*"
    destination_port_range     = "*"
  }
}

resource "azurerm_subnet_network_security_group_association" "data" {
  subnet_id                 = azurerm_subnet.data.id
  network_security_group_id = azurerm_network_security_group.data.id
}`,
      },
    ],
    tags: ['azure', 'networking', 'vnet', 'subnets', 'nsg'],
  },
  {
    id: 'itv-repm3-21',
    level: 'advanced',
    kind: 'scenario',
    prompt: 'How do you handle CIDR mismatch (overlapping address) issues in VNets?',
    probing:
      'Why overlaps break peering and VPN routing, prevention through an IP plan, and the realistic fixes for an existing overlap.',
    answer: [
      'A CIDR mismatch usually means **overlapping IP ranges**: two networks use the same or overlapping address space. Azure **cannot peer** overlapping VNets, and VPN/ExpressRoute routing breaks because the router cannot tell which network an IP belongs to.',
      'Other related CIDR issues:',
      '- A subnet range is not inside the VNet address space.\n- The subnet is too small, so AKS nodes or pods run out of IPs.\n- The AKS service CIDR overlaps with a VNet or on-prem range.',
      '**Prevention (best answer)**',
      '1. **Plan IP addresses centrally** (IPAM): keep one sheet or use Azure Virtual Network Manager IPAM pools. Give each environment or region its own non-overlapping block, for example:',
      '- **Network**: On-premises; **CIDR**: 10.0.0.0/14\n- **Network**: Hub; **CIDR**: 10.8.0.0/22\n- **Network**: Dev spoke; **CIDR**: 10.10.0.0/16\n- **Network**: Prod spoke; **CIDR**: 10.20.0.0/16',
      '2. **Calculate subnets in Terraform** instead of typing them by hand:',
      '3. Review new VNets in PRs against the IP plan, and use Azure Policy to restrict allowed address ranges.',
      '**Fixing an existing overlap**',
      "- **Situation**: The overlapping range is not used yet; **Fix**: Change or add the VNet address space (Azure allows updating the address space even on peered VNets, followed by a peering sync)\n- **Situation**: Resources already use the range; **Fix**: Create a new VNet with a correct range, migrate workloads, then remove the old one (re-IP)\n- **Situation**: Cannot re-IP (e.g. partner network); **Fix**: Use NAT on Azure Firewall/NVA or a VPN gateway NAT rule to translate addresses\n- **Situation**: Only one service needs to be shared; **Fix**: Expose it with **Private Link**: it works even when the address ranges overlap\n- **Situation**: AKS pods use too many VNet IPs; **Fix**: Use Azure CNI Overlay, so pod IPs don't come from the VNet",
      '**Interview answer:** "Overlapping CIDRs block VNet peering and break VPN routing, so the best fix is prevention: a central IP plan with non-overlapping ranges per environment and region, and subnets calculated in Terraform with `cidrsubnet`. If an overlap already exists, I change the address space if it is unused, otherwise I migrate the workloads to a new VNet with a correct range. When re-IP is not possible, for example with a partner network, I use NAT or expose only the needed service through Private Link, which works across overlapping ranges."',
    ],
    followUps: [
      'When would you use NAT on a VPN gateway instead of re-addressing?',
      'How does Azure Virtual Network Manager IPAM help?',
      'How do you re-address a VNet that already has running workloads?',
    ],
    code: [
      {
        title: 'Overlapping ranges',
        language: 'text',
        code: `On-premises:   10.0.0.0/16
Azure VNet A:  10.0.0.0/16   <-- overlap: VPN routes are ambiguous
Azure VNet B:  10.1.0.0/16   <-- fine`,
      },
      {
        title: 'Calculate subnets with cidrsubnet',
        language: 'hcl',
        code: `variable "vnet_cidr" {
  default = "10.10.0.0/16"
}

locals {
  subnets = {
    frontend = cidrsubnet(var.vnet_cidr, 8, 1) # 10.10.1.0/24
    backend  = cidrsubnet(var.vnet_cidr, 8, 2) # 10.10.2.0/24
    data     = cidrsubnet(var.vnet_cidr, 8, 3) # 10.10.3.0/24
  }
}`,
      },
      {
        title: 'Check address spaces and peerings',
        language: 'bash',
        code: `az network vnet list --query "[].{name:name, cidr:addressSpace.addressPrefixes}" -o table
az network vnet peering list -g rg-network --vnet-name vnet-hub -o table`,
      },
    ],
    tags: ['azure', 'networking', 'vnet', 'cidr', 'ipam', 'terraform'],
  },
  {
    id: 'itv-repm3-22',
    level: 'intermediate',
    kind: 'open',
    prompt: 'Have you used GitLab for deployment? How?',
    probing:
      'Mapping GitLab CI concepts to Azure DevOps and deploying to AKS without stored secrets using OIDC federation.',
    answer: [
      'GitLab CI/CD uses a `.gitlab-ci.yml` file in the repository. Pipelines run on **GitLab Runners** (shared or self-hosted). The concepts map directly to Azure DevOps:',
      '- **Azure DevOps**: `azure-pipelines.yml`; **GitLab**: `.gitlab-ci.yml`\n- **Azure DevOps**: Agent / agent pool; **GitLab**: Runner (shell, Docker, or Kubernetes executor)\n- **Azure DevOps**: Stages / jobs; **GitLab**: `stages` / jobs\n- **Azure DevOps**: Variable groups, Key Vault; **GitLab**: CI/CD variables (masked, protected), or Vault/Key Vault\n- **Azure DevOps**: Environments + approvals; **GitLab**: `environment` + `when: manual` + protected environments\n- **Azure DevOps**: Service connection; **GitLab**: OIDC `id_tokens` with an Azure federated credential\n- **Azure DevOps**: Pipeline artifacts; **GitLab**: `artifacts:`',
      '**Example: Spring Boot to AKS**',
      'Key points to mention:',
      '- **No stored Azure secret:** GitLab issues an OIDC token (`id_tokens`), and an Azure federated credential trusts it for that project and branch.\n- **Sonar token** is a masked, protected CI/CD variable.\n- **Production** is a protected environment with a manual approval.\n- **Private AKS:** use a self-hosted runner inside the VNet (same idea as Q18).\n- **Maven cache** speeds up builds (same idea as Q1).',
      '**Interview answer:** "Yes. In GitLab, the pipeline is defined in `.gitlab-ci.yml` with stages for build, scan, package, and deploy. The build job runs Maven with caching and stores the JAR as an artifact, SonarQube runs with the Quality Gate, and the image is built and pushed to ACR. For Azure authentication, I use GitLab OIDC tokens with a federated credential, so no secrets are stored. Dev deploys automatically from the develop branch, and production is a protected environment with a manual approval. For a private AKS cluster, the deploy job runs on a self-hosted runner inside the VNet."',
      'If your main experience is Azure DevOps, say so honestly and explain that the concepts map one-to-one, as in the table above.',
    ],
    code: [
      {
        title: '.gitlab-ci.yml: Spring Boot to AKS',
        language: 'yaml',
        code: `stages:
  - build
  - scan
  - package
  - deploy

variables:
  MAVEN_OPTS: "-Dmaven.repo.local=$CI_PROJECT_DIR/.m2/repository"
  IMAGE: "myacr.azurecr.io/springboot-app:$CI_COMMIT_SHORT_SHA"

.azure_login: &azure_login
  - az login --service-principal -u "$AZURE_CLIENT_ID" -t "$AZURE_TENANT_ID" --federated-token "$AZURE_JWT"

build:
  stage: build
  image: maven:3.9-eclipse-temurin-17
  cache:
    key: maven
    paths:
      - .m2/repository
  script:
    - mvn -B clean verify
  artifacts:
    paths:
      - target/*.jar

sonarqube:
  stage: scan
  image: maven:3.9-eclipse-temurin-17
  script:
    - mvn -B sonar:sonar -Dsonar.qualitygate.wait=true

docker_build:
  stage: package
  image: mcr.microsoft.com/azure-cli
  id_tokens:
    AZURE_JWT:
      aud: api://AzureADTokenExchange
  script:
    - *azure_login
    - az acr build --registry myacr --image "springboot-app:$CI_COMMIT_SHORT_SHA" .

deploy_dev:
  stage: deploy
  image: mcr.microsoft.com/azure-cli
  id_tokens:
    AZURE_JWT:
      aud: api://AzureADTokenExchange
  environment:
    name: dev
  script:
    - *azure_login
    - az aks install-cli
    - az aks get-credentials -g rg-aks-dev -n aks-dev
    - kubelogin convert-kubeconfig -l azurecli
    - kubectl set image deployment/springboot-app springboot-app="$IMAGE" -n dev
    - kubectl rollout status deployment/springboot-app -n dev
  rules:
    - if: $CI_COMMIT_BRANCH == "develop"

deploy_prod:
  stage: deploy
  # same image, id_tokens, and script as deploy_dev, targeting the prod cluster
  environment:
    name: production
  when: manual
  rules:
    - if: $CI_COMMIT_BRANCH == "main"`,
      },
    ],
    tags: ['gitlab', 'ci/cd', 'aks', 'oidc'],
  },
  {
    id: 'itv-repm3-23',
    level: 'advanced',
    kind: 'scenario',
    prompt:
      'How do you create 30 VMs with Terraform in 3 different sets of 10, and how do you install dependencies on them?',
    probing:
      'Data-driven for_each over a map of groups, why count is fragile, and cloud-init or Ansible for per-group configuration.',
    answer: [
      'Scenario: 10 web VMs, 10 app VMs, and 10 DB VMs. Each set has a different size and needs different software.',
      '**Part 1: Create the VMs with one resource block**',
      'Do **not** write 30 resource blocks or 3 copies of the same code. Define the sets as data, and use `for_each`.',
      'Why `for_each` and not `count`: with `count`, deleting VM number 3 shifts the index of every VM after it, and Terraform wants to recreate them. With `for_each`, each VM has a stable key like `web-3`.',
      'To add 5 more app VMs, change `count = 15` for `app`. Nothing else changes.',
      '**Part 2: Install dependencies on each set**',
      '- **Option**: **cloud-init** (`custom_data`); **How**: A different cloud-init file per group runs on first boot; **Best for**: Simple bootstrap: install packages, create users\n- **Option**: **Ansible** (recommended for config); **How**: Dynamic inventory groups VMs by the `role` tag; one playbook per role; **Best for**: Ongoing configuration, updates, and consistency across all 30 VMs\n- **Option**: **Packer golden image**; **How**: Bake the software into an image per role and store it in Azure Compute Gallery; **Best for**: Fast, identical VMs, fewer runtime failures\n- **Option**: VM Custom Script Extension; **How**: Terraform runs a script through the VM extension; **Best for**: Small one-off scripts',
      'Avoid Terraform `remote-exec` provisioners for this; they are hard to rerun and debug.',
      '**Example cloud-init for the web group** (`cloud-init/web.yaml`):',
      '**Example Ansible dynamic inventory** (`inventory.azure_rm.yml`):',
      'This creates the groups `role_web`, `role_app`, and `role_db` automatically from the tags.',
      '**Playbook** (`site.yml`):',
      'If all 10 VMs in a set are identical and need autoscaling, a **VM Scale Set** per role is even better than 10 separate VMs.',
      '**Interview answer:** "I define the three sets as a map variable, with count and size per group, flatten it into 30 entries in a local, and create all VMs with one resource block using `for_each`, so each VM has a stable key like `web-3` and has a `role` tag. For dependencies, I use cloud-init for first-boot basics and Ansible for real configuration: the Azure dynamic inventory groups the VMs by the role tag, and I run one playbook with separate plays for web, app, and DB. If we need faster and more consistent builds, I bake a golden image per role with Packer. I avoid Terraform provisioners for software installation."',
    ],
    followUps: [
      'Why is for_each with stable keys safer than count when removing one VM?',
      'When would you choose a VM Scale Set per role instead?',
      'How do you rerun configuration on existing VMs without recreating them?',
    ],
    code: [
      {
        title: 'Three VM sets with for_each',
        language: 'hcl',
        code: `variable "vm_groups" {
  default = {
    web = { count = 10, size = "Standard_B2s" }
    app = { count = 10, size = "Standard_D2s_v5" }
    db  = { count = 10, size = "Standard_D4s_v5" }
  }
}

locals {
  # Builds a flat map: web-1 ... web-10, app-1 ... app-10, db-1 ... db-10
  vms = merge([
    for group, cfg in var.vm_groups : {
      for i in range(1, cfg.count + 1) :
      "\${group}-\${i}" => { group = group, size = cfg.size }
    }
  ]...)
}

resource "azurerm_network_interface" "nic" {
  for_each            = local.vms
  name                = "nic-\${each.key}"
  location            = var.location
  resource_group_name = var.rg_name

  ip_configuration {
    name                          = "internal"
    subnet_id                     = var.subnet_ids[each.value.group]
    private_ip_address_allocation = "Dynamic"
  }
}

resource "azurerm_linux_virtual_machine" "vm" {
  for_each              = local.vms
  name                  = "vm-\${each.key}"
  location              = var.location
  resource_group_name   = var.rg_name
  size                  = each.value.size
  admin_username        = "azureuser"
  network_interface_ids = [azurerm_network_interface.nic[each.key].id]

  admin_ssh_key {
    username   = "azureuser"
    public_key = var.ssh_public_key
  }

  os_disk {
    caching              = "ReadWrite"
    storage_account_type = "Premium_LRS"
  }

  source_image_reference {
    publisher = "Canonical"
    offer     = "ubuntu-24_04-lts"
    sku       = "server"
    version   = "latest"
  }

  # Bootstrap per group (see Part 2)
  custom_data = base64encode(file("\${path.module}/cloud-init/\${each.value.group}.yaml"))

  tags = {
    role = each.value.group
  }
}`,
      },
      {
        title: 'cloud-init for the web group',
        language: 'yaml',
        code: `#cloud-config
package_update: true
packages:
  - nginx
runcmd:
  - systemctl enable --now nginx`,
      },
      {
        title: 'Ansible Azure dynamic inventory',
        language: 'yaml',
        code: `plugin: azure.azcollection.azure_rm
include_vm_resource_groups:
  - rg-app-dev
auth_source: auto
keyed_groups:
  - prefix: role
    key: tags.role`,
      },
      {
        title: 'Playbook per role',
        language: 'yaml',
        code: `- hosts: role_web
  become: true
  tasks:
    - name: Install nginx
      ansible.builtin.apt:
        name: nginx
        state: present
        update_cache: true

- hosts: role_app
  become: true
  tasks:
    - name: Install Java 17
      ansible.builtin.apt:
        name: openjdk-17-jre-headless
        state: present
        update_cache: true

- hosts: role_db
  become: true
  tasks:
    - name: Install PostgreSQL
      ansible.builtin.apt:
        name: postgresql
        state: present
        update_cache: true`,
      },
      {
        title: 'Run the playbook',
        language: 'bash',
        code: `ansible-playbook -i inventory.azure_rm.yml site.yml`,
      },
      {
        title: 'End-to-end flow',
        language: 'text',
        code: `Packer (optional) -> golden image per role
       |
Terraform         -> 30 VMs from one for_each, tagged role=web/app/db
       |
cloud-init        -> first-boot basics
       |
Ansible           -> role-based configuration, rerun anytime to keep VMs consistent`,
      },
    ],
    tags: ['terraform', 'for-each', 'azure', 'vm', 'cloud-init', 'ansible'],
  },
]
