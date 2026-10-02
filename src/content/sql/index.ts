import data from './challenges.json'

/**
 * The SQL playground's challenges, from a JSON file so they can be edited
 * without touching code. After changing them or a dataset, run
 * `npm run sql:expected`. The datasets live in `./datasets.ts`, apart from
 * this, so pages that only show a solved count do not load the data.
 */

export type SqlValue = string | number | null

export type SqlDifficulty = 'easy' | 'medium' | 'hard'
export type SqlTopic = 'joins' | 'aggregation' | 'window' | 'cte' | 'interview'

export interface SqlChallenge {
  id: string
  title: string
  difficulty: SqlDifficulty
  topic: SqlTopic
  /** Markdown-ish text: `code` and **bold**, as elsewhere in the app. */
  description: string
  /** Extra SQL run before the learner's query, on top of the datasets. */
  setup: string
  /** True when ORDER BY is part of the question, so row order is checked. */
  ordered: boolean
  hints: string[]
  solution: string
  expected: { columns: string[]; rows: SqlValue[][] }
}

export const sqlChallenges = (data as { challenges: SqlChallenge[] }).challenges

export const sqlChallengeById = new Map(sqlChallenges.map((challenge) => [challenge.id, challenge]))

export const sqlTopicLabel: Record<SqlTopic, string> = {
  joins: 'Joins',
  aggregation: 'GROUP BY & HAVING',
  window: 'Window functions',
  cte: 'CTEs',
  interview: 'Interview classics',
}

/** Progress keys share one map with other playgrounds' challenges later. */
export const sqlChallengeKey = (id: string) => `sql:${id}`
