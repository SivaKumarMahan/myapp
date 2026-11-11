import { parseAllDocuments } from 'yaml'
import type { K8sScenario } from '../../content/k8slab/types'
import { findObject, listObjects, namespaces, reconcile, stamp } from './cluster'
import { KUBECTL_VERBS, completionNames, kubectl, type ShellContext } from './kubectl'
import { curl, nslookup, type Output } from './net'
import { KINDS, applyObject } from './resources'
import type { Cluster } from './types'
import { clone, fromBase64, toBase64 } from './util'
import { BASE_MANIFESTS, emptyCluster } from './world'

/**
 * One lab environment: a pretend AKS cluster plus a tiny shell around
 * kubectl (pipes into grep/head/tail/wc/base64, `> file` redirects into the
 * Files tab, `$(...)`, `&&`, `;`), curl from your laptop and a sliver of
 * `az acr`. Every command moves the clock on 10 seconds, so restart
 * counters climb and new Pods age the way they would while you type.
 */

export interface RunResult extends Output {
  /** The cluster's desired state changed. */
  mutated: boolean
}

/** Seconds the clock moves for each command typed. */
export const STEP_SECONDS = 10

export const SHELL_COMMANDS = [
  'kubectl',
  'k',
  'curl',
  'nslookup',
  'az',
  'cat',
  'ls',
  'rm',
  'echo',
  'kubens',
  'clear',
  'help',
  'history',
]

type Token = { word: string } | { op: string }

function applyDocs(cluster: Cluster, text: string, namespace: string) {
  for (const doc of parseAllDocuments(text)) {
    const json = doc.toJSON() as unknown
    if (!json) continue
    const result = applyObject(cluster, json, namespace, 'setup')
    if (!result.ok) throw new Error(`Scenario manifest rejected: ${result.message}`)
  }
}

/** Every namespace gets its `default` ServiceAccount and `kube-root-ca.crt` ConfigMap. */
function namespaceDefaults(cluster: Cluster) {
  for (const namespace of listObjects(cluster, 'Namespace')) {
    const name = namespace.metadata.name
    const created = namespace.metadata.creationTimestamp
    if (!findObject(cluster, 'ServiceAccount', 'default', name))
      cluster.objects.push(
        stamp(cluster, {
          apiVersion: 'v1',
          kind: 'ServiceAccount',
          metadata: { name: 'default', namespace: name, creationTimestamp: created },
        }),
      )
    if (!findObject(cluster, 'ConfigMap', 'kube-root-ca.crt', name))
      cluster.objects.push(
        stamp(cluster, {
          apiVersion: 'v1',
          kind: 'ConfigMap',
          metadata: {
            name: 'kube-root-ca.crt',
            namespace: name,
            creationTimestamp: created,
            annotations: {
              'kubernetes.io/description':
                'Contains a CA bundle that can be used to verify the kube-apiserver when using internal endpoints such as the internal service IP or kubernetes.default.svc. No other usage is guaranteed across distributions of Kubernetes clusters.',
            },
          },
          data: {
            'ca.crt':
              '-----BEGIN CERTIFICATE-----\n<cluster CA certificate>\n-----END CERTIFICATE-----\n',
          },
        }),
      )
  }
}

/* ---------- tokenising ---------- */

