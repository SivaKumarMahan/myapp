import { normalizeEmail, readSession } from '../access'
import { readJson, writeJson } from '../local-json'

/**
 * The Linux lab's own record, under its own key (one per signed-in learner),
 * so it never touches the main progress record. Solved challenges are also
 * reported to the progress record as `linux:<id>` so they count on Home.
 */

export const LINUX_LAB_KEY = 'azure-learning-hub.linuxlab'

export interface LinuxLabStore {
  version: 1
  /** Editor contents per challenge id ("sandbox" for free play). */
  drafts: Record<string, string>
  /** How many hints have been revealed per challenge. */
  hints: Record<string, number>
  /** Check attempts per challenge. */
  attempts: Record<string, number>
  /** When each challenge was first solved. */
  solvedAt: Record<string, number>
  /** The challenge last opened. */
  last: string | null
}

export const emptyLabStore = (): LinuxLabStore => ({
  version: 1,
  drafts: {},
  hints: {},
  attempts: {},
  solvedAt: {},
  last: null,
})

export function labStoreKey(): string {
  const email = readSession()
  return email ? `${LINUX_LAB_KEY}.user.${normalizeEmail(email)}` : LINUX_LAB_KEY
}

export function loadLabStore(): LinuxLabStore {
  const raw = readJson<Partial<LinuxLabStore> | null>(labStoreKey(), null)
  if (!raw || raw.version !== 1) return emptyLabStore()
  return { ...emptyLabStore(), ...raw }
}

export function saveLabStore(store: LinuxLabStore): void {
  writeJson(labStoreKey(), store)
}
