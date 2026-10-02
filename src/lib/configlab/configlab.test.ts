import { describe, expect, it } from 'vitest'
import { labExercises } from '../../content/configlab'
import { analyse, exerciseStatus } from './index'

describe('Config lab exercises', () => {
  it('has four exercises per tab', () => {
    for (const tab of ['pipeline', 'dockerfile', 'kubernetes']) {
      expect(labExercises.filter((exercise) => exercise.tab === tab)).toHaveLength(4)
    }
  })

  it.each(labExercises.map((exercise) => [exercise.id, exercise] as const))(
    '%s: the broken file has problems to fix',
    (_id, exercise) => {
      const status = exerciseStatus(exercise, analyse(exercise.tab, exercise.file))
      expect(status.clean).toBe(false)
      expect(status.solved).toBe(false)
    },
  )

  it.each(labExercises.map((exercise) => [exercise.id, exercise] as const))(
    '%s: the reference solution is clean and meets the requirements',
    (_id, exercise) => {
      const analysis = analyse(exercise.tab, exercise.solution)
      const problems = analysis.findings.filter((finding) => finding.severity !== 'info')
      expect(
        problems.map((finding) => `${finding.rule} line ${finding.line}: ${finding.title}`),
      ).toEqual([])
      expect(exerciseStatus(exercise, analysis).solved).toBe(true)
    },
  )
})
