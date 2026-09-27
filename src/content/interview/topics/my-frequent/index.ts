import type { InterviewTopic } from '../../../types'
import { myFrequentSecurityQuestions } from './security'
import { myFrequentAutomationQuestions } from './automation'
import { myFrequentPipelineQuestions } from './pipelines'
import { myFrequentReleaseQuestions } from './releases'
import { myFrequentAzureQuestions } from './azure'

export const myFrequentTopic: InterviewTopic = {
  id: 'my-frequent',
  group: 'bank',
  title: 'Frequently asked questions',
  shortTitle: 'Frequently asked',
  icon: '🔂',
  order: 118,
  oneLiner:
    'The questions that come up in almost every round: CI/CD flow and sample pipelines, branching, rollback and zero-downtime releases, Production incidents, secrets, security, cost, storage, 3-tier architecture and automation scripts.',
  headlines: [
    'Build one versioned image, scan it, and promote that same image through Dev to Production - never rebuild, never deploy `latest`.',
    'Production incidents: impact, evidence (Events, logs, metrics, recent changes), restore, verify as a user, fix the cause, prevent recurrence - told with STAR.',
    'Rollback: confirm the change caused it, pause, restore the last known good version, verify through the external URL; databases need backward-compatible changes.',
    'Zero downtime: multiple replicas, `maxUnavailable: 0`, readiness and startup probes, graceful shutdown, enough capacity for the surge Pod.',
    'Secrets live in Key Vault, reached through managed or workload identity with least-privilege RBAC; an exposed secret is rotated first, not just deleted from Git.',
    'Security is layered: identity, secrets, network, secure code, pipeline scans, non-root images, Kubernetes policies, encryption, patching and monitoring.',
    '3-tier rule: Internet -> Gateway -> Web -> App -> Database. Never Internet -> Database.',
    'Cost savings need proof: compare Azure Cost Management before and after, and show performance stayed within limits.',
  ],
  questions: [
    ...myFrequentPipelineQuestions,
    ...myFrequentReleaseQuestions,
    ...myFrequentSecurityQuestions,
    ...myFrequentAzureQuestions,
    ...myFrequentAutomationQuestions,
  ],
}
