import MiniSearch from 'minisearch'
import { allInterviewQuestions } from '../../content/interview'
import { plain, stem } from './text'

/**
 * Keyword search over every interview question with MiniSearch (BM25 with
 * fuzzy and prefix matching). Built on first use - a few hundred ms - and
 * kept for the session. Semantic search, when its model is available, is
 * combined with it in `hybridSearch`.
 */

export interface SearchHit {
  id: string
  topicId: string
  topicTitle: string
  prompt: string
  score: number
}

interface Doc {
  id: string
  prompt: string
  terms: string
  tags: string
  body: string
  topicId: string
  topicTitle: string
}

let index: MiniSearch<Doc> | null = null

function build(): MiniSearch<Doc> {
  const search = new MiniSearch<Doc>({
    fields: ['prompt', 'terms', 'tags', 'body', 'topicTitle'],
    storeFields: ['prompt', 'topicId', 'topicTitle'],
    processTerm: (term) => {
      const lower = term.toLowerCase()
      return lower.length < 2 ? null : stem(lower)
    },
    searchOptions: {
      boost: { prompt: 3, terms: 2.5, tags: 2, topicTitle: 1.5 },
      fuzzy: 0.2,
      prefix: true,
      combineWith: 'OR',
    },
  })
  search.addAll(
    allInterviewQuestions.map(({ question, topic }) => ({
      id: question.id,
      prompt: plain(question.prompt),
      terms: [...question.answer.join(' ').matchAll(/\*\*([^*]+)\*\*/g)]
        .map((match) => match[1])
        .join(' '),
      tags: question.tags.join(' '),
      body: plain(question.answer.slice(0, 2).join(' ')),
      topicId: topic.id,
      topicTitle: topic.title,
    })),
  )
  return search
}

export function keywordSearch(
  query: string,
  limit = 5,
  filter?: (hit: SearchHit) => boolean,
): SearchHit[] {
  index ??= build()
  return index
    .search(query)
    .map((result) => ({
      id: result.id as string,
      topicId: result.topicId as string,
      topicTitle: result.topicTitle as string,
      prompt: result.prompt as string,
      score: result.score,
    }))
    .filter((hit) => !filter || filter(hit))
    .slice(0, limit)
}

/** Related questions: the best matches for a question's own prompt, minus itself. */
export function relatedTo(id: string, prompt: string, limit = 3): SearchHit[] {
  return keywordSearch(prompt, limit + 1)
    .filter((hit) => hit.id !== id)
    .slice(0, limit)
}

/** Ranks by reciprocal rank fusion of keyword and (optional) semantic results. */
export function fuse(
  keyword: SearchHit[],
  semantic: { id: string; score: number }[],
  limit = 5,
): SearchHit[] {
  const byId = new Map(keyword.map((hit) => [hit.id, hit]))
  const scores = new Map<string, number>()
  keyword.forEach((hit, rank) => scores.set(hit.id, (scores.get(hit.id) ?? 0) + 1 / (60 + rank)))
  semantic.forEach((hit, rank) => scores.set(hit.id, (scores.get(hit.id) ?? 0) + 1 / (60 + rank)))
  return [...scores.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([id, score]) => byId.get(id) ?? { ...lookup(id), score })
    .filter((hit): hit is SearchHit => hit !== null)
}

let byIdCache: Map<string, { prompt: string; topicId: string; topicTitle: string }> | null = null
function lookup(id: string): SearchHit {
  byIdCache ??= new Map(
    allInterviewQuestions.map(({ question, topic }) => [
      question.id,
      { prompt: plain(question.prompt), topicId: topic.id, topicTitle: topic.title },
    ]),
  )
  const entry = byIdCache.get(id)
  return {
    id,
    prompt: entry?.prompt ?? id,
    topicId: entry?.topicId ?? '',
    topicTitle: entry?.topicTitle ?? '',
    score: 0,
  }
}
