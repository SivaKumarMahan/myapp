/**
 * Progress persistence.
 *
 * Everything one learner does is kept in a single versioned localStorage
 * record. Three rules drive the design:
 *
 * 1. An app update must never silently discard progress. `migrate()` only ever
 *    adds missing fields and keeps unknown ones, and a record that cannot be
 *    parsed is quarantined under a backup key rather than overwritten.
 * 2. No backend, so the record must also be exportable and importable as plain
 *    JSON.
 * 3. One record per signed-in address, so two people sharing a browser keep
 *    separate lessons, practice history and exam attempts. The address only
 *    picks the key - nothing is sent anywhere. See `progressKey()`.
 */

import { normalizeEmail, readSession } from './access'
import { AGAIN, GOOD, interviewCardId, schedule, type Rating, type SrsCard } from './srs'

/** The shared record, used when nobody is signed in. Also the key prefix. */
export const STORAGE_KEY = 'azure-learning-hub.progress'
export const BACKUP_KEY = 'azure-learning-hub.progress.corrupt-backup'
/** Which address, if any, has taken over the pre-sign-in shared record. */
export const CLAIMED_KEY = 'azure-learning-hub.progress.claimed-by'
/**
 * The theme, mirrored outside any one learner's record.
 *
 * The sign-in screen renders before anybody is identified, so it has no
 * progress record to read the preference from; this is what it uses instead.
 */
export const THEME_KEY = 'azure-learning-hub.theme'
/**
 * 2 added spaced repetition (`srs`, `newCardsByDay`), `mistakes` and
 * `settings`; 3 added `activity`, the daily goal and exam dates; 4 added
 * `challenges` for the playgrounds; 5 added `skills` (Roles & skills: My fit);
 * 6 added `designs` (architecture builder); 7 added `stories` (STAR builder) and
 * `questionTags` (company / round prep packs); 8 added `guidedLabs`.
 */
export const SCHEMA_VERSION = 8
export const DEFAULT_NEW_CARDS_PER_DAY = 20
export const DEFAULT_DAILY_GOAL: DailyGoal = { kind: 'questions', target: 20 }
/** About thirteen months: enough for a full calendar year plus the current week. */
export const ACTIVITY_DAYS_KEPT = 400

/**
 * Where one learner's record lives.
 *
 * Passing nothing uses whoever is signed in on this device; passing `null`
 * addresses the shared pre-sign-in record explicitly.
 */
export function progressKey(email?: string | null): string {
  const target = email === undefined ? readSession() : email
  return target ? `${STORAGE_KEY}.user.${normalizeEmail(target)}` : STORAGE_KEY
}

const backupKey = (email?: string | null): string => `${progressKey(email)}.corrupt-backup`

export type TopicStatus = 'not-started' | 'in-progress' | 'completed'
export type ThemePreference = 'light' | 'dark' | 'system'

export interface TopicProgress {
  status: TopicStatus
  lastVisitedAt?: number
  completedAt?: number
}

export interface QuestionProgress {
  /** Result of the most recent attempt. */
  lastCorrect: boolean
  attempts: number
  correctCount: number
  incorrectCount: number
  lastAnsweredAt: number
}

/**
 * Self-assessed recall for one interview question.
 *
 * Deliberately not scored like a quiz: you cannot auto-mark "explain how a
 * Deployment rolls out". The learner says whether they could answer it aloud,
 * and `review` drives the cross-topic revision queue.
 */
export type InterviewStatus = 'known' | 'review'

export interface InterviewProgress {
  status: InterviewStatus
  updatedAt: number
}

export interface ExamAnswerRecord {
  questionId: string
  domainId: string
  /** What the learner submitted: option ids, a command string, or checkpoint ids. */
  response: string[]
  earned: number
  total: number
  /** null for self-verified task questions that were left unconfirmed. */
  correct: boolean | null
}

export interface ExamAttempt {
  id: string
  courseId: string
  label: string
  startedAt: number
  submittedAt: number
  /** Seconds actually spent, which may be less than the allowance. */
  elapsedSeconds: number
  minutesAllowed: number
  earnedPoints: number
  totalPoints: number
  scorePercent: number
  passingScore: number
  passed: boolean
  byDomain: Record<string, { earned: number; total: number }>
  answers: ExamAnswerRecord[]
}

