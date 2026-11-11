import jmespath from 'jmespath'
import { allResources, filesIn, loadConfig, resourceAddr } from './config'
import {
  AZURERM_VERSION,
  SUBSCRIPTION_ID,
  TENANT_ID,
  TERRAFORM_VERSION,
  applyPlan,
  checkLock,
  clone,
  cloudGet,
  cloudList,
  formatValue,
  hasChanges,
  normaliseAddress,
  parseAddress,
  plan,
  renderPlan,
  renderStateInstance,
  resourceOf,
  type CloudResource,
  type EnvData,
  type PlanResult,
} from './engine'
import { formatDiagnostics, type Value } from './hcl'
import { armView, schemas, typeForId } from './provider'

/**
 * The lab's terminal: `terraform` (init, validate, fmt, plan, apply, show,
 * state, import, output, force-unlock), a read-only `az`, and a few shell
 * basics. Commands mutate the EnvData they are given.
 */

export interface CommandResult {
  output: string
  error: boolean
  /** Set when the command is waiting for an answer ("Enter a value:"). */
  awaiting?: string
}

export type Pending =
  { kind: 'apply'; plan: PlanResult; refreshOnly: boolean } | { kind: 'unlock'; id: string }

/** Per-terminal state that is not part of the saved environment. */
export interface ShellSession {
  pending: Pending | null
}

const ok = (output: string): CommandResult => ({ output, error: false })
const bad = (output: string): CommandResult => ({ output, error: true })

/** Splits a command line like a POSIX shell would (quotes, backslashes). */
export function tokenize(line: string): string[] {
  const out: string[] = []
  let current = ''
  let has = false
  let quote: '"' | "'" | null = null
  for (let i = 0; i < line.length; i++) {
    const ch = line[i]
    if (quote) {
      if (ch === quote) quote = null
      else if (ch === '\\' && quote === '"' && (line[i + 1] === '"' || line[i + 1] === '\\'))
        current += line[++i]
      else current += ch
    } else if (ch === '"' || ch === "'") {
      quote = ch
      has = true
    } else if (ch === '\\' && i + 1 < line.length) {
      current += line[++i]
      has = true
    } else if (/\s/.test(ch)) {
      if (has || current) out.push(current)
      current = ''
      has = false
    } else {
      current += ch
      has = true
    }
  }
  if (has || current) out.push(current)
  return out
}

/** Reads `-name=value` / `-name value` style flags. */
function parseFlags(args: string[], withValue: string[]) {
  const flags = new Map<string, string[]>()
  const positional: string[] = []
  for (let i = 0; i < args.length; i++) {
    const arg = args[i]
    const match = /^--?([a-z-]+)(?:=(.*))?$/.exec(arg)
    if (!match) {
      positional.push(arg)
      continue
    }
    const [, name, value] = match
    let resolved = value
    if (resolved === undefined && withValue.includes(name) && i + 1 < args.length)
      resolved = args[++i]
    flags.set(name, [...(flags.get(name) ?? []), resolved ?? 'true'])
  }
  const flag = (name: string) => flags.get(name)?.at(-1)
  return {
    flags,
    positional,
    flag,
    has: (name: string) => flags.has(name) && flag(name) !== 'false',
  }
}

/* ---------- terraform ---------- */

const USAGE = `Usage: terraform [global options] <subcommand> [args]

Main commands:
  init          Prepare your working directory for other commands
  validate      Check whether the configuration is valid
  plan          Show changes required by the current configuration
  apply         Create or update infrastructure
  destroy       (not simulated - a lab has no reason to destroy everything)

All other commands:
  fmt           Reformat your configuration in the standard style
  force-unlock  Release a stuck lock on the current workspace
  import        Associate existing infrastructure with a Terraform resource
  output        Show output values from your root module
  show          Show the current state or a saved plan
  state         Advanced state management (list, show, mv, rm, pull)
  version       Show the current Terraform version`

const APPROVE = `Do you want to perform these actions?
  Terraform will perform the actions described above.
  Only 'yes' will be accepted to approve.`

const LOCKING = 'Acquiring state lock. This may take a few moments...'
const RELEASING = 'Releasing state lock. This may take a few moments...'

function init(env: EnvData): CommandResult {
  const { config, diagnostics } = loadConfig(env.files, null)
  const lines = ['Initializing the backend...']
  if (!config) {
    lines.push(
      '',
      'Terraform encountered problems during initialisation, including problems',
      'with the configuration, described below.',
      '',
      'The Terraform configuration must be valid before initialization so that',
      'Terraform can determine which modules and providers need to be installed.',
      '',
      formatDiagnostics(diagnostics, env.files),
    )
    return bad(lines.join('\n'))
  }
  if (!env.init.done)
    lines.push(
      '',
      'Successfully configured the backend "azurerm"! Terraform will automatically',
      'use this backend unless the backend configuration changes.',
    )
  const modules = config.children.map((child) => `${child.name}=${child.dir}`)
  if (modules.length) {
    lines.push('Initializing modules...')
    for (const child of config.children)
      if (!env.init.modules.includes(`${child.name}=${child.dir}`))
        lines.push(`- ${child.name} in ${child.dir}`)
  }
  lines.push(
    '',
    'Initializing provider plugins...',
    '- Reusing previous version of hashicorp/azurerm from the dependency lock file',
    `- Using previously-installed hashicorp/azurerm v${AZURERM_VERSION}`,
    '',
    'Terraform has been successfully initialized!',
    '',
    'You may now begin working with Terraform. Try running "terraform plan" to see',
    'any changes that are required for your infrastructure. All Terraform commands',
    'should now work.',
  )
  env.init = { done: true, modules }
  return ok(lines.join('\n'))
}

function validate(env: EnvData): CommandResult {
  if (!env.init.done)
    return bad(
      formatDiagnostics([
        {
          severity: 'error',
          summary: 'Missing required provider',
          detail:
            "This configuration requires provider registry.terraform.io/hashicorp/azurerm, but that provider isn't available. You may be able to install it automatically by running:\n  terraform init",
        },
      ]),
    )
  const { config, diagnostics } = loadConfig(env.files, env.init.modules)
  if (!config) return bad(formatDiagnostics(diagnostics, env.files))
  const warnings = diagnostics.filter((diag) => diag.severity === 'warning')
  return ok(
    `${warnings.length ? `${formatDiagnostics(warnings, env.files)}\n` : ''}Success! The configuration is valid.`,
  )
}

