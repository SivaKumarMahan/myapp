import type { Course } from '../types'
import { az104Domains } from './domains'
import { az104Topics } from './topics'
import { az104Questions } from './questions'
import { az104CommandGroups } from './commands'

/**
 * AZ-104: Microsoft Azure Administrator.
 *
 * As with every Microsoft exam, weights are published as ranges and the pass
 * mark is a scaled 700/1000, so the single figures here are the app's own.
 */
export const az104Course: Course = {
  id: 'az104',
  title: 'AZ-104 — Microsoft Azure Administrator',
  subtitle: 'Identity and governance, storage, compute, virtual networking, monitoring and backup',
  vendor: 'Microsoft',
  examCode: 'AZ-104',
  targetVersion: 'Skills measured as of 2026',
  status: 'available',
  route: '/az104',
  icon: '🛠️',
  domains: az104Domains,
  topics: az104Topics,
  questions: az104Questions,
  commandGroups: az104CommandGroups,
  examBlueprint: {
    defaultMinutes: 100,
    passingScore: 70,
    questionCount: 40,
    officialWeights: false,
    note: 'Microsoft publishes each skill area as a weight range (for example 20–25%) and reports a scaled score of 700 out of 1000 to pass. A scaled score is not a percentage. The single weights here are the midpoints of those ranges rounded to sum to 100, and the 70% target is the app’s own study aid - treat the result as revision feedback, not a prediction.',
    weights: {
      'az1-identity': 24,
      'az1-storage': 19,
      'az1-compute': 24,
      'az1-networking': 19,
      'az1-monitor': 14,
    },
  },
  copy: {
    studyPath:
      'Start with identity and governance, because every later lab assumes you can create a resource group and assign a role. Storage and compute are independent of each other; networking builds on compute, and monitoring and backup come last because they observe everything else. Labs use a free or pay-as-you-go subscription - each one ends with a cleanup step that deletes its resource group.',
    provenance:
      'Skill areas, competencies and weight ranges are taken from Microsoft’s published AZ-104 study guide (skills measured). Check the study guide before your exam - Microsoft revises it periodically.',
    commandReference:
      'Azure CLI and Azure PowerShell for day-to-day administration - identity and RBAC, policy, storage and AzCopy, VMs and scale sets, containers, App Service, networking, monitoring and backup - with copy buttons.',
    examWeighting:
      'Timed papers weighted by the midpoint of each published range. The single weights and the target score are the app’s own study aids.',
  },
  sources: [
    {
      title: 'AZ-104 study guide (skills measured)',
      url: 'https://learn.microsoft.com/credentials/certifications/resources/study-guides/az-104',
    },
    {
      title: 'Microsoft Certified: Azure Administrator Associate',
      url: 'https://learn.microsoft.com/credentials/certifications/azure-administrator/',
    },
    { title: 'Azure CLI reference', url: 'https://learn.microsoft.com/cli/azure/' },
  ],
}
