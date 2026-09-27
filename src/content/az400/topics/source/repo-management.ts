import type { Topic } from '../../../types'

export const repoManagement: Topic = {
  id: 'az4-repo-management',
  title: 'Large repositories, permissions and recovering or purging Git data',
  domainId: 'az4-source',
  difficulty: 'advanced',
  estimatedMinutes: 40,
  order: 2,
  tags: [
    'git-lfs',
    'scalar',
    'monorepo',
    'permissions',
    'tags',
    'reflog',
    'revert',
    'filter-repo',
    'bfg',
    'secrets',
  ],
  oneLiner:
    'Keep big repositories fast with Git LFS and Scalar, choose monorepo or multi-repo, secure repositories with permissions and tags, and recover or permanently remove data from history.',
  explanation: [
    'Git was designed for text source code. Two things make repositories slow: **large binary files** (every version is kept forever and cloned by everyone) and **sheer size** (millions of files and years of history). **Git LFS (Large File Storage)** solves the first by storing binaries on a separate LFS server and keeping only small pointer files in Git; files are downloaded on checkout. Both Azure Repos and GitHub support LFS. The older **git-fat** tool follows the same pointer-file idea with an rsync backend, but LFS is the standard today.',
    'For the second problem, **Scalar** (shipped with Git since 2.38) configures a clone for scale: partial clone (download objects on demand), sparse checkout in cone mode (materialise only the folders you work in), background maintenance (prefetch, commit-graph, incremental repack) and the file system monitor. You run `scalar clone <url>` or `scalar register` on an existing clone. A **shallow clone** (`--depth 1`) is the pipeline-friendly option: CI rarely needs full history.',
    'Architecture matters too. A **monorepo** holds many projects in one repository: atomic cross-project changes, one set of tooling, easy code sharing, but it needs sparse checkout, path-filtered CI triggers and CODEOWNERS. A **multi-repo** layout gives clear ownership and independent permissions and releases, but cross-repo changes need coordination, and sharing happens through packages (Azure Artifacts, GitHub Packages), Git submodules or multi-repo checkout in pipelines.',
    'Finally, Git is a history database, so you need to know how to **recover** data (the **reflog** records every position HEAD and branches had, so a "lost" commit after a bad reset can be found and restored; `git revert` undoes a commit safely on shared branches by adding an inverse commit) and how to **remove** data permanently. If a secret or huge file was committed, deleting it in a new commit is not enough: it is still in history. You rewrite history with **git filter-repo** or the **BFG Repo-Cleaner**, force-push, and above all **rotate the secret**, because it must be treated as leaked.',
  ],
  whyItMatters: [
    'The exam asks you to pick between LFS, Scalar, shallow clones and repository splits for a performance scenario, to set repository permissions for groups, and to choose the right Git command for recovery versus removal. Revert versus reset, and filter-repo versus a normal delete commit, are classic traps.',
    'In production, a leaked credential in history is a security incident. Knowing that rewriting history is necessary but not sufficient (rotate, then clean, then make everyone re-clone, then contact the host to purge cached views and PR refs if needed) is the difference between an incident closed and one that reappears.',
    'Repository permissions and protected tags decide who can publish a release. If anyone can move a `v1.0` tag, your release provenance is meaningless.',
  ],
  howItWorks: [
    '**Git LFS**: run `git lfs install` once per machine, then `git lfs track "*.psd"`, which writes a pattern to `.gitattributes` (`*.psd filter=lfs diff=lfs merge=lfs -text`). Commit `.gitattributes`. On commit, the clean filter uploads the content to the LFS store and commits a pointer; on checkout, the smudge filter downloads it. Existing history can be converted with `git lfs migrate import --include="*.psd" --everything`, which rewrites history. In Azure Pipelines, set `lfs: true` on the checkout step; in GitHub Actions, `lfs: true` on actions/checkout.',
    '**Scalar and partial clone**: `git clone --filter=blob:none` downloads commits and trees but fetches file contents on demand; `git sparse-checkout set src/web` limits the working tree. Scalar turns these on together with background maintenance. Azure Repos and GitHub both support partial clone.',
    '**Azure Repos permissions** are set at project level (all repositories) or per repository, and per branch, for security groups such as Contributors, Readers, Project Administrators and Build Service accounts. Key permissions: Read, Contribute, Create branch, Create tag, Force push (rewrite and destroy history), Manage permissions, Bypass policies when completing PRs, Bypass policies when pushing, Contribute to pull requests. Deny beats Allow; unset inherits.',
    '**GitHub repository roles** are Read, Triage, Write, Maintain and Admin, granted to users or teams, plus custom repository roles on Enterprise. Tags can be protected with **rulesets** that target tags (for example restricting creation, update and deletion of `v*`).',
    '**Tags**: lightweight tags are just names for a commit; annotated tags (`git tag -a v1.2.0 -m "..."`) are full objects with tagger, date and message and can be signed. Use annotated tags for releases, and push them explicitly (`git push origin v1.2.0` or `--follow-tags`).',
    '**Recovery**: `git reflog` lists recent HEAD positions; `git branch rescue <sha>` or `git reset --hard <sha>` restores. A deleted branch in Azure Repos can be restored from the Branches page by searching the exact name; GitHub offers Restore branch on the closed PR. `git revert <sha>` creates a new commit undoing a change, safe on shared branches; `git reset` moves the branch pointer and should not be used on pushed shared history.',
    '**Purge**: `git filter-repo --path secrets.json --invert-paths` removes a file from all history; `--replace-text` replaces strings. BFG does similar with `--delete-files` and `--replace-text`. Then force-push all branches and tags, ask collaborators to re-clone, and consider asking the host support to remove cached references. GitHub push protection and Azure DevOps GHAS push protection help stop the problem at source.',
  ],
  diagrams: [
    {
      kind: 'decision',
      title: 'Undo, recover or purge?',
      caption:
        'Revert for shared history, reflog to find lost work, rewrite history only when data must disappear, and always rotate a leaked secret first.',
      question: 'What do you need to do with the bad or lost commit?',
      branches: [
        {
          condition: 'Undo a change already pushed to main',
          result: 'git revert',
          detail: 'Adds an inverse commit, no rewrite',
          tone: 'success',
        },
        {
          condition: 'Recover work lost after a reset',
          result: 'git reflog, then branch or reset',
          detail: 'Reflog keeps old positions for a while',
          tone: 'accent',
        },
        {
          condition: 'Password committed to history',
          result: 'Rotate, then git filter-repo or BFG',
          detail: 'Force-push, everyone re-clones',
          tone: 'danger',
        },
        {
          condition: 'Huge binaries bloating the repo',
          result: 'git lfs migrate import',
          detail: 'Rewrites history to LFS pointers',
        },
      ],
    },
    {
      kind: 'flow',
      title: 'How Git LFS stores a binary',
      caption:
        'Git history stays small because it only ever contains the pointer, not the content.',
      nodes: [
        { label: 'git lfs track *.psd', detail: 'Pattern saved in .gitattributes', tone: 'accent' },
        { label: 'git add and commit', detail: 'Clean filter runs' },
        { label: 'Content uploaded to LFS store', detail: 'On git push' },
        { label: 'Pointer file committed', detail: 'oid sha256 and size only' },
        {
          label: 'Checkout downloads content',
          detail: 'Smudge filter, or lfs: true in CI',
          tone: 'success',
        },
      ],
    },
  ],
  keyObjects: [
    {
      kind: 'Git LFS pointer and .gitattributes',
      purpose:
        'Replaces large files in Git with small pointers while the content lives in the LFS store.',
      fields: [
        {
          path: '.gitattributes pattern',
          meaning: 'Pattern with filter=lfs diff=lfs merge=lfs -text.',
          required: true,
        },
        { path: 'pointer version', meaning: 'https://git-lfs.github.com/spec/v1 header line.' },
        { path: 'pointer oid', meaning: 'sha256 of the real content.' },
        { path: 'pointer size', meaning: 'Size of the real content in bytes.' },
      ],
    },
    {
      kind: 'Git repository security (Azure Repos)',
      purpose: 'Permissions for security groups at project, repository or branch scope.',
      fields: [
        { path: 'Contribute', meaning: 'Push commits to branches.' },
        {
          path: 'Force push (rewrite and destroy history)',
          meaning: 'Needed for history rewrites and branch deletion.',
        },
        { path: 'Create tag', meaning: 'Push new tags.' },
        {
          path: 'Bypass policies when pushing',
          meaning: 'Push directly despite branch policies. Grant rarely.',
        },
        { path: 'Manage permissions', meaning: 'Change security on the repo.' },
      ],
    },
    {
      kind: 'Reflog',
      purpose:
        'Local journal of where HEAD and branch tips pointed, used to find unreachable commits.',
      fields: [
        { path: 'HEAD@{n}', meaning: 'The nth previous position of HEAD.' },
        {
          path: 'gc.reflogExpire',
          meaning: 'How long reachable entries are kept (default 90 days).',
        },
        {
          path: 'gc.reflogExpireUnreachable',
          meaning: 'How long unreachable entries are kept (default 30 days).',
        },
      ],
    },
  ],
  realWorldExample: {
    title: 'A connection string in a public repository',
    story: [
      'A developer committed `appsettings.Development.json` containing a storage connection string with an account key to a repository that was later made public. Two days later the security team noticed unusual egress from the storage account.',
      'The response followed the right order. First they rotated the storage key and disabled shared key access where possible, moving the app to managed identity. Only then did they clean the repository, because rewriting history does nothing for a secret that has already been copied.',
      'They ran `git filter-repo --path appsettings.Development.json --invert-paths` on a fresh mirror clone, force-pushed every branch and tag, and asked everyone to delete old clones. They contacted GitHub support to remove cached views and PR references, and enabled secret scanning with push protection so the same mistake would be blocked at `git push`.',
      'Separately, the same repo had 4 GB of design files. They ran `git lfs migrate import --include="*.psd,*.ai" --everything`, and clone time in CI fell from minutes to seconds with a shallow fetch.',
    ],
  },
  yamlExamples: [
    {
      title: 'Checkout options in Azure Pipelines',
      language: 'yaml',
      explanation:
        'fetchDepth keeps CI clones shallow, lfs downloads LFS content, and a second repository resource shows multi-repo checkout.',
      code: `resources:
  repositories:
    - repository: shared
      type: git
      name: Platform/shared-templates
      ref: refs/heads/main

steps:
  - checkout: self
    fetchDepth: 1
    lfs: true
    clean: true
  - checkout: shared
    fetchDepth: 1
  - script: ls $(Pipeline.Workspace)/s
    displayName: Show both repositories`,
    },
    {
      title: 'Checkout in GitHub Actions with LFS and sparse checkout',
      language: 'yaml',
      explanation: 'Only the web folder is materialised, which helps in monorepos.',
      code: `jobs:
  build-web:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 1
          lfs: true
          sparse-checkout: |
            src/web
            package.json`,
    },
    {
      title: '.gitattributes for LFS',
      language: 'text',
      code: `*.psd  filter=lfs diff=lfs merge=lfs -text
*.mp4  filter=lfs diff=lfs merge=lfs -text
*.zip  filter=lfs diff=lfs merge=lfs -text
*.sh   text eol=lf`,
    },
  ],
  imperative: [
    {
      command: 'git lfs install && git lfs track "*.psd" && git add .gitattributes',
      what: 'Enables LFS for the user and starts tracking Photoshop files in this repository.',
      expected: 'Tracking "*.psd"',
    },
    {
      command: 'scalar clone https://dev.azure.com/<org>/<project>/_git/<repo>',
      what: 'Clones with partial clone, sparse checkout and background maintenance configured for a large repository.',
      placeholders: ['<org>', '<project>', '<repo>'],
    },
    {
      command: 'git reflog',
      what: 'Shows where HEAD has been, so you can find a commit lost after a reset or rebase.',
      expected: 'Lines like a1b2c3d HEAD@{2}: reset: moving to HEAD~3',
    },
    {
      command: 'git revert <sha>',
      what: 'Creates a new commit that undoes a pushed commit without rewriting history.',
      placeholders: ['<sha>'],
    },
    {
      command: 'git filter-repo --path config/secrets.json --invert-paths',
      what: 'Removes a file from every commit in history. Run on a fresh clone, then force-push.',
    },
    {
      command: 'git tag -a v1.2.0 -m "Release 1.2.0" && git push origin v1.2.0',
      what: 'Creates and pushes an annotated release tag.',
    },
    {
      command:
        'az devops security permission update --namespace-id <git-namespace-id> --subject <group-descriptor> --token repoV2/<project-id>/<repo-id> --deny-bit 8',
      what: 'Denies Force push for a group on a repository (bit 8 in the Git Repositories namespace).',
      placeholders: ['<git-namespace-id>', '<group-descriptor>', '<project-id>', '<repo-id>'],
    },
  ],
  declarative: {
    steps: [
      'Commit .gitattributes with LFS patterns before the first binary lands.',
      'Keep CI checkouts shallow and sparse where possible.',
      'Protect release tags with a tag ruleset (GitHub) or Create tag permission (Azure Repos).',
      'Enable secret scanning push protection so secrets never reach history.',
      'Document the purge runbook: rotate, rewrite, force-push, re-clone, purge caches.',
    ],
    code: [
      {
        title: 'GitHub ruleset protecting release tags',
        language: 'json',
        explanation:
          'Only the release app or admins (bypass list) can create, move or delete v* tags.',
        code: `{
  "name": "protect-release-tags",
  "target": "tag",
  "enforcement": "active",
  "conditions": {
    "ref_name": { "include": ["refs/tags/v*"], "exclude": [] }
  },
  "rules": [
    { "type": "creation" },
    { "type": "update" },
    { "type": "deletion" }
  ],
  "bypass_actors": [
    { "actor_id": 5, "actor_type": "RepositoryRole", "bypass_mode": "always" }
  ]
}`,
      },
      {
        title: 'Purge runbook',
        language: 'bash',
        explanation: 'Always on a fresh mirror clone. The secret must already be rotated.',
        code: `git clone --mirror https://github.com/<owner>/<repo>.git
cd <repo>.git

# Remove a file everywhere
git filter-repo --path config/secrets.json --invert-paths

# Or replace a leaked string wherever it appears
echo '<leaked-value>==>REMOVED' > replacements.txt
git filter-repo --replace-text replacements.txt

git push --force --mirror origin`,
      },
    ],
  },
  verification: [
    {
      command: 'git lfs ls-files',
      what: 'Lists files stored in LFS in the current checkout.',
      expected: 'Hash and path for each tracked binary.',
    },
    {
      command: 'git log --all --oneline -- config/secrets.json',
      what: 'After a purge, confirms no commit in any branch still touches the file.',
      expected: 'No output.',
    },
    {
      command: 'git count-objects -vH',
      what: 'Shows repository size, to measure the effect of LFS migration or a purge.',
    },
  ],
  troubleshooting: [
    {
      command: 'git lfs env',
      what: 'Shows LFS endpoint and configuration; use it when pointers appear instead of content (LFS not installed or not fetched).',
    },
    {
      command: 'git lfs pull',
      what: 'Downloads LFS content for the current checkout, for example in a pipeline that checked out without lfs: true.',
    },
    {
      command: 'git fsck --lost-found',
      what: 'Finds dangling commits when the reflog no longer has an entry.',
    },
  ],
  commonMistakes: [
    'Deleting a committed secret in a new commit and thinking it is gone. It is still in history and in every clone.',
    'Rewriting history before rotating the credential. Anyone who already cloned or scraped the repo still has it.',
    'Using `git reset --hard` plus force push to undo a change on a shared branch instead of `git revert`.',
    'Adding `git lfs track` after the binaries were committed. New versions go to LFS but the old blobs remain; use `git lfs migrate import`.',
    'Forgetting `lfs: true` on pipeline checkouts, so builds get pointer files instead of real assets.',
    'Granting Force push to Contributors, which lets anyone rewrite shared history.',
  ],
  examTips: [
    'Large binaries: Git LFS. Huge repository with many files: Scalar, partial clone and sparse checkout. CI speed: shallow fetch.',
    'Undo a pushed commit safely: `git revert`. Find a lost commit: `git reflog`.',
    'Remove sensitive data from history: `git filter-repo` or BFG, then force-push; rotate the secret regardless.',
    'Azure Repos Force push permission is required to rewrite history or delete branches.',
    'Annotated tags carry author, date and message and are the right choice for releases.',
  ],
  summary: [
    'LFS keeps binaries out of Git history; Scalar and partial clone keep huge repos usable.',
    'Monorepo simplifies atomic change and sharing; multi-repo simplifies ownership and permissions.',
    'Permissions and tag protection control who can change history and publish releases.',
    'Reflog recovers, revert undoes safely, filter-repo and BFG purge.',
    'Leaked secrets are rotated first, purged second, and prevented with push protection.',
  ],
  practice: [
    {
      id: 'az4-repo-management-p1',
      level: 'beginner',
      prompt:
        'Your team keeps 200 MB video files in the repository and clones are slow. What should you introduce?',
      answer:
        'Git LFS, tracking the video patterns in .gitattributes, and migrate existing history with git lfs migrate import.',
      explanation:
        'LFS replaces the binaries with pointer files so history stays small; content is fetched only for the checked-out commit.',
    },
    {
      id: 'az4-repo-management-p2',
      level: 'intermediate',
      prompt:
        'A developer ran git reset --hard HEAD~3 locally and lost unpushed work. How do they recover it?',
      answer:
        'Run git reflog, find the entry before the reset (for example HEAD@{1}), and run git reset --hard to that sha or create a branch at it.',
      explanation:
        'The commits are unreachable but still in the object database and referenced by the reflog until it expires.',
    },
    {
      id: 'az4-repo-management-p3',
      level: 'advanced',
      prompt: 'List, in order, the steps after discovering a cloud access key in a pushed commit.',
      answer:
        'Rotate or revoke the key, check logs for misuse, rewrite history with git filter-repo or BFG on a fresh clone, force-push all refs, have collaborators re-clone, ask the host to purge caches, and enable push protection.',
      explanation:
        'Rotation first, because history rewriting cannot recall copies that already exist.',
    },
    {
      id: 'az4-repo-management-p4',
      level: 'intermediate',
      prompt:
        'A bad commit is already on main and others have pulled it. Should you use git reset or git revert?',
      answer:
        'git revert, because it adds a new inverse commit and does not rewrite shared history.',
      explanation:
        'Reset plus force push would break everyone else and is usually blocked by branch policies.',
    },
  ],
  lab: {
    title: 'LFS, recovery and a history purge',
    scenario:
      'In a throwaway GitHub or Azure Repos repository, track binaries with LFS, lose and recover a commit, then purge a fake secret file from history.',
    prerequisites: [
      'git 2.38 or newer',
      'git-lfs and git-filter-repo installed',
      'An empty remote repository you can force-push to',
    ],
    tasks: [
      { instruction: 'Clone the empty repository, enable LFS and track `*.bin`.' },
      {
        instruction:
          'Create a 5 MB random `asset.bin`, commit and push, then confirm it is in LFS.',
      },
      {
        instruction:
          'Make three commits, run `git reset --hard HEAD~3`, and recover them using the reflog.',
      },
      {
        instruction:
          'Commit a file `fake-secret.txt` containing the text <not-a-real-secret>, push, then delete it in a new commit.',
        hint: 'Check that git log --all still shows it.',
      },
      { instruction: 'Purge the file from all history with git filter-repo and force-push.' },
      { instruction: 'Verify no commit references the file and create an annotated tag v0.1.0.' },
    ],
    solution: [
      {
        title: 'LFS and recovery',
        language: 'bash',
        code: `git clone <repo-url> lab && cd lab
git lfs install
git lfs track "*.bin"
head -c 5000000 /dev/urandom > asset.bin
git add .gitattributes asset.bin && git commit -m "Add asset" && git push
git lfs ls-files

for i in 1 2 3; do echo $i >> notes.txt; git commit -am "note $i" || { git add notes.txt; git commit -m "note $i"; }; done
git reset --hard HEAD~3
git reflog            # find the sha before the reset
git reset --hard HEAD@{1}`,
      },
      {
        title: 'Purge',
        language: 'bash',
        code: `echo "<not-a-real-secret>" > fake-secret.txt
git add fake-secret.txt && git commit -m "oops" && git push
git rm fake-secret.txt && git commit -m "remove" && git push
git log --all --oneline -- fake-secret.txt   # still there

git filter-repo --path fake-secret.txt --invert-paths --force
git remote add origin <repo-url>
git push --force --all origin

git tag -a v0.1.0 -m "First tag" && git push origin v0.1.0`,
      },
    ],
    verification: [
      {
        command: 'git log --all --oneline -- fake-secret.txt',
        what: 'No commit should mention the purged file.',
        expected: 'No output.',
      },
      {
        command: 'git lfs ls-files',
        what: 'asset.bin is still tracked by LFS after the rewrite.',
        expected: 'asset.bin listed',
      },
    ],
    cleanup: [
      {
        command: 'gh repo delete <owner>/<repo> --yes',
        what: 'Deletes the throwaway GitHub repository (use az repos delete for Azure Repos).',
        placeholders: ['<owner>', '<repo>'],
      },
      { command: 'cd .. && rm -rf lab', what: 'Removes the local clone.' },
    ],
  },
  relatedTopicIds: ['az4-branching-pr', 'az4-security-scanning', 'az4-package-management'],
  docs: [
    {
      title: 'Manage and store large files in Git',
      url: 'https://learn.microsoft.com/azure/devops/repos/git/manage-large-files',
    },
    {
      title: 'Set Git repository permissions',
      url: 'https://learn.microsoft.com/azure/devops/repos/git/set-git-repository-permissions',
    },
    {
      title: 'Removing sensitive data from a repository',
      url: 'https://docs.github.com/authentication/keeping-your-account-and-data-secure/removing-sensitive-data-from-a-repository',
    },
    {
      title: 'Git LFS on GitHub',
      url: 'https://docs.github.com/repositories/working-with-files/managing-large-files/about-git-large-file-storage',
    },
  ],
}
