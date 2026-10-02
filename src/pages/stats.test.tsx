import { beforeEach, describe, expect, it } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { App } from '../App'
import { loadState } from '../lib/storage'
import { localDay } from '../lib/srs'
import { TEST_EMAIL, signInForTest } from '../test/session'

const goTo = (path: string) => {
  window.history.pushState({}, '', path)
  return render(<App />)
}

describe('my stats', () => {
  beforeEach(() => {
    window.localStorage.clear()
    signInForTest()
  })

  it('shows the weak-area heatmap and a study-next suggestion for a course', async () => {
    const user = userEvent.setup()
    goTo('/az900/stats')
    expect(await screen.findByRole('heading', { level: 1, name: /az-900 stats/i })).toBeVisible()

    const table = screen.getByRole('table', { name: /accuracy, mock-exam score/i })
    expect(within(table).getByRole('rowheader', { name: /cloud concepts/i })).toBeVisible()
    expect(within(table).getAllByText(/⚠ focus/i).length).toBeGreaterThan(0)

    // The tooltip explains the score.
    await user.hover(screen.getByRole('button', { name: /how the readiness score is calculated/i }))
    expect(screen.getByRole('tooltip')).toHaveTextContent(/40% practice/i)

    await user.click(screen.getByRole('link', { name: 'Study this next' }))
    expect(window.location.pathname).toBe('/az900')
    expect(window.location.hash).toMatch(/^#domain-az9-/)
  })

  it('turns an exam date into a daily plan', async () => {
    const user = userEvent.setup()
    goTo('/az900/stats')
    const date = await screen.findByLabelText(/az-900 exam date/i)
    const inTenDays = localDay(Date.now() + 10 * 86_400_000)
    await user.type(date, inTenDays)

    expect(await screen.findByText(/days to go/i)).toBeVisible()
    expect(screen.getByText(/lessons? a day/i)).toBeVisible()
    expect(loadState(TEST_EMAIL).settings.examDates.az900).toBe(inTenDays)
  })

  it('lets you set the daily goal and shows the study calendar', async () => {
    const user = userEvent.setup()
    goTo('/stats')
    expect(await screen.findByRole('heading', { level: 1, name: /my stats/i })).toBeVisible()
    expect(screen.getByText(/study activity, last 52 weeks/i)).toBeVisible()

    await user.selectOptions(screen.getByLabelText(/goal type/i), 'minutes')
    const target = screen.getByLabelText(/target per day/i)
    await user.clear(target)
    await user.type(target, '30')
    expect(loadState(TEST_EMAIL).settings.dailyGoal).toEqual({ kind: 'minutes', target: 30 })
    expect(screen.getByText(/0 of 30 minutes today/i)).toBeVisible()
  })

  it('counts answered practice questions as today’s activity', async () => {
    const user = userEvent.setup()
    goTo('/review')
    await user.click(await screen.findByRole('button', { name: 'Interview questions' }))
    await user.click(screen.getByRole('button', { name: /show the answer|check my answer/i }))
    await user.click(screen.getByRole('button', { name: /good/i }))
    expect(loadState(TEST_EMAIL).activity[localDay()].questions).toBe(1)
  })
})
