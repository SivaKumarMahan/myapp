import type { Question } from '../../types'
import { az900CloudQuestions } from './cloud'
import { az900ArchitectureQuestions } from './architecture'
import { az900ManagementQuestions } from './management'

export const az900Questions: Question[] = [
  ...az900CloudQuestions,
  ...az900ArchitectureQuestions,
  ...az900ManagementQuestions,
]
