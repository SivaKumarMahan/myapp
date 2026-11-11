import {
  allResources,
  loadConfig,
  resourceAddr,
  type Config,
  type ModuleDecl,
  type ResourceDecl,
} from './config'
import {
  asSet,
  containsUnknown,
  deepEqual,
  evaluate,
  isObject,
  isSet,
  references,
  typeName,
  type EvalContext,
  type Step,
} from './eval'
import {
  HclError,
  UNKNOWN,
  formatDiagnostics,
  isUnknown,
  type Body,
  type Diagnostic,
  type Expr,
  type Value,
} from './hcl'
import { completeAttrs, fakeGuid, forcesNew, schemas, type Attrs } from './provider'

/**
 * The pretend Terraform + Azure world: a working directory, a remote state
 * file, the "real" Azure resources, and the plan/apply engine that connects
 * them. Everything is plain data (EnvData) so it can be saved in
 * localStorage and replayed in tests.
 */

export const SUBSCRIPTION_ID = '3f2b8c1e-5a4d-4e7b-9c6a-1d2e3f4a5b6c'
export const TENANT_ID = '9b8a7c6d-2e1f-4a3b-8c5d-6e7f8a9b0c1d'
export const TERRAFORM_VERSION = '1.16.0'
export const AZURERM_VERSION = '4.52.0'
const START = Date.UTC(2026, 10, 11, 9, 0, 0)

export interface CloudResource {
  id: string
  type: string
  attrs: Attrs
  /** Changes whenever the resource is deleted and created again. */
  uid: string
  createdAt: string
  createdBy: string
  modifiedAt: string
  modifiedBy: string
}

export interface StateInstance {
  addr: string
  type: string
  attrs: Attrs
}

export interface StateData {
  serial: number
  lineage: string
  resources: StateInstance[]
}

export interface LockInfo {
  id: string
  path: string
  operation: string
  who: string
  version: string
  created: string
  info: string
}

export interface Activity {
  time: string
  caller: string
  operation: string
  resource: string
  status: string
}

/** An Azure Policy "modify" assignment that adds tags when they are missing. */
export interface PolicyRule {
  name: string
  displayName: string
  tags: Record<string, string>
  types: string[]
}

export interface SavedPlan {
  serial: number
  lineage: string
  plan: PlanResult
}

export interface EnvData {
  version: 1
  files: Record<string, string>
  state: StateData
  cloud: Record<string, CloudResource>
  lock: LockInfo | null
  init: { done: boolean; modules: string[] }
  plans: Record<string, SavedPlan>
  clock: number
  activity: Activity[]
  takenNames: string[]
  policy: PolicyRule | null
  canned: Record<string, string>
  outputs: Record<string, Value>
  stateKey: string
  counter: number
}

export interface SeedResource {
  /** A short handle the checks use (e.g. 'sa'). */
  key: string
  type: string
  attrs: Attrs
  createdAt?: string
  createdBy?: string
  modifiedAt?: string
  modifiedBy?: string
}

export interface SeedState {
  addr: string
  key: string
  /** What the state file still believes, where Azure has drifted. */
  drift?: Attrs
}

export interface EnvSeed {
  files: Record<string, string>
  cloud: SeedResource[]
  state: SeedState[]
  lock?: Omit<LockInfo, 'path'>
  takenNames?: string[]
  policy?: PolicyRule
  /** Canned output for read-only commands, matched by prefix (e.g. `az pipelines runs list`). */
  canned?: Record<string, string>
  activity?: Activity[]
  /** Modules already installed by `terraform init` ("name=dir"). Default: every module call. */
  modules?: string[]
  stateKey?: string
}

/* ---------- addresses ---------- */

export interface ParsedAddress {
  module: string
  type: string
  name: string
  key: string | number | null
}

export function parseAddress(addr: string): ParsedAddress | null {
  const match =
    /^(?:module\.([A-Za-z0-9_-]+)\.)?([a-z0-9_]+)\.([A-Za-z0-9_-]+)(?:\[(?:(\d+)|"([^"]*)")\])?$/.exec(
      addr.trim(),
    )
  if (!match) return null
  return {
    module: match[1] ?? '',
    type: match[2],
    name: match[3],
    key: match[4] !== undefined ? Number(match[4]) : match[5] !== undefined ? match[5] : null,
  }
}

export const keySuffix = (key: string | number | null) =>
  key === null ? '' : typeof key === 'number' ? `[${key}]` : `["${key}"]`

/** `azurerm_subnet.app["web"]` → `azurerm_subnet.app`. */
export const resourceOf = (addr: string) => addr.replace(/\[[^\]]*\]$/, '')

/** Normalises user input like `azurerm_subnet.app[web]` or single quotes. */
export function normaliseAddress(input: string): string {
  return input
    .trim()
    .replace(/^'(.*)'$/, '$1')
    .replace(/\[\s*'([^']*)'\s*\]$/, '["$1"]')
    .replace(/\[\s*([A-Za-z_][\w-]*)\s*\]$/, '["$1"]')
}

/* ---------- environment ---------- */

/** JSON-safe deep copy (works the same in browsers, Node and jsdom). */
export const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value)) as T

const iso = (ms: number) => new Date(ms).toISOString().replace(/\.\d{3}Z$/, 'Z')

export function seedCloud(seed: EnvSeed): CloudResource[] {
  return seed.cloud.map((resource) => {
    const attrs = completeAttrs(resource.type, resource.attrs, SUBSCRIPTION_ID)
    return {
      id: String(attrs.id),
      type: resource.type,
      attrs,
      uid: fakeGuid(`seed:${resource.key}`),
      createdAt: resource.createdAt ?? '2025-03-14T10:22:41Z',
      createdBy: resource.createdBy ?? 'sp-terraform-prod',
      modifiedAt: resource.modifiedAt ?? resource.createdAt ?? '2026-09-02T14:05:12Z',
      modifiedBy: resource.modifiedBy ?? resource.createdBy ?? 'sp-terraform-prod',
    }
  })
}

export function createEnv(seed: EnvSeed): EnvData {
  const cloud: Record<string, CloudResource> = {}
  const byKey = new Map<string, CloudResource>()
  const resources = seedCloud(seed)
  seed.cloud.forEach((resource, index) => byKey.set(resource.key, resources[index]))
  for (const resource of resources) cloud[resource.id.toLowerCase()] = resource
  const state: StateInstance[] = seed.state.map((entry) => {
    const resource = byKey.get(entry.key)
    if (!resource)
      throw new Error(`Seed state ${entry.addr} points at unknown cloud key ${entry.key}`)
    return {
      addr: entry.addr,
      type: resource.type,
      attrs: { ...clone(resource.attrs), ...clone(entry.drift ?? {}) },
    }
  })
  let modules = seed.modules
  if (!modules) {
    const { config } = loadConfig(seed.files, null)
    modules = config ? config.children.map((child) => `${child.name}=${child.dir}`) : []
  }
  const stateKey = seed.stateKey ?? 'prod.terraform.tfstate'
  return {
    version: 1,
    files: { ...seed.files },
    state: { serial: 42, lineage: fakeGuid(`lineage:${stateKey}`), resources: state },
    cloud,
    lock: seed.lock ? { ...seed.lock, path: `tfstate/${stateKey}` } : null,
    init: { done: true, modules },
    plans: {},
    clock: START,
    activity: clone(seed.activity ?? []),
    takenNames: [...(seed.takenNames ?? [])],
    policy: seed.policy ? clone(seed.policy) : null,
    canned: { ...(seed.canned ?? {}) },
    outputs: {},
    stateKey,
    counter: 0,
  }
}

export const cloudList = (env: EnvData) => Object.values(env.cloud)
export const cloudGet = (env: EnvData, id: string) => env.cloud[id.toLowerCase()] ?? null

function tick(env: EnvData, seconds: number) {
  env.clock += seconds * 1000
}

function applyPolicy(env: EnvData, type: string, attrs: Attrs) {
  const policy = env.policy
  if (!policy || !policy.types.includes(type)) return attrs
  const tags = { ...((attrs.tags as Record<string, Value> | null) ?? {}) }
  for (const [key, value] of Object.entries(policy.tags)) if (!(key in tags)) tags[key] = value
  return { ...attrs, tags }
}

/* ---------- evaluation of the configuration ---------- */

export type Action = 'create' | 'update' | 'replace' | 'delete' | 'noop' | 'forget'

export interface Change {
  addr: string
  type: string
  action: Action
  before: Attrs | null
  after: Attrs | null
  forceNew: string[]
  /** Why an object is being destroyed, in Terraform's words. */
  reason?: string
  movedFrom?: string
  importId?: string
  createBeforeDestroy: boolean
  /** Resource addresses this one depends on (for apply ordering). */
  deps: string[]
}

export interface Drift {
  addr: string
  type: string
  before: Attrs
  after: Attrs | null
}

export interface PlanResult {
  ok: boolean
  diagnostics: Diagnostic[]
  refreshLines: string[]
  changes: Change[]
  drift: Drift[]
  refreshOnly: boolean
  /** State after refresh + moves + imports (what apply starts from). */
  prior: StateInstance[]
  /** State after refresh only (what a refresh-only apply saves). */
  refreshed: StateInstance[]
  targets: string[]
  serial: number
  lineage: string
  files: Record<string, string>
}

interface Instance {
  decl: ResourceDecl
  module: ModuleDecl
  addr: string
  key: string | number | null
  each: { key: Value; value: Value } | null
}

type Lookup = (instance: Instance) => Attrs

