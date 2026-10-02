import { useState } from 'react'
import { Link } from 'react-router-dom'
import { courseIndexes } from '../content/registry'
import type { Course } from '../content/types'
import type { CourseIndex } from '../content/registry'
import { useCourseIndex } from '../lib/use-course'
import { useProgress } from '../lib/use-progress'
import {
  READINESS_WEIGHTS,
  activityCalendar,
  examPlan,
  examReadiness,
  goalValue,
  type ExamReadiness,
} from '../lib/analytics'
import { localDay } from '../lib/srs'
import { studyStreak } from '../lib/stats'
import { weightBadge } from '../lib/domain-label'
import { UnknownCourse } from '../components/UnknownCourse'
import { DomainHeatmap } from '../components/DomainHeatmap'
import { ActivityCalendar } from '../components/ActivityCalendar'
import { InfoTip } from '../components/ui/InfoTip'
import { ProgressBar } from '../components/ui/ProgressBar'
import { Badge } from '../components/ui/Badge'

const pct = (value: number) => `${Math.round(value * 100)}%`

/** What "readiness" means, in the tooltip next to every score. */
function ReadinessExplainer() {
  return (
    <>
      Each exam domain gets a score out of 100:{' '}
      <strong>{pct(READINESS_WEIGHTS.practice)} practice</strong> (share of the domain&rsquo;s
      questions you got right on your latest attempt),{' '}
      <strong>{pct(READINESS_WEIGHTS.mock)} mock exams</strong> (your average on that domain over
      the last three mocks; none yet counts as 0) and{' '}
      <strong>{pct(READINESS_WEIGHTS.retention)} retention</strong> (how many of its flashcards you
      are predicted to recall today). Domains are then averaged by their share of the exam, using
      the middle of Microsoft&rsquo;s published range. It is a study guide, not a predicted exam
      score.
    </>
  )
}

function ReadinessScore({ readiness, course }: { readiness: ExamReadiness; course: Course }) {
  return (
    <div className="readiness">
      <div className="readiness__score">
        <span className="readiness__number">{readiness.score}</span>
        <span className="subtle">/ 100</span>
        <InfoTip label="How the readiness score is calculated">
          <ReadinessExplainer />
        </InfoTip>
      </div>
      <ProgressBar
        value={readiness.score}
        label={`${course.examCode} exam readiness`}
        tone={readiness.score >= 80 ? 'success' : 'primary'}
      />
    </div>
  )
}

/**
 * A number box that keeps what you type while you edit - clearing it to type
 * "30" must not snap to the minimum first - and saves only valid values.
 */
function NumberInput({
  value,
  min,
  max,
  onCommit,
}: {
  value: number
  min: number
  max: number
  onCommit: (value: number) => void
}) {
  const [draft, setDraft] = useState<string | null>(null)
  return (
    <input
      className="select"
      type="number"
      inputMode="numeric"
      min={min}
      max={max}
      value={draft ?? value}
      onChange={(event) => {
        setDraft(event.target.value)
        const parsed = Number(event.target.value)
        if (
          event.target.value !== '' &&
          Number.isFinite(parsed) &&
          parsed >= min &&
          parsed <= max
        ) {
          onCommit(Math.floor(parsed))
        }
      }}
      onBlur={() => setDraft(null)}
    />
  )
}

