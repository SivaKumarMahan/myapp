/**
 * The lab's clock runs in the browser's own time zone, like a server set to
 * your local time: logs, `date`, `ls -l` and `stat` all agree. (just-bash's
 * ls and find -printf always use local time, so everything else follows.)
 */

const pad = (n: number, width = 2) => String(n).padStart(width, '0')

/** IANA zone name for `TZ`, e.g. "Asia/Kolkata". */
export const labTimeZone = () => {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'
  } catch {
    return 'UTC'
  }
}

/** Local midnight `daysAgo` days before `t` (DST-safe). */
export const dayStart = (t: number, daysAgo = 0) => {
  const d = new Date(t)
  return new Date(d.getFullYear(), d.getMonth(), d.getDate() - daysAgo).getTime()
}

/** YYYY-MM-DD in local time. */
export const localDay = (t: number) => {
  const d = new Date(t)
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

/** HH:MM:SS in local time. */
export const localClock = (t: number) => {
  const d = new Date(t)
  return `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`
}

/** UTC offset like +0530. */
export const offsetText = (t: number) => {
  const minutes = -new Date(t).getTimezoneOffset()
  const abs = Math.abs(minutes)
  return `${minutes < 0 ? '-' : '+'}${pad(Math.floor(abs / 60))}${pad(abs % 60)}`
}
