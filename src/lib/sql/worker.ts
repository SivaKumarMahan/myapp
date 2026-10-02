import initSqlJs from 'sql.js'
import wasmUrl from 'sql.js/dist/sql-wasm-browser.wasm?url'
import { SqlCore, type SqlRequest } from './core'
import type { EngineDatabase } from './engine'

/**
 * Runs SQL off the main thread. A runaway query (a recursive CTE with no
 * stopping condition) then freezes only this worker, which the page can
 * terminate - not the whole app.
 *
 * Each engine (the SQL playground, the KQL simulator) has its own worker and
 * says which database it wants; that database's data is built on first use.
 */
const sqlite = initSqlJs({ locateFile: () => wasmUrl })
let core: Promise<SqlCore> | null = null

const build = async (db: EngineDatabase): Promise<SqlCore> => {
  const SQL = await sqlite
  if (db === 'kql') {
    const [{ generateKqlDatasets }, { kqlHas }] = await Promise.all([
      import('../../content/kql/generate'),
      import('../kql/translate'),
    ])
    return new SqlCore(SQL, [generateKqlDatasets()], { kql_has: kqlHas as never })
  }
  const { sqlDatasets } = await import('../../content/sql/datasets')
  return new SqlCore(
    SQL,
    sqlDatasets.map((dataset) => dataset.sql),
  )
}

self.onmessage = async ({
  data,
}: MessageEvent<{ id: number; db: EngineDatabase; request: SqlRequest }>) => {
  try {
    core ??= build(data.db)
    self.postMessage({ id: data.id, response: (await core).handle(data.request) })
  } catch (error) {
    self.postMessage({ id: data.id, error: error instanceof Error ? error.message : String(error) })
  }
}
