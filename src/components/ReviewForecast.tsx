import { useEffect, useRef, useState } from 'react'

const DEFAULT_WIDTH = 600
const HEIGHT = 160
const PAD = { top: 12, right: 8, bottom: 22, left: 30 }
const GAP = 2

const dayLabel = (offset: number, now: number) => {
  if (offset === 0) return 'Today'
  if (offset === 1) return 'Tomorrow'
  const date = new Date(now)
  date.setDate(date.getDate() + offset)
  return date.toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' })
}

/** A "nice" axis maximum: 1, 2, 5 or 10 times a power of ten. */
const niceMax = (value: number) => {
  if (value <= 4) return Math.max(1, value)
  const power = 10 ** Math.floor(Math.log10(value))
  return ([1, 2, 5, 10].map((step) => step * power).find((step) => step >= value) ??
    value) as number
}

/**
 * Reviews falling due on each of the next 30 days, as one bar per day.
 *
 * A single series, so the title names it and there is no legend. Each day is a
 * full-height hit target that shows its count on hover or keyboard focus, and
 * the same numbers are available as a table.
 */
export function ReviewForecast({ counts, now = Date.now() }: { counts: number[]; now?: number }) {
  const [active, setActive] = useState<number | null>(null)
  // Drawn at its real pixel width, so axis text stays legible on a phone
  // instead of being scaled down with the whole picture.
  const plotRef = useRef<HTMLDivElement | null>(null)
  const [width, setWidth] = useState(DEFAULT_WIDTH)
  useEffect(() => {
    const element = plotRef.current
    if (!element || typeof ResizeObserver === 'undefined') return
    const observer = new ResizeObserver(([entry]) => {
      if (entry.contentRect.width > 0) setWidth(Math.round(entry.contentRect.width))
    })
    observer.observe(element)
    return () => observer.disconnect()
  }, [])
  const max = niceMax(Math.max(0, ...counts))
  const plotWidth = width - PAD.left - PAD.right
  const plotHeight = HEIGHT - PAD.top - PAD.bottom
  const slot = plotWidth / counts.length
  const barWidth = Math.max(2, slot - GAP)
  const y = (value: number) => PAD.top + plotHeight - (value / max) * plotHeight
  const total = counts.reduce((sum, count) => sum + count, 0)

  return (
    <figure className="srs-forecast">
      <figcaption className="srs-forecast__title">
        Reviews due, next 30 days <span className="subtle">· {total} in total</span>
      </figcaption>
      <div className="srs-forecast__plot" ref={plotRef}>
        <svg
          width={width}
          height={HEIGHT}
          viewBox={`0 0 ${width} ${HEIGHT}`}
          role="img"
          aria-label={`Reviews due over the next 30 days: ${counts[0]} today, ${total} in total.`}
        >
          {[0, max / 2, max].map((tick) => (
            <g key={tick}>
              <line
                className="srs-forecast__grid"
                x1={PAD.left}
                x2={width - PAD.right}
                y1={y(tick)}
                y2={y(tick)}
              />
              <text
                className="srs-forecast__axis"
                x={PAD.left - 6}
                y={y(tick) + 4}
                textAnchor="end"
              >
                {Math.round(tick)}
              </text>
            </g>
          ))}
          {counts.map((count, offset) => {
            const x = PAD.left + offset * slot + GAP / 2
            const top = y(count)
            const height = PAD.top + plotHeight - top
            // Rounded data end, square at the baseline.
            const radius = Math.min(4, barWidth / 2, height)
            const path =
              count === 0
                ? ''
                : `M${x},${top + height} V${top + radius} Q${x},${top} ${x + radius},${top} ` +
                  `H${x + barWidth - radius} Q${x + barWidth},${top} ${x + barWidth},${top + radius} ` +
                  `V${top + height} Z`
            return (
              <g key={offset}>
                {path && (
                  <path
                    d={path}
                    className={`srs-forecast__bar${active === offset ? ' srs-forecast__bar--active' : ''}`}
                  />
                )}
                <rect
                  className="srs-forecast__hit"
                  x={PAD.left + offset * slot}
                  y={PAD.top}
                  width={slot}
                  height={plotHeight}
                  tabIndex={0}
                  aria-label={`${dayLabel(offset, now)}: ${count} ${count === 1 ? 'review' : 'reviews'}`}
                  onMouseEnter={() => setActive(offset)}
                  onMouseLeave={() => setActive(null)}
                  onFocus={() => setActive(offset)}
                  onBlur={() => setActive(null)}
                />
              </g>
            )
          })}
          {[0, 7, 14, 21, 28].map((offset) => (
            <text
              key={offset}
              className="srs-forecast__axis"
              x={PAD.left + offset * slot + slot / 2}
              y={HEIGHT - 6}
              textAnchor={offset === 0 ? 'start' : 'middle'}
            >
              {offset === 0 ? 'Today' : `+${offset}d`}
            </text>
          ))}
        </svg>
        {active !== null && (
          <div
            className="srs-forecast__tooltip"
            // Just above the hovered bar, clamped so it never leaves the plot.
            style={{
              left: Math.min(width - 90, Math.max(90, PAD.left + (active + 0.5) * slot)),
              top: y(counts[active]) - 6,
            }}
            role="status"
          >
            <strong>{counts[active]}</strong> {counts[active] === 1 ? 'review' : 'reviews'}
            <span className="subtle"> · {dayLabel(active, now)}</span>
          </div>
        )}
      </div>
      <details className="srs-forecast__table">
        <summary>Show as a table</summary>
        <table className="fields-table">
          <thead>
            <tr>
              <th scope="col">Day</th>
              <th scope="col">Reviews due</th>
            </tr>
          </thead>
          <tbody>
            {counts.map((count, offset) => (
              <tr key={offset}>
                <td>{dayLabel(offset, now)}</td>
                <td>{count}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </details>
    </figure>
  )
}
