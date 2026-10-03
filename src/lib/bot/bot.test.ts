import Ajv from 'ajv'
import { describe, expect, it } from 'vitest'
import { interviewQuestionById } from '../../content/interview'
import schema from '../../content/bot/enriched.schema.json'
import networking from '../../content/bot/topics/azure-networking.json'
import identity from '../../content/bot/topics/azure-identity.json'
import { createEmptyState } from '../storage'
import { StudyBot, type BotReply, type Block } from './engine'
import { deriveEnriched, enriched } from './enrich'
import { detect } from './intents'
import { scenarios } from './modes/scenario'
import { ratingFor, scoreAnswer, scoreSelf } from './scoring'
import { keywordSearch } from './search'
import { fuzzyEqual, mentions, stem, tokens } from './text'
import type { KeyPoint } from './types'

const points: KeyPoint[] = [
  {
    point: 'Private endpoints need private DNS',
    keywords: ['private dns zone', 'privatelink'],
    weight: 3,
  },
  { point: 'Network security groups filter traffic', keywords: ['nsg'], weight: 2 },
  { point: 'Peering is not transitive', keywords: ['non-transitive', 'not transitive'], weight: 1 },
]

describe('bot text matching', () => {
  it('stems word forms to the same root', () => {
    expect(stem('deployments')).toBe(stem('deployment'))
    expect(stem('replicated')).toBe(stem('replicating'))
  })

  it('allows small typos on longer words only', () => {
    expect(fuzzyEqual('kubernetes', 'kubernets')).toBe(true)
    expect(fuzzyEqual('subnet', 'subnt')).toBe(true)
    expect(fuzzyEqual('vnet', 'vent')).toBe(false)
  })

  it('matches phrases with a small gap and synonyms', () => {
    expect(mentions(tokens('you need a private DNS zone for it'), 'private dns zone')).toBe(true)
    expect(mentions(tokens('it uses a private Azure DNS zone'), 'private dns zone')).toBe(true)
    expect(mentions(tokens('the network security group blocks it'), 'nsg')).toBe(true)
    expect(mentions(tokens('nothing relevant here'), 'nsg')).toBe(false)
  })
})

describe('answer scoring', () => {
  it('weights the covered key points', () => {
    const result = scoreAnswer('Add a privatelink private DNS zone and an NSG.', points)
    expect(result.score).toBe(83)
    expect(result.missed.map((point) => point.point)).toEqual(['Peering is not transitive'])
    expect(result.suggested).toBe(3)
  })

  it('tolerates typos and word forms', () => {
    const result = scoreAnswer(
      'privat dns zones, network security groups, peerings are not transitive',
      points,
    )
    expect(result.score).toBe(100)
    expect(result.suggested).toBe(4)
  })

  it('flags a common mistake and caps the rating at Hard', () => {
    const result = scoreAnswer(
      'Peering is transitive so the private dns zone and nsg are enough',
      points,
      [
        {
          mistake: 'Peering is transitive',
          triggers: ['peering is transitive'],
          correction: 'It is not.',
        },
      ],
    )
    expect(result.mistakes).toHaveLength(1)
    expect(result.suggested).toBe(2)
  })

  it('rates an empty answer Again', () => {
    expect(scoreAnswer('', points).suggested).toBe(1)
    expect(ratingFor(100, 0, 0)).toBe(1)
  })

  it('self-scores from ticked points', () => {
    const result = scoreSelf(points, [0, 1])
    expect(result.score).toBe(83)
    expect(result.matched).toHaveLength(2)
  })
})

