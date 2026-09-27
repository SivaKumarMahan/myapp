import type { Question } from '../../types'
import { az104IdentityQuestions } from './identity'
import { az104StorageQuestions } from './storage'
import { az104ComputeQuestions } from './compute'
import { az104NetworkingQuestions } from './networking'
import { az104MonitorQuestions } from './monitor'

export const az104Questions: Question[] = [
  ...az104IdentityQuestions,
  ...az104StorageQuestions,
  ...az104ComputeQuestions,
  ...az104NetworkingQuestions,
  ...az104MonitorQuestions,
]
