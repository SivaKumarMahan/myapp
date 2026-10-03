import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { Badge } from '../components/ui/Badge'
import behaviouralData from '../content/interview/behavioural.json'
import type { StarStory } from '../lib/storage'
import { useProgress } from '../lib/use-progress'

interface Behavioural {
  id: string
  question: string
  theme: string
  tip: string
}

const behaviouralQuestions = (behaviouralData as { questions: Behavioural[] }).questions

const FIELDS: {
  key: keyof Pick<StarStory, 'situation' | 'task' | 'action' | 'result' | 'learned'>
  label: string
  hint: string
}[] = [
  {
    key: 'situation',
    label: 'Situation',
    hint: 'Where and when: the system, the team, what was at stake. Two sentences.',
  },
  {
    key: 'task',
    label: 'Task',
    hint: 'What you (not the team) had to achieve, and the constraint.',
  },
  {
    key: 'action',
    label: 'Action',
    hint: 'The heart of it: what you did, in order, and why. Say "I".',
  },
  {
    key: 'result',
    label: 'Result',
    hint: 'The outcome in numbers - minutes of downtime, % saved, incidents avoided.',
  },
  {
    key: 'learned',
    label: 'What I learned',
    hint: 'What you changed afterwards or would do differently - the senior touch.',
  },
]

const words = (text: string) => text.trim().split(/\s+/).filter(Boolean).length

const newStory = (questions: string[] = []): StarStory => ({
  id: `story-${Date.now().toString(36)}`,
  title: 'New story',
  situation: '',
  task: '',
  action: '',
  result: '',
  learned: '',
  questions,
  updatedAt: Date.now(),
})

function Editor({
  story,
  onChange,
  onDelete,
}: {
  story: StarStory
  onChange: (story: StarStory) => void
  onDelete: () => void
}) {
  const total = FIELDS.reduce((sum, field) => sum + words(story[field.key]), 0)
  return (
    <section className="card stack-sm" aria-labelledby="star-edit">
      <h2 id="star-edit" className="visually-hidden">
        Edit story
      </h2>
      <label className="field">
        <span className="field__label">Title (for you)</span>
        <input
          className="search-input"
          value={story.title}
          onChange={(event) => onChange({ ...story, title: event.target.value })}
        />
      </label>
      {FIELDS.map((field) => (
        <label key={field.key} className="field">
          <span className="field__label">
            {field.label} <span className="subtle">· {words(story[field.key])} words</span>
          </span>
          <span className="subtle star-hint">{field.hint}</span>
          <textarea
            className="mock-textarea"
            rows={field.key === 'action' ? 5 : 3}
            value={story[field.key]}
            onChange={(event) => onChange({ ...story, [field.key]: event.target.value })}
          />
        </label>
      ))}
      <p className={total > 380 ? 'viz-bad' : 'subtle'} style={{ margin: 0 }}>
        {total} words ≈ {Math.max(1, Math.round(total / 150))} min spoken. Aim for 250-350 words
        (about two minutes).
      </p>
      <fieldset className="mock-topics">
        <legend className="field__label">Answers these questions</legend>
        <div className="chip-row">
          {behaviouralQuestions.map((question) => (
            <button
              key={question.id}
              type="button"
              className="chip"
              title={question.question}
              aria-pressed={story.questions.includes(question.id)}
              onClick={() =>
                onChange({
                  ...story,
                  questions: story.questions.includes(question.id)
                    ? story.questions.filter((id) => id !== question.id)
                    : [...story.questions, question.id],
                })
              }
            >
              {question.theme}:{' '}
              {question.question.replace(/^Tell me (about )?/i, '').replace(/\.$/, '')}
            </button>
          ))}
        </div>
      </fieldset>
      <button
        type="button"
        className="btn btn--ghost btn--sm"
        style={{ justifySelf: 'start' }}
        onClick={onDelete}
      >
        Delete story
      </button>
    </section>
  )
}

function QuickReview({ stories }: { stories: StarStory[] }) {
  const deck = behaviouralQuestions
    .map((question) => ({
      question,
      stories: stories.filter((story) => story.questions.includes(question.id)),
    }))
    .filter((entry) => entry.stories.length > 0)
  const [index, setIndex] = useState(0)
  const [shown, setShown] = useState(false)
  if (deck.length === 0)
    return (
      <p className="subtle">
        Tag your stories to behavioural questions first; quick review walks through those questions.
      </p>
    )
  const entry = deck[index % deck.length]
  return (
    <section className="card stack-sm" aria-live="polite">
      <div className="row">
        <Badge>{entry.question.theme}</Badge>
        <span className="subtle">
          {(index % deck.length) + 1} of {deck.length}
        </span>
      </div>
      <h2 className="card__title">{entry.question.question}</h2>
      <p className="subtle" style={{ margin: 0 }}>
        What they look for: {entry.question.tip}
      </p>
      {shown ? (
        entry.stories.map((story) => (
          <div key={story.id} className="star-review">
            <strong>{story.title}</strong>
            <dl>
              {FIELDS.filter((field) => story[field.key].trim()).map((field) => (
                <div key={field.key}>
                  <dt>{field.label[0]}</dt>
                  <dd>{story[field.key]}</dd>
                </div>
              ))}
            </dl>
          </div>
        ))
      ) : (
        <button
          type="button"
          className="btn btn--secondary"
          style={{ justifySelf: 'start' }}
          onClick={() => setShown(true)}
        >
          Say it out loud, then show my story
        </button>
      )}
      <div className="button-row">
        <button
          type="button"
          className="btn btn--ghost"
          onClick={() => {
            setIndex((value) => (value + deck.length - 1) % deck.length)
            setShown(false)
          }}
        >
          ← Previous
        </button>
        <button
          type="button"
          className="btn"
          onClick={() => {
            setIndex((value) => value + 1)
            setShown(false)
          }}
        >
          Next →
        </button>
      </div>
    </section>
  )
}

