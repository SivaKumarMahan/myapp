import { describe, expect, it } from 'vitest'
import { sameValue } from './client'
import { pyRepr } from './repr'

describe('comparing Python results', () => {
  it('compares JSON deeply, ignoring key order', () => {
    expect(sameValue({ a: [1, 2], b: { c: 'x' } }, { b: { c: 'x' }, a: [1, 2] })).toBe(true)
    expect(sameValue({ a: [1, 2] }, { a: [2, 1] })).toBe(false)
    expect(sameValue({ a: 1 }, { a: 1, b: 2 })).toBe(false)
    expect(sameValue(null, {})).toBe(false)
  })

  it('tolerates floating-point noise only', () => {
    expect(sameValue(0.1 + 0.2, 0.3)).toBe(true)
    expect(sameValue(208.8, 208.81)).toBe(false)
  })

  it('shows values the way Python prints them', () => {
    expect(pyRepr({ ok: true, none: null, items: ['a', 1.5, false] })).toBe(
      "{'ok': True, 'none': None, 'items': ['a', 1.5, False]}",
    )
  })
})
