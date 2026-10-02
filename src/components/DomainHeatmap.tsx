import type { DomainInsight } from '../lib/analytics'
import { weightBadge } from '../lib/domain-label'

/** 0-25, 25-50, 50-75, 75-100: one hue, light to dark. */
const step = (value: number) => (value >= 75 ? 4 : value >= 50 ? 3 : value >= 25 ? 2 : 1)

function HeatCell({ value, detail }: { value: number | null; detail: string }) {
  if (value === null) {
    return (
      <td className="heat-cell heat-cell--empty" title={detail}>
        <span aria-hidden="true">—</span>
        <span className="visually-hidden">{detail}</span>
      </td>
    )
  }
  return (
    <td className={`heat-cell heat-cell--${step(value)}`} title={detail}>
      {Math.round(value)}%
    </td>
  )
}

/**
 * One row per exam domain: its weight beside how you are doing on it.
 *
 * Darker means better, so a high-weight row that stays pale is the warning.
 * Those rows are also flagged "Focus" in words, never by colour alone.
 */
export function DomainHeatmap({ domains }: { domains: DomainInsight[] }) {
  return (
    <div className="heatmap">
      <div className="heatmap__scroll">
        <table className="heatmap__table">
          <caption className="visually-hidden">
            Accuracy, mock-exam score, retention and readiness for each exam domain
          </caption>
          <thead>
            <tr>
              <th scope="col">Domain</th>
              <th scope="col">Exam weight</th>
              <th scope="col">Practice accuracy</th>
              <th scope="col">Mock exams</th>
              <th scope="col">Retention</th>
              <th scope="col">Readiness</th>
            </tr>
          </thead>
          <tbody>
            {domains.map((insight) => (
              <tr key={insight.domain.id} className={insight.focus ? 'heatmap__row--focus' : ''}>
                <th scope="row">
                  <span className="heatmap__domain">{insight.domain.shortTitle}</span>
                  {insight.focus && (
                    <span className="badge badge--warning heatmap__focus">⚠ Focus</span>
                  )}
                </th>
                <td className="heatmap__weight">
                  {insight.weight === null ? (
                    <span className="subtle">{weightBadge(insight.domain)}</span>
                  ) : (
                    <>
                      <span>{weightBadge(insight.domain)}</span>
                      <span className="heatmap__weight-bar" aria-hidden="true">
                        <span style={{ width: `${Math.min(100, insight.weight * 1.6)}%` }} />
                      </span>
                    </>
                  )}
                </td>
                <HeatCell
                  value={insight.accuracy}
                  detail={
                    insight.accuracy === null
                      ? 'No practice questions answered yet'
                      : `${Math.round((insight.accuracy / 100) * insight.answered)} of ${insight.answered} answered correctly (${insight.questions} in the domain)`
                  }
                />
                <HeatCell
                  value={insight.mock}
                  detail={
                    insight.mock === null
                      ? 'Not in a mock exam yet'
                      : 'Average of your last three mock exams'
                  }
                />
                <HeatCell
                  value={insight.cardsStarted === 0 ? null : insight.retention}
                  detail={
                    insight.cardsStarted === 0
                      ? 'No flashcards reviewed in this domain yet'
                      : `Predicted share of this domain's cards you would recall today (${insight.cardsStarted} reviewed)`
                  }
                />
                <HeatCell value={insight.score} detail="Readiness for this domain" />
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="heatmap__legend" aria-hidden="true">
        <span>Lower</span>
        {[1, 2, 3, 4].map((level) => (
          <span key={level} className={`heatmap__swatch heat-cell--${level}`} />
        ))}
        <span>Higher</span>
        <span className="subtle">· quarters of 0–100%</span>
      </div>
    </div>
  )
}
