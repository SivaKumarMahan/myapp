import { describe, expect, it } from 'vitest'
import {
  deployQuiz,
  gitExercises,
  rbacExercises,
  rbacModel,
  slaExercises,
  slaPresets,
  slaServices,
  strategies,
} from '../../content/visualise'
import { actionMatches, appliesAt, evaluate, policiesAt, roleAllows } from './rbac'
import { checkPasses, initRepo, layout, reachable, resolve, run, runAll } from './git'
import {
  canSlide,
  errorRate,
  initial,
  isFinished,
  next,
  rollback,
  route,
  setWeight,
} from './deploy'
import { availability, downtimeMinutes, formatPercent, MINUTES } from './sla'

describe('RBAC and Policy engine', () => {
  it('matches Azure action wildcards case-insensitively', () => {
    expect(actionMatches('*/read', 'Microsoft.Compute/virtualMachines/read')).toBe(true)
    expect(
      actionMatches(
        'Microsoft.Authorization/*/Write',
        'microsoft.authorization/roleAssignments/write',
      ),
    ).toBe(true)
    expect(actionMatches('*/read', 'Microsoft.Compute/virtualMachines/restart/action')).toBe(false)
  })

  it('applies notActions and keeps data actions separate', () => {
    const contributor = rbacModel.roles.find((role) => role.id === 'contributor')!
    expect(
      roleAllows(contributor, 'Microsoft.Authorization/roleAssignments/write', 'control'),
    ).toBe(false)
    expect(roleAllows(contributor, 'Microsoft.Compute/virtualMachines/delete', 'control')).toBe(
      true,
    )
    expect(
      roleAllows(
        contributor,
        'Microsoft.Storage/storageAccounts/blobServices/containers/blobs/read',
        'data',
      ),
    ).toBe(false)
  })

  it('inherits down the hierarchy and honours policy exclusions', () => {
    expect(appliesAt(rbacModel.nodes, 'mg-contoso', 'vm-pay-01')).toBe(true)
    expect(appliesAt(rbacModel.nodes, 'sub-dev', 'vm-pay-01')).toBe(false)
    expect(
      policiesAt(rbacModel, 'rg-sandbox').some((policy) => policy.name === 'Allowed locations'),
    ).toBe(false)
  })

  it.each(rbacExercises.map((exercise) => [exercise.id, exercise] as const))(
    'exercise %s gets its expected outcome',
    (_, exercise) => {
      expect(rbacModel.principals.some((principal) => principal.id === exercise.principal)).toBe(
        true,
      )
      const result = evaluate(
        rbacModel,
        exercise.principal,
        exercise.action,
        exercise.target,
        exercise.props,
      )
      expect(result.outcome).toBe(exercise.expected)
    },
  )

  it('every exercise targets something the action can act on', () => {
    for (const exercise of rbacExercises) {
      const action = rbacModel.actions.find((entry) => entry.id === exercise.action)!
      const node = rbacModel.nodes.find((entry) => entry.id === exercise.target)!
      expect(action.targets, exercise.id).toContain(node.type)
      if (action.on) expect(node.resourceType, exercise.id).toBe(action.on)
    }
  })
})

describe('Git model', () => {
  it('commits, branches, merges and fast-forwards', () => {
    let result = runAll(initRepo(), [
      'git commit',
      'git checkout -b feature',
      'git commit -m "F"',
      'git checkout main',
    ])
    expect(result.ok).toBe(true)
    result = run(result.repo, 'git merge feature')
    expect(result.output).toMatch(/Fast-forward/)
    result = runAll(result.repo, [
      'git commit',
      'git checkout feature',
      'git commit',
      'git checkout main',
      'git merge feature',
    ])
    const tip = result.repo.commits[result.repo.branches.main]
    expect(tip.parents).toHaveLength(2)
  })

  it('rebase copies commits and leaves the originals unreachable', () => {
    const result = runAll(initRepo(), [
      'git checkout -b f',
      'git commit -m "A"',
      'git checkout main',
      'git commit -m "B"',
      'git checkout f',
      'git rebase main',
    ])
    expect(result.ok).toBe(true)
    expect(result.repo.branches.f).toBe("C1'")
    expect(reachable(result.repo).has('C1')).toBe(false)
    expect(layout(result.repo).nodes.find((node) => node.id === 'C1')?.reachable).toBe(false)
  })

  it('resolves HEAD~n and reports errors without changing anything', () => {
    const repo = runAll(initRepo(), ['git commit', 'git commit']).repo
    expect(resolve(repo, 'HEAD~2')).toBe('C0')
    const failed = run(repo, 'git checkout nowhere')
    expect(failed.ok).toBe(false)
    expect(failed.repo).toBe(repo)
    expect(run(repo, 'git frobnicate').ok).toBe(false)
  })

  it.each(gitExercises.map((exercise) => [exercise.id, exercise] as const))(
    'exercise %s: setup runs, checks fail before and pass after the solution',
    (_, exercise) => {
      const setup = runAll(initRepo(), exercise.setup)
      expect(setup.ok, setup.output).toBe(true)
      expect(exercise.checks.every((check) => checkPasses(setup.repo, check))).toBe(false)
      const solved = runAll(setup.repo, exercise.solution)
      expect(solved.ok, solved.output).toBe(true)
      for (const check of exercise.checks)
        expect(checkPasses(solved.repo, check), JSON.stringify(check)).toBe(true)
    },
  )
})

