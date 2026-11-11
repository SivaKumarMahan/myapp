/**
 * Enough of kubectl's JSONPath for everyday use:
 * `{.spec.template.spec.containers[0].image}`, `{.items[*].metadata.name}`,
 * `{range .items[*]}{.metadata.name}{"\n"}{end}`, `{..namespace}` and
 * `[?(@.name=="web")]` filters.
 */

type Value = unknown

function step(values: Value[], segment: string): Value[] {
  const out: Value[] = []
  for (const value of values) {
    if (value === null || value === undefined) continue
    if (segment === '*') {
      if (Array.isArray(value)) out.push(...value)
      else if (typeof value === 'object') out.push(...Object.values(value as object))
    } else if (/^-?\d+$/.test(segment)) {
      if (Array.isArray(value)) {
        const index = Number(segment)
        const item = value[index < 0 ? value.length + index : index]
        if (item !== undefined) out.push(item)
      }
    } else if (segment.startsWith('?(')) {
      const match = /^\?\(@\.([\w.-]+)\s*(==|!=)\s*["']?([^"')]*)["']?\)$/.exec(segment)
      if (match && Array.isArray(value)) {
        for (const item of value) {
          const field = resolve(item, `.${match[1]}`)[0]
          const equal = String(field) === match[3]
          if (match[2] === '==' ? equal : !equal) out.push(item)
        }
      }
    } else if (typeof value === 'object' && !Array.isArray(value)) {
      const item = (value as Record<string, Value>)[segment]
      if (item !== undefined) out.push(item)
    }
  }
  return out
}

function deep(values: Value[], key: string): Value[] {
  const out: Value[] = []
  const walk = (value: Value) => {
    if (Array.isArray(value)) value.forEach(walk)
    else if (value && typeof value === 'object') {
      for (const [name, item] of Object.entries(value as Record<string, Value>)) {
        if (name === key) out.push(item)
        walk(item)
      }
    }
  }
  values.forEach(walk)
  return out
}

/** Evaluates one path (".a.b[0]") against a root object. */
export function resolve(root: Value, path: string): Value[] {
  let values: Value[] = [root]
  const pattern = /\.\.([\w-]+)|\.([\w-]+)|\['([^']+)'\]|\[([^\]]+)\]/g
  let match: RegExpExecArray | null
  let consumed = 0
  const text = path.trim().replace(/^\$/, '')
  while ((match = pattern.exec(text))) {
    if (match.index !== consumed) break
    consumed = match.index + match[0].length
    if (match[1]) values = deep(values, match[1])
    else values = step(values, match[2] ?? match[3] ?? match[4])
  }
  return values
}

const show = (value: Value) =>
  value === null || value === undefined
    ? ''
    : typeof value === 'object'
      ? JSON.stringify(value)
      : String(value)

/** Renders a kubectl JSONPath template. Throws on a malformed one. */
export function jsonpath(root: Value, template: string): string {
  const tokens = template.match(/\{[^{}]*\}|[^{}]+/g) ?? []
  const render = (list: string[], scope: Value): string => {
    let out = ''
    for (let index = 0; index < list.length; index++) {
      const token = list[index]
      if (!token.startsWith('{')) {
        out += token
        continue
      }
      const inner = token.slice(1, -1).trim()
      if (inner.startsWith('range ')) {
        let depth = 1
        let end = index + 1
        for (; end < list.length; end++) {
          const word = list[end].slice(1, -1).trim()
          if (word.startsWith('range ')) depth++
          if (word === 'end') depth--
          if (depth === 0) break
        }
        const body = list.slice(index + 1, end)
        for (const item of resolve(scope, inner.slice(6))) out += render(body, item)
        index = end
        continue
      }
      if (inner === 'end') continue
      if (/^".*"$/.test(inner)) {
        out += inner.slice(1, -1).replace(/\\n/g, '\n').replace(/\\t/g, '\t')
        continue
      }
      if (!inner.startsWith('.') && !inner.startsWith('$') && !inner.startsWith('['))
        throw new Error(
          `error: error parsing jsonpath ${template}, unrecognized identifier ${inner}`,
        )
      out += resolve(scope, inner).map(show).join(' ')
    }
    return out
  }
  return render(tokens, root)
}
