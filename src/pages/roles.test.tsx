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

describe('Roles & skills', () => {
  beforeAll(async () => {
    await import('./RolesPages')
  }, 20_000)

  beforeEach(() => {
    window.localStorage.clear()
    signInForTest()
  })

  it('shows the ten roles with coverage', async () => {
    goTo('/roles')
    expect(
      await screen.findByRole('heading', { level: 1, name: 'Roles & skills' }, { timeout: 5000 }),
    ).toBeVisible()
    expect(screen.getAllByRole('link', { name: /Site Reliability Engineer/ })[0]).toHaveAttribute(
      'href',
      '/roles/sre',
    )
    expect(screen.getByText('Core skills with no content in the app yet')).toBeInTheDocument()
    expect(screen.getAllByText('Core skills covered')).toHaveLength(10)
  })

  it('shows a role with its learning path and practise links', async () => {
    goTo('/roles/sre')
    expect(
      await screen.findByRole(
        'heading',
        { level: 1, name: /Site Reliability Engineer/ },
        { timeout: 5000 },
      ),
    ).toBeVisible()
    expect(screen.getByRole('heading', { name: 'Learning path' })).toBeVisible()
    expect(screen.getAllByRole('link', { name: /Practise this/ }).length).toBeGreaterThan(3)
  })

  it('ticks a skill in My fit, saves it and raises the match', async () => {
    const user = userEvent.setup()
    goTo('/roles/fit')
    await screen.findByRole('heading', { level: 1, name: 'My fit' }, { timeout: 5000 })
    await user.type(screen.getByLabelText('Filter skills'), 'prometheus')
    await user.click(screen.getByRole('checkbox', { name: /Prometheus & PromQL/ }))
    expect(loadState(TEST_EMAIL).skills.prometheus).toBeTypeOf('number')
    expect(screen.getByText(/1 skills ticked/)).toBeInTheDocument()
  })

  it('opens the tools behind a matrix cell', async () => {
    const user = userEvent.setup()
    goTo('/roles/matrix')
    await screen.findByRole('heading', { level: 1, name: 'Skills matrix' }, { timeout: 5000 })
    await user.click(
      screen.getByRole('button', {
        name: /Site Reliability Engineer \(SRE\), Monitoring & observability: Core/,
      }),
    )
    const panel = screen
      .getByRole('heading', { name: /Monitoring & observability/, level: 2 })
      .closest('section') as HTMLElement
    expect(within(panel).getByText(/Prometheus & PromQL/)).toBeInTheDocument()
  })

  it('compares roles and looks up a tool', async () => {
    goTo('/roles/compare?roles=devops-engineer,sre')
    expect(
      await screen.findByRole('heading', { name: /Shared skills/ }, { timeout: 5000 }),
    ).toBeVisible()
    window.history.pushState({}, '', '/roles/tools?q=helm')
    goTo('/roles/tools?q=helm')
    expect((await screen.findAllByRole('heading', { name: 'Helm' })).length).toBeGreaterThan(0)
  })
})