function tokenize(line: string, substitute: (inner: string) => string): Token[] | string {
  const tokens: Token[] = []
  let word = ''
  let inWord = false
  const push = () => {
    if (inWord) tokens.push({ word })
    word = ''
    inWord = false
  }
  for (let index = 0; index < line.length; index++) {
    const char = line[index]
    if (char === "'") {
      const end = line.indexOf("'", index + 1)
      if (end < 0) return "lab: unexpected end of line: missing closing quote (')"
      word += line.slice(index + 1, end)
      inWord = true
      index = end
    } else if (char === '"') {
      let end = index + 1
      let text = ''
      while (end < line.length && line[end] !== '"') {
        if (line[end] === '\\' && end + 1 < line.length && '"\\$`'.includes(line[end + 1])) {
          text += line[end + 1]
          end += 2
        } else if (line[end] === '$' && line[end + 1] === '(') {
          const close = matchParen(line, end + 1)
          if (close < 0) return 'lab: unexpected end of line: missing )'
          text += substitute(line.slice(end + 2, close)).replace(/\n+$/, '')
          end = close + 1
        } else text += line[end++]
      }
      if (end >= line.length) return 'lab: unexpected end of line: missing closing quote (")'
      word += text
      inWord = true
      index = end
    } else if (char === '\\' && index + 1 < line.length) {
      word += line[++index]
      inWord = true
    } else if (char === '$' && line[index + 1] === '(') {
      const close = matchParen(line, index + 1)
      if (close < 0) return 'lab: unexpected end of line: missing )'
      const out = substitute(line.slice(index + 2, close)).trim()
      const parts = out.split(/\s+/).filter(Boolean)
      parts.forEach((part, at) => {
        word += part
        inWord = true
        if (at < parts.length - 1) push()
      })
      index = close
    } else if (char === '`') {
      return 'lab: backtick substitution is not supported - use $(...)'
    } else if (/\s/.test(char)) push()
    else if (
      char === '|' ||
      char === '&' ||
      char === ';' ||
      char === '>' ||
      (char === '2' && line[index + 1] === '>' && !inWord)
    ) {
      push()
      const rest = line.slice(index)
      const op = ['2>&1', '2>', '&&', '||', '>>', '|', ';', '>', '&'].find((candidate) =>
        rest.startsWith(candidate),
      ) as string
      tokens.push({ op })
      index += op.length - 1
    } else {
      word += char
      inWord = true
    }
  }
  push()
  return tokens
}

function matchParen(line: string, open: number) {
  let depth = 0
  for (let index = open; index < line.length; index++) {
    if (line[index] === '(') depth++
    else if (line[index] === ')') {
      depth--
      if (depth === 0) return index
    } else if (line[index] === "'") index = line.indexOf("'", index + 1)
    if (index < 0) return -1
  }
  return -1
}

/* ---------- text filters (the right-hand side of a pipe) ---------- */

