import { useCallback, useEffect, useRef, useState } from 'react'
import type { KeyboardEvent } from 'react'
import {
  EXAMPLES,
  fetchRunnerStatus,
  runInBrowser,
  runLocally,
  type Engine,
  type PlaygroundLanguage,
  type RunEvent,
  type RunnerStatus,
} from '../lib/playground'

export const PLAYGROUND_KEY = 'azure-learning-hub.playground'
const HISTORY_LIMIT = 20

interface HistoryEntry {
  language: PlaygroundLanguage
  code: string
  at: number
  exitCode: number | null
}

interface Saved {
  language: PlaygroundLanguage
  drafts: Record<PlaygroundLanguage, string>
  history: HistoryEntry[]
}

interface Chunk {
  stream: 'stdout' | 'stderr' | 'system'
  text: string
}

type ExitEvent = Extract<RunEvent, { type: 'exit' }>

const LANGUAGES: { id: PlaygroundLanguage; label: string }[] = [
  { id: 'bash', label: 'Shell (bash)' },
  { id: 'python', label: 'Python' },
]

const defaults = (): Saved => ({
  language: 'bash',
  drafts: { bash: EXAMPLES.bash[0].code, python: EXAMPLES.python[0].code },
  history: [],
})

const load = (): Saved => {
  try {
    const raw = window.localStorage.getItem(PLAYGROUND_KEY)
    if (!raw) return defaults()
    const saved = JSON.parse(raw) as Partial<Saved>
    return { ...defaults(), ...saved, drafts: { ...defaults().drafts, ...saved.drafts } }
  } catch {
    return defaults()
  }
}

const save = (value: Saved) => {
  try {
    window.localStorage.setItem(PLAYGROUND_KEY, JSON.stringify(value))
  } catch {
    /* Storage full or blocked: drafts just will not survive a reload. */
  }
}

const describeExit = (exit: ExitEvent): string => {
  if (exit.timedOut) return 'Timed out and was stopped'
  if (exit.truncated) return 'Output limit reached and was stopped'
  if (exit.code === null) return 'Stopped'
  return `Exit code ${exit.code}`
}

/**
 * A scratchpad for running shell and Python and seeing the output.
 *
 * With the dev or preview server running, scripts run for real on this
 * machine. On the static site there is no server, so Python falls back to
 * Pyodide in the browser and shell is unavailable.
 */
