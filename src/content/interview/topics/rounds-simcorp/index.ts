import type { InterviewTopic } from '../../../types'
import { roundsSimcorpPlatformQuestions } from './platform'
import { roundsSimcorpDatabaseQuestions } from './databases'
import { roundsSimcorpProjectQuestions } from './project'

export const roundsSimcorpTopic: InterviewTopic = {
  id: 'rounds-simcorp',
  group: 'rounds',
  title: 'SimCorp rounds',
  shortTitle: 'SimCorp',
  icon: '🏢',
  order: 204,
  oneLiner:
    'Questions from the SimCorp round: AKS upgrades, CI/CD quality gates, Key Vault secrets and rotation, DR, a memory-leak incident, SQL and PostgreSQL troubleshooting.',
  headlines: [
    'AKS upgrades are rolling: replicas, PodDisruptionBudgets, readiness probes and spare node capacity keep them zero-downtime.',
    'Pick one concrete upgrade problem (for example a zero-disruption PDB blocking drain) and explain detect, fix, validate.',
    'One reusable multi-stage YAML pipeline per application, with environment stages, variable groups and approvals.',
    'Rotating a Key Vault secret causes no downtime by itself; apps that read it only at startup need a rolling restart.',
    'Separate subscriptions in one region are isolation, not DR. DR needs a second region sized to RTO and RPO.',
    'Raising a memory limit is mitigation, not a fix for a memory leak.',
    'AKS cannot reach PostgreSQL? Go layer by layer: logs, config, DNS, TCP 5432, network path, auth, database health.',
  ],
  questions: [
    ...roundsSimcorpPlatformQuestions,
    ...roundsSimcorpDatabaseQuestions,
    ...roundsSimcorpProjectQuestions,
  ],
}
