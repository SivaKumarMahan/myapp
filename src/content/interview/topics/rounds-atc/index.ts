import type { InterviewTopic } from '../../../types'
import { roundsAtcKubernetesQuestions } from './containers-kubernetes'
import { roundsAtcPlatformQuestions } from './terraform-networking-jenkins'

export const roundsAtcTopic: InterviewTopic = {
  id: 'rounds-atc',
  group: 'rounds',
  title: 'ATC rounds',
  shortTitle: 'ATC',
  icon: '🏢',
  order: 203,
  oneLiner:
    'Questions from the ATC round: Kubernetes access and Services, container isolation, Terraform authentication and provisioners, load balancers and Jenkins pipelines.',
  headlines: [
    'Containers are isolated by namespaces (what a process can see) and limited by cgroups (what it can use).',
    'Terraform to Azure: az login locally, workload identity federation in CI, managed identity on Azure hosts.',
    'Provisioners are a last resort; prefer cloud-init, VM extensions, Ansible or Packer images.',
    'Layer 4 routes by IP and port (Azure Load Balancer); Layer 7 understands HTTP (Application Gateway, NGINX Ingress).',
    'An Ingress resource does nothing without an Ingress Controller; one controller gives many apps a single IP.',
    'Service types: ClusterIP (default), NodePort, LoadBalancer, ExternalName, plus headless for StatefulSets.',
    'A Declarative Pipeline needs an agent, and work inside a stage must sit in steps (or parallel, matrix, stages).',
  ],
  questions: [...roundsAtcKubernetesQuestions, ...roundsAtcPlatformQuestions],
}
