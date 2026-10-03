import { describe, expect, it } from 'vitest'
import { resolveLink, roleById, roles, skillAreas, skillById, skills } from '.'
import {
  coreGaps,
  roleCoverage,
  roleItems,
  roleMatch,
  rolesNeeding,
  topGaps,
} from '../../lib/roles'
import { createEmptyState, mergeStates, migrate } from '../../lib/storage'

describe('roles data', () => {
  it('has the ten roles with every field filled in', () => {
    expect(roles).toHaveLength(10)
    for (const role of roles) {
      expect(role.focus.length, role.id).toBeGreaterThanOrEqual(3)
      expect(role.focus.length, role.id).toBeLessThanOrEqual(5)
      expect(role.dayInLife.length, role.id).toBeGreaterThanOrEqual(4)
      expect(role.toolsAtAGlance.length, role.id).toBeGreaterThanOrEqual(10)
      expect(role.interviewFocus.length, role.id).toBeGreaterThanOrEqual(5)
      expect(role.learningPath.length, role.id).toBeGreaterThanOrEqual(6)
      expect(role.certifications.length, role.id).toBeGreaterThan(0)
      expect(
        role.skillAreas.some((area) => area.importance === 'core'),
        role.id,
      ).toBe(true)
    }
  })

  it('only references skills, areas and roles that exist', () => {
    const areaIds = new Set(skillAreas.map((area) => area.id))
    for (const role of roles) {
      for (const id of role.overlapsWith) expect(roleById.has(id), `${role.id} -> ${id}`).toBe(true)
      for (const area of role.skillAreas) {
        expect(areaIds.has(area.area), `${role.id}: ${area.area}`).toBe(true)
        for (const item of area.items)
          expect(skillById.has(item.skill), `${role.id}: ${item.skill}`).toBe(true)
      }
    }
  })

  it('every app link points at real content, and gaps have none', () => {
    const refs = [
      ...skills.flatMap((skill) => skill.appLinks),
      ...roles.flatMap((role) => [
        ...role.learningPath.flatMap((step) => step.appLinks),
        ...role.certifications.flatMap((cert) => (cert.appLink ? [cert.appLink] : [])),
      ]),
    ]
    for (const ref of refs) expect(resolveLink(ref), ref).not.toBeNull()
    for (const skill of skills)
      expect(Boolean(skill.gap), skill.id).toBe(skill.appLinks.length === 0)
  })

  it('carries no salary or market-share figures', () => {
    const text = JSON.stringify(roles)
    expect(text).not.toMatch(
      /salary|\$\s?\d|£\s?\d|€\s?\d|market share|\d+% of (jobs|companies|postings)/i,
    )
  })
})

describe('roles maths', () => {
  const devops = roleById.get('devops-engineer')!

  it('coverage follows progress in linked content, and ticks count fully', () => {
    const state = createEmptyState()
    expect(roleCoverage(devops, state)).toBe(0)
    const ticked = {
      ...state,
      skills: Object.fromEntries(roleItems(devops).map((item) => [item.skill.id, 1])),
    }
    expect(roleCoverage(devops, ticked)).toBe(100)
    const lesson = { ...state, topics: { 'az4-yaml-pipelines': { status: 'completed' as const } } }
    expect(roleCoverage(devops, lesson as typeof state)).toBeGreaterThan(0)
  })

  it('match and gaps come from ticks only, most important first', () => {
    const state = { ...createEmptyState(), skills: { terraform: 1 } }
    expect(roleMatch(devops, state)).toBeGreaterThan(0)
    const gaps = topGaps(devops, state)
    expect(gaps).toHaveLength(5)
    expect(gaps.every((item) => item.importance === 'core')).toBe(true)
    expect(gaps.some((item) => item.skill.id === 'terraform')).toBe(false)
  })

  it('looks a tool up across roles', () => {
    const needing = rolesNeeding('prometheus')
    expect(needing[0].item.importance).toBe('core')
    expect(needing.map((entry) => entry.role.id)).toContain('sre')
  })

  it('lists core skills with no content', () => {
    const gaps = coreGaps()
    expect(gaps.find((entry) => entry.role.id === 'mlops-engineer')?.skills.length).toBeGreaterThan(
      0,
    )
  })
})

describe('My fit in the progress record', () => {
  it('migrates, keeps and merges ticks', () => {
    expect(migrate({ topics: {} }).skills).toEqual({})
    expect(migrate({ topics: {}, skills: { helm: 5, bad: 'x' } }).skills).toEqual({ helm: 5 })
    const merged = mergeStates(
      { ...createEmptyState(), skills: { helm: 1 } },
      { ...createEmptyState(), skills: { terraform: 2 } },
    )
    expect(Object.keys(merged.skills).sort()).toEqual(['helm', 'terraform'])
  })
})