function filter(words: string[], input: string, files: Record<string, string>): Output {
  const [name, ...args] = words
  const lines = input.replace(/\n$/, '').split('\n')
  const out = (text: string[]) => ({
    stdout: text.length && !(text.length === 1 && text[0] === '') ? `${text.join('\n')}\n` : '',
    stderr: '',
    exitCode: 0,
  })
  const count = (fallback: number) => {
    const flag = args.find((arg) => /^-\d+$/.test(arg))
    if (flag) return { n: Number(flag.slice(1)), from: false }
    const index = args.findIndex((arg) => arg === '-n' || arg.startsWith('-n'))
    if (index < 0) return { n: fallback, from: false }
    const raw = args[index] === '-n' ? args[index + 1] : args[index].slice(2)
    return { n: Number((raw ?? '').replace('+', '')), from: (raw ?? '').startsWith('+') }
  }
  switch (name) {
    case 'grep':
    case 'egrep': {
      const context = (letter: string) => {
        const index = args.findIndex((arg) => arg.startsWith(`-${letter}`))
        if (index < 0) return 0
        return Number(args[index].length > 2 ? args[index].slice(2) : args[index + 1]) || 0
      }
      const after = context('A') || context('C')
      const before = context('B') || context('C')
      const isContext = (arg: string) => /^-[ABC]\d*$/.test(arg)
      const flags = new Set(
        args
          .filter((arg) => /^-[a-zA-Z]+$/.test(arg) && !isContext(arg))
          .flatMap((arg) => [...arg.slice(1)]),
      )
      const rest = args.filter(
        (arg, index) =>
          !/^-[a-zA-Z]+$/.test(arg) && !isContext(arg) && !/^-[ABC]$/.test(args[index - 1] ?? ''),
      )
      const pattern = rest[0]
      if (pattern === undefined)
        return { stdout: '', stderr: 'Usage: grep [OPTION]... PATTERNS [FILE]...', exitCode: 2 }
      let regex: RegExp
      try {
        const source = name === 'egrep' || flags.has('E') ? pattern : pattern.replace(/\\\|/g, '|')
        regex = new RegExp(
          flags.has('w') ? `\\b(?:${source})\\b` : source,
          flags.has('i') ? 'i' : '',
        )
      } catch {
        regex = new RegExp(
          pattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'),
          flags.has('i') ? 'i' : '',
        )
      }
      const hits = lines.map((line) => regex.test(line) !== flags.has('v'))
      if (flags.has('c')) return out([String(hits.filter(Boolean).length)])
      const keep = new Set<number>()
      hits.forEach((hit, index) => {
        if (!hit) return
        for (
          let at = Math.max(0, index - before);
          at <= Math.min(lines.length - 1, index + after);
          at++
        )
          keep.add(at)
      })
      const picked = lines
        .map((line, index) => (flags.has('n') ? `${index + 1}:${line}` : line))
        .filter((_, index) => keep.has(index))
      return { ...out(picked), exitCode: picked.length ? 0 : 1 }
    }
    case 'head':
      return out(lines.slice(0, count(10).n))
    case 'tail': {
      const { n, from } = count(10)
      return out(from ? lines.slice(Math.max(0, n - 1)) : lines.slice(-n))
    }
    case 'wc': {
      const text = input
      if (args.includes('-l'))
        return out([String(text ? text.replace(/\n$/, '').split('\n').length : 0)])
      if (args.includes('-w')) return out([String(text.split(/\s+/).filter(Boolean).length)])
      if (args.includes('-c')) return out([String(text.length)])
      return out([
        `${String(lines.length).padStart(7)} ${String(text.split(/\s+/).filter(Boolean).length).padStart(7)} ${String(text.length).padStart(7)}`,
      ])
    }
    case 'sort': {
      const numeric = args.some((arg) => /^-[a-zA-Z]*n/.test(arg))
      const sorted = [...lines].sort((a, b) =>
        numeric ? parseFloat(a) - parseFloat(b) : a.localeCompare(b),
      )
      return out(args.some((arg) => /^-[a-zA-Z]*r/.test(arg)) ? sorted.reverse() : sorted)
    }
    case 'uniq': {
      const result: [string, number][] = []
      for (const line of lines) {
        const last = result[result.length - 1]
        if (last && last[0] === line) last[1]++
        else result.push([line, 1])
      }
      return out(
        args.includes('-c')
          ? result.map(([line, n]) => `${String(n).padStart(7)} ${line}`)
          : result.map(([line]) => line),
      )
    }
    case 'base64':
      return args.some((arg) => arg === '-d' || arg === '--decode' || arg === '-D')
        ? { stdout: fromBase64(input.trim()), stderr: '', exitCode: 0 }
        : out([toBase64(input)])
    case 'awk': {
      const separatorIndex = args.findIndex((arg) => arg.startsWith('-F'))
      const separator =
        separatorIndex >= 0
          ? args[separatorIndex] === '-F'
            ? args[separatorIndex + 1]
            : args[separatorIndex].slice(2)
          : null
      const program =
        args.filter(
          (_, index) =>
            index !== separatorIndex &&
            !(separator && args[separatorIndex] === '-F' && index === separatorIndex + 1),
        )[0] ?? ''
      const match = /^\s*(?:(NR\s*[><=!]+\s*\d+)\s*)?\{\s*print\s+([^}]*)\}\s*$/.exec(program)
      if (!match)
        return {
          stdout: '',
          stderr: "(lab) awk here only understands '{print $1, $3}' (optionally with NR>1 and -F)",
          exitCode: 2,
        }
      const condition = match[1]
      const fields = match[2].split(/\s*,\s*/)
      return out(
        lines
          .filter((_, index) => {
            if (!condition) return true
            const [, op, n] = /NR\s*([><=!]+)\s*(\d+)/.exec(condition) ?? []
            const nr = index + 1
            const value = Number(n)
            return op === '>'
              ? nr > value
              : op === '>='
                ? nr >= value
                : op === '<'
                  ? nr < value
                  : op === '=='
                    ? nr === value
                    : nr !== value
          })
          .map((line) => {
            const parts = separator ? line.split(separator) : line.trim().split(/\s+/)
            return fields
              .map((field) =>
                field === '$0'
                  ? line
                  : /^\$\d+$/.test(field)
                    ? (parts[Number(field.slice(1)) - 1] ?? '')
                    : field.replace(/^"|"$/g, ''),
              )
              .join(' ')
          }),
      )
    }
    case 'cut': {
      const delimiterArg = args.find((arg) => arg.startsWith('-d'))
      const delimiter = delimiterArg
        ? delimiterArg === '-d'
          ? args[args.indexOf('-d') + 1]
          : delimiterArg.slice(2)
        : '\t'
      const fieldArg = args.find((arg) => arg.startsWith('-f'))
      const spec = fieldArg
        ? fieldArg === '-f'
          ? args[args.indexOf('-f') + 1]
          : fieldArg.slice(2)
        : '1'
      const wanted = spec.split(',').map(Number)
      return out(
        lines.map((line) => wanted.map((n) => line.split(delimiter)[n - 1] ?? '').join(delimiter)),
      )
    }
    case 'tee': {
      const file = args.find((arg) => !arg.startsWith('-'))
      if (file) files[file] = input
      return { stdout: input, stderr: '', exitCode: 0 }
    }
    case 'less':
    case 'more':
    case 'cat':
    case 'column':
      return { stdout: input, stderr: '', exitCode: 0 }
    case 'jq':
      return {
        stdout: '',
        stderr:
          "(lab) jq is not installed in this terminal - use kubectl's -o jsonpath='{...}' instead",
        exitCode: 127,
      }
    default:
      return {
        stdout: '',
        stderr: `lab: ${name}: not available after a pipe (try grep, head, tail, wc, sort, uniq, awk, cut, base64 -d)`,
        exitCode: 127,
      }
  }
}

