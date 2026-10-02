import { useId, useState } from 'react'
import type { ReactNode } from 'react'

/**
 * A small "i" button with an explanation. It opens on hover or keyboard
 * focus, and toggles on tap, so it works with a mouse, a keyboard and a
 * phone alike. The text is always in the DOM as the button's description.
 */
export function InfoTip({ label, children }: { label: string; children: ReactNode }) {
  const id = useId()
  const [open, setOpen] = useState(false)
  const [pinned, setPinned] = useState(false)
  const visible = open || pinned
  return (
    <span
      className="info-tip"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
    >
      <button
        type="button"
        className="info-tip__button"
        aria-label={label}
        aria-describedby={id}
        aria-expanded={visible}
        onFocus={() => setOpen(true)}
        onBlur={() => {
          setOpen(false)
          setPinned(false)
        }}
        onClick={() => setPinned((value) => !value)}
        onKeyDown={(event) => {
          if (event.key === 'Escape') {
            setOpen(false)
            setPinned(false)
          }
        }}
      >
        i
      </button>
      <span id={id} role="tooltip" className="info-tip__panel" hidden={!visible}>
        {children}
      </span>
    </span>
  )
}
