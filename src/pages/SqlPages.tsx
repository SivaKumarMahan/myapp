import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import {
  sqlChallengeById,
  sqlChallengeKey,
  sqlChallenges,
  sqlTopicLabel,
  type SqlChallenge,
  type SqlTopic,
} from '../content/sql'
import { sqlDatasets } from '../content/sql/datasets'
import { sqlEngine } from '../lib/sql/engine'
import type { ExecResult, TableInfo } from '../lib/sql/core'
import { compareResults, type CheckOutcome } from '../lib/sql/compare'
import { useProgress } from '../lib/use-progress'
import { readJson, writeJson } from '../lib/local-json'
import { SQLite, sql as sqlLanguage } from '@codemirror/lang-sql'
import { CodeEditor } from '../components/CodeEditor'
import { SqlResultTable } from '../components/SqlResultTable'
import { Badge, type BadgeTone } from '../components/ui/Badge'
import { ProgressBar } from '../components/ui/ProgressBar'
import { RichText } from '../components/ui/RichText'
import { CodeBlock } from '../components/ui/CodeBlock'
import { EmptyState } from '../components/ui/StateBlock'

/* ------------------------------------------------------------------ shared */

const HISTORY_KEY = 'azure-learning-hub.sql-history'
const DRAFT_KEY = 'azure-learning-hub.sql-draft'
const HISTORY_LIMIT = 25
/** Hints and the reference solution unlock after this many failed checks. */
const SOLUTION_AFTER_FAILURES = 2

const difficultyTone: Record<SqlChallenge['difficulty'], BadgeTone> = {
  easy: 'success',
  medium: 'info',
  hard: 'warning',
}

const topics = Object.keys(sqlTopicLabel) as SqlTopic[]

function useSchema() {
  const [tables, setTables] = useState<TableInfo[]>([])
  const refresh = useCallback(() => {
    void sqlEngine
      .schema()
      .then(setTables)
      .catch(() => setTables([]))
  }, [])
  useEffect(refresh, [refresh])
  const completion = useMemo(
    () => Object.fromEntries(tables.map((table) => [table.name, table.columns.map((c) => c.name)])),
    [tables],
  )
  return { tables, completion, refresh }
}

function SqlTabs({ active }: { active: 'playground' | 'challenges' }) {
  const { state } = useProgress()
  const solved = sqlChallenges.filter(
    (c) => state.challenges[sqlChallengeKey(c.id)]?.solvedAt,
  ).length
  return (
    <nav className="chip-row" aria-label="SQL playground sections">
      <Link className="chip" to="/sql" aria-current={active === 'playground' ? 'page' : undefined}>
        Playground
      </Link>
      <Link
        className="chip"
        to="/sql/challenges"
        aria-current={active === 'challenges' ? 'page' : undefined}
      >
        Challenges · {solved}/{sqlChallenges.length}
      </Link>
    </nav>
  )
}

function ResultView({ result, running }: { result: ExecResult | null; running: boolean }) {
  if (running) return <p className="subtle">Running…</p>
  if (!result) return null
  if (result.error) {
    return (
      <div className="notice notice--danger" role="alert">
        <span className="notice__icon" aria-hidden="true">
          ✗
        </span>
        <p style={{ margin: 0, overflowWrap: 'anywhere' }}>
          <strong>Error:</strong> {result.error}
        </p>
      </div>
    )
  }
  const last = result.results[result.results.length - 1]
  return (
    <div className="stack-sm">
      {last ? (
        <SqlResultTable result={last} caption="Query result" />
      ) : (
        <p className="subtle" style={{ margin: 0 }}>
          Done - no rows returned
          {result.changes > 0
            ? `, ${result.changes} ${result.changes === 1 ? 'row' : 'rows'} changed`
            : ''}
          .
        </p>
      )}
      <p className="subtle" style={{ margin: 0, fontSize: '0.8125rem' }}>
        {result.ms.toFixed(1)} ms
        {result.results.length > 1
          ? ` · ${result.results.length} result sets, showing the last`
          : ''}
      </p>
    </div>
  )
}

/* -------------------------------------------------------------- playground */

const EXAMPLES: { label: string; sql: string }[] = [
  { label: 'Look at a table', sql: 'SELECT * FROM employees LIMIT 10;' },
  {
    label: 'Join and aggregate',
    sql: 'SELECT d.name, COUNT(*) AS people, AVG(e.salary) AS avg_salary\nFROM employees e\nJOIN departments d ON d.id = e.department_id\nGROUP BY d.name\nORDER BY avg_salary DESC;',
  },
  {
    label: 'Window function',
    sql: 'SELECT name, salary,\n       RANK() OVER (ORDER BY salary DESC) AS pay_rank\nFROM employees;',
  },
  {
    label: 'Requests per hour',
    sql: "SELECT strftime('%Y-%m-%d %H:00', ts) AS hour, COUNT(*) AS requests\nFROM web_logs\nGROUP BY hour\nORDER BY hour\nLIMIT 24;",
  },
  {
    label: 'Make your own table',
    sql: "CREATE TABLE notes (id INTEGER PRIMARY KEY, body TEXT);\nINSERT INTO notes (body) VALUES ('hello'), ('world');\nSELECT * FROM notes;",
  },
]

