import type { InterviewQuestion } from '../../../types'

/** Cheat sheets for Git, Linux, shell scripts, Jenkins and GitHub Actions. */
export const myCheatsheetsToolingQuestions: InterviewQuestion[] = [
  {
    id: 'itv-mycheat-30',
    level: 'basic',
    kind: 'open',
    prompt: 'What are the key Git commands for setup and inspection?',
    probing: 'Whether you can configure Git and inspect status, history, diffs and blame.',
    answer: [
      'These are the Git commands I keep at hand for setup and inspection:',
      "- `git config --global user.name '<name>'`\n- `git config --global user.email '<email>'`\n- `git status`\n- `git remote -v`\n- `git log --oneline --graph --decorate --all`\n- `git diff`\n- `git diff --staged`\n- `git show <commit>`\n- `git blame <file>`",
    ],
    code: [
      {
        title: 'Setup and inspect',
        language: 'bash',
        code: `git config --global user.name '<name>'
git config --global user.email '<email>'
git status
git remote -v
git log --oneline --graph --decorate --all
git diff
git diff --staged
git show <commit>
git blame <file>`,
      },
    ],
    tags: ['git', 'commands'],
  },
  {
    id: 'itv-mycheat-31',
    level: 'basic',
    kind: 'open',
    prompt: 'What are the key Git commands for a feature-branch workflow?',
    probing:
      'Whether you follow a clean branch workflow with fast-forward pulls and partial staging.',
    answer: [
      'These are the Git commands I keep at hand for a feature-branch workflow:',
      "- `git switch main`\n- `git pull --ff-only`\n- `git switch -c <feature-branch>`\n- `git add -p`\n- `git commit -m '<clear message>'`\n- `git push -u origin <feature-branch>`",
    ],
    code: [
      {
        title: 'Branch workflow',
        language: 'bash',
        code: `git switch main
git pull --ff-only
git switch -c <feature-branch>
git add -p
git commit -m '<clear message>'
git push -u origin <feature-branch>`,
      },
    ],
    tags: ['git', 'branching', 'commands'],
  },
  {
    id: 'itv-mycheat-32',
    level: 'intermediate',
    kind: 'open',
    prompt: 'What are the key Git commands for recovery and integration?',
    probing:
      'Whether you know rebase, merge, cherry-pick, revert, reflog and stash, and avoid destructive shortcuts.',
    answer: [
      'These are the Git commands I keep at hand for recovery and integration:',
      "- `git fetch --all --prune`\n- `git rebase origin/main`\n- `git merge <branch>`\n- `git cherry-pick <commit>`\n- `git revert <published-commit>`\n- `git reflog`\n- `git restore <file>`\n- `git restore --staged <file>`\n- `git stash push -m '<reason>'`\n- `git stash list`\n- `git stash pop`",
      'Do not use `reset --hard`, `clean -fd`, or force push as routine cleanup. Inspect targets first. For an owned branch use `git push --force-with-lease`, never a blind force push. Revoke committed secrets before any history cleanup.',
    ],
    code: [
      {
        title: 'Recovery and integration',
        language: 'bash',
        code: `git fetch --all --prune
git rebase origin/main
git merge <branch>
git cherry-pick <commit>
git revert <published-commit>
git reflog
git restore <file>
git restore --staged <file>
git stash push -m '<reason>'
git stash list
git stash pop`,
      },
    ],
    tags: ['git', 'recovery', 'commands'],
  },
  {
    id: 'itv-mycheat-33',
    level: 'basic',
    kind: 'open',
    prompt: 'What are the key Git commands for tagging a release?',
    probing: 'Whether you can create a signed, annotated release tag and push it.',
    answer: [
      'These are the Git commands I keep at hand for release tags:',
      "- `git tag -s <version> -m '<release>'`\n- `git push origin <version>`",
      'A signed tag (`-s`) records who created the release, and the tag has to be pushed explicitly.',
    ],
    code: [
      {
        title: 'Tags',
        language: 'bash',
        code: `git tag -s <version> -m '<release>'
git push origin <version>`,
      },
    ],
    tags: ['git', 'tags', 'releases'],
  },
  {
    id: 'itv-mycheat-34',
    level: 'basic',
    kind: 'open',
    prompt: 'What are the key Linux commands for files and system information?',
    probing:
      'Whether you can check location, recent files, uptime, memory, disk and inode usage quickly.',
    answer: [
      'These are the Linux commands I keep at hand for files and system information:',
      '- `pwd`\n- `ls -lah`\n- `find <path> -type f -mtime -7`\n- `date`\n- `uptime`\n- `whoami`\n- `uname -a`\n- `free -h`\n- `df -hT`\n- `df -ih`\n- `du -xhd1 <path> | sort -h`',
    ],
    code: [
      {
        title: 'Files and system',
        language: 'bash',
        code: `pwd
ls -lah
find <path> -type f -mtime -7
date
uptime
whoami
uname -a
free -h
df -hT
df -ih
du -xhd1 <path> | sort -h`,
      },
    ],
    tags: ['linux', 'commands'],
  },
  {
    id: 'itv-mycheat-35',
    level: 'intermediate',
    kind: 'open',
    prompt: 'What are the key Linux commands for processes and I/O?',
    probing:
      'Whether you can find CPU-heavy processes, watch I/O, list sockets and find deleted-but-open files.',
    answer: [
      'These are the Linux commands I keep at hand for processes and I/O:',
      "- `ps -eo pid,ppid,user,state,%cpu,%mem,cmd --sort=-%cpu | head`\n- `top`\n- `pidstat -p <pid> 1`\n- `iostat -xz 1 5`\n- `ss -lntup`\n- `lsof +L1`\n- `journalctl -p warning --since '1 hour ago'`",
    ],
    code: [
      {
        title: 'Processes and I/O',
        language: 'bash',
        code: `ps -eo pid,ppid,user,state,%cpu,%mem,cmd --sort=-%cpu | head
top
pidstat -p <pid> 1
iostat -xz 1 5
ss -lntup
lsof +L1
journalctl -p warning --since '1 hour ago'`,
      },
    ],
    tags: ['linux', 'processes', 'commands'],
  },
  {
    id: 'itv-mycheat-36',
    level: 'basic',
    kind: 'open',
    prompt: 'What are the key Linux commands for managing services?',
    probing: 'Whether you can check, reload and restart systemd services and read their journal.',
    answer: [
      'These are the Linux commands I keep at hand for systemd services:',
      "- `systemctl status <service>`\n- `systemctl is-active <service>`\n- `systemctl reload <service>`\n- `systemctl restart <service>`\n- `journalctl -u <service> --since '30 minutes ago'`",
      'Validate configuration and impact before reload/restart.',
    ],
    code: [
      {
        title: 'Services',
        language: 'bash',
        code: `systemctl status <service>
systemctl is-active <service>
systemctl reload <service>
systemctl restart <service>
journalctl -u <service> --since '30 minutes ago'`,
      },
    ],
    tags: ['linux', 'systemd', 'commands'],
  },
  {
    id: 'itv-mycheat-37',
    level: 'basic',
    kind: 'open',
    prompt: 'What are the key Linux commands for networking and SSH checks?',
    probing:
      'Whether you can check addresses, routes, DNS, HTTP, TCP and verbose SSH from the command line.',
    answer: [
      'These are the Linux commands I keep at hand for networking and SSH:',
      '- `ip -br address`\n- `ip route`\n- `dig <name>`\n- `curl -vk https://<host>/health`\n- `nc -vz <host> <port>`\n- `ssh -vvv <user>@<host>`',
    ],
    code: [
      {
        title: 'Networking and SSH',
        language: 'bash',
        code: `ip -br address
ip route
dig <name>
curl -vk https://<host>/health
nc -vz <host> <port>
ssh -vvv <user>@<host>`,
      },
    ],
    tags: ['linux', 'networking', 'ssh'],
  },
  {
    id: 'itv-mycheat-38',
    level: 'intermediate',
    kind: 'open',
    prompt: 'What are the key Linux commands for checking and fixing permissions?',
    probing:
      'Whether you inspect the whole path and ACLs before changing modes, and avoid recursive or 777 fixes.',
    answer: [
      'These are the Linux commands I keep at hand for permissions:',
      '- `namei -l <path>`\n- `stat <path>`\n- `getfacl <path>`\n- `chmod 0750 <path>`\n- `chown <owner>:<group> <path>`',
      'Avoid `chmod -R`/`chown -R` until the exact tree and symlink behavior are reviewed. Broad `chmod 777` is not a fix.',
    ],
    code: [
      {
        title: 'Permissions',
        language: 'bash',
        code: `namei -l <path>
stat <path>
getfacl <path>
chmod 0750 <path>
chown <owner>:<group> <path>`,
      },
    ],
    tags: ['linux', 'permissions'],
  },
  {
    id: 'itv-mycheat-39',
    level: 'intermediate',
    kind: 'open',
    prompt: 'What are the key Linux commands for finding large files and cleaning up logs?',
    probing:
      'Whether you preview before deleting, stay on one filesystem and prefer retention settings over manual cleanup.',
    answer: [
      'These are the Linux commands I keep at hand for large files and log cleanup:',
      "- Ten largest files under /var/log (allocated size): `sudo find /var/log -xdev -type f -exec du -h -- {} + 2>/dev/null | sort -hr | head -n 10`\n- Ten largest files on the root filesystem: `sudo find / -xdev -type f -exec du -h -- {} + 2>/dev/null | sort -hr | head -n 10`\n- .log files larger than 100 MiB: `sudo find /var/log -xdev -type f -name '*.log' -size +100M -print`\n- Preview .log files older than 30 days: `sudo find /var/log -xdev -type f -name '*.log' -mtime +30 -print`\n- Delete only after preview, approval, retention checks and backup verification: `sudo find /var/log -xdev -type f -name '*.log' -mtime +30 -delete`",
      'Prefer application retention, `logrotate`, or journald settings over manual deletion. Check open-deleted files with `sudo lsof +L1`; deleting an open file may not release disk space until its process closes the descriptor.',
    ],
    code: [
      {
        title: 'Large files and log cleanup',
        language: 'bash',
        code: `# Ten largest files under /var/log (allocated size)
sudo find /var/log -xdev -type f -exec du -h -- {} + 2>/dev/null \\
  | sort -hr | head -n 10

# Ten largest files on the root filesystem
sudo find / -xdev -type f -exec du -h -- {} + 2>/dev/null \\
  | sort -hr | head -n 10

# .log files larger than 100 MiB
sudo find /var/log -xdev -type f -name '*.log' -size +100M -print

# Preview .log files older than 30 days
sudo find /var/log -xdev -type f -name '*.log' -mtime +30 -print

# Delete only after preview, approval, retention checks and backup verification
sudo find /var/log -xdev -type f -name '*.log' -mtime +30 -delete`,
      },
    ],
    tags: ['linux', 'disk', 'logs'],
  },
  {
    id: 'itv-mycheat-40',
    level: 'intermediate',
    kind: 'open',
    prompt: 'What are the key Linux commands for finding the highest-memory processes?',
    probing:
      'Whether you sort by resident memory and follow up with free, vmstat, pidstat and OOM logs.',
    answer: [
      'These are the Linux commands I keep at hand for memory investigation:',
      '- Header plus ten processes, sorted by resident memory: `ps -eo pid,ppid,user,%mem,rss,vsz,etime,cmd --sort=-rss | head -n 11`\n- Short alternative: `ps aux --sort=-%mem | head -n 11`\n- `free -h`\n- `vmstat 1`\n- `pidstat -r -p <pid> 1`\n- `journalctl -k | grep -i oom`',
    ],
    code: [
      {
        title: 'Highest-memory processes',
        language: 'bash',
        code: `# Header plus ten processes, sorted by resident memory
ps -eo pid,ppid,user,%mem,rss,vsz,etime,cmd --sort=-rss | head -n 11

# Short alternative
ps aux --sort=-%mem | head -n 11

free -h
vmstat 1
pidstat -r -p <pid> 1
journalctl -k | grep -i oom`,
      },
    ],
    tags: ['linux', 'memory'],
  },
  {
    id: 'itv-mycheat-41',
    level: 'intermediate',
    kind: 'open',
    prompt: 'How do you write a safe shell script that checks a service and starts it if needed?',
    probing:
      'Whether you use strict mode, quote variables and report failure with useful evidence.',
    answer: [
      'The script uses `set -Eeuo pipefail`, takes the service name as the first argument (default `nginx`) and exits 0 if `systemctl is-active --quiet` says it is already running.',
      'Otherwise it starts the service and checks again; if it is still not active it prints the last 50 journal lines to stderr and exits 1.',
    ],
    code: [
      {
        title: 'Service check and fix',
        language: 'bash',
        code: `#!/usr/bin/env bash
set -Eeuo pipefail

service_name=\${1:-nginx}
if systemctl is-active --quiet "$service_name"; then
  printf '%s is running\\n' "$service_name"
  exit 0
fi

systemctl start "$service_name"
systemctl is-active --quiet "$service_name" || {
  journalctl -u "$service_name" -n 50 --no-pager >&2 || true
  exit 1
}`,
      },
    ],
    tags: ['shell', 'bash', 'systemd'],
  },
  {
    id: 'itv-mycheat-42',
    level: 'basic',
    kind: 'open',
    prompt: 'How do you write a shell script that alerts when disk usage crosses a threshold?',
    probing:
      'Whether you can parse `df` output safely and return meaningful exit codes for monitoring.',
    answer: [
      'The threshold comes from `THRESHOLD_PERCENT` (default 80). `df -P /` gives stable POSIX output, and `awk` strips the `%` from the fifth column of the second line.',
      'At or above the threshold it prints a CRITICAL message to stderr and exits 2; otherwise it prints an OK message.',
    ],
    code: [
      {
        title: 'Disk threshold check',
        language: 'bash',
        code: `#!/usr/bin/env bash
set -Eeuo pipefail

threshold=\${THRESHOLD_PERCENT:-80}
usage=$(df -P / | awk 'NR==2 {gsub(/%/, "", $5); print $5}')
if (( usage >= threshold )); then
  printf 'CRITICAL: root filesystem is %s%% used\\n' "$usage" >&2
  exit 2
fi
printf 'OK: root filesystem is %s%% used\\n' "$usage"`,
      },
    ],
    tags: ['shell', 'bash', 'disk'],
  },
  {
    id: 'itv-mycheat-43',
    level: 'intermediate',
    kind: 'open',
    prompt: 'What does a safe backup script skeleton look like?',
    probing:
      'Whether you use strict mode, required variables, a restrictive umask, checksums and an archive test.',
    answer: [
      'The skeleton requires `SOURCE_DIR` and `BACKUP_DIR`, uses `umask 077`, writes a UTC-timestamped archive with a SHA-256 checksum and verifies the archive can be listed.',
      'A production backup additionally needs encryption, remote failure-domain copy, retention, monitoring, and restore testing. User-management scripts should use approved identity tools and must not embed a default password or automatic broad sudo.',
    ],
    code: [
      {
        title: 'Backup skeleton',
        language: 'bash',
        code: `#!/usr/bin/env bash
set -Eeuo pipefail
umask 077

source_dir=\${SOURCE_DIR:?Set SOURCE_DIR}
backup_dir=\${BACKUP_DIR:?Set BACKUP_DIR}
mkdir -p -- "$backup_dir"
stamp=$(date -u +%Y%m%dT%H%M%SZ)
archive="$backup_dir/backup-$stamp.tar.gz"
tar -C "$(dirname "$source_dir")" -czf "$archive" "$(basename "$source_dir")"
sha256sum "$archive" > "$archive.sha256"
tar -tzf "$archive" >/dev/null`,
      },
    ],
    tags: ['shell', 'bash', 'backups'],
  },
  {
    id: 'itv-mycheat-44',
    level: 'intermediate',
    kind: 'open',
    prompt: 'What does a declarative Jenkinsfile skeleton look like?',
    probing:
      'Whether you can structure stages, agents, options, post steps and credentials safely.',
    answer: [
      'My skeleton uses per-stage agents, timestamps, a timeout, no concurrent builds, JUnit reports and `withCredentials` with `set +x` and `--password-stdin` for the registry login.',
      'Prefer short-lived registry/cloud identity where supported. Do not interpolate secrets in Groovy strings.',
    ],
    code: [
      {
        title: 'Declarative Jenkinsfile',
        language: 'text',
        code: `pipeline {
  agent none
  options {
    timestamps()
    timeout(time: 30, unit: 'MINUTES')
    disableConcurrentBuilds()
  }
  parameters {
    choice(name: 'ENVIRONMENT', choices: ['dev', 'stage'], description: 'Target')
  }
  stages {
    stage('Checkout') {
      agent { label 'linux' }
      steps { checkout scm }
    }
    stage('Build and Test') {
      agent { label 'maven' }
      steps { sh 'mvn -B verify' }
      post { always { junit 'target/surefire-reports/*.xml' } }
    }
    stage('Publish') {
      when { branch 'main' }
      agent { label 'docker' }
      steps {
        withCredentials([usernamePassword(
          credentialsId: 'registry',
          usernameVariable: 'REGISTRY_USER',
          passwordVariable: 'REGISTRY_PASSWORD'
        )]) {
          sh '''
            set +x
            printf '%s' "$REGISTRY_PASSWORD" | docker login registry.example \\
              --username "$REGISTRY_USER" --password-stdin
            docker build -t registry.example/app:\${GIT_COMMIT} .
            docker push registry.example/app:\${GIT_COMMIT}
          '''
        }
      }
    }
  }
  post {
    always { deleteDir() }
  }
}`,
      },
    ],
    tags: ['jenkins', 'jenkinsfile'],
  },
  {
    id: 'itv-mycheat-45',
    level: 'basic',
    kind: 'open',
    prompt: 'What are the key commands for managing the Jenkins service?',
    probing: 'Whether you can check, start, stop and restart Jenkins and read its recent logs.',
    answer: [
      'These are the systemd commands I keep at hand for the Jenkins service:',
      "- `systemctl status jenkins`\n- `systemctl start jenkins`\n- `systemctl stop jenkins`\n- `systemctl restart jenkins`\n- `journalctl -u jenkins --since '30 minutes ago'`",
    ],
    code: [
      {
        title: 'Service commands',
        language: 'bash',
        code: `systemctl status jenkins
systemctl start jenkins
systemctl stop jenkins
systemctl restart jenkins
journalctl -u jenkins --since '30 minutes ago'`,
      },
    ],
    tags: ['jenkins', 'systemd'],
  },
  {
    id: 'itv-mycheat-46',
    level: 'advanced',
    kind: 'scenario',
    prompt: 'In what order do you troubleshoot a failing Jenkins pipeline?',
    probing:
      'Whether you have an ordered, evidence-first approach from the first failed stage to controller changes.',
    answer: [
      'I troubleshoot in this order:',
      '1. Jenkinsfile syntax\n2. first failed stage\n3. command exit code/test report\n4. agent label/health/workspace\n5. tool/dependency versions\n6. credentials/permissions\n7. DNS/proxy/registry\n8. disk/memory/executors\n9. recent plugin/shared-library/controller change',
    ],
    code: [
      {
        title: 'Troubleshooting order',
        language: 'text',
        code: `Jenkinsfile syntax → first failed stage → command exit code/test report
→ agent label/health/workspace → tool/dependency versions
→ credentials/permissions → DNS/proxy/registry → disk/memory/executors
→ recent plugin/shared-library/controller change`,
      },
    ],
    followUps: [
      'How do you tell an agent problem from a pipeline problem?',
      'What would make you suspect a recent plugin or shared-library change?',
    ],
    tags: ['jenkins', 'troubleshooting'],
  },
  {
    id: 'itv-mycheat-47',
    level: 'intermediate',
    kind: 'open',
    prompt: 'What does a basic GitHub Actions CI workflow look like?',
    probing:
      'Whether you can write a workflow with triggers, least-privilege permissions, caching and artifacts, and know the production hardening.',
    answer: [
      'A Java CI workflow that runs on pull requests, pushes to main and manual dispatch, with read-only permissions:',
      "For production, pin third-party actions to reviewed commit SHAs. Add a separate image job with OIDC-based registry/cloud login, build a digest that never changes after it's built, and deploy through a protected environment or GitOps update.",
      'Never run privileged deployment steps for untrusted fork code.',
    ],
    code: [
      {
        title: 'CI workflow',
        language: 'yaml',
        code: `name: CI

on:
  pull_request:
    branches: [main]
  push:
    branches: [main]
  workflow_dispatch:

permissions:
  contents: read

jobs:
  build-and-test:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Set up Java
        uses: actions/setup-java@v4
        with:
          distribution: temurin
          java-version: '21'
          cache: maven

      - name: Build and test
        run: mvn --batch-mode verify

      - name: Upload test reports
        if: always()
        uses: actions/upload-artifact@v4
        with:
          name: test-reports
          path: target/surefire-reports/`,
      },
    ],
    tags: ['github actions', 'ci/cd'],
  },
  {
    id: 'itv-mycheat-48',
    level: 'intermediate',
    kind: 'scenario',
    prompt: 'What are the common GitHub Actions failures and what do you check for each?',
    probing:
      'Whether you can map a symptom such as not triggered, 403 or an empty secret to the setting that causes it.',
    answer: [
      'The symptom tells me where to look:',
      '- **Not triggered** → on/event/branch/path filters and YAML location/syntax\n- **403** → effective permissions, token type/scope, environment/repository policy\n- **Secret empty** → repository/org/environment scope and correct secrets context\n- **Cache miss** → key, restore keys, path, lockfile hash, quota\n- **Artifact missing** → upload path/name, job dependency, retention\n- **Runner timeout** → queue, labels, runner health, job timeout, logs/resources',
    ],
    code: [
      {
        title: 'Common checks',
        language: 'text',
        code: `Not triggered → on/event/branch/path filters and YAML location/syntax
403 → effective permissions, token type/scope, environment/repository policy
Secret empty → repository/org/environment scope and correct secrets context
Cache miss → key, restore keys, path, lockfile hash, quota
Artifact missing → upload path/name, job dependency, retention
Runner timeout → queue, labels, runner health, job timeout, logs/resources`,
      },
    ],
    tags: ['github actions', 'troubleshooting'],
  },
]
