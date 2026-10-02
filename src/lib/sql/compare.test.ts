import { describe, expect, it } from 'vitest'
import { compareResults } from './compare'

const expected = {
  columns: ['name', 'total'],
  rows: [
    ['a', 1],
    ['b', 2.5],
  ],
}

describe('comparing query results', () => {
  it('ignores row order unless the question asks for it', () => {
    const reversed = {
      columns: ['name', 'total'],
      rows: [
        ['b', 2.5],
        ['a', 1],
      ],
    }
    expect(compareResults(reversed, expected, false)).toEqual({ ok: true })
    const ordered = compareResults(reversed, expected, true)
    expect(ordered.ok).toBe(false)
    if (!ordered.ok) expect(ordered.reason).toMatch(/wrong order/i)
  })

  it('does not care about column aliases, and lines up columns by name', () => {
    expect(compareResults({ columns: ['x', 'y'], rows: expected.rows }, expected, true).ok).toBe(
      true,
    )
    const swapped = {
      columns: ['total', 'name'],
      rows: [
        [1, 'a'],
        [2.5, 'b'],
      ],
    }
    expect(compareResults(swapped, expected, true).ok).toBe(true)
  })

  it('treats 1, 1.0 and the text "01" as the same value', () => {
    const loose = {
      columns: ['name', 'total'],
      rows: [
        ['a', '01'],
        ['b', 2.5000000001],
      ],
    }
    expect(compareResults(loose, expected, true).ok).toBe(true)
  })

  it('explains what is wrong', () => {
    const tooFew = compareResults({ columns: ['n', 't'], rows: [['a', 1]] }, expected, false)
    expect(tooFew).toEqual({ ok: false, reason: 'Expected 2 rows; yours returned 1.' })
    const columns = compareResults({ columns: ['n'], rows: [['a'], ['b']] }, expected, false)
    expect(!columns.ok && columns.reason).toMatch(/Expected 2 columns \(name, total\)/)
    const wrong = compareResults(
      {
        columns: ['n', 't'],
        rows: [
          ['a', 1],
          ['b', 3],
        ],
      },
      expected,
      false,
    )
    expect(!wrong.ok && wrong.reason).toMatch(/\(b, 2\.5\)/)
    expect(compareResults(null, expected, false).ok).toBe(false)
  })
})
