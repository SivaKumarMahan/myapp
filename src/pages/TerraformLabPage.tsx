import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { CSSProperties, KeyboardEvent, MutableRefObject } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { CodeEditor } from '../components/CodeEditor'
import { Badge } from '../components/ui/Badge'
import { CodeBlock } from '../components/ui/CodeBlock'
import { RichText } from '../components/ui/RichText'
import { interviewQuestionById } from '../content/interview'
import {
  sandboxSeed,
  tfCategories,
  tfKey,
  tfScenarioById,
  tfScenarios,
  type TfCategory,
  type TfLevel,
  type TfScenario,
  type TfStep,
} from '../content/tflab'
import { checkScenario, isCorrectAnswer, replay, type TfCheckReport } from '../lib/tflab/checks'
import { armOf, complete, runCommand, type ShellSession } from '../lib/tflab/commands'
import {
  clone,
  createEnv,
  renderStateInstance,
  type CloudResource,
  type EnvData,
} from '../lib/tflab/engine'
import { hclLanguage } from '../lib/tflab/hcl-mode'
import { schemas } from '../lib/tflab/provider'
import { loadTfStore, saveTfStore, type TfLabStore } from '../lib/tflab/store'
import { useProgress } from '../lib/use-progress'

const SANDBOX = 'sandbox'
const MAX_LINES = 1500
const PROMPT = 'you@tf-lab:~/infra$'

type LineKind = 'out' | 'err' | 'info'
interface Line {
  id: number
  kind: LineKind
  text: string
  prompt?: string
  tone?: 'add' | 'remove' | 'change'
}

/** One terminal per scenario, kept while the app is open. */
interface Session {
  env: EnvData
  shell: ShellSession
  scroll: Line[]
  history: string[]
  awaiting: string | null
}

let nextLineId = 1
const line = (kind: LineKind, text: string, prompt?: string): Line => ({
  id: nextLineId++,
  kind,
  text,
  ...(prompt ? { prompt } : {}),
})

/** Splits command output into lines, marking plan symbols for colour. */
function outputLines(text: string, error: boolean): Line[] {
  return text
    .replace(/\n$/, '')
    .split('\n')
    .map((entry) => {
      const result = line(error ? 'err' : 'out', entry)
      if (/^\s*(\+|\+\/-) /.test(entry) || /^Apply complete!/.test(entry)) result.tone = 'add'
      else if (/^\s*(-|-\/\+) /.test(entry) || /^│ Error/.test(entry)) result.tone = 'remove'
      else if (/^\s*~ /.test(entry)) result.tone = 'change'
      return result
    })
}

const TONE: Record<NonNullable<Line['tone']>, CSSProperties> = {
  add: { color: 'var(--success)' },
  remove: { color: 'var(--danger)' },
  change: { color: 'var(--warning, #b7791f)' },
}

const sessions = new Map<string, Session>()

const WELCOME =
  'Terraform plan & state lab - a pretend Terraform + Azure environment. Nothing leaves your browser.\nType help for the commands. Start with terraform plan.'

const seedFor = (id: string) =>
  id === SANDBOX ? sandboxSeed : (tfScenarioById.get(id)?.seed ?? sandboxSeed)

function newSession(id: string, saved?: EnvData): Session {
  let env: EnvData
  try {
    env =
      saved && saved.version === 1 && saved.files && saved.state ? saved : createEnv(seedFor(id))
  } catch {
    env = createEnv(seedFor(id))
  }
  return {
    env,
    shell: { pending: null },
    scroll: [line('info', WELCOME)],
    history: [],
    awaiting: null,
  }
}

function sessionFor(id: string, store: TfLabStore): Session {
  let session = sessions.get(id)
  if (!session) {
    session = newSession(id, store.envs[id])
    sessions.set(id, session)
  }
  return session
}

const LEVEL_LABEL: Record<TfLevel, string> = {
  simple: 'Simple',
  medium: 'Medium',
  advanced: 'Advanced',
}

const isSolved = (
  store: TfLabStore,
  challenges: Record<string, { solvedAt?: number }>,
  id: string,
) => Boolean(store.solvedAt[id] || challenges[tfKey(id)]?.solvedAt)

