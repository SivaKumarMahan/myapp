/**
 * A parser for the practical subset of HCL the Terraform lab needs: blocks
 * with labels, attributes, strings with `${...}` interpolation and heredocs,
 * numbers, bools, null, lists, objects, references (`var.x`,
 * `azurerm_subnet.app["web"].id`), function calls, `for` expressions,
 * conditionals and simple operators.
 *
 * Syntax errors carry the file and line and use Terraform's own wording, so
 * `terraform validate` in the lab reads like the real thing.
 */

export type Value = string | number | boolean | null | Value[] | { [key: string]: Value }

/** A value only known after apply (a new resource's id, for example). */
export const UNKNOWN = '\u0000(known after apply)'
export const isUnknown = (value: unknown): boolean => value === UNKNOWN

export type Expr =
  | { k: 'lit'; v: Value; line: number }
  | { k: 'tpl'; parts: (string | Expr)[]; line: number }
  | { k: 'list'; items: Expr[]; line: number }
  | { k: 'obj'; items: { key: Expr; value: Expr }[]; line: number }
  | { k: 'name'; name: string; line: number }
  | { k: 'attr'; obj: Expr; name: string; line: number }
  | { k: 'index'; obj: Expr; key: Expr; line: number }
  | { k: 'splat'; obj: Expr; steps: SplatStep[]; line: number }
  | { k: 'call'; name: string; args: Expr[]; line: number }
  | { k: 'cond'; test: Expr; then: Expr; else: Expr; line: number }
  | { k: 'bin'; op: string; left: Expr; right: Expr; line: number }
  | { k: 'unary'; op: '!' | '-'; expr: Expr; line: number }
  | {
      k: 'for'
      kind: 'list' | 'obj'
      keyVar: string | null
      valVar: string
      coll: Expr
      keyExpr: Expr | null
      valExpr: Expr
      cond: Expr | null
      line: number
    }

export type SplatStep = { attr: string } | { index: Expr }

export interface Attribute {
  name: string
  expr: Expr
  line: number
}

export interface Block {
  type: string
  labels: string[]
  body: Body
  line: number
  file: string
}

export interface Body {
  attrs: Attribute[]
  blocks: Block[]
}

export interface Diagnostic {
  severity: 'error' | 'warning'
  summary: string
  detail: string
  file?: string
  line?: number
  /** e.g. `resource "azurerm_key_vault" "kv"` - shown as `, in ...`. */
  context?: string
}

export class HclError extends Error {
  diagnostic: Diagnostic
  constructor(diagnostic: Diagnostic) {
    super(`${diagnostic.summary}: ${diagnostic.detail}`)
    this.diagnostic = diagnostic
  }
}

const fail = (summary: string, detail: string, file: string, line: number): never => {
  throw new HclError({ severity: 'error', summary, detail, file, line })
}

/* ---------- lexer ---------- */

type TemplatePart = string | { src: string; line: number }

type Token =
  | { t: 'ident'; v: string; line: number }
  | { t: 'num'; v: number; line: number }
  | { t: 'str'; parts: TemplatePart[]; line: number }
  | { t: 'punct'; v: string; line: number }
  | { t: 'nl'; line: number }
  | { t: 'eof'; line: number }

const PUNCT = [
  '==',
  '!=',
  '<=',
  '>=',
  '&&',
  '||',
  '=>',
  '...',
  '{',
  '}',
  '[',
  ']',
  '(',
  ')',
  '=',
  ',',
  '.',
  ':',
  '?',
  '!',
  '<',
  '>',
  '+',
  '-',
  '*',
  '/',
  '%',
]

/** Finds the `}` closing an interpolation that starts at `start` (just after `${`). */
function interpolationEnd(src: string, start: number, file: string, line: number): number {
  let depth = 1
  let i = start
  while (i < src.length) {
    const ch = src[i]
    if (ch === '"') {
      i++
      while (i < src.length && src[i] !== '"') {
        if (src[i] === '\\') i++
        if (src[i] === '\n') break
        i++
      }
    } else if (ch === '{') depth++
    else if (ch === '}') {
      depth--
      if (depth === 0) return i
    } else if (ch === '\n') {
      break
    }
    i++
  }
  return fail(
    'Unterminated template string',
    'No closing marker was found for the interpolation sequence.',
    file,
    line,
  )
}

