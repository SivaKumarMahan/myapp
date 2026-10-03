import { useId, useState } from 'react'
import { Link } from 'react-router-dom'
import { glossaryById, relatedLessons } from '../lib/glossary'

/**
 * A glossary term inside lesson text: dotted underline; hover, focus or tap
 * shows the definition with links to related lessons and the glossary.
 */
export function GlossaryTerm({ id, text }: { id: string; text: string }) {
  const term = glossaryById.get(id)
  const panelId = useId()
  const [open, setOpen] = useState(false)
  const [pinned, setPinned] = useState(false)
  if (!term) return <>{text}</>
  const visible = open || pinned
  return (
    <span className="gloss" onMouseEnter={() => setOpen(true)} onMouseLeave={() => setOpen(false)}>
      <button
        type="button"
        className="gloss__term"
        aria-expanded={visible}
        aria-controls={panelId}
        onFocus={() => setOpen(true)}
        onClick={() => setPinned((value) => !value)}
        onKeyDown={(event) => {
          if (event.key === 'Escape') {
            setOpen(false)
            setPinned(false)
          }
        }}
      >
        {text}
      </button>
      {visible && (
        <span id={panelId} className="gloss__panel" role="note">
          <strong>{term.term}</strong>
          <span>{term.definition}</span>
          {relatedLessons(id, 3).length > 0 && (
            <span className="gloss__links">
              {relatedLessons(id, 3).map((lesson) => (
                <Link key={lesson.to} to={lesson.to}>
                  📘 {lesson.label}
                </Link>
              ))}
            </span>
          )}
          <span className="gloss__links">
            <Link to={`/glossary#${id}`}>Glossary →</Link>
            <button
              type="button"
              className="linklike"
              onClick={() => {
                setPinned(false)
                setOpen(false)
              }}
            >
              Close
            </button>
          </span>
        </span>
      )}
    </span>
  )
}
