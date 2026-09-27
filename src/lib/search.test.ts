import { describe, expect, it } from 'vitest'
import { buildSearchIndex, searchCourse } from './search'
import { az104Course } from '../content/courses'

const index = buildSearchIndex(az104Course)

describe('buildSearchIndex', () => {
  it('indexes topics, key objects, commands and questions', () => {
    const kinds = new Set(index.map((document) => document.kind))
    expect(kinds).toEqual(new Set(['topic', 'concept', 'command', 'question']))
  })

  it('creates one topic document per lesson', () => {
    const topics = index.filter((document) => document.kind === 'topic')
    expect(topics).toHaveLength(az104Course.topics.length)
  })

  it('gives every document a route', () => {
    expect(index.every((document) => document.route.startsWith('/az104'))).toBe(true)
  })
})

describe('searchCourse', () => {
  it('finds a lesson by an exact title word', () => {
    const results = searchCourse(index, 'peering')
    expect(results.length).toBeGreaterThan(0)
    expect(results.some((result) => result.route.includes('/topics/az1-vnets-peering'))).toBe(true)
  })

  it('ranks a title match above a body-only match', () => {
    const results = searchCourse(index, 'bastion')
    expect(results[0].title.toLowerCase()).toContain('bastion')
  })

  it('finds content in lesson body text, not just titles', () => {
    const results = searchCourse(index, 'rehydration')
    expect(results.length).toBeGreaterThan(0)
  })

  it('finds an Azure resource property name', () => {
    const results = searchCourse(index, 'allowblobpublicaccess')
    expect(results.length).toBeGreaterThan(0)
  })

  it('requires every token to match (AND semantics)', () => {
    const both = searchCourse(index, 'role assignment')
    expect(both.length).toBeGreaterThan(0)
    expect(searchCourse(index, 'role zzzznotaword')).toHaveLength(0)
  })

  it('returns nothing for a term that does not appear', () => {
    expect(searchCourse(index, 'xyzzyplughquux')).toHaveLength(0)
  })

  it('filters by domain', () => {
    const results = searchCourse(index, 'storage', { domainId: 'az1-storage' })
    expect(results.length).toBeGreaterThan(0)
    expect(results.every((result) => result.domainId === 'az1-storage')).toBe(true)
  })

  it('filters by difficulty', () => {
    const results = searchCourse(index, 'azure', { difficulty: 'beginner' })
    expect(results.length).toBeGreaterThan(0)
    expect(results.every((result) => result.difficulty === 'beginner')).toBe(true)
  })

  it('filters by result kind', () => {
    const results = searchCourse(index, 'az', { kind: 'command' })
    expect(results.length).toBeGreaterThan(0)
    expect(results.every((result) => result.kind === 'command')).toBe(true)
  })

  it('combines filters', () => {
    const results = searchCourse(index, 'vm', {
      domainId: 'az1-compute',
      kind: 'topic',
    })
    expect(results.every((r) => r.domainId === 'az1-compute' && r.kind === 'topic')).toBe(true)
  })

  it('lists topics when there is no query but a filter is set', () => {
    const results = searchCourse(index, '', { domainId: 'az1-networking' })
    expect(results.length).toBeGreaterThan(0)
    expect(results.every((result) => result.domainId === 'az1-networking')).toBe(true)
  })

  it('respects the result limit', () => {
    expect(searchCourse(index, 'az', {}, 5)).toHaveLength(5)
  })

  it('is case insensitive', () => {
    const lower = searchCourse(index, 'blob').map((r) => r.id)
    const upper = searchCourse(index, 'BLOB').map((r) => r.id)
    expect(lower).toEqual(upper)
  })
})
