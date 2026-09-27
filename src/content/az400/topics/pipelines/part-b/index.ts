import type { Topic } from '../../../../types'
import { az4DeploymentStrategies } from './deployment-strategies'
import { az4EnvironmentsApprovals } from './environments-approvals'
import { az4IacPipelines } from './iac-pipelines'
import { az4PipelineMaintenance } from './pipeline-maintenance'
import { az4PipelineTemplates } from './pipeline-templates'

/** Part B of the build and release domain: lessons 6-10, in teaching order. */
export const az400PipelinesPartBTopics: Topic[] = [
  az4PipelineTemplates,
  az4DeploymentStrategies,
  az4EnvironmentsApprovals,
  az4IacPipelines,
  az4PipelineMaintenance,
]
