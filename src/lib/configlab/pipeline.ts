import Ajv, { type ErrorObject, type ValidateFunction } from 'ajv'
import type { Document } from 'yaml'
import { distance } from '../azcli/errors'
import type { Analysis, Finding } from './types'
import { isMapping, lineAt, parseYaml, pointerToPath, type Path } from './yaml'

/**
 * Azure Pipelines and GitHub Actions checks.
 *
 * Two layers: a JSON Schema for each format (a compact subset of the official
 * ones - every key they allow, with the types that matter) validated by Ajv,
 * then semantic rules a schema cannot express: dependencies that point
 * nowhere, cycles, unpinned actions, secrets in plain text.
 */

export type PipelineKind = 'azure' | 'github' | 'unknown'

export interface GraphNode {
  id: string
  label: string
  kind: 'stage' | 'job'
  /** Names of the jobs (in a stage) or steps (in a job). */
  children: string[]
  condition: string | null
  dependsOn: string[]
  /** True when the dependency was implied (Azure stages run in order by default). */
  implicit: boolean
  line: number
}

export interface PipelineFacts {
  kind: PipelineKind
  stages: string[]
  jobs: string[]
  steps: number
  graph: GraphNode[]
}

/* -------------------------------------------------------------- schemas */

const anything = {}
const stringOrList = { type: ['string', 'array'], items: { type: 'string' } }
const NAME = '^[A-Za-z_][A-Za-z0-9_]*$'

const azureStep = {
  type: 'object',
  minProperties: 1,
  additionalProperties: false,
  properties: Object.fromEntries(
    [
      'script',
      'bash',
      'pwsh',
      'powershell',
      'checkout',
      'download',
      'downloadBuild',
      'publish',
      'template',
      'getPackage',
      'reviewApp',
      'displayName',
      'name',
      'condition',
      'workingDirectory',
      'artifact',
      'path',
      'clean',
      'fetchDepth',
      'fetchTags',
      'lfs',
      'submodules',
      'persistCredentials',
      'failOnStderr',
      'errorActionPreference',
      'ignoreLASTEXITCODE',
      'target',
    ].map((key) => [key, anything]),
  ),
}
Object.assign(azureStep.properties, {
  task: { type: 'string', pattern: '^[A-Za-z0-9_.-]+@\\d+$' },
  inputs: { type: 'object' },
  env: { type: 'object' },
  parameters: { type: 'object' },
  continueOnError: { type: ['boolean', 'string'] },
  enabled: { type: ['boolean', 'string'] },
  timeoutInMinutes: { type: ['integer', 'string'] },
  retryCountOnTaskFailure: { type: ['integer', 'string'] },
})

const pool = {
  anyOf: [
    { type: 'string' },
    {
      type: 'object',
      additionalProperties: false,
      properties: { name: { type: 'string' }, vmImage: { type: 'string' }, demands: anything },
    },
  ],
}

const azureJob = {
  type: 'object',
  additionalProperties: false,
  properties: {
    job: { type: 'string', pattern: NAME },
    deployment: { type: 'string', pattern: NAME },
    template: { type: 'string' },
    parameters: { type: 'object' },
    displayName: { type: 'string' },
    dependsOn: stringOrList,
    condition: { type: 'string' },
    continueOnError: { type: ['boolean', 'string'] },
    pool,
    variables: { type: ['object', 'array'] },
    steps: { type: 'array', items: { $ref: '#/definitions/step' } },
    strategy: { type: 'object' },
    environment: { type: ['string', 'object'] },
    timeoutInMinutes: { type: ['integer', 'string'] },
    cancelTimeoutInMinutes: { type: ['integer', 'string'] },
    workspace: { type: 'object' },
    container: anything,
    services: { type: 'object' },
    uses: { type: 'object' },
    templateContext: anything,
  },
}

const azureStage = {
  type: 'object',
  additionalProperties: false,
  properties: {
    stage: { type: 'string', pattern: NAME },
    template: { type: 'string' },
    parameters: { type: 'object' },
    displayName: { type: 'string' },
    dependsOn: stringOrList,
    condition: { type: 'string' },
    variables: { type: ['object', 'array'] },
    pool,
    jobs: { type: 'array', items: { $ref: '#/definitions/job' } },
    lockBehavior: { enum: ['sequential', 'runLatest'] },
    isSkippable: { type: 'boolean' },
    trigger: { enum: ['manual', 'automatic'] },
    templateContext: anything,
  },
}

