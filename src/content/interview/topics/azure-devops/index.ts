import type { InterviewTopic } from '../../../types'
import { azureDevopsPlatformQuestions } from './platform'
import { azureDevopsSecurityQuestions } from './security'
import { azureDevopsDeliveryQuestions } from './delivery'

export const azureDevopsTopic: InterviewTopic = {
  id: 'azure-devops',
  title: 'Azure DevOps & pipelines',
  shortTitle: 'Azure DevOps',
  icon: '🔁',
  order: 6,
  oneLiner:
    'Multi-stage YAML, templates and expressions, agents and Managed DevOps Pools, federated service connections, checks that cannot be edited away, and debugging runs that will not start.',
  headlines: [
    'Jobs in a stage run in parallel on separate agents. Files move with artifacts, values with output variables.',
    '`${{ }}` is compile time and can change structure; `$[ ]` is runtime; `$(x)` is a macro replaced before a task runs.',
    'For Azure Repos Git, PR validation is a **build validation branch policy**; the YAML `pr:` trigger is for GitHub and Bitbucket.',
    'Workload identity federation: no secret, and the subject `sc://org/project/connection` must match exactly - renames break it.',
    'Checks live on **protected resources** (environments, service connections, pools, variable groups), so editing YAML cannot remove them.',
    'A stage condition is convenience, not a control. Put branch control on the production service connection too.',
    'Microsoft-hosted agents cannot reach private endpoints; Managed DevOps Pools with VNet injection can.',
    'Pin images, tools and template refs. "Nothing changed" failures are usually a moving dependency.',
  ],
  questions: [
    ...azureDevopsPlatformQuestions,
    ...azureDevopsSecurityQuestions,
    ...azureDevopsDeliveryQuestions,
  ],
}
