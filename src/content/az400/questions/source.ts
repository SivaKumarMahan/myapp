import type { Question } from '../../types'

/** Original practice questions for this domain. Written for this app. */
export const az400SourceQuestions: Question[] = [
  {
    id: 'az4q-src-1',
    domainId: 'az4-source',
    topicId: 'az4-branching-pr',
    kind: 'mcq',
    category: 'concept',
    difficulty: 'intermediate',
    points: 2,
    prompt:
      'A team deploys a web app to production many times a day, has a strong automated test suite, and wants to minimise merge conflicts. Unfinished features must not be visible to users. Which branching strategy should you recommend?',
    options: [
      { id: 'a', text: 'GitFlow with develop, feature, release and hotfix branches' },
      { id: 'b', text: 'Trunk-based development with short-lived branches and feature flags' },
      { id: 'c', text: 'A release branch per sprint that is merged to main at sprint end' },
      { id: 'd', text: 'Long-lived feature branches merged when each feature is complete' },
    ],
    correct: ['b'],
    explanation:
      'Trunk-based development integrates continuously, which minimises conflicts, and feature flags hide unfinished work. GitFlow and per-sprint release branches add long-lived branches and delayed integration, and long-lived feature branches are the main cause of painful merges.',
  },
  {
    id: 'az4q-src-2',
    domainId: 'az4-source',
    topicId: 'az4-branching-pr',
    kind: 'mcq',
    category: 'concept',
    difficulty: 'beginner',
    points: 1,
    prompt:
      'You want the main branch history in Azure Repos to contain exactly one commit per completed pull request. Which merge type should the branch policy allow?',
    options: [
      { id: 'a', text: 'Basic merge (no fast-forward)' },
      { id: 'b', text: 'Squash merge' },
      { id: 'c', text: 'Rebase and fast-forward' },
      { id: 'd', text: 'Semi-linear merge' },
    ],
    correct: ['b'],
    explanation:
      'Squash merge combines all PR commits into one commit on the target. No fast-forward keeps every commit plus a merge commit, rebase and fast-forward replays each commit individually, and semi-linear merge rebases then adds a merge commit.',
  },
  {
    id: 'az4q-src-3',
    domainId: 'az4-source',
    topicId: 'az4-branching-pr',
    kind: 'multi',
    category: 'concept',
    difficulty: 'intermediate',
    points: 2,
    prompt:
      'Changes to files under /db in an Azure Repos repository must be approved by the DBA group, and every PR into main must build successfully. Which branch policies on main meet these requirements? (Select all that apply.)',
    options: [
      {
        id: 'a',
        text: 'Automatically included reviewers with path filter /db/* and the DBA group set as required',
      },
      { id: 'b', text: 'Build validation using the CI pipeline' },
      { id: 'c', text: 'Require a minimum number of reviewers set to 2' },
      { id: 'd', text: 'Check for comment resolution' },
    ],
    correct: ['a', 'b'],
    explanation:
      'Path-filtered automatically included reviewers route /db changes to the DBA group, and build validation enforces a passing build. A reviewer count cannot require a specific group, and comment resolution does not involve approval or builds.',
  },
  {
    id: 'az4q-src-4',
    domainId: 'az4-source',
    topicId: 'az4-branching-pr',
    kind: 'mcq',
    category: 'troubleshoot',
    difficulty: 'intermediate',
    points: 2,
    prompt:
      'A pipeline for an Azure Repos Git repository contains a pr: section listing main, but no pipeline runs when PRs are opened. What should you do?',
    options: [
      { id: 'a', text: 'Move the pr: section above the trigger: section' },
      { id: 'b', text: 'Add a build validation branch policy on main that uses the pipeline' },
      { id: 'c', text: 'Change the pipeline pool to a self-hosted agent' },
      { id: 'd', text: 'Enable the Allow scripts to access the OAuth token option' },
    ],
    correct: ['b'],
    explanation:
      'For Azure Repos, the pr keyword is ignored; PR validation is configured through the build validation branch policy. The order of sections, the agent pool and the OAuth token option have no effect on PR triggering.',
  },
  {
    id: 'az4q-src-5',
    domainId: 'az4-source',
    topicId: 'az4-branching-pr',
    kind: 'multi',
    category: 'concept',
    difficulty: 'advanced',
    points: 2,
    prompt:
      'Which capabilities do GitHub rulesets offer that classic branch protection rules do not? (Select all that apply.)',
    options: [
      { id: 'a', text: 'Targeting tags as well as branches' },
      { id: 'b', text: 'Applying rules across many repositories from the organization level' },
      { id: 'c', text: 'An Evaluate enforcement mode that reports without blocking' },
      { id: 'd', text: 'Requiring pull request reviews before merging' },
    ],
    correct: ['a', 'b', 'c'],
    explanation:
      'Rulesets can target tags, be defined at organization level, be layered, and run in Evaluate mode. Requiring pull request reviews is available in both rulesets and classic branch protection, so it is not a difference.',
  },
  {
    id: 'az4q-src-6',
    domainId: 'az4-source',
    topicId: 'az4-branching-pr',
    kind: 'command',
    category: 'command',
    difficulty: 'intermediate',
    points: 2,
    prompt:
      'With the GitHub CLI, from the current feature branch, create a pull request into main using the commit messages for the title and body.',
    acceptedAnswers: [
      'gh pr create --base main --fill',
      'gh pr create --fill --base main',
      'gh pr create -B main --fill',
      'gh pr create --fill -B main',
    ],
    answerHint: 'gh pr create ...',
    explanation:
      '`gh pr create --fill` uses commit information for the title and body, and `--base` (or `-B`) sets the target branch.',
  },
  {
    id: 'az4q-src-7',
    domainId: 'az4-source',
    topicId: 'az4-repo-management',
    kind: 'mcq',
    category: 'concept',
    difficulty: 'beginner',
    points: 1,
    prompt:
      'A game studio stores textures and video files of several hundred megabytes in Git. Clones take a very long time. Which solution addresses the root cause?',
    options: [
      { id: 'a', text: 'Git LFS, tracking the binary file types in .gitattributes' },
      { id: 'b', text: 'Increasing the agent disk size' },
      { id: 'c', text: 'Squash merging every pull request' },
      { id: 'd', text: 'Splitting each binary into a separate branch' },
    ],
    correct: ['a'],
    explanation:
      'Git LFS stores binaries outside Git history and keeps small pointers in commits, so clones download only what is needed. More disk does not reduce transfer, squash merging does not remove binary versions, and branches do not stop history growing.',
  },
  {
    id: 'az4q-src-8',
    domainId: 'az4-source',
    topicId: 'az4-repo-management',
    kind: 'mcq',
    category: 'concept',
    difficulty: 'intermediate',
    points: 2,
    prompt:
      'A commit that broke checkout has already been pushed to main and pulled by several developers. You need to undo its changes without rewriting shared history. What should you run?',
    options: [
      { id: 'a', text: 'git reset --hard <sha>~1 followed by git push --force' },
      { id: 'b', text: 'git revert <sha>' },
      { id: 'c', text: 'git checkout <sha>~1' },
      { id: 'd', text: 'git commit --amend' },
    ],
    correct: ['b'],
    explanation:
      'git revert adds a new commit that inverses the bad one, preserving history. Reset plus force push rewrites shared history and is normally blocked by policies, checkout only moves your working copy, and amend changes only the latest local commit.',
  },
  {
    id: 'az4q-src-9',
    domainId: 'az4-source',
    topicId: 'az4-repo-management',
    kind: 'multi',
    category: 'troubleshoot',
    difficulty: 'advanced',
    points: 2,
    prompt:
      'A developer pushed a commit containing a database password to a shared repository. Which actions are required? (Select all that apply.)',
    options: [
      { id: 'a', text: 'Rotate the password immediately' },
      {
        id: 'b',
        text: 'Rewrite history with git filter-repo or BFG and force-push all affected refs',
      },
      { id: 'c', text: 'Ask collaborators to re-clone or reset their local copies' },
      { id: 'd', text: 'Delete the file in a new commit and consider the issue closed' },
      { id: 'e', text: 'Rename the branch so the commit is no longer visible' },
    ],
    correct: ['a', 'b', 'c'],
    explanation:
      'The secret must be rotated because it may already be copied, history must be rewritten to remove it, and old clones must be replaced or they will push it back. A delete commit leaves the secret in history, and renaming a branch hides nothing.',
  },
  {
    id: 'az4q-src-10',
    domainId: 'az4-source',
    topicId: 'az4-repo-management',
    kind: 'command',
    category: 'command',
    difficulty: 'intermediate',
    points: 2,
    prompt:
      'After an accidental git reset --hard, which command lists the previous positions of HEAD so you can find the lost commit?',
    acceptedAnswers: ['git reflog', 'git reflog show', 'git reflog show HEAD', 'git log -g'],
    answerHint: 'git ...',
    explanation:
      '`git reflog` (or `git log -g`) shows the reference log of HEAD, including the commit before the reset, which you can restore with git reset --hard or git branch.',
  },
  {
    id: 'az4q-src-11',
    domainId: 'az4-source',
    topicId: 'az4-repo-management',
    kind: 'mcq',
    category: 'concept',
    difficulty: 'advanced',
    points: 2,
    prompt:
      'A monorepo has millions of files. Developers each work in one or two folders and complain that status and checkout are slow. Which approach is designed for this?',
    options: [
      {
        id: 'a',
        text: 'Scalar, enabling partial clone, sparse checkout and background maintenance',
      },
      { id: 'b', text: 'Git LFS for all source files' },
      { id: 'c', text: 'Converting every folder into a Git submodule overnight' },
      { id: 'd', text: 'Running git gc --aggressive before every pull' },
    ],
    correct: ['a'],
    explanation:
      'Scalar configures a clone for large repositories: partial clone downloads objects on demand, sparse checkout limits the working tree, and maintenance runs in the background. LFS is for large binaries, not many source files, submodules are a major restructure, and aggressive gc on every pull makes things slower.',
  },
  {
    id: 'az4q-src-12',
    domainId: 'az4-source',
    topicId: 'az4-repo-management',
    kind: 'mcq',
    category: 'concept',
    difficulty: 'intermediate',
    points: 2,
    prompt:
      'In Azure Repos, which permission must a user have to delete a branch or rewrite its history?',
    options: [
      { id: 'a', text: 'Contribute' },
      { id: 'b', text: 'Force push (rewrite and destroy history)' },
      { id: 'c', text: 'Create branch' },
      { id: 'd', text: 'Contribute to pull requests' },
    ],
    correct: ['b'],
    explanation:
      'Force push (rewrite and destroy history) controls both force pushes and branch deletion. Contribute allows normal pushes, Create branch allows new branches, and Contribute to pull requests allows commenting and voting.',
  },
  {
    id: 'az4q-src-13',
    domainId: 'az4-source',
    topicId: 'az4-branching-pr',
    kind: 'task',
    category: 'lab',
    difficulty: 'intermediate',
    points: 2,
    prompt:
      'Protect the main branch of an Azure Repos repository so that direct pushes are blocked, PRs need one approval from someone other than the author, the CI pipeline must pass, and only squash merges are allowed.',
    context:
      'An Azure DevOps project with a Git repository and an existing CI pipeline. Azure CLI with the azure-devops extension.',
    checkpoints: [
      {
        id: 'c1',
        text: 'A minimum reviewer policy of 1 exists on main with creator vote not counting',
      },
      { id: 'c2', text: 'A build validation policy on main references the CI pipeline' },
      { id: 'c3', text: 'A merge strategy policy on main allows only squash' },
      { id: 'c4', text: 'A direct git push to main is rejected' },
    ],
    solution: [
      {
        title: 'Policies with az repos',
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
    ],
    explanation:
      'Any required branch policy blocks direct pushes to the branch. Setting creator-vote-counts to false stops the author approving their own PR, and the merge strategy policy restricts completion types.',
  },
]
