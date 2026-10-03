import { allInterviewQuestions } from '../../../content/interview'
import { buildQueue } from '../../review-deck'
import { RATING_CHIPS, type StudyBot } from '../engine'
import type { Intent } from '../intents'
import { scoreAnswer } from '../scoring'
import { normalize } from '../text'

const SESSION_LENGTH = 6
const ANSWERABLE = new Set(['open', 'scenario'])

/** A random but repeatable-per-minute shuffle. */
function shuffle<T>(items: T[], seed: number): T[] {
  const copy = [...items]
  let state = seed % 2147483647 || 1
  for (let i = copy.length - 1; i > 0; i -= 1) {
    state = (state * 16807) % 2147483647
    const j = state % (i + 1)
    ;[copy[i], copy[j]] = [copy[j], copy[i]]
  }
  return copy
}

/** Picks the session's questions: due cards first, then matching questions. */
export function pickQuestions(
  bot: StudyBot,
  intent: Extract<Intent, { kind: 'mock' }>,
): { ids: string[]; label: string } {
  const level = intent.level === 'advanced' ? 'senior' : intent.level
  const wanted = intent.topic ? normalize(intent.topic) : ''
  // A topic name wins over tags: "networking" means the networking topic, not
  // every question that happens to be tagged networking.
  const byTopic = wanted
    ? new Set(
        allInterviewQuestions
          .filter(({ topic }) =>
            normalize(`${topic.id} ${topic.title} ${topic.shortTitle}`).includes(wanted),
          )
          .map(({ topic }) => topic.id),
      )
    : new Set<string>()
  const pool = allInterviewQuestions.filter(({ question, topic }) => {
    if (!ANSWERABLE.has(question.kind)) return false
    if (level && (level === 'senior' ? question.level !== 'advanced' : question.level !== level))
      return false
    if (!wanted) return true
    if (byTopic.size > 0) return byTopic.has(topic.id)
    return normalize(question.tags.join(' ')).includes(wanted)
  })
  const due = new Set(
    buildQueue(bot.context.state(), 'interview', bot.context.now()).due.map((id) => id.slice(4)),
  )
  const dueFirst = pool.filter(({ question }) => due.has(question.id))
  const rest = shuffle(
    pool.filter(({ question }) => !due.has(question.id)),
    Math.floor(bot.context.now() / 60_000),
  )
  const ids = (intent.due ? dueFirst : [...dueFirst, ...rest])
    .slice(0, SESSION_LENGTH)
    .map(({ question }) => question.id)
  const label = [intent.due ? 'due' : null, level, intent.topic ? `"${intent.topic}"` : null]
    .filter(Boolean)
    .join(' ')
  return { ids, label }
}

