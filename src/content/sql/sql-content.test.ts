// @vitest-environment node
import { describe, expect, it } from 'vitest'
import initSqlJs from 'sql.js'
import { sqlChallenges } from './index'
import { sqlDatasets } from './datasets'
import { SqlCore, type ExecResult } from '../../lib/sql/core'
import { compareResults } from '../../lib/sql/compare'

const core = initSqlJs().then(
  (SQL) =>
    new SqlCore(
      SQL,
      sqlDatasets.map((dataset) => dataset.sql),
    ),
)
const exec = async (sql: string, setup = '') =>
  (await core).handle({ type: 'exec', sql, mode: 'challenge', setup }) as ExecResult

describe('SQL challenge content', () => {
  it('has at least 25 challenges with unique ids, hints and expected results', () => {
    expect(sqlChallenges.length).toBeGreaterThanOrEqual(25)
    expect(new Set(sqlChallenges.map((challenge) => challenge.id)).size).toBe(sqlChallenges.length)
    for (const challenge of sqlChallenges) {
      expect(challenge.hints.length, challenge.id).toBeGreaterThan(0)
      expect(challenge.expected.columns.length, challenge.id).toBeGreaterThan(0)
    }
  })

  it('covers joins, aggregation, window functions, CTEs and recursion', () => {
    const solutions = sqlChallenges.map((challenge) => challenge.solution).join('\n')
    for (const feature of [
      'LEFT JOIN',
      'HAVING',
      'ROW_NUMBER()',
      'RANK()',
      'LAG(',
      'WITH RECURSIVE',
    ]) {
      expect(solutions).toContain(feature)
    }
  })

  // If this fails, a dataset or solution changed: run `npm run sql:expected`.
  it.each(sqlChallenges.map((challenge) => [challenge.id, challenge] as const))(
    '%s: the reference solution produces the stored expected result',
    async (_id, challenge) => {
      const result = await exec(challenge.solution, challenge.setup)
      expect(result.error).toBeUndefined()
      expect(
        compareResults(result.results.at(-1) ?? null, challenge.expected, challenge.ordered),
      ).toEqual({ ok: true })
    },
  )

  it('checks a challenge on pristine data, whatever the playground did', async () => {
    const engine = await core
    engine.handle({ type: 'exec', sql: 'DELETE FROM employees', mode: 'playground' })
    const result = await exec('SELECT COUNT(*) FROM employees')
    expect(result.results[0].rows).toEqual([[20]])
    engine.handle({ type: 'reset' })
  })
})
