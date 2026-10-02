import {
  LineCounter,
  isMap,
  isScalar,
  isSeq,
  parseAllDocuments,
  type Document,
  type Node,
  type Pair,
} from 'yaml'
import type { Finding } from './types'

/**
 * YAML with positions. The `yaml` package keeps where every node came from,
 * which is what lets a schema error or a missing `resources:` point at a line.
 */

export interface ParsedYaml {
  docs: Document.Parsed[]
  lines: LineCounter
  /** Syntax errors, already as findings. */
  syntax: Finding[]
}

export function parseYaml(text: string): ParsedYaml {
  const lines = new LineCounter()
  const docs = parseAllDocuments(text, {
    lineCounter: lines,
    prettyErrors: false,
    uniqueKeys: true,
  })
  const list = Array.isArray(docs) ? docs : [docs]
  const syntax: Finding[] = []
  for (const doc of list as Document.Parsed[]) {
    for (const error of [...doc.errors, ...doc.warnings]) {
      const line = lines.linePos(error.pos[0]).line
      syntax.push({
        rule: 'YAML',
        severity: doc.errors.includes(error as never) ? 'error' : 'warning',
        title: error.code === 'DUPLICATE_KEY' ? 'Duplicate key' : 'YAML syntax error',
        message: error.message.split('\n')[0].replace(/ at line \d+, column \d+.*$/, ''),
        line,
      })
    }
  }
  return { docs: (list as Document.Parsed[]).filter((doc) => doc.contents !== null), lines, syntax }
}

export type Path = (string | number)[]

/** The line of the node at `path` - or of the nearest ancestor that exists. */
export function lineAt(doc: Document.Parsed, lines: LineCounter, path: Path, key = false): number {
  for (let length = path.length; length >= 0; length -= 1) {
    const partial = path.slice(0, length)
    if (key && length === path.length && partial.length > 0) {
      const parent =
        partial.length === 1
          ? doc.contents
          : (doc.getIn(partial.slice(0, -1), true) as Node | undefined)
      if (parent && isMap(parent)) {
        const pair = parent.items.find(
          (item: Pair) => isScalar(item.key) && item.key.value === partial[partial.length - 1],
        )
        const range = (pair?.key as Node | undefined)?.range
        if (range) return lines.linePos(range[0]).line
      }
    }
    const node = (partial.length === 0 ? doc.contents : doc.getIn(partial, true)) as
      Node | undefined
    if (node?.range) return lines.linePos(node.range[0]).line
  }
  return 1
}

/** Converts an Ajv instancePath ("/stages/0/jobs") to a path. */
export const pointerToPath = (pointer: string): Path =>
  pointer
    .split('/')
    .slice(1)
    .map((part) => part.replace(/~1/g, '/').replace(/~0/g, '~'))
    .map((part) => (/^\d+$/.test(part) ? Number(part) : part))

export const isMapping = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

export { isMap, isSeq }
