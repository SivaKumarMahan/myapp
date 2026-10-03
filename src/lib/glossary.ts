import data from '../content/glossary.json'
import { courseIndexes } from '../content/registry'

/**
 * The glossary, and the matcher that finds its terms in lesson text.
 *
 * ALL-CAPS terms and aliases (NSG, SAS, KQL) match case-sensitively so
 * "sas" in a sentence is not mistaken for a SAS token; everything else
 * matches case-insensitively, on whole words, longest phrase first.
 */

export interface GlossaryTerm {
  id: string
  term: string
  aliases: string[]
  category: string
  definition: string
  /** false: listed in the glossary but never auto-linked (everyday words). */
  autolink?: boolean
}

export const glossaryTerms = (data as { terms: GlossaryTerm[] }).terms
export const glossaryById = new Map(glossaryTerms.map((term) => [term.id, term]))

const isAcronym = (text: string) => /^[A-Z0-9][A-Z0-9-]+$/.test(text)
const escape = (text: string) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

interface Matcher {
  regex: RegExp
  exact: Map<string, string>
  folded: Map<string, string>
}

let matcher: Matcher | null = null

function build(): Matcher {
  const exact = new Map<string, string>()
  const folded = new Map<string, string>()
  const phrases: string[] = []
  for (const term of glossaryTerms) {
    if (term.autolink === false) continue
    for (const phrase of [term.term, ...term.aliases]) {
      if (isAcronym(phrase)) exact.set(phrase, term.id)
      else folded.set(phrase.toLowerCase(), term.id)
      phrases.push(phrase)
    }
  }
  phrases.sort((a, b) => b.length - a.length)
  const regex = new RegExp(`(?<![\\w-])(${phrases.map(escape).join('|')})(?![\\w-])`, 'gi')
  return { regex, exact, folded }
}

/** Which term a matched piece of text is, honouring acronym case. */
function termFor(found: string, m: Matcher): string | undefined {
  return m.exact.get(found) ?? m.folded.get(found.toLowerCase())
}

export type Segment = string | { id: string; text: string }

/**
 * Splits text into plain strings and glossary matches. Each term is linked
 * once per call; `linked` carries the ids already used.
 */
export function splitTerms(text: string, linked: Set<string> = new Set()): Segment[] {
  matcher ??= build()
  const m = matcher
  const out: Segment[] = []
  let last = 0
  m.regex.lastIndex = 0
  let match: RegExpExecArray | null
  while ((match = m.regex.exec(text)) !== null) {
    const id = termFor(match[0], m)
    if (!id || linked.has(id)) continue
    linked.add(id)
    if (match.index > last) out.push(text.slice(last, match.index))
    out.push({ id, text: match[0] })
    last = match.index + match[0].length
  }
  if (last < text.length) out.push(text.slice(last))
  return out
}

/** Does this text mention the term (or an alias)? */
export function mentions(term: GlossaryTerm, text: string): boolean {
  return [term.term, ...term.aliases].some((phrase) =>
    new RegExp(`(?<![\\w-])${escape(phrase)}(?![\\w-])`, isAcronym(phrase) ? '' : 'i').test(text),
  )
}

const lessonCache = new Map<string, { to: string; label: string }[]>()

/** Lessons that mention the term in their title, one-liner or explanation - most relevant first. */
export function relatedLessons(termId: string, limit = 5): { to: string; label: string }[] {
  const cached = lessonCache.get(termId)
  if (cached) return cached.slice(0, limit)
  const term = glossaryById.get(termId)
  if (!term) return []
  const scored: { to: string; label: string; score: number }[] = []
  for (const { course } of courseIndexes) {
    for (const topic of course.topics) {
      const score =
        (mentions(term, topic.title) ? 4 : 0) +
        (mentions(term, topic.oneLiner) ? 2 : 0) +
        (mentions(term, [...topic.explanation, ...topic.howItWorks, ...topic.summary].join(' '))
          ? 1
          : 0)
      if (score > 0)
        scored.push({
          to: `${course.route}/topics/${topic.id}`,
          label: `${course.examCode}: ${topic.title}`,
          score,
        })
    }
  }
  const result = scored.sort((a, b) => b.score - a.score).map(({ to, label }) => ({ to, label }))
  lessonCache.set(termId, result)
  return result.slice(0, limit)
}