/* ---------- the lab ---------- */

export class K8sLab {
  cluster: Cluster
  files: Record<string, string>

  private constructor(cluster: Cluster, files: Record<string, string>) {
    this.cluster = cluster
    this.files = files
  }

  /** A fresh cluster for a scenario (or the Sandbox), as it is "now". */
  static create(
    scenario: Pick<K8sScenario, 'setup'> | null = null,
    files: Record<string, string> = {},
  ): K8sLab {
    const cluster = emptyCluster()
    applyDocs(cluster, BASE_MANIFESTS, 'default')
    namespaceDefaults(cluster)
    reconcile(cluster)
    const lab = new K8sLab(cluster, { ...files })
    if (scenario) {
      const setup = scenario.setup
      cluster.images.push(...clone(setup.images ?? []))
      cluster.registries.push(...clone(setup.registries ?? []))
      cluster.nodes.push(...clone(setup.extraNodes ?? []))
      const start = -(setup.age ?? 900)
      cluster.now = start
      if (!findObject(cluster, 'Namespace', setup.namespace))
        cluster.objects.push(
          stamp(cluster, {
            apiVersion: 'v1',
            kind: 'Namespace',
            metadata: { name: setup.namespace },
          }),
        )
      applyDocs(cluster, setup.manifests, setup.namespace)
      namespaceDefaults(cluster)
      reconcile(cluster)
      cluster.namespace = setup.namespace
      for (const step of [...(setup.timeline ?? [])].sort((a, b) => a.at - b.at)) {
        cluster.now = start + step.at
        const result = lab.exec(step.command)
        if (result.exitCode !== 0)
          throw new Error(`Scenario timeline step failed: ${step.command}: ${result.stderr}`)
      }
    }
    cluster.now = 0
    reconcile(cluster)
    return lab
  }

  /** Runs one terminal line. */
  run(line: string): RunResult {
    if (!line.trim()) return { stdout: '', stderr: '', exitCode: 0, mutated: false }
    this.cluster.now += STEP_SECONDS
    reconcile(this.cluster)
    return this.exec(line)
  }

