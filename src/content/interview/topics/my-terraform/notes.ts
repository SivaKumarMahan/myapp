import type { InterviewQuestion } from '../../../types'

/**
 * Revision material from notes.md, summary.md and interview-round-notes.md that is not already covered by a question.
 *
 * Source keys: q = questions.md, s = scenario-questions.md, n = notes.md,
 * m = summary.md, r = interview-round-notes.md (section numbers).
 */
export const myTerraformNotesQuestions: InterviewQuestion[] = [
  {
    // Source: m2
    id: 'itv-mytf-101',
    level: 'basic',
    kind: 'open',
    prompt: 'What is the difference between a resource and a data source?',
    probing:
      'The basic distinction between managed resources and read-only lookups, and a pattern that uses both.',
    answer: [
      'A resource is something Terraform creates, updates, and deletes. A data source is read-only, used to look up something that already exists. A common pattern is a data source that finds the latest approved image, and a resource that creates the VM from it, so the module does not hardcode an image ID.',
      '**Resource:** Terraform **creates and manages** it.',
      '**Data source:** Terraform only **reads** it. Nothing is created or changed.',
      '**Using both together:** Look up the latest image, then build a VM from it:',
    ],
    code: [
      {
        title: 'Terraform creates and manages it',
        language: 'hcl',
        code: `resource "google_compute_instance" "vm" {
  name         = "my-vm"
  machine_type = "e2-medium"
  zone         = "us-central1-a"
}`,
      },
      {
        title: 'Terraform only reads it. Nothing is created or changed',
        language: 'hcl',
        code: `data "google_compute_image" "ubuntu" {
  family  = "ubuntu-2204-lts"
  project = "ubuntu-os-cloud"
}`,
      },
      {
        title: 'Look up the latest image, then build a VM from it',
        language: 'hcl',
        code: `resource "google_compute_instance" "vm" {
  name         = "my-vm"
  machine_type = "e2-medium"
  zone         = "us-central1-a"

  boot_disk {
    initialize_params {
      image = data.google_compute_image.ubuntu.self_link
    }
  }
}`,
      },
    ],
    tags: ['resources', 'data sources'],
  },
  {
    // Source: m4
    id: 'itv-mytf-102',
    level: 'basic',
    kind: 'open',
    prompt: 'What are the essential Terraform commands?',
    probing:
      'Command fluency, including the state commands and the replacements for deprecated ones.',
    answer: [
      '**Everyday** (at a glance):',
      '- `terraform init`: Set up the folder, download providers and modules\n- `terraform fmt`: Format the code\n- `terraform validate`: Check syntax and references\n- `terraform plan`: Preview the changes\n- `terraform apply`: Make the changes\n- `terraform destroy`: Delete everything managed here\n- `terraform output`: Show output values',
      '**Useful** (at a glance):',
      '- `terraform show`: Show the current state or a saved plan\n- `terraform plan -out=tfplan`: Save the plan for review\n- `terraform apply tfplan`: Apply exactly what was reviewed\n- `terraform plan -refresh-only`: See drift without proposing changes\n- `terraform console`: Try out expressions and functions\n- `terraform get`: Download or update modules\n- `terraform graph`: Print the dependency graph',
      '**State and advanced:**',
      "- `terraform state list`: List managed resources\n- `terraform state show <addr>`: Show one resource's attributes\n- `terraform state mv <old> <new>`: Move or rename an address\n- `terraform state rm <addr>`: Stop managing it, without deleting it\n- `terraform state pull > backup.tfstate`: Back up the state\n- `terraform import <addr> <id>`: Bring an existing resource under management\n- `terraform apply -replace=<addr>`: Recreate one resource (replaces `taint`)\n- `terraform force-unlock <id>`: Remove a stuck lock, only after checking\n- `terraform workspace list / new / select`: Manage workspaces",
      '**Deprecated, know the replacement:**',
      '- `terraform refresh`: `terraform apply -refresh-only`\n- `terraform taint`: `terraform apply -replace=<address>`',
    ],
    code: [
      {
        title: 'Everyday commands',
        language: 'bash',
        code: `terraform init        # Set up the folder, download providers and modules
terraform fmt         # Format the code
terraform validate    # Check syntax and references
terraform plan        # Preview the changes
terraform apply       # Make the changes
terraform destroy     # Delete everything managed here
terraform output      # Show output values`,
      },
      {
        title: 'Useful commands',
        language: 'bash',
        code: `terraform show                  # Show the current state or a saved plan
terraform plan -out=tfplan      # Save the plan for review
terraform apply tfplan          # Apply exactly what was reviewed
terraform plan -refresh-only    # See drift without proposing changes
terraform console               # Try out expressions and functions
terraform get                   # Download or update modules
terraform graph                 # Print the dependency graph`,
      },
      {
        title: 'State and advanced commands',
        language: 'bash',
        code: `terraform state list                       # List managed resources
terraform state show <addr>                # Show one resource's attributes
terraform state mv <old> <new>             # Move or rename an address
terraform state rm <addr>                  # Stop managing it, without deleting it
terraform state pull > backup.tfstate      # Back up the state
terraform import <addr> <id>               # Bring an existing resource under management
terraform apply -replace=<addr>            # Recreate one resource (replaces taint)
terraform force-unlock <id>                # Remove a stuck lock, only after checking
terraform workspace list / new / select    # Manage workspaces`,
      },
      {
        title: 'Deprecated, know the replacement commands',
        language: 'bash',
        code: `terraform refresh    # terraform apply -refresh-only
terraform taint      # terraform apply -replace=<address>`,
      },
    ],
    tags: ['cli', 'commands'],
  },
  {
    // Source: m5
    id: 'itv-mytf-103',
    level: 'basic',
    kind: 'open',
    prompt: 'How is a normal Terraform project structured, and what is the workflow?',
    probing:
      'Whether you organise a root module into conventional files and follow the standard workflow.',
    answer: [
      '**A normal root module** is split into these files:',
      '- `main.tf`: resources and module calls\n- `variables.tf`: input variables\n- `outputs.tf`: outputs\n- `providers.tf`: provider configuration\n- `versions.tf`: `required_version` and `required_providers`\n- `backend.tf`: where state is stored\n- `dev.tfvars`: values for this environment',
      '**The normal workflow:** write code -> init -> fmt -> validate -> plan -> review -> apply -> verify.',
    ],
    code: [
      {
        title: 'A normal root module',
        language: 'text',
        code: `main.tf         resources and module calls
variables.tf    input variables
outputs.tf      outputs
providers.tf    provider configuration
versions.tf     required_version and required_providers
backend.tf      where state is stored
dev.tfvars      values for this environment`,
      },
      {
        title: 'The normal workflow',
        language: 'text',
        code: `write code -> init -> fmt -> validate -> plan -> review -> apply -> verify`,
      },
    ],
    tags: ['structure', 'workflow'],
  },
  {
    // Source: m6
    id: 'itv-mytf-104',
    level: 'basic',
    kind: 'open',
    prompt: 'What are the core Terraform blocks and what does each do?',
    probing: 'Knowledge of the building blocks of a configuration, including `moved` and `import`.',
    answer: [
      '**Core blocks** at a glance:',
      '- `terraform`: Required versions and backend settings\n- `provider`: How to reach the cloud API; use aliases for extra regions or accounts\n- `resource`: Something Terraform creates and manages\n- `data`: Something Terraform only reads\n- `variable`: Typed input\n- `locals`: Reusable expressions inside the configuration\n- `output`: Values exposed to the caller or another stack\n- `module`: A call to a reusable child module\n- `moved`: Tells Terraform an address changed, so it does not recreate\n- `import`: Declarative import of an existing resource',
    ],
    code: [
      {
        title: 'Example',
        language: 'hcl',
        code: `terraform {
  required_version = ">= 1.6.0"

  required_providers {
    azurerm = {
      source  = "hashicorp/azurerm"
      version = "~> 3.100"
    }
  }
}

provider "azurerm" {
  features {}
}

variable "location" {
  type    = string
  default = "centralindia"
}

locals {
  name_prefix = "app-\${var.environment}"
}

resource "azurerm_resource_group" "main" {
  name     = "\${local.name_prefix}-rg"
  location = var.location
}

output "resource_group_name" {
  value = azurerm_resource_group.main.name
}`,
      },
    ],
    tags: ['syntax', 'blocks'],
  },
  {
    // Source: m8
    id: 'itv-mytf-105',
    level: 'intermediate',
    kind: 'open',
    prompt: 'What are meta-arguments, and how do you use for_each with maps and lists?',
    probing:
      'Fluency with meta-arguments and the common `for_each` shapes, including `each.key` and `each.value`.',
    answer: [
      '- `count`: Numbered instances, good for identical copies\n- `for_each`: Named instances from a map or set, good when each has an identity\n- `depends_on`: A dependency Terraform cannot infer\n- `lifecycle`: Controls replacement and drift behaviour\n- `provider`: Picks a provider alias',
      'Addresses become `azurerm_resource_group.this["dev"]`, and so on.',
      '`each.key` is the map key, `each.value` is the whole object.',
      '`toset()` removes duplicates. If duplicates mean the input is wrong, reject them with validation instead of hiding them.',
    ],
    code: [
      {
        title: 'for_each with a simple map',
        language: 'hcl',
        code: `variable "resource_groups" {
  type = map(string)

  default = {
    dev  = "dev-rg"
    test = "test-rg"
    prod = "prod-rg"
  }
}

resource "azurerm_resource_group" "this" {
  for_each = var.resource_groups
  name     = each.value
  location = "centralindia"
}`,
      },
      {
        title: 'for_each with a map of objects',
        language: 'hcl',
        code: `variable "storage_accounts" {
  type = map(object({
    name     = string
    location = string
    tier     = string
  }))
}

resource "azurerm_storage_account" "this" {
  for_each                 = var.storage_accounts
  name                     = each.value.name
  location                 = each.value.location
  account_tier             = each.value.tier
  resource_group_name      = azurerm_resource_group.main.name
  account_replication_type = "LRS"
}`,
      },
      {
        title: 'for_each over a list of names',
        language: 'hcl',
        code: `resource "azurerm_resource_group" "this" {
  for_each = toset(var.resource_group_names)
  name     = each.value
  location = var.location
}`,
      },
    ],
    tags: ['meta-arguments', 'for_each'],
  },
  {
    // Source: m9
    id: 'itv-mytf-106',
    level: 'basic',
    kind: 'open',
    prompt: 'What is Terraform state, and how does locking work?',
    probing: 'A clear definition of state, how locking behaves, and how a console change shows up.',
    answer: [
      '**What state is:** A file that maps each Terraform address to the real resource ID, plus the attributes needed to build a plan. It is not your source code and not a backup of your data.',
      '**Locking:** Locking stops two applies writing at the same time. If someone else holds it:',
      'Wait, or stop that job cleanly. Only after proving nothing is running:',
      '**Console change example:** Someone edits an EC2 instance in the AWS console. Terraform does **not** update your `.tf` files.',
      '1. `terraform plan -refresh-only` to see the drift without proposing changes.\n2. Decide whether the change should stay.\n3. To keep it, update the code and review a normal plan.\n4. To reject it, apply the reviewed plan so Terraform restores the declared value.',
      '**Backend note:** Current Terraform versions can lock the S3 backend with `use_lockfile = true`. The older DynamoDB lock table still exists in many projects but is the legacy approach.',
    ],
    code: [
      {
        title: 'Locking stops two applies writing at the same time. If someone else holds it',
        language: 'text',
        code: `Error: Error acquiring the state lock
  ID:   4f1c8b32-...
  Who:  runner@ci-agent-3`,
      },
      {
        title: 'Wait, or stop that job cleanly. Only after proving nothing is running',
        language: 'bash',
        code: `terraform force-unlock 4f1c8b32-...`,
      },
    ],
    tags: ['state', 'locking'],
  },
  {
    // Source: r2
    id: 'itv-mytf-107',
    level: 'basic',
    kind: 'open',
    prompt: 'What is the difference between terraform refresh and terraform plan?',
    probing:
      'Whether you know refresh changes state, plan changes nothing, and that `-refresh-only` replaced refresh.',
    answer: [
      'Refresh updates the state file to match the real world; plan shows what apply would do. Plan refreshes in memory first and then shows the difference, without changing anything. The standalone refresh command is deprecated, so I use `plan -refresh-only` to review drift and `apply -refresh-only` when I want to record it in state.',
      '- `terraform refresh`: Updates state to match reality - `terraform plan`: Shows the difference between code and reality\n- `terraform refresh`: Changes the state file - `terraform plan`: Changes nothing\n- `terraform refresh`: Standalone command is deprecated - `terraform plan`: Runs a refresh internally, then shows the diff',
    ],
    code: [
      {
        title: 'Modern replacement',
        language: 'bash',
        code: `terraform plan -refresh-only     # review the drift
terraform apply -refresh-only    # record it in state, no infrastructure change`,
      },
    ],
    tags: ['state', 'drift', 'cli'],
  },
  {
    // Source: m11a
    id: 'itv-mytf-108',
    level: 'basic',
    kind: 'open',
    prompt: 'Which Terraform list functions do you actually use?',
    probing: 'Working knowledge of everyday list functions and what they return.',
    answer: [
      'Try any of these with `terraform console`.',
      '**List functions** (key points):',
      '- **`length()`** — how many items.\n- **`element()`** — item at an index.\n- **`slice()`** — a part of a list, end index not included.\n- **`concat()`** — join lists together.\n- **`flatten()`** — turn nested lists into one list.\n- **`distinct()`** — remove duplicates, keep the order.\n- **`compact()`** — remove empty and null values.\n- **`formatlist()`** — format every item.\n- **`toset()`** — convert a list to a set, for `for_each`.',
    ],
    code: [
      {
        title: 'length() — how many items',
        language: 'hcl',
        code: `length(["a", "b", "c"])   # 3`,
      },
      {
        title: 'element() — item at an index',
        language: 'hcl',
        code: `element(["Mon", "Tue", "Wed"], 2)   # "Wed"`,
      },
      {
        title: 'slice() — a part of a list, end index not included',
        language: 'hcl',
        code: `slice([1, 2, 3, 4, 5], 1, 3)   # [2, 3]`,
      },
      {
        title: 'concat() — join lists together',
        language: 'hcl',
        code: `concat(["a", "b"], ["c"])   # ["a", "b", "c"]`,
      },
      {
        title: 'flatten() — turn nested lists into one list',
        language: 'hcl',
        code: `flatten([["a", "b"], ["c"], ["d"]])   # ["a", "b", "c", "d"]`,
      },
      {
        title: 'distinct() — remove duplicates, keep the order',
        language: 'hcl',
        code: `distinct(["a", "b", "a", "c"])   # ["a", "b", "c"]`,
      },
      {
        title: 'compact() — remove empty and null values',
        language: 'hcl',
        code: `compact(["apple", "", "mango", null])   # ["apple", "mango"]`,
      },
      {
        title: 'formatlist() — format every item',
        language: 'hcl',
        code: `formatlist("app-%s", ["web", "api"])   # ["app-web", "app-api"]`,
      },
      {
        title: 'toset() — convert a list to a set, for for_each',
        language: 'hcl',
        code: `toset(["a", "b", "a"])   # ["a", "b"]`,
      },
    ],
    tags: ['functions', 'lists'],
  },
  {
    // Source: m11b
    id: 'itv-mytf-109',
    level: 'basic',
    kind: 'open',
    prompt: 'Which Terraform map functions and for expressions do you use?',
    probing: 'Working knowledge of map functions, `merge` for tags, and building `for_each` maps.',
    answer: [
      '**Map functions** (key points):',
      '- **`keys()` and `values()`**\n- **`lookup()`** — read a key with a fallback.\n- **`merge()`** — combine maps. Later maps win.',
      'This is the usual way to build tags:',
      '- **`zipmap()`** — build a map from two lists.\n- **`for` expression** — transform a map.',
    ],
    code: [
      {
        title: 'keys() and values()',
        language: 'hcl',
        code: `keys({ env = "prod", app = "web" })     # ["app", "env"]
values({ env = "prod", app = "web" })   # ["web", "prod"]`,
      },
      {
        title: 'lookup() — read a key with a fallback',
        language: 'hcl',
        code: `variable "db_urls" {
  type = map(string)

  default = {
    dev  = "dev-db.internal"
    prod = "prod-db.internal"
  }
}

output "db_url" {
  value = lookup(var.db_urls, var.environment, "localhost")
}`,
      },
      {
        title: 'merge() — combine maps. Later maps win',
        language: 'hcl',
        code: `merge({ Env = "dev", Owner = "team-a" }, { Env = "prod" })
# { Env = "prod", Owner = "team-a" }`,
      },
      {
        title: 'This is the usual way to build tags',
        language: 'hcl',
        code: `locals {
  tags = merge(var.common_tags, { Component = "database" })
}`,
      },
      {
        title: 'zipmap() — build a map from two lists',
        language: 'hcl',
        code: `zipmap(["timeout", "retries"], [30, 5])
# { timeout = 30, retries = 5 }`,
      },
      {
        title: 'for expression — transform a map',
        language: 'hcl',
        code: `locals {
  prices = { apple = 0.5, banana = 0.3 }

  discounted = { for name, price in local.prices : name => price * 0.9 }
  # { apple = 0.45, banana = 0.27 }
}`,
      },
      {
        title: 'Build a for_each map from a list of objects',
        language: 'hcl',
        code: `locals {
  users_map = { for u in var.users : u.name => u }
}`,
      },
    ],
    tags: ['functions', 'maps'],
  },
  {
    // Source: m11c
    id: 'itv-mytf-110',
    level: 'basic',
    kind: 'open',
    prompt: 'Which string, number and network functions come up most?',
    probing: 'Everyday string formatting and the CIDR helpers used in network modules.',
    answer: [
      '**String functions:**',
      '- **`format()`** — build a string from a pattern.\n- **`join()` and `split()`**\n- **`replace()`**\n- **`upper()`, `lower()`, `title()`**\n- **`trimspace()` and `chomp()`** — remove spaces or a trailing newline. Useful after `file()`.\n- **`substr()`**',
      '**Number and network functions:**',
      '- **`min()`, `max()`, `abs()`, `ceil()`, `floor()`**\n- **`cidrsubnet()`** — split a network into subnets.\n- **`cidrhost()`** — a specific address inside a network.',
    ],
    code: [
      {
        title: 'format() — build a string from a pattern',
        language: 'hcl',
        code: `format("web-%s-%02d", "prod", 3)   # "web-prod-03"`,
      },
      {
        title: 'join() and split()',
        language: 'hcl',
        code: `join(",", ["a", "b", "c"])       # "a,b,c"
split(",", "a,b,c")              # ["a", "b", "c"]
split("@", "user1@example.com")  # ["user1", "example.com"]`,
      },
      {
        title: 'replace()',
        language: 'hcl',
        code: `replace("my.app.name", ".", "-")   # "my-app-name"`,
      },
      {
        title: 'upper(), lower(), title()',
        language: 'hcl',
        code: `upper("prod")         # "PROD"
lower("PROD")         # "prod"
title("hello world")  # "Hello World"`,
      },
      {
        title: 'upper(), lower(), title()',
        language: 'hcl',
        code: `chomp(file("\${path.module}/version.txt"))`,
      },
      { title: 'substr()', language: 'hcl', code: `substr("terraform", 0, 4)   # "terr"` },
      {
        title: 'min(), max(), abs(), ceil(), floor()',
        language: 'hcl',
        code: `max(3, 7, 2)   # 7
ceil(4.1)      # 5`,
      },
      {
        title: 'cidrsubnet() — split a network into subnets',
        language: 'hcl',
        code: `cidrsubnet("10.0.0.0/16", 8, 0)   # "10.0.0.0/24"
cidrsubnet("10.0.0.0/16", 8, 1)   # "10.0.1.0/24"`,
      },
      {
        title: 'cidrsubnet() — split a network into subnets',
        language: 'hcl',
        code: `locals {
  subnets = [for i in range(3) : cidrsubnet("10.0.0.0/16", 8, i)]
}`,
      },
      {
        title: 'cidrhost() — a specific address inside a network',
        language: 'hcl',
        code: `cidrhost("10.0.1.0/24", 10)   # "10.0.1.10"`,
      },
    ],
    tags: ['functions', 'strings', 'cidr'],
  },
  {
    // Source: m11d
    id: 'itv-mytf-111',
    level: 'intermediate',
    kind: 'open',
    prompt: 'How do you use the validation, file, path and encoding functions?',
    probing:
      'Using `can`, `try`, `templatefile`, `jsonencode` and path values correctly in real modules.',
    answer: [
      '**Validation and safety:**',
      '- **`can()`** — true if the expression works.\n- **`try()`** — return the first value that works.',
      '**File functions** (key points):',
      '- **`file()`** — read a file as a string. The file must exist before Terraform runs.\n- **`templatefile()`** — read a file and fill in variables. Better than `file()` for scripts and config.\n- **`fileexists()`, `basename()`, `dirname()`, `abspath()`**',
      '**Path values** (at a glance):',
      '- `path.module`: Folder of the current module\n- `path.root`: Folder of the root module\n- `path.cwd`: Current working directory',
      '**Encoding functions:**',
      '- **`jsonencode()` and `jsondecode()`**\n- **`yamlencode()` and `yamldecode()`** — the same idea for YAML.\n- **`base64encode()` and `base64decode()`**',
    ],
    code: [
      {
        title: 'can() — true if the expression works',
        language: 'hcl',
        code: `can(regex("^t3\\\\.", var.instance_type))`,
      },
      {
        title: 'try() — return the first value that works',
        language: 'hcl',
        code: `locals {
  region = try(var.settings.region, "us-east-1")
}`,
      },
      {
        title: 'Use them in variable validation',
        language: 'hcl',
        code: `variable "environment" {
  type = string

  validation {
    condition     = contains(["dev", "test", "prod"], var.environment)
    error_message = "Environment must be dev, test, or prod."
  }
}`,
      },
      {
        title: 'file() — read a file as a string. The file must exist before Terraform runs',
        language: 'hcl',
        code: `locals {
  startup_script = file("\${path.module}/startup.sh")
}`,
      },
      {
        title: 'File functions',
        language: 'hcl',
        code: `user_data = templatefile("\${path.module}/init.sh.tftpl", {
  app_name = var.app_name
  port     = 8080
})`,
      },
      {
        title: 'fileexists(), basename(), dirname(), abspath()',
        language: 'hcl',
        code: `fileexists("\${path.module}/config.txt")   # true or false
basename("/tmp/app/main.tf")              # "main.tf"
dirname("/tmp/app/main.tf")               # "/tmp/app"`,
      },
      {
        title: 'jsonencode() and jsondecode()',
        language: 'hcl',
        code: `policy = jsonencode({
  Version = "2012-10-17"
  Statement = [{
    Effect   = "Allow"
    Action   = "s3:GetObject"
    Resource = "\${aws_s3_bucket.app.arn}/*"
  }]
})`,
      },
      {
        title: 'jsonencode() and jsondecode()',
        language: 'hcl',
        code: `locals {
  users = jsondecode(file("\${path.module}/users.json"))
}`,
      },
      {
        title: 'base64encode() and base64decode()',
        language: 'hcl',
        code: `resource "aws_instance" "web" {
  user_data = base64encode(file("\${path.module}/init.sh"))
}`,
      },
    ],
    tags: ['functions', 'validation', 'files'],
  },
  {
    // Source: n7
    id: 'itv-mytf-112',
    level: 'basic',
    kind: 'open',
    prompt: 'How does Terraform work out resource dependencies?',
    probing: 'Implicit versus explicit dependencies and why too many `depends_on` hurt.',
    answer: [
      '**Implicit (preferred):** Terraform works out the order from references:',
      '**Explicit:** Only when there is no reference to infer from:',
      '**Tips** (key points):',
      '- Too many `depends_on` blocks slow the apply down and can cause cycles.\n- `terraform graph | dot -Tsvg > graph.svg` shows the dependency graph.',
    ],
    code: [
      {
        title: 'Terraform works out the order from references',
        language: 'hcl',
        code: `resource "aws_instance" "app" {
  subnet_id = aws_subnet.private.id   # app waits for the subnet
}`,
      },
      {
        title: 'Only when there is no reference to infer from',
        language: 'hcl',
        code: `resource "aws_instance" "app" {
  depends_on = [aws_iam_role_policy_attachment.app]
}`,
      },
    ],
    tags: ['dependencies', 'graph'],
  },
  {
    // Source: n9
    id: 'itv-mytf-113',
    level: 'basic',
    kind: 'open',
    prompt: 'What are the core Infrastructure as Code principles?',
    probing:
      'Whether you can explain declarative, versioned, idempotent infrastructure in plain words.',
    answer: [
      '**Infrastructure as Code principles** at a glance:',
      '- **Declarative**: Describe the end state, not the steps\n- **Version controlled**: All code in Git, reviewed through pull requests\n- **Modular**: Reusable components with inputs and outputs\n- **Automated**: The pipeline applies changes, not a laptop\n- **Idempotent**: Running twice produces the same result\n- **Documented**: README, examples, and clear variables\n- **Tested**: Validate, scan, plan, and test before apply',
    ],
    tags: ['iac', 'concepts'],
  },
  {
    // Source: n18
    id: 'itv-mytf-114',
    level: 'intermediate',
    kind: 'open',
    prompt: 'How do you keep Terraform idempotent and avoid unwanted re-creation?',
    probing: 'Knowing the common causes of unexpected replacement and how to avoid each.',
    answer: [
      '**Causes of unwanted recreation:**',
      '- `timestamp()` or `uuid()` in a name: Use a stable name\n- **Changing an immutable field**: Check the provider docs first\n- Switching `count` to `for_each`: Use `moved` blocks\n- **Another tool changing a field**: Narrow `ignore_changes`\n- **Renaming a resource in code**: Use a `moved` block, not a rename',
      '**Habit:** Always read the plan for `forces replacement` before approving.',
    ],
    tags: ['idempotency', 'replacement'],
  },
  {
    // Source: n19
    id: 'itv-mytf-115',
    level: 'intermediate',
    kind: 'open',
    prompt: 'How do you manage cost with Terraform?',
    probing: 'Practical cost controls built into the code and the pipeline.',
    answer: [
      '**Cost management** at a glance:',
      '1. Right-size in dev: small instances, one node, short backup retention.\n2. Turn dev off outside working hours.\n3. Use spot or preemptible instances for non-critical workloads.\n4. Tag everything for cost allocation.\n5. Create budgets and alerts in Terraform.\n6. Run a cost estimate in the pipeline, for example with Infracost.',
    ],
    code: [
      {
        title: 'Example',
        language: 'hcl',
        code: `variable "instance_type" {
  type = map(string)

  default = {
    dev  = "t3.small"
    prod = "m6i.large"
  }
}`,
      },
    ],
    tags: ['cost', 'finops'],
  },
  {
    // Source: n23
    id: 'itv-mytf-116',
    level: 'intermediate',
    kind: 'open',
    prompt: 'How do you run Terraform with GitHub Actions on Azure?',
    probing: 'A working OIDC-based GitHub Actions workflow for Azure with an approval gate.',
    answer: [
      '**Points** (key points):',
      '- `id-token: write` enables OIDC, so no client secret is stored.\n- State lives in an Azure Storage account, which locks with blob leases.\n- The `environment` setting gives the approval gate.',
    ],
    code: [
      {
        title: 'Example',
        language: 'yaml',
        code: `name: terraform

on:
  pull_request:
  push:
    branches: [main]

permissions:
  id-token: write
  contents: read

jobs:
  terraform:
    runs-on: ubuntu-latest
    environment: production

    steps:
      - uses: actions/checkout@v4

      - uses: azure/login@v2
        with:
          client-id: \${{ secrets.AZURE_CLIENT_ID }}
          tenant-id: \${{ secrets.AZURE_TENANT_ID }}
          subscription-id: \${{ secrets.AZURE_SUBSCRIPTION_ID }}

      - uses: hashicorp/setup-terraform@v3

      - run: terraform init
      - run: terraform validate
      - run: terraform plan -out=tfplan

      - if: github.ref == 'refs/heads/main'
        run: terraform apply tfplan`,
      },
    ],
    tags: ['github actions', 'azure', 'ci/cd'],
  },
  {
    // Source: n24
    id: 'itv-mytf-117',
    level: 'intermediate',
    kind: 'open',
    prompt: 'What should you remember about state, replacement and provisioners?',
    probing: 'Whether you know provisioners are a last resort and what to use instead.',
    answer: [
      '**State:** Keep it in an encrypted remote backend with locking, versioning, audit logs, and least-privilege access. Protect read access as strongly as write access.',
      '**Replacement:** `terraform taint` is deprecated. Use:',
      'Check dependencies, data, downtime, and rollback before replacing anything.',
      '**Provisioners:** `local-exec`, `remote-exec`, and `file` are last-resort escape hatches, not a configuration management tool.',
      '**Problems with them:**',
      '- Hard to make idempotent\n- Can fail after the resource is already created\n- Errors are hard to recover from',
      'Better options: cloud-init or user data, a pre-baked image, a managed service, Ansible, or a native provider resource.',
    ],
    code: [
      {
        title: 'terraform taint is deprecated. Use',
        language: 'bash',
        code: `terraform apply -replace='module.app.aws_instance.web'`,
      },
    ],
    tags: ['provisioners', 'state', 'replacement'],
  },
  {
    // Source: n25
    id: 'itv-mytf-118',
    level: 'basic',
    kind: 'open',
    prompt: 'Explain CIDR basics for planning networks in Terraform.',
    probing: 'Basic CIDR maths, planning non-overlapping ranges, and `cidrsubnet`.',
    answer: [
      'The number after the slash is how many bits are fixed. The remaining bits are host addresses.',
      '**Planning tips** (in order):',
      '1. Plan non-overlapping ranges across environments and clouds, or peering will fail later.\n2. Leave room to grow. You cannot easily shrink or move a subnet afterwards.\n3. Cloud providers reserve some addresses in every subnet, so the usable count is lower than the raw number. AWS reserves 5 per subnet.',
    ],
    code: [
      {
        title: 'Example',
        language: 'text',
        code: `10.0.0.0/16   = 65,536 addresses    (a whole VPC)
10.0.1.0/24   = 256 addresses       (a subnet)
10.0.1.0/28   = 16 addresses        (a small subnet)`,
      },
      {
        title: 'Useful function',
        language: 'hcl',
        code: `locals {
  subnets = [for i in range(3) : cidrsubnet("10.0.0.0/16", 8, i)]
  # 10.0.0.0/24, 10.0.1.0/24, 10.0.2.0/24
}`,
      },
    ],
    tags: ['networking', 'cidr'],
  },
  {
    // Source: m10
    id: 'itv-mytf-119',
    level: 'intermediate',
    kind: 'open',
    prompt: 'What are the key scenario reminders for Terraform interviews?',
    probing: 'The short, safe rules of thumb that underpin most scenario answers.',
    answer: [
      '**Scenario reminders** at a glance:',
      '- Write the configuration **before** you import, and confirm the exact address and ID.\n- `prevent_destroy` alone is not full protection. Add deletion protection, policy, and backups.\n- Replace an image with a new launch template version plus instance refresh, or blue-green.\n- Prefer separate root modules and state for long-lived dev, test, and production.\n- A successful apply proves the API calls worked, not that the service works.',
    ],
    tags: ['scenarios', 'revision'],
  },
  {
    // Source: r3
    id: 'itv-mytf-120',
    level: 'intermediate',
    kind: 'open',
    prompt: 'How do you structure a large Terraform project?',
    probing: 'Thin root configs, versioned modules and layered state for a big codebase.',
    answer: [
      '**Rules** (in order):',
      '1. Modules hold the logic. Root configs stay thin and just call modules.\n2. Version the modules and pin the version in each environment.\n3. Separate state per environment, and per layer when the project is big.\n4. Layer the state: network, platform, data, application. Smaller blast radius.\n5. Pin provider versions and commit the lock file.\n6. Run `fmt`, `validate`, `tflint`, and a security scan in CI.',
      '**Workspaces or folders?** Workspaces are fine for short-lived or nearly identical copies. For long-lived dev, staging, and production, separate folders are clearer, because the credentials, backend, and approvals are visible.',
    ],
    code: [
      {
        title: 'Layout',
        language: 'text',
        code: `modules/
  network/
  compute/
  database/
environments/
  dev/     main.tf  backend.tf  dev.tfvars
  staging/ main.tf  backend.tf  staging.tfvars
  prod/    main.tf  backend.tf  prod.tfvars`,
      },
    ],
    tags: ['structure', 'modules', 'state'],
  },
  {
    // Source: n17
    id: 'itv-mytf-121',
    level: 'advanced',
    kind: 'open',
    prompt: 'How do you run blue-green and canary rollouts with Terraform?',
    probing:
      'Understanding of rollout strategies and which part Terraform owns versus the traffic layer.',
    answer: [
      '**Blue-green** (in order):',
      '1. Build a complete second stack (green) beside the live one (blue).\n2. Test green privately.\n3. Switch the load balancer or DNS to green.\n4. Keep blue for the rollback window, then destroy it.',
      '**Canary** (in order):',
      '1. Send a small percentage of traffic to the new version.\n2. Watch error rate and latency.\n3. Increase gradually, or roll back quickly.',
      '**With Terraform:** Terraform builds both stacks and the routing. The traffic percentage is usually driven by a weighted target group, weighted DNS record, or a service mesh, and changed through the pipeline.',
    ],
    followUps: [
      'How would you shift traffic gradually with a weighted target group or DNS record?',
      'What metrics decide whether a canary is promoted or rolled back?',
    ],
    tags: ['deployment', 'blue-green', 'canary'],
  },
  {
    // Source: n20
    id: 'itv-mytf-122',
    level: 'advanced',
    kind: 'open',
    prompt: 'How do you change autoscaling groups and load balancers without downtime?',
    probing:
      'Detailed AWS knowledge: launch template versions, instance refresh, health checks and connection draining.',
    answer: [
      '**Changing autoscaling groups and load balancers without downtime** at a glance:',
      '1. A new launch template version does not replace running instances by itself.\n2. Use instance refresh with a minimum healthy percentage to roll them gradually.\n3. Keep health checks strict so bad instances never receive traffic.\n4. Use connection draining (deregistration delay) so in-flight requests finish.\n5. For load balancer changes, add the new listener or target group before removing the old one.',
    ],
    code: [
      {
        title: 'Example',
        language: 'hcl',
        code: `resource "aws_lb_target_group" "web" {
  deregistration_delay = 30
}`,
      },
    ],
    followUps: [
      'Why does a new launch template version not replace running instances by itself?',
      'How would you swap a load balancer listener without dropping traffic?',
    ],
    tags: ['aws', 'zero downtime', 'autoscaling'],
  },
  {
    // Source: r6
    id: 'itv-mytf-123',
    level: 'advanced',
    kind: 'open',
    prompt: 'How would you design Terraform modules for a multi-tier application?',
    probing:
      'Module and state design for a three-tier app, including wiring, network tiers and security groups.',
    answer: [
      '**Key points to mention:**',
      '1. **Remote state:** encrypted, versioned, locked, one state per environment.\n2. **Layered state:** network, application, and data separately, so a mistake has a smaller blast radius.\n3. **Wiring:** module outputs inside a root config, or `terraform_remote_state` between layers.\n4. **Inputs and outputs:** CIDRs, instance sizes, and counts as inputs; VPC ID, subnet IDs, and endpoints as outputs.\n5. **Tiers:** load balancer in the public tier, application in private subnets, database with no public route.\n6. **Security groups reference each other**, not raw CIDR ranges.\n7. Pin versions, tag everything, and run security scans in CI.',
    ],
    code: [
      {
        title: 'Structure',
        language: 'text',
        code: `modules/
  network/    VPC, public/private/db subnets, routes, NAT, internet gateway
  compute/    autoscaling group or cluster for the app tier
  data/       database with multi-AZ, cache, subnet groups
  security/   security groups and IAM
environments/
  prod/       main.tf (calls the modules), backend.tf, prod.tfvars`,
      },
      {
        title: 'Example wiring',
        language: 'hcl',
        code: `module "network" {
  source = "../../modules/network"
  cidr   = var.vpc_cidr
}

module "data" {
  source     = "../../modules/data"
  subnet_ids = module.network.db_subnet_ids
}

module "compute" {
  source        = "../../modules/compute"
  subnet_ids    = module.network.private_subnet_ids
  db_endpoint   = module.data.endpoint
}`,
      },
    ],
    followUps: [
      'How would the application layer get the database endpoint if it is in a separate state?',
      'Why reference security groups instead of CIDR ranges?',
    ],
    tags: ['modules', 'design', 'aws'],
  },
  {
    // Source: m12
    id: 'itv-mytf-124',
    level: 'advanced',
    kind: 'open',
    prompt: 'How would you set up an Azure platform with Terraform?',
    probing:
      'An end-to-end Azure design: which modules, how to split state, the pipeline and post-apply checks.',
    answer: [
      '**How to split state:** By lifecycle and ownership, not by team preference:',
      '**After apply, check:** Private DNS resolves, routes work, RBAC has propagated, diagnostics are arriving in Log Analytics, AKS can pull from ACR, and the application health endpoint responds.',
      '**Secrets:** Terraform creates the Key Vault and grants access to the managed identity. The application reads the secret at runtime, so the value never passes through Terraform state.',
    ],
    code: [
      {
        title: 'Modules to build',
        language: 'text',
        code: `resource group
virtual network + subnets + NSGs
private DNS and private endpoints
storage account
key vault
log analytics + application insights
container registry
AKS cluster
database
role assignments`,
      },
      {
        title: 'By lifecycle and ownership, not by team preference',
        language: 'text',
        code: `connectivity-state   hub network, DNS, firewall
platform-state       AKS, ACR, monitoring
data-state           databases, storage
app-state            application resources`,
      },
      {
        title: 'Pipeline',
        language: 'bash',
        code: `terraform fmt -check
terraform init
terraform validate
checkov -d .
terraform plan -out=tfplan
# approval
terraform apply tfplan`,
      },
    ],
    followUps: [
      'How do private endpoints and private DNS fit into the connectivity state?',
      'How does AKS get permission to pull from ACR?',
    ],
    tags: ['azure', 'design', 'aks'],
  },
]
