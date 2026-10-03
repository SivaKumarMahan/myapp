import { useEffect, useMemo, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { Badge } from '../components/ui/Badge'
import { keywordSearch } from '../lib/bot/search'
import { linkTo } from '../lib/bot/engine'
import { glossaryTerms, mentions, relatedLessons } from '../lib/glossary'

function TermDetail({ id, term }: { id: string; term: string }) {
  const lessons = relatedLessons(id, 6)
  const questions = useMemo(() => keywordSearch(term, 3), [term])
  return (
    <div className="glossary-related">
      {lessons.length > 0 && (
        <div>
          <span className="field__label">Lessons</span>
          <ul className="viz-list">
            {lessons.map((lesson) => (
              <li key={lesson.to}>
                <Link to={lesson.to}>📘 {lesson.label}</Link>
              </li>
            ))}
          </ul>
        </div>
      )}
      {questions.length > 0 && (
        <div>
          <span className="field__label">Interview questions</span>
          <ul className="viz-list">
            {questions.map((question) => (
              <li key={question.id}>
                <Link to={linkTo(question.id)}>💬 {question.prompt}</Link>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}

/** Glossary: every term, searchable, with the lessons and questions that use it. */
export function GlossaryPage() {
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState('')
  const [open, setOpen] = useState<string | null>(null)
  const location = useLocation()
  const categories = [...new Set(glossaryTerms.map((term) => term.category))]
  const needle = query.trim().toLowerCase()
  const shown = glossaryTerms
    .filter((term) => !category || term.category === category)
    .filter(
      (term) =>
        !needle ||
        term.term.toLowerCase().includes(needle) ||
        term.aliases.some((alias) => alias.toLowerCase().includes(needle)) ||
        mentions(term, query) ||
        term.definition.toLowerCase().includes(needle),
    )
    .sort((a, b) => a.term.localeCompare(b.term))

  // /glossary#term opens that term.
  useEffect(() => {
    const id = location.hash.slice(1)
    if (id) setOpen(id)
  }, [location.hash])

  return (
    <div className="page stack">
      <header className="page-header">
        <h1>Glossary</h1>
        <p className="page-header__meta">
          {glossaryTerms.length} Azure and DevOps terms. In lessons, terms are underlined - hover or
          tap one for its definition.
        </p>
      </header>
      <input
        type="search"
        className="search-input"
        placeholder="Search terms, e.g. NSG or private endpoint"
        aria-label="Search the glossary"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
      />
      <div className="chip-row" role="group" aria-label="Category">
        <button
          type="button"
          className="chip"
          aria-pressed={category === ''}
          onClick={() => setCategory('')}
        >
          All
        </button>
        {categories.map((entry) => (
          <button
            key={entry}
            type="button"
            className="chip"
            aria-pressed={category === entry}
            onClick={() => setCategory(entry)}
          >
            {entry}
          </button>
        ))}
      </div>
      <dl className="glossary-list">
        {shown.map((term) => (
          <div
            key={term.id}
            id={term.id}
            className={`glossary-entry${open === term.id ? ' is-open' : ''}`}
          >
            <dt>
              <button
                type="button"
                className="linklike glossary-entry__term"
                aria-expanded={open === term.id}
                onClick={() => setOpen(open === term.id ? null : term.id)}
              >
                {term.term}
              </button>{' '}
              <Badge>{term.category}</Badge>
            </dt>
            <dd>
              {term.definition}
              {term.aliases.length > 0 && (
                <span className="subtle"> Also: {term.aliases.join(', ')}.</span>
              )}
              {open === term.id && <TermDetail id={term.id} term={term.term} />}
            </dd>
          </div>
        ))}
      </dl>
      {shown.length === 0 && <p className="subtle">No term matches &ldquo;{query}&rdquo;.</p>}
    </div>
  )
}
