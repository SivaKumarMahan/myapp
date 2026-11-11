import { references } from './eval'
import {
  HclError,
  exprToAddress,
  parseHcl,
  type Attribute,
  type Block,
  type Body,
  type Diagnostic,
  type Expr,
  type Value,
} from './hcl'
import { dataSources, schemas } from './provider'

/**
 * Turns the working directory's .tf files into a configuration: the root
 * module, one level of local child modules, and the root's `moved`,
 * `import` and `removed` blocks. Static checks (unknown arguments, missing
 * required ones, undeclared references) happen here, like `terraform validate`.
 */

export interface Lifecycle {
  preventDestroy: boolean
  createBeforeDestroy: boolean
  /** Attribute paths, e.g. `tags` or `tags["CostCenter"]`; 'all' for `all`. */
  ignoreChanges: string[] | 'all'
}

export interface ResourceDecl {
  mode: 'managed' | 'data'
  type: string
  name: string
  /** '' for the root module, otherwise the module call's name. */
  module: string
  file: string
  line: number
  body: Body
  count: Expr | null
  forEach: Expr | null
  lifecycle: Lifecycle
  dependsOn: string[]
}

export interface VariableDecl {
  name: string
  default: Expr | null
  type: Expr | null
  file: string
  line: number
}

export interface ModuleDecl {
  /** '' for root. */
  name: string
  dir: string
  call: Block | null
  variables: Map<string, VariableDecl>
  locals: Map<string, Attribute & { file: string }>
  outputs: Map<string, Attribute & { file: string }>
  resources: ResourceDecl[]
  data: ResourceDecl[]
}

export interface MovedDecl {
  from: string
  to: string
  file: string
  line: number
}
export interface ImportDecl {
  to: string
  id: Expr
  file: string
  line: number
}
export interface RemovedDecl {
  from: string
  destroy: boolean
  file: string
  line: number
}

export interface Config {
  root: ModuleDecl
  children: ModuleDecl[]
  moved: MovedDecl[]
  imports: ImportDecl[]
  removed: RemovedDecl[]
  backend: { type: string; attrs: Record<string, Value> } | null
  tfvars: Record<string, Value>
  files: Record<string, string>
}

export const resourceAddr = (decl: { module: string; type: string; name: string; mode?: string }) =>
  `${decl.module ? `module.${decl.module}.` : ''}${decl.mode === 'data' ? 'data.' : ''}${decl.type}.${decl.name}`

const err = (
  summary: string,
  detail: string,
  file?: string,
  line?: number,
  context?: string,
): Diagnostic => ({
  severity: 'error',
  summary,
  detail,
  ...(file ? { file } : {}),
  ...(line ? { line } : {}),
  ...(context ? { context } : {}),
})

const META = new Set(['count', 'for_each', 'depends_on', 'provider', 'lifecycle'])

/** The .tf files directly inside `dir` ('' for the working directory). */
export function filesIn(files: Record<string, string>, dir: string, ext = '.tf'): string[] {
  return Object.keys(files)
    .filter((path) => {
      if (!path.endsWith(ext)) return false
      const rest = dir ? (path.startsWith(`${dir}/`) ? path.slice(dir.length + 1) : null) : path
      return rest !== null && !rest.includes('/')
    })
    .sort()
}

function literalString(expr: Expr | undefined): string | null {
  return expr && expr.k === 'lit' && typeof expr.v === 'string' ? expr.v : null
}

function staticValue(expr: Expr): Value | undefined {
  switch (expr.k) {
    case 'lit':
      return expr.v
    case 'list': {
      const items = expr.items.map(staticValue)
      return items.some((item) => item === undefined) ? undefined : (items as Value[])
    }
    case 'obj': {
      const out: Record<string, Value> = {}
      for (const item of expr.items) {
        const key = item.key.k === 'lit' ? String(item.key.v) : undefined
        const value = staticValue(item.value)
        if (key === undefined || value === undefined) return undefined
        out[key] = value
      }
      return out
    }
    default:
      return undefined
  }
}