export const azureSchema = {
  type: 'object',
  additionalProperties: false,
  definitions: { step: azureStep, job: azureJob, stage: azureStage },
  properties: {
    name: { type: 'string' },
    appendCommitMessageToRunName: { type: 'boolean' },
    trigger: anything,
    pr: anything,
    schedules: { type: 'array' },
    resources: { type: 'object' },
    parameters: { type: 'array' },
    variables: { type: ['object', 'array'] },
    pool,
    lockBehavior: { enum: ['sequential', 'runLatest'] },
    extends: { type: 'object' },
    stages: { type: 'array', items: { $ref: '#/definitions/stage' } },
    jobs: { type: 'array', items: { $ref: '#/definitions/job' } },
    steps: { type: 'array', items: { $ref: '#/definitions/step' } },
  },
}

const githubStep = {
  type: 'object',
  additionalProperties: false,
  properties: {
    id: { type: 'string' },
    if: { type: ['string', 'boolean'] },
    name: { type: 'string' },
    uses: { type: 'string' },
    run: { type: 'string' },
    'working-directory': { type: 'string' },
    shell: { type: 'string' },
    with: { type: 'object' },
    env: { type: 'object' },
    'continue-on-error': { type: ['boolean', 'string'] },
    'timeout-minutes': { type: ['number', 'string'] },
  },
}

const githubJob = {
  type: 'object',
  additionalProperties: false,
  properties: {
    name: { type: 'string' },
    needs: stringOrList,
    'runs-on': { type: ['string', 'array', 'object'] },
    permissions: { type: ['string', 'object'] },
    environment: { type: ['string', 'object'] },
    concurrency: { type: ['string', 'object'] },
    outputs: { type: 'object' },
    env: { type: 'object' },
    defaults: { type: 'object' },
    if: { type: ['string', 'boolean'] },
    steps: { type: 'array', items: { $ref: '#/definitions/step' } },
    'timeout-minutes': { type: ['number', 'string'] },
    strategy: { type: 'object' },
    'continue-on-error': { type: ['boolean', 'string'] },
    container: { type: ['string', 'object'] },
    services: { type: 'object' },
    uses: { type: 'string' },
    with: { type: 'object' },
    secrets: { type: ['string', 'object'] },
  },
}

export const githubSchema = {
  type: 'object',
  required: ['on', 'jobs'],
  additionalProperties: false,
  definitions: { step: githubStep, job: githubJob },
  properties: {
    name: { type: 'string' },
    'run-name': { type: 'string' },
    on: { type: ['string', 'array', 'object'] },
    permissions: { type: ['string', 'object'] },
    env: { type: 'object' },
    defaults: { type: 'object' },
    concurrency: { type: ['string', 'object'] },
    jobs: {
      type: 'object',
      minProperties: 1,
      additionalProperties: { $ref: '#/definitions/job' },
      propertyNames: { pattern: '^[A-Za-z_][A-Za-z0-9_-]*$' },
    },
  },
}

let validators: { azure: ValidateFunction; github: ValidateFunction } | null = null
const getValidators = () => {
  if (!validators) {
    const ajv = new Ajv({ allErrors: true, strict: false })
    validators = { azure: ajv.compile(azureSchema), github: ajv.compile(githubSchema) }
  }
  return validators
}

/* ------------------------------------------------------- error messages */

function allowedKeys(schema: Record<string, unknown>, path: Path, kind: PipelineKind): string[] {
  // Walk the schema alongside the data path to find the object being described.
  let node: Record<string, unknown> | undefined = schema
  const definitions = schema.definitions as Record<string, Record<string, unknown>>
  for (const part of path) {
    if (!node) return []
    if (typeof part === 'number') node = node.items as Record<string, unknown> | undefined
    else
      node = ((node.properties as Record<string, Record<string, unknown>> | undefined)?.[part] ??
        node.additionalProperties) as Record<string, unknown> | undefined
    const ref = node?.$ref as string | undefined
    if (ref) node = definitions[ref.split('/').pop() as string]
  }
  void kind
  return Object.keys((node?.properties as object | undefined) ?? {})
}

