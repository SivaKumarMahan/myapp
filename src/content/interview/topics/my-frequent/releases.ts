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
      '**Concise interview answer:** Yes, I have handled several Production issues in AKS. These include Pods failing after a deployment, `OOMKilled` errors, `ImagePullBackOff`, database connection timeouts, and Application Gateway 502 errors. For every issue, I first check the Pod Events, logs, metrics, and recent changes. I identify the exact cause instead of restarting the Pod immediately. I then roll back or correct the failed setting, verify that users can access the application, and add monitoring or tests to prevent the same issue from happening again.',
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
      '- `ENTRYPOINT` defines the main executable.\n- `CMD` provides the default command or arguments.',
      'Both should normally use JSON form. This helps the process receive stop signals correctly.',
    ],
    code: [
      {
        title: 'Exec-form ENTRYPOINT',
        language: 'dockerfile',
        code: `ENTRYPOINT ["java", "-jar", "/app/app.jar"]`,
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
]
