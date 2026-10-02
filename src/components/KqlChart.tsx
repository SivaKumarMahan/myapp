import { useEffect, useMemo, useRef, useState } from 'react'
import type { ChartType } from '../lib/kql/translate'
import type { ResultSet } from '../lib/sql/compare'

/**
 * Draws a query result for `| render ...`.
 *
 * - timechart / linechart: the first datetime column across, every numeric
 *   column as a line; with a text column as well (summarize ... by Computer,
 *   bin(...)), one line per value of it.
 * - barchart / columnchart: the first text column as categories and the
 *   first numeric column as the bar length.
 * - piechart is drawn as a bar chart: lengths compare more accurately than
 *   slices, and the numbers are the same.
 *
 * Colours are the validated categorical palette in fixed order (--series-1
 * to --series-8); more than eight series fold into "Other". The result table
 * below every chart is its table view.
 */

const MAX_SERIES = 8
const MAX_BARS = 30
const HEIGHT = 260
const PAD = { top: 16, right: 16, bottom: 28, left: 52 }

type Value = string | number | null

const isDateText = (value: Value) =>
  typeof value === 'string' && /^\d{4}-\d{2}-\d{2}[ T]\d{2}:\d{2}/.test(value)
const toTime = (value: Value) => Date.parse(`${String(value).replace(' ', 'T')}Z`)
const isNumeric = (rows: Value[][], index: number) =>
  rows.some((row) => typeof row[index] === 'number') &&
  rows.every((row) => row[index] === null || typeof row[index] === 'number')

const formatNumber = (value: number) =>
  Math.abs(value) >= 1000
    ? value.toLocaleString(undefined, { maximumFractionDigits: 0 })
    : value.toLocaleString(undefined, { maximumFractionDigits: 2 })

const formatTime = (time: number, withDate: boolean) => {
  const iso = new Date(time).toISOString()
  return withDate ? `${iso.slice(5, 10)} ${iso.slice(11, 16)}` : iso.slice(11, 16)
}

/** A "nice" step for about `count` ticks between 0 and max. */
const ticksFor = (max: number, count = 4) => {
  if (max <= 0) return [0, 1]
  const raw = max / count
  const power = 10 ** Math.floor(Math.log10(raw))
  const step = ([1, 2, 2.5, 5, 10].find((m) => m * power >= raw) ?? 10) * power
  const ticks: number[] = []
  for (let value = 0; value <= max + step * 0.001; value += step) ticks.push(value)
  if (ticks[ticks.length - 1] < max) ticks.push(ticks[ticks.length - 1] + step)
  return ticks
}

function useWidth() {
  const ref = useRef<HTMLDivElement | null>(null)
  const [width, setWidth] = useState(640)
  useEffect(() => {
    const element = ref.current
    if (!element || typeof ResizeObserver === 'undefined') return
    const observer = new ResizeObserver(([entry]) => {
      if (entry.contentRect.width > 0) setWidth(Math.round(entry.contentRect.width))
    })
    observer.observe(element)
    return () => observer.disconnect()
  }, [])
  return { ref, width }
}

interface Series {
  name: string
  points: Map<number, number>
}

function buildTimeSeries(result: ResultSet): { times: number[]; series: Series[] } | string {
  const { columns, rows } = result
  const timeIndex = columns.findIndex((_, index) => rows.some((row) => isDateText(row[index])))
  if (timeIndex < 0)
    return 'A timechart needs a datetime column - summarize ... by bin(TimeGenerated, 1h).'
  const numeric = columns
    .map((_, index) => index)
    .filter((index) => index !== timeIndex && isNumeric(rows, index))
  if (numeric.length === 0) return 'A timechart needs at least one numeric column to draw.'
  const split = columns.findIndex(
    (_, index) =>
      index !== timeIndex &&
      !numeric.includes(index) &&
      rows.some((row) => typeof row[index] === 'string'),
  )

  const byName = new Map<string, Series>()
  const add = (name: string, time: number, value: number) => {
    const series = byName.get(name) ?? { name, points: new Map() }
    series.points.set(time, (series.points.get(time) ?? 0) + value)
    byName.set(name, series)
  }
  for (const row of rows) {
    const time = toTime(row[timeIndex])
    if (Number.isNaN(time)) continue
    if (split >= 0) {
      const value = row[numeric[0]]
      if (typeof value === 'number') add(String(row[split] ?? '(empty)'), time, value)
    } else {
      for (const index of numeric) {
        const value = row[index]
        if (typeof value === 'number') add(columns[index], time, value)
      }
    }
  }
  let series = [...byName.values()]
  if (series.length > MAX_SERIES) {
    // Keep the biggest seven; everything else becomes "Other".
    const total = (s: Series) => [...s.points.values()].reduce((sum, v) => sum + v, 0)
    series.sort((a, b) => total(b) - total(a))
    const other: Series = { name: 'Other', points: new Map() }
    for (const s of series.slice(MAX_SERIES - 1)) {
      for (const [time, value] of s.points)
        other.points.set(time, (other.points.get(time) ?? 0) + value)
    }
    series = [...series.slice(0, MAX_SERIES - 1), other]
  }
  const times = [...new Set(series.flatMap((s) => [...s.points.keys()]))].sort((a, b) => a - b)
  return { times, series }
}

