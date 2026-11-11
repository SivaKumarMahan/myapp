import type { InterviewQuestion } from '../../../types'

/** CGI round: GitHub Actions triggers and runners, Git internals and workflows, branch protection, pipeline reuse and vulnerability management. */
export const roundsCgiQuestions: InterviewQuestion[] = [
  {
    id: 'itv-rcgi-1',
    level: 'advanced',
    kind: 'open',
    prompt: 'What is `pull_request_target` in GitHub Actions?',
    probing:
      'Whether you know it runs base-branch code with secrets and a write token even for fork PRs, and that checking out and running the PR head in it is the classic "pwn request" vulnerability.',
    answer: [
      "`pull_request_target` is a workflow trigger that runs when a pull request is opened or updated, like `pull_request`, but it runs **in the context of the base branch** (the branch the PR wants to merge into), not the PR's code.",
      "- **Workflow file used**: `pull_request`: From the **PR's merge commit**; `pull_request_target`: From the **base branch**\n- **Code checked out by default**: `pull_request`: The PR's merge commit; `pull_request_target`: The **base branch**\n- **Secrets for PRs from forks**: `pull_request`: **No**; `pull_request_target`: **Yes**\n- **`GITHUB_TOKEN` for PRs from forks**: `pull_request`: Read-only; `pull_request_target`: **Read/write**\n- **Typical use**: `pull_request`: Build and test the PR; `pull_request_target`: Label, comment on, or triage PRs from forks",
      '**Why this trigger exists**',
      'PRs from forks run `pull_request` with no secrets and a read-only token, which is safe but means the workflow cannot comment on or label the PR. `pull_request_target` gives the workflow that access because it only runs **trusted code from the base branch**.',
      '**The big risk ("pwn request")**',
      "If a `pull_request_target` workflow **checks out the PR's code and runs it** (for example `npm install` or a build script), an attacker's fork can steal your secrets or push to your repo with the write token.",
      '**Safe example:** label PRs and run no PR code. `actions/labeler` only reads the changed file paths.',
      '**Good practices to follow**',
      "- Never check out and execute the PR's code in `pull_request_target`.\n- Set the smallest `permissions:` the job needs.\n- Do not put PR titles or branch names straight into `run:` scripts (script injection); pass them through `env:`.\n- To build untrusted code and then comment with secrets, use `pull_request` to build, then a separate `workflow_run` workflow to comment.",
      '**Interview-ready answer**',
      '"`pull_request_target` runs on pull request events but uses the workflow and code from the base branch, and it gets secrets and a write token even for PRs from forks. That makes it useful for labelling, commenting or triage on fork PRs. The risk is that if you check out and run the PR\'s code in it, an attacker can steal secrets. So I never execute PR code there, I keep permissions minimal, and for building fork PRs I use the normal `pull_request` trigger."',
    ],
    traps: [
      'Saying `pull_request_target` is "just `pull_request` for forks" - the difference is the trusted context, secrets and write token, which is exactly what makes it dangerous.',
      'Thinking minimal `permissions:` alone makes it safe: secrets are still exposed if PR code is executed.',
    ],
    followUps: [
      'How would you safely post test results as a PR comment for a fork PR?',
      'What is script injection in GitHub Actions and how does passing values through `env:` prevent it?',
      'How does the `workflow_run` trigger help separate untrusted builds from privileged steps?',
    ],
    code: [
      {
        title: 'DANGEROUS - do not do this',
        language: 'yaml',
        code: `# DANGEROUS - do not do this
on: pull_request_target
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          ref: \${{ github.event.pull_request.head.sha }}   # untrusted fork code
      - run: npm install && npm test                        # runs it with secrets`,
      },
      {
        title: 'Safe example: label PRs, run no PR code',
        language: 'yaml',
        code: `on:
  pull_request_target:
    types: [opened, synchronize]

permissions:
  contents: read
  pull-requests: write

jobs:
  label:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/labeler@v5        # reads changed file paths only`,
      },
    ],
    tags: ['github actions', 'pull_request_target', 'security', 'forks', 'ci/cd'],
  },
  {
    id: 'itv-rcgi-2',
    level: 'intermediate',
    kind: 'open',
    prompt: 'What are Git submodules?',
    probing:
      'That a submodule is a pinned commit pointer plus `.gitmodules`, how to clone and update it, how CI checks it out (including private-repo tokens), and when a package is the better choice.',
    answer: [
      "A **submodule** is another Git repository placed inside your repository at a fixed path. Your repo does not store the submodule's files; it stores **a pointer to one specific commit** of the other repo.",
      'Example: several services share a `common-terraform-modules` repo, and each service includes it as a submodule.',
      "**Main commands:** add a submodule, clone with submodules, initialise them after a plain clone, and move the pointer to the latest commit of the submodule's branch. The `.gitmodules` file records each submodule's path and URL.",
      '**In CI/CD:** enable submodule checkout in GitHub Actions (with a token if the submodule is a private repo) or in Azure Pipelines.',
      '**Pros and cons of submodules**',
      '- **Pros**: Reuse code from another repo; pinned to an exact commit, so builds are repeatable; each repo keeps its own history and permissions\n- **Cons**: Easy to forget `--recurse-submodules`, leaving empty folders; updates are manual: you must bump and commit the pointer; CI needs access to every submodule repo',
      'Alternatives: a **package** (npm, NuGet, a Terraform registry module), a Git **subtree**, or a monorepo.',
      '**Interview-ready answer**',
      '"A submodule is a separate Git repo embedded in my repo at a path, pinned to a specific commit. The URL and path are in `.gitmodules`. I clone with `--recurse-submodules` or run `git submodule update --init --recursive`, and in pipelines I enable submodule checkout and give a token if the repo is private. It keeps shared code versioned and repeatable, but updates are manual, so for shared libraries I often prefer publishing a package instead."',
    ],
    traps: [
      'Assuming `git pull` in the parent repo also updates submodules to their latest commits - it only moves the pinned pointer if someone committed a new one, and you still need `git submodule update`.',
    ],
    followUps: [
      'What is the difference between a submodule and a subtree?',
      'How do you give a pipeline access to a private submodule repository?',
      'Why might you publish a package instead of using a submodule for shared code?',
    ],
    code: [
      {
        title: 'Main submodule commands',
        language: 'bash',
        code: `# Add a submodule
git submodule add https://github.com/org/shared-lib.git libs/shared-lib
git commit -m "Add shared-lib submodule"     # commits .gitmodules and the pinned commit

# Clone a repo together with its submodules
git clone --recurse-submodules https://github.com/org/app.git

# Already cloned without them
git submodule update --init --recursive

# Move the submodule to the latest commit of its branch
git submodule update --remote libs/shared-lib
git add libs/shared-lib
git commit -m "Bump shared-lib"`,
      },
      {
        title: '.gitmodules',
        language: 'text',
        code: `[submodule "libs/shared-lib"]
    path = libs/shared-lib
    url = https://github.com/org/shared-lib.git`,
      },
      {
        title: 'GitHub Actions: check out submodules',
        language: 'yaml',
        code: `# GitHub Actions
- uses: actions/checkout@v4
  with:
    submodules: recursive
    token: \${{ secrets.SUBMODULE_PAT }}   # needed if the submodule is a private repo`,
      },
      {
        title: 'Azure Pipelines: check out submodules',
        language: 'yaml',
        code: `# Azure Pipelines
steps:
  - checkout: self
    submodules: recursive`,
      },
    ],
    tags: ['git', 'submodules', 'ci/cd', 'repositories'],
  },
  {
    id: 'itv-rcgi-3',
    level: 'intermediate',
    kind: 'open',
    prompt: 'What is Git LFS?',
    probing:
      'Pointer files versus the LFS server, tracking rules in `.gitattributes`, migrating existing history, enabling LFS in pipeline checkout, and the storage and bandwidth quotas.',
    answer: [
      '**Git LFS (Large File Storage)** is a Git extension for **large binary files** such as images, videos, datasets, models and installers.',
      'Git stores every version of every file in history, so large binaries make the repo slow to clone and can hit size limits. With LFS:',
      '- The repo stores a small **pointer file** (a few lines of text) instead of the binary.\n- The real file is stored on an **LFS server** (GitHub, Azure Repos and GitLab all provide one).\n- The file is downloaded when you check out a branch that needs it.',
      '**Commands:** install LFS once per machine, track file patterns, and commit `.gitattributes`, where the tracking rules are stored.',
      '**Moving files that are already in history:** `git lfs migrate import` rewrites history, so a force-push is needed and everyone must re-clone or reset.',
      '**In CI/CD:** enable LFS in the checkout step in GitHub Actions or Azure Pipelines.',
      '**Things to know in practice**',
      '- LFS has **storage and bandwidth quotas** on hosted platforms; CI downloads count toward bandwidth.\n- Without `git lfs install`, you get the pointer text instead of the real file.\n- LFS is for binaries; it does not help with large text files that diff well.',
      '**Interview-ready answer**',
      '"Git LFS keeps large binary files out of normal Git history. The repo stores a small pointer, the real file sits on an LFS server, and it is downloaded on checkout. I run `git lfs install`, track patterns like `*.zip` with `git lfs track`, commit `.gitattributes`, and enable LFS in the pipeline checkout. For files already committed, `git lfs migrate` rewrites history. I keep an eye on storage and bandwidth quotas, because pipelines download LFS files too."',
    ],
    traps: [
      'Running `git lfs track` after the big file is already committed does not shrink the repo - the old blobs stay in history until you run `git lfs migrate`.',
    ],
    followUps: [
      'A build fails because a model file contains only three lines of text. What happened?',
      'How do you reduce LFS bandwidth used by CI pipelines?',
      'What is the impact of `git lfs migrate import --everything` on other developers?',
    ],
    code: [
      {
        title: 'Git LFS commands',
        language: 'bash',
        code: `git lfs install                     # once per machine
git lfs track "*.psd"               # track a file type
git lfs track "models/**"
git add .gitattributes              # the tracking rules are stored here
git add design.psd
git commit -m "Add design file with LFS"
git push

git lfs ls-files                    # list files stored in LFS
git lfs pull                        # download LFS files for the current checkout`,
      },
      {
        title: '.gitattributes after tracking',
        language: 'text',
        code: `*.psd filter=lfs diff=lfs merge=lfs -text`,
      },
      {
        title: 'Move files already in history to LFS',
        language: 'bash',
        code: `git lfs migrate import --include="*.zip" --everything   # rewrites history; force-push needed`,
      },
      {
        title: 'GitHub Actions: enable LFS',
        language: 'yaml',
        code: `# GitHub Actions
- uses: actions/checkout@v4
  with:
    lfs: true`,
      },
      {
        title: 'Azure Pipelines: enable LFS',
        language: 'yaml',
        code: `# Azure Pipelines
- checkout: self
  lfs: true`,
      },
    ],
    tags: ['git', 'git lfs', 'binaries', 'ci/cd'],
  },
  {
    id: 'itv-rcgi-4',
    level: 'intermediate',
    kind: 'open',
    prompt: 'What is the difference between merge and rebase?',
    probing:
      'How each shapes history, that rebase rewrites commit IDs, the golden rule about shared branches, and safe force-pushing with `--force-with-lease`.',
    answer: [
      'Both bring changes from one branch into another, but they shape history differently.',
      'Starting point: `feature` branched from `main`, and both have new commits.',
      '**Merge** (`git checkout feature && git merge main`) creates a **merge commit** and keeps both histories.',
      "**Rebase** (`git checkout feature && git rebase main`) **replays your commits on top of** `main`, creating new commits A' and B'.",
      "- **History**: Merge: Keeps the real history, with merge commits; Rebase: Linear and clean\n- **Rewrites commits**: Merge: No; Rebase: **Yes**: new commit IDs\n- **Safe on shared branches**: Merge: **Yes**; Rebase: **No**: others' copies break\n- **Conflicts**: Merge: Resolved once, in the merge commit; Rebase: May be resolved commit by commit\n- **Shows when a branch was merged**: Merge: Yes; Rebase: No",
      '**The golden rule of rebasing**',
      '**Do not rebase commits that others have already pulled** (for example `main` or a shared branch). Rebase your own local or personal feature branch only.',
      '**What I do in my projects**',
      '- Rebase my feature branch on `main` before opening or updating a PR, to keep it current and linear.\n- Merge (through the PR) into `main`, often with squash.\n- Use `git pull --rebase` to avoid unneeded merge commits when syncing.',
      '**Interview-ready answer**',
      '"Merge combines two branches with a merge commit and keeps the full history, without rewriting anything. Rebase replays my commits on top of the target branch, giving a linear history but creating new commit IDs. Because rebase rewrites history, I only rebase my own feature branches, then push with `--force-with-lease`, and I never rebase shared branches like main. Into main I merge through a pull request."',
    ],
    traps: [
      'Using plain `--force` after a rebase: `--force-with-lease` refuses to overwrite commits someone else pushed in the meantime.',
    ],
    followUps: [
      'Why is `--force-with-lease` safer than `--force`?',
      'What does an interactive rebase (`git rebase -i`) let you do before opening a PR?',
      'How do you recover if a rebase goes wrong? (hint: `git reflog`)',
    ],
    code: [
      {
        title: 'Starting point',
        language: 'text',
        code: `          A---B  feature
         /
    C---D---E    main`,
      },
      {
        title: 'After merge',
        language: 'text',
        code: `          A---B---M  feature
         /       /
    C---D---E----`,
      },
      {
        title: 'After rebase',
        language: 'text',
        code: `                  A'--B'  feature
                 /
    C---D---E          main`,
      },
      {
        title: 'Merge and rebase commands',
        language: 'bash',
        code: `# Merge
git checkout feature
git merge main

# Rebase
git checkout feature
git rebase main
# fix conflicts, then
git add .
git rebase --continue          # or git rebase --abort
git push --force-with-lease    # needed because the commits changed`,
      },
    ],
    tags: ['git', 'merge', 'rebase', 'branching'],
  },
  {
    id: 'itv-rcgi-5',
    level: 'basic',
    kind: 'open',
    prompt: 'What is `git stash`?',
    probing:
      'The context-switch use case, the key commands, `pop` versus `apply`, untracked files needing `-u`, and that stashes are local only.',
    answer: [
      '`git stash` **saves your uncommitted changes** in a temporary area and returns your working directory to a clean state, so you can switch tasks and come back later.',
      '**Typical scenario:** you are halfway through a feature, and you need to fix an urgent bug on another branch. You do not want to commit half-done work.',
      '- **Re-applies changes**: `pop`: Yes; `apply`: Yes\n- **Removes from stash list**: `pop`: Yes (if no conflict); `apply`: No',
      '**Things to know in practice**',
      '- Stashes are **local only**; they are not pushed to the remote.\n- By default untracked and ignored files are **not** stashed; use `-u` (or `-a` for ignored too).\n- If `pop` hits a conflict, the stash is kept so you do not lose it.',
      '**Interview-ready answer**',
      '"`git stash` saves my uncommitted changes and gives me a clean working directory, so I can switch branches, for example to fix an urgent bug. I use `git stash push -m` with a message, `-u` to include new files, `git stash list` to see them, and `pop` or `apply` to bring them back. `pop` removes the stash, `apply` keeps it. Stashes are local only, so for anything long-lived I commit to a branch instead."',
    ],
    code: [
      {
        title: 'git stash commands',
        language: 'bash',
        code: `git stash push -m "WIP: login form"   # save changes (tracked files only)
git stash -u                          # also include untracked (new) files
git stash list                        # stash@{0}: On feature: WIP: login form

git checkout hotfix-branch            # do the urgent work
git checkout feature                  # come back

git stash pop                         # re-apply the latest stash AND remove it
git stash apply stash@{1}             # re-apply a stash but KEEP it in the list
git stash show -p stash@{0}           # see what is inside
git stash drop stash@{0}              # delete one stash
git stash clear                       # delete all stashes
git stash branch new-branch stash@{0} # create a branch from a stash
git stash push -- src/app.js          # stash only some files`,
      },
    ],
    tags: ['git', 'stash', 'workflow'],
  },
  {
    id: 'itv-rcgi-6',
    level: 'advanced',
    kind: 'scenario',
    prompt: 'How do you handle vulnerability management in CI/CD?',
    probing:
      'Shift-left coverage at every stage (secrets, SAST, SCA, IaC, image, DAST, runtime), gates on fixable Critical/High findings, and the process around the tools: triage, documented exceptions, SLAs, automated updates and securing the pipeline itself.',
    answer: [
      'The idea is **shift left**: find vulnerabilities as early as possible, block the serious ones automatically, and keep watching after deployment.',
      '**What I scan, and where**',
      '- **Developer machine / pre-commit**: What it finds: Secrets, lint, early issues; Tools: pre-commit hooks, IDE plugins (Snyk, SonarLint)\n- **Push**: What it finds: Committed secrets; Tools: GitHub **secret scanning with push protection**, Gitleaks\n- **Pull request**: What it finds: Code flaws (**SAST**); Tools: **CodeQL**, SonarQube, Semgrep\n- **Pull request**: What it finds: Vulnerable dependencies (**SCA**); Tools: **Dependabot**, `dependency-review-action`, Snyk, OWASP Dependency-Check\n- **Pull request**: What it finds: IaC misconfigurations; Tools: **Checkov**, tfsec/Trivy config, KICS\n- **Build**: What it finds: Container image CVEs; Tools: **Trivy**, Grype, Microsoft Defender for Containers\n- **Build**: What it finds: Inventory and trust; Tools: **SBOM** (Syft), image **signing** (Cosign / Notation)\n- **After deploy to test**: What it finds: Running-app flaws (**DAST**); Tools: OWASP ZAP\n- **Runtime**: What it finds: New CVEs in what is already deployed; Tools: Defender for Cloud, registry rescans, Dependabot alerts',
      '**Example:** fail the build on critical CVEs with Trivy, and fail the PR on high-severity vulnerable dependencies with dependency review.',
      '**The process around the tools**',
      '1. **Gate:** block merges or releases on **Critical/High** findings with a fix available (required status checks).\n2. **Triage:** decide if a finding is real and reachable; record accepted risks with an expiry date (for example a `.trivyignore` entry with a ticket).\n3. **Fix with SLAs:** for example Critical in 7 days, High in 30 days.\n4. **Automate updates:** Dependabot or Renovate PRs for dependencies and base images.\n5. **Report:** central view of findings, such as GitHub Security tab, Defender for Cloud or DefectDojo.\n6. **Pipeline security itself:** least-privilege tokens, OIDC instead of stored secrets, pinned action versions, protected branches.',
      '**Interview-ready answer**',
      '"I build security into each stage of the pipeline. Secret scanning with push protection stops credentials early. On pull requests I run SAST with CodeQL, dependency scanning with Dependabot and dependency review, and IaC scanning with Checkov. At build time Trivy scans the container image, and I generate an SBOM and sign the image. Critical and high findings with a fix fail the pipeline through required checks. Findings are triaged, exceptions are documented with an expiry, and we fix within agreed SLAs. After deployment, Defender for Cloud keeps scanning for new CVEs."',
    ],
    deeper: [
      'Pin third-party actions, including security scanners, to a full commit SHA rather than a mutable tag; scanner actions run with access to your registry and tokens, so a hijacked tag is a supply-chain attack on every pipeline that uses it.',
      'An image that passed its scan at build time can become vulnerable next week. Continuous registry and runtime scanning, plus a scheduled rebuild on a patched base image, closes that gap.',
    ],
    traps: [
      'Failing the build on every finding, including unfixed and unreachable ones - teams quickly learn to bypass the gate. Gate on fixable Critical/High and triage the rest.',
      'Treating a scan at build time as enough: new CVEs are published against images that are already running.',
    ],
    followUps: [
      'A critical CVE has no fix yet but blocks a release. What do you do?',
      'What is an SBOM and how would you use it when a new CVE like Log4Shell is announced?',
      'How do you stop developers from simply adding everything to `.trivyignore`?',
    ],
    code: [
      {
        title: 'Fail the build on critical CVEs',
        language: 'yaml',
        code: `- name: Scan image
  uses: aquasecurity/trivy-action@0.28.0
  with:
    image-ref: myacr.azurecr.io/api:\${{ github.sha }}
    severity: CRITICAL,HIGH
    exit-code: "1"              # fail the job
    ignore-unfixed: true        # don't block on CVEs with no fix yet

- name: Dependency review
  uses: actions/dependency-review-action@v4
  with:
    fail-on-severity: high`,
      },
      {
        title: 'Shift-left scanning flow',
        language: 'text',
        code: `Pre-commit   -> secrets, lint (IDE plugins, hooks)
Push         -> secret scanning with push protection
Pull request -> SAST (CodeQL), SCA (Dependabot), IaC (Checkov)
Build        -> image scan (Trivy), SBOM, image signing
Test env     -> DAST (OWASP ZAP)
Runtime      -> Defender for Cloud, registry rescans`,
      },
    ],
    tags: ['devsecops', 'vulnerability management', 'trivy', 'codeql', 'dependabot', 'sbom'],
  },
  {
    id: 'itv-rcgi-7',
    level: 'intermediate',
    kind: 'open',
    prompt: 'What is the difference between GitHub-hosted and self-hosted runners?',
    probing:
      'Management, isolation, network reach, cost and caching trade-offs, when self-hosted is justified, and how to run self-hosted runners safely (ephemeral ARC runners, runner groups, never on public repos).',
    answer: [
      'A **runner** is the machine that runs a GitHub Actions job.',
      '- **Who manages it**: GitHub-hosted: **GitHub**: patching, images, scaling; Self-hosted: **You**: OS, tools, updates, scaling\n- **Environment**: GitHub-hosted: **Fresh VM for every job**, then destroyed; Self-hosted: Usually **persistent** (unless you make it ephemeral)\n- **Pre-installed tools**: GitHub-hosted: Many (Docker, Node, Python, Azure CLI, …); Self-hosted: Only what you install\n- **Network access**: GitHub-hosted: Public internet only (larger runners can be connected to an Azure VNet with Azure private networking); Self-hosted: Can reach **private networks** (private AKS, databases, on-prem)\n- **Hardware**: GitHub-hosted: Standard sizes; larger runners and GPU cost extra; Self-hosted: Any hardware you choose\n- **Cost**: GitHub-hosted: Per-minute billing beyond free minutes (free for public repos); Self-hosted: No GitHub minute charges; you pay for the infrastructure\n- **Caching**: GitHub-hosted: Lost after each job (use `actions/cache`); Self-hosted: Local caches persist, so builds can be faster\n- **Security**: GitHub-hosted: Isolated and clean every run; Self-hosted: You must harden it; leftover files can leak between jobs\n- **Setup**: GitHub-hosted: None: `runs-on: ubuntu-latest`; Self-hosted: Install the runner agent, register it, add labels',
      '**When I choose self-hosted**',
      '- The job must reach **private resources**: a private AKS API server, a database or Key Vault with private endpoints, on-prem systems.\n- **Special hardware or software**: GPUs, licensed tools, a specific OS.\n- **Compliance**: builds must run inside our network or region.\n- **Cost** at very high build volume.',
      '**Running self-hosted runners well**',
      '- Use **Actions Runner Controller (ARC)** on Kubernetes, or VM scale sets, for **ephemeral** runners that autoscale and are destroyed after each job.\n- Put them in **runner groups** limited to specific repositories.\n- **Do not use self-hosted runners with public repositories**: anyone can open a PR that runs code on your machine.\n- Keep the OS and runner version patched; give them a managed identity with least privilege.',
      '**Interview-ready answer**',
      '"GitHub-hosted runners are managed by GitHub. Each job gets a fresh, clean VM with common tools, and you pay per minute. Self-hosted runners are machines I manage. I use them when jobs need to reach private resources like a private AKS cluster or private endpoints, or need special hardware. The trade-off is that I own patching, security and scaling. So I run them as ephemeral, autoscaling runners with Actions Runner Controller, restrict them with runner groups, and never attach them to public repositories."',
    ],
    traps: [
      'Attaching a persistent self-hosted runner to a public repository: any fork PR can run arbitrary code on it and persist on the machine.',
    ],
    followUps: [
      'How does Actions Runner Controller scale runners on AKS?',
      'How would a self-hosted runner authenticate to Azure without stored secrets?',
      'What is the equivalent concept in Azure DevOps, and how do Managed DevOps Pools fit in?',
    ],
    code: [
      {
        title: 'Choosing a runner',
        language: 'yaml',
        code: `jobs:
  build:
    runs-on: ubuntu-latest                       # GitHub-hosted

  deploy:
    runs-on: [self-hosted, linux, azure-vnet]    # self-hosted, chosen by labels`,
      },
    ],
    tags: ['github actions', 'runners', 'self-hosted', 'arc', 'ci/cd'],
  },
  {
    id: 'itv-rcgi-8',
    level: 'intermediate',
    kind: 'open',
    prompt: 'What is the difference between a squash commit and a merge commit?',
    probing:
      'What lands on main in each case, the effect on revert and bisect, the branch-afterwards gotcha with squash, rebase-and-merge as a third option, and enforcing merge types with policies.',
    answer: [
      'These are two ways to complete a pull request.',
      'Feature branch with 4 commits: `wip`, `fix typo`, `add tests`, `address review`.',
      '**Merge commit** keeps all 4 commits and adds a merge commit. **Squash merge** combines all 4 commits into **one new commit** on `main`.',
      '- **Commits added to main**: Merge commit: All feature commits + 1 merge commit; Squash merge: **1 commit**\n- **History**: Merge commit: Full detail, non-linear; Squash merge: **Clean and linear**, one commit per PR\n- **Keeps individual commits**: Merge commit: Yes; Squash merge: No (they stay only on the deleted branch/PR)\n- **Revert a whole feature**: Merge commit: Revert the merge commit (`git revert -m 1 <merge>`); Squash merge: Revert one commit: easy\n- **`git bisect`**: Merge commit: Can land on small "wip" commits; Squash merge: Each commit is a whole, working change\n- **Branch afterwards**: Merge commit: Git knows it is merged; Squash merge: Git does not see it as merged; delete the branch, don\'t keep using it',
      'There is also a third option, **rebase and merge**: each feature commit is replayed onto `main` with no merge commit (linear history, all commits kept).',
      '**When I use which merge type**',
      '- **Squash**: most feature PRs, where the individual commits are noisy. One PR = one commit on `main`.\n- **Merge commit**: merging long-lived branches (for example `release` back into `main`) where the separate commits matter.\n- In GitHub and Azure DevOps, you can **limit the allowed merge types** with branch protection or branch policies.',
      '**Interview-ready answer**',
      '"A merge commit brings all the branch\'s commits into main and adds a merge commit, so the full history is kept. A squash merge combines all the PR\'s commits into one new commit on main, giving a clean, linear history where each commit is one feature and is easy to revert. I use squash for normal feature PRs and a merge commit for long-lived branches like release branches, and I enforce the allowed merge types through branch policies."',
    ],
    traps: [
      'Continuing to work on a branch after it was squash-merged: Git does not see the old commits as merged, so the next PR shows them again and conflicts.',
    ],
    followUps: [
      'Why does reverting a merge commit need `-m 1`?',
      'When would you choose rebase and merge over squash?',
      'How do you restrict merge types in Azure DevOps?',
    ],
    code: [
      {
        title: 'Merge commit',
        language: 'text',
        code: `main:  ---o---o-----------M
               \\         /
feature:        1--2--3--4`,
      },
      {
        title: 'Squash merge',
        language: 'text',
        code: `main:  ---o---o---S        (S = all changes from 1-4)`,
      },
      {
        title: 'Squash or merge locally',
        language: 'bash',
        code: `# Squash locally
git checkout main
git merge --squash feature
git commit -m "Add login page (#42)"

# Merge commit locally
git merge --no-ff feature`,
      },
    ],
    tags: ['git', 'squash', 'merge', 'pull requests'],
  },
  {
    id: 'itv-rcgi-9',
    level: 'basic',
    kind: 'open',
    prompt: 'What is a CODEOWNERS file?',
    probing:
      'Automatic reviewer requests, enforcing approval through branch protection, file location and last-match-wins ordering, and the Azure DevOps equivalent.',
    answer: [
      '`CODEOWNERS` is a file that says **which people or teams own which files** in a repository. When a PR changes those files, the owners are **automatically requested as reviewers**, and with branch protection their **approval can be required**.',
      "**Where to put it:** `.github/CODEOWNERS`, the repository root, or `docs/CODEOWNERS`. GitHub uses the first one it finds in that order. It applies on the PR's **base branch**.",
      '**Rules to remember**',
      '- Syntax is like `.gitignore`.\n- **The last matching pattern wins**, so put general rules at the top and specific ones at the bottom.\n- Owners must have **write access** to the repo; teams must be visible.\n- To enforce it, turn on **"Require review from Code Owners"** in branch protection or a ruleset.\n- Protect the CODEOWNERS file itself by giving it an owner, so nobody can quietly remove themselves from reviews.',
      '**Azure DevOps:** Azure Repos does not read a CODEOWNERS file. The same result comes from the branch policy **"Automatically included reviewers"**, with a path filter (for example `/infra/*`) and the option to make them required.',
      '**Interview-ready answer**',
      "\"CODEOWNERS maps file paths to the people or teams who own them. When a PR touches those paths, the owners are added as reviewers automatically, and with 'Require review from Code Owners' in branch protection, the PR can't merge without their approval. I keep it in `.github/CODEOWNERS`, remember that the last matching pattern wins, and use it so that, for example, the DevOps team must approve workflow changes and the cloud team must approve Terraform. In Azure DevOps I get the same with automatically included reviewers and path filters.\"",
    ],
    traps: [
      'Putting the catch-all `*` rule at the bottom: because the last match wins, it overrides every specific rule above it.',
    ],
    code: [
      {
        title: 'Example CODEOWNERS',
        language: 'text',
        code: `# Default owner for everything
*                       @org/platform-team

# Terraform
/infra/                 @org/cloud-team

# Pipelines must be approved by DevOps
/.github/workflows/     @org/devops-team

# All SQL files, anywhere
*.sql                   @org/dba-team

# One file, one person
/src/payments/config.yaml   @alice @org/payments-team`,
      },
    ],
    tags: ['github', 'codeowners', 'code review', 'branch protection'],
  },
  {
    id: 'itv-rcgi-10',
    level: 'intermediate',
    kind: 'open',
    prompt: 'What are branch policies?',
    probing:
      'The concrete Azure DevOps policies (reviewers, work items, comment resolution, merge types, build validation, status checks, auto reviewers), that they block direct pushes, and the GitHub equivalents including rulesets.',
    answer: [
      '**Branch policies** are rules on important branches (like `main` or `release/*`) that **control how code gets in**. They force changes to go through a pull request that meets quality checks. In Azure DevOps they are called **branch policies**; in GitHub they are **branch protection rules** or **rulesets**.',
      '**Azure DevOps branch policies**',
      '- **Require a minimum number of reviewers**: For example 2 approvals; options to block self-approval and reset votes on new pushes\n- **Check for linked work items**: Every PR must link a Boards work item\n- **Check for comment resolution**: All PR comments must be resolved\n- **Limit merge types**: Allow only squash, for example\n- **Build validation**: A pipeline must pass on the PR before it can complete\n- **Status checks**: An external service (for example SonarQube) must post a success status\n- **Automatically included reviewers**: Add reviewers by path (for example `/infra/*`), optional or required',
      'When any policy is set, **direct pushes to the branch are blocked**; changes must come through a PR. Bypass permission should be given to very few people.',
      '**GitHub equivalents**',
      '- **Require a pull request before merging**: No direct pushes\n- **Required approvals, dismiss stale approvals**: Approval count; new commits reset approvals\n- **Require review from Code Owners**: Owners from CODEOWNERS must approve\n- **Require status checks to pass**: CI jobs must succeed; optionally branch must be up to date\n- **Require conversation resolution**: All comments resolved\n- **Require signed commits / linear history**: Signed commits; no merge commits\n- **Block force pushes and deletions**: Protects history\n- **Rulesets**: The same rules, applied across **many repos and branches** at org level, with bypass lists',
      '**Interview-ready answer**',
      '"Branch policies protect important branches like main. In Azure DevOps I set a minimum of two reviewers, required linked work items, comment resolution, build validation so the PR pipeline must pass, limited merge types, and automatically included reviewers for sensitive paths. Once a policy is on, nobody can push directly; everything goes through a PR. In GitHub I do the same with branch protection or rulesets, plus required status checks and code owner review."',
    ],
    traps: [
      'Giving "Bypass policies" permission to a broad group such as all project administrators - it silently defeats every policy.',
    ],
    followUps: [
      'How do you apply the same branch rules across 200 repositories?',
      'What is the difference between build validation and a status check policy?',
      'How would you allow an emergency hotfix without permanently weakening the policy?',
    ],
    code: [
      {
        title: 'Set a minimum-reviewers policy with the Azure DevOps CLI',
        language: 'bash',
        code: `az repos policy approver-count create \\
  --repository-id <repo-id> \\
  --branch main \\
  --minimum-approver-count 2 \\
  --creator-vote-counts false \\
  --reset-on-source-push true \\
  --allow-downvotes false \\
  --blocking true \\
  --enabled true`,
      },
    ],
    tags: ['azure devops', 'branch policies', 'github', 'rulesets', 'pull requests'],
  },
  {
    id: 'itv-rcgi-11',
    level: 'advanced',
    kind: 'scenario',
    prompt: 'How do you avoid duplicating YAML code in workflows across repositories?',
    probing:
      'Reusable workflows versus composite actions in GitHub, repository-resource templates and `extends` with a required-template check in Azure DevOps, and versioning shared templates with tags so one change does not break every repo.',
    answer: [
      'When many repositories have nearly the same pipeline, copying YAML means every fix must be made in every repo. Instead, **write it once in a central repo and reuse it**.',
      '**Option A: GitHub Actions**',
      '**1. Reusable workflows** (reuse whole jobs): a central repo `org/ci-templates` holds `.github/workflows/dotnet-build.yml` with an `on: workflow_call` trigger, inputs and secrets. Any repo calls it with `uses:` at job level, pinned to a tag.',
      '**2. Composite actions** (reuse a group of steps inside a job): an `action.yml` with `runs: using: composite`, called with `uses:` as a step.',
      '**3. Other options in GitHub**',
      "- **Workflow templates** in the org's `.github` repo, so new repos start from a standard file.\n- **Rulesets with required workflows**, to force a security scan in every repo.\n- **Matrix** strategy, to avoid repeating the same job for each version or environment.",
      "- **Reuses**: Reusable workflow: Whole **jobs**; Composite action: **Steps** inside one job\n- **Can set `runs-on`**: Reusable workflow: Yes; Composite action: No (runs on the caller's runner)\n- **Secrets**: Reusable workflow: Passed with `secrets:` or `secrets: inherit`; Composite action: Passed as inputs",
      '**Option B: Azure DevOps.** Use **templates** in a central repo, referenced as a repository resource. Step, job, stage and variable templates are all possible. `extends` templates, together with a "Required template" check on environments, can **enforce** that every pipeline uses the approved template.',
      '**Good practices to follow**',
      '- **Version** the shared templates with tags (`@v1`, `ref: refs/tags/v1.2.0`) so a change does not break every repo at once.\n- Use **parameters/inputs** instead of copy-pasting small differences.\n- Document the templates and test changes before tagging a new version.',
      '**Interview-ready answer**',
      '"I keep shared pipeline logic in a central templates repo instead of copying YAML. In GitHub Actions I use reusable workflows with `workflow_call` for whole jobs and composite actions for common steps, and repos call them pinned to a version tag with inputs and `secrets: inherit`. In Azure DevOps I use step, job and stage templates from a repository resource, and `extends` templates with a required-template check to enforce standards. A fix in one place reaches every repo when they move to the new version."',
    ],
    traps: [
      'Referencing shared templates by `@main`: one bad commit to the template repo breaks every pipeline in the organisation at once.',
      'Using `secrets: inherit` everywhere by default - it passes every secret the caller can see; pass only what the workflow needs when the template is owned by another team.',
    ],
    followUps: [
      'How do you roll out a breaking change to a shared template used by 100 repos?',
      'When would you choose a composite action over a reusable workflow?',
      'How does an `extends` template with a required-template check stop teams from skipping security scans?',
    ],
    code: [
      {
        title: 'Reusable workflow: org/ci-templates/.github/workflows/dotnet-build.yml',
        language: 'yaml',
        code: `on:
  workflow_call:
    inputs:
      project:
        type: string
        required: true
    secrets:
      SONAR_TOKEN:
        required: false

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: dotnet build \${{ inputs.project }}
      - run: dotnet test \${{ inputs.project }}`,
      },
      {
        title: 'Calling the reusable workflow from any repo',
        language: 'yaml',
        code: `jobs:
  ci:
    uses: org/ci-templates/.github/workflows/dotnet-build.yml@v1
    with:
      project: src/Api/Api.csproj
    secrets: inherit`,
      },
      {
        title: 'Composite action: org/actions/setup-tools/action.yml',
        language: 'yaml',
        code: `# org/actions/setup-tools/action.yml
name: Setup tools
runs:
  using: composite
  steps:
    - uses: azure/login@v2
      with: { client-id: ..., tenant-id: ..., subscription-id: ... }
    - run: az aks install-cli
      shell: bash`,
      },
      {
        title: 'Using the composite action',
        language: 'yaml',
        code: `steps:
  - uses: org/actions/setup-tools@v1`,
      },
      {
        title: 'Azure DevOps: extends a template from a central repo',
        language: 'yaml',
        code: `resources:
  repositories:
    - repository: templates
      type: git
      name: Platform/pipeline-templates
      ref: refs/tags/v1.2.0

extends:
  template: dotnet-pipeline.yml@templates
  parameters:
    project: src/Api/Api.csproj`,
      },
    ],
    tags: [
      'github actions',
      'azure devops',
      'reusable workflows',
      'composite actions',
      'templates',
    ],
  },
  {
    id: 'itv-rcgi-12',
    level: 'basic',
    kind: 'open',
    prompt: 'What is `git cherry-pick`?',
    probing:
      'Copying specific commits as new commits, the hotfix/backport use case, `-x` for traceability, conflict handling, and why it is the wrong tool for regularly syncing branches.',
    answer: [
      '`git cherry-pick` **copies one or more specific commits** from one branch and applies them to your current branch as **new commits**, without merging the whole branch.',
      '**Typical use case:** a bug fix was committed to `main`, and the same fix is needed on `release/2.3`, which must not get the other new features from `main`.',
      '**When to use it, and when not**',
      '- **Use it for**: Hotfixes and backports to release branches; a commit made on the wrong branch\n- **Avoid it for**: Moving many commits (merge or rebase instead); regularly syncing two branches: it creates duplicate commits with different IDs',
      'Platforms have it built in: GitHub (with a backport action or the CLI) and **Azure DevOps has a "Cherry-pick" button** on a completed PR that creates a new branch and PR to the target branch.',
      '**Interview-ready answer**',
      '"Cherry-pick applies a specific commit from one branch onto another as a new commit, without merging everything else. I mainly use it for hotfixes: the fix goes into main, then I cherry-pick it with `-x` onto the release branch so the message records where it came from. If there is a conflict I resolve it and run `--continue`. I avoid using it to sync branches regularly, because it creates duplicate commits. In Azure DevOps I can also cherry-pick a completed PR straight from the UI."',
    ],
    code: [
      {
        title: 'Backport a fix to a release branch',
        language: 'bash',
        code: `git checkout release/2.3
git cherry-pick -x a1b2c3d          # -x adds "(cherry picked from commit a1b2c3d)" to the message
git push`,
      },
      {
        title: 'Other forms',
        language: 'bash',
        code: `git cherry-pick a1b2c3d e4f5a6b     # several commits
git cherry-pick A^..B               # a range, including A
git cherry-pick -n a1b2c3d          # apply changes but don't commit yet
git cherry-pick -m 1 <merge-sha>    # pick a merge commit (choose parent 1 as the mainline)`,
      },
      {
        title: 'If there is a conflict',
        language: 'bash',
        code: `# fix the files
git add .
git cherry-pick --continue
# or give up
git cherry-pick --abort`,
      },
    ],
    tags: ['git', 'cherry-pick', 'hotfix', 'release branches'],
  },
]
