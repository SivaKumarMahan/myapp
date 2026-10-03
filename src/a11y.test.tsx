import { render, screen } from '@testing-library/react'
import axe from 'axe-core'
import { beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { App } from './App'
import { signInForTest } from './test/session'

/**
 * Automated accessibility checks (axe-core) on the main pages. Colour
 * contrast needs real layout, so it is checked from the tokens in
 * styles/contrast.test.ts and in a real browser instead.
 */

const PAGES: [string, RegExp][] = [
  ['/', /Azure Learning Hub|Welcome|Your progress/i],
  ['/interview', /Interview preparation/i],
  ['/az104/topics/az1-rbac', /role-based access control/i],
  ['/settings', /^Settings$/],
  ['/progress', /Progress/i],
  ['/glossary', /^Glossary$/],
  ['/guided-labs/az104-storage', /storage account/i],
  ['/incidents', /Incident labs/i],
  ['/roles', /Roles & skills/i],
]

describe('accessibility (axe)', () => {
  beforeAll(async () => {
    await Promise.all([
      import('./pages/SettingsPage'),
      import('./pages/GlossaryPage'),
      import('./pages/GuidedLabsPage'),
      import('./pages/IncidentLabsPage'),
      import('./pages/RolesPages'),
    ])
  }, 30_000)

  beforeEach(() => {
    window.localStorage.clear()
    signInForTest()
  })

  it.each(PAGES)('%s has no axe violations', async (path, heading) => {
    window.history.pushState({}, '', path)
    const { container } = render(<App />)
    await screen.findAllByRole('heading', { level: 1, name: heading }, { timeout: 8000 })
    const results = await axe.run(container, {
      rules: { 'color-contrast': { enabled: false }, region: { enabled: false } },
      resultTypes: ['violations'],
    })
    const summary = results.violations.map(
      (violation) =>
        `${violation.id}: ${violation.nodes
          .map((node) => node.target.join(' '))
          .slice(0, 3)
          .join(' | ')}`,
    )
    expect(summary).toEqual([])
  })
})
