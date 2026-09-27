import { beforeEach, describe, expect, it } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { App } from '../App'
import { loadState } from '../lib/storage'
import { az900Course } from '../content/courses'
import { signInForTest } from '../test/session'

/*
 * Questions are picked from the content rather than hard-coded by id, so
 * adding or reordering questions does not break the scoring tests.
 */
const DOMAIN = 'az9-cloud'
const domainQuestions = az900Course.questions.filter((question) => question.domainId === DOMAIN)
const firstMcq = domainQuestions.find((question) => question.kind === 'mcq')
if (!firstMcq || firstMcq.kind !== 'mcq') throw new Error('expected an mcq in az9-cloud')
const MCQ_ID = firstMcq.id
const MCQ_ROUTE = `/az900/practice/${DOMAIN}?q=${MCQ_ID}`
const commandQuestion = az900Course.questions.find(
  (question) => question.kind === 'command' && !/[{}[\]]/.test(question.acceptedAnswers[0] ?? ''),
)
if (!commandQuestion || commandQuestion.kind !== 'command') {
  throw new Error('expected a command question in az900')
}

const goTo = (path: string) => {
  window.history.pushState({}, '', path)
  return render(<App />)
}

describe('practice quiz scoring', () => {
  beforeEach(() => {
    window.localStorage.clear()
    signInForTest()
  })

  it('lists every domain on the practice hub with its question count', async () => {
    goTo('/az900/practice')
    expect(
      await screen.findByRole('heading', { level: 1, name: /practice questions/i }),
    ).toBeVisible()
    const main = within(screen.getByRole('main'))
    expect(main.getByRole('link', { name: /Cloud concepts/i })).toBeVisible()
    expect(main.getByRole('link', { name: /Management & governance/i })).toBeVisible()
  })

  it('hides correctness until the answer is checked, then reveals the explanation', async () => {
    const user = userEvent.setup()
    goTo(MCQ_ROUTE)

    await screen.findByRole('heading', { level: 1, name: /practise: describe cloud concepts/i })

    // Nothing about the answer is shown up front.
    expect(screen.queryByText(/^✓ Correct$/)).not.toBeInTheDocument()
    expect(screen.queryByText(/💡/)).not.toBeInTheDocument()

    const question = firstMcq
    if (question.kind !== 'mcq') throw new Error('expected a single-answer question')

    const correctOption = question.options.find((option) => option.id === question.correct[0])
    await user.click(screen.getByLabelText(correctOption!.text))
    await user.click(screen.getByRole('button', { name: /check answer/i }))

    expect(await screen.findByText(/^✓ Correct$/)).toBeVisible()
    expect(
      screen.getByText(
        new RegExp(question.explanation.slice(0, 40).replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i'),
      ),
    ).toBeVisible()
  })

  it('records a correct answer in stored progress', async () => {
    const user = userEvent.setup()
    goTo(MCQ_ROUTE)
    await screen.findByRole('heading', { level: 1, name: /practise:/i })

    const question = firstMcq
    if (question.kind !== 'mcq') throw new Error('expected an mcq')
    const correct = question.options.find((option) => option.id === question.correct[0])!

    await user.click(screen.getByLabelText(correct.text))
    await user.click(screen.getByRole('button', { name: /check answer/i }))

    await vi.waitFor(() => {
      expect(loadState().questions[MCQ_ID]?.lastCorrect).toBe(true)
    })
    expect(loadState().questions[MCQ_ID].attempts).toBe(1)
    expect(loadState().questions[MCQ_ID].correctCount).toBe(1)
  })

  it('records an incorrect answer and queues it for retry', async () => {
    const user = userEvent.setup()
    goTo(MCQ_ROUTE)
    await screen.findByRole('heading', { level: 1, name: /practise:/i })

    const question = firstMcq
    if (question.kind !== 'mcq') throw new Error('expected an mcq')
    const wrong = question.options.find((option) => !question.correct.includes(option.id))!

    await user.click(screen.getByLabelText(wrong.text))
    await user.click(screen.getByRole('button', { name: /check answer/i }))

    expect(await screen.findByText(/^✗ Incorrect$/)).toBeVisible()
    await vi.waitFor(() => {
      expect(loadState().questions[MCQ_ID]?.lastCorrect).toBe(false)
    })

    // The practice hub then offers a retry set containing it.
    window.history.pushState({}, '', '/az900/practice')
    render(<App />)
    expect(await screen.findByRole('link', { name: /retry 1 incorrect question/i })).toBeVisible()
  })

  it('drills only the incorrect questions in the retry set', async () => {
    const user = userEvent.setup()
    goTo(MCQ_ROUTE)
    await screen.findByRole('heading', { level: 1, name: /practise:/i })

    const question = firstMcq
    if (question.kind !== 'mcq') throw new Error('expected an mcq')
    const wrong = question.options.find((option) => !question.correct.includes(option.id))!
    await user.click(screen.getByLabelText(wrong.text))
    await user.click(screen.getByRole('button', { name: /check answer/i }))
    await vi.waitFor(() => expect(loadState().questions[MCQ_ID].lastCorrect).toBe(false))

    window.history.pushState({}, '', '/az900/practice/review')
    render(<App />)
    expect(
      await screen.findByRole('heading', { level: 1, name: /retry incorrect questions/i }),
    ).toBeVisible()
    // Exactly one question is in the retry set.
    expect(screen.getByText('1 of 1')).toBeVisible()
  })

  it('shows an encouraging empty state when there is nothing to retry', async () => {
    goTo('/az900/practice/review')
    expect(await screen.findByText(/nothing to retry/i)).toBeVisible()
  })

  it('normalises formatting on a command answer', async () => {
    const user = userEvent.setup()
    goTo(`/az900/practice/${commandQuestion.domainId}?q=${commandQuestion.id}`)
    await screen.findByRole('heading', { level: 1, name: /practise:/i })

    const input = screen.getByLabelText(/your command/i)
    // Shouted, with doubled spaces and padding - none of which should matter.
    const messy = `   ${commandQuestion.acceptedAnswers[0].toUpperCase().split(' ').join('   ')}  `
    await user.type(input, messy)
    await user.click(screen.getByRole('button', { name: /check answer/i }))

    expect(await screen.findByText(/^✓ Correct$/)).toBeVisible()
  })

  it('lets the learner reset a question and try again', async () => {
    const user = userEvent.setup()
    goTo(MCQ_ROUTE)
    await screen.findByRole('heading', { level: 1, name: /practise:/i })

    const question = firstMcq
    if (question.kind !== 'mcq') throw new Error('expected an mcq')
    const wrong = question.options.find((option) => !question.correct.includes(option.id))!
    await user.click(screen.getByLabelText(wrong.text))
    await user.click(screen.getByRole('button', { name: /check answer/i }))
    await screen.findByText(/^✗ Incorrect$/)

    await user.click(screen.getByRole('button', { name: /reset this question/i }))
    expect(screen.queryByText(/^✗ Incorrect$/)).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: /check answer/i })).toBeVisible()
    await vi.waitFor(() => {
      expect(loadState().questions[MCQ_ID]).toBeUndefined()
    })
  })

  it('scores a multi-answer question all-or-nothing', async () => {
    const user = userEvent.setup()
    const multi = domainQuestions.find((candidate) => candidate.kind === 'multi')
    if (!multi || multi.kind !== 'multi') throw new Error('expected a multi-answer question')

    goTo(`/az900/practice/${DOMAIN}?q=${multi.id}`)
    await screen.findByRole('heading', { level: 1, name: /practise:/i })

    // Select only one of the correct options.
    const partial = multi.options.find((option) => option.id === multi.correct[0])!
    await user.click(screen.getByLabelText(partial.text))
    await user.click(screen.getByRole('button', { name: /check answer/i }))

    expect(await screen.findByText(/^✗ Incorrect$/)).toBeVisible()
  })

  it('links each question to the lesson that teaches it', async () => {
    goTo(`/az900/practice/${DOMAIN}`)
    await screen.findByRole('heading', { level: 1, name: /practise:/i })
    const link = screen.getByRole('link', { name: /read the lesson for this question/i })
    expect(link).toHaveAttribute('href', expect.stringContaining('/az900/topics/'))
  })

  it('navigates between questions with the numbered dots', async () => {
    const user = userEvent.setup()
    goTo(`/az900/practice/${DOMAIN}`)
    await screen.findByRole('heading', { level: 1, name: /practise:/i })

    expect(screen.getByText(`1 of ${domainQuestions.length}`)).toBeVisible()
    const nav = screen.getByRole('list', { name: /question navigation/i })
    await user.click(within(nav).getByRole('button', { name: /go to question 3/i }))
    expect(screen.getByText(`3 of ${domainQuestions.length}`)).toBeVisible()
  })
})
