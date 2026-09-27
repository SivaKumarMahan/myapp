import type { Topic } from '../../../types'
import { costManagement } from './cost-management'
import { governanceCompliance } from './governance-compliance'
import { deploymentTools } from './deployment-tools'
import { monitoringTools } from './monitoring-tools'

/** Lessons in this domain, in teaching order. */
export const az900ManagementTopics: Topic[] = [
  costManagement,
  governanceCompliance,
  deploymentTools,
  monitoringTools,
]
