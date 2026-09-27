import type { InterviewTopic } from '../../../types'
import { azureComputeVmQuestions } from './vms'
import { azureComputeAppServiceQuestions } from './appservice'
import { azureComputeContainerQuestions } from './containers'
import { azureComputeAksQuestions } from './aks'

export const azureComputeTopic: InterviewTopic = {
  id: 'azure-compute',
  title: 'Azure compute, App Service & AKS',
  shortTitle: 'Compute',
  icon: '🖥️',
  order: 4,
  oneLiner:
    'VM sizing and scale sets, App Service plans and slots, Functions plans and cold start, choosing a container platform, and running AKS in production.',
  headlines: [
    'Availability set = racks in one datacenter (about 99.95%); zones = separate datacenters (99.99%). VMSS Flexible across zones is the modern default.',
    'The App Service **plan** is the compute and the bill; every app on it runs on every instance. Scale out for load, scale up for per-request size or features.',
    'A slot swap warms the target with production settings before switching traffic. Mark per-environment settings **sticky**; rollback is swapping back.',
    'App Service codes: 500 = the app threw, 502 = the worker did not answer properly, 503 = no healthy instance.',
    'Flex Consumption is the default serverless Functions plan; always-ready instances remove cold start without paying for Premium.',
    'Container Apps for microservices without cluster ops; AKS when you need the Kubernetes API itself.',
    'AKS: Azure CNI Overlay (+ Cilium) saves VNet IPs; Workload ID federates a service account to a managed identity; the cluster autoscaler reacts to Pending pods, not CPU.',
    'Stuck node pool upgrade? Check `kubectl get pdb -A` for zero allowed disruptions, then surge quota.',
  ],
  questions: [
    ...azureComputeVmQuestions,
    ...azureComputeAppServiceQuestions,
    ...azureComputeContainerQuestions,
    ...azureComputeAksQuestions,
  ],
}
