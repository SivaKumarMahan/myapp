import { applyErrorScenarios, sandboxSeed } from './scenarios/apply-errors'
import { driftScenarios } from './scenarios/drift'
import { importScenarios } from './scenarios/import'
import { protectionScenarios } from './scenarios/protection'
import { refactoringScenarios } from './scenarios/refactoring'
import { stateScenarios } from './scenarios/state'
import type { TfCategory, TfScenario } from './types'

export type { TfCategory, TfLevel, TfScenario, TfStep } from './types'
export { sandboxSeed }

/** Every Terraform lab scenario, in display order. */
export const tfScenarios: TfScenario[] = [
  ...refactoringScenarios,
  ...importScenarios,
  ...driftScenarios,
  ...protectionScenarios,
  ...stateScenarios,
  ...applyErrorScenarios,
]

export const tfCategories: TfCategory[] = [
  ...new Set(tfScenarios.map((scenario) => scenario.category)),
]

export const tfScenarioById = new Map(tfScenarios.map((scenario) => [scenario.id, scenario]))
export const tfKey = (id: string) => `tf:${id}`
export const allTfKeys = tfScenarios.map((scenario) => tfKey(scenario.id))