/* fmt: re-indent by bracket depth and align `=` in runs of one-line attributes. */
export function formatHcl(src: string): string {
  const lines = src.replace(/\r\n/g, '\n').split('\n')
  const out: { text: string; depth: number; attr: boolean }[] = []
  let depth = 0
  let heredoc: string | null = null
  for (const raw of lines) {
    if (heredoc) {
      out.push({ text: raw, depth: -1, attr: false })
      if (raw.trim() === heredoc) heredoc = null
      continue
    }
    const trimmed = raw.trim()
    let opens = 0
    let closes = 0
    let leadingCloses = 0
    let inString = false
    let leading = true
    for (let i = 0; i < trimmed.length; i++) {
      const ch = trimmed[i]
      if (inString) {
        if (ch === '\\') i++
        else if (ch === '"') inString = false
        continue
      }
      if (ch === '"') {
        inString = true
        leading = false
      } else if (ch === '#' || (ch === '/' && trimmed[i + 1] === '/')) break
      else if ('{[('.includes(ch)) {
        opens++
        leading = false
      } else if ('}])'.includes(ch)) {
        if (leading) leadingCloses++
        else closes++
      } else if (ch !== ' ') leading = false
    }
    const lineDepth = Math.max(0, depth - leadingCloses)
    const doc = /<<-?([A-Z]+)\s*$/.exec(trimmed)
    if (doc) heredoc = doc[1]
    const attrMatch = /^([A-Za-z_][\w-]*)\s*=(?!=)\s*(.*)$/.exec(trimmed)
    const oneLine = attrMatch && opens === closes && !doc
    out.push({
      text: attrMatch ? `${attrMatch[1]} = ${attrMatch[2]}` : trimmed,
      depth: lineDepth,
      attr: Boolean(oneLine),
    })
    depth = Math.max(0, depth - leadingCloses - closes + opens)
  }
  // align runs
  let i = 0
  while (i < out.length) {
    if (!out[i].attr) {
      i++
      continue
    }
    let j = i
    while (j < out.length && out[j].attr && out[j].depth === out[i].depth) j++
    const width = Math.max(...out.slice(i, j).map((entry) => entry.text.indexOf(' = ')))
    for (let k = i; k < j; k++) {
      const at = out[k].text.indexOf(' = ')
      out[k].text = `${out[k].text.slice(0, at).padEnd(width)}${out[k].text.slice(at)}`
    }
    i = j
  }
  const text = out
    .map((entry) =>
      entry.depth < 0 ? entry.text : entry.text ? `${'  '.repeat(entry.depth)}${entry.text}` : '',
    )
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
  return text.endsWith('\n') ? text : `${text}\n`
}

function fmt(env: EnvData, args: string[]): CommandResult {
  const { has } = parseFlags(args, [])
  const changed: string[] = []
  for (const path of Object.keys(env.files).sort()) {
    if (!path.endsWith('.tf') && !path.endsWith('.tfvars')) continue
    if (path.includes('/') && !has('recursive')) continue
    const formatted = formatHcl(env.files[path])
    if (formatted !== env.files[path]) {
      changed.push(path)
      if (!has('check')) env.files[path] = formatted
    }
  }
  return { output: changed.join('\n'), error: has('check') && changed.length > 0 }
}

function runPlan(env: EnvData, args: string[]): CommandResult {
  const { flag, has, flags } = parseFlags(args, [
    'out',
    'target',
    'var-file',
    'lock-timeout',
    'var',
  ])
  if (flags.has('var') || flags.has('var-file'))
    return bad(
      formatDiagnostics([
        {
          severity: 'error',
          summary: 'Variables on the command line are not simulated',
          detail: 'Edit terraform.tfvars or the variable defaults instead.',
        },
      ]),
    )
  const useLock = flag('lock') !== 'false'
  const lock = checkLock(env, useLock)
  if (lock) return bad(`${LOCKING}\n${formatDiagnostics([lock])}`)
  const result = plan(env, {
    refreshOnly: has('refresh-only'),
    refresh: flag('refresh') !== 'false',
    targets: flags.get('target') ?? [],
  })
  const out = flag('out')
  if (out && result.ok)
    env.plans[out] = { serial: env.state.serial, lineage: env.state.lineage, plan: result }
  const text = renderPlan(result, out ? { out } : {})
  return {
    output: `${useLock ? `${LOCKING}\n` : ''}${text}${useLock ? `\n${RELEASING}` : ''}`,
    error: !result.ok,
  }
}

