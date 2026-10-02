/**
 * Small per-browser conveniences (drafts, query history) that do not belong in
 * the progress record. Every access is guarded: storage can be full, blocked
 * or missing, and the pages must still work.
 */
export function readJson<T>(key: string, fallback: T): T {
  try {
    const raw = window.localStorage.getItem(key)
    return raw ? (JSON.parse(raw) as T) : fallback
  } catch {
    return fallback
  }
}

export function writeJson(key: string, value: unknown): void {
  try {
    window.localStorage.setItem(key, JSON.stringify(value))
  } catch {
    /* Storage full or blocked: drafts and history just do not persist. */
  }
}
