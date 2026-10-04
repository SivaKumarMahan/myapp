import { gunzipSync as inflate, gzipSync as deflate } from 'fflate'

/**
 * just-bash's browser bundle imports `gzipSync` / `gunzipSync` from
 * `node:zlib` (for gzip, zcat and tar z). Vite aliases `node:zlib` to this
 * module in the browser build; tests run in Node and use the real zlib.
 */

type Level = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9

export const constants = { Z_BEST_SPEED: 1, Z_BEST_COMPRESSION: 9, Z_DEFAULT_COMPRESSION: -1 }

export function gzipSync(data: Uint8Array, options: { level?: number } = {}): Uint8Array {
  const level = options.level === undefined || options.level < 0 ? 6 : Math.min(9, options.level)
  return deflate(data, { level: level as Level })
}

export function gunzipSync(
  data: Uint8Array,
  options: { maxOutputLength?: number } = {},
): Uint8Array {
  const out = inflate(data)
  if (options.maxOutputLength !== undefined && out.length > options.maxOutputLength) {
    throw new RangeError('Cannot create a Buffer larger than maxOutputLength')
  }
  return out
}

export default { constants, gzipSync, gunzipSync }
