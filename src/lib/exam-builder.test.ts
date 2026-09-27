import { describe, expect, it } from 'vitest'
import { buildDomainDrill, buildExam, createRandom, shuffle } from './exam-builder'
import { az104Course, az900Course } from '../content/courses'

describe('createRandom', () => {
  it('is deterministic for a given seed', () => {
    const a = createRandom(42)
    const b = createRandom(42)
    expect([a(), a(), a()]).toEqual([b(), b(), b()])
  })

  it('produces values in [0, 1)', () => {
    const random = createRandom(7)
    for (let i = 0; i < 200; i += 1) {
      const value = random()
      expect(value).toBeGreaterThanOrEqual(0)
      expect(value).toBeLessThan(1)
    }
  })
})

describe('shuffle', () => {
  it('keeps every element exactly once', () => {
    const input = [1, 2, 3, 4, 5, 6, 7, 8]
    const output = shuffle(input, createRandom(3))
    expect([...output].sort((a, b) => a - b)).toEqual(input)
    expect(input).toEqual([1, 2, 3, 4, 5, 6, 7, 8]) // input is not mutated
  })
})

describe('buildExam: domain weighting', () => {
  it('allocates 50 questions as 14/19/17 to match the 28/38/34 blueprint', () => {
    const exam = buildExam(az900Course, 50, 1)
    expect(exam.questions).toHaveLength(50)
    expect(exam.composition).toEqual({
      'az9-cloud': 14, // 28%
      'az9-architecture': 19, // 38%
      'az9-management': 17, // 34%
    })
  })

  it('only selects from domains the blueprint weights', () => {
    const exam = buildExam(az104Course, 20, 9)
    const weighted = new Set(Object.keys(az104Course.examBlueprint.weights))
    expect(exam.questions.every((question) => weighted.has(question.domainId))).toBe(true)
  })

  it('is reproducible for the same seed and differs across seeds', () => {
    const ids = (seed: number) => buildExam(az104Course, 10, seed).questions.map((q) => q.id)
    expect(ids(123)).toEqual(ids(123))
    expect(ids(123)).not.toEqual(ids(456))
  })

  it('never repeats a question within one paper', () => {
    const exam = buildExam(az104Course, 20, 77)
    expect(new Set(exam.questions.map((q) => q.id)).size).toBe(exam.questions.length)
  })

  it('handles smaller papers and keeps the weighting sensible', () => {
    const exam = buildExam(az104Course, 5, 5)
    expect(exam.questions).toHaveLength(5)
    const total = Object.values(exam.composition).reduce((sum, count) => sum + count, 0)
    expect(total).toBe(5)
    // Compute is joint-largest at 24%, so it must be represented.
    expect(exam.composition['az1-compute']).toBeGreaterThanOrEqual(1)
  })

  it('caps the paper at the size of the question pool', () => {
    const exam = buildExam(az104Course, 10_000, 2)
    const poolSize = az104Course.questions.filter((question) =>
      Object.keys(az104Course.examBlueprint.weights).includes(question.domainId),
    ).length
    expect(exam.questions).toHaveLength(poolSize)
  })
})

describe('buildDomainDrill', () => {
  it('returns only questions from the requested domain', () => {
    const drill = buildDomainDrill(az104Course, 'az1-networking', 5, 1)
    expect(drill.questions).toHaveLength(5)
    expect(drill.questions.every((q) => q.domainId === 'az1-networking')).toBe(true)
  })

  it('returns an empty paper for an unknown domain', () => {
    expect(buildDomainDrill(az104Course, 'nope', 5, 1).questions).toHaveLength(0)
  })
})
