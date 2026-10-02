import { beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { App } from '../App'
import { cidrScenarios } from '../content/netlab'
import { loadState } from '../lib/storage'
import { TEST_EMAIL, signInForTest } from '../test/session'

const goTo = (path: string) => {
  window.history.pushState({}, '', path)
  return render(<App />)
}

describe('Networking lab', () => {
  beforeAll(async () => {
    await import('./NetworkLabPage')
  }, 20_000)

  beforeEach(() => {
    window.localStorage.clear()
    signInForTest()
  })

  it('reviews a subnet plan as you edit it', async () => {
    const user = userEvent.setup()
    goTo('/network')
    expect(
      await screen.findByRole('heading', { level: 1, name: /networking lab/i }, { timeout: 5000 }),
    ).toBeVisible()
    expect(screen.getByText(/this plan would deploy/i)).toBeVisible()
    const range = screen.getByRole('textbox', { name: 'Subnet 2 address range' })
    await user.clear(range)
    await user.type(range, '10.0.1.128/25')
    const review = screen.getByRole('region', { name: 'Plan review' })
    expect(within(review).getByText(/overlaps snet-web/)).toBeVisible()
    expect(
      screen.getByRole('img', { name: /10\.0\.0\.0\/16: 3 subnets placed/ }),
    ).toBeInTheDocument()
  })

  it('solves a subnet scenario', async () => {
    const user = userEvent.setup()
    const scenario = cidrScenarios.find((entry) => entry.id === 'smallest-vnet')!
    window.localStorage.setItem(
      `azure-learning-hub.netlab-cidr.${scenario.id}`,
      JSON.stringify(scenario.solution),
    )
    goTo('/network')
    await user.selectOptions(
      await screen.findByRole('combobox', { name: 'Scenario' }, { timeout: 5000 }),
      scenario.id,
    )
    expect(await screen.findByText('Plan approved.')).toBeVisible()
    expect(loadState(TEST_EMAIL).challenges[`net:cidr:${scenario.id}`].solvedAt).toBeDefined()
  })

  it('walks a packet through both NSGs and names the rule that decided', async () => {
    const user = userEvent.setup()
    goTo('/network?tab=nsg')
    await user.click(
      await screen.findByRole('button', { name: 'SSH from the office' }, { timeout: 5000 }),
    )
    await user.click(screen.getByRole('button', { name: 'Show all' }))
    expect(screen.getByText(/Denied by nsg-snet-web/)).toBeVisible()
    expect(screen.getAllByText(/DenyAllInBound/).length).toBeGreaterThan(0)
    await user.click(screen.getByRole('button', { name: 'HTTPS from the Internet' }))
    await user.click(screen.getByRole('button', { name: 'Show all' }))
    expect(screen.getByText('Allowed.')).toBeVisible()
  })

  it('explains why peering is not transitive', async () => {
    const user = userEvent.setup()
    goTo('/network?tab=peering')
    const reachability = await screen.findByRole(
      'region',
      { name: 'Reachability' },
      { timeout: 5000 },
    )
    expect(within(reachability).getByText(/cannot reach a VM in vnet-spoke2/)).toBeVisible()
    expect(within(reachability).getByText(/peering is not transitive/)).toBeVisible()
    await user.selectOptions(
      screen.getByRole('combobox', { name: 'Scenario' }),
      'quiz:non-transitive',
    )
    const yes = screen.getAllByRole('button', { name: 'Yes' })
    const no = screen.getAllByRole('button', { name: 'No' })
    await user.click(yes[0])
    await user.click(no[1])
    expect(screen.getByText('All correct.')).toBeVisible()
    expect(loadState(TEST_EMAIL).challenges['net:peering:non-transitive'].solvedAt).toBeDefined()
  })
})
