import { Link } from 'react-router-dom'
import { OPEN_PALETTE_EVENT } from '../palette-events'
import { ThemeToggle } from '../ThemeToggle'
import { BrandMark } from './BrandMark'
import { AccountButton } from './AccountButton'

export function TopBar() {
  return (
    <header className="top-bar">
      <Link to="/" className="top-bar__brand">
        <BrandMark />
        <span className="top-bar__title">Azure Learning Hub</span>
      </Link>
      <span className="top-bar__spacer" />
      <button
        type="button"
        className="btn btn--ghost btn--icon"
        aria-label="Search everything (Ctrl+K)"
        aria-keyshortcuts="Control+K Meta+K"
        title="Search everything (Ctrl+K)"
        onClick={() => window.dispatchEvent(new Event(OPEN_PALETTE_EVENT))}
      >
        <span aria-hidden="true">🔎</span>
      </button>
      <Link to="/playground" className="btn btn--ghost btn--icon" aria-label="Code playground">
        <span aria-hidden="true">🧪</span>
      </Link>
      <Link
        to="/progress"
        className="btn btn--ghost btn--icon"
        aria-label="Progress and data: export and import"
      >
        <span aria-hidden="true">💾</span>
      </Link>
      <Link to="/settings" className="btn btn--ghost btn--icon" aria-label="Settings">
        <span aria-hidden="true">⚙️</span>
      </Link>
      <ThemeToggle />
      <AccountButton />
    </header>
  )
}
