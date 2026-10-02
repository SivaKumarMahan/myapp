import { describe, expect, it } from 'vitest'
import {
  AGAIN,
  EASY,
  GOOD,
  HARD,
  RELEARN_MS,
  dueCardIds,
  forecast,
  formatInterval,
  ratingForAnswer,
  schedule,
} from './srs'
import { createEmptyState, mergeStates, migrate } from './storage'

const DAY = 86_400_000
const NOW = new Date(2026, 9, 2, 12).getTime()
const days = (card: { due: number }, from = NOW) => (card.due - from) / DAY

describe('FSRS scheduling', () => {
  it('schedules a first rating by how well you knew it', () => {
    expect(schedule(undefined, AGAIN, NOW).due - NOW).toBe(RELEARN_MS)
    const hard = days(schedule(undefined, HARD, NOW))
    const good = days(schedule(undefined, GOOD, NOW))
    const easy = days(schedule(undefined, EASY, NOW))
    expect(good).toBe(3)
    expect(hard).toBeLessThan(good)
    expect(easy).toBeGreaterThan(good)
  })

  it('stretches the interval each time you recall a card on time', () => {
    let card = schedule(undefined, GOOD, NOW)
    const intervals = [days(card)]
    for (let i = 0; i < 4; i += 1) {
      const reviewedAt = card.due
      card = schedule(card, GOOD, reviewedAt)
      intervals.push(days(card, reviewedAt))
    }
    for (let i = 1; i < intervals.length; i += 1) {
      expect(intervals[i]).toBeGreaterThan(intervals[i - 1])
    }
  })

  it('a lapse shrinks stability, counts the lapse and brings the card back soon', () => {
    const learned = schedule(schedule(undefined, GOOD, NOW), GOOD, NOW + 3 * DAY)
    const lapsed = schedule(learned, AGAIN, learned.due)
    expect(lapsed.stability).toBeLessThan(learned.stability)
    expect(lapsed.lapses).toBe(1)
    expect(lapsed.due - learned.due).toBe(RELEARN_MS)
    expect(lapsed.difficulty).toBeGreaterThan(learned.difficulty)
  })

  it('treats a correct guess as a miss', () => {
    expect(ratingForAnswer(false, 'knew')).toBe(AGAIN)
    expect(ratingForAnswer(true, 'guessed')).toBe(AGAIN)
    expect(ratingForAnswer(true, 'unsure')).toBe(HARD)
    expect(ratingForAnswer(true, 'knew')).toBe(GOOD)
    expect(ratingForAnswer(true, undefined)).toBe(GOOD)
  })

  it('formats intervals for the rating buttons', () => {
    expect(formatInterval(RELEARN_MS)).toBe('10m')
    expect(formatInterval(3 * DAY)).toBe('3d')
    expect(formatInterval(90 * DAY)).toBe('3mo')
  })
})

describe('the queue and forecast', () => {
  const cards = {
    overdue: { ...schedule(undefined, GOOD, NOW - 10 * DAY) },
    later: { ...schedule(undefined, EASY, NOW) },
    tonight: { ...schedule(undefined, AGAIN, NOW) },
  }

  it('lists cards due by the end of today, most overdue first', () => {
    expect(dueCardIds(cards, NOW)).toEqual(['overdue', 'tonight'])
  })

  it('counts overdue cards today in the 30-day forecast', () => {
    const counts = forecast(cards, 30, NOW)
    expect(counts).toHaveLength(30)
    expect(counts[0]).toBe(2)
    expect(counts.reduce((sum, count) => sum + count, 0)).toBe(3)
  })
})

describe('migrating to spaced repetition', () => {
  const legacy = {
    schemaVersion: 1,
    topics: {},
    exams: [],
    interview: {
      'q-known': { status: 'known', updatedAt: NOW - 2 * DAY },
      'q-review': { status: 'review', updatedAt: NOW - DAY },
    },
  }

  it('turns recalled questions into Good cards and flagged ones into due cards', () => {
    const state = migrate(legacy, NOW)
    const known = state.srs['itv:q-known']
    expect(known.lastRating).toBe(GOOD)
    expect(known.due).toBe(NOW - 2 * DAY + 3 * DAY)
    expect(state.srs['itv:q-review'].due).toBeLessThan(NOW)
    expect(state.settings.newCardsPerDay).toBe(20)
    expect(state.mistakes).toEqual({})
  })

  it('never re-seeds a record that already has cards', () => {
    const once = migrate(legacy, NOW)
    const again = migrate({ ...once, srs: {} }, NOW)
    expect(again.srs).toEqual({})
  })

  it('keeps the most recently reviewed card when merging an import', () => {
    const older = { ...createEmptyState(NOW), srs: { a: schedule(undefined, AGAIN, NOW - DAY) } }
    const newer = { ...createEmptyState(NOW), srs: { a: schedule(undefined, EASY, NOW) } }
    expect(mergeStates(older, newer).srs.a.lastRating).toBe(EASY)
    expect(mergeStates(newer, older).srs.a.lastRating).toBe(EASY)
  })
})
