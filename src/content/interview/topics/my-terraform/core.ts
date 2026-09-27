import type { InterviewQuestion } from '../../../types'

/**
 * Terraform questions 1-35 from questions.md: workflow, backends and state, secrets, drift, modules, environments and CI/CD.
 *
 * Source keys: q = questions.md, s = scenario-questions.md, n = notes.md,
 * m = summary.md, r = interview-round-notes.md (section numbers).
 */
export const myTerraformCoreQuestions: InterviewQuestion[] = [
  {
    // Source: q1
    id: 'itv-mytf-1',
    level: 'intermediate',
    kind: 'open',
    prompt: 'How have you used Terraform?',
    probing:
      'Whether you have built real environments with Terraform and can describe the structure, workflow and controls, not just the syntax.',
    answer: [
      'I used Terraform to create repeatable environments. For example, I built a VPC with subnets, security groups, a load balancer, auto scaling servers, and an RDS database. I kept reusable code in modules and environment values in separate folders. All changes went through pull requests, and the pipeline ran plan first and applied only after approval.',
      '**Short answer:** I used Terraform to build cloud environments from code instead of clicking in the console.',
      '**Example of what I built:** An application setup on AWS with:',
      '- One VPC with public and private subnets\n- Security groups\n- A load balancer\n- Auto scaling EC2 instances\n- An RDS database\n- IAM roles\n- DNS records and alarms',
      'Every change went through a pull request. The pipeline ran `fmt`, `validate`, a security scan, and `plan`. Production apply needed an approval.',
      'State was kept in a remote backend that was encrypted, versioned, and locked.',
    ],
    code: [
      {
        title: 'How the work was organized',
        language: 'text',
        code: `modules/      # reusable code: vpc, compute, database
environments/ # dev, test, prod values`,
      },
    ],
    tags: ['experience', 'modules', 'ci/cd'],
  },
  {
    // Source: q2
    id: 'itv-mytf-2',
    level: 'basic',
    kind: 'open',
    prompt: 'How would you create cloud resources with Terraform?',
    probing:
      'That you follow a disciplined workflow from requirements to verification instead of jumping straight to apply.',
    answer: [
      'First I gather requirements, then I set the provider and remote backend and pin versions. I write resources using modules and variables. I run fmt, init, validate, plan, review the plan, and then apply the saved plan. After apply I check the resource in the cloud, because a successful apply only means the API calls worked.',
      '**Steps** (in order):',
      '1. Collect the requirements: what resources, which region, networking, naming, cost.\n2. Configure the provider and the remote backend.\n3. Pin the Terraform and provider versions.\n4. Write the resources, preferably by calling a module.\n5. Use variables for values that change per environment.\n6. Run the normal command flow.\n7. Check the real resource in the cloud after apply.',
    ],
    code: [
      {
        title: 'Command flow',
        language: 'bash',
        code: `terraform fmt
terraform init
terraform validate
terraform plan -out=tfplan
terraform apply tfplan`,
      },
    ],
    tags: ['workflow', 'cli'],
  },
  {
    // Source: q3
    id: 'itv-mytf-3',
    level: 'basic',
    kind: 'open',
    prompt: 'What happens during init, plan, and apply?',
    probing:
      'Whether you know what each core command really does and why a saved plan matters in pipelines.',
    answer: [
      '`init` prepares the working directory and downloads providers and modules. `plan` shows the difference between my code and the real infrastructure without changing anything. `apply` performs those changes and updates the state file. In pipelines I save the plan with `-out` and apply that file, so I apply exactly what was reviewed.',
      '- `terraform init`: Sets up the folder: downloads providers and modules, configures the backend, writes `.terraform.lock.hcl`\n- `terraform plan`: Compares your code with the real infrastructure and shows what will be created, changed, or destroyed\n- `terraform apply`: Makes the changes and saves the result in state',
      '**Points to remember:**',
      '- Run `init` again when the backend, modules, or provider versions change.\n- `plan` changes nothing. It is safe to run any time.\n- `apply tfplan` applies exactly what you reviewed. `apply` without a saved plan makes a fresh plan.',
    ],
    tags: ['workflow', 'cli'],
  },
  {
    // Source: q4
    id: 'itv-mytf-4',
    level: 'basic',
    kind: 'open',
    prompt: 'What is a Terraform backend?',
    probing:
      'Basic understanding of where state lives and the backend limitation around variables.',
    answer: [
      'A backend decides where the state file is stored. Local means the file sits on your machine, which is not good for teams. Remote backends like S3, Azure Storage, or Terraform Cloud allow shared state with encryption, versioning, and locking. Backend settings cannot use normal variables, so I pass them with a backend config file.',
      '**What it is:** A backend is the place where Terraform stores the state file.',
      '- **Local backend:** `terraform.tfstate` on your laptop. Default.\n- **Remote backend:** S3, Azure Storage, GCS, or Terraform Cloud.',
      '**Points to remember:**',
      '- The backend is set up before anything else, so you cannot use normal variables inside it. Use `-backend-config` files instead.\n- Keep one state key per environment.\n- To change backends, run `terraform init -migrate-state` and take a backup first.',
    ],
    code: [
      {
        title: 'Example',
        language: 'hcl',
        code: `terraform {
  backend "s3" {
    bucket = "my-tf-state"
    key    = "prod/app/terraform.tfstate"
    region = "us-east-1"
  }
}`,
      },
    ],
    tags: ['state', 'backend'],
  },
  {
    // Source: q5
    id: 'itv-mytf-5',
    level: 'basic',
    kind: 'open',
    prompt: 'Why use a remote backend?',
    probing:
      'Whether you understand why team use of Terraform needs shared, locked, protected state.',
    answer: [
      'A remote backend gives the team one shared state file with locking, encryption, versioning, and access control. Without it, everyone keeps their own copy and two applies can overwrite each other. It also lets the pipeline run Terraform instead of running it from a laptop.',
      '**Reasons** (in order):',
      '1. **One shared state** instead of a copy on every laptop.\n2. **Locking**, so two people cannot apply at the same time.\n3. **Encryption** of a file that can hold sensitive values.\n4. **Versioning**, so you can restore an older state.\n5. **Access control and audit logs.**\n6. **CI/CD can reach it**, laptops are not needed.',
    ],
    tags: ['state', 'backend'],
  },
  {
    // Source: q6, s33, n2
    id: 'itv-mytf-6',
    level: 'intermediate',
    kind: 'open',
    prompt: 'How do you store the state file securely?',
    probing:
      'That you treat state as sensitive data and know the concrete controls: encryption, versioning, locking and restricted read access.',
    answer: [
      'State goes into a remote backend with encryption, versioning, locking, and restricted access. Each environment has its own state path, and only the deployment identity can write to production. State can contain secrets even when outputs are marked sensitive, so I protect read access as strongly as write access, and I never commit state to Git.',
      '**Checklist** (key points):',
      '- Remote backend with encryption at rest and TLS in transit.\n- Versioning or soft delete turned on.\n- Locking enabled.\n- Separate state path per environment.\n- Only the pipeline identity can write to production state.\n- Never commit state or plan files to Git.',
      '**Important point:** Even if an output is marked `sensitive`, the value can still exist inside the state file. So read access must be protected just like write access.',
      '**Related question: How do you secure the state file?**',
      'State goes in a remote backend with encryption, versioning, locking, and tight IAM, separated per environment, and never in Git. The point I always make is that state can contain secret values, so read access has to be as restricted as write access, and the restore procedure should be tested before you actually need it.',
      '**Checklist** (in order):',
      '1. Remote backend, never local for shared work\n2. Encryption at rest with a managed key\n3. Versioning or soft delete\n4. Locking\n5. IAM: only the pipeline identity writes, few humans read\n6. Separate state per environment\n7. Never in Git',
      '**Revision notes: State file best practices**',
      '1. Remote backend, never a local file for team work.\n2. Locking on.\n3. Encryption at rest and in transit.\n4. Versioning or soft delete for recovery.\n5. One state key per environment and component.\n6. Only the pipeline writes to production state.\n7. Never commit state to Git.\n8. Treat state as sensitive; it can contain secret values.',
    ],
    code: [
      {
        title: 'Example .gitignore',
        language: 'text',
        code: `*.tfstate
*.tfstate.*
.terraform/
*.tfplan`,
      },
      {
        title: 'Example',
        language: 'hcl',
        code: `terraform {
  backend "azurerm" {
    resource_group_name  = "tfstate-rg"
    storage_account_name = "tfstateprod"
    container_name       = "tfstate"
    key                  = "prod/app.tfstate"
  }
}`,
      },
      {
        title: 'Example',
        language: 'hcl',
        code: `terraform {
  backend "s3" {
    bucket       = "my-tf-state"
    key          = "prod/app/terraform.tfstate"
    region       = "us-east-1"
    encrypt      = true
    use_lockfile = true
  }
}`,
      },
    ],
    tags: ['state', 'security'],
  },
  {
    // Source: q7, n4
    id: 'itv-mytf-7',
    level: 'intermediate',
    kind: 'open',
    prompt: 'How do you manage secrets in Terraform?',
    probing:
      'Whether you know that `sensitive` only hides output and how to keep secrets out of Git and, ideally, out of state.',
    answer: [
      'I keep secrets out of Git. The pipeline logs in with a short-lived identity and reads secrets from Key Vault, Vault, or Secrets Manager. I mark variables and outputs as sensitive, but I explain that this only hides them in output, not in state, so the backend must be encrypted with restricted access. Where possible, the application reads the secret at runtime instead of Terraform passing it.',
      '**Rules** (in order):',
      '1. Never hardcode a secret in `.tf` files or in a plain `.tfvars` file in Git.\n2. Read secrets from a secret store at runtime.\n3. Mark variables and outputs as `sensitive`.\n4. Protect the backend, because values can land in state.',
      '**Important point:** `sensitive = true` only hides the value in CLI output. It does not encrypt state.',
      '**Revision notes: Secrets management**',
      '**Rules** (in order):',
      '1. Never hardcode a secret in `.tf` or in a `.tfvars` file that is committed.\n2. Read secrets from Vault, Key Vault, or Secrets Manager at run time.\n3. Mark variables and outputs `sensitive`.\n4. Encrypt state and restrict read access.\n5. Rotate secrets regularly.\n6. Best of all: let the application read the secret at runtime with a managed identity, so Terraform never touches it.',
      '**Remember:** `sensitive = true` hides the value in CLI output only. The value can still be in state.',
    ],
    code: [
      {
        title: 'Example: read from Azure Key Vault',
        language: 'hcl',
        code: `data "azurerm_key_vault_secret" "db_password" {
  name         = "db-password"
  key_vault_id = var.key_vault_id
}

resource "azurerm_mssql_server" "db" {
  name                         = "app-sql"
  administrator_login          = "sqladmin"
  administrator_login_password = data.azurerm_key_vault_secret.db_password.value
}`,
      },
      {
        title: 'Example: mark a variable sensitive',
        language: 'hcl',
        code: `variable "db_password" {
  type      = string
  sensitive = true
}`,
      },
      {
        title: 'Example',
        language: 'hcl',
        code: `data "azurerm_key_vault_secret" "db" {
  name         = "db-password"
  key_vault_id = var.key_vault_id
}`,
      },
    ],
    tags: ['secrets', 'security'],
  },
  {
    // Source: q8
    id: 'itv-mytf-8',
    level: 'intermediate',
    kind: 'open',
    prompt: 'What challenges have you faced with Terraform?',
    probing:
      'Real-world experience: they want concrete problems you hit and the controls you put in place.',
    answer: [
      'The most common ones are drift from manual changes, state conflicts when two people apply together, slow plans on large projects, accidental replacement of resources, and provider version upgrades breaking things. I handle them with locked remote state, smaller state files, pinned versions, reviewed plans, and production approvals.',
      '**Common challenges:**',
      '- **Two people applying at once**: Remote backend with locking, apply only from the pipeline\n- **Manual changes in the console (drift)**: Scheduled plan, restrict console write access\n- **Importing old resources**: Write the code first, then import one resource at a time\n- **Accidental delete or replace**: `prevent_destroy`, review the plan, approvals\n- **Secrets ending up in state**: Encrypted backend, restricted access\n- **Slow plans on big projects**: Split into smaller states\n- **Provider upgrades breaking code**: Pin versions, commit the lock file, upgrade in a separate PR',
    ],
    tags: ['experience', 'operations'],
  },
  {
    // Source: q9, s40, r1
    id: 'itv-mytf-9',
    level: 'intermediate',
    kind: 'open',
    prompt: 'What is drift and how do you detect it?',
    probing:
      'Whether you can define drift, name its causes and detect it automatically with a meaningful exit code.',
    answer: [
      'Drift is when the real resource no longer matches the code, usually after a manual console change. I detect it by running `terraform plan -detailed-exitcode` on a schedule; exit code 2 means drift. I alert with the plan output and check the cloud audit log to see who changed what before deciding what to do.',
      '**What drift is:** Drift means the real infrastructure is different from what your Terraform code says. It usually happens when someone changes something in the console during an incident.',
      '**How to detect it:** Run a plan on a schedule:',
      '- **0**: No changes\n- **1**: Error\n- **2**: Differences found (drift)',
      'Then send an alert with the plan summary and check the cloud activity log to see who changed it.',
      '**Related question: What does it mean when Terraform shows drift?**',
      'Drift means the real resource no longer matches the code, usually from a manual change, another controller, or a changed provider default. I read the diff and the audit log, decide with the owner whether the new value should stay, and then either put it into the code or apply to restore it. The third cause catches people out, so I always check the provider changelog before assuming a human did it.',
      '**It means:** Something in the cloud no longer matches your code.',
      '**Three possible reasons:**',
      '1. Someone changed it manually.\n2. Another tool or controller changed it.\n3. The provider or cloud changed a default value.',
      '**What to do:** Read the diff, check the audit log, decide with the owner, then either update the code or restore the declared value.',
      '**Revision notes: Drift detection and backups**',
      '**Drift:** Drift means the real infrastructure is different from what the code says. Usually someone changed it in the console.',
      'Run it nightly in the pipeline and alert on exit code 2. Terraform Cloud has built-in drift detection, and `driftctl` is another option, although it is now in maintenance mode.',
      '**In a team** (key points):',
      '- Remote backend with locking, so nobody works from a private copy\n- All changes through the pipeline, no console edits\n- Scheduled drift scans with alerts',
      '**Backups** (key points):',
      '- Turn on bucket versioning or soft delete for the state file\n- Encrypt with a managed key and restrict access\n- Never keep state in Git\n- Test the restore before you need it',
    ],
    code: [
      {
        title: 'Run a plan on a schedule',
        language: 'bash',
        code: `terraform plan -detailed-exitcode`,
      },
      {
        title: 'How to detect it',
        language: 'bash',
        code: `terraform plan -detailed-exitcode
# 0 = no change, 1 = error, 2 = drift`,
      },
    ],
    tags: ['drift', 'backups'],
  },
  {
    // Source: q10
    id: 'itv-mytf-10',
    level: 'intermediate',
    kind: 'open',
    prompt: 'How do you fix drift?',
    probing: 'That you investigate before overwriting, and keep the code as the source of truth.',
    answer: [
      'First I find out what changed and why. If the manual change is correct, I put it into the code so the code stays the source of truth. If it is not correct, an approved apply restores the declared value. If the object is not managed at all, I import it. After that I expect a clean plan, and I reduce console write access so it does not happen again.',
      '**Steps** (in order):',
      '1. Find out what changed, who changed it, and why.\n2. Decide with the owner: is the manual change correct?\n3. If it **is** correct, update the Terraform code to match and apply.\n4. If it is **not** correct, apply the code so Terraform puts the value back.\n5. If the resource is not in state at all, import it.\n6. Run a plan again and confirm it is clean.',
    ],
    traps: [
      'Do not auto-revert an emergency fix before someone reviews it.',
      'Do not hide drift with a wide `ignore_changes`.',
    ],
    tags: ['drift'],
  },
  {
    // Source: q11
    id: 'itv-mytf-11',
    level: 'intermediate',
    kind: 'scenario',
    prompt:
      'Terraform created an S3 bucket and someone added a policy manually. How do you fix it?',
    probing:
      'A concrete drift case: can you decide whether to keep or revert a manual policy and bring it under management cleanly.',
    answer: [
      'I check who added the policy and whether it is safe. If it should stay, I write it in Terraform using `aws_iam_policy_document` and import the existing policy so Terraform manages it. Then I plan and confirm no unexpected changes. If it was not approved, Terraform simply replaces it with the reviewed policy.',
      '**Steps** (in order):',
      '1. Look at the current policy and check CloudTrail for who added it.\n2. Decide if the policy should stay.\n3. If yes, write it in code:\n4. If Terraform sees it as an existing separate object, import it:\n5. Run a plan and check the JSON difference. Ordering can look different without changing meaning.\n6. If the policy was not approved, let Terraform replace it and test allow and deny behaviour.',
    ],
    code: [
      {
        title: 'If yes, write it in code',
        language: 'hcl',
        code: `data "aws_iam_policy_document" "bucket" {
  statement {
    effect    = "Allow"
    actions   = ["s3:GetObject"]
    resources = ["\${aws_s3_bucket.app.arn}/*"]

    principals {
      type        = "AWS"
      identifiers = [aws_iam_role.app.arn]
    }
  }
}

resource "aws_s3_bucket_policy" "app" {
  bucket = aws_s3_bucket.app.id
  policy = data.aws_iam_policy_document.bucket.json
}`,
      },
      {
        title: 'If Terraform sees it as an existing separate object, import it',
        language: 'bash',
        code: `terraform import aws_s3_bucket_policy.app my-bucket`,
      },
    ],
    tags: ['drift', 'aws', 'import'],
  },
  {
    // Source: q12
    id: 'itv-mytf-12',
    level: 'intermediate',
    kind: 'open',
    prompt: 'How do you bring existing (unmanaged) resources into Terraform?',
    probing:
      'Whether you know import only maps state and that the configuration has to be written and reconciled by you.',
    answer: [
      'I write the resource block first, back up state, then run `terraform import` with the resource address and the real ID. Import only maps the object into state, so afterwards I run `terraform state show`, copy the important settings into my code, and keep planning until there are no unexpected updates. Related resources like subnets and routes are imported separately.',
      '**Steps** (in order):',
      '1. List the resource, its ID, and its dependencies.\n2. Write a resource block at the address you want to keep permanently.\n3. Back up the state.\n4. Import.\n5. Fill in the missing arguments until the plan is clean.',
      '**Important point:** Import only links the real object to a resource address. It does not write your configuration for you. Keep planning until Terraform shows no unwanted changes.',
    ],
    code: [
      {
        title: 'Example',
        language: 'bash',
        code: `terraform import 'module.network.aws_vpc.main' vpc-012345
terraform state show 'module.network.aws_vpc.main'
terraform plan`,
      },
      {
        title: 'Import block (Terraform 1.5+)',
        language: 'hcl',
        code: `import {
  to = aws_vpc.main
  id = "vpc-012345"
}`,
      },
    ],
    tags: ['import', 'state'],
  },
  {
    // Source: q13
    id: 'itv-mytf-13',
    level: 'intermediate',
    kind: 'open',
    prompt: 'What is the difference between `count` and `for_each`?',
    probing:
      'Whether you understand address stability and why removing an item from a `count` list is dangerous.',
    answer: [
      '`count` gives numbered instances and is fine when the resources are identical. `for_each` gives named instances from a map or set, which is safer when each item has an identity, because removing one item does not shift the others. If I switch between them, I use `moved` blocks so Terraform does not recreate resources.',
      '- `count`: Creates numbered instances: `aws_subnet.app[0]` - `for_each`: Creates named instances: `aws_subnet.app["web"]`\n- `count`: Good for identical copies or an on/off switch - `for_each`: Good for named items with different values\n- `count`: Removing a middle item shifts all later indexes - `for_each`: Keys stay stable when an item is removed',
      '**Important point:** Switching from `count` to `for_each` changes resource addresses, so Terraform may want to destroy and recreate. Use a `moved` block or `terraform state mv` to avoid that.',
    ],
    code: [
      {
        title: 'count example',
        language: 'hcl',
        code: `resource "aws_instance" "web" {
  count         = 3
  ami           = var.ami
  instance_type = "t3.micro"
}`,
      },
      {
        title: 'for_each example',
        language: 'hcl',
        code: `variable "subnets" {
  type = map(object({
    cidr = string
    az   = string
  }))
}

resource "aws_subnet" "app" {
  for_each          = var.subnets
  vpc_id            = aws_vpc.main.id
  cidr_block        = each.value.cidr
  availability_zone = each.value.az
}`,
      },
    ],
    tags: ['meta-arguments', 'count', 'for_each'],
  },
  {
    // Source: q14
    id: 'itv-mytf-14',
    level: 'basic',
    kind: 'open',
    prompt: 'What is a lifecycle block?',
    probing: 'Knowledge of the lifecycle options and their limits, not just their names.',
    answer: [
      '`lifecycle` changes how Terraform handles a resource. I use `prevent_destroy` on production databases, and `create_before_destroy` when the old and new resource can exist together. I use `ignore_changes` when another system owns a field like a tag, and `replace_triggered_by` when a change elsewhere must force a replacement. These are helpers, not full protection, so I also use cloud deletion protection and approvals.',
      '**The four options:**',
      '- `prevent_destroy`: Terraform fails instead of deleting the resource\n- `create_before_destroy`: Creates the new resource first, then deletes the old one\n- `ignore_changes`: Ignores changes to listed attributes\n- `replace_triggered_by`: Replaces this resource when another one changes',
      '**Points to remember:**',
      '- `prevent_destroy` does not help if you delete the whole resource block from the code.\n- `create_before_destroy` can fail when names must be unique or quota is full.\n- A wide `ignore_changes` hides real drift, so keep it narrow.',
    ],
    code: [
      {
        title: 'Example',
        language: 'hcl',
        code: `resource "aws_db_instance" "prod" {
  identifier = "prod-db"

  lifecycle {
    prevent_destroy = true
  }
}

resource "aws_instance" "web" {
  ami = var.ami

  lifecycle {
    create_before_destroy = true
    ignore_changes        = [tags["LastScanned"]]
  }
}`,
      },
    ],
    tags: ['lifecycle'],
  },
  {
    // Source: q15
    id: 'itv-mytf-15',
    level: 'advanced',
    kind: 'open',
    prompt: 'How do you allow plan and apply but block deletion?',
    probing:
      'Whether you know there is no single switch for this and can layer Terraform, cloud, policy and IAM controls.',
    answer: [
      'There is no single flag for it, so I use layers. `prevent_destroy` on critical resources, deletion protection on the cloud side, a policy check that rejects plans containing deletes, and pipeline credentials without delete rights. Init, validate, and plan stay allowed because they only read. When a delete is genuinely needed, it goes through a documented break-glass approval.',
      '**Layers of protection:**',
      '1. `lifecycle { prevent_destroy = true }` on critical resources.\n2. Deletion protection on the cloud resource itself (RDS, load balancer, storage).\n3. A policy check (Sentinel, OPA, Checkov) that fails the pipeline if the plan contains a delete.\n4. Pipeline credentials that do not have delete permission, with a separate break-glass role.\n5. Manual approval before production apply.',
      '**Important point:** There is no single Terraform switch that says "allow every update but never delete", because a replacement includes a delete.',
    ],
    followUps: [
      'How would you write the policy check that fails a plan containing a delete?',
      'How does the break-glass process work when a delete is genuinely needed?',
    ],
    tags: ['lifecycle', 'policy', 'safety'],
  },
  {
    // Source: q16
    id: 'itv-mytf-16',
    level: 'basic',
    kind: 'open',
    prompt: 'What are `taint` and `untaint`?',
    probing:
      'Whether you know `taint` is deprecated and why `-replace` is the better, visible alternative.',
    answer: [
      '`taint` marks a resource in state so it gets recreated on the next apply, and `untaint` removes that mark. It is deprecated now, so I prefer `terraform apply -replace=<address>` because the replacement is visible in the plan instead of hidden in state. For databases or disks I never use replacement as a quick troubleshooting step.',
      '**What they do** (key points):',
      '- `terraform taint <address>` marks a resource in state as bad, so the next apply replaces it.\n- `terraform untaint <address>` removes that mark.',
      '**Better way today:** `taint` is deprecated. Use an explicit replace:',
      '**Before replacing anything, check:**',
      '- What depends on this resource\n- Whether it holds data\n- Whether downtime is acceptable\n- Whether create-before-destroy is possible',
    ],
    code: [
      {
        title: 'taint is deprecated. Use an explicit replace',
        language: 'bash',
        code: `terraform plan -replace='aws_instance.web' -out=tfplan
terraform apply tfplan`,
      },
    ],
    tags: ['state', 'replacement'],
  },
  {
    // Source: q17
    id: 'itv-mytf-17',
    level: 'intermediate',
    kind: 'scenario',
    prompt: 'A resource is not updating properly. Do taint and untaint help?',
    probing: 'That you diagnose the reason before reaching for replacement as a fix.',
    answer: [
      'I do not start with taint. First I check the plan, the provider error, whether the field is immutable, and whether `ignore_changes` is hiding it. If the object really needs to be rebuilt, I use `apply -replace` so the change is visible in the plan. If someone tainted a healthy resource by mistake, `untaint` avoids an unnecessary replacement.',
      '**First find out why it is not updating:**',
      '1. Read the plan. Does Terraform even see a change?\n2. Check if the field is immutable, which forces a replacement.\n3. Check whether `ignore_changes` is hiding it.\n4. Check provider errors and permissions.\n5. Check whether another tool is changing it back.',
      '**Then decide** (key points):',
      '- If the code or input was wrong, fix it and apply. No replacement needed.\n- If the resource really must be rebuilt, use `-replace` and review every dependent change.\n- If someone tainted a healthy resource by mistake, run `terraform untaint <address>` and plan again.',
    ],
    tags: ['troubleshooting', 'replacement'],
  },
  {
    // Source: q18
    id: 'itv-mytf-18',
    level: 'basic',
    kind: 'open',
    prompt: 'What is the difference between stateful and stateless resources?',
    probing:
      'Whether you think about data when Terraform replaces things, and know that state is not a data backup.',
    answer: [
      'Stateful resources hold business data, like databases, disks, and buckets, so replacing them needs backups, replication, and a cutover plan. Stateless resources such as web servers keep no data and can be recreated behind a load balancer. I also mention that the Terraform state file is not a data backup; it only tracks resource details.',
      '- **Stateful**: Holds data: database, disk, storage bucket, queue - **Stateless**: Holds no data: web server, container, VM behind a load balancer\n- **Stateful**: Replacement needs backup and a data plan - **Stateless**: Can be replaced freely\n- **Stateful**: Delete is dangerous - **Stateless**: Delete is normal\n- **Stateful**: Use `prevent_destroy` and deletion protection - **Stateless**: Use immutable replacement and health checks',
      '**Important point:** The Terraform state file is not a backup of your data. It only records resource IDs and attributes.',
    ],
    tags: ['concepts', 'data'],
  },
  {
    // Source: q19
    id: 'itv-mytf-19',
    level: 'intermediate',
    kind: 'open',
    prompt: 'How do you reuse the same code for different environments?',
    probing:
      'Whether you keep shared logic in versioned modules and environment differences in values, not in conditionals.',
    answer: [
      'I keep the common code in versioned modules and give each environment its own small root folder with its own backend, variables, and approvals. Dev and prod call the same module version but pass different values. I avoid writing `if environment == prod` inside modules, because that hides the differences.',
      '**How it works:** Both environments call the same module version and pass different values.',
      'Dev passes a small CIDR and one NAT gateway. Prod passes a bigger CIDR and one NAT gateway per zone.',
    ],
    code: [
      {
        title: 'Folder layout',
        language: 'text',
        code: `modules/
  vpc/
  compute/
  database/
environments/
  dev/
    main.tf
    backend.tf
    dev.tfvars
  prod/
    main.tf
    backend.tf
    prod.tfvars`,
      },
      {
        title: 'Both environments call the same module version and pass different values',
        language: 'hcl',
        code: `module "vpc" {
  source  = "git::https://github.com/myorg/tf-modules.git//vpc?ref=v1.4.0"
  cidr    = var.vpc_cidr
  subnets = var.subnets
}`,
      },
    ],
    tags: ['environments', 'modules'],
  },
  {
    // Source: q20, m3, m7
    id: 'itv-mytf-20',
    level: 'basic',
    kind: 'open',
    prompt: 'What is a Terraform module and why use it?',
    probing: 'The basic definition of root and child modules and the reasons to use modules.',
    answer: [
      'A module is a folder of Terraform code with defined inputs and outputs. The folder I run Terraform in is the root module, and anything I call with a `module` block is a child module. I use modules so teams do not repeat the same resource blocks and so standards like tagging and encryption are applied everywhere. I keep them small, versioned, and documented.',
      '**What it is:** A module is just a folder of Terraform files with inputs and outputs.',
      '- **Root module:** the folder where you run `terraform apply`.\n- **Child module:** any folder called with a `module` block.',
      '**Why use it** (in order):',
      '1. Write once, use many times.\n2. Standard tags, encryption, and naming everywhere.\n3. Teams do not copy and paste dozens of resource blocks.\n4. You can version it and upgrade safely.',
      '**Revision notes: What is a module?**',
      'A module is a reusable folder of Terraform code with defined inputs and outputs. Instead of copying the same resource blocks into every project, I put the pattern in a module, version it, and call it with different variables. That gives reuse and also consistent tagging, encryption, and naming.',
      'A module is a folder of Terraform code that you can reuse.',
      '- **Local module:** `./modules/vm`\n- **Remote module:** from the registry or a Git repo',
      '**Why use one** (in order):',
      '1. Write once, use many times.\n2. Keep the code organised.\n3. Every team gets the same standards.',
      '**Example:** Instead of copying the same VM block everywhere:',
      '**Revision notes: Root and child modules**',
      '- The folder you run Terraform in is the **root module**.\n- Anything called with a `module` block is a **child module**.',
      '**Rules for a good child module:**',
      '1. One purpose.\n2. Typed inputs with validation.\n3. Useful outputs.\n4. No environment names or credentials inside.\n5. Provider configuration stays at the root.\n6. Documented and versioned.',
    ],
    code: [
      {
        title: 'Example',
        language: 'hcl',
        code: `module "app_server" {
  source        = "./modules/ec2"
  name          = "app-server"
  instance_type = "t3.small"
  subnet_id     = module.vpc.private_subnet_ids[0]
}`,
      },
      {
        title: 'Instead of copying the same VM block everywhere',
        language: 'hcl',
        code: `module "app_server" {
  source       = "./modules/gcp_vm"
  vm_name      = "app-server"
  machine_type = "e2-medium"
}

module "web_server" {
  source       = "./modules/gcp_vm"
  vm_name      = "web-server"
  machine_type = "e2-small"
}`,
      },
      {
        title: 'How values flow',
        language: 'text',
        code: `tfvars -> root variables -> module inputs -> resources
resources -> module outputs -> root outputs`,
      },
    ],
    traps: ['One giant module with 40 boolean flags. Keep modules small and focused.'],
    tags: ['modules'],
  },
  {
    // Source: q21
    id: 'itv-mytf-21',
    level: 'intermediate',
    kind: 'open',
    prompt: 'How do you create IAM roles in Terraform?',
    probing:
      'Whether you separate trust from permissions and write least-privilege policies with policy documents.',
    answer: [
      'I separate the trust policy from the permission policy. I build both with `aws_iam_policy_document` so the JSON is valid and can use variables. I keep permissions least privilege and avoid wildcards. When the same role pattern repeats, I put it in a module with required tags and boundaries, and I test the access after applying.',
      '**Two parts of a role:**',
      '1. **Trust policy:** who can assume the role.\n2. **Permission policy:** what the role can do.',
      '**Good practices** (key points):',
      '- Use `aws_iam_policy_document` instead of hand-written JSON strings.\n- Give only the actions that are needed. Avoid `"*"`.\n- Use a module when the same role pattern repeats.\n- Test the access after apply and check CloudTrail.',
    ],
    code: [
      {
        title: 'Example',
        language: 'hcl',
        code: `data "aws_iam_policy_document" "trust" {
  statement {
    actions = ["sts:AssumeRole"]

    principals {
      type        = "Service"
      identifiers = ["ec2.amazonaws.com"]
    }
  }
}

resource "aws_iam_role" "app" {
  name               = "app-role"
  assume_role_policy = data.aws_iam_policy_document.trust.json
}

resource "aws_iam_role_policy_attachment" "app_s3" {
  role       = aws_iam_role.app.name
  policy_arn = aws_iam_policy.app_s3.arn
}`,
      },
    ],
    tags: ['aws', 'iam'],
  },
  {
    // Source: q22
    id: 'itv-mytf-22',
    level: 'intermediate',
    kind: 'open',
    prompt: 'How do you create an autoscaling group?',
    probing:
      'Practical AWS knowledge: launch template, ASG sizing, health checks, and testing that it really scales.',
    answer: [
      'I create a launch template with the approved image, security groups, and instance profile. Then I add an autoscaling group that spreads across availability zones, with min, desired, and max capacity, target group attachment, and health checks. I add a scaling policy on a real metric like CPU or request count. After apply I test scale-out and instance replacement, because seeing the resource created is not proof it works.',
      '**Two pieces** (in order):',
      '1. A launch template that describes the instance.\n2. An autoscaling group that runs several of them.',
      '**After apply, test:**',
      '- Scale out works\n- New instances register as healthy in the target group\n- Terminating one instance brings a new one back',
    ],
    code: [
      {
        title: 'Example',
        language: 'hcl',
        code: `resource "aws_launch_template" "web" {
  name_prefix   = "web-"
  image_id      = var.ami_id
  instance_type = "t3.small"

  vpc_security_group_ids = [aws_security_group.web.id]
}

resource "aws_autoscaling_group" "web" {
  name                = "web-asg"
  vpc_zone_identifier = module.vpc.private_subnet_ids
  target_group_arns   = [aws_lb_target_group.web.arn]

  min_size         = 2
  desired_capacity = 2
  max_size         = 6

  health_check_type         = "ELB"
  health_check_grace_period = 60

  launch_template {
    id      = aws_launch_template.web.id
    version = "$Latest"
  }
}`,
      },
    ],
    tags: ['aws', 'autoscaling'],
  },
  {
    // Source: q23, s46
    id: 'itv-mytf-23',
    level: 'intermediate',
    kind: 'open',
    prompt: 'How did you set up Terraform in CI/CD?',
    probing:
      'Whether your pipeline separates plan on PR from a gated apply of the same reviewed plan.',
    answer: [
      'On a pull request the pipeline runs fmt, init, validate, a security scan, and a plan with read-only credentials, and posts the plan summary for review. After merge, a protected stage applies the reviewed plan for that same commit, with production approval and only one job per state. Credentials come from workload identity, and after apply I run a smoke test.',
      'The plan summary is posted as a PR comment. The full plan file is kept as a protected artifact, because plans can show sensitive values.',
      '**After merge** (in order):',
      '1. A protected job picks up the same commit.\n2. It gets the state lock.\n3. It waits for approval on production.\n4. It runs `terraform apply tfplan`.\n5. It runs a smoke check afterwards.',
      '**Rules** (key points):',
      '- Only the deployment job can apply.\n- Only one deployment at a time per state.\n- Credentials come from OIDC / workload identity, not stored secrets.',
      '**Related question: How do you build a CI/CD pipeline for Terraform?**',
      'The pull request stage runs fmt, validate, a security scan, and a plan with read-only credentials, and posts the plan for review. After merge, a protected environment requires approval and applies that same reviewed plan, followed by a smoke test. Credentials come from OIDC, state is locked, and only one apply runs per state.',
    ],
    code: [
      {
        title: 'On a pull request',
        language: 'yaml',
        code: `- terraform fmt -check
- terraform init
- terraform validate
- tfsec .        # or checkov
- terraform plan -out=tfplan`,
      },
      {
        title: 'Stages',
        language: 'text',
        code: `1. Checkout
2. fmt + validate
3. Security scan (tfsec / Checkov)
4. terraform plan -out=tfplan   (read-only credentials)
5. Post plan to the pull request
6. Manual approval           <- production only
7. terraform apply tfplan
8. Smoke test`,
      },
      {
        title: 'GitHub Actions example',
        language: 'yaml',
        code: `jobs:
  plan:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: hashicorp/setup-terraform@v3
      - run: terraform init
      - run: terraform validate
      - run: terraform plan -out=tfplan

  apply:
    needs: plan
    environment: production   # requires approval
    steps:
      - run: terraform apply tfplan`,
      },
    ],
    tags: ['ci/cd', 'pipelines'],
  },
  {
    // Source: q24
    id: 'itv-mytf-24',
    level: 'advanced',
    kind: 'open',
    prompt: 'How do you run Terraform safely in a pipeline?',
    probing:
      'Senior operational judgement: versions, state, credentials, concurrency and what happens on failure.',
    answer: [
      'I pin versions, use locked remote state per environment, and get short-lived credentials from workload identity. PRs run plan and policy checks; production applies the reviewed plan after approval, one job at a time. If an apply fails halfway, the pipeline stops and an engineer compares state with the real resources instead of blindly retrying or destroying.',
      '**Safety list** (at a glance):',
      '- **Versions**: Pin Terraform, providers, and modules; commit the lock file\n- **State**: Remote, encrypted, versioned, locked, separate per environment\n- **Credentials**: Short-lived OIDC credentials, least privilege\n- **Review**: Plan on PR, approval before production apply\n- **Concurrency**: One apply per state\n- **Failure**: Stop the pipeline. Do not auto-retry, do not auto-destroy\n- **After apply**: Smoke test the application, not just the resource',
    ],
    followUps: [
      'How do you make sure the apply uses exactly the plan that was reviewed?',
      'What do you do when an apply fails halfway in the pipeline?',
    ],
    tags: ['ci/cd', 'safety'],
  },
  {
    // Source: q25, s50, n11
    id: 'itv-mytf-25',
    level: 'intermediate',
    kind: 'open',
    prompt: 'How do you manage deployments for multiple environments?',
    probing:
      'That environments are isolated by state, credentials and approvals, and promoted with the same module version.',
    answer: [
      'Each environment gets its own root folder, state key, credentials, variables, and approval. The shared logic lives in versioned modules that each environment pins. The pipeline maps a folder to exactly one environment so a job cannot mix dev code with prod credentials. A change is proven in dev and test before the same module version is promoted to production.',
      '**Rules I follow** (in order):',
      '1. Each environment has its own folder, backend key, and variables file.\n2. Each environment has its own cloud account or subscription where possible.\n3. Each environment has its own identity and approval level.\n4. Shared modules are versioned, and each environment pins a version.\n5. The pipeline maps one folder to exactly one environment, so a dev job can never use prod credentials.',
      '**Related question: How do you manage dev, QA, and prod with Terraform?**',
      'Shared modules hold the logic, and each environment has its own folder with its own backend, variables, credentials, and approvals. What differs between environments is values like sizing, retention, and protection settings, not the code itself. A change is proven in dev and QA before the same module version is promoted to production.',
      '**What differs per environment:**',
      '- **Instance size**: Dev: Small; Prod: Right-sized\n- **Node count**: Dev: 1; Prod: 3 or more\n- **Backups**: Dev: Short retention; Prod: Long retention\n- **Approval**: Dev: None; Prod: Required\n- **Deletion protection**: Dev: Off; Prod: On',
      '**Promotion:** Prove the change in dev, then QA, then apply the same module version to prod with different values.',
      '**Revision notes: Managing multiple environments**',
      '1. Separate backend key per environment.\n2. Separate credentials and approvals.\n3. Same module version, different values.\n4. Consistent naming, for example `app-dev-vpc` and `app-prod-vpc`.\n5. The pipeline picks the folder, so a job cannot mix dev code with prod credentials.',
    ],
    code: [
      {
        title: 'Promotion flow',
        language: 'text',
        code: `dev  -> test the change works
test -> test upgrade and recovery
prod -> same module version, different values, with approval`,
      },
      {
        title: 'Layout',
        language: 'text',
        code: `modules/                 shared, versioned code
environments/
  dev/    backend.tf  dev.tfvars
  qa/     backend.tf  qa.tfvars
  prod/   backend.tf  prod.tfvars`,
      },
      {
        title: 'Example',
        language: 'text',
        code: `modules/                shared code
environments/
  dev/    backend.tf  dev.tfvars
  test/   backend.tf  test.tfvars
  prod/   backend.tf  prod.tfvars`,
      },
    ],
    tags: ['environments', 'promotion'],
  },
  {
    // Source: q26
    id: 'itv-mytf-26',
    level: 'advanced',
    kind: 'open',
    prompt: 'You need infrastructure in 10 AWS regions. How do you structure it?',
    probing:
      'Design thinking about blast radius, state boundaries and global versus regional resources.',
    answer: [
      'I build one regional module and give every region its own state so a failure in one region does not block the rest. A pipeline matrix runs the plans in parallel and controls apply concurrency. Region-specific values like CIDRs and availability zones come from variables. Global resources like IAM and DNS live in a separate global stack.',
      '**Approach** (in order):',
      '1. Write one reusable regional module.\n2. Give each region its own state file.\n3. Use a pipeline matrix to plan all regions in parallel and control how many apply at once.\n4. Keep global resources such as IAM, Route 53, and CloudFront in a separate global stack.',
      '**Why not one big state with provider aliases?** Provider aliases work for a small fixed list, but with one state:',
      '- One failed region can block all the others.\n- The blast radius is huge.\n- Plans get slow.',
    ],
    followUps: [
      'How would you control how many regions apply at the same time?',
      'Where do global resources such as IAM and Route 53 live, and how do regional stacks consume them?',
    ],
    tags: ['multi-region', 'design'],
  },
  {
    // Source: q27, s17
    id: 'itv-mytf-27',
    level: 'advanced',
    kind: 'scenario',
    prompt: 'The state file is getting too large. What do you do?',
    probing:
      'Whether you can split state along sensible boundaries and move resources without destroying anything.',
    answer: [
      'I split the state by lifecycle and ownership, for example network, platform, data, and application. The goal is smaller blast radius and faster plans, not a fixed resource count. Moving resources is a migration, so I back up state, use `moved` blocks or `terraform state mv`, and confirm both old and new stacks plan clean before normal deployments continue.',
      'Good boundaries follow ownership, environment, and how often something changes.',
      '**How to move resources safely:**',
      '1. Back up and lock the state.\n2. Add `moved` blocks, or use `terraform state mv` between the exact states.\n3. Make sure no resource is owned by two states at the same time.\n4. Run a plan in both the old and the new stack. Both must show no changes.',
      '**Connecting the stacks:** Use small stable outputs, data sources, or DNS names, not one big shared state.',
      '**Related question: The state file is huge and plans take forever. What do you do?**',
      'A slow plan usually means one state holds too much, so I split it by lifecycle and ownership: network, platform, data, and application. The move itself is a migration, so I back up state and use `moved` blocks, then confirm both stacks plan clean. I also remove broad data sources and unnecessary `depends_on`, and cache providers in CI.',
      'Back up state first, and both stacks must plan clean afterwards.',
      '**Other speedups** (key points):',
      '- Replace broad data sources with variables\n- Remove unnecessary `depends_on`\n- Cache providers in CI',
    ],
    code: [
      {
        title: 'Split it by boundary',
        language: 'text',
        code: `network-state    -> VPC, subnets, routes
platform-state   -> cluster, shared services
data-state       -> databases, buckets
app-state        -> application resources`,
      },
      {
        title: 'Split it',
        language: 'text',
        code: `network-state   -> VPC, subnets, routing
platform-state  -> cluster, shared services
data-state      -> databases, storage
app-state       -> application resources`,
      },
      {
        title: 'Move safely',
        language: 'hcl',
        code: `moved {
  from = aws_subnet.private
  to   = module.network.aws_subnet.private
}`,
      },
    ],
    followUps: [
      'How do you prove that no resource ended up owned by two states?',
      'How do the split stacks share values afterwards?',
    ],
    tags: ['state', 'performance', 'refactoring'],
  },
  {
    // Source: q28, s41, n5
    id: 'itv-mytf-28',
    level: 'intermediate',
    kind: 'open',
    prompt: 'How do you make Terraform runs faster?',
    probing:
      'That you measure first and know the real fixes, and that `-target` is not one of them.',
    answer: [
      'I measure first: is the time going to provider downloads, refresh, or apply? Then I split large states, remove broad data sources and unnecessary `depends_on`, cache providers in CI, and run independent states in parallel. I avoid using `-target` routinely because it hides changes, and I keep a scheduled full plan so the speedups do not hide drift.',
      '**First measure where the time goes:**',
      '- Provider and module download\n- Refresh (API calls for every resource)\n- Data sources\n- Apply itself',
      '**Then fix** (at a glance):',
      '- **Too many resources in one state**: Split into smaller states\n- **Broad data sources scanning everything**: Pass IDs as variables instead\n- Extra `depends_on`: Remove it and let Terraform infer dependencies\n- **Downloading providers every run**: Use a provider cache or mirror in CI\n- **Slow apply**: Tune `-parallelism` within API rate limits',
      '**Related question: How do you reduce total Terraform execution time?**',
      'The biggest win is splitting large states, because refresh is normally the bottleneck. After that: cache providers in CI, replace broad data sources with variables, and run independent stacks in parallel. I tune parallelism carefully since raising it can trigger throttling. And whatever I narrow for speed, I keep a scheduled full plan so nothing is hidden.',
      '**Quick wins** (at a glance):',
      '- **Split large states**: Biggest win, refresh is the usual bottleneck\n- **Cache providers in CI**: Saves the download every run\n- **Replace broad data sources with variables**: Fewer API calls\n- **Run independent stacks in parallel**: Wall-clock time drops\n- Tune `-parallelism`: Helps or hurts depending on throttling',
      '**Keep a full plan somewhere:** If you optimize by narrowing scope, keep a scheduled full plan so nothing goes unnoticed.',
      '**Revision notes: Performance on large infrastructure**',
      '- **One huge state**: Split by component and environment\n- **Slow refresh**: Fewer resources per state\n- **Broad data sources**: Pass IDs in as variables\n- **Provider download every run**: Cache or mirror providers in CI\n- **API throttling**: Lower `-parallelism`, enable provider retries\n- Extra `depends_on`: Remove it, let Terraform infer',
      'Avoid using `-target` as a normal habit. It gives an incomplete plan.',
    ],
    traps: [
      'Do not make `-target` your normal way to work. It produces an incomplete plan and hides changes.',
    ],
    tags: ['performance'],
  },
  {
    // Source: q29
    id: 'itv-mytf-29',
    level: 'intermediate',
    kind: 'scenario',
    prompt: 'Apply succeeded but the resource is not working. How do you debug?',
    probing:
      'Whether you understand that a successful apply only means the API accepted the calls, and debug from the user path.',
    answer: [
      'A successful apply only proves the API calls worked. I start from the failing user path and check DNS, routing, security groups, IAM, and application logs. I compare my code, the plan, and `terraform state show` with what the console shows. I enable `TF_LOG` only briefly because it can expose sensitive values, and I never edit state to fix a runtime problem.',
      '**Important point:** A successful apply only means the cloud API accepted the request. It does not mean the service works.',
      '**Debug order** (in order):',
      '1. Start from the failing user path.\n2. Check DNS, route tables, security groups, and NSG rules.\n3. Check IAM permissions.\n4. Check service health and bootstrap logs.\n5. Compare the code, the plan, and `terraform state show` with the console.',
    ],
    code: [
      {
        title: 'Useful commands',
        language: 'bash',
        code: `terraform state show aws_instance.web
terraform output
TF_LOG=DEBUG terraform plan   # use briefly, logs can show secrets`,
      },
    ],
    tags: ['troubleshooting'],
  },
  {
    // Source: q30, s42
    id: 'itv-mytf-30',
    level: 'advanced',
    kind: 'scenario',
    prompt: 'A production apply failed halfway. How do you recover?',
    probing:
      'Calm incident handling: preserve evidence, reconcile state with reality, fix the cause, never destroy to clean up.',
    answer: [
      'Terraform records the resources that succeeded, so I stop retries, keep evidence, and find out exactly what was created. If something exists in the cloud but not in state, I import it; if state has something that no longer exists, I decide carefully before removing it. Then I fix the real cause, run a fresh full plan, review it, and apply. I never destroy everything to clean up.',
      '**Steps** (in order):',
      '1. Stop automatic retries and keep the lock until you know nothing is running.\n2. Save the error, the plan, the state version, and the cloud activity log.\n3. Find which resources were actually created.\n4. Fix the customer impact first.\n5. Reconcile state: Resource created but not in state → import it. In state but does not exist → decide to recreate or `state rm`.\n6. Fix the real cause: quota, permission, name conflict, network, provider bug.\n7. Run a new full plan, review it, apply, and verify.',
      '**Related question: What if the apply fails halfway?**',
      'Terraform keeps whatever succeeded in state, so it is not all-or-nothing. I stop retries, read the exact error, and compare state with the real resources. If something was created but not recorded, I import it; if state has something that no longer exists, I decide carefully. Then I fix the actual cause, run a fresh full plan, and apply. I never destroy everything to clean up.',
      '**What Terraform does:** Resources that succeeded are recorded in state. Terraform does not roll back the ones already created.',
      '**Steps** (in order):',
      '1. Stop retries.\n2. Read the exact error and resource address.\n3. Compare state with the real cloud resources.\n4. Reconcile: Created but not in state → import it; In state but missing → decide recreate or `state rm`\n5. Fix the real cause: quota, permission, name conflict, network.\n6. Run a fresh full plan, review, apply, verify.',
    ],
    traps: [
      'Do not run `terraform destroy` to "clean up". It can delete working dependencies.',
      'Do not run destroy to "clean up", and do not blindly re-run apply hoping it works.',
    ],
    followUps: [
      'How do you find resources that were created but never recorded in state?',
      'When would you use `terraform state rm` during the recovery?',
    ],
    tags: ['troubleshooting', 'state', 'incident'],
  },
  {
    // Source: q31
    id: 'itv-mytf-31',
    level: 'intermediate',
    kind: 'open',
    prompt: 'How do you manage the state file day to day?',
    probing: 'Whether you treat state operations with the care of a production database change.',
    answer: [
      'I treat state as a protected production database: encrypted, versioned, locked, with least-privilege access and separate states per environment. All normal changes go through the pipeline. Before any state operation I confirm the backend key, check that no apply is running, and pull a backup. I use supported commands like `state mv`, `state rm`, `import`, and `moved` blocks instead of editing the JSON.',
      '**Treat state like a production database:**',
      '- Encrypted, versioned, locked remote backend.\n- Least privilege access, audit logs on.\n- Separate state per environment and component.\n- All normal changes go through the pipeline.',
      '**Before any state operation:**',
      '1. Confirm the exact backend key and workspace.\n2. Make sure no apply is running.\n3. Save a backup: `terraform state pull > backup.tfstate`.\n4. Do one change at a time.\n5. Run a full plan afterwards.',
    ],
    code: [
      {
        title: 'Safe commands',
        language: 'bash',
        code: `terraform state list
terraform state show <address>
terraform state mv <old> <new>
terraform state rm <address>     # stops managing, does not delete the resource
terraform import <address> <id>`,
      },
    ],
    tags: ['state', 'operations'],
  },
  {
    // Source: q32, s32, n8, n12
    id: 'itv-mytf-32',
    level: 'intermediate',
    kind: 'open',
    prompt: 'How do you handle provider or module version problems?',
    probing: 'Version pinning discipline, the role of the lock file and a safe upgrade process.',
    answer: [
      'I check `required_version`, the provider constraints, the lock file, and the module version, and `terraform providers` shows which module needs what. I pin ranges and commit the lock file. Upgrades happen in their own pull request after reading the release notes, testing in a lower environment, and comparing plans. I never delete the lock file just to make the pipeline pass.',
      'Also check `.terraform.lock.hcl` and the module `version` argument.',
      '**Upgrade process** (in order):',
      '1. Do it in its own pull request.\n2. Read the release notes for breaking changes.\n3. Run `init -upgrade`, validate, and test.\n4. Compare the plan in a lower environment first.\n5. Then promote.',
      '**Related question: How do you handle provider version conflicts?**',
      'I pin `required_version` and provider constraints and commit the lock file so CI and laptops resolve the same versions. `terraform providers` shows which module is pulling in a conflicting constraint, which is usually an old module needing an update. Upgrades happen deliberately in their own pull request, and I never delete the lock file just to make the pipeline pass.',
      '**Commit the lock file:** `.terraform.lock.hcl` belongs in Git for root modules. It keeps CI and laptops on the same versions.',
      '**Revision notes: Versioning modules and providers**',
      '**Rules** (in order):',
      '1. Pin versions in root modules and commit `.terraform.lock.hcl`.\n2. Use semantic versioning for your own modules.\n3. Upgrade in a dedicated pull request after reading the release notes.\n4. Test the upgrade in a lower environment first.\n5. Keep a changelog for your modules.',
      '**Revision notes: Provider compatibility**',
      '1. Pin with `~>` so patch updates come in but major versions do not.\n2. Commit the lock file so CI and laptops match.\n3. `terraform providers` shows which module requires which provider.\n4. Read the release notes before upgrading; providers do have breaking changes.\n5. Never delete the lock file just to make CI pass.',
    ],
    code: [
      {
        title: 'Where to look',
        language: 'hcl',
        code: `terraform {
  required_version = ">= 1.6.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.40"
    }
  }
}`,
      },
      {
        title: 'Useful command',
        language: 'bash',
        code: `terraform providers        # shows which module needs which provider
terraform init -upgrade    # only when you intend to upgrade`,
      },
      {
        title: 'Debug',
        language: 'bash',
        code: `terraform providers        # which module needs which provider
terraform version
terraform init -upgrade    # only when upgrading on purpose`,
      },
      {
        title: 'Example',
        language: 'hcl',
        code: `terraform {
  required_version = ">= 1.6.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.40"
    }
  }
}

module "vpc" {
  source  = "terraform-aws-modules/vpc/aws"
  version = "5.8.1"
}`,
      },
    ],
    traps: [
      'Do not delete `.terraform.lock.hcl` just to make CI pass. Find out why local and CI picked different versions.',
    ],
    tags: ['versions', 'providers', 'modules'],
  },
  {
    // Source: q33, s45
    id: 'itv-mytf-33',
    level: 'intermediate',
    kind: 'open',
    prompt: 'What happens if two people apply at the same time?',
    probing:
      'Whether you know what locking prevents and that pipeline serialization is still needed on top.',
    answer: [
      'Without locking, both runs plan from the same old state and can overwrite each other, which causes lost state entries or duplicate resources. A remote backend with locking makes the second run wait or fail. I also serialize the deployment job per state, because locking protects the file but not the logic. If a lock is stuck after a crash, I confirm no apply is running before using `force-unlock` with the exact ID.',
      '**Without locking:** Both read the same old state, make conflicting changes, and the last write wins. You can end up with lost state entries, duplicate resources, or broken infrastructure.',
      '**With locking:** The second run waits or fails with a message like:',
      '**Also needed:** Locking protects the state file, but it does not make two different business changes compatible. So the pipeline should also allow only one deployment job per state.',
      'Only after you have proved nothing is running.',
      '**Related question: Two people run apply at the same time. What happens?**',
      'With a locking backend the second run is refused with a state lock error, which is the correct behaviour. Without locking, both runs plan from the same old state and one overwrites the other, causing lost entries or duplicate resources. Locking protects the file, but I also serialize the pipeline per state, because two valid changes can still conflict logically.',
      '**With a locking backend:** The second one is refused:',
      '**Without locking:** Both plan from the same old state and both write. The result can be a lost state entry, a duplicate resource, or infrastructure that no longer matches state.',
      '**The full fix** (in order):',
      '1. A backend with locking\n2. Applies only from the pipeline\n3. One job per state',
    ],
    code: [
      {
        title: 'The second run waits or fails with a message like',
        language: 'text',
        code: `Error: Error acquiring the state lock
Lock Info:
  ID:        1a2b3c
  Operation: OperationTypeApply
  Who:       user@host`,
      },
      {
        title: 'If a lock is stuck after a crashed job',
        language: 'bash',
        code: `terraform force-unlock 1a2b3c`,
      },
      {
        title: 'The second one is refused',
        language: 'text',
        code: `Error: Error acquiring the state lock`,
      },
    ],
    tags: ['state', 'locking'],
  },
  {
    // Source: q34
    id: 'itv-mytf-34',
    level: 'intermediate',
    kind: 'open',
    prompt: 'Can you edit the state file manually?',
    probing:
      'That you know the supported state commands and the risks of editing the JSON by hand.',
    answer: [
      'You can, but I avoid it. Manual JSON edits can break lineage and dependencies and cause destructive plans. I use `state mv`, `state rm`, `import`, and `moved` blocks, always with a backup and a full plan afterwards. And I remind people that changing state does not change the real cloud resource.',
      '**Technically yes, but do not:** Editing the JSON can break lineage, serial numbers, provider addresses, and dependencies, and then the next plan can be destructive.',
      '**Use supported commands instead:**',
      '- **Rename or move a resource**: `terraform state mv`\n- **Stop managing without deleting**: `terraform state rm`\n- **Adopt an existing resource**: `terraform import`\n- **Refactor in code, reviewable**: `moved` block',
    ],
    code: [
      {
        title: 'Example moved block',
        language: 'hcl',
        code: `moved {
  from = aws_instance.web
  to   = module.compute.aws_instance.web
}`,
      },
    ],
    tags: ['state'],
  },
  {
    // Source: q35, q53, s49
    id: 'itv-mytf-35',
    level: 'advanced',
    kind: 'scenario',
    prompt: 'The state file was deleted or corrupted. How do you recover it?',
    probing:
      'Whether you stop applies first, know where restorable copies live, and can rebuild state by import as a last resort.',
    answer: [
      "First I stop all applies, because an empty state makes Terraform want to recreate everything. Then I restore the last good version from bucket versioning or the backend's history and confirm it with a read-only plan. If no copy exists, I rebuild state by importing the real resources in small groups until the plan is clean. Afterwards I turn on versioning, restrict delete permissions, and test the restore procedure.",
      '**Steps** (in order):',
      '1. Stop all applies immediately, or Terraform will plan to recreate everything.\n2. Confirm the exact backend key and workspace.\n3. Restore the last good version from bucket versioning, soft delete, or Terraform Cloud history.\n4. Run a read-only plan and compare with cloud activity after that version.',
      '**If no copy exists at all:**',
      '1. Build an inventory of the real resources from tags and cloud APIs.\n2. Make sure the code matches them.\n3. Import them in small groups.\n4. Keep planning until there are no unexpected changes.',
      '**Related question: How do you recover from a corrupted state file?**',
      'If versioning is on, I restore the previous state version from the bucket and confirm it with a read-only plan. If there is no backup, I rebuild state by importing resources one at a time until the plan is clean. The real fix is prevention: versioning, locking, restricted access, and a restore procedure that has actually been tested.',
      '**If you have a backup:** Restore the previous version from the bucket, or use `terraform.tfstate.backup`.',
      '**If you have no backup:**',
      '1. Make sure the code matches the real infrastructure.\n2. Import the resources one by one.\n3. Run a plan and confirm nothing unexpected appears.',
      '**Prevention:** Turn on bucket versioning, keep locking on, and test the restore once in a while.',
      '**Related question: The state file is corrupted or deleted. What do you do?**',
      "First I stop all runs, because with an empty state Terraform will plan to recreate everything. Then I restore the previous version from bucket versioning or the backend's history and confirm it with a read-only plan. If there is genuinely no copy, I rebuild state by importing resources in small groups until the plan is clean. Afterwards I make sure versioning and delete protection are on and that the restore procedure is documented and tested.",
      '**Steps** (in order):',
      '1. Stop all runs immediately.\n2. Restore the previous version from the backend:',
      'Azure Storage: restore the blob snapshot. Terraform Cloud: restore from state history.',
      '3. Run a read-only plan to confirm the restored state matches reality.\n4. If no copy exists, rebuild by importing resources in small groups.',
      '**Prevention:** Versioning, soft delete, locking, restricted delete permissions, and a restore you have practised.',
    ],
    code: [
      {
        title: 'Restore the previous version from the bucket, or use terraform.tfstate.backup',
        language: 'bash',
        code: `aws s3api list-object-versions --bucket my-tf-state --prefix prod/terraform.tfstate
aws s3api get-object --bucket my-tf-state --key prod/terraform.tfstate --version-id <id> restored.tfstate`,
      },
      {
        title: 'Restore the previous version from the backend',
        language: 'bash',
        code: `aws s3api list-object-versions --bucket my-tf-state --prefix prod/terraform.tfstate`,
      },
    ],
    traps: [
      'Never run `terraform apply` against an empty state in production. It will try to create everything again.',
    ],
    followUps: [
      'What would you check before trusting a restored state version?',
      'How do you rebuild state safely if no copy exists at all?',
    ],
    tags: ['state', 'recovery'],
  },
]