/* ---------- the scenario list ---------- */

function ScenarioList({
  selected,
  onSelect,
  store,
}: {
  selected: string
  onSelect: (id: string) => void
  store: TfLabStore
}) {
  const { state } = useProgress()
  const [category, setCategory] = useState<TfCategory | 'all'>('all')
  const [status, setStatus] = useState<'all' | 'todo' | 'solved'>('all')
  const visible = tfScenarios.filter(
    (scenario) =>
      (category === 'all' || scenario.category === category) &&
      (status === 'all' ||
        (status === 'solved') === isSolved(store, state.challenges, scenario.id)),
  )
  return (
    <nav className="linux-list stack-sm" aria-label="Scenarios">
      <button
        type="button"
        className={`linux-item${selected === SANDBOX ? ' is-active' : ''}`}
        aria-current={selected === SANDBOX ? 'true' : undefined}
        onClick={() => onSelect(SANDBOX)}
      >
        <span className="linux-item__title">🧪 Sandbox (free play)</span>
      </button>
      <label className="field">
        <span className="field__label">Category</span>
        <select
          className="select"
          value={category}
          onChange={(event) => setCategory(event.target.value as TfCategory | 'all')}
        >
          <option value="all">All categories</option>
          {tfCategories.map((entry) => (
            <option key={entry} value={entry}>
              {entry}
            </option>
          ))}
        </select>
      </label>
      <div className="chip-row" role="group" aria-label="Status">
        {(['all', 'todo', 'solved'] as const).map((entry) => (
          <button
            key={entry}
            type="button"
            className="chip"
            aria-pressed={status === entry}
            onClick={() => setStatus(entry)}
          >
            {entry === 'all' ? 'All' : entry === 'todo' ? 'To do' : 'Solved'}
          </button>
        ))}
      </div>
      <p className="subtle" style={{ margin: 0 }}>
        {visible.length} of {tfScenarios.length}
      </p>
      <ul className="linux-list__items">
        {visible.map((scenario) => (
          <li key={scenario.id}>
            <button
              type="button"
              className={`linux-item${selected === scenario.id ? ' is-active' : ''}`}
              aria-current={selected === scenario.id ? 'true' : undefined}
              onClick={() => onSelect(scenario.id)}
            >
              <span className="linux-item__title">
                {isSolved(store, state.challenges, scenario.id) && (
                  <span aria-label="solved">✓ </span>
                )}
                {scenario.title}
              </span>
              <span className="linux-item__meta subtle">
                {scenario.category} · {LEVEL_LABEL[scenario.level]}
              </span>
            </button>
          </li>
        ))}
      </ul>
    </nav>
  )
}

/* ---------- the task panel ---------- */

function Results({ report }: { report: TfCheckReport }) {
  return (
    <div
      className={`linux-results stack-sm${report.passed ? ' is-pass' : ' is-fail'}`}
      role="status"
    >
      <strong>
        {report.passed
          ? '✅ Fixed - the plan is clean and nothing was destroyed. One last question below.'
          : '❌ Not yet. Here is what is still wrong:'}
      </strong>
      <ul className="cli-checks">
        {report.results.map((result) => (
          <li key={result.label} className={result.passed ? 'cli-check--pass' : 'cli-check--todo'}>
            <span aria-hidden="true">{result.passed ? '✓' : '✗'}</span> {result.label}
            {result.messages.length > 0 && (
              <ul className="linux-results__messages">
                {result.messages.map((message) => (
                  <li key={message}>{message}</li>
                ))}
              </ul>
            )}
          </li>
        ))}
      </ul>
    </div>
  )
}

function Steps({ steps }: { steps: TfStep[] }) {
  return (
    <div className="stack-sm">
      {steps.map((step, index) =>
        step.kind === 'run' ? (
          <CodeBlock key={index} code={step.command} language="bash" title={`${index + 1}. Run`} />
        ) : step.kind === 'write' ? (
          <CodeBlock
            key={index}
            code={step.content}
            language="hcl"
            title={`${index + 1}. Set ${step.path} to`}
          />
        ) : (
          <p key={index} style={{ margin: 0 }}>
            {index + 1}. Delete <code>{step.path}</code>
          </p>
        ),
      )}
    </div>
  )
}

