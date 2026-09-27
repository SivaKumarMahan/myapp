import type { InterviewTopic } from '../../../types'
import { myTerraformCoreQuestions } from './core'
import { myTerraformOperationsQuestions } from './operations'
import { myTerraformScenarioQuestions } from './scenarios'
import { myTerraformNotesQuestions } from './notes'

export const myTerraformTopic: InterviewTopic = {
  id: 'my-terraform',
  group: 'bank',
  title: 'My Terraform questions',
  shortTitle: 'My Terraform',
  icon: '🏗️',
  order: 103,
  oneLiner:
    'My own Terraform bank: state and backends, drift, modules and environments, safe CI/CD, recovery scenarios and the functions I actually use.',
  headlines: [
    'Plan first, save it with `-out`, and apply exactly the reviewed plan file.',
    'State is sensitive: remote, encrypted, versioned, locked, one key per environment. `sensitive = true` only hides CLI output.',
    'Prefer separate root folders and state for long-lived dev, test and prod; workspaces suit short-lived or nearly identical copies.',
    '`terraform taint` and `terraform refresh` are deprecated: use `apply -replace=<address>` and `-refresh-only`.',
    'Drift: detect with `plan -detailed-exitcode` (exit code 2), decide with the owner, then update the code, restore, or import.',
    'Write the configuration before you import, and use `moved` blocks instead of hand-editing state.',
    '`prevent_destroy` alone is not full protection. Add deletion protection, policy checks and backups.',
    'A successful apply proves the API calls worked, not that the service works.',
  ],
  questions: [
    ...myTerraformCoreQuestions,
    ...myTerraformOperationsQuestions,
    ...myTerraformScenarioQuestions,
    ...myTerraformNotesQuestions,
  ],
}