function lex(src: string, file: string): Token[] {
  const tokens: Token[] = []
  let i = 0
  let line = 1
  while (i < src.length) {
    const ch = src[i]
    if (ch === '\n') {
      tokens.push({ t: 'nl', line })
      line++
      i++
      continue
    }
    if (ch === ' ' || ch === '\t' || ch === '\r') {
      i++
      continue
    }
    if (ch === '#' || (ch === '/' && src[i + 1] === '/')) {
      while (i < src.length && src[i] !== '\n') i++
      continue
    }
    if (ch === '/' && src[i + 1] === '*') {
      const end = src.indexOf('*/', i + 2)
      if (end < 0)
        fail(
          'Unterminated comment',
          'There is no closing marker for this multi-line comment.',
          file,
          line,
        )
      for (let j = i; j < end; j++) if (src[j] === '\n') line++
      i = end + 2
      continue
    }
    if (/[A-Za-z_]/.test(ch)) {
      let j = i + 1
      while (j < src.length && /[A-Za-z0-9_-]/.test(src[j])) j++
      tokens.push({ t: 'ident', v: src.slice(i, j), line })
      i = j
      continue
    }
    if (/[0-9]/.test(ch)) {
      const match = /^[0-9]+(\.[0-9]+)?([eE][+-]?[0-9]+)?/.exec(src.slice(i))
      const text = match ? match[0] : ch
      tokens.push({ t: 'num', v: Number(text), line })
      i += text.length
      continue
    }
    if (ch === '"') {
      const startLine = line
      const parts: TemplatePart[] = []
      let literal = ''
      i++
      let closed = false
      while (i < src.length) {
        const c = src[i]
        if (c === '\n') break
        if (c === '"') {
          closed = true
          i++
          break
        }
        if (c === '\\') {
          const next = src[i + 1]
          const map: Record<string, string> = { n: '\n', t: '\t', r: '\r', '"': '"', '\\': '\\' }
          if (next in map) {
            literal += map[next]
            i += 2
            continue
          }
          fail(
            'Invalid escape sequence',
            `The symbol "${next}" is not a valid escape sequence selector.`,
            file,
            line,
          )
        }
        if (c === '$' && src[i + 1] === '$' && src[i + 2] === '{') {
          literal += '${'
          i += 3
          continue
        }
        if (c === '%' && src[i + 1] === '{') {
          fail(
            'Template directives are not supported here',
            'This lab understands `${...}` interpolation but not `%{...}` directives.',
            file,
            line,
          )
        }
        if (c === '$' && src[i + 1] === '{') {
          const end = interpolationEnd(src, i + 2, file, line)
          if (literal) parts.push(literal)
          literal = ''
          parts.push({ src: src.slice(i + 2, end), line })
          i = end + 1
          continue
        }
        literal += c
        i++
      }
      if (!closed)
        fail(
          'Unterminated template string',
          'No closing marker was found for the string.',
          file,
          startLine,
        )
      if (literal || parts.length === 0) parts.push(literal)
      tokens.push({ t: 'str', parts, line: startLine })
      continue
    }
    if (ch === '<' && src[i + 1] === '<') {
      const match = /^<<(-?)([A-Za-z_][A-Za-z0-9_]*)[ \t]*\r?\n/.exec(src.slice(i))
      if (match) {
        const marker = match[2]
        const startLine = line
        i += match[0].length
        line++
        const bodyLines: string[] = []
        let closed = false
        while (i < src.length) {
          const end = src.indexOf('\n', i)
          const text = src.slice(i, end < 0 ? src.length : end)
          i = end < 0 ? src.length : end + 1
          if (text.trim() === marker) {
            closed = true
            break
          }
          bodyLines.push(text)
          line++
        }
        if (!closed)
          fail(
            'Unterminated template string',
            `There is no closing marker "${marker}" for this heredoc.`,
            file,
            startLine,
          )
        line++
        let lines = bodyLines
        if (match[1] === '-') {
          const indent = Math.min(
            ...lines.filter((l) => l.trim()).map((l) => /^[ \t]*/.exec(l)?.[0].length ?? 0),
          )
          lines = lines.map((l) => l.slice(Number.isFinite(indent) ? indent : 0))
        }
        const text = lines.map((l) => `${l}\n`).join('')
        const parts: TemplatePart[] = []
        let literal = ''
        for (let j = 0; j < text.length; j++) {
          if (text[j] === '$' && text[j + 1] === '{') {
            const end = interpolationEnd(text, j + 2, file, startLine)
            if (literal) parts.push(literal)
            literal = ''
            parts.push({ src: text.slice(j + 2, end), line: startLine })
            j = end
          } else literal += text[j]
        }
        if (literal || parts.length === 0) parts.push(literal)
        tokens.push({ t: 'str', parts, line: startLine })
        // The heredoc consumed its closing newline; keep the attribute terminated.
        tokens.push({ t: 'nl', line: line - 1 })
        continue
      }
    }
    const punct = PUNCT.find((p) => src.startsWith(p, i))
    if (punct) {
      tokens.push({ t: 'punct', v: punct, line })
      i += punct.length
      continue
    }
    fail(
      'Invalid character',
      `This character is not used within the language: ${JSON.stringify(ch)}`,
      file,
      line,
    )
  }
  tokens.push({ t: 'eof', line })
  return tokens
}

