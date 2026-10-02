import { useMemo } from 'react'
import {
  RATINGS,
  formatInterval,
  previewIntervals,
  type Confidence,
  type Rating,
  type SrsCard,
} from '../lib/srs'

const ratingClass: Record<Rating, string> = {
  1: 'btn--danger',
  2: 'btn--warning',
  3: 'btn--success',
  4: 'btn',
}

/**
 * Again / Hard / Good / Easy, each labelled with when it would bring the card
 * back - the same affordance Anki uses, so the choice is about time, not mood.
 */
export function RatingButtons({
  card,
  onRate,
}: {
  card: SrsCard | undefined
  onRate: (rating: Rating) => void
}) {
  // Recomputed per card, not per render, so the labels do not tick over.
  const intervals = useMemo(() => previewIntervals(card), [card])
  return (
    <div className="srs-rate" role="group" aria-label="How well did you recall it?">
      {RATINGS.map(({ rating, label }) => (
        <button
          key={rating}
          type="button"
          className={`btn btn--sm srs-rate__button ${ratingClass[rating]}`}
          onClick={() => onRate(rating)}
        >
          <span>{label}</span>
          <span className="srs-rate__interval">{intervals[rating]}</span>
        </button>
      ))}
    </div>
  )
}

/** "Next review in 4d", for a card that has just been rated. */
export function NextReview({ card }: { card: SrsCard | undefined }) {
  if (!card) return null
  const wait = card.due - Date.now()
  return (
    <span className="subtle">
      {wait <= 0 ? 'Due now' : `Next review in ${formatInterval(wait)}`}
    </span>
  )
}

const CONFIDENCE: { id: Confidence; label: string }[] = [
  { id: 'guessed', label: 'Guessed' },
  { id: 'unsure', label: 'Unsure' },
  { id: 'knew', label: 'Knew it' },
]

/**
 * How sure you are, said BEFORE the answer is checked. A correct guess is then
 * scheduled like a miss, because luck is not knowledge.
 */
export function ConfidencePicker({
  value,
  onChange,
  disabled,
}: {
  value: Confidence | undefined
  onChange: (value: Confidence | undefined) => void
  disabled?: boolean
}) {
  return (
    <div className="srs-confidence">
      <span className="subtle">How sure are you?</span>
      <div className="chip-row" role="group" aria-label="Confidence">
        {CONFIDENCE.map((option) => (
          <button
            key={option.id}
            type="button"
            className="chip"
            aria-pressed={value === option.id}
            disabled={disabled}
            onClick={() => onChange(value === option.id ? undefined : option.id)}
          >
            {option.label}
          </button>
        ))}
      </div>
    </div>
  )
}