/**
 * STAR story builder: write your behavioural stories once, tag them to the
 * questions they answer, and run through them before an interview.
 */
export function StoriesPage() {
  const { state, saveStory, deleteStory } = useProgress()
  const stories = Object.values(state.stories).sort((a, b) => b.updatedAt - a.updatedAt)
  const [mode, setMode] = useState<'edit' | 'review'>('edit')
  const [selectedId, setSelectedId] = useState<string | null>(stories[0]?.id ?? null)
  const [draft, setDraft] = useState<StarStory | null>(stories[0] ?? null)
  const pending = useRef<StarStory | null>(null)

  // Typing saves shortly after you stop.
  useEffect(() => {
    if (!pending.current) return
    const story = pending.current
    const handle = window.setTimeout(() => {
      saveStory(story)
      pending.current = null
    }, 400)
    return () => window.clearTimeout(handle)
  }, [draft, saveStory])

  const edit = (story: StarStory) => {
    const next = { ...story, updatedAt: Date.now() }
    pending.current = next
    setDraft(next)
  }
  const create = (questions: string[] = []) => {
    const story = newStory(questions)
    saveStory(story)
    setSelectedId(story.id)
    setDraft(story)
    setMode('edit')
  }
  const select = (id: string) => {
    if (pending.current) {
      saveStory(pending.current)
      pending.current = null
    }
    setSelectedId(id)
    setDraft(state.stories[id] ?? null)
  }

  const covered = new Set(stories.flatMap((story) => story.questions))
  const current = draft && draft.id === selectedId ? draft : null

  return (
    <div className="page page--wide stack">
      <header className="page-header">
        <p className="subtle" style={{ margin: 0 }}>
          <Link to="/interview">Interview preparation</Link>
        </p>
        <h1>STAR stories</h1>
        <p className="page-header__meta">
          Behavioural rounds reward a few well-rehearsed stories told the STAR way: Situation, Task,
          Action, Result. Write each once, tag the questions it answers, and review them before the
          interview.
        </p>
      </header>
      <div className="chip-row" role="tablist" aria-label="Mode">
        <button
          type="button"
          role="tab"
          className="chip"
          aria-selected={mode === 'edit'}
          onClick={() => setMode('edit')}
        >
          My stories ({stories.length})
        </button>
        <button
          type="button"
          role="tab"
          className="chip"
          aria-selected={mode === 'review'}
          onClick={() => setMode('review')}
        >
          Quick review
        </button>
      </div>

      {mode === 'review' ? (
        <QuickReview stories={stories} />
      ) : (
        <div className="star-layout">
          <aside className="stack-sm" aria-label="Story list and coverage">
            <button type="button" className="btn" onClick={() => create()}>
              ＋ New story
            </button>
            <ul className="star-list">
              {stories.map((story) => (
                <li key={story.id}>
                  <button
                    type="button"
                    className="linklike"
                    aria-pressed={story.id === selectedId}
                    onClick={() => select(story.id)}
                  >
                    {story.id === current?.id ? current.title : story.title}
                  </button>
                  <span className="subtle"> · {story.questions.length} questions</span>
                </li>
              ))}
            </ul>
            <section className="card stack-sm" aria-labelledby="star-coverage">
              <h2 id="star-coverage" className="card__title">
                Coverage {covered.size}/{behaviouralQuestions.length}
              </h2>
              <ul className="viz-list">
                {behaviouralQuestions.map((question) => (
                  <li key={question.id}>
                    {covered.has(question.id) ? '✓ ' : '○ '}
                    {question.question}
                    {!covered.has(question.id) && (
                      <>
                        {' '}
                        <button
                          type="button"
                          className="linklike"
                          onClick={() => create([question.id])}
                        >
                          write one
                        </button>
                      </>
                    )}
                  </li>
                ))}
              </ul>
            </section>
          </aside>
          {current ? (
            <Editor
              story={current}
              onChange={edit}
              onDelete={() => {
                if (!window.confirm(`Delete "${current.title}"?`)) return
                pending.current = null
                deleteStory(current.id)
                const rest = stories.filter((story) => story.id !== current.id)
                setSelectedId(rest[0]?.id ?? null)
                setDraft(rest[0] ?? null)
              }}
            />
          ) : (
            <p className="subtle">
              Start a story - or pick a question from Coverage and write one for it.
            </p>
          )}
        </div>
      )}
    </div>
  )
}
