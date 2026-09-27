import type { InterviewQuestion } from '../../../types'

/** AI-Assisted Terraform Drift Detector (Go engine + proposed AI explanation layer). */
export const myAiDriftQuestions: InterviewQuestion[] = [
  {
    id: 'itv-myai-1',
    level: 'advanced',
    kind: 'open',
    prompt: 'Walk me through your AI-assisted Terraform drift detector project.',
    probing:
      'Whether you can explain a real project end to end in 30 seconds and in two minutes, and say honestly which parts are implemented and which are designed.',
    answer: [
      "**One line:** I built a Go service that compares Terraform's expected state with live AWS resources, detects missing resources and configuration changes, stores scan history and supports CLI, API, dashboard and scheduled execution; I then designed an AI layer to explain verified drift and propose safe, reviewable fixes.",
      '**30-second answer:** I developed a Terraform drift detector in Go. It reads a local, HTTP or S3 Terraform state file, extracts managed AWS resources into a common resource model, fetches their live configuration through the AWS SDK and compares expected attributes and tags with actual values. It reports missing resources, changed attributes and tag differences through a CLI, REST API and dashboard, stores scan history in SQLite, and can run scans on a cron schedule. The predictable engine remains the source of truth. My AI extension consumes only verified findings to explain impact, rank risk and draft Terraform-based fixes, but it cannot run `terraform apply` or make cloud changes. During review I also identified important gaps, including incomplete discovery of cloud-only resources and unsafe handling of partial provider failures, which I would fix before production use.',
      '**Two-minute answer:** Terraform drift occurs when real infrastructure no longer matches the state Terraform expects. For example, somebody may change an EC2 instance type in the AWS console, remove a security-group rule, delete a managed resource, or alter tags outside the normal pull-request workflow.',
      'The application has two input paths:\n1. The state reader loads raw Terraform state from a local file, HTTP endpoint or S3 object.\n2. The AWS provider fetches the current configuration of supported resources through AWS SDK v2.',
      'The extractor converts state objects into a canonical resource containing provider, type, cloud ID, selected attributes, tags and region. The live collector produces the same shape. The comparison engine indexes resources by canonical ID, checks presence, compares normalized attributes, compares tags after applying ignore rules, and creates a structured report.',
      'Users can run an ad-hoc scan with the Cobra CLI, call the REST API, view results in a small web dashboard, or configure cron scans. Workspaces, schedules and reports are stored in SQLite. Exit codes make the CLI useful in CI: `0` means no drift, `1` means drift and `2` means an execution error.',
      'The AI portion is intentionally downstream. It never decides whether raw values differ. It takes predictable findings and supporting context, explains operational impact, groups related changes and drafts a fix plan. A human reviews the proposal and fixes the cause through Terraform and the normal change process.',
      '**Honest closing statement:** I implemented a Go-based Terraform drift detector with state ingestion, AWS collection, normalized comparison, CLI/API/dashboard access, scheduling and scan history. The reviewed code is predictable, not yet AI-powered. My AI design adds evidence-based explanations and fix guidance after detection while keeping Terraform plans and human approvals in control. Before calling it production-ready, I would fix cloud-only discovery, incomplete-scan false positives, normalization gaps, state-backend security and production authentication, then validate it in an isolated live AWS environment.',
    ],
    followUps: [
      'Why not just run `terraform plan`?',
      'Where exactly is AI used?',
      'What would you fix before calling it production-ready?',
    ],
    tags: ['terraform', 'drift', 'project', 'go'],
  },
  {
    id: 'itv-myai-2',
    level: 'intermediate',
    kind: 'open',
    prompt:
      'How do you describe the drift detector honestly in an interview — what is implemented and what is only designed?',
    probing:
      'Credibility: the interviewer is checking that you do not overclaim AI or production use for a prototype.',
    answer: [
      'The reference folder contains an implemented Go application with a CLI, REST API, dashboard, scheduler, state readers, AWS collectors, drift engine, SQLite persistence and unit tests.',
      'However, the current code is a **predictable Terraform drift detector**. It contains no LLM dependency, AI API call, prompt builder, retrieval system or AI-output validator. To describe it honestly:\n- I can say **"I implemented/prototyped a Terraform drift detection engine in Go."**\n- I can say **"I designed an AI-assisted explanation and fix layer as the next stage."**\n- I should not say the supplied code already uses AI.\n- I should call it production-ready only after resolving the known limitations and running security, scale and live-cloud tests.',
      'The Go toolchain was unavailable in the review environment, so the existing automated tests could not be executed there; the implementation and tests were reviewed statically.',
      'So when asked "Where exactly is AI used?": it is not in the supplied implementation. My proposed AI layer is downstream of predictable detection and explains impact, compares findings and drafts fixes. It does not compare raw infrastructure or execute fixes.',
    ],
    tags: ['drift', 'project', 'honesty', 'ai'],
  },
  {
    id: 'itv-myai-3',
    level: 'basic',
    kind: 'open',
    prompt: 'What is Terraform drift and how does it usually happen?',
    probing: 'The basic definition, with realistic causes rather than a textbook line.',
    answer: [
      "Terraform drift is a difference between Terraform's expected managed state and the real infrastructure.",
      'It commonly happens through manual console changes, another automation tool, failed operations or changes outside the Terraform workflow — for example somebody changes an EC2 instance type in the AWS console, removes a security-group rule, deletes a managed resource, or alters tags outside the normal pull-request workflow.',
    ],
    tags: ['terraform', 'drift'],
  },
  {
    id: 'itv-myai-4',
    level: 'intermediate',
    kind: 'open',
    prompt:
      'What problem does the drift detector solve, what was the goal, and what value does it deliver?',
    probing: 'Whether you can connect a tool to a business and operational problem.',
    answer: [
      '**Problem:**\n- Engineers can make emergency or accidental console changes outside Terraform.\n- Cloud services can change through another automation system.\n- A deleted resource may remain in state until the next Terraform operation.\n- Running `terraform plan` continuously can require working configuration, providers, variables and credentials.\n- Teams need history, ownership and alerting rather than discovering drift during deployment.',
      '**Goal:** continuously compare the expected infrastructure recorded in Terraform state with live cloud configuration and produce a focused, auditable report without automatically changing infrastructure.',
      '**Business and operational value:**\n- Detect unauthorized or accidental infrastructure changes earlier.\n- Prevent unexpected changes from appearing first during a deployment.\n- Identify possible security and compliance deviations.\n- Give the owning team clear evidence and a repeatable fix flow.\n- Track drift frequency, age and recurrence across workspaces.',
    ],
    tags: ['drift', 'project'],
  },
  {
    id: 'itv-myai-5',
    level: 'advanced',
    kind: 'open',
    prompt: 'Explain the architecture of the drift detector and how the code is organized.',
    probing:
      'Whether you understand the data flow from state and cloud into a common model, and where the proposed AI sits.',
    answer: [
      'Two inputs feed the drift engine: Terraform state (local, HTTP or S3) goes through a state reader and extractor into expected resources; the AWS SDK and resource fetchers produce actual resources. The drift engine compares them into a drift report, which is shown in the CLI/table, served by the REST API and stored in SQLite, which in turn backs the dashboard and scheduler.',
      'The proposed AI extension takes the verified drift report plus policy and ownership context, passes it through a redaction and evidence builder, then an AI explanation/remediation step, then a schema, citation and command validator, and ends in a human-reviewed recommendation. The AI extension does not replace the comparison engine and is not present in the reviewed source code.',
      'The provider registry allows another cloud provider to implement a common `CloudProvider` interface and be registered without rewriting the scanner.',
    ],
    code: [
      {
        title: 'Implemented architecture',
        language: 'text',
        code: `Terraform state
 local | HTTP | S3
       │
       ▼
State Reader -> State Extractor -> Expected Resources ─┐
                                                       │
AWS SDK -> Resource Fetchers -> Actual Resources ──────┤
                                                       ▼
                                              Drift Engine
                                                       │
                                                       ▼
                                                Drift Report
                              ┌──────────────────┬──────┴───────┐
                              ▼                  ▼              ▼
                           CLI/table          REST API       SQLite
                                                               │
                                                               ▼
                                                  dashboard + scheduler`,
      },
      {
        title: 'Proposed AI extension',
        language: 'text',
        code: `Verified drift report + policy + ownership context
                         │
                         ▼
              redaction and evidence builder
                         │
                         ▼
               AI explanation/remediation
                         │
                         ▼
             schema, citation and command validator
                         │
                         ▼
                 human-reviewed recommendation`,
      },
      {
        title: 'Repository components',
        language: 'text',
        code: `cmd/driftctl/                 CLI entry point
cmd/drift-server/            API/server entry point
internal/state/              State readers and Terraform-state extraction
internal/providers/aws/      AWS live-resource collectors
internal/drift/              Predictable comparison engine
internal/scan/               End-to-end scan orchestration
internal/store/              SQLite persistence interface/implementation
internal/scheduler/          Cron registration and scheduled scans
internal/api/                REST API, auth middleware and dashboard
internal/output/             JSON and table formatting
internal/model/              Canonical resources, findings and reports
web/                         Static dashboard
testdata/                    Sample Terraform state`,
      },
    ],
    followUps: [
      'How would you add Azure or GCP support?',
      'Why is the AI layer downstream of the comparison engine?',
    ],
    tags: ['drift', 'architecture', 'go'],
  },
  {
    id: 'itv-myai-6',
    level: 'intermediate',
    kind: 'open',
    prompt: 'What technology stack did you use for the drift detector, and why Go?',
    probing: 'Whether each technology choice has a reason.',
    answer: [
      '- **Language — Go**: fast single-binary CLI/service and strong concurrency support\n- **CLI — Cobra**: `scan`, `report`, `workspace` and `schedule` commands\n- **Cloud access — AWS SDK for Go v2**: fetch EC2, VPC, subnet, security-group and S3 data\n- **State backends — filesystem, HTTP(S), AWS S3**: load expected Terraform state\n- **Configuration — YAML**: database, API, workspaces, regions and ignore rules\n- **API — Go `net/http`**: REST endpoints and static dashboard serving\n- **Scheduler — robfig/cron**: periodic workspace scans\n- **Persistence — SQLite**: workspaces, schedules and scan reports\n- **Frontend — HTML, CSS and vanilla JavaScript**: simple workspace and report dashboard\n- **IDs — Google UUID**: unique workspace and scan identifiers\n- **Proposed AI — approved LLM with structured output**: explain and prioritize verified findings',
      '**Why Go?** Go provides a single deployable binary, good concurrency for regional API calls, strong typing and mature cloud SDK support. It works well for both CLI and long-running service modes.',
    ],
    tags: ['drift', 'go', 'stack'],
  },
  {
    id: 'itv-myai-7',
    level: 'advanced',
    kind: 'open',
    prompt: 'Walk me through the end-to-end scan flow of the drift detector.',
    probing:
      'Depth of understanding: workspace resolution, audit record, state parsing, normalization, collection, comparison and CI exit codes.',
    answer: [
      '**1. Resolve the workspace.** A scan can use a named YAML/SQLite workspace or ad-hoc flags. The workspace defines the provider, state backend, regions, ignored tags/attributes and optional cron expression.',
      '**2. Create the scan record.** The scanner generates a UUID, records the start time and saves a `running` report before external work begins. This provides an audit entry even if collection later fails.',
      '**3. Read Terraform state.** The reader supports a local file through `os.ReadFile`, HTTP(S) through an HTTP GET, and S3 through `GetObject`. The extractor parses version-4 Terraform state JSON and ignores data sources because it processes only resources with `mode: managed`.',
      '**4. Normalize expected resources.** Each expected resource becomes a canonical object. Comparison keys are resource-specific, which avoids comparing computed Terraform-only attributes that would create noise.',
      "**5. Fetch actual AWS configuration.** The current provider supports `aws_instance`, `aws_vpc`, `aws_subnet`, `aws_security_group` and `aws_s3_bucket`. It derives regions from configuration and state, loads AWS's default credential chain and fetches regions concurrently. Provider-specific functions translate AWS SDK responses into the same canonical resource shape.",
      '**6. Compare expected and actual state.** The engine indexes both lists by canonical resource ID and detects missing, extra, attribute and tag differences. Values are JSON-normalized before comparison to reduce differences caused only by Go numeric types or nested representations.',
      '**7. Store and present the report.** The report includes status, times, counts, findings and collection errors. It is persisted in SQLite and rendered as JSON or a terminal table. The web dashboard lists workspaces, starts scans, displays history and opens detailed reports.',
      '**8. Return a CI-friendly exit status**, so a pipeline can warn, create a ticket or block a promotion according to team policy.',
    ],
    code: [
      {
        title: 'Ad-hoc scan',
        language: 'bash',
        code: `driftctl scan \\
  --state /path/to/terraform.tfstate \\
  --provider aws \\
  --region us-east-1 \\
  --output json`,
      },
      {
        title: 'Canonical expected resource',
        language: 'json',
        code: `{
  "id": "aws/aws_instance/i-0123456789abcdef0",
  "provider": "aws",
  "type": "aws_instance",
  "cloud_id": "i-0123456789abcdef0",
  "name": "web-server",
  "region": "us-east-1",
  "source": "state",
  "attributes": {
    "instance_type": "t3.micro",
    "ami": "ami-...",
    "subnet_id": "subnet-...",
    "monitoring": false
  },
  "tags": {"Name": "web-server", "env": "prod"}
}`,
      },
      {
        title: 'Exit codes',
        language: 'text',
        code: `0 -> scan completed with no findings
1 -> drift findings exist
2 -> command or scan error`,
      },
    ],
    followUps: [
      'Why save a `running` report before collection starts?',
      'Why are comparison keys resource-specific?',
    ],
    tags: ['drift', 'terraform', 'aws'],
  },
  {
    id: 'itv-myai-8',
    level: 'intermediate',
    kind: 'open',
    prompt: 'What kinds of drift findings does the engine report? Give an example.',
    probing: 'Whether you can make the output concrete and separate facts from AI interpretation.',
    answer: [
      '- **`missing_in_cloud`**: state expects the resource, but live collection did not return it\n- **`extra_in_cloud`**: live collection returned a resource that state did not contain\n- **`attribute_changed`**: a selected expected value differs from live configuration\n- **`tags_changed`**: a non-ignored tag was added, removed or changed',
      'Example: state expects EC2 `i-123` with `instance_type = t3.micro` and `env` tag `prod`; live AWS returns `t3.small` and `staging`. The predictable findings are an `attribute_changed` (warning) and a `tags_changed` (info).',
      'The AI layer can then add context without changing the facts: the instance was resized outside Terraform; confirm whether this was an approved emergency change; if the larger size is required, update Terraform code and review a plan, otherwise restore the expected size through Terraform during an approved window; the environment-tag change may affect cost, ownership or policy reporting and should be confirmed with the resource owner.',
    ],
    code: [
      {
        title: 'Predictable findings',
        language: 'json',
        code: `[
  {
    "kind": "attribute_changed",
    "field": "instance_type",
    "expected": "t3.micro",
    "actual": "t3.small",
    "severity": "warning"
  },
  {
    "kind": "tags_changed",
    "field": "tags.env",
    "expected": "prod",
    "actual": "staging",
    "severity": "info"
  }
]`,
      },
      {
        title: 'AI-added context',
        language: 'text',
        code: `The instance was resized outside Terraform. Confirm whether this was an
approved emergency change. If the larger size is required, update Terraform
code and review a plan. Otherwise, use Terraform to restore the expected size
during an approved window. The environment-tag change may affect cost,
ownership or policy reporting and should be confirmed with the resource owner.`,
      },
    ],
    tags: ['drift', 'findings'],
  },
  {
    id: 'itv-myai-9',
    level: 'intermediate',
    kind: 'open',
    prompt: 'How do the CLI, REST API and scheduled scans of the drift detector work?',
    probing: 'Whether you know the interfaces you built and their security limits.',
    answer: [
      'The Cobra CLI runs scans, reads reports, lists workspaces and creates schedules. The REST API exposes health, workspace CRUD, scan triggering and report retrieval, plus schedule management.',
      'The reviewed API optionally protects endpoints with one configured API key. This is acceptable only for a limited prototype; production needs identity-based authentication, authorization by workspace, secret rotation and audit logging.',
      'At server startup, configured workspaces and schedules are stored, loaded into the cron scheduler and executed in the background. Scan history allows the team to see whether drift is new, recurring or unresolved.',
    ],
    code: [
      {
        title: 'CLI examples',
        language: 'bash',
        code: `driftctl scan --config configs/driftctl.yaml --workspace prod
driftctl report <scan-id> --output table
driftctl workspace list
driftctl schedule create --workspace prod --cron "0 6 * * *"`,
      },
      {
        title: 'REST endpoints',
        language: 'text',
        code: `GET    /health
GET    /api/v1/workspaces
POST   /api/v1/workspaces
GET    /api/v1/workspaces/{id}
DELETE /api/v1/workspaces/{id}
POST   /api/v1/workspaces/{id}/scans
GET    /api/v1/workspaces/{id}/scans
GET    /api/v1/scans
GET    /api/v1/scans/{id}
GET    /api/v1/scans/{id}/report
PUT    /api/v1/workspaces/{id}/schedules
DELETE /api/v1/workspaces/{id}/schedules`,
      },
    ],
    tags: ['drift', 'api', 'cli'],
  },
  {
    id: 'itv-myai-10',
    level: 'advanced',
    kind: 'open',
    prompt:
      'How would you add AI to the drift detector safely? What does it do and what stays predictable?',
    probing:
      'Whether you can draw a clear boundary between LLM reasoning and deterministic detection and execution.',
    answer: [
      'Only a minimized, structured payload should be sent to the model. Terraform state must not be sent wholesale because it can contain credentials, passwords, private endpoints and other sensitive values.',
      'The model returns a strict output contract. Pydantic, JSON Schema or Go validation rejects unsupported priorities, unknown finding IDs and missing evidence.',
      '**Appropriate AI responsibilities:**\n- explain drift in simple language\n- compare several related findings\n- use ownership/change context to suggest a probable cause\n- prioritize investigation based on resource criticality\n- draft a ticket, incident note or pull-request description\n- propose verification and rollback steps',
      '**Predictable responsibilities:**\n- read and parse state\n- fetch live cloud values\n- compare resource identity, values and tags\n- determine whether collection was complete\n- apply ignore rules\n- enforce severity policy\n- decide pipeline exit code\n- authorize and execute any infrastructure change',
      '**Human-controlled fix:** the preferred fix is a reviewed Terraform change. The model must never directly run `terraform apply`, edit state, delete a resource or accept a suggested command as safe without review.',
    ],
    code: [
      {
        title: 'AI input',
        language: 'json',
        code: `{
  "workspace": "prod",
  "scan_id": "...",
  "findings": [],
  "resource_criticality": {},
  "change_policy": {},
  "recent_approved_changes": []
}`,
      },
      {
        title: 'AI output contract',
        language: 'json',
        code: `{
  "summary": "...",
  "groups": [
    {
      "finding_ids": ["..."],
      "probable_cause": "...",
      "impact": "...",
      "priority": "high",
      "evidence": ["..."],
      "recommended_action": "...",
      "verification": ["..."],
      "confidence": 0.82
    }
  ]
}`,
      },
      {
        title: 'Human-controlled fix flow',
        language: 'text',
        code: `Verified drift
  -> identify whether cloud or code is correct
  -> update Terraform configuration or import/state workflow if needed
  -> terraform fmt and validate
  -> review terraform plan
  -> peer/change approval
  -> terraform apply
  -> re-run drift scan`,
      },
    ],
    followUps: [
      'How do you stop prompt injection through resource names or tags?',
      'How do you validate that the model only cites real finding IDs?',
    ],
    tags: ['drift', 'ai', 'llm', 'safety'],
  },
  {
    id: 'itv-myai-11',
    level: 'advanced',
    kind: 'open',
    prompt:
      'What correctness gaps did you find when reviewing the drift detector code, and how would you fix them?',
    probing:
      'Self-critique: whether you understand why drift accuracy depends on collection completeness and canonical modelling.',
    answer: [
      'These limitations should be mentioned honestly if an interviewer asks what I would improve.',
      '**1. Cloud-only resources are not discovered in live scans.** The AWS fetchers receive expected resources and call APIs using only those IDs, so a resource created manually in AWS but absent from state is never fetched. The engine supports `extra_in_cloud`, but the collector normally cannot produce it. Fix: enumerate all supported resources in the configured account/region and compare them with state, with explicit scope, ownership tags and ignore rules so unrelated account resources are not treated as drift.',
      '**2. Partial collection failures can create false "missing" drift.** The scanner records provider errors but can still mark the scan `completed` and compare an incomplete actual list; a permission, throttling or regional API failure can make healthy resources appear deleted. Fix: track completeness by provider/type/region, never emit absence findings for a failed scope, mark the report `partial` or `failed`, and distinguish `not found` from `not observed`.',
      '**3. Unsupported resource types can be reported incorrectly.** State extraction can produce types the AWS provider does not fetch, which then look missing. Fix: intersect state resources with `SupportedTypes`, report unsupported types separately, and exclude them from missing-resource comparison.',
      '**4. Some normalized attributes are not equivalent.** The VPC fetcher sets DNS attributes to `nil` instead of querying them; S3 uses `nil` for values such as ACL or `force_destroy`, and live/state shapes may differ, creating false attribute changes. Fix: complete provider-specific reads and canonical converters with golden fixtures for both Terraform-state and SDK response shapes.',
      '**5. State-only mode intentionally reports every resource missing.** With `--skip-cloud`, actual resources are empty. This tests orchestration but is not a meaningful drift scan. Fix: name it validation/test mode, skip comparison, or provide a fixture for actual cloud resources.',
      '**6. Missing-resource severity is always critical**, whether or not the `env` tag is production. Fix: an explicit, configurable severity policy based on environment, resource type, criticality and ownership.',
    ],
    followUps: [
      'How do you detect resources created manually in the cloud?',
      'How would you prove a finding of "missing" is authoritative?',
    ],
    tags: ['drift', 'code review', 'accuracy'],
  },
  {
    id: 'itv-myai-12',
    level: 'advanced',
    kind: 'open',
    prompt: 'What security and production-readiness gaps did you find in the drift detector?',
    probing:
      'Whether you spot SSRF, auth, concurrency and data-retention risks in your own prototype.',
    answer: [
      '**7. State readers require stronger security controls.** An API-created workspace can point to a local path or HTTP URL; without validation this creates arbitrary-file-read and server-side request-forgery risk, and state content itself may contain secrets. Fix: allow-list backend types and paths/hosts, block private/metadata endpoints, enforce response-size and time limits, encrypt state access, avoid logging state, and use least-privilege (minimum required access) state credentials.',
      '**8. API authentication is prototype-level.** One optional shared API key protects all resources. If no key is configured, all API routes are open; if one is configured, the current browser JavaScript does not attach it. Fix: OIDC/JWT authentication, workspace RBAC, CSRF/CORS controls where relevant, secure headers, rate limits and a frontend login/session flow.',
      '**9. Scans and schedules need production controls.** API-triggered scans are synchronous, scheduled scans use an unlimited background context, and overlapping schedules are not prevented. Fix: a durable job queue, per-scan timeout/cancellation, idempotency (safe repeat behavior), concurrency limits, distributed scheduling/locking, retry policy and progress/status APIs.',
      '**10. Persistence needs relational integrity and retention.** SQLite is fine for a local prototype, but workspace deletion does not visibly enforce foreign keys/cascade behavior and report growth has no retention policy. Fix: migrations, foreign keys, indexes, retention, backup and multi-user storage such as PostgreSQL for a deployed service.',
    ],
    followUps: [
      'How would you block SSRF in the HTTP state backend?',
      'Why is SQLite not enough for a multi-user deployment?',
    ],
    tags: ['drift', 'security', 'code review'],
  },
  {
    id: 'itv-myai-13',
    level: 'advanced',
    kind: 'scenario',
    prompt:
      'The drift detector reports that a managed resource is missing in the cloud. How do you investigate and fix it?',
    probing:
      'Whether you confirm the evidence and protect stateful resources before recreating anything.',
    answer: [
      'My approach:\n1. Confirm the scan was complete and AWS returned an authoritative not-found result.\n2. Check CloudTrail and approved change records to identify who or what deleted it.\n3. Determine whether Terraform state is stale or the resource must exist.\n4. Check dependencies, backups, data implications and recovery requirements.\n5. Run `terraform plan` with the correct configuration and variables.\n6. Review whether recreation is safe, especially for stateful resources.\n7. Apply through normal approval and rescan.',
      'The state file is the last recorded managed state, not always the full intended configuration, so a finding is evidence for investigation and the fix is confirmed with the correct Terraform configuration and plan.',
    ],
    followUps: [
      'What if the deleted resource held data?',
      'When would you remove it from state instead?',
    ],
    tags: ['drift', 'terraform', 'troubleshooting'],
  },
  {
    id: 'itv-myai-14',
    level: 'intermediate',
    kind: 'scenario',
    prompt: 'An attribute was changed outside Terraform. Would you automatically revert the drift?',
    probing:
      'Judgement: a manual change may have been an incident fix, so blind reverts can cause an outage.',
    answer: [
      'No. A manual change may be an approved incident action, and reverting it could cause an outage. I identify the correct desired state, review a Terraform plan and use the normal approval process.',
      'Steps:\n1. Compare expected and actual values.\n2. Check whether the console change was an approved emergency action.\n3. Decide which value represents desired state.\n4. If cloud is correct, update Terraform code and review the plan.\n5. If state/code is correct, use Terraform to restore the resource during an approved window.\n6. Validate service health and rescan.',
      'I do not blindly force the cloud back to state because the manual change may have been made to resolve an incident.',
    ],
    tags: ['drift', 'terraform', 'change management'],
  },
  {
    id: 'itv-myai-15',
    level: 'advanced',
    kind: 'scenario',
    prompt: 'The drift scan finds a security-group rule change. How do you handle it?',
    probing: 'Treating network drift as a possible security incident, not just a config diff.',
    answer: [
      'This may be security-sensitive. I normalize rule ordering before comparison, confirm collection completeness, identify an overly broad or missing rule, check CloudTrail and ownership, assess exposure, and follow the incident/change process.',
      'The fix belongs in Terraform so the desired security policy remains reproducible.',
    ],
    followUps: [
      'What if the rule opened 0.0.0.0/0 on SSH?',
      'How do you normalize security-group rules to avoid false positives?',
    ],
    tags: ['drift', 'security', 'aws'],
  },
  {
    id: 'itv-myai-16',
    level: 'intermediate',
    kind: 'scenario',
    prompt:
      'The same tag drift keeps coming back after every fix. What is going on and what do you do?',
    probing: 'Recognising conflicting ownership between two automation systems.',
    answer: [
      'I check whether another policy engine or automation owns tags. If so, Terraform and that automation have conflicting ownership.',
      'I define a single source of truth or ignore only the explicitly externally managed tag, document the exception and avoid hiding unrelated tag drift.',
    ],
    tags: ['drift', 'tags', 'governance'],
  },
  {
    id: 'itv-myai-17',
    level: 'advanced',
    kind: 'scenario',
    prompt:
      'A drift scan suddenly reports many missing resources, or AWS access fails during a scan. What do you do?',
    probing:
      'Whether you suspect the collector before assuming mass deletion — "not observed" is not "deleted".',
    answer: [
      'I first suspect collection failure rather than mass deletion. I inspect scan errors, credentials, AWS API throttling, region selection and permissions. Absence is trustworthy only when the collector successfully enumerated the relevant scope.',
      'If AWS access fails, the affected scope must be marked incomplete or failed. I do not interpret "not observed" as "deleted." The reviewed code needs improvement in this area.',
    ],
    followUps: ['How would you represent partial scans in the report and exit code?'],
    tags: ['drift', 'troubleshooting', 'aws'],
  },
  {
    id: 'itv-myai-18',
    level: 'advanced',
    kind: 'open',
    prompt:
      'What security and safety measures does the drift detector need, and how do you secure Terraform state?',
    probing: 'Least privilege, state protection, and separation of AI from credentials.',
    answer: [
      '- Use a read-only AWS role for detection.\n- Separate state-read permissions from live-resource discovery.\n- Encrypt Terraform state and scan history at rest and in transit.\n- Never log or send raw state to AI.\n- Redact sensitive attributes and hash identifiers where possible.\n- Validate state backend locations and block SSRF/local-path abuse.\n- Restrict AWS account, organization, regions and resource scope.\n- Use OIDC/short-lived credentials instead of static keys.\n- Authenticate users and authorize every workspace/report.\n- Sign or version comparison policy and ignore rules.\n- Record collection errors so missing evidence is not presented as drift.\n- Keep AI and fix credentials separate; AI receives no cloud credentials.\n- Require reviewed Terraform plans and approvals for changes.\n- Retain an audit trail of scans, acknowledgements and exceptions.',
      '**Securing state specifically:** encrypted remote storage, least-privilege access, short-lived credentials, audit logging and no raw-state logging. Sensitive state is never sent wholesale to an LLM.',
    ],
    followUps: ['Why keep the detection role separate from the role that applies fixes?'],
    tags: ['drift', 'security', 'state'],
  },
  {
    id: 'itv-myai-19',
    level: 'advanced',
    kind: 'open',
    prompt: 'How did you test the drift detector, and what tests would you add?',
    probing: 'Whether you know that unit tests do not prove live-cloud correctness.',
    answer: [
      'The repository includes tests for missing, extra, attribute and tag comparison; critical missing-resource severity; sample state extraction; and scan persistence/orchestration in skip-cloud mode. These are useful unit tests, but they do not prove live AWS correctness or production safety.',
      '**Tests I would add:**\n- golden tests for each Terraform/AWS canonical converter\n- ordering and set normalization for security groups and lists\n- partial collection versus confirmed not-found behavior\n- unsupported resource-type handling\n- real discovery of extra cloud resources\n- multi-region S3 behavior and deduplication\n- permission denied, throttling, pagination and retry cases\n- HTTP backend SSRF, timeout and oversized response tests\n- authentication, authorization and cross-workspace isolation\n- scheduler overlap, cancellation and idempotency\n- database migration, retention and recovery\n- AI redaction, schema, hallucination and prompt-injection tests',
      '**Live integration test** in an isolated AWS account:\n1. Apply a small Terraform fixture.\n2. Run a baseline scan and expect zero drift.\n3. Change one attribute and tag through AWS APIs.\n4. Delete one managed test resource.\n5. Create one in-scope unmanaged resource.\n6. Run a scan and verify exact findings.\n7. Remove a permission and verify the result becomes incomplete, not false missing.\n8. Restore through Terraform and confirm a clean scan.',
      'The Go toolchain was not installed in the review workspace, so `go test ./...` could not be executed during the documentation task.',
    ],
    followUps: ['What is a golden test and why use it for converters?'],
    tags: ['drift', 'testing'],
  },
  {
    id: 'itv-myai-20',
    level: 'intermediate',
    kind: 'open',
    prompt: 'How would you integrate the drift detector into CI/CD?',
    probing: 'Whether exit codes map to a sensible pipeline policy and scan errors fail safely.',
    answer: [
      'A pipeline can build and execute the scanner, then interpret the documented exit codes.',
      'Recommended policy:\n- scheduled/nightly scans create reports and alerts\n- pull-request plans remain the main change preview\n- a scan error fails safely and is not interpreted as drift or no drift\n- critical verified drift can block promotion\n- informational tag drift may create a ticket instead\n- reports are uploaded as artifacts without raw state or secrets',
    ],
    code: [
      {
        title: 'Pipeline step',
        language: 'yaml',
        code: `- name: Run drift scan
  run: ./driftctl scan --config configs/driftctl.yaml --workspace prod --output json`,
      },
    ],
    tags: ['drift', 'ci/cd'],
  },
  {
    id: 'itv-myai-21',
    level: 'intermediate',
    kind: 'open',
    prompt: 'How do you monitor the drift detector and measure whether the project succeeded?',
    probing: 'Defensible outcome metrics rather than invented claims.',
    answer: [
      '**Service monitoring:**\n- scan duration and completion rate\n- AWS API latency, error and throttle rate\n- number of resources by provider/type/region\n- incomplete collection scopes\n- scheduler delay and overlapping jobs\n- database size and errors\n- AI latency, cost, validation failures and unsupported claims',
      '**Project outcomes:**\n- time from drift creation to detection\n- confirmed versus false-positive findings\n- drift age and recurrence\n- percentage remediated through reviewed Terraform changes\n- number of unauthorized changes identified\n- mean time to explain and assign drift\n- percentage of resource types with verified collector coverage',
      'I would not claim that drift detection alone prevented an outage. A defensible result connects a verified finding to a reviewed fix and measured reduction in recurrence or investigation time.',
    ],
    tags: ['drift', 'monitoring', 'metrics'],
  },
  {
    id: 'itv-myai-22',
    level: 'advanced',
    kind: 'open',
    prompt: 'What would you improve next in the drift detector, and how would you scale it?',
    probing: 'Prioritisation: correctness first, then scale and AI.',
    answer: [
      'Future improvements, in priority order:\n1. Correct collection completeness and false-missing behavior first.\n2. Enumerate all in-scope supported cloud resources to detect extras.\n3. Add pagination, retry/backoff (increasing wait between retries), rate limits and typed error classes.\n4. Add Azure and GCP providers through the registry interface.\n5. Support more AWS resources with tested canonical schemas.\n6. Add remote-state locking/version metadata and snapshot hashes.\n7. Move long scans to a durable queue with progress and cancellation.\n8. Replace shared API key authentication with OIDC and RBAC.\n9. Add notifications for Slack, email or incident/ticket systems.\n10. Add the redacted AI explanation layer with structured output.\n11. Generate reviewed Terraform pull requests, never direct applies.\n12. Compare drift with CloudTrail and approved change records.\n13. Add exception ownership, justification and expiry.\n14. Use PostgreSQL/object storage for multi-user scale and retention.',
      '**Scaling:** I would use a job queue, horizontally scalable workers, account/region concurrency limits, distributed scheduling, PostgreSQL, object storage for evidence, pagination and cached provider metadata.',
    ],
    followUps: ['Why fix collection completeness before adding the AI layer?'],
    tags: ['drift', 'scaling', 'roadmap'],
  },
  {
    id: 'itv-myai-23',
    level: 'intermediate',
    kind: 'open',
    prompt:
      'Why build a drift detector at all — why not just run `terraform plan`? And is the state file the desired configuration?',
    probing:
      'Whether you position the tool as a complement to plan and understand what state represents.',
    answer: [
      '`terraform plan` is authoritative for a configured Terraform project and should remain part of the workflow. This detector focuses on continuous centralized scanning from state and cloud APIs, history and reporting without needing every working directory at scan time. It complements rather than replaces plan.',
      'The state file is the last recorded managed state, not always the full intended configuration. Current code, variables, provider behavior and pending changes may differ. Therefore a finding is evidence for investigation, and the fix is confirmed with the correct Terraform configuration and plan.',
    ],
    tags: ['drift', 'terraform', 'state'],
  },
  {
    id: 'itv-myai-24',
    level: 'advanced',
    kind: 'open',
    prompt:
      'How do you detect resources created manually in the cloud, and how do you avoid false positives?',
    probing: 'Enumeration versus lookup-by-ID, and canonical modelling to avoid noise.',
    answer: [
      'The collector must enumerate all in-scope resources of supported types and subtract the state index. The reviewed implementation does not yet do this because it fetches only expected IDs; I identified that as a required fix.',
      'To avoid false positives I use provider-specific canonical schemas, normalize unordered collections, ignore only documented computed/external fields, distinguish failed collection from confirmed absence, and test converters against real fixtures.',
    ],
    followUps: ['How do you scope enumeration so unrelated account resources are not flagged?'],
    tags: ['drift', 'accuracy'],
  },
  {
    id: 'itv-myai-25',
    level: 'intermediate',
    kind: 'open',
    prompt: 'What was the most important lesson from the drift detector project?',
    probing: 'Reflection — whether you learned where the real difficulty lies.',
    answer: [
      'Drift accuracy depends more on collection completeness and canonical modeling than on the comparison loop.',
      'A simple equality check is easy; proving that two representations refer to the same resource and that missing data is authoritative is the difficult part.',
    ],
    tags: ['drift', 'lessons'],
  },
]
