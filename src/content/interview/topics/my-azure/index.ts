import type { InterviewTopic } from '../../../types'
import { myAzureCoreQuestions } from './core'
import { myAzureServicesQuestions } from './services'
import { myAzureArchitectureQuestions } from './architecture'
import { myAzureBicepQuestions } from './bicep'

export const myAzureTopic: InterviewTopic = {
  id: 'my-azure',
  group: 'bank',
  title: 'My Azure questions',
  shortTitle: 'My Azure',
  icon: '☁️',
  order: 101,
  oneLiner:
    'My own Azure notes: fundamentals and quick-fire facts, core services, identity and Key Vault, governance, architecture patterns and Bicep.',
  headlines: [
    'IaaS gives the most control and responsibility, SaaS the least; PaaS sits between and is what most application teams use.',
    'Entra ID authenticates, Azure RBAC authorises. Apply the right principal, the right role, at the right scope.',
    'A subscription Owner is not a Key Vault data-plane role: reading secrets needs a data-plane role or access policy.',
    'Roll out Azure Policy in audit mode first, fix what is non-compliant, then deny. Exceptions need an owner and an expiry.',
    'Availability Zones survive a datacenter failure; only multi-region replication and tested failover survive a regional one.',
    'Stopped is not Stopped (deallocated): only deallocation releases compute billing, and disks still cost money.',
    'Bicep compiles to ARM JSON with no state file; validate and run what-if before every production deploy.',
    'Prefer managed identity and workload identity federation over stored secrets everywhere.',
  ],
  questions: [
    ...myAzureCoreQuestions,
    ...myAzureServicesQuestions,
    ...myAzureArchitectureQuestions,
    ...myAzureBicepQuestions,
  ],
}
