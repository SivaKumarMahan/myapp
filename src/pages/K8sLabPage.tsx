import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { KeyboardEvent } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { yaml } from '@codemirror/lang-yaml'
import { CodeEditor } from '../components/CodeEditor'
import { Badge } from '../components/ui/Badge'
import { CodeBlock } from '../components/ui/CodeBlock'
import { RichText } from '../components/ui/RichText'
import { interviewQuestionById } from '../content/interview'
import {
  k8sCategories,
  k8sKey,
  k8sScenarioById,
  k8sScenarios,
  type K8sScenario,
} from '../content/k8slab'
import { checkScenario, CHECK_WINDOW, type CheckReport } from '../lib/k8slab/checks'
import { K8sLab } from '../lib/k8slab/lab'
import { MAX_HISTORY, loadK8sStore, saveK8sStore, type K8sLabStore } from '../lib/k8slab/store'
import { useProgress } from '../lib/use-progress'

const SANDBOX = 'sandbox'
const MAX_LINES = 800
const yamlLanguage = yaml()

type LineKind = 'out' | 'err' | 'info'
interface Line {
  id: number
  kind: LineKind
  text: string
  prompt?: string
}

/** One cluster per scenario, kept while the app is open. */
interface Session {
  lab: K8sLab
  scroll: Line[]
}

let nextLineId = 1
const line = (kind: LineKind, text: string, prompt?: string): Line => ({
  id: nextLineId++,
  kind,
  text,
  ...(prompt ? { prompt } : {}),
})

const sessions = new Map<string, Session>()

const welcome = (scenario: K8sScenario | null) =>
  scenario
    ? `Kubernetes lab - a pretend AKS cluster (3 nodes, Kubernetes 1.34) in your browser. Nothing leaves it.\nContext aks-lab, namespace ${scenario.setup.namespace}. Type help for what works here; Tab completes, ↑/↓ walk your history.`
    : 'Kubernetes lab sandbox - an empty AKS cluster (3 nodes, ingress-nginx, CoreDNS) in your browser.\nTry: kubectl create deployment web --image=nginx:1.29 --replicas=2, then kubectl expose deployment web --port=80. Type help for more.'

function newSession(scenario: K8sScenario | null, files: Record<string, string>): Session {
  return { lab: K8sLab.create(scenario, files), scroll: [line('info', welcome(scenario))] }
}

const HELP = `What works in this terminal
  kubectl   get (-o wide|yaml|json|name|jsonpath=…|custom-columns=…, -l, -A, --show-labels, --sort-by)
            describe · logs (-p, -c, --tail, deploy/NAME) · exec POD -- curl|wget|nslookup|env
            apply -f FILE · create (deployment, configmap, secret generic|docker-registry, ingress, namespace)
            delete · patch (--type strategic|merge|json) · label · annotate · scale · expose
            set image|resources|env · rollout status|history|undo|restart · top pods|nodes
            taint · cordon · run --rm -it --image=curlimages/curl -- curl … · config set-context --current --namespace=…
  curl      from your laptop through the ingress: curl -i http://HOST/path  (-s -v -I -H 'Host: …' -w '%{http_code}')
  az        az acr repository list|show-tags --name REGISTRY [--repository REPO] -o table
  shell     | grep head tail wc sort uniq awk cut base64 -d · > file.yaml (lands in the Files tab) · $(…) · && ;
  files     ls · cat FILE · rm FILE - edit them in the Files tab, then kubectl apply -f FILE
Keys        Tab complete · ↑/↓ history · Ctrl+L clear · Ctrl+C cancel line
Time        every command moves the cluster clock on 10 seconds; sleep 60 waits a minute`

const LEVEL_LABEL: Record<K8sScenario['level'], string> = { simple: 'Simple', medium: 'Medium' }

const PROMPT = (namespace: string) => `learner@laptop (aks-lab:${namespace})$`

/* ---------- the scenario list ---------- */

