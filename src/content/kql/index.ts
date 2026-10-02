import data from './challenges.json'

/**
 * KQL simulator challenges, from a JSON file so more can be added without
 * touching code. Unlike the SQL ones they store no expected result: each is
 * worked out by running the reference solution through the simulator, which
 * is deterministic because the data and the clock are fixed.
 */

export interface KqlChallenge {
  id: string
  title: string
  difficulty: 'easy' | 'medium' | 'hard'
  /** Which exam the scenario comes from. */
  exam: 'AZ-104' | 'AZ-400'
  scenario: string
  description: string
  /** True when the question asks for a sort order. */
  ordered: boolean
  hints: string[]
  solution: string
}

export const kqlChallenges = (data as { challenges: KqlChallenge[] }).challenges

export const kqlChallengeById = new Map(kqlChallenges.map((challenge) => [challenge.id, challenge]))

export const kqlChallengeKey = (id: string) => `kql:${id}`
