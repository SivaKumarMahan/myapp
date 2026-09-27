import type { Topic } from '../../../types'
import { cloudComputing } from './cloud-computing'
import { cloudModels } from './cloud-models'
import { cloudBenefits } from './cloud-benefits'
import { serviceTypes } from './service-types'

/** Lessons in this domain, in teaching order. */
export const az900CloudTopics: Topic[] = [cloudComputing, cloudModels, cloudBenefits, serviceTypes]