class Evaluator {
  private readonly config: Config
  private readonly env: EnvData
  lookup: Lookup = () => ({})
  private readonly vars = new Map<string, Value>()
  private readonly locals = new Map<string, Value>()
  private readonly outputs = new Map<string, Value>()
  private readonly expansions = new Map<string, Instance[]>()
  private readonly dataValues = new Map<string, Value>()
  private readonly busy = new Set<string>()
  readonly dataLines: string[] = []

  constructor(config: Config, env: EnvData) {
    this.config = config
    this.env = env
  }

  modules(): ModuleDecl[] {
    return [this.config.root, ...this.config.children]
  }

  private guard<T>(key: string, file: string, line: number, run: () => T): T {
    if (this.busy.has(key))
      throw new HclError({
        severity: 'error',
        summary: 'Cycle',
        detail: `Cycle: ${[...this.busy, key].join(', ')}`,
        file,
        line,
      })
    this.busy.add(key)
    try {
      return run()
    } finally {
      this.busy.delete(key)
    }
  }

  ctx(module: ModuleDecl, file: string, instance: Instance | null): EvalContext {
    return {
      file,
      resolve: (root, steps, line) => this.resolve(module, instance, root, steps, line, file),
    }
  }

  private fail(file: string, line: number, summary: string, detail: string): never {
    throw new HclError({ severity: 'error', summary, detail, file, line })
  }

  private attrStep(steps: Step[], index: number): string | null {
    const step = steps[index]
    return step && 'attr' in step ? step.attr : null
  }

  private resolve(
    module: ModuleDecl,
    instance: Instance | null,
    root: string,
    steps: Step[],
    line: number,
    file: string,
  ): { value: Value; used: number } {
    const first = this.attrStep(steps, 0)
    switch (root) {
      case 'var':
        if (!first)
          this.fail(
            file,
            line,
            'Invalid reference',
            'The "var" object must be followed by an attribute name.',
          )
        return { value: this.variable(module, first as string), used: 1 }
      case 'local':
        if (!first)
          this.fail(
            file,
            line,
            'Invalid reference',
            'The "local" object must be followed by an attribute name.',
          )
        return { value: this.local(module, first as string), used: 1 }
      case 'each':
        if (!instance?.each)
          this.fail(
            file,
            line,
            'Reference to "each" in context without for_each',
            'The "each" object can be used only in "module" or "resource" blocks, and only when the "for_each" argument is set.',
          )
        return { value: { key: instance.each.key, value: instance.each.value }, used: 0 }
      case 'count':
        if (typeof instance?.key !== 'number')
          this.fail(
            file,
            line,
            'Reference to "count" in non-counted context',
            'The "count" object can only be used when the "count" argument is set.',
          )
        return { value: { index: instance.key as number }, used: 0 }
      case 'path':
        return { value: { module: module.dir || '.', root: '.', cwd: '.' }, used: 0 }
      case 'terraform':
        return { value: { workspace: 'default' }, used: 0 }
      case 'module': {
        const child = this.config.children.find((entry) => entry.name === first)
        if (!child)
          this.fail(
            file,
            line,
            'Reference to undeclared module',
            `No module call named "${first}" is declared.`,
          )
        const output = this.attrStep(steps, 1)
        if (output) return { value: this.output(child as ModuleDecl, output), used: 2 }
        const all: Record<string, Value> = {}
        for (const name of (child as ModuleDecl).outputs.keys())
          all[name] = this.output(child as ModuleDecl, name)
        return { value: all, used: 1 }
      }
      case 'data': {
        const name = this.attrStep(steps, 1)
        const decl = module.data.find((entry) => entry.type === first && entry.name === name)
        if (!decl)
          this.fail(
            file,
            line,
            'Reference to undeclared resource',
            `A data resource "${first}" "${name}" has not been declared.`,
          )
        return { value: this.data(decl as ResourceDecl), used: 2 }
      }
      default: {
        const decl = module.resources.find((entry) => entry.type === root && entry.name === first)
        if (!decl)
          this.fail(
            file,
            line,
            'Reference to undeclared resource',
            `A managed resource "${root}" "${first}" has not been declared in ${module.name ? `module.${module.name}` : 'the root module'}.`,
          )
        return { value: this.resourceValue(decl as ResourceDecl), used: 1 }
      }
    }
  }

  variable(module: ModuleDecl, name: string): Value {
    const key = `${module.name}:${name}`
    if (this.vars.has(key)) return this.vars.get(key) as Value
    const decl = module.variables.get(name)
    if (!decl)
      this.fail(
        module.dir || 'main.tf',
        0,
        'Reference to undeclared input variable',
        `An input variable with the name "${name}" has not been declared.`,
      )
    const variable = decl as NonNullable<typeof decl>
    let value: Value | undefined
    if (module.call) {
      const input = module.call.body.attrs.find((attr) => attr.name === name)
      if (input) value = evaluate(input.expr, this.ctx(this.config.root, module.call.file, null))
    } else if (name in this.config.tfvars) value = this.config.tfvars[name]
    if (value === undefined && variable.default)
      value = evaluate(variable.default, this.ctx(module, variable.file, null))
    if (value === undefined)
      this.fail(
        variable.file,
        variable.line,
        'No value for required variable',
        `The root module input variable "${name}" is not set, and has no default value. Use a -var or -var-file command line argument, or a terraform.tfvars file, to provide a value for this variable.`,
      )
    const type = variable.type
    if (type && type.k === 'call' && type.name === 'set' && Array.isArray(value))
      value = asSet(value)
    this.vars.set(key, value as Value)
    return value as Value
  }

  private local(module: ModuleDecl, name: string): Value {
    const key = `${module.name}:local.${name}`
    if (this.locals.has(key)) return this.locals.get(key) as Value
    const decl = module.locals.get(name)
    if (!decl)
      this.fail(
        module.dir || 'main.tf',
        0,
        'Reference to undeclared local value',
        `A local value with the name "${name}" has not been declared.`,
      )
    const local = decl as NonNullable<typeof decl>
    const value = this.guard(key, local.file, local.line, () =>
      evaluate(local.expr, this.ctx(module, local.file, null)),
    )
    this.locals.set(key, value)
    return value
  }

  output(module: ModuleDecl, name: string): Value {
    const key = `${module.name}:output.${name}`
    if (this.outputs.has(key)) return this.outputs.get(key) as Value
    const decl = module.outputs.get(name)
    if (!decl)
      return this.fail(
        'main.tf',
        0,
        'Unsupported attribute',
        `The module has no output named "${name}".`,
      )
    const value = this.guard(key, decl.file, decl.line, () =>
      evaluate(decl.expr, this.ctx(module, decl.file, null)),
    )
    this.outputs.set(key, value)
    return value
  }

  data(decl: ResourceDecl): Value {
    const key = resourceAddr(decl)
    if (this.dataValues.has(key)) return this.dataValues.get(key) as Value
    const ctx = this.ctx(this.moduleOf(decl), decl.file, null)
    const arg = (name: string) => {
      const attr = decl.body.attrs.find((entry) => entry.name === name)
      return attr ? evaluate(attr.expr, ctx) : null
    }
    let value: Value
    if (decl.type === 'azurerm_client_config') {
      value = {
        id: `Y2xpZW50Q29uZmlncy9jbGllbnRJZD0`,
        tenant_id: TENANT_ID,
        subscription_id: SUBSCRIPTION_ID,
        client_id: '6c1e2f3a-4b5c-4d6e-8f70-81a2b3c4d5e6',
        object_id: '0d9e8f7a-6b5c-4d3e-9f21-a0b1c2d3e4f5',
      }
    } else if (decl.type === 'azurerm_subscription') {
      value = {
        id: `/subscriptions/${SUBSCRIPTION_ID}`,
        subscription_id: SUBSCRIPTION_ID,
        tenant_id: TENANT_ID,
        display_name: 'Contoso Production',
      }
    } else {
      const name = arg('name')
      if (isUnknown(name)) value = UNKNOWN
      else {
        const found = Object.values(this.env.cloud).find(
          (resource) =>
            resource.type === 'azurerm_resource_group' &&
            String(resource.attrs.name).toLowerCase() === String(name).toLowerCase(),
        )
        if (!found)
          this.fail(
            decl.file,
            decl.line,
            `Resource Group "${String(name)}" was not found`,
            `data.azurerm_resource_group.${decl.name}: the resource group does not exist in subscription ${SUBSCRIPTION_ID}.`,
          )
        value = { ...(found as CloudResource).attrs }
      }
    }
    this.dataLines.push(
      `${key}: Reading...`,
      `${key}: Read complete after 0s [id=${String((value as Attrs).id ?? '')}]`,
    )
    this.dataValues.set(key, value)
    return value
  }

  moduleOf(decl: ResourceDecl): ModuleDecl {
    return this.modules().find((module) => module.name === decl.module) as ModuleDecl
  }

