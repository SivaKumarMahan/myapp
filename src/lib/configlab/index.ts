import jmespath from 'jmespath'
import type { LabExercise, LabTab } from '../../content/configlab'
import { analyseDockerfile } from './dockerfile'
import { analyseKubernetes } from './kubernetes'
import { analysePipeline } from './pipeline'
import { isClean, sortFindings, type Analysis } from './types'

export function analyse(tab: LabTab, text: string): Analysis<unknown> {
  const result =
    tab === 'pipeline'
      ? analysePipeline(text)
      : tab === 'dockerfile'
        ? analyseDockerfile(text)
        : analyseKubernetes(text)
  return { ...result, findings: sortFindings(result.findings) }
}

export interface ExerciseStatus {
  clean: boolean
  requirements: { description: string; passed: boolean }[]
  solved: boolean
}

export function exerciseStatus(exercise: LabExercise, analysis: Analysis<unknown>): ExerciseStatus {
  const requirements = exercise.requirements.map((requirement) => {
    let passed = false
    try {
      passed = jmespath.search(analysis.facts as never, requirement.query) === true
    } catch {
      passed = false
    }
    return { description: requirement.description, passed }
  })
  const clean = isClean(analysis.findings)
  return {
    clean,
    requirements,
    solved: clean && requirements.every((requirement) => requirement.passed),
  }
}
