import type { Topic } from '../../../types'
import { pipelineSecurity } from './pipeline-security'
import { securityScanning } from './security-scanning'

/** Lessons in this domain, in teaching order. */
export const az400SecurityTopics: Topic[] = [pipelineSecurity, securityScanning]