function Question({
  scenario,
  store,
  onAnswer,
}: {
  scenario: TfScenario
  store: TfLabStore
  onAnswer: (index: number) => void
}) {
  const answered = store.answers[scenario.id]
  const [choice, setChoice] = useState<number | null>(answered ?? null)
  const shown = answered !== undefined ? scenario.question.options[answered] : null
  const right = answered !== undefined && isCorrectAnswer(scenario, answered)
  return (
    <fieldset className="card stack-sm">
      <legend>
        <strong>🎯 Root cause</strong>
      </legend>
      <p style={{ margin: 0 }}>
        <RichText text={scenario.question.prompt} />
      </p>
      <div className="stack-sm" role="radiogroup" aria-label="Answers">
        {scenario.question.options.map((option, index) => (
          <label
            key={option.text}
            className="row"
            style={{ alignItems: 'flex-start', gap: '0.5rem' }}
          >
            <input
              type="radio"
              name={`tf-answer-${scenario.id}`}
              checked={choice === index}
              onChange={() => setChoice(index)}
            />
            <span>
              <RichText text={option.text} />
            </span>
          </label>
        ))}
      </div>
      <div className="button-row">
        <button
          type="button"
          className="btn btn--sm"
          disabled={choice === null}
          onClick={() => choice !== null && onAnswer(choice)}
        >
          Submit answer
        </button>
      </div>
      {shown && (
        <p
          className={`linux-results ${right ? 'is-pass' : 'is-fail'}`}
          role="status"
          style={{ margin: 0 }}
        >
          <strong>{right ? '✅ Correct - scenario solved.' : '❌ Not quite.'}</strong>{' '}
          <RichText text={shown.why} />
        </p>
      )}
    </fieldset>
  )
}

