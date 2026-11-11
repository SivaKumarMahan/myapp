// @vitest-environment node
import { describe, expect, it } from 'vitest'
import { checkScenario, replay } from '../../lib/tflab/checks'
import { createEnv } from '../../lib/tflab/engine'
import { interviewQuestionById } from '../interview'
import { allTfKeys, sandboxSeed, tfKey, tfScenarioById, tfScenarios } from '.'

/**
 * The lab's self-test: every scenario starts broken, its reference solution
 * (and the alternative) passes, and every listed wrong fix fails.
 */

const failures = (report: ReturnType<typeof checkScenario>) =>
  report.results
    .filter((result) => !result.passed)
    .map((result) => `${result.label}: ${result.messages.join(' | ')}`)

describe('Terraform lab content', () => {
  it('has 13 scenarios with unique ids, three hints and one right answer each', () => {
    expect(tfScenarios).toHaveLength(13)
    expect(new Set(tfScenarios.map((scenario) => scenario.id)).size).toBe(13)
    expect(allTfKeys).toContain(tfKey('rename-moved'))
    expect(tfScenarioById.get('state-lock')?.category).toBe('State')
    for (const scenario of tfScenarios) {
      expect(scenario.hints, scenario.id).toHaveLength(3)
      expect(scenario.solution.length, scenario.id).toBeGreaterThan(0)
      expect(scenario.wrongFixes.length, scenario.id).toBeGreaterThan(0)
      expect(scenario.question.options.length, scenario.id).toBeGreaterThanOrEqual(3)
      expect(
        scenario.question.options.filter((option) => option.correct),
        scenario.id,
      ).toHaveLength(1)
      expect(scenario.related.length, scenario.id).toBeGreaterThan(0)
      for (const id of scenario.related)
        expect(interviewQuestionById.has(id), `${scenario.id}: ${id}`).toBe(true)
      expect(`${scenario.story} ${scenario.task}`).not.toMatch(/TODO|TBD|FIXME/)
    }
  })

  it('the sandbox starts with a clean plan', () => {
    const env = createEnv(sandboxSeed)
    const report = checkScenario(
      {
        ...tfScenarios[0],
        seed: sandboxSeed,
        expect: { state: env.state.resources.map((r) => r.addr) },
      },
      env,
    )
    expect(failures(report)).toEqual([])
  })
})

describe.each(tfScenarios.map((scenario) => [scenario.id, scenario] as const))(
  '%s',
  (_, scenario) => {
    it('starts broken', () => {
      expect(checkScenario(scenario, createEnv(scenario.seed)).passed).toBe(false)
    })

    it('the reference solution passes', () => {
      expect(failures(checkScenario(scenario, replay(scenario, scenario.solution)))).toEqual([])
    })

    if (scenario.alternative) {
      it('the alternative solution passes', () => {
        const alternative = scenario.alternative as NonNullable<typeof scenario.alternative>
        expect(failures(checkScenario(scenario, replay(scenario, alternative.steps)))).toEqual([])
      })
    }

    it.each(scenario.wrongFixes.map((fix) => [fix.label, fix] as const))(
      'wrong fix fails: %s',
      (_, fix) => {
        expect(checkScenario(scenario, replay(scenario, fix.steps)).passed).toBe(false)
      },
    )
  },
)
