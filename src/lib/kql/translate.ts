import { KQL_NOW, kqlTables, type KqlType } from '../../content/kql/schema'

/**
 * A translator from a practical subset of KQL to SQLite SQL.
 *
 * There is no KQL engine that runs in a browser, so the simulator turns each
 * query into SQL and runs that on SQLite. Every pipe stage becomes one CTE:
 *
 *   requests | where success == false | summarize count() by name
 *
 *   WITH s0 AS (SELECT * FROM "requests"),
 *        s1 AS (SELECT * FROM s0 WHERE ("success" = 0)),
 *        s2 AS (SELECT "name" AS "name", COUNT(*) AS "count_" FROM s1 GROUP BY "name")
 *   SELECT "name", "count_" FROM s2
 *
 * Column names and types are tracked stage by stage, so mistakes get the same
 * kind of error KQL would give ("Unknown column 'Computr'").
 */

export class KqlError extends Error {
  /** Character offset in the query, when known. */
  readonly position: number | undefined
  constructor(message: string, position?: number) {
    super(message)
    this.name = 'KqlError'
    this.position = position
  }
}

export type ChartType = 'timechart' | 'barchart' | 'columnchart' | 'piechart' | 'linechart'

export interface Translation {
  sql: string
  /** Output columns in order, with the KQL type each is known to have. */
  columns: { name: string; type: ColumnType }[]
  chart: ChartType | null
  /** Places where the simulator differs from real KQL. */
  notes: string[]
}

type ColumnType = KqlType | 'timespan' | 'unknown'

/* ---------------------------------------------------------------- tokens */

type TokenKind = 'ident' | 'string' | 'number' | 'timespan' | 'datetime' | 'op' | 'eof'
interface Token {
  kind: TokenKind
  value: string
  /** Seconds, for a timespan; the number, for a number. */
  num?: number
  pos: number
}

const SPAN_UNITS: Record<string, number> = {
  d: 86_400,
  h: 3_600,
  hr: 3_600,
  m: 60,
  min: 60,
  s: 1,
  sec: 1,
  ms: 0.001,
}

const HYPHENATED = new Set([
  'project-away',
  'project-rename',
  'project-reorder',
  'project-keep',
  'mv-expand',
  'mv-apply',
  'make-series',
  'top-nested',
  'top-hitters',
  'parse-where',
])

const OPERATORS = [
  '==',
  '!=',
  '<>',
  '<=',
  '>=',
  '=~',
  '!~',
  '..',
  '|',
  '(',
  ')',
  ',',
  '.',
  '=',
  '<',
  '>',
  '+',
  '-',
  '*',
  '/',
  '%',
  '!',
  '[',
  ']',
  ';',
]

