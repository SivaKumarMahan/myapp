import type { InterviewTopic } from '../../../types'
import { myOpsSreQuestions } from './sre'
import { myOpsDevSecOpsQuestions } from './devsecops'
import { myOpsFinOpsGitOpsQuestions } from './finops-gitops'

export const myOpsTopic: InterviewTopic = {
  id: 'my-ops',
  group: 'bank',
  title: 'My SRE, DevSecOps, FinOps & GitOps questions',
  shortTitle: 'My Ops',
  icon: '🛡️',
  order: 116,
  oneLiner:
    'My own operations notes: SRE error budgets and incident management, DevSecOps pipelines and secrets, FinOps cost investigations, GitOps push versus pull, and safe AIOps automation.',
  headlines: [
    'SLI measures reliability, the SLO is the target, and the gap to 100% is the error budget. A spent budget freezes risky releases.',
    'Incidents: one incident commander, clear roles, stabilize first (rollback, traffic shift), preserve evidence, then a blameless review with owned actions.',
    'A committed secret is compromised: revoke and rotate first, check audit logs, then clean history. Deleting the line is never enough.',
    'Prefer short-lived workload identity (OIDC federation) over stored keys; give every pipeline its own least-privilege identity.',
    'Supply chain: pin dependencies and actions by SHA, scan, generate an SBOM, sign with cosign and verify signatures at admission.',
    'GitOps pull model: CI publishes an immutable digest and updates Git; Argo CD or Flux reconciles. Rollback is a Git revert.',
    'Cost spikes: slice by service, account, SKU and tag against a baseline; contain only confirmed waste and never delete unknown stateful resources.',
    'Automated fixes need preconditions, rate limits, a kill switch, audit logs and verification against the SLO - risky actions stay with humans.',
  ],
  questions: [...myOpsSreQuestions, ...myOpsDevSecOpsQuestions, ...myOpsFinOpsGitOpsQuestions],
}
