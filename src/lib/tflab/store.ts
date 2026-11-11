import { normalizeEmail, readSession } from '../access'
import { readJson, writeJson } from '../local-json'
import type { EnvData } from './engine'

/**
 * The Terraform lab's own record, under its own key (one per signed-in
 * learner), so it never touches the main progress record. Solved scenarios
 * are also reported to the progress record as `tf:<id>` so they count on Home.
 * Each scenario's environment (files, state, Azure) is saved too, so a
 * reload carries on where you were.
 */

export const TF_LAB_KEY = 'azure-learning-hub.tflab'

export interface TfLabStore {
  version: 1
  /** The saved environment per scenario id ("sandbox" for free play). */
  envs: Record<string, EnvData>
  /** How many hints have been revealed per scenario. */
  hints: Record<string, number>
  /** Check attempts per scenario. */
  attempts: Record<string, number>
  /** When the checks first passed (the root-cause question is then shown). */
  checkedAt: Record<string, number>
  /** The option chosen for the root-cause question. */
  answers: Record<string, number>
  /** When each scenario was first solved (checks + right answer). */
  solvedAt: Record<string, number>
  /** The scenario last opened. */
  last: string | null
}

export const emptyTfStore = (): TfLabStore => ({
  version: 1,
  envs: {},
  hints: {},
  attempts: {},
  checkedAt: {},
  answers: {},
  solvedAt: {},
  last: null,
})

export function tfStoreKey(): string {
  const email = readSession()
  return email ? `${TF_LAB_KEY}.user.${normalizeEmail(email)}` : TF_LAB_KEY
}

export function loadTfStore(): TfLabStore {
  const raw = readJson<Partial<TfLabStore> | null>(tfStoreKey(), null)
  if (!raw || raw.version !== 1) return emptyTfStore()
  return { ...emptyTfStore(), ...raw }
}

export function saveTfStore(store: TfLabStore): void {
  writeJson(tfStoreKey(), store)
}
