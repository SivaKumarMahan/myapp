import { Link, useLocation } from 'react-router-dom'
import { courseFromPath } from '../../content/registry'
import { ThemeToggle } from '../ThemeToggle'
import { BrandMark } from './BrandMark'
import { AccountButton } from './AccountButton'

export function TopBar() {
  const { pathname } = useLocation()
  return (
    <header className="top-bar">
      <Link to="/" className="top-bar__brand">
        <BrandMark />
        <span className="top-bar__title">Azure Learning Hub</span>
      </Link>
      <span className="top-bar__spacer" />
      <Link
        to={`${courseFromPath(pathname).course.route}/search`}
        className="btn btn--ghost btn--icon"
        aria-label="Search the course"
      >
        <span aria-hidden="true">🔎</span>
      </Link>
      <Link to="/playground" className="btn btn--ghost btn--icon" aria-label="Code playground">
        <span aria-hidden="true">🧪</span>
      </Link>
      <Link
        to="/progress"
        className="btn btn--ghost btn--icon"
        aria-label="Progress, export and settings"
      >
        <span aria-hidden="true">💾</span>
      </Link>
      <ThemeToggle />
      <AccountButton />
    </header>
  )
}
