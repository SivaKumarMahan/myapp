// @vitest-environment node
import { describe, expect, it } from 'vitest'
import initSqlJs from 'sql.js'
import { SqlCore, type ExecResult } from '../sql/core'
import { generateKqlDatasets } from '../../content/kql/generate'
import { kqlChallenges } from '../../content/kql'
import { kqlTables } from '../../content/kql/schema'
import { KqlError, kqlHas, translateKql } from './translate'

const core = initSqlJs().then(
  (SQL) => new SqlCore(SQL, [generateKqlDatasets()], { kql_has: kqlHas as never }),
)

/** Runs KQL end to end and returns the result rows and columns. */
const kql = async (query: string) => {
  const translation = translateKql(query)
  const result = (await core).handle({
    type: 'exec',
    sql: translation.sql,
    mode: 'challenge',
  }) as ExecResult
  if (result.error) throw new Error(`${result.error}\n${translation.sql}`)
  const last = result.results.at(-1)
  return { columns: last?.columns ?? [], rows: last?.rows ?? [], translation }
}

const errorOf = (query: string) => {
  try {
    translateKql(query)
  } catch (error) {
    expect(error).toBeInstanceOf(KqlError)
    return (error as KqlError).message
  }
  throw new Error('expected a KqlError')
}

describe('the sample data', () => {
  it('has about 2,000 rows across the six tables', async () => {
    const tables = (await core).handle({ type: 'schema' }) as { name: string; rows: number }[]
    expect(tables.map((table) => table.name).sort()).toEqual(kqlTables.map((t) => t.name).sort())
    const total = tables.reduce((sum, table) => sum + table.rows, 0)
    expect(total).toBeGreaterThan(1800)
    expect(total).toBeLessThan(2600)
  })

  it('is the same every time it is generated', () => {
    expect(generateKqlDatasets()).toBe(generateKqlDatasets())
  })
})