  expand(decl: ResourceDecl): Instance[] {
    const base = resourceAddr(decl)
    const cached = this.expansions.get(base)
    if (cached) return cached
    const module = this.moduleOf(decl)
    const ctx = this.ctx(module, decl.file, null)
    let instances: Instance[] = []
    if (decl.count) {
      const count = this.guard(`${base}.count`, decl.file, decl.count.line, () =>
        evaluate(decl.count as Expr, ctx),
      )
      if (isUnknown(count))
        this.fail(
          decl.file,
          decl.count.line,
          'Invalid count argument',
          'The "count" value depends on resource attributes that cannot be determined until apply, so Terraform cannot predict how many instances will be created. To work around this, use the -target argument to first apply only the resources that the count depends on.',
        )
      if (typeof count !== 'number' || count < 0 || !Number.isInteger(count))
        this.fail(
          decl.file,
          decl.count.line,
          'Invalid count argument',
          `The given "count" argument value is unsuitable: must be a whole number, but have ${typeName(count)}.`,
        )
      instances = Array.from({ length: count as number }, (_, index) => ({
        decl,
        module,
        addr: `${base}[${index}]`,
        key: index,
        each: null,
      }))
    } else if (decl.forEach) {
      const each = this.guard(`${base}.for_each`, decl.file, decl.forEach.line, () =>
        evaluate(decl.forEach as Expr, ctx),
      )
      if (containsUnknown(each))
        this.fail(
          decl.file,
          decl.forEach.line,
          'Invalid for_each argument',
          'The "for_each" map includes keys or set values derived from resource attributes that cannot be determined until apply, and so Terraform cannot determine the full set of keys that will identify the instances of this resource.',
        )
      if (Array.isArray(each)) {
        if (!isSet(each) || each.some((item) => typeof item !== 'string'))
          this.fail(
            decl.file,
            decl.forEach.line,
            'Invalid for_each argument',
            `The given "for_each" argument value is unsuitable: the "for_each" argument must be a map, or set of strings, and you have provided a value of type ${isSet(each) ? 'set of non-strings' : 'tuple'}. Wrap a list in toset() to use it here.`,
          )
        instances = (each as string[]).map((item) => ({
          decl,
          module,
          addr: `${base}["${item}"]`,
          key: item,
          each: { key: item, value: item },
        }))
      } else if (isObject(each)) {
        instances = Object.keys(each)
          .sort()
          .map((item) => ({
            decl,
            module,
            addr: `${base}["${item}"]`,
            key: item,
            each: { key: item, value: each[item] },
          }))
      } else {
        this.fail(
          decl.file,
          decl.forEach.line,
          'Invalid for_each argument',
          `The given "for_each" argument value is unsuitable: the "for_each" argument must be a map, or set of strings, and you have provided a value of type ${typeName(each as Value)}.`,
        )
      }
    } else {
      instances = [{ decl, module, addr: base, key: null, each: null }]
    }
    this.expansions.set(base, instances)
    return instances
  }

  resourceValue(decl: ResourceDecl): Value {
    const instances = this.expand(decl)
    const objects = instances.map((instance) => this.lookup(instance))
    if (decl.count) return objects
    if (decl.forEach)
      return Object.fromEntries(
        instances.map((instance, index) => [String(instance.key), objects[index]]),
      )
    return objects[0] ?? null
  }

  /** The configured arguments of one instance (blocks as lists of objects). */
  configured(instance: Instance, diags: Diagnostic[]): Attrs {
    const ctx = this.ctx(instance.module, instance.decl.file, instance)
    const schema = schemas[instance.decl.type]
    const out: Attrs = {}
    const check = (
      name: string,
      value: Value,
      validate: ((value: Value) => string | null) | undefined,
      line: number,
    ) => {
      if (!validate || containsUnknown(value)) return
      const problem = validate(value)
      if (problem)
        diags.push({
          severity: 'error',
          summary: problem,
          detail: `with ${instance.addr}, the value of "${name}" is not valid.`,
          file: instance.decl.file,
          line,
          context: `resource "${instance.decl.type}" "${instance.decl.name}"`,
        })
    }
    for (const attr of instance.decl.body.attrs) {
      if (['count', 'for_each', 'depends_on', 'provider'].includes(attr.name)) continue
      const value = evaluate(attr.expr, ctx)
      out[attr.name] = value
      check(attr.name, value, schema.attrs[attr.name]?.validate, attr.line)
    }
    for (const block of instance.decl.body.blocks) {
      if (block.type === 'lifecycle') continue
      if (block.type === 'dynamic')
        this.fail(
          instance.decl.file,
          block.line,
          'Dynamic blocks are not simulated',
          'Write the nested blocks out in full in this lab.',
        )
      const item: Attrs = {}
      for (const attr of block.body.attrs) {
        item[attr.name] = evaluate(attr.expr, ctx)
        check(
          attr.name,
          item[attr.name],
          schema.blocks[block.type]?.attrs[attr.name]?.validate,
          attr.line,
        )
      }
      out[block.type] = [...((out[block.type] as Value[] | undefined) ?? []), item]
    }
    return out
  }

  /** Resource addresses an instance's configuration refers to. */
  dependencies(decl: ResourceDecl): string[] {
    const module = this.moduleOf(decl)
    const out = new Set<string>(
      decl.dependsOn.map((addr) => (module.name ? `module.${module.name}.${addr}` : addr)),
    )
    const exprs: (Expr | null)[] = [decl.count, decl.forEach]
    const walkBody = (body: Body) => {
      for (const attr of body.attrs) exprs.push(attr.expr)
      for (const block of body.blocks) if (block.type !== 'lifecycle') walkBody(block.body)
    }
    walkBody(decl.body)
    const visitedLocals = new Set<string>()
    const collect = (expr: Expr | null, scope: ModuleDecl) => {
      for (const [root, first] of references(expr)) {
        if (!first) continue
        if (root === 'local') {
          const local = scope.locals.get(first)
          if (local && !visitedLocals.has(first)) {
            visitedLocals.add(first)
            collect(local.expr, scope)
          }
        } else if (root === 'var' && scope.call) {
          const input = scope.call.body.attrs.find((attr) => attr.name === first)
          if (input) collect(input.expr, this.config.root)
        } else if (root === 'module') {
          out.add(`module.${first}.`)
        } else if (!['var', 'each', 'count', 'path', 'terraform', 'data', 'self'].includes(root)) {
          out.add(`${scope.name ? `module.${scope.name}.` : ''}${root}.${first}`)
        }
      }
    }
    for (const expr of exprs) collect(expr, module)
    return [...out]
  }
}

/* ---------- normalisation and diffs ---------- */

function normalise(type: string, configured: Attrs, prior: Attrs | null): Attrs {
  const schema = schemas[type]
  const out: Attrs = {}
  for (const [name, spec] of Object.entries(schema.attrs)) {
    const value = configured[name]
    if (spec.computed) out[name] = prior?.[name] ?? UNKNOWN
    else if (value !== undefined && value !== null)
      out[name] = spec.kind === 'list' && Array.isArray(value) ? [...value] : value
    else if (spec.default !== undefined) out[name] = spec.default
    else if (spec.optionalComputed) out[name] = prior && name in prior ? prior[name] : UNKNOWN
    else out[name] = null
  }
  for (const [name, block] of Object.entries(schema.blocks)) {
    const items = (configured[name] as Attrs[] | undefined) ?? []
    const priorItems = (prior?.[name] as Attrs[] | undefined) ?? []
    out[name] = items.map((item, index) => {
      const full: Attrs = {}
      for (const [inner, spec] of Object.entries(block.attrs)) {
        const value = item[inner]
        if (value !== undefined && value !== null) full[inner] = value
        else if (spec.default !== undefined) full[inner] = spec.default
        else if (spec.optionalComputed)
          full[inner] =
            priorItems[index] && inner in priorItems[index] ? priorItems[index][inner] : UNKNOWN
        else full[inner] = null
      }
      return full
    })
  }
  return out
}

const attrNames = (type: string) => [
  ...Object.keys(schemas[type].attrs),
  ...Object.keys(schemas[type].blocks),
]

/** Non-computed arguments whose value differs. */
function changedAttrs(type: string, before: Attrs, after: Attrs): string[] {
  const schema = schemas[type]
  return attrNames(type).filter((name) => {
    if (schema.attrs[name]?.computed) return false
    const a = before[name] ?? null
    const b = after[name] ?? null
    if (containsUnknown(b)) return true
    if (
      (a === null && isObject(b) && !Object.keys(b).length) ||
      (b === null && isObject(a) && !Object.keys(a).length)
    )
      return false
    return !deepEqual(a, b)
  })
}

function applyIgnore(paths: string[] | 'all', type: string, before: Attrs, after: Attrs): Attrs {
  const out = { ...after }
  if (paths === 'all') {
    for (const name of attrNames(type))
      if (!schemas[type].attrs[name]?.computed) out[name] = before[name] ?? null
    return out
  }
  for (const path of paths) {
    const keyed = /^([a-z0-9_]+)\["([^"]+)"\]$/.exec(path)
    if (keyed) {
      const [, attr, key] = keyed
      const map = { ...((out[attr] as Record<string, Value> | null) ?? {}) }
      const old = (before[attr] as Record<string, Value> | null)?.[key]
      if (old === undefined) delete map[key]
      else map[key] = old
      out[attr] = map
    } else {
      const attr = path.replace(/\[.*$/, '')
      if (attr in before || attr in out) out[attr] = before[attr] ?? null
    }
  }
  return out
}

function deleteReason(addr: string, config: Config | null): string {
  const parsed = parseAddress(addr)
  if (!parsed || !config) return `because ${addr} is not in configuration`
  if (parsed.module && !config.children.some((child) => child.name === parsed.module))
    return `because module.${parsed.module} is not in configuration`
  const decl = allResources(config).find((entry) => resourceAddr(entry) === resourceOf(addr))
  if (!decl) return `because ${resourceOf(addr)} is not in configuration`
  if (decl.count) {
    if (typeof parsed.key === 'number')
      return `because index [${parsed.key}] is out of range for count`
    return parsed.key === null
      ? 'because resource uses count or for_each'
      : 'because resource does not use for_each'
  }
  if (decl.forEach) {
    if (typeof parsed.key === 'string')
      return `because key ["${parsed.key}"] is not in for_each map`
    return parsed.key === null
      ? 'because resource uses count or for_each'
      : 'because resource does not use count'
  }
  return typeof parsed.key === 'number'
    ? 'because resource does not use count'
    : 'because resource does not use for_each'
}

