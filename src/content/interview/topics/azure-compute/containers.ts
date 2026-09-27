import type { InterviewQuestion } from '../../../types'

/** Choosing a container platform, Azure Container Registry and Container Apps. */
export const azureComputeContainerQuestions: InterviewQuestion[] = [
  {
    id: 'itv-azc-10',
    level: 'intermediate',
    kind: 'open',
    prompt:
      'You need to run a set of containerised microservices on Azure. How do you choose between App Service, Container Apps, AKS and Container Instances?',
    probing:
      'Platform selection judgement. They want the control-versus-operations tradeoff, not "AKS because Kubernetes".',
    answer: [
      'I decide by how much **Kubernetes control** the team genuinely needs versus how much **operational work** it can absorb.',
      '**Azure Container Apps** is my default for microservices. It is built on Kubernetes, KEDA, Envoy and Dapr, but the cluster is hidden: you deploy containers, get HTTP ingress with TLS, revisions and traffic splitting, **scale to zero** and event-driven scaling from queues or topics, and service-to-service discovery. No node pools, no upgrades, no ingress controller to run.',
      '**AKS** is right when you need the **Kubernetes API itself**: custom operators and CRDs, service meshes, specific networking or GPU node pools, DaemonSets, Helm charts from vendors, or a platform team that wants full control and portability. The price is that you own upgrades, node pools, add-ons, capacity and security hardening.',
      '**App Service** suits one or two web apps or APIs in containers that want the familiar web-hosting model - slots, easy custom domains, built-in auth. **Container Instances** runs a single container group on demand with no orchestration - batch tasks, short-lived jobs, build agents, or a burst target from AKS through virtual nodes.',
    ],
    diagrams: [
      {
        kind: 'decision',
        title: 'Which container platform?',
        caption: 'Choose the least operational burden that still gives you the control you need.',
        question: 'What does the workload need?',
        branches: [
          {
            condition: 'A web app or API, slots, simple',
            result: 'App Service',
          },
          {
            condition: 'Microservices, event scaling, no cluster ops',
            result: 'Container Apps',
            detail: 'Scale to zero, revisions, Dapr',
            tone: 'success',
          },
          {
            condition: 'Full Kubernetes API, operators, CRDs',
            result: 'AKS',
            detail: 'You own upgrades and nodes',
            tone: 'accent',
          },
          {
            condition: 'One-off or batch container',
            result: 'Container Instances',
            detail: 'Or Container Apps jobs',
            tone: 'muted',
          },
        ],
      },
    ],
    code: [
      {
        title: 'The same image on two platforms',
        language: 'bash',
        code: `# Container Apps: ingress, scale rules and revisions, no cluster
az containerapp up -n ca-orders -g rg-apps --environment cae-shop-prod \\
  --image acrshop.azurecr.io/orders:1.4.2 --ingress external --target-port 8080

# Container Instances: one container group, runs and exits
az container create -g rg-batch -n aci-report --image acrshop.azurecr.io/report:1.0 \\
  --restart-policy Never --cpu 2 --memory 4 \\
  --assign-identity --acr-identity [system]`,
      },
    ],
    traps: [
      'Choosing AKS for three stateless APIs because "Kubernetes is the standard".',
      'Using Container Instances as a long-running production service with no orchestration.',
      'Assuming Container Apps cannot be private - internal environments with VNet integration exist.',
    ],
    followUps: [
      'What would make you migrate from Container Apps to AKS?',
      'What does a Container Apps environment correspond to?',
    ],
    tags: ['container apps', 'aks', 'aci', 'app service', 'design'],
  },
  {
    id: 'itv-azc-11',
    level: 'basic',
    kind: 'mcq',
    prompt:
      'An AKS cluster must pull images from a private Azure Container Registry. What is the recommended way to authenticate?',
    options: [
      { id: 'a', text: 'Enable the ACR admin user and put its password in an imagePullSecret' },
      {
        id: 'b',
        text: 'Grant the cluster’s kubelet managed identity AcrPull on the registry, for example with az aks update --attach-acr',
      },
      {
        id: 'c',
        text: 'Make the registry’s repositories anonymous-pull so no authentication is needed',
      },
      {
        id: 'd',
        text: 'Store a service principal secret in every namespace as a Kubernetes secret',
      },
    ],
    correct: ['b'],
    probing:
      'Knowing that AKS pulls with the kubelet identity, and that shared admin credentials are the anti-pattern.',
    answer: [
      'Give the cluster’s **kubelet managed identity** the **AcrPull** role on the registry. `az aks update --attach-acr` does exactly that. Every node can then pull without any secret in the cluster.',
      'The admin user is a single shared credential with push rights and no audit trail per caller. Anonymous pull exposes your images to everyone. And per-namespace service principal secrets expire and leak - it is the pattern managed identity replaced.',
    ],
    code: [
      {
        title: 'Attach and verify',
        language: 'bash',
        code: `az aks update -g rg-aks -n aks-shop-prod --attach-acr acrshop

# Validates DNS, network and auth from inside the cluster
az aks check-acr -g rg-aks -n aks-shop-prod --acr acrshop.azurecr.io`,
      },
    ],
    traps: ['Leaving the ACR admin user enabled after testing.'],
    followUps: ['How does check-acr help when pulls fail from a private registry?'],
    tags: ['acr', 'aks', 'managed identity', 'basics'],
  },
  {
    id: 'itv-azc-12',
    level: 'intermediate',
    kind: 'open',
    prompt:
      'How would you set up Azure Container Registry for a production platform used by several teams and regions?',
    probing:
      'ACR beyond "docker push": SKUs, identity-based access, network isolation, geo-replication, builds and image hygiene.',
    answer: [
      'I would use the **Premium** SKU for production, because it is the tier with **geo-replication**, **private endpoints**, availability zone redundancy and the higher throughput limits. Basic and Standard are fine for dev and small teams.',
      '**Access** is identity-based only: the admin user disabled; clusters and apps pull with managed identities holding **AcrPull**; pipelines push with a workload identity federation identity holding **AcrPush**; and for many teams in one registry, **repository-scoped permissions** so one team cannot overwrite another’s images.',
      '**Network**: public access disabled or restricted, with **private endpoints** in the hub or each region and the `privatelink.azurecr.io` zone - which needs a record for the registry and one per regional **data endpoint**. **Geo-replication** puts a replica in each region the clusters run in, so pulls are local and survive a regional outage.',
      '**Image hygiene**: builds with **ACR Tasks** or the pipeline, immutable version tags rather than reusing `latest`, **Microsoft Defender for Containers** scanning for vulnerabilities, a **retention** or purge task for untagged manifests, and artifact cache rules for upstream public images so builds do not depend on Docker Hub rate limits.',
    ],
    code: [
      {
        title: 'A locked-down, geo-replicated registry',
        language: 'bash',
        code: `az acr create -g rg-acr -n acrshop --sku Premium --admin-enabled false \\
  --public-network-enabled false --zone-redundancy enabled

az acr replication create -r acrshop -l ukwest --zone-redundancy enabled

# Build in ACR - no Docker daemon needed on the agent
az acr build -r acrshop -t orders:1.4.2 -t orders:$(git rev-parse --short HEAD) .

# Purge untagged manifests older than 30 days, weekly
az acr task create -r acrshop -n purge-untagged --schedule "0 3 * * 0" \\
  --cmd "acr purge --filter '.*:.*' --untagged --ago 30d" --context /dev/null`,
      },
    ],
    deeper: [
      'Private endpoints for ACR need DNS for both the registry login server and each region’s data endpoint. Missing the data endpoint record gives the confusing symptom of a successful login and a failed layer download.',
      'Pin deployments by **digest** rather than tag when you need certainty that what was tested is what runs; tags are mutable unless you lock them.',
    ],
    traps: [
      'Standard SKU and then discovering private endpoints need Premium.',
      'Everyone pushing to latest.',
      'Forgetting the data endpoint DNS records with private endpoints.',
    ],
    followUps: [
      'How would you stop one team overwriting another team’s images?',
      'How do you make builds independent of Docker Hub availability?',
    ],
    tags: ['acr', 'containers', 'registry', 'security'],
  },
  {
    id: 'itv-azc-13',
    level: 'advanced',
    kind: 'open',
    prompt:
      'Explain how Azure Container Apps works: environments, revisions, scaling and ingress. How would you do a canary release on it?',
    probing:
      'Real Container Apps depth. They want the environment as the boundary, KEDA-based scale rules, revision modes, and traffic splitting.',
    answer: [
      'A **Container Apps environment** is the secure boundary - a shared network, often integrated into your VNet, with shared logging to Log Analytics. Apps in the same environment discover each other by name. Workload profiles let one environment mix serverless **Consumption** capacity with **dedicated** profiles for bigger or GPU workloads.',
      'Each **container app** has **revisions** - immutable snapshots created whenever you change the template, such as the image or environment variables. In **single revision** mode the new revision replaces the old once healthy. In **multiple revision** mode several revisions run at once and you split traffic between them by percentage or label.',
      '**Scaling** is KEDA-based: HTTP concurrency, TCP connections, CPU and memory, or any KEDA scaler - Service Bus queue length, Event Hubs lag, Kafka and many others - with min and max replicas. Minimum zero means **scale to zero**, which is great for cost but means a cold start. **Ingress** gives HTTPS with managed certificates, external or internal to the environment, plus IP restrictions and session affinity.',
      'A **canary** is multiple revision mode: deploy the new image as a new revision with **0% traffic**, test it on its **revision label URL**, shift 10% of traffic, watch error rates and latency in Application Insights, then 50% and 100%, and deactivate the old revision. Rollback is moving traffic back - the old revision is still there.',
    ],
    code: [
      {
        title: 'Canary release with multiple revisions',
        language: 'bash',
        code: `az containerapp revision set-mode -n ca-orders -g rg-apps --mode multiple

# New revision, no traffic yet
az containerapp update -n ca-orders -g rg-apps \\
  --image acrshop.azurecr.io/orders:1.5.0 --revision-suffix v150
az containerapp revision label add -n ca-orders -g rg-apps --label canary --revision ca-orders--v150

# Shift 10% to the canary, keep 90% on the current revision
az containerapp ingress traffic set -n ca-orders -g rg-apps \\
  --revision-weight ca-orders--v142=90 ca-orders--v150=10

# Promote, then retire the old revision
az containerapp ingress traffic set -n ca-orders -g rg-apps --revision-weight ca-orders--v150=100
az containerapp revision deactivate -n ca-orders -g rg-apps --revision ca-orders--v142`,
      },
      {
        title: 'Scale on queue length, down to zero',
        language: 'yaml',
        code: `properties:
  template:
    containers:
      - name: orders-worker
        image: acrshop.azurecr.io/orders-worker:1.5.0
        resources:
          cpu: 0.5
          memory: 1Gi
    scale:
      minReplicas: 0
      maxReplicas: 30
      rules:
        - name: orders-queue
          custom:
            type: azure-servicebus
            metadata:
              queueName: orders
              namespace: sb-shop-prod
              messageCount: "20"
            identity: system`,
        explanation:
          'Using the app’s managed identity for the scaler avoids putting a Service Bus connection string in a secret.',
      },
    ],
    diagrams: [
      {
        kind: 'flow',
        title: 'A canary on Container Apps',
        caption: 'The old revision keeps running, so rollback is a traffic change, not a redeploy.',
        nodes: [
          { label: 'New revision at 0% traffic', detail: 'Test on its label URL' },
          { label: 'Shift 10%', tone: 'accent' },
          {
            label: 'Watch errors and latency',
            branch: { label: 'Regression', detail: 'Traffic back to old', tone: 'danger' },
          },
          { label: 'Shift 50%, then 100%' },
          { label: 'Deactivate old revision', tone: 'success' },
        ],
      },
    ],
    deeper: [
      'Secrets and environment variables changes create new revisions only when they change the template; updating a secret value alone needs a revision restart to take effect.',
      'Container Apps **jobs** - manual, scheduled or event-driven - cover batch work that used to need Container Instances or a Kubernetes CronJob.',
      'For the internal environment, the environment’s default domain needs a private DNS zone pointing at its static IP, which is a common forgotten step.',
    ],
    traps: [
      'Scale to zero on a latency-sensitive API.',
      'Changing a secret and expecting running replicas to pick it up.',
      'Using single revision mode and wondering why traffic splitting is unavailable.',
    ],
    followUps: [
      'How would you automate the canary analysis?',
      'When do you need a dedicated workload profile?',
    ],
    tags: ['container apps', 'revisions', 'keda', 'canary', 'scaling'],
  },
]