/* ---------- parser ---------- */

const describe = (token: Token) =>
  token.t === 'eof'
    ? 'the end of the file'
    : token.t === 'nl'
      ? 'a newline'
      : token.t === 'punct'
        ? `"${token.v}"`
        : token.t === 'ident'
          ? `"${token.v}"`
          : token.t === 'num'
            ? `the number ${token.v}`
            : 'a string'

class Parser {
  private i = 0
  private nest = 0
  private readonly toks: Token[]
  private readonly file: string

  constructor(toks: Token[], file: string) {
    this.toks = toks
    this.file = file
  }

  private raw(): Token {
    return this.toks[this.i]
  }

  /** The next token; newlines are skipped inside brackets. */
  peek(): Token {
    if (this.nest > 0) while (this.toks[this.i].t === 'nl') this.i++
    return this.toks[this.i]
  }

  next(): Token {
    const token = this.peek()
    if (token.t !== 'eof') this.i++
    return token
  }

  isPunct(value: string): boolean {
    const token = this.peek()
    return token.t === 'punct' && token.v === value
  }

  expect(value: string, summary: string, detail: string): Token {
    const token = this.next()
    if (token.t !== 'punct' || token.v !== value) fail(summary, detail, this.file, token.line)
    return token
  }

  /* bodies */

  parseFile(): Body {
    const body = this.parseBody(false)
    return body
  }

  parseBody(inBlock: boolean): Body {
    const body: Body = { attrs: [], blocks: [] }
    for (;;) {
      const token = this.raw()
      if (token.t === 'nl') {
        this.i++
        continue
      }
      if (token.t === 'eof') {
        return body
      }
      if (token.t === 'punct' && token.v === '}') {
        if (inBlock) return body
        fail(
          'Argument or block definition required',
          'An argument or block definition is required here. This closing brace has no matching opening brace.',
          this.file,
          token.line,
        )
      }
      if (token.t !== 'ident') {
        fail(
          'Argument or block definition required',
          'An argument or block definition is required here.',
          this.file,
          token.line,
        )
      }
      const name = (token as { v: string }).v
      this.i++
      const after = this.raw()
      if (after.t === 'punct' && after.v === '=') {
        this.i++
        if (this.raw().t === 'nl' || this.raw().t === 'eof')
          fail(
            'Invalid expression',
            'Expected the start of an expression, but found the end of the line.',
            this.file,
            token.line,
          )
        const expr = this.parseExpr()
        if (body.attrs.some((attr) => attr.name === name))
          fail(
            'Attribute redefined',
            `The argument "${name}" was already set. Each argument may be set only once.`,
            this.file,
            token.line,
          )
        body.attrs.push({ name, expr, line: token.line })
        const end = this.raw()
        if (end.t === 'nl') this.i++
        else if (!(end.t === 'eof' || (end.t === 'punct' && end.v === '}' && inBlock)))
          fail(
            'Missing newline after argument',
            'An argument definition must end with a newline.',
            this.file,
            end.line,
          )
        continue
      }
      const labels: string[] = []
      for (;;) {
        const label = this.raw()
        if (label.t === 'str') {
          if (label.parts.length !== 1 || typeof label.parts[0] !== 'string')
            fail(
              'Invalid block label',
              'Block labels cannot contain template sequences.',
              this.file,
              label.line,
            )
          labels.push(label.parts[0] as string)
          this.i++
        } else if (label.t === 'ident') {
          labels.push(label.v)
          this.i++
        } else break
      }
      const open = this.raw()
      if (!(open.t === 'punct' && open.v === '{')) {
        fail(
          labels.length || open.t === 'nl' || open.t === 'eof'
            ? 'Invalid block definition'
            : 'Argument or block definition required',
          labels.length || open.t !== 'punct'
            ? 'Either a quoted string block label or an opening brace ("{") is expected here.'
            : `An argument or block definition is required here. To set an argument, use the equals sign "=" to introduce the argument value.`,
          this.file,
          open.line,
        )
      }
      this.i++
      const inner = this.parseBody(true)
      const close = this.raw()
      if (!(close.t === 'punct' && close.v === '}'))
        fail(
          'Unclosed configuration block',
          'There is no closing brace for this block before the end of the file. This may be caused by incorrect brace nesting elsewhere in this file.',
          this.file,
          token.line,
        )
      this.i++
      body.blocks.push({ type: name, labels, body: inner, line: token.line, file: this.file })
      const end = this.raw()
      if (end.t === 'nl') this.i++
      else if (!(end.t === 'eof' || (end.t === 'punct' && end.v === '}' && inBlock)))
        fail(
          'Missing newline after block definition',
          'A block definition must end with a newline.',
          this.file,
          end.line,
        )
    }
  }

