import data from './exercises.json'

/**
 * Config lab exercises, from a JSON file: a broken file to fix until it is
 * clean, plus requirements that stop "fixing" it by deleting everything.
 */
export type LabTab = 'pipeline' | 'dockerfile' | 'kubernetes'

export interface LabExercise {
  id: string
  tab: LabTab
  title: string
  exam: string
  description: string
  file: string
  solution: string
  requirements: { description: string; query: string }[]
}

export const labExercises = (data as { exercises: LabExercise[] }).exercises
export const labExerciseKey = (id: string) => `lab:${id}`
