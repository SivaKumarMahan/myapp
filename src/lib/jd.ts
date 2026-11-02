import { allInterviewQuestions, groupOf, interviewTopicById } from '../content/interview'
import { jdSkills, type JdSkill } from '../content/jd/skills'
import type { InterviewTopic } from '../content/types'
import { plain } from './bot/text'

/**
 * Job description prep: find the skills a JD asks for, then the questions in
 * the bank that cover each one. Everything is literal whole-word matching on
 * the aliases in `content/jd/skills.ts` - predictable, offline and fast - so a
 * skill either has questions that really mention it, or it is shown as not in
 * the app yet, with links to search the web.
 */

export interface JdMatch {
  skill: JdSkill
  /** How many times the JD mentions it. */
  mentions: number
  /** Where the first mention is, to list skills in the JD's own order. */
  firstAt: number
}

interface Span {
  skillId: string
  start: number
  end: number
}

const escape = (text: string) => text.replace(/[.*+?^${}()|[\]\\/]/g, '\\$&')

/** Whole-word matcher for one alias. A leading `=` makes it case-sensitive. */
function aliasPattern(alias: string): RegExp {
  const exact = alias.startsWith('=')
  const word = escape(exact ? alias.slice(1) : alias).replace(/\s+/g, '\\s+')
  return new RegExp(`(?<![A-Za-z0-9])${word}(?![A-Za-z0-9])`, exact ? 'g' : 'gi')
}

const patterns = new Map<string, RegExp[]>()
function patternsFor(skill: JdSkill): RegExp[] {
  let list = patterns.get(skill.id)
  if (!list) {
    list = skill.aliases.map(aliasPattern)
    patterns.set(skill.id, list)
  }
  return list
}

function spansOf(skill: JdSkill, text: string): Span[] {
  return patternsFor(skill).flatMap((pattern) =>
    [...text.matchAll(pattern)].map((match) => ({
      skillId: skill.id,
      start: match.index,
      end: match.index + match[0].length,
    })),
  )
}

/**
 * Every skill the JD mentions, in the order the JD first mentions them.
 *
 * A mention inside a longer mention of another skill does not count:
 * "Azure DevOps" is Azure DevOps, not also Azure; "GitHub Actions" is not Git.
 */
export function detectSkills(text: string, skills: JdSkill[] = jdSkills): JdMatch[] {
  const spans = skills.flatMap((skill) => spansOf(skill, text))
  const kept = spans.filter(
    (span) =>
      !spans.some(
        (other) =>
          other.skillId !== span.skillId &&
          other.start <= span.start &&
          other.end >= span.end &&
          other.end - other.start > span.end - span.start,
      ),
  )
  const bySkill = new Map<string, JdMatch>()
  const skillById = new Map(skills.map((skill) => [skill.id, skill]))
  for (const span of kept) {
    const existing = bySkill.get(span.skillId)
    if (existing) {
      existing.mentions += 1
      existing.firstAt = Math.min(existing.firstAt, span.start)
    } else {
      bySkill.set(span.skillId, {
        skill: skillById.get(span.skillId)!,
        mentions: 1,
        firstAt: span.start,
      })
    }
  }
  return [...bySkill.values()].sort((a, b) => a.firstAt - b.firstAt)
}

/** A skill the learner typed in because the scan missed it. */
export function customSkill(term: string): JdSkill {
  const name = term.trim().replace(/\s+/g, ' ')
  const slug = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
  return { id: `custom-${slug || 'skill'}`, name, area: 'other', aliases: [name] }
}

/** The JD skill an added term already is, if any ("k8s" is Kubernetes). */
export function knownSkillFor(term: string): JdSkill | undefined {
  const match = detectSkills(term.trim())
  return match.length === 1 && match[0].mentions === 1 ? match[0].skill : undefined
}

const STOP_WORDS = new Set(
  `A I AN AND ARE AS AT BE BY FOR FROM IN IS IT OF ON OR THE TO WE WITH YOU YOUR OUR OUT WHO WHAT
  WHY HOW ALL ANY CAN WILL MUST NICE HAVE PLUS ROLE ROLES JOB TEAM TEAMS SKILL SKILLS KEY ABOUT WORK
  YEARS YRS EXP NOTE NEW ONE TWO GOOD BEST MORE US USA UK EU UAE IND HR PTO EEO EOE CV BS BA BE MS
  MSC BSC MBA PHD BTECH MTECH ME MCA BCA CTC LPA IST EST PST CET GMT UTC KPI KPIS OKR OKRS FAQ NA TBD
  ASAP ETA WFH WFO LLC LTD INC PVT CEO CTO CIO VP SVP AVP SME SMES POC Q1 Q2 Q3 Q4 H1 H2 OK ID IDS
  IT AM PM NOT NO YES`
    .split(/\s+/)
    .filter(Boolean),
)