function runApply(env: EnvData, args: string[], session: ShellSession): CommandResult {
  const { flag, has, flags, positional } = parseFlags(args, [
    'target',
    'lock-timeout',
    'var',
    'var-file',
  ])
  const useLock = flag('lock') !== 'false'
  const lock = checkLock(env, useLock)
  if (lock) return bad(`${LOCKING}\n${formatDiagnostics([lock])}`)
  if (positional.length) {
    const name = positional[0]
    const saved = env.plans[name]
    if (!saved)
      return bad(
        formatDiagnostics([
          {
            severity: 'error',
            summary: `Failed to load "${name}" as a plan file`,
            detail: `Error: stat ${name}: no such file or directory`,
          },
        ]),
      )
    if (saved.serial !== env.state.serial || saved.lineage !== env.state.lineage)
      return bad(
        formatDiagnostics([
          {
            severity: 'error',
            summary: 'Saved plan is stale',
            detail:
              'The given plan file can no longer be applied because the state was changed by another operation after the plan was created.',
          },
        ]),
      )
    if (!hasChanges(saved.plan) && !saved.plan.refreshOnly)
      return ok('\nApply complete! Resources: 0 added, 0 changed, 0 destroyed.')
    const applied = applyPlan(env, clone(saved.plan))
    return { output: `${LOCKING}\n${applied.output}\n${RELEASING}`, error: !applied.ok }
  }
  const refreshOnly = has('refresh-only')
  const result = plan(env, {
    refreshOnly,
    refresh: flag('refresh') !== 'false',
    targets: flags.get('target') ?? [],
  })
  const text = renderPlan(result, { forApply: true })
  const prefix = useLock ? `${LOCKING}\n` : ''
  if (!result.ok) return bad(`${prefix}${text}`)
  if (!refreshOnly && !hasChanges(result)) {
    const applied = applyPlan(env, result)
    return { output: `${prefix}${text}\n${applied.output}`, error: !applied.ok }
  }
  if (refreshOnly && !result.drift.length) {
    return ok(`${prefix}${text}\n\nApply complete! Resources: 0 added, 0 changed, 0 destroyed.`)
  }
  if (has('auto-approve')) {
    const applied = applyPlan(env, result)
    return {
      output: `${prefix}${text}\n${applied.output}${useLock ? `\n${RELEASING}` : ''}`,
      error: !applied.ok,
    }
  }
  session.pending = { kind: 'apply', plan: result, refreshOnly }
  const question = refreshOnly
    ? `Would you like to update the Terraform state to reflect these detected changes?
  Terraform will write these changes to the state without modifying any real infrastructure.
  There is no undo. Only 'yes' will be accepted to confirm.`
    : APPROVE
  return { output: `${prefix}${text}\n\n${question}`, error: false, awaiting: 'Enter a value:' }
}

function answer(env: EnvData, session: ShellSession, line: string): CommandResult {
  const pending = session.pending as Pending
  session.pending = null
  const yes = line.trim() === 'yes'
  if (pending.kind === 'apply') {
    if (!yes) return bad(`  Enter a value: ${line}\n\nApply cancelled.`)
    if (pending.plan.serial !== env.state.serial)
      return bad(
        `  Enter a value: ${line}\n\nThe state changed while waiting for approval. Run the plan again.`,
      )
    const applied = applyPlan(env, pending.plan)
    return {
      output: `  Enter a value: ${line}\n\n${applied.output}\n${RELEASING}`,
      error: !applied.ok,
    }
  }
  if (!yes) return bad(`  Enter a value: ${line}\n\nforce-unlock cancelled.`)
  return unlock(env, pending.id, `  Enter a value: ${line}\n\n`)
}

function unlock(env: EnvData, id: string, prefix = ''): CommandResult {
  if (!env.lock)
    return bad(
      `${prefix}Failed to unlock state: the state blob is not locked (there is no lock to release).`,
    )
  if (env.lock.id !== id)
    return bad(
      `${prefix}Failed to unlock state: lock ID "${id}" does not match existing lock ID "${env.lock.id}"`,
    )
  env.lock = null
  return ok(
    `${prefix}Terraform state has been successfully unlocked!\n\nThe state has been unlocked, and Terraform commands should now be able to\nobtain a new lock on the remote state.`,
  )
}

function forceUnlock(env: EnvData, args: string[], session: ShellSession): CommandResult {
  const { has, positional } = parseFlags(args, [])
  if (!positional[0])
    return bad(
      'Expected a single argument: LOCK_ID\n\nUsage: terraform [global options] force-unlock [options] LOCK_ID',
    )
  if (has('force')) return unlock(env, positional[0])
  if (!env.lock) return unlock(env, positional[0])
  session.pending = { kind: 'unlock', id: positional[0] }
  return {
    output:
      "Do you really want to force-unlock?\n  Terraform will remove the lock on the remote state.\n  This will allow local Terraform commands to modify this state, even though it\n  may still be in use. Only 'yes' will be accepted to confirm.",
    error: false,
    awaiting: 'Enter a value:',
  }
}

function show(env: EnvData, args: string[]): CommandResult {
  const { positional } = parseFlags(args, [])
  if (positional[0]) {
    const saved = env.plans[positional[0]]
    if (!saved)
      return bad(
        formatDiagnostics([
          {
            severity: 'error',
            summary: 'Failed to read the given file as a state or plan file',
            detail: `State read error: no such file "${positional[0]}"`,
          },
        ]),
      )
    return ok(renderPlan({ ...saved.plan, refreshLines: [] }, { forApply: true }))
  }
  if (!env.state.resources.length)
    return ok('The state file is empty. No resources are represented.')
  const parts = env.state.resources.map(renderStateInstance)
  const outputs = Object.entries(env.outputs)
  if (outputs.length)
    parts.push(
      `Outputs:\n\n${outputs.map(([name, value]) => `${name} = ${formatValue(value)}`).join('\n')}`,
    )
  return ok(parts.join('\n\n'))
}

const matchAddress = (addr: string, target: string) =>
  addr === target || addr.startsWith(`${target}[`) || addr.startsWith(`${target}.`)