  /* expressions */

  parseExpr(): Expr {
    return this.parseCond()
  }

  private parseCond(): Expr {
    const test = this.parseBinary(0)
    if (this.isPunct('?')) {
      const q = this.next()
      this.nest++
      const then = this.parseExpr()
      this.expect(
        ':',
        'Missing false expression in conditional',
        'The conditional operator (...?...:...) requires a false expression, delimited by a colon.',
      )
      const otherwise = this.parseExpr()
      this.nest--
      return { k: 'cond', test, then, else: otherwise, line: q.line }
    }
    return test
  }

  private static LEVELS = [
    ['||'],
    ['&&'],
    ['==', '!='],
    ['<', '>', '<=', '>='],
    ['+', '-'],
    ['*', '/', '%'],
  ]

  private parseBinary(level: number): Expr {
    if (level >= Parser.LEVELS.length) return this.parseUnary()
    let left = this.parseBinary(level + 1)
    for (;;) {
      const token = this.peek()
      if (token.t === 'punct' && Parser.LEVELS[level].includes(token.v)) {
        this.next()
        const right = this.parseBinary(level + 1)
        left = { k: 'bin', op: token.v, left, right, line: token.line }
      } else return left
    }
  }

  private parseUnary(): Expr {
    const token = this.peek()
    if (token.t === 'punct' && (token.v === '!' || token.v === '-')) {
      this.next()
      return { k: 'unary', op: token.v, expr: this.parseUnary(), line: token.line }
    }
    return this.parsePostfix(this.parsePrimary())
  }

  private parsePostfix(base: Expr): Expr {
    let expr = base
    for (;;) {
      const token = this.raw()
      if (token.t === 'punct' && token.v === '.') {
        this.i++
        const name = this.raw()
        if (name.t === 'ident') {
          this.i++
          expr = { k: 'attr', obj: expr, name: name.v, line: name.line }
        } else if (name.t === 'num') {
          this.i++
          expr = {
            k: 'index',
            obj: expr,
            key: { k: 'lit', v: name.v, line: name.line },
            line: name.line,
          }
        } else if (name.t === 'punct' && name.v === '*') {
          this.i++
          expr = { k: 'splat', obj: expr, steps: [], line: name.line }
        } else {
          fail(
            'Invalid attribute name',
            'An attribute name is required after a dot.',
            this.file,
            name.line,
          )
        }
      } else if (token.t === 'punct' && token.v === '[') {
        this.i++
        this.nest++
        if (this.isPunct('*')) {
          this.next()
          this.expect(']', 'Missing close bracket on splat', 'The splat operator must be [*].')
          this.nest--
          const splat: Expr = { k: 'splat', obj: expr, steps: [], line: token.line }
          // Following attribute and index steps apply to each element.
          for (;;) {
            const step = this.raw()
            if (step.t === 'punct' && step.v === '.' && this.toks[this.i + 1]?.t === 'ident') {
              this.i++
              splat.steps.push({ attr: (this.raw() as { v: string }).v })
              this.i++
            } else break
          }
          expr = splat
          continue
        }
        const key = this.parseExpr()
        this.expect(
          ']',
          'Missing close bracket on index',
          'The index operator must end with a closing bracket ("]").',
        )
        this.nest--
        expr = { k: 'index', obj: expr, key, line: token.line }
      } else return expr
    }
  }

