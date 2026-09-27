import type { InterviewQuestion } from '../../../types'

/** Shell scripting and PowerShell automation questions and notes. */
export const myShellQuestions: InterviewQuestion[] = [
  {
    id: 'itv-mylnx-96',
    level: 'advanced',
    kind: 'open',
    prompt:
      'How would you write a script to download the latest backup file from a remote server using SSH?',
    probing:
      'Whether your script finds the newest complete file, transfers atomically, verifies it and uses least-privilege SSH.',
    answer: [
      "I check the source and destination, find the newest completed backup on the remote server, copy it to a temporary local file, verify its checksum, and only then rename it into place. I don't assume the newest file is complete just because it exists.",
      'I use a dedicated read-only SSH key, verify host keys, restrict what the remote account can do, check local free space, and alert on failure. A checksum match only proves the file transferred correctly — a real restore test is what proves the backup is actually useful.',
    ],
    followUps: [
      'How would you restrict the remote key so it can only read backups?',
      'How would you avoid picking a backup that is still being written?',
    ],
    code: [
      {
        title: 'Download and verify the latest backup',
        language: 'bash',
        code: `#!/usr/bin/env bash
set -Eeuo pipefail

remote="backup@10.0.0.10"
remote_dir="/backups"
local_dir="/restore"
mkdir -p "$local_dir"

latest=$(ssh -o BatchMode=yes "$remote" \\
  "find '$remote_dir' -maxdepth 1 -type f -name '*.tar.gz' -printf '%T@ %p\\n' | sort -nr | head -n1 | cut -d' ' -f2-")

[[ -n "$latest" ]] || { echo "No backup found" >&2; exit 1; }

name=$(basename "$latest")
tmp="$local_dir/.\${name}.partial"
rsync --partial --progress "$remote:$latest" "$tmp"
ssh "$remote" "sha256sum '$latest'" | sed "s|$latest|$tmp|" | sha256sum --check -
mv "$tmp" "$local_dir/$name"
echo "Downloaded and verified: $local_dir/$name"`,
      },
    ],
    tags: ['bash', 'ssh', 'backup'],
  },
  {
    id: 'itv-mylnx-97',
    level: 'advanced',
    kind: 'open',
    prompt: 'What is an example of a complex automation script you have written?',
    probing:
      'Whether you can describe a robust deployment script with locking, verification, rollback and a real lesson learned.',
    answer: [
      'A good example is a deployment script that validates its inputs, checks dependencies, takes a backup, deploys a fixed build artifact, runs smoke tests, and rolls back automatically if anything fails.',
      'My deployment flow is:',
      "1. Parse the environment and version; reject anything unrecognized.\n2. Acquire a lock so two deployments can't run at once.\n3. Confirm the artifact's signature or checksum and check available disk space.\n4. Record the current version so I can roll back to it.\n5. Drain or remove the instance from traffic.\n6. Deploy and restart, with a timeout.\n7. Run a health check and a real call to a dependency.\n8. Roll back to the old version if any check fails.\n9. Bring traffic back, release the lock, emit metrics, and notify the team.",
      "I use `set -Eeuo pipefail`, a cleanup trap, structured logs, quoted variables, explicit exit codes, and a dry-run mode. In an interview I like to describe one real failure I found — for example, a health endpoint that passed while database authentication was actually failing — and how I added a dependency smoke test so it wouldn't happen again.",
    ],
    followUps: [
      'At what point would you move this out of Bash into a proper language or tool?',
      'How do you test the rollback path?',
    ],
    tags: ['bash', 'automation', 'deployment'],
  },
  {
    id: 'itv-mylnx-98',
    level: 'intermediate',
    kind: 'scenario',
    prompt: 'How do you debug automation scripts?',
    probing:
      'Whether you reproduce, isolate the first failing command and use syntax checks, shellcheck and tracing safely.',
    answer: [
      'I reproduce the failure with the same inputs and environment, then narrow it down to the first command that actually fails.',
      'I check the shebang line, the executable bit, PATH, the working directory, the user running it, environment variables, file permissions, exit codes, quoting, pipelines, network/DNS, and dependency versions. Scheduled jobs often fail simply because cron runs with a much smaller environment than an interactive shell.',
      "I add `set -Eeuo pipefail` carefully, log useful context, and use `trap 'echo \"failed at line $LINENO\" >&2' ERR`. Once it's fixed, I test the success case, invalid input, a timeout, partial output, running it twice in a row, and cleanup. I redact secrets before sharing any trace output.",
    ],
    code: [
      {
        title: 'Syntax check, lint and trace',
        language: 'bash',
        code: `bash -n deploy.sh             # syntax
shellcheck deploy.sh          # common errors
bash -x deploy.sh --dry-run   # trace; avoid when secrets may print`,
      },
    ],
    tags: ['bash', 'debugging'],
  },
  {
    id: 'itv-mylnx-99',
    level: 'intermediate',
    kind: 'open',
    prompt: 'How can PowerShell help with cost optimization?',
    probing:
      'Whether you automate reporting and safe, approved cleanup rather than blind deletion.',
    answer: [
      'PowerShell can inventory resources, apply schedules, and produce cleanup reports for someone to review. For example, I can find unattached Azure managed disks without deleting anything yet.',
      'My process is: report, then owner review, then approval, then deletion after a retention period. Other useful automations are stopping non-production VMs after hours, spotting idle public IPs and snapshots, enforcing tags, right-sizing resources based on real usage, and setting budget alerts.',
      "I use a managed identity, `-WhatIf` where it's supported, scope restrictions, exclusions for protected resources, audit logs, and a recoverable holding period before anything is actually deleted. The goal is to save money without hurting availability, performance, or the retention rules we're required to follow.",
    ],
    code: [
      {
        title: 'Report unattached managed disks',
        language: 'powershell',
        code: `$disks = Get-AzDisk | Where-Object { $_.ManagedBy -eq $null }
$disks | Select-Object Name, ResourceGroupName, DiskSizeGB, TimeCreated |
    Export-Csv ./unattached-disks.csv -NoTypeInformation`,
      },
    ],
    tags: ['powershell', 'azure', 'cost'],
  },
  {
    id: 'itv-mylnx-100',
    level: 'intermediate',
    kind: 'open',
    prompt: 'Was PowerShell part of CI or CD?',
    probing:
      'Whether you know where PowerShell fits in pipelines and how to keep scripts testable and safe.',
    answer: [
      'PowerShell can be part of both.',
      'In CI it can validate configuration, run Pester tests, calculate version numbers, build packages, and check the output of ARM/Bicep/Terraform. In CD it can authenticate with a workload identity, deploy resources, update configuration, run smoke tests, and trigger a rollback.',
      "I keep scripts in Git as modules or functions instead of writing large blocks of inline pipeline code. The pipeline passes explicit parameters, secrets come from the platform's secret store, and scripts return a non-zero exit code on failure.",
      "Any function that changes something destructive supports `ShouldProcess`/`-WhatIf`. I test the script on its own and pin the Az module version, so an automatic module upgrade can't quietly change production behavior.",
    ],
    tags: ['powershell', 'ci/cd'],
  },
  {
    id: 'itv-mylnx-101',
    level: 'basic',
    kind: 'open',
    prompt: 'Write a Bash script to add two numbers.',
    probing:
      'Whether you validate input instead of trusting Bash arithmetic, and know its integer limits.',
    answer: [
      'I check that both inputs are actually integers instead of trusting Bash arithmetic to reject bad input on its own.',
      "For example, `./add.sh 10 20` returns `30`, and `./add.sh ten 20` returns a usage error instead of a wrong answer. For numbers bigger than Bash's integer range, or for decimals, I'd use `bc`, Python, or another tool built for real math.",
    ],
    code: [
      {
        title: 'add.sh',
        language: 'bash',
        code: `#!/usr/bin/env bash
set -euo pipefail

if [[ $# -ne 2 || ! $1 =~ ^-?[0-9]+$ || ! $2 =~ ^-?[0-9]+$ ]]; then
  echo "Usage: $0 <integer> <integer>" >&2
  exit 2
fi

printf '%s\\n' "$(( $1 + $2 ))"`,
      },
    ],
    tags: ['bash', 'scripting'],
  },
  {
    id: 'itv-mylnx-102',
    level: 'basic',
    kind: 'open',
    prompt: 'Write a Bash script to find the biggest file in a folder.',
    probing:
      'Whether you can use find, sort and parameter expansion safely and avoid acting on the result blindly.',
    answer: [
      'With GNU `find`, I print the size in bytes, sort numerically, and safely show the first result.',
      "Filenames can contain newlines, so a fully general production version would use null-delimited processing or a different language. I also don't delete the result automatically — first I check whether it's an active log, an open file, a database file, or a protected backup.",
    ],
    code: [
      {
        title: 'largest-file.sh',
        language: 'bash',
        code: `#!/usr/bin/env bash
set -euo pipefail

dir=\${1:-.}
[[ -d $dir ]] || { echo "Not a directory: $dir" >&2; exit 2; }

result=$(find "$dir" -type f -printf '%s\\t%p\\n' 2>/dev/null | sort -nr | head -n1)
[[ -n $result ]] || { echo "No readable files found" >&2; exit 1; }

size=\${result%%$'\\t'*}
path=\${result#*$'\\t'}
printf 'Largest file: %q (%s bytes)\\n' "$path" "$size"`,
      },
    ],
    tags: ['bash', 'find'],
  },
  {
    id: 'itv-mylnx-103',
    level: 'basic',
    kind: 'open',
    prompt: 'Write a shell script that starts Nginx only when it is not running.',
    probing: 'Whether your script is idempotent, verifies the result and surfaces logs on failure.',
    answer: [
      "In automation I'd run this through a properly authorized service account or a configuration-management module, rather than embedding a password. I check `nginx -t` after any config change, keep logs around if it fails, and make sure running the script twice is safe.",
      'A monitoring system should be the one that catches the outage in the first place — this script is a fix, not a substitute for a health check.',
    ],
    code: [
      {
        title: 'start-nginx.sh',
        language: 'bash',
        code: `#!/usr/bin/env bash
set -euo pipefail

if systemctl is-active --quiet nginx; then
  echo 'Nginx is already running'
  exit 0
fi

echo 'Nginx is not running; attempting startup'
sudo systemctl start nginx

if systemctl is-active --quiet nginx; then
  echo 'Nginx started successfully'
else
  echo 'Nginx failed to start' >&2
  sudo systemctl status nginx --no-pager >&2 || true
  sudo journalctl -u nginx -n 50 --no-pager >&2 || true
  exit 1
fi`,
      },
    ],
    tags: ['bash', 'nginx', 'systemd'],
  },
  {
    id: 'itv-mylnx-104',
    level: 'basic',
    kind: 'open',
    prompt: 'What does `echo $?` indicate in Linux shell scripting?',
    probing:
      'Whether you know exit status semantics, that $? is overwritten immediately, and how pipefail changes it.',
    answer: [
      '`$?` holds the exit status of the last command or pipeline that just finished. By convention, zero means success and anything else means that command failed in its own specific way.',
      'You have to capture it immediately, because running any other command — even `echo` or `cd` — overwrites it.',
      'For a pipeline, I turn on `set -o pipefail`, since otherwise `$?` only reflects the last command in the chain. In production scripts I handle expected failures explicitly and give them useful context, rather than treating `set -e` as a substitute for real error handling.',
    ],
    code: [
      {
        title: 'Capture the exit status immediately',
        language: 'bash',
        code: `curl --fail --silent https://service.example/health
status=$?
if (( status != 0 )); then
  printf 'Health check failed with exit code %d\\n' "$status" >&2
fi`,
      },
    ],
    tags: ['bash', 'exit codes'],
  },
  {
    id: 'itv-mylnx-105',
    level: 'intermediate',
    kind: 'open',
    prompt:
      'How would you write a safe Bash backup rotation script, and what should any backup script do?',
    probing:
      'Whether your backup script checks output, rotates by age safely, and whether you know a backup is only proven by a restore.',
    answer: [
      "This example dumps a PostgreSQL database from a container, checks the output isn't empty, and removes backups older than seven days. In production, credentials should come from a protected runtime source, and backups should also be encrypted, copied to separate storage, monitored, and tested by actually restoring them.",
      "I'd also generate a checksum, upload the backup to storage that can't be changed after it's written, alert if the backup fails or never runs, and regularly restore it into a separate test database. Deleting by age like this is clearer and safer than trying to parse `ls` output.",
      'A backup script should:',
      "- Create its destination safely\n- Preserve permissions where that matters\n- Never back up its own output into itself\n- Write to a temporary name and rename it into place once complete\n- Checksum or encrypt the backup, per policy\n- Enforce a retention period\n- Copy the backup somewhere that won't fail along with the original\n- Get restored occasionally to prove it actually works",
      'A command returning exit code zero is not proof that the data can be recovered.',
    ],
    code: [
      {
        title: 'PostgreSQL backup with rotation',
        language: 'bash',
        code: `#!/usr/bin/env bash
set -Eeuo pipefail

readonly db_container="db-container"
readonly backup_dir="/backups"
readonly timestamp="$(date -u +'%Y%m%dT%H%M%SZ')"
readonly backup_file="\${backup_dir}/database-\${timestamp}.sql"

mkdir -p -- "$backup_dir"

docker exec "$db_container" \\
  pg_dump --username=postgres --dbname=mydb >"$backup_file"

if [[ ! -s "$backup_file" ]]; then
  echo "Backup is empty: $backup_file" >&2
  exit 1
fi

find "$backup_dir" -maxdepth 1 -type f \\
  -name 'database-*.sql' -mtime +7 -print -delete

echo "Backup completed: $backup_file"`,
      },
    ],
    tags: ['bash', 'backup', 'postgresql'],
  },
  {
    id: 'itv-mylnx-106',
    level: 'intermediate',
    kind: 'open',
    prompt: 'How do you handle errors and logging in shell scripts?',
    probing:
      'Whether you use strict mode deliberately, know set -e has exceptions, and log without leaking secrets.',
    answer: [
      'For any automation script, start with a deliberate strict-mode choice such as `set -Eeuo pipefail`. Keep in mind that `-e` has some shell-specific exceptions, so you should still check important commands explicitly rather than relying on it alone. Add an `ERR` trap to capture the line number and command that failed, then exit with a useful status code.',
      'Log both stdout and stderr while still showing them on screen, for example with `exec > >(tee -a "$log_file") 2>&1`. Never print secrets, always quote variables, use `mktemp` for temporary files, and test what happens when things fail, not just the happy path.',
    ],
    code: [
      {
        title: 'Strict mode, ERR trap and tee logging',
        language: 'bash',
        code: `set -Eeuo pipefail
trap 'echo "failed at line $LINENO" >&2' ERR
exec > >(tee -a "$log_file") 2>&1`,
      },
    ],
    tags: ['bash', 'error handling', 'logging'],
  },
  {
    id: 'itv-mylnx-107',
    level: 'basic',
    kind: 'open',
    prompt:
      'What should a production shell script have, and what are common DevOps scripting tasks?',
    probing:
      'Whether you have a checklist for safe, maintainable scripts and know when to move beyond shell.',
    answer: [
      'Common DevOps scripts handle things like disk-capacity monitoring, controlled log cleanup, restarting or fixing a service, verified backups, and user-account workflows. A production script should have:',
      "- A clear interpreter line\n- `set -Eeuo pipefail` where it makes sense\n- Quoted variables\n- Input validation\n- Safe temporary files\n- Meaningful exit codes\n- Logging that never includes secrets\n- A lock so it can't run twice at once\n- A cleanup trap",
      "Shell scripting is a good fit for small tasks. Once you're dealing with heavier parsing, state, transactions, or complex error recovery, reach for a proper language or a configuration-management tool instead.",
    ],
    tags: ['bash', 'best practices'],
  },
  {
    id: 'itv-mylnx-108',
    level: 'basic',
    kind: 'open',
    prompt:
      'How do you structure a script and handle its inputs (positional parameters, $#, "$@", command substitution)?',
    probing:
      'Whether you know the special parameters, quoting rules and the right conditional and arithmetic constructs.',
    answer: [
      '- `$0` is the script\'s own name.\n- `$1`, `$2`, and so on are the arguments passed in.\n- `$#` is how many arguments were passed.\n- `"$@"` expands to all the arguments, keeping each one intact.\n- `$(command)` captures a command\'s output — always think about its exit status and whether it has a trailing newline.\n- `read -r variable` reads input without treating backslashes as escape characters.',
      'Quote your expansions unless you actually want word splitting or globbing to happen. Use `[[ ... ]]` for conditionals, `(( count += 1 ))` for arithmetic, and `case` when you have several string options to match.',
    ],
    code: [
      {
        title: 'Script structure with usage and argument check',
        language: 'bash',
        code: `#!/usr/bin/env bash
set -Eeuo pipefail

usage() {
    printf 'Usage: %s <service-name>\\n' "$0" >&2
}

if (( $# != 1 )); then
    usage
    exit 64
fi

service_name=$1

if systemctl is-active --quiet "$service_name"; then
    printf '%s is active\\n' "$service_name"
else
    printf '%s is not active\\n' "$service_name" >&2
    exit 1
fi`,
      },
    ],
    tags: ['bash', 'scripting'],
  },
  {
    id: 'itv-mylnx-109',
    level: 'intermediate',
    kind: 'open',
    prompt: 'How do you write loops and functions safely in Bash, including a retry helper?',
    probing:
      'Whether you guard empty globs, use local variables, pass commands as arguments instead of eval and bound retries.',
    answer: [
      'Use `local` variables inside functions, return a meaningful status code, and pass commands as arguments rather than building command strings for `eval`.',
      'A retry has to be limited, visible in the logs, and safe to run again on something that may have already partly succeeded.',
    ],
    code: [
      {
        title: 'Loop over files and a bounded retry function',
        language: 'bash',
        code: `for file in ./*.txt; do
    [[ -e "$file" ]] || continue
    printf 'Processing %s\\n' "$file"
done

retry_command() {
    local attempt
    for (( attempt = 1; attempt <= 3; attempt++ )); do
        if "$@"; then
            return 0
        fi
        sleep "$attempt"
    done
    return 1
}`,
      },
    ],
    tags: ['bash', 'functions', 'retry'],
  },
  {
    id: 'itv-mylnx-110',
    level: 'intermediate',
    kind: 'open',
    prompt: 'How do redirection, pipelines and traps work together in a script?',
    probing:
      'Whether you know redirection operators, pipefail semantics, cleanup traps and the limits of set -e.',
    answer: [
      "`>` overwrites a file, `>>` appends to it, `2>` redirects standard error, and `|` connects one command's output to the next command's input. With `set -o pipefail`, the whole pipeline counts as failed if any command in it fails, not just the last one.",
      '`set -e` is not complete error handling on its own — it has exceptions depending on context. Check for expected failures explicitly, use traps for cleanup, and actually test what happens when things go wrong. Run `shellcheck` during development and in CI.',
    ],
    code: [
      {
        title: 'Temporary file with cleanup trap',
        language: 'bash',
        code: `temporary_file=$(mktemp)

cleanup() {
    rm -f -- "$temporary_file"
}
trap cleanup EXIT

if ! producer >"$temporary_file" 2>producer-error.log; then
    printf 'Producer failed\\n' >&2
    exit 1
fi

consumer <"$temporary_file"`,
      },
    ],
    tags: ['bash', 'redirection', 'traps'],
  },
  {
    id: 'itv-mylnx-111',
    level: 'intermediate',
    kind: 'open',
    prompt: 'How should shell scripts handle environment variables and secrets?',
    probing:
      'Whether you separate non-sensitive config from secrets and know where secrets leak from.',
    answer: [
      'An exported variable is passed down to any child process. Environment variables are fine for regular, non-sensitive configuration.',
      "Don't hardcode database passwords, API keys, or default passwords in scripts, shell history, profile files, or committed `.env` files. Pull secrets at runtime from an approved secret manager, never echo them, and unset temporary values once you're done with them.",
    ],
    code: [
      {
        title: 'Non-sensitive exported configuration',
        language: 'bash',
        code: `export APP_ENV="production"
export APP_PORT="8080"`,
      },
    ],
    tags: ['bash', 'secrets', 'environment'],
  },
  {
    id: 'itv-mylnx-112',
    level: 'intermediate',
    kind: 'open',
    prompt: 'What matters when scripting disk monitoring, log cleanup and service fixes?',
    probing:
      'Whether your operational scripts alert usefully, respect retention and avoid infinite restart loops.',
    answer: [
      'What matters for each kind of operational task:',
      "- **Disk monitoring**: watch the right filesystem, and put useful detail in the alert.\n- **Log cleanup**: check the directory, retention period, and ownership. Use `logrotate` or `journald` policy instead of deleting files by hand.\n- **Fixing a service**: check its config, verify it's healthy after start/reload, keep the logs, limit retries, and alert instead of looping forever.",
    ],
    tags: ['bash', 'monitoring', 'automation'],
  },
  {
    id: 'itv-mylnx-113',
    level: 'advanced',
    kind: 'open',
    prompt: 'How should a user provisioning script be designed?',
    probing:
      'Whether you avoid hardcoded passwords and automatic sudo, and design idempotent, auditable provisioning with offboarding.',
    answer: [
      'User provisioning scripts should never hardcode or print passwords, and should never hand out broad `sudo` access automatically.',
      "Use your organization's approved identity tooling, make account/group/SSH-key setup safe to run more than once, grant only the access someone actually needs, log what happened, set an expiry, and have a clear offboarding path.",
    ],
    followUps: [
      'How would you make the script idempotent when the user already exists with different groups?',
      'Why is a central identity provider better than local accounts at scale?',
    ],
    tags: ['bash', 'users', 'security'],
  },
]
