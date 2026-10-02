import { spawn, spawnSync } from 'node:child_process'
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import type { IncomingMessage, ServerResponse } from 'node:http'
import { homedir, tmpdir } from 'node:os'
import { join } from 'node:path'
import type { Connect, Plugin } from 'vite'

/**
 * The code playground's local runner.
 *
 * The playground page posts a script here and gets its output back as it is
 * produced. It runs on YOUR machine, as you, so it is only ever mounted on the
 * Vite dev and preview servers - never in the static build - and it refuses
 * anything that does not come from a page on this same server over loopback.
 *
 * Protocol: `POST /api/playground/run` with JSON `{ language, code, stdin }`.
 * The response is NDJSON, one event per line:
 *
 *   {"type":"start","cwd":"..."}
 *   {"type":"stdout","data":"..."}   (any number, interleaved with stderr)
 *   {"type":"stderr","data":"..."}
 *   {"type":"exit","code":0,"signal":null,"durationMs":12,"timedOut":false,"truncated":false}
 *
 * Closing the request (the page's Stop button) kills the whole process group.
 */

export type PlaygroundLanguage = 'bash' | 'python'

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

export interface RunnerOptions {
  /** Where scripts run. Files they create persist between runs. */
  workspace?: string
  timeoutMs?: number
  /** Combined stdout + stderr cap; the process is killed once it is passed. */
  maxOutputBytes?: number
}

export const DEFAULT_WORKSPACE = join(homedir(), '.azure-hub-playground')
const DEFAULT_TIMEOUT_MS = 60_000
const DEFAULT_MAX_OUTPUT = 1024 * 1024
const MAX_CODE_BYTES = 256 * 1024

const INTERPRETERS: Record<PlaygroundLanguage, { command: string; file: string; args: string[] }> =
  {
    bash: { command: 'bash', file: 'script.sh', args: [] },
    // -u: unbuffered, so print() output streams instead of arriving at exit.
    python: { command: 'python3', file: 'script.py', args: ['-u'] },
  }

export const isLanguage = (value: unknown): value is PlaygroundLanguage =>
  value === 'bash' || value === 'python'

/**
 * Runs one script and reports what happens through `emit`. Resolves once the
 * process has exited; `signal` aborts it early.
 */
export function runScript(
  language: PlaygroundLanguage,
  code: string,
  stdin: string,
  emit: (event: RunEvent) => void,
  signal?: AbortSignal,
  options: RunnerOptions = {},
): Promise<void> {
  const workspace = options.workspace ?? DEFAULT_WORKSPACE
  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS
  const maxOutput = options.maxOutputBytes ?? DEFAULT_MAX_OUTPUT
  const interpreter = INTERPRETERS[language]

  mkdirSync(workspace, { recursive: true })
  // The script itself lives outside the workspace so `ls` shows only your files.
  const scriptDir = mkdtempSync(join(tmpdir(), 'azure-hub-playground-'))
  const scriptPath = join(scriptDir, interpreter.file)
  writeFileSync(scriptPath, code)

  return new Promise((resolve) => {
    const started = Date.now()
    let outputBytes = 0
    let truncated = false
    let timedOut = false
    let finished = false

    const child = spawn(interpreter.command, [...interpreter.args, scriptPath], {
      cwd: workspace,
      env: { ...process.env, PYTHONUNBUFFERED: '1', TERM: 'dumb', NO_COLOR: '1' },
      // Own process group, so killing it also kills anything the script started.
      detached: true,
      stdio: ['pipe', 'pipe', 'pipe'],
    })

    const kill = () => {
      if (child.pid === undefined || child.exitCode !== null) return
      try {
        process.kill(-child.pid, 'SIGKILL')
      } catch {
        child.kill('SIGKILL')
      }
    }

    const timer = setTimeout(() => {
      timedOut = true
      kill()
    }, timeoutMs)
    const onAbort = () => kill()
    signal?.addEventListener('abort', onAbort)

    const finish = (event: RunEvent) => {
      if (finished) return
      finished = true
      clearTimeout(timer)
      signal?.removeEventListener('abort', onAbort)
      rmSync(scriptDir, { recursive: true, force: true })
      emit(event)
      resolve()
    }

    const forward = (type: 'stdout' | 'stderr') => (chunk: Buffer) => {
      if (truncated) return
      const room = maxOutput - outputBytes
      if (chunk.length > room) {
        truncated = true
        if (room > 0) emit({ type, data: chunk.subarray(0, room).toString('utf8') })
        kill()
        return
      }
      outputBytes += chunk.length
      emit({ type, data: chunk.toString('utf8') })
    }

    emit({ type: 'start', cwd: workspace })
    child.stdout.on('data', forward('stdout'))
    child.stderr.on('data', forward('stderr'))
    child.stdin.on('error', () => {}) // The script may exit without reading stdin.
    child.stdin.end(stdin)

    child.on('error', (error) => {
      finish({ type: 'error', message: `Could not start ${interpreter.command}: ${error.message}` })
    })
    child.on('close', (code, exitSignal) => {
      finish({
        type: 'exit',
        code,
        signal: exitSignal,
        durationMs: Date.now() - started,
        timedOut,
        truncated,
      })
    })

    if (signal?.aborted) kill()
  })
}

