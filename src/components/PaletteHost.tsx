import { lazy, Suspense, useCallback, useEffect, useRef, useState } from 'react'

import { OPEN_PALETTE_EVENT } from './palette-events'

const CommandPalette = lazy(() => import('./CommandPalette'))

/**
 * Listens for Ctrl/⌘+K (and the top bar's search button) and mounts the
 * command palette on demand - its index is only built the first time.
 * Focus returns to where it was when the palette closes.
 */
export function PaletteHost() {
  const [open, setOpen] = useState(false)
  const returnFocus = useRef<HTMLElement | null>(null)

  const show = useCallback(() => {
    returnFocus.current =
      document.activeElement instanceof HTMLElement ? document.activeElement : null
    setOpen(true)
  }, [])
  const close = useCallback(() => {
    setOpen(false)
    window.setTimeout(() => returnFocus.current?.focus(), 0)
  }, [])

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault()
        if (open) close()
        else show()
      }
    }
    const onOpen = () => show()
    window.addEventListener('keydown', onKey)
    window.addEventListener(OPEN_PALETTE_EVENT, onOpen)
    return () => {
      window.removeEventListener('keydown', onKey)
      window.removeEventListener(OPEN_PALETTE_EVENT, onOpen)
    }
  }, [open, show, close])

  if (!open) return null
  return (
    <Suspense fallback={null}>
      <CommandPalette onClose={close} />
    </Suspense>
  )
}
