import { HclError, UNKNOWN, isUnknown, type Expr, type Value } from './hcl'

/**
 * Evaluates HCL expressions to plain values. References are resolved by the
 * caller (the plan engine), which knows about variables, locals, resources
 * and modules; this file only knows how to walk into values and run the
 * built-in functions the lab supports.
 */

export type Step = { attr: string } | { index: Expr }

export interface EvalContext {
  file: string
  /** for-expression variables, innermost last. */
  locals?: Map<string, Value>
  /**
   * Resolves a reference root. It may consume some of the steps (e.g. `var.x`
   * consumes `.x`) and returns the value plus how many steps it used.
   */
  resolve: (root: string, steps: Step[], line: number) => { value: Value; used: number }
}

const sets = new WeakSet<Value[]>()

/** Marks an array as a set (what `toset()` returns) - `for_each` needs to know. */
export function asSet(values: Value[]): Value[] {
  const unique: Value[] = []
  for (const value of values)
    if (!unique.some((other) => deepEqual(other, value))) unique.push(value)
  unique.sort((a, b) => String(a).localeCompare(String(b)))
  sets.add(unique)
  return unique
}
export const isSet = (value: Value): boolean => Array.isArray(value) && sets.has(value)

export const isObject = (value: Value): value is { [key: string]: Value } =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

export function deepEqual(a: Value | undefined, b: Value | undefined): boolean {
  if (a === b) return true
  if (Array.isArray(a) && Array.isArray(b))
    return a.length === b.length && a.every((item, index) => deepEqual(item, b[index]))
  if (a && b && isObject(a) && isObject(b)) {
    const keys = new Set([...Object.keys(a), ...Object.keys(b)])
    for (const key of keys) if (!deepEqual(a[key], b[key])) return false
    return true
  }
  return false
}

export const containsUnknown = (value: Value | undefined): boolean =>
  isUnknown(value) ||
  (Array.isArray(value)
    ? value.some(containsUnknown)
    : isObject(value as Value)
      ? Object.values(value as { [key: string]: Value }).some(containsUnknown)
      : false)

export const typeName = (value: Value): string =>
  value === null
    ? 'null'
    : Array.isArray(value)
      ? isSet(value)
        ? 'set'
        : 'tuple'
      : typeof value === 'object'
        ? 'object'
        : typeof value

function evalError(ctx: EvalContext, line: number, summary: string, detail: string): never {
  throw new HclError({ severity: 'error', summary, detail, file: ctx.file, line })
}

export function toStringValue(ctx: EvalContext, value: Value, line: number): string {
  if (typeof value === 'string') return value
  if (typeof value === 'number' || typeof value === 'boolean') return String(value)
  if (value === null)
    return evalError(
      ctx,
      line,
      'Invalid template interpolation value',
      'The expression result is null. Cannot include a null value in a string template.',
    )
  return evalError(
    ctx,
    line,
    'Invalid template interpolation value',
    `Cannot include the given value in a string template: string required, but have ${typeName(value)}.`,
  )
}

/** Applies attribute / index steps to a value. */
export function walk(ctx: EvalContext, start: Value, steps: Step[], line: number): Value {
  let value = start
  for (const step of steps) {
    if (isUnknown(value)) return UNKNOWN
    if ('attr' in step) {
      if (!isObject(value))
        evalError(
          ctx,
          line,
          'Unsupported attribute',
          `Can't access attributes on a ${typeName(value)} value. Did you mean to use an index?`,
        )
      const object = value as { [key: string]: Value }
      if (!(step.attr in object))
        evalError(
          ctx,
          line,
          'Unsupported attribute',
          `This object does not have an attribute named "${step.attr}".`,
        )
      value = object[step.attr]
    } else {
      const key = evaluate(step.index, ctx)
      if (isUnknown(key)) return UNKNOWN
      if (Array.isArray(value)) {
        if (typeof key !== 'number')
          evalError(
            ctx,
            line,
            'Invalid index',
            'The given key does not identify an element in this collection value: a number is required.',
          )
        const index = key as number
        if (index < 0 || index >= value.length)
          evalError(
            ctx,
            line,
            'Invalid index',
            `The given key does not identify an element in this collection value: the collection has ${value.length} elements and index ${index} is out of range.`,
          )
        value = value[index]
      } else if (isObject(value)) {
        const name = String(key)
        if (!(name in value))
          evalError(
            ctx,
            line,
            'Invalid index',
            `The given key does not identify an element in this collection value. There is no key ${JSON.stringify(name)}.`,
          )
        value = value[name]
      } else {
        evalError(
          ctx,
          line,
          'Invalid index',
          `This value does not have any indices (it is a ${typeName(value)}).`,
        )
      }
    }
  }
  return value
}

