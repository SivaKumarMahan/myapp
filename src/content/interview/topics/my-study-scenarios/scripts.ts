import type { InterviewQuestion } from '../../../types'

/** Shell, Dockerfile and Python automation and debugging scenarios. */
export const myStudyScenariosScriptQuestions: InterviewQuestion[] = [
  {
    id: 'itv-mystsc-50',
    level: 'advanced',
    kind: 'scenario',
    prompt:
      'Shell script for 500 servers: what are the problems with this script, and how would you make it production-ready?',
    promptCode: [
      {
        title: 'The script',
        language: 'bash',
        code: `#!/bin/bash

for server in $(cat servers.txt)
do
    ssh $server "df -h"
    ssh $server "systemctl status nginx"
done`,
      },
    ],
    probing:
      'Whether you see the sequential, unbounded, error-blind design and fix it with timeouts, controlled parallelism and per-host logging.',
    answer: [
      '**Problems with this script**',
      "1. **Fully sequential** — with 500 servers, this runs one SSH connection at a time; if each takes even a few seconds, the whole run takes a very long time.\n2. **No error handling** — if a server is unreachable, the script just moves to the next one with no logging of the failure, no exit code check, and no summary of failures.\n3. **Unquoted variable** (`$server`) — breaks on any hostname with spaces or unexpected characters, and is generally unsafe shell practice.\n4. **Two separate SSH connections per server** — doubles connection overhead; both commands could run in one SSH session.\n5. **No timeout** — a single unreachable/hanging server can block the whole script indefinitely (no `ConnectTimeout`).\n6. **No parallelism control** — running all 500 at once could also overwhelm the network/local machine, so unlimited parallelism isn't safe either.",
      '**Improved version for production**\nKey improvements:',
      "- `xargs -P` runs checks in parallel with a controlled limit (20 at a time), instead of one at a time.\n- `-o ConnectTimeout` prevents one dead server from hanging the whole run.\n- Each server's output is logged to its own file for later review.\n- Success/failure is printed per server instead of silently continuing.",
      '**Short interview answer**\n"With 500 servers, running SSH sequentially is far too slow and has no error handling — a hung or unreachable server can block everything indefinitely. I\'d add `ConnectTimeout` to fail fast on unreachable hosts, run checks in parallel with a controlled concurrency limit using something like `xargs -P`, log each server\'s output to its own file, and print a clear success/failure summary instead of silently continuing past errors."',
    ],
    code: [
      {
        title: 'Improved version for production',
        language: 'bash',
        code: `#!/bin/bash
set -uo pipefail

SERVERS_FILE="servers.txt"
MAX_PARALLEL=20
TIMEOUT=10

check_server() {
    local server="$1"
    if ! ssh -o ConnectTimeout="$TIMEOUT" -o BatchMode=yes "$server" \\
        "df -h && systemctl status nginx" > "logs/\${server}.log" 2>&1; then
        echo "FAILED: $server"
    else
        echo "OK: $server"
    fi
}
export -f check_server
export TIMEOUT

mkdir -p logs

xargs -a "$SERVERS_FILE" -P "$MAX_PARALLEL" -I{} bash -c 'check_server "$@"' _ {}`,
      },
    ],
    followUps: [
      'Would you use Ansible instead of a loop over SSH here? Why?',
      'How would you produce a summary of failed hosts at the end?',
    ],
    tags: ['shell', 'bash', 'automation', 'ssh'],
  },
  {
    id: 'itv-mystsc-51',
    level: 'intermediate',
    kind: 'scenario',
    prompt:
      'Shell script error handling: what happens in this deployment script if `cp` fails, and how do you fix it?',
    promptCode: [
      {
        title: 'The script',
        language: 'bash',
        code: `#!/bin/bash

cp /backup/app.tar.gz /tmp/
tar -xzf /tmp/app.tar.gz
systemctl restart nginx

echo "Deployment successful"`,
      },
    ],
    probing:
      'Whether you know Bash continues after failures by default and what each part of `set -euo pipefail` does.',
    answer: [
      '**What happens with the current script?**\nIf: `cp /backup/app.tar.gz /tmp/` fails, the script continues executing by default.',
      "The `tar` command may also fail because the archive wasn't copied, but the script still continues.",
      "Worst case, `systemctl restart nginx` could restart the service using an old or partially updated deployment, and the script still prints: `Deployment successful` That's incorrect.",
      '**Simple fix: `set -e`**\nThis is the basic answer expected in an interview.',
      '**What does `set -euo pipefail` mean?**\n**`set -e`** — Exit when a command fails.\n`cp file /tmp/` fails → script exits.',
      '**`set -u`** — Treat undefined variables as errors.\nFor example: `echo "$APP_VERSION"` — if `APP_VERSION` was never defined, the script fails instead of silently continuing.',
      '**`set -o pipefail`** — Normally, in `command1 | command2`, the exit status is usually based on the last command. With `pipefail`, the pipeline fails if an earlier command fails.',
      '**Add explicit error handling**\nThis gives you a clear failure point.',
      "**Strong interview answer**\n\"By default, Bash does not stop when a command fails. If `cp` fails, the script continues to `tar`, then potentially restarts nginx, and finally prints 'Deployment successful'. That's dangerous because the deployment could be incomplete. I would use `set -euo pipefail` so unexpected command failures stop the script, and for critical deployment steps I would also use explicit error handling with `if ! command; then ... exit 1; fi` so the failure is clearly logged.\"",
      '**Remember**\nWithout error handling: `cp fails → script continues` ❌\nWith `set -e`: `cp fails → script stops` ✅\nProduction: `set -euo pipefail` + explicit checks for critical operations',
    ],
    code: [
      {
        title: 'Flow without error handling',
        language: 'text',
        code: `cp fails
  ↓
tar -xzf /tmp/app.tar.gz
  ↓
systemctl restart nginx
  ↓
echo "Deployment successful"`,
      },
      {
        title: 'Simple fix: set -e',
        language: 'bash',
        code: `#!/bin/bash
set -e

cp /backup/app.tar.gz /tmp/
tar -xzf /tmp/app.tar.gz
systemctl restart nginx

echo "Deployment successful"`,
      },
      {
        title: 'Flow with set -e',
        language: 'text',
        code: `cp fails
  ↓
Script exits
  ↓
tar is NOT executed
  ↓
nginx is NOT restarted
  ↓
"Deployment successful" is NOT printed`,
      },
      {
        title: 'Better production version: set -euo pipefail',
        language: 'bash',
        code: `#!/bin/bash
set -euo pipefail

cp /backup/app.tar.gz /tmp/
tar -xzf /tmp/app.tar.gz
systemctl restart nginx

echo "Deployment successful"`,
      },
      {
        title: 'Explicit error handling',
        language: 'bash',
        code: `#!/bin/bash
set -euo pipefail

echo "Starting deployment..."

if ! cp /backup/app.tar.gz /tmp/app.tar.gz; then
    echo "ERROR: Failed to copy application archive"
    exit 1
fi

if ! tar -xzf /tmp/app.tar.gz -C /opt/app; then
    echo "ERROR: Failed to extract application archive"
    exit 1
fi

if ! systemctl restart nginx; then
    echo "ERROR: Failed to restart nginx"
    exit 1
fi

echo "Deployment successful"`,
      },
    ],
    traps: [
      'Don\'t blindly say "`set -e` makes every Bash script fail safely." Bash has some contexts where `set -e` behaves differently, particularly around conditions, `&&`, `||`, `if`, loops, and pipelines.',
      'For critical deployment automation, combine `set -euo pipefail` with explicit checks around important operations.',
    ],
    tags: ['shell', 'bash', 'error handling'],
  },
  {
    id: 'itv-mystsc-52',
    level: 'basic',
    kind: 'scenario',
    prompt:
      'Shell script disk monitoring bug: why does this disk usage check fail, and how do you fix it?',
    promptCode: [
      {
        title: 'The script',
        language: 'bash',
        code: `DISK=$(df -h / | awk 'NR==2 {print $5}')

if [ $DISK -gt 80 ]; then
    echo "Disk usage is high"
fi`,
      },
    ],
    probing:
      'Whether you notice the `%` sign breaks the integer comparison and know script-friendly `df -P` output.',
    answer: [
      '**The bug**\n`df -h` prints the usage column with a `%` sign, e.g. `85%`. So `$DISK` holds the string `85%`, not the number `85`. The comparison: `[ 85% -gt 80 ]` fails with an "integer expression expected" error, because `-gt` needs a plain integer, not a string with a `%` at the end.',
      '**The fix**\nStrip the `%` sign before comparing, and avoid `-h` (human-readable units like `1.2G` also break numeric comparisons) — use plain block output instead:',
      "`df -P` gives POSIX-standard single-line output (avoids line-wrapping issues with very long device names), and `tr -d '%'` removes the percent sign so `$DISK` is a clean integer.",
      '**Short interview answer**\n"The bug is that `df -h` includes a `%` sign in the usage field, so the variable holds something like `85%`, and comparing that with `-gt` in a numeric test fails or behaves unexpectedly. The fix is to strip the `%` character with `tr -d \'%\'` before the comparison, and use `df -P` instead of `-h` for reliable single-line, script-friendly output."',
    ],
    code: [
      {
        title: 'The fix',
        language: 'bash',
        code: `DISK=$(df -P / | awk 'NR==2 {print $5}' | tr -d '%')

if [ "$DISK" -gt 80 ]; then
    echo "Disk usage is high"
fi`,
      },
    ],
    tags: ['shell', 'bash', 'monitoring'],
  },
  {
    id: 'itv-mystsc-53',
    level: 'intermediate',
    kind: 'scenario',
    prompt:
      'Dockerfile security, reliability and optimization: what problems do you see in this Dockerfile, and how would you fix them?',
    promptCode: [
      {
        title: 'The Dockerfile',
        language: 'dockerfile',
        code: `FROM ubuntu:latest

RUN apt-get update
RUN apt-get install -y openjdk-17-jdk

COPY . /app

ENV DB_PASSWORD=<hardcoded-password>

WORKDIR /app

CMD ["java", "-jar", "app.jar"]`,
      },
    ],
    probing:
      'Whether you catch the baked-in secret, root user, unpinned base, split apt-get layers and oversized JDK image.',
    answer: [
      '**Problems**\n**Security:**',
      '- `ENV DB_PASSWORD=<hardcoded-password>` bakes a real secret into the image layers — anyone who can pull or inspect the image (`docker history`) can see it.\n- `ubuntu:latest` is an unpinned, mutable tag — the image can silently change over time, breaking reproducibility and potentially introducing vulnerabilities.\n- No non-root user — the container runs as `root` by default, which is a bigger blast radius if the app is compromised.\n- Installs the full JDK (includes compilers/dev tools) instead of just a JRE, growing the attack surface unnecessarily.',
      '**Reliability problems:**',
      '- `RUN apt-get update` on its own line, separate from `apt-get install`, can use a stale cached layer for `update` while installing a newer package list — a classic Docker caching pitfall. They should be combined in one `RUN`.\n- No version pinning for `openjdk-17-jdk` — install could silently pull a different patch version between builds.\n- `COPY . /app` copies everything, including potentially unnecessary files (`.git`, local configs, secrets) — no `.dockerignore` mentioned.',
      '**Image size / optimization:**',
      '- `ubuntu:latest` + full JDK is a large base; no multi-stage build to strip build-time dependencies from the final image.',
      '**Corrected Dockerfile**\nThe `DB_PASSWORD` should never be baked into the image — it should be injected at runtime via `docker run -e DB_PASSWORD=...` (sourced from a secrets manager), or via Kubernetes Secrets if deployed there.',
      '**Short interview answer**\n"There are three categories of problems here: security — a real secret baked into the image via `ENV`, and the container running as root; reliability — `apt-get update` and `install` split into separate `RUN` layers, which can install against a stale package index, plus an unpinned `ubuntu:latest` base; and size — using a full JDK and Ubuntu base instead of a slim JRE image. I\'d switch to a pinned, JRE-only base image, add a non-root user, remove the hardcoded secret and inject it at runtime instead, and combine related `RUN` steps."',
    ],
    code: [
      {
        title: 'Corrected Dockerfile',
        language: 'dockerfile',
        code: `FROM eclipse-temurin:17-jre-jammy

RUN groupadd -r appgroup && useradd -r -g appgroup appuser

WORKDIR /app

COPY --chown=appuser:appgroup target/app.jar /app/app.jar

USER appuser

CMD ["java", "-jar", "app.jar"]`,
      },
    ],
    tags: ['docker', 'dockerfile', 'security'],
  },
  {
    id: 'itv-mystsc-54',
    level: 'intermediate',
    kind: 'scenario',
    prompt: 'Docker image optimization for a React app: how would you improve this Dockerfile?',
    promptCode: [
      {
        title: 'The Dockerfile',
        language: 'dockerfile',
        code: `FROM node:18

WORKDIR /app

COPY . .

RUN npm install
RUN npm run build

CMD ["npm", "start"]`,
      },
    ],
    probing:
      'Whether you use a multi-stage build that serves static files from nginx and order layers for caching.',
    answer: [
      '**Problems with this Dockerfile**',
      "1. **Ships the entire Node toolchain** (`node:18` full image, ~1GB+) into production, even though a built React app is just static HTML/CSS/JS files that don't need Node at runtime at all.\n2. **No multi-stage build** — build-time dependencies (devDependencies, build tools, source files) all end up in the final image.\n3. **`COPY . .` before `npm install`** breaks Docker layer caching — any source code change invalidates the cache for `npm install`, forcing a full reinstall on every build even when `package.json` didn't change.\n4. **`npm start`** typically runs a dev server (e.g., `react-scripts start`), which is not meant for production — it's slower and not optimized for serving static files at scale.",
      '**Optimized multi-stage Dockerfile**\nImprovements:',
      '- **Multi-stage build**: Node is only used to build the static files; the final image is just `nginx:alpine` (a few MB) serving static content — no Node, no source code, no `node_modules` in production.\n- **Better layer caching**: copying `package*.json` first means `npm ci` only re-runs when dependencies actually change, not on every source edit.\n- **`npm ci` instead of `npm install`**: faster, reproducible installs based on `package-lock.json`.\n- **Nginx serves static files properly** with production-grade performance instead of a Node dev server.',
      '**Short interview answer**\n"A built React app is just static files, so shipping the full Node image to run `npm start` is unnecessarily large and uses a dev server not meant for production. I\'d use a multi-stage build — build the app in a `node` stage with `npm ci`, then copy only the compiled `build` output into a lightweight `nginx:alpine` stage to actually serve it. I\'d also copy `package.json` before the rest of the source so Docker can cache the dependency install layer properly."',
    ],
    code: [
      {
        title: 'Optimized multi-stage Dockerfile',
        language: 'dockerfile',
        code: `# --- Build stage ---
FROM node:18 AS build

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

# --- Production stage ---
FROM nginx:alpine

COPY --from=build /app/build /usr/share/nginx/html

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]`,
      },
    ],
    tags: ['docker', 'multi-stage', 'react'],
  },
  {
    id: 'itv-mystsc-55',
    level: 'basic',
    kind: 'open',
    prompt: 'Where does Python show up in DevOps work, and which libraries do you use?',
    probing: 'Whether you can name concrete automation areas and the libraries that go with them.',
    answer: [
      'Python is widely used to automate repetitive tasks rather than doing them by hand every time:',
      '- Infrastructure automation\n- Kubernetes automation\n- CI/CD automation\n- Log analysis\n- Monitoring\n- File/configuration automation\n- Git automation\n- Docker automation\n- Email and notification automation\n- Report generation',
      '**Report generation**\nCommon report targets: running VMs, AKS cluster status, failed Jenkins jobs, disk usage, and Terraform execution results - typically generated by combining one of the automation patterns above (SDK/API call) with simple text/CSV/HTML output.',
      '**Useful Python libraries for DevOps**',
      '- `os`: File and OS operations\n- `subprocess`: Execute Linux commands\n- `requests`: REST API calls\n- `boto3`: AWS automation\n- `azure-identity` / `azure-mgmt-*`: Azure automation\n- `kubernetes`: Kubernetes API automation\n- `docker`: Docker API automation\n- `paramiko`: SSH to remote servers\n- `PyYAML`: Read/write YAML files\n- `json`: Handle JSON data\n- `argparse`: Build CLI tools\n- `logging`: Generate application logs',
    ],
    tags: ['python', 'automation', 'devops'],
  },
  {
    id: 'itv-mystsc-56',
    level: 'intermediate',
    kind: 'open',
    prompt: 'How do you use Python with the Azure SDK for infrastructure automation?',
    probing:
      'Whether you know `DefaultAzureCredential` and the management clients, not just shelling out to `az`.',
    answer: [
      'Python with the Azure SDK can create, manage, start, or stop Azure resources directly instead of shelling out to `az` CLI commands.',
      '`DefaultAzureCredential` tries several authentication methods in order (managed identity, environment variables, Azure CLI login, etc.) so the same code works locally and in a pipeline without changes.',
      '**List Azure Virtual Machines**\n**Use case:** generate VM inventory reports.',
    ],
    code: [
      {
        title: 'Azure SDK',
        language: 'python',
        code: `from azure.identity import DefaultAzureCredential
from azure.mgmt.compute import ComputeManagementClient

credential = DefaultAzureCredential()
client = ComputeManagementClient(credential, "<subscription-id>")

client.virtual_machines.begin_start("rg-dev", "vm01")`,
      },
      {
        title: 'List Azure Virtual Machines',
        language: 'python',
        code: `from azure.identity import DefaultAzureCredential
from azure.mgmt.compute import ComputeManagementClient

credential = DefaultAzureCredential()

client = ComputeManagementClient(
    credential,
    "<subscription-id>"
)

for vm in client.virtual_machines.list_all():
    print(vm.name)`,
      },
    ],
    tags: ['python', 'azure sdk', 'automation'],
  },
  {
    id: 'itv-mystsc-57',
    level: 'intermediate',
    kind: 'open',
    prompt:
      'How do you automate Kubernetes with the native Python client, for example restarting Pods stuck in CrashLoopBackOff?',
    probing:
      'Whether you can use the `kubernetes` client to list and act on Pods and know where CrashLoopBackOff shows up in the status.',
    answer: [
      'The `kubernetes` Python package talks to the Kubernetes API directly, as an alternative to shelling out to `kubectl`.',
      '**Use cases:** restart pods, scale deployments, check pod health, delete failed pods automatically.',
      '**Restart pods stuck in CrashLoopBackOff**\n**Use case:** automatically recover unhealthy pods. This targets `CrashLoopBackOff` specifically via `container_statuses[].state.waiting.reason`, using the native `kubernetes` client - a more targeted check than the generic `phase != "Running"` test in the `subprocess`+`kubectl -o json` pod-health-check script from my Bash and Python automation scripts, which detects unhealthy pods but doesn\'t act on them.',
    ],
    code: [
      {
        title: 'Kubernetes client',
        language: 'python',
        code: `from kubernetes import client, config

config.load_kube_config()

v1 = client.CoreV1Api()

pods = v1.list_namespaced_pod("default")

for pod in pods.items:
    print(pod.metadata.name)`,
      },
      {
        title: 'Restart pods stuck in CrashLoopBackOff',
        language: 'python',
        code: `from kubernetes import client, config

config.load_kube_config()

v1 = client.CoreV1Api()

pods = v1.list_pod_for_all_namespaces()

for pod in pods.items:
    for status in pod.status.container_statuses or []:
        if status.state.waiting and status.state.waiting.reason == "CrashLoopBackOff":
            print(f"Restarting {pod.metadata.name}")
            v1.delete_namespaced_pod(
                pod.metadata.name,
                pod.metadata.namespace
            )`,
      },
    ],
    tags: ['python', 'kubernetes', 'automation'],
  },
  {
    id: 'itv-mystsc-58',
    level: 'basic',
    kind: 'open',
    prompt: 'How do you use Python for CI/CD and notification automation?',
    probing:
      'Whether you know common pipeline helper jobs and modern webhook notifications versus legacy SMTP.',
    answer: [
      'Python scripts running inside Jenkins or Azure DevOps pipelines can validate configuration files, trigger deployments, generate release notes, or send notifications.',
      '**Email and notification automation**\nIn practice, `smtplib` is more common for legacy/on-prem notification flows; Slack/Teams webhooks (as in the CI/CD example above) are more common in modern pipelines.',
    ],
    code: [
      {
        title: 'Notifications',
        language: 'python',
        code: `import requests

requests.post(
    "https://hooks.slack.com/services/...",
    json={"text": "Deployment completed successfully"}
)`,
      },
      {
        title: 'Email and notification automation',
        language: 'python',
        code: `import smtplib

server = smtplib.SMTP("smtp.gmail.com", 587)
server.starttls()`,
      },
    ],
    tags: ['python', 'ci/cd', 'notifications'],
  },
  {
    id: 'itv-mystsc-59',
    level: 'basic',
    kind: 'open',
    prompt: 'How do you use Python for log analysis and monitoring automation?',
    probing:
      'Whether you can scan logs for patterns and query the Prometheus HTTP API from a script.',
    answer: [
      '**Use cases:** count errors, generate reports, trigger alerts based on error patterns.',
      '**Monitoring automation**\nPython can query the Prometheus HTTP API (or Azure Monitor APIs) directly, useful when you need to act on a metric programmatically rather than just view it on a dashboard.',
    ],
    code: [
      {
        title: 'Log and metrics',
        language: 'python',
        code: `with open("app.log") as file:
    for line in file:
        if "ERROR" in line:
            print(line)`,
      },
      {
        title: 'Monitoring automation',
        language: 'python',
        code: `import requests

url = "http://prometheus:9090/api/v1/query"
query = {"query": "up"}

response = requests.get(url, params=query)
print(response.json())`,
      },
    ],
    tags: ['python', 'logs', 'monitoring'],
  },
  {
    id: 'itv-mystsc-60',
    level: 'intermediate',
    kind: 'open',
    prompt:
      'How do you automate configuration files with Python, and validate YAML before deployment?',
    probing:
      'Whether you prefer parsing with PyYAML over raw string replacement and validate manifests before they reach `kubectl`.',
    answer: [
      'Useful for simple templating, though for anything beyond a trivial string swap, parsing with `PyYAML` (`yaml.safe_load`/`yaml.safe_dump`) instead of raw text replacement avoids accidentally corrupting the file structure.',
      '**Validate YAML before deployment**\n**Use case:** validate Kubernetes manifests before applying them - catches YAML syntax errors and lets you sanity-check fields (like confirming `kind` is what you expect) before they ever reach `kubectl apply`.',
    ],
    code: [
      {
        title: 'Config files',
        language: 'python',
        code: `with open("config.yaml", "r") as f:
    data = f.read()

data = data.replace("dev", "prod")

with open("config.yaml", "w") as f:
    f.write(data)`,
      },
      {
        title: 'Validate YAML before deployment',
        language: 'python',
        code: `import yaml

with open("deployment.yaml") as f:
    data = yaml.safe_load(f)

print(data["kind"])`,
      },
    ],
    tags: ['python', 'yaml', 'automation'],
  },
  {
    id: 'itv-mystsc-61',
    level: 'intermediate',
    kind: 'open',
    prompt:
      'How do you automate Git and Docker with Python, for example cleaning up old Docker images on build agents?',
    probing:
      'Whether you use `subprocess` safely and can reason about count-based versus age-based image retention.',
    answer: [
      'Git and Docker automation from Python is done by calling the `git` and `docker` CLIs through `subprocess`, as in the samples.',
      "**Delete old Docker images, keeping the 5 newest**\n**Use case:** free up disk space on Jenkins agents. This is a count-based policy (keep the 5 most recent, delete the rest via list slicing) - a different approach from the age-based `docker images --format` + datetime-cutoff Docker image age script from my Bash and Python automation scripts, which filters by a 7-day age threshold instead of a fixed count. Pick whichever policy actually matches your retention need: count-based is simpler but doesn't account for build frequency; age-based accounts for time but not how many images accumulated in that time.",
    ],
    code: [
      {
        title: 'Git, via subprocess',
        language: 'python',
        code: `import subprocess

subprocess.run(["git", "clone", "https://github.com/example/repo.git"])`,
      },
      {
        title: 'Docker, via subprocess',
        language: 'python',
        code: `import subprocess

subprocess.run(["docker", "build", "-t", "myapp:v1", "."])
subprocess.run(["docker", "push", "myapp:v1"])`,
      },
      {
        title: 'Delete old Docker images, keeping the 5 newest',
        language: 'python',
        code: `import subprocess

images = subprocess.check_output(
    "docker images -q",
    shell=True
).decode().split()

for image in images[5:]:
    subprocess.run(["docker", "rmi", "-f", image])`,
      },
    ],
    tags: ['python', 'docker', 'git', 'subprocess'],
  },
  {
    id: 'itv-mystsc-62',
    level: 'basic',
    kind: 'open',
    prompt: 'How do you check disk usage and website health with Python?',
    probing:
      'Whether you know `shutil.disk_usage` and a simple external synthetic check with `requests`.',
    answer: [
      '**Use case:** alert when disk space is running low - a pure-Python equivalent of the Bash `df`-based check, useful when the rest of the monitoring tooling is already Python.',
      '**Check website health**\n**Use case:** basic application health monitoring - a simple synthetic check, distinct from Kubernetes liveness/readiness probes since it verifies the application from outside the cluster, over the same path a real user would take.',
    ],
    code: [
      {
        title: 'Health checks',
        language: 'python',
        code: `import shutil

usage = shutil.disk_usage("/")

free = usage.free // (1024**3)

if free < 10:
    print("Warning: Disk space below 10 GB")`,
      },
      {
        title: 'Check website health',
        language: 'python',
        code: `import requests

url = "https://example.com"

response = requests.get(url)

if response.status_code == 200:
    print("Application is healthy")
else:
    print("Application is down")`,
      },
    ],
    tags: ['python', 'monitoring', 'health checks'],
  },
  {
    id: 'itv-mystsc-63',
    level: 'basic',
    kind: 'open',
    prompt:
      'How do you debug common Python errors such as ModuleNotFoundError, KeyError and TypeError?',
    probing:
      'Whether you read tracebacks bottom-up and know the usual cause and fix for each common exception.',
    answer: [
      'Read the traceback **from the bottom up** - the last line usually contains the actual error; everything above it is the call stack that led there.',
      "**`ModuleNotFoundError`**\nCause: the required package isn't installed. Fix: `pip install requests`.",
      "**`FileNotFoundError`**\nCause: the file doesn't exist, or the path is wrong (often a relative-path/working-directory mismatch). Fix: verify the file path; use an absolute path if necessary.",
      "**`KeyError`**\n`KeyError: 'age'`",
      'Fix: use `.get()` instead of direct indexing when a key might not exist: `print(data.get("age"))`',
      '**`IndexError`**\n`IndexError: list index out of range`',
      'Fix: check bounds before indexing:',
      '**`TypeError`**\nFix: cast explicitly: `print(int(age) + 5)`',
    ],
    code: [
      {
        title: 'ModuleNotFoundError',
        language: 'text',
        code: `Traceback (most recent call last):
  File "app.py", line 1, in <module>
    import requests
ModuleNotFoundError: No module named 'requests'`,
      },
      {
        title: 'FileNotFoundError',
        language: 'text',
        code: `Traceback (most recent call last):
  File "app.py", line 5, in <module>
    open("config.yaml")
FileNotFoundError: [Errno 2] No such file or directory: 'config.yaml'`,
      },
      {
        title: 'KeyError',
        language: 'python',
        code: `data = {"name": "Siva"}
print(data["age"])`,
      },
      {
        title: 'IndexError',
        language: 'python',
        code: `numbers = [10, 20]
print(numbers[5])`,
      },
      {
        title: 'Fix: check bounds before indexing',
        language: 'python',
        code: `if len(numbers) > 5:
    print(numbers[5])`,
      },
      {
        title: 'TypeError',
        language: 'python',
        code: `age = "25"
print(age + 5)`,
      },
      {
        title: 'TypeError (2)',
        language: 'text',
        code: `TypeError: can only concatenate str (not "int") to str`,
      },
    ],
    tags: ['python', 'debugging', 'exceptions'],
  },
  {
    id: 'itv-mystsc-64',
    level: 'intermediate',
    kind: 'scenario',
    prompt:
      "A pipeline fails with `subprocess.CalledProcessError: Command 'kubectl apply -f deployment.yaml' returned non-zero exit status 1`. How do you debug it?",
    probing:
      'Whether you reproduce the failing command outside the pipeline and check connectivity, input and the target system.',
    answer: [
      'A Jenkins or Azure DevOps pipeline fails with:',
      '1. **Run the command manually:**',
      '`kubectl apply -f deployment.yaml`',
      '2. **Check the full error message** - the pipeline log often truncates or buries it among other output.\n3. **Verify cluster connectivity:**',
      '`kubectl cluster-info`',
      '4. **Validate the YAML:**',
      '5. **Check pod events:**',
      '`kubectl describe pod <pod-name>`',
      "The pattern generalizes beyond `kubectl` specifically: reproduce the failing command outside the pipeline, get the full (not truncated) error, verify connectivity/auth to whatever system it's calling, validate the input, and check the target system's own diagnostics.",
    ],
    code: [
      {
        title: 'A Jenkins or Azure DevOps pipeline fails with',
        language: 'text',
        code: `subprocess.CalledProcessError:
Command 'kubectl apply -f deployment.yaml'
returned non-zero exit status 1.`,
      },
      {
        title: 'Pipeline failure',
        language: 'bash',
        code: `kubectl apply --dry-run=client -f deployment.yaml`,
      },
    ],
    tags: ['python', 'ci/cd', 'debugging', 'kubectl'],
  },
  {
    id: 'itv-mystsc-65',
    level: 'advanced',
    kind: 'open',
    prompt:
      'What are your general Python debugging tips, and what Python automation have you done?',
    probing:
      'Whether you have a repeatable debugging method and real automation examples, including CI-specific failures.',
    answer: [
      "- Read the traceback from the bottom up.\n- Identify the exception type first - it usually tells you the category of problem before you've even read the message.\n- Check the file name and line number the traceback points to.\n- Verify environment variables and configuration files - a huge fraction of \"it works locally, fails in CI\" bugs are environment differences, not code bugs.\n- Verify dependencies (versions, whether they're installed at all in the pipeline's environment).\n- Reproduce the issue locally or in a test environment before trying to fix it blind.\n- Add logging instead of relying only on `print` statements - logging carries severity levels and can be filtered/routed, print can't.",
      '**Short interview answer**\nI have used Python to automate repetitive DevOps tasks - checking server disk usage, monitoring application health over REST APIs, validating Kubernetes YAML before deployment, restarting failed pods via the Kubernetes API, generating Azure VM inventory reports via the Azure SDK, and cleaning up old Docker images on build agents. These run on a schedule via cron or as steps inside Jenkins/Azure DevOps pipelines.',
      "When debugging Python errors, I read the traceback bottom-up to find the exception type and the exact failing line, reproduce the issue locally or in a test environment, verify inputs like config files/env vars/API responses, and add logging if needed. If it's failing inside a CI/CD pipeline specifically, I review the pipeline logs, rerun the failing command manually outside the pipeline, and validate dependencies, permissions, and any external service (Kubernetes, Azure APIs) before implementing a fix.",
    ],
    code: [
      {
        title: 'Logging',
        language: 'python',
        code: `import logging

logging.basicConfig(level=logging.INFO)

logging.info("Deployment started")
logging.error("Unable to connect to Kubernetes API")`,
      },
    ],
    followUps: [
      'How would you add structured logging to a script that runs in a pipeline?',
      'How do you make a Python script fail the pipeline with the right exit code?',
    ],
    tags: ['python', 'debugging', 'logging'],
  },
]