  private parsePrimary(): Expr {
    const token = this.next()
    switch (token.t) {
      case 'num':
        return { k: 'lit', v: token.v, line: token.line }
      case 'str': {
        const parts: (string | Expr)[] = token.parts.map((part) =>
          typeof part === 'string' ? part : parseInterpolation(part.src, this.file, part.line),
        )
        if (parts.length === 1 && typeof parts[0] === 'string')
          return { k: 'lit', v: parts[0], line: token.line }
        return { k: 'tpl', parts, line: token.line }
      }
      case 'ident': {
        if (token.v === 'true' || token.v === 'false')
          return { k: 'lit', v: token.v === 'true', line: token.line }
        if (token.v === 'null') return { k: 'lit', v: null, line: token.line }
        if (this.raw().t === 'punct' && (this.raw() as { v: string }).v === '(') {
          this.i++
          this.nest++
          const args: Expr[] = []
          while (!this.isPunct(')')) {
            args.push(this.parseExpr())
            if (this.isPunct('...')) this.next()
            if (this.isPunct(',')) this.next()
            else if (!this.isPunct(')'))
              fail(
                'Missing argument separator',
                'A comma is required to separate each function argument from the next.',
                this.file,
                this.peek().line,
              )
          }
          this.next()
          this.nest--
          return { k: 'call', name: token.v, args, line: token.line }
        }
        return { k: 'name', name: token.v, line: token.line }
      }
      case 'punct': {
        if (token.v === '(') {
          this.nest++
          const inner = this.parseExpr()
          this.expect(
            ')',
            'Unbalanced parentheses',
            'Expected a closing parenthesis to terminate the expression.',
          )
          this.nest--
          return inner
        }
        if (token.v === '[') return this.parseList(token.line)
        if (token.v === '{') return this.parseObject(token.line)
        break
      }
      default:
        break
    }
    return fail(
      'Invalid expression',
      `Expected the start of an expression, but found ${describe(token)}.`,
      this.file,
      token.line,
    )
  }

  private parseFor(kind: 'list' | 'obj', line: number): Expr {
    // `for` already consumed
    const first = this.next()
    if (first.t !== 'ident')
      fail(
        'Invalid "for" expression',
        'A variable name is required after "for".',
        this.file,
        first.line,
      )
    let keyVar: string | null = null
    let valVar = (first as { v: string }).v
    if (this.isPunct(',')) {
      this.next()
      const second = this.next()
      if (second.t !== 'ident')
        fail(
          'Invalid "for" expression',
          'A second variable name is required after the comma.',
          this.file,
          second.line,
        )
      keyVar = valVar
      valVar = (second as { v: string }).v
    }
    const inTok = this.next()
    if (inTok.t !== 'ident' || inTok.v !== 'in')
      fail('Invalid "for" expression', 'The "in" keyword is expected here.', this.file, inTok.line)
    const coll = this.parseExpr()
    this.expect(
      ':',
      'Invalid "for" expression',
      'A colon is required after the collection expression.',
    )
    let keyExpr: Expr | null = null
    let valExpr = this.parseExpr()
    if (kind === 'obj') {
      this.expect(
        '=>',
        'Invalid "for" expression',
        'An object "for" expression needs "key => value".',
      )
      keyExpr = valExpr
      valExpr = this.parseExpr()
      if (this.isPunct('...')) this.next()
    }
    let cond: Expr | null = null
    const maybeIf = this.peek()
    if (maybeIf.t === 'ident' && maybeIf.v === 'if') {
      this.next()
      cond = this.parseExpr()
    }
    this.expect(
      kind === 'list' ? ']' : '}',
      'Invalid "for" expression',
      'The "for" expression is not closed.',
    )
    this.nest--
    return { k: 'for', kind, keyVar, valVar, coll, keyExpr, valExpr, cond, line }
  }

  private parseList(line: number): Expr {
    this.nest++
    const first = this.peek()
    if (first.t === 'ident' && first.v === 'for') {
      this.next()
      return this.parseFor('list', line)
    }
    const items: Expr[] = []
    while (!this.isPunct(']')) {
      if (this.peek().t === 'eof')
        fail('Unclosed list', 'This list has no closing bracket ("]").', this.file, line)
      items.push(this.parseExpr())
      if (this.isPunct(',')) this.next()
      else if (!this.isPunct(']'))
        fail(
          'Missing item separator',
          'Expected a comma to mark the beginning of the next item.',
          this.file,
          this.peek().line,
        )
    }
    this.next()
    this.nest--
    return { k: 'list', items, line }
  }

