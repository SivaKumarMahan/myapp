import { describe, expect, it, vi } from 'vitest'
import { buildIndex } from './palette-index'
import { createEmptyState, toExportEnvelope, type ProgressState } from './storage'
import { GIST_DESCRIPTION, GIST_FILE, mergeNewest, syncWithGist } from './sync'

describe('command palette index', () => {
  const index = buildIndex()

  it('covers every kind of thing', () => {
    const kinds = new Set(index.items.map((item) => item.kind))
    for (const kind of [
      'page',
      'lesson',
      'question',
      'command',
      'challenge',
      'lab',
      'term',
      'role',
    ])
      expect(kinds).toContain(kind)
    expect(index.items.length).toBeGreaterThan(2500)
    expect(new Set(index.items.map((item) => item.id)).size).toBe(index.items.length)
  })

  it('finds things by fuzzy and partial words', () => {
    expect(index.search('settings')[0].to).toBe('/settings')
    expect(index.search('rbac')[0].kind).toMatch(/lesson|term|page/)
    expect(index.search('kubernets crashloop').some((item) => item.kind === 'question')).toBe(true)
    expect(
      index
        .search('privat endpoint')
        .some((item) => item.to.startsWith('/glossary#private-endpoint')),
    ).toBe(true)
    expect(index.search('az group create').some((item) => item.kind === 'command')).toBe(true)
    expect(index.search('')).toEqual([])
  })
})

const withState = (change: Partial<ProgressState>, updatedAt = 1): ProgressState => ({
  ...createEmptyState(1),
  ...change,
  updatedAt,
})

describe('sync merge: newest per item', () => {
  it('keeps the newer copy of each item and counts both directions', () => {
    const local = withState(
      {
        interview: {
          a: { status: 'known', updatedAt: 10 },
          b: { status: 'review', updatedAt: 50 },
        },
        srs: {},
        topics: { t1: { status: 'completed', completedAt: 5 } },
      },
      100,
    )
    const remote = withState(
      {
        interview: {
          a: { status: 'review', updatedAt: 20 },
          b: { status: 'known', updatedAt: 40 },
          c: { status: 'known', updatedAt: 1 },
        },
        topics: { t1: { status: 'in-progress', lastVisitedAt: 9 } },
        settings: { ...createEmptyState().settings, newCardsPerDay: 7 },
      },
      200,
    )
    const report = mergeNewest(local, remote)
    expect(report.state.interview.a.status).toBe('review')
    expect(report.state.interview.b.status).toBe('review')
    expect(report.state.interview.c.status).toBe('known')
    expect(report.state.topics.t1.status).toBe('in-progress')
    expect(report.state.settings.newCardsPerDay).toBe(7)
    expect(report.incomingNewer).toBe(2)
    expect(report.localNewer).toBe(1)
  })
})

function fakeGitHub(initial?: ProgressState) {
  const gists: Record<string, { description: string; files: Record<string, { content: string }> }> =
    {}
  if (initial)
    gists.g1 = {
      description: GIST_DESCRIPTION,
      files: { [GIST_FILE]: { content: JSON.stringify(toExportEnvelope(initial)) } },
    }
  const calls: string[] = []
  const fetcher = vi.fn(async (url: string, init?: RequestInit) => {
    const method = init?.method ?? 'GET'
    calls.push(`${method} ${url.replace('https://api.github.com', '')}`)
    if ((init?.headers as Record<string, string>)?.Authorization !== 'Bearer good')
      return new Response('{}', { status: 401 })
    if (url.endsWith('/gists?per_page=100'))
      return Response.json(Object.entries(gists).map(([id, gist]) => ({ id, ...gist })))
    const match = /\/gists\/(\w+)$/.exec(url)
    if (method === 'POST') {
      const body = JSON.parse(String(init?.body))
      gists.new1 = { description: body.description, files: body.files }
      return Response.json({ id: 'new1', ...gists.new1 })
    }
    if (match && method === 'PATCH') {
      gists[match[1]].files = { ...gists[match[1]].files, ...JSON.parse(String(init?.body)).files }
      return Response.json({ id: match[1], ...gists[match[1]] })
    }
    if (match)
      return gists[match[1]]
        ? Response.json({ id: match[1], ...gists[match[1]] })
        : new Response('{}', { status: 404 })
    return new Response('{}', { status: 400 })
  })
  return { gists, calls, fetcher: fetcher as unknown as typeof fetch }
}

describe('gist sync', () => {
  it('creates a secret gist the first time', async () => {
    const github = fakeGitHub()
    const result = await syncWithGist(
      withState({ skills: { helm: 5 } }),
      { token: 'good' },
      github.fetcher,
    )
    expect(result.created).toBe(true)
    expect(github.calls).toContain('POST /gists')
    expect(JSON.parse(github.gists.new1.files[GIST_FILE].content).state.skills.helm).toBe(5)
  })

  it('finds the existing gist on a new device, merges and pushes back', async () => {
    const github = fakeGitHub(withState({ skills: { terraform: 9 } }, 50))
    const result = await syncWithGist(
      withState({ skills: { helm: 5 } }, 10),
      { token: 'good' },
      github.fetcher,
    )
    expect(result.gistId).toBe('g1')
    expect(result.created).toBe(false)
    expect(Object.keys(result.state.skills).sort()).toEqual(['helm', 'terraform'])
    expect(github.calls).toContain('PATCH /gists/g1')
  })

  it('explains a bad token', async () => {
    await expect(
      syncWithGist(createEmptyState(), { token: 'bad' }, fakeGitHub().fetcher),
    ).rejects.toThrow(/gist scope/)
  })
})