export function PlaygroundPage() {
  const [saved, setSaved] = useState<Saved>(load)
  const [stdin, setStdin] = useState('')
  const [showStdin, setShowStdin] = useState(false)
  const [status, setStatus] = useState<RunnerStatus | null>(null)
  const [running, setRunning] = useState(false)
  const [chunks, setChunks] = useState<Chunk[]>([])
  const [exit, setExit] = useState<ExitEvent | null>(null)
  const [cwd, setCwd] = useState<string | null>(null)
  const [engineUsed, setEngineUsed] = useState<Engine | null>(null)
  const abortRef = useRef<AbortController | null>(null)
  const outputRef = useRef<HTMLPreElement | null>(null)

  const { language } = saved
  const code = saved.drafts[language]
  const engine: Engine | null = status?.available
    ? 'local'
    : language === 'python'
      ? 'browser'
      : null

  useEffect(() => {
    let live = true
    void fetchRunnerStatus().then((result) => live && setStatus(result))
    return () => {
      live = false
      abortRef.current?.abort()
    }
  }, [])

  useEffect(() => save(saved), [saved])

  useEffect(() => {
    const output = outputRef.current
    if (output) output.scrollTop = output.scrollHeight
  }, [chunks])

  const update = (patch: Partial<Saved>) => setSaved((current) => ({ ...current, ...patch }))
  const setCode = (value: string) =>
    setSaved((current) => ({
      ...current,
      drafts: { ...current.drafts, [current.language]: value },
    }))

  const run = useCallback(async () => {
    if (running || !engine || !code.trim()) return
    const controller = new AbortController()
    abortRef.current = controller
    setRunning(true)
    setChunks([])
    setExit(null)
    setCwd(null)
    setEngineUsed(engine)

    let exitCode: number | null = null
    const onEvent = (event: RunEvent) => {
      switch (event.type) {
        case 'start':
          setCwd(event.cwd)
          break
        case 'stdout':
        case 'stderr':
          setChunks((current) => [...current, { stream: event.type, text: event.data }])
          break
        case 'exit':
          exitCode = event.code
          setExit(event)
          break
        case 'error':
          setChunks((current) => [...current, { stream: 'system', text: `${event.message}\n` }])
          break
      }
    }

    try {
      if (engine === 'local') await runLocally(language, code, stdin, onEvent, controller.signal)
      else await runInBrowser(code, stdin, onEvent, controller.signal)
    } catch (error) {
      if (!controller.signal.aborted) {
        onEvent({ type: 'error', message: error instanceof Error ? error.message : String(error) })
      }
    } finally {
      abortRef.current = null
      setRunning(false)
      setSaved((current) => ({
        ...current,
        history: [
          { language, code, at: Date.now(), exitCode },
          ...current.history.filter((entry) => entry.code !== code || entry.language !== language),
        ].slice(0, HISTORY_LIMIT),
      }))
    }
  }, [running, engine, code, language, stdin])

  const stop = () => abortRef.current?.abort()

  const onEditorKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') {
      event.preventDefault()
      void run()
      return
    }
    if (event.key === 'Tab' && !event.shiftKey) {
      // Indent instead of leaving the editor. Shift+Tab still moves focus out.
      event.preventDefault()
      const target = event.currentTarget
      const { selectionStart, selectionEnd } = target
      const indent = language === 'python' ? '    ' : '  '
      setCode(code.slice(0, selectionStart) + indent + code.slice(selectionEnd))
      requestAnimationFrame(() => {
        target.selectionStart = target.selectionEnd = selectionStart + indent.length
      })
    }
  }

  const engineNote = (() => {
    if (status === null) return { tone: 'info', text: 'Checking for the local runner…' }
    if (status.available) {
      const version = language === 'python' ? status.versions?.python : status.versions?.bash
      return {
        tone: 'success',
        text: `Running on this machine${version ? ` with ${version}` : ''}. Working directory: ${status.workspace}`,
      }
    }
    if (language === 'python') {
      return {
        tone: 'info',
        text: 'No local runner, so Python runs in your browser (Pyodide). Start the app with "npm run dev" to run real python3 on your machine.',
      }
    }
    return {
      tone: 'warning',
      text: 'Shell commands need the local runner. Start the app with "npm run dev" (or "npm run preview") and open it from that server.',
    }
  })()

  return (
    <div className="page stack">
      <header className="page-header">
        <h1>Code playground</h1>
        <p className="page-header__meta">
          Write shell or Python, run it, and see the output. Ctrl+Enter (⌘+Enter on Mac) runs.
        </p>
      </header>

      <div className="chip-row" role="group" aria-label="Language">
        {LANGUAGES.map((entry) => (
          <button
            key={entry.id}
            type="button"
            className="chip"
            aria-pressed={language === entry.id}
            onClick={() => update({ language: entry.id })}
            disabled={running}
          >
            {entry.label}
          </button>
        ))}
      </div>

      <div className={`notice notice--${engineNote.tone}`} role="status">
        <span className="notice__icon" aria-hidden="true">
          {status?.available ? '🖥️' : engine === 'browser' ? '🌐' : 'ℹ️'}
        </span>
        <p style={{ margin: 0, overflowWrap: 'anywhere' }}>{engineNote.text}</p>
      </div>

      <div className="playground__editor code-block">
        <div className="code-block__header">
          <label className="code-block__title" htmlFor="playground-code">
            {language === 'python' ? 'script.py' : 'script.sh'}
          </label>
          <select
            className="select playground__examples"
            aria-label="Load an example"
            value=""
            onChange={(event) => {
              const example = EXAMPLES[language].find((entry) => entry.label === event.target.value)
              if (example) setCode(example.code)
            }}
          >
            <option value="">Examples…</option>
            {EXAMPLES[language].map((example) => (
              <option key={example.label} value={example.label}>
                {example.label}
              </option>
            ))}
          </select>
        </div>
        <textarea
          id="playground-code"
          className="playground__textarea"
          value={code}
          onChange={(event) => setCode(event.target.value)}
          onKeyDown={onEditorKeyDown}
          spellCheck={false}
          autoCapitalize="off"
          autoComplete="off"
          autoCorrect="off"
          rows={Math.min(24, Math.max(8, code.split('\n').length + 1))}
        />
      </div>

      {showStdin && (
        <div className="field">
          <label className="field__label" htmlFor="playground-stdin">
            Standard input (what input() or read receives)
          </label>
          <textarea
            id="playground-stdin"
            className="playground__textarea playground__stdin"
            value={stdin}
            onChange={(event) => setStdin(event.target.value)}
            spellCheck={false}
            rows={3}
          />
        </div>
      )}

      <div className="row">
        {running ? (
          <button type="button" className="btn btn--danger" onClick={stop}>
            ■ Stop
          </button>
        ) : (
          <button
            type="button"
            className="btn"
            onClick={() => void run()}
            disabled={!engine || !code.trim()}
          >
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
        <button
          type="button"
          className="btn btn--ghost"
          onClick={() => {
            setChunks([])
            setExit(null)
            setCwd(null)
          }}
          disabled={running || (chunks.length === 0 && !exit)}
        >
          Clear output
        </button>
      </div>

      <section className="code-block playground__output" aria-label="Output">
        <div className="code-block__header">
          <span className="code-block__title">
            Output
            {engineUsed && (
              <span className="subtle">
                {' '}
                · {engineUsed === 'local' ? 'this machine' : 'browser'}
              </span>
            )}
            {cwd && <span className="subtle"> · {cwd}</span>}
          </span>
          {running && <span className="badge badge--info">Running…</span>}
          {exit && (
            <span className={`badge ${exit.code === 0 ? 'badge--success' : 'badge--danger'}`}>
              {describeExit(exit)} · {(exit.durationMs / 1000).toFixed(2)}s
            </span>
          )}
        </div>
        <pre className="code-block__pre playground__pre" ref={outputRef} aria-live="polite">
          {chunks.length === 0 && !running ? (
            <span className="subtle">Run something to see its output here.</span>
          ) : (
            chunks.map((chunk, index) => (
              <span key={index} className={`playground__${chunk.stream}`}>
                {chunk.text}
              </span>
            ))
          )}
        </pre>
      </section>

      {saved.history.length > 0 && (
        <section className="stack-sm">
          <div className="row" style={{ justifyContent: 'space-between' }}>
            <h2 style={{ margin: 0, fontSize: '1.05rem' }}>Recent runs</h2>
            <button
              type="button"
              className="btn btn--ghost btn--sm"
              onClick={() => update({ history: [] })}
            >
              Clear history
            </button>
          </div>
          <ul className="playground__history">
            {saved.history.map((entry) => (
              <li key={`${entry.language}-${entry.at}`}>
                <button
                  type="button"
                  className="playground__history-item"
                  disabled={running}
                  onClick={() =>
                    setSaved((current) => ({
                      ...current,
                      language: entry.language,
                      drafts: { ...current.drafts, [entry.language]: entry.code },
                    }))
                  }
                >
                  <span className="badge">{entry.language === 'python' ? 'py' : 'sh'}</span>
                  <code>{entry.code.split('\n')[0]}</code>
                  <span className="subtle nowrap">
                    {entry.exitCode === null ? '—' : `exit ${entry.exitCode}`}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}

      {status?.available && (
        <p className="disclaimer">
          Scripts run as your own user, with your permissions, in the working directory shown above.
          Each run is stopped after 60 seconds or 1 MB of output. Files you create there stay
          between runs.
        </p>
      )}
    </div>
  )
}
