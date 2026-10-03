import { CANVAS, NODE_H, NODE_W, edgePoints, type Design, type ServiceType } from './model'

/**
 * Standalone SVG for a design: fixed light colours (CSS variables would not
 * resolve outside the app), system fonts, and nothing external - so the file
 * opens anywhere and converts cleanly to PNG.
 */

export const CATEGORY_COLOUR: Record<ServiceType['category'], string> = {
  entry: '#475569',
  edge: '#6d28d9',
  compute: '#1d4ed8',
  data: '#0f7a52',
  network: '#0e7490',
  security: '#96590a',
  ops: '#be185d',
}

const escape = (text: string) =>
  text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

const clip = (text: string, length: number) =>
  text.length > length ? `${text.slice(0, length - 1)}…` : text

/** The part of the canvas actually used, with a margin. */
export function bounds(design: Design) {
  if (design.nodes.length === 0) return { x: 0, y: 0, width: 400, height: 200 }
  const xs = design.nodes.map((node) => node.x)
  const ys = design.nodes.map((node) => node.y)
  const x = Math.max(0, Math.min(...xs) - 30)
  const y = Math.max(0, Math.min(...ys) - 30)
  return {
    x,
    y,
    width: Math.min(CANVAS.width, Math.max(...xs) + NODE_W + 30) - x,
    height: Math.min(CANVAS.height, Math.max(...ys) + NODE_H + 30) - y + 24,
  }
}

export function designToSvg(design: Design, types: Map<string, ServiceType>): string {
  const box = bounds(design)
  const byId = new Map(design.nodes.map((node) => [node.id, node]))
  const parts: string[] = []
  parts.push(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${box.width}" height="${box.height}" viewBox="${box.x} ${box.y} ${box.width} ${box.height}" font-family="Segoe UI, system-ui, -apple-system, sans-serif">`,
    `<title>${escape(design.name)}</title>`,
    `<defs><marker id="arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 z" fill="#64748b"/></marker></defs>`,
    `<rect x="${box.x}" y="${box.y}" width="${box.width}" height="${box.height}" fill="#ffffff"/>`,
  )
  for (const edge of design.edges) {
    const a = byId.get(edge.from)
    const b = byId.get(edge.to)
    if (!a || !b) continue
    const { start, end } = edgePoints(a, b)
    parts.push(
      `<line x1="${start.x.toFixed(1)}" y1="${start.y.toFixed(1)}" x2="${end.x.toFixed(1)}" y2="${end.y.toFixed(1)}" stroke="#64748b" stroke-width="1.6" marker-end="url(#arrow)"/>`,
    )
  }
  for (const node of design.nodes) {
    const type = types.get(node.type)
    const colour = CATEGORY_COLOUR[type?.category ?? 'entry']
    parts.push(
      `<g>`,
      `<rect x="${node.x}" y="${node.y}" width="${NODE_W}" height="${NODE_H}" rx="10" fill="#ffffff" stroke="${colour}" stroke-width="2"/>`,
      `<rect x="${node.x}" y="${node.y}" width="8" height="${NODE_H}" rx="4" fill="${colour}"/>`,
      `<text x="${node.x + 16}" y="${node.y + 19}" font-size="11" font-weight="700" fill="${colour}">${escape(type?.badge ?? '?')}</text>`,
      `<text x="${node.x + 16}" y="${node.y + 37}" font-size="13" font-weight="600" fill="#131722">${escape(clip(node.label, 19))}</text>`,
      node.region
        ? `<text x="${node.x + 16}" y="${node.y + 51}" font-size="10" fill="#4d566b">${escape(node.region)}</text>`
        : '',
      `</g>`,
    )
  }
  parts.push(
    `<text x="${box.x + 8}" y="${box.y + box.height - 8}" font-size="10" fill="#66708a">${escape(design.name)} · Azure Learning Hub</text>`,
    `</svg>`,
  )
  return parts.join('')
}

const download = (blob: Blob, name: string) => {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = name
  document.body.append(link)
  link.click()
  link.remove()
  window.setTimeout(() => URL.revokeObjectURL(url), 1000)
}

const fileName = (design: Design, extension: string) =>
  `${
    design.name
      .trim()
      .replace(/[^\w.-]+/g, '-')
      .replace(/^-|-$/g, '') || 'architecture'
  }.${extension}`

export function downloadSvg(design: Design, types: Map<string, ServiceType>) {
  download(
    new Blob([designToSvg(design, types)], { type: 'image/svg+xml' }),
    fileName(design, 'svg'),
  )
}

/** Renders the SVG onto a canvas at 2x and saves a PNG. */
export function downloadPng(design: Design, types: Map<string, ServiceType>): Promise<void> {
  const svg = designToSvg(design, types)
  const box = bounds(design)
  return new Promise((resolve, reject) => {
    const image = new Image()
    image.onload = () => {
      const canvas = document.createElement('canvas')
      canvas.width = box.width * 2
      canvas.height = box.height * 2
      const context = canvas.getContext('2d')
      if (!context) return reject(new Error('Canvas is not available'))
      context.scale(2, 2)
      context.drawImage(image, 0, 0)
      canvas.toBlob((blob) => {
        if (!blob) return reject(new Error('Could not create the PNG'))
        download(blob, fileName(design, 'png'))
        resolve()
      }, 'image/png')
    }
    image.onerror = () => reject(new Error('Could not render the diagram'))
    image.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`
  })
}
