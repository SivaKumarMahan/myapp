import { describe, expect, it } from 'vitest'
import { az900Course } from '../content/courses'
import type { Domain } from '../content/types'
import {
  activityCalendar,
  domainInsights,
  domainWeight,
  examPlan,
  examReadiness,
} from './analytics'
import { addActivity } from './activity'
import { createEmptyState, migrate, type ExamAttempt } from './storage'
import { GOOD, localDay, practiceCardId, schedule } from './srs'

const NOW = new Date(2026, 9, 2, 12).getTime()
const DAY = 86_400_000
const domainOf = (id: string) => az900Course.domains.find((domain) => domain.id === id) as Domain
const questionsIn = (domainId: string) =>
  az900Course.questions.filter((question) => question.domainId === domainId)

const answerAll = (
  state: ReturnType<typeof createEmptyState>,
  domainId: string,
  correct: boolean,
) => {
  for (const question of questionsIn(domainId)) {
    state.questions[question.id] = {
      lastCorrect: correct,
      attempts: 1,
      correctCount: correct ? 1 : 0,
      incorrectCount: correct ? 0 : 1,
      lastAnsweredAt: NOW,
    }
  }
}

describe('domain weights', () => {
  it('uses the midpoint of a published range', () => {
    expect(
      domainWeight({ ...domainOf('az9-cloud'), examWeight: null, weightLabel: '25–30%' }),
    ).toBe(27.5)
    expect(domainWeight({ ...domainOf('az9-cloud'), examWeight: 40 })).toBe(40)
    expect(
      domainWeight({ ...domainOf('az9-cloud'), examWeight: null, weightLabel: undefined }),
    ).toBeNull()
  })
})

describe('exam readiness', () => {
  it('is zero for a learner who has done nothing', () => {
    const readiness = examReadiness(az900Course, createEmptyState(NOW), NOW)
    expect(readiness.score).toBe(0)
    // With everything at zero, the heaviest domain is where to start.
    const heaviest = [...readiness.domains].sort((a, b) => (b.weight ?? 0) - (a.weight ?? 0))[0]
    expect(readiness.studyNext?.domain.id).toBe(heaviest.domain.id)
  })

  it('combines practice, mock exams and retention per domain', () => {
    const state = createEmptyState(NOW)
    answerAll(state, 'az9-cloud', true)
    const cloud = () =>
      domainInsights(az900Course, state, NOW).find((insight) => insight.domain.id === 'az9-cloud')!

    // Practice alone: 100% of the domain right is worth 40 points.
    expect(cloud().practice).toBe(100)
    expect(cloud().accuracy).toBe(100)
    expect(Math.round(cloud().score)).toBe(40)

    const attempt = {
      id: 'mock',
      courseId: 'az900',
      byDomain: { 'az9-cloud': { earned: 8, total: 10 } },
    } as unknown as ExamAttempt
    state.exams = [attempt]
    expect(cloud().mock).toBe(80)
    expect(Math.round(cloud().score)).toBe(40 + 28)

    // Freshly reviewed cards are recalled with near certainty.
    for (const question of questionsIn('az9-cloud')) {
      if (question.kind !== 'task')
        state.srs[practiceCardId(question.id)] = schedule(undefined, GOOD, NOW)
    }
    expect(cloud().retention).toBeGreaterThan(99)
    expect(Math.round(cloud().score)).toBe(93)
  })

  it('flags heavy domains that are weak, and steers study towards them', () => {
    const state = createEmptyState(NOW)
    answerAll(state, 'az9-architecture', true)
    // Practice alone tops out at 40: a strong domain also needs a mock exam.
    state.exams = [
      {
        id: 'mock',
        courseId: 'az900',
        byDomain: { 'az9-architecture': { earned: 10, total: 10 } },
      } as unknown as ExamAttempt,
    ]
    const insights = domainInsights(az900Course, state, NOW)
    const arch = insights.find((insight) => insight.domain.id === 'az9-architecture')!
    expect(arch.focus).toBe(false)
    const flagged = insights.filter((insight) => insight.focus)
    expect(flagged.length).toBeGreaterThan(0)
    expect(examReadiness(az900Course, state, NOW).studyNext?.domain.id).not.toBe('az9-architecture')
  })
})

describe('activity and the daily goal', () => {
  it('counts the day towards the streak once the goal is met', () => {
    let state = createEmptyState(NOW)
    state.settings.dailyGoal = { kind: 'questions', target: 2 }
    state = addActivity(state, { questions: 1 }, NOW)
    expect(state.studyDays).toEqual([])
    state = addActivity(state, { questions: 1 }, NOW)
    expect(state.activity[localDay(NOW)].questions).toBe(2)
    expect(state.studyDays).toEqual([new Date(NOW).toISOString().slice(0, 10)])
  })

  it('shades calendar days against the goal', () => {
    const state = createEmptyState(NOW)
    state.settings.dailyGoal = { kind: 'questions', target: 10 }
    state.activity[localDay(NOW)] = { questions: 15, lessons: 0, minutes: 0 }
    state.activity[localDay(NOW - DAY)] = { questions: 10, lessons: 0, minutes: 0 }
    state.activity[localDay(NOW - 2 * DAY)] = { questions: 5, lessons: 0, minutes: 0 }
    state.activity[localDay(NOW - 3 * DAY)] = { questions: 0, lessons: 1, minutes: 0 }
    const days = new Map(
      activityCalendar(state, 4, NOW)
        .flat()
        .map((cell) => [cell.day, cell]),
    )
    expect(days.get(localDay(NOW))?.level).toBe(4)
    expect(days.get(localDay(NOW - DAY))?.level).toBe(3)
    expect(days.get(localDay(NOW - 2 * DAY))?.level).toBe(2)
    expect(days.get(localDay(NOW - 3 * DAY))?.level).toBe(1)
    expect(days.get(localDay(NOW - 4 * DAY))?.level).toBe(0)
    expect(activityCalendar(state, 4, NOW)).toHaveLength(4)
  })

  it('gives older records the default goal and no activity', () => {
    const state = migrate({ topics: {}, exams: [] }, NOW)
    expect(state.settings.dailyGoal).toEqual({ kind: 'questions', target: 20 })
    expect(state.settings.examDates).toEqual({})
    expect(state.activity).toEqual({})
  })
})

describe('the exam plan', () => {
  it('spreads remaining lessons and cards over the days left', () => {
    const state = createEmptyState(NOW)
    const examDay = localDay(NOW + 10 * DAY)
    const plan = examPlan(az900Course, state, examDay, NOW)
    const cards = az900Course.questions.filter((question) => question.kind !== 'task').length
    expect(plan.daysLeft).toBe(10)
    expect(plan.lessonsLeft).toBe(az900Course.topics.length)
    expect(plan.lessonsPerDay).toBe(Math.ceil(az900Course.topics.length / 10))
    expect(plan.newCards).toBe(cards)
    expect(plan.newPerDay).toBe(Math.ceil(cards / 10))
    expect(plan.overNewLimit).toBe(plan.newPerDay > 20)
  })

  it('knows when the exam has passed', () => {
    expect(examPlan(az900Course, createEmptyState(NOW), localDay(NOW - DAY), NOW).isPast).toBe(true)
  })
})
