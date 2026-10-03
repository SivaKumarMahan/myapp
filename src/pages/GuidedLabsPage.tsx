import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { Badge } from '../components/ui/Badge'
import { CodeBlock } from '../components/ui/CodeBlock'
import { RichText } from '../components/ui/RichText'
import {
  guidedLabById,
  guidedLabKey,
  guidedLabs,
  isRunning,
  verifyOutput,
  type GuidedLab,
  type LabStep,
} from '../content/labs'
import { courseIdForTopic, courseIndex } from '../content/registry'
import type { GuidedLabProgress } from '../lib/storage'
import { useProgress } from '../lib/use-progress'

const EMPTY: GuidedLabProgress = { done: [], verified: [], checks: [] }

const COURSE_LABEL: Record<GuidedLab['course'], string> = { az104: 'AZ-104', az400: 'AZ-400' }

function lessonLink(id: string) {
  const course = courseIndex(courseIdForTopic(id))?.course
  const lesson = course?.topics.find((topic) => topic.id === id)
  return course && lesson
    ? { to: `${course.route}/topics/${id}`, label: `${course.examCode}: ${lesson.title}` }
    : null
}

function VerifyBox({
  step,
  verified,
  onVerified,
}: {
  step: LabStep
  verified: boolean
  onVerified: () => void
}) {
  const verify = step.verify
  const [output, setOutput] = useState('')
  const [results, setResults] = useState<boolean[] | null>(null)
  if (!verify) return null
  return (
    <div className="lab-verify stack-sm">
      <strong>✅ Verify {verified && <Badge tone="success">verified</Badge>}</strong>
      <CodeBlock code={verify.command} language="bash" title="Run" />
      <label className="field">
        <span className="field__label">Paste the output here to check it</span>
        <textarea
          className="mock-textarea lab-output"
          rows={4}
          value={output}
          onChange={(event) => setOutput(event.target.value)}
          spellCheck={false}
        />
      </label>
      <div className="button-row">
        <button
          type="button"
          className="btn btn--sm"
          disabled={!output.trim()}
          onClick={() => {
            const next = verifyOutput(verify, output)
            setResults(next)
            if (next.every(Boolean)) onVerified()
          }}
        >
          Check output
        </button>
      </div>
      {results && (
        <ul className="cli-checks" aria-label="Verification">
          {verify.expect.map((pattern, index) => (
            <li key={pattern} className={results[index] ? 'cli-check--pass' : 'cli-check--todo'}>
              <span aria-hidden="true">{results[index] ? '✓' : '✗'}</span> expected to see{' '}
              <code>{pattern.replace(/\\s\*|\\s\+/g, ' ').replace(/\\/g, '')}</code>
            </li>
          ))}
        </ul>
      )}
      <p className="subtle" style={{ margin: 0 }}>
        {verify.explain}
      </p>
      <details>
        <summary className="subtle">Example of the expected output</summary>
        <pre className="bot-evidence">{verify.sample}</pre>
      </details>
    </div>
  )
}

function LabList() {
  const { state } = useProgress()
  return (
    <div className="page stack">
      <header className="page-header">
        <h1>Guided labs</h1>
        <p className="page-header__meta">
          Step-by-step labs for your own Azure subscription (a free account works). Each has goals,
          commands to copy into Cloud Shell, verify steps with the output you should see, a
          checklist, a cost estimate - and a cleanup you must run at the end.
        </p>
      </header>
      {(['az104', 'az400'] as const).map((course) => (
        <section key={course} className="stack-sm" aria-labelledby={`labs-${course}`}>
          <h2 id={`labs-${course}`}>{COURSE_LABEL[course]}</h2>
          <div className="card-grid card-grid--2">
            {guidedLabs
              .filter((lab) => lab.course === course)
              .map((lab) => {
                const progress = state.guidedLabs[lab.id]
                const solved = state.challenges[guidedLabKey(lab.id)]?.solvedAt
                return (
                  <Link
                    key={lab.id}
                    to={`/guided-labs/${lab.id}`}
                    className="card card--interactive stack-sm"
                  >
                    <div className="row">
                      <Badge>{lab.minutes} min</Badge>
                      <Badge tone="info">{lab.cost.estimate}</Badge>
                      {solved && <Badge tone="success">✓ Done</Badge>}
                      {isRunning(progress) && <Badge tone="warning">⚠ Not cleaned up</Badge>}
                    </div>
                    <strong className="card__title">{lab.title}</strong>
                    <span className="subtle">{lab.summary}</span>
                    {progress && (
                      <span className="subtle">
                        {progress.done.length}/{lab.steps.length} steps · {progress.checks.length}/
                        {lab.checklist.length} checks
                      </span>
                    )}
                  </Link>
                )
              })}
          </div>
        </section>
      ))}
    </div>
  )
}

