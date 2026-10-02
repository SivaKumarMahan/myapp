import jmespath from 'jmespath'
import { CliError } from './errors'

/**
 * Output, the way the Azure CLI does it: `--query` (JMESPath) is applied
 * first, then `--output` formats what is left.
 */

export type OutputFormat = 'json' | 'jsonc' | 'table' | 'tsv' | 'yaml' | 'yamlc' | 'none'
export const OUTPUT_FORMATS: OutputFormat[] = [
  'json',
  'jsonc',
  'table',
  'tsv',
  'yaml',
  'yamlc',
  'none',
]

export function applyQuery(value: unknown, query: string | undefined): unknown {
  if (!query) return value
  try {
    return jmespath.search(value as never, query)
  } catch (error) {
    throw new CliError(
      `argument --query: invalid jmespath_type value: '${query}'\n${error instanceof Error ? error.message : String(error)}`,
    )
  }
}

const isScalar = (value: unknown) => value === null || typeof value !== 'object'
const capitalize = (key: string) => key.charAt(0).toUpperCase() + key.slice(1)
const cell = (value: unknown) => (value === null || value === undefined ? '' : String(value))

/** az's default table: the scalar top-level fields, keys capitalised. */
function table(value: unknown): string {
  const rows = (Array.isArray(value) ? value : [value]).filter((row) => row !== undefined)
  if (rows.length === 0) return ''
  if (rows.every(isScalar)) {
    const width = Math.max(6, ...rows.map((row) => cell(row).length))
    return ['Result', '-'.repeat(width), ...rows.map(cell)].join('\n')
  }
  const keys: string[] = []
  for (const row of rows) {
    if (!row || typeof row !== 'object') continue
    for (const [key, item] of Object.entries(row)) {
      if (isScalar(item) && !keys.includes(key) && key !== 'id' && key !== 'etag') keys.push(key)
    }
  }
  const headers = keys.map(capitalize)
  const data = rows.map((row) => keys.map((key) => cell((row as Record<string, unknown>)[key])))
  const widths = headers.map((header, index) =>
    Math.max(header.length, ...data.map((row) => row[index].length)),
  )
  const line = (cells: string[]) =>
    cells
      .map((text, index) => text.padEnd(widths[index]))
      .join('    ')
      .trimEnd()
  return [line(headers), line(widths.map((width) => '-'.repeat(width))), ...data.map(line)].join(
    '\n',
  )
}

/** az's tsv: one line per item, the scalar fields tab-separated. */
function tsv(value: unknown): string {
  const rows = Array.isArray(value) ? value : [value]
  return rows
    .map((row) =>
      isScalar(row)
        ? cell(row)
        : Array.isArray(row)
          ? row.map(cell).join('\t')
          : Object.values(row as Record<string, unknown>)
              .filter(isScalar)
              .map(cell)
              .join('\t'),
    )
    .join('\n')
}

function yaml(value: unknown, indent = ''): string {
  if (isScalar(value)) {
    if (typeof value === 'string')
      return /^[\w./:@-]*$/.test(value) && value !== '' ? value : JSON.stringify(value)
    return value === null ? 'null' : String(value)
  }
  if (Array.isArray(value)) {
    if (value.length === 0) return '[]'
    return value
      .map((item) => {
        const text = yaml(item, `${indent}  `)
        return `${indent}- ${isScalar(item) ? text : text.trimStart()}`
      })
      .join('\n')
  }
  const entries = Object.entries(value as Record<string, unknown>)
  if (entries.length === 0) return '{}'
  return entries
    .map(([key, item]) => {
      if (
        isScalar(item) ||
        (Array.isArray(item) && item.length === 0) ||
        (!Array.isArray(item) && Object.keys(item as object).length === 0)
      ) {
        return `${indent}${key}: ${yaml(item, indent)}`
      }
      return `${indent}${key}:\n${yaml(item, Array.isArray(item) ? indent : `${indent}  `)}`
    })
    .join('\n')
}

export function formatOutput(value: unknown, format: OutputFormat): string {
  if (value === undefined || format === 'none') return ''
  switch (format) {
    case 'table':
      return table(value)
    case 'tsv':
      return tsv(value)
    case 'yaml':
    case 'yamlc':
      return yaml(value)
    default:
      return JSON.stringify(value, null, 2)
  }
}
