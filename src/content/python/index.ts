import data from './challenges.json'

/**
 * Python playground challenges, from a JSON file so more can be added without
 * touching code. After editing, run `npm run py:expected` to regenerate each
 * test's expected value from the reference solution.
 */

export type PythonTopic = 'logs' | 'azure-cli' | 'config' | 'networking' | 'resilience' | 'data'

export interface PythonTest {
  name: string
  /** A Python expression, evaluated after the fixtures and the learner's code. */
  call: string
  /** Hidden tests show only pass or fail until the challenge is solved or unlocked. */
  hidden: boolean
  /** The reference solution's value, as plain JSON. */
  expected: unknown
}

export interface PythonChallenge {
  id: string
  title: string
  difficulty: 'easy' | 'medium' | 'hard'
  topic: PythonTopic
  functionName: string
  description: string
  starter: string
  /** Sample data and helpers, run before the learner's code. */
  fixtures: string
  hints: string[]
  solution: string
  tests: PythonTest[]
}

export const pythonChallenges = (data as { challenges: PythonChallenge[] }).challenges

export const pythonChallengeById = new Map(
  pythonChallenges.map((challenge) => [challenge.id, challenge]),
)

export const pythonChallengeKey = (id: string) => `py:${id}`

export const pythonTopicLabel: Record<PythonTopic, string> = {
  logs: 'Logs and command output',
  'azure-cli': 'Azure CLI JSON',
  config: 'Configuration',
  networking: 'Networking (ipaddress)',
  resilience: 'Resilience',
  data: 'Data with pandas',
}

/** The sample data a challenge provides: UPPER_CASE names and public helpers. */
export function fixtureNames(fixtures: string): string[] {
  const names = new Set<string>()
  for (const match of fixtures.matchAll(
    /^([A-Za-z_][A-Za-z0-9_]*)\s*=|^(?:def|class)\s+([A-Za-z_][A-Za-z0-9_]*)/gm,
  )) {
    const name = match[1] ?? match[2]
    if (name && !name.startsWith('_') && (name === name.toUpperCase() || match[2])) names.add(name)
  }
  return [...names]
}
