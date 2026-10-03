import { createContext } from 'react'
import type {
  ExamAttempt,
  ProgressState,
  ThemePreference,
  TopicStatus,
  InterviewStatus,
  DailyGoal,
  SavedDesign,
  StarStory,
  GuidedLabProgress,
} from './storage'
import type { Confidence, Rating } from './srs'

export interface ProgressApi {
  state: ProgressState
  /** False in private-browsing modes where localStorage writes are rejected. */
  storageAvailable: boolean
  setTheme: (theme: ThemePreference) => void
  markTopicVisited: (topicId: string) => void
  setTopicStatus: (topicId: string, status: TopicStatus) => void
  toggleTopicCompleted: (topicId: string) => void
  recordAnswer: (questionId: string, correct: boolean) => void
  clearAnswer: (questionId: string) => void
  /** Self-assessed recall for an interview question. `null` clears it. */
  setInterviewStatus: (questionId: string, status: InterviewStatus | null) => void
  /** Rates one spaced-repetition card (`itv:<id>` or `q:<id>`). */
  rateCard: (cardId: string, rating: Rating) => void
  /**
   * A graded practice answer: schedules its card from the result and your
   * confidence, and adds it to or clears it from the mistake notebook.
   */
  recordPracticeResult: (
    questionId: string,
    courseId: string,
    correct: boolean,
    confidence?: Confidence,
  ) => void
  removeMistake: (questionId: string) => void
  setNewCardsPerDay: (count: number) => void
  setDailyGoal: (goal: DailyGoal) => void
  /** `null` clears the date. */
  setExamDate: (courseId: string, date: string | null) => void
  /** A playground challenge was checked. Counts towards today's questions. */
  recordChallengeCheck: (key: string, solved: boolean) => void
  /** Roles & skills "My fit": tick or untick a skill you know. */
  setSkillKnown: (skillId: string, known: boolean) => void
  /** Architecture builder: create or replace a saved design. */
  saveDesign: (design: SavedDesign) => void
  deleteDesign: (designId: string) => void
  /** STAR builder: create or replace a story. */
  saveStory: (story: StarStory) => void
  deleteStory: (storyId: string) => void
  /** Replaces your tags on one interview question (empty removes them). */
  setQuestionTags: (questionId: string, tags: string[]) => void
  /** Guided labs: replace one lab's progress (null resets it). */
  setGuidedLab: (labId: string, progress: GuidedLabProgress | null) => void
  /** Called by the study timer while the app is in active use. */
  addStudyMinutes: (minutes: number) => void
  /** Also files every wrong answer in the mistake notebook. */
  saveExamAttempt: (attempt: ExamAttempt) => void
  updateExamAttempt: (attemptId: string, next: ExamAttempt) => void
  deleteExamAttempt: (attemptId: string) => void
  resetAll: () => void
  replaceState: (state: ProgressState) => void
  mergeIntoState: (state: ProgressState) => void
}

export const ProgressContext = createContext<ProgressApi | null>(null)