/** Splits `a.b[c].d` into its root name and steps. */
export function flatten(expr: Expr): { root: string; steps: Step[] } | null {
  const steps: Step[] = []
  let current = expr
  for (;;) {
    if (current.k === 'name') return { root: current.name, steps }
    if (current.k === 'attr') steps.unshift({ attr: current.name })
    else if (current.k === 'index') steps.unshift({ index: current.key })
    else return null
    current = current.obj
  }
}

/** Every reference root + first steps an expression uses (for dependencies). */
export function references(expr: Expr | null | undefined, out: string[][] = []): string[][] {
  if (!expr) return out
  switch (expr.k) {
    case 'lit':
      return out
    case 'tpl':
      for (const part of expr.parts) if (typeof part !== 'string') references(part, out)
      return out
    case 'list':
      for (const item of expr.items) references(item, out)
      return out
    case 'obj':
      for (const item of expr.items) {
        references(item.key, out)
        references(item.value, out)
      }
      return out
    case 'name':
    case 'attr':
    case 'index': {
      const flat = flatten(expr)
      if (flat) {
        const names = [flat.root]
        for (const step of flat.steps) {
          if ('attr' in step) names.push(step.attr)
          else {
            references(step.index, out)
            if (step.index.k === 'lit') names.push(`[${JSON.stringify(step.index.v)}]`)
            else break
          }
        }
        out.push(names)
      } else if (expr.k !== 'name') {
        references(expr.obj, out)
        if (expr.k === 'index') references(expr.key, out)
      }
      return out
    }
    case 'splat':
      return references(expr.obj, out)
    case 'call':
      for (const arg of expr.args) references(arg, out)
      return out
    case 'cond':
      references(expr.test, out)
      references(expr.then, out)
      return references(expr.else, out)
    case 'bin':
      references(expr.left, out)
      return references(expr.right, out)
    case 'unary':
      return references(expr.expr, out)
    case 'for': {
      const inner: string[][] = []
      references(expr.coll, out)
      references(expr.keyExpr, inner)
      references(expr.valExpr, inner)
      references(expr.cond, inner)
      for (const names of inner)
        if (names[0] !== expr.valVar && names[0] !== expr.keyVar) out.push(names)
      return out
    }
  }
}

/* ---------- functions ---------- */

type Fn = (ctx: EvalContext, args: Value[], line: number) => Value

const needString = (ctx: EvalContext, value: Value, fn: string, line: number): string => {
  if (typeof value === 'string') return value
  if (typeof value === 'number' || typeof value === 'boolean') return String(value)
  return evalError(
    ctx,
    line,
    'Invalid function argument',
    `Invalid value for "${fn}" argument: string required.`,
  )
}

const needList = (ctx: EvalContext, value: Value, fn: string, line: number): Value[] => {
  if (Array.isArray(value)) return value
  return evalError(
    ctx,
    line,
    'Invalid function argument',
    `Invalid value for "${fn}" argument: list or set required, but have ${typeName(value)}.`,
  )
}

function ipToInt(ip: string): number {
  return ip.split('.').reduce((acc, part) => acc * 256 + Number(part), 0)
}
const intToIp = (value: number) =>
  [24, 16, 8, 0].map((shift) => Math.floor(value / 2 ** shift) % 256).join('.')

