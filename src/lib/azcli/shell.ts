import { GLOBAL_PARAMS, SHORT_OPTIONS, type Catalog } from './catalog'
import type { Args, CommandContext, CommandSpec, ParamSpec } from './commands'
import { CliError, similar } from './errors'
import { applyQuery, formatOutput, OUTPUT_FORMATS, type OutputFormat } from './format'
import type { CloudState } from './state'

/**
 * A small Bash-like shell around the simulated `az`: quoting, `$VAR` and
 * `$(az ...)` substitution, `NAME=value`, history-friendly output, and
 * `az`'s own argument rules and error messages.
 */

export type LineKind = 'out' | 'err' | 'info'
export interface OutputLine {
  text: string
  kind: LineKind
}

export interface ShellResult {
  lines: OutputLine[]
  clear?: boolean
  /** Set when the command asks a y/n question; answer with `session.answer`. */
  prompt?: string
}

export interface Session extends CommandContext {
  catalog: Catalog
  vars: Record<string, string>
  pending: { question: string; run: () => ShellResult } | null
}

export const createSession = (catalog: Catalog, state: CloudState): Session => ({
  catalog,
  state,
  defaults: {},
  vars: { HOME: '/home/learner', USER: 'learner' },
  pending: null,
})

const out = (text: string): OutputLine => ({ text, kind: 'out' })
const err = (text: string): OutputLine => ({ text, kind: 'err' })
const info = (text: string): OutputLine => ({ text, kind: 'info' })

/* ------------------------------------------------------------ tokenizing */

/** Splits a command line like Bash would, expanding variables and $(...). */
export function tokenize(line: string, session: Session): string[] {
  const tokens: string[] = []
  let current = ''
  let started = false
  let i = 0
  const expandAt = (from: number): [string, number] => {
    if (line[from + 1] === '(') {
      let depth = 1
      let j = from + 2
      while (j < line.length && depth > 0) {
        if (line[j] === '(') depth += 1
        if (line[j] === ')') depth -= 1
        j += 1
      }
      if (depth > 0) throw new CliError('bash: syntax error: unexpected end of file (missing ")")')
      const inner = line.slice(from + 2, j - 1)
      const result = run(inner, session, { substitution: true })
      const failed = result.lines.find((entry) => entry.kind === 'err')
      if (failed) throw new CliError(failed.text)
      return [
        result.lines
          .map((entry) => entry.text)
          .join('\n')
          .trim(),
        j,
      ]
    }
    const match = /^\$(?:\{(\w+)\}|(\w+))/.exec(line.slice(from))
    if (!match) return ['$', from + 1]
    return [session.vars[match[1] ?? match[2]] ?? '', from + match[0].length]
  }
  while (i < line.length) {
    const ch = line[i]
    if (/\s/.test(ch)) {
      if (started) tokens.push(current)
      current = ''
      started = false
      i += 1
      continue
    }
    started = true
    if (ch === "'") {
      const end = line.indexOf("'", i + 1)
      if (end < 0) throw new CliError("bash: unexpected EOF while looking for matching `''")
      current += line.slice(i + 1, end)
      i = end + 1
    } else if (ch === '"') {
      i += 1
      while (i < line.length && line[i] !== '"') {
        if (line[i] === '\\' && i + 1 < line.length) {
          current += line[i + 1]
          i += 2
        } else if (line[i] === '$') {
          const [value, next] = expandAt(i)
          current += value
          i = next
        } else {
          current += line[i]
          i += 1
        }
      }
      if (i >= line.length)
        throw new CliError('bash: unexpected EOF while looking for matching `"\'')
      i += 1
    } else if (ch === '\\' && i + 1 < line.length) {
      current += line[i + 1]
      i += 2
    } else if (ch === '$') {
      const [value, next] = expandAt(i)
      current += value
      i = next
    } else if (ch === '#' && !current) {
      break
    } else {
      current += ch
      i += 1
    }
  }
  if (started) tokens.push(current)
  return tokens
}

/* ------------------------------------------------------------- arguments */

const canonical = (name: string) => name.replace(/^-+/, '')

function lookupParam(params: ParamSpec[], word: string): ParamSpec | undefined {
  return params.find((param) => param.name === word || param.aliases?.includes(word))
}