/**
 * Technical-looking words in the JD that no skill recognised: acronyms
 * ("SOX", "CDN"), CamelCase names ("SonarLint") and letter-digit names ("EC2").
 * Shown as suggestions the learner can add with one click.
 */
export function unrecognisedTerms(text: string, matches: JdMatch[], limit = 12): string[] {
  const covered = matches.flatMap((match) => spansOf(match.skill, text))
  const allSkillsText = new Set(
    jdSkills.flatMap((skill) =>
      skill.aliases.map((alias) => alias.replace(/^=/, '').toLowerCase()),
    ),
  )
  const seen = new Set<string>()
  const found: string[] = []
  for (const match of text.matchAll(/(?<![A-Za-z0-9])[A-Za-z][A-Za-z0-9]*(?![A-Za-z0-9])/g)) {
    const word = match[0]
    const looksTechnical =
      /^[A-Z]{2,5}s?$/.test(word) ||
      /^[A-Z]?[a-z]+[A-Z][A-Za-z]*$/.test(word) ||
      /^[A-Za-z]+\d+[A-Za-z0-9]*$/.test(word)
    if (!looksTechnical) continue
    const key = word.toLowerCase()
    if (seen.has(key) || STOP_WORDS.has(word.toUpperCase()) || allSkillsText.has(key)) continue
    const start = match.index
    if (covered.some((span) => span.start <= start && span.end >= start + word.length)) continue
    seen.add(key)
    found.push(word)
    if (found.length >= limit) break
  }
  return found
}

interface IndexedQuestion {
  id: string
  topic: InterviewTopic
  prompt: string
  tags: string
  body: string
}

let index: IndexedQuestion[] | null = null
function questionIndex(): IndexedQuestion[] {
  index ??= allInterviewQuestions.map(({ question, topic }) => ({
    id: question.id,
    topic,
    prompt: plain(question.prompt),
    tags: question.tags.join(' '),
    body: plain([...question.answer, ...(question.deeper ?? [])].join(' ')),
  }))
  return index
}

export interface SkillQuestions {
  /** Best first: named in the question, then in its tags, then in its answer. */
  questionIds: string[]
  /** How many name the skill in the question or its tags, not only in the answer. */
  strongCount: number
  /** The topics those questions come from, the one holding most first. */
  topics: { topic: InterviewTopic; count: number }[]
}

const cache = new Map<string, SkillQuestions>()

/** The questions in the bank that cover a skill, best first. */
export function questionsForSkill(skill: JdSkill): SkillQuestions {
  const key = `${skill.id}|${skill.aliases.join('|')}`
  const cached = cache.get(key)
  if (cached) return cached
  const list = patternsFor(skill)
  const test = (text: string) =>
    list.some((pattern) => {
      pattern.lastIndex = 0
      return pattern.test(text)
    })
  const hinted = new Set(skill.topics ?? [])
  const scored = questionIndex()
    .map((entry, order) => {
      let score = 0
      if (test(entry.prompt)) score += 6
      if (test(entry.tags)) score += 3
      if (score === 0 && test(entry.body)) score += 1
      if (score > 0 && hinted.has(entry.topic.id)) score += 2
      if (score > 0 && groupOf(entry.topic) === 'bank') score += 1
      return { entry, score, order }
    })
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score || a.order - b.order)
  const counts = new Map<string, number>()
  for (const { entry } of scored) counts.set(entry.topic.id, (counts.get(entry.topic.id) ?? 0) + 1)
  const result: SkillQuestions = {
    questionIds: scored.map(({ entry }) => entry.id),
    strongCount: scored.filter(({ entry }) => test(entry.prompt) || test(entry.tags)).length,
    topics: [...counts]
      .sort((a, b) => b[1] - a[1])
      .map(([id, count]) => ({ topic: interviewTopicById.get(id)!, count })),
  }
  cache.set(key, result)
  return result
}

/** Fewer than this many questions: still worth reading up on the web. */
export const THIN_COVERAGE = 3

/** Web searches that open in a new tab for a skill the app does not cover. */
export function webSearchLinks(skill: JdSkill): { label: string; url: string }[] {
  const name = skill.name
    .replace(/\([^)]*\)/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
  const query = (text: string) => encodeURIComponent(text)
  return [
    {
      label: 'Google: interview questions & answers',
      url: `https://www.google.com/search?q=${query(`${name} interview questions and answers`)}`,
    },
    {
      label: 'Microsoft Learn',
      url: `https://learn.microsoft.com/en-us/search/?terms=${query(name)}`,
    },
    {
      label: 'YouTube: explained',
      url: `https://www.youtube.com/results?search_query=${query(`${name} explained for interviews`)}`,
    },
  ]
}

/** The tag a saved JD becomes, so it shows up as a prep pack. */
export const jdPackTag = (label: string) => `JD: ${label.trim() || 'job description'}`
