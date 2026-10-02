import { useEffect, useState } from 'react'
import { netKey, peeringBuilds, peeringQuizzes } from '../../content/netlab'
import { peeringStatuses, reach, type PeeringLink, type Topology } from '../../lib/netlab/peering'
import { readJson, writeJson } from '../../lib/local-json'
import { useProgress } from '../../lib/use-progress'
import { Badge } from '../../components/ui/Badge'
import { ScenarioBrief, Solved } from './shared'

const KEY = 'azure-learning-hub.netlab-peering'
const FREE: Topology = peeringQuizzes[0].topology

/** VNets on a circle (a firewall hub in the middle), peerings as lines. */
function TopologyDiagram({ topology, path }: { topology: Topology; path: string[] }) {
  const size = 320
  const center = size / 2
  const hub =
    topology.vnets.find((vnet) => vnet.firewall) ??
    (topology.vnets.length > 2 ? topology.vnets.find((vnet) => /hub/i.test(vnet.name)) : undefined)
  const ring = topology.vnets.filter((vnet) => vnet !== hub)
  const point = new Map<string, { x: number; y: number }>()
  if (hub) point.set(hub.name, { x: center, y: center })
  ring.forEach((vnet, index) => {
    const angle = -Math.PI / 2 + (index / Math.max(1, ring.length)) * Math.PI * 2
    const radius = hub ? 120 : ring.length === 2 ? 100 : 115
    point.set(vnet.name, {
      x: center + radius * Math.cos(angle),
      y: center + radius * Math.sin(angle),
    })
  })
  const onPath = (a: string, b: string) =>
    path.some(
      (name, index) =>
        index > 0 &&
        ((path[index - 1] === a && name === b) || (path[index - 1] === b && name === a)),
    )
  return (
    <svg
      className="peer-diagram"
      viewBox={`0 0 ${size} ${size}`}
      role="img"
      aria-label={`${topology.vnets.length} VNets. ${peeringStatuses(topology)
        .map((status) => `${status.a} and ${status.b}: ${status.state}`)
        .join('. ')}.`}
    >
      {peeringStatuses(topology).map((status) => {
        const a = point.get(status.a)
        const b = point.get(status.b)
        if (!a || !b) return null
        return (
          <g key={`${status.a}-${status.b}`}>
            <line
              x1={a.x}
              y1={a.y}
              x2={b.x}
              y2={b.y}
              className={`peer-diagram__link peer-diagram__link--${status.state.toLowerCase()}${onPath(status.a, status.b) ? ' peer-diagram__link--path' : ''}`}
            />
            <text
              x={(a.x + b.x) / 2}
              y={(a.y + b.y) / 2 - 6}
              className="peer-diagram__state"
              textAnchor="middle"
            >
              {status.state}
            </text>
          </g>
        )
      })}
      {topology.vnets.map((vnet) => {
        const at = point.get(vnet.name) as { x: number; y: number }
        const highlighted = path.includes(vnet.name)
        return (
          <g
            key={vnet.name}
            className={`peer-diagram__vnet${highlighted ? ' peer-diagram__vnet--path' : ''}`}
          >
            <rect x={at.x - 58} y={at.y - 24} width={116} height={48} rx={10} />
            <text x={at.x} y={at.y - 4} textAnchor="middle" className="peer-diagram__name">
              {vnet.firewall ? '🛡 ' : ''}
              {vnet.name}
            </text>
            <text x={at.x} y={at.y + 13} textAnchor="middle" className="peer-diagram__cidr">
              {vnet.addressSpace}
            </text>
          </g>
        )
      })}
    </svg>
  )
}

