// @vitest-environment node
import { spawnSync } from 'node:child_process'
import { describe, expect, it } from 'vitest'
import { fixtureNames, pythonChallenges } from './index'

const python = spawnSync('python3', ['-c', 'import pandas'], { encoding: 'utf8' })
const canRunCPython = python.status === 0

describe('Python challenge content', () => {
  it('has 20 challenges with unique ids', () => {
    expect(pythonChallenges).toHaveLength(20)
    expect(new Set(pythonChallenges.map((challenge) => challenge.id)).size).toBe(20)
  })

  it.each(pythonChallenges.map((challenge) => [challenge.id, challenge] as const))(
    '%s: is complete',
    (_id, challenge) => {
      expect(challenge.hints.length).toBeGreaterThan(0)
      expect(challenge.tests.length).toBeGreaterThanOrEqual(2)
      expect(challenge.tests.some((test) => !test.hidden)).toBe(true)
      expect(challenge.tests.some((test) => test.hidden)).toBe(true)
      // `expected` is filled in by `npm run py:expected`.
      for (const test of challenge.tests) expect(test).toHaveProperty('expected')
      const definesFunction = new RegExp(`def ${challenge.functionName}\\(`)
      expect(challenge.starter).toMatch(definesFunction)
      expect(challenge.solution).toMatch(definesFunction)
    },
  )

  it('covers the DevOps scripting topics', () => {
    const all = pythonChallenges
      .map((challenge) => `${challenge.solution}\n${challenge.fixtures}`)
      .join('\n')
    for (const feature of ['ipaddress', 'json.loads', 'pandas', 'Counter', 'sleep(']) {
      expect(all).toContain(feature)
    }
    expect(new Set(pythonChallenges.map((challenge) => challenge.topic))).toEqual(
      new Set(['logs', 'azure-cli', 'config', 'networking', 'resilience', 'data']),
    )
  })

  it('lists the sample data a challenge provides, but not internal helpers', () => {
    const names = fixtureNames(
      'SAMPLE_LOG = "x"\nEMPTY = ""\ndef flaky(n):\n    pass\ndef __raises(f):\n    pass\nlower = 1',
    )
    expect(names).toEqual(['SAMPLE_LOG', 'EMPTY', 'flaky'])
  })

  // The real check: every stored answer is what the reference solution returns.
  it.runIf(canRunCPython)('stored expected values match the reference solutions (CPython)', () => {
    const result = spawnSync('python3', ['scripts/build-python-expected.py', '--check'], {
      encoding: 'utf8',
    })
    expect(result.stderr).toBe('')
    expect(result.status).toBe(0)
  })
})
