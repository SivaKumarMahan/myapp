import type { Database, SqlJsStatic } from 'sql.js'
import type { SqlValue } from '../../content/sql'
import type { ResultSet } from './compare'

export interface ExecResult {
  /** One per statement that returned rows; the last is the one that matters. */
  results: ResultSet[]
  /** Rows changed by the last INSERT / UPDATE / DELETE. */
  changes: number
  ms: number
  error?: string
}

export interface TableInfo {
  name: string
  columns: { name: string; type: string }[]
  rows: number
}

export type SqlRequest =
  | { type: 'exec'; sql: string; mode: 'playground' | 'challenge'; setup?: string }
  | { type: 'reset' }
  | { type: 'schema' }

export type SqlResponse = ExecResult | TableInfo[] | { ok: true }

/**
 * The engine itself: a playground database you can change freely, and a
 * snapshot of the pristine datasets that every challenge check starts from,
 * so nothing you did in the playground can affect a challenge.
 */
/** Extra SQL functions, implemented in JavaScript (KQL's `has`, for one). */
export type SqlFunctions = Record<string, (...args: never[]) => string | number | null>

export class SqlCore {
  private readonly SQL: SqlJsStatic
  private readonly snapshot: Uint8Array
  private readonly functions: SqlFunctions
  private playground: Database

  constructor(SQL: SqlJsStatic, datasets: string[], functions: SqlFunctions = {}) {
    this.SQL = SQL
    this.functions = functions
    const base = new SQL.Database()
    for (const sql of datasets) base.exec(sql)
    this.snapshot = base.export()
    base.close()
    this.playground = this.open()
  }

  /** A fresh copy of the pristine data. Functions do not survive export, so they are added each time. */
  private open(): Database {
    const db = new this.SQL.Database(this.snapshot)
    for (const [name, fn] of Object.entries(this.functions)) db.create_function(name, fn)
    return db
  }

  handle(request: SqlRequest): SqlResponse {
    if (request.type === 'reset') {
      this.playground.close()
      this.playground = this.open()
      return { ok: true }
    }
    if (request.type === 'schema') return this.schema()
    if (request.mode === 'playground') return run(this.playground, request.sql)
    const db = this.open()
    try {
      if (request.setup) db.exec(request.setup)
      return run(db, request.sql)
    } finally {
      db.close()
    }
  }

  private schema(): TableInfo[] {
    const tables = this.playground.exec(
      "SELECT name FROM sqlite_schema WHERE type = 'table' AND name NOT LIKE 'sqlite_%' ORDER BY name",
    )
    return (tables[0]?.values ?? []).map(([name]) => {
      const table = String(name)
      const quoted = `"${table.replace(/"/g, '""')}"`
      const columns = this.playground.exec(`PRAGMA table_info(${quoted})`)[0]?.values ?? []
      const count = this.playground.exec(`SELECT COUNT(*) FROM ${quoted}`)[0]?.values[0]?.[0]
      return {
        name: table,
        columns: columns.map((column) => ({ name: String(column[1]), type: String(column[2]) })),
        rows: Number(count ?? 0),
      }
    })
  }
}

function run(db: Database, sql: string): ExecResult {
  const started = performance.now()
  try {
    const results = db.exec(sql).map((result) => ({
      columns: result.columns,
      // Blobs are shown as a size, not bytes.
      rows: result.values.map((row) =>
        row.map((value): SqlValue =>
          value instanceof Uint8Array ? `<blob ${value.length} bytes>` : value,
        ),
      ),
    }))
    return { results, changes: db.getRowsModified(), ms: performance.now() - started }
  } catch (error) {
    return {
      results: [],
      changes: 0,
      ms: performance.now() - started,
      error: error instanceof Error ? error.message : String(error),
    }
  }
}