/* ---------- plan ---------- */

export interface PlanOptions {
  refreshOnly?: boolean
  refresh?: boolean
  targets?: string[]
}

function lockError(lock: LockInfo): Diagnostic {
  return {
    severity: 'error',
    summary: 'Error acquiring the state lock',
    detail: [
      'Error message: state blob is already locked',
      'Lock Info:',
      `  ID:        ${lock.id}`,
      `  Path:      ${lock.path}`,
      `  Operation: ${lock.operation}`,
      `  Who:       ${lock.who}`,
      `  Version:   ${lock.version}`,
      `  Created:   ${lock.created}`,
      `  Info:      ${lock.info}`,
      '',
      '',
      'Terraform acquires a state lock to protect the state from being written',
      'by multiple users at the same time. Please resolve the issue above and try',
      'again. For most commands, you can disable locking with the "-lock=false"',
      'flag, but this is not recommended.',
    ].join('\n'),
  }
}

export function checkLock(env: EnvData, useLock: boolean): Diagnostic | null {
  return useLock && env.lock ? lockError(env.lock) : null
}

const emptyPlan = (env: EnvData, diagnostics: Diagnostic[], refreshOnly = false): PlanResult => ({
  ok: false,
  diagnostics,
  refreshLines: [],
  changes: [],
  drift: [],
  refreshOnly,
  prior: [],
  refreshed: [],
  targets: [],
  serial: env.state.serial,
  lineage: env.state.lineage,
  files: { ...env.files },
})

function initDiagnostic(env: EnvData): Diagnostic | null {
  if (env.init.done) return null
  return {
    severity: 'error',
    summary: 'Backend initialization required, please run "terraform init"',
    detail:
      'Reason: Initial configuration of the requested backend "azurerm"\n\nThe "backend" is the interface that Terraform uses to store state,\nperform operations, etc. If this message is showing up, it means that the\nTerraform configuration you\'re using is using a custom configuration for\nthe Terraform backend.',
  }
}

/** Refresh: read every object in state back from "Azure". */
function refresh(env: EnvData, plan: PlanResult) {
  const refreshed: StateInstance[] = []
  for (const instance of env.state.resources) {
    const id = String(instance.attrs.id)
    plan.refreshLines.push(`${instance.addr}: Refreshing state... [id=${id}]`)
    const live = cloudGet(env, id)
    if (!live) {
      plan.drift.push({
        addr: instance.addr,
        type: instance.type,
        before: instance.attrs,
        after: null,
      })
      continue
    }
    const attrs = clone(live.attrs)
    if (!deepEqual(attrs, instance.attrs))
      plan.drift.push({
        addr: instance.addr,
        type: instance.type,
        before: instance.attrs,
        after: attrs,
      })
    refreshed.push({ addr: instance.addr, type: instance.type, attrs })
  }
  return refreshed
}

export function plan(env: EnvData, options: PlanOptions = {}): PlanResult {
  const files = { ...env.files }
  const { config, diagnostics } = loadConfig(files, env.init.modules)
  const init = initDiagnostic(env)
  if (init) return emptyPlan(env, [init])
  if (!config) return emptyPlan(env, diagnostics)
  const result = emptyPlan(
    env,
    diagnostics.filter((diag) => diag.severity === 'warning'),
    Boolean(options.refreshOnly),
  )
  result.targets = (options.targets ?? []).map(normaliseAddress)
  const diags = result.diagnostics

  const refreshed = options.refresh === false ? clone(env.state.resources) : refresh(env, result)
  result.refreshed = clone(refreshed)

  const evaluator = new Evaluator(config, env)

  if (options.refreshOnly) {
    // Data sources are still read in refresh-only mode.
    try {
      for (const module of evaluator.modules()) for (const decl of module.data) evaluator.data(decl)
    } catch {
      // ignored in refresh-only mode
    }
    result.prior = clone(refreshed)
    result.ok = true
    return result
  }

  // moved blocks
  const prior = new Map(refreshed.map((instance) => [instance.addr, instance]))
  const movedFrom = new Map<string, string>()
  for (const move of config.moved) {
    const matches = [...prior.keys()].filter(
      (addr) =>
        addr === move.from || addr.startsWith(`${move.from}[`) || addr.startsWith(`${move.from}.`),
    )
    for (const addr of matches) {
      const target = move.to + addr.slice(move.from.length)
      if (prior.has(target)) {
        diags.push({
          severity: 'warning',
          summary: 'Moved object still exists',
          detail: `This statement declares a move from ${addr}, but that object is still declared in configuration or already tracked at ${target}.\n\nChange your configuration so that this object will be declared as ${target} instead.`,
          file: move.file,
          line: move.line,
        })
        continue
      }
      const instance = prior.get(addr) as StateInstance
      prior.delete(addr)
      prior.set(target, { ...instance, addr: target })
      movedFrom.set(target, movedFrom.get(addr) ?? addr)
      movedFrom.delete(addr)
    }
  }

  // import blocks
  const imported = new Map<string, string>()
  for (const block of config.imports) {
    let id: Value
    try {
      id = evaluate(block.id, evaluator.ctx(config.root, block.file, null))
    } catch (error) {
      if (error instanceof HclError) {
        diags.push(error.diagnostic)
        continue
      }
      throw error
    }
    if (typeof id !== 'string') {
      diags.push({
        severity: 'error',
        summary: 'Invalid import id argument',
        detail: 'The import ID must be a known string (the Azure resource ID).',
        file: block.file,
        line: block.line,
      })
      continue
    }
    if (prior.has(block.to)) continue
    const target = parseAddress(block.to)
    const decl =
      target && allResources(config).find((entry) => resourceAddr(entry) === resourceOf(block.to))
    if (!target || !decl) {
      diags.push({
        severity: 'error',
        summary: 'Configuration for import target does not exist',
        detail: `The configuration for the given import target ${block.to} does not exist. All target instances must have an associated configuration to be imported.`,
        file: block.file,
        line: block.line,
      })
      continue
    }
    const schema = schemas[target.type]
    if (!schema.idPattern.test(id)) {
      diags.push({
        severity: 'error',
        summary: `parsing ${JSON.stringify(id)}`,
        detail: `The ID is not a valid ${target.type} ID. Expected the format ${schema.id({ name: '{name}', resource_group_name: '{resourceGroupName}', virtual_network_name: '{virtualNetworkName}' }, '{subscriptionId}')}`,
        file: block.file,
        line: block.line,
      })
      continue
    }
    const live = cloudGet(env, id)
    if (!live) {
      diags.push({
        severity: 'error',
        summary: 'Cannot import non-existent remote object',
        detail: `While attempting to import an existing object to "${block.to}", the provider detected that no object exists with the given id. Only pre-existing objects can be imported; check that the id is correct and that it is associated with the provider's configured region or endpoint, or use "terraform apply" to create a new remote object for this resource.`,
        file: block.file,
        line: block.line,
      })
      continue
    }
    const already = [...prior.values()].find(
      (instance) => String(instance.attrs.id).toLowerCase() === id.toLowerCase(),
    )
    if (already) {
      diags.push({
        severity: 'error',
        summary: 'Resource already managed by Terraform',
        detail: `Terraform is already managing a remote object for ${id} at ${already.addr}. To import to this address you must first remove the existing object from the state.`,
        file: block.file,
        line: block.line,
      })
      continue
    }
    result.refreshLines.push(
      `${block.to}: Preparing import... [id=${id}]`,
      `${block.to}: Refreshing state... [id=${id}]`,
    )
    prior.set(block.to, { addr: block.to, type: target.type, attrs: clone(live.attrs) })
    imported.set(block.to, live.id)
  }

  result.prior = [...prior.values()]

  // evaluate configuration
  const changes = new Map<string, Change>()
  const computing = new Set<string>()
  const changeFor = (instance: Instance): Change => {
    const done = changes.get(instance.addr)
    if (done) return done
    if (computing.has(instance.addr))
      throw new HclError({
        severity: 'error',
        summary: 'Cycle',
        detail: `Cycle: ${[...computing, instance.addr].join(', ')}`,
        file: instance.decl.file,
        line: instance.decl.line,
      })
    computing.add(instance.addr)
    try {
      const type = instance.decl.type
      const before = prior.get(instance.addr)?.attrs ?? null
      const configured = evaluator.configured(instance, diags)
      let after = normalise(type, configured, before)
      let action: Action = 'create'
      let forceNew: string[] = []
      if (before) {
        after = applyIgnore(instance.decl.lifecycle.ignoreChanges, type, before, after)
        const changed = changedAttrs(type, before, after)
        forceNew = forcesNew(type, before, after, changed)
        action = forceNew.length ? 'replace' : changed.length ? 'update' : 'noop'
      }
      if (action === 'create' || action === 'replace') {
        const schema = schemas[type]
        for (const [name, spec] of Object.entries(schema.attrs))
          if (
            spec.computed ||
            (spec.optionalComputed && (configured[name] === undefined || configured[name] === null))
          )
            after[name] = UNKNOWN
      }
      const change: Change = {
        addr: instance.addr,
        type,
        action,
        before,
        after,
        forceNew,
        createBeforeDestroy: instance.decl.lifecycle.createBeforeDestroy,
        deps: evaluator.dependencies(instance.decl),
      }
      const moved = movedFrom.get(instance.addr)
      if (moved) change.movedFrom = moved
      const importId = imported.get(instance.addr)
      if (importId) change.importId = importId
      changes.set(instance.addr, change)
      return change
    } finally {
      computing.delete(instance.addr)
    }
  }
  evaluator.lookup = (instance) => changeFor(instance).after ?? {}

  const desired = new Set<string>()
  try {
    for (const module of evaluator.modules()) for (const decl of module.data) evaluator.data(decl)
    for (const decl of allResources(config)) {
      for (const instance of evaluator.expand(decl)) {
        desired.add(instance.addr)
        changeFor(instance)
      }
    }
    for (const [name] of config.root.outputs) evaluator.output(config.root, name)
  } catch (error) {
    if (error instanceof HclError) diags.push(error.diagnostic)
    else throw error
  }
  result.refreshLines.unshift(...evaluator.dataLines)

  for (const block of config.imports)
    if (imported.has(block.to) && !desired.has(block.to))
      diags.push({
        severity: 'error',
        summary: 'Configuration for import target does not exist',
        detail: `The configuration for the given import target ${block.to} does not exist. All target instances must have an associated configuration to be imported.`,
        file: block.file,
        line: block.line,
      })

  // objects in state that the configuration no longer has
  for (const instance of prior.values()) {
    if (desired.has(instance.addr)) continue
    const removed = config.removed.find(
      (entry) =>
        resourceOf(instance.addr) === entry.from || instance.addr.startsWith(`${entry.from}.`),
    )
    const change: Change = {
      addr: instance.addr,
      type: instance.type,
      action: removed && !removed.destroy ? 'forget' : 'delete',
      before: instance.attrs,
      after: null,
      forceNew: [],
      reason: deleteReason(instance.addr, config),
      createBeforeDestroy: false,
      deps: [],
    }
    const moved = movedFrom.get(instance.addr)
    if (moved) change.movedFrom = moved
    changes.set(instance.addr, change)
  }

  // prevent_destroy
  for (const change of changes.values()) {
    if (change.action !== 'delete' && change.action !== 'replace') continue
    const decl = allResources(config).find(
      (entry) => resourceAddr(entry) === resourceOf(change.addr),
    )
    if (decl?.lifecycle.preventDestroy)
      diags.push({
        severity: 'error',
        summary: 'Instance cannot be destroyed',
        detail: `Resource ${change.addr} has lifecycle.prevent_destroy set, but the plan calls for this resource to be destroyed. To avoid this error and continue with the plan, either disable lifecycle.prevent_destroy or reduce the scope of the plan using the -target option.`,
        file: decl.file,
        line: decl.line,
        context: `resource "${decl.type}" "${decl.name}"`,
      })
  }

  let list = [...changes.values()]
  if (result.targets.length) {
    const hit = (addr: string) =>
      result.targets.some(
        (target) =>
          addr === target || addr.startsWith(`${target}[`) || addr.startsWith(`${target}.`),
      )
    list = list.filter((change) => hit(change.addr))
    diags.push({
      severity: 'warning',
      summary: 'Resource targeting is in effect',
      detail:
        'You are creating a plan with the -target option, which means that the result of this plan may not represent all of the changes requested by the current configuration.\n\nThe -target option is not for routine use, and is provided only for exceptional situations such as recovering from errors or mistakes, or when Terraform specifically suggests to use it as part of an error message.',
    })
  }
  result.changes = list.sort((a, b) => a.addr.localeCompare(b.addr))

  // only drift that matters to this plan is reported (as Terraform does)
  const acting = new Set(
    result.changes.filter((change) => change.action !== 'noop').map((change) => change.addr),
  )
  result.drift = result.drift.filter(
    (drift) =>
      drift.after === null ||
      acting.has(drift.addr) ||
      acting.has(changeTarget(drift.addr, movedFrom)),
  )
  result.ok = !diags.some((diag) => diag.severity === 'error')
  return result
}

