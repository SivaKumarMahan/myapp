import type { InterviewTopic } from '../../../types'
import { myStudyScenariosKubernetesQuestions } from './kubernetes'
import { myStudyScenariosCicdQuestions } from './cicd'
import { myStudyScenariosJenkinsQuestions } from './jenkins'
import { myStudyScenariosTerraformQuestions } from './terraform'
import { myStudyScenariosScriptQuestions } from './scripts'

export const myStudyScenariosTopic: InterviewTopic = {
  id: 'my-study-scenarios',
  group: 'bank',
  title: 'Study: scenario rounds',
  shortTitle: 'Study: scenarios',
  icon: '🧭',
  order: 119,
  oneLiner:
    'Scenario and troubleshooting rounds from my study notes - broken YAML, 503s and 502/504s, OOMKilled, image pulls, leaked secrets, Trivy gates, Terraform plans and locks, Jenkins runbooks and shell/Python debugging.',
  headlines: [
    '"Running" is not "working": check `kubectl get endpoints`, readiness, events and logs, then test inside the cluster to isolate app vs Service vs Ingress.',
    'OOMKilled + exit code 137 = memory limit hit (128 + SIGKILL). Compare `kubectl top` with the limit and rule out a leak before raising it.',
    'Slow starters need a `startupProbe`; an early liveness probe kills the app mid-boot and creates a restart loop.',
    'Never hardcode or `echo` secrets: Key Vault-linked variable groups, Jenkins `credentials()`, OIDC/workload identity for Terraform.',
    'A one-line change with a big plan: classify the plan, then check drift (`plan -refresh-only`), state, provider/module versions, dependencies and the backend in use.',
    'Terraform concurrency: remote backend locking plus one apply per environment; only `force-unlock` a lock confirmed stale.',
    'Jenkins HA is not active-active controllers: durable JENKINS_HOME, backups, redundant agents, tested DR with RPO/RTO.',
    'Do not bypass a CRITICAL Trivy finding - patch and rescan, or a documented, time-boxed `.trivyignore` entry with sign-off.',
  ],
  questions: [
    ...myStudyScenariosKubernetesQuestions,
    ...myStudyScenariosCicdQuestions,
    ...myStudyScenariosJenkinsQuestions,
    ...myStudyScenariosTerraformQuestions,
    ...myStudyScenariosScriptQuestions,
  ],
}
