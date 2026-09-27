import type { InterviewQuestion } from '../../../types'

/**
 * Terraform scenario questions from scenario-questions.md (duplicates of questions.md are merged there).
 *
 * Source keys: q = questions.md, s = scenario-questions.md, n = notes.md,
 * m = summary.md, r = interview-round-notes.md (section numbers).
 */
export const myTerraformScenarioQuestions: InterviewQuestion[] = [
  {
    // Source: s3
    id: 'itv-mytf-68',
    level: 'advanced',
    kind: 'scenario',
    prompt: 'How do you migrate infrastructure from one cloud to another?',
    probing:
      'Whether you know state cannot move between clouds and plan a parallel-run migration with rollback.',
    answer: [
      'State does not move between clouds, because the resource types are different, so I write new code for the target cloud in its own state. I run both sides in parallel, copy the data, and shift traffic with DNS so rollback is possible. If some resources already exist in the target cloud, I import them instead of recreating them. The old environment is destroyed only after an agreed rollback window.',
      '**Steps** (in order):',
      '1. Build the target environment with new Terraform code, in its own state.\n2. Run both environments in parallel.\n3. Copy the data: database dump and restore, or replication.\n4. Move traffic gradually with DNS.\n5. Keep the old environment for a rollback window.\n6. Destroy the old environment once everyone agrees.',
      '**Important point:** You cannot "migrate state" from AWS to Azure. The resources are different. You write new code and use `terraform import` only for resources that already exist in the target cloud.',
    ],
    followUps: [
      'How do you migrate the data with minimal downtime?',
      'What decides the length of the rollback window?',
    ],
    tags: ['migration', 'multi-cloud'],
  },
  {
    // Source: s4
    id: 'itv-mytf-69',
    level: 'intermediate',
    kind: 'scenario',
    prompt: 'The backend lock is stuck. What do you do?',
    probing:
      'Whether you verify nothing is running before `force-unlock`, and check for untracked resources afterwards.',
    answer: [
      'I read the lock record to see who owns it and when it started, then confirm through the pipeline and cloud logs that no apply is still running. Only then do I use `force-unlock` with that exact lock ID. Afterwards I run a full plan, because the crashed run may have created resources that state does not know about. I never delete the lock object just to unblock a waiting job.',
      '**Steps** (in order):',
      '1. Look at the lock info: who owns it, which operation, when.\n2. Check the pipeline. Is that job still running?\n3. Check the cloud activity log. Is Terraform still creating things?\n4. Only when nothing is running:\n5. Run a full plan afterwards, in case the crashed run created something.',
    ],
    code: [
      {
        title: 'The error looks like this',
        language: 'text',
        code: `Error: Error acquiring the state lock
  ID:        4f1c8b32-...
  Operation: OperationTypeApply
  Who:       runner@ci-agent-3
  Created:   2026-08-05 10:14:03`,
      },
      {
        title: 'Only when nothing is running',
        language: 'bash',
        code: `terraform force-unlock 4f1c8b32-...`,
      },
    ],
    traps: ['Never delete the lock table or lock object just because a job is waiting.'],
    tags: ['locking', 'state'],
  },
  {
    // Source: s5
    id: 'itv-mytf-70',
    level: 'intermediate',
    kind: 'open',
    prompt: 'How do you prevent people making manual changes?',
    probing:
      'Prevention through access control and pipelines, with a break-glass path that ends in code.',
    answer: [
      'The best prevention is removing console write access and making the pipeline the only way to change infrastructure, backed by policy checks. For real emergencies there is a break-glass role, but the rule is that the change must be reconciled back into code afterwards. On top of that, a nightly drift plan alerts us when something differs, so nothing silently stays out of code.',
      '**Prevention** (in order):',
      '1. Remove console write access for normal users. Give read-only.\n2. All changes go through pull requests and the pipeline.\n3. Policy as code blocks anything created outside the standard.\n4. Have a documented break-glass role for emergencies.',
      '**Detection:** Nightly job:',
      'Exit code 2 means someone changed something.',
      '**After an emergency change:** The person who used break-glass access must open a pull request to put the change into code.',
    ],
    code: [{ title: 'Nightly job', language: 'bash', code: `terraform plan -detailed-exitcode` }],
    tags: ['drift', 'governance'],
  },
  {
    // Source: s6
    id: 'itv-mytf-71',
    level: 'intermediate',
    kind: 'open',
    prompt: 'How do you encrypt secrets in the state file?',
    probing:
      'Whether you know Terraform does not encrypt individual values and the backend must protect the whole file.',
    answer: [
      'Terraform does not encrypt single values inside state, so I protect the whole file: an encrypted bucket with a customer-managed key, TLS in transit, versioning, and tight IAM so read access is as restricted as write. The better fix is to avoid putting secrets in state at all, by letting the application read them at runtime through managed identity.',
      '**What you can do** (at a glance):',
      '- **Encryption at rest**: S3 SSE-KMS, Azure Storage encryption, GCS CMEK\n- **Encryption in transit**: TLS, which the backends use by default\n- **Restrict access**: IAM policy on the state bucket, read access is as sensitive as write\n- **Versioning**: Bucket versioning or soft delete\n- **Keep values out**: Let the app read secrets at runtime instead of Terraform passing them',
      '**Important point:** Terraform does not encrypt individual values inside state. The whole file is protected by the backend.',
    ],
    code: [
      {
        title: 'Example',
        language: 'hcl',
        code: `terraform {
  backend "s3" {
    bucket     = "my-tf-state"
    key        = "prod/terraform.tfstate"
    region     = "us-east-1"
    encrypt    = true
    kms_key_id = "arn:aws:kms:us-east-1:111122223333:key/abcd-1234"
  }
}`,
      },
    ],
    tags: ['state', 'secrets', 'encryption'],
  },
  {
    // Source: s7
    id: 'itv-mytf-72',
    level: 'advanced',
    kind: 'open',
    prompt: 'How do you enforce policy as code?',
    probing: 'Policy as code at both the Terraform plan and the Kubernetes admission layers.',
    answer: [
      'For Terraform I scan the code with Checkov or tfsec and check the plan with Sentinel or OPA, and the pull request fails if a rule is broken. For Kubernetes I use Gatekeeper or Kyverno as admission controllers so anything applied directly to the cluster is also checked. I keep an exception process with an expiry date, otherwise people work around the gate.',
      '**Two places** (key points):',
      '**Before apply — Terraform side:**',
      '- Checkov or tfsec on the code\n- Sentinel or OPA / Conftest on the plan JSON',
      '**In the cluster — Kubernetes side:**',
      '- OPA Gatekeeper or Kyverno as admission controllers',
    ],
    code: [
      {
        title: 'Before apply — Terraform side',
        language: 'bash',
        code: `terraform show -json tfplan > plan.json
conftest test plan.json`,
      },
      {
        title: 'Example rule',
        language: 'text',
        code: `package terraform

deny[msg] {
  b := input.resource.aws_s3_bucket[name]
  b.acl == "public-read"
  msg := sprintf("Bucket '%v' must not be public", [name])
}`,
      },
    ],
    followUps: [
      'Why check the plan JSON rather than only the source code?',
      'How do you stop teams working around the policy gate?',
    ],
    tags: ['policy', 'opa', 'kubernetes'],
  },
  {
    // Source: s8, s21
    id: 'itv-mytf-73',
    level: 'advanced',
    kind: 'open',
    prompt: 'How do you design Terraform for a big company with many teams?',
    probing:
      'Organisation-scale design: module ownership, state boundaries, approvals and a PR workflow.',
    answer: [
      'A platform team owns a private registry of versioned modules and the standards. Application teams own small root configurations that pin a module version and have their own state, credentials, and approvers. State is split by network, platform, data, and application. Every change goes through a pull request where the plan is posted for review, and a tool like Atlantis or Spacelift runs it consistently.',
      '**State boundaries:** Split by network, shared platform, data, and applications, and by environment. Each has its own state and its own approvers.',
      '**Workflow:** Pull request → plan posted as a comment → review → approval → apply. Atlantis or Spacelift can do this automatically.',
      '**Related question: How do you scale Terraform for a large team?**',
      'Scaling is mostly about boundaries. Keep small state files per component and environment, so teams do not queue behind one lock. Use versioned shared modules so standards stay consistent, a pull-request workflow where the plan is reviewed, and one apply job per state. Each environment has its own credentials and approvers, and every stack has a named owner.',
      '**What matters most:**',
      '1. Small state files, so teams do not block each other.\n2. Versioned modules, so standards are shared.\n3. Pull-request workflow with plan on every change.\n4. One apply job per state.\n5. Separate credentials and approvals per environment.\n6. Clear ownership: who owns which stack.',
    ],
    code: [
      {
        title: 'Structure',
        language: 'text',
        code: `Private module registry   -> versioned, reviewed modules
Platform team             -> owns modules and standards
Application teams         -> own their root configs, pin module versions`,
      },
    ],
    followUps: [
      'How do you split ownership between the platform team and application teams?',
      'How do you stop teams queuing behind one lock?',
    ],
    tags: ['design', 'governance', 'teams'],
  },
  {
    // Source: s9
    id: 'itv-mytf-74',
    level: 'intermediate',
    kind: 'open',
    prompt: 'How do you reduce lock contention?',
    probing: 'Whether you recognise that lock contention is a state-boundary problem.',
    answer: [
      'Lock contention almost always means the state file is too big and too many teams share it. I split state by environment and component so each pipeline has its own lock, keep stacks small so applies finish quickly, and set a lock timeout so jobs fail with a clear message instead of hanging. I also monitor for locks that stay open, which usually means a crashed run.',
      '**The cause:** One huge state file means every team waits for the same lock.',
      '**The fix** (in order):',
      '1. Split the state by component and environment.\n2. Give each pipeline its own state key.\n3. Keep applies short by keeping stacks small.\n4. Set a sensible lock timeout instead of waiting forever:',
    ],
    code: [
      {
        title: 'Set a sensible lock timeout instead of waiting forever',
        language: 'bash',
        code: `terraform apply -lock-timeout=5m`,
      },
    ],
    tags: ['locking', 'state'],
  },
  {
    // Source: s10
    id: 'itv-mytf-75',
    level: 'intermediate',
    kind: 'scenario',
    prompt: 'How do you stop Terraform replacing resources unexpectedly?',
    probing:
      'Reading `forces replacement` in the plan and choosing the right response per situation.',
    answer: [
      'I read the plan to see which argument is marked `forces replacement`, because that tells me whether the field is immutable. If the change is not needed I revert the code; if another system owns the field I add a narrow `ignore_changes`; if replacement really is needed I plan for it with create-before-destroy and a traffic cutover. For anything holding data, I treat it as a migration, not a replace.',
      '**Find out why first:** The plan tells you:',
      '**Then decide** (at a glance):',
      '- **The change is not needed**: Revert the code\n- **Another system owns that field**: Narrow `ignore_changes`\n- **Replacement is needed but downtime is not acceptable**: `create_before_destroy` plus traffic cutover\n- **It is a database or disk**: Backup, migrate data, then replace',
      'Keep the list narrow. A wide `ignore_changes` hides real drift.',
    ],
    code: [
      {
        title: 'The plan tells you',
        language: 'text',
        code: `~ resource "aws_instance" "web" {
    ~ availability_zone = "us-east-1a" -> "us-east-1b" # forces replacement`,
      },
      {
        title: 'Example',
        language: 'hcl',
        code: `lifecycle {
  ignore_changes = [tags["LastPatched"]]
}`,
      },
    ],
    tags: ['replacement', 'lifecycle'],
  },
  {
    // Source: s11
    id: 'itv-mytf-76',
    level: 'basic',
    kind: 'open',
    prompt: 'How do you make sure changes are peer reviewed?',
    probing: 'A PR-based review flow with branch protection, code owners and a gated apply.',
    answer: [
      'Every change goes through a pull request that runs fmt, validate, security scans, and a plan, and the plan summary is posted as a comment so reviewers can see creates, updates, and destroys. Branch protection requires an approval, and code owners review modules and production folders. Apply only happens from the protected job on that same commit after approval.',
      'Post the plan summary as a PR comment.',
      '**Repository rules:**',
      '- Branch protection on `main`\n- At least one approval\n- Code owners for modules and production folders\n- No direct pushes',
      '**Apply rules:** Only the protected job applies, using the same commit and the reviewed plan, after approval.',
    ],
    code: [
      {
        title: 'Pipeline on a pull request',
        language: 'bash',
        code: `terraform fmt -check
terraform init
terraform validate
tfsec .
terraform plan -out=tfplan`,
      },
    ],
    tags: ['review', 'ci/cd'],
  },
  {
    // Source: s12
    id: 'itv-mytf-77',
    level: 'intermediate',
    kind: 'open',
    prompt: 'How do you detect drift automatically?',
    probing: 'Automating drift detection with a scheduled plan, and why a human decides the fix.',
    answer: [
      'I run a nightly read-only plan with `-detailed-exitcode`; exit code 2 means drift, and the job posts a summary and opens a ticket. I do not auto-apply the fix, because the manual change could be a valid emergency fix. A person checks the audit log, decides whether it should stay, and either updates the code or approves an apply to restore it.',
      '**Handling the result:**',
      '- **0**: Nothing to do\n- **1**: Pipeline error, fix the job\n- **2**: Drift, send an alert and open a ticket',
      '**Do not auto-apply the fix:** Someone may have made a valid emergency change. A human decides.',
    ],
    code: [
      {
        title: 'Scheduled job',
        language: 'yaml',
        code: `on:
  schedule:
    - cron: "0 2 * * *"

jobs:
  drift:
    steps:
      - run: terraform init
      - run: terraform plan -detailed-exitcode -no-color -out=drift.tfplan`,
      },
    ],
    tags: ['drift', 'automation'],
  },
  {
    // Source: s13
    id: 'itv-mytf-78',
    level: 'intermediate',
    kind: 'scenario',
    prompt: 'How do you fix a dependency cycle error?',
    probing: 'Whether you can read a cycle error and break it with separate rule resources.',
    answer: [
      'A cycle usually comes from two resources referencing each other, like two security groups with inline rules. I break it by moving the rules into separate `aws_security_group_rule` resources so the groups themselves no longer depend on each other. I also remove unnecessary `depends_on`, since manual dependencies often cause the cycle, and I use `terraform graph` to see the loop.',
      'Usually two security groups reference each other.',
      '**The fix:** Use separate rule resources instead of inline rules:',
      '**Other tips** (key points):',
      '- Remove unnecessary `depends_on`, which often creates the cycle.\n- View the graph: `terraform graph | dot -Tsvg > graph.svg`\n- Split the resources into two modules if they really belong to different layers.',
    ],
    code: [
      {
        title: 'The error',
        language: 'text',
        code: `Error: Cycle: aws_security_group.app, aws_security_group.db`,
      },
      {
        title: 'Use separate rule resources instead of inline rules',
        language: 'hcl',
        code: `resource "aws_security_group" "app" {
  name   = "app-sg"
  vpc_id = var.vpc_id
}

resource "aws_security_group" "db" {
  name   = "db-sg"
  vpc_id = var.vpc_id
}

resource "aws_security_group_rule" "db_from_app" {
  type                     = "ingress"
  from_port                = 5432
  to_port                  = 5432
  protocol                 = "tcp"
  security_group_id        = aws_security_group.db.id
  source_security_group_id = aws_security_group.app.id
}`,
      },
    ],
    tags: ['troubleshooting', 'dependencies'],
  },
  {
    // Source: s14
    id: 'itv-mytf-79',
    level: 'advanced',
    kind: 'open',
    prompt: 'How do you prevent drift in a multi-cloud setup?',
    probing: 'Applying drift controls consistently across every cloud, not just the main one.',
    answer: [
      'The approach is the same in each cloud, just applied consistently. That means separate state and identity per cloud, a scheduled drift plan for every stack, the same tagging and policy rules, and read-only console access for normal users. Drift usually appears in whichever cloud has the weakest controls, so the checks have to cover all of them.',
      '**Approach** (in order):',
      '1. One pipeline per cloud, each with its own state and identity.\n2. Scheduled drift plans for every stack, not just the main one.\n3. Same standards everywhere: tags, naming, policy checks.\n4. Console write access removed in all clouds, not just one.',
    ],
    followUps: [
      'How would you report drift across clouds in one place?',
      'Which cloud-native tools help catch changes made outside Terraform?',
    ],
    tags: ['drift', 'multi-cloud'],
  },
  {
    // Source: s15
    id: 'itv-mytf-80',
    level: 'advanced',
    kind: 'scenario',
    prompt: 'Someone ran destroy in production. What now?',
    probing:
      'Incident response priorities - data first - and the controls that stop it happening again.',
    answer: [
      'First I stop everything and work out from the audit log what was actually deleted. Data comes back first, from snapshots or replicas, then I re-apply the code for stateless resources and import anything that survived. Once the service is verified, I make it impossible to repeat: no destroy permission for the pipeline identity, `prevent_destroy` on critical resources, and mandatory approval.',
      '**Immediate steps** (in order):',
      '1. Stop the pipeline and any other running jobs.\n2. Find out what was actually deleted from the cloud activity log.\n3. Restore in priority order: data first, then compute. Database from snapshot or replica; Storage from versioning or backup\n4. Re-apply the code for stateless resources.\n5. Import anything that survived instead of recreating it.\n6. Verify the application, not just the resources.',
      '**Prevent it happening again:**',
      '- Remove destroy permission from the pipeline identity\n- `prevent_destroy` on critical resources\n- Approval before any destroy\n- Separate state per environment',
    ],
    followUps: [
      'How do you decide what to restore first?',
      'What would you change in the pipeline identity afterwards?',
    ],
    tags: ['incident', 'recovery', 'safety'],
  },
  {
    // Source: s16
    id: 'itv-mytf-81',
    level: 'advanced',
    kind: 'open',
    prompt: 'How do you secure a Terraform pipeline?',
    probing:
      'Pipeline security end to end: identity, least privilege, code protection, scanning and gated apply.',
    answer: [
      'The pipeline uses short-lived credentials from workload identity instead of stored keys, with a separate least-privilege identity per environment. Code is protected with branch rules and code owners, and the actions and provider versions are pinned. Every run does security and policy scanning, and apply only happens in a protected environment after approval. Logs are kept for audit but sensitive output is redacted.',
      '**Controls** (at a glance):',
      '- **Credentials**: OIDC / workload identity, no stored keys\n- **Permissions**: Least privilege, separate identity per environment\n- **Code**: Branch protection, code owners, pinned actions\n- **Scanning**: tfsec, Checkov, secret scanning\n- **Policy**: Sentinel or OPA on the plan\n- **Apply**: Protected environment, approval, one job per state\n- **Logs**: Keep them, but redact secrets',
    ],
    followUps: [
      'How does OIDC federation remove stored cloud keys?',
      'Why pin third-party actions to a commit SHA?',
    ],
    tags: ['ci/cd', 'security'],
  },
  {
    // Source: s18
    id: 'itv-mytf-82',
    level: 'intermediate',
    kind: 'scenario',
    prompt: 'Why is `terraform plan` slow, and how do you speed it up?',
    probing: 'Knowing where plan time goes and why refresh on a huge state is the usual culprit.',
    answer: [
      'First I find out where the time goes: provider download, refresh, or data sources. Usually it is refresh on a very large state, so the real fix is splitting the state. I also replace broad data sources with variables, remove unnecessary `depends_on`, and cache providers in CI. I avoid `-target` as a routine speedup because the plan then hides changes.',
      '**Where the time goes:**',
      '1. `init` downloading providers and modules\n2. Refresh, which calls the cloud API for every resource\n3. Data sources that list everything in an account\n4. Unnecessary graph dependencies',
      '**Fixes** (at a glance):',
      '- **Too many resources**: Split the state\n- **Broad data sources**: Pass IDs as variables\n- **Provider download every run**: Provider cache or mirror\n- **Refresh is the bottleneck**: `-refresh=false` for a quick check only, never for the final plan',
    ],
    tags: ['performance', 'plan'],
  },
  {
    // Source: s20
    id: 'itv-mytf-83',
    level: 'intermediate',
    kind: 'open',
    prompt: 'How do you make code reusable across projects?',
    probing: 'Packaging reusable modules with versions, validated inputs and documentation.',
    answer: [
      'I move repeated patterns into modules that live in their own repo or a private registry with semantic version tags, and consumers pin a version. The module must not contain environment names, account IDs, or credentials; those come in as validated variables. Every module has a README and a working example so other teams can adopt it without reading the internals.',
      '**Steps** (in order):',
      '1. Put the common pattern in a module.\n2. Keep it in its own Git repo or a private registry.\n3. Tag releases: `v1.0.0`.\n4. Consumers pin the version.',
      '**Rules for a reusable module:**',
      '- No environment names or account IDs inside\n- Typed variables with validation\n- Useful outputs\n- A README and an example',
    ],
    code: [
      {
        title: 'Steps',
        language: 'hcl',
        code: `module "vpc" {
  source  = "git::https://github.com/myorg/tf-modules.git//vpc?ref=v1.2.0"
  cidr    = "10.20.0.0/16"
}`,
      },
    ],
    tags: ['modules', 'reuse'],
  },
  {
    // Source: s22
    id: 'itv-mytf-84',
    level: 'intermediate',
    kind: 'open',
    prompt: 'How do you automate plan reviews?',
    probing:
      'Automating plan review: readable summaries, policy checks on the JSON and highlighting deletes.',
    answer: [
      'The pipeline saves the plan and posts a readable summary as a pull request comment, and it also converts the plan to JSON so policy checks can run automatically and any deletes are listed clearly. Reviewers usually miss deletes in a long plan, so highlighting them is the most useful automation. Atlantis or Spacelift give this workflow out of the box.',
      'Post `plan.txt` as a pull request comment.',
      'The second command lists everything that would be deleted, which is the part reviewers miss.',
      '**Tools:** Atlantis and Spacelift post plans and handle apply approval automatically.',
    ],
    code: [
      {
        title: 'In the pipeline',
        language: 'bash',
        code: `terraform plan -out=tfplan -no-color
terraform show -no-color tfplan > plan.txt`,
      },
      {
        title: 'Add automatic checks on the plan',
        language: 'bash',
        code: `terraform show -json tfplan > plan.json
conftest test plan.json                       # policy
terraform show -json tfplan | jq '.resource_changes[] | select(.change.actions[] == "delete") | .address'`,
      },
    ],
    tags: ['review', 'automation'],
  },
  {
    // Source: s23
    id: 'itv-mytf-85',
    level: 'intermediate',
    kind: 'scenario',
    prompt: 'Why is `terraform apply` slow?',
    probing: 'Diagnosing slow applies and knowing when lower parallelism is actually faster.',
    answer: [
      'I check whether it is the number of resources, API throttling, or resources that are simply slow to create like databases and clusters. Splitting the state helps most. If the provider is throttling, lowering parallelism and enabling retries is often faster than pushing more requests. Unnecessary `depends_on` also serializes work that could run in parallel.',
      '**Common causes** (at a glance):',
      '- **Many resources in one state**: Split the state\n- **API rate limiting**: Lower `-parallelism`, enable provider retries\n- **Resources that are slow by nature (RDS, clusters)**: Nothing to fix, plan the window\n- **Long dependency chains**: Remove unnecessary `depends_on`',
      'Lowering parallelism can actually be faster when the provider is throttling you.',
    ],
    code: [{ title: 'Example', language: 'bash', code: `terraform apply -parallelism=5 tfplan` }],
    tags: ['performance', 'apply'],
  },
  {
    // Source: s24, n13
    id: 'itv-mytf-86',
    level: 'intermediate',
    kind: 'open',
    prompt: 'How do you enforce rules like naming and tagging?',
    probing: 'Layered naming and tagging enforcement, starting with defaults and validation.',
    answer: [
      'I start with variable validation and provider default tags, so the right thing happens by default and bad input fails early with a clear message. Then a policy check on the plan with OPA or Sentinel enforces the rules in CI, and a cloud-native policy catches whatever is created outside Terraform. Layering them means one gap does not let everything through.',
      '**Where the checks run:**',
      '1. **Variable validation** — fails immediately with a clear message.\n2. **Default tags in the provider** — nobody can forget them.\n3. **Policy check on the plan** — Sentinel, OPA, or Checkov.\n4. **Cloud policy** — catches anything created outside Terraform.',
      '**Revision notes: Tagging and labelling**',
      '**Why it matters:** Tags drive cost reports, ownership, automated cleanup, and compliance checks. Enforce them with variable validation and a policy check.',
    ],
    code: [
      {
        title: 'Where the checks run',
        language: 'hcl',
        code: `variable "name" {
  type = string

  validation {
    condition     = can(regex("^[a-z][a-z0-9-]{2,20}$", var.name))
    error_message = "Name must be lowercase letters, numbers, and hyphens."
  }
}`,
      },
      {
        title: 'Where the checks run',
        language: 'hcl',
        code: `provider "aws" {
  default_tags {
    tags = {
      Environment = var.environment
      Owner       = var.owner
      ManagedBy   = "terraform"
    }
  }
}`,
      },
      {
        title: 'Set defaults once',
        language: 'hcl',
        code: `provider "aws" {
  default_tags {
    tags = {
      Environment = var.environment
      Owner       = var.owner
      CostCenter  = var.cost_center
      ManagedBy   = "terraform"
    }
  }
}`,
      },
      {
        title: 'Or merge in a module',
        language: 'hcl',
        code: `locals {
  tags = merge(var.common_tags, {
    Component = "database"
  })
}`,
      },
    ],
    tags: ['tagging', 'validation', 'policy'],
  },
  {
    // Source: s25
    id: 'itv-mytf-87',
    level: 'intermediate',
    kind: 'open',
    prompt: 'How do you set up least privilege IAM in Terraform?',
    probing: 'Least privilege in practice: narrow roles, smallest scope, no static keys.',
    answer: [
      'I grant a narrow role at the smallest possible scope, on the single bucket or resource group rather than the whole project or subscription, and I avoid primitive roles like Owner or Editor. Identities use workload identity or managed identity so there are no static keys to leak. When something is denied, I read the audit log to find the exact missing permission instead of widening the role to make it pass.',
      '**Rules** (in order):',
      '1. No `Owner`, `Editor`, or `*` on production.\n2. Use narrow predefined roles, or a custom role with only the needed permissions.\n3. Grant at the smallest scope: one bucket, one resource group, not the whole subscription.\n4. Use workload identity instead of static keys.',
    ],
    code: [
      {
        title: 'GCP example',
        language: 'hcl',
        code: `resource "google_storage_bucket_iam_member" "app_reader" {
  bucket = google_storage_bucket.data.name
  role   = "roles/storage.objectViewer"
  member = "serviceAccount:\${google_service_account.app.email}"
}`,
      },
      {
        title: 'Azure example',
        language: 'hcl',
        code: `resource "azurerm_role_assignment" "app_reader" {
  scope                = azurerm_storage_account.data.id
  role_definition_name = "Storage Blob Data Reader"
  principal_id         = azurerm_user_assigned_identity.app.principal_id
}`,
      },
    ],
    tags: ['iam', 'security'],
  },
  {
    // Source: s26
    id: 'itv-mytf-88',
    level: 'intermediate',
    kind: 'scenario',
    prompt: 'Terraform cannot authenticate to the cloud. How do you debug it?',
    probing: 'A systematic auth debugging order, starting from which identity is really in use.',
    answer: [
      'I first confirm which identity Terraform is actually using with `sts get-caller-identity` or `az account show`, because the problem is usually a different identity than expected. Then I check whether the environment variables are set in the job, whether the secret expired, whether the right subscription is selected, and whether the role assignment exists. For OIDC I check that the trust condition matches the repository and branch.',
      '**Check in this order:**',
      '1. Which credentials is Terraform actually using?\n2. Are the environment variables set in the pipeline?\n3. Has the secret or certificate expired?\n4. Is the right subscription, project, or account selected?\n5. Does the identity have the role it needs?\n6. For OIDC, does the trust condition match the repo and branch?',
    ],
    code: [
      {
        title: 'Check in this order',
        language: 'bash',
        code: `aws sts get-caller-identity
az account show
gcloud auth list`,
      },
      {
        title: 'Check in this order',
        language: 'bash',
        code: `ARM_CLIENT_ID  ARM_CLIENT_SECRET  ARM_TENANT_ID  ARM_SUBSCRIPTION_ID
AWS_ROLE_ARN   AWS_WEB_IDENTITY_TOKEN_FILE`,
      },
    ],
    tags: ['troubleshooting', 'authentication'],
  },
  {
    // Source: s27
    id: 'itv-mytf-89',
    level: 'intermediate',
    kind: 'open',
    prompt: 'How do you keep shared modules secure?',
    probing: 'Secure-by-default module design and a controlled release process.',
    answer: [
      'Modules live in a protected repo with code owner review and their own security scanning, and they are released with semantic versions so nothing reaches consumers silently. The important part is secure defaults: encryption on, public access off, so a team has to deliberately opt out of safety rather than remember to opt in.',
      '**Controls** (in order):',
      "1. Modules live in a private registry or a protected repo.\n2. Code owner review before release.\n3. Security scanning in the module's own pipeline.\n4. Secure defaults: encryption on, public access off.\n5. Semantic versions, so a change cannot silently reach everyone.",
      'Make the safe option the default, and make the unsafe option something you have to ask for.',
    ],
    code: [
      {
        title: 'Example of a secure default',
        language: 'hcl',
        code: `variable "public_access" {
  type    = bool
  default = false
}`,
      },
    ],
    tags: ['modules', 'security'],
  },
  {
    // Source: s28, s35, n15
    id: 'itv-mytf-90',
    level: 'intermediate',
    kind: 'open',
    prompt: 'How do you monitor Terraform changes in production?',
    probing:
      'Auditability and fast detection of bad changes: plan artifacts, notifications, approvals and smoke checks.',
    answer: [
      'Every run stores its plan as an artifact, posts a summary to the team channel, and records who approved it. Apply output is kept in JSON for the audit trail, and I correlate it with cloud audit logs. After apply the pipeline runs a smoke check and I watch the service dashboards, because the value is in noticing a bad change quickly, not just in having the logs.',
      '**What to capture** (in order):',
      '1. The plan artifact for every run, stored and access controlled.\n2. A notification to Slack or Teams with the summary before apply.\n3. Approval recorded with who approved and when.\n4. Apply logs stored for audit.\n5. Cloud audit logs to correlate.',
      '**After apply:** Run a smoke check, and watch dashboards and alarms for the next few minutes.',
      '**Related question: How do you monitor and notify on Terraform deployments?**',
      'The pipeline produces JSON output and posts a change summary to the team channel, so everyone can see what was applied and by whom. Terraform also creates the alarms and dashboards for the resources it builds, so the service is monitored from day one. On top of that, cloud audit logs and the nightly drift job catch changes that did not come from the pipeline.',
      'Send the summary to Slack or Teams:',
      '**Also monitor** (key points):',
      '- Alarms and dashboards created by Terraform itself\n- Cloud audit logs for changes made outside Terraform\n- Drift job results',
      '**Revision notes: Monitoring and logging**',
      '1. Create the alarms and dashboards in Terraform along with the resource, so nothing ships unmonitored.\n2. Enable cloud logging: CloudTrail, Azure Activity Log, GCP Audit Logs.\n3. Alert on drift job results and failed applies.\n4. Send apply summaries to the team channel.',
    ],
    code: [
      {
        title: 'Machine-readable output',
        language: 'bash',
        code: `terraform apply -json tfplan | tee apply.json`,
      },
      {
        title: 'In the pipeline',
        language: 'bash',
        code: `terraform apply -json tfplan > apply.json`,
      },
      {
        title: 'Send the summary to Slack or Teams',
        language: 'bash',
        code: `curl -X POST -H 'Content-type: application/json' \\
  --data "{\\"text\\":\\"Terraform apply finished for prod: $(jq -r '.[] | select(.type==\\"change_summary\\") | .message' apply.json)\\"}" \\
  "$SLACK_WEBHOOK"`,
      },
      {
        title: 'Example',
        language: 'hcl',
        code: `resource "aws_cloudwatch_metric_alarm" "cpu" {
  alarm_name          = "web-high-cpu"
  metric_name         = "CPUUtilization"
  namespace           = "AWS/EC2"
  comparison_operator = "GreaterThanThreshold"
  threshold           = 80
  evaluation_periods  = 2
  period              = 300
  statistic           = "Average"
  alarm_actions       = [aws_sns_topic.alerts.arn]
}`,
      },
    ],
    tags: ['monitoring', 'audit'],
  },
  {
    // Source: s29
    id: 'itv-mytf-91',
    level: 'advanced',
    kind: 'open',
    prompt: 'How do you do immutable infrastructure?',
    probing:
      'Immutable infrastructure with versioned images, instance refresh and simple rollback.',
    answer: [
      'Instead of changing servers in place, I build a new versioned image, point the launch template at it, and let the autoscaling instance refresh replace instances gradually while health checks protect the rollout. Rollback is just pointing back at the previous image version. Data stays outside the instances, in managed services, so replacing a server is never risky.',
      '**The idea:** Do not patch a running server. Build a new image and replace the servers.',
      '**Flow** (step by step):',
      '1. Build and scan a new image, tagged with a version.\n2. Update the launch template to that image.\n3. Autoscaling instance refresh replaces instances gradually.\n4. Health checks decide whether the new instances stay.\n5. Roll back by pointing at the previous image version.',
    ],
    code: [
      {
        title: 'Example',
        language: 'hcl',
        code: `resource "aws_launch_template" "web" {
  image_id = var.ami_id   # a new AMI means a new template version
}

resource "aws_autoscaling_group" "web" {
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
      'Where does the image get built and scanned?',
      'How do you keep data safe when every server is replaceable?',
    ],
    tags: ['immutable', 'deployment'],
  },
  {
    // Source: s31
    id: 'itv-mytf-92',
    level: 'intermediate',
    kind: 'scenario',
    prompt: 'A `terraform import` failed. What do you check?',
    probing:
      'Knowing the common import failure causes: ID format, address quoting, provider alias and permissions.',
    answer: [
      'I check the ID format for that specific resource type, quote the address when it contains brackets, and make sure I am using the right provider alias for the region or account. I also confirm the identity can read the resource and that no other state already manages it. After a successful import I use `state show` to copy the real settings into my code and keep planning until nothing unexpected appears.',
      '**Checklist** (at a glance):',
      '- **ID format**: Each resource type has its own format, for example a subnet needs `subnet-abc123`, an Azure resource needs the full resource ID\n- **Resource address**: Quote it if it has brackets: `\'module.net.aws_subnet.app["a"]\'`\n- **Provider alias**: Set `provider = aws.west` on the resource block if the resource lives in another region or account (the old `-provider` import flag was removed)\n- **Permissions**: The identity must be able to read the resource\n- **Already managed**: Another state may already own it\n- **Resource type**: The block type must match the real object',
    ],
    code: [
      {
        title: 'Example',
        language: 'bash',
        code: `terraform import 'module.network.aws_subnet.private["a"]' subnet-0abc123`,
      },
      {
        title: 'After import',
        language: 'bash',
        code: `terraform state show 'module.network.aws_subnet.private["a"]'
terraform plan   # keep fixing the code until this is clean`,
      },
    ],
    tags: ['import', 'troubleshooting'],
  },
  {
    // Source: s34, s43
    id: 'itv-mytf-93',
    level: 'advanced',
    kind: 'open',
    prompt: 'How do you roll back a bad deployment?',
    probing: 'Whether you know Terraform has no rollback command and design for rollback up front.',
    answer: [
      'There is no rollback command. I revert the code to the last good commit and apply a new reviewed plan. But I always say clearly that this does not bring back deleted data or undo a database migration, so real rollback safety comes from backups, blue-green deployment, and deletion protection. Restoring an old state file is not a rollback; it just makes Terraform believe something untrue.',
      '**Terraform has no rollback command:** Rollback means: revert the code and apply again.',
      '**What re-applying old code will NOT do:**',
      '- Bring back deleted data\n- Undo a database migration\n- Reverse everything a provider did',
      '**So plan for it in advance:**',
      '- Backups you have actually restored once\n- Blue-green or canary so rollback is a traffic switch\n- Deletion protection on data resources',
      '**Important point:** Restoring an old **state** file is not a rollback. It only makes Terraform believe wrong information.',
      '**Related question: How do you implement rollback?**',
      'Rollback is reverting the code and applying a new reviewed plan, not restoring an old state file. Applying old code cannot bring back deleted data or undo a migration, so I design for rollback up front. That means blue-green so rollback is just a traffic switch, backward-compatible migrations, deletion protection, and backups that have actually been restored once in a test.',
      '**There is no rollback command:** Rollback means revert the code and apply a new plan.',
      '**Design for rollback in advance:**',
      '- **Stateless app or servers**: Blue-green or previous image version, switch traffic\n- **Configuration change**: Revert the code and apply\n- **Database schema**: Backward-compatible migration plus a restore plan\n- **Deleted data**: Only backups can help',
    ],
    code: [
      {
        title: 'Rollback means: revert the code and apply again',
        language: 'bash',
        code: `git revert <bad-commit>
terraform plan -out=rollback.tfplan   # review it carefully
terraform apply rollback.tfplan`,
      },
      {
        title: 'Rollback means revert the code and apply a new plan',
        language: 'bash',
        code: `git revert <bad-commit>
terraform plan -out=rollback.tfplan
terraform apply rollback.tfplan`,
      },
    ],
    followUps: [
      'Why is restoring an old state file not a rollback?',
      'How does blue-green change the rollback story?',
    ],
    tags: ['rollback', 'deployment'],
  },
  {
    // Source: s36
    id: 'itv-mytf-94',
    level: 'intermediate',
    kind: 'open',
    prompt: 'How do you manage GCP IAM or Azure RBAC in Terraform?',
    probing:
      'Managing role bindings in code and knowing the authoritative GCP IAM resources can remove access.',
    answer: [
      'I keep role assignments in Terraform so access is reviewed like any other change, granting narrow roles at the smallest scope. One thing I always mention is that in GCP the `_policy` and `_binding` resources are authoritative and can remove existing access, so I use `_member` unless I truly intend to own the whole policy.',
      '**Keep bindings in code, not in the console:**',
      '**Careful with authoritative resources:** `google_project_iam_policy` and `google_project_iam_binding` replace existing bindings and can lock people out. Prefer `_member`, which only adds one binding.',
    ],
    code: [
      {
        title: 'Azure',
        language: 'hcl',
        code: `resource "azurerm_role_assignment" "app_kv" {
  scope                = azurerm_key_vault.app.id
  role_definition_name = "Key Vault Secrets User"
  principal_id         = azurerm_user_assigned_identity.app.principal_id
}`,
      },
      {
        title: 'GCP',
        language: 'hcl',
        code: `resource "google_project_iam_member" "app_logs" {
  project = var.project_id
  role    = "roles/logging.logWriter"
  member  = "serviceAccount:\${google_service_account.app.email}"
}`,
      },
    ],
    tags: ['iam', 'gcp', 'azure'],
  },
  {
    // Source: s37
    id: 'itv-mytf-95',
    level: 'intermediate',
    kind: 'scenario',
    prompt: 'A teammate changed something in the console. What do you do?',
    probing:
      'Handling a colleague’s console change with facts and conversation before overwriting it.',
    answer: [
      'I run a plan to see exactly what differs and check the audit log for who changed it and why. Then I talk to that person, because a manual change is often a valid emergency fix. If it should stay, I put it in the code so the code stays the source of truth; if not, an approved apply restores it. If it keeps happening, the real fix is removing console write access.',
      '**Steps** (in order):',
      '1. Run a plan to see the difference.\n2. Check the audit log for who and why.\n3. Ask them: was this a temporary fix or the new intended setting?\n4. If it should stay, put it in the code and apply.\n5. If not, an approved apply restores the code value.\n6. Tell the team, and tighten console access if it keeps happening.',
    ],
    tags: ['drift', 'teamwork'],
  },
  {
    // Source: s39
    id: 'itv-mytf-96',
    level: 'intermediate',
    kind: 'open',
    prompt: 'How do you secure Terraform code in GitHub?',
    probing:
      'Repository and workflow controls on GitHub, and rotating a leaked secret rather than just deleting it.',
    answer: [
      'Branch protection with required reviews and status checks, code owners on modules and production folders, and secret scanning with push protection. The workflow uses OIDC instead of stored keys, pins actions, and applies only through a protected environment with required reviewers. If a secret ever gets committed, I rotate it immediately, because cleaning the history does not make it un-leaked.',
      '**Repository settings:**',
      '1. Branch protection on `main`, no direct pushes\n2. Required reviews and code owners\n3. Required status checks: fmt, validate, tfsec, plan\n4. Secret scanning and push protection turned on',
      '- Use OIDC, not long-lived keys in secrets\n- Pin actions to a version or commit SHA\n- Use environments with required reviewers for production',
      '**If a secret is committed:** Rotate it immediately. Removing it from history is not enough, it has already been exposed.',
    ],
    code: [
      {
        title: 'Workflow settings',
        language: 'yaml',
        code: `permissions:
  id-token: write   # OIDC
  contents: read`,
      },
    ],
    tags: ['github', 'security'],
  },
  {
    // Source: s44
    id: 'itv-mytf-97',
    level: 'intermediate',
    kind: 'open',
    prompt: 'How do you organize modules for reuse?',
    probing:
      'A sensible module breakdown with contracts, versions and no environment names inside.',
    answer: [
      'I build one module per component, network, compute, database, IAM, and monitoring, each with a clear input and output contract and no environment names inside. They are versioned in a registry or Git and consumers pin a version. That way an improvement to the module can be rolled out team by team instead of surprising everyone at once.',
      '**Rules** (key points):',
      '- One module, one purpose\n- No environment names inside\n- Version everything\n- Document inputs and outputs',
    ],
    code: [
      {
        title: 'Typical set',
        language: 'text',
        code: `modules/
  network/     VPC or VNet, subnets, routing
  compute/     VM, autoscaling, or node pools
  database/    managed database with backups
  iam/         roles and role assignments
  monitoring/  alarms and dashboards`,
      },
      {
        title: 'How teams consume them',
        language: 'hcl',
        code: `module "network" {
  source  = "app.terraform.io/myorg/network/azurerm"
  version = "2.1.0"

  address_space = var.address_space
  subnets       = var.subnets
}`,
      },
    ],
    tags: ['modules', 'structure'],
  },
  {
    // Source: s47
    id: 'itv-mytf-98',
    level: 'basic',
    kind: 'open',
    prompt: 'How does a team share state?',
    probing: 'Basic team setup for shared state and who is allowed to write it.',
    answer: [
      'State lives in a shared remote backend with encryption, locking, and versioning, with one key per environment and component. The pipeline is the only identity that writes to production; engineers get read access so they can plan but not apply. That combination is what actually prevents two people overwriting each other.',
      '**Rules for the team:**',
      '1. One state key per environment and component.\n2. Locking always on.\n3. Versioning on for recovery.\n4. Humans get read access, the pipeline gets write access.\n5. Nobody applies from a laptop against production.',
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
    ],
    tags: ['state', 'team'],
  },
  {
    // Source: s48
    id: 'itv-mytf-99',
    level: 'basic',
    kind: 'open',
    prompt: 'You changed a variable and want to see the impact. What do you do?',
    probing: 'Reading the whole plan for side effects instead of only the resource you expected.',
    answer: [
      'I run a plan with the right var file and read the whole thing, not just the resource I expected to change, because an immutable field can turn a small value change into a replacement. I look specifically for `forces replacement`, destroys, and changed outputs that other stacks depend on. I avoid `-target`, because narrowing the plan hides exactly what I am trying to catch.',
      '**What to look for:**',
      '1. Not just the resource you expected. Look at everything.\n2. Any `forces replacement`.\n3. Any destroy.\n4. Changed outputs, which other stacks may depend on.',
      '**Do not use `-target` to "just check one thing":** It hides everything else.',
    ],
    code: [
      {
        title: 'Run a plan',
        language: 'bash',
        code: `terraform plan -var-file=prod.tfvars -out=tfplan`,
      },
      {
        title: 'Machine-readable check',
        language: 'bash',
        code: `terraform show -json tfplan | jq -r '.resource_changes[] | "\\(.change.actions | join(",")) \\(.address)"'`,
      },
    ],
    tags: ['plan', 'workflow'],
  },
  {
    // Source: s51
    id: 'itv-mytf-100',
    level: 'advanced',
    kind: 'open',
    prompt: 'How do you provision environments end to end?',
    probing:
      'End-to-end environment provisioning: modules, per-env values, pipeline selection and cost control.',
    answer: [
      'Reusable modules plus one tfvars file per environment, and the pipeline selects the backend config and var file for the chosen environment. Terraform builds the platform, for example the cluster and node groups sized per environment, and application deployment is handled separately by Argo CD or Helm. For dev I add a scheduled scale-down or destroy outside working hours to control cost, while production stays permanent.',
      '**Pieces** (in order):',
      '1. `modules/` for reusable components.\n2. `environments/<env>.tfvars` for values.\n3. A pipeline that picks the environment from the branch or an input.\n4. Environment-specific sizing, for example small nodes in dev, larger in prod.\n5. Application deployment handled by a separate tool such as Argo CD or Helm.\n6. Cost control in dev: scale down or destroy outside working hours.',
    ],
    code: [
      {
        title: 'Pipeline snippet',
        language: 'yaml',
        code: `- run: terraform init -backend-config=envs/\${{ inputs.env }}.backend.hcl
- run: terraform plan -var-file=envs/\${{ inputs.env }}.tfvars -out=tfplan`,
      },
    ],
    followUps: [
      'Why hand application deployment to Argo CD or Helm instead of Terraform?',
      'How would you schedule scale-down of dev safely?',
    ],
    tags: ['environments', 'ci/cd', 'cost'],
  },
]