export const mock = {
  async start(bot: StudyBot, intent: Extract<Intent, { kind: 'mock' }>) {
    const { ids, label } = pickQuestions(bot, intent)
    if (ids.length === 0) {
      bot.say(
        intent.due
          ? 'No interview cards are due right now - nice! Try **/mock** for a normal session.'
          : `I couldn't find questions matching ${label}. Try a broader topic.`,
      )
      return
    }
    bot.mockRun = { ids, index: 0, stage: 'main', results: [], followUp: null }
    bot.say(
      `Mock interview: ${ids.length} ${label ? `${label} ` : ''}questions. Answer as you would out loud - I'll score the key points, then ask a follow-up. Say **hint** if you're stuck, **skip** to move on, **stop** to finish.`,
    )
    await mock.ask(bot)
  },

  async ask(bot: StudyBot) {
    const run = bot.mockRun
    if (!run) return
    const question = await bot.open(
      run.ids[run.index],
      `Question ${run.index + 1} of ${run.ids.length}`,
    )
    run.stage = 'main'
    run.followUp = null
    bot.awaiting = question ? 'mock-main' : null
    bot.chips(
      { label: 'Hint', send: '/hint' },
      { label: 'Skip', send: '/skip' },
      { label: 'Stop', send: '/stop' },
    )
  },

  answer(bot: StudyBot, text: string) {
    const run = bot.mockRun
    const question = bot.current
    if (!run || !question) return
    if (bot.awaiting === 'mock-follow' && run.followUp) {
      bot.awaiting = null
      const followUp = run.followUp
      if (followUp.keyPoints.length) {
        const result = scoreAnswer(text, followUp.keyPoints)
        bot.lastScore = {
          questionId: question.id,
          keyPoints: followUp.keyPoints,
          result,
          rateable: false,
        }
        bot.show({
          type: 'score',
          result,
          keyPoints: followUp.keyPoints,
          title: 'Follow-up',
          selfCheck: true,
        })
      }
      if (followUp.shortAnswer)
        bot.show({ type: 'answer', title: 'A good follow-up answer', text: followUp.shortAnswer })
      else
        bot.say(
          'I have no model answer for that follow-up - compare with your notes, or search for it later.',
        )
      run.stage = 'done-follow'
      bot.chips({
        label: run.index + 1 < run.ids.length ? 'Next question' : 'Finish',
        send: '/skip',
        primary: true,
      })
      return
    }
    bot.awaiting = null
    const result = scoreAnswer(text, question.keyPoints, question.commonMistakes)
    run.results.push({
      id: question.id,
      prompt: question.prompt,
      score: result.score,
      missed: result.missed.map((point) => point.point),
    })
    bot.lastScore = {
      questionId: question.id,
      keyPoints: question.keyPoints,
      result,
      rateable: true,
    }
    bot.show({
      type: 'score',
      result,
      keyPoints: question.keyPoints,
      title: `Score: ${result.score}%`,
      selfCheck: true,
    })
    for (const mistake of result.mistakes)
      bot.say(`⚠️ **Watch out:** ${mistake.mistake} ${mistake.correction}`)
    run.stage = 'rate'
    bot.say(
      `Rate it to schedule your next review - I suggest **${['', 'Again', 'Hard', 'Good', 'Easy'][result.suggested]}**.`,
    )
    bot.chips(...RATING_CHIPS(result.suggested), { label: 'Skip rating', send: '/skip' })
  },

  /** After a rating: ask a follow-up if there is one, else move on. */
  afterRating(bot: StudyBot): void | Promise<void> {
    const run = bot.mockRun
    const question = bot.current
    if (!run || !question) return
    const followUp = question.followUps[run.index % Math.max(1, question.followUps.length)] ?? null
    if (followUp) {
      run.followUp = followUp
      run.stage = 'follow'
      bot.awaiting = 'mock-follow'
      bot.say(`**Follow-up:** ${followUp.question}`)
      bot.chips({ label: 'Skip follow-up', send: '/skip' })
      return
    }
    return mock.next(bot, false)
  },

  async next(bot: StudyBot, skipped: boolean): Promise<void> {
    const run = bot.mockRun
    if (!run) return
    if (skipped && run.stage === 'main' && bot.current) {
      run.results.push({ id: bot.current.id, prompt: bot.current.prompt, score: null, missed: [] })
    }
    if (skipped && run.stage === 'rate') return mock.afterRating(bot)
    bot.awaiting = null
    run.index += 1
    if (run.index >= run.ids.length) return mock.finish(bot)
    await mock.ask(bot)
  },

  finish(bot: StudyBot) {
    const run = bot.mockRun
    bot.mockRun = null
    bot.awaiting = null
    if (!run || run.results.length === 0) {
      bot.say('Session ended.')
      return
    }
    const scored = run.results.filter((result) => result.score !== null) as {
      score: number
      prompt: string
      missed: string[]
    }[]
    const average = scored.length
      ? Math.round(scored.reduce((sum, result) => sum + result.score, 0) / scored.length)
      : 0
    const weakest = scored
      .filter((result) => result.score < 60)
      .flatMap((result) => result.missed.slice(0, 1))
    bot.show({
      type: 'report',
      title: 'Mock interview report',
      rows: run.results.map((result) => ({
        prompt: result.prompt,
        score: result.score,
        note: result.score === null ? 'skipped' : undefined,
      })),
      summary: `Average ${average}% over ${scored.length} answered.${weakest.length ? ` Revisit: ${weakest.slice(0, 3).join(' · ')}` : ' Strong session!'}`,
    })
    bot.current = null
    bot.chips(
      { label: 'Another round', send: '/mock', primary: true },
      { label: 'Due cards only', send: '/mock due' },
      { label: 'What should I study?', send: '/coach today' },
    )
  },
}
