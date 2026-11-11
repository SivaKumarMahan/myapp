import { normalizeEmail, readSession } from '../access'
import { readJson, writeJson } from '../local-json'

/**
 * The Kubernetes lab's own record, under its own key (one per signed-in
 * learner), separate from the main progress record. Solved scenarios are
 * also reported to the progress record as `k8s:<id>` so they count on Home.
 * The cluster itself lives in memory while the app is open; files and
 * terminal history survive a reload.
 */

export const K8S_LAB_KEY = 'azure-learning-hub.k8slab'

export interface K8sLabStore {
  version: 1
  /** Files (manifests) per scenario id ("sandbox" for free play). */
  files: Record<string, Record<string, string>>
  /** Recent terminal commands per scenario id. */
  history: Record<string, string[]>
  /** How many hints have been revealed per scenario. */
  hints: Record<string, number>
  /** "Check my fix" and root-cause attempts per scenario. */
  attempts: Record<string, number>
  /** When the fix first passed (the root-cause question is unlocked). */
  fixedAt: Record<string, number>
  /** When each scenario was solved (fix + right root cause). */
  solvedAt: Record<string, number>
  /** The scenario last opened. */
  last: string | null
}

export const MAX_HISTORY = 100

export const emptyK8sStore = (): K8sLabStore => ({
  version: 1,
  files: {},
  history: {},
  hints: {},
  attempts: {},
  fixedAt: {},
  solvedAt: {},
  last: null,
})

export function k8sStoreKey(): string {
  const email = readSession()
  return email ? `${K8S_LAB_KEY}.user.${normalizeEmail(email)}` : K8S_LAB_KEY
}

export function loadK8sStore(): K8sLabStore {
  const raw = readJson<Partial<K8sLabStore> | null>(k8sStoreKey(), null)
  if (!raw || raw.version !== 1) return emptyK8sStore()
  return { ...emptyK8sStore(), ...raw }
}

export function saveK8sStore(store: K8sLabStore): void {
  writeJson(k8sStoreKey(), store)
}
