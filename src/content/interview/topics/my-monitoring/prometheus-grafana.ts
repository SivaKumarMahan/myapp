import type { InterviewQuestion } from '../../../types'

/** Prometheus, Alertmanager, Grafana and Netdata. */
export const myMonitoringPrometheusGrafanaQuestions: InterviewQuestion[] = [
  {
    id: 'itv-mymon-13',
    level: 'basic',
    kind: 'open',
    prompt: 'What is Prometheus and how does it work?',
    probing:
      'Whether you understand the pull model, what a time series is, and why labels must stay bounded.',
    answer: [
      "Prometheus is a pull-based monitoring system. It's also a time-series database, a PromQL query engine, and a rule evaluator all in one. It periodically scrapes HTTP metric endpoints, stores each sample with a timestamp and labels, evaluates recording and alerting rules, and exposes the data to tools like Grafana.",
      'The usual flow looks like this:',
      'A time series is a metric name plus a unique set of labels. For example, `http_requests_total{service="orders",status="200"}` is a different time series from the same metric with `status="500"`.',
      'Keep labels limited and operationally useful. Never use request IDs, user IDs, timestamps or unbounded URL values as labels — each unique combination of label values creates a new time series, and too many of those (high cardinality) can overwhelm Prometheus.',
      '**Local learning stack**',
      'A Docker Compose lab typically runs Prometheus (`9090`), Grafana (`3000`), Node Exporter (`9100`), cAdvisor (`8080`), Loki (`3100`) and Alertmanager (`9093`) together. Use service names for container-to-container URLs, like `http://prometheus:9090`, and bind web ports to `127.0.0.1` for local practice.',
      'Publicly exposing monitoring ports or using unpinned `latest` images is not a production design.',
    ],
    code: [
      {
        title: 'Prometheus data flow',
        language: 'text',
        code: `Application / host / Kubernetes
        ↓ exposes /metrics
Exporter or instrumented application
        ↓ scraped by Prometheus
Prometheus TSDB + PromQL + rules
        ├── Grafana dashboards
        └── Alertmanager notifications`,
      },
    ],
    tags: ['prometheus', 'metrics'],
  },
  {
    id: 'itv-mymon-14',
    level: 'basic',
    kind: 'open',
    prompt: 'What are the Prometheus metric types?',
    probing:
      'Whether you know counters, gauges, histograms and summaries and how to query each correctly.',
    answer: [
      'Prometheus has four metric types:',
      "- **Counter:** a value that normally only goes up, such as total requests or errors. Query it with `rate()` or `increase()`, never a raw average.\n- **Gauge:** a value that can go up or down, such as memory usage, queue depth or active sessions.\n- **Histogram:** observations sorted into buckets, such as request duration. Prometheus can aggregate these server-side and estimate percentiles with `histogram_quantile()`.\n- **Summary:** observations with quantiles calculated on the client side. These quantiles generally can't be combined reliably across instances.",
    ],
    tags: ['prometheus', 'metric types'],
  },
  {
    id: 'itv-mymon-15',
    level: 'intermediate',
    kind: 'open',
    prompt: 'What is in `prometheus.yml` and how do you validate it?',
    probing:
      'Whether you know what `prometheus.yml` contains and validate it with `promtool` and the Targets page.',
    answer: [
      'It usually defines the global scrape and evaluation intervals, scrape jobs and service discovery, relabeling rules, rule files, remote write, and Alertmanager targets. In Kubernetes, Operator resources like `ServiceMonitor` and `PodMonitor` often generate this scrape configuration for you.',
      "To validate it, I run `promtool check config`, check the Targets page for discovery, TLS or auth errors, confirm the expected labels with a sample query, and reload it through the supported method. Credentials go through secret files or the platform's secret integration, not plain text in the config.",
      "I also watch scrape duration and failures, and keep an eye on label cardinality — the number of unique label combinations a metric produces — so a single bad target can't destabilize the whole Prometheus instance.",
      '**Basic configuration**',
      'In Kubernetes, prefer service discovery and `ServiceMonitor`/`PodMonitor` resources over hardcoding static pod IPs. Before reloading configuration, run:',
      "On the Prometheus **Targets** page, confirm the target is discovered, its state is `UP`, the labels are correct, and the last scrape didn't error. The `up` metric only tells you the scrape succeeded — it doesn't prove the application itself is healthy.",
    ],
    code: [
      {
        title: 'Basic prometheus.yml',
        language: 'yaml',
        code: `global:
  scrape_interval: 15s
  evaluation_interval: 15s

rule_files:
  - /etc/prometheus/rules/*.yml

scrape_configs:
  - job_name: node
    static_configs:
      - targets: ["node-exporter:9100"]

  - job_name: cadvisor
    static_configs:
      - targets: ["cadvisor:8080"]

alerting:
  alertmanagers:
    - static_configs:
        - targets: ["alertmanager:9093"]`,
      },
      {
        title: 'Validate config and rules',
        language: 'bash',
        code: `promtool check config /etc/prometheus/prometheus.yml
promtool check rules /etc/prometheus/rules/*.yml`,
      },
    ],
    tags: ['prometheus', 'configuration', 'promtool'],
  },
  {
    id: 'itv-mymon-16',
    level: 'intermediate',
    kind: 'open',
    prompt: 'Which PromQL queries do you use most for hosts and services?',
    probing:
      'Whether you can write rate-based CPU, memory, filesystem, error-ratio and percentile queries correctly.',
    answer: [
      'These are the queries I use most:',
      "Use a range long enough to cover several scrapes. Only aggregate away instance-level labels when that actually matches the question you're asking.",
      '**Host queries from my host-monitoring notes**',
      "For batch jobs or machine-local facts that can't expose an HTTP endpoint, the Node Exporter textfile collector can read metric files that were written atomically. Don't use it to export application events with a large number of unique label combinations (high cardinality) — it's meant for host-level facts, not application telemetry.",
    ],
    code: [
      {
        title: 'Useful PromQL',
        language: 'text',
        code: `# Unreachable scrape targets
up == 0

# CPU usage percentage by host
100 * (
  1 - avg by (instance) (
    rate(node_cpu_seconds_total{mode="idle"}[5m])
  )
)

# Memory usage percentage by host
100 * (
  1 -
  node_memory_MemAvailable_bytes
  /
  node_memory_MemTotal_bytes
)

# Filesystem usage percentage
100 * (
  1 -
  node_filesystem_avail_bytes{fstype!~"tmpfs|overlay"}
  /
  node_filesystem_size_bytes{fstype!~"tmpfs|overlay"}
)

# Request rate by service and status
sum by (service, status) (
  rate(http_requests_total[5m])
)

# 5xx error ratio
sum(rate(http_requests_total{status=~"5.."}[5m]))
/
sum(rate(http_requests_total[5m]))

# 95th-percentile request duration
histogram_quantile(
  0.95,
  sum by (le) (
    rate(http_request_duration_seconds_bucket[5m])
  )
)`,
      },
      {
        title: 'Host PromQL examples',
        language: 'text',
        code: `# CPU usage percentage
100 * (
  1 - avg by (instance) (
    rate(node_cpu_seconds_total{mode="idle"}[5m])
  )
)

# Available-memory-based usage percentage
100 * (
  1 -
  node_memory_MemAvailable_bytes
  /
  node_memory_MemTotal_bytes
)

# Root filesystem usage percentage
100 * (
  1 -
  node_filesystem_avail_bytes{mountpoint="/",fstype!~"tmpfs|overlay"}
  /
  node_filesystem_size_bytes{mountpoint="/",fstype!~"tmpfs|overlay"}
)

# Target scrape failure
up{job="node"} == 0`,
      },
    ],
    tags: ['prometheus', 'promql'],
  },
  {
    id: 'itv-mymon-17',
    level: 'intermediate',
    kind: 'open',
    prompt: 'What are recording and alerting rules in Prometheus?',
    probing:
      'Whether you know what recording rules precompute and what makes an alerting rule actionable.',
    answer: [
      'Recording rules precompute expressions that are expensive or used often. Alerting rules should describe a sustained, actionable symptom, and include ownership and troubleshooting context.',
      'The `for` duration stops a short spike from firing immediately. Test the whole path: rule expression, pending state, firing state, Alertmanager route, notification, and the resolved notification too.',
    ],
    code: [
      {
        title: 'Host high-CPU alert rule',
        language: 'yaml',
        code: `groups:
  - name: host-health
    rules:
      - alert: HostHighCPU
        expr: |
          100 * (
            1 - avg by (instance) (
              rate(node_cpu_seconds_total{mode="idle"}[5m])
            )
          ) > 90
        for: 5m
        labels:
          severity: warning
          team: platform
        annotations:
          summary: "High CPU on {{ $labels.instance }}"
          description: "CPU usage has exceeded 90% for 5 minutes."
          runbook_url: "https://runbooks.example/host-high-cpu"`,
      },
    ],
    tags: ['prometheus', 'alerting', 'recording rules'],
  },
  {
    id: 'itv-mymon-18',
    level: 'intermediate',
    kind: 'open',
    prompt: 'How do you alert when disk use exceeds 80%?',
    probing:
      'Whether you can write a disk alert with a `for` duration and sensible filesystem filters.',
    answer: [
      "I exclude filesystems that don't matter, like read-only ones, include the mount point and a runbook link in the annotations, and use a `for` duration so a brief spike doesn't page anyone. When investigating, I check the growth rate, inode usage, files that are open but deleted, logs, containers, and application data.",
      'A time-to-full forecast and a critical threshold are often more useful than a single fixed percentage. I test both the rule and the receiver before trusting it.',
    ],
    code: [
      {
        title: 'Filesystem space alert rule',
        language: 'yaml',
        code: `- alert: FilesystemSpaceLow
  expr: |
    100 * (1 - node_filesystem_avail_bytes{fstype!~"tmpfs|overlay"}
      / node_filesystem_size_bytes{fstype!~"tmpfs|overlay"}) > 80
  for: 10m
  labels:
    severity: warning
  annotations:
    summary: "Filesystem usage above 80% on {{ $labels.instance }}"`,
      },
    ],
    tags: ['prometheus', 'alerting', 'disk'],
  },
  {
    id: 'itv-mymon-19',
    level: 'advanced',
    kind: 'open',
    prompt: 'How do you operate Prometheus for Kubernetes at production scale?',
    probing:
      'Whether you can run Prometheus at scale with HA, remote write, self-monitoring and cardinality control.',
    answer: [
      'I deploy a pinned kube-prometheus-stack or a managed service, and configure resource limits, persistent storage, retention, high availability, RBAC/authentication and ServiceMonitors. Node Exporter, kube-state-metrics and kubelet/cAdvisor cover nodes, object state and containers; applications expose their own business and request metrics on top of that.',
      "For long retention or queries across clusters, I use remote write into Thanos, Mimir, or a managed backend. I monitor Prometheus's own memory and disk usage, rule evaluation time, failed scrapes, remote-write backlog, and cardinality.",
      'I inject test alerts and simulate a lost target to confirm the whole pipeline works. Stable cluster and service labels support multi-cluster queries, but unlimited request or user labels are not allowed — they blow up cardinality.',
      '**Exporters and Kubernetes resources**',
      'Common metric sources include:',
      '- **Node Exporter**: Linux CPU, memory, load, filesystem and network metrics\n- **Kubelet/cAdvisor**: Pod and container CPU, memory, filesystem and network usage\n- **kube-state-metrics**: Kubernetes object state such as desired/available replicas and pod phase\n- **Blackbox Exporter**: HTTP, TCP, DNS and ICMP synthetic probes\n- **Application client library**: Business and application metrics exposed at `/metrics`',
      'With Prometheus Operator, `ServiceMonitor`, `PodMonitor`, `Probe` and `PrometheusRule` resources provide Kubernetes-native target and rule configuration.',
      '**Production practices**',
      '- **Persist the TSDB and size retention**: Match it to ingestion rate, disk capacity and compliance needs\n- **Monitor Prometheus itself**: Watch failed scrapes, rule evaluation failures, storage growth, compaction and cardinality\n- **Use recording rules**: Precompute repeated expensive queries; keep dashboard query ranges reasonable\n- **Run HA replicas when required**: For long retention or global queries, pair with a managed service, Thanos, or Mimir\n- **Keep endpoints private**: Prometheus, exporters and service-discovery endpoints stay off the public network\n- **Secure access**: TLS and authentication at the ingress or reverse proxy, and discovery credentials scoped to only what they need\n- **Pin and back up**: Pin reviewed container versions, back up config/rules, and manage both through version control',
      "For an Azure-based environment, Azure Monitor's managed service for Prometheus plus Azure Managed Grafana can cut down the operational work for AKS monitoring. Self-managed Prometheus is still worth it where you need full configuration control or portability.",
    ],
    followUps: [
      'When would you choose Thanos or Mimir over a single Prometheus?',
      'How do you find which metric is causing a cardinality explosion?',
    ],
    tags: ['prometheus', 'kubernetes', 'scaling'],
  },
  {
    id: 'itv-mymon-20',
    level: 'basic',
    kind: 'open',
    prompt: 'How does Alertmanager reduce alert noise?',
    probing:
      'Whether you know grouping, deduplication, routing, inhibition and silences and when to delete an alert instead.',
    answer: [
      'Alertmanager cuts noise in a few ways. It groups alerts from the same incident together, deduplicates repeated notifications, routes alerts by their labels, inhibits lower-priority alerts when a parent failure is already firing, and lets you silence alerts during planned maintenance.',
      'I use stable labels for team, service, environment, and severity, and I design the routing tree around who actually owns each alert.',
      "I also regularly review alerts that never lead to any action. If an alert doesn't drive a response, I remove it or demote it, rather than just spacing out how often it repeats.",
      '**Role in the alerting flow**',
      "Prometheus evaluates PromQL alert rules. When a rule fires, Prometheus sends the alert to Alertmanager. Alertmanager doesn't evaluate PromQL itself — its job is managing how those alerts get delivered.",
      '- **Grouping**: Combines related alerts into one manageable notification\n- **Deduplication**: Stops repeated copies of the same alert going out\n- **Routing**: Picks a receiver based on labels like team, service, environment, and severity\n- **Inhibition**: Suppresses symptom alerts when a known parent alert is already firing\n- **Silence**: Temporarily suppresses matching alerts, usually during planned maintenance',
      "Alertmanager can deliver to email, webhooks, incident-management platforms, and controlled chat integrations. For critical alerts, use an on-call system with acknowledgement and escalation — don't rely on chat alone, since messages can be missed.",
    ],
    code: [
      {
        title: 'Alertmanager in the alerting flow',
        language: 'text',
        code: `Prometheus rule evaluation
        ↓
Alertmanager
        ├── groups related alerts
        ├── deduplicates repeats
        ├── applies inhibition and silences
        └── routes by labels to receivers`,
      },
    ],
    tags: ['alertmanager', 'alerting'],
  },
  {
    id: 'itv-mymon-21',
    level: 'intermediate',
    kind: 'open',
    prompt: 'How do you connect Prometheus to Alertmanager and route alerts with enough context?',
    probing:
      'Whether you can wire Prometheus to Alertmanager, write a rule with routing labels and a runbook, and route by severity.',
    answer: [
      'Prometheus needs the Alertmanager target in its configuration:',
      'The Prometheus rule should include enough context for routing and response:',
      '**Routing example**: Keep receiver credentials in Kubernetes Secrets or an external secret manager such as Azure Key Vault. Never commit webhook URLs, API tokens, or SMTP passwords to the repo.',
    ],
    code: [
      {
        title: 'Prometheus alerting target',
        language: 'yaml',
        code: `alerting:
  alertmanagers:
    - static_configs:
        - targets: ["alertmanager:9093"]`,
      },
      {
        title: 'Error-rate alert rule with routing context',
        language: 'yaml',
        code: `groups:
  - name: application-health
    rules:
      - alert: ApplicationHighErrorRate
        expr: |
          sum by (service) (
            rate(http_requests_total{status=~"5.."}[5m])
          )
          /
          sum by (service) (
            rate(http_requests_total[5m])
          ) > 0.05
        for: 10m
        labels:
          severity: critical
          team: application
        annotations:
          summary: "High error rate for {{ $labels.service }}"
          description: "More than 5% of requests have failed for 10 minutes."
          runbook_url: "https://runbooks.example/application-high-error-rate"`,
      },
      {
        title: 'Alertmanager route and receivers',
        language: 'yaml',
        code: `route:
  receiver: default-notifications
  group_by: ["alertname", "service", "environment"]
  group_wait: 30s
  group_interval: 5m
  repeat_interval: 4h
  routes:
    - matchers:
        - severity="critical"
      receiver: critical-on-call

receivers:
  - name: default-notifications
    webhook_configs:
      - url_file: /run/secrets/default_webhook_url

  - name: critical-on-call
    webhook_configs:
      - url_file: /run/secrets/on_call_webhook_url`,
      },
    ],
    tags: ['alertmanager', 'prometheus', 'routing'],
  },
  {
    id: 'itv-mymon-22',
    level: 'intermediate',
    kind: 'open',
    prompt: 'How do you integrate Alertmanager with Slack, Teams or PagerDuty securely?',
    probing:
      'Whether you keep webhook credentials out of config, send context-rich notifications and test delivery.',
    answer: [
      'I set up the receiver and route in Alertmanager, but I never put webhook or API credentials directly in the config file. Those go into Kubernetes Secrets or an external secret manager instead.',
      "Each notification includes the service name, the impact, how long it's been happening, the current value, a link to the dashboard, a link to the runbook, and a link to acknowledge or silence the alert.",
      'Grouping and inhibition stop this from turning into a flood of messages during a big incident.',
      'To test it, I fire a non-production test alert and check that it reaches the right receiver, that the firing and resolved messages both look correct, and that escalation works as expected. Slack and Teams are good for collaboration, but critical pages also go through PagerDuty or a similar tool, because a chat message can easily be missed.',
      'Credentials get rotated on a regular schedule, and any change to the routing configuration goes through review.',
    ],
    tags: ['alertmanager', 'slack', 'pagerduty', 'secrets'],
  },
  {
    id: 'itv-mymon-23',
    level: 'advanced',
    kind: 'open',
    prompt: 'How do you test Alertmanager, and what are the best practices?',
    probing:
      'Whether you test alert delivery end to end and run Alertmanager as a monitored, highly available cluster.',
    answer: [
      'The practices I follow for Alertmanager:',
      "- Alert on sustained, actionable problems or SLO burn — not on every brief threshold breach.\n- Use stable ownership labels and consistent severity levels across the board.\n- Include the observed impact, current value, start time, a dashboard link, and a runbook link in every notification.\n- Test a safe firing condition end to end: the right route, grouping, template rendering, acknowledgement, escalation, and the resolved notification.\n- Test silences and maintenance windows, and don't leave broad or permanent suppressions sitting in place afterward.\n- Monitor Alertmanager itself: its health, notification failures, queue behavior, and config reloads.\n- For high availability, run Alertmanager as a supported cluster, and actually test what happens when one instance or one receiver fails.",
    ],
    followUps: [
      'How do Alertmanager instances in a cluster avoid duplicate notifications?',
      'How would you test the resolved notification safely?',
    ],
    tags: ['alertmanager', 'testing', 'best practices'],
  },
  {
    id: 'itv-mymon-24',
    level: 'basic',
    kind: 'open',
    prompt: "What is Grafana's role compared with Prometheus or CloudWatch?",
    probing: 'Whether you understand that Grafana visualizes and queries data stored elsewhere.',
    answer: [
      'Prometheus and CloudWatch each collect, store, and query monitoring data in their own way. Grafana sits on top as the visualization and exploration layer. It can query both of them, plus Loki, Elasticsearch, Azure Monitor, and tracing systems, all from one place.',
      "Grafana doesn't create good observability by itself. You still need correct instrumentation, real SLOs, clear ownership, sensible retention, and runbooks. Grafana just makes all of that easier to see and act on.",
      '**Purpose and architecture**',
      "Grafana is a visualization, exploration, and alerting platform. It normally doesn't store your raw metrics, logs, or traces itself — it queries them from wherever they already live.",
      'What Grafana does store is its own metadata: users, organizations, data-source configuration, dashboards, and alert configuration.',
      'Common data sources include:',
      '- Prometheus for metrics\n- Loki for logs\n- Tempo for traces\n- Azure Monitor and Log Analytics for Azure platform monitoring data\n- Elasticsearch/OpenSearch and supported SQL databases',
      'Plugins can add new data sources, panels, and applications. Treat them like any other software dependency: install only approved plugins and keep them updated.',
      'When Grafana and the backend run in different containers, `localhost` points to the Grafana container. Use the internal service address instead:',
      'After adding a data source, test the connection and use **Explore** to validate a simple query before building a dashboard.',
    ],
    code: [
      {
        title: 'Data source URLs between containers',
        language: 'text',
        code: `Prometheus: http://prometheus:9090
Loki:       http://loki:3100`,
      },
    ],
    tags: ['grafana', 'prometheus', 'cloudwatch'],
  },
  {
    id: 'itv-mymon-25',
    level: 'intermediate',
    kind: 'open',
    prompt: 'How do you configure a useful Grafana dashboard?',
    probing:
      'Whether you build dashboards around decisions and golden signals, and test and version them.',
    answer: [
      'I start with a data source that has least privilege — just enough access to query, nothing more — and I test the connection. I add variables for things like environment, cluster, or service so people can filter without editing the dashboard.',
      'The main overview is built around the signals that matter most: latency, traffic, errors, saturation (how close a resource is to its limit), and business outcomes.',
      "Each panel needs the right units, useful percentiles, clear legends, and thresholds. I add deployment annotations and link out to logs, traces, and runbooks so someone investigating an issue doesn't have to leave the dashboard to find context.",
      'Drill-down dashboards hold the detailed evidence for each component.',
      'Before calling it done, I test multiple time ranges, empty data, refresh load, and permissions. I compare what the panel shows against the raw source data, and I version the dashboard as code where I can.',
      'I avoid misleading averages, cramming in too many panels, and variables with too many possible values (high cardinality).',
      'SSO, role-based access, credential isolation, and backups are part of the setup, not an afterthought.',
      '**Building an effective dashboard**',
      '1. Define the operational question and the audience first.\n2. Add variables for environment, cluster, namespace, or service. Keep the number of unique values a variable can produce (cardinality) under control, or queries will blow up.\n3. Start with what affects users: latency, traffic, errors, and saturation — how close a resource is to its limit.\n4. Add dependency, infrastructure, and business panels only when they support a decision.\n5. Set the correct units, legends, thresholds, minimum/maximum values, and no-data behavior.\n6. Add deployment annotations and link to logs, traces, and runbooks.\n7. Test multiple time ranges, refresh intervals, empty data, partial failures, and a real incident period.\n8. Provision or export dashboards to version control and review changes like code.',
      'Use one overview dashboard for overall service health, and separate drill-down dashboards for detailed evidence. Avoid showing every available metric, using misleading averages, running expensive queries, or adding panels nobody owns or acts on.',
    ],
    tags: ['grafana', 'dashboards'],
  },
  {
    id: 'itv-mymon-26',
    level: 'basic',
    kind: 'open',
    prompt: 'Which Grafana visualizations do you use for what?',
    probing:
      'Whether you can match a panel type to the data and review community dashboards before trusting them.',
    answer: [
      'The visualization depends on the question the panel answers:',
      '- **Time series**: Trends such as request rate, latency, CPU or memory\n- **Stat**: A single important value such as availability or current error rate\n- **Gauge/Bar gauge**: A value with meaningful limits, such as capacity utilization\n- **Table**: Detailed status, labels, instances or ranked results\n- **Bar chart**: Comparison across services, versions or categories\n- **Pie chart**: A small number of meaningful proportions; avoid many slices\n- **State timeline/Status history**: Discrete states such as up/down, health or deployment state\n- **Logs**: Log lines and parsed fields from a logging data source\n- **Text**: Instructions, ownership, runbook links or dashboard context',
      "Community dashboards can save setup time, but always review an imported dashboard before trusting it. Check its metric names, job labels, variables, and queries against your own environment — don't assume a dashboard is production-ready just because it's popular.",
    ],
    tags: ['grafana', 'visualizations'],
  },
  {
    id: 'itv-mymon-27',
    level: 'intermediate',
    kind: 'open',
    prompt: 'Should an alert be defined in Prometheus or Grafana?',
    probing:
      'Whether you pick one source of truth for each alert and know when Grafana-managed alerting makes sense.',
    answer: [
      "If the alert only needs Prometheus metrics, I use Prometheus rules with Alertmanager. That keeps evaluation close to the data, and Alertmanager's routing is mature.",
      "Grafana Alerting makes more sense when a rule needs to combine data from multiple sources, or when Grafana is the team's official alerting platform.",
      'The choice comes down to high availability, who owns the rule, and how the data source is run day to day. Whichever I pick, I treat it as the one source of truth, version it, and test that notifications actually deliver. I never define the same alert in both places — that just creates confusion about which one is authoritative.',
      '**Grafana alerting**: Grafana Alerting evaluates rules, groups the resulting alert instances, and sends notifications through contact points chosen by notification policies. Labels decide ownership and routing. Annotations carry the human-readable summary, description, and runbook link.',
      'For rules that only need Prometheus metrics, Prometheus rules plus Alertmanager are often the simplest source of truth. Grafana-managed alerting is useful when a rule needs to query another data source, or combine expressions across sources.',
      "Don't maintain the same rule independently in both systems — pick one as the source of truth.",
      'A host CPU alert must calculate a rate from the CPU counter before applying a threshold:',
      "Set a sensible pending duration and test both the firing and resolved behavior. Make sure a no-data or data-source error can't silently hide a real outage.",
      '**Grafana integration with Alertmanager**',
      "Grafana can add Prometheus Alertmanager as a data source to inspect alerts and manage silences from its UI. With that setup, the contact points, policies, and templates stay managed inside Alertmanager itself — they aren't edited as Grafana's own alerting configuration.",
    ],
    code: [
      {
        title: 'Host CPU alert expression',
        language: 'text',
        code: `100 * (
  1 - avg by (instance) (
    rate(node_cpu_seconds_total{mode="idle"}[5m])
  )
) > 90`,
      },
    ],
    tags: ['grafana', 'alerting', 'prometheus'],
  },
  {
    id: 'itv-mymon-28',
    level: 'intermediate',
    kind: 'open',
    prompt: 'How do you secure and operate Grafana in production?',
    probing:
      'Whether you replace bootstrap credentials, use SSO and least privilege, keep Grafana private and back it up.',
    answer: [
      'The controls I put around Grafana:',
      "- Replace bootstrap credentials immediately; never leave the default administrator password in place.\n- Use SSO, least-privilege roles (grant only the access someone actually needs), team and folder permissions, and separate service accounts.\n- Keep Grafana behind private access or a secured ingress with TLS. Don't expose port `3000` directly to the internet.\n- Store data-source and notification credentials in a secret manager such as Azure Key Vault, not in dashboard JSON or source control.\n- Restrict anonymous access, audit administrative changes, patch Grafana and any approved plugins, and guard against unsafe dashboard snapshots.\n- Back up the Grafana database and provisioned resources, and test that the restore actually works.\n- Monitor Grafana's own availability, query errors, alert evaluation, notification failures, and resource usage.",
      'Azure Managed Grafana is worth considering in Azure-heavy environments. It integrates with Azure identity and Azure Monitor data sources, and it takes platform maintenance off your plate.',
    ],
    tags: ['grafana', 'security', 'operations'],
  },
  {
    id: 'itv-mymon-29',
    level: 'basic',
    kind: 'open',
    prompt: 'What is Netdata, and when would you use it?',
    probing: 'Whether you know what the Netdata Agent does and where it fits next to other tools.',
    answer: [
      'Netdata runs an Agent on a host. The Agent finds collectors on its own, gathers real-time metrics, shows dashboards and evaluates health alerts.',
      'I use it for fast infrastructure visibility: troubleshooting CPU, memory, disk, network, processes and containers. It gives useful dashboards with almost no setup.',
      'It can sit alongside Prometheus, Grafana or cloud monitoring rather than replace them. I still need to define application SLIs, retention, access control and who owns each incident. Installing a tool by itself does not prove the service is available to customers.',
      '**What Netdata is**: Netdata is a real-time infrastructure monitoring platform built around the **Netdata Agent**. The Agent runs on a host, automatically finds collectors, gathers high-frequency system and application metrics, stores recent data locally, shows dashboards and evaluates health alerts.',
      "It's a good fit for fast host and container troubleshooting. It can run alongside Prometheus, cloud-native monitoring, or a larger observability platform instead of replacing them.",
      '**What to monitor with Netdata**',
      '- **Host resources**: CPU, load, memory, swap, disks, filesystems, network\n- **Workloads**: Processes, containers, supported applications\n- **Netdata itself**: Collector status, chart dimensions, clock accuracy\n- **Alerting**: Alert routing, resolution, and who owns each alert\n- **Parent-Child**: Retention limits and parent/child connectivity',
    ],
    tags: ['netdata', 'monitoring'],
  },
  {
    id: 'itv-mymon-30',
    level: 'intermediate',
    kind: 'open',
    prompt: 'How would you deploy Netdata securely in production?',
    probing:
      'Whether you keep port 19999 private, protect streaming keys and use TLS between Children and Parents.',
    answer: [
      'I use a pinned, supported deployment method and give it only the host or container access it actually needs. I restrict the local dashboard and API to localhost or a private management path, require authenticated access, protect configuration and streaming keys, and use TLS between Children and Parents.',
      'I never expose the default port `19999` publicly without a secured proxy and an authorization design in front of it.',
      'For centralized monitoring, Child Agents stream to resilient Parent capacity, or use the approved cloud connection model. Firewall rules allow only the paths that are actually needed.',
      'I also define retention and storage limits, labels, alert receivers and backups, and test agent and parent upgrades in a lower environment first.',
      '**Security and networking**',
      "The Agent's local web UI, API and streaming service all use configurable networking. Port `19999` is the documented default, but it should never be exposed broadly to the internet — put it behind authentication and a secured proxy, or restrict it to a private management path.",
    ],
    tags: ['netdata', 'security'],
  },
  {
    id: 'itv-mymon-31',
    level: 'intermediate',
    kind: 'scenario',
    prompt: 'Netdata shows high CPU. How do you investigate?',
    probing:
      'Whether you break CPU down by type and confirm on the host before restarting anything.',
    answer: [
      'First I check whether the CPU spike is sustained, which cores are affected, and whether user, system, iowait or steal time dominates. I compare that against process and cgroup charts, traffic, load, recent deployments and any scheduled jobs.',
      'On the host I confirm with `top`, `pidstat` or an equivalent tool, and look at application or runtime evidence before restarting anything.',
      "To mitigate, I shift traffic, roll back, scale out, or stop a runaway task I've confirmed is nonessential. Then I fix the underlying cause: code, a bad query, configuration or capacity. I check that application latency and errors recover, along with Netdata's own CPU and load charts.",
      'A host-level CPU alert is supporting evidence. It is not the root cause by itself.',
    ],
    tags: ['netdata', 'cpu', 'troubleshooting'],
  },
  {
    id: 'itv-mymon-32',
    level: 'advanced',
    kind: 'open',
    prompt: 'How does Netdata Parent-Child monitoring work?',
    probing:
      'Whether you can size and protect a Parent-Child streaming setup and test disconnects.',
    answer: [
      'Children collect metrics locally and stream them to one or more configured Parent Agents. Parents centralize those metrics and can provide dashboards, retention and health evaluation on behalf of their children.',
      "This means you don't have to browse every node separately. Depending on configuration, buffering and replication can also preserve collection through some network interruptions.",
      'When central monitoring is critical, I plan for more than one parent, or a clear recovery strategy. I size CPU, memory, disk and network from the node count and metric volume, use stable host labels, apply TLS and access controls, and watch for stream disconnects, lag, retention limits and how close the parent is to its own resource limits.',
      "I test what happens on connection loss and reconnection. I don't just assume centralized monitoring is highly available.",
      '**Parent-Child architecture**',
      "For more than a handful of systems, **Child Agents** stream their metrics to one or more **Parent Agents**. The Parent centralizes retention, dashboards and alert processing so you don't have to check every node separately.",
      'When you rely on this for production, plan for:',
      '- Sizing Parent storage and ingestion capacity for the number of nodes and metrics involved.\n- Protecting streaming credentials and using TLS between Children and Parents.\n- Restricting access to the Parent, and having a recovery plan if it goes down.\n- Testing what happens when a Child loses its connection and reconnects.',
    ],
    followUps: [
      'How would you make the Parent highly available?',
      'What happens to metrics while a Child is disconnected?',
    ],
    tags: ['netdata', 'architecture', 'streaming'],
  },
  {
    id: 'itv-mymon-33',
    level: 'intermediate',
    kind: 'open',
    prompt: 'How is Netdata different from Prometheus and Grafana?',
    probing:
      'Whether you can position Netdata, Prometheus and Grafana without calling one universally better.',
    answer: [
      'Netdata focuses on an integrated Agent: automatic collectors, real-time dashboards and health alerts with almost no setup. Prometheus is a time-series system built around labeled scraping, querying and rules, and is commonly used for services and Kubernetes. Grafana visualizes data from many different sources.',
      'The three can coexist. Netdata handles rapid diagnosis on a single node, Prometheus handles selected platform and application metrics with a long-term architecture, and Grafana gives you shared dashboards across sources.',
      'I pick between them based on scale, retention needs, query language, how well application instrumentation is exposed, integrations, operational effort, access and data residency requirements, and cost — not by declaring one tool universally better.',
      '**Where it fits**: A good-looking dashboard isn\'t the whole job. Alerts still need an owner and a runbook, and user-facing service SLIs still need application or synthetic instrumentation on top of what Netdata collects. Netdata is strongest for fast infrastructure visibility; it\'s not a replacement for defining what "healthy" means for your actual service.',
    ],
    tags: ['netdata', 'prometheus', 'grafana'],
  },
]
