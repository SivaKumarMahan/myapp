# Content authoring guide

How to add or change lessons, exam questions, commands and interview questions. Every rule below is enforced by `npm test`.

App root: `/home/nagasunilkumarrajulapati/Documents/A/Myapp` — a React + TS + Vite PWA ("Azure Learning Hub").
Before running any node/npm/npx command: `export PATH=$HOME/.local/node22/bin:$PATH` (system node is v12 and will fail).

## The content model

Read `src/content/types.ts` first — it is the contract. Everything you write is plain TypeScript
exporting typed objects (`Topic`, `Question`, `CommandGroup`, `InterviewTopic`, `InterviewQuestion`).

**Reference examples of the expected depth and style** (a friend's DevOps app this one is based on — read them, do not copy them):

- Lesson: `/home/nagasunilkumarrajulapati/Documents/A/devopsApp/Devops/src/content/terraform/topics/iac/what-is-iac.ts` (~400 lines each)
- Exam questions: `/home/nagasunilkumarrajulapati/Documents/A/devopsApp/Devops/src/content/docker/questions/foundations.ts`
- Command reference: `/home/nagasunilkumarrajulapati/Documents/A/devopsApp/Devops/src/content/docker/commands.ts`
- Interview topic + questions: `src/content/interview/topics/terraform/index.ts` and `core.ts` (already in this repo)

## Mapping the Topic fields onto Azure

The Topic type came from a Kubernetes app; use its fields like this for Azure:

| Field                              | Use it for                                                                                                                                                                                                                                                                 |
| ---------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `keyObjects`                       | Azure resource types / concepts. `kind`: e.g. `Storage account (Microsoft.Storage/storageAccounts)`. `apiVersion` optional (e.g. `'2023-05-01'`) — omit for pure concepts. `fields[].path`: property paths (`properties.minimumTlsVersion`, `sku.name`) or concept facets. |
| `yamlExamples`                     | "Code examples": Bicep (`language: 'bicep'`), ARM JSON (`'json'`), pipeline YAML (`'yaml'`), KQL (`'text'`), PowerShell (`'powershell'`), Azure CLI (`'bash'`).                                                                                                            |
| `imperative`                       | Azure CLI (`az ...`) and/or Azure PowerShell commands, each with `what` and ideally `expected`.                                                                                                                                                                            |
| `declarative`                      | The IaC way: steps + Bicep/ARM/YAML code. For purely conceptual AZ-900 lessons, a small Bicep or ARM sample is fine.                                                                                                                                                       |
| `verification` / `troubleshooting` | `az ... show/list` commands, KQL, `Get-Az...`, Network Watcher, etc. `namespaceNote` is rendered as a generic "Note:" line — use it for scope/subscription caveats or omit it.                                                                                             |
| `examTips`                         | Exam-specific advice for THIS exam (AZ-900/AZ-104/AZ-400).                                                                                                                                                                                                                 |
| `lab`                              | Hands-on lab in a real Azure subscription (free account / Cloud Shell OK), or Azure DevOps / GitHub for AZ-400. Always include a `cleanup` that deletes what was created (`az group delete -n <rg> --yes --no-wait`).                                                      |
| `docs`                             | Deep links to `https://learn.microsoft.com/...` (or `docs.github.com` for GitHub).                                                                                                                                                                                         |

## Hard rules (enforced by `src/content/courses.test.ts` and `src/content/interview.test.ts`)

Lessons (every Topic):

- `explanation` ≥2 paragraphs, `whyItMatters` ≥2, `howItWorks` ≥3, `keyObjects` ≥1, `realWorldExample.story` ≥2, `yamlExamples` ≥1, `imperative` ≥2, `declarative.code` ≥1, `verification` ≥2, `troubleshooting` ≥2, `commonMistakes` ≥3, `examTips` ≥3, `summary` ≥3, `practice` ≥3 (ids `<topicId>-p1`, `-p2`...; answer >10 chars; prompt >15 chars; no ``` fences), `lab.tasks` ≥4, `lab.solution` ≥1, `lab.verification` ≥1.
- `estimatedMinutes` between 8 and 45. `order` unique within the domain (use the order in the plan below).
- At least ONE diagram per lesson (aim for 2). Each diagram needs `title` (>8 chars) and `caption`.
  Flow: 3–7 nodes. Sequence: 2–4 participants, messages only between declared participant ids. Decision: ≥2 branches and `question` ends with `?`. Nested: depth ≤4.
  **No `**` and no backticks anywhere inside a diagram** (SVG prints them literally). Keep diagram labels short (≈ under 40 chars; details under ~60).
- `relatedTopicIds` may ONLY reference topic ids in the same course (use the plan below), never itself.
- No text matching `TODO|TBD|FIXME|lorem ipsum|coming soon|placeholder text|xxx` anywhere.
- Prose supports only two inline markers (rendered by RichText): `` `code` `` and `**bold**`. No other markdown, no links, no lists-in-strings. Markers must be balanced.
- Template literals: escape `${` as `\${` inside code samples (Bicep interpolation, pipeline `${{ }}`, bash vars). Escape backticks inside template literals. `$(var)` Azure Pipelines macro syntax is fine unescaped.
- YAML samples use 2-space indentation, never tabs.
- Never hardcode anything resembling a real secret (no keys, connection strings with AccountKey=..., PATs, private keys). Use `<placeholder>` tokens.

Exam questions (`Question`):

- `kind`: `mcq` (exactly 1 correct), `multi` (≥2 correct, fewer than all), `command` (`acceptedAnswers` each >4 chars, include sensible variants; comparison is whitespace/quote-normalised and lowercased), or `task` (≥2 `checkpoints`, ≥1 `solution`). Mostly mcq/multi — Microsoft exams are choice-based — with a few `command` ones (az CLI) and 1–2 `task` per agent.
- `explanation` >30 chars and should say why the wrong options are wrong. `points` ≥1 (1 beginner, 2 intermediate/advanced).
- `domainId` and `topicId` must match a lesson of that same domain in the plan below.
- Use your assigned id prefix: `<prefix>-1`, `<prefix>-2`, ...
- Distractors must be plausible. Every option text distinct.
- ALL questions are ORIGINAL — never reproduce real exam questions or "dumps".

Command reference (`CommandGroup[]`): group ids `<cmdprefix>-cmd-<name>`, entry ids `<cmdprefix>-c-<name>` (globally unique). Each entry: `command`, `description`, optional `placeholders`, `example`, `notes`, and `tags`.

Interview questions (`InterviewQuestion`): ids `itv-<topicprefix>-N` (prefix is `[a-z0-9]+`). Every question needs `prompt` (>15), `probing` (>15), `answer` ≥2 paragraphs each >20 chars, `tags` ≥1 matching `^[a-z0-9][a-z0-9 ._+/-]*$` (lowercase!). `mcq`/`multi` need `options` (≥3, each text >3 chars, distinct) and `correct`; `open`/`scenario` must NOT have `options`/`correct`. Each topic: ≥6 questions, must include `basic` AND `advanced`, and ≥1 `scenario`. >80% of `advanced` questions have `deeper` or `followUps`. Give lots of `code` samples (allowed languages: bash, yaml, json, dockerfile, hcl, python, powershell, bicep, text) and diagrams (aim ≥1 diagram per 3 questions). Topic `headlines` ≥3.

## Accuracy

Write for a beginner first, then add the nuance. Be technically correct and current (2026): Microsoft Entra ID (not "Azure AD"), Microsoft Defender for Cloud, Azure Monitor Agent (not the legacy MMA/Log Analytics agent), Container Apps, workload identity federation for service connections, Bicep as the recommended IaC. If unsure of a precise number/limit, say it more generally rather than inventing one.

## Validating your work

From the app root:

```bash
export PATH=$HOME/.local/node22/bin:$PATH
npx tsc -b                                   # typecheck (whole app)
npx vitest run src/content/courses.test.ts   # course integrity (or interview.test.ts)
npx prettier --write <your files>
npx eslint <your files>
```

---

## The lesson plan (all courses — use these exact ids for cross-references)

### AZ-900 (`src/content/az900/`), course id `az900`

Domain `az9-cloud` → folder `topics/cloud/`, questions `questions/cloud.ts` (export `az900CloudTopics` / `az900CloudQuestions`)

1. `az9-cloud-computing` — What cloud computing is, and the shared responsibility model (beginner)
2. `az9-cloud-models` — Public, private and hybrid cloud; the consumption-based model and pricing models (beginner)
3. `az9-cloud-benefits` — High availability, scalability, elasticity, reliability, predictability, security, governance, manageability (beginner)
4. `az9-service-types` — IaaS, PaaS and SaaS, and where responsibility shifts (intermediate)

Domain `az9-architecture` → `topics/architecture/`, `questions/architecture.ts` (`az900ArchitectureTopics` / `az900ArchitectureQuestions`)

1. `az9-core-architecture` — Regions, region pairs, sovereign regions, availability zones; resources, resource groups, subscriptions, management groups (beginner)
2. `az9-compute-services` — VMs, scale sets, availability sets, Azure Virtual Desktop, containers (ACI, Container Apps, AKS), Functions, App Service (intermediate)
3. `az9-networking-services` — VNets, subnets, peering, VPN Gateway, ExpressRoute, Azure DNS, public and private endpoints (intermediate)
4. `az9-storage-services` — Storage accounts, redundancy (LRS/ZRS/GRS/GZRS/RA-), access tiers, Blob/Files/Queue/Table/Disk, AzCopy, Storage Explorer, File Sync, Azure Migrate, Data Box (intermediate)
5. `az9-identity-security` — Entra ID, Entra Domain Services, SSO/MFA/passwordless, external identities, Conditional Access, Azure RBAC, Zero Trust, defense in depth, Defender for Cloud (advanced)

Domain `az9-management` → `topics/management/`, `questions/management.ts` (`az900ManagementTopics` / `az900ManagementQuestions`)

1. `az9-cost-management` — Factors affecting cost, Pricing calculator, TCO, Cost Management, budgets, tags (beginner)
2. `az9-governance-compliance` — Microsoft Purview, Azure Policy, resource locks, Service Trust Portal (intermediate)
3. `az9-deployment-tools` — Portal, Cloud Shell, Azure CLI, Azure PowerShell, Azure Arc, ARM/Bicep and infrastructure as code (intermediate)
4. `az9-monitoring-tools` — Azure Advisor, Service Health, Azure Monitor, Log Analytics, alerts, Application Insights (advanced)

### AZ-104 (`src/content/az104/`), course id `az104`

Domain `az1-identity` → `topics/identity/`, `questions/identity.ts` (`az104IdentityTopics` / `az104IdentityQuestions`)

1. `az1-entra-users-groups` — Users, groups (assigned/dynamic), licenses, external (B2B) users, SSPR (beginner)
2. `az1-rbac` — Built-in roles, custom roles, scopes, inheritance, interpreting access, Entra roles vs Azure roles (intermediate)
3. `az1-subscriptions-governance` — Management groups, subscriptions, resource groups, moving resources, locks, tags, budgets, cost alerts, Advisor (intermediate)
4. `az1-azure-policy` — Definitions, initiatives, assignments, effects (deny/audit/modify/deployIfNotExists/append), remediation, compliance (advanced)

Domain `az1-storage` → `topics/storage/`, `questions/storage.ts` (`az104StorageTopics` / `az104StorageQuestions`)

1. `az1-storage-accounts` — Account kinds, performance, redundancy, failover, encryption (Microsoft- vs customer-managed keys, infrastructure encryption) (beginner)
2. `az1-storage-security` — Firewalls & VNets, access keys & rotation, SAS types (account/service/user delegation), stored access policies, Entra auth, identity-based access for Azure Files (advanced)
3. `az1-blob-storage` — Containers, access tiers (hot/cool/cold/archive), rehydration, lifecycle management, versioning, soft delete, snapshots, object replication, AzCopy/Storage Explorer (intermediate)
4. `az1-azure-files` — File shares, SMB/NFS, snapshots, soft delete, Azure File Sync (intermediate)

Domain `az1-compute` → `topics/compute/`, `questions/compute.ts` (`az104ComputeTopics` / `az104ComputeQuestions`)

1. `az1-arm-bicep` — Interpret, modify and deploy ARM templates and Bicep, deployment modes, what-if, export, decompile (intermediate)
2. `az1-virtual-machines` — Create VMs, sizes, resize, disks (managed disk types), encryption (ADE vs encryption at host / SSE), availability sets vs zones, moving VMs (beginner)
3. `az1-vm-scale-sets` — Orchestration modes, autoscale rules, upgrade policies, zones (intermediate)
4. `az1-containers` — Azure Container Registry (SKUs, tasks, auth), Container Instances, Container Apps (scaling, revisions, ingress) (intermediate)
5. `az1-app-service` — Plans & tiers, scale up/out, custom domains & certificates, backup, networking (VNet integration, access restrictions), deployment slots & swap (advanced)

Domain `az1-networking` → `topics/networking/`, `questions/networking.ts` (`az104NetworkingTopics` / `az104NetworkingQuestions`)

1. `az1-vnets-peering` — VNets, address spaces, subnets, peering (non-transitive, gateway transit), global peering (beginner)
2. `az1-routing-public-ip` — Public IP SKUs, system routes, user-defined routes, NVAs, next hop, NAT gateway (intermediate)
3. `az1-nsg-bastion` — NSG rules & priority, default rules, ASGs, effective security rules, Azure Bastion (intermediate)
4. `az1-private-endpoints` — Service endpoints vs private endpoints, private DNS zones, Private Link (advanced)
5. `az1-dns-load-balancing` — Azure DNS public/private zones, record sets, Load Balancer (public/internal, SKUs, probes, rules), choosing LB vs App Gateway vs Front Door vs Traffic Manager, troubleshooting (intermediate)

Domain `az1-monitor` → `topics/monitor/`, `questions/monitor.ts` (`az104MonitorTopics` / `az104MonitorQuestions`)

1. `az1-azure-monitor` — Metrics, logs, diagnostic settings, Log Analytics & KQL, alert rules, action groups, alert processing rules, VM/Storage/Network insights, Azure Monitor Agent & DCRs (intermediate)
2. `az1-network-watcher` — IP flow verify, next hop, connection troubleshoot, Connection Monitor, flow logs, topology (intermediate)
3. `az1-backup-recovery` — Recovery Services vault vs Backup vault, backup policies, restore types, soft delete, Azure Site Recovery replication & failover, backup reports & alerts (advanced)

### AZ-400 (`src/content/az400/`), course id `az400`

Domain `az4-processes` → `topics/processes/`, `questions/processes.ts` (`az400ProcessesTopics` / `az400ProcessesQuestions`)

1. `az4-work-tracking` — Azure Boards & GitHub Projects/Issues, flow of work, GitHub Flow, traceability (AB# links), cycle/lead time, DORA metrics, dashboards (beginner)
2. `az4-docs-integration` — Wikis, Markdown & Mermaid, release notes & API docs, webhooks, service hooks, Teams/Slack integration (intermediate)

Domain `az4-source` → `topics/source/`, `questions/source.ts` (`az400SourceTopics` / `az400SourceQuestions`)

1. `az4-branching-pr` — Trunk-based, feature and release branching, pull requests, branch policies (Azure Repos) and branch protection/rulesets (GitHub), merge strategies (intermediate)
2. `az4-repo-management` — Git LFS, Scalar, monorepo vs multi-repo, repo permissions, tags, recovering data (reflog, revert), removing secrets from history (git filter-repo, BFG) (advanced)

Domain `az4-pipelines` → lessons split across two folders (same domainId `az4-pipelines`):
Part A → `topics/pipelines/part-a/` (export `az400PipelinesPartATopics`), questions `questions/pipelines-a.ts` (`az400PipelinesPartAQuestions`)

1. `az4-package-management` — Azure Artifacts feeds, upstream sources, views, GitHub Packages, SemVer/CalVer, dependency versioning (beginner)
2. `az4-testing-strategy` — Test pyramid, unit/integration/load tests in pipelines, code coverage, quality gates and release gates (intermediate)
3. `az4-yaml-pipelines` — Azure Pipelines YAML anatomy: triggers (CI, PR, scheduled, pipeline), stages/jobs/steps, dependsOn/conditions, parallel and matrix jobs, multi-stage (beginner)
4. `az4-agents-runners` — Microsoft-hosted vs self-hosted agents, agent pools, scale-set agents, Managed DevOps Pools, GitHub-hosted vs self-hosted/larger runners, cost and licensing (parallel jobs) (intermediate)
5. `az4-github-actions` — Workflows, events, jobs, actions, secrets & variables, environments, reusable workflows, composite actions, OIDC login to Azure (intermediate)

Part B → `topics/pipelines/part-b/` (export `az400PipelinesPartBTopics`), questions `questions/pipelines-b.ts` (`az400PipelinesPartBQuestions`) 6. `az4-pipeline-templates` — YAML templates (step/job/stage/extends), parameters vs variables, variable groups, runtime vs compile-time expressions, task groups (advanced) 7. `az4-deployment-strategies` — Blue-green, canary, ring, rolling, progressive exposure, feature flags (Azure App Configuration), A/B testing, deployment slots & VIP swap (advanced) 8. `az4-environments-approvals` — Environments, approvals and checks, gates, deployment jobs & lifecycle hooks, GitHub environment protection rules, classic release pipelines (intermediate) 9. `az4-iac-pipelines` — Bicep/ARM/Terraform in pipelines, what-if/plan as PR checks, state, desired state configuration (Azure Automanage Machine Configuration), Azure Deployment Environments (advanced) 10. `az4-pipeline-maintenance` — Pipeline health (failure rate, duration, flaky tests), caching, optimizing cost/time, concurrency, retention policies, migrating classic to YAML (intermediate)

Orders: part A lessons use `order` 1–5, part B use 6–10 (same domain, so orders must not collide).

Domain `az4-security` → `topics/security/`, `questions/security.ts` (`az400SecurityTopics` / `az400SecurityQuestions`)

1. `az4-pipeline-security` — Service principals vs managed identities vs workload identity federation, service connections, GITHUB_TOKEN/GitHub Apps/PATs, Key Vault & secrets, secure files, permissions (intermediate)
2. `az4-security-scanning` — GitHub Advanced Security (code scanning/CodeQL, secret scanning & push protection, Dependabot), GHAS for Azure DevOps, container scanning, license compliance, Defender for Cloud DevOps security (advanced)

Domain `az4-instrumentation` → `topics/instrumentation/`, `questions/instrumentation.ts` (`az400InstrumentationTopics` / `az400InstrumentationQuestions`)

1. `az4-app-insights-monitoring` — Azure Monitor, Application Insights (OpenTelemetry), distributed tracing, VM/Container insights, alerts on pipelines and Actions (intermediate)
2. `az4-kql-analysis` — KQL basics (where, summarize, project, extend, render, join, bin), infrastructure performance indicators, querying pipeline and app telemetry (advanced)

### Interview (Azure topics) — `src/content/interview/topics/<dir>/`

Each topic dir has an `index.ts` exporting the `InterviewTopic` under the given const name, plus 2–4 themed question files spread into it. `order` as given (friend's DevOps topics use 21+).

| dir / topic id       | export const             | title                                     | shortTitle     | icon | order | id prefix    |
| -------------------- | ------------------------ | ----------------------------------------- | -------------- | ---- | ----- | ------------ |
| `azure-fundamentals` | `azureFundamentalsTopic` | Azure core & architecture                 | Azure core     | ☁️   | 1     | `itv-azf-`   |
| `azure-identity`     | `azureIdentityTopic`     | Entra ID, RBAC & identity                 | Identity       | 🔐   | 2     | `itv-azid-`  |
| `azure-networking`   | `azureNetworkingTopic`   | Azure networking                          | Networking     | 🌐   | 3     | `itv-aznet-` |
| `azure-compute`      | `azureComputeTopic`      | Azure compute, App Service & AKS          | Compute        | 🖥️   | 4     | `itv-azc-`   |
| `azure-storage`      | `azureStorageTopic`      | Azure storage & databases                 | Storage        | 🗄️   | 5     | `itv-azst-`  |
| `azure-devops`       | `azureDevopsTopic`       | Azure DevOps & pipelines                  | Azure DevOps   | 🔁   | 6     | `itv-azdo-`  |
| `azure-iac`          | `azureIacTopic`          | Bicep, ARM & Terraform on Azure           | IaC on Azure   | 📐   | 7     | `itv-aziac-` |
| `azure-monitoring`   | `azureMonitoringTopic`   | Monitoring, security & incident scenarios | Ops & security | 🛡️   | 8     | `itv-azmon-` |
