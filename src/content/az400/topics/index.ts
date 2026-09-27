import type { Topic } from '../../types'
import { az400ProcessesTopics } from './processes'
import { az400SourceTopics } from './source'
import { az400PipelinesTopics } from './pipelines'
import { az400SecurityTopics } from './security'
import { az400InstrumentationTopics } from './instrumentation'

/** Every lesson in the course, in teaching order. */
export const az400Topics: Topic[] = [
  ...az400ProcessesTopics,
  ...az400SourceTopics,
  ...az400PipelinesTopics,
  ...az400SecurityTopics,
  ...az400InstrumentationTopics,
]
