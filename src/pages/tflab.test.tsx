import { beforeEach, describe, expect, it } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { ProgressProvider } from '../lib/progress-provider'
import { loadState } from '../lib/storage'
import { TEST_EMAIL, signInForTest } from '../test/session'
import { TerraformLabPage } from './TerraformLabPage'

/*
 * The route is wired in App.tsx separately, so the page is rendered on its
 * own here, inside the providers it needs.
 */
const open = (path = '/terraform-lab') =>
  render(
    <MemoryRouter initialEntries={[path]}>
      <ProgressProvider userEmail={TEST_EMAIL}>
        <TerraformLabPage />
      </ProgressProvider>
    </MemoryRouter>,
  )

const LAB_KEY = `azure-learning-hub.tflab.user.${TEST_EMAIL}`

describe('Terraform plan & state lab', () => {
  beforeEach(() => {
    window.localStorage.clear()
    signInForTest()
  })

  const run = async (user: ReturnType<typeof userEvent.setup>, command: string) => {
    const input = screen.getByRole('textbox', { name: 'Command' })
    await user.clear(input)
    await user.type(input, `${command}{Enter}`)
  }

  it('opens the sandbox and lists every scenario with filters', async () => {
    const user = userEvent.setup()
    open()
    expect(
      screen.getByRole('heading', { level: 1, name: /terraform plan & state lab/i }),
    ).toBeVisible()
    expect(screen.getByText('Solved 0/13')).toBeVisible()
    const list = screen.getByRole('navigation', { name: 'Scenarios' })
    expect(within(list).getByText('13 of 13')).toBeVisible()
    await user.selectOptions(within(list).getByRole('combobox', { name: 'Category' }), 'Drift')
    expect(within(list).getByText('3 of 13')).toBeVisible()
  })

  it('runs terraform in the terminal against the sandbox', async () => {
    const user = userEvent.setup()
    open()
    await run(user, 'terraform plan')
    expect(
      await screen.findByText(/No changes. Your infrastructure matches the configuration./),
    ).toBeVisible()
    await run(user, 'terraform state list')
    expect(screen.getByText('azurerm_virtual_network.lab', { selector: '.cli-line' })).toBeVisible()
  })

  it('fails the check at first, then solves a scenario and records it', async () => {
    const user = userEvent.setup()
    open('/terraform-lab?s=rename-moved')
    expect(
      screen.getByRole('heading', { name: 'A rename that wants to delete production' }),
    ).toBeVisible()
    await user.click(screen.getByRole('button', { name: 'Check my fix' }))
    expect(screen.getByText(/Not yet/)).toBeVisible()
    expect(screen.getByText(/azurerm_storage_account.diagnostics would be created/)).toBeVisible()

    await run(
      user,
      'terraform state mv azurerm_storage_account.logs azurerm_storage_account.diagnostics',
    )
    expect(screen.getByText('Successfully moved 1 object(s).', { exact: false })).toBeVisible()
    await user.click(screen.getByRole('button', { name: 'Check my fix' }))
    expect(screen.getByText(/Fixed - the plan is clean/)).toBeVisible()

    await user.click(
      screen.getByRole('radio', { name: /Terraform tracks objects by resource address/ }),
    )
    await user.click(screen.getByRole('button', { name: 'Submit answer' }))
    expect(screen.getByText(/Correct - scenario solved/)).toBeVisible()
    expect(loadState(TEST_EMAIL).challenges['tf:rename-moved'].solvedAt).toBeDefined()
    expect(
      JSON.parse(window.localStorage.getItem(LAB_KEY) ?? '{}').solvedAt['rename-moved'],
    ).toBeDefined()
  })

  it('asks for approval before applying and remembers the environment', async () => {
    const user = userEvent.setup()
    open('/terraform-lab?s=drift-revert')
    await run(user, 'terraform apply')
    expect(screen.getByText('Enter a value:', { exact: false, selector: 'label' })).toBeVisible()
    await run(user, 'yes')
    expect(
      screen.getByText(/Apply complete! Resources: 0 added, 1 changed, 0 destroyed./),
    ).toBeVisible()
    const saved = JSON.parse(window.localStorage.getItem(LAB_KEY) ?? '{}')
    expect(saved.envs['drift-revert'].state.serial).toBeGreaterThan(42)
  })

  it('reveals hints one at a time, the solution, and the state and portal views', async () => {
    const user = userEvent.setup()
    open('/terraform-lab?s=state-lock')
    await user.click(screen.getByRole('button', { name: 'Show hint 1 of 3' }))
    expect(screen.getByText(/Hint 1:/)).toBeVisible()
    expect(screen.getByRole('button', { name: 'Show hint 2 of 3' })).toBeVisible()
    await user.click(screen.getByText('Show solution'))
    expect(screen.getByText('Step by step')).toBeVisible()
    expect(screen.getByText(/Interview follow-up/)).toBeVisible()
    expect(screen.getByRole('link', { name: /backend lock is stuck/i })).toHaveAttribute(
      'href',
      '/interview/my-terraform#itv-mytf-69',
    )
    await user.click(screen.getByRole('button', { name: /^State/ }))
    expect(screen.getByText(/Locked by AzDevOps@linux-pool-07/)).toBeVisible()
    await user.click(screen.getByRole('button', { name: 'Azure portal' }))
    expect(screen.getByText('app-checkout-prod-weu')).toBeVisible()
    await user.click(screen.getByRole('button', { name: 'Files' }))
    expect(screen.getByRole('button', { name: 'main.tf' })).toHaveAttribute('aria-pressed', 'true')
  })
})
