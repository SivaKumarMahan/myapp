import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { KeyboardEvent, MutableRefObject } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { StreamLanguage } from '@codemirror/language'
import { shell } from '@codemirror/legacy-modes/mode/shell'
import { CodeEditor } from '../components/CodeEditor'
import { Badge } from '../components/ui/Badge'
import { CodeBlock } from '../components/ui/CodeBlock'
import { RichText } from '../components/ui/RichText'
import { allInterviewQuestions } from '../content/interview'
import {
  linuxCategories,
  linuxChallengeById,
  linuxChallenges,
  linuxKey,
  type LabCategory,
  type LabChallenge,
} from '../content/linuxlab'
import { checkChallenge, type Attempt, type CheckReport, type Step } from '../lib/linuxlab/checks'
import { LinuxLab } from '../lib/linuxlab/lab'
import { loadLabStore, saveLabStore, type LinuxLabStore } from '../lib/linuxlab/store'
import { useProgress } from '../lib/use-progress'

const SANDBOX = 'sandbox'
const MAX_LINES = 800
const bashLanguage = StreamLanguage.define(shell)

type LineKind = 'out' | 'err' | 'info'
interface Line {
  id: number
  kind: LineKind
  text: string
  prompt?: string
}

/** One environment per challenge, kept while the app is open. */
interface Session {
  lab: Promise<LinuxLab>
  steps: Step[]
  scroll: Line[]
  history: string[]
}

let nextLineId = 1
const line = (kind: LineKind, text: string, prompt?: string): Line => ({
  id: nextLineId++,
  kind,
  text,
  ...(prompt ? { prompt } : {}),
})

const sessions = new Map<string, Session>()

const WELCOME =
  'Linux & Bash lab - a simulated Linux box (you are root on lab-01). Nothing leaves your browser.\nType help for the tools and hosts you can use. Alerts (mail, Slack) land in the Outbox tab.'

function newSession(): Session {
  return { lab: LinuxLab.create('main'), steps: [], scroll: [line('info', WELCOME)], history: [] }
}

function sessionFor(id: string): Session {
  let session = sessions.get(id)
  if (!session) {
    session = newSession()
    sessions.set(id, session)
  }
  return session
}

const HELP = `What you can use here
  Files       ls cat head tail less-free tools: grep sed awk cut sort uniq wc tr comm paste find xargs tar gzip sha256sum stat du df
  JSON        jq    Dates  date (frozen clock)    Scripts  bash script.sh args  (write them in the Script editor tab)
  System      ps top -bn1 free uptime nproc pgrep kill pkill fuser lsof ss systemctl service id useradd crontab
  Network     ping ssh scp nc curl getent nslookup dig host openssl s_client / x509
  Alerts      mail / mailx / sendmail and curl to a Slack webhook → Outbox tab
  Cloud       docker (images, image prune, rmi, ps)  kubectl (rollout status/undo, get)  az (resource list, group list, vm list)
Hosts         see /root/inventory.txt and /root/servers.txt - some are down, one refuses SSH, one rejects your key
Terminal      ↑/↓ history · Ctrl+L clear · Ctrl+C cancel line · clear · history · Reset environment button
Shell quirks  this is a JavaScript bash, not GNU bash:
  - quote key=value items inside array literals: opts=("-o" "BatchMode=yes")
  - assign $(cmd < "$file") to a variable before using it inside $(( ))
  - no interactive programs (vim, less, top without -b, ssh without a command)`

const LEVEL_LABEL: Record<LabChallenge['level'], string> = { simple: 'Simple', medium: 'Medium' }
const TYPE_LABEL: Record<LabChallenge['type'], string> = {
  command: '⌨ Command',
  script: '📜 Script',
  bugfix: '🐞 Bug fix',
}

const shortCwd = (cwd: string) =>
  cwd === '/root' ? '~' : cwd.startsWith('/root/') ? `~${cwd.slice(5)}` : cwd
