import type { Course } from '../types'
import { az900Domains } from './domains'
import { az900Topics } from './topics'
import { az900Questions } from './questions'
import { az900CommandGroups } from './commands'

/**
 * AZ-900: Microsoft Azure Fundamentals.
 *
 * Microsoft publishes the skills measured and a weight RANGE per functional
 * group, and reports scores on a 1-1000 scale with 700 to pass. A scaled
 * score is not a percentage, and a range is not a weight, so the single
 * figures below are this app's own study aids and `officialWeights: false`
 * makes the UI say so wherever they appear.
 */
export const az900Course: Course = {
  id: 'az900',
  title: 'AZ-900 — Microsoft Azure Fundamentals',
  subtitle: 'Cloud concepts, core Azure architecture and services, management and governance',
  vendor: 'Microsoft',
  examCode: 'AZ-900',
  targetVersion: 'Skills measured as of 2026',
  status: 'available',
  route: '/az900',
  icon: '☁️',
  domains: az900Domains,
  topics: az900Topics,
  questions: az900Questions,
  commandGroups: az900CommandGroups,
  examBlueprint: {
    defaultMinutes: 45,
    passingScore: 70,
    questionCount: 30,
    officialWeights: false,
    note: 'Microsoft publishes each skill area as a weight range (25–30%, 35–40%, 30–35%) and reports a scaled score of 700 out of 1000 to pass. A scaled score is not a percentage. The single weights here are the midpoints of those ranges rounded to sum to 100, and the 70% target is the app’s own study aid - treat the result as revision feedback, not a prediction.',
    weights: {
      'az9-cloud': 28,
      'az9-architecture': 38,
      'az9-management': 34,
    },
  },
  copy: {
    studyPath:
      'Work through the three skill areas in order. Cloud concepts is vendor-neutral vocabulary; architecture and services is the largest area and introduces the services by category; management and governance ties it together with cost, policy and monitoring. The labs need only a free Azure account and the Cloud Shell in the portal.',
    provenance:
      'Skill areas, competencies and weight ranges are taken from Microsoft’s published AZ-900 study guide (skills measured). Check the study guide before your exam - Microsoft revises it periodically.',
    commandReference:
      'The Azure CLI and Azure PowerShell commands a fundamentals candidate should recognise - navigating subscriptions, resource groups, tags, locks, policy and cost - with copy buttons.',
    examWeighting:
      'Timed papers weighted by the midpoint of each published range. The single weights and the target score are the app’s own study aids.',
  },
  sources: [
    {
      title: 'AZ-900 study guide (skills measured)',
      url: 'https://learn.microsoft.com/credentials/certifications/resources/study-guides/az-900',
    },
    {
      title: 'Microsoft Certified: Azure Fundamentals',
      url: 'https://learn.microsoft.com/credentials/certifications/azure-fundamentals/',
    },
    { title: 'Azure documentation', url: 'https://learn.microsoft.com/azure/' },
  ],
}