function schemaFinding(
  error: ErrorObject,
  doc: Document.Parsed,
  lines: Parameters<typeof lineAt>[1],
  kind: PipelineKind,
): Finding | null {
  const path = pointerToPath(error.instancePath)
  const where = path.length ? `at ${path.join('.')}` : 'at the top level'
  const schema = kind === 'azure' ? azureSchema : githubSchema
  switch (error.keyword) {
    case 'additionalProperties': {
      const key = (error.params as { additionalProperty: string }).additionalProperty
      const known = allowedKeys(schema, path, kind)
      const near = known
        .map((candidate) => ({
          candidate,
          score: distance(key.toLowerCase(), candidate.toLowerCase()),
        }))
        .sort((a, b) => a.score - b.score)[0]
      const suggestion = near && near.score <= 2 ? ` Did you mean '${near.candidate}'?` : ''
      return {
        rule: 'SCHEMA',
        severity: 'error',
        title: `Unknown key '${key}'`,
        message: `'${key}' is not allowed ${where}, so the pipeline would be rejected.${suggestion}`,
        line: lineAt(doc, lines, [...path, key], true),
      }
    }
    case 'required': {
      const missing = (error.params as { missingProperty: string }).missingProperty
      return {
        rule: 'SCHEMA',
        severity: 'error',
        title: `Missing '${missing}'`,
        message: `A ${kind === 'github' ? 'workflow' : 'pipeline'} needs '${missing}' ${where}.${missing === 'on' ? ' Without it, the workflow never runs.' : ''}`,
        line: lineAt(doc, lines, path),
      }
    }
    case 'type':
      return {
        rule: 'SCHEMA',
        severity: 'error',
        title: `Wrong type for '${path[path.length - 1] ?? 'document'}'`,
        message: `${where[0].toUpperCase()}${where.slice(1)}: expected ${(error.params as { type: string | string[] }).type}, as the schema requires.`,
        line: lineAt(doc, lines, path),
      }
    case 'pattern': {
      const value = doc.getIn(path) as string
      const field = path[path.length - 1]
      if (field === 'task') {
        return {
          rule: 'AZP-TASK',
          severity: 'error',
          title: `Task '${value}' has no version`,
          message:
            'Azure Pipelines tasks are referenced as Name@MajorVersion, e.g. DotNetCoreCLI@2. Without the version the task cannot be resolved.',
          line: lineAt(doc, lines, path),
          fix: { snippet: `- task: ${value}@<version>   # e.g. ${value}@2`, language: 'yaml' },
        }
      }
      return {
        rule: 'SCHEMA',
        severity: 'error',
        title: `Invalid name '${value ?? path[path.length - 1]}'`,
        message: `${where}: names must start with a letter or underscore and contain only letters, digits and underscores${kind === 'github' ? ' or hyphens' : ''}.`,
        line: lineAt(
          doc,
          lines,
          path.length ? path : [],
          typeof path[path.length - 1] === 'string',
        ),
      }
    }
    case 'propertyNames':
    case 'minProperties':
      return {
        rule: 'SCHEMA',
        severity: 'error',
        title: 'Invalid structure',
        message: `${where}: ${error.message}`,
        line: lineAt(doc, lines, path),
      }
    case 'anyOf':
    case 'enum':
      return {
        rule: 'SCHEMA',
        severity: 'error',
        title: `Invalid value at ${path.join('.') || 'top level'}`,
        message: `${where}: ${error.message}.`,
        line: lineAt(doc, lines, path),
      }
    default:
      return null
  }
}

/* ------------------------------------------------------------ helpers */

const list = (value: unknown): string[] =>
  Array.isArray(value) ? value.map(String) : typeof value === 'string' ? [value] : []

/** Finds dependency cycles; returns one cycle's ids, or null. */
function findCycle(nodes: { id: string; deps: string[] }[]): string[] | null {
  const byId = new Map(nodes.map((node) => [node.id, node]))
  const state = new Map<string, 'visiting' | 'done'>()
  const stack: string[] = []
  const visit = (id: string): string[] | null => {
    if (state.get(id) === 'done') return null
    if (state.get(id) === 'visiting') return [...stack.slice(stack.indexOf(id)), id]
    state.set(id, 'visiting')
    stack.push(id)
    for (const dep of byId.get(id)?.deps ?? []) {
      if (byId.has(dep)) {
        const cycle = visit(dep)
        if (cycle) return cycle
      }
    }
    stack.pop()
    state.set(id, 'done')
    return null
  }
  for (const node of nodes) {
    const cycle = visit(node.id)
    if (cycle) return cycle
  }
  return null
}

const SECRET_NAME =
  /(pass(word|wd)?|secret|token|api[_-]?key|client[_-]?secret|connection[_-]?string|access[_-]?key|private[_-]?key)/i

const stepLabel = (step: Record<string, unknown>) =>
  String(
    step.displayName ??
      step.name ??
      step.task ??
      step.uses ??
      (step.checkout !== undefined ? `checkout: ${step.checkout}` : undefined) ??
      String(
        step.script ??
          step.bash ??
          step.pwsh ??
          step.powershell ??
          step.run ??
          step.template ??
          'step',
      ).split('\n')[0],
  )