function TaskPanel({
  scenario,
  store,
  update,
  onRun,
  onCheck,
  onAnswer,
  report,
}: {
  scenario: TfScenario
  store: TfLabStore
  update: (change: (store: TfLabStore) => TfLabStore) => void
  onRun: (command: string) => void
  onCheck: () => void
  onAnswer: (index: number) => void
  report: TfCheckReport | null
}) {
  const { state } = useProgress()
  const hints = store.hints[scenario.id] ?? 0
  const solved = isSolved(store, state.challenges, scenario.id)
  const related = scenario.related
    .map((id) => interviewQuestionById.get(id))
    .filter((entry) => entry !== undefined)
  return (
    <section className="card stack-sm linux-task" aria-labelledby="tf-task-title">
      <div className="row">
        <Badge>{scenario.category}</Badge>
        <Badge tone={scenario.level === 'simple' ? 'info' : 'warning'}>
          {LEVEL_LABEL[scenario.level]}
        </Badge>
        {solved && <Badge tone="success">✓ Solved</Badge>}
      </div>
      <h2 id="tf-task-title" className="card__title">
        {scenario.title}
      </h2>
      <p style={{ margin: 0 }}>
        <RichText text={scenario.story} />
      </p>
      <div className="linux-task__task">
        <strong>Task</strong>
        <p style={{ margin: 0 }}>
          <RichText text={scenario.task} />
        </p>
      </div>
      <div className="row linux-files" aria-label="Commands to try">
        <span className="subtle">Try:</span>
        {scenario.lookAt.map((command) => (
          <button
            key={command}
            type="button"
            className="btn btn--ghost btn--sm"
            onClick={() => onRun(command)}
          >
            {command}
          </button>
        ))}
      </div>

      <div className="stack-sm">
        {scenario.hints.slice(0, hints).map((hint, index) => (
          <p key={hint} className="linux-hint" style={{ margin: 0 }}>
            💡 Hint {index + 1}: <RichText text={hint} />
          </p>
        ))}
        <div className="button-row">
          <button type="button" className="btn btn--sm" onClick={onCheck}>
            Check my fix
          </button>
          {hints < 3 && (
            <button
              type="button"
              className="btn btn--secondary btn--sm"
              onClick={() =>
                update((current) => ({
                  ...current,
                  hints: { ...current.hints, [scenario.id]: hints + 1 },
                }))
              }
            >
              Show hint {hints + 1} of 3
            </button>
          )}
        </div>
        <p className="subtle" style={{ margin: 0 }}>
          Checking looks at the result, not the commands: a fresh plan must be clean, state must
          track the right addresses, the code must still do the job - and every Azure resource must
          be the same object it was at the start, not a recreated copy.
        </p>
      </div>

      {report && <Results report={report} />}
      {(store.checkedAt[scenario.id] || solved) && (
        <Question key={scenario.id} scenario={scenario} store={store} onAnswer={onAnswer} />
      )}

      <details className="reveal">
        <summary className="reveal__summary">
          <span aria-hidden="true">🔧</span> Show solution
        </summary>
        <div className="stack-sm">
          <Steps steps={scenario.solution} />
          {scenario.alternative && (
            <>
              <strong>{scenario.alternative.label}</strong>
              <Steps steps={scenario.alternative.steps} />
            </>
          )}
          <table className="linux-explain">
            <caption className="subtle">Step by step</caption>
            <tbody>
              {scenario.explanation.map((step) => (
                <tr key={step.code}>
                  <th scope="row">
                    <code>{step.code}</code>
                  </th>
                  <td>
                    <RichText text={step.note} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="subtle" style={{ margin: 0 }}>
            Tempting but wrong:{' '}
            {scenario.wrongFixes.map((fix) => fix.label.toLowerCase()).join('; ')}.
          </p>
        </div>
      </details>

      <div className="linux-followup">
        <strong>🎤 Interview follow-up</strong>
        <p style={{ margin: 0 }}>
          <RichText text={scenario.followUp} />
        </p>
      </div>
      {related.length > 0 && (
        <div className="stack-sm">
          <strong>Related questions</strong>
          <ul className="role-list">
            {related.map(({ question, topic }) => (
              <li key={question.id}>
                <Link to={`/interview/${topic.id}#${question.id}`}>
                  {question.prompt.replace(/[`*]/g, '')}
                </Link>{' '}
                <span className="subtle">· {topic.title}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  )
}

function SandboxPanel() {
  return (
    <section className="card stack-sm linux-task">
      <h2 className="card__title">🧪 Sandbox</h2>
      <p style={{ margin: 0 }}>
        Free play on a small, already-applied environment: a resource group, a VNet with two subnets
        (for_each) and a storage account. Break things - <strong>Reset scenario</strong> brings it
        back.
      </p>
      <ul className="role-list">
        <li>
          Rename a resource and add a <code>moved</code> block; change <code>location</code> and
          read the <code># forces replacement</code> line
        </li>
        <li>
          A key vault <code>kv-tflab-portal</code> was made in the portal - write its code and adopt
          it with an <code>import</code> block
        </li>
        <li>
          Try <code>terraform state list</code>, <code>state show</code>, <code>state mv</code>,{' '}
          <code>plan -out=tfplan</code>, <code>apply tfplan</code>,{' '}
          <code>az resource list -o table</code>
        </li>
      </ul>
      <p className="subtle" style={{ margin: 0 }}>
        Type <code>help</code> in the terminal for every command.
      </p>
    </section>
  )
}

/* ---------- terminal, files, state and portal ---------- */

type Tab = 'terminal' | 'files' | 'state' | 'portal'

function Workbench({
  id,
  store,
  persist,
  tab,
  setTab,
  runRef,
  onReset,
}: {
  id: string
  store: TfLabStore
  persist: (env: EnvData) => void
  tab: Tab
  setTab: (tab: Tab) => void
  runRef: MutableRefObject<((command: string) => void) | null>
  onReset: () => void
}) {
  const [session, setSession] = useState<Session>(() => sessionFor(id, store))
  const [scroll, setScroll] = useState<Line[]>(session.scroll)
  const [input, setInput] = useState('')
  const [cursor, setCursor] = useState<number | null>(null)
  const [awaiting, setAwaiting] = useState<string | null>(session.awaiting)
  const [, setTick] = useState(0)
  const [file, setFile] = useState(() =>
    session.env.files['main.tf'] !== undefined
      ? 'main.tf'
      : (Object.keys(session.env.files)[0] ?? ''),
  )
  const [newFile, setNewFile] = useState('')
  const inputRef = useRef<HTMLInputElement | null>(null)
  const logRef = useRef<HTMLDivElement | null>(null)
  const env = session.env

  useEffect(() => {
    session.scroll = scroll
    const log = logRef.current
    if (log) log.scrollTop = log.scrollHeight
  }, [scroll, session])

  const append = useCallback(
    (entries: Line[]) => setScroll((current) => [...current, ...entries].slice(-MAX_LINES)),
    [],
  )

  const execute = useCallback(
    (command: string) => {
      const trimmed = command.trim()
      const prompt = session.awaiting ? '  Enter a value:' : PROMPT
      if (!session.awaiting && trimmed && session.history[session.history.length - 1] !== command)
        session.history.push(command)
      if (!session.awaiting && trimmed === 'clear') {
        setScroll([])
        return
      }
      if (!session.awaiting && trimmed === 'history') {
        append([
          line('out', command, prompt),
          line(
            'out',
            session.history
              .map((entry, index) => `${String(index + 1).padStart(5)}  ${entry}`)
              .join('\n'),
          ),
        ])
        return
      }
      const result = runCommand(session.env, session.shell, command)
      session.awaiting = result.awaiting ?? null
      setAwaiting(session.awaiting)
      append([
        line('out', command, prompt),
        ...(result.output ? outputLines(result.output, result.error) : []),
      ])
      persist(session.env)
      setTick((value) => value + 1)
    },
    [append, persist, session],
  )

  useEffect(() => {
    runRef.current = (command: string) => {
      setTab('terminal')
      execute(command)
    }
    return () => {
      runRef.current = null
    }
  }, [execute, runRef, setTab])

  const submit = () => {
    const command = input
    setInput('')
    setCursor(null)
    execute(command)
  }

  const walk = (step: number) => {
    const past = session.history
    if (past.length === 0) return
    const position = cursor === null ? (step < 0 ? past.length - 1 : null) : cursor + step
    if (position === null || position >= past.length) {
      setCursor(null)
      setInput('')
    } else {
      const clamped = Math.max(0, position)
      setCursor(clamped)
      setInput(past[clamped])
    }
  }

  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') {
      event.preventDefault()
      submit()
    } else if (event.key === 'ArrowUp' || event.key === 'ArrowDown') {
      event.preventDefault()
      walk(event.key === 'ArrowUp' ? -1 : 1)
    } else if (event.key === 'Tab' && input.trim()) {
      event.preventDefault()
      const result = complete(env, input)
      setInput(result.input)
      if (result.options.length) append([line('info', result.options.join('   '))])
    } else if (event.key === 'l' && event.ctrlKey) {
      event.preventDefault()
      setScroll([])
    }
  }

  const reset = () => {
    const fresh = newSession(id)
    sessions.set(id, fresh)
    setSession(fresh)
    setAwaiting(null)
    setScroll([
      ...fresh.scroll,
      line('info', 'Scenario reset: files, state and Azure are back to the start.'),
    ])
    setFile('main.tf')
    persist(fresh.env)
    onReset()
  }

  const files = Object.keys(env.files).sort()
  const current = env.files[file] !== undefined ? file : (files[0] ?? '')
  const editFile = (value: string) => {
    if (!current) return
    env.files[current] = value
    persist(env)
  }
  const addFile = () => {
    const name = newFile.trim().replace(/^\.\//, '')
    if (!/^[\w./-]+\.(tf|tfvars)$/.test(name)) return
    if (env.files[name] === undefined) env.files[name] = ''
    setFile(name)
    setNewFile('')
    persist(env)
    setTick((value) => value + 1)
  }
  const deleteFile = () => {
    if (!current) return
    delete env.files[current]
    setFile('main.tf')
    persist(env)
    setTick((value) => value + 1)
  }

  const groups = useMemo(() => {
    const byGroup = new Map<string, CloudResource[]>()
    for (const resource of Object.values(env.cloud)) {
      const rg = String(
        resource.type === 'azurerm_resource_group'
          ? resource.attrs.name
          : resource.attrs.resource_group_name,
      )
      byGroup.set(rg, [...(byGroup.get(rg) ?? []), resource])
    }
    return [...byGroup.entries()].sort(([a], [b]) => a.localeCompare(b))
    // the environment object is mutated in place; scroll changes after every command
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [env, scroll, tab])

  return (
    <section className="linux-bench stack-sm" aria-label="Terminal and files">
      <div className="linux-tabs">
        <div className="chip-row" role="group" aria-label="Workbench">
          {(
            [
              ['terminal', 'Terminal'],
              ['files', 'Files'],
              ['state', `State (${env.state.resources.length})`],
              ['portal', 'Azure portal'],
            ] as const
          ).map(([key, label]) => (
            <button
              key={key}
              type="button"
              className="chip"
              aria-pressed={tab === key}
              onClick={() => setTab(key)}
            >
              {label}
              {key === 'state' && env.lock && <span className="linux-dot" aria-label="locked" />}
            </button>
          ))}
        </div>
        <button type="button" className="btn btn--ghost btn--sm linux-tabs__reset" onClick={reset}>
          Reset scenario
        </button>
      </div>

      {tab === 'terminal' && (
        <div className="cli-terminal">
          <div
            className="cli-terminal__log"
            ref={logRef}
            role="log"
            aria-live="polite"
            onClick={() => inputRef.current?.focus()}
          >
            {scroll.map((entry) => (
              <div
                key={entry.id}
                className={`cli-line cli-line--${entry.kind}${entry.prompt ? ' cli-line--echo' : ''}`}
                style={entry.tone ? TONE[entry.tone] : undefined}
              >
                {entry.prompt && <span className="cli-prompt">{entry.prompt} </span>}
                {entry.text}
              </div>
            ))}
            <div className="cli-input-row">
              <label className="cli-prompt" htmlFor="tf-input">
                {awaiting ? `  ${awaiting}` : PROMPT}
              </label>
              <input
                id="tf-input"
                ref={inputRef}
                className="cli-input"
                value={input}
                onChange={(event) => setInput(event.target.value)}
                onKeyDown={onKeyDown}
                autoComplete="off"
                autoCapitalize="off"
                autoCorrect="off"
                spellCheck={false}
                aria-label="Command"
              />
            </div>
          </div>
          <div className="cli-keys" aria-label="Terminal keys">
            <button
              type="button"
              className="btn btn--secondary btn--sm"
              onClick={() => walk(-1)}
              aria-label="Previous command"
            >
              ↑
            </button>
            <button
              type="button"
              className="btn btn--secondary btn--sm"
              onClick={() => walk(1)}
              aria-label="Next command"
            >
              ↓
            </button>
            <button
              type="button"
              className="btn btn--secondary btn--sm"
              onClick={() => {
                const result = complete(env, input)
                setInput(result.input)
                if (result.options.length) append([line('info', result.options.join('   '))])
              }}
            >
              Tab
            </button>
            <button type="button" className="btn btn--ghost btn--sm" onClick={() => setScroll([])}>
              Clear
            </button>
            <button type="button" className="btn btn--sm" onClick={submit}>
              Run ⏎
            </button>
          </div>
        </div>
      )}

      {tab === 'files' && (
        <div className="stack-sm">
          <div className="chip-row" role="group" aria-label="Files">
            {files.map((name) => (
              <button
                key={name}
                type="button"
                className="chip"
                aria-pressed={current === name}
                onClick={() => setFile(name)}
              >
                {name}
              </button>
            ))}
          </div>
          {current ? (
            <CodeEditor
              key={`${id}:${current}`}
              value={env.files[current] ?? ''}
              onChange={editFile}
              onRun={() => runRef.current?.('terraform plan')}
              language={hclLanguage}
              languageKey={`hcl:${current}`}
              label={`${current} contents`}
              minLines={18}
            />
          ) : (
            <p className="subtle">No files - add one below.</p>
          )}
          <div className="row linux-editor-bar">
            <label className="field">
              <span className="field__label">New file</span>
              <input
                className="search-input"
                value={newFile}
                placeholder="e.g. moved.tf"
                onChange={(event) => setNewFile(event.target.value)}
                spellCheck={false}
              />
            </label>
            <button type="button" className="btn btn--secondary btn--sm" onClick={addFile}>
              Add file
            </button>
            {current && current !== 'providers.tf' && (
              <button type="button" className="btn btn--ghost btn--sm" onClick={deleteFile}>
                Delete {current}
              </button>
            )}
          </div>
          <p className="subtle" style={{ margin: 0 }}>
            Changes are saved as you type, and every command sees the latest files. Ctrl+Enter runs
            terraform plan.
          </p>
        </div>
      )}

      {tab === 'state' && (
        <div className="stack-sm" aria-label="State">
          <p className="subtle" style={{ margin: 0 }}>
            Remote state <code>tfstate/{env.stateKey}</code> · serial {env.state.serial} ·{' '}
            {env.state.resources.length} object{env.state.resources.length === 1 ? '' : 's'}{' '}
            (read-only view - change it with terraform commands)
          </p>
          {env.lock && (
            <p className="linux-results is-fail" style={{ margin: 0 }}>
              🔒 Locked by {env.lock.who} since {env.lock.created} (ID <code>{env.lock.id}</code>)
            </p>
          )}
          {env.state.resources.map((instance) => (
            <details key={instance.addr} className="reveal">
              <summary className="reveal__summary">
                <code>{instance.addr}</code>
              </summary>
              <pre className="bot-evidence">{renderStateInstance(instance)}</pre>
            </details>
          ))}
        </div>
      )}

      {tab === 'portal' && (
        <div className="stack-sm" aria-label="Azure portal">
          <p className="subtle" style={{ margin: 0 }}>
            What really exists in the subscription (read-only). <strong>Created</strong> changes
            when a resource is destroyed and recreated, even with the same name.
          </p>
          {groups.map(([rg, resources]) => (
            <div key={rg} className="card stack-sm">
              <strong>📦 {rg}</strong>
              <ul className="role-list">
                {resources.map((resource) => (
                  <li key={resource.id}>
                    <details>
                      <summary>
                        <strong>{String(resource.attrs.name)}</strong>{' '}
                        <span className="subtle">
                          {schemas[resource.type].armType} · created {resource.createdAt} by{' '}
                          {resource.createdBy}
                          {resource.modifiedBy !== resource.createdBy ||
                          resource.modifiedAt !== resource.createdAt
                            ? ` · last changed ${resource.modifiedAt} by ${resource.modifiedBy}`
                            : ''}
                        </span>
                      </summary>
                      <pre className="bot-evidence">{JSON.stringify(armOf(resource), null, 2)}</pre>
                    </details>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}
    </section>
  )
}

/* ---------- self-test ---------- */

function SelfTest() {
  const [failures, setFailures] = useState<{ id: string; messages: string[] }[] | null>(null)
  const run = () => {
    const failed: { id: string; messages: string[] }[] = []
    for (const scenario of tfScenarios) {
      const report = checkScenario(scenario, replay(scenario, scenario.solution))
      if (!report.passed)
        failed.push({
          id: scenario.id,
          messages: report.results.flatMap((result) => result.messages),
        })
    }
    setFailures(failed)
  }
  return (
    <details className="reveal">
      <summary className="reveal__summary">
        <span aria-hidden="true">🧪</span> Self-test: run every reference solution
      </summary>
      <div className="stack-sm">
        <p className="subtle" style={{ margin: 0 }}>
          Replays the reference solution of all {tfScenarios.length} scenarios on fresh environments
          and runs the checks. Use it after editing a scenario.
        </p>
        <div className="button-row">
          <button type="button" className="btn btn--secondary btn--sm" onClick={run}>
            Run self-test
          </button>
        </div>
        {failures && (
          <p
            className={failures.length ? 'linux-results is-fail' : 'viz-ok'}
            role="status"
            style={{ margin: 0 }}
          >
            {failures.length === 0
              ? `✓ All ${tfScenarios.length} reference solutions pass.`
              : `${failures.length} failing: ${failures.map((entry) => `${entry.id} (${entry.messages.slice(0, 2).join(' / ')})`).join('; ')}`}
          </p>
        )}
      </div>
    </details>
  )
}

/* ---------- the page ---------- */

/** Terraform plan & state lab: fix broken plans in a pretend Terraform + Azure world. */
export function TerraformLabPage() {
  const { state, recordChallengeCheck } = useProgress()
  const [params, setParams] = useSearchParams()
  const [store, setStore] = useState<TfLabStore>(loadTfStore)
  const requested = params.get('s')
  const id =
    requested && (requested === SANDBOX || tfScenarioById.has(requested))
      ? requested
      : store.last && (store.last === SANDBOX || tfScenarioById.has(store.last))
        ? store.last
        : SANDBOX
  const scenario = id === SANDBOX ? null : (tfScenarioById.get(id) ?? null)
  const [tab, setTab] = useState<Tab>('terminal')
  const [report, setReport] = useState<TfCheckReport | null>(null)
  const runRef = useRef<((command: string) => void) | null>(null)

  const update = useCallback((change: (current: TfLabStore) => TfLabStore) => {
    setStore((current) => {
      const next = change(current)
      saveTfStore(next)
      return next
    })
  }, [])

  useEffect(() => {
    if (store.last !== id) update((current) => ({ ...current, last: id }))
  }, [id, store.last, update])

  const persist = useCallback(
    (env: EnvData) =>
      update((current) => ({ ...current, envs: { ...current.envs, [id]: clone(env) } })),
    [id, update],
  )

  const select = (next: string) => {
    setParams(next === SANDBOX ? {} : { s: next })
    setReport(null)
    setTab('terminal')
  }

  const solvedCount = tfScenarios.filter((entry) =>
    isSolved(store, state.challenges, entry.id),
  ).length

  const check = () => {
    if (!scenario) return
    const result = checkScenario(scenario, sessionFor(id, store).env)
    setReport(result)
    update((current) => ({
      ...current,
      attempts: { ...current.attempts, [scenario.id]: (current.attempts[scenario.id] ?? 0) + 1 },
      checkedAt:
        result.passed && !current.checkedAt[scenario.id]
          ? { ...current.checkedAt, [scenario.id]: Date.now() }
          : current.checkedAt,
    }))
    if (!result.passed) recordChallengeCheck(tfKey(scenario.id), false)
  }

  const answer = (index: number) => {
    if (!scenario) return
    const correct = isCorrectAnswer(scenario, index)
    update((current) => ({
      ...current,
      answers: { ...current.answers, [scenario.id]: index },
      solvedAt:
        correct && !current.solvedAt[scenario.id]
          ? { ...current.solvedAt, [scenario.id]: Date.now() }
          : current.solvedAt,
    }))
    recordChallengeCheck(tfKey(scenario.id), correct)
  }

  return (
    <div className="page page--wide stack">
      <header className="page-header">
        <h1>🏗️ Terraform plan &amp; state lab</h1>
        <p className="page-header__meta">
          A pretend Terraform + Azure environment with a problem in every scenario: renames that
          destroy production, drift, imports, ForceNew changes, stuck locks. Read the plan,
          investigate with terraform and az, fix the code or the state, apply - then name the root
          cause. Checked by outcome, offline, in your browser.
        </p>
        <div className="row">
          <Badge tone="success">
            Solved {solvedCount}/{tfScenarios.length}
          </Badge>
          <Badge tone="info">Terraform 1.16 · azurerm 4.x (simulated)</Badge>
        </div>
      </header>

      <div className="linux-layout">
        <ScenarioList selected={id} onSelect={select} store={store} />
        {scenario ? (
          <TaskPanel
            key={`task-${scenario.id}`}
            scenario={scenario}
            store={store}
            update={update}
            onRun={(command) => runRef.current?.(command)}
            onCheck={check}
            onAnswer={answer}
            report={report}
          />
        ) : (
          <SandboxPanel />
        )}
        <Workbench
          key={`bench-${id}`}
          id={id}
          store={store}
          persist={persist}
          tab={tab}
          setTab={setTab}
          runRef={runRef}
          onReset={() => {
            setReport(null)
            update((current) => ({ ...current, checkedAt: { ...current.checkedAt, [id]: 0 } }))
          }}
        />
      </div>

      <SelfTest />
    </div>
  )
}
