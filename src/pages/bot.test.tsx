import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { App } from '../App'
import { signInForTest } from '../test/session'

const renderApp = (path: string) => {
  window.history.pushState({}, '', path)
  return render(<App />)
}

describe('Study bot page', () => {
  beforeAll(async () => {
    await import('./BotPage')
  })
  beforeEach(() => {
    window.localStorage.clear()
    signInForTest()
  })

  it('greets, then runs a mock interview from a chip', async () => {
    const user = userEvent.setup()
    renderApp('/bot')
    expect(await screen.findByText(/offline study bot/i, {}, { timeout: 5000 })).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: /Mock interview/ }))
    expect(await screen.findByText(/Question 1 of/)).toBeInTheDocument()
    await user.type(screen.getByLabelText('Message'), 'non-overlapping ranges{Enter}')
    await waitFor(() =>
      expect(screen.getByRole('button', { name: /Re-score with my ticks/ })).toBeInTheDocument(),
    )
    expect(screen.getByRole('button', { name: /\(suggested\)/ })).toBeInTheDocument()
  })

  it('starts from a ?say= link', async () => {
    renderApp('/bot?say=/scenario')
    expect(await screen.findByText(/Pick an incident/, {}, { timeout: 5000 })).toBeInTheDocument()
  })
})
