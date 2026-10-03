import { Fragment, useContext } from 'react'
import type { ReactNode } from 'react'
import { TermLinkerContext, type TermLinker } from './term-linker'

/**
 * Minimal inline formatter for lesson prose.
 *
 * The content files are plain TypeScript strings, and they use two Markdown
 * conventions that carry real meaning for a technical reader:
 *
 *   `code`     a command, field path or identifier
 *   **bold**   the term being defined, or a warning
 *
 * Nothing else is supported on purpose - this is not a Markdown renderer, and
 * it builds React elements rather than injecting HTML, so content can never
 * introduce markup.
 *
 * Code spans are matched first so that asterisks inside a command are left
 * alone (`kubectl get pods -o jsonpath='{.items[*].metadata.name}'`).
 */

/**
 * One pass, two alternatives: a code span or a bold span. Code is listed
 * first so a command containing asterisks is treated as code
 * (`kubectl get pods -o jsonpath='{.items[*].metadata.name}'`), while bold is
 * non-greedy and formatted recursively so a code span nested inside bold
 * still renders (**Generators with `--dry-run=client -o yaml`**).
 */
const TOKEN = /`([^`]+)`|\*\*([^*]+(?:\*(?!\*)[^*]*)*)\*\*/g

/** Returns the formatted nodes for a string, for use inside another element. */
function formatInline(
  text: string,
  depth = 0,
  link: TermLinker | null = null,
  linked: Set<string> = new Set(),
): ReactNode[] {
  const nodes: ReactNode[] = []
  let lastIndex = 0
  let match: RegExpExecArray | null
  const regex = new RegExp(TOKEN.source, 'g')
  // Plain runs may get glossary terms linked; code spans never do.
  const plain = (run: string, key: string) => {
    if (link) nodes.push(...link(run, linked, key))
    else nodes.push(run)
  }

  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) plain(text.slice(lastIndex, match.index), `${depth}-${lastIndex}`)
    const key = `${depth}-${match.index}`
    if (match[1] !== undefined) {
      nodes.push(<code key={`c${key}`}>{match[1]}</code>)
    } else {
      // Recurse so code spans inside bold are still rendered. The depth guard
      // is belt and braces against a pathological string.
      nodes.push(
        <strong key={`b${key}`}>
          {depth < 4 ? formatInline(match[2], depth + 1, link, linked) : match[2]}
        </strong>,
      )
    }
    lastIndex = match.index + match[0].length
  }

  if (lastIndex < text.length) plain(text.slice(lastIndex), `${depth}-${lastIndex}`)
  return nodes
}

/** Inline formatted text, with no wrapper element of its own. */
export function RichText({ text }: { text: string }) {
  const link = useContext(TermLinkerContext)
  return <>{formatInline(text, 0, link)}</>
}

/** One paragraph per string, each inline-formatted. */
export function RichParagraphs({ items }: { items: string[] }) {
  return (
    <>
      {items.map((text, index) => (
        <p key={index}>
          <RichText text={text} />
        </p>
      ))}
    </>
  )
}

/** A bulleted list, each item inline-formatted. */
export function RichList({ items, ordered = false }: { items: string[]; ordered?: boolean }) {
  const Tag = ordered ? 'ol' : 'ul'
  return (
    <Tag>
      {items.map((text, index) => (
        <li key={index}>
          <RichText text={text} />
        </li>
      ))}
    </Tag>
  )
}

/**
 * One answer paragraph that may be a list.
 *
 * A string whose every line starts with "- " renders as a bulleted list, and
 * one whose every line starts with "1. ", "2. " ... as a numbered list. Any
 * other string is a paragraph, with single newlines kept as line breaks.
 * Imported notes are full of lists, and flattening them into one paragraph
 * made them unreadable.
 */
export function RichAnswer({ items }: { items: string[] }) {
  return (
    <>
      {items.map((text, index) => {
        const lines = text.split('\n').filter((line) => line.trim() !== '')
        if (lines.length > 0 && lines.every((line) => /^\s*[-*] /.test(line))) {
          return (
            <ul key={index}>
              {lines.map((line, lIndex) => (
                <li key={lIndex}>
                  <RichText text={line.replace(/^\s*[-*] /, '')} />
                </li>
              ))}
            </ul>
          )
        }
        if (lines.length > 0 && lines.every((line) => /^\s*\d+[.)] /.test(line))) {
          return (
            <ol key={index}>
              {lines.map((line, lIndex) => (
                <li key={lIndex}>
                  <RichText text={line.replace(/^\s*\d+[.)] /, '')} />
                </li>
              ))}
            </ol>
          )
        }
        return (
          <p key={index}>
            {lines.map((line, lIndex) => (
              <Fragment key={lIndex}>
                <RichText text={line} />
                {lIndex < lines.length - 1 && <br />}
              </Fragment>
            ))}
          </p>
        )
      })}
    </>
  )
}

/**
 * Multi-line prose (an answer or explanation) where blank lines separate
 * paragraphs and single newlines are preserved as line breaks.
 */
export function RichBlock({ text }: { text: string }) {
  const paragraphs = text.split(/\n{2,}/)
  return (
    <>
      {paragraphs.map((paragraph, pIndex) => (
        <p key={pIndex} style={pIndex === paragraphs.length - 1 ? { marginBottom: 0 } : undefined}>
          {paragraph.split('\n').map((line, lIndex, lines) => (
            <Fragment key={lIndex}>
              <RichText text={line} />
              {lIndex < lines.length - 1 && <br />}
            </Fragment>
          ))}
        </p>
      ))}
    </>
  )
}
