import { interviewQuestionById } from '../../content/interview'
import type { InterviewQuestion, InterviewTopic } from '../../content/types'
import { plain, tokens } from './text'
import type { BotLevel, EnrichedQuestion, KeyPoint, OverlayFile, QuestionOverlay } from './types'

/**
 * Builds the enriched record for any interview question: derived from the
 * question's own content, then overlaid with the hand-written topic file if
 * there is one. Overlays are loaded lazily, one JSON file per topic.
 */

const overlayFiles = import.meta.glob<OverlayFile>('../../content/bot/topics/*.json', {
  import: 'default',
})
const overlayCache = new Map<string, Promise<Map<string, QuestionOverlay>>>()

export const curatedTopics = Object.keys(overlayFiles).map(
  (path) => path.split('/').pop()?.replace('.json', '') ?? '',
)

function overlaysFor(topicId: string): Promise<Map<string, QuestionOverlay>> {
  let entry = overlayCache.get(topicId)
  if (!entry) {
    const loader = overlayFiles[`../../content/bot/topics/${topicId}.json`]
    entry = loader
      ? loader().then((file) => new Map(file.questions.map((question) => [question.id, question])))
      : Promise.resolve(new Map())
    overlayCache.set(topicId, entry)
  }
  return entry
}

const LEVEL: Record<InterviewQuestion['level'], BotLevel> = {
  basic: 'basic',
  intermediate: 'intermediate',
  advanced: 'senior',
}

const STOP = new Set(
  'the a an and or of to in on for with is are be by as it that this you your we our can from at not but if then than so do does use using into its their they them when what which how why also more most such any all each other only just like will would should could may must have has had'.split(
    ' ',
  ),
)

const sentences = (text: string) => text.split(/(?<=[.!?])\s+(?=[A-Z`*(])/).filter(Boolean)

/** The first 2-4 sentences of the answer, up to about 75 words. */
function deriveShort(question: InterviewQuestion): string {
  const lead =
    question.kind === 'mcq' || question.kind === 'multi'
      ? `The answer: ${(question.correct ?? []).map((id) => question.options?.find((option) => option.id === id)?.text ?? id).join('; ')}. `
      : ''
  const picked: string[] = []
  let words = 0
  for (const sentence of sentences(question.answer.join(' '))) {
    const count = sentence.split(/\s+/).length
    if (picked.length >= 2 && (words + count > 75 || picked.length >= 4)) break
    picked.push(sentence)
    words += count
  }
  return lead + picked.join(' ')
}

/** Key points from the answer's **bold** terms - the author's own markers of what matters. */
function deriveKeyPoints(question: InterviewQuestion): KeyPoint[] {
  const points: KeyPoint[] = []
  const seen = new Set<string>()
  const add = (term: string, sentence: string, weight: number) => {
    const key = tokens(term).join(' ')
    if (!key || seen.has(key) || term.length > 60) return
    seen.add(key)
    const point = plain(sentence).trim()
    points.push({
      point: point.length > 160 ? `${point.slice(0, 157)}…` : point,
      keywords: [term.toLowerCase()],
      weight,
    })
  }
  if (question.kind === 'mcq' || question.kind === 'multi') {
    for (const id of question.correct ?? []) {
      const text = question.options?.find((option) => option.id === id)?.text
      if (text) add(plain(text).split(/\s+/).slice(0, 6).join(' '), text, 3)
    }
  }
  question.answer.forEach((paragraph, index) => {
    for (const sentence of sentences(paragraph)) {
      for (const match of sentence.matchAll(/\*\*([^*]+)\*\*/g))
        add(match[1], sentence, index === 0 ? 3 : index === 1 ? 2 : 1)
    }
  })
  if (points.length < 3) {
    question.answer.forEach((paragraph, index) => {
      for (const sentence of sentences(paragraph)) {
        for (const match of sentence.matchAll(/`([^`]+)`/g))
          add(match[1], sentence, index === 0 ? 2 : 1)
      }
    })
  }
  if (points.length < 3) {
    // Fall back to the most repeated meaningful words of the answer.
    const counts = new Map<string, number>()
    for (const word of plain(question.answer.join(' '))
      .toLowerCase()
      .match(/[a-z][a-z0-9-]{5,}/g) ?? []) {
      if (!STOP.has(word)) counts.set(word, (counts.get(word) ?? 0) + 1)
    }
    for (const [word] of [...counts].sort((a, b) => b[1] - a[1]).slice(0, 5)) {
      add(
        word,
        sentences(question.answer.join(' ')).find((sentence) =>
          sentence.toLowerCase().includes(word),
        ) ?? word,
        1,
      )
    }
  }
  return points.sort((a, b) => b.weight - a.weight).slice(0, 8)
}

export function deriveEnriched(
  question: InterviewQuestion,
  topic: InterviewTopic | { id: string },
): EnrichedQuestion {
  const keyPoints = deriveKeyPoints(question)
  const shortAnswer = deriveShort(question)
  const firstWords = plain(shortAnswer).split(/\s+/).slice(0, 12).join(' ')
  const clues = keyPoints
    .filter((point) => point.weight >= 2)
    .slice(0, 2)
    .map((point) => point.keywords[0])
  return {
    id: question.id,
    topic: topic.id,
    level: LEVEL[question.level],
    prompt: question.prompt,
    shortAnswer,
    longAnswer: [
      { heading: 'Answer', text: question.answer.join('\n\n') },
      ...(question.deeper?.length
        ? [{ heading: 'Going deeper', text: question.deeper.join('\n\n') }]
        : []),
    ],
    keyPoints,
    commonMistakes: (question.traps ?? []).map((trap) => ({
      mistake: trap,
      triggers: [],
      correction: '',
    })),
    followUps: (question.followUps ?? []).map((followUp) => ({
      question: followUp,
      keyPoints: [],
    })),
    hints: [
      sentences(question.probing)[0] ?? 'Think about what the interviewer is really checking.',
      clues.length
        ? `Think about: ${clues.join(' and ')}.`
        : 'Start with the plain definition, then one example.',
      `It starts like this: “${firstWords}…”`,
    ],
    related: [],
    curated: false,
  }
}

/** The enriched record for a question id, overlay applied. */
export async function enriched(questionId: string): Promise<EnrichedQuestion | null> {
  const entry = interviewQuestionById.get(questionId)
  if (!entry) return null
  const base = deriveEnriched(entry.question, entry.topic)
  const overlay = (await overlaysFor(entry.topic.id)).get(questionId)
  if (!overlay) return base
  return {
    ...base,
    ...overlay,
    hints: (overlay.hints as EnrichedQuestion['hints'] | undefined) ?? base.hints,
    // Hand-written mistakes replace derived traps; keep traps if there are none.
    commonMistakes: overlay.commonMistakes?.length ? overlay.commonMistakes : base.commonMistakes,
    followUps: overlay.followUps?.length ? overlay.followUps : base.followUps,
    curated: true,
  }
}
