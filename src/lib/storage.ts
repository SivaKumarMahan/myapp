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
 * `challenges` for the playgrounds.
 */
export const SCHEMA_VERSION = 4
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
    settings: {
      ...current.settings,
      examDates: { ...incoming.settings.examDates, ...current.settings.examDates },
    },
    updatedAt: Date.now(),
  }
}
