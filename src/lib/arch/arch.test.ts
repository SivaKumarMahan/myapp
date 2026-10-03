import { describe, expect, it } from 'vitest'
import { archScenarios, archServiceById, archServices } from '../../content/arch'
import { addNode, connect, edgePoints, removeNode, type Design } from './model'
import { missingVersus, requirementMet, review } from './rules'
import { designToSvg } from './export'

const empty = (): Design => ({ id: 'd', name: 'Test', nodes: [], edges: [], updatedAt: 0 })
const type = (id: string) => archServiceById.get(id)!

function build(...types: string[]) {
  let design = empty()
  const ids: string[] = []
  for (const id of types) {
    const result = addNode(design, type(id))
    design = result.design
    ids.push(result.id)
  }
  return { design, ids }
}

describe('architecture model', () => {
  it('adds nodes in free spots, connects once and removes with edges', () => {
    const { ids, design: start } = build('users', 'appservice')
    expect(start.nodes[0].x).not.toBe(start.nodes[1].x)
    let design = connect(start, ids[0], ids[1])
    design = connect(design, ids[1], ids[0])
    expect(design.edges).toHaveLength(1)
    design = removeNode(design, ids[1])
    expect(design.edges).toHaveLength(0)
    const points = edgePoints(design.nodes[0], { ...design.nodes[0], x: design.nodes[0].x + 400 })
    expect(points.end.x - points.start.x).toBe(400 - 150)
  })
})

describe('review rules', () => {
  it('flags the classic mistakes on a naive design', () => {
    const { ids, design: start } = build('users', 'vm', 'sql')
    const design = connect(connect(start, ids[0], ids[1]), ids[1], ids[2])
    const rules = new Set(review(design, archServiceById).map((finding) => finding.rule))
    for (const rule of [
      'waf',
      'private-endpoint',
      'secrets',
      'monitoring',
      'backup',
      'single-region',
      'single-instance',
    ])
      expect(rules, rule).toContain(rule)
  })

  it('flags a database exposed to users and a WAF-less Front Door', () => {
    const { ids, design: start } = build('users', 'sql', 'frontdoor')
    const design = connect(connect(start, ids[0], ids[1]), ids[0], ids[2])
    const findings = review(design, archServiceById)
    expect(findings.some((finding) => finding.rule === 'data-public')).toBe(true)
    expect(findings.some((finding) => finding.rule === 'waf' && finding.nodes[0] === ids[2])).toBe(
      true,
    )
  })

  it.each(archScenarios.map((scenario) => [scenario.id, scenario] as const))(
    'the %s model answer is clean and meets every requirement',
    (_, scenario) => {
      const findings = review(scenario.model, archServiceById).filter(
        (finding) => finding.severity !== 'info' && !scenario.accepts.includes(finding.rule),
      )
      expect(findings.map((finding) => finding.title)).toEqual([])
      expect(
        review(scenario.model, archServiceById).filter((finding) => finding.severity === 'info'),
      ).toEqual([])
      for (const requirement of scenario.requirements)
        expect(requirementMet(requirement, scenario.model, archServiceById), requirement.text).toBe(
          true,
        )
      for (const node of scenario.model.nodes)
        expect(archServiceById.has(node.type), node.type).toBe(true)
      expect(missingVersus(scenario.model, scenario.model, archServiceById)).toEqual([])
    },
  )

  it('an empty design meets no scenario', () => {
    for (const scenario of archScenarios)
      expect(
        scenario.requirements.every((requirement) =>
          requirementMet(requirement, empty(), archServiceById),
        ),
      ).toBe(false)
  })
})

describe('export', () => {
  it('produces standalone SVG with every label and no CSS variables', () => {
    const svg = designToSvg(archScenarios[0].model, archServiceById)
    expect(svg.startsWith('<svg')).toBe(true)
    expect(svg).not.toContain('var(--')
    for (const node of archScenarios[0].model.nodes)
      expect(svg).toContain(node.label.replace(/&/g, '&amp;'))
    const doc = new DOMParser().parseFromString(svg, 'image/svg+xml')
    expect(doc.getElementsByTagName('parsererror')).toHaveLength(0)
    expect(archServices.length).toBeGreaterThanOrEqual(12)
  })
})

describe('saved designs in the progress record', () => {
  it('migrates soundly and merges by most recent edit', async () => {
    const { createEmptyState, mergeStates, migrate } = await import('../storage')
    const migrated = migrate({
      topics: {},
      designs: {
        d1: {
          id: 'd1',
          name: 'Mine',
          updatedAt: 5,
          nodes: [
            { id: 'a', type: 'vm', label: 'VM', x: 10, y: 'bad', props: { backup: true, bad: {} } },
            'junk',
          ],
          edges: [{ id: 'e', from: 'a', to: 'missing' }],
        },
        wrong: { id: 'other', nodes: [] },
      },
    })
    expect(Object.keys(migrated.designs)).toEqual(['d1'])
    expect(migrated.designs.d1.nodes).toEqual([
      { id: 'a', type: 'vm', label: 'VM', x: 10, y: 0, props: { backup: true } },
    ])
    expect(migrated.designs.d1.edges).toEqual([])

    const older = { ...migrated.designs.d1, name: 'Old', updatedAt: 1 }
    const merged = mergeStates({ ...createEmptyState(), designs: { d1: older } }, migrated)
    expect(merged.designs.d1.name).toBe('Mine')
  })
})
