import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { App } from '../App'
import { signInForTest } from '../test/session'

const goTo = (path: string) => {
  window.history.pushState({}, '', path)
  return render(<App />)
}

const json = (body: unknown) =>
  new Response(JSON.stringify(body), { headers: { 'Content-Type': 'application/json' } })

const ndjson = (events: unknown[]) =>
  new Response(events.map((event) => JSON.stringify(event)).join('\n') + '\n', {
    headers: { 'Content-Type': 'application/x-ndjson' },
  })

describe('code playground', () => {
  beforeEach(() => {
    window.localStorage.clear()
    signInForTest()
  })

  it('runs a shell script on the local runner and shows its output', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockImplementation(async (input) => {
      const url = String(input)
      if (url.endsWith('/status')) {
        return json({
          available: true,
          workspace: '/home/me/.azure-hub-playground',
          versions: { bash: 'GNU bash, version 5.1', python: 'Python 3.10.12' },
        })
      }
      return ndjson([
        { type: 'start', cwd: '/home/me/.azure-hub-playground' },
        { type: 'stdout', data: 'hello world\n' },
        { type: 'stderr', data: 'a warning\n' },
        { type: 'exit', code: 0, signal: null, durationMs: 42, timedOut: false, truncated: false },
      ])
    })

    goTo('/playground')
    expect(await screen.findByRole('heading', { level: 1, name: /code playground/i })).toBeVisible()
    expect(await screen.findByText(/running on this machine with GNU bash/i)).toBeVisible()

    const editor = screen.getByLabelText('script.sh')
    await userEvent.clear(editor)
    await userEvent.type(editor, 'echo hello world')
    await userEvent.click(screen.getByRole('button', { name: /run/i }))

    expect(await screen.findByText('hello world')).toBeVisible()
    expect(screen.getByText('a warning')).toHaveClass('playground__stderr')
    expect(screen.getByText(/exit code 0/i)).toBeVisible()

    const runCall = fetchMock.mock.calls.find(([url]) => String(url).endsWith('/run'))
    expect(JSON.parse(String(runCall?.[1]?.body))).toEqual({
      language: 'bash',
      code: 'echo hello world',
      stdin: '',
    })
    // The run is remembered so it can be loaded again.
    expect(screen.getByRole('heading', { name: /recent runs/i })).toBeVisible()
  })

  it('explains that shell needs the local runner on the static site', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response('<!doctype html>', { headers: { 'Content-Type': 'text/html' } }),
    )

    goTo('/playground')
    expect(await screen.findByText(/shell commands need the local runner/i)).toBeVisible()
    expect(screen.getByRole('button', { name: /run/i })).toBeDisabled()

    // Python can still run, in the browser.
    await userEvent.click(screen.getByRole('button', { name: 'Python' }))
    await waitFor(() => expect(screen.getByRole('button', { name: /run/i })).toBeEnabled())
    expect(screen.getByText(/python runs in your browser/i)).toBeVisible()
  })
})