/** Required inputs for a few common Azure Pipelines tasks. */
const TASK_INPUTS: Record<string, string[]> = {
  'AzureCLI@2': ['azureSubscription', 'scriptType', 'scriptLocation'],
  'AzureWebApp@1': ['azureSubscription', 'appName'],
  'AzureRmWebAppDeployment@4': ['azureSubscription', 'WebAppName'],
  'Docker@2': ['command'],
  'DotNetCoreCLI@2': ['command'],
  'PublishPipelineArtifact@1': ['targetPath'],
  'AzureResourceManagerTemplateDeployment@3': [
    'azureResourceManagerConnection',
    'resourceGroupName',
    'location',
    'csmFile',
  ],
  'KubernetesManifest@1': ['action'],
}

/* --------------------------------------------------------- analysers */

function analyseAzure(
  data: Record<string, unknown>,
  at: (path: Path, key?: boolean) => number,
  findings: Finding[],
): PipelineFacts {
  const stagesRaw = Array.isArray(data.stages) ? (data.stages as Record<string, unknown>[]) : null
  const topJobs = Array.isArray(data.jobs) ? (data.jobs as Record<string, unknown>[]) : null
  const topSteps = Array.isArray(data.steps) ? (data.steps as Record<string, unknown>[]) : null
  if ([stagesRaw, topJobs, topSteps].filter(Boolean).length > 1) {
    findings.push({
      rule: 'AZP-SHAPE',
      severity: 'error',
      title: 'Mix of stages, jobs and steps',
      message:
        'A pipeline has stages, or jobs, or steps at the top level - not more than one. Put jobs inside stages, and steps inside jobs.',
      line: at([]),
    })
  }
  if (!stagesRaw && !topJobs && !topSteps && !data.extends) {
    findings.push({
      rule: 'AZP-SHAPE',
      severity: 'error',
      title: 'Nothing to run',
      message: 'The pipeline has no stages, jobs or steps.',
      line: 1,
    })
  }
  if (data.trigger === undefined) {
    findings.push({
      rule: 'AZP-TRIGGER',
      severity: 'info',
      title: 'No trigger',
      message:
        'Without `trigger:` the pipeline runs on a push to every branch. Say which branches you mean.',
      line: 1,
      fix: { snippet: 'trigger:\n  branches:\n    include:\n      - main', language: 'yaml' },
    })
  }

  const facts: PipelineFacts = { kind: 'azure', stages: [], jobs: [], steps: 0, graph: [] }

  const checkSteps = (steps: unknown, path: Path) => {
    if (!Array.isArray(steps)) return [] as string[]
    return (steps as Record<string, unknown>[]).map((step, index) => {
      if (!isMapping(step)) return 'step'
      facts.steps += 1
      const kinds = [
        'script',
        'bash',
        'pwsh',
        'powershell',
        'task',
        'checkout',
        'download',
        'downloadBuild',
        'publish',
        'template',
        'getPackage',
        'reviewApp',
      ].filter((key) => key in step)
      if (kinds.length !== 1) {
        findings.push({
          rule: 'AZP-STEP',
          severity: 'error',
          title: kinds.length === 0 ? 'Step does nothing' : `Step is both ${kinds.join(' and ')}`,
          message:
            'Each step is exactly one of script, bash, pwsh, powershell, task, checkout, download, publish or template.',
          line: at([...path, index]),
        })
      }
      const task = typeof step.task === 'string' ? step.task : undefined
      const required = task ? TASK_INPUTS[task] : undefined
      if (required) {
        const inputs = isMapping(step.inputs) ? step.inputs : {}
        const missing = required.filter((input) => !(input in inputs))
        if (missing.length > 0) {
          findings.push({
            rule: 'AZP-INPUTS',
            severity: 'error',
            title: `${task} is missing ${missing.join(', ')}`,
            message: `The ${task} task needs these inputs: ${required.join(', ')}.`,
            line: at([...path, index, 'task']),
            fix: {
              snippet: `- task: ${task}\n  inputs:\n${required.map((input) => `    ${input}: <value>`).join('\n')}`,
              language: 'yaml',
            },
          })
        }
      }
      return stepLabel(step)
    })
  }

  const checkPool = (job: Record<string, unknown>, stagePool: unknown, path: Path) => {
    if (!job.pool && !stagePool && !data.pool && !job.template) {
      findings.push({
        rule: 'AZP-POOL',
        severity: 'warning',
        title: 'No agent pool',
        message:
          'No pool is set at the job, stage or pipeline level, so the job falls back to whatever default the project uses. Say which agents should run it.',
        line: at(path),
        fix: { snippet: 'pool:\n  vmImage: ubuntu-latest', language: 'yaml' },
      })
    }
  }

  const checkJobs = (
    jobs: Record<string, unknown>[],
    path: Path,
    stagePool: unknown,
  ): GraphNode[] => {
    const nodes: GraphNode[] = []
    const names = new Map<string, number>()
    jobs.forEach((job, index) => {
      if (!isMapping(job)) return
      const name = String(job.job ?? job.deployment ?? job.template ?? `Job${index + 1}`)
      if (!job.job && !job.deployment && !job.template) {
        findings.push({
          rule: 'AZP-JOB',
          severity: 'error',
          title: 'Job without a name',
          message: 'Each job needs `job: <name>`, `deployment: <name>` or `template:`.',
          line: at([...path, index]),
        })
      }
      if (names.has(name)) {
        findings.push({
          rule: 'AZP-DUP',
          severity: 'error',
          title: `Duplicate job '${name}'`,
          message: 'Job names must be unique within a stage.',
          line: at([...path, index]),
        })
      }
      names.set(name, index)
      if (job.deployment) {
        if (!job.environment) {
          findings.push({
            rule: 'AZP-DEPLOY',
            severity: 'error',
            title: `Deployment job '${name}' has no environment`,
            message:
              'A deployment job deploys to an environment - which is where approvals and checks, and the deployment history, live.',
            line: at([...path, index, 'deployment']),
            fix: {
              snippet: `- deployment: ${name}\n  environment: production\n  strategy:\n    runOnce:\n      deploy:\n        steps:\n          - script: echo deploying`,
              language: 'yaml',
            },
          })
        }
        if (!job.strategy) {
          findings.push({
            rule: 'AZP-DEPLOY',
            severity: 'error',
            title: `Deployment job '${name}' has no strategy`,
            message:
              'Deployment jobs put their steps under a strategy (runOnce, rolling or canary), not directly under `steps:`.',
            line: at([...path, index, 'deployment']),
          })
        }
        if (job.steps) {
          findings.push({
            rule: 'AZP-DEPLOY',
            severity: 'error',
            title: 'Steps directly under a deployment job',
            message: 'In a deployment job, steps go in strategy.runOnce.deploy.steps.',
            line: at([...path, index, 'steps'], true),
          })
        }
      }
      checkPool(job, stagePool, [...path, index])
      const steps =
        job.deployment && isMapping(job.strategy)
          ? (Object.values(job.strategy)[0] as Record<string, Record<string, unknown>> | undefined)
              ?.deploy?.steps
          : job.steps
      const children = checkSteps(
        steps,
        job.deployment ? [...path, index, 'strategy'] : [...path, index, 'steps'],
      )
      facts.jobs.push(name)
      nodes.push({
        id: name,
        label: String(job.displayName ?? name),
        kind: 'job',
        children,
        condition: typeof job.condition === 'string' ? job.condition : null,
        dependsOn: list(job.dependsOn),
        implicit: false,
        line: at([...path, index]),
      })
    })
    checkDependencies(nodes, 'job', (id) => at([...path, names.get(id) ?? 0, 'dependsOn']))
    return nodes
  }

  if (stagesRaw) {
    const names = new Map<string, number>()
    const nodes: GraphNode[] = []
    stagesRaw.forEach((stage, index) => {
      if (!isMapping(stage)) return
      const name = String(stage.stage ?? stage.template ?? `Stage${index + 1}`)
      if (!stage.stage && !stage.template) {
        findings.push({
          rule: 'AZP-STAGE',
          severity: 'error',
          title: 'Stage without a name',
          message: 'Each stage needs `stage: <name>` (or `template:`).',
          line: at(['stages', index]),
        })
      }
      if (names.has(name))
        findings.push({
          rule: 'AZP-DUP',
          severity: 'error',
          title: `Duplicate stage '${name}'`,
          message: 'Stage names must be unique.',
          line: at(['stages', index]),
        })
      names.set(name, index)
      const jobs = Array.isArray(stage.jobs)
        ? checkJobs(stage.jobs as Record<string, unknown>[], ['stages', index, 'jobs'], stage.pool)
        : []
      if (!stage.template && jobs.length === 0)
        findings.push({
          rule: 'AZP-STAGE',
          severity: 'error',
          title: `Stage '${name}' has no jobs`,
          message: 'A stage needs at least one job.',
          line: at(['stages', index]),
        })
      facts.stages.push(name)
      // Stages run one after another unless dependsOn says otherwise.
      const explicit = stage.dependsOn !== undefined
      const previous =
        index > 0 && isMapping(stagesRaw[index - 1])
          ? String(stagesRaw[index - 1].stage ?? stagesRaw[index - 1].template ?? `Stage${index}`)
          : null
      nodes.push({
        id: name,
        label: String(stage.displayName ?? name),
        kind: 'stage',
        children: jobs.map((job) => job.label),
        condition: typeof stage.condition === 'string' ? stage.condition : null,
        dependsOn: explicit ? list(stage.dependsOn) : previous ? [previous] : [],
        implicit: !explicit && previous !== null,
        line: at(['stages', index]),
      })
    })
    checkDependencies(nodes, 'stage', (id) => at(['stages', names.get(id) ?? 0, 'dependsOn']))
    facts.graph = nodes
  } else if (topJobs) {
    facts.graph = checkJobs(topJobs, ['jobs'], undefined)
  } else if (topSteps) {
    const children = checkSteps(topSteps, ['steps'])
    if (!data.pool) checkPool({}, undefined, [])
    facts.jobs.push('Job')
    facts.graph = [
      {
        id: 'Job',
        label: 'Job (implicit)',
        kind: 'job',
        children,
        condition: null,
        dependsOn: [],
        implicit: false,
        line: at(['steps']),
      },
    ]
  }

  // Secrets typed straight into the YAML.
  const variables = data.variables
  const entries: [string, unknown, Path][] = isMapping(variables)
    ? Object.entries(variables).map(([key, value]) => [key, value, ['variables', key]])
    : Array.isArray(variables)
      ? (variables as Record<string, unknown>[])
          .filter(isMapping)
          .filter((entry) => 'name' in entry)
          .map((entry, index) => [String(entry.name), entry.value, ['variables', index]])
      : []
  for (const [key, value, path] of entries) {
    if (SECRET_NAME.test(key) && typeof value === 'string' && value && !value.startsWith('$(')) {
      findings.push({
        rule: 'AZP-SECRET',
        severity: 'error',
        title: `Secret '${key}' in plain text`,
        message:
          'Anyone who can read the repository can read this value, and it ends up in logs. Store it as a secret variable, or in Key Vault linked through a variable group.',
        line: at(path, true),
        fix: {
          snippet: `variables:\n  - group: shop-secrets   # variable group linked to Key Vault\n# or a secret pipeline variable, referenced as $(${key})`,
          language: 'yaml',
        },
      })
    }
  }

  function checkDependencies(
    nodes: GraphNode[],
    kind: 'stage' | 'job',
    lineFor: (id: string) => number,
  ) {
    const ids = new Set(nodes.map((node) => node.id))
    for (const node of nodes) {
      for (const dep of node.dependsOn) {
        if (!ids.has(dep)) {
          const near = [...ids]
            .map((id) => ({ id, score: distance(dep.toLowerCase(), id.toLowerCase()) }))
            .sort((a, b) => a.score - b.score)[0]
          findings.push({
            rule: 'AZP-DEPENDS',
            severity: 'error',
            title: `${kind === 'stage' ? 'Stage' : 'Job'} '${node.id}' depends on unknown '${dep}'`,
            message: `There is no ${kind} called '${dep}'.${near && near.score <= 2 ? ` Did you mean '${near.id}'?` : ''} Names are case-sensitive.`,
            line: lineFor(node.id),
          })
        }
      }
    }
    const cycle = findCycle(nodes.map((node) => ({ id: node.id, deps: node.dependsOn })))
    if (cycle) {
      findings.push({
        rule: 'AZP-CYCLE',
        severity: 'error',
        title: 'Dependency cycle',
        message: `${cycle.join(' → ')}: these ${kind}s wait for each other, so none can start.`,
        line: lineFor(cycle[0]),
      })
    }
  }

  return facts
}

