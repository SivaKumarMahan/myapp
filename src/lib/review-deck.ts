import type { Question } from '../content/types'
import type { CourseIndex } from '../content/registry'
import { courseIndexes } from '../content/registry'
import { allInterviewQuestions } from '../content/interview'
import type { ProgressState } from './storage'
import {
  dueCardIds,
  forecast,
  interviewCardId,
  localDay,
  parseCardId,
  practiceCardId,
  type SrsCard,
} from './srs'

/**
 * Which questions are cards, and what today's review queue holds.
 *
 * Every interview question is a card, and so is every practice question that
 * can be marked automatically. Hands-on `task` questions are not: they are
 * labs you self-verify, not something to recall on a schedule.
 */

export type DeckFilter = 'all' | 'interview' | 'practice'

export interface PracticeCard {
  question: Question
  course: CourseIndex
}

const isGradable = (question: Question) => question.kind !== 'task'

const practiceCards = new Map<string, PracticeCard>(
  courseIndexes.flatMap((course) =>
    [...course.questionById.values()]
      .filter(isGradable)
      .map((question) => [practiceCardId(question.id), { question, course }] as const),
  ),
)

/** Every card, in content order: interview topics first, then each course. */
const allCardIds: string[] = [
  ...allInterviewQuestions.map((entry) => interviewCardId(entry.question.id)),
  ...practiceCards.keys(),
]

export const practiceCardFor = (cardId: string) => practiceCards.get(cardId)

export const deckSize = allCardIds.length

const matchesFilter = (cardId: string, filter: DeckFilter) =>
  filter === 'all' || parseCardId(cardId)?.kind === filter

/** Cards the content still has (a removed question leaves an orphaned card). */
const known = new Set(allCardIds)

export function newCardsLeftToday(state: ProgressState, now = Date.now()): number {
  return Math.max(0, state.settings.newCardsPerDay - (state.newCardsByDay[localDay(now)] ?? 0))
}

export interface ReviewQueue {
  due: string[]
  fresh: string[]
}

/** Due reviews (most overdue first), then as many new cards as today allows. */
export function buildQueue(
  state: ProgressState,
  filter: DeckFilter = 'all',
  now = Date.now(),
): ReviewQueue {
  const due = dueCardIds(state.srs, now).filter((id) => known.has(id) && matchesFilter(id, filter))
  const limit = newCardsLeftToday(state, now)
  const fresh: string[] = []
  for (const id of allCardIds) {
    if (fresh.length >= limit) break
    if (!state.srs[id] && matchesFilter(id, filter)) fresh.push(id)
  }
  return { due, fresh }
}

export function queueCounts(state: ProgressState, now = Date.now()) {
  const { due, fresh } = buildQueue(state, 'all', now)
  return { due: due.length, fresh: fresh.length, total: due.length + fresh.length }
}

/** Mistake-notebook questions for one course, most recently missed first. */
export function mistakesFor(state: ProgressState, course: CourseIndex): Question[] {
  return Object.entries(state.mistakes)
    .filter(([, entry]) => entry.courseId === course.course.id)
    .sort((a, b) => b[1].lastWrongAt - a[1].lastWrongAt)
    .map(([id]) => course.questionById.get(id))
    .filter((question): question is Question => Boolean(question))
}

/** The 30-day forecast, for cards whose question still exists. */
export function deckForecast(state: ProgressState, now = Date.now()): number[] {
  const cards: Record<string, SrsCard> = {}
  for (const [id, card] of Object.entries(state.srs)) if (known.has(id)) cards[id] = card
  return forecast(cards, 30, now)
}

/** Mistakes across every course, counting only questions the content still has. */
export function mistakeCount(state: ProgressState): number {
  return courseIndexes.reduce((sum, course) => sum + mistakesFor(state, course).length, 0)
}
