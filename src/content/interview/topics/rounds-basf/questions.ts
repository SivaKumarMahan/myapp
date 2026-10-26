import type { InterviewQuestion } from '../../../types'

/** BASF round: REST APIs, Azure Repos and Boards, shell scripting, rollback and CI/CD. */
export const roundsBasfQuestions: InterviewQuestion[] = [
  {
    id: 'itv-rbasf-1',
    level: 'intermediate',
    kind: 'open',
    prompt: 'What are REST APIs, and how do we use them?',
    probing:
      'Whether you understand HTTP methods, authentication and JSON responses, and can actually call an API such as Azure DevOps from a script.',
    answer: [
      'A REST API is a way for two applications to communicate with each other over HTTP or HTTPS.',
      'In simple words, imagine you want to get information from Azure DevOps without opening the Azure DevOps portal. You can use a REST API to request that information programmatically.',
      'For example, as a DevOps engineer, you can use REST APIs to:',
      "- Retrieve Azure DevOps pipeline details.\n- Trigger a pipeline automatically.\n- Check a pipeline's execution status.\n- Create work items in Azure Boards.\n- Retrieve information about Azure resources.",
      '**1. How does a REST API work?**',
      'For example, you send a request to Azure DevOps asking for the latest pipeline runs. The API returns the results, usually in JSON format.',
      '**2. Important HTTP methods**',
      '- **GET**: Read information; **Example**: Get pipeline status\n- **POST**: Create something or trigger an action; **Example**: Trigger a pipeline\n- **PUT**: Replace or update a resource; **Example**: Replace a resource representation\n- **PATCH**: Partially update a resource; **Example**: Update a work item field\n- **DELETE**: Delete a resource; **Example**: Delete a supported resource',
      'Remember: the API documentation defines which methods and operations are supported for each endpoint.',
      '**3. Practical example: Azure DevOps REST API**',
      'Suppose your interviewer asks: "How do you trigger an Azure DevOps pipeline using a REST API?" You can use the Azure DevOps Pipelines Runs API.',
      '**Step 1: Prepare the API URL.** Replace `ORGANIZATION` with your Azure DevOps organization, `PROJECT` with your project name and `PIPELINE_ID` with your pipeline ID.',
      '**Step 2: Send the request using curl.** Here:',
      '- `-X POST` sends a POST request.\n- `-u ":$AZDO_PAT"` supplies a Personal Access Token (PAT) for authentication.\n- `-H` sets the request content type.\n- `-d \'{}\'` sends an empty JSON request body to run the pipeline with its default configuration.',
      'The token must have the required pipeline permissions. For real projects, prefer Microsoft Entra ID-based authentication where supported, or use a securely stored, least-privilege token. Never hardcode credentials in scripts or commit them to Git.',
      'Official reference: Azure DevOps - Run Pipeline REST API (https://learn.microsoft.com/en-us/rest/api/azure/devops/pipelines/runs/run-pipeline).',
      '**4. How do you call a REST API from a shell script?**',
      'For example, to retrieve information from a public API, `curl -s "$API_URL"` sends a GET request and prints the JSON response. You can use `jq` to extract a specific field; `jq -r \'.title\'` prints only the title from the JSON response.',
      '**5. Where do DevOps engineers use REST APIs?**',
      '- **Azure DevOps:** Trigger pipelines, check build status, and manage work items.\n- **Azure Resource Manager:** Create, update, or retrieve Azure resources through supported APIs.\n- **GitHub:** Retrieve repository information and trigger supported workflow operations.\n- **Monitoring tools:** Retrieve alerts, metrics, or incident information.\n- **Automation scripts:** Connect multiple systems and automate repetitive tasks.',
      '**6. Common interview follow-up questions**',
      '**Q: How do you test a REST API?** I use Postman or curl to send requests. I verify the HTTP status code, response body, authentication, headers, and error messages.',
      '**Q: What are common HTTP status codes?**',
      '- **200**: Request successful\n- **201**: Resource created\n- **400**: Bad request\n- **401**: Authentication required or invalid\n- **403**: Access denied\n- **404**: Resource not found\n- **429**: Too many requests\n- **500**: Internal server error',
      '**Q: What is JSON?** JSON is a common data format used to send and receive structured information through REST APIs. It contains key-value pairs and can represent objects and arrays.',
      '**Interview-ready answer**',
      '"REST APIs allow different applications and services to communicate over HTTP or HTTPS. They use methods such as GET, POST, PUT, PATCH, and DELETE to retrieve or modify resources. In my DevOps work, I can use REST APIs with curl or Python to trigger Azure DevOps pipelines, retrieve their status, and automate deployment activities. I handle authentication securely, process JSON responses, and check HTTP status codes to verify whether the request succeeded."',
    ],
    code: [
      {
        title: 'How a REST API call flows',
        language: 'text',
        code: `Client (Python script / Shell script / Postman)
        |
        |  HTTP request: GET, POST, PUT, PATCH or DELETE
        v
REST API endpoint
        |  Authenticates the request and processes it
        v
Application / Service
        |  Returns requested information or confirms an action
        v
HTTP response + JSON data`,
      },
      {
        title: 'Pipelines Runs API URL',
        language: 'text',
        code: `POST https://dev.azure.com/ORGANIZATION/PROJECT/_apis/pipelines/PIPELINE_ID/runs?api-version=7.1`,
      },
      {
        title: 'Trigger a pipeline with curl',
        language: 'bash',
        code: `curl -X POST \\
  "https://dev.azure.com/ORG/PROJECT/_apis/pipelines/12/runs?api-version=7.1" \\
  -u ":$AZDO_PAT" \\
  -H "Content-Type: application/json" \\
  -d '{}'`,
        placeholders: ['ORG', 'PROJECT'],
      },
      {
        title: 'Call a public API from a shell script',
        language: 'bash',
        code: `#!/bin/bash

API_URL="https://jsonplaceholder.typicode.com/posts/1"

curl -s "$API_URL"`,
      },
      {
        title: 'Example JSON output',
        language: 'json',
        code: `{
  "userId": 1,
  "id": 1,
  "title": "sunt aut facere repellat",
  "body": "quia et suscipit..."
}`,
      },
      {
        title: 'Extract one field with jq',
        language: 'bash',
        code: `curl -s "$API_URL" | jq -r '.title'`,
      },
    ],
    tags: ['rest api', 'azure devops', 'curl', 'automation'],
  },
  {
    id: 'itv-rbasf-2',
    level: 'basic',
    kind: 'open',
    prompt: 'What are the types of Azure Repos in Azure DevOps?',
    probing:
      'That you know Git and TFVC, and can explain distributed versus centralized version control.',
    answer: [
      'In Azure DevOps, there are two types of version control repositories:',
      '1. Git repositories\n2. TFVC (Team Foundation Version Control)',
      '**1. Git Repository**',
      'Git is a distributed version control system. Every developer can have a local copy of the repository and its history.',
      '**Features:**\n- Supports branches and pull requests.\n- Supports merging and code reviews.\n- Integrates with CI/CD pipelines.\n- Commonly used for modern DevOps projects.',
      '**Example:** In my project, developers push code to Azure Repos Git, create pull requests, and trigger Azure Pipelines to build and deploy applications to AKS.',
      '**2. TFVC Repository**',
      'TFVC stands for Team Foundation Version Control. It is a centralized version control system where the server maintains the version history.',
      '**Features:**\n- Centralized source control.\n- Supports check-in and check-out workflows.\n- Supports file locking to prevent conflicting edits.\n- Often found in older or legacy projects.',
      '**Difference between Git and TFVC**',
      '- **Type**: Git: Distributed; TFVC: Centralized\n- **Local repository**: Git: Full repository history; TFVC: Typically workspace-based\n- **Branching**: Git: Lightweight and commonly used; TFVC: Supported, but generally more centralized\n- **Offline work**: Git: Extensive support; TFVC: More limited\n- **Pull requests**: Git: Supported in Azure Repos; TFVC: Not supported in the same Git pull-request workflow\n- **Common usage**: Git: Modern DevOps projects; TFVC: Legacy projects',
      '**Interview-ready answer**',
      '"Azure Repos supports two types of version control: Git and TFVC. Git is distributed and supports branching, pull requests, and modern CI/CD workflows. TFVC is centralized and is commonly used in legacy projects. In my DevOps projects, I generally use Git repositories to manage source code and integrate them with Azure Pipelines for automated builds and deployments."',
    ],
    code: [
      {
        title: 'Feature-branch workflow on Azure Repos Git',
        language: 'bash',
        code: `git clone https://dev.azure.com/ORG/PROJECT/_git/MYREPO
git checkout -b feature/login
git add .
git commit -m "Added login feature"
git push origin feature/login`,
      },
    ],
    tags: ['azure repos', 'git', 'tfvc', 'azure devops'],
  },
  {
    id: 'itv-rbasf-3',
    level: 'basic',
    kind: 'open',
    prompt: 'What is the use of Azure Boards?',
    probing:
      'Whether you know the work-tracking side of Azure DevOps and how it links to repos and pipelines for traceability.',
    answer: [
      'Azure Boards is a work management tool in Azure DevOps used to plan, track, and manage project tasks, bugs, and user stories.',
      'In simple words, it helps the team know what work needs to be done, who is responsible for it, and what the current status is.',
      '**1. Main features of Azure Boards**',
      '- **Work Items**: Track tasks, bugs, user stories, and features.\n- **Backlogs**: Maintain and prioritize upcoming work.\n- **Boards**: Track work through stages such as To Do, In Progress, and Done.\n- **Sprints**: Plan work for a specific period in Agile development.\n- **Queries**: Filter and find work items based on assigned user, status, priority, etc.\n- **Dashboards and reports**: Monitor progress and team performance.',
      '**2. Real-time DevOps example**',
      'Suppose your team is deploying a Java Spring Boot application to AKS.',
      '- **User Story**: Deploy the application to AKS using CI/CD.\n- **Task**: Create the Azure DevOps YAML pipeline.\n- **Bug**: Fix the `ImagePullBackOff` issue in AKS.',
      'The team assigns these work items to engineers and tracks their progress on the board: To Do → In Progress → Done.',
      'This helps the DevOps team coordinate deployments, track issues, and deliver work within sprint timelines.',
      '**3. How does Azure Boards integrate with CI/CD?**',
      'Azure Boards can be linked with Azure Repos and Azure Pipelines. For example:',
      '1. A developer creates a user story or task in Azure Boards.\n2. The developer links the work item to a Git commit or pull request.\n3. The code change triggers an Azure Pipeline.\n4. The team tracks the related development work and deployment progress.',
      'This improves traceability between requirements, code changes, and builds or releases. Linking work items does not automatically mean a deployment is successful; pipeline status and deployment results must also be checked.',
      '**Interview-ready answer**',
      '"Azure Boards is used to manage and track project work in Azure DevOps. We use it to create user stories, tasks, bugs, and features, plan sprints, assign work to team members, and track progress. In my DevOps project, I can use Azure Boards to track pipeline development tasks, AKS deployment activities, and production issues. It also integrates with Azure Repos and Azure Pipelines, helping us maintain traceability throughout the development lifecycle."',
    ],
    tags: ['azure boards', 'azure devops', 'agile', 'traceability'],
  },
  {
    id: 'itv-rbasf-4',
    level: 'intermediate',
    kind: 'open',
    prompt: 'What are the differences between application-side and network-side shell scripting?',
    probing:
      'Whether you can separate application health from network reachability, and know the commands and troubleshooting order for each.',
    answer: [
      'In DevOps, shell scripting is used on both the application side and the network side, but the purpose is different.',
      '- **Application-side scripting:** Checks and manages application processes, logs, deployments, and performance.\n- **Network-side scripting:** Checks connectivity, DNS resolution, ports, routes, and network availability.',
      '**1. Key differences**',
      "- **Main purpose**: Application-side: Ensure the application is running correctly; Network-side: Ensure network connectivity is working\n- **What we check**: Application-side: Processes, logs, CPU, memory, application health; Network-side: IP addresses, DNS, ports, routes, connectivity\n- **Common commands**: Application-side: `ps`, `grep`, `tail`, `curl`, `systemctl`; Network-side: `ping`, `curl`, `nc`, `dig`, `ip route`\n- **Common issues**: Application-side: Application crash, memory leak, service failure; Network-side: DNS failure, blocked port, routing issue\n- **Example**: Application-side: Restart a failed Nginx service; Network-side: Check whether a server's port 443 is reachable",
      '**2. Application-side shell scripting example**',
      '**Scenario:** You want to check whether Nginx is running and restart it if it is stopped. What this script does:',
      '- Checks whether Nginx is active.\n- If it is running, prints a success message.\n- If it is stopped, attempts to restart the service.',
      '**Real-time use:** You can use similar checks in server-maintenance scripts or monitoring automation.',
      '**Note:** This checks the service status, not whether the application is actually serving requests successfully. An HTTP health check is useful for that.',
      '**3. Network-side shell scripting example**',
      '**Scenario:** You want to check whether an application server is reachable on HTTPS port 443. What this script does:',
      '- Attempts to connect to the specified host on port 443.\n- Waits up to three seconds.\n- Reports whether the TCP connection succeeded.',
      '**Real-time use:** This helps investigate firewall rules, security groups/NSGs, routing, and service availability. A successful TCP connection does not necessarily mean the HTTPS application is healthy.',
      '**4. How to troubleshoot in a real-time scenario**',
      'Suppose your application is not accessible. User cannot access application → Step 1: Network check → Step 2: Application check → Step 3: Check logs.',
      '**Step 1: Network check.** Check DNS resolution and TCP connectivity.',
      '**Step 2: Application check.** Check whether the service is running and returning an HTTP response.',
      '**Step 3: Check logs.** Identify application or web-server errors.',
      '**Interview-ready answer**',
      '"Application-side shell scripting is used to automate application health checks, service restarts, log analysis, deployments, and resource monitoring. Network-side shell scripting is used to automate DNS checks, port connectivity, routing checks, and server reachability. For example, I use `systemctl` and `curl` to check application health, while I use `nslookup`, `nc`, and `ip route` to troubleshoot network connectivity. In real-time incidents, I check both sides to identify whether the problem is caused by the application or the network."',
    ],
    code: [
      {
        title: 'Application side: restart Nginx if stopped',
        language: 'bash',
        code: `#!/bin/bash

SERVICE="nginx"

if systemctl is-active --quiet "$SERVICE"; then
    echo "$SERVICE is running"
else
    echo "$SERVICE is stopped. Restarting..."
    sudo systemctl restart "$SERVICE"
fi`,
      },
      {
        title: 'Network side: check TCP port 443',
        language: 'bash',
        code: `#!/bin/bash

HOST="myapp.example.com"
PORT=443

if nc -z -w 3 "$HOST" "$PORT"; then
    echo "Network connection successful"
else
    echo "Cannot connect to $HOST on port $PORT"
fi`,
      },
      {
        title: 'Troubleshooting order',
        language: 'text',
        code: `User cannot access application
        |
        v
Step 1: Network check  -->  Step 2: Application check  -->  Step 3: Check logs`,
      },
      {
        title: 'Step 1: network check',
        language: 'bash',
        code: `nslookup myapp.example.com
nc -zv myapp.example.com 443`,
      },
      {
        title: 'Step 2: application check',
        language: 'bash',
        code: `systemctl status nginx
curl -I http://localhost`,
      },
      {
        title: 'Step 3: check logs',
        language: 'bash',
        code: `sudo journalctl -u nginx --since "10 minutes ago"
sudo tail -n 100 /var/log/nginx/error.log`,
      },
    ],
    tags: ['shell', 'bash', 'networking', 'troubleshooting'],
  },
  {
    id: 'itv-rbasf-5',
    level: 'advanced',
    kind: 'scenario',
    prompt: 'How do you do rollback in your project?',
    probing:
      'A concrete, verified rollback path (Helm history and rollback, kubectl rollout undo, a pipeline stage) and awareness that database changes do not roll back with the app.',
    answer: [
      'For a DevOps interview, you can explain rollback based on your Azure DevOps CI/CD pipeline and AKS deployments.',
      '**1. How do you perform rollback in your project?**',
      '**Interview-ready answer:** "In my project, we use Azure DevOps pipelines to deploy applications to AKS using Docker images and Helm charts. If a new deployment causes issues in production, such as application errors, failed health checks, or increased error rates, I first identify the problematic release. Then I roll back to the last known stable version, verify the application health, and monitor the logs to ensure the issue is resolved. We also maintain versioned Docker images and Helm releases so we can restore the previous application version quickly."',
      '**2. Rollback process in AKS using Helm**',
      '1. New version deployed → Application v2.0\n2. Issue detected → Pods failing, errors, or health checks failing\n3. Roll back → Restore the last known good Helm release\n4. Verify → Pods, endpoints, logs, and application health',
      '**Step 1: Check Helm release history.** Suppose revision 3 introduced the issue and revision 2 was stable.',
      '**Step 2: Roll back to the previous stable version.** `helm rollback myapp 2 -n prod` tells Helm to create a new release revision using the configuration and resources from revision 2.',
      "**Step 3: Verify the rollback.** Check rollout status, pods, events and logs. Also verify the application's health endpoint and monitor error rates.",
      '**3. What if you use kubectl instead of Helm?**',
      "If the deployment is managed directly by Kubernetes, `kubectl rollout undo` rolls back the Deployment's pod template to a previous revision. If Helm manages the application, prefer `helm rollback` so the release history and Helm-managed resources remain consistent.",
      '**4. How do you roll back through Azure DevOps?**',
      'In my CI/CD pipeline, I would:',
      '1. Detect the failure through deployment checks, monitoring, or smoke tests.\n2. Stop further promotion to production.\n3. Run a rollback stage that uses the previous stable Helm release revision.\n4. Verify pod readiness, service connectivity, and application health.\n5. Notify the team and investigate the root cause.',
      'The revision should be selected from verified release history, not hardcoded blindly in a reusable production pipeline.',
      '**5. Important interview follow-up: What about database changes?**',
      'Application rollback does not automatically reverse database schema or data changes. I use backward-compatible database migrations whenever possible, and plan a separate recovery strategy for destructive schema or data changes.',
      '**Strong closing statement for the interview**',
      '"My preferred rollback approach in AKS is Helm rollback because we maintain release history. I roll back to the last known stable revision, validate pod and application health, and monitor the service. I also ensure database changes are backward-compatible because rolling back the application alone may not restore the database."',
    ],
    followUps: [
      'How would your pipeline pick the last known good revision instead of hardcoding it?',
      'A release added a non-nullable column. How do you roll back safely?',
      'When would you roll forward with a fix instead of rolling back?',
    ],
    code: [
      {
        title: 'Step 1: Helm release history',
        language: 'bash',
        code: `helm history myapp -n prod`,
      },
      {
        title: 'Example history output',
        language: 'text',
        code: `REVISION  STATUS       DESCRIPTION
1         superseded   Install complete
2         superseded   Upgrade complete
3         deployed     Upgrade complete`,
      },
      {
        title: 'Step 2: roll back to revision 2',
        language: 'bash',
        code: `helm rollback myapp 2 -n prod`,
      },
      {
        title: 'Step 3: verify the rollback',
        language: 'bash',
        code: `kubectl rollout status deployment/myapp -n prod
kubectl get pods -n prod
kubectl get events -n prod --sort-by=.metadata.creationTimestamp
kubectl logs deployment/myapp -n prod --tail=100`,
      },
      {
        title: 'Rollback with kubectl (no Helm)',
        language: 'bash',
        code: `kubectl rollout history deployment/myapp -n prod
kubectl rollout undo deployment/myapp -n prod
kubectl rollout status deployment/myapp -n prod`,
      },
      {
        title: 'Rollback stage command in Azure DevOps',
        language: 'bash',
        code: `helm rollback myapp 2 -n prod --wait --timeout 5m`,
      },
    ],
    tags: ['rollback', 'helm', 'aks', 'azure devops', 'kubernetes'],
  },
  {
    id: 'itv-rbasf-6',
    level: 'advanced',
    kind: 'open',
    prompt: 'What is the deployment strategy you follow?',
    probing:
      'Whether you can describe your real rollout (rolling update settings, probes, gates) and justify it against blue-green and canary.',
    answer: [
      "For your Azure DevOps and AKS project, you can explain that you follow a Rolling Deployment strategy by default, with approvals and validation before production deployment. The strategy can vary depending on the application's availability and risk requirements.",
      '**1. Interview-ready answer**',
      '"In my project, we use Azure DevOps CI/CD pipelines to deploy containerized applications to AKS using Helm charts.',
      'We follow a rolling deployment strategy for regular releases. Kubernetes gradually replaces old pods with new pods while keeping the application available. We configure readiness and liveness probes, resource requests and limits, and deployment parameters to ensure a safe rollout.',
      'Our pipeline includes build, testing, SonarQube analysis, Docker image creation, Trivy vulnerability scanning, pushing the image to Azure Container Registry, and deployment to the required environment.',
      'We deploy to lower environments first, validate the application, and use approval gates before production. After production deployment, we check pod status, application health, logs, and monitoring alerts. If the new release causes issues, we roll back to the last stable Helm revision."',
      '**2. Deployment strategies you should know**',
      '- **Rolling deployment**: **How it works**: Gradually replaces old pods with new pods; **Best for**: Regular AKS releases with minimal downtime.\n- **Blue-Green deployment**: **How it works**: Runs two environments. After validating the new environment, traffic switches from the old environment to the new one; **Best for**: Fast traffic switching and easier application rollback, when both environments are ready.\n- **Canary deployment**: **How it works**: Releases the new version to a small portion of traffic first, then increases traffic if the release is healthy; **Best for**: High-risk changes where you want to limit initial user impact.',
      '**3. How do you implement rolling deployment in AKS?**',
      'In your Kubernetes Deployment YAML, what do these settings mean?',
      '- `replicas: 3`: runs three pod replicas.\n- `maxSurge: 1`: allows one extra pod above the desired replica count during the rollout.\n- `maxUnavailable: 0`: Kubernetes should not intentionally reduce the number of available replicas below the desired count during the rollout.\n- `readinessProbe`: helps prevent traffic from being sent to a pod until it is ready.',
      "These settings support availability, but they don't guarantee zero downtime by themselves. The application, health probes, capacity, and traffic routing must also be configured correctly.",
      'To monitor the deployment, use `kubectl rollout status` and `kubectl get pods`. To undo a problematic rollout, use `kubectl rollout undo`. If Helm manages the release, use the appropriate `helm rollback` command instead.',
      '**4. What if the interviewer asks, "Why not Blue-Green?"**',
      '"Rolling deployment is suitable for our regular releases because it gradually replaces pods without requiring two complete application environments. For a high-risk release where we need to validate the new version before sending production traffic, I would consider Blue-Green or Canary deployment. The choice depends on application criticality, infrastructure cost, and rollback requirements."',
    ],
    followUps: [
      'How would you implement a canary on AKS: ingress weights, a service mesh, or a tool like Argo Rollouts?',
      'What happens to in-flight requests when an old pod is terminated during a rolling update?',
      'How do maxSurge and maxUnavailable interact with node capacity?',
    ],
    code: [
      {
        title: 'Rolling update Deployment',
        language: 'yaml',
        code: `apiVersion: apps/v1
kind: Deployment
metadata:
  name: myapp
spec:
  replicas: 3
  strategy:
    type: RollingUpdate
    rollingUpdate:
      maxSurge: 1
      maxUnavailable: 0
  selector:
    matchLabels:
      app: myapp
  template:
    metadata:
      labels:
        app: myapp
    spec:
      containers:
        - name: myapp
          image: myregistry.azurecr.io/myapp:v2
          ports:
            - containerPort: 8080
          readinessProbe:
            httpGet:
              path: /health
              port: 8080`,
      },
      {
        title: 'Monitor the rollout',
        language: 'bash',
        code: `kubectl rollout status deployment/myapp -n prod
kubectl get pods -n prod`,
      },
      {
        title: 'Undo a problematic rollout',
        language: 'bash',
        code: `kubectl rollout undo deployment/myapp -n prod`,
      },
    ],
    tags: ['deployment strategy', 'rolling update', 'blue-green', 'canary', 'aks'],
  },
  {
    id: 'itv-rbasf-7',
    level: 'basic',
    kind: 'open',
    prompt:
      'What do CI and CD represent? What is the difference between Continuous Delivery and Continuous Deployment?',
    probing:
      'That you can define CI and both meanings of CD, and pin the difference to the manual production approval.',
    answer: [
      '**1. What do CI and CD represent?**',
      '**CI = Continuous Integration.** Developers frequently merge code changes into a shared repository. Every change can automatically trigger a pipeline to build the application and run tests to detect issues early.',
      '**CD = Continuous Delivery or Continuous Deployment.** Both automate the process of getting tested code ready for release or deployed to production, but there is one important difference.',
      '**2. Difference between Continuous Delivery and Continuous Deployment**',
      '- **Build and testing**: Continuous Delivery: Automated; Continuous Deployment: Automated\n- **Deployment to lower environments**: Continuous Delivery: Automated; Continuous Deployment: Automated\n- **Production deployment**: Continuous Delivery: Requires manual approval or a release decision; Continuous Deployment: Automatically happens after all required checks pass\n- **Human intervention**: Continuous Delivery: Before production release; Continuous Deployment: Not required for routine production releases\n- **Main goal**: Continuous Delivery: Keep code ready for production; Continuous Deployment: Automatically release every qualifying change to production',
      '**3. Real-time DevOps example**',
      'Suppose you are deploying a Java Spring Boot application to AKS using Azure DevOps. Your pipeline stages are:',
      '1. Developer pushes code to Azure Repos.\n2. Pipeline builds the application using Maven.\n3. SonarQube checks code quality.\n4. Docker image is built and scanned using Trivy.\n5. Image is pushed to Azure Container Registry (ACR).\n6. Application is deployed to Dev and QA.\n7. Production release follows one of these approaches:\n   - **Continuous Delivery:** Wait for the required production approval, then deploy.\n   - **Continuous Deployment:** Automatically deploy after all required tests and checks pass, without a routine manual release approval.',
      '**4. Interview-ready answer**',
      '"CI stands for Continuous Integration, where developers frequently merge code and automated pipelines build and test the changes. CD can mean Continuous Delivery or Continuous Deployment. In Continuous Delivery, the application is always ready for production, but production deployment requires a manual release decision or approval. In Continuous Deployment, every change that passes the required automated checks is deployed to production automatically."',
      '**Easy way to remember:**',
      '- **Continuous Delivery:** Ready for production; approval before release.\n- **Continuous Deployment:** Automatically released to production after passing checks.',
    ],
    code: [
      {
        title: 'Delivery vs deployment in Azure DevOps',
        language: 'text',
        code: `Continuous Delivery:
Code --> Build --> Test --> Stage --> Manual production approval --> Deploy to Production

Continuous Deployment:
Code --> Build --> Test --> Stage --> Automatic production deployment (after all required checks pass)`,
      },
    ],
    tags: ['ci/cd', 'continuous delivery', 'continuous deployment', 'azure devops'],
  },
]
