import type { InterviewTopic } from '../../../types'
import { myLinuxCoreQuestions } from './linux-core'
import { myLinuxStorageQuestions } from './linux-storage'
import { myLinuxNotesQuestions } from './linux-notes'
import { myShellQuestions } from './shell'
import { myWindowsQuestions } from './windows'

export const myLinuxTopic: InterviewTopic = {
  id: 'my-linux',
  group: 'bank',
  title: 'My Linux, shell & Windows questions',
  shortTitle: 'My Linux',
  icon: '🐧',
  order: 111,
  oneLiner:
    'My own Linux, shell scripting and Windows Server notes: processes, permissions, disks and filesystems, logs, cron, SSH, safe Bash scripts and PowerShell operations.',
  headlines: [
    'Gather read-only evidence first; killing a process or rebooting is containment, not a fix.',
    'Disk full: check `df -hT` and `df -i`, stay on one filesystem with `du -x`/`find -xdev`, and look for deleted-but-open files with `lsof +L1`.',
    'Read `available` in `free -h`, not `free`; cache is reclaimable. Sustained swapping, OOM kills and rising latency are real pressure.',
    'Load average counts runnable and I/O-blocked tasks, so compare it to CPU count and use the USE method across CPU, memory, disk and network.',
    'SIGTERM (`kill -15`) first so the process can clean up; SIGKILL (`kill -9`) only when it is genuinely stuck. Zombies cannot be killed - fix the parent.',
    'Least privilege: group-based access, narrow `/etc/sudoers.d/` files edited with `visudo`, keys not passwords, `PermitRootLogin no`.',
    'Production scripts: `set -Eeuo pipefail`, quoted variables, input validation, `mktemp`, a lock, a cleanup trap, meaningful exit codes and no secrets in logs.',
    'A backup is only proven by a restore; an exit code of zero is not proof the data can be recovered.',
  ],
  questions: [
    ...myLinuxCoreQuestions,
    ...myLinuxStorageQuestions,
    ...myLinuxNotesQuestions,
    ...myShellQuestions,
    ...myWindowsQuestions,
  ],
}
