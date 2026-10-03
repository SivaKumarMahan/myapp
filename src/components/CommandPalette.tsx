import { useEffect, useMemo, useRef, useState, type KeyboardEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { courseIndexes } from '../content/registry'
import {
  KIND_LABEL,
  buildIndex,
  pageItems,
  type PaletteIndex,
  type PaletteItem,
} from '../lib/palette-index'

let cached: PaletteIndex | null = null

/**
 * Ctrl/⌘+K: jump to any page, lesson, question, command, challenge, lab,
 * glossary term or role. Arrow keys move, Enter opens, Escape closes.
 * A combobox + listbox, so screen readers announce the active result.
 */
export default function CommandPalette({ onClose }: { onClose: () => void }) {
  const navigate = useNavigate()
  const [query, setQuery] = useState('')
  const [active, setActive] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLUListElement>(null)
  const closeRef = useRef<HTMLButtonElement>(null)
  const index = useMemo(() => (cached ??= buildIndex()), [])

  const results = useMemo<PaletteItem[]>(() => {
    if (!query.trim()) {
      const quick = pageItems().slice(0, 12)
      return [
        ...quick,
        ...courseIndexes.map(({ course }) => ({
          id: `page:${course.route}/search`,
          kind: 'page' as const,
          title: `🔎 Full-text search in ${course.examCode}`,
          subtitle: 'Lessons, questions and commands',
          to: `${course.route}/search`,
        })),
      ]
    }
    return index.search(query)
  }, [query, index])

  useEffect(() => {
    inputRef.current?.focus()
  }, [])
  useEffect(() => setActive(0), [query])
  useEffect(() => {
    listRef.current?.querySelector(`[data-index="${active}"]`)?.scrollIntoView({ block: 'nearest' })
  }, [active])

  const open = (item: PaletteItem | undefined) => {
    if (!item) return
    onClose()
    navigate(item.to)
  }

  const onKeyDown = (event: KeyboardEvent) => {
    if (event.key === 'ArrowDown') {
      event.preventDefault()
      setActive((value) => Math.min(results.length - 1, value + 1))
    } else if (event.key === 'ArrowUp') {
      event.preventDefault()
      setActive((value) => Math.max(0, value - 1))
    } else if (event.key === 'Home' && event.ctrlKey) {
      setActive(0)
    } else if (event.key === 'End' && event.ctrlKey) {
      setActive(results.length - 1)
    } else if (event.key === 'Enter') {
      event.preventDefault()
      open(results[active])
    } else if (event.key === 'Escape') {
      event.preventDefault()
      onClose()
    }
  }

  // Group headings in result order.
  let lastKind = ''
  return (
    <div
      className="palette-backdrop"
      onMouseDown={(event) => event.target === event.currentTarget && onClose()}
    >
      <div
        className="palette"
        role="dialog"
        aria-modal="true"
        aria-label="Search everything"
        onKeyDown={(event) => {
          // Focus trap: Tab cycles between the search box and the close button.
          if (event.key === 'Escape') {
            event.preventDefault()
            onClose()
            return
          }
          if (event.key !== 'Tab') return
          const stops = [inputRef.current, closeRef.current].filter(
            (element): element is HTMLInputElement | HTMLButtonElement => Boolean(element),
          )
          const index = stops.indexOf(
            document.activeElement as HTMLInputElement | HTMLButtonElement,
          )
          event.preventDefault()
          stops[(index + (event.shiftKey ? stops.length - 1 : 1)) % stops.length]?.focus()
        }}
      >
        <div className="palette__bar">
          <input
            ref={inputRef}
            className="palette__input"
            role="combobox"
            aria-expanded="true"
            aria-controls="palette-results"
            aria-activedescendant={results[active] ? `palette-${active}` : undefined}
            aria-autocomplete="list"
            aria-label="Search lessons, questions, commands, labs and pages"
            placeholder="Search lessons, questions, commands, labs, pages…"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            onKeyDown={onKeyDown}
            spellCheck={false}
            autoComplete="off"
          />
          <button
            ref={closeRef}
            type="button"
            className="palette__close"
            aria-label="Close search"
            onClick={onClose}
          >
            ✕
          </button>
        </div>
        <ul
          id="palette-results"
          ref={listRef}
          className="palette__list"
          role="listbox"
          aria-label="Results"
        >
          {results.map((item, index) => {
            const heading = item.kind !== lastKind ? KIND_LABEL[item.kind] : null
            lastKind = item.kind
            return (
              <li
                key={item.id}
                id={`palette-${index}`}
                data-index={index}
                role="option"
                aria-selected={index === active}
                className={`palette__item${index === active ? ' is-active' : ''}`}
                onMouseMove={() => setActive(index)}
                onClick={() => open(item)}
              >
                {heading && (
                  <span className="palette__kind" aria-hidden="true">
                    {heading}
                  </span>
                )}
                <span className="palette__title">{item.title}</span>
                <span className="palette__subtitle">{item.subtitle}</span>
              </li>
            )
          })}
          {results.length === 0 && (
            <li className="palette__empty" role="option" aria-selected="false" aria-disabled="true">
              Nothing matches &ldquo;{query}&rdquo;.
            </li>
          )}
        </ul>
        <p className="palette__hint" aria-hidden="true">
          <kbd>↑</kbd> <kbd>↓</kbd> move · <kbd>Enter</kbd> open · <kbd>Esc</kbd> close
        </p>
      </div>
    </div>
  )
}
