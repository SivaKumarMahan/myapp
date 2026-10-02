import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { App } from '../App'
import { loadState } from '../lib/storage'
import { TEST_EMAIL, signInForTest } from '../test/session'
import { sqlEngine } from '../lib/sql/engine'

vi.mock('../lib/sql/engine', () => import('../test/sql-engine-stub'))

const goTo = (path: string) => {
  window.history.pushState({}, '', path)
  return render(<App />)
}

/** The editor is CodeMirror, so tests seed the saved draft instead of typing. */
const draft = (id: string, sql: string) =>
  window.localStorage.setItem(`azure-learning-hub.sql-draft.${id}`, JSON.stringify(sql))

describe('SQL playground', () => {
  // Starting SQLite and loading the datasets is the slow part; do it once,
  // up front, so no single test's wait has to cover it on a busy CI runner.
  beforeAll(async () => {
    await sqlEngine.schema()
  })

  beforeEach(() => {
    window.localStorage.clear()
    signInForTest()
  })

  it('runs a query against the sample data and shows the rows', async () => {
    const user = userEvent.setup()
    window.localStorage.setItem(
      'azure-learning-hub.sql-history',
      JSON.stringify(['SELECT name FROM departments ORDER BY id']),
    )
    goTo('/sql')
    expect(await screen.findByRole('heading', { level: 1, name: /sql playground/i })).toBeVisible()
    await user.click(screen.getByRole('button', { name: /run/i }))
    expect(
      await screen.findByRole('cell', { name: 'Engineering' }, { timeout: 5000 }),
    ).toBeVisible()
    expect(within(screen.getByRole('region', { name: 'Result' })).getByText('6 rows')).toBeVisible()
  })

  it('shows SQL errors', async () => {
    const user = userEvent.setup()
    window.localStorage.setItem(
      'azure-learning-hub.sql-history',
      JSON.stringify(['SELECT * FROM nope']),
    )
    goTo('/sql')
    await user.click(await screen.findByRole('button', { name: /run/i }))
    expect(await screen.findByRole('alert')).toHaveTextContent(/no such table: nope/)
  })

  it('marks a challenge solved when the result matches', async () => {
    const user = userEvent.setup()
    draft(
      'second-highest-salary',
      'SELECT DISTINCT salary FROM employees ORDER BY salary DESC LIMIT 1 OFFSET 1',
    )
    goTo('/sql/challenges/second-highest-salary')
    await user.click(await screen.findByRole('button', { name: /check/i }))
    expect(await screen.findByText('Correct!')).toBeVisible()
    expect(loadState(TEST_EMAIL).challenges['sql:second-highest-salary'].solvedAt).toBeDefined()
    expect(screen.getByRole('link', { name: /next challenge/i })).toBeVisible()
  })

  it('unlocks the hints and solution after two failed checks', async () => {
    const user = userEvent.setup()
    draft('second-highest-salary', 'SELECT MAX(salary) FROM employees')
    goTo('/sql/challenges/second-highest-salary')
    const check = await screen.findByRole('button', { name: /check/i })
    expect(screen.queryByRole('button', { name: /reference solution/i })).not.toBeInTheDocument()

    await user.click(check)
    expect(await screen.findByText('Not yet.')).toBeVisible()
    await user.click(check)
    await user.click(await screen.findByRole('button', { name: /show the reference solution/i }))
    expect(screen.getByText(/Reference solution/)).toBeVisible()
    expect(loadState(TEST_EMAIL).challenges['sql:second-highest-salary']).toMatchObject({
      attempts: 2,
      failures: 2,
    })
  })

  it('lists the challenges with solved progress', async () => {
    goTo('/sql/challenges')
    expect(await screen.findByRole('heading', { level: 1, name: /sql challenges/i })).toBeVisible()
    expect(screen.getByRole('heading', { name: 'Window functions' })).toBeVisible()
    expect(screen.getByText(/0 of 26 solved/)).toBeVisible()
  })
})
