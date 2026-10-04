import type { LabChallenge, LabCheck, OutputMode, ScriptCase } from '../../content/linuxlab/types'
import { LinuxLab, type RunResult } from './lab'
import { ageText, type Variant } from './world'

/**
 * Checks an answer by its outcome, never its text. The answer is replayed on
 * a fresh main world AND a hidden variant (different names, dates and broken
 * hosts); the first reference solution is run on identical worlds; then each
 * check compares the two outcomes and explains any difference.
 */

export type Step =
  { kind: 'run'; command: string } | { kind: 'write'; path: string; content: string }

export type Attempt = { steps: Step[] } | { script: string }

export interface CheckResult {
  variant: Variant
  label: string
  passed: boolean
  messages: string[]
}

export interface CheckReport {
  passed: boolean
  results: CheckResult[]
}

const IGNORED = /^(clear|history|reset)\s*$/

export const normaliseLines = (text: string) =>
  text
    .split('\n')
    .map((line) => line.trim().replace(/\s+/g, ' '))
    .filter((line) => line.length > 0)

const show = (value: string) => `“${value.length > 70 ? `${value.slice(0, 69)}…` : value}”`
const list = (values: string[], max = 3) =>
  values.slice(0, max).map(show).join(', ') +
  (values.length > max ? ` and ${values.length - max} more` : '')

const numbersIn = (text: string) => (text.match(/-?\d+(?:\.\d+)?/g) ?? []).map(Number)

/** Compares two outputs; returns problems in plain words (empty = same). */
export function compareOutput(
  mine: string,
  expected: string,
  mode: OutputMode,
  pattern?: string,
  ordered = false,
): string[] {
  const a = normaliseLines(mine)
  const b = normaliseLines(expected)
  switch (mode) {
    case 'exact': {
      if (a.length !== b.length)
        return [
          `Expected ${b.length} line${b.length === 1 ? '' : 's'}, got ${a.length}.${b[a.length] ? ` First missing: ${show(b[a.length])}` : ''}`,
        ]
      const index = a.findIndex((line, i) => line !== b[i])
      return index < 0
        ? []
        : [`Line ${index + 1} should be ${show(b[index])}, not ${show(a[index])}.`]
    }
    case 'unordered': {
      const left = [...a].sort()
      const right = [...b].sort()
      const missing = right.filter((line) => !left.includes(line))
      const extra = left.filter((line) => !right.includes(line))
      const problems: string[] = []
      if (missing.length) problems.push(`Missing from your output: ${list(missing)}.`)
      if (extra.length) problems.push(`Not expected: ${list(extra)}.`)
      if (!problems.length && left.length !== right.length)
        problems.push(`Expected ${right.length} lines, got ${left.length} (duplicates?).`)
      return problems
    }
    case 'contains': {
      const missing = b.filter((line) => !a.some((mineLine) => mineLine.includes(line)))
      return missing.length ? [`Missing from your output: ${list(missing)}.`] : []
    }
    case 'tokens': {
      const regex = new RegExp(pattern ?? '\\S+', 'g')
      const tokens = (lines: string[]) => [...new Set(lines.join('\n').match(regex) ?? [])]
      const mineTokens = tokens(a)
      const expectedTokens = tokens(b)
      const missing = expectedTokens.filter((token) => !mineTokens.includes(token))
      const extra = mineTokens.filter((token) => !expectedTokens.includes(token))
      const problems: string[] = []
      if (missing.length) problems.push(`Missing: ${list(missing)}.`)
      if (extra.length) problems.push(`Shouldn't be there: ${list(extra)}.`)
      if (!problems.length && ordered && mineTokens.join('|') !== expectedTokens.join('|')) {
        problems.push(`Right values, wrong order - expected ${list(expectedTokens, 6)}.`)
      }
      return problems
    }
    case 'numbers': {
      const mineNumbers = numbersIn(a.join(' '))
      const missing = numbersIn(b.join(' ')).filter(
        (value) =>
          !mineNumbers.some(
            (other) => Math.abs(other - value) <= Math.max(0.01, Math.abs(value) * 0.01),
          ),
      )
      return missing.length
        ? [
            `Expected the value${missing.length === 1 ? '' : 's'} ${missing.slice(0, 3).join(', ')} in your output.`,
          ]
        : []
    }
  }
}

