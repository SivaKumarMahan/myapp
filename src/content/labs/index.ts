import data from './guided.json'
import type { GuidedLabProgress } from '../../lib/storage'

/** Guided labs for your own Azure subscription (Cloud Shell, Bash). */

export interface LabVerify {
  command: string
  /** Regular expressions the pasted output must all match. */
  expect: string[]
  /** An example of the expected output (the tests check `expect` against it). */
  sample: string
  explain: string
}

export interface LabStep {
  title: string
  text: string
  commands: string
  verify?: LabVerify
}

export interface GuidedLab {
  id: string
  course: 'az104' | 'az400'
  title: string
  summary: string
  minutes: number
  cost: { estimate: string; detail: string }
  prerequisites: string[]
  goals: string[]
  lessons: string[]
  steps: LabStep[]
  checklist: string[]
  cleanup: { commands: string; note: string }
}

export const guidedLabs = (data as unknown as { labs: GuidedLab[] }).labs
export const guidedLabById = new Map(guidedLabs.map((lab) => [lab.id, lab]))
export const guidedLabKey = (id: string) => `glab:${id}`
export const allGuidedLabKeys = guidedLabs.map((lab) => guidedLabKey(lab.id))

/** Does pasted output satisfy every pattern? Multiline, case-insensitive, whitespace-tolerant. */
export function verifyOutput(verify: LabVerify, output: string): boolean[] {
  const text = output.replace(/\r\n/g, '\n').trim()
  return verify.expect.map((pattern) => {
    try {
      return new RegExp(pattern, 'im').test(text)
    } catch {
      return false
    }
  })
}

/** Resources may still exist: a step was done after the last confirmed cleanup. */
export const isRunning = (progress: GuidedLabProgress | undefined) =>
  Boolean(progress?.startedAt) &&
  !(progress?.cleanedAt && progress.cleanedAt >= (progress.startedAt ?? 0))
