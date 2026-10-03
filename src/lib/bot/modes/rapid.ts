import { allInterviewQuestions } from '../../../content/interview'
import { retrievability } from '../../srs'
import type { StudyBot } from '../engine'
import { scoreAnswer } from '../scoring'

const QUESTIONS = 8
export const RAPID_SECONDS = 25

/** Rapid-fire: short timed answers on the cards you are most likely to have forgotten. */
export const rapid = {
  async start(bot: StudyBot) {
    const state = bot.context.state()
    const now = bot.context.now()
    const answerable = new Set(
      allInterviewQuestions
        .filter(({ question }) => question.kind === 'open' || question.kind === 'scenario')
        .map(({ question }) => question.id),
    )
    const lowRetention = Object.entries(state.srs)
      .filter(([id]) => id.startsWith('itv:') && answerable.has(id.slice(4)))
      .map(([id, card]) => ({
        id: id.slice(4),
        recall:
          retrievability(Math.max(0, (now - card.lastReview) / 86_400_000), card.stability) -
          card.lapses * 0.1,
      }))
      .sort((a, b) => a.recall - b.recall)
      .map((entry) => entry.id)
    const flagged = Object.entries(state.interview)
      .filter(([id, entry]) => entry.status === 'review' && answerable.has(id))
      .map(([id]) => id)
    const fill = [...answerable].sort(() => 0.5 - (now % 997) / 997)
    const ids = [...new Set([...lowRetention, ...flagged, ...fill])].slice(0, QUESTIONS)
    bot.rapidRun = { ids, index: 0, results: [] }
    bot.say(
      `⚡ Rapid-fire: ${ids.length} questions, ${RAPID_SECONDS} seconds each, starting with the cards you're most likely to have forgotten. Type the key words - speed over polish. Your ratings are saved automatically.`,
    )
    await rapid.ask(bot)
  },

  async ask(bot: StudyBot) {
    const run = bot.rapidRun
    if (!run) return
    await bot.open(run.ids[run.index], `⚡ ${run.index + 1} of ${run.ids.length}`)
    bot.show({ type: 'timer', seconds: RAPID_SECONDS, key: `${run.ids[run.index]}-${run.index}` })
    bot.awaiting = 'rapid'
    bot.chips({ label: 'Skip', send: '/skip' }, { label: 'Stop', send: '/stop' })
  },

  async answer(bot: StudyBot, text: string) {
    const run = bot.rapidRun
    const question = bot.current
    if (!run || !question) return
    bot.awaiting = null
    const result = scoreAnswer(text, question.keyPoints, question.commonMistakes)
    run.results.push({
      id: question.id,
      prompt: question.prompt,
      score: text.trim() ? result.score : null,
    })
    bot.context.rate(`itv:${question.id}`, result.suggested)
    bot.say(
      text.trim()
        ? `${result.score >= 60 ? '✓' : '✗'} ${result.matched.length}/${question.keyPoints.length} key points (${result.score}%).${result.missed[0] ? ` Missed: ${result.missed[0].point}` : ''}`
        : `⏱ Time's up. Key idea: ${question.keyPoints[0]?.point ?? question.shortAnswer}`,
    )
    run.index += 1
    if (run.index >= run.ids.length) return rapid.finish(bot)
    await rapid.ask(bot)
  },

  finish(bot: StudyBot) {
    const run = bot.rapidRun
    bot.rapidRun = null
    bot.awaiting = null
    bot.current = null
    if (!run) return
    const answered = run.results.filter((result) => result.score !== null) as { score: number }[]
    const average = answered.length
      ? Math.round(answered.reduce((sum, result) => sum + result.score, 0) / answered.length)
      : 0
    bot.show({
      type: 'report',
      title: 'Rapid-fire results',
      rows: run.results,
      summary: `${answered.length} answered, average ${average}%. Missed cards come back sooner in Due today.`,
    })
    bot.chips(
      { label: 'Again', send: '/rapid', primary: true },
      { label: 'Mock interview', send: '/mock' },
      { label: 'Menu', send: '/menu' },
    )
  },
}