interface Side {
  lab: LinuxLab
  last: RunResult
}

async function judge(check: LabCheck, mine: Side, ref: Side): Promise<string[]> {
  const label = (text: string) => (check.label ? `${check.label}: ${text}` : text)
  switch (check.kind) {
    case 'output':
      return compareOutput(
        mine.last.stdout,
        ref.last.stdout,
        check.mode,
        check.pattern,
        check.ordered,
      ).map(label)
    case 'exit': {
      const a = mine.last.exitCode
      const b = ref.last.exitCode
      if (check.exact ? a === b : (a === 0) === (b === 0)) return []
      return [
        label(
          b === 0
            ? `Exit status should be 0 (success), but it was ${a}.`
            : `Exit status should be non-zero here (failure${check.exact ? ` ${b}` : ''}), but it was ${a}.`,
        ),
      ]
    }
    case 'outbox': {
      const pick = (lab: LinuxLab) =>
        lab.world.outbox.filter(
          (message) =>
            !check.channel || check.channel === 'any' || message.channel === check.channel,
        )
      const a = pick(mine.lab)
      const b = pick(ref.lab)
      const channel = check.channel && check.channel !== 'any' ? check.channel : 'mail or Slack'
      if (b.length > 0 && a.length === 0)
        return [label(`Expected an alert in the Outbox (${channel}) - nothing was sent.`)]
      if (b.length === 0 && a.length > 0)
        return [
          label(`An alert was sent (${show(a[0].subject)}), but nothing needed alerting here.`),
        ]
      if (check.pattern && b.length) {
        const regex = new RegExp(check.pattern, 'g')
        const text = (messages: typeof a) =>
          messages.map((message) => `${message.subject}\n${message.body}`).join('\n')
        const wanted = [...new Set(text(b).match(regex) ?? [])]
        const missing = wanted.filter((token) => !text(a).includes(token))
        if (missing.length) return [label(`The alert should mention ${list(missing)}.`)]
      }
      return []
    }
    case 'file': {
      const [a, b] = await Promise.all([
        mine.lab.readFile(check.path),
        ref.lab.readFile(check.path),
      ])
      if (b === null && a === null) return []
      if (b === null) return [label(`${check.path} should not exist.`)]
      if (a === null) return [label(`${check.path} doesn't exist.`)]
      return compareOutput(a, b, 'exact').map((problem) => label(`${check.path}: ${problem}`))
    }
    case 'probe': {
      const [a, b] = await Promise.all([mine.lab.run(check.command), ref.lab.run(check.command)])
      return compareOutput(
        `${a.stdout}${a.exitCode ? `\n[exit ${a.exitCode}]` : ''}`,
        `${b.stdout}${b.exitCode ? `\n[exit ${b.exitCode}]` : ''}`,
        check.mode ?? 'unordered',
        check.pattern,
      ).map((problem) => `${check.label}: ${problem}`)
    }
    case 'files': {
      const filter = check.match ? new RegExp(check.match) : null
      const keep = (path: string) => !filter || filter.test(path)
      const [a, b] = await Promise.all([
        mine.lab.listFiles(check.dir),
        ref.lab.listFiles(check.dir),
      ])
      const mineSet = new Set(a.filter(keep))
      const refSet = new Set(b.filter(keep))
      const seed = new Map(mine.lab.world.files.map((file) => [file.path.replace(/\/$/, ''), file]))
      const now = mine.lab.world.now
      const name = (path: string) => path.replace(/\/$/, '')
      const problems: string[] = []
      for (const path of refSet) {
        if (mineSet.has(path)) continue
        const seeded = seed.get(name(path))
        problems.push(
          seeded
            ? `You deleted ${name(path)}, but it's ${ageText(seeded.mtime, now)} - it should have been kept.`
            : `Expected ${name(path)} to be created.`,
        )
      }
      for (const path of mineSet) {
        if (refSet.has(path)) continue
        const seeded = seed.get(name(path))
        problems.push(
          seeded
            ? `${name(path)} should have been removed (it's ${ageText(seeded.mtime, now)}).`
            : `Unexpected ${name(path)} - it shouldn't be there.`,
        )
      }
      return problems
        .slice(0, 5)
        .map(label)
        .concat(problems.length > 5 ? [`…and ${problems.length - 5} more file differences.`] : [])
    }
  }
}