function state(env: EnvData, args: string[]): CommandResult {
  const [sub, ...rest] = args
  const mutating = sub === 'mv' || sub === 'rm'
  const { has, positional, flag } = parseFlags(rest, [])
  if (mutating) {
    const lock = checkLock(env, flag('lock') !== 'false')
    if (lock) return bad(formatDiagnostics([lock]))
  }
  switch (sub) {
    case 'list': {
      const filter = positional.map(normaliseAddress)
      const addrs = env.state.resources
        .map((instance) => instance.addr)
        .filter((addr) => !filter.length || filter.some((target) => matchAddress(addr, target)))
      return ok(addrs.join('\n'))
    }
    case 'show': {
      if (!positional[0])
        return bad(
          'Exactly one argument expected.\n\nUsage: terraform [global options] state show [options] ADDRESS',
        )
      const addr = normaliseAddress(positional[0])
      const instance = env.state.resources.find((entry) => entry.addr === addr)
      if (!instance) {
        const some = env.state.resources.filter((entry) => matchAddress(entry.addr, addr))
        if (some.length > 1)
          return bad(
            formatDiagnostics([
              {
                severity: 'error',
                summary: 'Multiple instances found for the given pattern',
                detail: `This command requires that the address references one specific instance.\nTo view the available instances, use "terraform state list". Please modify\nthe address to reference a specific instance.`,
              },
            ]),
          )
        if (some.length === 1) return ok(renderStateInstance(some[0]))
        return bad(
          formatDiagnostics([
            {
              severity: 'error',
              summary: 'No instance found for the given address!',
              detail:
                'This command requires that the address references one specific instance.\nTo view the available instances, use "terraform state list". Please modify\nthe address to reference a specific instance.',
            },
          ]),
        )
      }
      return ok(renderStateInstance(instance))
    }
    case 'mv': {
      if (positional.length !== 2)
        return bad(
          'Exactly two arguments expected.\n\nUsage: terraform [global options] state mv [options] SOURCE DESTINATION',
        )
      const [from, to] = positional.map(normaliseAddress)
      const sources = env.state.resources.filter((entry) => matchAddress(entry.addr, from))
      if (!sources.length)
        return bad(
          formatDiagnostics([
            {
              severity: 'error',
              summary: 'Invalid source address',
              detail: `Cannot move ${from}: does not match anything in the current state.`,
            },
          ]),
        )
      if (!parseAddress(to) && !/^module\.[\w-]+$/.test(to))
        return bad(
          formatDiagnostics([
            {
              severity: 'error',
              summary: 'Invalid target address',
              detail: `Cannot move to ${to}: it is not a valid resource or module address.`,
            },
          ]),
        )
      const moves = sources.map((entry) => ({ entry, target: to + entry.addr.slice(from.length) }))
      for (const { target, entry } of moves) {
        if (env.state.resources.some((other) => other.addr === target))
          return bad(
            formatDiagnostics([
              {
                severity: 'error',
                summary: 'Invalid target address',
                detail: `Cannot move to ${target}: there is already a resource instance at that address in the current state.`,
              },
            ]),
          )
        const parsed = parseAddress(target)
        if (parsed && parsed.type !== entry.type)
          return bad(
            formatDiagnostics([
              {
                severity: 'error',
                summary: 'Invalid state move request',
                detail: `Cannot move ${entry.addr} to ${target}: resource types don't match.`,
              },
            ]),
          )
      }
      if (has('dry-run'))
        return ok(
          moves.map(({ entry, target }) => `Would move "${entry.addr}" to "${target}"`).join('\n'),
        )
      for (const { entry, target } of moves) entry.addr = target
      env.state.resources.sort((a, b) => a.addr.localeCompare(b.addr))
      env.state.serial++
      return ok(
        `${moves
          .map(({ target }) => `Move "${from}" to "${to}"${target !== to ? ` (${target})` : ''}`)
          .slice(0, 1)
          .join('\n')}\nSuccessfully moved ${moves.length} object(s).`,
      )
    }
    case 'rm': {
      if (!positional.length)
        return bad(
          'At least one address is required.\n\nUsage: terraform [global options] state rm [options] ADDRESS...',
        )
      const targets = positional.map(normaliseAddress)
      const removed = env.state.resources.filter((entry) =>
        targets.some((target) => matchAddress(entry.addr, target)),
      )
      if (!removed.length)
        return bad(
          formatDiagnostics([
            {
              severity: 'error',
              summary: 'Invalid target address',
              detail:
                'No matching objects found. To view the available instances, use "terraform state list". Please modify the address to reference a specific instance.',
            },
          ]),
        )
      if (has('dry-run')) return ok(removed.map((entry) => `Would remove ${entry.addr}`).join('\n'))
      env.state.resources = env.state.resources.filter((entry) => !removed.includes(entry))
      env.state.serial++
      return ok(
        `${removed.map((entry) => `Removed ${entry.addr}`).join('\n')}\nSuccessfully removed ${removed.length} resource instance(s).`,
      )
    }
    case 'pull':
      return ok(
        JSON.stringify(
          {
            version: 4,
            terraform_version: TERRAFORM_VERSION,
            serial: env.state.serial,
            lineage: env.state.lineage,
            outputs: Object.fromEntries(
              Object.entries(env.outputs).map(([name, value]) => [name, { value }]),
            ),
            resources: env.state.resources.map((entry) => {
              const parsed = parseAddress(entry.addr)
              return {
                ...(parsed?.module ? { module: `module.${parsed.module}` } : {}),
                mode: 'managed',
                type: entry.type,
                name: parsed?.name,
                provider: 'provider["registry.terraform.io/hashicorp/azurerm"]',
                instances: [
                  {
                    ...(parsed?.key !== null && parsed?.key !== undefined
                      ? { index_key: parsed.key }
                      : {}),
                    schema_version: 0,
                    attributes: entry.attrs,
                  },
                ],
              }
            }),
          },
          null,
          2,
        ),
      )
    default:
      return bad(
        'Usage: terraform [global options] state <subcommand> [options] [args]\n\nSubcommands: list, show, mv, rm, pull',
      )
  }
}

