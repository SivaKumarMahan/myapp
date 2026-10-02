import type { SqlValue } from '../../content/sql'

export interface ResultSet {
  columns: string[]
  rows: SqlValue[][]
}

export type CheckOutcome = { ok: true } | { ok: false; reason: string }

/**
 * Values compare loosely where the difference is formatting, not meaning:
 * 669 and 669.0 are equal, and so are the text '07' and the number 7 (SQLite's
 * strftime returns text). Floating-point noise below six decimals is ignored.
 */
function normalize(value: SqlValue): SqlValue {
  if (typeof value === 'string' && /^-?\d+(\.\d+)?$/.test(value.trim())) value = Number(value)
  if (typeof value === 'number') return Math.round(value * 1e6) / 1e6
  return value
}

const rowKey = (row: SqlValue[]) => JSON.stringify(row.map(normalize))
const show = (row: SqlValue[]) =>
  `(${row.map((value) => (value === null ? 'NULL' : String(value))).join(', ')})`

/**
 * Puts the learner's columns in the expected order when the names match, so
 * `SELECT b, a` is not wrong just because the question listed `a, b`.
 * Otherwise columns are compared by position - aliases are not required.
 */
function alignColumns(actual: ResultSet, expected: ResultSet): ResultSet {
  const names = actual.columns.map((name) => name.toLowerCase())
  const indexes = expected.columns.map((name) => names.indexOf(name.toLowerCase()))
  if (indexes.some((index) => index < 0)) return actual
  return {
    columns: expected.columns,
    rows: actual.rows.map((row) => indexes.map((index) => row[index])),
  }
}

/** Is `actual` the answer? Row order only counts when `ordered`. */
export function compareResults(
  actual: ResultSet | null,
  expected: ResultSet,
  ordered: boolean,
): CheckOutcome {
  if (!actual)
    return { ok: false, reason: 'Your query did not return a result set. End with a SELECT.' }
  if (actual.columns.length !== expected.columns.length) {
    return {
      ok: false,
      reason: `Expected ${expected.columns.length} ${expected.columns.length === 1 ? 'column' : 'columns'} (${expected.columns.join(', ')}); yours has ${actual.columns.length}.`,
    }
  }
  if (actual.rows.length !== expected.rows.length) {
    return {
      ok: false,
      reason: `Expected ${expected.rows.length} ${expected.rows.length === 1 ? 'row' : 'rows'}; yours returned ${actual.rows.length}.`,
    }
  }
  const aligned = alignColumns(actual, expected)
  if (ordered) {
    for (let index = 0; index < expected.rows.length; index += 1) {
      if (rowKey(aligned.rows[index]) !== rowKey(expected.rows[index])) {
        const sameSet = compareResults(aligned, expected, false).ok
        return {
          ok: false,
          reason: sameSet
            ? 'The right rows, in the wrong order. This question asks for a specific ORDER BY.'
            : `Row ${index + 1} differs: expected ${show(expected.rows[index])}, got ${show(aligned.rows[index])}.`,
        }
      }
    }
    return { ok: true }
  }
  const remaining = new Map<string, number>()
  for (const row of aligned.rows) remaining.set(rowKey(row), (remaining.get(rowKey(row)) ?? 0) + 1)
  for (const row of expected.rows) {
    const key = rowKey(row)
    const count = remaining.get(key) ?? 0
    if (count === 0)
      return { ok: false, reason: `A row is missing or different, for example ${show(row)}.` }
    remaining.set(key, count - 1)
  }
  return { ok: true }
}
