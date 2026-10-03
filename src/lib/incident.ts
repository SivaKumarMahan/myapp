import data from '../content/bot/scenarios.json'

/**
 * Incident / troubleshooting labs: branching scenarios where each diagnostic
 * step reveals new evidence. Shared by the Incident labs page and the Study
 * bot's troubleshooting mode.
 */

export interface Choice {
  label: string
  next: string
  score: number
  feedback: string
}

export interface ScenarioEnd {
  rootCause: string
  lesson: string
  /** False for a plausible but wrong conclusion. Defaults to true. */
  correct?: boolean
}

export interface ScenarioNode {
  text: string
  evidence?: string
  choices?: Choice[]
  end?: ScenarioEnd
}

export interface Scenario {
  id: string
  title: string
  topic: string
  level: string
  intro: string
  start: string
  nodes: Record<string, ScenarioNode>
}

export const incidentScenarios = (data as unknown as { scenarios: Scenario[] }).scenarios
export const incidentKey = (id: string) => `inc:${id}`
export const allIncidentKeys = incidentScenarios.map((scenario) => incidentKey(scenario.id))

export const isCorrectEnd = (node: ScenarioNode | undefined) =>
  Boolean(node?.end) && node?.end?.correct !== false

/** The highest score on any path that ends at the right root cause. Cycle-safe. */
export function bestScore(
  scenario: Scenario,
  node = scenario.start,
  seen = new Set<string>(),
): number {
  const current = scenario.nodes[node]
  if (!current) return -Infinity
  if (current.end) return current.end.correct === false ? -Infinity : 0
  if (!current.choices || seen.has(node)) return -Infinity
  const next = new Set(seen).add(node)
  const scores = current.choices.map(
    (choice) => choice.score + bestScore(scenario, choice.next, next),
  )
  return Math.max(...scores)
}

/** Fewest choices from the start to a correct ending. */
export function shortestSteps(scenario: Scenario): number {
  const queue: [string, number][] = [[scenario.start, 0]]
  const seen = new Set([scenario.start])
  while (queue.length) {
    const [id, depth] = queue.shift() as [string, number]
    const node = scenario.nodes[id]
    if (isCorrectEnd(node)) return depth
    for (const choice of node?.choices ?? []) {
      if (!seen.has(choice.next)) {
        seen.add(choice.next)
        queue.push([choice.next, depth + 1])
      }
    }
  }
  return Infinity
}

export interface LabStep {
  node: string
  label: string
  score: number
  feedback: string
}

export interface LabResult {
  correct: boolean
  points: number
  best: number
  steps: number
  optimal: number
  /** 0-100: diagnosis 50%, efficiency 20%, the right root cause 30%. */
  percent: number
}

export function scoreRun(scenario: Scenario, steps: LabStep[], endNode: string): LabResult {
  const correct = isCorrectEnd(scenario.nodes[endNode])
  const points = steps.reduce((sum, step) => sum + step.score, 0)
  const best = Math.max(1, bestScore(scenario))
  const optimal = shortestSteps(scenario)
  const quality = Math.max(0, Math.min(1, points / best))
  const efficiency = steps.length === 0 ? 0 : Math.min(1, optimal / steps.length)
  const percent = Math.round(quality * 50 + efficiency * 20 + (correct ? 30 : 0))
  return { correct, points, best, steps: steps.length, optimal, percent }
}
