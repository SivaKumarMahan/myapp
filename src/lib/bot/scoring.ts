import { AGAIN, EASY, GOOD, HARD, type Rating } from '../srs'
import { mentions, tokens } from './text'
import type { CommonMistake, KeyPoint } from './types'

export interface ScoreResult {
  /** 0-100: the weighted share of key points the answer covered. */
  score: number
  matched: KeyPoint[]
  missed: KeyPoint[]
  /** Mistakes whose trigger phrases appear in the answer. */
  mistakes: CommonMistake[]
  words: number
  suggested: Rating
}

/** Score to a spaced-repetition rating. A flagged mistake caps it at Hard. */
export function ratingFor(score: number, mistakes: number, words: number): Rating {
  if (words === 0) return AGAIN
  const base = score >= 85 ? EASY : score >= 60 ? GOOD : score >= 35 ? HARD : AGAIN
  return mistakes > 0 && base > HARD ? HARD : base
}

/**
 * Scores a typed answer against the key points: a point counts as covered
 * when any of its keywords (or their synonyms) appears, allowing small typos,
 * word-form changes and a couple of words in between.
 */
export function scoreAnswer(
  answer: string,
  keyPoints: KeyPoint[],
  commonMistakes: CommonMistake[] = [],
): ScoreResult {
  const text = tokens(answer)
  const matched: KeyPoint[] = []
  const missed: KeyPoint[] = []
  for (const point of keyPoints) {
    if (point.keywords.some((keyword) => mentions(text, keyword))) matched.push(point)
    else missed.push(point)
  }
  const total = keyPoints.reduce((sum, point) => sum + point.weight, 0)
  const got = matched.reduce((sum, point) => sum + point.weight, 0)
  const score = total === 0 ? 0 : Math.round((got / total) * 100)
  const mistakes = commonMistakes.filter((mistake) =>
    mistake.triggers.some((trigger) => mentions(text, trigger)),
  )
  return {
    score,
    matched,
    missed,
    mistakes,
    words: text.length,
    suggested: ratingFor(score, mistakes.length, text.length),
  }
}

/** The same rating from a self-assessment: which key points you know you said. */
export function scoreSelf(keyPoints: KeyPoint[], said: number[]): ScoreResult {
  const matched = keyPoints.filter((_, index) => said.includes(index))
  const missed = keyPoints.filter((_, index) => !said.includes(index))
  const total = keyPoints.reduce((sum, point) => sum + point.weight, 0)
  const score =
    total === 0
      ? 0
      : Math.round((matched.reduce((sum, point) => sum + point.weight, 0) / total) * 100)
  return { score, matched, missed, mistakes: [], words: 1, suggested: ratingFor(score, 0, 1) }
}

export { AGAIN, HARD, GOOD, EASY }
