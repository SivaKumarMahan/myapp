import type { Course, Domain } from '../content/types'
import type { ActivityDay, DailyGoal, ProgressState } from './storage'
import { completionFor } from './stats'
import { endOfLocalDay, localDay, practiceCardId, retrievability } from './srs'

/**
 * Analytics for the "My stats" pages: where you are weak, how ready you are,
 * what you have done day by day, and what it takes to be ready by exam day.
 *
 * Everything is derived from the progress record; nothing here is stored.
 */

const DAY_MS = 86_400_000

/**
 * A domain's share of the exam, as a single number.
 *
 * Microsoft publishes ranges ("25–30%"), so the midpoint is used. Sections
 * the app adds itself (foundations, exam technique) have no weight and are
 * left out of readiness entirely.
 */
export function domainWeight(domain: Domain): number | null {
  if (domain.examWeight !== null) return domain.examWeight
  const numbers = domain.weightLabel?.match(/\d+(?:\.\d+)?/g)?.map(Number) ?? []
  if (numbers.length === 0 || !domain.weightLabel?.includes('%')) return null
  return numbers.reduce((sum, value) => sum + value, 0) / numbers.length
}

/** How much each signal contributes to a domain's readiness. */
export const READINESS_WEIGHTS = { practice: 0.4, mock: 0.35, retention: 0.25 } as const
/** Mock exams older than the most recent few say little about today. */
const RECENT_MOCKS = 3

export interface DomainInsight {
  domain: Domain
  /** Midpoint exam weight, or null for an unweighted support section. */
  weight: number | null
  questions: number
  answered: number
  /** Correct on the most recent attempt, of those answered. Null if none answered. */
  accuracy: number | null
  /** 0-100: share of ALL the domain's questions you currently get right. */
  practice: number
  /** 0-100: average domain score across recent mock exams. Null if none. */
  mock: number | null
  /** 0-100: predicted share of the domain's cards you would recall right now. */
  retention: number
  /** How many of the domain's cards you have reviewed at least once. */
  cardsStarted: number
  /** 0-100 composite of the three. */
  score: number
  /** weight x (100 - score): how many exam points are at stake. */
  priority: number
  /** High weight, low score - where study time pays most. */
  focus: boolean
}

export function domainInsights(
  course: Course,
  state: ProgressState,
  now = Date.now(),
): DomainInsight[] {
  const recentMocks = state.exams
    .filter((attempt) => attempt.courseId === course.id)
    .slice(0, RECENT_MOCKS)

  const insights = [...course.domains]
    .sort((a, b) => a.order - b.order)
    .map((domain): DomainInsight => {
      const questions = course.questions.filter((question) => question.domainId === domain.id)
      let answered = 0
      let correct = 0
      for (const question of questions) {
        const record = state.questions[question.id]
        if (!record) continue
        answered += 1
        if (record.lastCorrect) correct += 1
      }

      const mockScores = recentMocks
        .map((attempt) => attempt.byDomain[domain.id])
        .filter((entry) => entry && entry.total > 0)
        .map((entry) => (entry.earned / entry.total) * 100)
      const mock =
        mockScores.length === 0
          ? null
          : mockScores.reduce((sum, value) => sum + value, 0) / mockScores.length

      const gradable = questions.filter((question) => question.kind !== 'task')
      let recall = 0
      let cardsStarted = 0
      for (const question of gradable) {
        const card = state.srs[practiceCardId(question.id)]
        if (!card) continue
        cardsStarted += 1
        recall += retrievability(Math.max(0, (now - card.lastReview) / DAY_MS), card.stability)
      }

      const practice = questions.length === 0 ? 0 : (correct / questions.length) * 100
      const retention = gradable.length === 0 ? 0 : (recall / gradable.length) * 100
      // No mock yet counts as zero: you cannot look ready without sitting one.
      const score =
        practice * READINESS_WEIGHTS.practice +
        (mock ?? 0) * READINESS_WEIGHTS.mock +
        retention * READINESS_WEIGHTS.retention
      const weight = domainWeight(domain)

      return {
        domain,
        weight,
        questions: questions.length,
        answered,
        accuracy: answered === 0 ? null : (correct / answered) * 100,
        practice,
        mock,
        retention,
        cardsStarted,
        score,
        priority: weight === null ? 0 : weight * (100 - score),
        focus: false,
      }
    })

  const weighted = insights.filter((insight) => insight.weight !== null)
  const averageWeight =
    weighted.reduce((sum, insight) => sum + (insight.weight ?? 0), 0) / Math.max(1, weighted.length)
  for (const insight of weighted) {
    insight.focus = (insight.weight ?? 0) >= averageWeight && insight.score < 60
  }
  return insights
}

export interface ExamReadiness {
  /** 0-100. */
  score: number
  domains: DomainInsight[]
  /** The weighted domain where study time is worth the most exam points. */
  studyNext: DomainInsight | null
}

