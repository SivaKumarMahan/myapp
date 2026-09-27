import type { Topic } from '../../types'
import { az104IdentityTopics } from './identity'
import { az104StorageTopics } from './storage'
import { az104ComputeTopics } from './compute'
import { az104NetworkingTopics } from './networking'
import { az104MonitorTopics } from './monitor'

/** Every lesson in the course, in teaching order. */
export const az104Topics: Topic[] = [
  ...az104IdentityTopics,
  ...az104StorageTopics,
  ...az104ComputeTopics,
  ...az104NetworkingTopics,
  ...az104MonitorTopics,
]
