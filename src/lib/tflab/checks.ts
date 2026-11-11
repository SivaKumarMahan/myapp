import type { TfScenario, TfStep } from '../../content/tflab/types'
import { runCommand, type ShellSession } from './commands'
import { allResources, loadConfig, resourceAddr } from './config'
import { deepEqual } from './eval'
import {
  createEnv,
  formatValue,
  hasChanges,
  plan,
  seedCloud,
  type Change,
  type EnvData,
} from './engine'
import type { Value } from './hcl'

/**
 * Checks a scenario by the state of the learner's environment, never by the
 * commands typed: the final plan, the state addresses, the code, and - the
 * key anti-cheat - whether the real Azure resources are still the *same
 * objects* they were at the start (destroying and recreating a resource
 * gives it a new identity, even with the same name and ID).
 */

export interface TfCheckResult {
  label: string
  passed: boolean
  messages: string[]
}

export interface TfCheckReport {
  passed: boolean
  results: TfCheckResult[]
}

const display = (value: Value | undefined) => (value === undefined ? 'nothing' : formatValue(value))

function at(value: unknown, path: string): Value | undefined {
  let current: unknown = value
  for (const part of path.split('.')) {
    if (current === null || typeof current !== 'object') return undefined
    current = (current as Record<string, unknown>)[part]
  }
  return current as Value | undefined
}

function describeChange(change: Change): string {
  const target = change.addr
  switch (change.action) {
    case 'create':
      return `${target} would be created${change.importId ? '' : ''}.`
    case 'update': {
      const attrs = Object.keys(change.after ?? {}).filter(
        (name) => !deepEqual(change.before?.[name], change.after?.[name]),
      )
      return `${target} would be updated in place (${attrs.slice(0, 4).join(', ')}).`
    }
    case 'replace':
      return `${target} would be destroyed and recreated (forced by ${change.forceNew.join(', ')}).`
    case 'delete':
      return `${target} would be destroyed.`
    case 'forget':
      return `${target} is still in state - apply the removed block so Terraform forgets it.`
    case 'noop':
      if (change.importId)
        return `${target} is not imported yet - apply so the import is recorded in state.`
      if (change.movedFrom)
        return `${target} still has a pending move from ${change.movedFrom} - apply so state records the new address.`
      return ''
  }
}

const result = (label: string, messages: string[]): TfCheckResult => ({
  label,
  passed: messages.length === 0,
  messages,
})

