import type { InterviewQuestion } from '../../../types'

const DEPLOY_STRATEGY_APPROACH = [
  'I deploy a fixed artifact (its contents never change once built) using a strategy that matches the risk: rolling for routine stateless changes, canary when I want to check metrics on a small slice of traffic, or blue-green when I need a fast traffic switch.',
  'The pipeline runs prechecks, deploys to a small or zero-traffic target, runs readiness and business smoke tests, then advances while watching error rate, latency, saturation, and the SLO/error budget.',
  "If any threshold fails, it stops traffic and rolls back to the previous artifact or config. Database changes use an expand-and-contract approach, since an application rollback can't undo a destructive schema change. I verify recovery, record what happened, and improve whatever test or guard should have caught the problem earlier.",
]

/** Databases, SQL, and hands-on coding challenges. */
export const myGeneralDataCodeQuestions: InterviewQuestion[] = [
  {
    id: 'itv-mygen-48',
    level: 'advanced',
    kind: 'scenario',
    prompt:
      'An application cannot connect to its database. What do you check first and how do you investigate?',
    probing: 'Classifying the error type and testing each layer from the affected runtime.',
    answer: [
      'First I pin down the exact client, database endpoint, port, environment, error message, and when it started. "Connection refused," a timeout, a TLS error, an authentication failure, and pool exhaustion are all different problems with different causes.',
      "From the affected runtime, I test DNS, routing, TCP, and TLS, then connect with a safe database client using the same identity, if that's approved. I never print the password or expose the database publicly to test it.",
      "I check the app's connection-string source and secret version, the certificate/CA and hostname, security-group/firewall/NetworkPolicy rules, any proxy or private endpoint, whether the database listener is up, the user's status/expiry/permissions, max connections, pool settings, replication/failover state, and any recent deploy, schema, network, or credential change. I correlate database and application logs by timestamp and connection source.",
      "Then I fix whatever layer I've actually confirmed is broken: DNS/routing, the listener, a secret that didn't rotate properly, a certificate, an account, a connection leak or pool issue, or the database's own health. I verify with a real read/write transaction, check latency, confirm the pool recovers, confirm unauthorized access is still denied, and check failover.",
      'To prevent it happening again: managed identity or properly rotated secrets, private connectivity, TLS, pool metrics, connection SLOs, and testing credential and failover changes before they ship.',
    ],
    followUps: ['How do you tell pool exhaustion from a network timeout?'],
    tags: ['database', 'connectivity', 'troubleshooting'],
  },
  {
    id: 'itv-mygen-49',
    level: 'basic',
    kind: 'open',
    prompt: 'Write a SQL query to find the fifth-highest salary.',
    probing: 'Window functions and clarifying distinct versus row-based ranking.',
    answer: [
      'For the fifth **distinct** salary, use a window function.',
      "`DENSE_RANK` treats equal salaries as one rank. If the question actually means the fifth row after sorting instead, use `ROW_NUMBER`. Either way, clarify what's meant and make sure the query is indexed and limited properly on a large table.",
    ],
    code: [
      {
        title: 'Fifth-highest distinct salary',
        language: 'text',
        code: `SELECT salary
FROM (
  SELECT salary, DENSE_RANK() OVER (ORDER BY salary DESC) AS salary_rank
  FROM Employee
) ranked
WHERE salary_rank = 5;`,
      },
    ],
    tags: ['sql', 'database'],
  },
  {
    id: 'itv-mygen-50',
    level: 'basic',
    kind: 'open',
    prompt: 'What is the difference between clustered and non-clustered indexes?',
    probing: 'Storage structure and the write cost of indexes.',
    answer: [
      "A clustered index determines the physical, ordered storage of the table's rows, so a table normally has only one. A non-clustered index is a separate structure holding the indexed keys plus a pointer to the row (or some included columns) — a table can have several of these.",
      'Indexes speed up specific read patterns, but they cost extra on writes, storage, and maintenance. I choose which columns to index based on real query plans and how many distinct values a column has, not by just indexing everything.',
    ],
    tags: ['sql', 'database', 'indexes'],
  },
  {
    id: 'itv-mygen-51',
    level: 'advanced',
    kind: 'scenario',
    prompt: 'A database partition is full and the production application is down. What do you do?',
    probing: 'Safe capacity recovery without deleting unknown files.',
    answer: [
      'I declare the incident, confirm the filesystem or tablespace is actually full and how customers are affected, stop non-essential writes or shift traffic if the runbook allows it, and make sure backups and evidence are protected.',
      "I figure out what's actually growing — logs, temporary data, a runaway job, a retention failure, WAL/binlogs, an index rebuild, or a data load — then use the approved path to add capacity, archive or purge only data I've confirmed is safe to remove, or fail over.",
      "I never delete a database file I don't recognize. Once it's fixed, I validate transactions and replication, then fix the retention and capacity alerts, growth forecasting, and whatever workload actually caused it.",
    ],
    followUps: ['Why is deleting WAL or binlog files by hand dangerous?'],
    tags: ['database', 'incident', 'storage'],
  },
  {
    id: 'itv-mygen-52',
    level: 'advanced',
    kind: 'scenario',
    prompt: 'How do you investigate a slow SQL query?',
    probing:
      'Evidence-first performance tuning with execution plans and safe rollout of index changes.',
    answer: [
      'I capture the exact query (or its fingerprint), the parameters, how often it runs, its latency distribution, how many rows it returns, any timeout, and the overall database load.',
      'I compare against a normal period and check for blocking/locks, how saturated the connection pool is, CPU, memory, storage I/O, cache hit rate, replication lag, and any recent schema, statistics, or deployment change.',
      "The database's execution plan (`EXPLAIN` or the platform's equivalent) shows scans, join order, estimated versus actual row counts, sorting, spills to disk, and whether indexes are actually being used.",
      "I check whether the filters are selective enough, whether data types match, whether a function in the query is blocking index use, whether it's returning too many rows or columns, or whether the application is calling the query repeatedly in an N+1 pattern.",
      'Possible fixes: a carefully designed index, rewriting the query, refreshing statistics, pagination or batching, cutting down the result set, fixing the connection pool, caching, partitioning, or changing the data model.',
      'Every index adds cost on writes and storage, so I test with production-like data, check locks and plan stability, roll it out gradually, and measure both query and application latency afterward. I always keep a rollback plan for schema or index changes, and I never kill a session or add an index blindly without checking the impact first.',
    ],
    followUps: ['What does a big gap between estimated and actual rows in a plan tell you?'],
    tags: ['sql', 'performance', 'database'],
  },
  {
    id: 'itv-mygen-53',
    level: 'advanced',
    kind: 'open',
    prompt: 'How do you roll back failed database migrations in CI/CD?',
    probing: 'Knowing that app rollback cannot undo destructive schema changes.',
    answer: [
      '**Short answer:** use a version-controlled migration tool (Liquibase/Flyway), write rollback scripts, and trigger a rollback step in the pipeline.',
      ...DEPLOY_STRATEGY_APPROACH,
    ],
    followUps: ['Why is rolling forward often safer than a down migration?'],
    tags: ['database', 'migrations', 'ci/cd'],
  },
  {
    id: 'itv-mygen-54',
    level: 'intermediate',
    kind: 'open',
    prompt: 'How do you manage database schema changes in CI/CD pipelines?',
    probing: 'Expand-and-contract, migration locks and backward compatibility.',
    answer: [
      '**Short answer:** use Liquibase or Flyway migration scripts, run them as a pipeline step, and make sure changes stay backward-compatible.',
      'Database changes go through versioned migrations that stay compatible with the previous version.',
      'I back up the database and test the restore, measure table size and lock behavior, and use an expand-and-contract approach: add new nullable structures, deploy code that supports both the old and new versions, backfill data in limited batches, switch reads and writes over, then remove the old structures in a later release.',
      'The pipeline uses a migration lock, a timeout, monitoring, and a single authorized runner. Rolling back usually means rolling forward with a corrective migration, or switching to compatible application code — a destructive "down" script can lose data.',
      'For blue-green databases, I replicate continuously, keep a single writer at a time, validate lag and data, cut connections over gradually, and keep the old side around for an agreed rollback window.',
    ],
    tags: ['database', 'migrations', 'ci/cd'],
  },
  {
    id: 'itv-mygen-55',
    level: 'advanced',
    kind: 'open',
    prompt: 'How do you manage blue-green deployment for databases?',
    probing: 'Replication, single-writer discipline and validation before retiring blue.',
    answer: [
      '**Short answer:** use database replication or a shadow database, apply schema changes to the green database, switch application traffic over, and validate before retiring the blue database.',
      ...DEPLOY_STRATEGY_APPROACH,
    ],
    followUps: ['How do you handle writes that land on blue during the switch?'],
    tags: ['database', 'blue-green', 'deployments'],
  },
  {
    id: 'itv-mygen-56',
    level: 'intermediate',
    kind: 'open',
    prompt: 'How do you handle database credential rotation in CI/CD pipelines?',
    probing: 'Runtime secret retrieval and apps that re-read rotated credentials.',
    answer: [
      '**Short answer:**\n- Store database credentials in Secret Manager or Key Vault.\n- Fetch secrets at runtime in the pipeline.\n- Use Kubernetes Secrets (not ConfigMaps) or an external secrets integration to deliver them to workloads.\n- Automate the rotation, and make sure apps re-read from secret storage instead of caching credentials forever.',
      'Secrets belong in Vault, Key Vault, Secret Manager, or the CI credential store — never in Git, YAML, images, command arguments, or artifacts. Jobs get a short-lived identity and fetch only the secret they need for that stage. Masking is a backup control, since an encoded or transformed value can still leak.',
      "Rotation works with an overlap: issue the new value, update consumers, verify it works, revoke the old value, and audit for failures. If a scan finds a committed secret, I revoke it right away, check how it was used, remove it from active history where appropriate, and rotate anything downstream that trusted it — just deleting the line isn't enough.",
      'Pre-commit and server-side scans, protected logs, minimal access, expiry, and rotation tests all help prevent it from happening again.',
    ],
    tags: ['database', 'secrets', 'rotation'],
  },
  {
    id: 'itv-mygen-57',
    level: 'advanced',
    kind: 'open',
    prompt: 'How do you perform a zero-downtime database migration in CI/CD?',
    probing: 'Expand-and-contract in detail, with resumable backfills and monitoring.',
    answer: [
      '**Short answer:** use Liquibase/Flyway migration scripts, apply backward-compatible schema changes first, deploy the app, and only apply destructive changes later.',
      'I use an expand-and-contract migration. First I take and test a backup, measure table size and lock behavior, and add backward-compatible columns, tables, or indexes without removing anything the old application still needs.',
      'I deploy code that works with both the old and new schema, backfill data in small batches that can safely resume if interrupted, and monitor locks, replication lag, latency, and errors, then switch reads and writes over. Only once every old version of the application is gone do I remove the old schema, in a later release.',
      'The pipeline uses a migration lock, a timeout, a named owner, and a verification query. Rolling back usually means switching to compatible application behavior, or rolling forward with a corrective migration — reversing a destructive migration can lose data.',
    ],
    followUps: ['Walk me through renaming a column with zero downtime.'],
    tags: ['database', 'migrations', 'zero downtime'],
  },
  {
    id: 'itv-mygen-58',
    level: 'intermediate',
    kind: 'open',
    prompt:
      'Write a shell script for log rotation and system cleanup with error handling and notifications.',
    probing: 'Safe Bash: strict mode, traps, idempotency and notifications.',
    answer: [
      'Key elements to demonstrate are strict mode, an error trap that notifies, compress-then-expire logic, and a summary notification.',
      'Talk about: `set -euo pipefail`, `trap ... ERR` for error handling, making the script safe to rerun, using `logrotate` in real setups, and Slack/email notification. Mention scheduling via cron or a systemd timer.',
    ],
    code: [
      {
        title: 'log-cleanup.sh',
        language: 'bash',
        code: `#!/usr/bin/env bash
set -euo pipefail                      # fail fast, catch undefined vars, pipe failures
LOG_DIR="/var/log/myapp"; RETENTION_DAYS=14; SLACK_WEBHOOK="\${SLACK_WEBHOOK:-}"

notify() { [[ -n "$SLACK_WEBHOOK" ]] && curl -sf -X POST -d "{\\"text\\":\\"$1\\"}" "$SLACK_WEBHOOK" || true; }
trap 'notify "❌ log-cleanup failed at line $LINENO"' ERR

# rotate + compress logs older than 1 day
find "$LOG_DIR" -type f -name '*.log' -mtime +1 -exec gzip {} \\;
# delete archives older than retention
deleted=$(find "$LOG_DIR" -type f -name '*.gz' -mtime +"$RETENTION_DAYS" -print -delete | wc -l)
# clean tmp + old cache
find /tmp -type f -atime +7 -delete
notify "✅ log-cleanup done: removed $deleted old archives, disk now $(df -h / | awk 'NR==2{print $5}')"`,
      },
    ],
    tags: ['bash', 'coding', 'automation'],
  },
  {
    id: 'itv-mygen-59',
    level: 'intermediate',
    kind: 'open',
    prompt: 'Write Python to parse and analyze AWS CloudWatch metrics with a visualization.',
    probing: 'boto3 usage, credentials, pagination and analysis libraries.',
    answer: [
      'Key elements: a boto3 CloudWatch client, a 24-hour `get_metric_statistics` call, sorting datapoints by timestamp, and plotting with matplotlib.',
      'Discuss: boto3 client + credentials (IAM role/OIDC), pagination for large ranges, pandas for analysis (rolling averages, anomaly detection), matplotlib/plotly for viz, and error handling.',
    ],
    code: [
      {
        title: 'CloudWatch CPU plot',
        language: 'python',
        code: `import boto3, datetime as dt
import matplotlib.pyplot as plt

cw = boto3.client("cloudwatch")
resp = cw.get_metric_statistics(
    Namespace="AWS/EC2", MetricName="CPUUtilization",
    Dimensions=[{"Name": "InstanceId", "Value": "i-0abc123"}],
    StartTime=dt.datetime.utcnow() - dt.timedelta(hours=24),
    EndTime=dt.datetime.utcnow(),
    Period=300, Statistics=["Average", "Maximum"],
)
points = sorted(resp["Datapoints"], key=lambda d: d["Timestamp"])
times = [p["Timestamp"] for p in points]
avg   = [p["Average"] for p in points]

plt.plot(times, avg, label="Avg CPU %")
plt.xlabel("Time"); plt.ylabel("CPU %"); plt.legend(); plt.title("EC2 CPU (24h)")
plt.tight_layout(); plt.savefig("cpu.png")`,
      },
    ],
    tags: ['python', 'aws', 'coding', 'cloudwatch'],
  },
  {
    id: 'itv-mygen-60',
    level: 'basic',
    kind: 'open',
    prompt: 'Explain list comprehensions in Python and optimize a snippet.',
    probing: 'Comprehensions versus loops, and generators for memory efficiency.',
    answer: [
      "A **list comprehension** is a short, faster way to build a list: `[f(x) for x in it if cond]`. It's faster than a `for`-loop with `.append()` because the iteration and appending happen in C under the hood. Variants: set `{}`, dict `{k:v}`, and a **generator** `( … )`, which is lazy and doesn't build the whole list in memory — good for large or streamed data.",
      'Other tips: use generators for large data, `sum()`/`any()`/`map` built-ins, avoid repeated attribute lookups in loops, and profile before optimizing.',
    ],
    code: [
      {
        title: 'Optimization example',
        language: 'python',
        code: `# slower
result = []
for x in range(1000000):
    if x % 2 == 0:
        result.append(x * x)
# faster (comprehension)
result = [x * x for x in range(1000000) if x % 2 == 0]
# best if you only iterate once (no full list in memory)
result = (x * x for x in range(1000000) if x % 2 == 0)`,
      },
    ],
    tags: ['python', 'coding'],
  },
  {
    id: 'itv-mygen-61',
    level: 'intermediate',
    kind: 'open',
    prompt: 'In a coding round, how do you approach writing a Terraform multi-tier module?',
    probing: 'Module structure and state design for a layered environment.',
    answer: [
      'This is the same question as the Terraform multi-tier module question in the Terraform notes (§6.6).',
      'Cover module structure, remote state + locking, layered state, tiered networking, inputs/outputs, and scanning.',
    ],
    tags: ['terraform', 'coding', 'modules'],
  },
]