const FUNCTIONS: Record<string, Fn> = {
  length: (ctx, [value], line) => {
    if (typeof value === 'string') return [...value].length
    if (Array.isArray(value)) return value.length
    if (isObject(value)) return Object.keys(value).length
    return evalError(
      ctx,
      line,
      'Invalid function argument',
      'Invalid value for "value" parameter: collection or string required.',
    )
  },
  lower: (ctx, [value], line) => needString(ctx, value, 'str', line).toLowerCase(),
  upper: (ctx, [value], line) => needString(ctx, value, 'str', line).toUpperCase(),
  trimspace: (ctx, [value], line) => needString(ctx, value, 'str', line).trim(),
  title: (ctx, [value], line) =>
    needString(ctx, value, 'str', line).replace(/\b\w/g, (letter) => letter.toUpperCase()),
  tostring: (ctx, [value], line) => needString(ctx, value, 'v', line),
  tonumber: (ctx, [value], line) => {
    const number = Number(value)
    if (value === null || Number.isNaN(number))
      evalError(
        ctx,
        line,
        'Invalid function argument',
        'Cannot convert the given value to a number.',
      )
    return number
  },
  tobool: (_ctx, [value]) => value === true || value === 'true',
  toset: (ctx, [value], line) => asSet(needList(ctx, value, 'v', line)),
  tolist: (ctx, [value], line) => [...needList(ctx, value, 'v', line)],
  tomap: (ctx, [value], line) => {
    if (!isObject(value))
      evalError(
        ctx,
        line,
        'Invalid function argument',
        'Invalid value for "v" parameter: map required.',
      )
    return value
  },
  join: (ctx, [sep, list], line) =>
    needList(ctx, list, 'lists', line)
      .map((item) => needString(ctx, item, 'lists', line))
      .join(needString(ctx, sep, 'separator', line)),
  split: (ctx, [sep, value], line) =>
    needString(ctx, value, 'str', line).split(needString(ctx, sep, 'separator', line)),
  concat: (ctx, args, line) => args.flatMap((arg) => needList(ctx, arg, 'seqs', line)),
  merge: (ctx, args, line) => {
    const out: { [key: string]: Value } = {}
    for (const arg of args) {
      if (arg === null) continue
      if (!isObject(arg))
        evalError(
          ctx,
          line,
          'Invalid function argument',
          'Invalid value for "maps" parameter: arguments must be maps or objects.',
        )
      Object.assign(out, arg)
    }
    return out
  },
  keys: (ctx, [value], line) => {
    if (!isObject(value))
      evalError(
        ctx,
        line,
        'Invalid function argument',
        'Invalid value for "inputMap" parameter: must have map or object type.',
      )
    return Object.keys(value as object).sort()
  },
  values: (ctx, [value], line) => {
    if (!isObject(value))
      evalError(
        ctx,
        line,
        'Invalid function argument',
        'Invalid value for "values" parameter: must have map or object type.',
      )
    const object = value as { [key: string]: Value }
    return Object.keys(object)
      .sort()
      .map((key) => object[key])
  },
  lookup: (ctx, [map, key, fallback], line) => {
    if (!isObject(map))
      evalError(
        ctx,
        line,
        'Invalid function argument',
        'Invalid value for "inputMap" parameter: map required.',
      )
    const name = needString(ctx, key, 'key', line)
    const object = map as { [key: string]: Value }
    if (name in object) return object[name]
    if (fallback === undefined)
      evalError(
        ctx,
        line,
        'Invalid function argument',
        `The given key ${JSON.stringify(name)} is not in the map and no default was given.`,
      )
    return fallback
  },
  contains: (ctx, [list, value], line) =>
    needList(ctx, list, 'list', line).some((item) => deepEqual(item, value)),
  element: (ctx, [list, index], line) => {
    const items = needList(ctx, list, 'list', line)
    if (!items.length)
      evalError(
        ctx,
        line,
        'Invalid function argument',
        'Cannot use element function with an empty list.',
      )
    return items[Number(index) % items.length]
  },
  flatten: (ctx, [list], line) => {
    const out: Value[] = []
    const visit = (value: Value) => {
      if (Array.isArray(value)) value.forEach(visit)
      else out.push(value)
    }
    needList(ctx, list, 'list', line).forEach(visit)
    return out
  },
  distinct: (ctx, [list], line) => {
    const out: Value[] = []
    for (const item of needList(ctx, list, 'list', line))
      if (!out.some((other) => deepEqual(other, item))) out.push(item)
    return out
  },
  sort: (ctx, [list], line) =>
    [...needList(ctx, list, 'list', line)].sort((a, b) => String(a).localeCompare(String(b))),
  coalesce: (ctx, args, line) => {
    const found = args.find((arg) => arg !== null && arg !== '')
    if (found === undefined)
      evalError(ctx, line, 'Invalid function argument', 'No non-null, non-empty-string arguments.')
    return found as Value
  },
  zipmap: (ctx, [keys, values], line) => {
    const names = needList(ctx, keys, 'keys', line)
    const items = needList(ctx, values, 'values', line)
    return Object.fromEntries(names.map((name, index) => [String(name), items[index] ?? null]))
  },
  range: (_ctx, args) => {
    const [start, end, step] =
      args.length === 1
        ? [0, Number(args[0]), 1]
        : [Number(args[0]), Number(args[1]), Number(args[2] ?? 1)]
    const out: number[] = []
    for (let value = start; step > 0 ? value < end : value > end; value += step) out.push(value)
    return out
  },
  max: (_ctx, args) => Math.max(...args.map(Number)),
  min: (_ctx, args) => Math.min(...args.map(Number)),
  abs: (_ctx, [value]) => Math.abs(Number(value)),
  replace: (ctx, [value, search, replacement], line) =>
    needString(ctx, value, 'str', line)
      .split(needString(ctx, search, 'substr', line))
      .join(needString(ctx, replacement, 'replace', line)),
  substr: (ctx, [value, offset, length], line) => {
    const text = needString(ctx, value, 'str', line)
    const start = Number(offset)
    const count = Number(length)
    return count < 0 ? text.slice(start) : text.slice(start, start + count)
  },
  startswith: (ctx, [value, prefix], line) =>
    needString(ctx, value, 'str', line).startsWith(needString(ctx, prefix, 'prefix', line)),
  endswith: (ctx, [value, suffix], line) =>
    needString(ctx, value, 'str', line).endsWith(needString(ctx, suffix, 'suffix', line)),
  format: (ctx, [spec, ...args], line) => {
    let index = 0
    return needString(ctx, spec, 'format', line).replace(/%(%|[sdv]|\d*d)/g, (token) => {
      if (token === '%%') return '%'
      const arg = args[index++]
      if (arg === undefined)
        evalError(
          ctx,
          line,
          'Error in function call',
          'Not enough arguments for the format string.',
        )
      if (token.endsWith('d')) {
        const width = Number(token.slice(1, -1)) || 0
        return String(Math.trunc(Number(arg))).padStart(width, '0')
      }
      return typeof arg === 'string' ? arg : JSON.stringify(arg)
    })
  },
  jsonencode: (_ctx, [value]) => JSON.stringify(value),
  one: (ctx, [list], line) => {
    const items = needList(ctx, list, 'list', line)
    if (items.length > 1)
      evalError(
        ctx,
        line,
        'Invalid function argument',
        'Must be a list, set, or tuple value with either zero or one elements.',
      )
    return items[0] ?? null
  },
  cidrsubnet: (ctx, [prefix, newbits, netnum], line) => {
    const match = /^(\d+\.\d+\.\d+\.\d+)\/(\d+)$/.exec(needString(ctx, prefix, 'prefix', line))
    if (!match)
      return evalError(
        ctx,
        line,
        'Invalid function argument',
        'Invalid value for "prefix" parameter: invalid CIDR address.',
      )
    const bits = Number(match[2]) + Number(newbits)
    if (bits > 32)
      evalError(
        ctx,
        line,
        'Invalid function argument',
        `Insufficient address space to extend prefix of ${match[2]} by ${newbits}.`,
      )
    const base = ipToInt(match[1])
    const size = 2 ** (32 - bits)
    return `${intToIp(base + Number(netnum) * size)}/${bits}`
  },
}

