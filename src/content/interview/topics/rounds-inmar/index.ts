import type { InterviewTopic } from '../../../types'
import { roundsInmarKubernetesQuestions } from './kubernetes'
import { roundsInmarNetworkingQuestions } from './networking'
import { roundsInmarTerraformQuestions } from './terraform'
import { roundsInmarIdentityQuestions } from './identity'

export const roundsInmarTopic: InterviewTopic = {
  id: 'rounds-inmar',
  group: 'rounds',
  title: 'Inmar rounds',
  shortTitle: 'Inmar',
  icon: '🏢',
  order: 209,
  oneLiner:
    'Questions from the Inmar round: Kubernetes workloads, storage and CSI, networking basics and TLS, Terraform state and variables, Bicep, and Azure identity.',
  headlines: [
    'OOMKilled (exit code 137) means the container passed its own memory limit; a slow climb is a leak, a jump is traffic.',
    'A LoadBalancer Service gets an Azure Load Balancer IP via the cloud controller manager; prefer one Ingress for HTTP apps.',
    'StorageClass says how, PVC asks, PV is the disk; CSI drivers do the work, and Key Vault reaches pods through the Secrets Store CSI driver.',
    'Kubernetes Secrets are only base64-encoded; use KMS etcd encryption in AKS and keep real secrets in Key Vault.',
    'The azurerm backend locks state with a blob lease; plan and apply both take the lock, and force-unlock is the last resort.',
    'Bicep has no state file: Azure Resource Manager is the state, what-if previews changes, and deployment stacks handle removed resources.',
    'App registration is the global app object, the enterprise application its service principal; federated credentials (issuer, exact subject, audience) remove stored secrets.',
    'Interview tip: describe only the work you actually performed, and say so when another team configured a tool such as KMS etcd encryption or deployment stacks.',
  ],
  questions: [
    ...roundsInmarKubernetesQuestions,
    ...roundsInmarNetworkingQuestions,
    ...roundsInmarTerraformQuestions,
    ...roundsInmarIdentityQuestions,
  ],
}
