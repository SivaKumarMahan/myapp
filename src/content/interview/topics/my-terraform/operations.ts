import type { InterviewQuestion } from '../../../types'

/**
 * Terraform questions 36-71 from questions.md: Terraform Enterprise, module design, locking, policy, recovery, multi-account and testing.
 *
 * Source keys: q = questions.md, s = scenario-questions.md, n = notes.md,
 * m = summary.md, r = interview-round-notes.md (section numbers).
 */
export const myTerraformOperationsQuestions: InterviewQuestion[] = [
  {
    // Source: q36, m1
    id: 'itv-mytf-36',
    level: 'basic',
    kind: 'open',
    prompt: 'What is Terraform Enterprise?',
    probing:
      'Whether you can explain what Terraform Enterprise adds over the open-source CLI and why companies use it.',
    answer: [
      "Terraform Enterprise is HashiCorp's self-hosted platform for running Terraform centrally. It gives remote runs, managed state, workspaces, Git integration, role-based access, policy enforcement with Sentinel, a private module registry, and audit logs. Companies use it when they need those controls inside their own network. It does not replace good module design or cloud IAM.",
      "**Simple definition:** Terraform Enterprise is HashiCorp's self-hosted version of Terraform Cloud (now called HCP Terraform). You run it inside your own network.",
      '**What it gives you:**',
      '- **Remote runs**: Plan and apply run on servers, not laptops\n- **Remote state**: State stored and versioned centrally\n- **Workspaces**: Separate state and variables per environment\n- **VCS integration**: A Git push starts a run\n- **RBAC**: Control who can plan and who can apply\n- **Sentinel policies**: Block runs that break the rules\n- **Private module registry**: Share company modules\n- **Audit logs**: Who changed what and when',
      '**Revision notes: Terraform Enterprise in simple words**',
      '**The idea** (key points):',
      '- **Terraform CLI (open source)** — you run Terraform on your own machine. The state file sits with you, and nobody else knows what you did.\n- **Terraform Enterprise** — the company runs Terraform centrally, with shared state, rules, approvals, and a record of who changed what.',
      'Think of it as personal notes versus a shared company drive.',
      '**Problems it solves:**',
      '- **Without it**: Everyone has their own state file - **With Terraform Enterprise**: One central state\n- **Without it**: Anyone can destroy something - **With Terraform Enterprise**: Role-based access control\n- **Without it**: No record of who changed what - **With Terraform Enterprise**: Audit logs\n- **Without it**: Someone applies from a laptop - **With Terraform Enterprise**: Runs happen on secure workers\n- **Without it**: No guardrails - **With Terraform Enterprise**: Sentinel policies block bad plans',
      '**How a run works** (in order):',
      '1. A developer pushes Terraform code to Git.\n2. Terraform Enterprise sees the change and starts a run.\n3. It runs `terraform plan` on a worker.\n4. A reviewer approves.\n5. It runs `terraform apply` on the worker.\n6. The new state version is stored centrally.',
      '**Main features** (at a glance):',
      '- **Workspaces**: Separate state and variables per environment\n- **Remote state**: State stored centrally, with version history\n- **VCS integration**: A Git push starts a run\n- **Sentinel**: Policy rules, for example "only allow the West Europe region"\n- **RBAC**: Who can view, plan, or apply\n- **Private module registry**: Share company modules internally\n- **Audit logs**: Who did what and when',
      '**One-line definition:** "Terraform Enterprise is HashiCorp\'s self-hosted platform for running Terraform centrally, with remote runs, managed state, access control, policy enforcement, and audit logs."',
    ],
    tags: ['terraform enterprise'],
  },
  {
    // Source: q37
    id: 'itv-mytf-37',
    level: 'advanced',
    kind: 'open',
    prompt: 'Explain the Terraform Enterprise architecture.',
    probing:
      'Architecture understanding of the run flow and what it takes to operate Terraform Enterprise in production.',
    answer: [
      'A Git webhook or API call reaches the Terraform Enterprise application, which manages workspaces, variables, policies, and the run queue. A worker then runs init, plan, and apply, talking to module sources and cloud APIs, and returns logs and a new state version stored in object storage. In production I also plan for TLS, secrets, backups, monitoring, upgrades, and disaster recovery, and I make sure the workers have the network access they need, not just the UI.',
      '**Components** (key points):',
      '- **Application layer:** UI and API, organizations, workspaces, permissions, run queue.\n- **Workers:** run Terraform, need network access to module sources and cloud APIs.\n- **Object storage:** state versions and run artifacts.\n- **Database and cache:** application metadata.',
      '**Production needs:** TLS, secret management, backups of state and metadata, monitoring, an upgrade plan, and tested disaster recovery.',
    ],
    code: [
      {
        title: 'Flow',
        language: 'text',
        code: `Git push or API call
        |
Terraform Enterprise application
  (workspaces, variables, policies, run queue)
        |
Worker (runs init, plan, apply)
        |
Cloud provider APIs
        |
State version + logs stored back`,
      },
    ],
    followUps: [
      'What network access do the workers need that the UI does not?',
      'How would you back up and restore a Terraform Enterprise installation?',
    ],
    tags: ['terraform enterprise', 'architecture'],
  },
  {
    // Source: q38
    id: 'itv-mytf-38',
    level: 'intermediate',
    kind: 'open',
    prompt: 'How do you gather requirements before writing Terraform code?',
    probing:
      'Whether you think about requirements, standards and existing resources before writing code.',
    answer: [
      'I write a short requirements list first: resources, environments, networking, security, naming and tagging standards, scaling, availability, backup, cost, and ownership. I also check what already exists and must be imported. Then I turn repeated patterns into modules, keep environment values at the root, and agree on acceptance tests and a rollback plan before I start coding.',
      '**Questions I ask** (at a glance):',
      '- **Resources**: What exactly needs to be built?\n- **Environments**: How many, and how are they different?\n- **Network**: VPC, subnets, public or private, connectivity\n- **Security**: Encryption, secrets, who gets access\n- **Naming and tags**: What standard does the company use?\n- **Scale**: Expected traffic, autoscaling limits\n- **Availability**: Multi-AZ, backup, RTO and RPO\n- **Cost**: Any budget limit\n- **Ownership**: Who approves and who operates it\n- **Existing resources**: Anything already created that must be imported',
      '**Then:** Turn the repeated patterns into modules, keep environment values outside modules, and agree on acceptance tests and rollback before writing code.',
    ],
    tags: ['design', 'requirements'],
  },
  {
    // Source: q39, s30
    id: 'itv-mytf-39',
    level: 'advanced',
    kind: 'scenario',
    prompt: 'The plan wants to destroy and recreate a production database. What do you do?',
    probing:
      'Whether you stop, find the forcing argument, and treat a real database replacement as a data migration.',
    answer: [
      'I stop and find out which argument forces the replacement, since the plan marks it. I check the provider docs to see whether the field is immutable and whether the change can be done in place instead. If a real replacement is needed, I treat it as a data migration: build the new database, replicate the data, test the application, switch traffic, keep the old one for a rollback window, and only then destroy it. A lifecycle flag alone is not a downtime plan.',
      '**Steps** (in order):',
      '1. Do not apply yet.\n2. Find which argument forces the replacement. The plan shows `# forces replacement`.\n3. Check the provider docs to confirm the field is immutable.\n4. Back up the state and take a database snapshot.\n5. Decide: Can the change be made in place through the cloud console or a supported operation? Then change the Terraform design or use a narrow `ignore_changes`. Is the change unnecessary? Revert the code. Is replacement really needed? Plan a migration.',
      '**If replacement is really needed:**',
      '1. Create the new database beside the old one.\n2. Replicate or restore the data.\n3. Test the application against it.\n4. Move traffic through DNS or connection settings.\n5. Keep the old one for a rollback window, then delete it.',
      '**Important point:** `create_before_destroy` only helps if two databases can exist at once. Names, quotas, and licences may not allow it.',
      '**Related question: Terraform wants to destroy something critical. How do you react?**',
      'I stop and find out why. Either the resource block was removed from the code by mistake, or an immutable field is forcing replacement, and the plan says which one. I check the provider docs to see whether the change can be done in place, and I verify backups before doing anything. I also run a jq check over the plan JSON so deletes are never buried in a long output.',
      '**Steps** (in order):',
      '1. Stop. Do not approve the apply.\n2. Find the reason in the plan: `# forces replacement`, or the resource was removed from the code.\n3. If someone deleted the resource block by mistake, restore the code.\n4. If a field forces replacement, check the provider docs for whether it can change in place.\n5. Verify backups before doing anything.',
    ],
    code: [
      {
        title: 'Quick check on any plan',
        language: 'bash',
        code: `terraform show -json tfplan | jq -r '.resource_changes[] | select(.change.actions[] == "delete") | .address'`,
      },
    ],
    followUps: [
      'How do you find exactly which argument forces the replacement?',
      'When is a narrow `ignore_changes` acceptable here, and when is it hiding a problem?',
    ],
    tags: ['replacement', 'database', 'safety'],
  },
  {
    // Source: q40, n14
    id: 'itv-mytf-40',
    level: 'advanced',
    kind: 'open',
    prompt: 'How do you design modules used by many teams?',
    probing:
      'Module design maturity: contracts, secure defaults, semantic versioning and handling breaking changes.',
    answer: [
      'I keep modules small with a clear input and output contract, validation, secure defaults, examples, and documentation, and no environment names or credentials inside. They live in a private registry or Git with semantic versions, and each environment pins a version. Breaking changes get a major version and a migration guide. A platform team owns the standards, but other teams contribute through pull requests instead of copying the module.',
      '**Module rules** (in order):',
      '1. Small and focused. One module, one job.\n2. Clear inputs with types, defaults, and validation.\n3. Useful outputs.\n4. Secure defaults such as encryption on.\n5. No environment names or credentials inside.\n6. A README and an `examples/` folder.\n7. Semantic versioning: `v1.2.0`.',
      "**Breaking changes:** Release a new major version with a migration note. Do not change v1 behaviour under people's feet.",
      '**Revision notes: Module versioning and updates**',
      '1. Tag releases: `v1.0.0`, `v1.1.0`, `v2.0.0`.\n2. Consumers pin a version.\n3. Patch = bug fix, minor = new optional input, major = breaking change.\n4. A major version needs a migration note.\n5. Test the new version in dev before other teams adopt it.',
    ],
    code: [
      {
        title: 'Layout',
        language: 'text',
        code: `modules/vpc/
  main.tf
  variables.tf
  outputs.tf
  README.md
  examples/
    complete/`,
      },
      {
        title: 'Consuming it',
        language: 'hcl',
        code: `module "vpc" {
  source  = "app.terraform.io/myorg/vpc/aws"
  version = "1.4.0"
}`,
      },
      {
        title: 'Example',
        language: 'hcl',
        code: `module "vpc" {
  source  = "git::https://github.com/myorg/tf-modules.git//vpc?ref=v1.4.0"
}`,
      },
    ],
    followUps: [
      'How do you roll out a breaking module change to many teams?',
      'Who owns a shared module, and how do other teams contribute?',
    ],
    tags: ['modules', 'design', 'versioning'],
  },
  {
    // Source: q41, q68, r4
    id: 'itv-mytf-41',
    level: 'intermediate',
    kind: 'open',
    prompt: 'How do you handle state locking in CI/CD?',
    probing:
      'Practical locking setup in S3 and Azure, pipeline serialization, and a controlled approach to stuck locks.',
    answer: [
      'I use a remote backend with native locking and one state key per environment or component so runs do not block each other. Only the deployment identity can write to production, and the pipeline allows one job per state. If a lock stays after a crashed job, I check the lock owner and the pipeline first, and only then run `force-unlock` with that exact ID. I never force-unlock just because a job is waiting.',
      'Newer Terraform versions can lock with an S3 lock file. The old DynamoDB table method is legacy but still seen in projects.',
      '**Rules** (key points):',
      '- One state key per environment or component, so jobs do not queue behind each other.\n- Only the deployment identity can write to production state.\n- Disable concurrent runs for the same state in the pipeline.',
      'Only after checking the pipeline and cloud logs to prove no apply is running.',
      '**Related question: How do you set up state locking for a team?**',
      'I use a backend with native locking: S3 with a lock file, Azure Storage with blob leases, GCS, or Terraform Cloud. On top of that the pipeline allows one apply job per state so two changes cannot queue into each other. I also monitor for locks that stay too long, since that usually means a job crashed, and force-unlock is a controlled procedure, not something anyone can run.',
      'Azure Storage uses blob leases for locking automatically.',
      '**Revision notes: State locking and avoiding conflicts**',
      '1. Use a backend that supports locking: S3 with a lock file, Azure Storage blob lease, GCS, or Terraform Cloud.\n2. Terraform takes the lock during plan and apply and releases it at the end.\n3. A second run waits or fails instead of corrupting state.\n4. Enable versioning and encryption for recovery.\n5. Restrict who may run `force-unlock`.\n6. Run applies from CI only, so changes are serialized.',
      '**Stuck lock:** Check the lock owner and the pipeline first. Only when nothing is running:',
    ],
    code: [
      {
        title: 'Setup',
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
      { title: 'Stuck lock', language: 'bash', code: `terraform force-unlock <LOCK_ID>` },
      {
        title: 'Azure backend',
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
        title: 'Serialize the pipeline too',
        language: 'yaml',
        code: `# GitLab CI
terraform_apply:
  script:
    - terraform apply -auto-approve tfplan
  resource_group: terraform-\${CI_ENVIRONMENT_NAME}`,
      },
    ],
    tags: ['locking', 'ci/cd', 'state'],
  },
  {
    // Source: q42
    id: 'itv-mytf-42',
    level: 'advanced',
    kind: 'open',
    prompt: 'How do you keep secrets out of state?',
    probing:
      'Whether you know secrets used by resources land in state, and design so Terraform never handles the value.',
    answer: [
      'Secrets never go into Git or plain tfvars. The pipeline authenticates with workload identity and pulls values from a secret manager. I mark variables and outputs sensitive, but I explain that this only hides output, so the backend must be encrypted with restricted read access. Where possible Terraform creates the secret container and grants access, while the application reads the actual value at runtime.',
      '**What I do** (in order):',
      '1. No secrets in Git or plain `.tfvars`.\n2. Pipeline logs in with workload identity, no stored keys.\n3. Secrets come from Vault, Key Vault, or Secrets Manager.\n4. Mark variables and outputs `sensitive`.\n5. Where possible, Terraform creates the empty secret container and another process fills the value.\n6. Encrypt the backend and restrict read access.',
      'Better still, the application reads the secret at runtime using its managed identity, so Terraform never touches the value.',
    ],
    code: [
      {
        title: 'Example: create the secret container, not the value',
        language: 'hcl',
        code: `resource "azurerm_key_vault_secret" "db" {
  name         = "db-password"
  value        = var.db_password   # supplied by pipeline, never committed
  key_vault_id = var.key_vault_id
}`,
      },
    ],
    followUps: [
      'How does an application read a secret at runtime with a managed identity?',
      'What would you do if you found a plaintext secret in an old state version?',
    ],
    tags: ['secrets', 'state', 'security'],
  },
  {
    // Source: q43, q56, n10, n16
    id: 'itv-mytf-43',
    level: 'advanced',
    kind: 'open',
    prompt: 'What is your overall approach to drift?',
    probing:
      'An end-to-end drift process: detect, decide with the owner, fix, and prevent - without overwriting emergency fixes.',
    answer: [
      'I detect drift with scheduled read-only plans and alerts, then I check the audit log to see who changed what and why. If the manual change should stay, I put it in the code. If not, an approved apply restores the declared state. I do not silently overwrite an emergency fix. To prevent it, I limit console write access, use policy checks, and require break-glass changes to be reconciled back into code.',
      '**Three parts** (key points):',
      'Run it nightly and alert.',
      '**Decide:** Check the cloud audit log: who changed it and why. Talk to the owner. Was it a valid emergency fix?',
      '**Fix** (key points):',
      '- Valid change → put it in the code.\n- Invalid change → approved apply restores the declared value.\n- Unmanaged resource → import it.',
      '**Prevent:** Limit console write access, use policy as code, and document a break-glass process where the change must be put back into code afterwards.',
      '**Related question: How do you handle state drift?**',
      'I run scheduled plans to detect drift and alert on exit code 2. Then I check the audit log and decide with the owner whether the manual change should stay. If it should, I update the code; if not, an approved apply restores it. Unmanaged resources get imported. A weekly drift job that posts a summary and opens a ticket keeps this from piling up.',
      '**Detect:** Run a scheduled plan in the pipeline:',
      'Exit code 2 means drift. Send the report to the team.',
      '**Fix** (at a glance):',
      '- **The manual change was correct**: Update the code, then apply\n- **The manual change was wrong**: Approved apply restores the code value\n- **The resource is not managed**: `terraform import`',
      '**A weekly drift job can:**',
      '- Run plan on all environments\n- Post a summary to Slack or Teams\n- Create a ticket for each real difference',
      '**Revision notes: Drift detection and fixing**',
      '**Fix** (at a glance):',
      '- **Manual change should stay**: Update the code, then apply\n- **Manual change was wrong**: Approved apply restores the code value\n- **Resource not managed at all**: `terraform import`',
      '**Prevent:** Read-only console access, policy checks, and a break-glass process where the change must be put back into code afterwards.',
      '**Revision notes: Drift in a team environment**',
      '1. Shared remote state with locking, so nobody works from a private copy.\n2. All applies from the pipeline.\n3. Nightly drift plan for every environment.\n4. Cloud audit logs to identify who changed what.\n5. Agreed process for emergency changes.',
      'The technical controls matter, but so does the agreement that nobody edits production by hand.',
    ],
    code: [
      {
        title: 'Detect',
        language: 'bash',
        code: `terraform plan -detailed-exitcode   # 2 means drift`,
      },
      {
        title: 'Run a scheduled plan in the pipeline',
        language: 'bash',
        code: `terraform plan -detailed-exitcode -no-color > drift.txt`,
      },
      {
        title: 'Detect',
        language: 'bash',
        code: `terraform plan -detailed-exitcode
# 0 = no change, 1 = error, 2 = drift`,
      },
    ],
    followUps: [
      'Why should a drift job not auto-apply the fix?',
      'How do you make sure break-glass changes get back into code?',
    ],
    tags: ['drift', 'governance'],
  },
  {
    // Source: q44
    id: 'itv-mytf-44',
    level: 'advanced',
    kind: 'open',
    prompt: 'How do you enforce tagging and encryption rules?',
    probing:
      'Layered enforcement: static scans, plan-time policy and cloud-side policy, plus an exception process.',
    answer: [
      'I enforce rules in layers. CI runs Checkov or tfsec on the code, Sentinel or OPA checks the plan before apply, and cloud-native policies catch anything created outside Terraform. Rules cover required tags, encryption, allowed regions, and private networking. I classify rules as advisory, soft mandatory, or hard mandatory, keep a time-limited exception process, and test policies with both passing and failing examples.',
      '**Enforce at more than one layer:**',
      '- **Code review**: Pull requests and code owners\n- **CI static scan**: Checkov, tfsec, Terrascan\n- **Plan-time policy**: Sentinel or OPA / Conftest\n- **Cloud-side policy**: AWS SCP, Azure Policy, GCP Org Policy',
      '**Policy levels** (key points):',
      '- **Advisory:** warn only.\n- **Soft mandatory:** can be overridden with approval.\n- **Hard mandatory:** always blocks.',
      'Keep an exception process with an expiry date.',
    ],
    code: [
      {
        title: 'Simple OPA rule',
        language: 'text',
        code: `package terraform

deny[msg] {
  r := input.resource.aws_instance[name]
  not r.tags.Owner
  msg := sprintf("Instance '%v' is missing the Owner tag", [name])
}`,
      },
    ],
    followUps: [
      'What is the difference between advisory, soft mandatory and hard mandatory policies?',
      'How do you test a policy before enforcing it?',
    ],
    tags: ['policy', 'governance', 'tagging'],
  },
  {
    // Source: q45
    id: 'itv-mytf-45',
    level: 'intermediate',
    kind: 'open',
    prompt: 'Explain the resource lifecycle and `create_before_destroy`.',
    probing:
      'Whether you understand the default destroy-then-create order and the limits of `create_before_destroy`.',
    answer: [
      'Terraform compares code, state, and reality and decides to do nothing, update in place, replace, create, or destroy. Replacement destroys first and then creates, which causes downtime. `create_before_destroy` reverses that order so the new resource comes up first. It is not a guarantee, because unique names, quotas, and attached resources can block having two at once, so I always confirm the order in the plan.',
      '**What Terraform decides for each resource:**',
      '- **No change**: Code matches reality\n- **Update in place**: Attribute can be changed\n- **Replace**: Attribute is immutable\n- **Create**: Resource is new\n- **Destroy**: Resource removed from code',
      '**Default replacement order:**',
      '1. Destroy the old resource.\n2. Create the new one.',
      'That default order means downtime.',
      '1. Create the new resource.\n2. Switch references to it.\n3. Destroy the old one.',
      '**It can fail when:**',
      '- The name must be unique.\n- Quota does not allow two at once.\n- Something is attached to the old resource.',
    ],
    code: [
      {
        title: 'With create_before_destroy',
        language: 'hcl',
        code: `lifecycle {
  create_before_destroy = true
}`,
      },
    ],
    tags: ['lifecycle', 'replacement'],
  },
  {
    // Source: q46, n6
    id: 'itv-mytf-46',
    level: 'advanced',
    kind: 'open',
    prompt: 'How do you structure Terraform for multi-cloud?',
    probing:
      'Whether you avoid false abstractions across clouds and isolate state and identity per cloud.',
    answer: [
      'I use provider-specific modules instead of one generic module that pretends the clouds are the same, and I separate state by cloud, account, environment, and region. Each cloud gets its own least-privilege identity and pipeline stage. What I share across clouds is the standards: naming, tagging, policy checks, and review process. That way one cloud outage or provider bug does not block everything.',
      '**Approach** (in order):',
      '1. Write provider-specific modules. Do not try to hide AWS and Azure behind one generic module.\n2. Separate state per cloud, account, environment, and region.\n3. Give each cloud its own identity and its own pipeline stage.\n4. Share the standards: naming, tags, policy checks, review process.\n5. Connect stacks through stable outputs or DNS, not one shared state.',
      '**Revision notes: Multi-cloud**',
      '1. One provider block per cloud, with aliases for extra regions or accounts.\n2. Provider-specific modules. Do not force AWS and Azure into one generic module.\n3. Separate state per cloud, account, environment, and region.\n4. Separate identity and pipeline stage per cloud.\n5. Share the standards: naming, tags, policy checks.',
    ],
    code: [
      {
        title: 'Example provider setup',
        language: 'hcl',
        code: `provider "aws" {
  region = "us-east-1"
}

provider "azurerm" {
  features {}
}`,
      },
    ],
    followUps: [
      'Why not write one generic module that works on AWS and Azure?',
      'How do stacks in different clouds share values?',
    ],
    tags: ['multi-cloud', 'design'],
  },
  {
    // Source: q47, s1
    id: 'itv-mytf-47',
    level: 'intermediate',
    kind: 'open',
    prompt: 'Workspaces or separate state files?',
    probing:
      'Whether you know the trade-offs of CLI workspaces and when separate root folders are safer.',
    answer: [
      'Workspaces reuse one configuration and backend with a different state per workspace. They are handy for temporary or nearly identical environments, but it is easy to forget which one is selected and they share backend and credentials. For long-lived dev, test, and production I prefer separate root folders and state files, because credentials, approvals, and blast radius are then explicit.',
      '- **CLI workspaces**: One config, one backend, different state per workspace - **Separate state files**: Separate folder, backend, and variables per environment\n- **CLI workspaces**: Quick to create - **Separate state files**: More structure to set up\n- **CLI workspaces**: Easy to forget which workspace you are in - **Separate state files**: The folder makes it obvious\n- **CLI workspaces**: Shares backend and credentials - **Separate state files**: Separate credentials and approvals possible\n- **CLI workspaces**: Good for short-lived or test copies - **Separate state files**: Better for long-lived dev, test, prod',
      '**Related question: How do you manage multiple environments?**',
      'For short-lived or nearly identical environments I use workspaces. For dev, test, and production I prefer separate folders with their own backend, variables, credentials, and approvals, because it is obvious which environment you are in and a dev job can never touch production state.',
      '**Two ways:** **Workspaces** — same code, different state:',
      '**Separate folders** — safer for long-lived environments:',
      'Each folder gets its own backend key, credentials, and approval.',
    ],
    code: [
      {
        title: 'Commands',
        language: 'bash',
        code: `terraform workspace new dev
terraform workspace select dev
terraform workspace list`,
      },
      {
        title: 'Workspaces — same code, different state',
        language: 'bash',
        code: `terraform workspace new dev
terraform workspace select dev
terraform apply -var-file=dev.tfvars`,
      },
      {
        title: 'Separate folders — safer for long-lived environments',
        language: 'text',
        code: `environments/dev/    backend.tf  dev.tfvars
environments/test/   backend.tf  test.tfvars
environments/prod/   backend.tf  prod.tfvars`,
      },
    ],
    tags: ['workspaces', 'environments'],
  },
  {
    // Source: q48
    id: 'itv-mytf-48',
    level: 'advanced',
    kind: 'scenario',
    prompt: 'How do you debug a failed apply in a big module setup?',
    probing:
      'Structured debugging in a large module tree, and safe handling of logs and partially created resources.',
    answer: [
      'I stop retries and find the exact resource address and provider error, then check permissions, quotas, name conflicts, network, and provider version. I use `terraform console` and `state show` to inspect module inputs and outputs, and I enable `TF_LOG` only briefly because logs can contain sensitive data. If the API created something Terraform did not record, I import it instead of recreating it. Then I fix the cause, run a full plan, and verify the application, not just the resource.',
      '**Steps** (in order):',
      '1. Stop retries and read the exact resource address in the error.\n2. Check the usual causes: permissions, quota, name already exists, network, API outage.\n3. Compare the saved plan with what failed.\n4. Inspect values:\n5. Turn on debug logs briefly:\n6. Compare state with the real resources. Import anything created but not tracked.\n7. Fix the cause, run a fresh full plan, apply, and verify.',
    ],
    code: [
      {
        title: 'Inspect values',
        language: 'bash',
        code: `terraform console
> module.vpc.private_subnet_ids
terraform state show module.compute.aws_instance.web`,
      },
      {
        title: 'Turn on debug logs briefly',
        language: 'bash',
        code: `export TF_LOG=DEBUG
export TF_LOG_PATH=./tf.log`,
      },
    ],
    followUps: [
      'What can `TF_LOG` expose, and how do you handle the log file?',
      'How do you inspect a module output value without applying?',
    ],
    tags: ['troubleshooting', 'modules'],
  },
  {
    // Source: q49, q66
    id: 'itv-mytf-49',
    level: 'advanced',
    kind: 'open',
    prompt: 'Have you written a custom provider or used external data sources?',
    probing:
      'Honesty about experience plus a sensible order of options before writing a custom provider.',
    answer: [
      'I have not written a production provider, and I would be honest about that. I first look for an official provider, then a REST or HTTP provider, then a read-only `external` data source. I have used data sources to look up existing networks, images, and account details so modules do not hardcode IDs. A custom provider is worth it only for an internal API that needs proper CRUD, validation, and import support, plus tests and ownership.',
      '**Honest answer:** If you have not written a provider, say so, and explain what you would do instead.',
      '**Order of preference:**',
      '1. Official provider.\n2. Community or REST/HTTP provider.\n3. `external` data source for simple read-only lookups.\n4. Custom provider only when nothing else fits.',
      'Keep it read-only and predictable. Terraform may run it during refresh and planning.',
      '**When a custom provider is justified:** An internal API that needs proper create, read, update, delete behaviour, schema validation, and import support.',
      '**Related question: How do you extend Terraform when no provider exists?**',
      'First I check whether an official or community provider already exists. For simple read-only needs I use the `http` or `external` data source. A custom provider written in Go with the Plugin Framework is worth it only when an internal API needs real CRUD support, schema validation, and import, and when someone will own and test it long term.',
      '**Options from easiest to hardest:**',
      '1. **Existing provider** — check the registry first.\n2. **`http` data source** — read-only calls to a REST API.\n3. **`external` data source** — run a small script that returns JSON.\n4. **`terraform_data` with a provisioner** — last resort for a one-off action.\n5. **Custom provider** — write it in Go with the Terraform Plugin Framework.',
      'The script reads JSON from stdin and prints a flat JSON object.',
      '**When to build a real provider:** Your internal system needs full create, read, update, delete behaviour, schema validation, and import support. Then you also need tests, versioning, and an owner.',
    ],
    code: [
      {
        title: 'Example: external data source',
        language: 'hcl',
        code: `data "external" "config" {
  program = ["python3", "\${path.module}/get_config.py"]
}

resource "aws_instance" "app" {
  ami           = data.external.config.result.ami_id
  instance_type = "t3.small"
}`,
      },
      {
        title: 'External data source example',
        language: 'hcl',
        code: `data "external" "cmdb" {
  program = ["python3", "\${path.module}/lookup.py"]

  query = {
    app_name = var.app_name
  }
}`,
      },
    ],
    followUps: [
      'What are the risks of the `external` data source?',
      'What would a custom provider need before you let teams depend on it?',
    ],
    tags: ['providers', 'extensibility'],
  },
  {
    // Source: q50
    id: 'itv-mytf-50',
    level: 'advanced',
    kind: 'scenario',
    prompt: 'State is corrupted and versioning was never enabled. How do you recover?',
    probing:
      'Recovery under the worst case: preserving evidence, hunting for copies and rebuilding state by import.',
    answer: [
      'I stop all runs and preserve the evidence, then hunt for any legitimate copy: Terraform Cloud history, CI artifacts, a local backup file, or object-store recovery. If nothing exists, I rebuild state by making the code match reality and importing resources in small groups, planning after each group until nothing unexpected appears. I never copy state from another environment. Afterwards I enable versioning, locking, restricted access, and a tested restore procedure.',
      '**Steps** (in order):',
      '1. Stop every plan and apply.\n2. Keep the corrupt file, the lock info, the CI logs, and the last plans as evidence.\n3. Look for any legitimate copy: Terraform Cloud state history; CI artifacts; A local `.terraform` or `terraform.tfstate.backup` from the last operator; Object storage recovery or a disaster-recovery backup\n4. If nothing exists, rebuild: Make sure the code matches the real resources. List the real resource IDs from the cloud. Import them in small dependency-aware groups. Plan after each group.\n5. Only resume normal changes when a full plan shows no surprises.',
      '**Fix it for next time:** Turn on encryption, versioning or soft delete, locking, restricted access, audit logs, separate states, and test the restore procedure.',
    ],
    traps: [
      'Never copy a state file from another environment.',
      'Never use `state rm` as a shortcut to make errors go away.',
    ],
    followUps: [
      'Why must you never copy a state file from another environment?',
      'How would you test the restore procedure afterwards?',
    ],
    tags: ['state', 'recovery'],
  },
  {
    // Source: q51
    id: 'itv-mytf-51',
    level: 'advanced',
    kind: 'open',
    prompt: 'How do you create an EKS cluster with Terraform?',
    probing:
      'Whether you can build EKS with a pinned module, know the control plane versus node split, and verify the cluster.',
    answer: [
      'I use a pinned EKS module with a VPC, private subnets, cluster and node IAM roles, managed node groups, and the core add-ons. AWS runs the control plane, which is the API server, etcd, scheduler, and controllers, while worker nodes run kubelet and my pods. I plan cluster, node, and add-on upgrades separately. After apply I check API access, node readiness, system pods, DNS, and a sample workload, because a successful apply alone does not prove the cluster works.',
      '**What you need** (in order):',
      '1. VPC with private subnets\n2. IAM roles for the cluster and the nodes\n3. The EKS cluster itself\n4. Managed node groups\n5. Add-ons: VPC CNI, CoreDNS, kube-proxy, EBS CSI driver',
      '**Control plane vs worker nodes:**',
      '- **Control plane (managed by AWS)**: API server - **Worker nodes (yours)**: kubelet\n- **Control plane (managed by AWS)**: etcd, stores cluster state - **Worker nodes (yours)**: Container runtime\n- **Control plane (managed by AWS)**: Scheduler - **Worker nodes (yours)**: Runs your pods\n- **Control plane (managed by AWS)**: Controllers - **Worker nodes (yours)**: Networking agents',
      '**After apply, check:** API access, node status, system pods, DNS, storage class, autoscaling, and a test workload.',
    ],
    code: [
      {
        title: 'Example',
        language: 'hcl',
        code: `module "eks" {
  source  = "terraform-aws-modules/eks/aws"
  version = "20.8.4"

  cluster_name    = "payments-prod"
  cluster_version = "1.29"

  vpc_id     = module.vpc.vpc_id
  subnet_ids = module.vpc.private_subnets

  eks_managed_node_groups = {
    general = {
      min_size     = 3
      desired_size = 3
      max_size     = 12
    }
  }
}`,
      },
    ],
    followUps: [
      'How do you upgrade the cluster version, node groups and add-ons safely?',
      'How would you give pods AWS permissions without node-wide IAM?',
    ],
    tags: ['aws', 'eks', 'kubernetes'],
  },
  {
    // Source: q52, s38
    id: 'itv-mytf-52',
    level: 'intermediate',
    kind: 'scenario',
    prompt: 'How do you handle provider API rate limits?',
    probing:
      'Practical fixes for throttling: parallelism, provider retries, smaller states and quotas.',
    answer: [
      "I reduce `-parallelism`, turn on the provider's retry and backoff settings, and split large configurations into smaller states so fewer API calls happen at the same time. If one specific resource type always triggers throttling, I add a short `time_sleep` between the stages. I also check whether a quota increase is the real fix.",
      '**Options** (in order):',
      '1. Lower parallelism:\n2. Use provider retry settings:\n3. Add a small wait between heavy resources:\n4. Split the configuration into smaller states so fewer calls happen at once.',
      '**Related question: Apply is failing because of API rate limits. What do you do?**',
      "I lower `-parallelism`, enable the provider's retry and backoff settings, and split large configurations so fewer API calls happen at once. If it keeps happening I request a quota increase and stagger the pipelines, because throttling is usually caused by many jobs starting at the same time rather than one big apply.",
      '**Longer-term fixes:**',
      '- Split the configuration so fewer calls happen at once\n- Request a quota increase\n- Stagger pipelines instead of running them all at 9am',
    ],
    code: [
      { title: 'Lower parallelism', language: 'bash', code: `terraform apply -parallelism=5` },
      {
        title: 'Use provider retry settings',
        language: 'hcl',
        code: `provider "aws" {
  region             = "us-east-1"
  retry_mode         = "adaptive"
  max_retries        = 10
}`,
      },
      {
        title: 'Add a small wait between heavy resources',
        language: 'hcl',
        code: `resource "time_sleep" "wait" {
  depends_on      = [aws_iam_role_policy_attachment.app]
  create_duration = "30s"
}`,
      },
      { title: 'Fixes', language: 'bash', code: `terraform apply -parallelism=5 tfplan` },
      {
        title: 'Fixes',
        language: 'hcl',
        code: `provider "aws" {
  region      = "us-east-1"
  max_retries = 10
  retry_mode  = "adaptive"
}`,
      },
      {
        title: 'Fixes',
        language: 'hcl',
        code: `provider "google" {
  project                     = var.project_id
  request_timeout             = "60s"
  batching {
    enable_batching = true
  }
}`,
      },
    ],
    tags: ['performance', 'providers', 'rate limits'],
  },
  {
    // Source: q54
    id: 'itv-mytf-53',
    level: 'intermediate',
    kind: 'open',
    prompt: 'How do you migrate from one backend to another?',
    probing:
      'Whether you migrate backends safely with a backup, `-migrate-state` and a clean plan.',
    answer: [
      'I back up the state with `terraform state pull`, update the backend block, run `terraform init -migrate-state`, and confirm the migration by running a plan that shows no changes. I do it when nobody else is running Terraform, and I keep the old copy until the new backend is proven working.',
      '**Points to remember:**',
      '- Do it in a maintenance window.\n- Make sure no one else is running Terraform.\n- Keep the old state until the new one is proven.',
    ],
    code: [
      {
        title: 'Steps',
        language: 'bash',
        code: `# 1. Back up the current state
terraform state pull > backup.tfstate

# 2. Change the backend block in code

# 3. Migrate
terraform init -migrate-state

# 4. Confirm
terraform plan   # must show no changes`,
      },
      {
        title: 'Example: local to S3',
        language: 'hcl',
        code: `terraform {
  backend "s3" {
    bucket  = "my-tf-state"
    key     = "prod/terraform.tfstate"
    region  = "us-east-1"
    encrypt = true
  }
}`,
      },
    ],
    tags: ['state', 'backend', 'migration'],
  },
  {
    // Source: q55, s2
    id: 'itv-mytf-54',
    level: 'intermediate',
    kind: 'open',
    prompt: 'How do you avoid deleting something by accident?',
    probing:
      'Layered protection against accidental deletes, and reading the destroy section of every plan.',
    answer: [
      'I never approve a plan without reading the destroy section. On top of that I use `prevent_destroy` and cloud deletion protection on critical resources, separate state files to limit blast radius, pipeline credentials without delete rights, and mandatory approval for production. For the most critical systems there is a break-glass procedure with two approvers and tested backups.',
      '**Layers** (in order):',
      '1. Always read the plan, especially the destroy section.\n2. `prevent_destroy` on critical resources.\n3. Cloud-side deletion protection.\n4. Separate state files so a mistake has a smaller blast radius.\n5. Pipeline credentials without delete permission.\n6. Approval before production apply.\n7. Backups that have actually been restored once.',
      '**Quick habit:** Search the plan output for `destroy` before approving:',
      '**Related question: How do you stop someone deleting a critical resource?**',
      'I use layers: `prevent_destroy` and cloud deletion protection on critical resources, a policy check that rejects plans containing deletes, approval gates, and pipeline credentials without delete rights. If a destroy has already started, I stop the runs, check what really disappeared, restore from backup, and import anything that survived instead of applying blindly.',
      '1. `prevent_destroy` in the lifecycle block\n2. Deletion protection on the cloud resource\n3. Policy check that fails the build if the plan has a delete\n4. Approval before production apply\n5. Pipeline credentials without delete permission',
      '**If a destroy already started:** Stop new runs, check what is actually gone, restore from backup or replica, import whatever survived, then plan a proper recovery.',
    ],
    code: [
      {
        title: 'Example',
        language: 'hcl',
        code: `resource "aws_rds_cluster" "prod" {
  cluster_identifier  = "prod-db"
  deletion_protection = true

  lifecycle {
    prevent_destroy = true
  }
}`,
      },
      {
        title: 'Search the plan output for destroy before approving',
        language: 'bash',
        code: `terraform show -json tfplan | jq '.resource_changes[] | select(.change.actions[] == "delete") | .address'`,
      },
      {
        title: 'Protection layers',
        language: 'hcl',
        code: `resource "aws_db_instance" "prod" {
  identifier          = "prod-db"
  deletion_protection = true

  lifecycle {
    prevent_destroy = true
  }
}`,
      },
    ],
    tags: ['safety', 'lifecycle'],
  },
  {
    // Source: q57
    id: 'itv-mytf-55',
    level: 'basic',
    kind: 'open',
    prompt: 'What are the benefits of modules and workspaces?',
    probing:
      'Whether you can state the benefits of modules and workspaces and where workspaces stop being a good fit.',
    answer: [
      'Modules give reuse and consistency, so every team gets the same tagging, encryption, and naming without copying code. Workspaces let the same configuration hold separate state per environment. Together they reduce duplication, but for long-lived production boundaries I still prefer separate folders and state files over workspaces, because permissions and blast radius are clearer.',
      '**Modules** (key points):',
      '- Reuse the same tested code everywhere\n- Standard tags, encryption, and naming\n- Teams do not copy and paste\n- Change one module, upgrade many projects',
      '**Workspaces** (key points):',
      '- Same code, separate state per environment\n- Quick to create for short-lived copies',
    ],
    code: [
      {
        title: 'Typical layout',
        language: 'text',
        code: `terraform/
  modules/
    networking/
    database/
    compute/
  environments/
    dev/
    test/
    prod/
  global/
    iam/
    dns/`,
      },
    ],
    tags: ['modules', 'workspaces'],
  },
  {
    // Source: q58
    id: 'itv-mytf-56',
    level: 'intermediate',
    kind: 'open',
    prompt: 'How do you use a secret manager with Terraform?',
    probing:
      'Hands-on use of a secret manager from Terraform, and awareness that the value can still land in state.',
    answer: [
      'I keep the secret in Vault, Key Vault, or Secrets Manager and read it with a data source at run time, so nothing is hardcoded. I mark outputs sensitive and encrypt the backend, because the value can still end up in state. For the most sensitive values I prefer that Terraform only grants access and the application reads the secret at runtime.',
      '**Remember:** Any value used in a resource can end up in state, so:',
      '- Encrypt state\n- Restrict read access\n- Rotate secrets regularly\n- Mark outputs `sensitive`',
    ],
    code: [
      {
        title: 'Vault example',
        language: 'hcl',
        code: `data "vault_generic_secret" "db" {
  path = "secret/database/app"
}

resource "aws_db_instance" "app" {
  identifier = "app-db"
  username   = data.vault_generic_secret.db.data["username"]
  password   = data.vault_generic_secret.db.data["password"]
}`,
      },
      {
        title: 'AWS Secrets Manager example',
        language: 'hcl',
        code: `data "aws_secretsmanager_secret_version" "db" {
  secret_id = "prod/app/db"
}

locals {
  db = jsondecode(data.aws_secretsmanager_secret_version.db.secret_string)
}`,
      },
    ],
    tags: ['secrets', 'vault'],
  },
  {
    // Source: q59, n22
    id: 'itv-mytf-57',
    level: 'advanced',
    kind: 'open',
    prompt: 'How do you handle multiple regions and multiple accounts?',
    probing:
      'Provider aliases, assume-role across accounts, and how stacks exchange values across regions.',
    answer: [
      'For multiple regions I use provider aliases, and for multiple accounts I use a provider with `assume_role` into a Terraform role in the target account. I keep separate state per account and region but share the same modules so everything is built the same way. Stacks exchange values through remote state outputs or stable interfaces like DNS.',
      '**Revision notes: Cross-region dependencies**',
      '1. Use provider aliases for each region.\n2. Keep separate state per region.\n3. Pass values between regions as variables, or read them from remote state.\n4. Deploy in a defined order through the pipeline.',
      '**Remember:** Some services are global (IAM, Route 53, CloudFront). Keep those in one global stack instead of duplicating them per region.',
    ],
    code: [
      {
        title: 'Multiple regions: provider alias',
        language: 'hcl',
        code: `provider "aws" {
  region = "us-east-1"
}

provider "aws" {
  alias  = "west"
  region = "us-west-2"
}

resource "aws_s3_bucket" "backup" {
  provider = aws.west
  bucket   = "app-backup-west"
}`,
      },
      {
        title: 'Multiple accounts: assume role',
        language: 'hcl',
        code: `provider "aws" {
  alias  = "prod"
  region = "us-east-1"

  assume_role {
    role_arn = "arn:aws:iam::111122223333:role/TerraformRole"
  }
}`,
      },
      {
        title: 'Sharing values between stacks',
        language: 'hcl',
        code: `data "terraform_remote_state" "network" {
  backend = "s3"

  config = {
    bucket = "my-tf-state"
    key    = "network/terraform.tfstate"
    region = "us-east-1"
  }
}

resource "aws_instance" "app" {
  subnet_id = data.terraform_remote_state.network.outputs.private_subnet_ids[0]
}`,
      },
      {
        title: 'Example',
        language: 'hcl',
        code: `provider "aws" {
  alias  = "dr"
  region = "us-west-2"
}

resource "aws_s3_bucket" "dr_backup" {
  provider = aws.dr
  bucket   = "app-backup-dr"
}`,
      },
    ],
    followUps: [
      'Why keep separate state per account and region even with shared modules?',
      'What are the downsides of `terraform_remote_state`?',
    ],
    tags: ['multi-region', 'multi-account', 'aws'],
  },
  {
    // Source: q60, s19, n3, r5
    id: 'itv-mytf-58',
    level: 'intermediate',
    kind: 'open',
    prompt: 'How do you test Terraform code?',
    probing:
      'Whether you test in layers, from fmt and validate up to real module tests and policy checks.',
    answer: [
      'I test in layers: `fmt` and `validate` for basics, `tflint` for lint, `tfsec` or `checkov` for security, and a reviewed plan on every pull request. For modules I use the native `terraform test` framework or Terratest to deploy into a sandbox, assert the outputs, and destroy. Policy checks with OPA or Sentinel run before apply, and the pipeline blocks a merge if any layer fails.',
      '**Layers of testing:**',
      '- **Format**: Tool: `terraform fmt -check`; What it catches: Style\n- **Syntax**: Tool: `terraform validate`; What it catches: Bad references, missing arguments\n- **Lint**: Tool: `tflint`; What it catches: Wrong instance types, unused variables\n- **Security**: Tool: `tfsec`, `checkov`; What it catches: Public buckets, missing encryption\n- **Plan review**: Tool: `terraform plan`; What it catches: Unexpected destroys\n- **Unit test**: Tool: `terraform test` or Terratest; What it catches: Module actually works\n- **Policy**: Tool: OPA, Sentinel; What it catches: Company rules',
      '**Related question: How do you test Terraform before deploying?**',
      'I run fmt and validate for the basics, tflint for lint, tfsec or Checkov for security, and a reviewed plan on every pull request. Modules also have `terraform test` or Terratest cases that build a real example in a sandbox and destroy it. Then the change is proven in dev before the same code is promoted upward.',
      'Then deploy to dev, verify, and promote the same code to test and production.',
      '**Revision notes: Testing Terraform code**',
      '- **Format**: Command: `terraform fmt -check`; Catches: Style\n- **Syntax**: Command: `terraform validate`; Catches: Bad references, missing arguments\n- **Lint**: Command: `tflint`; Catches: Bad instance types, unused variables\n- **Security**: Command: `tfsec .` / `checkov -d .`; Catches: Public buckets, missing encryption\n- **Drift**: Command: `terraform plan -detailed-exitcode`; Catches: Manual changes\n- **Unit test**: Command: `terraform test` / Terratest; Catches: Module actually works\n- **Policy**: Command: OPA / Conftest / Sentinel; Catches: Company rules',
      '**Revision notes: Testing before production**',
      '- **Static**: `terraform fmt -check`, `terraform validate`, `tflint`\n- **Security**: `tfsec`, `checkov`, or Trivy\n- **Plan review**: Plan on every pull request, reviewed by a person\n- **Policy**: OPA or Sentinel rules, for example no public storage\n- **Tests**: `terraform test` or Terratest against a sandbox\n- **Promotion**: Apply in dev, then staging, then production with approval',
    ],
    code: [
      {
        title: 'Native test example (Terraform 1.6+)',
        language: 'hcl',
        code: `# tests/vpc.tftest.hcl
run "creates_vpc" {
  command = plan

  variables {
    cidr = "10.0.0.0/16"
  }

  assert {
    condition     = aws_vpc.main.cidr_block == "10.0.0.0/16"
    error_message = "VPC CIDR is wrong"
  }
}`,
      },
      {
        title: 'Terratest example',
        language: 'text',
        code: `func TestVpc(t *testing.T) {
  opts := &terraform.Options{TerraformDir: "../examples/vpc"}
  defer terraform.Destroy(t, opts)
  terraform.InitAndApply(t, opts)

  vpcID := terraform.Output(t, opts, "vpc_id")
  assert.NotEmpty(t, vpcID)
}`,
      },
      {
        title: 'Order of checks',
        language: 'bash',
        code: `terraform fmt -check      # style
terraform validate        # syntax and references
tflint                    # lint rules
tfsec .                   # security
terraform plan -out=tfplan
terraform test            # module tests`,
      },
      {
        title: 'Native test example',
        language: 'hcl',
        code: `# tests/vpc.tftest.hcl
run "vpc_cidr_is_correct" {
  command = plan

  assert {
    condition     = aws_vpc.main.cidr_block == "10.0.0.0/16"
    error_message = "Wrong CIDR"
  }
}`,
      },
    ],
    tags: ['testing', 'ci/cd'],
  },
  {
    // Source: q61, n1
    id: 'itv-mytf-59',
    level: 'advanced',
    kind: 'open',
    prompt: 'How do you get zero-downtime updates?',
    probing:
      'Techniques for zero-downtime changes and awareness that databases need their own plan.',
    answer: [
      'For stateless tiers I use immutable replacement: a new launch template version, an autoscaling instance refresh with a minimum healthy percentage, and health checks before traffic is sent. For bigger changes I use blue-green, so traffic moves only after the new stack is verified and rollback is just switching back. Databases need their own plan with replicas, backups, and application-level migration.',
      '**Techniques** (in order):',
      '1. **Create before destroy**\n2. **Rolling update with instance refresh**\n3. **Blue-green** — build the new stack beside the old one, move traffic with DNS or the load balancer, then delete the old stack.',
      '4. **Health checks** — do not send traffic until the new instance passes.',
      '5. **Databases** — use a replica that can be promoted, or a managed service with failover.',
      '**Revision notes: Zero downtime deployments**',
      '**Ways to do it** (in order):',
      '1. **Create before destroy** — bring the new resource up first.\n2. **Rolling update** — replace a few instances at a time.\n3. **Blue-green** — build a second stack, switch traffic, delete the old one.\n4. **Load balancer + health checks** — no traffic until the new instance is healthy.\n5. **Test in a lower environment first.**',
      '**Remember:** Databases need their own plan: replica promotion, backups, and a backward-compatible migration.',
    ],
    code: [
      {
        title: 'Techniques',
        language: 'hcl',
        code: `resource "aws_launch_template" "web" {
  lifecycle {
    create_before_destroy = true
  }
}`,
      },
      {
        title: 'Techniques',
        language: 'hcl',
        code: `resource "aws_autoscaling_group" "web" {
  instance_refresh {
    strategy = "Rolling"

    preferences {
      min_healthy_percentage = 90
    }
  }
}`,
      },
    ],
    followUps: [
      'How does an instance refresh decide whether new instances stay?',
      'How would you handle a database change in the same release?',
    ],
    tags: ['deployment', 'zero downtime'],
  },
  {
    // Source: q62
    id: 'itv-mytf-60',
    level: 'intermediate',
    kind: 'open',
    prompt: 'How do you validate input variables?',
    probing: 'Whether you fail early with validation blocks, strong types and preconditions.',
    answer: [
      'I use `validation` blocks in variable declarations so bad input fails immediately with a clear message, for example only allowing dev, test, or prod, or only approved instance types. }))` instead of plain strings, and `precondition` blocks when the rule depends on more than one value.',
      'Failing early is much cheaper than failing during apply.',
    ],
    code: [
      {
        title: 'Simple validation',
        language: 'hcl',
        code: `variable "environment" {
  type        = string
  description = "Deployment environment"

  validation {
    condition     = contains(["dev", "test", "prod"], var.environment)
    error_message = "Environment must be dev, test, or prod."
  }
}

variable "instance_type" {
  type    = string
  default = "t3.micro"

  validation {
    condition     = can(regex("^t3\\\\.", var.instance_type))
    error_message = "Only t3 instance types are allowed."
  }
}`,
      },
      {
        title: 'Typed objects',
        language: 'hcl',
        code: `variable "subnets" {
  type = map(object({
    cidr = string
    az   = string
  }))
}`,
      },
      {
        title: 'Preconditions',
        language: 'hcl',
        code: `resource "aws_instance" "app" {
  lifecycle {
    precondition {
      condition     = var.environment != "prod" || var.instance_type != "t3.micro"
      error_message = "Production cannot use t3.micro."
    }
  }
}`,
      },
    ],
    tags: ['variables', 'validation'],
  },
  {
    // Source: q63
    id: 'itv-mytf-61',
    level: 'advanced',
    kind: 'open',
    prompt: 'How do you provision resources across two accounts?',
    probing:
      'Cross-account provisioning with aliased providers and the trust and resource policies it needs.',
    answer: [
      '<alias>` on each resource. The trust and resource policies together allow cross-account access.',
      'In larger setups there is a management account holding the Terraform roles and a separate account for state, all with least-privilege permissions.',
    ],
    code: [
      {
        title: 'Example',
        language: 'hcl',
        code: `provider "aws" {
  alias  = "app"
  region = "us-east-1"
}

provider "aws" {
  alias  = "logs"
  region = "us-east-1"

  assume_role {
    role_arn = "arn:aws:iam::\${var.logs_account_id}:role/TerraformRole"
  }
}

# Bucket in the logging account
resource "aws_s3_bucket" "logs" {
  provider = aws.logs
  bucket   = "app-logs-\${var.environment}"
}

# Role in the app account
resource "aws_iam_role" "app" {
  provider = aws.app
  name     = "app-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect    = "Allow"
      Principal = { Service = "ec2.amazonaws.com" }
      Action    = "sts:AssumeRole"
    }]
  })
}

# Bucket policy allowing the app account role
resource "aws_s3_bucket_policy" "logs" {
  provider = aws.logs
  bucket   = aws_s3_bucket.logs.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect    = "Allow"
      Principal = { AWS = aws_iam_role.app.arn }
      Action    = ["s3:PutObject"]
      Resource  = "\${aws_s3_bucket.logs.arn}/*"
    }]
  })
}`,
      },
    ],
    followUps: [
      'Where would the Terraform roles and the state bucket live in a larger organisation?',
      'How do you keep the cross-account role least-privilege?',
    ],
    tags: ['multi-account', 'aws', 'iam'],
  },
  {
    // Source: q64, n21
    id: 'itv-mytf-62',
    level: 'advanced',
    kind: 'open',
    prompt: 'How do you refactor a lot of resources without downtime?',
    probing:
      'Safe refactoring with `moved` blocks, small steps and automated checks for hidden deletes.',
    answer: [
      'I prefer `moved` blocks, because the move is visible in the plan and reviewable, instead of a state command that someone has to remember to run. I back up state first, then check the plan JSON to confirm no deletes are hiding in it. I split the refactor into small pull requests, one group at a time, and each must plan clean before the next one starts.',
      'Terraform shows the move in the plan, and reviewers can see nothing is being destroyed.',
      'If that command prints anything unexpected, stop.',
      '**Do it in small pull requests:** Move one module or one group at a time, each with a clean plan.',
      '**Revision notes: Refactoring a monolithic repo into modules**',
      '**Steps** (in order):',
      '1. Find the repeated blocks: network, compute, database.\n2. Create a module for each, with clear inputs and outputs.\n3. Restructure the folders:\n4. Move resources with `moved` blocks so nothing is destroyed.\n5. Do it in small pull requests, one component at a time.\n6. Each step must plan clean before the next one.\n7. Update the pipeline and the documentation.',
      'If that prints anything unexpected, stop.',
    ],
    code: [
      {
        title: 'Preferred way: moved blocks',
        language: 'hcl',
        code: `moved {
  from = aws_instance.app
  to   = module.compute.aws_instance.app
}`,
      },
      {
        title: 'Older way: state commands',
        language: 'bash',
        code: `terraform state mv aws_instance.app module.compute.aws_instance.app`,
      },
      {
        title: 'Safety checks',
        language: 'bash',
        code: `terraform state pull > backup.tfstate
terraform plan -out=refactor.plan
terraform show -json refactor.plan | jq '.resource_changes[] | select(.change.actions[] == "delete") | .address'`,
      },
      {
        title: 'Restructure the folders',
        language: 'text',
        code: `modules/
environments/dev/
environments/prod/`,
      },
      {
        title: 'Safety check',
        language: 'bash',
        code: `terraform show -json tfplan | jq -r '.resource_changes[] | select(.change.actions[] == "delete") | .address'`,
      },
    ],
    followUps: [
      'Why are `moved` blocks better than `terraform state mv` for a team?',
      'How do you know it is safe to remove a `moved` block later?',
    ],
    tags: ['refactoring', 'state', 'modules'],
  },
  {
    // Source: q65
    id: 'itv-mytf-63',
    level: 'intermediate',
    kind: 'open',
    prompt: 'How do you create resources from external data?',
    probing:
      'Driving `for_each` from external data with stable keys, and the risk of an unstable data source.',
    answer: [
      'I read the data with `jsondecode(file(...))`, the `http` data source, or an `external` data source, turn it into a map in `locals`, and drive `for_each` from that map so each item has a stable key. The important warning is that the plan now depends on outside data, so the source must be stable and read-only, otherwise every run produces a different plan.',
      '**Warning:** If the external data changes between runs, your plan changes too. Keep the source stable and read-only.',
    ],
    code: [
      {
        title: 'Example: create users from a JSON file',
        language: 'hcl',
        code: `locals {
  users = jsondecode(file("\${path.module}/users.json"))

  users_map = { for u in local.users : u.username => u }
}

resource "aws_iam_user" "team" {
  for_each = local.users_map

  name = each.key

  tags = {
    Department = each.value.department
  }
}`,
      },
      {
        title: 'Example: from an API',
        language: 'hcl',
        code: `data "http" "services" {
  url = "https://registry.example.com/services"
}

locals {
  services = jsondecode(data.http.services.response_body).items
}

resource "aws_lb_target_group" "services" {
  for_each = { for s in local.services : s.name => s }

  name     = each.key
  port     = each.value.port
  protocol = "HTTP"
  vpc_id   = var.vpc_id
}`,
      },
    ],
    tags: ['data sources', 'for_each'],
  },
  {
    // Source: q67
    id: 'itv-mytf-64',
    level: 'advanced',
    kind: 'open',
    prompt: 'How do you handle database schema changes?',
    probing: 'Whether you keep schema migrations out of Terraform and design for rollback.',
    answer: [
      'I keep them separate: Terraform creates the database instance, networking, backups, and users, and a dedicated migration tool like Flyway or Liquibase handles the schema through the deployment pipeline. Before a migration the pipeline takes a snapshot, and migrations are written to be backward compatible so the previous application version still works if we need to roll back.',
      '**Separate the two jobs:**',
      '- **Terraform**: Creates the database server, network, backups, users - **Migration tool**: Creates tables and changes schema',
      "Terraform is declarative and does not track table versions. Use Flyway, Liquibase, Alembic, or your application's migration framework for schema.",
    ],
    code: [
      {
        title: 'Terraform side',
        language: 'hcl',
        code: `resource "aws_db_instance" "app" {
  identifier              = "app-db"
  engine                  = "postgres"
  instance_class          = "db.t3.medium"
  allocated_storage       = 20
  backup_retention_period = 7
  skip_final_snapshot     = false

  lifecycle {
    prevent_destroy = true
  }
}

output "db_endpoint" {
  value     = aws_db_instance.app.endpoint
  sensitive = true
}`,
      },
      {
        title: 'Pipeline side',
        language: 'text',
        code: `1. Take a snapshot
2. Run the migration tool
3. Deploy the application version that matches the schema
4. Keep the migration backward compatible so rollback is possible`,
      },
    ],
    followUps: [
      'What makes a schema migration backward compatible?',
      'Where in the pipeline does the migration run relative to the app deploy?',
    ],
    tags: ['database', 'design'],
  },
  {
    // Source: q69
    id: 'itv-mytf-65',
    level: 'advanced',
    kind: 'open',
    prompt: 'How do you run a GitOps workflow with Terraform?',
    probing: 'A Git-driven Terraform workflow with PR plans, gated applies and drift detection.',
    answer: [
      'Git holds the desired state and nothing is applied by hand. A pull request triggers plan and policy checks and posts the result for review, and merging to main triggers the apply with approval. A nightly drift job compares reality with Git and opens an issue if they differ. Tools like Atlantis or Spacelift give this workflow out of the box with plan comments and approvals.',
      '**The idea:** Git is the source of truth. Nothing is applied by hand.',
      '**Tools:** Atlantis and Spacelift do this pull-request workflow for you, including plan comments and approval before apply.',
    ],
    code: [
      {
        title: 'Flow',
        language: 'text',
        code: `Pull request  -> plan + checks, posted for review
Merge to main -> apply with approval
Nightly job   -> drift plan, alert if the cloud differs from Git`,
      },
      {
        title: 'GitHub Actions example',
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
    steps:
      - uses: actions/checkout@v4

      - uses: aws-actions/configure-aws-credentials@v4
        with:
          role-to-assume: \${{ secrets.AWS_ROLE_ARN }}
          aws-region: us-east-1

      - uses: hashicorp/setup-terraform@v3

      - run: terraform init
      - run: terraform plan -out=tfplan

      - name: Apply
        if: github.ref == 'refs/heads/main'
        run: terraform apply tfplan`,
      },
      {
        title: 'Drift job',
        language: 'bash',
        code: `terraform plan -detailed-exitcode || \\
  gh issue create --title "Infrastructure drift detected"`,
      },
    ],
    followUps: [
      'What does Atlantis or Spacelift give you over a hand-written pipeline?',
      'How do you handle an emergency change in a GitOps model?',
    ],
    tags: ['gitops', 'ci/cd'],
  },
  {
    // Source: q70
    id: 'itv-mytf-66',
    level: 'intermediate',
    kind: 'open',
    prompt: 'How do you test a module before releasing it?',
    probing: 'A release process for modules: examples, tests, docs and semantic version tags.',
    answer: [
      'Each module has a README, a working example, and tests. CI runs fmt, validate, tflint, a security scan, and `terraform test` or Terratest against the example, then generates the docs. Releases are tagged with semantic versions and consumers pin a version, so a change to the module cannot break every team at once. A breaking change means a new major version with a migration note.',
      '**Release:** Tag it with a semantic version:',
    ],
    code: [
      {
        title: 'Checklist for the module repo',
        language: 'text',
        code: `modules/vpc/
  main.tf
  variables.tf
  outputs.tf
  README.md
  examples/
    complete/      # a working example anyone can run
  tests/
    vpc.tftest.hcl`,
      },
      {
        title: 'CI for the module',
        language: 'bash',
        code: `terraform fmt -check -recursive
terraform validate
tflint --recursive
checkov -d .
terraform test
terraform-docs markdown . > README.md`,
      },
      {
        title: 'Tag it with a semantic version',
        language: 'bash',
        code: `git tag v1.4.0
git push origin v1.4.0`,
      },
      {
        title: 'Consumers pin it',
        language: 'hcl',
        code: `module "vpc" {
  source  = "git::https://github.com/myorg/tf-modules.git//vpc?ref=v1.4.0"
}`,
      },
    ],
    tags: ['modules', 'testing', 'versioning'],
  },
  {
    // Source: q71
    id: 'itv-mytf-67',
    level: 'advanced',
    kind: 'open',
    prompt: 'How do you handle dependencies between separate stacks?',
    probing: 'Options for cross-stack dependencies and treating outputs as a public interface.',
    answer: [
      'I connect stacks through a small number of stable outputs. The simplest way is a `terraform_remote_state` data source, but that gives the application stack read access to the network state. I often prefer passing values in as variables from the pipeline instead, or looking resources up by tag. Terragrunt can wire dependencies automatically. The main rule is to treat those outputs as a public interface and deploy the stacks in a defined order.',
      'The pipeline supplies the value. The application stack does not need read access to the network state.',
      '**Keep outputs stable:** Once another stack depends on an output, treat it like a public interface. Do not rename or remove it without a version bump and a migration note.',
    ],
    code: [
      {
        title: 'Option 1: remote state (simple, but couples the stacks)',
        language: 'hcl',
        code: `data "terraform_remote_state" "network" {
  backend = "s3"

  config = {
    bucket = "my-tf-state"
    key    = "network/terraform.tfstate"
    region = "us-east-1"
  }
}

resource "aws_instance" "app" {
  subnet_id = data.terraform_remote_state.network.outputs.private_subnet_ids[0]
}`,
      },
      {
        title: 'Option 2: pass values in as variables (looser)',
        language: 'hcl',
        code: `variable "vpc_id" {
  type = string
}`,
      },
      {
        title: 'Option 3: look it up by tag',
        language: 'hcl',
        code: `data "aws_vpc" "main" {
  tags = {
    Name = "prod-vpc"
  }
}`,
      },
      {
        title: 'Option 4: Terragrunt',
        language: 'hcl',
        code: `dependency "vpc" {
  config_path = "../vpc"
}

inputs = {
  vpc_id     = dependency.vpc.outputs.vpc_id
  subnet_ids = dependency.vpc.outputs.private_subnets
}`,
      },
      {
        title: 'Pipeline order',
        language: 'text',
        code: `network -> data -> application -> monitoring`,
      },
    ],
    followUps: [
      'Why might you avoid `terraform_remote_state` for security reasons?',
      'How do you change an output that other stacks depend on?',
    ],
    tags: ['state', 'design', 'dependencies'],
  },
]
