import { useEffect, useMemo, useRef, useState, type KeyboardEvent, type PointerEvent } from 'react'
import { Badge, type BadgeTone } from '../components/ui/Badge'
import { RichText } from '../components/ui/RichText'
import { archKey, archRegions, archScenarios, archServiceById, archServices } from '../content/arch'
import { downloadPng, downloadSvg } from '../lib/arch/export'
import {
  CANVAS,
  NODE_H,
  NODE_W,
  addNode,
  clampToCanvas,
  connect,
  edgePoints,
  newId,
  removeEdge,
  removeNode,
  updateNode,
  type ArchNode,
  type Design,
} from '../lib/arch/model'
import { missingVersus, requirementMet, review, type Severity } from '../lib/arch/rules'
import { useProgress } from '../lib/use-progress'

const SEVERITY_TONE: Record<Severity, BadgeTone> = {
  error: 'danger',
  warning: 'warning',
  info: 'neutral',
}

const blank = (name = 'My architecture', scenarioId?: string): Design => ({
  id: newId('design'),
  name,
  ...(scenarioId ? { scenarioId } : {}),
  nodes: [],
  edges: [],
  updatedAt: Date.now(),
})

interface CanvasProps {
  design: Design
  readOnly?: boolean
  selectedNode?: string | null
  selectedEdge?: string | null
  highlight?: Set<string>
  connectFrom?: string | null
  onNodeTap?: (id: string) => void
  onEdgeTap?: (id: string) => void
  onMove?: (id: string, x: number, y: number) => void
  onDelete?: (id: string) => void
  label: string
}

