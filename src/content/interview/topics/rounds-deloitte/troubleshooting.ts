import type { InterviewQuestion } from '../../../types'

/** Terraform recovery, state sharing, Git conflicts and Kubernetes troubleshooting from the Deloitte rounds. */
export const roundsDeloitteTroubleshootingQuestions: InterviewQuestion[] = [
  {
    id: 'itv-rdel-1',
    level: 'advanced',
    kind: 'scenario',
    prompt: 'What do you do if a Terraform deployment fails in the middle of `terraform apply`?',
    probing:
      'Whether you recover a partial apply methodically - error, state, real resources, plan, import, locks - instead of deleting everything and re-running.',
    answer: [
      "If a Terraform deployment fails midway through `terraform apply`, I don't immediately rerun apply. First I find out what failed, what was already created, and what Terraform recorded in state.",
      '**My troubleshooting flow** (see code below)',
      '**1. Check the exact Terraform error**',
      'First I look at the Terraform output: `terraform apply` or in Azure DevOps, I check the failed pipeline task logs.',
      'For more detailed logs: `TF_LOG=INFO terraform apply`',
      'For very detailed debugging: `TF_LOG=DEBUG terraform apply`',
      "I don't normally keep DEBUG enabled in CI because the logs become very big and may show sensitive information.",
      '**2. Check Terraform state**',
      'First: `terraform state list`',
      'This tells me what Terraform currently knows about.',
      'Then I check a specific resource: `terraform state show azurerm_linux_virtual_machine.vm`',
      'I compare this with what actually exists in Azure.',
      'That means the resource was created successfully before the later resource failed.',
      '**3. Check Azure directly**',
      'I verify the actual resource: `az resource show --ids <resource-id>`',
      'Or service-specific commands: `az vm show ...`, `az network vnet show ...`, `az aks show ...`',
      'This is important because Terraform state and the real Azure environment can be different for some time after a failed apply.',
      '**4. Run terraform plan**',
      'After understanding the failure, I run: `terraform plan`',
      'This is one of the most important steps.',
      'Terraform compares: (see code below)',
      'For example, suppose Terraform created: (see code below)',
      'After fixing the AKS issue: `terraform plan` may show that only AKS needs to be created.',
      'Then: `terraform apply`',
      'Terraform does not recreate resources that are already correct in state.',
      "**5. If the resource exists but isn't in state**",
      'This is an important scenario.',
      'Suppose Azure has the resource: (see code below)',
      "I don't blindly create it again.",
      'I import it: `terraform import azurerm_storage_account.example <resource-id>`',
      'Then: `terraform plan`',
      'I make sure the Terraform configuration matches the existing resource.',
      '**6. If Terraform state is locked**',
      'If the pipeline crashed while Terraform was running, the remote state may still be locked.',
      'First I check that no Terraform operation is actually running.',
      'Then, if the lock is really stale: `terraform force-unlock <LOCK_ID>`',
      'I use `force-unlock` carefully. Running it while another Terraform operation is active can corrupt the state.',
      "**7. Don't manually delete everything**",
      'A common bad approach is: (see code below)',
      "I don't do that unless there is a specific reason.",
      'Terraform is made to recover from partial applies. I find the failed resource, fix the problem, run plan, and then continue with apply.',
      '**Example interview scenario**',
      'Suppose my Terraform creates: (see code below)',
      'AKS fails because of an invalid SKU.',
      'I would run: `terraform state list` to verify the resources that were created successfully.',
      'Then check the AKS error in the pipeline.',
      'Fix the SKU in the Terraform code.',
      'Run: `terraform plan`',
      'I expect Terraform to show only the remaining AKS changes, not recreate the already-created resources.',
      'Then: `terraform apply`',
      'Finally verify: `terraform plan`',
      'The expected result is: `No changes. Your infrastructure matches the configuration.`',
      '**Interview answer** - "If Terraform fails midway, I first check the exact error in the Terraform or Azure DevOps logs. Then I check `terraform state list` and `terraform state show` to understand which resources were successfully recorded. I also verify the actual Azure resources because I need to know whether the resource was created even if the Terraform operation failed. After fixing the root cause, I run `terraform plan` to see the remaining changes and then run `terraform apply` again. If a resource exists in Azure but isn\'t in state, I import it rather than recreating it. If there is a stale state lock, I verify no Terraform process is running and then use `terraform force-unlock` carefully. I avoid manually deleting infrastructure unless there is a specific reason."',
    ],
    code: [
      {
        title: 'My troubleshooting flow',
        language: 'text',
        code: `terraform apply
      |
      X Failure
      |
      +--> Check pipeline / Terraform error
      |
      +--> Check Terraform state
      |
      +--> Check Azure resource
      |
      +--> Check dependency / permissions / configuration
      |
      +--> terraform plan
      |
      +--> Fix issue
      |
      +--> terraform apply`,
      },
      {
        title: 'Check the exact Terraform error - commands',
        language: 'bash',
        code: `terraform apply

TF_LOG=INFO terraform apply

TF_LOG=DEBUG terraform apply`,
      },
      {
        title: 'Check Terraform state - commands',
        language: 'bash',
        code: `terraform state list

terraform state show azurerm_linux_virtual_machine.vm`,
      },
      {
        title: 'Check Terraform state - For example',
        language: 'text',
        code: `Terraform state:
VM exists

Azure:
VM exists`,
      },
      {
        title: 'Check Azure directly - commands',
        language: 'bash',
        code: `az resource show \\
  --ids <resource-id>

az vm show ...
az network vnet show ...
az aks show ...`,
      },
      {
        title: 'Run terraform plan - commands',
        language: 'bash',
        code: `terraform plan

terraform plan

terraform apply`,
      },
      {
        title: 'Terraform compares',
        language: 'text',
        code: `Configuration
      +
State
      +
Actual infrastructure
      |
      v
Desired changes`,
      },
      {
        title: 'For example, suppose Terraform created',
        language: 'text',
        code: `VNet        ✓
Subnet      ✓
NSG         ✓
AKS         ✗`,
      },
      {
        title: 'Suppose Azure has the resource',
        language: 'text',
        code: `Azure:
Storage Account ✓

Terraform state:
Storage Account ✗`,
      },
      {
        title: "If the resource exists but isn't in state - commands",
        language: 'bash',
        code: `terraform import azurerm_storage_account.example <resource-id>

terraform plan`,
      },
      {
        title: 'If Terraform state is locked - commands',
        language: 'bash',
        code: `terraform force-unlock <LOCK_ID>`,
      },
      {
        title: 'A common bad approach is',
        language: 'text',
        code: `Deployment failed
      ↓
Delete all Azure resources
      ↓
Run terraform apply again`,
      },
      {
        title: 'Suppose my Terraform creates',
        language: 'text',
        code: `Resource Group       ✓
VNet                 ✓
Subnet               ✓
AKS                  ✗`,
      },
      {
        title: 'Example interview scenario - commands',
        language: 'bash',
        code: `terraform state list

terraform plan

terraform apply

terraform plan`,
      },
      {
        title: 'Example interview scenario - snippet',
        language: 'text',
        code: `No changes. Your infrastructure matches the configuration.`,
      },
    ],
    followUps: [
      'The agent was killed mid-apply and the state was never written back. How do you reconcile what exists in Azure with the state?',
      'When would you use `terraform state rm` or `terraform apply -replace` instead of `terraform import`?',
    ],
    tags: ['terraform', 'state', 'troubleshooting'],
  },
  {
    id: 'itv-rdel-9',
    level: 'intermediate',
    kind: 'open',
    prompt: 'How do you resolve merge conflicts?',
    probing:
      'Whether you resolve conflicts by understanding both changes and testing, and know the merge and rebase variants of the flow.',
    answer: [
      '**Quick answer: my branch has merge conflicts with main**',
      '**Correct answer:** Pull the latest main branch, manually resolve conflicts, commit, and push the changes **Steps**:',
      '1. Pull / update the latest main branch\n2. Resolve the conflicting sections manually\n3. Commit the resolved changes\n4. Push the updated branch\n5. Re-run the merge / PR validation',
      '**Detailed process** - I resolve Git merge conflicts by finding the conflicting files, understanding both changes, resolving them manually, testing, and then completing the merge.',
      "**Typical process** - Suppose I'm merging `feature` into `main`: `git checkout main`, `git pull origin main`, `git merge feature`",
      'If there is a conflict: `CONFLICT (content): Merge conflict in deployment.yaml`, `Automatic merge failed`',
      '**1. Identify conflicted files** - `git status`',
      'Example: `both modified: deployment.yaml`, `both modified: values.yaml`',
      '**2. Open the conflicted file**',
      'Git adds markers: (see code below)',
      'I don\'t blindly choose "ours" or "theirs". I understand why both changes were made and decide what the final configuration should be.',
      'Then remove the conflict markers: `<<<<<<<`, `=======`, `>>>>>>>`',
      '**3. Check for remaining conflicts** - `git status`',
      'I can also search: `git diff --check`',
      '**4. Stage the resolved files**',
      '`git add deployment.yaml`, `git add values.yaml`',
      'Then verify: `git status`',
      '**5. Complete the merge** - `git commit`',
      'Git creates the merge commit.',
      'Then: `git push origin main`',
      '**If the conflict happens during rebase**',
      'The process is slightly different: `git rebase main`',
      'If there is a conflict: `git status`',
      'Resolve the file, then: `git add deployment.yaml`, `git rebase --continue`',
      'If more conflicts come, repeat the same process.',
      'If I need to stop the rebase: `git rebase --abort`',
      'For a merge: `git merge --abort`',
      '**Important interview scenario** - If a developer says:',
      '"I have a PR with conflicts. What will you do?" I would say:',
      '"I first pull the latest target branch and reproduce the conflict locally. I identify the conflicting files using `git status`, inspect both changes, and resolve the conflict based on the intended application behavior rather than blindly choosing ours or theirs. Then I run `git diff --check`, unit tests and any relevant build or validation, stage the resolved files and complete the merge or rebase. Finally, I push the updated branch and verify the PR pipeline again."',
      '**Useful commands to remember** (see code below)',
      '**Key point:** A merge conflict is not just a Git problem. The correct resolution depends on the intended behaviour of the code or configuration. Always test after resolving it.',
    ],
    code: [
      {
        title: 'Typical process - commands',
        language: 'bash',
        code: `git checkout main
git pull origin main

git merge feature`,
      },
      {
        title: 'Typical process - snippet',
        language: 'text',
        code: `CONFLICT (content): Merge conflict in deployment.yaml
Automatic merge failed`,
      },
      {
        title: 'Identify conflicted files - snippet',
        language: 'text',
        code: `both modified: deployment.yaml
both modified: values.yaml`,
      },
      {
        title: 'Git adds markers',
        language: 'yaml',
        code: `<<<<<<< HEAD
replicas: 3
image: myapp:v1
=======
replicas: 5
image: myapp:v2
>>>>>>> feature`,
      },
      {
        title: 'Open the conflicted file - Here',
        language: 'text',
        code: `HEAD    = current branch
feature = incoming branch`,
      },
      {
        title: 'Open the conflicted file - For example',
        language: 'yaml',
        code: `replicas: 5
image: myapp:v2`,
      },
      {
        title: 'Open the conflicted file - snippet',
        language: 'text',
        code: `<<<<<<<
=======
>>>>>>>`,
      },
      {
        title: 'Check for remaining conflicts - commands',
        language: 'bash',
        code: `git status

git diff --check`,
      },
      {
        title: 'Stage the resolved files - commands',
        language: 'bash',
        code: `git add deployment.yaml
git add values.yaml

git status`,
      },
      {
        title: 'Complete the merge - commands',
        language: 'bash',
        code: `git commit

git push origin main`,
      },
      {
        title: 'If the conflict happens during rebase - commands',
        language: 'bash',
        code: `git rebase main

git status

git add deployment.yaml
git rebase --continue

git rebase --abort

git merge --abort`,
      },
      {
        title: 'Useful commands to remember',
        language: 'bash',
        code: `git status
git diff
git diff --check

git merge <branch>
git merge --abort

git rebase <branch>
git rebase --continue
git rebase --abort

git add <file>
git commit
git push`,
      },
    ],
    tags: ['git', 'merge conflicts'],
  },
  {
    id: 'itv-rdel-13',
    level: 'advanced',
    kind: 'open',
    prompt:
      "You have one Terraform state file for the entire company's infrastructure — how can multiple people use it at the same time?",
    probing:
      'Whether you understand remote state and locking, and whether you push back on one giant state file because of blast radius.',
    answer: [
      'If you have one Terraform state file for the entire company infrastructure, you should not store it locally or let everyone directly edit it. You put it in a remote backend with state locking.',
      'For Azure, a common setup is Azure Storage Account + Blob Storage.',
      '**Architecture** (see code below)',
      '**Backend configuration** (see code below)',
      'Then everyone runs: `terraform init`',
      'Terraform knows that the state is stored remotely.',
      '**What happens if two people run Terraform at the same time?**',
      'Suppose Developer A runs: `terraform apply`',
      'Terraform acquires the state lock.',
      'If Developer B tries to run `terraform apply` while A has the lock: (see code below)',
      'Terraform prevents both users from modifying the same state simultaneously.',
      '**Important distinction**',
      'Multiple people can access the remote state, but they should not modify the same state simultaneously.',
      'For example: `terraform plan` can generally be run by multiple people, but: `terraform apply` should be controlled/serialized.',
      '**In a real company**',
      "I would not actually recommend one state file for the entire company. That's a bad design because the blast radius becomes huge.",
      'Instead, split state by logical scope/environment: (see code below)',
      'Or use separate Terraform root modules and state per environment. This gives you:',
      '- Smaller blast radius\n- Less state contention\n- Better access control\n- Faster plans\n- Easier troubleshooting\n- Safer production changes',
      '**Interview answer** - "I would store the Terraform state remotely in an Azure Storage Account using the `azurerm` backend. Azure Blob Storage provides centralized state storage, and Terraform uses state locking to prevent concurrent state modifications. If one engineer is running `terraform apply`, Terraform acquires the lock and another engineer cannot modify that same state until the lock is released. However, I wouldn\'t recommend having one state file for the entire company. I would split the infrastructure into multiple state files based on environment and logical components, such as networking, AKS and databases, to reduce contention and blast radius."',
    ],
    code: [
      {
        title: 'Architecture',
        language: 'text',
        code: `Developer A --.
Developer B --|
Developer C --+--> Azure Storage Account
DevOps CI/CD -|         |
Developer D --'         +-- terraform.tfstate
                             + State Lock`,
      },
      {
        title: 'Backend configuration',
        language: 'hcl',
        code: `terraform {
  backend "azurerm" {
    resource_group_name  = "terraform-rg"
    storage_account_name = "tfstatecompany"
    container_name       = "tfstate"
    key                  = "company-infra.tfstate"
  }
}`,
      },
      {
        title: 'Backend configuration - commands',
        language: 'bash',
        code: `terraform init`,
      },
      {
        title: 'What happens if two people run Terraform at the same time? - commands',
        language: 'bash',
        code: `terraform apply`,
      },
      {
        title: 'What happens if two people run Terraform at the same time?',
        language: 'text',
        code: `Developer A
    |
    | terraform apply
    v
State Lock = ACQUIRED
    |
    v
Modify state
    |
    v
Release Lock`,
      },
      {
        title: 'If Developer B tries to run terraform apply while A has the lock',
        language: 'text',
        code: `Developer B
    |
    | terraform apply
    v
State Lock = BUSY
    |
    X
Wait / fail`,
      },
      {
        title: 'Important distinction - commands',
        language: 'bash',
        code: `terraform plan

terraform apply`,
      },
      {
        title: 'Instead, split state by logical scope/environment',
        language: 'text',
        code: `tfstate/
├── networking-prod.tfstate
├── networking-dev.tfstate
├── aks-prod.tfstate
├── aks-dev.tfstate
├── database-prod.tfstate
└── application-prod.tfstate`,
      },
    ],
    followUps: [
      'How does the azurerm backend implement the state lock under the hood?',
      'How would you split an existing monolithic state into smaller states without recreating resources?',
    ],
    tags: ['terraform', 'state', 'locking'],
  },
  {
    id: 'itv-rdel-20',
    level: 'advanced',
    kind: 'scenario',
    prompt:
      'Users suddenly get 502/504 errors even though all Pods show `1/1 Running`. How do you troubleshoot?',
    probing:
      'Whether you walk the request path outside-in and know that Running and Ready pods can still sit behind a Service with no endpoints.',
    answer: [
      'This is a classic Kubernetes troubleshooting scenario. The important point is:',
      'Pods being `Running` and `1/1 Ready` does not mean the application is actually reachable end-to-end.',
      '**Traffic flow** (see code below)',
      'If users suddenly get 502/504, I troubleshoot from the outside toward the backend, rather than assuming the Pods are the problem.',
      '**What 502/504 usually means**',
      '**502 Bad Gateway** - Usually means a proxy/gateway received an invalid response or could not properly communicate with its backend.',
      '**504 Gateway Timeout**',
      "Usually means the gateway/proxy waited for the backend but didn't receive a response within the timeout.",
      'So the problem could be anywhere between: (see code below)',
      '**Step 1: Check Application Gateway**',
      'First check Azure Application Gateway health/backend pool. Look for:',
      '- Backend marked unhealthy\n- Health probe failures\n- Incorrect backend port\n- HTTP/HTTPS mismatch\n- TLS/certificate issues\n- NSG/firewall problems\n- Application Gateway timeout',
      'If Application Gateway considers the AKS ingress backend unhealthy, users can get 502/504 even though Pods are perfectly healthy.',
      '**Step 2: Check Ingress**',
      '`kubectl get ingress -A`, `kubectl describe ingress payment-ingress` - Check:',
      '- Backend service name\n- Backend service port\n- Host/path rules\n- TLS configuration\n- Ingress controller events',
      'Then check the ingress controller: `kubectl get pods -n ingress-nginx`, `kubectl logs -n ingress-nginx <ingress-pod>` - Look for:',
      '- `upstream timed out`\n- `connection refused`\n- `no live upstreams`\n- `502`\n- `504`',
      'These messages are very useful.',
      '**Step 3: Check the Service**',
      '`kubectl get svc`, `kubectl describe svc payment-api`',
      'Then check endpoints: `kubectl get endpoints payment-api` or: `kubectl get endpointslices` - This is critical.',
      'You could have: (see code below)',
      'In that situation, the Pods are running but the Service has nothing to send traffic to.',
      'Check whether Service selectors match Pod labels.',
      'Pods should have: (see code below)',
      '**Step 4: Test the Service directly**',
      "Don't immediately blame the ingress.",
      'Run: `kubectl run test-pod --rm -it --image=curlimages/curl -- sh`',
      'From inside the cluster: `curl http://payment-api:<port>`',
      'If this fails, the problem is probably between Service → Pod → Application.',
      'If this works, move further outward and investigate the Ingress/Application Gateway.',
      '**Step 5: Check the application inside the Pod**',
      'The Pod being `1/1 Running` only tells you that the container is running and the readiness probe is currently passing.',
      'Check application logs: `kubectl logs payment-api-7d8f9c4d-x1a2` - Look for:',
      '- Database connection timeout\n- Connection refused\n- Too many connections\n- Connection pool exhausted\n- Application timeout\n- OutOfMemory',
      '**Step 6: Check PostgreSQL**',
      'Since the architecture includes Azure Database for PostgreSQL, test whether the application can reach it. Check:',
      '- PostgreSQL availability\n- Connection limits\n- CPU/memory\n- Network connectivity\n- Firewall rules\n- Private Endpoint/DNS if applicable\n- Connection pool exhaustion',
      'For example, the application could be running: (see code below)',
      'The application may then take too long to process requests, eventually causing a `504 Gateway Timeout`.',
      '**Most important clue**',
      'If you see: `payment-api-7d8f9c4d-x1a2 1/1 Running` repeated across all Pods, that alone does not prove the application is healthy.',
      'I would check this next: (see code below)',
      '**Interview answer** - "I wouldn\'t assume the Pods are the issue just because they are Running and Ready. I would troubleshoot the request path from Application Gateway to Ingress, Service, Pods and finally PostgreSQL. First I would check Application Gateway backend health and probe failures. Then I would check Ingress configuration and controller logs for upstream timeout or connection-refused errors. Next I would verify that the Service has endpoints and that its selector matches the Pod labels. I would test the Service directly from inside the cluster. Finally, I would check application logs and PostgreSQL connectivity, connection limits and timeouts. A 502 generally points to a bad backend response or connectivity issue, while a 504 commonly indicates a backend timeout."',
      'The key troubleshooting command here is `kubectl get endpoints payment-api`. A Pod can be Running while the Service has no usable endpoints.',
    ],
    code: [
      {
        title: 'Traffic flow',
        language: 'text',
        code: `Internet
   |
   v
Azure Application Gateway
   |
   v
AKS Ingress
   |
   v
Kubernetes Service
   |
   v
Pods
   |
   v
Azure Database for PostgreSQL`,
      },
      {
        title: 'So the problem could be anywhere between',
        language: 'text',
        code: `Application Gateway
        |
        v
     Ingress
        |
        v
     Service
        |
        v
       Pod
        |
        v
   Application
        |
        v
    PostgreSQL`,
      },
      {
        title: 'Check Ingress - commands',
        language: 'bash',
        code: `kubectl get ingress -A
kubectl describe ingress payment-ingress

kubectl get pods -n ingress-nginx
kubectl logs -n ingress-nginx <ingress-pod>`,
      },
      {
        title: 'Check the Service - commands',
        language: 'bash',
        code: `kubectl get svc
kubectl describe svc payment-api

kubectl get endpoints payment-api

kubectl get endpointslices`,
      },
      {
        title: 'You could have',
        language: 'text',
        code: `Pods:       1/1 Running
Service:    0 endpoints`,
      },
      {
        title: 'Check the Service - For example',
        language: 'yaml',
        code: `selector:
  app: payment-api`,
      },
      {
        title: 'Pods should have',
        language: 'yaml',
        code: `labels:
  app: payment-api`,
      },
      {
        title: 'Test the Service directly - commands',
        language: 'bash',
        code: `kubectl run test-pod --rm -it \\
  --image=curlimages/curl -- sh

curl http://payment-api:<port>`,
      },
      {
        title: 'Check the application inside the Pod - commands',
        language: 'bash',
        code: `kubectl logs payment-api-7d8f9c4d-x1a2`,
      },
      {
        title: 'For example, the application could be running',
        language: 'text',
        code: `Pod: Running
Readiness: Passing
Application: Running
Database connection: Broken`,
      },
      {
        title: 'Most important clue - snippet',
        language: 'text',
        code: `payment-api-7d8f9c4d-x1a2    1/1 Running`,
      },
      {
        title: 'I would check this next',
        language: 'bash',
        code: `kubectl get svc payment-api
kubectl get endpoints payment-api
kubectl describe ingress payment-ingress
kubectl logs -n ingress-nginx <ingress-controller-pod>`,
      },
    ],
    followUps: [
      'In-cluster curl to the Service works. What do you check next on the Application Gateway side?',
      'How can a readiness probe that ignores the database dependency hide this kind of outage?',
    ],
    tags: ['kubernetes', 'ingress', 'application gateway', 'troubleshooting'],
  },
  {
    id: 'itv-rdel-23',
    level: 'intermediate',
    kind: 'scenario',
    prompt:
      'A Pod is stuck in `CrashLoopBackOff` after a new deployment — how do you troubleshoot and fix it?',
    promptCode: [
      {
        title: 'Scenario',
        language: 'text',
        code: `Scenario: A web application named \`employee-portal\` is deployed in the Kubernetes namespace \`test\`. It runs as a single Pod (\`Deployment\` name \`employee-portal\`, container port \`8080\`, expected replicas \`1\`).

After a new deployment, the application is not accessible. Running:

kubectl get pods -n test

shows:

NAME                                 READY   STATUS             RESTARTS   AGE
employee-portal-6d8f7c9b5-x4k2m      0/1     CrashLoopBackOff   4          5m

As a DevOps engineer, explain:

1. The commands you would use to check the Pod details and logs.
2. The information you would look for in the logs and Pod events.
3. The action you would take after identifying the problem.
4. How you would verify that the Pod and application are working after the fix.`,
      },
    ],
    probing:
      'Whether you go straight to describe, logs --previous and the termination reason, and verify the fix end to end.',
    answer: [
      'For a `CrashLoopBackOff`, I would troubleshoot from Pod status → logs → events → root cause → fix → verification.',
      '**1. Check Pod details and logs**',
      'First, confirm the Pod status and identify why the container is restarting: (see code below)',
      '`--previous` is important for `CrashLoopBackOff` because it shows logs from the previous crashed container.',
      '**2. Check logs and Pod events**',
      'In the logs, I would look for:',
      '- Application startup errors\n- Configuration or environment-variable issues\n- Missing secrets/configuration\n- Database connection failures\n- Port/configuration errors\n- Permission errors\n- Application exceptions\n- Out-of-memory errors',
      'From `describe`, I would check the Events section for:',
      '- `Failed`\n- `BackOff`\n- `OOMKilled`\n- `FailedMount`\n- `Unhealthy`\n- Liveness probe failed\n- Readiness probe failed',
      "I would also check the container's exit code and termination reason.",
      '**3. Fix the identified problem**',
      'The fix depends on the root cause. For example:',
      '- Wrong environment variable → Correct the Deployment/ConfigMap/Secret.\n- Missing Secret → Create/fix the Secret reference.\n- Application startup failure → Fix the application configuration/code and build a new image.\n- OOMKilled → Review memory usage and adjust requests/limits if appropriate.\n- Liveness probe failure → Correct the probe configuration or application health endpoint.\n- Wrong image → Update the image to the correct version.',
      'Then redeploy: `kubectl apply -f deployment.yaml -n test`',
      'Or, if only the image needs updating: `kubectl set image deployment/employee-portal employee-portal=<new-image>:<tag> -n test`',
      '**4. Verify the fix**',
      'Watch the rollout: `kubectl rollout status deployment/employee-portal -n test`',
      'Check the Pod: `kubectl get pods -n test`',
      'Check logs again: `kubectl logs deployment/employee-portal -n test`',
      'Then verify the Service and endpoints: `kubectl get svc -n test`, `kubectl get endpoints -n test`',
      'If the application is exposed through an Ingress, also check: `kubectl get ingress -n test`',
      '**Interview answer** - "I would first run `kubectl describe pod` and `kubectl logs --previous` because the Pod is in CrashLoopBackOff. I would check the container exit reason, application errors, configuration, secrets, probes, resource limits, and Pod events. Once I identify the root cause, I would fix the Deployment, ConfigMap, Secret, image, probe, or application as appropriate. Then I would monitor `kubectl rollout status`, confirm the Pod is 1/1 Running, check the logs, and finally verify the Service/Ingress and application connectivity."',
    ],
    code: [
      {
        title: 'Check Pod details and logs',
        language: 'bash',
        code: `kubectl get pods -n test

kubectl describe pod employee-portal-6d8f7c9b5-x4k2m -n test

kubectl logs employee-portal-6d8f7c9b5-x4k2m -n test

kubectl logs employee-portal-6d8f7c9b5-x4k2m -n test --previous`,
      },
      {
        title: 'Check logs and Pod events',
        language: 'bash',
        code: `kubectl get pod employee-portal-6d8f7c9b5-x4k2m -n test \\
  -o jsonpath='{.status.containerStatuses[*].state.terminated}'`,
      },
      {
        title: 'Fix the identified problem - commands',
        language: 'bash',
        code: `kubectl apply -f deployment.yaml -n test

kubectl set image deployment/employee-portal \\
  employee-portal=<new-image>:<tag> -n test`,
      },
      {
        title: 'Verify the fix - commands',
        language: 'bash',
        code: `kubectl rollout status deployment/employee-portal -n test

kubectl get pods -n test

kubectl logs deployment/employee-portal -n test

kubectl get svc -n test
kubectl get endpoints -n test

kubectl get ingress -n test`,
      },
      {
        title: 'Verify the fix - Expected',
        language: 'text',
        code: `READY   STATUS
1/1     Running`,
      },
    ],
    tags: ['kubernetes', 'crashloopbackoff', 'troubleshooting'],
  },
  {
    id: 'itv-rdel-25',
    level: 'basic',
    kind: 'open',
    prompt: 'What is NGINX, and what is it used for?',
    probing:
      'Whether you can explain web server, reverse proxy, load balancing and TLS termination, and where Nginx sits in Kubernetes.',
    answer: [
      'Nginx is a high-performance web server and reverse proxy. In DevOps, it is commonly used to receive client requests and forward them to backend applications.',
      '**Simple example** (see code below)',
      'The user sends a request to your application. Nginx receives it and decides where to send that request.',
      '**What is Nginx used for?**',
      '**1. Web server** - It can serve static files such as:',
      '- HTML\n- CSS\n- JavaScript\n- Images',
      'For example, a React production build can be served by Nginx.',
      '**2. Reverse proxy** - Nginx can forward requests to backend applications: (see code below)',
      'For example: `/api/users -> Spring Boot`, `/api/orders -> Spring Boot`',
      '**3. Load balancing**',
      'Nginx can distribute requests across multiple backend servers: (see code below)',
      'This improves availability and distributes traffic.',
      '**4. SSL/TLS termination**',
      'Nginx can handle HTTPS: (see code below)',
      'The client communicates securely with Nginx, while Nginx forwards the request to the backend.',
      '**5. Routing** - Nginx can route requests based on URL, hostname, etc.',
      '**Nginx in Kubernetes**',
      'In Kubernetes, you commonly see Nginx as an Ingress Controller: (see code below)',
      'The Ingress Controller reads Kubernetes Ingress rules and routes traffic to the appropriate Services.',
      '**Interview answer** - "Nginx is a lightweight, high-performance web server and reverse proxy. In DevOps, I mainly use it for serving static content, reverse proxying requests to backend applications, load balancing, SSL termination, and HTTP routing. In Kubernetes, Nginx can also be used as an Ingress Controller to route external traffic to different Kubernetes Services."',
    ],
    code: [
      {
        title: 'Simple example',
        language: 'text',
        code: `User
  |
  v
Nginx
  |
  +------> React frontend
  |
  +------> Spring Boot backend`,
      },
      {
        title: 'Nginx can forward requests to backend applications',
        language: 'text',
        code: `Client
  |
  v
Nginx :80
  |
  v
Spring Boot :8080`,
      },
      {
        title: 'Reverse proxy - snippet',
        language: 'text',
        code: `/api/users  -> Spring Boot
/api/orders -> Spring Boot`,
      },
      {
        title: 'Nginx can distribute requests across multiple backend servers',
        language: 'text',
        code: `             Nginx
            /  |  \\
           /   |   \\
       Pod-1 Pod-2 Pod-3`,
      },
      {
        title: 'Nginx can handle HTTPS',
        language: 'text',
        code: `Client
  |
 HTTPS
  |
  v
Nginx
  |
 HTTP
  |
  v
Application`,
      },
      {
        title: 'Routing - Example',
        language: 'text',
        code: `example.com/api -> Spring Boot
example.com/     -> React`,
      },
      {
        title: 'In Kubernetes, you commonly see Nginx as an Ingress Controller',
        language: 'text',
        code: `Internet
   |
   v
Azure Application Gateway
   |
   v
Nginx Ingress Controller
   |
   +------> payment-service
   |
   +------> order-service
   |
   +------> user-service`,
      },
    ],
    tags: ['nginx', 'reverse proxy', 'ingress'],
  },
  {
    id: 'itv-rdel-30',
    level: 'basic',
    kind: 'open',
    prompt: 'What `kubectl` commands do you use to check Ingress?',
    probing:
      'Whether you know the kubectl commands to inspect Ingress, its class, its controller and the backend endpoints.',
    answer: [
      '**What I check in the output**',
      '- **`kubectl describe ingress`** — backend service name/port, host and path rules, TLS secret, and an Events section for routing failures.\n- **`kubectl get ingressclass`** — confirms the Ingress is actually being picked up by a controller (a missing/wrong `ingressClassName` means no controller processes it at all).\n- **Ingress controller logs** — for messages like `upstream timed out`, `connection refused`, or `no live upstreams`, which point to a backend Service/Pod problem rather than the Ingress config itself.',
      '**Interview answer** - "To check Ingress, I start with `kubectl get ingress -A` to see what\'s configured, then `kubectl describe ingress <name> -n <namespace>` to check the backend service, path rules, TLS configuration, and any events. I confirm the Ingress class is correctly picked up with `kubectl get ingressclass`, and if traffic still isn\'t routing, I check the Ingress controller Pods and logs directly with `kubectl get pods -n ingress-nginx` and `kubectl logs`. I also verify the backend Service has actual endpoints with `kubectl get endpoints`, since an Ingress pointing at a Service with zero endpoints will fail even if the Ingress config itself is correct."',
    ],
    code: [
      {
        title: 'Ingress checks',
        language: 'bash',
        code: `# List all Ingress resources across all namespaces
kubectl get ingress -A

# List Ingress resources in a specific namespace
kubectl get ingress -n production

# Detailed view — backend, rules, TLS, and recent events
kubectl describe ingress payment-ingress -n production

# Check which Ingress class is configured
kubectl get ingressclass

# Check the Ingress controller Pods themselves
kubectl get pods -n ingress-nginx

# Check the Ingress controller logs for upstream/routing errors
kubectl logs -n ingress-nginx <ingress-controller-pod>

# Check events related to Ingress (useful for TLS/cert issues too)
kubectl get events -n production --sort-by=.lastTimestamp

# Confirm the backend Service the Ingress points to actually has endpoints
kubectl get endpoints payment-api -n production`,
      },
    ],
    tags: ['kubernetes', 'ingress', 'kubectl'],
  },
  {
    id: 'itv-rdel-32',
    level: 'basic',
    kind: 'open',
    prompt: 'Kubernetes YAML challenge: find and fix what is broken in this Deployment',
    promptCode: [
      {
        title: 'Given (broken YAML)',
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
      'Whether you read Kubernetes YAML structurally - indentation, selector matching the template labels, and required container fields.',
    answer: [
      'The YAML is broken mainly because the indentation is incorrect. Kubernetes YAML is indentation-sensitive.',
      '**Fixed YAML** (see code below)',
      '**1. `metadata.name` indentation** (see code below)',
      '`name` belongs under `metadata`.',
      '**2. `template.metadata` indentation** (see code below)',
      'Each child level needs proper indentation.',
      '**3. Missing `selector`**',
      'For a Deployment, you should define: (see code below)',
      'The selector must match the pod template labels: (see code below)',
      'So Kubernetes knows which Pods belong to this Deployment.',
      '**4. Container needs a name** (see code below)',
      'A container in a Pod specification requires a container name.',
      '**Easy way to remember the hierarchy** (see code below)',
      '**Interview answer** - "For an interview, the three things I\'d immediately look for are: YAML indentation, the Deployment selector matching the Pod labels, and the container name and image being present."',
    ],
    code: [
      {
        title: 'Fixed YAML',
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
          image: nginx`,
      },
      {
        title: 'metadata.name indentation - Broken',
        language: 'yaml',
        code: `metadata:
name: app`,
      },
      {
        title: 'metadata.name indentation - Correct',
        language: 'yaml',
        code: `metadata:
  name: app`,
      },
      {
        title: 'template.metadata indentation - Broken',
        language: 'yaml',
        code: `template:
metadata:
labels:
app: app`,
      },
      {
        title: 'template.metadata indentation - Correct',
        language: 'yaml',
        code: `template:
  metadata:
    labels:
      app: app`,
      },
      {
        title: 'For a Deployment, you should define',
        language: 'yaml',
        code: `selector:
  matchLabels:
    app: app`,
      },
      {
        title: 'The selector must match the pod template labels',
        language: 'yaml',
        code: `labels:
  app: app`,
      },
      {
        title: 'Container needs a name - Broken',
        language: 'yaml',
        code: `containers:
- image: nginx`,
      },
      {
        title: 'Container needs a name - Better',
        language: 'yaml',
        code: `containers:
  - name: app
    image: nginx`,
      },
      {
        title: 'Easy way to remember the hierarchy',
        language: 'text',
        code: `Deployment
 ├── metadata
 │    └── name
 │
 └── spec
      ├── replicas
      ├── selector
      │    └── matchLabels
      │
      └── template
           ├── metadata
           │    └── labels
           │
           └── spec
                └── containers
                     ├── name
                     └── image`,
      },
    ],
    tags: ['kubernetes', 'yaml', 'deployment'],
  },
]