function TimeChart({ result }: { result: ResultSet }) {
  const { ref, width } = useWidth()
  const [hover, setHover] = useState<number | null>(null)
  const data = useMemo(() => buildTimeSeries(result), [result])
  if (typeof data === 'string') return <p className="subtle">{data}</p>
  const { times, series } = data
  if (times.length === 0) return <p className="subtle">No rows to draw.</p>

  const labelRoom = series.length <= 4 ? 96 : 0
  const plotWidth = Math.max(80, width - PAD.left - PAD.right - labelRoom)
  const plotHeight = HEIGHT - PAD.top - PAD.bottom
  const min = times[0]
  const max = times[times.length - 1]
  const x = (time: number) =>
    PAD.left + (max === min ? plotWidth / 2 : ((time - min) / (max - min)) * plotWidth)
  const peak = Math.max(0, ...series.flatMap((s) => [...s.points.values()]))
  const yTicks = ticksFor(peak)
  const top = yTicks[yTicks.length - 1] || 1
  const y = (value: number) => PAD.top + plotHeight - (value / top) * plotHeight
  const multiDay = max - min > 20 * 3_600_000
  const xTicks = Array.from(
    { length: Math.min(5, times.length) },
    (_, i) =>
      times[Math.round((i * (times.length - 1)) / Math.max(1, Math.min(5, times.length) - 1))],
  )

  const nearest = (clientX: number, rect: DOMRect) => {
    const px = clientX - rect.left
    let best = 0
    for (let i = 1; i < times.length; i += 1) {
      if (Math.abs(x(times[i]) - px) < Math.abs(x(times[best]) - px)) best = i
    }
    return best
  }
  const hoverTime = hover === null ? null : times[hover]

  return (
    <div className="kql-chart" ref={ref}>
      {series.length > 1 && (
        <ul className="kql-chart__legend">
          {series.map((s, index) => (
            <li key={s.name}>
              <span
                className="kql-chart__swatch"
                style={{ background: `var(--series-${index + 1})` }}
              />
              {s.name}
            </li>
          ))}
        </ul>
      )}
      <div className="kql-chart__plot">
        <svg
          width={width}
          height={HEIGHT}
          role="img"
          aria-label={`Time chart of ${series.map((s) => s.name).join(', ')} from ${formatTime(min, true)} to ${formatTime(max, true)} UTC. The values are in the table below.`}
          onMouseMove={(event) =>
            setHover(nearest(event.clientX, event.currentTarget.getBoundingClientRect()))
          }
          onMouseLeave={() => setHover(null)}
        >
          {yTicks.map((tick) => (
            <g key={tick}>
              <line
                className="kql-chart__grid"
                x1={PAD.left}
                x2={PAD.left + plotWidth}
                y1={y(tick)}
                y2={y(tick)}
              />
              <text className="kql-chart__axis" x={PAD.left - 8} y={y(tick) + 4} textAnchor="end">
                {formatNumber(tick)}
              </text>
            </g>
          ))}
          {xTicks.map((time, index) => (
            <text
              key={`${time}-${index}`}
              className="kql-chart__axis"
              x={x(time)}
              y={HEIGHT - 8}
              textAnchor={index === 0 ? 'start' : index === xTicks.length - 1 ? 'end' : 'middle'}
            >
              {formatTime(time, multiDay)}
            </text>
          ))}
          {hoverTime !== null && (
            <line
              className="kql-chart__crosshair"
              x1={x(hoverTime)}
              x2={x(hoverTime)}
              y1={PAD.top}
              y2={PAD.top + plotHeight}
            />
          )}
          {series.map((s, index) => {
            const points = times.filter((time) => s.points.has(time))
            const path = points
              .map((time, i) => `${i === 0 ? 'M' : 'L'}${x(time)},${y(s.points.get(time) ?? 0)}`)
              .join(' ')
            const last = points[points.length - 1]
            return (
              <g key={s.name} style={{ color: `var(--series-${index + 1})` }}>
                <path d={path} className="kql-chart__line" />
                {points.length === 1 && (
                  <circle
                    cx={x(points[0])}
                    cy={y(s.points.get(points[0]) ?? 0)}
                    r={4}
                    fill="currentColor"
                  />
                )}
                {hoverTime !== null && s.points.has(hoverTime) && (
                  <circle
                    className="kql-chart__point"
                    cx={x(hoverTime)}
                    cy={y(s.points.get(hoverTime) ?? 0)}
                    r={4.5}
                  />
                )}
                {labelRoom > 0 && last !== undefined && (
                  <text
                    className="kql-chart__label"
                    x={x(last) + 8}
                    y={y(s.points.get(last) ?? 0) + 4}
                  >
                    {s.name.length > 14 ? `${s.name.slice(0, 13)}…` : s.name}
                  </text>
                )}
              </g>
            )
          })}
        </svg>
        {hoverTime !== null && (
          <div
            className="kql-chart__tooltip"
            style={{ left: Math.min(width - 170, Math.max(0, x(hoverTime) + 12)), top: PAD.top }}
          >
            <strong>{formatTime(hoverTime, true)} UTC</strong>
            {series
              .filter((s) => s.points.has(hoverTime))
              .map((s) => (
                <span key={s.name} className="kql-chart__tooltip-row">
                  <span
                    className="kql-chart__swatch"
                    style={{ background: `var(--series-${series.indexOf(s) + 1})` }}
                  />
                  {s.name}: <strong>{formatNumber(s.points.get(hoverTime) ?? 0)}</strong>
                </span>
              ))}
          </div>
        )}
      </div>
    </div>
  )
}

