import type { InterviewQuestion } from '../../../types'

/** Cognizant round: PromQL, Prometheus and Grafana on Kubernetes, Terraform for an Azure VM and VM prerequisites. */
export const roundsCognizantMonitoringTerraformQuestions: InterviewQuestion[] = [
  {
    id: 'itv-rcog-18',
    level: 'intermediate',
    kind: 'open',
    prompt: 'Write a sample PromQL query in Prometheus.',
    probing:
      'Writing real queries beyond `up`: `rate()` on counters, aggregation with `sum by`, an error-rate ratio, `histogram_quantile` for latency, Kubernetes pod and node metrics, and using a query in an alert rule.',
    answer: [
      'PromQL (Prometheus Query Language) is used to query the time-series metrics that Prometheus collects. We use it in the Prometheus UI, in Grafana dashboards, and in alert rules.',
      '**1. Basic queries:** `up` shows whether each target is up (1 = up, 0 = down). Filter with labels using `=`, `!=`, `=~` (regex) and `!~` (not regex).',
      '**2. Request rate (most common query):** counters such as `http_requests_total` only go up, so we use `rate()` to get the per-second rate over a time window.',
      '**3. Error rate percentage:** divide the rate of 5xx requests by the rate of all requests and multiply by 100.',
      '**4. Latency (95th percentile):** use `histogram_quantile(0.95, ...)` on the `_bucket` series of a histogram metric, keeping the `le` label in the aggregation.',
      '**5. Kubernetes and node examples:** pod CPU and memory from cAdvisor metrics, node CPU and disk from node-exporter, and Pod restarts from kube-state-metrics.',
      '**6. Using a query in an alert rule:** the same expression goes into `expr`, with `for` to require the condition to hold for a while before firing.',
      '**Common PromQL functions**',
      '- **`rate()`**: Per-second average rate of a counter over a window\n- **`irate()`**: Rate based on the last two samples (for fast-changing graphs)\n- **`increase()`**: Total increase of a counter over a window\n- **`sum by (label)`**: Add values and group by a label\n- **`avg`, `max`, `min`, `count`**: Other aggregations\n- **`histogram_quantile()`**: Percentiles (p90, p95, p99) from histograms\n- **`topk(5, ...)`**: Top 5 series, for example the 5 busiest pods',
      '**Interview-ready answer:** "PromQL is the query language of Prometheus. A simple query is `up`, which shows whether each target is up. For applications, I use `rate()` on counters, for example `sum by (service) (rate(http_requests_total[5m]))` to get requests per second for each service. For error rate, I divide the 5xx request rate by the total request rate and multiply by 100. For latency, I use `histogram_quantile(0.95, ...)` on the duration buckets. In Kubernetes, I query metrics like `container_cpu_usage_seconds_total` and `container_memory_working_set_bytes` to see pod CPU and memory. I use the same queries in Grafana panels and in Prometheus alert rules."',
    ],
    followUps: [
      'Why do you apply `rate()` before `sum()` and not the other way round?',
      'What is the difference between `rate()` and `irate()`, and which would you use in an alert?',
      'Why must the `le` label be kept when aggregating before `histogram_quantile()`?',
    ],
    traps: [
      'Querying a raw counter like `http_requests_total` and graphing it: it only ever goes up; you need `rate()` or `increase()`.',
      'Using a range window shorter than a few scrape intervals (for example `[30s]` with a 30s scrape): `rate()` returns gaps or nothing.',
    ],
    code: [
      {
        title: 'Basic queries',
        language: 'text',
        code: `# Is each target up? 1 = up, 0 = down
up

# Only the targets of one job
up{job="node-exporter"}

# Filter with labels (=, !=, =~ regex, !~ not regex)
http_requests_total{namespace="prod", status=~"5.."}`,
      },
      {
        title: 'Request rate, error rate and p95 latency',
        language: 'text',
        code: `# Requests per second over the last 5 minutes, per service
sum by (service) (rate(http_requests_total[5m]))

# Percentage of requests that returned 5xx errors
sum(rate(http_requests_total{status=~"5.."}[5m]))
/
sum(rate(http_requests_total[5m])) * 100

# p95 response time from a histogram metric
histogram_quantile(0.95,
  sum by (le, service) (rate(http_request_duration_seconds_bucket[5m]))
)`,
      },
      {
        title: 'Kubernetes and node examples',
        language: 'text',
        code: `# CPU used by each pod (in cores)
sum by (namespace, pod) (rate(container_cpu_usage_seconds_total{container!=""}[5m]))

# Memory used by each pod
sum by (namespace, pod) (container_memory_working_set_bytes{container!=""})

# Node CPU usage percentage
100 - (avg by (instance) (rate(node_cpu_seconds_total{mode="idle"}[5m])) * 100)

# Node disk space used percentage
100 - (node_filesystem_avail_bytes{mountpoint="/"} / node_filesystem_size_bytes{mountpoint="/"} * 100)

# Pods restarting in the last 1 hour
increase(kube_pod_container_status_restarts_total[1h]) > 0`,
      },
      {
        title: 'Using a query in an alert rule',
        language: 'yaml',
        code: `groups:
  - name: app-alerts
    rules:
      - alert: HighErrorRate
        expr: |
          sum(rate(http_requests_total{status=~"5.."}[5m]))
          / sum(rate(http_requests_total[5m])) * 100 > 5
        for: 10m
        labels:
          severity: critical
        annotations:
          summary: "Error rate is above 5% for 10 minutes"`,
      },
    ],
    tags: ['promql', 'prometheus', 'monitoring', 'grafana', 'alerting'],
  },
  {
    id: 'itv-rcog-19',
    level: 'intermediate',
    kind: 'open',
    prompt: 'Write sample Terraform code for a VM, VNet, NSG, NIC, etc.',
    probing:
      'Writing a complete, working azurerm configuration (provider, remote backend, RG, VNet, subnet, NSG and association, public IP, NIC, Linux VM), knowing how Terraform orders resources, and secure defaults like SSH keys and restricted SSH.',
    answer: [
      'This example creates a Linux VM in Azure with all the resources it needs: resource group, VNet, subnet, NSG, public IP, NIC, and the VM.',
      '**Folder structure:** `providers.tf` (provider and backend), `variables.tf`, `main.tf` (the resources), `outputs.tf`, and `terraform.tfvars` (the values for this environment).',
      '**providers.tf:** pins Terraform and the azurerm provider (4.x requires `subscription_id` in the provider block), and stores the state file in an Azure Storage Account backend.',
      '**main.tf, in order:** 1. resource group, 2. virtual network, 3. subnet, 4. NSG with SSH (restricted to your IP) and HTTP rules, 5. NSG associated with the subnet, 6. public IP (optional, skip it for a private VM), 7. NIC in the subnet, 8. the Linux VM with size, SSH key, OS disk and Ubuntu image.',
      '**Commands to run:** `az login`, then `terraform init`, `fmt`, `validate`, `plan -out=tfplan`, `apply tfplan`, and `destroy` when the VM is no longer needed.',
      '**Points to mention**',
      '- Terraform creates resources in the right order using **implicit dependencies** (for example the NIC references `azurerm_subnet.subnet.id`, so the subnet is created first).\n- The NSG can be attached to the **subnet** (as above) or to the **NIC** with `azurerm_network_interface_security_group_association`.\n- Use an **SSH key** instead of a password, and never hardcode secrets; read them from Key Vault or pipeline variables.\n- Restrict SSH to a known IP, or remove the public IP and use **Azure Bastion**.\n- In real projects, put this in a reusable **module** and call it for dev, test, and prod with different `.tfvars` files.',
      '**Interview-ready answer:** "To create a VM in Azure with Terraform, I first configure the azurerm provider and a remote backend in an Azure Storage Account for the state file. Then I create a resource group, a VNet with a subnet, an NSG with inbound rules for SSH and HTTP, and associate the NSG with the subnet. I create a public IP if needed, a NIC connected to the subnet, and finally the `azurerm_linux_virtual_machine` with the NIC, size, SSH key, OS disk, and image. Terraform handles the creation order through resource references. I run init, validate, plan, and apply, usually from an Azure DevOps pipeline, and I keep the code in a module so I can reuse it for each environment."',
    ],
    followUps: [
      'How would you turn this into a module and deploy it to dev, test and prod?',
      'How do you protect the state file and stop two pipelines from writing to it at once?',
      'How would you create three identical VMs without copying the resource blocks?',
    ],
    traps: [
      'Opening SSH (22) to `*` from the internet: restrict it to a known IP or use Bastion with no public IP.',
      'Keeping the state file locally or in Git: it can contain secrets and cannot be shared or locked; use a remote backend.',
    ],
    code: [
      {
        title: 'Folder structure',
        language: 'text',
        code: `azure-vm/
├── providers.tf
├── variables.tf
├── main.tf
├── outputs.tf
└── terraform.tfvars`,
      },
      {
        title: 'providers.tf',
        language: 'hcl',
        code: `terraform {
  required_version = ">= 1.5.0"

  required_providers {
    azurerm = {
      source  = "hashicorp/azurerm"
      version = "~> 4.0"
    }
  }

  # Store the state file in an Azure Storage Account
  backend "azurerm" {
    resource_group_name  = "rg-tfstate"
    storage_account_name = "sttfstate001"
    container_name       = "tfstate"
    key                  = "dev/vm.tfstate"
  }
}

provider "azurerm" {
  features {}
  subscription_id = var.subscription_id
}`,
      },
      {
        title: 'variables.tf',
        language: 'hcl',
        code: `variable "subscription_id" {
  type = string
}

variable "location" {
  type    = string
  default = "eastus"
}

variable "prefix" {
  type    = string
  default = "demo"
}

variable "vm_size" {
  type    = string
  default = "Standard_B2s"
}

variable "admin_username" {
  type    = string
  default = "azureuser"
}

variable "ssh_public_key_path" {
  type    = string
  default = "~/.ssh/id_rsa.pub"
}

variable "allowed_ssh_ip" {
  description = "Your public IP in CIDR format, for example 203.0.113.10/32"
  type        = string
}`,
      },
      {
        title: 'main.tf',
        language: 'hcl',
        code: `# 1. Resource group
resource "azurerm_resource_group" "rg" {
  name     = "rg-\${var.prefix}"
  location = var.location
}

# 2. Virtual network
resource "azurerm_virtual_network" "vnet" {
  name                = "vnet-\${var.prefix}"
  address_space       = ["10.0.0.0/16"]
  location            = azurerm_resource_group.rg.location
  resource_group_name = azurerm_resource_group.rg.name
}

# 3. Subnet
resource "azurerm_subnet" "subnet" {
  name                 = "snet-\${var.prefix}"
  resource_group_name  = azurerm_resource_group.rg.name
  virtual_network_name = azurerm_virtual_network.vnet.name
  address_prefixes     = ["10.0.1.0/24"]
}

# 4. Network security group with rules
resource "azurerm_network_security_group" "nsg" {
  name                = "nsg-\${var.prefix}"
  location            = azurerm_resource_group.rg.location
  resource_group_name = azurerm_resource_group.rg.name

  security_rule {
    name                       = "Allow-SSH"
    priority                   = 100
    direction                  = "Inbound"
    access                     = "Allow"
    protocol                   = "Tcp"
    source_port_range          = "*"
    destination_port_range     = "22"
    source_address_prefix      = var.allowed_ssh_ip
    destination_address_prefix = "*"
  }

  security_rule {
    name                       = "Allow-HTTP"
    priority                   = 110
    direction                  = "Inbound"
    access                     = "Allow"
    protocol                   = "Tcp"
    source_port_range          = "*"
    destination_port_range     = "80"
    source_address_prefix      = "*"
    destination_address_prefix = "*"
  }
}

# 5. Attach the NSG to the subnet
resource "azurerm_subnet_network_security_group_association" "subnet_nsg" {
  subnet_id                 = azurerm_subnet.subnet.id
  network_security_group_id = azurerm_network_security_group.nsg.id
}

# 6. Public IP (optional - skip it for a private VM)
resource "azurerm_public_ip" "pip" {
  name                = "pip-\${var.prefix}"
  location            = azurerm_resource_group.rg.location
  resource_group_name = azurerm_resource_group.rg.name
  allocation_method   = "Static"
  sku                 = "Standard"
}

# 7. Network interface
resource "azurerm_network_interface" "nic" {
  name                = "nic-\${var.prefix}"
  location            = azurerm_resource_group.rg.location
  resource_group_name = azurerm_resource_group.rg.name

  ip_configuration {
    name                          = "internal"
    subnet_id                     = azurerm_subnet.subnet.id
    private_ip_address_allocation = "Dynamic"
    public_ip_address_id          = azurerm_public_ip.pip.id
  }
}

# 8. Linux virtual machine
resource "azurerm_linux_virtual_machine" "vm" {
  name                  = "vm-\${var.prefix}"
  resource_group_name   = azurerm_resource_group.rg.name
  location              = azurerm_resource_group.rg.location
  size                  = var.vm_size
  admin_username        = var.admin_username
  network_interface_ids = [azurerm_network_interface.nic.id]

  admin_ssh_key {
    username   = var.admin_username
    public_key = file(var.ssh_public_key_path)
  }

  os_disk {
    name                 = "osdisk-\${var.prefix}"
    caching              = "ReadWrite"
    storage_account_type = "Standard_LRS"
  }

  source_image_reference {
    publisher = "Canonical"
    offer     = "0001-com-ubuntu-server-jammy"
    sku       = "22_04-lts-gen2"
    version   = "latest"
  }

  tags = {
    environment = "dev"
  }
}`,
      },
      {
        title: 'outputs.tf',
        language: 'hcl',
        code: `output "vm_public_ip" {
  value = azurerm_public_ip.pip.ip_address
}

output "vm_private_ip" {
  value = azurerm_network_interface.nic.private_ip_address
}`,
      },
      {
        title: 'terraform.tfvars',
        language: 'hcl',
        code: `subscription_id = "00000000-0000-0000-0000-000000000000"
prefix          = "demo"
location        = "eastus"
allowed_ssh_ip  = "203.0.113.10/32"`,
      },
      {
        title: 'Commands to run',
        language: 'bash',
        code: `az login
terraform init        # download provider, configure backend
terraform fmt         # format the code
terraform validate    # check syntax
terraform plan -out=tfplan
terraform apply tfplan
terraform destroy     # remove everything when not needed`,
      },
    ],
    tags: ['terraform', 'azure vm', 'azurerm', 'networking', 'iac'],
  },
  {
    id: 'itv-rcog-20',
    level: 'intermediate',
    kind: 'open',
    prompt: 'How do you integrate Prometheus and Grafana with Kubernetes?',
    probing:
      'Installing kube-prometheus-stack with a values file, knowing what each component does, scraping apps with ServiceMonitor, alerting with PrometheusRule and Alertmanager, and the AKS managed alternative.',
    answer: [
      'The easiest and most common way is to install the **kube-prometheus-stack** Helm chart. It installs everything needed for monitoring a Kubernetes cluster in one go.',
      '**What kube-prometheus-stack installs**',
      '- **Prometheus Operator**: Manages Prometheus and its config using Kubernetes CRDs\n- **Prometheus**: Scrapes and stores metrics\n- **Alertmanager**: Sends alerts to email, Slack, Teams, PagerDuty\n- **Grafana**: Dashboards (Prometheus is already added as a data source)\n- **node-exporter**: Node metrics: CPU, memory, disk, network (runs as a DaemonSet)\n- **kube-state-metrics**: Kubernetes object metrics: pods, deployments, restarts, replicas\n- **Default dashboards and alert rules**: Ready-made views for cluster, nodes, pods',
      '**Step 1: Install with Helm** into a `monitoring` namespace with a values file.',
      '**Step 2: Sample values file:** retention, persistent storage for Prometheus, `serviceMonitorSelectorNilUsesHelmValues: false` so ServiceMonitors from all namespaces are picked up, the Grafana admin password from an existing Secret (not in Git), Grafana persistence and an Ingress.',
      '**Step 3: Verify and access:** check the Pods, then port-forward Grafana and Prometheus. Open `http://localhost:3000`. Grafana already has Prometheus as a data source and comes with dashboards such as "Kubernetes / Compute Resources / Namespace (Pods)". You can also import community dashboards by ID (for example **1860** for Node Exporter Full).',
      '**Step 4: Monitor your own application:** the application exposes metrics on a `/metrics` endpoint (using a Prometheus client library). Then create a **ServiceMonitor** so Prometheus scrapes it automatically. Check in Prometheus under **Status > Targets** that the app target is `UP`.',
      '**Step 5: Alerts:** add alert rules with a **PrometheusRule** resource and configure Alertmanager receivers (Teams, Slack, email).',
      '**Managed option on AKS:** we can also use **Azure Monitor managed service for Prometheus** with **Azure Managed Grafana**, so we do not run Prometheus and Grafana ourselves.',
      '**Interview-ready answer:** "I integrate Prometheus and Grafana with Kubernetes using the kube-prometheus-stack Helm chart. It installs the Prometheus Operator, Prometheus, Alertmanager, Grafana, node-exporter, and kube-state-metrics, along with default dashboards and alert rules. I keep the settings in a values file, for example retention, persistent storage, and the Grafana ingress, and store the Grafana admin password in a secret. For application metrics, the app exposes a `/metrics` endpoint and I create a ServiceMonitor so Prometheus discovers and scrapes it. Grafana already has Prometheus as a data source, so I build or import dashboards, and I define PrometheusRules with Alertmanager sending alerts to Teams or Slack. On AKS, another option is Azure Managed Prometheus with Azure Managed Grafana."',
    ],
    followUps: [
      'Your ServiceMonitor exists but the target never appears in Prometheus. What do you check?',
      'How would you keep metrics for a year without making Prometheus huge?',
      'When would you choose Azure Managed Prometheus over self-hosted kube-prometheus-stack?',
    ],
    traps: [
      'ServiceMonitor `selector` labels or the named `port` not matching the Service: Prometheus silently never scrapes the app.',
      'Running Prometheus without persistent storage: every Pod restart loses the metric history.',
    ],
    code: [
      {
        title: 'Install with Helm',
        language: 'bash',
        code: `helm repo add prometheus-community https://prometheus-community.github.io/helm-charts
helm repo update

kubectl create namespace monitoring

helm install monitoring prometheus-community/kube-prometheus-stack \\
  --namespace monitoring \\
  -f monitoring-values.yaml`,
      },
      {
        title: 'monitoring-values.yaml',
        language: 'yaml',
        code: `# monitoring-values.yaml
prometheus:
  prometheusSpec:
    retention: 15d
    # Pick up ServiceMonitors from all namespaces, not only this Helm release
    serviceMonitorSelectorNilUsesHelmValues: false
    storageSpec:
      volumeClaimTemplate:
        spec:
          storageClassName: managed-csi
          accessModes: ["ReadWriteOnce"]
          resources:
            requests:
              storage: 50Gi

grafana:
  admin:
    existingSecret: grafana-admin   # password kept in a secret, not in Git
  persistence:
    enabled: true
    size: 10Gi
  ingress:
    enabled: true
    ingressClassName: nginx
    hosts:
      - grafana.example.com`,
      },
      {
        title: 'Verify and access',
        language: 'bash',
        code: `kubectl get pods -n monitoring

# Access Grafana locally
kubectl port-forward svc/monitoring-grafana 3000:80 -n monitoring

# Access Prometheus locally
kubectl port-forward svc/monitoring-kube-prometheus-prometheus 9090:9090 -n monitoring`,
      },
      {
        title: 'ServiceMonitor for your application',
        language: 'yaml',
        code: `apiVersion: monitoring.coreos.com/v1
kind: ServiceMonitor
metadata:
  name: my-app
  namespace: my-app
spec:
  selector:
    matchLabels:
      app: my-app          # must match the labels on the app's Service
  endpoints:
    - port: http-metrics   # named port on the Service
      path: /metrics
      interval: 30s`,
      },
      {
        title: 'PrometheusRule alert',
        language: 'yaml',
        code: `apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: pod-alerts
  namespace: monitoring
spec:
  groups:
    - name: pods
      rules:
        - alert: PodCrashLooping
          expr: increase(kube_pod_container_status_restarts_total[15m]) > 3
          for: 5m
          labels:
            severity: warning
          annotations:
            summary: "Pod {{ $labels.pod }} is restarting frequently"`,
      },
      {
        title: 'Flow',
        language: 'text',
        code: `App /metrics, node-exporter, kube-state-metrics, kubelet/cAdvisor
        │  (scraped via ServiceMonitor / PodMonitor)
        ▼
   Prometheus (stores metrics, evaluates rules)
        │                      │
        ▼                      ▼
   Grafana (dashboards)   Alertmanager (Teams / Slack / email)`,
      },
      {
        title: 'Managed option on AKS',
        language: 'bash',
        code: `az aks update -g my-rg -n my-aks \\
  --enable-azure-monitor-metrics \\
  --azure-monitor-workspace-resource-id <azure-monitor-workspace-id> \\
  --grafana-resource-id <managed-grafana-id>`,
      },
    ],
    tags: ['prometheus', 'grafana', 'kubernetes', 'helm', 'monitoring', 'aks'],
  },
  {
    id: 'itv-rcog-21',
    level: 'basic',
    kind: 'open',
    prompt: 'What are the prerequisite resources needed to create an Azure VM?',
    probing:
      'Separating mandatory resources (subscription, RG, region, VNet, subnet, NIC, image, size, credentials, OS disk) from optional ones (NSG, public IP, data disks, zones, identity, backup), and the order they are created in.',
    answer: [
      'A VM in Azure depends on several other resources. Some are mandatory, some are optional.',
      '**Mandatory resources**',
      "- **Azure subscription**: Billing and access boundary for all resources\n- **Resource group**: Logical container that holds the VM and its related resources\n- **Region (location)**: Where the VM runs, for example East US\n- **Virtual network (VNet)**: Private network for the VM\n- **Subnet**: IP range inside the VNet where the VM's NIC gets its private IP\n- **Network interface (NIC)**: Connects the VM to the subnet; a VM cannot be created without at least one NIC\n- **OS disk**: Holds the operating system; created automatically from the image\n- **Image**: The OS to install, for example Ubuntu 22.04 or Windows Server 2022\n- **VM size**: CPU and memory, for example `Standard_B2s` or `Standard_D4s_v5`\n- **Admin credentials**: SSH key (Linux) or username and password (Windows)",
      '**Optional but recommended**',
      '- **Network security group (NSG)**: Firewall rules to allow or deny traffic (for example SSH 22, RDP 3389, HTTP 80); attached to the subnet or NIC\n- **Public IP**: Only if the VM must be reached from the internet; otherwise use Azure Bastion or VPN\n- **Data disks**: Extra storage for application data\n- **Availability zone / availability set**: High availability\n- **Boot diagnostics**: Screenshot and serial log to troubleshoot boot issues\n- **Key Vault**: Store passwords, keys, and disk encryption keys\n- **Managed identity**: Lets the VM access other Azure services without storing credentials\n- **Backup (Recovery Services vault)**: Regular VM backups',
      'In the Azure portal, many of these (VNet, subnet, NSG, public IP, NIC, disk) are created automatically on the VM creation screen. In Terraform or ARM/Bicep, we define each of them ourselves (see the Terraform VM question in this round).',
      '**Interview-ready answer:** "To create an Azure VM, I need a subscription, a resource group, and a region. For networking, I need a virtual network with a subnet and a network interface, because every VM needs at least one NIC. I also attach an NSG to the subnet or NIC to control inbound and outbound traffic, and I create a public IP only if the VM must be reachable from the internet, otherwise I use Bastion. For the VM itself, I choose the image, the size, and the admin credentials, preferably an SSH key, and Azure creates the OS disk. Optionally I add data disks, availability zones, boot diagnostics, a managed identity, Key Vault, and backup. The portal can create the network pieces automatically, but in Terraform I define each one explicitly."',
    ],
    code: [
      {
        title: 'Order of creation',
        language: 'text',
        code: `Subscription
  └── Resource group
        ├── VNet ── Subnet ── NSG (associated to subnet)
        ├── Public IP (optional)
        ├── NIC (in subnet, with public IP)
        └── VM (NIC + size + image + credentials + OS disk)`,
      },
      {
        title: 'Azure CLI example',
        language: 'bash',
        code: `az group create -n rg-demo -l eastus

az network vnet create -g rg-demo -n vnet-demo \\
  --address-prefix 10.0.0.0/16 \\
  --subnet-name snet-demo --subnet-prefix 10.0.1.0/24

az network nsg create -g rg-demo -n nsg-demo
az network nsg rule create -g rg-demo --nsg-name nsg-demo -n Allow-SSH \\
  --priority 100 --destination-port-ranges 22 --protocol Tcp --access Allow \\
  --source-address-prefixes 203.0.113.10/32

az network vnet subnet update -g rg-demo --vnet-name vnet-demo -n snet-demo \\
  --network-security-group nsg-demo

az network public-ip create -g rg-demo -n pip-demo --sku Standard

az network nic create -g rg-demo -n nic-demo \\
  --vnet-name vnet-demo --subnet snet-demo --public-ip-address pip-demo

az vm create -g rg-demo -n vm-demo \\
  --nics nic-demo --image Ubuntu2204 --size Standard_B2s \\
  --admin-username azureuser --generate-ssh-keys`,
      },
    ],
    tags: ['azure vm', 'azure networking', 'nsg', 'azure cli'],
  },
]
