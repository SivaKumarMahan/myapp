import { useEffect, useRef, useState } from 'react'
import type { CalendarDay } from '../lib/analytics'
import type { DailyGoal } from '../lib/storage'

const WEEKDAYS = ['Mon', '', 'Wed', '', 'Fri', '', '']

const parseDay = (day: string) => {
  const [year, month, date] = day.split('-').map(Number)
  return new Date(year, month - 1, date, 12)
}

const longDate = (day: string) =>
  parseDay(day).toLocaleDateString(undefined, {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })

const describe = (cell: CalendarDay) => {
  const { questions, lessons, minutes } = cell.activity
  const parts = [
    `${questions} ${questions === 1 ? 'question' : 'questions'}`,
    `${lessons} ${lessons === 1 ? 'lesson' : 'lessons'}`,
    `${Math.floor(minutes)} min`,
  ]
  return `${longDate(cell.day)}: ${parts.join(' · ')}`
}

/**
 * A GitHub-style year of study, one square per day, darker the further past
 * your daily goal you went. Hover or tap a square for that day's numbers.
 */
export function ActivityCalendar({ weeks, goal }: { weeks: CalendarDay[][]; goal: DailyGoal }) {
  const [active, setActive] = useState<CalendarDay | null>(null)
  const scrollRef = useRef<HTMLDivElement | null>(null)

  // Most recent weeks first into view: on a phone the year does not fit.
  useEffect(() => {
    const element = scrollRef.current
    if (element) element.scrollLeft = element.scrollWidth
  }, [])

  const days = weeks.flat().filter((cell) => !cell.future)
  const activeDays = days.filter((cell) => cell.level > 0)
  const goalDays = days.filter((cell) => cell.level >= 3).length
  const goalUnit = goal.kind === 'minutes' ? 'minutes' : 'questions'

  return (
    <figure className="calendar">
      <figcaption className="calendar__title">
        Study activity, last {weeks.length} weeks{' '}
        <span className="subtle">
          · {activeDays.length} active {activeDays.length === 1 ? 'day' : 'days'}, goal met on{' '}
          {goalDays}
        </span>
      </figcaption>
      <div className="calendar__scroll" ref={scrollRef}>
        <div className="calendar__grid" aria-hidden="true">
          <div className="calendar__weekdays">
            <span />
            {WEEKDAYS.map((label, index) => (
              <span key={index}>{label}</span>
            ))}
          </div>
          {weeks.map((week, index) => {
            const first = parseDay(week[0].day)
            const showMonth = index === 0 || first.getDate() <= 7
            return (
              <div key={week[0].day} className="calendar__week">
                <span className="calendar__month">
                  {showMonth ? first.toLocaleDateString(undefined, { month: 'short' }) : ''}
                </span>
                {week.map((cell) => (
                  <span
                    key={cell.day}
                    className={`calendar__day calendar__day--${cell.future ? 'future' : cell.level}${
                      active?.day === cell.day ? ' calendar__day--active' : ''
                    }`}
                    onMouseEnter={() => !cell.future && setActive(cell)}
                    onClick={() => !cell.future && setActive(cell)}
                  />
                ))}
              </div>
            )
          })}
        </div>
      </div>
      <div className="calendar__footer">
        <p className="calendar__readout" aria-live="polite">
          {active ? describe(active) : 'Hover or tap a day to see what you studied.'}
        </p>
        <div className="heatmap__legend" aria-hidden="true">
          <span>Less</span>
          {[0, 1, 2, 3, 4].map((level) => (
            <span key={level} className={`heatmap__swatch calendar__day--${level}`} />
          ))}
          <span>More</span>
        </div>
      </div>
      <p className="subtle calendar__key">
        Darkest squares: at least 1.5× your goal of {goal.target} {goalUnit}. The next shade: goal
        met.
      </p>
      <details className="srs-forecast__table">
        <summary>Show active days as a table</summary>
        {activeDays.length === 0 ? (
          <p className="subtle">No study recorded yet.</p>
        ) : (
          <table className="fields-table">
            <thead>
              <tr>
                <th scope="col">Day</th>
                <th scope="col">Questions</th>
                <th scope="col">Lessons</th>
                <th scope="col">Minutes</th>
              </tr>
            </thead>
            <tbody>
              {[...activeDays].reverse().map((cell) => (
                <tr key={cell.day}>
                  <td>{longDate(cell.day)}</td>
                  <td>{cell.activity.questions}</td>
                  <td>{cell.activity.lessons}</td>
                  <td>{Math.floor(cell.activity.minutes)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </details>
    </figure>
  )
}
