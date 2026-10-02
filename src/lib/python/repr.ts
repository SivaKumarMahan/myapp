/** JSON values written the way Python prints them, so results read naturally. */
export function pyRepr(value: unknown): string {
  if (value === null || value === undefined) return 'None'
  if (value === true) return 'True'
  if (value === false) return 'False'
  if (typeof value === 'string')
    return JSON.stringify(value).replace(/^"|"$/g, "'").replace(/\\"/g, '"')
  if (typeof value === 'number')
    return Number.isInteger(value) ? String(value) : String(Math.round(value * 1e9) / 1e9)
  if (Array.isArray(value)) return `[${value.map(pyRepr).join(', ')}]`
  return `{${Object.entries(value as Record<string, unknown>)
    .map(([key, item]) => `${pyRepr(key)}: ${pyRepr(item)}`)
    .join(', ')}}`
}