/**
 * A practice or mock-exam question you got wrong, kept until you answer it
 * correctly without guessing (or remove it yourself).
 */
export interface MistakeEntry {
  courseId: string
  /** Where it was most recently missed. */
  source: 'practice' | 'exam'
  count: number
  firstWrongAt: number
  lastWrongAt: number
}

/** What one local day of study added up to. */
export interface ActivityDay {
  /** Practice, exam and interview questions answered or rated. */
  questions: number
  /** Lessons marked complete. */
  lessons: number
  /** Minutes the app was open and in use. */
  minutes: number
}

/** One playground challenge (`sql:<id>`, and later `kql:`, `py:` ...). */
export interface ChallengeProgress {
  /** Times "Check" was pressed. */
  attempts: number
  /** Checks that failed - hints and the solution unlock from these. */
  failures: number
  /** When it was first solved. */
  solvedAt?: number
}

export interface DailyGoal {
  kind: 'questions' | 'minutes'
  target: number
}

export interface Settings {
  /** How many never-seen cards the Due today queue introduces per day. */
  newCardsPerDay: number
  /** Meeting it counts the day towards the study streak. */
  dailyGoal: DailyGoal
  /** course id -> exam date (YYYY-MM-DD). */
  examDates: Record<string, string>
}

export interface ProgressState {
  schemaVersion: number
  createdAt: number
  updatedAt: number
  theme: ThemePreference
  /** topic id -> progress */
  topics: Record<string, TopicProgress>
  /** question id -> practice history */
  questions: Record<string, QuestionProgress>
  /** interview question id -> self-assessed recall */
  interview: Record<string, InterviewProgress>
  /** Newest first. */
  exams: ExamAttempt[]
  lastVisitedTopicId?: string
  /** ISO date (YYYY-MM-DD) strings on which the learner opened a lesson. */
  studyDays: string[]
  /** card id (`itv:<id>` or `q:<id>`) -> spaced-repetition state. */
  srs: Record<string, SrsCard>
  /** Local day (YYYY-MM-DD) -> new cards introduced that day. Recent days only. */
  newCardsByDay: Record<string, number>
  /** practice question id -> mistake notebook entry */
  mistakes: Record<string, MistakeEntry>
  settings: Settings
  /** Local day (YYYY-MM-DD) -> what was studied. */
  activity: Record<string, ActivityDay>
  /** Playground challenge key -> progress. */
  challenges: Record<string, ChallengeProgress>
  /** Roles & skills "My fit": skill id -> when you ticked it as known. */
  skills: Record<string, number>
  /** Architecture builder: saved designs by id. */
  designs: Record<string, SavedDesign>
  /** STAR stories for behavioural questions, by id. */
  stories: Record<string, StarStory>
  /** Interview question id -> your own tags (company, round...) for prep packs. */
  questionTags: Record<string, string[]>
  /** Guided Azure labs: progress per lab id. */
  guidedLabs: Record<string, GuidedLabProgress>
}

export interface GuidedLabProgress {
  /** Step indexes marked done. */
  done: number[]
  /** Step indexes whose verify output matched. */
  verified: number[]
  /** Checklist item indexes ticked. */
  checks: number[]
  /** When the first step was marked done - resources may exist from here. */
  startedAt?: number
  /** When cleanup was confirmed. */
  cleanedAt?: number
}

export interface StarStory {
  id: string
  title: string
  situation: string
  task: string
  action: string
  result: string
  /** What you learned or would do differently - the senior bit. */
  learned: string
  /** Behavioural question ids this story answers. */
  questions: string[]
  updatedAt: number
}

/** A saved architecture diagram. Shape owned by `lib/arch/model.ts` (`Design`). */
export interface SavedDesign {
  id: string
  name: string
  scenarioId?: string
  nodes: {
    id: string
    type: string
    label: string
    x: number
    y: number
    region?: string
    props: Record<string, string | number | boolean>
  }[]
  edges: { id: string; from: string; to: string }[]
  updatedAt: number
}

