import { useCallback, useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { autocompletion } from '@codemirror/autocomplete'
import { KQL_NOW, kqlTables } from '../content/kql/schema'
import { kqlChallengeById, kqlChallengeKey, kqlChallenges, type KqlChallenge } from '../content/kql'
import { KqlError, translateKql, type Translation } from '../lib/kql/translate'
import { kqlLanguage } from '../lib/kql/language'
import { kqlEngine } from '../lib/sql/engine'
import type { ExecResult } from '../lib/sql/core'
import { compareResults, type CheckOutcome, type ResultSet } from '../lib/sql/compare'
import { readJson, writeJson } from '../lib/local-json'
import { useProgress } from '../lib/use-progress'
import { CodeEditor } from '../components/CodeEditor'
import { SqlResultTable } from '../components/SqlResultTable'
import { KqlChart } from '../components/KqlChart'
import { Badge, type BadgeTone } from '../components/ui/Badge'
import { CodeBlock } from '../components/ui/CodeBlock'
import { ProgressBar } from '../components/ui/ProgressBar'
import { RichText } from '../components/ui/RichText'
import { EmptyState } from '../components/ui/StateBlock'

const HISTORY_KEY = 'azure-learning-hub.kql-history'
const DRAFT_KEY = 'azure-learning-hub.kql-draft'
const HISTORY_LIMIT = 25
const SOLUTION_AFTER_FAILURES = 2

const difficultyTone: Record<KqlChallenge['difficulty'], BadgeTone> = {
  easy: 'success',
  medium: 'info',
  hard: 'warning',
}

const language = [kqlLanguage, autocompletion()]

/** What one KQL run produced: a translation error, or SQL and its result. */
interface KqlRun {
  error?: { message: string; line?: number; column?: number }
  translation?: Translation
  result?: ExecResult
}

const locate = (query: string, position: number | undefined) => {
  if (position === undefined) return {}
  const before = query.slice(0, position).split('\n')
  return { line: before.length, column: before[before.length - 1].length + 1 }
}

/** Translates and runs a query. Challenge checks use pristine data. */
async function runKql(query: string, mode: 'playground' | 'challenge'): Promise<KqlRun> {
  let translation: Translation
  try {
    translation = translateKql(query)
  } catch (error) {
    if (error instanceof KqlError) {
      return { error: { message: error.message, ...locate(query, error.position) } }
    }
    return { error: { message: error instanceof Error ? error.message : String(error) } }
  }
  const result = await kqlEngine.exec(translation.sql, mode)
  if (result.error) return { translation, error: { message: `SQLite: ${result.error}` } }
  return { translation, result }
}

const lastResult = (run: KqlRun | null): ResultSet | null => run?.result?.results.at(-1) ?? null

/* ---------------------------------------------------------------- shared */

function KqlTabs({ active }: { active: 'playground' | 'challenges' }) {
  const { state } = useProgress()
  const solved = kqlChallenges.filter(
    (c) => state.challenges[kqlChallengeKey(c.id)]?.solvedAt,
  ).length
  return (
    <nav className="chip-row" aria-label="KQL simulator sections">
      <Link className="chip" to="/kql" aria-current={active === 'playground' ? 'page' : undefined}>
        Playground
      </Link>
      <Link
        className="chip"
        to="/kql/challenges"
        aria-current={active === 'challenges' ? 'page' : undefined}
      >
        Challenges · {solved}/{kqlChallenges.length}
      </Link>
    </nav>
  )
}

function SimulatorNotice() {
  return (
    <div className="notice notice--info">
      <span className="notice__icon" aria-hidden="true">
        ℹ️
      </span>
      <div className="stack-sm">
        <p style={{ margin: 0 }}>
          <strong>A simplified KQL simulator.</strong> There is no KQL engine that runs in a
          browser, so a practical subset of KQL is translated to SQL and run on SQLite, offline. The
          sample tables mimic Log Analytics and Application Insights. The clock is fixed at{' '}
          <strong>{KQL_NOW} UTC</strong>, so <code>ago(1h)</code> always finds data.
        </p>
        <details>
          <summary>What is supported</summary>
          <p style={{ margin: '0.4rem 0 0' }}>
            <strong>Operators:</strong> <code>where</code>, <code>project</code>,{' '}
            <code>project-away</code>, <code>project-rename</code>, <code>extend</code>,{' '}
            <code>summarize … by</code>, <code>order by</code> / <code>sort by</code>,{' '}
            <code>top N by</code>, <code>take</code> / <code>limit</code>, <code>distinct</code>,{' '}
            <code>count</code>, <code>join kind=inner|leftouter</code>, <code>render</code>{' '}
            (timechart, linechart, barchart, columnchart, piechart), <code>print</code>.
          </p>
          <p style={{ margin: '0.4rem 0 0' }}>
            <strong>Aggregations:</strong> <code>count()</code>, <code>countif()</code>,{' '}
            <code>dcount()</code>, <code>sum()</code>, <code>avg()</code>, <code>min()</code>,{' '}
            <code>max()</code>, <code>sumif()</code>, <code>avgif()</code>, <code>make_set()</code>,{' '}
            <code>make_list()</code>.
          </p>
          <p style={{ margin: '0.4rem 0 0' }}>
            <strong>Functions and operators:</strong> <code>ago()</code>, <code>now()</code>,{' '}
            <code>bin()</code>, <code>datetime()</code>, <code>startofday()</code>,{' '}
            <code>hourofday()</code>, <code>between</code>, <code>in</code>, <code>contains</code>,{' '}
            <code>has</code>, <code>startswith</code>, <code>endswith</code> (and their{' '}
            <code>!</code> forms), <code>==</code>, <code>=~</code>, <code>iff()</code>,{' '}
            <code>isempty()</code>, <code>strcat()</code>, <code>tostring()</code>,{' '}
            <code>round()</code> and more.
          </p>
        </details>
      </div>
    </div>
  )
}

function SchemaPanel() {
  return (
    <details className="sql-schema">
      <summary>Tables: {kqlTables.map((table) => table.name).join(', ')}</summary>
      <div className="sql-schema__tables">
        {kqlTables.map((table) => (
          <div key={table.name} className="sql-schema__table">
            <strong>{table.name}</strong> <span className="subtle">{table.description}</span>
            <p className="sql-schema__columns">
              {table.columns.map((column) => (
                <code key={column.name} title={column.type}>
                  {column.name}
                  <span className="subtle">:{column.type}</span>
                </code>
              ))}
            </p>
          </div>
        ))}
      </div>
    </details>
  )
}

function RunView({ run, running }: { run: KqlRun | null; running: boolean }) {
  if (running) return <p className="subtle">Running…</p>
  if (!run) return null
  const result = lastResult(run)
  return (
    <div className="stack-sm">
      {run.error && (
        <div className="notice notice--danger" role="alert">
          <span className="notice__icon" aria-hidden="true">
            ✗
          </span>
          <p style={{ margin: 0, overflowWrap: 'anywhere' }}>
            <strong>
              Error{run.error.line ? ` (line ${run.error.line}, column ${run.error.column})` : ''}:
            </strong>{' '}
            {run.error.message}
          </p>
        </div>
      )}
      {run.translation?.notes.map((note) => (
        <p key={note} className="subtle kql-note">
          ⓘ {note}
        </p>
      ))}
      {result && run.translation?.chart && (
        <KqlChart result={result} type={run.translation.chart} />
      )}
      {result && <SqlResultTable result={result} caption="Query result" />}
      {run.result && (
        <p className="subtle" style={{ margin: 0, fontSize: '0.8125rem' }}>
          {run.result.ms.toFixed(1)} ms
        </p>
      )}
      {run.translation && (
        <details className="kql-sql">
          <summary>Show the generated SQL</summary>
          <CodeBlock code={run.translation.sql} language="sql" title="What the simulator ran" />
        </details>
      )}
    </div>
  )
}

/* ------------------------------------------------------------ playground */

const EXAMPLES: { label: string; kql: string }[] = [
  {
    label: 'Failed requests per hour (chart)',
    kql: 'requests\n| where success == false\n| summarize count() by bin(timestamp, 1h)\n| render timechart',
  },
  {
    label: 'CPU per VM (chart)',
    kql: 'Perf\n| where CounterName == "% Processor Time"\n| summarize avg(CounterValue) by Computer, bin(TimeGenerated, 30m)\n| render timechart',
  },
  {
    label: 'Last heartbeat per VM',
    kql: 'Heartbeat\n| summarize LastHeartbeat = max(TimeGenerated) by Computer\n| order by LastHeartbeat asc',
  },
  {
    label: 'Sign-in results (bar chart)',
    kql: 'SigninLogs\n| summarize count() by ResultDescription\n| order by count_ desc\n| render barchart',
  },
  {
    label: 'Recent deletions',
    kql: 'AzureActivity\n| where OperationNameValue endswith "/DELETE"\n| project TimeGenerated, Caller, OperationNameValue, ActivityStatusValue\n| order by TimeGenerated desc',
  },
  { label: 'What time is it?', kql: 'print Now = now(), OneHourAgo = ago(1h)' },
]

export function KqlPlaygroundPage() {
  const [query, setQuery] = useState(
    () => readJson<string[]>(HISTORY_KEY, [])[0] ?? EXAMPLES[0].kql,
  )
  const [history, setHistory] = useState<string[]>(() => readJson<string[]>(HISTORY_KEY, []))
  const [run, setRun] = useState<KqlRun | null>(null)
  const [running, setRunning] = useState(false)

  const execute = useCallback(async () => {
    const text = query.trim()
    if (!text || running) return
    setRunning(true)
    const next = await runKql(text, 'playground')
    setRun(next)
    setRunning(false)
    if (!next.error) {
      setHistory((previous) => {
        const updated = [text, ...previous.filter((entry) => entry !== text)].slice(
          0,
          HISTORY_LIMIT,
        )
        writeJson(HISTORY_KEY, updated)
        return updated
      })
    }
  }, [query, running])

  return (
    <div className="page stack">
      <header className="page-header">
        <h1>KQL simulator</h1>
        <p className="page-header__meta">
          Practise Kusto queries on Log Analytics-style data. Ctrl+Enter (⌘+Enter) runs.
        </p>
      </header>
      <KqlTabs active="playground" />
      <SimulatorNotice />
      <SchemaPanel />

      <div className="code-block sql-editor-block">
        <div className="code-block__header">
          <span className="code-block__title">query.kql</span>
          <select
            className="select playground__examples"
            aria-label="Load an example query"
            value=""
            onChange={(event) => {
              const example = EXAMPLES.find((entry) => entry.label === event.target.value)
              if (example) setQuery(example.kql)
            }}
          >
            <option value="">Examples…</option>
            {EXAMPLES.map((example) => (
              <option key={example.label}>{example.label}</option>
            ))}
          </select>
        </div>
        <CodeEditor
          value={query}
          onChange={setQuery}
          onRun={() => void execute()}
          language={language}
          languageKey="kql"
          label="KQL query"
          placeholder="requests | take 10"
        />
      </div>

      <div className="row">
        <button
          type="button"
          className="btn"
          onClick={() => void execute()}
          disabled={running || !query.trim()}
        >
          ▶ Run
        </button>
      </div>

      <section aria-label="Result" aria-live="polite">
        <RunView run={run} running={running} />
      </section>

      {history.length > 0 && (
        <section className="stack-sm">
          <div className="row" style={{ justifyContent: 'space-between' }}>
            <h2 style={{ margin: 0, fontSize: '1.05rem' }}>Query history</h2>
            <button
              type="button"
              className="btn btn--ghost btn--sm"
              onClick={() => {
                setHistory([])
                writeJson(HISTORY_KEY, [])
              }}
            >
              Clear history
            </button>
          </div>
          <ul className="playground__history">
            {history.map((entry) => (
              <li key={entry}>
                <button
                  type="button"
                  className="playground__history-item"
                  onClick={() => setQuery(entry)}
                >
                  <code>{entry.replace(/\s+/g, ' ')}</code>
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  )
}

/* ------------------------------------------------------------ challenges */

export function KqlChallengesPage() {
  const { state } = useProgress()
  const solved = kqlChallenges.filter((c) => state.challenges[kqlChallengeKey(c.id)]?.solvedAt)
  const scenarios = [...new Set(kqlChallenges.map((challenge) => challenge.scenario))]

  return (
    <div className="page stack-lg">
      <header className="page-header">
        <h1>KQL challenges</h1>
        <p className="page-header__meta">
          {kqlChallenges.length} monitoring scenarios from AZ-104 and AZ-400: application failures,
          VM health, sign-in attacks and the activity log.
        </p>
      </header>
      <KqlTabs active="challenges" />
      <ProgressBar
        value={(solved.length / kqlChallenges.length) * 100}
        label={`${solved.length} of ${kqlChallenges.length} solved`}
        showValue
      />
      {scenarios.map((scenario) => (
        <section key={scenario} className="stack-sm" aria-label={scenario}>
          <h2 style={{ margin: 0, fontSize: '1.1rem' }}>{scenario}</h2>
          <ul className="sql-challenge-list">
            {kqlChallenges
              .filter((challenge) => challenge.scenario === scenario)
              .map((challenge) => {
                const progress = state.challenges[kqlChallengeKey(challenge.id)]
                return (
                  <li key={challenge.id}>
                    <Link className="sql-challenge-link" to={`/kql/challenges/${challenge.id}`}>
                      <span className="sql-challenge-link__mark" aria-hidden="true">
                        {progress?.solvedAt ? '✓' : '○'}
                      </span>
                      <span className="sql-challenge-link__title">{challenge.title}</span>
                      <Badge>{challenge.exam}</Badge>
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
      ))}
    </div>
  )
}

export function KqlChallengePage() {
  const { challengeId = '' } = useParams<{ challengeId: string }>()
  const challenge = kqlChallengeById.get(challengeId)
  if (!challenge) {
    return (
      <div className="page stack">
        <EmptyState
          icon="🧩"
          title="No such challenge"
          action={
            <Link className="btn" to="/kql/challenges">
              All challenges
            </Link>
          }
        />
      </div>
    )
  }
  return <ChallengeView key={challenge.id} challenge={challenge} />
}

/** The answer, worked out by running the reference solution. */
const expectedCache = new Map<string, Promise<KqlRun>>()
const expectedFor = (challenge: KqlChallenge) => {
  let run = expectedCache.get(challenge.id)
  if (!run) {
    run = runKql(challenge.solution, 'challenge')
    expectedCache.set(challenge.id, run)
  }
  return run
}

function ChallengeView({ challenge }: { challenge: KqlChallenge }) {
  const { state, recordChallengeCheck } = useProgress()
  const key = kqlChallengeKey(challenge.id)
  const progress = state.challenges[key]
  const solved = Boolean(progress?.solvedAt)
  const failures = progress?.failures ?? 0
  const unlocked = solved || failures >= SOLUTION_AFTER_FAILURES

  const draftKey = `${DRAFT_KEY}.${challenge.id}`
  const firstTable = challenge.solution.split(/\s|\|/)[0]
  const [query, setQuery] = useState(
    () => readJson<string | null>(draftKey, null) ?? `${firstTable}\n| `,
  )
  const [run, setRun] = useState<KqlRun | null>(null)
  const [outcome, setOutcome] = useState<CheckOutcome | null>(null)
  const [running, setRunning] = useState(false)
  const [hintsShown, setHintsShown] = useState(0)
  const [showSolution, setShowSolution] = useState(false)
  const [expected, setExpected] = useState<ResultSet | null>(null)

  useEffect(() => writeJson(draftKey, query), [draftKey, query])
  useEffect(() => {
    let live = true
    void expectedFor(challenge).then((answer) => live && setExpected(lastResult(answer)))
    return () => {
      live = false
    }
  }, [challenge])

  const execute = async (check: boolean) => {
    if (running || !query.trim()) return
    setRunning(true)
    const [mine, answer] = await Promise.all([runKql(query, 'challenge'), expectedFor(challenge)])
    setRun(mine)
    setRunning(false)
    if (!check) {
      setOutcome(null)
      return
    }
    const expectedResult = lastResult(answer)
    const verdict: CheckOutcome = mine.error
      ? { ok: false, reason: 'The query has an error - fix it first.' }
      : expectedResult
        ? compareResults(lastResult(mine), expectedResult, challenge.ordered)
        : { ok: false, reason: 'The reference answer could not be worked out.' }
    setOutcome(verdict)
    recordChallengeCheck(key, verdict.ok)
  }

  const index = kqlChallenges.indexOf(challenge)
  const next = kqlChallenges[index + 1]
  const hints = unlocked ? challenge.hints.length : hintsShown

  return (
    <div className="page stack">
      <header className="page-header">
        <nav className="breadcrumbs" aria-label="Breadcrumb">
          <Link to="/kql">KQL simulator</Link>
          <span aria-hidden="true">/</span>
          <Link to="/kql/challenges">Challenges</Link>
          <span aria-hidden="true">/</span>
          <span>{challenge.title}</span>
        </nav>
        <h1>{challenge.title}</h1>
        <div className="page-header__meta">
          <Badge tone={difficultyTone[challenge.difficulty]}>{challenge.difficulty}</Badge>
          <Badge>{challenge.exam}</Badge>
          <Badge>{challenge.scenario}</Badge>
          {solved && <Badge tone="success">✓ Solved</Badge>}
          <span className="subtle">
            {index + 1} of {kqlChallenges.length}
          </span>
        </div>
      </header>

      <div className="card stack-sm">
        <p style={{ margin: 0 }}>
          <RichText text={challenge.description} />
        </p>
        <p className="subtle" style={{ margin: 0 }}>
          {expected
            ? `Expected: ${expected.columns.length} columns (${expected.columns.join(', ')}), ${expected.rows.length} ${expected.rows.length === 1 ? 'row' : 'rows'}. `
            : ''}
          {challenge.ordered ? 'Row order matters.' : 'Row order does not matter.'} The clock is{' '}
          {KQL_NOW} UTC.
        </p>
      </div>

      <SchemaPanel />

      <div className="code-block sql-editor-block">
        <div className="code-block__header">
          <span className="code-block__title">solution.kql</span>
          <button
            type="button"
            className="btn btn--ghost btn--sm"
            onClick={() => setQuery(`${firstTable}\n| `)}
          >
            Start over
          </button>
        </div>
        <CodeEditor
          value={query}
          onChange={setQuery}
          onRun={() => void execute(true)}
          language={language}
          languageKey="kql"
          label={`Your query for ${challenge.title}`}
        />
      </div>

      <div className="row">
        <button type="button" className="btn" onClick={() => void execute(true)} disabled={running}>
          ✓ Check
        </button>
        <button
          type="button"
          className="btn btn--secondary"
          onClick={() => void execute(false)}
          disabled={running}
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
        Ctrl+Enter checks.
        {!unlocked &&
          ` The solution unlocks after ${SOLUTION_AFTER_FAILURES} failed checks (${failures} so far).`}
      </p>

      {outcome && (
        <div className={`notice notice--${outcome.ok ? 'success' : 'warning'}`} role="status">
          <span className="notice__icon" aria-hidden="true">
            {outcome.ok ? '🎉' : '✗'}
          </span>
          <div className="stack-sm">
            <p style={{ margin: 0 }}>
              <strong>{outcome.ok ? 'Correct!' : 'Not yet.'}</strong>{' '}
              {outcome.ok ? 'Your result matches the expected one.' : outcome.reason}
            </p>
            {outcome.ok && next && (
              <div>
                <Link className="btn btn--sm" to={`/kql/challenges/${next.id}`}>
                  Next challenge: {next.title} →
                </Link>
              </div>
            )}
          </div>
        </div>
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

      <section aria-label="Your result" aria-live="polite">
        <RunView run={run} running={running} />
      </section>

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
            <>
              <CodeBlock
                code={challenge.solution}
                language="text"
                title="Reference solution (KQL)"
              />
              {expected && (
                <SqlResultTable
                  result={expected}
                  caption={`Expected result for ${challenge.title}`}
                />
              )}
            </>
          )}
        </section>
      )}
    </div>
  )
}
