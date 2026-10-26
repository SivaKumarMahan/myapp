import type { InterviewTopic } from '../../../types'
import { roundsBasfQuestions } from './questions'

export const roundsBasfTopic: InterviewTopic = {
  id: 'rounds-basf',
  group: 'rounds',
  title: 'BASF rounds',
  shortTitle: 'BASF',
  icon: '🏢',
  order: 206,
  oneLiner:
    'Questions from the BASF round: REST APIs, Azure Repos and Boards, application versus network shell scripting, rollback, deployment strategy and CI/CD.',
  headlines: [
    'A REST API is HTTP plus JSON: GET reads, POST creates or triggers, PUT replaces, PATCH updates, DELETE removes; check the status code.',
    'Azure Repos offers Git (distributed, pull requests) and TFVC (centralized, check-in/check-out, legacy).',
    'Azure Boards tracks user stories, tasks and bugs, and links work items to commits, PRs and pipelines for traceability.',
    'Application-side scripts check processes, logs and health; network-side scripts check DNS, ports and routes. Check both in an incident.',
    'Rollback on AKS: helm history, helm rollback to the last good revision, then verify. Database changes do not roll back with the app.',
    'Rolling update by default (maxSurge 1, maxUnavailable 0, readiness probes); blue-green or canary for high-risk releases.',
    'Continuous Delivery waits for a production approval; Continuous Deployment ships every change that passes the checks.',
  ],
  questions: roundsBasfQuestions,
}