function BarChart({ result, vertical }: { result: ResultSet; vertical: boolean }) {
  const { ref, width } = useWidth()
  const [hover, setHover] = useState<number | null>(null)
  const { columns, rows } = result
  const valueIndex = columns.findIndex((_, index) => isNumeric(rows, index))
  if (valueIndex < 0) return <p className="subtle">A bar chart needs a numeric column to draw.</p>
  const labelIndex = Math.max(
    0,
    columns.findIndex((_, index) => index !== valueIndex && !isNumeric(rows, index)),
  )
  const bars = rows.slice(0, MAX_BARS).map((row) => ({
    label: row[labelIndex] === null ? '(empty)' : String(row[labelIndex]),
    value: typeof row[valueIndex] === 'number' ? (row[valueIndex] as number) : 0,
  }))
  const ticks = ticksFor(Math.max(0, ...bars.map((bar) => bar.value)))
  const top = ticks[ticks.length - 1] || 1
  const caption = `${columns[valueIndex]} by ${columns[labelIndex]}`

  if (!vertical) {
    const labelWidth = Math.min(
      200,
      Math.max(70, Math.max(...bars.map((bar) => bar.label.length)) * 7),
    )
    const rowHeight = 26
    const height = PAD.top + bars.length * rowHeight + PAD.bottom
    const plotWidth = Math.max(60, width - labelWidth - PAD.right - 56)
    const x = (value: number) => labelWidth + (value / top) * plotWidth
    return (
      <div className="kql-chart" ref={ref}>
        <p className="kql-chart__caption">{caption}</p>
        <svg
          width={width}
          height={height}
          role="img"
          aria-label={`Bar chart of ${caption}. The values are in the table below.`}
        >
          {ticks.map((tick) => (
            <line
              key={tick}
              className="kql-chart__grid"
              x1={x(tick)}
              x2={x(tick)}
              y1={PAD.top - 4}
              y2={height - PAD.bottom}
            />
          ))}
          {bars.map((bar, index) => {
            const yPos = PAD.top + index * rowHeight
            const length = Math.max(0, x(bar.value) - labelWidth)
            return (
              <g
                key={`${bar.label}-${index}`}
                onMouseEnter={() => setHover(index)}
                onMouseLeave={() => setHover(null)}
              >
                <rect className="kql-chart__hit" x={0} y={yPos} width={width} height={rowHeight} />
                <text
                  className="kql-chart__axis kql-chart__bar-label"
                  x={labelWidth - 8}
                  y={yPos + 17}
                  textAnchor="end"
                >
                  {bar.label.length > 28 ? `${bar.label.slice(0, 27)}…` : bar.label}
                </text>
                <path
                  className={`kql-chart__bar${hover === index ? ' kql-chart__bar--active' : ''}`}
                  d={roundedBar(labelWidth, yPos + 4, length, rowHeight - 8, 'right')}
                />
                <text className="kql-chart__value" x={labelWidth + length + 6} y={yPos + 17}>
                  {formatNumber(bar.value)}
                </text>
              </g>
            )
          })}
          {ticks.map((tick) => (
            <text
              key={tick}
              className="kql-chart__axis"
              x={x(tick)}
              y={height - 8}
              textAnchor="middle"
            >
              {formatNumber(tick)}
            </text>
          ))}
        </svg>
      </div>
    )
  }

  const plotWidth = Math.max(80, width - PAD.left - PAD.right)
  const plotHeight = HEIGHT - PAD.top - PAD.bottom - 24
  const slot = plotWidth / Math.max(1, bars.length)
  const barWidth = Math.max(4, Math.min(48, slot - 4))
  const y = (value: number) => PAD.top + plotHeight - (value / top) * plotHeight
  return (
    <div className="kql-chart" ref={ref}>
      <p className="kql-chart__caption">{caption}</p>
      <div className="kql-chart__plot">
        <svg
          width={width}
          height={HEIGHT}
          role="img"
          aria-label={`Column chart of ${caption}. The values are in the table below.`}
        >
          {ticks.map((tick) => (
            <g key={tick}>
              <line
                className="kql-chart__grid"
                x1={PAD.left}
                x2={PAD.left + plotWidth}
                y1={y(tick)}
                y2={y(tick)}
              />
              <text className="kql-chart__axis" x={PAD.left - 8} y={y(tick) + 4} textAnchor="end">
                {formatNumber(tick)}
              </text>
            </g>
          ))}
          {bars.map((bar, index) => {
            const xPos = PAD.left + index * slot + (slot - barWidth) / 2
            const height = PAD.top + plotHeight - y(bar.value)
            return (
              <g
                key={`${bar.label}-${index}`}
                onMouseEnter={() => setHover(index)}
                onMouseLeave={() => setHover(null)}
              >
                <rect
                  className="kql-chart__hit"
                  x={PAD.left + index * slot}
                  y={PAD.top}
                  width={slot}
                  height={plotHeight}
                />
                <path
                  className={`kql-chart__bar${hover === index ? ' kql-chart__bar--active' : ''}`}
                  d={roundedBar(xPos, y(bar.value), barWidth, height, 'top')}
                />
                {bars.length <= 12 && (
                  <text
                    className="kql-chart__axis"
                    x={xPos + barWidth / 2}
                    y={HEIGHT - 30}
                    textAnchor="middle"
                  >
                    {bar.label.length > 10 ? `${bar.label.slice(0, 9)}…` : bar.label}
                  </text>
                )}
              </g>
            )
          })}
        </svg>
        {hover !== null && (
          <div
            className="kql-chart__tooltip"
            style={{
              left: Math.min(width - 170, PAD.left + hover * slot + slot / 2),
              top: PAD.top,
            }}
          >
            <strong>{bars[hover].label}</strong>
            <span>
              {columns[valueIndex]}: <strong>{formatNumber(bars[hover].value)}</strong>
            </span>
          </div>
        )}
      </div>
    </div>
  )
}

/** A bar with a 4px-rounded data end and a square baseline end. */
function roundedBar(x: number, y: number, w: number, h: number, end: 'top' | 'right') {
  if (w <= 0 || h <= 0) return ''
  const r = Math.min(4, end === 'top' ? w / 2 : h / 2, end === 'top' ? h : w)
  if (end === 'top') {
    return `M${x},${y + h} V${y + r} Q${x},${y} ${x + r},${y} H${x + w - r} Q${x + w},${y} ${x + w},${y + r} V${y + h} Z`
  }
  return `M${x},${y} H${x + w - r} Q${x + w},${y} ${x + w},${y + r} V${y + h - r} Q${x + w},${y + h} ${x + w - r},${y + h} H${x} Z`
}

export function KqlChart({ result, type }: { result: ResultSet; type: ChartType }) {
  return (
    <figure className="kql-chart-figure">
      {type === 'timechart' || type === 'linechart' ? (
        <TimeChart result={result} />
      ) : (
        <BarChart result={result} vertical={type === 'columnchart'} />
      )}
      {type === 'piechart' && (
        <figcaption className="subtle">
          Drawn as a bar chart: bar lengths are easier to compare than pie slices.
        </figcaption>
      )}
    </figure>
  )
}