function ScenarioList({
  selected,
  onSelect,
  solved,
}: {
  selected: string
  onSelect: (id: string) => void
  solved: (id: string) => boolean
}) {
  const [level, setLevel] = useState<'all' | K8sScenario['level']>('all')
  const [status, setStatus] = useState<'all' | 'todo' | 'solved'>('all')
  const visible = k8sScenarios.filter(
    (scenario) =>
      (level === 'all' || scenario.level === level) &&
      (status === 'all' || (status === 'solved') === solved(scenario.id)),
  )
  return (
    <nav className="linux-list stack-sm" aria-label="Scenarios">
      <button
        type="button"
        className={`linux-item${selected === SANDBOX ? ' is-active' : ''}`}
        aria-current={selected === SANDBOX ? 'true' : undefined}
        onClick={() => onSelect(SANDBOX)}
      >
        <span className="linux-item__title">🧪 Sandbox cluster (free play)</span>
      </button>
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
        {visible.length} of {k8sScenarios.length}
      </p>
      <ul className="linux-list__items">
        {k8sCategories.map((category) => {
          const items = visible.filter((scenario) => scenario.category === category)
          if (items.length === 0) return null
          return (
            <li key={category}>
              <h2 className="subtle" style={{ fontSize: '0.75rem', margin: '0.4rem 0 0.2rem' }}>
                {category}
              </h2>
              <ul className="linux-list__items" style={{ maxHeight: 'none', overflow: 'visible' }}>
                {items.map((scenario) => (
                  <li key={scenario.id}>
                    <button
                      type="button"
                      className={`linux-item${selected === scenario.id ? ' is-active' : ''}`}
                      aria-current={selected === scenario.id ? 'true' : undefined}
                      onClick={() => onSelect(scenario.id)}
                    >
                      <span className="linux-item__title">
                        {solved(scenario.id) && <span aria-label="solved">✓ </span>}
                        {scenario.title}
                      </span>
                      <span className="linux-item__meta subtle">{LEVEL_LABEL[scenario.level]}</span>
                    </button>
                  </li>
                ))}
              </ul>
            </li>
          )
        })}
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
          ? '✅ Fixed - the cluster is healthy and stayed healthy. Now: what was the root cause?'
          : '❌ Not fixed yet. Here is what the cluster says:'}
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

function RootCause({
  scenario,
  solved,
  onAnswer,
}: {
  scenario: K8sScenario
  solved: boolean
  onAnswer: (correct: boolean) => void
}) {
  const [choice, setChoice] = useState<number | null>(null)
  const [answered, setAnswered] = useState<number | null>(null)
  const options = scenario.rootCause.options
  const right = answered !== null && options[answered]?.correct === true
  const done = solved || right
  return (
    <fieldset className="card stack-sm" aria-describedby="k8s-root-help">
      <legend>
        <strong>🔎 Root cause: {scenario.rootCause.question}</strong>
      </legend>
      <p id="k8s-root-help" className="subtle" style={{ margin: 0 }}>
        The fix works. Name the cause to solve the scenario - a wrong answer can be retried.
      </p>
      <ul className="option-list">
        {options.map((option, index) => {
          const className = [
            'option',
            choice === index && answered === null ? 'option--selected' : '',
            answered === index && option.correct ? 'option--correct' : '',
            answered === index && !option.correct ? 'option--incorrect' : '',
            done && option.correct ? 'option--correct' : '',
          ]
            .filter(Boolean)
            .join(' ')
          return (
            <li key={option.text}>
              <label className={className}>
                <input
                  type="radio"
                  name={`root-${scenario.id}`}
                  checked={choice === index}
                  disabled={done}
                  onChange={() => {
                    setChoice(index)
                    setAnswered(null)
                  }}
                />
                <span className="option__text">
                  <RichText text={option.text} />
                  {(answered === index || (done && option.correct)) && (
                    <span className="subtle" style={{ display: 'block' }}>
                      <RichText text={option.why} />
                    </span>
                  )}
                </span>
              </label>
            </li>
          )
        })}
      </ul>
      {!done && (
        <div className="button-row">
          <button
            type="button"
            className="btn btn--sm"
            disabled={choice === null}
            onClick={() => {
              if (choice === null) return
              setAnswered(choice)
              onAnswer(options[choice]?.correct === true)
            }}
          >
            Submit root cause
          </button>
        </div>
      )}
      {answered !== null && !right && (
        <p className="linux-results is-fail" role="status" style={{ margin: 0 }}>
          Not quite - read the evidence again and pick another.
        </p>
      )}
      {done && (
        <div className="linux-results is-pass stack-sm" role="status">
          <strong>🎉 Solved: fixed and diagnosed.</strong>
          <p style={{ margin: 0 }}>
            <RichText text={scenario.lesson} />
          </p>
        </div>
      )}
    </fieldset>
  )
}

function TaskPanel({
  scenario,
  store,
  update,
  onCheck,
  report,
  onAnswer,
  solved,
}: {
  scenario: K8sScenario
  store: K8sLabStore
  update: (change: (store: K8sLabStore) => K8sLabStore) => void
  onCheck: () => void
  report: CheckReport | null
  onAnswer: (correct: boolean) => void
  solved: boolean
}) {
  const hints = store.hints[scenario.id] ?? 0
  const fixed = Boolean(store.fixedAt[scenario.id]) || solved
  const related = useMemo(
    () =>
      scenario.related
        .map((id) => interviewQuestionById.get(id))
        .filter((entry) => entry !== undefined),
    [scenario],
  )
  return (
    <section className="card stack-sm linux-task" aria-labelledby="k8s-task-title">
      <div className="row">
        <Badge>{scenario.category}</Badge>
        <Badge tone={scenario.level === 'simple' ? 'info' : 'warning'}>
          {LEVEL_LABEL[scenario.level]}
        </Badge>
        <Badge>namespace {scenario.setup.namespace}</Badge>
        {solved && <Badge tone="success">✓ Solved</Badge>}
      </div>
      <h2 id="k8s-task-title" className="card__title">
        {scenario.title}
      </h2>
      <p style={{ margin: 0 }}>
        <RichText text={scenario.story} />
      </p>
      <p className="subtle" style={{ margin: 0 }}>
        <strong>Symptom:</strong> <RichText text={scenario.symptom} />
      </p>
      <div className="linux-task__task">
        <strong>Task</strong>
        <p style={{ margin: 0 }}>
          <RichText text={scenario.task} />
        </p>
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
          Checking looks at the cluster, not at what you typed, and watches it for{' '}
          {CHECK_WINDOW / 60} more minutes - so a fix that only hides the symptom for a moment does
          not pass.
        </p>
      </div>

      {report && <Results report={report} />}
      {fixed && (
        <RootCause key={scenario.id} scenario={scenario} solved={solved} onAnswer={onAnswer} />
      )}

      <details className="reveal">
        <summary className="reveal__summary">
          <span aria-hidden="true">🔧</span> Show solution
        </summary>
        <div className="stack-sm">
          {scenario.solution.files?.map((file) => (
            <CodeBlock
              key={file.name}
              code={file.content}
              language="yaml"
              title={`Files tab: ${file.name}`}
            />
          ))}
          <CodeBlock
            code={scenario.solution.commands.join('\n')}
            language="bash"
            title="Reference fix"
          />
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
            Tempting but wrong: <code>{scenario.wrongFix.commands.join(' && ')}</code> -{' '}
            <RichText text={scenario.wrongFix.why} />
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
          <strong>Related interview questions</strong>
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
      <h2 className="card__title">🧪 Sandbox cluster</h2>
      <p style={{ margin: 0 }}>
        An empty three-node AKS cluster with ingress-nginx, CoreDNS and metrics-server. Break things
        - <strong>Reset cluster</strong> brings it back.
      </p>
      <ul className="role-list">
        <li>
          <code>kubectl create deployment web --image=nginx:1.29 --replicas=2</code>
        </li>
        <li>
          <code>kubectl expose deployment web --port=80</code>
        </li>
        <li>
          <code>
            kubectl create ingress web --class=nginx --rule=&quot;web.example.com/*=web:80&quot;
          </code>
          , then <code>curl -i http://web.example.com/</code>
        </li>
        <li>
          Break it: <code>kubectl set image deployment/web nginx=nginx:9.9</code>, then{' '}
          <code>kubectl rollout undo deployment/web</code>
        </li>
      </ul>
      <p className="subtle" style={{ margin: 0 }}>
        Public images here: nginx, httpd, busybox, curlimages/curl. Any <code>*.example.com</code>{' '}
        host resolves to the ingress controller.
      </p>
    </section>
  )
}

/* ---------- terminal and files ---------- */

type Tab = 'terminal' | 'files'

function Workbench({
  id,
  scenario,
  store,
  update,
  tab,
  setTab,
}: {
  id: string
  scenario: K8sScenario | null
  store: K8sLabStore
  update: (change: (store: K8sLabStore) => K8sLabStore) => void
  tab: Tab
  setTab: (tab: Tab) => void
}) {
  const [session, setSession] = useState<Session>(() => {
    let existing = sessions.get(id)
    if (!existing) {
      existing = newSession(scenario, store.files[id] ?? {})
      sessions.set(id, existing)
    }
    return existing
  })
  const [scroll, setScroll] = useState<Line[]>(session.scroll)
  const [input, setInput] = useState('')
  const [cursor, setCursor] = useState<number | null>(null)
  const [, setTick] = useState(0)
  const [fileName, setFileName] = useState<string>(() => Object.keys(session.lab.files)[0] ?? '')
  const [newName, setNewName] = useState('')
  const inputRef = useRef<HTMLInputElement | null>(null)
  const logRef = useRef<HTMLDivElement | null>(null)
  const history = useMemo(() => store.history[id] ?? [], [store.history, id])

  useEffect(() => {
    session.scroll = scroll
    const log = logRef.current
    if (log) log.scrollTop = log.scrollHeight
  }, [scroll, session])

  const append = useCallback(
    (entries: Line[]) => setScroll((current) => [...current, ...entries].slice(-MAX_LINES)),
    [],
  )

  const syncFiles = useCallback(
    () =>
      update((current) => ({
        ...current,
        files: { ...current.files, [id]: { ...session.lab.files } },
      })),
    [id, session, update],
  )

  const execute = (command: string) => {
    const prompt = PROMPT(session.lab.cluster.namespace)
    const trimmed = command.trim()
    if (trimmed && history[history.length - 1] !== command)
      update((current) => ({
        ...current,
        history: {
          ...current.history,
          [id]: [...(current.history[id] ?? []), command].slice(-MAX_HISTORY),
        },
      }))
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
          history.map((entry, index) => `${String(index + 1).padStart(5)}  ${entry}`).join('\n'),
        ),
      ])
      return
    }
    append([line('out', command, prompt)])
    if (!trimmed) return
    const before = JSON.stringify(session.lab.files)
    const result = session.lab.run(command)
    const out: Line[] = []
    if (result.stdout) out.push(line('out', result.stdout.replace(/\n$/, '')))
    if (result.stderr) out.push(line('err', result.stderr.replace(/\n$/, '')))
    append(out)
    if (JSON.stringify(session.lab.files) !== before) {
      syncFiles()
      if (!fileName) setFileName(Object.keys(session.lab.files)[0] ?? '')
    }
    setTick((value) => value + 1)
  }

  const submit = () => {
    const command = input
    setInput('')
    setCursor(null)
    execute(command)
  }

  const walk = (step: number) => {
    if (history.length === 0) return
    const position = cursor === null ? (step < 0 ? history.length - 1 : null) : cursor + step
    if (position === null || position >= history.length) {
      setCursor(null)
      setInput('')
    } else {
      const clamped = Math.max(0, position)
      setCursor(clamped)
      setInput(history[clamped])
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
      const completion = session.lab.complete(input)
      setInput(completion.line)
      if (completion.options.length > 1)
        append([
          line('out', input, PROMPT(session.lab.cluster.namespace)),
          line('info', completion.options.slice(0, 60).join('  ')),
        ])
    } else if (event.key === 'l' && event.ctrlKey) {
      event.preventDefault()
      setScroll([])
    } else if (event.key === 'c' && event.ctrlKey && !window.getSelection()?.toString()) {
      event.preventDefault()
      append([line('out', `${input}^C`, PROMPT(session.lab.cluster.namespace))])
      setInput('')
    }
  }

  const reset = () => {
    const fresh = newSession(scenario, session.lab.files)
    sessions.set(id, fresh)
    setSession(fresh)
    setScroll([
      ...fresh.scroll,
      line('info', 'Cluster reset to the start of the scenario. Your files are kept.'),
    ])
  }

  const files = session.lab.files
  const names = Object.keys(files).sort()
  const current = fileName && files[fileName] !== undefined ? fileName : (names[0] ?? '')

  const writeFile = (name: string, content: string) => {
    session.lab.writeFile(name, content)
    syncFiles()
    setTick((value) => value + 1)
  }

  const createFile = () => {
    const name = newName.trim().replace(/[^\w.-]/g, '')
    if (!name) return
    if (files[name] === undefined) writeFile(name, '')
    setFileName(name)
    setNewName('')
  }

  return (
    <section className="linux-bench stack-sm" aria-label="Terminal and files">
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
            aria-pressed={tab === 'files'}
            onClick={() => setTab('files')}
          >
            Files{names.length ? ` (${names.length})` : ''}
          </button>
        </div>
        <button type="button" className="btn btn--ghost btn--sm linux-tabs__reset" onClick={reset}>
          Reset cluster
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
              <label className="cli-prompt" htmlFor="k8s-input">
                {PROMPT(session.lab.cluster.namespace)}
              </label>
              <input
                id="k8s-input"
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
                const completion = session.lab.complete(input)
                setInput(completion.line)
                if (completion.options.length > 1)
                  append([line('info', completion.options.slice(0, 60).join('  '))])
                inputRef.current?.focus()
              }}
              aria-label="Complete"
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
          <div className="row linux-editor-bar">
            <label className="field">
              <span className="field__label">File</span>
              <select
                className="select"
                value={current}
                onChange={(event) => setFileName(event.target.value)}
                disabled={names.length === 0}
              >
                {names.length === 0 && <option value="">No files yet</option>}
                {names.map((name) => (
                  <option key={name} value={name}>
                    {name}
                  </option>
                ))}
              </select>
            </label>
            <label className="field" style={{ flex: '1 1 10rem' }}>
              <span className="field__label">New file</span>
              <input
                className="search-input"
                value={newName}
                onChange={(event) => setNewName(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') createFile()
                }}
                placeholder="e.g. fix.yaml"
                spellCheck={false}
              />
            </label>
            <button
              type="button"
              className="btn btn--secondary btn--sm"
              onClick={createFile}
              style={{ alignSelf: 'flex-end' }}
            >
              Create
            </button>
          </div>
          {current ? (
            <>
              <CodeEditor
                key={`${id}-${current}`}
                value={files[current] ?? ''}
                onChange={(value) => writeFile(current, value)}
                onRun={() => {
                  setTab('terminal')
                  execute(`kubectl apply -f ${current}`)
                }}
                language={yamlLanguage}
                languageKey="yaml"
                label={`${current} contents`}
                minLines={16}
              />
              <div className="button-row">
                <button
                  type="button"
                  className="btn btn--sm"
                  onClick={() => {
                    setTab('terminal')
                    execute(`kubectl apply -f ${current}`)
                  }}
                >
                  Apply ▶
                </button>
                <button
                  type="button"
                  className="btn btn--ghost btn--sm"
                  onClick={() => {
                    delete session.lab.files[current]
                    syncFiles()
                    setFileName('')
                    setTick((value) => value + 1)
                  }}
                >
                  Delete file
                </button>
                <span className="subtle">Edits save as you type. Ctrl+Enter applies.</span>
              </div>
            </>
          ) : (
            <p className="subtle">
              No files yet. Start from the live object -{' '}
              <code>kubectl get deploy NAME -o yaml &gt; NAME.yaml</code> - or create an empty one
              above.
            </p>
          )}
        </div>
      )}
    </section>
  )
}

