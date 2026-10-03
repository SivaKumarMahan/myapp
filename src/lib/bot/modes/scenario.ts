import { bestScore, incidentScenarios, type Scenario } from '../../incident'
import type { StudyBot } from '../engine'

export interface ScenarioRun {
  scenario: Scenario
  node: string
  score: number
  best: number
  steps: number
}

export const scenarios = incidentScenarios

/** Troubleshooting: branching scenarios, scored at the end. */
export const scenario = {
  start(bot: StudyBot, id?: string) {
    const chosen = id ? scenarios.find((entry) => entry.id === id) : undefined
    if (!chosen) {
      bot.say('Pick an incident to troubleshoot:')
      bot.chips(
        ...scenarios.map((entry) => ({ label: entry.title, send: `/scenario ${entry.id}` })),
      )
      return
    }
    bot.current = null
    bot.scenarioRun = {
      scenario: chosen,
      node: chosen.start,
      score: 0,
      best: bestScore(chosen),
      steps: 0,
    }
    bot.say(`🧯 **${chosen.title}**\n\n${chosen.intro}`)
    scenario.showNode(bot)
  },

  showNode(bot: StudyBot) {
    const run = bot.scenarioRun
    if (!run) return
    const node = run.scenario.nodes[run.node]
    if (node.end) {
      const percent = run.best > 0 ? Math.max(0, Math.round((run.score / run.best) * 100)) : 0
      bot.show({
        type: 'answer',
        title:
          node.end.correct === false
            ? 'Wrong conclusion - try the scenario again'
            : `Root cause - you scored ${percent}%`,
        text: `${node.end.rootCause}\n\n**Lesson:** ${node.end.lesson}`,
      })
      bot.scenarioRun = null
      bot.chips(
        { label: 'Another scenario', send: '/scenario', primary: true },
        { label: 'Menu', send: '/menu' },
      )
      return
    }
    bot.show({
      type: 'scenario',
      title: run.scenario.title,
      text: node.text,
      evidence: node.evidence,
      choices: (node.choices ?? []).map((choice) => choice.label),
    })
    bot.chips(
      ...(node.choices ?? []).map((choice, index) => ({
        label: choice.label,
        send: `/choose ${index}`,
      })),
    )
  },

  choose(bot: StudyBot, index: number) {
    const run = bot.scenarioRun
    if (!run) {
      bot.say('Start a scenario first - say **troubleshoot**.')
      return
    }
    const choice = run.scenario.nodes[run.node].choices?.[index]
    if (!choice) return scenario.showNode(bot)
    run.score += choice.score
    run.steps += 1
    if (choice.feedback)
      bot.say(`${choice.score > 0 ? '✓' : choice.score < 0 ? '✗' : '•'} ${choice.feedback}`)
    run.node = choice.next
    scenario.showNode(bot)
  },
}