function parseArgs(
  spec: CommandSpec,
  words: string[],
  context: CommandContext,
): { args: Args; globals: Args } {
  const params = [...spec.params, ...GLOBAL_PARAMS]
  const args: Args = {}
  const globals: Args = {}
  const unknown: string[] = []
  let i = 0
  while (i < words.length) {
    let word = words[i]
    let inline: string | undefined
    if (word.startsWith('--') && word.includes('=')) {
      ;[word, inline] = [word.slice(0, word.indexOf('=')), word.slice(word.indexOf('=') + 1)]
    }
    const param = lookupParam(params, word)
    if (!param || !word.startsWith('-')) {
      unknown.push(words[i])
      i += 1
      continue
    }
    const target = GLOBAL_PARAMS.includes(param) ? globals : args
    const name = canonical(param.name)
    i += 1
    if (param.flag) {
      target[name] = true
      continue
    }
    const values: string[] = inline !== undefined ? [inline] : []
    if (inline === undefined) {
      while (
        i < words.length &&
        !(words[i].startsWith('-') && words[i].length > 1 && !/^-\d/.test(words[i]))
      ) {
        values.push(words[i])
        i += 1
        if (!param.multiple) break
      }
    }
    if (values.length === 0)
      throw new CliError(
        `argument ${param.name}${param.aliases?.length ? `/${param.aliases[0]}` : ''}: expected ${param.multiple ? 'at least one argument' : 'one argument'}`,
      )
    if (param.choices) {
      for (const value of values) {
        const match = param.choices.find((choice) => choice.toLowerCase() === value.toLowerCase())
        if (!match) {
          throw new CliError(
            `argument ${param.name}: '${value}' is not a valid value for '${param.name}'. Allowed values: ${param.choices.join(', ')}.`,
          )
        }
        values[values.indexOf(value)] = match
      }
    }
    target[name] = param.multiple ? values : values[0]
  }
  if (unknown.length > 0) throw new CliError(`unrecognized arguments: ${unknown.join(' ')}`)

  if (globals.help) return { args, globals }
  // `az configure --defaults group=... location=...` fills these in.
  if (
    args['resource-group'] === undefined &&
    context.defaults.group &&
    spec.params.some((param) => param.name === '--resource-group')
  ) {
    args['resource-group'] = context.defaults.group
  }
  const missing = spec.params.filter(
    (param) => param.required && args[canonical(param.name)] === undefined,
  )
  if (missing.length > 0) {
    throw new CliError(
      `the following arguments are required: ${missing.map((param) => [param.name, ...(param.aliases?.filter((alias) => /^-\w$/.test(alias)) ?? [])].join('/')).join(', ')}`,
    )
  }
  return { args, globals }
}

/* -------------------------------------------------------------------- help */

function groupHelp(session: Session, path: string[]): ShellResult {
  const key = path.join(' ')
  const children = [...(session.catalog.groups.get(key) ?? [])].sort()
  const lines = [`Group\n    az${key ? ` ${key}` : ''}`, '']
  const subgroups = children.filter((child) =>
    session.catalog.groups.has([...path, child].join(' ')),
  )
  const commands = children.filter((child) =>
    session.catalog.commands.has([...path, child].join(' ')),
  )
  if (subgroups.length > 0) {
    lines.push('Subgroups:')
    for (const child of subgroups) lines.push(`    ${child}`)
    lines.push('')
  }
  if (commands.length > 0) {
    lines.push('Commands:')
    for (const child of commands) {
      const spec = session.catalog.commands.get([...path, child].join(' ')) as CommandSpec
      lines.push(`    ${child.padEnd(22)}: ${spec.summary}${spec.run ? '' : '  [not modelled]'}`)
    }
  }
  return { lines: [out(lines.join('\n').trimEnd())] }
}

