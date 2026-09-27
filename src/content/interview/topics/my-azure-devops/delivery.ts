import type { InterviewQuestion } from '../../../types'

/** Azure DevOps delivery notes and scenario questions: end-to-end flows, security stages, Key Vault, Terraform, troubleshooting. */
export const myAzureDevopsDeliveryQuestions: InterviewQuestion[] = [
  {
    id: 'itv-myado-19',
    level: 'intermediate',
    kind: 'open',
    prompt: 'Walk me through an end-to-end CI/CD pipeline in Azure DevOps.',
    probing:
      'Whether you can walk through a complete governed Azure DevOps pipeline from PR to verified production.',
    answer: [
      "1. A developer works through a feature branch and a pull request in Azure Repos or another Git provider. Branch policies require review, build validation, and the right checks.\n2. Azure Pipelines restores dependencies, compiles the code, runs unit and integration tests, and runs static, dependency, secret, infrastructure-as-code, and container security checks.\n3. The pipeline produces a versioned package or image that never changes once built, and publishes it to Azure Artifacts or Azure Container Registry with a clear link back to the commit it came from.\n4. Deployment promotes that same artifact through Dev, Test, Staging/UAT, and Production. Configuration for each environment lives outside the artifact — the artifact itself never gets rebuilt.\n5. Protected environments use checks like approval, policy, a change window, an exclusive lock, health evidence, and automated smoke tests. Blue-green, canary, or rolling deployment cuts down production risk where it's supported.\n6. Azure Monitor, Log Analytics, and Application Insights confirm availability, errors, latency, dependency health, infrastructure health, and that real business transactions still work. If verification fails, promotion stops or a known rollback kicks in.",
      'Deployment targets can include App Service, AKS, Functions, VMs, and hybrid infrastructure. Authenticate with workload federation or managed identity wherever you can, give each stage only the access it needs, protect production service connections, and keep pipeline and audit evidence around.',
    ],
    tags: ['ci/cd', 'end-to-end', 'azure pipelines'],
  },
  {
    id: 'itv-myado-20',
    level: 'advanced',
    kind: 'open',
    prompt: 'Explain your end-to-end Terraform, Azure DevOps, Helm and AKS pipeline project.',
    probing:
      'Whether you can explain a real Terraform + Azure Pipelines + Helm + AKS project and the areas you had to debug.',
    answer: [
      '**The project flow, end to end:**',
      '1. **Terraform** provisions the resource group, virtual network, Azure Container Registry, AKS cluster, Key Vault, identities, and the role assignments they need. State is stored in an encrypted, locked remote backend.\n2. **Azure Pipelines** runs Terraform formatting, validation, security checks, plan review, approval, and apply, using a workload-identity service connection.\n3. A **Node.js application** gets installed, linted, unit-tested, and packaged.\n4. The pipeline builds a minimal container image, scans it, and publishes it to ACR with a digest — a fixed reference that always points to that exact image and never changes. It also records where the artifact came from and how it was built.\n5. **Helm** deploys that same image to AKS, with environment-specific values, readiness and liveness probes, resource requests, and `--atomic --wait` so a bad rollout gets rolled back automatically.\n6. **Post-deployment checks** confirm Pods are healthy, LoadBalancer or Ingress routing works, the application is healthy, and logs and monitoring look normal. Production promotion stops or rolls back when any of these health checks fail.',
      "The main areas I had to dig into on this project were Terraform state and lock handling, ACR authentication, the Azure service connection's identity and RBAC, Helm's rendering and release history, Kubernetes Events, and rollout health.",
      'The main design rule underneath all of it: **build the artifact once, and promote that exact same version through every environment**, rather than rebuilding it for each one.',
    ],
    followUps: [
      'Why use --atomic --wait on the Helm upgrade, and what does it not protect you from?',
      'How did you handle Terraform state locking when a pipeline run was cancelled?',
    ],
    tags: ['terraform', 'helm', 'aks', 'project'],
  },
  {
    id: 'itv-myado-21',
    level: 'advanced',
    kind: 'open',
    prompt:
      'How do GitHub Actions and Azure DevOps work together when GitHub runs CI and Azure DevOps owns deployment?',
    probing:
      'Whether you can split CI in GitHub Actions and CD in Azure DevOps without losing traceability or rebuilding.',
    answer: [
      'GitHub Actions and Azure DevOps can work together when GitHub is where the code lives and Azure DevOps owns the controlled deployment. The split in responsibility needs to be explicit:',
      'Azure Pipelines can also connect directly to a GitHub repository and handle both CI and CD itself. Running two separate automation systems only makes sense when it reflects real team ownership or a governance requirement — otherwise it just adds more authentication, traceability, and troubleshooting complexity than you need.',
      'For a split pipeline like this:',
      "- Publish the package to an artifact repository, or the image to Azure Container Registry. Never pass an unverified, mutable `latest` tag between the two systems.\n- Record the commit SHA, the build run, the SBOM (the list of everything that went into the build), the scan result, and a fixed artifact version or digest that won't change later.\n- Only trigger or authorize a deployment once the artifact actually exists — never rebuild it inside Azure DevOps.\n- Use GitHub OIDC with an Azure workload identity, or an Azure DevOps workload-federated service connection, instead of a long-lived cloud credential.\n- Restrict the GitHub connection, service connection, environment, and agent pool to only the pipelines that are authorized to use them.\n- Send deployment status back to the source commit, so reviewers can trace the build and release evidence from there.",
    ],
    code: [
      {
        title: 'Split CI/CD flow',
        language: 'text',
        code: `GitHub pull request
  -> GitHub Actions: build, test and fast security checks
  -> publish a package or image digest that never changes
  -> Azure DevOps: consume that exact version
  -> deployment-environment approvals and checks
  -> deploy to AKS
  -> smoke tests and Azure Monitor verification`,
      },
    ],
    followUps: [
      'When would you not split the two systems at all?',
      'How does GitHub Actions authenticate to Azure without a stored secret?',
    ],
    tags: ['github actions', 'azure devops', 'handoff'],
  },
  {
    id: 'itv-myado-22',
    level: 'intermediate',
    kind: 'open',
    prompt: 'How do you add a container security scanning stage with Trivy in Azure Pipelines?',
    probing:
      'Whether you scan the exact pushed digest with a pinned scanner and make findings actually fail the stage.',
    answer: [
      'Build the image once, push it to ACR, resolve its digest (a fixed reference that always points to that exact image), and scan that digest with an approved, version-pinned Trivy installation or task:',
      '`--exit-code 1` makes findings at the chosen severities fail the job. The severity levels, how unfixed findings are handled, and the exception process should all come from organization policy, not from whatever a pipeline author happens to pick.',
      "Pin and verify the scanner itself. Don't assume `apt install trivy` is safe to run on every hosted image without checking.",
      'Trivy gives you build-time vulnerability evidence. Microsoft Defender for Containers complements that with vulnerability assessment for the registry and running images, security-posture recommendations, and runtime threat detection.',
      'Neither tool replaces image signing, admission controls, minimal images, patching, running as non-root, or an actual incident-response plan.',
    ],
    code: [
      {
        title: 'Trivy scan stage against the image digest',
        language: 'yaml',
        code: `- stage: SecurityScan
  dependsOn: Build
  jobs:
    - job: ScanImage
      steps:
        - script: |
            trivy image \\
              --exit-code 1 \\
              --severity HIGH,CRITICAL \\
              --ignore-unfixed \\
              "$(acrLoginServer)/orders-api@$(imageDigest)"
          displayName: Scan the image with Trivy`,
      },
    ],
    tags: ['trivy', 'container security', 'acr'],
  },
  {
    id: 'itv-myado-23',
    level: 'intermediate',
    kind: 'open',
    prompt: 'How do you integrate Azure Key Vault with Azure Pipelines?',
    probing:
      'Whether you fetch only the secrets you need at runtime through a scoped identity and avoid leaking them.',
    answer: [
      'The pipeline authenticates through a protected service connection backed by workload identity federation, managed identity, or a narrowly scoped service principal. It only gets the Key Vault data-plane role needed to read the specific secrets it uses.',
      "Secrets are fetched at runtime and handed to the task that needs them — they're never committed to Git or printed to logs.",
      'Use separate vaults, or strong authorization boundaries, to keep environments apart. Add private endpoints and firewall rules where required, rotation and expiry alerts, purge protection and recovery controls, and diagnostic logging.',
      'Applications should fetch secrets through managed identity themselves, rather than having secrets baked into artifacts or Kubernetes manifests.',
      'Secret masking is a last safety net, not a real guarantee — avoid echoing values, exposing them on the command line, putting them in output variables, or running untrusted scripts near them.',
      "Fetch only the specific secrets you actually need, rather than using `SecretsFilter: '*'`:",
      '`RunAsPreJob: false` makes the retrieved variables available only to later tasks in the job. Setting it to `true` exposes them to the whole job, so only do that when you actually need to.',
      'The service connection still needs its own explicit Key Vault data-plane authorization, and it still needs to be able to reach the vault over the network.',
    ],
    code: [
      {
        title: 'Secret flow',
        language: 'text',
        code: `reviewed code -> pipeline identity -> Key Vault authorization
              -> runtime secret -> deployment -> smoke test`,
      },
      {
        title: 'AzureKeyVault task with a narrow secrets filter',
        language: 'yaml',
        code: `- task: AzureKeyVault@2
  displayName: Retrieve deployment secrets
  inputs:
    azureSubscription: production-workload-federation
    KeyVaultName: kv-orders-production
    SecretsFilter: database-password,external-api-key
    RunAsPreJob: false`,
      },
    ],
    tags: ['key vault', 'secrets', 'azure pipelines'],
  },
  {
    id: 'itv-myado-24',
    level: 'advanced',
    kind: 'open',
    prompt: 'How do you deliver Terraform changes with Azure DevOps?',
    probing:
      'Whether you run Terraform from reviewed code with a protected identity, saved plans and real environment separation.',
    answer: [
      "A Terraform pipeline should run from reviewed Git code, using a protected Azure Resource Manager service connection — ideally workload identity federation, with a narrowly scoped service principal only when that's really necessary.",
      'A self-hosted agent makes sense when it needs to reach private endpoints or private Azure APIs, but it has to be patched, isolated, and monitored, and it should never run untrusted pull-request code with production credentials attached.',
      'Keep Terraform modules reusable, and keep Dev, QA, and Production separate by state, identity, approval, subscription or resource scope, and policy — not just by swapping variable files. Use an encrypted, versioned remote state backend with locking, and never keep state or service-principal secrets in the repository.',
      'Publish the plan for review, apply that exact reviewed plan, and hold onto the pipeline logs, deployment metadata, and rollback or recovery instructions.',
    ],
    code: [
      {
        title: 'Terraform delivery flow',
        language: 'text',
        code: `pull request -> fmt/validate -> tfsec/Checkov -> plan artifact -> review
protected environment -> approval -> apply saved plan -> smoke test -> audit evidence`,
      },
    ],
    followUps: [
      'Why apply the saved plan rather than running a fresh plan at apply time?',
      'When is a self-hosted agent justified for Terraform, and how do you secure it?',
    ],
    tags: ['terraform', 'azure pipelines', 'iac'],
  },
  {
    id: 'itv-myado-25',
    level: 'intermediate',
    kind: 'scenario',
    prompt: 'How do you troubleshoot Azure DevOps "401 Unauthorized" errors?',
    probing:
      'Whether you debug auth failures from the exact error and identity instead of rotating credentials at random.',
    answer: [
      'Check the service connection, rotate the PAT or service-principal credentials, then validate RBAC.',
      '**Detailed interview approach:**',
      'I start from the exact pipeline error and the context it failed in.',
      "For authentication failures, I check the service connection type, the tenant and subscription, whether the federated credential or secret has expired, the endpoint's scope, and the target's RBAC. For a job stuck queued or an agent failure, I check pool demand and capability matching, whether the agent is online, the parallel-job quota, and the agent's own diagnostics.",
      'I reproduce the problem using the same identity and agent, without ever printing tokens, and compare Azure activity logs against Entra sign-in logs to find the smallest fix.',
      "I prefer workload identity federation or managed identity over long-lived PATs, scope each service connection to only the pipelines that need it, rotate any credential that's been exposed, and after the fix, confirm a real read or deploy actually works and check the audit logs.",
    ],
    tags: ['troubleshooting', 'authentication', 'service connections'],
  },
  {
    id: 'itv-myado-26',
    level: 'intermediate',
    kind: 'scenario',
    prompt: 'How do you troubleshoot Azure DevOps pipeline stuck at "queued"?',
    probing:
      'Whether you know why jobs queue: pool demands, offline agents, parallel-job limits or provisioning failures.',
    answer: [
      'No available agents. Check the agent pool, scale up agents, and verify concurrency limits.',
      '**Detailed interview approach:**',
      'I look at the queue reason, executor usage, node labels, offline status, and the controller and agent logs. A job can sit waiting because no agent matches its labels, every executor is busy, a node has disconnected, a throttle or concurrency rule is in effect, or a cloud agent failed to provision.',
      "I check the agent pool and its agents in Azure DevOps, queue and build metrics, agent pod or VM events, network and credentials, then restore or scale the right agent pool. I don't just add more agents or parallel jobs as a shortcut.",
      'To prevent this going forward: use ephemeral, autoscaled agents, set up capacity and queue-time alerts, use sensible labels and quotas, check agent image health, set timeouts, and keep long or privileged jobs separate from the rest.',
    ],
    tags: ['troubleshooting', 'agents', 'queue'],
  },
  {
    id: 'itv-myado-27',
    level: 'advanced',
    kind: 'open',
    prompt: 'How do you enforce least privilege access in GCP or Azure pipelines?',
    probing:
      'Whether you grant the narrowest role at the smallest scope and replace static keys with workload identity.',
    answer: [
      'Use service accounts with the minimum roles they need, rotate keys regularly, and audit pipeline IAM policies.',
      '**Detailed interview approach:**',
      "I start from the exact principal, resource, action, scope, and denial from the error and the cloud's audit logs. I check the effective IAM or RBAC, including inherited roles, deny policies, conditional bindings, the tenant/project/subscription, and the token's audience and expiry.",
      'I reproduce with a harmless call using the same identity, then grant the narrowest predefined or custom role at the smallest possible scope — never Owner or Admin just to make the pipeline pass. Workload identity or managed identity replaces static service-account keys wherever it can.',
      'If a key has leaked, I disable or revoke it right away, check what it was used for and what it changed, rotate anything related, and rebuild the identity path properly using workload identity. Regular access reviews, expiry dates, policy tests, and audit alerts keep roles from creeping wider over time.',
    ],
    followUps: [
      'How do you prove least privilege is actually working?',
      'What do you do in the first hour after a pipeline key leaks?',
    ],
    tags: ['least privilege', 'iam', 'rbac'],
  },
  {
    id: 'itv-myado-28',
    level: 'intermediate',
    kind: 'scenario',
    prompt: 'How do you troubleshoot Azure DevOps pipeline agent errors?',
    probing:
      'Whether you can diagnose self-hosted agent failures and prevent them with ephemeral, monitored agents.',
    answer: [
      'Check the agent logs, verify network connectivity, restart the agent service, and re-register the agent if needed.',
      '**Detailed interview approach:**',
      'I look at the queue reason, executor usage, node labels, offline status, and the controller and agent logs. A job can sit waiting because no agent matches its labels, every executor is busy, a node has disconnected, a throttle or concurrency rule is in effect, or a cloud agent failed to provision.',
      "I check the agent pool and its agents in Azure DevOps, queue and build metrics, agent pod or VM events, network and credentials, then restore or scale the right agent pool. I don't just add more agents or parallel jobs as a shortcut.",
      'To prevent this going forward: use ephemeral, autoscaled agents, set up capacity and queue-time alerts, use sensible labels and quotas, check agent image health, set timeouts, and keep long or privileged jobs separate from the rest.',
    ],
    tags: ['troubleshooting', 'agents'],
  },
  {
    id: 'itv-myado-29',
    level: 'advanced',
    kind: 'open',
    prompt: 'How do you implement canary release in Azure DevOps?',
    probing:
      'Whether you can run a metric-gated canary with automated rollback and handle database changes safely.',
    answer: [
      "Use Azure Traffic Manager or Application Gateway, route a small percentage of traffic to the new version, and increase it gradually if it's stable.",
      '**Detailed interview approach:**',
      'I deploy one artifact that never changes once built, using a rollout strategy matched to the risk: rolling for routine stateless changes, canary when I want to watch metrics before going further, or blue-green when I need a fast traffic switch.',
      "The pipeline runs prechecks, deploys to a small or no-traffic target, runs readiness and business smoke tests, then gradually sends more traffic while watching error rate, latency, how close resources are to their limits, and the service's error budget.",
      "If any threshold fails, it stops sending traffic and rolls back to the previous version. Database changes use expand-and-contract instead, since rolling back the application can't undo a destructive schema change. After recovery, I confirm things actually work again, record what happened, and improve whatever test or guard should have caught the problem sooner.",
    ],
    followUps: [
      'Which metrics would you gate a canary on, and for how long?',
      'Why does expand-and-contract matter for rollback?',
    ],
    tags: ['canary', 'deployment strategies'],
  },
  {
    id: 'itv-myado-30',
    level: 'advanced',
    kind: 'open',
    prompt: 'How do you implement blue-green deployment in Azure DevOps?',
    probing:
      'Whether you know slot-based blue-green on App Service and what makes a fast traffic switch safe.',
    answer: [
      'Use App Service deployment slots, route traffic between them, and roll back to the old slot if the new one fails.',
      '**Detailed interview approach:**',
      'I deploy one artifact that never changes once built, using a rollout strategy matched to the risk: rolling for routine stateless changes, canary when I want to watch metrics before going further, or blue-green when I need a fast traffic switch.',
      "The pipeline runs prechecks, deploys to a small or no-traffic target, runs readiness and business smoke tests, then gradually sends more traffic while watching error rate, latency, how close resources are to their limits, and the service's error budget.",
      "If any threshold fails, it stops sending traffic and rolls back to the previous version. Database changes use expand-and-contract instead, since rolling back the application can't undo a destructive schema change. After recovery, I confirm things actually work again, record what happened, and improve whatever test or guard should have caught the problem sooner.",
    ],
    followUps: [
      'What settings should stay sticky to a slot during a swap?',
      'How do you roll back after a swap?',
    ],
    tags: ['blue-green', 'app service', 'slots'],
  },
  {
    id: 'itv-myado-31',
    level: 'intermediate',
    kind: 'scenario',
    prompt: 'How do you troubleshoot a failed GCP Cloud Build or Azure DevOps pipeline?',
    probing:
      'Whether you have a repeatable approach to a failed cloud pipeline: logs, identity, definition and a safe retry.',
    answer: [
      "Check the build logs, validate the service account's permissions, verify the YAML pipeline definition, and retry with verbose logging.",
      '**Detailed interview approach:**',
      'I start from the exact pipeline error and the context it failed in.',
      "For authentication failures, I check the service connection type, the tenant and subscription, whether the federated credential or secret has expired, the endpoint's scope, and the target's RBAC. For a job stuck queued or an agent failure, I check pool demand and capability matching, whether the agent is online, the parallel-job quota, and the agent's own diagnostics.",
      'I reproduce the problem using the same identity and agent, without ever printing tokens, and compare Azure activity logs against Entra sign-in logs to find the smallest fix.',
      "I prefer workload identity federation or managed identity over long-lived PATs, scope each service connection to only the pipelines that need it, rotate any credential that's been exposed, and after the fix, confirm a real read or deploy actually works and check the audit logs.",
    ],
    tags: ['troubleshooting', 'pipelines', 'cloud build'],
  },
]
