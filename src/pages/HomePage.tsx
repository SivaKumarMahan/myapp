import { Link } from 'react-router-dom'
import { plannedCourses } from '../content/courses'
import { groupOf, interviewGroups, interviewTopics } from '../content/interview'
import { countInterview } from '../lib/interview-stats'
import { courseIdForTopic, courseIndex, courseIndexes } from '../content/registry'
import { useProgress } from '../lib/use-progress'
import {
  courseCompletion,
  dailySuggestion,
  readinessFor,
  studyStreak,
  practiceStats,
} from '../lib/stats'
import { ProgressBar } from '../components/ui/ProgressBar'
import { Badge } from '../components/ui/Badge'
import { RichText } from '../components/ui/RichText'
import type { BadgeTone } from '../components/ui/Badge'
import type { ReadinessLevel } from '../lib/stats'
import { mistakeCount, queueCounts } from '../lib/review-deck'
import { examReadiness } from '../lib/analytics'
import { sqlChallengeKey, sqlChallenges } from '../content/sql'
import { kqlChallengeKey, kqlChallenges } from '../content/kql'
import { pythonChallengeKey, pythonChallenges } from '../content/python'
import { missionKey, missions } from '../content/azcli'
import { labExerciseKey, labExercises } from '../content/configlab'
import { allNetKeys } from '../content/netlab'
import { allVizKeys } from '../content/visualise'
import { allArchKeys } from '../content/arch'
import { allIncidentKeys } from '../lib/incident'
import { allGuidedLabKeys, guidedLabById, isRunning } from '../content/labs'
import { roles } from '../content/roles'
import { roleMatch } from '../lib/roles'

const readinessTone: Record<ReadinessLevel, BadgeTone> = {
  'just-starting': 'neutral',
  building: 'info',
  consolidating: 'warning',
  'exam-ready': 'success',
}

