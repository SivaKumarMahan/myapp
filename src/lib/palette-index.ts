import MiniSearch from 'minisearch'
import { allInterviewQuestions } from '../content/interview'
import { courseIndexes } from '../content/registry'
import { sqlChallenges } from '../content/sql'
import { kqlChallenges } from '../content/kql'
import { pythonChallenges } from '../content/python'
import { missions } from '../content/azcli'
import { labExercises } from '../content/configlab'
import { roles } from '../content/roles'
import { guidedLabs } from '../content/labs'
import { iacResources } from '../content/iac'
import { archScenarios } from '../content/arch'
import { glossaryTerms } from './glossary'
import { incidentScenarios } from './incident'
import { linkTo } from './bot/engine'
import { mainNav, utilityNav } from '../components/layout/navigation'

/**
 * Everything the command palette can jump to, in one fuzzy index: pages,
 * lessons, interview questions, commands, challenges and labs, glossary
 * terms, roles. Built on first use (a few thousand small documents).
 */

export type PaletteKind =
  'page' | 'lesson' | 'question' | 'command' | 'challenge' | 'lab' | 'term' | 'role'

export interface PaletteItem {
  id: string
  kind: PaletteKind
  title: string
  subtitle: string
  to: string
  /** Extra words to match that are not shown. */
  keywords?: string
}

export const KIND_LABEL: Record<PaletteKind, string> = {
  page: 'Pages',
  lesson: 'Lessons',
  question: 'Interview questions',
  command: 'Commands',
  challenge: 'Challenges',
  lab: 'Labs',
  term: 'Glossary',
  role: 'Roles',
}

/** Shown before you type, and boosted when they match. */
export function pageItems(): PaletteItem[] {
  const fromNav = [...mainNav(), ...utilityNav()].map((item) => ({
    id: `page:${item.to}`,
    kind: 'page' as const,
    title: `${item.icon} ${item.label}`,
    subtitle: item.to,
    to: item.to,
  }))
  const extra: [string, string, string][] = [
    ['/settings', '⚙️ Settings', 'daily goal new cards exam dates theme reset sync gist'],
    ['/review', '🔁 Due today', 'spaced repetition review flashcards'],
    ['/mistakes', '📓 Mistake notebook', 'wrong answers'],
    ['/stats', '📈 My stats', 'readiness streak calendar'],
    ['/bot', '🤖 Study bot', 'chat tutor'],
    ['/roles', '🧭 Roles & skills', 'career jobs'],
    ['/interview/mock', '🎤 Mock interview', 'record timer'],
    ['/interview/stories', '⭐ STAR stories', 'behavioural'],
    ['/interview/packs', '🏢 Prep packs', 'company round tags'],
    ['/interview/review', '↻ Interview revision queue', 'needs review'],
    ['/progress', '💾 Progress & data', 'export import backup'],
  ]
  const courses = courseIndexes.flatMap(({ course }) => [
    {
      id: `page:${course.route}`,
      kind: 'page' as const,
      title: `${course.icon} ${course.examCode} course`,
      subtitle: course.title,
      to: course.route,
    },
    {
      id: `page:${course.route}/exams`,
      kind: 'page' as const,
      title: `⏱️ ${course.examCode} mock exams`,
      subtitle: 'Timed practice exams',
      to: `${course.route}/exams`,
    },
    {
      id: `page:${course.route}/practice`,
      kind: 'page' as const,
      title: `🎯 ${course.examCode} practice questions`,
      subtitle: 'By domain',
      to: `${course.route}/practice`,
    },
    {
      id: `page:${course.route}/commands`,
      kind: 'page' as const,
      title: `⌨️ ${course.examCode} command reference`,
      subtitle: 'CLI and PowerShell',
      to: `${course.route}/commands`,
    },
    {
      id: `page:${course.route}/cheatsheet`,
      kind: 'page' as const,
      title: `🖨️ ${course.examCode} cheat sheets`,
      subtitle: 'Printable, per domain',
      to: `${course.route}/cheatsheet`,
    },
  ])
  const seen = new Set<string>()
  return [
    // Extras first: on a duplicate, the entry with search keywords wins.
    ...extra.map(([to, title, keywords]) => ({
      id: `page:${to}`,
      kind: 'page' as const,
      title,
      subtitle: to,
      to,
      keywords,
    })),
    ...fromNav,
    ...courses,
  ].filter((item) => (seen.has(item.id) ? false : (seen.add(item.id), true)))
}

