# Azure Learning Hub - developer guide

The technical reference: how each feature works, where its content lives, and how to build, test and deploy. For a plain-language tour of the app, see the [README](../README.md).

An installable, offline-capable study app for Microsoft Azure certifications and Azure / DevOps interviews. It has two sections.

**Courses** — six are installed:

- **AZ-900 — Microsoft Azure Fundamentals**
- **AZ-104 — Microsoft Azure Administrator**
- **AZ-400 — Designing and Implementing Microsoft DevOps Solutions**
- **CKAD — Certified Kubernetes Application Developer** (Kubernetes v1.35)
- **Terraform Associate (004)** (Terraform v1.16; HashiCorp publishes no weights, so the app's are labelled as its own)
- **Containers & Docker fundamentals** (no certification; the app's own teaching order and study weights)

The CKAD, Terraform and Docker courses come from the original DevOps Learning Hub (`~/Documents/A/devopsApp/Devops`), copied unchanged into `src/content/ckad`, `terraform` and `docker`.

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

|                           | AZ-900 | AZ-104 | AZ-400 | CKAD | Terraform | Docker | Total |
| ------------------------- | -----: | -----: | -----: | ---: | --------: | -----: | ----: |
| Lessons (each with a lab) |     13 |     21 |     18 |   50 |        41 |     15 |   158 |
| Exam-bank questions       |     78 |     97 |     95 |  116 |       118 |     44 |   548 |
| Command-reference entries |     30 |     81 |     56 |  177 |        81 |     40 |   465 |

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

The **My question bank** and **Real interview rounds** topics live in `src/content/interview/topics/my-*/` and `rounds-*/`. They were converted from your markdown notes with your wording kept. To add a question, append an `InterviewQuestion` to the relevant file there (the rules are in [`docs/CONTENT_AUTHORING.md`](CONTENT_AUTHORING.md)), run `npm run validate`, and push.

---

## Who can open it

The sign-in screen checks the address against [`src/access/allowed-emails.ts`](../src/access/allowed-emails.ts):

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

This needs **Node.js 20.19 or newer**. The system Node on this machine is v12, so a user-local Node 22 was installed at `~/.local/node-v22.23.3-linux-x64`. Put it on your PATH first:

```bash
export PATH=$HOME/.local/node-v22.23.3-linux-x64/bin:$PATH

npm install        # install dependencies
npm run dev        # dev server on http://localhost:5173
```

| Command             | What it does                                    |
| ------------------- | ----------------------------------------------- |
| `npm run dev`       | Dev server with hot reload                      |
| `npm run build`     | Production build into `dist/`                   |
| `npm run preview`   | Serve the build at http://localhost:4173/myapp/ |
| `npm test`          | Run the test suite (900+ tests)                 |
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

## Study bot

`/bot` (🤖 in the sidebar, on Home, and **Practise with the bot** on every interview question) is an offline interview coach. It runs on rules and your question bank, and makes no AI calls: nothing you type leaves the device.

- **Mock interview.** "Interview me on AKS", `/mock senior` or `/mock due` starts a round of 6 questions, due cards first. Each typed answer is scored against the question's key points. Matching allows typos, word forms and synonyms. You get:
  - the key points you covered and missed;
  - any common mistake it spotted;
  - a suggested Again/Hard/Good/Easy rating, which feeds Due today;
  - a follow-up question;
  - a report at the end.

  If you said a point in other words, tick it on the checklist and re-score.

- **Tutor.** With a question open, ask for a **hint** (three levels), the **short** or **long** answer, **simpler**, an **analogy**, **related** questions, **mistakes**, **follow-ups** or a **what if** variant.
- **Search.** Anything that is not a command is searched across all 2,584 questions, with their 30-second answers.
- **Coach.** "What should I study today?" reads your progress:
  - reviews due;
  - your weakest interview topics;
  - exam readiness and the next domain to study;
  - the mistake notebook;
  - your exam-date plan.
- **Rapid-fire.** 8 timed questions (25 seconds each) on the cards you are most likely to have forgotten.
- **Troubleshooting.** Six branching incidents (ACR 403, CrashLoopBackOff, a 502 after a slot swap, a private endpoint, a Terraform state lock, a cost spike), scored at the root cause.
- **Smart search** (optional, in Settings) adds on-device semantic search, so "my pods keep restarting" finds the CrashLoopBackOff answer. It is a one-time download of about 30 MB, then it works offline.
- **Voice input** 🎙️ uses the browser's speech recognition, which usually needs the internet.

How it works, the content schema and how to add a topic: [docs/STUDY_BOT.md](STUDY_BOT.md).

## Roles & skills

`/roles` (🧭 in the sidebar and on Home) maps ten in-demand DevOps and cloud roles to the skills and tools they need, and links each skill to the content in this app. The roles are DevOps, SRE, Cloud Engineer, Platform, DevSecOps, Cloud/Solutions Architect, Kubernetes Platform, MLOps, Build & Release, and FinOps.

- **Roles.** Each role has a card showing its top tools and **coverage**: how much of the role's core skills your progress covers. A skill counts as covered by whichever is best of these:
  - you ticked it in My fit;
  - your progress in the content it links to (interview recall, lessons completed, challenges solved).
- **Role page.** Each role has its own page with:
  - focus, day in the life and tools at a glance;
  - skills by area with importance (core, important or nice to have), each with links into the app and **Ask the bot**;
  - certifications, marked recommended or optional;
  - what interviewers probe;
  - a learning path as a stepper, with **Practise this** buttons;
  - overlapping roles.
- **Skills matrix.** Roles against skill areas as a heatmap. The first column is sticky so it reads on a phone. Tap a cell for the skills and tools behind it.
- **Compare.** Pick two or three roles to see shared skills and what is unique to each.
- **My fit.** Tick what you know to see your match per role and the top 5 gaps to learn next. Each gap is linked to content or marked "no content yet". Ticks are saved in your progress record (schema v5), so they are included in **Progress & data → Export** and merged on import.
- **Tool lookup.** Search for a tool (Prometheus, Helm, KQL) to see which roles need it and how much.

All of it is data in `src/content/roles/roles.json`:

- `areas`: the skill areas.
- `skills`: shared skills, each with `appLinks` to `itv:<topic>`, `lesson:<lesson>`, `course:<course>` or `tool:<page>`. A skill with no links is marked `gap: true`.
- `roles`: each role references skills by id.

The content is vendor-neutral, with Azure and AWS names side by side. It leaves out salaries and market figures on purpose. Tests check that every link resolves and every reference exists. To refresh the data when the job market moves, use prompt R2 from `role-skills-map-prompt.md`, which keeps the same schema and ids.

## Search everything, settings, sync and accessibility

- **Command palette.** Press **Ctrl+K** (**⌘K** on a Mac), or the 🔎 in the top bar, from any page. It searches:
  - pages;
  - lessons;
  - all 2,584 interview questions;
  - command-reference entries;
  - SQL/KQL/Python challenges, CLI missions and config-lab exercises;
  - incident and guided labs;
  - glossary terms;
  - roles.

  Matching is fuzzy and prefix-aware: "privat endpont" still finds private endpoints. Use ↑/↓, Enter and Esc. It is a proper combobox/listbox dialog with a focus trap, and focus returns where it was when it closes. The index is built on first open only.

- **Settings** (`/settings`, ⚙️). In one place:
  - daily goal (questions or minutes);
  - new flashcards per day;
  - exam dates;
  - theme;
  - GitHub Gist sync;
  - data reset (type RESET to confirm).

  Export and import stay on **Progress & data**.

- **GitHub Gist sync** (optional). Paste a personal access token with only the `gist` scope. The app keeps your progress in a **secret gist** in your account. Each sync downloads it, keeps the **newest copy of every item**, and uploads the result. Newest-per-item covers lesson status, practice answers, interview recall, flashcards, mistakes, stories, designs and skill ticks; other records are combined, and settings come from whichever side saved last. The first sync on a new device finds the existing gist by itself. You can also have it sync automatically when the app opens.
  - The token is stored only in this browser, for your sign-in. It is never written into the progress record or its export.
  - Secret gists are unlisted, not private: anyone with the URL can read them.
  - Deletions are not tracked, so something deleted on one device can come back from another.
- **Accessibility.**
  - axe-core runs in the tests on the main pages.
  - `src/styles/contrast.test.ts` checks every text/background token pair against WCAG AA (4.5:1) in both themes.
  - A real-browser axe pass over 35 routes in both themes, and at phone width, came back with no violations. Fixes included:
    - darker subtle text and code comments in the light theme;
    - dark text on light buttons in the dark theme;
    - tabs that use `aria-selected` instead of `aria-pressed`;
    - labelled landmarks and file inputs;
    - keyboard-reachable scroll areas (code panes, graphs, diagrams);
    - a correct heading order.
- **Offline and updates.** The build now fails if any page, script, style, wasm or icon is missing from the service worker's precache (only the optional Smart-search runtime is cached on first use instead). When a new version is deployed, the existing "update available" banner offers a reload.

## Guided labs, IaC compare, glossary and cheat sheets

- **Guided labs** (`/guided-labs`, 🛠️). Five AZ-104 labs:
  - a hardened storage account with data roles and lifecycle rules;
  - a VNet, NSG and private VM;
  - a custom RBAC role;
  - Azure Policy with a visible deny;
  - diagnostic settings to Log Analytics, with KQL.

  Five AZ-400 labs:
  - GitHub Actions to App Service with OIDC;
  - a multi-stage Azure Pipeline with an approval;
  - Azure Artifacts versioning;
  - pipeline secrets from Key Vault;
  - ACR build to Container Apps with a managed identity.

  Every lab has:
  - goals and prerequisites;
  - an **estimated cost**;
  - steps with copyable Cloud Shell (Bash) commands;
  - **verify** steps: paste the output and the app checks it against the expected patterns, with an example of the expected output;
  - a checklist;
  - a **required cleanup**.

  Starting a lab and not confirming its cleanup shows a "resources may still be running" warning on the lab and on Home. A lab counts as complete when the checklist is ticked and cleanup is confirmed. Progress is saved in your progress record (schema v8). Content: `src/content/labs/guided.json`. Tests check that every example output passes its own verify patterns.

- **IaC compare** (`/iac`, 📐). A storage account, VNet + subnet, App Service plan + web app, and Key Vault, each in **ARM JSON, Bicep and Terraform** (azurerm 4.x) side by side. Tap a concept (SKU, TLS, dependencies, identity and so on) to highlight its lines in all three, with a note on how they differ. Content: `src/content/iac/compare.json`.
- **Glossary** (`/glossary`, 📖). 90 Azure and DevOps terms with search and categories. Open a term to see the lessons that use it and the closest interview questions. In **lessons, terms are linked automatically**: the first mention per paragraph is underlined, and hovering, focusing or tapping it shows the definition and related lessons (on phones, as a sheet above the tab bar). Acronyms match case-sensitively, and everyday words such as "tag" or "stage" are not auto-linked. Content: `src/content/glossary.json`.
- **Cheat sheets** (`/<course>/cheatsheet`, 🖨️ in the course tools). One printable page per exam domain, built from each lesson's one-liner, summary, first exam tip and key commands. Use **Print / save as PDF** to get a two-column A4 sheet with the app's navigation hidden. Choose "All domains" to get one page each.

## Interview practice: mock interviews, STAR stories, incident labs, prep packs

These are linked from the Interview preparation page. Incident labs also have a sidebar entry (🚨).

- **Mock interview** (`/interview/mock`).
  - **Set up:** choose a level, topics or a prep pack, how many questions, the time per answer (1-5 minutes) and 0-2 follow-ups.
  - **Answer:** each question runs on a clock. Answer out loud: it is **recorded** with MediaRecorder and, where the browser supports the Web Speech API, **transcribed** live (that may use the internet). You can also just type key words.
  - **Self-score:** a checklist of the model answer's key points, pre-ticked from your transcript by the Study bot's matcher, plus any common mistakes it spotted. A suggested Again/Hard/Good/Easy rating feeds Due today.
  - **Follow-ups:** the question's own follow-ups, plus probes such as "why that approach?", "what at 10x scale?" and "how would you know it works?" (`src/content/interview/mock.json`).
  - **Recordings** are kept per user in IndexedDB with play and delete. They stay on the device and are **not** part of the progress export.
- **STAR stories** (`/interview/stories`). Write each story as Situation, Task, Action, Result and What I learned, with prompts and a word count (aim for about two minutes spoken).
  - Tag stories to the 20 common behavioural questions in `src/content/interview/behavioural.json`.
  - **Coverage** shows which questions have no story yet.
  - **Quick review** walks through the questions: say it aloud, then reveal your story.
  - Stories are saved in your progress record and included in export.
- **Incident labs** (`/incidents`). Ten branching production incidents (from `src/content/bot/scenarios.json`, shared with the Study bot), including:
  - intermittent 403s from ACR;
  - CrashLoopBackOff;
  - ImagePullBackOff after ACR went private;
  - 502s after a slot swap or a backend certificate renewal;
  - a private endpoint storage outage;
  - a Terraform state lock;
  - a cost spike;
  - SQL timeouts after a release;
  - Key Vault references failing after an RBAC switch.

  Each step reveals new evidence. Some endings are wrong conclusions (`"correct": false`). The score is 50% diagnosis points, 20% efficiency (fewest steps compared with yours) and 30% for the right root cause.

- **Prep packs** (`/interview/packs`). Every real interview-round topic is a company pack. Add your own tags to any question with **🏷 Tag** on its card (for example "Microsoft" or "Round 2 - system design") and each tag becomes a pack. You can revise a pack, start a mock interview from it, or delete the tag. Tags are saved in your progress record.

## Architecture builder

`/architecture` (🏗️ in the sidebar) is a canvas for drawing Azure designs. The services are Users / Internet, Front Door, Application Gateway, VMs, App Service, AKS, Azure SQL, Storage, Key Vault, VNet, Private Endpoint and Log Analytics. They are drawn as generic shapes with short text badges, not Microsoft's icons.

- **Draw.** Tap a service to add it in the chosen region. Drag it with a mouse or finger, or tab to it and use the arrow keys. Use **Connect** to join two services, tapping the source and then the target. The inspector edits each service's settings: instances, zones, WAF SKU, backup, redundancy, soft delete, geo-replica and so on.
- **Design review**, live as you draw. Tapping a finding highlights the services it is about. It checks for:
  - no WAF on a public entry;
  - data reachable from the internet;
  - PaaS without a private endpoint;
  - a private endpoint outside a VNet;
  - secrets not in Key Vault;
  - no monitoring or unmonitored resources;
  - no backup or soft delete;
  - a single region;
  - a second region without a copy of the data;
  - single instances;
  - unconnected services.
- **Scenarios.** Four briefs, each with a live checklist:
  - a 99.99% highly available web app;
  - a partner API on AKS;
  - lifting and shifting a 3-tier VM app;
  - secure document uploads.

  **Compare with the model answer** shows the model diagram, its explanation, and what it has that yours doesn't. You can open a copy of it to edit.

- **Saved locally.** Designs save automatically into your progress record (schema v6). They are included in **Progress & data → Export**, and on import the most recently edited copy wins.
- **Export** a design as SVG, or as a 2x PNG.

Content: `src/content/arch/services.json` holds the palette, regions and property definitions; `src/content/arch/scenarios.json` holds the briefs and model answers. Tests check that every model answer passes its own review and brief.

## Visualise

`/visualise` (🔭 in the sidebar) has four interactive models. Each loads as its own small chunk only when you open it, and its exercises count as challenges on Home.

- **RBAC & Policy.** A management group → subscription → resource group → resource tree. Pick a principal to see the roles it holds and inherits. Tap a scope to see three panels side by side: role assignments, deny assignments and Azure Policy. Assign a role anywhere to highlight everything it reaches.
  - **Evaluate a request** walks through Azure's order: deny assignments, then role assignments, then Policy on create/update. Along the way it shows:
    - data actions vs control-plane roles;
    - `notActions`;
    - Policy `notScopes`;
    - why being Owner does not get you past Policy.
  - 14 "predict the outcome" exercises are in `src/content/visualise/rbac.json`.
- **Deployment strategies.** Animated blue-green, canary, rolling and ring-based releases. Step through or play, move the traffic slider (canary, blue-green), break v2 on purpose, and roll back to see how fast each strategy recovers. Each strategy explains its pros, its risks and how to do it in Azure. A 6-question quiz asks which strategy fits a scenario.
- **Git branching.** Type `commit`, `branch`, `checkout`/`switch`, `merge` (`--no-ff`, `--squash`), `rebase`, `cherry-pick`, `revert`, `reset`, `tag` and `log`, and watch an SVG commit graph update. Unreachable commits fade out after rebase or reset. There are 13 exercises with live checklists: basics, GitFlow (feature, release, hotfix) and trunk-based (short-lived branches, patching a release branch). A table compares GitFlow and trunk-based development.
- **Composite SLA.** Chain services in series and redundant groups in parallel. You get the composite SLA, the nines, and the downtime it allows per day, week, month and year. It includes presets (such as two regions behind Front Door), 5 calculation exercises, and published SLA values in `sla.json` (check Microsoft's current SLA document before you quote one).

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

## Linux & Bash lab

`/linux-lab` (🐧 in the sidebar, `?c=<challenge id>` opens one) is a set of 62 scenario challenges on a simulated Linux server. It runs entirely in the browser, offline, with no backend and no AI at runtime.

- **Engine:** [just-bash](https://github.com/vercel-labs/just-bash) (Apache-2.0), a bash interpreter written in TypeScript with an in-memory filesystem. Only the lab page loads it (about 1.3 MB, in the page's lazy chunk).
- **The world** (`src/lib/linuxlab/world.ts`): `buildWorld(variant, now)` generates everything from a variant (`main` or `hidden`) and a timestamp: files with real modification times, about ten hosts (up, down, SSH refused, SSH auth failure, full disk), domains (expired certificate, no DNS), services, processes, disks, memory, Docker images, Kubernetes deployments and Azure resources. The `hidden` variant has the same layout with different names, dates, numbers and failures, so hard-coded answers fail. Large files are sparse (`LabFs` in `fs.ts` reports their declared size).
- **Mock tools** (`src/lib/linuxlab/commands.ts`): `ping`, `ssh` (runs commands in a per-host shell), `scp`, `nc`, `curl`, `mail`/`sendmail`, `getent`/`nslookup`/`dig`, `openssl s_client`/`x509`, `ps`, `top -bn1`, `free`, `uptime`, `df`, `du`, `ss`, `lsof`, `fuser`, `kill`, `systemctl`, `crontab`, `useradd`, `docker`, `kubectl` and `az`, with realistic output and exit codes. Mail and webhooks go to `world.outbox` (the **Outbox** tab).
- **Shims** for gaps in just-bash: `date` (frozen to the world's clock), `touch -d`, `stat -c`, `sed -i.bak`, `xargs -I`, `find -mmin` and GNU `-mtime` rounding, `sort -h`, one-character `awk -F`, `gzip` keeping mtimes, `zgrep`, `realpath`. A transform plugin (`transform.ts`) makes `"$@"` and `"${arr[@]}"` work as a command. The clock runs in the browser's time zone (`time.ts`), so logs, `date` and `ls -l` agree.
- **Known shell quirks** (listed by `help` in the terminal): unquoted `key=value` items inside an array literal are dropped by the just-bash parser; `$(cmd < "$file")` inside `$(( ))` loses the redirect target; `ssh` does not swallow a `while read` loop's stdin; there are no interactive programs.
- **`LinuxLab`** (`lab.ts`) is one environment. `run()` keeps the working directory, variables and functions between commands, stops runaway loops, and returns stdout, stderr and the exit code.
- **Checking** (`checks.ts`) is outcome-based. `checkChallenge` replays the learner's terminal commands (or runs their script with each test case's arguments) on a fresh world, runs the first reference solution on an identical world, and compares them with the challenge's checks. It does this for `main` and then `hidden`. Check kinds:
  - `output` (modes: exact, unordered, contains, tokens with a regex, numbers);
  - `files` (deleted, kept or created, with "it's only 4 days old" feedback);
  - `file` (content);
  - `probe` (a command run afterwards, e.g. `systemctl is-active nginx` or `crontab -l`);
  - `outbox`;
  - `exit`.
- **Storage:** the lab's own record (drafts, hints shown, attempts, solved) lives under `azure-learning-hub.linuxlab` (`.user.<email>` when signed in), separate from the progress record. A solved challenge is also recorded as `linux:<id>` in `challenges`, so it counts on Home and syncs like the others.

### Adding a challenge

1. Pick the category file in `src/content/linuxlab/challenges/` (`disk.ts`, `logs.ts`, `text.ts`, `json.ts`, `network.ts`, `processes.ts`, `cloud.ts`, `fundamentals.ts`) and add an object of type `LabChallenge` (`src/content/linuxlab/types.ts`):
   - `id` (unique, kebab-case: it becomes `linux:<id>` in progress and `?c=<id>` in links), `title`, `category`, `level` (`simple` | `medium`), `type` (`command` | `script` | `bugfix`);
   - `scenario`, `task` (inline markdown: `**bold**` and `` `code` ``);
   - `seedFiles` (paths shown as "Look at" buttons) and optional `mockHosts` (shown as "Simulated: ...");
   - exactly three `hints`, from a nudge to almost the answer;
   - `solutions`: the first one is the **reference** the checker compares against; others are shown as "Another way";
   - `explanation`: `{ code, note }` lines for the reference;
   - `checks` (see the list above);
   - for `script` and `bugfix`: `script: { name, cases }`, where each case has a `label` and `args`, either the same for both variants or `{ main, hidden }`; `bugfix` also needs `starter` (the broken script);
   - `hiddenVariant` (what differs, in one sentence), `followUp` (an interview question), `repoRef`, `tags`.
2. If the task needs data that isn't there, add it to `buildWorld` in `world.ts` for **both** variants, and make the hidden one different.
3. Run the self-test: `npx vitest run src/content/linuxlab`. It checks that the reference passes its own checks on both variants and runs without shell errors, that a do-nothing answer fails, and that a bug-fix starter fails. For one challenge: `LAB_ONLY=my-id npx vitest run src/content/linuxlab`. The same check runs in the app under **Self-test** at the bottom of the lab page.
4. Update the count in `src/content/linuxlab/challenges.test.ts` (it expects 62) and the README.

### Setting `repoRef`

`repoRef` links a challenge to a question in your interview-questions repository. It is shown under **Related questions**. Every challenge ships with `repoRef: null`. To set one:

```ts
repoRef: { path: 'linux/scripting.md', questionId: 'Q12' },
```

- `path` is the file in the repo, relative to its root; `questionId` is however that file numbers its questions. Both are shown as text only: the lab never reads the repo, so it keeps working offline and without the repo.
- Leave it `null` when there's no matching question. In-app interview questions that share the challenge's `tags` are linked automatically.

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
├── az900/ az104/ az400/  # one folder per Azure certification
├── ckad/ terraform/ docker/  # the DevOps courses from the original app
│   ├── index.ts          # the Course: blueprint, sources, dashboard copy
│   ├── domains.ts        # skill areas with their published ranges
│   ├── commands.ts       # searchable Azure CLI / PowerShell / git reference
│   ├── topics/<domain>/  # one file per lesson
│   └── questions/        # exam-bank questions, one file per domain
└── interview/topics/     # one folder per interview topic (azure-* and DevOps)
```

**[`docs/CONTENT_AUTHORING.md`](CONTENT_AUTHORING.md)** has the full rules, and `npm test` enforces them. It covers required lesson sections, diagram limits, id prefixes and question kinds, plus the complete lesson plan with every topic id.

- **Add a lesson:** create the file under `topics/<domain>/`, list it in that folder's `index.ts`, then run `npm test`.
- **Add a certification** (for example AZ-305): copy the shape of `az104/`, add the course to `courses.ts`, then add a chunk line in `vite.config.ts`. No UI changes are needed.

---

## Known limitations

- **Tasks aren't auto-graded.** Mock-exam tasks are self-verified against a checkpoint list; only multiple-choice and command questions are auto-scored.
- **Commands weren't run against Azure.** The Azure CLI, Bicep and KQL samples were written and reviewed, but not executed against a live subscription. If a command errors, check `az <group> --help`. Azure changes fast.
- **Labs create real resources.** Every lab ends with a cleanup step (usually `az group delete`). Run it, or you will be billed.
- **The Linux lab is a simulation.** It runs a JavaScript bash (just-bash) with mocked tools, not GNU bash on a real kernel; the quirks are listed under [Linux & Bash lab](#linux--bash-lab).
- **Progress stays in one browser.** Progress lives in one browser on one device. Use **Progress & data → Export** to move it.
- **iOS Safari clears unused sites.** In a Safari _tab_, storage for sites not opened for about 7 days is cleared. Installing the app to the Home Screen avoids this.

---

## Credits and trademarks

Based on the open DevOps Learning Hub app structure (its framework and its 13 DevOps interview topics are reused here). Microsoft, Azure, Microsoft Entra, Azure DevOps and GitHub are trademarks of their respective owners; this project is independent of all of them.