function importCommand(env: EnvData, args: string[]): CommandResult {
  const { positional, flag } = parseFlags(args, [])
  if (positional.length !== 2)
    return bad(
      'The import command expects two arguments.\n\nUsage: terraform [global options] import [options] ADDR ID',
    )
  const lock = checkLock(env, flag('lock') !== 'false')
  if (lock) return bad(formatDiagnostics([lock]))
  const addr = normaliseAddress(positional[0])
  const id = positional[1]
  const parsed = parseAddress(addr)
  const { config, diagnostics } = loadConfig(env.files, env.init.modules)
  if (!config) return bad(formatDiagnostics(diagnostics, env.files))
  const decl =
    parsed && allResources(config).find((entry) => resourceAddr(entry) === resourceOf(addr))
  if (!parsed || !decl)
    return bad(
      formatDiagnostics([
        {
          severity: 'error',
          summary: `resource address "${addr}" does not exist in the configuration.`,
          detail: `Before importing this resource, please create its configuration in the root module. For example:\n\nresource "${parsed?.type ?? 'azurerm_resource_group'}" "${parsed?.name ?? 'name'}" {\n  # (resource arguments)\n}`,
        },
      ]),
    )
  if (env.state.resources.some((entry) => entry.addr === addr))
    return bad(
      formatDiagnostics([
        {
          severity: 'error',
          summary: 'Resource already managed by Terraform',
          detail: `Terraform is already managing a remote object for ${addr}. To import to this address you must first remove the existing object from the state.`,
        },
      ]),
    )
  const schema = schemas[parsed.type]
  if (!schema.idPattern.test(id))
    return bad(
      formatDiagnostics([
        {
          severity: 'error',
          summary: `parsing ${JSON.stringify(id)}`,
          detail: `The ID is not a valid ${parsed.type} ID${typeForId(id) ? ` - it looks like a ${typeForId(id)} ID` : ''}.`,
        },
      ]),
    )
  const live = cloudGet(env, id)
  if (!live)
    return bad(
      `${addr}: Importing from ID "${id}"...\n${formatDiagnostics([{ severity: 'error', summary: 'Cannot import non-existent remote object', detail: `While attempting to import an existing object to "${addr}", the provider detected that no object exists with the given id. Only pre-existing objects can be imported; check that the id is correct and that it is associated with the provider's configured region or endpoint, or use "terraform apply" to create a new remote object for this resource.` }])}`,
    )
  env.state.resources.push({ addr, type: parsed.type, attrs: clone(live.attrs) })
  env.state.resources.sort((a, b) => a.addr.localeCompare(b.addr))
  env.state.serial++
  return ok(
    `${addr}: Importing from ID "${id}"...\n${addr}: Import prepared!\n  Prepared ${parsed.type} for import\n${addr}: Refreshing state... [id=${live.id}]\n\nImport successful!\n\nThe resources that were imported are shown above. These resources are now in\nyour Terraform state and will henceforth be managed by Terraform.`,
  )
}

function output(env: EnvData, args: string[]): CommandResult {
  const { positional, has } = parseFlags(args, [])
  const entries = Object.entries(env.outputs)
  if (positional[0]) {
    if (!(positional[0] in env.outputs))
      return bad(
        formatDiagnostics([
          {
            severity: 'error',
            summary: 'Output not found',
            detail: `The output variable requested could not be found in the state file. If you recently added this to your configuration, be sure to run \`terraform apply\`, since the state won't be updated with new output variables until that command is run.`,
          },
        ]),
      )
    const value = env.outputs[positional[0]]
    return ok(has('raw') && typeof value === 'string' ? value : formatValue(value))
  }
  if (!entries.length)
    return ok(
      formatDiagnostics([
        {
          severity: 'warning',
          summary: 'No outputs found',
          detail:
            'The state file either has no outputs defined, or all the defined outputs are\nempty. Please define an output in your configuration with the `output`\nkeyword and run `terraform apply` for it to become available.',
        },
      ]),
    )
  return ok(entries.map(([name, value]) => `${name} = ${formatValue(value)}`).join('\n'))
}

export function terraform(env: EnvData, args: string[], session: ShellSession): CommandResult {
  const [sub, ...rest] = args.filter((arg, index) => !(index === 0 && /^-chdir=/.test(arg)))
  switch (sub) {
    case undefined:
    case '-help':
    case '--help':
    case 'help':
      return ok(USAGE)
    case 'version':
    case '-version':
    case '--version':
      return ok(
        `Terraform v${TERRAFORM_VERSION}\non linux_amd64\n+ provider registry.terraform.io/hashicorp/azurerm v${AZURERM_VERSION}`,
      )
    case 'init':
      return init(env)
    case 'validate':
      return validate(env)
    case 'fmt':
      return fmt(env, rest)
    case 'plan':
      return runPlan(env, rest)
    case 'apply':
      return runApply(env, rest, session)
    case 'destroy':
      return bad(
        'terraform destroy is not simulated in this lab - and in production it should be the rarest command you run. Remove resources from the configuration (or use a removed block) instead.',
      )
    case 'show':
      return show(env, rest)
    case 'state':
      return state(env, rest)
    case 'import':
      return importCommand(env, rest)
    case 'output':
      return output(env, rest)
    case 'force-unlock':
      return forceUnlock(env, rest, session)
    case 'refresh':
      return bad(
        'terraform refresh is deprecated. Use "terraform plan -refresh-only" to review drift, and "terraform apply -refresh-only" to accept it into state.',
      )
    case 'workspace':
      return ok(rest[0] === 'list' ? '* default' : 'default')
    case 'providers':
      return ok(
        `Providers required by configuration:\n.\n└── provider[registry.terraform.io/hashicorp/azurerm] ~> 4.0\n\nProviders required by state:\n\n    provider[registry.terraform.io/hashicorp/azurerm]`,
      )
    case 'taint':
      return bad(
        'terraform taint is deprecated. Use "terraform apply -replace=ADDRESS" when you really want a replacement (not simulated here).',
      )
    default:
      return bad(
        `Terraform has no command named "${sub}".\n\nTo see all of Terraform's top-level commands, run:\n  terraform -help`,
      )
  }
}

/* ---------- az (read-only) ---------- */

const metaOf = (resource: CloudResource) => ({
  createdAt: resource.createdAt,
  createdBy: resource.createdBy,
  modifiedAt: resource.modifiedAt,
  modifiedBy: resource.modifiedBy,
})

export const armOf = (resource: CloudResource) =>
  armView(resource.type, resource.attrs, metaOf(resource))

function table(rows: Record<string, Value>[]): string {
  if (!rows.length) return ''
  const columns = Object.keys(rows[0])
  const text = (value: Value) =>
    value === null || value === undefined
      ? ''
      : typeof value === 'object'
        ? JSON.stringify(value)
        : String(value)
  const widths = columns.map((column) =>
    Math.max(column.length, ...rows.map((row) => text(row[column]).length)),
  )
  const line = (cells: string[]) =>
    cells
      .map((cell, index) => cell.padEnd(widths[index]))
      .join('  ')
      .trimEnd()
  return [
    line(columns),
    line(widths.map((width) => '-'.repeat(width))),
    ...rows.map((row) => line(columns.map((column) => text(row[column])))),
  ].join('\n')
}

