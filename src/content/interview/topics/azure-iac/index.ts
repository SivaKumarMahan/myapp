import type { InterviewTopic } from '../../../types'
import { azureIacFoundationQuestions } from './foundations'
import { azureIacBicepQuestions } from './bicep'
import { azureIacTerraformQuestions } from './terraform'
import { azureIacOperationsQuestions } from './operations'

export const azureIacTopic: InterviewTopic = {
  id: 'azure-iac',
  title: 'Bicep, ARM & Terraform on Azure',
  shortTitle: 'IaC on Azure',
  icon: '📐',
  order: 7,
  oneLiner:
    'Bicep versus Terraform, scopes and deployment modes, what-if and deployment stacks, azurerm state and locking, importing brownfield estates, drift and policy as code.',
  headlines: [
    'Bicep compiles to ARM JSON and has **no state file**; Azure is the source of truth. Terraform keeps state you must secure.',
    'Incremental mode (default) never deletes. **Complete** mode deletes anything in the target resource group the template does not list.',
    'Deployment stacks track what they created: `actionOnUnmanage` deletes only those, and deny settings stop portal drift.',
    'What-if is a strong review aid, not a guarantee - it can be noisy and does not evaluate every policy or quota.',
    'The azurerm backend locks state with a **blob lease**; use `use_azuread_auth` and OIDC, never account keys.',
    'azapi reaches any ARM type and API version on day one; `azapi_update_resource` patches a single property.',
    'Brownfield: `import` blocks plus `-generate-config-out` or aztfexport; done means a plan with **no changes**.',
    'Role assignments: `principalType` avoids the Entra replication race; `guid(scope, principal, role)` names make them idempotent.',
  ],
  questions: [
    ...azureIacFoundationQuestions,
    ...azureIacBicepQuestions,
    ...azureIacTerraformQuestions,
    ...azureIacOperationsQuestions,
  ],
}