export function buildItems(): PaletteItem[] {
  const items: PaletteItem[] = [...pageItems()]
  for (const { course } of courseIndexes) {
    for (const topic of course.topics) {
      items.push({
        id: `lesson:${topic.id}`,
        kind: 'lesson',
        title: topic.title,
        subtitle: `${course.examCode} lesson`,
        to: `${course.route}/topics/${topic.id}`,
        keywords: `${topic.oneLiner} ${topic.tags.join(' ')}`,
      })
    }
    for (const group of course.commandGroups) {
      for (const entry of group.entries) {
        items.push({
          id: `command:${course.id}:${entry.id}`,
          kind: 'command',
          title: entry.command,
          subtitle: `${course.examCode} · ${entry.description}`,
          to: `${course.route}/commands#${entry.id}`,
          keywords: entry.tags.join(' '),
        })
      }
    }
  }
  for (const { question, topic } of allInterviewQuestions) {
    items.push({
      id: `question:${question.id}`,
      kind: 'question',
      title: question.prompt.replace(/[`*]/g, ''),
      subtitle: topic.title,
      to: linkTo(question.id),
      keywords: question.tags.join(' '),
    })
  }
  const challenge = (id: string, title: string, subtitle: string, to: string) =>
    items.push({ id: `challenge:${id}`, kind: 'challenge', title, subtitle, to })
  for (const entry of sqlChallenges)
    challenge(`sql:${entry.id}`, entry.title, 'SQL challenge', `/sql/challenges/${entry.id}`)
  for (const entry of kqlChallenges)
    challenge(`kql:${entry.id}`, entry.title, 'KQL challenge', `/kql/challenges/${entry.id}`)
  for (const entry of pythonChallenges)
    challenge(`py:${entry.id}`, entry.title, 'Python challenge', `/python/challenges/${entry.id}`)
  for (const entry of missions)
    challenge(`cli:${entry.id}`, entry.title, `Azure CLI mission · ${entry.exam}`, '/cli')
  for (const entry of labExercises)
    challenge(
      `lab:${entry.id}`,
      entry.title,
      `Config lab · ${entry.tab}`,
      `/lab?tab=${entry.tab}&exercise=${entry.id}`,
    )
  for (const entry of archScenarios)
    challenge(`arch:${entry.id}`, entry.title, 'Architecture scenario', '/architecture')
  for (const entry of incidentScenarios)
    items.push({
      id: `lab:inc:${entry.id}`,
      kind: 'lab',
      title: entry.title,
      subtitle: 'Incident lab',
      to: `/incidents?lab=${entry.id}`,
      keywords: entry.intro,
    })
  for (const entry of guidedLabs)
    items.push({
      id: `lab:guided:${entry.id}`,
      kind: 'lab',
      title: entry.title,
      subtitle: `Guided lab · ${entry.course.toUpperCase()}`,
      to: `/guided-labs/${entry.id}`,
      keywords: entry.summary,
    })
  for (const entry of iacResources)
    items.push({
      id: `lab:iac:${entry.id}`,
      kind: 'lab',
      title: `IaC compare: ${entry.title}`,
      subtitle: 'ARM · Bicep · Terraform',
      to: `/iac?resource=${entry.id}`,
    })
  for (const term of glossaryTerms)
    items.push({
      id: `term:${term.id}`,
      kind: 'term',
      title: term.term,
      subtitle: term.definition,
      to: `/glossary#${term.id}`,
      keywords: term.aliases.join(' '),
    })
  for (const role of roles)
    items.push({
      id: `role:${role.id}`,
      kind: 'role',
      title: `${role.icon} ${role.title}`,
      subtitle: role.oneLineSummary,
      to: `/roles/${role.id}`,
      keywords: role.alsoKnownAs.join(' '),
    })
  return items
}

const BOOST: Record<PaletteKind, number> = {
  page: 3,
  lesson: 2.2,
  term: 2,
  role: 1.6,
  lab: 1.5,
  challenge: 1.3,
  command: 1.2,
  question: 1,
}

export interface PaletteIndex {
  search: (query: string, limit?: number) => PaletteItem[]
  items: PaletteItem[]
}

export function buildIndex(items = buildItems()): PaletteIndex {
  const byId = new Map(items.map((item) => [item.id, item]))
  const search = new MiniSearch<PaletteItem>({
    fields: ['title', 'subtitle', 'keywords'],
    storeFields: ['id'],
    searchOptions: {
      boost: { title: 4, keywords: 1.5 },
      fuzzy: 0.2,
      prefix: true,
      combineWith: 'AND',
    },
  })
  search.addAll(items)
  return {
    items,
    search: (query, limit = 40) => {
      const text = query.trim()
      if (!text) return []
      let results = search.search(text)
      // Nothing with every word? Fall back to any word.
      if (results.length === 0) results = search.search(text, { combineWith: 'OR' })
      return results
        .map((result) => ({
          item: byId.get(result.id) as PaletteItem,
          score: result.score * BOOST[(byId.get(result.id) as PaletteItem).kind],
        }))
        .sort((a, b) => b.score - a.score)
        .slice(0, limit)
        .map((entry) => entry.item)
    },
  }
}
