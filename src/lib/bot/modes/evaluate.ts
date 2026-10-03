import { RATING_CHIPS, type StudyBot } from '../engine'
import { keywordSearch } from '../search'
import { scoreAnswer, scoreSelf } from '../scoring'

/** Answer evaluator: score one answer, flag mistakes, suggest a rating. */
export const evaluate = {
  async start(bot: StudyBot, query?: string, id?: string) {
    if (id) {
      if (!(await bot.open(id))) return
    } else if (query) {
      const hit = keywordSearch(query, 1)[0]
      if (!hit) {
        bot.say(`I couldn't find a question about "${query}". Try other words.`)
        return
      }
      await bot.open(hit.id)
    } else if (!bot.current) {
      bot.say(
        'Which question? Type **evaluate** followed by a few words, like **evaluate private endpoint DNS**, or search for one first.',
      )
      return
    } else {
      bot.say(`Answering: **${bot.current.prompt}**`)
    }
    bot.awaiting = 'evaluate'
    bot.say(
      'Type your answer as you would say it in an interview. Then I will show which key points you covered.',
    )
    bot.chips({ label: 'Hint', send: '/hint' }, { label: 'Skip', send: '/skip' })
  },

  answer(bot: StudyBot, text: string) {
    const question = bot.current
    bot.awaiting = null
    if (!question) return
    const result = scoreAnswer(text, question.keyPoints, question.commonMistakes)
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
      title: 'Your answer',
      selfCheck: true,
    })
    for (const mistake of result.mistakes)
      bot.say(`⚠️ **Watch out:** ${mistake.mistake} ${mistake.correction}`)
    bot.say(
      `How did it feel? I suggest **${['', 'Again', 'Hard', 'Good', 'Easy'][result.suggested]}** - or tick the points you know you said, if the keyword check missed something.`,
    )
    bot.chips(...RATING_CHIPS(result.suggested), { label: 'Short answer', send: '/short' })
  },

  /** The self-score checklist: the learner ticks the points they said. */
  self(bot: StudyBot, points: number[]) {
    const last = bot.lastScore
    if (!last) {
      bot.say('Answer a question first.')
      return
    }
    const result = scoreSelf(last.keyPoints, points)
    bot.lastScore = { ...last, result }
    bot.say(
      `Self-score: **${result.score}%** (${result.matched.length} of ${last.keyPoints.length} points).`,
    )
    bot.chips(
      ...(last.rateable
        ? RATING_CHIPS(result.suggested)
        : [{ label: 'Next', send: '/skip', primary: true }]),
    )
  },
}