describe('Deployment strategies', () => {
  it.each(strategies.map((strategy) => strategy.id))(
    '%s runs to the end with all traffic on v2',
    (id) => {
      let state = initial(id)
      for (let i = 0; i < 20 && !isFinished(state); i += 1) state = next(state)
      expect(state.phase).toBe('done')
      expect(state.weight).toBe(100)
      expect(state.instances.every((instance) => instance.version === 'v2')).toBe(true)
    },
  )

  it('rolls back to v1 and halts rings on a failing gate', () => {
    let canary = next(next(initial('canary', true)))
    expect(canary.weight).toBe(5)
    expect(errorRate(canary)).toBeGreaterThan(0)
    canary = rollback(canary)
    expect(canary.weight).toBe(0)
    expect(canary.instances.every((instance) => instance.version === 'v1')).toBe(true)

    let rings = initial('rings', true)
    for (let i = 0; i < 5 && !isFinished(rings); i += 1) rings = next(rings)
    expect(rings.phase).toBe('halted')
    expect(rings.weight).toBe(1)
  })

  it('the slider works only while both versions run, and routing follows the weight', () => {
    const state = next(initial('blue-green'))
    expect(canSlide(state)).toBe(true)
    const half = setWeight(state, 50)
    expect(route(half, 0.2, 0)?.version).toBe('v2')
    expect(route(half, 0.8, 0)?.version).toBe('v1')
    expect(canSlide(initial('rolling'))).toBe(false)
  })

  it('quiz answers name real strategies', () => {
    for (const question of deployQuiz)
      expect(strategies.map((strategy) => strategy.id)).toContain(question.answer)
  })
})

describe('Composite SLA', () => {
  const services = new Map(slaServices.map((service) => [service.id, service]))

  it('multiplies in series and combines failures in parallel', () => {
    const one = { kind: 'service' as const, service: 'x', sla: 99 }
    expect(availability({ kind: 'series', items: [one, one] }, services)).toBeCloseTo(0.9801)
    expect(availability({ kind: 'parallel', items: [one, one] }, services)).toBeCloseTo(0.9999)
    expect(downtimeMinutes(0.999, 'month')).toBeCloseTo(43.83, 1)
    expect(formatPercent(0.99940005)).toBe('99.94%')
    expect(formatPercent(0.99999964)).toBe('99.999964%')
    expect(formatPercent(0.999)).toBe('99.9%')
    expect(MINUTES.year).toBe(525960)
  })

  it('every preset and exercise uses known services, and answers match the maths', () => {
    const walk = (node: { kind: string; service?: string; items?: unknown[] }): void => {
      if (node.kind === 'service') expect(services.has(node.service!), node.service).toBe(true)
      for (const item of node.items ?? []) walk(item as typeof node)
    }
    for (const preset of slaPresets) walk(preset.tree)
    for (const exercise of slaExercises) {
      if (exercise.kind === 'percent') {
        walk(exercise.tree!)
        expect(
          Math.abs(availability(exercise.tree!, services) * 100 - exercise.answer),
          exercise.id,
        ).toBeLessThan(exercise.tolerance)
      } else {
        expect(Math.abs(downtimeMinutes(0.999, 'month') - exercise.answer)).toBeLessThan(
          exercise.tolerance,
        )
      }
    }
  })
})