export const FUNCTION_NAMES = Object.keys(FUNCTIONS).concat(['try', 'can'])

/* ---------- evaluation ---------- */

function arith(ctx: EvalContext, op: string, left: Value, right: Value, line: number): Value {
  if (isUnknown(left) || isUnknown(right)) return UNKNOWN
  switch (op) {
    case '==':
      return deepEqual(left, right)
    case '!=':
      return !deepEqual(left, right)
    case '&&':
    case '||': {
      if (typeof left !== 'boolean' || typeof right !== 'boolean')
        evalError(
          ctx,
          line,
          'Invalid operand',
          `Unsuitable value for ${op === '&&' ? 'left' : 'right'} operand: a bool is required.`,
        )
      return op === '&&' ? left && right : left || right
    }
    default: {
      const a = Number(left)
      const b = Number(right)
      if (Number.isNaN(a) || Number.isNaN(b) || left === null || right === null)
        evalError(
          ctx,
          line,
          'Invalid operand',
          `Unsuitable value for the ${op} operator: a number is required.`,
        )
      switch (op) {
        case '+':
          return a + b
        case '-':
          return a - b
        case '*':
          return a * b
        case '/':
          return a / b
        case '%':
          return a % b
        case '<':
          return a < b
        case '>':
          return a > b
        case '<=':
          return a <= b
        default:
          return a >= b
      }
    }
  }
}

