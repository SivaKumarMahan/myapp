import type { InterviewQuestion } from '../../../types'

/** Behavioural, leadership, process and interview-preparation questions. */
export const myGeneralBehavioralQuestions: InterviewQuestion[] = [
  {
    id: 'itv-mygen-1',
    level: 'advanced',
    kind: 'open',
    prompt: 'How do you handle resistance while adopting new DevOps tools and practices?',
    probing:
      'Change leadership: whether you treat resistance as information, pilot with evidence, and keep mandatory controls transparent.',
    answer: [
      'First I try to understand the concern instead of just labeling it resistance. People might worry about losing control, production risk, poor documentation, extra work, or a tool that was picked without asking them.',
      'I tie the change to a real, measurable problem — slow feedback, repeated incidents, too much manual effort, or gaps in audits — and bring in people from development, operations, security, and support to help define requirements and what success looks like.',
      "I run a small pilot on one willing service, provide a ready-made template, help with migration, offer training and office hours, and make sure there's a rollback path. Then I share real evidence: deployment time, failure rate, recovery time, manual toil, and what developers actually think of it.",
      'If an objection is valid, it changes the design. If a control is mandatory for security or compliance, I explain that clearly and give an exception process, rather than just hiding it behind the tool.',
      'Adoption happens in phases, ownership and support stay clear, and I only retire the old way once the new one is proven reliable. That builds trust through actual results, not a big migration announcement.',
    ],
    followUps: [
      'Tell me about a specific tool you introduced and the metric that proved it worked.',
      'What do you do when a senior engineer keeps bypassing the new process?',
    ],
    tags: ['behavioral', 'change management', 'leadership'],
  },
  {
    id: 'itv-mygen-2',
    level: 'intermediate',
    kind: 'open',
    prompt:
      'How should you answer "Have you worked in production, and what responsibilities did you handle?"',
    probing: 'Credibility and specificity about your real production role.',
    answer: [
      'I answer honestly, using one concrete service or platform.',
      "I explain what it's for, its scale and availability expectations, the components I owned, the delivery and on-call process, and the actual work I did — for example, reviewing Terraform plans, running Jenkins pipelines, Kubernetes releases, monitoring, incident triage, backup tests, access reviews, and validating things after deployment.",
      "I'm clear about what I did myself versus what was led by the database, network, or security teams.",
      "Then I walk through one real change or incident — the situation, the evidence, the action, and the result — including commands or dashboards where they're useful, the risk and rollback plan, how I communicated, and a measurable outcome.",
      'If my production access was limited, I say so plainly, and explain how I still contributed — through lower environments, approved pipelines, observing, or pairing on changes. Being credible matters more than claiming to own everything.',
    ],
    tags: ['behavioral', 'production', 'experience'],
  },
  {
    id: 'itv-mygen-3',
    level: 'intermediate',
    kind: 'open',
    prompt: 'How do you answer a question about the business domain you worked in?',
    probing:
      'Whether you connect the domain to engineering constraints without leaking confidential detail.',
    answer: [
      'I name the actual domain — banking, insurance, retail, healthcare, SaaS, or whatever it was — and connect it to the engineering constraints it created.',
      'For example, banking tends to emphasize transaction integrity, audit evidence, separation of duties, data protection, recovery, change approvals, and low-risk releases. Retail tends to emphasize seasonal scaling and protecting payment and customer data.',
      'I explain the application flow and my responsibilities without giving away confidential customer, architecture, or incident details. I mention the standards and controls I actually used, how they shaped CI/CD, infrastructure, monitoring, access, retention, and disaster recovery, and one concrete outcome.',
      "If I haven't worked in the interviewer's domain, I say so directly and map my experience to what's relevant, rather than making something up.",
    ],
    tags: ['behavioral', 'domain'],
  },
  {
    id: 'itv-mygen-4',
    level: 'advanced',
    kind: 'open',
    prompt:
      'Tell me about the most challenging production incident you handled and what improved afterward.',
    probing:
      'Structured storytelling, evidence-based diagnosis, honest ownership and lasting prevention.',
    answer: [
      'I use a real incident and walk through it: situation, task, evidence, action, result, and what we did to prevent it happening again. For example: after a deployment, checkout latency and 5xx errors rose across several services.',
      'I state the customer impact and my role, then explain how metrics pinpointed the start time, traces showed retries piling up against a slow database call, and deployment history linked it to a query or config change.',
      'I describe stabilizing things first — pausing the rollout, reverting the change, limiting retries, and communicating impact and timing to stakeholders — then the targeted investigation and verification that followed.',
      "I'm clear about what I did myself versus what other people owned, and I give a measurable recovery, like latency dropping from two seconds back to normal within a stated time. I don't claim a perfect solo save, and I don't share confidential details.",
      'The strongest part of the answer is what changed afterward: query and load tests, canary SLO gates, limits on retries, dashboards for connection pools, dependency runbooks, and a game-day test. I also mention any mistake I made or signal I missed, and what I learned from it.',
      'This shows judgment, teamwork, evidence-based thinking, communication, and a lasting improvement — not just a list of commands I ran.',
    ],
    followUps: ['What signal did you miss, and how would you catch it earlier now?'],
    tags: ['behavioral', 'incident', 'star'],
  },
  {
    id: 'itv-mygen-5',
    level: 'intermediate',
    kind: 'scenario',
    prompt: 'Tell me about a time a production server went down. What did you do first?',
    probing: 'Whether you stabilise and communicate before deep investigation.',
    answer: [
      'I use a real example and start with impact and safety: declare the incident, confirm which users and how much was affected, pause any risky changes, and either lead or join an incident channel.',
      'I check recent changes, health signals, and the fastest safe way to stabilize things — rollback, failover, shifting traffic, or scaling — before digging into a deep investigation.',
      "I explain what I personally did, how I kept stakeholders updated, how we verified recovery, and what preventive step came out of it afterward. I'm careful not to imply I worked alone or that I owned more of production than I actually did.",
    ],
    tags: ['behavioral', 'incident'],
  },
  {
    id: 'itv-mygen-6',
    level: 'advanced',
    kind: 'scenario',
    prompt: 'Three servers report issues simultaneously. How do you prioritize?',
    probing: 'Impact-based triage and spotting a shared root cause.',
    answer: [
      'I prioritize by customer impact, risk to security or data integrity, how much SLO budget is burning, how widespread it is, and whether the alerts share a common dependency — not just by the order the pages came in. If a shared cause looks likely, I treat it as one incident, assign owners, stabilize the highest-impact service first, and suppress the alert noise coming from the same root cause.',
      'I keep a timeline going and communicate scope and the next update time. Afterward, I confirm each service is healthy and fix the dependency mapping, alert grouping, or capacity/runbook gaps that made the simultaneous failure harder to deal with.',
    ],
    followUps: ['How would you know the three alerts share a dependency?'],
    tags: ['behavioral', 'incident', 'prioritization'],
  },
  {
    id: 'itv-mygen-7',
    level: 'intermediate',
    kind: 'open',
    prompt: 'Describe a time you introduced an infrastructure failure. What changed afterward?',
    probing: 'Accountability and whether a real control came out of the mistake.',
    answer: [
      'I use a real example and take clear ownership of my part. I explain the change, the safety checks that existed (or were missing), the impact it caused, how I helped fix it, and how I communicated about it without hiding the mistake.',
      "Then I describe the lasting improvement that came out of it — for example, a check that the deployed artifact hasn't changed, a peer-reviewed Terraform plan, a narrower rollout, a better alarm, a tested rollback, or a new runbook.",
      "The point isn't to tell a dramatic story about failure — it's to show accountability, staying calm during the incident, and a real control that keeps it from happening again.",
    ],
    tags: ['behavioral', 'accountability'],
  },
  {
    id: 'itv-mygen-8',
    level: 'basic',
    kind: 'open',
    prompt: 'What is the STAR method and why use it for behavioural answers?',
    probing: 'Whether you have a structure for behavioural answers.',
    answer: [
      'Use the **STAR** method (Situation, Task, Action, Result) with concrete, quantified examples.',
      'A clear structure for a technical story is: context and scale, your responsibility, the symptoms and evidence, how you investigated, the decision and fix, how you verified it, how you prevented it recurring, and a measurable result. "We restarted it" is a weak answer.',
    ],
    tags: ['behavioral', 'star'],
  },
  {
    id: 'itv-mygen-9',
    level: 'intermediate',
    kind: 'open',
    prompt: 'Tell me about a conflict with a team member — how did you resolve it?',
    probing: 'Empathy, data over ego, and a positive outcome.',
    answer: [
      'Describe a real disagreement (e.g. over an architecture choice), how you listened to understand their view, focused on data/shared goals rather than ego, sought common ground or escalated appropriately, and the positive outcome (decision made, relationship intact).',
      'Emphasize empathy, communication, and putting the project first.',
    ],
    tags: ['behavioral', 'conflict', 'teamwork'],
  },
  {
    id: 'itv-mygen-10',
    level: 'intermediate',
    kind: 'open',
    prompt: 'How do you handle disagreement about a cloud design?',
    probing: 'Turning opinions into measurable criteria and a documented decision.',
    answer: [
      'I start by restating the shared goal and constraints, then turn assumptions into measurable things: availability, security, latency, compliance, delivery time, cost, and ownership. I compare each option in a short decision record or a POC.',
      "I listen for requirements I might have missed, bring in whoever owns security, network, or the application, and make sure I'm disagreeing with the design, not the person. If we can't reach consensus, the person who owns the decision picks, with the trade-offs written down clearly.",
      "After it's built, I look at real metrics, and I'll change the decision if the evidence shows it was wrong.",
    ],
    tags: ['behavioral', 'conflict', 'architecture'],
  },
  {
    id: 'itv-mygen-11',
    level: 'intermediate',
    kind: 'open',
    prompt: 'How do you mentor junior engineers? Give a specific example.',
    probing: 'Concrete mentoring practice and growing autonomy.',
    answer: [
      'Give a concrete instance: paired on a task, set incremental goals, did code reviews as teaching moments, encouraged ownership of a small project, and shared resources. Show the outcome (they grew into owning X).',
      'Emphasize patience, psychological safety, and gradually increasing autonomy.',
    ],
    tags: ['behavioral', 'mentoring', 'leadership'],
  },
  {
    id: 'itv-mygen-12',
    level: 'intermediate',
    kind: 'open',
    prompt: 'What ideas have you given to improve deployments?',
    probing: 'Real improvements with measurable impact.',
    answer: [
      'Give real examples: introduced GitOps/Argo CD, added canary deploys to reduce incidents, automated a manual release step (saved N hours), added pre-deploy scanning, or created reusable pipeline templates.',
      'State the measurable impact (faster/safer deploys, fewer rollbacks).',
    ],
    tags: ['behavioral', 'deployments', 'improvement'],
  },
  {
    id: 'itv-mygen-13',
    level: 'basic',
    kind: 'open',
    prompt: 'How do you stay updated with new technologies and trends?',
    probing: 'Genuine learning habits, ideally hands-on.',
    answer: [
      "Blogs and docs (AWS/CNCF/Kubernetes), newsletters (DevOps'ish, KubeWeekly), conferences/talks (KubeCon, re:Invent), hands-on labs/POCs in a sandbox, communities (Reddit, HackerNews, CNCF Slack), certifications, and following release notes.",
      'Emphasize learning by building.',
    ],
    tags: ['behavioral', 'learning'],
  },
  {
    id: 'itv-mygen-14',
    level: 'intermediate',
    kind: 'open',
    prompt: 'How do you approach learning, evaluating and adopting a new tool?',
    probing: 'Problem-first evaluation, a realistic POC and incremental rollout.',
    answer: [
      "First I figure out what problem the tool is actually supposed to solve, then learn its architecture, security model, and normal failure modes from the official docs. I compare alternatives on maturity, community, security, integration, operational burden, cost, and how well it fits the team's skills, then build a time-boxed proof of concept in a sandbox or on a non-critical workload.",
      'The POC covers deployment, observability, upgrades, backup and recovery, and at least one failure scenario — not just a happy-path demo. I write up the results, get feedback and team buy-in, roll it out gradually with clear success criteria and a rollback plan, and share a small runbook or reusable example.',
      'Avoid shiny-object adoption — solve an actual pain point.',
    ],
    tags: ['behavioral', 'learning', 'tool evaluation'],
  },
  {
    id: 'itv-mygen-15',
    level: 'basic',
    kind: 'open',
    prompt: 'How good are you at Linux, Python, or AI in DevOps? (rating questions)',
    probing: 'Honest self-assessment backed by evidence.',
    answer: [
      'Answer honestly with evidence. Give a number and justify it.',
      '**Linux/Python:** "Strong — daily shell scripting, automation, troubleshooting; Python for tooling, boto3 automation, and data parsing." **AI in DevOps (Copilot):** "I use GitHub Copilot/Claude for boilerplate, test generation, and speeding up scripts, while reviewing all output for correctness and security."',
    ],
    tags: ['behavioral', 'self-assessment'],
  },
  {
    id: 'itv-mygen-16',
    level: 'advanced',
    kind: 'open',
    prompt: 'How do you enforce standards while still meeting team needs?',
    probing: 'Platform thinking: paved roads, scoped exceptions and feedback loops.',
    answer: [
      "I build a supported paved road: versioned modules, pipeline templates, policies, examples, and self-service automation, with secure defaults and room to extend it. Hard controls protect the things that really can't be compromised, and any legitimate exception is scoped, approved, owned by someone, and set to expire.",
      'I track adoption, exceptions, failure rate, and what developers actually think. If a team keeps bypassing a standard, I look into whether the control is unclear or the platform is just missing something they genuinely need, instead of just adding more restrictions.',
    ],
    followUps: ['Give an example of an exception you approved and how it expired.'],
    tags: ['behavioral', 'platform engineering', 'governance'],
  },
  {
    id: 'itv-mygen-17',
    level: 'advanced',
    kind: 'open',
    prompt: 'What is chaos engineering and how would you use it in production?',
    probing: 'Hypothesis-driven experiments with a controlled blast radius.',
    answer: [
      '**Chaos engineering** means deliberately injecting failures — killing pods, adding latency, dropping network traffic, exhausting CPU, simulating the loss of a whole availability zone — to prove the system is resilient and find weaknesses before a real outage does.',
      '**Practice:** form a hypothesis (like "the system stays healthy if we lose an AZ"), define a metric for normal, healthy behavior, run the experiment starting in staging, keep the blast radius small, monitor closely, and roll back automatically if things get worse. Tools: Chaos Mesh, LitmusChaos, Gremlin, AWS FIS.',
      "**In production:** run it carefully — small blast radius, off-peak hours, strong observability, an abort switch, and stakeholders who know it's happening (GameDays). The goal is real confidence in how the system holds up.",
      'A chaos experiment needs a hypothesis, a small blast radius, clear abort conditions, observability, an owner, and a rollback plan.',
    ],
    followUps: ['What abort condition would you set for an AZ-loss experiment?'],
    tags: ['chaos engineering', 'sre', 'reliability'],
  },
  {
    id: 'itv-mygen-18',
    level: 'intermediate',
    kind: 'open',
    prompt: 'How do you manage and prioritize ServiceNow tasks?',
    probing: 'Impact-times-urgency triage and reducing recurring toil.',
    answer: [
      "Prioritize by impact times urgency (ServiceNow's priority matrix), SLA deadlines, and business criticality: production-impacting incidents (P1/P2) first, then anything at risk of breaching its SLA, then routine changes and requests.",
      'I triage the queue, acknowledge tasks and communicate realistic ETAs, group similar tasks together, escalate blockers, follow change-management for production changes, and document how each one was resolved.',
      'I try to balance firefighting with actually reducing the recurring tickets through automation.',
    ],
    tags: ['process', 'servicenow', 'prioritization'],
  },
  {
    id: 'itv-mygen-19',
    level: 'basic',
    kind: 'open',
    prompt: 'How do you introduce yourself and describe your daily work and technology stack?',
    probing: 'A tailored, credible 60–90 second introduction with one measurable result.',
    answer: [
      'Do not recite a generic biography. Give a 60–90 second answer tailored to your real experience, following the structure in the sample.',
      "A credible day-to-day answer can cover reviewing pull requests and pipeline results, building or promoting artifacts that don't change once built, changing Terraform through reviewed plans, supporting Kubernetes/EC2 deployments, investigating alerts and incidents, improving dashboards and runbooks, patching vulnerabilities, controlling cloud cost, and coordinating releases.",
      'Mention only tools and responsibilities you have actually used, and distinguish personal work from team ownership.',
      'Describe the application stack in layers: client/frontend, API or Java framework, synchronous and asynchronous integration, database/cache, build tool, artifact/container registry, compute platform, CI/CD, IaC, secrets, and observability. Replace the placeholders with your real stack rather than claiming all of them.',
      'When asked which cloud, CI/CD tool, or services you use, lead with the primary platform and workflow, then name services by purpose. Explain one real deployment or incident to demonstrate depth instead of presenting a long product list.',
    ],
    code: [
      {
        title: 'Introduction structure',
        language: 'text',
        code: `current role and years of relevant experience
-> product/domain and scale
-> cloud and application stack
-> your ownership across CI/CD, IaC, containers, Kubernetes and operations
-> one measurable reliability, delivery, security or cost result`,
      },
      {
        title: 'Example stack (replace with your own)',
        language: 'text',
        code: `React -> Java/Spring Boot REST services -> PostgreSQL/Redis/Kafka
Maven -> Docker/ECR -> EC2 or EKS
Jenkins/GitHub Actions -> Terraform -> CloudWatch/Prometheus/Grafana`,
      },
    ],
    tags: ['introduction', 'interview prep'],
  },
  {
    id: 'itv-mygen-20',
    level: 'intermediate',
    kind: 'open',
    prompt:
      'What foundations should you be able to explain in a DevOps interview (Linux, Git, CI/CD, cloud)?',
    probing: 'Breadth of fundamentals and architect-level thinking about cloud.',
    answer: [
      '**Foundations:** be able to explain and troubleshoot Linux processes, `systemd`, memory, disk I/O, permissions, TCP/UDP, DNS, and routing. For Git, explain branching, merge conflicts, rebase, rollback, protected branches, and release tags. For CI/CD, describe why a stage failed, how you investigated it, and how the fix prevented recurrence.',
      '**Cloud and infrastructure:** think like an architect, not a list of services. Be ready to compare compute scaling and spot/serverless trade-offs, database failover and cache eviction, how object storage actually behaves, VPC/VNet design, NAT and DNS latency, giving IAM only the access it needs, WAF controls, secret management, availability, disaster recovery, and cost.',
      'Also be ready to map equivalent AWS, Azure, and GCP services and explain the differences that actually matter.',
    ],
    tags: ['interview prep', 'fundamentals'],
  },
  {
    id: 'itv-mygen-21',
    level: 'intermediate',
    kind: 'open',
    prompt:
      'What Kubernetes and microservices-on-Kubernetes topics should you be ready to explain?',
    probing:
      'Whether you can trace a request through Kubernetes networking and design a production microservice setup.',
    answer: [
      '**Kubernetes and containers:** explain the pod lifecycle, `kubelet`, how the scheduler decides, controllers, networking, DNS, Services, Ingress, storage, probes, scaling, and security.',
      'For a scenario like "the pod is Running but the application is unreachable," trace it through: DNS, then ingress/load balancer, then Service, then EndpointSlice, then pod readiness and the listening port.',
      'Compare HPA, VPA, event-driven scaling, and node autoscaling, and know when each one is the wrong choice.',
      '**Microservices on Kubernetes:** a production design should think about service boundaries and separate data ownership, small non-root container images, ConfigMaps and external secrets, Deployments, Services, Ingress or the Gateway API, environment overlays, TLS, authentication, autoscaling, probes, RBAC, NetworkPolicies, image signing and scanning, and centralized logs, metrics, and traces. Only add a service mesh once its traffic, identity, or monitoring features are worth the extra operational work.',
    ],
    tags: ['interview prep', 'kubernetes', 'microservices'],
  },
  {
    id: 'itv-mygen-22',
    level: 'advanced',
    kind: 'open',
    prompt:
      'What do senior interviews test on reliability, root-cause analysis and the modern operations mindset?',
    probing:
      'Investigating when dashboards are green but users fail, and the monitoring versus observability distinction.',
    answer: [
      'Senior interviews test what you do when the dashboards look healthy but users are still failing. Follow one real request end-to-end, and compare logs, metrics, traces, deploy events, dependency health, DNS, identity, and network paths.',
      'A partial Terraform apply or database replication lag needs a recovery that protects state and data — not a blind retry.',
      "**Modern operations mindset:**\n- **GitOps and platform engineering** focus on a reviewed desired state, continuously reconciling the live system to match it, safe self-service, and guardrails.\n- **Monitoring** reports the signals you already know to watch for. **Observability** helps you investigate failures you didn't anticipate, by correlating metrics, logs, and traces.\n- **Deployment engineering** means progressive delivery, health gates, rollback, and database compatibility — not just running `kubectl apply`.\n- **Production failures** can come from `kubelet`, CoreDNS, gaps in monitoring data, certificates, identity, or a dependency — even while the high-level dashboard still looks green.",
      '**Storytelling and impact:** a strong answer sounds like: "We correlated 502 errors with a readiness-probe change, corrected the thresholds, rolled back safely, load-tested the fix, and cut peak error rate by 40%." Be honest about your actual role and only use numbers you can defend if asked.',
    ],
    followUps: ['Dashboards are green but users report failures — where do you start?'],
    tags: ['interview prep', 'sre', 'observability'],
  },
  {
    id: 'itv-mygen-23',
    level: 'basic',
    kind: 'open',
    prompt: 'What topics belong on a cross-topic DevOps interview practice checklist?',
    probing: 'Coverage of the full DevOps surface area.',
    answer: [
      '**CI/CD and delivery:**\n- Jenkins, GitHub Actions, GitLab CI, and Azure Pipelines\n- Build-once and environment promotion from Dev to QA to Production\n- Blue-green, canary, rolling, rollback, and zero-downtime deployment\n- Artifact repositories and Docker images that never change once built\n- GitOps with Argo CD and Flux',
      '**Infrastructure as Code:**\n- Terraform modules, remote state, locking, import, drift, and partial-apply recovery\n- Bicep, CloudFormation, and Pulumi fundamentals\n- Policy as code with OPA, Sentinel, and cloud policies\n- Multi-cloud boundaries and secret management',
      '**Containers and orchestration:**\n- Docker networking and multi-stage builds\n- Kubernetes control plane, nodes, workloads, Services, Ingress, configuration, storage, autoscaling, namespaces, and RBAC\n- Helm charts, Kustomize, Operators, and service mesh',
      '**Monitoring, logging, and reliability:**\n- Prometheus, Grafana, Loki, ELK/OpenSearch, Jaeger, and OpenTelemetry\n- Metrics vs. logs vs. traces\n- SLI, SLO, SLA, error budgets, capacity, and actionable alerting\n- Incident command, runbooks, blameless reviews, chaos testing, backup, and disaster recovery',
      "**Cloud, networking, and security:**\n- VPC/VNet, subnets, routing, NAT, load balancers, peering, DNS, and private endpoints\n- IAM access limited to only what's needed, workload identity, certificate and secret rotation\n- Container/runtime and software-supply-chain security\n- SAST, DAST, dependency, secret, IaC, and image scanning\n- Audit logging, compliance evidence, and cost optimization",
      '**Automation:**\n- Bash text processing and safe error handling\n- Python or Go automation\n- Package managers, message queues, API gateways, and operational APIs',
    ],
    tags: ['interview prep', 'checklist'],
  },
]
