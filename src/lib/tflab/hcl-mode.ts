import hljs from 'highlight.js/lib/core'
import { StreamLanguage, type StringStream } from '@codemirror/language'
import { hcl } from '../hcl-language'

/**
 * A CodeMirror stream language for the lab's .tf editor. The keyword,
 * literal and function lists come from the app's highlight.js HCL definition
 * (src/lib/hcl-language.ts), so code samples and the editor colour the same
 * words.
 */
const definition = hcl(hljs)
const words = (definition.keywords ?? {}) as Record<string, string>
const list = (key: string) => new Set((words[key] ?? '').split(/\s+/).filter(Boolean))
const KEYWORDS = list('keyword')
const LITERALS = list('literal')
const BUILT_INS = list('built_in')
const BLOCKS =
  /^(resource|data|variable|output|module|provider|terraform|locals|moved|import|removed|lifecycle|backend|required_providers)\b/

interface State {
  /** Inside a "..." string, and how deep inside ${ } within it. */
  inString: boolean
  interpolation: number
}

export const hclLanguage = StreamLanguage.define<State>({
  name: 'hcl',
  startState: () => ({ inString: false, interpolation: 0 }),
  token(stream: StringStream, state: State) {
    if (state.inString && state.interpolation === 0) {
      while (!stream.eol()) {
        const ch = stream.next()
        if (ch === '\\') stream.next()
        else if (ch === '"') {
          state.inString = false
          return 'string'
        } else if (ch === '$' && stream.peek() === '{') {
          stream.next()
          state.interpolation = 1
          return 'string'
        }
      }
      return 'string'
    }
    if (stream.eatSpace()) return null
    if (state.interpolation > 0) {
      if (stream.peek() === '}') {
        stream.next()
        state.interpolation--
        return 'string'
      }
      if (stream.peek() === '{') state.interpolation++
    }
    if (stream.match('#') || stream.match('//')) {
      stream.skipToEnd()
      return 'comment'
    }
    if (stream.match('/*')) {
      if (stream.skipTo('*/')) stream.match('*/')
      else stream.skipToEnd()
      return 'comment'
    }
    if (stream.peek() === '"') {
      stream.next()
      state.inString = true
      return 'string'
    }
    if (stream.match(/^\d+(\.\d+)?/)) return 'number'
    if (stream.sol() && stream.match(BLOCKS)) return 'keyword'
    if (stream.match(/^[A-Za-z_][\w-]*/)) {
      const word = stream.current()
      if (LITERALS.has(word)) return 'atom'
      if (BUILT_INS.has(word) && stream.peek() === '(') return 'variableName.standard'
      if (/^\s*=(?!=)/.test(stream.string.slice(stream.pos))) return 'propertyName'
      if (KEYWORDS.has(word)) return 'keyword'
      if (/^(var|local|each|count|module|data|path)$/.test(word)) return 'typeName'
      return null
    }
    stream.next()
    return 'punctuation'
  },
  languageData: { commentTokens: { line: '#', block: { open: '/*', close: '*/' } } },
})
