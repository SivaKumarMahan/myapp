import { allInterviewQuestions } from '../../content/interview'
import type { ProgressState } from '../storage'
import type { Rating } from '../srs'
import { enriched } from './enrich'
import { detect, type Intent } from './intents'
import type { ScoreResult } from './scoring'
import type { SearchHit } from './search'
import type { EnrichedQuestion, FollowUp, KeyPoint } from './types'
import { coach } from './modes/coach'
import { evaluate } from './modes/evaluate'
import { mock } from './modes/mock'
import { rapid } from './modes/rapid'
import { scenario, type ScenarioRun } from './modes/scenario'
import { search } from './modes/search'
import { tutor } from './modes/tutor'

/**
 * The Study Bot: a rule-driven state machine over pre-written content and
 * your progress. No network, no model - except optional on-device semantic
 * search, which is passed in and may be missing.
 */

export interface BotContext {
  state: () => ProgressState
  rate: (cardId: string, rating: Rating) => void
  now: () => number
  /** Optional semantic ranking (B4). Missing or failing: keyword search only. */
  semantic?: (query: string, limit: number) => Promise<{ id: string; score: number }[]>
}

export interface Chip {
  label: string
  send: string
  /** Shown as the primary choice. */
  primary?: boolean
}

export type Block =
  | { type: 'question'; question: EnrichedQuestion; label?: string }
  | { type: 'score'; result: ScoreResult; keyPoints: KeyPoint[]; title: string; selfCheck: boolean }
  | { type: 'results'; hits: (SearchHit & { shortAnswer: string })[] }
  | {
      type: 'report'
      title: string
      rows: { prompt: string; score: number | null; note?: string }[]
      summary: string
    }
  | { type: 'timer'; seconds: number; key: string }
  | { type: 'scenario'; title: string; text: string; evidence?: string; choices: string[] }
  | { type: 'links'; items: { label: string; to: string }[] }
  | { type: 'answer'; title: string; text: string }

export interface BotMessage {
  id: number
  from: 'bot' | 'user'
  text?: string
  block?: Block
}

export interface BotReply {
  messages: BotMessage[]
  chips: Chip[]
}

export type Awaiting = 'mock-main' | 'mock-follow' | 'evaluate' | 'rapid' | null

export interface MockRun {
  ids: string[]
  index: number
  stage: 'main' | 'rate' | 'follow' | 'done-follow'
  results: { id: string; prompt: string; score: number | null; missed: string[] }[]
  followUp: FollowUp | null
}

export interface RapidRun {
  ids: string[]
  index: number
  results: { id: string; prompt: string; score: number | null }[]
}

export const linkTo = (questionId: string) => {
  const entry = allInterviewQuestions.find((item) => item.question.id === questionId)
  return entry ? `/interview/${entry.topic.id}#${questionId}` : '/interview'
}

export class StudyBot {
  readonly context: BotContext
  /** The question on the table, for the tutor commands. */
  current: EnrichedQuestion | null = null
  awaiting: Awaiting = null
  hintIndex = 0
  /** The last scored answer, for /rate and /self. */
  lastScore: {
    questionId: string
    keyPoints: KeyPoint[]
    result: ScoreResult
    rateable: boolean
  } | null = null
  mockRun: MockRun | null = null
  rapidRun: RapidRun | null = null
  scenarioRun: ScenarioRun | null = null

  private nextId = 1
  private out: BotMessage[] = []
  private chipList: Chip[] = []

  constructor(context: BotContext) {
    this.context = context
  }

  /* output helpers for the modes */
  say(text: string) {
    this.out.push({ id: this.nextId++, from: 'bot', text })
  }
  show(block: Block, text?: string) {
    this.out.push({ id: this.nextId++, from: 'bot', block, text })
  }
  chips(...chips: Chip[]) {
    this.chipList = chips
  }

  async question(id: string): Promise<EnrichedQuestion | null> {
    return enriched(id)
  }

  /** Puts a question on the table and shows it. */
  async open(id: string, label?: string): Promise<EnrichedQuestion | null> {
    const question = await enriched(id)
    if (!question) {
      this.say("I can't find that question.")
      return null
    }
    this.current = question
    this.hintIndex = 0
    this.show({ type: 'question', question, label })
    return question
  }

  menuChips(): Chip[] {
    return [
      { label: '🎤 Mock interview', send: '/mock', primary: true },
      { label: '📋 What should I study?', send: '/coach today' },
      { label: '⚡ Rapid-fire', send: '/rapid' },
      { label: '🧯 Troubleshooting', send: '/scenario' },
      { label: '✍️ Evaluate an answer', send: '/evaluate' },
      { label: '❓ Help', send: '/help' },
    ]
  }