  private parseObject(line: number): Expr {
    this.nest++
    const first = this.peek()
    if (first.t === 'ident' && first.v === 'for') {
      this.next()
      return this.parseFor('obj', line)
    }
    const items: { key: Expr; value: Expr }[] = []
    while (!this.isPunct('}')) {
      const keyTok = this.peek()
      if (keyTok.t === 'eof')
        fail('Unclosed object', 'This object has no closing brace ("}").', this.file, line)
      let key: Expr
      if (
        keyTok.t === 'ident' &&
        !(
          this.toks[this.i + 1]?.t === 'punct' &&
          ['.', '[', '('].includes((this.toks[this.i + 1] as { v: string }).v)
        )
      ) {
        this.next()
        key = { k: 'lit', v: keyTok.v, line: keyTok.line }
      } else key = this.parseExpr()
      const sep = this.next()
      if (!(sep.t === 'punct' && (sep.v === '=' || sep.v === ':')))
        fail(
          'Missing key/value separator',
          'Expected an equals sign ("=") to mark the beginning of the attribute value.',
          this.file,
          sep.line,
        )
      const value = this.parseExpr()
      items.push({ key, value })
      if (this.isPunct(',')) this.next()
    }
    this.next()
    this.nest--
    return { k: 'obj', items, line }
  }

  atEnd(): boolean {
    return this.peek().t === 'eof'
  }
}

function parseInterpolation(src: string, file: string, line: number): Expr {
  const tokens = lex(src, file).map((token) => ({ ...token, line }))
  const parser = new Parser(tokens as Token[], file)
  const expr = parser.parseExpr()
  if (!parser.atEnd())
    fail(
      'Extra characters after interpolation expression',
      'Expected a closing brace to end the interpolation expression.',
      file,
      line,
    )
  return expr
}

/** Parses one .tf / .tfvars file. Throws HclError on a syntax error. */
export function parseHcl(src: string, file: string): Body {
  return new Parser(lex(src, file), file).parseFile()
}

/** Parses a single expression (used by tests and `-target`-style arguments). */
export function parseExpression(src: string, file = '<expr>'): Expr {
  const parser = new Parser(lex(src, file), file)
  const expr = parser.parseExpr()
  if (!parser.atEnd())
    fail('Extra characters after expression', 'Expected the end of the expression.', file, 1)
  return expr
}

/* ---------- references and addresses ---------- */

/**
 * Turns a reference expression (`module.net.azurerm_subnet.this["web"]`) into
 * an address string, or null when it is not a plain traversal.
 */
export function exprToAddress(expr: Expr): string | null {
  const steps: string[] = []
  let current: Expr = expr
  for (;;) {
    if (current.k === 'name') {
      steps.unshift(current.name)
      break
    }
    if (current.k === 'attr') {
      steps.unshift(`.${current.name}`)
      current = current.obj
    } else if (current.k === 'index') {
      const key = current.key
      if (key.k !== 'lit' || (typeof key.v !== 'string' && typeof key.v !== 'number')) return null
      steps.unshift(typeof key.v === 'number' ? `[${key.v}]` : `["${key.v}"]`)
      current = current.obj
    } else return null
  }
  return steps.join('')
}

/* ---------- diagnostics ---------- */

/** Renders diagnostics in Terraform's boxed style, with the source line. */
export function formatDiagnostics(diags: Diagnostic[], files: Record<string, string> = {}): string {
  return diags
    .map((diag) => {
      const out = [`│ ${diag.severity === 'error' ? 'Error' : 'Warning'}: ${diag.summary}`, '│ ']
      if (diag.file && diag.line) {
        out.push(
          `│   on ${diag.file} line ${diag.line}${diag.context ? `, in ${diag.context}` : ''}:`,
        )
        const source = files[diag.file]?.split('\n')[diag.line - 1]
        if (source !== undefined) out.push(`│ ${String(diag.line).padStart(3)}: ${source}`)
        out.push('│ ')
      }
      for (const text of diag.detail.split('\n')) out.push(`│ ${text}`)
      return ['╷', ...out, '╵'].join('\n')
    })
    .join('\n')
}
