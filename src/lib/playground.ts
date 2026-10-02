/**
 * The code playground's client side.
 *
 * Two engines, picked per run:
 *
 * - **Local runner** - real `bash` and `python3` on your machine, mounted by
 *   the Vite dev and preview servers (see `server/playground-runner.ts`).
 *   Output streams back as NDJSON while the script runs.
 * - **Browser Python** - Pyodide in a Web Worker, for when there is no local
 *   runner (the deployed static site). Shell needs the local runner.
 */

export type PlaygroundLanguage = 'bash' | 'python'
export type Engine = 'local' | 'browser'

export type RunEvent =
  | { type: 'start'; cwd: string }
  | { type: 'stdout' | 'stderr'; data: string }
  | {
      type: 'exit'
      code: number | null
      signal: string | null
      durationMs: number
      timedOut: boolean
      truncated: boolean
    }
  | { type: 'error'; message: string }

export interface RunnerStatus {
  available: boolean
  workspace?: string
  versions?: { bash: string | null; python: string | null }
}

/*
 * Always at the server root, not under BASE_URL: the runner middleware sits in
 * front of Vite's base handling, so `vite preview` (served from /myapp/) still
 * answers at /api/playground/. It is also what the service worker leaves alone.
 */
const apiUrl = (path: string) => `/api/playground/${path}`

/** Asks the dev/preview server whether it can run scripts. */
export async function fetchRunnerStatus(): Promise<RunnerStatus> {
  try {
    const response = await fetch(apiUrl('status'), { cache: 'no-store' })
    if (!response.ok) return { available: false }
    if (!response.headers.get('content-type')?.includes('application/json')) {
      return { available: false } // A static host answering with index.html.
    }
    const body = (await response.json()) as RunnerStatus
    return body.available ? body : { available: false }
  } catch {
    return { available: false }
  }
}

/** Runs a script on the local runner, calling `onEvent` as output arrives. */
export async function runLocally(
  language: PlaygroundLanguage,
  code: string,
  stdin: string,
  onEvent: (event: RunEvent) => void,
  signal: AbortSignal,
): Promise<void> {
  const response = await fetch(apiUrl('run'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ language, code, stdin }),
    signal,
  })
  if (!response.ok || !response.body) {
    let message = `The runner answered ${response.status}.`
    try {
      message = ((await response.json()) as { error?: string }).error ?? message
    } catch {
      /* keep the status message */
    }
    onEvent({ type: 'error', message })
    return
  }

  const reader = response.body.pipeThrough(new TextDecoderStream()).getReader()
  let buffered = ''
  for (;;) {
    const { value, done } = await reader.read()
    if (done) break
    buffered += value
    const lines = buffered.split('\n')
    buffered = lines.pop() ?? ''
    for (const line of lines) if (line.trim()) onEvent(JSON.parse(line) as RunEvent)
  }
  if (buffered.trim()) onEvent(JSON.parse(buffered) as RunEvent)
}

/* ------------------------------------------------------------ browser Python */

/**
 * Runs Python with Pyodide in a worker (shared with the Python playground).
 * The first run downloads Pyodide (about 10 MB); the service worker keeps it,
 * so later runs work offline.
 */
export async function runInBrowser(
  code: string,
  stdin: string,
  onEvent: (event: RunEvent) => void,
  signal: AbortSignal,
  timeoutMs = 60_000,
): Promise<void> {
  const { runPython } = await import('./python/client')
  onEvent({ type: 'start', cwd: '/home/pyodide (in-browser)' })
  const outcome = await runPython(code, {
    stdin,
    signal,
    timeoutMs,
    onEvent: (event) =>
      onEvent(event.type === 'status' ? { type: 'stderr', data: `${event.text}\n` } : event),
  })
  if (outcome.error) {
    onEvent({ type: 'error', message: outcome.error })
    return
  }
  onEvent({
    type: 'exit',
    code: outcome.code,
    signal: outcome.code === null ? 'SIGKILL' : null,
    durationMs: outcome.durationMs,
    timedOut: outcome.timedOut,
    truncated: false,
  })
}

/* ---------------------------------------------------------------- examples */

export const EXAMPLES: Record<PlaygroundLanguage, { label: string; code: string }[]> = {
  bash: [
    {
      label: 'System info',
      code: 'echo "User: $(whoami)"\necho "Host: $(hostname)"\necho "Dir:  $(pwd)"\nuname -a\ndf -h . | tail -1',
    },
    {
      label: 'Loop and files',
      code: 'for i in 1 2 3; do\n  echo "line $i" >> notes.txt\ndone\nwc -l notes.txt\ncat notes.txt\nrm notes.txt',
    },
    {
      label: 'Streaming output',
      code: 'for i in $(seq 1 5); do\n  echo "tick $i"\n  sleep 1\ndone\necho done',
    },
    {
      label: 'Read stdin',
      code: 'while read -r line; do\n  echo "got: $line"\ndone',
    },
  ],
  python: [
    {
      label: 'Hello',
      code: 'import sys, platform\nprint("Hello from Python", platform.python_version())\nprint(sys.executable)',
    },
    {
      label: 'Data crunching',
      code: 'from collections import Counter\n\nwords = "the quick brown fox jumps over the lazy dog the end".split()\nfor word, count in Counter(words).most_common(3):\n    print(f"{word:<6} {count}")',
    },
    {
      label: 'JSON',
      code: 'import json\n\ndata = {"name": "playground", "tags": ["bash", "python"], "ok": True}\nprint(json.dumps(data, indent=2))',
    },
    {
      label: 'Read stdin',
      code: 'name = input("Name? ")\nprint(f"\\nHello, {name}!")',
    },
  ],
}
