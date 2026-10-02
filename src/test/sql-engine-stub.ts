import initSqlJs from 'sql.js/dist/sql-wasm.js'
import { SqlCore, type ExecResult, type TableInfo } from '../lib/sql/core'
import { sqlDatasets } from '../content/sql/datasets'
import { generateKqlDatasets } from '../content/kql/generate'
import { kqlHas } from '../lib/kql/translate'

/*
 * The real engines run in Web Workers, which jsdom does not have. Page tests
 * swap in these: the same SqlCore, on the Node build of sql.js.
 */
const sqlite = initSqlJs()

const stub = (core: Promise<SqlCore>) => ({
  exec: async (sql: string, mode: 'playground' | 'challenge' = 'playground', setup?: string) =>
    (await core).handle({ type: 'exec', sql, mode, setup }) as ExecResult,
  reset: async () => {
    ;(await core).handle({ type: 'reset' })
  },
  schema: async () => (await core).handle({ type: 'schema' }) as TableInfo[],
})

export const sqlEngine = stub(
  sqlite.then(
    (SQL) =>
      new SqlCore(
        SQL,
        sqlDatasets.map((dataset) => dataset.sql),
      ),
  ),
)
export const kqlEngine = stub(
  sqlite.then((SQL) => new SqlCore(SQL, [generateKqlDatasets()], { kql_has: kqlHas as never })),
)
