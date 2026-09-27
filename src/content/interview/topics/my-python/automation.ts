import type { InterviewQuestion } from '../../../types'

/** Python for DevOps automation: APIs, errors, config files, subprocess, secrets, scheduling, FastAPI. */
export const myPythonAutomationQuestions: InterviewQuestion[] = [
  {
    id: 'itv-mypy-1',
    level: 'basic',
    kind: 'open',
    prompt: 'How is Python useful for DevOps?',
    probing:
      'Whether you know when Python beats a shell script and what makes automation safe to run in production.',
    answer: [
      'I reach for Python when automation needs more structure than a short shell script can give. I use it for REST APIs, cloud SDKs, log parsing, validation, reports, operational tools, and pipeline helpers.',
      'A practical example is an unused-resource report: authenticate with workload identity, list cloud disks, filter out unattached resources older than a threshold, estimate cost, and write a report. The first version runs in dry-run mode only. Deletion needs approval and a second check before it happens.',
      'For production automation I also add argument parsing, structured logging, timeouts, retries with backoff (each retry waits a bit longer than the last), tests, dependency locking, useful exit codes, and metrics. I never hardcode credentials, and I never catch every exception just to make errors disappear silently.',
    ],
    tags: ['python', 'devops', 'automation'],
  },
  {
    id: 'itv-mypy-2',
    level: 'intermediate',
    kind: 'open',
    prompt: 'How do you call a REST API in Python?',
    probing:
      'Whether your HTTP calls have timeouts, status checks, safe retries and token hygiene, not just a bare requests.get.',
    answer: [
      'I use `requests` or `httpx`, set a timeout, check the status code, validate the response, and only retry failures that are safe and temporary.',
      "For authentication I get a short-lived token from managed identity or a secret store and send it in a header, and I never log it. I also handle pagination and rate limits, respect `Retry-After`, use correlation IDs, and make sure a POST is safe to retry (it won't create duplicates) before I turn retries on for it.",
    ],
    code: [
      {
        title: 'GET with timeout and error handling',
        language: 'python',
        code: `import requests

url = "https://api.example.com/v1/health"
try:
    response = requests.get(url, timeout=(3, 10))
    response.raise_for_status()
    payload = response.json()
    print(payload["status"])
except requests.Timeout:
    raise SystemExit("API request timed out")
except requests.HTTPError as exc:
    raise SystemExit(f"API returned {exc.response.status_code}")
except (requests.ConnectionError, ValueError) as exc:
    raise SystemExit(f"API request failed: {exc}")`,
      },
    ],
    tags: ['python', 'rest api', 'requests'],
  },
  {
    id: 'itv-mypy-3',
    level: 'intermediate',
    kind: 'scenario',
    prompt: 'How do you handle errors in Python scripts?',
    probing:
      'Whether you catch specific exceptions where you can act on them, add context, and fail loudly with an exit code instead of swallowing errors.',
    answer: [
      'I catch specific exceptions at the point where the code can either recover or add useful context. I avoid `except Exception: pass` because it just hides the failure instead of dealing with it.',
      'At the outer boundary of the program, I log the failure once and return a non-zero exit code. Cleanup happens through context managers or `finally`.',
      "I also separate retryable failures from validation errors, keep secrets out of exception messages, and test the failure paths themselves: timeouts, invalid input, partial output, and a dependency that isn't available.",
    ],
    code: [
      {
        title: 'Specific exceptions with context',
        language: 'python',
        code: `import logging
from pathlib import Path

log = logging.getLogger(__name__)

def load_config(path: str) -> str:
    try:
        return Path(path).read_text(encoding="utf-8")
    except FileNotFoundError as exc:
        raise RuntimeError(f"Config file not found: {path}") from exc
    except PermissionError as exc:
        raise RuntimeError(f"Cannot read config file: {path}") from exc`,
      },
    ],
    traps: ['`except Exception: pass` hides the failure instead of dealing with it.'],
    tags: ['python', 'error handling', 'exceptions'],
  },
  {
    id: 'itv-mypy-4',
    level: 'basic',
    kind: 'open',
    prompt: 'How do you read and write JSON in Python?',
    probing:
      'Whether you know the json module and also validate structure and write output safely.',
    answer: [
      'The `json` module converts JSON text to Python dictionaries and lists, and back again.',
      'I always check required fields and types, because text can be valid JSON and still not match what the application expects. For large newline-delimited JSON files, I stream one record at a time instead of loading the whole file.',
      'For output that matters, I write to a temporary file first and then rename it. That way a crash mid-write never leaves a half-written file behind.',
    ],
    code: [
      {
        title: 'Read, validate and write JSON',
        language: 'python',
        code: `import json
from pathlib import Path

config = json.loads(Path("config.json").read_text(encoding="utf-8"))
if "environment" not in config:
    raise ValueError("Missing environment")

result = {"environment": config["environment"], "status": "ready"}
Path("result.json").write_text(
    json.dumps(result, indent=2, sort_keys=True) + "\\n",
    encoding="utf-8",
)`,
      },
    ],
    tags: ['python', 'json'],
  },
  {
    id: 'itv-mypy-5',
    level: 'intermediate',
    kind: 'open',
    prompt: 'How do you parse YAML in Python?',
    probing: 'Whether you know why yaml.safe_load matters and validate the parsed structure.',
    answer: [
      "I use `yaml.safe_load`. I never use `yaml.load` on input I don't fully trust, because it can build arbitrary Python objects and run code as a side effect.",
      'I catch parser errors with file and line information, and I validate the resulting structure against a schema. If comments and formatting need to survive a rewrite, I use a round-trip capable library instead of the plain loader. Any secrets referenced by the YAML are fetched separately at runtime, not stored in the file.',
    ],
    code: [
      {
        title: 'safe_load and structure check',
        language: 'python',
        code: `from pathlib import Path
import yaml

with Path("config.yaml").open(encoding="utf-8") as handle:
    config = yaml.safe_load(handle)

if not isinstance(config, dict) or "services" not in config:
    raise ValueError("config.yaml must contain a services map")`,
      },
    ],
    traps: ['`yaml.load` on untrusted input can build arbitrary Python objects and run code.'],
    tags: ['python', 'yaml', 'security'],
  },
  {
    id: 'itv-mypy-6',
    level: 'intermediate',
    kind: 'open',
    prompt: 'How do you execute shell commands from Python?',
    probing:
      'Whether you use subprocess safely: argument lists, check, timeouts, and no shell=True with user input.',
    answer: [
      'I use `subprocess.run` with an argument list, `check=True`, a timeout, and captured text output. I avoid `shell=True` on anything with user-controlled input, because it opens the door to command injection.',
      "I handle `CalledProcessError` and `TimeoutExpired`, redact sensitive arguments, and prefer a Python SDK when one exists, since it's typed and easier to test. In tests I mock the subprocess call itself and check the command arguments, exit-code handling, and timeout behavior.",
    ],
    code: [
      {
        title: 'subprocess.run with a timeout',
        language: 'python',
        code: `import subprocess

result = subprocess.run(
    ["kubectl", "get", "pods", "-n", "payments", "-o", "json"],
    check=True,
    capture_output=True,
    text=True,
    timeout=30,
)`,
      },
    ],
    traps: ['`shell=True` with user-controlled input opens the door to command injection.'],
    tags: ['python', 'subprocess', 'security'],
  },
  {
    id: 'itv-mypy-7',
    level: 'advanced',
    kind: 'scenario',
    prompt: 'How do you manage secrets in Python automation?',
    probing:
      'Whether you use short-lived identity and a secret store, keep secrets out of logs and code, and know the response when one leaks.',
    answer: [
      'I authenticate with managed identity, workload identity, or another short-lived mechanism, and fetch secrets at runtime from Vault or a cloud secret manager. Environment variables can work as a delivery method in some setups, but they still need protection, since child processes and diagnostic tools can expose them.',
      "I never commit secrets, put them in default arguments, print them, or let them end up in exception messages. Access is scoped to only what's needed, audited, and rotated regularly. The code only receives a secret at the point where it's used, and never writes it to disk.",
      'If a secret does get exposed, I revoke it first, then review logs and access history, rotate any downstream credentials, remove retained output, and add a test or a scan so it does not happen again.',
    ],
    followUps: [
      'How would you detect a secret that has been committed to a repository?',
      'How does workload identity avoid storing a credential at all?',
    ],
    tags: ['python', 'secrets', 'security'],
  },
  {
    id: 'itv-mypy-8',
    level: 'basic',
    kind: 'open',
    prompt: 'How do you create a Python virtual environment?',
    probing: 'Whether you isolate dependencies per project and pin them for reproducible CI runs.',
    answer: [
      "A virtual environment keeps a project's packages separate from the system Python install.",
      "On Windows, activation is usually `.venv\\Scripts\\Activate.ps1`. I don't commit `.venv` to source control; I commit a dependency file and a lock file instead.",
      "CI creates a fresh environment on every run, installs pinned dependencies, scans them, and tests against the supported Python versions. Containers add another layer of isolation, but they don't remove the need to pin dependencies.",
    ],
    code: [
      {
        title: 'Create, use and leave a venv',
        language: 'bash',
        code: `python3 -m venv .venv
source .venv/bin/activate        # Linux/macOS
python -m pip install --upgrade pip
python -m pip install -r requirements.txt
python -m pytest
deactivate`,
      },
    ],
    tags: ['python', 'venv', 'dependencies'],
  },
  {
    id: 'itv-mypy-9',
    level: 'intermediate',
    kind: 'open',
    prompt: 'How do you process large log files in Python?',
    probing:
      'Whether you stream instead of loading everything into memory, and know when a script has outgrown its job.',
    answer: [
      'I stream the file line by line instead of loading it all into memory. This example counts status codes.',
      'For production use, I define the expected log format, count the malformed records instead of silently skipping them, use generators, read compressed files directly, write output incrementally, and checkpoint long runs. I also measure throughput and memory.',
      'If the volume keeps growing or becomes continuous, I move parsing to a log platform or streaming system instead of stretching one script past its limits.',
    ],
    code: [
      {
        title: 'Count status codes by streaming',
        language: 'python',
        code: `from collections import Counter

counts = Counter()
with open("access.log", encoding="utf-8", errors="replace") as handle:
    for line_number, line in enumerate(handle, start=1):
        parts = line.split()
        if len(parts) < 9:
            continue
        counts[parts[8]] += 1

print(counts.most_common())`,
      },
    ],
    tags: ['python', 'logs', 'performance'],
  },
  {
    id: 'itv-mypy-10',
    level: 'advanced',
    kind: 'open',
    prompt: 'How do you make a Python script production-ready?',
    probing:
      'Whether you think beyond "it works on my laptop" to operability: config, logs, idempotency, tests, identity and runbooks.',
    answer: [
      'My checklist for a production-ready script:',
      '- `argparse` or typed configuration with validation\n- Structured logs with correlation IDs and no secrets\n- Specific exception handling, timeouts, limited retries, and exit codes\n- A way to run the script again safely without causing duplicate side effects\n- Unit and integration tests, linting, typing, and security scans\n- Pinned dependencies and reproducible packaging\n- An identity with only the access it needs, and secrets kept outside the code\n- Metrics, alerts, and a documented runbook',
      "I test the happy path, invalid input, a dependency being down, partial failure, retries, and running the script twice in a row. A script isn't production-ready just because it worked once on a laptop. Someone else needs to be able to run it, watch it, stop it, and recover from a failure safely.",
    ],
    followUps: [
      'How do you make a script idempotent when it creates cloud resources?',
      'What would you put in the runbook for this script?',
    ],
    tags: ['python', 'production', 'automation'],
  },
  {
    id: 'itv-mypy-11',
    level: 'advanced',
    kind: 'open',
    prompt: 'How do you schedule Python automation?',
    probing:
      'Whether you pick a scheduler by runtime and ownership, and design for overlap, reruns, time zones and secrets.',
    answer: [
      'The right choice depends on runtime, retry needs, environment, and who owns operating it. Options include cron or systemd timers, GitHub Actions or Azure Pipelines schedules, Kubernetes CronJobs, Azure Functions timers, and workflow orchestrators.',
      'For a Kubernetes CronJob, I set the concurrency policy, deadlines, history limits, resource requests, and failure alerts. Whatever the scheduler, the script must be safe to run more than once, and it needs a distributed lock if overlapping runs would cause problems.',
      'I record the start and end time, how many items were processed, the result, and a correlation ID. I test missed schedules, timeouts, partial failures, retries, daylight-saving and time-zone behavior, and manual reruns.',
      'Secrets come from workload identity or a secret manager, never from the schedule definition itself.',
    ],
    followUps: [
      'Which CronJob concurrencyPolicy would you choose for a job that must never overlap?',
      'How would you implement a distributed lock for overlapping runs?',
    ],
    tags: ['python', 'scheduling', 'cronjob'],
  },
  {
    id: 'itv-mypy-12',
    level: 'intermediate',
    kind: 'open',
    prompt: 'How do you create API endpoints and call another API using FastAPI?',
    probing:
      'Whether you know FastAPI basics (Pydantic validation, OpenAPI docs, ASGI) and avoid blocking the event loop on outbound calls.',
    answer: [
      'FastAPI is a Python framework for building HTTP APIs. Type hints and Pydantic models validate input and automatically generate an OpenAPI schema plus interactive docs.',
      'During development I run it with an ASGI server, for example `uvicorn main:app --reload`, and check `/docs`. Production also needs authentication and authorization, input and output models, request IDs, structured logs, metrics, rate limits, dependency timeouts, tests, and a proper deployment setup.',
      "For an outbound call from an async endpoint, I use an async client so it doesn't block the event loop.",
      "In a busy service, I reuse one client across the app's lifetime instead of opening a fresh connection pool for every request. Retries stay limited, and only used for calls that are safe to repeat.",
    ],
    code: [
      {
        title: 'FastAPI endpoints with a Pydantic model',
        language: 'python',
        code: `from fastapi import FastAPI, HTTPException
from pydantic import BaseModel

app = FastAPI()


class Item(BaseModel):
    name: str
    quantity: int


@app.get("/health")
async def health() -> dict[str, str]:
    return {"status": "healthy"}


@app.post("/items", status_code=201)
async def create_item(item: Item) -> dict[str, object]:
    if item.quantity < 1:
        raise HTTPException(status_code=400, detail="quantity must be positive")
    return {"message": "item created", "item": item.model_dump()}`,
      },
      {
        title: 'Calling an upstream API with httpx',
        language: 'python',
        code: `import httpx
from fastapi import HTTPException


@app.get("/external-status")
async def external_status() -> dict:
    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            response = await client.get("https://api.example.com/status")
            response.raise_for_status()
            return response.json()
    except httpx.TimeoutException as exc:
        raise HTTPException(status_code=504, detail="upstream timed out") from exc
    except httpx.HTTPError as exc:
        raise HTTPException(status_code=502, detail="upstream request failed") from exc`,
      },
    ],
    tags: ['python', 'fastapi', 'rest api'],
  },
  {
    id: 'itv-mypy-13',
    level: 'advanced',
    kind: 'open',
    prompt: 'How do you fetch JSON data and query it efficiently?',
    probing:
      'Whether you validate API responses and choose the right data structure or store for repeated lookups at scale.',
    answer: [
      'I fetch with a timeout, check the HTTP status and the JSON structure, then pick a query approach based on the data size and how it will be accessed.',
      "Scanning a large list over and over is wasteful. If I'm going to look things up by the same key repeatedly, I build an index once.",
      'I handle pagination and rate limits, and I never assume that because JSON is valid, it also matches the schema I expect. For very large responses, I ask the server to filter or paginate, or use a streaming JSON parser instead of loading the entire body at once.',
      'If queries get complicated or run often against a lot of data, I move the records into a proper database with indexes instead of treating a JSON file like one. Authentication tokens stay short-lived and never get logged.',
    ],
    code: [
      {
        title: 'Fetch and filter active users',
        language: 'python',
        code: `import requests


def fetch_active_users(url: str) -> list[dict]:
    response = requests.get(url, timeout=(3, 10))
    response.raise_for_status()
    payload = response.json()

    users = payload.get("users")
    if not isinstance(users, list):
        raise ValueError("Response must contain a users list")

    return [
        user
        for user in users
        if isinstance(user, dict) and user.get("active") is True
    ]`,
      },
      {
        title: 'Index once for O(1) lookups',
        language: 'python',
        code: `users_by_id = {user["id"]: user for user in active_users}
requested_user = users_by_id.get(123)  # Average O(1) lookup`,
      },
    ],
    followUps: [
      'How would you handle cursor-based pagination and rate limiting in this fetch?',
      'At what point would you move this data into a database?',
    ],
    tags: ['python', 'json', 'performance'],
  },
]
