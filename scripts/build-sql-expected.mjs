/**
 * Fills in each SQL challenge's `expected` result by running its reference
 * `solution` against the sample datasets with the same engine the app uses.
 *
 *   npm run sql:expected
 *
 * Run it after editing a challenge or a dataset. The test suite fails if a
 * solution and its stored expected result ever disagree.
 */
import { readFileSync, writeFileSync } from 'node:fs'
import initSqlJs from 'sql.js'

const root = new URL('../src/content/sql/', import.meta.url)
const DATASETS = ['hr', 'shop', 'logs']
const file = new URL('challenges.json', root)

const SQL = await initSqlJs()
const base = new SQL.Database()
for (const name of DATASETS) base.exec(readFileSync(new URL(`datasets/${name}.sql`, root), 'utf8'))
const snapshot = base.export()

const data = JSON.parse(readFileSync(file, 'utf8'))
for (const challenge of data.challenges) {
  const db = new SQL.Database(snapshot)
  if (challenge.setup) db.exec(challenge.setup)
  const results = db.exec(challenge.solution)
  const last = results[results.length - 1]
  if (!last) throw new Error(`${challenge.id}: the solution returned no rows`)
  challenge.expected = { columns: last.columns, rows: last.values }
  db.close()
  console.log(`${challenge.id.padEnd(28)} ${last.values.length} rows`)
}
writeFileSync(file, `${JSON.stringify(data, null, 2)}\n`)
