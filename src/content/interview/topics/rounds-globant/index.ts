import type { InterviewTopic } from '../../../types'
import { roundsGlobantPart1Questions } from './part1'
import { roundsGlobantPart2Questions } from './part2'
import { roundsGlobantPart3aQuestions } from './part3a'
import { roundsGlobantPart3bQuestions } from './part3b'

export const roundsGlobantTopic: InterviewTopic = {
  id: 'rounds-globant',
  group: 'rounds',
  title: 'Globant rounds',
  shortTitle: 'Globant',
  icon: '🏢',
  order: 213,
  oneLiner:
    'Questions from the Globant rounds: Kubernetes workloads, autoscaling and traffic flow, Terraform state and recreation, Azure DevOps stages and agents, networking and private endpoints, WAF, Container Apps, HA/DR, managed identities and SRE metrics.',
  headlines: [
    'Deployment for stateless apps, StatefulSet for stable identity and storage, DaemonSet for one Pod per node (log and monitoring agents).',
    'HPA adds Pods on load, VPA right-sizes requests, maxSurge and maxUnavailable decide how a rolling update swaps Pods.',
    'A clean plan can still fail on apply (permissions, quotas, name clashes); import resources that already exist and use lifecycle or moved blocks to avoid recreation.',
    'NSGs are stateful: an allowed inbound ping gets its reply back without an outbound rule. Private endpoints give a private IP; service endpoints only secure the route.',
    'A private endpoint 403 is usually DNS, firewall or RBAC: check the private DNS zone link, the Key Vault network rules and the identity role assignment.',
    'GRS replicates data, but you still plan failover, DNS and app config; HA keeps you up in a region, DR brings you back in another.',
    'Error budget = 100% minus the SLO; reduce MTTR with good alerts, runbooks and automation, and track SLIs that match what users feel.',
    'Container Apps is serverless containers with built-in scaling and revisions; AKS gives full Kubernetes control at the cost of running it.',
  ],
  questions: [
    ...roundsGlobantPart1Questions,
    ...roundsGlobantPart2Questions,
    ...roundsGlobantPart3aQuestions,
    ...roundsGlobantPart3bQuestions,
  ],
}
