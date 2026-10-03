import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

/**
 * Colour contrast, checked from the design tokens themselves so a token
 * change cannot quietly break WCAG AA (4.5:1 for text) in either theme.
 */

const css = readFileSync(resolve(__dirname, 'global.css'), 'utf8')

function block(selector: string): Record<string, string> {
  const start = css.indexOf(selector)
  if (start < 0) throw new Error(`no ${selector} block`)
  const open = css.indexOf('{', start)
  const close = css.indexOf('}', open)
  const tokens: Record<string, string> = {}
  for (const match of css.slice(open + 1, close).matchAll(/--([\w-]+):\s*(#[0-9a-fA-F]{6})\s*;/g))
    tokens[match[1]] = match[2]
  return tokens
}

const light = block(':root {')
const dark = { ...light, ...block(":root[data-theme='dark'] {") }

function luminance(hex: string) {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255)
  const f = (c: number) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4)
  return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b)
}
const ratio = (a: string, b: string) => {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x)
  return (hi + 0.05) / (lo + 0.05)
}

const TEXT_ON_SURFACES: [string, string[]][] = [
  ['text', ['bg', 'bg-elevated', 'bg-sunken', 'surface-hover', 'primary-soft', 'bg-code']],
  ['text-muted', ['bg', 'bg-elevated', 'bg-sunken', 'surface-hover', 'primary-soft']],
  ['text-subtle', ['bg', 'bg-elevated', 'bg-sunken', 'surface-hover', 'primary-soft']],
  ['primary-text', ['primary-soft', 'bg-elevated']],
  ['text-inverted', ['primary', 'primary-hover', 'danger']],
  ['code-comment', ['bg-code']],
  ['success', ['bg-elevated', 'success-soft']],
  ['danger', ['bg-elevated', 'danger-soft']],
  ['warning', ['bg-elevated', 'warning-soft']],
]

describe.each([
  ['light', light],
  ['dark', dark],
])('%s theme contrast', (_, tokens) => {
  it.each(TEXT_ON_SURFACES.flatMap(([fg, bgs]) => bgs.map((bg) => [fg, bg] as const)))(
    '--%s on --%s is at least 4.5:1',
    (fg, bg) => {
      expect(tokens[fg], fg).toBeDefined()
      expect(tokens[bg], bg).toBeDefined()
      expect(ratio(tokens[fg], tokens[bg])).toBeGreaterThanOrEqual(4.5)
    },
  )
})
