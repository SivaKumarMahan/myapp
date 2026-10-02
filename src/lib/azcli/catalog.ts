import type { Course } from '../../content/types'
import { COMMANDS, type CommandSpec, type ParamSpec } from './commands'

/**
 * Every `az` command the simulator knows: the modelled ones in commands.ts,
 * plus every command in the courses' command reference.
 *
 * A reference entry's template (`az lock create --name <name> --lock-type
 * CanNotDelete --resource-group <rg>`) says which parameters the command
 * takes, and the ones with a `<placeholder>` value are the ones you must
 * supply - so a command the simulator does not model is still recognised and
 * validated.
 */

/** az's well-known short options. */
export const SHORT_OPTIONS: Record<string, string> = {
  '-g': '--resource-group',
  '-n': '--name',
  '-l': '--location',
  '-o': '--output',
  '-h': '--help',
  '-y': '--yes',
  '-d': '--show-details',
  '-s': '--subscription',
}

export const GLOBAL_PARAMS: ParamSpec[] = [
  {
    name: '--output',
    aliases: ['-o'],
    choices: ['json', 'jsonc', 'table', 'tsv', 'yaml', 'yamlc', 'none'],
    help: 'Output format. Default: json.',
  },
  { name: '--query', help: 'JMESPath query string.' },
  { name: '--help', aliases: ['-h'], flag: true, help: 'Show this help message and exit.' },
  { name: '--only-show-errors', flag: true },
  { name: '--verbose', flag: true },
  { name: '--debug', flag: true },
  { name: '--subscription', help: 'Name or ID of subscription.' },
]

interface Parsed {
  path: string[]
  params: ParamSpec[]
}

/** Reads `az a b c --x <v> -y lit --flag` into a path and parameters. */
export function parseTemplate(template: string): Parsed | null {
  const line = template.split('\n')[0].trim()
  if (!line.startsWith('az ')) return null
  const words = line.split(/\s+/).slice(1)
  const path: string[] = []
  let index = 0
  while (index < words.length && /^[a-z][a-z0-9-]*$/.test(words[index])) path.push(words[index++])
  const params: ParamSpec[] = []
  while (index < words.length) {
    const word = words[index]
    if (!word.startsWith('-')) {
      index += 1
      continue
    }
    const name = SHORT_OPTIONS[word] ?? word
    const value = words[index + 1]
    const takesValue = value !== undefined && !value.startsWith('-')
    if (!GLOBAL_PARAMS.some((param) => param.name === name)) {
      params.push({
        name,
        aliases: SHORT_OPTIONS[word] ? [word] : undefined,
        flag: !takesValue,
        required: takesValue && /^<[^>]+>$/.test(value),
      })
    }
    index += takesValue ? 2 : 1
  }
  return path.length > 0 ? { path, params } : null
}

export interface Catalog {
  commands: Map<string, CommandSpec>
  /** Command groups (`network`, `network vnet`) -> their direct children. */
  groups: Map<string, Set<string>>
}

const key = (path: string[]) => path.join(' ')

export function buildCatalog(courses: Course[]): Catalog {
  const commands = new Map<string, CommandSpec>(
    COMMANDS.map((spec) => [key(spec.path), { ...spec }]),
  )

  for (const course of courses) {
    for (const group of course.commandGroups) {
      for (const entry of group.entries) {
        const parsed = parseTemplate(entry.command)
        if (!parsed) continue
        const id = key(parsed.path)
        const existing = commands.get(id)
        const reference = {
          course: course.examCode,
          template: entry.command.split('\n')[0],
          description: entry.description,
        }
        if (existing?.run) {
          // Modelled commands keep their own accurate parameter list.
          existing.reference ??= reference
          continue
        }
        if (existing) {
          // The same command in two courses: a parameter is required only if
          // every template requires it.
          for (const param of parsed.params) {
            const match = existing.params.find((candidate) => candidate.name === param.name)
            if (match) match.required = match.required && param.required
            else existing.params.push({ ...param, required: false })
          }
          for (const param of existing.params) {
            if (!parsed.params.some((candidate) => candidate.name === param.name))
              param.required = false
          }
          continue
        }
        commands.set(id, {
          path: parsed.path,
          summary: entry.description,
          params: parsed.params,
          reference,
        })
      }
    }
  }

  const groups = new Map<string, Set<string>>()
  for (const spec of commands.values()) {
    for (let depth = 0; depth < spec.path.length; depth += 1) {
      const parent = key(spec.path.slice(0, depth))
      const children = groups.get(parent) ?? new Set<string>()
      children.add(spec.path[depth])
      groups.set(parent, children)
    }
  }
  return { commands, groups }
}