describe('intent rules', () => {
  it('reads slash commands', () => {
    expect(detect('/mock aks senior', false)).toEqual({
      kind: 'mock',
      due: false,
      level: 'senior',
      topic: 'aks',
    })
    expect(detect('/rate 3', false)).toEqual({ kind: 'rate', rating: 3 })
    expect(detect('/self 0,2', false)).toEqual({ kind: 'self', points: [0, 2] })
    expect(detect('/coach weak', false)).toEqual({ kind: 'coach', focus: 'weak' })
  })

  it('understands plain requests', () => {
    expect(detect('interview me on networking', false)).toMatchObject({
      kind: 'mock',
      topic: 'networking',
    })
    expect(detect('what should I study today?', false)).toEqual({ kind: 'coach', focus: 'today' })
    expect(detect('explain it more simply', false)).toEqual({ kind: 'tutor', action: 'simpler' })
    expect(detect('give me a hint', true)).toEqual({ kind: 'tutor', action: 'hint' })
  })

  it('treats free text as an answer when one is expected, else as a search', () => {
    expect(detect('NSGs are stateful', true)).toEqual({ kind: 'answer', text: 'NSGs are stateful' })
    expect(detect('NSGs are stateful', false)).toEqual({
      kind: 'search',
      query: 'NSGs are stateful',
    })
  })
})

describe('bot content', () => {
  const validate = new Ajv({ allErrors: true }).compile(schema)

  it.each([
    ['azure-networking', networking],
    ['azure-identity', identity],
  ])('%s overlay matches the schema and the question bank', (topic, file) => {
    expect(validate(file), JSON.stringify(validate.errors)).toBe(true)
    expect(file.topic).toBe(topic)
    for (const question of file.questions) {
      expect(interviewQuestionById.has(question.id), question.id).toBe(true)
      for (const related of question.related ?? [])
        expect(interviewQuestionById.has(related), related).toBe(true)
    }
  })

  it('derives a usable record for every question in the bank', () => {
    for (const [id, entry] of interviewQuestionById) {
      const record = deriveEnriched(entry.question, entry.topic)
      expect(record.shortAnswer.length, id).toBeGreaterThan(10)
      expect(record.keyPoints.length, id).toBeGreaterThan(0)
      expect(record.hints, id).toHaveLength(3)
    }
  })

  it('merges a curated overlay over the derived record', async () => {
    const record = await enriched('itv-aznet-1')
    expect(record?.curated).toBe(true)
    expect(record?.followUps[0].shortAnswer).toBeTruthy()
  })

  it('every scenario choice leads to a node, and every node can reach a root cause', () => {
    for (const scenario of scenarios) {
      const ids = Object.keys(scenario.nodes)
      expect(scenario.nodes[scenario.start], scenario.id).toBeDefined()
      for (const id of ids) {
        const node = scenario.nodes[id]
        if (node.end) continue
        expect(node.choices?.length, `${scenario.id}: ${id}`).toBeGreaterThan(0)
        for (const choice of node.choices ?? [])
          expect(
            scenario.nodes[choice.next],
            `${scenario.id}: ${id} -> ${choice.next}`,
          ).toBeDefined()
      }
      // Every node is reachable from the start...
      const reached = new Set([scenario.start])
      const queue = [scenario.start]
      while (queue.length) {
        for (const choice of scenario.nodes[queue.shift() as string].choices ?? []) {
          if (!reached.has(choice.next)) {
            reached.add(choice.next)
            queue.push(choice.next)
          }
        }
      }
      expect([...reached].sort(), scenario.id).toEqual([...ids].sort())
      // ...and can still reach an ending (no trap loops).
      const canEnd = new Set(ids.filter((id) => scenario.nodes[id].end))
      for (let changed = true; changed;) {
        changed = false
        for (const id of ids) {
          if (
            !canEnd.has(id) &&
            scenario.nodes[id].choices?.some((choice) => canEnd.has(choice.next))
          ) {
            canEnd.add(id)
            changed = true
          }
        }
      }
      expect(canEnd.size, scenario.id).toBe(ids.length)
    }
  })

  it('keyword search finds questions by their wording', () => {
    expect(keywordSearch('private endpoint dns resolution', 3)[0].prompt.toLowerCase()).toMatch(
      /private/,
    )
  })
})

