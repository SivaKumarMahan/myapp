import type { GraphNode, PipelineKind } from '../lib/configlab/pipeline'

const NODE_WIDTH = 210
const COLUMN_GAP = 56
const ROW_GAP = 18
const HEADER = 30
const LINE = 18
const MAX_CHILDREN = 6
const PAD = 12

const heightOf = (node: GraphNode) =>
  HEADER +
  (node.condition ? LINE : 0) +
  Math.min(node.children.length, MAX_CHILDREN + 1) * LINE +
  10

/** Longest path from a root: the column a node goes in. Cycle-safe. */
function levels(nodes: GraphNode[]): Map<string, number> {
  const byId = new Map(nodes.map((node) => [node.id, node]))
  const memo = new Map<string, number>()
  const visit = (id: string, trail: Set<string>): number => {
    if (memo.has(id)) return memo.get(id) as number
    if (trail.has(id)) return 0
    trail.add(id)
    const deps = (byId.get(id)?.dependsOn ?? []).filter((dep) => byId.has(dep))
    const level = deps.length === 0 ? 0 : 1 + Math.max(...deps.map((dep) => visit(dep, trail)))
    trail.delete(id)
    memo.set(id, level)
    return level
  }
  for (const node of nodes) visit(node.id, new Set())
  return memo
}

const clip = (text: string, length = 30) =>
  text.length > length ? `${text.slice(0, length - 1)}…` : text

/**
 * Stages (Azure Pipelines) or jobs (GitHub Actions, or a jobs-only Azure
 * pipeline) as a left-to-right dependency graph. A dashed arrow is Azure's
 * implicit "after the previous stage"; a solid one is an explicit
 * dependsOn / needs. Nodes with a condition carry it underneath their name.
 */
export function PipelineGraph({ nodes, kind }: { nodes: GraphNode[]; kind: PipelineKind }) {
  if (nodes.length === 0) return <p className="subtle">Nothing to draw yet.</p>
  const level = levels(nodes)
  const columns = new Map<number, GraphNode[]>()
  for (const node of nodes) {
    const column = level.get(node.id) ?? 0
    columns.set(column, [...(columns.get(column) ?? []), node])
  }
  const positions = new Map<string, { x: number; y: number; h: number }>()
  let height = 0
  for (const [column, members] of columns) {
    let y = PAD
    for (const node of members) {
      const h = heightOf(node)
      positions.set(node.id, { x: PAD + column * (NODE_WIDTH + COLUMN_GAP), y, h })
      y += h + ROW_GAP
    }
    height = Math.max(height, y)
  }
  const width = PAD * 2 + columns.size * NODE_WIDTH + (columns.size - 1) * COLUMN_GAP
  const unit = kind === 'azure' && nodes[0]?.kind === 'stage' ? 'stage' : 'job'

  return (
    <figure className="pipeline-graph">
      <div className="pipeline-graph__scroll">
        <svg
          width={width}
          height={height}
          viewBox={`0 0 ${width} ${height}`}
          role="img"
          aria-label={`Pipeline graph: ${nodes.length} ${unit}s. ${nodes
            .map(
              (node) =>
                `${node.label}${node.dependsOn.length ? ` after ${node.dependsOn.join(' and ')}` : ''}`,
            )
            .join('; ')}.`}
        >
          <defs>
            <marker
              id="pipeline-arrow"
              viewBox="0 0 10 10"
              refX="9"
              refY="5"
              markerWidth="7"
              markerHeight="7"
              orient="auto-start-reverse"
            >
              <path d="M0,0 L10,5 L0,10 z" className="pipeline-graph__arrowhead" />
            </marker>
          </defs>
          {nodes.flatMap((node) =>
            node.dependsOn
              .filter((dep) => positions.has(dep))
              .map((dep) => {
                const from = positions.get(dep) as { x: number; y: number; h: number }
                const to = positions.get(node.id) as { x: number; y: number; h: number }
                const x1 = from.x + NODE_WIDTH
                const y1 = from.y + HEADER / 2
                const x2 = to.x - 2
                const y2 = to.y + HEADER / 2
                const bend = Math.max(24, (x2 - x1) / 2)
                return (
                  <path
                    key={`${dep}->${node.id}`}
                    d={`M${x1},${y1} C${x1 + bend},${y1} ${x2 - bend},${y2} ${x2},${y2}`}
                    className={`pipeline-graph__edge${node.implicit ? ' pipeline-graph__edge--implicit' : ''}`}
                    markerEnd="url(#pipeline-arrow)"
                  />
                )
              }),
          )}
          {nodes.map((node) => {
            const { x, y, h } = positions.get(node.id) as { x: number; y: number; h: number }
            const shown = node.children.slice(0, MAX_CHILDREN)
            let row = y + HEADER + (node.condition ? LINE : 0) + 4
            return (
              <g
                key={node.id}
                className={`pipeline-graph__node pipeline-graph__node--${node.kind}`}
              >
                <rect
                  x={x}
                  y={y}
                  width={NODE_WIDTH}
                  height={h}
                  rx={8}
                  className="pipeline-graph__box"
                />
                <rect
                  x={x}
                  y={y}
                  width={NODE_WIDTH}
                  height={HEADER}
                  rx={8}
                  className="pipeline-graph__header"
                />
                <rect
                  x={x}
                  y={y + HEADER - 8}
                  width={NODE_WIDTH}
                  height={8}
                  className="pipeline-graph__header"
                />
                <text x={x + 10} y={y + 19} className="pipeline-graph__title">
                  {clip(node.label, 26)}
                </text>
                {node.condition && (
                  <text x={x + 10} y={y + HEADER + 13} className="pipeline-graph__condition">
                    {clip(`if: ${node.condition}`, 31)}
                  </text>
                )}
                {shown.map((child, index) => {
                  row += index === 0 ? 0 : LINE
                  return (
                    <text
                      key={`${child}-${index}`}
                      x={x + 12}
                      y={row + 10}
                      className="pipeline-graph__child"
                    >
                      {node.kind === 'stage' ? '▸ ' : '• '}
                      {clip(child)}
                    </text>
                  )
                })}
                {node.children.length > MAX_CHILDREN && (
                  <text x={x + 12} y={row + LINE + 10} className="pipeline-graph__more">
                    + {node.children.length - MAX_CHILDREN} more
                  </text>
                )}
              </g>
            )
          })}
        </svg>
      </div>
      <figcaption className="subtle pipeline-graph__caption">
        {kind === 'azure' ? 'Azure Pipelines' : 'GitHub Actions'}: {nodes.length} {unit}
        {nodes.length === 1 ? '' : 's'}. Solid arrows are {kind === 'azure' ? 'dependsOn' : 'needs'}
        {kind === 'azure' && nodes.some((node) => node.implicit)
          ? '; dashed arrows are the default order (each stage waits for the one before)'
          : ''}
        .{unit === 'job' ? ' Jobs without an arrow between them run in parallel.' : ''}
      </figcaption>
    </figure>
  )
}
