import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { App } from '../App'
import { pythonChallengeById } from '../content/python'
import { loadState } from '../lib/storage'
import { TEST_EMAIL, signInForTest } from '../test/session'
import type * as PythonClient from '../lib/python/client'

/*
 * Pyodide cannot run under jsdom, so the worker client is mocked: tests decide
 * what "Python" returns. The harness itself is checked against CPython in
 * src/content/python/python-content.test.ts.
 */
const python = vi.hoisted(() => ({ answer: 'right' as 'right' | 'wrong' | 'crash' }))

vi.mock('../lib/python/client', async (importOriginal) => {
  const actual = await importOriginal<typeof PythonClient>()
  const { pythonChallenges } = await import('../content/python')
  return {
    ...actual,
    pythonIsWarm: () => true,
    runPython: vi.fn(async (_code: string, options: { onEvent: (event: unknown) => void }) => {
      options.onEvent({ type: 'stdout', data: 'hello from python\n' })
      return { code: 0, durationMs: 12, timedOut: false, stopped: false }
    }),
    testPython: vi.fn(async (_code: string, fixtures: string, calls: string[]) => {
      const challenge = pythonChallenges.find((candidate) => candidate.fixtures === fixtures)!
      if (python.answer === 'crash') {
        return {
          ok: true,
          outcome: { setupError: 'NameError: name x is not defined', output: '', results: [] },
          durationMs: 5,
        }
      }
      return {
        ok: true,
        durationMs: 5,
        outcome: {
          setupError: null,
          output: '',
          results: calls.map((_, index) => ({
            value:
              python.answer === 'right' || index === 0 ? challenge.tests[index].expected : 'nope',
            error: null,
            output: '',
          })),
        },
      }
    }),
  }
})

const goTo = (path: string) => {
  window.history.pushState({}, '', path)
  return render(<App />)
}

describe('Python playground', () => {
  beforeEach(() => {
    window.localStorage.clear()
    signInForTest()
    python.answer = 'right'
  })

  it('runs code and shows its output', async () => {
    const user = userEvent.setup()
    goTo('/python')
    expect(
      await screen.findByRole('heading', { level: 1, name: /python playground/i }),
    ).toBeVisible()
    expect(screen.getByText(/kept for offline use/i)).toBeVisible()
    await user.click(screen.getByRole('button', { name: /run/i }))
    expect(await screen.findByText(/hello from python/)).toBeVisible()
    expect(screen.getByText(/Finished/)).toBeVisible()
  })

  it('solves a challenge when every test passes', async () => {
    const user = userEvent.setup()
    goTo('/python/challenges/count-status-codes')
    expect(
      await screen.findByRole('heading', { level: 1, name: /count http status codes/i }),
    ).toBeVisible()
    expect(screen.getByText(/Already defined for you/)).toHaveTextContent('SAMPLE_LOG')
    await user.click(screen.getByRole('button', { name: /run tests/i }))
    expect(await screen.findByText(/3 of 3 tests passed/)).toBeVisible()
    expect(loadState(TEST_EMAIL).challenges['py:count-status-codes'].solvedAt).toBeDefined()
  })

  it('keeps hidden test details back until the challenge is unlocked', async () => {
    const user = userEvent.setup()
    python.answer = 'wrong'
    const challenge = pythonChallengeById.get('count-status-codes')!
    const hidden = challenge.tests.find((test) => test.hidden)!
    goTo('/python/challenges/count-status-codes')
    await user.click(await screen.findByRole('button', { name: /run tests/i }))
    expect(await screen.findByText(/1 of 3 tests passed/)).toBeVisible()
    expect(screen.getAllByText(/A hidden test failed/)).toHaveLength(1)
    expect(screen.queryByText(hidden.call)).not.toBeInTheDocument()

    // A second failure unlocks the hints, the hidden details and the solution.
    await user.click(screen.getByRole('button', { name: /run tests/i }))
    expect(await screen.findByText(hidden.call)).toBeVisible()
    expect(screen.getByRole('button', { name: /show the reference solution/i })).toBeVisible()
  })

  it('shows an error raised before the tests could run', async () => {
    const user = userEvent.setup()
    python.answer = 'crash'
    goTo('/python/challenges/top-ips')
    await user.click(await screen.findByRole('button', { name: /run tests/i }))
    expect(await screen.findByText(/raised an error before any test could run/i)).toBeVisible()
    expect(screen.getByText(/NameError/)).toBeVisible()
  })
})