const changeTarget = (addr: string, movedFrom: Map<string, string>) =>
  [...movedFrom.entries()].find(([, from]) => from === addr)?.[0] ?? addr

export const hasChanges = (result: PlanResult) =>
  result.changes.some(
    (change) =>
      change.action !== 'noop' || change.movedFrom !== undefined || change.importId !== undefined,
  )

export function planCounts(result: PlanResult) {
  const count = (...actions: Action[]) =>
    result.changes.filter((change) => actions.includes(change.action)).length
  return {
    import: result.changes.filter((change) => change.importId).length,
    add: count('create', 'replace'),
    change: count('update'),
    destroy: count('delete', 'replace'),
    forget: count('forget'),
  }
}

/* ---------- rendering ---------- */

const pad = (count: number) => ' '.repeat(count)

export function formatValue(value: Value | undefined): string {
  if (value === undefined) return 'null'
  if (isUnknown(value)) return '(known after apply)'
  if (typeof value === 'string') return JSON.stringify(value)
  if (value === null || typeof value !== 'object') return String(value)
  return JSON.stringify(value)
}

type Mode = 'create' | 'delete' | 'update' | 'show'

const isEmpty = (value: Value | undefined) =>
  value === undefined ||
  value === null ||
  (Array.isArray(value) && value.length === 0) ||
  (isObject(value as Value) && Object.keys(value as object).length === 0)

/** Renders a resource body like `terraform plan` / `terraform show`. */
function renderBody(
  type: string,
  before: Attrs | null,
  after: Attrs | null,
  mode: Mode,
  col: number,
  forceNew: string[] = [],
  identifyingOnly = false,
): string[] {
  const schema = schemas[type]
  const lines: string[] = []
  const names = Object.keys(schema.attrs).sort()
  const blocks = Object.keys(schema.blocks).sort()
  let hiddenAttrs = 0
  let hiddenBlocks = 0
  const sym = (s: string) => (mode === 'show' ? '' : `${s} `)
  const blank = mode === 'show' ? '' : '  '
  type Row = { name: string; s: string; render: (width: number) => string[] }
  const rows: Row[] = []
  for (const name of names) {
    const a = before?.[name] ?? null
    const b = after?.[name] ?? null
    if (mode === 'create') {
      if (isEmpty(b) && !isUnknown(b)) continue
      rows.push({
        name,
        s: '+',
        render: (w) => valueLines(name, w, null, b, '+', col, mode, false),
      })
    } else if (mode === 'delete') {
      if (isEmpty(a)) continue
      rows.push({
        name,
        s: '-',
        render: (w) => valueLines(name, w, a, null, '-', col, mode, false),
      })
    } else if (mode === 'show') {
      if (isEmpty(a)) continue
      if (identifyingOnly && !['id', 'name', 'tags', 'location'].includes(name)) {
        hiddenAttrs++
        continue
      }
      rows.push({ name, s: ' ', render: (w) => valueLines(name, w, a, a, ' ', col, mode, false) })
    } else {
      const same = deepEqual(a, b) && !isUnknown(b)
      if (same) {
        if (['id', 'name', 'tags'].includes(name) && !isEmpty(a))
          rows.push({
            name,
            s: ' ',
            render: (w) => valueLines(name, w, a, a, ' ', col, mode, false),
          })
        else if (!isEmpty(a)) hiddenAttrs++
        continue
      }
      if ((a === null && isEmpty(b) && !isUnknown(b)) || (b === null && isEmpty(a))) continue
      const s = a === null ? '+' : b === null ? '-' : '~'
      rows.push({
        name,
        s,
        render: (w) => valueLines(name, w, a, b, s, col, mode, forceNew.includes(name)),
      })
    }
  }
  const width = Math.max(0, ...rows.map((row) => row.name.length))
  for (const row of rows) lines.push(...row.render(width))
  for (const name of blocks) {
    const a = ((before?.[name] as Attrs[] | null) ?? []) as Attrs[]
    const b = ((after?.[name] as Attrs[] | null) ?? []) as Attrs[]
    const count = Math.max(
      mode === 'delete' || mode === 'show' ? a.length : b.length,
      mode === 'update' ? a.length : 0,
    )
    for (let index = 0; index < count; index++) {
      const x = a[index] ?? null
      const y = b[index] ?? null
      const inner = (s: string, blockMode: Mode) => {
        const content = blockBody(schema.blocks[name].attrs, x, y, blockMode, col + 4)
        return [
          `${pad(col)}${s === ' ' ? blank : sym(s)}${name} {${forceNew.includes(name) && s === '~' ? ' # forces replacement' : ''}`,
          ...content,
          `${pad(mode === 'show' ? col : col + 2)}}`,
        ]
      }
      if (mode === 'create') lines.push(...inner('+', 'create'))
      else if (mode === 'delete') lines.push(...inner('-', 'delete'))
      else if (mode === 'show') {
        if (identifyingOnly) hiddenBlocks++
        else lines.push(...inner(' ', 'show'))
      } else if (x && !y) lines.push(...inner('-', 'delete'))
      else if (!x && y) lines.push(...inner('+', 'create'))
      else if (deepEqual(x, y)) hiddenBlocks++
      else lines.push(...inner('~', 'update'))
    }
  }
  const note = mode === 'show' ? col : col + 2
  if (hiddenAttrs)
    lines.push(
      `${pad(note)}# (${hiddenAttrs} unchanged attribute${hiddenAttrs === 1 ? '' : 's'} hidden)`,
    )
  if (hiddenBlocks)
    lines.push(
      `${pad(note)}# (${hiddenBlocks} unchanged block${hiddenBlocks === 1 ? '' : 's'} hidden)`,
    )
  return lines
}