function render(
  data: Value,
  outputMode: string,
  query: string | undefined,
  tableRows?: Record<string, Value>[],
): CommandResult {
  let value: Value = data
  if (query) {
    try {
      value = jmespath.search(data as never, query) as Value
    } catch (error) {
      return bad(
        `ERROR: argument --query: invalid jmespath_type value: ${JSON.stringify(query)} (${(error as Error).message})`,
      )
    }
  }
  if (outputMode === 'table') {
    const rows = query
      ? Array.isArray(value)
        ? value
        : [value]
      : (tableRows ?? (Array.isArray(value) ? value : [value]))
    const objects = rows.map((row) =>
      row && typeof row === 'object' && !Array.isArray(row)
        ? (row as Record<string, Value>)
        : { Result: row as Value },
    )
    return ok(table(objects))
  }
  if (outputMode === 'tsv') {
    const rows = Array.isArray(value) ? value : [value]
    return ok(
      rows
        .map((row) =>
          row && typeof row === 'object'
            ? Object.values(row)
                .map((cell) => (typeof cell === 'object' ? '' : String(cell)))
                .join('\t')
            : String(row),
        )
        .join('\n'),
    )
  }
  return ok(JSON.stringify(value, null, 2))
}

function az(env: EnvData, args: string[]): CommandResult {
  const line = args.join(' ').replace(/\s+/g, ' ').trim()
  for (const [prefix, text] of Object.entries(env.canned))
    if (`az ${line}`.startsWith(prefix)) return ok(text)
  const { flag, positional } = parseFlags(args, [
    'g',
    'resource-group',
    'n',
    'name',
    'o',
    'output',
    'ids',
    'query',
    'vnet-name',
    'resource-type',
    'offset',
  ])
  const rg = flag('g') ?? flag('resource-group')
  const name = flag('n') ?? flag('name')
  const outputMode = flag('o') ?? flag('output') ?? 'json'
  const query = flag('query')
  const words = positional.join(' ')
  const all = cloudList(env)
  const inRg = (resource: CloudResource) =>
    !rg ||
    String(
      resource.attrs.resource_group_name ??
        (resource.type === 'azurerm_resource_group' ? resource.attrs.name : ''),
    ).toLowerCase() === rg.toLowerCase()
  const byType = (type: string) =>
    all.filter((resource) => resource.type === type && inRg(resource))
  const notFound = (what: string) =>
    bad(
      `ERROR: (ResourceNotFound) The ${what} '${name ?? ''}' could not be found${rg ? ` in resource group '${rg}'` : ''}.\nCode: ResourceNotFound`,
    )
  const findOne = (type: string, what: string) => {
    const found = byType(type).find(
      (resource) => String(resource.attrs.name).toLowerCase() === String(name ?? '').toLowerCase(),
    )
    return found ? render(armOf(found), outputMode, query) : notFound(what)
  }
  if (/\b(create|delete|update|set|add|remove|purge|start|stop|restart|scale)\b/.test(words))
    return bad(
      "ERROR: this lab's az CLI is read-only. Make changes through Terraform (that is the point of the exercise).",
    )
  switch (words) {
    case 'account show':
      return render(
        {
          id: SUBSCRIPTION_ID,
          name: 'Contoso Production',
          tenantId: TENANT_ID,
          state: 'Enabled',
          isDefault: true,
          user: { name: 'you@contoso.com', type: 'user' },
        },
        outputMode,
        query,
      )
    case 'group list': {
      const groups = byType('azurerm_resource_group')
      return render(
        groups.map(armOf),
        outputMode,
        query,
        groups.map((group) => ({
          Name: group.attrs.name,
          Location: group.attrs.location,
          Status: 'Succeeded',
        })),
      )
    }
    case 'group show':
      return findOne('azurerm_resource_group', 'resource group')
    case 'resource list': {
      const type = flag('resource-type')
      const items = all.filter(
        (resource) =>
          resource.type !== 'azurerm_resource_group' &&
          resource.type !== 'azurerm_subnet' &&
          inRg(resource) &&
          (!type || schemas[resource.type].armType.toLowerCase() === type.toLowerCase()),
      )
      return render(
        items.map(armOf),
        outputMode,
        query,
        items.map((resource) => ({
          Name: resource.attrs.name,
          ResourceGroup: resource.attrs.resource_group_name,
          Location: resource.attrs.location,
          Type: schemas[resource.type].armType,
          Created: resource.createdAt,
        })),
      )
    }
    case 'resource show': {
      const ids = flag('ids')
      if (!ids) return bad('ERROR: (--ids | --resource-group --name --resource-type) are required')
      const found = cloudGet(env, ids)
      return found
        ? render(armOf(found), outputMode, query)
        : bad(
            `ERROR: (ResourceNotFound) The Resource '${ids.split('/').slice(-2).join('/')}' was not found.\nCode: ResourceNotFound`,
          )
    }
    case 'storage account list': {
      const items = byType('azurerm_storage_account')
      return render(
        items.map(armOf),
        outputMode,
        query,
        items.map((item) => ({
          Name: item.attrs.name,
          ResourceGroup: item.attrs.resource_group_name,
          Location: item.attrs.location,
          Kind: item.attrs.account_kind,
          Sku: `${String(item.attrs.account_tier)}_${String(item.attrs.account_replication_type)}`,
          MinTls: item.attrs.min_tls_version,
        })),
      )
    }
    case 'storage account show':
      return findOne('azurerm_storage_account', 'Resource Microsoft.Storage/storageAccounts')
    case 'storage account check-name': {
      const wanted = String(name ?? '').toLowerCase()
      if (!/^[a-z0-9]{3,24}$/.test(wanted))
        return render(
          {
            message: `${wanted} is not a valid storage account name. Storage account name must be between 3 and 24 characters in length and use numbers and lower-case letters only.`,
            nameAvailable: false,
            reason: 'AccountNameInvalid',
          },
          outputMode,
          query,
        )
      const taken =
        env.takenNames.includes(wanted) ||
        all.some(
          (resource) =>
            resource.type === 'azurerm_storage_account' &&
            String(resource.attrs.name).toLowerCase() === wanted,
        )
      return render(
        taken
          ? {
              message: `The storage account named ${wanted} is already taken.`,
              nameAvailable: false,
              reason: 'AlreadyExists',
            }
          : { message: null, nameAvailable: true, reason: null },
        outputMode,
        query,
      )
    }
    case 'keyvault list': {
      const items = byType('azurerm_key_vault')
      return render(
        items.map(armOf),
        outputMode,
        query,
        items.map((item) => ({
          Name: item.attrs.name,
          ResourceGroup: item.attrs.resource_group_name,
          Location: item.attrs.location,
        })),
      )
    }
    case 'keyvault show':
      return findOne('azurerm_key_vault', 'Vault')
    case 'network vnet list': {
      const items = byType('azurerm_virtual_network')
      return render(
        items.map(armOf),
        outputMode,
        query,
        items.map((item) => ({
          Name: item.attrs.name,
          ResourceGroup: item.attrs.resource_group_name,
          Location: item.attrs.location,
          AddressSpace: (item.attrs.address_space as string[]).join(' '),
        })),
      )
    }
    case 'network vnet show':
      return findOne('azurerm_virtual_network', 'Resource Microsoft.Network/virtualNetworks')
    case 'network vnet subnet list': {
      const vnet = flag('vnet-name')
      const items = byType('azurerm_subnet').filter(
        (item) =>
          !vnet || String(item.attrs.virtual_network_name).toLowerCase() === vnet.toLowerCase(),
      )
      return render(
        items.map(armOf),
        outputMode,
        query,
        items.map((item) => ({
          Name: item.attrs.name,
          VirtualNetwork: item.attrs.virtual_network_name,
          AddressPrefixes: (item.attrs.address_prefixes as string[]).join(' '),
          Created: (item as CloudResource).createdAt,
        })),
      )
    }
    case 'network nsg list': {
      const items = byType('azurerm_network_security_group')
      return render(
        items.map(armOf),
        outputMode,
        query,
        items.map((item) => ({
          Name: item.attrs.name,
          ResourceGroup: item.attrs.resource_group_name,
          Location: item.attrs.location,
        })),
      )
    }
    case 'appservice plan list': {
      const items = byType('azurerm_service_plan')
      return render(
        items.map(armOf),
        outputMode,
        query,
        items.map((item) => ({
          Name: item.attrs.name,
          ResourceGroup: item.attrs.resource_group_name,
          Location: item.attrs.location,
          Sku: item.attrs.sku_name,
          Workers: item.attrs.worker_count,
        })),
      )
    }
    case 'appservice plan show':
      return findOne('azurerm_service_plan', 'Resource Microsoft.Web/serverFarms')
    case 'webapp list': {
      const items = byType('azurerm_linux_web_app')
      return render(
        items.map(armOf),
        outputMode,
        query,
        items.map((item) => ({
          Name: item.attrs.name,
          ResourceGroup: item.attrs.resource_group_name,
          DefaultHostName: item.attrs.default_hostname,
        })),
      )
    }
    case 'webapp show':
      return findOne('azurerm_linux_web_app', 'Resource Microsoft.Web/sites')
    case 'monitor activity-log list': {
      const items = env.activity.filter(
        (entry) =>
          !rg || entry.resource.toLowerCase().includes(`/resourcegroups/${rg.toLowerCase()}`),
      )
      const rows = [...items].reverse().map((entry) => ({
        EventTimestamp: entry.time,
        Caller: entry.caller,
        OperationName: entry.operation,
        Status: entry.status,
        ResourceId: entry.resource,
      }))
      return render(
        rows,
        outputMode,
        query,
        rows.map((row) => ({
          ...row,
          ResourceId: String(row.ResourceId).split('/').slice(-2).join('/'),
        })),
      )
    }
    case 'policy assignment list': {
      const policy = env.policy
      const rows = policy
        ? [
            {
              name: policy.name,
              displayName: policy.displayName,
              enforcementMode: 'Default',
              effect: 'modify',
              scope: `/subscriptions/${SUBSCRIPTION_ID}`,
              parameters: { tags: policy.tags },
            },
          ]
        : []
      return render(
        rows,
        outputMode,
        query,
        rows.map((row) => ({
          Name: row.name,
          DisplayName: row.displayName,
          Effect: row.effect,
          Scope: row.scope,
        })),
      )
    }
    default:
      return bad(
        `ERROR: 'az ${words}' is not simulated in this lab.\nTry: az group list, az resource list -g <rg> -o table, az resource show --ids <id>, az storage account show -n <name>, az storage account check-name -n <name>, az monitor activity-log list -g <rg> -o table, az policy assignment list -o table.`,
      )
  }
}

