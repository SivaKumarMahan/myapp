// @vitest-environment node
import { createServer, type Server } from 'node:http'
import type { AddressInfo } from 'node:net'
import { rmSync } from 'node:fs'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import {
  playgroundMiddleware,
  runScript,
  tempWorkspace,
  type PlaygroundLanguage,
  type RunEvent,
} from './playground-runner'

const workspace = tempWorkspace()
afterAll(() => rmSync(workspace, { recursive: true, force: true }))

const run = async (
  language: PlaygroundLanguage,
  code: string,
  options: {
    stdin?: string
    timeoutMs?: number
    maxOutputBytes?: number
    signal?: AbortSignal
  } = {},
) => {
  const events: RunEvent[] = []
  await runScript(
    language,
    code,
    options.stdin ?? '',
    (event) => events.push(event),
    options.signal,
    {
      workspace,
      timeoutMs: options.timeoutMs,
      maxOutputBytes: options.maxOutputBytes,
    },
  )
  const text = (type: 'stdout' | 'stderr') =>
    events
      .filter((event): event is Extract<RunEvent, { type: typeof type }> => event.type === type)
      .map((event) => event.data)
      .join('')
  const exit = events.find((event) => event.type === 'exit')
  return { events, stdout: text('stdout'), stderr: text('stderr'), exit }
}

describe('runScript', () => {
  it('runs bash in the workspace and reports the exit code', async () => {
    const result = await run('bash', 'pwd\necho oops >&2\nexit 3')
    expect(result.stdout.trim()).toBe(workspace)
    expect(result.stderr).toBe('oops\n')
    expect(result.exit).toMatchObject({ code: 3, timedOut: false })
  })

  it('runs python3 and feeds it stdin', async () => {
    const result = await run('python', 'print(input().upper())', { stdin: 'hello\n' })
    expect(result.stdout).toBe('HELLO\n')
    expect(result.exit).toMatchObject({ code: 0 })
  })

  it('keeps files between runs', async () => {
    await run('bash', 'echo kept > note.txt')
    expect((await run('python', 'print(open("note.txt").read().strip())')).stdout).toBe('kept\n')
  })

  it('stops a script that runs past the timeout', async () => {
    const result = await run('bash', 'sleep 30', { timeoutMs: 300 })
    expect(result.exit).toMatchObject({ code: null, timedOut: true })
  })

  it('stops a script that floods output', async () => {
    const result = await run('python', 'while True: print("x" * 1000)', { maxOutputBytes: 10_000 })
    expect(result.stdout.length).toBe(10_000)
    expect(result.exit).toMatchObject({ truncated: true })
  })

  it('stops when aborted', async () => {
    const abort = new AbortController()
    setTimeout(() => abort.abort(), 200)
    const result = await run('bash', 'sleep 30', { signal: abort.signal })
    expect(result.exit).toMatchObject({ code: null, signal: 'SIGKILL', timedOut: false })
  })
})

describe('playgroundMiddleware', () => {
  let server: Server
  let base: string

  beforeAll(async () => {
    const middleware = playgroundMiddleware({ workspace })
    server = createServer((req, res) =>
      middleware(req as never, res, () => {
        res.statusCode = 404
        res.end()
      }),
    )
    await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve))
    base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`
  })
  afterAll(() => new Promise<void>((resolve) => server.close(() => resolve())))

  const post = (body: unknown, origin = base) =>
    fetch(`${base}/api/playground/run`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Origin: origin },
      body: JSON.stringify(body),
    })

  it('reports the interpreters it can use', async () => {
    const body = (await (await fetch(`${base}/api/playground/status`)).json()) as {
      available: boolean
      versions: { bash: string; python: string }
    }
    expect(body.available).toBe(true)
    expect(body.versions.python).toMatch(/^Python 3/)
  })

  it('streams NDJSON events for a run', async () => {
    const response = await post({ language: 'bash', code: 'echo hi' })
    expect(response.headers.get('content-type')).toBe('application/x-ndjson')
    const events = (await response.text())
      .trim()
      .split('\n')
      .map((line) => JSON.parse(line) as RunEvent)
    expect(events.map((event) => event.type)).toEqual(['start', 'stdout', 'exit'])
    expect(events[1]).toEqual({ type: 'stdout', data: 'hi\n' })
  })

  it('refuses requests from another website', async () => {
    const response = await post({ language: 'bash', code: 'echo pwned' }, 'https://evil.example')
    expect(response.status).toBe(403)
  })

  it('rejects an unknown language', async () => {
    expect((await post({ language: 'ruby', code: 'puts 1' })).status).toBe(400)
  })
})
