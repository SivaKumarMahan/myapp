# Azure Learning Hub

An installable, offline-capable study app for Microsoft Azure certifications and Azure / DevOps interviews. It has two sections.

**Certification courses** — three are installed:

- **AZ-900 — Microsoft Azure Fundamentals**
- **AZ-104 — Microsoft Azure Administrator**
- **AZ-400 — Designing and Implementing Microsoft DevOps Solutions**

**Interview preparation** — 2,584 questions in 48 topics, in four sections:

- **My question bank** — 1,605 questions in 22 topics, imported from your own notes (`~/Desktop/github/interview-questions`)
- **Real interview rounds** — 117 questions from Deloitte, ATC, SimCorp, InnovarTech and managerial rounds
- **Azure topics** — 165 questions in 8 topics written for this app
- **DevOps topics** — 697 questions in 13 topics from the original DevOps Learning Hub

**Live site:** https://sivakumarmahan.github.io/myapp/ (after deploying — see below)

Built as a React + TypeScript + Vite Progressive Web App. There is no backend and no tracking: everything runs in your browser, and your progress stays on your device. Opening the app asks for an email address and checks it against a list you control.

> **This is an independent learning tool.** It is not affiliated with, endorsed by or sponsored by Microsoft. Every practice question, lab and mock exam is original material written for this app. None are real exam questions, and no leaked, recalled or "dump" content is used.

---

## What is in it

|                              | AZ-900 | AZ-104 | AZ-400 | Total |
| ---------------------------- | -----: | -----: | -----: | ----: |
| Lessons (each with a lab)    |     13 |     21 |     18 |    52 |
| Exam-bank questions          |     78 |     97 |     95 |   270 |
| In-lesson practice questions |     52 |     87 |     74 |   213 |
| Diagrams                     |     26 |     47 |     36 |   109 |
| Command-reference entries    |     30 |     81 |     56 |   167 |

Every lesson has these sections:

- a plain-language explanation
- why it matters
- how it works, with flow diagrams
- the key Azure resources and properties
- a real-world example
- code examples (Bicep, ARM JSON, pipeline YAML, KQL, PowerShell)
- Azure CLI commands
- the infrastructure-as-code method
- verification and troubleshooting commands
- common mistakes
- exam tips
- a summary
- practice questions with hidden answers
- a hands-on lab with a full solution and cleanup steps

The rest of the app:

- **Mock exams:** timed papers, weighted by domain and scored per domain, with your attempt history saved locally.
- **Search:** covers lessons, resources, commands and questions.
- **Progress tracking:** readiness indicators and JSON export/import.

### Exam weights

Microsoft publishes each skill area as a **range** (for example 20–25%), and a pass is a **scaled score of 700/1000**. A scaled score is not a percentage. The app therefore shows the published ranges on every domain. To weight mock exams it uses the midpoint of each range, rounded so the weights add up to 100. It also sets its own **70% target**. Those two figures are marked in the app as the app's own study aids.

| Course | Skill area (published range → mock-exam weight)                                                                                                            |
| ------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| AZ-900 | Cloud concepts 25–30% → 28 · Architecture & services 35–40% → 38 · Management & governance 30–35% → 34                                                     |
| AZ-104 | Identity & governance 20–25% → 24 · Storage 15–20% → 19 · Compute 20–25% → 24 · Networking 15–20% → 19 · Monitor & maintain 10–15% → 14                    |
| AZ-400 | Processes 10–15% → 13 · Source control 10–15% → 13 · Build & release pipelines 50–55% → 54 · Security & compliance 10–15% → 13 · Instrumentation 5–10% → 7 |

**Check Microsoft's study guide before your exam.** Microsoft revises the skills measured periodically, and this app is a study aid, not a source of truth. The study guides are linked from each course dashboard.

### Interview preparation