async function replay(lab: LinuxLab, steps: Step[]): Promise<RunResult> {
  let last: RunResult = { stdout: '', stderr: '', exitCode: 0 }
  for (const step of steps) {
    if (step.kind === 'write') await lab.writeFile(step.path, step.content)
    else if (!IGNORED.test(step.command.trim())) last = await lab.run(step.command)
  }
  return last
}

const argsFor = (testCase: ScriptCase, variant: Variant) =>
  Array.isArray(testCase.args) ? testCase.args : testCase.args[variant]
const quote = (value: string) =>
  /^[\w./:=@%+-]+$/.test(value) ? value : `'${value.replace(/'/g, `'\\''`)}'`

/** Checks one answer against a challenge on the main and hidden worlds. */
export async function checkChallenge(
  challenge: LabChallenge,
  attempt: Attempt,
  options: { now?: number; variants?: Variant[] } = {},
): Promise<CheckReport> {
  const now = options.now ?? Date.now()
  const variants = options.variants ?? (['main', 'hidden'] as Variant[])
  const results: CheckResult[] = []
  const reference = challenge.solutions[0]

  for (const variant of variants) {
    if ('steps' in attempt) {
      const [mineLab, refLab] = await Promise.all([
        LinuxLab.create(variant, now),
        LinuxLab.create(variant, now),
      ])
      const steps = attempt.steps.filter((step) => step.kind === 'write' || step.command.trim())
      if (!steps.some((step) => step.kind === 'run')) {
        results.push({
          variant,
          label: 'Your answer',
          passed: false,
          messages: ['Run your command(s) in the terminal first, then check.'],
        })
        continue
      }
      const mine = { lab: mineLab, last: await replay(mineLab, steps) }
      const ref = { lab: refLab, last: await refLab.run(reference) }
      const messages: string[] = []
      for (const check of challenge.checks) messages.push(...(await judge(check, mine, ref)))
      results.push({
        variant,
        label: variant === 'main' ? 'Your data' : 'Hidden variant (different data)',
        passed: messages.length === 0,
        messages,
      })
    } else {
      const name = challenge.script?.name ?? 'script.sh'
      const cases = challenge.script?.cases ?? [{ label: 'Run', args: [] }]
      for (const testCase of cases) {
        const [mineLab, refLab] = await Promise.all([
          LinuxLab.create(variant, now),
          LinuxLab.create(variant, now),
        ])
        await mineLab.writeFile(`/root/${name}`, attempt.script)
        await refLab.writeFile(`/root/${name}`, reference)
        const command =
          `bash /root/${name} ${argsFor(testCase, variant).map(quote).join(' ')}`.trim()
        const mine = { lab: mineLab, last: await mineLab.run(command) }
        const ref = { lab: refLab, last: await refLab.run(command) }
        const messages: string[] = []
        for (const check of testCase.checks ?? challenge.checks)
          messages.push(...(await judge(check, mine, ref)))
        const where = variant === 'main' ? 'your data' : 'hidden variant'
        results.push({
          variant,
          label: `${testCase.label} - \`${command.replace(`bash /root/${name}`, name)}\` (${where})`,
          passed: messages.length === 0,
          messages,
        })
      }
    }
  }
  return { passed: results.every((result) => result.passed), results }
}