function commandHelp(spec: CommandSpec): ShellResult {
  const describe = (param: ParamSpec) => {
    const names = [param.name, ...(param.aliases ?? [])].join(' ')
    const notes = [
      param.required ? '[Required]' : '',
      param.help ?? '',
      param.choices ? `Allowed values: ${param.choices.join(', ')}.` : '',
    ]
      .filter(Boolean)
      .join(' ')
    return `    ${names.padEnd(32)}: ${notes}`
  }
  const lines = [
    'Command',
    `    az ${spec.path.join(' ')} : ${spec.summary}`,
    '',
    'Arguments',
    ...spec.params.map(describe),
    '',
    'Global Arguments',
    ...GLOBAL_PARAMS.map(describe),
  ]
  if (spec.reference) {
    lines.push(
      '',
      `From the ${spec.reference.course} command reference:`,
      `    ${spec.reference.template}`,
    )
  }
  if (!spec.run)
    lines.push(
      '',
      'The simulator recognises and validates this command but does not model its resources.',
    )
  return { lines: [out(lines.join('\n'))] }
}

/* ---------------------------------------------------------------- running */

const NOT_AZ: Record<string, string> = {
  git: 'git',
  gh: 'the GitHub CLI',
  kubectl: 'kubectl',
  azcopy: 'AzCopy',
  npm: 'npm',
  dotnet: 'dotnet',
  scalar: 'Scalar',
  terraform: 'Terraform',
  bicep: 'Bicep',
  pwsh: 'PowerShell',
}

