import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { companyPacks, knownTags } from '../lib/packs'
import { useProgress } from '../lib/use-progress'

/**
 * Your own tags on an interview question - a company, a round, "Friday prep".
 * Each tag becomes a prep pack on the Packs page.
 */
export function QuestionTags({ questionId }: { questionId: string }) {
  const { state, setQuestionTags } = useProgress()
  const tags = state.questionTags[questionId] ?? []
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState('')
  // Only worked out while editing: a topic page renders well over a hundred cards.
  const suggestions = editing
    ? [...new Set([...knownTags(state), ...companyPacks().map((pack) => pack.name)])].filter(
        (tag) => !tags.includes(tag),
      )
    : []
  const listId = `tags-${questionId}`

  const add = (event: FormEvent) => {
    event.preventDefault()
    const tag = draft.trim()
    if (tag) setQuestionTags(questionId, [...tags, tag])
    setDraft('')
  }

  return (
    <div className="question-tags">
      {tags.map((tag) => (
        <span key={tag} className="question-tag">
          <Link to={`/interview/packs?pack=${encodeURIComponent(`tag:${tag}`)}`}>🏷 {tag}</Link>
          <button
            type="button"
            aria-label={`Remove tag ${tag}`}
            onClick={() =>
              setQuestionTags(
                questionId,
                tags.filter((entry) => entry !== tag),
              )
            }
          >
            ×
          </button>
        </span>
      ))}
      {editing ? (
        <form className="question-tags__form" onSubmit={add}>
          <input
            className="search-input"
            list={listId}
            value={draft}
            autoFocus
            placeholder="Company or round"
            aria-label="New tag"
            onChange={(event) => setDraft(event.target.value)}
            onBlur={() => {
              if (!draft.trim()) setEditing(false)
            }}
          />
          <datalist id={listId}>
            {suggestions.map((tag) => (
              <option key={tag} value={tag} />
            ))}
          </datalist>
          <button type="submit" className="btn btn--sm">
            Add
          </button>
        </form>
      ) : (
        <button type="button" className="btn btn--ghost btn--sm" onClick={() => setEditing(true)}>
          🏷 Tag
        </button>
      )}
    </div>
  )
}