function DailyGoalCard() {
  const { state, setDailyGoal } = useProgress()
  const goal = state.settings.dailyGoal
  const today = goalValue(state.activity[localDay()], goal)
  const met = today >= goal.target
  const streak = studyStreak(state)
  const unit = goal.kind === 'minutes' ? 'minutes' : 'questions'

  return (
    <section className="card stack-sm" aria-labelledby="daily-goal">
      <div className="row" style={{ justifyContent: 'space-between' }}>
        <h2 id="daily-goal" className="card__title" style={{ margin: 0 }}>
          🎯 Daily goal
        </h2>
        <div className="row" style={{ gap: '0.4rem' }}>
          {met && <Badge tone="success">✓ Goal met</Badge>}
          <Badge tone={streak > 0 ? 'warning' : 'neutral'}>
            🔥 {streak} day{streak === 1 ? '' : 's'} streak
          </Badge>
        </div>
      </div>
      <ProgressBar
        value={Math.min(100, (today / goal.target) * 100)}
        label={`${today} of ${goal.target} ${unit} today`}
        tone={met ? 'success' : 'primary'}
        showValue
      />
      <div className="goal-form">
        <label className="field">
          <span className="field__label">Goal type</span>
          <select
            className="select"
            value={goal.kind}
            onChange={(event) =>
              setDailyGoal({
                ...goal,
                kind: event.target.value === 'minutes' ? 'minutes' : 'questions',
              })
            }
          >
            <option value="questions">Questions answered</option>
            <option value="minutes">Minutes studied</option>
          </select>
        </label>
        <label className="field">
          <span className="field__label">Target per day</span>
          <NumberInput
            value={goal.target}
            min={1}
            max={1000}
            onCommit={(target) => setDailyGoal({ ...goal, target })}
          />
        </label>
      </div>
      <p className="subtle" style={{ margin: 0 }}>
        Meeting the goal counts the day towards your streak, as opening a lesson always has. Minutes
        count only while the app is open and you are using it.
      </p>
    </section>
  )
}

