import '@testing-library/jest-dom/vitest'
import { vi } from 'vitest'

/*
 * The suite uses its own access list, not the one the app ships with.
 *
 * `src/access/allowed-emails.ts` is meant to be edited - adding and removing
 * people is the whole point of it - so no test may depend on what is in it.
 * Mocking it here, once, keeps every test that signs in working whoever is on
 * the real list. The real file is still checked for being usable, by
 * `src/lib/access.test.ts`, which reads it with `importActual`.
 */
vi.mock('../access/allowed-emails', () => ({
  allowedEmails: ['learner@example.test', 'second.learner@example.test', '@team.example.test'],
}))

// jsdom does not implement scrollTo, and the app shell calls it on every route
// change. Stub it so route-change effects do not throw during tests.
// The runner tests under server/ use the node environment, which has no window.
if (typeof window !== 'undefined') window.scrollTo = (() => {}) as typeof window.scrollTo

// Nor scrollIntoView, which in-page anchors (#domain-...) use.
if (typeof window !== 'undefined' && !Element.prototype.scrollIntoView) {
  Element.prototype.scrollIntoView = () => {}
}

// CodeMirror measures text with Range rects, which jsdom leaves out.
if (typeof window !== 'undefined' && !Range.prototype.getClientRects) {
  const empty = () => ({
    x: 0,
    y: 0,
    width: 0,
    height: 0,
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    toJSON: () => ({}),
  })
  Range.prototype.getBoundingClientRect = empty as () => DOMRect
  Range.prototype.getClientRects = (() => ({
    length: 0,
    item: () => null,
    [Symbol.iterator]: [][Symbol.iterator],
  })) as unknown as () => DOMRectList
}

// Nor does it implement matchMedia, which the theme handling touches indirectly.
if (typeof window !== 'undefined' && !window.matchMedia) {
  window.matchMedia = ((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  })) as typeof window.matchMedia
}