export function evaluate(expr: Expr, ctx: EvalContext): Value {
  switch (expr.k) {
    case 'lit':
      return expr.v
    case 'tpl': {
      let out = ''
      for (const part of expr.parts) {
        if (typeof part === 'string') out += part
        else {
          const value = evaluate(part, ctx)
          if (isUnknown(value)) return UNKNOWN
          out += toStringValue(ctx, value, part.line)
        }
      }
      return out
    }
    case 'list':
      return expr.items.map((item) => evaluate(item, ctx))
    case 'obj': {
      const out: { [key: string]: Value } = {}
      for (const item of expr.items) {
        const key = evaluate(item.key, ctx)
        if (isUnknown(key)) return UNKNOWN
        out[toStringValue(ctx, key, item.key.line)] = evaluate(item.value, ctx)
      }
      return out
    }
    case 'name':
    case 'attr':
    case 'index': {
      const flat = flatten(expr)
      if (flat) {
        const local = ctx.locals?.get(flat.root)
        if (local !== undefined) return walk(ctx, local, flat.steps, expr.line)
        const { value, used } = ctx.resolve(flat.root, flat.steps, expr.line)
        return walk(ctx, value, flat.steps.slice(used), expr.line)
      }
      // e.g. toset(x)[0] or (expr).attr
      const base = evaluate(expr.k === 'name' ? expr : expr.obj, ctx)
      const step: Step =
        expr.k === 'attr' ? { attr: expr.name } : { index: (expr as { key: Expr }).key }
      return walk(ctx, base, [step], expr.line)
    }
    case 'splat': {
      const base = evaluate(expr.obj, ctx)
      if (isUnknown(base)) return UNKNOWN
      const items = Array.isArray(base)
        ? base
        : isObject(base)
          ? [base]
          : base === null
            ? []
            : [base]
      return items.map((item) =>
        walk(
          ctx,
          item,
          expr.steps.map((step) => ('attr' in step ? step : step)),
          expr.line,
        ),
      )
    }
    case 'call': {
      if (expr.name === 'try') {
        for (const arg of expr.args) {
          try {
            return evaluate(arg, ctx)
          } catch (error) {
            if (!(error instanceof HclError)) throw error
          }
        }
        return evalError(
          ctx,
          expr.line,
          'Error in function call',
          'Call to function "try" failed: no expression succeeded.',
        )
      }
      if (expr.name === 'can') {
        try {
          evaluate(expr.args[0], ctx)
          return true
        } catch (error) {
          if (!(error instanceof HclError)) throw error
          return false
        }
      }
      const fn = FUNCTIONS[expr.name]
      if (!fn)
        evalError(
          ctx,
          expr.line,
          'Call to unknown function',
          `There is no function named "${expr.name}" in this lab.`,
        )
      const args = expr.args.map((arg) => evaluate(arg, ctx))
      if (args.some(containsUnknown)) return UNKNOWN
      return fn(ctx, args, expr.line)
    }
    case 'cond': {
      const test = evaluate(expr.test, ctx)
      if (isUnknown(test)) return UNKNOWN
      if (typeof test !== 'boolean')
        evalError(
          ctx,
          expr.line,
          'Incorrect condition type',
          'The condition expression must be of type bool.',
        )
      return evaluate(test ? expr.then : expr.else, ctx)
    }
    case 'bin':
      return arith(ctx, expr.op, evaluate(expr.left, ctx), evaluate(expr.right, ctx), expr.line)
    case 'unary': {
      const value = evaluate(expr.expr, ctx)
      if (isUnknown(value)) return UNKNOWN
      if (expr.op === '!') return !value
      return -Number(value)
    }
    case 'for': {
      const coll = evaluate(expr.coll, ctx)
      if (isUnknown(coll)) return UNKNOWN
      const entries: [Value, Value][] = Array.isArray(coll)
        ? coll.map((item, index) => [isSet(coll) ? item : index, item])
        : isObject(coll)
          ? Object.keys(coll)
              .sort()
              .map((key) => [key, coll[key]])
          : evalError(
              ctx,
              expr.line,
              'Iteration over non-iterable value',
              'A value of type ' +
                typeName(coll) +
                ' cannot be used as the collection in a "for" expression.',
            )
      const listOut: Value[] = []
      const objOut: { [key: string]: Value } = {}
      for (const [key, value] of entries) {
        const locals = new Map(ctx.locals ?? [])
        locals.set(expr.valVar, value)
        if (expr.keyVar) locals.set(expr.keyVar, key)
        const inner: EvalContext = { ...ctx, locals }
        if (expr.cond) {
          const keep = evaluate(expr.cond, inner)
          if (isUnknown(keep)) return UNKNOWN
          if (!keep) continue
        }
        if (expr.kind === 'list') listOut.push(evaluate(expr.valExpr, inner))
        else {
          const name = evaluate(expr.keyExpr as Expr, inner)
          if (isUnknown(name)) return UNKNOWN
          const text = toStringValue(inner, name, expr.line)
          if (text in objOut)
            evalError(
              ctx,
              expr.line,
              'Duplicate object key',
              `Two different items produced the key ${JSON.stringify(text)} in this "for" expression. If duplicates are expected, use the ellipsis (...) after the value expression to enable grouping by key.`,
            )
          objOut[text] = evaluate(expr.valExpr, inner)
        }
      }
      return expr.kind === 'list' ? listOut : objOut
    }
  }
}
