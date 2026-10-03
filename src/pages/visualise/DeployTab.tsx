import { useEffect, useRef, useState } from 'react'
import { Badge } from '../../components/ui/Badge'
import { deployQuiz, strategies, vizKey } from '../../content/visualise'
import {
  RINGS,
  canSlide,
  errorRate,
  initial,
  isFinished,
  next,
  rollback,
  route,
  setWeight,
  stepLabels,
  type DeployState,
  type StrategyId,
} from '../../lib/visualise/deploy'
import { useProgress } from '../../lib/use-progress'

const W = 460
const ROW = 34
const LB = { x: 170, y: 0 }

interface Packet {
  id: number
  path: string
  version: 'v1' | 'v2'
  error: boolean
}

const reducedMotion = () =>
  typeof window !== 'undefined' &&
  typeof window.matchMedia === 'function' &&
  window.matchMedia('(prefers-reduced-motion: reduce)').matches

/** Users → load balancer → instances, with requests flowing as dots. */
function Diagram({ state }: { state: DeployState }) {
  const height = Math.max(4, state.instances.length) * ROW + 24
  const mid = height / 2
  const positions = new Map(
    state.instances.map((instance, index) => [instance.id, 12 + index * ROW + ROW / 2]),
  )
  const [packets, setPackets] = useState<Packet[]>([])
  const stateRef = useRef(state)
  stateRef.current = state
  const counter = useRef(0)

  useEffect(() => {
    if (reducedMotion()) return
    const handle = window.setInterval(() => {
      const current = stateRef.current
      const target = route(current, Math.random(), Math.random())
      if (!target) return
      const y = 12 + current.instances.indexOf(target) * ROW + ROW / 2
      counter.current += 1
      const packet: Packet = {
        id: counter.current,
        path: `M30,${mid} L${LB.x},${mid} L${W - 130},${y}`,
        version: target.version,
        error: current.failing && target.version === 'v2' && Math.random() < 0.5,
      }
      setPackets((list) => [...list.filter((entry) => counter.current - entry.id < 8), packet])
    }, 180)
    return () => window.clearInterval(handle)
  }, [mid])

  return (
    <svg
      className="deploy-svg"
      viewBox={`0 0 ${W} ${height}`}
      role="img"
      aria-label={`Load balancer sending ${100 - state.weight}% of traffic to v1 and ${state.weight}% to v2 across ${state.instances.length} instances.`}
    >
      <g className="deploy-node">
        <circle cx={22} cy={mid} r={16} />
        <text x={22} y={mid + 4} textAnchor="middle" aria-hidden="true">
          👥
        </text>
      </g>
      <line x1={38} y1={mid} x2={LB.x - 22} y2={mid} className="deploy-edge" />
      <g className="deploy-node">
        <rect x={LB.x - 22} y={mid - 18} width={44} height={36} rx={8} />
        <text x={LB.x} y={mid + 4} textAnchor="middle">
          LB
        </text>
      </g>
      <text x={LB.x} y={mid + 34} textAnchor="middle" className="deploy-weight">
        {100 - state.weight}% | {state.weight}%
      </text>
      {state.instances.map((instance) => {
        const y = positions.get(instance.id) as number
        return (
          <g
            key={instance.id}
            className={`deploy-instance deploy-instance--${instance.version} is-${instance.status}`}
          >
            <line x1={LB.x + 22} y1={mid} x2={W - 130} y2={y} className="deploy-edge" />
            <rect x={W - 128} y={y - 13} width={118} height={26} rx={6} />
            <text x={W - 69} y={y + 4} textAnchor="middle">
              {instance.version} · {instance.id.split('-')[1]}
              {instance.status === 'starting' ? ' (starting)' : ''}
            </text>
          </g>
        )
      })}
      {packets.map((packet) => (
        <circle
          key={packet.id}
          r={4}
          className={`deploy-packet deploy-packet--${packet.version}${packet.error ? ' is-error' : ''}`}
        >
          <animateMotion dur="1.1s" path={packet.path} fill="freeze" />
        </circle>
      ))}
    </svg>
  )
}

/**
 * Deployment strategies, animated: step through a release, move the traffic
 * slider, break v2 on purpose and roll back.
 */
