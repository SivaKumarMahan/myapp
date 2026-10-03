import servicesData from './services.json'
import scenariosData from './scenarios.json'
import type { Design, ServiceType } from '../../lib/arch/model'
import type { Requirement } from '../../lib/arch/rules'

/** The architecture builder's palette and design scenarios. */

export interface ArchScenario {
  id: string
  title: string
  prompt: string
  requirements: Requirement[]
  /** Rules the model answer deliberately leaves open (e.g. single region). */
  accepts: string[]
  model: Design
  explanation: string
}

export const archServices = servicesData.services as ServiceType[]
export const archServiceById = new Map(archServices.map((service) => [service.id, service]))
export const archRegions = servicesData.regions
export const archScenarios = scenariosData.scenarios as unknown as ArchScenario[]

export const archKey = (id: string) => `arch:${id}`
export const allArchKeys = archScenarios.map((scenario) => archKey(scenario.id))
