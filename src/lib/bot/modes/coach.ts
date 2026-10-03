import { interviewTopics } from '../../../content/interview'
import { courseIndexes } from '../../../content/registry'
import { examPlan, examReadiness } from '../../analytics'
import { mistakeCount, queueCounts } from '../../review-deck'
import type { StudyBot } from '../engine'

/** Study coach: pure logic over the progress record. */
export const coach = {
  run(bot: StudyBot, focus: 'today' | 'weak' | 'due' | 'mistakes' | 'plan') {
    const state = bot.context.state()
    const now = bot.context.now()
    const queue = queueCounts(state, now)

    // Interview topics, weakest first: flagged-for-review and lapsed cards count against a topic.
    const topics = interviewTopics
      .map((topic) => {
        let review = 0
        let known = 0
        let lapses = 0
        for (const question of topic.questions) {
          const status = state.interview[question.id]?.status
          if (status === 'review') review += 1
          if (status === 'known') known += 1
          lapses += state.srs[`itv:${question.id}`]?.lapses ?? 0
        }
        return {
          topic,
          review,
          known,
          lapses,
          recall: Math.round((known / topic.questions.length) * 100),
          weakness: review * 2 + lapses,
        }
      })
      .sort((a, b) => b.weakness - a.weakness || a.recall - b.recall)
    const weakTopics = topics.filter((entry) => entry.weakness > 0).slice(0, 3)
    const readiness = courseIndexes.map((catalog) => ({
      catalog,
      readiness: examReadiness(catalog.course, state, now),
    }))
    const mistakes = mistakeCount(state)

    const lines: string[] = []
    if (focus === 'today' || focus === 'due') {
      lines.push(
        queue.total > 0
          ? `**${queue.due} reviews due** and ${queue.fresh} new cards waiting in Due today.`
          : 'No reviews due - you are caught up.',
      )
    }
    if (focus === 'today' || focus === 'weak') {
      if (weakTopics.length) {
        lines.push(
          `Weakest interview topics: ${weakTopics.map((entry) => `**${entry.topic.shortTitle}** (${entry.review} flagged, ${entry.lapses} lapses)`).join(', ')}.`,
        )
      } else {
        const untouched = topics.filter((entry) => entry.known === 0).slice(0, 2)
        if (untouched.length)
          lines.push(
            `No weak spots yet - try a new topic: ${untouched.map((entry) => `**${entry.topic.shortTitle}**`).join(', ')}.`,
          )
      }
      for (const { catalog, readiness: course } of readiness) {
        if (course.studyNext && course.score < 80)
          lines.push(
            `${catalog.course.examCode}: readiness ${course.score}/100 - study **${course.studyNext.domain.shortTitle}** next.`,
          )
      }
    }
    if (focus === 'today' || focus === 'mistakes') {
      const byCourse = courseIndexes
        .map((catalog) => ({
          code: catalog.course.examCode,
          count: Object.values(state.mistakes).filter(
            (entry) => entry.courseId === catalog.course.id,
          ).length,
        }))
        .filter((entry) => entry.count > 0)
      if (mistakes > 0)
        lines.push(
          `Mistake notebook: ${byCourse.map((entry) => `${entry.code} ${entry.count}`).join(', ')}.`,
        )
      else if (focus === 'mistakes') lines.push('Your mistake notebook is empty.')
      const lapsedTopics = topics.filter((entry) => entry.lapses > 0).slice(0, 3)
      if (focus === 'mistakes' && lapsedTopics.length)
        lines.push(
          `Interview cards you keep forgetting are mostly in: ${lapsedTopics.map((entry) => entry.topic.shortTitle).join(', ')}.`,
        )
    }
    if (focus === 'today' || focus === 'plan') {
      const plans = courseIndexes
        .filter((catalog) => state.settings.examDates[catalog.course.id])
        .map((catalog) => ({
          code: catalog.course.examCode,
          plan: examPlan(catalog.course, state, state.settings.examDates[catalog.course.id], now),
        }))
      for (const { code, plan } of plans) {
        if (plan.isPast) continue
        lines.push(
          `${code} exam in **${plan.daysLeft} days**: ${plan.lessonsPerDay} lessons and ${plan.newPerDay} new cards a day keeps you on track.`,
        )
      }
      if (focus === 'plan' && plans.length === 0)
        lines.push('No exam dates set - add one in My stats for a day-by-day plan.')
    }
    if (lines.length === 0)
      lines.push('Nothing to report yet - do a few questions and I will have more to say.')
    bot.say(
      `📋 ${focus === 'today' ? "Today's plan" : 'Coach'}:\n\n${lines.map((line) => `- ${line}`).join('\n')}`,
    )
    bot.show({
      type: 'links',
      items: [
        ...(queue.total > 0 ? [{ label: `Due today (${queue.total})`, to: '/review' }] : []),
        ...(mistakes > 0 ? [{ label: 'Mistake notebook', to: '/mistakes' }] : []),
        { label: 'My stats', to: '/stats' },
      ],
    })
    bot.chips(
      ...(weakTopics[0]
        ? [
            {
              label: `Mock on ${weakTopics[0].topic.shortTitle}`,
              send: `/mock ${weakTopics[0].topic.id}`,
              primary: true,
            },
          ]
        : [{ label: 'Mock interview', send: '/mock', primary: true }]),
      ...(queue.due > 0 ? [{ label: 'Mock on due cards', send: '/mock due' }] : []),
      { label: 'Rapid-fire', send: '/rapid' },
      { label: 'Menu', send: '/menu' },
    )
  },
}
