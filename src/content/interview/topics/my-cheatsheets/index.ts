import type { InterviewTopic } from '../../../types'
import { myCheatsheetsPlatformQuestions } from './platform'
import { myCheatsheetsToolingQuestions } from './tooling'

export const myCheatsheetsTopic: InterviewTopic = {
  id: 'my-cheatsheets',
  group: 'bank',
  title: 'My command cheat sheets',
  shortTitle: 'My cheat sheets',
  icon: '📝',
  order: 117,
  oneLiner:
    'My own command cheat sheets for kubectl, Docker, Git, Terraform, Linux, Ansible, Argo CD, Jenkins, GitHub Actions, AWS CLI, TLS and safe shell scripts - with the safety notes that go with them.',
  headlines: [
    'Always confirm the kubectl context and namespace before a change; prefer `kubectl diff` and `--dry-run=server` first.',
    'Terraform: `fmt`, `validate`, `plan -out=tfplan`, review, then `apply tfplan`. `-detailed-exitcode` returns 0 no changes, 1 error, 2 changes.',
    'Prefer `terraform apply -replace=<address>` over the deprecated `terraform taint`, and back up state before state operations.',
    'Git: `pull --ff-only`, `revert` for published commits, `push --force-with-lease` only on your own branch, and `reflog` to recover.',
    'Docker: run images by digest in production; use `docker exec` rather than `attach`; containers reach each other by name on user-defined networks.',
    'Ansible `ping` checks SSH and Python, not ICMP; run `--syntax-check`, `--check --diff` and a canary `--limit` before the full play.',
    'Preview with `find ... -print` before `-delete`, check `lsof +L1` for deleted-but-open files, and prefer logrotate over manual cleanup.',
    'Scripts start with `set -Eeuo pipefail`; never embed passwords, and never pass secrets on the command line.',
  ],
  questions: [...myCheatsheetsPlatformQuestions, ...myCheatsheetsToolingQuestions],
}
