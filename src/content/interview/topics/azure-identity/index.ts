import type { InterviewTopic } from '../../../types'
import { azureIdentityEntraQuestions } from './entra'
import { azureIdentityRbacQuestions } from './rbac'
import { azureIdentityAccessQuestions } from './access'
import { azureIdentityWorkloadQuestions } from './workload'

export const azureIdentityTopic: InterviewTopic = {
  id: 'azure-identity',
  title: 'Entra ID, RBAC & identity',
  shortTitle: 'Identity',
  icon: '🔐',
  order: 2,
  oneLiner:
    'Tenants, service principals and managed identities, RBAC versus Entra roles, PIM, Conditional Access, federation and the 403 you will be asked to debug.',
  headlines: [
    'A subscription trusts exactly **one** tenant. Entra roles manage the directory; Azure RBAC roles manage resources. Global Admin has no resource access by default.',
    'App registration = the global application object and its credentials. Service principal (enterprise app) = its identity in one tenant, where roles and consent live.',
    'Managed identity first: system-assigned dies with the resource; user-assigned is shared, pre-grantable and survives recreation.',
    'Contributor cannot write role assignments or read data-plane content. NotActions is not a deny.',
    'Conditional Access policies combine - there is no order, and a block wins. Report-only first, break-glass always excluded.',
    'Workload identity federation: an exact issuer + subject + audience match replaces the client secret. Adding a GitHub environment changes the subject.',
    'Key Vault: use the RBAC model. With access policies, a Contributor can grant themselves every secret. Enable purge protection.',
    '403 AuthorizationFailed: read the object ID, action and scope in the error before touching anything.',
  ],
  questions: [
    ...azureIdentityEntraQuestions,
    ...azureIdentityRbacQuestions,
    ...azureIdentityAccessQuestions,
    ...azureIdentityWorkloadQuestions,
  ],
}