function blockBody(
  attrs: Record<string, unknown>,
  before: Attrs | null,
  after: Attrs | null,
  mode: Mode,
  col: number,
): string[] {
  const names = Object.keys(attrs).sort()
  const rows: { name: string; render: (w: number) => string[] }[] = []
  let hidden = 0
  for (const name of names) {
    const a = before?.[name] ?? null
    const b = after?.[name] ?? null
    if (mode === 'create') {
      if (isEmpty(b) && !isUnknown(b)) continue
      rows.push({ name, render: (w) => valueLines(name, w, null, b, '+', col, mode, false) })
    } else if (mode === 'delete') {
      if (isEmpty(a)) continue
      rows.push({ name, render: (w) => valueLines(name, w, a, null, '-', col, mode, false) })
    } else if (mode === 'show') {
      if (isEmpty(a)) continue
      rows.push({ name, render: (w) => valueLines(name, w, a, a, ' ', col, mode, false) })
    } else if (deepEqual(a, b) && !isUnknown(b)) {
      if (!isEmpty(a)) hidden++
    } else {
      const s = a === null ? '+' : b === null ? '-' : '~'
      rows.push({ name, render: (w) => valueLines(name, w, a, b, s, col, mode, false) })
    }
  }
  const width = Math.max(0, ...rows.map((row) => row.name.length))
  const lines = rows.flatMap((row) => row.render(width))
  if (hidden)
    lines.push(`${pad(col + 2)}# (${hidden} unchanged attribute${hidden === 1 ? '' : 's'} hidden)`)
  return lines
}

/** One attribute line (or a multi-line map / list). */
function valueLines(
  name: string,
  width: number,
  before: Value,
  after: Value,
  s: string,
  col: number,
  mode: Mode,
  forces: boolean,
): string[] {
  const prefix = mode === 'show' ? pad(col) : s === ' ' ? pad(col + 2) : `${pad(col)}${s} `
  const label = `${prefix}${name.padEnd(width)} = `
  const suffix = forces ? ' # forces replacement' : ''
  const sample = after ?? before
  if (isObject(sample as Value) && !isUnknown(sample)) {
    const a = isObject(before) ? before : {}
    const b = isObject(after) ? after : {}
    const keys = [...new Set([...Object.keys(a), ...Object.keys(b)])].sort()
    if (!keys.length) return [`${label}{}${suffix}`]
    const entries: string[] = []
    let hidden = 0
    const keyWidth = Math.max(...keys.map((key) => JSON.stringify(key).length))
    const inner = mode === 'show' ? col + 4 : col + 4
    for (const key of keys) {
      const k = JSON.stringify(key).padEnd(keyWidth)
      const x = a[key]
      const y = b[key]
      if (mode === 'show') entries.push(`${pad(inner)}${k} = ${formatValue(x)}`)
      else if (mode === 'create') entries.push(`${pad(inner)}+ ${k} = ${formatValue(y)}`)
      else if (mode === 'delete') entries.push(`${pad(inner)}- ${k} = ${formatValue(x)} -> null`)
      else if (x === undefined) entries.push(`${pad(inner)}+ ${k} = ${formatValue(y)}`)
      else if (y === undefined) entries.push(`${pad(inner)}- ${k} = ${formatValue(x)} -> null`)
      else if (!deepEqual(x, y))
        entries.push(`${pad(inner)}~ ${k} = ${formatValue(x)} -> ${formatValue(y)}`)
      else if (s === ' ') entries.push(`${pad(inner + 2)}${k} = ${formatValue(x)}`)
      else hidden++
    }
    if (hidden)
      entries.push(
        `${pad(inner + 2)}# (${hidden} unchanged element${hidden === 1 ? '' : 's'} hidden)`,
      )
    return [
      `${label}{${suffix}`,
      ...entries,
      `${pad(mode === 'show' ? col : col + 2)}}${mode === 'delete' ? ' -> null' : ''}`,
    ]
  }
  if (Array.isArray(sample) && !isUnknown(sample)) {
    const a = Array.isArray(before) ? before : []
    const b = Array.isArray(after) ? after : []
    const inner = col + 4
    const entries: string[] = []
    if (mode === 'show') for (const item of a) entries.push(`${pad(inner)}${formatValue(item)},`)
    else if (mode === 'create')
      for (const item of b) entries.push(`${pad(inner)}+ ${formatValue(item)},`)
    else if (mode === 'delete')
      for (const item of a) entries.push(`${pad(inner)}- ${formatValue(item)},`)
    else {
      let hidden = 0
      for (const item of a)
        if (!b.some((other) => deepEqual(other, item)))
          entries.push(`${pad(inner)}- ${formatValue(item)},`)
        else if (s === ' ') entries.push(`${pad(inner + 2)}${formatValue(item)},`)
        else hidden++
      for (const item of b)
        if (!a.some((other) => deepEqual(other, item)))
          entries.push(`${pad(inner)}+ ${formatValue(item)},`)
      if (hidden)
        entries.push(
          `${pad(inner + 2)}# (${hidden} unchanged element${hidden === 1 ? '' : 's'} hidden)`,
        )
    }
    if (!entries.length) return [`${label}[]${suffix}`]
    return [
      `${label}[${suffix}`,
      ...entries,
      `${pad(mode === 'show' ? col : col + 2)}]${mode === 'delete' ? ' -> null' : ''}`,
    ]
  }
  if (mode === 'create') return [`${label}${formatValue(after)}${suffix}`]
  if (mode === 'delete') return [`${label}${formatValue(before)} -> null${suffix}`]
  if (mode === 'show' || s === ' ') return [`${label}${formatValue(before)}`]
  if (s === '+') return [`${label}${formatValue(after)}${suffix}`]
  if (s === '-') return [`${label}${formatValue(before)} -> null${suffix}`]
  return [`${label}${formatValue(before)} -> ${formatValue(after)}${suffix}`]
}

const header = (addr: string) => {
  const parsed = parseAddress(addr)
  return parsed ? `resource "${parsed.type}" "${parsed.name}"` : `resource "${addr}"`
}

function renderChange(change: Change): string[] {
  const lines: string[] = []
  const head = header(change.addr)
  const notes: string[] = []
  if (change.movedFrom && change.action !== 'noop')
    notes.push(`  # (moved from ${change.movedFrom})`)
  if (change.importId && change.action !== 'noop')
    notes.push(`  # (imported from "${change.importId}")`)
  switch (change.action) {
    case 'create':
      lines.push(
        `  # ${change.addr} will be created`,
        ...notes,
        `  + ${head} {`,
        ...renderBody(change.type, null, change.after, 'create', 6),
        '    }',
      )
      break
    case 'delete':
      lines.push(`  # ${change.addr} will be destroyed`)
      if (change.reason) lines.push(`  # (${change.reason})`)
      lines.push(
        ...notes,
        `  - ${head} {`,
        ...renderBody(change.type, change.before, null, 'delete', 6),
        '    }',
      )
      break
    case 'update':
      lines.push(
        `  # ${change.addr} will be updated in-place`,
        ...notes,
        `  ~ ${head} {`,
        ...renderBody(change.type, change.before, change.after, 'update', 6, change.forceNew),
        '    }',
      )
      break
    case 'replace':
      lines.push(
        `  # ${change.addr} must be replaced`,
        ...notes,
        `${change.createBeforeDestroy ? '+/-' : '-/+'} ${head} {`,
        ...renderBody(change.type, change.before, change.after, 'update', 6, change.forceNew),
        '    }',
      )
      break
    case 'forget':
      lines.push(
        `  # ${change.addr} will no longer be managed by Terraform`,
        ...notes,
        `    ${head} {`,
        ...renderBody(change.type, change.before, change.before, 'show', 8, [], true),
        '    }',
      )
      break
    case 'noop':
      if (change.importId)
        lines.push(
          `  # ${change.addr} will be imported`,
          ...(change.movedFrom ? [`  # (moved from ${change.movedFrom})`] : []),
          `    ${head} {`,
          ...renderBody(change.type, change.before, change.before, 'show', 8),
          '    }',
        )
      else if (change.movedFrom)
        lines.push(
          `  # ${change.movedFrom} has moved to ${change.addr}`,
          `    ${head} {`,
          ...renderBody(change.type, change.before, change.before, 'show', 8, [], true),
          '    }',
        )
      break
  }
  return lines
}

function renderDrift(drift: Drift): string[] {
  const head = header(drift.addr)
  if (!drift.after)
    return [
      `  # ${drift.addr} has been deleted`,
      `  - ${head} {`,
      ...renderBody(drift.type, drift.before, null, 'delete', 6).slice(0, 2),
      '        # (other attributes hidden)',
      '    }',
    ]
  return [
    `  # ${drift.addr} has changed`,
    `  ~ ${head} {`,
    ...renderBody(drift.type, drift.before, drift.after, 'update', 6),
    '    }',
  ]
}

const RULE = '─'.repeat(77)