Interview preparation lives at `/interview`, grouped into the four sections above. Every question shows five things: what the interviewer is testing, how to answer, code and diagrams where useful, the traps to avoid, and likely follow-ups. The answer is hidden until you ask for it. You mark each question yourself as _I know this_ or _Needs review_, and everything flagged collects in a revision queue at `/interview/review`.

| Azure topic                                  | Questions |
| -------------------------------------------- | --------: |
| ☁️ Azure core & architecture                 |        20 |
| 🔐 Entra ID, RBAC & identity                 |        20 |
| 🌐 Azure networking                          |        20 |
| 🖥️ Azure compute, App Service & AKS          |        21 |
| 🗄️ Azure storage & databases                 |        21 |
| 🔁 Azure DevOps & pipelines                  |        21 |
| 📐 Bicep, ARM & Terraform on Azure           |        21 |
| 🛡️ Monitoring, security & incident scenarios |        21 |

The 13 general DevOps topics (697 questions) come from the original DevOps Learning Hub this app is based on.

### Updating your question bank

The **My question bank** and **Real interview rounds** topics live in `src/content/interview/topics/my-*/` and `rounds-*/`. They were converted from your markdown notes with your wording kept. To add a question, append an `InterviewQuestion` to the relevant file there (the rules are in [`docs/CONTENT_AUTHORING.md`](docs/CONTENT_AUTHORING.md)), run `npm run validate`, and push.

---

## Who can open it

The sign-in screen checks the address against [`src/access/allowed-emails.ts`](src/access/allowed-emails.ts):

```ts
export const allowedEmails: readonly string[] = [
  'mahansivakumar1518@gmail.com',
  // 'teammate@example.com',
  // '@example.com',   // or admit a whole domain
]
```

- **To add someone:** add their address and redeploy.
- **To remove someone:** delete their line and redeploy. They are locked out the next time the app loads.
- **Progress is kept per address** in that browser's local storage, so two people sharing a device keep separate records.

> **This is a doorway, not a lock.** The list ships inside the JavaScript bundle and there is no password. Do not put anything confidential behind it.

---

## Running it locally

This needs **Node.js 20.19 or newer**. The system Node on this machine is v12, so a user-local Node 22 was installed at `~/.local/node22`. Put it on your PATH first:

```bash
export PATH=$HOME/.local/node22/bin:$PATH

npm install        # install dependencies
npm run dev        # dev server on http://localhost:5173
```

| Command             | What it does                                    |
| ------------------- | ----------------------------------------------- |
| `npm run dev`       | Dev server with hot reload                      |
| `npm run build`     | Production build into `dist/`                   |
| `npm run preview`   | Serve the build at http://localhost:4173/myapp/ |
| `npm test`          | Run the test suite (419 tests)                  |
| `npm run lint`      | ESLint                                          |
| `npm run typecheck` | TypeScript, no emit                             |
| `npm run format`    | Prettier, write                                 |
| `npm run icons`     | Regenerate the PWA icons                        |
| `npm run validate`  | format check + lint + typecheck + test + build  |

Run `npm run validate` before pushing; CI runs it too.

---

## Spaced repetition and the mistake notebook

All 2,584 interview questions and every auto-marked practice question are flashcards scheduled with **FSRS-5** (`src/lib/srs.ts`).

- **Due today** (`/review`, also on Home and in the sidebar) holds every card due by the end of your local day, then new cards up to a daily limit you set (default 20). A 30-day forecast shows what is coming.
- After revealing an interview answer, rate it **Again / Hard / Good / Easy**; each button shows when the card would come back. Again brings it back later in the same session.
- Before checking a practice answer, you can say **Guessed / Unsure / Knew it**. A correct guess is scheduled like a miss.
- The **Mistake notebook** (`/mistakes`) collects every wrong practice and mock-exam answer. You can drill it per course, and a question leaves once you answer it correctly without guessing.
- Upgrading keeps your history: questions already marked "I know this" become Good cards, and "Needs review" ones are due straight away. Cards, mistakes and settings are part of the normal progress export and import.

## My stats

