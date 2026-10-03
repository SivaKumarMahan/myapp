import { useMemo, useState } from 'react'
import { slaExercises, slaPresets, slaServices, vizKey } from '../../content/visualise'
import {
  availability,
  downtimeMinutes,
  formatDuration,
  formatPercent,
  nines,
  type SlaNode,
} from '../../lib/visualise/sla'
import { useProgress } from '../../lib/use-progress'

type Path = number[]

const services = new Map(slaServices.map((service) => [service.id, service]))

function updateAt(
  node: SlaNode,
  path: Path,
  fn: (node: SlaNode) => SlaNode | null,
): SlaNode | null {
  if (path.length === 0) return fn(node)
  if (node.kind === 'service') return node
  const [head, ...rest] = path
  const items = node.items
    .map((item, index) => (index === head ? updateAt(item, rest, fn) : item))
    .filter((item): item is SlaNode => item !== null)
  return { ...node, items }
}

const newService = (): SlaNode => ({ kind: 'service', service: 'app-service' })
const newParallel = (): SlaNode => ({
  kind: 'parallel',
  items: [
    { kind: 'series', items: [newService()], label: 'Path 1' },
    { kind: 'series', items: [newService()], label: 'Path 2' },
  ],
})

const percentLabel = (node: SlaNode) => formatPercent(availability(node, services))

function NodeEditor({
  node,
  path,
  onChange,
}: {
  node: SlaNode
  path: Path
  onChange: (path: Path, fn: (node: SlaNode) => SlaNode | null) => void
}) {
  if (node.kind === 'service') {
    const service = services.get(node.service)
    return (
      <div className="sla-service">
        <select
          className="select"
          aria-label="Service"
          value={node.service}
          onChange={(event) =>
            onChange(path, () =>
              event.target.value === 'custom'
                ? { kind: 'service', service: 'custom', sla: 99.9 }
                : { kind: 'service', service: event.target.value },
            )
          }
        >
          {slaServices.map((entry) => (
            <option key={entry.id} value={entry.id}>
              {entry.name} · {entry.sla}%
            </option>
          ))}
          <option value="custom">Custom…</option>
        </select>
        <div className="row" style={{ gap: '0.4rem' }}>
          <label className="sla-service__value">
            <input
              type="number"
              inputMode="decimal"
              min={0}
              max={100}
              step={0.001}
              aria-label="SLA percent"
              value={node.sla ?? service?.sla ?? 99.9}
              onChange={(event) => {
                const value = Number(event.target.value)
                if (Number.isFinite(value) && value >= 0 && value <= 100)
                  onChange(path, (current) => ({ ...current, sla: value }) as SlaNode)
              }}
            />
            %
          </label>
          {service?.condition && (
            <span className="subtle sla-service__note">{service.condition}</span>
          )}
          <button
            type="button"
            className="btn btn--ghost btn--sm"
            aria-label="Remove"
            onClick={() => onChange(path, () => null)}
          >
            ✕
          </button>
        </div>
      </div>
    )
  }
  if (node.kind === 'parallel') {
    return (
      <div className="sla-parallel">
        <div className="row sla-group-head">
          <strong style={{ flex: '1 1 auto' }}>
            {node.label ?? 'Redundant paths'} · any one is enough
          </strong>
          <span className="sla-chip">{percentLabel(node)}</span>
          <button
            type="button"
            className="btn btn--ghost btn--sm"
            aria-label="Remove group"
            onClick={() => onChange(path, () => null)}
          >
            ✕
          </button>
        </div>
        {node.items.map((item, index) => (
          <div key={index} className="sla-path">
            <NodeEditor node={item} path={[...path, index]} onChange={onChange} />
          </div>
        ))}
        <button
          type="button"
          className="btn btn--secondary btn--sm"
          onClick={() =>
            onChange(path, (current) =>
              current.kind === 'parallel'
                ? {
                    ...current,
                    items: [
                      ...current.items,
                      {
                        kind: 'series',
                        items: [newService()],
                        label: `Path ${current.items.length + 1}`,
                      },
                    ],
                  }
                : current,
            )
          }
        >
          ＋ Path
        </button>
      </div>
    )
  }
  return (
    <div className="sla-series">
      {node.label && (
        <div className="row sla-group-head">
          <strong style={{ flex: '1 1 auto' }}>{node.label}</strong>
          <span className="sla-chip">{percentLabel(node)}</span>
        </div>
      )}
      <ol className="sla-chain">
        {node.items.map((item, index) => (
          <li key={index}>
            <NodeEditor node={item} path={[...path, index]} onChange={onChange} />
          </li>
        ))}
      </ol>
      <div className="button-row">
        <button
          type="button"
          className="btn btn--secondary btn--sm"
          onClick={() =>
            onChange(path, (current) =>
              current.kind === 'service'
                ? current
                : { ...current, items: [...current.items, newService()] },
            )
          }
        >
          ＋ Service
        </button>
        <button
          type="button"
          className="btn btn--secondary btn--sm"
          onClick={() =>
            onChange(path, (current) =>
              current.kind === 'service'
                ? current
                : { ...current, items: [...current.items, newParallel()] },
            )
          }
        >
          ＋ Redundant group
        </button>
      </div>
    </div>
  )
}

/**
 * Composite SLA calculator: chain services in series and parallel and see
 * the overall SLA and the downtime it allows.
 */
