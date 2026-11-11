import type { InterviewTopic } from '../../../types'
import { roundsCgiQuestions } from './questions'

export const roundsCgiTopic: InterviewTopic = {
  id: 'rounds-cgi',
  group: 'rounds',
  title: 'CGI rounds',
  shortTitle: 'CGI',
  icon: '🏢',
  order: 212,
  oneLiner:
    'Questions from the CGI round: pull_request_target risks, GitHub-hosted vs self-hosted runners, Git submodules, LFS, stash, cherry-pick, merge vs rebase vs squash, CODEOWNERS, branch policies, reusable pipeline YAML and vulnerability management in CI/CD.',
  headlines: [
    'pull_request_target runs base-branch code with secrets and a write token even for fork PRs, so never check out and run the PR code inside it.',
    'Rebase rewrites commit IDs for a linear history: rebase only your own branches, push with --force-with-lease, and merge into main through a PR.',
    'Squash merge gives one revertable commit per PR; merge commits keep full history and suit long-lived release branches.',
    'Submodules pin another repo at an exact commit; Git LFS swaps large binaries for pointer files, and both need enabling in the pipeline checkout.',
    'CODEOWNERS (last match wins) plus branch policies or rulesets force every change through reviewed, validated pull requests.',
    'Shift security left: secret scanning, SAST, SCA, IaC and image scans gate fixable Critical/High findings, with triage, SLAs and runtime rescans after deploy.',
    'Write pipeline logic once: reusable workflows and composite actions in GitHub, extends templates in Azure DevOps, pinned to version tags.',
  ],
  questions: roundsCgiQuestions,
}
