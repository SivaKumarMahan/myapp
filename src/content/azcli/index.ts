import data from './missions.json'

/**
 * Guided missions for the Azure CLI simulator, from a JSON file. A mission is
 * complete when every check - a JMESPath query over the simulated cloud -
 * evaluates to true. See `$comment` in missions.json for what can be queried.
 */
export interface Mission {
  id: string
  title: string
  level: 'beginner' | 'intermediate'
  exam: 'AZ-900' | 'AZ-104' | 'AZ-400'
  goal: string
  steps: string[]
  hints: string[]
  /** az commands run (silently) when the mission starts. */
  setup: string[]
  checks: { description: string; query: string }[]
}

export const missions = (data as { missions: Mission[] }).missions
export const missionById = new Map(missions.map((mission) => [mission.id, mission]))
export const missionKey = (id: string) => `cli:${id}`
