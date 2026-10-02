/**
 * Spaced repetition: an FSRS-5 scheduler.
 *
 * Every interview question and every graded practice question is a card. A
 * card remembers two numbers about your memory of it - stability (roughly, how
 * many days until you would have a 90% chance of still recalling it) and
 * difficulty (1-10) - and each rating moves them. The next review is scheduled
 * for when recall is predicted to drop to `DESIRED_RETENTION`.
 *
 * Pure functions only: the progress provider owns persistence.
 * Reference: https://github.com/open-spaced-repetition/fsrs4anki/wiki/The-Algorithm
 */

export type Rating = 1 | 2 | 3 | 4
export const AGAIN: Rating = 1
export const HARD: Rating = 2
export const GOOD: Rating = 3
export const EASY: Rating = 4

export const RATINGS: { rating: Rating; label: string }[] = [
  { rating: AGAIN, label: 'Again' },
  { rating: HARD, label: 'Hard' },
  { rating: GOOD, label: 'Good' },
  { rating: EASY, label: 'Easy' },
]

/** How sure you were before checking a practice answer. */
export type Confidence = 'guessed' | 'unsure' | 'knew'

export interface SrsCard {
  /** Days. */
  stability: number
  /** 1 (easy) to 10 (hard). */
  difficulty: number
  /** Epoch ms when the card is next due. */
  due: number
  /** Epoch ms of the most recent rating. */
  lastReview: number
  reps: number
  lapses: number
  lastRating: Rating
}

/** FSRS-5 default parameters, fitted on a large review dataset. */
const W = [
  0.40255, 1.18385, 3.173, 15.69105, 7.1949, 0.5345, 1.4604, 0.0046, 1.54575, 0.1192, 1.01925,
  1.9395, 0.11, 0.29605, 2.2698, 0.2315, 2.9898, 0.51655, 0.6621,
]
export const DESIRED_RETENTION = 0.9
const DECAY = -0.5
const FACTOR = 19 / 81
const DAY_MS = 86_400_000
const MAX_INTERVAL_DAYS = 36_500
/** A lapsed card comes back in the same session rather than tomorrow. */
export const RELEARN_MS = 10 * 60_000

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value))

const initialStability = (rating: Rating) => W[rating - 1]
const initialDifficulty = (rating: Rating) => clamp(W[4] - Math.exp(W[5] * (rating - 1)) + 1, 1, 10)

/** Probability of recall `elapsedDays` after a review, given stability. */
export const retrievability = (elapsedDays: number, stability: number) =>
  Math.pow(1 + (FACTOR * elapsedDays) / stability, DECAY)

const intervalDays = (stability: number) =>
  clamp(
    Math.round((stability / FACTOR) * (Math.pow(DESIRED_RETENTION, 1 / DECAY) - 1)),
    1,
    MAX_INTERVAL_DAYS,
  )

const nextDifficulty = (difficulty: number, rating: Rating) => {
  const delta = -W[6] * (rating - 3)
  const damped = difficulty + (delta * (10 - difficulty)) / 9
  // Mean reversion towards the difficulty of a card first rated Easy.
  return clamp(W[7] * initialDifficulty(EASY) + (1 - W[7]) * damped, 1, 10)
}

const recallStability = (card: SrsCard, r: number, rating: Rating) => {
  const hardPenalty = rating === HARD ? W[15] : 1
  const easyBonus = rating === EASY ? W[16] : 1
  return (
    card.stability *
    (Math.exp(W[8]) *
      (11 - card.difficulty) *
      Math.pow(card.stability, -W[9]) *
      (Math.exp(W[10] * (1 - r)) - 1) *
      hardPenalty *
      easyBonus +
      1)
  )
}

const forgetStability = (card: SrsCard, r: number) =>
  Math.min(
    card.stability,
    W[11] *
      Math.pow(card.difficulty, -W[12]) *
      (Math.pow(card.stability + 1, W[13]) - 1) *
      Math.exp(W[14] * (1 - r)),
  )