/** The diagram itself: plain SVG, generic shapes, draggable with mouse, touch or keyboard. */
function ArchCanvas({
  design,
  readOnly,
  selectedNode,
  selectedEdge,
  highlight,
  connectFrom,
  onNodeTap,
  onEdgeTap,
  onMove,
  onDelete,
  label,
}: CanvasProps) {
  const svgRef = useRef<SVGSVGElement>(null)
  const drag = useRef<{
    id: string
    dx: number
    dy: number
    moved: boolean
    startX: number
    startY: number
  } | null>(null)
  const [live, setLive] = useState<{ id: string; x: number; y: number } | null>(null)
  const byId = new Map(design.nodes.map((node) => [node.id, node]))
  const position = (node: ArchNode) =>
    live && live.id === node.id ? { ...node, x: live.x, y: live.y } : node

  const toCanvas = (event: PointerEvent) => {
    const svg = svgRef.current
    const matrix = svg?.getScreenCTM?.()
    if (!svg || !matrix) return null
    const point = svg.createSVGPoint()
    point.x = event.clientX
    point.y = event.clientY
    return point.matrixTransform(matrix.inverse())
  }

  const onPointerDown = (event: PointerEvent, node: ArchNode) => {
    if (readOnly) return
    const point = toCanvas(event)
    drag.current = {
      id: node.id,
      dx: point ? point.x - node.x : 0,
      dy: point ? point.y - node.y : 0,
      moved: false,
      startX: event.clientX,
      startY: event.clientY,
    }
    ;(event.currentTarget as Element).setPointerCapture?.(event.pointerId)
  }
  const onPointerMove = (event: PointerEvent) => {
    const current = drag.current
    if (!current) return
    if (
      !current.moved &&
      Math.hypot(event.clientX - current.startX, event.clientY - current.startY) < 6
    )
      return
    const point = toCanvas(event)
    if (!point) return
    current.moved = true
    setLive({ id: current.id, ...clampToCanvas(point.x - current.dx, point.y - current.dy) })
  }
  const onPointerUp = () => {
    const current = drag.current
    drag.current = null
    if (!current) return
    if (current.moved && live) onMove?.(current.id, live.x, live.y)
    else onNodeTap?.(current.id)
    setLive(null)
  }

  const onKey = (event: KeyboardEvent, node: ArchNode) => {
    if (readOnly) return
    const step = event.shiftKey ? 60 : 20
    const moves: Record<string, [number, number]> = {
      ArrowLeft: [-step, 0],
      ArrowRight: [step, 0],
      ArrowUp: [0, -step],
      ArrowDown: [0, step],
    }
    if (moves[event.key]) {
      event.preventDefault()
      const [dx, dy] = moves[event.key]
      const next = clampToCanvas(node.x + dx, node.y + dy)
      onMove?.(node.id, next.x, next.y)
    } else if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      onNodeTap?.(node.id)
    } else if (event.key === 'Delete' || event.key === 'Backspace') {
      event.preventDefault()
      onDelete?.(node.id)
    }
  }

  return (
    <div className="arch-canvas">
      <svg
        ref={svgRef}
        viewBox={`0 0 ${CANVAS.width} ${CANVAS.height}`}
        width={CANVAS.width}
        height={CANVAS.height}
        role="group"
        aria-label={label}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={() => {
          drag.current = null
          setLive(null)
        }}
      >
        <defs>
          <pattern id="arch-grid" width={20} height={20} patternUnits="userSpaceOnUse">
            <circle cx={1} cy={1} r={1} className="arch-grid-dot" />
          </pattern>
          <marker
            id="arch-arrow"
            viewBox="0 0 10 10"
            refX="9"
            refY="5"
            markerWidth="7"
            markerHeight="7"
            orient="auto-start-reverse"
          >
            <path d="M0,0 L10,5 L0,10 z" className="arch-arrowhead" />
          </marker>
        </defs>
        <rect width={CANVAS.width} height={CANVAS.height} fill="url(#arch-grid)" />
        {design.edges.map((edge) => {
          const a = byId.get(edge.from)
          const b = byId.get(edge.to)
          if (!a || !b) return null
          const { start, end } = edgePoints(position(a), position(b))
          return (
            <g
              key={edge.id}
              className={`arch-edge${edge.id === selectedEdge ? ' is-selected' : ''}`}
            >
              <line x1={start.x} y1={start.y} x2={end.x} y2={end.y} markerEnd="url(#arch-arrow)" />
              {!readOnly && (
                <line
                  x1={start.x}
                  y1={start.y}
                  x2={end.x}
                  y2={end.y}
                  className="arch-edge__hit"
                  onClick={() => onEdgeTap?.(edge.id)}
                >
                  <title>{`${a.label} → ${b.label}`}</title>
                </line>
              )}
            </g>
          )
        })}
        {design.nodes.map((raw) => {
          const node = position(raw)
          const type = archServiceById.get(node.type)
          const classes = [
            'arch-node',
            `arch-node--${type?.category ?? 'entry'}`,
            node.id === selectedNode ? 'is-selected' : '',
            highlight?.has(node.id) ? 'is-flagged' : '',
            node.id === connectFrom ? 'is-source' : '',
          ].join(' ')
          return (
            <g
              key={node.id}
              className={classes}
              tabIndex={readOnly ? -1 : 0}
              role={readOnly ? undefined : 'button'}
              aria-label={`${node.label}, ${type?.name ?? node.type}${node.region ? `, ${node.region}` : ''}`}
              aria-pressed={readOnly ? undefined : node.id === selectedNode}
              onPointerDown={(event) => onPointerDown(event, node)}
              onKeyDown={(event) => onKey(event, node)}
              onClick={(event) => {
                // Keyboard / assistive "click" with no pointer sequence.
                if (event.detail === 0) onNodeTap?.(node.id)
              }}
            >
              <rect
                x={node.x}
                y={node.y}
                width={NODE_W}
                height={NODE_H}
                rx={10}
                className="arch-node__box"
              />
              <rect
                x={node.x}
                y={node.y}
                width={8}
                height={NODE_H}
                rx={4}
                className="arch-node__stripe"
              />
              <text x={node.x + 16} y={node.y + 19} className="arch-node__badge">
                {type?.badge}
              </text>
              <text x={node.x + 16} y={node.y + 37} className="arch-node__label">
                {node.label.length > 19 ? `${node.label.slice(0, 18)}…` : node.label}
              </text>
              {node.region && (
                <text x={node.x + 16} y={node.y + 51} className="arch-node__region">
                  {node.region}
                </text>
              )}
            </g>
          )
        })}
      </svg>
    </div>
  )
}