const promptFor = (cwd: string) => `root@lab-01:${shortCwd(cwd)}#`
const quoteArg = (value: string) =>
  /^[\w./:=@%+-]+$/.test(value) ? value : `'${value.replace(/'/g, `'\\''`)}'`

function argsText(args: string[] | { main: string[]; hidden: string[] }) {
  const list = Array.isArray(args) ? args : args.main
  return list.length ? list.map(quoteArg).join(' ') : '(no arguments)'
}

const attemptFor = (challenge: LabChallenge, steps: Step[], draft: string): Attempt =>
  challenge.type === 'command' ? { steps } : { script: draft }

const TEMPLATE = (name: string) => `#!/usr/bin/env bash
# ${name}
set -euo pipefail

`

/** In-app interview questions that share words with the challenge. */
function useRelatedQuestions(challenge: LabChallenge | null) {
  return useMemo(() => {
    if (!challenge) return []
    const words = new Set(
      challenge.tags.map((tag) => tag.toLowerCase()).filter((tag) => tag.length > 2),
    )
    const pool = allInterviewQuestions.filter(({ topic }) =>
      /linux|shell|docker|kubernetes|monitoring|ops/.test(topic.id),
    )
    return pool
      .map((entry) => {
        const text = `${entry.question.prompt} ${entry.question.tags.join(' ')}`.toLowerCase()
        const score = [...words].filter((word) =>
          new RegExp(`\\b${word.replace(/[^\w]/g, '')}\\b`).test(text),
        ).length
        return { entry, score }
      })
      .filter(({ score }) => score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 3)
      .map(({ entry }) => entry)
  }, [challenge])
}

/* ---------- the challenge list ---------- */

function ChallengeList({
  selected,
  onSelect,
  store,
}: {
  selected: string
  onSelect: (id: string) => void
  store: LinuxLabStore
}) {
  const { state } = useProgress()
  const [category, setCategory] = useState<LabCategory | 'all'>('all')
  const [level, setLevel] = useState<'all' | LabChallenge['level']>('all')
  const [status, setStatus] = useState<'all' | 'todo' | 'solved'>('all')
  const solved = (id: string) =>
    Boolean(store.solvedAt[id] || state.challenges[linuxKey(id)]?.solvedAt)
  const visible = linuxChallenges.filter(
    (challenge) =>
      (category === 'all' || challenge.category === category) &&
      (level === 'all' || challenge.level === level) &&
      (status === 'all' || (status === 'solved') === solved(challenge.id)),
  )
  return (
    <nav className="linux-list stack-sm" aria-label="Challenges">
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
          onChange={(event) => setCategory(event.target.value as LabCategory | 'all')}
        >
          <option value="all">All categories</option>
          {linuxCategories.map((entry) => (
            <option key={entry} value={entry}>
              {entry}
            </option>
          ))}
        </select>
      </label>
      <div className="chip-row" role="group" aria-label="Level">
        {(['all', 'simple', 'medium'] as const).map((entry) => (
          <button
            key={entry}
            type="button"
            className="chip"
            aria-pressed={level === entry}
            onClick={() => setLevel(entry)}
          >
            {entry === 'all' ? 'All levels' : LEVEL_LABEL[entry]}
          </button>
        ))}
      </div>
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
        {visible.length} of {linuxChallenges.length}
      </p>
      <ul className="linux-list__items">
        {visible.map((challenge) => (
          <li key={challenge.id}>
            <button
              type="button"
              className={`linux-item${selected === challenge.id ? ' is-active' : ''}`}
              aria-current={selected === challenge.id ? 'true' : undefined}
              onClick={() => onSelect(challenge.id)}
            >
              <span className="linux-item__title">
                {solved(challenge.id) && <span aria-label="solved">✓ </span>}
                {challenge.title}
              </span>
              <span className="linux-item__meta subtle">
                {challenge.category} · {LEVEL_LABEL[challenge.level]} · {TYPE_LABEL[challenge.type]}
              </span>
            </button>
          </li>
        ))}
      </ul>
    </nav>
  )
}

/* ---------- the task panel ---------- */

function Results({ report }: { report: CheckReport }) {
  return (
    <div
      className={`linux-results stack-sm${report.passed ? ' is-pass' : ' is-fail'}`}
      role="status"
    >
      <strong>
        {report.passed
          ? '✅ Solved - it works on your data and on the hidden variant.'
          : '❌ Not yet. Here is what differs:'}
      </strong>
      <ul className="cli-checks">
        {report.results.map((result) => (
          <li
            key={`${result.variant}-${result.label}`}
            className={result.passed ? 'cli-check--pass' : 'cli-check--todo'}
          >
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

function TaskPanel({
  challenge,
  store,
  update,
  onLook,
  onCheck,
  checking,
  report,
}: {
  challenge: LabChallenge
  store: LinuxLabStore
  update: (change: (store: LinuxLabStore) => LinuxLabStore) => void
  onLook: (path: string) => void
  onCheck: () => void
  checking: boolean
  report: CheckReport | null
}) {
  const { state } = useProgress()
  const hints = store.hints[challenge.id] ?? 0
  const related = useRelatedQuestions(challenge)
  const solved = Boolean(
    store.solvedAt[challenge.id] || state.challenges[linuxKey(challenge.id)]?.solvedAt,
  )
  return (
    <section className="card stack-sm linux-task" aria-labelledby="linux-task-title">
      <div className="row">
        <Badge>{challenge.category}</Badge>
        <Badge tone={challenge.level === 'simple' ? 'info' : 'warning'}>
          {LEVEL_LABEL[challenge.level]}
        </Badge>
        <Badge>{TYPE_LABEL[challenge.type]}</Badge>
        {solved && <Badge tone="success">✓ Solved</Badge>}
      </div>
      <h2 id="linux-task-title" className="card__title">
        {challenge.title}
      </h2>
      <p style={{ margin: 0 }}>
        <RichText text={challenge.scenario} />
      </p>
      <div className="linux-task__task">
        <strong>Task</strong>
        <p style={{ margin: 0 }}>
          <RichText text={challenge.task} />
        </p>
      </div>
      {challenge.script && (
        <div className="stack-sm">
          <span className="subtle">
            Write <code>{challenge.script.name}</code> in the <strong>Script editor</strong> tab
            {challenge.type === 'bugfix' ? ' (the buggy version is already there)' : ''}. Checking
            runs it with:
          </span>
          <ul className="role-list">
            {challenge.script.cases.map((testCase) => (
              <li key={testCase.label}>
                {testCase.label}: <code>{argsText(testCase.args)}</code>
              </li>
            ))}
          </ul>
        </div>
      )}
      {challenge.seedFiles.length > 0 && (
        <div className="row linux-files" aria-label="Files to look at">
          <span className="subtle">Look at:</span>
          {challenge.seedFiles.map((path) => (
            <button
              key={path}
              type="button"
              className="btn btn--ghost btn--sm"
              onClick={() => onLook(path)}
            >
              {path}
            </button>
          ))}
        </div>
      )}
      {challenge.mockHosts && (
        <p className="subtle" style={{ margin: 0 }}>
          Simulated: {challenge.mockHosts.join(' · ')}
        </p>
      )}

      <div className="stack-sm">
        {challenge.hints.slice(0, hints).map((hint, index) => (
          <p key={hint} className="linux-hint" style={{ margin: 0 }}>
            💡 Hint {index + 1}: <RichText text={hint} />
          </p>
        ))}
        <div className="button-row">
          <button type="button" className="btn btn--sm" onClick={onCheck} disabled={checking}>
            {checking ? 'Checking…' : 'Check my answer'}
          </button>
          {hints < 3 && (
            <button
              type="button"
              className="btn btn--secondary btn--sm"
              onClick={() =>
                update((current) => ({
                  ...current,
                  hints: { ...current.hints, [challenge.id]: hints + 1 },
                }))
              }
            >
              Show hint {hints + 1} of 3
            </button>
          )}
        </div>
        <p className="subtle" style={{ margin: 0 }}>
          {challenge.type === 'command'
            ? 'Checking replays what you ran in this environment on fresh data - and on a hidden variant with different names, dates and hosts. For output tasks your last command counts.'
            : `Checking runs your ${challenge.script?.name} on fresh data and on a hidden variant with different names, dates and hosts.`}
        </p>
      </div>

      {report && <Results report={report} />}

      <details className="reveal">
        <summary className="reveal__summary">
          <span aria-hidden="true">🔧</span> Show solution
        </summary>
        <div className="stack-sm">
          {challenge.solutions.map((solution, index) => (
            <CodeBlock
              key={solution}
              code={solution}
              language="bash"
              title={index === 0 ? 'Reference solution' : 'Another way'}
            />
          ))}
          <table className="linux-explain">
            <caption className="subtle">Line by line</caption>
            <tbody>
              {challenge.explanation.map((step) => (
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
            Hidden variant: {challenge.hiddenVariant}
          </p>
        </div>
      </details>

      <div className="linux-followup">
        <strong>🎤 Interview follow-up</strong>
        <p style={{ margin: 0 }}>
          <RichText text={challenge.followUp} />
        </p>
      </div>
      {(challenge.repoRef || related.length > 0) && (
        <div className="stack-sm">
          <strong>Related questions</strong>
          <ul className="role-list">
            {challenge.repoRef && (
              <li>
                Interview repo: <code>{challenge.repoRef.path}</code> (
                {challenge.repoRef.questionId})
              </li>
            )}
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
        Free play on the same simulated server the challenges use. Break things -{' '}
        <strong>Reset environment</strong> brings it back.
      </p>
      <ul className="role-list">
        <li>
          Logs in <code>/var/log/app</code>, <code>/var/log/services</code>,{' '}
          <code>/var/log/nginx/access.log</code>
        </li>
        <li>
          Data in <code>/root</code> (CSV, JSON, host lists), configs in <code>/etc/app</code>, big
          files under <code>/data</code> and <code>/var</code>
        </li>
        <li>
          About ten hosts (<code>cat /root/inventory.txt</code>): try <code>ping</code>,{' '}
          <code>ssh web-01 df -h</code>, <code>ssh db-01 true</code>
        </li>
        <li>
          Alerts: <code>echo hi | mail -s test ops@example.com</code> appears in the Outbox tab
        </li>
      </ul>
      <p className="subtle" style={{ margin: 0 }}>
        Type <code>help</code> in the terminal for every tool and the shell’s known quirks.
      </p>
    </section>
  )
}

/* ---------- the terminal, editor and outbox ---------- */

type Tab = 'terminal' | 'editor' | 'outbox'

function Workbench({
  id,
  challenge,
  draft,
  onDraft,
  tab,
  setTab,
  runRef,
}: {
  id: string
  challenge: LabChallenge | null
  draft: string
  onDraft: (value: string) => void
  tab: Tab
  setTab: (tab: Tab) => void
  /** Lets the task panel run commands ("Look at" buttons). */
  runRef: MutableRefObject<((command: string) => Promise<void>) | null>
}) {
  const [session, setSession] = useState<Session>(() => sessionFor(id))
  const [scroll, setScroll] = useState<Line[]>(session.scroll)
  const [lab, setLab] = useState<LinuxLab | null>(null)
  const [input, setInput] = useState('')
  const [cursor, setCursor] = useState<number | null>(null)
  const [busy, setBusy] = useState(false)
  const [outboxSeen, setOutboxSeen] = useState(0)
  const [, setTick] = useState(0)
  const [fileName, setFileName] = useState(challenge?.script?.name ?? 'script.sh')
  const [args, setArgs] = useState(() => {
    const first = challenge?.script?.cases[0]?.args
    return first ? (Array.isArray(first) ? first : first.main).map(quoteArg).join(' ') : ''
  })
  const inputRef = useRef<HTMLInputElement | null>(null)
  const logRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    let live = true
    void session.lab.then((ready) => {
      if (live) setLab(ready)
    })
    return () => {
      live = false
    }
  }, [session])

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
    async (command: string) => {
      const ready = await session.lab
      const prompt = promptFor(ready.cwd)
      const trimmed = command.trim()
      if (trimmed && session.history[session.history.length - 1] !== command)
        session.history.push(command)
      if (trimmed === 'clear') {
        setScroll([])
        return
      }
      if (trimmed === 'help') {
        append([line('out', command, prompt), line('info', HELP)])
        return
      }
      if (trimmed === 'history') {
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
      append([line('out', command, prompt)])
      if (!trimmed) return
      setBusy(true)
      session.steps.push({ kind: 'run', command })
      const result = await ready.run(command)
      setBusy(false)
      const out: Line[] = []
      if (result.stdout) out.push(line('out', result.stdout.replace(/\n$/, '')))
      if (result.stderr) out.push(line('err', result.stderr.replace(/\n$/, '')))
      append(out)
      setTick((value) => value + 1)
    },
    [append, session],
  )

  useEffect(() => {
    runRef.current = async (command: string) => {
      setTab('terminal')
      await execute(command)
    }
    return () => {
      runRef.current = null
    }
  }, [execute, runRef, setTab])

  const submit = () => {
    if (busy) return
    const command = input
    setInput('')
    setCursor(null)
    void execute(command)
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
    } else if (event.key === 'l' && event.ctrlKey) {
      event.preventDefault()
      setScroll([])
    } else if (event.key === 'c' && event.ctrlKey && !window.getSelection()?.toString()) {
      event.preventDefault()
      append([line('out', `${input}^C`, promptFor(lab?.cwd ?? '/root'))])
      setInput('')
    }
  }

  const save = async () => {
    const ready = await session.lab
    const name = fileName.trim().replace(/^\/root\//, '') || 'script.sh'
    const path = name.startsWith('/') ? name : `/root/${name}`
    await ready.writeFile(path, draft)
    session.steps.push({ kind: 'write', path, content: draft })
    return path
  }

  const saveAndRun = async () => {
    const path = await save()
    const ready = await session.lab
    const shown = ready.cwd === '/root' && path.startsWith('/root/') ? path.slice(6) : path
    setTab('terminal')
    await execute(`bash ${shown}${args.trim() ? ` ${args.trim()}` : ''}`)
  }

  const reset = () => {
    const fresh = newSession()
    sessions.set(id, fresh)
    setSession(fresh)
    setLab(null)
    setScroll([
      ...fresh.scroll,
      line(
        'info',
        'Environment reset: files, hosts, services and the Outbox are back to the start.',
      ),
    ])
    setOutboxSeen(0)
  }

  const outbox = lab?.world.outbox ?? []
  const unread = outbox.length - outboxSeen

  return (
    <section className="linux-bench stack-sm" aria-label="Terminal and editor">
      <div className="linux-tabs">
        <div className="chip-row" role="group" aria-label="Workbench">
          <button
            type="button"
            className="chip"
            aria-pressed={tab === 'terminal'}
            onClick={() => setTab('terminal')}
          >
            Terminal
          </button>
          <button
            type="button"
            className="chip"
            aria-pressed={tab === 'editor'}
            onClick={() => setTab('editor')}
          >
            Script editor
          </button>
          <button
            type="button"
            className="chip"
            aria-pressed={tab === 'outbox'}
            onClick={() => {
              setTab('outbox')
              setOutboxSeen(outbox.length)
            }}
          >
            Outbox{outbox.length ? ` (${outbox.length})` : ''}
            {unread > 0 && tab !== 'outbox' && (
              <span className="linux-dot" aria-label={`${unread} new`} />
            )}
          </button>
        </div>
        <button type="button" className="btn btn--ghost btn--sm linux-tabs__reset" onClick={reset}>
          Reset environment
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
              >
                {entry.prompt && <span className="cli-prompt">{entry.prompt} </span>}
                {entry.text}
              </div>
            ))}
            <div className="cli-input-row">
              <label className="cli-prompt" htmlFor="linux-input">
                {lab ? promptFor(lab.cwd) : 'starting…'}
              </label>
              <input
                id="linux-input"
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
                disabled={!lab}
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
            <button type="button" className="btn btn--ghost btn--sm" onClick={() => setScroll([])}>
              Clear
            </button>
            <button type="button" className="btn btn--sm" onClick={submit} disabled={busy || !lab}>
              {busy ? 'Running…' : 'Run ⏎'}
            </button>
          </div>
        </div>
      )}

      {tab === 'editor' && (
        <div className="stack-sm">
          <div className="row linux-editor-bar">
            <label className="field">
              <span className="field__label">File (in /root)</span>
              <input
                className="search-input"
                value={fileName}
                onChange={(event) => setFileName(event.target.value)}
                spellCheck={false}
              />
            </label>
            <label className="field" style={{ flex: '1 1 12rem' }}>
              <span className="field__label">Arguments</span>
              <input
                className="search-input"
                value={args}
                onChange={(event) => setArgs(event.target.value)}
                spellCheck={false}
                placeholder="e.g. 80 /var/log/app"
              />
            </label>
          </div>
          <CodeEditor
            value={draft}
            onChange={onDraft}
            onRun={() => void saveAndRun()}
            language={bashLanguage}
            languageKey="bash"
            label={`${fileName} contents`}
            minLines={16}
          />
          <div className="button-row">
            <button
              type="button"
              className="btn btn--sm"
              onClick={() => void saveAndRun()}
              disabled={!lab}
            >
              Save &amp; run ▶
            </button>
            <button
              type="button"
              className="btn btn--secondary btn--sm"
              disabled={!lab}
              onClick={() => void save().then((path) => append([line('info', `Saved ${path}`)]))}
            >
              Save
            </button>
            <span className="subtle">
              Ctrl+Enter saves and runs. Your draft is kept in this browser.
            </span>
          </div>
        </div>
      )}

      {tab === 'outbox' && (
        <div className="stack-sm" aria-label="Outbox">
          {outbox.length === 0 ? (
            <p className="subtle">
              Nothing sent yet. Mail (<code>mail</code>, <code>sendmail</code>) and webhooks (
              <code>curl</code> to hooks.slack.com) appear here instead of leaving the lab.
            </p>
          ) : (
            <ul className="linux-outbox">
              {[...outbox].reverse().map((message, index) => (
                <li key={`${message.at}-${index}`} className="card stack-sm">
                  <div className="row">
                    <Badge tone={message.channel === 'mail' ? 'info' : 'warning'}>
                      {message.channel === 'mail'
                        ? '✉ Mail'
                        : message.channel === 'slack'
                          ? '💬 Slack'
                          : '🔗 Webhook'}
                    </Badge>
                    <span className="subtle">to {message.to}</span>
                  </div>
                  <strong>{message.subject}</strong>
                  {message.body.trim() && <pre className="bot-evidence">{message.body}</pre>}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </section>
  )
}

/* ---------- self-test ---------- */

function SelfTest() {
  const [running, setRunning] = useState(false)
  const [done, setDone] = useState(0)
  const [failures, setFailures] = useState<{ id: string; messages: string[] }[] | null>(null)
  const run = async () => {
    setRunning(true)
    setDone(0)
    const failed: { id: string; messages: string[] }[] = []
    for (const challenge of linuxChallenges) {
      const report = await checkChallenge(
        challenge,
        attemptFor(
          challenge,
          [{ kind: 'run', command: challenge.solutions[0] }],
          challenge.solutions[0],
        ),
      )
      if (!report.passed)
        failed.push({
          id: challenge.id,
          messages: report.results.flatMap((result) => result.messages),
        })
      setDone((value) => value + 1)
    }
    setFailures(failed)
    setRunning(false)
  }
  return (
    <details className="reveal">
      <summary className="reveal__summary">
        <span aria-hidden="true">🧪</span> Self-test: run every reference solution
      </summary>
      <div className="stack-sm">
        <p className="subtle" style={{ margin: 0 }}>
          Runs the first reference solution of all {linuxChallenges.length} challenges against the
          checker, on the main data and the hidden variant. Use it after editing a challenge.
        </p>
        <div className="button-row">
          <button
            type="button"
            className="btn btn--secondary btn--sm"
            onClick={() => void run()}
            disabled={running}
          >
            {running ? `Running… ${done}/${linuxChallenges.length}` : 'Run self-test'}
          </button>
        </div>
        {failures && !running && (
          <p
            className={failures.length ? 'linux-results is-fail' : 'viz-ok'}
            role="status"
            style={{ margin: 0 }}
          >
            {failures.length === 0
              ? `✓ All ${linuxChallenges.length} reference solutions pass on both variants.`
              : `${failures.length} failing: ${failures.map((entry) => `${entry.id} (${entry.messages.slice(0, 2).join(' / ')})`).join('; ')}`}
          </p>
        )}
      </div>
    </details>
  )
}

/* ---------- the page ---------- */

/** Linux & Bash lab: scenario challenges on a simulated server, checked by outcome. */
export function LinuxLabPage() {
  const { state, recordChallengeCheck } = useProgress()
  const [params, setParams] = useSearchParams()
  const [store, setStore] = useState<LinuxLabStore>(loadLabStore)
  const requested = params.get('c')
  const id =
    requested && (requested === SANDBOX || linuxChallengeById.has(requested))
      ? requested
      : (store.last ?? SANDBOX)
  const challenge = id === SANDBOX ? null : (linuxChallengeById.get(id) ?? null)
  const [tab, setTab] = useState<Tab>(
    challenge?.type === 'command' || !challenge ? 'terminal' : 'editor',
  )
  const [checking, setChecking] = useState(false)
  const [report, setReport] = useState<CheckReport | null>(null)
  const runRef = useRef<((command: string) => Promise<void>) | null>(null)

  const update = useCallback((change: (current: LinuxLabStore) => LinuxLabStore) => {
    setStore((current) => {
      const next = change(current)
      saveLabStore(next)
      return next
    })
  }, [])

  useEffect(() => {
    if (store.last !== id) update((current) => ({ ...current, last: id }))
  }, [id, store.last, update])

  const select = (next: string) => {
    setParams(next === SANDBOX ? {} : { c: next })
    setReport(null)
    const target = linuxChallengeById.get(next)
    setTab(target && target.type !== 'command' ? 'editor' : 'terminal')
  }

  const draft =
    store.drafts[id] ?? challenge?.starter ?? TEMPLATE(challenge?.script?.name ?? 'script.sh')
  const solvedCount = linuxChallenges.filter(
    (entry) => store.solvedAt[entry.id] || state.challenges[linuxKey(entry.id)]?.solvedAt,
  ).length

  const check = async () => {
    if (!challenge) return
    setChecking(true)
    setReport(null)
    const session = sessionFor(id)
    const result = await checkChallenge(challenge, attemptFor(challenge, [...session.steps], draft))
    setReport(result)
    setChecking(false)
    update((current) => ({
      ...current,
      attempts: { ...current.attempts, [challenge.id]: (current.attempts[challenge.id] ?? 0) + 1 },
      solvedAt:
        result.passed && !current.solvedAt[challenge.id]
          ? { ...current.solvedAt, [challenge.id]: Date.now() }
          : current.solvedAt,
    }))
    recordChallengeCheck(linuxKey(challenge.id), result.passed)
  }

  const look = (path: string) => {
    void sessionFor(id).lab.then(async (lab) => {
      const isDir = await lab.fs.stat(path).then(
        (stat) => stat.isDirectory,
        () => false,
      )
      await runRef.current?.(isDir ? `ls -la ${path}` : `head -n 20 ${path}`)
    })
  }

  return (
    <div className="page page--wide stack">
      <header className="page-header">
        <h1>🐧 Linux &amp; Bash lab</h1>
        <p className="page-header__meta">
          Real-world shell tasks on a simulated server: logs, disks, hosts that are down, services
          that crash, alerts. Your answer is checked by what it does - on your data and on a hidden
          variant - so it has to work, not just look right. Runs entirely in your browser, offline.
        </p>
        <div className="row">
          <Badge tone="success">
            Solved {solvedCount}/{linuxChallenges.length}
          </Badge>
        </div>
      </header>

      <div className="linux-layout">
        <ChallengeList selected={id} onSelect={select} store={store} />
        {challenge ? (
          <TaskPanel
            key={`task-${challenge.id}`}
            challenge={challenge}
            store={store}
            update={update}
            onLook={look}
            onCheck={() => void check()}
            checking={checking}
            report={report}
          />
        ) : (
          <SandboxPanel />
        )}
        <Workbench
          key={`bench-${id}`}
          id={id}
          challenge={challenge}
          draft={draft}
          onDraft={(value) =>
            update((current) => ({ ...current, drafts: { ...current.drafts, [id]: value } }))
          }
          tab={tab}
          setTab={setTab}
          runRef={runRef}
        />
      </div>

      <SelfTest />
    </div>
  )
}
