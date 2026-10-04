/**
 * Linux & Bash lab challenges are data: the scenario, the task, hints,
 * reference solutions and the checks. The checker compares the outcome of
 * your answer with the outcome of the first reference solution, run on the
 * same freshly seeded world - so expectations never need to be written out
 * by hand, and they stay right when the seed data changes.
 */

export type LabCategory =
  | 'Disk & files'
  | 'Logs'
  | 'Text processing'
  | 'JSON (jq)'
  | 'Network & servers'
  | 'Processes & services'
  | 'Containers & cloud'
  | 'Scripting fundamentals'

/** How two outputs are compared (after trimming and collapsing spaces). */
export type OutputMode =
  /** Same lines in the same order. */
  | 'exact'
  /** Same lines, any order. */
  | 'unordered'
  /** Every reference line appears in your output; extra lines are fine. */
  | 'contains'
  /** The values matched by `pattern` (e.g. IPs) are the same set - or sequence with `ordered`. */
  | 'tokens'
  /** The numbers in the reference output all appear in yours (within 1%). */
  | 'numbers'

export type LabCheck =
  /** Your command's / script's stdout vs the reference's. */
  | { kind: 'output'; mode: OutputMode; pattern?: string; ordered?: boolean; label?: string }
  /** The files under a directory afterwards (deleted / created / kept), optionally filtered by a regex. */
  | { kind: 'files'; dir: string; match?: string; label?: string }
  /** A file's content afterwards. */
  | { kind: 'file'; path: string; label?: string }
  /** A command run on both worlds afterwards - e.g. `systemctl is-active nginx` or `tar tzf ...`. */
  | { kind: 'probe'; command: string; mode?: OutputMode; pattern?: string; label: string }
  /** Whether an alert reached the outbox (and, with `pattern`, mentions the right things). */
  | { kind: 'outbox'; channel?: 'mail' | 'slack' | 'any'; pattern?: string; label?: string }
  /** Exit status: success vs failure (or the exact code with `exact`). */
  | { kind: 'exit'; exact?: boolean; label?: string }

export interface ScriptCase {
  label: string
  /** Arguments, the same on both worlds or different per world. */
  args: string[] | { main: string[]; hidden: string[] }
  /** Overrides the challenge's checks for this case. */
  checks?: LabCheck[]
}

export interface LabChallenge {
  id: string
  title: string
  category: LabCategory
  level: 'simple' | 'medium'
  type: 'command' | 'script' | 'bugfix'
  scenario: string
  task: string
  /** Files worth looking at for this task. */
  seedFiles: string[]
  /** Mock hosts or tools involved (shown on the task panel). */
  mockHosts?: string[]
  hints: [string, string, string]
  /** The first is the reference the checker compares against. A second shows a common alternative. */
  solutions: string[]
  /** Line-by-line notes for the first solution. */
  explanation: { code: string; note: string }[]
  checks: LabCheck[]
  /** For script and bugfix challenges: the file name and the argument sets to run. */
  script?: { name: string; cases: ScriptCase[] }
  /** Bug-fix challenges open with this in the editor. */
  starter?: string
  /** What differs in the hidden variant, so hard-coded answers fail. */
  hiddenVariant: string
  followUp: string
  /** A matching question in the interview repo; null when none (this lab does not read the repo). */
  repoRef: { path: string; questionId: string } | null
  tags: string[]
}
