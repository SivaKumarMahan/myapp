import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { App } from '../App'
import { loadState } from '../lib/storage'
import { TEST_EMAIL, signInForTest } from '../test/session'

const goTo = (path: string) => {
  window.history.pushState({}, '', path)
  return render(<App />)
}

describe('Architecture builder', () => {
  beforeAll(async () => {
    await import('./ArchitecturePage')
  }, 20_000)

  beforeEach(() => {
    window.localStorage.clear()
    signInForTest()
  })

  it('adds and connects services, reviews them and saves the design', async () => {
    const user = userEvent.setup()
    goTo('/architecture')
    await screen.findByRole(
      'heading',
      { level: 1, name: 'Architecture builder' },
      { timeout: 5000 },
    )
    await user.click(screen.getByRole('button', { name: '＋ Users / Internet' }))
    await user.click(screen.getByRole('button', { name: '＋ Virtual machines' }))
    await user.click(screen.getByRole('button', { name: /Connect/ }))
    const canvas = screen.getByRole('group', { name: /Architecture canvas/ })
    await user.click(within(canvas).getByRole('button', { name: /Users \/ Internet/ }))
    await user.click(
      within(canvas).getByRole('button', { name: /Virtual machines, Virtual machines/ }),
    )
    const review = screen
      .getByRole('heading', { name: 'Design review' })
      .closest('section') as HTMLElement
    expect(within(review).getByText(/No WAF in front of Virtual machines/)).toBeInTheDocument()
    expect(within(review).getByText(/is not backed up/)).toBeInTheDocument()

    // Fix the backup from the inspector: that finding goes away.
    await user.click(screen.getByRole('checkbox', { name: 'Azure Backup' }))
    expect(within(review).queryByText(/is not backed up/)).not.toBeInTheDocument()

    await new Promise((resolve) => setTimeout(resolve, 500))
    const saved = Object.values(loadState(TEST_EMAIL).designs)
    expect(saved).toHaveLength(1)
    expect(saved[0].nodes).toHaveLength(2)
    expect(saved[0].edges).toHaveLength(1)
  })

  it('starts a scenario, shows its brief and the model answer', async () => {
    const user = userEvent.setup()
    goTo('/architecture')
    await user.selectOptions(
      await screen.findByRole('combobox', { name: 'Start a scenario' }, { timeout: 5000 }),
      'ha-web',
    )
    expect(screen.getByRole('list', { name: 'Brief' })).toHaveTextContent(/at least two regions/)
    await user.click(screen.getByRole('button', { name: 'Compare with the model answer' }))
    expect(screen.getByRole('group', { name: /Model answer diagram/ })).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Open a copy to edit' }))
    expect(screen.getByText('✓ Brief met')).toBeInTheDocument()
  })

  it('moves a service with the keyboard', async () => {
    const user = userEvent.setup()
    goTo('/architecture')
    await user.click(await screen.findByRole('button', { name: '＋ Key Vault' }, { timeout: 5000 }))
    const node = within(screen.getByRole('group', { name: /Architecture canvas/ })).getByRole(
      'button',
      { name: /Key Vault/ },
    )
    const before = node.querySelector('rect')?.getAttribute('x')
    node.focus()
    await user.keyboard('{ArrowRight}')
    const moved = within(screen.getByRole('group', { name: /Architecture canvas/ })).getByRole(
      'button',
      { name: /Key Vault/ },
    )
    expect(Number(moved.querySelector('rect')?.getAttribute('x'))).toBe(Number(before) + 20)
  })
})
