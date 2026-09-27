import type { InterviewTopic } from '../../../types'
import { roundsDeloitteChoiceQuestions } from './choice'
import { roundsDeloitteTroubleshootingQuestions } from './troubleshooting'
import { roundsDeloittePipelineQuestions } from './pipelines'
import { roundsDeloitteSecurityQuestions } from './security'
import { roundsDeloitteAutomationQuestions } from './automation'

export const roundsDeloitteTopic: InterviewTopic = {
  id: 'rounds-deloitte',
  group: 'rounds',
  title: 'Deloitte LLP rounds',
  shortTitle: 'Deloitte',
  icon: '🏢',
  order: 201,
  oneLiner:
    'Questions recalled from the Deloitte LLP technical rounds: Terraform recovery and state, AKS troubleshooting, Azure DevOps pipelines, secrets, Trivy, automation scripts and the online MCQs.',
  headlines: [
    'Terraform failed mid-apply: read the error, check `terraform state list` against Azure, fix, `terraform plan`, apply. Import what exists but is not in state; `force-unlock` only a stale lock.',
    'Pods `1/1 Running` with 502/504: walk Application Gateway, Ingress, Service, Pod, PostgreSQL. `kubectl get endpoints` is the key command - a Service can have zero endpoints.',
    'CrashLoopBackOff: `kubectl describe pod`, `kubectl logs --previous`, termination reason, fix, then `kubectl rollout status` and check Service/Ingress.',
    'Build once, scan once, push one immutable image and promote the same tag from Dev to Prod. Build -> Scan -> Fail/Pass -> Push -> Deploy.',
    'Trivy as a gate: `--severity HIGH,CRITICAL --exit-code 1`, scan before the ACR push, and handle unfixable CVEs through a documented exception, not a bare `.trivyignore`.',
    'Never put secrets in YAML, Dockerfiles or build args: Key Vault (variable groups, CSI driver, Workload Identity), least-privilege service connections, rotate anything exposed.',
    'One job runs on one agent: split work into jobs for parallelism or different pools, and use `dependsOn` for order. Templates with parameters remove YAML duplication.',
    'One company-wide state file works with a locked remote backend, but split state by environment and component to shrink blast radius and contention.',
  ],
  questions: [
    ...roundsDeloitteTroubleshootingQuestions,
    ...roundsDeloittePipelineQuestions,
    ...roundsDeloitteSecurityQuestions,
    ...roundsDeloitteAutomationQuestions,
    ...roundsDeloitteChoiceQuestions,
  ],
}