export function renderPlan(
  result: PlanResult,
  options: { out?: string; forApply?: boolean } = {},
): string {
  const lines: string[] = []
  if (result.refreshLines.length) lines.push(...result.refreshLines, '')
  const errors = result.diagnostics.filter((diag) => diag.severity === 'error')
  const warnings = result.diagnostics.filter((diag) => diag.severity === 'warning')
  if (result.drift.length) {
    lines.push(
      'Note: Objects have changed outside of Terraform',
      '',
      'Terraform detected the following changes made outside of Terraform since the',
      'last "terraform apply" which may have affected this plan:',
      '',
    )
    for (const drift of result.drift) lines.push(...renderDrift(drift), '')
    if (result.refreshOnly)
      lines.push(
        'This is a refresh-only plan, so Terraform will not take any actions to undo',
        'these. If you were expecting these changes then you can apply this plan to',
        'record the updated values in the Terraform state without changing any remote',
        'objects.',
      )
    else
      lines.push(
        'Unless you have made equivalent changes to your configuration, or ignored the',
        'relevant attributes using ignore_changes, the following plan may include',
        'actions to undo or respond to these changes.',
      )
    lines.push('', RULE, '')
  }
  if (errors.length) {
    lines.push(formatDiagnostics([...warnings, ...errors], result.files))
    return lines.join('\n')
  }
  if (result.refreshOnly) {
    if (!result.drift.length)
      lines.push(
        'No changes. Your infrastructure still matches the configuration.',
        '',
        'Terraform has checked that the real remote objects still match the result of',
        'your most recent changes, and found no differences.',
      )
  } else if (!hasChanges(result)) {
    lines.push(
      'No changes. Your infrastructure matches the configuration.',
      '',
      'Terraform has compared your real infrastructure against your configuration',
      'and found no differences, so no changes are needed.',
    )
  } else {
    const used = new Set(result.changes.map((change) => change.action))
    const legend: string[] = []
    if (used.has('create')) legend.push('  + create')
    if (used.has('update')) legend.push('  ~ update in-place')
    if (used.has('delete')) legend.push('  - destroy')
    if (result.changes.some((change) => change.action === 'replace' && !change.createBeforeDestroy))
      legend.push('-/+ destroy and then create replacement')
    if (result.changes.some((change) => change.action === 'replace' && change.createBeforeDestroy))
      legend.push('+/- create replacement and then destroy')
    if (legend.length)
      lines.push(
        'Terraform used the selected providers to generate the following execution',
        'plan. Resource actions are indicated with the following symbols:',
        ...legend,
        '',
      )
    lines.push('Terraform will perform the following actions:', '')
    for (const change of result.changes) {
      const rendered = renderChange(change)
      if (rendered.length) lines.push(...rendered, '')
    }
    const counts = planCounts(result)
    lines.push(
      `Plan: ${counts.import ? `${counts.import} to import, ` : ''}${counts.add} to add, ${counts.change} to change, ${counts.destroy} to destroy${counts.forget ? `, ${counts.forget} to forget` : ''}.`,
    )
    const forgotten = result.changes.filter((change) => change.action === 'forget')
    if (forgotten.length)
      lines.push(
        formatDiagnostics([
          {
            severity: 'warning',
            summary: 'Some objects will no longer be managed by Terraform',
            detail: `If you apply this plan, Terraform will discard its tracking information for the following objects, but it will not delete them:\n${forgotten.map((change) => ` - ${change.addr}`).join('\n')}\n\nAfter applying this plan, Terraform will no longer manage these objects. You will need to import them into Terraform to manage them again.`,
          },
        ]),
      )
  }
  if (warnings.length) lines.push(formatDiagnostics(warnings, result.files))
  if (!options.forApply && (hasChanges(result) || (result.refreshOnly && result.drift.length))) {
    lines.push('', RULE, '')
    if (options.out)
      lines.push(
        `Saved the plan to: ${options.out}`,
        '',
        'To perform exactly these actions, run the following command to apply:',
        `    terraform apply ${JSON.stringify(options.out)}`,
      )
    else
      lines.push(
        "Note: You didn't use the -out option to save this plan, so Terraform can't",
        'guarantee to take exactly these actions if you run "terraform apply" now.',
      )
  }
  return lines.join('\n')
}

/** `terraform show` / `terraform state show` for one object. */
export function renderStateInstance(instance: StateInstance): string {
  return [
    `# ${instance.addr}:`,
    `${header(instance.addr)} {`,
    ...renderBody(instance.type, instance.attrs, instance.attrs, 'show', 4),
    '}',
  ].join('\n')
}

/* ---------- apply ---------- */

export interface ApplyResult {
  ok: boolean
  output: string
}

function dependsOn(a: StateInstance, b: StateInstance): boolean {
  if (a.addr === b.addr) return false
  const id = String(b.attrs.id).toLowerCase()
  const values: string[] = []
  const collect = (value: Value) => {
    if (typeof value === 'string') values.push(value.toLowerCase())
    else if (Array.isArray(value)) value.forEach(collect)
    else if (isObject(value)) Object.values(value).forEach(collect)
  }
  for (const [name, value] of Object.entries(a.attrs)) if (name !== 'id') collect(value)
  if (values.some((value) => value === id)) return true
  const same = (x: Value, y: Value) =>
    String(x ?? '').toLowerCase() === String(y ?? '').toLowerCase()
  if (b.type === 'azurerm_resource_group' && same(a.attrs.resource_group_name, b.attrs.name))
    return true
  if (
    b.type === 'azurerm_virtual_network' &&
    a.type === 'azurerm_subnet' &&
    same(a.attrs.virtual_network_name, b.attrs.name) &&
    same(a.attrs.resource_group_name, b.attrs.resource_group_name)
  )
    return true
  return false
}

const duration = (seconds: number) =>
  seconds >= 60 ? `${Math.floor(seconds / 60)}m${seconds % 60}s` : `${seconds}s`

function errorBlock(
  summary: string,
  detail: string,
  addr: string,
  config: Config | null,
  files: Record<string, string>,
): string {
  const decl =
    config && allResources(config).find((entry) => resourceAddr(entry) === resourceOf(addr))
  const lines = ['╷', `│ Error: ${summary}`, '│ ']
  if (decl) {
    lines.push(
      `│   with ${addr},`,
      `│   on ${decl.file} line ${decl.line}, in resource "${decl.type}" "${decl.name}":`,
    )
    const source = files[decl.file]?.split('\n')[decl.line - 1]
    if (source !== undefined) lines.push(`│ ${String(decl.line).padStart(3)}: ${source}`)
    lines.push('│ ')
  }
  if (detail) for (const text of detail.split('\n')) lines.push(`│ ${text}`)
  lines.push('╵')
  return lines.join('\n')
}

function activity(env: EnvData, operation: string, resource: string) {
  env.activity.push({
    time: iso(env.clock),
    caller: 'sp-terraform-prod',
    operation,
    resource,
    status: 'Succeeded',
  })
}

const OPERATION_NAME = (type: string, verb: 'write' | 'delete') =>
  `${schemas[type].armType}/${verb}`