describe('study bot conversations', () => {
  const makeBot = () => {
    const ratings: [string, number][] = []
    const state = createEmptyState(1_700_000_000_000)
    const bot = new StudyBot({
      state: () => state,
      rate: (id, rating) => ratings.push([id, rating]),
      now: () => 1_700_000_000_000,
    })
    return { bot, ratings }
  }
  const blocks = (reply: BotReply, type: Block['type']) =>
    reply.messages.flatMap((message) => (message.block?.type === type ? [message.block] : []))
  const text = (reply: BotReply) => reply.messages.map((message) => message.text ?? '').join('\n')

  it('runs a mock interview: question, score, rating, follow-up, next, report', async () => {
    const { bot, ratings } = makeBot()
    const start = await bot.send('/mock azure-networking')
    expect(blocks(start, 'question')).toHaveLength(1)
    expect(bot.awaiting).toBe('mock-main')

    const current = bot.current
    expect(current).not.toBeNull()
    const scored = await bot.send(
      (current?.keyPoints ?? []).map((point) => point.keywords[0]).join(', '),
    )
    const score = blocks(scored, 'score')[0]
    expect(score?.type === 'score' && score.result.score).toBeGreaterThan(0)
    expect(scored.chips.some((chip) => chip.send.startsWith('/rate'))).toBe(true)

    await bot.send('/rate 3')
    expect(ratings[0][0]).toMatch(/^itv:itv-aznet-/)
    while (bot.mockRun) await bot.send('/skip')
    expect(bot.mockRun).toBeNull()
  })

  it('stops a mock interview with a report', async () => {
    const { bot } = makeBot()
    await bot.send('/mock identity')
    await bot.send('Managed identities avoid secrets')
    const report = await bot.send('/stop')
    expect(blocks(report, 'report')).toHaveLength(1)
  })

  it('evaluates an answer and flags a mistake', async () => {
    const { bot } = makeBot()
    await bot.send('/evaluate vnet peering transitive')
    expect(bot.awaiting).toBe('evaluate')
    const reply = await bot.send('Peering is transitive, so spoke to spoke just works.')
    expect(blocks(reply, 'score')).toHaveLength(1)
  })

  it('tutors on the open question', async () => {
    const { bot } = makeBot()
    await bot.send('/open itv-aznet-1')
    expect(text(await bot.send('/hint'))).toMatch(/Hint 1 of 3/)
    expect(blocks(await bot.send('/analogy'), 'answer')).toHaveLength(1)
    expect(blocks(await bot.send('/related'), 'links')).toHaveLength(1)
  })

  it('falls back to search for anything it does not recognise', async () => {
    const { bot } = makeBot()
    const reply = await bot.send('how do I stop pods getting evicted')
    expect(blocks(reply, 'results')).toHaveLength(1)
  })

  it('plays a troubleshooting scenario to the root cause', async () => {
    const { bot } = makeBot()
    await bot.send(`/scenario ${scenarios[0].id}`)
    let reply: BotReply | null = null
    for (let step = 0; step < 20 && bot.scenarioRun; step += 1) reply = await bot.send('/choose 0')
    expect(bot.scenarioRun).toBeNull()
    expect(reply && text(reply) + JSON.stringify(blocks(reply, 'answer'))).toMatch(/Root cause/)
  })

  it('runs rapid-fire with a timer and rates automatically', async () => {
    const { bot, ratings } = makeBot()
    const start = await bot.send('/rapid')
    expect(blocks(start, 'timer')).toHaveLength(1)
    await bot.send('some words')
    await bot.send('/timeout')
    expect(ratings).toHaveLength(2)
    await bot.send('/stop')
    expect(bot.rapidRun).toBeNull()
  })

  it('coaches from progress', async () => {
    const { bot } = makeBot()
    const reply = await bot.send('/coach today')
    expect(text(reply)).toMatch(/Today's plan/)
  })
})