export function createEmptyState(now = Date.now()): ProgressState {
  return {
    schemaVersion: SCHEMA_VERSION,
    createdAt: now,
    updatedAt: now,
    theme: 'system',
    topics: {},
    questions: {},
    interview: {},
    exams: [],
    studyDays: [],
    srs: {},
    newCardsByDay: {},
    mistakes: {},
    settings: {
      newCardsPerDay: DEFAULT_NEW_CARDS_PER_DAY,
      dailyGoal: { ...DEFAULT_DAILY_GOAL },
      examDates: {},
    },
    activity: {},
    challenges: {},
    skills: {},
    designs: {},
    stories: {},
    questionTags: {},
    guidedLabs: {},
  }
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

const asNumber = (value: unknown, fallback: number): number =>
  typeof value === 'number' && Number.isFinite(value) ? value : fallback

const asTheme = (value: unknown): ThemePreference =>
  value === 'light' || value === 'dark' || value === 'system' ? value : 'system'

const asStatus = (value: unknown): TopicStatus =>
  value === 'completed' || value === 'in-progress' || value === 'not-started'
    ? value
    : 'not-started'

const asRating = (value: unknown): Rating =>
  value === 1 || value === 2 || value === 3 || value === 4 ? value : GOOD

function migrateSrs(raw: unknown, now: number): Record<string, SrsCard> {
  const cards: Record<string, SrsCard> = {}
  if (!isRecord(raw)) return cards
  for (const [id, value] of Object.entries(raw)) {
    if (!isRecord(value)) continue
    const stability = asNumber(value.stability, 0)
    if (stability <= 0) continue
    cards[id] = {
      stability,
      difficulty: Math.min(10, Math.max(1, asNumber(value.difficulty, 5))),
      due: asNumber(value.due, now),
      lastReview: asNumber(value.lastReview, now),
      reps: asNumber(value.reps, 1),
      lapses: asNumber(value.lapses, 0),
      lastRating: asRating(value.lastRating),
    }
  }
  return cards
}

/**
 * The first time a record without spaced repetition is opened, every
 * interview question already marked "known" becomes a card rated Good on the
 * day it was marked, and every "needs review" one a card rated Again - so it
 * is due straight away.
 */
export function seedSrsFromInterview(
  interview: Record<string, InterviewProgress>,
): Record<string, SrsCard> {
  return Object.fromEntries(
    Object.entries(interview).map(([id, entry]) => [
      interviewCardId(id),
      schedule(undefined, entry.status === 'known' ? GOOD : AGAIN, entry.updatedAt),
    ]),
  )
}

const ISO_DAY = /^\d{4}-\d{2}-\d{2}$/

const asCount = (value: unknown) => Math.max(0, Math.floor(asNumber(value, 0)))

/**
 * Brings any previously stored record up to the current schema.
 *
 * Written defensively on purpose: a learner who has been using an older
 * deployment for weeks must not lose their history because one field moved.
 * Anything unrecognised is dropped only if it cannot be coerced, and known
 * fields always fall back to a safe default instead of throwing.
 */
export function migrate(raw: unknown, now = Date.now()): ProgressState {
  const empty = createEmptyState(now)
  if (!isRecord(raw)) return empty

  const topics: Record<string, TopicProgress> = {}
  if (isRecord(raw.topics)) {
    for (const [id, value] of Object.entries(raw.topics)) {
      if (!isRecord(value)) {
        // Tolerate an older boolean-only shape: { "pods": true }
        if (value === true) topics[id] = { status: 'completed', completedAt: now }
        continue
      }
      topics[id] = {
        status: asStatus(value.status),
        ...(typeof value.lastVisitedAt === 'number'
          ? { lastVisitedAt: value.lastVisitedAt }
          : undefined),
        ...(typeof value.completedAt === 'number' ? { completedAt: value.completedAt } : undefined),
      }
    }
  }

  const questions: Record<string, QuestionProgress> = {}
  if (isRecord(raw.questions)) {
    for (const [id, value] of Object.entries(raw.questions)) {
      if (!isRecord(value)) continue
      questions[id] = {
        lastCorrect: value.lastCorrect === true,
        attempts: asNumber(value.attempts, 0),
        correctCount: asNumber(value.correctCount, 0),
        incorrectCount: asNumber(value.incorrectCount, 0),
        lastAnsweredAt: asNumber(value.lastAnsweredAt, now),
      }
    }
  }

  const interview: Record<string, InterviewProgress> = {}
  if (isRecord(raw.interview)) {
    for (const [id, value] of Object.entries(raw.interview)) {
      if (!isRecord(value)) continue
      // Anything that is not a known status is treated as "needs review",
      // which is the safe direction to be wrong in.
      interview[id] = {
        status: value.status === 'known' ? 'known' : 'review',
        updatedAt: asNumber(value.updatedAt, now),
      }
    }
  }

  const exams: ExamAttempt[] = Array.isArray(raw.exams)
    ? raw.exams.filter(isRecord).map((attempt) => ({
        id:
          typeof attempt.id === 'string'
            ? attempt.id
            : `attempt-${Math.random().toString(36).slice(2)}`,
        courseId: typeof attempt.courseId === 'string' ? attempt.courseId : 'az900',
        label: typeof attempt.label === 'string' ? attempt.label : 'Mock exam',
        startedAt: asNumber(attempt.startedAt, now),
        submittedAt: asNumber(attempt.submittedAt, now),
        elapsedSeconds: asNumber(attempt.elapsedSeconds, 0),
        minutesAllowed: asNumber(attempt.minutesAllowed, 120),
        earnedPoints: asNumber(attempt.earnedPoints, 0),
        totalPoints: asNumber(attempt.totalPoints, 0),
        scorePercent: asNumber(attempt.scorePercent, 0),
        passingScore: asNumber(attempt.passingScore, 66),
        passed: attempt.passed === true,
        byDomain: isRecord(attempt.byDomain)
          ? Object.fromEntries(
              Object.entries(attempt.byDomain)
                .filter((entry): entry is [string, Record<string, unknown>] => isRecord(entry[1]))
                .map(([domainId, value]) => [
                  domainId,
                  { earned: asNumber(value.earned, 0), total: asNumber(value.total, 0) },
                ]),
            )
          : {},
        answers: Array.isArray(attempt.answers)
          ? attempt.answers.filter(isRecord).map((answer) => ({
              questionId: typeof answer.questionId === 'string' ? answer.questionId : '',
              domainId: typeof answer.domainId === 'string' ? answer.domainId : '',
              response: Array.isArray(answer.response)
                ? answer.response.filter((item): item is string => typeof item === 'string')
                : [],
              earned: asNumber(answer.earned, 0),
              total: asNumber(answer.total, 0),
              correct: typeof answer.correct === 'boolean' ? answer.correct : null,
            }))
          : [],
      }))
    : []

  const mistakes: Record<string, MistakeEntry> = {}
  if (isRecord(raw.mistakes)) {
    for (const [id, value] of Object.entries(raw.mistakes)) {
      if (!isRecord(value) || typeof value.courseId !== 'string') continue
      mistakes[id] = {
        courseId: value.courseId,
        source: value.source === 'exam' ? 'exam' : 'practice',
        count: Math.max(1, asCount(value.count)),
        firstWrongAt: asNumber(value.firstWrongAt, now),
        lastWrongAt: asNumber(value.lastWrongAt, now),
      }
    }
  }

  const newCardsByDay: Record<string, number> = {}
  if (isRecord(raw.newCardsByDay)) {
    for (const [day, count] of Object.entries(raw.newCardsByDay)) {
      if (ISO_DAY.test(day)) newCardsByDay[day] = asCount(count)
    }
  }

  const settings = isRecord(raw.settings) ? raw.settings : {}
  const goal = isRecord(settings.dailyGoal) ? settings.dailyGoal : {}
  const examDates: Record<string, string> = {}
  if (isRecord(settings.examDates)) {
    for (const [courseId, date] of Object.entries(settings.examDates)) {
      if (typeof date === 'string' && ISO_DAY.test(date)) examDates[courseId] = date
    }
  }

  const challenges: Record<string, ChallengeProgress> = {}
  if (isRecord(raw.challenges)) {
    for (const [key, value] of Object.entries(raw.challenges)) {
      if (!isRecord(value)) continue
      challenges[key] = {
        attempts: asCount(value.attempts),
        failures: asCount(value.failures),
        ...(typeof value.solvedAt === 'number' ? { solvedAt: value.solvedAt } : undefined),
      }
    }
  }

  const skills: Record<string, number> = {}
  if (isRecord(raw.skills)) {
    for (const [id, value] of Object.entries(raw.skills)) {
      if (typeof value === 'number' && Number.isFinite(value)) skills[id] = value
    }
  }

  const designs: Record<string, SavedDesign> = {}
  if (isRecord(raw.designs)) {
    for (const [id, value] of Object.entries(raw.designs)) {
      const design = migrateDesign(value)
      if (design && design.id === id) designs[id] = design
    }
  }

  const text = (value: unknown) => (typeof value === 'string' ? value : '')
  const stories: Record<string, StarStory> = {}
  if (isRecord(raw.stories)) {
    for (const [id, value] of Object.entries(raw.stories)) {
      if (!isRecord(value) || value.id !== id) continue
      stories[id] = {
        id,
        title: text(value.title) || 'Untitled story',
        situation: text(value.situation),
        task: text(value.task),
        action: text(value.action),
        result: text(value.result),
        learned: text(value.learned),
        questions: Array.isArray(value.questions)
          ? value.questions.filter((entry): entry is string => typeof entry === 'string')
          : [],
        updatedAt: asNumber(value.updatedAt, 0),
      }
    }
  }

  const questionTags: Record<string, string[]> = {}
  if (isRecord(raw.questionTags)) {
    for (const [id, value] of Object.entries(raw.questionTags)) {
      if (!Array.isArray(value)) continue
      const tags = [
        ...new Set(
          value
            .filter((tag): tag is string => typeof tag === 'string')
            .map((tag) => tag.trim())
            .filter(Boolean),
        ),
      ]
      if (tags.length > 0) questionTags[id] = tags
    }
  }

  const indexes = (value: unknown) =>
    Array.isArray(value)
      ? [
          ...new Set(
            value.filter((entry): entry is number => Number.isInteger(entry) && entry >= 0),
          ),
        ].sort((a, b) => a - b)
      : []
  const guidedLabs: Record<string, GuidedLabProgress> = {}
  if (isRecord(raw.guidedLabs)) {
    for (const [id, value] of Object.entries(raw.guidedLabs)) {
      if (!isRecord(value)) continue
      guidedLabs[id] = {
        done: indexes(value.done),
        verified: indexes(value.verified),
        checks: indexes(value.checks),
        ...(typeof value.startedAt === 'number' ? { startedAt: value.startedAt } : undefined),
        ...(typeof value.cleanedAt === 'number' ? { cleanedAt: value.cleanedAt } : undefined),
      }
    }
  }

  const activity: Record<string, ActivityDay> = {}
  if (isRecord(raw.activity)) {
    for (const [day, value] of Object.entries(raw.activity)) {
      if (!ISO_DAY.test(day) || !isRecord(value)) continue
      activity[day] = {
        questions: asCount(value.questions),
        lessons: asCount(value.lessons),
        minutes: Math.max(0, asNumber(value.minutes, 0)),
      }
    }
  }

  return {
    schemaVersion: SCHEMA_VERSION,
    createdAt: asNumber(raw.createdAt, now),
    updatedAt: asNumber(raw.updatedAt, now),
    theme: asTheme(raw.theme),
    topics,
    questions,
    interview,
    exams,
    ...(typeof raw.lastVisitedTopicId === 'string'
      ? { lastVisitedTopicId: raw.lastVisitedTopicId }
      : undefined),
    studyDays: Array.isArray(raw.studyDays)
      ? [...new Set(raw.studyDays.filter((day): day is string => typeof day === 'string'))].sort()
      : empty.studyDays,
    // A record from before spaced repetition has no `srs` at all; one that
    // has it - even empty - has already been seeded and must not be again.
    srs: isRecord(raw.srs) ? migrateSrs(raw.srs, now) : seedSrsFromInterview(interview),
    newCardsByDay,
    mistakes,
    settings: {
      newCardsPerDay: Math.min(500, asCount(settings.newCardsPerDay ?? DEFAULT_NEW_CARDS_PER_DAY)),
      dailyGoal: {
        kind: goal.kind === 'minutes' ? 'minutes' : 'questions',
        target: Math.max(1, Math.min(1000, asCount(goal.target ?? DEFAULT_DAILY_GOAL.target))),
      },
      examDates,
    },
    activity,
    challenges,
    skills,
    designs,
    stories,
    questionTags,
    guidedLabs,
  }
}

/** Keeps a saved design only if its shape is sound; drops bad nodes and dangling edges. */
function migrateDesign(value: unknown): SavedDesign | null {
  if (!isRecord(value) || typeof value.id !== 'string' || !Array.isArray(value.nodes)) return null
  const nodes: SavedDesign['nodes'] = []
  for (const node of value.nodes) {
    if (!isRecord(node) || typeof node.id !== 'string' || typeof node.type !== 'string') continue
    const props: Record<string, string | number | boolean> = {}
    if (isRecord(node.props)) {
      for (const [key, entry] of Object.entries(node.props)) {
        if (typeof entry === 'string' || typeof entry === 'number' || typeof entry === 'boolean')
          props[key] = entry
      }
    }
    nodes.push({
      id: node.id,
      type: node.type,
      label: typeof node.label === 'string' ? node.label : node.type,
      x: asNumber(node.x, 0),
      y: asNumber(node.y, 0),
      ...(typeof node.region === 'string' ? { region: node.region } : undefined),
      props,
    })
  }
  const ids = new Set(nodes.map((node) => node.id))
  const edges = (Array.isArray(value.edges) ? value.edges : []).filter(
    (edge): edge is SavedDesign['edges'][number] =>
      isRecord(edge) &&
      typeof edge.id === 'string' &&
      typeof edge.from === 'string' &&
      typeof edge.to === 'string' &&
      ids.has(edge.from) &&
      ids.has(edge.to),
  )
  return {
    id: value.id,
    name: typeof value.name === 'string' ? value.name : 'Untitled design',
    ...(typeof value.scenarioId === 'string' ? { scenarioId: value.scenarioId } : undefined),
    nodes,
    edges,
    updatedAt: asNumber(value.updatedAt, 0),
  }
}

/** localStorage can throw in private browsing modes, so every access is guarded. */
function safeGetItem(key: string): string | null {
  try {
    return window.localStorage.getItem(key)
  } catch {
    return null
  }
}

function safeSetItem(key: string, value: string): boolean {
  try {
    window.localStorage.setItem(key, value)
    return true
  } catch {
    return false
  }
}

function safeRemoveItem(key: string): void {
  try {
    window.localStorage.removeItem(key)
  } catch {
    /* nothing we can do, and nothing to report to the learner */
  }
}

/** Reads one learner's record. Omit `email` for whoever is signed in here. */
export function loadState(email?: string | null): ProgressState {
  const stored = safeGetItem(progressKey(email))
  if (!stored) return createEmptyState()
  try {
    return migrate(JSON.parse(stored) as unknown)
  } catch {
    // Keep the unreadable payload so nothing is lost, then start fresh.
    safeSetItem(backupKey(email), stored)
    return createEmptyState()
  }
}

export function saveState(state: ProgressState, email?: string | null): boolean {
  return safeSetItem(progressKey(email), JSON.stringify(state))
}

export function clearState(email?: string | null): void {
  safeRemoveItem(progressKey(email))
}

/**
 * Hands the pre-sign-in record to the first person who signs in.
 *
 * Before the email gate existed there was one shared record. Whoever had been
 * studying would otherwise open the new version, sign in, and find an empty
 * app - so the first address to sign in adopts that record, once. `CLAIMED_KEY`
 * records who took it, so the second person to sign in still starts fresh
 * rather than inheriting somebody else's history.
 *
 * Returns true when a record was adopted.
 */
export function adoptSharedProgress(email: string): boolean {
  if (!email) return false
  const key = progressKey(email)
  // Already has their own record - never overwrite it.
  if (safeGetItem(key) !== null) return false

  const shared = safeGetItem(STORAGE_KEY)
  if (shared === null) return false
  if (safeGetItem(CLAIMED_KEY) !== null) return false

  if (!safeSetItem(key, shared)) return false
  safeSetItem(CLAIMED_KEY, normalizeEmail(email))
  return true
}

/** The theme chosen most recently on this device, for the sign-in screen. */
export function readSharedTheme(): ThemePreference {
  return asTheme(safeGetItem(THEME_KEY))
}

export function writeSharedTheme(theme: ThemePreference): void {
  safeSetItem(THEME_KEY, theme)
}

/** Applies a theme preference to the document. */
export function applyTheme(theme: ThemePreference): void {
  const root = document.documentElement
  if (theme === 'system') root.removeAttribute('data-theme')
  else root.setAttribute('data-theme', theme)
}

export interface ExportEnvelope {
  app: 'azure-learning-hub'
  schemaVersion: number
  exportedAt: string
  state: ProgressState
}

export function toExportEnvelope(state: ProgressState): ExportEnvelope {
  return {
    app: 'azure-learning-hub',
    schemaVersion: SCHEMA_VERSION,
    exportedAt: new Date().toISOString(),
    state,
  }
}

export type ImportResult = { ok: true; state: ProgressState } | { ok: false; error: string }

/**
 * Accepts either a full export envelope or a bare state object, so a file
 * hand-edited by the learner still imports.
 */
export function parseImport(text: string): ImportResult {
  let parsed: unknown
  try {
    parsed = JSON.parse(text)
  } catch {
    return { ok: false, error: 'That file is not valid JSON.' }
  }
  if (!isRecord(parsed)) {
    return { ok: false, error: 'Expected a JSON object at the top level of the file.' }
  }
  const candidate = isRecord(parsed.state) ? parsed.state : parsed
  if (!isRecord(candidate.topics) && !Array.isArray(candidate.exams)) {
    return {
      ok: false,
      error: 'This does not look like an Azure Learning Hub export (no topics or exams found).',
    }
  }
  return { ok: true, state: migrate(candidate) }
}

/** Merges an imported record into the current one, keeping the better result. */
export function mergeStates(current: ProgressState, incoming: ProgressState): ProgressState {
  const topics: Record<string, TopicProgress> = { ...current.topics }
  for (const [id, incomingTopic] of Object.entries(incoming.topics)) {
    const existing = topics[id]
    if (!existing) {
      topics[id] = incomingTopic
      continue
    }
    const rank = { 'not-started': 0, 'in-progress': 1, completed: 2 } as const
    topics[id] = rank[incomingTopic.status] > rank[existing.status] ? incomingTopic : existing
  }

  const questions: Record<string, QuestionProgress> = { ...current.questions }
  for (const [id, incomingQuestion] of Object.entries(incoming.questions)) {
    const existing = questions[id]
    if (!existing) {
      questions[id] = incomingQuestion
      continue
    }
    questions[id] =
      incomingQuestion.lastAnsweredAt >= existing.lastAnsweredAt
        ? {
            ...incomingQuestion,
            attempts: existing.attempts + incomingQuestion.attempts,
            correctCount: existing.correctCount + incomingQuestion.correctCount,
            incorrectCount: existing.incorrectCount + incomingQuestion.incorrectCount,
          }
        : {
            ...existing,
            attempts: existing.attempts + incomingQuestion.attempts,
            correctCount: existing.correctCount + incomingQuestion.correctCount,
            incorrectCount: existing.incorrectCount + incomingQuestion.incorrectCount,
          }
  }

  const interview: Record<string, InterviewProgress> = { ...current.interview }
  for (const [id, incomingEntry] of Object.entries(incoming.interview)) {
    const existing = interview[id]
    // Most recent self-assessment wins: it is the learner's latest opinion of
    // whether they can answer it, and an older "known" should not mask a
    // newer "review".
    if (!existing || incomingEntry.updatedAt >= existing.updatedAt) {
      interview[id] = incomingEntry
    }
  }

  // The most recently reviewed version of each card is the true one.
  const srs: Record<string, SrsCard> = { ...current.srs }
  for (const [id, card] of Object.entries(incoming.srs)) {
    if (!srs[id] || card.lastReview > srs[id].lastReview) srs[id] = card
  }

  const mistakes: Record<string, MistakeEntry> = { ...current.mistakes }
  for (const [id, entry] of Object.entries(incoming.mistakes)) {
    const existing = mistakes[id]
    if (!existing || entry.lastWrongAt > existing.lastWrongAt) mistakes[id] = entry
  }

  const newCardsByDay: Record<string, number> = { ...current.newCardsByDay }
  for (const [day, count] of Object.entries(incoming.newCardsByDay)) {
    newCardsByDay[day] = Math.max(newCardsByDay[day] ?? 0, count)
  }

  // The same day studied on two devices: keep the bigger of each count rather
  // than adding, so importing the same file twice cannot double a day.
  const activity: Record<string, ActivityDay> = { ...current.activity }
  for (const [day, incomingDay] of Object.entries(incoming.activity)) {
    const existing = activity[day]
    activity[day] = existing
      ? {
          questions: Math.max(existing.questions, incomingDay.questions),
          lessons: Math.max(existing.lessons, incomingDay.lessons),
          minutes: Math.max(existing.minutes, incomingDay.minutes),
        }
      : incomingDay
  }

  // Solved anywhere is solved; the earliest solve date and the most attempts win.
  const challenges: Record<string, ChallengeProgress> = { ...current.challenges }
  for (const [key, entry] of Object.entries(incoming.challenges)) {
    const existing = challenges[key]
    if (!existing) {
      challenges[key] = entry
      continue
    }
    const solvedAt = [existing.solvedAt, entry.solvedAt].filter(
      (value): value is number => value !== undefined,
    )
    challenges[key] = {
      attempts: Math.max(existing.attempts, entry.attempts),
      failures: Math.max(existing.failures, entry.failures),
      ...(solvedAt.length > 0 ? { solvedAt: Math.min(...solvedAt) } : undefined),
    }
  }

  const examsById = new Map(current.exams.map((attempt) => [attempt.id, attempt]))
  for (const attempt of incoming.exams) examsById.set(attempt.id, attempt)

  return {
    ...current,
    topics,
    questions,
    interview,
    exams: [...examsById.values()].sort((a, b) => b.submittedAt - a.submittedAt),
    studyDays: [...new Set([...current.studyDays, ...incoming.studyDays])].sort(),
    lastVisitedTopicId: current.lastVisitedTopicId ?? incoming.lastVisitedTopicId,
    srs,
    newCardsByDay,
    mistakes,
    activity,
    challenges,
    // A skill ticked on either device stays ticked.
    skills: { ...incoming.skills, ...current.skills },
    // Stories: union by id, the most recently edited copy wins.
    stories: Object.fromEntries(
      [...new Set([...Object.keys(current.stories), ...Object.keys(incoming.stories)])].map(
        (id) => {
          const mine = current.stories[id]
          const theirs = incoming.stories[id]
          return [id, !mine || (theirs && theirs.updatedAt > mine.updatedAt) ? theirs : mine]
        },
      ),
    ),
    // Labs: union of ticks; cleanup counts only if it came after the latest start.
    guidedLabs: Object.fromEntries(
      [...new Set([...Object.keys(current.guidedLabs), ...Object.keys(incoming.guidedLabs)])].map(
        (id) => {
          const a = current.guidedLabs[id] ?? { done: [], verified: [], checks: [] }
          const b = incoming.guidedLabs[id] ?? { done: [], verified: [], checks: [] }
          const union = (x: number[], y: number[]) =>
            [...new Set([...x, ...y])].sort((m, n) => m - n)
          const startedAt = Math.max(a.startedAt ?? 0, b.startedAt ?? 0) || undefined
          const cleanedAt = Math.max(a.cleanedAt ?? 0, b.cleanedAt ?? 0) || undefined
          return [
            id,
            {
              done: union(a.done, b.done),
              verified: union(a.verified, b.verified),
              checks: union(a.checks, b.checks),
              ...(startedAt ? { startedAt } : undefined),
              ...(cleanedAt && (!startedAt || cleanedAt >= startedAt) ? { cleanedAt } : undefined),
            },
          ]
        },
      ),
    ),
    // Tags: the union of both sides for every question.
    questionTags: Object.fromEntries(
      [
        ...new Set([...Object.keys(current.questionTags), ...Object.keys(incoming.questionTags)]),
      ].map((id) => [
        id,
        [...new Set([...(current.questionTags[id] ?? []), ...(incoming.questionTags[id] ?? [])])],
      ]),
    ),
    // Designs: union by id, the most recently edited copy wins.
    designs: Object.fromEntries(
      [...new Set([...Object.keys(current.designs), ...Object.keys(incoming.designs)])].map(
        (id) => {
          const mine = current.designs[id]
          const theirs = incoming.designs[id]
          return [id, !mine || (theirs && theirs.updatedAt > mine.updatedAt) ? theirs : mine]
        },
      ),
    ),
    settings: {
      ...current.settings,
      examDates: { ...incoming.settings.examDates, ...current.settings.examDates },
    },
    updatedAt: Date.now(),
  }
}
