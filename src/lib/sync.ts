import { mergeStates, migrate, toExportEnvelope, type ProgressState } from './storage'

/**
 * Sync between devices through a GitHub Gist.
 *
 * Merging takes the newest copy of each timestamped item (lesson status,
 * practice answers, interview recall, flashcards, mistakes, designs, stories,
 * skill ticks), the union of everything else, and the settings of whichever
 * record was saved last. Deletions are not tracked, so something removed on
 * one device can come back from another until both have it removed.
 */

export interface MergeReport {
  state: ProgressState
  /** Items where the incoming copy was newer and replaced the local one. */
  incomingNewer: number
  /** Items where the local copy was newer than the incoming one. */
  localNewer: number
}

type Stamped<T> = Record<string, T>

function newest<T>(
  local: Stamped<T>,
  incoming: Stamped<T>,
  stamp: (item: T) => number,
  report: MergeReport,
) {
  const out: Stamped<T> = { ...local }
  for (const [id, theirs] of Object.entries(incoming)) {
    const mine = out[id]
    if (!mine) {
      out[id] = theirs
      continue
    }
    const a = stamp(mine)
    const b = stamp(theirs)
    if (b > a) {
      out[id] = theirs
      report.incomingNewer += 1
    } else if (a > b) {
      report.localNewer += 1
    }
  }
  return out
}

export function mergeNewest(local: ProgressState, incoming: ProgressState): MergeReport {
  const report: MergeReport = { state: local, incomingNewer: 0, localNewer: 0 }
  // Unions and counters (activity, challenges, exams, tags, labs...) as the import merge does.
  const base = mergeStates(local, incoming)
  const incomingIsNewer = incoming.updatedAt > local.updatedAt
  report.state = {
    ...base,
    topics: newest(
      local.topics,
      incoming.topics,
      (t) => Math.max(t.lastVisitedAt ?? 0, t.completedAt ?? 0),
      report,
    ),
    questions: newest(local.questions, incoming.questions, (q) => q.lastAnsweredAt, report),
    interview: newest(local.interview, incoming.interview, (entry) => entry.updatedAt, report),
    srs: newest(local.srs, incoming.srs, (card) => card.lastReview, report),
    mistakes: newest(local.mistakes, incoming.mistakes, (entry) => entry.lastWrongAt, report),
    designs: newest(local.designs, incoming.designs, (design) => design.updatedAt, report),
    stories: newest(local.stories, incoming.stories, (story) => story.updatedAt, report),
    skills: newest(local.skills, incoming.skills, (at) => at, report),
    theme: incomingIsNewer ? incoming.theme : local.theme,
    settings: incomingIsNewer
      ? {
          ...incoming.settings,
          examDates: { ...local.settings.examDates, ...incoming.settings.examDates },
        }
      : {
          ...local.settings,
          examDates: { ...incoming.settings.examDates, ...local.settings.examDates },
        },
    updatedAt: Date.now(),
  }
  return report
}

/* ---------- GitHub Gist ---------- */

export const GIST_FILE = 'azure-learning-hub-progress.json'
export const GIST_DESCRIPTION = 'Azure Learning Hub progress (synced by the app)'
const API = 'https://api.github.com'

export interface SyncConfig {
  token: string
  gistId?: string
  lastSyncAt?: number
  /** Sync once each time the app opens. */
  auto?: boolean
}

const configKey = (owner: string) => `azure-learning-hub.gist-sync.${owner.toLowerCase()}`

/** The token lives only in this browser's localStorage - never in the progress record or its export. */
export function loadSyncConfig(owner: string): SyncConfig | null {
  try {
    const raw = window.localStorage.getItem(configKey(owner))
    if (!raw) return null
    const parsed = JSON.parse(raw) as SyncConfig
    return typeof parsed.token === 'string' && parsed.token ? parsed : null
  } catch {
    return null
  }
}

export function saveSyncConfig(owner: string, config: SyncConfig | null) {
  try {
    if (config) window.localStorage.setItem(configKey(owner), JSON.stringify(config))
    else window.localStorage.removeItem(configKey(owner))
  } catch {
    /* private mode: sync just is not remembered */
  }
}

type Fetch = typeof fetch

async function github<T>(
  fetcher: Fetch,
  token: string,
  path: string,
  init: RequestInit = {},
): Promise<T> {
  const response = await fetcher(`${API}${path}`, {
    ...init,
    headers: {
      Accept: 'application/vnd.github+json',
      Authorization: `Bearer ${token}`,
      'X-GitHub-Api-Version': '2022-11-28',
      ...(init.body ? { 'Content-Type': 'application/json' } : {}),
    },
  })
  if (response.status === 401)
    throw new Error(
      'GitHub rejected the token (401). Check it has the gist scope and has not expired.',
    )
  if (response.status === 404)
    throw new Error('Gist not found (404) - it may have been deleted, or the token cannot see it.')
  if (!response.ok) throw new Error(`GitHub returned ${response.status}.`)
  return (await response.json()) as T
}

interface GistFile {
  content?: string
  truncated?: boolean
  raw_url?: string
}
interface Gist {
  id: string
  description: string | null
  files: Record<string, GistFile | undefined>
  html_url?: string
}

async function readRemote(
  fetcher: Fetch,
  token: string,
  gistId: string,
): Promise<ProgressState | null> {
  const gist = await github<Gist>(fetcher, token, `/gists/${gistId}`)
  const file = gist.files[GIST_FILE]
  if (!file) return null
  let text = file.content ?? ''
  // The API inlines up to ~1 MB; bigger files must be fetched raw.
  if (file.truncated && file.raw_url) text = await (await fetcher(file.raw_url)).text()
  const parsed = JSON.parse(text) as { state?: unknown }
  return migrate(parsed.state ?? parsed)
}

/** Finds an existing sync gist on another device's first sync. */
async function findGist(fetcher: Fetch, token: string): Promise<string | undefined> {
  const gists = await github<Gist[]>(fetcher, token, '/gists?per_page=100')
  return gists.find((gist) => gist.description === GIST_DESCRIPTION && gist.files[GIST_FILE])?.id
}

export interface SyncResult {
  state: ProgressState
  gistId: string
  created: boolean
  incomingNewer: number
  localNewer: number
}

/**
 * Pull, merge (newest per item), push. Creates a secret gist the first time.
 * Secret gists are unlisted, not private: anyone with the URL can read them.
 */
export async function syncWithGist(
  local: ProgressState,
  config: SyncConfig,
  fetcher: Fetch = fetch,
): Promise<SyncResult> {
  let gistId = config.gistId ?? (await findGist(fetcher, config.token))
  let merged: MergeReport = { state: local, incomingNewer: 0, localNewer: 0 }
  if (gistId) {
    const remote = await readRemote(fetcher, config.token, gistId)
    if (remote) merged = mergeNewest(local, remote)
  }
  const content = JSON.stringify(toExportEnvelope(merged.state))
  let created = false
  if (gistId) {
    await github<Gist>(fetcher, config.token, `/gists/${gistId}`, {
      method: 'PATCH',
      body: JSON.stringify({ files: { [GIST_FILE]: { content } } }),
    })
  } else {
    const gist = await github<Gist>(fetcher, config.token, '/gists', {
      method: 'POST',
      body: JSON.stringify({
        description: GIST_DESCRIPTION,
        public: false,
        files: { [GIST_FILE]: { content } },
      }),
    })
    gistId = gist.id
    created = true
  }
  return {
    state: merged.state,
    gistId,
    created,
    incomingNewer: merged.incomingNewer,
    localNewer: merged.localNewer,
  }
}