/** Reads `ignore_changes = [tags, tags["CostCenter"]]` into path strings. */
function ignorePaths(expr: Expr, file: string, diags: Diagnostic[]): string[] | 'all' {
  if (expr.k === 'name' && expr.name === 'all') return 'all'
  if (expr.k !== 'list') {
    diags.push(
      err(
        'Invalid ignore_changes',
        'Expected a list of attribute references, or the keyword "all".',
        file,
        expr.line,
      ),
    )
    return []
  }
  const out: string[] = []
  for (const item of expr.items) {
    const path = exprToAddress(item) ?? literalString(item)
    if (!path)
      diags.push(
        err(
          'Invalid ignore_changes',
          'Each item must be an attribute name such as tags or tags["owner"].',
          file,
          item.line,
        ),
      )
    else out.push(path)
  }
  return out
}

function decodeLifecycle(body: Body, file: string, diags: Diagnostic[]): Lifecycle {
  const lifecycle: Lifecycle = {
    preventDestroy: false,
    createBeforeDestroy: false,
    ignoreChanges: [],
  }
  for (const block of body.blocks.filter((b) => b.type === 'lifecycle')) {
    for (const attr of block.body.attrs) {
      if (attr.name === 'prevent_destroy' || attr.name === 'create_before_destroy') {
        if (attr.expr.k !== 'lit' || typeof attr.expr.v !== 'boolean') {
          diags.push(
            err(
              'Invalid lifecycle value',
              `The ${attr.name} argument must be the literal true or false.`,
              file,
              attr.line,
            ),
          )
          continue
        }
        if (attr.name === 'prevent_destroy') lifecycle.preventDestroy = attr.expr.v
        else lifecycle.createBeforeDestroy = attr.expr.v
      } else if (attr.name === 'ignore_changes') {
        lifecycle.ignoreChanges = ignorePaths(attr.expr, file, diags)
      } else if (attr.name === 'replace_triggered_by') {
        // accepted, not simulated
      } else {
        diags.push(
          err(
            'Unsupported argument',
            `An argument named "${attr.name}" is not expected here.`,
            file,
            attr.line,
          ),
        )
      }
    }
    for (const inner of block.body.blocks) {
      if (inner.type === 'precondition' || inner.type === 'postcondition') continue
      diags.push(
        err(
          'Unsupported block type',
          `Blocks of type "${inner.type}" are not expected here.`,
          file,
          inner.line,
        ),
      )
    }
  }
  return lifecycle
}