function ExamCountdown({ catalog, compact = false }: { catalog: CourseIndex; compact?: boolean }) {
  const { state, setExamDate, setNewCardsPerDay } = useProgress()
  const { course } = catalog
  const date = state.settings.examDates[course.id]
  const plan = date ? examPlan(course, state, date) : null
  const inputId = `exam-date-${course.id}`

  return (
    <div className="stack-sm">
      <div className="exam-date">
        <label className="field">
          <span className="field__label">{course.examCode} exam date</span>
          <input
            id={inputId}
            className="select"
            type="date"
            min={localDay()}
            value={date ?? ''}
            onChange={(event) => setExamDate(course.id, event.target.value || null)}
          />
        </label>
        {plan && (
          <p className="exam-date__countdown">
            {plan.isPast ? (
              <span className="subtle">That date has passed - set your next one.</span>
            ) : plan.daysLeft === 0 ? (
              <strong>Exam day. Good luck!</strong>
            ) : (
              <>
                <strong className="exam-date__days">{plan.daysLeft}</strong>{' '}
                {plan.daysLeft === 1 ? 'day' : 'days'} to go
              </>
            )}
          </p>
        )}
      </div>
      {!plan && !compact && (
        <p className="subtle" style={{ margin: 0 }}>
          Set a date to see how many lessons and cards a day it takes to be ready.
        </p>
      )}
      {plan && !plan.isPast && plan.daysLeft > 0 && (
        <ul className="plan-list">
          <li>
            <strong>{plan.lessonsPerDay}</strong> {plan.lessonsPerDay === 1 ? 'lesson' : 'lessons'}{' '}
            a day <span className="subtle">({plan.lessonsLeft} left)</span>
          </li>
          <li>
            <strong>{plan.newPerDay}</strong> new practice {plan.newPerDay === 1 ? 'card' : 'cards'}{' '}
            a day <span className="subtle">({plan.newCards} not started)</span>
          </li>
          <li>
            about <strong>{plan.reviewsPerDay}</strong>{' '}
            {plan.reviewsPerDay === 1 ? 'review' : 'reviews'} a day{' '}
            <span className="subtle">({plan.reviewsBeforeExam} already scheduled before then)</span>
          </li>
        </ul>
      )}
      {plan && !plan.isPast && plan.daysLeft > 0 && plan.overNewLimit && (
        <div className="notice notice--warning">
          <span className="notice__icon" aria-hidden="true">
            ⚠
          </span>
          <div className="stack-sm">
            <p style={{ margin: 0 }}>
              Your daily new-card limit is {state.settings.newCardsPerDay}, so you will not see
              every
              {` ${course.examCode}`} card before the exam.
            </p>
            <div>
              <button
                type="button"
                className="btn btn--sm"
                onClick={() => setNewCardsPerDay(plan.newPerDay)}
              >
                Raise the limit to {plan.newPerDay} a day
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

/** Overall stats: daily goal, the study calendar and every course at a glance. */
export function StatsPage() {
  const { state } = useProgress()
  const weeks = activityCalendar(state)

  return (
    <div className="page stack-lg">
      <header className="page-header">
        <nav className="breadcrumbs" aria-label="Breadcrumb">
          <Link to="/">Home</Link>
          <span aria-hidden="true">/</span>
          <span>My stats</span>
        </nav>
        <h1>My stats</h1>
        <p className="muted">
          Your study calendar, daily goal and how ready you are for each exam.
        </p>
      </header>

      <DailyGoalCard />

      <section className="card">
        <ActivityCalendar weeks={weeks} goal={state.settings.dailyGoal} />
      </section>

      <section className="stack" aria-labelledby="courses-heading">
        <h2 id="courses-heading" style={{ margin: 0 }}>
          Exam readiness
        </h2>
        <div className="card-grid">
          {courseIndexes.map((catalog) => {
            const readiness = examReadiness(catalog.course, state)
            return (
              <article key={catalog.course.id} className="card stack-sm">
                <h3 className="card__title" style={{ margin: 0 }}>
                  <span aria-hidden="true">{catalog.course.icon} </span>
                  {catalog.course.examCode}
                </h3>
                <ReadinessScore readiness={readiness} course={catalog.course} />
                {readiness.studyNext && (
                  <p className="subtle" style={{ margin: 0 }}>
                    Study next: <strong>{readiness.studyNext.domain.shortTitle}</strong>
                  </p>
                )}
                <ExamCountdown catalog={catalog} compact />
                <Link className="btn btn--secondary" to={`${catalog.course.route}/stats`}>
                  {catalog.course.examCode} stats →
                </Link>
              </article>
            )
          })}
        </div>
      </section>
    </div>
  )
}

/** One course: readiness, weak areas and the countdown to its exam. */
export function CourseStatsPage() {
  const catalog = useCourseIndex()
  if (!catalog) return <UnknownCourse />
  return <CourseStats catalog={catalog} />
}

function CourseStats({ catalog }: { catalog: CourseIndex }) {
  const { state } = useProgress()
  const { course } = catalog
  const readiness = examReadiness(course, state)
  const next = readiness.studyNext

  return (
    <div className="page stack-lg">
      <header className="page-header">
        <nav className="breadcrumbs" aria-label="Breadcrumb">
          <Link to={course.route}>{course.examCode}</Link>
          <span aria-hidden="true">/</span>
          <span>My stats</span>
        </nav>
        <h1>{course.examCode} stats</h1>
        <p className="muted">
          Where you are strong, where you are weak, and how that adds up across the exam.{' '}
          <Link to="/stats">All my stats →</Link>
        </p>
      </header>

      <section className="card stack" aria-labelledby="readiness-heading">
        <h2 id="readiness-heading" className="card__title" style={{ margin: 0 }}>
          Exam readiness
        </h2>
        <ReadinessScore readiness={readiness} course={course} />
        {next && (
          <div className="notice notice--info">
            <span className="notice__icon" aria-hidden="true">
              🎯
            </span>
            <div className="stack-sm">
              <p style={{ margin: 0 }}>
                <strong>Study this next: {next.domain.title}.</strong> It is{' '}
                {weightBadge(next.domain)} of the exam and you are at {Math.round(next.score)}/100
                on it, so it is where your study time is worth the most marks.
              </p>
              <div className="row">
                <Link className="btn" to={`${course.route}#domain-${next.domain.id}`}>
                  Study this next
                </Link>
                <Link
                  className="btn btn--secondary"
                  to={`${course.route}/practice/${next.domain.id}`}
                >
                  Practise this domain
                </Link>
              </div>
            </div>
          </div>
        )}
      </section>

      <section className="card stack" aria-labelledby="weak-heading">
        <div className="row" style={{ justifyContent: 'space-between' }}>
          <h2 id="weak-heading" className="card__title" style={{ margin: 0 }}>
            Weak areas
          </h2>
          <InfoTip label="How to read the weak-area heatmap">
            Each row is an exam domain. Darker cells are better. A domain is flagged{' '}
            <strong>Focus</strong> when its exam weight is at least average and its readiness is
            under 60. Hover a cell for the numbers behind it.
          </InfoTip>
        </div>
        <DomainHeatmap domains={readiness.domains} />
      </section>

      <section className="card stack" aria-labelledby="countdown-heading">
        <h2 id="countdown-heading" className="card__title" style={{ margin: 0 }}>
          Exam-day countdown
        </h2>
        <ExamCountdown catalog={catalog} />
      </section>
    </div>
  )
}
