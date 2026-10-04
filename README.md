# Azure Learning Hub

A study app for **Azure certifications** (AZ-900, AZ-104, AZ-400), **DevOps courses** (CKAD, Terraform Associate, Docker) and **Azure / DevOps job interviews**. It works on your computer and your phone, and keeps working without internet once it has been opened.

**Open it:** https://sivakumarmahan.github.io/myapp/

- Everything you do is saved **in your browser, on your device**. There is no account server and no tracking.
- It is an **independent learning tool**, not made or endorsed by Microsoft. All questions and labs were written for this app. None are real exam questions.

> Technical details (how it is built, how to add content, how to deploy) are in the [developer guide](docs/DEVELOPER_GUIDE.md).

---

## Contents

1. [Getting started](#1-getting-started)
2. [Finding your way around](#2-finding-your-way-around)
3. [A simple daily routine](#3-a-simple-daily-routine)
4. [Certification courses](#4-certification-courses)
5. [Remembering what you learn](#5-remembering-what-you-learn)
6. [Interview preparation](#6-interview-preparation)
7. [Hands-on practice](#7-hands-on-practice)
8. [See how things work: Visualise and the architecture builder](#8-see-how-things-work)
9. [Quick reference: glossary, cheat sheets, IaC compare](#9-quick-reference)
10. [Your career: Roles & skills](#10-roles--skills)
11. [The Study bot](#11-the-study-bot)
12. [Settings, your data and sync](#12-settings-your-data-and-sync)
13. [Running the app on your own computer](#13-running-the-app-on-your-own-computer)
14. [Questions and tips](#14-questions-and-tips)

---

## 1. Getting started

1. **Open the site** and type your **email address**. Only addresses on the app's allowed list can get in (the owner edits that list, see the developer guide).
2. **Install it** (optional, but recommended):
   - **iPhone:** open the site in Safari → **Share** → **Add to Home Screen**.
   - **Android:** in Chrome, tap **Install app**.
   - **Computer:** in Chrome or Edge, click the install icon in the address bar.
3. **Offline:** after you have opened it once online, it works without internet. (A few extras download the first time you use them, like Python. The app tells you when.)
4. **Updates:** when a new version is published, a banner says **Update available**. Tap it to reload. Your progress is kept.

Each email address has its **own progress**, even on a shared device.

---

## 2. Finding your way around

- **Sidebar** (computer): Home, Due today, Mistake notebook, My stats, Study bot, Roles & skills, Interview preparation, your courses, and all the tools.
- **Bottom tabs** (phone): Home, Interview, Course, Practice and Exams. For everything else, use **🔎 search** (below).
- **Search everything:** press **Ctrl + K** (**⌘ + K** on a Mac), or tap **🔎** in the top bar. Type anything (a lesson, a question, a command, a lab, a term) and press **Enter**. It copes with typos.
- **Top bar icons:**
  - 🔎 search everything;
  - 🧪 code playground;
  - 💾 progress & data (export / import);
  - ⚙️ settings;
  - 🌙 / ☀️ dark or light theme;
  - 🚪 sign out.
- **Home** shows your overall progress, your study streak, challenges solved, and warnings (for example, a lab you forgot to clean up).

---

## 3. A simple daily routine

1. Open **Due today** and review your flashcards (10-20 minutes).
2. Read **one lesson** in your course, and do its practice questions.
3. Do **one practical thing**: a challenge, a lab, a mock interview, or an incident lab.
4. Once a week, take a **mock exam** and check **My stats** for weak areas.

Set your daily goal and exam date in **⚙️ Settings**, and the app will tell you how much to do each day.

---

## 4. Certification courses

Six courses, with 158 lessons, 548 exam-style questions and 465 reference commands in total:

| Course                                       | Lessons | Questions | Commands |
| -------------------------------------------- | ------: | --------: | -------: |
| **AZ-900** Azure Fundamentals                |      13 |        78 |       30 |
| **AZ-104** Azure Administrator               |      21 |        97 |       81 |
| **AZ-400** DevOps Engineer                   |      18 |        95 |       56 |
| **CKAD** Kubernetes Application Developer    |      50 |       116 |      177 |
| **Terraform Associate (004)**                |      41 |       118 |       81 |
| **Docker** containers fundamentals (no exam) |      15 |        44 |       40 |

Every course works the same way:

| What                          | Where                          | How to use it                                                                                                                                                                                               |
| ----------------------------- | ------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Course dashboard**          | Click a course (e.g. AZ-104)   | Shows every exam area with its weight, your progress and readiness. Start from the top or click **Study this next**.                                                                                        |
| **Lessons**                   | Inside a course                | Each lesson explains the topic simply, then goes deeper: diagrams, examples, commands, common mistakes, exam tips, a summary, practice questions and a hands-on lab. Click **Mark as completed** when done. |
| **Glossary terms in lessons** | Underlined words in lessons    | Hover or tap an underlined term (like **NSG**) to see what it means and related lessons.                                                                                                                    |
| **Practice questions**        | Course tools → 🎯 Practice     | Questions by exam area. Before checking, say how sure you were (**Guessed / Unsure / Knew it**). That feeds your flashcards.                                                                                |
| **Mock exams**                | Course tools → ⏱️ Mock exams   | Timed exams weighted like the real one, scored per area. Review every answer afterwards. Your attempts are saved.                                                                                           |
| **Command reference**         | Course tools → ⌨️ Commands     | Azure CLI, PowerShell and Git commands with examples. Search or browse by group; copy with one click.                                                                                                       |
| **Search a course**           | Course tools → 🔎 Search       | Full-text search inside one course.                                                                                                                                                                         |
| **Cheat sheets**              | Course tools → 🖨️ Cheat sheets | A one-page summary per exam area. Click **Print / save as PDF** to keep a copy.                                                                                                                             |

> Exam weights come from the official study guides (Microsoft, CNCF). HashiCorp does not publish Terraform weights and Docker has no exam, so for those two the app shows its own study weights and says so. Always check the official exam page before you book (links are on each course dashboard).

---

## 5. Remembering what you learn

| What                  | Where                  | How to use it                                                                                                                                                                                             |
| --------------------- | ---------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Due today**         | Sidebar → 🔁 Due today | Smart flashcards. Every interview question and practice question becomes a card. After you see the answer, rate it **Again / Hard / Good / Easy**. Cards you find hard come back sooner, easy ones later. |
| **New cards per day** | ⚙️ Settings            | How many new cards to add each day (default 20).                                                                                                                                                          |
| **Mistake notebook**  | Sidebar → 📓           | Every wrong practice or mock-exam answer is collected here. Practise them again; a question leaves once you get it right without guessing.                                                                |
| **My stats**          | Sidebar → 📈           | Your **exam readiness score** (0-100), weak areas (heatmap), a calendar of study days, your streak, your daily goal, and an **exam countdown** that tells you how much to do per day.                     |

---

## 6. Interview preparation

**2,584 questions in 48 topics**: your own question bank, real interview rounds (Deloitte, ATC, SimCorp, InnovarTech, managerial), Azure topics and DevOps topics.

### The question bank (Sidebar → 💬 Interview preparation)

1. Pick a topic.
2. Read the question and **try to answer out loud first**.
3. Open the answer. Each question shows what the interviewer is testing, how to answer, code or diagrams, traps to avoid and likely follow-up questions.
4. Mark it **✓ I know this** or **↻ Needs review**. Everything marked "Needs review" collects in the **Revision queue**.
5. **🏷 Tag** a question (for example "Microsoft" or "Round 2") to build your own prep packs.
6. **🤖 Practise with the bot** sends the question to the Study bot to score your typed answer.

### More ways to practise (cards on the Interview preparation page)

| What                  | How to use it                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| --------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **🎤 Mock interview** | Choose a level, topics or a prep pack, the number of questions and the time per answer. Press **Start answering** and speak. Your answer is **recorded** (and written out as text, if your browser supports it), or you can type. Then tick the key points you actually said, rate yourself, and answer 1-2 follow-up questions ("why?", "what at 10x scale?"). Recordings stay on your device; listen to or delete them under **My recordings**. |
| **⭐ STAR stories**   | Write your behavioural stories as **Situation, Task, Action, Result** (plus what you learned). Link each story to the common questions it answers ("a production incident", "a conflict"…). **Coverage** shows questions with no story yet. **Quick review** runs through them before an interview.                                                                                                                                               |
| **🚨 Incident labs**  | Ten real-world problems (e.g. "pipeline gets 403 from ACR", "pods in ImagePullBackOff"). Choose what to check; each step shows new evidence. Find the root cause. You get a score for good steps, for being direct, and for the right answer.                                                                                                                                                                                                     |
| **🏢 Prep packs**     | Questions grouped by company: the real rounds are already packs, and every tag you add becomes a pack. Open a pack to revise it or start a mock interview from it.                                                                                                                                                                                                                                                                                |

---

## 7. Hands-on practice

All of these are in the sidebar. Solved challenges count on Home.

| Tool                       | What it is                                                                                                                                | How to use it                                                                                                                                                                                                                                                                                                                        |
| -------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **🛠️ Guided Azure labs**   | 10 step-by-step labs on **your own Azure subscription** (5 for AZ-104, 5 for AZ-400). A free account is enough.                           | Open a lab, read the **cost estimate**, copy each command into Azure Cloud Shell, and tick **Done**. Paste the output of a **Verify** command and press **Check output**. Tick the checklist. **Always run the cleanup at the end and press "I ran the cleanup"**, or you may be charged. Home warns you if a lab is not cleaned up. |
| **💻 Azure CLI simulator** | A pretend Azure terminal. Nothing touches real Azure.                                                                                     | Type `az` or PowerShell commands, e.g. `az group create -n demo -l westeurope`. Use **Tab** to complete and ↑/↓ for history. Try the 8 **Missions**.                                                                                                                                                                                 |
| **🐧 Linux & Bash lab**    | 62 real-world shell tasks on a pretend Linux server: logs, full disks, servers that are down, services that crash, alerts. Works offline. | Pick a challenge on the left, read the task, and type commands in the **Terminal** (or write a script in the **Script editor** and press **Save & run**). Press **Check my answer**. Hints unlock one at a time; **Show solution** explains every line.                                                                              |
| **🧰 Config lab**          | Checks pipeline YAML, Dockerfiles and Kubernetes files as you type.                                                                       | Paste a file, or pick an exercise, and fix the errors and warnings it shows. Pipelines are also drawn as a diagram. 12 exercises.                                                                                                                                                                                                    |
| **🌐 Networking lab**      | Plan subnets, test firewall (NSG) rules, and check which networks can reach each other.                                                   | Pick a tab and a scenario, then edit and watch the result. 13 scenarios.                                                                                                                                                                                                                                                             |
| **🗃️ SQL playground**      | A real SQL database in your browser with sample data.                                                                                     | Write a query and press **Ctrl + Enter**. Try the 26 **challenges** (hints unlock as you go).                                                                                                                                                                                                                                        |
| **📈 KQL simulator**       | Practise Kusto queries (used in Azure Monitor / Log Analytics).                                                                           | Query the sample tables and draw charts. 20 monitoring challenges. It is a simplified simulator; the page explains the differences.                                                                                                                                                                                                  |
| **🐍 Python playground**   | Python 3 running in your browser.                                                                                                         | Write code and press **Run**. The first run downloads Python (about 10 MB, once). 20 DevOps scripting challenges with tests.                                                                                                                                                                                                         |
| **🧪 Code playground**     | A scratchpad for **bash** and **Python**.                                                                                                 | On the website, Python runs in the browser and bash is not available. To run real **bash** and **python3** on your machine, run the app on your computer (see [section 13](#13-running-the-app-on-your-own-computer)).                                                                                                               |

### More about the 🐧 Linux & Bash lab

- **It's a pretend server.** You are `root` on a machine called `lab-01`. It has logs, configs, big files, about ten other servers you can `ping` and `ssh` to (some are down on purpose), services, Docker images, a Kubernetes cluster and an Azure subscription. Nothing is real and nothing leaves your browser.
- **Alerts go to the Outbox.** When your script sends an email (`mail`) or a Slack message (`curl` to a Slack webhook), it shows up in the **Outbox** tab instead of being sent.
- **How checking works.** The app runs your answer on fresh data and compares the **result** with the model answer: what was printed, which files were deleted or created, what alerts were sent and the exit code. Then it does the same on a **hidden variant** with different names, dates and broken servers. So your answer must really work; copying the output you saw is not enough. If something is wrong, it tells you exactly what, for example _"You deleted app-2026-09-30.log, but it's 4 days old - it should have been kept."_
- **Command or script?** For command tasks, type commands in the terminal, then press **Check my answer**. For script tasks (and bug fixes, where the broken script is already in the editor), write the script in the **Script editor**; checking runs it with several sets of arguments.
- **Made a mess?** Press **Reset environment** to get the server back as it was. Your scripts are kept.
- **🧪 Sandbox** (top of the list) is free play on the same server. Type `help` in the terminal to see every tool you can use.
- **Your progress** is saved in this browser under its own key, separate from the rest of your progress. Solved challenges also count in **Challenges solved** on Home ("Linux 0/62").

---

## 8. See how things work

### 🔭 Visualise (four interactive tools)

| Tool                      | How to use it                                                                                                                                                                                                                                                                                               |
| ------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **RBAC & Policy**         | A tree of management groups, subscriptions, resource groups and resources. Pick a person to see what access they have (and where it comes from). Give someone a role and see what it reaches. **Evaluate a request** to see step by step why Azure allows or blocks it. 14 "predict the outcome" exercises. |
| **Deployment strategies** | Watch blue-green, canary, rolling and ring deployments with moving "requests". Press **Next step** or **Play**, move the traffic slider, tick **v2 has a bug**, then press **Rollback**. A short quiz asks which strategy fits a situation.                                                                 |
| **Git branching**         | Type Git commands (`git commit`, `git switch -c feature`, `git merge`, `git rebase`, `git cherry-pick`, `git revert`, `git reset`…) and watch the commit graph change. 13 exercises, including GitFlow and trunk-based development.                                                                         |
| **Composite SLA**         | Build an architecture from Azure services, in a chain or in parallel (redundant). See the total SLA and how much downtime it allows per month. Presets and 5 exercises.                                                                                                                                     |

### 🏗️ Architecture builder

1. Add services from the palette (Users, Front Door, App Gateway, VMs, App Service, AKS, SQL, Storage, Key Vault, VNet, Private Endpoint, Log Analytics).
2. Drag them into place (or use the arrow keys).
3. Press **🔗 Connect**, then tap two services to join them.
4. Click a service to change its settings (region, instances, zones, WAF, backup…).
5. The **Design review** lists problems as you go: no firewall (WAF) on the public entry, no backup, secrets not in Key Vault, missing private endpoints, no monitoring, everything in one region…
6. Or **Start a scenario** (e.g. "Highly available web app, 99.99%"), meet its checklist, and **Compare with the model answer**.

Designs save automatically. Export them as **SVG** or **PNG**.

---

## 9. Quick reference

| What                | Where        | How to use it                                                                                                                                                                                     |
| ------------------- | ------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **📖 Glossary**     | Sidebar      | 90 Azure and DevOps terms. Search, filter by category, and open a term to see related lessons and interview questions.                                                                            |
| **🖨️ Cheat sheets** | Course tools | One printable page per exam area. Choose an area (or "All domains") and press **Print / save as PDF**.                                                                                            |
| **📐 IaC compare**  | Sidebar      | The same resource (storage account, VNet, App Service, Key Vault) written in **ARM JSON, Bicep and Terraform** side by side. Tap a concept to highlight it in all three and read how they differ. |

---

## 10. Roles & skills

Sidebar → 🧭 **Roles & skills**. Ten DevOps and cloud roles: DevOps, SRE, Cloud Engineer, Platform, DevSecOps, Architect, Kubernetes, MLOps, Build & Release, FinOps.

- **Roles:** what each role does and the tools it needs, with **coverage**: how much of its core skills your progress covers.
- **Role page:** a day in the life, skills by importance, certifications, what interviewers ask, and a **learning path** with **Practise this** links into the app.
- **Skills matrix:** all roles against all skill areas. Tap a cell to see the tools.
- **Compare:** pick 2-3 roles to see shared and unique skills.
- **My fit:** tick the skills you have. You get a match % for every role and your **top 5 gaps** to learn next.
- **Tool lookup:** type a tool (e.g. "Terraform") to see which roles need it.

---

## 11. The Study bot

Sidebar → 🤖 **Study bot**. A chat-style tutor that works **offline**: no AI service is used, and nothing you type leaves your device.

Tap a button or type what you want:

| Say or tap                                    | What happens                                                                                   |
| --------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| "interview me on AKS", **Mock interview**     | 6 questions; it scores your typed answers on key points, asks a follow-up, and gives a report. |
| **Evaluate an answer**                        | Scores one answer and points out common mistakes.                                              |
| "hint", "explain simpler", "analogy", "short" | Different ways to understand the current question.                                             |
| "what should I study today?"                  | Your plan for today from your progress.                                                        |
| **Rapid-fire**                                | 8 quick timed questions on what you are most likely to forget.                                 |
| **Troubleshooting**                           | The incident labs, in chat form.                                                               |
| Anything else                                 | Searches all 2,584 questions and shows short answers.                                          |

- 🎙️ **Voice input** uses your browser's speech service, which usually needs internet.
- **Smart search** (bot Settings) understands questions worded differently. It downloads about 30 MB once, then works offline.

---

## 12. Settings, your data and sync

### ⚙️ Settings

- **Study pace:** daily goal (questions or minutes) and new flashcards per day.
- **Exam dates:** set them to get a day-by-day plan in My stats.
- **Appearance:** light, dark, or match your device.
- **Reset:** type **RESET** to delete all your progress on this device.

### 💾 Progress & data (back up and move your progress)

- **Export** saves all your progress as a file.
- **Import** loads that file on another device or browser. Choose **merge** (combine both) or **replace**.

What is included: lessons, answers, flashcards, mistakes, exams, stats, challenges, roles ticks, designs, stories, tags and lab progress. **Not included:** mock-interview audio recordings (they stay on the device), and your GitHub token.

### Sync with GitHub (optional)

Keep two devices in step automatically, using a **secret gist** (a hidden note) in your GitHub account.

1. On GitHub: **Settings → Developer settings → Personal access tokens** → create a token with **only the `gist` permission** and a short expiry.
2. In the app: **⚙️ Settings → Sync with GitHub Gist** → paste the token → **Save and sync**.
3. On your other device, do the same with a token. It finds the same gist.
4. Press **Sync now** whenever you like, or tick **Sync automatically when the app opens**.

Good to know:

- When both devices changed the same thing, **the newest change wins**.
- The token stays **only in that browser**. It is never in your exports.
- A secret gist is hidden, not locked: **anyone with its link can read it**. Don't share the link.
- Deleting something on one device does not delete it on the other.

---

## 13. Running the app on your own computer

You need this for the **Code playground** to run real **bash** and **python3**. The website cannot run them, so it shows _"Shell commands need the local runner"_.

**On this computer** (the Node.js version needed is already installed in your home folder):

1. Open a terminal. In VS Code: **Terminal → New Terminal**.
2. Run:

   ```bash
   cd /home/nagasunilkumarrajulapati/Documents/A/Myapp/myapp
   export PATH=$HOME/.local/node-v22.23.3-linux-x64/bin:$PATH
   node -v          # should show v22
   npm install      # only the first time
   npm run dev
   ```

3. Open the address it prints, usually **http://localhost:5173**, and go to **🧪 Code playground**.
4. Keep the terminal open while you use it. Press **Ctrl + C** to stop.

Tips:

- The system's default Node (v12) is too old for this app, which is why you need the `export PATH=…` line. To make it permanent:
  ```bash
  echo 'export PATH=$HOME/.local/node-v22.23.3-linux-x64/bin:$PATH' >> ~/.bashrc
  ```
- **On another computer:** install **Node.js 20.19 or newer** from nodejs.org, download the project, then run `npm install` and `npm run dev` in the project folder.
- Scripts run **on your computer, as you**, in the folder `~/.azure-hub-playground`, for up to 60 seconds each. Only pages on your own computer can use this.

---

## 14. Questions and tips

**Where is my progress saved?**
In your browser, on that device, separately for each email address. Use **Export** (or GitHub sync) to back it up or move it.

**I lost my progress on iPhone.**
Safari deletes data for websites not opened for about 7 days. **Add the app to your Home Screen** to avoid this, and export now and then.

**Does it work offline?**
Yes, after one visit online. Python, Smart search and voice input need internet the first time (voice every time).

**Will the guided labs cost money?**
Most cost cents or nothing, but they create **real** Azure resources. Each lab shows an estimate. **Always run the cleanup.** Setting a budget alert in Azure is a good idea.

**Are the questions real exam questions?**
No. Everything is original. Use it to understand, then check the official exam guide (Microsoft, CNCF or HashiCorp) before the exam.

**Something looks wrong or out of date.**
Azure changes quickly. If a command or fact looks off, check the official Microsoft docs (links are in each course). Content changes are explained in the [developer guide](docs/DEVELOPER_GUIDE.md).

**Keyboard shortcuts**

| Keys                | Does                                       |
| ------------------- | ------------------------------------------ |
| Ctrl/⌘ + K          | Search everything                          |
| Ctrl/⌘ + Enter      | Run code (SQL, KQL, Python)                |
| ↑ / ↓ , Enter , Esc | Move, open, close in search                |
| Tab                 | Complete commands in the CLI               |
| Arrow keys          | Move a service in the architecture builder |

---

_Microsoft, Azure, Microsoft Entra, Azure DevOps and GitHub are trademarks of their owners. This project is independent of all of them._