/* ---------- shell ---------- */

const DOT_LOCK = `# This file is maintained automatically by "terraform init".
# Manual edits may be lost in future updates.

provider "registry.terraform.io/hashicorp/azurerm" {
  version     = "${AZURERM_VERSION}"
  constraints = "~> 4.0"
  hashes = [
    "h1:Qm7K2y0E1nP6tWb2c3XrZ4lJ0n8vFQ9sR1uH5aG7dKw=",
  ]
}
`

export const HELP = `What you can use here
  terraform   init · validate · fmt [-check] · plan [-out=tfplan] [-refresh-only] [-target=ADDR] [-lock=false]
              apply [-auto-approve] [-refresh-only] [tfplan] · show [tfplan] · output
              state list | show ADDR | mv SRC DST | rm ADDR | pull · import ADDR ID · force-unlock [-force] LOCK_ID
  az          read-only: group list · resource list -g RG -o table · resource show --ids ID
              storage account show -n NAME · storage account check-name -n NAME · keyvault show -n NAME
              appservice plan show -n NAME -g RG · network vnet subnet list -g RG --vnet-name VNET
              monitor activity-log list -g RG -o table · policy assignment list -o table · --query works
  shell       ls [-a] [dir] · cat FILE · pwd · echo · clear · history · help
Editing       change files in the Files tab - commands always see the latest version
Prompts       apply asks "Enter a value:" - type yes (or use -auto-approve / a saved plan)
Terminal      ↑/↓ history · Tab completes commands, files and addresses · Ctrl+L clear`