  /** Runs a line without moving the clock (scenario timelines, checks). */
  exec(line: string): RunResult {
    const ctx: ShellContext = { cluster: this.cluster, files: this.files }
    let mutated = false
    const substitute = (inner: string) => {
      const result = this.exec(inner)
      mutated ||= result.mutated
      return result.stdout
    }
    const tokens = tokenize(line, substitute)
    if (typeof tokens === 'string') return { stdout: '', stderr: tokens, exitCode: 2, mutated }
    const chains: { tokens: Token[]; join: string | null }[] = [{ tokens: [], join: null }]
    for (const token of tokens) {
      if ('op' in token && (token.op === '&&' || token.op === '||' || token.op === ';'))
        chains.push({ tokens: [], join: token.op })
      else if ('op' in token && token.op === '&')
        return {
          stdout: '',
          stderr: 'lab: background jobs (&) are not supported',
          exitCode: 2,
          mutated,
        }
      else chains[chains.length - 1].tokens.push(token)
    }
    let stdout = ''
    let stderr = ''
    let exitCode = 0
    for (const chain of chains) {
      if (chain.join === '&&' && exitCode !== 0) continue
      if (chain.join === '||' && exitCode === 0) continue
      if (chain.tokens.length === 0) continue
      const result = this.pipeline(ctx, chain.tokens)
      mutated ||= result.mutated
      if (result.mutated) {
        namespaceDefaults(this.cluster)
        reconcile(this.cluster)
      }
      stdout += result.stdout
      stderr += result.stderr ? `${stderr ? '\n' : ''}${result.stderr.replace(/\n$/, '')}` : ''
      exitCode = result.exitCode
    }
    return { stdout, stderr, exitCode, mutated }
  }

