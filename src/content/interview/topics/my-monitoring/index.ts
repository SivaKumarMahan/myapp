import type { InterviewTopic } from '../../../types'
import { myMonitoringObservabilityQuestions } from './observability'
import { myMonitoringPrometheusGrafanaQuestions } from './prometheus-grafana'
import { myMonitoringLoggingQuestions } from './logging'
import { myMonitoringPlatformQuestions } from './platforms'

export const myMonitoringTopic: InterviewTopic = {
  id: 'my-monitoring',
  group: 'bank',
  title: 'My monitoring & observability questions',
  shortTitle: 'My monitoring',
  icon: '📈',
  order: 115,
  oneLiner:
    'My own monitoring notes: golden signals and SLO alerting, Prometheus, Alertmanager, Grafana, logging with Loki and ELK, APM, and monitoring AWS, Azure, Kubernetes, hosts, databases and pipelines.',
  headlines: [
    'Golden signals: latency, traffic, errors and saturation (how close a resource is to its limit). Healthy hosts do not prove healthy users.',
    'Alert on sustained, actionable symptoms or SLO burn with multi-window, multi-burn-rate rules; diagnostic detail belongs on dashboards.',
    'Metrics tell you when and where, traces show which hop, logs explain why. Share service, version and trace ID across all three.',
    'Never put request IDs, user IDs or timestamps in metric or Loki labels - every unique combination is a new series (cardinality).',
    'Counters need `rate()` or `increase()`; histograms can be aggregated server-side and estimated with `histogram_quantile()`.',
    'Prometheus evaluates rules; Alertmanager groups, deduplicates, inhibits, silences and routes. Keep receiver credentials in secrets.',
    'An enabled diagnostic setting or a created alert is not monitoring until a known test event arrives and the notification really fires.',
    'CloudWatch shows the symptom; CloudTrail shows who changed what. Control observability cost by owner and signal type without cutting audit evidence.',
  ],
  questions: [
    ...myMonitoringObservabilityQuestions,
    ...myMonitoringPrometheusGrafanaQuestions,
    ...myMonitoringLoggingQuestions,
    ...myMonitoringPlatformQuestions,
  ],
}