  tutorChips(): Chip[] {
    return [
      { label: 'Hint', send: '/hint' },
      { label: 'Short answer', send: '/short' },
      { label: 'Explain simpler', send: '/simpler' },
      { label: 'Analogy', send: '/analogy' },
      { label: 'Full answer', send: '/long' },
      { label: 'Related', send: '/related' },
    ]
  }

  welcome(): BotReply {
    this.say(
      "Hi! I'm your offline study bot - everything runs on this device, no internet needed. I can interview you and score your answers, explain things more simply, find answers in your question bank, run rapid-fire quizzes and troubleshooting scenarios, and tell you what to study next.",
    )
    this.chips(...this.menuChips())
    return this.flush()
  }

  private flush(): BotReply {
    const reply = { messages: this.out, chips: this.chipList }
    this.out = []
    return reply
  }

  /** Handles one typed message or tapped chip. */
  async send(input: string, echo = input): Promise<BotReply> {
    if (echo.trim()) this.out.push({ id: this.nextId++, from: 'user', text: echo })
    this.chipList = []
    const intent = detect(input, this.awaiting !== null)
    try {
      await this.dispatch(intent)
    } catch (error) {
      this.say(`Something went wrong: ${error instanceof Error ? error.message : String(error)}`)
      this.chips(...this.menuChips())
    }
    if (this.chipList.length === 0)
      this.chips(...(this.current ? this.tutorChips() : this.menuChips()))
    return this.flush()
  }

  private async dispatch(intent: Intent) {
    switch (intent.kind) {
      case 'help':
        this.say(
          'Things you can say or tap:\n\n- **interview me on networking** / `/mock senior` / `/mock due`\n- **what should I study today**, **weakest**, **mistakes**, **exam plan**\n- **rapid fire** for a timed quiz on what you forget most\n- **troubleshoot** for a branching incident scenario\n- **evaluate** a question, then type your answer\n- With a question open: **hint**, **short**, **long**, **simpler**, **analogy**, **related**, **mistakes**, **follow-ups**\n- Anything else is searched across all your questions.',
        )
        return
      case 'menu':
        this.awaiting = null
        this.say('What would you like to do?')
        this.chips(...this.menuChips())
        return
      case 'stop':
        this.awaiting = null
        if (this.mockRun) return mock.finish(this)
        if (this.rapidRun) return rapid.finish(this)
        this.scenarioRun = null
        this.say('Stopped. What next?')
        this.chips(...this.menuChips())
        return
      case 'mock':
        return mock.start(this, intent)
      case 'rapid':
        return rapid.start(this)
      case 'scenario':
        return scenario.start(this, intent.id)
      case 'choose':
        return scenario.choose(this, intent.index)
      case 'evaluate':
        return evaluate.start(this, intent.query, intent.id)
      case 'coach':
        return coach.run(this, intent.focus)
      case 'tutor':
        return tutor.run(this, intent.action)
      case 'open':
        await this.open(intent.id)
        this.chips({ label: '✍️ Answer it', send: '/evaluate' }, ...this.tutorChips())
        return
      case 'rate':
        return this.applyRating(intent.rating)
      case 'self':
        return evaluate.self(this, intent.points)
      case 'timeout':
        if (this.awaiting === 'rapid') return rapid.answer(this, '')
        return
      case 'skip':
        if (this.mockRun) return mock.next(this, true)
        if (this.rapidRun) return rapid.answer(this, '')
        this.awaiting = null
        this.say('Skipped.')
        return
      case 'answer':
        if (this.awaiting === 'mock-main' || this.awaiting === 'mock-follow')
          return mock.answer(this, intent.text)
        if (this.awaiting === 'rapid') return rapid.answer(this, intent.text)
        if (this.awaiting === 'evaluate') return evaluate.answer(this, intent.text)
        return search.run(this, intent.text)
      case 'search':
        return search.run(this, intent.query)
    }
  }

  private applyRating(rating: Rating) {
    const last = this.lastScore
    if (!last || !last.rateable) {
      this.say('There is nothing to rate right now.')
      return
    }
    this.context.rate(`itv:${last.questionId}`, rating)
    this.lastScore = { ...last, rateable: false }
    const label = ['', 'Again', 'Hard', 'Good', 'Easy'][rating]
    this.say(
      `Saved as **${label}** - it will come back ${rating === 1 ? 'later today' : rating === 2 ? 'soon' : 'in a few days or more'}.`,
    )
    if (this.mockRun) return mock.afterRating(this)
  }
}

export const RATING_CHIPS = (suggested: Rating): Chip[] =>
  ([1, 2, 3, 4] as Rating[]).map((rating) => ({
    label: `${['', 'Again', 'Hard', 'Good', 'Easy'][rating]}${rating === suggested ? ' (suggested)' : ''}`,
    send: `/rate ${rating}`,
    primary: rating === suggested,
  }))