const versionOf = (command: string, args: string[]): string | null => {
  const result = spawnSync(command, args, { encoding: 'utf8', timeout: 5_000 })
  if (result.status !== 0) return null
  return `${result.stdout}${result.stderr}`.trim().split('\n')[0] ?? null
}

const isLoopback = (address: string | undefined) =>
  address === '127.0.0.1' || address === '::1' || address === '::ffff:127.0.0.1'

/**
 * Only this server's own pages may run code. A loopback socket stops other
 * machines when the dev server is started with `--host`; the Origin check
 * stops any other website open in your browser from posting to localhost.
 */
function refusal(req: IncomingMessage): string | null {
  if (!isLoopback(req.socket.remoteAddress)) {
    return 'The playground runner only accepts requests from this machine.'
  }
  const origin = req.headers.origin
  const host = req.headers.host
  if (!origin || !host) return 'Missing Origin or Host header.'
  try {
    if (new URL(origin).host !== host) return 'Cross-origin requests are not allowed.'
  } catch {
    return 'Invalid Origin header.'
  }
  return null
}

const readBody = (req: IncomingMessage, limit: number) =>
  new Promise<string>((resolve, reject) => {
    let size = 0
    const chunks: Buffer[] = []
    req.on('data', (chunk: Buffer) => {
      size += chunk.length
      if (size > limit) {
        reject(new Error('Script is too large.'))
        req.destroy()
        return
      }
      chunks.push(chunk)
    })
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')))
    req.on('error', reject)
  })

const sendJson = (res: ServerResponse, status: number, body: unknown) => {
  res.statusCode = status
  res.setHeader('Content-Type', 'application/json')
  res.setHeader('Cache-Control', 'no-store')
  res.end(JSON.stringify(body))
}

export function playgroundMiddleware(options: RunnerOptions = {}): Connect.NextHandleFunction {
  const workspace = options.workspace ?? DEFAULT_WORKSPACE
  let versions: { bash: string | null; python: string | null } | undefined

  return (req, res, next) => {
    const path = req.url?.split('?')[0]
    if (path === '/api/playground/status' && req.method === 'GET') {
      versions ??= {
        bash: versionOf('bash', ['--version']),
        python: versionOf('python3', ['--version']),
      }
      sendJson(res, 200, { available: true, workspace, versions })
      return
    }
    if (path !== '/api/playground/run') {
      next()
      return
    }
    if (req.method !== 'POST') {
      sendJson(res, 405, { error: 'Use POST.' })
      return
    }
    const refused = refusal(req)
    if (refused) {
      sendJson(res, 403, { error: refused })
      return
    }
    if (!req.headers['content-type']?.startsWith('application/json')) {
      sendJson(res, 415, { error: 'Send application/json.' })
      return
    }

    readBody(req, MAX_CODE_BYTES * 2)
      .then((raw) => {
        const body = JSON.parse(raw) as { language?: unknown; code?: unknown; stdin?: unknown }
        if (!isLanguage(body.language) || typeof body.code !== 'string') {
          sendJson(res, 400, { error: 'Expected { language: "bash" | "python", code: string }.' })
          return
        }
        res.statusCode = 200
        res.setHeader('Content-Type', 'application/x-ndjson')
        res.setHeader('Cache-Control', 'no-store')
        res.setHeader('X-Accel-Buffering', 'no')
        res.flushHeaders()

        const abort = new AbortController()
        res.on('close', () => abort.abort())
        return runScript(
          body.language,
          body.code,
          typeof body.stdin === 'string' ? body.stdin : '',
          (event) => {
            if (!res.writableEnded) res.write(`${JSON.stringify(event)}\n`)
          },
          abort.signal,
          options,
        ).then(() => res.end())
      })
      .catch((error: unknown) => {
        const message = error instanceof Error ? error.message : String(error)
        if (res.headersSent) res.end(`${JSON.stringify({ type: 'error', message })}\n`)
        else sendJson(res, 400, { error: message })
      })
  }
}

/** Mounts the runner on `vite` and `vite preview`. The static build never has it. */
export function playgroundRunner(options: RunnerOptions = {}): Plugin {
  return {
    name: 'azure-hub-playground-runner',
    apply: 'serve',
    configureServer(server) {
      server.middlewares.use(playgroundMiddleware(options))
    },
    configurePreviewServer(server) {
      server.middlewares.use(playgroundMiddleware(options))
    },
  }
}

/** For tests: a throwaway workspace. */
export const tempWorkspace = () => mkdtempSync(join(tmpdir(), 'azure-hub-playground-ws-'))
