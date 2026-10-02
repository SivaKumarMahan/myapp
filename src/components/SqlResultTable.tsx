import type { ResultSet } from '../lib/sql/compare'

/**
 * Floating-point noise (29.244999999999997) is rounded away for display only;
 * the value itself, and every comparison, is untouched.
 */
const display = (value: string | number | null) =>
  value === null
    ? 'NULL'
    : typeof value === 'number'
      ? String(Math.round(value * 1e6) / 1e6)
      : value

/** Enough to read; anything bigger is a sign the query wants a LIMIT. */
const MAX_ROWS = 500

/** A query result as a table. Numbers right-aligned, NULL shown as NULL. */
export function SqlResultTable({ result, caption }: { result: ResultSet; caption: string }) {
  const shown = result.rows.slice(0, MAX_ROWS)
  return (
    <div className="sql-result">
      <div className="sql-result__scroll">
        <table className="sql-result__table">
          <caption className="visually-hidden">{caption}</caption>
          <thead>
            <tr>
              {result.columns.map((column, index) => (
                <th key={`${column}-${index}`} scope="col">
                  {column}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {shown.map((row, rowIndex) => (
              <tr key={rowIndex}>
                {row.map((value, index) => (
                  <td
                    key={index}
                    className={
                      value === null
                        ? 'sql-result__null'
                        : typeof value === 'number'
                          ? 'sql-result__number'
                          : undefined
                    }
                  >
                    {display(value)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="sql-result__meta subtle">
        {result.rows.length} {result.rows.length === 1 ? 'row' : 'rows'}
        {result.rows.length > MAX_ROWS ? ` - showing the first ${MAX_ROWS}` : ''}
      </p>
    </div>
  )
}
