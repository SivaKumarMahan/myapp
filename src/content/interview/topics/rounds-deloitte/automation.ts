import type { InterviewQuestion } from '../../../types'

/** Shell and Python automation examples, the 500-VM health script and prompt writing from the Deloitte rounds. */
export const roundsDeloitteAutomationQuestions: InterviewQuestion[] = [
  {
    id: 'itv-rdel-2',
    level: 'intermediate',
    kind: 'open',
    prompt: 'Have you done any automation using scripting? What have you done?',
    probing:
      'Whether you can name concrete automation you wrote, what manual work it removed, and how it plugged into the pipeline.',
    answer: [
      'Yes. For an Azure DevOps interview, give a specific practical example, not just "I have written shell scripts."',
      '**Strong interview answer**',
      '"Yes, I have used both Bash and Python scripting for DevOps automation. One common automation I worked on was checking the health of application deployments and automating repetitive Azure and Kubernetes operations.',
      'For example, after an AKS deployment, instead of manually checking every pod, I used a Bash script to check pod status, deployment rollout status, and restart counts. If the deployment was unhealthy, the script captured the relevant pod logs and events and returned a non-zero exit code, which caused the Azure DevOps pipeline to fail.',
      'I have also used scripting for tasks like Azure resource checks, Docker image cleanup, Kubernetes operations, log collection, and automating repetitive pipeline activities."',
      '**Small Bash example** (see code below)',
      'I can call this from Azure DevOps: (see code below)',
      '**Another good example: Azure resource automation**',
      'Instead of manually checking multiple resources: (see code below)',
      'This can be added to a scheduled Azure DevOps pipeline.',
      '**Python example** - For more complex automation, I would use Python rather than a large Bash script.',
      'For example, checking Azure resources: (see code below)',
      '**If interviewer asks "Why scripting when Terraform/Ansible already exist?"** - Answer:',
      '"I don\'t use scripting to replace Terraform or Ansible. I use the right tool for the task. Terraform is for infrastructure provisioning, Ansible is useful for configuration management, and Bash or Python is useful for glue automation, validation, health checks, log collection, API calls, and tasks that don\'t justify a full IaC solution."',
    ],
    code: [
      {
        title: 'Small Bash example',
        language: 'bash',
        code: `#!/bin/bash

NAMESPACE="production"
DEPLOYMENT="myapp"

echo "Checking deployment..."

kubectl rollout status deployment/$DEPLOYMENT \\
  -n $NAMESPACE \\
  --timeout=180s

if [ $? -ne 0 ]; then
    echo "Deployment failed"

    echo "Pods:"
    kubectl get pods -n $NAMESPACE

    echo "Recent events:"
    kubectl get events -n $NAMESPACE --sort-by=.lastTimestamp | tail -20

    exit 1
fi

echo "Deployment successful"`,
      },
      {
        title: 'I can call this from Azure DevOps',
        language: 'yaml',
        code: `- script: |
    chmod +x scripts/check-deployment.sh
    ./scripts/check-deployment.sh
  displayName: 'Validate AKS Deployment'`,
      },
      {
        title: 'Instead of manually checking multiple resources',
        language: 'bash',
        code: `#!/bin/bash

RESOURCE_GROUP="my-rg"

az resource list \\
  --resource-group "$RESOURCE_GROUP" \\
  --query "[].{Name:name,Type:type}" \\
  -o table`,
      },
      {
        title: 'For example, checking Azure resources',
        language: 'python',
        code: `import subprocess

resource_group = "my-rg"

result = subprocess.run(
    ["az", "resource", "list",
     "--resource-group", resource_group,
     "-o", "json"],
    capture_output=True,
    text=True
)

if result.returncode != 0:
    print("Azure resource check failed")
    exit(1)

print(result.stdout)`,
      },
    ],
    followUps: ['Why use scripting when Terraform and Ansible already exist?'],
    tags: ['automation', 'bash', 'python'],
  },
  {
    id: 'itv-rdel-3',
    level: 'intermediate',
    kind: 'open',
    prompt: 'Give 5 automation examples each in Shell script and Python',
    probing:
      'Breadth of real day-to-day automation, and whether you know when Bash is enough and when Python is the better tool.',
    answer: [
      'For an Azure DevOps / DevOps interview, use examples that sound like real day-to-day work, not generic programming exercises.',
      '**5 Shell scripting automation examples**',
      '**1. Kubernetes deployment health check**',
      'Used after deployment to check that pods are running and rollout is completed.',
      '**Interview explanation**',
      '"I used a shell script after AKS deployment to automatically check rollout status. If the rollout failed, the script collected pod status and Kubernetes events and failed the Azure DevOps pipeline."',
      '**2. Docker image cleanup**',
      'Useful on self-hosted agents where old Docker images fill up the disk.',
      '**Interview explanation**',
      '"On self-hosted build agents, Docker images can consume a lot of disk space. I automated cleanup of unused images and containers using a shell script and scheduled it through cron or an Azure DevOps pipeline."',
      '**3. Check disk space and alert** (see code below)',
      '**Interview explanation**',
      '"I used shell scripting to monitor disk utilization on Linux servers. If usage crossed the configured threshold, the script returned a failure code so the monitoring or pipeline process could trigger an alert."',
      '**4. Backup and compress application logs** (see code below)',
      '**Interview explanation**',
      '"I automated application log backup by compressing the logs and creating a date-based archive. This helps with log retention and prevents the server disk from filling up."',
      '**5. Azure resource inventory** (see code below)',
      '**Interview explanation**',
      '"I used Azure CLI inside a shell script to automate resource inventory. Instead of manually checking resources in the Azure portal, the script retrieves resource names, types and locations and can be scheduled or integrated into a pipeline."',
      '**5 Python automation examples**',
      'Python is more useful when the automation needs API calls, JSON processing, complex logic, or bigger workflows.',
      '**1. Check Azure resources using Azure CLI** (see code below)',
      '**Interview explanation**',
      '"I used Python when I needed to process Azure CLI JSON output. The script retrieves resources, parses the JSON and performs additional logic such as filtering or reporting."',
      '**2. Kubernetes pod health checker** (see code below)',
      '**Interview explanation**',
      '"I used Python to query Kubernetes, parse the JSON response and identify pods that were not running. This was integrated into the deployment validation stage of the CI/CD pipeline."',
      '**3. Docker image cleanup based on age**',
      'Python gives more control than a simple `docker prune`.',
      'In a real implementation, I would parse the creation timestamp and remove images older than the retention period.',
      '**Interview explanation**',
      '"I used Python when cleanup rules became more complex, for example retaining the latest N images or deleting images older than a defined number of days."',
      '**4. Parse application logs and find errors** (see code below)',
      '**Interview explanation**',
      '"I used Python for log analysis because it is easier to implement filtering and pattern matching. The script scans application logs, identifies ERROR and EXCEPTION entries, counts them and can fail a pipeline or trigger an alert if the count exceeds a threshold."',
      '**5. Automated health check for application APIs** (see code below)',
      '**Interview explanation**',
      '"After deployment, I can use Python to call application health endpoints and verify that the APIs are responding correctly. This can be part of the post-deployment validation stage."',
      '**How to answer in the interview** - If they ask:',
      '"What automation have you done using Shell and Python?" Give this answer:',
      '"I have used shell scripting mainly for lightweight Linux, Kubernetes and CI/CD automation. Five examples are Kubernetes deployment health checks, Docker cleanup on self-hosted agents, Linux disk-space monitoring, application log backup and Azure resource inventory using Azure CLI.',
      'I use Python when the automation requires more complex logic or data processing. For example, I have used Python for Azure resource processing, Kubernetes pod health checks, Docker image cleanup based on retention rules, application log analysis, and API health checks.',
      'I generally use Bash for simple command orchestration and pipeline tasks, while I prefer Python when I need JSON processing, API integration, error handling, or more complex business logic."',
      '**The important distinction**',
      '- **Shell:** Quick server automation - **Python:** Complex automation\n- **Shell:** Linux commands - **Python:** APIs\n- **Shell:** kubectl / az / docker orchestration - **Python:** JSON processing\n- **Shell:** File operations - **Python:** Log analysis\n- **Shell:** Simple health checks - **Python:** Complex health checks\n- **Shell:** CI/CD helper scripts - **Python:** Larger automation tools',
    ],
    code: [
      {
        title: 'Kubernetes deployment health check',
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
        title: 'Docker image cleanup',
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
        title: 'Check disk space and alert',
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
        title: 'Backup and compress application logs',
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
        title: 'Azure resource inventory',
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
        title: 'Check Azure resources using Azure CLI',
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
      {
        title: 'Kubernetes pod health checker',
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
        title: 'Docker image cleanup based on age',
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
      {
        title: 'Parse application logs and find errors',
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
        title: 'Automated health check for application APIs',
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
    ],
    tags: ['automation', 'bash', 'python'],
  },
  {
    id: 'itv-rdel-10',
    level: 'intermediate',
    kind: 'open',
    prompt:
      'Give 5 more automation examples — restarting services, checking error logs, taking backups, sending alert emails',
    probing:
      'Whether your automation examples name the manual toil they removed and include alerting, scheduling and failure exit codes.',
    answer: [
      'Yes. Those are better real-world DevOps automation examples for an interview. Use examples where you can clearly explain the manual work that was eliminated.',
      '**5 Shell scripting automation examples**',
      '**1. Automatically restart a failed service**',
      'Problem: Application service occasionally stops. Someone had to SSH into the server, check it and restart it.',
      'Automation flow: (see code below)',
      '**Interview explanation**',
      '"I automated service health checking. If the service was down, the script automatically restarted it and returned a failure if the restart didn\'t succeed."',
      '**2. Check application logs for errors and send email**',
      'Problem: DevOps team had to manually search logs for `ERROR` and `Exception`.',
      'You can schedule this using cron: `*/10 * * * * /opt/scripts/check_logs.sh`',
      '**Interview explanation**',
      '"I automated log monitoring using grep and cron. If the script found application errors, it collected the recent errors and sent an email to the support team."',
      '**3. Automated server backup**',
      'Problem: Manual backup of configuration files and application data.',
      'Schedule: `0 2 * * * /opt/scripts/backup.sh`',
      '**Interview explanation**',
      '"I automated daily configuration backups using tar and cron. The backup file had a timestamp, and the script returned a failure if the backup operation failed."',
      '**4. Disk-space monitoring and alert**',
      'Problem: Servers were running out of disk space because of logs and temporary files.',
      '**Interview explanation**',
      '"I created a shell script that checks disk utilization periodically. If usage crossed 80%, it automatically sent an email alert so we could take action before the server became unavailable."',
      '**5. Automated log cleanup**',
      'Problem: Application logs were filling the server.',
      '**Interview explanation**',
      '"I automated log retention using the Linux find command. Logs older than seven days were removed based on our retention requirement. This prevented unnecessary disk consumption."',
      '**5 Python automation examples**',
      'Python examples should demonstrate where Python is better than a simple Bash command, especially API calls, JSON processing, structured reporting and exception handling.',
      '**1. Restart service and send email if restart fails** (see code below)',
      '**Interview explanation**',
      '"I used Python to monitor a Linux service. If it was down, the script attempted a restart. If the restart failed, it automatically sent an email notification."',
      '**2. Parse logs and generate an error report**',
      'Python is useful when log analysis becomes more complex.',
      'You can then email `/tmp/error_report.txt`.',
      '**Interview explanation**',
      '"I used Python to parse application logs, identify different error patterns using regular expressions, generate a report and send it to the support team."',
      '**3. Automated backup with retention** (see code below)',
      '**Interview explanation**',
      '"I used Python to automate backups and retention. It created timestamped compressed backups and automatically removed backups older than the retention period."',
      '**4. Monitor multiple servers and send one email report**',
      "This is a good Python example because you're handling multiple servers and structured results.",
      'This can be extended to send one consolidated email: (see code below)',
      '**Interview explanation**',
      '"Instead of checking servers individually, I used Python to connect to multiple servers, check the application service status, generate a consolidated report and notify the team if any server was unhealthy."',
      '**5. API health monitoring**',
      'Python is very useful for automating application/API checks.',
      '**Interview explanation**',
      '"I used Python to monitor multiple application APIs. The script checked HTTP status codes and connection failures and generated an alert when an API was unavailable. This was useful as a post-deployment health check."',
      '**Which examples should you tell the interviewer?**',
      "I'd use these 10 examples because they sound realistic for a DevOps role:",
      '- **Shell:** Restart failed service - **Python:** Restart service + email alert\n- **Shell:** Search logs for errors - **Python:** Parse logs + generate report\n- **Shell:** Automated server backup - **Python:** Backup + retention\n- **Shell:** Disk-space monitoring - **Python:** Monitor multiple servers\n- **Shell:** Log cleanup - **Python:** API health monitoring',
      '**Best 30-second answer**',
      '"Yes, I have automated several repetitive operational tasks using Shell and Python. In Shell, I automated service restart, application log error checking with email alerts, server backups, disk-space monitoring and log cleanup using cron. In Python, I used scripts for more complex automation such as service monitoring with email notifications, parsing application logs and generating reports, backup and retention management, checking multiple servers, and API health monitoring. These scripts reduced manual intervention and could be integrated with our Azure DevOps pipelines or scheduled through cron."',
    ],
    code: [
      {
        title: 'Automatically restart a failed service',
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
     v
Service down?
     |
     v
  Restart
     |
     v
Still down?
     |
     v
Send alert`,
      },
      {
        title: 'Check application logs for errors and send email',
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
fi`,
      },
      {
        title: 'Check application logs for errors and send email - snippet',
        language: 'text',
        code: `*/10 * * * * /opt/scripts/check_logs.sh`,
      },
      {
        title: 'Automated server backup',
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
fi`,
      },
      {
        title: 'Automated server backup - snippet',
        language: 'text',
        code: `0 2 * * * /opt/scripts/backup.sh`,
      },
      {
        title: 'Disk-space monitoring and alert',
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
        title: 'Automated log cleanup',
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
        title: 'Restart service and send email if restart fails',
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
        title: 'Parse logs and generate an error report',
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
        title: 'Automated backup with retention',
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
        title: 'Monitor multiple servers and send one email report',
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
        title: 'This can be extended to send one consolidated email',
        language: 'text',
        code: `Server Health Report

server01 -> OK
server02 -> FAILED
server03 -> OK`,
      },
      {
        title: 'API health monitoring',
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
    ],
    tags: ['automation', 'bash', 'python', 'alerting'],
  },
  {
    id: 'itv-rdel-24',
    level: 'intermediate',
    kind: 'open',
    prompt: 'Write a prompt to ask an AI assistant to analyze a failing Jenkins Maven build',
    promptCode: [
      {
        title: 'Scenario',
        language: 'text',
        code: `Scenario (Prompt Writing exercise): A Jenkins pipeline that builds a Java application is failing during the Maven build stage. The source code has been downloaded successfully, but the build stops because of compilation errors.

Task: As a DevOps engineer, write the prompt you would give an AI assistant to analyze the build failure and suggest solutions. The prompt should be clear and provide enough information for the AI to generate a useful response.`,
      },
    ],
    probing:
      'Whether you can give an AI assistant enough context, scope and a clear ask to get a useful diagnosis rather than a generic guess.',
    answer: [
      '**Prompt** (see code below)',
      '**Why this prompt works**',
      '- **States the context** — Jenkins, Maven, Java, and confirms checkout succeeded so the AI doesn\'t waste time suggesting checkout/source-control fixes.\n- **Narrows the failure type** — explicitly says "compilation errors," not a generic "build failed," so the AI focuses on the right category of causes.\n- **Lists likely root-cause categories** — Java version, dependencies, source code, build configuration — which steers the AI toward a structured diagnosis instead of a generic guess.\n- **Asks for actionable output** — not just an explanation, but a specific fix plus Maven commands to verify it (e.g. `mvn -v`, `mvn dependency:tree`, `mvn clean compile`).\n- **Leaves a placeholder for the actual logs** — the real error text is what the AI needs most; the prompt is built to be pasted along with it.',
    ],
    code: [
      {
        title: 'Prompt',
        language: 'text',
        code: `Analyze the following Jenkins Maven build failure. Identify the root cause of
the compilation errors, explain the errors clearly, and suggest specific fixes.
Consider possible issues with Java version, Maven dependencies, source code, or
build configuration. Provide the recommended solution and relevant Maven
commands to verify the fix.

Build stage: Maven
Build result: Compilation failed
Source code checkout: Successful
Error logs: [Paste the complete Maven compilation error logs here]`,
      },
    ],
    tags: ['ai', 'prompting', 'jenkins', 'maven'],
  },
  {
    id: 'itv-rdel-31',
    level: 'advanced',
    kind: 'open',
    prompt:
      'You manage 500 Linux VMs. Write a Bash script that checks disk, memory and Nginx status, generates a CSV report, handles unreachable servers and reports only unhealthy ones.',
    promptCode: [
      {
        title: 'Scenario',
        language: 'text',
        code: `Task:

- Checks disk utilization
- Checks memory utilization
- Checks if the nginx service is running
- Generates a CSV report
- Handles server-unreachable scenarios
- Reports only the unhealthy servers`,
      },
    ],
    probing:
      'Whether you can write a robust fleet health script - timeouts, non-interactive SSH, failure handling, clean reports - and know it must be parallel at 500 hosts.',
    answer: [
      'For 500 Linux VMs, I would use SSH + Bash from a central management server. The script checks each server, writes a CSV report, and separately records only unhealthy servers.',
      '**Bash script** (see code below)',
      '`servers.txt`: (see code below)',
      'For 500 servers, this file would contain all 500 hostnames or IP addresses.',
      '**Example output** (see code below)',
      '**Simple explanation** (see code below)',
      '**1. Disk utilization** - `df -P / | awk ...`',
      'Checks the root filesystem `/`. If disk usage is 80% or higher, the server is marked unhealthy.',
      '**2. Memory utilization** - `free | awk ...`',
      'Calculates used memory as a percentage. If memory is 80% or higher, it is considered unhealthy.',
      '**3. Nginx** - `systemctl is-active nginx`',
      'Returns `active` when Nginx is running. Anything else means Nginx is unhealthy.',
      '**4. Unreachable server**',
      'Before running the checks, we test SSH: `ssh -o ConnectTimeout=5 ...`',
      "If SSH fails, we don't waste time running the other commands. The server is marked `UNREACHABLE`.",
      '**5. CSV report** - The script generates two files: (see code below)',
      '**Understanding the SSH connectivity check in detail**',
      'This part of the script specifically checks whether a Linux VM is reachable over SSH before doing the disk, memory, and Nginx checks.',
      '**1. The actual SSH command**',
      '`ssh "$SERVER" "echo connected"`',
      'It tries to connect to the server and execute `echo connected`. If the connection works, SSH returns exit code `0`. If it fails, SSH returns a non-zero exit code.',
      '**2. What does `!` mean?** - `if ! ssh ...` - `!` means NOT.',
      'Normally, `if ssh server01 ...` means "if SSH succeeds, execute `then`." But `if ! ssh server01 ...` means "if SSH fails, execute `then`." So here we are specifically handling the failure scenario.',
      '**3. `ConnectTimeout=5`**',
      '`-o ConnectTimeout=5`',
      'This tells SSH to wait a maximum of 5 seconds while trying to establish the connection. Without a timeout, an unreachable server could potentially cause the script to wait much longer. For 500 servers, this is important.',
      '**4. `BatchMode=yes`** - `-o BatchMode=yes`',
      "This prevents SSH from asking for interactive input such as `Enter passphrase:`, `Are you sure you want to continue connecting?`, or `Password:`. For automation, we don't want the script to stop and wait for someone to type something. Ideally, SSH keys are already configured: (see code below)",
      '**5. Why `echo connected`?**',
      '`"$SERVER" "echo connected"`',
      'Suppose `SERVER="server01"`. This becomes `ssh server01 "echo connected"`. If SSH works, the remote server executes `echo connected` and returns successfully. We\'re not actually interested in the word `connected` — we\'re using the command to verify that SSH connection + remote command execution are working.',
      '**6. What does `&>/dev/null` mean?** - `&>/dev/null`',
      'It suppresses both standard output and standard error. For example, instead of displaying `ssh: connect to host server01 port 22: Connection timed out`, nothing is displayed. We only care about the exit status because the `if` statement checks whether SSH succeeded or failed.',
      '**7. The `then` section** (see code below)',
      'Suppose `SERVER=server05` and server05 is unreachable. The complete report gets: `server05,UNREACHABLE,N/A,N/A,N/A,SSH connection failed`',
      'And the unhealthy report gets: `server05,N/A,N/A,N/A,SSH connection failed`',
      "We use `N/A` because we couldn't connect to the server, so we cannot check disk, memory, or Nginx.",
      '**8. Why `continue`?** - `continue`',
      'Once SSH fails, there is no point executing `df`, `free`, or `systemctl is-active nginx`, because those commands need to run on the remote server. `continue` means: stop processing this server and move to the next server in `servers.txt`.',
      '**Interview explanation**',
      'If they ask "How would you handle 500 servers?", don\'t say you would manually SSH into each server. Say:',
      '"I would maintain the server list in a file and run a centralized Bash health-check script using SSH. The script checks connectivity first, then disk, memory, and Nginx status. I would define thresholds such as 80% for disk and memory. The script generates a CSV containing the health status of all servers and a separate report containing only unhealthy or unreachable servers. For 500 servers, I would further optimize it by running the checks in parallel rather than sequentially."',
      'That last point is important. The script above is sequential, so for a real 500-VM environment, parallel SSH using `xargs -P`, GNU Parallel, or Ansible would be better.',
      'If SSH fails specifically, the shorter version of the answer is:',
      '"First, I perform an SSH connectivity check with a 5-second timeout. I use BatchMode so the script doesn\'t wait for interactive input. If SSH fails, I mark the server as UNREACHABLE in the CSV, add it to the unhealthy report, and use `continue` to skip the remaining health checks and move to the next server."',
    ],
    code: [
      {
        title: 'Bash script',
        language: 'bash',
        code: `#!/bin/bash

SERVERS_FILE="servers.txt"
REPORT="server_health_report_$(date +%Y%m%d_%H%M%S).csv"
UNHEALTHY="unhealthy_servers_$(date +%Y%m%d_%H%M%S).csv"

# Thresholds
DISK_THRESHOLD=80
MEMORY_THRESHOLD=80

# CSV headers
echo "Server,Status,Disk_Usage,Memory_Usage,Nginx_Status,Reason" > "$REPORT"
echo "Server,Disk_Usage,Memory_Usage,Nginx_Status,Reason" > "$UNHEALTHY"

while read -r SERVER
do
    # Skip empty lines and comments
    [[ -z "$SERVER" || "$SERVER" =~ ^# ]] && continue

    echo "Checking $SERVER..."

    # Check SSH connectivity
    if ! ssh -o ConnectTimeout=5 \\
            -o BatchMode=yes \\
            "$SERVER" "echo connected" &>/dev/null
    then
        echo "$SERVER,UNREACHABLE,N/A,N/A,N/A,SSH connection failed" >> "$REPORT"
        echo "$SERVER,N/A,N/A,N/A,SSH connection failed" >> "$UNHEALTHY"
        continue
    fi

    # Collect disk usage
    DISK=$(ssh "$SERVER" \\
        "df -P / | awk 'NR==2 {gsub(/%/,\\"\\",\\$5); print \\$5}'")

    # Collect memory usage
    MEMORY=$(ssh "$SERVER" \\
        "free | awk '/Mem:/ {printf \\"%.0f\\", \\$3/\\$2*100}'")

    # Check nginx
    NGINX=$(ssh "$SERVER" \\
        "systemctl is-active nginx 2>/dev/null || echo inactive")

    REASONS=""

    # Check disk
    if [ "$DISK" -ge "$DISK_THRESHOLD" ]; then
        REASONS="Disk usage \${DISK}%"
    fi

    # Check memory
    if [ "$MEMORY" -ge "$MEMORY_THRESHOLD" ]; then
        [ -n "$REASONS" ] && REASONS="$REASONS; "
        REASONS="\${REASONS}Memory usage \${MEMORY}%"
    fi

    # Check nginx
    if [ "$NGINX" != "active" ]; then
        [ -n "$REASONS" ] && REASONS="$REASONS; "
        REASONS="\${REASONS}Nginx is not running"
    fi

    # Determine server health
    if [ -n "$REASONS" ]; then
        STATUS="UNHEALTHY"
    else
        STATUS="HEALTHY"
        REASONS="None"
    fi

    # Write complete report
    echo "$SERVER,$STATUS,\${DISK}%,\${MEMORY}%,$NGINX,\\"$REASONS\\"" >> "$REPORT"

    # Write only unhealthy servers
    if [ "$STATUS" = "UNHEALTHY" ]; then
        echo "$SERVER,\${DISK}%,\${MEMORY}%,$NGINX,\\"$REASONS\\"" >> "$UNHEALTHY"
    fi

done < "$SERVERS_FILE"

echo
echo "Health check completed."
echo "Complete report : $REPORT"
echo "Unhealthy report : $UNHEALTHY"`,
      },
      {
        title: 'servers.txt',
        language: 'text',
        code: `server01
server02
server03
server04
server05`,
      },
      {
        title: 'Example output - Complete CSV',
        language: 'text',
        code: `Server,Status,Disk_Usage,Memory_Usage,Nginx_Status,Reason
server01,HEALTHY,45%,52%,active,"None"
server02,UNHEALTHY,91%,60%,active,"Disk usage 91%"
server03,UNHEALTHY,55%,88%,active,"Memory usage 88%"
server04,UNHEALTHY,40%,50%,inactive,"Nginx is not running"
server05,UNREACHABLE,N/A,N/A,N/A,"SSH connection failed"`,
      },
      {
        title: 'Example output - Unhealthy CSV',
        language: 'text',
        code: `Server,Disk_Usage,Memory_Usage,Nginx_Status,Reason
server02,91%,60%,active,"Disk usage 91%"
server03,55%,88%,active,"Memory usage 88%"
server04,40%,50%,inactive,"Nginx is not running"
server05,N/A,N/A,N/A,"SSH connection failed"`,
      },
      {
        title: 'Simple explanation - The flow is',
        language: 'text',
        code: `500 servers
     |
     v
Read server name
     |
     v
Check SSH connectivity
     |
     +---- Failed ---> UNREACHABLE
     |
     v
Check disk usage
     |
     v
Check memory usage
     |
     v
Check nginx service
     |
     v
Compare with thresholds
     |
     +---- Everything OK ---> HEALTHY
     |
     +---- Any issue -------> UNHEALTHY
                              |
                              v
                     Add to unhealthy CSV`,
      },
      {
        title: 'Disk utilization - commands',
        language: 'bash',
        code: `df -P / | awk ...`,
      },
      {
        title: 'Memory utilization - commands',
        language: 'bash',
        code: `free | awk ...`,
      },
      {
        title: 'Nginx - commands',
        language: 'bash',
        code: `systemctl is-active nginx`,
      },
      {
        title: 'Unreachable server - commands',
        language: 'bash',
        code: `ssh -o ConnectTimeout=5 ...`,
      },
      {
        title: 'The script generates two files',
        language: 'text',
        code: `server_health_report_*.csv  -> all servers
unhealthy_servers_*.csv     -> only unhealthy/unreachable servers`,
      },
      {
        title: 'The actual SSH command - commands',
        language: 'bash',
        code: `ssh "$SERVER" "echo connected"`,
      },
      {
        title: 'What does ! mean? - commands',
        language: 'bash',
        code: `if ! ssh ...`,
      },
      {
        title: 'ConnectTimeout=5 - snippet',
        language: 'text',
        code: `-o ConnectTimeout=5`,
      },
      {
        title: 'BatchMode=yes - snippet',
        language: 'text',
        code: `-o BatchMode=yes`,
      },
      {
        title: 'BatchMode=yes',
        language: 'text',
        code: `Management Server
       |
       | SSH key
       v
    server01
    server02
    server03`,
      },
      {
        title: 'Why echo connected? - commands',
        language: 'bash',
        code: `"$SERVER" "echo connected"`,
      },
      {
        title: 'What does &>/dev/null mean? - snippet',
        language: 'text',
        code: `&>/dev/null`,
      },
      {
        title: 'The then section - If SSH fails',
        language: 'bash',
        code: `then
    echo "$SERVER,UNREACHABLE,N/A,N/A,N/A,SSH connection failed" >> "$REPORT"
    echo "$SERVER,N/A,N/A,N/A,SSH connection failed" >> "$UNHEALTHY"
    continue
fi`,
      },
      {
        title: 'The then section - snippet',
        language: 'text',
        code: `server05,UNREACHABLE,N/A,N/A,N/A,SSH connection failed

server05,N/A,N/A,N/A,SSH connection failed`,
      },
      {
        title: 'Why continue? - For example',
        language: 'text',
        code: `server01 -> SSH OK     -> check everything
server02 -> SSH OK     -> check everything
server03 -> SSH FAILED -> mark unreachable -> skip -> server04
server04 -> SSH OK     -> check everything`,
      },
    ],
    followUps: [
      'How would you run these checks in parallel with `xargs -P`, GNU Parallel or Ansible?',
      'What happens to the integer comparison if `df` returns nothing for a server, and how would you guard against it?',
    ],
    tags: ['bash', 'automation', 'ssh', 'linux'],
  },
]
