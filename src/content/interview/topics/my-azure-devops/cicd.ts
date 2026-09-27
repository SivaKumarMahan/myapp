import type { InterviewQuestion } from '../../../types'

/** General CI/CD design, security, rollback and delivery questions. */
export const myCicdQuestions: InterviewQuestion[] = [
  {
    id: 'itv-myado-32',
    level: 'advanced',
    kind: 'open',
    prompt: 'Explain your CI/CD pipeline design. Why did you choose those tools?',
    probing:
      'Whether you can explain a full value stream and justify tool choices by constraints, not popularity.',
    answer: [
      'I walk through the whole value stream, end to end:',
      'Source code and pipeline definitions both live in Git. CI produces one signed, versioned artifact and stores it in a registry. "Immutable" here means that artifact never changes once it\'s built — every environment gets the exact same bits.',
      'CD promotes that same artifact through each environment. It never rebuilds per environment. Secrets come from workload identity or a secret manager, not from config files.',
      'Production runs behind protected environments with a deployment identity that has least privilege — only the access it actually needs — plus health gates and rollback.',
      "I pick the tool based on the situation: GitHub Actions for GitHub-native teams, Azure Pipelines when the team is already in Azure DevOps, Jenkins when there's a real reason for heavy customization or legacy support, and Argo CD or Flux for pull-based Kubernetes delivery. I compare security, network access for runners, governance, availability, cost, team skills, and ongoing maintenance — not just popularity.",
    ],
    code: [
      {
        title: 'Value stream',
        language: 'text',
        code: `pull request → build/unit test → quality/security gates → immutable artifact
             → staging deploy → integration/smoke test → approval
             → progressive production deploy → SLO verification → rollback`,
      },
    ],
    followUps: [
      'What would make you pick Jenkins over GitHub Actions today?',
      'Where exactly does rollback happen in this design?',
    ],
    tags: ['ci/cd', 'design', 'tools'],
  },
  {
    id: 'itv-myado-33',
    level: 'basic',
    kind: 'open',
    prompt: 'What CI/CD tools have you used?',
    probing:
      'Whether you describe tools through the delivery flow and are honest about what you personally configured.',
    answer: [
      'I explain where each tool fits and what I personally did with it.',
      'For example: GitHub or Azure Repos for source control, Jenkins, GitHub Actions, or Azure Pipelines for CI orchestration, Maven or npm for builds, SonarQube for quality, Trivy and Checkov for security, Docker plus a registry for artifacts, Terraform for infrastructure, Helm for packaging Kubernetes apps, Argo CD for GitOps, and Prometheus and Grafana for verifying a deployment worked.',
      "I don't claim expert-level with every tool. A convincing answer covers scale, environments, authentication, one pipeline I designed, one failure I investigated, how rollback worked, and a measurable improvement — like a shorter deployment time or a lower change-failure rate.",
      "I like to explain tools through the delivery flow rather than just naming them. Here's a typical workflow:",
      "1. GitHub stores the code and protects the main branch.\n2. GitHub Actions runs the build, unit tests, linting, SonarQube, dependency scanning, and Trivy.\n3. The pipeline publishes an image to a container registry. The image is immutable, meaning once it's built it never changes.\n4. Helm packages the Kubernetes configuration.\n5. Argo CD or Flux promotes the approved image through each environment.\n6. Prometheus, Grafana, and application monitoring confirm the release is healthy.",
      "I've also worked with, or understand, similar patterns in Jenkins, Azure Pipelines, and GitLab CI. In an interview I say exactly what I configured myself, what another team owned, the scale involved, one failure I investigated, and the outcome.",
      "Which tool I pick depends on the repository platform, how much customization is needed, where the runners sit, governance requirements, cost, and the team's existing skills.",
    ],
    tags: ['ci/cd', 'tools', 'experience'],
  },
  {
    id: 'itv-myado-34',
    level: 'intermediate',
    kind: 'open',
    prompt: 'How do you build a Jenkins pipeline for multi-environment deployment?',
    probing:
      'Whether you build once and promote the same digest through environments with isolated credentials.',
    answer: [
      'I build the artifact once, publish it, and keep it immutable. Environment configuration lives outside the artifact and gets parameterized in. Stages are: checkout, test, scan, publish, deploy and test to dev, approve and test in staging, then approve and deploy to production.',
      'Environment credentials and values stay separate from each other and are protected. Shared pipeline libraries hold the common logic, while each application repo just supplies its own version and config. Production deploys the exact same digest that was already tested in staging.',
      'I use environment locks, concurrency limits, timeouts, smoke tests, monitoring, and rollback to the previous artifact. Database changes follow the expand/migrate/contract pattern so they stay backward compatible.',
      'If one environment fails, promotion to the next stops, and I keep the evidence and artifacts around for investigation.',
    ],
    tags: ['jenkins', 'multi-environment'],
  },
  {
    id: 'itv-myado-35',
    level: 'intermediate',
    kind: 'scenario',
    prompt: 'What happens when a pipeline fails? Give a real example.',
    probing:
      'Whether you have a real failure story and fix root causes instead of blindly re-running.',
    answer: [
      'The pipeline stops any dependent stages, records logs and reports, marks the commit status, and notifies the owner. I figure out whether the failure is in the code, the test, the scanner, the runner, the credentials, the artifact, the network, or the target environment.',
      "I don't just rerun it blindly — that hides flaky behavior instead of fixing it.",
      'One real example: Trivy blocked an image because of a critical OpenSSL vulnerability in the base image. I confirmed the CVE and which version fixed it, updated the pinned base image, rebuilt from a clean cache, rescanned, ran regression tests, and published a new immutable digest.',
      'Production was never reached.',
      'Afterward, we scheduled regular base-image updates, assigned ownership for vulnerability exceptions, started retaining SBOMs, and built a dashboard to track aging critical findings.',
    ],
    tags: ['pipeline failure', 'troubleshooting'],
  },
  {
    id: 'itv-myado-36',
    level: 'intermediate',
    kind: 'open',
    prompt: 'How do you integrate code-quality tools like SonarQube?',
    probing:
      'Whether you make the quality gate actually block publication and handle legacy debt sensibly.',
    answer: [
      "I run unit tests and coverage first, then send the source and coverage data to SonarQube. The pipeline waits for the quality gate and blocks publication if the agreed thresholds aren't met.",
      "The gate checks new-code bugs, vulnerabilities, coverage, duplication, and maintainability. I focus the gate on new code so legacy debt doesn't block adoption, and I set up a separate fix plan for older issues.",
      'Tokens are stored securely, and I make sure the scanner and server versions are compatible.',
      "I keep the report link on the pull request. If something's a false positive, it gets a reviewed exception with a reason and an expiry — developers don't just disable the rule. I also test the gate against a known failing branch to make sure it actually blocks.",
    ],
    tags: ['sonarqube', 'quality gate'],
  },
  {
    id: 'itv-myado-37',
    level: 'intermediate',
    kind: 'open',
    prompt: 'What security tools and scans do you use in pipelines?',
    probing:
      'Whether you know the layers of pipeline security scanning and that scanning alone is not security.',
    answer: [
      'I use layered controls:',
      '- Secret scanning before or at commit\n- SAST for source code\n- Software composition analysis and license checks\n- IaC and Kubernetes policy scanning\n- Container image and SBOM scanning\n- DAST against a deployed test environment\n- Artifact and image signing, with verification at admission',
      'Findings get prioritized by severity, exploitability, exposure, and environment. High-risk failures block promotion, and any exception needs an owner and an expiry date. Tools run with least privilege — only the access they need — and reports are checked to avoid leaking secrets.',
      "Scanning alone isn't complete security. Protected branches, isolated runners, pinned dependencies and actions, workload identity, runtime monitoring, patching, and an incident response plan are all still necessary.",
    ],
    tags: ['security scanning', 'devsecops'],
  },
  {
    id: 'itv-myado-38',
    level: 'intermediate',
    kind: 'open',
    prompt: 'How do you manage code vulnerabilities?',
    probing:
      'Whether you run a full vulnerability lifecycle with owners, SLAs and expiring exceptions.',
    answer: [
      'The flow is: discover, validate, prioritize, assign an owner and SLA, remediate or formally accept, rescan, then monitor. I confirm the package, version, and whether the vulnerable code path is actually reachable and used.',
      'The fix might mean updating a library or base image, removing a package, adding a compensating control, or fixing the code directly.',
      'I test for regressions, rebuild the artifact — keeping it immutable — and deploy it progressively. Any exception has to document the business reason, the compensating control, the approver, and an expiry date.',
      'I track metrics like the age of open critical findings, time to fix, recurrence, and false-positive rate.',
      'For an actively exploited issue, I identify which releases are affected, block new deployments, patch and rebuild, rotate any exposed secrets, watch for indicators of compromise, and keep people updated on status.',
    ],
    tags: ['vulnerability management'],
  },
  {
    id: 'itv-myado-39',
    level: 'intermediate',
    kind: 'open',
    prompt: 'How do you prevent shared runners from blocking pipelines?',
    probing:
      'Whether you understand runner capacity management and diagnose queue time before adding capacity.',
    answer: [
      "I monitor queue time, executor utilization, job duration, disk space, and failure rate. Jobs get labels and resource classes so a heavy build doesn't starve a small test job. Runner pools autoscale with a max limit, and critical or protected jobs get their own isolated pool.",
      'I set job timeouts, concurrency controls, fair scheduling, dependency caches, and ephemeral workspaces. A stuck job gets terminated safely, and retries are limited to failures known to be temporary.',
      'Self-hosted runners get patched, capacity-tested, and cleaned between jobs.',
      "If queue time spikes, I first check whether it's real demand, offline agents, slow image pulls, slow startup, or one runaway job — before just throwing more capacity at it.",
    ],
    tags: ['runners', 'capacity'],
  },
  {
    id: 'itv-myado-40',
    level: 'intermediate',
    kind: 'open',
    prompt: 'How do matrix builds, caching, and concurrency limits help pipelines?',
    probing:
      'Whether you know what matrix builds, caches and concurrency limits each solve, and cache pitfalls.',
    answer: [
      'Matrix builds test every supported combination of OS, runtime, and version in parallel. Caching avoids re-downloading the same dependencies every run. Concurrency limits stop unsafe parallel deployments or duplicate workflow runs on the same branch.',
      "Cache keys include the dependency lock file and platform details. A build still has to work correctly with an empty cache, and untrusted branches shouldn't be able to poison a protected cache.",
      'Artifacts and caches are different things: artifacts are versioned deliverables, caches are disposable speed optimizations.',
      "For deployment, I only let one job be active per environment at a time, and I cancel outdated non-production runs. I track speed improvement, cache hit rate, runner cost, and flakiness, so optimizing for speed doesn't quietly reduce test coverage or reliability.",
    ],
    tags: ['matrix', 'caching', 'concurrency'],
  },
  {
    id: 'itv-myado-41',
    level: 'intermediate',
    kind: 'open',
    prompt: 'Explain a complete CD process.',
    probing:
      'Whether you can describe CD from an approved artifact through progressive delivery and health gates.',
    answer: [
      'CD starts from an approved, versioned artifact. The system deploys it to a lower environment, runs schema and policy checks plus integration and smoke tests, then promotes that same digest through each protected environment.',
      'Production uses rolling, canary, or blue-green delivery depending on the risk.',
      'Health gates watch readiness, error rate, latency, saturation — meaning how close a resource is to its limit — and key business transactions. Every deployment record includes the artifact digest, configuration version, approver, and a link to the change. If any limit is exceeded, traffic stops or rolls back.',
      'Database changes stay backward compatible and are kept separate from any destructive cleanup step. After deploying, I watch a defined observation window, complete the audit trail, and keep a tested failback path ready.',
    ],
    tags: ['continuous delivery', 'cd'],
  },
  {
    id: 'itv-myado-42',
    level: 'intermediate',
    kind: 'scenario',
    prompt: 'How do you roll back a faulty deployment?',
    probing:
      'Whether you decide between rollback and fix-forward and know database changes need their own plan.',
    answer: [
      'First I stop the rollout and decide whether rolling back is actually safer than fixing forward. For a stateless application, rollback just points traffic or the deployment controller back at the previous artifact, which stays immutable the whole time.',
      'I check that the old configuration is still compatible, then run smoke tests and watch monitoring.',
      "For canary or blue-green, I shift traffic back quickly. On Kubernetes, I might use a Helm revision or a Deployment rollback. Database and schema changes need their own recovery plan — rolling back the application can't undo a destructive migration.",
      'I preserve the logs and the failed version, communicate status, confirm users have actually recovered, and run a root-cause analysis. Prevention might mean better probes, tighter canary thresholds, backward-compatible schemas, or an integration test we were missing.',
    ],
    tags: ['rollback', 'deployment'],
  },
  {
    id: 'itv-myado-43',
    level: 'intermediate',
    kind: 'open',
    prompt: 'How do you securely store secrets in CI/CD pipelines?',
    probing:
      'Whether you prefer short-lived identity, keep secrets out of every artifact and know masking is not a boundary.',
    answer: [
      'I prefer OIDC or workload identity, so jobs get short-lived cloud credentials instead of long-lived keys. Other secrets live in Vault or a platform secret store, and only the protected job or environment that needs them can see them.',
      'I make sure secrets never end up in Git, YAML, artifacts, cache, Docker layers, command arguments, or logs. Runners are isolated and ephemeral, permissions follow least privilege, and access and rotation get audited. Masking log output is a backup control, not the actual security boundary.',
      "I test that forked or unprotected pipelines can't reach production secrets. If a secret does leak, I revoke and rotate it first, check audit logs and downstream access, remove any retained output, and fix the pipeline.",
    ],
    tags: ['secrets', 'oidc'],
  },
  {
    id: 'itv-myado-44',
    level: 'advanced',
    kind: 'open',
    prompt: 'How do you migrate pipelines from one CI/CD tool to another?',
    probing:
      'Whether you can migrate CI/CD incrementally with parallel runs, compared outputs and a rollback plan.',
    answer: [
      'I inventory triggers, stages, runners, plugins, variables, secrets, artifacts, approvals, schedules, retention rules, and integrations. I separate the portable scripts from tool-specific syntax and map each control to the target platform.',
      'I build one representative pipeline first, migrate secrets securely, recreate the protected environments and identities, then run the old and new pipelines in parallel — without letting both deploy to production. I compare artifact checksums, test results, duration, permissions, and audit evidence between them.',
      'Cutover happens in a freeze or change window, with owner communication, a rollback plan to the old pipeline, and monitoring. I only decommission the old credentials and runners after things have run stably and any retention requirements are met.',
      "1. **Inventory** the existing pipelines: stages, secrets, triggers, plugins, integrations, and agents.\n2. **Map the concepts** across tools. For example, Jenkins stages and a `Jenkinsfile` map to GitHub Actions jobs and YAML. Shared libraries map to reusable or composite workflows. Credentials map to GitHub secrets or OIDC.\n3. **Migrate incrementally.** Start with a low-risk service, run both pipelines in parallel to compare their output, then cut over.\n4. **Re-platform instead of lifting and shifting.** Don't just copy old anti-patterns — use the target tool's own features, like matrix builds, OIDC, and caching.\n5. **Handle secrets and artifacts** by migrating them to the new secret store and artifact repository.\n6. **Validate, then decommission** the old jobs after a bake-in period. Keep everything under version control the whole way through.",
    ],
    followUps: [
      'How do you stop both old and new pipelines deploying to production during the parallel run?',
      'What Jenkins concepts map to GitHub Actions features?',
    ],
    tags: ['migration', 'ci/cd'],
  },
  {
    id: 'itv-myado-45',
    level: 'advanced',
    kind: 'open',
    prompt: 'How do you secure pipelines against supply-chain attacks?',
    probing:
      'Whether you understand supply-chain attacks and defend with pinning, isolation, signing and provenance checks.',
    answer: [
      'I protect source and pipeline changes with code review and branch policy. I pin third-party actions, images, and dependencies to specific versions. I restrict runner egress and permissions, isolate untrusted builds, use short-lived identity, and block secrets from reaching fork jobs.',
      'Builds generate SBOMs, scan dependencies, images, and IaC, and sign artifacts using a protected identity. Deployment checks the signature and provenance — meaning where the artifact came from and how it was built — and only deploys artifacts by their fixed digest. Registries are protected and audited.',
      'I review transitive dependencies, runner images, who owns each plugin or action, and the artifact promotion path. My incident plan covers revoking signing credentials, blocking compromised artifacts, identifying which versions are deployed, rebuilding from trusted sources, and rotating any affected secrets.',
    ],
    followUps: [
      'What does verifying provenance at deployment actually check?',
      'How would you respond to a compromised third-party action?',
    ],
    tags: ['supply chain', 'security'],
  },
  {
    id: 'itv-myado-46',
    level: 'intermediate',
    kind: 'open',
    prompt: 'How do you manage parallel builds and artifacts?',
    probing:
      'Whether you can run jobs in parallel safely and handle artifacts as versioned, checksummed outputs.',
    answer: [
      "Independent tests and services run in parallel with explicit dependencies between them. Each job writes to its own workspace and uses fixed version identifiers, so outputs can't overwrite each other.",
      'A fan-in job collects the reports and decides whether publication is allowed.',
      "Artifacts carry checksums, a version or commit reference, a retention policy, and access controls. I publish once and promote that same artifact — I don't rebuild it per environment. Cache is kept separate and disposable.",
      'Concurrency limits protect shared test systems and deployment environments. I test partial job failure, missing artifacts, retries, and cancellation. Monitoring queue time and duration shows whether parallelism is actually helping, or just moving the bottleneck downstream.',
      "- **Jenkins:** use `parallel {}` stages in a declarative pipeline, spread work across multiple agents or executors, and use matrix builds for combinations. Use `stash`/`unstash` to pass files between stages, and archive artifacts with `archiveArtifacts` or push them to Nexus or Artifactory.\n- **GitLab CI:** jobs in the same `stage` run in parallel automatically. `parallel:` and `parallel:matrix:` fan a job out into many. `artifacts:` pass outputs to later jobs, `cache:` speeds up dependency installs, and `needs:` builds a DAG so jobs don't wait on unrelated stages.\n- **In general:** use an artifact repository (Nexus, Artifactory, or a container registry) as the single source of truth, version artifacts so they never change once published, and cache dependencies to speed up builds.",
    ],
    tags: ['parallel builds', 'artifacts'],
  },
  {
    id: 'itv-myado-47',
    level: 'advanced',
    kind: 'open',
    prompt: 'How do you implement zero-downtime deployments in Jenkins or GitHub Actions?',
    probing:
      'Whether you know zero downtime comes from the workload and platform design, not the CI tool.',
    answer: [
      'The pipeline picks rolling, blue-green, or canary delivery. The workload needs multiple replicas spread across failure domains — groups of resources that could fail together — realistic readiness and startup probes, enough spare capacity, graceful shutdown, and connection draining.',
      'New versions need backward-compatible APIs, config, and database schema.',
      'The pipeline deploys to a small slice first, runs smoke and synthetic tests, and watches error rate, latency, saturation, and business metrics. Traffic only increases once those checks pass. If they decline, it stops and routes back to the previous version.',
      'I load-test the strategy itself and simulate a failed readiness check and a rollback. "Zero downtime" is an availability goal that the architecture has to support — adding a deploy command alone doesn\'t guarantee it.',
      "- **Rolling update** (the Kubernetes default): new pods come up and pass their readiness check before old pods are terminated. `maxUnavailable` and `maxSurge` control how aggressive this is. Use PodDisruptionBudgets too.\n- **Blue/Green:** stand up the new version next to the old one, then switch traffic over once it's healthy. Rollback is instant — just switch back.\n- **Canary:** send a small percentage of traffic to the new version, watch the metrics, then ramp up gradually.\n- **What actually enables this, regardless of tool:** readiness and liveness probes, graceful shutdown (handling SIGTERM and using `preStop`), backward-compatible database migrations (the expand/contract pattern), and only promoting once health checks pass. The CI tool just triggers these steps — the real zero-downtime behavior lives in how the deployment target is set up.",
    ],
    followUps: [
      'What maxSurge and maxUnavailable would you choose for three replicas?',
      'How does graceful shutdown avoid dropped requests?',
    ],
    tags: ['zero downtime', 'deployment strategies'],
  },
  {
    id: 'itv-myado-48',
    level: 'basic',
    kind: 'open',
    prompt: 'What SAST and DAST tools do you prefer?',
    probing: 'Whether you know common SAST and DAST tools and where each runs in the pipeline.',
    answer: [
      'SonarQube, CodeQL, Checkmarx, and Semgrep are common SAST tools. OWASP ZAP and Burp Suite Enterprise are common DAST tools. The right choice depends on languages, framework support, accuracy, CI integration, compliance needs, and who owns the tool.',
      'SAST runs early against source code. DAST tests a running, authorized, non-production target, and needs its rate and scope controlled. I combine both with dependency, secret, IaC, container, and runtime controls.',
      'I tune the rules, keep evidence, set severity gates with expiring exceptions, and track the true-positive and fix rate. No single scanner proves an application is secure.',
    ],
    tags: ['sast', 'dast'],
  },
  {
    id: 'itv-myado-49',
    level: 'basic',
    kind: 'open',
    prompt: 'How do you manage a ServiceNow task assigned to you?',
    probing:
      'Whether you handle tickets with prioritisation, documentation, change control and verified closure.',
    answer: [
      "I read the category, impact, urgency, SLA, requester, evidence, dependencies, and any approval requirements. I restate the expected outcome and ask focused questions if something's unclear. I prioritize by user and business impact and the SLA — not just the order tickets arrived in.",
      'I document investigation timestamps, the commands and results I ran (without secrets), the changes made, validation steps, and communication. Risky changes go through change control with a rollback plan.',
      "If I'm blocked, I update the ticket with the owner, the reason, the next action, and an expected time — I don't leave it silent.",
      'I only close a ticket once the requester or a defined test confirms success. I link related incident, problem, or change records, and write a knowledge article or automation if the issue is likely to repeat.',
    ],
    tags: ['servicenow', 'ticketing', 'process'],
  },
  {
    id: 'itv-myado-50',
    level: 'advanced',
    kind: 'open',
    prompt: 'How do you make CI/CD pipelines auditable for compliance?',
    probing:
      'Whether you can make pipelines produce audit evidence automatically and keep bypass paths audited.',
    answer: [
      'Pipeline definitions and infrastructure code are version-controlled and reviewed. Protected branches and environments, identities with least privilege, separation of duties, and immutable artifacts all build in traceability.',
      "For every release I retain the commit, the pull request and its reviewers, test/scan/policy results, the artifact's digest/signature/SBOM, approvals, deployment logs, the environment and config version, and the verification or rollback result. Logs follow a defined retention period and sit in tamper-resistant storage with restricted access.",
      'I map this evidence to the actual control requirements, and I test that emergency or bypass paths are still audited. Good compliance automation makes the approved path the easy path — manual screenshots are fragile and easy to miss things with.',
    ],
    followUps: [
      'What evidence would an auditor ask for on one production release?',
      'How do you audit an emergency break-glass deployment?',
    ],
    tags: ['compliance', 'audit'],
  },
  {
    id: 'itv-myado-51',
    level: 'advanced',
    kind: 'scenario',
    prompt: 'A CI/CD pipeline takes 30–60 minutes. How would you reduce it to under five minutes?',
    probing:
      'Whether you measure before optimising and speed up feedback without weakening quality gates.',
    answer: [
      'I measure before optimizing. Stage timestamps, queue time, executor utilization, cache hit rate, artifact transfer time, Docker layer timings, test reports, and external API latency show whether the real bottleneck is waiting, checkout, installing dependencies, compiling, testing, scanning, building the image, or deploying.',
      "I compare a fast run and a slow run from the same commit, and I don't just start cutting quality checks to save time.",
      'Then I apply targeted fixes: shallow or sparse checkout, dependency caches keyed to the lockfile, BuildKit layer caching, a smaller build context, incremental compilation, parallel independent jobs, test splitting based on historical duration, and pre-warmed ephemeral agents close to the registry.',
      "In a monorepo, services that didn't change can be skipped, as long as the dependency mapping is reliable.",
      'Unit and static checks run first so failures show up fast. Integration and security suites run in parallel, with enough isolated capacity to support that.',
      'Getting under five minutes may not be realistic for every full production qualification. Instead, I aim for a fast commit-feedback path, while still running the broader required tests before promotion — or continuously, against that same artifact.',
      'I verify the cache is actually correct, run periodic clean builds, track p50/p95 duration and flakiness, and make sure speed improvements never weaken security or reproducibility.',
    ],
    followUps: [
      'How do you split tests by historical duration?',
      'How do you check a cache is correct and not hiding a broken build?',
    ],
    tags: ['pipeline performance', 'optimization'],
  },
  {
    id: 'itv-myado-52',
    level: 'advanced',
    kind: 'open',
    prompt: 'How do you design rollback so it still works when the deployment stage itself fails?',
    probing:
      'Whether rollback runs from an independent, protected path that still works when the deploy job itself fails.',
    answer: [
      "I design rollback before deployment even happens, and it runs from a separate, protected recovery path — not just as the next command in a job that already failed. I store the last known-good artifact — image, chart, or config version — and its deployment metadata outside the agent's own workspace.",
      'The deployment system uses timeouts and `post`/`finally` handling, but an operator or an automated health controller can also trigger a dedicated rollback job with its own independent credentials.',
      "On Kubernetes I use a Git revert, a Helm rollback, or a progressive-delivery controller. For VM deployments, I keep the previous package or image around and rotate traffic back to it. Database changes use the expand-and-contract pattern, because rolling back application code can't undo an incompatible, destructive schema change.",
      "The recovery workflow is idempotent, meaning it's safe to run more than once. It's also scoped to one environment, audited, and gated by approval for production.",
      'I test failure at checkout, artifact download, partial rollout, health check, and notification stages. After a rollback, I verify the real customer transaction, error and latency metrics, the version running on every instance, database compatibility, and any queue or background workers.',
      'Then I preserve the evidence and fix the failed release properly, rather than just retrying it over and over.',
    ],
    followUps: [
      'Where do you store the last known-good version so rollback does not depend on the failed job?',
      'How do you test the rollback path?',
    ],
    tags: ['rollback', 'resilience'],
  },
  {
    id: 'itv-myado-53',
    level: 'advanced',
    kind: 'open',
    prompt: 'How do you implement multi-environment CI/CD while preventing configuration drift?',
    probing:
      'Whether you keep environments consistent with one artifact, validated config and drift detection.',
    answer: [
      'I build one artifact and promote that same digest through Dev, QA, UAT, and Production. Environment differences are explicit, schema-validated values stored in version control or an approved config/secret service — never copied pipeline logic or manually edited servers.',
      'Reusable pipeline templates and infrastructure modules give everyone one shared process, and protected environment files hold only the justified differences.',
      'Infrastructure and application config both go through plan/diff checks, GitOps reconciliation where it fits — meaning the actual state is automatically brought back in line with the desired state — and scheduled drift detection. Production gets stronger approval and credentials, but it never runs a different, untested script.',
      'Secrets are referenced by identity and path, never copied between environments. Database and feature changes stay backward compatible throughout the promotion.',
      'Before deploying, I compare desired state against live state. Afterward, I record the artifact, config commit, infrastructure version, and policy results, and run smoke tests. Break-glass changes expire and have to be reconciled back into code.',
      'This makes drift visible, without pretending every environment has identical capacity or integrations.',
    ],
    followUps: [
      'How do you detect drift between Git and a live cluster?',
      'Where should environment-specific values live?',
    ],
    tags: ['multi-environment', 'drift'],
  },
  {
    id: 'itv-myado-54',
    level: 'advanced',
    kind: 'open',
    prompt:
      'A team deploys 50 times per day. How do you maintain stability without slowing releases?',
    probing:
      'Whether you keep high deploy frequency stable with small changes, progressive rollout and error budgets.',
    answer: [
      'I make every change small, independently testable, observable, and reversible. Trunk-based development or short-lived branches, required automated tests, static and security policy checks, immutable artifacts, and reliable ephemeral test environments all give fast feedback.',
      'High-risk code gets separated from the release itself using feature flags, with clear ownership and an expiry date.',
      'Deployment uses canary or progressive rollout, with automated analysis of error rate, latency, saturation, and business metrics, and automatic pause or rollback. Changes keep backward-compatible APIs and expand-and-contract database migrations.',
      "Service ownership, SLOs, error budgets, runbooks, and on-call readiness decide when the release rate is actually safe. A depleted error budget can mean pausing for reliability work — but that shouldn't become a permanent manual gate.",
      'I track change failure rate, lead time, deployment frequency, recovery time, flaky tests, and rollback success. Delivery is fast and stable when the pipeline catches bad changes early and production limits the blast radius — not when reviews or tests get skipped.',
    ],
    followUps: [
      'What do you do when the error budget is exhausted?',
      'Which DORA metrics would you report, and why?',
    ],
    tags: ['deployment frequency', 'stability', 'dora'],
  },
  {
    id: 'itv-myado-55',
    level: 'intermediate',
    kind: 'open',
    prompt:
      'True or false: it is acceptable to deploy a critical banking application directly to production without automated testing because the developer is confident and time is limited.',
    probing:
      'Whether you refuse untested production deploys and know how a governed break-glass change works.',
    answer: [
      "False. Confidence isn't evidence, and time pressure actually increases the need for controlled risk, not less.",
      'A critical banking change needs traceability, separation of duties, security and regulatory controls, repeatable tests, an approved artifact, a rollback plan, and post-deployment verification. Deploying untested code directly can cause financial loss, data-integrity problems, security exposure, and a change nobody can audit afterward.',
      "For a genuine emergency, I'd use an approved break-glass process instead: define the incident and the smallest safe change, get it peer-reviewed, run the fastest relevant automated checks, back up affected state, deploy it as a canary or in a tightly scoped way, prepare the rollback, record who authorized it, and monitor real business transactions.",
      'Any lower-priority tests that got skipped run immediately afterward, and the emergency path itself gets reviewed.',
      "Emergency governance can move faster — but it's still governance, not the absence of it.",
    ],
    tags: ['governance', 'banking', 'emergency change'],
  },
  {
    id: 'itv-myado-56',
    level: 'advanced',
    kind: 'scenario',
    prompt:
      'A deployment works in staging but fails in production. What differences do you compare?',
    probing:
      'Whether you compare the right staging vs production differences systematically, starting with the artifact.',
    answer: [
      'I compare the exact artifact digest and configuration commit first — rebuilding between environments would make this investigation unreliable.',
      'Then I check identity and permissions, secret names and versions, network routes and firewall policy, DNS and certificates, database schema and data volume, feature flags, external endpoints, quotas, resource limits, replica counts, region or zone, runtime versions, admission policies, and any production-only proxy or service mesh.',
      'I preserve the production error, deployment events, logs, metrics, traces, and an audit of what changed, then reproduce the issue with production-like configuration while keeping sensitive values protected. I avoid making random manual changes while investigating.',
      'If the impact is still active, I pause or roll back and confirm recovery before testing any fix.',
      "The long-term fix is environment parity where it's practical, explicit versioned differences where it isn't, promoting one immutable artifact everywhere, testing with production-like load and policy, validating the config schema, running preflight dependency checks, and detecting drift.",
    ],
    followUps: [
      'Why does rebuilding between environments make this investigation unreliable?',
      'Which production-only components most often cause this?',
    ],
    tags: ['troubleshooting', 'environments'],
  },
  {
    id: 'itv-myado-57',
    level: 'advanced',
    kind: 'scenario',
    prompt:
      'A deployment succeeded, but traffic still reaches the old version. Where do you start?',
    probing:
      'Whether you trace the request path end to end instead of trusting a green deployment message.',
    answer: [
      'First I verify the actual deployed artifact digest, the workload revision, and the real Pod or container image — I don\'t just trust a "success" message.',
      'Then I trace the request path: DNS and CDN cache, the load balancer or ingress routing, the service selector and EndpointSlices, readiness, the rollout strategy and its traffic weights, service-mesh routing, and client or browser cache.',
      'Common causes are a mutable tag resolving to something unexpected, a deployment template that never actually changed, old endpoints still marked ready, canary or blue-green routing still weighted toward the old revision, cache TTL, or a deploy that went to the wrong cluster or namespace.',
      'I capture evidence, make the smallest reversible fix to routing or rollout, and confirm live requests are hitting the new version — using version headers or metrics — before closing the incident.',
    ],
    followUps: [
      'How do you prove which version a live request actually hit?',
      'How can a mutable tag cause this?',
    ],
    tags: ['troubleshooting', 'traffic', 'routing'],
  },
  {
    id: 'itv-myado-58',
    level: 'intermediate',
    kind: 'open',
    prompt:
      'How do the pieces of an end-to-end delivery pipeline fit together, and which tools fit each stage?',
    probing:
      'Whether you can explain how source control, CI, scanning, IaC, GitOps and observability fit together.',
    answer: [
      "An end-to-end delivery pipeline turns a reviewed commit into a verified, running service. Here's how the pieces fit together.",
      "1. A developer writes code and gets it reviewed in GitHub, GitLab, or Azure Repos.\n2. A CI system, such as **GitHub Actions** or **Jenkins**, triggers on a pull request or a protected merge.\n3. Unit and integration tests, static analysis (**SonarQube**), and dependency, IaC, secret, and container scans (**Trivy**) run to give fast feedback.\n4. The build produces one package or Docker image that never changes once it's built. It generates an SBOM and provenance data — a record of where the artifact came from and how it was built — signs the image, and pushes it to a registry like **ECR**.\n5. **Terraform** provisions the infrastructure. **Ansible** configures machines, where that model is used.\n6. **Helm** or **Kustomize** manifests describe the Kubernetes resources. A GitOps repository records the desired image digest, and **Argo CD** or **Flux** reconciles it — meaning it keeps adjusting the cluster until it matches what's in Git — across clusters like EKS or AKS.\n7. A Service, Ingress, or load balancer only routes users to workloads that are actually ready.\n8. **Prometheus**, **Grafana**, logs, traces, an APM tool like **Dynatrace**, **Alertmanager**, **Slack**, and **PagerDuty** support verification and day-to-day operations.",
      '- **Source control**: GitHub, GitLab, Azure Repos\n- **CI orchestration**: GitHub Actions, Jenkins\n- **Code quality**: SonarQube\n- **Security scanning**: Trivy, plus dependency/IaC/secret scanners\n- **Infrastructure**: Terraform, Ansible\n- **Kubernetes packaging**: Helm, Kustomize\n- **GitOps delivery**: Argo CD, Flux\n- **Target clusters**: EKS, AKS\n- **Observability**: Prometheus, Grafana, Dynatrace\n- **Alerting & notifications**: Alertmanager, Slack, PagerDuty',
    ],
    tags: ['ci/cd', 'end-to-end', 'tools'],
  },
  {
    id: 'itv-myado-59',
    level: 'basic',
    kind: 'open',
    prompt: 'What are the key principles of CI/CD delivery?',
    probing:
      'Whether you know the core delivery principles: build once, external config, protected production.',
    answer: [
      'These are the principles I apply to every delivery pipeline:',
      "- **Build once, promote everywhere.** The same digest moves through every environment — nothing gets rebuilt along the way.\n- **Keep configuration external.** Environment differences and secrets live outside the artifact, in version control or a secret manager.\n- **Protect production.** Use protected identities and approvals, progressive delivery, health and SLO gates, and a rollback path that's independent of the deploy path.\n- **CI proves quality, CD controls promotion.** CI's job is to prove the artifact is good. CD's job is to move it forward safely and confirm the real application works.",
    ],
    tags: ['ci/cd', 'principles'],
  },
  {
    id: 'itv-myado-60',
    level: 'basic',
    kind: 'open',
    prompt: 'What is the difference between CI, continuous delivery and continuous deployment?',
    probing:
      'Whether you can precisely distinguish CI, continuous delivery and continuous deployment within DevOps.',
    answer: [
      '**DevOps** is the broader culture and practice: collaboration, automation, measurement, and continuous improvement. CI/CD sits inside that.',
      '- **Continuous Integration (CI)**: Integrate and test changes frequently, so problems surface early\n- **Continuous Delivery**: Always keep an approved artifact ready to deploy, with a human deciding when to release it\n- **Continuous Deployment**: Automatically release every change that passes, within defined risk controls',
    ],
    tags: ['ci', 'continuous delivery', 'continuous deployment'],
  },
  {
    id: 'itv-myado-61',
    level: 'intermediate',
    kind: 'open',
    prompt: 'What is a webhook in CI/CD, and how do you secure and troubleshoot it?',
    probing:
      'Whether you know how webhooks trigger pipelines and how to secure and troubleshoot them.',
    answer: [
      'A webhook is an HTTP callback sent when something happens. Instead of a CI system repeatedly polling a repository for changes, GitHub, GitLab, or Azure Repos sends a signed event — a push, a pull request, a tag, or a release — straight to the CI/CD endpoint. That endpoint validates the event and decides whether to start a pipeline.',
      'Security and reliability controls:',
      "- Use TLS, and validate the webhook signature with a secret that gets rotated regularly.\n- Only accept expected event types, and validate the repository, branch, and sender.\n- Protect against replay using delivery IDs and timestamps. Make event handling idempotent, meaning it's safe to process the same event more than once without side effects.\n- Acknowledge the webhook quickly, queue the actual work, and use limited retries with a dead-letter queue for failures.\n- Never treat receiving a webhook as authorization to deploy to production on its own. Branch protection, checks, artifact trust, environment approval, and deployment identity are all still separate controls.\n- Log the delivery ID, event type, repository, decision, and pipeline run — but never log secrets or sensitive payload data.",
      "When troubleshooting, I compare the repository's delivery log against the receiver's access logs, check DNS, TLS, firewall rules, and the response status, validate the signature secret and endpoint path, and check whether a pipeline rule intentionally ignored the event.",
    ],
    code: [
      {
        title: 'Webhook-driven pipeline flow',
        language: 'text',
        code: `developer push → repository webhook → Jenkins/GitLab/Azure pipeline
→ build and tests → artifact publication → deployment or GitOps update
→ status reported back to the commit and notification channel`,
      },
    ],
    tags: ['webhooks', 'security'],
  },
  {
    id: 'itv-myado-62',
    level: 'basic',
    kind: 'open',
    prompt: 'What is the difference between GitHub Actions and Jenkins?',
    probing:
      'Whether you can compare GitHub Actions and Jenkins on hosting, config, maintenance and fit.',
    answer: [
      'The main differences, side by side:',
      '- **Hosting**: GitHub Actions: SaaS (hosted runners) or self-hosted; Jenkins: Self-managed server + agents\n- **Config**: GitHub Actions: YAML in repo; Jenkins: Groovy `Jenkinsfile` (or UI jobs)\n- **Setup/maintenance**: GitHub Actions: Minimal, no server to run; Jenkins: You maintain master, agents, plugins, updates\n- **Ecosystem**: GitHub Actions: Marketplace actions; Jenkins: Huge plugin ecosystem (also more CVE surface)\n- **Integration**: GitHub Actions: Native to GitHub; Jenkins: Tool-agnostic, works with any SCM\n- **Scaling**: GitHub Actions: GitHub-managed / self-hosted; Jenkins: You manage agent fleet\n- **Best for**: GitHub Actions: GitHub-hosted projects, quick start; Jenkins: Complex/legacy/on-prem, highly customized pipelines',
    ],
    tags: ['github actions', 'jenkins', 'comparison'],
  },
  {
    id: 'itv-myado-63',
    level: 'intermediate',
    kind: 'open',
    prompt: 'Blue/green vs canary: when do you choose which?',
    probing:
      'Whether you can choose between blue-green and canary based on rollback speed, cost and blast radius.',
    answer: [
      'The choice comes down to rollback speed, capacity cost and how gradually you want to expose real users:',
      '- **Blue/Green:** you run two full environments and cut traffic over all at once. Choose this when you need an instant rollback and can afford double the capacity — for example, major releases where testing on a full parallel environment matters. Downside: cost, and all users move at the same time.\n- **Canary:** you gradually shift a small slice of traffic to the new version while watching metrics. Choose this when you want to limit the blast radius, validate against real production traffic, and roll changes out gradually. It needs good metrics and automation to work well. Downside: more complex routing, and a slower full rollout.\n- Rule of thumb: canary for continuous, risk-managed delivery of high-traffic services; blue-green for big-bang releases that need an instant switch.',
    ],
    tags: ['blue-green', 'canary'],
  },
  {
    id: 'itv-myado-64',
    level: 'basic',
    kind: 'open',
    prompt: 'How much experience do you have writing pipeline scripts and end-to-end pipelines?',
    probing:
      'Whether you can back up your pipeline experience with specific tools and a concrete end-to-end flow.',
    answer: [
      'Answer with specifics: "I\'ve written declarative and scripted Jenkins pipelines in Groovy, GitHub Actions workflows, and GitLab CI pipelines.',
      'End-to-end, I\'ve built pipelines that check out code, build it with Maven or Docker, run unit tests, run SonarQube for static analysis, scan dependencies and images with OWASP and Trivy, push to Nexus or ECR, deploy to Kubernetes with Helm or Argo CD, run smoke tests, and send a Slack notification — with a manual approval step before production."',
      "Name the actual tools you've used and walk through the flow.",
    ],
    tags: ['experience', 'pipelines'],
  },
  {
    id: 'itv-myado-65',
    level: 'intermediate',
    kind: 'open',
    prompt: 'Write a pipeline script in Groovy for Jenkins.',
    probing:
      'Whether you can write a realistic declarative Jenkinsfile covering build, test, scan, push, deploy and notify.',
    answer: [
      'A declarative Jenkinsfile that checks out, builds and tests with Maven, publishes JUnit results, runs SonarQube, builds a Docker image, scans it with Trivy, pushes it, deploys with Helm and notifies Slack.',
      'Credentials come from `withCredentials` and the password goes to `docker login` through `--password-stdin`; the `post` block reports success or failure to the deploy channel.',
    ],
    code: [
      {
        title: 'Declarative Jenkinsfile: build, scan, push, deploy',
        language: 'text',
        code: `pipeline {
  agent any
  environment { IMAGE = "myapp:\${env.BUILD_NUMBER}" }
  stages {
    stage('Checkout') { steps { checkout scm } }
    stage('Build')    { steps { sh 'mvn -B clean package' } }
    stage('Test')     { steps { sh 'mvn test' }
                        post { always { junit '**/target/surefire-reports/*.xml' } } }
    stage('SonarQube'){ steps { withSonarQubeEnv('sonar') { sh 'mvn sonar:sonar' } } }
    stage('Docker')   { steps { sh "docker build -t \${IMAGE} ." } }
    stage('Scan')     { steps { sh "trivy image --exit-code 1 --severity HIGH,CRITICAL \${IMAGE}" } }
    stage('Push')     { steps {
        withCredentials([usernamePassword(credentialsId:'ecr', usernameVariable:'U', passwordVariable:'P')]) {
          sh "echo $P | docker login -u $U --password-stdin <registry> && docker push \${IMAGE}"
        } } }
    stage('Deploy')   { steps { sh "helm upgrade --install myapp ./chart --set image.tag=\${env.BUILD_NUMBER}" } }
  }
  post {
    success { slackSend channel: '#deploys', message: "✅ \${IMAGE} deployed" }
    failure { slackSend channel: '#deploys', message: "❌ Build \${env.BUILD_NUMBER} failed" }
  }
}`,
      },
    ],
    tags: ['jenkins', 'groovy', 'jenkinsfile'],
  },
]