/** Guided labs: a list, and one lab at a time. */
export function GuidedLabsPage() {
  const { labId } = useParams()
  const { state, setGuidedLab, recordChallengeCheck } = useProgress()
  if (!labId) return <LabList />
  const lab = guidedLabById.get(labId)
  if (!lab) {
    return (
      <div className="page stack">
        <h1>Lab not found</h1>
        <Link to="/guided-labs">All guided labs</Link>
      </div>
    )
  }
  const progress = state.guidedLabs[lab.id] ?? EMPTY
  const running = isRunning(progress)

  const save = (next: GuidedLabProgress) => {
    setGuidedLab(lab.id, next)
    const complete =
      next.checks.length === lab.checklist.length &&
      Boolean(next.cleanedAt) &&
      !isRunning(next) &&
      next.done.length > 0
    if (complete && !state.challenges[guidedLabKey(lab.id)]?.solvedAt)
      recordChallengeCheck(guidedLabKey(lab.id), true)
  }
  const toggle = (list: number[], index: number) =>
    list.includes(index)
      ? list.filter((entry) => entry !== index)
      : [...list, index].sort((a, b) => a - b)

  return (
    <div className="page stack">
      <header className="page-header">
        <p className="subtle" style={{ margin: 0 }}>
          <Link to="/guided-labs">Guided labs</Link>
        </p>
        <h1>{lab.title}</h1>
        <p className="page-header__meta">{lab.summary}</p>
        <div className="row">
          <Badge>{COURSE_LABEL[lab.course]}</Badge>
          <Badge>{lab.minutes} min</Badge>
          {state.challenges[guidedLabKey(lab.id)]?.solvedAt && (
            <Badge tone="success">✓ Completed</Badge>
          )}
        </div>
      </header>

      {running && (
        <div className="lab-alert" role="alert">
          ⚠ You started this lab {new Date(progress.startedAt as number).toLocaleString()} and
          haven&rsquo;t confirmed cleanup - resources may still be running and costing money.{' '}
          <a href="#lab-cleanup">Go to cleanup</a>
        </div>
      )}

      <div className="card-grid card-grid--2">
        <section className="card stack-sm lab-cost">
          <h2 className="card__title">💲 Estimated cost: {lab.cost.estimate}</h2>
          <p style={{ margin: 0 }}>{lab.cost.detail}</p>
          <p className="subtle" style={{ margin: 0 }}>
            Estimates, not quotes - prices vary by region and change over time. Set a budget alert
            on your subscription.
          </p>
        </section>
        <section className="card stack-sm">
          <h2 className="card__title">Before you start</h2>
          <ul className="role-list">
            {lab.prerequisites.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </section>
      </div>

      <section className="card stack-sm">
        <h2 className="card__title">Goals</h2>
        <ul className="role-list">
          {lab.goals.map((goal) => (
            <li key={goal}>{goal}</li>
          ))}
        </ul>
        <div className="role-links">
          {lab.lessons.map((id) => {
            const link = lessonLink(id)
            return link ? (
              <Link key={id} to={link.to}>
                📘 {link.label}
              </Link>
            ) : null
          })}
        </div>
      </section>

      <ol className="lab-steps">
        {lab.steps.map((step, index) => {
          const done = progress.done.includes(index)
          return (
            <li key={step.title} className={`card stack-sm lab-step${done ? ' is-done' : ''}`}>
              <div className="row">
                <h2 className="card__title" style={{ flex: '1 1 auto' }}>
                  {index + 1}. {step.title}
                </h2>
                <label className="row">
                  <input
                    type="checkbox"
                    checked={done}
                    onChange={() =>
                      save({
                        ...progress,
                        done: toggle(progress.done, index),
                        ...(!done
                          ? {
                              startedAt:
                                progress.startedAt && !progress.cleanedAt
                                  ? progress.startedAt
                                  : Date.now(),
                            }
                          : {}),
                      })
                    }
                  />
                  Done
                </label>
              </div>
              {step.text && (
                <p style={{ margin: 0 }}>
                  <RichText text={step.text} />
                </p>
              )}
              <CodeBlock code={step.commands} language="bash" title="Cloud Shell (Bash)" />
              <VerifyBox
                step={step}
                verified={progress.verified.includes(index)}
                onVerified={() =>
                  save({
                    ...progress,
                    verified: [...new Set([...progress.verified, index])].sort((a, b) => a - b),
                  })
                }
              />
            </li>
          )
        })}
      </ol>

      <section className="card stack-sm" aria-labelledby="lab-checklist">
        <h2 id="lab-checklist" className="card__title">
          Checklist
        </h2>
        {lab.checklist.map((item, index) => (
          <label key={item} className="row lab-check">
            <input
              type="checkbox"
              checked={progress.checks.includes(index)}
              onChange={() => save({ ...progress, checks: toggle(progress.checks, index) })}
            />
            {item}
          </label>
        ))}
      </section>

      <section
        id="lab-cleanup"
        className="card stack-sm lab-cleanup"
        aria-labelledby="lab-cleanup-title"
      >
        <h2 id="lab-cleanup-title" className="card__title">
          🧹 Cleanup (required)
        </h2>
        <p style={{ margin: 0 }}>{lab.cleanup.note}</p>
        <CodeBlock code={lab.cleanup.commands} language="bash" title="Run this before you leave" />
        {progress.cleanedAt && !running ? (
          <p className="viz-ok" style={{ margin: 0 }}>
            ✓ Cleanup confirmed {new Date(progress.cleanedAt).toLocaleString()}.
          </p>
        ) : (
          <button
            type="button"
            className="btn btn--danger"
            style={{ justifySelf: 'start' }}
            onClick={() => save({ ...progress, cleanedAt: Date.now() })}
          >
            I ran the cleanup
          </button>
        )}
        <p className="subtle" style={{ margin: 0 }}>
          The lab counts as complete when every checklist item is ticked and cleanup is confirmed.
        </p>
      </section>
      <button
        type="button"
        className="btn btn--ghost btn--sm"
        style={{ justifySelf: 'start' }}
        onClick={() => {
          if (window.confirm('Reset your progress on this lab?')) setGuidedLab(lab.id, null)
        }}
      >
        Reset lab progress
      </button>
    </div>
  )
}
