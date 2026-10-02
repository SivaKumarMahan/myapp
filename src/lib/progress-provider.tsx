import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import {
  applyTheme,
  createEmptyState,
  loadState,
  mergeStates,
  saveState,
  clearState,
  writeSharedTheme,
  type DailyGoal,
  type ExamAttempt,
  type InterviewStatus,
  type ProgressState,
  type ThemePreference,
  type TopicStatus,
} from './storage'
import { ProgressContext, type ProgressApi } from './progress-context'
import { addActivity } from './activity'
import {
  AGAIN,
  GOOD,
  HARD,
  localDay,
  parseCardId,
  practiceCardId,
  ratingForAnswer,
  schedule,
  interviewCardId,
  type Confidence,
  type Rating,
} from './srs'

const todayIso = (): string => new Date().toISOString().slice(0, 10)

/** How long the per-day new-card counts are kept. Only today's matters. */
const NEW_CARD_DAYS_KEPT = 14

/**
 * Applies one rating to a card, counting it against today's new-card limit if
 * it had never been seen. Rating an interview card also keeps its
 * known / needs-review flag in step, so the "recalled" totals stay truthful.
 */
function applyRating(previous: ProgressState, cardId: string, rating: Rating): ProgressState {
  const now = Date.now()
  const existing = previous.srs[cardId]
  let newCardsByDay = previous.newCardsByDay
  if (!existing) {
    const today = localDay(now)
    const cutoff = localDay(now - NEW_CARD_DAYS_KEPT * 86_400_000)
    newCardsByDay = Object.fromEntries(
      Object.entries({ ...newCardsByDay, [today]: (newCardsByDay[today] ?? 0) + 1 }).filter(
        ([day]) => day > cutoff,
      ),
    )
  }

  let interview = previous.interview
  const parsed = parseCardId(cardId)
  if (parsed?.kind === 'interview' && rating !== HARD) {
    interview = {
      ...interview,
      [parsed.questionId]: { status: rating === AGAIN ? 'review' : 'known', updatedAt: now },
    }
  }

  const next = {
    ...previous,
    srs: { ...previous.srs, [cardId]: schedule(existing, rating, now) },
    newCardsByDay,
    interview,
  }
  // A practice answer is counted where it is recorded (`recordAnswer`), so
  // only interview ratings count as a question here.
  return parsed?.kind === 'interview' ? addActivity(next, { questions: 1 }, now) : next
}

/**
 * Holds one learner's progress.
 *
 * `userEmail` chooses which stored record this instance reads and writes, so
 * two people sharing a browser never see each other's lessons, practice
 * history or exam attempts. It is expected to be mounted with a `key` of the
 * same address: changing learner then re-creates the provider and re-reads
 * from scratch rather than carrying the previous record in memory.
 */
