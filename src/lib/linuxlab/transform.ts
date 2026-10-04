import type { TransformPlugin } from 'just-bash'

/**
 * just-bash runs `"$@"` or `"${cmd[@]}"` in command position as a single
 * word ("echo a b: command not found"), but real bash splits it into a
 * command and its arguments - a common idiom in retry wrappers and scripts
 * that keep ssh options in an array. This rewrites such commands to
 *   eval "$(printf '%q ' "$@" more args)"
 * which expands every word once, quotes it, and runs the result - so
 * functions, builtins and redirections still behave as in bash.
 */

type Node = { type?: string; [key: string]: unknown }

const word = (...parts: Node[]): Node => ({ type: 'Word', parts })

/** True for a name word that is only "$@", "$*", "${arr[@]}" or "${arr[@]:n}" (quoted or not). */
function isSplat(name: Node | null): boolean {
  let parts = (name?.parts as Node[] | undefined) ?? []
  if (parts.length === 1 && parts[0].type === 'DoubleQuoted') parts = parts[0].parts as Node[]
  if (parts.length !== 1 || parts[0].type !== 'ParameterExpansion') return false
  const { parameter, operation } = parts[0] as { parameter: string; operation: Node | null }
  const splat = parameter === '@' || parameter === '*' || /^[A-Za-z_]\w*\[[@*]\]$/.test(parameter)
  return splat && (operation === null || operation.type === 'Substring')
}

function rewrite(command: Node) {
  const printf: Node = {
    type: 'SimpleCommand',
    name: word({ type: 'Literal', value: 'printf' }),
    args: [word({ type: 'SingleQuoted', value: '%q ' }), command.name, ...(command.args as Node[])],
    assignments: [],
    redirections: [],
  }
  const body: Node = {
    type: 'Script',
    statements: [
      {
        type: 'Statement',
        pipelines: [{ type: 'Pipeline', commands: [printf], negated: false }],
        operators: [],
        background: false,
      },
    ],
  }
  command.name = word({ type: 'Literal', value: 'eval' })
  command.args = [
    word({ type: 'DoubleQuoted', parts: [{ type: 'CommandSubstitution', body, legacy: false }] }),
  ]
}

function walk(value: unknown) {
  if (Array.isArray(value)) {
    for (const item of value) walk(item)
    return
  }
  if (!value || typeof value !== 'object') return
  const node = value as Node
  for (const key of Object.keys(node)) walk(node[key])
  if (node.type === 'SimpleCommand' && isSplat(node.name as Node | null)) rewrite(node)
}

export const splatCommandFix: TransformPlugin = {
  name: 'lab-splat-command',
  transform({ ast }) {
    walk(ast)
    return { ast }
  },
}
