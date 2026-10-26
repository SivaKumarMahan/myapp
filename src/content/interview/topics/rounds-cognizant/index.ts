import type { InterviewTopic } from '../../../types'
import { roundsCognizantAksHelmQuestions } from './aks-helm'
import { roundsCognizantPipelineQuestions } from './pipelines'

export const roundsCognizantTopic: InterviewTopic = {
  id: 'rounds-cognizant',
  group: 'rounds',
  title: 'Cognizant rounds',
  shortTitle: 'Cognizant',
  icon: '🏢',
  order: 207,
  oneLiner:
    'Questions from the Cognizant round: AKS deprecated APIs, upgrades and autoscaling, Ingress, GitHub Actions triggers, Azure DevOps agents, variables, secrets and templates, Helm charts and Azure Front Door.',
  headlines: [
    'Check deprecated APIs with Pluto (manifests, Helm output) and kubent (live cluster) as a pipeline gate before every AKS upgrade.',
    'AKS upgrades go one minor version at a time, dev then QA then prod, because a control plane upgrade cannot be rolled back.',
    'HPA scales Pods (needs CPU requests); Cluster Autoscaler scales nodes when Pods stay Pending.',
    'In GitHub Actions, the on keyword decides when a workflow runs; a run step executes shell commands and a uses step calls an existing action.',
    'Secrets live in Key Vault, reach the pipeline through a workload-identity service connection and a linked variable group, and must be mapped to scripts with env.',
    'Helm: one chart, one values file per environment passed with -f; _helpers.tpl holds named templates and NOTES.txt is only printed, never run.',
    'Azure Front Door is a global Layer 7 entry point with probes, WAF and caching; it fails over traffic, not your data.',
  ],
  questions: [...roundsCognizantAksHelmQuestions, ...roundsCognizantPipelineQuestions].sort(
    (a, b) => Number(a.id.split('-').pop()) - Number(b.id.split('-').pop()),
  ),
}