  private pipeline(ctx: ShellContext, tokens: Token[]): RunResult {
    const stages: string[][] = [[]]
    let redirect: { file: string; append: boolean } | null = null
    let dropStderr = false
    let mergeStderr = false
    for (let index = 0; index < tokens.length; index++) {
      const token = tokens[index]
      if ('word' in token) stages[stages.length - 1].push(token.word)
      else if (token.op === '|') stages.push([])
      else if (token.op === '>' || token.op === '>>') {
        const next = tokens[++index]
        if (!next || !('word' in next))
          return {
            stdout: '',
            stderr: "lab: syntax error near unexpected token `newline'",
            exitCode: 2,
            mutated: false,
          }
        redirect = { file: next.word.replace(/^\.\//, ''), append: token.op === '>>' }
      } else if (token.op === '2>') {
        index++
        dropStderr = true
      } else if (token.op === '2>&1') mergeStderr = true
    }
    if (stages.some((stage) => stage.length === 0))
      return {
        stdout: '',
        stderr: "lab: syntax error near unexpected token `|'",
        exitCode: 2,
        mutated: false,
      }
    let result = this.command(ctx, stages[0])
    for (const stage of stages.slice(1)) {
      const next = filter(
        stage,
        mergeStderr ? `${result.stdout}${result.stderr}` : result.stdout,
        this.files,
      )
      result = {
        stdout: next.stdout,
        stderr: [result.stderr, next.stderr].filter(Boolean).join('\n'),
        exitCode: next.exitCode,
        mutated: result.mutated,
      }
    }
    if (mergeStderr && stages.length === 1)
      result = {
        ...result,
        stdout: `${result.stdout}${result.stderr ? `${result.stderr}\n` : ''}`,
        stderr: '',
      }
    if (redirect) {
      if (redirect.file === '/dev/null')
        return { ...result, stdout: '', stderr: dropStderr ? '' : result.stderr }
      if (redirect.file.includes('/'))
        return {
          ...result,
          stdout: '',
          stderr: `lab: ${redirect.file}: files live in the Files tab - use a plain name like web.yaml`,
        }
      this.files[redirect.file] = redirect.append
        ? `${this.files[redirect.file] ?? ''}${result.stdout}`
        : result.stdout
      return { ...result, stdout: '', stderr: dropStderr ? '' : result.stderr }
    }
    return dropStderr ? { ...result, stderr: '' } : result
  }

  private command(ctx: ShellContext, words: string[]): RunResult {
    const [name, ...args] = words
    const done = (output: Output, mutated = false): RunResult => ({ ...output, mutated })
    switch (name) {
      case 'kubectl':
      case 'k':
      case 'kubectl.exe': {
        const result = kubectl(ctx, args)
        return { ...result, mutated: Boolean(result.mutated) }
      }
      case 'curl':
        return done(curl(this.cluster, args, { kind: 'outside' }))
      case 'nslookup':
      case 'dig':
      case 'host':
        return done(
          nslookup(
            this.cluster,
            args.filter((arg) => !arg.startsWith('+')),
            { kind: 'outside' },
          ),
        )
      case 'az':
        return done(az(this.cluster, args))
      case 'kubens': {
        if (!args[0])
          return done({
            stdout: `${namespaces(this.cluster).join('\n')}\n`,
            stderr: '',
            exitCode: 0,
          })
        if (!namespaces(this.cluster).includes(args[0]))
          return done({
            stdout: '',
            stderr: `error: no namespace exists with name "${args[0]}"`,
            exitCode: 1,
          })
        this.cluster.namespace = args[0]
        return done({
          stdout: `Context "aks-lab" modified.\nActive namespace is "${args[0]}".\n`,
          stderr: '',
          exitCode: 0,
        })
      }
      case 'ls':
        return done({
          stdout: Object.keys(this.files)
            .sort()
            .map((file) => `${file}\n`)
            .join(''),
          stderr: '',
          exitCode: 0,
        })
      case 'cat': {
        if (args.length === 0)
          return done({
            stdout: '',
            stderr: '(lab) cat needs a file name - files are in the Files tab',
            exitCode: 1,
          })
        let stdout = ''
        for (const file of args) {
          const text = this.files[file.replace(/^\.\//, '')]
          if (text === undefined)
            return done({ stdout, stderr: `cat: ${file}: No such file or directory`, exitCode: 1 })
          stdout += text.endsWith('\n') || !text ? text : `${text}\n`
        }
        return done({ stdout, stderr: '', exitCode: 0 })
      }
      case 'rm': {
        for (const file of args.filter((arg) => !arg.startsWith('-'))) {
          if (this.files[file] === undefined)
            return done({
              stdout: '',
              stderr: `rm: cannot remove '${file}': No such file or directory`,
              exitCode: 1,
            })
          delete this.files[file]
        }
        return done({ stdout: '', stderr: '', exitCode: 0 })
      }
      case 'echo':
        return done({
          stdout: `${args.filter((arg) => arg !== '-n' && arg !== '-e').join(' ')}\n`,
          stderr: '',
          exitCode: 0,
        })
      case 'vi':
      case 'vim':
      case 'nano':
      case 'code':
        return done({
          stdout: '',
          stderr: `(lab) there is no terminal editor - open the Files tab to edit ${args[0] ?? 'a file'}, then kubectl apply -f ${args[0] ?? 'FILE'}`,
          exitCode: 1,
        })
      case 'watch':
        return done({
          stdout: '',
          stderr:
            '(lab) watch is not available - run the command again (↑ then Enter) to see changes.',
          exitCode: 1,
        })
      case 'sleep':
        this.cluster.now += Math.min(Number(args[0]) || 0, 600)
        reconcile(this.cluster)
        return done({ stdout: '', stderr: '', exitCode: 0 })
      case 'helm':
        return done({
          stdout: '',
          stderr: '(lab) helm is not simulated - this lab is about kubectl.',
          exitCode: 127,
        })
      case 'ssh':
      case 'docker':
      case 'crictl':
        return done({
          stdout: '',
          stderr: `(lab) ${name} is not available here - on AKS you rarely touch nodes directly; kubectl describe and logs show what the kubelet saw.`,
          exitCode: 127,
        })
      default:
        return done({
          stdout: '',
          stderr: `${name}: command not found\n(lab) type help for what this terminal supports - usually you want kubectl.`,
          exitCode: 127,
        })
    }
  }

  writeFile(name: string, content: string) {
    this.files[name] = content
  }

  /** Tab completion: the completed line, or the candidates when it is ambiguous. */
  complete(line: string): { line: string; options: string[] } {
    const ctx: ShellContext = { cluster: this.cluster, files: this.files }
    const parts = line.split(/\s+/)
    const current = parts[parts.length - 1] ?? ''
    const before = parts.slice(0, -1).filter(Boolean)
    const head = before[0]
    let candidates: string[] = []
    const kinds = KINDS.flatMap((info) => [info.plural, ...info.short]).concat([
      'all',
      'deploy',
      'deployment',
      'pod',
      'service',
    ])
    const namespaceFlag = before.findIndex((word) => word === '-n' || word === '--namespace')
    const namespace =
      namespaceFlag >= 0
        ? (before[namespaceFlag + 1] ?? this.cluster.namespace)
        : this.cluster.namespace
    const previous = before[before.length - 1]
    if (before.length === 0) candidates = SHELL_COMMANDS
    else if (previous === '-n' || previous === '--namespace') candidates = namespaces(this.cluster)
    else if (previous === '-f' || previous === '--filename' || head === 'cat' || head === 'rm')
      candidates = Object.keys(this.files)
    else if (head === 'kubens') candidates = namespaces(this.cluster)
    else if (head === 'curl')
      candidates = listObjects(this.cluster, 'Ingress').flatMap((ingress) =>
        (ingress.spec.rules ?? [])
          .filter((rule) => rule.host)
          .map((rule) => `http://${rule.host}/`),
      )
    else if (head === 'kubectl' || head === 'k') {
      const words = before
        .slice(1)
        .filter(
          (word, index, list) =>
            !word.startsWith('-') &&
            !['-n', '--namespace', '-o', '-l', '-c', '-f'].includes(list[index - 1] ?? ''),
        )
      const verb = words[0]
      if (!verb) candidates = KUBECTL_VERBS
      else if (verb === 'rollout' && words.length === 1)
        candidates = ['status', 'history', 'undo', 'restart', 'pause', 'resume']
      else if (verb === 'set' && words.length === 1) candidates = ['image', 'resources', 'env']
      else if (verb === 'top' && words.length === 1) candidates = ['pods', 'nodes']
      else if (verb === 'config' && words.length === 1)
        candidates = ['set-context', 'current-context', 'get-contexts', 'view', 'use-context']
      else if (current.includes('/')) {
        const [kind] = current.split('/')
        candidates = completionNames(ctx, kind, namespace).map((name) => `${kind}/${name}`)
      } else if (verb === 'logs' || verb === 'exec' || verb === 'log')
        candidates = [...completionNames(ctx, 'pods', namespace), 'deploy/']
      else if (['rollout', 'set', 'scale'].includes(verb))
        candidates = [
          'deployment/',
          ...completionNames(ctx, 'deployments', namespace).map((name) => `deployment/${name}`),
        ]
      else if (
        [
          'get',
          'describe',
          'delete',
          'edit',
          'label',
          'annotate',
          'patch',
          'expose',
          'explain',
          'wait',
          'taint',
          'cordon',
          'uncordon',
        ].includes(verb)
      ) {
        const kindWord = words[1]
        candidates = !kindWord ? kinds : completionNames(ctx, kindWord, namespace)
        if (['taint', 'cordon', 'uncordon'].includes(verb) && !kindWord)
          candidates = ['nodes', ...this.cluster.nodes.map((node) => `node/${node.name}`)]
      }
    }
    const matches = [...new Set(candidates)]
      .filter((candidate) => candidate.startsWith(current))
      .sort()
    if (matches.length === 0) return { line, options: [] }
    const prefix = line.slice(0, line.length - current.length)
    if (matches.length === 1) {
      const match = matches[0]
      return { line: `${prefix}${match}${match.endsWith('/') ? '' : ' '}`, options: [] }
    }
    let common = matches[0]
    for (const match of matches) while (!match.startsWith(common)) common = common.slice(0, -1)
    return {
      line: `${prefix}${common.length > current.length ? common : current}`,
      options: matches,
    }
  }
}

/* ---------- az (just enough for a registry question) ---------- */

function az(cluster: Cluster, args: string[]): Output {
  const flag = (...names: string[]) => {
    for (const name of names) {
      const index = args.indexOf(name)
      if (index >= 0) return args[index + 1]
      const inline = args.find((arg) => arg.startsWith(`${name}=`))
      if (inline) return inline.slice(name.length + 1)
    }
    return undefined
  }
  const output = flag('-o', '--output') ?? 'json'
  const print = (list: string[], title = 'Result') =>
    output === 'table'
      ? {
          stdout: `${title}\n${'-'.repeat(Math.max(title.length, ...list.map((entry) => entry.length)))}\n${list.join('\n')}\n`,
          stderr: '',
          exitCode: 0,
        }
      : output === 'tsv'
        ? { stdout: `${list.join('\n')}\n`, stderr: '', exitCode: 0 }
        : { stdout: `${JSON.stringify(list, null, 2)}\n`, stderr: '', exitCode: 0 }
  const words = args.filter((arg) => !arg.startsWith('-'))
  if (words[0] === 'login' || (words[0] === 'account' && words[1] === 'show'))
    return {
      stdout: `{\n  "name": "Lab subscription",\n  "state": "Enabled",\n  "user": { "name": "learner@contoso.com", "type": "user" }\n}\n`,
      stderr: '',
      exitCode: 0,
    }
  if (words[0] === 'aks' && words[1] === 'get-credentials')
    return {
      stdout: 'Merged "aks-lab" as current context in /home/learner/.kube/config\n',
      stderr: '',
      exitCode: 0,
    }
  if (
    words[0] === 'acr' &&
    words[1] === 'repository' &&
    (words[2] === 'show-tags' || words[2] === 'list')
  ) {
    const name = flag('-n', '--name')
    if (!name)
      return {
        stdout: '',
        stderr: 'ERROR: the following arguments are required: --name/-n',
        exitCode: 2,
      }
    const host = name.includes('.') ? name : `${name}.azurecr.io`
    const registry = cluster.registries.find((entry) => entry.host === host)
    if (!registry)
      return {
        stdout: '',
        stderr: `ERROR: The resource with name '${name}' and type 'Microsoft.ContainerRegistry/registries' could not be found in subscription 'Lab subscription'.`,
        exitCode: 3,
      }
    const repos = cluster.images.filter((image) => image.repo.startsWith(`${host}/`))
    if (words[2] === 'list') return print(repos.map((image) => image.repo.slice(host.length + 1)))
    const repository = flag('--repository')
    if (!repository)
      return {
        stdout: '',
        stderr: 'ERROR: the following arguments are required: --repository',
        exitCode: 2,
      }
    const image = repos.find((entry) => entry.repo === `${host}/${repository}`)
    if (!image)
      return {
        stdout: '',
        stderr: `ERROR: Error: repository ${repository} is not found.`,
        exitCode: 3,
      }
    const tags = [...image.tags]
    if ((flag('--orderby') ?? '') === 'time_desc') tags.reverse()
    const top = Number(flag('--top') ?? tags.length)
    return print(tags.slice(0, top))
  }
  if (words[0] === 'acr' && words[1] === 'login')
    return {
      stdout: '',
      stderr:
        '(lab) az acr login logs Docker in - the cluster pulls with its own identity or an imagePullSecret, not your login.',
      exitCode: 1,
    }
  return {
    stdout: '',
    stderr:
      '(lab) only az acr repository list|show-tags and az aks get-credentials are simulated here - the Azure CLI simulator covers the rest.',
    exitCode: 1,
  }
}
