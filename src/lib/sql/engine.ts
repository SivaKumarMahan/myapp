import type { ExecResult, SqlCore, SqlRequest, SqlResponse, TableInfo } from './core'

/** Longer than any sensible query on these datasets. */
export const QUERY_TIMEOUT_MS = 8_000

/** Which data an engine works on. */
export type EngineDatabase = 'sql' | 'kql'

type Pending = { resolve: (value: SqlResponse) => void; reject: (error: Error) => void }

/** Builds a core in the page, for when Web Workers are unavailable. */
async function buildInPage(db: EngineDatabase): Promise<SqlCore> {
  const [sqljs, wasm, { SqlCore: Core }] = await Promise.all([
    import('sql.js'),
    import('sql.js/dist/sql-wasm-browser.wasm?url'),
    import('./core'),
  ])
  const SQL = await sqljs.default({ locateFile: () => wasm.default })
  if (db === 'kql') {
    const [{ generateKqlDatasets }, { kqlHas }] = await Promise.all([
      import('../../content/kql/generate'),
      import('../kql/translate'),
    ])
    return new Core(SQL, [generateKqlDatasets()], { kql_has: kqlHas as never })
  }
  const { sqlDatasets } = await import('../../content/sql/datasets')
  return new Core(
    SQL,
    sqlDatasets.map((dataset) => dataset.sql),
  )
}

/**
 * The page's handle on one SQLite database.
 *
 * Normally a Web Worker. Where workers are unavailable (very old browsers)
 * the same core runs in the page instead, without the timeout.
 */
class SqlEngine {
  private readonly db: EngineDatabase
  private worker: Worker | null = null
  private pending = new Map<number, Pending>()
  private nextId = 1
  private inPage: Promise<SqlCore> | null = null

  constructor(db: EngineDatabase) {
    this.db = db
  }

  private start(): Worker {
    if (this.worker) return this.worker
    const worker = new Worker(new URL('./worker.ts', import.meta.url), { type: 'module' })
    worker.onmessage = ({
      data,
    }: MessageEvent<{ id: number; response?: SqlResponse; error?: string }>) => {
      const entry = this.pending.get(data.id)
      if (!entry) return
      this.pending.delete(data.id)
      if (data.error !== undefined) entry.reject(new Error(data.error))
      else entry.resolve(data.response as SqlResponse)
    }
    this.worker = worker
    return worker
  }

  /** Kills the worker. The playground database is rebuilt on next use. */
  private restart(reason: string) {
    this.worker?.terminate()
    this.worker = null
    for (const entry of this.pending.values()) entry.reject(new Error(reason))
    this.pending.clear()
  }

  private call(request: SqlRequest): Promise<SqlResponse> {
    if (typeof Worker === 'undefined') {
      this.inPage ??= buildInPage(this.db)
      return this.inPage.then((core) => core.handle(request))
    }
    const worker = this.start()
    const id = this.nextId++
    return new Promise((resolve, reject) => {
      const timer = setTimeout(
        () =>
          this.restart(
            `The query ran for more than ${QUERY_TIMEOUT_MS / 1000} seconds and was stopped. A recursive CTE without a stopping condition is the usual cause. The playground database was reset.`,
          ),
        QUERY_TIMEOUT_MS,
      )
      this.pending.set(id, {
        resolve: (value) => {
          clearTimeout(timer)
          resolve(value)
        },
        reject: (error) => {
          clearTimeout(timer)
          reject(error)
        },
      })
      worker.postMessage({ id, db: this.db, request })
    })
  }

  async exec(
    sql: string,
    mode: 'playground' | 'challenge' = 'playground',
    setup?: string,
  ): Promise<ExecResult> {
    try {
      return (await this.call({ type: 'exec', sql, mode, setup })) as ExecResult
    } catch (error) {
      return {
        results: [],
        changes: 0,
        ms: 0,
        error: error instanceof Error ? error.message : String(error),
      }
    }
  }

  async reset(): Promise<void> {
    await this.call({ type: 'reset' })
  }

  async schema(): Promise<TableInfo[]> {
    return (await this.call({ type: 'schema' })) as TableInfo[]
  }
}

/** One engine per database for the whole app, so state survives navigation. */
export const sqlEngine = new SqlEngine('sql')

/** The KQL simulator's tables, in their own database (and worker). */
export const kqlEngine = new SqlEngine('kql')