function validateResourceBody(decl: ResourceDecl, diags: Diagnostic[]) {
  const schema = schemas[decl.type]
  const context = `resource "${decl.type}" "${decl.name}"`
  if (!schema) return
  for (const attr of decl.body.attrs) {
    if (META.has(attr.name)) continue
    const spec = schema.attrs[attr.name]
    if (!spec) {
      diags.push(
        err(
          'Unsupported argument',
          schema.blocks[attr.name]
            ? `An argument named "${attr.name}" is not expected here. Did you mean to define a block of type "${attr.name}"?`
            : `An argument named "${attr.name}" is not expected here.`,
          decl.file,
          attr.line,
          context,
        ),
      )
    } else if (spec.computed) {
      diags.push(
        err(
          'Invalid or unknown key',
          `"${attr.name}" is set by Azure and cannot be configured (it is a read-only attribute).`,
          decl.file,
          attr.line,
          context,
        ),
      )
    }
  }
  for (const [name, spec] of Object.entries(schema.attrs)) {
    if (spec.required && !decl.body.attrs.some((attr) => attr.name === name))
      diags.push(
        err(
          'Missing required argument',
          `The argument "${name}" is required, but no definition was found.`,
          decl.file,
          decl.line,
          context,
        ),
      )
  }
  for (const block of decl.body.blocks) {
    if (block.type === 'lifecycle') continue
    const spec = schema.blocks[block.type]
    if (!spec) {
      diags.push(
        err(
          'Unsupported block type',
          `Blocks of type "${block.type}" are not expected here.`,
          decl.file,
          block.line,
          context,
        ),
      )
      continue
    }
    for (const attr of block.body.attrs)
      if (!spec.attrs[attr.name])
        diags.push(
          err(
            'Unsupported argument',
            `An argument named "${attr.name}" is not expected here.`,
            decl.file,
            attr.line,
            context,
          ),
        )
    for (const [name, inner] of Object.entries(spec.attrs))
      if (inner.required && !block.body.attrs.some((attr) => attr.name === name))
        diags.push(
          err(
            'Missing required argument',
            `The argument "${name}" is required, but no definition was found.`,
            decl.file,
            block.line,
            context,
          ),
        )
  }
  for (const [name, spec] of Object.entries(schema.blocks)) {
    const count = decl.body.blocks.filter((block) => block.type === name).length
    if (spec.required && count === 0)
      diags.push(
        err(
          `Insufficient ${name} blocks`,
          `At least 1 "${name}" blocks are required.`,
          decl.file,
          decl.line,
          context,
        ),
      )
    if (spec.max && count > spec.max)
      diags.push(
        err(
          `Too many ${name} blocks`,
          `No more than ${spec.max} "${name}" blocks are allowed.`,
          decl.file,
          decl.line,
          context,
        ),
      )
  }
}

