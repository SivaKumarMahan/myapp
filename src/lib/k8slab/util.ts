import type { Labels } from './types'

/** Small, dependency-free helpers shared by the Kubernetes lab. */

/** The lab clock's origin (a fixed date, so output is deterministic). */
export const CLOCK_ORIGIN = Date.UTC(2026, 10, 11, 9, 0, 0)

export const isoAt = (seconds: number) =>
  new Date(CLOCK_ORIGIN + Math.round(seconds) * 1000).toISOString().replace('.000Z', 'Z')

export const secondsOf = (iso: string | undefined, fallback = 0) => {
  if (!iso) return fallback
  const time = Date.parse(iso)
  return Number.isNaN(time) ? fallback : (time - CLOCK_ORIGIN) / 1000
}

/** FNV-1a: a stable hash for deterministic names. */
export function fnv(text: string): number {
  let hash = 0x811c9dc5
  for (let index = 0; index < text.length; index++) {
    hash ^= text.charCodeAt(index)
    hash = Math.imul(hash, 0x01000193) >>> 0
  }
  return hash >>> 0
}

/** Kubernetes' "safe" alphabet for generated name suffixes (no vowels, no 0/1/3). */
const ALPHABET = 'bcdfghjklmnpqrstvwxz2456789'

export function nameSuffix(seed: string, length: number): string {
  let out = ''
  let hash = fnv(seed)
  for (let index = 0; index < length; index++) {
    out += ALPHABET[hash % ALPHABET.length]
    hash = fnv(`${seed}:${out}:${index}`)
  }
  return out
}

export function uidFor(seed: string): string {
  const hex = (salt: string) => fnv(`${seed}${salt}`).toString(16).padStart(8, '0')
  const all = hex('a') + hex('b') + hex('c') + hex('d')
  return `${all.slice(0, 8)}-${all.slice(8, 12)}-4${all.slice(13, 16)}-a${all.slice(17, 20)}-${all.slice(20, 32)}`
}

/** JSON with sorted keys - equal objects always give equal strings. */
export function stableJson(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stableJson).join(',')}]`
  if (value && typeof value === 'object') {
    const entries = Object.entries(value as Record<string, unknown>)
      .filter(([, entry]) => entry !== undefined)
      .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
    return `{${entries.map(([key, entry]) => `${JSON.stringify(key)}:${stableJson(entry)}`).join(',')}}`
  }
  return JSON.stringify(value)
}

export const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value)) as T

/** kubectl's human-readable durations (duration.HumanDuration). */
export function humanAge(seconds: number): string {
  if (seconds < -1) return '<invalid>'
  const total = Math.max(0, Math.floor(seconds))
  if (total < 120) return `${total}s`
  const minutes = Math.floor(total / 60)
  if (minutes < 10) {
    const rest = total % 60
    return rest === 0 ? `${minutes}m` : `${minutes}m${rest}s`
  }
  if (minutes < 180) return `${minutes}m`
  const hours = Math.floor(total / 3600)
  if (hours < 8) {
    const rest = minutes % 60
    return rest === 0 ? `${hours}h` : `${hours}h${rest}m`
  }
  if (hours < 48) return `${hours}h`
  if (hours < 24 * 8) {
    const rest = hours % 24
    return rest === 0 ? `${Math.floor(hours / 24)}d` : `${Math.floor(hours / 24)}d${rest}h`
  }
  if (hours < 24 * 365 * 2) return `${Math.floor(hours / 24)}d`
  return `${Math.floor(hours / 24 / 365)}y`
}

/** CPU quantity → millicores ("500m", "0.5", "2"). NaN when unreadable. */
export function cpuMillis(quantity: string | number | undefined): number {
  if (quantity === undefined) return 0
  const text = String(quantity).trim()
  if (/^\d+(\.\d+)?m$/.test(text)) return Number(text.slice(0, -1))
  if (/^\d+(\.\d+)?$/.test(text)) return Number(text) * 1000
  return Number.NaN
}

const MEMORY_UNITS: Record<string, number> = {
  '': 1 / (1024 * 1024),
  k: 1000 / (1024 * 1024),
  K: 1000 / (1024 * 1024),
  M: 1e6 / (1024 * 1024),
  G: 1e9 / (1024 * 1024),
  T: 1e12 / (1024 * 1024),
  Ki: 1 / 1024,
  Mi: 1,
  Gi: 1024,
  Ti: 1024 * 1024,
}

/** Memory quantity → MiB ("256Mi", "1Gi", "512M", "1073741824"). NaN when unreadable. */
export function memoryMi(quantity: string | number | undefined): number {
  if (quantity === undefined) return 0
  const match = /^(\d+(?:\.\d+)?)([KMGT]i?|k)?$/.exec(String(quantity).trim())
  if (!match) return Number.NaN
  return Number(match[1]) * MEMORY_UNITS[match[2] ?? '']
}

export const matchesSelector = (selector: Labels | undefined, labels: Labels | undefined) =>
  Boolean(selector) &&
  Object.keys(selector ?? {}).length > 0 &&
  Object.entries(selector ?? {}).every(([key, value]) => labels?.[key] === value)

export const labelText = (labels: Labels | undefined) =>
  Object.entries(labels ?? {})
    .map(([key, value]) => `${key}=${value}`)
    .join(',') || '<none>'

/** Base64 that works in the browser and in Node. */
export const toBase64 = (text: string) => btoa(unescape(encodeURIComponent(text)))
export const fromBase64 = (text: string) => {
  try {
    return decodeURIComponent(escape(atob(text)))
  } catch {
    return ''
  }
}

/** Pads columns the way kubectl's tabwriter does (three spaces between columns). */
export function table(rows: string[][]): string {
  if (rows.length === 0) return ''
  const widths: number[] = []
  for (const row of rows)
    row.forEach((cell, index) => {
      widths[index] = Math.max(widths[index] ?? 0, cell.length)
    })
  return rows
    .map((row) =>
      row
        .map((cell, index) => (index === row.length - 1 ? cell : cell.padEnd(widths[index] + 3)))
        .join('')
        .trimEnd(),
    )
    .join('\n')
}
