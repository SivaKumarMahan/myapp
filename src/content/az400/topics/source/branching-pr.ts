import type { Topic } from '../../../types'

export const branchingPr: Topic = {
  id: 'az4-branching-pr',
  title: 'Branching strategies, pull requests and branch protection',
  domainId: 'az4-source',
  difficulty: 'intermediate',
  estimatedMinutes: 35,
  order: 1,
  tags: [
    'trunk-based',
    'feature-branch',
    'release-branch',
    'pull-request',
    'branch-policies',
    'branch-protection',
    'rulesets',
    'merge-strategies',
    'codeowners',
  ],
  oneLiner:
    'Pick a branching model, then enforce it with pull requests, Azure Repos branch policies or GitHub branch protection and rulesets, and the right merge strategy.',
  explanation: [
    'A **branching strategy** is the team agreement about where work happens and how it reaches production. The three models the exam cares about are **trunk-based development** (everyone integrates into `main` at least daily through very short-lived branches, and unfinished work hides behind feature flags), **feature branching** (each feature gets its own branch merged through a pull request when done, GitHub Flow being the lightweight version) and **release branching** (a `release/x.y` branch is cut from main to stabilise and patch a version while main moves on).',
    'Whatever the model, changes reach the protected branch through a **pull request (PR)**: a proposal to merge one branch into another, with a diff, discussion, automated checks and approvals. The PR is where quality is enforced, so the platform lets you make those checks mandatory.',
    'In **Azure Repos** this is done with **branch policies** on a branch or branch folder (for example `main` or `release/*`): minimum number of reviewers, linked work items, comment resolution, limit merge types, **build validation** (a pipeline must succeed), status checks from external services, and **automatically included reviewers** for paths. Once any required policy is set, direct pushes to the branch are blocked and changes must come through a PR.',
    'In **GitHub** the same ideas are **branch protection rules** and the newer **rulesets**. They can require a pull request with a number of approvals, require review from **CODEOWNERS**, dismiss stale approvals when new commits arrive, require status checks to pass and the branch to be up to date, require signed commits, require linear history, require conversation resolution, block force pushes and deletions, and use a **merge queue**. Rulesets can be applied across many repositories at organization level, can target tags as well as branches, can be layered, and can run in Evaluate mode before you enforce them.',
  ],
  whyItMatters: [
    'Source control strategy is a whole exam domain. You will be asked to recommend a branching model for a scenario (many small releases per day versus supported parallel versions), and to configure the policy that satisfies a requirement such as "every change must build and be approved by the database team when SQL files change".',
    'Merge strategy questions are common and precise: which one keeps a linear history, which one preserves every commit, which one produces one commit per PR.',
    'In real teams, a good branching model combined with enforced policies is what makes continuous integration real. Long-lived branches that merge once a month produce painful conflicts and big-bang releases, which is exactly what DevOps tries to remove.',
  ],
  howItWorks: [
    '**Trunk-based development**: branches live hours to a day or two, CI runs on every PR and every merge to main, and releases are cut from main (optionally tagged, or with a short release branch for hotfixes). It gives the best DORA numbers but needs good automated tests and feature flags.',
    '**Feature branches**: one branch per feature or bug, PR into main, delete after merge. Risk grows with branch age; keep them short and rebase or merge main into them regularly.',
    '**Release branches**: cut `release/2.3` from main when a version is feature-complete. Fixes are made in main and cherry-picked into the release branch (or the other way round, but pick one direction and stick to it). Apply the same or stricter policies to `release/*`.',
    '**Merge strategies** in Azure Repos: Merge (no fast-forward, creates a merge commit, keeps all commits), Squash commit (one new commit on the target, the source history is not kept), Rebase and fast-forward (replays commits on top of the target, linear history) and Semi-linear merge (rebase then create a merge commit). GitHub offers Create a merge commit, Squash and merge, and Rebase and merge. Branch policies and repository settings can limit which ones are allowed.',
    '**Code owners and required reviewers**: GitHub reads a `CODEOWNERS` file (in `.github/`, the root or `docs/`) mapping path patterns to users or teams; with Require review from Code Owners, those owners must approve. Azure Repos uses Automatically included reviewers with a path filter and can mark them required.',
    '**Build validation** in Azure Repos queues a pipeline for the PR merge commit and can expire the result after a time or when main updates. In GitHub, a required status check is any check name (for example from a GitHub Actions job) that must pass. A **merge queue** tests PRs against the latest main in order before merging, which avoids broken main from semantically conflicting PRs.',
    '**Bypass**: in Azure Repos, the Bypass policies when completing pull requests and Bypass policies when pushing permissions let specific groups override; in GitHub, rulesets have a bypass list (roles, teams, apps). Grant bypass sparingly and audit it.',
  ],
  diagrams: [
    {
      kind: 'decision',
      title: 'Choosing a branching strategy',
      caption:
        'Default to trunk-based with short branches; add release branches only when you must support versions in parallel.',
      question: 'What does the release cadence look like?',
      branches: [
        {
          condition: 'Many small deploys a day, strong tests',
          result: 'Trunk-based development',
          detail: 'Short branches, feature flags',
          tone: 'success',
        },
        {
          condition: 'Features reviewed individually, main always deployable',
          result: 'Feature branches (GitHub Flow)',
          detail: 'PR per feature, delete after merge',
          tone: 'accent',
        },
        {
          condition: 'Several shipped versions need hotfixes',
          result: 'Release branches',
          detail: 'release/x.y cut from main',
        },
        {
          condition: 'Branches live for weeks or months',
          result: 'Rethink it',
          detail: 'Merge pain and delayed integration',
          tone: 'danger',
        },
      ],
    },
    {
      kind: 'flow',
      title: 'A pull request under branch policy',
      caption:
        'Every gate is automatic. The PR only completes when all required policies and checks pass.',
      nodes: [
        { label: 'Push topic branch', detail: 'feature/login-timeout', tone: 'accent' },
        { label: 'Open pull request to main', arrowLabel: 'PR' },
        {
          label: 'Build validation runs',
          detail: 'Pipeline or required status check',
          branch: { label: 'Build fails', detail: 'PR blocked until fixed', tone: 'danger' },
        },
        { label: 'Required reviewers approve', detail: 'Minimum count plus code owners' },
        { label: 'Comments resolved, work item linked' },
        {
          label: 'Complete with allowed merge type',
          detail: 'Squash, rebase or merge',
          tone: 'success',
        },
      ],
    },
  ],
  keyObjects: [
    {
      kind: 'Branch policy (Azure Repos)',
      purpose:
        'Rules on a branch or branch prefix that force changes through a pull request that meets requirements.',
      fields: [
        {
          path: 'Require a minimum number of reviewers',
          meaning:
            'Count, whether authors can approve their own change, reset votes on new pushes.',
        },
        {
          path: 'Check for linked work items',
          meaning: 'Required or optional traceability to Azure Boards.',
        },
        {
          path: 'Check for comment resolution',
          meaning: 'All comments must be resolved before completion.',
        },
        {
          path: 'Limit merge types',
          meaning: 'Allowed completion strategies: merge, squash, rebase, semi-linear.',
        },
        {
          path: 'Build validation',
          meaning: 'Pipeline that must pass, with optional path filters and expiry.',
        },
        {
          path: 'Automatically included reviewers',
          meaning: 'Users or groups added, optionally required, when paths change.',
        },
      ],
    },
    {
      kind: 'Repository ruleset (GitHub)',
      purpose:
        'Named set of rules targeting branches or tags in one repository or across an organization, with enforcement status and a bypass list.',
      fields: [
        {
          path: 'enforcement',
          meaning: 'active, evaluate (log only) or disabled.',
          required: true,
        },
        { path: 'target', meaning: 'branch, tag or push.' },
        {
          path: 'conditions.ref_name.include',
          meaning: 'Patterns such as ~DEFAULT_BRANCH or refs/heads/release/*.',
        },
        {
          path: 'rules[].type',
          meaning:
            'pull_request, required_status_checks, non_fast_forward, deletion, required_linear_history, required_signatures, merge_queue.',
        },
        { path: 'bypass_actors', meaning: 'Roles, teams or apps allowed to bypass.' },
      ],
    },
    {
      kind: 'CODEOWNERS file (GitHub)',
      purpose: 'Maps file patterns to owners who are requested, and can be required, as reviewers.',
      fields: [
        { path: 'pattern', meaning: 'gitignore-style path pattern; the last matching line wins.' },
        { path: 'owners', meaning: '@user, @org/team or email addresses with write access.' },
      ],
    },
  ],
  realWorldExample: {
    title: 'From monthly merges to daily integration',
    story: [
      'An insurance team used a GitFlow-style model with a long-lived develop branch and feature branches that lived for weeks. Every release started with two days of merge conflict resolution, and hotfixes were applied inconsistently across develop, main and release branches.',
      'They moved to trunk-based development: branches must be merged within two days, unfinished features go behind flags in Azure App Configuration, and releases are tags on main. A short-lived `release/*` branch is cut only when a hotfix must ship while main has unreleased work.',
      'Branch policies on main now require one reviewer, a linked work item, resolved comments, squash merge only, and a build validation pipeline with a path filter excluding docs. The database team is an automatically included required reviewer for `/db/*`.',
      'Merge conflicts almost disappeared, deployment frequency went from monthly to several times a week, and the squash-only history makes every change on main map to one reviewed PR and one work item.',
    ],
  },
  yamlExamples: [
    {
      title: 'PR trigger for GitHub-hosted code in Azure Pipelines',
      language: 'yaml',
      explanation:
        'For GitHub repositories, the pr keyword controls PR validation. For Azure Repos, PR validation is set by the build validation branch policy instead and pr is ignored.',
      code: `trigger:
  branches:
    include:
      - main
      - release/*

pr:
  branches:
    include:
      - main
      - release/*
  paths:
    exclude:
      - docs/*

pool:
  vmImage: ubuntu-latest

steps:
  - script: npm ci && npm test
    displayName: Validate`,
    },
    {
      title: 'GitHub Actions workflow used as a required status check',
      language: 'yaml',
      explanation:
        'The job name "test" becomes the check you mark as required in branch protection or a ruleset. merge_group lets it run in a merge queue.',
      code: `name: ci
on:
  pull_request:
    branches: [main]
  merge_group:

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22
      - run: npm ci
      - run: npm test`,
    },
    {
      title: 'CODEOWNERS',
      language: 'text',
      explanation:
        'Stored at .github/CODEOWNERS. Later lines override earlier ones for the same file.',
      code: `# Default owners for everything
*                 @contoso/web-team

# Database migrations need the DBA team
/db/              @contoso/dba

# Pipeline definitions need platform review
/.github/workflows/  @contoso/platform
/pipelines/          @contoso/platform`,
    },
  ],
  imperative: [
    {
      command:
        'az repos policy approver-count create --branch main --repository-id <repo-id> --minimum-approver-count 2 --creator-vote-counts false --allow-downvotes false --reset-on-source-push true --blocking true --enabled true',
      what: 'Requires two approvals on PRs into main, not counting the author, and resets votes when new commits are pushed.',
      placeholders: ['<repo-id>'],
    },
    {
      command:
        'az repos policy build create --branch main --repository-id <repo-id> --build-definition-id <pipeline-id> --display-name "PR build" --queue-on-source-update-only true --manual-queue-only false --valid-duration 720 --blocking true --enabled true',
      what: 'Adds a build validation policy so the pipeline must pass before a PR to main can complete.',
      placeholders: ['<repo-id>', '<pipeline-id>'],
    },
    {
      command:
        'az repos policy merge-strategy create --branch main --repository-id <repo-id> --allow-squash true --allow-no-fast-forward false --allow-rebase false --blocking true --enabled true',
      what: 'Limits PR completion on main to squash merge.',
      placeholders: ['<repo-id>'],
    },
    {
      command:
        'az repos pr create --source-branch feature/login-timeout --target-branch main --title "Login timeout" --work-items <id> --auto-complete true',
      what: 'Creates a PR linked to a work item that completes automatically once policies pass.',
      placeholders: ['<id>'],
    },
    {
      command:
        'gh pr create --base main --title "Login timeout" --body "Fixes #42" && gh pr merge --squash --auto',
      what: 'Creates a GitHub PR and enables auto-merge with squash once required checks and reviews pass.',
    },
    {
      command: 'git switch -c release/2.3 && git push -u origin release/2.3',
      what: 'Cuts a release branch from the current main.',
    },
  ],
  declarative: {
    steps: [
      'Choose the model and write it in the repository CONTRIBUTING file.',
      'Define rules as code: a ruleset JSON for GitHub, or az repos policy scripts for Azure Repos.',
      'Require PRs, reviews, passing checks and allowed merge types on main and release/*.',
      'Add CODEOWNERS or automatically included reviewers for sensitive paths.',
      'Start new rulesets in evaluate mode, review insights, then set them to active.',
    ],
    code: [
      {
        title: 'GitHub ruleset for the default branch',
        language: 'json',
        explanation:
          'Apply with gh api repos/<owner>/<repo>/rulesets --method POST --input ruleset.json. Organization rulesets use the orgs endpoint.',
        code: `{
  "name": "protect-main",
  "target": "branch",
  "enforcement": "active",
  "conditions": {
    "ref_name": { "include": ["~DEFAULT_BRANCH"], "exclude": [] }
  },
  "rules": [
    { "type": "deletion" },
    { "type": "non_fast_forward" },
    { "type": "required_linear_history" },
    {
      "type": "pull_request",
      "parameters": {
        "required_approving_review_count": 1,
        "require_code_owner_review": true,
        "dismiss_stale_reviews_on_push": true,
        "require_last_push_approval": true,
        "required_review_thread_resolution": true
      }
    },
    {
      "type": "required_status_checks",
      "parameters": {
        "strict_required_status_checks_policy": true,
        "required_status_checks": [{ "context": "test" }]
      }
    }
  ],
  "bypass_actors": []
}`,
      },
    ],
  },
  verification: [
    {
      command: 'az repos policy list --repository-id <repo-id> --branch main -o table',
      what: 'Lists every policy on main with its type and whether it is blocking.',
      placeholders: ['<repo-id>'],
    },
    {
      command: 'gh api repos/<owner>/<repo>/rules/branches/main',
      what: 'Shows the effective rules that apply to main, combining all rulesets and protections.',
      placeholders: ['<owner>', '<repo>'],
    },
    {
      command: 'git push origin main',
      what: 'Attempt a direct push to a protected branch.',
      expected:
        'Rejected: TF402455 in Azure Repos, or GH013 / protected branch hook declined in GitHub.',
    },
  ],
  troubleshooting: [
    {
      command: 'az repos pr policy list --id <pr-id> -o table',
      what: 'Shows the status of each policy evaluation on a PR, to find which one is blocking completion.',
      placeholders: ['<pr-id>'],
    },
    {
      command: 'az repos pr policy queue --id <pr-id> --evaluation-id <evaluation-id>',
      what: 'Re-queues an expired or failed build validation for a PR.',
      placeholders: ['<pr-id>', '<evaluation-id>'],
    },
    {
      command: 'gh pr checks <number>',
      what: 'Lists checks on a GitHub PR. A required check that never reports (wrong job name) blocks merging forever.',
      placeholders: ['<number>'],
    },
  ],
  commonMistakes: [
    'Adding a `pr:` trigger in YAML for an Azure Repos repository and wondering why it is ignored. Azure Repos PR builds come from the build validation branch policy.',
    'Marking a required status check with a name that no workflow job produces, so PRs wait forever for a check that never runs.',
    'Letting the PR author count as an approver, which makes a one-reviewer policy meaningless.',
    'Using squash merge on a release branch and then trying to merge it back into main, which re-applies changes and causes confusing conflicts.',
    'Giving whole teams bypass permissions "just in case", which silently turns policies into suggestions.',
  ],
  examTips: [
    'Linear history: squash or rebase. Preserves all commits with a merge commit: no fast-forward merge. Semi-linear: rebase then merge commit.',
    'Azure Repos branch policies block direct pushes as soon as a required policy is configured on the branch.',
    'Require review from Code Owners is a GitHub feature driven by a CODEOWNERS file; the Azure Repos equivalent is automatically included reviewers with a path filter.',
    'Rulesets vs branch protection: rulesets can target tags, apply across an organization, be layered and run in evaluate mode.',
    'Trunk-based development pairs with feature flags; release branches pair with supporting multiple versions.',
  ],
  summary: [
    'Trunk-based, feature and release branching trade integration speed against isolation.',
    'Pull requests are the enforcement point for review, checks and traceability.',
    'Azure Repos uses branch policies; GitHub uses branch protection rules and rulesets.',
    'Merge strategies decide whether history is linear and whether individual commits survive.',
    'CODEOWNERS and path-based reviewers route sensitive changes to the right experts.',
  ],
  practice: [
    {
      id: 'az4-branching-pr-p1',
      level: 'beginner',
      prompt: 'Which merge strategy produces exactly one new commit on main per pull request?',
      answer: 'Squash merge (Squash commit in Azure Repos, Squash and merge in GitHub).',
      explanation:
        'Squash combines all PR commits into one; rebase replays each commit, and merge adds a merge commit plus keeps all commits.',
    },
    {
      id: 'az4-branching-pr-p2',
      level: 'intermediate',
      prompt:
        'Changes under /infra must always be approved by the platform team in Azure Repos. How do you enforce that?',
      answer:
        'Add an Automatically included reviewers branch policy on main with path filter /infra/* and the platform team group, and mark it required.',
      explanation: 'A plain minimum reviewer count cannot target a specific group or path.',
    },
    {
      id: 'az4-branching-pr-p3',
      level: 'intermediate',
      prompt:
        'Two PRs each pass CI alone, but after both merge, main is broken. Which GitHub feature prevents this?',
      answer:
        'A merge queue (with the required checks also running on the merge_group event), or at minimum requiring branches to be up to date before merging.',
      explanation:
        'The merge queue tests each PR combined with the latest main and earlier queued PRs before merging.',
    },
    {
      id: 'az4-branching-pr-p4',
      level: 'advanced',
      prompt:
        'You want to try a new organization-wide rule without blocking anyone yet. What do you do?',
      answer:
        'Create an organization ruleset with enforcement set to Evaluate, review rule insights for would-be violations, then switch it to Active.',
      explanation:
        'Evaluate mode records results without enforcing, which classic branch protection cannot do.',
    },
  ],
  lab: {
    title: 'Protect main in Azure Repos and GitHub',
    scenario:
      'Configure equivalent protections on an Azure Repos repository and a GitHub repository, then prove that direct pushes are blocked and PRs need a passing build and approval.',
    prerequisites: [
      'A free Azure DevOps organization and project with a repo and a CI pipeline',
      'A GitHub repository you own with a workflow job named test',
      'Azure CLI with azure-devops extension, gh CLI and git',
    ],
    tasks: [
      {
        instruction:
          'In Azure Repos, add a minimum reviewer policy of 1 on main that does not count the author.',
      },
      { instruction: 'Add a build validation policy on main using your CI pipeline.' },
      { instruction: 'Limit merge types on main to squash only.' },
      { instruction: 'Try `git push origin main` with a local commit and confirm it is rejected.' },
      {
        instruction:
          'In GitHub, create a ruleset for the default branch requiring a PR, one approval and the test status check, blocking force pushes.',
        hint: 'Use the JSON from this lesson with gh api.',
      },
      {
        instruction:
          'Open a PR in GitHub and confirm the merge button is disabled until the check passes.',
      },
    ],
    solution: [
      {
        title: 'Azure Repos policies',
        language: 'bash',
        code: `REPO_ID=$(az repos show --repository <repo> --query id -o tsv)
az repos policy approver-count create --branch main --repository-id $REPO_ID \\
  --minimum-approver-count 1 --creator-vote-counts false --allow-downvotes false \\
  --reset-on-source-push true --blocking true --enabled true
az repos policy build create --branch main --repository-id $REPO_ID \\
  --build-definition-id <pipeline-id> --display-name "PR build" \\
  --queue-on-source-update-only true --manual-queue-only false \\
  --valid-duration 720 --blocking true --enabled true
az repos policy merge-strategy create --branch main --repository-id $REPO_ID \\
  --allow-squash true --allow-no-fast-forward false --allow-rebase false \\
  --blocking true --enabled true`,
      },
      {
        title: 'GitHub ruleset',
        language: 'bash',
        code: `gh api repos/<owner>/<repo>/rulesets --method POST --input ruleset.json
git commit --allow-empty -m "direct push test"
git push origin main   # rejected by the ruleset`,
      },
    ],
    verification: [
      {
        command:
          'az repos policy list --repository-id <repo-id> --branch main --query "[].type.displayName"',
        what: 'Lists the three policy types you created.',
        expected: 'Minimum number of reviewers, Build, Require a merge strategy',
        placeholders: ['<repo-id>'],
      },
      {
        command: 'gh api repos/<owner>/<repo>/rulesets --jq ".[].name"',
        what: 'Confirms the GitHub ruleset exists.',
        expected: 'protect-main',
      },
    ],
    cleanup: [
      {
        command: 'az repos policy delete --id <policy-id> --yes',
        what: 'Removes each policy you created (repeat for each id from az repos policy list).',
        placeholders: ['<policy-id>'],
      },
      {
        command: 'gh api repos/<owner>/<repo>/rulesets/<ruleset-id> --method DELETE',
        what: 'Deletes the GitHub ruleset.',
        placeholders: ['<ruleset-id>'],
      },
    ],
  },
  relatedTopicIds: [
    'az4-repo-management',
    'az4-work-tracking',
    'az4-yaml-pipelines',
    'az4-deployment-strategies',
  ],
  docs: [
    {
      title: 'Branch policies and settings',
      url: 'https://learn.microsoft.com/azure/devops/repos/git/branch-policies',
    },
    {
      title: 'Adopt a Git branching strategy',
      url: 'https://learn.microsoft.com/azure/devops/repos/git/git-branching-guidance',
    },
    {
      title: 'About rulesets',
      url: 'https://docs.github.com/repositories/configuring-branches-and-merges-in-your-repository/managing-rulesets/about-rulesets',
    },
    {
      title: 'About code owners',
      url: 'https://docs.github.com/repositories/managing-your-repositorys-settings-and-features/customizing-your-repository/about-code-owners',
    },
  ],
}
