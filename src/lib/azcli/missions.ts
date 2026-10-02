import jmespath from 'jmespath'
import type { Mission } from '../../content/azcli'
import type { CloudState } from './state'

export interface CheckResult {
  description: string
  passed: boolean
}

/** Evaluates a mission's checks against the cloud and the commands tried. */
export function evaluateMission(
  mission: Mission,
  state: CloudState,
  attempts: string[],
): CheckResult[] {
  const view = { ...state, attempts }
  return mission.checks.map((check) => {
    let passed = false
    try {
      passed = jmespath.search(view as never, check.query) === true
    } catch {
      passed = false
    }
    return { description: check.description, passed }
  })
}