function TopologyEditor({
  topology,
  onChange,
  locked,
}: {
  topology: Topology
  onChange: (next: Topology) => void
  locked: boolean
}) {
  const names = topology.vnets.map((vnet) => vnet.name)
  const [a, setA] = useState(names[0] ?? '')
  const [b, setB] = useState(names[1] ?? '')
  const [bothSides, setBothSides] = useState(true)
  const setLink = (target: PeeringLink, patch: Partial<PeeringLink>) =>
    onChange({
      ...topology,
      links: topology.links.map((link) => (link === target ? { ...link, ...patch } : link)),
    })
  const addPeering = () => {
    if (!a || !b || a === b) return
    const has = (from: string, to: string) =>
      topology.links.some((link) => link.from === from && link.to === to)
    const links = [...topology.links]
    if (!has(a, b))
      links.push({ from: a, to: b, allowVirtualNetworkAccess: true, allowForwardedTraffic: false })
    if (bothSides && !has(b, a))
      links.push({ from: b, to: a, allowVirtualNetworkAccess: true, allowForwardedTraffic: false })
    onChange({ ...topology, links })
  }
  return (
    <div className="stack-sm">
      <div className="net-table__scroll">
        <table className="net-table">
          <thead>
            <tr>
              <th scope="col">VNet</th>
              <th scope="col">Address space</th>
              <th scope="col">Hub firewall</th>
            </tr>
          </thead>
          <tbody>
            {topology.vnets.map((vnet, index) => (
              <tr key={index}>
                <td className="mono">{vnet.name}</td>
                <td>
                  <input
                    className="select mono"
                    aria-label={`${vnet.name} address space`}
                    value={vnet.addressSpace}
                    disabled={locked}
                    onChange={(event) =>
                      onChange({
                        ...topology,
                        vnets: topology.vnets.map((item, i) =>
                          i === index ? { ...item, addressSpace: event.target.value } : item,
                        ),
                      })
                    }
                  />
                </td>
                <td>
                  <label className="net-toggle">
                    <input
                      type="checkbox"
                      checked={vnet.firewall}
                      disabled={locked}
                      onChange={(event) =>
                        onChange({
                          ...topology,
                          vnets: topology.vnets.map((item, i) =>
                            i === index ? { ...item, firewall: event.target.checked } : item,
                          ),
                        })
                      }
                    />
                    Routes spoke traffic
                  </label>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <h4 className="net-subheading">Peering links (one row per side)</h4>
      <ul className="peer-links">
        {topology.links.map((link, index) => (
          <li key={index} className="peer-link">
            <span className="mono">
              {link.from} → {link.to}
            </span>
            <label className="net-toggle">
              <input
                type="checkbox"
                checked={link.allowVirtualNetworkAccess}
                disabled={locked}
                onChange={(event) =>
                  setLink(link, { allowVirtualNetworkAccess: event.target.checked })
                }
              />
              Allow access
            </label>
            <label className="net-toggle">
              <input
                type="checkbox"
                checked={link.allowForwardedTraffic}
                disabled={locked}
                onChange={(event) => setLink(link, { allowForwardedTraffic: event.target.checked })}
              />
              Allow forwarded traffic
            </label>
            {!locked && (
              <button
                type="button"
                className="btn btn--ghost btn--sm"
                aria-label={`Delete ${link.from} to ${link.to}`}
                onClick={() =>
                  onChange({ ...topology, links: topology.links.filter((_, i) => i !== index) })
                }
              >
                ✕
              </button>
            )}
          </li>
        ))}
      </ul>
      {!locked && (
        <div className="net-add">
          <label className="field">
            <span className="field__label">Peer</span>
            <select className="select" value={a} onChange={(event) => setA(event.target.value)}>
              {names.map((name) => (
                <option key={name}>{name}</option>
              ))}
            </select>
          </label>
          <label className="field">
            <span className="field__label">with</span>
            <select className="select" value={b} onChange={(event) => setB(event.target.value)}>
              {names.map((name) => (
                <option key={name}>{name}</option>
              ))}
            </select>
          </label>
          <label className="net-toggle">
            <input
              type="checkbox"
              checked={bothSides}
              onChange={(event) => setBothSides(event.target.checked)}
            />
            Create both sides
          </label>
          <button
            type="button"
            className="btn btn--secondary"
            onClick={addPeering}
            disabled={a === b}
          >
            Add peering
          </button>
        </div>
      )}
    </div>
  )
}

function ReachCheck({
  topology,
  from,
  to,
  onPath,
}: {
  topology: Topology
  from: string
  to: string
  onPath: (path: string[]) => void
}) {
  const result = reach(topology, from, to)
  useEffect(() => onPath(result.path), [result.path.join('>')]) // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <div className={`notice notice--${result.reachable ? 'success' : 'danger'}`} role="status">
      <span className="notice__icon" aria-hidden="true">
        {result.reachable ? '✓' : '✖'}
      </span>
      <div className="stack-sm">
        <p style={{ margin: 0 }}>
          <strong>
            {result.reachable
              ? `A VM in ${from} can reach a VM in ${to}`
              : `A VM in ${from} cannot reach a VM in ${to}`}
            {result.path.length > 2 ? ` (via ${result.path.slice(1, -1).join(', ')})` : ''}.
          </strong>
        </p>
        <ul style={{ margin: 0, paddingLeft: '1.1rem' }}>
          {result.steps.map((step) => (
            <li key={step}>{step}</li>
          ))}
        </ul>
      </div>
    </div>
  )
}

type Mode = { kind: 'free' } | { kind: 'quiz'; id: string } | { kind: 'build'; id: string }

export function PeeringTab() {
  const { state } = useProgress()
  const [mode, setMode] = useState<Mode>({ kind: 'free' })
  const value = mode.kind === 'free' ? '' : `${mode.kind}:${mode.id}`
  return (
    <div className="stack">
      <label className="field">
        <span className="field__label">Scenario</span>
        <select
          className="select"
          value={value}
          onChange={(event) => {
            const [kind, id] = event.target.value.split(':')
            setMode(kind === 'quiz' || kind === 'build' ? { kind, id } : { kind: 'free' })
          }}
        >
          <option value="">Free play</option>
          <optgroup label="Can it reach? (quiz)">
            {peeringQuizzes.map((quiz) => (
              <option key={quiz.id} value={`quiz:${quiz.id}`}>
                {state.challenges[netKey('peering', quiz.id)]?.solvedAt ? '✓ ' : ''}
                {quiz.title}
              </option>
            ))}
          </optgroup>
          <optgroup label="Build it">
            {peeringBuilds.map((build) => (
              <option key={build.id} value={`build:${build.id}`}>
                {state.challenges[netKey('build', build.id)]?.solvedAt ? '✓ ' : ''}
                {build.title}
              </option>
            ))}
          </optgroup>
        </select>
      </label>
      <PeeringWorkspace key={value || 'free'} mode={mode} />
    </div>
  )
}

function PeeringWorkspace({ mode }: { mode: Mode }) {
  const { state, recordChallengeCheck } = useProgress()
  const quiz =
    mode.kind === 'quiz' ? peeringQuizzes.find((entry) => entry.id === mode.id) : undefined
  const build =
    mode.kind === 'build' ? peeringBuilds.find((entry) => entry.id === mode.id) : undefined
  const storage = `${KEY}.${mode.kind === 'free' ? 'free' : `${mode.kind}.${mode.id}`}`
  const [topology, setTopology] = useState<Topology>(() =>
    quiz
      ? quiz.topology
      : (readJson<Topology | null>(storage, null) ?? (build ? build.topology : FREE)),
  )
  const [from, setFrom] = useState(
    build?.goal.from ?? topology.vnets[1]?.name ?? topology.vnets[0]?.name ?? '',
  )
  const [to, setTo] = useState(
    build?.goal.to ?? topology.vnets[2]?.name ?? topology.vnets[0]?.name ?? '',
  )
  const [path, setPath] = useState<string[]>([])
  const [answers, setAnswers] = useState<Record<number, boolean>>({})
  useEffect(() => {
    if (!quiz) writeJson(storage, topology)
  }, [storage, topology, quiz])

  const buildDone = build ? reach(topology, build.goal.from, build.goal.to).reachable : false
  const quizDone = quiz
    ? quiz.questions.every((question, index) => answers[index] === question.answer)
    : false
  const key = quiz ? netKey('peering', quiz.id) : build ? netKey('build', build.id) : ''
  useEffect(() => {
    if (key && (buildDone || quizDone) && !state.challenges[key]?.solvedAt)
      recordChallengeCheck(key, true)
  }, [key, buildDone, quizDone, state.challenges, recordChallengeCheck])

  return (
    <div className="stack">
      {(quiz || build) && (
        <ScenarioBrief exam={(quiz ?? build)?.exam ?? ''} brief={(quiz ?? build)?.brief ?? ''}>
          {build && (
            <>
              <p style={{ margin: 0 }}>
                Goal: a VM in <span className="mono">{build.goal.from}</span> reaches a VM in{' '}
                <span className="mono">{build.goal.to}</span>.
              </p>
              {buildDone && <Solved text="Connected." />}
            </>
          )}
          {quiz && (
            <ol className="peer-quiz">
              {quiz.questions.map((question, index) => {
                const answered = answers[index]
                const result = reach(quiz.topology, question.from, question.to)
                return (
                  <li key={index}>
                    <p style={{ margin: 0 }}>
                      Can a VM in <span className="mono">{question.from}</span> reach a VM in{' '}
                      <span className="mono">{question.to}</span>?
                    </p>
                    <div className="row">
                      {[true, false].map((choice) => (
                        <button
                          key={String(choice)}
                          type="button"
                          className="chip"
                          aria-pressed={answered === choice}
                          onClick={() => setAnswers((current) => ({ ...current, [index]: choice }))}
                        >
                          {choice ? 'Yes' : 'No'}
                        </button>
                      ))}
                    </div>
                    {answered !== undefined && (
                      <p
                        className={answered === question.answer ? 'cli-check--pass' : 'net-problem'}
                        style={{ margin: 0 }}
                      >
                        {answered === question.answer
                          ? '✓ Right. '
                          : `✖ Not quite - the answer is ${question.answer ? 'yes' : 'no'}. `}
                        {result.steps[result.steps.length - 1]}
                      </p>
                    )}
                  </li>
                )
              })}
            </ol>
          )}
          {quiz && quizDone && <Solved text="All correct." />}
        </ScenarioBrief>
      )}

      <div className="cli-layout">
        <section className="card stack-sm" aria-label="Topology">
          <TopologyDiagram topology={topology} path={path} />
          <p className="subtle" style={{ margin: 0, fontSize: '0.8125rem' }}>
            Solid: Connected. Dashed: Initiated (one side only). Red: overlapping address spaces. 🛡
            = hub that routes spoke traffic through Azure Firewall.
          </p>
          <TopologyEditor topology={topology} onChange={setTopology} locked={Boolean(quiz)} />
          {(build || mode.kind === 'free') && (
            <button
              type="button"
              className="btn btn--ghost btn--sm"
              onClick={() => setTopology(build ? build.topology : FREE)}
            >
              Reset topology
            </button>
          )}
        </section>
        <section className="card stack-sm" aria-label="Reachability">
          <h3 className="card__title" style={{ margin: 0 }}>
            Can it reach?
          </h3>
          <div className="net-add">
            <label className="field">
              <span className="field__label">From a VM in</span>
              <select
                className="select"
                value={from}
                onChange={(event) => setFrom(event.target.value)}
              >
                {topology.vnets.map((vnet) => (
                  <option key={vnet.name}>{vnet.name}</option>
                ))}
              </select>
            </label>
            <label className="field">
              <span className="field__label">to a VM in</span>
              <select className="select" value={to} onChange={(event) => setTo(event.target.value)}>
                {topology.vnets.map((vnet) => (
                  <option key={vnet.name}>{vnet.name}</option>
                ))}
              </select>
            </label>
          </div>
          {quiz && Object.keys(answers).length < quiz.questions.length ? (
            <p className="subtle">Answer the questions first - then use this to explore.</p>
          ) : (
            <ReachCheck topology={topology} from={from} to={to} onPath={setPath} />
          )}
          <ul className="peer-statuses">
            {peeringStatuses(topology).map((status) => (
              <li key={`${status.a}-${status.b}`}>
                <Badge
                  tone={
                    status.state === 'Connected'
                      ? 'success'
                      : status.state === 'Initiated'
                        ? 'warning'
                        : 'danger'
                  }
                >
                  {status.state}
                </Badge>{' '}
                <span className="mono">
                  {status.a} ↔ {status.b}
                </span>
                {status.state !== 'Connected' && <span className="subtle"> - {status.reason}</span>}
              </li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  )
}
