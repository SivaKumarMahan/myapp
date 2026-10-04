// @vitest-environment node
import { describe, expect, it } from 'vitest'
import { checkChallenge, type Attempt } from '../../lib/linuxlab/checks'
import { LinuxLab } from '../../lib/linuxlab/lab'
import { linuxChallenges, type LabChallenge } from '.'

/**
 * The lab's self-test: every reference solution must pass its own checks on
 * the main seed AND the hidden variant, and run without shell errors; a
 * do-nothing answer and (for bug fixes) the buggy starter must fail.
 * Run one challenge with LAB_ONLY=id[,id] npx vitest run src/content/linuxlab
 */
const only = process.env.LAB_ONLY?.split(',')
const list = only
  ? linuxChallenges.filter((challenge) => only.includes(challenge.id))
  : linuxChallenges

/** Errors that mean the reference itself is broken (or uses something the lab doesn't support). */
const SHELL_ERROR =
  /command not found|unrecognized option|invalid option|syntax error|bad substitution|unbound variable|bash: : |\(lab\)|not simulated/

const answer = (challenge: LabChallenge, text: string): Attempt =>
  challenge.type === 'command' ? { steps: [{ kind: 'run', command: text }] } : { script: text }

describe('Linux lab content', () => {
  it('has 62 challenges with unique ids and three hints each', () => {
    expect(linuxChallenges).toHaveLength(62)
    expect(new Set(linuxChallenges.map((challenge) => challenge.id)).size).toBe(62)
    for (const challenge of linuxChallenges) {
      expect(challenge.hints).toHaveLength(3)
      expect(challenge.solutions.length).toBeGreaterThan(0)
      expect(challenge.type === 'command' || challenge.script, challenge.id).toBeTruthy()
      expect(challenge.type !== 'bugfix' || challenge.starter, challenge.id).toBeTruthy()
    }
  })
})

describe.each(list.map((challenge) => [challenge.id, challenge] as const))('%s', (_, challenge) => {
  it.each(challenge.solutions.map((solution, index) => [index + 1, solution] as const))(
    'reference solution %i passes on both seeds',
    async (_, solution) => {
      const report = await checkChallenge(challenge, answer(challenge, solution))
      const failures = report.results
        .filter((result) => !result.passed)
        .map((result) => `${result.label}: ${result.messages.join(' | ')}`)
      expect(failures).toEqual([])
    },
    30_000,
  )

  it('reference solution runs without shell errors', async () => {
    const problems: string[] = []
    for (const variant of ['main', 'hidden'] as const) {
      const cases = challenge.script?.cases ?? [{ label: 'command', args: [] }]
      for (const testCase of cases) {
        const lab = await LinuxLab.create(variant)
        let command = challenge.solutions[0]
        if (challenge.script) {
          await lab.writeFile(`/root/${challenge.script.name}`, challenge.solutions[0])
          const args = Array.isArray(testCase.args) ? testCase.args : testCase.args[variant]
          command = `bash /root/${challenge.script.name} ${args.map((arg) => `'${arg}'`).join(' ')}`
        }
        const result = await lab.run(command)
        if (SHELL_ERROR.test(result.stderr) || result.timedOut)
          problems.push(`${variant} / ${testCase.label}: ${result.stderr.trim()}`)
      }
    }
    expect(problems).toEqual([])
  }, 30_000)

  it('a do-nothing answer fails', async () => {
    const report = await checkChallenge(
      challenge,
      answer(challenge, challenge.type === 'command' ? 'true' : '#!/bin/bash\ntrue'),
    )
    expect(report.passed).toBe(false)
  }, 30_000)

  if (challenge.starter) {
    it('the buggy starter fails', async () => {
      expect(
        (await checkChallenge(challenge, { script: challenge.starter as string })).passed,
      ).toBe(false)
    }, 30_000)
  }
})
