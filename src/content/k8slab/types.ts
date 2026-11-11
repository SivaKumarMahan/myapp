import type { ImageFact, NodeRecord, Registry } from '../../lib/k8slab/types'

/**
 * Kubernetes troubleshooting lab scenarios are data: the broken cluster
 * (plain manifests plus "world facts" the cluster cannot see - which image
 * tags exist, what the app really listens on, how much memory it needs), the
 * story, hints, a reference fix, state-based checks and a root-cause
 * question. The checks look at the cluster afterwards, never at the
 * commands you typed, so any correct fix passes.
 */

export type K8sCategory =
  | "Pods won't start"
  | 'Crashing apps'
  | 'Health probes'
  | 'Scheduling'
  | 'Networking & Ingress'
  | 'Rollouts'

export interface ScenarioSetup {
  /** The namespace the scenario lives in; the kubeconfig context points at it. */
  namespace: string
  /** Multi-document YAML, applied `age` seconds ago. */
  manifests: string
  /** Seconds since the manifests were applied (default 900 - a 15-minute-old incident). */
  age?: number
  /** Commands run after the manifests, `at` seconds after they were applied (e.g. a bad release). */
  timeline?: { at: number; command: string }[]
  images?: ImageFact[]
  registries?: Registry[]
  /** Extra nodes beside the three default ones. */
  extraNodes?: NodeRecord[]
}

/**
 * A state check. `namespace` defaults to the scenario's. Labels and
 * messages are generated in plain words by `lib/k8slab/checks.ts`.
 */
export type K8sCheck =
  /** Fully rolled out: every replica updated and Ready, nothing left over, no restarts a minute later. */
  | { kind: 'rollout'; deployment: string; namespace?: string }
  /** The Service has a ready endpoint for each replica of `deployment` - and only its Pods. */
  | { kind: 'endpoints'; service: string; deployment: string; namespace?: string }
  /** An HTTP request (from outside through the ingress, or from inside the cluster) gets this status. */
  | { kind: 'http'; url: string; status: number; from?: 'outside' | 'cluster'; contains?: string }
  /** The PersistentVolumeClaim used by the Deployment is Bound. */
  | { kind: 'pvc'; deployment: string; namespace?: string }
  /** These objects still exist (were not deleted, or were recreated). */
  | {
      kind: 'exists'
      resource: 'Deployment' | 'Service' | 'Ingress' | 'ConfigMap' | 'Secret'
      name: string
      namespace?: string
    }
  /** The container still uses this image repository (and optionally exactly this tag). */
  | {
      kind: 'image'
      deployment: string
      container: string
      repo: string
      tag?: string
      namespace?: string
    }
  /** Replicas unchanged. */
  | { kind: 'replicas'; deployment: string; count: number; namespace?: string }
  /** The memory limit is set and within a sensible range. */
  | {
      kind: 'memory-limit'
      deployment: string
      container: string
      min: string
      max: string
      namespace?: string
    }
  /** The CPU request is set and within a range that fits a node. */
  | {
      kind: 'cpu-request'
      deployment: string
      container: string
      min: string
      max: string
      namespace?: string
    }
  /** The probe is still configured (not deleted to make the symptom go away). */
  | {
      kind: 'probe'
      deployment: string
      container: string
      probe: 'livenessProbe' | 'readinessProbe'
      namespace?: string
    }
  /** The Pods still select these node labels. */
  | {
      kind: 'node-selector'
      deployment: string
      labels: Record<string, string>
      namespace?: string
    }
  /** The node still carries this taint (nobody "fixed" the node for one workload). */
  | { kind: 'taint'; node: string; key: string }
  /** The Pods still mount a PersistentVolumeClaim (data is not thrown away). */
  | { kind: 'volume'; deployment: string; namespace?: string }

export interface RootCauseOption {
  text: string
  correct?: boolean
  /** Why this is (or isn't) the root cause - shown after answering. */
  why: string
}

export interface K8sScenario {
  id: string
  title: string
  category: K8sCategory
  level: 'simple' | 'medium'
  /** What happened, in a sentence or three. */
  story: string
  /** What to do. */
  task: string
  /** What users / dashboards see. */
  symptom: string
  hints: [string, string, string]
  /** The reference fix. `files` are written first, then the commands are run. */
  solution: { commands: string[]; files?: { name: string; content: string }[] }
  /** Line-by-line notes for the reference fix. */
  explanation: { code: string; note: string }[]
  /** A tempting fix that does not work - the self-test makes sure it fails. */
  wrongFix: { commands: string[]; files?: { name: string; content: string }[]; why: string }
  checks: K8sCheck[]
  rootCause: { question: string; options: RootCauseOption[] }
  /** One paragraph on the lesson, shown after solving. */
  lesson: string
  followUp: string
  tags: string[]
  /** Interview question ids (`itv-...`) that ask about this. */
  related: string[]
  setup: ScenarioSetup
}