function decodeModule(
  name: string,
  dir: string,
  call: Block | null,
  bodies: { file: string; body: Body }[],
  diags: Diagnostic[],
  root: Partial<Config>,
): ModuleDecl {
  const module: ModuleDecl = {
    name,
    dir,
    call,
    variables: new Map(),
    locals: new Map(),
    outputs: new Map(),
    resources: [],
    data: [],
  }
  const seen = new Set<string>()
  for (const { file, body } of bodies) {
    for (const attr of body.attrs)
      diags.push(
        err(
          'Unsupported argument',
          `An argument named "${attr.name}" is not expected here.`,
          file,
          attr.line,
        ),
      )
    for (const block of body.blocks) {
      const labels = block.labels
      const needLabels = (count: number) => {
        if (labels.length === count) return true
        diags.push(
          err(
            labels.length < count
              ? `Missing name for ${block.type}`
              : `Extraneous label for ${block.type}`,
            `${block.type === 'resource' || block.type === 'data' ? `All ${block.type} blocks must have 2 labels (type, name).` : `A ${block.type} block must have ${count} label${count === 1 ? '' : 's'}.`}`,
            file,
            block.line,
          ),
        )
        return false
      }
      switch (block.type) {
        case 'terraform': {
          for (const inner of block.body.blocks) {
            if (inner.type === 'backend') {
              const attrs: Record<string, Value> = {}
              for (const attr of inner.body.attrs) attrs[attr.name] = staticValue(attr.expr) ?? null
              root.backend = { type: inner.labels[0] ?? '', attrs }
            }
          }
          break
        }
        case 'provider':
          if (!needLabels(1)) break
          if (labels[0] !== 'azurerm') {
            diags.push(
              err(
                'Provider not available in this lab',
                `Only the azurerm provider is simulated here, not "${labels[0]}".`,
                file,
                block.line,
              ),
            )
            break
          }
          if (!block.body.blocks.some((inner) => inner.type === 'features'))
            diags.push(
              err(
                'Insufficient features blocks',
                'At least 1 "features" blocks are required.',
                file,
                block.line,
                'provider "azurerm"',
              ),
            )
          ;(root as { providerSeen?: boolean }).providerSeen = true
          break
        case 'variable':
          if (!needLabels(1)) break
          if (module.variables.has(labels[0])) {
            diags.push(
              err(
                'Duplicate variable declaration',
                `A variable named "${labels[0]}" was already declared.`,
                file,
                block.line,
              ),
            )
            break
          }
          module.variables.set(labels[0], {
            name: labels[0],
            default: block.body.attrs.find((attr) => attr.name === 'default')?.expr ?? null,
            type: block.body.attrs.find((attr) => attr.name === 'type')?.expr ?? null,
            file,
            line: block.line,
          })
          break
        case 'locals':
          for (const attr of block.body.attrs) {
            if (module.locals.has(attr.name))
              diags.push(
                err(
                  'Duplicate local value definition',
                  `A local value named "${attr.name}" was already defined.`,
                  file,
                  attr.line,
                ),
              )
            module.locals.set(attr.name, { ...attr, file })
          }
          break
        case 'output': {
          if (!needLabels(1)) break
          const value = block.body.attrs.find((attr) => attr.name === 'value')
          if (!value)
            diags.push(
              err(
                'Missing required argument',
                'The argument "value" is required, but no definition was found.',
                file,
                block.line,
              ),
            )
          else module.outputs.set(labels[0], { ...value, file })
          break
        }
        case 'resource':
        case 'data': {
          if (!needLabels(2)) break
          const [type, rname] = labels
          const mode = block.type === 'data' ? 'data' : 'managed'
          if (mode === 'managed' && !schemas[type]) {
            diags.push(
              err(
                'Invalid resource type',
                `The provider hashicorp/azurerm does not support resource type "${type}"${type.startsWith('azurerm_') ? ' (or this lab does not simulate it)' : ''}.`,
                file,
                block.line,
              ),
            )
            break
          }
          if (mode === 'data' && !dataSources[type]) {
            diags.push(
              err(
                'Invalid data source',
                `The lab does not simulate the data source "${type}".`,
                file,
                block.line,
              ),
            )
            break
          }
          const key = `${mode}.${type}.${rname}`
          if (seen.has(key)) {
            diags.push(
              err(
                `Duplicate ${mode === 'data' ? 'data' : 'resource'} "${type}" configuration`,
                `A ${mode === 'data' ? 'data' : 'resource'} named "${rname}" was already declared. Resource names must be unique per type in each module.`,
                file,
                block.line,
              ),
            )
            break
          }
          seen.add(key)
          const count = block.body.attrs.find((attr) => attr.name === 'count')?.expr ?? null
          const forEach = block.body.attrs.find((attr) => attr.name === 'for_each')?.expr ?? null
          if (count && forEach)
            diags.push(
              err(
                'Invalid combination of "count" and "for_each"',
                'The "count" and "for_each" meta-arguments are mutually-exclusive, only one should be used to be explicit about the number of resources to be created.',
                file,
                block.line,
              ),
            )
          const dependsOn = block.body.attrs.find((attr) => attr.name === 'depends_on')
          const decl: ResourceDecl = {
            mode,
            type,
            name: rname,
            module: name,
            file,
            line: block.line,
            body: block.body,
            count,
            forEach,
            lifecycle: decodeLifecycle(block.body, file, diags),
            dependsOn:
              dependsOn && dependsOn.expr.k === 'list'
                ? dependsOn.expr.items.map((item) => exprToAddress(item) ?? '').filter(Boolean)
                : [],
          }
          if (mode === 'managed') {
            validateResourceBody(decl, diags)
            module.resources.push(decl)
          } else module.data.push(decl)
          break
        }
        case 'module':
          if (name) {
            diags.push(
              err(
                'Nested modules are not simulated',
                'This lab supports one level of local modules.',
                file,
                block.line,
              ),
            )
            break
          }
          if (!needLabels(1)) break
          ;(root as { moduleCalls?: Block[] }).moduleCalls?.push(block)
          break
        case 'moved':
        case 'import':
        case 'removed': {
          if (name) {
            diags.push(
              err(
                `${block.type} blocks in child modules are not simulated`,
                `Put the ${block.type} block in the root module.`,
                file,
                block.line,
              ),
            )
            break
          }
          const get = (key: string) => block.body.attrs.find((attr) => attr.name === key)
          if (block.type === 'moved') {
            const from = get('from')
            const to = get('to')
            const fromAddr = from && exprToAddress(from.expr)
            const toAddr = to && exprToAddress(to.expr)
            if (!fromAddr || !toAddr) {
              diags.push(
                err(
                  'Invalid "moved" block',
                  'A moved block needs from and to, each a resource or module address such as azurerm_subnet.app["web"].',
                  file,
                  block.line,
                ),
              )
              break
            }
            root.moved?.push({ from: fromAddr, to: toAddr, file, line: block.line })
          } else if (block.type === 'import') {
            const to = get('to')
            const id = get('id')
            const toAddr = to && exprToAddress(to.expr)
            if (!toAddr || !id) {
              diags.push(
                err(
                  'Invalid "import" block',
                  'An import block needs to (a resource address) and id (the Azure resource ID).',
                  file,
                  block.line,
                ),
              )
              break
            }
            root.imports?.push({ to: toAddr, id: id.expr, file, line: block.line })
          } else {
            const from = get('from')
            const fromAddr = from && exprToAddress(from.expr)
            if (!fromAddr) {
              diags.push(
                err(
                  'Invalid "removed" block',
                  'A removed block needs from = <resource address>.',
                  file,
                  block.line,
                ),
              )
              break
            }
            if (/\]$/.test(fromAddr)) {
              diags.push(
                err(
                  'Resource instance keys not allowed',
                  'Resource address must be a resource (e.g. "azurerm_subnet.app"), not a resource instance (e.g. "azurerm_subnet.app[1]").',
                  file,
                  from.line,
                ),
              )
              break
            }
            let destroy = true
            for (const lifecycle of block.body.blocks.filter(
              (inner) => inner.type === 'lifecycle',
            )) {
              const flag = lifecycle.body.attrs.find((attr) => attr.name === 'destroy')
              if (flag && flag.expr.k === 'lit' && typeof flag.expr.v === 'boolean')
                destroy = flag.expr.v
            }
            root.removed?.push({ from: fromAddr, destroy, file, line: block.line })
          }
          break
        }
        case 'check':
          break
        default:
          diags.push(
            err(
              'Unsupported block type',
              `Blocks of type "${block.type}" are not expected here.`,
              file,
              block.line,
            ),
          )
      }
    }
  }
  return module
}