export function HomePage() {
  const { state } = useProgress()

  /*
   * Home belongs to no single course, so the focused sections (readiness,
   * today's suggestion) follow whichever course you last opened a lesson in.
   * Falling back to the first course keeps a brand-new install sensible.
   */
  const lastCourseId = state.lastVisitedTopicId
    ? courseIdForTopic(state.lastVisitedTopicId)
    : undefined
  const active = courseIndex(lastCourseId) ?? courseIndexes[0]
  const activeCourse = active.course

  /* Overall progress spans every installed course, not just the active one. */
  const perCourse = courseIndexes.map((entry) => ({
    entry,
    completion: courseCompletion(entry.course, state),
    practice: practiceStats(entry.course, state),
  }))
  const lessonsDone = perCourse.reduce((sum, item) => sum + item.completion.completed, 0)
  const lessonsTotal = perCourse.reduce((sum, item) => sum + item.completion.total, 0)
  const overallPercent = lessonsTotal === 0 ? 0 : Math.round((lessonsDone / lessonsTotal) * 100)
  const answered = perCourse.reduce((sum, item) => sum + item.practice.answered, 0)
  const correct = perCourse.reduce(
    (sum, item) => sum + Math.round((item.practice.accuracy / 100) * item.practice.answered),
    0,
  )
  const overallAccuracy = answered === 0 ? 0 : Math.round((correct / answered) * 100)

  const interview = countInterview(interviewTopics, state)
  const readiness = readinessFor(activeCourse, state)
  const readinessScore = examReadiness(activeCourse, state).score
  const suggestion = dailySuggestion(activeCourse, state)
  const streak = studyStreak(state)
  const queue = queueCounts(state)
  const sqlSolved = sqlChallenges.filter(
    (challenge) => state.challenges[sqlChallengeKey(challenge.id)]?.solvedAt,
  ).length
  const kqlSolved = kqlChallenges.filter(
    (challenge) => state.challenges[kqlChallengeKey(challenge.id)]?.solvedAt,
  ).length
  const pySolved = pythonChallenges.filter(
    (challenge) => state.challenges[pythonChallengeKey(challenge.id)]?.solvedAt,
  ).length
  const missionsDone = missions.filter(
    (mission) => state.challenges[missionKey(mission.id)]?.solvedAt,
  ).length
  const labDone = labExercises.filter(
    (exercise) => state.challenges[labExerciseKey(exercise.id)]?.solvedAt,
  ).length
  const netDone = allNetKeys.filter((key) => state.challenges[key]?.solvedAt).length
  const vizDone = allVizKeys.filter((key) => state.challenges[key]?.solvedAt).length
  const archDone = allArchKeys.filter((key) => state.challenges[key]?.solvedAt).length
  const incidentsDone = allIncidentKeys.filter((key) => state.challenges[key]?.solvedAt).length
  const labsDone = allGuidedLabKeys.filter((key) => state.challenges[key]?.solvedAt).length
  const runningLabs = Object.entries(state.guidedLabs)
    .filter(([, progress]) => isRunning(progress))
    .map(([id]) => guidedLabById.get(id))
    .filter((lab) => lab !== undefined)
  const mistakes = mistakeCount(state)
  const bestFit = roles
    .map((role) => ({ role, match: roleMatch(role, state) }))
    .sort((a, b) => b.match - a.match)[0]
  const bestScore = state.exams.reduce((best, attempt) => Math.max(best, attempt.scorePercent), 0)

  const continueTo = state.lastVisitedTopicId
    ? `${activeCourse.route}/topics/${state.lastVisitedTopicId}`
    : suggestion.topic
      ? `${activeCourse.route}/topics/${suggestion.topic.id}`
      : activeCourse.route

  const courseWord = courseIndexes.length === 1 ? 'course' : 'courses'

  /* Built from the registry so adding a topic cannot leave this list stale. */
  const topicNames = interviewGroups
    .map((group) => {
      const count = interviewTopics.filter((topic) => groupOf(topic) === group.id).length
      return count > 0 ? `${group.title} (${count} topics)` : null
    })
    .filter(Boolean)
    .join(', ')

  return (
    <div className="page stack-lg">
      <header className="page-header">
        <h1>Azure Learning Hub</h1>
        <p className="muted">
          A study app for Azure certifications and Azure / DevOps interviews, built to work offline
          on a phone. Two sections: <strong>interview preparation</strong> ({interviewTopics.length}{' '}
          topics, {interview.total} questions) and <strong>certification courses</strong> (
          {courseIndexes.length} {courseWord} -{' '}
          {courseIndexes.map((entry) => entry.course.examCode).join(', ')}).
        </p>
      </header>

      <section aria-labelledby="due-today" className="card stack-sm srs-home">
        <div className="row" style={{ justifyContent: 'space-between' }}>
          <h2 id="due-today" className="card__title" style={{ margin: 0 }}>
            <span aria-hidden="true">🔁 </span>Due today
          </h2>
          <div className="row" style={{ gap: '0.4rem' }}>
            <Badge tone={queue.due > 0 ? 'warning' : 'success'}>{queue.due} due</Badge>
            <Badge tone="info">{queue.fresh} new</Badge>
          </div>
        </div>
        <p className="muted" style={{ margin: 0 }}>
          {queue.total > 0
            ? `${queue.total} ${queue.total === 1 ? 'card' : 'cards'} waiting: reviews scheduled for today plus your daily new cards.`
            : 'All caught up. New cards unlock again tomorrow.'}
        </p>
        <div className="row">
          <Link className="btn" to="/review">
            {queue.total > 0 ? 'Start reviewing' : 'See the forecast'}
          </Link>
          <Link className="btn btn--secondary" to="/mistakes">
            Mistake notebook{mistakes > 0 ? ` (${mistakes})` : ''}
          </Link>
        </div>
      </section>

      {/*
       * One card covering BOTH sections, because the app has two of them and a
       * summary that only counted lessons would understate half the work.
       */}
      {runningLabs.length > 0 && (
        <div className="lab-alert" role="alert">
          ⚠ Azure resources may still be running from{' '}
          {runningLabs.map((lab, index) => (
            <span key={lab.id}>
              {index > 0 ? ', ' : ''}
              <Link to={`/guided-labs/${lab.id}#lab-cleanup`}>{lab.title}</Link>
            </span>
          ))}
          . Run the cleanup so they stop costing money.
        </div>
      )}

      <section aria-labelledby="overall-progress" className="card stack">
        <div className="row">
          <h2 id="overall-progress" className="card__title" style={{ flex: '1 1 auto' }}>
            Your progress
          </h2>
          <Badge tone={readinessTone[readiness.level]}>{readiness.label}</Badge>
        </div>
        <div className="stat-grid">
          <div className="stat">
            <div className="stat__value">{interview.percent}%</div>
            <div className="stat__label">
              Interview recall · {interview.known} of {interview.total}
            </div>
          </div>
          <div className="stat">
            <div className="stat__value">{overallPercent}%</div>
            <div className="stat__label">
              Lessons complete · {lessonsDone} of {lessonsTotal}
            </div>
          </div>
          <div className="stat">
            <div className="stat__value">{answered}</div>
            <div className="stat__label">
              Practice answered{answered > 0 ? ` · ${overallAccuracy}% correct` : ''}
            </div>
          </div>
          <div className="stat">
            <div className="stat__value">{state.exams.length === 0 ? '—' : `${bestScore}%`}</div>
            <div className="stat__label">Best mock exam</div>
          </div>
          <div className="stat">
            <div className="stat__value">
              {sqlSolved +
                kqlSolved +
                pySolved +
                missionsDone +
                labDone +
                netDone +
                vizDone +
                archDone +
                incidentsDone +
                labsDone}
              /
              {sqlChallenges.length +
                kqlChallenges.length +
                pythonChallenges.length +
                missions.length +
                labExercises.length +
                allNetKeys.length +
                allVizKeys.length +
                allArchKeys.length +
                allIncidentKeys.length +
                allGuidedLabKeys.length}
            </div>
            <div className="stat__label">
              Challenges solved · SQL {sqlSolved}/{sqlChallenges.length} · KQL {kqlSolved}/
              {kqlChallenges.length} · Python {pySolved}/{pythonChallenges.length} · CLI missions{' '}
              {missionsDone}/{missions.length} · Config lab {labDone}/{labExercises.length} ·
              Networking {netDone}/{allNetKeys.length} · Visualise {vizDone}/{allVizKeys.length} ·
              Architecture {archDone}/{allArchKeys.length} · Incidents {incidentsDone}/
              {allIncidentKeys.length} · Guided labs {labsDone}/{allGuidedLabKeys.length}
            </div>
          </div>
          <div className="stat">
            <div className="stat__value">{streak}</div>
            <div className="stat__label">Day study streak</div>
          </div>
        </div>
        <div className="row">
          <Link className="btn" to="/interview">
            {interview.known > 0 ? 'Continue interview prep' : 'Start interview prep'}
          </Link>
          <Link className="btn btn--secondary" to={continueTo}>
            {state.lastVisitedTopicId || lessonsDone > 0 ? 'Continue learning' : 'Start learning'}
          </Link>
          <Link className="btn btn--secondary" to={activeCourse.route}>
            {activeCourse.examCode} dashboard
          </Link>
          <Link className="btn btn--secondary" to="/stats">
            My stats
          </Link>
          <Link className="btn btn--secondary" to="/bot">
            🤖 Study bot
          </Link>
        </div>
      </section>

      <section aria-labelledby="interview" className="stack">
        <h2 id="interview">Interview preparation</h2>
        <Link className="card card--interactive stack-sm" to="/interview">
          <div className="row">
            <span aria-hidden="true" style={{ fontSize: '1.5rem' }}>
              💬
            </span>
            <Badge tone="info">{interviewTopics.length} topics</Badge>
            <Badge>{interview.total} questions</Badge>
            {interview.review > 0 && <Badge tone="warning">{interview.review} to review</Badge>}
          </div>
          <strong className="card__title">Azure & DevOps interview questions</strong>
          <p className="subtle" style={{ margin: 0 }}>
            {topicNames} - from first-round basics to senior scenario rounds.
          </p>
          <ProgressBar value={interview.percent} showValue />
          <p className="subtle" style={{ margin: 0 }}>
            {interview.known} of {interview.total} you can answer out loud
          </p>
        </Link>
      </section>

      <section aria-labelledby="roles" className="stack">
        <h2 id="roles">Roles & skills</h2>
        <Link className="card card--interactive stack-sm" to="/roles">
          <div className="row">
            <span aria-hidden="true" style={{ fontSize: '1.5rem' }}>
              🧭
            </span>
            <Badge tone="info">{roles.length} roles</Badge>
            {bestFit && bestFit.match > 0 && (
              <Badge>
                Best fit: {bestFit.role.title.split(' (')[0]} {bestFit.match}%
              </Badge>
            )}
          </div>
          <strong className="card__title">Which DevOps and cloud role fits you?</strong>
          <p className="subtle" style={{ margin: 0 }}>
            The skills and tools each role needs, a skills matrix, role comparison and your own fit
            - linked to the topics in this app.
          </p>
        </Link>
      </section>

      <section aria-labelledby="courses" className="stack">
        <h2 id="courses">Certification courses</h2>
        <div className="card-grid card-grid--2">
          {perCourse.map(({ entry, completion }) => (
            <Link
              className="card card--interactive stack-sm"
              key={entry.course.id}
              to={entry.course.route}
            >
              <div className="row">
                <span aria-hidden="true" style={{ fontSize: '1.5rem' }}>
                  {entry.course.icon}
                </span>
                <Badge tone="success">Available</Badge>
                <Badge>{entry.course.targetVersion}</Badge>
              </div>
              <strong className="card__title">{entry.course.title}</strong>
              <p className="subtle" style={{ margin: 0 }}>
                {entry.course.subtitle}
              </p>
              <ProgressBar value={completion.percent} showValue />
              <p className="subtle" style={{ margin: 0 }}>
                {entry.course.topics.length} lessons · {entry.course.questions.length} practice
                questions ·{' '}
                {entry.course.commandGroups.reduce((sum, group) => sum + group.entries.length, 0)}{' '}
                reference commands
              </p>
            </Link>
          ))}

          {plannedCourses.map((course) => (
            <div className="card stack-sm" key={course.id} aria-label={`${course.title} (planned)`}>
              <div className="row">
                <span aria-hidden="true" style={{ fontSize: '1.5rem' }}>
                  {course.icon}
                </span>
                <Badge>Planned</Badge>
              </div>
              <strong className="card__title">{course.title}</strong>
              <p className="subtle" style={{ margin: 0 }}>
                {course.subtitle}
              </p>
              <p className="subtle" style={{ margin: 0 }}>
                {course.note}
              </p>
            </div>
          ))}
        </div>
      </section>

      <section aria-labelledby="readiness" className="card stack">
        <h2 id="readiness" className="card__title">
          {activeCourse.examCode} exam readiness
        </h2>
        <p className="muted" style={{ marginBottom: 0 }}>
          {readiness.headline}
        </p>
        <ProgressBar
          value={readinessScore}
          label="Exam readiness score"
          showValue
          tone={readiness.level === 'exam-ready' ? 'success' : 'primary'}
        />
        <ul className="stack-sm" style={{ listStyle: 'none', paddingLeft: 0, margin: 0 }}>
          {readiness.signals.map((signal) => (
            <li key={signal.label} className="row" style={{ gap: '0.5rem' }}>
              <span aria-hidden="true">{signal.met ? '✅' : '⬜'}</span>
              <span style={{ flex: '1 1 auto', minWidth: 0 }}>{signal.label}</span>
              <span className="subtle nowrap">{signal.value}</span>
            </li>
          ))}
        </ul>
        <Link className="subtle" to={`${activeCourse.route}/stats`}>
          How this is calculated, and your weak areas →
        </Link>
        <p className="subtle" style={{ marginBottom: 0 }}>
          <strong>Next:</strong> {readiness.nextAction}
        </p>
        <p className="subtle" style={{ marginBottom: 0 }}>
          This indicator is a study aid computed from your own activity in this app. It is not a
          prediction of your exam result.
        </p>
      </section>

      <section aria-labelledby="today" className="card stack">
        <h2 id="today" className="card__title">
          Daily practice suggestion
        </h2>
        {suggestion.topic ? (
          <>
            <p className="muted" style={{ marginBottom: 0 }}>
              {suggestion.reason}
            </p>
            <Link
              className="card card--interactive"
              to={`${activeCourse.route}/topics/${suggestion.topic.id}`}
            >
              <strong>{suggestion.topic.title}</strong>
              <p className="subtle" style={{ margin: '0.25rem 0 0' }}>
                <RichText text={suggestion.topic.oneLiner} />
              </p>
              <p className="subtle" style={{ margin: '0.4rem 0 0' }}>
                About {suggestion.minutes} minutes
              </p>
            </Link>
          </>
        ) : (
          <p className="muted" style={{ marginBottom: 0 }}>
            {suggestion.reason}
          </p>
        )}
        <div className="row">
          {suggestion.drillDomainId ? (
            <Link
              className="btn btn--secondary"
              to={`${activeCourse.route}/practice/${suggestion.drillDomainId}`}
            >
              {suggestion.drillLabel}
            </Link>
          ) : (
            <Link className="btn btn--secondary" to={`${activeCourse.route}/practice`}>
              {suggestion.drillLabel}
            </Link>
          )}
          <Link className="btn btn--secondary" to={`${activeCourse.route}/exams`}>
            Mock exams
          </Link>
        </div>
      </section>

      <section aria-labelledby="disclaimer" className="stack">
        <h2 id="disclaimer" className="visually-hidden">
          Disclaimer
        </h2>
        <p className="disclaimer">
          <strong>Independent learning tool.</strong> This app is not affiliated with, endorsed by
          or sponsored by Microsoft. Microsoft, Azure, AZ-900, AZ-104, AZ-400 and related names and
          certifications are trademarks of the Microsoft group of companies; this is a study aid
          built around Microsoft&rsquo;s publicly published study guides. All practice questions,
          labs and mock exams here are original material written for this app - none are actual exam
          questions. Always check the official curriculum before your exam:{' '}
          {courseIndexes
            .flatMap((entry) =>
              entry.course.sources.slice(0, 2).map((source) => ({
                key: `${entry.course.id}-${source.url}`,
                label: `${entry.course.examCode}: ${source.title}`,
                url: source.url,
              })),
            )
            .map((source, index) => (
              <span key={source.key}>
                {index > 0 && ' · '}
                <a href={source.url} target="_blank" rel="noreferrer noopener">
                  {source.label}
                </a>
              </span>
            ))}
          .
        </p>
      </section>
    </div>
  )
}
