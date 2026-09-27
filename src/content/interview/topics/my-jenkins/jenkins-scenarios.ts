import type { InterviewQuestion } from '../../../types'

/** Jenkins scenario and troubleshooting questions: crashes, agents, queues, HA, security and rollback. */
export const myJenkinsScenarioQuestions: InterviewQuestion[] = [
  {
    id: 'itv-myjen-24',
    level: 'advanced',
    kind: 'scenario',
    prompt: 'What if a Jenkins controller crashes?',
    probing:
      'Whether you can recover a crashed controller from tested backups and config-as-code, and are honest that Jenkins is not active-active.',
    answer: [
      "First I figure out whether it's the process, the host, storage, the database, or the network that failed, and I make sure nobody starts a second, conflicting recovery attempt at the same time.",
      'I save the logs, then restore the controller from a tested `JENKINS_HOME` backup or persistent storage, along with the version-controlled Jenkins Configuration as Code, the plugin version list, and the pipeline definitions.',
      'Artifacts stay safe because they live in an external registry, not on the controller, and agents are disposable anyway. Before I let production deployments run again, I check credentials, plugins, webhooks, agents, the queue, and one non-production pipeline.',
      "Standard Jenkins doesn't normally run as an active-active controller setup. I describe this as backup-and-restore, or a warm standby, with a measured recovery time and recovery point.",
      'To prevent this in the future: monitor controller health, alert on disk space, regularly test that backups actually restore, keep the plugin list small, and keep configuration and pipelines in Git.',
      'I first determine whether only the process failed or the VM, container, disk, or database is also unavailable. I restore the controller on a known-good host from a tested backup of `JENKINS_HOME`, configuration-as-code files, plugin versions, credentials, and job metadata.',
      'Build artifacts should live in an external artifact repository rather than only on the controller.',
      'I reduce recovery time by keeping Jenkins Configuration as Code and pipeline definitions in Git, using persistent and backed-up storage, monitoring controller health, and using ephemeral agents so builds do not depend on the controller host.',
      'Standard Jenkins is not an active-active controller system, so I describe this as disaster recovery or warm standby, not automatic active-active HA.',
      'After recovery, I validate credentials, plugins, agents, webhooks, queued jobs, and one non-production pipeline before enabling production deployments.',
      "**Detailed interview approach:** I treat recovering the controller as a separate problem from keeping build capacity available. Jenkins controllers normally run active/passive — just running multiple replicas against the same home directory doesn't make them safe on its own.",
      "I keep configuration and pipelines as code, back up `JENKINS_HOME` on a regular schedule, record which plugin versions are running, protect credentials, and actually test restoring to a standby or new controller. Builds run on agents that get created fresh for each job and torn down afterward, so losing one agent isn't a big deal.",
      "If the controller crashes, I preserve the logs first, then restore or fail over using the documented storage or database procedure, reconnect the agents, and check that credentials, jobs, the queue, and webhooks all came back correctly. I keep watching the controller's JVM health, disk space, queue length, backup success, and how long recovery actually takes.",
    ],
    followUps: [
      'What exactly do you back up, and how often do you test a restore?',
      'Why is running two controllers on the same JENKINS_HOME unsafe?',
    ],
    tags: ['jenkins', 'controller', 'disaster recovery'],
  },
  {
    id: 'itv-myjen-25',
    level: 'intermediate',
    kind: 'scenario',
    prompt: 'What if a Jenkins agent node goes offline?',
    probing:
      'Whether you diagnose an offline agent from its logs and resources and replace unhealthy agents rather than nursing them.',
    answer: [
      "I check whether it's just one agent, or a whole label or pool, that's affected, and whether the jobs running on it are safe to just retry. In Jenkins, I look at the offline reason and the connection log.",
      'On the agent itself, I check the process or container status, CPU/memory/disk, the Java version, DNS and network access to the controller, certificates, credentials, the clock, and workspace permissions.',
      'For Kubernetes agents, I look at Pod events, image pulls, scheduling, resource quotas, the service account, and container logs. I replace an unhealthy agent rather than trying to fix it in place — but I save the evidence first, before replacing it.',
      "I only reconnect once I've actually fixed the cause. I clean up any workspace that might be corrupted, rerun the stages that are safe to run more than once, and confirm the output is correct. Autoscaling, having more than one agent per label, health checks, and agent images that never change after they're built all stop a single bad host from blocking delivery.",
      'Check agent logs → Restart service → Verify connectivity with master → Add auto-scaling slaves (Kubernetes or cloud VMs).',
      '**Detailed interview approach:** I start by checking the queue reason, executor usage, node labels, offline status, and the controller and agent logs. A job can be stuck waiting because no agent matches its label, every executor is busy, a node has disconnected, a concurrency limit is in effect, or cloud-agent provisioning failed.',
      'I check `Manage Nodes`, queue and build metrics, agent pod or VM events, and network and credential health, then restore or scale the right agent pool. Adding more executors to the controller is not the fix.',
      'To stop this from happening again, I use agents that scale automatically and get created fresh for each job, set up alerts for capacity and queue time, use sensible labels and quotas, add health checks to agent images, apply timeouts, and keep long or privileged workloads separate from everything else.',
    ],
    tags: ['jenkins', 'agents', 'troubleshooting'],
  },
  {
    id: 'itv-myjen-26',
    level: 'intermediate',
    kind: 'scenario',
    prompt: 'How do you handle Jenkins job failures due to long build times?',
    probing:
      'Whether you classify a long-build failure and use parallelism, caching and timeouts rather than retries.',
    answer: [
      'Break into smaller jobs → Run in parallel stages → Use distributed builds with agents → Cache dependencies.',
      '**Detailed interview approach:** When a stage fails, I save its console output, test reports, agent identity, commit, and parameters right away, along with anything that changed recently in the pipeline or tools. Then I work out what kind of failure it is: a real code problem, a lost agent, a dependency outage, a timeout, resource pressure, or a flaky shared test.',
      "I reproduce the failure on the same versioned agent image with the same credentials scope. I add temporary, focused debug output and fix the actual cause instead of just adding more retries. Where stages don't depend on each other, I run them in parallel. I cache dependencies using checksum-based keys, and I give long-running work a timeout plus the ability to resume from saved artifacts.",
      "Once it's fixed, I rerun the failed test and the full pipeline, compare the duration and failure rate against past runs, and add monitoring or a regression test so the problem doesn't come back unnoticed.",
    ],
    tags: ['jenkins', 'long builds', 'performance'],
  },
  {
    id: 'itv-myjen-27',
    level: 'advanced',
    kind: 'open',
    prompt: 'How do you implement compliance checks in Jenkins?',
    probing:
      'Whether you enforce compliance with policy-as-code gates, signed artifacts and time-limited exceptions.',
    answer: [
      'Add compliance scan stage (e.g., Checkov, OPA), fail builds on violations, and generate compliance reports automatically. Mini-case: A Jenkins job blocked deployment because S3 buckets were public — policy-as code ensured compliance.',
      '**Detailed interview approach:** I protect the whole path from source code to production: branch protection and review, pinned dependency/action/plugin versions, isolated build runners that get thrown away after each job, and short-lived identities that only get the access they need. On top of that I run static analysis, dependency, secret, infrastructure-as-code, and container scans, generate a software bill of materials, and sign artifacts with proof of where they came from and how they were built. Registries are protected, and deployment checks verify all of this before letting anything through.',
      'Each finding has an agreed severity and time limit to fix it, plus a time-limited exception process, so the gates are strict but still usable.',
      'If I suspect something was compromised, I stop any promotion in progress, revoke the runner and signing credentials, isolate the affected artifacts, save evidence for the audit, rebuild from a trusted source and runner, and verify signatures again before deploying anything.',
      "Regular patching, restricting outbound network access, keeping audit logs, and practicing recovery drills cover the things a scanner can't catch on its own.",
    ],
    followUps: [
      'How do you handle an exception to a Checkov or OPA policy?',
      'What evidence proves a release passed compliance checks?',
    ],
    tags: ['jenkins', 'compliance', 'policy as code'],
  },
  {
    id: 'itv-myjen-28',
    level: 'intermediate',
    kind: 'scenario',
    prompt: 'How do you secure Jenkins pipeline logs containing secrets?',
    probing:
      'Whether you know masking is not enough and treat a secret in a log as a real exposure.',
    answer: [
      'Mask credentials with Jenkins plugins → Store secrets in vaults → Disable console echo for sensitive vars.',
      '**Detailed interview approach:** I secure the Jenkins UI itself with single sign-on and multi-factor login, role-based authorization, CSRF protection, TLS, and a private controller with patched core and plugins. I never run builds directly on the controller.',
      'Credentials live in the Jenkins credential store or an external vault, scoped to the smallest folder or job that actually needs them. Pipelines pull them in with `withCredentials`, avoid turning on shell tracing, and never paste secrets directly into command lines or build artifacts.',
      "Agents are short-lived, isolated, run as non-root where possible, and get a short-lived cloud identity instead of a long-lived key. If a secret still ends up in a log, masking isn't enough on its own. I treat it as a real exposure: revoke and rotate the secret, restrict or delete the logs that captured it where policy allows, check who accessed it, and fix the step that printed it.",
      'I also back up configuration and plugins regularly, and test that the backups actually restore.',
    ],
    tags: ['jenkins', 'secrets', 'logs'],
  },
  {
    id: 'itv-myjen-29',
    level: 'advanced',
    kind: 'open',
    prompt: 'How do you handle Jenkins master node becoming a single point of failure?',
    probing:
      'Whether you separate controller recovery from build capacity and know controllers run active/passive.',
    answer: [
      'Run Jenkins in HA (Kubernetes) → Backup Jenkins home → Scale horizontally with agents.',
      "**Detailed interview approach:** I treat recovering the controller as a separate problem from keeping build capacity available. Jenkins controllers normally run active/passive — just running multiple replicas against the same home directory doesn't make them safe on its own.",
      "I keep configuration and pipelines as code, back up `JENKINS_HOME` on a regular schedule, record which plugin versions are running, protect credentials, and actually test restoring to a standby or new controller. Builds run on agents that get created fresh for each job and torn down afterward, so losing one agent isn't a big deal.",
      "If the controller crashes, I preserve the logs first, then restore or fail over using the documented storage or database procedure, reconnect the agents, and check that credentials, jobs, the queue, and webhooks all came back correctly. I keep watching the controller's JVM health, disk space, queue length, backup success, and how long recovery actually takes.",
    ],
    followUps: [
      'What recovery time and recovery point can you actually promise?',
      'How do ephemeral agents reduce the blast radius of a controller outage?',
    ],
    tags: ['jenkins', 'high availability', 'spof'],
  },
  {
    id: 'itv-myjen-30',
    level: 'intermediate',
    kind: 'scenario',
    prompt: 'How do you troubleshoot Jenkins plugin failures?',
    probing:
      'Whether you debug plugin failures from logs and compatibility and test changes on a staging controller.',
    answer: [
      'Check Jenkins logs → Verify plugin compatibility → Downgrade/upgrade plugin → Test in staging Jenkins.',
      '**Detailed interview approach:** When a stage fails, I save its console output, test reports, agent identity, commit, and parameters right away, along with anything that changed recently in the pipeline or tools. Then I work out what kind of failure it is: a real code problem, a lost agent, a dependency outage, a timeout, resource pressure, or a flaky shared test.',
      "I reproduce the failure on the same versioned agent image with the same credentials scope. I add temporary, focused debug output and fix the actual cause instead of just adding more retries. Where stages don't depend on each other, I run them in parallel. I cache dependencies using checksum-based keys, and I give long-running work a timeout plus the ability to resume from saved artifacts.",
      "Once it's fixed, I rerun the failed test and the full pipeline, compare the duration and failure rate against past runs, and add monitoring or a regression test so the problem doesn't come back unnoticed.",
    ],
    tags: ['jenkins', 'plugins', 'troubleshooting'],
  },
  {
    id: 'itv-myjen-31',
    level: 'intermediate',
    kind: 'scenario',
    prompt: 'How do you troubleshoot Jenkins jobs failing due to missing dependencies?',
    probing:
      'Whether you fix missing-dependency failures with versioned, containerised agents instead of hand-installing tools.',
    answer: [
      'Check agent environment → Install required tools via Docker image or Ansible → Use containerized build agents for consistency.',
      '**Detailed interview approach:** When a stage fails, I save its console output, test reports, agent identity, commit, and parameters right away, along with anything that changed recently in the pipeline or tools. Then I work out what kind of failure it is: a real code problem, a lost agent, a dependency outage, a timeout, resource pressure, or a flaky shared test.',
      "I reproduce the failure on the same versioned agent image with the same credentials scope. I add temporary, focused debug output and fix the actual cause instead of just adding more retries. Where stages don't depend on each other, I run them in parallel. I cache dependencies using checksum-based keys, and I give long-running work a timeout plus the ability to resume from saved artifacts.",
      "Once it's fixed, I rerun the failed test and the full pipeline, compare the duration and failure rate against past runs, and add monitoring or a regression test so the problem doesn't come back unnoticed.",
    ],
    tags: ['jenkins', 'dependencies', 'agents'],
  },
  {
    id: 'itv-myjen-32',
    level: 'intermediate',
    kind: 'open',
    prompt: 'How do you integrate Jenkins with monitoring?',
    probing:
      'Whether you expose Jenkins metrics and alert on SLO-style signals like failures and slow builds.',
    answer: [
      'Use Jenkins Prometheus plugin → Send metrics to Grafana → Alert on pipeline failures/slow builds.',
      '**Detailed interview approach:** I start by defining what actually matters for the service: availability, latency, error rate, traffic volume, how close each resource is running to its limit, and the key business outcomes. Then I collect metrics, structured logs, and traces that all share the same service, environment, version, and request IDs, so they can be correlated.',
      'Dashboards show both the symptoms and the dependencies behind them. Alerts are based on service-level objectives and route out with severity, ownership, and a runbook attached.',
      "As things scale up, I combine or downsample older metrics, sample traces intelligently instead of keeping everything, and apply hot/warm/cold log retention based on what's needed for debugging versus compliance. During an incident, I trace one request across every layer it touches and compare that timeline against recent deployments or config changes.",
      'I regularly check that alerts actually get delivered and that they clear once resolved, and I tune out noisy or unactionable alerts.',
    ],
    tags: ['jenkins', 'monitoring', 'prometheus'],
  },
  {
    id: 'itv-myjen-33',
    level: 'intermediate',
    kind: 'scenario',
    prompt: 'How do you troubleshoot Jenkins jobs failing randomly?',
    probing:
      'Whether you find the real cause of random failures rather than adding blanket retries.',
    answer: [
      'Check build logs → Verify network stability → Look for race conditions → Add retry logic.',
      '**Detailed interview approach:** When a stage fails, I save its console output, test reports, agent identity, commit, and parameters right away, along with anything that changed recently in the pipeline or tools. Then I work out what kind of failure it is: a real code problem, a lost agent, a dependency outage, a timeout, resource pressure, or a flaky shared test.',
      "I reproduce the failure on the same versioned agent image with the same credentials scope. I add temporary, focused debug output and fix the actual cause instead of just adding more retries. Where stages don't depend on each other, I run them in parallel. I cache dependencies using checksum-based keys, and I give long-running work a timeout plus the ability to resume from saved artifacts.",
      "Once it's fixed, I rerun the failed test and the full pipeline, compare the duration and failure rate against past runs, and add monitoring or a regression test so the problem doesn't come back unnoticed.",
    ],
    tags: ['jenkins', 'flaky', 'troubleshooting'],
  },
  {
    id: 'itv-myjen-34',
    level: 'intermediate',
    kind: 'open',
    prompt: 'How do you handle Jenkins credentials securely?',
    probing:
      'Whether you scope credentials tightly, inject them at runtime and rotate them through a vault.',
    answer: [
      'Store in Jenkins Credentials Manager → Inject at runtime → Rotate periodically → Integrate with Vault/Key Vault.',
      '**Detailed interview approach:** I secure the Jenkins UI itself with single sign-on and multi-factor login, role-based authorization, CSRF protection, TLS, and a private controller with patched core and plugins. I never run builds directly on the controller.',
      'Credentials live in the Jenkins credential store or an external vault, scoped to the smallest folder or job that actually needs them. Pipelines pull them in with `withCredentials`, avoid turning on shell tracing, and never paste secrets directly into command lines or build artifacts.',
      "Agents are short-lived, isolated, run as non-root where possible, and get a short-lived cloud identity instead of a long-lived key. If a secret still ends up in a log, masking isn't enough on its own. I treat it as a real exposure: revoke and rotate the secret, restrict or delete the logs that captured it where policy allows, check who accessed it, and fix the step that printed it.",
      'I also back up configuration and plugins regularly, and test that the backups actually restore.',
    ],
    tags: ['jenkins', 'credentials', 'vault'],
  },
  {
    id: 'itv-myjen-35',
    level: 'intermediate',
    kind: 'open',
    prompt: 'How do you optimize Jenkins job execution time and CI/CD pipelines in Jenkins?',
    probing: 'Whether you break pipeline time down by phase and optimise the actual bottleneck.',
    answer: [
      'Use pipeline libraries, parallelization, caching layers, and containerized builds with lightweight agents.',
      '**Detailed interview approach:** When a stage fails, I save its console output, test reports, agent identity, commit, and parameters right away, along with anything that changed recently in the pipeline or tools. Then I work out what kind of failure it is: a real code problem, a lost agent, a dependency outage, a timeout, resource pressure, or a flaky shared test.',
      "I reproduce the failure on the same versioned agent image with the same credentials scope. I add temporary, focused debug output and fix the actual cause instead of just adding more retries. Where stages don't depend on each other, I run them in parallel. I cache dependencies using checksum-based keys, and I give long-running work a timeout plus the ability to resume from saved artifacts.",
      "Once it's fixed, I rerun the failed test and the full pipeline, compare the duration and failure rate against past runs, and add monitoring or a regression test so the problem doesn't come back unnoticed.",
      'Use parallel stages, caching (e.g., Docker layers, Maven cache), and parameterized builds to save time.',
      '**Detailed interview approach:** I break total pipeline time down into queue time, checkout, dependency install, compile, test, scan, image build, and deployment, using Jenkins and Prometheus stage metrics to see where the time actually goes.',
      'If the delay is in the queue, that usually means more agent capacity or better labels are needed. If the delay is in execution, I look at running independent stages in parallel, running only the tests affected by a change, caching dependencies and Docker layers keyed off the lockfile, shrinking artifacts, or isolating tests so they run faster.',
      'I use versioned agents that come pre-built with the tools already installed and get thrown away after each job, and I use `stash` only for small amounts of data. Timeouts stop jobs from hanging forever, and I fix flaky tests directly instead of hiding them behind broad retry logic.',
      "I compare a clean-cache run against a warm-cache run, make sure running things in parallel doesn't overload a shared dependency, and track lead time and failure rate after making these changes.",
    ],
    tags: ['jenkins', 'optimization', 'performance'],
  },
  {
    id: 'itv-myjen-36',
    level: 'advanced',
    kind: 'open',
    prompt: 'How do you design disaster recovery for Jenkins?',
    probing:
      'Whether you can design Jenkins DR with IaC, backups, persistent storage and tested restores.',
    answer: [
      'Backup Jenkins home + configs to cloud storage → Use Infrastructure as Code to recreate Jenkins → Run Jenkins on Kubernetes with persistent storage.',
      "**Detailed interview approach:** I treat recovering the controller as a separate problem from keeping build capacity available. Jenkins controllers normally run active/passive — just running multiple replicas against the same home directory doesn't make them safe on its own.",
      "I keep configuration and pipelines as code, back up `JENKINS_HOME` on a regular schedule, record which plugin versions are running, protect credentials, and actually test restoring to a standby or new controller. Builds run on agents that get created fresh for each job and torn down afterward, so losing one agent isn't a big deal.",
      "If the controller crashes, I preserve the logs first, then restore or fail over using the documented storage or database procedure, reconnect the agents, and check that credentials, jobs, the queue, and webhooks all came back correctly. I keep watching the controller's JVM health, disk space, queue length, backup success, and how long recovery actually takes.",
    ],
    followUps: [
      'How would you rebuild the controller from scratch using code only?',
      'What must be restored before production deploys resume?',
    ],
    tags: ['jenkins', 'disaster recovery'],
  },
  {
    id: 'itv-myjen-37',
    level: 'intermediate',
    kind: 'scenario',
    prompt: 'How do you troubleshoot Jenkins “Out of Memory” errors?',
    probing:
      'Whether you know the usual causes of Jenkins out-of-memory errors: heap size, build history and artifacts on the controller.',
    answer: [
      'Increase JVM heap size (-Xmx), clean old builds, archive artifacts to external storage, add monitoring for Jenkins memory usage.',
      '**Detailed interview approach:** When a stage fails, I save its console output, test reports, agent identity, commit, and parameters right away, along with anything that changed recently in the pipeline or tools. Then I work out what kind of failure it is: a real code problem, a lost agent, a dependency outage, a timeout, resource pressure, or a flaky shared test.',
      "I reproduce the failure on the same versioned agent image with the same credentials scope. I add temporary, focused debug output and fix the actual cause instead of just adding more retries. Where stages don't depend on each other, I run them in parallel. I cache dependencies using checksum-based keys, and I give long-running work a timeout plus the ability to resume from saved artifacts.",
      "Once it's fixed, I rerun the failed test and the full pipeline, compare the duration and failure rate against past runs, and add monitoring or a regression test so the problem doesn't come back unnoticed.",
    ],
    tags: ['jenkins', 'memory', 'jvm'],
  },
  {
    id: 'itv-myjen-38',
    level: 'intermediate',
    kind: 'scenario',
    prompt: 'How do you debug a Jenkins job stuck on "Waiting for Executor" or stuck in the queue?',
    probing:
      'Whether you know why jobs wait for an executor and fix the right agent pool rather than adding controller executors.',
    answer: [
      'No free agents → Increase executors → Add agent nodes → Use Kubernetes dynamic agents.',
      '**Detailed interview approach:** I start by checking the queue reason, executor usage, node labels, offline status, and the controller and agent logs. A job can be stuck waiting because no agent matches its label, every executor is busy, a node has disconnected, a concurrency limit is in effect, or cloud-agent provisioning failed.',
      'I check `Manage Nodes`, queue and build metrics, agent pod or VM events, and network and credential health, then restore or scale the right agent pool. Adding more executors to the controller is not the fix.',
      'To stop this from happening again, I use agents that scale automatically and get created fresh for each job, set up alerts for capacity and queue time, use sensible labels and quotas, add health checks to agent images, apply timeouts, and keep long or privileged workloads separate from everything else.',
      'Check if Jenkins agents are available → Validate node labels → Check executor limits → Scale up agents if using Kubernetes/VMs.',
    ],
    tags: ['jenkins', 'queue', 'executors'],
  },
  {
    id: 'itv-myjen-39',
    level: 'intermediate',
    kind: 'open',
    prompt: 'How do you implement auto-scaling for Jenkins agents and scale Jenkins dynamically?',
    probing: 'Whether you use the Kubernetes plugin for on-demand pod agents and monitor capacity.',
    answer: [
      'Integrate Jenkins with Kubernetes plugin → Agents spin up as pods on demand → Auto-terminate after job completion.',
      '**Detailed interview approach:** I start by checking the queue reason, executor usage, node labels, offline status, and the controller and agent logs. A job can be stuck waiting because no agent matches its label, every executor is busy, a node has disconnected, a concurrency limit is in effect, or cloud-agent provisioning failed.',
      'I check `Manage Nodes`, queue and build metrics, agent pod or VM events, and network and credential health, then restore or scale the right agent pool. Adding more executors to the controller is not the fix.',
      'To stop this from happening again, I use agents that scale automatically and get created fresh for each job, set up alerts for capacity and queue time, use sensible labels and quotas, add health checks to agent images, apply timeouts, and keep long or privileged workloads separate from everything else.',
      'Integrate Jenkins with Kubernetes cloud plugin → Auto-create agents as pods → Terminate when idle.',
    ],
    tags: ['jenkins', 'autoscaling', 'kubernetes'],
  },
  {
    id: 'itv-myjen-40',
    level: 'advanced',
    kind: 'scenario',
    prompt:
      'Your Jenkins pipeline takes 45 minutes to complete. How would you troubleshoot and reduce the execution time?',
    probing:
      'Whether you find the slow stages first, then parallelise, cache, speed up agents and trim tests.',
    answer: [
      "My approach starts with analyzing where the pipeline spends most time using Jenkins **Stage View** or **Blue Ocean**. Then I optimize by parallelizing independent stages, caching dependencies, using faster ephemeral agents, and reusing artifacts. I also streamline tests and Docker builds, and ensure network dependencies are minimized. In real projects, I've reduced pipeline duration from 40+ minutes to under 15 by implementing these optimizations in Jenkins + Azure DevOps CI/CD.",
      'To reduce the execution time of a Jenkins pipeline that takes 45 minutes to complete, you can follow these strategies:',
      "1. **Analyze Pipeline Stages**: Use Jenkins' Stage View or Blue Ocean to identify which stages are taking the most time. Focus your optimization efforts on these bottlenecks.\n2. **Parallelize Independent Stages**: If there are stages that can run independently, configure them to run in parallel. This can significantly reduce overall execution time.\n3. **Use Caching**: Cache dependencies such as libraries, Docker layers, or build artifacts to avoid redundant downloads or builds in subsequent runs.\n4. **Optimize Build Agents**: Use faster or more powerful build agents. Consider using ephemeral agents that can be spun up quickly for each build.\n5. **Reuse Artifacts**: If certain build artifacts are reused across builds, avoid rebuilding them from scratch each time.\n6. **Streamline Tests**: Review your test suite to eliminate redundant or slow tests. Consider running only a subset of tests during the initial build and the full suite later.\n7. **Optimize Docker Builds**: If your pipeline involves building Docker images, use multi-stage builds and leverage Docker layer caching to speed up the process.\n8. **Minimize Network Dependencies**: Reduce reliance on external services or APIs during the build process, as network latency can add significant time.\n9. **Incremental Builds**: Implement incremental builds where only the changed components are rebuilt rather than the entire project.\n10. **Monitor and Iterate**: Continuously monitor pipeline performance and iterate on optimizations as needed.",
      'By applying these strategies, you can effectively reduce the execution time of your Jenkins pipeline from 45 minutes to under 15.',
      'Identify bottleneck stage → Enable parallel execution → Cache dependencies → Scale Jenkins agents horizontally.',
      '**Detailed interview approach:** When a stage fails, I save its console output, test reports, agent identity, commit, and parameters right away, along with anything that changed recently in the pipeline or tools. Then I work out what kind of failure it is: a real code problem, a lost agent, a dependency outage, a timeout, resource pressure, or a flaky shared test.',
      "I reproduce the failure on the same versioned agent image with the same credentials scope. I add temporary, focused debug output and fix the actual cause instead of just adding more retries. Where stages don't depend on each other, I run them in parallel. I cache dependencies using checksum-based keys, and I give long-running work a timeout plus the ability to resume from saved artifacts.",
      "Once it's fixed, I rerun the failed test and the full pipeline, compare the duration and failure rate against past runs, and add monitoring or a regression test so the problem doesn't come back unnoticed.",
    ],
    code: [
      {
        title: 'Parallel test stages',
        language: 'text',
        code: `stage('Parallel Testing') {
  parallel {
    stage('Unit Tests') {
      steps {
        sh 'pytest tests/unit/'
      }
    }
    stage('Integration Tests') {
      steps {
        sh 'pytest tests/integration/'
      }
    }
  }
}`,
      },
    ],
    followUps: [
      'How would you cache Maven or npm dependencies on ephemeral agents?',
      'Which tests would you move out of the commit-stage path?',
    ],
    tags: ['jenkins', 'performance', 'optimization'],
  },
  {
    id: 'itv-myjen-41',
    level: 'intermediate',
    kind: 'open',
    prompt: 'How do you secure Jenkins from unauthorized access?',
    probing:
      'Whether you lock down Jenkins with SSO, RBAC, no anonymous access, TLS and audit logs.',
    answer: [
      'Enable RBAC → Integrate with LDAP/SSO → Restrict anonymous access → Enable audit logs → Run Jenkins behind reverse proxy (NGINX).',
      '**Detailed interview approach:** I secure the Jenkins UI itself with single sign-on and multi-factor login, role-based authorization, CSRF protection, TLS, and a private controller with patched core and plugins. I never run builds directly on the controller.',
      'Credentials live in the Jenkins credential store or an external vault, scoped to the smallest folder or job that actually needs them. Pipelines pull them in with `withCredentials`, avoid turning on shell tracing, and never paste secrets directly into command lines or build artifacts.',
      "Agents are short-lived, isolated, run as non-root where possible, and get a short-lived cloud identity instead of a long-lived key. If a secret still ends up in a log, masking isn't enough on its own. I treat it as a real exposure: revoke and rotate the secret, restrict or delete the logs that captured it where policy allows, check who accessed it, and fix the step that printed it.",
      'I also back up configuration and plugins regularly, and test that the backups actually restore.',
    ],
    tags: ['jenkins', 'security', 'rbac'],
  },
  {
    id: 'itv-myjen-42',
    level: 'intermediate',
    kind: 'open',
    prompt: 'How do you optimize Docker build speed in Jenkins pipelines?',
    probing:
      'Whether you speed up Docker builds with layer caching, multi-stage builds and a nearby registry.',
    answer: [
      'Use caching layers → Multi-stage builds → Use local/private registry for faster pulls.',
      "**Detailed interview approach:** I look at the image, the runtime configuration, and the host separately. Builds use multi-stage Dockerfiles, small and trusted pinned base images, a `.dockerignore` file, dependency caching ordered so it's reused effectively, and non-root users at runtime.",
      "CI scans the dependencies and the image, generates a software bill of materials, signs the final image digest — which never changes once it's built — and pushes it over TLS to a registry that only grants the access it needs. Deployment then verifies that exact digest.",
      'At runtime I drop unnecessary Linux capabilities, use seccomp/AppArmor/SELinux, mount the filesystem read-only, set resource limits, avoid giving containers access to the privileged Docker socket, and restrict networking.',
      'If a build is slow to start or push fails, I measure layer size and cache hits, registry DNS/auth/TLS, disk space, and application startup time instead of just retrying it. I rebuild from patched base images and re-check functionality and security findings before moving on.',
    ],
    tags: ['jenkins', 'docker', 'build speed'],
  },
  {
    id: 'itv-myjen-43',
    level: 'advanced',
    kind: 'open',
    prompt: 'How do you implement High Availability (HA) Jenkins?',
    probing:
      'Whether you know Jenkins HA really means backup, warm standby and ephemeral agents, not replicas on shared storage.',
    answer: [
      'Run Jenkins on Kubernetes with persistent volume → Use multiple replicas with HA proxy → Backup Jenkins home regularly.',
      "**Detailed interview approach:** I treat recovering the controller as a separate problem from keeping build capacity available. Jenkins controllers normally run active/passive — just running multiple replicas against the same home directory doesn't make them safe on its own.",
      "I keep configuration and pipelines as code, back up `JENKINS_HOME` on a regular schedule, record which plugin versions are running, protect credentials, and actually test restoring to a standby or new controller. Builds run on agents that get created fresh for each job and torn down afterward, so losing one agent isn't a big deal.",
      "If the controller crashes, I preserve the logs first, then restore or fail over using the documented storage or database procedure, reconnect the agents, and check that credentials, jobs, the queue, and webhooks all came back correctly. I keep watching the controller's JVM health, disk space, queue length, backup success, and how long recovery actually takes.",
    ],
    traps: [
      'Running several controller replicas against the same JENKINS_HOME does not make Jenkins highly available - controllers normally run active/passive.',
    ],
    followUps: [
      'What does CloudBees or a warm standby add over plain backup and restore?',
      'How do you measure your real recovery time?',
    ],
    tags: ['jenkins', 'high availability'],
  },
  {
    id: 'itv-myjen-44',
    level: 'advanced',
    kind: 'open',
    prompt: 'How do you perform blue-green deployment using Jenkins + Kubernetes?',
    probing:
      'Whether you can run blue-green on Kubernetes from Jenkins with a service or ingress switch and a kept rollback.',
    answer: [
      'Jenkins pipeline deploys Green → Run tests → Switch traffic to Green (via service or ingress) → Keep Blue as rollback option.',
      "**Detailed interview approach:** I deploy one artifact that never changes after it's built, using a strategy that matches the risk: rolling updates for routine stateless changes, canary releases when I want to expose the change gradually and watch metrics, or blue-green when I need to switch traffic instantly.",
      'The pipeline runs prechecks, deploys to a small or no-traffic target first, runs readiness and real business smoke tests, then gradually shifts more traffic over while watching error rate, latency, resource saturation, and the SLO/error budget.',
      "If any of those thresholds are breached, it stops sending traffic and rolls back to the previous artifact or config. Database changes need to expand first and contract later, in separate steps, because rolling back the application can't undo a destructive schema change. Afterward I confirm the service actually recovered, record what happened, and improve whichever test or guard should have caught the problem earlier.",
    ],
    followUps: [
      'How do you switch traffic between blue and green in Kubernetes?',
      'When do you tear down the old colour?',
    ],
    tags: ['jenkins', 'blue-green', 'kubernetes'],
  },
  {
    id: 'itv-myjen-45',
    level: 'basic',
    kind: 'open',
    prompt: 'How do you integrate Jenkins with GitHub?',
    probing:
      'Whether you know the basic GitHub webhook to Jenkins setup and how multibranch jobs report status back.',
    answer: [
      'Configure GitHub webhook → Connect Jenkins job to repo → Trigger builds automatically on code push/PR.',
      '**Detailed interview approach:** I keep a declarative `Jenkinsfile` in the application repository, so pipeline changes go through the same review and history as any other code change.',
      "Behavior that's shared and well-tested — checkout, quality checks, security scans, publishing artifacts, deployment, notifications — lives in a versioned Jenkins Shared Library. Each service repository passes in explicit inputs rather than copying Groovy code around.",
      'Multibranch jobs discover branches and pull requests through authenticated GitHub webhooks and report status back to the commit. I pin tool and agent image versions, protect the library and main branches, sandbox untrusted pull requests, and keep GitHub and Jenkins credentials tightly scoped.',
      'I test a shared library upgrade in a sample pipeline before rolling it out by version. I limit manual UI edits and replays, or reconcile them back into Git, so everything stays auditable.',
    ],
    tags: ['jenkins', 'github', 'webhooks'],
  },
  {
    id: 'itv-myjen-46',
    level: 'basic',
    kind: 'scenario',
    prompt: 'What will you do if a Jenkins pipeline fails?',
    probing: 'Whether you have a clear first-response routine for a failed Jenkins pipeline.',
    answer: [
      'Check Jenkins logs → Identify stage of failure → Fix configuration/code issue → Re-run the pipeline. If infra-related, verify Terraform or Kubernetes changes before redeploying.',
      '**Detailed interview approach:** When a stage fails, I save its console output, test reports, agent identity, commit, and parameters right away, along with anything that changed recently in the pipeline or tools. Then I work out what kind of failure it is: a real code problem, a lost agent, a dependency outage, a timeout, resource pressure, or a flaky shared test.',
      "I reproduce the failure on the same versioned agent image with the same credentials scope. I add temporary, focused debug output and fix the actual cause instead of just adding more retries. Where stages don't depend on each other, I run them in parallel. I cache dependencies using checksum-based keys, and I give long-running work a timeout plus the ability to resume from saved artifacts.",
      "Once it's fixed, I rerun the failed test and the full pipeline, compare the duration and failure rate against past runs, and add monitoring or a regression test so the problem doesn't come back unnoticed.",
    ],
    tags: ['jenkins', 'pipeline failure'],
  },
  {
    id: 'itv-myjen-47',
    level: 'intermediate',
    kind: 'scenario',
    prompt: 'How do you roll back in Jenkins if a deployment causes issues?',
    probing:
      'Whether you roll back to the last known-good digest with platform rollback, not by rebuilding an old branch.',
    answer: [
      'Keep artifact versioning → Redeploy the last stable build from Jenkins → Or trigger rollback pipeline.',
      '**Detailed interview approach:** The pipeline keeps a record of the last known-good artifact and its exact digest, plus the deployment configuration that went with it.',
      "If health checks or SLOs fail after a deploy, the pipeline stops promoting and triggers the platform's own rollback — a Helm rollback, a Kubernetes rollout undo, or a traffic switch — rather than rebuilding from an old branch.",
      "I confirm readiness, error rate, latency, and that a real business transaction still works, then send a notification with the failed commit and the recovery result. Database and schema changes have to stay backward-compatible, because rolling back the application alone can't undo a schema change.",
      "Automatic rollback has a timeout and a manual fallback in case it doesn't finish cleanly. Once things are stable, I preserve the evidence and fix whatever test, health probe, configuration, or capacity guard should have caught the problem first.",
    ],
    tags: ['jenkins', 'rollback'],
  },
]
