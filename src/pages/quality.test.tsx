import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { App } from '../App'
import { loadState } from '../lib/storage'
import { TEST_EMAIL, signInForTest } from '../test/session'

const goTo = (path: string) => {
  window.history.pushState({}, '', path)
  return render(<App />)
}

describe('App quality', () => {
  beforeAll(async () => {
    await Promise.all([
      import('../components/CommandPalette'),
      import('./SettingsPage'),
      import('./GlossaryPage'),
    ])
  }, 30_000)

  beforeEach(() => {
    window.localStorage.clear()
    signInForTest()
  })

  it('opens the command palette with Ctrl+K, navigates with the keyboard, and returns focus', async () => {
    const user = userEvent.setup()
    goTo('/')
    const trigger = await screen.findByRole(
      'button',
      { name: /Search everything/ },
      { timeout: 5000 },
    )
    trigger.focus()
    await user.keyboard('{Control>}k{/Control}')
    const input = await screen.findByRole('combobox', { name: /Search lessons/ }, { timeout: 8000 })
    expect(input).toHaveFocus()
    await user.type(input, 'glossary')
    await waitFor(() => expect(screen.getAllByRole('option').length).toBeGreaterThan(0))
    expect(screen.getAllByRole('option')[0]).toHaveAttribute('aria-selected', 'true')
    await user.keyboard('{Enter}')
    expect(
      await screen.findByRole('heading', { level: 1, name: 'Glossary' }, { timeout: 5000 }),
    ).toBeInTheDocument()
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /Search everything/ }))
    await screen.findByRole('dialog', {}, { timeout: 5000 })
    await user.tab()
    expect(screen.getByRole('button', { name: 'Close search' })).toHaveFocus()
    await user.tab()
    expect(screen.getByRole('combobox', { name: /Search lessons/ })).toHaveFocus()
    await user.keyboard('{Escape}')
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    await waitFor(() =>
      expect(screen.getByRole('button', { name: /Search everything/ })).toHaveFocus(),
    )
  })

  it('changes study settings and guards the reset', async () => {
    const user = userEvent.setup()
    goTo('/settings')
    const cards = await screen.findByLabelText('New flashcards per day', {}, { timeout: 5000 })
    await user.clear(cards)
    await user.type(cards, '35')
    expect(loadState(TEST_EMAIL).settings.newCardsPerDay).toBe(35)
    await user.click(screen.getByRole('button', { name: 'Dark' }))
    expect(loadState(TEST_EMAIL).theme).toBe('dark')
    const reset = screen.getByRole('button', { name: 'Reset all progress' })
    expect(reset).toBeDisabled()
    await user.type(screen.getByLabelText(/Type RESET/), 'RESET')
    expect(reset).toBeEnabled()
  })

  it('never puts the sync token in the progress record', async () => {
    // No real network: GitHub answers 401.
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response('{}', { status: 401 })),
    )
    const user = userEvent.setup()
    goTo('/settings')
    await user.type(
      await screen.findByLabelText(/Personal access token/, {}, { timeout: 5000 }),
      'ghp_secret',
    )
    await user.click(screen.getByRole('button', { name: 'Save and sync' }))
    expect(await screen.findByRole('status', {}, { timeout: 5000 })).toHaveTextContent(/401/)
    vi.unstubAllGlobals()
    expect(JSON.stringify(loadState(TEST_EMAIL))).not.toContain('ghp_secret')
    expect(screen.getByRole('button', { name: 'Forget token' })).toBeInTheDocument()
  })
})
