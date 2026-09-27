import type { InterviewTopic } from '../../../types'
import { myGitQuestions } from './git'
import { myGithubActionsQuestions } from './github-actions'
import { myGitlabQuestions } from './gitlab'

export const myGitTopic: InterviewTopic = {
  id: 'my-git',
  group: 'bank',
  title: 'My Git, GitHub Actions & GitLab questions',
  shortTitle: 'My Git',
  icon: '🌿',
  order: 108,
  oneLiner:
    'My Git, GitHub Actions and GitLab notes: daily commands, conflicts, recovery, branching strategies and tags, workflows and cross-repo triggers, and GitLab CI rules, artifacts and secrets.',
  headlines: [
    '`git fetch` only updates remote refs; `git pull` fetches and then merges or rebases into your branch.',
    'Undo a pushed commit on a shared branch with `git revert` (use `-m 1` for a merge commit), not `reset --hard` plus force push.',
    'Only rebase or force-push a branch you own, and use `--force-with-lease` instead of `--force`.',
    'A leaked secret must be revoked first; rewriting history with `git filter-repo` alone does not make it safe.',
    'Trunk-based development with short branches, feature flags and a protected main scales best for large, continuously delivering teams.',
    'In GitHub Actions: minimal `permissions`, actions pinned to SHAs, OIDC instead of cloud keys, and protected environments for deploys.',
    'In GitLab CI, prefer `rules` over `only/except`; artifacts are deliverables, cache is disposable and must never be trusted for production.',
  ],
  questions: [...myGitQuestions, ...myGithubActionsQuestions, ...myGitlabQuestions],
}
