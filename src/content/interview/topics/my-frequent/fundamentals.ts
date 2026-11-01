import type { InterviewQuestion } from '../../../types'

/** Azure and platform fundamentals: VMs vs containers, Pod IPs, Entra ID, AI services, SQL. */
export const myFrequentFundamentalsQuestions: InterviewQuestion[] = [
  {
    id: 'itv-myfaq-321',
    level: 'basic',
    kind: 'open',
    prompt: 'What is the difference between a VM and a container?',
    probing:
      'Hardware versus OS virtualization, the shared kernel, and when each one is the right choice.',
    answer: [
      "A **VM** virtualizes the **hardware**. Each VM has its own full operating system. A **container** virtualizes the **operating system**. All containers on a host share the host's kernel and package only the app and its libraries.",
      '- **What is virtualized:** VM - hardware; container - operating system.\n- **Operating system:** VM - own guest OS; container - shares the host kernel.\n- **Size:** VM - gigabytes; container - megabytes.\n- **Start time:** VM - minutes; container - seconds or less.\n- **Isolation:** VM - strong (separate kernel); container - lighter (namespaces and cgroups).\n- **OS mix:** VM - any OS on any host; container - Linux containers need a Linux kernel, Windows containers need Windows.\n- **Managed by:** VM - hypervisor; container - container runtime, usually orchestrated by Kubernetes.',
      '**When I use which:**',
      '- **VMs:** legacy apps that need a full OS, Windows services, software that needs kernel changes, or workloads that need strong isolation. In Azure: Virtual Machines and VM Scale Sets.\n- **Containers:** microservices, CI build agents, apps that need fast scaling and the same image in every environment. In Azure: AKS, Container Apps, App Service for containers, ACI.',
      '**In one line:** "A VM carries its own operating system, so it is heavier but more isolated. A container shares the host kernel, so it is small and starts in seconds. In my work, AKS nodes are VMs and the applications run as containers on them."',
    ],
    deeper: [
      'Containers usually run **on** VMs. In AKS, every node is a VM, and Pods run on those VMs.',
      'Containers start fast because there is no OS to boot. The process starts directly on the shared kernel.',
      'When a container needs stronger isolation, AKS **Pod Sandboxing** (Kata Containers) gives each Pod its own lightweight VM kernel.',
    ],
    code: [
      {
        title: 'VM and container stacks',
        language: 'text',
        code: `VM                                  Container
--------------------------          --------------------------
App A      | App B                  App A      | App B
Libraries  | Libraries              Libraries  | Libraries
Guest OS   | Guest OS               Container runtime (containerd)
Hypervisor (Hyper-V, KVM)           Host OS kernel (shared)
Physical server                     Host OS
                                    Physical server or VM`,
      },
    ],
    diagrams: [
      {
        kind: 'nested',
        title: 'Containers run on VMs in AKS',
        caption: 'Each AKS node is a VM with its own kernel; Pods on it share that kernel.',
        root: {
          label: 'Physical server',
          children: [
            {
              label: 'AKS node (VM, own guest OS)',
              children: [
                { label: 'Pod A', detail: 'shares the node kernel' },
                { label: 'Pod B', detail: 'shares the node kernel' },
              ],
            },
          ],
        },
      },
    ],
    tags: ['containers', 'vm', 'fundamentals'],
  },
  {
    id: 'itv-myfaq-322',
    level: 'intermediate',
    kind: 'open',
    prompt: 'Are Pod IPs static or dynamic? What are static and dynamic IPs for Pods?',
    probing:
      'That Pod IPs are dynamic, and which Kubernetes or Azure object gives a stable address for each need.',
    answer: [
      'Pod IPs are **dynamic**. When a Pod is deleted or rescheduled, the new Pod usually gets a new IP. So applications must never depend on a Pod IP.',
      'What I use instead, depending on what needs to stay stable:',
      '- **A stable address for a group of Pods inside the cluster:** **Service** (ClusterIP and DNS name such as `orders.orders.svc.cluster.local`).\n- **A stable name for each Pod (databases, Kafka):** **StatefulSet + headless Service**: `kafka-0.kafka.ns.svc.cluster.local`. The name is stable, but the IP can still change.\n- **A fixed public or private IP for incoming traffic:** **LoadBalancer Service** with a pre-created static IP in Azure, or Application Gateway / Ingress with a static IP.\n- **A fixed outbound IP (a partner allows only one IP):** **NAT Gateway** or a static outbound IP on the AKS load balancer. All Pods leave through it.',
      'The example LoadBalancer Service uses a static public IP created beforehand.',
    ],
    deeper: [
      'Where the Pod IP comes from depends on the network plugin. With **Azure CNI Overlay**, Pods get IPs from a private overlay range. With classic **Azure CNI**, Pods get IPs directly from the VNet subnet, so the subnet must be large enough.',
      '`spec.loadBalancerIP` is deprecated. Use the Azure annotations shown in the example.',
      'Firewalls and NSGs should never allow single Pod IPs. Allow the subnet, the Service, or the NAT Gateway IP.',
    ],
    code: [
      {
        title: 'Pod IP changes after a restart',
        language: 'text',
        code: `Before:  orders-7f9c-abcde  -> 10.244.1.6
Pod restarts on another node
After:   orders-7f9c-xyz12  -> 10.244.2.10`,
      },
      {
        title: 'LoadBalancer Service with a static public IP',
        language: 'yaml',
        code: `apiVersion: v1
kind: Service
metadata:
  name: orders-public
  annotations:
    service.beta.kubernetes.io/azure-pip-name: pip-orders-prod
    service.beta.kubernetes.io/azure-load-balancer-resource-group: rg-network-prod
spec:
  type: LoadBalancer
  selector:
    app: orders
  ports:
    - port: 443
      targetPort: 8443`,
      },
    ],
    diagrams: [
      {
        kind: 'decision',
        title: 'What to use instead of a Pod IP',
        question: 'What needs to stay stable?',
        branches: [
          { condition: 'Address for a group of Pods', result: 'Service (ClusterIP + DNS)' },
          { condition: 'Name for each Pod', result: 'StatefulSet + headless Service' },
          { condition: 'Fixed inbound IP', result: 'LoadBalancer with static IP' },
          { condition: 'Fixed outbound IP', result: 'NAT Gateway', tone: 'accent' },
        ],
      },
    ],
    tags: ['kubernetes', 'networking', 'aks'],
  },
  {
    id: 'itv-myfaq-323',
    level: 'basic',
    kind: 'open',
    prompt: 'Give a brief on Azure Batch, Microsoft Entra ID, and Azure Monitor.',
    probing:
      'A one-line definition and a realistic example for each service, plus when not to use Batch.',
    answer: [
      '- **Azure Batch:** runs large parallel or HPC jobs on a pool of VMs that Azure creates, scales, and removes for you. Example: render thousands of video frames, run simulations, process millions of files overnight.\n- **Microsoft Entra ID** (formerly Azure AD): cloud identity and access service - users, groups, apps, sign-in, MFA, Conditional Access, managed identities. Example: engineers sign in with MFA; a pipeline logs in to Azure with workload identity federation.\n- **Azure Monitor:** collects metrics and logs from Azure resources and apps, and alerts on them. Example: CPU alert on a VM Scale Set, KQL alert on failed backup jobs, Application Insights for app performance.',
      '**Azure Batch in a little more detail.** I create a Batch account, create a pool (VM size, OS image, autoscale formula, Spot VMs to save cost), and submit a job with many tasks. Batch spreads the tasks across the pool VMs, results are written to Blob Storage, and the pool scales down to zero when the work is done. When not to use Batch: for small or container-based jobs, **Container Apps jobs**, **AKS Jobs**, or **Azure Functions** are often simpler.',
      '**Microsoft Entra ID in a little more detail:**',
      '- **Authentication:** who are you (password, MFA, passkey, certificate, federated token).\n- **Authorization for Azure resources:** Azure RBAC roles assigned to Entra ID users, groups, and identities.\n- **Identities for workloads:** app registrations, service principals, and managed identities, so apps and pipelines do not need stored passwords.\n- **Security controls:** Conditional Access (for example, block sign-in from unknown countries), Privileged Identity Management (just-in-time admin access).',
      '**Azure Monitor in a little more detail:** metrics go to Azure Monitor Metrics, logs to a Log Analytics workspace, application telemetry to Application Insights (stored in Log Analytics), and AKS Prometheus metrics to an Azure Monitor workspace. All of them feed alert rules, which call Action Groups for email, Teams, or on-call.',
    ],
    code: [
      {
        title: 'Azure Batch flow',
        language: 'text',
        code: `Create a Batch account
-> create a pool (VM size, OS image, autoscale formula, Spot VMs to save cost)
-> submit a job with many tasks
-> Batch spreads the tasks across the pool VMs
-> results are written to Blob Storage
-> the pool scales down to zero when the work is done`,
      },
      {
        title: 'Azure Monitor data paths',
        language: 'text',
        code: `Metrics (numbers over time)       -> Azure Monitor Metrics
Logs (events, KQL)                -> Log Analytics workspace
Application telemetry             -> Application Insights (stored in Log Analytics)
Prometheus metrics (AKS)          -> Azure Monitor workspace
All of the above                  -> alert rules -> Action Groups -> email, Teams, on-call`,
      },
    ],
    tags: ['azure batch', 'entra id', 'azure monitor', 'fundamentals'],
  },
  {
    id: 'itv-myfaq-324',
    level: 'advanced',
    kind: 'open',
    prompt:
      'What is the difference between Microsoft Entra ID, an app registration, and a service principal?',
    probing:
      'Directory vs app definition vs identity-in-a-tenant, where roles actually land, and choosing managed identity or federation over secrets.',
    answer: [
      "**Entra ID** is the whole identity service, the directory. An **app registration** is one application's **definition** inside it. A **service principal** is that application's **identity in a tenant**, and it is what gets permissions.",
      '- **Microsoft Entra ID:** the identity service for users, groups, and apps. Example: the company tenant.\n- **App registration:** the global definition of an app - client ID, secrets or certificates, federated credentials, redirect URIs, API permissions. Example: "deploy-pipeline" registered by the platform team.\n- **Service principal (enterprise application):** the app\'s instance in a tenant. Roles and sign-in logs belong to it. Example: the identity that gets Contributor on a resource group.\n- **Managed identity:** a special service principal that Azure creates and rotates for you. No app registration and no secret to manage. Example: a Function App reading Key Vault.',
      '**Which one I choose:** if the code runs inside Azure (VM, AKS, App Service, Functions), I use a managed identity. If not, and it is a pipeline that supports OIDC (Azure DevOps, GitHub Actions, GitLab), I use an app registration (or user-assigned managed identity) with a federated credential and no secret. Otherwise, an app registration with a certificate or secret stored in Key Vault and rotated.',
    ],
    deeper: [
      'Roles are given to the **service principal**, not to the app registration.',
      'An **API permission** (for example Microsoft Graph `User.Read.All`) is different from an **Azure RBAC role** (for example Contributor). One is access to an API, the other is access to Azure resources.',
      'A client secret has an expiry date. Expired secrets are a common cause of pipelines suddenly failing with `AADSTS7000222`. Federated credentials avoid this.',
    ],
    code: [
      {
        title: 'How the pieces relate',
        language: 'text',
        code: `Microsoft Entra ID (the tenant / directory)
-> App registration "deploy-pipeline"   (the blueprint: client ID, credentials, API permissions)
   -> Service principal                 (the identity that signs in and gets roles)
      -> Azure RBAC role, for example Contributor on rg-app-prod`,
      },
      {
        title: 'Which one I choose',
        language: 'text',
        code: `Does the code run inside Azure (VM, AKS, App Service, Functions)?
  yes -> managed identity
  no  -> is it a pipeline that supports OIDC (Azure DevOps, GitHub Actions, GitLab)?
           yes -> app registration (or user-assigned managed identity) + federated credential, no secret
           no  -> app registration + certificate or secret stored in Key Vault, rotated`,
      },
    ],
    diagrams: [
      {
        kind: 'decision',
        title: 'Choosing a workload identity',
        question: 'Where does the code run?',
        branches: [
          { condition: 'Inside Azure', result: 'Managed identity', tone: 'success' },
          {
            condition: 'Pipeline with OIDC support',
            result: 'Federated credential, no secret',
            tone: 'accent',
          },
          {
            condition: 'Anything else',
            result: 'App registration + cert or secret',
            detail: 'stored in Key Vault, rotated',
            tone: 'warning',
          },
        ],
      },
    ],
    followUps: [
      'A pipeline suddenly fails with AADSTS7000222. What happened and how do you prevent it?',
      'What is the difference between a Graph API permission and an Azure RBAC role?',
    ],
    tags: ['entra id', 'identity', 'service principal', 'managed identity'],
  },
  {
    id: 'itv-myfaq-325',
    level: 'basic',
    kind: 'mcq',
    prompt: 'In Microsoft Entra ID, which object actually receives Azure RBAC roles?',
    options: [
      { id: 'a', text: 'The app registration' },
      { id: 'b', text: 'The service principal (enterprise application)' },
      { id: 'c', text: 'The client secret of the application' },
      { id: 'd', text: 'The Microsoft Graph API permission' },
    ],
    correct: ['b'],
    probing:
      'Whether you know that roles land on the identity in the tenant, not on the definition.',
    answer: [
      "Roles are given to the **service principal**, not to the app registration. The registration is the app's definition; the service principal is its identity in the tenant and receives the roles.",
      'A client secret is only a credential for signing in, and a Graph API permission is access to an API, not access to Azure resources.',
    ],
    tags: ['entra id', 'service principal', 'rbac'],
  },
  {
    id: 'itv-myfaq-326',
    level: 'intermediate',
    kind: 'open',
    prompt: 'Have you used AI services in Azure? What are they?',
    probing:
      'Honesty about hands-on experience, knowing the main services, and how a DevOps engineer would run them securely.',
    answer: [
      'Be honest here. If you have only explored them, say so, and explain how you would use and secure them as a DevOps engineer.',
      '- **Azure OpenAI** (Foundry Models): GPT and embedding models behind a private Azure endpoint. Example: chat assistant, summarizing logs, explaining Terraform plans.\n- **Microsoft Foundry** (formerly Azure AI Foundry): platform to build, evaluate, deploy, and monitor AI apps and agents. Example: an internal support assistant.\n- **Azure AI Search:** search and vector search over company documents, used for RAG. Example: a chatbot that answers from runbooks and wiki pages.\n- **Document Intelligence:** extracts text, fields, and tables from PDFs and forms. Example: reading invoices.\n- **Vision, Speech, Language:** images and OCR; speech to text and back; sentiment, PII detection, summarization. Example: masking personal data in text.',
      '**A DevOps use case:** when a pipeline fails, a final step collects the error log, masks secrets and personal data, and sends the log to Azure OpenAI over a private endpoint using a managed identity. The model returns a short root cause and a suggested fix, and the summary is posted to Teams or added to the work item.',
      '**How I would run it securely:**',
      '- Create the resource and model deployment with Terraform or Bicep, like any other infrastructure.\n- Turn off public network access and use a **private endpoint**.\n- Use **managed identity** with the **Cognitive Services OpenAI User** role instead of API keys.\n- Never send passwords, tokens, or customer data to the model. Mask them first.\n- Watch token quotas and cost in Azure Monitor, and set budgets.\n- A person reviews the AI suggestion before anything changes in production.',
    ],
    code: [
      {
        title: 'Pipeline failure summary with Azure OpenAI',
        language: 'text',
        code: `Pipeline fails
-> a final step collects the error log
-> secrets and personal data are masked
-> the log is sent to Azure OpenAI over a private endpoint, using a managed identity
-> the model returns a short root cause and a suggested fix
-> the summary is posted to Teams or added to the work item`,
      },
    ],
    diagrams: [
      {
        kind: 'flow',
        title: 'AI summary of a failed pipeline',
        caption: 'Mask first, call the model privately, and keep a person in the loop.',
        nodes: [
          { label: 'Pipeline fails', tone: 'danger' },
          { label: 'Collect the error log' },
          { label: 'Mask secrets and personal data', tone: 'warning' },
          { label: 'Azure OpenAI', detail: 'private endpoint, managed identity', tone: 'accent' },
          { label: 'Summary to Teams or work item', tone: 'success' },
        ],
      },
    ],
    tags: ['azure openai', 'ai', 'security'],
  },
  {
    id: 'itv-myfaq-327',
    level: 'basic',
    kind: 'open',
    prompt: 'Which basic SQL queries should a DevOps engineer know? Can you write some?',
    probing:
      'Comfort with filtering, sorting, grouping, joins and safe data changes, plus a common trick question.',
    answer: [
      'I am not a DBA, but I use SQL to check data after deployments, run migrations through the pipeline, and troubleshoot PostgreSQL. The examples use a simple `employees` table.',
      'Always run `UPDATE` and `DELETE` with a `WHERE` clause, and inside a transaction when possible: check the row count, then `COMMIT` or `ROLLBACK`.',
      '- `WHERE` filters rows before grouping. `HAVING` filters after `GROUP BY`.\n- `COUNT(*)` counts rows. `COUNT(column)` skips NULLs.\n- Schema changes go through **migration tools** (Flyway, Liquibase) in the pipeline, not manual SQL in production.',
    ],
    code: [
      {
        title: 'Read and filter',
        language: 'text',
        code: `SELECT * FROM employees;                                    -- all rows (avoid on big tables)

SELECT name, salary FROM employees;                         -- only some columns

SELECT * FROM employees WHERE department = 'IT' AND salary > 50000;

SELECT * FROM employees WHERE department IN ('IT', 'HR');

SELECT * FROM employees WHERE name LIKE 'A%';               -- names starting with A

SELECT * FROM employees WHERE manager_id IS NULL;           -- NULL needs IS NULL, not = NULL`,
      },
      {
        title: 'Sort, limit, and count',
        language: 'text',
        code: `SELECT * FROM employees ORDER BY salary DESC LIMIT 5;       -- top 5 salaries

SELECT DISTINCT department FROM employees;

SELECT COUNT(*) FROM employees WHERE department = 'IT';`,
      },
      {
        title: 'Group',
        language: 'text',
        code: `SELECT department, COUNT(*) AS staff, AVG(salary) AS avg_salary
FROM employees
GROUP BY department
HAVING COUNT(*) > 5                                         -- HAVING filters groups, WHERE filters rows
ORDER BY staff DESC;`,
      },
      {
        title: 'Join two tables',
        language: 'text',
        code: `-- INNER JOIN: only employees that have a matching department
SELECT e.name, d.department_name
FROM employees e
JOIN departments d ON d.id = e.department_id;

-- LEFT JOIN: all employees, even those without a department
SELECT e.name, d.department_name
FROM employees e
LEFT JOIN departments d ON d.id = e.department_id;`,
      },
      {
        title: 'Change data',
        language: 'text',
        code: `INSERT INTO employees (name, department, salary) VALUES ('Ravi', 'IT', 60000);

UPDATE employees SET salary = salary * 1.10 WHERE department = 'IT';

DELETE FROM employees WHERE id = 42;`,
      },
      {
        title: 'Change inside a transaction',
        language: 'text',
        code: `BEGIN;
UPDATE employees SET department = 'Platform' WHERE department = 'DevOps';
-- check the row count, then:
COMMIT;      -- or ROLLBACK;`,
      },
      {
        title: 'Second-highest salary (a common trick question)',
        language: 'text',
        code: `SELECT MAX(salary) FROM employees
WHERE salary < (SELECT MAX(salary) FROM employees);`,
      },
    ],
    tags: ['sql', 'database', 'fundamentals'],
  },
  {
    id: 'itv-myfaq-328',
    level: 'intermediate',
    kind: 'scenario',
    prompt: 'Which PostgreSQL queries do you use for troubleshooting?',
    probing:
      'Checking connections, long-running queries and sizes with system views, and cancelling before terminating.',
    answer: [
      'I use `pg_stat_activity` to see who is connected and what they are running, and group it by state. Too many "idle" connections means a connection leak or no pooling.',
      'For a stuck query I cancel first with `pg_cancel_backend`, and terminate with `pg_terminate_backend` only if cancel does not work. I also check database and table sizes and `max_connections`.',
      'On Azure Database for PostgreSQL Flexible Server, **PgBouncer** is built in. Turn it on when many Pods open many connections.',
    ],
    code: [
      {
        title: 'PostgreSQL queries I use for troubleshooting',
        language: 'text',
        code: `-- Who is connected, and what are they running?
SELECT pid, usename, application_name, client_addr, state, query_start, left(query, 80) AS query
FROM pg_stat_activity
WHERE datname = current_database();

-- How many connections, by state? (too many "idle" = connection leak or no pooling)
SELECT state, COUNT(*) FROM pg_stat_activity GROUP BY state;

-- Queries running longer than 5 minutes
SELECT pid, now() - query_start AS runtime, left(query, 80) AS query
FROM pg_stat_activity
WHERE state = 'active' AND now() - query_start > interval '5 minutes';

-- Stop one stuck query (cancel first; terminate only if cancel does not work)
SELECT pg_cancel_backend(12345);
SELECT pg_terminate_backend(12345);

-- Database and table sizes
SELECT pg_size_pretty(pg_database_size(current_database()));
SELECT relname, pg_size_pretty(pg_total_relation_size(relid)) AS size
FROM pg_catalog.pg_statio_user_tables
ORDER BY pg_total_relation_size(relid) DESC
LIMIT 10;

-- Max connections allowed
SHOW max_connections;`,
      },
    ],
    tags: ['sql', 'postgresql', 'troubleshooting'],
  },
  {
    id: 'itv-myfaq-329',
    level: 'basic',
    kind: 'open',
    prompt:
      'Give quick answers: VM vs container, Pod IPs, Azure Batch, Entra ID and Azure Monitor.',
    probing: 'Crisp one-line answers to the short fundamentals questions that open many rounds.',
    answer: [
      "- **VM vs container?** A VM has its own OS (heavier, stronger isolation); a container shares the host kernel (small, starts in seconds).\n- **Are Pod IPs static?** No. Use a Service or DNS name; StatefulSet + headless Service for stable names; NAT Gateway for a fixed outbound IP.\n- **Azure Batch?** Managed pools of VMs for large parallel jobs; scales up for the job and down after.\n- **Entra ID?** Microsoft's cloud identity service: users, groups, apps, MFA, Conditional Access, managed identities.\n- **Azure Monitor?** Metrics, logs (Log Analytics), Application Insights, and alerts through Action Groups.",
      'Each of these has a longer answer, but in a quick round I give the one line first and expand only if asked.',
    ],
    tags: ['fundamentals', 'quick answers'],
  },
  {
    id: 'itv-myfaq-330',
    level: 'basic',
    kind: 'open',
    prompt:
      'Give quick answers: app registration vs service principal, managed identity, Azure AI services, WHERE vs HAVING, PostgreSQL connections.',
    probing: 'Crisp one-line answers on identity, AI services and SQL basics.',
    answer: [
      "- **App registration vs service principal?** The registration is the app's definition; the service principal is its identity in the tenant and receives the roles.\n- **Managed identity?** A service principal that Azure manages, with no secret, for code running in Azure.\n- **Azure AI services?** Azure OpenAI, Microsoft Foundry, AI Search, Document Intelligence, Vision, Speech, Language. Secure them with private endpoints and managed identity.\n- **WHERE vs HAVING?** WHERE filters rows; HAVING filters groups after GROUP BY.\n- **Check DB connections in PostgreSQL?** `pg_stat_activity`, grouped by state.",
      'Each of these has a longer answer, but in a quick round I give the one line first and expand only if asked.',
    ],
    tags: ['fundamentals', 'quick answers'],
  },
  {
    id: 'itv-myfaq-331',
    level: 'basic',
    kind: 'mcq',
    prompt: 'What is the difference between WHERE and HAVING in SQL?',
    options: [
      { id: 'a', text: 'WHERE filters rows before grouping; HAVING filters groups after GROUP BY' },
      { id: 'b', text: 'HAVING filters rows before grouping; WHERE filters groups after GROUP BY' },
      { id: 'c', text: 'They are identical, HAVING is just an older spelling' },
      { id: 'd', text: 'WHERE works only on numbers, HAVING works only on text' },
    ],
    correct: ['a'],
    probing: 'Whether you know the order in which SQL filters rows and groups.',
    answer: [
      '`WHERE` filters rows before grouping. `HAVING` filters after `GROUP BY`, so it can use aggregates such as `COUNT(*) > 5`.',
      'They are not interchangeable: an aggregate condition cannot go in `WHERE`, and neither clause is limited to a data type.',
    ],
    tags: ['sql', 'fundamentals'],
  },
]
