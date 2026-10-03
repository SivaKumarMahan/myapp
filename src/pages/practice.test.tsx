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

describe('Interview practice', () => {
  beforeAll(async () => {
    await Promise.all([
      import('./MockInterviewPage'),
      import('./StoriesPage'),
      import('./IncidentLabsPage'),
      import('./PacksPage'),
    ])
  }, 20_000)

  beforeEach(() => {
    window.localStorage.clear()
    signInForTest()
  })

  it('runs a mock interview: answer, self-score, rate, follow-up, summary', async () => {
    const user = userEvent.setup()
    goTo('/interview/mock')
    await screen.findByRole('heading', { level: 1, name: 'Mock interview' }, { timeout: 5000 })
    await user.selectOptions(screen.getByRole('combobox', { name: 'Questions' }), '1')
    await user.click(screen.getByRole('button', { name: 'Azure networking' }))
    await user.click(screen.getByRole('button', { name: 'Start the interview' }))
    await user.click(await screen.findByRole('button', { name: /Start answering/ }))
    expect(screen.getByRole('timer')).toHaveTextContent('2:00')
    await user.type(screen.getByRole('textbox'), 'subnets peering nsg private endpoint')
    await user.click(screen.getByRole('button', { name: /Done/ }))
    expect(
      await screen.findByRole('heading', { name: 'Which of these did you say?' }),
    ).toBeInTheDocument()
    await user.click(
      within(screen.getByRole('group', { name: 'Rate your answer' })).getByRole('button', {
        name: 'Good',
      }),
    )
    expect(
      Object.keys(loadState(TEST_EMAIL).srs).some((id) => id.startsWith('itv:itv-aznet-')),
    ).toBe(true)
    await user.click(screen.getByRole('button', { name: /Next: follow-up/ }))
    await user.click(await screen.findByRole('button', { name: /Start answering/ }))
    expect(screen.getByRole('timer')).toHaveTextContent('1:00')
    await user.click(screen.getByRole('button', { name: /Done/ }))
    await user.click(await screen.findByRole('button', { name: 'Finish' }))
    expect(await screen.findByRole('heading', { name: 'Mock interview: done' })).toBeInTheDocument()
  })

  it('writes a STAR story, tags it and quick-reviews it', async () => {
    const user = userEvent.setup()
    goTo('/interview/stories')
    await user.click(await screen.findByRole('button', { name: '＋ New story' }, { timeout: 5000 }))
    await user.clear(screen.getByLabelText('Title (for you)'))
    await user.type(screen.getByLabelText('Title (for you)'), 'Black Friday outage')
    await user.type(screen.getByLabelText(/^Action/), 'I rolled back the release')
    await user.click(screen.getByRole('button', { name: /Incidents: a production incident/ }))
    await new Promise((resolve) => setTimeout(resolve, 500))
    const stories = Object.values(loadState(TEST_EMAIL).stories)
    expect(stories[0].title).toBe('Black Friday outage')
    expect(stories[0].questions).toContain('incident')
    await user.click(screen.getByRole('tab', { name: 'Quick review' }))
    await user.click(screen.getByRole('button', { name: /show my story/ }))
    expect(screen.getByText('I rolled back the release')).toBeInTheDocument()
  })

  it('solves an incident lab', async () => {
    const user = userEvent.setup()
    goTo('/incidents?lab=tf-state-lock')
    await screen.findByRole('heading', { level: 1, name: /Terraform|state/i }, { timeout: 5000 })
    // Always take the first option until the lab ends.
    for (let step = 0; step < 10; step += 1) {
      const group = screen.queryByRole('group', { name: 'What do you do?' })
      if (!group) break
      await user.click(within(group).getAllByRole('button')[0])
    }
    expect(screen.getByText(/Root cause found|Wrong conclusion/)).toBeInTheDocument()
  })

  it('tags a question and shows it as a prep pack', async () => {
    const user = userEvent.setup()
    goTo('/interview/azure-networking')
    const tagButtons = await screen.findAllByRole('button', { name: '🏷 Tag' }, { timeout: 5000 })
    await user.click(tagButtons[0])
    await user.type(screen.getByRole('combobox', { name: 'New tag' }), 'Contoso{Enter}')
    expect(Object.values(loadState(TEST_EMAIL).questionTags)).toEqual([['Contoso']])
    await user.click(screen.getByRole('link', { name: '🏷 Contoso' }))
    expect(
      await screen.findByRole('heading', { level: 1, name: /Contoso/ }, { timeout: 5000 }),
    ).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Mock interview from this pack/ })).toHaveAttribute(
      'href',
      '/interview/mock?pack=tag%3AContoso',
    )
  })
})