/** Runs every check for a scenario against an environment. */
export function checkScenario(scenario: TfScenario, env: EnvData): TfCheckReport {
  const results: TfCheckResult[] = []
  const expect = scenario.expect

  // 1. the configuration
  const { config, diagnostics } = loadConfig(env.files, env.init.modules)
  results.push(
    result(
      'The configuration is valid',
      config
        ? []
        : diagnostics
            .filter((diag) => diag.severity === 'error')
            .slice(0, 3)
            .map(
              (diag) =>
                `${diag.summary}${diag.file ? ` (${diag.file}${diag.line ? ` line ${diag.line}` : ''})` : ''}.`,
            ),
    ),
  )

  // 2. lock
  if (scenario.seed.lock || env.lock)
    results.push(
      result(
        'The state is not locked',
        env.lock
          ? [
              `The state is still locked (ID ${env.lock.id}, held by ${env.lock.who}). Every pipeline run will fail until the stale lock is released.`,
            ]
          : [],
      ),
    )

  // 3. a fresh plan
  const fresh = config ? plan(env, {}) : null
  const planMessages: string[] = []
  if (!fresh) planMessages.push('Terraform cannot plan until the configuration is valid.')
  else if (env.lock) planMessages.push('terraform plan fails: Error acquiring the state lock.')
  else if (!fresh.ok)
    planMessages.push(
      ...fresh.diagnostics
        .filter((diag) => diag.severity === 'error')
        .slice(0, 3)
        .map((diag) => `terraform plan fails: ${diag.summary}.`),
    )
  else if (hasChanges(fresh))
    planMessages.push(
      ...fresh.changes.map(describeChange).filter(Boolean).slice(0, 5),
      'Run terraform plan to see it, fix what is wrong, and apply until the plan says "No changes".',
    )
  results.push(result('terraform plan shows no changes', planMessages))

  // 4. the same Azure objects as at the start
  const seeded = seedCloud(scenario.seed)
  const keys = scenario.seed.cloud.map((resource) => resource.key)
  const gone = new Set(expect.gone ?? [])
  const kept = expect.kept ?? keys.filter((key) => !gone.has(key))
  const keptMessages: string[] = []
  for (const key of kept) {
    const index = keys.indexOf(key)
    const original = seeded[index]
    if (!original) continue
    const now = env.cloud[original.id.toLowerCase()]
    const name = String(original.attrs.name)
    if (!now)
      keptMessages.push(
        `${name} (${original.type}) no longer exists in Azure - it was destroyed. Reset the scenario and try a route that keeps it.`,
      )
    else if (now.uid !== original.uid)
      keptMessages.push(
        `${name} was destroyed and created again at ${now.createdAt} - same name and ID, but a brand-new, empty resource. Its data, keys and role assignments are gone.`,
      )
  }
  results.push(result('Nothing was destroyed or recreated', keptMessages))

  // 5. what should be gone, and nothing extra
  const changeMessages: string[] = []
  for (const key of gone) {
    const original = seeded[keys.indexOf(key)]
    if (original && env.cloud[original.id.toLowerCase()])
      changeMessages.push(
        `${String(original.attrs.name)} should have been removed, but it still exists in Azure.`,
      )
  }
  const seededUids = new Set(seeded.map((resource) => resource.uid))
  const extra = Object.values(env.cloud).filter((resource) => !seededUids.has(resource.uid))
  const recreated = extra.filter((resource) =>
    seeded.some((original) => original.id.toLowerCase() === resource.id.toLowerCase()),
  )
  const fresh2 = extra.filter((resource) => !recreated.includes(resource))
  const allowed = expect.newResources ?? 0
  if (fresh2.length > allowed)
    changeMessages.push(
      `${allowed ? `Only ${allowed} new resource${allowed === 1 ? ' was' : 's were'} expected, but` : 'No new resources were needed, but'} you created ${fresh2.map((resource) => String(resource.attrs.name)).join(', ')}.`,
    )
  if (fresh2.length < allowed)
    changeMessages.push(
      `Expected ${allowed} new resource${allowed === 1 ? '' : 's'} in Azure, found ${fresh2.length}.`,
    )
  if (changeMessages.length || gone.size || allowed)
    results.push(result('Only the intended Azure changes happened', changeMessages))

  // 6. state addresses
  const have = env.state.resources.map((instance) => instance.addr)
  const want = expect.state
  const stateMessages: string[] = []
  const missing = want.filter((addr) => !have.includes(addr))
  const unexpected = have.filter((addr) => !want.includes(addr))
  if (missing.length) stateMessages.push(`Missing from state: ${missing.join(', ')}.`)
  if (unexpected.length) stateMessages.push(`Should not be in state: ${unexpected.join(', ')}.`)
  for (const check of expect.stateAttrs ?? []) {
    const instance = env.state.resources.find((entry) => entry.addr === check.addr)
    if (instance && !deepEqual(at(instance.attrs, check.path), check.equals))
      stateMessages.push(check.label)
  }
  results.push(result('State tracks the right addresses', stateMessages))

  // 7. the code
  if (expect.config?.length) {
    const configMessages: string[] = []
    const declared = config ? allResources(config) : []
    for (const check of expect.config) {
      const decl = declared.find(
        (entry) => resourceAddr(entry) === check.addr.replace(/\[[^\]]*\]$/, ''),
      )
      switch (check.kind) {
        case 'declares':
          if (!decl) configMessages.push(check.label)
          break
        case 'not-declares':
          if (decl) configMessages.push(check.label)
          break
        case 'uses-for-each':
          if (!decl?.forEach) configMessages.push(check.label)
          break
        case 'prevent-destroy':
          if (!decl?.lifecycle.preventDestroy) configMessages.push(check.label)
          break
        case 'ignores': {
          const ignore = decl?.lifecycle.ignoreChanges
          const covered =
            ignore === 'all' ||
            (Array.isArray(ignore) &&
              ignore.some((path) => path === check.attr || path.startsWith(`${check.attr}[`)))
          if (!covered) configMessages.push(check.label)
          break
        }
        case 'attr': {
          const change = fresh?.changes.find((entry) => entry.addr === check.addr)
          const value = change?.after?.[check.attr]
          if (!change) configMessages.push(check.label)
          else if (check.equals !== undefined && !deepEqual(value, check.equals))
            configMessages.push(`${check.label} (it is ${display(value)})`)
          else if (check.notEquals !== undefined && deepEqual(value, check.notEquals))
            configMessages.push(check.label)
          break
        }
      }
    }
    results.push(result('The code says what it should', configMessages))
  }

  // 8. Azure itself
  if (expect.cloud?.length) {
    const cloudMessages: string[] = []
    for (const check of expect.cloud) {
      let resource = null
      if (check.key) {
        const original = seeded[keys.indexOf(check.key)]
        resource = original ? env.cloud[original.id.toLowerCase()] : null
      } else if (check.addr) {
        const instance = env.state.resources.find((entry) => entry.addr === check.addr)
        resource = instance ? env.cloud[String(instance.attrs.id).toLowerCase()] : null
      }
      const value = resource ? at(resource.attrs, check.path) : undefined
      if (!resource || !deepEqual(value, check.equals)) cloudMessages.push(check.label)
    }
    results.push(result('Azure looks right', cloudMessages))
  }

  return { passed: results.every((entry) => entry.passed), results }
}

/** Applies solution steps to an environment (file writes and commands). */
export function runSteps(env: EnvData, steps: TfStep[], session: ShellSession = { pending: null }) {
  const outputs: { command: string; output: string; error: boolean }[] = []
  for (const step of steps) {
    if (step.kind === 'write') env.files[step.path] = step.content
    else if (step.kind === 'delete') delete env.files[step.path]
    else {
      const out = runCommand(env, session, step.command)
      outputs.push({ command: step.command, output: out.output, error: out.error })
    }
  }
  return outputs
}

/** A fresh environment for a scenario with `steps` replayed on it. */
export function replay(scenario: TfScenario, steps: TfStep[]): EnvData {
  const env = createEnv(scenario.seed)
  runSteps(env, steps)
  return env
}

/** Is this answer to the root-cause question right? */
export const isCorrectAnswer = (scenario: TfScenario, index: number) =>
  Boolean(scenario.question.options[index]?.correct)
