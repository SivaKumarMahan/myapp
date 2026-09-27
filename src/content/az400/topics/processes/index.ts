import type { Topic } from '../../../types'
import { workTracking } from './work-tracking'
import { docsIntegration } from './docs-integration'

/** Lessons in this domain, in teaching order. */
export const az400ProcessesTopics: Topic[] = [workTracking, docsIntegration]
