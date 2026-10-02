import { useEffect } from 'react'
import { useProgress } from './use-progress'

const TICK_MS = 15_000
/** Longer than this without a key, click, scroll or touch and you are not studying. */
const IDLE_MS = 2 * 60_000
const INPUT_EVENTS = ['pointerdown', 'keydown', 'scroll', 'touchstart'] as const

/**
 * Counts minutes of active study for the daily goal and the calendar.
 *
 * Time only counts while the tab is visible AND you have interacted recently,
 * so leaving the app open on a desk does not fill in the calendar. Minutes are
 * written whole, once each has been earned, to keep storage writes rare.
 */
export function useStudyTimer() {
  const { addStudyMinutes } = useProgress()

  useEffect(() => {
    let lastInput = Date.now()
    let earnedMs = 0
    const onInput = () => {
      lastInput = Date.now()
    }
    for (const name of INPUT_EVENTS) {
      window.addEventListener(name, onInput, { passive: true, capture: true })
    }
    const timer = window.setInterval(() => {
      if (document.visibilityState !== 'visible' || Date.now() - lastInput > IDLE_MS) return
      earnedMs += TICK_MS
      if (earnedMs >= 60_000) {
        earnedMs -= 60_000
        addStudyMinutes(1)
      }
    }, TICK_MS)
    return () => {
      window.clearInterval(timer)
      for (const name of INPUT_EVENTS) window.removeEventListener(name, onInput, { capture: true })
    }
  }, [addStudyMinutes])
}