/** Applies one rating. `card` is undefined for a card seen for the first time. */
export function schedule(card: SrsCard | undefined, rating: Rating, now = Date.now()): SrsCard {
  if (!card) {
    const stability = initialStability(rating)
    return {
      stability,
      difficulty: initialDifficulty(rating),
      due: rating === AGAIN ? now + RELEARN_MS : now + intervalDays(stability) * DAY_MS,
      lastReview: now,
      reps: 1,
      lapses: 0,
      lastRating: rating,
    }
  }

  const elapsedDays = Math.max(0, (now - card.lastReview) / DAY_MS)
  let stability: number
  if (elapsedDays < 1) {
    // Same-day review: FSRS-5's short-term stability update.
    stability = card.stability * Math.exp(W[17] * (rating - 3 + W[18]))
  } else {
    const r = retrievability(elapsedDays, card.stability)
    stability = rating === AGAIN ? forgetStability(card, r) : recallStability(card, r, rating)
  }
  stability = clamp(stability, 0.01, MAX_INTERVAL_DAYS)

  return {
    stability,
    difficulty: nextDifficulty(card.difficulty, rating),
    due: rating === AGAIN ? now + RELEARN_MS : now + intervalDays(stability) * DAY_MS,
    lastReview: now,
    reps: card.reps + 1,
    lapses: card.lapses + (rating === AGAIN && card.reps > 0 ? 1 : 0),
    lastRating: rating,
  }
}

/** "10m", "3d", "2mo", "1.4y" - what each rating button would schedule. */
export function formatInterval(ms: number): string {
  const minutes = ms / 60_000
  if (minutes < 60) return `${Math.max(1, Math.round(minutes))}m`
  const days = ms / DAY_MS
  if (days < 1) return `${Math.round(minutes / 60)}h`
  if (days < 30) return `${Math.round(days)}d`
  if (days < 365) return `${Math.round(days / 30)}mo`
  return `${(days / 365).toFixed(1)}y`
}

export const previewIntervals = (card: SrsCard | undefined, now = Date.now()) =>
  Object.fromEntries(
    RATINGS.map(({ rating }) => [rating, formatInterval(schedule(card, rating, now).due - now)]),
  ) as Record<Rating, string>

/**
 * A practice answer becomes a rating. A correct guess is scheduled like a
 * miss - you did not know it, you got lucky.
 */
export function ratingForAnswer(correct: boolean, confidence: Confidence | undefined): Rating {
  if (!correct || confidence === 'guessed') return AGAIN
  if (confidence === 'unsure') return HARD
  return GOOD
}

/* ------------------------------------------------------------------ card ids */

/** Interview and practice ids live in different namespaces, so cards are prefixed. */
export const interviewCardId = (questionId: string) => `itv:${questionId}`
export const practiceCardId = (questionId: string) => `q:${questionId}`

export function parseCardId(
  cardId: string,
): { kind: 'interview' | 'practice'; questionId: string } | null {
  if (cardId.startsWith('itv:')) return { kind: 'interview', questionId: cardId.slice(4) }
  if (cardId.startsWith('q:')) return { kind: 'practice', questionId: cardId.slice(2) }
  return null
}

/* ------------------------------------------------------------------- the day */

/** Local calendar day, YYYY-MM-DD. Reviews are "due today" by your clock, not UTC's. */
export function localDay(time = Date.now()): string {
  const date = new Date(time)
  const pad = (value: number) => String(value).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

export function endOfLocalDay(time = Date.now()): number {
  const date = new Date(time)
  date.setHours(23, 59, 59, 999)
  return date.getTime()
}

/** Cards due by the end of today, most overdue first. */
export function dueCardIds(cards: Record<string, SrsCard>, now = Date.now()): string[] {
  const cutoff = endOfLocalDay(now)
  return Object.entries(cards)
    .filter(([, card]) => card.due <= cutoff)
    .sort((a, b) => a[1].due - b[1].due)
    .map(([id]) => id)
}

/**
 * Reviews falling due on each of the next `days` days. Anything already
 * overdue is counted today, because today is when you will see it.
 */
export function forecast(cards: Record<string, SrsCard>, days = 30, now = Date.now()): number[] {
  const counts = new Array<number>(days).fill(0)
  const start = new Date(now)
  start.setHours(0, 0, 0, 0)
  for (const card of Object.values(cards)) {
    const offset = Math.floor((card.due - start.getTime()) / DAY_MS)
    if (offset < days) counts[Math.max(0, offset)] += 1
  }
  return counts
}