export function ProgressProvider({
  userEmail = null,
  children,
}: {
  userEmail?: string | null
  children: ReactNode
}) {
  const [state, setState] = useState<ProgressState>(() => loadState(userEmail))
  const [storageAvailable, setStorageAvailable] = useState(true)
  // The first render must not immediately write back what we just read.
  const hydrated = useRef(false)
  // Actions must not close over `state`, or their identity would change on
  // every update and any effect depending on them would loop. Where an action
  // genuinely needs the current value, it reads this ref instead.
  const latest = useRef(state)
  latest.current = state

  useEffect(() => {
    if (!hydrated.current) {
      hydrated.current = true
      return
    }
    setStorageAvailable(saveState(state, userEmail))
  }, [state, userEmail])

  // Keep the document theme attribute in sync with the stored preference, and
  // mirror it outside the record so the sign-in screen - which renders before
  // any learner is known - can use the same appearance.
  useEffect(() => {
    applyTheme(state.theme)
    writeSharedTheme(state.theme)
  }, [state.theme])

  /** Every mutation goes through here, which is stable for the app's lifetime. */
  const update = useCallback((updater: (previous: ProgressState) => ProgressState) => {
    setState((previous) => ({ ...updater(previous), updatedAt: Date.now() }))
  }, [])

  const setTheme = useCallback(
    (theme: ThemePreference) => update((previous) => ({ ...previous, theme })),
    [update],
  )

  const markTopicVisited = useCallback(
    (topicId: string) =>
      update((previous) => {
        const existing = previous.topics[topicId]
        const day = todayIso()
        return {
          ...previous,
          lastVisitedTopicId: topicId,
          studyDays: previous.studyDays.includes(day)
            ? previous.studyDays
            : [...previous.studyDays, day],
          topics: {
            ...previous.topics,
            [topicId]: {
              status: existing?.status === 'completed' ? 'completed' : 'in-progress',
              completedAt: existing?.completedAt,
              lastVisitedAt: Date.now(),
            },
          },
        }
      }),
    [update],
  )

  const setTopicStatus = useCallback(
    (topicId: string, status: TopicStatus) =>
      update((previous) => {
        const next: ProgressState = {
          ...previous,
          topics: {
            ...previous.topics,
            [topicId]: {
              status,
              lastVisitedAt: previous.topics[topicId]?.lastVisitedAt ?? Date.now(),
              completedAt: status === 'completed' ? Date.now() : undefined,
            },
          },
        }
        const newlyCompleted =
          status === 'completed' && previous.topics[topicId]?.status !== 'completed'
        return newlyCompleted ? addActivity(next, { lessons: 1 }) : next
      }),
    [update],
  )

  const toggleTopicCompleted = useCallback(
    (topicId: string) =>
      update((previous) => {
        const wasCompleted = previous.topics[topicId]?.status === 'completed'
        const next: ProgressState = {
          ...previous,
          topics: {
            ...previous.topics,
            [topicId]: {
              status: wasCompleted ? 'in-progress' : 'completed',
              lastVisitedAt: previous.topics[topicId]?.lastVisitedAt ?? Date.now(),
              completedAt: wasCompleted ? undefined : Date.now(),
            },
          },
        }
        return wasCompleted ? next : addActivity(next, { lessons: 1 })
      }),
    [update],
  )

  const recordAnswer = useCallback(
    (questionId: string, correct: boolean) =>
      update((previous) => {
        const existing = previous.questions[questionId]
        return addActivity(
          {
            ...previous,
            questions: {
              ...previous.questions,
              [questionId]: {
                lastCorrect: correct,
                attempts: (existing?.attempts ?? 0) + 1,
                correctCount: (existing?.correctCount ?? 0) + (correct ? 1 : 0),
                incorrectCount: (existing?.incorrectCount ?? 0) + (correct ? 0 : 1),
                lastAnsweredAt: Date.now(),
              },
            },
          },
          { questions: 1 },
        )
      }),
    [update],
  )

  const clearAnswer = useCallback(
    (questionId: string) =>
      update((previous) => {
        const questions = { ...previous.questions }
        delete questions[questionId]
        return { ...previous, questions }
      }),
    [update],
  )

  const setInterviewStatus = useCallback(
    (questionId: string, status: InterviewStatus | null) =>
      update((previous) => {
        const interview = { ...previous.interview }
        if (status === null) delete interview[questionId]
        else interview[questionId] = { status, updatedAt: Date.now() }
        // A question flagged by hand joins the deck the same way migration
        // seeds it: known as Good, needs-review as Again. An existing card
        // keeps its own schedule - the ratings are what move it.
        const cardId = interviewCardId(questionId)
        const srs =
          status !== null && !previous.srs[cardId]
            ? { ...previous.srs, [cardId]: schedule(undefined, status === 'known' ? GOOD : AGAIN) }
            : previous.srs
        const next = { ...previous, interview, srs }
        return status === null ? next : addActivity(next, { questions: 1 })
      }),
    [update],
  )

  const rateCard = useCallback(
    (cardId: string, rating: Rating) => update((previous) => applyRating(previous, cardId, rating)),
    [update],
  )

  const recordPracticeResult = useCallback(
    (questionId: string, courseId: string, correct: boolean, confidence?: Confidence) =>
      update((previous) => {
        const next = applyRating(
          previous,
          practiceCardId(questionId),
          ratingForAnswer(correct, confidence),
        )
        const mistakes = { ...previous.mistakes }
        const existing = mistakes[questionId]
        const now = Date.now()
        if (!correct) {
          mistakes[questionId] = {
            courseId,
            source: 'practice',
            count: (existing?.count ?? 0) + 1,
            firstWrongAt: existing?.firstWrongAt ?? now,
            lastWrongAt: now,
          }
        } else if (confidence !== 'guessed') {
          // Answered right and not by luck: it is no longer a mistake.
          delete mistakes[questionId]
        }
        return { ...next, mistakes }
      }),
    [update],
  )

  const removeMistake = useCallback(
    (questionId: string) =>
      update((previous) => {
        const mistakes = { ...previous.mistakes }
        delete mistakes[questionId]
        return { ...previous, mistakes }
      }),
    [update],
  )

  const setDailyGoal = useCallback(
    (goal: DailyGoal) =>
      update((previous) => ({
        ...previous,
        settings: {
          ...previous.settings,
          dailyGoal: {
            kind: goal.kind,
            target: Math.max(1, Math.min(1000, Math.floor(goal.target) || 1)),
          },
        },
      })),
    [update],
  )

  const setExamDate = useCallback(
    (courseId: string, date: string | null) =>
      update((previous) => {
        const examDates = { ...previous.settings.examDates }
        if (date && /^\d{4}-\d{2}-\d{2}$/.test(date)) examDates[courseId] = date
        else delete examDates[courseId]
        return { ...previous, settings: { ...previous.settings, examDates } }
      }),
    [update],
  )

  const recordChallengeCheck = useCallback(
    (key: string, solved: boolean) =>
      update((previous) => {
        const existing = previous.challenges[key]
        const solvedAt = existing?.solvedAt ?? (solved ? Date.now() : undefined)
        return addActivity(
          {
            ...previous,
            challenges: {
              ...previous.challenges,
              [key]: {
                attempts: (existing?.attempts ?? 0) + 1,
                failures: (existing?.failures ?? 0) + (solved ? 0 : 1),
                ...(solvedAt !== undefined ? { solvedAt } : undefined),
              },
            },
          },
          { questions: 1 },
        )
      }),
    [update],
  )

  const addStudyMinutes = useCallback(
    (minutes: number) => update((previous) => addActivity(previous, { minutes })),
    [update],
  )

  const setNewCardsPerDay = useCallback(
    (count: number) =>
      update((previous) => ({
        ...previous,
        settings: {
          ...previous.settings,
          newCardsPerDay: Math.max(0, Math.min(500, Math.floor(count) || 0)),
        },
      })),
    [update],
  )

  const saveExamAttempt = useCallback(
    (attempt: ExamAttempt) =>
      update((previous) => {
        const mistakes = { ...previous.mistakes }
        for (const answer of attempt.answers) {
          if (answer.correct !== false || !answer.questionId) continue
          const existing = mistakes[answer.questionId]
          mistakes[answer.questionId] = {
            courseId: attempt.courseId,
            source: 'exam',
            count: (existing?.count ?? 0) + 1,
            firstWrongAt: existing?.firstWrongAt ?? attempt.submittedAt,
            lastWrongAt: attempt.submittedAt,
          }
        }
        return addActivity(
          {
            ...previous,
            mistakes,
            exams: [
              attempt,
              ...previous.exams.filter((existing) => existing.id !== attempt.id),
            ].slice(0, 50),
          },
          // Re-saving an attempt already on record must not count it twice.
          {
            questions: previous.exams.some((existing) => existing.id === attempt.id)
              ? 0
              : attempt.answers.length,
          },
        )
      }),
    [update],
  )

  const updateExamAttempt = useCallback(
    (attemptId: string, next: ExamAttempt) =>
      update((previous) => ({
        ...previous,
        exams: previous.exams.map((attempt) => (attempt.id === attemptId ? next : attempt)),
      })),
    [update],
  )

  const deleteExamAttempt = useCallback(
    (attemptId: string) =>
      update((previous) => ({
        ...previous,
        exams: previous.exams.filter((attempt) => attempt.id !== attemptId),
      })),
    [update],
  )

  const resetAll = useCallback(() => {
    clearState(userEmail)
    // The theme is a display preference, not progress, so it survives a reset.
    setState({ ...createEmptyState(), theme: latest.current.theme })
  }, [userEmail])

  const replaceState = useCallback(
    (next: ProgressState) => update(() => ({ ...next, theme: latest.current.theme })),
    [update],
  )

  const mergeIntoState = useCallback(
    (incoming: ProgressState) => update((previous) => mergeStates(previous, incoming)),
    [update],
  )

  const api = useMemo<ProgressApi>(
    () => ({
      state,
      storageAvailable,
      setTheme,
      markTopicVisited,
      setTopicStatus,
      toggleTopicCompleted,
      recordAnswer,
      clearAnswer,
      setInterviewStatus,
      rateCard,
      recordPracticeResult,
      removeMistake,
      setNewCardsPerDay,
      setDailyGoal,
      setExamDate,
      addStudyMinutes,
      recordChallengeCheck,
      saveExamAttempt,
      updateExamAttempt,
      deleteExamAttempt,
      resetAll,
      replaceState,
      mergeIntoState,
    }),
    [
      state,
      storageAvailable,
      setTheme,
      markTopicVisited,
      setTopicStatus,
      toggleTopicCompleted,
      recordAnswer,
      clearAnswer,
      setInterviewStatus,
      rateCard,
      recordPracticeResult,
      removeMistake,
      setNewCardsPerDay,
      setDailyGoal,
      setExamDate,
      addStudyMinutes,
      recordChallengeCheck,
      saveExamAttempt,
      updateExamAttempt,
      deleteExamAttempt,
      resetAll,
      replaceState,
      mergeIntoState,
    ],
  )

  return <ProgressContext.Provider value={api}>{children}</ProgressContext.Provider>
}