/* ---------- the page ---------- */

/** Kubernetes troubleshooting lab: fix a broken workload on a pretend cluster, then name the root cause. */
export function K8sLabPage() {
  const { state, recordChallengeCheck } = useProgress()
  const [params, setParams] = useSearchParams()
  const [store, setStore] = useState<K8sLabStore>(loadK8sStore)
  const requested = params.get('s')
  const id =
    requested && (requested === SANDBOX || k8sScenarioById.has(requested))
      ? requested
      : (store.last ?? SANDBOX)
  const scenario = id === SANDBOX ? null : (k8sScenarioById.get(id) ?? null)
  const [tab, setTab] = useState<Tab>('terminal')
  const [report, setReport] = useState<CheckReport | null>(null)

  const update = useCallback((change: (current: K8sLabStore) => K8sLabStore) => {
    setStore((current) => {
      const next = change(current)
      saveK8sStore(next)
      return next
    })
  }, [])

  useEffect(() => {
    if (store.last !== id) update((current) => ({ ...current, last: id }))
  }, [id, store.last, update])

  const solved = (scenarioId: string) =>
    Boolean(store.solvedAt[scenarioId] || state.challenges[k8sKey(scenarioId)]?.solvedAt)

  const select = (next: string) => {
    setParams(next === SANDBOX ? {} : { s: next })
    setReport(null)
    setTab('terminal')
  }

  const attempt = (scenarioId: string) => (current: K8sLabStore) => ({
    ...current,
    attempts: { ...current.attempts, [scenarioId]: (current.attempts[scenarioId] ?? 0) + 1 },
  })

  const check = () => {
    if (!scenario) return
    const session = sessions.get(id)
    if (!session) return
    const result = checkScenario(scenario, session.lab.cluster)
    setReport(result)
    update((current) => ({
      ...attempt(scenario.id)(current),
      fixedAt:
        result.passed && !current.fixedAt[scenario.id]
          ? { ...current.fixedAt, [scenario.id]: Date.now() }
          : current.fixedAt,
    }))
    if (!result.passed) recordChallengeCheck(k8sKey(scenario.id), false)
  }

  const answer = (correct: boolean) => {
    if (!scenario) return
    update((current) => ({
      ...attempt(scenario.id)(current),
      solvedAt:
        correct && !current.solvedAt[scenario.id]
          ? { ...current.solvedAt, [scenario.id]: Date.now() }
          : current.solvedAt,
    }))
    recordChallengeCheck(k8sKey(scenario.id), correct)
  }

  const solvedCount = k8sScenarios.filter((entry) => solved(entry.id)).length

  return (
    <div className="page page--wide stack">
      <header className="page-header">
        <h1>☸️ Kubernetes troubleshooting lab</h1>
        <p className="page-header__meta">
          A broken workload on a pretend AKS cluster in your browser. Investigate with kubectl, fix
          it, then name the root cause. The check looks at the cluster - not at what you typed - so
          any real fix passes. Works offline.
        </p>
        <div className="row">
          <Badge tone="success">
            Solved {solvedCount}/{k8sScenarios.length}
          </Badge>
        </div>
      </header>

      <div className="linux-layout">
        <ScenarioList selected={id} onSelect={select} solved={solved} />
        {scenario ? (
          <TaskPanel
            key={`task-${scenario.id}`}
            scenario={scenario}
            store={store}
            update={update}
            onCheck={check}
            report={report}
            onAnswer={answer}
            solved={solved(scenario.id)}
          />
        ) : (
          <SandboxPanel />
        )}
        <Workbench
          key={`bench-${id}`}
          id={id}
          scenario={scenario}
          store={store}
          update={update}
          tab={tab}
          setTab={setTab}
        />
      </div>
    </div>
  )
}
