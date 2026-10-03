import { useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { Badge } from '../components/ui/Badge'
import { RichText } from '../components/ui/RichText'
import { interviewTopicById } from '../content/interview'
import {
  incidentKey,
  incidentScenarios,
  scoreRun,
  shortestSteps,
  type LabResult,
  type LabStep,
} from '../lib/incident'
import { useProgress } from '../lib/use-progress'

/**
 * Incident / troubleshooting labs: pick a diagnostic step, see the evidence
 * it turns up, and get scored on the steps you took and the root cause you
 * landed on.
 */
export function IncidentLabsPage() {
  const { state, recordChallengeCheck } = useProgress()
  const [params, setParams] = useSearchParams()
  const scenario = incidentScenarios.find((entry) => entry.id === params.get('lab'))
  const [node, setNode] = useState<string>(scenario?.start ?? '')
  const [steps, setSteps] = useState<LabStep[]>([])
  const [result, setResult] = useState<LabResult | null>(null)

  const open = (id: string | null) => {
    const next = incidentScenarios.find((entry) => entry.id === id)
    setParams(id ? { lab: id } : {}, { replace: false })
    setNode(next?.start ?? '')
    setSteps([])
    setResult(null)
  }

  if (!scenario) {
    return (
      <div className="page stack">
        <header className="page-header">
          <p className="subtle" style={{ margin: 0 }}>
            <Link to="/interview">Interview preparation</Link>
          </p>
          <h1>Incident labs</h1>
          <p className="page-header__meta">
            Something is broken in production. Choose what to check, read the evidence each step
            turns up, and find the root cause. You are scored on your diagnosis, how directly you
            got there, and whether the root cause is right.
          </p>
        </header>
        <div className="card-grid card-grid--2">
          {incidentScenarios.map((entry) => {
            const solved = state.challenges[incidentKey(entry.id)]?.solvedAt
            return (
              <button
                key={entry.id}
                type="button"
                className="card card--interactive stack-sm incident-card"
                onClick={() => open(entry.id)}
              >
                <div className="row">
                  <span aria-hidden="true">🚨</span>
                  <Badge>{entry.level}</Badge>
                  <Badge tone="info">
                    {interviewTopicById.get(entry.topic)?.shortTitle ?? entry.topic}
                  </Badge>
                  {solved && <Badge tone="success">✓ Solved</Badge>}
                </div>
                <strong className="card__title">{entry.title}</strong>
                <span className="subtle">{entry.intro}</span>
              </button>
            )
          })}
        </div>
      </div>
    )
  }

  const current = scenario.nodes[node]
  const choose = (index: number) => {
    const choice = current.choices?.[index]
    if (!choice) return
    const nextSteps = [
      ...steps,
      { node, label: choice.label, score: choice.score, feedback: choice.feedback },
    ]
    setSteps(nextSteps)
    setNode(choice.next)
    const target = scenario.nodes[choice.next]
    if (target?.end) {
      const scored = scoreRun(scenario, nextSteps, choice.next)
      setResult(scored)
      if (scored.correct) recordChallengeCheck(incidentKey(scenario.id), true)
    }
  }

  return (
    <div className="page stack">
      <header className="page-header">
        <p className="subtle" style={{ margin: 0 }}>
          <button type="button" className="linklike" onClick={() => open(null)}>
            ← All incident labs
          </button>
        </p>
        <h1>🚨 {scenario.title}</h1>
        <p className="page-header__meta">{scenario.intro}</p>
        <p className="subtle" style={{ margin: 0 }}>
          The most direct correct path takes {shortestSteps(scenario)} steps.
        </p>
      </header>

      {steps.length > 0 && (
        <ol className="incident-timeline" aria-label="Your investigation">
          {steps.map((step, index) => {
            const seen = scenario.nodes[step.node]
            return (
              <li key={index}>
                {seen.evidence && (
                  <pre className="bot-evidence" aria-label="Evidence">
                    {seen.evidence}
                  </pre>
                )}
                <span className={step.score > 0 ? 'viz-ok' : step.score < 0 ? 'viz-bad' : ''}>
                  {step.score > 0 ? '✓' : step.score < 0 ? '✗' : '•'} {step.label}
                </span>
                {step.feedback && <span className="subtle"> - {step.feedback}</span>}
              </li>
            )
          })}
        </ol>
      )}

      {result && current.end ? (
        <section
          className={`card stack-sm incident-result${result.correct ? '' : ' is-wrong'}`}
          aria-live="polite"
        >
          <div className="row">
            <h2 className="card__title" style={{ flex: '1 1 auto' }}>
              {result.correct ? 'Root cause found' : 'Wrong conclusion'}
            </h2>
            <Badge tone={result.correct ? 'success' : 'danger'}>{result.percent}%</Badge>
          </div>
          <p style={{ margin: 0 }}>{current.text}</p>
          <p style={{ margin: 0 }}>
            <strong>{result.correct ? 'Root cause:' : 'What went wrong:'}</strong>{' '}
            <RichText text={current.end.rootCause} />
          </p>
          <p style={{ margin: 0 }}>
            <strong>Lesson:</strong> <RichText text={current.end.lesson} />
          </p>
          <dl className="sla-downtime">
            <div>
              <dt>Diagnosis points</dt>
              <dd>
                {result.points} of {result.best}
              </dd>
            </div>
            <div>
              <dt>Steps taken</dt>
              <dd>
                {result.steps} (best {result.optimal})
              </dd>
            </div>
          </dl>
          <div className="button-row">
            <button type="button" className="btn" onClick={() => open(scenario.id)}>
              Try again
            </button>
            <button type="button" className="btn btn--secondary" onClick={() => open(null)}>
              Another incident
            </button>
          </div>
        </section>
      ) : (
        <section className="card stack-sm" aria-live="polite">
          <p style={{ margin: 0 }}>
            <strong>{current.text}</strong>
          </p>
          {current.evidence && (
            <pre className="bot-evidence" aria-label="Evidence">
              {current.evidence}
            </pre>
          )}
          <div className="incident-choices" role="group" aria-label="What do you do?">
            {current.choices?.map((choice, index) => (
              <button
                key={choice.label}
                type="button"
                className="btn btn--secondary incident-choice"
                onClick={() => choose(index)}
              >
                {choice.label}
              </button>
            ))}
          </div>
        </section>
      )}
    </div>
  )
}
