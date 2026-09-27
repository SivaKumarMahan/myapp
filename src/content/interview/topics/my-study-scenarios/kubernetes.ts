import type { InterviewQuestion } from '../../../types'

/** Kubernetes and AKS failure scenarios: YAML, Services, probes, OOMKilled, image pulls, 502/504 and routing. */
export const myStudyScenariosKubernetesQuestions: InterviewQuestion[] = [
  {
    id: 'itv-mystsc-1',
    level: 'basic',
    kind: 'scenario',
    prompt:
      'Kubernetes YAML indentation: what is wrong with this Deployment manifest, and how would you fix it?',
    promptCode: [
      {
        title: 'The broken YAML',
        language: 'yaml',
        code: `apiVersion: apps/v1
kind: Deployment

metadata:
name: payment-api

spec:
replicas: 3
selector:
matchLabels:
app: payment

template:
metadata:
labels:
app: payment

spec:
containers:
- image: nginx
  ports:
  - containerPort: 80`,
      },
    ],
    probing:
      'Whether you can read YAML structure, spot a missing container name, and know resources belong in every production manifest.',
    answer: [
      '**What is wrong**\nYAML uses indentation to show which fields belong to which parent. In this file, `name`, `spec`, `replicas`, `selector`, `matchLabels`, `app`, `template`, `labels`, and the inner `spec` are all written at column 0, so YAML cannot tell they belong under `metadata` or `spec`. On top of that:',
      '- There is no `containers.name` field, only `image`.\n- The Pod template `spec.containers` has no resource requests/limits.\n- `selector.matchLabels` (`app: payment`) does not clearly match the Pod template labels because the indentation is broken, so Kubernetes cannot verify the Deployment can manage its own Pods.',
      "**Short interview answer**\n\"The YAML is broken because every field is at the same indentation level, so the parser can't tell what's nested under `metadata` or `spec`. I'd re-indent it properly (2 spaces per level), add the missing `name` field under each container, and add resource requests/limits, which are missing but important for scheduling and stability.\"",
    ],
    code: [
      {
        title: 'Corrected YAML',
        language: 'yaml',
        code: `apiVersion: apps/v1
kind: Deployment
metadata:
  name: payment-api
spec:
  replicas: 3
  selector:
    matchLabels:
      app: payment
  template:
    metadata:
      labels:
        app: payment
    spec:
      containers:
        - name: payment-api
          image: nginx
          ports:
            - containerPort: 80
          resources:
            requests:
              cpu: "100m"
              memory: "128Mi"
            limits:
              cpu: "250m"
              memory: "256Mi"`,
      },
    ],
    tags: ['kubernetes', 'yaml', 'deployment'],
  },
  {
    id: 'itv-mystsc-2',
    level: 'intermediate',
    kind: 'scenario',
    prompt:
      'Kubernetes Service selector mismatch: the Deployment Pods are labeled `app: payment-api`, but the Service selects `app: payment`. What is wrong, and how do you troubleshoot it?',
    promptCode: [
      {
        title: 'The setup',
        language: 'yaml',
        code: `labels:
  app: payment-api`,
      },
      {
        title: 'The setup (2)',
        language: 'yaml',
        code: `selector:
  app: payment`,
      },
    ],
    probing:
      'Whether you know Services route by exact label match and reach for `kubectl get endpoints` first.',
    answer: [
      "**What is wrong**\nThe Service's `selector` (`app: payment`) does not match the Pod label (`app: payment-api`). A Service only sends traffic to Pods whose labels match its selector exactly (label values, not substrings). Since nothing matches, the Service has **zero endpoints**, so any request to it fails with a connection error.",
      "There's a second issue: `targetPort: 8080` — this only works if the container actually listens on 8080. If the Deployment's container port is different, that's a second reason for failures even after the selector is fixed.",
      "**How to troubleshoot**\n`kubectl get endpoints` is the fastest check — if it shows `<none>`, the selector doesn't match any Pod.",
      '**Short interview answer**\n"Services route traffic based on label selectors, and here the Service selector doesn\'t match the Pod labels, so it has no endpoints. I\'d confirm with `kubectl get endpoints`, then fix the selector to match the actual Pod labels, and double-check `targetPort` matches the port the container listens on."',
    ],
    code: [
      {
        title: 'How to troubleshoot',
        language: 'bash',
        code: `kubectl get pods --show-labels
kubectl describe svc payment-service
kubectl get endpoints payment-service`,
      },
      {
        title: 'Fix',
        language: 'yaml',
        code: `spec:
  selector:
    app: payment-api
  ports:
    - port: 80
      targetPort: 8080`,
      },
    ],
    tags: ['kubernetes', 'services', 'troubleshooting'],
  },
  {
    id: 'itv-mystsc-3',
    level: 'intermediate',
    kind: 'scenario',
    prompt:
      'All Pods show `Running` and `1/1` ready, but users get HTTP 503. Why doesn\'t "Running" mean "working", and how do you troubleshoot it?',
    probing:
      'Whether you troubleshoot in a sensible order - endpoints, readiness, events, logs, Ingress - instead of trusting the Pod status.',
    answer: [
      '**Why "Running" doesn\'t mean "working"**\n`Running` only means the container process started — it says nothing about whether the app inside is actually healthy or accepting traffic correctly.',
      '**Commands to troubleshoot, in order**\n503 from an Ingress/Gateway usually means the upstream Service has no healthy backend — even though Pods show `Running`, they might be failing readiness probes, or the app might be throwing errors on every request (e.g., a bad DB connection) while still staying "up."',
      '**Short interview answer**\n"Running doesn\'t mean healthy. I\'d check `kubectl get endpoints` first to see if the Service actually has backends, then check readiness state and pod events, then look at application logs, and finally test connectivity directly inside the cluster to isolate whether the problem is the app, the Service, or the Ingress."',
    ],
    code: [
      {
        title: 'Commands to troubleshoot, in order',
        language: 'bash',
        code: `# 1. Confirm the Service has real endpoints
kubectl get endpoints payment-service

# 2. Check readiness — Running pods can still be NotReady
kubectl get pods -o wide

# 3. Look at recent events (crashes, probe failures, scheduling issues)
kubectl describe pod payment-api-6d7f8c9d-x1a2

# 4. Check application logs for errors
kubectl logs payment-api-6d7f8c9d-x1a2
kubectl logs payment-api-6d7f8c9d-x1a2 --previous

# 5. Check if the Ingress/Gateway can reach the Service
kubectl describe ingress payment-ingress

# 6. Test directly from inside the cluster, bypassing Ingress
kubectl run -it --rm debug --image=busybox --restart=Never -- \\
  wget -qO- http://payment-service`,
      },
    ],
    tags: ['kubernetes', 'troubleshooting', 'ingress'],
  },
  {
    id: 'itv-mystsc-4',
    level: 'intermediate',
    kind: 'scenario',
    prompt:
      'CrashLoopBackOff caused by OOMKilled: `kubectl describe` shows `Reason: OOMKilled` and `Exit Code: 137`. What does it mean and what do you check next?',
    promptCode: [
      {
        title: 'What the describe output shows',
        language: 'text',
        code: `Last State:     Terminated
Reason:         OOMKilled
Exit Code:      137`,
      },
    ],
    probing:
      'Whether you can decode exit code 137 and tell an undersized limit apart from a memory leak before changing anything.',
    answer: [
      "**What this means**\n`OOMKilled` means the container tried to use more memory than its configured `resources.limits.memory`, so the kernel killed it. Kubernetes then restarts it, it hits the same memory limit again, and gets killed again — that's the crash loop. Exit code 137 = 128 + 9 (SIGKILL), confirming it was force-killed, not a normal app crash.",
      '**What to check next**\nThen decide:',
      '- Is the limit just too low for normal usage? → Increase `resources.limits.memory`.\n- Is the app leaking memory over time? → Fix the leak; increasing the limit only delays the crash.\n- Did traffic or batch size spike? → Consider HPA or reducing per-request memory use.',
      '**Short interview answer**\n"OOMKilled with exit code 137 means the container exceeded its memory limit and the kernel killed it, which causes the restart loop. I\'d check actual memory usage with `kubectl top pod` versus the configured limit, look at the app logs for signs of a memory leak, and either raise the memory limit if it\'s genuinely under-provisioned or fix the leak if usage keeps climbing over time."',
    ],
    code: [
      {
        title: 'What to check next',
        language: 'bash',
        code: `kubectl top pod payment-api        # actual memory usage vs limit
kubectl describe pod payment-api   # confirm limits and OOM events
kubectl logs payment-api --previous`,
      },
    ],
    tags: ['kubernetes', 'oomkilled', 'troubleshooting'],
  },
  {
    id: 'itv-mystsc-5',
    level: 'intermediate',
    kind: 'scenario',
    prompt:
      'A container using `myacr.azurecr.io/payment-api:v25` is stuck in `ImagePullBackOff`. What are the possible causes and how do you troubleshoot it?',
    promptCode: [
      {
        title: 'The setup',
        language: 'yaml',
        code: `containers:
  - name: payment-api
    image: myacr.azurecr.io/payment-api:v25`,
      },
    ],
    probing:
      'Whether you let the exact pull error in `kubectl describe` point you at the tag, auth, DNS/network or AcrPull cause.',
    answer: [
      '**Possible causes of the ImagePullBackOff**',
      "1. **Tag doesn't exist** — `v25` was never pushed to the registry.\n2. **Authentication failure** — the cluster has no (or an expired) `imagePullSecret` for a private ACR.\n3. **Wrong registry name** — typo in `myacr.azurecr.io`.\n4. **Network/firewall issue** — node can't reach the registry (private endpoint, NSG, DNS).\n5. **ACR access not granted to AKS** — AKS's managed identity/kubelet identity was never given `AcrPull` role on that ACR.",
      '**How to troubleshoot**\n`kubectl describe pod` is the key command — the Events section shows the exact reason (`manifest unknown`, `unauthorized`, `no such host`, etc.), which tells you which of the causes above applies.',
      "**Short interview answer**\n\"ImagePullBackOff usually means the image tag doesn't exist, the registry credentials are missing or expired, or AKS's identity doesn't have `AcrPull` on that ACR. I'd start with `kubectl describe pod` to see the exact error message, then verify the tag exists in ACR and check the role assignment or imagePullSecret depending on what the error says.\"",
    ],
    code: [
      {
        title: 'How to troubleshoot',
        language: 'bash',
        code: `kubectl describe pod payment-api        # shows the exact pull error message
az acr repository show-tags --name myacr --repository payment-api
az acr show --name myacr --query loginServer
az role assignment list --scope <acr-resource-id>
kubectl get secrets                     # check if an imagePullSecret exists`,
      },
    ],
    tags: ['kubernetes', 'aks', 'acr', 'troubleshooting'],
  },
  {
    id: 'itv-mystsc-6',
    level: 'intermediate',
    kind: 'scenario',
    prompt:
      'The app takes about 60 seconds to start, but with these probes the Pod keeps restarting. What is wrong and how do you fix it?',
    promptCode: [
      {
        title: 'The setup',
        language: 'yaml',
        code: `livenessProbe:
  httpGet:
    path: /health
    port: 8080
  initialDelaySeconds: 5
  periodSeconds: 5

readinessProbe:
  httpGet:
    path: /health
    port: 8080`,
      },
    ],
    probing:
      'Whether you understand liveness vs readiness vs startup probes and why an early liveness probe causes a restart loop.',
    answer: [
      '**What is wrong**\n`initialDelaySeconds: 5` means Kubernetes starts checking `/health` after only 5 seconds. Since the app takes 60 seconds to be ready, the liveness probe fails repeatedly during startup. Kubernetes treats liveness failures as "the app is broken" and kills/restarts the container — so it never gets the chance to finish starting. This creates an endless restart loop for an app that was never actually broken.',
      "**The fix**\nUse a **startupProbe** so the liveness/readiness probes don't even start checking until the app has actually finished booting:",
      "If a `startupProbe` isn't available/desired, a simpler (older) fix is to just raise `initialDelaySeconds` past the known startup time, e.g. `initialDelaySeconds: 75`, though this wastes time once the app becomes fast to start again in the future.",
      '**Short interview answer**\n"The liveness probe starts checking too early — only 5 seconds in — for an app that needs 60 seconds to boot, so Kubernetes kills it mid-startup and it never becomes healthy. The correct fix is to add a `startupProbe` with enough attempts to cover the real startup time, so liveness and readiness checks only begin once the app has actually started."',
    ],
    code: [
      {
        title: 'The fix',
        language: 'yaml',
        code: `startupProbe:
  httpGet:
    path: /health
    port: 8080
  failureThreshold: 30
  periodSeconds: 2   # allows up to 60s (30 x 2) for startup

livenessProbe:
  httpGet:
    path: /health
    port: 8080
  periodSeconds: 5
  failureThreshold: 3

readinessProbe:
  httpGet:
    path: /health
    port: 8080
  periodSeconds: 5
  failureThreshold: 3`,
      },
    ],
    tags: ['kubernetes', 'probes', 'troubleshooting'],
  },
  {
    id: 'itv-mystsc-7',
    level: 'basic',
    kind: 'open',
    prompt: 'What happens when one Pod of a Deployment goes down?',
    probing:
      'Whether you know the ReplicaSet restores the count and the Service only routes to ready Pods - and what Kubernetes does not handle for you.',
    answer: [
      'For normal stateless replicas, pods do not directly coordinate recovery. Kubernetes controllers and Services handle it.',
      'Suppose a Deployment requires three replicas:',
      'The recovery flow is:',
      "1. Kubernetes detects that Pod 2 is no longer healthy or running.\n2. The Deployment's ReplicaSet sees that only two replicas remain and creates a replacement pod.\n3. The Service stops routing new traffic to the failed or unready pod.\n4. Pod 1 and Pod 3 continue handling requests.\n5. The replacement pod starts and runs its readiness probe.\n6. After the readiness probe succeeds, Kubernetes adds it to the Service endpoints and it begins receiving traffic.",
      'Clients should connect through the Service rather than to individual pod IP addresses because pods are temporary and their IP addresses can change.',
      '**Important distinction**\nKubernetes coordinates pod replacement and traffic routing, but it does not manage application data consistency. Stateful or distributed applications may still need their own leader election, replication, quorum, or recovery logic.',
      '**Short interview answer**\nWhen a pod fails, the Deployment creates a replacement to restore the desired replica count. During recovery, the Service routes traffic only to ready pods. Once the new pod passes its readiness probe, it is added to the Service and starts receiving traffic. Distributed applications may also require their own coordination logic for data and leadership.',
    ],
    code: [
      {
        title: 'Suppose a Deployment requires three replicas',
        language: 'text',
        code: `Pod 1: Ready
Pod 2: Failed
Pod 3: Ready`,
      },
    ],
    tags: ['kubernetes', 'deployments', 'high availability'],
  },
  {
    id: 'itv-mystsc-8',
    level: 'advanced',
    kind: 'scenario',
    prompt: 'How do you troubleshoot OOMKilled Pods?',
    probing:
      'Whether you confirm the cause, compare usage with limits, and separate a leak from genuine load before raising limits.',
    answer: [
      'An `OOMKilled` status means the container used more memory than its configured limit, so the Linux kernel killed the process to protect the node.',
      '**Confirm the reason**\n`kubectl describe pod <pod-name>`',
      'Check the Events section for `Reason: OOMKilled`, and note the exit code (`137`, which is `128 + SIGKILL`).',
      '**Check current memory usage**\nThis shows whether the container is genuinely near its limit, and whether the node itself is under memory pressure.',
      '**Review resource requests and limits**\nConfirm the limit is actually appropriate for the workload rather than an arbitrary guess - see the resource requests and limits question.',
      '**Check the application itself**',
      '- Look for memory leaks.\n- Check whether a recent deployment increased memory usage (new dependency, new caching behavior, a changed batch size).\n- Review logs from the crashed container specifically:',
      '`kubectl logs <pod-name> --previous`',
      '**Monitor memory over time**\nUse Prometheus and Grafana to see whether memory grows steadily (a leak) or spikes under specific traffic (a genuine capacity issue) - see the AKS monitoring with Prometheus and Grafana question.',
      '**Decide: raise the limit, or fix the application**\nIf traffic-driven memory growth is expected and legitimate, consider a Horizontal Pod Autoscaler so load is spread across more replicas instead of concentrated in one container. If a Java application has a 512Mi limit but needs 700Mi at peak, confirm the usage is genuine load (not a leak) before simply raising the limit.',
      "**Short interview answer**\nI'd confirm the OOMKilled event and exit code with `kubectl describe pod`, check current memory pressure with `kubectl top`, and review the configured requests/limits. Then I'd check the application for a memory leak or a recent change that increased memory use, using `kubectl logs --previous` for the crashed container. I'd monitor memory over time with Prometheus/Grafana to distinguish a leak from genuine load, and either raise the limit (if justified) or fix the application - adding HPA if the growth is traffic-driven.",
    ],
    code: [
      {
        title: 'Check current memory usage',
        language: 'bash',
        code: `kubectl top pod <pod-name>
kubectl top node`,
      },
      {
        title: 'Review resource requests and limits',
        language: 'yaml',
        code: `resources:
  requests:
    memory: 512Mi
  limits:
    memory: 1Gi`,
      },
    ],
    followUps: [
      'How would you tell a memory leak from legitimate traffic growth on a Grafana dashboard?',
      'Why can a JVM application be OOMKilled even when its heap looks fine?',
    ],
    tags: ['kubernetes', 'oomkilled', 'troubleshooting'],
  },
  {
    id: 'itv-mystsc-9',
    level: 'advanced',
    kind: 'scenario',
    prompt:
      'Pods in AKS start failing with `ImagePullBackOff` right after the cluster identity was changed. How do you troubleshoot it?',
    probing:
      'Whether you link the timing to the identity swap and check the AcrPull role assignment before blaming the image.',
    answer: [
      '`ImagePullBackOff` means Kubernetes cannot pull the container image. When this starts right after an identity change, the first suspect is that the new identity lost registry access - not the image itself.',
      '**Confirm the error**\n`kubectl describe pod <pod-name>`',
      'Check Events for `401 Unauthorized`, `403 Forbidden`, or `failed to pull image`.',
      '**Verify the managed identity**\nConfirm which identity the cluster is actually using now - for image pulls this is the kubelet identity (`identityProfile.kubeletidentity`).',
      '**Check ACR role assignments**\nThe identity needs `AcrPull` on the Azure Container Registry. If it was swapped (e.g. Identity A → Identity B) and only Identity A had `AcrPull`, pods lose the ability to authenticate to ACR immediately.',
      "**Verify the image name and tag**\nRule out a genuinely wrong reference before assuming it's purely a permissions issue.",
      '**Fix and restart**\nAssign `AcrPull` to the correct identity, then:',
      "**Short interview answer**\nSince the failure started after an identity change, I'd first verify which managed identity AKS is now using with `az aks show`, then check whether that identity has `AcrPull` on the registry with `az role assignment list`. If it doesn't - which is the common cause after an identity swap - I'd assign the role, confirm the image name/tag are correct, and restart the deployment to force a fresh pull.",
    ],
    code: [
      {
        title: 'Verify the managed identity',
        language: 'bash',
        code: `az aks show -g <resource-group> -n <cluster-name>`,
      },
      {
        title: 'Check ACR role assignments',
        language: 'bash',
        code: `az role assignment list --assignee <managed-identity-id>`,
      },
      {
        title: 'Assign AcrPull to the correct identity, then',
        language: 'bash',
        code: `kubectl rollout restart deployment <deployment-name>`,
      },
    ],
    followUps: [
      'What is the difference between the AKS cluster identity and the kubelet identity?',
      'How does `az aks update --attach-acr` help here?',
    ],
    tags: ['aks', 'acr', 'managed identity', 'troubleshooting'],
  },
  {
    id: 'itv-mystsc-10',
    level: 'basic',
    kind: 'open',
    prompt: 'What are resource requests and limits in Kubernetes, and why are they useful?',
    probing:
      'Whether you know requests drive scheduling while limits cap usage - CPU throttles, memory gets OOMKilled.',
    answer: [
      'Resource requests and limits control how much CPU and memory a container is expected and allowed to use.',
      '**Resource requests**\nA request tells Kubernetes how much CPU or memory a container normally needs. The scheduler uses requests to find a node with enough available capacity. In this example:',
      '- `500m` means half of one CPU core.\n- `512Mi` means 512 mebibytes of memory.',
      'A request is mainly a scheduling value. It does not stop the container from using more resources when capacity is available.',
      '**Resource limits**\nA limit is the maximum amount of a resource that the container may use.',
      'This container can use up to one CPU core and 1 GiB of memory.',
      "- If it tries to use more CPU than its limit, its CPU time is throttled.\n- If it exceeds its memory limit, it may be terminated with an `OOMKilled` reason and then restarted according to the pod's restart policy.",
      '**Complete example**\nThis configuration suits an application that normally needs about 0.5 CPU and 512 MiB of memory but occasionally needs more during a traffic spike.',
      '**Why they are useful**',
      '- Help the scheduler place pods on suitable nodes.\n- Stop one container from using too many shared resources.\n- Reduce resource contention between applications.\n- Improve cluster stability and predictable performance.\n- Give autoscalers useful resource information.',
      'Requests and limits should be based on measured application usage. Values that are too low can cause throttling, memory failures, or poor scheduling decisions. Values that are too high can waste cluster capacity.',
      '**Short interview answer**\nResource requests describe the CPU and memory a container needs, and the scheduler uses them when selecting a node. Limits define how much the container can use. CPU use above its limit is throttled, while exceeding a memory limit can cause `OOMKilled`. Correct values improve scheduling, stability, and resource sharing.',
    ],
    code: [
      {
        title: 'Resource requests',
        language: 'yaml',
        code: `resources:
  requests:
    cpu: "500m"
    memory: "512Mi"`,
      },
      {
        title: 'Resource limits',
        language: 'yaml',
        code: `resources:
  limits:
    cpu: "1"
    memory: "1Gi"`,
      },
      {
        title: 'Complete example',
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
    tags: ['kubernetes', 'resources', 'scheduling'],
  },
  {
    id: 'itv-mystsc-11',
    level: 'advanced',
    kind: 'scenario',
    prompt:
      'Application Gateway -> AKS Ingress -> Service -> Pods -> PostgreSQL: Pods show `1/1 Running`, but users get HTTP 502/504. How do you troubleshoot it?',
    promptCode: [
      {
        title: 'The architecture',
        language: 'text',
        code: `Internet
   |
Azure Application Gateway
   |
AKS Ingress
   |
Service
   |
Pods
   |
PostgreSQL`,
      },
    ],
    probing:
      'Whether you work the request path hop by hop and remember that mismatched timeouts across layers are a classic 504 cause.',
    answer: [
      "**Why healthy pods don't rule this out**\n502/504 are gateway-level errors — they mean something in front of the app failed to get a valid/timely response, which can happen even if the Pods themselves are running fine. The problem could be at any hop in the chain.",
      '**Troubleshooting approach, layer by layer**',
      "**1. Application Gateway layer**\nCheck if App Gateway considers the backend pool healthy. A 502 often means App Gateway couldn't reach its configured backend (misconfigured health probe path, backend pool pointing to the wrong target, or an expired/mismatched TLS cert on the backend).",
      '**2. Ingress / Service layer**\nConfirm the Ingress is correctly routing to the Service, and the Service has healthy endpoints.',
      '**3. Pod / application layer**\nA 504 (timeout) often means the app is alive but responding too slowly — check CPU throttling (`resources.limits.cpu` too low), thread pool exhaustion, or slow downstream calls.',
      '**4. Database layer**\nCheck PostgreSQL connection pool exhaustion, slow queries, or network latency/connectivity from AKS to PostgreSQL (especially if PostgreSQL is behind a private endpoint/VNet peering — check NSGs and DNS resolution).',
      "**5. Timeouts across layers**\nConfirm that App Gateway's request timeout, the Ingress controller's proxy timeout, and any app-level timeout to PostgreSQL are all consistent — a common 504 cause is App Gateway timing out before a legitimately slow backend (e.g., a slow DB query) finishes.",
      "**Short interview answer**\n\"502/504 with healthy pods means the problem isn't the container process itself — it's somewhere in the request path or the app is too slow to respond. I'd work through the chain in order: check Application Gateway's backend health and probe config, confirm the Ingress and Service actually have healthy endpoints, check the pod's CPU/memory and logs for slow responses, and then check PostgreSQL for connection pool exhaustion or slow queries — also comparing timeout settings across App Gateway, Ingress, and the app, since a mismatched timeout is a very common cause of 504s.\"",
    ],
    code: [
      {
        title: '1. Application Gateway layer',
        language: 'bash',
        code: `az network application-gateway show-backend-health \\
  --resource-group <rg> --name <appgw-name>`,
      },
      {
        title: '2. Ingress / Service layer',
        language: 'bash',
        code: `kubectl get ingress
kubectl describe ingress payment-ingress
kubectl get endpoints payment-service
kubectl logs -n <ingress-namespace> <ingress-controller-pod>`,
      },
      {
        title: '3. Pod / application layer',
        language: 'bash',
        code: `kubectl logs <pod> --tail=100
kubectl top pod`,
      },
      {
        title: '4. Database layer',
        language: 'bash',
        code: `kubectl exec -it <pod> -- pg_isready -h <postgres-host>`,
      },
    ],
    followUps: [
      'How would you configure the Application Gateway health probe for an AKS backend?',
      'How do you detect PostgreSQL connection pool exhaustion from the application side?',
    ],
    tags: ['aks', 'application gateway', 'troubleshooting', 'postgresql'],
  },
  {
    id: 'itv-mystsc-12',
    level: 'advanced',
    kind: 'scenario',
    prompt:
      'How do you troubleshoot Kubernetes routing issues, including a Service that is not reachable from outside the cluster?',
    probing:
      'Whether you troubleshoot from the inside out - Pods, EndpointSlices, Service, DNS, Ingress, load balancer - and test in-cluster first.',
    answer: [
      'I troubleshoot from the inside out, starting with the application and moving toward the user.',
      '**1. Check Pod health** - verify Pods are running and Ready. `kubectl get pods`',
      '**2. Check EndpointSlices** - ensure the Service has healthy backend endpoints.',
      '`kubectl get endpointslices`',
      '**3. Check the Service** - verify the selector matches the Pods, and confirm `port` and `targetPort` are correct.',
      '`kubectl describe svc <service-name>`',
      '**4. Check DNS** - verify the Service name resolves correctly.',
      '**5. Check Ingress** - verify host, path, and backend Service configuration, and make sure the Ingress Controller is running.',
      '`kubectl describe ingress <ingress-name>`',
      '**6. Check the external Load Balancer and firewall** - verify the Load Balancer is healthy, and check NSG/firewall rules and DNS records if traffic is coming from outside the cluster.',
      '**When the Service specifically isn\'t reachable from outside the cluster**\nThe steps above cover routing in general. When the specific complaint is "works inside the cluster, not from outside," add these:',
      '**Test from inside the cluster first** - before blaming the Ingress/Load Balancer, confirm the Service itself works from inside the cluster using a temporary debug Pod:',
      "If this fails, the problem is between Service and Pod/Application - the Ingress and Load Balancer aren't the issue yet. If it succeeds, move outward.",
      '**Confirm the Load Balancer actually has an external IP:**\nA `<pending>` `EXTERNAL-IP` means the cloud load balancer was never provisioned - that alone explains total external unreachability.',
      '**Confirm the external DNS record points at that Load Balancer IP**, and that the required ports are actually open - normally `80` and `443` - on the NSG/firewall in front of it.',
      '**Finally, review both the application logs and the Ingress Controller logs** - not just its config - since a config that looks correct can still be failing at the connection/upstream level.',
      '**Interview summary**\n"Ingress controls external HTTP/HTTPS routing to Kubernetes Services, while CoreDNS provides internal name resolution. When troubleshooting, I start from the application by checking Pod readiness, then EndpointSlices, Service selectors and ports, DNS resolution, Ingress rules and controller, and finally the external Load Balancer and firewall."',
    ],
    code: [
      {
        title: '4. Check DNS',
        language: 'bash',
        code: `nslookup <service-name>
dig <service-name>`,
      },
      {
        title: 'Test from inside the cluster first',
        language: 'bash',
        code: `kubectl run test-pod --rm -it --image=curlimages/curl -- sh
curl http://<service-name>:<port>`,
      },
      {
        title: 'Confirm the Load Balancer actually has an external IP',
        language: 'bash',
        code: `kubectl get svc <ingress-controller-service> -n ingress-nginx`,
      },
    ],
    followUps: [
      'What does a `<pending>` EXTERNAL-IP on the ingress controller Service tell you?',
      'How would you debug DNS resolution failures from inside a Pod?',
    ],
    tags: ['kubernetes', 'ingress', 'dns', 'troubleshooting'],
  },
]
