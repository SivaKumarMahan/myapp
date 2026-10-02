/** What every Config lab analyser reports. */

export type Severity = 'error' | 'warning' | 'info'

export interface Finding {
  /** Stable rule id, e.g. DF002 or K8S005. */
  rule: string
  severity: Severity
  title: string
  /** Why it matters, in a sentence or two. */
  message: string
  /** 1-based line the finding points at. */
  line: number
  /** A corrected snippet to copy from. */
  fix?: { snippet: string; language: 'yaml' | 'dockerfile' }
}

export interface Analysis<Facts> {
  findings: Finding[]
  /** Plain facts about the file, for exercise requirements (JMESPath). */
  facts: Facts
}

export const severityRank: Record<Severity, number> = { error: 0, warning: 1, info: 2 }

export const sortFindings = (findings: Finding[]) =>
  [...findings].sort(
    (a, b) => severityRank[a.severity] - severityRank[b.severity] || a.line - b.line,
  )

/** "Clean" means nothing at warning level or above; tips (info) are fine. */
export const isClean = (findings: Finding[]) =>
  findings.every((finding) => finding.severity === 'info')
