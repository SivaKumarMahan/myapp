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

const JD = `Senior DevOps Engineer
Must have: Kubernetes, Terraform and Azure DevOps.
Nice to have: Pulumi.`

describe('Job description prep', () => {
  beforeAll(async () => {
    await import('./JdPrepPage')
  }, 20_000)

  beforeEach(() => {
    window.localStorage.clear()
    signInForTest()
  })

  it('turns a pasted JD into questions, web searches and a prep pack', async () => {
    const user = userEvent.setup()
    goTo('/interview/jd')
    await screen.findByRole(
      'heading',
      { level: 1, name: 'Job description prep' },
      { timeout: 5000 },
    )

    await user.type(screen.getByRole('textbox', { name: /Company and role/ }), 'Contoso')
    await user.click(screen.getByRole('textbox', { name: 'Job description' }))
    await user.paste(JD)

    expect(
      await screen.findByRole('heading', { name: '4 skills in this job description' }),
    ).toBeInTheDocument()

    const kubernetes = screen.getByRole('article', { name: 'Kubernetes' })
    expect(within(kubernetes).getByText(/questions? in your app/)).toBeInTheDocument()
    expect(within(kubernetes).getAllByRole('button', { name: /Show the answer/ }).length).toBe(3)

    const pulumi = screen.getByRole('article', { name: 'Pulumi' })
    const google = within(pulumi).getByRole('link', { name: /Google/ })
    expect(google).toHaveAttribute('target', '_blank')
    expect(google.getAttribute('href')).toContain('google.com/search?q=Pulumi')

    await user.type(screen.getByRole('textbox', { name: 'Skill to add' }), 'k8s')
    await user.click(screen.getByRole('button', { name: 'Add skill' }))
    expect(screen.getAllByRole('article', { name: 'Kubernetes' })).toHaveLength(1)
    await user.type(screen.getByRole('textbox', { name: 'Skill to add' }), 'Spinnaker')
    await user.click(screen.getByRole('button', { name: 'Add skill' }))
    expect(
      within(screen.getByRole('article', { name: 'Spinnaker' })).getByText('Not in the app yet'),
    ).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Hide Pulumi' }))
    expect(screen.queryByRole('article', { name: 'Pulumi' })).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /Save as prep pack/ }))
    expect(await screen.findByRole('status')).toHaveTextContent('JD: Contoso')
    const tagged = Object.values(loadState(TEST_EMAIL).questionTags).filter((tags) =>
      tags.includes('JD: Contoso'),
    )
    expect(tagged.length).toBeGreaterThan(10)
  })

  it('is linked from the interview hub', async () => {
    goTo('/interview')
    expect(
      await screen.findByRole('link', { name: /Job description prep/ }, { timeout: 5000 }),
    ).toHaveAttribute('href', '/interview/jd')
  })
})
