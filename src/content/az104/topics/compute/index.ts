import type { Topic } from '../../../types'
import { armBicep } from './arm-bicep'
import { virtualMachines } from './virtual-machines'
import { vmScaleSets } from './vm-scale-sets'
import { containers } from './containers'
import { appService } from './app-service'

/** Lessons in this domain, in teaching order. */
export const az104ComputeTopics: Topic[] = [
  armBicep,
  virtualMachines,
  vmScaleSets,
  containers,
  appService,
]
