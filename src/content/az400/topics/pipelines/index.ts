import type { Topic } from '../../../types'
import { az400PipelinesPartATopics } from './part-a'
import { az400PipelinesPartBTopics } from './part-b'

/** Lessons in this domain, in teaching order. Split in two files because it is half the exam. */
export const az400PipelinesTopics: Topic[] = [
  ...az400PipelinesPartATopics,
  ...az400PipelinesPartBTopics,
]
