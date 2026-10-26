import type { InterviewQuestion } from '../../../types'

/** EPAM round, part 1: shell scripting, Terraform, Azure services, DevSecOps, monitoring, Kubernetes, networking, TLS and VM operations. */
export const roundsEpamPart1Questions: InterviewQuestion[] = [
  {
    id: 'itv-repm1-1',
    level: 'basic',
    kind: 'open',
    prompt: 'Write a shell script to ping a list of IPs.',
    probing:
      'A working loop over a host list, using the ping exit status, timeouts, and knowing that ICMP failure is not proof a host is down.',
    answer: [
      'If you want to ping a list of IP addresses using shell scripting, a simple DevOps-friendly script is:',
      '**Better approach: IPs from a file**',
      '**Interview explanation:** "I can maintain the list of IP addresses in a file and use a shell script to read each IP one by one. I use the ping command with a limited number of packets and a timeout. Based on the exit status of ping, I print whether the server is UP or DOWN."',
      'Important options used in the script:',
      '- `-c 2` → send 2 ping packets\n- `-W 2` → wait up to 2 seconds for a response\n- `$?` → exit status of the previous command\n- `> /dev/null 2>&1` → suppress the ping output',
      '**Interview-ready version: CSV report with IP, status and response time:** For an interview, make it slightly more practical by generating a CSV with `IP`, `Status` and `Response_Time_ms`.',
      'Generated `ping_report.csv`:',
      '**Interview explanation:** "I have a list of IPs in a file. The script reads each IP using a while loop and performs one ping with a 2-second timeout. If the ping succeeds, I extract the response time from the ping output and mark the server as UP. Otherwise, I mark it as DOWN. Finally, I write the IP, status, and response time into a CSV report."',
      '**Be careful:** a ping failure does not always mean the server is down. ICMP may be blocked by a firewall. In a real production check, I would also validate the required service port, such as 443 or 22.',
    ],
    code: [
      {
        title: 'Ping a fixed list of IPs',
        language: 'bash',
        code: `#!/bin/bash

for ip in 192.168.1.1 192.168.1.2 192.168.1.3
do
    if ping -c 2 -W 2 "$ip" > /dev/null 2>&1
    then
        echo "$ip is UP"
    else
        echo "$ip is DOWN"
    fi
done`,
      },
      {
        title: 'ips.txt: one IP per line',
        language: 'text',
        code: `192.168.1.1
192.168.1.2
192.168.1.3
8.8.8.8`,
      },
      {
        title: 'Read the IPs from a file',
        language: 'bash',
        code: `#!/bin/bash

while read -r ip
do
    if ping -c 2 -W 2 "$ip" > /dev/null 2>&1
    then
        echo "$ip is UP"
    else
        echo "$ip is DOWN"
    fi
done < ips.txt`,
      },
      {
        title: 'check_ips.sh: CSV report with response time',
        language: 'bash',
        code: `#!/bin/bash

INPUT_FILE="ips.txt"
OUTPUT_FILE="ping_report.csv"

echo "IP,Status,Response_Time_ms" > "$OUTPUT_FILE"

while read -r ip
do
    # Skip empty lines
    [ -z "$ip" ] && continue

    # Get ping response time
    response=$(ping -c 1 -W 2 "$ip" 2>/dev/null)

    if echo "$response" | grep -q "time="
    then
        time=$(echo "$response" | grep -o "time=[0-9.]*" | cut -d= -f2)

        echo "$ip,UP,$time" >> "$OUTPUT_FILE"
    else
        echo "$ip,DOWN,N/A" >> "$OUTPUT_FILE"
    fi

done < "$INPUT_FILE"

echo "Ping report generated: $OUTPUT_FILE"`,
      },
      {
        title: 'ips.txt for the CSV report',
        language: 'text',
        code: `8.8.8.8
1.1.1.1
192.168.1.10
192.168.1.20`,
      },
      {
        title: 'Run the script',
        language: 'bash',
        code: `chmod +x check_ips.sh
./check_ips.sh`,
      },
      {
        title: 'Generated ping_report.csv',
        language: 'text',
        code: `IP,Status,Response_Time_ms
8.8.8.8,UP,18.4
1.1.1.1,UP,12.7
192.168.1.10,DOWN,N/A
192.168.1.20,UP,2.31`,
      },
    ],
    tags: ['shell', 'bash', 'ping', 'scripting'],
  },
  {
    id: 'itv-repm1-2',
    level: 'intermediate',
    kind: 'open',
    prompt: 'Write a shell script to check SSH login on all servers.',
    probing:
      'Non-interactive SSH for automation (BatchMode, ConnectTimeout, keys) and the classic ssh-eats-stdin bug inside a while-read loop.',
    answer: [
      'Check SSH connectivity and login for a list of servers, and generate a CSV report.',
      'Output (`ssh_report.csv`):',
      '**Common mistake: `ssh` inside a `while read` loop:** Without `-n`, `ssh` reads from standard input, which is the same input the loop is reading (`servers.txt`). After the **first successful login**, `ssh` swallows the remaining lines and the loop silently stops checking the other servers.',
      'Fix the stdin problem with either:',
      "- `ssh -n ...` (redirects ssh's stdin from `/dev/null`), or\n- `ssh ... < /dev/null`",
      "Also use a variable such as `SSH_USER` rather than `USER`, so you don't overwrite the shell's built-in `$USER` variable.",
      "**Interview answer:** \"I keep the server IPs in a file and use a shell script to loop through them. For each server, I use SSH with BatchMode=yes so the script doesn't wait for a password prompt, and ConnectTimeout=5 to avoid hanging on unreachable servers. I execute a simple echo OK command. Based on the SSH exit status, I mark the server as login successful or failed and generate a CSV report. I also use ssh -n so ssh doesn't consume the loop's input.\"",
      '**Important for real automation**',
      "- For automation, use **SSH keys, not passwords**. `BatchMode=yes` prevents the script from interactively asking for credentials.\n- `StrictHostKeyChecking=no` is convenient for a lab, but in production prefer a managed `known_hosts` file, so you don't accept unknown host keys silently.\n- To check 500+ servers, add **parallel execution** (for example `xargs -P` or GNU `parallel`) so you don't wait for each server one after another.",
    ],
    code: [
      {
        title: 'servers.txt',
        language: 'text',
        code: `192.168.1.10
192.168.1.11
192.168.1.12
10.10.10.20`,
      },
      {
        title: 'check_ssh.sh',
        language: 'bash',
        code: `#!/bin/bash

INPUT_FILE="servers.txt"
OUTPUT_FILE="ssh_report.csv"
SSH_USER="devops"

echo "Server,SSH_Status" > "$OUTPUT_FILE"

while read -r server
do
    [ -z "$server" ] && continue

    if ssh -n -o BatchMode=yes \\
           -o ConnectTimeout=5 \\
           -o StrictHostKeyChecking=no \\
           "$SSH_USER@$server" "echo OK" > /dev/null 2>&1
    then
        echo "$server,LOGIN_SUCCESS" >> "$OUTPUT_FILE"
        echo "$server : SSH login successful"
    else
        echo "$server,LOGIN_FAILED" >> "$OUTPUT_FILE"
        echo "$server : SSH login failed"
    fi

done < "$INPUT_FILE"

echo "Report generated: $OUTPUT_FILE"`,
      },
      {
        title: 'Output: ssh_report.csv',
        language: 'text',
        code: `Server,SSH_Status
192.168.1.10,LOGIN_SUCCESS
192.168.1.11,LOGIN_FAILED
192.168.1.12,LOGIN_SUCCESS
10.10.10.20,LOGIN_SUCCESS`,
      },
    ],
    tags: ['shell', 'bash', 'ssh', 'scripting'],
  },
  {
    id: 'itv-repm1-3',
    level: 'intermediate',
    kind: 'open',
    prompt: 'Find missing tags in a JSON file with jq.',
    probing:
      'Practical jq: select objects missing required keys, report which keys are missing, and understand how `.` changes inside map().',
    answer: [
      'If the requirement is to find JSON objects where a required tag or key is missing, `jq` is a good fit.',
      '**Example `servers.json`**',
      'Suppose the required tags are:',
      '- `name`\n- `environment`\n- `owner`',
      '**Using jq: list the objects with a missing tag**',
      '**Better approach: show exactly which tags are missing**',
      '**Common mistake:** Inside `map(...)`, `.` is the **tag name** (a string), not the server object. So this does **not** work:',
      "That's why the working version saves the object first with `. as $obj` and then checks `$obj[.]`.",
      '**Interview answer:** "I use jq to parse the JSON and check whether the required keys exist. I define the mandatory tags and use select() to identify objects where any required tag is missing. I can also return the resource name along with the exact missing tags, which makes it easier to fix the configuration."',
      'For Azure-style resource JSON (for example from `az resource list`), the same technique can be adapted to check required tags such as `Environment`, `Owner`, `CostCenter` and `Application` across hundreds of resources.',
    ],
    code: [
      {
        title: 'Example servers.json',
        language: 'json',
        code: `[
  {
    "name": "server1",
    "environment": "prod",
    "owner": "devops"
  },
  {
    "name": "server2",
    "environment": "prod"
  },
  {
    "name": "server3",
    "owner": "devops"
  }
]`,
      },
      {
        title: 'Using jq: list the objects with a missing tag',
        language: 'bash',
        code: `jq '.[] | select(.name == null or .environment == null or .owner == null)' servers.json`,
      },
      {
        title: 'Output: objects with a missing tag',
        language: 'json',
        code: `{
  "name": "server2",
  "environment": "prod"
}
{
  "name": "server3",
  "owner": "devops"
}`,
      },
      {
        title: 'Better approach: show exactly which tags are missing',
        language: 'bash',
        code: `jq '
.[] |
. as $obj |
{
  name: $obj.name,
  missing_tags: ["name", "environment", "owner"]
    | map(select($obj[.] == null))
}
| select(.missing_tags | length > 0)
' servers.json`,
      },
      {
        title: 'Output: missing tags per object',
        language: 'json',
        code: `{
  "name": "server2",
  "missing_tags": [
    "owner"
  ]
}
{
  "name": "server3",
  "missing_tags": [
    "environment"
  ]
}`,
      },
      {
        title: 'Common mistake: this does not work',
        language: 'bash',
        code: `# Wrong: fails with "Cannot index string with string"
jq '.[] | {name: .name, missing_tags: ["environment", "owner"] | map(select(. as $tag | .[$tag] == null))}' servers.json`,
      },
    ],
    tags: ['jq', 'json', 'shell', 'tagging'],
  },
  {
    id: 'itv-repm1-4',
    level: 'basic',
    kind: 'open',
    prompt: 'Write a shell script to check if a file exists (`/etc/config.js`)',
    probing:
      'Bash file test operators, and the difference between -f (regular file) and -e (any path).',
    answer: [
      '**To check any type of file or directory**',
      '**Difference between `-f` and `-e`**',
      '- `-f` → checks whether it is a **regular file**\n- `-e` → checks whether the **path exists**, including files and directories',
      '**Interview answer:** "I use the -f test operator to check whether /etc/config.js is a regular file. If the condition is true, I print that the file exists; otherwise, I handle the missing-file case."',
    ],
    code: [
      {
        title: 'Check that /etc/config.js is a regular file',
        language: 'bash',
        code: `#!/bin/bash

FILE="/etc/config.js"

if [ -f "$FILE" ]; then
    echo "$FILE exists"
else
    echo "$FILE does not exist"
fi`,
      },
      {
        title: 'To check any type of file or directory',
        language: 'bash',
        code: `if [ -e "/etc/config.js" ]; then
    echo "Path exists"
else
    echo "Path does not exist"
fi`,
      },
    ],
    tags: ['shell', 'bash', 'file test'],
  },
  {
    id: 'itv-repm1-5',
    level: 'basic',
    kind: 'open',
    prompt: 'Write a shell script to delete logs older than N days.',
    probing:
      'Using find with -mtime safely: list before deleting, how whole-day rounding works, and when logrotate is the better tool.',
    answer: [
      'Use `find` for this. It is the standard approach in Linux.',
      '**Delete logs older than 7 days**',
      '**Safer version: check before deleting**',
      'First, list the files:',
      'If the output is correct, run:',
      '**Interview answer:** "I use the find command with -mtime to identify log files older than the required number of days. I first verify the files using find without -delete, and once confirmed, I use -delete to remove them."',
      '**Important points to remember**',
      '- `-mtime +7` matches files last modified **more than 7 full days ago**. `find` counts age in whole days and drops the fraction, so a file that is 7 days and 1 hour old is **not** matched; it must be at least 8 days old.\n- For production cleanup, verify the target directory carefully before using `-delete`. For logs that a running service is still writing to, prefer `logrotate`.',
    ],
    code: [
      {
        title: 'Delete logs older than 7 days',
        language: 'bash',
        code: `find /var/log -type f -name "*.log" -mtime +7 -delete`,
      },
      {
        title: 'First, list the files',
        language: 'bash',
        code: `find /var/log -type f -name "*.log" -mtime +7`,
      },
      {
        title: 'Delete after verifying the list',
        language: 'bash',
        code: `find /var/log -type f -name "*.log" -mtime +7 -delete`,
      },
      {
        title: 'Shell script: delete logs older than N days',
        language: 'bash',
        code: `#!/bin/bash

LOG_DIR="/var/log"
DAYS=7

find "$LOG_DIR" -type f -name "*.log" -mtime +"$DAYS" -delete

echo "Deleted logs older than $DAYS days"`,
      },
    ],
    tags: ['shell', 'find', 'logs', 'linux'],
  },
  {
    id: 'itv-repm1-6',
    level: 'basic',
    kind: 'open',
    prompt: 'Write a shell script to check disk usage.',
    probing:
      'df versus du, parsing df output reliably for a threshold alert, and finding which directories consume the space.',
    answer: [
      'To check disk usage in shell scripting, the basic command is `df`.',
      '**Check if disk usage is above 80%**',
      'This prints the filesystems where usage is greater than 80%.',
      '**Shell script with alert**',
      '`df -P` (POSIX format) keeps each filesystem on one line, so the columns stay in the same place even for long device names.',
      '**Check which directories are consuming space**',
      'For the largest directories:',
      '**Interview answer:** "I use df -h to check filesystem-level disk utilization. If usage crosses a threshold such as 80%, I generate an alert. Then I use du -sh to identify which directories are consuming the most space and investigate large logs, temporary files, or application data."',
    ],
    code: [
      {
        title: 'Check disk usage',
        language: 'bash',
        code: `# Check disk usage
df -h`,
      },
      {
        title: 'Example df -h output',
        language: 'text',
        code: `Filesystem      Size  Used Avail Use% Mounted on
/dev/sda1        50G   42G  8.0G  84% /
/dev/sdb1       100G   60G   40G  60% /data`,
      },
      {
        title: 'Check if disk usage is above 80%',
        language: 'bash',
        code: `df -h | awk 'NR>1 && $5+0 > 80 {print $0}'`,
      },
      {
        title: 'Shell script with alert',
        language: 'bash',
        code: `#!/bin/bash

THRESHOLD=80

df -P | awk 'NR>1 {print $5, $6}' | while read -r usage mount
do
    usage=\${usage%\\%}

    if [ "$usage" -gt "$THRESHOLD" ]; then
        echo "WARNING: $mount is \${usage}% full"
    fi
done`,
      },
      {
        title: 'Check which directories are consuming space',
        language: 'bash',
        code: `du -sh /var/* 2>/dev/null | sort -h`,
      },
      {
        title: 'Largest directories',
        language: 'bash',
        code: `du -sh /var/* 2>/dev/null | sort -hr | head -10`,
      },
    ],
    tags: ['shell', 'disk', 'df', 'du', 'monitoring'],
  },
  {
    id: 'itv-repm1-7',
    level: 'basic',
    kind: 'open',
    prompt: 'Write a Terraform file to create a Resource Group.',
    probing:
      'A minimal azurerm configuration, the init/plan/apply workflow, state and drift, and the azurerm 4.x subscription ID requirement.',
    answer: [
      'For Azure, you can create a Resource Group with a simple Terraform configuration.',
      '**Interview explanation:** "I use the azurerm provider to interact with Azure. The azurerm_resource_group resource creates the Resource Group with a name and Azure region. I can also add tags for environment and ownership. I run terraform init, validate the configuration, review the plan, and then run terraform apply."',
      '**Important points to remember**',
      '- Terraform tracks the Resource Group in the **state file**. If you delete the Resource Group manually from Azure, Terraform detects the drift during the next `plan`.\n- With **azurerm 4.x**, the provider needs a subscription ID. Set it in the provider block (`subscription_id = "<id>"`) or with the `ARM_SUBSCRIPTION_ID` environment variable, otherwise `terraform plan` fails.',
    ],
    code: [
      {
        title: 'main.tf: Resource Group',
        language: 'hcl',
        code: `terraform {
  required_providers {
    azurerm = {
      source  = "hashicorp/azurerm"
      version = "~> 4.0"
    }
  }
}

provider "azurerm" {
  features {}
}

resource "azurerm_resource_group" "rg" {
  name     = "rg-devops-demo"
  location = "East US"

  tags = {
    Environment = "Dev"
    Owner       = "DevOps"
  }
}`,
      },
      {
        title: 'Terraform commands',
        language: 'bash',
        code: `terraform init
terraform validate
terraform plan
terraform apply`,
      },
      {
        title: 'Destroy the Resource Group',
        language: 'bash',
        code: `terraform destroy`,
      },
    ],
    tags: ['terraform', 'azure', 'resource group', 'iac'],
  },
  {
    id: 'itv-repm1-8',
    level: 'basic',
    kind: 'open',
    prompt: 'Give a brief on Azure Batch, Microsoft Entra ID and Azure Monitor.',
    probing:
      'A crisp one-paragraph explanation of three different Azure services and what each is used for in DevOps work.',
    answer: [
      '**1. Azure Batch:** Azure Batch is a service used to run **large-scale parallel and high-performance computing (HPC)** workloads.',
      '- Creates and manages a pool of VMs.\n- Runs jobs across multiple VMs in parallel.\n- Automatically scales compute resources based on the workload.\n- Useful for batch processing, simulations, rendering, data processing and similar jobs.',
      '**Interview answer:** "Azure Batch is a managed service for running large-scale parallel workloads. It automatically manages a pool of VMs and distributes jobs across them, which is useful when we need high compute capacity without manually managing individual VMs."',
      "**2. Microsoft Entra ID:** Microsoft Entra ID, formerly **Azure Active Directory (Azure AD)**, is Microsoft's cloud-based **identity and access management** service.",
      '- User and group management.\n- Authentication and authorization.\n- Single sign-on (SSO) for applications.\n- Multi-factor authentication (MFA) and Conditional Access.\n- Managed identities for Azure resources.\n- Application and service authentication.',
      '**Interview answer:** "Microsoft Entra ID is Microsoft\'s cloud identity and access management service. We use it for user authentication, authorization, SSO, MFA, and managing identities for applications and Azure resources."',
      '**DevOps example:** an Azure DevOps pipeline can use a managed identity or service principal to securely access Azure resources without storing passwords in the pipeline.',
      "**3. Azure Monitor:** Azure Monitor is Microsoft's **monitoring and observability** service for Azure resources and applications.",
      'It collects and uses:',
      '- **Metrics** → CPU, memory, requests, latency and so on.\n- **Logs** → application and infrastructure logs (Log Analytics).\n- **Alerts** → notify when a condition is triggered.\n- **Application Insights** → application performance monitoring.',
      '**Interview answer:** "Azure Monitor is used to monitor the health and performance of Azure resources and applications. We collect metrics and logs, create alerts based on thresholds, and use Application Insights and Log Analytics to troubleshoot application and infrastructure issues."',
      '**Easy way to remember**',
      '- **Service**: Azure Batch; **Main purpose**: Run large-scale jobs\n- **Service**: Microsoft Entra ID; **Main purpose**: Identity and access\n- **Service**: Azure Monitor; **Main purpose**: Monitoring and alerts',
    ],
    tags: ['azure', 'azure batch', 'entra id', 'azure monitor'],
  },
  {
    id: 'itv-repm1-9',
    level: 'intermediate',
    kind: 'open',
    prompt: 'Give a brief on Azure Container Apps and Azure Container Instances.',
    probing:
      'Choosing between a serverless app platform with autoscaling and revisions (ACA) and a run-one-container service (ACI).',
    answer: [
      '**1. Azure Container Apps:** Azure Container Apps (ACA) is a **fully managed, serverless container platform** for running containerized applications without managing Kubernetes infrastructure.',
      "- Supports containers, microservices, APIs and background jobs.\n- Built-in autoscaling using KEDA.\n- Supports revisions and traffic splitting.\n- Supports internal and external ingress.\n- Integrates with Azure services such as Container Registry, Managed Identity and Log Analytics.\n- A good choice when you need container orchestration features but don't want to manage AKS.",
      '**Interview answer:** "Azure Container Apps is a serverless container platform used to run microservices and APIs without managing the underlying Kubernetes infrastructure. It provides autoscaling, ingress, revisions and traffic management. I would choose Container Apps when I need containerized applications with less operational overhead than AKS."',
      '**2. Azure Container Instances (ACI):** Azure Container Instances is a service for **running individual containers directly in Azure** without managing VMs or Kubernetes.',
      '- Very quick container startup.\n- No VM management.\n- Suitable for short-lived or simple workloads.\n- Useful for development, testing, batch jobs and CI/CD tasks.\n- Supports Linux and Windows containers.\n- Does not provide the full orchestration capabilities of Kubernetes.',
      '**Interview answer:** "Azure Container Instances allows us to run containers directly in Azure without managing virtual machines or a Kubernetes cluster. It is useful for simple, short-lived workloads, testing and batch jobs where we don\'t need Kubernetes orchestration."',
      '**Container Apps vs. Container Instances**',
      '- **Feature**: Main use; **Container Apps**: Microservices / APIs; **Container Instances**: Simple containers\n- **Feature**: Scaling; **Container Apps**: Built-in autoscaling; **Container Instances**: Basic / manual scaling\n- **Feature**: Kubernetes; **Container Apps**: Managed abstraction; **Container Instances**: No Kubernetes orchestration\n- **Feature**: Revisions; **Container Apps**: Yes; **Container Instances**: No\n- **Feature**: Traffic splitting; **Container Apps**: Yes; **Container Instances**: No\n- **Feature**: Best for; **Container Apps**: Production microservices; **Container Instances**: Simple / short-lived workloads\n- **Feature**: Operational effort; **Container Apps**: Low; **Container Instances**: Very low',
      '**Easy way to remember**',
      '- **ACI** = run a container.\n- **Container Apps** = run and scale an application made of containers.',
    ],
    tags: ['azure', 'container apps', 'aci', 'containers'],
  },
  {
    id: 'itv-repm1-10',
    level: 'advanced',
    kind: 'scenario',
    prompt: 'Azure Functions: generate a PDF and store it in a Storage Account.',
    probing:
      'Designing an event-driven pipeline with Blob triggers or Event Grid, managed identity, failure handling and scaling under a burst of uploads.',
    answer: [
      'The question in the interview was short ("Azure Functions, create a PDF in a storage account"). A common full version of this scenario is:',
      '"A user uploads a document to Azure Storage. You need to generate a PDF from that document using Azure Functions and store the generated PDF back in the Storage Account. How would you design and implement this solution?"',
      '**How it works, step by step**',
      '1. The user uploads a file, such as `.docx` or `.html`, to a Blob Storage container.\n2. Blob Storage raises a **Blob Created** event.\n3. Event Grid triggers the Azure Function.\n4. The Function reads the uploaded file from Blob Storage.\n5. The Function uses a suitable PDF-generation library to convert the content into a PDF.\n6. The generated PDF is uploaded to another container, for example:',
      '**Step 7:** The Function logs success or failure to Application Insights / Azure Monitor.',
      '**How would you secure it?** I would **not** store the Storage Account key in the Function configuration. Instead:',
      "Assign the Function's managed identity the right RBAC role:",
      '- **Storage Blob Data Reader** → read input files\n- **Storage Blob Data Contributor** → read and write blobs',
      'Store any other application secrets in Azure Key Vault.',
      '**What if PDF generation fails?** I would implement:',
      '- Exception handling in the Function.\n- Application Insights logging.\n- A retry mechanism.\n- Dead-letter / error handling for events that keep failing.\n- A separate `failed/` (or `error/`) container if the business needs failed files to be kept.',
      '**What if 10,000 files are uploaded at once?** This is an important follow-up.',
      '"I would avoid processing everything synchronously. Event Grid can trigger the Function for each blob event, and Azure Functions can scale out based on the workload. I would also make the function idempotent so that if the same event is delivered more than once, we don\'t generate duplicate PDFs."',
      'For heavier or long-running PDF generation, I would put **Service Bus or a Storage Queue** in between:',
      'This gives better control over retries, throttling and workload spikes.',
      '**Interview-ready answer:** "I would use Azure Blob Storage as the input and output storage. When a document is uploaded, a Blob Created event can be published through Event Grid and trigger an Azure Function. The Function reads the document, generates the PDF using a suitable library, and writes the PDF to an output container. I would use Managed Identity with Azure RBAC instead of storage account keys. For monitoring, I would use Application Insights and Azure Monitor. I would also implement retry and error handling. If the workload is high, I would put Service Bus or a Storage Queue between the event and the Function so that processing can be controlled and scaled safely."',
      '**Likely follow-up questions**',
      '1. **Why an Azure Function instead of a VM?** "The workload is event-driven and may be intermittent, so Functions removes server management and scales automatically."\n2. **Why Event Grid?** "Because the processing starts when a blob is created. Event Grid is designed for event-driven scenarios."\n3. **How do you prevent duplicate PDF generation?** "I make the function idempotent. Before generating the PDF, I check whether the output blob already exists, or keep a processing record."\n4. **How do you authenticate to Storage?** "Using the Function\'s Managed Identity with the right Storage Blob Data RBAC roles."\n5. **How do you monitor failures?** "Application Insights and Azure Monitor alerts. I monitor function failures, execution duration, exceptions, and retry and dead-letter counts."\n6. **What if PDF generation takes several minutes?** "I would use an asynchronous design with a queue, and pick a Functions hosting plan whose execution time limit fits. For very heavy processing, I would evaluate Container Apps Jobs or Azure Batch instead of forcing everything into a single Function execution."',
    ],
    code: [
      {
        title: 'Architecture: upload to generated PDF',
        language: 'text',
        code: `User
  |
  | Upload document
  v
Azure Blob Storage
  |
  | Blob Created event
  v
Event Grid
  |
  v
Azure Function
  |
  | Generate PDF
  v
Azure Blob Storage
  |
  v
Generated PDF`,
      },
      {
        title: 'Input and output containers',
        language: 'text',
        code: `input/
    invoice123.docx

output/
    invoice123.pdf`,
      },
      {
        title: 'Managed identity to Storage',
        language: 'text',
        code: `Azure Function
      |
      | Managed Identity
      v
Azure Storage Account`,
      },
      {
        title: 'Containers for failed files',
        language: 'text',
        code: `input/
output/
failed/`,
      },
      {
        title: 'Queue between Event Grid and the Function',
        language: 'text',
        code: `Blob Storage
     |
 Event Grid
     |
Service Bus / Queue
     |
Azure Function
     |
 Generate PDF
     |
Blob Storage`,
      },
    ],
    followUps: [
      'Why Event Grid rather than a plain Blob trigger on a Consumption plan?',
      'How do you stop a poison file from being retried forever?',
      'What would you change if each PDF takes several minutes to generate?',
      'How would you monitor end-to-end success rate of the pipeline?',
    ],
    tags: ['azure functions', 'blob storage', 'event grid', 'serverless', 'managed identity'],
  },
  {
    id: 'itv-repm1-11',
    level: 'intermediate',
    kind: 'open',
    prompt: 'How do you reduce costs in Azure?',
    probing:
      'A structured cost process (analyse, right-size, commit, govern) rather than a list of services, plus how you react to a sudden cost spike.',
    answer: [
      'For a DevOps interview, answer this as a **practical process**, not just a list of Azure services.',
      '**Interview-ready answer:** "I optimize Azure costs by first analyzing the current spending using Azure Cost Management and Advisor. I identify the resources with high utilization or unnecessary spending. Then I right-size VMs and AKS node pools, shut down non-production resources outside working hours, remove unused disks and public IPs, and use autoscaling where appropriate.',
      'For predictable workloads, I evaluate Azure Reservations or Savings Plans. For suitable workloads, I use Spot VMs. I also optimize storage by selecting the appropriate storage tier and lifecycle policies.',
      'At the governance level, I use resource tagging such as Environment, Application, Owner and CostCenter, and configure budgets and cost alerts. I regularly review the cost trends and remove orphaned or unused resources."',
      '**Areas I would check**',
      '- **Area**: VMs; **Cost optimization**: Right-size, auto-shutdown Dev/QA, Reserved Instances / Savings Plans\n- **Area**: AKS; **Cost optimization**: Right-size node pools, autoscaling, Spot nodes for suitable workloads\n- **Area**: Storage; **Cost optimization**: Lifecycle policies, Hot/Cool/Archive tiers, remove unused disks and snapshots\n- **Area**: Networking; **Cost optimization**: Review unneeded NAT Gateways, public IPs, data transfer and load balancers\n- **Area**: Database; **Cost optimization**: Right-size the SKU, scale down non-prod, use the right service tier\n- **Area**: Monitoring; **Cost optimization**: Control excessive Log Analytics ingestion and retention\n- **Area**: Unused resources; **Cost optimization**: Remove unattached disks, IPs, NICs, old snapshots and test resources\n- **Area**: Governance; **Cost optimization**: Tags, budgets, alerts and Azure Policy',
      '**Real-time example:** If the interviewer asks: "You suddenly notice the Azure cost has increased significantly. What will you do?"',
      '"First, I would check Cost Management to identify which subscription, resource group and resource caused the increase. Then I would compare the current cost with previous days or months. I would check for newly created resources, increased VM sizes, unexpected scaling, storage growth, data transfer and services that were accidentally left running. Once I identify the cause, I would take corrective action and configure budgets, alerts, tagging and policies to prevent the same issue from happening again."',
      "**Important incident example:** If an expensive Azure service was accidentally left running and generated a large bill, don't just say you deleted it. Say:",
      '"I would first identify the resource and confirm why it was created. I would stop or remove it if it is unnecessary, then review the activity logs to understand how it happened. After that, I would introduce Azure Policy, budgets, cost alerts and appropriate RBAC controls. For non-production environments, I would also implement scheduled shutdowns. The goal is to prevent the same cost issue from recurring."',
      'That is a much stronger answer, because it covers **detection → correction → root cause → prevention**.',
    ],
    tags: ['azure', 'cost management', 'finops', 'governance'],
  },
  {
    id: 'itv-repm1-12',
    level: 'advanced',
    kind: 'scenario',
    prompt: 'A Storage Account has become public in Azure. How do you remediate it?',
    probing:
      'Separating public network access from anonymous blob access, containing the exposure fast, investigating how it happened, and preventing a repeat with policy.',
    answer: [
      'Answer in this order.',
      '**Interview-ready answer:** "First, I would identify exactly what has become public. I would check the Storage Account networking configuration, public network access, firewall rules, private endpoints, and container-level public access.',
      'If public access is not required, I would disable public network access and allow access only through the required VNet or Private Endpoint. I would also disable anonymous blob access at the storage-account level and verify that containers are not configured for public access.',
      'Then I would check IAM and RBAC permissions to make sure no users or applications have excessive access. I would review Activity Logs to determine how the configuration became public.',
      'Finally, I would enforce the configuration using Azure Policy and Terraform so that the setting cannot accidentally be changed again."',
      '**Key settings to check**',
      '**1. Storage account public network access**',
      'Set **Public network access = Disabled**, then use:',
      'If public access is genuinely required, restrict it to **selected networks / IPs** rather than allowing all networks.',
      '**2. Anonymous blob access:** Check that **Allow Blob anonymous access = Disabled**.',
      "Also verify that each container's **Public access level** is not `Blob` or `Container`. It should normally be `Private`.",
      '**3. RBAC / IAM:** Review:',
      '- Storage Blob Data Reader\n- Storage Blob Data Contributor\n- Storage Blob Data Owner\n- Subscription and resource-group permissions',
      'Remove unnecessary permissions and follow least privilege.',
      '**4. Private Endpoint**',
      'For applications running inside Azure, use:',
      'Also verify that Private DNS resolution is working.',
      '**Prevention:** Use **Azure Policy** to audit or deny insecure configurations, for example:',
      'You can also enforce it through Terraform:',
      '**Strong troubleshooting flow**',
      '**One important distinction:** "the storage account is public" can mean different things. **Public network access** and **anonymous blob/container access** are separate controls, so check both.',
    ],
    code: [
      {
        title: 'Access through a Private Endpoint',
        language: 'text',
        code: `Private Endpoint
       |
       v
     VNet
       |
       v
Storage Account`,
      },
      {
        title: 'Applications inside Azure',
        language: 'text',
        code: `AKS / VM / App Service
        |
       VNet
        |
Private Endpoint
        |
Storage Account`,
      },
      {
        title: 'Azure Policy: deny public network access',
        language: 'text',
        code: `Deny: storage accounts with public network access enabled`,
      },
      {
        title: 'Terraform: storage account locked down',
        language: 'hcl',
        code: `resource "azurerm_storage_account" "example" {
  name                = "stexample123"
  resource_group_name = azurerm_resource_group.example.name
  location            = azurerm_resource_group.example.location

  account_tier             = "Standard"
  account_replication_type = "LRS"

  public_network_access_enabled   = false
  allow_nested_items_to_be_public = false
}`,
      },
      {
        title: 'Remediation flow',
        language: 'text',
        code: `Identify exposure
       ↓
Check public network access
       ↓
Check container anonymous access
       ↓
Check firewall / IP rules
       ↓
Check Private Endpoint / DNS
       ↓
Review RBAC
       ↓
Check Activity Logs
       ↓
Remediate
       ↓
Azure Policy + Terraform
       ↓
Monitor continuously`,
      },
    ],
    followUps: [
      'How would you find out whether data was actually read while it was public?',
      'What does the Azure Policy definition for this look like, and which effect would you use?',
      'How do Private DNS zones fit into the Private Endpoint setup?',
      'How do you roll this out without breaking applications that relied on public access?',
    ],
    tags: ['azure', 'storage account', 'security', 'azure policy', 'private endpoint'],
  },
  {
    id: 'itv-repm1-13',
    level: 'advanced',
    kind: 'scenario',
    prompt: 'Store a database connection string securely with Key Vault and Managed Identity.',
    probing:
      'Keeping secrets out of code with Key Vault, authenticating with managed or workload identity, least-privilege RBAC, and handling rotation.',
    answer: [
      'A good version of this scenario is:',
      '"Your application is running on Azure App Service / AKS and needs to connect to an Azure PostgreSQL database. The database connection string contains sensitive information. How would you securely manage the connection string using Azure Key Vault and Managed Identity?"',
      '**Implementation, step by step**',
      '**1. Enable Managed Identity:** Enable a **system-assigned managed identity** on the App Service or AKS workload.',
      "The application doesn't need a username or password to authenticate to Key Vault.",
      '**2. Store the connection string in Key Vault**',
      'The password is never stored in the application code or the Git repository.',
      "**3. Give the identity access to Key Vault:** Assign the application's managed identity the minimum required permission, for example **Key Vault Secrets User**. This follows the principle of least privilege.",
      '**4. The application retrieves the secret**',
      'The application uses the Azure SDK or a Key Vault integration to retrieve the secret at runtime. On App Service, a **Key Vault reference** in the app settings (`@Microsoft.KeyVault(SecretUri=...)`) does this without code changes.',
      '**If the application runs in AKS:** Use **Microsoft Entra Workload ID** rather than putting a service principal secret inside a Kubernetes Secret.',
      'Another Kubernetes option is the **Secrets Store CSI Driver** with the Azure Key Vault provider, which mounts Key Vault secrets into the Pod.',
      '**Interview-ready answer:** "I would never hardcode the database connection string or password in the application or Git repository. I would store the connection string as a secret in Azure Key Vault. I would enable Managed Identity on the application, or Workload Identity if the application is running on AKS. I would grant that identity only the required Key Vault secret access, such as Key Vault Secrets User. At runtime, the application authenticates to Key Vault using its identity and retrieves the connection string. The application then uses that connection string to connect to PostgreSQL. I would also use Private Endpoint and private DNS for Key Vault and PostgreSQL where required, and monitor Key Vault access through Azure Monitor."',
      '**Follow-up: "What happens when the database password changes?":** "I don\'t update the password in the application code. I update the secret in Key Vault. The application retrieves the current secret based on the application\'s secret-refresh mechanism. If the application caches the secret, I would configure an appropriate refresh interval or restart/reload mechanism."',
      "**Even better, if the interviewer asks how to remove the password completely:** Azure Database for PostgreSQL Flexible Server supports **Microsoft Entra authentication**. The application's managed identity can then log in to the database with a token, so there is no database password to store or rotate at all.",
      '**Security flow to remember**',
      'This is the clean answer the interviewer is looking for: **Key Vault stores the secret, Managed Identity authenticates the application, RBAC controls access, and the database stays private where possible.**',
    ],
    code: [
      {
        title: 'Architecture',
        language: 'text',
        code: `Application
   |
   | Managed Identity
   v
Azure Key Vault
   |
   | Connection string
   v
PostgreSQL`,
      },
      {
        title: 'Managed identity authenticates to Entra ID',
        language: 'text',
        code: `Application
    |
    | Identity
    v
Microsoft Entra ID`,
      },
      {
        title: 'Example Key Vault secret',
        language: 'text',
        code: `Secret name:
postgres-connection-string

Secret value:
Host=postgres.example.com;
Database=appdb;
Username=appuser;
Password=********;`,
      },
      {
        title: 'Runtime secret retrieval',
        language: 'text',
        code: `Application
     |
     | Managed Identity token
     v
Microsoft Entra ID
     |
     v
Key Vault
     |
     | Secret
     v
Application
     |
     v
PostgreSQL`,
      },
      {
        title: 'AKS: workload identity to Key Vault',
        language: 'text',
        code: `AKS Pod
   |
   | Workload Identity
   v
Microsoft Entra ID
   |
   v
Key Vault
   |
   v
PostgreSQL connection string`,
      },
      {
        title: 'Security flow to remember',
        language: 'text',
        code: `No password in code
        ↓
Secret → Key Vault
        ↓
Managed Identity / Workload Identity
        ↓
RBAC → Key Vault
        ↓
Application gets the secret
        ↓
Private connection → PostgreSQL`,
      },
    ],
    followUps: [
      'How does the application pick up a rotated secret without a redeploy?',
      'Why prefer RBAC over Key Vault access policies?',
      'How would you remove the database password entirely with Entra authentication?',
      'How do you lock down Key Vault network access?',
    ],
    tags: ['azure', 'key vault', 'managed identity', 'secrets', 'workload identity'],
  },
  {
    id: 'itv-repm1-14',
    level: 'intermediate',
    kind: 'open',
    prompt:
      "How do you restrict a developer's access instead of giving the Contributor role in Azure?",
    probing:
      'Least privilege in Azure RBAC: understanding the actual need, built-in versus custom roles, scope, groups and PIM.',
    answer: [
      "The right approach is **least-privilege RBAC**. Don't give developers the broad Contributor role unless they actually need it.",
      '**Interview-ready answer:** "I would first understand what actions the developer needs to perform. Instead of assigning Contributor, I would create or use a more specific Azure RBAC role that provides only those required permissions. I would assign it at the lowest possible scope, such as a specific resource instead of the entire subscription. If no built-in role exactly matches the requirement, I would create a custom RBAC role with only the required actions."',
      '**Example:** Suppose a developer only needs to restart an Azure Web App and view its configuration.',
      'give access only to the required App Service resource:',
      '**Built-in roles:** Before creating a custom role, check whether an existing built-in role is enough:',
      '- **Requirement**: View resources only; **Possible built-in role**: Reader\n- **Requirement**: Manage VMs; **Possible built-in role**: Virtual Machine Contributor\n- **Requirement**: Manage AKS; **Possible built-in role**: Azure Kubernetes Service Contributor Role\n- **Requirement**: Read and write Storage blob data; **Possible built-in role**: Storage Blob Data Contributor\n- **Requirement**: Manage Web Apps; **Possible built-in role**: Website Contributor (and Web Plan Contributor for App Service plans)\n- **Requirement**: Read Key Vault secrets; **Possible built-in role**: Key Vault Secrets User\n- **Requirement**: Manage Key Vault secrets; **Possible built-in role**: Key Vault Secrets Officer',
      'The exact role depends on what the developer actually needs.',
      "**Scope matters:** Don't assign the role at subscription level if it isn't necessary. Prefer:",
      '**Custom role example**',
      'If no built-in role is suitable:',
      'Create it with `az role definition create --role-definition @role.json`, then assign it to the developer (or, better, to an Entra group) at the resource-group or resource scope.',
      '**Also use PIM:** For sensitive production access, use **Microsoft Entra Privileged Identity Management (PIM)**. Instead of permanent permissions:',
      '**Strong final interview answer:** "I follow the principle of least privilege. I first identify exactly what permissions the developer requires, then use the closest built-in Azure RBAC role instead of Contributor. I assign it at the lowest required scope, preferably a specific resource or resource group. If no built-in role meets the requirement, I create a custom role with only the necessary actions. For production access, I prefer PIM with just-in-time and time-bound access. This prevents developers from accidentally modifying or deleting unrelated Azure resources."',
    ],
    code: [
      {
        title: 'Avoid: Contributor on the subscription',
        language: 'text',
        code: `Subscription
    |
    └── Contributor ❌`,
      },
      {
        title: 'Custom role on one App Service',
        language: 'text',
        code: `Developer
   |
   └── Custom RBAC role
          |
          ├── Read Web App
          ├── Read configuration
          └── Restart Web App`,
      },
      {
        title: 'Scope: narrowest level',
        language: 'text',
        code: `Subscription
   └── Resource Group
        └── Specific resource
             └── Developer role`,
      },
      {
        title: 'Avoid: Contributor at subscription scope',
        language: 'text',
        code: `Subscription
   └── Contributor ❌`,
      },
      {
        title: 'Custom role definition (role.json)',
        language: 'json',
        code: `{
  "Name": "Developer WebApp Operator",
  "IsCustom": true,
  "Description": "Read and restart web apps in one resource group",
  "Actions": [
    "Microsoft.Web/sites/read",
    "Microsoft.Web/sites/config/read",
    "Microsoft.Web/sites/restart/action"
  ],
  "NotActions": [],
  "AssignableScopes": [
    "/subscriptions/<subscription-id>/resourceGroups/<resource-group>"
  ]
}`,
      },
      {
        title: 'PIM: just-in-time access',
        language: 'text',
        code: `Developer
   ↓
Eligible for production access
   ↓
Request / approval
   ↓
Temporary role
   ↓
Access expires`,
      },
    ],
    tags: ['azure', 'rbac', 'least privilege', 'pim', 'custom role'],
  },
  {
    id: 'itv-repm1-15',
    level: 'basic',
    kind: 'open',
    prompt: 'What is Azure Policy?',
    probing:
      'What Azure Policy does, its effects, and the difference between Policy (what configuration is allowed) and RBAC (who can act).',
    answer: [
      'Azure Policy is an Azure **governance** service used to enforce organizational rules and compliance requirements on Azure resources.',
      'It can **audit, deny, modify or deploy** configurations based on defined rules.',
      '**Simple example:** Suppose your organization says: "All Storage Accounts must have public network access disabled." You can create an Azure Policy:',
      '**Common use cases for Azure Policy**',
      "- Prevent public access to Storage Accounts\n- Require specific Azure regions\n- Require mandatory tags such as Environment and Owner\n- Prevent creation of expensive or unwanted resource SKUs\n- Require encryption\n- Enforce HTTPS\n- Audit resources that don't comply\n- Automatically add or modify certain configurations",
      '**Azure Policy effects:** Some common effects:',
      '- **Effect**: Deny; **Meaning**: Prevents creating or updating a non-compliant resource\n- **Effect**: Audit; **Meaning**: Allows the resource but reports it as non-compliant\n- **Effect**: Modify; **Meaning**: Changes or adds resource configuration (for example tags)\n- **Effect**: DeployIfNotExists; **Meaning**: Deploys a required configuration if it is missing\n- **Effect**: Disabled; **Meaning**: The policy is not evaluated',
      '**Azure Policy vs. RBAC:** This is a common interview question.',
      '**RBAC answers: who can do what?**',
      '**Azure Policy answers: which configurations are allowed in Azure?**',
      'So even if a user has Contributor, an Azure Policy can prevent certain resource configurations.',
      '**Interview-ready answer:** "Azure Policy is a governance service used to enforce organizational standards and compliance across Azure resources. For example, I can create a policy to deny Storage Accounts with public network access enabled, enforce mandatory tags, or restrict deployments to approved regions. RBAC controls who can perform actions, while Azure Policy controls which resource configurations are allowed."',
    ],
    code: [
      {
        title: 'Policy evaluating a Storage Account',
        language: 'text',
        code: `       Storage Account
             |
             v
   Public network access?
             |
       ┌─────┴─────┐
       |           |
   Disabled     Enabled
       |           |
    Allowed     Denied ❌`,
      },
      {
        title: 'RBAC: who can do what',
        language: 'text',
        code: `Developer → Contributor
Developer → Reader`,
      },
      {
        title: 'Policy: which configurations are allowed',
        language: 'text',
        code: `Developer has Contributor access
          ↓
Tries to create a public Storage Account
          ↓
Azure Policy → DENY`,
      },
    ],
    tags: ['azure', 'azure policy', 'governance', 'rbac'],
  },
  {
    id: 'itv-repm1-16',
    level: 'advanced',
    kind: 'open',
    prompt:
      'Apart from pre-commit hooks, what other hooks and checks are there, inside and outside Git, and what is their purpose?',
    probing:
      'Knowing where each control belongs: local Git hooks, the pre-commit framework, CI quality gates, cloud policy and Kubernetes admission control.',
    answer: [
      'Think of pre-commit hooks as **one layer in a larger validation chain**. In DevOps, you can have checks on the developer machine, in the Git repository, in the CI/CD pipeline, in Kubernetes, in Terraform, and at the Azure governance level.',
      '**1. Git hooks:** Git has several hooks that can run automatically.',
      '- **Hook**: `pre-commit`; **When it runs**: Before the commit is created; **Typical purpose**: Linting, formatting, secret scan\n- **Hook**: `commit-msg`; **When it runs**: After the commit message is entered; **Typical purpose**: Validate the commit message format\n- **Hook**: `pre-push`; **When it runs**: Before `git push`; **Typical purpose**: Run tests, security checks\n- **Hook**: `post-commit`; **When it runs**: After the commit; **Typical purpose**: Notifications, local automation\n- **Hook**: `pre-rebase`; **When it runs**: Before a rebase; **Typical purpose**: Prevent unsafe rebases\n- **Hook**: `post-checkout`; **When it runs**: After a checkout; **Typical purpose**: Environment or setup tasks\n- **Hook**: `post-merge`; **When it runs**: After a merge; **Typical purpose**: Dependency or setup tasks\n- **Hook**: `pre-receive`; **When it runs**: Server side, before accepting a push; **Typical purpose**: Enforce repository rules\n- **Hook**: `update`; **When it runs**: Server side, per branch / ref; **Typical purpose**: Control branch updates\n- **Hook**: `post-receive`; **When it runs**: Server side, after a push; **Typical purpose**: Trigger deployment or notification',
      'Most important for interviews:',
      '**2. The pre-commit framework:** The **pre-commit** framework is commonly used to manage Git hooks consistently across a team.',
      'Example `.pre-commit-config.yaml` (pin each `rev` to the latest release):',
      'Purpose of these hooks:',
      '- YAML validation\n- JSON validation\n- Remove trailing whitespace\n- Detect merge conflicts\n- Detect secrets\n- Run formatters and linters',
      '**3. Terraform checks:** For Terraform projects, these are very common.',
      '- **`terraform fmt`** formats Terraform code: `terraform fmt -check`\n- **`terraform validate`** checks that the configuration is syntactically and structurally valid.\n- **TFLint** (`tflint`) catches potential errors and best-practice issues, such as a wrong Azure resource configuration, an invalid argument or deprecated configuration.\n- **Checkov** (`checkov -d .`) scans IaC for security and compliance issues, such as a storage account that allows public access, an NSG that allows unrestricted inbound traffic, or missing encryption.\n- **tfsec** (`tfsec .`) is a Terraform-focused security scanner. In modern setups, many teams use **Trivy** instead, because tfsec has been merged into it.\n- **Trivy** (`trivy config .`) scans Terraform/IaC, containers, filesystems and more.',
      '**4. Secret scanning:** These are extremely important. They stop credentials and sensitive information from entering the repository.',
      '- **Gitleaks** (`gitleaks detect`) detects secrets accidentally committed to Git: cloud keys, Azure credentials, API tokens, passwords and private keys.\n- **TruffleHog** is another secret-detection tool:',
      '**5. Code quality and linting**',
      '- **ShellCheck** (`shellcheck script.sh`) detects common shell scripting problems. For example, in `if [ $x = "test" ]` it flags the unquoted `$x`.\n- **Pylint** (`pylint script.py`) checks Python code quality, errors, naming and bad practices.\n- **Black** (`black .`) formats Python code.\n- **Flake8** (`flake8 .`) lints Python code.',
      '**6. YAML and Kubernetes validation**',
      '- **kubeconform** (`kubeconform deployment.yaml`) validates Kubernetes manifests against the Kubernetes schemas.\n- **kube-linter** (`kube-linter lint deployment.yaml`) checks manifests for common configuration and security problems.\n- **`kubectl apply --dry-run`** validates without creating resources:',
      '**7. Docker checks (Dockerfile and image)**',
      '- **Hadolint** (`hadolint Dockerfile`) lints Dockerfiles: bad practices, unnecessary packages, poor layer usage, missing version pinning.\n- **Trivy** (`trivy image myapp:1.0`) scans container images for OS vulnerabilities, application dependency vulnerabilities, secrets and misconfigurations.',
      "**8. CI/CD pipeline checks:** These don't run as Git hooks. They run after the code reaches the CI system.",
      'Common tools at this stage:',
      '- **Tool**: SonarQube; **Purpose**: Code quality and security\n- **Tool**: Trivy; **Purpose**: Container and IaC scanning\n- **Tool**: Snyk; **Purpose**: Dependency and security scanning\n- **Tool**: OWASP Dependency-Check; **Purpose**: Dependency vulnerabilities\n- **Tool**: Checkov; **Purpose**: IaC security\n- **Tool**: TFLint; **Purpose**: Terraform linting\n- **Tool**: ShellCheck; **Purpose**: Shell linting\n- **Tool**: Hadolint; **Purpose**: Dockerfile linting',
      '**9. SonarQube:** SonarQube is a **CI/CD quality gate**, not a Git hook. It checks bugs, vulnerabilities, code smells, duplications and test coverage.',
      '**10. Azure Policy:** This is **not** a Git hook. It works at the Azure resource / governance level.',
      'Common policies: require tags, restrict Azure regions, deny public Storage Accounts, require HTTPS, require encryption, restrict resource SKUs.',
      '**11. Kubernetes admission control:** These run when Kubernetes resources are submitted to the API server.',
      '- **OPA Gatekeeper** enforces organizational policies, for example "every container must have resource limits".',
      '- **Kyverno** is a Kubernetes-native policy engine. Example policies: require resource limits, require labels, disallow privileged containers, allow only approved container registries.\n- **Pod Security Admission** is built into Kubernetes and enforces the Pod Security Standards: Privileged, Baseline and Restricted.',
      '**12. Dependency scanning:** For application dependencies:',
      '- **npm:** `npm audit`\n- **Maven:** `mvn dependency-check:check` (OWASP Dependency-Check plugin)\n- **OWASP Dependency-Check** scans application dependencies for known vulnerabilities.\n- **Snyk** can scan source code, dependencies, containers and IaC.',
      '**13. A good DevOps validation architecture**',
      'For an Azure DevOps / Kubernetes / Terraform profile, remember this:',
      "**The key distinction for interviews:** Don't say all of these are pre-commit hooks. That's incorrect. Say:",
      '"Git hooks run locally or server-side around Git operations. Tools like pre-commit, ShellCheck and Gitleaks can be integrated as Git hooks. Terraform validate, TFLint, Checkov, Trivy and SonarQube are usually also run in CI because local hooks alone can be bypassed. Kubernetes admission controllers such as Kyverno or Gatekeeper enforce policies at cluster admission time, while Azure Policy governs Azure resources."',
      'That distinction shows you understand **where each control belongs**, not just the tool names.',
    ],
    code: [
      {
        title: 'pre-commit hook flow',
        language: 'text',
        code: `Developer
   ↓
git commit
   ↓
pre-commit hooks
   ↓
lint / format / secret scan
   ↓
Commit`,
      },
      {
        title: 'pre-push hook flow',
        language: 'text',
        code: `git push
   ↓
pre-push hook
   ↓
tests / validation
   ↓
Remote repository`,
      },
      {
        title: '.pre-commit-config.yaml',
        language: 'yaml',
        code: `repos:
  - repo: https://github.com/pre-commit/pre-commit-hooks
    rev: v5.0.0
    hooks:
      - id: trailing-whitespace
      - id: end-of-file-fixer
      - id: check-yaml
      - id: check-json
      - id: check-merge-conflict

  - repo: https://github.com/gitleaks/gitleaks
    rev: v8.24.2
    hooks:
      - id: gitleaks`,
      },
      {
        title: 'TruffleHog scan of recent commits',
        language: 'bash',
        code: `trufflehog git file://. --since-commit HEAD~10`,
      },
      {
        title: 'Validate manifests with kubectl dry-run',
        language: 'bash',
        code: `kubectl apply --dry-run=client -f deployment.yaml
kubectl apply --dry-run=server -f deployment.yaml   # server-side validation`,
      },
      {
        title: 'CI/CD pipeline checks',
        language: 'text',
        code: `Developer
   ↓
Git pre-commit
   ↓
Git push
   ↓
CI pipeline
   ↓
Build
   ↓
Unit tests
   ↓
SonarQube
   ↓
Security scan
   ↓
Docker build
   ↓
Trivy
   ↓
Deploy`,
      },
      {
        title: 'SonarQube quality gate',
        language: 'text',
        code: `Build
  ↓
Unit tests
  ↓
SonarQube scan
  ↓
Quality gate
  ↓
PASS → continue
FAIL → stop the pipeline`,
      },
      {
        title: 'Azure Policy denies a public Storage Account',
        language: 'text',
        code: `Terraform
   ↓
Azure
   ↓
Azure Policy
   ↓
Storage Account has public access
   ↓
DENY`,
      },
      {
        title: 'Gatekeeper admission check',
        language: 'text',
        code: `Deployment
    ↓
Gatekeeper
    ↓
Container must have resource limits
    ↓
PASS / DENY`,
      },
      {
        title: 'DevOps validation architecture',
        language: 'text',
        code: `                Developer
                    |
                    v
             Git pre-commit
                    |
       +------------+------------+
       |            |            |
   Formatting    Linting    Secret scan
       |            |            |
       +------------+------------+
                    |
                  Push
                    |
                    v
              CI pipeline
                    |
       +------------+-------------+
       |            |             |
   Terraform    SonarQube       Tests
   validate
       |
 TFLint / Checkov
       |
     Trivy
       |
  Docker build
       |
 Trivy image scan
       |
 Kubernetes validation
       |
       v
     Deploy
       |
       v
Kubernetes admission
Gatekeeper / Kyverno
       |
       v
     Azure
       |
       v
  Azure Policy`,
      },
    ],
    followUps: [
      'Why can a client-side hook not be relied on as a security control, and what enforces it instead?',
      'How do you stop a secret that has already been pushed from being used?',
      'Where would you run Checkov or tfsec, and how do you handle accepted exceptions?',
      'What is the difference between OPA Gatekeeper and Kyverno?',
    ],
    tags: ['git hooks', 'pre-commit', 'devsecops', 'ci/cd', 'policy as code'],
  },
  {
    id: 'itv-repm1-17',
    level: 'intermediate',
    kind: 'scenario',
    prompt: 'If there is an issue with unit testing, how will you assist the developer?',
    probing:
      'Collaborating with developers: reading pipeline test results, separating code issues from environment issues, and helping reproduce failures.',
    answer: [
      '**Interview-ready answer:** "If a unit test is failing, I first check the CI/CD pipeline logs to identify whether the failure is due to the application code, test code, environment, dependency, or pipeline configuration.',
      "I share the exact error and failing test case with the developer and help reproduce the issue locally. If it's a code or test logic issue, the developer fixes it. If it's an environment or pipeline issue, such as a missing dependency, incorrect environment variable, wrong configuration, or test database connectivity, I troubleshoot and fix that part.",
      'After the fix, I rerun the unit tests and verify that the complete test suite passes before allowing the pipeline to continue."',
      '**Example: a failing test in the pipeline**',
      'Suppose the pipeline shows:',
      'For that failure, I would:',
      '1. Check the complete stack trace.\n2. Identify the failing test and recent code changes.\n3. Try to reproduce it locally.\n4. Check whether the failure is application logic, test data, dependency, or environment related.\n5. Share the evidence with the developer.\n6. If the issue is environmental, fix the pipeline or configuration.\n7. Re-run the tests.\n8. Verify the full suite passes.',
      "In Azure DevOps, publishing results with the `PublishTestResults@2` task makes the failing test, its error message and its history visible in the pipeline's **Tests** tab, which makes it much easier to share with the developer.",
      '**Strong DevOps interview point:** Don\'t say "I ask the developer to fix it." Say:',
      '"I don\'t necessarily fix application logic myself, but I help the developer isolate the problem. I provide the logs, error details, reproduction steps, and environment information. If the problem is infrastructure or CI/CD related, I take ownership of that part and fix it."',
      'That shows proper collaboration between Developer and DevOps, instead of treating every test failure as a developer problem.',
    ],
    code: [
      {
        title: 'Unit test failure triage flow',
        language: 'text',
        code: `            Unit test failure
                    |
                    v
             Check CI/CD logs
                    |
                    v
           Identify root cause
                    |
       +------------+-------------+
       |            |             |
   Code issue   Test issue   Environment /
       |            |         pipeline issue
       |            |             |
   Developer    Developer       DevOps
     fixes        fixes          fixes
       |            |             |
       +------------+-------------+
                    |
                    v
             Run tests again
                    |
                    v
                  PASS
                    |
                    v
            Continue pipeline`,
      },
      {
        title: 'Example failing test output',
        language: 'text',
        code: `Tests run: 25
Failures: 1

PaymentServiceTest
Expected: 200
Actual: 500`,
      },
    ],
    tags: ['ci/cd', 'unit testing', 'azure devops', 'collaboration'],
  },
  {
    id: 'itv-repm1-18',
    level: 'intermediate',
    kind: 'open',
    prompt:
      'You have Splunk, Grafana and Prometheus. How do you use these tools effectively for multitasking?',
    probing:
      'Giving each tool a clear job (metrics, visualisation, logs), alert-driven work instead of watching dashboards, and incident prioritisation.',
    answer: [
      'The key is not to use all three tools for the same purpose. Give each tool a clear responsibility and use them together for incident investigation.',
      '**Interview-ready answer:** "I use Prometheus and Grafana mainly for real-time infrastructure and application metrics, and Splunk for centralized log analysis. I don\'t continuously monitor all three independently. I use dashboards and alerts to identify an issue, then correlate metrics with logs to find the root cause."',
      '**How I use each tool**',
      '- **Tool**: Prometheus; **Primary purpose**: Collect metrics and alerting; **Example**: CPU, memory, pod restarts, request rate\n- **Tool**: Grafana; **Primary purpose**: Visualize metrics and dashboards; **Example**: AKS health, application latency\n- **Tool**: Splunk; **Primary purpose**: Centralized log analysis; **Example**: Application errors, exceptions, HTTP 500/503',
      '**Example: production issue:** Suppose users report that the application is slow.',
      'For example, Grafana shows:',
      'Prometheus confirms the memory increase. Then I search Splunk:',
      'If Splunk shows repeated `OutOfMemoryError`, I know the issue is likely related to memory consumption rather than network latency.',
      "**How I multitask:** If I'm handling multiple applications:",
      '**1. Use centralized dashboards.** Create Grafana dashboards for:',
      '**2. Configure alerts.** Prometheus can alert on conditions such as:',
      '- CPU > 80%\n- Memory > 85%\n- Pod restart count increasing\n- HTTP 5xx above a threshold\n- High API latency',
      'Example PromQL expressions behind such alerts:',
      "This means I don't have to manually watch dashboards all day.",
      '**3. Use Splunk saved searches.** Maintain saved searches for common problems:',
      '- HTTP 500\n- HTTP 503\n- OutOfMemory\n- Connection refused\n- Timeout\n- Authentication failure',
      '**4. Prioritize incidents.**',
      '**Strong interview answer:** "For multitasking, I rely heavily on alerts and dashboards rather than manually monitoring every system. Prometheus collects metrics and triggers alerts, Grafana gives me a centralized view of infrastructure and application health, and Splunk helps me drill into logs when an alert fires. For example, if Grafana shows high latency, I use Prometheus to determine whether CPU, memory, pods or request rates are responsible, then use Splunk to correlate that with application errors. I prioritize production incidents first and use predefined dashboards and saved Splunk queries to investigate multiple applications efficiently."',
      'Simple rule to remember:',
    ],
    code: [
      {
        title: 'Example: production latency issue',
        language: 'text',
        code: `User reports high latency
        ↓
Grafana dashboard
        ↓
API latency increased
        ↓
Prometheus metrics
        ↓
Pod CPU / memory / restart count
        ↓
Identify affected service
        ↓
Splunk
        ↓
Search application logs
        ↓
Find errors / exceptions
        ↓
Root cause
        ↓
Fix + verify in Grafana`,
      },
      {
        title: 'What Grafana shows',
        language: 'text',
        code: `API latency: 200ms → 5 seconds
Pod restarts: increasing
Memory: 90%+`,
      },
      {
        title: 'Splunk search',
        language: 'text',
        code: `index=production service=payment "OutOfMemory"`,
      },
      {
        title: 'Grafana dashboard layout',
        language: 'text',
        code: `Production
 ├── AKS
 ├── Application
 ├── Database
 └── Infrastructure`,
      },
      {
        title: 'Example PromQL alert expressions',
        language: 'text',
        code: `# Pod restarts in the last 15 minutes
increase(kube_pod_container_status_restarts_total[15m]) > 3

# More than 5% of requests returning 5xx
sum(rate(http_requests_total{status=~"5.."}[5m]))
  / sum(rate(http_requests_total[5m])) > 0.05`,
      },
      {
        title: 'Incident priority order',
        language: 'text',
        code: `P1 / Production outage
        ↓
P2 / Major degradation
        ↓
P3 / Individual service issue
        ↓
P4 / Non-production issue`,
      },
      {
        title: 'Simple rule to remember',
        language: 'text',
        code: `Prometheus = metrics and alerting
Grafana    = visualization
Splunk     = logs and investigation`,
      },
    ],
    tags: ['monitoring', 'prometheus', 'grafana', 'splunk', 'observability'],
  },
  {
    id: 'itv-repm1-19',
    level: 'intermediate',
    kind: 'open',
    prompt: 'How do you set up health probes in a load balancer?',
    probing:
      'Probe types, thresholds, how a probe is attached through a load-balancing rule, and how to debug a VM the probe marks unhealthy.',
    answer: [
      'An Azure Load Balancer **health probe** checks whether a backend VM or instance is healthy before sending traffic to it.',
      '**Interview-ready answer:** "I configure a health probe on the Azure Load Balancer and associate it with the backend pool through a load-balancing rule. The probe periodically checks a specific port and protocol on the backend instances. Only healthy instances receive traffic."',
      'Traffic is sent only to VM1 and VM2.',
      '**Types of Azure Load Balancer probes**',
      '- **Type**: TCP; **Checks**: The port accepts a TCP connection; **Example**: Port 8080; **Use when**: You only need to know the service is listening\n- **Type**: HTTP; **Checks**: An HTTP endpoint returns **200 OK**; **Example**: Port 8080, path `/health`; **Use when**: You want an application-level health check\n- **Type**: HTTPS; **Checks**: Same as HTTP, over TLS (Standard SKU only); **Example**: Port 443, path `/health`; **Use when**: The endpoint only serves HTTPS',
      'Any HTTP status other than 200, or a timeout, counts as a failed probe.',
      '**Important settings**',
      '- **Setting**: Protocol; **Example**: HTTP\n- **Setting**: Port; **Example**: 8080\n- **Setting**: Path (HTTP/HTTPS only); **Example**: `/health`\n- **Setting**: Interval; **Example**: 5 seconds\n- **Setting**: Unhealthy threshold; **Example**: 2 consecutive failures',
      'If the backend fails the required number of consecutive probes, Azure Load Balancer marks it unhealthy and stops sending **new** connections to it. Existing connections are not cut immediately.',
      '**Azure CLI example**',
      '**Common interview follow-up:** "The VM is running, but the Load Balancer shows it as unhealthy. What will you check?"',
      '- Is the application actually listening on the probe port?\n- Is the probe path correct?\n- Does `/health` return HTTP 200?\n- Does the NSG allow probe traffic? Probes come from **168.63.129.16**, so the NSG must allow the `AzureLoadBalancer` service tag. A custom "deny all inbound" rule placed above the default rules blocks the probes.\n- Is the load-balancing rule configured correctly?\n- Is the backend pool associated with the correct NIC or IP?\n- Is the application binding to the correct interface and port? An app bound only to `127.0.0.1` passes a local test but fails the probe.',
      "If `curl` works locally but the probe still fails, I'd investigate NSG rules, the guest OS firewall, routing, application binding and the probe configuration.",
    ],
    code: [
      {
        title: 'Health probe and backend pool',
        language: 'text',
        code: `Azure Load Balancer
        |
        | Health probe
        | TCP : 8080
        v
Backend pool
   ├── VM1 : 8080  → Healthy
   ├── VM2 : 8080  → Healthy
   └── VM3 : 8080  → Unhealthy`,
      },
      {
        title: 'Azure CLI example',
        language: 'bash',
        code: `# 1. Create the probe
az network lb probe create \\
  --resource-group my-rg \\
  --lb-name my-lb \\
  --name app-health-probe \\
  --protocol Http \\
  --port 8080 \\
  --path /health \\
  --interval 5 \\
  --probe-threshold 2

# 2. Associate it with a load-balancing rule
az network lb rule create \\
  --resource-group my-rg \\
  --lb-name my-lb \\
  --name app-rule \\
  --protocol Tcp \\
  --frontend-port 80 \\
  --backend-port 8080 \\
  --frontend-ip-name my-frontend \\
  --backend-pool-name my-backend-pool \\
  --probe-name app-health-probe`,
      },
      {
        title: 'On the VM: check the probe target',
        language: 'bash',
        code: `ss -lntp                               # is anything listening on 8080, and on which address?
curl -i http://localhost:8080/health   # does it return 200?`,
      },
    ],
    tags: ['azure', 'load balancer', 'health probe', 'networking'],
  },
  {
    id: 'itv-repm1-20',
    level: 'intermediate',
    kind: 'open',
    prompt: 'What is the CrashLoopBackOff error, and how will you troubleshoot it?',
    probing:
      'What the back-off actually is, the common causes, and a disciplined order of kubectl checks including logs --previous and exit codes.',
    answer: [
      '**What is CrashLoopBackOff?** CrashLoopBackOff means a Kubernetes container starts, crashes or exits, Kubernetes restarts it, and the container keeps crashing repeatedly. Kubernetes gradually increases the delay between restarts (10s, 20s, 40s … up to 5 minutes), hence **BackOff**.',
      'It is usually an application or container startup issue, not necessarily a node issue.',
      '**Common reasons for CrashLoopBackOff**',
      '- Application configuration error\n- Missing or incorrect environment variables\n- Secret or ConfigMap missing\n- Wrong database or API connection\n- Application listening on the wrong port\n- Incorrect command or entrypoint\n- Missing dependency\n- OOMKilled due to insufficient memory\n- Liveness probe failure\n- Permission issues',
      '**How will you troubleshoot?** I would follow this order.',
      '**1. Check pod status**',
      '**2. Describe the pod**',
      'In the describe output, check:',
      '- Events\n- Last State\n- Exit code\n- Reason\n- Probe failures\n- Mount, Secret or ConfigMap errors',
      '**3. Check current logs**',
      '**4. Check logs from the previous crashed container.** This is very important for CrashLoopBackOff:',
      'Now I know the container is crashing because of a database connection problem.',
      "**5. Check the container's last state**",
      'If you see `reason: OOMKilled` (exit code **137**), investigate memory requests and limits. Other common exit codes:',
      '- **Exit code**: 0; **Usual meaning**: The process finished, but a Deployment expects it to keep running (wrong command)\n- **Exit code**: 1; **Usual meaning**: Application error at startup\n- **Exit code**: 126 / 127; **Usual meaning**: Command not executable / not found (wrong entrypoint)\n- **Exit code**: 137; **Usual meaning**: Killed by SIGKILL, usually OOMKilled\n- **Exit code**: 143; **Usual meaning**: Terminated by SIGTERM',
      '**6. Check configuration**',
      'Verify that the required environment variables, ConfigMaps and Secrets exist and are correctly mounted or referenced.',
      '**7. Check probes.** If logs look normal but the container keeps restarting:',
      "Look for `Liveness probe failed`, then verify the application's health endpoint, port and `initialDelaySeconds` (a slow-starting app needs a longer delay or a startup probe).",
      "Note: only a failing **liveness** probe restarts the container. A failing **readiness** probe just removes the pod from Service endpoints, so it doesn't cause CrashLoopBackOff.",
      '**Interview-ready answer:** "CrashLoopBackOff means the container is repeatedly starting and crashing, so Kubernetes keeps restarting it and applies an increasing backoff delay.',
      'First, I check `kubectl get pods` and `kubectl describe pod` to understand the restart reason and events. Then I check `kubectl logs` and especially `kubectl logs --previous`, because the current container may have only just restarted and the useful error is in the previous one.',
      'I then verify the exit code, OOMKilled status, ConfigMaps, Secrets, environment variables, application configuration, database connectivity, container command or entrypoint, and the liveness probe.',
      'Once I identify the root cause, I fix the application, configuration, resource or probe issue and monitor the pod using `kubectl get pods` and `kubectl rollout status`."',
      '**Simple troubleshooting flow**',
    ],
    code: [
      {
        title: '1. Check pod status',
        language: 'bash',
        code: `kubectl get pods -n <namespace>`,
      },
      {
        title: 'Example kubectl get pods output',
        language: 'text',
        code: `payment-api-7d8f9c6b7f-x2abc   0/1   CrashLoopBackOff   5   10m`,
      },
      {
        title: '2. Describe the pod',
        language: 'bash',
        code: `kubectl describe pod <pod-name> -n <namespace>`,
      },
      {
        title: '3. Check current logs',
        language: 'bash',
        code: `kubectl logs <pod-name> -n <namespace>`,
      },
      {
        title: 'Logs from the previous crashed container',
        language: 'bash',
        code: `kubectl logs <pod-name> -n <namespace> --previous`,
      },
      {
        title: 'Example previous-container log',
        language: 'text',
        code: `Error connecting to PostgreSQL
Connection refused
Application startup failed`,
      },
      {
        title: "Check the container's last state",
        language: 'bash',
        code: `kubectl get pod <pod-name> -n <namespace> \\
  -o jsonpath='{.status.containerStatuses[*].lastState}'`,
      },
      {
        title: '6. Check configuration',
        language: 'bash',
        code: `kubectl get configmap -n <namespace>
kubectl get secrets -n <namespace>`,
      },
      {
        title: 'Look for probe failures in the events',
        language: 'bash',
        code: `kubectl describe pod <pod-name> -n <namespace>`,
      },
      {
        title: 'Simple troubleshooting flow',
        language: 'text',
        code: `CrashLoopBackOff
       ↓
kubectl describe pod
       ↓
kubectl logs --previous
       ↓
Check exit code / reason
       ↓
 ┌───────────────┬────────────────┬─────────────────┐
 │ OOMKilled     │ App error      │ Probe failure   │
 │               │                │                 │
 │ Check limits  │ Check config,  │ Check endpoint  │
 │ & memory      │ DB, secrets    │ & port          │
 └───────────────┴────────────────┴─────────────────┘
       ↓
Fix root cause
       ↓
Verify pod becomes Ready`,
      },
    ],
    tags: ['kubernetes', 'crashloopbackoff', 'troubleshooting', 'kubectl'],
  },
  {
    id: 'itv-repm1-21',
    level: 'advanced',
    kind: 'open',
    prompt: 'How do you migrate servers from on-premises to Azure?',
    probing:
      'A phased migration with Azure Migrate: assessment and dependency mapping, landing zone, replication, test migration, cutover and rollback.',
    answer: [
      'I would follow a **plan → assess → replicate → test → migrate → validate → decommission** approach.',
      '**1. Assess the existing servers:** First, I collect:',
      '- Number of servers\n- OS version\n- CPU, memory and disk requirements\n- Applications and services running\n- Database dependencies\n- Network dependencies\n- Ports and firewall rules\n- DNS requirements\n- Application dependencies',
      'I use **Azure Migrate** to discover and assess the on-premises servers and get sizing and cost recommendations. Its dependency analysis shows which servers talk to each other, so they can be migrated together in the same wave.',
      'In Azure, I also configure:',
      '- VNet and subnets\n- NSGs\n- VPN or ExpressRoute connectivity\n- DNS\n- Azure RBAC\n- Monitoring\n- Backup\n- Key Vault if required',
      '**3. Replicate the servers:** I use the **Migration and modernization** tool in Azure Migrate (previously called Server Migration). VMware VMs can be replicated agentless or agent-based, Hyper-V VMs replicate through the Hyper-V host, and physical servers need the replication agent (Mobility service).',
      'The server keeps running on-premises while its data is replicated to Azure.',
      '**4. Test migration:** Before the production cutover, I perform a **test migration** into an isolated, non-production VNet. I verify:',
      '- The application starts correctly\n- Network connectivity\n- Database connectivity\n- DNS\n- Firewall and NSG rules\n- Application functionality\n- Performance\n- Monitoring and backup',
      "Test migration doesn't impact the production server.",
      '**5. Production cutover**',
      'During the migration window:',
      'Then I monitor the application closely. The on-premises server stays switched off but intact, so the rollback plan is to switch DNS back to it.',
      "**6. Decommission on-premises:** After business validation and a defined rollback period, I decommission the old server according to the organization's change-management and retention process.",
      '**Interview-ready answer:** "For on-prem to Azure migration, I normally use Azure Migrate. First, I assess the existing servers, their sizing, applications, dependencies, network and database requirements. Then I prepare the Azure environment with VNet, subnets, NSGs, connectivity through VPN or ExpressRoute, RBAC, monitoring and backup.',
      'Next, I install the required Azure Migrate replication components and continuously replicate the on-prem servers to Azure. I perform a test migration to validate the application, networking and dependencies. During the production cutover, I stop or quiesce the application, perform the final synchronization, migrate the server, start it in Azure, update DNS or traffic routing, and validate the application. After a successful stabilization period, I decommission the on-prem server.',
      'The key goal is to minimize downtime and have a tested rollback plan before production cutover."',
      '**Important interview point**',
      'Don\'t say "I just copy the VM to Azure." Say:',
      'Also mention **Azure Migrate** as the primary tool for a typical server migration scenario.',
    ],
    code: [
      {
        title: 'Prepare the Azure landing zone',
        language: 'text',
        code: `Azure subscription
      ↓
Resource groups
      ↓
     VNet
 ┌────┴─────┐
Subnet    Subnet
 App        DB
      ↓
NSG / Firewall
      ↓
VPN / ExpressRoute`,
      },
      {
        title: 'Replication with Azure Migrate',
        language: 'text',
        code: `On-prem server
      ↓
Azure Migrate
      ↓
Continuous replication
      ↓
Azure managed disk`,
      },
      {
        title: 'Cutover during the migration window',
        language: 'text',
        code: `Stop / quiesce application
        ↓
Final data sync
        ↓
Stop on-prem server
        ↓
Complete migration
        ↓
Start Azure VM
        ↓
Update DNS / traffic
        ↓
Validate application`,
      },
      {
        title: 'Migration phases',
        language: 'text',
        code: `Assess → Dependency mapping → Azure preparation → Replication → Test migration → Cutover → Validation → Decommission`,
      },
    ],
    followUps: [
      'How do you migrate servers whose dependencies you cannot fully map?',
      'When would you rehost versus replatform to PaaS?',
      'How do you keep downtime low for a large database during cutover?',
      'What is your rollback plan if the application fails after cutover?',
    ],
    tags: ['azure', 'migration', 'azure migrate', 'cutover'],
  },
  {
    id: 'itv-repm1-22',
    level: 'advanced',
    kind: 'scenario',
    prompt: 'An application is down on an Azure Windows Server VM. How do you troubleshoot it?',
    probing:
      'An outside-in troubleshooting order: Azure platform, network path, Windows service and port, event logs, application logs and dependencies.',
    answer: [
      'I troubleshoot from the outside in: **Azure infrastructure → VM → network → Windows → application → dependencies**.',
      '**1. Check the Azure VM health**',
      'At the Azure level, I check:',
      '- Is the VM **running**?\n- Resource Health and any recent Azure platform issues\n- The Activity Log for recent changes (resize, restart, NSG or extension changes)\n- Boot diagnostics (screenshot) to see whether Windows booted at all\n- CPU, memory, disk and network metrics in Azure Monitor',
      "If the VM itself is unavailable, I fix the VM before looking at the application. If RDP doesn't work, I can still use **Run Command** or the **Serial Console** from the portal.",
      '**2. Check network connectivity:** I verify:',
      '- NSG rules on the NIC and the subnet\n- Load Balancer or Application Gateway health probe status\n- Public/private IP\n- The required application port is open, including the **Windows Firewall** inside the VM',
      'For example, if the application uses port 8080:',
      'If it works locally but not from another server, the problem is the NSG, Windows Firewall, routing or the application binding only to `127.0.0.1`.',
      '**3. Check the Windows service**',
      'I also check whether the service keeps stopping or fails to start, because restarting it only hides the real problem.',
      '**4. Check whether the application is listening**',
      'If nothing is listening on the expected port, I investigate the application or service itself.',
      '**5. Check Windows Event Viewer**',
      'In the event logs, I look for:',
      '- Application crashes\n- Service failures (Service Control Manager events in the System log)\n- .NET errors\n- Permission issues\n- Disk or resource problems',
      '**6. Check the application logs:** For example, `C:\\Program Files\\<Application>\\logs\\`, or `C:\\inetpub\\logs\\LogFiles\\` for IIS.',
      'In the application logs, I search for:',
      '- `ERROR` / `Exception`\n- `Connection refused`\n- `Timeout`\n- `OutOfMemory`\n- `Access denied`',
      '**7. Check the dependencies:** If the application is running but still unavailable, I check what it depends on:',
      '- SQL Server / PostgreSQL\n- Downstream APIs\n- Storage\n- DNS\n- Key Vault\n- Active Directory / Entra ID\n- Other application servers',
      '**8. Check resource utilization**',
      'I also check Azure Monitor for CPU, memory, disk space, disk IOPS, network and VM availability. A full disk is a very common reason for a service failing to start or write logs.',
      '**Interview-ready answer:** "If an application is down on an Azure Windows Server, I first determine whether the issue is with Azure infrastructure, the VM, the network, the Windows service, the application or its dependencies.',
      'First, I check the VM status, Resource Health, Azure Monitor metrics, the Activity Log and boot diagnostics. Then I verify the NSG rules and the Load Balancer or Application Gateway health probes, and test the application port with `Test-NetConnection`.',
      'If network connectivity is fine, I connect to the VM and check whether the application service is running and listening on the expected port. Then I check Event Viewer and the application logs for errors or crashes, and check CPU, memory and disk.',
      'Finally, I verify dependencies such as the database, APIs, DNS and authentication. Once I identify the root cause, I fix it, restart the service only if required, validate the application end to end, and monitor it to make sure the issue doesn\'t recur."',
      '**Simple troubleshooting flow**',
      "**Strong interview point:** Don't immediately restart the server. First **collect evidence** and identify whether the problem is infrastructure, network, Windows service, application or dependency. A restart can clear the symptom and destroy the evidence you need for the root cause.",
    ],
    code: [
      {
        title: 'Check the Azure VM health',
        language: 'bash',
        code: `az vm get-instance-view \\
  --resource-group <rg> \\
  --name <vm-name> \\
  --query "instanceView.statuses"`,
      },
      {
        title: 'Test the application port',
        language: 'powershell',
        code: `# On the VM itself
Test-NetConnection localhost -Port 8080

# From another server in the VNet
Test-NetConnection <private-ip> -Port 8080`,
      },
      {
        title: 'Check the Windows service',
        language: 'powershell',
        code: `Get-Service <service-name>`,
      },
      {
        title: 'Start the stopped service',
        language: 'powershell',
        code: `Start-Service <service-name>`,
      },
      {
        title: 'Is the port listening? (netstat)',
        language: 'powershell',
        code: `netstat -ano | findstr :8080`,
      },
      {
        title: 'Is the port listening? (PowerShell)',
        language: 'powershell',
        code: `Get-NetTCPConnection -LocalPort 8080 -State Listen`,
      },
      {
        title: 'Event Viewer logs to check',
        language: 'text',
        code: `Event Viewer
 ├── Windows Logs
 │    ├── Application
 │    └── System
 └── Applications and Services Logs (application-specific)`,
      },
      {
        title: 'Recent application errors from PowerShell',
        language: 'powershell',
        code: `Get-WinEvent -LogName Application -MaxEvents 50 |
  Where-Object LevelDisplayName -eq 'Error'`,
      },
      {
        title: 'Check database connectivity and DNS',
        language: 'powershell',
        code: `Test-NetConnection <database-server> -Port 1433
Resolve-DnsName <database-server>`,
      },
      {
        title: 'Top CPU and memory consumers',
        language: 'powershell',
        code: `# Top CPU consumers
Get-Process | Sort-Object CPU -Descending | Select-Object -First 10

# Top memory consumers
Get-Process | Sort-Object WorkingSet -Descending | Select-Object -First 10

# Free disk space
Get-PSDrive -PSProvider FileSystem`,
      },
      {
        title: 'Simple troubleshooting flow',
        language: 'text',
        code: `Application down
       ↓
Azure VM healthy?
       ↓
Network / NSG / LB / App Gateway?
       ↓
Port reachable? (incl. Windows Firewall)
       ↓
Windows service running?
       ↓
Application listening?
       ↓
Event Viewer + application logs
       ↓
CPU / memory / disk?
       ↓
Database / API / DNS dependencies?
       ↓
Fix → Validate → Monitor`,
      },
    ],
    followUps: [
      'RDP is not working either. How do you get into the VM?',
      'The port answers locally but not from another VM. What next?',
      'How would you make this failure page you before users report it?',
      'How do you find the root cause after a reboot "fixed" it?',
    ],
    tags: ['azure', 'windows server', 'vm', 'troubleshooting', 'powershell'],
  },
  {
    id: 'itv-repm1-23',
    level: 'intermediate',
    kind: 'open',
    prompt: 'If an application on a VM has dependencies, how do you make sure you update them?',
    probing:
      'Controlled change management for VM dependencies: inventory, compatibility, lower-environment testing, rollback and automation tooling.',
    answer: [
      "I don't update dependencies directly in production without checking the impact. I follow a controlled update and change-management process.",
      '**Example:** Suppose the application depends on:',
      '- .NET runtime\n- Java\n- IIS\n- Windows libraries\n- Database drivers\n- Third-party agents',
      '**How I handle it, step by step**',
      '**1. Identify the dependencies**',
      '- Check the application documentation and configuration\n- Check the installed software and versions\n- Review vulnerability and scanning reports',
      '**2. Check the required version**',
      '- Confirm which version the application supports\n- Check compatibility and release notes for breaking changes before upgrading',
      '**3. Test in a lower environment**',
      "I update the dependency in Dev first and run the application's unit and integration tests, then promote it through QA and UAT.",
      '**4. Take a backup and prepare a rollback plan**',
      '- VM backup or disk snapshot, where appropriate\n- Backup of the application configuration\n- Keep the previous dependency version/installer available',
      '**5. Raise a change request:** Document the dependency, current version, target version, impact, expected downtime and rollback plan, and get the required approval for production.',
      "**6. Update during the maintenance window:** Install the approved version using the organization's standard package or software-management tool, not an ad-hoc download.",
      '**7. Validate after the update**',
      'Then check the logs and test the application end to end.',
      '**8. Monitor, and roll back if required:** If the application starts failing after the update, I follow the rollback plan and restore the previous version or configuration.',
      '**Interview-ready answer:** "If a VM has application dependencies that need updating, I first identify the dependency and check its compatibility with the application. I don\'t upgrade it directly in production. I test the new version in Dev, QA and UAT with application and integration testing, prepare a backup and rollback plan, and raise a change request.',
      'After approval, I update the dependency during the maintenance window and validate the service, ports, logs and application functionality. Finally, I monitor the application and roll back if the update causes issues."',
      '**Key point:** In enterprise environments, updates should be **automated and standardized** rather than done manually on every VM:',
      '- **What**: Windows OS patches; **Tool**: Azure Update Manager\n- **What**: Application dependencies and configuration; **Tool**: Ansible, PowerShell DSC, SCCM / Intune\n- **What**: Application packaging and rollout; **Tool**: CI/CD pipelines\n- **What**: New VMs; **Tool**: A golden image (Azure Compute Gallery) that already has the approved versions',
    ],
    code: [
      {
        title: 'List installed packages and versions',
        language: 'powershell',
        code: `Get-Package | Sort-Object Name | Select-Object Name, Version`,
      },
      {
        title: 'Promotion through environments',
        language: 'text',
        code: `Dev → QA → UAT → Production`,
      },
      {
        title: 'Validate the service and dependencies',
        language: 'powershell',
        code: `Get-Service <service-name>
Test-NetConnection <dependency> -Port <port>`,
      },
    ],
    tags: ['azure', 'vm', 'patching', 'change management'],
  },
  {
    id: 'itv-repm1-24',
    level: 'intermediate',
    kind: 'open',
    prompt: 'How does a Layer 4 load balancer distribute traffic?',
    probing:
      'Flow-based 5-tuple hashing, session persistence modes, pass-through behaviour, health probes, and how L4 differs from L7.',
    answer: [
      "Layer 4 (L4) load balancing works at the **TCP/UDP** level. It makes routing decisions using the connection's flow information:",
      '- Source IP\n- Destination IP\n- Source port\n- Destination port\n- Protocol (TCP/UDP)',
      'It does **not** inspect the HTTP URL, headers, cookies or application content like a Layer 7 load balancer does.',
      'Azure Load Balancer has:',
      '- **Component**: Frontend IP; **Purpose**: The public or private IP clients connect to\n- **Component**: Backend pool; **Purpose**: VM1, VM2, VM3\n- **Component**: Load-balancing rule; **Purpose**: Maps frontend port 443 → backend port 443\n- **Component**: Health probe; **Purpose**: Decides which backend instances are healthy (see Q19)',
      'When a new connection arrives, the load balancer picks a healthy backend and forwards the flow. All packets of the same connection go to the same backend.',
      '**It is hash-based, not strict round-robin:** Azure Load Balancer uses a **5-tuple hash** (source IP, source port, destination IP, destination port, protocol) by default. So distribution is not a strict VM1 → VM2 → VM3 round-robin sequence.',
      'If the application needs a client to keep hitting the same VM, I change the **session persistence** on the rule:',
      '- **Mode**: None (default); **Hash**: 5-tuple; **Effect**: Each new connection can land on any VM\n- **Mode**: Client IP; **Hash**: 2-tuple (source IP, destination IP); **Effect**: Same client IP → same VM\n- **Mode**: Client IP and protocol; **Hash**: 3-tuple (+ protocol); **Effect**: Same client IP and protocol → same VM',
      "Azure Load Balancer is also **pass-through**: it doesn't terminate the TCP or TLS connection, so the backend sees the original client IP and handles TLS itself.",
      'The load balancer stops sending **new** connections to VM2 and sends them to the healthy instances.',
      '**Interview-ready answer:** "At Layer 4, the load balancer distributes traffic based on TCP/UDP connection information such as source IP, destination IP, source port, destination port and protocol. It doesn\'t inspect application-level information like HTTP URLs or headers.',
      'In Azure Load Balancer, I configure a frontend IP, a backend pool, a load-balancing rule and a health probe. When a client connects to the frontend IP, the load balancer uses a hash of the flow to pick a healthy backend and forwards the connection to it. If a backend fails the health probe, new connections are not sent to it. If the application needs stickiness, I set session persistence to client IP."',
      '**L4 vs. L7 load balancing**',
      "- **Layer 4**: TCP/UDP; **Layer 7**: HTTP/HTTPS\n- **Layer 4**: IP + port based; **Layer 7**: URL, header, host and cookie based\n- **Layer 4**: Doesn't understand application content; **Layer 7**: Understands application content\n- **Layer 4**: Pass-through, no TLS termination; **Layer 7**: Can terminate TLS, do path-based routing and WAF\n- **Layer 4**: Azure Load Balancer; **Layer 7**: Azure Application Gateway / Front Door\n- **Layer 4**: Very fast and simple; **Layer 7**: More application-aware",
      '**One-line answer:** "L4 load balancing distributes TCP/UDP connections across healthy backend servers based on network flow information, not HTTP application content."',
    ],
    code: [
      {
        title: 'Example: Azure Load Balancer on 443',
        language: 'text',
        code: `Client
   |
   | TCP :443
   ↓
Azure Load Balancer
   |
   ├── VM1 :443
   ├── VM2 :443
   └── VM3 :443`,
      },
      {
        title: 'Flows spread across VMs',
        language: 'text',
        code: `Client A ──→ Load Balancer ──→ VM1
Client B ──→ Load Balancer ──→ VM2
Client C ──→ Load Balancer ──→ VM3`,
      },
      {
        title: 'Health probe result',
        language: 'text',
        code: `VM1 → Healthy
VM2 → Unhealthy ❌
VM3 → Healthy`,
      },
    ],
    tags: ['load balancer', 'layer 4', 'azure', 'networking'],
  },
  {
    id: 'itv-repm1-25',
    level: 'intermediate',
    kind: 'open',
    prompt: 'How do you establish a connection between two VNets (VNet-to-VNet)?',
    probing:
      'VNet peering prerequisites (no overlap, both directions), NSG rules, global peering, non-transitivity and when to use a VPN gateway instead.',
    answer: [
      'The most common approach is **VNet Peering**.',
      '**Steps to set up VNet peering**',
      "**1. Make sure the address spaces don't overlap**",
      "Peering can't be created between VNets with overlapping address spaces.",
      '**2. Create the peering in both directions**',
      'Both sides must show the peering status as **Connected**.',
      '**3. Configure NSG / firewall rules:** For example, if an application in VNet-A needs to access PostgreSQL in VNet-B:',
      'Allow TCP 5432 only from the required source subnet or IP. The default NSG rule `AllowVnetInBound` already includes peered VNets, so in practice I add a tighter rule rather than relying on the default.',
      '**4. Verify connectivity**',
      '**If the VNets are in different regions:** Use **Global VNet Peering**.',
      "**If the VNets are in different subscriptions:** That's also supported (even across Entra ID tenants), as long as I have the required permissions, such as **Network Contributor**, on both VNets.",
      '**Important: peering is not transitive**',
      'VNet-A **cannot** reach VNet-C through VNet-B automatically. For that I either peer A and C directly, or use a **hub-and-spoke** design where traffic is routed through Azure Firewall or an NVA in the hub, or use **Azure Virtual WAN**.',
      '**Interview-ready answer:** "To connect two Azure VNets, I normally use VNet Peering. First, I make sure the address spaces don\'t overlap. Then I create the peering in both directions, configure the required NSG and firewall rules, and verify connectivity between the required subnets or resources.',
      "If the VNets are in different regions, I use Global VNet Peering. Peering isn't transitive, so if I need transitive connectivity across many VNets or hybrid connectivity with on-premises, I'd use a hub-and-spoke architecture with Azure Firewall or an NVA, or Azure Virtual WAN.\"",
      '**Follow-up: "Why not VPN?"**',
      "- **Option**: VNet Peering; **When to use**: Preferred for direct VNet-to-VNet connectivity. Traffic stays on the Microsoft backbone with low latency and high bandwidth, and no gateway is needed\n- **Option**: VNet-to-VNet VPN; **When to use**: Uses VPN gateways and IPsec tunnels. Useful when encrypted tunnels are specifically required or peering isn't suitable, but it's limited by gateway bandwidth and adds cost\n- **Option**: Virtual WAN; **When to use**: Large-scale hub-and-spoke connectivity across many VNets, branches and on-premises sites",
      '**One-line answer:** "For normal VNet-to-VNet connectivity, I use VNet Peering; for cross-region connectivity, Global VNet Peering."',
    ],
    code: [
      {
        title: 'Example: two peered VNets',
        language: 'text',
        code: `VNet-A                         VNet-B
10.0.0.0/16                    10.1.0.0/16
    |                              |
    |------- VNet Peering ---------|`,
      },
      {
        title: 'Non-overlapping address spaces',
        language: 'text',
        code: `VNet-A → 10.0.0.0/16
VNet-B → 10.1.0.0/16`,
      },
      {
        title: 'Peering in both directions',
        language: 'text',
        code: `VNet-A → VNet-B
VNet-B → VNet-A`,
      },
      {
        title: 'Create the peering with the Azure CLI',
        language: 'bash',
        code: `az network vnet peering create \\
  --resource-group rg-a \\
  --vnet-name vnet-a \\
  --name vnet-a-to-vnet-b \\
  --remote-vnet <vnet-b-resource-id> \\
  --allow-vnet-access

az network vnet peering create \\
  --resource-group rg-b \\
  --vnet-name vnet-b \\
  --name vnet-b-to-vnet-a \\
  --remote-vnet <vnet-a-resource-id> \\
  --allow-vnet-access`,
      },
      {
        title: 'Allow TCP 5432 from VNet-A',
        language: 'text',
        code: `VNet-A VM
   |
   | TCP 5432
   ↓
VNet-B PostgreSQL`,
      },
      {
        title: 'Verify connectivity from Windows',
        language: 'powershell',
        code: `Test-NetConnection 10.1.2.10 -Port 5432`,
      },
      {
        title: 'Verify connectivity from Linux',
        language: 'bash',
        code: `nc -zv 10.1.2.10 5432`,
      },
      {
        title: 'Global VNet Peering',
        language: 'text',
        code: `VNet-A (East US)
       |
Global VNet Peering
       |
VNet-B (West Europe)`,
      },
      {
        title: 'Peering is not transitive',
        language: 'text',
        code: `VNet-A ↔ VNet-B ↔ VNet-C`,
      },
    ],
    tags: ['azure', 'vnet peering', 'networking', 'hub and spoke'],
  },
  {
    id: 'itv-repm1-26',
    level: 'advanced',
    kind: 'scenario',
    prompt: 'Your team uses HTTP for the frontend and backend. How do you change it to HTTPS?',
    probing:
      'Planning TLS end to end: certificates in Key Vault, listener and redirect at Application Gateway, backend HTTPS, mixed content and testing.',
    answer: [
      "I treat this as a **TLS termination and end-to-end encryption** change. It's not just changing `http` to `https`: I need to configure certificates, listeners, backend communication and application settings.",
      '**Typical Azure architecture**',
      "Note: Azure Load Balancer works at Layer 4 and is pass-through, so it can't terminate TLS. For TLS termination I use **Application Gateway** (or Front Door), or terminate on the application itself.",
      '**Steps I would follow**',
      "**1. Get a TLS certificate:** Use a certificate from a trusted CA, preferably stored and managed in **Azure Key Vault** or the organization's certificate-management solution. For example:",
      "The certificate's CN/SAN must match the hostname.",
      '**2. Configure HTTPS on the frontend**',
      'On Application Gateway:',
      'So users going to `http://app.company.com` are redirected to `https://app.company.com`.',
      'I also set an SSL policy that enforces **TLS 1.2 or higher**.',
      '**3. Enable HTTPS on the backend:** The backend application must listen on HTTPS, for example `https://api.company.com:443`, with its own certificate and TLS settings on the application server.',
      '**4. Change the frontend API configuration**',
      'If the frontend currently calls:',
      'This matters because a page loaded over HTTPS calling an HTTP API causes **mixed-content** errors in browsers. I also make sure cookies are marked `Secure`.',
      "**5. Configure backend certificate validation:** For Application Gateway to talk to the backend over HTTPS, I update the **backend settings** to use HTTPS on port 443 and make sure the hostname matches the backend certificate. If the backend certificate isn't from a well-known CA, I upload its trusted root certificate to Application Gateway.",
      '**6. Update NSG / firewall rules**',
      "Don't expose unnecessary ports.",
      '**7. Test before production**',
      '- Certificate validity and chain\n- TLS handshake and version/cipher requirements\n- HTTP → HTTPS redirect\n- Frontend → backend API calls\n- Authentication and callbacks (redirect URIs often need updating to `https://`)\n- WebSockets, if used\n- No mixed-content errors\n- Application logs',
      'Then deploy through the normal **Dev → QA → UAT → Production** process.',
      '**Interview-ready answer:** "If the frontend and backend are using HTTP, I\'d migrate them to HTTPS by first getting trusted TLS certificates, stored in Key Vault, and configuring HTTPS listeners. In Azure, I can use Application Gateway for TLS termination and redirect HTTP port 80 to HTTPS 443.',
      "For end-to-end encryption, I'd also configure HTTPS between Application Gateway and the backend. I'd update the frontend API URLs from HTTP to HTTPS, configure backend certificate validation, update NSG and firewall rules, and test the complete flow in lower environments before production.",
      "I'd make sure HTTP is either disabled or only used to redirect to HTTPS, and enforce TLS 1.2 or higher according to the organization's security standards.\"",
      '**Strong point to mention:** "Is SSL termination at Application Gateway enough?"',
      '"It\'s enough if encryption is only required from the client to Application Gateway. If the security requirement is end-to-end encryption, I\'ll configure HTTPS from Application Gateway to the backend as well."',
    ],
    code: [
      {
        title: 'Typical Azure HTTPS architecture',
        language: 'text',
        code: `User
  |
  | HTTPS :443
  ↓
Application Gateway
  |
  | HTTPS :443
  ↓
Frontend
  |
  | HTTPS :443
  ↓
Backend API
  |
  | TLS
  ↓
Database / external services`,
      },
      {
        title: 'Hostnames on the certificate',
        language: 'text',
        code: `app.company.com
api.company.com`,
      },
      {
        title: 'Application Gateway HTTPS listener',
        language: 'text',
        code: `HTTPS listener
Port: 443
Certificate: app.company.com (referenced from Key Vault)`,
      },
      {
        title: 'HTTP to HTTPS redirect',
        language: 'text',
        code: `HTTP :80  →  HTTPS :443`,
      },
      {
        title: 'Frontend API URL before',
        language: 'text',
        code: `http://api.company.com/api/payment`,
      },
      {
        title: 'Frontend API URL after',
        language: 'text',
        code: `https://api.company.com/api/payment`,
      },
      {
        title: 'NSG / firewall ports',
        language: 'text',
        code: `TCP 443 → allowed
TCP 80  → only for the redirect, if required`,
      },
    ],
    followUps: [
      'How does Application Gateway validate a backend certificate, and what changes for a self-signed one?',
      'How would you do this on AKS with an ingress controller and cert-manager?',
      'How do you enforce TLS 1.2 or higher and test it?',
      'How do you roll out HTTPS without downtime?',
    ],
    tags: ['tls', 'https', 'application gateway', 'key vault', 'certificates'],
  },
  {
    id: 'itv-repm1-27',
    level: 'advanced',
    kind: 'scenario',
    prompt: "If a certificate expires, how do you make sure it won't impact the application?",
    probing:
      'A monitor, renew, deploy, validate loop with Key Vault auto-renewal, versionless references, expiry alerts and a plan for an already-expired certificate.',
    answer: [
      "The goal is that a certificate **never** reaches its expiry date in production: renew and deploy it before it expires, and automate monitoring so it doesn't become an incident.",
      '**How I would handle it**',
      '**1. Monitor certificate expiry:** I keep an inventory and monitor certificates in:',
      '- Azure Key Vault\n- Application Gateway\n- App Service\n- Reverse proxies (NGINX, ingress controllers)\n- Windows / IIS servers',
      'I set alerts at, for example, **30, 15 and 7 days** before expiry. Key Vault publishes `CertificateNearExpiry` and `CertificateExpired` events to **Event Grid**, which I can route to email, Teams or a ticketing system.',
      '**2. Automate renewal:** For Key Vault certificates, I configure the **lifetime action** to auto-renew, for example 30 days before expiry. This works for self-signed certificates and CAs integrated with Key Vault (such as DigiCert and GlobalSign). For other CAs, renewal still needs the CSR to be signed and merged manually, so the alert is essential there.',
      '**3. Deploy the renewed certificate:** After renewal, I make sure the new certificate is actually being used by the component terminating TLS:',
      'If Application Gateway references the Key Vault secret **without a version**, it picks up the renewed certificate automatically (it polls Key Vault every 4 hours). If it references a specific version, or the certificate was uploaded manually, I have to update it myself.',
      '**4. Validate before expiry**',
      'Before expiry, I check:',
      '- Certificate expiry date\n- Certificate chain\n- Hostname / SAN\n- TLS handshake\n- Application availability',
      '**5. Have a rollback plan:** If the new certificate causes an issue (for example, a missing intermediate certificate), I can revert to the previous, still-valid certificate version.',
      '**If it has already expired**',
      "1. Renew or reissue the certificate immediately\n2. Import it into Key Vault (or the TLS endpoint) and update the listener or binding\n3. Validate with `curl` / `openssl` and confirm the application is working\n4. Do an RCA on why the alert didn't fire or wasn't acted on, and add the certificate to monitoring and auto-renewal",
      "**Interview-ready answer:** \"To make sure an expiring certificate doesn't impact the application, I don't wait for the expiry date. I monitor certificate expiry and configure alerts well in advance, typically at 30, 15 and 7 days. Where supported, I enable automatic renewal in Azure Key Vault.",
      "Once the certificate is renewed, I make sure it's deployed to the TLS termination point, such as Application Gateway, App Service or IIS. I validate the certificate chain, hostname, expiry date and HTTPS connectivity using tools like `curl` or `openssl`. I monitor the application after the change and keep a rollback plan.",
      'The key is: monitor → renew → deploy → validate → alert."',
      '**Follow-up: "How will you automate this?":** "I use Key Vault certificate auto-renewal where supported, with Event Grid and Azure Monitor alerts for near-expiry notifications. Services like Application Gateway reference the versionless Key Vault secret, so they pick up the renewed certificate automatically. For anything else, the pipeline deploys the renewed certificate to the TLS endpoint."',
      "**Important:** Renewing a certificate in Key Vault doesn't mean every consuming service is immediately using it. I always verify each service's certificate binding/reference and how it picks up renewals.",
    ],
    code: [
      {
        title: 'Renewed certificate deployment path',
        language: 'text',
        code: `New certificate
      ↓
Azure Key Vault
      ↓
Application Gateway
      ↓
HTTPS :443
      ↓
Application`,
      },
      {
        title: 'Validate the certificate before expiry',
        language: 'bash',
        code: `curl -Iv https://app.company.com

# Check the expiry dates directly
openssl s_client -connect app.company.com:443 -servername app.company.com </dev/null \\
  | openssl x509 -noout -dates -subject`,
      },
    ],
    followUps: [
      'How do you build an inventory of all certificates across the estate?',
      'What breaks if the intermediate certificate is missing after renewal?',
      'How would Event Grid and Azure Monitor alert on near-expiry events?',
      'How is this handled for Kubernetes ingress certificates?',
    ],
    tags: ['certificates', 'tls', 'key vault', 'monitoring', 'automation'],
  },
  {
    id: 'itv-repm1-28',
    level: 'basic',
    kind: 'open',
    prompt: 'How do you implement auto-shutdown for a VM?',
    probing:
      'Built-in Auto-shutdown versus scheduled automation for many VMs, and the billing difference between stopped and deallocated.',
    answer: [
      'The simplest approach is the built-in **Auto-shutdown** feature, or an automation-based schedule for many VMs.',
      '**Option 1: Azure VM Auto-shutdown**',
      'For an individual non-production VM, configure it in the Azure Portal:',
      'Or with the CLI (the time is in UTC, `HHMM`):',
      "Auto-shutdown **deallocates** the VM, so compute charges stop. It only shuts down; it doesn't start the VM again.",
      '**Option 2: Azure Automation / Logic Apps**',
      'For multiple VMs, I prefer centralized automation:',
      'For example, using tags:',
      'An Azure Automation runbook using a managed identity:',
      'A matching runbook can start the VMs in the morning. Microsoft also provides the **Start/Stop VMs v2** solution, which does this with schedules and tags out of the box.',
      '**Stop vs. deallocate**',
      '- **Command**: `az vm stop` / shutdown from inside the OS; **Result**: Stopped; **Compute billing**: **Still billed**\n- **Command**: `az vm deallocate` / `Stop-AzVM` / portal Stop; **Result**: Stopped (deallocated); **Compute billing**: Not billed',
      'Disks are still billed in both cases.',
      '**Important point:** I would not automatically shut down **production** VMs unless there is an explicit business requirement.',
      'This can significantly reduce compute costs (see Q11).',
      '**Interview-ready answer:** "For Azure VMs, I can configure the built-in Auto-shutdown feature for individual development or test VMs. If there are many VMs, I prefer centralized automation using Azure Automation runbooks, Logic Apps or the Start/Stop VMs solution. I use tags such as `Environment=Dev` and `AutoShutdown=Yes` to identify which VMs to stop, and make sure they\'re deallocated so compute billing stops. I configure the correct timezone and schedule, and exclude production VMs unless there\'s a specific requirement."',
    ],
    code: [
      {
        title: 'Auto-shutdown in the Azure Portal',
        language: 'text',
        code: `VM
 ↓
Operations
 ↓
Auto-shutdown
 ↓
Enable
 ↓
Set shutdown time and timezone
 ↓
(Optional) Notification before shutdown`,
      },
      {
        title: 'Auto-shutdown with the Azure CLI',
        language: 'bash',
        code: `az vm auto-shutdown \\
  --resource-group my-rg \\
  --name dev-vm \\
  --time 2000 \\
  --email "team@company.com"`,
      },
      {
        title: 'Example schedule for a Dev VM',
        language: 'text',
        code: `Dev VM
  ↓
Auto-shutdown
  ↓
Every day at 8:00 PM`,
      },
      {
        title: 'Centralized automation flow',
        language: 'text',
        code: `Azure Automation / Logic App
          ↓
Scheduled trigger
          ↓
Find tagged VMs
          ↓
Stop (deallocate) VMs`,
      },
      {
        title: 'Tags that select VMs',
        language: 'text',
        code: `Environment  = Dev
AutoShutdown = Yes`,
      },
      {
        title: 'Runbook: deallocate tagged VMs',
        language: 'powershell',
        code: `Connect-AzAccount -Identity

Get-AzVM -Status |
  Where-Object { $_.Tags['AutoShutdown'] -eq 'Yes' -and $_.PowerState -eq 'VM running' } |
  ForEach-Object {
      Stop-AzVM -ResourceGroupName $_.ResourceGroupName -Name $_.Name -Force -NoWait
  }`,
      },
      {
        title: 'Dev/QA working-hours schedule',
        language: 'text',
        code: `Start → 8:00 AM
        ↓
Run during working hours
        ↓
Shutdown → 8:00 PM`,
      },
    ],
    tags: ['azure', 'vm', 'auto-shutdown', 'cost', 'automation'],
  },
  {
    id: 'itv-repm1-29',
    level: 'basic',
    kind: 'open',
    prompt: 'Can we do cron scheduling in a VM?',
    probing:
      'Crontab syntax inside a Linux VM, why an OS shutdown does not stop billing, managed identity for az CLI, and Task Scheduler on Windows.',
    answer: [
      'Yes. Inside a **Linux** Azure VM, cron works exactly as it does on an on-prem Linux server.',
      '**Example: the crontab fields**',
      'Run a script every day at 8 PM:',
      '- **Field**: Minute; **Value**: `0`; **Meaning**: At minute 0\n- **Field**: Hour; **Value**: `20`; **Meaning**: At 8 PM\n- **Field**: Day of month; **Value**: `*`; **Meaning**: Every day\n- **Field**: Month; **Value**: `*`; **Meaning**: Every month\n- **Field**: Day of week; **Value**: `*`; **Meaning**: Every day of the week',
      '**Shutting down the VM from cron**',
      'This shuts down the **operating system**, but Azure still shows the VM as Stopped, not Stopped (deallocated), so compute is **still billed** (see Q28).',
      '**Better approach for an Azure VM:** If the goal is to deallocate the VM to save cost, I prefer Azure-native scheduling (Auto-shutdown, Azure Automation or Logic Apps) rather than an OS-level cron job.',
      "If cron must be used, it can call the Azure CLI with the VM's **managed identity**:",
      'This approach requires:',
      '- A system-assigned managed identity on the VM\n- A role such as **Virtual Machine Contributor**, scoped only to that VM\n- Full paths in the crontab, because cron runs with a minimal `PATH`',
      '**Interview-ready answer:** "Yes, we can use cron inside a Linux Azure VM for OS-level tasks such as scripts, log cleanup, backups or scheduled jobs. For Azure resource operations like starting or deallocating the VM, I\'d prefer Azure-native scheduling such as Auto-shutdown, Azure Automation or Logic Apps, because shutting down the OS from cron doesn\'t deallocate the VM. If I do use cron with the Azure CLI, I authenticate with a managed identity instead of storing credentials on the VM."',
      '**Important:** For a **Windows** Azure VM, the equivalent of cron is **Task Scheduler**:',
    ],
    code: [
      {
        title: 'Edit the crontab',
        language: 'bash',
        code: `# Edit the crontab
crontab -e`,
      },
      {
        title: 'Run a script every day at 8 PM',
        language: 'text',
        code: `0 20 * * * /path/to/script.sh`,
      },
      {
        title: 'Shut down the OS from cron',
        language: 'text',
        code: `0 20 * * * /sbin/shutdown -h now`,
      },
      {
        title: 'Deallocate the VM from cron with managed identity',
        language: 'text',
        code: `0 20 * * * /usr/bin/az login --identity && /usr/bin/az vm deallocate --resource-group my-rg --name my-vm >> /var/log/vm-deallocate.log 2>&1`,
      },
      {
        title: 'Windows Task Scheduler equivalent',
        language: 'powershell',
        code: `$action  = New-ScheduledTaskAction -Execute "powershell.exe" -Argument "-File C:\\scripts\\cleanup.ps1"
$trigger = New-ScheduledTaskTrigger -Daily -At 8pm
Register-ScheduledTask -TaskName "DailyCleanup" -Action $action -Trigger $trigger -User "SYSTEM"`,
      },
    ],
    tags: ['linux', 'cron', 'azure', 'vm', 'scheduling'],
  },
  {
    id: 'itv-repm1-30',
    level: 'advanced',
    kind: 'scenario',
    prompt: 'How do you remediate access to a Windows Azure server?',
    probing:
      'Finding every access path (RBAC, local accounts, RDP exposure), applying least privilege with PIM/JIT and Bastion, rotating credentials and reviewing logs.',
    answer: [
      'If there is unauthorized or excessive access to a Windows Azure VM, I remediate it using **identity, network and least-privilege** controls.',
      '**1. Identify who currently has access:** I check every path into the VM:',
      '- Azure RBAC assignments on the VM, resource group and subscription\n- Microsoft Entra ID users and groups\n- Local Windows users and groups\n- NSG rules allowing RDP\n- Just-in-time (JIT) access, if enabled',
      '`--include-inherited` matters, because most access usually comes from the resource group or subscription, not the VM itself.',
      '**2. Remove unnecessary Azure permissions:** If someone has excessive permissions such as Contributor, I replace them with the minimum required role (see Q14):',
      'Note that **Virtual Machine Contributor** can run Run Command and VM extensions, which means it can effectively get admin rights inside the OS, so I treat it as a privileged role.',
      'For production, I use **Microsoft Entra ID + PIM** for time-bound, approved access instead of permanent admin assignments.',
      'If the VM uses Entra ID login, OS access is controlled by the **Virtual Machine Administrator Login** and **Virtual Machine User Login** roles, so I review those too.',
      "**3. Secure RDP:** Don't expose RDP (3389) to the internet.",
      'To restrict RDP instead, I use:',
      "- NSG rules restricted to specific source IPs\n- **Azure Bastion**, so the VM doesn't need a public IP at all\n- VPN or ExpressRoute\n- **Just-in-time VM access** (Defender for Cloud), which opens 3389 only for a requested time window and source IP",
      '**4. Remove unnecessary local accounts**',
      '**5. Check and rotate credentials:** If credentials may have been compromised:',
      '- Disable or reset the affected account\n- Rotate passwords, including the local admin password (`az vm user update` or Windows LAPS)\n- Rotate service account credentials\n- Review stored credentials and scripts on the server\n- Prefer managed identities over passwords where possible',
      '**6. Review the logs**',
      '- Azure Activity Log (who changed RBAC, NSGs, ran Run Command or reset passwords)\n- Microsoft Entra sign-in logs\n- Windows Security event log',
      '- **Event ID**: 4624; **Meaning**: Successful logon (logon type 10 = RDP)\n- **Event ID**: 4625; **Meaning**: Failed logon\n- **Event ID**: 4672; **Meaning**: Logon with admin privileges\n- **Event ID**: 4720 / 4732; **Meaning**: User account created / added to a local group',
      'I look for suspicious successful or failed logins, logins at unusual times or from unexpected IPs, and newly created accounts.',
      '**Interview-ready answer:** "If I find excessive or unauthorized access to a Windows Azure VM, I first identify how users are getting access: Azure RBAC, Entra ID, local Windows accounts or RDP. I remove unnecessary RBAC permissions and follow least privilege, and for production I use PIM and JIT access instead of permanent admin access.',
      'I restrict RDP using NSGs, VPN or Azure Bastion instead of exposing port 3389 to the internet. On the VM, I review local users and the Administrators group and remove unauthorized accounts. If credentials are compromised, I disable the account and rotate the credentials. Finally, I review the Azure Activity Log, Entra sign-in logs and Windows Security logs to find out whether the access was actually misused."',
      '**Strong one-line answer:** "I remediate access using least privilege with Entra ID and RBAC, PIM/JIT, restricted RDP through Bastion or VPN, removal of unnecessary local admins, credential rotation, and log auditing."',
    ],
    code: [
      {
        title: 'Role assignments including inherited',
        language: 'bash',
        code: `az role assignment list \\
  --scope <vm-resource-id> \\
  --include-inherited \\
  -o table`,
      },
      {
        title: 'Least-privilege role mapping',
        language: 'text',
        code: `Developer → Reader
Support   → Virtual Machine Contributor
Admin     → Appropriate privileged role, through PIM`,
      },
      {
        title: 'Bad: RDP open to the internet',
        language: 'text',
        code: `Internet → TCP 3389 → VM
Source: *`,
      },
      {
        title: 'Better: RDP through a private path',
        language: 'text',
        code: `Admin network / VPN / Bastion
        ↓
     TCP 3389
        ↓
       VM`,
      },
      {
        title: 'Review local users and administrators',
        language: 'powershell',
        code: `Get-LocalUser

# Who is in the local Administrators group?
Get-LocalGroupMember Administrators

# Remove unauthorized admins
Remove-LocalGroupMember -Group "Administrators" -Member "<user>"

# Disable an account that shouldn't be used
Disable-LocalUser -Name "<user>"`,
      },
    ],
    followUps: [
      'Why is Virtual Machine Contributor effectively admin on the VM?',
      'How does Just-in-Time VM access work with NSGs?',
      'Which Windows event IDs would you alert on, and where?',
      'How do you manage local administrator passwords at scale?',
    ],
    tags: ['azure', 'windows server', 'access control', 'rbac', 'security'],
  },
  {
    id: 'itv-repm1-31',
    level: 'advanced',
    kind: 'scenario',
    prompt:
      'A Docker image deployment takes 10 minutes. How do you reduce it to 5 minutes using ACI?',
    probing:
      'Measuring first, then cutting image pull and startup time: image size, multi-stage builds, base images, layer caching, ACR locality and app startup.',
    answer: [
      'First I identify **where** the 10 minutes is spent: image build, image push, image pull or container startup.',
      '**First, find the bottleneck**',
      '- Build and push times are in the CI/CD pipeline logs.\n- Pull and start times are in the ACI container events:',
      'The `Pulling` → `Pulled` → `Started` timestamps show how long the pull and startup took.',
      "ACI doesn't keep your image cached between deployments, so **every new container group pulls the full image**. That's why image size has a big impact on ACI deployment time.",
      '**1. Reduce the image size with a multi-stage build**',
      'Keep the build environment out of the runtime image:',
      'The final image contains only NGINX and the built files, not Node.js, the source code or `node_modules`.',
      '**2. Use a smaller base image**',
      'Where compatible, prefer:',
      'instead of full OS images. If the app can run on **Linux containers instead of Windows containers**, that alone can save several minutes, because Windows images are many GB.',
      '**3. Optimize the Docker layers**',
      'Put the files that change most often at the end:',
      "Dependencies are then reinstalled only when `package*.json` changes, not on every code change. In the pipeline, I also enable layer caching (for example, BuildKit `--cache-from` the previous image in ACR) so the build doesn't start from scratch each time.",
      '**4. Keep ACR close to ACI**',
      'Same region means a faster pull. If ACI runs in several regions, ACR Premium **geo-replication** keeps a copy of the image in each region.',
      "**5. Don't ship what isn't needed at runtime:** Remove:",
      '- Build tools\n- Source code not needed at runtime\n- Package manager caches\n- Debug tools\n- Test files',
      'Use a `.dockerignore`:',
      '**6. Use proper image tags**',
      'For deployments, use immutable version tags:',
      'rather than relying only on `myapp:latest`. This makes deployments predictable and rollbacks easy.',
      '**7. Check application startup:** If the container is pulled quickly but takes a long time to become ready, the problem is the application: slow initialization, warm-up tasks, migrations at startup, or waiting on a slow dependency.',
      '**Interview-ready answer:** "If an ACI deployment takes 10 minutes and the target is 5, I\'d first measure where the time goes: Docker build, ACR push, ACI image pull or application startup. ACI pulls the full image for every new container group, so if the pull is the bottleneck, I reduce the image size using multi-stage builds, lightweight base images and `.dockerignore`, and keep ACR in the same region as ACI.',
      "I'd also optimize the Docker layers and use pipeline layer caching to speed up the build, and use versioned image tags. If the application startup is slow, I'd investigate initialization and dependency calls. I wouldn't blindly add more CPU or memory, because the real bottleneck needs to be identified first.\"",
      '**Very important interview point:** If they specifically say "using ACI", don\'t claim ACI itself magically makes the deployment twice as fast. Say:',
      '"ACI is the runtime. To reduce deployment time, I optimize the image pull and startup path: mainly image size, ACR locality and application initialization."',
    ],
    code: [
      {
        title: 'Where the deployment time goes',
        language: 'text',
        code: `Build → Push to ACR → ACI pulls image → Container starts
  ?          ?               ?                 ?`,
      },
      {
        title: 'ACI container events',
        language: 'bash',
        code: `az container show \\
  --resource-group my-rg \\
  --name my-app \\
  --query "containers[0].instanceView.events" \\
  -o table`,
      },
      {
        title: 'Image size and layer sizes',
        language: 'bash',
        code: `# How big is the image, and which layers are the largest?
docker image ls myapp
docker history myapp:v1.2.3`,
      },
      {
        title: 'Multi-stage Dockerfile',
        language: 'dockerfile',
        code: `FROM node:22 AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM nginx:alpine
COPY --from=build /app/dist /usr/share/nginx/html`,
      },
      {
        title: 'Smaller base images',
        language: 'text',
        code: `node:22-alpine
nginx:alpine
python:3.12-slim`,
      },
      {
        title: 'Dependency layers before source code',
        language: 'dockerfile',
        code: `COPY package*.json ./
RUN npm ci

COPY . .`,
      },
      {
        title: 'ACR and ACI in the same region',
        language: 'text',
        code: `ACR (East US)
      ↓
ACI (East US)`,
      },
      {
        title: '.dockerignore',
        language: 'text',
        code: `.git
node_modules
*.log
.env
tests`,
      },
      {
        title: 'Immutable version tag',
        language: 'text',
        code: `myapp:v1.2.3`,
      },
    ],
    followUps: [
      'ACI is still slow after shrinking the image. Where do you look next?',
      'How does BuildKit or pipeline layer caching work across agents?',
      'When would you move this workload from ACI to Container Apps or AKS?',
      'How do you compare image sizes between two releases in the pipeline?',
    ],
    tags: ['docker', 'aci', 'acr', 'performance', 'ci/cd'],
  },
]
