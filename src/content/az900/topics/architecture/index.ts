import type { Topic } from '../../../types'
import { computeServices } from './compute-services'
import { coreArchitecture } from './core-architecture'
import { identitySecurity } from './identity-security'
import { networkingServices } from './networking-services'
import { storageServices } from './storage-services'

/** Lessons in this domain, in teaching order. */
export const az900ArchitectureTopics: Topic[] = [
  coreArchitecture,
  computeServices,
  networkingServices,
  storageServices,
  identitySecurity,
]
