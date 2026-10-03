import { describe, expect, it } from 'vitest'
import { allInterviewQuestions, interviewQuestionById } from '../content/interview'
import behavioural from '../content/interview/behavioural.json'
import { enriched } from './bot/enrich'
import {
  bestScore,
  incidentScenarios,
  isCorrectEnd,
  scoreRun,
  shortestSteps,
  type LabStep,
} from './incident'
import {
  DEFAULT_SETTINGS,
  followUpsFor,
  formatClock,
  genericFollowUps,
  pickQuestions,
} from './mock-interview'
import { companyPacks, findPack, knownTags, tagPacks } from './packs'
import { recordingSupported } from './recordings'
import { createEmptyState, mergeStates, migrate } from './storage'

/** Walks the best-scoring path to a correct ending. */
function bestPath(id: string): { steps: LabStep[]; end: string } {
  const scenario = incidentScenarios.find((entry) => entry.id === id)!
  const steps: LabStep[] = []
  let node = scenario.start
  const seen = new Set<string>()
  while (!scenario.nodes[node].end && !seen.has(node)) {
    seen.add(node)
    const choices = scenario.nodes[node].choices!
    const scored = choices.map(
      (choice) => choice.score + bestScore(scenario, choice.next, new Set(seen)),
    )
    const pick = choices[scored.indexOf(Math.max(...scored))]
    steps.push({ node, label: pick.label, score: pick.score, feedback: pick.feedback })
    node = pick.next
  }
  return { steps, end: node }
}

describe('incident labs', () => {
  it('has ten scenarios, each with a reachable correct root cause', () => {
    expect(incidentScenarios).toHaveLength(10)
    for (const scenario of incidentScenarios) {
      expect(Number.isFinite(shortestSteps(scenario)), scenario.id).toBe(true)
      expect(bestScore(scenario), scenario.id).toBeGreaterThan(0)
      expect(Object.values(scenario.nodes).some(isCorrectEnd), scenario.id).toBe(true)
      expect(interviewQuestionById.size).toBeGreaterThan(0)
    }
  })

  it.each(incidentScenarios.map((scenario) => scenario.id))(
    'the best path through %s scores full marks',
    (id) => {
      const scenario = incidentScenarios.find((entry) => entry.id === id)!
      const { steps, end } = bestPath(id)
      const result = scoreRun(scenario, steps, end)
      expect(result.correct).toBe(true)
      expect(result.points).toBe(result.best)
      expect(result.percent).toBeGreaterThanOrEqual(90)
    },
  )

  it('a wrong conclusion scores low however good the steps', () => {
    const scenario = incidentScenarios.find((entry) => entry.id === 'kv-reference-rbac-switch')!
    const steps: LabStep[] = [
      { node: 'n1', label: 'status', score: 2, feedback: '' },
      { node: 'n2', label: 'recreate', score: -2, feedback: '' },
    ]
    const result = scoreRun(scenario, steps, 'wrong-policy')
    expect(result.correct).toBe(false)
    expect(result.percent).toBeLessThan(40)
  })
})

describe('prep packs', () => {
  it('turns real-round topics into company packs', () => {
    const packs = companyPacks()
    expect(packs.length).toBeGreaterThanOrEqual(5)
    expect(packs.find((pack) => pack.key === 'company:rounds-deloitte')?.name).toMatch(/Deloitte/)
  })

  it('builds packs from your tags', () => {
    const [first, second] = allInterviewQuestions.map((entry) => entry.question.id)
    const state = {
      ...createEmptyState(),
      questionTags: { [first]: ['Contoso', 'Round 2'], [second]: ['Contoso'], ghost: ['Contoso'] },
    }
    const packs = tagPacks(state)
    expect(packs.map((pack) => pack.name)).toEqual(['Contoso', 'Round 2'])
    expect(findPack('tag:Contoso', state)?.questionIds).toEqual([first, second])
    expect(knownTags(state)[0]).toBe('Contoso')
  })
})

describe('mock interview', () => {
  it('picks answerable questions matching the settings', () => {
    const state = createEmptyState()
    const ids = pickQuestions(
      { ...DEFAULT_SETTINGS, level: 'senior', topics: ['kubernetes'], count: 4 },
      state,
      () => 0.3,
    )
    expect(ids).toHaveLength(4)
    for (const id of ids) {
      const entry = interviewQuestionById.get(id)!
      expect(entry.topic.id).toBe('kubernetes')
      expect(entry.question.level).toBe('advanced')
      expect(['open', 'scenario']).toContain(entry.question.kind)
    }
    const pack = pickQuestions(
      { ...DEFAULT_SETTINGS, pack: 'company:rounds-atc', count: 50 },
      state,
    )
    expect(pack.every((id) => interviewQuestionById.get(id)?.topic.id === 'rounds-atc')).toBe(true)
  })

  it('mixes the question’s own follow-ups with generic probes', async () => {
    const question = (await enriched('itv-aznet-1'))!
    const two = followUpsFor(question, 2, () => 0)
    expect(two).toHaveLength(2)
    expect(two[0].question).toBe(question.followUps[0].question)
    expect(genericFollowUps.map((followUp) => followUp.question)).toContain(two[1].question)
    expect(followUpsFor(question, 0)).toEqual([])
    expect(formatClock(125)).toBe('2:05')
  })

  it('reports recording as unsupported where MediaRecorder is missing', () => {
    expect(recordingSupported()).toBe(false)
  })
})

describe('STAR stories and tags in the progress record', () => {
  it('migrates, cleans and merges', () => {
    const migrated = migrate({
      topics: {},
      stories: {
        s1: {
          id: 's1',
          title: 'Outage',
          action: 'I rolled back',
          questions: ['incident', 3],
          updatedAt: 9,
        },
        bad: { id: 'x' },
      },
      questionTags: { q1: [' Contoso ', 'Contoso', '', 7], q2: [] },
    })
    expect(Object.keys(migrated.stories)).toEqual(['s1'])
    expect(migrated.stories.s1.questions).toEqual(['incident'])
    expect(migrated.stories.s1.situation).toBe('')
    expect(migrated.questionTags).toEqual({ q1: ['Contoso'] })
    const merged = mergeStates(
      {
        ...createEmptyState(),
        questionTags: { q1: ['A'] },
        stories: { s1: { ...migrated.stories.s1, title: 'Old', updatedAt: 1 } },
      },
      migrated,
    )
    expect(merged.questionTags.q1.sort()).toEqual(['A', 'Contoso'])
    expect(merged.stories.s1.title).toBe('Outage')
    expect((behavioural as { questions: unknown[] }).questions).toHaveLength(20)
  })
})
