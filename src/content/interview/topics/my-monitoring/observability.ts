import type { InterviewQuestion } from '../../../types'

/** Observability fundamentals, SLO alerting and APM. */
export const myMonitoringObservabilityQuestions: InterviewQuestion[] = [
  {
    id: 'itv-mymon-1',
    level: 'basic',
    kind: 'open',
    prompt:
      'What is the difference between monitoring and observability, and what are the main signals?',
    probing:
      'Whether you can define observability beyond dashboards and explain metrics, logs, traces and profiles.',
    answer: [
      "**Monitoring** checks known conditions using predefined metrics, dashboards and alerts. **Observability** is broader: it's the ability to understand what's happening inside a system just from its outputs, including behavior nobody predicted when the dashboards were built.",
      'The main signals are:',
      '- **Metrics:** numeric time series that show scope, rate and trends efficiently.\n- **Logs:** timestamped event records that explain what a component decided or experienced.\n- **Traces:** the end-to-end path of a request across services and dependencies.\n- **Profiles:** sampled CPU or memory behavior that helps locate expensive code.',
      'A trace contains multiple spans. For example:',
      'Each span can record service, operation, duration, status and a few carefully chosen attributes. A shared trace or correlation ID is what connects traces to logs. Request IDs belong in traces and logs — never in metric labels.',
      '**Typical signal flow**',
      'OpenTelemetry provides vendor-neutral APIs, SDKs and collectors for this data. Grafana Alloy is an OpenTelemetry Collector distribution that can collect and route metrics, logs and traces to compatible backends.',
    ],
    code: [
      {
        title: 'A trace made of spans',
        language: 'text',
        code: `Trace: customer places an order
├── API span: validate request       40 ms
├── Inventory span: reserve stock   120 ms
├── Payment span: authorize payment 300 ms
└── Database span: save order        60 ms`,
      },
      {
        title: 'Typical signal flow',
        language: 'text',
        code: `Applications, hosts and Kubernetes
        ↓ instrumentation/exporters/collector
Metrics → Prometheus or Azure Monitor
Logs    → Loki or Log Analytics
Traces  → Tempo or Application Insights
        ↓
Grafana / Azure dashboards
        ↓
Alerting, investigation and runbooks`,
      },
    ],
    tags: ['observability', 'metrics', 'logs', 'traces'],
  },
  {
    id: 'itv-mymon-2',
    level: 'basic',
    kind: 'open',
    prompt: 'What are the four golden signals?',
    probing:
      'Whether you can name the golden signals and turn them into an SLO rather than CPU alerts.',
    answer: [
      "Latency, traffic, errors, and saturation. Saturation means how close a resource is to its limit. For an API, I'd measure percentile latency, request rate, the ratio of failed or incorrect outcomes, and the limiting resources — things like CPU, queues, pools or connections.",
      'Together these connect user impact to demand and capacity better than CPU alone would. I define an SLO around them, alert on sustained impact or error-budget burn, and drop into component-level detail only for diagnosis.',
      '**Golden signals and SRE practice**',
      'The four golden signals are:',
      '- **Latency**: How long successful and failed operations take\n- **Traffic**: Demand — requests, transactions or messages\n- **Errors**: Explicit failures and incorrect results\n- **Saturation**: How close a constrained resource is to its limit',
      'Define user-visible **service-level indicators (SLIs)** and a **service-level objective (SLO)** with an error budget. Multi-window, multi-burn-rate alerts catch both a fast severe burn and a slower sustained one, without paging for harmless short spikes.',
      "Monitoring shouldn't mean someone staring at a dashboard all day. Dashboards are for understanding; alerts should only notify an owner when there's a timely action to take.",
      'Capacity forecasts, loss-of-redundancy signals, and security or data-integrity signals fill in the gaps around SLO alerting.',
    ],
    tags: ['observability', 'golden signals', 'slo'],
  },
  {
    id: 'itv-mymon-3',
    level: 'advanced',
    kind: 'open',
    prompt: 'How do you design SLO-based alerting with low fatigue?',
    probing:
      'Whether you understand error budgets and multi-window burn-rate alerting as a cure for alert fatigue.',
    answer: [
      'I define a user-visible SLI with a target and a time window, calculate its error budget, and use multi-window, multi-burn-rate alerts. A fast, severe burn pages quickly. A slower, sustained burn catches decline over time without paging for harmless short spikes.',
      "Capacity trends that aren't urgent go to tickets or dashboards instead of pages.",
      'Every page includes an owner, supporting evidence, the SLO impact, and a runbook. Grouping, deduplication, inhibition and maintenance windows cut down on alert storms. After incidents, I test that alerts actually get delivered and review false positives, missed incidents, how actionable each alert was, and overall page volume.',
    ],
    followUps: [
      'Walk me through a fast-burn and a slow-burn window pair.',
      'How do you decide what should page versus open a ticket?',
    ],
    tags: ['slo', 'alerting', 'error budget'],
  },
  {
    id: 'itv-mymon-4',
    level: 'intermediate',
    kind: 'open',
    prompt: 'How do you compare metrics, logs and traces?',
    probing: 'Whether you can pivot between metrics, traces and logs during an investigation.',
    answer: [
      'Metrics tell you when and where a symptom started. Traces show which hop is slow or failing. Structured logs explain what that component decided or did. All three share service, environment, version, region and trace-context fields so you can move between them.',
      'In practice, I narrow the time window, compare against healthy traffic, pick a trace example from the latency or error signal, look up its trace ID in the logs, and overlay recent deployment or configuration changes.',
      'I keep an eye on cardinality — the number of unique label combinations a metric can produce — since unbounded cardinality can overwhelm a metrics system. I also retain error and tail traces appropriately and redact sensitive log and trace fields. After a fix, I confirm all three signals recover, along with the actual business transaction.',
      '**Correlation and incident investigation**',
      'During an incident, step by step:',
      '1. Confirm customer impact, which services are affected, the environment, and the time window.\n2. Use metrics to work out the scope and when the behavior changed.\n3. Follow a trace or exemplar to find the slow or failing dependency.\n4. Search structured logs using the trace ID, and compare the first failure against recent deployments or configuration changes.\n5. Mitigate safely, confirm recovery using the original user-visible signal, and preserve evidence for the root-cause writeup.',
      'Keep service, environment, version, cluster and region attributes consistent across all three signal types so you can pivot between them. Also keep a handle on cardinality — the number of unique label combinations a metric produces — along with sampling, redaction, access, retention and cost.',
    ],
    tags: ['observability', 'correlation', 'traces'],
  },
  {
    id: 'itv-mymon-5',
    level: 'advanced',
    kind: 'scenario',
    prompt: 'Multiple critical alerts fire together. How do you prioritize?',
    probing:
      'Whether you prioritize by impact, declare one incident and suppress downstream duplicates.',
    answer: [
      "I prioritize by customer or business impact, security or data-integrity risk, SLO burn, how widespread the impact is, and urgency — not by which alert happened to fire first. I declare a single incident, assign command and communications roles, find the earliest shared dependency, and suppress the downstream duplicate alerts it's causing.",
      'One responder stabilizes the situation — a known rollback, a traffic shift, or isolating the failing component — while another preserves evidence for later. After recovery, the incident timeline is used to improve dependency mapping, severities and runbooks.',
      '**Alert quality**: Cut noise through ownership, deduplication, grouping, inhibition, maintenance windows, and removing alerts nobody can act on. When several alerts fire at once, prioritize by customer or business impact, security or data risk, SLO burn, scope of impact, and urgency.',
      'Declare a single incident for a shared root cause and group the downstream symptoms under it.',
      '**Serverless observability** follows an event across APIs, functions, queues and dependencies, and covers invocation, error, duration, cold start, throttling, concurrency, retries, queue age and dead-letter behavior.',
      "**AIOps** can group related symptoms, spot unusual behavior, rank likely causes, forecast risk, and suggest controlled runbooks. It supports good instrumentation, clear service targets, responder judgment and root-cause review — it doesn't replace any of them.",
      'Any automated action needs constrained authority, an audit trail, a rollback path and verification afterward. Detailed AIOps material is maintained in `Ops/AIOps`.',
    ],
    followUps: [
      'How does inhibition help when a shared dependency fails?',
      'Who owns communication while you stabilize?',
    ],
    tags: ['incident', 'alerting', 'prioritization'],
  },
  {
    id: 'itv-mymon-6',
    level: 'advanced',
    kind: 'open',
    prompt: 'How do you observe serverless or multi-cloud workflows?',
    probing:
      'Whether you propagate trace context across async boundaries and replay events safely.',
    answer: [
      'I propagate trace context and an event ID across API, function, queue and dependency boundaries, and collect invocation, error, duration, cold start, throttling, concurrency, retry, queue age and dead-letter signals. OpenTelemetry gives consistent instrumentation across these; platform-native tools add extra service-specific detail.',
      "Dashboards are organized around the business flow rather than individual services. I only replay failed events after the underlying cause is fixed, and only with idempotency controls in place — meaning it's safe to process the same event twice. Sampling, privacy, retention, cardinality and cost all need to be designed for deliberately, not left as defaults.",
    ],
    followUps: [
      'How do you propagate trace context through a queue?',
      'Why does idempotency matter before replaying a dead-letter queue?',
    ],
    tags: ['serverless', 'multi-cloud', 'tracing'],
  },
  {
    id: 'itv-mymon-7',
    level: 'advanced',
    kind: 'open',
    prompt: 'How does AIOps use observability data without becoming another source of noise?',
    probing:
      'Whether you treat AIOps as evidence grouping validated against real incidents, not a new alert source.',
    answer: [
      'I give AIOps consistent service topology, clear ownership, deployment history, and high-quality metrics, logs and traces. Then I check its correlation and anomaly results against incidents that were actually confirmed.',
      'Done well, it groups related symptoms together, ranks impact, and supplies evidence for a probable cause — instead of raising a new alert for every anomaly score it produces. Only signals that are actionable and confident enough about user impact should page anyone. Forecasts and weak anomalies go to dashboards or tickets instead.',
      'I monitor the underlying models for missing data, drift, precision and false-positive rate. Any automated remediation is limited to narrow, pre-approved runbooks, with approval steps where needed and SLO verification after it acts.',
    ],
    followUps: [
      'How would you measure whether AIOps correlation is accurate?',
      'Which remediations would you allow to run automatically?',
    ],
    tags: ['aiops', 'observability', 'alerting'],
  },
  {
    id: 'itv-mymon-8',
    level: 'advanced',
    kind: 'open',
    prompt:
      'How would you implement a comprehensive observability strategy for a microservices architecture deployed across multiple Kubernetes clusters?',
    probing:
      'Whether you can design metrics, logs and tracing across clusters with consistent metadata and SLOs.',
    answer: [
      "The strategy rests on three pillars: metrics, logs and traces. For metrics, I'd deploy Prometheus with Thanos for long-term storage and cross-cluster querying.",
      'Each service exposes its own business and technical metrics through Prometheus exporters, with standardized Grafana dashboards for service health and performance.',
      "For logging, I'd run Fluent Bit as a DaemonSet to collect container logs and forward them to OpenSearch, with structured JSON logging standardized across services so queries stay consistent.",
      "For distributed tracing, I'd instrument every service with OpenTelemetry, adjust sampling rates to traffic volume, and send traces to Jaeger for visualization and analysis. Service-to-service dependencies get mapped automatically from Istio service mesh data, which also supplies request rate, error and duration metrics. I'd define SLOs per service using Prometheus recording rules and alert on error-budget consumption.",
      'All observability data carries consistent metadata — cluster, namespace, service, version — so it can be correlated across systems. This is what takes MTTR from hours down to minutes: you can trace the root cause of a problem that spans several services instead of hunting through each one separately.',
    ],
    followUps: [
      'How do you keep trace volume and cost under control?',
      'How would you query metrics across all clusters at once?',
    ],
    tags: ['observability', 'kubernetes', 'multi-cluster', 'design'],
  },
  {
    id: 'itv-mymon-9',
    level: 'advanced',
    kind: 'scenario',
    prompt:
      'Infrastructure is healthy and dashboards are green, but the system feels slow. What do you check first?',
    probing:
      'Whether you trust user-reported slowness and add the missing user-facing SLI instead of defending green dashboards.',
    answer: [
      'I treat the user-reported slowness as valid evidence on its own. First I confirm its scope using real-user monitoring, synthetic transactions and business KPIs — conversion rate, successful checkouts, queue completion. "Green" dashboards often only cover host CPU and basic availability, not the actual user experience.',
      'I compare against a healthy baseline across p95/p99 latency, errors by route, client and network geography, DNS/TLS timing, dependency latency, resource saturation, queue age, database connection pools, and any recent changes.',
      'Then I add the missing user-facing SLI and alert on it, so the dashboard reflects the actual service outcome instead of just infrastructure reachability.',
    ],
    followUps: [
      'What is the difference between synthetic and real-user monitoring?',
      'Which SLI would you add first?',
    ],
    tags: ['observability', 'sli', 'real user monitoring'],
  },
  {
    id: 'itv-mymon-10',
    level: 'basic',
    kind: 'open',
    prompt: 'What does APM do, and how do you use it well?',
    probing:
      'Whether you know what APM connects together and that a tool alone is not observability.',
    answer: [
      "Application Performance Monitoring (APM) connects a user's request to everything that handled it: the service code, its dependencies, and the underlying infrastructure. It does this through request metrics, distributed traces, error tracking, logs, service topology maps, profiling, and sometimes real-user and synthetic monitoring.",
      "**Using APM well**: A tool by itself isn't observability. To get real value out of it:",
      '- Define clear service and business indicators to track.\n- Propagate trace context across service calls.\n- Mark deployments so before/after comparisons are easy.\n- Redact sensitive data from captured attributes.\n- Assign clear ownership for dashboards and alerts.',
    ],
    tags: ['apm', 'observability'],
  },
  {
    id: 'itv-mymon-11',
    level: 'intermediate',
    kind: 'open',
    prompt: 'Compare Dynatrace, Datadog, New Relic and OpenTelemetry.',
    probing:
      'Whether you know that OpenTelemetry is an instrumentation standard, not a backend, and can choose a tool from real criteria.',
    answer: [
      'Dynatrace, Datadog, and New Relic are commercial observability platforms. Each combines agents, APM, infrastructure monitoring, logs, traces, topology maps, user-experience data, and automated analysis, in different mixes.',
      "OpenTelemetry is different. It's an open standard for instrumenting code and collecting telemetry data, not a complete product for storing and analyzing it. You still need a backend to send that data to.",
      'When choosing between them, I look at runtime, cloud, and Kubernetes coverage, trace quality, profiling, real-user and synthetic monitoring, integrations, data residency, access control, sampling and retention limits, operational effort, and cost. I run a pilot against a real service and a real incident query before deciding.',
      "These tools' built-in automation can point toward a likely cause, but any actual change still needs evidence and a safe approval process. I don't let a vendor's suggestion skip review.",
      '**Common Tools**, at a glance:',
      '- **Dynatrace**: Commercial, full-stack\n- **Datadog**: Commercial, full-stack\n- **New Relic**: Commercial, full-stack\n- **Application Insights**: Azure-native\n- **OpenTelemetry**: Vendor-neutral instrumentation and export standard',
      "Dynatrace, Datadog, and New Relic are commercial platforms that cover the full stack. Application Insights is Azure's native option. OpenTelemetry isn't a platform on its own — it's a standard way to instrument code and export the data, so you can send it to whichever backend you choose.",
      '**Choosing a tool**: The right choice depends on: application and runtime coverage, whether instrumentation is automatic or manual, Kubernetes and cloud integration, topology mapping, query and retention needs, sampling behavior, data residency, access control, operational effort, and cost.',
    ],
    tags: ['apm', 'opentelemetry', 'datadog', 'dynatrace'],
  },
  {
    id: 'itv-mymon-12',
    level: 'intermediate',
    kind: 'scenario',
    prompt: 'How do you use APM to find a latency regression?',
    probing:
      'Whether you compare before/after percentiles by version and prove the bottleneck from traces.',
    answer: [
      'First, I mark the deployment time in the APM tool. Then I compare request latency percentiles and error rates before and after that point, split out by version.',
      'I pick a few representative slow traces and break down where the time is actually going: gateway, service code, database, cache, queue, or an external dependency.',
      'I check whether the runtime is running close to a resource limit, like CPU, memory, threads, or a connection pool, and pull logs for the same trace ID. I compare all of this against healthy traffic to confirm where the real difference is.',
      "Once I've proven the bottleneck, I fix it: a rollback, added capacity, or a targeted code fix.",
      "Finally, I re-check the original slow user transaction to confirm it's actually fixed, and I add a regression test or an SLO alert so it doesn't slip through unnoticed next time.",
      '**Diagnosing a slow API, step by step**',
      "1. Compare P95/P99 latency and error rates before and after the change.\n2. Pick a few representative slow traces to dig into.\n3. Separate time spent in service code from time spent in dependencies.\n4. Check database, cache, and external calls, and check whether the runtime is close to a resource limit.\n5. Fix the proven bottleneck.\n6. Re-verify the original slow user transaction to confirm it's resolved.",
    ],
    tags: ['apm', 'latency', 'tracing'],
  },
]
