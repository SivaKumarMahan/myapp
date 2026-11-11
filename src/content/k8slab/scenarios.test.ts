// @vitest-environment node
import { describe, expect, it } from 'vitest'
import { checkScenario } from '../../lib/k8slab/checks'
import { K8sLab } from '../../lib/k8slab/lab'
import { interviewQuestionById } from '../interview'
import { allK8sKeys, k8sScenarios, type K8sScenario } from '.'

/**
 * The lab's self-test: every scenario starts broken, its reference fix
 * passes every check, and its "tempting wrong fix" does not.
 * Run one with K8S_ONLY=id[,id] npx vitest run src/content/k8slab
 */
const only = process.env.K8S_ONLY?.split(',')
const list = only ? k8sScenarios.filter((scenario) => only.includes(scenario.id)) : k8sScenarios

const MARKERS = /`|\*\*/g
const balanced = (text: string) => {
  const ticks = (text.match(/`/g) ?? []).length
  const bold = (text.match(/\*\*/g) ?? []).length
  return ticks % 2 === 0 && bold % 2 === 0
}

function run(
  lab: K8sLab,
  fix: { commands: string[]; files?: { name: string; content: string }[] },
) {
  for (const file of fix.files ?? []) lab.writeFile(file.name, file.content)
  return fix.commands.map((command) => ({ command, result: lab.run(command) }))
}

describe('Kubernetes lab content', () => {
  it('has 15 scenarios with unique ids, three hints and one right root cause each', () => {
    expect(k8sScenarios).toHaveLength(15)
    expect(new Set(k8sScenarios.map((scenario) => scenario.id)).size).toBe(15)
    expect(allK8sKeys.every((key) => key.startsWith('k8s:'))).toBe(true)
    for (const scenario of k8sScenarios) {
      expect(scenario.id, scenario.id).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/)
      expect(scenario.hints).toHaveLength(3)
      expect(scenario.solution.commands.length, scenario.id).toBeGreaterThan(0)
      expect(scenario.explanation.length, scenario.id).toBeGreaterThan(1)
      expect(scenario.checks.length, scenario.id).toBeGreaterThan(1)
      const options = scenario.rootCause.options
      expect(options.length, scenario.id).toBeGreaterThanOrEqual(3)
      expect(options.length, scenario.id).toBeLessThanOrEqual(4)
      expect(
        options.filter((option) => option.correct),
        scenario.id,
      ).toHaveLength(1)
      expect(new Set(options.map((option) => option.text)).size).toBe(options.length)
      expect(
        scenario.tags.every((tag) => tag === tag.toLowerCase()),
        scenario.id,
      ).toBe(true)
    }
  })

  it('links only to interview questions that exist', () => {
    for (const scenario of k8sScenarios) {
      expect(scenario.related.length, scenario.id).toBeGreaterThan(0)
      for (const id of scenario.related)
        expect(interviewQuestionById.has(id), `${scenario.id} → ${id}`).toBe(true)
    }
  })

  it('uses only the two inline markers, balanced, and no placeholder text', () => {
    for (const scenario of k8sScenarios) {
      const texts = [
        scenario.story,
        scenario.task,
        scenario.symptom,
        scenario.lesson,
        scenario.followUp,
        ...scenario.hints,
        ...scenario.explanation.map((step) => step.note),
        ...scenario.rootCause.options.flatMap((option) => [option.text, option.why]),
      ]
      for (const text of texts) {
        expect(balanced(text), `${scenario.id}: ${text}`).toBe(true)
        expect(text.replace(MARKERS, ''), scenario.id).not.toMatch(
          /TODO|TBD|FIXME|lorem ipsum|coming soon/i,
        )
      }
    }
  })
})

describe.each(list.map((scenario) => [scenario.id, scenario] as const))(
  '%s',
  (_, scenario: K8sScenario) => {
    it('starts broken', () => {
      const lab = K8sLab.create(scenario)
      expect(checkScenario(scenario, lab.cluster).passed).toBe(false)
    })

    it('the reference fix runs cleanly and passes every check', () => {
      const lab = K8sLab.create(scenario)
      const errors = run(lab, scenario.solution)
        .filter(({ result }) => result.exitCode !== 0)
        .map(({ command, result }) => `${command}: ${result.stderr}`)
      expect(errors).toEqual([])
      const report = checkScenario(scenario, lab.cluster)
      const failures = report.results
        .filter((result) => !result.passed)
        .map((result) => `${result.label}: ${result.messages.join(' | ')}`)
      expect(failures).toEqual([])
    })

    it('the tempting wrong fix does not pass', () => {
      const lab = K8sLab.create(scenario)
      run(lab, scenario.wrongFix)
      expect(checkScenario(scenario, lab.cluster).passed).toBe(false)
    })
  },
)
