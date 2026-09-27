import type { Topic } from '../../../../types'
import { packageManagement } from './package-management'
import { testingStrategy } from './testing-strategy'
import { yamlPipelines } from './yaml-pipelines'
import { agentsRunners } from './agents-runners'
import { githubActions } from './github-actions'

/** Pipelines domain, part A (orders 1-5). */
export const az400PipelinesPartATopics: Topic[] = [
  packageManagement,
  testingStrategy,
  yamlPipelines,
  agentsRunners,
  githubActions,
]
