import type { Topic } from '../../types'
import { az900CloudTopics } from './cloud'
import { az900ArchitectureTopics } from './architecture'
import { az900ManagementTopics } from './management'

/** Every lesson in the course, in teaching order. */
export const az900Topics: Topic[] = [
  ...az900CloudTopics,
  ...az900ArchitectureTopics,
  ...az900ManagementTopics,
]
