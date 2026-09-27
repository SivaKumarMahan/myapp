import type { Question } from '../../types'
import { az400ProcessesQuestions } from './processes'
import { az400SourceQuestions } from './source'
import { az400PipelinesQuestions } from './pipelines'
import { az400SecurityQuestions } from './security'
import { az400InstrumentationQuestions } from './instrumentation'

export const az400Questions: Question[] = [
  ...az400ProcessesQuestions,
  ...az400SourceQuestions,
  ...az400PipelinesQuestions,
  ...az400SecurityQuestions,
  ...az400InstrumentationQuestions,
]
