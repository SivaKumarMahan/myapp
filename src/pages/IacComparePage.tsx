import { useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { CopyButton } from '../components/ui/CopyButton'
import { RichText } from '../components/ui/RichText'
import { conceptLines, iacResources, type IacLanguage } from '../content/iac'
import { highlightCode } from '../lib/highlight'

const LANGUAGES: { id: IacLanguage; label: string; highlight: 'json' | 'bicep' | 'hcl' }[] = [
  { id: 'arm', label: 'ARM JSON', highlight: 'json' },
  { id: 'bicep', label: 'Bicep', highlight: 'bicep' },
  { id: 'terraform', label: 'Terraform', highlight: 'hcl' },
]

function CodePane({
  code,
  language,
  lines,
  label,
}: {
  code: string
  language: (typeof LANGUAGES)[number]
  lines: Set<number>
  label: string
}) {
  const rendered = useMemo(
    () => code.split('\n').map((line) => highlightCode(line, language.highlight) || ' '),
    [code, language.highlight],
  )
  return (
    <figure className="iac-pane">
      <figcaption className="iac-pane__head">
        <strong>{language.label}</strong>
        <span className="subtle">{code.split('\n').length} lines</span>
        <CopyButton text={code} />
      </figcaption>
      <pre className="iac-code" tabIndex={0} aria-label={`${label} in ${language.label}`}>
        <code>
          {rendered.map((html, index) => (
            <span
              key={index}
              className={`iac-line${lines.has(index) ? ' is-hit' : ''}`}
              // highlight.js output: escaped source with span markup only.
              dangerouslySetInnerHTML={{ __html: `${html}\n` }}
            />
          ))}
        </code>
      </pre>
    </figure>
  )
}

/**
 * IaC compare: the same resource in ARM JSON, Bicep and Terraform. Pick a
 * concept to highlight it in all three and read how they differ.
 */
export function IacComparePage() {
  const [params, setParams] = useSearchParams()
  const resource =
    iacResources.find((entry) => entry.id === params.get('resource')) ?? iacResources[0]
  const [conceptId, setConceptId] = useState<string | null>(null)
  const concept = resource.concepts.find((entry) => entry.id === conceptId) ?? null
  const counts = Object.fromEntries(
    LANGUAGES.map((language) => [language.id, resource[language.id].split('\n').length]),
  )

  return (
    <div className="page page--wide stack">
      <header className="page-header">
        <h1>IaC compare</h1>
        <p className="page-header__meta">
          The same Azure resource in ARM JSON, Bicep and Terraform, side by side. Tap a concept to
          highlight it in all three and see how they differ.
        </p>
      </header>
      <div className="chip-row" role="tablist" aria-label="Resource">
        {iacResources.map((entry) => (
          <button
            key={entry.id}
            type="button"
            role="tab"
            className="chip"
            aria-selected={entry.id === resource.id}
            onClick={() => {
              setParams({ resource: entry.id }, { replace: true })
              setConceptId(null)
            }}
          >
            {entry.title}
          </button>
        ))}
      </div>
      <p style={{ margin: 0 }}>
        {resource.summary}{' '}
        <span className="subtle">
          Lines: ARM {counts.arm} · Bicep {counts.bicep} · Terraform {counts.terraform}.
        </span>
      </p>
      <div className="chip-row" role="group" aria-label="Concepts">
        {resource.concepts.map((entry) => (
          <button
            key={entry.id}
            type="button"
            className="chip"
            aria-pressed={entry.id === conceptId}
            onClick={() => setConceptId(entry.id === conceptId ? null : entry.id)}
          >
            {entry.label}
          </button>
        ))}
      </div>
      {concept && (
        <p className="iac-note" role="status">
          <strong>{concept.label}:</strong> <RichText text={concept.note} />
        </p>
      )}
      <div className="iac-grid">
        {LANGUAGES.map((language) => {
          const lines = new Set(
            concept ? conceptLines(resource[language.id], concept.match[language.id]) : [],
          )
          return (
            <div key={language.id} className="stack-sm">
              <CodePane
                code={resource[language.id]}
                language={language}
                lines={lines}
                label={resource.title}
              />
              {concept && lines.size === 0 && (
                <p className="subtle">Not expressed in this version.</p>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
