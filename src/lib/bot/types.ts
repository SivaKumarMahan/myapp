/**
 * The Study Bot's data model.
 *
 * An enriched question extends an existing interview question. Most of it is
 * DERIVED from what the question already has (the answer, its **bold** key
 * terms, traps, follow-ups) - so all 2,584 questions work in the bot without a
 * second copy of their text. A hand-written OVERLAY (src/content/bot/topics/
 * <topic>.json, schema in enriched.schema.json) adds what cannot be derived -
 * an analogy, a plain explanation, curated key points with synonyms, mistake
 * triggers, follow-ups with their own answers - and overrides derived fields.
 */

export type BotLevel = 'basic' | 'intermediate' | 'senior'

export interface KeyPoint {
  /** The idea, as a short sentence. */
  point: string
  /** Words or phrases that show the idea was said: synonyms, abbreviations, variants. */
  keywords: string[]
  /** 1 (nice to say) to 3 (must say). */
  weight: number
}

export interface CommonMistake {
  /** The wrong idea, as people say it. */
  mistake: string
  /** Phrases that suggest an answer contains the mistake. Empty: shown, never flagged. */
  triggers: string[]
  correction: string
}

export interface FollowUp {
  question: string
  shortAnswer?: string
  keyPoints: KeyPoint[]
}

export interface EnrichedQuestion {
  id: string
  topic: string
  level: BotLevel
  prompt: string
  /** 30-second spoken answer, 2-4 sentences. */
  shortAnswer: string
  /** 2-minute answer, as sections. */
  longAnswer: { heading: string; text: string }[]
  keyPoints: KeyPoint[]
  commonMistakes: CommonMistake[]
  followUps: FollowUp[]
  /** Three hints, vague to specific. */
  hints: [string, string, string]
  analogy?: string
  simpleExplanation?: string
  related: string[]
  scenarioVariant?: { question: string; shortAnswer?: string }
  /** True when a hand-written overlay exists for this question. */
  curated: boolean
}

/** What an overlay file may set for one question. Everything but id is optional. */
export type QuestionOverlay = Partial<
  Omit<EnrichedQuestion, 'id' | 'topic' | 'prompt' | 'curated'>
> & { id: string }

export interface OverlayFile {
  topic: string
  questions: QuestionOverlay[]
}
