import type { InterviewQuestion } from '../../../types'

/** AI Cloud Cost Detective (Azure FinOps assistant: React, FastAPI, Azure CLI, OpenAI, PostgreSQL). */
export const myAiCostQuestions: InterviewQuestion[] = [
  {
    id: 'itv-myai-26',
    level: 'advanced',
    kind: 'open',
    prompt: 'Walk me through your AI Cloud Cost Detective project.',
    probing:
      'Whether you can explain the flow end to end and make clear that AI recommends while humans act.',
    answer: [
      '**One line:** I designed an AI-assisted FinOps application that inventories resources in an Azure Resource Group, detects possible waste and configuration problems, explains the findings in simple language, and presents reviewable optimization commands while keeping a history of every analysis.',
      '**30-second answer:** I designed an AI Cloud Cost Detective using React, FastAPI, Azure CLI, OpenAI, WebSockets and Azure Database for PostgreSQL. An authenticated user selects an Azure Resource Group. The FastAPI backend executes controlled, read-only Azure CLI commands and converts the resource inventory into structured JSON. A rule-based validation layer identifies obvious facts, and the AI compares those facts into possible cost issues such as idle resources, oversized SKUs, missing lifecycle controls or inappropriate pricing tiers. The UI receives live progress, then displays evidence, severity, estimated savings assumptions and suggested Azure CLI fixes. Results are saved for audit and comparison. The important safety decision is that AI only recommends changes; a human reviews the evidence and command before anything is modified.',
      '**Two-minute answer:** cloud bills are difficult to investigate because resource inventory, billing data, utilization, ownership tags and configuration are normally checked in different places. Engineers may also know that cost increased without knowing which resource caused it or what action is safe.',
      'I divided the solution into five layers:\n1. React provides login, Resource Group selection, progress, reports and history.\n2. FastAPI authenticates requests and orchestrates the investigation.\n3. Azure CLI gathers read-only resource information from the selected scope.\n4. A predictable layer validates and enriches the facts, and the OpenAI layer converts the evidence into a structured explanation and recommendations.\n5. Azure PostgreSQL stores users and analysis history, while WebSockets send progress to the browser.',
      'The goal is not to let an LLM control Azure. It is to shorten the investigation, show why each item was flagged, and give a FinOps or DevOps engineer a safe starting point.',
      '**Honest closing statement:** this project demonstrates how I would apply AI in day-to-day DevOps and FinOps work: automate repetitive evidence collection, use predictable logic for facts and money, use AI to compare and explain the evidence, and keep a human in control of changes. The supplied material is a staged design rather than proof of a production deployment, so my next step would be to implement it, validate it with known Azure scenarios, and measure accepted and realized savings.',
    ],
    code: [
      {
        title: 'End-to-end flow',
        language: 'text',
        code: `User logs in
    -> selects an Azure Resource Group
    -> backend validates user and scope
    -> Azure inventory and supporting cost/metric evidence are collected
    -> sensitive fields are removed and data is normalized
    -> predictable rules calculate facts
    -> AI explains and prioritizes possible savings
    -> output schema and commands are validated
    -> report is stored and displayed for human review`,
      },
    ],
    followUps: [
      'Why did you need AI if rules can detect waste?',
      'How do you calculate estimated savings?',
      'Would you let AI delete an unused resource?',
    ],
    tags: ['finops', 'azure', 'project', 'ai'],
  },
  {
    id: 'itv-myai-27',
    level: 'basic',
    kind: 'open',
    prompt: 'How do you describe the Cost Detective honestly — what exists and what does not?',
    probing: 'Credibility: not claiming savings or a deployment you cannot evidence.',
    answer: [
      'The supplied project contains a README, architecture and request-flow documents, and five staged implementation prompts. It does not contain the generated backend or frontend source code, automated test evidence, deployment files, screenshots, measured savings, or production results.',
      'In an interview I should therefore say **"I designed and prototyped this solution"** unless I have separately implemented and tested it. I should not claim that an AI recommendation saved a specific amount of money without billing data, utilization metrics, approval records, and measured before-and-after results.',
    ],
    tags: ['finops', 'project', 'honesty'],
  },
  {
    id: 'itv-myai-28',
    level: 'intermediate',
    kind: 'open',
    prompt: 'What problem does the Cost Detective solve, and what does a good finding look like?',
    probing: 'Whether a finding carries evidence, assumptions, confidence and a verification step.',
    answer: [
      '**Problem:**\n- Unused resources can remain after projects or tests finish.\n- A resource may use a larger or more expensive SKU than its workload needs.\n- Missing tags make ownership and cost allocation difficult.\n- Long log retention and missing storage lifecycle policies increase cost.\n- A raw bill shows expenditure but does not always explain the operational cause.\n- Manual investigation is repetitive and knowledge varies between engineers.',
      '**Goal:** create one application that collects evidence, identifies possible waste, explains the reasoning, suggests a safe next action and retains an audit history.',
      'The useful outcome is a prioritized report with resource, finding, severity, evidence, recommendation, estimated saving, action and confidence. This is more convincing than saying "AI found an expensive VM," because it includes evidence, assumptions, confidence and a verification step.',
    ],
    code: [
      {
        title: 'Example finding',
        language: 'text',
        code: `Resource: dev-vm-03
Finding: Possible oversized development VM
Severity: Medium
Evidence: Low CPU during the selected 14-day window; non-production tag
Recommendation: Validate memory and business schedule, then consider downsizing
Estimated saving: Range based on current and candidate SKU prices
Action: Review-only command or Portal steps
Confidence: Medium, because memory evidence is incomplete`,
      },
    ],
    tags: ['finops', 'azure'],
  },
  {
    id: 'itv-myai-29',
    level: 'advanced',
    kind: 'open',
    prompt: 'Explain the architecture and technology stack of the Cost Detective.',
    probing:
      'Architecture reasoning, including what inventory alone cannot prove and CLI versus SDK.',
    answer: [
      'A React + TypeScript frontend (auth, Resource Group selection, progress, reports) talks over HTTPS/WebSocket to FastAPI (JWT, validation, orchestration, policy). FastAPI drives two parts: Azure evidence collection (CLI/resource inventory, billing/metrics next) and the analysis pipeline (rules, then AI, then schema validation). Both feed Azure PostgreSQL, which stores users and analyses.',
      'The original design uses `az resource list` for inventory. For a production-grade cost detector, I would add Azure Cost Management data, Azure Monitor metrics, Azure Advisor recommendations and current retail/rate-card data. Inventory alone cannot prove that a resource is idle or calculate reliable savings.',
      '- **Frontend — React, Vite, TypeScript, Tailwind CSS**: fast, typed dashboard with reusable report components\n- **Backend — Python, FastAPI, Uvicorn**: validation, async APIs and orchestration\n- **Authentication — bcrypt, PyJWT**: password hashing and signed access tokens\n- **Azure collection — Azure CLI through Python `subprocess`**: simple prototype access to authenticated Azure inventory\n- **AI analysis — OpenAI API**: compare evidence and explain findings in plain language\n- **Database — Azure Database for PostgreSQL**: users, JSON reports, status and analysis history\n- **Live progress — FastAPI WebSocket**: show long-running analysis stages without browser polling\n- **Configuration — environment variables**: keep database URL, JWT secret and AI key outside source code',
      "For production I would normally prefer Azure SDK clients with a managed identity over shelling out to Azure CLI. SDKs provide typed responses, clearer retry behavior, cancellation and safer authentication without relying on a developer's local CLI session.",
    ],
    code: [
      {
        title: 'High-level architecture',
        language: 'text',
        code: `┌─────────────────────────────────────────────┐
│ React + TypeScript                          │
│ Auth | Resource Group | Progress | Reports  │
└─────────────────────┬───────────────────────┘
                      │ HTTPS / WebSocket
                      ▼
┌─────────────────────────────────────────────┐
│ FastAPI                                    │
│ JWT | validation | orchestration | policy  │
└──────────────┬──────────────┬───────────────┘
               │              │
               ▼              ▼
┌────────────────────────┐  ┌────────────────────────┐
│ Azure evidence         │  │ Analysis pipeline      │
│ CLI/resource inventory │  │ rules -> AI -> schema  │
│ billing/metrics (next) │  │ validation             │
└──────────────┬─────────┘  └────────────┬───────────┘
               │                         │
               └────────────┬────────────┘
                            ▼
                  ┌────────────────────┐
                  │ Azure PostgreSQL   │
                  │ users + analyses   │
                  └────────────────────┘`,
      },
    ],
    followUps: [
      'Why prefer the Azure SDK with managed identity over `az` in production?',
      'Why use PostgreSQL and WebSockets?',
    ],
    tags: ['finops', 'architecture', 'fastapi'],
  },
  {
    id: 'itv-myai-30',
    level: 'advanced',
    kind: 'open',
    prompt:
      'How did you implement Stage 1 of the Cost Detective — the FastAPI backend and Azure inventory scanner?',
    probing:
      'Safe subprocess usage, input validation and normalization of heterogeneous Azure responses.',
    answer: [
      'The first stage provides:\n- `GET /api/resource-groups`\n- `POST /api/analyze`\n- an Azure scanner module\n- structured handling for missing CLI, expired login and invalid Resource Group\n- development CORS for `http://localhost:5173`',
      'The Resource Group is passed as a separate argument, not concatenated into a shell string. I would also validate it against the Resource Groups available to the authenticated identity, set a timeout, limit output size, avoid `shell=True`, log a correlation ID, and return a sanitized error rather than CLI credentials or raw stderr.',
      'The inventory is normalized so the AI does not need to understand many different Azure response shapes.',
      'One limitation is that a generic resource-list response may not contain all resource-specific configuration or utilization. The scanner needs provider-specific enrichment for VMs, disks, databases, App Services, storage and monitoring settings.',
    ],
    code: [
      {
        title: 'Conceptual scanner',
        language: 'python',
        code: `import json
import subprocess

def run_az(arguments: list[str]) -> list[dict]:
    command = ["az", *arguments, "--output", "json", "--only-show-errors"]
    result = subprocess.run(
        command,
        capture_output=True,
        text=True,
        timeout=60,
        check=False,
    )
    if result.returncode != 0:
        raise RuntimeError("Azure inventory command failed")
    return json.loads(result.stdout)

def list_resources(resource_group: str) -> list[dict]:
    return run_az(["resource", "list", "--resource-group", resource_group])`,
      },
      {
        title: 'Normalized resource',
        language: 'json',
        code: `{
  "id": "/subscriptions/.../resourceGroups/dev-rg/providers/...",
  "name": "dev-vm-03",
  "type": "Microsoft.Compute/virtualMachines",
  "location": "eastus",
  "sku": "Standard_D4s_v5",
  "tags": {"environment": "dev", "owner": "platform"}
}`,
      },
    ],
    followUps: [
      'Why is `shell=True` dangerous here?',
      'How would you enrich VM findings with utilization?',
    ],
    tags: ['finops', 'python', 'azure cli'],
  },
  {
    id: 'itv-myai-31',
    level: 'advanced',
    kind: 'open',
    prompt: 'How does the AI cost analysis stage work, and how do you validate the model output?',
    probing: 'Structured output, schema validation, and keeping prices out of the LLM.',
    answer: [
      'The analyzer receives normalized evidence, not Azure credentials. It asks for a strict result containing:\n- summary\n- affected resource\n- issue type\n- severity\n- evidence and assumptions\n- estimated saving or an explicit "insufficient data" value\n- recommendation and verification steps\n- suggested command\n- confidence',
      'The response is parsed and validated with Pydantic. If it fails validation, the service retries once with the schema error or returns a controlled failure. Invalid commands are never presented as approved actions.',
      'I would not let the model invent prices. The application should calculate cost and saving ranges deterministically from billing and pricing evidence. AI should explain the result and prioritize it.',
    ],
    code: [
      {
        title: 'Pydantic response model',
        language: 'python',
        code: `from typing import Literal
from pydantic import BaseModel

class Finding(BaseModel):
    resource_id: str
    category: Literal["over_provisioned", "unused", "misconfigured", "governance"]
    severity: Literal["high", "medium", "low"]
    evidence: list[str]
    recommendation: str
    estimated_savings: str | None
    confidence: float
    command: str | None

class AnalysisReport(BaseModel):
    summary: str
    findings: list[Finding]`,
      },
    ],
    followUps: ['What happens if the model returns invalid JSON twice?'],
    tags: ['finops', 'llm', 'pydantic'],
  },
  {
    id: 'itv-myai-32',
    level: 'advanced',
    kind: 'open',
    prompt:
      'How did you design persistence and live progress (PostgreSQL and WebSockets) for the Cost Detective?',
    probing:
      'Async job design, the WebSocket race condition, and authorization of progress streams.',
    answer: [
      "`GET /api/history` returns only the logged-in user's records. Database queries must be parameterized and migrations should be used instead of silently creating production tables at startup.",
      'Progress messages are sent at major stages: scanning resources, collecting supporting evidence, analyzing cost opportunities, validating recommendations, storing results, analysis complete.',
      'In a robust design, `POST /api/analyze` first creates an analysis record and immediately returns `202 Accepted` with an `analysis_id`. A background worker performs the job while the browser subscribes to `/ws/progress/{analysis_id}`. This avoids the race in which analysis finishes before the frontend learns which WebSocket to open.',
      'WebSocket access must also be authenticated, checked against ownership of the analysis, rate-limited, and closed cleanly. For multi-instance deployment, I would use a job queue and Redis or a managed message service rather than an in-memory connection map.',
      '**Why PostgreSQL?** It stores users, status and searchable analysis metadata while JSONB preserves the structured report. It also supports ownership checks, history, audit fields and later reporting. **Why WebSockets?** Inventory, metrics and AI analysis can take time; WebSockets give stage updates without frequent polling. The database still stores authoritative status so disconnecting the browser does not lose the job.',
    ],
    code: [
      {
        title: 'Tables',
        language: 'text',
        code: `users
  id, email, password_hash, created_at

analyses
  id, user_id, resource_group, resources_scanned,
  issues_found, estimated_savings, analysis_result JSONB,
  status, created_at`,
      },
      {
        title: 'Progress messages',
        language: 'text',
        code: `Scanning resources in dev-rg...
Collecting supporting evidence...
Analyzing cost opportunities...
Validating recommendations...
Storing results...
Analysis complete`,
      },
    ],
    followUps: ['How would this work across several API replicas?'],
    tags: ['finops', 'postgresql', 'websocket'],
  },
  {
    id: 'itv-myai-33',
    level: 'intermediate',
    kind: 'open',
    prompt:
      'How did you handle the React dashboard, authentication and end-to-end integration (Stages 4 and 5)?',
    probing: 'Password and token handling trade-offs, and presenting commands safely.',
    answer: [
      'The frontend contains:\n- Login and signup pages\n- Resource Group selection and Run Analysis button\n- Progress tracker\n- Analysis report\n- Previous-analysis history',
      'Passwords are hashed with bcrypt and never stored in plain text. JWTs include a user identifier, expiry, issuer and audience. The backend validates the token on every protected API.',
      'The initial prompt stores JWTs in `localStorage`. That is easy for a prototype but exposes the token if an XSS vulnerability occurs. For production I would prefer short-lived access tokens, refresh-token rotation, and `HttpOnly`, `Secure`, `SameSite` cookies where the architecture permits. I would also enforce TLS, strong password policy, login throttling and secret rotation.',
      'The UI shows total resources scanned, issue count and estimated saving, followed by individual findings with severity badges, explanation and copyable commands. A copy button does not mean a command is safe: the report must show prerequisites, scope, expected impact, verification and rollback guidance.',
    ],
    code: [
      {
        title: 'Stage 5 integration flow',
        language: 'text',
        code: `signup/login
    -> load permitted Resource Groups
    -> submit an analysis
    -> receive analysis ID
    -> subscribe to authenticated progress
    -> collect and analyze evidence
    -> validate and store result
    -> display report
    -> revisit it from history`,
      },
    ],
    tags: ['finops', 'react', 'jwt'],
  },
  {
    id: 'itv-myai-34',
    level: 'advanced',
    kind: 'open',
    prompt: 'How does the cost investigation itself work — from scope to realized saving?',
    probing:
      'Evidence groups, rules before AI, and only counting realized savings after measurement.',
    answer: [
      '**1. Establish the scope and time window.** I record subscription, Resource Group, currency and analysis window. Cost comparisons are meaningless if the time period or scope changes between reports.',
      '**2. Collect predictable evidence** in four groups:\n- Inventory: type, SKU, region, tags, state and relationships\n- Billing: actual and amortized cost grouped by resource and service\n- Utilization: CPU, memory where available, requests, storage, transactions and network\n- Governance: Azure Advisor, budgets, reservations, lifecycle and shutdown policies',
      '**3. Apply rules before AI** (examples in the code sample).',
      '**4. Use AI for correlation and explanation.** AI can combine the evidence into an understandable hypothesis: "This development VM has low CPU and no activity outside office hours, but memory is unavailable, so confirm memory before moving from D4s to D2s."',
      '**5. Validate the output.** The backend verifies that every resource exists, severity follows policy, savings uses supplied numbers, and commands match an allow-list. Unsupported claims are marked as assumptions.',
      '**6. Human review and measurement.** An owner approves the change, executes it through the normal IaC/change process, monitors performance, and compares cost after a suitable period. Only then is saving recorded as realized.',
    ],
    code: [
      {
        title: 'Rules applied before AI',
        language: 'text',
        code: `Unattached managed disk for more than 7 days -> candidate waste
Public IP with no association -> candidate waste
Development VM running outside agreed hours -> scheduling opportunity
Very low CPU alone -> investigation, not automatic downsizing
Missing owner/cost-center tag -> governance issue`,
      },
    ],
    followUps: ['Can the tool really detect an oversized VM from inventory alone?'],
    tags: ['finops', 'cost', 'investigation'],
  },
  {
    id: 'itv-myai-35',
    level: 'advanced',
    kind: 'scenario',
    prompt: 'Azure cost has suddenly spiked. How would you investigate it?',
    probing: 'A structured cost-delta investigation with trusted numbers, not AI guesses.',
    answer: [
      '1. Confirm scope, time window, currency and whether the chart uses actual or amortized cost.\n2. Group cost by resource, resource type, service, location, meter and tag.\n3. Compare with the previous equivalent period and find the largest contributors to the delta.\n4. Check whether usage increased, SKU changed, a new resource was created, egress grew, reservation coverage changed, or a discount expired.\n5. Compare deployment/activity logs and ownership tags with the spike time.\n6. Check utilization and business need before proposing rightsizing or deletion.\n7. Produce recommendations with evidence, expected saving range, risk, owner and verification plan.\n8. Apply approved changes through Terraform or the normal change process, then monitor service health and realized cost.',
      'The AI helps summarize and compare the data, but the numerical delta and saving are calculated from trusted billing inputs.',
    ],
    followUps: ['What is the difference between actual and amortized cost?'],
    tags: ['finops', 'azure', 'troubleshooting'],
  },
  {
    id: 'itv-myai-36',
    level: 'advanced',
    kind: 'open',
    prompt:
      'What safety and security controls does the Cost Detective need, and how do you protect the model from sensitive Azure data?',
    probing: 'Least privilege, prompt-injection awareness, and blocking destructive commands.',
    answer: [
      "- Use a read-only managed identity for discovery; do not use a developer's broad personal login in production.\n- Scope Azure RBAC to allowed subscriptions or Resource Groups.\n- Never send access tokens, secrets, connection strings or sensitive tag values to the model.\n- Treat Azure names, tags and metadata as untrusted input because prompt injection can be hidden in text fields.\n- Place evidence in a clearly delimited data section and prohibit it from changing system instructions.\n- Use structured output and server-side schema validation.\n- Calculate savings outside the LLM and reject unsupported amounts.\n- Allow-list commands and block destructive verbs such as delete unless an explicit, separately approved workflow exists.\n- Prefer showing Terraform/IaC changes so they are reviewed and auditable.\n- Encrypt database connections and stored reports; define retention and deletion policies.\n- Hash passwords, rotate JWT/API secrets, expire sessions and rate-limit authentication and analysis endpoints.\n- Record who requested, reviewed and acted on every recommendation.\n- Use private networking and approved model/data-residency controls where organizational policy requires them.",
      'To protect the model from sensitive data: I minimize and redact the payload, remove credentials and sensitive tag values, use approved endpoints and retention settings, delimit untrusted metadata, and log only hashes or identifiers needed for audit.',
    ],
    followUps: ['Give an example of prompt injection hidden in an Azure tag.'],
    tags: ['finops', 'security', 'llm'],
  },
  {
    id: 'itv-myai-37',
    level: 'intermediate',
    kind: 'open',
    prompt:
      'How does the Cost Detective handle errors and failures, including OpenAI being unavailable?',
    probing: 'Graceful degradation: evidence is preserved when the AI stage fails.',
    answer: [
      '- **Azure CLI missing**: fail health/readiness check with installation guidance\n- **Azure session expired**: return an authentication-specific error; do not expose raw tokens\n- **Invalid or unauthorized Resource Group**: return 404/403 without leaking other scopes\n- **CLI timeout or throttling**: limited retry with increasing wait between attempts, plus a correlation ID\n- **Partial provider data**: store partial status and show which evidence is missing\n- **OpenAI timeout/rate limit**: retry with limits, then preserve inventory and mark analysis incomplete\n- **Invalid AI JSON**: schema validation, one repair attempt, then controlled failure\n- **Database unavailable**: do not claim completion; retry or queue persistence safely\n- **WebSocket disconnect**: analysis continues; client reconnects and fetches current status\n- **Duplicate request**: idempotency key prevents duplicate analyses and model cost',
      'If OpenAI is unavailable, the predictable inventory and rule findings remain available. I mark the explanation stage incomplete, retry within a fixed policy, and allow a later re-analysis rather than losing the collected evidence.',
    ],
    tags: ['finops', 'reliability'],
  },
  {
    id: 'itv-myai-38',
    level: 'advanced',
    kind: 'open',
    prompt: 'How would you test the Cost Detective, including evaluating the AI?',
    probing: 'Whether AI output is evaluated against a fixed scenario set with measurable metrics.',
    answer: [
      '**Unit tests:**\n- Azure JSON normalization and provider-specific enrichment\n- CLI argument construction without shell injection\n- billing calculations and rule thresholds\n- AI response schema validation\n- password hashing and JWT expiry\n- report authorization by user ID',
      '**Integration tests:**\n- Mock Azure CLI success, invalid login, timeout and malformed JSON\n- Mock the model API for valid, invalid, empty and rate-limited responses\n- Test PostgreSQL JSONB persistence and user isolation\n- Test authenticated WebSocket ownership and reconnection\n- Test `202` job creation through final report retrieval',
      '**AI evaluation:** maintain a fixed set of known scenarios and measure:\n- finding precision and recall\n- unsupported-claim rate\n- command validity\n- severity consistency\n- saving-calculation accuracy\n- explanation usefulness reviewed by engineers',
      '**End-to-end:** signup, login, select an authorized Resource Group, start analysis, see progress, view the evidence-backed report, open history. I would also test empty Resource Groups, thousands of resources, repeated clicks, expired tokens, cross-user history access, malicious tag text and browser reconnection.',
    ],
    followUps: ['How do you measure unsupported-claim rate?'],
    tags: ['finops', 'testing', 'ai evaluation'],
  },
  {
    id: 'itv-myai-39',
    level: 'intermediate',
    kind: 'open',
    prompt: 'How would you measure success and prove business value for the Cost Detective?',
    probing: 'Distinguishing proposed savings from realized, verified savings.',
    answer: [
      'I would measure rather than invent:\n- time to produce the initial cost investigation\n- percentage of findings accepted by owners\n- false-positive and unsupported-claim rates\n- proposed versus approved versus realized monthly savings\n- time from finding to approved action\n- number of unowned or untagged resources reduced\n- model/API cost per analysis\n- analysis completion and failure rates\n- user feedback on whether evidence and actions were understandable',
      'Realized saving should be measured after change against an agreed baseline and adjusted for workload changes. I would track accepted recommendations and compare verified cost after an approved change with the baseline, while checking that latency, availability and capacity objectives remained healthy. Proposed savings alone are not business value.',
    ],
    tags: ['finops', 'metrics'],
  },
  {
    id: 'itv-myai-40',
    level: 'advanced',
    kind: 'open',
    prompt: 'What were the main challenges in the Cost Detective and how did you address them?',
    probing: 'Whether you understand the limits of inventory data and LLM output.',
    answer: [
      '**Inventory is not utilization.** `az resource list` tells us that a resource exists, but not whether it is idle. I treat inventory-only results as candidates and add metrics and billing evidence before making a confident recommendation.',
      '**AI can hallucinate prices or commands.** Prices and savings are computed deterministically. The AI uses structured output, and commands are checked against resource state and an allow-list before display.',
      '**Recommendations can affect availability.** Downsizing or stopping a resource may save money but cause an outage. Each finding includes owner validation, risk, observation window, change plan, rollback and post-change monitoring.',
      '**Long-running requests and realtime progress.** The API creates a background job and returns an analysis ID first. WebSocket progress is resumable, while the database remains the source of truth for current status.',
      '**Multi-user security.** Authentication alone is insufficient. Every Resource Group, history row and WebSocket subscription is authorized against the current user and permitted Azure scope.',
    ],
    followUps: ['Which of these would you tackle first in a real implementation?'],
    tags: ['finops', 'challenges'],
  },
  {
    id: 'itv-myai-41',
    level: 'intermediate',
    kind: 'open',
    prompt: 'What would you improve next in the Cost Detective?',
    probing: 'A realistic roadmap from prototype to production FinOps tooling.',
    answer: [
      'Next steps:\n1. Replace production CLI subprocess calls with Azure SDK and managed identity.\n2. Add Cost Management exports/query data, Azure Monitor metrics and Azure Advisor evidence.\n3. Add predictable price and reservation/savings-plan calculations.\n4. Add provider-specific scanners for compute, disks, databases, storage, App Service and Log Analytics.\n5. Use a durable job queue for horizontal scaling, retries and cancellation.\n6. Add prompt/version tracking and a regression evaluation set.\n7. Generate pull requests for Terraform changes instead of direct CLI mutation.\n8. Add approval, exception and suppression workflows with owner and expiry.\n9. Add budgets, anomaly alerts and scheduled analysis across subscriptions.\n10. Compare forecast, proposed saving and realized saving on a FinOps dashboard.',
      'The common thread is moving from inventory-only evidence and CLI calls to trusted billing, metrics and IaC-driven change, with measurement at the end.',
    ],
    tags: ['finops', 'roadmap'],
  },
  {
    id: 'itv-myai-42',
    level: 'intermediate',
    kind: 'open',
    prompt:
      'Why did you need AI in the Cost Detective if rules can detect waste, and how is it different from Azure Advisor?',
    probing: 'A clear hybrid rationale and positioning next to native tooling.',
    answer: [
      'Rules are best for facts and calculations. AI is useful for correlating many signals, ranking them and explaining the result in plain language. I use a hybrid approach: predictable collection and calculation, AI explanation, then predictable validation.',
      'Advisor is a valuable source of platform recommendations. This application can combine Advisor with organization-specific rules, ownership tags, billing history, operational metrics, approval workflow and a simple cross-signal explanation. It should complement, not pretend to replace, native Azure capabilities.',
    ],
    tags: ['finops', 'ai', 'azure advisor'],
  },
  {
    id: 'itv-myai-43',
    level: 'intermediate',
    kind: 'open',
    prompt:
      'Can the tool detect an oversized VM, how do you calculate estimated savings, and would you let AI delete an unused resource?',
    probing:
      'Evidence requirements for rightsizing, deterministic savings, and no autonomous deletion.',
    answer: [
      '**Oversized VM:** not reliably from inventory alone. It needs CPU, memory if available, I/O, workload patterns, availability requirements and a meaningful observation window. Without these, the report must label it as a low-confidence candidate.',
      '**Estimated savings:** I compare the trusted current-cost baseline with the candidate configuration price for the same region and usage window, include reservation/licensing effects where relevant, and present a range. The LLM does not perform or invent the calculation.',
      '**Deleting an unused resource:** no. "Unused" may still mean disaster-recovery, compliance or seasonal use. I verify ownership, dependencies, activity, backup and retention requirements. The normal IaC/change approval performs the action and includes rollback.',
    ],
    tags: ['finops', 'rightsizing', 'safety'],
  },
]
