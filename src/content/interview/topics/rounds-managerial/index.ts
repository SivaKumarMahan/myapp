import type { InterviewTopic } from '../../../types'
import { roundsManagerialQuestions } from './questions'
import { roundsManagerialCompanyQuestions } from './company'

export const roundsManagerialTopic: InterviewTopic = {
  id: 'rounds-managerial',
  group: 'rounds',
  title: 'Managerial rounds',
  shortTitle: 'Managerial',
  icon: '🤝',
  order: 202,
  oneLiner:
    'Behavioural, scenario and company-research questions from the Deloitte managerial round, with the answers and the facts to draw on.',
  headlines: [
    'The manager is evaluating how you behave when things go wrong, not whether you can explain kubectl. Keep answers to 60-90 seconds.',
    'Production failure: Communicate -> Assess impact -> Troubleshoot -> Rollback if required -> Restore -> RCA -> Prevention.',
    'Developer disagreement: separate the person from the problem; decide on facts and risk, escalate to a lead or architect if still stuck.',
    'Competing priorities: production first, tell your manager, ask to reassign or re-time the new task, delegate. Never "I will do both simultaneously".',
    'Team member missing deadlines: Understand the reason -> Support -> Set expectations -> Monitor -> Escalate if necessary.',
    'Unhappy client: listen, acknowledge the impact, be transparent, give a follow-up plan with owners and dates - rebuild confidence.',
    'Why leaving: good experience -> reached the next stage -> want larger responsibility and enterprise exposure -> Deloitte offers that. Salary is never the headline reason.',
    'Company facts to drop in: Big Four, founded 1845 in London, 150+ countries, 470,000+ people, Consulting is the largest line, Deloitte USI with its biggest campus in Hyderabad.',
  ],
  questions: [...roundsManagerialQuestions, ...roundsManagerialCompanyQuestions],
}
