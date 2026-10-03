import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { App } from '../App'
import { loadState } from '../lib/storage'
import { TEST_EMAIL, signInForTest } from '../test/session'

const goTo = (path: string) => {
  window.history.pushState({}, '', path)
  return render(<App />)
}

describe('Visualise', () => {
  beforeAll(async () => {
    await Promise.all([
      import('./VisualisePage'),
      import('./visualise/RbacTab'),
      import('./visualise/DeployTab'),
      import('./visualise/GitTab'),
      import('./visualise/SlaTab'),
    ])
  }, 20_000)

  beforeEach(() => {
    window.localStorage.clear()
    signInForTest()
  })

  it('RBAC: predicts an exercise and explains the decision', async () => {
    const user = userEvent.setup()
    goTo('/visualise?tab=rbac')
    const picker = await screen.findByRole('combobox', { name: 'Exercise' }, { timeout: 5000 })
    await user.selectOptions(picker, 'pipeline-pip')
    await user.click(screen.getByRole('button', { name: 'Blocked: Azure Policy' }))
    expect(screen.getAllByText(/Correct/)[0]).toBeInTheDocument()
    expect(screen.getByRole('list', { name: 'How Azure decides' })).toHaveTextContent(
      /Deny public IP addresses/,
    )
    expect(loadState(TEST_EMAIL).challenges['viz:rbac:pipeline-pip']?.solvedAt).toBeTypeOf('number')
  })

  it('RBAC: assigning a role shows it in the tree', async () => {
    const user = userEvent.setup()
    goTo('/visualise?tab=rbac')
    await screen.findByRole('heading', { name: 'Scope hierarchy' }, { timeout: 5000 })
    await user.selectOptions(screen.getByRole('combobox', { name: 'Show access for' }), 'dave')
    await user.click(screen.getByRole('button', { name: /rg-payments-app/ }))
    await user.selectOptions(screen.getByRole('combobox', { name: 'Principal to assign' }), 'dave')
    await user.selectOptions(screen.getByRole('combobox', { name: 'Role to assign' }), 'reader')
    await user.click(screen.getByRole('button', { name: 'Assign here' }))
    expect(screen.getByRole('button', { name: /vm-pay-01.*Reader/ })).toBeInTheDocument()
  })

  it('Deployments: steps through blue-green and rolls back', async () => {
    const user = userEvent.setup()
    goTo('/visualise?tab=deploy')
    await user.click(
      await screen.findByRole('button', { name: /Next: Deploy v2/ }, { timeout: 5000 }),
    )
    await user.click(screen.getByRole('button', { name: /Next: Smoke-test/ }))
    await user.click(screen.getByRole('button', { name: /Next: Switch all traffic/ }))
    expect(screen.getByText('Traffic on v2').previousSibling).toHaveTextContent('100%')
    await user.click(screen.getByRole('button', { name: /Rollback/ }))
    expect(screen.getByText(/switch traffic back to blue - instant/)).toBeInTheDocument()
  })

  it('Git: solves an exercise by typing commands', async () => {
    const user = userEvent.setup()
    goTo('/visualise?tab=git')
    await user.selectOptions(
      await screen.findByRole('combobox', { name: /Pick one/ }, { timeout: 5000 }),
      'b-ff',
    )
    await user.type(screen.getByLabelText('Git command'), 'git merge hotfix{Enter}')
    expect(await screen.findByText(/Fast-forward to/)).toBeInTheDocument()
    expect(screen.getByText('✓ Solved!')).toBeInTheDocument()
    expect(loadState(TEST_EMAIL).challenges['viz:git:b-ff']?.solvedAt).toBeTypeOf('number')
  })

  it('SLA: computes the preset and checks an answer', async () => {
    const user = userEvent.setup()
    goTo('/visualise?tab=sla')
    expect(
      await screen.findByText('99.94%', { selector: '.sla-big' }, { timeout: 5000 }),
    ).toBeInTheDocument()
    const [first] = screen.getAllByPlaceholderText('e.g. 99.95')
    await user.type(first, '99.94')
    await user.click(screen.getAllByRole('button', { name: 'Check' })[0])
    expect(screen.getByText(/Right: 99.94%/)).toBeInTheDocument()
  })
})
