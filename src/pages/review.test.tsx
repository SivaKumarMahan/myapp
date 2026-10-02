import { beforeEach, describe, expect, it } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { App } from '../App'
import { az900Course } from '../content/courses'
import { allInterviewQuestions } from '../content/interview'
import { createEmptyState, loadState, saveState } from '../lib/storage'
import type { ProgressState, Settings } from '../lib/storage'
import { interviewCardId, practiceCardId } from '../lib/srs'
import { TEST_EMAIL, signInForTest } from '../test/session'

/* Picked from the content, so adding questions does not break these tests. */
const openQuestion = allInterviewQuestions.find((entry) => entry.question.kind === 'open')
if (!openQuestion) throw new Error('expected an open interview question')
const mcq = az900Course.questions.find((question) => question.kind === 'mcq')
if (!mcq || mcq.kind !== 'mcq') throw new Error('expected an az900 mcq')
const wrongIndex = mcq.options.findIndex((option) => !mcq.correct.includes(option.id))
const rightIndex = mcq.options.findIndex((option) => mcq.correct.includes(option.id))

const goTo = (path: string) => {
  window.history.pushState({}, '', path)
  return render(<App />)
}

/** A record where only `extra` changes, written as a previous visit would have. */
const seed = (
  extra: Omit<Partial<ProgressState>, 'settings'> & { settings?: Partial<Settings> },
) => {
  const base = createEmptyState()
  saveState({ ...base, ...extra, settings: { ...base.settings, ...extra.settings } }, TEST_EMAIL)
}

describe('spaced repetition', () => {
  beforeEach(() => {
    window.localStorage.clear()
    signInForTest()
  })

  it('shows the due count on Home and opens the queue', async () => {
    const user = userEvent.setup()
    seed({ settings: { newCardsPerDay: 5 } })
    goTo('/')
    const card = (await screen.findByRole('heading', { name: /due today/i })).closest('section')
    if (!card) throw new Error('expected the Due today card')
    expect(within(card).getByText('0 due')).toBeVisible()
    expect(within(card).getByText('5 new')).toBeVisible()

    await user.click(within(card).getByRole('link', { name: /start reviewing/i }))
    expect(await screen.findByRole('heading', { level: 1, name: /due today/i })).toBeVisible()
    expect(screen.getByText(/card 1 of 5/i)).toBeVisible()
  })

  it('rates an interview card after revealing it and schedules it', async () => {
    const user = userEvent.setup()
    seed({ settings: { newCardsPerDay: 1 } })
    goTo('/review')
    await user.click(await screen.findByRole('button', { name: 'Interview questions' }))

    await user.click(screen.getByRole('button', { name: /show the answer/i }))
    const ratings = screen.getByRole('group', { name: /how well did you recall it/i })
    // Each button says when the card would come back.
    expect(within(ratings).getByRole('button', { name: /good 3d/i })).toBeVisible()
    await user.click(within(ratings).getByRole('button', { name: /good/i }))

    expect(await screen.findByText(/session complete/i)).toBeVisible()
    const state = loadState(TEST_EMAIL)
    const first = allInterviewQuestions[0].question.id
    expect(state.srs[interviewCardId(first)].lastRating).toBe(3)
    // Good also counts the question as recalled.
    expect(state.interview[first]?.status).toBe('known')
    expect(state.newCardsByDay).not.toEqual({})
  })

  it('brings a card rated Again back later in the same session', async () => {
    const user = userEvent.setup()
    seed({ settings: { newCardsPerDay: 1 } })
    goTo('/review')
    await user.click(await screen.findByRole('button', { name: 'Interview questions' }))
    await user.click(screen.getByRole('button', { name: /show the answer/i }))
    await user.click(screen.getByRole('button', { name: /again/i }))
    expect(await screen.findByText(/card 2 of 2/i)).toBeVisible()
  })

  it('starts an existing "needs review" question as due', async () => {
    seed({
      interview: { [openQuestion.question.id]: { status: 'review', updatedAt: Date.now() } },
      settings: { newCardsPerDay: 0 },
      srs: undefined as never, // as an older record would have: no cards yet
    })
    goTo('/review')
    expect(await screen.findByText('1 due')).toBeVisible()
    expect(screen.getByText(/card 1 of 1/i)).toBeVisible()
  })

  it('schedules a correct guess like a miss and files wrong answers as mistakes', async () => {
    const user = userEvent.setup()
    goTo(`/az900/practice/${mcq.domainId}?q=${mcq.id}`)
    await screen.findByRole('heading', { level: 1, name: /practise/i })

    await user.click(screen.getAllByRole('radio')[rightIndex])
    await user.click(screen.getByRole('button', { name: 'Guessed' }))
    await user.click(screen.getByRole('button', { name: /check answer/i }))
    let state = loadState(TEST_EMAIL)
    expect(state.srs[practiceCardId(mcq.id)].lastRating).toBe(1)
    expect(state.mistakes[mcq.id]).toBeUndefined()

    await user.click(screen.getByRole('button', { name: /reset this question/i }))
    await user.click(screen.getAllByRole('radio')[wrongIndex])
    await user.click(screen.getByRole('button', { name: /check answer/i }))
    state = loadState(TEST_EMAIL)
    expect(state.mistakes[mcq.id]).toMatchObject({ courseId: 'az900', source: 'practice' })
  })

  it('drills the mistake notebook and clears a mistake answered with confidence', async () => {
    const user = userEvent.setup()
    const now = Date.now()
    seed({
      mistakes: {
        [mcq.id]: {
          courseId: 'az900',
          source: 'exam',
          count: 1,
          firstWrongAt: now,
          lastWrongAt: now,
        },
      },
    })
    goTo('/mistakes')
    expect(await screen.findByText(/missed 1× · last .* in a mock exam/i)).toBeVisible()
    await user.click(screen.getByRole('link', { name: /drill 1 mistake/i }))

    expect(
      await screen.findByRole('heading', { level: 1, name: /mistake notebook/i }),
    ).toBeVisible()
    await user.click(screen.getAllByRole('radio')[rightIndex])
    await user.click(screen.getByRole('button', { name: 'Knew it' }))
    await user.click(screen.getByRole('button', { name: /check answer/i }))
    expect(loadState(TEST_EMAIL).mistakes[mcq.id]).toBeUndefined()
  })

  it('draws the 30-day forecast with a table view', async () => {
    seed({ settings: { newCardsPerDay: 0 } })
    goTo('/review')
    expect(
      await screen.findByRole('img', { name: /reviews due over the next 30 days/i }),
    ).toBeVisible()
    expect(screen.getByText(/show as a table/i)).toBeInTheDocument()
  })
})