/** Applies a plan to the cloud and the state. */
export function applyPlan(env: EnvData, result: PlanResult): ApplyResult {
  const out: string[] = []
  const { config } = loadConfig(result.files, null)
  if (result.refreshOnly) {
    env.state.resources = clone(result.refreshed)
    env.state.serial++
    out.push('', 'Apply complete! Resources: 0 added, 0 changed, 0 destroyed.')
    return { ok: true, output: out.join('\n') }
  }
  const working = new Map(result.prior.map((instance) => [instance.addr, clone(instance)]))
  const failed = new Set<string>()
  const errors: string[] = []
  let added = 0
  let changed = 0
  let destroyed = 0
  let importedCount = 0

  for (const change of result.changes) {
    if (change.action === 'forget') working.delete(change.addr)
    if (change.importId) {
      out.push(
        `${change.addr}: Importing... [id=${change.importId}]`,
        `${change.addr}: Import complete [id=${change.importId}]`,
      )
      importedCount++
    }
  }

  // phase 1: destroy (dependents first)
  const toDestroy = result.changes.filter(
    (change) =>
      change.action === 'delete' || (change.action === 'replace' && !change.createBeforeDestroy),
  )
  const destroyOne = (change: Change): boolean => {
    const instance = working.get(change.addr)
    if (!instance) return true
    const id = String(instance.attrs.id)
    const schema = schemas[instance.type]
    out.push(`${change.addr}: Destroying... [id=${id}]`)
    if (instance.type === 'azurerm_resource_group') {
      const inside = cloudList(env).filter(
        (resource) =>
          resource.type !== 'azurerm_resource_group' &&
          String(resource.attrs.resource_group_name ?? '').toLowerCase() ===
            String(instance.attrs.name).toLowerCase(),
      )
      if (inside.length) {
        errors.push(
          errorBlock(
            `deleting Resource Group "${String(instance.attrs.name)}": the Resource Group still contains Resources.`,
            `Terraform is configured to check for Resources within the Resource Group when deleting the Resource Group - and raise an error if nested Resources still exist to avoid unintentionally deleting these Resources.\n\nTerraform has detected that the following Resources still exist within the Resource Group:\n\n${inside.map((resource) => `* \`${resource.id}\``).join('\n')}\n\nThis feature is intended to avoid the unintentional destruction of nested Resources provisioned through some other means - as such you must either remove these Resources, or disable this behaviour using the feature flag \`prevent_deletion_if_contains_resources\` within the \`features\` block when configuring the Provider.`,
            change.addr,
            config,
            result.files,
          ),
        )
        failed.add(change.addr)
        return false
      }
    }
    delete env.cloud[id.toLowerCase()]
    tick(env, Math.max(1, Math.round(schema.seconds / 2)))
    activity(env, OPERATION_NAME(instance.type, 'delete'), id)
    working.delete(change.addr)
    out.push(
      `${change.addr}: Destruction complete after ${duration(Math.max(1, Math.round(schema.seconds / 2)))}`,
    )
    destroyed++
    return true
  }
  const pending = [...toDestroy]
  while (pending.length) {
    const index = pending.findIndex((change) => {
      const self = working.get(change.addr)
      return !pending.some((other) => {
        const instance = working.get(other.addr)
        return other !== change && instance && self && dependsOn(instance, self)
      })
    })
    const [next] = pending.splice(index < 0 ? 0 : index, 1)
    destroyOne(next)
  }

  // phase 2: create / update in dependency order, re-evaluating unknowns
  const build = config ? new Evaluator(config, env) : null
  const instances = new Map<string, Instance>()
  if (build && config) {
    try {
      for (const decl of allResources(config))
        for (const instance of build.expand(decl)) instances.set(instance.addr, instance)
    } catch {
      // the plan already evaluated this successfully
    }
    build.lookup = (instance) =>
      working.get(instance.addr)?.attrs ?? unknownObject(instance.decl.type)
  }
  const toWrite = result.changes.filter((change) =>
    ['create', 'update', 'replace'].includes(change.action),
  )
  const done = new Set<string>()
  const ready = (change: Change) =>
    change.deps.every((dep) =>
      toWrite.every(
        (other) =>
          other === change ||
          done.has(other.addr) ||
          !(
            other.addr === dep ||
            other.addr.startsWith(`${dep}[`) ||
            (dep.endsWith('.') && other.addr.startsWith(dep))
          ),
      ),
    )
  const queue = [...toWrite]
  while (queue.length) {
    const index = queue.findIndex(ready)
    const [change] = queue.splice(index < 0 ? 0 : index, 1)
    done.add(change.addr)
    const blockedBy = change.deps.find((dep) =>
      [...failed].some(
        (addr) =>
          addr === dep || addr.startsWith(`${dep}[`) || (dep.endsWith('.') && addr.startsWith(dep)),
      ),
    )
    if (blockedBy) {
      failed.add(change.addr)
      continue
    }
    const instance = instances.get(change.addr)
    let after = change.after as Attrs
    if (build && instance) {
      try {
        const diags: Diagnostic[] = []
        const prior = change.action === 'replace' ? null : (working.get(change.addr)?.attrs ?? null)
        after = normalise(change.type, build.configured(instance, diags), prior)
        if (prior)
          after = applyIgnore(instance.decl.lifecycle.ignoreChanges, change.type, prior, after)
      } catch {
        after = change.after as Attrs
      }
    }
    const before = change.action === 'replace' ? null : (working.get(change.addr) ?? null)
    const schema = schemas[change.type]
    const configuredOnly = Object.fromEntries(
      Object.entries(after).filter(
        ([name, value]) => !isUnknown(value) && (before !== null || !schema.attrs[name]?.computed),
      ),
    )
    if (
      Object.entries(after).some(
        ([name, value]) =>
          containsUnknown(value) &&
          !schema.attrs[name]?.computed &&
          !schema.attrs[name]?.optionalComputed,
      )
    ) {
      errors.push(
        errorBlock(
          'Provider produced inconsistent final plan',
          `When expanding the plan for ${change.addr}, a value that was unknown is still unknown after its dependencies were applied.`,
          change.addr,
          config,
          result.files,
        ),
      )
      failed.add(change.addr)
      continue
    }
    if (before) {
      // update in place
      const id = String(before.attrs.id)
      out.push(`${change.addr}: Modifying... [id=${id}]`)
      const live = cloudGet(env, id)
      const merged = applyPolicy(env, change.type, { ...before.attrs, ...configuredOnly, id })
      if (live) {
        live.attrs = { ...live.attrs, ...merged }
        live.modifiedAt = iso(env.clock)
        live.modifiedBy = 'sp-terraform-prod'
      }
      tick(env, 2)
      activity(env, OPERATION_NAME(change.type, 'write'), id)
      working.set(change.addr, {
        addr: change.addr,
        type: change.type,
        attrs: clone(live?.attrs ?? merged),
      })
      out.push(`${change.addr}: Modifications complete after 2s [id=${id}]`)
      changed++
      continue
    }
    const full = completeAttrs(change.type, configuredOnly, SUBSCRIPTION_ID)
    const id = String(full.id)
    out.push(`${change.addr}: Creating...`)
    const problem = createProblem(env, change.type, full)
    if (problem) {
      errors.push(errorBlock(problem.summary, problem.detail, change.addr, config, result.files))
      failed.add(change.addr)
      continue
    }
    const seconds = schema.seconds
    tick(env, seconds)
    env.counter++
    const attrs = applyPolicy(env, change.type, full)
    env.cloud[id.toLowerCase()] = {
      id,
      type: change.type,
      attrs,
      uid: fakeGuid(`new:${env.counter}:${id}:${env.clock}`),
      createdAt: iso(env.clock),
      createdBy: 'sp-terraform-prod',
      modifiedAt: iso(env.clock),
      modifiedBy: 'sp-terraform-prod',
    }
    activity(env, OPERATION_NAME(change.type, 'write'), id)
    working.set(change.addr, { addr: change.addr, type: change.type, attrs: clone(attrs) })
    out.push(`${change.addr}: Creation complete after ${duration(seconds)} [id=${id}]`)
    added++
  }

  // phase 3: the destroy half of create_before_destroy replacements
  for (const change of result.changes.filter(
    (entry) => entry.action === 'replace' && entry.createBeforeDestroy,
  )) {
    if (failed.has(change.addr) || !change.before) continue
    const oldId = String(change.before.id)
    out.push(`${change.addr} (deposed object): Destroying... [id=${oldId}]`)
    delete env.cloud[oldId.toLowerCase()]
    activity(env, OPERATION_NAME(change.type, 'delete'), oldId)
    out.push(`${change.addr}: Destruction complete after 3s`)
    destroyed++
  }

  env.state.resources = [...working.values()].sort((a, b) => a.addr.localeCompare(b.addr))
  env.state.serial++

  // outputs
  if (config && !errors.length) {
    const outputs = new Evaluator(config, env)
    outputs.lookup = (instance) =>
      working.get(instance.addr)?.attrs ?? unknownObject(instance.decl.type)
    env.outputs = {}
    for (const name of config.root.outputs.keys()) {
      try {
        env.outputs[name] = outputs.output(config.root, name)
      } catch {
        // outputs that cannot be evaluated are skipped
      }
    }
  }

  if (errors.length) {
    out.push(...errors)
    return { ok: false, output: out.join('\n') }
  }
  out.push(
    '',
    `Apply complete! Resources: ${importedCount ? `${importedCount} imported, ` : ''}${added} added, ${changed} changed, ${destroyed} destroyed.`,
  )
  const names = Object.keys(env.outputs)
  if (names.length) {
    out.push('', 'Outputs:', '')
    for (const name of names) out.push(`${name} = ${formatValue(env.outputs[name])}`)
  }
  return { ok: true, output: out.join('\n') }
}

function unknownObject(type: string): Attrs {
  return Object.fromEntries(Object.keys(schemas[type].attrs).map((name) => [name, UNKNOWN]))
}

/** Why Azure would refuse to create this resource, if it would. */
function createProblem(
  env: EnvData,
  type: string,
  attrs: Attrs,
): { summary: string; detail: string } | null {
  const schema = schemas[type]
  const id = String(attrs.id)
  if (cloudGet(env, id))
    return {
      summary: `A resource with the ID "${id}" already exists - to be managed via Terraform this resource needs to be imported into the State. Please see the resource documentation for "${type}" for more information.`,
      detail: '',
    }
  const rg = attrs.resource_group_name
  if (rg && type !== 'azurerm_resource_group') {
    const exists = cloudList(env).some(
      (resource) =>
        resource.type === 'azurerm_resource_group' &&
        String(resource.attrs.name).toLowerCase() === String(rg).toLowerCase(),
    )
    if (!exists)
      return {
        summary: `creating ${schema.armType.split('/').pop()} "${String(attrs.name)}"`,
        detail: `unexpected status 404 (404 Not Found) with error: ResourceGroupNotFound: Resource group '${String(rg)}' could not be found.`,
      }
  }
  if (type === 'azurerm_subnet') {
    const vnet = `/subscriptions/${SUBSCRIPTION_ID}/resourceGroups/${String(rg)}/providers/Microsoft.Network/virtualNetworks/${String(attrs.virtual_network_name)}`
    if (!cloudGet(env, vnet))
      return {
        summary: `creating Subnet "${String(attrs.name)}"`,
        detail: `unexpected status 404 (404 Not Found) with error: ResourceNotFound: The Resource 'Microsoft.Network/virtualNetworks/${String(attrs.virtual_network_name)}' under resource group '${String(rg)}' was not found.`,
      }
  }
  if (schema.globalName) {
    const name = String(attrs.name).toLowerCase()
    const clash =
      env.takenNames.includes(name) ||
      cloudList(env).some(
        (resource) => resource.type === type && String(resource.attrs.name).toLowerCase() === name,
      )
    if (clash) {
      if (type === 'azurerm_storage_account')
        return {
          summary: `creating Storage Account (Subscription: "${SUBSCRIPTION_ID}"\nResource Group Name: "${String(rg)}"\nStorage Account Name: "${String(attrs.name)}")`,
          detail: `performing Create: unexpected status 409 (409 Conflict) with error: StorageAccountAlreadyTaken: The storage account named ${String(attrs.name)} is already taken.`,
        }
      if (type === 'azurerm_key_vault')
        return {
          summary: `creating Key Vault (Subscription: "${SUBSCRIPTION_ID}"\nResource Group Name: "${String(rg)}"\nKey Vault Name: "${String(attrs.name)}")`,
          detail: `unexpected status 409 (409 Conflict) with error: VaultAlreadyExists: The vault name '${String(attrs.name)}' is already in use. Vault names are globally unique so it is possible that the name is already taken.`,
        }
      return {
        summary: `creating Linux Web App (Subscription: "${SUBSCRIPTION_ID}"\nResource Group Name: "${String(rg)}"\nSite Name: "${String(attrs.name)}")`,
        detail: `the Site Name "${String(attrs.name)}" failed the availability check: Hostname '${String(attrs.name)}' already exists. Please select a different name.`,
      }
    }
  }
  return null
}