/**
 * Architecture builder: draw a design from Azure building blocks, get a
 * design review as you go, and compare against a model answer.
 */
export function ArchitecturePage() {
  const { state, saveDesign, deleteDesign, recordChallengeCheck } = useProgress()
  const saved = Object.values(state.designs).sort((a, b) => b.updatedAt - a.updatedAt)
  const [design, setDesign] = useState<Design>(() => (saved[0] as Design | undefined) ?? blank())
  const [selectedNode, setSelectedNode] = useState<string | null>(null)
  const [selectedEdge, setSelectedEdge] = useState<string | null>(null)
  const [connectMode, setConnectMode] = useState(false)
  const [connectFrom, setConnectFrom] = useState<string | null>(null)
  const [highlight, setHighlight] = useState<Set<string>>(new Set())
  const [showModel, setShowModel] = useState(false)
  const [region, setRegion] = useState(archRegions[0])
  const [exportError, setExportError] = useState('')
  const dirty = useRef(false)

  // Persist edits shortly after they stop (dragging changes position a lot).
  useEffect(() => {
    if (!dirty.current) return
    const handle = window.setTimeout(() => {
      saveDesign(design)
      dirty.current = false
    }, 400)
    return () => window.clearTimeout(handle)
  }, [design, saveDesign])

  const change = (next: Design) => {
    dirty.current = true
    setDesign({ ...next, updatedAt: Date.now() })
  }

  const findings = useMemo(() => review(design, archServiceById), [design])
  const scenario = archScenarios.find((entry) => entry.id === design.scenarioId)
  const requirements = scenario
    ? scenario.requirements.map((requirement) => ({
        text: requirement.text,
        met: requirementMet(requirement, design, archServiceById, findings),
      }))
    : []
  const solved = scenario !== undefined && requirements.every((requirement) => requirement.met)
  useEffect(() => {
    if (!solved || !scenario) return
    const key = archKey(scenario.id)
    if (!state.challenges[key]?.solvedAt) recordChallengeCheck(key, true)
  }, [solved, scenario, state.challenges, recordChallengeCheck])

  const selected = design.nodes.find((node) => node.id === selectedNode)
  const selectedType = selected ? archServiceById.get(selected.type) : undefined
  const edge = design.edges.find((entry) => entry.id === selectedEdge)

  const tapNode = (id: string) => {
    setSelectedEdge(null)
    if (connectMode) {
      if (!connectFrom) {
        setConnectFrom(id)
        setSelectedNode(id)
      } else {
        change(connect(design, connectFrom, id))
        setConnectFrom(null)
        setSelectedNode(id)
      }
      return
    }
    setSelectedNode(id)
  }

  const open = (next: Design) => {
    setDesign(next)
    setSelectedNode(null)
    setSelectedEdge(null)
    setConnectFrom(null)
    setHighlight(new Set())
    setShowModel(false)
  }

  const counts = { error: 0, warning: 0, info: 0 }
  for (const finding of findings) counts[finding.severity] += 1
  const nodeName = (id: string) => design.nodes.find((node) => node.id === id)?.label ?? id

  return (
    <div className="page page--wide stack">
      <header className="page-header">
        <h1>Architecture builder</h1>
        <p className="page-header__meta">
          Draw a design from Azure building blocks and get a design review as you go: WAF, private
          endpoints, secrets, backup, monitoring and regions. Pick a scenario to be checked against
          its brief and a model answer.
        </p>
      </header>

      <section className="card stack-sm arch-toolbar" aria-label="Design">
        <div className="viz-form">
          <label className="field">
            <span className="field__label">Design</span>
            <select
              className="select"
              value={saved.some((entry) => entry.id === design.id) ? design.id : ''}
              onChange={(event) => {
                const found = state.designs[event.target.value]
                if (found) open(found as Design)
              }}
            >
              {!saved.some((entry) => entry.id === design.id) && (
                <option value="">{design.name} (unsaved)</option>
              )}
              {saved.map((entry) => (
                <option key={entry.id} value={entry.id}>
                  {entry.name}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            <span className="field__label">Name</span>
            <input
              className="search-input"
              value={design.name}
              onChange={(event) => change({ ...design, name: event.target.value })}
            />
          </label>
          <label className="field">
            <span className="field__label">Start a scenario</span>
            <select
              className="select"
              value=""
              onChange={(event) => {
                const found = archScenarios.find((entry) => entry.id === event.target.value)
                if (found) open(blank(found.title, found.id))
              }}
            >
              <option value="">Choose…</option>
              {archScenarios.map((entry) => (
                <option key={entry.id} value={entry.id}>
                  {state.challenges[archKey(entry.id)]?.solvedAt ? '✓ ' : ''}
                  {entry.title}
                </option>
              ))}
            </select>
          </label>
        </div>
        <div className="button-row">
          <button
            type="button"
            className="btn btn--secondary btn--sm"
            onClick={() => open(blank())}
          >
            New design
          </button>
          <button
            type="button"
            className="btn btn--secondary btn--sm"
            onClick={() => downloadSvg(design, archServiceById)}
            disabled={design.nodes.length === 0}
          >
            Export SVG
          </button>
          <button
            type="button"
            className="btn btn--secondary btn--sm"
            disabled={design.nodes.length === 0}
            onClick={() => {
              setExportError('')
              downloadPng(design, archServiceById).catch((error: unknown) =>
                setExportError(error instanceof Error ? error.message : 'PNG export failed'),
              )
            }}
          >
            Export PNG
          </button>
          {state.designs[design.id] && (
            <button
              type="button"
              className="btn btn--ghost btn--sm"
              onClick={() => {
                if (!window.confirm(`Delete "${design.name}"?`)) return
                deleteDesign(design.id)
                const rest = saved.filter((entry) => entry.id !== design.id)
                open((rest[0] as Design | undefined) ?? blank())
              }}
            >
              Delete design
            </button>
          )}
        </div>
        {exportError && <p className="viz-bad">{exportError}</p>}
      </section>

      {scenario && (
        <section className="card stack-sm" aria-labelledby="arch-brief">
          <div className="row">
            <h2 id="arch-brief" className="card__title" style={{ flex: '1 1 auto' }}>
              {scenario.title}
            </h2>
            {solved && <Badge tone="success">✓ Brief met</Badge>}
          </div>
          <p style={{ margin: 0 }}>
            <RichText text={scenario.prompt} />
          </p>
          <ul className="cli-checks" aria-label="Brief">
            {requirements.map((requirement) => (
              <li
                key={requirement.text}
                className={requirement.met ? 'cli-check--pass' : 'cli-check--todo'}
              >
                <span aria-hidden="true">{requirement.met ? '✓' : '○'}</span> {requirement.text}
              </li>
            ))}
          </ul>
          <button
            type="button"
            className="btn btn--secondary btn--sm"
            style={{ justifySelf: 'start' }}
            onClick={() => setShowModel((value) => !value)}
          >
            {showModel ? 'Hide the model answer' : 'Compare with the model answer'}
          </button>
        </section>
      )}

      <div className="arch-layout">
        <section className="stack-sm" aria-label="Canvas">
          <div className="chip-row" aria-label="Add a service">
            {archServices.map((type) => (
              <button
                key={type.id}
                type="button"
                className={`chip arch-palette arch-palette--${type.category}`}
                title={type.description}
                onClick={() => {
                  const result = addNode(design, type, region)
                  change(result.design)
                  setSelectedNode(result.id)
                }}
              >
                ＋ {type.name}
              </button>
            ))}
          </div>
          <div className="row">
            <button
              type="button"
              className={`btn btn--sm ${connectMode ? '' : 'btn--secondary'}`}
              aria-pressed={connectMode}
              onClick={() => {
                setConnectMode((value) => !value)
                setConnectFrom(null)
              }}
            >
              🔗{' '}
              {connectMode
                ? connectFrom
                  ? `From ${nodeName(connectFrom)}: tap the target`
                  : 'Tap the first service'
                : 'Connect'}
            </button>
            <label className="row" style={{ gap: '0.35rem' }}>
              <span className="subtle">New services in</span>
              <select
                className="select arch-region"
                value={region}
                onChange={(event) => setRegion(event.target.value)}
              >
                {archRegions.map((entry) => (
                  <option key={entry}>{entry}</option>
                ))}
              </select>
            </label>
          </div>
          <ArchCanvas
            design={design}
            label="Architecture canvas. Tab to a service; arrow keys move it, Enter selects or connects, Delete removes it."
            selectedNode={selectedNode}
            selectedEdge={selectedEdge}
            highlight={highlight}
            connectFrom={connectFrom}
            onNodeTap={tapNode}
            onEdgeTap={(id) => {
              setSelectedEdge(id)
              setSelectedNode(null)
            }}
            onMove={(id, x, y) => change(updateNode(design, id, { x, y }))}
            onDelete={(id) => {
              change(removeNode(design, id))
              setSelectedNode(null)
            }}
          />
          {design.nodes.length === 0 && (
            <p className="subtle">
              Add services from the palette, then use Connect to draw how traffic flows.
            </p>
          )}
        </section>

        <aside className="stack-sm arch-side" aria-label="Inspector and review">
          {selected && selectedType && (
            <section className="card stack-sm" aria-labelledby="arch-inspector">
              <h2 id="arch-inspector" className="card__title">
                {selectedType.name}
              </h2>
              <p className="subtle" style={{ margin: 0 }}>
                {selectedType.description}
              </p>
              <label className="field">
                <span className="field__label">Label</span>
                <input
                  className="search-input"
                  value={selected.label}
                  onChange={(event) =>
                    change(updateNode(design, selected.id, { label: event.target.value }))
                  }
                />
              </label>
              {!selectedType.global && (
                <label className="field">
                  <span className="field__label">Region</span>
                  <select
                    className="select"
                    value={selected.region ?? archRegions[0]}
                    onChange={(event) =>
                      change(updateNode(design, selected.id, { region: event.target.value }))
                    }
                  >
                    {archRegions.map((entry) => (
                      <option key={entry}>{entry}</option>
                    ))}
                  </select>
                </label>
              )}
              {selectedType.props.map((definition) => {
                const value = selected.props[definition.key] ?? definition.default
                const set = (next: string | number | boolean) =>
                  change(
                    updateNode(design, selected.id, {
                      props: { ...selected.props, [definition.key]: next },
                    }),
                  )
                if (definition.kind === 'bool')
                  return (
                    <label key={definition.key} className="row">
                      <input
                        type="checkbox"
                        checked={value === true}
                        onChange={(event) => set(event.target.checked)}
                      />
                      {definition.label}
                    </label>
                  )
                if (definition.kind === 'select')
                  return (
                    <label key={definition.key} className="field">
                      <span className="field__label">{definition.label}</span>
                      <select
                        className="select"
                        value={String(value)}
                        onChange={(event) => set(event.target.value)}
                      >
                        {definition.options?.map((option) => (
                          <option key={option}>{option}</option>
                        ))}
                      </select>
                    </label>
                  )
                return (
                  <label key={definition.key} className="field">
                    <span className="field__label">{definition.label}</span>
                    <input
                      className="search-input"
                      type={definition.kind === 'number' ? 'number' : 'text'}
                      min={definition.min}
                      max={definition.max}
                      value={String(value)}
                      onChange={(event) =>
                        set(
                          definition.kind === 'number'
                            ? Math.max(
                                definition.min ?? 0,
                                Math.min(definition.max ?? 999, Number(event.target.value) || 0),
                              )
                            : event.target.value,
                        )
                      }
                    />
                  </label>
                )
              })}
              <div>
                <span className="field__label">Connections</span>
                <ul className="viz-list">
                  {design.edges
                    .filter((entry) => entry.from === selected.id || entry.to === selected.id)
                    .map((entry) => (
                      <li key={entry.id}>
                        {entry.from === selected.id
                          ? `→ ${nodeName(entry.to)}`
                          : `← ${nodeName(entry.from)}`}{' '}
                        <button
                          type="button"
                          className="btn btn--ghost btn--sm"
                          aria-label="Remove connection"
                          onClick={() => change(removeEdge(design, entry.id))}
                        >
                          ✕
                        </button>
                      </li>
                    ))}
                </ul>
              </div>
              <button
                type="button"
                className="btn btn--danger btn--sm"
                onClick={() => {
                  change(removeNode(design, selected.id))
                  setSelectedNode(null)
                }}
              >
                Delete {selected.label}
              </button>
            </section>
          )}
          {edge && (
            <section className="card stack-sm">
              <h2 className="card__title">
                {nodeName(edge.from)} → {nodeName(edge.to)}
              </h2>
              <button
                type="button"
                className="btn btn--danger btn--sm"
                onClick={() => {
                  change(removeEdge(design, edge.id))
                  setSelectedEdge(null)
                }}
              >
                Remove connection
              </button>
            </section>
          )}

          <section className="card stack-sm" aria-labelledby="arch-review">
            <div className="row">
              <h2 id="arch-review" className="card__title" style={{ flex: '1 1 auto' }}>
                Design review
              </h2>
              <Badge tone="danger">{counts.error} errors</Badge>
              <Badge tone="warning">{counts.warning} warnings</Badge>
            </div>
            {findings.length === 0 ? (
              <p className="subtle" style={{ margin: 0 }}>
                {design.nodes.length === 0
                  ? 'Add services to get a review.'
                  : 'No issues found. 🎉'}
              </p>
            ) : (
              <ul className="arch-findings">
                {findings.map((finding, index) => (
                  <li
                    key={`${finding.rule}-${index}`}
                    className={`arch-finding arch-finding--${finding.severity}`}
                  >
                    <button
                      type="button"
                      className="linklike"
                      onClick={() => {
                        setHighlight(new Set(finding.nodes))
                        if (finding.nodes[0]) setSelectedNode(finding.nodes[0])
                      }}
                    >
                      <Badge tone={SEVERITY_TONE[finding.severity]}>{finding.severity}</Badge>{' '}
                      <strong>{finding.title}</strong>
                    </button>
                    <span className="subtle">{finding.detail}</span>
                    <span>
                      <strong>Fix:</strong> {finding.fix}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </aside>
      </div>

      {scenario && showModel && (
        <section className="card stack-sm" aria-labelledby="arch-model">
          <h2 id="arch-model" className="card__title">
            Model answer: {scenario.title}
          </h2>
          <p style={{ margin: 0 }}>{scenario.explanation}</p>
          {missingVersus(design, scenario.model, archServiceById).length > 0 && (
            <p style={{ margin: 0 }}>
              <strong>The model answer also has:</strong>{' '}
              {missingVersus(design, scenario.model, archServiceById)
                .map((entry) => `${entry.name} (${entry.model} vs your ${entry.mine})`)
                .join(' · ')}
            </p>
          )}
          <ArchCanvas
            design={scenario.model}
            readOnly
            label={`Model answer diagram for ${scenario.title}`}
          />
          <button
            type="button"
            className="btn btn--secondary btn--sm"
            style={{ justifySelf: 'start' }}
            onClick={() => {
              dirty.current = true
              open({
                ...scenario.model,
                id: newId('design'),
                name: `${scenario.title} (model copy)`,
                updatedAt: Date.now(),
              })
            }}
          >
            Open a copy to edit
          </button>
        </section>
      )}
    </div>
  )
}