function ls(env: EnvData, args: string[]): CommandResult {
  const { has, positional } = parseFlags(args, [])
  const dir = (positional[0] ?? '').replace(/^\.\/?/, '').replace(/\/$/, '')
  const all = has('a') || has('la') || has('al')
  const entries = new Set<string>()
  for (const path of Object.keys(env.files)) {
    const rest = dir ? (path.startsWith(`${dir}/`) ? path.slice(dir.length + 1) : null) : path
    if (rest === null) continue
    const [head, ...tail] = rest.split('/')
    entries.add(tail.length ? `${head}/` : head)
  }
  if (!dir) {
    for (const name of Object.keys(env.plans)) entries.add(name)
    if (all) {
      entries.add('.terraform/')
      entries.add('.terraform.lock.hcl')
    }
  }
  if (!entries.size && dir)
    return bad(`ls: cannot access '${positional[0]}': No such file or directory`)
  return ok([...entries].sort().join('\n'))
}

function cat(env: EnvData, args: string[]): CommandResult {
  if (!args.length) return bad('cat: missing file operand')
  const out: string[] = []
  for (const arg of args) {
    const path = arg.replace(/^\.\//, '')
    if (path === '.terraform.lock.hcl') out.push(DOT_LOCK)
    else if (env.files[path] !== undefined) out.push(env.files[path].replace(/\n$/, ''))
    else if (env.plans[path]) out.push('(binary plan file - use terraform show tfplan to read it)')
    else if (
      Object.keys(env.files).some((file) => file.startsWith(`${path}/`)) ||
      path === '.terraform'
    )
      return bad(`cat: ${arg}: Is a directory`)
    else return bad(`cat: ${arg}: No such file or directory`)
  }
  return ok(out.join('\n'))
}

/** Runs one line in the lab terminal. */
export function runCommand(env: EnvData, session: ShellSession, line: string): CommandResult {
  if (session.pending) return answer(env, session, line)
  const trimmed = line.trim()
  if (!trimmed) return ok('')
  if (/[|;&]|>/.test(trimmed.replace(/"[^"]*"|'[^']*'|\[[^\]]*\]/g, '')))
    return bad(
      'This lab terminal runs one command at a time (no pipes, redirects or ;). Use --query for az output.',
    )
  const [command, ...args] = tokenize(trimmed)
  switch (command) {
    case 'terraform':
    case 'tf':
      return terraform(env, args, session)
    case 'az':
      return az(env, args)
    case 'ls':
    case 'll':
      return ls(env, args)
    case 'cat':
      return cat(env, args)
    case 'pwd':
      return ok('/home/you/infra')
    case 'echo':
      return ok(
        args.join(' ').replace(/\$ARM_SUBSCRIPTION_ID|\$\{ARM_SUBSCRIPTION_ID\}/g, SUBSCRIPTION_ID),
      )
    case 'help':
      return ok(HELP)
    case 'cd':
      return ok(
        '(the lab keeps you in the working directory - use ls modules/... and cat modules/.../main.tf)',
      )
    case 'tree':
      return ok(Object.keys(env.files).sort().join('\n'))
    case 'rm':
    case 'vi':
    case 'vim':
    case 'nano':
      return bad(`${command}: edit files in the Files tab instead.`)
    default:
      return bad(`bash: ${command}: command not found`)
  }
}

/* ---------- tab completion ---------- */

const TF_SUBCOMMANDS = [
  'init',
  'validate',
  'fmt',
  'plan',
  'apply',
  'show',
  'state',
  'import',
  'output',
  'force-unlock',
  'version',
  'providers',
]

/** Completes the last word of `input`. Returns the new input and the options. */
export function complete(env: EnvData, input: string): { input: string; options: string[] } {
  const words = input.split(/\s+/)
  const last = words[words.length - 1] ?? ''
  const before = words.slice(0, -1)
  const stateAddrs = env.state.resources.map((entry) => entry.addr)
  const { config } = loadConfig(env.files, null)
  const configAddrs = config ? allResources(config).map(resourceAddr) : []
  const files = [...Object.keys(env.files), ...Object.keys(env.plans)]
  let options: string[] = []
  let prefix = ''
  let word = last
  if (before.length === 0)
    options = ['terraform', 'az', 'ls', 'cat', 'clear', 'help', 'history', 'pwd']
  else if (before[0] === 'terraform' && before.length === 1) options = TF_SUBCOMMANDS
  else if (before[0] === 'terraform' && before[1] === 'state' && before.length === 2)
    options = ['list', 'show', 'mv', 'rm', 'pull']
  else if (before[0] === 'terraform' && before[1] === 'state') options = stateAddrs
  else if (before[0] === 'terraform' && before[1] === 'import' && before.length === 2)
    options = configAddrs
  else if (before[0] === 'terraform' && (before[1] === 'apply' || before[1] === 'show'))
    options = [...Object.keys(env.plans), '-auto-approve', '-refresh-only']
  else if (before[0] === 'terraform' && before[1] === 'plan')
    options = ['-out=tfplan', '-refresh-only', '-target=', '-lock=false']
  else if (before[0] === 'terraform' && before[1] === 'force-unlock')
    options = ['-force', ...(env.lock ? [env.lock.id] : [])]
  else if (before[0] === 'cat' || before[0] === 'ls') options = files
  else if (before[0] === 'az' && before.length === 1)
    options = [
      'group',
      'resource',
      'storage',
      'keyvault',
      'network',
      'appservice',
      'webapp',
      'monitor',
      'policy',
      'account',
    ]
  if (last.startsWith('-target=')) {
    prefix = '-target='
    word = last.slice(prefix.length)
    options = [...new Set([...configAddrs, ...stateAddrs])]
  }
  const matches = options.filter((option) => option.startsWith(word))
  if (!matches.length) return { input, options: [] }
  let common = matches[0]
  for (const match of matches) while (!match.startsWith(common)) common = common.slice(0, -1)
  const quote = (value: string) => (/[[\]"]/.test(value) ? `'${value}'` : value)
  const completed = matches.length === 1 ? `${quote(prefix + matches[0])} ` : prefix + common
  return { input: [...before, completed].join(' '), options: matches.length > 1 ? matches : [] }
}

export { filesIn }