describe('translating KQL', () => {
  it('filters, projects and counts', async () => {
    const { rows } = await kql('requests | where success == false | count')
    expect(rows[0][0]).toBeGreaterThan(0)
    const projected = await kql(
      'requests | where resultCode == "500" | project name, Code = resultCode | take 3',
    )
    expect(projected.columns).toEqual(['name', 'Code'])
    expect(projected.rows.every((row) => row[1] === '500')).toBe(true)
  })

  it('names summarize columns the way KQL does', async () => {
    const { columns } = await kql(
      'Perf | summarize count(), avg(CounterValue), dcount(Computer), Peak = max(CounterValue) by bin(TimeGenerated, 1h)',
    )
    expect(columns).toEqual([
      'TimeGenerated',
      'count_',
      'avg_CounterValue',
      'dcount_Computer',
      'Peak',
    ])
  })

  it('bins datetimes to the start of each period', async () => {
    const { rows } = await kql('requests | summarize count() by bin(timestamp, 1h)')
    expect(rows.every((row) => /^\d{4}-\d{2}-\d{2} \d{2}:00:00$/.test(String(row[0])))).toBe(true)
    expect(rows.length).toBeLessThanOrEqual(25)
  })

  it('measures ago() from the simulator clock', async () => {
    const { rows } = await kql('print Now = now(), Earlier = ago(90m), Later = now() + 1d')
    expect(rows[0]).toEqual(['2025-10-01 12:00:00', '2025-10-01 10:30:00', '2025-10-02 12:00:00'])
    const recent = await kql('Heartbeat | where TimeGenerated > ago(15m) | distinct Computer')
    expect(recent.rows.map((row) => row[0])).not.toContain('vm-batch-01')
  })

  it('sorts descending by default, as KQL does, and keeps the order through later stages', async () => {
    const { rows } = await kql('requests | order by duration | project name, duration | take 5')
    const durations = rows.map((row) => row[1] as number)
    expect(durations).toEqual([...durations].sort((a, b) => b - a))
    const ascending = await kql('requests | sort by duration asc | take 3 | project duration')
    expect(ascending.rows[0][0]).toBeLessThanOrEqual(ascending.rows[1][0] as number)
    const top = await kql('requests | top 3 by duration | project duration')
    expect(top.rows).toHaveLength(3)
    expect(top.rows[0][0]).toBe(durations[0])
  })

  it('handles string operators, in, between and has', async () => {
    const contains = await kql(
      'AzureActivity | where OperationNameValue contains "virtualmachines" | count',
    )
    expect(contains.rows[0][0]).toBeGreaterThan(0)
    const notIn = await kql('requests | where resultCode !in ("200", "304") | distinct resultCode')
    expect(notIn.rows.map((row) => row[0]).sort()).toEqual(
      ['404', '500', '502', '503'].filter((code) => notIn.rows.some((row) => row[0] === code)),
    )
    const between = await kql(
      'requests | where duration between (1000 .. 1500) | summarize min(duration), max(duration)',
    )
    expect(between.rows[0][0]).toBeGreaterThanOrEqual(1000)
    expect(between.rows[0][1]).toBeLessThanOrEqual(1500)
    const starts = await kql('requests | where name startswith "post" | distinct name')
    expect(starts.rows.every((row) => String(row[0]).startsWith('POST'))).toBe(true)
  })

  it('matches has on whole terms only', () => {
    expect(kqlHas('Payment gateway did not respond', 'gateway')).toBe(1)
    expect(kqlHas('Payment gateway did not respond', 'gate')).toBe(0)
    expect(kqlHas('GET /api/search', 'API')).toBe(1)
  })

  it('extends, replaces and drops columns', async () => {
    const { columns, rows } = await kql(
      'requests | take 1 | extend Seconds = duration / 1000, name = toupper(name) | project-away url, operation_Id',
    )
    expect(columns).toContain('Seconds')
    expect(columns).not.toContain('url')
    expect(String(rows[0][columns.indexOf('name')])).toMatch(/^[A-Z /{}]+$/)
  })

  it('joins, suffixing clashing right-hand columns with 1', async () => {
    const inner = await kql(
      'requests | where success == false | join kind=inner (exceptions) on operation_Id',
    )
    expect(inner.columns).toContain('timestamp1')
    expect(inner.columns).toContain('operation_Id1')
    expect(inner.columns).toContain('cloud_RoleName1')
    const outer = await kql(
      'requests | where success == false | join kind=leftouter (exceptions | project operation_Id, type) on operation_Id',
    )
    expect(outer.rows.length).toBeGreaterThan(inner.rows.length)
    // A join without kind= gets a note about innerunique.
    expect(translateKql('requests | join (exceptions) on operation_Id').notes[0]).toMatch(
      /innerunique/,
    )
  })

  it('records the chart to draw', () => {
    expect(
      translateKql('requests | summarize count() by bin(timestamp, 1h) | render timechart').chart,
    ).toBe('timechart')
    expect(translateKql('requests | count').chart).toBeNull()
  })

  it('explains mistakes the way KQL would', () => {
    expect(errorOf('requests | where Name == "x"')).toMatch(
      /Unknown column 'Name'\. Did you mean 'name'\?/,
    )
    expect(errorOf('Requests | take 1')).toMatch(/Did you mean 'requests'\?/)
    expect(errorOf('nope | take 1')).toMatch(/The tables are/)
    expect(errorOf('requests | where count() > 1')).toMatch(/only be used in summarize/)
    expect(errorOf('requests | extend duration * 2')).toMatch(/Give the new column a name/)
    expect(errorOf('requests | mv-expand x')).toMatch(/does not support/)
    expect(errorOf('requests | where name == "x')).toMatch(/never closed/)
    expect(errorOf('requests | summarize percentile(duration, 95)')).toMatch(/does not support/)
  })
})

describe('KQL challenges', () => {
  it('has 20 challenges with unique ids and hints', () => {
    expect(kqlChallenges).toHaveLength(20)
    expect(new Set(kqlChallenges.map((c) => c.id)).size).toBe(20)
    expect(kqlChallenges.every((c) => c.hints.length > 0)).toBe(true)
  })

  it.each(kqlChallenges.map((challenge) => [challenge.id, challenge] as const))(
    '%s: the reference solution runs and returns rows',
    async (_id, challenge) => {
      const { rows } = await kql(challenge.solution)
      expect(rows.length).toBeGreaterThan(0)
    },
  )

  it('has the answers the scenarios are built around', async () => {
    const silent = await kql(kqlChallenges.find((c) => c.id === 'no-heartbeat-15m')!.solution)
    expect(silent.rows.map((row) => row[0]).sort()).toEqual(['vm-api-02', 'vm-batch-01'])
    const spray = await kql(kqlChallenges.find((c) => c.id === 'password-spray')!.solution)
    expect(spray.rows).toEqual([['203.0.113.66', 42, 8]])
    const hot = await kql(kqlChallenges.find((c) => c.id === 'hot-vms')!.solution)
    expect(hot.rows.map((row) => row[0])).toEqual(['vm-sql-01'])
  })
})
