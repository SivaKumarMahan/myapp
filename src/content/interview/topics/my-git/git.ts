import type { InterviewQuestion } from '../../../types'

/** Git concepts, commands, conflicts, recovery, branching strategy and tags. */
export const myGitQuestions: InterviewQuestion[] = [
  {
    id: 'itv-mygit-1',
    level: 'basic',
    kind: 'open',
    prompt:
      'Explain the core Git concepts: branch, remote, clone, fetch, pull, push, merge, rebase, stash and tag.',
    probing:
      'Whether you know the core Git vocabulary precisely, especially fetch vs pull and merge vs rebase.',
    answer: [
      'Git stores project history as **commits**.',
      '- **Branch**: A movable pointer to a commit\n- **Remote**: Another copy of the repository, usually on a server\n- **Clone**: Creates a local copy of a remote repository\n- **Fetch**: Downloads new commits and branches from a remote, without touching your files\n- **Pull**: A fetch followed by merging or rebasing the result into your branch\n- **Push**: Sends your commits to a remote\n- **Merge**: Combines two branch histories\n- **Rebase**: Replays your commits on top of a new base, keeping history linear\n- **Stash**: Temporarily sets aside uncommitted work\n- **Tag**: Marks a specific commit, usually a release',
    ],
    tags: ['git', 'basics', 'concepts'],
  },
  {
    id: 'itv-mygit-2',
    level: 'basic',
    kind: 'open',
    prompt: 'What does a typical reviewed Git workflow look like?',
    probing:
      'Whether you follow a short-lived-branch, reviewed, protected-merge flow and use the safe commands.',
    answer: [
      '1. Update local `main`.\n2. Create a short-lived branch.\n3. Make small, focused commits.\n4. Push the branch.\n5. Open a pull request with tests and a review.\n6. Merge through protected branch controls.\n7. Tag or promote a build that will not change after it is created.',
      'Use `git switch` and `git restore` for clear branch and file operations. Use `git revert` to undo a commit that has already been shared, rather than rewriting history. Only rebase or force-push a branch you own, and use `--force-with-lease` instead of a plain force push.',
    ],
    tags: ['git', 'workflow', 'pull requests'],
  },
  {
    id: 'itv-mygit-3',
    level: 'basic',
    kind: 'open',
    prompt: 'What are the key Git commands for a daily workflow and for recovery?',
    probing:
      'Whether you know the everyday Git commands and the safe way to update, force-push and recover.',
    answer: [
      'My daily routine is: clone and inspect, create a branch and commit a focused change, rebase onto the latest main before the pull request, and know the recovery commands.',
      'I use `--force-with-lease` only on my reviewed feature branch because it refuses to overwrite remote work I have not fetched. Shared and protected branches should reject force pushes.',
      'Before committing, I review the staged diff and run secret scanning so credentials never enter history.',
      '`git reset` rewrites the current branch. Depending on the mode used, it can discard local work. `git revert` creates a new commit that undoes an earlier one instead. Revert is normally safer once a commit has been shared with others.',
    ],
    code: [
      {
        title: 'Clone and inspect',
        language: 'bash',
        code: `git clone <repository-url>
cd <repository>
git remote -v
git status
git log --oneline --decorate --graph --all`,
      },
      {
        title: 'Create a branch and commit a focused change',
        language: 'bash',
        code: `git switch -c feature/<name>
git add <specific-files>
git diff --cached
git commit -m "Explain the completed change"
git push --set-upstream origin feature/<name>`,
      },
      {
        title: 'Update safely before a pull request',
        language: 'bash',
        code: `git fetch origin
git rebase origin/main
# Resolve and stage each conflict, then:
git rebase --continue
git push --force-with-lease`,
      },
      {
        title: 'Recovery commands',
        language: 'bash',
        code: `git reflog                         # find a lost local commit
git switch -c recovered <sha>      # preserve it on a new branch
git revert <sha>                   # safely undo a shared commit
git restore --staged <file>        # unstage without deleting work`,
      },
    ],
    tags: ['git', 'commands', 'workflow'],
  },
  {
    id: 'itv-mygit-4',
    level: 'basic',
    kind: 'open',
    prompt: 'What is the difference between `origin` and `upstream` remotes?',
    probing:
      'Whether you understand that origin and upstream are just conventional remote names used in fork workflows.',
    answer: [
      "A Git remote is just a local name for another repository's URL. `origin` is a convention, not a rule: it is usually the repository I cloned from, and the place where I push my branch. In a fork workflow, `upstream` usually points to the original project I forked from.",
      "The flow is simple: fetch the latest changes from the original project through `upstream`, update my feature branch, then push that branch to my fork through `origin`. These names aren't special to Git — they can be changed. So when troubleshooting, I always check `git remote -v` instead of assuming what they point to.",
    ],
    code: [
      {
        title: 'Sync a fork through upstream, push to origin',
        language: 'bash',
        code: `git remote -v
git remote add upstream https://github.com/company/project.git
git fetch upstream
git rebase upstream/main
git push --force-with-lease origin feature/login`,
      },
    ],
    tags: ['git', 'remotes', 'forks'],
  },
  {
    id: 'itv-mygit-5',
    level: 'basic',
    kind: 'open',
    prompt: 'What is the difference between `git fetch` and `git pull`?',
    probing:
      'Whether you know fetch only updates remote refs while pull also integrates, and when to prefer each.',
    answer: [
      '`git fetch` downloads remote commits, branches, and tags, and updates references like `origin/main`. It does not touch my current branch or working files.',
      '`git pull` does a fetch, then integrates the remote branch into my current branch — usually by merge or rebase.',
      'I prefer fetch when I want to see what changed before integrating it, especially on an important branch. On my own private feature branch, I use `git pull --rebase` when team policy allows it.',
      "Before pulling, I check `git status` and commit or stash any local work, so the pull doesn't mix unrelated changes together.",
    ],
    code: [
      {
        title: 'Fetch, inspect, then merge',
        language: 'bash',
        code: `git fetch origin
git log --oneline --left-right HEAD...origin/main
git diff HEAD..origin/main
git merge origin/main`,
      },
    ],
    tags: ['git', 'fetch', 'pull'],
  },
  {
    id: 'itv-mygit-6',
    level: 'intermediate',
    kind: 'scenario',
    prompt: 'How do you find and resolve merge conflicts?',
    probing:
      'Whether you resolve conflicts by understanding both changes, test the result, and know how to abort.',
    answer: [
      'First, I figure out why the two branches changed the same lines. I don\'t just pick "ours" or "theirs" blindly. My approach:',
      "1. Run `git status` to list conflicted files.\n2. Open each file and review the `<<<<<<<`, `=======`, and `>>>>>>>` sections.\n3. Talk to the other author if the business logic isn't clear.\n4. Edit the file into the correct combined result and remove the markers.\n5. Run formatters, unit tests, builds, and any relevant integration tests.\n6. Stage the resolved files and continue the merge or rebase.",
      "If the resolution starts to feel unsafe, I run `git merge --abort` or `git rebase --abort`, go back to the original state, and try again after getting clarity. I also compare the final diff against both parent branches, so I don't accidentally drop a valid change.",
      'I resolve conflicts by editing the `<<<<<<<` / `=======` / `>>>>>>>` sections to the correct result, then running `git add <file>` and `git commit` (or `git rebase --continue`). A merge tool such as `git mergetool` or VS Code makes this easier to see clearly.',
      'To prevent conflicts in the first place: keep branches short-lived, pull or rebase often, and keep changes small and focused.',
    ],
    code: [
      {
        title: 'Find and resolve conflicted files',
        language: 'bash',
        code: `git status
git diff --name-only --diff-filter=U
git add src/service.py
git commit                 # merge
# or: git rebase --continue`,
      },
      {
        title: 'Trigger and locate conflicts',
        language: 'bash',
        code: `git merge main            # or git rebase main
# Git marks conflicts:
git status                # shows "both modified" files
grep -rn '<<<<<<<' .      # find conflict markers`,
      },
    ],
    tags: ['git', 'merge conflicts'],
  },
  {
    id: 'itv-mygit-7',
    level: 'intermediate',
    kind: 'open',
    prompt: 'How do you find merge conflicts before completing a merge?',
    probing:
      'Whether you can detect conflicts before merging and know CI must test the real merge result.',
    answer: [
      'I update my remote references and try the integration locally, either directly or in a temporary branch.',
      'If I just want to check without changing anything, `git merge-tree` can show what a merge would produce without touching the working tree. CI should also test the actual proposed merge commit, because two branches can merge cleanly at the text level and still break the build or the behavior.',
      'After resolving conflicts, I run the full relevant test set and review the combined diff.',
    ],
    code: [
      {
        title: 'Trial integration before merging',
        language: 'bash',
        code: `git fetch origin
git switch feature/order-api
git rebase origin/main
# or: git merge --no-commit --no-ff origin/main
git diff --name-only --diff-filter=U`,
      },
    ],
    tags: ['git', 'merge conflicts', 'ci'],
  },
  {
    id: 'itv-mygit-8',
    level: 'advanced',
    kind: 'scenario',
    prompt: 'You committed sensitive information to Git. How do you remove it from history?',
    probing:
      'Whether you rotate the secret first and then rewrite history with git filter-repo in a coordinated way.',
    answer: [
      "The first thing I do is revoke or rotate the secret. Removing it from Git doesn't make an exposed password or token safe, because clones, caches, logs, and forks may already have a copy of it. Then I:",
      '1. Remove the secret from the current code and replace it with a reference to a secret manager.\n2. Use `git filter-repo` to rewrite every affected commit.\n3. Coordinate a force push, since this changes the commit IDs.\n4. Ask team members to re-clone the repository or carefully reset their branches.\n5. Clear CI artifacts and caches where possible, and review audit logs.',
      'I use `--force-with-lease` where I can, but a full history cleanup sometimes needs a coordinated force update instead. To prevent this from happening again: pre-commit secret scanning, server-side scanning, protected branches, short-lived credentials, and never storing secrets in a tracked `.env` file.',
    ],
    code: [
      {
        title: 'Remove a file from all history',
        language: 'bash',
        code: `git filter-repo --path config/credentials.env --invert-paths
git push --force --all origin
git push --force --tags origin`,
      },
    ],
    followUps: [
      'Why is revoking the secret more important than rewriting history?',
      'What do teammates need to do after a history rewrite?',
    ],
    tags: ['git', 'secrets', 'history rewrite'],
  },
  {
    id: 'itv-mygit-9',
    level: 'intermediate',
    kind: 'scenario',
    prompt: 'A team member deleted a critical Git branch. How do you recover it?',
    probing:
      'Whether you know a deleted branch is just a pointer and can recover it from reflog, PRs or tags.',
    answer: [
      "Deleting a branch normally only deletes the pointer, not the commits — not right away. So I start by finding the last good commit, from a pull request, a pipeline build, a release tag, another developer's clone, or the reflog.",
      "Before pushing, I compare the recovered commit against the last deployed build and ask the branch owner to confirm it's the right one. Then I restore branch protection and build-validation rules, since recreating a branch doesn't automatically bring those settings back.",
      'I avoid running garbage collection or cleanup commands until the recovery is done.',
    ],
    code: [
      {
        title: 'Find the commit and recreate the branch',
        language: 'bash',
        code: `git reflog --all
git log --all --decorate --oneline
git branch release/2.4 <commit-sha>
git push origin release/2.4`,
      },
    ],
    tags: ['git', 'recovery', 'branches'],
  },
  {
    id: 'itv-mygit-10',
    level: 'intermediate',
    kind: 'open',
    prompt: 'How do you generate a GitHub token?',
    probing:
      'Whether you prefer GitHub Apps or OIDC, and scope, store, expire and rotate any PAT properly.',
    answer: [
      "For automation, I prefer GitHub Apps or OpenID Connect, because they give short-lived credentials scoped to only what's needed. If a personal access token is required instead, I create a fine-grained token in GitHub settings, select only the repositories it needs, grant the minimum permissions, and set a short expiration date.",
      'I store the token in a CI secret store or an OS credential manager — never in source code or command history. I test one operation that should work and one that should be denied, to prove the permissions are as tight as they should be. I also record who owns the token and when it expires, and set up rotation alerts.',
      "If a token leaks, I revoke it right away, review GitHub's audit and access logs, rotate any downstream credentials it could have reached, remove the value from history and pipeline output, and investigate how it leaked.",
    ],
    tags: ['github', 'tokens', 'security'],
  },
  {
    id: 'itv-mygit-11',
    level: 'intermediate',
    kind: 'open',
    prompt: 'Explain the Gitflow branching strategy.',
    probing: 'Whether you can explain Gitflow and when trunk-based development is the better fit.',
    answer: [
      'Gitflow uses two long-lived branches: `main` and `develop`. Feature branches start from `develop`. A release branch stabilizes a planned version. When a release is done, it merges into both `main` and `develop`. Urgent production fixes get their own hotfix branches, started from `main`.',
      'It gives you explicit control over releases, which suits products with scheduled versions or several supported releases at once. The downside is extra merge overhead and branches that drift apart the longer they stay open.',
      'For teams delivering continuously, trunk-based development with short feature branches and feature flags is usually simpler. I pick a strategy based on release frequency, regulatory requirements, team size, and how long releases need to be supported — not by defaulting to Gitflow.',
    ],
    code: [
      {
        title: 'Gitflow branches',
        language: 'text',
        code: `main ────────────────●────────────●
                     \\ hotfix     /
develop ──●──●──●────●───────────●
           \\ feature / \\ release /`,
      },
    ],
    tags: ['git', 'gitflow', 'branching'],
  },
  {
    id: 'itv-mygit-12',
    level: 'advanced',
    kind: 'open',
    prompt:
      'What branching strategy would you recommend for a team of more than 20 developers, and why?',
    probing:
      'Whether you choose a branching strategy from release cadence and constraints, and justify trunk-based development for large teams.',
    answer: [
      "First, I'd ask about release frequency, how many versions need support at once, regulatory approvals, repository ownership, and whether incomplete work can just hide behind a feature flag. Team size alone doesn't decide the strategy.",
      'For frequent delivery, I prefer trunk-based development: short-lived branches, small pull requests, a protected `main`, mandatory automated checks, a merge queue, and feature flags. This cuts down long-running conflicts and integration risk.',
      'For scheduled releases or several supported versions at once, I add release branches with clear owners and a limited lifespan.',
      "I track lead time, how long pull requests stay open, change-failure rate, how often conflicts happen, and rollback time. If branches sit open for weeks, that's a sign the process itself is creating integration risk.",
      'CODEOWNERS, component-level tests, and clearly defined repository boundaries help a large team work independently without weakening code review.',
      'Here are the common options and when each one makes sense:',
      '- **Trunk-based development (recommended for large, fast-moving teams):** everyone commits to short-lived branches and merges to `main` quickly, within a day or two. Unfinished work stays hidden behind feature flags instead of a long-lived branch. This needs strong CI and good test coverage. I recommend it because it avoids messy merges and long branch divergence, and it scales well with many contributors.\n- **GitHub Flow:** `main` plus short-lived feature branches, a pull request, then deploy. Simple, and works well for web apps deployed continuously.\n- **GitFlow:** uses `main`, `develop`, `feature/*`, `release/*`, and `hotfix/*` branches. Good for scheduled releases or versioned products, but it is heavy and slow for continuous delivery.',
      'For a 20+ dev team doing continuous delivery, I recommend trunk-based development with feature flags, pull request reviews, and strong CI with branch protection. It keeps integration continuous and avoids the long-lived branches that GitFlow tends to create.',
    ],
    followUps: [
      'How do feature flags make trunk-based development safe?',
      'What metrics tell you the branching strategy is hurting you?',
    ],
    tags: ['git', 'branching strategy', 'trunk-based'],
  },
  {
    id: 'itv-mygit-13',
    level: 'advanced',
    kind: 'open',
    prompt:
      'What branching strategy keeps releases clean, and how do you handle a production hotfix?',
    probing:
      'Whether you can run a clean release process and ship a hotfix from the production tag without losing it later.',
    answer: [
      'For frequent delivery, I prefer protected trunk-based development: short-lived branches, small pull requests, mandatory checks, and feature flags. I only create a release branch when a supported release needs to be stabilized. New feature work keeps going on `main`, while the release branch accepts only approved fixes.',
      "For a hotfix, I branch from the exact production tag, make the smallest change that fixes the issue, get it reviewed, build a new version that won't change once created, and deploy it through the emergency pipeline — which is still audited.",
      "Then I merge or cherry-pick the fix back into `main` and any release branches still being supported, so it isn't lost in the next release.",
      'I tag the fixed release and document the incident.',
      "The branch itself doesn't guarantee stability — the controls around it do. I require reproducible builds, tests, security checks, code owners, traceable approvals, and a verified rollback path. I also delete or close stale release branches so they don't drift out of sync.",
    ],
    followUps: [
      'Why branch the hotfix from the production tag rather than main?',
      'How do you make sure the fix reaches main and every supported release?',
    ],
    tags: ['git', 'hotfix', 'release branches'],
  },
  {
    id: 'itv-mygit-14',
    level: 'advanced',
    kind: 'open',
    prompt: 'How should Dev, QA, UAT, and Production be represented in Git?',
    probing:
      'Whether you avoid environment branches and promote one artifact, keeping environment config separate.',
    answer: [
      "I avoid permanent environment branches that hold different versions of the application code, because merging between them creates drift and makes it unclear what's actually in a release. Application code should normally live on one protected main branch, with release tags that don't change once created.",
      'The same built artifact then gets promoted through Dev, QA, UAT, and Production — nothing gets rebuilt along the way.',
      "Environment-specific configuration can live in clearly separated directories or repositories, with protected pull requests and environment owners. Promoting to the next environment just changes the image digest or chart version there — it doesn't rebuild the source.",
      'Secrets stay as external references, never checked into the repo.',
      "If an organization insists on environment branches, I define one-way promotion, automated comparison between environments, branch protection, and rules that block direct commits to production. But I'd also explain the drift risk this creates and push toward artifact-based promotion instead.",
    ],
    followUps: [
      'What goes wrong with long-lived dev/qa/prod branches?',
      'Where do you keep per-environment configuration?',
    ],
    tags: ['git', 'environments', 'promotion'],
  },
  {
    id: 'itv-mygit-15',
    level: 'basic',
    kind: 'open',
    prompt: 'What is a pull request or merge request?',
    probing:
      'Whether you see a PR as a quality and audit step with good content and automated checks.',
    answer: [
      "A pull request (on GitHub or Azure Repos) or a merge request (on GitLab) proposes merging one branch into another. It's really a collaboration and quality-control step, not just a Git operation.",
      'A good one explains the problem, the solution, the risk, and includes test evidence, screenshots or plan output where relevant, deployment notes, and how to roll back if needed. Automated checks should validate the build, tests, security, linting, and policy.',
      'Reviewers check for correctness, maintainability, security, how it behaves in operation, and any side effects.',
      'Once feedback is resolved and checks pass, the change gets merged using whatever strategy the team has chosen. The linked issue, reviewers, checks, comments, and final commit together form an audit trail.',
    ],
    tags: ['pull requests', 'merge requests', 'code review'],
  },
  {
    id: 'itv-mygit-16',
    level: 'intermediate',
    kind: 'open',
    prompt: 'How do you protect the main branch?',
    probing:
      'Whether you know the full set of main-branch protections and test them with a normal account.',
    answer: [
      'I block direct pushes and require everyone to go through a pull request. The typical controls are:',
      '- A minimum number of the right reviewers, including CODEOWNERS for sensitive paths.\n- Passing build, test, security, and policy checks.\n- All review comments resolved.\n- The branch up to date, or a merge queue in place.\n- Signed commits where required.\n- Force pushes, branch deletion, and policy bypasses restricted.\n- A separate, audited emergency-access path with a post-incident review.',
      'I test the policy with a normal developer account to confirm that direct pushes and unauthorized bypasses actually fail. I also protect pipeline configuration and infrastructure directories, since changing a workflow file can be just as powerful as changing application code.',
    ],
    tags: ['branch protection', 'main'],
  },
  {
    id: 'itv-mygit-17',
    level: 'intermediate',
    kind: 'open',
    prompt: 'What is the difference between merge, squash, and rebase?',
    probing:
      'Whether you can compare merge, squash and rebase and know the rule about rebasing shared branches.',
    answer: [
      "- **Merge** combines two histories and usually adds a merge commit. It keeps the real branch structure, but the graph can get noisy.\n- **Squash merge** combines all the feature branch's commits into a single new commit on the target branch. This keeps `main` simple, but the individual feature-branch commits no longer show up in history.\n- **Rebase** replays your commits onto a new base, giving a straight, linear history. Because this changes commit IDs, I avoid rebasing a branch that others are already working from.",
      'For short feature branches, I often squash a string of small "fix" commits into one clean, reviewed change. For a release or integration branch where the individual commits matter, a regular merge is usually better.',
      'If I rebase a branch I own, I push with `--force-with-lease`, never a plain `--force`.',
    ],
    tags: ['git', 'merge', 'squash', 'rebase'],
  },
  {
    id: 'itv-mygit-18',
    level: 'intermediate',
    kind: 'open',
    prompt: 'How do you handle release tags?',
    probing:
      'Whether you use immutable annotated tags on the exact built commit and never move a published tag.',
    answer: [
      "I create an annotated tag on the exact reviewed commit that was used to build the release. Once created, a tag like this should never change — that's what makes it trustworthy as a release marker. Semantic versioning, like `v2.4.1`, makes compatibility clear at a glance.",
      'CI builds a versioned artifact or image and records the commit SHA, tag, checksums, and release notes. Promoting to production reuses that same artifact rather than rebuilding from a branch that keeps moving.',
      'I restrict who can create or delete tags, sign tags when required, and never quietly move a published release tag. If something needs fixing, it gets a new version instead.',
    ],
    code: [
      {
        title: 'Create and push an annotated release tag',
        language: 'bash',
        code: `git tag -a v2.4.1 -m "Release 2.4.1"
git push origin v2.4.1
git show v2.4.1`,
      },
    ],
    tags: ['git', 'tags', 'releases'],
  },
  {
    id: 'itv-mygit-19',
    level: 'advanced',
    kind: 'scenario',
    prompt:
      'How do you undo a bad commit that has already been pushed to the protected main branch?',
    probing:
      'Whether you undo a pushed commit on a protected branch with revert, including merge commits, not reset and force push.',
    answer: [
      "On a shared, protected branch, I create a new revert commit rather than rewriting history that's already been published:",
      'For a merge commit, I identify the correct mainline parent and use `git revert -m 1 <merge-sha>`, then check the resulting diff carefully. If several dependent commits are involved, I revert them in a controlled order, or revert the merge through a pull request instead.',
      'I run tests and follow the normal review and deployment process, and pause or roll back the affected release if production is actually being impacted.',
      "I avoid `reset --hard` plus a force push on a shared main branch, since that rewrites history and disrupts everyone else's clone. A leaked secret is a different case: I revoke it immediately, and may still need to coordinate a history rewrite, because a revert alone leaves the value sitting in history.",
    ],
    code: [
      {
        title: 'Revert a bad commit on main',
        language: 'bash',
        code: `git switch main
git pull --ff-only
git revert <bad-commit-sha>
git push origin main`,
      },
    ],
    followUps: [
      'What does -m 1 mean when reverting a merge commit?',
      'When is a history rewrite still necessary on main?',
    ],
    tags: ['git', 'revert', 'main'],
  },
  {
    id: 'itv-mygit-20',
    level: 'basic',
    kind: 'scenario',
    prompt: '`git pull` says "not a git repository." How do you troubleshoot?',
    probing:
      'Whether you debug "not a git repository" by checking the working directory before doing anything risky.',
    answer: [
      'I start by running `pwd` and `git rev-parse --show-toplevel`. This error usually means the command ran outside the cloned directory, the `.git` folder is missing, or a script changed the working directory without me noticing. I `cd` to the repository root and confirm with `git status` and `git remote -v`.',
      "If `.git` was deleted or the checkout is corrupted, I save any uncommitted files first, clone a fresh copy, restore just the work I need, then pull the intended branch. I don't run `git init` inside an unfamiliar directory — that creates unrelated history and can hide what actually went wrong.",
    ],
    tags: ['git', 'troubleshooting'],
  },
  {
    id: 'itv-mygit-21',
    level: 'basic',
    kind: 'open',
    prompt: 'What is the difference between GitHub, Azure Repos, and GitLab?',
    probing:
      'Whether you can compare the three platforms and know CI/CD and governance matter more than repo hosting.',
    answer: [
      'All three host Git repositories and support pull or merge requests, permissions, branch protection, and integrations.',
      '- **GitHub:** a strong public and open-source ecosystem, plus GitHub Actions, Codespaces, GitHub Apps, and built-in security tooling.\n- **Azure Repos:** tightly integrated with Azure Boards, Azure Pipelines, Test Plans, and enterprise Microsoft environments.\n- **GitLab:** repository management, CI/CD, security scanning, package management, and planning tools all in one platform, with a self-managed option too.',
      'When comparing them, I look at identity integration, compliance needs, how runners work, network placement, availability, cost, migration effort, developer experience, and the existing toolchain. Repository hosting alone is rarely the deciding factor — CI/CD, security, governance, and who owns operations usually matter more.',
    ],
    tags: ['github', 'azure repos', 'gitlab'],
  },
  {
    id: 'itv-mygit-22',
    level: 'basic',
    kind: 'open',
    prompt: 'How does Git support DevOps?',
    probing: 'Whether you can explain how Git underpins CI, IaC and deployment traceability.',
    answer: [
      'Git supports DevOps in three ways:',
      '- It triggers automated build, test, and scan jobs when code changes.\n- It versions infrastructure and pipeline code the same way it versions application code.\n- It records deployment configuration, so changes to what gets deployed are tracked too.',
      'CI publishes a build artifact that does not change once it is created. CD then promotes that same artifact through Development, QA, Staging, and Production. Monitoring and rollback always refer back to the same commit or image digest, so everyone knows exactly what is running where.',
    ],
    tags: ['git', 'devops'],
  },
  {
    id: 'itv-mygit-23',
    level: 'basic',
    kind: 'open',
    prompt: 'What Git best practices do you follow?',
    probing: 'Whether you know the everyday Git hygiene and the rule for leaked secrets.',
    answer: [
      '- Write clear, focused commit messages.\n- Use pull requests and `CODEOWNERS` for review.\n- Protect `main` from direct pushes.\n- Run secret scanning on every commit.\n- Keep a proper `.gitignore`.\n- Sign tags and commits where required.\n- Clean up merged branches.\n- Keep builds reproducible.\n- Never make changes directly in production.',
      'If a secret is ever committed, revoke it immediately. Rewriting history alone does not make a leaked secret safe again.',
    ],
    tags: ['git', 'best practices'],
  },
]