export function SlaTab() {
  const { state, recordChallengeCheck } = useProgress()
  const [tree, setTree] = useState<SlaNode>(slaPresets[0].tree)
  const value = useMemo(() => availability(tree, services), [tree])
  const [answers, setAnswers] = useState<Record<string, string>>({})
  const [checked, setChecked] = useState<Record<string, boolean>>({})

  const onChange = (path: Path, fn: (node: SlaNode) => SlaNode | null) =>
    setTree((current) => updateAt(current, path, fn) ?? { kind: 'series', items: [] })

  const periods = [
    { id: 'month', label: 'per month' },
    { id: 'week', label: 'per week' },
    { id: 'year', label: 'per year' },
    { id: 'day', label: 'per day' },
  ] as const

  return (
    <div className="stack">
      <div className="viz-split viz-split--sla">
        <section className="card stack-sm" aria-labelledby="sla-build">
          <div className="row">
            <h2 id="sla-build" className="card__title" style={{ flex: '1 1 auto' }}>
              Your architecture
            </h2>
            <select
              className="select sla-preset"
              aria-label="Start from a preset"
              value=""
              onChange={(event) => {
                const preset = slaPresets.find((entry) => entry.id === event.target.value)
                if (preset) setTree(preset.tree)
              }}
            >
              <option value="">Load a preset…</option>
              {slaPresets.map((preset) => (
                <option key={preset.id} value={preset.id}>
                  {preset.title}
                </option>
              ))}
            </select>
          </div>
          <p className="subtle" style={{ margin: 0 }}>
            A request passes through every step in order (series: all must be up). A redundant group
            survives if any one of its paths is up (parallel).
          </p>
          <NodeEditor node={tree} path={[]} onChange={onChange} />
        </section>

        <section
          className="card stack-sm sla-result"
          aria-labelledby="sla-result"
          aria-live="polite"
        >
          <h2 id="sla-result" className="card__title">
            Composite SLA
          </h2>
          <div className="sla-big">{formatPercent(value)}</div>
          <p className="subtle" style={{ margin: 0 }}>
            {Number.isFinite(nines(value))
              ? `${nines(value).toFixed(1)} nines`
              : 'No downtime allowed'}
          </p>
          <dl className="sla-downtime">
            {periods.map((period) => (
              <div key={period.id}>
                <dt>Downtime {period.label}</dt>
                <dd>{formatDuration(downtimeMinutes(value, period.id))}</dd>
              </div>
            ))}
          </dl>
          <p className="subtle" style={{ margin: 0 }}>
            Series multiplies: 99.95% × 99.99% = 99.94%. Parallel: 1 − (1 − a)(1 − b). It assumes
            failures are independent and failover is automatic - and a global router (Front Door,
            Traffic Manager) in front is itself in series.
          </p>
        </section>
      </div>

      <section className="card stack-sm" aria-labelledby="sla-ex">
        <h2 id="sla-ex" className="card__title">
          Work it out
        </h2>
        {slaExercises.map((exercise) => {
          const solved = state.challenges[vizKey('sla', exercise.id)]?.solvedAt
          const answer = answers[exercise.id] ?? ''
          const result = checked[exercise.id]
          return (
            <form
              key={exercise.id}
              className="stack-sm sla-exercise"
              onSubmit={(event) => {
                event.preventDefault()
                const number = Number(answer.replace('%', '').replace(',', '.').trim())
                const ok =
                  Number.isFinite(number) &&
                  Math.abs(number - exercise.answer) <= exercise.tolerance
                setChecked((current) => ({ ...current, [exercise.id]: ok }))
                if (ok && !solved) recordChallengeCheck(vizKey('sla', exercise.id), true)
              }}
            >
              <p style={{ margin: 0 }}>
                {solved ? '✓ ' : ''}
                {exercise.question}
              </p>
              <div className="row">
                <label className="sla-answer">
                  <span className="visually-hidden">Your answer</span>
                  <input
                    className="search-input"
                    inputMode="decimal"
                    value={answer}
                    placeholder={exercise.kind === 'percent' ? 'e.g. 99.95' : 'minutes'}
                    onChange={(event) =>
                      setAnswers((current) => ({ ...current, [exercise.id]: event.target.value }))
                    }
                  />
                </label>
                <span>{exercise.kind === 'percent' ? '%' : 'min'}</span>
                <button type="submit" className="btn btn--sm">
                  Check
                </button>
                {exercise.tree && (
                  <button
                    type="button"
                    className="btn btn--ghost btn--sm"
                    onClick={() => setTree(exercise.tree as SlaNode)}
                  >
                    Load into builder
                  </button>
                )}
              </div>
              {result !== undefined && (
                <p className={result ? 'viz-ok' : 'viz-bad'} style={{ margin: 0 }}>
                  {result
                    ? `✓ Right: ${exercise.kind === 'percent' ? `${exercise.answer}%` : `about ${exercise.answer} minutes`}.`
                    : '✗ Not quite - build it above and compare.'}
                </p>
              )}
            </form>
          )
        })}
        <p className="subtle" style={{ margin: 0 }}>
          SLA figures are from Microsoft&rsquo;s SLA for Online Services as commonly quoted; tiers
          and conditions matter, so check the current document before you quote one.
        </p>
      </section>
    </div>
  )
}
