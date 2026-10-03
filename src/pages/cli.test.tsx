import { beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { App } from '../App'
import { loadState } from '../lib/storage'
import { TEST_EMAIL, signInForTest } from '../test/session'

const goTo = (path: string) => {
  window.history.pushState({}, '', path)
  return render(<App />)
}

describe('Azure CLI simulator', () => {
  // The page is lazy-loaded; load it once up front so the first test does
  // not spend its find timeout on the import when the machine is busy.
  beforeAll(async () => {
    await import('./CliPage')
  }, 20_000)

  beforeEach(() => {
    window.localStorage.clear()
    signInForTest()
  })

  it('runs az commands and shows the resources they create', async () => {
    const user = userEvent.setup()
    goTo('/cli')
    const input = await screen.findByRole('textbox', { name: 'Command' }, { timeout: 5000 })
    await user.type(input, 'az group create -n rg-demo -l uksouth{Enter}')
    const log = screen.getByRole('log')
    expect(within(log).getByText(/"provisioningState": "Succeeded"/)).toBeInTheDocument()
    const resources = screen.getByRole('region', { name: /your simulated resources/i })
    expect(within(resources).getByText(/rg-demo/)).toBeVisible()

    await user.type(input, 'az group creat{Enter}')
    expect(
      within(log).getByText(/'creat' is not in the 'az group' command group/),
    ).toBeInTheDocument()
  })

  it('completes with Tab and walks history with the arrow keys', async () => {
    const user = userEvent.setup()
    goTo('/cli')
    const input = await screen.findByRole('textbox', { name: 'Command' }, { timeout: 5000 })
    await user.type(input, 'az netw')
    await user.keyboard('{Tab}')
    expect(input).toHaveValue('az network ')
    await user.clear(input)
    await user.type(input, 'echo one{Enter}')
    await user.keyboard('{ArrowUp}')
    expect(input).toHaveValue('echo one')
  })

  it('asks before deleting', async () => {
    const user = userEvent.setup()
    goTo('/cli')
    const input = await screen.findByRole('textbox', { name: 'Command' }, { timeout: 5000 })
    await user.type(input, 'az group create -n rg-gone -l uksouth{Enter}')
    await user.type(input, 'az group delete -n rg-gone{Enter}')
    expect(
      screen.getByText(/Are you sure you want to perform this operation/, { selector: 'label' }),
    ).toBeVisible()
    await user.type(input, 'y{Enter}')
    expect(
      within(screen.getByRole('region', { name: /your simulated resources/i })).getByText(
        /Nothing yet/,
      ),
    ).toBeVisible()
  })

  it('completes a mission and records it', async () => {
    const user = userEvent.setup()
    goTo('/cli')
    await user.click(await screen.findByRole('button', { name: /your first resource group/i }))
    const checks = screen.getByRole('list', { name: 'Checks' })
    expect(within(checks).getAllByText(/not yet/)).toHaveLength(3)
    const input = screen.getByRole('textbox', { name: 'Command' })
    await user.type(input, 'az group create --name rg-learn --location uksouth{Enter}')
    await user.type(input, 'az group list -o table{Enter}')
    expect(await screen.findByText(/Mission complete/)).toBeVisible()
    expect(loadState(TEST_EMAIL).challenges['cli:first-resource-group'].solvedAt).toBeDefined()
  })

  it('switches to PowerShell', async () => {
    const user = userEvent.setup()
    goTo('/cli')
    await user.click(await screen.findByRole('button', { name: 'PowerShell (Az)' }))
    const input = screen.getByRole('textbox', { name: 'Command' })
    expect(screen.getByText('PS /home/learner>', { selector: 'label' })).toBeVisible()
    await user.type(input, 'New-AzResourceGroup -Name rg-ps -Location northeurope{Enter}')
    expect(screen.getByText(/ResourceGroupName : rg-ps/)).toBeInTheDocument()
  })
})
