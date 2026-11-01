import type { InterviewQuestion } from '../../../types'

/** Production incidents, rollback, zero-downtime deployment, backups and Dockerfiles. */
export const myFrequentReleaseQuestions: InterviewQuestion[] = [
  {
    id: 'itv-myfaq-54',
    level: 'advanced',
    kind: 'open',
    prompt: 'Have you faced Production issues, and how did you tackle them?',
    probing:
      'A repeatable incident method with real examples, told as STAR, and evidence before restarts.',
    answer: [
      'Yes, I have handled Production issues involving AKS deployments, container memory, Azure Container Registry, database connections, and Application Gateway. I follow the same simple approach for each issue: understand the problem, check logs, Events and metrics, identify the cause, restore the service, verify that users can access it, apply a permanent fix, and add monitoring to prevent it happening again.',
      'I do not restart Pods without checking the reason for the failure. I first check recent deployments, Kubernetes Events, logs, and monitoring data. I restore the service safely, verify that it works, and then make a permanent correction.',
      '**How I handled these incidents effectively:**',
      '1. **Understand the impact.** Check which application and users are affected.\n2. **Collect information.** Check Kubernetes Events, logs, metrics, and recent changes.\n3. **Restore the service.** Roll back or correct the failed setting.\n4. **Verify the result.** Test the application as a user would, not only the Pod status.\n5. **Fix the cause.** Correct the application, Kubernetes configuration, permission, or network setting.\n6. **Prevent recurrence.** Add monitoring, alerts, tests, and documentation.',
      '**Recommended interview structure.** For each Production incident, I use the STAR method:',
      '- **Situation:** What failed, which environment was affected and what users observed.\n- **Task:** My responsibility during the incident.\n- **Action:** Evidence collected, mitigation, technical fix and coordination.\n- **Result:** How service recovery was verified and what prevention was added.',
      'I avoid saying only, "I restarted the Pod and it worked." I explain what failed, how I found the cause, how I fixed it, and how I prevented it from happening again.',
      '**Concise interview answer:** Yes, I have handled several Production issues in AKS. These include Pods failing after a deployment, `CrashLoopBackOff`, `OOMKilled` from a memory leak, `ImagePullBackOff`, Pending Pods, `NotReady` nodes, PostgreSQL connection failures, and Application Gateway 502/504 errors. I have also fixed applications that were down on Azure Windows VMs. For every issue, I first check the Pod Events, logs, metrics, and recent changes. I identify the exact cause instead of restarting the Pod immediately.',
      'I then roll back or correct the failed setting, verify that users can access the application, and add monitoring or tests to prevent the same issue from happening again. For client-facing incidents, I also share an RCA with the timeline, root cause and preventive actions.',
    ],
    code: [
      {
        title: 'Incident approach',
        language: 'text',
        code: `understand the problem
-> check logs, Events, and metrics
-> identify the cause
-> restore the service
-> verify that users can access it
-> apply a permanent fix
-> add monitoring to prevent it happening again`,
      },
    ],
    traps: [
      'Saying only "I restarted the Pod and it worked" - it shows no diagnosis and no prevention.',
    ],
    followUps: [
      'Tell me about the worst of these incidents using STAR.',
      'What did you add afterwards so it could not happen again?',
    ],
    tags: ['incident', 'production', 'aks'],
  },
  {
    id: 'itv-myfaq-55',
    level: 'advanced',
    kind: 'scenario',
    prompt:
      'After deploying a new version to AKS, users get HTTP 502 errors. How do you troubleshoot and fix it?',
    probing:
      'Linking a post-deploy 502 to Pod readiness, Service endpoints and probes, and rolling back when users are affected.',
    answer: [
      'An HTTP 502 error means the gateway cannot get a valid response from the application. If it starts immediately after a deployment, I would first check whether the new Pods are healthy and ready to receive traffic.',
      '**Check the Pods.** I would check whether the Pods are `Running` and `Ready`. The Events section may show readiness probe failures, container restarts, or configuration errors.',
      '**Check the application logs.** The logs help confirm whether the application failed to start, cannot connect to another service, or is listening on the wrong port.',
      '**Check the Service.** If the Service has no endpoints, it usually means the Pod labels do not match the Service selector or the Pods are not Ready.',
      '**Check the rollout.** If the new release is unhealthy, I would stop further deployment and roll back to the last working Helm revision.',
      '**Fix the root cause.** Depending on the evidence, I would:',
      '- Correct the readiness probe path or port.\n- Increase the startup time if the application needs longer to start.\n- Correct the Service selector or target port.\n- Fix a missing configuration value or dependency connection.\n- Roll back the application if the new version introduced the problem.',
      '**Example:** suppose the application needs 60 seconds to start, but the health check begins after 10 seconds. The Pod is marked unhealthy before it is ready, so Application Gateway has no healthy backend and returns 502. I would add or adjust the startup probe, redeploy, and verify that the Pods become Ready.',
      '**In short:** I would check the Pods, logs, Service endpoints, health probes, and rollout status. I would roll back if users are affected, fix the failed configuration, and then verify the application through the external URL.',
    ],
    code: [
      {
        title: 'Check the Pods',
        language: 'bash',
        code: `kubectl get pods -n <namespace>
kubectl describe pod <pod-name> -n <namespace>`,
      },
      { title: 'Check the logs', language: 'bash', code: `kubectl logs <pod-name> -n <namespace>` },
      {
        title: 'Check the Service and endpoints',
        language: 'bash',
        code: `kubectl get service -n <namespace>
kubectl get endpoints -n <namespace>`,
      },
      {
        title: 'Check the rollout and roll back',
        language: 'bash',
        code: `kubectl rollout status deployment/<deployment-name> -n <namespace>

helm rollback <release-name> <revision> -n <namespace>`,
      },
    ],
    followUps: [
      'How would a startup probe have prevented this?',
      "How do you confirm the fix from the user's side?",
    ],
    tags: ['incident', 'aks', '502'],
  },
  {
    id: 'itv-myfaq-56',
    level: 'intermediate',
    kind: 'scenario',
    prompt: 'Your Java Pods are repeatedly getting OOMKilled. How do you troubleshoot and fix it?',
    probing:
      'Understanding memory limits vs usage, confirming with evidence, and choosing between a justified limit increase and fixing the app.',
    answer: [
      'An OOMKilled error means the container used more memory than its allowed memory limit. The Linux kernel kills the process to protect the node.',
      '**Confirm the reason.** In the Events section, I would verify that the container was terminated with `Reason: OOMKilled`.',
      '**Check memory usage.** `kubectl top` helps me understand whether the Pod is actually consuming excessive memory or if the node itself is under memory pressure.',
      "**Review resource requests and limits.** If the limit is too low for the application, I would increase it based on the application's normal memory usage.",
      "**Check the application.** Look for memory leaks, verify if a recent deployment introduced higher memory consumption, and review the previous container's logs.",
      '**Monitor over time.** I would use monitoring tools like Prometheus and Grafana to see memory usage trends instead of relying on a single point in time.',
      '**Enable autoscaling if appropriate.** If memory usage increases with traffic, I would configure a Horizontal Pod Autoscaler (HPA) based on memory or CPU metrics to distribute the load across more Pods.',
      "**Example:** suppose a Java application has a memory limit of `512Mi`, but during peak traffic it uses `700Mi`. Kubernetes kills the container because it exceeds the limit. I would first confirm the usage. Then I'd either increase the memory limit - for example to `1Gi` - if that's justified, or optimize the application's memory consumption.",
      '**In short:** I would verify the OOMKilled event, check memory metrics, review resource limits, analyze application behavior, and then either optimize the application or adjust the Kubernetes resource configuration.',
    ],
    code: [
      { title: 'Confirm the reason', language: 'bash', code: `kubectl describe pod <pod-name>` },
      {
        title: 'Check memory usage',
        language: 'bash',
        code: `kubectl top pod <pod-name>
kubectl top node`,
      },
      {
        title: 'Requests and limits',
        language: 'yaml',
        code: `resources:
  requests:
    memory: 512Mi
  limits:
    memory: 1Gi`,
      },
      {
        title: 'Logs of the killed container',
        language: 'bash',
        code: `kubectl logs <pod-name> --previous`,
      },
    ],
    tags: ['incident', 'kubernetes', 'oomkilled'],
  },
  {
    id: 'itv-myfaq-57',
    level: 'intermediate',
    kind: 'scenario',
    prompt: 'Your AKS Pods are showing ImagePullBackOff. How do you troubleshoot and fix it?',
    probing:
      'Reading the Pod events to separate a wrong image, a missing AcrPull role and a network problem.',
    answer: [
      '`ImagePullBackOff` means Kubernetes cannot download the container image. It waits and retries with an increasing delay.',
      '**Check the exact error.** In the Events section, I would look for messages such as:',
      '- `not found` - the image name or tag is wrong.\n- `unauthorized` - AKS does not have permission to pull the image.\n- `connection timeout` - AKS cannot reach the registry.',
      '**Check the image name.** I would verify the registry name, repository, image name, and tag. I would also confirm that the image exists in Azure Container Registry.',
      '**Check ACR permissions.** For AKS to pull an image from ACR, its kubelet identity normally needs the `AcrPull` role on the registry. If the Events show `unauthorized`, I would verify and restore the correct role assignment.',
      '**Check network access.** If the registry uses a firewall or private endpoint, I would verify that the AKS network can reach ACR and resolve its DNS name.',
      '**Restart the rollout.** After correcting the image, permission, or network issue, I would restart and verify the deployment.',
      '**Example:** suppose a cleanup accidentally removes the `AcrPull` role from the AKS kubelet identity. New Pods cannot download their images and enter `ImagePullBackOff`, while old Pods may continue running. I would restore the `AcrPull` role and restart the rollout.',
      '**In short:** I would read the Pod Events, verify the image name and tag, check ACR permissions, and test network access. After fixing the cause, I would restart the deployment and confirm that all Pods are Running and Ready.',
    ],
    code: [
      {
        title: 'Check the exact error',
        language: 'bash',
        code: `kubectl describe pod <pod-name> -n <namespace>`,
      },
      {
        title: 'Check the image reference',
        language: 'bash',
        code: `kubectl get deployment <deployment-name> -n <namespace> -o yaml`,
      },
      {
        title: 'Restart and verify',
        language: 'bash',
        code: `kubectl rollout restart deployment/<deployment-name> -n <namespace>
kubectl rollout status deployment/<deployment-name> -n <namespace>`,
      },
    ],
    tags: ['incident', 'aks', 'acr'],
  },
  {
    id: 'itv-myfaq-58',
    level: 'advanced',
    kind: 'scenario',
    prompt:
      'Your application gets database connection timeouts during peak traffic. How do you troubleshoot and fix it?',
    probing:
      'Seeing that autoscaling multiplies connection pools, and fixing pool size and HPA bounds before buying a bigger database.',
    answer: [
      'A database connection timeout usually means the application cannot get a database connection within the allowed time. This can happen when there are too many connections, slow queries, or connections that are not closed correctly.',
      '**Check the application logs.** I would look for errors such as `connection timeout`, `too many connections`, or repeated database failures.',
      '**Check the number of Pods.** Each Pod can open several database connections. When HPA adds more Pods, the total number of connections can increase quickly.',
      '**Check database metrics.** I would use Azure Monitor to check:',
      '- Active database connections.\n- Maximum allowed connections.\n- CPU and memory usage.\n- Slow or long-running queries.',
      '**Review connection settings.** I would check how many connections each Pod can open and make sure the total stays within the database limit. I would also verify that the application closes connections after use.',
      '**Fix the issue.** Depending on the cause, I would:',
      '- Reduce the number of connections allowed per Pod.\n- Fix code that does not close connections.\n- Optimize slow database queries.\n- Set an appropriate maximum replica count in HPA.\n- Increase database capacity only when the existing limit is genuinely too small.',
      '**Example:** suppose the database safely supports 100 connections. If five Pods can each open 30 connections, they may request up to 150 connections. I would reduce each Pod to a safe value, such as 15 connections, so five Pods use at most 75 and leave capacity for other work.',
      '**In short:** I would check application logs, database metrics, Pod count, and connection settings. I would then reduce unnecessary connections, fix the application or queries, and make sure autoscaling does not exceed database capacity.',
    ],
    code: [
      {
        title: 'Check the application logs',
        language: 'bash',
        code: `kubectl logs <pod-name> -n <namespace>`,
      },
      {
        title: 'Check Pod count and HPA',
        language: 'bash',
        code: `kubectl get pods -n <namespace>
kubectl get hpa -n <namespace>`,
      },
    ],
    followUps: [
      'How would a connection pooler such as PgBouncer change this picture?',
      'What alert would have warned you before users saw timeouts?',
    ],
    tags: ['incident', 'database', 'hpa'],
  },
  {
    id: 'itv-myfaq-59',
    level: 'advanced',
    kind: 'scenario',
    prompt:
      'The AKS Pods are healthy, but Application Gateway returns HTTP 502. How do you troubleshoot and fix it?',
    probing:
      'Walking the request path hop by hop and knowing the backend health probe is the usual culprit.',
    answer: [
      'If the Pods are healthy but Application Gateway returns 502, the problem is usually between the gateway and the application backend. I would check each part of the request path: user, Application Gateway, Ingress or Service, Pod.',
      '**Check the Pods and Service.** The Pods should be Ready, and the Service should have endpoints. No endpoints usually means the Service selector does not match the Pods or the Pods are not Ready.',
      '**Test the application inside the cluster.** I would call the Service from another Pod. If it works inside the cluster, the application and Service are probably healthy, and I would continue checking Application Gateway.',
      '**Check backend health.** In Application Gateway, I would check whether the backend is shown as Healthy or Unhealthy. If it is Unhealthy, I would review the health probe:',
      '- Probe path, such as `/health`.\n- Protocol, HTTP or HTTPS.\n- Backend port.\n- Timeout setting.\n- Expected response code.',
      '**Check routing and network access.** I would verify that the gateway points to the correct backend and port. I would also check firewall and network rules if the gateway cannot connect to the AKS backend.',
      '**Check logs.** Application Gateway access logs and Pod logs help show whether requests reach the application and what response is returned.',
      '**Fix the issue.** Depending on the evidence, I would correct the health probe, backend port, routing rule, certificate, or network access. I would then confirm that Application Gateway reports the backend as Healthy.',
      '**Example:** suppose the application health endpoint changes from `/health` to `/actuator/health`, but Application Gateway still checks `/health`. The probe receives a 404 response, marks every backend Unhealthy, and returns 502 to users. I would update the probe path and verify the application through the public URL.',
      '**In short:** I would check the Pods, Service endpoints, Application Gateway backend health, health probe, routing, and logs. After fixing the failed setting, I would test the complete path from the public URL to the Pod.',
    ],
    code: [
      {
        title: 'Request path',
        language: 'text',
        code: `User
-> Application Gateway
-> Ingress or Service
-> Pod`,
      },
      {
        title: 'Check Pods, Service and endpoints',
        language: 'bash',
        code: `kubectl get pods -n <namespace>
kubectl get service -n <namespace>
kubectl get endpoints -n <namespace>`,
      },
      { title: 'Check the logs', language: 'bash', code: `kubectl logs <pod-name> -n <namespace>` },
    ],
    followUps: [
      'How would you test the Service from inside the cluster?',
      'What changes in this investigation if AGIC manages the gateway?',
    ],
    tags: ['incident', 'application gateway', '502'],
  },
  {
    id: 'itv-myfaq-60',
    level: 'advanced',
    kind: 'scenario',
    prompt: 'A Production deployment has caused errors. What rollback strategy do you follow?',
    probing:
      'Stopping impact first, choosing rollback vs fix-forward on clear criteria, and verifying from the user side.',
    answer: [
      'A rollback means returning the application to the last known working version. My first goal is to stop the impact and restore service safely.',
      '**Confirm the problem.** I check whether the errors started after the latest deployment. I also check monitoring, user errors, and the deployment time.',
      '**Pause the rollout.** If the deployment is still progressing and the new Pods are unhealthy, I pause it. This prevents more unhealthy Pods from replacing healthy ones while I investigate.',
      '**Choose rollback or a new fix.** I roll back when:',
      '- Users are affected.\n- The previous version is known to work.\n- A safe fix cannot be tested immediately.',
      'I deploy a new fixed version only when the correction is small, well understood, and fully tested.',
      '**Roll back a Kubernetes Deployment.** Check the rollout history, then roll back to the previous version or to a specific revision. A paused Deployment cannot be rolled back, so I run `kubectl rollout resume` first.',
      '**Roll back a Helm release.** Check the Helm revisions and restore the last working revision. I use a known image version such as `orders-api:1.4.1`; I do not rely on the changing `latest` tag.',
      '**Verify the rollback.** I also test the application through its external URL and confirm that error and latency metrics have returned to normal.',
      '**Example:** suppose version `2.0` causes readiness failures and HTTP 502 errors. Version `1.9` was stable. I pause the rollout, restore version `1.9`, wait for all Pods to become Ready, test the public API, and monitor it. I then fix and test version `2.0` before trying the deployment again.',
      '**In short:** I first confirm that the latest change caused the problem and pause the rollout. I restore the last known working application and configuration, verify the Pods and user request, and continue monitoring. After recovery, I identify the cause, correct it, and improve tests or alerts so the same issue does not happen again.',
    ],
    code: [
      {
        title: 'Confirm the problem',
        language: 'bash',
        code: `kubectl get pods -n <namespace>
kubectl rollout status deployment/<deployment-name> -n <namespace>
kubectl describe pod <pod-name> -n <namespace>
kubectl logs <pod-name> -n <namespace>`,
      },
      {
        title: 'Pause the rollout',
        language: 'bash',
        code: `kubectl rollout pause deployment/<deployment-name> -n <namespace>`,
      },
      {
        title: 'Kubernetes rollback',
        language: 'bash',
        code: `kubectl rollout history deployment/<deployment-name> -n <namespace>

kubectl rollout undo deployment/<deployment-name> -n <namespace>

kubectl rollout undo deployment/<deployment-name> \\
  --to-revision=<revision> \\
  -n <namespace>`,
      },
      {
        title: 'Helm rollback',
        language: 'bash',
        code: `helm history <release-name> -n <namespace>

helm rollback <release-name> <revision> -n <namespace>`,
      },
      {
        title: 'Verify the rollback',
        language: 'bash',
        code: `kubectl rollout status deployment/<deployment-name> -n <namespace>
kubectl get pods -n <namespace>
kubectl get endpoints -n <namespace>`,
      },
    ],
    traps: [
      'Running `kubectl rollout undo` on a paused Deployment - Kubernetes refuses; resume it first.',
    ],
    followUps: [
      'When would you fix forward instead of rolling back?',
      'How does Helm rollback differ from kubectl rollout undo?',
    ],
    tags: ['rollback', 'kubernetes', 'helm'],
  },
  {
    id: 'itv-myfaq-61',
    level: 'advanced',
    kind: 'open',
    prompt: 'How do you roll back configuration, database and infrastructure changes?',
    probing:
      'Knowing that data and infrastructure rollback are not a simple undo: expand/contract migrations and plan review.',
    answer: [
      '**Configuration rollback.** If only a ConfigMap, Secret reference, or environment setting changed, I restore the last approved configuration from Git and redeploy it. Secret values are restored from the approved secret manager, not copied from chat messages or local files.',
      '**Database changes.** Database rollback needs extra care because removing a column or table can lose data. I prefer backward-compatible changes:',
      '1. Add the new database field.\n2. Deploy code that can work with both old and new versions.\n3. Move or update the data.\n4. Remove the old field only in a later release.',
      'If a database restore is required, I follow the tested backup and restore process and confirm the acceptable data-loss window with the owner.',
      '**Infrastructure changes.** For Terraform or Bicep, I revert the code to the last working version and review the plan before applying it. I do not blindly reverse infrastructure changes because some resources may be deleted or recreated.',
    ],
    code: [
      {
        title: 'Re-apply the previous configuration',
        language: 'bash',
        code: `kubectl apply -f <previous-config-file>`,
      },
      {
        title: 'Review and apply the reverted infrastructure',
        language: 'bash',
        code: `terraform plan
terraform apply`,
      },
    ],
    followUps: [
      'Why is "add first, remove later" safer for schema changes?',
      'What in a Terraform plan would make you stop a rollback?',
    ],
    tags: ['rollback', 'database', 'terraform'],
  },
  {
    id: 'itv-myfaq-62',
    level: 'advanced',
    kind: 'open',
    prompt: 'What approach do you follow to ensure zero-downtime deployments in Production?',
    probing:
      'The full set of mechanics: replicas, maxUnavailable 0, readiness/startup probes, graceful shutdown, capacity.',
    answer: [
      'For zero-downtime deployment, the old version must continue serving users until the new version is healthy and ready. I use multiple replicas, rolling updates, health probes, graceful shutdown, and monitoring.',
      '**Run multiple replicas.** I run at least two replicas for an application that must remain available. With only one Pod, users can experience downtime while that Pod is replaced.',
      '**Use a rolling update.** A rolling update creates new Pods gradually and removes old Pods only after the new ones are Ready.',
      '- `maxSurge: 1` allows one extra Pod during deployment.\n- `maxUnavailable: 0` keeps all required replicas available.',
      'The cluster must have enough CPU and memory for the extra Pod.',
      '**Configure health probes.** Readiness is the most important probe during a rollout because an unready Pod should not receive user traffic.',
      '**Shut down gracefully.** When an old Pod is removed, the application should finish current requests before stopping. The application should also handle the termination signal and stop accepting new requests.',
      '**Example:** suppose an application has three replicas. During deployment, Kubernetes creates one new Pod. The readiness probe must pass before that Pod receives traffic. Kubernetes then removes one old Pod and repeats the process. At least three ready Pods continue serving users throughout the rollout.',
      '**In short:** I use multiple replicas, `maxUnavailable: 0`, correct readiness and startup probes, graceful shutdown, and enough cluster capacity. I keep application and database changes backward compatible, monitor the rollout, and roll back immediately if health checks or user requests fail.',
    ],
    code: [
      {
        title: 'Multiple replicas',
        language: 'yaml',
        code: `spec:
  replicas: 3`,
      },
      {
        title: 'Rolling update settings',
        language: 'yaml',
        code: `spec:
  strategy:
    type: RollingUpdate
    rollingUpdate:
      maxSurge: 1
      maxUnavailable: 0`,
      },
      {
        title: 'Startup, readiness and liveness probes',
        language: 'yaml',
        code: `startupProbe:
  httpGet:
    path: /health/startup
    port: 8080
  failureThreshold: 30
  periodSeconds: 5

readinessProbe:
  httpGet:
    path: /health/ready
    port: 8080
  periodSeconds: 5

livenessProbe:
  httpGet:
    path: /health/live
    port: 8080
  periodSeconds: 10`,
      },
      {
        title: 'Graceful shutdown',
        language: 'yaml',
        code: `spec:
  terminationGracePeriodSeconds: 30`,
      },
    ],
    followUps: [
      'What happens during a rollout if the cluster has no room for the surge Pod?',
      'How do you avoid dropped requests when an old Pod is terminated?',
    ],
    tags: ['deployment', 'kubernetes', 'zero downtime'],
  },
  {
    id: 'itv-myfaq-63',
    level: 'basic',
    kind: 'open',
    prompt: 'What is the difference between startup, readiness and liveness probes?',
    probing: 'Knowing what each probe does and which one controls traffic during a rollout.',
    answer: [
      '- **Startup probe:** Gives a slow application enough time to start.\n- **Readiness probe:** Sends traffic only when the Pod is ready.\n- **Liveness probe:** Restarts an application that is stuck.',
      'Readiness is the most important probe during a rollout because an unready Pod should not receive user traffic.',
    ],
    code: [
      {
        title: 'Probe configuration',
        language: 'yaml',
        code: `startupProbe:
  httpGet:
    path: /health/startup
    port: 8080
  failureThreshold: 30
  periodSeconds: 5

readinessProbe:
  httpGet:
    path: /health/ready
    port: 8080
  periodSeconds: 5

livenessProbe:
  httpGet:
    path: /health/live
    port: 8080
  periodSeconds: 10`,
      },
    ],
    tags: ['kubernetes', 'probes'],
  },
  {
    id: 'itv-myfaq-64',
    level: 'advanced',
    kind: 'open',
    prompt:
      'How do you keep changes compatible and protect replicas during a zero-downtime rollout?',
    probing:
      'Awareness that old and new versions run side by side, PDB limits, pre-Production validation and live monitoring.',
    answer: [
      '**Protect replicas during maintenance.** A PodDisruptionBudget prevents too many replicas from being removed together during planned maintenance. This helps during node drains, but it does not protect against every unexpected failure.',
      '**Keep changes compatible.** During a rolling update, old and new versions run at the same time. Therefore:',
      '- API changes should remain backward compatible.\n- Database changes should work with both versions.\n- Configuration should not break the old version.\n- Sessions should not depend on one specific Pod.',
      'For a database change, I normally add a new column first and remove the old column only in a later release.',
      '**Validate before Production.** Before deployment, I run unit and integration tests, security and image scans, deployment tests in a lower environment, and a basic application request after deployment. I build one versioned image and promote the same image to Production.',
      '**Monitor the rollout.** During the rollout, I monitor error rate, response time, Pod readiness, restarts, and Application Gateway backend health. If the new release is unhealthy, I stop or roll it back.',
    ],
    code: [
      {
        title: 'PodDisruptionBudget',
        language: 'yaml',
        code: `apiVersion: policy/v1
kind: PodDisruptionBudget
metadata:
  name: orders-api
spec:
  minAvailable: 2
  selector:
    matchLabels:
      app: orders-api`,
      },
      {
        title: 'Apply and watch the rollout',
        language: 'bash',
        code: `kubectl apply -f deployment.yaml
kubectl rollout status deployment/<deployment-name> -n <namespace>
kubectl get pods -n <namespace>
kubectl get endpoints -n <namespace>`,
      },
      {
        title: 'Roll back',
        language: 'bash',
        code: `kubectl rollout undo deployment/<deployment-name> -n <namespace>`,
      },
    ],
    followUps: [
      'What does a PDB not protect you from?',
      'How do you handle user sessions so they survive Pod replacement?',
    ],
    tags: ['deployment', 'kubernetes', 'pdb'],
  },
  {
    id: 'itv-myfaq-65',
    level: 'intermediate',
    kind: 'open',
    prompt: 'Compare rolling, canary and blue-green deployments.',
    probing:
      'Matching the strategy to risk: simple rolling, gradual canary with metrics, fast-rollback blue-green with extra capacity.',
    answer: [
      '**Rolling deployment.** New Pods gradually replace old Pods. This is simple and works well for normal low-risk releases.',
      '**Canary deployment.** A small percentage of users receives the new version first. If the error rate remains normal, more traffic is moved to it. This is useful for higher-risk changes.',
      '**Blue-green deployment.** The old and new versions run separately. After the new version passes testing, traffic switches to it. This gives a fast rollback but requires extra capacity.',
    ],
    code: [
      {
        title: 'Canary traffic split',
        language: 'text',
        code: `95% traffic -> old version
 5% traffic -> new version`,
      },
      {
        title: 'Blue-green',
        language: 'text',
        code: `Blue  = current version
Green = new version`,
      },
    ],
    tags: ['deployment', 'canary', 'blue-green'],
  },
  {
    id: 'itv-myfaq-66',
    level: 'basic',
    kind: 'open',
    prompt: 'What is the difference between a snapshot and a backup?',
    probing:
      'Clear definitions, and knowing a snapshot is not always needed for a stateless deploy.',
    answer: [
      'A snapshot is a point-in-time copy of a disk or volume. A backup is a protected copy used for longer-term recovery. I choose the protection based on what the deployment changes.',
      'I do not take a database or disk snapshot for every stateless application deployment. If only the container image changes and all important data is stored in managed services, a versioned image and Helm history may be enough for rollback.',
    ],
    tags: ['backup', 'snapshot'],
  },
  {
    id: 'itv-myfaq-67',
    level: 'advanced',
    kind: 'open',
    prompt: 'What backup do you take before a Production deployment?',
    probing:
      'Deciding protection from what actually changes (data, volumes, infra) and RPO/RTO, rather than snapshotting everything.',
    answer: [
      '**Decide what needs protection.** Before deployment, I ask:',
      '- Is the database changing?\n- Is a persistent volume changing?\n- Is infrastructure being replaced?\n- How much data loss is acceptable?\n- How quickly must the service be restored?',
      'These answers decide whether I need an application rollback, database backup, disk snapshot, or full disaster-recovery process.',
      '**Stateless AKS application.** For a normal stateless AKS application, I keep:',
      '- The previous container image.\n- Helm release history.\n- Kubernetes and Helm configuration in Git.\n- Terraform or Bicep code.',
      'Restoring a previous Helm revision is usually faster than restoring storage when no stored data changed.',
      '**Pre-deployment checklist.** Before a high-risk deployment, I confirm:',
      '- The previous image and Helm revision are available.\n- Required database backups are healthy.\n- Required snapshots are complete.\n- Configuration is version-controlled.\n- The restore steps and owner are known.\n- The recovery process has been tested.',
      "**In short:** I first identify what the deployment changes. For a stateless application, I normally use the previous image and Helm revision. For persistent volumes, I use a tested volume or disk snapshot. For databases, I use the database's supported backup and point-in-time restore. After any restore, I validate both the data and the complete user request.",
    ],
    code: [
      {
        title: 'Check Helm history',
        language: 'bash',
        code: `helm history <release-name> -n <namespace>`,
      },
      {
        title: 'Restore a previous revision',
        language: 'bash',
        code: `helm rollback <release-name> <revision> -n <namespace>`,
      },
    ],
    followUps: [
      'How do RPO and RTO change what you protect?',
      'Who signs off on the acceptable data-loss window?',
    ],
    tags: ['backup', 'deployment', 'helm'],
  },
  {
    id: 'itv-myfaq-68',
    level: 'advanced',
    kind: 'open',
    prompt: 'How do you snapshot and restore a Kubernetes persistent volume?',
    probing:
      'VolumeSnapshot mechanics, waiting for readyToUse, and restoring to a new PVC rather than overwriting.',
    answer: [
      'If the deployment changes important data on a persistent volume, I can create a `VolumeSnapshot` when the storage driver supports it.',
      'The snapshot should show `readyToUse: true` before I depend on it.',
      '**Restore the volume.** Create a new claim from the snapshot using `dataSource`. I normally restore to a new volume, validate the data, and then update the workload. This is safer than overwriting the current volume immediately.',
    ],
    code: [
      {
        title: 'VolumeSnapshot',
        language: 'yaml',
        code: `apiVersion: snapshot.storage.k8s.io/v1
kind: VolumeSnapshot
metadata:
  name: data-before-release
  namespace: production
spec:
  volumeSnapshotClassName: <volume-snapshot-class>
  source:
    persistentVolumeClaimName: application-data`,
      },
      {
        title: 'Check the snapshot',
        language: 'bash',
        code: `kubectl get volumesnapshot -n production
kubectl describe volumesnapshot data-before-release -n production`,
      },
      {
        title: 'Restore into a new PVC',
        language: 'yaml',
        code: `apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: restored-application-data
  namespace: production
spec:
  storageClassName: managed-csi
  dataSource:
    name: data-before-release
    kind: VolumeSnapshot
    apiGroup: snapshot.storage.k8s.io
  accessModes:
    - ReadWriteOnce
  resources:
    requests:
      storage: 20Gi`,
      },
    ],
    followUps: [
      'What does the VolumeSnapshotClass control?',
      'How do you switch the workload to the restored claim safely?',
    ],
    tags: ['backup', 'kubernetes', 'volumesnapshot'],
  },
  {
    id: 'itv-myfaq-69',
    level: 'intermediate',
    kind: 'open',
    prompt: 'How do you protect Azure managed disks and VMs before a change?',
    probing:
      'Snapshot vs Azure Backup, and crash-consistency: databases need their own backup method.',
    answer: [
      'For an Azure managed disk, I can create a snapshot. To recover, I create a new disk from the snapshot and attach or mount it through the approved process.',
      "A disk snapshot may contain data that was still being written. For a database, I prefer the database's own backup method because it understands transactions.",
      '**Virtual machine backup.** For a VM-based application, I use Azure Backup when full-machine recovery is required. A disk snapshot can be useful before a small disk-level change, but it is not a replacement for a managed backup policy.',
      "Before taking a snapshot, I make the application data consistent when required - for example, by stopping writes or using the application's supported backup process.",
    ],
    code: [
      {
        title: 'Create a managed-disk snapshot',
        language: 'bash',
        code: `az snapshot create \\
  --resource-group <resource-group> \\
  --name <snapshot-name> \\
  --source <disk-resource-id>`,
      },
    ],
    tags: ['backup', 'azure', 'disks'],
  },
  {
    id: 'itv-myfaq-70',
    level: 'intermediate',
    kind: 'open',
    prompt: 'How do you protect the database, Terraform state and Key Vault before a risky change?',
    probing:
      'Service-appropriate protection: PITR to a new server, state versioning, soft delete and purge protection.',
    answer: [
      '**Azure Database for PostgreSQL** provides automatic backups and point-in-time restore within the configured retention period. Before a risky database change, I:',
      '- Confirm that backups are healthy.\n- Confirm the retention period.\n- Record the deployment time.\n- Test the restore process in a non-Production environment.\n- Use a backward-compatible database change where possible.',
      'Point-in-time restore normally creates a new database server. I validate the restored data before moving application traffic to it.',
      '**Terraform state and infrastructure.** I protect Terraform state in a private Blob container with versioning and recovery protection. Before an infrastructure change I run `terraform plan` and review whether any resource will be deleted or replaced. To recover, I restore the correct state version only when necessary and make sure it matches the real Azure resources. I do not edit Terraform state manually during an incident unless there is a reviewed recovery plan.',
      '**Key Vault and configuration.** For Key Vault, I enable soft delete and purge protection. For application configuration, I keep approved versions in Git. Secrets are rotated or restored through Key Vault; they are not copied into source control as a backup.',
    ],
    code: [
      {
        title: 'Review the plan before an infrastructure change',
        language: 'bash',
        code: `terraform plan`,
      },
    ],
    tags: ['backup', 'database', 'terraform'],
  },
  {
    id: 'itv-myfaq-71',
    level: 'advanced',
    kind: 'scenario',
    prompt: 'A deployment has damaged data. How do you restore and verify it?',
    probing:
      'A careful restore order - roll back first, restore data only if needed, into a separate resource, then validate before switching.',
    answer: [
      'If deployment causes a problem:',
      '1. Stop or pause the deployment.\n2. Confirm what changed.\n3. Roll back the application if data is still valid.\n4. Restore data only if the data itself was changed or damaged.\n5. Restore into a separate resource where possible.\n6. Validate the data and application.\n7. Move traffic back safely.\n8. Monitor errors and user requests.',
      '**Restore verification.** I do not consider a restore successful only because the command completed. I verify:',
      '- Pods are Running and Ready.\n- The application can read and write expected data.\n- Record counts or important business data are correct.\n- External application requests work.\n- Error rate and response time are normal.',
      '**Example:** suppose a release includes a database change and is deployed at 10:00. At 10:15, users report incorrect data. I stop the rollout, check whether the application can be rolled back without restoring the database, and preserve current evidence. If a data restore is required, I restore PostgreSQL to a new server from a time just before 10:00, validate the records, and switch the application only after approval.',
    ],
    followUps: [
      'What happens to writes made between 10:00 and the restore?',
      'How do you switch the application to the restored server?',
    ],
    tags: ['backup', 'restore', 'incident'],
  },
  {
    id: 'itv-myfaq-72',
    level: 'intermediate',
    kind: 'open',
    prompt: 'Write a sample Dockerfile for a Spring Boot service and explain it.',
    probing:
      'Multi-stage builds, a small runtime image, a non-root user and exec-form ENTRYPOINT - and why each matters.',
    answer: [
      'A Dockerfile contains the steps used to build a container image. My project has a React frontend and a Spring Boot backend, so I use a separate Dockerfile for each - both use a multi-stage build so the final image only contains the built output, not the build tools.',
      'The main practices I follow are:',
      '- Use a trusted and versioned base image.\n- Use a multi-stage build when the source must be compiled.\n- Copy only required files.\n- Run as a non-root user.\n- Keep secrets outside the image.\n- Use a `.dockerignore` file.\n- Scan the final image.',
      '**Explanation of each part:**',
      '- The first `FROM` stage uses Maven and Java to build and test the application.\n- `WORKDIR` sets the directory for the following commands.\n- `COPY` adds the Maven file and source code.\n- `RUN mvn -B clean verify` compiles, tests, and packages the application.\n- The second `FROM` starts a smaller runtime image.\n- `COPY --from=build` copies only the final JAR from the build stage.\n- `USER 10001` runs the application as a non-root user.\n- `EXPOSE 8080` documents the application port.\n- `ENTRYPOINT` starts the Spring Boot application.',
      'The final image does not contain Maven, source code, or build files.',
      '**Example interview explanation:** for a Spring Boot service, I use a multi-stage Dockerfile. Maven builds and tests the JAR in the first stage. The second stage contains only the Java runtime and JAR. I create a non-root user, expose port 8080, and start the application with `ENTRYPOINT`. This produces a smaller and safer runtime image.',
      '**In short:** I select the Dockerfile from the application type, use versioned base images and multi-stage builds, copy only required files, run as non-root, and keep configuration and secrets outside the image. I build, run, inspect, and scan the image before deploying it.',
    ],
    code: [
      {
        title: 'Spring Boot multi-stage Dockerfile',
        language: 'dockerfile',
        code: `FROM maven:3.9.9-eclipse-temurin-21 AS build

WORKDIR /workspace

COPY pom.xml .
COPY src ./src

RUN mvn -B clean verify

FROM eclipse-temurin:21-jre-jammy

RUN groupadd --system appgroup \\
    && useradd --system --gid appgroup --uid 10001 appuser

WORKDIR /app

COPY --from=build --chown=appuser:appgroup \\
  /workspace/target/orders-service.jar /app/app.jar

USER 10001

EXPOSE 8080

ENTRYPOINT ["java", "-jar", "/app/app.jar"]`,
      },
      {
        title: 'Build and run',
        language: 'bash',
        code: `docker build -t orders-service:1.0.0 .
docker run --rm -p 8080:8080 orders-service:1.0.0`,
      },
    ],
    traps: [
      'Running the application as root.',
      'Copying the entire repository into the image.',
      'Storing passwords in `ENV` or `ARG`.',
      'Using a large build image as the runtime image.',
      'Using an unversioned base image.',
      'Ignoring image vulnerabilities.',
      'Starting a background process that immediately exits.',
    ],
    tags: ['docker', 'dockerfile', 'spring boot'],
  },
  {
    id: 'itv-myfaq-73',
    level: 'intermediate',
    kind: 'open',
    prompt: 'Write a Dockerfile for a React application served by NGINX.',
    probing:
      'Building static assets in Node and serving only the output from an unprivileged NGINX image.',
    answer: [
      '**Explanation of each part:**',
      '- The Node.js stage installs dependencies and creates the static website.\n- The NGINX stage receives only the built files.\n- NGINX serves the files on port 8080.\n- The unprivileged NGINX image avoids running as root.',
      'If the project creates a `build` directory instead of `dist`, I change the source path to match the project.',
    ],
    code: [
      {
        title: 'React + NGINX multi-stage Dockerfile',
        language: 'dockerfile',
        code: `FROM node:22-alpine AS build

WORKDIR /workspace

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

FROM nginxinc/nginx-unprivileged:1.27-alpine

COPY --from=build --chown=101:101 \\
  /workspace/dist /usr/share/nginx/html

EXPOSE 8080

CMD ["nginx", "-g", "daemon off;"]`,
      },
    ],
    tags: ['docker', 'dockerfile', 'react'],
  },
  {
    id: 'itv-myfaq-74',
    level: 'basic',
    kind: 'open',
    prompt: 'What is a .dockerignore file and why do you use it?',
    probing: 'Keeping the build context small and keeping secrets such as `.env` out of the image.',
    answer: [
      'I add a `.dockerignore` file so unnecessary or sensitive files are not sent to the Docker build.',
      'Typical entries are the `.git` folder, `.env` files, logs, `node_modules`, the Maven `target` folder and IDE folders.',
    ],
    code: [
      {
        title: '.dockerignore',
        language: 'text',
        code: `.git
.env
*.log
node_modules
target
.idea
.vscode`,
      },
    ],
    tags: ['docker', 'dockerignore'],
  },
  {
    id: 'itv-myfaq-75',
    level: 'basic',
    kind: 'open',
    prompt: 'What is the difference between COPY and ADD in a Dockerfile?',
    probing: 'Preferring predictable COPY and knowing the extra behaviour ADD brings.',
    answer: [
      'I normally use `COPY` because it has simple and predictable behavior.',
      '`ADD` has extra features, such as extracting local archives. I use it only when that behavior is intentionally required.',
    ],
    tags: ['docker', 'dockerfile'],
  },
  {
    id: 'itv-myfaq-76',
    level: 'basic',
    kind: 'open',
    prompt: 'What is the difference between CMD and ENTRYPOINT?',
    probing:
      'Executable vs default arguments, and why exec (JSON) form matters for signal handling.',
    answer: [
      '- `ENTRYPOINT` defines the main executable.\n- `CMD` provides the default command or arguments.\n- Arguments given to `docker run` **replace** `CMD` but are **appended** to `ENTRYPOINT`.',
      'Used together, `ENTRYPOINT` is the fixed program and `CMD` is its default argument. In Kubernetes, `command:` overrides `ENTRYPOINT` and `args:` overrides `CMD`.',
      'Both should normally use JSON (exec) form. In shell form, `/bin/sh` becomes PID 1 and may not pass `SIGTERM` to the application, so the Pod does not shut down gracefully.',
    ],
    code: [
      {
        title: 'ENTRYPOINT with a default CMD',
        language: 'dockerfile',
        code: `ENTRYPOINT ["java", "-jar", "/app/app.jar"]
CMD ["--spring.profiles.active=default"]`,
      },
      {
        title: 'Overriding at run time',
        language: 'bash',
        code: `docker run orders-service                                   # uses the CMD default
docker run orders-service --spring.profiles.active=prod     # replaces CMD only
docker run --entrypoint sh -it orders-service               # replaces ENTRYPOINT`,
      },
    ],
    tags: ['docker', 'dockerfile'],
  },
  {
    id: 'itv-myfaq-77',
    level: 'intermediate',
    kind: 'open',
    prompt:
      'How do you handle configuration, secrets and health checks for a containerized application?',
    probing:
      'One image for every environment, runtime config and secrets, Kubernetes probes, and image verification before deploy.',
    answer: [
      '**Configuration and secrets.** I do not copy Production configuration or secrets into the image. At runtime:',
      '- Normal configuration comes from environment variables or ConfigMaps.\n- Secrets come from Azure Key Vault through workload identity or the CSI driver.',
      'The same image can then run in Development, Testing, and Production.',
      '**Health checks in AKS.** For an AKS deployment, I normally define startup, readiness, and liveness probes in the Kubernetes manifest rather than depending only on Docker `HEALTHCHECK`. This prevents traffic from reaching a Pod before the application is ready.',
      '**Image verification.** In CI/CD, I also scan the image and push it with a unique version or commit ID. I do not deploy the changing `latest` tag.',
    ],
    code: [
      {
        title: 'Readiness probe',
        language: 'yaml',
        code: `readinessProbe:
  httpGet:
    path: /health/ready
    port: 8080`,
      },
      {
        title: 'Inspect the image',
        language: 'bash',
        code: `docker image inspect orders-service:1.0.0
docker history orders-service:1.0.0`,
      },
    ],
    tags: ['docker', 'configuration', 'secrets'],
  },
  {
    id: 'itv-myfaq-500',
    level: 'intermediate',
    kind: 'open',
    prompt: 'Did you prepare RCAs for clients? What did they contain?',
    probing:
      'A structured, blameless RCA in business language, with a timeline and preventive actions that have owners and dates.',
    answer: [
      'Yes. For every Production incident with client impact, we confirmed the root cause internally first, then shared a written RCA and walked the client through it in a call.',
      'The written RCA contained these sections:',
      '1. Incident summary\n2. Business impact (who, what, how long)\n3. Timeline (detected, mitigated, resolved)\n4. Detection (which alert or report)\n5. Immediate mitigation\n6. Root cause\n7. Permanent fix\n8. Preventive actions, with owners and dates',
      '**Example:** Pods were restarting with `OOMKilled`. Impact: some requests failed for about 20 minutes. Mitigation: more replicas and a temporary higher limit. Root cause: a memory leak in the application. Permanent fix: a code fix deployed through CI/CD, with memory flat afterwards. Prevention: a memory alert and a review of requests and limits for all services.',
      'I write it in simple business language for the client, without blame and without heavy jargon. An RCA is complete only when every preventive action has an owner and a date.',
    ],
    code: [
      {
        title: 'RCA structure',
        language: 'text',
        code: `1. Incident summary
2. Business impact (who, what, how long)
3. Timeline (detected, mitigated, resolved)
4. Detection (which alert or report)
5. Immediate mitigation
6. Root cause
7. Permanent fix
8. Preventive actions, with owners and dates`,
      },
    ],
    traps: [
      'Sharing a guess with the client before the root cause is confirmed internally.',
      'Listing preventive actions without an owner and a date - they never get done.',
    ],
    tags: ['incident', 'rca', 'communication'],
  },
  {
    id: 'itv-myfaq-501',
    level: 'intermediate',
    kind: 'scenario',
    prompt:
      'After a new deployment, the Pod shows 0/1 CrashLoopBackOff with 4 restarts. How do you troubleshoot and fix it?',
    probing:
      'Using --previous logs and the exit code to find the real cause instead of deleting the Pod again and again.',
    answer: [
      '`CrashLoopBackOff` means the container starts, crashes, and Kubernetes keeps restarting it. The wait between restarts grows (10s, 20s, 40s, up to 5 minutes). It is usually an application or configuration problem, not a node problem.',
      "**Check the Pod and the crashed container's logs.** `--previous` is the most important flag here. The current container may have just restarted, so the real error is in the previous one.",
      '**Read the exit code** of the last terminated container:',
      '- `0`: process finished, but a Deployment expects it to keep running (wrong command).\n- `1`: application error at startup.\n- `126` / `127`: command not executable / not found (wrong entrypoint).\n- `137`: killed with SIGKILL, usually `OOMKilled`.\n- `143`: terminated with SIGTERM.',
      '**Fix the cause.** Depending on the evidence:',
      '- Missing or wrong environment variable, ConfigMap or Secret: correct it and redeploy.\n- Database connection refused: check the connection settings.\n- `OOMKilled`: check memory usage and limits.\n- `Liveness probe failed`: fix the probe path or port, or add a startup probe for a slow app.\n- Bad image or code bug: roll back to the last good version, then fix.',
      '**Example:** a new release added a required `DB_HOST` variable, but the value was missing in the Production values file. The app exited with code 1 and the log said `DB_HOST is not set`. I rolled back with Helm to restore service, added the value, redeployed, and confirmed the Pod was `1/1 Running` and the API responded.',
    ],
    code: [
      {
        title: 'Troubleshooting flow',
        language: 'text',
        code: `kubectl describe pod (Events, Last State, Exit Code)
-> kubectl logs --previous (why did the last container die?)
-> find the cause: config, Secret, DB, port, command, memory, liveness probe
-> fix the Deployment / ConfigMap / Secret / image
-> kubectl rollout status -> 1/1 Running -> test the Service`,
      },
      {
        title: "Check the Pod and the crashed container's logs",
        language: 'bash',
        code: `kubectl get pods -n <namespace>
kubectl describe pod <pod-name> -n <namespace>
kubectl logs <pod-name> -n <namespace> --previous`,
      },
      {
        title: 'Read the exit code',
        language: 'bash',
        code: `kubectl get pod <pod-name> -n <namespace> \\
  -o jsonpath='{.status.containerStatuses[*].lastState.terminated}'`,
      },
      {
        title: 'Verify the fix',
        language: 'bash',
        code: `kubectl rollout status deployment/<deployment-name> -n <namespace>
kubectl get endpoints -n <namespace>`,
      },
    ],
    traps: [
      'Deleting the Pod again and again - the new Pod will crash for the same reason.',
      'Thinking a failing readiness probe restarts the container. Only a failing liveness probe restarts it; readiness only removes the Pod from the Service endpoints.',
    ],
    followUps: [
      'What does exit code 137 tell you?',
      'Why do you need --previous when reading the logs?',
    ],
    tags: ['incident', 'kubernetes', 'crashloopbackoff'],
  },
  {
    id: 'itv-myfaq-502',
    level: 'intermediate',
    kind: 'scenario',
    prompt: 'A Pod is not getting scheduled on any node. Why, and how do you fix it?',
    probing:
      'Reading the scheduler message in the Pod Events and knowing the scheduler works on requests, not real usage.',
    answer: [
      'A `Pending` Pod means the scheduler could not find a node that meets all its rules. The scheduler writes the exact reason in the Pod Events, for example `0/3 nodes are available: 3 Insufficient memory.`',
      '**Reason in Events, what I check, and the fix:**',
      '- **Insufficient CPU / memory:** `kubectl describe node`, `kubectl top nodes`. Lower requests, or add nodes (cluster autoscaler or bigger node pool).\n- **`nodeSelector` / affinity mismatch:** `kubectl get nodes --show-labels`. Fix the label or the rule.\n- **Untolerated taint:** `kubectl describe node` (Taints). Add a matching toleration, or use the right node pool.\n- **Node `NotReady`:** `kubectl get nodes`. Fix the node.\n- **Topology spread / anti-affinity too strict:** the Pod spec. Relax the rule or add nodes in more zones.\n- **PVC not bound:** `kubectl get pvc`. Fix the StorageClass or the disk zone.',
      'The scheduler uses **requests**, not real usage. A node can look idle in `kubectl top` and still be "full" for the scheduler.',
      'In AKS, if the cluster autoscaler is on but no node is added, I check its max node count and the subscription vCPU quota.',
    ],
    code: [
      {
        title: 'Read the scheduler reason',
        language: 'bash',
        code: `kubectl describe pod <pod-name> -n <namespace>`,
      },
      {
        title: 'Typical Events',
        language: 'text',
        code: `0/3 nodes are available: 3 Insufficient memory.
0/3 nodes are available: 3 node(s) had untolerated taint {dedicated: gpu}.
0/3 nodes are available: 3 node(s) didn't match Pod's node affinity/selector.`,
      },
      {
        title: 'Matching toleration',
        language: 'yaml',
        code: `tolerations:
  - key: "dedicated"
    operator: "Equal"
    value: "gpu"
    effect: "NoSchedule"`,
      },
    ],
    followUps: [
      'Why can a node look idle in kubectl top but still be full for the scheduler?',
      'The cluster autoscaler is enabled but no node is added. What do you check?',
    ],
    tags: ['incident', 'kubernetes', 'scheduling'],
  },
  {
    id: 'itv-myfaq-503',
    level: 'advanced',
    kind: 'scenario',
    prompt:
      'Pods and nodes are both NotReady. What is the reason? What happens if kubelet stops? What if etcd is down?',
    probing:
      'Separating Pod NotReady from Node NotReady, and understanding the kubelet and etcd roles in the cluster.',
    answer: [
      'These are two different problems, and I troubleshoot them differently.',
      '- **Pod NotReady:** start with `kubectl describe pod` and `kubectl logs`. Usual causes: readiness probe failing, app error, dependency down, wrong probe port.\n- **Node NotReady:** start with `kubectl describe node` (Conditions). Usual causes: kubelet down, containerd down, memory / disk / PID pressure, network to API server, expired kubelet certificate.',
      'If a node is `NotReady`, every Pod on it is affected, so I start with the node. In Conditions I look for `MemoryPressure=True`, `DiskPressure=True`, `PIDPressure=True`, or `Ready=Unknown` with "Kubelet stopped posting node status".',
      'On AKS, I do not SSH to nodes by default. I open a debug Pod on the node and use the host file system to check kubelet and the container runtime.',
      '**What happens if kubelet stops?** The node stops reporting status and becomes `NotReady` (after about 40 seconds). Existing containers may keep running, but nobody manages or reports them. No new Pods are scheduled there. After the eviction timeout (about 5 minutes), Deployment Pods are recreated on healthy nodes.',
      'The fix is to find why kubelet stopped (full disk, bad config, expired certificate), fix it, and restart kubelet. On AKS, node auto-repair also tries to reboot or reimage an unhealthy node. If it does not recover, I cordon, drain and reimage the node.',
      '**What if etcd is down?** etcd stores the whole cluster state. The API server reads and writes everything through it. Running Pods usually keep running, because kubelet on each node keeps what it already has. But you cannot reliably create, update, delete or scale anything. `kubectl get pods` may fail with `etcdserver: request timed out`.',
      'Pod NotReady: look at the app. Node NotReady: look at the node. I find the exact condition before restarting anything.',
    ],
    deeper: [
      'In HA, etcd runs 3 or 5 members and needs a quorum. With 3 members, losing 1 is fine. Losing 2 stops the control plane.',
      'On AKS, Microsoft manages the control plane and etcd. My job is to check the AKS Resource Health, use the Standard tier (uptime SLA) for Production, and back up my workloads and manifests (Velero or Azure Backup for AKS, plus GitOps).',
    ],
    code: [
      {
        title: 'Check the node',
        language: 'bash',
        code: `kubectl get nodes
kubectl describe node <node-name>`,
      },
      {
        title: 'Check kubelet and the container runtime on the node',
        language: 'bash',
        code: `systemctl status kubelet
journalctl -u kubelet --since "30 min ago"
systemctl status containerd`,
      },
      {
        title: 'Debug Pod on an AKS node',
        language: 'bash',
        code: `kubectl debug node/<node-name> -it --image=mcr.microsoft.com/azurelinux/busybox:1.36
chroot /host`,
      },
      {
        title: 'If kubelet stops',
        language: 'text',
        code: `kubelet stops
-> node stops reporting status -> node becomes NotReady (after about 40 seconds)
-> existing containers may keep running, but nobody manages or reports them
-> no new Pods are scheduled there
-> after the eviction timeout (about 5 minutes), Deployment Pods are recreated on healthy nodes`,
      },
      {
        title: 'Control plane path',
        language: 'text',
        code: `kubectl -> kube-apiserver -> etcd`,
      },
    ],
    followUps: [
      'How many etcd members can you lose in a 3-member cluster?',
      'How do you get a shell on an AKS node without SSH?',
    ],
    tags: ['incident', 'kubernetes', 'nodes', 'etcd'],
  },
  {
    id: 'itv-myfaq-504',
    level: 'advanced',
    kind: 'scenario',
    prompt:
      'The application runs in AKS but cannot connect to Azure Database for PostgreSQL. How do you troubleshoot it?',
    probing:
      'Layer-by-layer diagnosis (config, DNS, network, auth, database) driven by the exact error message, tested from inside the cluster.',
    answer: [
      'I do not assume the database is down. I check each layer in order and stop when I find the broken one: app logs (exact error), configuration (host, port 5432, database, user), DNS, network, authentication and permissions, then database health.',
      '**The error message points to the layer:**',
      '- `could not translate host name`: DNS, Private DNS Zone link.\n- `connection timed out`: NSG, firewall, route, Private Endpoint.\n- `connection refused`: wrong port or host.\n- `password authentication failed`: Secret value, user, Entra ID token.\n- `no pg_hba.conf entry` / SSL error: firewall rule or `sslmode=require` missing.\n- `too many connections`: connection limits.',
      '**Test from inside the cluster.** If DNS and TCP work but `psql` fails, the problem is credentials or permissions, not the network.',
      '**Check the Azure side.**',
      '- With Private Endpoint, the name must resolve to a private IP through the `privatelink.postgres.database.azure.com` Private DNS Zone, and that zone must be linked to the AKS VNet. With VNet integration (private access), the Flexible Server uses its own private DNS zone, which must also be linked.\n- NSG rules on the AKS subnet and database subnet allow 5432.\n- Server status, active connections against `max_connections`, CPU and storage in Azure Monitor.',
      '**Example:** after a new Private DNS Zone was created in a different VNet, the hostname from AKS resolved to the public IP, and public access was disabled. Pods got `connection timed out`. I linked the Private DNS Zone to the AKS VNet, `nslookup` returned the private IP, and the application connected without a restart.',
    ],
    deeper: [
      'With Workload Identity and Entra ID authentication, an `authentication failed` error can mean a missing database role for the identity, not a wrong password.',
    ],
    code: [
      {
        title: 'Layers to check',
        language: 'text',
        code: `App logs (exact error)
-> configuration (host, port 5432, database, user)
-> DNS (does the hostname resolve to the private IP?)
-> network (can the Pod reach TCP 5432?)
-> authentication and permissions
-> database health (connections, CPU, storage)`,
      },
      {
        title: 'Test from inside the cluster',
        language: 'bash',
        code: `kubectl run dns-test --rm -it --image=busybox:1.36 -n <namespace> -- \\
  nslookup <server>.postgres.database.azure.com

kubectl run pg-test --rm -it --image=postgres:16 -n <namespace> -- \\
  psql "host=<server>.postgres.database.azure.com port=5432 dbname=<db> user=<user> sslmode=require"`,
      },
      {
        title: 'Connections by state',
        language: 'text',
        code: `SELECT state, count(*) FROM pg_stat_activity GROUP BY state;`,
      },
    ],
    traps: ['Printing the real password in logs while testing.'],
    followUps: [
      'The hostname resolves to a public IP from the Pod. What is wrong?',
      'DNS and TCP work but psql fails. Where do you look next?',
    ],
    tags: ['incident', 'aks', 'postgresql', 'dns'],
  },
  {
    id: 'itv-myfaq-505',
    level: 'basic',
    kind: 'scenario',
    prompt: 'This Deployment YAML is broken. What is wrong?',
    promptCode: [
      {
        title: 'Broken Deployment',
        language: 'yaml',
        code: `apiVersion: apps/v1
kind: Deployment
metadata:
name: app
spec:
replicas: 3
template:
metadata:
labels:
app: app
spec:
containers:
- image: nginx`,
      },
    ],
    probing:
      'Knowing the Deployment hierarchy, the required selector and container name, and validating manifests before Production.',
    answer: [
      'I check three things first: indentation, the selector matching the Pod labels, and the container name and image.',
      '1. **Indentation.** YAML uses spaces to show nesting. `name` must be under `metadata`, `replicas` under `spec`, and so on.\n2. **Missing `selector`.** A `apps/v1` Deployment needs `spec.selector.matchLabels`, and it must match the template labels.\n3. **Missing container `name`.** Every container needs a name.',
      'I catch this before Production with a server-side dry run, `helm lint`, and schema validation of the rendered templates.',
      'The hierarchy is `Deployment -> spec -> template -> spec -> containers`. I also pin the image tag (`nginx:1.27`, not `nginx` or `latest`) so a rollback has a real version to go back to.',
    ],
    code: [
      {
        title: 'Corrected Deployment',
        language: 'yaml',
        code: `apiVersion: apps/v1
kind: Deployment
metadata:
  name: app
spec:
  replicas: 3
  selector:
    matchLabels:
      app: app
  template:
    metadata:
      labels:
        app: app
    spec:
      containers:
        - name: app
          image: nginx:1.27`,
      },
      {
        title: 'Validate before Production',
        language: 'bash',
        code: `kubectl apply --dry-run=server -f deployment.yaml
helm lint ./chart && helm template ./chart | kubeconform -strict`,
      },
    ],
    tags: ['kubernetes', 'yaml', 'deployment'],
  },
  {
    id: 'itv-myfaq-506',
    level: 'intermediate',
    kind: 'scenario',
    prompt: 'An application on an Azure Windows Server VM is down. How do you troubleshoot it?',
    probing:
      'Working outside-in with evidence before restarting, using Run Command when RDP fails, and adding prevention afterwards.',
    answer: [
      'I go from the outside in and collect evidence before restarting anything, because a restart can hide the root cause.',
      '**Check the VM in Azure.** I check the VM status, Resource Health, the Activity Log for recent changes, boot diagnostics and Azure Monitor metrics. If RDP does not work, I use Run Command or the Serial Console.',
      '**Check the service, port and logs on the VM.** If the port works locally but not from another VM, the cause is the NSG, Windows Firewall, or the app binding only to `127.0.0.1`.',
      '**Example:** the service stopped after a weekend. Event Viewer showed write failures, and `C:` had 0 bytes free because IIS logs were never cleaned. I freed space, started the service, tested the URL, and added a disk-space alert in Azure Monitor and a scheduled log cleanup task.',
      'A full disk is one of the most common reasons a Windows service will not start. I keep dependency updates on VMs controlled: test in lower environments, back up, and keep a rollback plan.',
    ],
    code: [
      {
        title: 'Outside-in order',
        language: 'text',
        code: `Azure VM healthy?
-> network: NSG, Load Balancer / App Gateway probe, Windows Firewall
-> Windows service running?
-> app listening on its port?
-> Event Viewer and app logs
-> CPU / memory / disk
-> dependencies: database, DNS, APIs, Key Vault
-> fix -> validate end to end -> monitor`,
      },
      {
        title: 'Check the VM in Azure',
        language: 'bash',
        code: `az vm get-instance-view -g <rg> -n <vm-name> --query "instanceView.statuses"

az vm run-command invoke -g <rg> -n <vm-name> \\
  --command-id RunPowerShellScript \\
  --scripts "Get-Service <service-name>; Get-PSDrive -PSProvider FileSystem"`,
      },
      {
        title: 'Check the service, port and logs on the VM',
        language: 'powershell',
        code: `Get-Service <service-name>
Get-NetTCPConnection -LocalPort 8080 -State Listen
Test-NetConnection <private-ip> -Port 8080        # from another VM in the VNet
Get-WinEvent -LogName Application -MaxEvents 50 | Where-Object LevelDisplayName -eq 'Error'
Test-NetConnection <db-server> -Port 1433          # dependency check`,
      },
    ],
    followUps: [
      'RDP is not working. How do you still run commands on the VM?',
      'The port answers locally but not from another VM. What are the likely causes?',
    ],
    tags: ['incident', 'azure', 'windows', 'vm'],
  },
  {
    id: 'itv-myfaq-507',
    level: 'advanced',
    kind: 'open',
    prompt:
      'How does Helm rollback work, and how do you make the pipeline roll back automatically?',
    probing:
      'Knowing Helm rollback creates a new revision, why Helm releases are not rolled back with kubectl, and --atomic in the pipeline.',
    answer: [
      '`helm rollback orders-api 2` does not delete revision 3. It creates a new revision 4 with the content of revision 2, so the history stays auditable. Without a revision number, Helm goes back to the previous one.',
      "If the app was deployed with Helm, I roll back with Helm, not with `kubectl rollout undo`. Helm restores the whole release (Deployment, ConfigMap, Service, values). `kubectl rollout undo` only changes the Deployment, and Helm's history then no longer matches the cluster.",
      'I use a known image version such as `orders-api:1.4.1`; I do not rely on the changing `latest` tag.',
      '**Automatic rollback in the pipeline.** `--atomic` waits for the resources to become ready and rolls back by itself if they do not. In Helm 4, this flag is called `--rollback-on-failure`. Before deploying, the pipeline runs `helm lint` and `helm template` so a broken chart never reaches the cluster.',
    ],
    deeper: [
      'Kubernetes keeps 10 old ReplicaSets by default (`revisionHistoryLimit`), and `helm upgrade` keeps 10 release revisions by default (`--history-max`). Enough history must exist to roll back to the last good version.',
    ],
    code: [
      {
        title: 'Helm rollback',
        language: 'bash',
        code: `helm rollback <release-name> <revision> -n <namespace>`,
      },
      {
        title: 'Automatic rollback in the pipeline',
        language: 'bash',
        code: `helm upgrade --install orders-api ./helm/orders-api -n production \\
  -f values-prod.yaml --set image.tag=$(Build.BuildId) \\
  --atomic --timeout 5m`,
      },
    ],
    traps: [
      'Running `kubectl rollout undo` on a Helm-managed release - only the Deployment changes and Helm history no longer matches the cluster.',
    ],
    followUps: [
      'After helm rollback orders-api 2 from revision 3, what does helm history show?',
      'What happens with --atomic if the Pods never become Ready?',
    ],
    tags: ['rollback', 'helm', 'ci/cd'],
  },
  {
    id: 'itv-myfaq-508',
    level: 'intermediate',
    kind: 'open',
    prompt: 'Three versions are available. How do you deploy one specific version?',
    probing:
      'Clarifying which "version" is meant: chart version, application image version, or an earlier release revision.',
    answer: [
      'First I clarify which "version" is meant, because Helm has three:',
      '- **Chart version** (in the Helm repo or ACR), for example `orders-api` chart `2.0.0`: `helm search repo orders-api --versions`, then `helm upgrade --install orders-api myrepo/orders-api --version 2.0.0 -n production`.\n- **Application image version**, for example image `orders-api:2.0`: `helm upgrade --install orders-api ./chart --set image.tag=2.0` (or set it in the values file).\n- **Earlier release revision on the cluster**, for example revision 2: `helm history orders-api`, then `helm rollback orders-api 2`.',
      'Chart version is in `Chart.yaml` `version`. App version is the image tag (`appVersion` is only a label).',
      'Immutable image tags (build ID or Git SHA) make every rollback point to a real image.',
    ],
    code: [
      {
        title: 'Chart stored in ACR as an OCI artifact',
        language: 'bash',
        code: `helm upgrade --install orders-api oci://myacr.azurecr.io/helm/orders-api \\
  --version 2.0.0 -n production`,
      },
      {
        title: 'Image version or earlier revision',
        language: 'bash',
        code: `helm upgrade --install orders-api ./chart --set image.tag=2.0

helm history orders-api
helm rollback orders-api 2`,
      },
    ],
    tags: ['helm', 'deployment', 'versioning'],
  },
  {
    id: 'itv-myfaq-509',
    level: 'advanced',
    kind: 'scenario',
    prompt: 'A Terraform apply failed in the middle. What do you do?',
    probing:
      'Knowing Terraform has no automatic rollback, comparing state with Azure, and handling import, tainted resources and locks safely.',
    answer: [
      'Terraform has no automatic rollback. Resources created before the failure stay in Azure and in state. I do not delete everything and start again. I fix the cause and let Terraform continue.',
      'I read the exact error, check what Terraform recorded with `terraform state list` / `state show`, check what really exists in Azure, fix the cause (SKU, quota, permission, name, dependency), and run `terraform plan`. Only the missing resources should appear. After apply, the next plan shows "No changes".',
      '**Special cases I handle carefully:**',
      '- **Resource exists in Azure but not in state.** Apply fails with "already exists". I import it instead of deleting it. The `import` block (Terraform 1.5+) is reviewed in the plan. `terraform import <address> <id>` also works.\n- **Resource is marked `tainted`.** It was created but failed later. The next apply replaces it. I check the plan first, and use `terraform untaint` only if the resource is actually fine.\n- **State is locked** after the pipeline agent crashed. I confirm no other run is active, then run `terraform force-unlock <LOCK_ID>`. With the azurerm backend, the lock is a lease on the state blob.',
    ],
    deeper: [
      'I keep `DEBUG` logs off in CI. They are huge and can contain secrets.',
      'The state storage account has versioning and soft delete on, so I can restore an old state file if it is damaged.',
    ],
    code: [
      {
        title: 'Recovery flow',
        language: 'text',
        code: `Read the exact error (pipeline log, TF_LOG=INFO if needed)
-> terraform state list / state show: what did Terraform record?
-> az resource show: what really exists in Azure?
-> fix the cause (SKU, quota, permission, name, dependency)
-> terraform plan: only the missing resources should appear
-> terraform apply -> plan again shows "No changes"`,
      },
      {
        title: 'Continue the apply',
        language: 'bash',
        code: `terraform state list
terraform state show azurerm_kubernetes_cluster.aks
terraform plan -out=tfplan
terraform apply tfplan`,
      },
      {
        title: 'Import an existing resource',
        language: 'hcl',
        code: `import {
  to = azurerm_storage_account.app
  id = "/subscriptions/<sub-id>/resourceGroups/rg-app/providers/Microsoft.Storage/storageAccounts/stapp001"
}`,
      },
    ],
    traps: [
      'Running force-unlock while another pipeline run is still active.',
      'Deleting everything and starting again instead of letting Terraform continue.',
    ],
    followUps: [
      'When would you untaint a resource instead of letting it be replaced?',
      'How does the azurerm backend implement the state lock?',
    ],
    tags: ['terraform', 'rollback', 'incident'],
  },
  {
    id: 'itv-myfaq-510',
    level: 'advanced',
    kind: 'open',
    prompt: 'How do you upgrade the AzureRM provider without breaking infrastructure?',
    probing:
      'Treating a provider upgrade as a change with a plan-time stop point, pinned versions and a committed lock file.',
    answer: [
      'A provider upgrade is also a change that needs a rollback plan.',
      'I read the changelog and upgrade guide (breaking changes, removed arguments), pin the new version on a branch, run `terraform init -upgrade`, and commit the updated `.terraform.lock.hcl`. In Dev/QA I expect the plan to show "No changes"; any replace or destroy needs an explanation. Production gets the same reviewed plan with manual approval.',
      'My rollback is the previous version pin and lock file in Git, plus a backup of the state file.',
    ],
    deeper: [
      'Going back to an older provider does not undo infrastructure changes, and an older provider may not read state written by a newer one. So the safe moment to stop is at plan time, before apply.',
      '`lifecycle { prevent_destroy = true }` on critical resources (databases, Key Vault) blocks an accidental destroy in the plan.',
    ],
    code: [
      {
        title: 'Upgrade flow',
        language: 'text',
        code: `Read the changelog and upgrade guide (breaking changes, removed arguments)
-> pin the new version, branch, terraform init -upgrade
-> commit the updated .terraform.lock.hcl
-> plan in Dev/QA: expect "No changes"; any replace/destroy needs an explanation
-> Production: same reviewed plan, manual approval`,
      },
      {
        title: 'Pin the provider',
        language: 'hcl',
        code: `terraform {
  required_providers {
    azurerm = {
      source  = "hashicorp/azurerm"
      version = "~> 4.40.0" # example: allow patch updates only
    }
  }
}`,
      },
      {
        title: 'Upgrade and plan',
        language: 'bash',
        code: `terraform init -upgrade
terraform plan -out=tfplan
terraform apply tfplan`,
      },
    ],
    followUps: [
      'Why can you not simply downgrade the provider after a bad apply?',
      'What does the lock file protect you from?',
    ],
    tags: ['terraform', 'azurerm', 'upgrade'],
  },
  {
    id: 'itv-myfaq-511',
    level: 'intermediate',
    kind: 'open',
    prompt:
      'How do you update an application dependency on VMs, such as .NET, Java or IIS, with a rollback plan?',
    probing:
      'Preparing rollback before the change: lower-environment testing, backups, change request, one VM at a time.',
    answer: [
      'On VMs, I prepare the rollback before I update a dependency such as the .NET runtime, Java, IIS or a database driver.',
      'I check the supported version and release notes, test in Dev, QA and UAT, and take a backup (VM snapshot or Azure Backup, config files, and keep the old installer). The change request has the impact, downtime and rollback steps. I update in the maintenance window, one VM at a time behind the load balancer, and validate the service, port, logs and an end-to-end test. If it fails, I reinstall the previous version or restore the snapshot.',
      'OS patches go through Azure Update Manager. App dependencies go through Ansible, DSC or a pipeline, not manual installs.',
      'For new VMs, a golden image in Azure Compute Gallery already has the approved versions, so rollback can also mean redeploying the previous image version.',
    ],
    code: [
      {
        title: 'VM dependency update',
        language: 'text',
        code: `Check the supported version and release notes
-> test in Dev -> QA -> UAT
-> back up: VM snapshot or Azure Backup, config files, keep the old installer
-> change request with impact, downtime and rollback steps
-> update in the maintenance window, one VM at a time behind the load balancer
-> validate: service running, port open, logs, end-to-end test
-> if it fails: reinstall the previous version or restore the snapshot`,
      },
    ],
    tags: ['rollback', 'vm', 'patching'],
  },
  {
    id: 'itv-myfaq-512',
    level: 'advanced',
    kind: 'open',
    prompt:
      'How did you upgrade the AKS Kubernetes version without downtime, and what challenges did you face?',
    probing:
      'One minor version at a time, control plane before node pools, and real blockers such as deprecated APIs and strict PDBs.',
    answer: [
      'I upgrade AKS one minor version at a time, first in a lower environment and then in Production. I upgrade the control plane first, then each node pool in a controlled way. Replicas, PDBs, readiness probes, and spare node capacity keep the application available while nodes are drained.',
      'In my project the version is set in Bicep, and a Shell/Python script runs the node pool upgrades one at a time and checks pod health between pools. Upgrades run inside a planned maintenance window.',
      '**Challenges I faced:**',
      '- **Deprecated APIs removed in the new version:** found them with `kubent`/`pluto` and the AKS deprecated-API insights, then updated manifests and Helm charts.\n- **Ingress controller or add-on not compatible:** upgraded it to a supported version before the cluster upgrade.\n- **Drain blocked by a PDB:** fixed PDBs that allowed zero disruption.\n- **Single-replica workloads:** raised replicas to at least 2 before the upgrade.\n- **Not enough capacity for evicted Pods:** used `--max-surge` and checked quota for the surge nodes.',
      '**Example:** a service had 2 replicas and a PDB with `minAvailable: 2`. Zero disruptions were allowed, so the node drain stopped. I saw it in the node events, changed the PDB to `maxUnavailable: 1`, and the upgrade continued without downtime.',
    ],
    deeper: [
      'AKS does not allow skipping minor versions. 1.31 -> 1.33 means two upgrades.',
      'For a very risky upgrade, I create a new node pool on the new version, move workloads to it, and then delete the old pool. This is blue-green at node pool level.',
      'Auto-upgrade channels plus a planned maintenance window keep clusters on supported versions.',
    ],
    code: [
      {
        title: 'Upgrade order',
        language: 'text',
        code: `Check supported versions and release notes
  -> Check deprecated APIs, Helm charts, ingress controller, add-ons
  -> Upgrade Dev/QA, run smoke tests
  -> Prod: upgrade control plane only
  -> Upgrade node pools one by one (surge node -> cordon -> drain -> reimage)
  -> Verify nodes, pods, ingress, dashboards, smoke tests`,
      },
      {
        title: 'Control plane first, then node pools',
        language: 'bash',
        code: `az aks get-upgrades -g rg-prod -n aks-prod -o table

# Control plane first
az aks upgrade -g rg-prod -n aks-prod \\
  --kubernetes-version 1.33.2 --control-plane-only

# Then each node pool, with an extra surge node and a drain timeout
az aks nodepool upgrade -g rg-prod --cluster-name aks-prod -n userpool \\
  --kubernetes-version 1.33.2 --max-surge 33% --drain-timeout 30

kubectl get nodes -o wide
kubectl get pods -A | grep -v Running`,
      },
    ],
    traps: [
      'A PDB with `minAvailable` equal to the replica count - zero disruptions are allowed and the node drain blocks.',
    ],
    followUps: [
      'You need to go from 1.31 to 1.33. How many upgrades is that?',
      'How do you find deprecated APIs before the upgrade?',
    ],
    tags: ['aks', 'upgrade', 'zero downtime'],
  },
  {
    id: 'itv-myfaq-513',
    level: 'intermediate',
    kind: 'open',
    prompt: 'Will there be downtime when you rotate a secret or certificate in Key Vault?',
    probing:
      'Understanding that downtime comes from the old credential dying before all Pods use the new one, and how each consumption method picks it up.',
    answer: [
      'Rotating the secret in Key Vault does not cause downtime by itself. Downtime happens if the old credential stops working before every Pod is using the new one. So I keep both valid for a short overlap.',
      '- With the Key Vault CSI driver and `--enable-secret-rotation`, the mounted file is refreshed (default every 2 minutes).\n- If the application reads the secret only at startup, I do a rolling restart. With multiple replicas and readiness probes, users see no downtime.\n- Secrets synced as environment variables never change inside a running Pod. They always need a restart.',
      'The same idea works for TLS certificates. I enable auto-renewal in Key Vault and point Application Gateway to the **versionless** secret ID, so it picks up the renewed certificate (it checks every 4 hours). Expiry alerts at 30, 15, and 7 days catch anything that does not renew automatically.',
    ],
    code: [
      {
        title: 'Rotation with overlap',
        language: 'text',
        code: `Create new credential (old one still valid)
  -> Put new version in Key Vault
  -> Pods pick it up (CSI driver refresh or rolling restart)
  -> Validate the application
  -> Disable the old credential`,
      },
      {
        title: 'Rolling restart',
        language: 'bash',
        code: `kubectl rollout restart deployment/orders-api -n prod
kubectl rollout status deployment/orders-api -n prod`,
      },
    ],
    traps: ['Expecting a secret synced as an environment variable to change inside a running Pod.'],
    tags: ['secrets', 'certificates', 'zero downtime', 'key vault'],
  },
  {
    id: 'itv-myfaq-514',
    level: 'intermediate',
    kind: 'open',
    prompt: 'How do you get zero downtime on Azure App Service? What are deployment slots?',
    probing: 'Slot deploy, warm-up and swap, slot-sticky settings, and swap-back as the rollback.',
    answer: [
      'A deployment slot is a separate live copy of the Web App with its own host name. I deploy the new version to the `staging` slot, test it, and then swap it with Production. The swap warms up the instances first, so users do not see a cold start. Rollback is a swap back, because v1 is now in staging.',
      '- Slots need Standard tier or higher.\n- Mark environment-specific values (for example the database connection string) as **deployment slot settings**, so they stay with their slot during a swap.\n- Set a warm-up path (`WEBSITE_SWAP_WARMUP_PING_PATH`) and enable the App Service health check, so the swap waits for a healthy app.\n- **Traffic %** on a slot sends a small share of users to it, which gives a simple canary.\n- Keep at least 2 instances and configure autoscale on the App Service Plan (for example, scale out when CPU is above 70% for 10 minutes). Scaling out adds instances; scaling up changes the plan size.',
    ],
    code: [
      {
        title: 'Slot flow',
        language: 'text',
        code: `Pipeline -> deploy v2 to staging slot
         -> smoke tests on staging URL
         -> approval
         -> swap staging <-> production
         -> v1 is now in staging (rollback = swap back)`,
      },
      {
        title: 'Deploy to the slot and swap',
        language: 'yaml',
        code: `- task: AzureWebApp@1
  inputs:
    azureSubscription: azure-prod-connection
    appType: webAppLinux
    appName: orders-web
    deployToSlotOrASE: true
    resourceGroupName: rg-prod
    slotName: staging
    package: $(Pipeline.Workspace)/drop/app.jar

- task: AzureAppServiceManage@0
  inputs:
    azureSubscription: azure-prod-connection
    Action: Swap Slots
    WebAppName: orders-web
    ResourceGroupName: rg-prod
    SourceSlot: staging`,
      },
    ],
    traps: [
      'Forgetting to mark the database connection string as a slot setting - after the swap, Production points at the staging database.',
    ],
    tags: ['app service', 'deployment slots', 'zero downtime'],
  },
  {
    id: 'itv-myfaq-515',
    level: 'advanced',
    kind: 'open',
    prompt: 'How do backup and restore work for Azure Database for PostgreSQL?',
    probing:
      'Two layers - automatic Flexible Server backups with PITR to a new server, and pg_dump/pg_restore for logical copies.',
    answer: [
      'There are two layers. Azure Database for PostgreSQL Flexible Server takes the **automatic** backups (full snapshots plus WAL), and I use `pg_dump` / `pg_restore` for **logical** copies when I need one database, one table, or a copy outside Azure.',
      '**Built-in backups (Flexible Server):**',
      '- Retention is **7 to 35 days** (default 7). Point-in-time restore to any second inside that window.\n- **Geo-redundant backup** copies backups to the paired region. It must be chosen when the server is created.\n- For longer retention (months or years, for audit), use **Azure Backup** with a Backup vault.\n- Single Server was retired in March 2025, so new answers should talk about Flexible Server.',
      'Point-in-time restore always creates a **new** server.',
      'A plain `pg_dump > file.sql` is restored with `psql`; a custom-format dump (`-Fc`) is restored with `pg_restore`.',
    ],
    deeper: [
      '`pg_dump` does not include roles. Recreate users and grants separately (`pg_dumpall --roles-only`, with `--no-role-passwords` on a managed service).',
      'The restored server needs the same networking as the old one (private endpoint or VNet integration, private DNS, firewall rules) before the app can connect.',
      'Test the restore regularly and write down how long it took. That number is your real RTO.',
    ],
    code: [
      {
        title: 'Point-in-time restore to a new server',
        language: 'bash',
        code: `az postgres flexible-server restore \\
  --resource-group rg-data \\
  --name pg-orders-restore-0959 \\
  --source-server pg-orders-prod \\
  --restore-time "2026-10-15T09:59:00Z"`,
      },
      {
        title: 'Logical backup and restore',
        language: 'bash',
        code: `# Custom format: compressed, lets you restore selected objects
pg_dump -h pg-orders-prod.postgres.database.azure.com -U dbadmin -d orders \\
  -Fc -f orders_$(date +%F).dump

# Restore into a new database, 4 parallel jobs, ignore original owners
pg_restore -h pg-orders-restore.postgres.database.azure.com -U dbadmin \\
  -d orders_restored --no-owner -j 4 orders_2026-10-15.dump

# Restore only one table
pg_restore -h <host> -U dbadmin -d orders_restored -t payments orders_2026-10-15.dump`,
      },
    ],
    traps: [
      'Expecting point-in-time restore to overwrite the existing server - it always creates a new one.',
      'Turning on geo-redundant backup later - it must be chosen when the server is created.',
    ],
    followUps: [
      'The restored server is up but the app cannot connect. What did you forget?',
      'How do you restore only one table?',
    ],
    tags: ['backup', 'postgresql', 'restore'],
  },
  {
    id: 'itv-myfaq-516',
    level: 'intermediate',
    kind: 'open',
    prompt:
      'How do you back up an Azure VM with Azure Backup, and what restore options do you have?',
    probing:
      'Recovery Services vault and policy, on-demand backup before a change, the restore options, and application consistency.',
    answer: [
      'With Azure Backup, the VM is protected in a **Recovery Services vault** with a policy (daily or hourly schedule plus daily/weekly/monthly retention). Before a risky change I also take an on-demand backup.',
      '**Restore options from a recovery point:**',
      '- **Create a new VM** - safest, the old one stays for comparison.\n- **Restore disks** - then attach them or build a VM from them.\n- **Replace existing disks** - in place, when the VM itself must come back.\n- **File recovery** - mount the recovery point and copy back a few files.\n- **Cross-region restore** - when the vault is GRS with cross-region restore enabled.',
      'Windows VMs get application-consistent backups through VSS. Linux VMs need pre/post scripts (for example, to freeze a database) for application consistency; otherwise they are file-system consistent.',
    ],
    code: [
      {
        title: 'Protect a VM and take an on-demand backup',
        language: 'bash',
        code: `az backup protection enable-for-vm \\
  --resource-group rg-app --vault-name rsv-prod \\
  --vm vm-app-01 --policy-name DailyPolicy

# On-demand backup before a risky change (date is dd-mm-yyyy)
az backup protection backup-now \\
  --resource-group rg-app --vault-name rsv-prod \\
  --container-name vm-app-01 --item-name vm-app-01 \\
  --backup-management-type AzureIaasVM --retain-until 30-11-2026`,
      },
    ],
    tags: ['backup', 'azure', 'vm'],
  },
  {
    id: 'itv-myfaq-517',
    level: 'advanced',
    kind: 'open',
    prompt:
      'How do you migrate on-prem servers to Azure, and how is that different from backup and DR?',
    probing:
      'Separating Azure Backup, Site Recovery and Azure Migrate by the problem each solves, and knowing replication is not backup.',
    answer: [
      'They solve three different problems, and people often mix them up.',
      '- **Azure Backup:** data was deleted or corrupted. Point-in-time copies kept in a vault. Restore from a recovery point; RPO up to the last backup, RTO in hours.\n- **Azure Site Recovery (ASR):** a whole region or data centre is down. Continuous replication to a second region. Fail over in minutes; RPO in seconds to minutes.\n- **Azure Migrate:** move on-prem servers to Azure once. Discover, assess, replicate, test, cut over. One-time move, then decommission.',
      '**Replication is not backup.** If data is corrupted or ransomware encrypts it, ASR replicates the damage. You need both.',
      'Always do a **test** migration or **test** failover before the real one. After migration, the new VMs are not protected automatically - enable Azure Backup and, if required, ASR.',
    ],
    code: [
      {
        title: 'Migration flow with Azure Migrate',
        language: 'text',
        code: `Discover + assess (sizing, cost, dependencies)
  -> prepare landing zone (VNet, NSG, VPN/ExpressRoute, DNS, RBAC)
  -> replicate servers (agentless for VMware/Hyper-V, Mobility agent for physical)
  -> test migration into an isolated VNet
  -> cutover: stop app, final sync, migrate, switch DNS
  -> enable Azure Backup + monitoring on the new VMs
  -> keep on-prem switched off but intact until sign-off (rollback)`,
      },
      {
        title: 'DR flow with Site Recovery',
        language: 'text',
        code: `Replicate VM to secondary region -> recovery plan (order: DB, then app, then web)
  -> test failover into isolated VNet (no impact on production)
  -> real failover -> commit -> re-protect -> fail back later`,
      },
    ],
    traps: [
      'Saying Site Recovery replaces backup - ransomware or corrupted data is replicated too.',
    ],
    followUps: [
      'What is your rollback if the migration cutover fails?',
      'Why does the recovery plan start the database before the app and web tiers?',
    ],
    tags: ['backup', 'site recovery', 'azure migrate', 'dr'],
  },
  {
    id: 'itv-myfaq-518',
    level: 'advanced',
    kind: 'scenario',
    prompt: 'If you restore a Jenkins backup, will it work?',
    probing:
      'Knowing what lives in JENKINS_HOME, why the secrets folder and matching versions matter, and verifying the restore end to end.',
    answer: [
      'Yes, if the backup is complete and I restore onto the **same Jenkins version and plugin versions**. Most failed restores come from a missing `secrets/` folder or a plugin mismatch.',
      'Everything lives in `JENKINS_HOME` (usually `/var/lib/jenkins`). I take the backup when Jenkins is quiet (or stopped) so files are consistent, and skip `workspace/` and `caches/` because they are rebuilt on the next run.',
      '**Why a restore fails:**',
      '- **No `secrets/` folder:** `credentials.xml` is restored but cannot be decrypted, so every credential is broken. Store this backup encrypted, because it contains the keys.\n- **Different Jenkins or plugin versions:** plugins fail to load and jobs show errors. Restore on the same version first, then upgrade in a controlled way.\n- **Wrong owner:** Jenkins cannot read its own files.\n- **New hostname:** update the Jenkins URL; agents may need to reconnect.',
      'After the restore I check: login works, jobs are listed, one credential is used successfully, agents are online, and one real pipeline runs end to end.',
    ],
    deeper: [
      'Better than only file backups: keep Jenkins **as code** - Configuration as Code (JCasC) YAML, a pinned `plugins.txt`, and `Jenkinsfile`s in Git. Then a rebuild is repeatable, and the backup mainly protects credentials and build history.',
      'On Kubernetes or a VM, a disk/PVC snapshot of `JENKINS_HOME` is a good extra layer, but test that it actually restores. A backup that has never been restored is not a proven backup.',
    ],
    code: [
      {
        title: 'JENKINS_HOME layout',
        language: 'text',
        code: `JENKINS_HOME/
  config.xml                 global settings
  credentials.xml            stored credentials (encrypted)
  secrets/                   master.key, hudson.util.Secret - keys that decrypt the credentials
  jobs/<job>/config.xml      job definitions (builds/ = history, optional)
  plugins/                   installed plugins
  users/, nodes/             users and agent definitions
  workspace/, caches/        can be skipped - rebuilt on the next run`,
      },
      {
        title: 'Backup',
        language: 'bash',
        code: `# Take it when Jenkins is quiet (or stopped) so files are consistent
tar -C /var/lib -czf /backup/jenkins-home-$(date +%F).tar.gz \\
  --exclude='jenkins/workspace' --exclude='jenkins/caches' jenkins`,
      },
      {
        title: 'Restore',
        language: 'bash',
        code: `sudo systemctl stop jenkins
sudo mv /var/lib/jenkins /var/lib/jenkins.old            # keep the old copy
sudo tar -C /var/lib -xzpf /backup/jenkins-home-2026-10-15.tar.gz
sudo chown -R jenkins:jenkins /var/lib/jenkins
sudo systemctl start jenkins
journalctl -u jenkins -f                                 # watch for plugin errors`,
      },
    ],
    traps: [
      'Backing up credentials.xml without the secrets folder - the credentials cannot be decrypted.',
    ],
    followUps: [
      'All credentials are broken after the restore. What is missing?',
      'How would JCasC change your backup strategy?',
    ],
    tags: ['jenkins', 'backup', 'restore'],
  },
  {
    id: 'itv-myfaq-519',
    level: 'basic',
    kind: 'open',
    prompt: 'How is the React frontend connected to the Spring Boot backend?',
    probing:
      'Knowing the browser calls the backend API, never the database, and how one ingress host avoids CORS and hard-coded URLs.',
    answer: [
      "The React app runs in the user's browser and calls the backend REST APIs over HTTPS. It never connects to the database. In AKS, both run as separate Deployments and Services behind one ingress.",
      'Because both use the same host name, React simply calls `fetch("/api/orders")`. No backend URL is hard-coded in the image, and there is no CORS problem.',
      'The pipeline builds two images (`frontend:<build-id>` and `backend:<build-id>`), pushes them to ACR, and deploys both with Helm.',
    ],
    code: [
      {
        title: 'Request path',
        language: 'text',
        code: `User -> Application Gateway / Ingress
          /      -> frontend Service (NGINX + React files)
          /api/* -> backend Service (Spring Boot) -> PostgreSQL`,
      },
    ],
    tags: ['architecture', 'react', 'spring boot', 'aks'],
  },
  {
    id: 'itv-myfaq-520',
    level: 'advanced',
    kind: 'open',
    prompt:
      'The Docker build needs a secret, for example a token for a private npm or Maven feed. How do you handle it?',
    probing:
      'Knowing ARG/ENV leak into history and metadata, multi-stage is not enough, and BuildKit secret mounts are the fix.',
    answer: [
      'I do not use `ARG` or `ENV` for it, because those values can be seen with `docker history` or in the image metadata. A multi-stage build does not fully protect it either: the build stage can still be in the build cache.',
      'I use a BuildKit secret mount. The secret is available only for that one `RUN` step and is never written to a layer.',
      'In the pipeline, Trivy (with secret scanning) and Gitleaks check the image and repository for leaked credentials.',
    ],
    deeper: [
      'If a secret ever gets into an image, I rotate the secret first. Deleting the line and rebuilding is not enough.',
    ],
    code: [
      {
        title: 'BuildKit secret mount',
        language: 'dockerfile',
        code: `# syntax=docker/dockerfile:1
RUN --mount=type=secret,id=npm_token \\
    NPM_TOKEN=$(cat /run/secrets/npm_token) npm ci`,
      },
      {
        title: 'Pass the secret at build time',
        language: 'bash',
        code: `docker build --secret id=npm_token,env=NPM_TOKEN -t frontend:1.0.0 .`,
      },
    ],
    traps: [
      'Passing the token as a build ARG and assuming a multi-stage build hides it.',
      'Removing a leaked secret from the Dockerfile and rebuilding without rotating it.',
    ],
    followUps: [
      'Where can an ARG value still be seen after the build?',
      'A token was found in an image already in ACR. What do you do first?',
    ],
    tags: ['docker', 'secrets', 'buildkit'],
  },
  {
    id: 'itv-myfaq-521',
    level: 'intermediate',
    kind: 'open',
    prompt: 'Your Docker build is slow. How do you make it faster?',
    probing:
      'Reusing unchanged layers: layer order, .dockerignore, BuildKit cache mounts and registry cache for empty CI agents.',
    answer: [
      'I make sure unchanged layers are reused instead of rebuilt on every commit.',
      '- **Order layers by change frequency.** Copy `package*.json` or `pom.xml`, install dependencies, then copy the source code.\n- **Use `.dockerignore`** so `.git`, `node_modules`, and `target` are not sent as build context.\n- **Use BuildKit cache mounts** so the package cache survives between builds.\n- **Use registry cache in CI.** Hosted pipeline agents start empty, so I keep the cache in ACR.\n- **Use a slim base image** and combine `apt-get update && apt-get install ... && rm -rf /var/lib/apt/lists/*` in one `RUN`.\n- **Run independent pipeline jobs in parallel**, for example unit tests, SonarQube, and dependency scans.',
      'The cache mount is not part of the image, so every `RUN` that needs the cache must mount it.',
    ],
    code: [
      {
        title: 'BuildKit cache mounts',
        language: 'dockerfile',
        code: `RUN --mount=type=cache,target=/root/.m2 mvn -B clean verify
RUN --mount=type=cache,target=/root/.npm npm ci`,
      },
      {
        title: 'Registry cache in CI',
        language: 'bash',
        code: `docker buildx build \\
  --cache-from type=registry,ref=myacr.azurecr.io/orders-service:buildcache \\
  --cache-to type=registry,ref=myacr.azurecr.io/orders-service:buildcache,mode=max \\
  -t myacr.azurecr.io/orders-service:$(Build.BuildId) --push .`,
      },
    ],
    tags: ['docker', 'performance', 'ci/cd'],
  },
  {
    id: 'itv-myfaq-522',
    level: 'advanced',
    kind: 'scenario',
    prompt:
      'An image deployment to Azure Container Instances takes 10 minutes. How do you bring it down to 5?',
    probing:
      'Measuring build, push, pull and startup separately, and knowing ACI pulls the full image for each new container group.',
    answer: [
      'First I measure where the time goes: build, push, pull, or application startup. ACI does not cache images between new container groups, so a large image is pulled in full every time.',
      'Then I fix the slow part:',
      '- **Slow pull:** a multi-stage build, a slim base image, and `.dockerignore` make the image smaller. Use Linux containers instead of Windows if possible, because Windows images are several GB. Keep ACR in the same region as ACI, or use ACR geo-replication.\n- **Slow build:** layer ordering and registry cache.\n- **Slow startup:** check the app for slow initialization, database migrations at startup, or waiting on a dependency.\n- If start time still matters, ACI **standby pools** keep pre-created container groups ready to use.',
      'ACI itself does not make anything faster. The time is saved by a smaller image, a closer registry, and a faster startup.',
    ],
    deeper: [
      'The container group events show `Pulling -> Pulled -> Started`, so the gap between them tells me whether the pull or the application startup is the slow part.',
    ],
    code: [
      {
        title: 'Find where the time goes',
        language: 'bash',
        code: `az container show -g rg-app -n orders-api \\
  --query "containers[0].instanceView.events" -o table   # Pulling -> Pulled -> Started
docker history myacr.azurecr.io/orders-api:1.4.2         # biggest layers`,
      },
    ],
    followUps: [
      'Why does ACI pull the full image every time?',
      'The pull is fast but the container takes minutes to become ready. What do you check?',
    ],
    tags: ['docker', 'aci', 'performance'],
  },
  {
    id: 'itv-myfaq-523',
    level: 'basic',
    kind: 'open',
    prompt: 'What common mistakes do you avoid when writing Dockerfiles?',
    probing:
      'Security and size basics: non-root, small context, no secrets, slim versioned images.',
    answer: [
      '- Running the application as root.\n- Copying the entire repository into the image.\n- Storing passwords in `ENV` or `ARG`.\n- Using a large build image as the runtime image.\n- Using an unversioned base image.\n- Ignoring image vulnerabilities.\n- Starting a background process that immediately exits.',
      'I select the Dockerfile from the application type, use versioned base images and multi-stage builds, copy only required files, run as non-root, and keep configuration and secrets outside the image. I build, run, inspect, and scan the image before deploying it.',
    ],
    tags: ['docker', 'dockerfile', 'best practices'],
  },
]
