import { describe, expect, it } from 'vitest'
import { guidedLabs, isRunning, verifyOutput } from '../content/labs'
import { conceptLines, iacResources } from '../content/iac'
import { courseIdForTopic } from '../content/registry'
import { glossaryTerms, relatedLessons, splitTerms } from './glossary'
import { createEmptyState, mergeStates, migrate } from './storage'

describe('guided labs', () => {
  it('has five AZ-104 and five AZ-400 labs, each complete', () => {
    expect(guidedLabs.filter((lab) => lab.course === 'az104')).toHaveLength(5)
    expect(guidedLabs.filter((lab) => lab.course === 'az400')).toHaveLength(5)
    for (const lab of guidedLabs) {
      expect(lab.goals.length, lab.id).toBeGreaterThan(0)
      expect(lab.checklist.length, lab.id).toBeGreaterThan(0)
      expect(lab.cost.estimate, lab.id).toBeTruthy()
      expect(lab.cleanup.commands, lab.id).toMatch(/delete|purge|rm -/)
      expect(
        lab.steps.some((step) => step.verify),
        lab.id,
      ).toBe(true)
      for (const lesson of lab.lessons)
        expect(courseIdForTopic(lesson), `${lab.id}: ${lesson}`).toBeTruthy()
    }
  })

  it.each(
    guidedLabs.flatMap((lab) =>
      lab.steps
        .filter((step) => step.verify)
        .map((step) => [`${lab.id}: ${step.title}`, step] as const),
    ),
  )('%s - the sample output passes its own checks, and junk does not', (_, step) => {
    expect(verifyOutput(step.verify!, step.verify!.sample).every(Boolean)).toBe(true)
    expect(verifyOutput(step.verify!, 'ERROR: something else entirely').every(Boolean)).toBe(false)
  })

  it('knows when a lab may still have resources running', () => {
    expect(isRunning(undefined)).toBe(false)
    expect(isRunning({ done: [0], verified: [], checks: [], startedAt: 10 })).toBe(true)
    expect(isRunning({ done: [0], verified: [], checks: [], startedAt: 10, cleanedAt: 20 })).toBe(
      false,
    )
    expect(isRunning({ done: [0], verified: [], checks: [], startedAt: 30, cleanedAt: 20 })).toBe(
      true,
    )
  })
})

describe('IaC compare', () => {
  it('has the four resources, valid ARM JSON, and every concept found in its code', () => {
    expect(iacResources.map((resource) => resource.id)).toEqual([
      'storage',
      'vnet',
      'appservice',
      'keyvault',
    ])
    for (const resource of iacResources) {
      expect(() => JSON.parse(resource.arm), resource.id).not.toThrow()
      for (const concept of resource.concepts) {
        for (const language of ['arm', 'bicep', 'terraform'] as const) {
          for (const token of concept.match[language]) {
            expect(
              conceptLines(resource[language], [token]).length,
              `${resource.id}/${concept.id}/${language}: ${token}`,
            ).toBeGreaterThan(0)
          }
        }
        const covered = (['arm', 'bicep', 'terraform'] as const).filter(
          (language) => conceptLines(resource[language], concept.match[language]).length > 0,
        )
        expect(covered.length, `${resource.id}/${concept.id}`).toBeGreaterThanOrEqual(2)
      }
    }
  })
})

describe('glossary', () => {
  it('has unique ids and definitions', () => {
    expect(new Set(glossaryTerms.map((term) => term.id)).size).toBe(glossaryTerms.length)
    for (const term of glossaryTerms) expect(term.definition.length, term.id).toBeGreaterThan(20)
  })

  it('links each term once, prefers the longest phrase, and respects acronym case', () => {
    const parts = splitTerms(
      'Put a private endpoint in the subnet; the NSG and another NSG apply, not the nsg alias. Add a tag.',
    )
    const linked = parts.filter((part) => typeof part !== 'string') as {
      id: string
      text: string
    }[]
    expect(linked.map((part) => part.text)).toEqual(['private endpoint', 'NSG'])
    const text =
      'Put a private endpoint in the subnet; the NSG and another NSG apply, not the nsg alias. Add a tag.'
    expect(parts.map((part) => (typeof part === 'string' ? part : part.text)).join('')).toBe(text)
    expect(
      splitTerms('lowercase nsg and sas are ordinary words here').some(
        (part) => typeof part !== 'string',
      ),
    ).toBe(false)
  })

  it('finds lessons that use a term', () => {
    expect(relatedLessons('nsg').length).toBeGreaterThan(0)
    expect(relatedLessons('private-endpoint')[0].to).toMatch(/\/topics\//)
  })
})

describe('guided lab progress in the progress record', () => {
  it('migrates and merges, keeping a lab running if it restarted after cleanup', () => {
    const migrated = migrate({
      topics: {},
      guidedLabs: { a: { done: [1, 0, 1, -1, 'x'], checks: [2], startedAt: 50, cleanedAt: 40 } },
    })
    expect(migrated.guidedLabs.a).toEqual({
      done: [0, 1],
      verified: [],
      checks: [2],
      startedAt: 50,
      cleanedAt: 40,
    })
    const merged = mergeStates(
      {
        ...createEmptyState(),
        guidedLabs: { a: { done: [3], verified: [], checks: [], startedAt: 10, cleanedAt: 20 } },
      },
      migrated,
    )
    expect(merged.guidedLabs.a.done).toEqual([0, 1, 3])
    expect(merged.guidedLabs.a.startedAt).toBe(50)
    expect(merged.guidedLabs.a.cleanedAt).toBeUndefined()
  })
})
