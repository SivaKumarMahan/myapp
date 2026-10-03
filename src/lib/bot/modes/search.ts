import type { StudyBot } from '../engine'
import { fuse, keywordSearch } from '../search'
import { plain } from '../text'

/** Search / Q&A: the best matching questions, with their short answers. */
export const search = {
  async run(bot: StudyBot, query: string) {
    if (!query.trim()) {
      bot.say('Type a question or a few keywords.')
      return
    }
    const keyword = keywordSearch(query, 8)
    let hits = keyword.slice(0, 3)
    if (bot.context.semantic) {
      try {
        const semantic = await bot.context.semantic(query, 8)
        if (semantic.length) hits = fuse(keyword, semantic, 3)
      } catch {
        /* the model is optional; keyword results stand */
      }
    }
    if (hits.length === 0) {
      bot.say(
        `I couldn't find anything about "${query}" in your questions. Try different words, or **help**.`,
      )
      return
    }
    const withAnswers = await Promise.all(
      hits.map(async (hit) => ({
        ...hit,
        shortAnswer: (await bot.question(hit.id))?.shortAnswer ?? '',
      })),
    )
    bot.current = await bot.question(withAnswers[0].id)
    bot.hintIndex = 0
    bot.show(
      { type: 'results', hits: withAnswers },
      withAnswers.length === 1 ? 'Here is the best match:' : `Best matches for "${plain(query)}":`,
    )
    bot.chips(
      { label: '✍️ Answer the first', send: '/evaluate', primary: true },
      ...withAnswers.map((hit, index) => ({ label: `Open ${index + 1}`, send: `/open ${hit.id}` })),
      { label: 'Explain simpler', send: '/simpler' },
      { label: 'Analogy', send: '/analogy' },
    )
  },
}
