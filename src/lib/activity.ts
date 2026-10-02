import { ACTIVITY_DAYS_KEPT, type ActivityDay, type ProgressState } from './storage'
import { localDay } from './srs'

/**
 * Adds to today's activity, and once the daily goal is met, counts today as a
 * study day - which is what the streak is built from.
 */
export function addActivity(
  previous: ProgressState,
  delta: Partial<ActivityDay>,
  now = Date.now(),
): ProgressState {
  const today = localDay(now)
  const day = previous.activity[today] ?? { questions: 0, lessons: 0, minutes: 0 }
  const next: ActivityDay = {
    questions: day.questions + (delta.questions ?? 0),
    lessons: day.lessons + (delta.lessons ?? 0),
    minutes: day.minutes + (delta.minutes ?? 0),
  }
  const cutoff = localDay(now - ACTIVITY_DAYS_KEPT * 86_400_000)
  const activity = Object.fromEntries(
    Object.entries({ ...previous.activity, [today]: next }).filter(([key]) => key > cutoff),
  )
  const { dailyGoal } = previous.settings
  const reached =
    (dailyGoal.kind === 'minutes' ? Math.floor(next.minutes) : next.questions) >= dailyGoal.target
  // studyDays uses the same calendar as the existing streak, which counts lessons opened.
  const studyDay = new Date(now).toISOString().slice(0, 10)
  const studyDays =
    reached && !previous.studyDays.includes(studyDay)
      ? [...previous.studyDays, studyDay]
      : previous.studyDays
  return { ...previous, activity, studyDays }
}
