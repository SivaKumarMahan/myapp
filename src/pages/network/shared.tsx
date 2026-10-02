import type { ReactNode } from 'react'
import { Badge } from '../../components/ui/Badge'
import { RichText } from '../../components/ui/RichText'

/** "Free play" plus a list of scenarios, with a tick on the solved ones. */
export function ScenarioPicker({
  label,
  value,
  options,
  onChange,
}: {
  label: string
  value: string
  options: { id: string; title: string; solved: boolean }[]
  onChange: (id: string) => void
}) {
  return (
    <label className="field">
      <span className="field__label">{label}</span>
      <select className="select" value={value} onChange={(event) => onChange(event.target.value)}>
        <option value="">Free play</option>
        {options.map((option) => (
          <option key={option.id} value={option.id}>
            {option.solved ? '✓ ' : ''}
            {option.title}
          </option>
        ))}
      </select>
    </label>
  )
}

export function ScenarioBrief({
  exam,
  brief,
  children,
}: {
  exam: string
  brief: string
  children?: ReactNode
}) {
  return (
    <div className="card stack-sm">
      <div className="row">
        <Badge>{exam}</Badge>
      </div>
      <p style={{ margin: 0 }}>
        <RichText text={brief} />
      </p>
      {children}
    </div>
  )
}

export function Checklist({ items }: { items: { description: string; passed: boolean }[] }) {
  return (
    <ul className="cli-checks" aria-label="Requirements">
      {items.map((item) => (
        <li key={item.description} className={item.passed ? 'cli-check--pass' : 'cli-check--todo'}>
          <span aria-hidden="true">{item.passed ? '✓' : '○'}</span>{' '}
          <RichText text={item.description} />
          <span className="visually-hidden">{item.passed ? ' (done)' : ' (not yet)'}</span>
        </li>
      ))}
    </ul>
  )
}

export function Solved({ text = 'Solved.' }: { text?: string }) {
  return (
    <div className="notice notice--success" role="status">
      <span className="notice__icon" aria-hidden="true">
        🎉
      </span>
      <p style={{ margin: 0 }}>
        <strong>{text}</strong>
      </p>
    </div>
  )
}
