import type { InterviewTopic } from '../../../types'
import { roundsEpamPart1Questions } from './part1'
import { roundsEpamPart2Questions } from './part2'
import { roundsEpamPart3Questions } from './part3'

export const roundsEpamTopic: InterviewTopic = {
  id: 'rounds-epam',
  group: 'rounds',
  title: 'EPAM rounds',
  shortTitle: 'EPAM',
  icon: '🏢',
  order: 208,
  oneLiner:
    'Questions from the EPAM rounds: shell scripting, Azure security and cost, private AKS, Key Vault and Workload Identity, autoscaling, monitoring, Terraform and Azure DevOps pipelines.',
  headlines: [
    'Ping and SSH loops: use timeouts and `BatchMode=yes`, use `ssh -n` so ssh does not swallow the while-read input, and remember a failed ping is not proof a host is down.',
    'A public Storage Account is two settings: public network access and anonymous blob access. Close both, then enforce with Azure Policy and Private Endpoints.',
    'CrashLoopBackOff: `describe`, then `logs --previous`, then the exit code (137 = OOMKilled). Only a failing liveness probe restarts the container.',
    'Private AKS: the API server gets a private IP, so link the private DNS zone to every VNet that needs it, and run CI/CD from a self-hosted agent inside the network.',
    'Build the image once and promote it by digest; run `terraform plan -out` and apply only the reviewed plan behind an environment approval.',
    'HPA scales pods, VPA right-sizes requests, Cluster Autoscaler adds nodes only for unschedulable pods. Keep VPA in recommendation mode when HPA scales on CPU.',
    'Workload ID chain: OIDC issuer -> federated credential matching namespace and ServiceAccount -> client-id annotation and pod label -> Key Vault Secrets User.',
    'Overlapping CIDRs block peering and VPN routing: prevent them with a central IP plan and `cidrsubnet`; use `for_each` over a map, and a `moved` block to rename without recreating.',
  ],
  questions: [
    ...roundsEpamPart1Questions,
    ...roundsEpamPart2Questions,
    ...roundsEpamPart3Questions,
  ],
}
