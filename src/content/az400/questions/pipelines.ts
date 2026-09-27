import type { Question } from '../../types'
import { az400PipelinesPartAQuestions } from './pipelines-a'
import { az400PipelinesPartBQuestions } from './pipelines-b'

/** Original practice questions for this domain. Written for this app. */
export const az400PipelinesQuestions: Question[] = [
  ...az400PipelinesPartAQuestions,
  ...az400PipelinesPartBQuestions,
]