/** Readiness across the exam: each weighted domain's score, weighted by its share. */
export function examReadiness(
  course: Course,
  state: ProgressState,
  now = Date.now(),
): ExamReadiness {
  const domains = domainInsights(course, state, now)
  const weighted = domains.filter((insight) => insight.weight !== null)
  // A course with no published weights treats its domains equally.
  const pool = weighted.length > 0 ? weighted : domains
  const totalWeight = pool.reduce((sum, insight) => sum + (insight.weight ?? 1), 0)
  const score =
    totalWeight === 0
      ? 0
      : pool.reduce((sum, insight) => sum + insight.score * (insight.weight ?? 1), 0) / totalWeight
  const studyNext =
    [...pool].sort((a, b) => b.priority - a.priority || a.score - b.score)[0] ?? null
  return {
    score: Math.round(score),
    domains,
    studyNext: studyNext && studyNext.score < 100 ? studyNext : null,
  }
}

/* --------------------------------------------------------------- activity */

export const emptyDay = (): ActivityDay => ({ questions: 0, lessons: 0, minutes: 0 })

export const goalValue = (day: ActivityDay | undefined, goal: DailyGoal) =>
  day ? (goal.kind === 'minutes' ? Math.floor(day.minutes) : day.questions) : 0

export interface CalendarDay {
  day: string
  activity: ActivityDay
  /** 0 = nothing, 1-4 = increasing, relative to the daily goal. */
  level: 0 | 1 | 2 | 3 | 4
  /** In the future (the current week runs past today). */
  future: boolean
}

/**
 * The last `weeks` weeks as columns of seven days, Monday first, ending with
 * the current week. Intensity is measured against your own daily goal, so a
 * dark square always means "goal met with room to spare".
 */
export function activityCalendar(
  state: ProgressState,
  weeks = 52,
  now = Date.now(),
): CalendarDay[][] {
  const goal = state.settings.dailyGoal
  const studied = new Set(state.studyDays)
  const today = new Date(now)
  today.setHours(12, 0, 0, 0) // Noon, so DST changes never skip or repeat a day.
  const mondayOffset = (today.getDay() + 6) % 7
  const start = new Date(today)
  start.setDate(start.getDate() - mondayOffset - (weeks - 1) * 7)
  const todayKey = localDay(now)

  const columns: CalendarDay[][] = []
  const cursor = new Date(start)
  for (let week = 0; week < weeks; week += 1) {
    const column: CalendarDay[] = []
    for (let weekday = 0; weekday < 7; weekday += 1) {
      const day = localDay(cursor.getTime())
      const activity = state.activity[day] ?? emptyDay()
      const value = goalValue(activity, goal)
      const any = value > 0 || activity.questions + activity.lessons > 0 || studied.has(day)
      const ratio = goal.target > 0 ? value / goal.target : 0
      const level: CalendarDay['level'] = !any
        ? 0
        : ratio >= 1.5
          ? 4
          : ratio >= 1
            ? 3
            : ratio >= 0.5
              ? 2
              : 1
      column.push({ day, activity, level, future: day > todayKey })
      cursor.setDate(cursor.getDate() + 1)
    }
    columns.push(column)
  }
  return columns
}

/* ------------------------------------------------------------- exam plan */

export interface ExamPlan {
  /** Whole days left to study, counting today and not the exam day itself. */
  daysLeft: number
  isPast: boolean
  lessonsLeft: number
  lessonsPerDay: number
  /** Auto-marked practice questions never seen as cards. */
  newCards: number
  newPerDay: number
  /** Course cards already scheduled to fall due before the exam. */
  reviewsBeforeExam: number
  reviewsPerDay: number
  /** True when the new cards needed per day exceed your daily new-card limit. */
  overNewLimit: boolean
}

export function examPlan(
  course: Course,
  state: ProgressState,
  examDate: string,
  now = Date.now(),
): ExamPlan {
  const [year, month, date] = examDate.split('-').map(Number)
  const exam = new Date(year, month - 1, date, 12).getTime()
  const today = new Date(now)
  today.setHours(12, 0, 0, 0)
  const daysLeft = Math.round((exam - today.getTime()) / DAY_MS)

  const completion = completionFor(course.topics, state)
  const lessonsLeft = completion.total - completion.completed
  const cardIds = course.questions
    .filter((question) => question.kind !== 'task')
    .map((question) => practiceCardId(question.id))
  const newCards = cardIds.filter((id) => !state.srs[id]).length
  const cutoff = endOfLocalDay(exam - DAY_MS)
  const reviewsBeforeExam = cardIds.filter((id) => {
    const card = state.srs[id]
    return card !== undefined && card.due <= cutoff
  }).length

  const per = (count: number) => (daysLeft <= 0 ? count : Math.ceil(count / daysLeft))
  const newPerDay = per(newCards)
  return {
    daysLeft: Math.max(0, daysLeft),
    isPast: daysLeft < 0,
    lessonsLeft,
    lessonsPerDay: per(lessonsLeft),
    newCards,
    newPerDay,
    reviewsBeforeExam,
    reviewsPerDay: per(reviewsBeforeExam),
    overNewLimit: newPerDay > state.settings.newCardsPerDay,
  }
}
