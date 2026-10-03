import rbacData from './rbac.json'
import gitData from './git.json'
import deployData from './deploy.json'
import slaData from './sla.json'
import type { Model, RequestProps, Outcome } from '../../lib/visualise/rbac'
import type { GitCheck } from '../../lib/visualise/git'
import type { StrategyId } from '../../lib/visualise/deploy'
import type { Service, SlaNode } from '../../lib/visualise/sla'

/** Concept visualisations: the data behind the four Visualise tools. */

export interface RbacExercise {
  id: string
  title: string
  principal: string
  action: string
  target: string
  props: RequestProps
  expected: Outcome
  explanation: string
}

export interface GitExercise {
  id: string
  track: 'basics' | 'gitflow' | 'trunk'
  title: string
  goal: string
  setup: string[]
  solution: string[]
  hint: string
  checks: GitCheck[]
}

export interface StrategyInfo {
  id: StrategyId
  title: string
  summary: string
  pros: string[]
  cons: string[]
  azure: string[]
}

export interface DeployQuiz {
  id: string
  question: string
  answer: StrategyId
  explanation: string
}

export interface SlaExercise {
  id: string
  question: string
  tree?: SlaNode
  kind: 'percent' | 'minutes'
  answer: number
  tolerance: number
}

export const rbacModel = rbacData as unknown as Model
export const rbacExercises = (rbacData as unknown as { exercises: RbacExercise[] }).exercises
export const gitExercises = (gitData as unknown as { exercises: GitExercise[] }).exercises
export const gitComparison = gitData.comparison
export const strategies = deployData.strategies as StrategyInfo[]
export const deployQuiz = deployData.quiz as DeployQuiz[]
export const slaServices = slaData.services as Service[]
export const slaPresets = slaData.presets as unknown as {
  id: string
  title: string
  tree: SlaNode
}[]
export const slaExercises = slaData.exercises as unknown as SlaExercise[]

export type VizKind = 'rbac' | 'git' | 'deploy' | 'sla'
export const vizKey = (kind: VizKind, id: string) => `viz:${kind}:${id}`

/** Every exercise, for progress counts on Home. */
export const allVizKeys = [
  ...rbacExercises.map((exercise) => vizKey('rbac', exercise.id)),
  ...gitExercises.map((exercise) => vizKey('git', exercise.id)),
  ...deployQuiz.map((question) => vizKey('deploy', question.id)),
  ...slaExercises.map((exercise) => vizKey('sla', exercise.id)),
]
