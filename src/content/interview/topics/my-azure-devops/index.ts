import type { InterviewTopic } from '../../../types'
import { myAzureDevopsPlatformQuestions } from './azure-devops'
import { myAzureDevopsDeliveryQuestions } from './delivery'
import { myCicdQuestions } from './cicd'
import { myCicdScenarioQuestions } from './cicd-scenarios'

export const myAzureDevopsTopic: InterviewTopic = {
  id: 'my-azure-devops',
  group: 'bank',
  title: 'My Azure DevOps & CI questions',
  shortTitle: 'My Azure DevOps',
  icon: '🔁',
  order: 102,
  oneLiner:
    'My Azure DevOps and general CI/CD notes: Repos and branch policies, multi-stage YAML, service connections, protected environments, Key Vault, and the delivery patterns I use everywhere.',
  headlines: [
    'Build the artifact once and promote that exact digest through every environment - never rebuild per environment.',
    'Approvals and checks live on protected resources (environments, service connections, variable groups), so editing YAML cannot remove them.',
    'Prefer workload identity federation or managed identity over PATs and long-lived secrets; scope each service connection to the pipelines that need it.',
    'Fetch only the Key Vault secrets you need at runtime; masking is a last safety net, not a guarantee.',
    'Trivy only becomes a gate when `--exit-code 1` makes findings fail the stage; scan the pushed digest with a pinned scanner.',
    'CI proves quality, CD controls promotion: health and SLO gates, progressive delivery and an independent rollback path.',
    'Database changes use expand-and-contract, because rolling back the app cannot undo a destructive schema change.',
    'Measure before optimising a slow pipeline, and never speed it up by quietly dropping tests or scans.',
  ],
  questions: [
    ...myAzureDevopsPlatformQuestions,
    ...myAzureDevopsDeliveryQuestions,
    ...myCicdQuestions,
    ...myCicdScenarioQuestions,
  ],
}
