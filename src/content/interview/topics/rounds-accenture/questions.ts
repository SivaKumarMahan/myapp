import type { InterviewQuestion } from '../../../types'

/** Accenture round: security scanning, troubleshooting, Gateway API, automation, observability, SSO, AWS access and Terraform safety. */
export const roundsAccentureQuestions: InterviewQuestion[] = [
  {
    id: 'itv-racc-1',
    level: 'intermediate',
    kind: 'open',
    prompt: 'How do you integrate Trivy and SonarQube in CI/CD?',
    probing:
      'That SonarQube (SAST, Quality Gate) and Trivy (dependencies, IaC, secrets, images) cover different risks, where each sits in the pipeline, and that the image is scanned before it is pushed.',
    answer: [
      'They check different things, so I use both:',
      '- **SonarQube**: What it scans: Source code (SAST); Finds: Bugs, code smells, security hotspots, duplicate code, test coverage\n- **Trivy**: What it scans: Dependencies, Docker images, IaC files, secrets; Finds: Known CVEs in OS packages and libraries, misconfigurations in Terraform/K8s YAML, hard-coded secrets',
      '**Where they sit in the pipeline:** checkout, build and unit tests, SonarQube analysis with a Quality Gate, Trivy filesystem/config scan, a local Docker build, a Trivy image scan, and only then push to ACR and deploy.',
      'The key idea: **scan before you push**. A vulnerable image never reaches the registry.',
      '**Setup (one time): SonarQube**',
      '1. Install the **SonarQube** extension from the Azure DevOps Marketplace.\n2. In SonarQube: create the project and a token (**My Account > Security > Generate token**).\n3. In Azure DevOps: **Project settings > Service connections > New > SonarQube**, paste server URL + token. Name it `sc-sonarqube`.\n4. In SonarQube: set a **Quality Gate** (for example: coverage on new code >= 80%, no new critical bugs or vulnerabilities).',
      '**Setup (one time): Trivy:** nothing to configure on a server. It is a single binary installed on the agent (or baked into a self-hosted agent image).',
      '**Azure DevOps pipeline (Spring Boot example):** SonarQubePrepare, then Maven runs build, tests and the Sonar analysis, SonarQubePublish shows the Quality Gate on the run summary, then Trivy scans the repo, the image is built locally, Trivy scans the image, the JSON report is published, and the push to ACR only happens if every scan passed.',
      '**Important Trivy options**',
      '- **`--exit-code 1`**: Return non-zero when findings exist, so the pipeline **fails**\n- **`--severity HIGH,CRITICAL`**: Only fail on serious issues\n- **`--ignore-unfixed`**: Skip CVEs that have no fix yet (you cannot act on them)\n- **`.trivyignore` file**: Accept a specific CVE with a reason (reviewed risk)\n- **`trivy config ./terraform`**: Scan only IaC misconfigurations',
      '**Local commands:** run the same Trivy commands on your machine to reproduce a pipeline failure.',
      '**Interview answer:** "SonarQube does static code analysis and Trivy scans dependencies, IaC, secrets, and container images, so I use both. In Azure DevOps, I install the SonarQube extension and create a service connection. The pipeline runs SonarQubePrepare, then Maven runs the analysis with tests and coverage, and with `sonar.qualitygate.wait=true` the build fails if the Quality Gate fails. Then I install a pinned Trivy version on the agent, run `trivy fs` for dependencies, secrets, and Terraform misconfigurations, build the Docker image locally, and run `trivy image` with `--severity HIGH,CRITICAL --exit-code 1`. Only if all scans pass is the image pushed to ACR. Accepted risks go in `.trivyignore` with a reason, and the JSON report is published as an artifact."',
    ],
    followUps: [
      'How would you handle a CRITICAL CVE in a base image that has no fix yet?',
      'Why pin the Trivy version (and verify its checksum) instead of always installing the latest?',
      'How do you stop developers from bypassing the Quality Gate?',
    ],
    traps: [
      'Pushing the image to ACR first and scanning it afterwards: the vulnerable image is already in the registry and can be deployed.',
      'Running Trivy without `--exit-code 1`: it prints findings but the pipeline still passes.',
    ],
    code: [
      {
        title: 'Where the scans sit in the pipeline',
        language: 'text',
        code: `Checkout
   |
Build + unit tests (coverage report)
   |
SonarQube analysis --> Quality Gate (fail pipeline if gate fails)
   |
Trivy fs / config scan (dependencies, Terraform, K8s YAML, secrets)
   |
Docker build (local image, NOT pushed yet)
   |
Trivy image scan --> fail on HIGH/CRITICAL
   |
Push to ACR --> Deploy`,
      },
      {
        title: 'Azure DevOps pipeline (Spring Boot example)',
        language: 'yaml',
        code: `trigger:
  - main

variables:
  imageName: myacr.azurecr.io/myapp-api
  tag: $(Build.BuildId)
  trivyVersion: v0.56.2

stages:
  - stage: CI
    jobs:
      - job: BuildScanPush
        pool: { vmImage: ubuntu-latest }
        steps:
          # ---------- SonarQube ----------
          - task: SonarQubePrepare@7
            inputs:
              SonarQube: sc-sonarqube
              scannerMode: other               # Maven runs the scanner
              extraProperties: |
                sonar.projectKey=myapp-api
                sonar.qualitygate.wait=true    # fail the build if the Quality Gate fails

          - task: Maven@4
            displayName: Build, test, Sonar analysis
            inputs:
              mavenPomFile: pom.xml
              goals: clean verify
              publishJUnitResults: true
              testResultsFiles: "**/surefire-reports/TEST-*.xml"
              sonarQubeRunAnalysis: true
              javaHomeOption: JDKVersion
              jdkVersionOption: "1.17"

          - task: SonarQubePublish@7
            inputs:
              pollingTimeoutSec: "300"         # shows Quality Gate result on the run summary

          # ---------- Trivy ----------
          - script: |
              curl -sfL https://raw.githubusercontent.com/aquasecurity/trivy/main/contrib/install.sh \\
                | sh -s -- -b /usr/local/bin $(trivyVersion)
              trivy --version
            displayName: Install Trivy (pinned version)

          - script: |
              trivy fs --scanners vuln,secret,misconfig \\
                --severity HIGH,CRITICAL --exit-code 1 .
            displayName: Trivy - dependencies, secrets, IaC

          - task: Docker@2
            displayName: Docker build (no push yet)
            inputs:
              command: build
              containerRegistry: sc-acr-myapp
              repository: myapp-api
              tags: $(tag)

          - script: |
              trivy image --severity HIGH,CRITICAL --ignore-unfixed \\
                --exit-code 1 --format table $(imageName):$(tag)
              trivy image --format json -o $(Build.ArtifactStagingDirectory)/trivy-image.json $(imageName):$(tag)
            displayName: Trivy - image scan

          - publish: $(Build.ArtifactStagingDirectory)/trivy-image.json
            artifact: trivy-report
            condition: always()                # keep the report even if the scan failed

          - task: Docker@2
            displayName: Push to ACR (only if scans passed)
            inputs:
              command: push
              containerRegistry: sc-acr-myapp
              repository: myapp-api
              tags: $(tag)`,
      },
      {
        title: 'Example .trivyignore',
        language: 'text',
        code: `# Accepted by security team until 2026-12-31, not reachable in our code
CVE-2024-12345`,
      },
      {
        title: 'Local commands to reproduce a pipeline failure',
        language: 'bash',
        code: `trivy image --severity HIGH,CRITICAL myacr.azurecr.io/myapp-api:1234
trivy fs .
trivy config ./terraform`,
      },
    ],
    tags: ['trivy', 'sonarqube', 'devsecops', 'azure devops', 'container scanning'],
  },
  {
    id: 'itv-racc-2',
    level: 'advanced',
    kind: 'scenario',
    prompt: 'After a deployment the application is not working fine. How will you troubleshoot?',
    probing:
      'A calm, ordered approach: assess impact, roll back first when production users are hurt, then work through rollout, traffic path, config, dependencies and monitoring, and finish with an RCA and prevention.',
    answer: [
      'I follow a fixed order: **understand the impact -> decide quickly whether to roll back -> find the root cause -> prevent it next time.**',
      '**Step 1: Understand the problem**',
      '- **What exactly is wrong? (down, 5xx errors, slow, one feature broken)**: Tells you where to look\n- **All users or some? One region or all?**: Partial = one pod/node/zone or a feature flag\n- **When did it start? Exactly after the deployment?**: Confirms the deployment is the likely cause\n- **What changed? (image, config, secret, DB migration, infra)**: `git diff` / release notes / pipeline run',
      '**Step 2: If production users are affected, roll back first.** Restore service first, investigate after: `kubectl rollout undo` on Kubernetes, swap the slots back on App Service or Function App, or redeploy the previous successful pipeline run (same image tag).',
      '**Step 3: Check the deployment itself (Kubernetes example):** rollout status, Pod status and restarts, `kubectl describe` for events, and `kubectl logs --previous` for why the container crashed.',
      '- **`ImagePullBackOff`**: Wrong tag, or AKS cannot pull from ACR\n- **`CrashLoopBackOff`**: App startup error, missing config/secret, OOMKilled\n- **`Pending`**: Not enough CPU/memory on nodes, PVC not bound\n- **Running but `0/1 READY`**: Readiness probe failing (wrong path/port, app not ready)',
      '**Step 4: Check traffic path and configuration:** Service endpoints (empty = selector or readiness problem), the Ingress, ConfigMaps and Secrets, environment variables inside the Pod, and the health endpoint.',
      'Common config problems: new environment variable not added in prod, Key Vault secret missing or expired, wrong connection string, feature flag on.',
      '**Step 5: Check dependencies:** can the Pod resolve and reach the database? Did a database migration fail? Did a downstream API change? Is a firewall, NSG or private endpoint blocking traffic?',
      '**Step 6: Use monitoring**',
      '- **Application Insights**: Failed requests, exceptions, dependency failures, response time (compare before/after deploy time)\n- **Container Insights / Log Analytics**: Pod restarts, CPU/memory, container logs with KQL\n- **Grafana / Prometheus**: Error rate, latency, saturation dashboards',
      '**Step 7: Fix and prevent**',
      '- Fix the root cause and redeploy through the pipeline (no manual hot fixes in prod).\n- Write an RCA: what happened, impact, root cause, fix, prevention.\n- Prevention: readiness probes, smoke tests after deploy, canary or blue-green deployments, automatic rollback on failed health checks, config parity between environments.',
      '**Interview answer:** "First, I understand the impact: what is broken, for which users, and whether it started exactly with the deployment. If production users are affected, I roll back first, using `kubectl rollout undo` or a slot swap, and investigate after. Then I check the rollout: pod status, `kubectl describe` for events and probe failures, and `kubectl logs --previous` for crash reasons. Next, I check the traffic path: Service endpoints and Ingress, then configuration such as environment variables, secrets, and connection strings, and dependencies like the database. In parallel, I use Application Insights and Grafana to compare errors and latency before and after the deployment. Finally, I fix the root cause through the pipeline, write an RCA, and add prevention like smoke tests or canary deployments."',
    ],
    followUps: [
      'When would a rollback not be safe, for example after a database migration?',
      'How would you automate rollback when post-deployment smoke tests fail?',
      'The Pod is Running but the Service has no endpoints. What do you check?',
    ],
    traps: [
      'Debugging in production for an hour while users are down, instead of rolling back first.',
      'Hot-fixing directly in the cluster with `kubectl edit`: the next pipeline run overwrites it and Git no longer matches reality.',
    ],
    code: [
      {
        title: 'Roll back first',
        language: 'bash',
        code: `# Kubernetes
kubectl rollout undo deployment/myapp-api -n myapp-prod
kubectl rollout status deployment/myapp-api -n myapp-prod

# App Service / Function App with slots: swap back
az webapp deployment slot swap -g rg-myapp -n myapp-web --slot staging --target-slot production

# Or redeploy the previous successful pipeline run (same image tag)`,
      },
      {
        title: 'Check the rollout',
        language: 'bash',
        code: `kubectl rollout status deployment/myapp-api -n myapp-prod
kubectl get pods -n myapp-prod -o wide                 # CrashLoopBackOff? Pending? restarts?
kubectl describe pod <pod> -n myapp-prod               # events, probe failures, OOMKilled, image pull errors
kubectl logs <pod> -n myapp-prod --previous            # why it crashed
kubectl get events -n myapp-prod --sort-by=.lastTimestamp
kubectl rollout history deployment/myapp-api -n myapp-prod`,
      },
      {
        title: 'Check traffic path and configuration',
        language: 'bash',
        code: `kubectl get endpoints myapp-api -n myapp-prod           # empty = selector or readiness problem
kubectl describe ingress myapp-ingress -n myapp-prod
kubectl get configmap,secret -n myapp-prod
kubectl exec -it <pod> -n myapp-prod -- env | grep DB_
kubectl exec -it <pod> -n myapp-prod -- curl -s localhost:8080/actuator/health`,
      },
      {
        title: 'Check dependencies',
        language: 'bash',
        code: `kubectl exec -it <pod> -n myapp-prod -- nc -zv myapp-sql.database.windows.net 1433
kubectl exec -it <pod> -n myapp-prod -- nslookup myapp-sql.database.windows.net`,
      },
      {
        title: 'KQL: exceptions after the deployment (Application Insights)',
        language: 'text',
        code: `// Exceptions after the deployment, grouped by type
exceptions
| where timestamp > ago(1h)
| summarize count() by type, outerMessage
| order by count_ desc`,
      },
    ],
    tags: [
      'troubleshooting',
      'kubernetes',
      'rollback',
      'incident response',
      'application insights',
    ],
  },
  {
    id: 'itv-racc-3',
    level: 'basic',
    kind: 'open',
    prompt: 'What is Gateway API?',
    probing:
      'Gateway API as the role-oriented successor to Ingress (GatewayClass, Gateway, HTTPRoute), with header routing and traffic splitting in the standard spec, and the Azure implementation (Application Gateway for Containers).',
    answer: [
      '**Gateway API** is the official Kubernetes project that is the **next generation of Ingress**. It is a set of CRDs (`gateway.networking.k8s.io`) for routing traffic into (and within) the cluster, with more features and a clearer split of responsibilities than Ingress.',
      '**Why it was created (Ingress limitations)**',
      '- **Only HTTP host/path routing**: Gateway API answer: HTTP, HTTPS, gRPC, TCP, UDP, TLS routes\n- **Advanced features need controller-specific annotations (not portable)**: Gateway API answer: Header matching, traffic splitting, redirects, rewrites are part of the **standard spec**\n- **One object mixes infra and app settings**: Gateway API answer: Separate resources per **role**\n- **Hard to share one load balancer safely across teams**: Gateway API answer: Gateway in one namespace, routes in app namespaces, controlled by `allowedRoutes`',
      'Also, the community `ingress-nginx` controller has been retired, which is pushing many teams to move to Gateway API.',
      '**Main resources (role-oriented)**',
      '- **GatewayClass** (infra provider): which controller, for example Envoy Gateway, Istio, NGINX Gateway Fabric, Application Gateway for Containers.\n- **Gateway** (cluster operator): the load balancer: listeners, ports, TLS certificates.\n- **HTTPRoute** (app developer): routing rules: host, path, headers -> Services, with weights.',
      '**Example:** install the CRDs (some managed controllers install them for you). The **Gateway** is owned by the platform team; the **HTTPRoute** is owned by the app team and does a **canary: 90% v1, 10% v2**.',
      'Beta users (header `x-beta-user: true`) always get v2; everyone else is split 90/10. With Ingress this needs vendor annotations.',
      "**On Azure:** **Application Gateway for Containers (AGC)** is Azure's managed implementation of Gateway API for AKS. Istio (AKS add-on) and Envoy Gateway also support it.",
      '**Interview answer:** "Gateway API is the Kubernetes successor to Ingress. It splits the configuration by role: the infrastructure provider defines a GatewayClass, the platform team creates a Gateway with listeners, ports, and TLS certificates, and application teams create HTTPRoutes in their own namespaces that attach to that Gateway. Unlike Ingress, features like header-based routing, weighted traffic splitting for canary releases, redirects, and gRPC or TCP routes are part of the standard, so we don\'t depend on controller-specific annotations. Implementations include Envoy Gateway, Istio, NGINX Gateway Fabric, and on AKS, Application Gateway for Containers."',
    ],
    followUps: [
      'How does a route in one namespace attach to a Gateway in another, and what controls that?',
      'What is a ReferenceGrant used for?',
      'How would you migrate an existing Ingress to Gateway API?',
    ],
    code: [
      {
        title: 'Role-oriented resources',
        language: 'text',
        code: `GatewayClass   (Infra provider)   -> which controller: Envoy Gateway, Istio, NGINX Gateway Fabric, App Gateway for Containers
     |
Gateway        (Cluster operator) -> the load balancer: listeners, ports, TLS certificates
     |
HTTPRoute      (App developer)    -> routing rules: host, path, headers -> Services, with weights
     |
Service -> Pods`,
      },
      {
        title: 'Install the CRDs',
        language: 'bash',
        code: `kubectl apply -f https://github.com/kubernetes-sigs/gateway-api/releases/download/v1.2.1/standard-install.yaml
kubectl get gatewayclass`,
      },
      {
        title: 'Gateway (platform team)',
        language: 'yaml',
        code: `apiVersion: gateway.networking.k8s.io/v1
kind: Gateway
metadata:
  name: myapp-gateway
  namespace: infra
spec:
  gatewayClassName: eg                    # e.g. Envoy Gateway
  listeners:
    - name: https
      protocol: HTTPS
      port: 443
      hostname: "*.example.com"
      tls:
        mode: Terminate
        certificateRefs:
          - name: example-wildcard-tls
      allowedRoutes:
        namespaces:
          from: All`,
      },
      {
        title: 'HTTPRoute (app team): canary 90% v1, 10% v2',
        language: 'yaml',
        code: `apiVersion: gateway.networking.k8s.io/v1
kind: HTTPRoute
metadata:
  name: myapp-api-route
  namespace: myapp-prod
spec:
  parentRefs:
    - name: myapp-gateway
      namespace: infra
  hostnames:
    - api.example.com
  rules:
    - matches:
        - headers:
            - name: x-beta-user
              value: "true"
      backendRefs:
        - name: myapp-api-v2
          port: 80
    - matches:
        - path:
            type: PathPrefix
            value: /
      backendRefs:
        - name: myapp-api-v1
          port: 80
          weight: 90
        - name: myapp-api-v2
          port: 80
          weight: 10`,
      },
      {
        title: 'Check status',
        language: 'bash',
        code: `kubectl get gateway -A
kubectl describe gateway myapp-gateway -n infra         # check Programmed/Accepted conditions and address
kubectl get httproute -A
kubectl describe httproute myapp-api-route -n myapp-prod  # Accepted / ResolvedRefs status`,
      },
    ],
    tags: ['gateway api', 'kubernetes', 'ingress', 'aks', 'traffic splitting'],
  },
  {
    id: 'itv-racc-4',
    level: 'intermediate',
    kind: 'open',
    prompt: 'What automations have you done? Please explain.',
    probing:
      'Real, specific examples told as problem, what was automated, tools and measurable result, across infrastructure, CI/CD, cost and operations.',
    answer: [
      'Interviewers want **real examples** with the **problem, what you built, tools, and the result**. Use this structure for each one: **Problem -> What I automated -> Tools -> Result (time saved / errors reduced)**.',
      'Pick 3-4 examples from your own work. The ones below are common DevOps automations you can adapt. **Replace the numbers with your real ones.**',
      '**1. Infrastructure provisioning with Terraform + pipeline**',
      '- **Problem:** Environments were created manually in the portal; Dev, QA, and Prod were different, and a new environment took days.\n- **What I did:** Reusable Terraform modules (VNet, AKS, ACR, Key Vault, SQL, private endpoints), remote state in Azure Storage, and an Azure DevOps pipeline: `fmt` -> `validate` -> `tflint`/Trivy config scan -> `plan` -> approval -> `apply`.\n- **Result:** A new environment takes under an hour with the same configuration everywhere, and every change is reviewed through a PR.',
      '**2. Reusable CI/CD pipeline templates**',
      '- **Problem:** Each microservice had its own copy-pasted pipeline; fixes had to be repeated 20 times.\n- **What I did:** Central YAML templates (build, Sonar, Trivy, Docker, deploy) in a shared repo; each service pipeline is ~15 lines.\n- **Result:** One change in the template applies to all services; security scans are enforced everywhere.',
      '**3. Cost saving: stop non-prod AKS and VMs at night**',
      '- **Problem:** Dev/QA clusters ran 24x7 but were used only in office hours.\n- **What I did:** A scheduled pipeline (cron) stops the clusters in the evening and starts them in the morning.\n- **Result:** Non-prod compute cost reduced significantly (state your real %).',
      '**4. Certificate and secret expiry alerts**',
      '- **Problem:** An expired certificate caused an outage.\n- **What I did:** A daily script checks Key Vault certificates and secrets, and posts to Teams if anything expires within 30 days.\n- **Result:** No expiry-related outages since.',
      '**5. Linux housekeeping scripts**',
      '- **Problem:** Disks filled up with old logs, causing app failures.\n- **What I did:** Cron script to delete logs older than N days and alert at 80% disk usage.',
      '**Other ideas worth mentioning (if you have done them)**',
      '- **Access**: Onboarding script: create Entra group, RBAC assignments, ADO permissions\n- **Kubernetes**: Helm charts + GitOps (Argo CD / Flux) for automatic sync\n- **Security**: Azure Policy assignments as code; auto-tagging resources\n- **Releases**: Automatic rollback when smoke tests fail after deploy\n- **Reporting**: Weekly cost / unused resource report (unattached disks, idle public IPs)',
      '**Interview answer:** "I have automated across infrastructure, CI/CD, and operations. For infrastructure, I built reusable Terraform modules with a pipeline that runs validation, a security scan, plan, approval, and apply, so new environments take about an hour instead of days and stay consistent. For CI/CD, I created shared YAML templates with build, SonarQube, Trivy, and deployment steps, so each microservice pipeline just extends the template. For cost, I added a scheduled pipeline that stops non-prod AKS clusters and VMs at night and starts them in the morning. And for operations, I wrote scripts that alert on Key Vault certificate expiry and clean up old logs. In each case, the goal was to remove manual, error-prone steps and make the process repeatable."',
    ],
    followUps: [
      'How did you measure the time or cost saved?',
      'How do you version and roll out a change to a shared pipeline template without breaking every service?',
      'What would you automate next in your current setup, and why?',
    ],
    traps: [
      'Listing tools without a problem and a result: it sounds like a CV, not experience.',
      'Quoting impressive numbers you cannot explain when the interviewer asks how you measured them.',
    ],
    code: [
      {
        title: 'Story structure',
        language: 'text',
        code: `Problem -> What I automated -> Tools -> Result (time saved / errors reduced)`,
      },
      {
        title: 'Terraform plan step',
        language: 'yaml',
        code: `- script: |
    terraform init -backend-config=env/$(env).backend.hcl
    terraform plan -var-file=env/$(env).tfvars -out=tfplan
  displayName: Terraform plan`,
      },
      {
        title: 'Service pipeline extending a shared template',
        language: 'yaml',
        code: `resources:
  repositories:
    - repository: templates
      type: git
      name: Platform/pipeline-templates

extends:
  template: microservice.yml@templates
  parameters:
    serviceName: myapp-api`,
      },
      {
        title: 'Scheduled stop of non-prod AKS and VMs',
        language: 'yaml',
        code: `schedules:
  - cron: "30 14 * * 1-5"       # 20:00 IST = 14:30 UTC
    branches: { include: [main] }
    always: true

steps:
  - task: AzureCLI@2
    inputs:
      azureSubscription: sc-azure-nonprod
      scriptType: bash
      scriptLocation: inlineScript
      inlineScript: |
        az aks stop -g rg-myapp-dev -n aks-myapp-dev
        az vm deallocate --ids $(az vm list -g rg-myapp-dev --query "[].id" -o tsv)`,
      },
      {
        title: 'Key Vault certificate expiry alert to Teams',
        language: 'bash',
        code: `#!/bin/bash
VAULT="kv-myapp-prod"
LIMIT=$(date -d "+30 days" +%s)

az keyvault certificate list --vault-name "$VAULT" \\
  --query "[].{name:name, exp:attributes.expires}" -o tsv |
while read -r name exp; do
  if [[ -n "$exp" && $(date -d "$exp" +%s) -lt $LIMIT ]]; then
    curl -s -H "Content-Type: application/json" \\
      -d "{\\"text\\":\\"Certificate $name in $VAULT expires on $exp\\"}" "$TEAMS_WEBHOOK_URL"
  fi
done`,
      },
      {
        title: 'Linux log clean-up and disk alert',
        language: 'bash',
        code: `find /var/log/myapp -type f -name "*.log" -mtime +15 -delete
USAGE=$(df / --output=pcent | tail -1 | tr -dc '0-9')
(( USAGE > 80 )) && echo "Disk usage \${USAGE}% on $(hostname)" | mail -s "Disk alert" ops@example.com`,
      },
    ],
    tags: ['automation', 'terraform', 'pipeline templates', 'cost optimisation', 'scripting'],
  },
  {
    id: 'itv-racc-5',
    level: 'intermediate',
    kind: 'open',
    prompt: 'What observability tools have you used, and how?',
    probing:
      'Mapping metrics, logs, traces and alerts to concrete tools (Azure Monitor, Log Analytics, Application Insights, Prometheus, Grafana), with real queries and actionable alerts.',
    answer: [
      'Observability has three pillars. I map each one to a tool:',
      '- **Metrics**: Question it answers: Is something wrong? (CPU, error rate, latency); Tools I have used: Azure Monitor metrics, Prometheus, Grafana\n- **Logs**: Question it answers: What exactly happened?; Tools I have used: Log Analytics (KQL), Container Insights, ELK/EFK, Splunk\n- **Traces**: Question it answers: Where in the request chain is it slow/failing?; Tools I have used: Application Insights, OpenTelemetry\n- **Alerts**: Question it answers: Who needs to know now?; Tools I have used: Azure Monitor alerts + action groups, Alertmanager, Teams/PagerDuty',
      '**1. Azure Monitor + Log Analytics + Container Insights:** enable Container Insights (logs) and managed Prometheus (metrics) on AKS. Diagnostic settings send platform logs (Key Vault, App Gateway, SQL) to the same workspace, and I query everything with KQL.',
      '**2. Application Insights (APM / traces):** for Java, attach the agent; no code change needed. It gives request rates, failures, response times, dependency calls (SQL, HTTP), exceptions, and the **application map** to see which service is slow.',
      '**3. Prometheus + Grafana**',
      '- Apps expose `/metrics` (Spring Boot: `/actuator/prometheus`), scraped via ServiceMonitor.\n- Grafana dashboards for the **golden signals**: latency, traffic, errors, saturation.',
      '**4. Centralised logs (ELK / Splunk)**',
      '- **EFK:** Fluent Bit DaemonSet on every node -> Elasticsearch -> Kibana.\n- **Splunk:** Universal Forwarder on VMs, or the OpenTelemetry Collector on AKS sending to the Splunk HTTP Event Collector (HEC). Alerts are saved searches that email or post to Teams.',
      '**5. Alerts I usually configure**',
      '- **High CPU / memory**: > 80% for 5 min\n- **Error rate**: 5xx > 5% for 5 min\n- **Pod restarts**: CrashLoopBackOff > 0\n- **Availability**: App Insights availability test fails from 2+ locations\n- **Certificate expiry**: < 30 days',
      'I keep alerts **actionable** (every alert has an owner and a runbook) to avoid alert fatigue.',
      '**Interview answer:** "I cover metrics, logs, and traces. On Azure, I enable Container Insights on AKS to send logs to a Log Analytics workspace and query them with KQL, and I use Managed Prometheus with Azure Managed Grafana for metrics dashboards on latency, traffic, errors, and saturation. For application performance, I use Application Insights with the Java agent, which gives request failures, dependency calls, exceptions, and the application map for distributed tracing. Platform services send diagnostic logs to the same workspace. I have also used EFK and Splunk for centralised logs. Alerts go through Azure Monitor action groups to email and Teams, and I keep them actionable with clear thresholds and runbooks."',
    ],
    followUps: [
      'What is the difference between monitoring and observability?',
      'How do you reduce Log Analytics ingestion cost without losing important logs?',
      'How do you correlate a slow request across several microservices?',
    ],
    code: [
      {
        title: 'Overall setup',
        language: 'text',
        code: `AKS pods / VMs / App Services
   |-- metrics --> Managed Prometheus  --> Azure Managed Grafana (dashboards)
   |-- logs    --> Container Insights  --> Log Analytics workspace (KQL)
   |-- traces  --> Application Insights (OpenTelemetry / Java agent)
                          |
                Azure Monitor alerts --> Action group --> Email / Teams / ITSM`,
      },
      {
        title: 'Enable Container Insights and managed Prometheus on AKS',
        language: 'bash',
        code: `# Enable Container Insights (logs) and managed Prometheus (metrics) on AKS
az aks enable-addons -g rg-myapp -n aks-myapp -a monitoring \\
  --workspace-resource-id <LOG_ANALYTICS_WORKSPACE_ID>
az aks update -g rg-myapp -n aks-myapp --enable-azure-monitor-metrics`,
      },
      {
        title: 'KQL I use often (Container Insights)',
        language: 'text',
        code: `// Error logs from a namespace in the last hour
ContainerLogV2
| where TimeGenerated > ago(1h)
| where PodNamespace == "myapp-prod" and LogMessage has "ERROR"
| project TimeGenerated, PodName, LogMessage
| order by TimeGenerated desc

// Pods restarting
KubePodInventory
| where TimeGenerated > ago(1h)
| summarize Restarts = max(PodRestartCount) by Name, Namespace
| where Restarts > 3`,
      },
      {
        title: 'Application Insights Java agent in the image',
        language: 'dockerfile',
        code: `COPY applicationinsights-agent-3.x.jar /app/ai-agent.jar
ENV APPLICATIONINSIGHTS_CONNECTION_STRING=""   # set from a Kubernetes Secret at runtime
ENTRYPOINT ["java", "-javaagent:/app/ai-agent.jar", "-jar", "/app/app.jar"]`,
      },
      {
        title: 'KQL: failures and p95 per operation (Application Insights)',
        language: 'text',
        code: `requests
| where timestamp > ago(30m)
| summarize failures = countif(success == false), p95 = percentile(duration, 95) by name
| order by failures desc`,
      },
      {
        title: 'PromQL: error rate %',
        language: 'text',
        code: `# Error rate %
sum(rate(http_server_requests_seconds_count{status=~"5.."}[5m]))
  / sum(rate(http_server_requests_seconds_count[5m])) * 100`,
      },
    ],
    tags: [
      'observability',
      'azure monitor',
      'application insights',
      'prometheus',
      'grafana',
      'kql',
    ],
  },
  {
    id: 'itv-racc-6',
    level: 'intermediate',
    kind: 'open',
    prompt: 'Have you created SAML / SSO? How?',
    probing:
      'Knowing IdP vs SP, Entity ID, ACS/Reply URL, signed assertions and group claims, walking through a real Entra ID enterprise app setup, and knowing when OIDC fits better.',
    answer: [
      '**SSO (Single Sign-On)** = log in once with your company account and access many apps. **SAML 2.0** is one protocol to implement SSO (XML-based, common for enterprise apps). The other common one is **OpenID Connect (OIDC)**.',
      "- **IdP (Identity Provider)**: Meaning: Authenticates the user; Example: Microsoft Entra ID, Okta, ADFS\n- **SP (Service Provider)**: Meaning: The application; Example: SonarQube, Grafana, Jenkins, ServiceNow\n- **Entity ID / Identifier**: Meaning: Unique name of the app; Example: `https://sonar.example.com/saml`\n- **ACS / Reply URL**: Meaning: Where the IdP posts the SAML response; Example: `https://sonar.example.com/oauth2/callback/saml`\n- **Assertion**: Meaning: Signed XML with the user's identity and claims (email, name, groups)\n- **Certificate**: Meaning: Used by the SP to verify the IdP's signature; Example: Downloaded from Entra ID",
      '**Example: SSO for SonarQube with Microsoft Entra ID**',
      '**Part A: Entra ID (IdP side)**',
      '1. **Entra ID > Enterprise applications > New application > Create your own application** -> name `SonarQube`, choose "Integrate any other application you don\'t find in the gallery".\n2. **Single sign-on > SAML**.\n3. **Basic SAML Configuration:** Identifier (Entity ID): `sonarqube`; Reply URL (ACS): `https://sonar.example.com/oauth2/callback/saml`.\n4. **Attributes & Claims:** keep `name`, `emailaddress`, and **add a group claim** (security groups) so roles can be mapped.\n5. **SAML Certificates:** download **Certificate (Base64)**. Copy the **Login URL** and **Microsoft Entra Identifier**.\n6. **Users and groups:** assign the groups allowed to use the app (e.g. `grp-sonar-users`, `grp-sonar-admins`).',
      '**Part B: SonarQube (SP side):** **Administration > Configuration > General Settings > Authentication > SAML:**',
      '- **Application ID**: `sonarqube` (same as Entity ID)\n- **Provider Name**: `Microsoft Entra ID`\n- **Provider ID**: Microsoft Entra Identifier (`https://sts.windows.net/<tenant-id>/`)\n- **SAML login URL**: Login URL from Entra\n- **Identity provider certificate**: Content of the Base64 certificate\n- **SAML user login / name / email attribute**: Claim names from Entra (e.g. `http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress`)\n- **SAML group attribute**: `http://schemas.microsoft.com/ws/2008/06/identity/claims/groups`',
      'Then create SonarQube groups with the same names (or object IDs) as the Entra groups to get role mapping, and test with **Enterprise app > Single sign-on > Test**.',
      '**OIDC example (when the app supports it, e.g. Grafana):** app registration in Entra ID -> redirect URI `https://grafana.example.com/login/azuread`, then configure the `[auth.azuread]` section in `grafana.ini`.',
      '**SAML 2.0 vs OIDC compared**',
      '- **Format**: SAML 2.0: XML assertions; OIDC: JSON (JWT tokens)\n- **Best for**: SAML 2.0: Enterprise web apps, older apps; OIDC: Modern web, mobile, APIs\n- **Setup in Entra**: SAML 2.0: Enterprise application; OIDC: App registration',
      '**Common issues and fixes**',
      "- **`AADSTS50011` reply URL mismatch**: Reply URL in Entra must match the app's ACS URL exactly\n- **Signature validation failed**: Wrong or expired certificate on the SP side; re-download after rotation\n- **User logs in but has no rights**: Group claim missing or group names do not match\n- **`AADSTS50105` user not assigned**: Assign the user/group to the enterprise app",
      'Remember to track **SAML certificate expiry** (default 3 years) and rotate before it expires.',
      '**Interview answer:** "Yes, I have configured SSO with Microsoft Entra ID, for example for SonarQube using SAML. In Entra ID, I created an enterprise application, chose SAML, and set the Identifier and the Reply URL, which is the app\'s ACS endpoint. I added a group claim, downloaded the Base64 certificate, and assigned only the required groups. On the SonarQube side, I entered the Entra login URL, the Entra identifier as provider ID, the certificate, and the attribute mappings for login, email, and groups, so Entra groups map to SonarQube permissions. The flow is: the app redirects to Entra ID, the user logs in with MFA, Entra posts a signed assertion to the ACS URL, and the app validates it. For modern apps like Grafana, I use OIDC with an app registration instead. I also monitor the SAML signing certificate expiry."',
    ],
    followUps: [
      'What is the difference between SP-initiated and IdP-initiated SSO?',
      'A user belongs to more than 150 groups. What happens to the group claim, and how do you handle it?',
      'How do you rotate the SAML signing certificate without breaking logins?',
    ],
    traps: [
      'Saying SAML and OIDC are the same thing: SAML uses XML assertions for web SSO, OIDC uses JWTs on top of OAuth 2.0.',
      'Assigning the app to "all users" instead of specific groups, so anyone in the tenant can sign in.',
    ],
    code: [
      {
        title: 'SAML login flow (SP-initiated)',
        language: 'text',
        code: `1. User opens https://sonar.example.com
2. SonarQube (SP) redirects browser to Entra ID with a SAML AuthnRequest
3. User logs in to Entra ID (password + MFA, Conditional Access)
4. Entra ID sends a signed SAML assertion back via the browser (POST to the ACS URL)
5. SonarQube validates the signature with the Entra certificate, reads email/groups
6. User is logged in (no separate SonarQube password)`,
      },
      {
        title: 'grafana.ini: OIDC with Entra ID',
        language: 'text',
        code: `[auth.azuread]
enabled = true
client_id = <app-client-id>
client_secret = $__file{/etc/secrets/azuread_client_secret}
auth_url = https://login.microsoftonline.com/<tenant-id>/oauth2/v2.0/authorize
token_url = https://login.microsoftonline.com/<tenant-id>/oauth2/v2.0/token
allowed_groups = <grafana-users-group-object-id>
role_attribute_path = contains(groups[*], '<admins-group-id>') && 'Admin' || 'Viewer'`,
      },
    ],
    tags: ['sso', 'saml', 'oidc', 'entra id', 'identity'],
  },
  {
    id: 'itv-racc-7',
    level: 'intermediate',
    kind: 'open',
    prompt: 'If you have EC2 and S3, how do you establish a connection between them?',
    probing:
      'Separating identity (IAM role via instance profile, no access keys) from network path (VPC gateway endpoint), locking down the bucket, and mapping it to the Azure equivalent.',
    answer: [
      'Secure access has two parts, the same as VM to Storage Account in Azure:',
      '- **Identity (who is allowed)**: AWS way: **IAM role** attached to EC2 through an **instance profile**; Why: No access keys stored on the server; temporary credentials rotate automatically\n- **Network (how traffic travels)**: AWS way: **VPC gateway endpoint for S3**; Why: Traffic stays on the AWS network, works from private subnets without a NAT gateway or internet',
      '**Never** run `aws configure` with access keys on an EC2 instance. Use a role.',
      '**Step 1: IAM role for EC2:** a trust policy that allows EC2 to assume the role, a least-privilege permission policy on one bucket, and an instance profile that attaches the role to the instance.',
      '**Step 2: VPC gateway endpoint for S3 (private network path):** a gateway endpoint for S3 is **free** and adds a route to S3 in the selected route tables. Use an **interface endpoint (PrivateLink)** instead if you need access from on-premises or peered networks.',
      '**Step 3: Lock down the bucket:** block all public access, and add a bucket policy that denies access unless it comes through the VPC endpoint.',
      'Be careful: this also blocks console and pipeline access from outside the VPC. Add exceptions for admin roles if needed. Also enable default encryption (SSE-S3 or SSE-KMS) and require TLS (`aws:SecureTransport`).',
      '**Step 4: Test from EC2:** `aws sts get-caller-identity` should show the assumed role, then list and copy objects. Use **IMDSv2** (token-based metadata) on the instance so the role credentials are better protected.',
      '**AWS vs Azure equivalents**',
      '- **Identity**: AWS: IAM role + instance profile; Azure: Managed identity + RBAC role\n- **Private network path**: AWS: VPC gateway / interface endpoint; Azure: Service endpoint / private endpoint\n- **Resource-side restriction**: AWS: Bucket policy (`aws:SourceVpce`); Azure: Storage firewall, disable public access',
      '**Interview answer:** "I connect them with an IAM role, not access keys. I create a role that EC2 can assume, attach a least-privilege policy for only that bucket, and attach the role to the instance through an instance profile, so the instance gets temporary credentials that rotate automatically. For the network, I create a VPC gateway endpoint for S3 on the private subnet\'s route table, so traffic stays inside AWS and no NAT or internet access is needed. On the bucket, I block public access, enable encryption, and add a bucket policy that only allows requests through that VPC endpoint. I test with `aws sts get-caller-identity` and `aws s3 ls` from the instance. It is the same idea as a managed identity plus a private endpoint in Azure."',
    ],
    followUps: [
      'When would you choose an S3 interface endpoint over a gateway endpoint?',
      'How does the instance actually get its temporary credentials, and why does IMDSv2 matter?',
      'How would an app in another AWS account read this bucket?',
    ],
    traps: [
      'Storing access keys on the instance with `aws configure`: long-lived keys leak and do not rotate.',
      'Adding a deny-unless-VPC-endpoint bucket policy without an exception, then locking yourself and the pipeline out.',
    ],
    code: [
      {
        title: 'Identity and network path',
        language: 'text',
        code: `EC2 (private subnet, IAM role) --route table--> S3 Gateway Endpoint (vpce-xxxx) --> S3 bucket
                                                                           bucket policy: allow only via vpce-xxxx`,
      },
      {
        title: 'trust.json: allow EC2 to assume the role',
        language: 'json',
        code: `{
  "Version": "2012-10-17",
  "Statement": [{
    "Effect": "Allow",
    "Principal": { "Service": "ec2.amazonaws.com" },
    "Action": "sts:AssumeRole"
  }]
}`,
      },
      {
        title: 's3-access.json: least privilege on one bucket',
        language: 'json',
        code: `{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": ["s3:ListBucket"],
      "Resource": "arn:aws:s3:::myapp-bucket"
    },
    {
      "Effect": "Allow",
      "Action": ["s3:GetObject", "s3:PutObject"],
      "Resource": "arn:aws:s3:::myapp-bucket/*"
    }
  ]
}`,
      },
      {
        title: 'Create the role and instance profile',
        language: 'bash',
        code: `aws iam create-role --role-name ec2-myapp-s3-role --assume-role-policy-document file://trust.json
aws iam put-role-policy --role-name ec2-myapp-s3-role --policy-name s3-access --policy-document file://s3-access.json

# EC2 uses roles through an instance profile
aws iam create-instance-profile --instance-profile-name ec2-myapp-s3-profile
aws iam add-role-to-instance-profile --instance-profile-name ec2-myapp-s3-profile --role-name ec2-myapp-s3-role

# Attach to a running instance
aws ec2 associate-iam-instance-profile --instance-id i-0abc123 \\
  --iam-instance-profile Name=ec2-myapp-s3-profile`,
      },
      {
        title: 'VPC gateway endpoint for S3',
        language: 'bash',
        code: `aws ec2 create-vpc-endpoint --vpc-id vpc-0abc123 \\
  --vpc-endpoint-type Gateway \\
  --service-name com.amazonaws.us-east-1.s3 \\
  --route-table-ids rtb-0private123`,
      },
      {
        title: 'Block public access on the bucket',
        language: 'bash',
        code: `# Block all public access
aws s3api put-public-access-block --bucket myapp-bucket \\
  --public-access-block-configuration BlockPublicAcls=true,IgnorePublicAcls=true,BlockPublicPolicy=true,RestrictPublicBuckets=true`,
      },
      {
        title: 'Bucket policy: deny unless through the VPC endpoint',
        language: 'json',
        code: `{
  "Version": "2012-10-17",
  "Statement": [{
    "Sid": "DenyNotFromVpce",
    "Effect": "Deny",
    "Principal": "*",
    "Action": "s3:*",
    "Resource": ["arn:aws:s3:::myapp-bucket", "arn:aws:s3:::myapp-bucket/*"],
    "Condition": { "StringNotEquals": { "aws:SourceVpce": "vpce-0abc123" } }
  }]
}`,
      },
      {
        title: 'Test from EC2',
        language: 'bash',
        code: `aws sts get-caller-identity                 # should show the assumed role ec2-myapp-s3-role
aws s3 ls s3://myapp-bucket
aws s3 cp /tmp/test.txt s3://myapp-bucket/test.txt`,
      },
      {
        title: 'Terraform (short version)',
        language: 'hcl',
        code: `resource "aws_iam_role" "ec2_s3" {
  name               = "ec2-myapp-s3-role"
  assume_role_policy = file("trust.json")
}

resource "aws_iam_role_policy" "s3_access" {
  role   = aws_iam_role.ec2_s3.id
  policy = file("s3-access.json")
}

resource "aws_iam_instance_profile" "ec2_s3" {
  name = "ec2-myapp-s3-profile"
  role = aws_iam_role.ec2_s3.name
}

resource "aws_instance" "app" {
  ami                  = var.ami_id
  instance_type        = "t3.micro"
  subnet_id            = var.private_subnet_id
  iam_instance_profile = aws_iam_instance_profile.ec2_s3.name

  metadata_options {
    http_tokens = "required"        # IMDSv2
  }
}

resource "aws_vpc_endpoint" "s3" {
  vpc_id            = var.vpc_id
  service_name      = "com.amazonaws.us-east-1.s3"
  vpc_endpoint_type = "Gateway"
  route_table_ids   = [var.private_route_table_id]
}`,
      },
    ],
    tags: ['aws', 'iam', 's3', 'vpc endpoint', 'least privilege'],
  },
  {
    id: 'itv-racc-8',
    level: 'advanced',
    kind: 'scenario',
    prompt:
      'The CPU of a VM / AKS is more than 100%. How do you troubleshoot or fix it using observability?',
    probing:
      'Interpreting the metric correctly (per-core vs whole VM vs throttled container), narrowing scope with dashboards, finding the culprit process or Pod, mitigating fast, then fixing the root cause.',
    answer: [
      'First, understand what "more than 100%" means:',
      '- **`top` on Linux, per process**: 100% = one full core. A process at 350% is using 3.5 cores (normal on multi-core)\n- **Azure Monitor "Percentage CPU" (VM)**: Whole VM, max 100% = all cores busy\n- **`kubectl top pod` vs the pod\'s CPU limit**: A pod cannot go above its limit; it gets **throttled** (slow), not killed\n- **`kubectl top node` 100%**: All cores of the node are busy; pods compete for CPU',
      'My approach: **Detect -> find the scope -> find the culprit -> mitigate -> fix the root cause.**',
      '**Step 1: Detect (alert):** an Azure Monitor alert (CPU > 85% for 5 minutes) or a Grafana alert fires to Teams/email. Check **when** it started and whether it lines up with a deployment, a traffic spike, or a scheduled job.',
      '**Step 2: Find the scope with dashboards**',
      '- **One VM/node or all?**: Azure Monitor metrics, VM insights, Container Insights > Nodes\n- **One pod / deployment?**: Container Insights > Containers, Grafana Kubernetes dashboards\n- **Did traffic increase?**: Application Insights request rate, ingress metrics\n- **Is the app slow because of it?**: App Insights response time and failures',
      '**Step 3a: Find the culprit on a VM:** `top`, `ps --sort=-%cpu`, threads with `top -H`, `pidstat`, and load average against the number of cores. For a Java app, convert the hot thread id to hex and find it in a `jstack` dump.',
      "**Step 3b: Find the culprit on AKS:** `kubectl top nodes` and `kubectl top pods --sort-by=cpu`, the node's allocated resources, the Pod's requests and limits, and whether the HPA is already at `maxReplicas`. Then use **Application Insights** for that service: which requests or dependencies are slow, exceptions in loops, and the **profiler** to see which code methods use CPU.",
      '**Step 4: Mitigate quickly**',
      '- **Real traffic increase on AKS**: Scale out: `kubectl scale deploy/myapp-api --replicas=6`, or raise HPA `maxReplicas`\n- **All nodes full**: Cluster autoscaler / `az aks nodepool scale`\n- **Single VM overloaded**: Resize: `az vm resize -g rg-myapp -n vm-myapp --size Standard_D4s_v5`, or scale out the VMSS\n- **Bad release (CPU jumped right after deploy)**: Roll back: `kubectl rollout undo deploy/myapp-api`\n- **Runaway process / stuck job**: Restart it after collecting a thread dump',
      '**Step 5: Fix the root cause**',
      '- **Code issue (infinite loop, heavy regex, N+1 queries)**: Fix code, add a load test in the pipeline\n- **Java high GC (memory pressure shows as CPU)**: Tune heap / memory limits, fix memory leak\n- **Wrong requests/limits, constant throttling**: Right-size from metrics (VPA in recommendation mode)\n- **No autoscaling**: HPA on CPU, VMSS autoscale, cluster autoscaler\n- **Noisy neighbour pods**: Separate node pools, proper requests, ResourceQuota per namespace\n- **Batch job at peak hours**: Reschedule the job, or run it on its own node pool',
      'Then write an RCA and tune the alert thresholds.',
      '**Interview answer:** "First, I clarify the metric: in `top`, over 100% just means more than one core, while VM-level 100% means all cores are busy, and in Kubernetes a pod hitting its CPU limit gets throttled. I start from the alert and dashboards: Azure Monitor and VM insights for VMs, Container Insights and Grafana for AKS, to see whether it is one node, one pod, or everything, and whether it lines up with a deployment or a traffic spike. Then I find the culprit: `top`, `ps --sort=-%cpu`, and `top -H` with `jstack` for Java threads on a VM, and `kubectl top nodes` and `kubectl top pods --sort-by=cpu` plus throttling metrics in Prometheus on AKS. Application Insights and its profiler show which requests or code paths use the CPU. To mitigate, I scale out, resize, or roll back a bad release. Then I fix the root cause, for example code issues, GC tuning, right-sizing requests and limits, or adding HPA and autoscaling, and I write an RCA."',
    ],
    followUps: [
      'Why might a Pod be slow from CPU throttling even when the node has idle CPU?',
      'Should you set CPU limits at all? What are the trade-offs?',
      'HPA is already at maxReplicas and nodes are full. What next?',
    ],
    traps: [
      'Treating 350% in `top` as a problem by itself: on a multi-core VM it only means 3.5 cores are busy.',
      'Restarting the process before collecting a thread dump: the evidence for the root cause is gone.',
    ],
    code: [
      {
        title: 'KQL: VMs with highest CPU (VM insights)',
        language: 'text',
        code: `InsightsMetrics
| where TimeGenerated > ago(1h)
| where Namespace == "Processor" and Name == "UtilizationPercentage"
| summarize avgCPU = avg(Val) by Computer, bin(TimeGenerated, 5m)
| order by avgCPU desc`,
      },
      {
        title: 'PromQL: top pods by CPU, and throttling',
        language: 'text',
        code: `# CPU cores used per pod
topk(10, sum(rate(container_cpu_usage_seconds_total{container!=""}[5m])) by (namespace, pod))

# % of time the container was throttled (hitting its CPU limit)
sum(rate(container_cpu_cfs_throttled_periods_total[5m])) by (pod)
  / sum(rate(container_cpu_cfs_periods_total[5m])) by (pod) * 100`,
      },
      {
        title: 'Find the culprit on a VM',
        language: 'bash',
        code: `top                                   # press P to sort by CPU, 1 to see each core
ps aux --sort=-%cpu | head -10        # top CPU processes
top -H -p <PID>                       # threads inside that process
pidstat -u 5 3                        # CPU per process over time (sysstat)
uptime                                # load average vs number of cores (nproc)`,
      },
      {
        title: 'Java: find the hot thread',
        language: 'bash',
        code: `top -H -p 4521                        # hot thread id, e.g. 4602
printf '%x\\n' 4602                    # -> 11fa (hex)
jstack 4521 | grep -A 20 'nid=0x11fa' # what that thread is doing`,
      },
      {
        title: 'Find the culprit on AKS',
        language: 'bash',
        code: `kubectl top nodes
kubectl top pods -A --sort-by=cpu | head -15
kubectl top pod <pod> -n myapp-prod --containers
kubectl describe node <node>                       # "Allocated resources": requests vs capacity
kubectl get pod <pod> -n myapp-prod -o jsonpath='{.spec.containers[*].resources}'
kubectl get hpa -n myapp-prod                       # is HPA at maxReplicas already?`,
      },
    ],
    tags: ['cpu', 'troubleshooting', 'aks', 'linux', 'observability', 'performance'],
  },
  {
    id: 'itv-racc-9',
    level: 'advanced',
    kind: 'scenario',
    prompt: 'You ran terraform plan and see one resource being destroyed. What will you do?',
    probing:
      'Stopping before apply, reading the plan for the reason, knowing the common causes (wrong workspace, rename, count shift, ForceNew, drift), fixing with moved/removed/lifecycle, and guarding the pipeline.',
    answer: [
      '**Stop. Do not apply.** A destroy in a plan is a red flag until you know exactly why it is there, especially for stateful resources like databases, storage accounts, or Key Vaults.',
      '**Step 1: Read the plan carefully.** Terraform usually tells you the reason in brackets, for example "not in configuration", "index [2] is out of range", or the attribute marked `# forces replacement`.',
      '**Step 2: Find the reason**',
      '- **Wrong environment: wrong workspace, backend, or `.tfvars`**: How to check: `terraform workspace show`, check `-var-file` and backend config; Fix: Run with the correct workspace / var file\n- **Resource renamed or moved into a module**: How to check: Old address destroyed, new address created; Fix: `moved` block or `terraform state mv`\n- **`count` index shifted (item removed from the middle of a list)**: How to check: `[2]` destroyed, others changed; Fix: Switch to `for_each` with stable keys + `moved` blocks\n- **ForceNew attribute changed (name, location, SKU tier)**: How to check: `# forces replacement`; Fix: Revert the change, or `lifecycle { ignore_changes = [...] }`\n- **Resource removed from code (by mistake or in a merge)**: How to check: `git log -p`, `git diff main`; Fix: Restore the code\n- **Drift: someone changed it in the portal**: How to check: `terraform plan -refresh-only`; Fix: Align code with reality or revert the manual change\n- **Provider upgrade changed behaviour**: How to check: Lock file `.terraform.lock.hcl` changed; Fix: Pin the provider version, read the upgrade guide\n- **Intended: you really want it gone**: How to check: Confirmed with the team; Fix: Back up data, get approval, then apply',
      '**Step 3: Fix without destroying:** a `moved` block for a renamed resource; a `removed` block with `destroy = false` to stop managing a resource but keep it in Azure (Terraform 1.7+; older versions use `terraform state rm`); `ignore_changes` for an attribute you do not want Terraform to act on; and `prevent_destroy = true` so the plan fails instead of destroying a critical resource. Also add an Azure **resource lock** (`CanNotDelete`) on production data resources.',
      '**Step 4: Re-run the plan** and expect 0 to destroy.',
      '**Step 5: Guard it in the pipeline:** fail (or require extra approval) automatically when a plan contains a delete, by checking the plan JSON. Always `apply` the **saved plan file** (`terraform apply tfplan`) so what gets applied is exactly what was reviewed.',
      "**Interview answer:** \"I stop and do not apply. First, I read the plan to see whether it is a pure destroy or a replacement and what reason Terraform gives, such as 'not in configuration' or an attribute marked 'forces replacement'. Then I find the cause: wrong workspace or tfvars, a renamed resource or one moved into a module, a shifted `count` index, a ForceNew attribute change, code removed in a merge, drift, or a provider upgrade. Depending on the cause, I fix it with a `moved` block, `ignore_changes`, a `removed` block with `destroy = false` to keep the resource, or by restoring the code, and I re-run the plan until it shows zero destroys. If the destroy is really intended, I back up the data and get approval first. To prevent accidents, I use `prevent_destroy` and resource locks on critical resources, and the pipeline checks the plan JSON and blocks any plan with deletes until someone reviews it.\"",
    ],
    followUps: [
      'What is the difference between `-/+` and `+/-` in a plan, and when would you use `create_before_destroy`?',
      'Why does `count` cause destroys when an item is removed, and how does `for_each` avoid it?',
      'Does `prevent_destroy` protect a resource if someone deletes its block from the code?',
    ],
    traps: [
      'Running `terraform apply` without a saved plan: it re-plans and may apply something different from what was reviewed.',
      'Assuming `prevent_destroy` is enough: if the whole resource block is deleted, the lifecycle setting goes with it, so also use resource locks and a pipeline check.',
    ],
    code: [
      {
        title: 'Plan symbols',
        language: 'text',
        code: `- destroy                     -> resource will be deleted completely
-/+ destroy and then create   -> replacement (look for "# forces replacement")
+/- create then destroy       -> replacement with create_before_destroy`,
      },
      {
        title: 'Example plan output',
        language: 'text',
        code: `  # azurerm_storage_account.sa will be destroyed
  # (because azurerm_storage_account.sa is not in configuration)
  - resource "azurerm_storage_account" "sa" {`,
      },
      {
        title: 'Inspect the saved plan',
        language: 'bash',
        code: `terraform plan -out=tfplan
terraform show tfplan | grep -B2 -A10 "will be destroyed"`,
      },
      {
        title: 'Renamed resource: moved block',
        language: 'hcl',
        code: `moved {
  from = azurerm_storage_account.sa
  to   = azurerm_storage_account.logs
}`,
      },
      {
        title: 'Stop managing it, but keep it in Azure (Terraform 1.7+)',
        language: 'hcl',
        code: `removed {
  from = azurerm_storage_account.old

  lifecycle {
    destroy = false
  }
}`,
      },
      {
        title: 'Ignore a change you do not want Terraform to act on',
        language: 'hcl',
        code: `lifecycle {
  ignore_changes = [tags["CreatedOn"]]
}`,
      },
      {
        title: 'Protect critical resources permanently',
        language: 'hcl',
        code: `lifecycle {
  prevent_destroy = true      # plan fails instead of destroying it
}`,
      },
      {
        title: 'Azure resource lock on production data',
        language: 'bash',
        code: `az lock create -g rg-myapp-prod -n lock-no-delete --lock-type CanNotDelete`,
      },
      {
        title: 'Pipeline guard: block plans that delete',
        language: 'bash',
        code: `terraform plan -out=tfplan
DESTROYS=$(terraform show -json tfplan | jq '[.resource_changes[] | select(.change.actions | index("delete"))] | length')

if [ "$DESTROYS" -gt 0 ]; then
  echo "##vso[task.logissue type=error]Plan wants to destroy $DESTROYS resource(s). Review required."
  terraform show -json tfplan | jq -r '.resource_changes[] | select(.change.actions | index("delete")) | .address'
  exit 1
fi`,
      },
    ],
    tags: ['terraform', 'terraform plan', 'state', 'iac safety', 'azure devops'],
  },
]
