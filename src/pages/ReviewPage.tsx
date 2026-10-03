import { useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { interviewQuestionById } from '../content/interview'
import { useProgress } from '../lib/use-progress'
import { AGAIN, interviewCardId, parseCardId, ratingForAnswer, type Confidence } from '../lib/srs'
import {
  buildQueue,
  deckForecast,
  deckSize,
  newCardsLeftToday,
  practiceCardFor,
  type DeckFilter,
  type PracticeCard,
} from '../lib/review-deck'
import { gradeQuestion, type GradeResult } from '../lib/scoring'
import { InterviewQuestionCard } from '../components/InterviewQuestionCard'
import { QuestionView } from '../components/QuestionView'
import { ConfidencePicker } from '../components/SrsControls'
import { ReviewForecast } from '../components/ReviewForecast'
import { Badge } from '../components/ui/Badge'
import { ProgressBar } from '../components/ui/ProgressBar'
import { EmptyState } from '../components/ui/StateBlock'

const FILTERS: { id: DeckFilter; label: string }[] = [
  { id: 'all', label: 'Everything' },
  { id: 'interview', label: 'Interview questions' },
  { id: 'practice', label: 'Practice questions' },
]

/**
 * Today's spaced-repetition queue: every card that is due, then new cards up
 * to the daily limit. The queue is fixed when the session starts, except that
 * a card you rate Again goes to the back of it to be seen once more today.
 */
export function ReviewPage() {
  const { state, setNewCardsPerDay } = useProgress()
  const [filter, setFilter] = useState<DeckFilter>('all')
  const live = buildQueue(state, filter)
  const counts = useMemo(() => deckForecast(state), [state])
  const reviewed = Object.keys(state.srs).length

  return (
    <div className="page stack-lg">
      <header className="page-header">
        <nav className="breadcrumbs" aria-label="Breadcrumb">
          <Link to="/">Home</Link>
          <span aria-hidden="true">/</span>
          <span>Due today</span>
        </nav>
        <h1>Due today</h1>
        <p className="muted">
          Spaced repetition across all {deckSize} interview and practice questions. Rate each one
          honestly and it comes back just before you would forget it.
        </p>
        <div className="page-header__meta">
          <Badge tone="warning">{live.due.length} due</Badge>
          <Badge tone="info">{live.fresh.length} new</Badge>
          <Badge>
            {reviewed} of {deckSize} cards started
          </Badge>
        </div>
      </header>

      <div className="srs-toolbar">
        <div className="chip-row" role="group" aria-label="Which cards">
          {FILTERS.map((option) => (
            <button
              key={option.id}
              type="button"
              className="chip"
              aria-pressed={filter === option.id}
              onClick={() => setFilter(option.id)}
            >
              {option.label}
            </button>
          ))}
        </div>
        <label className="srs-limit">
          <span className="field__label">New cards per day</span>
          <input
            className="select srs-limit__input"
            type="number"
            inputMode="numeric"
            min={0}
            max={500}
            value={state.settings.newCardsPerDay}
            onChange={(event) => setNewCardsPerDay(Number(event.target.value))}
          />
          <span className="subtle">{newCardsLeftToday(state)} left today</span>
        </label>
      </div>

      {/* Re-keyed so changing the filter or the limit starts a fresh session. */}
      <ReviewSession key={`${filter}-${state.settings.newCardsPerDay}`} filter={filter} />

      <section className="card">
        <ReviewForecast counts={counts} />
      </section>
    </div>
  )
}

function ReviewSession({ filter }: { filter: DeckFilter }) {
  const { state, rateCard } = useProgress()
  const [queue, setQueue] = useState<string[]>(() => {
    const { due, fresh } = buildQueue(state, filter)
    return [...due, ...fresh]
  })
  const [position, setPosition] = useState(0)

  const advance = (cardId: string, again: boolean) => {
    if (again) setQueue((previous) => [...previous, cardId])
    setPosition((previous) => previous + 1)
    window.scrollTo({ top: 0 })
  }

  if (queue.length === 0 || position >= queue.length) {
    return (
      <EmptyState
        icon="✅"
        title={queue.length === 0 ? 'Nothing due right now' : 'Session complete'}
        description={
          queue.length === 0
            ? 'No reviews are due and you have used today’s new cards. Come back tomorrow, or raise the new-card limit.'
            : `You worked through ${queue.length} ${queue.length === 1 ? 'card' : 'cards'}. The forecast below shows what is coming.`
        }
        action={
          <div className="row">
            <Link className="btn" to="/interview">
              Browse interview topics
            </Link>
            <Link className="btn btn--secondary" to="/mistakes">
              Mistake notebook
            </Link>
          </div>
        }
      />
    )
  }

  const cardId = queue[position]
  const parsed = parseCardId(cardId)
  const isNew = !state.srs[cardId]

  let body: ReactNode = null
  if (parsed?.kind === 'interview') {
    const entry = interviewQuestionById.get(parsed.questionId)
    if (entry) {
      body = (
        <div className="stack-sm">
          <h2 className="visually-hidden">Card {position + 1}</h2>
          <p className="subtle" style={{ margin: 0 }}>
            <span aria-hidden="true">{entry.topic.icon} </span>
            <Link to={`/interview/${entry.topic.id}`}>{entry.topic.title}</Link>
          </p>
          <InterviewQuestionCard
            key={cardId}
            question={entry.question}
            index={position + 1}
            status={state.interview[entry.question.id]?.status}
            onStatusChange={() => {}}
            hideStatus
            srsCard={state.srs[interviewCardId(entry.question.id)]}
            onRate={(rating) => {
              rateCard(cardId, rating)
              advance(cardId, rating === AGAIN)
            }}
          />
        </div>
      )
    }
  } else if (parsed?.kind === 'practice') {
    const entry = practiceCardFor(cardId)
    if (entry) {
      body = (
        <PracticeReview
          key={cardId}
          entry={entry}
          index={position + 1}
          total={queue.length}
          onDone={(again) => advance(cardId, again)}
        />
      )
    }
  }

  return (
    <section className="stack" aria-label="Review session">
      <div className="quiz-toolbar">
        <span className="subtle">
          Card {position + 1} of {queue.length}
        </span>
        <span className="top-bar__spacer" />
        <Badge tone={isNew ? 'info' : 'warning'}>{isNew ? 'New' : 'Review'}</Badge>
        <button
          type="button"
          className="btn btn--ghost btn--sm"
          onClick={() => advance(cardId, false)}
        >
          Skip
        </button>
      </div>
      <ProgressBar value={(position / queue.length) * 100} />
      {body ?? (
        <EmptyState
          title="This card is no longer in the content"
          action={
            <button type="button" className="btn" onClick={() => advance(cardId, false)}>
              Next card
            </button>
          }
        />
      )}
    </section>
  )
}

/** One practice question as a card: answer, say how sure you were, check. */
function PracticeReview({
  entry,
  index,
  total,
  onDone,
}: {
  entry: PracticeCard
  index: number
  total: number
  onDone: (again: boolean) => void
}) {
  const { recordAnswer, recordPracticeResult } = useProgress()
  const { question, course } = entry
  const [response, setResponse] = useState<string[]>([])
  const [confidence, setConfidence] = useState<Confidence | undefined>()
  const [grade, setGrade] = useState<GradeResult | null>(null)

  const canCheck =
    question.kind === 'command' ? (response[0] ?? '').trim().length > 0 : response.length > 0

  const check = () => {
    const result = gradeQuestion(question, response)
    setGrade(result)
    const correct = result.correct === true
    recordAnswer(question.id, correct)
    recordPracticeResult(question.id, course.course.id, correct, confidence)
  }

  const again = grade !== null && ratingForAnswer(grade.correct === true, confidence) === AGAIN

  return (
    <div className="stack">
      <p className="subtle" style={{ margin: 0 }}>
        <span aria-hidden="true">{course.course.icon} </span>
        {course.course.examCode} practice question
      </p>
      <QuestionView
        question={question}
        response={response}
        onChange={setResponse}
        revealed={grade !== null}
        grade={grade ?? undefined}
        index={index}
        total={total}
      />
      {grade === null ? (
        <>
          <ConfidencePicker value={confidence} onChange={setConfidence} />
          <div className="button-row">
            <button type="button" className="btn" onClick={check} disabled={!canCheck}>
              Check answer
            </button>
          </div>
        </>
      ) : (
        <div className="srs-panel">
          <span className="srs-panel__label">
            {again
              ? grade.correct
                ? 'Right, but a guess - it will come back soon, like a miss.'
                : 'Added to your mistake notebook. It will come back later in this session.'
              : 'Scheduled.'}
          </span>
          <button type="button" className="btn" onClick={() => onDone(again)}>
            Next card →
          </button>
        </div>
      )}
      <Link className="subtle" to={`${course.course.route}/topics/${question.topicId}`}>
        Read the lesson for this question →
      </Link>
    </div>
  )
}
