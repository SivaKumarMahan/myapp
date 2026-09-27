import type { InterviewQuestion } from '../../../types'

/** Shell, Python and PowerShell automation examples. */
export const myFrequentAutomationQuestions: InterviewQuestion[] = [
  {
    id: 'itv-myfaq-19',
    level: 'intermediate',
    kind: 'open',
    prompt: 'What automation have you done using Shell and Python?',
    probing:
      'Realistic operational automation - health checks, cleanup, backups, monitoring - and a clear reason for picking Bash or Python.',
    answer: [
      'Use examples that sound like real operational automation rather than generic programming exercises. There are two sets of examples: Set 1 leans towards Kubernetes, Docker and Azure; Set 2 leans towards Linux server operations - service restarts, log monitoring, email alerts and retention. Both are good answers; pick whichever matches the job description.',
      '**Set 1 answer:** "I have used shell scripting mainly for lightweight Linux, Kubernetes and CI/CD automation. Five examples are Kubernetes deployment health checks, Docker cleanup on self-hosted agents, Linux disk-space monitoring, application log backup and Azure resource inventory using Azure CLI."',
      '"I use Python when the automation requires more complex logic or data processing. For example, I have used Python for Azure resource processing, Kubernetes pod health checks, Docker image cleanup based on retention rules, application log analysis, and API health checks."',
      '"I generally use Bash for simple command orchestration and pipeline tasks, while I prefer Python when I need JSON processing, API integration, error handling, or more complex business logic."',
      '**Best 30-second answer (Set 2):** "Yes, I have automated several repetitive operational tasks using Shell and Python. In Shell, I automated service restart, application log error checking with email alerts, server backups, disk-space monitoring and log cleanup using cron. In Python, I used scripts for more complex automation such as service monitoring with email notifications, parsing application logs and generating reports, backup and retention management, checking multiple servers, and API health monitoring. These scripts reduced manual intervention and could be integrated with our Azure DevOps pipelines or scheduled through cron."',
      'The ten Set 2 examples that sound realistic for a DevOps role, as Shell / Python pairs:',
      '- Restart failed service / Restart service + email alert\n- Search logs for errors / Parse logs + generate report\n- Automated server backup / Backup + retention\n- Disk-space monitoring / Monitor multiple servers\n- Log cleanup / API health monitoring',
    ],
    tags: ['automation', 'shell', 'python'],
  },
  {
    id: 'itv-myfaq-20',
    level: 'basic',
    kind: 'open',
    prompt: 'When do you choose Shell scripting and when do you choose Python?',
    probing:
      'A sensible dividing line: Bash for command orchestration, Python for APIs, JSON, structured logic and error handling.',
    answer: [
      'Python is more useful when the automation involves API calls, JSON processing, complex logic, or larger workflows. Python examples should show where Python is better than a simple Bash command - especially API calls, JSON processing, structured reporting and exception handling.',
      'Shell versus Python, side by side:',
      '- **Shell:** quick server automation - **Python:** complex automation\n- **Shell:** Linux commands - **Python:** APIs\n- **Shell:** kubectl / az / docker orchestration - **Python:** JSON processing\n- **Shell:** file operations - **Python:** log analysis\n- **Shell:** simple health checks - **Python:** complex health checks\n- **Shell:** CI/CD helper scripts - **Python:** larger automation tools',
    ],
    tags: ['automation', 'shell', 'python'],
  },
  {
    id: 'itv-myfaq-21',
    level: 'intermediate',
    kind: 'open',
    prompt: 'Write a script that checks a Kubernetes deployment is healthy after it is deployed.',
    probing:
      'Using exit codes to fail a pipeline, and collecting evidence (pods, events) when the rollout fails.',
    answer: [
      'The shell version is used after deployment to verify that pods are running and the rollout completed.',
      '**Interview explanation (Shell):** "I used a shell script after AKS deployment to automatically check rollout status. If the rollout failed, the script collected pod status and Kubernetes events and failed the Azure DevOps pipeline."',
      '**Interview explanation (Python):** "I used Python to query Kubernetes, parse the JSON response and identify pods that were not running. This was integrated into the deployment validation stage of the CI/CD pipeline."',
    ],
    code: [
      {
        title: 'Shell: rollout status check',
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
      {
        title: 'Python: pod health checker',
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
    ],
    tags: ['automation', 'kubernetes', 'shell'],
  },
  {
    id: 'itv-myfaq-22',
    level: 'basic',
    kind: 'open',
    prompt: 'Write a script to clean up Docker images on a self-hosted build agent.',
    probing:
      'Awareness of agent disk pressure and when a simple prune is enough versus retention rules in Python.',
    answer: [
      'This is useful on self-hosted agents where old Docker images consume disk space.',
      '**Interview explanation (Shell):** "On self-hosted build agents, Docker images can consume a lot of disk space. I automated cleanup of unused images and containers using a shell script and scheduled it through cron or an Azure DevOps pipeline."',
      'Python can provide more control than a simple `docker prune`. In a real implementation, I would parse the creation timestamp and remove images older than the retention period.',
      '**Interview explanation (Python):** "I used Python when cleanup rules became more complex, for example retaining the latest N images or deleting images older than a defined number of days."',
    ],
    code: [
      {
        title: 'Shell: prune unused images and containers',
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
      {
        title: 'Python: starting point for age-based cleanup',
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
    tags: ['automation', 'docker', 'shell'],
  },
  {
    id: 'itv-myfaq-23',
    level: 'basic',
    kind: 'open',
    prompt: 'Write a script that monitors disk space and alerts when it crosses a threshold.',
    probing:
      'Parsing `df` reliably, returning a non-zero exit code or sending an alert, and the safer portable version.',
    answer: [
      '**Interview explanation (Set 1):** "I used shell scripting to monitor disk utilization on Linux servers. If usage crossed the configured threshold, the script returned a failure code so the monitoring or pipeline process could trigger an alert."',
      '**Problem (Set 2):** servers were running out of disk space because of logs and temporary files. "I created a shell script that checks disk utilization periodically. If usage crossed 80%, it automatically sent an email alert so we could take action before the server became unavailable."',
      'The safer version uses `df -P` so the output format is portable, and the threshold comes from an environment variable.',
    ],
    code: [
      {
        title: 'Disk check with failure exit code',
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
      {
        title: 'Disk check with email alert',
        language: 'bash',
        code: `#!/bin/bash

THRESHOLD=80

USAGE=$(df -P / | awk 'NR==2 {gsub("%",""); print $5}')

if [ "$USAGE" -ge "$THRESHOLD" ]; then
    echo "Disk usage is $USAGE%"

    df -h / | mail \\
        -s "Disk Space Alert" \\
        devops@example.com
else
    echo "Disk usage is $USAGE%"
fi`,
      },
      {
        title: 'Safer version: portable df and env threshold',
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
    tags: ['automation', 'shell', 'linux'],
  },
  {
    id: 'itv-myfaq-24',
    level: 'intermediate',
    kind: 'open',
    prompt:
      'Write a script that restarts a failed service and alerts if the restart does not work.',
    probing:
      'Checking state before acting, verifying the restart, capturing the reason (journal), and failing loudly.',
    answer: [
      '**Problem:** the application service occasionally stops. Someone had to SSH into the server, check it and restart it. The flow is: check service, restart if down, and if still down send an alert.',
      '**Interview (Shell):** "I automated service health checking. If the service was down, the script automatically restarted it and returned a failure if the restart didn\'t succeed."',
      '**Interview (Python):** "I used Python to monitor a Linux service. If it was down, the script attempted a restart. If the restart failed, it automatically sent an email notification."',
      'The "service check and fix" version checks whether a service is running and starts it if not. On failure it prints the last 50 journal lines so the reason is captured. The Nginx version starts Nginx only if it is not already running, and prints status and journal output if it fails to start.',
    ],
    code: [
      {
        title: 'Shell: restart a failed service',
        language: 'bash',
        code: `#!/bin/bash

SERVICE="myapp"

if systemctl is-active --quiet "$SERVICE"; then
    echo "$SERVICE is running"
else
    echo "$SERVICE is down"
    systemctl restart "$SERVICE"

    if systemctl is-active --quiet "$SERVICE"; then
        echo "$SERVICE restarted successfully"
    else
        echo "Failed to restart $SERVICE"
        exit 1
    fi
fi`,
      },
      {
        title: 'Automation flow',
        language: 'text',
        code: `Check service
     |
Service down?
     |
Restart
     |
Still down?
     |
Send alert`,
      },
      {
        title: 'Python: restart and email if it fails',
        language: 'python',
        code: `import subprocess
import smtplib
from email.message import EmailMessage

SERVICE = "myapp"

status = subprocess.run(
    ["systemctl", "is-active", "--quiet", SERVICE]
)

if status.returncode != 0:
    print(f"{SERVICE} is down. Restarting...")

    restart = subprocess.run(
        ["systemctl", "restart", SERVICE]
    )

    if restart.returncode != 0:
        msg = EmailMessage()
        msg["Subject"] = "Service Restart Failed"
        msg["From"] = "devops@example.com"
        msg["To"] = "support@example.com"

        msg.set_content(
            f"Unable to restart {SERVICE}"
        )

        with smtplib.SMTP("smtp.example.com", 25) as smtp:
            smtp.send_message(msg)

        raise SystemExit(1)

print("Service is running")`,
      },
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
      {
        title: 'Start Nginx only if it is not already running',
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
    tags: ['automation', 'linux', 'systemd'],
  },
  {
    id: 'itv-myfaq-25',
    level: 'intermediate',
    kind: 'open',
    prompt: 'Write a script that scans application logs for errors and reports them.',
    probing:
      'Pattern matching, thresholds that fail a pipeline, reports and alerts, and streaming large files instead of loading them.',
    answer: [
      '**Problem:** the DevOps team had to manually search logs for ERROR and Exception. The shell version counts matches, keeps the last 50 errors, emails them, and is scheduled with cron every ten minutes.',
      '**Interview (Shell):** "I automated log monitoring using grep and cron. If the script found application errors, it collected the recent errors and sent an email to the support team."',
      '**Interview (Python, Set 1):** "I used Python for log analysis because it is easier to implement filtering and pattern matching. The script scans application logs, identifies ERROR and EXCEPTION entries, counts them and can fail a pipeline or trigger an alert if the count exceeds a threshold."',
      '**Interview (Python, Set 2):** "I used Python to parse application logs, identify different error patterns using regular expressions, generate a report and send it to the support team." You can then email `/tmp/error_report.txt`.',
      'For a large log file, stream it line by line instead of loading it into memory - the last example counts HTTP status codes.',
    ],
    code: [
      {
        title: 'Shell: grep errors, email, schedule with cron',
        language: 'bash',
        code: `#!/bin/bash

LOG_FILE="/var/log/myapp/application.log"
ERROR_COUNT=$(grep -Ei "ERROR|Exception|Failed" "$LOG_FILE" | wc -l)

if [ "$ERROR_COUNT" -gt 0 ]; then
    echo "Found $ERROR_COUNT errors in application logs"

    grep -Ei "ERROR|Exception|Failed" "$LOG_FILE" \\
        | tail -50 > /tmp/app_errors.txt

    mail -s "Application Error Alert" devops@example.com \\
        < /tmp/app_errors.txt
fi

*/10 * * * * /opt/scripts/check_logs.sh`,
      },
      {
        title: 'Python: count errors and fail on a threshold',
        language: 'python',
        code: `import re

log_file = "application.log"

error_count = 0

with open(log_file, "r") as file:
    for line in file:
        if re.search(r"\\bERROR\\b|\\bEXCEPTION\\b", line):
            print(line.strip())
            error_count += 1

print(f"Total errors: {error_count}")

if error_count > 100:
    print("High number of errors detected")
    exit(1)`,
      },
      {
        title: 'Python: error report',
        language: 'python',
        code: `import re

log_file = "/var/log/myapp/application.log"

errors = []

with open(log_file) as file:
    for line in file:
        if re.search(r"ERROR|Exception|Failed", line, re.IGNORECASE):
            errors.append(line.strip())

with open("/tmp/error_report.txt", "w") as report:
    report.write("Application Error Report\\n")
    report.write("=" * 40 + "\\n")

    for error in errors[-100:]:
        report.write(error + "\\n")

print(f"Found {len(errors)} errors")`,
      },
      {
        title: 'Python: stream a large log and count status codes',
        language: 'python',
        code: `from collections import Counter

counts = Counter()
with open("access.log", encoding="utf-8", errors="replace") as handle:
    for line_number, line in enumerate(handle, start=1):
        parts = line.split()
        if len(parts) < 9:
            continue
        counts[parts[8]] += 1

print(counts.most_common())`,
      },
    ],
    tags: ['automation', 'logs', 'python'],
  },
  {
    id: 'itv-myfaq-26',
    level: 'intermediate',
    kind: 'open',
    prompt: 'Write a backup script for application logs or configuration.',
    probing:
      'Timestamped archives, failure exit codes, retention, checksums and verification - and that exit code 0 is not proof of recoverability.',
    answer: [
      '**Log backup (Set 1):** "I automated application log backup by compressing the logs and creating a date-based archive. This helps with log retention and prevents the server disk from filling up."',
      '**Server backup (Set 2):** problem - manual backup of configuration files and application data. "I automated daily configuration backups using tar and cron. The backup file had a timestamp, and the script returned a failure if the backup operation failed."',
      '**Python with retention:** "I used Python to automate backups and retention. It created timestamped compressed backups and automatically removed backups older than the retention period."',
      'The backup skeleton is better than the simple `tar -czf` example because it uses a UTC timestamp, writes a SHA256 checksum, and verifies the archive can be listed.',
      'A production backup additionally needs encryption, a remote failure-domain copy, retention, monitoring, and restore testing. A command returning zero is **not** proof that the data is recoverable.',
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
      {
        title: 'Config backup scheduled with cron',
        language: 'bash',
        code: `#!/bin/bash

SOURCE="/opt/myapp/config"
BACKUP="/backup/myapp"
DATE=$(date +%Y%m%d_%H%M%S)

mkdir -p "$BACKUP"

tar -czf "$BACKUP/myapp_config_$DATE.tar.gz" "$SOURCE"

if [ $? -eq 0 ]; then
    echo "Backup completed successfully"
else
    echo "Backup failed"
    exit 1
fi

0 2 * * * /opt/scripts/backup.sh`,
      },
      {
        title: 'Python: backup with 7-day retention',
        language: 'python',
        code: `import shutil
from pathlib import Path
from datetime import datetime, timedelta

source = Path("/opt/myapp/config")
backup_dir = Path("/backup/myapp")

backup_dir.mkdir(parents=True, exist_ok=True)

timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")

archive = backup_dir / f"config_{timestamp}"

shutil.make_archive(
    str(archive),
    "gztar",
    source
)

print(f"Backup created: {archive}.tar.gz")

# Remove backups older than 7 days
cutoff = datetime.now() - timedelta(days=7)

for file in backup_dir.glob("*.tar.gz"):
    if datetime.fromtimestamp(file.stat().st_mtime) < cutoff:
        file.unlink()
        print(f"Deleted old backup: {file}")`,
      },
      {
        title: 'Backup skeleton with checksum and verification',
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
    tags: ['automation', 'backup', 'shell'],
  },
  {
    id: 'itv-myfaq-27',
    level: 'intermediate',
    kind: 'open',
    prompt: 'Write a script that cleans up old application logs.',
    probing:
      'Safe retention with `find`, error handling with `set -euo pipefail` and `trap`, and knowing logrotate exists.',
    answer: [
      '**Problem:** application logs were filling the server. "I automated log retention using the Linux find command. Logs older than seven days were removed based on our retention requirement. This prevented unnecessary disk consumption."',
      'The richer version compresses logs older than a day, deletes archives past retention, cleans `/tmp`, and notifies Slack on both success and failure using a `trap`.',
      'Talking points: `set -euo pipefail`, `trap ... ERR` for error handling, idempotency, using `logrotate` in real setups, and scheduling via cron or a systemd timer.',
    ],
    code: [
      {
        title: 'Delete logs older than 7 days',
        language: 'bash',
        code: `#!/bin/bash

LOG_DIR="/var/log/myapp"

find "$LOG_DIR" \\
    -type f \\
    -name "*.log" \\
    -mtime +7 \\
    -delete

echo "Old logs cleaned successfully"`,
      },
      {
        title: 'Log rotation and cleanup with Slack notification',
        language: 'bash',
        code: `#!/usr/bin/env bash
set -euo pipefail                      # fail fast, catch undefined vars, pipe failures
LOG_DIR="/var/log/myapp"; RETENTION_DAYS=14; SLACK_WEBHOOK="\${SLACK_WEBHOOK:-}"

notify() { [[ -n "$SLACK_WEBHOOK" ]] && curl -sf -X POST -d "{\\"text\\":\\"$1\\"}" "$SLACK_WEBHOOK" || true; }
trap 'notify "log-cleanup failed at line $LINENO"' ERR

# rotate + compress logs older than 1 day
find "$LOG_DIR" -type f -name '*.log' -mtime +1 -exec gzip {} \\;
# delete archives older than retention
deleted=$(find "$LOG_DIR" -type f -name '*.gz' -mtime +"$RETENTION_DAYS" -print -delete | wc -l)
# clean tmp + old cache
find /tmp -type f -atime +7 -delete
notify "log-cleanup done: removed $deleted old archives, disk now $(df -h / | awk 'NR==2{print $5}')"`,
      },
    ],
    tags: ['automation', 'logs', 'shell'],
  },
  {
    id: 'itv-myfaq-28',
    level: 'basic',
    kind: 'open',
    prompt: 'Write a script that produces an inventory of Azure resources.',
    probing:
      'Using Azure CLI queries from Bash, and Python when the JSON output needs further processing.',
    answer: [
      '**Interview (Shell):** "I used Azure CLI inside a shell script to automate resource inventory. Instead of manually checking resources in the Azure portal, the script retrieves resource names, types and locations and can be scheduled or integrated into a pipeline."',
      '**Interview (Python):** "I used Python when I needed to process Azure CLI JSON output. The script retrieves resources, parses the JSON and performs additional logic such as filtering or reporting."',
    ],
    code: [
      {
        title: 'Shell: Azure resource inventory',
        language: 'bash',
        code: `#!/bin/bash

RESOURCE_GROUP="my-rg"

echo "Azure resources in $RESOURCE_GROUP"

az resource list \\
    --resource-group "$RESOURCE_GROUP" \\
    --query "[].{Name:name,Type:type,Location:location}" \\
    -o table`,
      },
      {
        title: 'Python: parse Azure CLI JSON',
        language: 'python',
        code: `import subprocess
import json

resource_group = "my-rg"

result = subprocess.run(
    [
        "az", "resource", "list",
        "--resource-group", resource_group,
        "-o", "json"
    ],
    capture_output=True,
    text=True
)

if result.returncode != 0:
    print("Failed to retrieve Azure resources")
    exit(1)

resources = json.loads(result.stdout)

for resource in resources:
    print(resource["name"], resource["type"])`,
      },
    ],
    tags: ['automation', 'azure cli', 'python'],
  },
  {
    id: 'itv-myfaq-29',
    level: 'intermediate',
    kind: 'open',
    prompt:
      'Write a Python script that checks a service on several servers and produces one report.',
    probing:
      'Handling many targets with structured results, and consolidating output instead of one alert per server.',
    answer: [
      "This is a good Python example because you're handling multiple servers and structured results. It can be extended to send one consolidated email.",
      '**Interview:** "Instead of checking servers individually, I used Python to connect to multiple servers, check the application service status, generate a consolidated report and notify the team if any server was unhealthy."',
    ],
    code: [
      {
        title: 'Check a service on multiple servers',
        language: 'python',
        code: `import subprocess

servers = [
    "server01",
    "server02",
    "server03"
]

failed = []

for server in servers:

    result = subprocess.run(
        ["ssh", server, "systemctl is-active myapp"],
        capture_output=True,
        text=True
    )

    status = result.stdout.strip()

    if status != "active":
        failed.append((server, status))

if failed:
    print("Failed servers:")

    for server, status in failed:
        print(server, status)
else:
    print("All servers are healthy")`,
      },
      {
        title: 'Consolidated report',
        language: 'text',
        code: `Server Health Report

server01 -> OK
server02 -> FAILED
server03 -> OK`,
      },
    ],
    tags: ['automation', 'python', 'ssh'],
  },
  {
    id: 'itv-myfaq-30',
    level: 'intermediate',
    kind: 'open',
    prompt: 'Write a Python script that checks application API health endpoints.',
    probing:
      'Timeouts, status-code checks, distinct handling of each failure type, and a non-zero exit for pipelines.',
    answer: [
      '**Set 1:** "After deployment, I can use Python to call application health endpoints and verify that the APIs are responding correctly. This can be part of the post-deployment validation stage."',
      '**Set 2:** "I used Python to monitor multiple application APIs. The script checked HTTP status codes and connection failures and generated an alert when an API was unavailable. This was useful as a post-deployment health check."',
      'The safe REST call sets a timeout, checks the status code, and handles each failure type separately.',
    ],
    code: [
      {
        title: 'Health check for a list of URLs',
        language: 'python',
        code: `import requests

urls = [
    "https://myapp.com/health",
    "https://myapp.com/api/health"
]

for url in urls:
    try:
        response = requests.get(url, timeout=10)

        if response.status_code == 200:
            print(f"PASS: {url}")
        else:
            print(f"FAIL: {url} - {response.status_code}")

    except requests.RequestException as e:
        print(f"ERROR: {url} - {e}")`,
      },
      {
        title: 'Monitor several APIs and fail on errors',
        language: 'python',
        code: `import requests

apis = {
    "Login API": "https://myapp.com/api/login/health",
    "Order API": "https://myapp.com/api/orders/health",
    "Payment API": "https://myapp.com/api/payment/health"
}

failed = []

for name, url in apis.items():

    try:
        response = requests.get(url, timeout=10)

        if response.status_code != 200:
            failed.append(
                f"{name}: HTTP {response.status_code}"
            )

    except requests.RequestException as error:
        failed.append(f"{name}: {error}")

if failed:
    print("API failures detected:")

    for error in failed:
        print(error)

    exit(1)

print("All APIs are healthy")`,
      },
      {
        title: 'Call a REST API safely',
        language: 'python',
        code: `import requests

url = "https://api.example.com/v1/health"
try:
    response = requests.get(url, timeout=(3, 10))
    response.raise_for_status()
    payload = response.json()
    print(payload["status"])
except requests.Timeout:
    raise SystemExit("API request timed out")
except requests.HTTPError as exc:
    raise SystemExit(f"API returned {exc.response.status_code}")
except (requests.ConnectionError, ValueError) as exc:
    raise SystemExit(f"API request failed: {exc}")`,
      },
    ],
    tags: ['automation', 'python', 'api'],
  },
  {
    id: 'itv-myfaq-31',
    level: 'advanced',
    kind: 'open',
    prompt: 'Write a script that downloads the latest backup from a remote server over SSH.',
    probing:
      'Not trusting that the newest file is complete: temporary name, checksum verification, atomic rename.',
    answer: [
      'The script finds the newest backup remotely, copies it to a temporary name, verifies the checksum, then atomically renames it.',
      'It does not assume the newest file is complete just because it exists.',
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
    followUps: [
      'How would you make this safe to run from cron without overlapping runs?',
      'What would you change if the remote host key was not already trusted?',
    ],
    tags: ['automation', 'shell', 'backup'],
  },
  {
    id: 'itv-myfaq-32',
    level: 'basic',
    kind: 'open',
    prompt: 'Write a script that finds the biggest file in a folder.',
    probing:
      'Robust find/sort handling of odd filenames, and caution before deleting anything it finds.',
    answer: [
      'The script validates the directory, lists files with their size, sorts numerically and prints the largest with `%q` so unusual names are shown safely.',
      'Do not delete the result automatically - first check whether it is an active log, open file, database file, or protected backup.',
    ],
    code: [
      {
        title: 'Find the biggest file',
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
    tags: ['automation', 'shell', 'linux'],
  },
  {
    id: 'itv-myfaq-33',
    level: 'basic',
    kind: 'open',
    prompt: "How do you capture a command's exit code correctly in a shell script?",
    probing: 'Knowing `$?` is overwritten by the next command and that pipelines need `pipefail`.',
    answer: [
      '`$?` must be captured immediately, because running `echo` or `cd` replaces it.',
      'For pipelines, enable `set -o pipefail`; otherwise `$?` reflects only the final command.',
    ],
    code: [
      {
        title: 'Capture the exit code immediately',
        language: 'bash',
        code: `curl --fail --silent https://service.example/health
status=$?
if (( status != 0 )); then
  printf 'Health check failed with exit code %d\\n' "$status" >&2
fi`,
      },
    ],
    tags: ['shell', 'exit codes'],
  },
  {
    id: 'itv-myfaq-34',
    level: 'advanced',
    kind: 'open',
    prompt: 'Give an example of a complex automation script you have written.',
    probing:
      'Whether your scripts are production-grade: validation, locking, rollback, health checks, observability.',
    answer: [
      'If asked for an example of a complex script you have written, describe a deployment script that:',
      '1. Parses the environment and version; rejects unknown values.\n2. Acquires a lock to prevent concurrent deployment.\n3. Confirms artifact signature/checksum and available disk space.\n4. Captures the current version for rollback.\n5. Drains or removes the instance from traffic.\n6. Deploys and restarts with a timeout.\n7. Tests health and a real dependency call.\n8. Restores the old version if checks fail.\n9. Returns traffic, releases the lock, emits metrics, and notifies the team.',
      'Mention `set -Eeuo pipefail`, a cleanup trap, structured logs, quoted variables, explicit exit codes, and a dry-run mode.',
      'A good story to add: a health endpoint passed while database authentication failed, so a dependency smoke test was added.',
    ],
    followUps: [
      'How do you implement the lock, and what happens if the script dies holding it?',
      'How do you test a script like this before it touches Production?',
    ],
    tags: ['automation', 'shell', 'deployment'],
  },
  {
    id: 'itv-myfaq-35',
    level: 'intermediate',
    kind: 'scenario',
    prompt:
      'An automation script works when you run it but fails in cron or a pipeline. How do you debug it?',
    probing:
      "A systematic checklist - syntax, shellcheck, tracing, environment differences - and awareness of cron's minimal environment.",
    answer: [
      'Start with a syntax check, `shellcheck` for common errors, and a trace run (avoid tracing when secrets may print).',
      'Check the shebang, executable bit, PATH, working directory, user, environment variables, permissions, exit codes, quoting, pipelines, network/DNS, and dependency versions.',
      'Scheduled jobs often fail because cron has a minimal environment.',
    ],
    code: [
      {
        title: 'Debugging automation scripts',
        language: 'bash',
        code: `bash -n deploy.sh             # syntax
shellcheck deploy.sh          # common errors
bash -x deploy.sh --dry-run   # trace; avoid when secrets may print`,
      },
    ],
    tags: ['shell', 'troubleshooting', 'cron'],
  },
  {
    id: 'itv-myfaq-36',
    level: 'intermediate',
    kind: 'open',
    prompt: 'Write a script to find unattached Azure managed disks for cost clean-up.',
    probing: 'Reporting before deleting, owner validation, and the wider set of cost automations.',
    answer: [
      'The PowerShell script reports rather than deletes, so an owner can review first.',
      'The process is report -> owner validation -> approval -> deletion after retention.',
      'Other automations stop non-production VMs after business hours, find idle public IPs and snapshots, enforce tags, right-size from metrics, and create budget alerts.',
    ],
    code: [
      {
        title: 'Export unattached managed disks to CSV',
        language: 'powershell',
        code: `$disks = Get-AzDisk | Where-Object { $_.ManagedBy -eq $null }
$disks | Select-Object Name, ResourceGroupName, DiskSizeGB, TimeCreated |
    Export-Csv ./unattached-disks.csv -NoTypeInformation`,
      },
    ],
    tags: ['automation', 'powershell', 'cost'],
  },
  {
    id: 'itv-myfaq-37',
    level: 'intermediate',
    kind: 'open',
    prompt: 'How do you run shell commands safely from Python?',
    probing:
      'Argument lists, `check=True`, timeouts, error handling, and why `shell=True` with user input is dangerous.',
    answer: [
      'Use an argument list with `check=True` and a timeout. Avoid `shell=True` for user-controlled input because it allows command injection.',
      'Handle `CalledProcessError` and `TimeoutExpired`, and redact sensitive arguments.',
    ],
    code: [
      {
        title: 'subprocess.run with check and timeout',
        language: 'python',
        code: `import subprocess

result = subprocess.run(
    ["kubectl", "get", "pods", "-n", "payments", "-o", "json"],
    check=True,
    capture_output=True,
    text=True,
    timeout=30,
)`,
      },
    ],
    tags: ['python', 'subprocess', 'security'],
  },
  {
    id: 'itv-myfaq-38',
    level: 'intermediate',
    kind: 'open',
    prompt: 'Write a Python script that pulls and charts AWS CloudWatch metrics.',
    probing:
      'Using boto3 against CloudWatch, and the production concerns: credentials, pagination, analysis, error handling.',
    answer: [
      'The script pulls 24 hours of EC2 CPU data and saves a graph.',
      'Talking points: boto3 credentials via IAM role or OIDC, pagination for large ranges, pandas for rolling averages and anomaly detection, and error handling.',
    ],
    code: [
      {
        title: 'Chart EC2 CPU from CloudWatch',
        language: 'python',
        code: `import boto3, datetime as dt
import matplotlib.pyplot as plt

cw = boto3.client("cloudwatch")
resp = cw.get_metric_statistics(
    Namespace="AWS/EC2", MetricName="CPUUtilization",
    Dimensions=[{"Name": "InstanceId", "Value": "i-0abc123"}],
    StartTime=dt.datetime.utcnow() - dt.timedelta(hours=24),
    EndTime=dt.datetime.utcnow(),
    Period=300, Statistics=["Average", "Maximum"],
)
points = sorted(resp["Datapoints"], key=lambda d: d["Timestamp"])
times = [p["Timestamp"] for p in points]
avg   = [p["Average"] for p in points]

plt.plot(times, avg, label="Avg CPU %")
plt.xlabel("Time"); plt.ylabel("CPU %"); plt.legend(); plt.title("EC2 CPU (24h)")
plt.tight_layout(); plt.savefig("cpu.png")`,
      },
    ],
    tags: ['python', 'aws', 'monitoring'],
  },
  {
    id: 'itv-myfaq-39',
    level: 'advanced',
    kind: 'open',
    prompt: 'How do you make a Python automation script production-ready?',
    probing:
      'The gap between a script that works on a laptop and one you can run unattended: config, logging, errors, tests, identity.',
    answer: [
      'A production-ready automation script has:',
      '- `argparse` or typed configuration with validation\n- Structured logs with correlation IDs and no secrets\n- Specific exception handling, timeouts, limited retries, and exit codes\n- Idempotency or a safe resume strategy\n- Unit and integration tests, linting, typing, and security scans\n- Pinned dependencies and reproducible packaging\n- Least-privilege identity and external secrets\n- Metrics/alerts and a documented runbook',
    ],
    followUps: [
      'What makes a script idempotent, and how would you test that?',
      'Where would the script get its credentials when it runs in a pipeline?',
    ],
    tags: ['python', 'automation', 'best practices'],
  },
  {
    id: 'itv-myfaq-40',
    level: 'intermediate',
    kind: 'open',
    prompt: 'How do you schedule Python automation?',
    probing:
      'Knowing the scheduler options and what every scheduled job needs: idempotency, locking, limits and alerts.',
    answer: [
      'Options: cron / systemd timers, GitHub Actions or Azure Pipelines schedules, Kubernetes CronJobs, Azure Functions timers, and workflow orchestrators.',
      'For a Kubernetes CronJob, set concurrency policy, deadlines, history limits, resource requests, and failure alerts.',
      'For any scheduler, the script must be idempotent and use a distributed lock if overlapping runs would be unsafe. Secrets come from workload identity or a secret manager, not the schedule definition.',
    ],
    tags: ['python', 'automation', 'scheduling'],
  },
]
