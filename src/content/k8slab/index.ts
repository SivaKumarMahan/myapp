import { crashingScenarios } from './scenarios/crashing'
import { networkingScenarios } from './scenarios/networking'
import { podStartScenarios } from './scenarios/pods'
import { probeScenarios } from './scenarios/probes'
import { rolloutScenarios } from './scenarios/rollouts'
import { schedulingScenarios } from './scenarios/scheduling'
import type { K8sCategory, K8sScenario } from './types'

export type { K8sCategory, K8sCheck, K8sScenario } from './types'

/** Every Kubernetes troubleshooting scenario, in display order. */
export const k8sScenarios: K8sScenario[] = [
  ...podStartScenarios,
  ...crashingScenarios,
  ...probeScenarios,
  ...schedulingScenarios,
  ...networkingScenarios,
  ...rolloutScenarios,
]

export const k8sCategories: K8sCategory[] = [
  ...new Set(k8sScenarios.map((scenario) => scenario.category)),
]

export const k8sScenarioById = new Map(k8sScenarios.map((scenario) => [scenario.id, scenario]))
export const k8sKey = (id: string) => `k8s:${id}`
export const allK8sKeys = k8sScenarios.map((scenario) => k8sKey(scenario.id))
