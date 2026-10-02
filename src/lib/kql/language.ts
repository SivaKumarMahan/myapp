import { StreamLanguage, type StringStream } from '@codemirror/language'
import { completeFromList, type Completion } from '@codemirror/autocomplete'
import { kqlTables } from '../../content/kql/schema'

/**
 * Just enough of a KQL mode for CodeMirror: highlighting for operators,
 * functions, strings, numbers and timespans, and completion for the
 * simulator's operators, functions, tables and columns.
 */

export const KQL_OPERATORS = [
  'where',
  'project',
  'project-away',
  'project-rename',
  'extend',
  'summarize',
  'by',
  'order',
  'sort',
  'top',
  'take',
  'limit',
  'distinct',
  'count',
  'join',
  'kind',
  'on',
  'render',
  'print',
  'asc',
  'desc',
  'and',
  'or',
  'between',
  'in',
  'contains',
  'has',
  'startswith',
  'endswith',
  'inner',
  'leftouter',
  'timechart',
  'barchart',
  'columnchart',
  'piechart',
  'linechart',
  'nulls',
  'first',
  'last',
]

export const KQL_FUNCTIONS = [
  'count',
  'countif',
  'dcount',
  'sum',
  'avg',
  'min',
  'max',
  'sumif',
  'avgif',
  'make_set',
  'make_list',
  'ago',
  'now',
  'bin',
  'startofday',
  'startofhour',
  'hourofday',
  'datetime',
  'todatetime',
  'tostring',
  'toint',
  'tolong',
  'toreal',
  'todouble',
  'tolower',
  'toupper',
  'strlen',
  'strcat',
  'substring',
  'iff',
  'iif',
  'isempty',
  'isnotempty',
  'isnull',
  'isnotnull',
  'not',
  'coalesce',
  'round',
  'abs',
]

const operators = new Set(KQL_OPERATORS)
const functions = new Set(KQL_FUNCTIONS)
const tables = new Set(kqlTables.map((table) => table.name))

const completions: Completion[] = [
  ...kqlTables.map((table) => ({
    label: table.name,
    type: 'class',
    detail: 'table',
    info: table.description,
  })),
  ...KQL_OPERATORS.map((label) => ({ label, type: 'keyword' })),
  ...KQL_FUNCTIONS.map((label) => ({ label, type: 'function', apply: `${label}(` })),
  ...[...new Set(kqlTables.flatMap((table) => table.columns.map((column) => column.name)))].map(
    (label) => ({
      label,
      type: 'property',
    }),
  ),
]

export const kqlLanguage = StreamLanguage.define<null>({
  name: 'kql',
  startState: () => null,
  token(stream: StringStream) {
    if (stream.eatSpace()) return null
    if (stream.match('//')) {
      stream.skipToEnd()
      return 'comment'
    }
    if (stream.match(/^@?"(?:[^"\\]|\\.)*"?/) || stream.match(/^@?'(?:[^'\\]|\\.)*'?/))
      return 'string'
    if (stream.match(/^\d+(\.\d+)?(ms|min|sec|hr|d|h|m|s)\b/)) return 'number'
    if (stream.match(/^\d+(\.\d+)?/)) return 'number'
    if (stream.match(/^[A-Za-z_$][\w$]*(-(away|rename))?/)) {
      const word = stream.current()
      if (word === 'true' || word === 'false' || word === 'null') return 'atom'
      if (tables.has(word)) return 'typeName'
      if (functions.has(word) && stream.peek() === '(') return 'variableName.standard'
      if (operators.has(word)) return 'keyword'
      return 'propertyName'
    }
    if (stream.match('|')) return 'operator'
    stream.next()
    return 'punctuation'
  },
  languageData: { autocomplete: completeFromList(completions), commentTokens: { line: '//' } },
})