/** Runs one az command by path, with already-tokenized arguments. */
function runAz(session: Session, words: string[], line: string): ShellResult {
  if (words.length === 0 || (words.length === 1 && ['--help', '-h'].includes(words[0]))) {
    return groupHelp(session, [])
  }
  if (words[0] === '--version' || words[0] === 'version') {
    return {
      lines: [
        out(
          "azure-cli                         2.77.0 (simulated)\n\ncore                              2.77.0\ntelemetry                          1.1.0\n\nPython location '/usr/bin/python3'\nThis is the Azure Learning Hub simulator, not the real Azure CLI.",
        ),
      ],
    }
  }
  if (words[0] === 'find') {
    const term = words
      .slice(1)
      .join(' ')
      .replace(/^["']|["']$/g, '')
      .toLowerCase()
    const hits = [...session.catalog.commands.values()]
      .filter((spec) => `${spec.path.join(' ')} ${spec.summary}`.toLowerCase().includes(term))
      .slice(0, 12)
    if (hits.length === 0) return { lines: [out(`Sorry, no examples for '${term}'.`)] }
    return {
      lines: [
        out(hits.map((spec) => `az ${spec.path.join(' ')}\n    ${spec.summary}`).join('\n\n')),
      ],
    }
  }

  // Walk the command tree as far as the words go.
  const path: string[] = []
  let index = 0
  while (index < words.length && !words[index].startsWith('-')) {
    const children = session.catalog.groups.get(path.join(' '))
    if (!children?.has(words[index])) break
    path.push(words[index])
    index += 1
    if (session.catalog.commands.has(path.join(' ')) && !session.catalog.groups.has(path.join(' ')))
      break
  }
  const spec = session.catalog.commands.get(path.join(' '))
  const isGroup = session.catalog.groups.has(path.join(' '))
  if (!spec || (isGroup && index < words.length && !words[index].startsWith('-'))) {
    const next = words[index]
    if (next === undefined || next === '--help' || next === '-h') return groupHelp(session, path)
    const choices = [...(session.catalog.groups.get(path.join(' ')) ?? [])]
    const near = similar(next, choices)
    const where =
      path.length > 0 ? `the 'az ${path.join(' ')}' command group` : "the 'az' command group"
    const lines = [
      `az: '${next}' is not in ${where}. See 'az ${path.join(' ')}${path.length ? ' ' : ''}--help'.`,
    ]
    if (near.length > 0)
      lines.push(
        '',
        `The most similar choice${near.length > 1 ? 's' : ''} to '${next}' ${near.length > 1 ? 'are' : 'is'}:`,
        ...near.map((choice) => `    ${choice}`),
      )
    return { lines: [err(lines.join('\n'))] }
  }

  const { args, globals } = parseArgs(spec, words.slice(index), session)
  if (globals.help) return commandHelp(spec)
  if (globals.subscription && !/(0000|Azure Learning Hub)/i.test(String(globals.subscription))) {
    throw new CliError(
      `Subscription '${globals.subscription}' not found. Check the spelling and casing and try again.`,
    )
  }
  const format = (globals.output as OutputFormat | undefined) ?? 'json'
  if (!OUTPUT_FORMATS.includes(format))
    throw new CliError(`argument --output/-o: invalid choice: '${format}'`)

  if (!spec.run) {
    const source = spec.reference
      ? ` It is in the ${spec.reference.course} command reference: ${spec.reference.description}`
      : ''
    return {
      lines: [
        info(
          `ⓘ az ${spec.path.join(' ')} is valid, but the simulator does not model these resources, so nothing changed.${source}`,
        ),
      ],
    }
  }

  const execute = (): ShellResult => {
    const snapshot = JSON.stringify(session.state)
    try {
      let value = spec.run?.(args, session)
      if (spec.table && format === 'table' && !globals.query && value !== undefined) {
        value = Array.isArray(value)
          ? value.map((item) => spec.table?.(item))
          : spec.table(value as Record<string, unknown>)
      }
      const text = formatOutput(applyQuery(value, globals.query as string | undefined), format)
      session.state.history.push(line.trim())
      return { lines: text ? [out(text)] : [] }
    } catch (error) {
      // A failed command changes nothing, as on the real control plane.
      Object.assign(session.state, JSON.parse(snapshot))
      throw error
    }
  }

  if (spec.confirm && !args.yes) {
    const question = spec.confirm(args)
    session.pending = { question, run: execute }
    return { lines: [], prompt: question }
  }
  return execute()
}

const BUILTIN_HELP = `Azure CLI simulator - a practice terminal, not a connection to Azure.

  az ...                Azure CLI commands. Try: az group create -n rg-learn -l uksouth
  az <group> --help     What a command group or command can do
  az find "vnet"        Search the commands the simulator knows
  NAME=value, $NAME     Shell variables; $(az ... -o tsv) substitutes output
  history, clear        Your command history; clear the screen
  reset                 Delete every simulated resource and start again

Tab completes commands and parameters. Up and Down walk through history.`

export function run(
  line: string,
  session: Session,
  options: { substitution?: boolean } = {},
): ShellResult {
  const trimmed = line.trim()
  if (!trimmed) return { lines: [] }
  try {
    // NAME=value
    const assignment = /^([A-Za-z_]\w*)=(.*)$/.exec(trimmed)
    if (assignment && !trimmed.startsWith('az ')) {
      const [value] = tokenize(assignment[2] || "''", session)
      session.vars[assignment[1]] = value ?? ''
      return { lines: [] }
    }
    const words = tokenize(trimmed, session)
    const [command, ...rest] = words
    switch (command) {
      case 'az':
        return runAz(session, rest, trimmed)
      case 'help':
        return { lines: [out(BUILTIN_HELP)] }
      case 'clear':
      case 'cls':
        return { lines: [], clear: true }
      case 'echo':
        return { lines: [out(rest.join(' '))] }
      case 'export':
        for (const pair of rest) {
          const [name, ...value] = pair.split('=')
          session.vars[name] = value.join('=')
        }
        return { lines: [] }
      case 'whoami':
        return { lines: [out('learner')] }
      case 'pwd':
        return { lines: [out('/home/learner')] }
      case 'history':
        return {
          lines: [
            out(
              session.state.history
                .map((entry, index) => `${String(index + 1).padStart(5)}  ${entry}`)
                .join('\n') || '(no az commands yet)',
            ),
          ],
        }
      default: {
        if (options.substitution) throw new CliError(`bash: ${command}: command not found`)
        const tool = NOT_AZ[command]
        if (tool) {
          return {
            lines: [
              err(
                `bash: ${command}: this simulator only runs Azure CLI (az) commands. Use ${tool} in your own terminal or in Azure Cloud Shell.`,
              ),
            ],
          }
        }
        const near = similar(command, ['az', 'help', 'clear', 'history', 'echo', 'reset'])
        return {
          lines: [
            err(
              `bash: ${command}: command not found${near.length ? `. Did you mean: ${near[0]}?` : ''}`,
            ),
          ],
        }
      }
    }
  } catch (error) {
    return { lines: [err(error instanceof Error ? error.message : String(error))] }
  }
}

/** Answers a pending y/n question. */
export function answer(session: Session, reply: string): ShellResult {
  const pending = session.pending
  session.pending = null
  if (!pending) return { lines: [] }
  if (!/^y(es)?$/i.test(reply.trim())) return { lines: [info('Operation cancelled.')] }
  try {
    return pending.run()
  } catch (error) {
    return { lines: [err(error instanceof Error ? error.message : String(error))] }
  }
}

/* ------------------------------------------------------------- completion */

export interface Completion {
  /** What the line should become (the common prefix of every candidate). */
  line: string
  /** Shown when there is more than one choice. */
  candidates: string[]
}

/** Bash-style Tab completion for az commands, parameters and choices. */
export function complete(line: string, session: Session): Completion {
  const endsWithSpace = /\s$/.test(line)
  const parts = line.trimStart().split(/\s+/).filter(Boolean)
  const partial = endsWithSpace ? '' : (parts.pop() ?? '')
  const head = line.slice(0, line.length - partial.length)
  if (parts.length === 0) {
    const options = ['az', 'help', 'clear', 'history'].filter((word) => word.startsWith(partial))
    return finish(head, partial, options)
  }
  if (parts[0] !== 'az') return { line, candidates: [] }

  const path: string[] = []
  let index = 1
  while (index < parts.length && session.catalog.groups.get(path.join(' '))?.has(parts[index])) {
    path.push(parts[index])
    index += 1
  }
  const spec = session.catalog.commands.get(path.join(' '))
  const children = [...(session.catalog.groups.get(path.join(' ')) ?? [])]
  const typingCommand = index === parts.length && !partial.startsWith('-')

  if (typingCommand && children.length > 0) {
    return finish(head, partial, children.filter((child) => child.startsWith(partial)).sort())
  }
  if (!spec) return { line, candidates: [] }

  // A value for the previous parameter?
  const previous = parts[parts.length - 1]
  const previousParam = previous?.startsWith('-')
    ? (lookupParam([...spec.params, ...GLOBAL_PARAMS], SHORT_OPTIONS[previous] ?? previous) ??
      lookupParam(spec.params, previous))
    : undefined
  if (previousParam && !previousParam.flag && !partial.startsWith('-')) {
    const values = previousParam.choices ?? valuesFor(previousParam.name, session)
    return finish(
      head,
      partial,
      values.filter((value) => value.toLowerCase().startsWith(partial.toLowerCase())),
    )
  }
  const used = new Set(
    parts
      .filter((part) => part.startsWith('-'))
      .map((part) => lookupParam([...spec.params, ...GLOBAL_PARAMS], part)?.name),
  )
  const names = [
    ...spec.params,
    ...GLOBAL_PARAMS.filter((param) => ['--output', '--query', '--help'].includes(param.name)),
  ]
    .filter((param) => !used.has(param.name))
    .map((param) => param.name)
    .filter((name) => name.startsWith(partial || '--'))
  return finish(head, partial, names)
}

/** Existing resource names, for completing --resource-group, --vnet-name ... */
function valuesFor(name: string, session: Session): string[] {
  const { state } = session
  switch (name) {
    case '--resource-group':
      return state.resourceGroups.map((rg) => rg.name)
    case '--vnet-name':
      return state.vnets.map((vnet) => vnet.name)
    case '--nsg-name':
    case '--network-security-group':
    case '--nsg':
      return state.nsgs.map((nsg) => nsg.name)
    case '--location':
      return ['uksouth', 'ukwest', 'northeurope', 'westeurope', 'eastus', 'westus2', 'centralindia']
    case '--name':
      return [
        ...state.resourceGroups.map((rg) => rg.name),
        ...state.vms.map((vm) => vm.name),
        ...state.storageAccounts.map((account) => account.name),
        ...state.vnets.map((vnet) => vnet.name),
        ...state.nsgs.map((nsg) => nsg.name),
      ]
    default:
      return []
  }
}

function finish(head: string, partial: string, options: string[]): Completion {
  if (options.length === 0) return { line: head + partial, candidates: [] }
  if (options.length === 1) return { line: `${head}${options[0]} `, candidates: [] }
  let prefix = options[0]
  for (const option of options) {
    while (!option.startsWith(prefix)) prefix = prefix.slice(0, -1)
  }
  return { line: head + (prefix.length > partial.length ? prefix : partial), candidates: options }
}