export function DeployTab() {
  const { state: progress, recordChallengeCheck } = useProgress()
  const [strategy, setStrategy] = useState<StrategyId>('blue-green')
  const [failing, setFailing] = useState(false)
  const [sim, setSim] = useState<DeployState>(() => initial('blue-green'))
  const [playing, setPlaying] = useState(false)
  const [answers, setAnswers] = useState<Record<string, StrategyId>>({})
  const info = strategies.find((entry) => entry.id === strategy)

  const reset = (id: StrategyId, broken = failing) => {
    setStrategy(id)
    setSim(initial(id, broken))
    setPlaying(false)
  }

  useEffect(() => {
    if (!playing) return
    if (isFinished(sim)) {
      setPlaying(false)
      return
    }
    const handle = window.setTimeout(() => setSim((current) => next(current)), 2200)
    return () => window.clearTimeout(handle)
  }, [playing, sim])

  const nextLabel = stepLabels[sim.strategy][sim.step]
  const v1 = sim.instances.filter((i) => i.version === 'v1').length
  const v2 = sim.instances.filter((i) => i.version === 'v2').length

  return (
    <div className="stack">
      <div className="chip-row" role="group" aria-label="Strategy">
        {strategies.map((entry) => (
          <button
            key={entry.id}
            type="button"
            className="chip"
            aria-pressed={entry.id === strategy}
            onClick={() => reset(entry.id)}
          >
            {entry.title}
          </button>
        ))}
      </div>

      <section className="card stack-sm" aria-labelledby="deploy-sim">
        <div className="row">
          <h2 id="deploy-sim" className="card__title" style={{ flex: '1 1 auto' }}>
            {info?.title}: v1 → v2
          </h2>
          <Badge
            tone={
              sim.phase === 'done'
                ? 'success'
                : sim.phase === 'rolled-back' || sim.phase === 'halted'
                  ? 'warning'
                  : 'info'
            }
          >
            {sim.phase === 'idle' ? 'v1 live' : sim.phase.replace('-', ' ')}
          </Badge>
        </div>
        <Diagram state={sim} />
        {sim.strategy === 'rings' && (
          <ol className="deploy-rings" aria-label="Rings">
            {RINGS.map((ring, index) => (
              <li
                key={ring.name}
                className={index <= sim.ring && sim.weight >= ring.cumulative ? 'is-on' : ''}
              >
                {ring.name} <span className="subtle">· {ring.cumulative}%</span>
              </li>
            ))}
          </ol>
        )}
        <div className="stat-grid deploy-stats">
          <div className="stat">
            <div className="stat__value">{sim.weight}%</div>
            <div className="stat__label">Traffic on v2</div>
          </div>
          <div className="stat">
            <div className="stat__value">{errorRate(sim)}</div>
            <div className="stat__label">Errors per 100 requests</div>
          </div>
          <div className="stat">
            <div className="stat__value">
              {v1} + {v2}
            </div>
            <div className="stat__label">Instances (v1 + v2)</div>
          </div>
        </div>
        <label className="field">
          <span className="field__label">
            Traffic to v2: {sim.weight}%{' '}
            {!canSlide(sim) &&
              (sim.strategy === 'rolling'
                ? '- follows the ready instances'
                : sim.strategy === 'rings'
                  ? '- set by the ring'
                  : '- available once v2 is running beside v1')}
          </span>
          <input
            type="range"
            min={0}
            max={100}
            step={5}
            value={sim.weight}
            disabled={!canSlide(sim)}
            onChange={(event) =>
              setSim((current) => setWeight(current, Number(event.target.value)))
            }
          />
        </label>
        <div className="button-row">
          <button
            type="button"
            className="btn"
            disabled={isFinished(sim) || playing}
            onClick={() => setSim((current) => next(current))}
          >
            {nextLabel ? `Next: ${nextLabel}` : 'Finished'}
          </button>
          <button
            type="button"
            className="btn btn--secondary"
            disabled={isFinished(sim)}
            onClick={() => setPlaying((value) => !value)}
          >
            {playing ? '⏸ Pause' : '▶ Play'}
          </button>
          <button
            type="button"
            className="btn btn--danger"
            disabled={sim.weight === 0 && v2 === 0}
            onClick={() => {
              setPlaying(false)
              setSim((current) => rollback(current))
            }}
          >
            ↩ Rollback
          </button>
          <button type="button" className="btn btn--ghost" onClick={() => reset(strategy)}>
            Reset
          </button>
        </div>
        <label className="row">
          <input
            type="checkbox"
            checked={failing}
            onChange={(event) => {
              setFailing(event.target.checked)
              setSim((current) => ({ ...current, failing: event.target.checked }))
            }}
          />
          v2 has a bug (half its requests fail)
        </label>
        <ol className="deploy-log" aria-label="What happened" aria-live="polite">
          {[...sim.log].reverse().map((line, index) => (
            <li key={sim.log.length - index}>{line}</li>
          ))}
        </ol>
      </section>

      {info && (
        <section className="card stack-sm">
          <h2 className="card__title">{info.title}</h2>
          <p style={{ margin: 0 }}>{info.summary}</p>
          <div className="viz-side-by-side">
            <div>
              <strong>Good</strong>
              <ul className="viz-list">
                {info.pros.map((item) => (
                  <li key={item}>✓ {item}</li>
                ))}
              </ul>
            </div>
            <div>
              <strong>Watch out</strong>
              <ul className="viz-list">
                {info.cons.map((item) => (
                  <li key={item}>⚠ {item}</li>
                ))}
              </ul>
            </div>
            <div>
              <strong>In Azure</strong>
              <ul className="viz-list">
                {info.azure.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>
          </div>
        </section>
      )}

      <section className="card stack-sm" aria-labelledby="deploy-quiz">
        <h2 id="deploy-quiz" className="card__title">
          Which strategy fits?
        </h2>
        {deployQuiz.map((question) => {
          const picked = answers[question.id]
          const solved = progress.challenges[vizKey('deploy', question.id)]?.solvedAt
          return (
            <div key={question.id} className="stack-sm deploy-quiz">
              <p style={{ margin: 0 }}>
                {solved ? '✓ ' : ''}
                {question.question}
              </p>
              <div className="chip-row" role="group" aria-label="Strategy">
                {strategies.map((entry) => (
                  <button
                    key={entry.id}
                    type="button"
                    className="chip"
                    aria-pressed={picked === entry.id}
                    onClick={() => {
                      setAnswers((current) => ({ ...current, [question.id]: entry.id }))
                      if (entry.id === question.answer && !solved)
                        recordChallengeCheck(vizKey('deploy', question.id), true)
                    }}
                  >
                    {entry.title}
                  </button>
                ))}
              </div>
              {picked && (
                <p
                  className={picked === question.answer ? 'viz-ok' : 'viz-bad'}
                  style={{ margin: 0 }}
                >
                  {picked === question.answer ? '✓ ' : '✗ '}
                  {question.explanation}
                </p>
              )}
            </div>
          )
        })}
      </section>
    </div>
  )
}
