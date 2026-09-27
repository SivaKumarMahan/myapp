import type { Course } from '../types'
import { az400Domains } from './domains'
import { az400Topics } from './topics'
import { az400Questions } from './questions'
import { az400CommandGroups } from './commands'

/**
 * AZ-400: Designing and Implementing Microsoft DevOps Solutions.
 *
 * Weights are published as ranges and the pass mark is a scaled 700/1000, so
 * the single figures here are the app's own study aids.
 */
export const az400Course: Course = {
  id: 'az400',
  title: 'AZ-400 — Designing and Implementing Microsoft DevOps Solutions',
  subtitle:
    'Azure Boards, Git strategy, Azure Pipelines and GitHub Actions, deployment strategy, DevSecOps and instrumentation',
  vendor: 'Microsoft',
  examCode: 'AZ-400',
  targetVersion: 'Skills measured as of 2026',
  status: 'available',
  route: '/az400',
  icon: '🚀',
  domains: az400Domains,
  topics: az400Topics,
  questions: az400Questions,
  commandGroups: az400CommandGroups,
  examBlueprint: {
    defaultMinutes: 100,
    passingScore: 70,
    questionCount: 40,
    officialWeights: false,
    note: 'Microsoft publishes each skill area as a weight range (build and release pipelines alone are 50–55%) and reports a scaled score of 700 out of 1000 to pass. A scaled score is not a percentage. The single weights here are the midpoints of those ranges rounded to sum to 100, and the 70% target is the app’s own study aid - treat the result as revision feedback, not a prediction.',
    weights: {
      'az4-processes': 13,
      'az4-source': 13,
      'az4-pipelines': 54,
      'az4-security': 13,
      'az4-instrumentation': 7,
    },
  },
  copy: {
    studyPath:
      'Build and release pipelines are more than half of the exam, so spend most of your time there - but read processes and source control first, because every pipeline question assumes you know how work and code flow into it. Labs need a free Azure DevOps organization, a GitHub account and an Azure subscription.',
    provenance:
      'Skill areas, competencies and weight ranges are taken from Microsoft’s published AZ-400 study guide (skills measured). Check the study guide before your exam - Microsoft revises it periodically.',
    commandReference:
      'Git, the Azure DevOps CLI extension, the GitHub CLI and the Azure CLI commands used to wire pipelines to Azure - with copy buttons, plus the YAML skeletons worth memorising.',
    examWeighting:
      'Timed papers weighted by the midpoint of each published range. The single weights and the target score are the app’s own study aids.',
  },
  sources: [
    {
      title: 'AZ-400 study guide (skills measured)',
      url: 'https://learn.microsoft.com/credentials/certifications/resources/study-guides/az-400',
    },
    {
      title: 'Microsoft Certified: DevOps Engineer Expert',
      url: 'https://learn.microsoft.com/credentials/certifications/devops-engineer/',
    },
    {
      title: 'Azure Pipelines documentation',
      url: 'https://learn.microsoft.com/azure/devops/pipelines/',
    },
    { title: 'GitHub Actions documentation', url: 'https://docs.github.com/actions' },
  ],
}
