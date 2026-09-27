import type { InterviewTopic } from '../../../types'
import { azureFundamentalsCoreQuestions } from './core'
import { azureFundamentalsReliabilityQuestions } from './reliability'
import { azureFundamentalsCostQuestions } from './cost'
import { azureFundamentalsGovernanceQuestions } from './governance'

export const azureFundamentalsTopic: InterviewTopic = {
  id: 'azure-fundamentals',
  title: 'Azure core & architecture',
  shortTitle: 'Azure core',
  icon: '☁️',
  order: 1,
  oneLiner:
    'Regions and zones, the resource hierarchy, ARM, SLAs, cost levers and landing zones - the platform questions every Azure round opens with.',
  headlines: [
    'Zones protect against a **datacenter** failure with synchronous replication; a second region protects against a **regional** one, usually with RPO above zero.',
    'Tenant = identity, management group = policy at scale, subscription = billing and quota boundary, resource group = shared lifecycle. RBAC, Policy and locks inherit downward.',
    'Everything management-side goes through **ARM** (control plane). Reading a blob or a secret is the **data plane** and needs its own roles.',
    'Serial dependencies **multiply** SLAs: 99.95% x 99.99% is about 99.94%. Only parallel redundancy raises the number.',
    'Reservations for steady, fixed SKUs; savings plans for steady spend that changes shape; spot only for interruptible work; Hybrid Benefit for licences you already own.',
    'Landing zones: platform subscriptions (identity, connectivity, management) plus vended application subscriptions that inherit policy from management groups.',
    'Read the ARM error code first: RequestDisallowedByPolicy, QuotaExceeded, AuthorizationFailed and ScopeLocked each have a different owner.',
  ],
  questions: [
    ...azureFundamentalsCoreQuestions,
    ...azureFundamentalsReliabilityQuestions,
    ...azureFundamentalsCostQuestions,
    ...azureFundamentalsGovernanceQuestions,
  ],
}