function tokenize(input: string): Token[] {
  const tokens: Token[] = []
  let i = 0
  while (i < input.length) {
    const ch = input[i]
    if (/\s/.test(ch)) {
      i += 1
      continue
    }
    if (input.startsWith('//', i)) {
      while (i < input.length && input[i] !== '\n') i += 1
      continue
    }
    const start = i
    // Strings: "..." or '...', with backslash escapes; @"..." is verbatim.
    if (
      ch === '"' ||
      ch === "'" ||
      (ch === '@' && (input[i + 1] === '"' || input[i + 1] === "'"))
    ) {
      const verbatim = ch === '@'
      if (verbatim) i += 1
      const quote = input[i]
      i += 1
      let value = ''
      while (i < input.length && input[i] !== quote) {
        if (!verbatim && input[i] === '\\' && i + 1 < input.length) {
          const next = input[i + 1]
          value += next === 'n' ? '\n' : next === 't' ? '\t' : next
          i += 2
        } else {
          value += input[i]
          i += 1
        }
      }
      if (i >= input.length) throw new KqlError('This string is never closed.', start)
      i += 1
      tokens.push({ kind: 'string', value, pos: start })
      continue
    }
    if (/[0-9]/.test(ch)) {
      let j = i
      while (j < input.length && /[0-9]/.test(input[j])) j += 1
      if (input[j] === '.' && /[0-9]/.test(input[j + 1] ?? '')) {
        j += 1
        while (j < input.length && /[0-9]/.test(input[j])) j += 1
      }
      const number = Number(input.slice(i, j))
      const unit = /^(ms|min|sec|hr|d|h|m|s)(?![A-Za-z0-9_])/.exec(input.slice(j))
      if (unit) {
        tokens.push({
          kind: 'timespan',
          value: input.slice(i, j + unit[1].length),
          num: number * SPAN_UNITS[unit[1]],
          pos: start,
        })
        i = j + unit[1].length
      } else {
        tokens.push({ kind: 'number', value: input.slice(i, j), num: number, pos: start })
        i = j
      }
      continue
    }
    if (/[A-Za-z_$]/.test(ch)) {
      let j = i
      while (j < input.length && /[A-Za-z0-9_$]/.test(input[j])) j += 1
      let word = input.slice(i, j)
      // Hyphenated operators (project-away, mv-expand) are one word in KQL.
      const hyphenated = /^-([A-Za-z]+)/.exec(input.slice(j))
      if (hyphenated && HYPHENATED.has(`${word}-${hyphenated[1]}`)) {
        word = `${word}-${hyphenated[1]}`
        j += hyphenated[0].length
      }
      // datetime(2025-10-01 10:00) holds a literal that is not KQL syntax itself.
      if (word === 'datetime' && /^\s*\(/.test(input.slice(j))) {
        const open = input.indexOf('(', j)
        const close = input.indexOf(')', open)
        if (close < 0) throw new KqlError('datetime( is never closed.', start)
        tokens.push({ kind: 'datetime', value: input.slice(open + 1, close).trim(), pos: start })
        i = close + 1
        continue
      }
      tokens.push({ kind: 'ident', value: word, pos: start })
      i = j
      continue
    }
    const op = OPERATORS.find((candidate) => input.startsWith(candidate, i))
    if (!op) throw new KqlError(`Unexpected character '${ch}'.`, start)
    tokens.push({ kind: 'op', value: op, pos: start })
    i += op.length
  }
  tokens.push({ kind: 'eof', value: '', pos: input.length })
  return tokens
}

/* ----------------------------------------------------------- expressions */

interface Expr {
  sql: string
  type: ColumnType
  /** Set when the expression is a bare column reference. */
  column?: string
  /** Set for a literal timespan, in seconds. */
  seconds?: number
  aggregate?: boolean
}

type Columns = { name: string; type: ColumnType }[]

/** One pipe stage: the CTE it lives in, and what it outputs. */
interface Stage {
  from: string
  columns: Columns
  ordered: boolean
}

const q = (name: string) => `"${name.replace(/"/g, '""')}"`
const str = (value: string) => `'${value.replace(/'/g, "''")}'`
const NOW_SQL = str(KQL_NOW)
const ORDER_COLUMN = '__rn'

/** Accepts `2025-10-01`, `2025-10-01 10:30`, `2025-10-01T10:30:00Z` and so on. */
function datetimeLiteral(text: string, pos: number): string {
  const match = /^(\d{4}-\d{2}-\d{2})(?:[ T](\d{1,2}):(\d{2})(?::(\d{2}))?(?:\.\d+)?)?Z?$/.exec(
    text,
  )
  if (!match)
    throw new KqlError(
      `'${text}' is not a date the simulator understands. Try datetime(2025-10-01 09:30).`,
      pos,
    )
  const [, day, hour = '0', minute = '00', second = '00'] = match
  return `${day} ${hour.padStart(2, '0')}:${minute}:${second}`
}

const AGGREGATES = new Set([
  'count',
  'countif',
  'dcount',
  'sum',
  'avg',
  'min',
  'max',
  'make_set',
  'make_list',
  'sumif',
  'avgif',
])

class Parser {
  private index = 0
  private stageCount = 0
  readonly ctes: string[] = []
  readonly notes = new Set<string>()
  chart: ChartType | null = null

  private readonly tokens: Token[]

  constructor(tokens: Token[]) {
    this.tokens = tokens
  }

  /* token helpers */
  private get token() {
    return this.tokens[this.index]
  }
  private next() {
    return this.tokens[this.index++]
  }
  private isOp(value: string) {
    return this.token.kind === 'op' && this.token.value === value
  }
  private isWord(...values: string[]) {
    return this.token.kind === 'ident' && values.includes(this.token.value)
  }
  private eatOp(value: string) {
    if (!this.isOp(value)) return false
    this.index += 1
    return true
  }
  private eatWord(value: string) {
    if (!this.isWord(value)) return false
    this.index += 1
    return true
  }
  private expectOp(value: string, what = `'${value}'`) {
    if (!this.eatOp(value)) throw new KqlError(`Expected ${what} here.`, this.token.pos)
  }
  private ident(what = 'a name'): Token {
    if (this.token.kind !== 'ident') throw new KqlError(`Expected ${what} here.`, this.token.pos)
    return this.next()
  }
  private int(what: string): number {
    const token = this.next()
    if (token.kind !== 'number' || !Number.isInteger(token.num))
      throw new KqlError(`Expected ${what}.`, token.pos)
    return token.num as number
  }

  private stage(sql: string): string {
    const name = `s${this.stageCount++}`
    this.ctes.push(`${name} AS (${sql})`)
    return name
  }

  /* --------------------------------------------------------- pipelines */

  parseQuery(): Stage {
    const result = this.pipeline()
    this.eatOp(';')
    if (this.token.kind !== 'eof')
      throw new KqlError(
        `Unexpected '${this.token.value}'. Each operator follows a '|'.`,
        this.token.pos,
      )
    return result
  }

  private pipeline(): Stage {
    let current = this.source()
    while (this.eatOp('|')) current = this.operator(current)
    return current
  }

  private source(): Stage {
    const token = this.token
    if (this.isWord('print')) {
      this.next()
      const items = this.namedList(null, 'print')
      return {
        from: this.stage(
          `SELECT ${items.map((item) => `${item.expr.sql} AS ${q(item.name)}`).join(', ')}`,
        ),
        columns: items.map((item) => ({ name: item.name, type: item.expr.type })),
        ordered: false,
      }
    }
    const name = this.ident('a table name, such as requests or Heartbeat').value
    const table = kqlTables.find((candidate) => candidate.name === name)
    if (!table) {
      const near = kqlTables.find(
        (candidate) => candidate.name.toLowerCase() === name.toLowerCase(),
      )
      throw new KqlError(
        near
          ? `Unknown table '${name}'. Did you mean '${near.name}'? Table names are case-sensitive.`
          : `Unknown table '${name}'. The tables are: ${kqlTables.map((t) => t.name).join(', ')}.`,
        token.pos,
      )
    }
    return {
      from: this.stage(`SELECT * FROM ${q(table.name)}`),
      columns: [...table.columns],
      ordered: false,
    }
  }

  private operator(input: Stage): Stage {
    const token = this.ident('an operator after |, such as where, project or summarize')
    const { from, columns, ordered } = input
    const keep = (cols: Columns) =>
      ordered ? [...cols, { name: ORDER_COLUMN, type: 'int' as const }] : cols
    const select = (cols: Columns) =>
      keep(cols)
        .map((column) => q(column.name))
        .join(', ')
    // The input without its row-order column, for operators that re-sort.
    const unordered = ordered
      ? `(SELECT ${columns.map((column) => q(column.name)).join(', ')} FROM ${from})`
      : from

    switch (token.value) {
      case 'where':
      case 'filter': {
        const condition = this.expression(columns)
        return {
          from: this.stage(`SELECT * FROM ${from} WHERE ${condition.sql}`),
          columns,
          ordered,
        }
      }
      case 'project': {
        const items = this.namedList(columns, 'project')
        const out = items.map((item) => ({ name: item.name, type: item.expr.type }))
        const list = items.map((item) => `${item.expr.sql} AS ${q(item.name)}`)
        if (ordered) list.push(q(ORDER_COLUMN))
        return { from: this.stage(`SELECT ${list.join(', ')} FROM ${from}`), columns: out, ordered }
      }
      case 'project-away': {
        const drop = this.columnList(columns)
        const out = columns.filter((column) => !drop.includes(column.name))
        return { from: this.stage(`SELECT ${select(out)} FROM ${from}`), columns: out, ordered }
      }
      case 'project-rename': {
        const renames = new Map<string, string>()
        do {
          const newName = this.ident('a new column name').value
          this.expectOp('=')
          const old = this.columnRef(columns)
          renames.set(old, newName)
        } while (this.eatOp(','))
        const out = columns.map((column) => ({
          ...column,
          name: renames.get(column.name) ?? column.name,
        }))
        const list = columns.map(
          (column) => `${q(column.name)} AS ${q(renames.get(column.name) ?? column.name)}`,
        )
        if (ordered) list.push(q(ORDER_COLUMN))
        return { from: this.stage(`SELECT ${list.join(', ')} FROM ${from}`), columns: out, ordered }
      }
      case 'extend': {
        const items = this.namedList(columns, 'extend')
        const out: Columns = [...columns]
        const exprs = new Map<string, string>()
        for (const item of items) {
          const existing = out.findIndex((column) => column.name === item.name)
          if (existing >= 0) out[existing] = { name: item.name, type: item.expr.type }
          else out.push({ name: item.name, type: item.expr.type })
          exprs.set(item.name, item.expr.sql)
        }
        const list = out.map(
          (column) => `${exprs.get(column.name) ?? q(column.name)} AS ${q(column.name)}`,
        )
        if (ordered) list.push(q(ORDER_COLUMN))
        return { from: this.stage(`SELECT ${list.join(', ')} FROM ${from}`), columns: out, ordered }
      }
      case 'summarize':
        return this.summarize(from, columns)
      case 'order':
      case 'sort': {
        if (!this.eatWord('by'))
          throw new KqlError(`Expected 'by' after ${token.value}.`, this.token.pos)
        const order = this.orderList(columns)
        return {
          from: this.stage(
            `SELECT *, ROW_NUMBER() OVER (ORDER BY ${order}) AS ${q(ORDER_COLUMN)} FROM ${unordered}`,
          ),
          columns,
          ordered: true,
        }
      }
      case 'top': {
        const count = this.int('how many rows, such as top 5 by duration')
        if (!this.eatWord('by')) throw new KqlError("Expected 'by' after top N.", this.token.pos)
        const order = this.orderList(columns)
        return {
          from: this.stage(
            `SELECT * FROM (SELECT *, ROW_NUMBER() OVER (ORDER BY ${order}) AS ${q(ORDER_COLUMN)} FROM ${unordered}) WHERE ${q(ORDER_COLUMN)} <= ${count}`,
          ),
          columns,
          ordered: true,
        }
      }
      case 'take':
      case 'limit': {
        const count = this.int(`how many rows, such as ${token.value} 10`)
        return {
          from: this.stage(
            `SELECT * FROM ${from}${ordered ? ` ORDER BY ${q(ORDER_COLUMN)}` : ''} LIMIT ${count}`,
          ),
          columns,
          ordered,
        }
      }
      case 'distinct': {
        let out: Columns
        if (this.eatOp('*')) out = columns
        else {
          const names = this.columnList(columns)
          out = names.map(
            (name) => columns.find((column) => column.name === name) as Columns[number],
          )
        }
        return {
          from: this.stage(
            `SELECT DISTINCT ${out.map((column) => q(column.name)).join(', ')} FROM ${from}`,
          ),
          columns: out,
          ordered: false,
        }
      }
      case 'count':
        return {
          from: this.stage(`SELECT COUNT(*) AS "Count" FROM ${from}`),
          columns: [{ name: 'Count', type: 'int' }],
          ordered: false,
        }
      case 'join':
        return this.join(from, columns)
      case 'render': {
        const kind = this.ident('a chart type: timechart, barchart, columnchart or piechart').value
        if (!['timechart', 'barchart', 'columnchart', 'piechart', 'linechart'].includes(kind)) {
          throw new KqlError(
            `The simulator draws timechart, linechart, barchart, columnchart and piechart, not ${kind}.`,
            token.pos,
          )
        }
        this.chart = kind as ChartType
        // `with (title = "...")` and similar options are accepted and ignored.
        if (this.eatWord('with')) this.skipParens()
        return input
      }
      case 'union':
      case 'mv-expand':
      case 'mv-apply':
      case 'project-reorder':
      case 'project-keep':
      case 'top-nested':
      case 'top-hitters':
      case 'parse-where':
      case 'parse':
      case 'make-series':
      case 'lookup':
      case 'search':
        throw new KqlError(
          `'${token.value}' is real KQL, but this simulator does not support it.`,
          token.pos,
        )
      default:
        throw new KqlError(`Unknown operator '${token.value}'.`, token.pos)
    }
  }

  private skipParens() {
    this.expectOp('(')
    let depth = 1
    while (depth > 0) {
      if (this.token.kind === 'eof') throw new KqlError("Missing ')'.", this.token.pos)
      if (this.isOp('(')) depth += 1
      if (this.isOp(')')) depth -= 1
      this.next()
    }
  }

  private summarize(from: string, columns: Columns): Stage {
    const aggs: { name: string; expr: Expr }[] = []
    if (!this.isWord('by')) {
      do {
        const pos = this.token.pos
        const named = this.maybeName()
        const expr = this.expression(columns, true)
        if (!expr.aggregate)
          throw new KqlError(
            'summarize needs an aggregation such as count(), avg(x) or dcount(x).',
            pos,
          )
        aggs.push({ name: named ?? this.defaultName, expr })
      } while (this.eatOp(','))
    }
    const keys: { name: string; expr: Expr }[] = []
    if (this.eatWord('by')) {
      do {
        const pos = this.token.pos
        const named = this.maybeName()
        const expr = this.expression(columns)
        const name = named ?? expr.column ?? this.lastColumn
        if (!name) throw new KqlError('Name this grouping: Name = expression.', pos)
        keys.push({ name, expr })
      } while (this.eatOp(','))
    }
    if (aggs.length === 0 && keys.length === 0)
      throw new KqlError('summarize needs an aggregation or a by clause.', this.token.pos)
    const items = [...keys, ...aggs]
    const select = items.map((item) => `${item.expr.sql} AS ${q(item.name)}`).join(', ')
    const group = keys.length > 0 ? ` GROUP BY ${keys.map((key) => key.expr.sql).join(', ')}` : ''
    return {
      from: this.stage(`SELECT ${select} FROM ${from}${group}`),
      columns: items.map((item) => ({ name: item.name, type: item.expr.type })),
      ordered: false,
    }
  }

  private join(from: string, columns: Columns): Stage {
    let kind = 'inner'
    const at = this.token.pos
    if (this.eatWord('kind')) {
      this.expectOp('=')
      kind = this.ident('a join kind: inner or leftouter').value
      if (!['inner', 'leftouter', 'innerunique'].includes(kind)) {
        throw new KqlError(
          `The simulator supports join kind=inner and kind=leftouter, not ${kind}.`,
          at,
        )
      }
    }
    if (kind !== 'leftouter') {
      this.notes.add(
        'join is an inner join here. Real KQL defaults to kind=innerunique, which first removes duplicate keys on the left - write kind=inner to get the same result in both.',
      )
    }
    this.expectOp('(', "'(' and the right-hand query")
    const right = this.pipeline()
    this.expectOp(')')
    if (!this.eatWord('on'))
      throw new KqlError("Expected 'on' and the key column(s).", this.token.pos)
    const rightColumns = right.columns
    const conditions: string[] = []
    do {
      if (this.isWord('$left')) {
        this.next()
        this.expectOp('.')
        const leftName = this.columnRef(columns)
        this.expectOp('==')
        if (!this.eatWord('$right')) throw new KqlError('Expected $right.column.', this.token.pos)
        this.expectOp('.')
        const rightName = this.columnRef(rightColumns)
        conditions.push(`l.${q(leftName)} = r.${q(rightName)}`)
      } else {
        const name = this.columnRef(columns)
        if (!rightColumns.some((column) => column.name === name)) {
          throw new KqlError(
            `The right-hand side has no column '${name}' to join on.`,
            this.token.pos,
          )
        }
        conditions.push(`l.${q(name)} = r.${q(name)}`)
      }
    } while (this.eatOp(','))

    // Right-hand columns that clash with left ones get a "1" suffix, as in KQL.
    const taken = new Set(columns.map((column) => column.name))
    const rightOut = rightColumns.map((column) => {
      let name = column.name
      while (taken.has(name)) name = `${name}1`
      taken.add(name)
      return { original: column.name, name, type: column.type }
    })
    const list = [
      ...columns.map((column) => `l.${q(column.name)} AS ${q(column.name)}`),
      ...rightOut.map((column) => `r.${q(column.original)} AS ${q(column.name)}`),
    ]
    const joinType = kind === 'leftouter' ? 'LEFT JOIN' : 'JOIN'
    return {
      from: this.stage(
        `SELECT ${list.join(', ')} FROM ${from} l ${joinType} ${right.from} r ON ${conditions.join(' AND ')}`,
      ),
      columns: [...columns, ...rightOut.map(({ name, type }) => ({ name, type }))],
      ordered: false,
    }
  }

  /** `a = expr, b, c = expr` for project / extend / print. */
  private namedList(columns: Columns | null, operator: string): { name: string; expr: Expr }[] {
    const items: { name: string; expr: Expr }[] = []
    let unnamed = 0
    do {
      const pos = this.token.pos
      const named = this.maybeName()
      const expr = this.expression(columns ?? [])
      let name = named ?? expr.column
      if (!name) {
        if (operator === 'extend')
          throw new KqlError('Give the new column a name: extend Name = expression.', pos)
        name = `print_${unnamed++}`
        if (operator === 'project') name = `Column${unnamed}`
      }
      items.push({ name, expr })
    } while (this.eatOp(','))
    return items
  }

  /** Consumes `Name =` if it is there. */
  private maybeName(): string | null {
    const token = this.token
    const after = this.tokens[this.index + 1]
    if (token.kind === 'ident' && after?.kind === 'op' && after.value === '=') {
      this.index += 2
      return token.value
    }
    return null
  }

  private columnList(columns: Columns): string[] {
    const names: string[] = []
    do names.push(this.columnRef(columns))
    while (this.eatOp(','))
    return names
  }

  private columnRef(columns: Columns): string {
    const token = this.ident('a column name')
    this.checkColumn(token, columns)
    return token.value
  }

  private checkColumn(token: Token, columns: Columns) {
    if (columns.some((column) => column.name === token.value)) return
    const near = columns.find((column) => column.name.toLowerCase() === token.value.toLowerCase())
    throw new KqlError(
      near
        ? `Unknown column '${token.value}'. Did you mean '${near.name}'? KQL column names are case-sensitive.`
        : `Unknown column '${token.value}'. Columns here: ${columns.map((column) => column.name).join(', ')}.`,
      token.pos,
    )
  }

  private orderList(columns: Columns): string {
    const parts: string[] = []
    do {
      const expr = this.expression(columns)
      // KQL sorts descending unless told otherwise.
      let direction = 'DESC'
      if (this.eatWord('asc')) direction = 'ASC'
      else this.eatWord('desc')
      let nulls = ''
      if (this.eatWord('nulls')) {
        if (this.eatWord('first')) nulls = ' NULLS FIRST'
        else if (this.eatWord('last')) nulls = ' NULLS LAST'
        else throw new KqlError("Expected 'first' or 'last' after nulls.", this.token.pos)
      }
      parts.push(`${expr.sql} ${direction}${nulls}`)
    } while (this.eatOp(','))
    return parts.join(', ')
  }

  /* ------------------------------------------------------- expressions */

  /** Set by aggregate calls, for summarize's default column names. */
  private defaultName = ''
  /** The column a by-expression is built on (bin(TimeGenerated, 1h) -> TimeGenerated). */
  private lastColumn = ''

  private expression(columns: Columns, allowAggregates = false): Expr {
    this.lastColumn = ''
    return this.or(columns, allowAggregates)
  }

  private or(columns: Columns, agg: boolean): Expr {
    let left = this.and(columns, agg)
    while (this.eatWord('or')) {
      const right = this.and(columns, agg)
      left = {
        sql: `(${left.sql} OR ${right.sql})`,
        type: 'bool',
        aggregate: left.aggregate || right.aggregate,
      }
    }
    return left
  }

  private and(columns: Columns, agg: boolean): Expr {
    let left = this.comparison(columns, agg)
    while (this.eatWord('and')) {
      const right = this.comparison(columns, agg)
      left = {
        sql: `(${left.sql} AND ${right.sql})`,
        type: 'bool',
        aggregate: left.aggregate || right.aggregate,
      }
    }
    return left
  }

  private comparison(columns: Columns, agg: boolean): Expr {
    const left = this.additive(columns, agg)
    const pos = this.token.pos
    const bool = (sql: string): Expr => ({ sql, type: 'bool', aggregate: left.aggregate })

    for (const op of ['==', '!=', '<>', '<=', '>=', '<', '>']) {
      if (this.eatOp(op)) {
        const right = this.additive(columns, agg)
        const sqlOp = op === '==' ? '=' : op === '!=' ? '<>' : op
        return {
          sql: `(${left.sql} ${sqlOp} ${right.sql})`,
          type: 'bool',
          aggregate: left.aggregate || right.aggregate,
        }
      }
    }
    if (this.eatOp('=~'))
      return bool(`(lower(${left.sql}) = lower(${this.additive(columns, agg).sql}))`)
    if (this.eatOp('!~'))
      return bool(`(lower(${left.sql}) <> lower(${this.additive(columns, agg).sql}))`)

    const negated = this.isOp('!') && this.tokens[this.index + 1]?.kind === 'ident'
    if (negated) this.next()
    const word = this.token.kind === 'ident' ? this.token.value : ''
    const not = (sql: string) => (negated ? `(NOT ${sql})` : sql)
    const textOps: Record<string, (a: string, b: string) => string> = {
      contains: (a, b) => `(instr(lower(${a}), lower(${b})) > 0)`,
      contains_cs: (a, b) => `(instr(${a}, ${b}) > 0)`,
      has: (a, b) => `(kql_has(${a}, ${b}) = 1)`,
      startswith: (a, b) => `(lower(substr(${a}, 1, length(${b}))) = lower(${b}))`,
      endswith: (a, b) => `(lower(substr(${a}, -length(${b}))) = lower(${b}))`,
    }
    if (textOps[word]) {
      this.next()
      const right = this.additive(columns, agg)
      return bool(not(textOps[word](left.sql, right.sql)))
    }
    if (word === 'in' || word === 'in~') {
      this.next()
      this.expectOp('(')
      const values: string[] = []
      do values.push(this.additive(columns, agg).sql)
      while (this.eatOp(','))
      this.expectOp(')')
      return bool(`(${left.sql} ${negated ? 'NOT IN' : 'IN'} (${values.join(', ')}))`)
    }
    if (word === 'between') {
      this.next()
      this.expectOp('(')
      const low = this.additive(columns, agg)
      this.expectOp('..', "'..' between the two ends")
      const high = this.additive(columns, agg)
      this.expectOp(')')
      return bool(`(${left.sql} ${negated ? 'NOT BETWEEN' : 'BETWEEN'} ${low.sql} AND ${high.sql})`)
    }
    if (negated)
      throw new KqlError(
        `Expected contains, has, in, between, startswith or endswith after '!'.`,
        pos,
      )
    return left
  }

  private additive(columns: Columns, agg: boolean): Expr {
    let left = this.multiplicative(columns, agg)
    for (;;) {
      const op = this.isOp('+') ? '+' : this.isOp('-') ? '-' : null
      if (!op) return left
      this.next()
      const right = this.multiplicative(columns, agg)
      const aggregate = left.aggregate || right.aggregate
      if (left.type === 'datetime' && right.seconds !== undefined) {
        left = {
          sql: `datetime(${left.sql}, '${op}${right.seconds} seconds')`,
          type: 'datetime',
          aggregate,
        }
      } else if (left.type === 'datetime' && right.type === 'datetime' && op === '-') {
        // A difference of datetimes is a timespan, kept in seconds.
        left = {
          sql: `((julianday(${left.sql}) - julianday(${right.sql})) * 86400)`,
          type: 'timespan',
          aggregate,
        }
      } else {
        left = {
          sql: `(${left.sql} ${op} ${right.sql})`,
          type: left.type === 'timespan' ? 'timespan' : 'real',
          aggregate,
        }
      }
    }
  }

  private multiplicative(columns: Columns, agg: boolean): Expr {
    let left = this.unary(columns, agg)
    for (;;) {
      const op = ['*', '/', '%'].find((candidate) => this.isOp(candidate))
      if (!op) return left
      this.next()
      const right = this.unary(columns, agg)
      // KQL divides integers as integers too, so SQLite's behaviour matches.
      left = {
        sql: `(${left.sql} ${op} ${right.sql})`,
        type: 'real',
        aggregate: left.aggregate || right.aggregate,
      }
    }
  }

  private unary(columns: Columns, agg: boolean): Expr {
    if (this.eatOp('-')) {
      const inner = this.unary(columns, agg)
      if (inner.seconds !== undefined)
        return { ...inner, sql: String(-inner.seconds), seconds: -inner.seconds }
      return { ...inner, sql: `(-${inner.sql})` }
    }
    return this.primary(columns, agg)
  }

  private primary(columns: Columns, agg: boolean): Expr {
    const token = this.next()
    switch (token.kind) {
      case 'string':
        return { sql: str(token.value), type: 'string' }
      case 'number':
        return { sql: token.value, type: Number.isInteger(token.num) ? 'int' : 'real' }
      case 'timespan':
        return { sql: String(token.num), type: 'timespan', seconds: token.num }
      case 'datetime':
        return { sql: str(datetimeLiteral(token.value, token.pos)), type: 'datetime' }
      case 'op':
        if (token.value === '(') {
          const inner = this.or(columns, agg)
          this.expectOp(')')
          return { ...inner, sql: `(${inner.sql})` }
        }
        throw new KqlError(`Unexpected '${token.value}'.`, token.pos)
      case 'eof':
        throw new KqlError('The query ends too early.', token.pos)
      case 'ident':
        break
    }
    const word = token.value
    if (word === 'true' || word === 'false')
      return { sql: word === 'true' ? '1' : '0', type: 'bool' }
    if (word === 'null') return { sql: 'NULL', type: 'unknown' }
    if (this.isOp('(')) return this.call(token, columns, agg)
    this.checkColumn(token, columns)
    this.lastColumn ||= word
    const type = columns.find((column) => column.name === word)?.type ?? 'unknown'
    return { sql: q(word), type, column: word }
  }

  private args(columns: Columns, agg: boolean): Expr[] {
    this.expectOp('(')
    const args: Expr[] = []
    if (!this.isOp(')')) {
      do
        args.push(
          this.isOp('*')
            ? (this.next(), { sql: '*', type: 'unknown' as const })
            : this.or(columns, agg),
        )
      while (this.eatOp(','))
    }
    this.expectOp(')')
    return args
  }

  private call(token: Token, columns: Columns, allowAggregates: boolean): Expr {
    const expr = this.callInner(token, columns, allowAggregates)
    // round(avg(x), 1) is an aggregate expression even though round() is not.
    return expr.aggregate || !this.lastArgsAggregate ? expr : { ...expr, aggregate: true }
  }

  private lastArgsAggregate = false

  private callInner(token: Token, columns: Columns, allowAggregates: boolean): Expr {
    const name = token.value
    const isAggregate = AGGREGATES.has(name)
    if (isAggregate && !allowAggregates) {
      throw new KqlError(
        `${name}() is an aggregation, so it can only be used in summarize.`,
        token.pos,
      )
    }
    // Aggregates cannot nest, so their arguments are plain expressions; other
    // functions may wrap an aggregate when the caller allows one.
    const args = this.args(columns, isAggregate ? false : allowAggregates)
    this.lastArgsAggregate = args.some((arg) => arg.aggregate)
    const arity = (min: number, max = min) => {
      if (args.length < min || args.length > max) {
        throw new KqlError(
          `${name}() takes ${min === max ? min : `${min}-${max}`} argument${max === 1 ? '' : 's'}.`,
          token.pos,
        )
      }
    }
    const [a, b, c] = args
    const suffix = a?.column ? `_${a.column}` : '_'
    const aggregate = (sql: string, type: ColumnType, defaultName: string): Expr => {
      this.defaultName = defaultName
      return { sql, type, aggregate: true }
    }

    switch (name) {
      /* aggregations */
      case 'count':
        arity(0, 1)
        return aggregate(a ? `COUNT(${a.sql})` : 'COUNT(*)', 'int', 'count_')
      case 'countif':
        arity(1)
        return aggregate(`SUM(CASE WHEN ${a.sql} THEN 1 ELSE 0 END)`, 'int', 'countif_')
      case 'dcount':
        arity(1, 2)
        this.notes.add(
          'dcount() is exact here. Real KQL estimates it, so large counts can differ slightly.',
        )
        return aggregate(`COUNT(DISTINCT ${a.sql})`, 'int', `dcount${suffix}`)
      case 'sum':
      case 'avg':
      case 'min':
      case 'max':
        arity(1)
        return aggregate(
          `${name.toUpperCase()}(${a.sql})`,
          name === 'avg' ? 'real' : a.type,
          `${name}${suffix}`,
        )
      case 'sumif':
      case 'avgif':
        arity(2)
        return aggregate(
          `${name === 'sumif' ? 'SUM' : 'AVG'}(CASE WHEN ${b.sql} THEN ${a.sql} END)`,
          'real',
          `${name}${suffix}`,
        )
      case 'make_set':
        arity(1)
        return aggregate(`json_group_array(DISTINCT ${a.sql})`, 'string', `make_set${suffix}`)
      case 'make_list':
        arity(1)
        return aggregate(`json_group_array(${a.sql})`, 'string', `make_list${suffix}`)
      case 'arg_max':
      case 'arg_min':
      case 'percentile':
      case 'percentiles':
      case 'stdev':
        throw new KqlError(
          `${name}() is real KQL, but this simulator does not support it.`,
          token.pos,
        )

      /* time */
      case 'ago':
        arity(1)
        if (a.seconds === undefined)
          throw new KqlError('ago() takes a timespan, such as ago(1h) or ago(15m).', token.pos)
        return { sql: `datetime(${NOW_SQL}, '-${a.seconds} seconds')`, type: 'datetime' }
      case 'now':
        arity(0, 1)
        return {
          sql:
            a?.seconds !== undefined
              ? `datetime(${NOW_SQL}, '${a.seconds >= 0 ? '+' : ''}${a.seconds} seconds')`
              : NOW_SQL,
          type: 'datetime',
        }
      case 'bin':
      case 'floor': {
        arity(2)
        if (a.column) this.lastColumn = a.column
        const size = b.seconds ?? Number(b.sql)
        if (!Number.isFinite(size) || size <= 0)
          throw new KqlError(
            `${name}() needs a positive bin size, such as bin(TimeGenerated, 1h).`,
            token.pos,
          )
        if (a.type === 'datetime') {
          return {
            sql: `datetime((CAST(strftime('%s', ${a.sql}) AS INTEGER) / ${size}) * ${size}, 'unixepoch')`,
            type: 'datetime',
          }
        }
        return { sql: `(CAST((${a.sql}) / ${size} AS INTEGER) * ${size})`, type: a.type }
      }
      case 'startofday':
        arity(1)
        return { sql: `datetime(${a.sql}, 'start of day')`, type: 'datetime' }
      case 'startofhour':
        arity(1)
        return { sql: `strftime('%Y-%m-%d %H:00:00', ${a.sql})`, type: 'datetime' }
      case 'hourofday':
        arity(1)
        return { sql: `CAST(strftime('%H', ${a.sql}) AS INTEGER)`, type: 'int' }
      case 'todatetime':
        arity(1)
        return { sql: a.sql, type: 'datetime' }
      case 'format_datetime':
        throw new KqlError(
          'format_datetime() is not supported by the simulator. Datetimes print as yyyy-MM-dd HH:mm:ss.',
          token.pos,
        )

      /* conversion and strings */
      case 'tostring':
        arity(1)
        return { sql: `CAST(${a.sql} AS TEXT)`, type: 'string' }
      case 'toint':
      case 'tolong':
        arity(1)
        return { sql: `CAST(${a.sql} AS INTEGER)`, type: 'int' }
      case 'toreal':
      case 'todouble':
        arity(1)
        return { sql: `CAST(${a.sql} AS REAL)`, type: 'real' }
      case 'tolower':
        arity(1)
        return { sql: `lower(${a.sql})`, type: 'string' }
      case 'toupper':
        arity(1)
        return { sql: `upper(${a.sql})`, type: 'string' }
      case 'strlen':
        arity(1)
        return { sql: `length(${a.sql})`, type: 'int' }
      case 'strcat':
        if (args.length === 0) arity(1, 64)
        return {
          sql: `(${args.map((arg) => `COALESCE(${arg.sql}, '')`).join(' || ')})`,
          type: 'string',
        }
      case 'substring':
        arity(2, 3)
        return { sql: `substr(${a.sql}, (${b.sql}) + 1${c ? `, ${c.sql}` : ''})`, type: 'string' }
      case 'iff':
      case 'iif':
        arity(3)
        return { sql: `(CASE WHEN ${a.sql} THEN ${b.sql} ELSE ${c.sql} END)`, type: b.type }
      case 'isempty':
        arity(1)
        return { sql: `(${a.sql} IS NULL OR ${a.sql} = '')`, type: 'bool' }
      case 'isnotempty':
        arity(1)
        return { sql: `(${a.sql} IS NOT NULL AND ${a.sql} <> '')`, type: 'bool' }
      case 'isnull':
        arity(1)
        return { sql: `(${a.sql} IS NULL)`, type: 'bool' }
      case 'isnotnull':
        arity(1)
        return { sql: `(${a.sql} IS NOT NULL)`, type: 'bool' }
      case 'not':
        arity(1)
        return { sql: `(NOT ${a.sql})`, type: 'bool' }
      case 'coalesce':
        if (args.length < 2) arity(2, 64)
        return { sql: `COALESCE(${args.map((arg) => arg.sql).join(', ')})`, type: a.type }
      case 'round':
        arity(1, 2)
        return { sql: `ROUND(${a.sql}, ${b ? b.sql : '0'})`, type: 'real' }
      case 'abs':
        arity(1)
        return { sql: `ABS(${a.sql})`, type: a.type }
      default:
        throw new KqlError(`Unknown function '${name}()'.`, token.pos)
    }
  }
}

/** Translates one KQL query. Throws `KqlError` with a position on mistakes. */
export function translateKql(query: string): Translation {
  if (!query.trim())
    throw new KqlError('Write a query, starting with a table name such as requests.', 0)
  const parser = new Parser(tokenize(query))
  const result = parser.parseQuery()
  const list = result.columns.map((column) => q(column.name)).join(', ')
  const sql = `WITH ${parser.ctes.join(',\n     ')}\nSELECT ${list} FROM ${result.from}${
    result.ordered ? ` ORDER BY ${q(ORDER_COLUMN)}` : ''
  }`
  return { sql, columns: result.columns, chart: parser.chart, notes: [...parser.notes] }
}

/** `kql_has`: whole-term, case-insensitive match, as KQL's `has` operator. */
export function kqlHas(text: unknown, term: unknown): number {
  if (text === null || term === null || text === undefined || term === undefined) return 0
  const needle = String(term).toLowerCase()
  if (!needle) return 1
  const haystack = String(text).toLowerCase()
  let from = 0
  for (;;) {
    const at = haystack.indexOf(needle, from)
    if (at < 0) return 0
    const before = haystack[at - 1]
    const after = haystack[at + needle.length]
    const isWord = (ch: string | undefined) => ch !== undefined && /[a-z0-9_]/.test(ch)
    if (!isWord(before) && !isWord(after)) return 1
    from = at + 1
  }
}