`/stats` shows everything at once, and `/<course>/stats` (📊 in a course's tools) shows one exam in detail.

- **Exam readiness score (0–100).** Each exam domain scores 40% practice (the share of its questions you got right on your latest attempt), 35% mock exams (your average on that domain over the last three mocks; none yet counts as 0) and 25% retention (how many of its flashcards you are predicted to recall today). Domains are weighted by the middle of Microsoft's published range. The ⓘ next to the score explains this in the app.
- **Weak areas.** A heatmap of accuracy, mock score, retention and readiness per domain beside its exam weight. Heavy, weak domains are flagged **Focus**, and **Study this next** opens the domain worth the most marks.
- **Study calendar and daily goal.** A GitHub-style year of activity: questions answered, lessons completed, and minutes the app was open and in use. Set a goal in questions or minutes; meeting it counts the day towards your streak.
- **Exam-day countdown.** Set an exam date per course to see lessons, new cards and reviews needed per day. It warns if your new-card limit is too low to finish, and can raise it for you.

## Networking lab

`/network` (🌐 in the sidebar) is hands-on AZ-104 networking, with Azure's real rules, in three tools.

- **Subnet designer.** Type a VNet address space and subnets and you get:
  - An address bar placing each subnet at its real position. It zooms to the part of the VNet in use; overlapping subnets drop to a second row, outlined in red.
  - Usable addresses per subnet: size minus the 5 Azure reserves.
  - A review against Azure's rules:
    - Host bits set, with the corrected network suggested.
    - Subnets outside the VNet, overlaps, and anything smaller than /29.
    - Reserved names with their minimum sizes: GatewaySubnet (/29, /27 recommended), AzureBastionSubnet and AzureFirewallSubnet (/26), RouteServerSubnet (/27).
    - Near-miss names like `BastionSubnet`, which the service would not find.
  - Free blocks, and a "next free /N" button.
- **NSG evaluator.** Edit a subnet NSG and a NIC NSG, with Azure's default rules shown too. Pick or type a packet and watch it checked rule by rule in priority order. Each rule shows every criterion (protocol, source with service tags, ports, destination) with a reason, then the rule that decides.
  - Inbound traffic meets the subnet NSG first and the NIC NSG second; outbound the reverse. Both must allow it.
  - The rules flag priorities outside 100-4096, duplicate priorities, and malformed addresses or ports.
- **Peering and reachability.** VNets, peering links (one per side, with "allow access" and "allow forwarded traffic"), and a diagram that shows each peering as Connected, Initiated (one side only) or Invalid (overlapping address spaces).
  - "Can a VM in A reach a VM in B?" answers with the reasoning, including:
    - Peering is non-transitive.
    - Half a peering carries no traffic.
    - Overlapping spaces cannot peer.
    - Spokes reach each other through a hub only when the hub routes through a firewall and the spoke peerings allow forwarded traffic.
- **Scenarios** (`src/content/netlab/scenarios.json`):
  - Four subnet plans: a hub VNet, fixing a broken plan, sizing an AKS subnet, and the smallest VNet that fits.
  - Four NSG exercises, each with test packets and the verdicts they must get.
  - Four "can it reach?" quizzes.
  - One build task.

  The tests check that every expected answer matches the engines. Completed scenarios count on Home.

## Config lab

`/lab` (🧰 in the sidebar) reviews configuration files as you type, with three tabs. Findings come in three levels: **error**, **warning** and **tip**. Each has its line (click to jump there, with squiggles and gutter markers in the editor), an explanation and a corrected snippet.

- **Pipeline YAML:** Azure Pipelines or GitHub Actions, detected automatically.
  - The file is validated against a compact JSON Schema for each format, using Ajv. Unknown keys get "did you mean" suggestions.
  - Semantic rules catch what a schema cannot:
    - `dependsOn` / `needs` that point nowhere, and dependency cycles.
    - Tasks without `@version`, and missing required task inputs.
    - Deployment jobs without an environment or strategy, and plain-text secrets.
    - Actions pinned to `@master`, a missing `permissions:` block, echoed secrets, `::set-output`, and `pull_request_target` checking out PR code.
  - The stages → jobs → steps graph is drawn as SVG. Arrows show dependencies (dashed for Azure's implicit stage order), and conditions appear on the nodes.
- **Dockerfile:** parsed with continuation lines and multi-stage builds. Rules:
  - Running as root, `:latest` or untagged images, no `HEALTHCHECK`, secrets in `ENV`/`ARG`.
  - apt without cleanup or with `update` on its own line, `apk`/`pip` caches.
  - A missing multi-stage build. The fix offered matches your toolchain: Node, .NET, Go or Python.
  - Also: `ADD` vs `COPY`, `COPY . .` before installing dependencies, `curl | sh`, `sudo`, shell-form `CMD`/`ENTRYPOINT`, an exposed SSH port.
- **Kubernetes:** multi-document manifests, every workload kind (Pod, Deployment, StatefulSet, DaemonSet, Job, CronJob), every container. Rules:
  - Resources: no memory limit, no requests.
  - Probes: no readiness or liveness probe (not required for Jobs).
  - Privileges: privileged containers, privilege escalation, root (`runAsUser: 0` or no `runAsNonRoot`), `hostPath`, `hostNetwork`/`PID`/`IPC`.
  - Images: `:latest`, and images not pinned by digest.
  - Labels and selectors: missing labels, selectors that do not match pod labels, Services that select no pods.
  - API versions that are no longer served, and tips for read-only root filesystems, dropped capabilities, namespaces and replica counts.
- **Exercises** (`src/content/configlab/exercises.json`, 4 per tab): broken files to fix until there are no errors or warnings. Requirements (JMESPath over the analysers' facts) stop you "fixing" a file by deleting it. Each has a reference solution, and the tests check that every solution comes out clean. Solved exercises count on Home.

YAML is parsed with the `yaml` package rather than js-yaml, because it keeps the position of every node. That is what lets a schema error or a missing `resources:` point at its line.

## Azure CLI simulator

`/cli` (💻 in the sidebar) is a practice terminal for the **Azure CLI** and **Az PowerShell**, on a simulated subscription kept in your browser. Nothing touches real Azure.

- **Terminal:** history (↑/↓), Bash-style Tab completion (commands, parameters, allowed values and the names of your resources), `clear`, Ctrl+C, and y/n confirmations. There are Tab and arrow buttons for phones.
- **Shell features:** `NAME=value`, `$NAME` and `$(az ... -o tsv)` substitution work, so real-world snippets run as written.
- **Modelled commands:** these keep real state, so `az group create` then `az group list` shows the new group. Each returns the JSON the real CLI prints, trimmed to the useful fields, and fails with the real error codes (`ResourceGroupNotFound`, `ScopeLocked`, `NetcfgSubnetRangesOverlap`, `SecurityRuleConflict`, `AccountNameInvalid` ...).
  - Accounts: `az login`, `az account`.
  - Resource groups: `az group create|list|show|update|delete|exists`, and `az configure --defaults`.
  - Resources and locks: `az resource list`, `az lock`.
  - Networking: `az network vnet` and `vnet subnet`, and `az network nsg` and `nsg rule`.
  - VMs: `az vm create|list|show|start|stop|deallocate|restart|resize|open-port|delete`. `az vm create` builds the VNet, NSG and public IP for you, just like the real one.
  - Storage: `az storage account create|list|show|update|delete`.
- **Validation:** required and unknown arguments, allowed values and "the most similar choice" suggestions all use the Azure CLI's own wording.
- **The rest of the reference:** every other `az` command in the AZ-900, AZ-104 and AZ-400 command references (`src/content/*/commands.ts`) is recognized and validated. Its template tells the simulator which parameters it takes. The response says plainly that the simulator does not model it, and `az <group> --help` lists it.
- **Output:** `--output json|jsonc|table|tsv|yaml|none` and `--query` (JMESPath, via jmespath.js), applied in that order, as the CLI does.
- **PowerShell mode:** Az cmdlets from the course notes run on the same simulated cloud.
  - Resource groups: `New/Get/Set/Remove-AzResourceGroup`, `Update-AzTag`.
  - Networking: `New/Get-AzVirtualNetwork`, `Add-AzVirtualNetworkSubnetConfig | Set-AzVirtualNetwork`, NSGs and `Add-AzNetworkSecurityRuleConfig | Set-AzNetworkSecurityGroup`.
  - Storage: `New/Get/Set/Remove-AzStorageAccount`.
  - VMs: `New/Get/Start/Stop/Restart/Remove-AzVM` (`Stop-AzVM` deallocates, as it really does).
  - Locks: `New/Get/Remove-AzResourceLock`.
  - Account: `Get-AzContext` and others.
  - Also supported: `$var = <cmdlet>` objects, `@{}` hashtables, `Format-Table`/`Format-List`/`Select-Object`/`ConvertTo-Json`, `Get-Command` and `Get-Help`.
- **Missions** (`src/content/azcli/missions.json`): 8 guided tasks.
  - The first resource group.
  - A network foundation: a VNet with two subnets and an NSG allowing 443 on one of them.
  - Fixing an insecure storage account.
  - A VM lifecycle ending in deallocate.
  - Tagging for cost reports.
  - Protecting production with a lock.
  - Answering questions with `--query`.
  - The same work in PowerShell.

  Each check is a JMESPath query over the simulated cloud, ticked off live as you work. A completed mission counts on Home.

## SQL playground

`/sql` (🗃️ in the sidebar) is a SQL editor on real **SQLite**, compiled to WebAssembly and running in your browser. It works offline: the engine (about 650 KB) is part of the offline cache. It loads only when you open the page.

- **Editor:** CodeMirror 6 with SQL highlighting and table and column autocompletion. Ctrl+Enter (⌘+Enter) runs. Results show as a table, errors are shown as they come from SQLite, and you get a query history.
- **Sample data** (`src/content/sql/datasets/*.sql`):
  - HR: `departments`, and `employees` with a manager hierarchy.
  - Shop: `customers`, `products`, `orders`, `order_items`.
  - Web logs: `web_logs`, 400 requests generated by `scripts/generate-web-logs.mjs`.
- **Your own tables:** create tables or change data freely. **Reset sample data** puts it back.
- **Safety stop:** queries run in a Web Worker. One that runs longer than 8 seconds (for example a recursive CTE that never stops) is stopped without freezing the app.
- **Challenges** (`/sql/challenges`): 26 problems covering joins, GROUP BY/HAVING, window functions (ROW_NUMBER, RANK, LAG, running totals), CTEs, recursive CTEs and interview classics such as the second highest salary, duplicates and earning more than your manager.
  - **Check** compares your result with the expected one. Column names don't matter, and row order only matters when the question asks for it.
  - Hints unlock one at a time. All hints and the reference solution unlock after two failed checks.
  - Solved challenges count on Home and towards your daily goal.
- **Why SQLite and not DuckDB:** DuckDB-WASM was considered, but its engine is about 30 MB, well past the 10 MB per-file offline cache limit. SQLite supports everything the challenges need.

**Adding a challenge:** add an entry to `src/content/sql/challenges.json` with `id`, `title`, `difficulty`, `topic`, `description`, `hints`, `solution` and `ordered`, then run `npm run sql:expected` to fill in its expected result. The tests fail if a solution and its expected result ever disagree.

## KQL simulator

`/kql` (📈 in the sidebar) is for practising Kusto Query Language, the query language of Log Analytics and Application Insights. No KQL engine runs in a browser, so this is a **simplified simulator**. A practical subset of KQL is translated to SQL (`src/lib/kql/translate.ts`) and run on the same in-browser SQLite as the SQL playground. The page says so, and **Show the generated SQL** reveals the translation, which is useful for learning both languages.

- **Supported operators:** `where`, `project`, `project-away`, `project-rename`, `extend`, `summarize … by`, `order by` / `sort by` (descending by default, as in KQL), `top N by`, `take`, `distinct`, `count`, `join kind=inner|leftouter` (clashing right-hand columns get a `1` suffix, as in KQL), `print`, and `render timechart|linechart|barchart|columnchart|piechart`.
- **Supported functions:** `count()`, `countif()`, `dcount()`, `sum/avg/min/max()`, `make_set()`, `ago()`, `now()`, `bin()`, `datetime()`, `between`, `in`, `contains`, `has` (whole terms), `startswith`, `endswith` and their `!` forms, `=~`, `iff()`, `isempty()`, `strcat()`, `round()` and more.
- **Errors:** messages point at the line and column, e.g. "Unknown column 'computer'. Did you mean 'Computer'?"
- **Sample tables** (`src/content/kql/`): `Heartbeat`, `Perf`, `requests`, `exceptions`, `SigninLogs` and `AzureActivity`, about 2,100 rows from a seeded generator. Each table has a story to find: two VMs stopped sending heartbeats, one VM runs hot, one is low on disk, a slow and failing checkout endpoint, a password spray, and resource deletions in the activity log.
- **Fixed clock:** the simulator's clock is pinned to `2025-10-01 12:00 UTC`, so `ago(1h)` always finds data and every answer is stable.
- **Challenges** (`/kql/challenges`): 20 monitoring scenarios from AZ-104 and AZ-400, such as failed requests per hour, the top 5 slowest operations, VMs with no heartbeat in 15 minutes, failed sign-ins, password sprays and who deleted what. Each answer is worked out by running the reference solution, so `challenges.json` stores no expected results. Hints, the solution and progress work as in the SQL playground.
- **Where it differs from real KQL:** `dcount()` is exact rather than estimated, and `join` without `kind=` is an inner join here (real KQL's default is `innerunique`). The app shows a note when either applies.

## Python playground

`/python` (🐍 in the sidebar) runs **Python 3.13 in your browser** with [Pyodide](https://pyodide.org) 0.29.3. There's a CodeMirror editor, Run and Stop, output and errors as they happen, and input for `input()`.

- **First use and offline:** the first run downloads Python, about 10 MB, with a loading indicator. The first `import pandas` adds about 20 MB, and imported packages load automatically. The service worker keeps all of it (cache-first, in a `pyodide` cache), so it works offline afterwards. It's too big to precache for everyone, so it's only fetched if you use it.
- **Safety stop:** code runs in a Web Worker. Stop, or the time limit (30 s for a run, 15 s for tests), ends it without freezing the app.
- **Challenges** (`/python/challenges`): 20 DevOps scripting problems.
  - Parse access logs and count status codes, the busiest IPs, error lines, durations like `1h30m`, and `kubectl get pods` output.
  - Mocked `az vm list` and `az storage account list` JSON.
  - Config and nested-config diffs, `.env` files, picking the latest semantic version.
  - CIDR validation, usable IPs in Azure subnets, overlapping and containing subnets (`ipaddress`).
  - Retry with exponential backoff.
  - Two pandas cost-report questions.
- **How tests work:** you write the function and **Run tests** calls it with each test case, showing pass or fail with expected and actual values per test. Hidden tests show only pass or fail until you solve the challenge or have failed twice. Hints, the reference solution and progress work as in the SQL and KQL playgrounds.

**Adding a challenge:** add it to `src/content/python/challenges.json`. A test is a Python expression such as `count_status_codes(SAMPLE_LOG)`, run after the `fixtures` and your code. Then run `npm run py:expected`, which needs Python 3.10+ with pandas. It runs each reference solution through `src/content/python/harness.py`, the same harness the browser uses, records the expected values, and refuses a challenge whose starter code already passes. The test suite re-checks this whenever pandas is available.

## Code playground

`/playground` (🧪 in the top bar) is a scratchpad for running **shell (bash)** and **Python** and seeing the output as it is produced.

- **`npm run dev` or `npm run preview`**: scripts run for real on your machine with `bash` and `python3`, through a small runner mounted on the Vite server (`server/playground-runner.ts`). They run as you, in `~/.azure-hub-playground` (files persist between runs), with a 60 second limit and 1 MB of output. The runner only accepts requests from this machine and from the app's own origin.
- **Deployed static site**: there is no server, so Python runs in the browser with [Pyodide](https://pyodide.org). It is downloaded on first use and then cached for offline use, shared with the Python playground. Shell is unavailable.

Ctrl+Enter (⌘+Enter) runs, Tab indents, **Add input** supplies stdin for `input()` / `read`, and recent runs are kept so you can load them again.

## Deploying to GitHub Pages

A workflow is included at `.github/workflows/deploy-pages.yml`.

1. Push this folder to `main` of https://github.com/SivaKumarMahan/myapp.
2. In the repository, go to **Settings → Pages** and set **Source** to **GitHub Actions**.
3. Push to `main` (or run the workflow from the **Actions** tab).
4. The site appears at `https://<your-username>.github.io/<repository-name>/`.

The workflow derives the base path from the repository name, so any repository name works. For a manual build use `BASE_PATH=/<repo-name>/ npm run build`, or `BASE_PATH=/ npm run build` to host at a domain root. The build also writes `dist/404.html`, so deep links work on GitHub Pages.

### Install it on a phone

- **iPhone:** open the site in Safari, tap **Share → Add to Home Screen**.
- **Android:** use Chrome's **Install app** option.
- **Offline:** after one online visit, everything works offline.
- **Updates:** when a new version is deployed you get an "Update available" banner. Your progress is never touched by an update.

---

## How the content is organised

Content is plain TypeScript, type-checked against `src/content/types.ts`, so a broken lesson fails the build rather than rendering badly.

```
src/content/
├── courses.ts            # course registry (add a course here)
├── az900/ az104/ az400/  # one folder per certification
│   ├── index.ts          # the Course: blueprint, sources, dashboard copy
│   ├── domains.ts        # skill areas with their published ranges
│   ├── commands.ts       # searchable Azure CLI / PowerShell / git reference
│   ├── topics/<domain>/  # one file per lesson
│   └── questions/        # exam-bank questions, one file per domain
└── interview/topics/     # one folder per interview topic (azure-* and DevOps)
```

**[`docs/CONTENT_AUTHORING.md`](docs/CONTENT_AUTHORING.md)** has the full rules, and `npm test` enforces them. It covers required lesson sections, diagram limits, id prefixes and question kinds, plus the complete lesson plan with every topic id.

- **Add a lesson:** create the file under `topics/<domain>/`, list it in that folder's `index.ts`, then run `npm test`.
- **Add a certification** (for example AZ-305): copy the shape of `az104/`, add the course to `courses.ts`, then add a chunk line in `vite.config.ts`. No UI changes are needed.

---

## Known limitations

- **Tasks aren't auto-graded.** Mock-exam tasks are self-verified against a checkpoint list; only multiple-choice and command questions are auto-scored.
- **Commands weren't run against Azure.** The Azure CLI, Bicep and KQL samples were written and reviewed, but not executed against a live subscription. If a command errors, check `az <group> --help`. Azure changes fast.
- **Labs create real resources.** Every lab ends with a cleanup step (usually `az group delete`). Run it, or you will be billed.
- **Progress stays in one browser.** Progress lives in one browser on one device. Use **Progress & data → Export** to move it.
- **iOS Safari clears unused sites.** In a Safari _tab_, storage for sites not opened for about 7 days is cleared. Installing the app to the Home Screen avoids this.

---

## Credits and trademarks

Based on the open DevOps Learning Hub app structure (its framework and its 13 DevOps interview topics are reused here). Microsoft, Azure, Microsoft Entra, Azure DevOps and GitHub are trademarks of their respective owners; this project is independent of all of them.
