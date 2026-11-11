import type { EnvSeed } from '../../lib/tflab/engine'
import type { Value } from '../../lib/tflab/hcl'

/**
 * Terraform plan & state lab scenarios are data: a working directory, a
 * state file and the "real" Azure resources (the seed), plus the story, the
 * hints, a reference solution and what a good outcome looks like. The
 * checker inspects the learner's environment afterwards - the plan, the
 * state, the code and Azure - so any correct route passes.
 */

export type TfCategory =
  'Refactoring' | 'Import & adoption' | 'Drift' | 'Protection' | 'State' | 'Apply errors'

export type TfLevel = 'simple' | 'medium' | 'advanced'

/** One step of a solution: run a command, or replace a file's contents. */
export type TfStep =
  | { kind: 'run'; command: string }
  | { kind: 'write'; path: string; content: string }
  | { kind: 'delete'; path: string }

/** What the configuration must still say afterwards. */
export type TfConfigCheck =
  | { kind: 'declares'; addr: string; label: string }
  | { kind: 'not-declares'; addr: string; label: string }
  | { kind: 'uses-for-each'; addr: string; label: string }
  | { kind: 'prevent-destroy'; addr: string; label: string }
  /** `ignore_changes` covers `attr` (the whole attribute, one of its keys, or `all`). */
  | { kind: 'ignores'; addr: string; attr: string; label: string }
  /** An argument's evaluated value for one instance. */
  | { kind: 'attr'; addr: string; attr: string; equals?: Value; notEquals?: Value; label: string }

/** A value on a real Azure resource (by seed key, or by the address now in state). */
export interface TfCloudCheck {
  key?: string
  addr?: string
  /** Dotted path into the resource's attributes, e.g. `tags.CostCenter`. */
  path: string
  equals: Value
  label: string
}

export interface TfExpect {
  /** Seed resources that must keep their original identity (default: all not in `gone`). */
  kept?: string[]
  /** Seed resources that should no longer exist. */
  gone?: string[]
  /** How many resources the fix may create (default 0). */
  newResources?: number
  /** Exactly these addresses in state afterwards. */
  state: string[]
  config?: TfConfigCheck[]
  cloud?: TfCloudCheck[]
  /** Values the state file must record. */
  stateAttrs?: { addr: string; path: string; equals: Value; label: string }[]
}

export interface TfQuestion {
  prompt: string
  options: { text: string; correct?: boolean; why: string }[]
}

export interface TfScenario {
  id: string
  title: string
  category: TfCategory
  level: TfLevel
  story: string
  task: string
  seed: EnvSeed
  /** Commands worth running first (shown as buttons). */
  lookAt: string[]
  hints: [string, string, string]
  /** The reference solution: what the self-test replays. */
  solution: TfStep[]
  /** Another valid route, shown under the solution. */
  alternative?: { label: string; steps: TfStep[] }
  explanation: { code: string; note: string }[]
  /** Plausible wrong fixes - the tests prove each one fails the checks. */
  wrongFixes: { label: string; steps: TfStep[] }[]
  expect: TfExpect
  /** Asked once the checks pass; answering it right solves the scenario. */
  question: TfQuestion
  followUp: string
  tags: string[]
  /** Interview question ids (src/content/interview) on the same topic. */
  related: string[]
}
