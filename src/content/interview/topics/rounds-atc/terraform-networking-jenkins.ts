import type { InterviewQuestion } from '../../../types'

/** ATC round: Terraform, Azure load balancers and Jenkins questions. */
export const roundsAtcPlatformQuestions: InterviewQuestion[] = [
  {
    id: 'itv-ratc-9',
    level: 'advanced',
    kind: 'open',
    prompt: 'How do you authenticate Terraform to Azure?',
    probing:
      'The authentication options for the AzureRM provider, which one fits each context, and why federation or managed identity beats stored secrets.',
    answer: [
      'This is a very common interview question. The interviewer usually wants to know the different authentication methods and when you would use each.',
      '**Answer:** Terraform authenticates to Azure through the Azure Resource Manager (AzureRM) provider. There are multiple authentication methods.',
      '**1. Service Principal (most common in CI/CD)**',
      'This is the most common method in Azure DevOps, Jenkins, and GitHub Actions.',
      'Steps (Service Principal):',
      '1. Create a Service Principal.\n2. Assign required RBAC roles (Contributor, Reader, etc.).\n3. Configure Terraform using the Service Principal credentials.',
      'Terraform automatically reads these environment variables.',
      '**Interview point:** We use a Service Principal in CI/CD pipelines because it provides non-interactive authentication and follows least-privilege access.',
      '**2. Managed Identity (recommended for Azure-hosted workloads)**',
      'If Terraform runs on:',
      '- Azure VM\n- Azure VMSS\n- AKS\n- Azure Container Instance',
      'it can use a Managed Identity.',
      'No client secret is required.',
      '**Interview point:** Managed Identity is more secure because Azure manages credential rotation automatically, eliminating the need to store secrets.',
      '**3. Azure CLI authentication (developer machines)**',
      'Developers authenticate locally by logging in with Azure CLI.',
      '`az login` — Terraform automatically uses the Azure CLI session.',
      '**Interview point:** This is mainly used for local development and testing.',
      '**4. Workload Identity Federation (recommended for modern CI/CD)**',
      'Instead of storing client secrets, Terraform authenticates using OpenID Connect (OIDC) between the CI/CD platform and Azure.',
      'Supported platforms include:',
      '- Azure DevOps\n- GitHub Actions',
      'No secrets are stored.',
      "**Interview point:** This is Microsoft's recommended approach because it removes long-lived secrets and reduces the risk of credential leakage.",
      '**5. Azure DevOps Service Connection**',
      'In Azure DevOps, Terraform tasks commonly use an Azure Resource Manager Service Connection.',
      'The pipeline authenticates through the service connection, which can be backed by:',
      '- Service Principal (traditional)\n- Workload Identity Federation (recommended)',
      'No credentials need to be hardcoded in the Terraform code.',
      '**Which method should you use?**',
      '- **Local development**: Azure CLI (`az login`)\n- **Azure DevOps Pipeline**: Azure Resource Manager Service Connection (prefer Workload Identity Federation)\n- **GitHub Actions**: OIDC / Workload Identity Federation\n- **Azure VM or AKS**: Managed Identity\n- **Older CI/CD pipelines**: Service Principal with client secret',
      '**Interview answer (30 seconds)**',
      '"Terraform authenticates to Azure using the AzureRM provider. For local development, I use Azure CLI with `az login`. In CI/CD pipelines, I prefer an Azure DevOps Service Connection or Workload Identity Federation because it avoids storing secrets. If Terraform runs on Azure resources like VMs or AKS, I use Managed Identity. In older environments, Service Principals with RBAC permissions are also commonly used. The preferred approach today is Workload Identity Federation or Managed Identity because they eliminate the need to manage client secrets."',
    ],
    followUps: [
      'What does workload identity federation remove compared with a client secret?',
      'How does an Azure DevOps service connection feed credentials to Terraform?',
    ],
    code: [
      {
        title: 'Service principal environment variables',
        language: 'bash',
        code: `export ARM_CLIENT_ID=<client-id>
export ARM_CLIENT_SECRET=<client-secret>
export ARM_SUBSCRIPTION_ID=<subscription-id>
export ARM_TENANT_ID=<tenant-id>`,
      },
      {
        title: 'Provider using managed identity',
        language: 'hcl',
        code: `provider "azurerm" {
  features {}
  use_msi = true
}`,
      },
    ],
    tags: ['terraform', 'azure', 'authentication', 'oidc'],
  },
  {
    id: 'itv-ratc-10',
    level: 'intermediate',
    kind: 'open',
    prompt: 'What are provisioners in Terraform, and why are they discouraged?',
    probing:
      'local-exec, remote-exec and file, destroy-time provisioners, and the better alternatives such as cloud-init, extensions, Ansible and Packer.',
    answer: [
      'Provisioners in Terraform are used to execute scripts or commands after a resource is created or before it is destroyed.',
      'They are considered a last resort because they are not idempotent, can be unreliable, and make Terraform configurations harder to maintain. Whenever possible, prefer cloud-init, custom images, configuration management tools (Ansible, Chef, Puppet), or managed services.',
      '**Types of provisioners**',
      '**1. local-exec:** Runs a command on the machine where Terraform is executed, not on the created resource.',
      'Use cases (local-exec):',
      '- Send a notification\n- Update an inventory file\n- Call an external script\n- Trigger another automation',
      '**2. remote-exec:** Runs commands inside the created VM over SSH (Linux) or WinRM (Windows).',
      'Use cases (remote-exec):',
      '- Install packages\n- Configure software\n- Start services',
      '**3. file:** Copies files from the local machine to the remote resource.',
      '**Destroy provisioner**',
      'Runs commands before Terraform destroys a resource.',
      '**Why are provisioners discouraged?**',
      '- They are not fully tracked in Terraform state.\n- Failures can leave resources partially configured.\n- Re-running them consistently is difficult.\n- They mix infrastructure provisioning with configuration management.',
      'Instead, use (Why are provisioners discouraged?):',
      '- cloud-init for Linux VM initialization.\n- Azure VM Custom Script Extension when appropriate.\n- Ansible or similar tools for post-provisioning configuration.\n- Packer to build preconfigured machine images.',
      '**Interview answer (1 minute)**',
      '"Provisioners in Terraform execute scripts or commands after a resource is created or before it is destroyed. The three main provisioners are `local-exec`, which runs commands on the machine executing Terraform, `remote-exec`, which runs commands on the provisioned VM over SSH or WinRM, and `file`, which copies files to the remote machine. Although provisioners are useful for simple bootstrapping tasks, HashiCorp recommends avoiding them when possible because they are less reliable and not fully declarative. In production, I prefer cloud-init, Azure VM extensions, or Ansible for configuring resources after deployment."',
    ],
    code: [
      {
        title: 'local-exec — Example',
        language: 'hcl',
        code: `resource "azurerm_linux_virtual_machine" "vm" {
  # VM configuration

  provisioner "local-exec" {
    command = "echo VM Created Successfully"
  }
}`,
      },
      {
        title: 'remote-exec — Example',
        language: 'hcl',
        code: `resource "azurerm_linux_virtual_machine" "vm" {
  # VM configuration

  connection {
    type        = "ssh"
    host        = self.public_ip_address
    user        = "azureuser"
    private_key = file("id_rsa")
  }

  provisioner "remote-exec" {
    inline = [
      "sudo apt update",
      "sudo apt install nginx -y",
      "sudo systemctl start nginx"
    ]
  }
}`,
      },
      {
        title: 'file — Example',
        language: 'hcl',
        code: `provisioner "file" {
  source      = "config.conf"
  destination = "/tmp/config.conf"
}`,
      },
      {
        title: 'Destroy provisioner',
        language: 'hcl',
        code: `provisioner "local-exec" {
  when    = destroy
  command = "echo VM is being deleted"
}`,
      },
    ],
    tags: ['terraform', 'provisioners'],
  },
  {
    id: 'itv-ratc-11',
    level: 'basic',
    kind: 'open',
    prompt: 'What are the types of load balancers?',
    probing:
      'Layer 4 versus Layer 7, public versus internal in Azure, and how a Kubernetes LoadBalancer Service relates to an Ingress.',
    answer: [
      'This is a common interview question for Azure, Kubernetes, and networking.',
      '**1. Layer 4 (Transport Layer) load balancer**',
      'Works at the Transport Layer of the OSI model.',
      'Routes traffic based on:',
      '- IP Address\n- TCP/UDP Port',
      'It does not inspect the HTTP request.',
      'Examples (Layer 4 (Transport Layer) load balancer):',
      '- Azure Load Balancer\n- AWS Network Load Balancer (NLB)\n- Kubernetes Service of type LoadBalancer (typically backed by a cloud L4 load balancer)',
      'Use cases (Layer 4 (Transport Layer) load balancer):',
      '- High-performance TCP/UDP traffic\n- SSH\n- Databases\n- Gaming\n- VoIP',
      '**2. Layer 7 (Application Layer) load balancer**',
      'Works at the Application Layer.',
      'Routes traffic based on:',
      '- URL path\n- Hostname\n- HTTP headers\n- Cookies',
      'It understands HTTP/HTTPS traffic.',
      'Examples (Layer 7 (Application Layer) load balancer):',
      '- Azure Application Gateway\n- NGINX Ingress Controller\n- HAProxy\n- AWS Application Load Balancer (ALB)',
      'Use cases (Layer 7 (Application Layer) load balancer):',
      '- Web applications\n- Microservices\n- API routing',
      '**Azure load balancer types**',
      '**1. Public Load Balancer**',
      '- Internet-facing\n- Has a public IP\n- Distributes external traffic to backend VMs',
      '**2. Internal Load Balancer (ILB)**',
      '- Private IP only\n- Used inside a VNet\n- Not accessible from the internet',
      '**Kubernetes perspective**',
      'In Kubernetes, a Service of type LoadBalancer creates a cloud load balancer.',
      'On AKS (Kubernetes perspective):',
      '- Azure Load Balancer provides Layer 4 load balancing.\n- If you need Layer 7 features such as path-based or host-based routing, use an Ingress Controller like NGINX or Azure Application Gateway.',
      '**Interview answer (1 minute)**',
      '"Load balancers are mainly classified into Layer 4 and Layer 7. A Layer 4 load balancer routes traffic using IP addresses and TCP/UDP ports without inspecting application data, making it suitable for high-performance network traffic. A Layer 7 load balancer understands HTTP and HTTPS, so it can perform host-based and path-based routing, SSL termination, and other application-aware features. In Azure, Azure Load Balancer is a Layer 4 load balancer, while Azure Application Gateway is a Layer 7 load balancer. In AKS, a Service of type LoadBalancer uses Azure Load Balancer, whereas an Ingress Controller provides Layer 7 routing for web applications."',
    ],
    code: [
      {
        title: 'Layer 7 path routing',
        language: 'text',
        code: `example.com/api     → API Service
example.com/login   → Auth Service
example.com/images  → Image Service`,
      },
      {
        title: 'Public Load Balancer',
        language: 'text',
        code: `Internet
    │
Public Load Balancer
    │
VM1   VM2   VM3`,
      },
      {
        title: 'Internal Load Balancer',
        language: 'text',
        code: `App Servers
     │
Internal Load Balancer
     │
Database Servers`,
      },
      {
        title: 'Service of type LoadBalancer',
        language: 'yaml',
        code: `apiVersion: v1
kind: Service
metadata:
  name: web
spec:
  type: LoadBalancer`,
      },
    ],
    tags: ['load balancing', 'azure', 'networking'],
  },
  {
    id: 'itv-ratc-12',
    level: 'basic',
    kind: 'open',
    prompt: 'Which load balancer have you used in Azure?',
    probing:
      'A truthful, experience-based answer: Azure Load Balancer behind AKS Services, and Application Gateway where you really used it.',
    answer: [
      'For an interview, answer based on practical experience. A strong response is:',
      '"I have primarily used Azure Load Balancer with AKS and virtual machines. In AKS, when I create a Service of type LoadBalancer, Azure automatically provisions an Azure Load Balancer and assigns a public or internal IP. It distributes incoming TCP/UDP traffic across healthy pods. I have also configured health probes and load-balancing rules and used both public and internal load balancers depending on whether the application needed internet or private access."',
      'If they ask for more details, you can explain the two scenarios:',
      '**1. Azure Load Balancer (Layer 4)**',
      'Where I used it (Azure Load Balancer):',
      '- AKS Services of type LoadBalancer\n- Virtual Machine Scale Sets\n- High availability for applications',
      'Features (Azure Load Balancer):',
      '- TCP/UDP load balancing\n- Health probes\n- Public and Internal Load Balancers\n- Zone-redundant support',
      '**2. Azure Application Gateway (Layer 7) — if applicable**',
      'If you have used it: "For web applications, I have used Azure Application Gateway with AKS Ingress. It provides Layer 7 routing, SSL termination, path-based routing, host-based routing, and Web Application Firewall (WAF)."',
      '**If you have only used AKS**',
      'A truthful answer is:',
      '"In my projects, I mainly worked with Azure Load Balancer. It was automatically created by AKS when exposing applications through a LoadBalancer Service. For HTTP routing, we used an Ingress Controller, while Azure Load Balancer handled the external Layer 4 traffic."',
      'This answer is technically accurate and reflects a common AKS deployment architecture.',
    ],
    tags: ['azure load balancer', 'application gateway', 'aks'],
  },
  {
    id: 'itv-ratc-13',
    level: 'basic',
    kind: 'open',
    prompt: 'If `agent` is not given in a Jenkins Declarative Pipeline, what will happen?',
    probing: 'That an agent is mandatory, and how `agent none` with per-stage agents works.',
    answer: [
      'This is a common Jenkins interview question.',
      '**Answer:** In a Declarative Pipeline, the `agent` directive specifies where the pipeline or a stage should run.',
      'If you do not specify an agent, the pipeline fails with a compilation/validation error because Declarative Pipelines require an agent either:',
      '- At the pipeline level, or\n- At each stage (if `agent none` is used).',
      'Error: Jenkins reports that no agent is specified.',
      '**Valid options** — **1. Global agent:** The pipeline runs on any available Jenkins agent.',
      '**2. No global agent:** Here, there is no global agent. Each stage must define its own agent.',
      '**Why use `agent none`?**',
      '- Prevents reserving an agent for the entire pipeline.\n- Each stage can run on a different node.\n- Improves resource utilization.\n- Useful when different stages require different operating systems or tools.',
      '**Interview answer (30 seconds)**',
      '"In a Declarative Pipeline, an agent is mandatory. If you don\'t specify one, Jenkins fails to validate the pipeline because it doesn\'t know where to execute the stages. You can either define a global agent, such as `agent any`, or use `agent none` at the pipeline level and specify an agent for each stage individually. Using `agent none` is useful when different stages need different build nodes or you want to optimize agent usage."',
    ],
    code: [
      {
        title: 'Invalid: no agent',
        language: 'text',
        code: `pipeline {
    stages {
        stage('Build') {
            steps {
                sh 'mvn clean package'
            }
        }
    }
}`,
      },
      {
        title: 'Global agent',
        language: 'text',
        code: `pipeline {
    agent any

    stages {
        stage('Build') {
            steps {
                sh 'mvn clean package'
            }
        }
    }
}`,
      },
      {
        title: 'agent none with a stage agent',
        language: 'text',
        code: `pipeline {
    agent none

    stages {
        stage('Build') {
            agent any
            steps {
                sh 'mvn clean package'
            }
        }
    }
}`,
      },
      {
        title: 'Different agents per stage',
        language: 'text',
        code: `pipeline {
    agent none

    stages {
        stage('Build') {
            agent { label 'linux' }
            steps {
                sh 'mvn package'
            }
        }

        stage('Deploy') {
            agent { label 'windows' }
            steps {
                bat 'deploy.bat'
            }
        }
    }
}`,
      },
    ],
    tags: ['jenkins', 'pipeline'],
  },
  {
    id: 'itv-ratc-14',
    level: 'basic',
    kind: 'open',
    prompt: 'If `steps` are not given in a Jenkins Declarative Pipeline, what will happen?',
    probing:
      'That work must sit inside `steps`, and the valid alternatives (`parallel`, `matrix`, nested `stages`).',
    answer: [
      'This is another common Jenkins interview question.',
      '**Answer:** In a Declarative Pipeline, every stage that performs work must contain a `steps` block.',
      'If a stage does not have a `steps` block (or another valid stage content such as `parallel`, `matrix`, or `stages`), the pipeline fails during validation/compilation before it starts executing.',
      '**Invalid example:** This is invalid because `sh` must be inside a `steps` block.',
      'Jenkins throws a validation error similar to: `Expected one of "steps", "stages", or "parallel"`',
      '**Can a stage exist without steps?**',
      'Yes, but only if it contains another valid Declarative Pipeline section such as:',
      '- `parallel`\n- `matrix`\n- Nested `stages`',
      '**Interview answer (30 seconds)**',
      '"In a Declarative Pipeline, a stage that executes commands must include a `steps` block. If it\'s missing, Jenkins fails validation before execution because Declarative syntax requires executable statements to be inside `steps`. The only exception is when the stage contains valid alternatives like `parallel`, `matrix`, or nested stages instead of `steps`."',
    ],
    code: [
      {
        title: 'Invalid: sh outside steps',
        language: 'text',
        code: `pipeline {
    agent any

    stages {
        stage('Build') {
            sh 'mvn clean package'
        }
    }
}`,
      },
      {
        title: 'Correct: steps block',
        language: 'text',
        code: `pipeline {
    agent any

    stages {
        stage('Build') {
            steps {
                sh 'mvn clean package'
            }
        }
    }
}`,
      },
      {
        title: 'Stage with parallel instead of steps',
        language: 'text',
        code: `stage('Test') {
    parallel {
        stage('Unit Test') {
            steps {
                sh 'mvn test'
            }
        }
        stage('Integration Test') {
            steps {
                sh 'mvn verify'
            }
        }
    }
}`,
      },
    ],
    tags: ['jenkins', 'pipeline'],
  },
  {
    id: 'itv-ratc-15',
    level: 'basic',
    kind: 'open',
    prompt: 'Write a sample providers.tf file for Azure.',
    probing:
      'A correct azurerm provider block, aliases for multiple subscriptions, and keeping credentials out of the file.',
    answer: [
      'A `providers.tf` file is used to configure the provider that Terraform will use. In Azure projects, this is typically the AzureRM provider.',
      '**Example 1: Basic Azure provider:** Terraform authenticates using:',
      '- Azure CLI (`az login`)\n- Service Principal\n- Managed Identity\n- Workload Identity Federation',
      '**Interview answer:** "The `providers.tf` file configures the cloud provider that Terraform uses to create and manage resources. In Azure, it typically contains the `azurerm` provider block with `features {}` and optionally settings like `subscription_id` or provider aliases for multiple subscriptions. Authentication is usually handled separately through Azure CLI, a Service Principal, Managed Identity, or Workload Identity Federation rather than hardcoding credentials in the provider configuration."',
    ],
    code: [
      {
        title: 'Example 1: Basic Azure provider',
        language: 'hcl',
        code: `terraform {
  required_version = ">= 1.5.0"

  required_providers {
    azurerm = {
      source  = "hashicorp/azurerm"
      version = "~> 4.0"
    }
  }
}

provider "azurerm" {
  features {}
}`,
      },
      {
        title: 'Example 2: Provider with subscription ID',
        language: 'hcl',
        code: `provider "azurerm" {
  features {}

  subscription_id = "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
}`,
      },
      {
        title: 'Example 3: Multiple Azure subscriptions',
        language: 'hcl',
        code: `provider "azurerm" {
  alias           = "dev"
  subscription_id = "11111111-1111-1111-1111-111111111111"
  features {}
}

provider "azurerm" {
  alias           = "prod"
  subscription_id = "22222222-2222-2222-2222-222222222222"
  features {}
}`,
      },
      {
        title: 'Example 3: Multiple Azure subscriptions — Use the provider',
        language: 'hcl',
        code: `resource "azurerm_resource_group" "dev_rg" {
  provider = azurerm.dev

  name     = "dev-rg"
  location = "East US"
}`,
      },
      {
        title: 'Example 4: Provider using Managed Identity',
        language: 'hcl',
        code: `provider "azurerm" {
  features {}

  use_msi = true
}`,
      },
      {
        title: 'Typical project structure',
        language: 'text',
        code: `terraform-project/
├── providers.tf
├── versions.tf
├── variables.tf
├── terraform.tfvars
├── main.tf
├── outputs.tf
└── backend.tf`,
      },
      {
        title: 'Typical project structure — providers.tf',
        language: 'hcl',
        code: `provider "azurerm" {
  features {}
}`,
      },
      {
        title: 'Typical project structure — versions.tf',
        language: 'hcl',
        code: `terraform {
  required_version = ">= 1.5.0"

  required_providers {
    azurerm = {
      source  = "hashicorp/azurerm"
      version = "~> 4.0"
    }
  }
}`,
      },
    ],
    tags: ['terraform', 'azurerm', 'providers'],
  },
  {
    id: 'itv-ratc-16',
    level: 'intermediate',
    kind: 'open',
    prompt: 'Write a sample Jenkins pipeline that builds, scans and deploys to AKS.',
    probing:
      'Whether you can write a declarative pipeline from memory with sensible stages and a `post` section.',
    answer: [
      'Here is a simple Declarative Jenkins Pipeline that is commonly used in DevOps interviews.',
      '**Common stages (Sample Jenkins pipeline)**',
      '1. **Checkout** – Pull source code from Git.\n2. **Build** – Compile the application.\n3. **Test** – Run unit tests.\n4. **Code Quality** – Run SonarQube analysis.\n5. **Docker Build** – Create a Docker image.\n6. **Push Image** – Push the image to a registry such as Azure Container Registry (ACR).\n7. **Deploy** – Deploy the application to Kubernetes using `kubectl` or Helm.',
      '**Interview answer (1 minute)**',
      '"In my projects, I use a Declarative Jenkins Pipeline. It starts by checking out the source code from Git, builds the application using Maven, runs unit tests, performs a SonarQube scan for code quality, builds a Docker image, pushes it to Azure Container Registry, and finally deploys the application to AKS using Kubernetes manifests or Helm. I also use the `post` section to handle success, failure, and cleanup tasks such as notifications or workspace cleanup."',
    ],
    code: [
      {
        title: 'Jenkinsfile',
        language: 'text',
        code: `pipeline {
    agent any

    environment {
        APP_NAME = "myapp"
        IMAGE_TAG = "\${BUILD_NUMBER}"
    }

    stages {

        stage('Checkout') {
            steps {
                git branch: 'main',
                url: 'https://github.com/example/myapp.git'
            }
        }

        stage('Build') {
            steps {
                sh 'mvn clean package'
            }
        }

        stage('Unit Test') {
            steps {
                sh 'mvn test'
            }
        }

        stage('SonarQube Scan') {
            steps {
                sh 'mvn sonar:sonar'
            }
        }

        stage('Build Docker Image') {
            steps {
                sh 'docker build -t myacr.azurecr.io/myapp:\${IMAGE_TAG} .'
            }
        }

        stage('Push Docker Image') {
            steps {
                sh 'docker push myacr.azurecr.io/myapp:\${IMAGE_TAG}'
            }
        }

        stage('Deploy to AKS') {
            steps {
                sh 'kubectl apply -f deployment.yaml'
                sh 'kubectl apply -f service.yaml'
            }
        }
    }

    post {
        always {
            echo 'Pipeline execution completed.'
        }

        success {
            echo 'Deployment successful.'
        }

        failure {
            echo 'Deployment failed.'
        }
    }
}`,
      },
      {
        title: 'Pipeline flow',
        language: 'text',
        code: `GitHub
   │
Checkout
   │
Build (Maven)
   │
Unit Tests
   │
SonarQube Scan
   │
Docker Build
   │
Push to ACR
   │
Deploy to AKS`,
      },
    ],
    tags: ['jenkins', 'pipeline', 'aks', 'ci/cd'],
  },
]
