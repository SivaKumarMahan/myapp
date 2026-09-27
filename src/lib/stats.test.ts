import { describe, expect, it } from 'vitest'
import {
  completionFor,
  courseCompletion,
  dailySuggestion,
  domainStats,
  practiceStats,
  readinessFor,
  studyStreak,
  topicStatus,
} from './stats'
import { createEmptyState } from './storage'
import { az104Course } from '../content/courses'

const az104Topics = az104Course.topics

describe('completion', () => {
  it('reports zero for a fresh learner', () => {
    const stats = courseCompletion(az104Course, createEmptyState())
    expect(stats.completed).toBe(0)
    expect(stats.percent).toBe(0)
    expect(stats.notStarted).toBe(az104Course.topics.length)
  })

  it('counts completed, in-progress and not-started separately', () => {
    const state = createEmptyState()
    state.topics[az104Topics[0].id] = { status: 'completed' }
    state.topics[az104Topics[1].id] = { status: 'in-progress' }

    const stats = completionFor(az104Topics, state)
    expect(stats.completed).toBe(1)
    expect(stats.inProgress).toBe(1)
    expect(stats.notStarted).toBe(az104Topics.length - 2)
  })

  it('reaches 100% when everything is complete', () => {
    const state = createEmptyState()
    for (const topic of az104Topics) state.topics[topic.id] = { status: 'completed' }
    expect(courseCompletion(az104Course, state).percent).toBe(100)
  })

  it('defaults an unknown topic to not-started', () => {
    expect(topicStatus(createEmptyState(), 'no-such-topic')).toBe('not-started')
  })
})

describe('domainStats', () => {
  it('returns every domain in curriculum order with its topics', () => {
    const stats = domainStats(az104Course, createEmptyState())
    expect(stats).toHaveLength(az104Course.domains.length)
    expect(stats[0].domain.id).toBe('az1-identity')
    expect(stats.at(-1)?.domain.id).toBe('az1-monitor')
    expect(stats.every((entry) => entry.topics.length > 0)).toBe(true)
  })

  it('estimates study time and remaining time', () => {
    const state = createEmptyState()
    const first = domainStats(az104Course, state)[0]
    expect(first.estimatedMinutes).toBeGreaterThan(0)
    expect(first.remainingMinutes).toBe(first.estimatedMinutes)

    for (const topic of first.topics) state.topics[topic.id] = { status: 'completed' }
    const after = domainStats(az104Course, state)[0]
    expect(after.remainingMinutes).toBe(0)
    expect(after.percent).toBe(100)
  })
})

describe('practiceStats', () => {
  it('counts correct, incorrect and the retry queue', () => {
    const state = createEmptyState()
    const [a, b, c] = az104Course.questions
    const record = (correct: boolean) => ({
      lastCorrect: correct,
      attempts: 1,
      correctCount: correct ? 1 : 0,
      incorrectCount: correct ? 0 : 1,
      lastAnsweredAt: 1,
    })
    state.questions[a.id] = record(true)
    state.questions[b.id] = record(false)
    state.questions[c.id] = record(false)

    const stats = practiceStats(az104Course, state)
    expect(stats.answered).toBe(3)
    expect(stats.correct).toBe(1)
    expect(stats.incorrect).toBe(2)
    expect(stats.accuracy).toBe(33.3)
    expect(stats.needsReview).toEqual(expect.arrayContaining([b.id, c.id]))
  })

  it('ignores stored answers for questions that no longer exist', () => {
    const state = createEmptyState()
    state.questions['removed-question'] = {
      lastCorrect: true,
      attempts: 1,
      correctCount: 1,
      incorrectCount: 0,
      lastAnsweredAt: 1,
    }
    expect(practiceStats(az104Course, state).answered).toBe(0)
  })
})

