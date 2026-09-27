import type { Topic } from '../../../types'
import { az1EntraUsersGroups } from './entra-users-groups'
import { az1Rbac } from './rbac'
import { az1SubscriptionsGovernance } from './subscriptions-governance'
import { az1AzurePolicy } from './azure-policy'

/** Lessons in this domain, in teaching order. */
export const az104IdentityTopics: Topic[] = [
  az1EntraUsersGroups,
  az1Rbac,
  az1SubscriptionsGovernance,
  az1AzurePolicy,
]
