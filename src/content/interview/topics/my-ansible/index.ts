import type { InterviewTopic } from '../../../types'
import { myAnsibleQuestions } from './questions'
import { myAnsibleFundamentalsQuestions } from './fundamentals'
import { myAnsibleProductionQuestions } from './production'

export const myAnsibleTopic: InterviewTopic = {
  id: 'my-ansible',
  group: 'bank',
  title: 'My Ansible questions',
  shortTitle: 'My Ansible',
  icon: '📋',
  order: 110,
  oneLiner:
    'Agentless SSH automation, inventory and dynamic inventory, playbooks, variables, handlers, Vault and roles, plus safe production rollouts and troubleshooting.',
  headlines: [
    'Ansible is agentless and commonly connects to Linux nodes over SSH; `ping` checks login and Python, not ICMP.',
    'A module performs one action; tasks call modules; plays map tasks to hosts. Prefer idempotent modules over `shell`.',
    'Variables come from many scopes and follow precedence; extra vars have very high precedence.',
    '`when` is a raw Jinja expression without outer `{{ }}`; `loop` repeats a task and uses `item`.',
    'Handlers run when notified by a changed task. Tags select tasks, `--limit` restricts hosts and `--forks` controls parallel workers.',
    '`--syntax-check`, `--check`, `--diff` and canary runs reduce risk but do not replace real verification.',
    'Vault encrypts data at rest; protect decrypted data with access control and `no_log`.',
    'Production work should be reviewed, pinned, limited, batched, monitored and recoverable.',
  ],
  questions: [
    ...myAnsibleQuestions,
    ...myAnsibleFundamentalsQuestions,
    ...myAnsibleProductionQuestions,
  ],
}