describe('readinessFor', () => {
  it('starts at "just starting" with no activity', () => {
    const readiness = readinessFor(az104Course, createEmptyState())
    expect(readiness.level).toBe('just-starting')
    expect(readiness.signals).toHaveLength(4)
    expect(readiness.signals.every((signal) => !signal.met)).toBe(true)
  })

  it('moves to "building" after some lessons', () => {
    const state = createEmptyState()
    for (const topic of az104Topics.slice(0, 5)) state.topics[topic.id] = { status: 'completed' }
    expect(readinessFor(az104Course, state).level).toBe('building')
  })

  it('requires a full-length timed attempt before reporting exam-ready', () => {
    const state = createEmptyState()
    for (const topic of az104Topics) state.topics[topic.id] = { status: 'completed' }
    for (const question of az104Course.questions) {
      state.questions[question.id] = {
        lastCorrect: true,
        attempts: 1,
        correctCount: 1,
        incorrectCount: 0,
        lastAnsweredAt: 1,
      }
    }
    // A short attempt with a high score is still not enough.
    state.exams = [
      {
        id: 'short',
        courseId: 'az104',
        label: 'sprint',
        startedAt: 0,
        submittedAt: 1,
        elapsedSeconds: 60,
        minutesAllowed: 20,
        earnedPoints: 10,
        totalPoints: 10,
        scorePercent: 100,
        passingScore: 66,
        passed: true,
        byDomain: {},
        answers: [],
      },
    ]
    expect(readinessFor(az104Course, state).level).not.toBe('exam-ready')

    state.exams.push({ ...state.exams[0], id: 'full', minutesAllowed: 120 })
    const readiness = readinessFor(az104Course, state)
    expect(readiness.level).toBe('exam-ready')
    expect(readiness.signals.every((signal) => signal.met)).toBe(true)
  })
})

describe('dailySuggestion', () => {
  it('suggests the first lesson of the path for a new learner', () => {
    const suggestion = dailySuggestion(az104Course, createEmptyState())
    expect(suggestion.topic?.domainId).toBe('az1-identity')
    expect(suggestion.reason).toMatch(/next lesson/i)
  })

  it('prefers an unfinished lesson over starting a new one', () => {
    const state = createEmptyState()
    state.topics['az1-rbac'] = { status: 'in-progress' }
    const suggestion = dailySuggestion(az104Course, state)
    expect(suggestion.topic?.id).toBe('az1-rbac')
    expect(suggestion.reason).toMatch(/not marked it complete/i)
  })

  it('switches to review once every lesson is complete', () => {
    const state = createEmptyState()
    for (const topic of az104Topics) state.topics[topic.id] = { status: 'completed' }
    const suggestion = dailySuggestion(az104Course, state)
    expect(suggestion.topic).toBeNull()
    expect(suggestion.reason).toMatch(/every lesson is complete/i)
  })
})

describe('studyStreak', () => {
  const day = (offset: number) => {
    const date = new Date('2026-06-15T12:00:00Z')
    date.setDate(date.getDate() + offset)
    return date.toISOString().slice(0, 10)
  }
  const today = new Date('2026-06-15T12:00:00Z')

  it('is zero with no recorded study days', () => {
    expect(studyStreak(createEmptyState(), today)).toBe(0)
  })

  it('counts consecutive days ending today', () => {
    const state = createEmptyState()
    state.studyDays = [day(0), day(-1), day(-2)]
    expect(studyStreak(state, today)).toBe(3)
  })

  it('survives a day that has not been studied yet', () => {
    const state = createEmptyState()
    state.studyDays = [day(-1), day(-2)]
    expect(studyStreak(state, today)).toBe(2)
  })

  it('breaks on a gap', () => {
    const state = createEmptyState()
    state.studyDays = [day(0), day(-3), day(-4)]
    expect(studyStreak(state, today)).toBe(1)
  })

  it('is zero when the last study day is too long ago', () => {
    const state = createEmptyState()
    state.studyDays = [day(-5)]
    expect(studyStreak(state, today)).toBe(0)
  })
})
