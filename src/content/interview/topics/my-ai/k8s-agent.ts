import type { InterviewQuestion } from '../../../types'

/** AI DevOps Kubernetes Agent (on-demand troubleshooting assistant: FastAPI, kubectl, OpenRouter, InsForge, Next.js). */
export const myAiK8sAgentQuestions: InterviewQuestion[] = [
  {
    id: 'itv-myai-44',
    level: 'advanced',
    kind: 'open',
    prompt: 'Walk me through your AI DevOps Kubernetes troubleshooting agent project.',
    probing:
      'Whether you can explain the problem, the two-layer design and the end goal without overselling AI autonomy.',
    answer: [
      '**One line:** I designed an on-demand AI assistant that collects Kubernetes evidence such as Pod status, logs, Events, Deployment health and Service networking, sends structured evidence to an LLM, and returns a simple root cause, supporting explanation, suggested fix, commands, prevention advice and confidence score. The objective is to help an engineer investigate faster. The AI recommends actions; it does not automatically run destructive changes.',
      '**30-second answer:** I designed an AI-powered Kubernetes troubleshooting assistant for common incidents such as CrashLoopBackOff, ImagePullBackOff, OOMKilled, Pending Pods and Service selector problems. A user selects a cluster from the local kubeconfig and starts an investigation from a dashboard. The FastAPI backend safely runs read-only `kubectl` commands, collects Pod state, recent logs, Events, Deployment status, Services and endpoints, and converts everything into structured JSON. The AI layer sends only the relevant evidence to an LLM through OpenRouter and asks it to return a structured diagnosis, suggested fix, commands, prevention steps and confidence. InsForge is used for authentication, realtime progress and investigation history, while Next.js provides the UI. The goal is to reduce investigation time and give junior engineers a clear starting point, without allowing the LLM to make uncontrolled cluster changes.',
      '**What problem were we solving?** Kubernetes troubleshooting normally requires checking several places:\n- Pod state and container termination reason\n- Current and previous container logs\n- Kubernetes Events\n- Deployment replica and rollout status\n- Service selectors and endpoints\n- DNS and connectivity evidence',
      'The information is spread across multiple commands. A junior engineer may see `CrashLoopBackOff`, but that is only a symptom. The real cause could be a missing environment variable, failed mount, incorrect probe, invalid image, OOM kill or dependency failure.',
      '**What did we build?** Two responsibilities:\n1. A predictable investigation layer gathers reliable Kubernetes evidence.\n2. An AI reasoning layer compares that evidence and explains the probable cause in simple language.',
      'The backend remains the orchestrator. The LLM never receives direct cluster credentials and should not be allowed to execute commands.',
      '**End goal:** not to replace the DevOps or SRE engineer, but to reduce mean time to understand an incident, standardize the initial investigation, preserve a useful history and help engineers move from a Kubernetes symptom to an evidence-backed next action.',
      '**Closing statement:** this project showed me that useful AI in DevOps is not about giving an LLM cluster-admin access. The reliable approach is to collect evidence deterministically, give AI a narrow reasoning task, validate its structured answer, and keep execution under human or tightly controlled runbook approval. The end result is a faster and more consistent first investigation, while Kubernetes access, secrets and production changes remain governed by normal DevOps and SRE controls.',
    ],
    code: [
      {
        title: 'End-to-end flow',
        language: 'text',
        code: `User logs in
    -> selects a kubeconfig cluster/context
    -> clicks Investigate
    -> FastAPI validates user, cluster and request
    -> read-only Kubernetes evidence is collected
    -> evidence is normalized into JSON
    -> prompt builder sends relevant evidence to the LLM
    -> structured diagnosis is validated
    -> result and progress are saved
    -> dashboard shows root cause, fix and confidence`,
      },
    ],
    followUps: [
      'Why use AI when scripts and alerts already exist?',
      'How do you prevent hallucination?',
      'Would you let AI automatically fix production?',
    ],
    tags: ['kubernetes', 'ai', 'project', 'troubleshooting'],
  },
  {
    id: 'itv-myai-45',
    level: 'basic',
    kind: 'open',
    prompt: 'What can you honestly claim about the Kubernetes agent project?',
    probing: 'Whether you separate design and prompts from working, tested software.',
    answer: [
      'The supplied project folder contains a high-level design and five staged implementation prompts. It does not contain the generated backend/frontend source code, deployment manifests, automated test results, screenshots, or production metrics.',
      'In an interview I should therefore say **"I designed and prototyped this workflow"** unless I have separately built, executed, and validated the application. I should claim it is fully implemented or production-deployed only when I can show the working code, test evidence, security review, deployment and measured results.',
      'I can confidently claim a complete staged design and implementation plan for an AI-assisted Kubernetes troubleshooting product. I cannot claim a working production deployment or measured MTTR improvement from the supplied folder alone because it contains prompts/HLD rather than application source and test evidence.',
      'The reviewed files were the high-level architecture README, the project-foundation, investigation-engine, AI reasoning-engine, InsForge authentication/dashboard/history and end-to-end integration prompts, `.gitignore` and the Apache License 2.0. The Apache License permits use and modification under its terms; attribution/license obligations still apply if project material is redistributed.',
    ],
    tags: ['kubernetes', 'project', 'honesty'],
  },
  {
    id: 'itv-myai-46',
    level: 'advanced',
    kind: 'open',
    prompt:
      'Explain the architecture and technology stack of the Kubernetes agent. Is it an operator?',
    probing:
      'Component responsibilities, tool choices with trade-offs, and on-demand versus reconciling design.',
    answer: [
      'A Next.js dashboard (login, cluster selection, progress, result) calls the FastAPI backend (authentication, validation and orchestration). The backend drives a Kubernetes investigation layer (read-only kubectl for Pods/logs/events/deployments and Services/endpoints/DNS) and uses InsForge for auth, history and realtime updates. Structured, redacted evidence goes to the AI Kubernetes agent: prompt builder, OpenRouter LLM, validator — producing root cause, fix, commands and confidence.',
      'This is an **on-demand troubleshooting application**, not a Kubernetes controller or operator. It investigates only when a user or API triggers it; it does not continuously reconcile (make actual state match desired state) cluster state. An operator continuously watches desired state and reconciles it; this system runs only when an authenticated user requests an investigation and primarily reads evidence.',
      '- **Frontend — Next.js, TypeScript, Tailwind CSS**: simple typed dashboard and clear investigation experience\n- **Frontend data — Axios and React Query**: API calls, loading/error state and result caching\n- **Backend — Python, FastAPI, Uvicorn, Pydantic**: API orchestration, validation and structured response models\n- **Backend utilities — Loguru and HTTPX**: structured application logs and outbound LLM calls\n- **Kubernetes access — `kubectl` through controlled subprocess execution**: collect cluster evidence using familiar commands\n- **AI gateway — OpenRouter**: access a configured LLM such as GPT, Claude or DeepSeek through one API\n- **Backend platform — InsForge**: authentication, investigation history, realtime progress and secret/key integration\n- **Packaging — Docker and Docker Compose**: repeatable local frontend/backend startup\n- **Configuration — environment variables**: keep API keys, model name, kubeconfig path and API base URL outside code',
      '**Why FastAPI?** Simple typed APIs, async support for the LLM call, Pydantic validation and automatic API documentation; it also keeps orchestration separate from the UI.',
      '**Why `kubectl` instead of the SDK?** For the prototype it was simple, familiar and easy to demonstrate. The trade-off is process overhead, parsing and command-safety work. For production scale and watches I would consider the typed Kubernetes Python SDK, which provides typed APIs, watches, cancellation and avoids some command-construction risk.',
    ],
    code: [
      {
        title: 'High-level architecture',
        language: 'text',
        code: `┌───────────────────────────────────────────────┐
│ Next.js Dashboard                             │
│ Login | Cluster selection | Progress | Result │
└──────────────────────┬────────────────────────┘
                       │ HTTP API / realtime status
                       ▼
┌───────────────────────────────────────────────┐
│ FastAPI Backend                               │
│ Authentication, validation and orchestration  │
└──────────────┬─────────────────┬──────────────┘
               │                 │
               ▼                 ▼
┌─────────────────────────┐   ┌──────────────────┐
│ Kubernetes Investigation│   │ InsForge         │
│ Read-only kubectl        │   │ Auth, history,   │
│ Pods/logs/events/deploy  │   │ realtime updates│
│ Services/endpoints/DNS   │   └──────────────────┘
└──────────────┬──────────┘
               │ structured and redacted evidence
               ▼
┌───────────────────────────────────────────────┐
│ AI Kubernetes Agent                           │
│ Prompt builder -> OpenRouter LLM -> validator │
│ Root cause | fix | commands | confidence      │
└───────────────────────────────────────────────┘`,
      },
    ],
    followUps: ['When would you switch from kubectl to the Kubernetes SDK?'],
    tags: ['kubernetes', 'architecture', 'fastapi'],
  },
  {
    id: 'itv-myai-47',
    level: 'intermediate',
    kind: 'open',
    prompt:
      'How did you set up the project foundation (Stage 1) of the Kubernetes agent, and why build it incrementally?',
    probing: 'Incremental delivery and testability of each layer.',
    answer: [
      'We first created a monorepo with separate backend and frontend areas.',
      'The first milestone implemented only:\n- FastAPI application\n- `GET /health`\n- Minimal Next.js screen\n- CORS, logging and environment loading\n- Backend and frontend Dockerfiles\n- Docker Compose on ports 8000 and 3000',
      'We intentionally avoided Kubernetes and AI logic at this stage. This incremental approach made it easier to test each layer independently and prevented many integration problems from appearing at once.',
    ],
    code: [
      {
        title: 'Monorepo layout',
        language: 'text',
        code: `ai-kubernetes-agent/
├── backend/
│   ├── api/
│   ├── core/
│   ├── kubernetes/
│   ├── ai/
│   ├── services/
│   └── models/
├── frontend/
│   ├── components/
│   ├── services/
│   ├── hooks/
│   └── types/
├── docker-compose.yml
└── README.md`,
      },
      {
        title: 'Health response',
        language: 'json',
        code: `{
  "status": "healthy",
  "service": "ai-kubernetes-agent"
}`,
      },
    ],
    tags: ['kubernetes', 'fastapi', 'docker'],
  },
  {
    id: 'itv-myai-48',
    level: 'advanced',
    kind: 'open',
    prompt: 'How does the Kubernetes investigation engine (Stage 2) collect evidence?',
    probing:
      'Whether you know which signals matter per failure mode and how to collect them safely.',
    answer: [
      'The investigation engine behaves like a junior DevOps engineer gathering evidence before reaching a conclusion.',
      '**Kubectl executor:** a reusable executor runs an allow-listed command with `subprocess`, captures stdout/stderr, enforces a timeout, records exit code and returns a structured result. The safe design uses an argument list rather than `shell=True`, never accepts arbitrary command text from the user, fixes the selected context explicitly, limits output and redacts secrets.',
      '**Pod inspector** identifies:\n- CrashLoopBackOff\n- ImagePullBackOff or ErrImagePull\n- Pending\n- Error\n- OOMKilled\n- ContainerCreating for an abnormal duration',
      'It records namespace, Pod, container, reason, restart count, readiness and owning workload.',
      '**Logs collector:** fetches a limited amount of current and, when relevant, previous container logs, looking for startup exceptions, missing configuration, connection failures and termination clues. The goal is not to send thousands of log lines to the LLM.',
      '**Events analyzer** groups recent relevant Events:\n- FailedScheduling\n- BackOff\n- FailedMount\n- FailedPull or ErrImagePull\n- Unhealthy probe results',
      'Events are filtered by involved object and time so old unrelated warnings do not become the apparent root cause.',
      '**Deployment inspector:** checks desired, ready, available and unavailable replicas, observed generation, rollout Conditions and the relationship between Deployment, ReplicaSet and Pods.',
      '**Network inspector:** checks Service existence, selector-to-Pod-label matching, endpoints or EndpointSlices and relevant DNS/connectivity evidence. A Service with no endpoints is treated differently from a DNS failure or an application that is not listening.',
      'The service returns one normalized payload. At this stage there is deliberately no AI conclusion, so the output can be tested deterministically.',
    ],
    code: [
      {
        title: 'Executor result',
        language: 'python',
        code: `{
    "command": ["kubectl", "get", "pods", "-A", "-o", "json"],
    "success": True,
    "exit_code": 0,
    "stdout": "...",
    "stderr": ""
}`,
      },
      {
        title: 'Unified evidence payload',
        language: 'json',
        code: `{
  "cluster": "development",
  "collected_at": "timestamp",
  "pods": {},
  "logs": {},
  "events": {},
  "deployments": {},
  "network": {},
  "collection_errors": []
}`,
      },
    ],
    followUps: ['Why fetch previous container logs for a CrashLoopBackOff?'],
    tags: ['kubernetes', 'kubectl', 'troubleshooting'],
  },
  {
    id: 'itv-myai-49',
    level: 'advanced',
    kind: 'open',
    prompt:
      'How does the AI reasoning engine (Stage 3) of the Kubernetes agent work, and how is confidence calculated?',
    probing:
      'Prompt design, schema validation, and confidence grounded in evidence rather than model tone.',
    answer: [
      'The AI layer consumes the evidence payload and behaves like a senior Kubernetes SRE assistant.',
      '**Prompt builder** — the prompt contains:\n- Exact scope and selected cluster\n- Pod/container state\n- Relevant limited logs\n- Recent related Events\n- Deployment health\n- Service/network findings\n- A strict output schema',
      'The model is instructed to distinguish evidence, inference and missing information and to avoid inventing commands or resources.',
      '**LLM client:** the backend uses HTTPX to call OpenRouter. The API key and selected model come from environment/secret configuration, never source control. The client adds connection/read timeout, limited retry for temporary failures, safe error messages and correlation logging without prompts containing secrets.',
      '**Root-cause handling:** the LLM output is parsed through a strict Pydantic response model. The system rejects invalid or incomplete output instead of displaying free-form text as a trusted diagnosis. Suggested commands are treated as guidance and displayed for human review; the application does not execute them.',
      "**Confidence** must reflect evidence quality, not the model's writing style. A high score is reasonable only when independent signals agree — for example termination state, previous log and Event all indicate the same cause. Missing logs, collection errors or conflicting evidence must lower confidence and produce explicit next investigation steps.",
      '**Validating the confidence score:** I compare diagnoses with labeled failure scenarios and human-confirmed incidents. Confidence is constrained by the number and independence of supporting signals, collection errors and contradictory evidence; it is not accepted solely because the LLM prints a percentage.',
    ],
    code: [
      {
        title: 'Expected structured output',
        language: 'json',
        code: `{
  "root_cause": "DATABASE_URL is missing from the application configuration",
  "explanation": "The container exits during startup and then Kubernetes restarts it.",
  "suggested_fix": "Add the expected secret reference to the Deployment.",
  "commands": ["kubectl -n payments describe deployment payment-service"],
  "prevention": "Validate required configuration during deployment and startup.",
  "confidence": 92,
  "evidence": [
    "Pod is in CrashLoopBackOff",
    "Previous log reports DATABASE_URL missing"
  ]
}`,
      },
    ],
    followUps: ['What if the evidence points to two different causes?'],
    tags: ['kubernetes', 'llm', 'prompting'],
  },
  {
    id: 'itv-myai-50',
    level: 'intermediate',
    kind: 'open',
    prompt:
      'How did you build the application experience (Stage 4 with InsForge) and why keep investigation history?',
    probing: 'Progress UX and responsible handling of stored evidence.',
    answer: [
      'The fourth stage converts the backend into a usable application:\n- User login and session\n- Protected investigation API/dashboard\n- Realtime progress events\n- Persisted investigation history\n- Root-cause result card',
      'History stores metadata such as investigation ID, user, selected cluster/context, namespace/scope, timestamp, status, root cause and confidence. Raw sensitive logs should not be retained automatically; retention and access need an explicit policy.',
      'History supports audit, handover, repeated-incident detection and evaluation of model quality. It must store appropriate metadata and redacted evidence with access and retention controls.',
    ],
    code: [
      {
        title: 'Progress states',
        language: 'text',
        code: `Checking Pods
Reading Logs
Analyzing Events
Inspecting Deployments
Checking Networking
Running AI Reasoning
Validating Diagnosis
Completed`,
      },
    ],
    tags: ['kubernetes', 'ux', 'history'],
  },
  {
    id: 'itv-myai-51',
    level: 'intermediate',
    kind: 'open',
    prompt:
      'What did end-to-end integration and failure testing (Stage 5) of the Kubernetes agent cover?',
    probing: 'Whether both known incident types and infrastructure failures were tested.',
    answer: [
      'The final stage joins the entire workflow and tests known failure cases:\n1. CrashLoopBackOff caused by a missing environment variable\n2. ImagePullBackOff caused by an invalid image tag\n3. OOMKilled caused by an insufficient memory limit or application memory behavior\n4. Service selector mismatch causing no endpoints',
      'It also handles:\n- Missing kubeconfig\n- Cluster unreachable\n- Invalid or unauthorized context\n- `kubectl` failure or timeout\n- LLM/API timeout or invalid response\n- Authentication failure\n- No unhealthy resources found\n- Partial evidence collection',
      'The dashboard shows useful failure messages without exposing a stack trace or secret.',
    ],
    tags: ['kubernetes', 'testing'],
  },
  {
    id: 'itv-myai-52',
    level: 'advanced',
    kind: 'open',
    prompt: 'How does multi-cluster selection work safely in the Kubernetes agent?',
    probing: 'Context validation and avoiding shell fragments or exposing developer kubeconfigs.',
    answer: [
      'The integration requirement includes showing clusters/contexts from the local kubeconfig and allowing the user to select one. A safer flow is:\n1. Backend reads allowed kubeconfig contexts.\n2. API returns display names and a stable internal identifier.\n3. User selects one context.\n4. Backend validates that the user may access it.\n5. Every command supplies that exact context and optional namespace.\n6. History records which context was investigated.',
      "The frontend must never send an arbitrary shell fragment as a context name. In production, server-side service-account/workload identity and explicit cluster registration are generally safer than exposing a developer's local kubeconfig.",
    ],
    followUps: ['How would you register clusters without a local kubeconfig?'],
    tags: ['kubernetes', 'multi-cluster', 'security'],
  },
  {
    id: 'itv-myai-53',
    level: 'advanced',
    kind: 'scenario',
    prompt:
      'The payment service is unavailable and its Pod is in CrashLoopBackOff. Walk me through how the agent and you would diagnose and fix it.',
    probing: 'Evidence correlation for a real incident and a GitOps-safe permanent fix.',
    answer: [
      '**Evidence collected:** Pod `payment-service-7d9f` is Waiting/CrashLoopBackOff with 8 restarts and previous exit code 1; the previous log says "DATABASE_URL environment variable is required"; the Deployment has 0 of 3 replicas available; the Service selector matches Pods, but there are no Ready endpoints.',
      '**AI-assisted conclusion:** the application exits during startup because `DATABASE_URL` is missing. The previous container log contains the explicit configuration error, and CrashLoopBackOff with repeated exit code 1 confirms a startup failure. Suggested fix: add the correct Secret reference to the Deployment and roll out a new revision. Prevention: validate required variables in CI and use a startup check with a clear message.',
      'I then confirm the diagnosis myself with the human-controlled investigation commands.',
      'I would not recommend `kubectl edit` as the permanent source of truth when GitOps or reviewed manifests are used. The lasting fix should be committed to the deployment repository, reviewed and reconciled through the normal pipeline.',
    ],
    code: [
      {
        title: 'Evidence collected',
        language: 'text',
        code: `Pod: payment-service-7d9f
State: Waiting / CrashLoopBackOff
Restarts: 8
Previous exit code: 1
Previous log: "DATABASE_URL environment variable is required"
Deployment: 0 of 3 replicas available
Service: selector matches Pods, but no Ready endpoints`,
      },
      {
        title: 'Human-controlled investigation',
        language: 'bash',
        code: `kubectl -n payments describe pod payment-service-7d9f
kubectl -n payments logs payment-service-7d9f --previous
kubectl -n payments get deployment payment-service -o yaml
kubectl -n payments rollout status deployment/payment-service`,
      },
    ],
    followUps: ['Why does the Service have no Ready endpoints even though the selector matches?'],
    tags: ['kubernetes', 'crashloopbackoff', 'troubleshooting'],
  },
  {
    id: 'itv-myai-54',
    level: 'intermediate',
    kind: 'open',
    prompt:
      'How did you use AI in day-to-day DevOps in the Kubernetes agent, and why use AI when scripts and alerts already exist?',
    probing: 'A precise split between AI reasoning and deterministic code.',
    answer: [
      'The useful AI part is not "ask a chatbot why Kubernetes is broken." We first gather predictable evidence and give the model a narrow reasoning task. Scripts are excellent for predictable checks, but incidents often contain several related signals; AI helps compare and explain them.',
      'AI helps with:\n- Correlating Pod state, Events, logs and rollout health\n- Translating technical evidence into a simple explanation\n- Ranking likely causes\n- Suggesting the next safe diagnostic command\n- Generating prevention recommendations\n- Summarizing an investigation for history and handover',
      'Predictable code still handles:\n- Authentication and authorization\n- Cluster selection\n- Command execution\n- Evidence collection\n- Output limits and redaction\n- Response-schema validation\n- History and progress state\n- Approval and execution of changes',
      'This separation makes the system easier to trust and test.',
    ],
    tags: ['kubernetes', 'ai', 'devops'],
  },
  {
    id: 'itv-myai-55',
    level: 'advanced',
    kind: 'open',
    prompt: 'What security and safety controls does the Kubernetes agent need?',
    probing: 'RBAC scope, secret redaction, prompt-injection defence and operational safety.',
    answer: [
      'The design prompts describe the functional flow, but a production implementation also needs these controls.',
      '**Kubernetes access:**\n- Use read-only, least-privilege (minimum required access) RBAC for investigation.\n- Scope access by allowed cluster and namespace.\n- Do not expose a general-purpose shell endpoint.\n- Use an argument array, command allow-list, timeout and output limit.\n- Audit user, cluster, scope and command category.',
      '**Secrets and sensitive evidence:**\n- Store OpenRouter/InsForge credentials outside Git.\n- Prefer workload identity or a secret manager over long-lived environment secrets.\n- Redact Secret values, tokens, authorization headers and personal data from logs/prompts/history.\n- Encrypt retained investigation data and define access and deletion policy.',
      '**LLM safety:**\n- Treat Kubernetes logs and annotations as untrusted input; they can contain prompt-injection text.\n- Delimit evidence and instruct the model that evidence is data, not instructions.\n- Use a strict response schema and reject extra executable content.\n- Never automatically run LLM-generated commands.\n- Allow only human-reviewed or pre-approved limited runbooks.\n- Record model, prompt version, evidence references and result for audit.',
      '**Operational safety:**\n- Use correlation IDs and limited retries.\n- Apply rate limits and investigation concurrency limits.\n- Cancel timed-out investigations.\n- Make progress/history updates idempotent (safe to run more than once).\n- Provide a non-AI fallback that returns collected evidence when the LLM is unavailable.',
      '**In short:** read-only least-privilege RBAC, allowed cluster/namespace scope, short-lived identity, command allow-list, no shell execution, timeouts, audit logs and no Secret-value collection.',
    ],
    followUps: ['What RBAC verbs and resources would the investigation role get?'],
    tags: ['kubernetes', 'security', 'rbac', 'llm'],
  },
  {
    id: 'itv-myai-56',
    level: 'advanced',
    kind: 'open',
    prompt: 'How would you test the Kubernetes agent end to end?',
    probing: 'Deterministic fixtures for each failure mode and rejection of unsafe suggestions.',
    answer: [
      '**Unit tests:**\n- Parse Pod/container states correctly.\n- Select current versus previous logs.\n- Group Events by object and time.\n- Detect Service selector/endpoints mismatch.\n- Build a redacted prompt.\n- Validate accepted and rejected LLM responses.\n- Calculate or constrain confidence consistently.',
      "**Integration tests:**\n- Mock `kubectl` exit codes, malformed JSON, stderr and timeout.\n- Mock OpenRouter success, 429, timeout, server error and invalid JSON.\n- Test authentication, history ownership and realtime updates.\n- Verify one user's result is not visible to another user.",
      '**Controlled cluster tests:** use a local disposable cluster and versioned test manifests to create:\n- Missing environment variable\n- Invalid image tag\n- Memory-limit failure\n- Pending Pod from impossible request/constraint\n- Failed mount\n- Probe failure\n- Service with no endpoints',
      'For each scenario, define expected evidence, acceptable diagnosis, unsafe suggestions that must be rejected and recovery checks.',
    ],
    code: [
      {
        title: 'End-to-end acceptance',
        language: 'text',
        code: `select test cluster -> trigger investigation -> observe progress
-> receive valid diagnosis -> inspect supporting evidence
-> apply reviewed fixture fix -> rerun -> healthy/no-critical-issue result`,
      },
    ],
    followUps: ['How would you version the incident test dataset?'],
    tags: ['kubernetes', 'testing', 'ai evaluation'],
  },
  {
    id: 'itv-myai-57',
    level: 'intermediate',
    kind: 'open',
    prompt: 'How do you measure whether the Kubernetes agent achieved its goal?',
    probing: 'Measurable accuracy and safety metrics, not invented percentages.',
    answer: [
      'The supplied project does not include measured results, so I should not invent percentages. I would measure:\n- Time from investigation start to useful diagnosis\n- Root cause top-1 and top-3 accuracy on labeled scenarios\n- Percentage of diagnoses supported by cited evidence\n- False-positive and low-confidence rate\n- Unsafe or invalid command recommendation rate\n- Evidence-collection success and latency\n- LLM timeout/error and fallback success\n- Engineer acceptance/correction rate\n- Reduction in repeated manual investigation steps\n- User-visible mean time to acknowledge and restore',
      'The success condition is not simply "the LLM answered." The answer must be correct enough, evidence-backed, safe, understandable and faster than the normal first investigation.',
    ],
    tags: ['kubernetes', 'metrics'],
  },
  {
    id: 'itv-myai-58',
    level: 'advanced',
    kind: 'open',
    prompt:
      'What challenges did you face in the Kubernetes agent — noise, hallucination, injection, LLM failure — and how did you address them?',
    probing: 'Concrete mitigations for the typical failure modes of LLM-based ops tools.',
    answer: [
      '**Too much noisy data.** Sending every log and Event increases cost and confuses the model. We limit logs, filter by affected object/time and summarize structured status before reasoning.',
      '**Hallucinated fixes.** We require a strict output structure, evidence list and human review. Low or conflicting evidence produces next diagnostic steps rather than a confident fix. In general, I provide narrow structured evidence, require evidence citations and a strict response schema, lower confidence when data is missing, validate output and never automatically execute generated commands.',
      '**Command injection.** The backend builds allow-listed argument arrays. User input is validated as a context, namespace or object name and never concatenated into a shell command.',
      '**LLM or network failure.** The predictable investigation result is still returned. The UI explains that AI analysis is temporarily unavailable and gives the evidence to the engineer, who continues manually.',
      "**Confidence can be misleading.** The model's self-reported number is not enough. Confidence should be constrained by evidence coverage, agreement, collection errors and scenario validation.",
      '**Cluster credentials are high risk.** Use read-only RBAC, explicit scope, short-lived identity, audit and separate credentials per cluster/environment. A public application must never receive unrestricted admin kubeconfig access.',
    ],
    followUps: ['How do you keep token cost under control on large clusters?'],
    tags: ['kubernetes', 'llm', 'challenges'],
  },
  {
    id: 'itv-myai-59',
    level: 'advanced',
    kind: 'open',
    prompt:
      'What would you improve next in the Kubernetes agent, and would you ever let AI fix production automatically?',
    probing: 'A roadmap toward retrieval, observability and tightly controlled runbooks.',
    answer: [
      'Next improvements:\n1. Replace or complement subprocess calls with the Kubernetes client for typed API access and watches.\n2. Add predictable rule checks for obvious failures before invoking the LLM.\n3. Retrieve relevant approved runbooks and Kubernetes documentation rather than asking the model from memory alone.\n4. Add OpenTelemetry traces and service metrics for the agent itself.\n5. Use queued background jobs for long investigations and enforce per-cluster concurrency.\n6. Add prompt/model evaluation with a versioned incident test dataset.\n7. Support namespace/workload-scoped investigation rather than scanning every cluster resource.\n8. Add an approval workflow for a small set of reversible runbooks, with dry run and post-action verification.\n9. Deploy inside a private management environment with workload identity instead of relying on local kubeconfig.\n10. Add cost controls, token budgets and evidence caching without reusing stale cluster state.',
      '**Automatic fixes:** not directly. I would begin with recommendations only. Later, a small catalog of reversible and well-tested runbooks could run with preconditions, dry run, approval, limited scope, rollback, audit and post-change SLO verification.',
    ],
    followUps: ['Which runbook would you automate first and why?'],
    tags: ['kubernetes', 'roadmap', 'automation'],
  },
]
