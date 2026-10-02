import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { App } from '../App'
import { loadState } from '../lib/storage'
import { kqlEngine } from '../lib/sql/engine'
import { TEST_EMAIL, signInForTest } from '../test/session'

vi.mock('../lib/sql/engine', () => import('../test/sql-engine-stub'))

const goTo = (path: string) => {
  window.history.pushState({}, '', path)
  return render(<App />)
}

describe('KQL simulator', () => {
  beforeAll(async () => {
    await kqlEngine.schema()
  })

  beforeEach(() => {
    window.localStorage.clear()
    signInForTest()
  })

  it('runs a query, draws its chart and shows the generated SQL', async () => {
    const user = userEvent.setup()
    window.localStorage.setItem(
      'azure-learning-hub.kql-history',
      JSON.stringify([
        'requests | where success == false | summarize count() by bin(timestamp, 1h) | render timechart',
      ]),
    )
    goTo('/kql')
    expect(await screen.findByRole('heading', { level: 1, name: /kql simulator/i })).toBeVisible()
    expect(screen.getByText(/a simplified kql simulator/i)).toBeVisible()
    await user.click(screen.getByRole('button', { name: /run/i }))
    const result = screen.getByRole('region', { name: 'Result' })
    expect(
      await within(result).findByRole('img', { name: /time chart of count_/i }, { timeout: 5000 }),
    ).toBeInTheDocument()
    expect(within(result).getByRole('columnheader', { name: 'count_' })).toBeVisible()
    expect(within(result).getByText(/show the generated sql/i)).toBeInTheDocument()
  })

  it('points at the mistake in a query', async () => {
    const user = userEvent.setup()
    window.localStorage.setItem(
      'azure-learning-hub.kql-history',
      JSON.stringify(['Heartbeat\n| where computer == "x"']),
    )
    goTo('/kql')
    await user.click(await screen.findByRole('button', { name: /run/i }))
    expect(await screen.findByRole('alert')).toHaveTextContent(
      /line 2, column 9.*Did you mean 'Computer'/,
    )
  })

  it('checks a challenge against the reference answer', async () => {
    const user = userEvent.setup()
    window.localStorage.setItem(
      'azure-learning-hub.kql-draft.no-heartbeat-15m',
      JSON.stringify(
        'Heartbeat\n| summarize Last = max(TimeGenerated) by Computer\n| where Last < ago(15m)',
      ),
    )
    goTo('/kql/challenges/no-heartbeat-15m')
    await user.click(await screen.findByRole('button', { name: /check/i }))
    expect(await screen.findByText('Correct!', {}, { timeout: 5000 })).toBeVisible()
    expect(loadState(TEST_EMAIL).challenges['kql:no-heartbeat-15m'].solvedAt).toBeDefined()
  })

  it('does not accept the classic mistake of filtering before summarizing', async () => {
    const user = userEvent.setup()
    window.localStorage.setItem(
      'azure-learning-hub.kql-draft.no-heartbeat-15m',
      JSON.stringify(
        'Heartbeat\n| where TimeGenerated < ago(15m)\n| summarize LastHeartbeat = max(TimeGenerated) by Computer',
      ),
    )
    goTo('/kql/challenges/no-heartbeat-15m')
    await user.click(await screen.findByRole('button', { name: /check/i }))
    expect(await screen.findByText('Not yet.', {}, { timeout: 5000 })).toBeVisible()
    expect(screen.getByText(/Expected 2 rows; yours returned 8/)).toBeVisible()
  })
})