/** Checks every reference in the module points at something declared. */
function checkReferences(module: ModuleDecl, children: ModuleDecl[], diags: Diagnostic[]) {
  const declared = new Set(module.resources.map((decl) => `${decl.type}.${decl.name}`))
  const declaredData = new Set(module.data.map((decl) => `${decl.type}.${decl.name}`))
  const where = module.name ? `module.${module.name}` : 'the root module'
  const check = (expr: Expr | null, file: string, decl: ResourceDecl | null) => {
    for (const names of references(expr)) {
      const [root, first, second] = names
      const line = expr?.line
      if (root === 'var') {
        if (first && !module.variables.has(first))
          diags.push(
            err(
              'Reference to undeclared input variable',
              `An input variable with the name "${first}" has not been declared. This variable can be declared with a variable "${first}" {} block.`,
              file,
              line,
            ),
          )
      } else if (root === 'local') {
        if (first && !module.locals.has(first))
          diags.push(
            err(
              'Reference to undeclared local value',
              `A local value with the name "${first}" has not been declared.`,
              file,
              line,
            ),
          )
      } else if (root === 'each') {
        if (!decl?.forEach)
          diags.push(
            err(
              'Reference to "each" in context without for_each',
              'The "each" object can be used only in "module" or "resource" blocks, and only when the "for_each" argument is set.',
              file,
              line,
            ),
          )
      } else if (root === 'count') {
        if (!decl?.count)
          diags.push(
            err(
              'Reference to "count" in non-counted context',
              'The "count" object can only be used in "module", "resource", and "data" blocks, and only when the "count" argument is set.',
              file,
              line,
            ),
          )
      } else if (root === 'module') {
        if (module.name)
          diags.push(
            err(
              'Reference to undeclared module',
              'Child modules in this lab cannot call other modules.',
              file,
              line,
            ),
          )
        else if (first && !children.some((child) => child.name === first))
          diags.push(
            err(
              'Reference to undeclared module',
              `No module call named "${first}" is declared in the root module.`,
              file,
              line,
            ),
          )
        else if (first && second && !second.startsWith('[')) {
          const child = children.find((entry) => entry.name === first)
          if (child && !child.outputs.has(second))
            diags.push(
              err(
                'Unsupported attribute',
                `This object does not have an attribute named "${second}". The module "${first}" has no output with that name.`,
                file,
                line,
              ),
            )
        }
      } else if (root === 'data') {
        if (first && second && !declaredData.has(`${first}.${second}`))
          diags.push(
            err(
              'Reference to undeclared resource',
              `A data resource "${first}" "${second}" has not been declared in ${where}.`,
              file,
              line,
            ),
          )
      } else if (root === 'path' || root === 'terraform' || root === 'self') {
        // fine
      } else if (first && !first.startsWith('[')) {
        if (!declared.has(`${root}.${first}`))
          diags.push(
            err(
              'Reference to undeclared resource',
              `A managed resource "${root}" "${first}" has not been declared in ${where}.`,
              file,
              line,
            ),
          )
      } else {
        diags.push(
          err(
            'Invalid reference',
            `A reference to a resource type must be followed by at least one attribute access, specifying the resource name.`,
            file,
            line,
          ),
        )
      }
    }
  }
  for (const decl of [...module.resources, ...module.data]) {
    for (const attr of decl.body.attrs)
      check(attr.expr, decl.file, attr.name === 'depends_on' ? null : decl)
    for (const block of decl.body.blocks) {
      if (block.type === 'lifecycle') continue
      for (const attr of block.body.attrs) check(attr.expr, decl.file, decl)
    }
  }
  for (const local of module.locals.values()) check(local.expr, local.file, null)
  for (const output of module.outputs.values()) check(output.expr, output.file, null)
  if (!module.name)
    for (const child of children)
      for (const attr of child.call?.body.attrs ?? [])
        if (attr.name !== 'source') check(attr.expr, child.call?.file ?? 'main.tf', null)
}

