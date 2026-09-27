import type { InterviewTopic } from '../../../types'
import { myAiDriftQuestions } from './drift'
import { myAiCostQuestions } from './cost'
import { myAiK8sAgentQuestions } from './k8s-agent'
import { myAiUpgradeQuestions } from './upgrades'
import { myAiCodeReviewQuestions } from './code-review'

export const myAiTopic: InterviewTopic = {
  id: 'my-ai',
  group: 'bank',
  title: 'My AI for DevOps questions',
  shortTitle: 'My AI',
  icon: '🤖',
  order: 121,
  oneLiner:
    'Your AI-for-DevOps projects — Terraform drift detector, Cloud Cost Detective, Kubernetes troubleshooting agent, upgrade readiness assessor and Claude PR review — explained honestly, end to end.',
  headlines: [
    'Collect evidence deterministically, give AI a narrow reasoning task, validate its structured answer, and keep execution under human approval.',
    'AI never runs `terraform apply`, deletes resources or approves an upgrade — it explains verified findings and drafts reviewable fixes.',
    'Be honest: say "designed and prototyped" unless you can show working code, test evidence and measured results.',
    '"Not observed" is not "deleted" — a partial collection must never produce false missing-resource drift.',
    'Prices, savings, scores and compatibility come from trusted data and rules, never from the LLM.',
    'Treat logs, tags, annotations and resource names as untrusted input: prompt injection can hide there.',
    'Confidence must reflect evidence coverage and agreement, not the percentage the model prints.',
    'Claude PR review: one reusable workflow, composable prompts, and a token that can only comment.',
  ],
  questions: [
    ...myAiDriftQuestions,
    ...myAiCostQuestions,
    ...myAiK8sAgentQuestions,
    ...myAiUpgradeQuestions,
    ...myAiCodeReviewQuestions,
  ],
}
