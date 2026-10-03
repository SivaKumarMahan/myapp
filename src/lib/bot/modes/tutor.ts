import { linkTo, type StudyBot } from '../engine'
import { relatedTo } from '../search'

/** Tutor: other ways into the question on the table. */
export const tutor = {
  async run(
    bot: StudyBot,
    action:
      | 'simpler'
      | 'analogy'
      | 'short'
      | 'long'
      | 'hint'
      | 'related'
      | 'mistakes'
      | 'followups'
      | 'scenario',
  ) {
    const question = bot.current
    if (!question) {
      bot.say('Open a question first - search for a topic, or start a mock interview.')
      return
    }
    switch (action) {
      case 'hint': {
        const hint = question.hints[Math.min(bot.hintIndex, 2)]
        bot.say(`💡 Hint ${Math.min(bot.hintIndex, 2) + 1} of 3: ${hint}`)
        bot.hintIndex += 1
        if (bot.hintIndex >= 3)
          bot.say('That was the last hint - ask for the **short** answer if you need it.')
        break
      }
      case 'short':
        bot.show({ type: 'answer', title: '30-second answer', text: question.shortAnswer })
        break
      case 'long':
        for (const section of question.longAnswer)
          bot.show({ type: 'answer', title: section.heading, text: section.text })
        break
      case 'simpler':
        if (question.simpleExplanation)
          bot.show({ type: 'answer', title: 'In plain words', text: question.simpleExplanation })
        else
          bot.say(
            `I don't have a plain-words version of this one yet. The short answer is: ${question.shortAnswer}`,
          )
        break
      case 'analogy':
        if (question.analogy) bot.show({ type: 'answer', title: 'Analogy', text: question.analogy })
        else
          bot.say(
            "There's no analogy written for this question yet - try **simpler** or **short**.",
          )
        break
      case 'mistakes':
        if (question.commonMistakes.length === 0) bot.say('No common mistakes listed for this one.')
        else
          bot.show({
            type: 'answer',
            title: 'Common mistakes',
            text: question.commonMistakes
              .map(
                (mistake) =>
                  `- ${mistake.mistake}${mistake.correction ? ` → ${mistake.correction}` : ''}`,
              )
              .join('\n'),
          })
        break
      case 'followups':
        if (question.followUps.length === 0) bot.say('No follow-ups listed for this one.')
        else
          bot.show({
            type: 'answer',
            title: 'Likely follow-ups',
            text: question.followUps
              .map(
                (followUp) =>
                  `- **${followUp.question}**${followUp.shortAnswer ? ` ${followUp.shortAnswer}` : ''}`,
              )
              .join('\n'),
          })
        break
      case 'scenario':
        if (question.scenarioVariant)
          bot.show({
            type: 'answer',
            title: 'What would you do if…',
            text: `**${question.scenarioVariant.question}**${question.scenarioVariant.shortAnswer ? `\n\n${question.scenarioVariant.shortAnswer}` : ''}`,
          })
        else bot.say('No scenario variant for this question yet.')
        break
      case 'related': {
        const ids = question.related.length
          ? question.related
          : relatedTo(question.id, question.prompt).map((hit) => hit.id)
        const items = await Promise.all(
          ids.map(async (id) => ({ id, question: await bot.question(id) })),
        )
        const found = items.filter((item) => item.question)
        if (found.length === 0) bot.say('I could not find related questions.')
        else {
          bot.show(
            {
              type: 'links',
              items: found.map((item) => ({
                label: item.question?.prompt ?? item.id,
                to: linkTo(item.id),
              })),
            },
            'Related questions:',
          )
          bot.chips(
            ...found
              .slice(0, 3)
              .map((item, index) => ({ label: `Open ${index + 1}`, send: `/open ${item.id}` })),
          )
          return
        }
        break
      }
    }
    if (question.scenarioVariant && action !== 'scenario')
      bot.chips(...bot.tutorChips(), { label: 'What if…', send: '/variant' })
  },
}
