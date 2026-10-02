import type { TestOutcome, WorkerMessage, WorkerRequest, WorkerRequestBody } from './protocol'

/**
 * The page side of the Python worker.
 *
 * Python cannot be interrupted from outside without SharedArrayBuffer (which
 * needs cross-origin isolation GitHub Pages cannot give), so Stop and timeouts
 * terminate the worker. The next run starts a new one; Pyodide comes from the
 * browser cache then, so that takes seconds rather than a download.
 */

export type PythonEvent =
  { type: 'status'; text: string } | { type: 'stdout' | 'stderr'; data: string }

export interface RunOutcome {
  code: number | null
  durationMs: number
  timedOut: boolean
  stopped: boolean
  error?: string
}

let worker: Worker | null = null
let nextId = 1
/** True once Python has loaded in the current worker. */
let warm = false

const start = () => {
  worker ??= new Worker(new URL('./worker.ts', import.meta.url), { type: 'module' })
  return worker
}

const kill = () => {
  worker?.terminate()
  worker = null
  warm = false
}

export const pythonIsWarm = () => warm

function request<T>(
  message: WorkerRequestBody,
  onEvent: (event: PythonEvent) => void,
  signal: AbortSignal | undefined,
  timeoutMs: number,
  finish: (message: WorkerMessage) => T | undefined,
  stopped: (timedOut: boolean) => T,
): Promise<T> {
  const active = start()
  const id = nextId++
  return new Promise<T>((resolve) => {
    let timer: ReturnType<typeof setTimeout> | undefined
    const done = (value: T, terminate: boolean) => {
      clearTimeout(timer)
      signal?.removeEventListener('abort', onAbort)
      active.removeEventListener('message', onMessage)
      if (terminate) kill()
      resolve(value)
    }
    const onAbort = () => done(stopped(false), true)
    const onMessage = ({ data }: MessageEvent<WorkerMessage>) => {
      if (data.id !== id) return
      if (data.type === 'status') onEvent({ type: 'status', text: data.text })
      else if (data.type === 'stdout' || data.type === 'stderr') onEvent(data)
      else if (data.type === 'ready') {
        warm = true
        // The time limit covers the code, not the first download.
        timer = setTimeout(() => done(stopped(true), true), timeoutMs)
      } else {
        const value = finish(data)
        if (value !== undefined) done(value, data.type === 'error')
      }
    }
    signal?.addEventListener('abort', onAbort)
    active.addEventListener('message', onMessage)
    active.postMessage({ ...message, id } as WorkerRequest)
  })
}

/** Runs a script, streaming its output. */
export function runPython(
  code: string,
  options: {
    stdin?: string
    prelude?: string
    onEvent: (event: PythonEvent) => void
    signal?: AbortSignal
    timeoutMs?: number
  },
): Promise<RunOutcome> {
  const started = Date.now()
  return request<RunOutcome>(
    { type: 'run', code, stdin: options.stdin ?? '', prelude: options.prelude },
    options.onEvent,
    options.signal,
    options.timeoutMs ?? 30_000,
    (message) =>
      message.type === 'exit'
        ? { code: message.code, durationMs: message.durationMs, timedOut: false, stopped: false }
        : message.type === 'error'
          ? {
              code: null,
              durationMs: Date.now() - started,
              timedOut: false,
              stopped: false,
              error: message.message,
            }
          : undefined,
    (timedOut) => ({ code: null, durationMs: Date.now() - started, timedOut, stopped: !timedOut }),
  )
}

export type TestRun =
  | { ok: true; outcome: TestOutcome; durationMs: number }
  | { ok: false; error: string; timedOut: boolean }

/** Runs the learner's code, then each test expression, in a fresh namespace. */
export function testPython(
  code: string,
  fixtures: string,
  calls: string[],
  options: { onEvent: (event: PythonEvent) => void; timeoutMs?: number },
): Promise<TestRun> {
  return request<TestRun>(
    { type: 'test', code, fixtures, calls },
    options.onEvent,
    undefined,
    options.timeoutMs ?? 15_000,
    (message) =>
      message.type === 'tests'
        ? { ok: true, outcome: message.outcome, durationMs: message.durationMs }
        : message.type === 'error'
          ? { ok: false, error: message.message, timedOut: false }
          : undefined,
    (timedOut) => ({
      ok: false,
      timedOut,
      error:
        'Your code ran for more than 15 seconds and was stopped - an infinite loop, or real time.sleep() calls?',
    }),
  )
}

/** Deep equality on plain JSON, with a little tolerance for floating point. */
export function sameValue(actual: unknown, expected: unknown): boolean {
  if (typeof actual === 'number' && typeof expected === 'number') {
    return Math.abs(actual - expected) <= 1e-9 * Math.max(1, Math.abs(expected))
  }
  if (Array.isArray(actual) && Array.isArray(expected)) {
    return (
      actual.length === expected.length &&
      actual.every((item, index) => sameValue(item, expected[index]))
    )
  }
  if (actual && expected && typeof actual === 'object' && typeof expected === 'object') {
    const a = actual as Record<string, unknown>
    const b = expected as Record<string, unknown>
    const keys = Object.keys(b)
    return (
      Object.keys(a).length === keys.length &&
      keys.every((key) => key in a && sameValue(a[key], b[key]))
    )
  }
  return actual === expected
}