const EVENTS = new Set([
  'push',
  'pull_request',
  'pull_request_target',
  'workflow_dispatch',
  'workflow_call',
  'workflow_run',
  'schedule',
  'release',
  'issues',
  'issue_comment',
  'repository_dispatch',
  'merge_group',
  'create',
  'delete',
  'deployment',
  'deployment_status',
  'page_build',
  'registry_package',
  'check_run',
  'check_suite',
  'discussion',
  'fork',
  'gollum',
  'label',
  'milestone',
  'public',
  'pull_request_review',
  'pull_request_review_comment',
  'status',
  'watch',
  'branch_protection_rule',
])

function analyseGithub(
  data: Record<string, unknown>,
  at: (path: Path, key?: boolean) => number,
  findings: Finding[],
): PipelineFacts {
  const facts: PipelineFacts = { kind: 'github', stages: [], jobs: [], steps: 0, graph: [] }
  const events =
    typeof data.on === 'string'
      ? [data.on]
      : Array.isArray(data.on)
        ? data.on.map(String)
        : isMapping(data.on)
          ? Object.keys(data.on)
          : []
  for (const event of events) {
    if (!EVENTS.has(event)) {
      findings.push({
        rule: 'GHA-EVENT',
        severity: 'error',
        title: `Unknown event '${event}'`,
        message: 'GitHub will not recognise this trigger, so the workflow never runs for it.',
        line: at(['on'], true),
      })
    }
  }
  if (data.permissions === undefined) {
    findings.push({
      rule: 'GHA-PERMS',
      severity: 'warning',
      title: 'No permissions block',
      message:
        'Without `permissions:`, GITHUB_TOKEN gets the repository default - often read and write to everything. Grant only what the workflow needs.',
      line: 1,
      fix: { snippet: 'permissions:\n  contents: read', language: 'yaml' },
    })
  }
  const prTarget = events.includes('pull_request_target')

  const jobs = isMapping(data.jobs) ? data.jobs : {}
  const nodes: GraphNode[] = []
  for (const [id, raw] of Object.entries(jobs)) {
    if (!isMapping(raw)) continue
    const job = raw
    if (!job['runs-on'] && !job.uses) {
      findings.push({
        rule: 'GHA-RUNSON',
        severity: 'error',
        title: `Job '${id}' has no runs-on`,
        message:
          'Every job needs a runner (`runs-on: ubuntu-latest`) unless it calls a reusable workflow with `uses:`.',
        line: at(['jobs', id], true),
        fix: { snippet: `${id}:\n  runs-on: ubuntu-latest`, language: 'yaml' },
      })
    }
    if (job.uses && job.steps)
      findings.push({
        rule: 'GHA-REUSE',
        severity: 'error',
        title: `Job '${id}' has uses and steps`,
        message: 'A job that calls a reusable workflow cannot have its own steps.',
        line: at(['jobs', id, 'uses'], true),
      })
    const steps = Array.isArray(job.steps) ? (job.steps as Record<string, unknown>[]) : []
    const children = steps.map((step, index) => {
      if (!isMapping(step)) return 'step'
      facts.steps += 1
      const path: Path = ['jobs', id, 'steps', index]
      if ((step.uses === undefined) === (step.run === undefined)) {
        findings.push({
          rule: 'GHA-STEP',
          severity: 'error',
          title: step.uses ? 'Step has both uses and run' : 'Step does nothing',
          message:
            'Each step either runs a command (`run:`) or uses an action (`uses:`) - exactly one.',
          line: at(path),
        })
      }
      if (
        typeof step.uses === 'string' &&
        !step.uses.startsWith('./') &&
        !step.uses.startsWith('docker://')
      ) {
        const ref = step.uses.split('@')[1]
        if (!ref) {
          findings.push({
            rule: 'GHA-PIN',
            severity: 'error',
            title: `Action '${step.uses}' has no version`,
            message:
              'Actions must be referenced with @ and a version: a tag, a branch or (best) a full commit SHA.',
            line: at([...path, 'uses']),
          })
        } else if (['main', 'master', 'latest', 'HEAD'].includes(ref)) {
          findings.push({
            rule: 'GHA-PIN',
            severity: 'warning',
            title: `Action pinned to a moving branch (@${ref})`,
            message:
              'Whatever is pushed to that branch runs in your workflow, with your secrets. Pin to a release tag at least, ideally to a full commit SHA.',
            line: at([...path, 'uses']),
            fix: {
              snippet: `uses: ${step.uses.split('@')[0]}@v4   # or @<full commit SHA>`,
              language: 'yaml',
            },
          })
        } else if (!/^[0-9a-f]{40}$/.test(ref)) {
          findings.push({
            rule: 'GHA-SHA',
            severity: 'info',
            title: `${step.uses} is pinned to a tag`,
            message:
              'Tags can be moved. For third-party actions, pinning to a full commit SHA (with the tag in a comment) is the supply-chain-safe choice.',
            line: at([...path, 'uses']),
          })
        }
        if (
          prTarget &&
          step.uses.startsWith('actions/checkout') &&
          isMapping(step.with) &&
          /github\.event\.pull_request\.head/.test(String(step.with.ref ?? ''))
        ) {
          findings.push({
            rule: 'GHA-PRTARGET',
            severity: 'error',
            title: 'pull_request_target checks out the PR code',
            message:
              "pull_request_target runs with your repository's secrets and write token. Checking out and running the PR's own code hands both to anyone who opens a pull request.",
            line: at([...path, 'with', 'ref']),
          })
        }
      }
      if (typeof step.run === 'string') {
        if (/echo[^\n]*\$\{\{\s*secrets\./.test(step.run)) {
          findings.push({
            rule: 'GHA-SECRET',
            severity: 'error',
            title: 'A secret is echoed',
            message:
              'Printing secrets is how they leak - masking only catches the exact value, not encodings or parts of it. Pass the secret as an environment variable to the tool that needs it.',
            line: at([...path, 'run']),
            fix: {
              snippet: `- run: ./deploy.sh\n  env:\n    API_TOKEN: \${{ secrets.API_TOKEN }}`,
              language: 'yaml',
            },
          })
        }
        if (/::set-output\s/.test(step.run)) {
          findings.push({
            rule: 'GHA-OUTPUT',
            severity: 'warning',
            title: 'Deprecated ::set-output',
            message:
              '`::set-output` is disabled on current runners. Write to the GITHUB_OUTPUT file instead.',
            line: at([...path, 'run']),
            fix: { snippet: 'echo "version=1.2.3" >> "$GITHUB_OUTPUT"', language: 'yaml' },
          })
        }
      }
      return stepLabel(step)
    })
    facts.jobs.push(id)
    nodes.push({
      id,
      label: String(job.name ?? id),
      kind: 'job',
      children,
      condition: job.if !== undefined ? String(job.if) : null,
      dependsOn: list(job.needs),
      implicit: false,
      line: at(['jobs', id], true),
    })
  }
  const ids = new Set(nodes.map((node) => node.id))
  for (const node of nodes) {
    for (const dep of node.dependsOn) {
      if (!ids.has(dep)) {
        const near = [...ids]
          .map((id) => ({ id, score: distance(dep, id) }))
          .sort((a, b) => a.score - b.score)[0]
        findings.push({
          rule: 'GHA-NEEDS',
          severity: 'error',
          title: `Job '${node.id}' needs unknown job '${dep}'`,
          message: `There is no job '${dep}'.${near && near.score <= 2 ? ` Did you mean '${near.id}'?` : ''}`,
          line: at(['jobs', node.id, 'needs']),
        })
      }
    }
  }
  const cycle = findCycle(nodes.map((node) => ({ id: node.id, deps: node.dependsOn })))
  if (cycle)
    findings.push({
      rule: 'GHA-CYCLE',
      severity: 'error',
      title: 'Dependency cycle',
      message: `${cycle.join(' → ')}: these jobs need each other, so none can start.`,
      line: at(['jobs', cycle[0], 'needs']),
    })
  facts.graph = nodes
  return facts
}

/** Analyses an Azure Pipelines or GitHub Actions YAML file. */
export function analysePipeline(text: string): Analysis<PipelineFacts> {
  const { docs, lines, syntax } = parseYaml(text)
  const empty: PipelineFacts = { kind: 'unknown', stages: [], jobs: [], steps: 0, graph: [] }
  if (syntax.some((finding) => finding.severity === 'error'))
    return { findings: syntax, facts: empty }
  const doc = docs[0]
  const data = doc?.toJS() as unknown
  if (!isMapping(data)) {
    return {
      findings: [
        ...syntax,
        {
          rule: 'YAML',
          severity: 'error',
          title: 'Not a pipeline',
          message: 'A pipeline file is a YAML mapping (key: value pairs) at the top level.',
          line: 1,
        },
      ],
      facts: empty,
    }
  }
  const kind: PipelineKind =
    'on' in data || (isMapping(data.jobs) && !Array.isArray(data.jobs)) ? 'github' : 'azure'
  const at = (path: Path, key = false) => lineAt(doc, lines, path, key)
  const findings: Finding[] = [...syntax]
  const validate = getValidators()[kind === 'github' ? 'github' : 'azure']
  if (!validate(data)) {
    const seen = new Set<string>()
    for (const error of validate.errors ?? []) {
      const finding = schemaFinding(error, doc, lines, kind)
      if (!finding) continue
      const key = `${finding.title}@${finding.line}`
      if (!seen.has(key)) {
        seen.add(key)
        findings.push(finding)
      }
    }
  }
  const facts =
    kind === 'github' ? analyseGithub(data, at, findings) : analyseAzure(data, at, findings)
  return { findings, facts }
}
