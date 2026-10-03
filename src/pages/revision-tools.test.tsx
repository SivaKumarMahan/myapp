import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { App } from '../App'
import { guidedLabById } from '../content/labs'
import { loadState } from '../lib/storage'
import { TEST_EMAIL, signInForTest } from '../test/session'

const goTo = (path: string) => {
  window.history.pushState({}, '', path)
  return render(<App />)
}

describe('Revision tools', () => {
  beforeAll(async () => {
    await Promise.all([
      import('./GuidedLabsPage'),
      import('./IacComparePage'),
      import('./GlossaryPage'),
      import('./CheatSheetPage'),
    ])
  }, 20_000)

  beforeEach(() => {
    window.localStorage.clear()
    signInForTest()
  })

  it('runs a guided lab: step, verify, checklist, cleanup', async () => {
    const user = userEvent.setup()
    const lab = guidedLabById.get('az104-rbac')!
    goTo('/guided-labs/az104-rbac')
    await screen.findByRole('heading', { level: 1, name: lab.title }, { timeout: 5000 })
    const [firstDone] = screen.getAllByRole('checkbox', { name: 'Done' })
    await user.click(firstDone)
    expect(screen.getByRole('alert')).toHaveTextContent(/haven’t confirmed\s+cleanup/)

    const verifyStep = lab.steps.find((step) => step.verify)!
    const [output] = screen.getAllByLabelText('Paste the output here to check it')
    await user.click(output)
    await user.paste(verifyStep.verify!.sample)
    await user.click(screen.getAllByRole('button', { name: 'Check output' })[0])
    expect(screen.getAllByText('verified').length).toBeGreaterThan(0)

    for (const item of lab.checklist) await user.click(screen.getByRole('checkbox', { name: item }))
    await user.click(screen.getByRole('button', { name: 'I ran the cleanup' }))
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    expect(loadState(TEST_EMAIL).challenges['glab:az104-rbac']?.solvedAt).toBeTypeOf('number')
  })

  it('highlights a concept across ARM, Bicep and Terraform', async () => {
    const user = userEvent.setup()
    goTo('/iac?resource=storage')
    await user.click(
      await screen.findByRole('button', { name: 'Anonymous blob access' }, { timeout: 5000 }),
    )
    expect(screen.getByRole('status')).toHaveTextContent(/allow_nested_items_to_be_public/)
    for (const name of [/ARM JSON/, /Bicep/, /Terraform/]) {
      const pane = screen.getByLabelText(new RegExp(`Storage account in ${name.source}`))
      expect(pane.querySelectorAll('.iac-line.is-hit').length).toBeGreaterThan(0)
    }
  })

  it('searches the glossary and shows related lessons', async () => {
    const user = userEvent.setup()
    goTo('/glossary')
    await user.type(
      await screen.findByRole('searchbox', { name: 'Search the glossary' }, { timeout: 5000 }),
      'NSG',
    )
    await user.click(screen.getByRole('button', { name: 'NSG' }))
    expect(screen.getAllByRole('link', { name: /📘/ }).length).toBeGreaterThan(0)
  })

  it('links glossary terms inside a lesson', async () => {
    const user = userEvent.setup()
    goTo('/az104/topics/az1-nsg-bastion')
    const terms = await screen.findAllByRole(
      'button',
      { name: /^(NSG|network security group)s?$/i },
      { timeout: 5000 },
    )
    await user.click(terms[0])
    expect(screen.getByRole('note')).toHaveTextContent(/stateful allow\/deny rules/)
  })

  it('prints a cheat sheet for a domain', async () => {
    const user = userEvent.setup()
    const print = vi.spyOn(window, 'print').mockImplementation(() => undefined)
    goTo('/az104/cheatsheet')
    await screen.findByRole('heading', { level: 1, name: 'AZ-104 cheat sheets' }, { timeout: 5000 })
    expect(screen.getAllByRole('article').length).toBe(1)
    await user.selectOptions(screen.getByRole('combobox', { name: 'Domain' }), 'all')
    expect(screen.getAllByRole('article').length).toBeGreaterThan(1)
    await user.click(screen.getByRole('button', { name: /Print/ }))
    expect(print).toHaveBeenCalled()
  })
})
