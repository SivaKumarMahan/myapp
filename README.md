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
