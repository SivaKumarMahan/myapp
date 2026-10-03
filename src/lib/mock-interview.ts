import { allInterviewQuestions } from '../content/interview'
import mockData from '../content/interview/mock.json'
import type { EnrichedQuestion, KeyPoint } from './bot/types'
import { findPack } from './packs'
import type { ProgressState } from './storage'

/**
 * The timed mock interview's pure parts: which questions to ask and which
 * follow-ups to add. Scoring and enrichment come from the Study bot
 * (`lib/bot`), so both interviewers judge answers the same way.
 */

export interface MockSettings {
  level: '' | 'basic' | 'intermediate' | 'senior'
  topics: string[]
  pack: string
  count: number
  minutes: number
  followUps: number
}

export const DEFAULT_SETTINGS: MockSettings = {
  level: '',
  topics: [],
  pack: '',
  count: 5,
  minutes: 2,
  followUps: 1,
}

export interface FollowUpPrompt {
  question: string
  shortAnswer?: string
  keyPoints: KeyPoint[]
}

export const genericFollowUps = (
  mockData as { followUps: { id: string; question: string; keyPoints: KeyPoint[] }[] }
).followUps

/** Questions you can answer out loud (open and scenario), filtered and shuffled. */
export function pickQuestions(
  settings: MockSettings,
  state: ProgressState,
  random = Math.random,
): string[] {
  const pack = findPack(settings.pack, state)
  const inPack = pack ? new Set(pack.questionIds) : null
  const pool = allInterviewQuestions.filter(({ question, topic }) => {
    if (question.kind !== 'open' && question.kind !== 'scenario') return false
    if (inPack && !inPack.has(question.id)) return false
    if (settings.topics.length > 0 && !settings.topics.includes(topic.id)) return false
    if (settings.level === 'senior' && question.level !== 'advanced') return false
    if (settings.level && settings.level !== 'senior' && question.level !== settings.level)
      return false
    return true
  })
  const ids = pool.map(({ question }) => question.id)
  for (let i = ids.length - 1; i > 0; i -= 1) {
    const j = Math.floor(random() * (i + 1))
    ;[ids[i], ids[j]] = [ids[j], ids[i]]
  }
  return ids.slice(0, settings.count)
}

/** The question's own follow-ups first (with model answers when curated), then generic ones. */
export function followUpsFor(
  question: EnrichedQuestion,
  count: number,
  random = Math.random,
): FollowUpPrompt[] {
  if (count <= 0) return []
  const own = question.followUps.slice(0, count).map((followUp) => ({
    question: followUp.question,
    shortAnswer: followUp.shortAnswer,
    keyPoints: followUp.keyPoints,
  }))
  const generic = [...genericFollowUps]
  for (let i = generic.length - 1; i > 0; i -= 1) {
    const j = Math.floor(random() * (i + 1))
    ;[generic[i], generic[j]] = [generic[j], generic[i]]
  }
  // Mix: at most one of the question's own when two are asked, so "why?" or "at 10x?" always comes up.
  const fromOwn = own.slice(0, count > 1 ? 1 : count)
  return [
    ...fromOwn,
    ...generic.map(({ question: text, keyPoints }) => ({ question: text, keyPoints })),
  ].slice(0, count)
}

export function formatClock(seconds: number): string {
  const safe = Math.max(0, Math.round(seconds))
  return `${Math.floor(safe / 60)}:${String(safe % 60).padStart(2, '0')}`
}