export function SqlPlaygroundPage() {
  const [sql, setSql] = useState(() => readJson<string[]>(HISTORY_KEY, [])[0] ?? EXAMPLES[1].sql)
  const [history, setHistory] = useState<string[]>(() => readJson<string[]>(HISTORY_KEY, []))
  const [result, setResult] = useState<ExecResult | null>(null)
  const [running, setRunning] = useState(false)
  const { tables, completion, refresh } = useSchema()

  const run = useCallback(async () => {
    const query = sql.trim()
    if (!query || running) return
    setRunning(true)
    const next = await sqlEngine.exec(query)
    setResult(next)
    setRunning(false)
    if (!next.error) {
      setHistory((previous) => {
        const updated = [query, ...previous.filter((entry) => entry !== query)].slice(
          0,
          HISTORY_LIMIT,
        )
        writeJson(HISTORY_KEY, updated)
        return updated
      })
    }
    // CREATE / DROP change what completion and the table list should offer.
    if (/\b(create|drop|alter)\b/i.test(query)) refresh()
  }, [sql, running, refresh])

  const reset = async () => {
    await sqlEngine.reset()
    setResult(null)
    refresh()
  }

  return (
    <div className="page stack">
      <header className="page-header">
        <h1>SQL playground</h1>
        <p className="page-header__meta">
          Real SQLite, running in your browser - it works offline. Ctrl+Enter (⌘+Enter) runs the
          query.
        </p>
      </header>
      <SqlTabs active="playground" />

      <details className="sql-schema">
        <summary>
          Sample data: {sqlDatasets.map((dataset) => dataset.title).join(', ')} · {tables.length}{' '}
          tables
        </summary>
        <div className="sql-schema__tables">
          {tables.map((table) => (
            <div key={table.name} className="sql-schema__table">
              <strong>{table.name}</strong> <span className="subtle">{table.rows} rows</span>
              <p className="sql-schema__columns">
                {table.columns.map((column) => (
                  <code key={column.name} title={column.type}>
                    {column.name}
                  </code>
                ))}
              </p>
            </div>
          ))}
        </div>
      </details>

      <div className="code-block sql-editor-block">
        <div className="code-block__header">
          <span className="code-block__title">query.sql</span>
          <select
            className="select playground__examples"
            aria-label="Load an example query"
            value=""
            onChange={(event) => {
              const example = EXAMPLES.find((entry) => entry.label === event.target.value)
              if (example) setSql(example.sql)
            }}
          >
            <option value="">Examples…</option>
            {EXAMPLES.map((example) => (
              <option key={example.label}>{example.label}</option>
            ))}
          </select>
        </div>
        <CodeEditor
          value={sql}
          onChange={setSql}
          onRun={() => void run()}
          language={sqlLanguage({ dialect: SQLite, schema: completion, upperCaseKeywords: true })}
          languageKey={JSON.stringify(completion)}
          placeholder="SELECT * FROM employees"
          label="SQL query"
        />
      </div>

      <div className="row">
        <button
          type="button"
          className="btn"
          onClick={() => void run()}
          disabled={running || !sql.trim()}
        >
          ▶ Run
        </button>
        <button
          type="button"
          className="btn btn--secondary"
          onClick={() => void reset()}
          disabled={running}
        >
          Reset sample data
        </button>
      </div>

      <section aria-label="Result" aria-live="polite">
        <ResultView result={result} running={running} />
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
                  onClick={() => setSql(entry)}
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

/* -------------------------------------------------------------- challenges */

export function SqlChallengesPage() {
  const { state } = useProgress()
  const solved = sqlChallenges.filter((c) => state.challenges[sqlChallengeKey(c.id)]?.solvedAt)

  return (
    <div className="page stack-lg">
      <header className="page-header">
        <h1>SQL challenges</h1>
        <p className="page-header__meta">
          {sqlChallenges.length} problems on the sample data, from joins to recursive CTEs and the
          interview classics. Write a query, then press Check.
        </p>
      </header>
      <SqlTabs active="challenges" />
      <ProgressBar
        value={(solved.length / sqlChallenges.length) * 100}
        label={`${solved.length} of ${sqlChallenges.length} solved`}
        showValue
      />
      {topics.map((topic) => {
        const list = sqlChallenges.filter((challenge) => challenge.topic === topic)
        if (list.length === 0) return null
        return (
          <section key={topic} className="stack-sm" aria-labelledby={`topic-${topic}`}>
            <h2 id={`topic-${topic}`} style={{ margin: 0, fontSize: '1.1rem' }}>
              {sqlTopicLabel[topic]}
            </h2>
            <ul className="sql-challenge-list">
              {list.map((challenge) => {
                const progress = state.challenges[sqlChallengeKey(challenge.id)]
                return (
                  <li key={challenge.id}>
                    <Link className="sql-challenge-link" to={`/sql/challenges/${challenge.id}`}>
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

export function SqlChallengePage() {
  const { challengeId = '' } = useParams<{ challengeId: string }>()
  const challenge = sqlChallengeById.get(challengeId)
  if (!challenge) {
    return (
      <div className="page stack">
        <EmptyState
          icon="🧩"
          title="No such challenge"
          action={
            <Link className="btn" to="/sql/challenges">
              All challenges
            </Link>
          }
        />
      </div>
    )
  }
  // Keyed so moving to the next challenge starts with fresh state.
  return <ChallengeView key={challenge.id} challenge={challenge} />
}

const starterFor = (challenge: SqlChallenge) =>
  `-- ${challenge.title}\n-- Return: ${challenge.expected.columns.join(', ')}\n\n`

function ChallengeView({ challenge }: { challenge: SqlChallenge }) {
  const { state, recordChallengeCheck } = useProgress()
  const key = sqlChallengeKey(challenge.id)
  const progress = state.challenges[key]
  const solved = Boolean(progress?.solvedAt)
  const failures = progress?.failures ?? 0
  const unlocked = solved || failures >= SOLUTION_AFTER_FAILURES

  const draftKey = `${DRAFT_KEY}.${challenge.id}`
  const [sql, setSql] = useState(
    () => readJson<string | null>(draftKey, null) ?? starterFor(challenge),
  )
  const [result, setResult] = useState<ExecResult | null>(null)
  const [outcome, setOutcome] = useState<CheckOutcome | null>(null)
  const [running, setRunning] = useState(false)
  const [hintsShown, setHintsShown] = useState(0)
  const [showSolution, setShowSolution] = useState(false)
  const { completion } = useSchema()

  useEffect(() => writeJson(draftKey, sql), [draftKey, sql])

  const execute = async (check: boolean) => {
    if (running || !sql.trim()) return
    setRunning(true)
    const next = await sqlEngine.exec(sql, 'challenge', challenge.setup)
    setResult(next)
    setRunning(false)
    if (!check) {
      setOutcome(null)
      return
    }
    const verdict: CheckOutcome = next.error
      ? { ok: false, reason: 'The query has an error - fix it first.' }
      : compareResults(
          next.results[next.results.length - 1] ?? null,
          challenge.expected,
          challenge.ordered,
        )
    setOutcome(verdict)
    recordChallengeCheck(key, verdict.ok)
  }

  const index = sqlChallenges.indexOf(challenge)
  const next = sqlChallenges[index + 1]
  const hints = unlocked ? challenge.hints.length : hintsShown

  return (
    <div className="page stack">
      <header className="page-header">
        <nav className="breadcrumbs" aria-label="Breadcrumb">
          <Link to="/sql">SQL playground</Link>
          <span aria-hidden="true">/</span>
          <Link to="/sql/challenges">Challenges</Link>
          <span aria-hidden="true">/</span>
          <span>{challenge.title}</span>
        </nav>
        <h1>{challenge.title}</h1>
        <div className="page-header__meta">
          <Badge tone={difficultyTone[challenge.difficulty]}>{challenge.difficulty}</Badge>
          <Badge>{sqlTopicLabel[challenge.topic]}</Badge>
          {solved && <Badge tone="success">✓ Solved</Badge>}
          <span className="subtle">
            {index + 1} of {sqlChallenges.length}
          </span>
        </div>
      </header>

      <div className="card stack-sm">
        <p style={{ margin: 0 }}>
          <RichText text={challenge.description} />
        </p>
        <p className="subtle" style={{ margin: 0 }}>
          Expected: {challenge.expected.columns.length} columns (
          <code>{challenge.expected.columns.join(', ')}</code>), {challenge.expected.rows.length}{' '}
          {challenge.expected.rows.length === 1 ? 'row' : 'rows'}.{' '}
          {challenge.ordered ? 'Row order matters.' : 'Row order does not matter.'} Column names
          don&rsquo;t have to match.
        </p>
      </div>

      <div className="code-block sql-editor-block">
        <div className="code-block__header">
          <span className="code-block__title">solution.sql</span>
          <button
            type="button"
            className="btn btn--ghost btn--sm"
            onClick={() => setSql(starterFor(challenge))}
          >
            Start over
          </button>
        </div>
        <CodeEditor
          value={sql}
          onChange={setSql}
          onRun={() => void execute(true)}
          language={sqlLanguage({ dialect: SQLite, schema: completion, upperCaseKeywords: true })}
          languageKey={JSON.stringify(completion)}
          placeholder="SELECT * FROM employees"
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
        Ctrl+Enter checks. Run shows your result without checking it.
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
                <Link className="btn btn--sm" to={`/sql/challenges/${next.id}`}>
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
        <ResultView result={result} running={running} />
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
              <CodeBlock code={challenge.solution} language="sql" title="Reference solution" />
              <SqlResultTable
                result={challenge.expected}
                caption={`Expected result for ${challenge.title}`}
              />
            </>
          )}
        </section>
      )}
    </div>
  )
}
