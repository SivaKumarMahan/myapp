import { interviewTopics, interviewQuestionById } from '../content/interview'
import type { ProgressState } from './storage'

/**
 * Company / round prep packs. Two kinds:
 * - built in: each "real interview rounds" topic is a company pack;
 * - yours: any tag you put on questions ("Microsoft", "Round 2 - system design").
 */

export interface Pack {
  key: string
  name: string
  kind: 'company' | 'tag'
  questionIds: string[]
}

export function companyPacks(): Pack[] {
  return interviewTopics
    .filter((topic) => topic.id.startsWith('rounds-'))
    .map((topic) => ({
      key: `company:${topic.id}`,
      name: topic.title.replace(/\s+rounds?$/i, ''),
      kind: 'company' as const,
      questionIds: topic.questions.map((question) => question.id),
    }))
}

export function tagPacks(state: ProgressState): Pack[] {
  const byTag = new Map<string, string[]>()
  for (const [questionId, tags] of Object.entries(state.questionTags)) {
    if (!interviewQuestionById.has(questionId)) continue
    for (const tag of tags) byTag.set(tag, [...(byTag.get(tag) ?? []), questionId])
  }
  return [...byTag]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([tag, questionIds]) => ({
      key: `tag:${tag}`,
      name: tag,
      kind: 'tag' as const,
      questionIds,
    }))
}

export const allPacks = (state: ProgressState) => [...tagPacks(state), ...companyPacks()]

export const findPack = (key: string | null | undefined, state: ProgressState) =>
  key ? allPacks(state).find((pack) => pack.key === key) : undefined

/** Every tag in use, most used first - for suggestions in the tag editor. */
export function knownTags(state: ProgressState): string[] {
  const counts = new Map<string, number>()
  for (const tags of Object.values(state.questionTags))
    for (const tag of tags) counts.set(tag, (counts.get(tag) ?? 0) + 1)
  return [...counts].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).map(([tag]) => tag)
}