/** Parses and decodes the working directory. */
export function loadConfig(
  files: Record<string, string>,
  installedModules: string[] | null = null,
): { config: Config | null; diagnostics: Diagnostic[] } {
  const diags: Diagnostic[] = []
  const parsed = new Map<string, Body>()
  const parse = (path: string) => {
    if (parsed.has(path)) return parsed.get(path) as Body
    try {
      const body = parseHcl(files[path], path)
      parsed.set(path, body)
      return body
    } catch (error) {
      if (error instanceof HclError) diags.push(error.diagnostic)
      else throw error
      return null
    }
  }
  const rootFiles = filesIn(files, '')
  if (!rootFiles.length) {
    diags.push(
      err(
        'No configuration files',
        'Apply requires configuration to be present. There are no .tf files in this directory.',
      ),
    )
    return { config: null, diagnostics: diags }
  }
  const partial: Partial<Config> & { moduleCalls: Block[]; providerSeen?: boolean } = {
    moved: [],
    imports: [],
    removed: [],
    backend: null,
    moduleCalls: [],
  }
  const rootBodies = rootFiles
    .map((file) => ({ file, body: parse(file) }))
    .filter((entry): entry is { file: string; body: Body } => entry.body !== null)
  if (diags.length) return { config: null, diagnostics: diags }
  const root = decodeModule('', '', null, rootBodies, diags, partial)
  if (!partial.providerSeen)
    diags.push(
      err(
        'Insufficient features blocks',
        'At least 1 "features" blocks are required. The azurerm provider needs a provider "azurerm" block containing features {}.',
      ),
    )

  const children: ModuleDecl[] = []
  for (const call of partial.moduleCalls) {
    const name = call.labels[0]
    const sourceAttr = call.body.attrs.find((attr) => attr.name === 'source')
    const source = literalString(sourceAttr?.expr)
    if (!source) {
      diags.push(
        err(
          'Missing required argument',
          'The argument "source" is required, but no definition was found.',
          call.file,
          call.line,
          `module "${name}"`,
        ),
      )
      continue
    }
    if (!source.startsWith('./')) {
      diags.push(
        err(
          'Module source not available offline',
          `Only local modules (source = "./...") are simulated in this lab, not "${source}".`,
          call.file,
          sourceAttr?.line,
        ),
      )
      continue
    }
    const dir = source.slice(2).replace(/\/$/, '')
    if (installedModules && !installedModules.includes(`${name}=${dir}`)) {
      diags.push(
        err(
          'Module not installed',
          'This module is not yet installed. Run "terraform init" to install all modules required by this configuration.',
          call.file,
          call.line,
          `module "${name}"`,
        ),
      )
      continue
    }
    const moduleFiles = filesIn(files, dir)
    if (!moduleFiles.length) {
      diags.push(
        err(
          'Unreadable module directory',
          `The directory ${dir} does not exist or cannot be read.`,
          call.file,
          sourceAttr?.line,
          `module "${name}"`,
        ),
      )
      continue
    }
    const bodies = moduleFiles
      .map((file) => ({ file, body: parse(file) }))
      .filter((entry): entry is { file: string; body: Body } => entry.body !== null)
    const child = decodeModule(name, dir, call, bodies, diags, partial)
    for (const attr of call.body.attrs) {
      if (attr.name === 'source' || META.has(attr.name) || attr.name === 'version') continue
      if (!child.variables.has(attr.name))
        diags.push(
          err(
            'Unsupported argument',
            `An argument named "${attr.name}" is not expected here.`,
            call.file,
            attr.line,
            `module "${name}"`,
          ),
        )
    }
    for (const variable of child.variables.values())
      if (!variable.default && !call.body.attrs.some((attr) => attr.name === variable.name))
        diags.push(
          err(
            'Missing required argument',
            `The argument "${variable.name}" is required, but no definition was found.`,
            call.file,
            call.line,
            `module "${name}"`,
          ),
        )
    children.push(child)
  }
  for (const module of [root, ...children]) checkReferences(module, children, diags)

  let tfvars: Record<string, Value> = {}
  if (files['terraform.tfvars'] !== undefined) {
    const body = parse('terraform.tfvars')
    if (body) {
      tfvars = Object.fromEntries(
        body.attrs.map((attr) => [attr.name, staticValue(attr.expr) ?? null]),
      )
      for (const name of Object.keys(tfvars))
        if (!root.variables.has(name))
          diags.push({
            severity: 'warning',
            summary: 'Value for undeclared variable',
            detail: `The root module does not declare a variable named "${name}" but a value was found in file "terraform.tfvars".`,
          })
    }
  }

  // moved / removed / import address sanity
  for (const removed of partial.removed ?? []) {
    const declared = [root, ...children].some((module) =>
      module.resources.some((decl) => resourceAddr(decl) === removed.from),
    )
    if (declared)
      diags.push(
        err(
          'Removed resource block still exists',
          `This statement declares that ${removed.from} was removed, but it is still declared in configuration.`,
          removed.file,
          removed.line,
        ),
      )
  }

  const config: Config = {
    root,
    children,
    moved: partial.moved ?? [],
    imports: partial.imports ?? [],
    removed: partial.removed ?? [],
    backend: partial.backend ?? null,
    tfvars,
    files,
  }
  return {
    config: diags.some((diag) => diag.severity === 'error') ? null : config,
    diagnostics: diags,
  }
}

/** Every resource declaration in the configuration, root first. */
export function allResources(config: Config): ResourceDecl[] {
  return [config.root, ...config.children].flatMap((module) => module.resources)
}
