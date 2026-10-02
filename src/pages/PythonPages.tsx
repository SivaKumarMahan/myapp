import { useEffect, useRef, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { python as pythonLanguage } from '@codemirror/lang-python'
import {
  fixtureNames,
  pythonChallengeById,
  pythonChallengeKey,
  pythonChallenges,
  pythonTopicLabel,
  type PythonChallenge,
  type PythonTopic,
} from '../content/python'
import {
  pythonIsWarm,
  runPython,
  sameValue,
  testPython,
  type PythonEvent,
  type RunOutcome,
} from '../lib/python/client'
import type { TestOutcome } from '../lib/python/protocol'
import { readJson, writeJson } from '../lib/local-json'
import { pyRepr } from '../lib/python/repr'
import { useProgress } from '../lib/use-progress'
import { CodeEditor } from '../components/CodeEditor'
import { Badge, type BadgeTone } from '../components/ui/Badge'
import { CodeBlock } from '../components/ui/CodeBlock'
import { ProgressBar } from '../components/ui/ProgressBar'
import { RichText } from '../components/ui/RichText'
import { EmptyState } from '../components/ui/StateBlock'

const PLAYGROUND_DRAFT = 'azure-learning-hub.python-draft'
const DRAFT_KEY = 'azure-learning-hub.python-challenge-draft'
const SOLUTION_AFTER_FAILURES = 2
const language = pythonLanguage()

const difficultyTone: Record<PythonChallenge['difficulty'], BadgeTone> = {
  easy: 'success',
  medium: 'info',
  hard: 'warning',
}

interface Chunk {
  stream: 'stdout' | 'stderr' | 'status'
  text: string
}

function useOutput() {
  const [chunks, setChunks] = useState<Chunk[]>([])
  const [status, setStatus] = useState<string | null>(null)
  const onEvent = (event: PythonEvent) => {
    if (event.type === 'status') setStatus(event.text)
    else setChunks((current) => [...current, { stream: event.type, text: event.data }])
  }
  return { chunks, setChunks, status, setStatus, onEvent }
}

function LoadingNote({ status }: { status: string | null }) {
  if (!status) return null
  return (
    <p className="py-loading" role="status">
      <span className="py-loading__spinner" aria-hidden="true" />
      {status}
    </p>
  )
}

function Output({
  chunks,
  outcome,
  running,
}: {
  chunks: Chunk[]
  outcome: RunOutcome | null
  running: boolean
}) {
  const ref = useRef<HTMLPreElement | null>(null)
  useEffect(() => {
    if (ref.current) ref.current.scrollTop = ref.current.scrollHeight
  }, [chunks])
  return (
    <section className="code-block playground__output" aria-label="Output">
      <div className="code-block__header">
        <span className="code-block__title">Output</span>
        {running && <span className="badge badge--info">Running…</span>}
        {outcome && !running && (
          <span className={`badge ${outcome.code === 0 ? 'badge--success' : 'badge--danger'}`}>
            {outcome.error
              ? 'Could not run'
              : outcome.timedOut
                ? 'Timed out and was stopped'
                : outcome.stopped
                  ? 'Stopped'
                  : outcome.code === 0
                    ? 'Finished'
                    : 'Raised an exception'}{' '}
            · {(outcome.durationMs / 1000).toFixed(2)}s
          </span>
        )}
      </div>
      <pre className="code-block__pre playground__pre" ref={ref} aria-live="polite">
        {chunks.length === 0 && !running && !outcome?.error ? (
          <span className="subtle">print() output appears here.</span>
        ) : (
          chunks.map((chunk, index) => (
            <span key={index} className={`playground__${chunk.stream}`}>
              {chunk.text}
            </span>
          ))
        )}
        {outcome?.error && <span className="playground__system">{outcome.error}</span>}
      </pre>
    </section>
  )
}

function PythonTabs({ active }: { active: 'playground' | 'challenges' }) {
  const { state } = useProgress()
  const solved = pythonChallenges.filter(
    (c) => state.challenges[pythonChallengeKey(c.id)]?.solvedAt,
  ).length
  return (
    <nav className="chip-row" aria-label="Python playground sections">
      <Link
        className="chip"
        to="/python"
        aria-current={active === 'playground' ? 'page' : undefined}
      >
        Playground
      </Link>
      <Link
        className="chip"
        to="/python/challenges"
        aria-current={active === 'challenges' ? 'page' : undefined}
      >
        Challenges · {solved}/{pythonChallenges.length}
      </Link>
    </nav>
  )
}

function OfflineNote() {
  return (
    <p className="subtle" style={{ margin: 0, fontSize: '0.875rem' }}>
      Python 3.13 (Pyodide) runs in your browser. The first run downloads it - about 10 MB, plus
      about 20 MB the first time you import pandas - and it is kept for offline use after that.
    </p>
  )
}

/* ------------------------------------------------------------ playground */

const EXAMPLES: { label: string; code: string }[] = [
  {
    label: 'Hello',
    code: 'import sys\nprint("Hello from Python", sys.version.split()[0])',
  },
  {
    label: 'Parse a log line',
    code: 'import re\n\nline = \'10.0.0.5 - - [01/Oct/2025:10:00:09 +0000] "GET /api/search HTTP/1.1" 500 87\'\nmatch = re.search(r\'"(\\w+) (\\S+) [^"]+" (\\d{3})\', line)\nmethod, path, status = match.groups()\nprint(method, path, int(status))',
  },
  {
    label: 'Subnets with ipaddress',
    code: 'import ipaddress\n\nvnet = ipaddress.ip_network("10.0.0.0/16")\nfor subnet in list(vnet.subnets(new_prefix=24))[:4]:\n    print(subnet, "usable in Azure:", subnet.num_addresses - 5)',
  },
  {
    label: 'JSON like az CLI output',
    code: 'import json\n\nraw = \'[{"name": "vm-web-01", "powerState": "VM running"}, {"name": "vm-batch-01", "powerState": "VM stopped"}]\'\nfor vm in json.loads(raw):\n    print(f"{vm[\'name\']:<12} {vm[\'powerState\']}")',
  },
  {
    label: 'pandas',
    code: 'import io\nimport pandas as pd\n\ncsv = """service,cost\nVMs,41.2\nSQL,18.75\nVMs,12.4\n"""\ndf = pd.read_csv(io.StringIO(csv))\nprint(df.groupby("service")["cost"].sum())',
  },
]

export function PythonPlaygroundPage() {
  const [code, setCode] = useState(
    () => readJson<string | null>(PLAYGROUND_DRAFT, null) ?? EXAMPLES[0].code,
  )
  const [stdin, setStdin] = useState('')
  const [showStdin, setShowStdin] = useState(false)
  const [running, setRunning] = useState(false)
  const [outcome, setOutcome] = useState<RunOutcome | null>(null)
  const output = useOutput()
  const abort = useRef<AbortController | null>(null)

  useEffect(() => writeJson(PLAYGROUND_DRAFT, code), [code])
  useEffect(() => () => abort.current?.abort(), [])

  const run = async () => {
    if (running || !code.trim()) return
    const controller = new AbortController()
    abort.current = controller
    setRunning(true)
    setOutcome(null)
    output.setChunks([])
    output.setStatus(pythonIsWarm() ? null : 'Starting Python…')
    const result = await runPython(code, {
      stdin,
      signal: controller.signal,
      onEvent: (event) => {
        output.onEvent(event)
      },
    })
    output.setStatus(null)
    setOutcome(result)
    setRunning(false)
  }

  return (
    <div className="page stack">
      <header className="page-header">
        <h1>Python playground</h1>
        <p className="page-header__meta">
          Write Python, run it, see the output. Ctrl+Enter (⌘+Enter) runs.
        </p>
      </header>
      <PythonTabs active="playground" />
      <OfflineNote />

      <div className="code-block sql-editor-block">
        <div className="code-block__header">
          <span className="code-block__title">main.py</span>
          <select
            className="select playground__examples"
            aria-label="Load an example"
            value=""
            onChange={(event) => {
              const example = EXAMPLES.find((entry) => entry.label === event.target.value)
              if (example) setCode(example.code)
            }}
          >
            <option value="">Examples…</option>
            {EXAMPLES.map((example) => (
              <option key={example.label}>{example.label}</option>
            ))}
          </select>
        </div>
        <CodeEditor
          value={code}
          onChange={setCode}
          onRun={() => void run()}
          language={language}
          languageKey="python"
          label="Python code"
          minLines={10}
        />
      </div>

      {showStdin && (
        <label className="field">
          <span className="field__label">
            Standard input (what input() reads, one line per call)
          </span>
          <textarea
            className="playground__textarea playground__stdin"
            value={stdin}
            onChange={(event) => setStdin(event.target.value)}
            rows={3}
            spellCheck={false}
          />
        </label>
      )}

      <div className="row">
        {running ? (
          <button type="button" className="btn btn--danger" onClick={() => abort.current?.abort()}>
            ■ Stop
          </button>
        ) : (
          <button type="button" className="btn" onClick={() => void run()} disabled={!code.trim()}>
            ▶ Run
          </button>
        )}
        <button
          type="button"
          className="btn btn--secondary"
          onClick={() => setShowStdin((value) => !value)}
          aria-expanded={showStdin}
        >
          {showStdin ? 'Hide input' : 'Add input'}
        </button>
      </div>

      <LoadingNote status={output.status} />
      <Output chunks={output.chunks} outcome={outcome} running={running} />
    </div>
  )
}

/* ------------------------------------------------------------ challenges */

const topics = Object.keys(pythonTopicLabel) as PythonTopic[]

export function PythonChallengesPage() {
  const { state } = useProgress()
  const solved = pythonChallenges.filter(
    (c) => state.challenges[pythonChallengeKey(c.id)]?.solvedAt,
  )
  return (
    <div className="page stack-lg">
      <header className="page-header">
        <h1>Python challenges</h1>
        <p className="page-header__meta">
          {pythonChallenges.length} DevOps scripting problems. Write the function; hidden tests
          check the edge cases.
        </p>
      </header>
      <PythonTabs active="challenges" />
      <ProgressBar
        value={(solved.length / pythonChallenges.length) * 100}
        label={`${solved.length} of ${pythonChallenges.length} solved`}
        showValue
      />
      {topics.map((topic) => {
        const list = pythonChallenges.filter((challenge) => challenge.topic === topic)
        if (list.length === 0) return null
        return (
          <section key={topic} className="stack-sm" aria-labelledby={`py-topic-${topic}`}>
            <h2 id={`py-topic-${topic}`} style={{ margin: 0, fontSize: '1.1rem' }}>
              {pythonTopicLabel[topic]}
            </h2>
            <ul className="sql-challenge-list">
              {list.map((challenge) => {
                const progress = state.challenges[pythonChallengeKey(challenge.id)]
                return (
                  <li key={challenge.id}>
                    <Link className="sql-challenge-link" to={`/python/challenges/${challenge.id}`}>
                      <span className="sql-challenge-link__mark" aria-hidden="true">
                        {progress?.solvedAt ? '✓' : '○'}
                      </span>
                      <span className="sql-challenge-link__title">{challenge.title}</span>
                      <Badge tone={difficultyTone[challenge.difficulty]}>
                        {challenge.difficulty}
                      </Badge>
                      {progress?.solvedAt ? (
                        <span className="visually-hidden">(solved)</span>
                      ) : null}
                    </Link>
                  </li>
                )
              })}
            </ul>
          </section>
        )
      })}
    </div>
  )
}

export function PythonChallengePage() {
  const { challengeId = '' } = useParams<{ challengeId: string }>()
  const challenge = pythonChallengeById.get(challengeId)
  if (!challenge) {
    return (
      <div className="page stack">
        <EmptyState
          icon="🐍"
          title="No such challenge"
          action={
            <Link className="btn" to="/python/challenges">
              All challenges
            </Link>
          }
        />
      </div>
    )
  }
  return <ChallengeView key={challenge.id} challenge={challenge} />
}

interface Verdict {
  setupError: string | null
  passed: boolean[]
  outcome: TestOutcome | null
  error?: string
}

/** The sample data with the internal helpers (names starting with _) taken out. */
const visibleFixtures = (fixtures: string) =>
  fixtures
    .split(/\n(?=\S)/)
    .filter((block) => !/^def __/.test(block))
    .join('\n')
    .trim()

function ChallengeView({ challenge }: { challenge: PythonChallenge }) {
  const { state, recordChallengeCheck } = useProgress()
  const key = pythonChallengeKey(challenge.id)
  const progress = state.challenges[key]
  const solved = Boolean(progress?.solvedAt)
  const failures = progress?.failures ?? 0
  const unlocked = solved || failures >= SOLUTION_AFTER_FAILURES

  const draftKey = `${DRAFT_KEY}.${challenge.id}`
  const [code, setCode] = useState(
    () => readJson<string | null>(draftKey, null) ?? challenge.starter,
  )
  const [verdict, setVerdict] = useState<Verdict | null>(null)
  const [busy, setBusy] = useState<'tests' | 'run' | null>(null)
  const [hintsShown, setHintsShown] = useState(0)
  const [showSolution, setShowSolution] = useState(false)
  const [runOutcome, setRunOutcome] = useState<RunOutcome | null>(null)
  const output = useOutput()

  useEffect(() => writeJson(draftKey, code), [draftKey, code])

  const names = fixtureNames(challenge.fixtures)
  const sample = visibleFixtures(challenge.fixtures)

  const runTests = async () => {
    if (busy) return
    setBusy('tests')
    setRunOutcome(null)
    output.setChunks([])
    output.setStatus(pythonIsWarm() ? null : 'Starting Python…')
    const result = await testPython(
      code,
      challenge.fixtures,
      challenge.tests.map((test) => test.call),
      { onEvent: output.onEvent },
    )
    output.setStatus(null)
    setBusy(null)
    if (!result.ok) {
      setVerdict({ setupError: null, passed: [], outcome: null, error: result.error })
      return
    }
    const passed = challenge.tests.map((test, index) => {
      const got = result.outcome.results[index]
      return Boolean(got && got.error === null && sameValue(got.value, test.expected))
    })
    setVerdict({ setupError: result.outcome.setupError, passed, outcome: result.outcome })
    recordChallengeCheck(key, !result.outcome.setupError && passed.every(Boolean))
  }

  const runCode = async () => {
    if (busy) return
    setBusy('run')
    setVerdict(null)
    output.setChunks([])
    output.setStatus(pythonIsWarm() ? null : 'Starting Python…')
    const result = await runPython(code, { prelude: challenge.fixtures, onEvent: output.onEvent })
    output.setStatus(null)
    setRunOutcome(result)
    setBusy(null)
  }

  const index = pythonChallenges.indexOf(challenge)
  const next = pythonChallenges[index + 1]
  const hints = unlocked ? challenge.hints.length : hintsShown
  const allPassed = verdict?.outcome && !verdict.setupError && verdict.passed.every(Boolean)
  const visibleCount = challenge.tests.filter((test) => !test.hidden).length

  return (
    <div className="page stack">
      <header className="page-header">
        <nav className="breadcrumbs" aria-label="Breadcrumb">
          <Link to="/python">Python playground</Link>
          <span aria-hidden="true">/</span>
          <Link to="/python/challenges">Challenges</Link>
          <span aria-hidden="true">/</span>
          <span>{challenge.title}</span>
        </nav>
        <h1>{challenge.title}</h1>
        <div className="page-header__meta">
          <Badge tone={difficultyTone[challenge.difficulty]}>{challenge.difficulty}</Badge>
          <Badge>{pythonTopicLabel[challenge.topic]}</Badge>
          {solved && <Badge tone="success">✓ Solved</Badge>}
          <span className="subtle">
            {index + 1} of {pythonChallenges.length}
          </span>
        </div>
      </header>

      <div className="card stack-sm">
        <p style={{ margin: 0 }}>
          <RichText text={challenge.description} />
        </p>
        <p className="subtle" style={{ margin: 0 }}>
          {challenge.tests.length} tests: {visibleCount} shown below,{' '}
          {challenge.tests.length - visibleCount} hidden.
          {names.length > 0 && (
            <>
              {' '}
              Already defined for you:{' '}
              {names.map((name, i) => (
                <span key={name}>
                  {i > 0 && ', '}
                  <code>{name}</code>
                </span>
              ))}
              .
            </>
          )}
        </p>
        {sample && (
          <details>
            <summary>Show the sample data</summary>
            <CodeBlock code={sample} language="python" title="Defined before your code runs" />
          </details>
        )}
      </div>

      <div className="code-block sql-editor-block">
        <div className="code-block__header">
          <span className="code-block__title">solution.py</span>
          <button
            type="button"
            className="btn btn--ghost btn--sm"
            onClick={() => setCode(challenge.starter)}
          >
            Start over
          </button>
        </div>
        <CodeEditor
          value={code}
          onChange={setCode}
          onRun={() => void runTests()}
          language={language}
          languageKey="python"
          label={`Your code for ${challenge.title}`}
          minLines={10}
        />
      </div>

      <div className="row">
        <button
          type="button"
          className="btn"
          onClick={() => void runTests()}
          disabled={busy !== null}
        >
          ✓ Run tests
        </button>
        <button
          type="button"
          className="btn btn--secondary"
          onClick={() => void runCode()}
          disabled={busy !== null}
        >
          ▶ Run
        </button>
        {!unlocked && hintsShown < challenge.hints.length && (
          <button
            type="button"
            className="btn btn--ghost"
            onClick={() => setHintsShown((count) => count + 1)}
          >
            💡 {hintsShown === 0 ? 'Hint' : 'Another hint'}
          </button>
        )}
      </div>
      <p className="subtle" style={{ margin: 0, fontSize: '0.8125rem' }}>
        Ctrl+Enter runs the tests. Run executes your code with the sample data so you can print
        things.
        {!unlocked &&
          ` The solution unlocks after ${SOLUTION_AFTER_FAILURES} failed attempts (${failures} so far).`}
      </p>

      <LoadingNote status={output.status} />

      {verdict && (
        <section className="stack-sm" aria-label="Test results">
          {verdict.error && (
            <div className="notice notice--danger" role="alert">
              <span className="notice__icon" aria-hidden="true">
                ✗
              </span>
              <p style={{ margin: 0 }}>{verdict.error}</p>
            </div>
          )}
          {verdict.setupError && (
            <div className="notice notice--danger" role="alert">
              <span className="notice__icon" aria-hidden="true">
                ✗
              </span>
              <div>
                <p style={{ margin: 0 }}>
                  <strong>Your code raised an error before any test could run:</strong>
                </p>
                <pre className="py-traceback">{verdict.setupError}</pre>
              </div>
            </div>
          )}
          {verdict.outcome && !verdict.setupError && (
            <>
              <div className={`notice notice--${allPassed ? 'success' : 'warning'}`} role="status">
                <span className="notice__icon" aria-hidden="true">
                  {allPassed ? '🎉' : '✗'}
                </span>
                <div className="stack-sm">
                  <p style={{ margin: 0 }}>
                    <strong>
                      {verdict.passed.filter(Boolean).length} of {challenge.tests.length} tests
                      passed.
                    </strong>{' '}
                    {allPassed ? 'Solved!' : 'Fix the failing ones and run again.'}
                  </p>
                  {allPassed && next && (
                    <div>
                      <Link className="btn btn--sm" to={`/python/challenges/${next.id}`}>
                        Next challenge: {next.title} →
                      </Link>
                    </div>
                  )}
                </div>
              </div>
              <ol className="py-tests">
                {challenge.tests.map((test, testIndex) => {
                  const got = verdict.outcome?.results[testIndex]
                  const ok = verdict.passed[testIndex]
                  const reveal = !test.hidden || unlocked || allPassed
                  return (
                    <li key={test.name} className={`py-test py-test--${ok ? 'pass' : 'fail'}`}>
                      <p className="py-test__title">
                        <span aria-hidden="true">{ok ? '✓' : '✗'}</span> {test.name}
                        {test.hidden && <span className="badge">hidden</span>}
                        <span className="visually-hidden">{ok ? ' - passed' : ' - failed'}</span>
                      </p>
                      {reveal ? (
                        <dl className="py-test__detail">
                          <dt>Call</dt>
                          <dd>
                            <code>{test.call}</code>
                          </dd>
                          <dt>Expected</dt>
                          <dd>
                            <code>{pyRepr(test.expected)}</code>
                          </dd>
                          {!ok && got && (
                            <>
                              <dt>Got</dt>
                              <dd>
                                {got.error ? (
                                  <pre className="py-traceback">{got.error}</pre>
                                ) : (
                                  <code>{pyRepr(got.value)}</code>
                                )}
                              </dd>
                            </>
                          )}
                          {got?.output && (
                            <>
                              <dt>Printed</dt>
                              <dd>
                                <pre className="py-traceback">{got.output}</pre>
                              </dd>
                            </>
                          )}
                        </dl>
                      ) : (
                        !ok && (
                          <p className="subtle" style={{ margin: 0 }}>
                            A hidden test failed - think about edge cases.
                            {got?.error ? ` It raised ${got.error.split('\n').pop()}` : ''}
                          </p>
                        )
                      )}
                    </li>
                  )
                })}
              </ol>
            </>
          )}
        </section>
      )}

      {(busy === 'run' || runOutcome) && (
        <Output chunks={output.chunks} outcome={runOutcome} running={busy === 'run'} />
      )}

      {hints > 0 && (
        <div className="notice notice--info">
          <span className="notice__icon" aria-hidden="true">
            💡
          </span>
          <ol className="sql-hints">
            {challenge.hints.slice(0, hints).map((hint) => (
              <li key={hint}>
                <RichText text={hint} />
              </li>
            ))}
          </ol>
        </div>
      )}

      {unlocked && (
        <section className="stack-sm">
          <button
            type="button"
            className="btn btn--secondary"
            onClick={() => setShowSolution((value) => !value)}
            aria-expanded={showSolution}
          >
            {showSolution ? 'Hide' : 'Show'} the reference solution
          </button>
          {showSolution && (
            <CodeBlock code={challenge.solution} language="python" title="Reference solution" />
          )}
        </section>
      )}
    </div>
  )
}
