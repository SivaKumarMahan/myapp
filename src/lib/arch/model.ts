/**
 * The architecture builder's design model: service nodes on a canvas and
 * directed connections between them ("from" sends traffic to / depends on
 * "to"). Pure data, so designs save into the progress record and export.
 */

export type PropValue = string | number | boolean

export interface PropDef {
  key: string
  label: string
  kind: 'bool' | 'select' | 'number' | 'text'
  options?: string[]
  min?: number
  max?: number
  default: PropValue
}

export interface ServiceType {
  id: string
  name: string
  /** Short text badge drawn on the node - no vendor icons. */
  badge: string
  category: 'entry' | 'edge' | 'compute' | 'data' | 'network' | 'security' | 'ops'
  /** No region (global service, or the internet). */
  global?: boolean
  props: PropDef[]
  description: string
}

export interface ArchNode {
  id: string
  type: string
  label: string
  x: number
  y: number
  region?: string
  props: Record<string, PropValue>
}

export interface ArchEdge {
  id: string
  from: string
  to: string
}

export interface Design {
  id: string
  name: string
  scenarioId?: string
  nodes: ArchNode[]
  edges: ArchEdge[]
  updatedAt: number
}

export const NODE_W = 150
export const NODE_H = 58
export const GRID = 20
export const CANVAS = { width: 1200, height: 760 }

export const snap = (value: number) => Math.round(value / GRID) * GRID

export const clampToCanvas = (x: number, y: number) => ({
  x: Math.max(0, Math.min(CANVAS.width - NODE_W, snap(x))),
  y: Math.max(0, Math.min(CANVAS.height - NODE_H, snap(y))),
})

export function defaultProps(type: ServiceType): Record<string, PropValue> {
  return Object.fromEntries(type.props.map((prop) => [prop.key, prop.default]))
}

/** The value of a property, falling back to the type's default. */
export function prop(
  node: ArchNode,
  key: string,
  types: Map<string, ServiceType>,
): PropValue | undefined {
  if (key in node.props) return node.props[key]
  return types.get(node.type)?.props.find((entry) => entry.key === key)?.default
}

/** A free spot for a new node: scans the grid left to right, top to bottom. */
export function freeSpot(nodes: ArchNode[]): { x: number; y: number } {
  for (let y = 40; y < CANVAS.height - NODE_H; y += NODE_H + 40) {
    for (let x = 40; x < CANVAS.width - NODE_W; x += NODE_W + 40) {
      const taken = nodes.some(
        (node) => Math.abs(node.x - x) < NODE_W && Math.abs(node.y - y) < NODE_H,
      )
      if (!taken) return { x, y }
    }
  }
  return { x: 40, y: 40 }
}

let counter = 0
export const newId = (prefix: string) => `${prefix}-${Date.now().toString(36)}-${(counter += 1)}`

export function addNode(
  design: Design,
  type: ServiceType,
  region?: string,
): { design: Design; id: string } {
  const spot = freeSpot(design.nodes)
  const sameType = design.nodes.filter((node) => node.type === type.id).length
  const node: ArchNode = {
    id: newId('n'),
    type: type.id,
    label: sameType === 0 ? type.name : `${type.name} ${sameType + 1}`,
    ...spot,
    ...(type.global ? {} : { region: region ?? 'West Europe' }),
    props: defaultProps(type),
  }
  return { design: { ...design, nodes: [...design.nodes, node] }, id: node.id }
}

export function connect(design: Design, from: string, to: string): Design {
  if (from === to) return design
  if (
    design.edges.some(
      (edge) => (edge.from === from && edge.to === to) || (edge.from === to && edge.to === from),
    )
  )
    return design
  return { ...design, edges: [...design.edges, { id: newId('e'), from, to }] }
}

export function removeNode(design: Design, id: string): Design {
  return {
    ...design,
    nodes: design.nodes.filter((node) => node.id !== id),
    edges: design.edges.filter((edge) => edge.from !== id && edge.to !== id),
  }
}

export const removeEdge = (design: Design, id: string): Design => ({
  ...design,
  edges: design.edges.filter((edge) => edge.id !== id),
})

export function updateNode(design: Design, id: string, change: Partial<ArchNode>): Design {
  return {
    ...design,
    nodes: design.nodes.map((node) => (node.id === id ? { ...node, ...change } : node)),
  }
}

/** Where an edge leaves one box and enters the other: the borders, not the centres. */
export function edgePoints(a: ArchNode, b: ArchNode) {
  const ca = { x: a.x + NODE_W / 2, y: a.y + NODE_H / 2 }
  const cb = { x: b.x + NODE_W / 2, y: b.y + NODE_H / 2 }
  const clip = (c: { x: number; y: number }, toward: { x: number; y: number }) => {
    const dx = toward.x - c.x
    const dy = toward.y - c.y
    if (dx === 0 && dy === 0) return c
    const scale = Math.min(Math.abs(NODE_W / 2 / (dx || 1e-9)), Math.abs(NODE_H / 2 / (dy || 1e-9)))
    return { x: c.x + dx * scale, y: c.y + dy * scale }
  }
  return { start: clip(ca, cb), end: clip(cb, ca) }
}
