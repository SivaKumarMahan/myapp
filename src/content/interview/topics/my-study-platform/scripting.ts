import type { InterviewQuestion } from '../../../types'

/** Shell fundamentals, production scripts, Bash/Python automation scripts, Python basics and the ports reference. */
export const myStudyPlatformScriptingQuestions: InterviewQuestion[] = [
  {
    id: 'itv-mystpl-57',
    level: 'intermediate',
    kind: 'open',
    prompt: 'What should a production shell script include?',
    probing:
      'Whether you know the safety basics: strict mode, quoting, validation, exit codes, safe logging, locks and cleanup traps.',
    answer: [
      'A production script should have:',
      "- A clear interpreter line.\n- `set -Eeuo pipefail` where appropriate.\n- Quoted variables.\n- Input validation.\n- Safe temporary files.\n- Meaningful exit codes.\n- Logging that never includes secrets.\n- Locks for concurrency where the script shouldn't run twice at once.\n- Cleanup traps.",
    ],
    code: [
      {
        title: 'Basic structure',
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
    tags: ['shell', 'bash', 'best practices'],
  },
  {
    id: 'itv-mystpl-58',
    level: 'basic',
    kind: 'open',
    prompt: 'Why use `#!/usr/bin/env bash` and `set -Eeuo pipefail`?',
    probing: 'Whether you know what the shebang does and each flag of Bash strict mode.',
    answer: [
      "**Why use `#!/usr/bin/env bash`?**\nIt's the shebang, telling the OS to use Bash.",
      "`env` finds Bash through `PATH`, which is more portable than hardcoding `/bin/bash` (which doesn't exist at that path on every system).",
      '**What is `set -Eeuo pipefail`?**',
      "- `-e` - exit immediately on a command failure.\n- `-E` - preserves `ERR` traps inside functions and subshells (without it, `-e`'s effect can silently not propagate into a function).\n- `-u` - treats unset variables as errors instead of expanding to empty strings.\n- `pipefail` - makes a pipeline fail if any command in it fails, not just the last one.",
    ],
    tags: ['shell', 'bash'],
  },
  {
    id: 'itv-mystpl-59',
    level: 'basic',
    kind: 'open',
    prompt: 'What are `$0`, `$1`/`$2`, `$#`, `"$@"` and `$(command)` in a shell script?',
    probing:
      'Whether you know the special parameters and why `"$@"` must be quoted when forwarding arguments.',
    answer: [
      "- `$0` - the script's own name/path (the invoked script name).\n- `$1`, `$2`, ... - positional parameters: the arguments passed to the script, in order.\n- `$#` - the number of arguments passed to the script (argument count).",
      '`"$@"` is all arguments, with each one preserved as a separate word - critical when forwarding arguments to another command, since `"$@"` won\'t merge an argument containing spaces into a neighboring one.',
      '`$(command)` is command substitution - it runs `command` and substitutes its output, e.g. `today=$(date)`.',
    ],
    tags: ['shell', 'bash', 'parameters'],
  },
  {
    id: 'itv-mystpl-60',
    level: 'basic',
    kind: 'open',
    prompt: 'Why quote variables in shell scripts, and why use `read -r`?',
    probing:
      'Whether you understand word splitting and globbing, and backslash handling in `read`.',
    answer: [
      '**Why quote variables?** To prevent spaces and special characters from causing word splitting or unintended glob expansion. Quote variable expansions unless word splitting/globbing is intentional.',
      'Without quotes, a filename containing a space would be split into multiple arguments - so write `rm "$file"`, not `rm $file`.',
      '**Why use `read -r`?** To prevent backslashes in the input from being interpreted as escape characters - without `-r`, `read` treats `\\` specially, which is almost never what you want when reading arbitrary text.',
    ],
    tags: ['shell', 'bash', 'quoting'],
  },
  {
    id: 'itv-mystpl-61',
    level: 'intermediate',
    kind: 'open',
    prompt:
      'What is the difference between `[ ]` and `[[ ]]`, and when do you use `(( ))` and `case`?',
    probing:
      'Whether you know Bash conditionals, arithmetic evaluation and when `case` beats an if/elif chain.',
    answer: [
      '**`[ ]` vs `[[ ]]`?** `[[ ]]` is the Bash conditional - Bash-specific and safer/more expressive. It handles strings with spaces without extra quoting headaches, supports `&&`/`||` directly, and supports pattern/regex matching (`=~`).',
      '**When do you use `(( ))`?** For arithmetic evaluation, e.g. `(( count += 1 ))`. Also usable as a truthiness check inside `if`, e.g. `if (( usage >= 80 ))`.',
      '**Why use `case`?** It handles multiple string alternatives - cleaner than a chain of `if`/`elif` branches when checking a variable against multiple possible string values.',
    ],
    tags: ['shell', 'bash', 'conditionals'],
  },
  {
    id: 'itv-mystpl-62',
    level: 'basic',
    kind: 'open',
    prompt: 'What is input validation in a shell script, and why use meaningful exit codes?',
    probing:
      'Whether you validate before destructive actions and know that automation keys off exit codes.',
    answer: [
      '**What is input validation, in this context?** Checking that arguments and values are valid before performing actions with them - e.g. confirming an argument count, a file exists, or a value is numeric before using it destructively.',
      "**Why use meaningful exit codes?** Automation tools (CI/CD, cron, monitoring) key off exit codes to determine success/failure. `0` means success; non-zero means failure. `64` is a conventional code for command-line usage errors (from BSD's `sysexits.h` convention).",
    ],
    tags: ['shell', 'bash', 'exit codes'],
  },
  {
    id: 'itv-mystpl-63',
    level: 'intermediate',
    kind: 'open',
    prompt: 'What is `trap` in a shell script, and why use lock files?',
    probing:
      'Whether you guarantee cleanup on exit and prevent overlapping runs of scheduled scripts.',
    answer: [
      '**What is `trap`?** Runs commands when the script exits or receives a signal - the standard way to guarantee cleanup even if the script exits early or is interrupted.',
      '**Why use lock files?** To prevent multiple instances of the same script from running concurrently - important for anything scheduled (cron) that might still be running when the next scheduled run starts.',
    ],
    tags: ['shell', 'bash', 'trap'],
  },
  {
    id: 'itv-mystpl-64',
    level: 'basic',
    kind: 'open',
    prompt: 'Why avoid logging secrets in scripts, and why prefer `printf` over `echo`?',
    probing:
      'Whether you know logs are widely readable and that `echo` behaves differently across shells.',
    answer: [
      '**Why avoid logging secrets?** Logs are often widely readable (shared log aggregators, ticket attachments, support access). Passwords, tokens, and keys should never be written to logs.',
      "**Why `printf` instead of `echo`?** `printf` has more predictable formatting and better portability across shells - `echo`'s handling of flags like `-e` and backslash escapes varies between implementations.",
    ],
    tags: ['shell', 'bash', 'security'],
  },
  {
    id: 'itv-mystpl-65',
    level: 'intermediate',
    kind: 'open',
    prompt: 'Write a shell script that monitors disk usage across all mounted filesystems.',
    probing:
      'Whether you can parse `df` output safely, strip the `%`, compare numerically, and think about production improvements.',
    answer: [
      'Checks every mounted filesystem in one pass, rather than a single hardcoded mount point:',
      '- `df -h` gets filesystem usage in human-readable format.\n- `awk \'NR>1 {print $5 " " $6}\'` skips the header row and extracts the `Use%` and mount-point columns.\n- `while read -r usage mount` assigns those two fields per line.\n- `usage=${usage%\\%}` strips the trailing `%` sign via parameter expansion.\n- `(( usage >= THRESHOLD ))` does the numeric comparison.',
      "**Production improvements:** log warnings, send email/Slack notifications, ignore temporary filesystems if appropriate (`tmpfs`, etc.), use a lock so overlapping cron runs don't double-alert, and schedule with cron or a systemd timer.",
    ],
    code: [
      {
        title: 'Multi-mount disk check',
        language: 'bash',
        code: `#!/usr/bin/env bash
set -Eeuo pipefail

THRESHOLD=80

df -h | awk 'NR>1 {print $5 " " $6}' | while read -r usage mount
do
    usage=\${usage%\\%}

    if (( usage >= THRESHOLD )); then
        echo "WARNING: $mount is \${usage}% full"
    fi
done`,
      },
      {
        title: 'Example output',
        language: 'text',
        code: `WARNING: /data is 87% full
WARNING: /backup is 92% full`,
      },
    ],
    tags: ['shell', 'bash', 'monitoring'],
  },
  {
    id: 'itv-mystpl-66',
    level: 'basic',
    kind: 'open',
    prompt: 'How do you clean up old log files safely with `find`?',
    probing:
      'Whether you dry-run destructive `find` commands and know `mtime` vs `atime` vs `ctime`.',
    answer: [
      '- `find` - search.\n- `/var/log/myapp` - starting directory.\n- `-type f` - regular files only.\n- `-name "*.log"` - only `.log` files.\n- `-mtime +30` - modified more than 30 days ago.\n- `-delete` - delete matches.',
      '**Always dry-run destructive `find` commands first:**\nReview the output before adding `-delete` to the same command.',
      '**`mtime`/`atime`/`ctime`:**',
      '- `mtime` - file content modification time.\n- `atime` - last access time.\n- `ctime` - metadata/status change time (permissions, ownership, etc. - not content).',
    ],
    code: [
      {
        title: 'Log cleanup',
        language: 'bash',
        code: `find /var/log/myapp -type f -name "*.log" -mtime +30 -delete`,
      },
      {
        title: 'Always dry-run destructive find commands first',
        language: 'bash',
        code: `find /var/log/myapp -type f -name "*.log" -mtime +30 -print`,
      },
    ],
    tags: ['shell', 'linux', 'find'],
  },
  {
    id: 'itv-mystpl-67',
    level: 'intermediate',
    kind: 'open',
    prompt: 'How do you verify a backup in a shell script?',
    probing: 'Whether you go beyond "file exists" to archive integrity, checksums and backup age.',
    answer: [
      '- `-f` checks that the path exists and is a regular file.\n- `-s` checks that the file size is greater than zero.\n- `&&` requires both conditions.\n- `exit 1` reports failure to whatever automation is calling this script.',
      '**Production improvements:**\n`tar -tzf "$BACKUP" >/dev/null` validates that the archive is actually a well-formed `tar.gz` (not just a non-empty file - a truncated or corrupted archive would still pass the basic `-f`/`-s` check but fail this). `sha256sum` can be used for checksum verification against a known-good hash. Also check backup age with `find` (a backup job that silently stopped running would still leave a valid-looking old file behind), and log results with alerting on failure.',
    ],
    code: [
      {
        title: 'Backup verification',
        language: 'bash',
        code: `BACKUP="/backup/db.tar.gz"

if [[ -f "$BACKUP" && -s "$BACKUP" ]]; then
    echo "Backup verified"
else
    echo "Backup failed"
    exit 1
fi`,
      },
    ],
    tags: ['shell', 'bash', 'backup'],
  },
  {
    id: 'itv-mystpl-68',
    level: 'intermediate',
    kind: 'scenario',
    prompt:
      'Write a shell script that checks a service and restarts it if it is down. What does `systemctl is-active --quiet` do?',
    probing:
      'Whether you verify the restart worked and add limits so the script does not restart-loop a crashing service.',
    answer: [
      "`systemctl is-active --quiet` returns success (exit `0`) when the service is active, non-zero otherwise. `!` negates that, so the block only runs when the service is not active. The second `is-active` check after `restart` verifies the restart actually worked - restarting doesn't guarantee the service came back up healthy.",
      '**Production improvements:** log restart attempts, send alerts on failure, limit retry count (don\'t restart-loop forever against a service that keeps crashing), check `journalctl -u "$SERVICE" -n 50` for failure details, and schedule with cron/a systemd timer.',
      "**18. What does `systemctl is-active --quiet` do?**\nChecks a service's state purely through its exit code, without printing status output - ideal for use inside an `if` condition in a script.",
    ],
    code: [
      {
        title: 'Service health check',
        language: 'bash',
        code: `SERVICE=nginx

if ! systemctl is-active --quiet "$SERVICE"; then
    echo "Restarting $SERVICE..."
    systemctl restart "$SERVICE"

    if systemctl is-active --quiet "$SERVICE"; then
        echo "Restart successful"
    else
        echo "Restart failed"
        exit 1
    fi
fi`,
      },
    ],
    tags: ['shell', 'bash', 'systemd'],
  },
  {
    id: 'itv-mystpl-69',
    level: 'basic',
    kind: 'open',
    prompt: 'How do you send an email alert from a shell script?',
    probing: 'Whether you know `mail` needs an MTA and what modern alternatives are.',
    answer: [
      '- `mail` - send email.\n- `-s` - subject.\n- `admin@example.com` - recipient.\n- `< report.txt` - use `report.txt` as the email body.',
      "This requires the host to have a configured MTA such as Postfix, Sendmail, or Exim - `mail` doesn't send anything on its own without one. In cloud environments, Slack, Teams, PagerDuty, or Azure Monitor Action Groups are often preferred over configuring an MTA on every host.",
    ],
    code: [
      {
        title: 'Email alert',
        language: 'bash',
        code: `mail -s "Disk Usage Alert" admin@example.com < report.txt`,
      },
    ],
    tags: ['shell', 'bash', 'alerting'],
  },
  {
    id: 'itv-mystpl-70',
    level: 'advanced',
    kind: 'open',
    prompt: 'How do you schedule scripts with cron, and what shell automation have you done?',
    probing:
      'Whether you know crontab syntax, where cron files live, and to log cron output so failures are visible.',
    answer: [
      'Cron is the Linux job scheduler used to run scripts automatically on a schedule.',
      'Run every day at 2 AM: `0 2 * * * /opt/scripts/log_cleanup.sh` `crontab -l`',
      '**System-wide cron locations:**',
      '- `/etc/crontab`\n- `/etc/cron.d/`\n- `/etc/cron.daily/`\n- `/etc/cron.weekly/`\n- `/etc/cron.monthly/`\n- `/etc/cron.hourly/`',
      'User crontabs (via `crontab -e`) are stored under system-managed spool locations such as `/var/spool/cron` or `/var/spool/cron/crontabs`, rather than edited as plain files directly.',
      '**Log cron output** so failures are visible after the fact rather than silently swallowed:',
      '**Short interview answer**\nI used cron to automate log cleanup, disk checks, backup verification, log rotation, and health checks. Scripts were tested manually first, scheduled with `crontab -e`, and configured to log both output and errors (`>> log 2>&1`) so failures are visible after the fact rather than silent.',
      '**20. "What shell automation have you done?"**\nDisk monitoring, old log cleanup, backup verification, service restart/health checks, user account workflows, email/Slack alerts, and CI/CD automation.',
    ],
    code: [
      {
        title: 'Cron',
        language: 'bash',
        code: `chmod +x /opt/scripts/log_cleanup.sh

crontab -e`,
      },
      {
        title: 'Log cron output',
        language: 'text',
        code: `0 2 * * * /opt/scripts/log_cleanup.sh >> /var/log/log_cleanup.log 2>&1`,
      },
      {
        title: 'Check the cron service is running',
        language: 'bash',
        code: `# Ubuntu/Debian
systemctl status cron

# RHEL/CentOS
systemctl status crond`,
      },
      {
        title: 'Enable at boot',
        language: 'bash',
        code: `systemctl enable cron
# or
systemctl enable crond`,
      },
    ],
    followUps: [
      'When would you use a systemd timer instead of cron?',
      'How do you stop a cron job from overlapping with its previous run?',
    ],
    tags: ['shell', 'cron', 'linux'],
  },
  {
    id: 'itv-mystpl-71',
    level: 'intermediate',
    kind: 'open',
    prompt:
      'Write a Bash script that checks a Kubernetes deployment rollout and dumps troubleshooting context if it fails.',
    probing:
      'Whether you use `rollout status --timeout` and exit non-zero so the calling pipeline stage fails.',
    answer: [
      "Waits for a rollout to finish and, if it doesn't, dumps enough context (pods + recent events) to start troubleshooting immediately instead of just failing silently.",
      "`kubectl rollout status --timeout=180s` blocks until the rollout completes or the timeout is hit. `$?` captures its exit code - non-zero means the rollout didn't finish cleanly, so the script pulls the current pod list and the 20 most recent namespace events (sorted by timestamp) before exiting non-zero itself, so a calling CI/CD pipeline stage also fails.",
    ],
    code: [
      {
        title: 'Rollout status check',
        language: 'bash',
        code: `#!/bin/bash

NAMESPACE="production"
DEPLOYMENT="myapp"

kubectl rollout status deployment/$DEPLOYMENT \\
  -n $NAMESPACE \\
  --timeout=180s

if [ $? -ne 0 ]; then
    echo "Deployment failed"

    kubectl get pods -n $NAMESPACE
    kubectl get events -n $NAMESPACE --sort-by=.lastTimestamp | tail -20

    exit 1
fi

echo "Deployment successful"`,
      },
    ],
    tags: ['bash', 'kubernetes', 'automation'],
  },
  {
    id: 'itv-mystpl-72',
    level: 'basic',
    kind: 'open',
    prompt: 'Write a Docker disk cleanup script for a build agent.',
    probing: 'Whether you know what each prune command removes and that `-a` is aggressive.',
    answer: [
      '- `docker system df` - shows current disk usage broken down by images, containers, volumes, and build cache, so you have a before/after picture.\n- `docker image prune -af` - removes **all** images not referenced by any container (`-a`), without a confirmation prompt (`-f`). Useful on build agents where old, unused image layers accumulate.\n- `docker container prune -f` - removes stopped containers.',
      'This is a build-agent housekeeping script, not something to run against a host with images you might still need - `-a` is aggressive.',
    ],
    code: [
      {
        title: 'Docker cleanup',
        language: 'bash',
        code: `#!/bin/bash

echo "Docker disk usage:"
docker system df

echo "Removing unused images..."
docker image prune -af

echo "Removing unused containers..."
docker container prune -f

echo "Cleanup completed"`,
      },
    ],
    tags: ['bash', 'docker', 'cleanup'],
  },
  {
    id: 'itv-mystpl-73',
    level: 'basic',
    kind: 'open',
    prompt: 'Write a Linux disk usage monitoring script with a threshold.',
    probing:
      'Whether you can explain each part of the `df | awk | sed` pipeline and use exit codes for monitoring.',
    answer: [
      "`USAGE=$(df / | awk 'NR==2 {print $5}' | sed 's/%//')` gets the disk usage of the root filesystem: `df /` prints the filesystem table, `awk 'NR==2 {print $5}'` grabs the `Use%` column from the second line (the data row), and `sed 's/%//'` strips the `%` sign so the value can be compared numerically.",
      'A non-zero exit code on breach makes this usable directly as a monitoring/cron check.',
    ],
    code: [
      {
        title: 'Disk usage check',
        language: 'bash',
        code: `#!/bin/bash

THRESHOLD=80

USAGE=$(df / | awk 'NR==2 {print $5}' | sed 's/%//')

echo "Disk usage: $USAGE%"

if [ "$USAGE" -ge "$THRESHOLD" ]; then
    echo "WARNING: Disk usage is above $THRESHOLD%"
    exit 1
else
    echo "Disk usage is normal"
fi`,
      },
    ],
    tags: ['bash', 'linux', 'monitoring'],
  },
  {
    id: 'itv-mystpl-74',
    level: 'basic',
    kind: 'open',
    prompt: 'Write a log backup script.',
    probing: 'Whether you create dated, compressed archives without overwriting previous backups.',
    answer: [
      '`mkdir -p` ensures the backup directory exists without erroring if it already does.',
      '`tar -czf` creates a gzip-compressed archive (`c` = create, `z` = gzip, `f` = file) named with the current date, so re-running the script on a different day produces a separate, non-overwriting backup file.',
    ],
    code: [
      {
        title: 'Log backup',
        language: 'bash',
        code: `#!/bin/bash

LOG_DIR="/var/log/myapp"
BACKUP_DIR="/backup/logs"
DATE=$(date +%Y%m%d)

mkdir -p "$BACKUP_DIR"

tar -czf "$BACKUP_DIR/myapp-$DATE.tar.gz" "$LOG_DIR"

echo "Log backup created:"
ls -lh "$BACKUP_DIR/myapp-$DATE.tar.gz"`,
      },
    ],
    tags: ['bash', 'backup', 'linux'],
  },
  {
    id: 'itv-mystpl-75',
    level: 'intermediate',
    kind: 'open',
    prompt:
      'Write a Python script that checks Kubernetes Pod health using `subprocess` and `kubectl`.',
    probing:
      'Whether you use `subprocess.run` with a list, capture output, check return codes and parse JSON instead of text.',
    answer: [
      'With `namespace = "production"`, the `subprocess.run()` call is equivalent to running: `kubectl get pods -n production -o json`',
      '**How `subprocess.run()` is being used here:**',
      '- The list `["kubectl", "get", "pods", "-n", namespace, "-o", "json"]` is the command and its arguments - no shell string parsing involved, which avoids shell-injection issues.\n- `capture_output=True` captures stdout and stderr instead of letting them print directly to the terminal.\n- `text=True` returns `result.stdout`/`result.stderr` as strings instead of bytes.\n- `result.returncode` holds the exit status of the command - `0` usually means success, non-zero means failure (e.g. `if result.returncode != 0: print(result.stderr)`).',
      'This is a common pattern for wrapping `kubectl` (or any CLI tool) in Python when you need to process structured output rather than just eyeballing text - `-o json` plus `json.loads()` turns an opaque CLI into something you can iterate over programmatically.',
    ],
    code: [
      {
        title: 'Pod health check',
        language: 'python',
        code: `import subprocess
import json

namespace = "production"

result = subprocess.run(
    ["kubectl", "get", "pods", "-n", namespace, "-o", "json"],
    capture_output=True,
    text=True
)

if result.returncode != 0:
    print("Unable to retrieve pods")
    exit(1)

data = json.loads(result.stdout)

failed = []

for pod in data["items"]:
    name = pod["metadata"]["name"]
    phase = pod["status"].get("phase")

    if phase != "Running":
        failed.append(name)

if failed:
    print("Unhealthy pods:")
    for pod in failed:
        print(pod)
    exit(1)

print("All pods are healthy")`,
      },
      {
        title: 'The overall flow',
        language: 'text',
        code: `Python script
     |
     v
subprocess.run()
     |
     v
kubectl get pods
     |
     v
Kubernetes API
     |
     v
JSON output (result.stdout)
     |
     v
json.loads()
     |
     v
Python dictionary
     |
     v
Iterate pod["status"]["phase"] and flag anything != "Running"`,
      },
    ],
    tags: ['python', 'kubernetes', 'subprocess'],
  },
  {
    id: 'itv-mystpl-76',
    level: 'advanced',
    kind: 'open',
    prompt: 'Write a Python script that finds Docker images older than seven days.',
    probing:
      'Whether you notice the script only prints and know what is needed to parse dates and act on the cutoff.',
    answer: [
      '`docker images --format "{{.ID}} {{.CreatedAt}}"` lists every local image as `<image-id> <created-timestamp>`, using Docker\'s Go-template formatting to strip out everything except the two fields needed. `cutoff = datetime.now() - timedelta(days=7)` computes "7 days ago" as a comparison point.',
      "As written, the script only prints the raw `ID CreatedAt` lines - to actually act on image age you'd parse each line's timestamp (Docker's `CreatedAt` format needs explicit parsing, e.g. with `datetime.strptime`) and compare it against `cutoff`, then collect the IDs older than the cutoff to remove with `docker rmi`. This is the same overall shape as the pod-health-check script: shell out with `subprocess.run()`, capture structured-ish text output, then parse and filter it in Python.",
    ],
    code: [
      {
        title: 'Docker image age',
        language: 'python',
        code: `import subprocess
from datetime import datetime, timedelta

result = subprocess.run(
    ["docker", "images", "--format", "{{.ID}} {{.CreatedAt}}"],
    capture_output=True,
    text=True
)

cutoff = datetime.now() - timedelta(days=7)

for line in result.stdout.splitlines():
    print(line)`,
      },
    ],
    followUps: [
      "How would you parse Docker's `CreatedAt` format with `datetime.strptime`?",
      'How would you avoid deleting images that running containers still use?',
    ],
    tags: ['python', 'docker', 'subprocess'],
  },
  {
    id: 'itv-mystpl-77',
    level: 'basic',
    kind: 'open',
    prompt: 'Which common DevOps ports should you know for interviews?',
    probing:
      'Quick recall of the standard ports for networking, CI/CD, Kubernetes, data stores and observability.',
    answer: [
      'A quick-lookup table of ports that come up constantly across networking, CI/CD, Kubernetes, and observability interview questions.',
      '- **22**: SSH\n- **53**: DNS\n- **80**: HTTP\n- **443**: HTTPS\n- **3306**: MySQL\n- **5432**: PostgreSQL\n- **1433**: Microsoft SQL Server\n- **27017**: MongoDB\n- **6379**: Redis\n- **5672**: RabbitMQ\n- **9092**: Kafka\n- **2181**: ZooKeeper\n- **8080**: Jenkins / Tomcat\n- **9000**: SonarQube\n- **9090**: Prometheus\n- **3000**: Grafana\n- **5601**: Kibana\n- **9200**: Elasticsearch\n- **5044**: Logstash / Beats\n- **2375**: Docker API (unencrypted - not recommended)\n- **2376**: Docker API over TLS\n- **6443**: Kubernetes API Server\n- **10250**: Kubelet\n- **10257**: kube-controller-manager\n- **10259**: kube-scheduler\n- **8472**: VXLAN / Flannel\n- **179**: BGP / Calico\n- **10254**: NGINX Ingress health/metrics\n- **25**: SMTP\n- **389**: LDAP\n- **636**: LDAPS',
      '**Most important for interviews:** `22, 53, 80, 443, 8080, 9000, 9090, 3000, 6443, 10250, 3306, 5432, 6379, 9092, 9200, 5601`.',
    ],
    tags: ['networking', 'ports'],
  },
  {
    id: 'itv-mystpl-78',
    level: 'basic',
    kind: 'open',
    prompt: 'What is the difference between a list, tuple, dictionary and set in Python?',
    probing:
      'Whether you know ordering, mutability and duplicate rules for each built-in collection.',
    answer: [
      '**List**\nOrdered, mutable (can be changed), allows duplicates.',
      '**Tuple**\nOrdered, immutable (cannot be changed), allows duplicates.',
      'Trying to modify it: `colors[0] = "black"   # Error`',
      '**Dictionary**\nStores data as key-value pairs. Mutable. Keys must be unique.',
      '**Set**\nUnordered. Does not allow duplicates. Mutable.',
      '**Interview summary**',
      '- **List**: Ordered: Yes; Mutable: Yes; Duplicates: Yes; Example: `["a", "b", "a"]`\n- **Tuple**: Ordered: Yes; Mutable: No; Duplicates: Yes; Example: `("a", "b", "a")`\n- **Dictionary**: Ordered: Yes; Mutable: Yes; Duplicates: Keys No, Values Yes; Example: `{"name": "Siva"}`\n- **Set**: Ordered: No; Mutable: Yes; Duplicates: No; Example: `{1, 2, 3}`',
      '**One-line interview answer**',
      '- **List:** ordered, mutable, allows duplicates.\n- **Tuple:** ordered, immutable, allows duplicates.\n- **Dictionary:** stores data in key-value pairs with unique keys.\n- **Set:** unordered collection of unique elements.',
    ],
    code: [
      {
        title: 'List',
        language: 'python',
        code: `fruits = ["apple", "banana", "apple"]

fruits.append("orange")
print(fruits)
# ['apple', 'banana', 'apple', 'orange']`,
      },
      {
        title: 'Tuple',
        language: 'python',
        code: `colors = ("red", "green", "blue")

print(colors[0])
# red`,
      },
      {
        title: 'Dictionary',
        language: 'python',
        code: `employee = {
    "name": "Siva",
    "age": 28,
    "city": "Hyderabad"
}

print(employee["name"])
# Siva

employee["age"] = 29`,
      },
      {
        title: 'Set',
        language: 'python',
        code: `numbers = {1, 2, 3, 2, 1}

print(numbers)
# {1, 2, 3}

numbers.add(4)
print(numbers)
# {1, 2, 3, 4}`,
      },
    ],
    tags: ['python', 'data types'],
  },
  {
    id: 'itv-mystpl-79',
    level: 'basic',
    kind: 'open',
    prompt:
      'Write Python programs for the common number questions: Fibonacci, prime, factorial, palindrome number, reverse a number, even/odd, multiplication table and Armstrong number.',
    probing:
      'Whether you can write the classic loops and digit arithmetic (`% 10`, `// 10`) without looking anything up.',
    answer: [
      'These are the most commonly asked Python coding questions in DevOps, Azure DevOps and SRE interview rounds. Each program is in the code samples below: Fibonacci series (output `0 1 1 2 3 5 8 13 21 34`), check prime number, reverse a number, factorial (output `120`), palindrome number, check even or odd, print a multiplication table, and Armstrong number.',
      'An Armstrong number is a number equal to the sum of its own digits, each raised to the power of the digit count (e.g. `153 = 1³ + 5³ + 3³`).\n**Most common interview programs**',
      '1. Fibonacci series\n2. Prime number\n3. Factorial\n4. Palindrome\n5. Reverse string\n6. Reverse number\n7. Swap two numbers\n8. Even / odd\n9. Largest number\n10. Remove duplicates\n11. Count vowels\n12. Character frequency\n13. Multiplication table\n14. Sum of list elements\n15. Armstrong number',
      'These cover most of the basic Python coding questions asked in DevOps, Azure DevOps, and SRE interviews.',
    ],
    code: [
      {
        title: 'Fibonacci series',
        language: 'python',
        code: `n = 10
a, b = 0, 1

for i in range(n):
    print(a, end=" ")
    a, b = b, a + b`,
      },
      {
        title: 'Check prime number',
        language: 'python',
        code: `num = 17

if num > 1:
    for i in range(2, int(num**0.5) + 1):
        if num % i == 0:
            print("Not Prime")
            break
    else:
        print("Prime")
else:
    print("Not Prime")`,
      },
      {
        title: 'Reverse a number',
        language: 'python',
        code: `num = 12345
rev = 0

while num > 0:
    digit = num % 10
    rev = rev * 10 + digit
    num //= 10

print(rev)`,
      },
      {
        title: 'Factorial',
        language: 'python',
        code: `num = 5
fact = 1

for i in range(1, num + 1):
    fact *= i

print(fact)`,
      },
      {
        title: 'Palindrome number',
        language: 'python',
        code: `num = 121
temp = num
rev = 0

while temp > 0:
    digit = temp % 10
    rev = rev * 10 + digit
    temp //= 10

if num == rev:
    print("Palindrome")
else:
    print("Not Palindrome")`,
      },
      {
        title: 'Check even or odd',
        language: 'python',
        code: `num = 18

if num % 2 == 0:
    print("Even")
else:
    print("Odd")`,
      },
      {
        title: 'Print multiplication table',
        language: 'python',
        code: `num = 5

for i in range(1, 11):
    print(f"{num} x {i} = {num * i}")`,
      },
      {
        title: 'Armstrong number',
        language: 'python',
        code: `num = 153
digits = str(num)
power = len(digits)

total = sum(int(d) ** power for d in digits)

if total == num:
    print("Armstrong number")
else:
    print("Not an Armstrong number")`,
      },
    ],
    tags: ['python', 'coding'],
  },
  {
    id: 'itv-mystpl-80',
    level: 'basic',
    kind: 'open',
    prompt:
      'Write Python programs to reverse a string, count vowels and count the frequency of characters.',
    probing:
      'Whether you know slicing with `[::-1]` and building a frequency dictionary with `.get()`.',
    answer: [
      'Reverse a string with slicing: `text[::-1]` turns `"DevOps"` into `spOveD`.',
      "Count vowels by looping over `text.lower()` and checking `if ch in \"aeiou\"`. Count character frequency with a dictionary: `freq[ch] = freq.get(ch, 0) + 1`, which for `\"banana\"` gives `{'b': 1, 'a': 3, 'n': 2}`.",
    ],
    code: [
      {
        title: 'Reverse a string',
        language: 'python',
        code: `text = "DevOps"

print(text[::-1])`,
      },
      {
        title: 'Count vowels',
        language: 'python',
        code: `text = "Hello World"

count = 0

for ch in text.lower():
    if ch in "aeiou":
        count += 1

print(count)`,
      },
      {
        title: 'Count frequency of characters',
        language: 'python',
        code: `text = "banana"

freq = {}

for ch in text:
    freq[ch] = freq.get(ch, 0) + 1

print(freq)`,
      },
    ],
    tags: ['python', 'coding', 'strings'],
  },
  {
    id: 'itv-mystpl-81',
    level: 'basic',
    kind: 'open',
    prompt:
      'Write Python programs to swap two numbers, find the largest number (with and without `max()`), remove duplicates and sum a list.',
    probing:
      'Whether you know the Pythonic one-liners and can also write the manual loop when a built-in is not allowed.',
    answer: [
      'Swap two numbers either with a temporary variable or the Python way: `a, b = b, a`.',
      'Find the largest number with `max(numbers)`, or without `max()` by keeping `largest = numbers[0]` and updating it in a loop. Remove duplicates with `list(set(numbers))`, and sum a list with `sum(numbers)`.',
    ],
    code: [
      {
        title: 'Using a temporary variable',
        language: 'python',
        code: `a = 10
b = 20

temp = a
a = b
b = temp

print(a, b)`,
      },
      {
        title: 'The Python way',
        language: 'python',
        code: `a = 10
b = 20

a, b = b, a

print(a, b)`,
      },
      {
        title: 'Find largest number',
        language: 'python',
        code: `numbers = [10, 45, 23, 89, 67]

print(max(numbers))`,
      },
      {
        title: 'Remove duplicates',
        language: 'python',
        code: `numbers = [1, 2, 2, 3, 4, 4, 5]

unique = list(set(numbers))

print(unique)`,
      },
      {
        title: 'Find maximum in a list (without max())',
        language: 'python',
        code: `numbers = [5, 9, 2, 14, 7]

largest = numbers[0]

for n in numbers:
    if n > largest:
        largest = n

print(largest)`,
      },
      {
        title: 'Sum of list elements',
        language: 'python',
        code: `numbers = [10, 20, 30, 40]

print(sum(numbers))`,
      },
    ],
    tags: ['python', 'coding', 'lists'],
  },
]
