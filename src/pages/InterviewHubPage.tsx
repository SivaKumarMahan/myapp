import { Link } from 'react-router-dom'
import { groupOf, interviewGroups, interviewTopics, interviewTrack } from '../content/interview'
import type { InterviewTopic } from '../content/types'
import { useProgress } from '../lib/use-progress'
import { countInterview, levelBreakdown, suggestTopic } from '../lib/interview-stats'
import { ProgressBar } from '../components/ui/ProgressBar'
import { Badge } from '../components/ui/Badge'
import { RichText } from '../components/ui/RichText'

export function InterviewHubPage() {
  const { state } = useProgress()
  const overall = countInterview(interviewTopics, state)
  const suggestion = suggestTopic(interviewTopics, state)

  return (
    <div className="page stack-lg">
      <header className="page-header">
        <nav className="breadcrumbs" aria-label="Breadcrumb">
          <Link to="/">Home</Link>
          <span aria-hidden="true">/</span>
          <span>Interview prep</span>
        </nav>
        <h1>{interviewTrack.title}</h1>
        <p className="muted">{interviewTrack.subtitle}</p>
        <div className="page-header__meta">
          <Badge tone="info">{interviewTopics.length} topics</Badge>
          <Badge>{overall.total} questions</Badge>
          <Badge tone="success">{overall.known} known</Badge>
          {overall.review > 0 && <Badge tone="warning">{overall.review} to review</Badge>}
        </div>
      </header>

      <section className="card stack" aria-labelledby="itv-progress">
        <h2 id="itv-progress" className="card__title">
          Your recall
        </h2>
        <ProgressBar
          value={overall.percent}
          label={`${overall.known} of ${overall.total} questions you can answer out loud`}
          showValue
          large
          tone={overall.percent === 100 ? 'success' : 'primary'}
        />
        <p className="subtle" style={{ marginBottom: 0 }}>
          Mark a question <strong>known</strong> only once you could say the answer aloud without
          reading it. Anything you flag for <strong>review</strong> collects in the revision queue.
        </p>
        <div className="button-row">
          {suggestion && (
            <Link className="btn" to={`/interview/${suggestion.id}`}>
              {overall.known === 0 ? 'Start with' : 'Continue with'} {suggestion.shortTitle}
            </Link>
          )}
          <Link
            className="btn btn--secondary"
            to="/interview/review"
            aria-disabled={overall.review === 0}
          >
            Revision queue{overall.review > 0 ? ` (${overall.review})` : ''}
          </Link>
        </div>
        <div className="itv-practice-grid">
          <Link className="card card--interactive stack-sm" to="/interview/mock">
            <strong className="card__title">🎤 Mock interview</strong>
            <span className="subtle">
              Timed questions, answered aloud and recorded, then self-scored with follow-ups.
            </span>
          </Link>
          <Link className="card card--interactive stack-sm" to="/interview/stories">
            <strong className="card__title">⭐ STAR stories</strong>
            <span className="subtle">
              Write your behavioural stories once and quick-review them before the day.
            </span>
          </Link>
          <Link className="card card--interactive stack-sm" to="/incidents">
            <strong className="card__title">🚨 Incident labs</strong>
            <span className="subtle">
              Troubleshoot a production problem step by step, scored on the root cause.
            </span>
          </Link>
          <Link className="card card--interactive stack-sm" to="/interview/packs">
            <strong className="card__title">🏢 Prep packs</strong>
            <span className="subtle">
              Questions by company and round - built in, plus your own tags.
            </span>
          </Link>
        </div>
      </section>

      <section className="stack-lg" aria-labelledby="itv-topics">
        <h2 id="itv-topics">Topics</h2>
        {interviewGroups.map((group) => {
          const topics: InterviewTopic[] = interviewTopics.filter(
            (topic) => groupOf(topic) === group.id,
          )
          if (topics.length === 0) return null
          const groupCounts = countInterview(topics, state)
          return (
            <section className="stack" key={group.id} aria-labelledby={`itv-group-${group.id}`}>
              <div>
                <h3 id={`itv-group-${group.id}`} style={{ marginBottom: '0.25rem' }}>
                  {group.title}
                </h3>
                <p className="subtle" style={{ margin: 0 }}>
                  {group.description} {topics.length} topics · {groupCounts.total} questions.
                </p>
              </div>
              <div className="itv-topic-grid">
                {topics.map((topic) => {
                  const counts = countInterview([topic], state)
                  const levels = levelBreakdown(topic)
                  return (
                    <Link
                      className="card card--interactive stack-sm"
                      key={topic.id}
                      to={`/interview/${topic.id}`}
                    >
                      <div className="itv-topic-card__head">
                        <span className="itv-topic-card__icon" aria-hidden="true">
                          {topic.icon}
                        </span>
                        <strong className="card__title" style={{ flex: '1 1 auto', minWidth: 0 }}>
                          {topic.title}
                        </strong>
                      </div>
                      <p className="subtle" style={{ margin: 0 }}>
                        <RichText text={topic.oneLiner} />
                      </p>
                      <ProgressBar value={counts.percent} showValue />
                      <p className="itv-levels" style={{ margin: 0 }}>
                        <span>{counts.total} questions</span>
                        <span aria-hidden="true">·</span>
                        <span>{levels.basic} basic</span>
                        <span aria-hidden="true">·</span>
                        <span>{levels.intermediate} intermediate</span>
                        <span aria-hidden="true">·</span>
                        <span>{levels.advanced} senior</span>
                        {counts.review > 0 && (
                          <>
                            <span aria-hidden="true">·</span>
                            <span style={{ color: 'var(--warning)' }}>
                              {counts.review} to review
                            </span>
                          </>
                        )}
                      </p>
                    </Link>
                  )
                })}
              </div>
            </section>
          )
        })}
      </section>

      <p className="disclaimer">
        The Azure and DevOps topics are original questions written for this app. &ldquo;My question
        bank&rdquo; and &ldquo;Real interview rounds&rdquo; come from your own notes and your own
        recollection of interviews you attended. Answers reflect common industry practice - your
        interviewer may reasonably disagree on specifics.
      </p>
    </div>
  )
}
